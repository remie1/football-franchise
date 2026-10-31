/**
 * ADR-081 Q3 and F4: agreement, disagreement and fights.
 *
 * When two men speak to the same point and their claims cannot both be right, it is a clash. How hot
 * it gets is the mix (F4, never one trait alone): the two men's personality types, how they get on
 * (the lower of their two views, ADR-084), how far apart their claims are, and what is at stake (a
 * coordinator whose unit finished in the bottom ten is arguing for his job). Below `HEAT.open` it
 * stays polite; below `HEAT.rift` it is an open argument; above, a rift. All numbers CHOSEN, tuned
 * at M5. An agreement is not proof: two wrong reads can agree.
 */
import {
  createRng,
  type MeetingClash, type MeetingPoint, type MeetingTake, type PersonalityType, type StaffId, type StaffState,
} from "@ff/contracts";
import { normal } from "../staff/world.js";
import { rating } from "../staff/ratings.js";

/** How much heat each personality type brings to an argument. */
export const TEMPER: Readonly<Record<PersonalityType, number>> = { fiery: 1, demanding: 0.6, cerebral: 0.2, playersCoach: 0.1, quiet: 0 };

export const HEAT = {
  /** Heat at which a clash becomes an open argument, and a rift. */
  open: 2,
  rift: 3.5,
  /** Per step apart (one step: off by one; two: opposite). */
  perStep: 0.5,
  /** A coordinator whose unit was bottom ten. */
  jobOnLine: 1,
  /** Per point of the lower view below zero. */
  perColdPoint: 1 / 25,
  /** The dice's spread. */
  noise: 0.5,
  /** Politics lead (with the dice) that wins an argument; closer than this, nobody won. */
  politicsMargin: 5,
} as const;

/** Whether two claims on one point clash, and how many steps apart they are (0 = no clash). */
export function stepsApart(a: MeetingTake, b: MeetingTake, sideGroups?: ReadonlySet<string>): number {
  const ca = a.claim, cb = b.claim;
  switch (ca.point as MeetingPoint) {
    case "LUCK": {
      if (ca.verdict === undefined || cb.verdict === undefined || ca.verdict === cb.verdict) return 0;
      return ca.verdict === "EVEN" || cb.verdict === "EVEN" ? 1 : 2;
    }
    case "GOOD_AND_BAD": {
      // One calls a group of the other's side its worst while he calls his unit top ten.
      const worstA = ca.groups?.[ca.groups.length - 1], worstB = cb.groups?.[cb.groups.length - 1];
      const blames = (worst: string | undefined, band: string | undefined) => worst !== undefined && sideGroups?.has(worst) === true && band === "TOP_10";
      return blames(worstA, cb.verdict) || blames(worstB, ca.verdict) ? 1 : 0;
    }
    case "HOLES":
    case "DECLINE": {
      // Each man's first name on the side in question is missing from the other's list.
      const listA = (ca.groups ?? ca.players?.map(String) ?? []), listB = (cb.groups ?? cb.players?.map(String) ?? []);
      const onSide = (x: string) => sideGroups === undefined || ca.players !== undefined || sideGroups.has(x);
      const firstA = listA.find(onSide), firstB = listB.find(onSide);
      if (firstA === undefined || firstB === undefined) return 0;
      return !listB.includes(firstA) && !listA.includes(firstB) ? 1 : 0;
    }
    case "NEXT_WINS": {
      // The GM's wins against a coordinator's band.
      const wins = ca.wins ?? cb.wins, band = ca.verdict ?? cb.verdict;
      if (wins === undefined || band === undefined) return 0;
      if ((band === "TOP_10" && wins <= 6) || (band === "BOTTOM_10" && wins >= 11)) return 2;
      if ((band === "TOP_10" && wins <= 8) || (band === "BOTTOM_10" && wins >= 9)) return 1;
      return 0;
    }
    default:
      return 0;
  }
}

export interface ClashInput {
  takes: readonly MeetingTake[];
  staff: ReadonlyMap<string, StaffState>;
  /** The lower of two men's views of each other, if both views exist (ADR-084). */
  lowerView: (a: StaffId, b: StaffId) => number | undefined;
  /** Coordinators whose unit finished bottom ten. */
  jobOnLine: ReadonlySet<string>;
  /** The groups on each coordinator's side, by his id. */
  sideGroups: ReadonlyMap<string, ReadonlySet<string>>;
  seed: string;
  key: string;
}

export interface ClashResult extends MeetingClash {
  /** Who won the argument on politics; absent when nobody did. */
  winner?: StaffId;
}

export function findClashes(input: ClashInput): ClashResult[] {
  const out: ClashResult[] = [];
  const byPoint = new Map<string, MeetingTake[]>();
  for (const t of input.takes) byPoint.set(t.claim.point, [...(byPoint.get(t.claim.point) ?? []), t]);
  for (const [point, takes] of byPoint) {
    for (let i = 0; i < takes.length; i++) for (let j = i + 1; j < takes.length; j++) {
      const a = takes[i]!, b = takes[j]!;
      const side = input.sideGroups.get(String(b.speaker)) ?? input.sideGroups.get(String(a.speaker));
      const steps = stepsApart(a, b, side);
      if (steps === 0) continue;
      const sa = input.staff.get(String(a.speaker))!, sb = input.staff.get(String(b.speaker))!;
      const rng = createRng(input.seed, `franchise:meeting/clash/${input.key}/${point}/${String(a.speaker)}/${String(b.speaker)}`);
      const view = input.lowerView(a.speaker, b.speaker) ?? 0;
      const heat = TEMPER[sa.personalityType] + TEMPER[sb.personalityType] + HEAT.perStep * steps
        + (input.jobOnLine.has(String(a.speaker)) || input.jobOnLine.has(String(b.speaker)) ? HEAT.jobOnLine : 0)
        + Math.max(0, -view) * HEAT.perColdPoint + HEAT.noise * normal(rng);
      const lead = rating(sa.attributes, "politics") - rating(sb.attributes, "politics") + 10 * normal(rng);
      const clash: ClashResult = {
        point: point as MeetingPoint, between: [a.speaker, b.speaker],
        heat: heat >= HEAT.rift ? "RIFT" : heat >= HEAT.open ? "OPEN_ARGUMENT" : "POLITE",
      };
      if (Math.abs(lead) >= HEAT.politicsMargin) clash.winner = lead > 0 ? a.speaker : b.speaker;
      out.push(clash);
    }
  }
  return out;
}
