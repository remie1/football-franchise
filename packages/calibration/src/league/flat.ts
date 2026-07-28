/**
 * THE FLAT LEAGUE — `calibration.md` §5.2 instrument 1, and the only league this repository can
 * honestly build today.
 *
 * Every active attribute of every player on every team is set to the SAME number. That is not a
 * model of the NFL and it is not pretending to be: it is the control condition.
 *
 * **What a flat-league baseline is evidence of.** A divergence measured here cannot be a rating
 * error, because there are no ratings to be wrong — every contest in the engine is an evenly
 * matched contest, so every band the engine produces is a statement about the FORMULA and its
 * target numbers. That is precisely the disambiguation instrument §5.2 asks for, available
 * before the thing it disambiguates against exists.
 *
 * **What it is not evidence of.** Anything about spread. Upset rate versus rating gap (Tier 3)
 * has no rating gap to correlate with; per-player convergence (Tier 4) has no per-player
 * variation to converge to. Those metrics report `NOT_APPLICABLE` on this provenance rather
 * than reporting a number that would be a tautology.
 *
 * **Why 60 and not 50.** `getAttr`'s own fallback is 50, so a flat-50 league is
 * indistinguishable from a league whose attribute maps are empty — and a bug that dropped every
 * attribute would produce identical output to a correct run. 60 is a value nothing defaults to,
 * so "the attributes are being read" is observable. It is also roughly where the design doc's
 * target numbers sit (§10.4's accuracy target is 60), which keeps the control near the middle
 * of the tables rather than at one end of them.
 */
import type { AttributeMap, AttrId, PlayerState, RatedLeague, Team, TeamId } from "@ff/contracts";
import { ATTRIBUTE_REGISTRY_V1, ATTR_SCALE, teamId as makeTeamId } from "@ff/contracts";
import { makeProvenancedLeague, type FlatLeague } from "./provenance.js";
import { buildPlayer, buildRosterSlots, depthChartFromSlots } from "./roster.js";

/** The default flat rating. See the module header for why it is not 50. */
export const FLAT_RATING = 60;

/** Every attribute the registry currently declares active, in registry order. */
export function activeAttrIds(): readonly AttrId[] {
  return Object.values(ATTRIBUTE_REGISTRY_V1.attributes)
    .filter((d) => d.status === "active")
    .map((d) => d.id);
}

/** A map with every active attribute set to `value`. */
export function uniformAttributes(value: number): AttributeMap {
  if (value < ATTR_SCALE.min || value > ATTR_SCALE.max) {
    throw new RangeError(`flat rating ${value} is outside the 0-99 attribute scale`);
  }
  const map: AttributeMap = {};
  for (const id of activeAttrIds()) map[id as unknown as string] = value;
  return map;
}

/**
 * Team ids are `t:00` … `t:31`. Two-digit and zero-padded so lexical order is numeric order —
 * a report that sorts teams as strings and a report that sorts them as numbers agree.
 */
export function syntheticTeamIds(count: number): readonly TeamId[] {
  if (count < 2) throw new RangeError("a league needs at least two teams");
  if (count > 99) throw new RangeError("synthetic team ids are two digits");
  return Array.from({ length: count }, (_, i) => makeTeamId(`t:${String(i).padStart(2, "0")}`));
}

export interface FlatLeagueSpec {
  /** How many teams. 32 by default — a real schedule's worth. */
  readonly teams?: number;
  /** The rating every attribute of every player takes. */
  readonly rating?: number;
  /**
   * Per-attribute overrides applied to EVERY player on every team. This is how a sensitivity
   * sweep perturbs one attribute league-wide (§5.3) without inventing a second league builder.
   */
  readonly overrides?: Readonly<Record<string, number>>;
  /** Appended to the league id, so two variants of a sweep never share a report header. */
  readonly variant?: string;
}

export function buildFlatLeague(spec: FlatLeagueSpec = {}): FlatLeague {
  const teamCount = spec.teams ?? 32;
  const rating = spec.rating ?? FLAT_RATING;
  const base = uniformAttributes(rating);
  const overrides = spec.overrides ?? {};
  for (const [id, value] of Object.entries(overrides)) {
    if (!(id in base)) {
      throw new Error(
        `flat-league override names "${id}", which is not an active attribute in ` +
          `ATTRIBUTE_REGISTRY_V1 (schemaVersion ${ATTRIBUTE_REGISTRY_V1.schemaVersion}). ` +
          `A silently ignored override is a sensitivity sweep that measures nothing.`,
      );
    }
    if (value < ATTR_SCALE.min || value > ATTR_SCALE.max) {
      throw new RangeError(`override ${id}=${value} is outside the 0-99 attribute scale`);
    }
  }
  const attributes: AttributeMap = { ...base, ...overrides };

  const teams: Team[] = [];
  const players: PlayerState[] = [];
  for (const team of syntheticTeamIds(teamCount)) {
    const slots = buildRosterSlots(team);
    for (const slot of slots) players.push(buildPlayer(slot, { ...attributes }));
    teams.push({
      id: team,
      displayName: `Team ${String(team).slice(2)}`,
      city: `City ${String(team).slice(2)}`,
      roster: slots.map((s) => s.id),
      staff: [],
      depthChart: depthChartFromSlots(slots),
      capState: { capLimit: 0, committed: 0, deadMoney: 0 },
      staffBudget: { limit: 0, committed: 0 },
    });
  }

  const overrideNote =
    Object.keys(overrides).length === 0
      ? ""
      : ` with ${Object.entries(overrides)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")}`;

  return makeProvenancedLeague(
    "FLAT_SYNTHETIC",
    `flat-${rating}-${teamCount}t${spec.variant === undefined ? "" : `-${spec.variant}`}`,
    `${teamCount} teams, every active attribute of every player at ${rating}${overrideNote}. ` +
      `Registry schemaVersion ${ATTRIBUTE_REGISTRY_V1.schemaVersion}, ` +
      `${activeAttrIds().length} active attributes.`,
    { teams, players, provenance: null, coverage: null } satisfies RatedLeague,
  );
}
