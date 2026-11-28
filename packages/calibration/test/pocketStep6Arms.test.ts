/**
 * ADR-089 STEP 6: THE ARMS, DEFINED AND REFUSED UNTIL THE GATE OPENS (`src/pocket/arms.ts`; step-6
 * plan §3.2 K1, §5.1 to §5.3, §6.1's "arm read" column).
 *
 *  1. The table: `STEP6_ARM_DEFS` is the 35 arms in `STEP6_ARM_IDS`' order, each stamped
 *     `pocket-1.s6`, on the league (H0 to H15, H2L, H0M) or the clean bench (the rest), each on plan
 *     §5's base, each with plan §5's parts of the outs block; the probes carry their rating overrides
 *     (H13 and H14 every quarterback's Mobility 40 and 90, H15 every defender's Speed +10), H2L and
 *     HB2L the other scramble start, H0M the mirror, and no other arm any of these.
 *  2. The funnel (plan §5.3): E9, HB3, HF1 to HF5, then HB0, each rung the one before plus its parts,
 *     ending at every part; each HF arm's base is the rung before.
 *  3. The clauses: each arm names exactly the clauses plan §6.1 reads on it, each as filed, a graded
 *     or structural one in `graded`, a reported one and `s6.drillArms` in `reported`, in the filing's
 *     order; only H0 carries the guard (AM-12); `s6.readersAgree` is on every marker arm and H2, HB2.
 *  4. The refusal: with this build's flags every arm waits on P9 to P12 (and P20 with the caught
 *     escape as contact, P21 for its unseen answer); `step6ArmRefusal` names them, `armById` and
 *     `buildStep6Arm` refuse by that name, and the list is exactly what `checkStamp` refuses.
 *  5. Built with a test's petitions (`STEP6_PETITIONS_GRANTED`): each league arm is F5's tree plus its
 *     parts and each bench arm E9's, H0 is `step6Bundle()` itself; the probes and H0M play H0's dials
 *     and are told apart by their ratings and mirror (O28 at step 6); under every option of the
 *     owner's three questions every arm builds, each option reaching only its leaf, and H2L and HB2L
 *     play the other start.
 */
import { join } from "node:path";
import { getAttr } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { stableDigest } from "../src/harness/digest.js";
import { buildFixture } from "../src/harness/schedule.js";
import {
  ALL_ARM_IDS,
  armById,
  armRefusal,
  buildStep6Arm,
  everyArm,
  isAnyArmId,
  step5ArmRefusal,
  step5Arms,
  step6ArmDef,
  step6ArmPetitions,
  step6ArmRefusal,
  step6ArmsWith,
  step6HarnessOnly,
  STEP6_ARM_DEFS,
  STEP6_ARM_IDS,
  STEP6_FUNNEL,
  STEP6_PROBE_RATINGS,
  type Arm,
  type Step6ArmDef,
  type Step6ArmId,
} from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { goldenFixtures } from "../src/pocket/corpus.js";
import { loadFiled } from "../src/pocket/filed.js";
import { registryAttr } from "../src/pocket/freeRun.js";
import { cleanBenchTunablesS6 } from "../src/pocket/oneThreatBench.js";
import { applyRatingOverrides, checkRatingOverride, ratingOverridesDigest, ratingOverrideTargets } from "../src/pocket/ratingOverride.js";
import {
  checkStamp,
  EngineRulesError,
  everyOutsOptions,
  otherScrambleStart,
  OUTS_PARTS,
  outsBlockOf,
  overlayDigestOf,
  POCKET_1_S5A_LEAVES,
  POCKET_1_S6_RULES,
  RECOMMENDED_OUTS_OPTIONS,
  step6Bundle,
  STEP6_PETITION_NAMES,
  STEP6_PETITIONS_GRANTED,
  type OutsOptions,
  type OutsPart,
  type Step6Petition,
  type Step6Petitions,
} from "../src/pocket/rules.js";

const ALL: readonly OutsPart[] = OUTS_PARTS;
const LEAGUE_IDS = STEP6_ARM_IDS.slice(0, 18);
const BENCH_IDS = STEP6_ARM_IDS.slice(18);

/** Plan §5.1 and §5.2's parts, arm by arm, in `OUTS_PARTS`' order. */
const PARTS: Readonly<Record<Step6ArmId, readonly OutsPart[]>> = {
  H0: ALL,
  H1: ["throwawayRule"],
  H2: ["scrambleStart"],
  H3: ["escapeCap"],
  H4: ["pursuit"],
  H5: ["noLateHorizonSack"],
  H6: ["direction"],
  H7: ["direction", "sideCatch"],
  H8: ["caughtAsContact"],
  H9: ["drill"],
  H10: ["direction", "drill", "drillBySide"],
  H11: ["deadlinePick"],
  H12: ["failedScrambleSack"],
  H13: ALL,
  H14: ALL,
  H15: ALL,
  H2L: ALL,
  H0M: ALL,
  HB0: ALL,
  HB2: ["scrambleStart"],
  HB3: ["escapeCap"],
  HB4: ["pursuit"],
  HB5: ["noLateHorizonSack"],
  HB7: ["direction", "sideCatch"],
  HB9: ["drill"],
  HB10: ["direction", "drill", "drillBySide"],
  HB11: ["deadlinePick"],
  HB12: ["failedScrambleSack"],
  HBN: ["throwawayRule", "direction", "caughtAsContact"],
  HB2L: ALL,
  HF1: ["escapeCap", "deadlinePick"],
  HF2: ["escapeCap", "noLateHorizonSack", "deadlinePick"],
  HF3: ["escapeCap", "noLateHorizonSack", "direction", "sideCatch", "caughtAsContact", "deadlinePick"],
  HF4: ["escapeCap", "noLateHorizonSack", "direction", "sideCatch", "caughtAsContact", "drill", "drillBySide", "deadlinePick"],
  HF5: ["escapeCap", "pursuit", "noLateHorizonSack", "direction", "sideCatch", "caughtAsContact", "drill", "drillBySide", "deadlinePick"],
};

/** Plan §5's bases: F5 for the league's part arms, H0 (or H13) for the probes and the information arms, E9 on the bench, HB0 for HB2L, the rung before for each HF arm. */
const BASES: Readonly<Record<Step6ArmId, string>> = {
  H0: "F5", H1: "F5", H2: "F5", H3: "F5", H4: "F5", H5: "F5", H6: "F5", H7: "F5", H8: "F5", H9: "F5", H10: "F5", H11: "F5", H12: "F5",
  H13: "H0", H14: "H13", H15: "H0", H2L: "H0", H0M: "H0",
  HB0: "E9", HB2: "E9", HB3: "E9", HB4: "E9", HB5: "E9", HB7: "E9", HB9: "E9", HB10: "E9", HB11: "E9", HB12: "E9", HBN: "E9", HB2L: "HB0",
  HF1: "HB3", HF2: "HF1", HF3: "HF2", HF4: "HF3", HF5: "HF4",
};

/** Plan §6.1's "arm read" column, clause by clause, in `STEP6_ARM_IDS`' order. */
const ONE_ESCAPE_ARMS = ["H0", "H3", "HB0", "HB3", "HF1", "HF2", "HF3", "HF4", "HF5"];
const ARM_READ: Readonly<Record<string, readonly string[]>> = {
  "s6.pressuredThrowaway": ["H0"],
  "s6.falsifier.pressuredThrowaway": ["H0"],
  "s6.throwaways": ["H0"],
  "s6.rescoring": ["H12"],
  "s6.falsifier.rescoring": ["H12"],
  "s6.failedScrambles": ["H0"],
  "s6.horizonSacks": ["H0", "H5", "HB0", "HB5", "HF2", "HF3", "HF4", "HF5"],
  "s6.oneEscape": ONE_ESCAPE_ARMS,
  "s6.mobilityProbe.p2s": ["H14"],
  "s6.mobilityProbe.scrambles": ["H14"],
  "s6.pursuerProbe": ["H15"],
  "s6.behindLine": ["H0", "H2", "HB0", "HB2"],
  "s6.cleanOutOfPocket": ["H0"],
  "s6.contactsInOut": ["H0"],
  "s6.sideAwareCatch": ["H7"],
  "s6.caughtAsContact": ["H8"],
  "s6.drillArms": ["H9", "H10", "H11"],
  "s6.drillShare": ["H0"],
  "s6.onTheRun.cleanCompletion": ["H0"],
  "s6.onTheRun.cleanInt": ["H0"],
  "s6.onTheRun.pressuredCompletion": ["H0"],
  "s6.onTheRun.pressuredInt": ["H0"],
  "s6.mobilityThirds": ["H0"],
  "s6.sackerShift.offBall": ["H0"],
  "s6.sackerShift.interior": ["H0"],
  "s6.readersAgree": ["H0", "H2", "H12", "H13", "H14", "H15", "H2L", "H0M", "HB0", "HB2", "HB12", "HB2L"],
  "s6.oneEscapeClean": ONE_ESCAPE_ARMS,
  "s6.mirror": ["H0M"],
  "s6.falsifiers": ["H0"],
  "guard.mix": ["H0"],
  "guard.byClass": ["H0"],
};

const def = (id: Step6ArmId): Step6ArmDef => step6ArmDef(id)!;
const GRANTED: Step6Petitions = STEP6_PETITIONS_GRANTED;
const UNSEEN: OutsOptions = { ...RECOMMENDED_OUTS_OPTIONS, seen: "UNSEEN_IF_UNREGISTERED" };
/** The arms whose tree turns on the caught escape as contact (P20; P21 under the unseen answer). */
const CAUGHT = STEP6_ARM_IDS.filter((id) => PARTS[id].includes("caughtAsContact"));

/** A tree's dials without its stamp. */
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

/** The petitions' subjects as the refusal names them. */
const SUBJECTS: Readonly<Record<Step6Petition, string>> = {
  P9: "the OUT_OF_POCKET throwaway cause",
  P10: "THROWAWAY.outsideTackleBox",
  P11: "QB_DECISION.direction",
  P12: "the scramble_drill CHECK",
  P20: "QB_HIT.contactSeconds on a caught escape",
  P21: "QB_HIT.seen unseen on a catch from a block",
};
const andList = (items: readonly string[]): string => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]!}`);
/** The refusal's words for an arm waiting on `needed`, `missing` of them out. */
const refusalWords = (id: string, needed: readonly Step6Petition[], missing: readonly Step6Petition[]): string =>
  `${id} is one of step 6's arms, defined in this build (ADR-089 step 6, plan §5), and waits on petitions ${andList(needed)} (${andList(needed.map((p) => SUBJECTS[p]))}): ` +
  `its outs block is refused before any game until the owner's typed yes to each and contracts-guardian's review land their text in contracts (not yet: ${missing.join(", ")}); ` +
  "nothing plays it before step 6's gate opens (step6.ts, plan §10.3)";

/** The tree an arm's recipe gives, rebuilt here from the public bundle makers (no check). */
function treeOf(d: Step6ArmDef, options: OutsOptions): Tunables {
  const played = d.step6.otherStart === true ? { ...options, scrambleStart: otherScrambleStart(options.scrambleStart) } : options;
  return d.step6.kind === "league" ? step6Bundle(outsBlockOf(d.step6.parts, played)) : cleanBenchTunablesS6(d.step6.parts, played);
}

describe("step 6's arm table (plan §5.1, §5.2)", () => {
  it("defines the 35 arms in STEP6_ARM_IDS' order, each stamped pocket-1.s6, on the league or the bench, on plan §5's base", () => {
    expect(STEP6_ARM_DEFS.map((d) => d.id)).toEqual([...STEP6_ARM_IDS]);
    expect(Object.isFrozen(STEP6_ARM_DEFS)).toBe(true);
    for (const d of STEP6_ARM_DEFS) {
      expect(d.rules, d.id).toBe(POCKET_1_S6_RULES);
      expect(d.step6.kind, d.id).toBe((LEAGUE_IDS as readonly string[]).includes(d.id) ? "league" : "bench");
      expect(d.base, d.id).toBe(BASES[d.id]);
      expect(isAnyArmId(d.base), d.id).toBe(true);
      // A step-6 base comes before the arm in the table; F5 and E9 are step 5's.
      if ((STEP6_ARM_IDS as readonly string[]).includes(d.base)) expect(STEP6_ARM_IDS.indexOf(d.base as Step6ArmId), d.id).toBeLessThan(STEP6_ARM_IDS.indexOf(d.id));
      expect(d.seedSet, d.id).toBe(1);
      expect(d.pricing, d.id).toBe(false);
      expect("waitsOn" in d, d.id).toBe(false);
      expect(d.what.length, d.id).toBeGreaterThan(0);
      expect(d.role.length, d.id).toBeGreaterThan(0);
      expect(Object.isFrozen(d), d.id).toBe(true);
    }
    expect(LEAGUE_IDS).toEqual(["H0", "H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8", "H9", "H10", "H11", "H12", "H13", "H14", "H15", "H2L", "H0M"]);
    expect(step6ArmDef("F5")).toBeUndefined();
    expect(step6ArmDef("H16")).toBeUndefined();
  });

  it("gives each arm plan §5's parts of the outs block, in OUTS_PARTS' order, each once; no HB1, HB6 or HB8 (HBN holds those parts)", () => {
    for (const d of STEP6_ARM_DEFS) {
      expect(d.step6.parts, d.id).toEqual(PARTS[d.id]);
      expect(d.step6.parts, d.id).toEqual(OUTS_PARTS.filter((p) => d.step6.parts.includes(p)));
    }
    // Each part alone on the league, H1 to H12, in plan §2's order (with what it needs).
    const alone = (["H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8", "H9", "H10", "H11", "H12"] as const).map((id) => PARTS[id][PARTS[id].length - 1]);
    expect(alone).toEqual(["throwawayRule", "scrambleStart", "escapeCap", "pursuit", "noLateHorizonSack", "direction", "sideCatch", "caughtAsContact", "drill", "drillBySide", "deadlinePick", "failedScrambleSack"]);
    // The bench's part arms are the league's, but for the three parts HBN carries together.
    for (const n of [2, 3, 4, 5, 7, 9, 10, 11, 12]) expect(PARTS[`HB${String(n)}` as Step6ArmId], `HB${String(n)}`).toEqual(PARTS[`H${String(n)}` as Step6ArmId]);
    expect([...PARTS.HBN]).toEqual([...PARTS.H1, ...PARTS.H6, ...PARTS.H8]);
    for (const missing of ["HB1", "HB6", "HB8"]) expect(isAnyArmId(missing), missing).toBe(false);
  });

  it("the probes carry their rating overrides, H2L and HB2L the other start, H0M the mirror, and no other arm any of these", () => {
    expect(def("H13").step6.ratings).toEqual([{ attr: "mobility", target: { kind: "ROLE", role: "QB", side: "BOTH" }, change: { op: "SET", value: 40 } }]);
    expect(def("H14").step6.ratings).toEqual([{ attr: "mobility", target: { kind: "ROLE", role: "QB", side: "BOTH" }, change: { op: "SET", value: 90 } }]);
    expect(def("H15").step6.ratings).toEqual([{ attr: "speed", target: { kind: "ROLE", role: "DEFENSE", side: "BOTH" }, change: { op: "ADD", delta: 10 } }]);
    for (const id of ["H13", "H14", "H15"] as const) {
      expect(def(id).step6.ratings, id).toBe(STEP6_PROBE_RATINGS[id]);
      for (const o of STEP6_PROBE_RATINGS[id]) expect(() => checkRatingOverride(o), id).not.toThrow();
    }
    for (const d of STEP6_ARM_DEFS) {
      expect(d.step6.ratings !== undefined, d.id).toBe(["H13", "H14", "H15"].includes(d.id));
      expect(d.step6.otherStart === true, d.id).toBe(["H2L", "HB2L"].includes(d.id));
      expect(d.step6.mirror === true, d.id).toBe(d.id === "H0M");
      expect(Object.keys(d.step6).sort(), d.id).toEqual(["kind", "parts", ...(d.step6.ratings === undefined ? [] : ["ratings"]), ...(d.step6.otherStart === undefined ? [] : ["otherStart"]), ...(d.step6.mirror === undefined ? [] : ["mirror"])].sort());
    }
  });

  it("the probes reach the men plan §5.1 names on a league snapshot: both quarterbacks' Mobility set, every defender's Speed raised, capped at 99", () => {
    const { index, fixtures } = goldenFixtures("flat");
    const snap = buildFixture(index, fixtures[0]!).snapshot;
    const MOBILITY = registryAttr("mobility");
    const SPEED = registryAttr("speed");
    const valueOf = (s: typeof snap, id: string, attr: ReturnType<typeof registryAttr>): number => getAttr((s.home.players[id] ?? s.away.players[id])!.attributes.values, attr);
    const qbs = ratingOverrideTargets(snap, STEP6_PROBE_RATINGS.H13[0]!);
    expect(qbs).toEqual([String(snap.home.offense.quarterback), String(snap.away.offense.quarterback)]);
    for (const [id, value] of [["H13", 40], ["H14", 90]] as const) {
      const after = applyRatingOverrides(snap, STEP6_PROBE_RATINGS[id]);
      for (const qb of qbs) expect(valueOf(after, qb, MOBILITY), `${id} ${qb}`).toBe(value);
    }
    const defenders = ratingOverrideTargets(snap, STEP6_PROBE_RATINGS.H15[0]!);
    expect(defenders).toHaveLength(22);
    const fast = applyRatingOverrides(snap, STEP6_PROBE_RATINGS.H15);
    for (const id of defenders) expect(valueOf(fast, id, SPEED), id).toBe(Math.min(99, valueOf(snap, id, SPEED) + 10));
    for (const team of [snap.home, snap.away]) {
      for (const id of Object.keys(team.players)) if (!defenders.includes(id)) expect(valueOf(fast, id, SPEED), id).toBe(valueOf(snap, id, SPEED));
    }
  });
});

describe("the funnel (plan §5.3; AM-13 files the order before any arm)", () => {
  it("is E9, HB3, HF1 to HF5, then HB0, each rung the one before plus its parts, ending at every part, each HF arm on the rung before", () => {
    expect(STEP6_FUNNEL.map((r) => r.id)).toEqual(["E9", "HB3", "HF1", "HF2", "HF3", "HF4", "HF5", "HB0"]);
    expect(STEP6_FUNNEL.map((r) => [...r.adds])).toEqual([
      [],
      ["escapeCap"],
      ["deadlinePick"],
      ["noLateHorizonSack"],
      ["direction", "sideCatch", "caughtAsContact"],
      ["drill", "drillBySide"],
      ["pursuit"],
      ["throwawayRule", "scrambleStart", "failedScrambleSack"],
    ]);
    // Each part is added once, and the rungs add every part.
    const added = STEP6_FUNNEL.flatMap((r) => r.adds);
    expect(new Set(added).size).toBe(added.length);
    expect([...added].sort()).toEqual([...OUTS_PARTS].sort());
    let so: readonly OutsPart[] = [];
    for (const rung of STEP6_FUNNEL.slice(1)) {
      const d = def(rung.id as Step6ArmId);
      so = OUTS_PARTS.filter((p) => so.includes(p) || rung.adds.includes(p));
      expect(d.step6.parts, rung.id).toEqual(so);
      expect(d.step6.kind, rung.id).toBe("bench");
    }
    expect(def("HB0").step6.parts).toEqual(ALL);
    for (const [i, id] of (["HF1", "HF2", "HF3", "HF4", "HF5"] as const).entries()) expect(def(id).base, id).toBe(STEP6_FUNNEL[i + 1]!.id);
  });
});

describe("the clauses each arm reads (plan §6.1's arm-read column)", () => {
  const file = loadFiled(join(import.meta.dirname, "..", FILED_PATH));
  const clause = new Map(file.bands.clauses.map((c) => [c.id, c]));
  const order = file.bands.clauses.map((c) => c.id);

  it("names only clauses the filing holds, a graded or structural one in graded, a reported one or s6.drillArms in reported, in the filing's order", () => {
    for (const d of STEP6_ARM_DEFS) {
      for (const id of d.graded) {
        const c = clause.get(id);
        expect(["6", "guard"], `${d.id}: ${id} is a step-6 or guard clause`).toContain(c?.step);
        expect(["graded", "structural"], `${d.id} grades ${id}`).toContain(c?.kind);
        expect(c?.comparator, `${d.id} grades ${id}`).not.toBe("proof:report");
      }
      for (const id of d.reported) {
        const c = clause.get(id);
        expect(c?.step, `${d.id}: ${id} is a step-6 clause`).toBe("6");
        expect(c?.kind === "reported" || c?.comparator === "proof:report", `${d.id} reports ${id}`).toBe(true);
      }
      const named = [...d.graded, ...d.reported];
      expect(new Set(named).size, d.id).toBe(named.length);
      const s6 = (ids: readonly string[]) => ids.filter((id) => id.startsWith("s6."));
      expect(s6(d.graded), `${d.id}: graded in the filing's order`).toEqual(order.filter((id) => s6(d.graded).includes(id)));
      expect(s6(d.reported), `${d.id}: reported in the filing's order`).toEqual(order.filter((id) => s6(d.reported).includes(id)));
    }
  });

  it("reads each step-6 clause on exactly the arms plan §6.1 names, every one of them on some arm, and only H0 carries the guard (AM-12)", () => {
    const read = new Map<string, string[]>();
    for (const d of STEP6_ARM_DEFS) for (const id of [...d.graded, ...d.reported]) read.set(id, [...(read.get(id) ?? []), d.id]);
    expect(Object.fromEntries(read)).toEqual(ARM_READ);
    const s6Clauses = file.bands.clauses.filter((c) => c.step === "6").map((c) => c.id);
    expect(s6Clauses.filter((id) => !read.has(id))).toEqual([]);
    expect(def("H0").graded.slice(-2)).toEqual(["guard.mix", "guard.byClass"]);
    // s6.readersAgree: every arm with the scoring marker, and H2 and HB2 (the start without it).
    const marker = STEP6_ARM_IDS.filter((id) => PARTS[id].includes("failedScrambleSack"));
    expect(ARM_READ["s6.readersAgree"]).toEqual(STEP6_ARM_IDS.filter((id) => marker.includes(id) || id === "H2" || id === "HB2"));
  });
});

describe("refused while the petitions are out (plan §1.2; this build's flags)", () => {
  it("step6ArmRefusal names each arm's petitions: P9 to P12 for every arm, P20 with the caught escape as contact, P21 for its unseen answer", () => {
    for (const id of STEP6_ARM_IDS) {
      const caught = CAUGHT.includes(id);
      const needed: Step6Petition[] = ["P9", "P10", "P11", "P12", ...(caught ? (["P20"] as const) : [])];
      expect(step6ArmPetitions(id), id).toEqual(needed);
      expect(step6ArmRefusal(id), id).toBe(refusalWords(id, needed, needed));
      const unseen: Step6Petition[] = [...needed, ...(caught ? (["P21"] as const) : [])];
      expect(step6ArmPetitions(id, UNSEEN), id).toEqual(unseen);
      expect(step6ArmRefusal(id, {}, UNSEEN), id).toBe(refusalWords(id, unseen, unseen));
      // With a test's petitions, nothing is missing; with one withheld, that one is named.
      expect(step6ArmRefusal(id, GRANTED), id).toBeUndefined();
      expect(step6ArmRefusal(id, GRANTED, UNSEEN), id).toBeUndefined();
      expect(step6ArmRefusal(id, { ...GRANTED, P11: false }), id).toBe(refusalWords(id, needed, ["P11"]));
      expect(step6ArmRefusal(id, { ...GRANTED, P20: false }), id).toBe(caught ? refusalWords(id, needed, ["P20"]) : undefined);
      expect(step6ArmRefusal(id, { ...GRANTED, P21: false }, UNSEEN), id).toBe(caught ? refusalWords(id, unseen, ["P21"]) : undefined);
    }
    expect(CAUGHT).toEqual(["H0", "H8", "H13", "H14", "H15", "H2L", "H0M", "HB0", "HBN", "HB2L", "HF3", "HF4", "HF5"]);
    for (const id of ["F5", "E9", "D1", "A0", "H16", ""]) {
      expect(step6ArmRefusal(id), id).toBeUndefined();
      expect(step6ArmPetitions(id), id).toBeUndefined();
    }
  });

  it("armById and buildStep6Arm refuse each by that name, step6ArmsWith refuses, and nothing else refuses a step-6 arm or builds one", () => {
    for (const d of STEP6_ARM_DEFS) {
      const why = step6ArmRefusal(d.id)!;
      expect(() => armById(d.id), d.id).toThrow(EngineRulesError);
      expect(() => armById(d.id), d.id).toThrow(`arms: ${why}: nothing plays it`);
      expect(() => buildStep6Arm(d), d.id).toThrow(`arms: ${why}: nothing plays it`);
      expect(() => buildStep6Arm(d, UNSEEN), d.id).toThrow(`arms: ${step6ArmRefusal(d.id, {}, UNSEEN)!}: nothing plays it`);
      expect(armRefusal(d.id), d.id).toBeUndefined();
      expect(step5ArmRefusal(d.id), d.id).toBeUndefined();
    }
    expect(() => step6ArmsWith()).toThrow(`arms: ${step6ArmRefusal("H0")!}: nothing plays it`);
    const built = [...everyArm(), ...step5Arms()].map((a) => a.id);
    expect(built.filter((id) => (STEP6_ARM_IDS as readonly string[]).includes(id))).toEqual([]);
    expect(ALL_ARM_IDS.slice(-35)).toEqual([...STEP6_ARM_IDS]);
    expect(step6HarnessOnly("H0")).toBe("H0 is one of step 6's arms, built only by the step-6 harness under the owner's three answers as AM-13 files them (buildStep6Arm), never by armById");
  });

  it("each arm's petition list is exactly what checkStamp refuses its tree on: one needed petition withheld refuses it, any other does not", () => {
    for (const options of [RECOMMENDED_OUTS_OPTIONS, UNSEEN]) {
      for (const d of STEP6_ARM_DEFS) {
        const tree = treeOf(d, options);
        const needed = step6ArmPetitions(d.id, options)!;
        expect(() => checkStamp(tree, POCKET_1_S6_RULES, d.id), d.id).toThrow(EngineRulesError);
        expect(() => checkStamp(tree, POCKET_1_S6_RULES, d.id, GRANTED), d.id).not.toThrow();
        for (const p of STEP6_PETITION_NAMES) {
          const run = (): unknown => checkStamp(tree, POCKET_1_S6_RULES, d.id, { ...GRANTED, [p]: false });
          if (needed.includes(p)) expect(run, `${d.id} without ${p}`).toThrow(new RegExp(`\\b${p}\\b`));
          else expect(run, `${d.id} without ${p}`).not.toThrow();
        }
      }
    }
  });
});

describe("built with a test's petitions (STEP6_PETITIONS_GRANTED): F5's tree or E9's plus the parts", () => {
  let built: ReturnType<typeof step6ArmsWith> | undefined;
  /** Every step-6 arm at the recommended options, checked against every arm of steps 1 to 5, built once. */
  const table = (): ReturnType<typeof step6ArmsWith> => (built ??= step6ArmsWith(RECOMMENDED_OUTS_OPTIONS, GRANTED, [...everyArm(), ...step5Arms()]));
  const a = (id: Step6ArmId) => table().get(id)!;

  it("builds every arm in the table's order, H0 as step6Bundle() itself, each league arm F5's dials plus its block and each bench arm E9's", () => {
    const arms = table();
    expect([...arms.keys()]).toEqual([...STEP6_ARM_IDS]);
    expect(a("H0").tunables).toEqual(step6Bundle());
    expect(a("H0").digest).toBe(overlayDigestOf(step6Bundle()));
    const f5 = unstampedOf(armById("F5").tunables);
    const e9 = unstampedOf(armById("E9").tunables);
    for (const arm of arms.values()) {
      const d = def(arm.id);
      expect(arm.rules, arm.id).toBe(POCKET_1_S6_RULES);
      expect(withoutOuts(arm.tunables), arm.id).toEqual(d.step6.kind === "league" ? f5 : e9);
      expect(arm.tunables.pocket.outs, arm.id).toEqual(outsBlockOf(d.step6.parts, arm.outsOptions));
      expect(arm.tunables, arm.id).toEqual(treeOf(d, RECOMMENDED_OUTS_OPTIONS));
      expect(arm.overlayDigest, arm.id).toBe(arm.digest);
      expect(arm.digest, arm.id).toBe(overlayDigestOf(arm.tunables));
      expect(arm.tunablesDigest, arm.id).toBe(stableDigest(arm.tunables));
      expect(arm.patches, arm.id).toEqual(POCKET_1_S5A_LEAVES);
      expect(arm.base, arm.id).toBe(BASES[arm.id]);
      expect(arm.graded, arm.id).toEqual(d.graded);
      expect(Object.isFrozen(arm), arm.id).toBe(true);
      expect(Object.isFrozen(arm.tunables), arm.id).toBe(true);
      expect(() => checkStamp(arm.tunables, POCKET_1_S6_RULES, arm.id, GRANTED), arm.id).not.toThrow();
    }
    // A bench arm's tree is cleanBenchTunablesS6 with its parts; HB0's is the bench with every part.
    expect(a("HB0").tunables).toEqual(cleanBenchTunablesS6(OUTS_PARTS));
  });

  it("the probes and H0M play H0's dials, told apart by their ratings and mirror; every other pair of arms differs in its dials (O28 at step 6)", () => {
    const arms = table();
    for (const id of ["H13", "H14", "H15", "H0M"] as const) expect(a(id).digest, id).toBe(a("H0").digest);
    expect(a("H0").ratingOverridesDigest).toBe("none");
    for (const id of ["H13", "H14", "H15"] as const) expect(a(id).ratingOverridesDigest, id).toBe(ratingOverridesDigest(STEP6_PROBE_RATINGS[id]));
    expect(new Set(["H13", "H14", "H15"].map((id) => a(id as Step6ArmId).ratingOverridesDigest)).size).toBe(3);
    for (const arm of arms.values()) {
      expect(arm.ratingOverridesDigest === "none", arm.id).toBe(!["H13", "H14", "H15"].includes(arm.id));
      expect(arm.mirror, arm.id).toBe(arm.id === "H0M");
    }
    expect(new Set([...arms.values()].map((x) => x.digest)).size).toBe(35 - 4);
    // The check is by (rules, dials, ratings, mirror): an arm built twice is refused as a duplicate.
    const h1: Arm = buildStep6Arm(def("H1"), RECOMMENDED_OUTS_OPTIONS, GRANTED);
    expect(() => step6ArmsWith(RECOMMENDED_OUTS_OPTIONS, GRANTED, [h1])).toThrow(/^arms: H1 and H1 have the same rules pocket-1\.s6, the same dials fnv1a:[0-9a-f]{8}, the same ratings none and the same mirror; /);
  });

  it("H2L and HB2L play the other scramble start, every other arm the options it is given", () => {
    for (const arm of table().values()) {
      const other = arm.id === "H2L" || arm.id === "HB2L";
      expect(arm.outsOptions, arm.id).toEqual(other ? { ...RECOMMENDED_OUTS_OPTIONS, scrambleStart: "EVERY_RUN" } : RECOMMENDED_OUTS_OPTIONS);
    }
    expect(a("H2L").tunables.pocket.outs?.scrambleStart).toBe("EVERY_RUN");
    expect(a("H0").tunables.pocket.outs?.scrambleStart).toBe("ZERO_GAIN_ONLY");
    expect(withoutOuts(a("H2L").tunables)).toEqual(withoutOuts(a("H0").tunables));
    expect(a("HB2L").tunables.pocket.outs).toEqual({ ...a("HB0").tunables.pocket.outs, scrambleStart: "EVERY_RUN" });
  });

  it("under every option of the owner's three questions (20), every arm builds and stays distinct, each option reaching only its leaf", () => {
    for (const options of everyOutsOptions()) {
      const under = step6ArmsWith(options, GRANTED);
      expect(under.size).toBe(35);
      for (const arm of under.values()) {
        const parts = def(arm.id).step6.parts;
        const outs = arm.tunables.pocket.outs!;
        const start = arm.id === "H2L" || arm.id === "HB2L" ? otherScrambleStart(options.scrambleStart) : options.scrambleStart;
        expect(outs.escapeCap?.whenSpent, arm.id).toBe(parts.includes("escapeCap") ? options.spentChecklist : undefined);
        expect(outs.scrambleStart, arm.id).toBe(parts.includes("scrambleStart") ? start : undefined);
        expect(outs.caughtSeen, arm.id).toBe(parts.includes("caughtAsContact") ? options.seen : undefined);
        expect(arm.outsOptions, arm.id).toEqual({ ...options, scrambleStart: start });
      }
    }
  });
});
