/**
 * ADR-081 M3: the coordinators' voices (owner's Q3 table and Q8 c).
 *
 * The offensive and defensive coordinators speak on their own side of the ball only, with the same
 * skill-plus-dice grade as the GM and their own leanings:
 *  - the season we had is where they argue for their jobs: they credit their unit (its grade leans
 *    high) and blame bad luck (their luck read leans "unlucky");
 *  - next season is their wants: the holes they name are on their side, and they expect their unit
 *    to be better than it will be (win now);
 *  - they protect their own players (they name decline late) and, on players whose deals run out,
 *    say who to keep;
 *  - beyond next season they say little: only a young player of theirs about to break out.
 * Points 8 and 9 (the money cliff, the window) are the GM's alone.
 */
import {
  createRng,
  type MeetingClaim, type MeetingPoint, type MeetingTake, type PlayerId, type StaffState,
} from "@ff/contracts";
import { rating } from "../staff/ratings.js";
import { certaintyOf, DIFFICULTY, pointSkill, rollGrade, volunteerChance } from "./gm.js";
import { GROUP_OF, UNIT_OF, type MeetingGroup, type Unit } from "./strength.js";
import type { MeetingTruth } from "./truth.js";

import { pushedList, pushedOrdered, LUCK_ORDER } from "./gm.js";

/** A unit's standing, as a coordinator talks about it: top ten, the middle, bottom ten (of 32). */
export type UnitBand = "TOP_10" | "MIDDLE" | "BOTTOM_10";
export const BAND_ORDER: readonly UnitBand[] = ["BOTTOM_10", "MIDDLE", "TOP_10"];
export const bandOf = (rank: number, teams = 32): UnitBand => (rank <= 10 ? "TOP_10" : rank > teams - 10 ? "BOTTOM_10" : "MIDDLE");

/** The points a coordinator speaks to, in meeting order. GROWTH only when a young player of his is due. */
export const COORDINATOR_POINTS: readonly MeetingPoint[] = ["LUCK", "GOOD_AND_BAD", "HOLES", "DECLINE", "LOSSES", "NEXT_WINS", "GROWTH"];

export function sideOfSeat(seat: "OC" | "DC"): Unit {
  return seat === "OC" ? "OFFENSE" : "DEFENSE";
}

export interface CoordinatorReportInput {
  coach: StaffState;
  seat: "OC" | "DC";
  truth: MeetingTruth;
  seed: string;
}

export function coordinatorReport({ coach, seat, truth, seed }: CoordinatorReportInput): MeetingTake[] {
  const unit = sideOfSeat(seat);
  const mine = (g: MeetingGroup) => UNIT_OF[g] === unit;
  const nuance = rating(coach.attributes, "nuance");
  const ownGroups = (levels: Partial<Record<MeetingGroup, number>>) =>
    (Object.entries(levels) as [MeetingGroup, number][]).filter(([g]) => mine(g)).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).map(([g]) => g);
  const players = new Map(truth.projection.change.map((c) => [String(c.player.bio.id), c]));
  const ownPlayer = (id: PlayerId) => { const c = players.get(String(id)); return c !== undefined && mine(GROUP_OF[c.player.bio.position]); };
  const ownStarters = truth.projection.now.starters.map((s) => s.player.bio.id).filter(ownPlayer);
  const youngGrowth = truth.growth.filter(ownPlayer).filter((id) => players.get(String(id))!.player.bio.age <= 24);

  const takes: MeetingTake[] = [];
  for (const point of COORDINATOR_POINTS) {
    if (point === "GROWTH" && youngGrowth.length === 0) continue;
    const rng = createRng(seed, `franchise:meeting/${truth.season}/${String(truth.team)}/${String(coach.id)}/${point}`);
    const grade = rollGrade(pointSkill(coach, point), DIFFICULTY[point], rng);
    let claim: MeetingClaim;
    switch (point) {
      case "LUCK":
        claim = { point, verdict: pushedOrdered(LUCK_ORDER, truth.luck.verdict, grade, rng, -1) };
        break;
      case "GOOD_AND_BAD": {
        // His unit's standing, leaning high, and his best and worst groups.
        const band = pushedOrdered(BAND_ORDER, bandOf(truth.units[unit].rank), grade, rng, 1);
        const order = ownGroups(truth.groupsNow);
        claim = { point, verdict: band, groups: [...pushedList([...order].reverse(), [...order].reverse(), grade, rng, 1), ...pushedList(order, order, grade, rng, 1)] as string[] };
        break;
      }
      case "HOLES": {
        const order = ownGroups(truth.groupsNext);
        claim = { point, groups: pushedList(order, order, grade, rng, 2) as string[] };
        break;
      }
      case "DECLINE": {
        const truthMine = truth.decline.filter(ownPlayer);
        // Protecting his own: his wrong reads leave his decliners out.
        claim = { point, players: pushedList(truthMine, ownStarters.filter((id) => !truthMine.includes(id)), grade, rng, 2) };
        break;
      }
      case "LOSSES": {
        // Who to keep among his players whose deals run out, best first.
        const truthMine = truth.losses.filter(ownPlayer);
        claim = { point, players: pushedList(truthMine, truthMine, grade, rng, 2) };
        break;
      }
      case "NEXT_WINS": {
        const band = pushedOrdered(BAND_ORDER, bandOf(truth.unitsNext[unit].rank), grade, rng, 1);
        claim = { point, verdict: band };
        break;
      }
      case "GROWTH":
        claim = { point, players: pushedList(youngGrowth, ownStarters, grade, rng, 1) };
        break;
      default:
        continue;
    }
    takes.push({ speaker: coach.id, claim, grade, certainty: certaintyOf(grade, nuance, rng), volunteered: rng.next() < volunteerChance(nuance) });
  }
  return takes;
}


