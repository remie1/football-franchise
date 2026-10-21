/**
 * THE v6 COVERAGE CATALOGUE — ADR-073 §2.6, ADR-071 step 3.
 *
 * Caller v6 draws a call in parts: the coverage, then the pressure laid over it, then the line
 * game. This module states the parts and composes them. It draws nothing (`pressureDraw.ts`
 * throws the dice) and nothing on caller v1–v5's path calls it: those callers draw
 * `DEFENSIVE_CARDS`, which this module reads and never edits.
 *
 * ================== WHY IT IS NOT IN `defensiveCards.ts` ==================
 *
 * `test/shownAssignments.test.ts` enumerates every card-shaped export of `defensiveCards.ts` and
 * fails on one missing from `DEFENSIVE_CARDS`, and ADR-073 does not append to that array
 * mid-version (§7; §3.4 pins its 22 cards and their order, `test/corpus.test.ts`). So
 * `DIME_COVER_1`, and every composed call, live here, and `test/coverageCatalogueCorpus.test.ts`
 * carries this module's own copies of the corpus-wide checks.
 *
 * ================== WHAT A COMPOSED CALL IS ==================
 *
 * **A coverage** (`V6_COVERAGES`): the book's cards less the five pressure cards that decompose,
 * plus `DIME_COVER_1`. Cover 0 Blitz stays a bound entry: Zero moves the deep shell by
 * definition, which no other pressure may (R25's exception).
 *
 * **A pressure laid over it** (`PRESSURE_SPECS`, `CREEPER_SPECS`): only the men it moves, its
 * word, its disguise row, and the call-level keys on which the shipped card differs from its host,
 * so the call is said as ADR-071 §5 says it. The five reproductions carry the shipped card's id,
 * name and usage (its weight and its limits), so v5 and v6 tally a call by the same key.
 *
 * **A line game** (`LINE_GAMES`): the corpus's five patterns, stated on line roles. A call keeps
 * its own stunts when lines are BOUND (a reproduction keeps `boundStunts`), wears none when the
 * draw says NONE, and otherwise wears exactly one legal pattern (`legalLineGames`).
 *
 * `composeCall` returns an ordinary card, so `selectLooks`, `applyLooks` and `instantiateDefense`
 * take a composed call unchanged (ADR-073 §2.6 step 4). `COMPOSED` holds every reachable
 * composition, built once when the module loads and checked by its tests, so a caller looks a
 * call up and validates nothing per snap.
 */
import type { BlitzDisguise } from "@ff/contracts";
import { zone } from "./coverage.js";
import type { AnyDefensiveCard, CoverageFamily, DefensiveDuty, StuntSpec } from "./defense.js";
import { defensiveCard, dutyList, rusherCount } from "./defense.js";
import {
  BASE_COVER_1,
  BASE_COVER_3,
  DEFENSIVE_CARDS,
  DIME_QUARTERS,
  NICKEL_COVER_1,
  NICKEL_COVER_3_BUZZ,
  NICKEL_COVER_3_SKY,
} from "./defensiveCards.js";
import type { SituationalUsage } from "./distribution.js";
import { PlaybookError } from "./errors.js";
import type { DefenseLineRole, DefenseRole } from "./roles.js";
import type { PressureTagId } from "./tags.js";
import { errorsOnly, validateDefensiveCard } from "./validate.js";

const DEFENSE_LINE_ROLES: readonly DefenseLineRole[] = ["DE_L", "DT_L", "NT", "DT_R", "DE_R"];

const isLineRole = (role: DefenseRole): boolean => (DEFENSE_LINE_ROLES as readonly string[]).includes(role);

// --- the bare call the book never needed --------------------------------------------------------

/**
 * DIME COVER 1 — the coverage Dime Man Pressure is laid over (ADR-073 §3.4; ADR-071 §5 notes the
 * book has no dime Cover 1 to compare it against).
 *
 * Dime Man Pressure's duties with the dime back in coverage instead of off the edge. He takes the
 * job Nickel Cover 1 gives its spare man: #3 to the right, and with no #3 he is the robber in the
 * hole. His run fit is the D gap he rushed through. Its front is Dime Quarters' Even.
 *
 * **Weight 0** (ADR-073 §2.6): its draw weight is Dime Smoke's, so v6 calls it bare exactly when
 * the blitz die over it says no, and never draws it for itself.
 */
export const DIME_COVER_1 = defensiveCard({
  id: "DEF_DIME_COVER_1",
  name: "Dime Cover 1",
  personnel: "DIME",
  front: "Even",
  concept: "Cover 1",
  shellIntent: "MAN_FREE",
  family: "COVER_1",
  duties: {
    DE_L: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "C", side: "LEFT" },
    DT_L: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "LEFT" },
    DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
    DE_R: { kind: "RUSH", move: "FINESSE", alignment: "EDGE", gap: "C", side: "RIGHT" },
    CB_D: {
      kind: "MAN",
      target: { kind: "NUMBER", side: "RIGHT", number: 3 },
      technique: "OFF",
      ifAbsent: { kind: "ZONE", ...zone("HOLE", "C") },
      runFit: { gap: "D", side: "LEFT" },
    },
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
  usage: { weight: 0, minDistance: 7 },
});

// --- the pressures, each laid over one coverage ---------------------------------------------------

/**
 * A pressure laid over one coverage (ADR-071 step 3; ADR-073 §2.6).
 *
 * It states only what it changes. `duties` are the moved men's played duties; every other man
 * plays the host's. `front`, `concept` and `family` are stated only where the shipped call is said
 * differently from its host (ADR-071 §5).
 *
 * `moved` is the set R25 checks a line game against (ADR-073 §2.6 step 3): the roles whose played
 * duty differs from the host's, plus every man off the line who rushes. It is stated, and the
 * tests derive it from the composed call and hold the two equal.
 */
export interface HostedPressure {
  readonly id: string;
  /** The host coverage's id, in `V6_COVERAGES`. */
  readonly over: string;
  readonly pressure: PressureTagId;
  readonly duties: Readonly<Partial<Record<DefenseRole, DefensiveDuty>>>;
  readonly blitzDisguise: BlitzDisguise;
  readonly front?: string;
  readonly concept?: string;
  readonly family?: CoverageFamily;
  /** The shipped card's label, on a reproduction. Absent ⇒ the host's. */
  readonly name?: string;
  /** The shipped card's weight and limits, on a reproduction. Absent ⇒ the host's. */
  readonly usage?: SituationalUsage;
  /** The line game the shipped card states, played when lines are BOUND. */
  readonly boundStunts?: readonly StuntSpec[];
  readonly moved: readonly DefenseRole[];
}

/**
 * One of the five pressure cards that decompose, as a pressure over its coverage. Its id, name and
 * usage are the shipped card's, so the composition IS that card: `test/coverageCatalogue.test.ts`
 * holds each to it key for key and on every formation.
 */
export interface PressureSpec extends HostedPressure {
  readonly name: string;
  readonly usage: SituationalUsage;
}

/** The creeper over one four-man Cover 3 call: drawn at its own rate, never by a weight. */
export interface CreeperSpec extends HostedPressure {
  readonly pressure: "CREEPER";
  readonly blitzDisguise: "ZONE_BLITZ";
}

/**
 * THE FIVE PRESSURE CARDS THAT DECOMPOSE (ADR-073 §3.4), in the book's order: Smoke and Fire over
 * Cover 3 Sky, Double A over Cover 1, Fire over Base Cover 1 (Base Run Blitz) and Smoke over Dime
 * Cover 1 (Dime Man Pressure).
 *
 * **Base Run Blitz's corners are the coverage's.** The shipped card drops each corner's fallback
 * to the flat; the spec leaves both corners to Base Cover 1, whose fallback is the deep third,
 * because a pressure never moves the deep shell (R25; ADR-073 §3.4, settled). The case is
 * unreachable on the book's formations, which all have a #1 to each side (ADR-071:457-458), and
 * the tests instantiate both on every formation to show it.
 */
export const PRESSURE_SPECS: readonly PressureSpec[] = [
  {
    id: "DEF_NICKEL_COVER_3_PRESSURE",
    name: "Cover 3 Nickel Pressure",
    over: NICKEL_COVER_3_SKY.id,
    pressure: "SMOKE",
    duties: {
      CB_N: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "D", side: "RIGHT" },
      LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C"), runFit: { gap: "B", side: "RIGHT" } },
    },
    blitzDisguise: "STANDARD",
    usage: { weight: 7 },
    moved: ["LB_M", "CB_N"],
  },
  {
    id: "DEF_NICKEL_FIRE_ZONE",
    name: "Fire Zone",
    over: NICKEL_COVER_3_SKY.id,
    pressure: "FIRE",
    // Said "Nickel Over Tex, Fire, Cover 3": the concept and the family are Fire Zone's own.
    concept: "Cover 3",
    family: "FIRE_ZONE",
    duties: {
      LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
      LB_M: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "B", side: "RIGHT" },
      DE_R: { kind: "ZONE", ...zone("CURL_FLAT", "RW"), runFit: { gap: "C", side: "RIGHT" } },
      CB_N: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "D", side: "RIGHT" } },
      S_S: { kind: "ZONE", ...zone("CURL_FLAT", "LH"), runFit: { gap: "D", side: "LEFT" } },
    },
    blitzDisguise: "ZONE_BLITZ",
    usage: { weight: 7 },
    boundStunts: [{ penetrator: "DT_L", looper: "DE_L", complexity: "T_E" }],
    moved: ["DE_R", "LB_W", "LB_M", "CB_N", "S_S"],
  },
  {
    id: "DEF_NICKEL_DOUBLE_A_BLITZ",
    name: "Double A Blitz",
    over: NICKEL_COVER_1.id,
    pressure: "DOUBLE_A",
    front: "Mug",
    duties: {
      DT_L: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "B", side: "LEFT" },
      DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "B", side: "RIGHT" },
      LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "A", side: "LEFT" },
      LB_M: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
      S_S: {
        kind: "MAN",
        target: { kind: "NUMBER", side: "LEFT", number: 2 },
        technique: "OFF",
        ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
        runFit: { gap: "D", side: "LEFT" },
      },
    },
    blitzDisguise: "STANDARD",
    usage: { weight: 4 },
    moved: ["DT_L", "DT_R", "LB_W", "LB_M", "S_S"],
  },
  {
    id: "DEF_BASE_RUN_BLITZ",
    name: "Base Run Blitz",
    over: BASE_COVER_1.id,
    pressure: "FIRE",
    front: "Bear",
    duties: {
      LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
      LB_S: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "D", side: "RIGHT" },
      LB_M: {
        kind: "MAN",
        target: { kind: "BACK", index: 0 },
        technique: "OFF",
        ifAbsent: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C") },
        runFit: { gap: "B", side: "RIGHT" },
      },
      S_S: {
        kind: "MAN",
        target: { kind: "TIGHT_END", index: 0 },
        technique: "OFF",
        ifAbsent: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
        runFit: { gap: "D", side: "LEFT" },
      },
    },
    blitzDisguise: "STANDARD",
    // The run blitz's limit rides the spec, as it rides the card (ADR-073 §2.6).
    usage: { weight: 2, maxDistance: 6 },
    moved: ["LB_W", "LB_M", "LB_S", "S_S"],
  },
  {
    id: "DEF_DIME_MAN_BLITZ",
    name: "Dime Man Pressure",
    over: DIME_COVER_1.id,
    pressure: "SMOKE",
    // Said "Dime Mug, Smoke, Cover 1"; the bare call is Even.
    front: "Mug",
    duties: {
      CB_D: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "D", side: "LEFT" },
    },
    blitzDisguise: "DELAYED",
    usage: { weight: 3, minDistance: 7 },
    moved: ["CB_D"],
  },
];

/**
 * THE CREEPER (ADR-073 §2.6; the owner's word, Decision 4): four rush, a backer among them, a
 * lineman drops, deep help kept — a pressure, not a blitz. Over the three four-man Cover 3 calls
 * (Decision 5's "the four-man Cover 3 calls"; Buzz and Base Cover 3 "state their creepers in the
 * same form", §2.6), each in §2.6's form:
 *
 *  - the Will rushes the left B gap;
 *  - the right end drops into the Mike's zone and fits the C gap he left (as Fire Zone's end);
 *  - the Mike takes the Will's zone and keeps his own fit.
 *
 * Over Buzz the Will's zone is the left curl/flat, so the same form slides the Mike across the
 * field from the right hook to it — chosen by the text's "same form", not by a football review,
 * and named to the owner as such.
 *
 * Each id is the host's with `+CREEPER`; the name and usage are the host's, because the creeper is
 * drawn at its own rate and has no weight.
 */
export const CREEPER_SPECS: readonly CreeperSpec[] = [
  {
    id: `${NICKEL_COVER_3_SKY.id}+CREEPER`,
    over: NICKEL_COVER_3_SKY.id,
    pressure: "CREEPER",
    duties: {
      LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
      DE_R: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "C", side: "RIGHT" } },
      LB_M: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "RIGHT" } },
    },
    blitzDisguise: "ZONE_BLITZ",
    moved: ["DE_R", "LB_W", "LB_M"],
  },
  {
    id: `${NICKEL_COVER_3_BUZZ.id}+CREEPER`,
    over: NICKEL_COVER_3_BUZZ.id,
    pressure: "CREEPER",
    duties: {
      LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
      DE_R: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "C", side: "RIGHT" } },
      LB_M: { kind: "ZONE", ...zone("CURL_FLAT", "LW"), runFit: { gap: "B", side: "RIGHT" } },
    },
    blitzDisguise: "ZONE_BLITZ",
    moved: ["DE_R", "LB_W", "LB_M"],
  },
  {
    id: `${BASE_COVER_3.id}+CREEPER`,
    over: BASE_COVER_3.id,
    pressure: "CREEPER",
    duties: {
      LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
      DE_R: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "C", side: "RIGHT" } },
      LB_M: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "RIGHT" } },
    },
    blitzDisguise: "ZONE_BLITZ",
    moved: ["DE_R", "LB_W", "LB_M"],
  },
];

// --- the coverages -------------------------------------------------------------------------------

const DECOMPOSED: ReadonlySet<string> = new Set(PRESSURE_SPECS.map((spec) => spec.id));

/**
 * v6's coverage catalogue: `DEFENSIVE_CARDS` without the five cards that decompose, in the book's
 * order, with `DIME_COVER_1` after Dime Quarters. Eighteen entries; Cover 0 Blitz is one of them.
 */
export const V6_COVERAGES: readonly AnyDefensiveCard[] = DEFENSIVE_CARDS.flatMap((card) => {
  if (DECOMPOSED.has(card.id)) return [];
  return card.id === DIME_QUARTERS.id ? [card, DIME_COVER_1] : [card];
});

/**
 * Each of the book's 22 cards to the coverage that hosts it in v6 (ADR-073 §3.4; ADR-071 §5's
 * second table): a decomposed card to the coverage its pressure is laid over, every other card to
 * itself. v6's coverage is the host of the card v5 would have drawn.
 */
export const HOST_OF: Readonly<Record<string, string>> = Object.fromEntries(
  DEFENSIVE_CARDS.map((card) => [card.id, PRESSURE_SPECS.find((spec) => spec.id === card.id)?.over ?? card.id]),
);

// --- the line games ------------------------------------------------------------------------------

export type LineGameId = "TEX_LEFT" | "TEX_RIGHT" | "TWIST" | "DELAY" | "TRIPLE";

/** One line game, on line roles. Its FRONT tag is derived from the stunts, as on any card. */
export interface LineGame {
  readonly id: LineGameId;
  readonly stunts: readonly StuntSpec[];
}

/**
 * The book's five line games, as the cards state them: the Tex to the left (Fire Zone, Base
 * Cover 3), the Tex to the right (Cover 6), the Twist (Dime Quarters), the Delay (Base Cover 2)
 * and the Triple chain (Tampa 2). Every grouping fields both ends and both tackles, the goal line
 * included.
 */
export const LINE_GAMES: readonly LineGame[] = [
  { id: "TEX_LEFT", stunts: [{ penetrator: "DT_L", looper: "DE_L", complexity: "T_E" }] },
  { id: "TEX_RIGHT", stunts: [{ penetrator: "DT_R", looper: "DE_R", complexity: "T_E" }] },
  { id: "TWIST", stunts: [{ penetrator: "DT_L", looper: "DT_R", complexity: "T_T" }] },
  { id: "DELAY", stunts: [{ penetrator: "DT_R", looper: "DE_R", complexity: "DELAYED" }] },
  {
    id: "TRIPLE",
    stunts: [
      { penetrator: "DT_L", looper: "DE_L", complexity: "TRIPLE" },
      { penetrator: "DT_R", looper: "DT_L", complexity: "TRIPLE" },
    ],
  },
];

/**
 * How a composed call's line plays. BOUND: as its card states (a reproduction keeps
 * `boundStunts`, a coverage its own). NONE: no line game. A line game's id: that game alone.
 */
export type LineChoice = "BOUND" | "NONE" | LineGameId;

function lineGame(id: LineGameId): LineGame {
  const game = LINE_GAMES.find((g) => g.id === id);
  if (game === undefined) throw new PlaybookError(`no line game ${id}`);
  return game;
}

// --- composition ---------------------------------------------------------------------------------

/**
 * The host, then the pressure's duties and keys. Built in the card template's key order, and with
 * no key the shipped card lacks, so a reproduction has exactly its shipped card's keys and values.
 */
function layPressure(host: AnyDefensiveCard, spec: HostedPressure): AnyDefensiveCard {
  if (spec.over !== host.id) {
    throw new PlaybookError(`${spec.id} is laid over ${spec.over}, not ${host.id}`);
  }
  if (host.pressure !== undefined || host.looks !== undefined || host.coverageDisguise !== undefined) {
    throw new PlaybookError(
      `${spec.id} over ${host.id}: a pressure is laid over a bare coverage, and the looks over the ` +
        "composed call",
    );
  }
  const stunts = spec.boundStunts ?? host.stunts;
  return {
    id: spec.id,
    name: spec.name ?? host.name,
    personnel: host.personnel,
    front: spec.front ?? host.front,
    concept: spec.concept ?? host.concept,
    pressure: spec.pressure,
    shellIntent: host.shellIntent,
    family: spec.family ?? host.family,
    ...(host.noDeepHelp === undefined ? {} : { noDeepHelp: host.noDeepHelp }),
    duties: { ...host.duties, ...spec.duties },
    ...(stunts === undefined ? {} : { stunts }),
    blitzDisguise: spec.blitzDisguise,
    ...(host.brackets === undefined ? {} : { brackets: host.brackets }),
    usage: spec.usage ?? host.usage,
  };
}

/**
 * A call, composed: the coverage, then the pressure's duties and keys, then the line game's
 * stunts. Always a card. With no pressure and lines BOUND it is the coverage itself: when the
 * pressure die says no, the call is exactly that coverage (ADR-073 §2.6).
 *
 * It composes and checks nothing else: whether a line game is legal on the call is
 * `legalLineGames`'s question, and `COMPOSED` holds only the legal ones.
 */
export function composeCall(
  coverage: AnyDefensiveCard,
  pressure?: HostedPressure,
  line: LineChoice = "BOUND",
): AnyDefensiveCard {
  const call = pressure === undefined ? coverage : layPressure(coverage, pressure);
  if (line === "BOUND") return call;
  const { stunts: _bound, ...stripped } = call;
  if (line === "NONE") return stripped;
  return { ...stripped, stunts: lineGame(line).stunts };
}

// --- line-game legality --------------------------------------------------------------------------

/**
 * No line game rides a call that rushes six (step 3.4's addition to §2.6): no card in the book asks
 * a six-man pressure to stunt (`test/pressure.test.ts`).
 */
const MOST_RUSHERS_UNDER_A_LINE_GAME = 5;

/** No line game over Prevent or the goal line (step 3.4's addition; ADR-073 §2.5 rules the same for the Stem). */
const NO_LINE_GAME_FAMILIES: readonly CoverageFamily[] = ["PREVENT", "GOAL_LINE"];

/** Why a line game is refused on a call. Every refusal names its rule. */
export type LineGameRefusal =
  /** `validateDefensiveCard` refuses the call wearing it (`checkStunts`, ADR-073 §2.6 step 3). */
  | { readonly reason: "VALIDATOR"; readonly codes: readonly string[] }
  /** R25: a man whose played duty the pressure set (ADR-073 §2.6 step 3). */
  | { readonly reason: "MOVED_BY_PRESSURE"; readonly roles: readonly DefenseRole[] }
  /** R25: a down lineman the call drops into coverage (Fire's end, the creeper's end). */
  | { readonly reason: "DROPPED_LINEMAN"; readonly roles: readonly DefenseRole[] }
  /** A man who is not a down lineman on this call: a line game is the line's. */
  | { readonly reason: "NOT_A_DOWN_LINEMAN"; readonly roles: readonly DefenseRole[] }
  /** More than five rush. */
  | { readonly reason: "RUSHES_MORE_THAN_FIVE"; readonly rushers: number }
  /** Prevent or the goal line. */
  | { readonly reason: "PREVENT_OR_GOAL_LINE"; readonly family: CoverageFamily };

const MOVED_BY_ID: ReadonlyMap<string, readonly DefenseRole[]> = new Map(
  [...PRESSURE_SPECS, ...CREEPER_SPECS].map((spec) => [spec.id, spec.moved]),
);

const COVERAGE_IDS: ReadonlySet<string> = new Set(V6_COVERAGES.map((card) => card.id));

/**
 * The men R25 holds a line game off on this call: its pressure's `moved` set. A bare coverage is
 * its own host, so its set is its rushers from off the line, which is none except on the bound
 * Cover 0 Blitz. A call of no known composition is refused loudly rather than given an empty set.
 */
function movedOn(call: AnyDefensiveCard): readonly DefenseRole[] {
  const stated = MOVED_BY_ID.get(call.id);
  if (stated !== undefined) return stated;
  if (!COVERAGE_IDS.has(call.id)) {
    throw new PlaybookError(`${call.id} is no v6 coverage and no pressure over one; its moved men are unknown`);
  }
  return dutyList(call)
    .filter((entry) => entry.duty.kind === "RUSH" && !isLineRole(entry.role))
    .map((entry) => entry.role);
}

/**
 * Every rule that refuses this line game on this call; empty when it is legal (ADR-073 §2.6
 * step 3, and step 3.4's additions to it — both men rushing linemen, five rushers at most, no
 * Prevent or goal line):
 *
 *  - the call wearing it validates — `checkStunts` is module-private, so it runs through
 *    `validateDefensiveCard`;
 *  - neither man is in the pressure's `moved` set, and neither is a lineman the call drops (R25);
 *  - both men are down linemen who rush on the call. A stunt whose man does not rush is dropped
 *    at instantiation while the FRONT tag stays (`instantiate.ts`, `resolveStunts`), so a call
 *    saying a game the line does not run is refused here instead;
 *  - the call rushes at most five, and is not Prevent or the goal line.
 */
export function lineGameRefusals(call: AnyDefensiveCard, game: LineGame): readonly LineGameRefusal[] {
  const out: LineGameRefusal[] = [];
  const codes = [...new Set(errorsOnly(validateDefensiveCard({ ...call, stunts: game.stunts })).map((d) => d.code))];
  if (codes.length > 0) out.push({ reason: "VALIDATOR", codes });
  const men = [...new Set(game.stunts.flatMap((s) => [s.penetrator, s.looper]))];
  const moved = movedOn(call);
  const onMoved = men.filter((man) => moved.includes(man));
  if (onMoved.length > 0) out.push({ reason: "MOVED_BY_PRESSURE", roles: onMoved });
  const dropped = men.filter((man) => {
    const duty = call.duties[man];
    return isLineRole(man) && duty !== undefined && duty.kind !== "RUSH";
  });
  if (dropped.length > 0) out.push({ reason: "DROPPED_LINEMAN", roles: dropped });
  const offTheLine = men.filter((man) => !isLineRole(man) || call.duties[man] === undefined);
  if (offTheLine.length > 0) out.push({ reason: "NOT_A_DOWN_LINEMAN", roles: offTheLine });
  const rushers = rusherCount(call);
  if (rushers > MOST_RUSHERS_UNDER_A_LINE_GAME) out.push({ reason: "RUSHES_MORE_THAN_FIVE", rushers });
  if (NO_LINE_GAME_FAMILIES.includes(call.family)) {
    out.push({ reason: "PREVENT_OR_GOAL_LINE", family: call.family });
  }
  return out;
}

/**
 * The line games this call may wear, in `LINE_GAMES`' order. The call is a composed call
 * with or without its bound stunts — or one of the book's 22 cards, which carry the ids of their
 * compositions — and the games replace whatever stunts it states.
 */
export function legalLineGames(call: AnyDefensiveCard): readonly LineGame[] {
  return LINE_GAMES.filter((game) => lineGameRefusals(call, game).length === 0);
}

// --- every reachable composition ---------------------------------------------------------------

/** One reachable composition, under its key. */
export interface ComposedCall {
  readonly key: string;
  /** The host coverage's id. */
  readonly coverage: string;
  /**
   * The word of the pressure laid over the coverage; absent when none is. The bound Cover 0 Blitz
   * is a coverage here, and says its own Zero.
   */
  readonly pressure?: PressureTagId;
  readonly line: LineChoice;
  readonly call: AnyDefensiveCard;
}

/** `coverage|pressure|line`, with `-` for no pressure. A word is hosted at most once per coverage. */
export function composedKey(coverage: string, pressure: PressureTagId | undefined, line: LineChoice): string {
  return `${coverage}|${pressure ?? "-"}|${line}`;
}

/** The pressures a coverage hosts: the decomposed cards over it, in the book's order, then its creeper. */
function hostedBy(coverage: AnyDefensiveCard): readonly HostedPressure[] {
  return [...PRESSURE_SPECS, ...CREEPER_SPECS].filter((spec) => spec.over === coverage.id);
}

function buildComposed(): Readonly<Record<string, ComposedCall>> {
  const table: Record<string, ComposedCall> = {};
  for (const coverage of V6_COVERAGES) {
    for (const pressure of [undefined, ...hostedBy(coverage)]) {
      const stripped = composeCall(coverage, pressure, "NONE");
      const lines: readonly LineChoice[] = ["BOUND", "NONE", ...legalLineGames(stripped).map((g) => g.id)];
      for (const line of lines) {
        const key = composedKey(coverage.id, pressure?.pressure, line);
        if (table[key] !== undefined) throw new PlaybookError(`two compositions under ${key}`);
        table[key] = Object.freeze({
          key,
          coverage: coverage.id,
          ...(pressure === undefined ? {} : { pressure: pressure.pressure }),
          line,
          call: composeCall(coverage, pressure, line),
        });
      }
    }
  }
  return Object.freeze(table);
}

/**
 * EVERY REACHABLE COMPOSITION, keyed `coverage|pressure|line`: each v6 coverage, bare and under
 * each pressure it hosts, with its lines BOUND, with no line game, and with each legal one. Built
 * once, when the module loads, and frozen. Every entry is validated, said, instantiated and masked
 * by `test/coverageCatalogue.test.ts` and `test/coverageCatalogueCorpus.test.ts`, so a caller looks
 * a call up here and runs no football check per snap.
 */
export const COMPOSED: Readonly<Record<string, ComposedCall>> = buildComposed();
