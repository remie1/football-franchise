/**
 * THE DEFENSIVE CORPUS — twenty-two cards across four personnel groupings.
 *
 * SIDES ARE STATED FROM THE OFFENCE'S POINT OF VIEW, everywhere, without exception.
 * `DE_L` is the end aligned over the offence's left tackle; `CB_R` covers the
 * offence's right. One convention, chosen once, so no card ever flips perspective
 * and no reader ever has to ask.
 *
 * TWO PROPERTIES EVERY CARD HAS, and both are enforced in `validate.ts`:
 *
 *  1. **Gap integrity.** Every A, B and C gap on both sides is owned by exactly one
 *     defender, at the first level (rushers) or the second (backers and safeties
 *     with a `runFit`). Uniqueness matters mechanically as well as football-wise:
 *     run-block instantiation resolves a blocker's gap to a defender, and two
 *     owners would make that ambiguous.
 *  2. **Declared deep help.** A card with no deep zone defender must say
 *     `noDeepHelp: true`. Cover 0 is legal and goal-line defence has no deep zone
 *     because the end line is the deep zone; both are stated rather than inferred,
 *     so a card that has accidentally lost its post safety fails validation instead
 *     of quietly playing Cover 0 for a thousand games.
 *
 * ZONES ARE REGIONS, AND THE REGION IS NAMED (ADR-018 §Petition 1). Every zone duty
 * states a responsibility out of `coverage.ts`'s vocabulary — `zone("DEEP_THIRD",
 * "LW")`, `zone("FLAT", "RW")` — and the responsibility carries the band and both
 * spans. A card chooses WHO HAS WHAT, never how wide a third is.
 *
 * The consequence worth reading the cards for: **each shell now fails where the real
 * shell fails, and it does so emergently.** Cover 3 Sky leaves the middle underneath
 * open, which is the void Cover 3 Buzz exists to fill — and Buzz then gives up a
 * flat instead, because the man who buzzed to the hook was the flat defender.
 * Quarters covers four lanes deep and leaves the centre lane, which is why quarters
 * is beaten by the seam. Cover 2's halves are DEEP-only and its two hook defenders
 * are one lane each, so the intermediate outside — the hole a fifteen-yard comeback
 * lives in — belongs to nobody. None of that was arranged; it falls out of stating
 * who has which responsibility and letting the shapes land where they land.
 *
 * WEIGHTS. Shaped to reproduce `COVERAGE_SHELL_USAGE` and `BLITZ_RATE_PRIOR`, and
 * `test/distribution.test.ts` asserts they do. Read `distribution.ts` first for how
 * much those priors are worth.
 */
import { zone } from "./coverage.js";
import type { AnyDefensiveCard, DefensiveDuty } from "./defense.js";
import { defensiveCard } from "./defense.js";

/** The four-man front every base card shares. Gaps: C/A left, A/C right. */
const FOUR_MAN_RUSH: Record<"DE_L" | "DT_L" | "DT_R" | "DE_R", DefensiveDuty> = {
  DE_L: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "C", side: "LEFT" },
  DT_L: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "LEFT" },
  DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
  DE_R: { kind: "RUSH", move: "FINESSE", alignment: "EDGE", gap: "C", side: "RIGHT" },
};

// --- nickel: zone shells ----------------------------------------------------

export const NICKEL_COVER_3_SKY = defensiveCard({
  id: "DEF_NICKEL_COVER_3_SKY",
  name: "Cover 3 Sky",
  personnel: "NICKEL",
  front: "Nickel Over",
  shellIntent: "SPOT_ZONE",
  family: "COVER_3",
  duties: {
    ...FOUR_MAN_RUSH,
    // Three deep, four under. The two hooks are one lane each, so nobody has the
    // centre lane underneath: that is Cover 3 Sky's hole, and it is the whole reason
    // the next card exists.
    CB_L: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
    CB_R: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
    S_F: { kind: "ZONE", ...zone("DEEP_MIDDLE_THIRD", "C") },
    // Sky = safety force. He rolls to the flat and owns the edge in the run fit.
    S_S: { kind: "ZONE", ...zone("FLAT", "LW"), runFit: { gap: "D", side: "LEFT" } },
    CB_N: { kind: "ZONE", ...zone("FLAT", "RW"), runFit: { gap: "D", side: "RIGHT" } },
    LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "B", side: "RIGHT" } },
  },
  usage: { weight: 12 },
});

export const NICKEL_COVER_3_BUZZ = defensiveCard({
  id: "DEF_NICKEL_COVER_3_BUZZ",
  name: "Cover 3 Buzz",
  personnel: "NICKEL",
  front: "Nickel Over",
  shellIntent: "SPOT_ZONE",
  family: "COVER_3",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_L: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
    CB_R: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
    S_F: { kind: "ZONE", ...zone("DEEP_MIDDLE_THIRD", "C") },
    // The buzz: the strong safety drops to the middle hook rather than the flat,
    // closing the void Sky leaves. The trade is stated by the shapes rather than by
    // a comment — with the safety in the middle, the LEFT flat now belongs to a
    // curl/flat player who is a lane inside it, so the swing to that side is open.
    S_S: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "D", side: "LEFT" } },
    CB_N: { kind: "ZONE", ...zone("FLAT", "RW"), runFit: { gap: "D", side: "RIGHT" } },
    LB_W: { kind: "ZONE", ...zone("CURL_FLAT", "LW"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "B", side: "RIGHT" } },
  },
  usage: { weight: 6 },
});

/**
 * A five-man pressure with a three-deep shell behind it. It exists because the
 * blitz rate and the coverage-shell distribution are ORTHOGONAL: roughly a quarter
 * of dropbacks see five or more rushers, and those pressures are played from every
 * shell, not from a "blitz" shell. A corpus whose only pressures were Cover 0 and
 * fire zone would reproduce one distribution by breaking the other.
 */
export const NICKEL_COVER_3_PRESSURE = defensiveCard({
  id: "DEF_NICKEL_COVER_3_PRESSURE",
  name: "Cover 3 Nickel Pressure",
  personnel: "NICKEL",
  front: "Nickel Over",
  shellIntent: "SPOT_ZONE",
  family: "COVER_3",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_N: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "D", side: "RIGHT" },
    CB_L: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
    CB_R: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
    S_F: { kind: "ZONE", ...zone("DEEP_MIDDLE_THIRD", "C") },
    // The nickel blitzes off the RIGHT edge, so the safety rolls down to the LEFT
    // flat and the pressure side has no flat player at all. Stating a side on the
    // rush is what makes that legible: before ADR-018 this man's zone and his run
    // fit were on opposite sides of the formation and nothing could tell.
    S_S: { kind: "ZONE", ...zone("FLAT", "LW"), runFit: { gap: "D", side: "LEFT" } },
    LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "B", side: "RIGHT" } },
  },
  usage: { weight: 7 },
});

export const NICKEL_COVER_2 = defensiveCard({
  id: "DEF_NICKEL_COVER_2",
  name: "Cover 2",
  personnel: "NICKEL",
  front: "Nickel Even",
  shellIntent: "SPOT_ZONE",
  family: "COVER_2",
  duties: {
    ...FOUR_MAN_RUSH,
    // Two deep, five under. The halves are DEEP-only precisely because there are
    // five underneath, and the two hook players are one lane each — so the
    // intermediate band outside the hashes belongs to nobody. That is where a
    // fifteen-yard comeback against Cover 2 is caught.
    CB_L: { kind: "ZONE", ...zone("FLAT", "LW"), runFit: { gap: "D", side: "LEFT" } },
    CB_R: { kind: "ZONE", ...zone("FLAT", "RW"), runFit: { gap: "D", side: "RIGHT" } },
    S_F: { kind: "ZONE", ...zone("DEEP_HALF", "LH") },
    S_S: { kind: "ZONE", ...zone("DEEP_HALF", "RH") },
    LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "B", side: "RIGHT" } },
    CB_N: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
  },
  usage: { weight: 7 },
});

export const NICKEL_TAMPA_2 = defensiveCard({
  id: "DEF_NICKEL_TAMPA_2",
  name: "Tampa 2",
  personnel: "NICKEL",
  front: "Nickel Even",
  shellIntent: "SPOT_ZONE",
  family: "COVER_2",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_L: { kind: "ZONE", ...zone("FLAT", "LW"), runFit: { gap: "D", side: "LEFT" } },
    CB_R: { kind: "ZONE", ...zone("FLAT", "RW"), runFit: { gap: "D", side: "RIGHT" } },
    S_F: { kind: "ZONE", ...zone("DEEP_HALF", "LH") },
    S_S: { kind: "ZONE", ...zone("DEEP_HALF", "RH") },
    // The Tampa: the middle backer runs the seam. `SEAM_RUNNER` is the narrowest,
    // tallest region in the vocabulary — one lane, from the short band to the deep —
    // which is the shape of that job and of no other job on any card.
    LB_M: { kind: "ZONE", ...zone("SEAM_RUNNER", "C"), runFit: { gap: "B", side: "RIGHT" } },
    LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "LEFT" } },
    CB_N: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
  },
  usage: { weight: 2 },
});

export const NICKEL_QUARTERS = defensiveCard({
  id: "DEF_NICKEL_QUARTERS",
  name: "Quarters",
  personnel: "NICKEL",
  front: "Nickel Over",
  shellIntent: "MATCH_ZONE",
  family: "QUARTERS",
  duties: {
    ...FOUR_MAN_RUSH,
    // Four quarters over three under. Each quarter is ONE lane and reaches down into
    // the intermediate band — the quarters safety is a run/pass conflict player who
    // drives on the dig, and that is the whole shell. Four lanes are spoken for and
    // the centre lane is not, which is why the answer to quarters is the seam.
    CB_L: { kind: "ZONE", ...zone("DEEP_QUARTER", "LW") },
    CB_R: { kind: "ZONE", ...zone("DEEP_QUARTER", "RW") },
    S_F: { kind: "ZONE", ...zone("DEEP_QUARTER", "LH") },
    S_S: { kind: "ZONE", ...zone("DEEP_QUARTER", "RH") },
    LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "B", side: "RIGHT" } },
    CB_N: { kind: "ZONE", ...zone("CURL_FLAT", "RH"), runFit: { gap: "D", side: "RIGHT" } },
  },
  usage: { weight: 11 },
});

export const NICKEL_COVER_6 = defensiveCard({
  id: "DEF_NICKEL_COVER_6",
  name: "Cover 6",
  personnel: "NICKEL",
  front: "Nickel Over",
  shellIntent: "MATCH_ZONE",
  family: "COVER_6",
  duties: {
    ...FOUR_MAN_RUSH,
    // Quarters to the left, Cover 2 to the right. Two shells on one snap is exactly
    // what a per-assignment coverage vocabulary buys and a single enum could not say.
    CB_L: { kind: "ZONE", ...zone("DEEP_QUARTER", "LW") },
    S_F: { kind: "ZONE", ...zone("DEEP_QUARTER", "LH") },
    CB_R: { kind: "ZONE", ...zone("FLAT", "RW"), runFit: { gap: "D", side: "RIGHT" } },
    S_S: { kind: "ZONE", ...zone("DEEP_HALF", "RH") },
    LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "B", side: "RIGHT" } },
    CB_N: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
  },
  usage: { weight: 8 },
});

// --- nickel: man shells -----------------------------------------------------

export const NICKEL_COVER_1 = defensiveCard({
  id: "DEF_NICKEL_COVER_1",
  name: "Cover 1 Man Free",
  personnel: "NICKEL",
  front: "Nickel Over",
  shellIntent: "MAN_FREE",
  family: "COVER_1",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    LB_W: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
      runFit: { gap: "B", side: "LEFT" },
    },
    LB_M: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C") },
      runFit: { gap: "B", side: "RIGHT" },
    },
    // Against trips he has #3; against 2x2 there is no #3 and he becomes the robber.
    // That branch is the entire reason `ifAbsent` is a required field.
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 3 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOLE", "C") },
      runFit: { gap: "D", side: "LEFT" },
    },
    S_F: { kind: "ZONE", ...zone("POST", "C") },
  },
  usage: { weight: 6 },
});

export const NICKEL_COVER_1_RAT = defensiveCard({
  id: "DEF_NICKEL_COVER_1_RAT",
  name: "Cover 1 Rat",
  personnel: "NICKEL",
  front: "Nickel Even",
  shellIntent: "MAN_FREE",
  family: "COVER_1",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOLE", "LH") },
      runFit: { gap: "D", side: "LEFT" },
    },
    LB_W: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
      runFit: { gap: "B", side: "LEFT" },
    },
    /** The rat in the hole: a zone player inside an otherwise man call. */
    LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "B", side: "RIGHT" } },
    S_F: { kind: "ZONE", ...zone("POST", "C") },
  },
  usage: { weight: 3 },
});

export const NICKEL_COVER_2_MAN = defensiveCard({
  id: "DEF_NICKEL_COVER_2_MAN",
  name: "Cover 2 Man",
  personnel: "NICKEL",
  front: "Nickel Even",
  shellIntent: "MIXED",
  family: "COVER_2_MAN",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("FLAT", "LW") },
      runFit: { gap: "D", side: "LEFT" },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("FLAT", "RW") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
    },
    LB_W: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
      runFit: { gap: "B", side: "LEFT" },
    },
    LB_M: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C") },
      runFit: { gap: "B", side: "RIGHT" },
    },
    S_F: { kind: "ZONE", ...zone("DEEP_HALF", "LH") },
    S_S: { kind: "ZONE", ...zone("DEEP_HALF", "RH") },
  },
  usage: { weight: 5 },
});

// --- nickel: pressure -------------------------------------------------------

export const NICKEL_FIRE_ZONE = defensiveCard({
  id: "DEF_NICKEL_FIRE_ZONE",
  name: "Fire Zone",
  personnel: "NICKEL",
  front: "Nickel Over",
  shellIntent: "SPOT_ZONE",
  family: "FIRE_ZONE",
  duties: {
    DE_L: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "C", side: "LEFT" },
    DT_L: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "LEFT" },
    DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
    LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
    LB_M: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "B", side: "RIGHT" },
    /** The dropping lineman — the thing a per-assignment vocabulary can express. */
    DE_R: { kind: "ZONE", ...zone("CURL_FLAT", "RW"), runFit: { gap: "C", side: "RIGHT" } },
    CB_L: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
    CB_R: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
    S_F: { kind: "ZONE", ...zone("DEEP_MIDDLE_THIRD", "C") },
    // Three under, and none of them is a flat player anchored behind the line: a
    // five-man pressure buys its rush by giving up the checkdown. The shapes say so
    // without a tunable — nobody on this card reaches the BACKFIELD band except the
    // one hook defender whose window happens to start there.
    CB_N: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "D", side: "RIGHT" } },
    S_S: { kind: "ZONE", ...zone("CURL_FLAT", "LH"), runFit: { gap: "D", side: "LEFT" } },
  },
  usage: { weight: 7 },
});

export const NICKEL_DOUBLE_A_BLITZ = defensiveCard({
  id: "DEF_NICKEL_DOUBLE_A_BLITZ",
  name: "Double A Blitz",
  personnel: "NICKEL",
  front: "Nickel Mug",
  shellIntent: "MAN_FREE",
  family: "COVER_1",
  duties: {
    DE_L: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "C", side: "LEFT" },
    DE_R: { kind: "RUSH", move: "FINESSE", alignment: "EDGE", gap: "C", side: "RIGHT" },
    DT_L: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "B", side: "LEFT" },
    DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "B", side: "RIGHT" },
    LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "A", side: "LEFT" },
    LB_M: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
      runFit: { gap: "D", side: "LEFT" },
    },
    S_F: { kind: "ZONE", ...zone("POST", "C") },
  },
  usage: { weight: 4 },
});

export const NICKEL_COVER_0_BLITZ = defensiveCard({
  id: "DEF_NICKEL_COVER_0_BLITZ",
  name: "Cover 0 Blitz",
  personnel: "NICKEL",
  front: "Nickel Mug",
  shellIntent: "MAN_ZERO",
  family: "COVER_0",
  noDeepHelp: true,
  duties: {
    ...FOUR_MAN_RUSH,
    LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
    LB_M: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "RIGHT" },
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("FLAT", "LW") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("FLAT", "RW") },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
      runFit: { gap: "D", side: "LEFT" },
    },
    S_F: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOLE", "C") },
    },
  },
  usage: { weight: 3, downs: [2, 3, 4] },
});

// --- base -------------------------------------------------------------------

export const BASE_COVER_3 = defensiveCard({
  id: "DEF_BASE_COVER_3",
  name: "Base Cover 3",
  personnel: "BASE",
  front: "4-3 Over",
  shellIntent: "SPOT_ZONE",
  family: "COVER_3",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_L: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
    CB_R: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
    S_F: { kind: "ZONE", ...zone("DEEP_MIDDLE_THIRD", "C") },
    S_S: { kind: "ZONE", ...zone("FLAT", "LW"), runFit: { gap: "D", side: "LEFT" } },
    // The SAM gets a curl/flat rather than the flat itself — a linebacker widening
    // from the box does not get out to the numbers the way a rolled-down safety does.
    LB_S: { kind: "ZONE", ...zone("CURL_FLAT", "RW"), runFit: { gap: "D", side: "RIGHT" } },
    LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "B", side: "RIGHT" } },
  },
  usage: { weight: 4 },
});

export const BASE_COVER_1 = defensiveCard({
  id: "DEF_BASE_COVER_1",
  name: "Base Cover 1",
  personnel: "BASE",
  front: "4-3 Under",
  shellIntent: "MAN_FREE",
  family: "COVER_1",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
    },
    LB_S: {
      kind: "MAN",
      target: { kind: "TIGHT_END", index: 0 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    LB_W: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
      runFit: { gap: "B", side: "LEFT" },
    },
    LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "B", side: "RIGHT" } },
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOLE", "C") },
      runFit: { gap: "D", side: "LEFT" },
    },
    S_F: { kind: "ZONE", ...zone("POST", "C") },
  },
  usage: { weight: 2 },
});

export const BASE_COVER_2 = defensiveCard({
  id: "DEF_BASE_COVER_2",
  name: "Base Cover 2",
  personnel: "BASE",
  front: "4-3 Over",
  shellIntent: "SPOT_ZONE",
  family: "COVER_2",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_L: { kind: "ZONE", ...zone("FLAT", "LW"), runFit: { gap: "D", side: "LEFT" } },
    CB_R: { kind: "ZONE", ...zone("FLAT", "RW"), runFit: { gap: "D", side: "RIGHT" } },
    S_F: { kind: "ZONE", ...zone("DEEP_HALF", "LH") },
    S_S: { kind: "ZONE", ...zone("DEEP_HALF", "RH") },
    LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "B", side: "RIGHT" } },
    LB_S: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
  },
  usage: { weight: 2 },
});

export const BASE_RUN_BLITZ = defensiveCard({
  id: "DEF_BASE_RUN_BLITZ",
  name: "Base Run Blitz",
  personnel: "BASE",
  front: "4-3 Bear",
  shellIntent: "MAN_FREE",
  family: "COVER_1",
  duties: {
    ...FOUR_MAN_RUSH,
    LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
    LB_S: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "D", side: "RIGHT" },
    LB_M: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C") },
      runFit: { gap: "B", side: "RIGHT" },
    },
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("FLAT", "LW") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("FLAT", "RW") },
    },
    S_S: {
      kind: "MAN",
      target: { kind: "TIGHT_END", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
      runFit: { gap: "D", side: "LEFT" },
    },
    S_F: { kind: "ZONE", ...zone("POST", "C") },
  },
  usage: { weight: 2, maxDistance: 6 },
});

// --- dime -------------------------------------------------------------------

export const DIME_QUARTERS = defensiveCard({
  id: "DEF_DIME_QUARTERS",
  name: "Dime Quarters",
  personnel: "DIME",
  front: "Dime Even",
  shellIntent: "MATCH_ZONE",
  family: "QUARTERS",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_L: { kind: "ZONE", ...zone("DEEP_QUARTER", "LW") },
    CB_R: { kind: "ZONE", ...zone("DEEP_QUARTER", "RW") },
    S_F: { kind: "ZONE", ...zone("DEEP_QUARTER", "LH") },
    S_S: { kind: "ZONE", ...zone("DEEP_QUARTER", "RH"), runFit: { gap: "B", side: "LEFT" } },
    CB_N: { kind: "ZONE", ...zone("CURL_FLAT", "RH"), runFit: { gap: "D", side: "RIGHT" } },
    CB_D: { kind: "ZONE", ...zone("CURL_FLAT", "LH"), runFit: { gap: "D", side: "LEFT" } },
    LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "B", side: "RIGHT" } },
  },
  usage: { weight: 5, minDistance: 7 },
});

export const DIME_MAN_BLITZ = defensiveCard({
  id: "DEF_DIME_MAN_BLITZ",
  name: "Dime Man Pressure",
  personnel: "DIME",
  front: "Dime Mug",
  shellIntent: "MAN_FREE",
  family: "COVER_1",
  duties: {
    ...FOUR_MAN_RUSH,
    CB_D: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "D", side: "LEFT" },
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    LB_M: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C") },
      runFit: { gap: "B", side: "RIGHT" },
    },
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
      runFit: { gap: "B", side: "LEFT" },
    },
    S_F: { kind: "ZONE", ...zone("POST", "C") },
  },
  usage: { weight: 3, minDistance: 7 },
});

/**
 * Three-man rush, eight in coverage. The ONLY card in the corpus that does not
 * account for every interior gap, which is why `shellIntent: "PREVENT"` exists —
 * the validator exempts it explicitly rather than the rule quietly having a hole.
 */
export const DIME_PREVENT = defensiveCard({
  id: "DEF_DIME_PREVENT",
  name: "Prevent",
  personnel: "DIME",
  front: "Dime Prevent",
  shellIntent: "PREVENT",
  family: "PREVENT",
  duties: {
    DE_L: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "C", side: "LEFT" },
    DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
    DE_R: { kind: "RUSH", move: "FINESSE", alignment: "EDGE", gap: "C", side: "RIGHT" },
    DT_L: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "A", side: "LEFT" } },
    // Five deep, and `PREVENT_DEEP` is the one responsibility in the vocabulary with
    // no downward reach at all: a prevent defender will not come up for anything.
    // Everything in front of them is open by construction, which is what prevent IS.
    CB_L: { kind: "ZONE", ...zone("PREVENT_DEEP", "LW") },
    CB_R: { kind: "ZONE", ...zone("PREVENT_DEEP", "RW") },
    S_F: { kind: "ZONE", ...zone("PREVENT_DEEP", "C") },
    S_S: { kind: "ZONE", ...zone("PREVENT_DEEP", "LH") },
    CB_N: { kind: "ZONE", ...zone("PREVENT_DEEP", "RH") },
    CB_D: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
    LB_M: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "RIGHT" } },
  },
  usage: { weight: 1, minDistance: 15 },
});

// --- goal line --------------------------------------------------------------

const GOAL_LINE_FRONT: Record<"DE_L" | "DT_L" | "NT" | "DT_R" | "DE_R", DefensiveDuty> = {
  DE_L: { kind: "RUSH", move: "POWER", alignment: "EDGE", gap: "C", side: "LEFT" },
  DT_L: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "B", side: "LEFT" },
  NT: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "LEFT" },
  DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
  DE_R: { kind: "RUSH", move: "POWER", alignment: "EDGE", gap: "C", side: "RIGHT" },
};

export const GOAL_LINE_MAN = defensiveCard({
  id: "DEF_GOAL_LINE_MAN",
  name: "Goal Line Man",
  personnel: "GOAL_LINE",
  front: "5-3 Goal Line",
  shellIntent: "MAN_ZERO",
  family: "GOAL_LINE",
  noDeepHelp: true,
  duties: {
    ...GOAL_LINE_FRONT,
    LB_W: {
      kind: "MAN",
      target: { kind: "TIGHT_END", index: 0 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
      runFit: { gap: "B", side: "RIGHT" },
    },
    LB_M: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C") },
      runFit: { gap: "D", side: "LEFT" },
    },
    LB_S: {
      kind: "MAN",
      target: { kind: "TIGHT_END", index: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("FLAT", "LW") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", ...zone("FLAT", "RW") },
    },
    S_S: { kind: "ZONE", ...zone("HOLE", "C") },
  },
  usage: { weight: 3, regions: ["GOAL_LINE"] },
});

export const GOAL_LINE_ZONE = defensiveCard({
  id: "DEF_GOAL_LINE_ZONE",
  name: "Goal Line Zone",
  personnel: "GOAL_LINE",
  front: "5-3 Goal Line",
  shellIntent: "SPOT_ZONE",
  family: "GOAL_LINE",
  noDeepHelp: true,
  duties: {
    ...GOAL_LINE_FRONT,
    LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "RIGHT" } },
    LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "D", side: "LEFT" } },
    LB_S: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "D", side: "RIGHT" } },
    CB_L: { kind: "ZONE", ...zone("FLAT", "LW") },
    CB_R: { kind: "ZONE", ...zone("FLAT", "RW") },
    // No deep zone at the goal line because the end line is the deep zone. The hole
    // player at the intermediate band is as far back as this defence goes.
    S_S: { kind: "ZONE", ...zone("HOLE", "C") },
  },
  usage: { weight: 2, regions: ["GOAL_LINE"] },
});

export const DEFENSIVE_CARDS: readonly AnyDefensiveCard[] = [
  NICKEL_COVER_3_SKY,
  NICKEL_COVER_3_BUZZ,
  NICKEL_COVER_3_PRESSURE,
  NICKEL_COVER_2,
  NICKEL_TAMPA_2,
  NICKEL_QUARTERS,
  NICKEL_COVER_6,
  NICKEL_COVER_1,
  NICKEL_COVER_1_RAT,
  NICKEL_COVER_2_MAN,
  NICKEL_FIRE_ZONE,
  NICKEL_DOUBLE_A_BLITZ,
  NICKEL_COVER_0_BLITZ,
  BASE_COVER_3,
  BASE_COVER_1,
  BASE_COVER_2,
  BASE_RUN_BLITZ,
  DIME_QUARTERS,
  DIME_MAN_BLITZ,
  DIME_PREVENT,
  GOAL_LINE_MAN,
  GOAL_LINE_ZONE,
];
