/**
 * ADR-089 step 6: `pocket-1.s6`, ITS PETITIONS IN (P21 ASIDE), REFUSED BY NAME UNTIL RECORDED
 * (`src/pocket/rules.ts`, `src/pocket/oneThreatBench.ts`; step-6 plan §1.1, §1.2's calibration
 * bullets, §3.2 K1).
 *
 *  1. The name: a stamped name (`STAMPED_RULES`, the `OverlayRules` union) and step 6's
 *     (`pocketStepOf` 6), not in `ENGINE_RULES`; `rulesTunables` refuses it by name while
 *     `POCKET_1_S6_DIGEST` is unset, and a run, an export or a save cannot name it.
 *  2. The block: the closed sets and keys are the engine's; `outsBlockOf` builds any part list under
 *     any option of the owner's three questions, the recommended option by default (HOLD,
 *     ZERO_GAIN_ONLY, SEEN); `POCKET_1_S6_OUTS` is every part on at the recommended options.
 *  3. The bundle: `step6Bundle` is F5's tree (`pocket-1.s5a` on the league at S theta 11) plus the
 *     block, at a digest of its own, under every option (20 bundles, 20 digests); `DEFAULT_TUNABLES`
 *     carries no `outs` key and digests as filed; the s1 to s5a bundles carry no block.
 *  4. The names and the block: no name before step 6's carries it (`noStep6`, `pocket-1.s5b`
 *     included), legacy and kind T carry none; under `pocket-1.s6` any subset of the step-3 to step-6
 *     blocks is a bundle (the block alone, every part off, on shape L).
 *  5. The dials: each refusal the engine makes (`checkOuts`), made here first with the engine's
 *     words, and the engine (played through its barrel) refuses the same hand-stamped tree with them.
 *  6. The gate: P9 to P12 and P20 are in contracts since the lift, so `checkStamp` passes every tree
 *     carrying the block under the seen answer, and a calibration game under the bundle plays and
 *     writes step 6's records on its stream; a test's own petitions, withheld, shut it: every tree
 *     carrying the block while any of P9 to P12 is withheld, every part off included, naming the
 *     missing ones, and the caught escape as contact while P20 is. P21 is out in this build (the
 *     owner answered "Seen for now"), so the unseen answer is refused by name, here, through the
 *     engine's barrel with its own words, and in `runOneGame` before any play.
 *  7. The flags: calibration's six (P9 to P12, P20, P21) are the engine's, each declared once as a
 *     literal: P9 to P12 and P20 true, P21 false; the gate's reading of them (`step6PetitionsOut`).
 *  8. K9: the deadline pick's run margin is the filed inequality's at urgency 0 alone (1), and the
 *     same inequality at urgency 0 to 3 gives the filed Δ (10).
 *  9. The clean bench: `cleanBenchTunablesS6(parts)` is E9's tree plus the block, stamped
 *     `pocket-1.s6`, passed by `checkStamp`, and refused when a test withholds the petitions.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyTunablePatch, createMatchState, DEFAULT_TUNABLES, simulateGame, type Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { frozenCallerPair } from "../src/caller/frozen.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { stableDigest } from "../src/harness/digest.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { armById } from "../src/pocket/arms.js";
import { FILED_RUN_MARGIN, smallestRunMargin, urgencyRange } from "../src/pocket/contest.js";
import { goldenFixtures } from "../src/pocket/corpus.js";
import { cleanBenchTunablesS6 } from "../src/pocket/oneThreatBench.js";
import {
  CAUGHT_SEEN,
  checkStamp,
  ENGINE_RULES,
  engineRulesDigestOf,
  engineRulesNamed,
  EngineRulesError,
  everyOutsOptions,
  isEngineRules,
  isStampedRules,
  isStep5Rules,
  isStep6Rules,
  isTodaysLinePlusContact,
  otherScrambleStart,
  OUTS_DEADLINE_PICK,
  OUTS_ESCAPE_CAP_MAX_PER_PLAY,
  OUTS_KEYS,
  OUTS_PARTS,
  OUTS_PURSUIT,
  OUTS_SIDE_CATCH,
  OUTS_SWITCHES,
  outsBlockOf,
  overlayDigestOf,
  P10_IN_CONTRACTS,
  P11_IN_CONTRACTS,
  P12_IN_CONTRACTS,
  P20_IN_CONTRACTS,
  P21_IN_CONTRACTS,
  P9_IN_CONTRACTS,
  pocketStepOf,
  POCKET_1_S1_OVERLAY,
  POCKET_1_S2_FORCING,
  POCKET_1_S2_LEAVES,
  POCKET_1_S3_OVERLAY,
  POCKET_1_S4_CONTACT,
  POCKET_1_S4_OVERLAY,
  POCKET_1_S5A_DIGEST,
  POCKET_1_S5A_LEAVES,
  POCKET_1_S5A_OVERLAY,
  POCKET_1_S6_DIGEST,
  POCKET_1_S6_OUTS,
  POCKET_1_S6_OVERLAY,
  POCKET_1_S6_REFUSAL,
  POCKET_1_S6_RULES,
  POCKET_BLOCKS,
  readsStep4Facts,
  readsStep6Facts,
  RECOMMENDED_OUTS_OPTIONS,
  rulesTunables,
  SCRAMBLE_STARTS,
  SPENT_CHECKLISTS,
  STAMPED_RULES,
  stampedRulesNamed,
  step6Bundle,
  step6OverlayWith,
  step6PetitionsIn,
  step6PetitionsUnder,
  step6Refusal,
  step6RulesRefusal,
  STEP5_BLOCKS,
  STEP6_BLOCKS,
  STEP6_PETITION_NAMES,
  STEP6_PETITIONS_GRANTED,
  STEP6_RULES,
  withOverlay,
  type OutsOptions,
  type OutsPart,
  type PocketOuts,
  type PocketOverlay,
  type StampedRules,
} from "../src/pocket/rules.js";
import { step6PetitionsOut, STEP6_ANSWER_OPTIONS, STEP6_PETITIONS, STEP6_UNSEEN_PETITION } from "../src/pocket/step6.js";

const card = POCKET_1_S1_OVERLAY.approach!;
/** DEFAULT_TUNABLES with Half and Follows, the base `pocket-1.s2` to `pocket-1.s6` are stamped on. */
const horizons = (): Tunables => POCKET_1_S2_LEAVES.reduce(applyTunablePatch, DEFAULT_TUNABLES);
/** F5's base: Half and Follows and the 5a fit's three deltas. */
const s6Base = (): Tunables => [...POCKET_1_S2_LEAVES, ...POCKET_1_S5A_LEAVES!].reduce(applyTunablePatch, DEFAULT_TUNABLES);
/** The same dials stamped by hand with a right digest. */
const byHand = (unstamped: Tunables, name: string): Tunables => ({ ...unstamped, engineRules: { name, overlayDigest: overlayDigestOf(unstamped) } });
/** `pocket-1.s5a`'s overlay with an outs block (any value) in its `pocket`. */
const s5aWith = (block: unknown): PocketOverlay => ({ ...POCKET_1_S5A_OVERLAY, pocket: { ...POCKET_1_S5A_OVERLAY.pocket, outs: block as PocketOuts } });
/** The block with every part off. */
const ALL_OFF: PocketOuts = { throwawayRule: false, noLateHorizonSack: false, direction: false, caughtAsContact: false, drill: false, drillBySide: false, failedScrambleSack: false };
/** A tree without its stamp. */
const unstampedOf = (t: Tunables): Tunables => {
  const { engineRules: _stamp, ...dials } = t;
  return dials as Tunables;
};
/** A tree's dials without its stamp and without the outs block. */
const withoutOuts = (t: Tunables): unknown => {
  const { engineRules: _stamp, ...dials } = t;
  const { outs: _outs, ...pocket } = dials.pocket;
  return { ...dials, pocket };
};

const OUTS_WORDS =
  "the outs write an OUT_OF_POCKET throwaway, THROWAWAY.outsideTackleBox, QB_DECISION.direction and a scramble_drill CHECK";
/** checkStamp's words while P9 to P12 are out (the missing ones named). */
const gateWords = (missing: string): string =>
  `the outs block (pocket.outs) is refused before any game until petitions P9, P10, P11 and P12 are in contracts (not yet: ${missing}): ${OUTS_WORDS} (ADR-089 step 6)`;
const P20_WORDS =
  "the caught escape as contact (pocket.outs.caughtAsContact) is refused before any game until petition P20 is in contracts: " +
  "its QB_HIT's contactSeconds is the time the escape caught him, a reading QB_HIT.contactSeconds' doc does not list yet (ADR-089 step 6)";
const P21_WORDS =
  "pocket.outs.caughtSeen UNSEEN_IF_UNREGISTERED is refused before any game until petition P21 is in contracts: " +
  "QB_HIT.seen is true on every contact before ADR-089 step 7 until its doc allows a catch from a block to be unseen";
/** The engine's words for the same refusal (its `step6Gate`). */
const ENGINE_P21_WORDS =
  "pocket.outs.caughtSeen UNSEEN_IF_UNREGISTERED is refused until petition P21 is in contracts: " +
  "QB_HIT.seen is true on every contact before ADR-089 step 7 until its doc allows a catch from a block to be unseen";
/** The four petitions the block waits on, withheld: a test's own set, to see the joint gate refuse. */
const WITHHELD = { P9: false, P10: false, P11: false, P12: false } as const;
/** The bundle at the unseen answer, every other option recommended. */
const unseenBundle = (): Tunables => step6Bundle(outsBlockOf(OUTS_PARTS, { ...RECOMMENDED_OUTS_OPTIONS, seen: "UNSEEN_IF_UNREGISTERED" }));

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

/** Every object of a tree, by path. */
function nodes(value: unknown, path = "$"): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [];
  return [[path, value], ...Object.entries(value).flatMap(([k, v]) => nodes(v, `${path}.${k}`))];
}

describe("step 6's name (plan §1.1): stamped since K1, not in ENGINE_RULES, refused by name until recorded", () => {
  it("is a stamped name and step 6's; a run, an export or a save cannot name it", () => {
    expect(POCKET_1_S6_RULES).toBe("pocket-1.s6");
    expect([...STEP6_RULES]).toEqual(["pocket-1.s6"]);
    expect(isStampedRules(POCKET_1_S6_RULES)).toBe(true);
    expect(isStep6Rules(POCKET_1_S6_RULES)).toBe(true);
    expect(isEngineRules(POCKET_1_S6_RULES)).toBe(false);
    expect(STAMPED_RULES[STAMPED_RULES.length - 1]).toBe(POCKET_1_S6_RULES);
    expect([...ENGINE_RULES]).toEqual(["legacy", "pocket-1.s1", "pocket-1.s2", "pocket-1.s3", "pocket-1.s4", "pocket-1.s5a"]);
    for (const name of STAMPED_RULES) expect(isStep6Rules(name), name).toBe(name === POCKET_1_S6_RULES);
    expect(isStep5Rules(POCKET_1_S6_RULES)).toBe(false);
    expect(pocketStepOf(POCKET_1_S6_RULES)).toBe(6);
    expect(readsStep6Facts(POCKET_1_S6_RULES)).toBe(true);
    expect(readsStep4Facts(POCKET_1_S6_RULES)).toBe(true);
    for (const name of ENGINE_RULES) expect(readsStep6Facts(name), name).toBe(false);
    expect(stampedRulesNamed(POCKET_1_S6_RULES, "w")).toBe(POCKET_1_S6_RULES);
    expect(() => engineRulesNamed(POCKET_1_S6_RULES, "season --engine-rules")).toThrow(
      'season --engine-rules: engine rules "pocket-1.s6" are not in this build, which has legacy, pocket-1.s1, pocket-1.s2, pocket-1.s3, pocket-1.s4, pocket-1.s5a (ADR-089 §9)',
    );
  });

  it("rulesTunables refuses it by name before any bundle is built, while POCKET_1_S6_DIGEST is unset", () => {
    expect(POCKET_1_S6_DIGEST).toBeUndefined();
    expect(step6RulesRefusal(POCKET_1_S6_RULES)).toBe(POCKET_1_S6_REFUSAL);
    for (const name of STAMPED_RULES.filter((n) => n !== POCKET_1_S6_RULES)) expect(step6RulesRefusal(name), name).toBeUndefined();
    const e = thrown(() => rulesTunables(POCKET_1_S6_RULES));
    expect(e).toBeInstanceOf(EngineRulesError);
    expect(e.message).toBe(POCKET_1_S6_REFUSAL);
  });
});

describe("the outs block (plan §1.2): the engine's keys and closed sets, every part and every option behind a leaf", () => {
  it("restates the engine's keys, switches and closed sets in its order, the recommended option first", () => {
    expect([...OUTS_KEYS]).toEqual([
      "throwawayRule", "scrambleStart", "escapeCap", "pursuit", "noLateHorizonSack", "direction", "sideCatch", "caughtAsContact", "caughtSeen", "drill", "drillBySide", "deadlinePick", "failedScrambleSack",
    ]);
    expect([...OUTS_SWITCHES]).toEqual(["throwawayRule", "noLateHorizonSack", "direction", "caughtAsContact", "drill", "drillBySide", "failedScrambleSack"]);
    expect([...OUTS_PARTS]).toEqual(OUTS_KEYS.filter((k) => k !== "caughtSeen"));
    expect([...SPENT_CHECKLISTS]).toEqual(["HOLD", "TODAYS_PATH", "SECOND_ESCAPE", "BELOW_30", "CONTAINED_DOES_NOT_SPEND"]);
    expect([...SCRAMBLE_STARTS]).toEqual(["ZERO_GAIN_ONLY", "EVERY_RUN"]);
    expect([...CAUGHT_SEEN]).toEqual(["SEEN", "UNSEEN_IF_UNREGISTERED"]);
    expect(RECOMMENDED_OUTS_OPTIONS).toEqual({ spentChecklist: SPENT_CHECKLISTS[0], scrambleStart: SCRAMBLE_STARTS[0], seen: CAUGHT_SEEN[0] });
    expect(OUTS_ESCAPE_CAP_MAX_PER_PLAY).toBe(1);
    expect(OUTS_PURSUIT).toEqual({ speedBaseline: 70, speedDivisor: 5, mobilityDivisor: 10, mobilityCentering: 7 });
    expect(OUTS_SIDE_CATCH).toEqual({ perLiveThreat: 10, perUnregistered: 15 });
    expect(OUTS_DEADLINE_PICK).toEqual({ runMargin: 1 });
    // The engine's source declares the same lists, in the same order (they are off its barrel, in
    // sim/pocketRules.ts, so they are read as text; a list that differs fails here, not in a game).
    const engine = readFileSync(fileURLToPath(new URL("../../engine/src/sim/pocketRules.ts", import.meta.url)), "utf8");
    const listed = (name: string): string[] => {
      const found = [...engine.matchAll(new RegExp(`^const ${name}(?:: readonly \\w+\\[\\])? = \\[([^\\]]*)\\]`, "gm"))];
      expect(found, `the engine declares ${name} once`).toHaveLength(1);
      return found[0]![1]!.split(",").map((x) => x.trim().replace(/^"|"$/g, "")).filter((x) => x.length > 0);
    };
    for (const [name, list] of [
      ["OUTS_SWITCHES", OUTS_SWITCHES],
      ["OUTS_KEYS", OUTS_KEYS],
      ["SPENT_CHECKLISTS", SPENT_CHECKLISTS],
      ["SCRAMBLE_STARTS", SCRAMBLE_STARTS],
      ["CAUGHT_SEEN", CAUGHT_SEEN],
    ] as const) {
      expect(listed(name), name).toEqual([...list]);
    }
    // The step-6 gate's answer options are these sets themselves.
    expect(STEP6_ANSWER_OPTIONS.spentChecklist).toBe(SPENT_CHECKLISTS);
    expect(STEP6_ANSWER_OPTIONS.scrambleStart).toBe(SCRAMBLE_STARTS);
    expect(STEP6_ANSWER_OPTIONS.seen).toBe(CAUGHT_SEEN);
  });

  it("outsBlockOf builds the recommended options by default, each part alone, every part off, and refuses an unknown or a repeated part", () => {
    expect(outsBlockOf([])).toEqual(ALL_OFF);
    expect(POCKET_1_S6_OUTS).toEqual({
      throwawayRule: true,
      scrambleStart: "ZERO_GAIN_ONLY",
      escapeCap: { maxPerPlay: 1, whenSpent: "HOLD" },
      pursuit: OUTS_PURSUIT,
      noLateHorizonSack: true,
      direction: true,
      sideCatch: OUTS_SIDE_CATCH,
      caughtAsContact: true,
      caughtSeen: "SEEN",
      drill: true,
      drillBySide: true,
      deadlinePick: OUTS_DEADLINE_PICK,
      failedScrambleSack: true,
    });
    expect(outsBlockOf(OUTS_PARTS)).toEqual(POCKET_1_S6_OUTS);
    expect(Object.keys(POCKET_1_S6_OUTS)).toEqual([...OUTS_KEYS]);
    for (const [path, node] of nodes(POCKET_1_S6_OUTS)) expect(Object.isFrozen(node), path).toBe(true);
    const objects: Partial<Record<OutsPart, unknown>> = {
      scrambleStart: "ZERO_GAIN_ONLY",
      escapeCap: { maxPerPlay: 1, whenSpent: "HOLD" },
      pursuit: OUTS_PURSUIT,
      sideCatch: OUTS_SIDE_CATCH,
      deadlinePick: OUTS_DEADLINE_PICK,
    };
    for (const part of OUTS_PARTS) {
      const block = outsBlockOf([part]) as unknown as Record<string, unknown>;
      const expected: Record<string, unknown> = { ...ALL_OFF, ...(part in objects ? { [part]: objects[part] } : { [part]: true }), ...(part === "caughtAsContact" ? { caughtSeen: "SEEN" } : {}) };
      expect(block, part).toEqual(expected);
    }
    expect(() => outsBlockOf(["drill", "drill"])).toThrow("outsBlockOf: the part drill is named twice");
    expect(() => outsBlockOf(["caughtSeen" as OutsPart])).toThrow(/^outsBlockOf: no outs part caughtSeen \(throwawayRule, /);
  });

  it("builds every option of the owner's three questions behind its leaf (20 combinations, the recommended first), and the other scramble start", () => {
    const all = everyOutsOptions();
    expect(all).toHaveLength(SPENT_CHECKLISTS.length * SCRAMBLE_STARTS.length * CAUGHT_SEEN.length);
    expect(all).toHaveLength(20);
    expect(all[0]).toEqual(RECOMMENDED_OUTS_OPTIONS);
    expect(new Set(all.map((o) => JSON.stringify(o))).size).toBe(20);
    for (const o of all) {
      const b = outsBlockOf(OUTS_PARTS, o);
      expect(b.escapeCap?.whenSpent).toBe(o.spentChecklist);
      expect(b.scrambleStart).toBe(o.scrambleStart);
      expect(b.caughtSeen).toBe(o.seen);
      // A part list without the option's part carries no leaf for it.
      const none = outsBlockOf(OUTS_PARTS.filter((p) => p !== "escapeCap" && p !== "scrambleStart" && p !== "caughtAsContact"), o);
      expect("escapeCap" in none || "scrambleStart" in none || "caughtSeen" in none).toBe(false);
    }
    expect(otherScrambleStart("ZERO_GAIN_ONLY")).toBe("EVERY_RUN");
    expect(otherScrambleStart("EVERY_RUN")).toBe("ZERO_GAIN_ONLY");
    expect(() => otherScrambleStart("SOMETIMES" as never)).toThrow("otherScrambleStart: SOMETIMES is not one of ZERO_GAIN_ONLY, EVERY_RUN");
  });
});

describe("the bundle (plan §1.1): F5's tree plus the outs block, at its own digest, under every option", () => {
  it("step6Bundle is pocket-1.s5a's recorded bundle (F5's dials) plus POCKET_1_S6_OUTS, stamped pocket-1.s6 at a digest of its own", () => {
    const s6 = step6Bundle();
    expect(s6.engineRules?.name).toBe(POCKET_1_S6_RULES);
    expect(s6.engineRules?.overlayDigest).toBe(overlayDigestOf(s6));
    expect(s6.pocket.outs).toEqual(POCKET_1_S6_OUTS);
    for (const [path, node] of nodes(s6)) expect(Object.isFrozen(node), path).toBe(true);
    // F5's tree: pocket-1.s5a on the league at S theta 11, its digest the recorded fnv1a:972b8b3b.
    const f5 = armById("F5");
    expect(f5.digest).toBe(POCKET_1_S5A_DIGEST);
    expect(withoutOuts(s6)).toEqual(unstampedOf(f5.tunables));
    expect(stableDigest(withoutOuts(s6))).toBe(POCKET_1_S5A_DIGEST);
    expect(withoutOuts(s6)).toEqual(unstampedOf(rulesTunables("pocket-1.s5a")));
    expect(s6.engineRules?.overlayDigest).not.toBe(POCKET_1_S5A_DIGEST);
    expect(POCKET_1_S6_OVERLAY).toEqual(s5aWith(POCKET_1_S6_OUTS));
    for (const [path, node] of nodes(POCKET_1_S6_OVERLAY)) expect(Object.isFrozen(node), path).toBe(true);
    expect("outs" in POCKET_1_S5A_OVERLAY.pocket!).toBe(false);
  });

  it("builds under every option, each at its own digest, and every part off at another", () => {
    const digests = everyOutsOptions().map((o) => step6Bundle(outsBlockOf(OUTS_PARTS, o)).engineRules!.overlayDigest);
    expect(digests[0]).toBe(step6Bundle().engineRules!.overlayDigest);
    expect(new Set(digests).size).toBe(20);
    const off = step6Bundle(outsBlockOf([]));
    expect(off.pocket.outs).toEqual(ALL_OFF);
    expect(digests.includes(off.engineRules!.overlayDigest)).toBe(false);
    expect(withoutOuts(off)).toEqual(withoutOuts(step6Bundle()));
  });

  it("switched off means switched off: DEFAULT_TUNABLES carries no outs key and digests as filed; no earlier bundle carries the block", () => {
    expect("outs" in DEFAULT_TUNABLES.pocket).toBe(false);
    expect(stableDigest(DEFAULT_TUNABLES)).toBe("fnv1a:395a9ae2");
    expect(rulesTunables("legacy")).toBe(DEFAULT_TUNABLES);
    for (const name of ENGINE_RULES.filter((n) => n !== "legacy")) {
      const t = rulesTunables(name);
      expect("outs" in t.pocket, name).toBe(false);
      expect(t.engineRules?.overlayDigest, name).toBe(engineRulesDigestOf(name));
    }
    expect([...STEP6_BLOCKS]).toEqual(["pocket.outs"]);
    expect([...POCKET_BLOCKS].slice(-1)).toEqual([...STEP6_BLOCKS]);
    expect([...POCKET_BLOCKS].slice(-2, -1)).toEqual([...STEP5_BLOCKS]);
  });
});

describe("the outs block under each name (plan §1.2)", () => {
  const step6 = "carries no step-6 block (pocket.outs); the outs (ADR-089 §4.6 e and f, §4.7) are pocket-1.s6's (ADR-089 step 6)";

  it("refuses it under pocket-1.s1 to pocket-1.s5b (noStep6), and under legacy", () => {
    const cases: [string, () => unknown, string][] = [
      ["pocket-1.s1", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", { ...POCKET_1_S1_OVERLAY, pocket: { outs: POCKET_1_S6_OUTS } }), `withOverlay(pocket-1.s1): pocket-1.s1 ${step6}`],
      ["pocket-1.s2", () => withOverlay(horizons(), "pocket-1.s2", { ...POCKET_1_S1_OVERLAY, pocket: { outs: POCKET_1_S6_OUTS } }, POCKET_1_S2_FORCING), `withOverlay(pocket-1.s2): pocket-1.s2 ${step6}`],
      ["pocket-1.s3", () => withOverlay(horizons(), "pocket-1.s3", { ...POCKET_1_S3_OVERLAY, pocket: { climbLane: "FRONT", outs: POCKET_1_S6_OUTS } }, POCKET_1_S2_FORCING), `withOverlay(pocket-1.s3): pocket-1.s3 ${step6}`],
      ["pocket-1.s4", () => withOverlay(horizons(), "pocket-1.s4", { ...POCKET_1_S4_OVERLAY, pocket: { ...POCKET_1_S4_OVERLAY.pocket, outs: ALL_OFF } }, POCKET_1_S2_FORCING), `withOverlay(pocket-1.s4): pocket-1.s4 ${step6}`],
      ["pocket-1.s5a", () => withOverlay(s6Base(), "pocket-1.s5a", POCKET_1_S6_OVERLAY, POCKET_1_S2_FORCING), `withOverlay(pocket-1.s5a): pocket-1.s5a ${step6}`],
      ["pocket-1.s5b, which plays after step 6 under the played order and carries no step-6 part", () => withOverlay(s6Base(), "pocket-1.s5b", s5aWith(ALL_OFF), POCKET_1_S2_FORCING), `withOverlay(pocket-1.s5b): pocket-1.s5b ${step6}`],
    ];
    for (const [label, run, message] of cases) {
      expect(run, label).toThrow(EngineRulesError);
      expect(run, label).toThrow(message);
    }
    // checkStamp refuses the same tree stamped by hand with a right digest.
    const unstamped = unstampedOf(step6Bundle());
    expect(() => checkStamp(byHand(unstamped, "pocket-1.s5a"), "pocket-1.s5a", "runBatch", STEP6_PETITIONS_GRANTED)).toThrow(`runBatch: pocket-1.s5a ${step6}`);
    const legacyWith = { ...DEFAULT_TUNABLES, pocket: { ...DEFAULT_TUNABLES.pocket, outs: ALL_OFF } } as Tunables;
    expect(() => checkStamp(legacyWith, "legacy", "w")).toThrow("w: the run names engine rules legacy, but the tunables carry pocket.outs with no rules stamp");
    expect(() => withOverlay(legacyWith, POCKET_1_S6_RULES, POCKET_1_S5A_OVERLAY)).toThrow("withOverlay(pocket-1.s6): the base already carries pocket.outs; a bundle's blocks come from its overlay");
  });

  it("refuses it with no block clock (kind T and none), with the engine's words, here and in the engine", () => {
    const kindTWords = "the outs block (pocket.outs) on today's line plus contact (kind T), which has no block clock; it is read on shapes S and L only";
    const noClockWords = "the outs block (pocket.outs) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule, read on shapes S and L only";
    const t = { approach: card, pocket: { contact: POCKET_1_S4_CONTACT, outs: ALL_OFF } } as PocketOverlay;
    expect(() => withOverlay(DEFAULT_TUNABLES, "pocket-1.s4", t)).toThrow(`withOverlay(pocket-1.s4): ${kindTWords}`);
    expect(() => withOverlay(DEFAULT_TUNABLES, POCKET_1_S6_RULES, t)).toThrow(`withOverlay(pocket-1.s6): ${kindTWords}`);
    expect(() => withOverlay(DEFAULT_TUNABLES, POCKET_1_S6_RULES, { approach: card, pocket: { outs: ALL_OFF } })).toThrow(`withOverlay(pocket-1.s6): ${noClockWords}`);
    const handT = byHand({ ...DEFAULT_TUNABLES, passRush: { ...DEFAULT_TUNABLES.passRush, approach: card }, pocket: { ...DEFAULT_TUNABLES.pocket, contact: POCKET_1_S4_CONTACT, outs: ALL_OFF } } as Tunables, "pocket-1.s4");
    expect(isTodaysLinePlusContact(handT)).toBe(false);
    expect(() => checkStamp(handT, "pocket-1.s4", "w")).toThrow(`w: ${kindTWords}`);
    const e = thrown(() => playThroughEngine(handT));
    expect(e.name).toBe("PocketRulesError");
    expect(e.message).toBe(`@ff/engine: ${kindTWords}`);
    // Today's tunables with the block and no stamp: legacy for nobody, refused at the first pass play.
    const legacyWith = { ...DEFAULT_TUNABLES, pocket: { ...DEFAULT_TUNABLES.pocket, outs: ALL_OFF } } as Tunables;
    const l = thrown(() => playThroughEngine(legacyWith));
    expect(l.name).toBe("PocketRulesError");
    expect(l.message).toBe(`@ff/engine: ${noClockWords}`);
  }, 60_000);

  it("under pocket-1.s6, any subset of the step-3 to step-6 blocks is a bundle at its own digest", () => {
    const L = { repClock: { fullExpressionSeconds: 5 }, approach: card };
    const built = [
      step6Bundle(),
      withOverlay(s6Base(), POCKET_1_S6_RULES, step6OverlayWith(ALL_OFF), POCKET_1_S2_FORCING),
      withOverlay(horizons(), POCKET_1_S6_RULES, { ...POCKET_1_S1_OVERLAY, pocket: { outs: POCKET_1_S6_OUTS } }, POCKET_1_S2_FORCING),
      withOverlay(horizons(), POCKET_1_S6_RULES, { ...L, pocket: { outs: outsBlockOf(["escapeCap"]) } }, POCKET_1_S2_FORCING),
      withOverlay(horizons(), POCKET_1_S6_RULES, { ...POCKET_1_S1_OVERLAY, pocket: { outs: ALL_OFF } }),
      withOverlay(s6Base(), POCKET_1_S6_RULES, POCKET_1_S5A_OVERLAY, POCKET_1_S2_FORCING),
    ];
    expect(new Set(built.map((t) => t.engineRules?.overlayDigest)).size).toBe(built.length);
    for (const t of built) expect(t.engineRules?.name).toBe(POCKET_1_S6_RULES);
    for (const t of built) expect(checkStamp(t, POCKET_1_S6_RULES, "w", STEP6_PETITIONS_GRANTED)).toBe(t);
    // The one with no outs block is s5a's dials under step 6's name: checkStamp takes it with no petition.
    const noBlock = built[5]!;
    expect(noBlock.engineRules?.overlayDigest).toBe(POCKET_1_S5A_DIGEST);
    expect(checkStamp(noBlock, POCKET_1_S6_RULES, "w")).toBe(noBlock);
  });
});

describe("the block's dials (plan §1.2): refused here first, and by the engine, with the same words", () => {
  const S6 = POCKET_1_S6_OUTS as unknown as Record<string, unknown>;
  const without = (key: string): Record<string, unknown> => Object.fromEntries(Object.entries(S6).filter(([k]) => k !== key));
  const cases: [string, unknown, string][] = [
    ["not an object", 5, "the outs block (pocket.outs) must be an object, got 5"],
    ["an array", [], "the outs block (pocket.outs) must be an object, got "],
    ["a key it does not have", { ...S6, cap: 1 }, `pocket.outs.cap is not a key of the outs block (${OUTS_KEYS.join(", ")})`],
    ["a switch a word", { ...S6, throwawayRule: "yes" }, "pocket.outs.throwawayRule must be true or false, got yes"],
    ["a switch missing", without("drill"), "pocket.outs.drill must be true or false, got undefined"],
    ["the scramble start a word", { ...S6, scrambleStart: "ALWAYS" }, "the scramble start (pocket.outs.scrambleStart) is ALWAYS, which is not one of ZERO_GAIN_ONLY, EVERY_RUN"],
    ["the cap a number", { ...S6, escapeCap: 1 }, "pocket.outs.escapeCap must be an object { maxPerPlay, whenSpent }, got 1"],
    ["the cap with another key", { ...S6, escapeCap: { maxPerPlay: 1, whenSpent: "HOLD", after: 2 } }, "pocket.outs.escapeCap.after is not a key of pocket.outs.escapeCap (maxPerPlay, whenSpent)"],
    ["two escapes a play", { ...S6, escapeCap: { maxPerPlay: 2, whenSpent: "HOLD" } }, "pocket.outs.escapeCap.maxPerPlay must be 1 (one escape roll a play, ADR-089 §4.7), got 2"],
    ["the spent case a word", { ...S6, escapeCap: { maxPerPlay: 1, whenSpent: "NEVER" } }, "the spent case (pocket.outs.escapeCap.whenSpent) is NEVER, which is not one of HOLD, TODAYS_PATH, SECOND_ESCAPE, BELOW_30, CONTAINED_DOES_NOT_SPEND"],
    ["pursuit a number", { ...S6, pursuit: 3 }, "pocket.outs.pursuit must be an object { speedBaseline, speedDivisor, mobilityDivisor, mobilityCentering }, got 3"],
    ["pursuit's speed divisor 4", { ...S6, pursuit: { ...OUTS_PURSUIT, speedDivisor: 4 } }, "pocket.outs.pursuit.speedDivisor must be 5 (CHOSEN, step-6 plan §2.4), got 4"],
    ["pursuit with another key", { ...S6, pursuit: { ...OUTS_PURSUIT, extra: 1 } }, "pocket.outs.pursuit.extra is not a key of pocket.outs.pursuit (speedBaseline, speedDivisor, mobilityDivisor, mobilityCentering)"],
    ["the side-aware catch's unregistered term 10", { ...S6, sideCatch: { ...OUTS_SIDE_CATCH, perUnregistered: 10 } }, "pocket.outs.sideCatch.perUnregistered must be 15 (CHOSEN in the design, ADR-089 §4.7), got 10"],
    ["the deadline pick at today's margin", { ...S6, deadlinePick: { runMargin: 10 } }, "pocket.outs.deadlinePick.runMargin must be 1 (K9's re-derived margin: the deadline pick reads urgency 0 only), got 10"],
    [
      "the caught escape as contact with no seen",
      without("caughtSeen"),
      "pocket.outs.caughtSeen must be one of SEEN, UNSEEN_IF_UNREGISTERED when the caught escape as contact (pocket.outs.caughtAsContact) is on: it is the owner's answer for that contact's QB_HIT.seen, got undefined",
    ],
    ["seen with no caught escape as contact", { ...ALL_OFF, caughtSeen: "SEEN" }, "pocket.outs.caughtSeen without the caught escape as contact (pocket.outs.caughtAsContact): it is read only by that contact's QB_HIT"],
    ["seen a word", { ...S6, caughtSeen: "MAYBE" }, "the caught escape's seen (pocket.outs.caughtSeen) is MAYBE, which is not one of SEEN, UNSEEN_IF_UNREGISTERED"],
    ["the side-aware catch without direction", outsBlockOf(["sideCatch"]), "the side-aware catch (pocket.outs.sideCatch) without escape direction (pocket.outs.direction): it reads the side he breaks to"],
    ["the side-aware drill without direction", outsBlockOf(["drill", "drillBySide"]), "the side-aware drill (pocket.outs.drillBySide) without escape direction (pocket.outs.direction): it reads the side he breaks to"],
    ["the side-aware drill without the drill", outsBlockOf(["direction", "drillBySide"]), "the side-aware drill (pocket.outs.drillBySide) without the drill (pocket.outs.drill): it sizes the drill's burst steps"],
  ];
  const unstamped = (block: unknown): Tunables => {
    const dials = unstampedOf(step6Bundle());
    return { ...dials, pocket: { ...dials.pocket, outs: block as PocketOuts } } as Tunables;
  };

  it("withOverlay and checkStamp refuse each bad dial before any game, petitions granted or not", () => {
    for (const [label, block, message] of cases) {
      expect(() => withOverlay(s6Base(), POCKET_1_S6_RULES, s5aWith(block), POCKET_1_S2_FORCING), label).toThrow(EngineRulesError);
      expect(() => withOverlay(s6Base(), POCKET_1_S6_RULES, s5aWith(block), POCKET_1_S2_FORCING), label).toThrow(`withOverlay(pocket-1.s6): ${message}`);
      expect(() => checkStamp(byHand(unstamped(block), POCKET_1_S6_RULES), POCKET_1_S6_RULES, "runBatch", STEP6_PETITIONS_GRANTED), label).toThrow(`runBatch: ${message}`);
      expect(() => checkStamp(byHand(unstamped(block), POCKET_1_S6_RULES), POCKET_1_S6_RULES, "runBatch"), label).toThrow(`runBatch: ${message}`);
    }
    // The design's block, every part off, every part alone that needs no other, and the parts with what they need pass.
    const good: PocketOuts[] = [
      POCKET_1_S6_OUTS,
      ALL_OFF,
      ...OUTS_PARTS.filter((p) => p !== "sideCatch" && p !== "drillBySide").map((p) => outsBlockOf([p])),
      outsBlockOf(["direction", "sideCatch"]),
      outsBlockOf(["direction", "drill", "drillBySide"]),
      ...everyOutsOptions().map((o) => outsBlockOf(OUTS_PARTS, o)),
    ];
    for (const block of good) {
      const t = withOverlay(s6Base(), POCKET_1_S6_RULES, s5aWith(block), POCKET_1_S2_FORCING);
      expect(checkStamp(t, POCKET_1_S6_RULES, "w", STEP6_PETITIONS_GRANTED)).toBe(t);
    }
  });

  it("the engine refuses the same hand-stamped trees with the same words (played through its barrel)", () => {
    for (const [label, block, message] of cases) {
      const e = thrown(() => playThroughEngine(byHand(unstamped(block), POCKET_1_S6_RULES)));
      expect(e.name, label).toBe("PocketRulesError");
      expect(e.message, label).toBe(`@ff/engine: ${message}`);
    }
  }, 180_000);
});

describe("the gate (plan §1.2, §10.1; guardian-2.md): open since P9 to P12 and P20 are in contracts, P21 aside", () => {
  it("checkStamp passes every tree carrying the block under the seen answer; withheld, it refuses every one, every part off included, naming the missing ones", () => {
    for (const t of [step6Bundle(), step6Bundle(outsBlockOf([])), cleanBenchTunablesS6(OUTS_PARTS)]) {
      expect(checkStamp(t, POCKET_1_S6_RULES, "runBatch"), t.engineRules!.overlayDigest).toBe(t);
      expect(step6Refusal(t)).toBeUndefined();
      expect(() => checkStamp(t, POCKET_1_S6_RULES, "runBatch", WITHHELD), t.engineRules!.overlayDigest).toThrow(EngineRulesError);
      expect(() => checkStamp(t, POCKET_1_S6_RULES, "runBatch", WITHHELD)).toThrow(`runBatch: ${gateWords("P9, P10, P11, P12")}`);
      expect(step6Refusal(t, WITHHELD)).toBe(gateWords("P9, P10, P11, P12"));
    }
    const s6 = step6Bundle();
    expect(step6Refusal(s6, { P11: false, P12: false })).toBe(gateWords("P11, P12"));
    expect(step6Refusal(s6, { P12: false })).toBe(gateWords("P12"));
    expect(() => checkStamp(s6, POCKET_1_S6_RULES, "w", { P10: false })).toThrow(`w: ${gateWords("P10")}`);
    // With the four in, P20 gates the caught escape as contact alone; without that part P20 is not read.
    expect(step6Refusal(s6, { P20: false })).toBe(P20_WORDS);
    expect(() => checkStamp(s6, POCKET_1_S6_RULES, "w", { P20: false })).toThrow(`w: ${P20_WORDS}`);
    const noContact = step6Bundle(outsBlockOf(OUTS_PARTS.filter((p) => p !== "caughtAsContact")));
    expect(step6Refusal(noContact, { P20: false })).toBeUndefined();
    expect(checkStamp(noContact, POCKET_1_S6_RULES, "w", { P20: false })).toBe(noContact);
    // P21 gates the unseen answer alone, and it is out in this build: SEEN plays, UNSEEN is refused by name.
    const unseen = unseenBundle();
    expect(step6Refusal(unseen)).toBe(P21_WORDS);
    expect(() => checkStamp(unseen, POCKET_1_S6_RULES, "w")).toThrow(`w: ${P21_WORDS}`);
    expect(step6Refusal(s6)).toBeUndefined();
    expect(checkStamp(unseen, POCKET_1_S6_RULES, "w", STEP6_PETITIONS_GRANTED)).toBe(unseen);
    // Every option builds and passes with every petition granted, and with the build's flags every
    // option but the unseen answer passes.
    for (const o of everyOutsOptions()) {
      const t = step6Bundle(outsBlockOf(OUTS_PARTS, o));
      expect(checkStamp(t, POCKET_1_S6_RULES, "w", STEP6_PETITIONS_GRANTED), JSON.stringify(o)).toBe(t);
      if (o.seen === "UNSEEN_IF_UNREGISTERED") expect(() => checkStamp(t, POCKET_1_S6_RULES, "w"), JSON.stringify(o)).toThrow(`w: ${P21_WORDS}`);
      else expect(checkStamp(t, POCKET_1_S6_RULES, "w"), JSON.stringify(o)).toBe(t);
    }
    // A tree with no outs block is never read by the gate, under any name.
    for (const name of ENGINE_RULES) expect(step6Refusal(rulesTunables(name), WITHHELD), name).toBeUndefined();
  });

  it("a calibration game under the bundle plays, and its stream carries step 6's records", () => {
    const index = indexLeague(buildFlatLeague({ teams: 2 }));
    const [home, away] = index.teamIds();
    const fixture = buildFixtures(index, { kind: "SYNTHETIC_PAIR", home: home!, away: away!, games: 1, season: 2024 })[0]!;
    const { observation } = runOneGame({ built: buildFixture(index, fixture), seed: "adr-089:s6-stamp", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, tunables: step6Bundle() });
    const events = observation.events.map((e) => e.event);
    const throwaways = events.flatMap((e) => (e.type === "THROWAWAY" ? [e.payload] : []));
    expect(throwaways.some((t) => t.cause === "OUT_OF_POCKET" && t.outsideTackleBox === true)).toBe(true);
    expect(throwaways.some((t) => t.cause !== "OUT_OF_POCKET" && t.outsideTackleBox === false)).toBe(true);
    // P10's flag is on every throwaway of a play that reads a position, and it equals the cause.
    for (const t of throwaways) expect(t.outsideTackleBox, t.cause).toBe(t.cause === "OUT_OF_POCKET");
    expect(events.some((e) => e.type === "QB_DECISION" && e.payload.direction !== undefined)).toBe(true);
    expect(events.some((e) => e.type === "CHECK" && e.payload.checkKind === "scramble_drill")).toBe(true);
  }, 60_000);

  it("the engine plays the bundle through its barrel, and refuses the unseen answer with its own words; runOneGame refuses it before any play", () => {
    expect(() => playThroughEngine(step6Bundle())).not.toThrow();
    const e = thrown(() => playThroughEngine(unseenBundle()));
    expect(e.name).toBe("PocketRulesError");
    expect(e.message).toBe(`@ff/engine: ${ENGINE_P21_WORDS}`);
    const index = indexLeague(buildFlatLeague({ teams: 2 }));
    const [home, away] = index.teamIds();
    const fixture = buildFixtures(index, { kind: "SYNTHETIC_PAIR", home: home!, away: away!, games: 1, season: 2024 })[0]!;
    const game = (tunables: Tunables) => runOneGame({ built: buildFixture(index, fixture), seed: "adr-089:s6-stamp", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, tunables });
    expect(() => game(unseenBundle())).toThrow(`runOneGame: ${P21_WORDS}`);
  }, 60_000);
});

describe("the flags (plan §1.2; guardian-2.md): calibration's six are the engine's, P9 to P12 and P20 true, P21 false", () => {
  const ours: Readonly<Record<(typeof STEP6_PETITION_NAMES)[number], boolean>> = {
    P9: P9_IN_CONTRACTS,
    P10: P10_IN_CONTRACTS,
    P11: P11_IN_CONTRACTS,
    P12: P12_IN_CONTRACTS,
    P20: P20_IN_CONTRACTS,
    P21: P21_IN_CONTRACTS,
  };
  /** The build's state: the owner's typed yes put P9 to P12 and P20 in contracts; P21 was never asked ("Seen for now"). */
  const BUILD: Readonly<Record<(typeof STEP6_PETITION_NAMES)[number], boolean>> = { P9: true, P10: true, P11: true, P12: true, P20: true, P21: false };

  it("each is declared once as a literal, here and in the engine, and they agree (the lift turned P9 to P12 and P20 true together)", () => {
    const engineSource = readFileSync(fileURLToPath(new URL("../../engine/src/sim/pocketRules.ts", import.meta.url)), "utf8");
    const ownSource = readFileSync(fileURLToPath(new URL("../src/pocket/rules.ts", import.meta.url)), "utf8");
    expect([...STEP6_PETITION_NAMES]).toEqual(["P9", "P10", "P11", "P12", "P20", "P21"]);
    for (const name of STEP6_PETITION_NAMES) {
      const declared = (src: string): string[] => [...src.matchAll(new RegExp(`^export const ${name}_IN_CONTRACTS = (true|false);$`, "gm"))].map((x) => x[1]!);
      expect(declared(engineSource), `the engine declares ${name}_IN_CONTRACTS once, as a literal`).toHaveLength(1);
      expect(declared(ownSource), `calibration declares ${name}_IN_CONTRACTS once, as a literal`).toHaveLength(1);
      expect(ours[name], `calibration's ${name}_IN_CONTRACTS (src/pocket/rules.ts) differs from the engine's (sim/pocketRules.ts)`).toBe(declared(engineSource)[0] === "true");
      expect(String(ours[name])).toBe(declared(ownSource)[0]);
      // The build's state, not a rule: P9 to P12 and P20 in contracts, P21 not.
      expect(ours[name], name).toBe(BUILD[name]);
    }
  });

  it("step6PetitionsUnder reads them (or a test's own set), step6PetitionsIn is the joint gate on P9 to P12", () => {
    expect(step6PetitionsUnder()).toEqual(ours);
    expect(step6PetitionsUnder()).toEqual(BUILD);
    expect(step6PetitionsUnder({ P12: false })).toEqual({ ...ours, P12: false });
    expect(step6PetitionsUnder({ P21: true })).toEqual(STEP6_PETITIONS_GRANTED);
    expect(step6PetitionsUnder(STEP6_PETITIONS_GRANTED)).toEqual(STEP6_PETITIONS_GRANTED);
    expect(Object.isFrozen(step6PetitionsUnder())).toBe(true);
    expect(step6PetitionsIn()).toBe(true);
    expect(step6PetitionsIn(WITHHELD)).toBe(false);
    expect(step6PetitionsIn(STEP6_PETITIONS_GRANTED)).toBe(true);
    for (const name of ["P9", "P10", "P11", "P12"] as const) expect(step6PetitionsIn({ [name]: false }), name).toBe(false);
    for (const name of ["P20", "P21"] as const) expect(step6PetitionsIn({ ...STEP6_PETITIONS_GRANTED, [name]: false }), name).toBe(true);
  });

  it("the step-6 gate reads them: nothing it waits on is out under the seen answer, P21 under the unseen one", () => {
    expect([...STEP6_PETITIONS]).toEqual(["P9", "P10", "P11", "P12", "P20"]);
    expect(STEP6_UNSEEN_PETITION).toBe("P21");
    expect(step6PetitionsOut()).toEqual([]);
    expect(step6PetitionsOut("SEEN")).toEqual([]);
    expect(step6PetitionsOut("UNSEEN_IF_UNREGISTERED")).toEqual(["P21"]);
    expect(step6PetitionsOut("UNSEEN_IF_UNREGISTERED", STEP6_PETITIONS_GRANTED)).toEqual([]);
    expect(step6PetitionsOut(undefined, { P20: false })).toEqual(["P20"]);
    expect(step6PetitionsOut("UNSEEN_IF_UNREGISTERED", { ...WITHHELD, P20: false })).toEqual(["P9", "P10", "P11", "P12", "P20", "P21"]);
    expect(step6PetitionsOut("SEEN", WITHHELD)).toEqual(["P9", "P10", "P11", "P12"]);
  });
});

describe("K9 (plan §1.2; AM-13 runMargin): the deadline pick's run margin is the filed inequality at urgency 0", () => {
  /** The smallest whole Δ with Δ + 5u > 8u at every urgency u from lo to hi: FILED_RUN_MARGIN's inequality, from its own params. */
  const smallestDelta = (lo: number, hi: number): number => {
    const params = FILED_RUN_MARGIN.params as { readonly runPerUrgencyStep: number; readonly throwawayPerUrgencyStep: number };
    const { runPerUrgencyStep, throwawayPerUrgencyStep } = params;
    for (let delta = -100; delta <= 200; delta++) {
      let first = true;
      for (let u = lo; u <= hi; u++) if (!(delta + runPerUrgencyStep * u > throwawayPerUrgencyStep * u)) first = false;
      if (first) return delta;
    }
    throw new Error("no margin");
  };

  it("at urgency 0 alone gives the leaf's 1, and at 0 to 3 gives FILED_RUN_MARGIN.delta, 10", () => {
    expect(FILED_RUN_MARGIN.params).toMatchObject({ runPerUrgencyStep: 5, throwawayPerUrgencyStep: 8 });
    expect(FILED_RUN_MARGIN.params?.["inequality"]).toBe("Δ + 5u > 8u for every u in 0..3, so Δ > 9");
    expect(smallestDelta(0, 0)).toBe(OUTS_DEADLINE_PICK.runMargin);
    expect(smallestDelta(0, 0)).toBe(1);
    expect(smallestDelta(FILED_RUN_MARGIN.urgency[0], FILED_RUN_MARGIN.urgency[1])).toBe(FILED_RUN_MARGIN.delta);
    expect(FILED_RUN_MARGIN.delta).toBe(10);
    // The same through the step-0 derivation that reads the engine's appeals (contest.ts): the urgency
    // range the engine gives today is 0 to 3, and a tree whose range is 0 alone gives the leaf's 1.
    expect(urgencyRange()).toEqual([0, 3]);
    expect(smallestRunMargin()).toBe(FILED_RUN_MARGIN.delta);
    const pm = DEFAULT_TUNABLES.pocketMovement;
    const zero = { ...DEFAULT_TUNABLES, pocketMovement: { ...pm, urgencyHorizonSeconds: 0 } } as unknown as Tunables;
    expect(urgencyRange(zero)).toEqual([0, 0]);
    expect(smallestRunMargin({ tunables: zero })).toBe(OUTS_DEADLINE_PICK.runMargin);
    // And the bundle carries the leaf.
    expect(step6Bundle().pocket.outs?.deadlinePick).toEqual({ runMargin: smallestDelta(0, 0) });
  });
});

describe("step 6's clean bench (plan §3.2 K1, §5.2): E9's tree plus the outs block", () => {
  it("cleanBenchTunablesS6(parts) is E9's tree with the block those parts give, stamped pocket-1.s6 at a digest of its own", () => {
    const e9 = armById("E9");
    expect(e9.rules).toBe("pocket-1.s5a");
    const all = cleanBenchTunablesS6(OUTS_PARTS);
    expect(all.engineRules?.name).toBe(POCKET_1_S6_RULES);
    expect(all.engineRules?.overlayDigest).toBe(overlayDigestOf(all));
    expect(all.pocket.outs).toEqual(POCKET_1_S6_OUTS);
    expect(withoutOuts(all)).toEqual(unstampedOf(e9.tunables));
    expect(stableDigest(withoutOuts(all))).toBe(e9.digest);
    for (const [path, node] of nodes(all)) expect(Object.isFrozen(node), path).toBe(true);
    // Every part off; one part alone; another option; each at its own digest, none the league's.
    const off = cleanBenchTunablesS6([]);
    expect(off.pocket.outs).toEqual(ALL_OFF);
    expect(withoutOuts(off)).toEqual(unstampedOf(e9.tunables));
    const cap = cleanBenchTunablesS6(["escapeCap"], { ...RECOMMENDED_OUTS_OPTIONS, spentChecklist: "BELOW_30" });
    expect(cap.pocket.outs).toEqual({ ...ALL_OFF, escapeCap: { maxPerPlay: 1, whenSpent: "BELOW_30" } });
    const other: OutsOptions = { ...RECOMMENDED_OUTS_OPTIONS, scrambleStart: "EVERY_RUN" };
    expect(cleanBenchTunablesS6(OUTS_PARTS, other).pocket.outs?.scrambleStart).toBe("EVERY_RUN");
    const digests = [all, off, cap, cleanBenchTunablesS6(OUTS_PARTS, other), step6Bundle()].map((t) => t.engineRules!.overlayDigest);
    expect(new Set(digests).size).toBe(digests.length);
  });

  it("checkStamp takes it, and refuses it when a test withholds the petitions", () => {
    const all = cleanBenchTunablesS6(OUTS_PARTS);
    expect(checkStamp(all, POCKET_1_S6_RULES, "bench")).toBe(all);
    expect(() => checkStamp(all, POCKET_1_S6_RULES, "bench", WITHHELD)).toThrow(`bench: ${gateWords("P9, P10, P11, P12")}`);
    expect(checkStamp(all, POCKET_1_S6_RULES, "bench", STEP6_PETITIONS_GRANTED)).toBe(all);
    expect(() => cleanBenchTunablesS6(["sideCatch"])).toThrow(
      "withOverlay(pocket-1.s6): the side-aware catch (pocket.outs.sideCatch) without escape direction (pocket.outs.direction): it reads the side he breaks to",
    );
  });
});

// A compile-time check that a stamped name list typed as StampedRules takes step 6's.
const _stamped: readonly StampedRules[] = [POCKET_1_S6_RULES];
void _stamped;
