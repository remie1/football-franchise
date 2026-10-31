/**
 * THE FICTIONAL LEAGUE GENERATOR (ADR-079; attributes.md §5 `importer/fictional/`).
 *
 * Takes the league's teams (ids, cities, names: franchise's `buildLeague`) and returns a
 * `RatedLeague`: every team filled with a 53-man roster of made-up players, every player with
 * every active rating on the absolute scale, and a depth chart with the best player first.
 *
 * How a player is made:
 *   1. a hidden talent number, drawn around his team's strength and his roster slot (a team's
 *      first quarterback is drafted to start, its third is not);
 *   2. measurements from his position's body and his athleticism (talent shows partly);
 *   3. physical ratings from the measurements (`derive.ts`), skill ratings from his position's
 *      tiers (`profiles.ts`), universal ratings for everyone;
 *   4. the team's players at a position are ranked by their overall for that position, and that
 *      ranking is the depth chart. A slot-two player can out-rate the starter he was drawn
 *      behind; then he starts.
 *
 * Everything comes from the seed. Each player draws from his own fork (`team/position/slot`),
 * so changing one position's count never reshuffles another position's players.
 *
 * With `development` on (ADR-087), each player also gets his growth rate, career snaps, body and
 * patience (`development.ts`), from another fork of his own (`development/<player id>`).
 */
import {
  ATTRIBUTE_REGISTRY_V1, clampRating, createRng, playerId, positionOverall,
  type AttributeMap, type PlayerId, type PlayerState, type Position, type RatedLeague, type Rng, type Team,
} from "@ff/contracts";
import { physicalRatings, type Measurements } from "./derive.js";
import { withDevelopment } from "./development.js";
import { drawName } from "./names.js";
import { PHYSICAL, PROFILES, TIERS, UNIVERSAL, type Tier } from "./profiles.js";
import { BODY, POSITION_ORDER, ROSTER_SHAPE, type Dist } from "./shape.js";

/**
 * Spread of team strength, in units of player talent (ADR-079 Q2), tuned in R5 (ADR-079 §R5):
 * at 0.15 a season's spread of wins matches the NFL's (3.02 over 20 seasons vs 3.05 in
 * 2021-24). Most of the difference between teams comes from the luck of each squad's player
 * draws (0 alone gives 2.83); this only adds the rest.
 */
export const DEFAULT_TEAM_STRENGTH_SD = 0.15;

/** Where a roster slot's talent is centred: starters are drafted to start. */
export const SLOT_TALENT: readonly number[] = [0.6, -0.2, -0.6];

export interface GenerateLeagueInput {
  readonly seed: string;
  /** The season the rosters are for; sets draft years. */
  readonly season: number;
  /** The league's teams. Their roster and depth chart are replaced; everything else is kept. */
  readonly teams: readonly Team[];
  readonly teamStrengthSd?: number;
  /**
   * ADR-087: give each player his development record (P1) and patience (P6), drawn from his own
   * stream (`development.ts`). Off by default; off, the league is exactly what it was before.
   */
  readonly development?: boolean;
}

/** What `RatedLeague.provenance` holds for a generated league. */
export interface FictionalProvenance {
  readonly generator: "fictional/1";
  readonly seed: string;
  readonly season: number;
  readonly teamStrengthSd: number;
  /** Each team's hidden strength, in talent units. Read by the spread check (R5), never by the sim. */
  readonly teamStrength: Readonly<Record<string, number>>;
  /** Each player's measurements, keyed by player id: what a scout's stopwatch would say. */
  readonly measurements: Readonly<Record<string, Measurements>>;
}

/** Standard normal draw (Box-Muller). */
export function gauss(rng: Rng): number {
  const u = 1 - rng.next();
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const draw = (dist: Dist, z: number): number => dist.mean + dist.sd * z;
/** `load` of `shared` plus the rest fresh, so the result is still a standard normal. */
const blend = (rng: Rng, load: number, shared: number): number =>
  load * shared + Math.sqrt(1 - load * load) * gauss(rng);

function tierRating(rng: Rng, tier: Tier, talent: number): number {
  return clampRating(tier.mean + tier.sd * blend(rng, tier.load, talent));
}

export function measure(rng: Rng, position: Position, talent: number): Measurements {
  const body = BODY[position];
  const athleticism = blend(rng, 0.5, talent);
  const round = (x: number, step: number) => Math.round(x / step) * step;
  return {
    heightIn: Math.round(draw(body.heightIn, gauss(rng))),
    weightLb: Math.round(draw(body.weightLb, gauss(rng))),
    forty: Number(draw(body.forty, -blend(rng, 0.8, athleticism)).toFixed(2)),
    bench: Math.max(0, Math.round(draw(body.bench, blend(rng, 0.4, talent)))),
    vertical: round(draw(body.vertical, blend(rng, 0.7, athleticism)), 0.5),
    cone: Number(draw(body.cone, -blend(rng, 0.7, athleticism)).toFixed(2)),
  };
}

const ACTIVE: readonly string[] = Object.values(ATTRIBUTE_REGISTRY_V1.attributes)
  .filter((a) => a.status === "active")
  .map((a) => String(a.id));

/** Every active rating for one player at one position. */
export function rateAttributes(rng: Rng, position: Position, talent: number, m: Measurements): AttributeMap {
  const profile = PROFILES[position];
  const physical = physicalRatings(m, () => gauss(rng));
  const out: AttributeMap = {};
  for (const id of ACTIVE) {
    if ((PHYSICAL as readonly string[]).includes(id)) out[id] = physical[id]!;
    else if (id in UNIVERSAL) out[id] = tierRating(rng, UNIVERSAL[id]!, talent);
    else if (profile.core.includes(id)) out[id] = tierRating(rng, TIERS.core, talent);
    else if (profile.secondary.includes(id)) out[id] = tierRating(rng, TIERS.secondary, talent);
    else out[id] = tierRating(rng, TIERS.rest, talent);
  }
  return out;
}

/**
 * How good a player is AT A POSITION: his core ratings, plus the physical ones the position
 * leans on. Used for the depth chart (ADR-079 Q5). Not a rating the sim reads. Contracts'
 * `positionOverall` since ADR-087 P5, so franchise sorts by the same number.
 */
export const overallAt = (position: Position, ratings: AttributeMap): number => positionOverall(position, ratings);

function draftFor(rng: Rng, talent: number, age: number, season: number): PlayerState["bio"]["draft"] {
  const z = talent + 0.5 * gauss(rng);
  const cuts = [1.5, 1.0, 0.6, 0.25, -0.1, -0.45, -0.8];
  const round = cuts.findIndex((c) => z > c) + 1;
  if (round === 0) return "UDFA";
  return { year: season - Math.max(0, age - 22), round, pick: (round - 1) * 32 + rng.int(1, 32) };
}

interface Drawn {
  readonly talent: number;
  readonly measurements: Measurements;
  readonly ratings: AttributeMap;
  readonly age: number;
  readonly rng: Rng;
  /** The roster slot he was drawn for (0 = drafted to start), for his career snaps (ADR-087). */
  readonly slot: number;
}

export function generateLeagueRosters(input: GenerateLeagueInput): RatedLeague {
  const sd = input.teamStrengthSd ?? DEFAULT_TEAM_STRENGTH_SD;
  const root = createRng(input.seed, "attributes:fictional");
  const usedNames = new Set<string>();
  const teamStrength: Record<string, number> = {};
  const measurements: Record<string, Measurements> = {};
  const players: PlayerState[] = [];
  const teams: Team[] = [];

  for (const team of input.teams) {
    const key = String(team.id);
    const strength = sd * gauss(root.fork(`strength/${key}`));
    teamStrength[key] = strength;
    const roster: PlayerId[] = [];
    const depthChart: Partial<Record<Position, PlayerId[]>> = {};

    for (const position of POSITION_ORDER) {
      const drawn: Drawn[] = [];
      for (let slot = 0; slot < ROSTER_SHAPE[position]; slot++) {
        const rng = root.fork(`${key}/${position}/${slot}`);
        const talent = strength + (SLOT_TALENT[slot] ?? SLOT_TALENT[SLOT_TALENT.length - 1]!) + gauss(rng);
        const m = measure(rng, position, talent);
        const specialist = position === "K" || position === "P" || position === "LS";
        const age = Math.min(36, 21 + (specialist ? 2 : 0) + Math.floor(Math.abs(gauss(rng)) * 4.5));
        drawn.push({ talent, measurements: m, ratings: rateAttributes(rng, position, talent, m), age, rng, slot });
      }
      // The depth chart: best overall first. Ties keep slot order (sort is stable).
      drawn.sort((a, b) => overallAt(position, b.ratings) - overallAt(position, a.ratings));
      depthChart[position] = [];
      drawn.forEach((p, depth) => {
        const id = playerId(`p:${key}:${position}${depth}`);
        measurements[String(id)] = p.measurements;
        roster.push(id);
        depthChart[position]!.push(id);
        const player: PlayerState = {
          bio: {
            id,
            displayName: drawName(p.rng, usedNames),
            position,
            age: p.age,
            heightIn: p.measurements.heightIn,
            weightLb: p.measurements.weightLb,
            draft: draftFor(p.rng, p.talent, p.age, input.season),
          },
          attributes: { kind: "true", values: p.ratings, traits: new Set<string>() },
          condition: { stamina: 100, morale: 0 },
          // ADR-079 Q7: no personality yet. The flat league's placeholder, stated.
          personality: { needs: {}, type: "quiet" },
          teamId: team.id,
        };
        // ADR-087: a fork of its own, which takes no draw from his other streams, so nothing above moves.
        players.push(input.development
          ? withDevelopment(player, root.fork(`development/${String(id)}`), {
            measurements: p.measurements, career: { slot: p.slot, season: input.season },
          })
          : player);
      });
    }
    teams.push({ ...team, roster, depthChart });
  }

  const provenance: FictionalProvenance = {
    generator: "fictional/1",
    seed: input.seed,
    season: input.season,
    teamStrengthSd: sd,
    teamStrength,
    measurements,
  };
  return { teams, players, provenance, coverage: null };
}
