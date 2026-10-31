/**
 * ADR-090 step 0's numbers: what the book's pictures look like, counted, and the rows the report
 * checks against the owner's August ranges (`ADR-066:607-610`, ADR-090 §9).
 *
 * Every count reads the pictures `drawEverySnap` drew, never the tables' constants, so a table
 * value that never reaches a picture is not counted as checked.
 */
import type { PlayerId, SnapSpot } from "@ff/contracts";
import {
  COVERAGE_MASKS,
  DEFENSE_ROLE_GROUP,
  alignedRoles,
  dutyList,
  laneOfX,
  maskShows,
  onOneSpot,
  type DefenseGroup,
  type DefenseRole,
  type OffenseRole,
} from "@ff/playbook";
import type { DrawnSnap } from "./corpus.js";

/** A tally keyed by a printable value, in first-seen order; the renderer sorts. */
export type Tally = Readonly<Record<string, number>>;

export interface ManDepthRow {
  readonly group: DefenseGroup;
  readonly technique: string;
  readonly depth: number;
  readonly men: number;
}

export interface LeverageRow {
  /** "a safety in the deep middle", "nobody in the deep middle", or "bracketed with a backer". */
  readonly help: string;
  readonly shade: "outside" | "inside" | "head up";
  readonly men: number;
}

export interface LookGroundRow {
  /** The look as the captain says it, with its timing where a safety rotates. */
  readonly look: string;
  readonly group: DefenseGroup;
  readonly men: number;
  /** From his shown spot to the spot his played job lines him up at, in yards. */
  readonly shownMean: number;
  readonly shownMax: number;
  /** From where he stands at the snap to that same spot: the ground the look still costs. */
  readonly atSnapMean: number;
  readonly atSnapMax: number;
}

/** A man a look shows far from his real spot: the look, the call, the man, the farthest it puts him. */
export interface FarLook {
  readonly look: string;
  readonly call: string;
  readonly role: DefenseRole;
  readonly yards: number;
}

export interface OffenseRow {
  readonly formation: string;
  readonly spots: readonly { readonly role: OffenseRole; readonly spot: SnapSpot }[];
}

export interface SnapSpotsMeasure {
  readonly calls: number;
  readonly wornCalls: number;
  readonly formations: number;
  readonly pictures: number;
  readonly mugPictures: number;
  readonly stemPictures: number;
  /** Pictures missing a man or holding one twice: labels. */
  readonly incomplete: readonly string[];
  readonly quarterbackBehindCenter: number;
  readonly mugBackerBehindTackle: number;
  /** Any other two men closer than a yard both ways: labels. */
  readonly otherSharedSpots: readonly string[];
  /** Down linemen at their aligned spots, by technique. */
  readonly technique: Tally;
  readonly lineDepths: Tally;
  /** Backers at their aligned spots, depth by whether they rush. */
  readonly backersNotRushing: Tally;
  readonly backersRushing: Tally;
  /** Every defender's aligned depth, by group. */
  readonly alignedDepths: Readonly<Record<DefenseGroup, Tally>>;
  readonly manDepths: readonly ManDepthRow[];
  readonly leverage: readonly LeverageRow[];
  readonly looks: readonly LookGroundRow[];
  /** Men a look shows more than `FAR_LOOK_YARDS` from their real spot, one row per look, call and man. */
  readonly farLooks: readonly FarLook[];
  /** D2: each skill player's spot mapped to a lane, against his formation's lane. */
  readonly lanesCompared: number;
  readonly laneDifferences: readonly string[];
  readonly offense: readonly OffenseRow[];
}

const GROUPS: readonly DefenseGroup[] = ["LINE", "BACKERS", "CORNERS", "NICKEL_DIME", "SAFETIES"];

/** Farther than a deep half is from the middle of the field and back again: worth naming. */
export const FAR_LOOK_YARDS = 12;
const MIDDLE_HELP = new Set(["POST", "DEEP_MIDDLE_THIRD"]);

/**
 * A down lineman's technique, read from where he stands against D3's line: the center at 0, the
 * guards at 1.5, the tackles at 3, an inline end at 4.5. Head up on a man is the even number;
 * the shade outside him is the next odd one (a 1 on the center, a 3 outside the guard, a 5
 * outside the tackle); beyond an inline end's spot is a 9.
 */
export function techniqueOf(x: number): string {
  const across = Math.abs(x);
  if (across < 0.5) return "0";
  if (across < 1.5) return "1";
  if (across === 1.5) return "2";
  if (across < 3) return "3";
  if (across === 3) return "4";
  if (across < 4.5) return "5";
  if (across === 4.5) return "6";
  return "9";
}

const label = (d: DrawnSnap): string => {
  const looks = (d.card.looks ?? []).map((l) => l.id).join("+");
  const timing = d.card.coverageDisguise === undefined ? "" : `/${d.card.coverageDisguise}`;
  return `${d.card.id}${looks === "" ? "" : `+${looks}${timing}`}${d.front === undefined ? "" : `+${d.front.look}`} vs ${d.formation.id}`;
};

const add = (tally: Record<string, number>, key: string | number, by = 1): void => {
  tally[String(key)] = (tally[String(key)] ?? 0) + by;
};

const distance = (a: SnapSpot, b: SnapSpot): number => Math.hypot(a.x - b.x, a.y - b.y);

const roleOf = (d: DrawnSnap): ReadonlyMap<string, DefenseRole> =>
  new Map((Object.entries(d.input.defense.byRole) as [DefenseRole, PlayerId][]).map(([role, p]) => [String(p), role]));

/** Every two men closer than a yard both ways, sorted into the two the calls ask for and the rest. */
function sharedSpots(d: DrawnSnap): { quarterback: number; mug: number; other: string[] } {
  const men = [
    ...(Object.entries(d.beats.offense) as [string, SnapSpot][]),
    ...(Object.entries(d.beats.atSnap) as [string, SnapSpot][]),
  ];
  const result = { quarterback: 0, mug: 0, other: [] as string[] };
  for (let i = 0; i < men.length; i++) {
    for (let j = i + 1; j < men.length; j++) {
      const [a, sa] = men[i]!;
      const [b, sb] = men[j]!;
      if (!onOneSpot(sa, sb)) continue;
      const pair = [a, b].sort().join("~");
      if (pair === "C~QB" && d.formation.quarterback === "UNDER_CENTER") result.quarterback += 1;
      else if (d.front?.look === "MUG" && /^(DT_L|DT_R|NT)~LB_[WM]$|^LB_[WM]~NT$/.test(pair) && sa.x === sb.x) result.mug += 1;
      else result.other.push(`${label(d)}: ${pair}`);
    }
  }
  return result;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

export function measureSnapSpots(drawn: readonly DrawnSnap[]): SnapSpotsMeasure {
  const incomplete: string[] = [];
  const otherSharedSpots: string[] = [];
  let quarterbackBehindCenter = 0;
  let mugBackerBehindTackle = 0;
  const technique: Record<string, number> = {};
  const lineDepths: Record<string, number> = {};
  const backersNotRushing: Record<string, number> = {};
  const backersRushing: Record<string, number> = {};
  const alignedDepths = Object.fromEntries(GROUPS.map((g) => [g, {} as Record<string, number>])) as Record<
    DefenseGroup,
    Record<string, number>
  >;
  const manDepths = new Map<string, ManDepthRow>();
  const leverage = new Map<string, LeverageRow>();
  const ground = new Map<string, { look: string; group: DefenseGroup; shown: number[]; atSnap: number[] }>();
  const farLooks = new Map<string, FarLook>();

  for (const d of drawn) {
    const roles = roleOf(d);
    const players = [...d.beats.picture.offense, ...d.beats.picture.defense].map((s) => String(s.player));
    if (d.beats.picture.offense.length !== 11 || players.length !== 22 || new Set(players).size !== 22) incomplete.push(label(d));

    const shared = sharedSpots(d);
    quarterbackBehindCenter += shared.quarterback;
    mugBackerBehindTackle += shared.mug;
    otherSharedSpots.push(...shared.other);

    const rushers = new Set(d.input.defense.call.rush.map((r) => String(r.rusher)));
    for (const [role, spot] of Object.entries(d.beats.aligned) as [DefenseRole, SnapSpot][]) {
      const group = DEFENSE_ROLE_GROUP[role];
      add(alignedDepths[group], spot.y);
      if (group === "LINE") {
        add(technique, techniqueOf(spot.x));
        add(lineDepths, `${spot.y} ${spot.stance}`);
      }
      if (group === "BACKERS") add(rushers.has(String(d.input.defense.byRole[role])) ? backersRushing : backersNotRushing, spot.y);
    }

    // Man coverage: depth by technique, and the shade against where the help is (D5).
    const middleHelp = dutyList(d.card).some(
      ({ role, duty }) =>
        duty.kind === "ZONE" && MIDDLE_HELP.has(duty.responsibility) && !d.input.defense.fallbacksTaken.includes(role),
    );
    const manOn = new Map<string, Set<DefenseGroup>>();
    const manJobs: { role: DefenseRole; covers: string; technique: string }[] = [];
    for (const a of d.input.defense.call.assignments) {
      if (a.kind !== "MAN") continue;
      const role = roles.get(String(a.defender));
      if (role === undefined) continue;
      const groups = manOn.get(String(a.covers)) ?? new Set<DefenseGroup>();
      groups.add(DEFENSE_ROLE_GROUP[role]);
      manOn.set(String(a.covers), groups);
      manJobs.push({ role, covers: String(a.covers), technique: a.technique });
    }
    const offenseAt = new Map(d.beats.picture.offense.map((s) => [String(s.player), s]));
    for (const job of manJobs) {
      const group = DEFENSE_ROLE_GROUP[job.role];
      if (group === "LINE" || group === "BACKERS") continue;
      const spot = d.beats.aligned[job.role];
      const man = offenseAt.get(job.covers);
      if (spot === undefined || man === undefined) continue;
      const depthKey = `${group} ${job.technique} ${spot.y}`;
      const row = manDepths.get(depthKey);
      manDepths.set(depthKey, { group, technique: job.technique, depth: spot.y, men: (row?.men ?? 0) + 1 });
      const groups = manOn.get(job.covers) ?? new Set<DefenseGroup>();
      const help = groups.has("BACKERS")
        ? "bracketed with a backer"
        : middleHelp
          ? "a safety in the deep middle"
          : "nobody in the deep middle";
      const shade = Math.abs(spot.x) > Math.abs(man.x) ? "outside" : Math.abs(spot.x) < Math.abs(man.x) ? "inside" : "head up";
      const key = `${help}|${shade}`;
      leverage.set(key, { help, shade, men: (leverage.get(key)?.men ?? 0) + 1 });
    }

    // The ground each look costs: from the shown spot, and from the snap spot, to the aligned one.
    const moved = new Map<DefenseRole, string>();
    for (const tag of d.card.looks ?? []) {
      const mask = COVERAGE_MASKS.find((m) => m.id === tag.id);
      if (mask === undefined) continue;
      const timing =
        mask.row !== "BY_TIMING" ? "" : d.card.coverageDisguise === "LATE_ROTATION" ? " (late)" : " (early)";
      for (const role of Object.keys(maskShows(d.card, mask)) as DefenseRole[]) moved.set(role, `${mask.name}${timing}`);
    }
    if (d.front !== undefined) {
      const name = d.front.look === "MUG" ? "Mug" : "Stem (on time)";
      for (const role of Object.keys(d.beats.shown) as DefenseRole[]) {
        if (!moved.has(role) && d.input.defense.call.shownRush.some((r) => String(r.rusher) === String(d.input.defense.byRole[role]))) {
          moved.set(role, name);
        }
      }
    }
    for (const [role, look] of moved) {
      const aligned = d.beats.aligned[role];
      const shown = d.beats.shown[role];
      const atSnap = d.beats.atSnap[role];
      if (aligned === undefined || shown === undefined || atSnap === undefined) continue;
      if (shown.x === aligned.x && shown.y === aligned.y) continue;
      const group = DEFENSE_ROLE_GROUP[role];
      const key = `${look}|${group}`;
      const entry = ground.get(key) ?? { look, group, shown: [], atSnap: [] };
      entry.shown.push(distance(shown, aligned));
      entry.atSnap.push(distance(atSnap, aligned));
      ground.set(key, entry);
      const yards = distance(shown, aligned);
      const farKey = `${look.replace(/ \((early|late)\)$/, "")}|${d.base.id}|${role}`;
      if (yards > FAR_LOOK_YARDS && yards > (farLooks.get(farKey)?.yards ?? 0)) {
        farLooks.set(farKey, { look: look.replace(/ \((early|late)\)$/, ""), call: d.base.id, role, yards });
      }
    }
  }

  // D2 and beat 1: one picture per formation (the offense does not depend on the call).
  const firstOf = new Map<string, DrawnSnap>();
  for (const d of drawn) if (!firstOf.has(d.formation.id)) firstOf.set(d.formation.id, d);
  const laneDifferences: string[] = [];
  let lanesCompared = 0;
  const offense: OffenseRow[] = [];
  for (const [id, d] of firstOf) {
    for (const { role, alignment } of alignedRoles(d.formation)) {
      const spot = d.beats.offense[role];
      if (spot === undefined) continue;
      lanesCompared += 1;
      const lane = laneOfX(spot.x);
      if (lane !== alignment.lane) laneDifferences.push(`${id} ${role}: ${alignment.lane} to ${lane}`);
    }
    offense.push({
      formation: id,
      spots: (Object.entries(d.beats.offense) as [OffenseRole, SnapSpot][]).map(([role, spot]) => ({ role, spot })),
    });
  }

  const wornIds = new Set(drawn.map((d) => `${d.card.id}|${(d.card.looks ?? []).map((l) => l.id).join("+")}|${d.card.coverageDisguise ?? ""}`));
  return {
    calls: new Set(drawn.map((d) => d.base.id)).size,
    wornCalls: wornIds.size,
    formations: firstOf.size,
    pictures: drawn.length,
    mugPictures: drawn.filter((d) => d.front?.look === "MUG").length,
    stemPictures: drawn.filter((d) => d.front?.look === "STEM").length,
    incomplete,
    quarterbackBehindCenter,
    mugBackerBehindTackle,
    otherSharedSpots,
    technique,
    lineDepths,
    backersNotRushing,
    backersRushing,
    alignedDepths,
    manDepths: [...manDepths.values()],
    leverage: [...leverage.values()],
    looks: [...ground.values()].map((g) => ({
      look: g.look,
      group: g.group,
      men: g.shown.length,
      shownMean: mean(g.shown),
      shownMax: Math.max(...g.shown),
      atSnapMean: mean(g.atSnap),
      atSnapMax: Math.max(...g.atSnap),
    })),
    farLooks: [...farLooks.values()],
    lanesCompared,
    laneDifferences,
    offense,
  };
}
