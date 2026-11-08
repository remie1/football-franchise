/**
 * Injury risk by the depth-chart spot (ADR-087 §12.3.1-12.3.2; step AB5): the rules `injuries.ts`
 * and `availability.ts` play with `injuryRisk: "spot"`. The default, `"group"`, is today's rule
 * (risk by the listed position's group, `injuries.ts` `groupRisk`), and nothing here is read on it.
 *
 * - **The owner's rule (R2).** Injury risk follows the spot his team plays him at, which is the
 *   depth chart, never his listed position. Nothing here reads the listed-position field, the
 *   position-group table by anything but the chart key, or the side of his listed position. A test
 *   greps this file.
 * - **The spot** (`spotOf`) is the first key, in chart order (contracts' `Position` order,
 *   `aging.ts` `SPOT_ORDER`; CHOSEN), on his own team's chart this week that lists him. A man on no
 *   key (the practice squad, a free agent, a man out hurt and off the chart) takes factor 1, in games
 *   and practice, and the league's kind mix (CHOSEN).
 * - **The risk** (`spotRisk`): in games `INJURY_RATES.game.bySpot.perSnap` × the key's
 *   `bySpot.factor`; in practice the key's group's `practice.byGroup` (LT/LG/C/RG/RT → OL and so
 *   on, from the same key); the kind mix (which kind, and so how long) by the key's group too, or the
 *   league's off the chart.
 * - **The age factor** (`spotAgeFactor`): §12.3.2's knots (`INJURY_RATES.spotAge`), in place of the
 *   group path's 1 + 0.04 a year past 26. Durability and a recent return are read as on the group path.
 * - **How long, and what it leaves** (§12.3.3-12.3.4; step AB6): `spotWeeks` is a kind's weeks with
 *   the repeat rule on a concussion (`CONCUSSION_REPEAT`, by how many he has had, `priorOfKind`) and
 *   slower healing for back and ribs at 31 and over (`HEALING_BY_AGE`, unless the tuning switch turns
 *   it off); `spotLasting` is a kind's lasting mark with `CONCUSSION_MARK` for a concussion. Each
 *   reads his age, his own injury history and the kind, nothing else.
 */
import { POSITION_GROUP, type PlayerId, type Position, type PositionGroup, type Team } from "@ff/contracts";
import { SPOT_ORDER, chartSpots } from "./aging.js";
import {
  BAND_MIN_WEEKS, CONCUSSION_MARK, CONCUSSION_REPEAT, HEALING_BY_AGE, INJURY_KINDS, INJURY_RATES, type LastingMark, type WeeksBucket,
} from "./injuryTables.js";
import type { PastInjury } from "./types.js";

/** ADR-087 §12.1: where injury risk comes from. `"group"` (the default) is today's rule. */
export type InjuryRisk = "group" | "spot";
const INJURY_RISKS: readonly InjuryRisk[] = ["group", "spot"];

/** The rule an option names: absent is `"group"`; a value the option does not take throws. */
export function injuryRiskRule(value: InjuryRisk | undefined): InjuryRisk {
  if (value !== undefined && !INJURY_RISKS.includes(value)) throw new RangeError(`injuryRisk is "group" or "spot", not ${JSON.stringify(value)}`);
  return value ?? "group";
}

/** What sets one man's game and practice risk and his kind mix, beyond his exposure, durability, age and a recent return. */
export interface InjuryRiskProfile {
  /** Injuries per weighted snap at factor 1: `INJURY_RATES.game.perSnap` (group path) or `bySpot.perSnap` (spot path). */
  readonly level: number;
  /** × `level` in games. */
  readonly game: number;
  /** × `INJURY_RATES.practice.perWeek` in practice. */
  readonly practice: number;
  /** The group whose kind weights he draws from (`INJURY_KINDS[...].byGroup`); undefined = the league's mix. */
  readonly kinds: PositionGroup | undefined;
}

/**
 * His risk on the spot path, from the chart key that lists him (`spotOf`), or undefined on no key:
 * the key's factor, its group's practice factor and kind mix; on no key factor 1 in games and
 * practice and the league's kind mix.
 */
export function spotRisk(spot: Position | undefined): InjuryRiskProfile {
  const s = INJURY_RATES.game.bySpot;
  const group = spot === undefined ? undefined : POSITION_GROUP[spot];
  return {
    level: s.perSnap,
    game: spot === undefined ? 1 : s.factor[spot],
    practice: group === undefined ? 1 : INJURY_RATES.practice.byGroup[group],
    kinds: group,
  };
}

/** His spot: the first key, in chart order (`SPOT_ORDER`), on this chart that lists him; undefined on none. */
export function spotOf(chart: Team["depthChart"], player: PlayerId | string): Position | undefined {
  const id = String(player);
  for (const key of SPOT_ORDER) if ((chart[key] ?? []).some((p) => String(p) === id)) return key;
  return undefined;
}

/** Each team's chart as each man's spot (`spotOf` for all of them at once, `aging.ts` `chartSpots`), by team id, then player id. */
export function teamSpots(teams: readonly Pick<Team, "id" | "depthChart">[]): Map<string, Map<string, Position>> {
  return new Map(teams.map((t) => [String(t.id), chartSpots(t)]));
}

/**
 * A reader of each man's spot-path risk: his key on his own team's chart (`teamId`), so a man listed
 * on a chart he has left is read off the chart. Teams are required: without them every man would read
 * as off the chart, so the spot path refuses to run blind.
 */
export function spotRiskReader(teams: readonly Pick<Team, "id" | "depthChart">[] | undefined): (p: { readonly teamId?: Team["id"]; readonly bio: { readonly id: PlayerId } }) => InjuryRiskProfile {
  if (teams === undefined) throw new RangeError("injuryRisk \"spot\" reads each man's chart key: pass the teams");
  const spots = teamSpots(teams);
  return (p) => spotRisk(p.teamId === undefined ? undefined : spots.get(String(p.teamId))?.get(String(p.bio.id)));
}

/** §12.3.2: the spot path's age factor, straight lines between `INJURY_RATES.spotAge.knots`, flat outside. */
export function spotAgeFactor(age: number): number {
  const knots = INJURY_RATES.spotAge.knots;
  const first = knots[0]!;
  const last = knots[knots.length - 1]!;
  if (age <= first[0]) return first[1];
  if (age >= last[0]) return last[1];
  for (let i = 1; i < knots.length; i++) {
    const [a1, f1] = knots[i]!;
    if (age <= a1) {
      const [a0, f0] = knots[i - 1]!;
      return f0 + ((f1 - f0) * (age - a0)) / (a1 - a0);
    }
  }
  return last[1];
}

// ─── How long, and what it leaves (§12.3.3-12.3.4; step AB6) ─────────────────────────────────────

/** How many injuries of this kind his history holds (`PlayerMemory.injuries`), healed or open: the repeat rule's `priorOfKind`. */
export function priorOfKind(history: readonly Pick<PastInjury, "kind">[] | undefined, kind: string): number {
  let n = 0;
  for (const h of history ?? []) if (h.kind === kind) n++;
  return n;
}

/** Is this kind in `HEALING_BY_AGE`'s class (back, ribs)? */
const healsSlowerWithAge = (kind: string): boolean => (HEALING_BY_AGE.classes as readonly string[]).includes(kind);

/**
 * The multiplier on a kind's LONG and MAJOR week buckets on the spot path (1 = the table as it is):
 * a concussion's repeat weight (`CONCUSSION_REPEAT`: `first` with no concussion before, `later` with
 * one or more), and for back and ribs at `HEALING_BY_AGE.from` and over its `longMajorOdds` unless
 * `healingByAge` is false (AB9-T6). Concussion takes no age term.
 */
export function longMajorWeight(kind: string, age: number, prior: number, healingByAge = true): number {
  const repeat = kind === CONCUSSION_REPEAT.kind ? (prior > 0 ? CONCUSSION_REPEAT.later : CONCUSSION_REPEAT.first) : 1;
  const healing = healingByAge && healsSlowerWithAge(kind) && age >= HEALING_BY_AGE.from ? HEALING_BY_AGE.longMajorOdds : 1;
  return repeat * healing;
}

/** Each (kind, multiplier)'s weeks, worked out once: the table is fixed. */
const SPOT_WEEKS = new Map<string, readonly WeeksBucket[]>();

/**
 * A kind's weeks lost on the spot path (§12.3.3-12.3.4): `INJURY_KINDS[kind].weeks` with its LONG and
 * MAJOR buckets (from `BAND_MIN_WEEKS.LONG` weeks) × `longMajorWeight`, the others as they are; the
 * draw renormalizes, so the odds of 4+ weeks are × the weight exactly. The table itself (the same
 * array) when the weight is 1, so a draw it does not move is the table's draw.
 */
export function spotWeeks(kind: string, age: number, prior: number, healingByAge = true): readonly WeeksBucket[] {
  const table = INJURY_KINDS[kind]!.weeks;
  const m = longMajorWeight(kind, age, prior, healingByAge);
  if (m === 1) return table;
  const key = `${kind}/${m}`;
  let weeks = SPOT_WEEKS.get(key);
  if (weeks === undefined) {
    weeks = table.map((b): WeeksBucket => (b[0] >= BAND_MIN_WEEKS.LONG ? [b[0], b[1], b[2] * m] : b));
    SPOT_WEEKS.set(key, weeks);
  }
  return weeks;
}

/**
 * A kind's lasting mark on the spot path (§12.3.4): `CONCUSSION_MARK` for a concussion (the table's
 * concussion has none, and the group path keeps it so), every other kind's own from the table.
 */
export function spotLasting(kind: string): LastingMark | undefined {
  return kind === CONCUSSION_REPEAT.kind ? CONCUSSION_MARK : INJURY_KINDS[kind]?.lasting;
}
