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
 * ZONE PLACEMENT IS DELIBERATE, NOT DECORATIVE. `zoneDefenderFor` in the engine
 * matches a route's break cell to a zone defender's cell EXACTLY, so a defender is
 * only worth something where routes actually go. The cells used here — SHORT and
 * INTERMEDIATE across all five lanes, DEEP in the wide and centre lanes — are the
 * cells the pass corpus breaks into. `test/corpus.test.ts` measures the resulting
 * coverage rate rather than assuming it, which is the first time anything in this
 * project has been able to say what fraction of routes a zone actually reaches.
 *
 * WEIGHTS. Shaped to reproduce `COVERAGE_SHELL_USAGE` and `BLITZ_RATE_PRIOR`, and
 * `test/distribution.test.ts` asserts they do. Read `distribution.ts` first for how
 * much those priors are worth.
 */
import type { FieldZone, HorizontalZone, VerticalZone } from "@ff/contracts";
import type { AnyDefensiveCard, DefensiveDuty } from "./defense.js";
import { defensiveCard } from "./defense.js";

function z(horizontal: HorizontalZone, vertical: VerticalZone): FieldZone {
  return { horizontal, vertical };
}

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
    CB_L: { kind: "ZONE", zone: z("LW", "DEEP") },
    CB_R: { kind: "ZONE", zone: z("RW", "DEEP") },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
    // Sky = safety force. He rolls to the flat and owns the edge in the run fit.
    S_S: { kind: "ZONE", zone: z("LW", "SHORT"), runFit: { gap: "D", side: "LEFT" } },
    CB_N: { kind: "ZONE", zone: z("RW", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
    LB_W: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", zone: z("RH", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
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
    CB_L: { kind: "ZONE", zone: z("LW", "DEEP") },
    CB_R: { kind: "ZONE", zone: z("RW", "DEEP") },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
    // The buzz: the strong safety drops to the middle hook rather than the flat,
    // which is the cell Cover 3 Sky leaves open.
    S_S: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "D", side: "LEFT" } },
    CB_N: { kind: "ZONE", zone: z("RW", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
    LB_W: { kind: "ZONE", zone: z("LW", "SHORT"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", zone: z("RH", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
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
    CB_L: { kind: "ZONE", zone: z("LW", "DEEP") },
    CB_R: { kind: "ZONE", zone: z("RW", "DEEP") },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
    S_S: { kind: "ZONE", zone: z("RW", "SHORT"), runFit: { gap: "D", side: "LEFT" } },
    LB_W: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
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
    CB_L: { kind: "ZONE", zone: z("LW", "SHORT"), runFit: { gap: "D", side: "LEFT" } },
    CB_R: { kind: "ZONE", zone: z("RW", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
    S_F: { kind: "ZONE", zone: z("LH", "DEEP") },
    S_S: { kind: "ZONE", zone: z("RH", "DEEP") },
    LB_W: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
    CB_N: { kind: "ZONE", zone: z("RH", "SHORT") },
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
    CB_L: { kind: "ZONE", zone: z("LW", "SHORT"), runFit: { gap: "D", side: "LEFT" } },
    CB_R: { kind: "ZONE", zone: z("RW", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
    S_F: { kind: "ZONE", zone: z("LH", "DEEP") },
    S_S: { kind: "ZONE", zone: z("RH", "DEEP") },
    // The Tampa: the middle backer carries the seam, closing Cover 2's hole and
    // opening the middle underneath in exchange.
    LB_M: { kind: "ZONE", zone: z("C", "DEEP"), runFit: { gap: "B", side: "RIGHT" } },
    LB_W: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "B", side: "LEFT" } },
    CB_N: { kind: "ZONE", zone: z("RH", "SHORT") },
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
    CB_L: { kind: "ZONE", zone: z("LW", "DEEP") },
    CB_R: { kind: "ZONE", zone: z("RW", "DEEP") },
    S_F: { kind: "ZONE", zone: z("LH", "DEEP") },
    S_S: { kind: "ZONE", zone: z("RH", "DEEP") },
    LB_W: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
    CB_N: { kind: "ZONE", zone: z("RH", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
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
    CB_L: { kind: "ZONE", zone: z("LW", "DEEP") },
    S_F: { kind: "ZONE", zone: z("LH", "DEEP") },
    CB_R: { kind: "ZONE", zone: z("RW", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
    S_S: { kind: "ZONE", zone: z("RH", "DEEP") },
    LB_W: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
    CB_N: { kind: "ZONE", zone: z("RH", "SHORT") },
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
      ifAbsent: { kind: "ZONE", zone: z("LW", "DEEP") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RW", "DEEP") },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("RH", "SHORT") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    LB_W: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("LH", "SHORT") },
      runFit: { gap: "B", side: "LEFT" },
    },
    LB_M: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("C", "SHORT") },
      runFit: { gap: "B", side: "RIGHT" },
    },
    // Against trips he has #3; against 2x2 there is no #3 and he becomes the robber.
    // That branch is the entire reason `ifAbsent` is a required field.
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 3 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("C", "INTERMEDIATE") },
      runFit: { gap: "D", side: "LEFT" },
    },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
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
      ifAbsent: { kind: "ZONE", zone: z("LW", "DEEP") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RW", "DEEP") },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RH", "SHORT") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("LH", "INTERMEDIATE") },
      runFit: { gap: "D", side: "LEFT" },
    },
    LB_W: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("LH", "SHORT") },
      runFit: { gap: "B", side: "LEFT" },
    },
    /** The rat in the hole: a zone player inside an otherwise man call. */
    LB_M: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
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
      ifAbsent: { kind: "ZONE", zone: z("LW", "SHORT") },
      runFit: { gap: "D", side: "LEFT" },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RW", "SHORT") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("RH", "SHORT") },
    },
    LB_W: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("LH", "SHORT") },
      runFit: { gap: "B", side: "LEFT" },
    },
    LB_M: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("C", "SHORT") },
      runFit: { gap: "B", side: "RIGHT" },
    },
    S_F: { kind: "ZONE", zone: z("LH", "DEEP") },
    S_S: { kind: "ZONE", zone: z("RH", "DEEP") },
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
    DE_R: { kind: "ZONE", zone: z("RW", "SHORT"), runFit: { gap: "C", side: "RIGHT" } },
    CB_L: { kind: "ZONE", zone: z("LW", "DEEP") },
    CB_R: { kind: "ZONE", zone: z("RW", "DEEP") },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
    CB_N: { kind: "ZONE", zone: z("RH", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
    S_S: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "D", side: "LEFT" } },
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
      ifAbsent: { kind: "ZONE", zone: z("LW", "DEEP") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RW", "DEEP") },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("RH", "SHORT") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("LH", "SHORT") },
      runFit: { gap: "D", side: "LEFT" },
    },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
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
      ifAbsent: { kind: "ZONE", zone: z("LW", "SHORT") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RW", "SHORT") },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RH", "SHORT") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("LH", "SHORT") },
      runFit: { gap: "D", side: "LEFT" },
    },
    S_F: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("C", "INTERMEDIATE") },
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
    CB_L: { kind: "ZONE", zone: z("LW", "DEEP") },
    CB_R: { kind: "ZONE", zone: z("RW", "DEEP") },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
    S_S: { kind: "ZONE", zone: z("LW", "SHORT"), runFit: { gap: "D", side: "LEFT" } },
    LB_S: { kind: "ZONE", zone: z("RW", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
    LB_W: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", zone: z("RH", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
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
      ifAbsent: { kind: "ZONE", zone: z("LW", "DEEP") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RW", "DEEP") },
    },
    LB_S: {
      kind: "MAN",
      target: { kind: "TIGHT_END", index: 0 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RH", "SHORT") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    LB_W: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("LH", "SHORT") },
      runFit: { gap: "B", side: "LEFT" },
    },
    LB_M: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("C", "INTERMEDIATE") },
      runFit: { gap: "D", side: "LEFT" },
    },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
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
    CB_L: { kind: "ZONE", zone: z("LW", "SHORT"), runFit: { gap: "D", side: "LEFT" } },
    CB_R: { kind: "ZONE", zone: z("RW", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
    S_F: { kind: "ZONE", zone: z("LH", "DEEP") },
    S_S: { kind: "ZONE", zone: z("RH", "DEEP") },
    LB_W: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "B", side: "LEFT" } },
    LB_M: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
    LB_S: { kind: "ZONE", zone: z("RH", "SHORT") },
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
      ifAbsent: { kind: "ZONE", zone: z("C", "SHORT") },
      runFit: { gap: "B", side: "RIGHT" },
    },
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("LW", "SHORT") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RW", "SHORT") },
    },
    S_S: {
      kind: "MAN",
      target: { kind: "TIGHT_END", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("RH", "SHORT") },
      runFit: { gap: "D", side: "LEFT" },
    },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
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
    CB_L: { kind: "ZONE", zone: z("LW", "DEEP") },
    CB_R: { kind: "ZONE", zone: z("RW", "DEEP") },
    S_F: { kind: "ZONE", zone: z("LH", "DEEP") },
    S_S: { kind: "ZONE", zone: z("RH", "DEEP"), runFit: { gap: "B", side: "LEFT" } },
    CB_N: { kind: "ZONE", zone: z("RH", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
    CB_D: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "D", side: "LEFT" } },
    LB_M: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
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
      ifAbsent: { kind: "ZONE", zone: z("LW", "DEEP") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RW", "DEEP") },
    },
    CB_N: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("RH", "SHORT") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    LB_M: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("C", "SHORT") },
      runFit: { gap: "B", side: "RIGHT" },
    },
    S_S: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 2 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", zone: z("LH", "SHORT") },
      runFit: { gap: "B", side: "LEFT" },
    },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
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
    DT_L: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "A", side: "LEFT" } },
    CB_L: { kind: "ZONE", zone: z("LW", "DEEP") },
    CB_R: { kind: "ZONE", zone: z("RW", "DEEP") },
    S_F: { kind: "ZONE", zone: z("C", "DEEP") },
    S_S: { kind: "ZONE", zone: z("LH", "DEEP") },
    CB_N: { kind: "ZONE", zone: z("RH", "DEEP") },
    CB_D: { kind: "ZONE", zone: z("RH", "SHORT") },
    LB_M: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
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
      ifAbsent: { kind: "ZONE", zone: z("RH", "SHORT") },
      runFit: { gap: "B", side: "RIGHT" },
    },
    LB_M: {
      kind: "MAN",
      target: { kind: "BACK", index: 0 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("C", "SHORT") },
      runFit: { gap: "D", side: "LEFT" },
    },
    LB_S: {
      kind: "MAN",
      target: { kind: "TIGHT_END", index: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("LH", "SHORT") },
      runFit: { gap: "D", side: "RIGHT" },
    },
    CB_L: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "LEFT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("LW", "SHORT") },
    },
    CB_R: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 1 },
      technique: "PRESS",
      ifAbsent: { kind: "ZONE", zone: z("RW", "SHORT") },
    },
    S_S: { kind: "ZONE", zone: z("C", "INTERMEDIATE") },
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
    LB_W: { kind: "ZONE", zone: z("LH", "SHORT"), runFit: { gap: "B", side: "RIGHT" } },
    LB_M: { kind: "ZONE", zone: z("C", "SHORT"), runFit: { gap: "D", side: "LEFT" } },
    LB_S: { kind: "ZONE", zone: z("RH", "SHORT"), runFit: { gap: "D", side: "RIGHT" } },
    CB_L: { kind: "ZONE", zone: z("LW", "SHORT") },
    CB_R: { kind: "ZONE", zone: z("RW", "SHORT") },
    S_S: { kind: "ZONE", zone: z("C", "INTERMEDIATE") },
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
