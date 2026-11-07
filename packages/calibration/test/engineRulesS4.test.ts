/**
 * ADR-089 step 4: `pocket-1.s4` AND TODAY'S LINE PLUS CONTACT (KIND T), AND THEIR GATES
 * (`src/pocket/rules.ts`; plan §1.1, §1.2, §9 commit 4).
 *
 *  1. The design's two blocks are plan §1.1's values (b 5, the three tilts on at +20, +10, +10, the
 *     shed delays 0.5 s and 1.0 s, the second arrival at 15, the contest after the throw; rho0 0.3,
 *     rhoD 400, the continuous reading), frozen; the overlay is `pocket-1.s3`'s plus the two blocks;
 *     `STEP4_BLOCKS` follow step 3's; the closed sets are the engine's.
 *  2. `pocket-1.s4` is built as `pocket-1.s3` is plus the two blocks: stamped at the recorded
 *     literal `POCKET_1_S4_DIGEST`, every leaf but the two blocks' equal to `pocket-1.s3`'s; its save
 *     name is `pocket-1.s4@<digest>` and loads back. `DEFAULT_TUNABLES` and the s1 to s3 bundles
 *     carry neither key (an `in` check), and their digests are unchanged.
 *  3. The names: no name before `pocket-1.s4` carries a step-4 block, legacy carries none; under
 *     `pocket-1.s4` any subset of the step-4 blocks on either clock is a bundle at its own digest.
 *  4. Kind T: the card and the contact block and nothing else, stamped `pocket-1.s4` at its own
 *     digest; every other tree with no block clock is refused with its reason.
 *  5. The dials: each refusal the engine makes, made here first with the engine's words, and the
 *     engine (played through its barrel) refuses the same hand-stamped tree with the same words.
 *  6. The gates: calibration's P6, P7 and P8 are the engine's (read from its source), all true since
 *     the lift; `checkStamp` passes every step-4 tree, and a calibration game under `pocket-1.s4` or
 *     kind T plays and writes the step-4 records; a test's own petitions, withheld, shut the joint
 *     gate (`step4Refusal`, `checkStamp`). The command line offers `pocket-1.s4` and never T.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyTunablePatch, createMatchState, DEFAULT_TUNABLES, simulateGame, type Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { frozenCallerPair } from "../src/caller/frozen.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { parseExportArgs } from "../src/export/cli.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture } from "../src/harness/schedule.js";
import { goldenFixtures } from "../src/pocket/corpus.js";
import {
  checkStamp,
  CONTACT_ORDERS,
  ENGINE_RULES,
  engineRulesDigestOf,
  EngineRulesError,
  isTodaysLinePlusContact,
  MOTION_READINGS,
  overlayDigestOf,
  P6_IN_CONTRACTS,
  P7_IN_CONTRACTS,
  P8_IN_CONTRACTS,
  POCKET_1_S1_OVERLAY,
  POCKET_1_S2_FORCING,
  POCKET_1_S2_LEAVES,
  POCKET_1_S3_CLIMB_LANE,
  POCKET_1_S3_DIGEST,
  POCKET_1_S3_FREE_RUN,
  POCKET_1_S3_LATE_BLOCK,
  POCKET_1_S3_OVERLAY,
  POCKET_1_S4_CONTACT,
  POCKET_1_S4_DIGEST,
  POCKET_1_S4_MOTION,
  POCKET_1_S4_OVERLAY,
  POCKET_1_S4_RULES,
  POCKET_BLOCKS,
  rulesOfSave,
  rulesRefusal,
  rulesTunables,
  saveRulesName,
  step4Refusal,
  STEP4_BLOCKS,
  withOverlay,
  type PocketContact,
  type PocketMotion,
  type PocketOverlay,
} from "../src/pocket/rules.js";
import { seasonRules } from "../src/season/stamp.js";

/** Recorded at this build: `overlayDigestOf(rulesTunables("pocket-1.s4"))`. */
const RECORDED_POCKET_1_S4_DIGEST = "fnv1a:8edb4bad";
/** Recorded at this build: kind T on `DEFAULT_TUNABLES` with the design's contact block (untouched tilts). */
const RECORDED_T_DESIGN_CONTACT_DIGEST = "fnv1a:511437ed";

const card = POCKET_1_S1_OVERLAY.approach!;
/** DEFAULT_TUNABLES with Half and Follows, the base `pocket-1.s2` to `pocket-1.s4` are stamped on. */
const horizons = (): Tunables => POCKET_1_S2_LEAVES.reduce(applyTunablePatch, DEFAULT_TUNABLES);
/** The same dials stamped by hand with a right digest. */
const byHand = (unstamped: Tunables, name: string): Tunables => ({ ...unstamped, engineRules: { name, overlayDigest: overlayDigestOf(unstamped) } });
/** Kind T on `base`: the card and the contact block, under `pocket-1.s4`. */
const kindT = (contact: PocketContact = POCKET_1_S4_CONTACT, base: Tunables = DEFAULT_TUNABLES): Tunables =>
  withOverlay(base, POCKET_1_S4_RULES, { approach: card, pocket: { contact } });
/** The untilted contact block (D3's and D8's): every tilt off. */
const UNTILTED: PocketContact = {
  ...POCKET_1_S4_CONTACT,
  tilts: {
    pushBlocked: { ...POCKET_1_S4_CONTACT.tilts.pushBlocked, on: false },
    freeRun: { ...POCKET_1_S4_CONTACT.tilts.freeRun, on: false },
    behindNever: { ...POCKET_1_S4_CONTACT.tilts.behindNever, on: false },
  },
};

/** Every leaf of a tree, by dotted path. */
function leaves(node: unknown, path = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (typeof node !== "object" || node === null) {
    out.set(path, node);
    return out;
  }
  for (const [k, v] of Object.entries(node)) for (const [p, x] of leaves(v, path === "" ? k : `${path}.${k}`)) out.set(p, x);
  return out;
}

/** Every object of a tree, by path. */
function nodes(value: unknown, path = "$"): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [];
  return [[path, value], ...Object.entries(value).flatMap(([k, v]) => nodes(v, `${path}.${k}`))];
}

/** Golden flat game 0 played straight through the engine's barrel, with no calibration check. */
function playThroughEngine(tunables: Tunables): unknown {
  const { index, fixtures, seeds } = goldenFixtures("flat");
  const built = buildFixture(index, fixtures[0]!);
  const pair = frozenCallerPair({
    tendencies: FROZEN_TENDENCIES,
    fourthDown: FROZEN_FOURTH_DOWN,
    homeDepthChart: built.homeDepthChart,
    awayDepthChart: built.awayDepthChart,
    callerVersion: "v7",
  });
  const coordinates = { season: built.fixture.season, week: built.fixture.week, home: built.fixture.home, away: built.fixture.away };
  return simulateGame(createMatchState(coordinates, built.snapshot, tunables), { coordinates, snapshot: built.snapshot, callers: { home: pair.home, away: pair.away } }, seeds[0]!, tunables);
}

/** The error a thunk throws (fails the test if it throws none). */
function thrown(run: () => unknown): Error {
  try {
    run();
  } catch (e) {
    return e as Error;
  }
  throw new Error("expected a throw");
}

/** Every step-4 petition withheld: a test's own set, to see the joint gate refuse. */
const WITHHELD = { P6: false, P7: false, P8: false } as const;

const GATE_BOTH =
  "pocket.contact and throwExec.motion are refused before any game until petitions P6, P7 and P8 are in contracts (not yet: P6, P7, P8): a contact writes an arrival_contest CHECK and a QB_HIT, the throwing motion a QB_HIT and THROW.releaseSeconds (ADR-089 step 4)";
const GATE_CONTACT =
  "pocket.contact is refused before any game until petitions P6, P7 and P8 are in contracts (not yet: P6, P7, P8): a contact writes an arrival_contest CHECK and a QB_HIT, the throwing motion a QB_HIT and THROW.releaseSeconds (ADR-089 step 4)";

describe("pocket-1.s4's blocks (plan §1.1)", () => {
  it("are the design's: b 5, the tilts on at +20, +10, +10, sheds 0.5 s and 1.0 s, the second arrival at 15, the contest after the throw; rho0 0.3, rhoD 400, continuous", () => {
    expect(POCKET_1_S4_RULES).toBe("pocket-1.s4");
    expect(POCKET_1_S4_CONTACT).toEqual({
      boundary: 5,
      tilts: { pushBlocked: { on: true, quarterbackBonus: 20 }, freeRun: { on: true, rusherBonus: 10 }, behindNever: { on: true, rusherBonus: 10 } },
      shedDelaySeconds: 0.5,
      pushShedDelaySeconds: 1.0,
      secondArrival: { target: 15 },
      order: "CONTEST_AFTER_THROW",
    });
    expect(POCKET_1_S4_MOTION).toEqual({ rho0: 0.3, rhoD: 400, reading: "CONTINUOUS" });
    expect(POCKET_1_S4_OVERLAY).toEqual({ ...POCKET_1_S3_OVERLAY, pocket: { climbLane: POCKET_1_S3_CLIMB_LANE, contact: POCKET_1_S4_CONTACT }, throwExec: { motion: POCKET_1_S4_MOTION } });
    for (const [path, node] of nodes(POCKET_1_S4_OVERLAY)) expect(Object.isFrozen(node), path).toBe(true);
    // pocket-1.s3's overlay is untouched.
    expect(POCKET_1_S3_OVERLAY).toEqual({ ...POCKET_1_S1_OVERLAY, blitzPickup: { freeRun: POCKET_1_S3_FREE_RUN, lateBlock: POCKET_1_S3_LATE_BLOCK }, pocket: { climbLane: "FRONT" } });
    expect([...STEP4_BLOCKS]).toEqual(["pocket.contact", "throwExec.motion"]);
    expect([...POCKET_BLOCKS].slice(-2)).toEqual([...STEP4_BLOCKS]);
    expect([...CONTACT_ORDERS]).toEqual(["CONTEST_AFTER_THROW", "CONTEST_BEFORE_THROW"]);
    expect([...MOTION_READINGS]).toEqual(["CONTINUOUS", "GRID"]);
  });
});

describe("pocket-1.s4, the bundle (plan §1.1)", () => {
  it("is pocket-1.s3 plus the two blocks, stamped at the recorded literal, built once and frozen", () => {
    const b = rulesTunables("pocket-1.s4");
    expect(rulesTunables("pocket-1.s4")).toBe(b);
    expect(POCKET_1_S4_DIGEST).toBe(RECORDED_POCKET_1_S4_DIGEST);
    expect(b.engineRules).toEqual({ name: "pocket-1.s4", overlayDigest: RECORDED_POCKET_1_S4_DIGEST });
    expect(overlayDigestOf(b)).toBe(RECORDED_POCKET_1_S4_DIGEST);
    expect(engineRulesDigestOf("pocket-1.s4")).toBe(RECORDED_POCKET_1_S4_DIGEST);
    for (const [path, node] of nodes(b)) expect(Object.isFrozen(node), path).toBe(true);
    // Every leaf but the two blocks' (and the stamp) is pocket-1.s3's.
    const s3 = leaves(rulesTunables("pocket-1.s3"));
    const s4 = leaves(b);
    const moved = [...s4].filter(([p, v]) => s3.get(p) !== v).map(([p]) => p);
    expect(moved.every((p) => p.startsWith("pocket.contact.") || p.startsWith("throwExec.motion.") || p === "engineRules.name" || p === "engineRules.overlayDigest"), moved.join(", ")).toBe(true);
    expect([...s3.keys()].filter((p) => !s4.has(p))).toEqual([]);
    expect(b.pocket.contact).toEqual(POCKET_1_S4_CONTACT);
    expect(b.throwExec.motion).toEqual(POCKET_1_S4_MOTION);
    expect(b.pocket.forcing).toEqual(POCKET_1_S2_FORCING);
  });

  it("is stamped pocket-1.s4@<digest> in a save, which loads back; the season carries it on and refuses to convert", () => {
    const save = saveRulesName("pocket-1.s4");
    expect(save).toBe(`pocket-1.s4@${RECORDED_POCKET_1_S4_DIGEST}`);
    expect(rulesOfSave({ engineRules: save! })).toBe("pocket-1.s4");
    expect(() => rulesOfSave({ engineRules: `pocket-1.s4@${POCKET_1_S3_DIGEST}` })).toThrow(
      `This save was played with engine rules pocket-1.s4 at overlay ${POCKET_1_S3_DIGEST}; this build's pocket-1.s4 is ${RECORDED_POCKET_1_S4_DIGEST}`,
    );
    expect(seasonRules(undefined, "pocket-1.s4")).toBe("pocket-1.s4");
    expect(() => seasonRules({ playedWith: { engineRules: save! } }, "pocket-1.s3")).toThrow(/^This save was played with engine rules pocket-1\.s4; carrying it on under pocket-1\.s3 is refused, not converted/);
  });

  it("moves no default: DEFAULT_TUNABLES and the s1 to s3 bundles carry neither step-4 key, and their digests stand", () => {
    for (const t of [DEFAULT_TUNABLES, rulesTunables("pocket-1.s1"), rulesTunables("pocket-1.s2"), rulesTunables("pocket-1.s3")]) {
      expect("contact" in t.pocket).toBe(false);
      expect("motion" in t.throwExec).toBe(false);
    }
    expect(engineRulesDigestOf("pocket-1.s1")).toBe("fnv1a:69a7cc48");
    expect(engineRulesDigestOf("pocket-1.s2")).toBe("fnv1a:03754f60");
    expect(engineRulesDigestOf("pocket-1.s3")).toBe("fnv1a:c4462712");
    expect(overlayDigestOf(rulesTunables("pocket-1.s3"))).toBe("fnv1a:c4462712");
  });
});

describe("the step-4 blocks under each name (plan §1.1)", () => {
  const s4With = (blocks: Pick<PocketOverlay, "pocket" | "throwExec">, name: "pocket-1.s1" | "pocket-1.s2" | "pocket-1.s3" | "pocket-1.s4", clocks: PocketOverlay = POCKET_1_S1_OVERLAY): Tunables =>
    withOverlay(horizons(), name, { ...clocks, ...blocks }, name === "pocket-1.s1" ? undefined : POCKET_1_S2_FORCING);

  it("refuses either block under pocket-1.s1, .s2 and .s3, and under legacy", () => {
    for (const name of ["pocket-1.s1", "pocket-1.s2", "pocket-1.s3"] as const) {
      for (const [blocks, list] of [
        [{ pocket: { contact: POCKET_1_S4_CONTACT } }, "pocket.contact"],
        [{ throwExec: { motion: POCKET_1_S4_MOTION } }, "throwExec.motion"],
        [{ pocket: { contact: POCKET_1_S4_CONTACT }, throwExec: { motion: POCKET_1_S4_MOTION } }, "pocket.contact, throwExec.motion"],
      ] as const) {
        const message = `withOverlay(${name}): ${name} carries no step-4 block (${list}); contact by approach and the throwing motion are pocket-1.s4's (ADR-089 step 4)`;
        expect(() => s4With(blocks, name), `${name} ${list}`).toThrow(EngineRulesError);
        expect(() => s4With(blocks, name), `${name} ${list}`).toThrow(message);
      }
    }
    const withContact = { ...DEFAULT_TUNABLES, pocket: { ...DEFAULT_TUNABLES.pocket, contact: POCKET_1_S4_CONTACT } } as Tunables;
    expect(() => checkStamp(withContact, "legacy", "w")).toThrow("w: the run names engine rules legacy, but the tunables carry pocket.contact with no rules stamp");
    const withMotion = { ...DEFAULT_TUNABLES, throwExec: { ...DEFAULT_TUNABLES.throwExec, motion: POCKET_1_S4_MOTION } } as Tunables;
    expect(() => checkStamp(withMotion, "legacy", "w")).toThrow("w: the run names engine rules legacy, but the tunables carry throwExec.motion with no rules stamp");
    // A base already carrying a step-4 block is refused, as for every block.
    expect(() => withOverlay(withContact, "pocket-1.s4", POCKET_1_S1_OVERLAY)).toThrow("withOverlay(pocket-1.s4): the base already carries pocket.contact; a bundle's blocks come from its overlay");
    expect(() => withOverlay(horizons(), "pocket-1.s4", { ...POCKET_1_S1_OVERLAY, throwExec: { lane: {} } } as never)).toThrow(
      "withOverlay(pocket-1.s4): the overlay names throwExec.lane, which is not a pocket-1 block (motion)",
    );
  });

  it("under pocket-1.s4, any subset on either clock is a bundle at its own digest (D5: the motion alone; D7: the contact alone; D17: both on L)", () => {
    const L = { repClock: { fullExpressionSeconds: 8 }, approach: card };
    const built = [
      s4With({ throwExec: { motion: POCKET_1_S4_MOTION } }, "pocket-1.s4"),
      s4With({ pocket: { contact: POCKET_1_S4_CONTACT } }, "pocket-1.s4"),
      s4With({ pocket: { contact: POCKET_1_S4_CONTACT }, throwExec: { motion: POCKET_1_S4_MOTION } }, "pocket-1.s4", L),
      s4With({}, "pocket-1.s4"),
      kindT(),
      rulesTunables("pocket-1.s4"),
    ];
    for (const t of built) expect(t.engineRules?.name).toBe("pocket-1.s4");
    expect(new Set(built.map((t) => t.engineRules?.overlayDigest)).size).toBe(built.length);
    // A step-4 bundle checks, but for the gate: checkStamp's only refusal is the gate's.
    for (const t of built) {
      const refusal = step4Refusal(t);
      if (refusal === undefined) expect(checkStamp(t, "pocket-1.s4")).toBe(t);
      else expect(() => checkStamp(t, "pocket-1.s4", "w")).toThrow(`w: ${refusal}`);
    }
  });
});

describe("kind T, today's line plus contact (plan §1.2)", () => {
  it("is the card and the contact block alone, under pocket-1.s4 at its own digest, and nothing else", () => {
    const t = kindT();
    expect(t.engineRules).toEqual({ name: "pocket-1.s4", overlayDigest: RECORDED_T_DESIGN_CONTACT_DIGEST });
    expect(isTodaysLinePlusContact(t)).toBe(true);
    expect(t.passRush.beatClock).toBeUndefined();
    expect(t.passRush.repClock).toBeUndefined();
    expect(t.passRush.approach).toEqual(card);
    expect(t.pocket.contact).toEqual(POCKET_1_S4_CONTACT);
    expect("forcing" in t.pocket || "climbLane" in t.pocket || "motion" in t.throwExec || "freeRun" in t.blitzPickup || "lateBlock" in t.blitzPickup).toBe(false);
    // Every leaf but the card, the contact block and the stamp is DEFAULT_TUNABLES' (D3 is A0 plus contact).
    const base = leaves(DEFAULT_TUNABLES);
    const moved = [...leaves(t)].filter(([p, v]) => base.get(p) !== v).map(([p]) => p);
    expect(moved.every((p) => p.startsWith("passRush.approach.") || p.startsWith("pocket.contact.") || p.startsWith("engineRules.")), moved.join(", ")).toBe(true);
    // D3 (untilted, on A0) and D4 (untilted, on A14's hold) are each their own digest.
    const hold = [
      { tunableId: "qb.timeBudget.baseSeconds", currentValue: 2.5, proposedValue: 4.5, evidence: "test", expectedEffect: "test" },
    ].reduce(applyTunablePatch, DEFAULT_TUNABLES);
    const d3 = kindT(UNTILTED);
    const d4 = kindT(UNTILTED, hold);
    expect(new Set([t, d3, d4].map((x) => x.engineRules?.overlayDigest)).size).toBe(3);
    for (const x of [d3, d4]) expect(isTodaysLinePlusContact(x)).toBe(true);
    // No other tree is kind T.
    for (const rules of ENGINE_RULES) expect(isTodaysLinePlusContact(rulesTunables(rules)), rules).toBe(false);
  });

  it("refuses every other tree with no block clock, with its reason", () => {
    const at = (m: string): string => `withOverlay(pocket-1.s4): ${m}`;
    const cases: [string, () => unknown, string][] = [
      ["T with must act per rusher", () => withOverlay(horizons(), "pocket-1.s4", { approach: card, pocket: { contact: POCKET_1_S4_CONTACT } }, POCKET_1_S2_FORCING),
        at("today's line plus contact (kind T) plays step 1's forcing rule and carries no forcing block (pocket.forcing); must act per rusher needs a block clock")],
      ["T with a step-3 block", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s4", { approach: card, pocket: { contact: POCKET_1_S4_CONTACT, climbLane: "FRONT" } }),
        at("today's line plus contact (kind T) carries no step-3 block (pocket.climbLane): each needs a block clock")],
      ["T with the free-run clock", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s4", { approach: card, pocket: { contact: POCKET_1_S4_CONTACT }, blitzPickup: { freeRun: POCKET_1_S3_FREE_RUN } }),
        at("today's line plus contact (kind T) carries no step-3 block (blitzPickup.freeRun): each needs a block clock")],
      ["T with the motion", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s4", { approach: card, pocket: { contact: POCKET_1_S4_CONTACT }, throwExec: { motion: POCKET_1_S4_MOTION } }),
        at("the throwing motion (throwExec.motion) without a block clock (passRush.beatClock or passRush.repClock); today's line plus contact (kind T) runs the contact alone")],
      ["the motion alone with no clock", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s4", { approach: card, throwExec: { motion: POCKET_1_S4_MOTION } }),
        at("the throwing motion (throwExec.motion) without a block clock (passRush.beatClock or passRush.repClock); today's line plus contact (kind T) runs the contact alone")],
      ["the contact with no card and no clock", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s4", { pocket: { contact: POCKET_1_S4_CONTACT } }),
        at("the contact block (pocket.contact) without a block clock needs the approach card (passRush.approach): today's line plus contact (kind T) labels every threat by shape S's rows")],
      ["the card alone under pocket-1.s4", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s4", { approach: card }), at("a pocket-1 bundle needs a block clock (passRush.beatClock or passRush.repClock)")],
      ["T under pocket-1.s3", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s3", { approach: card, pocket: { contact: POCKET_1_S4_CONTACT } }),
        "withOverlay(pocket-1.s3): a pocket-1 bundle needs a block clock (passRush.beatClock or passRush.repClock)"],
    ];
    for (const [label, run, message] of cases) {
      expect(run, label).toThrow(EngineRulesError);
      expect(run, label).toThrow(message);
    }
    // checkStamp refuses the same hand-stamped trees with the same reasons.
    const t = kindT();
    const withForcing = byHand({ ...t, engineRules: undefined, pocket: { ...t.pocket, forcing: POCKET_1_S2_FORCING } } as unknown as Tunables, "pocket-1.s4");
    expect(() => checkStamp(withForcing, "pocket-1.s4", "runOneGame")).toThrow(
      "runOneGame: today's line plus contact (kind T) plays step 1's forcing rule and carries no forcing block (pocket.forcing); must act per rusher needs a block clock",
    );
  });
});

describe("the step-4 dials, as the engine's (plan §1.1)", () => {
  /** pocket-1.s4's whole tree by hand, less the stamp, with the two blocks given. */
  const unstampedS4 = (contact: unknown, motion: unknown): Tunables => {
    const b = rulesTunables("pocket-1.s4");
    return {
      ...b,
      engineRules: undefined,
      pocket: { ...b.pocket, contact },
      throwExec: { ...b.throwExec, motion },
    } as unknown as Tunables;
  };
  const c = (over: Readonly<Record<string, unknown>>): unknown => ({ ...POCKET_1_S4_CONTACT, ...over });
  const tilt = (name: string, value: unknown): unknown => c({ tilts: { ...POCKET_1_S4_CONTACT.tilts, [name]: value } });
  const m = (over: Readonly<Record<string, unknown>>): unknown => ({ ...POCKET_1_S4_MOTION, ...over });
  const cases: [string, unknown, unknown, string][] = [
    ["b not whole", c({ boundary: 5.5 }), POCKET_1_S4_MOTION, "pocket.contact.boundary must be a whole number (the d100 margins and the closed forms are whole numbers), got 5.5"],
    ["tilts not an object", c({ tilts: "on" }), POCKET_1_S4_MOTION, "pocket.contact.tilts must be an object { pushBlocked, freeRun, behindNever }, got on"],
    ["a tilt missing", tilt("freeRun", undefined), POCKET_1_S4_MOTION, "pocket.contact.tilts.freeRun must be an object { on, rusherBonus }, got undefined"],
    ["a tilt's on not a boolean", tilt("pushBlocked", { on: 1, quarterbackBonus: 20 }), POCKET_1_S4_MOTION, "pocket.contact.tilts.pushBlocked.on must be true or false, got 1"],
    ["a tilt's size below 0", tilt("behindNever", { on: true, rusherBonus: -10 }), POCKET_1_S4_MOTION, "pocket.contact.tilts.behindNever.rusherBonus must be a finite number, 0 or more, got -10"],
    ["a shed delay off the tenth", c({ shedDelaySeconds: 0.25 }), POCKET_1_S4_MOTION, "pocket.contact.shedDelaySeconds must be a whole number of tenths of a second (a delayed etaTick is published in tenths), got 0.25"],
    ["a push shed delay below 0", c({ pushShedDelaySeconds: -1 }), POCKET_1_S4_MOTION, "pocket.contact.pushShedDelaySeconds must be a finite number, 0 or more, got -1"],
    ["the second arrival a word", c({ secondArrival: "OFF" }), POCKET_1_S4_MOTION, 'pocket.contact.secondArrival must be "RATED" or an object { target }, got OFF'],
    ["the second arrival's target above 100", c({ secondArrival: { target: 101 } }), POCKET_1_S4_MOTION, "pocket.contact.secondArrival.target must lie from 0 to 100 (a d100 above it is a sack), got 101"],
    ["the second arrival's target not whole", c({ secondArrival: { target: 15.5 } }), POCKET_1_S4_MOTION, "pocket.contact.secondArrival.target must be a whole number (the d100 margins and the closed forms are whole numbers), got 15.5"],
    ["the order", c({ order: "CONTEST_DURING_THROW" }), POCKET_1_S4_MOTION, "the contact order (pocket.contact.order) is CONTEST_DURING_THROW, which is not one of CONTEST_AFTER_THROW, CONTEST_BEFORE_THROW"],
    ["rho0 0", POCKET_1_S4_CONTACT, m({ rho0: 0 }), "throwExec.motion.rho0 must be a finite number above 0, got 0"],
    ["rhoD below 0", POCKET_1_S4_CONTACT, m({ rhoD: -400 }), "throwExec.motion.rhoD must be a finite number above 0, got -400"],
    ["the reading", POCKET_1_S4_CONTACT, m({ reading: "TICK" }), "the motion's arrival reading (throwExec.motion.reading) is TICK, which is not one of CONTINUOUS, GRID"],
    ["rho below 0 at release 99", POCKET_1_S4_CONTACT, m({ rho0: 0.5, rhoD: 29 }), "the throwing motion (throwExec.motion) runs -0.5 s at release 99: rho must be 0 or more over the rating scale"],
    ["rho a whole tick at release 0", POCKET_1_S4_CONTACT, m({ rho0: 0.4, rhoD: 100 }), "the throwing motion (throwExec.motion) runs 1.1 s at release 0: rho must stay below one tick step (0.5 s) over the rating scale"],
  ];

  it("refuses each bad dial before any game, with the engine's words, in withOverlay and checkStamp", () => {
    for (const [label, contact, motion, message] of cases) {
      const tree = unstampedS4(contact, motion);
      const overlay = { ...POCKET_1_S3_OVERLAY, pocket: { climbLane: POCKET_1_S3_CLIMB_LANE, contact }, throwExec: { motion } } as unknown as PocketOverlay;
      expect(() => withOverlay(horizons(), "pocket-1.s4", overlay, POCKET_1_S2_FORCING), label).toThrow(EngineRulesError);
      expect(() => withOverlay(horizons(), "pocket-1.s4", overlay, POCKET_1_S2_FORCING), label).toThrow(`withOverlay(pocket-1.s4): ${message}`);
      expect(() => checkStamp(byHand(tree, "pocket-1.s4"), "pocket-1.s4", "runBatch"), label).toThrow(`runBatch: ${message}`);
    }
    // The design's dials pass, and the motion's ends are the plan's (0.2275 s to 0.475 s); with the
    // petitions withheld the gate is the only refusal.
    expect(checkStamp(rulesTunables("pocket-1.s4"), "pocket-1.s4", "w")).toBe(rulesTunables("pocket-1.s4"));
    expect(() => checkStamp(rulesTunables("pocket-1.s4"), "pocket-1.s4", "w", WITHHELD)).toThrow(`w: ${GATE_BOTH}`);
  });

  it("the engine refuses the same hand-stamped trees with the same words (played through its barrel)", () => {
    for (const [label, contact, motion, message] of cases) {
      const e = thrown(() => playThroughEngine(byHand(unstampedS4(contact, motion), "pocket-1.s4")));
      expect(e.name, label).toBe("PocketRulesError");
      expect(e.message, label).toBe(`@ff/engine: ${message}`);
    }
  }, 120_000);
});

describe("the gates: open since P6, P7 and P8 are in contracts (plan §1.1, §6)", () => {
  it("calibration's P6, P7 and P8 are the engine's, and all true", () => {
    const engineSource = readFileSync(fileURLToPath(new URL("../../engine/src/sim/pocketRules.ts", import.meta.url)), "utf8");
    for (const [name, ours] of [["P6", P6_IN_CONTRACTS], ["P7", P7_IN_CONTRACTS], ["P8", P8_IN_CONTRACTS]] as const) {
      const declared = [...engineSource.matchAll(new RegExp(`^export const ${name}_IN_CONTRACTS = (true|false);$`, "gm"))].map((x) => x[1]);
      expect(declared, `the engine declares ${name}_IN_CONTRACTS once, as a literal`).toHaveLength(1);
      expect(ours, `calibration's ${name}_IN_CONTRACTS (src/pocket/rules.ts) differs from the engine's (sim/pocketRules.ts)`).toBe(declared[0] === "true");
      expect(ours, name).toBe(true);
    }
  });

  it("pocket-1.s4 and kind T pass every calibration entry; withheld, they are refused there, and only they", () => {
    for (const rules of ENGINE_RULES) expect(rulesRefusal(rules), rules).toBeUndefined();
    expect(step4Refusal(kindT())).toBeUndefined();
    expect(checkStamp(rulesTunables("pocket-1.s4"), "pocket-1.s4", "season")).toBe(rulesTunables("pocket-1.s4"));
    expect(checkStamp(kindT(), "pocket-1.s4", "runBatch")).toEqual(kindT());
    expect(step4Refusal(rulesTunables("pocket-1.s4"), WITHHELD)).toBe(GATE_BOTH);
    expect(step4Refusal(kindT(), WITHHELD)).toBe(GATE_CONTACT);
    expect(() => checkStamp(rulesTunables("pocket-1.s4"), "pocket-1.s4", "season", WITHHELD)).toThrow(`season: ${GATE_BOTH}`);
    expect(() => checkStamp(kindT(), "pocket-1.s4", "runBatch", WITHHELD)).toThrow(`runBatch: ${GATE_CONTACT}`);
    for (const rules of ENGINE_RULES.filter((r) => r !== "pocket-1.s4")) expect(step4Refusal(rulesTunables(rules), WITHHELD), rules).toBeUndefined();
  });

  it("a test's own petitions shut the calibration gate, one at a time", () => {
    const b = rulesTunables("pocket-1.s4");
    expect(step4Refusal(b, { P6: true, P7: true, P8: true })).toBeUndefined();
    expect(step4Refusal(b, {})).toBeUndefined();
    expect(step4Refusal(b, { P8: false })).toBe(GATE_BOTH.replace("(not yet: P6, P7, P8)", "(not yet: P8)"));
    expect(step4Refusal(b, { P6: false, P8: false })).toBe(GATE_BOTH.replace("(not yet: P6, P7, P8)", "(not yet: P6, P8)"));
    expect(step4Refusal(rulesTunables("pocket-1.s3"), WITHHELD)).toBeUndefined();
    expect(step4Refusal(DEFAULT_TUNABLES, WITHHELD)).toBeUndefined();
  });

  it("a calibration game under pocket-1.s4 and under kind T plays, and its stream carries the step-4 records", () => {
    const { index, fixtures, seeds } = goldenFixtures("flat");
    const built = buildFixture(index, fixtures[0]!);
    for (const [name, t, motion] of [["pocket-1.s4", rulesTunables("pocket-1.s4"), true], ["kind T", kindT(), false]] as const) {
      const { observation } = runOneGame({ built, seed: seeds[0]!, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, tunables: t });
      const events = observation.events.map((e) => e.event);
      expect(events.some((e) => e.type === "CHECK" && e.payload.checkKind === "arrival_contest"), name).toBe(true);
      expect(events.some((e) => e.type === "QB_HIT"), name).toBe(true);
      expect(events.some((e) => e.type === "THROW" && e.payload.releaseSeconds !== undefined), name).toBe(motion);
    }
  }, 120_000);

  it("the command line offers pocket-1.s4 and never kind T", () => {
    expect(parseExportArgs(["--seed", "a", "--engine-rules", "pocket-1.s4"])).toMatchObject({ seed: "a", engineRules: "pocket-1.s4" });
    // A name always plays its design bundle, never kind T.
    for (const rules of ENGINE_RULES) expect(isTodaysLinePlusContact(rulesTunables(rules)), rules).toBe(false);
    for (const bad of ["T", "pocket-1.s4.T", "D3", "D4"]) expect(() => parseExportArgs(["--seed", "a", "--engine-rules", bad]), bad).toThrow(/^--engine-rules must be one of /);
  });
});
