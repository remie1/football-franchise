/**
 * ADR-089 STEP 6: THE GRADING AND THE REPORT on synthetic records (step-6 plan §6.1, §6.2, §7, §8.2,
 * §8.3; `s6Grade.ts`). Nothing plays: every record is `s6Synthetic.ts`'s (a test's own figures on
 * step 5a's committed E9 record), and the guard is AM-12's as the preflight reads it from a copy of the
 * committed amendments file with a stand-in AM-13 (`s6StandIn.ts`; no recorded answer).
 *
 *  1. The small readers: the verdict words, the band texts, a clause's pass, a difference's SE, a
 *     league's projection and a replay's differing fields, F5's two fresh plays, and the readings off
 *     the folds (throwaways, contacts in and out, failed escapes, the sacker shift, the box-score
 *     count); the interaction's partitions and the revisit's arms.
 *  2. One grading with every verdict word: every s6 clause on its arm (PASS, FAIL, PASS (split), FAIL
 *     (split), REPORTED), the SEs, a D6 miss beside a PASS, the split told, the proofs and fold
 *     checks, the replays and S-8', the stream equalities, M5, the guard under AM-12, the ledger.
 *  3. Each fault the grading reads: a proof's fold fault, S-14's three contact counts, S-18's
 *     desperation throws, the rows' two pockets, the contact share against its row, the cross-check;
 *     the replays (AM-12's exception for D1 on gen seed set 2, the plan's for E9), F5's fresh plays,
 *     S-8', the stream equalities; M5; a guard breach and AM-12's equal-dials skip.
 *  4. One seed set (reported, never graded), and the clauses whose arms did not play.
 *  5. The report's shape: the title, the clock label, "rusher got close", every clause once with its
 *     verdict, the sections in order, the revisit in both counts, the funnel rung by rung, the
 *     interaction, the counts beside, the misses, and the summary lines.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STEP6_ARM_DEFS, STEP6_ARM_IDS, STEP6_FUNNEL, STEP6_RUN_IDS, step6ArmDef } from "../src/pocket/arms.js";
import type { FiledFile } from "../src/pocket/filed.js";
import { LEAGUES } from "../src/pocket/report.js";
import { S6_PROOF_IDS } from "../src/pocket/s6Checks.js";
import {
  armsOfProof,
  bandTextOf,
  boxScoreCleanScrambleOf,
  contactsInOutOf,
  diffSE,
  E9_REPLAY_EXCEPTION,
  failedEscapeOf,
  freshF5Problems,
  gradeStep6,
  isFail,
  leagueProjection,
  passesClause,
  renderStep6Report,
  replayFieldsDiffering,
  ROW_RULE_LABEL,
  S6_AGREE_ARMS,
  S6_INTERACTION,
  S6_REVISIT_ARMS,
  sackerShiftOf,
  step6SummaryLines,
  STEP6_CLOCK_LABEL,
  throwawayRateOf,
  verdictWord,
  type GradeStep6Inputs,
  type Step6ClauseRow,
  type Step6Guard,
  type Step6Sections,
} from "../src/pocket/s6Grade.js";
import { shareSE } from "../src/pocket/step3.js";
import { preflightStep6 } from "../src/pocket/step6.js";
import { FILED, standInFile } from "./s6StandIn.js";
import { onRecord, s6Of, setRow, synthFresh, synthM5Games, synthRecord, synthRecords, synthReferences, type SynthRecords } from "./s6Synthetic.js";

const scratch = mkdtempSync(join(tmpdir(), "pocket-step6-grade-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

let file: FiledFile;
let guard: Step6Guard;
beforeAll(() => {
  const s = standInFile(scratch);
  ({ file, guard } = preflightStep6(FILED, s.path, { pin: s.pin }));
});

const gradeOf = (m: SynthRecords, over: Partial<GradeStep6Inputs> = {}): Step6Sections =>
  gradeStep6({ records: m, file, guard, fresh: synthFresh(m), references: synthReferences(m), s5aDigest: "fnv1a:F5", s6Digest: "fnv1a:H0", ...over }).sections;

function clauseOf(s: Step6Sections, id: string): Step6ClauseRow {
  const c = s.clauses.find((x) => x.id === id);
  if (c === undefined) throw new Error(`no clause ${id}`);
  return c;
}

const verdictsOf = (s: Step6Sections): Record<string, string> => Object.fromEntries(s.clauses.map((c) => [c.id, c.verdict]));
const proofOf = (s: Step6Sections, id: string) => s.proofs.find((p) => p.id === id)!;

/**
 * Scenario one: every clause reads round numbers, and four are moved so the grading shows each verdict
 * word (CHOSEN figures): pressured throwaways split on gen seed set 2, throwaways failing on set 1 only,
 * the failed scrambles failing on both, clean out-of-pocket a D6 miss beside its PASS.
 */
function scenarioOne(): SynthRecords {
  const m = synthRecords();
  onRecord(m, "H0", (r, s) => {
    setRow(r, "throwaway_rate_pressured", { gen: s === 2 ? 12 : 9 });
    s6Of(r, "gen").pocket!.throwaways = s === 1 ? 60 : 40;
    s6Of(r, "gen").rows.byPocket.PRESSURED.failedScrambleSacks = 15;
    s6Of(r, "gen").pocket!.failedScrambleSacks = 16;
    setRow(r, "clean_outs_rate", { flat: 7, gen: 10 });
  });
  onRecord(m, "H12", (r) => setRow(r, "sack_rate", 6.5));
  onRecord(m, "H7", (r) => setRow(r, "sack_rate", 6.3));
  onRecord(m, "H8", (r) => setRow(r, "sack_rate", 5.8));
  onRecord(m, "H14", (r) => {
    setRow(r, "scramble_rate", 5);
    const p2s = r.report.p2s as Record<string, number>;
    p2s["flat"] = 21;
    p2s["gen"] = 21;
  });
  onRecord(m, "H15", (r) => {
    for (const l of LEAGUES) s6Of(r, l).rows.byPocket.PRESSURED.failedEscapeRolls = 35;
  });
  return m;
}

describe("the small readers (pure)", () => {
  it("the verdict words, the band texts, a clause's pass and a difference's SE", () => {
    expect([verdictWord(true, undefined), verdictWord(true, true), verdictWord(true, false), verdictWord(false, true), verdictWord(false, false), verdictWord(false, undefined)]).toEqual(["PASS", "PASS", "PASS (split)", "FAIL (split)", "FAIL", "FAIL"]);
    expect((["PASS", "PASS (split)", "FAIL", "FAIL (split)", "REPORTED", "NOT PLAYED"] as const).map(isFail)).toEqual([false, false, true, true, false, false]);
    expect([bandTextOf({ lo: 7, hi: 11 }), bandTextOf({ lo: 3, hi: 3 }), bandTextOf({ hi: 5 }), bandTextOf({ lo: 0 }), bandTextOf({ direction: "UP" }), bandTextOf({})]).toEqual(["7 to 11", "against 3", "at most 5", "at least 0", "direction UP", "reported"]);
    const band = { lo: 7, hi: 11 };
    expect([9, 7, 11, 7 - 1e-13, 11 + 1e-13, 6.99, 11.01].map((v) => passesClause(v, band))).toEqual([true, true, true, true, true, false, false]);
    expect([passesClause(null, {}), passesClause(Number.NaN, {}), passesClause(0.1, { direction: "UP" }), passesClause(0, { direction: "UP" }), passesClause(-0.1, { direction: "DOWN" }), passesClause(0, { direction: "DOWN" })]).toEqual([false, false, true, false, true, false]);
    expect(diffSE(3, 4)).toBe(5);
    expect(diffSE(null, 4)).toBeNull();
    expect(diffSE(3, null)).toBeNull();
  });

  it("a league's projection keeps one league's half of every flat/gen pair; a replay names the fields that differ on it", () => {
    expect(leagueProjection({ a: { flat: 1, gen: 2 }, b: [{ flat: { x: 1 }, gen: { x: 2 } }], c: 3 }, "gen")).toEqual({ a: 2, b: [{ x: 2 }], c: 3 });
    const a = { stamp: 1, report: { flat: 1, gen: 2 }, s5: { flat: 0, gen: 0 }, only: 1 };
    const b = { stamp: 2, report: { flat: 1, gen: 3 }, s5: { flat: 1, gen: 0 } };
    expect(replayFieldsDiffering(a, b, "flat", ["stamp"])).toEqual(["only", "s5"]);
    expect(replayFieldsDiffering(a, b, "gen", ["stamp", "only"])).toEqual(["report"]);
  });

  it("F5's two fresh plays: equal but for the stamp, or the digests and fields that differ", () => {
    const r = synthRecord("F5", 1);
    const again = structuredClone(r);
    expect(freshF5Problems(r, again)).toEqual([]);
    expect(freshF5Problems(r, { ...again, stamp: { ...again.stamp, commit: "other" } })).toEqual([]);
    const moved = structuredClone(r);
    (moved.s5.gen.fit.games as string[]).push("fnv1a:extra");
    expect(freshF5Problems(r, moved)).toEqual(["gen: the stream digests differ", "the records differ in s5"]);
  });

  it("the readings off the folds: throwaways, contacts in and out, failed escapes, the sacker shift, the box-score count", () => {
    const r = synthRecord("H0", 1);
    expect(throwawayRateOf(r, "flat")).toEqual({ value: 4, se: shareSE(4, 1000), n: 1000 });
    const c = contactsInOutOf(r, "gen");
    expect(c.value).toBeCloseTo(2, 12);
    expect(c.inShare).toBe(40);
    expect(c.se).toBeCloseTo(diffSE(shareSE(40, 100), shareSE(38, 100))!, 12);
    expect(c.beside).toBe("in 40.00 of 100 contacts, out 38.00 of 100 (REAL 45.5 against 43.9)");
    const f = failedEscapeOf(r, "flat");
    expect([f.value, f.n, f.beside]).toEqual([30, 120, "by pocket: clean 30.00, pressured 30.00"]);
    expect(sackerShiftOf(r, "flat", "offball")).toEqual({ value: 10, inPct: 10, outPct: 20 });
    expect(sackerShiftOf(r, "gen", "interior")).toEqual({ value: -10, inPct: 30, outPct: 20 });
    expect(boxScoreCleanScrambleOf(r, "flat")).toBe(4);
    const bare = synthRecord("H0", 1);
    s6Of(bare, "flat").pocket = null;
    delete s6Of(bare, "flat").rows.m3.byPocket;
    expect(throwawayRateOf(bare, "flat")).toEqual({ value: null, se: null });
    expect(contactsInOutOf(bare, "flat")).toEqual({ value: null, se: null, inShare: null });
    expect(sackerShiftOf(bare, "flat", "offball")).toEqual({ value: null, inPct: null, outPct: null });
  });

  it("the interaction's partitions cover the joint build's parts once each, direction aside; S-14 binds the agreement arms; the revisit prints every arm but the probes and the mirror", () => {
    for (const [where, p] of Object.entries(S6_INTERACTION)) {
      const joint = step6ArmDef(p.joint)!;
      expect(joint.base, where).toBe(p.base);
      const parts = p.parts.flatMap((id) => step6ArmDef(id)!.step6.parts);
      for (const id of p.parts) expect(step6ArmDef(id)!.base, `${where} ${id}`).toBe(p.base);
      expect(parts.filter((x) => x !== "direction").sort(), where).toEqual(joint.step6.parts.filter((x) => x !== "direction").sort());
      expect(parts.includes("direction"), where).toBe(true);
    }
    expect(armsOfProof("S-14")).toEqual(S6_AGREE_ARMS);
    expect(S6_AGREE_ARMS).toEqual(["H0", "H2", "H12", "H13", "H14", "H15", "H2L", "H0M", "HB0", "HB2", "HB12", "HB2L"]);
    expect(new Set(S6_REVISIT_ARMS).size).toBe(S6_REVISIT_ARMS.length);
    expect([...S6_REVISIT_ARMS].sort()).toEqual(["E9", "F5", ...STEP6_ARM_IDS.filter((id) => !["H13", "H14", "H15", "H0M"].includes(id))].sort());
  });
});

describe("one grading, every verdict word (scenario one)", () => {
  let s: Step6Sections;
  beforeAll(() => {
    s = gradeOf(scenarioOne());
  });

  it("reads every s6 clause of the filing and the guard pair, once each, in the plan's order, each with its verdict word", () => {
    const filed = file.bands.clauses.filter((c) => c.id.startsWith("s6.")).map((c) => c.id);
    expect(s.clauses.map((c) => c.id).sort()).toEqual([...filed, "guard.mix", "guard.byClass"].sort());
    expect(verdictsOf(s)).toEqual({
      "s6.pressuredThrowaway": "PASS (split)",
      "s6.falsifier.pressuredThrowaway": "PASS",
      "s6.throwaways": "FAIL (split)",
      "s6.rescoring": "PASS",
      "s6.falsifier.rescoring": "PASS",
      "s6.failedScrambles": "FAIL",
      "s6.horizonSacks": "PASS",
      "s6.oneEscape": "PASS",
      "s6.mobilityProbe.p2s": "PASS",
      "s6.mobilityProbe.scrambles": "PASS",
      "s6.pursuerProbe": "PASS",
      "s6.behindLine": "PASS",
      "s6.cleanOutOfPocket": "PASS",
      "s6.contactsInOut": "PASS",
      "s6.sideAwareCatch": "REPORTED",
      "s6.caughtAsContact": "REPORTED",
      "s6.drillArms": "REPORTED",
      "s6.drillShare": "REPORTED",
      "s6.onTheRun.cleanCompletion": "REPORTED",
      "s6.onTheRun.cleanInt": "REPORTED",
      "s6.onTheRun.pressuredCompletion": "REPORTED",
      "s6.onTheRun.pressuredInt": "REPORTED",
      "s6.mobilityThirds": "REPORTED",
      "s6.sackerShift.offBall": "REPORTED",
      "s6.sackerShift.interior": "REPORTED",
      "s6.readersAgree": "PASS",
      "s6.oneEscapeClean": "PASS",
      "s6.mirror": "PASS",
      "guard.mix": "PASS",
      "guard.byClass": "PASS",
      "s6.falsifiers": "PASS",
    });
    expect(s.outcome).toEqual({
      faults: [],
      breaches: [],
      misses: ["s6.throwaways: gen set 1 6.00 against at most 5 (set 2 passes)", "s6.failedScrambles: gen set 1 26.67 against 5 to 15"],
      d6Misses: ["s6.cleanOutOfPocket: flat down (-1.00) against gen up (2.00), each against the base (D6; sent to the owner, the verdict stands)"],
      splits: ["s6.pressuredThrowaway: gen set 2 12.00 lies outside 7 to 11"],
    });
    expect(s.amendments).toEqual({ digest: guard.digest, guard: "AM-12", readings: "AM-13", answers: { spentChecklist: "HOLD", scrambleStart: "ZERO_GAIN_ONLY", seen: "SEEN" } });
  });

  it("prints each reading with its binomial SE and n, the row rule's label, flat's direction against the base, and D6 beside", () => {
    const pt = clauseOf(s, "s6.pressuredThrowaway");
    expect(pt.arms).toEqual(["H0"]);
    expect(pt.filed).toBe("7 to 11");
    const se = (v: number, n: number): string => shareSE(v, n)!.toFixed(2);
    expect(pt.values).toEqual([
      `flat set 1 9.00 (SE ${se(9, 300)}, n 300); ${ROW_RULE_LABEL}`,
      `gen set 1 9.00 (SE ${se(9, 300)}, n 300); ${ROW_RULE_LABEL}`,
      `flat set 2 9.00 (SE ${se(9, 300)}, n 300); ${ROW_RULE_LABEL}`,
      `gen set 2 12.00 (SE ${se(12, 300)}, n 300); ${ROW_RULE_LABEL}`,
      "flat moves down (-11.00), gen down (-11.00), each against the base",
    ]);
    expect(pt.note).toBe(`per 100 pressured dropbacks, ${ROW_RULE_LABEL} (real 8.84%)`);
    const outs = clauseOf(s, "s6.cleanOutOfPocket");
    expect(outs.values.at(-2)).toBe("flat moves down (-1.00), gen up (2.00), each against the base");
    expect(outs.values.at(-1)).toBe("D6 miss: flat moves against gen (sent to the owner with the graded misses; gen's verdict stands)");
    const resc = clauseOf(s, "s6.rescoring");
    expect(resc.arms).toEqual(["H12", "F5"]);
    expect(resc.values[0]).toBe(`flat set 1 0.50 (SE ${diffSE(shareSE(6.5, 1000), shareSE(6, 1000))!.toFixed(2)})`);
    expect(resc.note).toBe("H12 minus F5, sacks per 100 dropbacks; beside, H0's own failed-scramble sacks per 100 dropbacks: set 1 flat 0.60, gen 1.60; set 2 flat 0.60, gen 1.60");
    expect(clauseOf(s, "s6.pursuerProbe").values[0]).toMatch(/^flat set 1 4\.17 \(SE \d+\.\d\d\); by pocket: clean 30\.00, pressured 35\.00; mean Speed change 10\.00 over 30 men \(MEASURED\)$/);
    expect(clauseOf(s, "s6.sideAwareCatch").values[0]).toMatch(/^flat set 1 0\.30 \(SE /);
    expect(clauseOf(s, "s6.caughtAsContact").values[0]).toMatch(/^flat set 1 -0\.20 \(SE /);
    expect(clauseOf(s, "s6.drillShare").values[0]).toMatch(/^flat set 1 3\.00 against 3\.0 \(/);
    expect(clauseOf(s, "s6.onTheRun.cleanCompletion").values[0]).toMatch(/^flat set 1 65\.00 \(SE \d+\.\d\d, 200 aimed\); beside, the registered ON_THE_RUN row 60\.00 and step 5's CLEAN_BREAKOUT split \d+ INT of \d+$/);
    expect(clauseOf(s, "s6.onTheRun.pressuredInt").values[1]).toMatch(new RegExp(`^gen set 1 3\\.00 \\(SE \\d+\\.\\d\\d, 100 aimed, ${ROW_RULE_LABEL}\\); beside, the registered ON_THE_RUN row 2\\.50 and step 5's PRESSURED split `));
    expect(clauseOf(s, "s6.mobilityThirds").values[0]).toMatch(/^flat set 1 one third \(every flat quarterback has the same Mobility\): MID: clean scrambles 2\.61 registered, 2\.17 box score of 230; deadline throwaways 1\.21 \(REAL /);
    expect(clauseOf(s, "s6.mobilityThirds").values[1]).toMatch(/^gen set 1 HIGH: .*; LOW: .*; MID: /);
    expect(clauseOf(s, "s6.sackerShift.offBall").values[0]).toMatch(/^flat set 1 out of the pocket 20\.00 minus in it 10\.00: 10\.00 \(/);
    expect(clauseOf(s, "s6.sackerShift.interior").values[0]).toMatch(/^flat set 1 out of the pocket 20\.00 minus in it 30\.00: -10\.00 \(/);
    expect(clauseOf(s, "s6.drillArms").values[0]).toMatch(/^flat set 1 H9 minus F5: sacks 0\.00, clean_drill_share 0\.00, completion on the run 0\.00, throwaways 0\.00; H10 minus F5: /);
  });

  it("the proofs read every play the folds read, each bound to the arms that carry its part, and the fold checks are clean", () => {
    expect(s.proofs.map((p) => p.id)).toEqual([...S6_PROOF_IDS, "rows:pocket", "rows:contacts", "rows:crossCheck"]);
    for (const p of S6_PROOF_IDS) {
      expect(proofOf(s, p).verdict, p).toBe("PASS");
      expect(proofOf(s, p).detail, p).toBe(`${String(STEP6_RUN_IDS.length * 4)} play(s) read`);
      expect(proofOf(s, p).arms, p).toEqual(armsOfProof(p));
    }
    expect(proofOf(s, "rows:crossCheck").arms).toEqual(["H0", "HB0"]);
    for (const id of ["rows:pocket", "rows:contacts", "rows:crossCheck"]) expect([proofOf(s, id).verdict, proofOf(s, id).detail], id).toEqual(["PASS", "clean"]);
    expect(clauseOf(s, "s6.readersAgree").arms).toEqual(S6_AGREE_ARMS);
    expect(clauseOf(s, "s6.oneEscape").values[0]).toBe("S-11 on every arm with the cap");
    expect(clauseOf(s, "s6.mirror").values[0]).toMatch(/^flat escape_caught_sacked_rate: within noise on every set \(tolerance 0\.0000\); set 1 difference 0\.0000 /);
  });

  it("the replays equal their records, F5's two fresh plays are identical, S-8' holds and the stream equalities hold", () => {
    expect(s.replays).toEqual([
      "D1 set 1 flat: equals its record",
      "D1 set 1 gen: equals its record",
      "D1 set 2 flat: equals its record",
      "D1 set 2 gen: equals its record",
      "E9 set 1 flat: equals its record",
      "E9 set 1 gen: equals its record",
      "E9 set 2 flat: equals its record",
      "E9 set 2 gen: equals its record",
      "F5 set 1: two fresh plays in separate processes identical",
      "F5 set 2: two fresh plays in separate processes identical",
      "S-8': F5's overlay digest fnv1a:F5 equals POCKET_1_S5A_DIGEST fnv1a:F5",
      "S-8': H0's overlay digest fnv1a:H0 equals POCKET_1_S6_DIGEST fnv1a:H0",
      ...(["H12 against F5 (but for PLAY_START)", "H6 against F5 (but for PLAY_START and direction)", "HBN against E9 (but for PLAY_START, direction and P10's flag)"] as const).flatMap((what) =>
        [1, 2].flatMap((set) => LEAGUES.map((l) => `stream equality ${what} set ${String(set)} ${l}: equal`)),
      ),
    ]);
  });

  it("the guard under AM-12: H0 against F5 and F5 against D1 graded, every other step-6 arm unguarded against its base, with AM-12's notes", () => {
    const graded = s.guard.filter((g) => g.role === "graded");
    expect(graded.map((g) => [g.arm, g.against, g.league, g.verdict])).toEqual([
      ["H0", "F5", "flat", "PASS"],
      ["H0", "F5", "gen", "PASS"],
      ["F5", "D1", "flat", "PASS"],
      ["F5", "D1", "gen", "PASS"],
    ]);
    const unguarded = s.guard.filter((g) => g.role === "unguarded");
    expect(unguarded.map((g) => `${g.arm}:${g.against}`)).toEqual(STEP6_ARM_DEFS.filter((d) => d.id !== "H0").flatMap((d) => LEAGUES.map(() => `${d.id}:${d.base}`)));
    expect(new Set(unguarded.map((g) => g.verdict))).toEqual(new Set(["unguarded"]));
    expect(unguarded.every((g) => g.breaches.length === 0 && g.Z !== undefined)).toBe(true);
    expect(graded[0]!.lines[0]).toBe("F5 is played fresh, twice (AM-12 freshBases)");
    expect(graded[3]!.lines).toContain("D1 on gen set 2 is the re-played D1 (ADR-089 Appendix I, I.13)");
    expect(graded[2]!.lines.some((x) => x.includes("re-played"))).toBe(false);
    for (const g of graded) expect(g.lines).toContain("the release clock: raw seconds on both sides (AM-8, restated by AM-12)");
    expect(graded[0]!.lines.some((x) => x.startsWith("league-wide: Z "))).toBe(true);
    expect(clauseOf(s, "guard.mix").values).toEqual([`flat PASS (Z ${graded[0]!.Z === null ? "n/a" : graded[0]!.Z.toFixed(2)})`, `gen PASS (Z ${graded[1]!.Z === null ? "n/a" : graded[1]!.Z.toFixed(2)})`]);
    expect(clauseOf(s, "guard.mix").note).toBe("under AM-12, the S5 class view");
  });

  it("the ledger of falsifiers reads its seven clauses", () => {
    expect(clauseOf(s, "s6.falsifiers").values).toEqual([
      "s6.falsifier.pressuredThrowaway: PASS",
      "s6.falsifier.rescoring: PASS",
      "s6.cleanOutOfPocket: PASS",
      "s6.contactsInOut: PASS",
      "s6.readersAgree: PASS",
      "s6.oneEscapeClean: PASS",
      "s6.mirror: PASS",
    ]);
  });
});

describe("each fault the grading reads", () => {
  it("the fold-time proofs and fold checks: a proof's fault, S-14's three contact counts, S-18, the two pockets, the contact share, the cross-check", () => {
    const m = scenarioOne();
    onRecord(m, "H3", (r) => {
      s6Of(r, "flat").faults["S-11"] = { n: 2, first: ["g g:play:3 t2: a forced escape roll after the escape was spent"] };
    }, [1]);
    onRecord(m, "H2", (r) => {
      (r.s4.flat.s4 as { s6?: unknown }).s6 = { catchesSacked: 0, catchesShed: 0, labelRuleSacks: 0, atEscape: 2, failedScrambleSacks: 0, standInByCatch: 0 };
    }, [1]);
    onRecord(m, "H11", (r) => {
      (r.s5.gen.extra as { onRunDesperation: number }).onRunDesperation = 1;
    }, [2]);
    onRecord(m, "H1", (r) => {
      s6Of(r, "gen").rows.wholePlayPocketDisagreements = 3;
    }, [1]);
    onRecord(m, "H4", (r) => setRow(r, "sack_share_of_contacts_in_out", { flat: 41 }), [1]);
    onRecord(m, "HB0", (r) => {
      s6Of(r, "flat").crossCheck!.readerDeadlinePicks = 3;
    }, [2]);
    onRecord(m, "H0", (r) => {
      s6Of(r, "gen").crossCheck = null;
    }, [1]);
    const s = gradeOf(m);
    expect(proofOf(s, "S-11")).toMatchObject({ verdict: "FAIL", detail: "H3 set 1 flat: 2 fault(s), first g g:play:3 t2: a forced escape roll after the escape was spent" });
    expect(proofOf(s, "S-14")).toMatchObject({ verdict: "FAIL", detail: "H2 set 1 flat: the contacts at the escape site: the s4 fold 2, the contact fold 0, the step-6 reading 0" });
    expect(proofOf(s, "S-18")).toMatchObject({ verdict: "FAIL", detail: "H11 set 2 gen: 1 desperation throw(s) after a clean break-out" });
    expect(proofOf(s, "rows:pocket")).toMatchObject({ verdict: "FAIL", detail: "H1 set 1 gen: 3 dropback(s) in two pockets" });
    expect(proofOf(s, "rows:contacts")).toMatchObject({ verdict: "FAIL", detail: "H4 set 1 flat: the fold's 40.000000 against the row's 41.000000" });
    expect(proofOf(s, "rows:crossCheck")).toMatchObject({ verdict: "FAIL", detail: "H0 set 1 gen: the cross-check did not run; HB0 set 2 flat: the cross-check counts 4 deadline pick(s) apart, the step-6 reading 3" });
    for (const p of S6_PROOF_IDS.filter((x) => !["S-11", "S-14", "S-18"].includes(x))) expect(proofOf(s, p).verdict, p).toBe("PASS");
    expect(verdictsOf(s)).toMatchObject({ "s6.oneEscape": "FAIL", "s6.readersAgree": "FAIL", "s6.oneEscapeClean": "PASS", "s6.falsifiers": "FAIL" });
    expect(s.outcome.faults).toEqual([
      "S-11: 1 failing, first: H3 set 1 flat: 2 fault(s), first g g:play:3 t2: a forced escape roll after the escape was spent",
      "S-14: 1 failing, first: H2 set 1 flat: the contacts at the escape site: the s4 fold 2, the contact fold 0, the step-6 reading 0",
      "S-18: 1 failing, first: H11 set 2 gen: 1 desperation throw(s) after a clean break-out",
      "rows:pocket: 1 failing, first: H1 set 1 gen: 3 dropback(s) in two pockets",
      "rows:contacts: 1 failing, first: H4 set 1 flat: the fold's 40.000000 against the row's 41.000000",
      "rows:crossCheck: 2 failing, first: H0 set 1 gen: the cross-check did not run",
      "s6.oneEscape: 1 failing, first: H3 set 1 flat: 2 fault(s), first g g:play:3 t2: a forced escape roll after the escape was spent",
      "s6.readersAgree: 1 failing, first: H2 set 1 flat: the contacts at the escape site: the s4 fold 2, the contact fold 0, the step-6 reading 0",
    ]);
    expect(s.outcome.misses).toContain("s6.falsifiers: s6.readersAgree");
  });

  it("the replays (AM-12's exception for D1 on gen set 2, the plan's for E9), F5's fresh plays, S-8' and the stream equalities", () => {
    const m = scenarioOne();
    const references = synthReferences(m);
    const fresh = synthFresh(m);
    references.delete("E9.set1");
    onRecord(m, "D1", (r) => setRow(r, "sack_rate", { flat: 7 }), [1]);
    onRecord(m, "D1", (r) => setRow(r, "sack_rate", { gen: 6.4 }), [2]);
    onRecord(m, "E9", (r) => setRow(r, "sack_rate", { gen: 5.5 }), [2]);
    delete fresh[1];
    (fresh[2]!.s5.gen.fit.games as string[]).push("fnv1a:extra");
    onRecord(m, "H12", (r) => {
      s6Of(r, "gen").digests = ["fnv1a:other"];
    }, [1]);
    onRecord(m, "HBN", (r) => {
      s6Of(r, "flat").digests = null;
    }, [2]);
    const s = gradeOf(m, { references, fresh, s5aDigest: "fnv1a:972b8b3b", s6Digest: undefined });
    const ex = guard.rule.replayExceptions!.find((x) => x.arm === "D1")!;
    expect(ex).toMatchObject({ league: "gen", seedSet: 2, record: "ADR-089 Appendix I, I.13" });
    expect(s.replays.slice(0, 10)).toEqual([
      "D1 set 1 flat: differs from its record in report",
      "D1 set 1 gen: equals its record",
      "D1 set 2 flat: equals its record",
      `D1 set 2 gen: re-played (${ex.record}: ${ex.how}); it moved in report; sack rate 6.40 against the record's 6.00`,
      "E9 set 1: no committed record to replay against",
      "E9 set 2 flat: equals its record",
      `E9 set 2 gen: re-played (${E9_REPLAY_EXCEPTION.record}: ${E9_REPLAY_EXCEPTION.how}); it moved in report; sack rate 5.50 against the record's 6.00`,
      "F5 set 2: two fresh plays in separate processes differ: gen: the stream digests differ; the records differ in s5",
      "S-8': F5's overlay digest fnv1a:F5 is not POCKET_1_S5A_DIGEST fnv1a:972b8b3b",
      "S-8': H0's overlay digest fnv1a:H0 is not POCKET_1_S6_DIGEST undefined",
    ]);
    expect(s.replays).toContain("stream equality H12 against F5 (but for PLAY_START) set 1 gen: differs");
    expect(s.outcome.faults).toEqual([
      "S-7': D1 set 1 flat differs from its record in report",
      "S-7': E9 set 1 has no committed record to replay against",
      "S-7': F5 set 2's two fresh plays differ: gen: the stream digests differ; the records differ in s5",
      "S-8': F5's overlay digest fnv1a:F5 is not POCKET_1_S5A_DIGEST fnv1a:972b8b3b",
      "S-8': H0's overlay digest fnv1a:H0 is not POCKET_1_S6_DIGEST undefined",
      "stream equality: H12 against F5 set 1 gen differs (but for PLAY_START)",
      "stream equality: HBN against E9 set 2 flat differs (but for PLAY_START, direction and P10's flag)",
    ]);
    expect(s.waits[0]).toBe("F5 set 1's second fresh play (AM-12 freshBases) is not there: the run prints its command");
  });

  it("M5: H0M's directions not mirrored lie outside M5's noise, a structural FAIL and a falsifier", () => {
    const m = scenarioOne();
    onRecord(m, "H0M", (r) => {
      for (const l of LEAGUES) s6Of(r, l).m5 = synthM5Games(false);
    });
    const s = gradeOf(m);
    expect(clauseOf(s, "s6.mirror").verdict).toBe("FAIL");
    expect(clauseOf(s, "s6.mirror").values.slice(1)).toEqual(["flat escape_direction_share is outside M5's noise", "gen escape_direction_share is outside M5's noise"]);
    expect(clauseOf(s, "s6.mirror").values[0]).toContain("flat escape_direction_share: outside noise (tolerance 0.0000); set 1 difference -0.2000");
    expect(clauseOf(s, "s6.falsifiers").verdict).toBe("FAIL");
    expect(s.outcome.faults).toEqual(["s6.mirror: 2 failing, first: flat escape_direction_share is outside M5's noise"]);
    expect(s.outcome.misses.at(-1)).toBe("s6.falsifiers: s6.mirror");
  });

  it("the guard: interceptions tripled on H0 breach AM-12 against F5; equal dials are skipped by AM-12's rule, a probe's and the mirror's never", () => {
    const m = scenarioOne();
    onRecord(m, "H0", (r) => {
      for (const l of LEAGUES) for (const cell of Object.values(r.s5[l].guard)) (cell as { interceptions: number }).interceptions *= 3;
    });
    onRecord(m, "H6", (r) => {
      (r.stamp as { overlayDigest?: string }).overlayDigest = "fnv1a:F5";
    });
    const s = gradeOf(m);
    const pair = s.guard.filter((g) => g.arm === "H0" && g.against === "F5");
    expect(pair.map((g) => g.verdict)).toEqual(["BREACH", "BREACH"]);
    expect(pair.every((g) => g.breaches.includes("league-wide"))).toBe(true);
    expect(s.outcome.breaches).toEqual(pair.map((g) => `H0 against F5, ${g.league}: ${g.breaches.join(", ")}`));
    expect(pair[0]!.breaches).toEqual(["league-wide", "PROGRESSION", "RANK_PUSHED", "CHECKDOWN", "CLEAN_EXPIRY", "ON_THE_RUN"]);
    expect(verdictsOf(s)).toMatchObject({ "guard.mix": "FAIL", "guard.byClass": "FAIL" });
    expect(clauseOf(s, "guard.mix").values.map((v) => v.split(" (")[0])).toEqual(["flat BREACH", "gen BREACH"]);
    // F5 against D1 is untouched: it still passes.
    expect(s.guard.filter((g) => g.arm === "F5" && g.against === "D1").map((g) => g.verdict)).toEqual(["PASS", "PASS"]);
    // H6 has F5's dials here: the pair compares a build with itself, so AM-12 skips it.
    expect(s.guard.filter((g) => g.arm === "H6").map((g) => g.verdict)).toEqual(["SKIPPED (equal dials, AM-12 skipEqualDials)", "SKIPPED (equal dials, AM-12 skipEqualDials)"]);
    // H13 and H0M carry H0's dials (a probe, the mirror): never skipped.
    for (const id of ["H13", "H0M", "H15"]) expect(s.guard.filter((g) => g.arm === id).map((g) => g.verdict), id).toEqual(["unguarded", "unguarded"]);
    // Without the rule nothing is skipped.
    const noSkip = gradeOf(m, { guard: { ...guard, skipEqualDials: false } });
    expect(noSkip.guard.filter((g) => g.arm === "H6").map((g) => g.verdict)).toEqual(["unguarded", "unguarded"]);
  });
});

describe("one seed set, and arms not played", () => {
  it("one seed set is reported, never graded: no miss, no split, no D6; the structural proofs still read", () => {
    const m = scenarioOne();
    const s = gradeOf(m, { oneSet: 2 });
    expect(s.oneSet).toBe(2);
    for (const c of s.clauses) {
      const kind = file.bands.clauses.find((x) => x.id === c.id)?.kind;
      if (kind === "graded") expect(c.verdict, c.id).toBe("REPORTED");
    }
    expect(clauseOf(s, "s6.readersAgree").verdict).toBe("PASS");
    expect(clauseOf(s, "s6.falsifiers").verdict).toBe("REPORTED");
    expect(clauseOf(s, "s6.pressuredThrowaway").values).toHaveLength(3);
    expect(clauseOf(s, "s6.pressuredThrowaway").values[0]).toMatch(/^flat set 2 /);
    expect(s.outcome).toMatchObject({ faults: [], breaches: [], misses: [], d6Misses: [], splits: [] });
    expect(s.guard.filter((g) => g.role === "graded").map((g) => g.verdict)).toEqual(["REPORTED", "REPORTED", "REPORTED", "REPORTED"]);
    expect(s.replays.filter((r) => r.startsWith("F5 set"))).toEqual(["F5 set 2: two fresh plays in separate processes identical"]);
    expect(step6SummaryLines(s)[0]).toBe("ADR-089 step 6: 0 build fault(s), 0 guard breach(es), nothing graded (one seed set), 0 D6 miss(es); first: nothing");
    expect(renderStep6Report({ sections: s }, HEADER).split("\n")[0]).toBe("# ADR-089 step 6: the outs, seed set 2 only (reported, never graded)");
  });

  it("a clause whose arms did not play reads NOT PLAYED, naming them; so do the ledger and the graded pair, and the interaction says which", () => {
    const m = scenarioOne();
    for (const id of ["H12", "H14", "D1"]) m.delete(id);
    const s = gradeOf(m);
    expect(clauseOf(s, "s6.rescoring")).toMatchObject({ verdict: "NOT PLAYED", values: ["not played: H12"] });
    expect(clauseOf(s, "s6.falsifier.rescoring").verdict).toBe("NOT PLAYED");
    expect(clauseOf(s, "s6.mobilityProbe.p2s")).toMatchObject({ verdict: "NOT PLAYED", values: ["not played: H14"] });
    expect(clauseOf(s, "s6.mobilityProbe.scrambles").verdict).toBe("NOT PLAYED");
    expect(clauseOf(s, "s6.falsifiers").verdict).toBe("NOT PLAYED");
    expect(clauseOf(s, "s6.readersAgree").arms).toEqual(S6_AGREE_ARMS.filter((a) => !["H12", "H14"].includes(a)));
    expect(s.guard.filter((g) => g.arm === "F5" && g.against === "D1").map((g) => g.verdict)).toEqual(["NOT PLAYED", "NOT PLAYED"]);
    expect(s.replays.some((r) => r.startsWith("D1 "))).toBe(false);
    expect(s.interaction).toContain("  league: not played (H12)");
    expect(s.revisit.some((r) => r.includes("H12"))).toBe(false);
    // A step with nothing played at all reads NOT PLAYED everywhere and faults nothing.
    const none = gradeOf(new Map(), { references: new Map(), fresh: {} });
    expect(new Set(none.clauses.map((c) => c.verdict))).toEqual(new Set(["NOT PLAYED"]));
    expect(none.outcome.faults).toEqual([]);
    expect(new Set(none.proofs.map((p) => p.verdict))).toEqual(new Set(["NOT READ"]));
    expect(none.proofs.find((p) => p.id === "rows:pocket")!.detail).toBe("no arm played");
  });
});

const HEADER = { filedDigest: "fnv1a:9a1c90e9", fingerprint: "synthetic", commits: ["c0ffee"], node: "v22", caller: "v7", pr33: "held" };

describe("the report's shape (scenario one)", () => {
  let s: Step6Sections;
  let text: string;
  beforeAll(() => {
    s = gradeOf(scenarioOne());
    text = renderStep6Report({ sections: s }, HEADER);
  });

  it("the title, the clock label, the row rule, the header lines and the outcome", () => {
    const lines = text.split("\n");
    expect(lines[0]).toBe("# ADR-089 step 6: the outs");
    expect(lines[2]).toBe(`pocket-1.s6 on the league and its parts on the clean bench, behind their switch, which nothing plays by default. Stamped beside every record: ${STEP6_CLOCK_LABEL}. Every pressure-keyed row reads the physical count: ${ROW_RULE_LABEL}.`);
    expect(STEP6_CLOCK_LABEL).toBe("interim clock S theta 11 (F5), not selected");
    expect(ROW_RULE_LABEL).toBe("rusher got close");
    expect(lines.slice(4, 10)).toEqual([
      `- filing: fnv1a:9a1c90e9; amendments at step 6: ${guard.digest} (the guard AM-12; the readings AM-13)`,
      "- the owner's answers (as AM-13 files them): spent checklist HOLD; scramble start ZERO_GAIN_ONLY; a caught catch's seen SEEN",
      `- fingerprint: synthetic; commit: c0ffee; node v22; caller v7; ${STEP6_CLOCK_LABEL}`,
      "- PR #33: held",
      "- what failed first: s6.throwaways: gen set 1 6.00 against at most 5 (set 2 passes)",
      "- outcome: 0 build fault(s), 0 guard breach(es), 2 graded miss(es), 1 D6 miss(es), 1 split(s)",
    ]);
    expect(text.endsWith("\n")).toBe(true);
    expect(text).not.toMatch(/\u2014/);
  });

  it("every clause once with its verdict, the SEs, the sections in order", () => {
    for (const c of s.clauses) {
      expect(text.split(`- **${c.id}** (`).length - 1, c.id).toBe(1);
      expect(text, c.id).toContain(`- **${c.id}** (${c.kind}; ${c.arms.join(", ")}; filed ${c.filed}): **${c.verdict}**`);
    }
    for (const w of ["**PASS**", "**FAIL**", "**PASS (split)**", "**FAIL (split)**", "**REPORTED**"]) expect(text, w).toContain(w);
    expect(text).toContain("(SE ");
    const sections = [
      "## The clauses",
      "## The proofs and fold checks (R-3; a failure is a build fault)",
      "## The replays, S-8' and the stream equalities",
      "## The guard (AM-12)",
      "## The 5a revisit (never graded)",
      "## The funnel",
      "## The interaction",
      "## Counts beside the clauses",
      "## Misses, D6 and splits (to the owner)",
      "## What this harness does not read (waits)",
    ];
    const at = sections.map((h) => text.indexOf(`\n${h}\n`));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(text).toContain("- graded miss: s6.throwaways: gen set 1 6.00 against at most 5 (set 2 passes)");
    expect(text).toContain("- D6: s6.cleanOutOfPocket: flat down (-1.00) against gen up (2.00)");
    expect(text).toContain("- split: s6.pressuredThrowaway: gen set 2 12.00 lies outside 7 to 11");
    expect(text).toContain("- **S-11** PASS: under the cap, no forced escape roll once his one escape is spent (arms H0, H3, ");
  });

  it("the 5a revisit in both counts, scoring alone and play alone, part by part; the funnel rung by rung; the interaction", () => {
    expect(s.revisit[0]).toBe("s5a.cleanScramble in both counts, per 100 clean dropbacks, against the filed 2 to 6 and REAL 3.92 (never graded): step 5a's construct (every SCRAMBLE run from a clean pocket), then the box-score count");
    const armLines = s.revisit.slice(1, 1 + S6_REVISIT_ARMS.length);
    expect(armLines.map((l) => l.split(":")[0])).toEqual(S6_REVISIT_ARMS.map((id) => `  ${id}`));
    for (const l of armLines) expect(l).toMatch(/flat set 1 \S+ \(5a's construct\) and 4\.00 \(box score\); gen set 1 .*; gen set 2 /);
    const rest = s.revisit.slice(1 + S6_REVISIT_ARMS.length);
    expect(rest.slice(0, 4).map((l) => l.split(":")[0])).toEqual(["  scoring alone (HB12 minus E9)", "  scoring alone (H12 minus F5)", "  play alone, the joint bench build (HB0 minus E9)", "  play alone, the joint league build (H0 minus F5)"]);
    expect(rest.slice(4).map((l) => l.split(" (")[1]?.split(")")[0])).toEqual(["H1 minus F5", "H2 minus F5", "H3 minus F5", "H4 minus F5", "H5 minus F5", "H6 minus F5", "H7 minus F5", "H8 minus F5", "H9 minus F5", "H10 minus F5", "H11 minus F5", "H12 minus F5", "HB2 minus E9", "HB3 minus E9", "HB4 minus E9", "HB5 minus E9", "HB7 minus E9", "HB9 minus E9", "HB10 minus E9", "HB11 minus E9", "HB12 minus E9", "HBN minus E9"]);
    expect(rest[4]).toMatch(/^ {2}part by part, throwawayRule \(H1 minus F5\): flat set 1 0\.00 and 0\.00; /);
    // The funnel: each rung's two counts and sacks, then its change from the rung before.
    expect(s.funnel[0]).toBe("the funnel, rung by rung on the clean bench (each rung's two counts, then its change from the rung before; sacks per 100 dropbacks beside)");
    const rungs = s.funnel.slice(1).filter((l) => !l.startsWith("  change from"));
    expect(rungs.map((l) => l.split(":")[0])).toEqual(STEP6_FUNNEL.map((r) => `  ${r.id}${r.adds.length === 0 ? "" : ` (+ ${r.adds.join(", ")})`}`));
    expect(s.funnel.slice(1).filter((l) => l.startsWith("  change from")).map((l) => l.split(":")[0])).toEqual(STEP6_FUNNEL.slice(1).map((r, i) => `  change from ${STEP6_FUNNEL[i]!.id} (${r.id} minus ${STEP6_FUNNEL[i]!.id})`));
    expect(rungs[0]).toMatch(/sacks 6\.00/);
    // The interaction: each partition on both sets and leagues, in both counts and sacks.
    expect(s.interaction[0]).toMatch(/^the interaction: the joint change minus the sum of the part-alone changes \(CHOSEN partitions/);
    expect(s.interaction.slice(1)).toHaveLength(8);
    expect(s.interaction[1]).toBe("  bench (HB0 against E9; parts HB2, HB3, HB4, HB5, HB7, HB10, HB11, HB12, HBN) flat set 1: joint 0.00 / 0.00 / 0.00, sum of parts 0.00 / 0.00 / 0.00, interaction 0.00 / 0.00 / 0.00");
    expect(s.interaction[5]).toMatch(/^ {2}league \(H0 against F5; parts H1, H2, H3, H4, H5, H7, H8, H10, H11, H12\) flat set 1: joint 0\.00 \/ 0\.00 \/ 0\.00, sum of parts 0\.00 \/ 0\.00 \/ 0\.60, interaction 0\.00 \/ 0\.00 \/ -0\.60$/);
  });

  it("the counts beside the clauses: rolls, sacks by origin, label-rule sacks, deadline picks, coverage sacks, the pressure variants, the cross-check, the notes", () => {
    const h0 = s.counts.find((c) => c.startsWith("H0 set 1 flat: "))!;
    expect(h0).toContain("escape rolls by band ESCAPED 84, CONTAINED 24, CAUGHT_FROM_BEHIND 12; by outcome ESCAPED 84;");
    expect(h0).toContain("sacks by origin IN_POCKET 40, FAILED_SCRAMBLE 6;");
    expect(h0).toContain("label-rule sacks 0, catches naming nobody 0; throwaways OUT_OF_POCKET 14; deadline picks THROWAWAY 3, RUN 1; drill dice 9; spent case HOLD 2;");
    expect(h0).toContain("coverage sacks 13.33% of sacks against SIS's 13% (REAL), mean time to sack 3.80 s against PFF's 3.8 s (REAL)");
    expect(h0).toContain(`pressure variants (${ROW_RULE_LABEL}): pressured-or-sacked sack share 18.75, clean-dropback sacks 1.43 per 100 (REAL 0.007), physical pressured share 30.00 (REAL 30.17)`);
    expect(s.counts.find((c) => c.startsWith("H13 set 1 flat: "))).toContain("exclusive affected plays not printed on a probe (every play can differ)");
    expect(s.counts).toContain("H0 set 1 flat: the movement cross-check counted 4 deadline pick(s) apart (the step-6 reading 4) and 5 clean pick(s); its 200 other pocket_movement CHECK(s) read unread with no replay (200), since the M2 replay refuses a stream with step 3's blocks (MEASURED)");
    expect(s.counts.filter((c) => c.includes("the movement cross-check counted"))).toHaveLength(8);
    expect(s.counts).toContain("H8: the re-escapes after a shed are counted apart (rolls after a shed); they will be few, since a shed puts the escape's man DELAYED and he holds in the pocket");
    expect(s.counts).toContain("HB0: on the clean bench contacts come only on RUSHED and PANICKED break-outs (the caught escape's contest), so its contact rows are few by construction");
    expect(s.counts.some((c) => c.startsWith("CONTAINED_DOES_NOT_SPEND"))).toBe(false);
    const contained = gradeOf(scenarioOne(), { guard: { ...guard, answers: { ...guard.answers, spentChecklist: "CONTAINED_DOES_NOT_SPEND" } } });
    expect(contained.counts).toContain("CONTAINED_DOES_NOT_SPEND: a contained roll does not spend the escape; if the spent-case counts show no difference from HOLD, the report says so here");
    expect(renderStep6Report({ sections: contained }, HEADER)).toContain("spent checklist CONTAINED_DOES_NOT_SPEND;");
    expect(s.waits).toEqual([
      "the cumulative (A0, A14) and accepted-state (A1, A11, from step 3) lines AM-12 carries are reported, never graded, and are not played by this harness",
      "S-14's play-log side is ui-layout's test, added after the lift on the same corpus",
      "S-16's spy count (the drill never writes contestPosition) is the engine's unit proof; the stream does not carry the position",
      "R-1 and R-2 (the golden digests and POCKET_1_S6_PINS) are played and filled only after the lift",
      "the second grading at the winning clock (AM-11 checkTwice) runs after the relocated 5b",
    ]);
  });

  it("the summary lines: the outcome, then each fault, breach, miss and D6 miss", () => {
    expect(step6SummaryLines(s)).toEqual([
      "ADR-089 step 6: 0 build fault(s), 0 guard breach(es), 2 graded miss(es), 1 D6 miss(es); first: s6.throwaways: gen set 1 6.00 against at most 5 (set 2 passes)",
      "  s6.throwaways: gen set 1 6.00 against at most 5 (set 2 passes)",
      "  s6.failedScrambles: gen set 1 26.67 against 5 to 15",
      "  s6.cleanOutOfPocket: flat down (-1.00) against gen up (2.00), each against the base (D6; sent to the owner, the verdict stands)",
    ]);
  });
});
