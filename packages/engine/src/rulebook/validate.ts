/**
 * THE INPUT RULES (ADR-093 step 0): a down, a play and its flags that cannot be
 * taken as given are a programmer's mistake and are thrown, never returned.
 */
import type { FoulKind } from "@ff/contracts";
import { RulebookInputError } from "./errors.js";
import { GOAL_LINE_B, SPOT_MIN, SPOT_MAX, TWO_MINUTES } from "./field.js";
import { FOUL_TABLE } from "./fouls.js";
import type { RulebookDown, RulebookFlag, RulebookPlay } from "./types.js";

/**
 * The kinds that cannot go with an illegal forward pass thrown from beyond the line: they are
 * fouls of a legal pass, and with that throw the down is a running play (3-24-3). Any other
 * flag during the play with it is refused, not thrown; flags at the snap and dead-ball flags (a
 * taunt among them, whenever it happens) are built.
 */
const PASS_ONLY_KINDS: readonly FoulKind[] = [
  "DEFENSIVE_PASS_INTERFERENCE", "OFFENSIVE_PASS_INTERFERENCE", "INELIGIBLE_DOWNFIELD_PASS", "INTENTIONAL_GROUNDING", "ROUGHING_THE_PASSER",
];

function fail(message: string): never {
  throw new RulebookInputError(message);
}

function inRange(name: string, y: number): void {
  if (!Number.isFinite(y) || y < SPOT_MIN || y > SPOT_MAX) fail(`${name} ${y} is outside [${SPOT_MIN}, ${SPOT_MAX}]`);
}

/** Throws a `RulebookInputError` when the input is malformed. */
export function validate(down: RulebookDown, play: RulebookPlay, flags: readonly RulebookFlag[]): void {
  const p = down.snapSpot;
  if (!(p > 0 && p < 100)) fail(`snapSpot ${p} must be strictly inside (0, 100)`);
  if (!(down.lineToGain > p && down.lineToGain <= 100)) fail(`lineToGain ${down.lineToGain} must be in (snapSpot ${p}, 100]`);
  if (![1, 2, 3, 4].includes(down.down)) fail(`down ${down.down} must be 1 to 4`);
  const c = down.clock;
  if (c !== undefined) {
    if (![1, 2, 3, 4, 5].includes(c.period)) fail(`clock period ${c.period} must be 1 to 5`);
    if (!(c.secondsLeft >= 0)) fail(`clock secondsLeft ${c.secondsLeft} must not be negative`);
    if (!(c.timeoutsLeft.A >= 0) || !(c.timeoutsLeft.B >= 0)) fail("clock timeoutsLeft must not be negative");
    if (c.expiredDuringDown && play.kind === "NO_PLAY") fail("expiredDuringDown cannot be set with a NO_PLAY");
  }
  if (play.kind === "RUN") inRange("run deadBallSpot", play.deadBallSpot);
  if (play.kind === "PASS" && play.outcome.result !== "INCOMPLETE") inRange("pass deadBallSpot", play.outcome.deadBallSpot);

  const refs = new Set<string>();
  for (const f of flags) {
    if (refs.has(f.ref)) fail(`duplicate flag ref "${f.ref}"`);
    refs.add(f.ref);
  }
  if (play.kind === "NO_PLAY") {
    if (flags.length === 0) fail("a NO_PLAY needs a flag before the snap");
    for (const t of ["A", "B"] as const) {
      if (flags.filter((f) => f.by === t).length > 1) {
        fail(`two before-the-snap flags by team ${t} for one snap: enforce them one after the other, one call each`);
      }
    }
  }
  const throwsBeyond = flags.some((f) => f.kind === "ILLEGAL_FORWARD_PASS" && f.spot > p);
  for (const f of flags) {
    const row = FOUL_TABLE[f.kind];
    const tag = `flag "${f.ref}" (${f.kind})`;
    if (!row.by.includes(f.by)) fail(`${tag} cannot be committed by team ${f.by}`);
    if (!row.when.includes(f.when)) fail(`${tag} cannot happen ${f.when}`);
    inRange(`${tag} spot`, f.spot);
    if (play.kind === "NO_PLAY" && f.when !== "BEFORE_SNAP") fail(`${tag}: a NO_PLAY takes only BEFORE_SNAP flags`);
    if (play.kind !== "NO_PLAY" && f.when === "BEFORE_SNAP") fail(`${tag}: a BEFORE_SNAP flag takes a NO_PLAY, not a play`);
    if (row.needsPass === "ALWAYS" && play.kind !== "PASS") fail(`${tag} needs a forward pass in the down`);
    if (row.needsPass === "PASS_SACK_OR_SCRAMBLE" && play.kind === "RUN" && play.from !== "SACK" && play.from !== "SCRAMBLE") {
      fail(`${tag} needs a pass, a sack or a scramble, not a ${play.from} run`);
    }
    if (row.needsPass === "PASS_SACK_OR_SCRAMBLE" && play.kind === "NO_PLAY") fail(`${tag} needs a play`);
    const taunt = f.kind === "TAUNTING";
    const needsPhase = f.when === "DURING_PLAY" && play.kind === "PASS" && !taunt;
    if (needsPhase) {
      if (f.phase === undefined) fail(`${tag} is DURING_PLAY on a pass and needs a phase`);
      if (!row.phases.includes(f.phase)) fail(`${tag} cannot take phase ${f.phase}`);
      if (f.phase === "AFTER_CATCH" && play.outcome.result === "INCOMPLETE") fail(`${tag}: AFTER_CATCH on an incomplete pass`);
    } else if (f.phase !== undefined && !taunt) {
      fail(`${tag} takes no phase here (a phase goes only on a DURING_PLAY flag of a pass)`);
    }
    if (row.special === "DPI" || f.kind === "OFFENSIVE_PASS_INTERFERENCE") {
      if (!(f.spot > p + 1)) fail(`${tag} spot ${f.spot} must be more than one yard beyond the line ${p} (8-5-1)`);
    }
    if (f.kind === "ILLEGAL_FORWARD_PASS" && f.spot >= GOAL_LINE_B) {
      fail(`${tag}: an illegal forward pass released at or beyond B's goal line names no play: the passer had scored (11-2)`);
    }
    if (row.special === "GROUNDING") {
      if (!(play.kind === "PASS" && play.outcome.result === "INCOMPLETE")) fail(`${tag} needs an incomplete pass`);
      if (f.spot > p) fail(`${tag} thrown from beyond the line is an illegal forward pass, not grounding`);
    }
    if (throwsBeyond && PASS_ONLY_KINDS.includes(f.kind)) {
      fail(`${tag} cannot go with an illegal forward pass thrown from beyond the line: that down is a running play`);
    }
    if (f.sameActAs !== undefined) {
      if (f.by !== "B") fail(`${tag}: sameActAs names the defense's pass interference, so the flag must be B's personal foul of the same act (14-1-3 Exc. 2)`);
      const dpi = flags.find((g) => g.ref === f.sameActAs);
      if (dpi === undefined || dpi.kind !== "DEFENSIVE_PASS_INTERFERENCE") fail(`${tag} sameActAs names no DEFENSIVE_PASS_INTERFERENCE flag of this call`);
      if (!row.personal) fail(`${tag} is not a personal foul, so it cannot be the same act as a pass interference`);
      if (f.kind === "TAUNTING") fail(`${tag}: a taunt is a dead-ball foul whenever it happens (14-4-9), so it is never the same act as a pass interference with the phase BALL_IN_AIR (8-5-1)`);
      if (f.when !== "DURING_PLAY" || f.phase !== "BALL_IN_AIR") fail(`${tag}: sameActAs needs the foul during the play with the phase BALL_IN_AIR, the time defensive pass interference can happen (8-5-1)`);
    }
    if (c !== undefined && f.when === "AT_SNAP") {
      const late = c.period === 2 || c.period === 4 || c.period === 5;
      if (f.kind === "ILLEGAL_SHIFT" && c.afterTwoMinuteWarning && late && c.withoutFlags === "RUNNING") {
        fail(`${tag}: after the two-minute warning with the clock running the officials call FALSE_START, not an illegal shift (7-4-2 Item 6)`);
      }
      if (f.kind === "DEFENSIVE_OFFSIDE" && late && c.secondsLeft <= TWO_MINUTES && !flags.some((g) => g.by === "A" && g.when === "AT_SNAP")) {
        fail(`${tag}: in the last two minutes of a half the officials call NEUTRAL_ZONE_INFRACTION, not defensive offside (7-4-4 bullet 3)`);
      }
    }
  }
}
