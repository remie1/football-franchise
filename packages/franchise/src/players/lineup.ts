/**
 * A head coach's depth-chart leanings (ADR-087 §3.1, C1; F3: "starters follow the coach's personality").
 *
 * Every head coach leans three ways, each 0..100: he sticks with the incumbent, he leans to
 * veterans, he plays who looks best this week. The leanings come from his personality type plus a
 * variation of his own, drawn on their own random stream (`franchise:lineup`, forked by his id), so
 * drawing them never moves any other draw. `buildStaff` stores them on the sitting head coaches when
 * asked (`lineups`); a coach without stored leanings is read through the same draw.
 *
 * A fiery coach has one more habit, read from his type rather than kept as a fourth leaning: a quick
 * hook, benching a starter after one bad game.
 *
 * The owner's team uses even leanings (the middle of all three) until ADR-083's main trait exists.
 */
import { createRng, type PersonalityType, type StaffState, type TeamId } from "@ff/contracts";
import { clamp, currentJob, normal, seatOf } from "../staff/world.js";

/** A head coach's three leanings, 0..100 each (`StaffState.lineup`, C1). */
export type Lineup = NonNullable<StaffState["lineup"]>;

/** The middle of all three: the owner's team (until ADR-083) and a team without a head coach. */
export const EVEN_LINEUP: Readonly<Lineup> = { incumbent: 50, veteran: 50, form: 50 };

/**
 * Each personality type's leanings before his own variation, 0..100. CHOSEN (ADR-087 §3.1's proposed
 * mapping, not ruled; tuned in D5): sticking with the incumbent is strongest in players' coaches and
 * quiet coaches, leaning to veterans in demanding and quiet ones, playing who looks best in cerebral
 * ones. A fiery coach is middling on all three; his quick hook is his own (`hasQuickHook`).
 */
export const LINEUP_BY_TYPE: Readonly<Record<PersonalityType, Readonly<Lineup>>> = {
  playersCoach: { incumbent: 80, veteran: 50, form: 30 },
  quiet: { incumbent: 75, veteran: 70, form: 30 },
  demanding: { incumbent: 45, veteran: 75, form: 50 },
  cerebral: { incumbent: 25, veteran: 35, form: 85 },
  fiery: { incumbent: 50, veteran: 50, form: 50 },
};

/** His own variation around his type: one standard deviation, in leaning points (0..100 scale). CHOSEN (tuned in D5). */
export const LINEUP_SPREAD = 10;

/** The random stream the leanings are drawn from, forked by the coach's id. */
export const LINEUP_STREAM = "franchise:lineup";

/**
 * His three leanings: his type's, plus his own variation, rounded to whole points and kept inside
 * 0..100. Pure: the same coach and seed always give the same leanings. Drawn in a fixed order
 * (incumbent, veteran, form) from his own fork.
 */
export function lineupFor(coach: StaffState, seed: string): Lineup {
  const rng = createRng(seed, LINEUP_STREAM).fork(String(coach.id));
  const base = LINEUP_BY_TYPE[coach.personalityType];
  const draw = (centre: number) => Math.round(clamp(centre + LINEUP_SPREAD * normal(rng), 0, 100));
  const incumbent = draw(base.incumbent);
  const veteran = draw(base.veteran);
  const form = draw(base.form);
  return { incumbent, veteran, form };
}

/** The head coach sitting at this team now, if any (the first in staff order, should there be two). */
export function headCoachOf(team: TeamId, staff: readonly StaffState[] | undefined): StaffState | undefined {
  return staff?.find((s) => seatOf(s) === "HEAD_COACH" && currentJob(s)?.team === team);
}

/**
 * The leanings a team's head coach uses: his stored `lineup`, else `lineupFor`; even leanings for the
 * owner's team (ADR-083's trait is not built) or a team with no head coach.
 */
export function teamLineup(team: TeamId, staff: readonly StaffState[] | undefined, seed: string, ownerTeam?: TeamId): Lineup {
  if (ownerTeam !== undefined && team === ownerTeam) return { ...EVEN_LINEUP };
  const coach = headCoachOf(team, staff);
  if (!coach) return { ...EVEN_LINEUP };
  return coach.lineup ? { ...coach.lineup } : lineupFor(coach, seed);
}

/** A fiery head coach's quick hook: he benches a starter after one bad game (ADR-087 §3.1, proposed). */
export function hasQuickHook(coach: StaffState | undefined): boolean {
  return coach?.personalityType === "fiery";
}
