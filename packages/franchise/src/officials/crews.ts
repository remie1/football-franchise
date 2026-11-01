/**
 * ADR-093 step 1 (§6.1 to §6.3): the league's 17 officiating crews, made for a new league and
 * carried into each new season. A crew is known by its referee, a made-up name from the coaches'
 * name lists (a stand-in, as the players and coaches are, §6.2), and leans on each of five families
 * of fouls, 0 to 100 with 50 the league's average (contracts officials.ts). A lean L calls its
 * family at L / 50 of the league's rate (§16 A3); how a lean moves the officials' chances is the
 * engine's.
 *
 * Every draw is on its own fork of `franchise:officials/<season>`, and a fork draws nothing from its
 * parent (contracts rng.ts), so the referees' names move no lean and one crew's leans move no other's:
 *  - `new/names`: one generator for all 17 referees, drawn in id order;
 *  - `new/leans/<id>`: a crew's first leans, one normal draw a family in CREW_RULES.families order;
 *  - `carry/leans/<id>`: its leans drawn again for a new season, toward its last at CREW_RULES.carry.
 *
 * Each family's 17 draws are then settled (CHOSEN, §16 A4): re-centered so their mean is exactly 50,
 * clamped to 0 to 100 and rounded to whole points. So the crews spread each family's calls around
 * the league's rate without moving it; without the re-centering the crews' mean would wander about
 * 2 points a season (8.6 ÷ √17 on line holding, COMPUTED), some 4% of the league's holding calls.
 */
import {
  createRng, officiatingCrewId,
  type CrewLeanFamily, type GameId, type OfficiatingCrew, type OfficiatingCrewId, type Rng,
} from "@ff/contracts";
import { drawName } from "../staff/makeCoach.js";
import { clamp, normal } from "../staff/world.js";
import { CREW_RULES } from "./tables.js";

/** One game's crew: an entry of the save's `world.officiating.assignments` (contracts save.ts, F7). */
export interface CrewAssignment { readonly game: GameId; readonly crew: OfficiatingCrewId }

/** The league's officials in one season: the save's slot (F7), with the season its crews stand in. */
export interface SeasonOfficiating {
  readonly season: number;
  readonly crews: readonly OfficiatingCrew[];
  readonly assignments: readonly CrewAssignment[];
}

/** The season's officials stream; every crew draw is a fork of it. */
export const officialsRng = (seed: string, season: number): Rng => createRng(seed, `franchise:officials/${season}`);

/** crew-01 to crew-17, by index from 0. */
export const crewIdFor = (index: number): OfficiatingCrewId => officiatingCrewId(`crew-${String(index + 1).padStart(2, "0")}`);

type Leans = Record<CrewLeanFamily, number>;

const byId = (a: OfficiatingCrew, b: OfficiatingCrew): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const leansOf = (lean: (f: CrewLeanFamily) => number): Leans =>
  Object.fromEntries(CREW_RULES.families.map((f) => [f, lean(f)])) as Leans;

/** Each family's draws re-centered on the league's lean, then clamped to 0 to 100 and rounded. */
function settle(raw: readonly Leans[]): Leans[] {
  const shift = leansOf((f) => CREW_RULES.leagueLean - raw.reduce((s, l) => s + l[f], 0) / raw.length);
  return raw.map((l) => leansOf((f) => Math.round(clamp(l[f] + shift[f], 0, 100))));
}

/**
 * A new league's first crews: crew-01 to crew-17, each with a made-up referee of its own, and leans
 * drawn around 50 at CREW_RULES.leanSd, then settled. A pure function of the seed and the season.
 */
export function makeCrews(seed: string, season: number): OfficiatingCrew[] {
  const root = officialsRng(seed, season).fork("new");
  const names = root.fork("names");
  const taken = new Set<string>();
  const ids = Array.from({ length: CREW_RULES.count }, (_, i) => crewIdFor(i));
  const referees = ids.map(() => drawName(names, taken));
  const leans = settle(ids.map((id) => {
    const rng = root.fork(`leans/${String(id)}`);
    return leansOf((f) => CREW_RULES.leagueLean + CREW_RULES.leanSd[f] * normal(rng));
  }));
  return ids.map((id, i) => ({ id, referee: referees[i]!, leans: leans[i]! }));
}

/**
 * Last season's crews into `season`: the same ids and referees, in id order, and each lean drawn
 * again toward its last, L' = 50 + ρ(L − 50) + √(1 − ρ²) × leanSd × z with ρ = CREW_RULES.carry,
 * then settled. Last season's assignments play no part: each season's four-week rule starts clean.
 * A pure function of its inputs; refuses a list that is not a league's crews.
 */
export function carryCrews(last: readonly OfficiatingCrew[], seed: string, season: number): OfficiatingCrew[] {
  const problem = crewsProblem(last);
  if (problem !== undefined) throw new Error(`carryCrews: last season's crews are not a league's (${problem})`);
  const crews = [...last].sort(byId);
  const root = officialsRng(seed, season).fork("carry");
  const rho = CREW_RULES.carry;
  const fresh = Math.sqrt(1 - rho * rho);
  const leans = settle(crews.map((c) => {
    const rng = root.fork(`leans/${String(c.id)}`);
    return leansOf((f) => CREW_RULES.leagueLean + rho * (c.leans[f] - CREW_RULES.leagueLean) + fresh * CREW_RULES.leanSd[f] * normal(rng));
  }));
  return crews.map((c, i) => ({ id: c.id, referee: c.referee, leans: leans[i]! }));
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const shown = (v: unknown): string => (typeof v === "string" ? JSON.stringify(v) : String(v));

/**
 * Why a list cannot be a league's crews, or undefined. It must be exactly 17 objects, each with a
 * non-empty id and a non-empty referee, both unique, and with leans on exactly the five families,
 * each a whole number from 0 to 100. One rule for runSeason (which throws) and readSave (which
 * refuses the file).
 */
export function crewsProblem(crews: unknown): string | undefined {
  if (!Array.isArray(crews)) return "the crews are not a list";
  if (crews.length !== CREW_RULES.count) return `there are ${crews.length} crews, not ${CREW_RULES.count}`;
  const ids = new Set<string>();
  const referees = new Set<string>();
  for (const [i, c] of (crews as unknown[]).entries()) {
    if (!isObject(c)) return `crew ${i + 1} on the list is not a crew`;
    if (typeof c.id !== "string" || c.id === "") return `crew ${i + 1} on the list has no id`;
    if (ids.has(c.id)) return `crew ${c.id} appears twice`;
    ids.add(c.id);
    if (typeof c.referee !== "string" || c.referee === "") return `crew ${c.id} has no referee`;
    if (referees.has(c.referee)) return `two crews have the referee ${c.referee}`;
    referees.add(c.referee);
    const leans = c.leans;
    if (!isObject(leans)) return `crew ${c.id} has no leans`;
    for (const f of CREW_RULES.families) {
      if (!Object.hasOwn(leans, f)) return `crew ${c.id} has no ${f} lean`;
      const v = leans[f];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 100) {
        return `crew ${c.id}'s ${f} lean is not a whole number from 0 to 100 (${shown(v)})`;
      }
    }
    const extra = Object.keys(leans).filter((k) => !(CREW_RULES.families as readonly string[]).includes(k));
    if (extra.length > 0) return `crew ${c.id} leans on ${extra.join(", ")}, not one of the five families`;
  }
  return undefined;
}
