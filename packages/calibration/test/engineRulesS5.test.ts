/**
 * ADR-089 step 5: `pocket-1.s5a` AND `pocket-1.s5b`, BUILT AND REFUSED UNTIL RECORDED
 * (`src/pocket/rules.ts`; plan §1.1, §1.2, §4's rules.ts row, §9 commit 5).
 *
 *  1. The names: both are stamped names (`STAMPED_RULES`, the `OverlayRules` union) and step 5's
 *     (`pocketStepOf` 5), and neither is in `ENGINE_RULES`, the list a run, an export or a save may
 *     name, until it is recorded (the fit commit, the selection commit).
 *  2. The block: `POCKET_1_S5A_CLEAN_POCKET` is the design's (every part on, D23's bar 30, the reset
 *     1.0 s, the CHOSEN floor), frozen; `POCKET_1_S5A_OVERLAY` is `pocket-1.s4`'s plus the block;
 *     `STEP5_BLOCKS` follows step 4's in `POCKET_BLOCKS`.
 *  3. The records: the leaves, the digests and s5b's overlay are placeholders (`undefined`), and
 *     `rulesTunables` refuses each name with its named message; the command line, the season, the
 *     export and a save refuse both names; `DEFAULT_TUNABLES` and the s1 to s4 bundles carry no
 *     block and their digests stand.
 *  4. The recipe: `step5Bundle` builds either name before its literals exist (s4 plus the block plus
 *     the deltas' leaves, stamped at a digest of its own); `readSystemDeltaLeaves` moves only the three
 *     deltas; `step5OverlayAt` swaps the block clock (at S theta 11 the overlay is s5a's, so s5b's
 *     digest equals s5a's and only the name differs).
 *  5. The names and the block: no name before step 5's carries it (`noStep5`), legacy carries none,
 *     kind T carries none; under either step-5 name any subset of the step-3 to step-5 blocks is a
 *     bundle (the block alone, every part off, on shape L).
 *  6. The dials: each refusal the engine makes, made here first with the engine's words, and the
 *     engine (played through its barrel) refuses the same hand-stamped tree with the same words.
 *  7. `runOneGame` plays a tree stamped with a step-5 name (the harness's arms are), and still refuses
 *     a name this build does not stamp.
 */
import { applyTunablePatch, createMatchState, DEFAULT_TUNABLES, simulateGame, type Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { frozenCallerPair } from "../src/caller/frozen.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { parseExportArgs } from "../src/export/cli.js";
import { exportGame } from "../src/export/gameFile.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { goldenFixtures } from "../src/pocket/corpus.js";
import {
  checkStamp,
  CLEAN_POCKET_SWITCHES,
  ENGINE_RULES,
  engineRulesDigestOf,
  engineRulesNamed,
  EngineRulesError,
  isEngineRules,
  isStampedRules,
  isStep5Rules,
  isTodaysLinePlusContact,
  NO_READ_SYSTEM_OFFSETS,
  overlayDigestOf,
  pocketStepOf,
  POCKET_1_S1_OVERLAY,
  POCKET_1_S2_FORCING,
  POCKET_1_S2_LEAVES,
  POCKET_1_S3_CLIMB_LANE,
  POCKET_1_S3_OVERLAY,
  POCKET_1_S4_CONTACT,
  POCKET_1_S4_DIGEST,
  POCKET_1_S4_OVERLAY,
  POCKET_1_S5A_CLEAN_POCKET,
  POCKET_1_S5A_DIGEST,
  POCKET_1_S5A_DROP_FLOOR,
  POCKET_1_S5A_FIT_DIGEST,
  POCKET_1_S5A_LEAVES,
  POCKET_1_S5A_OVERLAY,
  POCKET_1_S5A_RESET_SECONDS,
  POCKET_1_S5A_RULES,
  POCKET_1_S5B_DIGEST,
  POCKET_1_S5B_OVERLAY,
  POCKET_1_S5B_RULES,
  POCKET_BLOCKS,
  READ_SYSTEMS,
  readSystemDeltaLeaves,
  readsStep3Facts,
  readsStep4Facts,
  rulesOfSave,
  rulesTunables,
  STAMPED_RULES,
  step5Bundle,
  step5OverlayAt,
  step5RulesRefusal,
  STEP4_BLOCKS,
  STEP5_BLOCKS,
  STEP5_RULES,
  stampedRulesNamed,
  withOverlay,
  type OverlayRules,
  type PocketCleanPocket,
  type PocketOverlay,
  type StampedRules,
} from "../src/pocket/rules.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { seasonRules } from "../src/season/stamp.js";

const card = POCKET_1_S1_OVERLAY.approach!;
/** DEFAULT_TUNABLES with Half and Follows, the base `pocket-1.s2` to `pocket-1.s5b` are stamped on. */
const horizons = (): Tunables => POCKET_1_S2_LEAVES.reduce(applyTunablePatch, DEFAULT_TUNABLES);
/** The same dials stamped by hand with a right digest. */
const byHand = (unstamped: Tunables, name: string): Tunables => ({ ...unstamped, engineRules: { name, overlayDigest: overlayDigestOf(unstamped) } });
/** `pocket-1.s4`'s overlay with a clean-pocket block in its `pocket`. */
const s4With = (block: unknown): PocketOverlay => ({ ...POCKET_1_S4_OVERLAY, pocket: { climbLane: POCKET_1_S3_CLIMB_LANE, contact: POCKET_1_S4_CONTACT, cleanPocket: block as PocketCleanPocket } });
/** The block with every part off and no floor (P-18b's block). */
const ALL_OFF: PocketCleanPocket = { d23: false, expiryBar: 30, move: false, resetSeconds: 1.0, bump: false, breakOut: false, d23OnRun: false };

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
  const pair = frozenCallerPair({ tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, homeDepthChart: built.homeDepthChart, awayDepthChart: built.awayDepthChart, callerVersion: "v7" });
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

const S5A_REFUSAL =
  "pocket-1.s5a is built but not recorded: it is recorded after the 5a fit (its three fitted deltas POCKET_1_S5A_LEAVES, POCKET_1_S5A_DIGEST and POCKET_1_S5A_FIT_DIGEST, " +
  "committed with the fit record), so no run, export or save names it before then (ADR-089 step 5, plan §1.1)";
const S5B_REFUSAL =
  "pocket-1.s5b is built but not recorded: it is recorded after the 5b selection (the block clock the filed rule picks, POCKET_1_S5B_OVERLAY and POCKET_1_S5B_DIGEST, " +
  "on pocket-1.s5a's recorded deltas), so no run, export or save names it before then (ADR-089 step 5, plan §1.1)";

describe("step 5's names (plan §1.1)", () => {
  it("are stamped names and step 5's, and not in ENGINE_RULES until recorded", () => {
    expect(POCKET_1_S5A_RULES).toBe("pocket-1.s5a");
    expect(POCKET_1_S5B_RULES).toBe("pocket-1.s5b");
    expect([...STEP5_RULES]).toEqual(["pocket-1.s5a", "pocket-1.s5b"]);
    expect([...ENGINE_RULES]).toEqual(["legacy", "pocket-1.s1", "pocket-1.s2", "pocket-1.s3", "pocket-1.s4"]);
    expect([...STAMPED_RULES]).toEqual([...ENGINE_RULES, "pocket-1.s5a", "pocket-1.s5b"]);
    for (const name of STEP5_RULES) {
      expect(isEngineRules(name), name).toBe(false);
      expect(isStampedRules(name), name).toBe(true);
      expect(isStep5Rules(name), name).toBe(true);
      expect(pocketStepOf(name), name).toBe(5);
      expect(readsStep3Facts(name) && readsStep4Facts(name), name).toBe(true);
    }
    for (const name of ENGINE_RULES) expect(isStep5Rules(name), name).toBe(false);
    for (const bad of ["pocket-1.s5", "pocket-1.s5c", "pocket-1.s6", "s5a"]) expect(isStampedRules(bad), bad).toBe(false);
    // The union a bundle is stamped with takes both (a compile-time check, made at run time too).
    const overlayNames: readonly OverlayRules[] = ["pocket-1.s1", "pocket-1.s2", "pocket-1.s3", "pocket-1.s4", "pocket-1.s5a", "pocket-1.s5b"];
    expect(overlayNames.every((n) => isStampedRules(n))).toBe(true);
  });

  it("stampedRulesNamed takes every stamped name; engineRulesNamed, the run's, refuses step 5's", () => {
    for (const name of STAMPED_RULES) expect(stampedRulesNamed(name, "w")).toBe(name);
    expect(stampedRulesNamed(undefined, "w")).toBe("legacy");
    expect(() => stampedRulesNamed("pocket-1.s9", "w")).toThrow(
      'w: engine rules "pocket-1.s9" are not in this build, which has legacy, pocket-1.s1, pocket-1.s2, pocket-1.s3, pocket-1.s4 (ADR-089 §9), and stamps pocket-1.s5a and pocket-1.s5b for the step-5 harness',
    );
    for (const name of STEP5_RULES) {
      expect(() => engineRulesNamed(name, "season --engine-rules"), name).toThrow(
        `season --engine-rules: engine rules "${name}" are not in this build, which has legacy, pocket-1.s1, pocket-1.s2, pocket-1.s3, pocket-1.s4 (ADR-089 §9)`,
      );
    }
  });
});

describe("pocket-1.s5a's block and overlay (plan §1.1, §1.2)", () => {
  it("the block is the design's: every part on, D23's bar 30, the reset 1.0 s, the CHOSEN floor; frozen", () => {
    expect(POCKET_1_S5A_CLEAN_POCKET).toEqual({
      d23: true,
      expiryBar: 30,
      move: true,
      resetSeconds: 1.0,
      bump: true,
      breakOut: true,
      d23OnRun: true,
      dropFloor: { QUICK: 1.0, SHORT: 1.5, INTERMEDIATE: 2.0, DEEP: 2.0 },
    });
    expect(POCKET_1_S5A_RESET_SECONDS).toBe(1.0);
    expect(POCKET_1_S5A_DROP_FLOOR).toEqual({ QUICK: 1.0, SHORT: 1.5, INTERMEDIATE: 2.0, DEEP: 2.0 });
    expect([...CLEAN_POCKET_SWITCHES]).toEqual(["d23", "move", "bump", "breakOut", "d23OnRun"]);
    for (const [path, node] of nodes(POCKET_1_S5A_CLEAN_POCKET)) expect(Object.isFrozen(node), path).toBe(true);
  });

  it("the overlay is pocket-1.s4's plus the block; STEP5_BLOCKS follows step 4's", () => {
    expect(POCKET_1_S5A_OVERLAY).toEqual({ ...POCKET_1_S4_OVERLAY, pocket: { climbLane: "FRONT", contact: POCKET_1_S4_CONTACT, cleanPocket: POCKET_1_S5A_CLEAN_POCKET } });
    for (const [path, node] of nodes(POCKET_1_S5A_OVERLAY)) expect(Object.isFrozen(node), path).toBe(true);
    expect("cleanPocket" in POCKET_1_S4_OVERLAY.pocket!).toBe(false);
    expect([...STEP5_BLOCKS]).toEqual(["pocket.cleanPocket"]);
    expect([...POCKET_BLOCKS].slice(-1)).toEqual([...STEP5_BLOCKS]);
    expect([...POCKET_BLOCKS].filter((b) => (STEP4_BLOCKS as readonly string[]).includes(b))).toEqual([...STEP4_BLOCKS]);
  });
});

describe("the records: placeholders, refused by name until recorded (plan §1.1)", () => {
  it("every step-5 literal is a placeholder in this build", () => {
    expect(POCKET_1_S5A_LEAVES).toBeUndefined();
    expect(POCKET_1_S5A_DIGEST).toBeUndefined();
    expect(POCKET_1_S5A_FIT_DIGEST).toBeUndefined();
    expect(POCKET_1_S5B_OVERLAY).toBeUndefined();
    expect(POCKET_1_S5B_DIGEST).toBeUndefined();
  });

  it("rulesTunables refuses each step-5 name with its named message; every other name plays", () => {
    expect(step5RulesRefusal("pocket-1.s5a")).toBe(S5A_REFUSAL);
    expect(step5RulesRefusal("pocket-1.s5b")).toBe(S5B_REFUSAL);
    for (const name of ENGINE_RULES) expect(step5RulesRefusal(name), name).toBeUndefined();
    for (const [name, message] of [["pocket-1.s5a", S5A_REFUSAL], ["pocket-1.s5b", S5B_REFUSAL]] as const) {
      expect(() => rulesTunables(name), name).toThrow(EngineRulesError);
      expect(() => rulesTunables(name), name).toThrow(message);
      // Refused every time, never built and cached.
      expect(() => rulesTunables(name), name).toThrow(message);
    }
    for (const name of ENGINE_RULES) expect(rulesTunables(name), name).toBeDefined();
  });

  it("no run, export, season or save names either: the command line, the season, the export and a save refuse them", () => {
    for (const name of STEP5_RULES) {
      expect(() => parseExportArgs(["--seed", "a", "--engine-rules", name]), name).toThrow(/^--engine-rules must be one of /);
      expect(() => seasonRules(undefined, name), name).toThrow(/^season --engine-rules: engine rules ".*" are not in this build/);
      expect(() => exportGame({ seed: "adr-089:s5", engineRules: name }), name).toThrow(/^exportGame: engine rules ".*" are not in this build/);
      expect(() => rulesOfSave({ engineRules: `${name}@fnv1a:1a2b3c4d` }), name).toThrow(`This save was played with engine rules ${name}, which this version does not have`);
      expect(() => rulesOfSave({ engineRules: name }), name).toThrow(/^This save's engine rules ".*" are malformed/);
    }
  });

  it("moves no default: DEFAULT_TUNABLES and the s1 to s4 bundles carry no clean-pocket key, and their digests stand", () => {
    for (const t of [DEFAULT_TUNABLES, ...ENGINE_RULES.filter((r) => r !== "legacy").map((r) => rulesTunables(r))]) {
      expect("cleanPocket" in t.pocket).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(t.pocket, "cleanPocket")).toBe(false);
    }
    expect(engineRulesDigestOf("pocket-1.s1")).toBe("fnv1a:69a7cc48");
    expect(engineRulesDigestOf("pocket-1.s2")).toBe("fnv1a:03754f60");
    expect(engineRulesDigestOf("pocket-1.s3")).toBe("fnv1a:c4462712");
    expect(engineRulesDigestOf("pocket-1.s4")).toBe("fnv1a:8edb4bad");
    expect(overlayDigestOf(rulesTunables("pocket-1.s4"))).toBe(POCKET_1_S4_DIGEST);
  });
});

describe("the recipe: step5Bundle, readSystemDeltaLeaves, step5OverlayAt (plan §1.1, §5.0)", () => {
  it("readSystemDeltaLeaves patches only the moved deltas, against the base's values, in the fit's order", () => {
    expect([...READ_SYSTEMS]).toEqual(["HALF_FIELD", "FULL_FIELD", "CONCEPT"]);
    expect(readSystemDeltaLeaves(NO_READ_SYSTEM_OFFSETS)).toEqual([]);
    const moved = readSystemDeltaLeaves({ HALF_FIELD: 0.75, FULL_FIELD: 0, CONCEPT: -0.25 }, horizons());
    expect(moved.map((l) => [l.tunableId, l.currentValue, l.proposedValue])).toEqual([
      ["qb.readSystem.HALF_FIELD.budgetDeltaSeconds", -0.5, 0.25],
      ["qb.readSystem.CONCEPT.budgetDeltaSeconds", -1.0, -1.25],
    ]);
    const all = readSystemDeltaLeaves({ HALF_FIELD: 3.0, FULL_FIELD: 3.0, CONCEPT: 3.0 });
    expect(all.map((l) => l.proposedValue)).toEqual([2.5, 4.0, 2.0]);
    expect(Object.isFrozen(all)).toBe(true);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => readSystemDeltaLeaves({ ...NO_READ_SYSTEM_OFFSETS, FULL_FIELD: bad })).toThrow(`readSystemDeltaLeaves: the FULL_FIELD offset must be a finite number of seconds, got ${String(bad)}`);
    }
  });

  it("step5Bundle(s5a, leaves) is pocket-1.s4 plus the block and the deltas, stamped at a digest of its own, frozen and accepted", () => {
    const s4 = rulesTunables("pocket-1.s4");
    const plain = step5Bundle("pocket-1.s5a", []);
    expect(plain.engineRules).toEqual({ name: "pocket-1.s5a", overlayDigest: overlayDigestOf(plain) });
    expect(plain.engineRules?.overlayDigest).not.toBe(POCKET_1_S4_DIGEST);
    for (const [path, node] of nodes(plain)) expect(Object.isFrozen(node), path).toBe(true);
    expect(plain.pocket.cleanPocket).toEqual(POCKET_1_S5A_CLEAN_POCKET);
    const before = leaves(s4);
    const moved = [...leaves(plain)].filter(([p, v]) => before.get(p) !== v).map(([p]) => p);
    expect(moved.every((p) => p.startsWith("pocket.cleanPocket.") || p.startsWith("engineRules.")), moved.join(", ")).toBe(true);
    expect([...before.keys()].filter((p) => !leaves(plain).has(p))).toEqual([]);
    expect(checkStamp(plain, "pocket-1.s5a", "w")).toBe(plain);
    // With deltas: only the three leaves move beside the block.
    const offsets = { HALF_FIELD: 0.5, FULL_FIELD: 0.25, CONCEPT: 1.0 };
    const fitted = step5Bundle("pocket-1.s5a", readSystemDeltaLeaves(offsets, horizons()));
    const plainLeaves = leaves(plain);
    const movedByDeltas = [...leaves(fitted)].filter(([p, v]) => plainLeaves.get(p) !== v).map(([p]) => p).sort();
    expect(movedByDeltas).toEqual(["engineRules.overlayDigest", ...READ_SYSTEMS.map((s) => `qb.readSystem.${s}.budgetDeltaSeconds`)].sort());
    expect(fitted.qb.readSystem.HALF_FIELD.budgetDeltaSeconds).toBe(0);
    expect(fitted.qb.readSystem.FULL_FIELD.budgetDeltaSeconds).toBe(1.25);
    expect(fitted.qb.readSystem.CONCEPT.budgetDeltaSeconds).toBe(0);
    expect(checkStamp(fitted, "pocket-1.s5a", "w")).toBe(fitted);
    // A patch after stamping is refused, as for every bundle.
    const stale = applyTunablePatch(fitted, { tunableId: "qb.readSystem.CONCEPT.budgetDeltaSeconds", currentValue: 0, proposedValue: 0.25, evidence: "test", expectedEffect: "test" });
    expect(() => checkStamp(stale, "pocket-1.s5a", "w")).toThrow(/^w: the tunables are stamped pocket-1\.s5a at overlay fnv1a:[0-9a-f]{8}, but they digest to fnv1a:[0-9a-f]{8}: a dial changed after stamping$/);
  });

  it("step5OverlayAt swaps the block clock; at S theta 11 it is s5a's overlay, so s5b's digest equals s5a's and only the name differs", () => {
    const beatClock = POCKET_1_S5A_OVERLAY.beatClock!;
    const same = step5OverlayAt({ beatClock });
    expect(same).toEqual(POCKET_1_S5A_OVERLAY);
    for (const [path, node] of nodes(same)) expect(Object.isFrozen(node), path).toBe(true);
    const a = step5Bundle("pocket-1.s5a", []);
    const b = step5Bundle("pocket-1.s5b", [], same);
    expect(b.engineRules?.name).toBe("pocket-1.s5b");
    expect(b.engineRules?.overlayDigest).toBe(a.engineRules?.overlayDigest);
    const { engineRules: _a, ...aDials } = a;
    const { engineRules: _b, ...bDials } = b;
    expect(bDials).toEqual(aDials);
    expect(checkStamp(b, "pocket-1.s5b", "w")).toBe(b);
    // Another theta, and shape L at R 6 (the window goes with S's clock; the card stays).
    const theta9 = step5OverlayAt({ beatClock: { ...beatClock, thetaSeconds: 9 } });
    expect(theta9.beatClock?.thetaSeconds).toBe(9);
    const l6 = step5OverlayAt({ repClock: { fullExpressionSeconds: 6 } });
    expect(l6.beatClock).toBeUndefined();
    expect(l6.repClock).toEqual({ fullExpressionSeconds: 6 });
    expect(l6.approach).toEqual(card);
    expect(l6.pocket).toEqual(POCKET_1_S5A_OVERLAY.pocket);
    const built = [a, step5Bundle("pocket-1.s5a", [], theta9), step5Bundle("pocket-1.s5a", [], l6), step5Bundle("pocket-1.s5b", [], l6)];
    for (const t of built) expect(checkStamp(t, t.engineRules!.name as StampedRules, "w")).toBe(t);
    expect(new Set(built.map((t) => t.engineRules?.overlayDigest)).size).toBe(3);
    expect(() => step5OverlayAt({} as never)).toThrow("step5OverlayAt: a step-5 overlay runs one block clock, passRush.beatClock (shape S) or passRush.repClock (shape L)");
    expect(() => step5OverlayAt({ beatClock, repClock: { fullExpressionSeconds: 6 } } as never)).toThrow(/^step5OverlayAt: a step-5 overlay runs one block clock/);
  });
});

describe("the clean-pocket block under each name (plan §1.2)", () => {
  it("refuses it under pocket-1.s1 to pocket-1.s4 (noStep5), and under legacy", () => {
    const step5 = "carries no step-5 block (pocket.cleanPocket); his count's clean-pocket checklist and the drop floor are pocket-1.s5a's and pocket-1.s5b's (ADR-089 step 5)";
    const cases: [string, () => unknown, string][] = [
      ["pocket-1.s1", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", { ...POCKET_1_S1_OVERLAY, pocket: { cleanPocket: POCKET_1_S5A_CLEAN_POCKET } }), `withOverlay(pocket-1.s1): pocket-1.s1 ${step5}`],
      ["pocket-1.s2", () => withOverlay(horizons(), "pocket-1.s2", { ...POCKET_1_S1_OVERLAY, pocket: { cleanPocket: POCKET_1_S5A_CLEAN_POCKET } }, POCKET_1_S2_FORCING), `withOverlay(pocket-1.s2): pocket-1.s2 ${step5}`],
      ["pocket-1.s3", () => withOverlay(horizons(), "pocket-1.s3", { ...POCKET_1_S3_OVERLAY, pocket: { climbLane: "FRONT", cleanPocket: POCKET_1_S5A_CLEAN_POCKET } }, POCKET_1_S2_FORCING), `withOverlay(pocket-1.s3): pocket-1.s3 ${step5}`],
      ["pocket-1.s4", () => withOverlay(horizons(), "pocket-1.s4", POCKET_1_S5A_OVERLAY, POCKET_1_S2_FORCING), `withOverlay(pocket-1.s4): pocket-1.s4 ${step5}`],
      ["pocket-1.s4, the block alone", () => withOverlay(horizons(), "pocket-1.s4", { ...POCKET_1_S1_OVERLAY, pocket: { cleanPocket: ALL_OFF } }, POCKET_1_S2_FORCING), `withOverlay(pocket-1.s4): pocket-1.s4 ${step5}`],
    ];
    for (const [label, run, message] of cases) {
      expect(run, label).toThrow(EngineRulesError);
      expect(run, label).toThrow(message);
    }
    // checkStamp refuses the same tree stamped by hand with a right digest.
    const unstamped = { ...horizons(), passRush: { ...horizons().passRush, ...POCKET_1_S1_OVERLAY }, pocket: { ...horizons().pocket, forcing: POCKET_1_S2_FORCING, cleanPocket: POCKET_1_S5A_CLEAN_POCKET } } as Tunables;
    expect(() => checkStamp(byHand(unstamped, "pocket-1.s4"), "pocket-1.s4", "runBatch")).toThrow(`runBatch: pocket-1.s4 ${step5}`);
    expect(checkStamp(byHand(unstamped, "pocket-1.s5a"), "pocket-1.s5a", "runBatch").engineRules?.name).toBe("pocket-1.s5a");
    const legacyWith = { ...DEFAULT_TUNABLES, pocket: { ...DEFAULT_TUNABLES.pocket, cleanPocket: POCKET_1_S5A_CLEAN_POCKET } } as Tunables;
    expect(() => checkStamp(legacyWith, "legacy", "w")).toThrow("w: the run names engine rules legacy, but the tunables carry pocket.cleanPocket with no rules stamp");
    expect(() => withOverlay(legacyWith, "pocket-1.s5a", POCKET_1_S1_OVERLAY)).toThrow("withOverlay(pocket-1.s5a): the base already carries pocket.cleanPocket; a bundle's blocks come from its overlay");
  });

  it("refuses it with no block clock (kind T and none), with the engine's words, here and in the engine", () => {
    const kindTWords = "the clean-pocket block (pocket.cleanPocket) on today's line plus contact (kind T), which has no block clock; it is read on shapes S and L only";
    const noClockWords = "the clean-pocket block (pocket.cleanPocket) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule, read on shapes S and L only";
    const t = { approach: card, pocket: { contact: POCKET_1_S4_CONTACT, cleanPocket: POCKET_1_S5A_CLEAN_POCKET } } as PocketOverlay;
    expect(() => withOverlay(DEFAULT_TUNABLES, "pocket-1.s4", t)).toThrow(`withOverlay(pocket-1.s4): ${kindTWords}`);
    expect(() => withOverlay(DEFAULT_TUNABLES, "pocket-1.s5a", t)).toThrow(`withOverlay(pocket-1.s5a): ${kindTWords}`);
    expect(() => withOverlay(DEFAULT_TUNABLES, "pocket-1.s5a", { approach: card, pocket: { cleanPocket: POCKET_1_S5A_CLEAN_POCKET } })).toThrow(`withOverlay(pocket-1.s5a): ${noClockWords}`);
    const handT = byHand({ ...DEFAULT_TUNABLES, passRush: { ...DEFAULT_TUNABLES.passRush, approach: card }, pocket: { ...DEFAULT_TUNABLES.pocket, contact: POCKET_1_S4_CONTACT, cleanPocket: POCKET_1_S5A_CLEAN_POCKET } } as Tunables, "pocket-1.s4");
    expect(isTodaysLinePlusContact(handT)).toBe(false);
    expect(() => checkStamp(handT, "pocket-1.s4", "w")).toThrow(`w: ${kindTWords}`);
    const e = thrown(() => playThroughEngine(handT));
    expect(e.name).toBe("PocketRulesError");
    expect(e.message).toBe(`@ff/engine: ${kindTWords}`);
  }, 60_000);

  it("under pocket-1.s5a and pocket-1.s5b, any subset of the step-3 to step-5 blocks is a bundle at its own digest", () => {
    const L = { repClock: { fullExpressionSeconds: 5 }, approach: card };
    const built = [
      withOverlay(horizons(), "pocket-1.s5a", POCKET_1_S5A_OVERLAY, POCKET_1_S2_FORCING),
      withOverlay(horizons(), "pocket-1.s5a", s4With(ALL_OFF), POCKET_1_S2_FORCING),
      withOverlay(horizons(), "pocket-1.s5a", { ...POCKET_1_S1_OVERLAY, pocket: { cleanPocket: POCKET_1_S5A_CLEAN_POCKET } }, POCKET_1_S2_FORCING),
      withOverlay(horizons(), "pocket-1.s5a", { ...L, pocket: { cleanPocket: { ...ALL_OFF, dropFloor: POCKET_1_S5A_DROP_FLOOR } } }, POCKET_1_S2_FORCING),
      withOverlay(horizons(), "pocket-1.s5a", POCKET_1_S4_OVERLAY, POCKET_1_S2_FORCING),
      withOverlay(horizons(), "pocket-1.s5b", POCKET_1_S5A_OVERLAY, POCKET_1_S2_FORCING),
    ];
    expect(new Set(built.map((t) => t.engineRules?.overlayDigest)).size).toBe(built.length - 1);
    for (const t of built) expect(checkStamp(t, t.engineRules!.name as StampedRules, "w")).toBe(t);
    expect(built[1]!.pocket.cleanPocket).toEqual(ALL_OFF);
    expect("dropFloor" in built[1]!.pocket.cleanPocket!).toBe(false);
  });
});

describe("the block's dials (plan §1.2): refused here first, and by the engine, with the same words", () => {
  const cases: [string, unknown, string][] = [
    ["not an object", 5, "the clean-pocket block (pocket.cleanPocket) must be an object, got 5"],
    ["d23 a word", { ...POCKET_1_S5A_CLEAN_POCKET, d23: "yes" }, "pocket.cleanPocket.d23 must be true or false, got yes"],
    ["move missing", (({ move: _m, ...rest }) => rest)(POCKET_1_S5A_CLEAN_POCKET), "pocket.cleanPocket.move must be true or false, got undefined"],
    ["d23OnRun a number", { ...POCKET_1_S5A_CLEAN_POCKET, d23OnRun: 1 }, "pocket.cleanPocket.d23OnRun must be true or false, got 1"],
    ["the bar 25", { ...POCKET_1_S5A_CLEAN_POCKET, expiryBar: 25 }, "pocket.cleanPocket.expiryBar must be 30 (D23's bar), got 25"],
    ["the reset below 0", { ...POCKET_1_S5A_CLEAN_POCKET, resetSeconds: -1 }, "pocket.cleanPocket.resetSeconds must be a finite number, 0 or more, got -1"],
    ["the reset off the tenth", { ...POCKET_1_S5A_CLEAN_POCKET, resetSeconds: 0.75 }, "pocket.cleanPocket.resetSeconds must be a whole number of tenths of a second (the restated budget is rounded to the tenth), got 0.75"],
    ["the floor a number", { ...POCKET_1_S5A_CLEAN_POCKET, dropFloor: 1 }, "pocket.cleanPocket.dropFloor must be an object { QUICK, SHORT, INTERMEDIATE, DEEP }, got 1"],
    ["the floor's SHORT 1.0", { ...POCKET_1_S5A_CLEAN_POCKET, dropFloor: { ...POCKET_1_S5A_DROP_FLOOR, SHORT: 1.0 } }, "pocket.cleanPocket.dropFloor.SHORT must be 1.5 (the drop floor is CHOSEN, ADR-089 §4.6), got 1"],
    ["the floor's DEEP missing", { ...POCKET_1_S5A_CLEAN_POCKET, dropFloor: { QUICK: 1.0, SHORT: 1.5, INTERMEDIATE: 2.0 } }, "pocket.cleanPocket.dropFloor.DEEP must be 2 (the drop floor is CHOSEN, ADR-089 §4.6), got undefined"],
  ];
  const unstamped = (block: unknown): Tunables => {
    const t = withOverlay(horizons(), "pocket-1.s4", POCKET_1_S4_OVERLAY, POCKET_1_S2_FORCING);
    const { engineRules: _stamp, ...dials } = t;
    return { ...dials, pocket: { ...dials.pocket, cleanPocket: block as PocketCleanPocket } } as Tunables;
  };

  it("withOverlay and checkStamp refuse each bad dial before any game", () => {
    for (const [label, block, message] of cases) {
      expect(() => withOverlay(horizons(), "pocket-1.s5a", s4With(block), POCKET_1_S2_FORCING), label).toThrow(EngineRulesError);
      expect(() => withOverlay(horizons(), "pocket-1.s5a", s4With(block), POCKET_1_S2_FORCING), label).toThrow(`withOverlay(pocket-1.s5a): ${message}`);
      expect(() => checkStamp(byHand(unstamped(block), "pocket-1.s5a"), "pocket-1.s5a", "runBatch"), label).toThrow(`runBatch: ${message}`);
    }
    // The design's block, every part off, and E10's reset 0 pass.
    for (const block of [POCKET_1_S5A_CLEAN_POCKET, ALL_OFF, { ...POCKET_1_S5A_CLEAN_POCKET, resetSeconds: 0 }]) {
      const t = withOverlay(horizons(), "pocket-1.s5a", s4With(block), POCKET_1_S2_FORCING);
      expect(checkStamp(t, "pocket-1.s5a", "w")).toBe(t);
    }
  });

  it("the engine refuses the same hand-stamped trees with the same words (played through its barrel)", () => {
    for (const [label, block, message] of cases) {
      const e = thrown(() => playThroughEngine(byHand(unstamped(block), "pocket-1.s5a")));
      expect(e.name, label).toBe("PocketRulesError");
      expect(e.message, label).toBe(`@ff/engine: ${message}`);
    }
  }, 120_000);
});

describe("runOneGame takes a step-5 stamp (the harness's arms), and refuses a name this build does not stamp", () => {
  const index = indexLeague(buildFlatLeague({ teams: 2 }));
  const [home, away] = index.teamIds();
  const fixture = buildFixtures(index, { kind: "SYNTHETIC_PAIR", home: home!, away: away!, games: 1, season: 2024 })[0]!;
  const game = (tunables: Tunables) => runOneGame({ built: buildFixture(index, fixture), seed: "adr-089:s5-stamp", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, tunables });

  it("plays a tree stamped pocket-1.s5a or pocket-1.s5b and stamps its plays with it", () => {
    for (const name of STEP5_RULES) {
      const t = step5Bundle(name, []);
      const events = game(t).observation.events;
      const stamps = new Set(
        events.filter(({ event }) => event.type === "PLAY_START").flatMap(({ event }) => {
          const rules = (event.payload as { readonly rules?: { readonly name?: string } } | undefined)?.rules;
          return rules?.name === undefined ? [] : [rules.name];
        }),
      );
      expect([...stamps], name).toEqual([name]);
    }
    const unknown: Tunables = { ...step5Bundle("pocket-1.s5a", []), engineRules: { name: "pocket-1.s9", overlayDigest: "fnv1a:00000000" } };
    expect(() => game(unknown)).toThrow(/^runOneGame: engine rules "pocket-1\.s9" are not in this build/);
  }, 60_000);
});
