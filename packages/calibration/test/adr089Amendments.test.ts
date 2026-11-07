/**
 * ADR-089: THE COMMITTED AMENDMENTS FILE, `reports/adr-089-amendments.filed.json` (Appendix E's
 * header, ADR-089:2022; AM-1, Appendix F, F.11; the amendment's §3.4 and §3.5; step-2 plan §4.6;
 * AM-2, Appendix G, G.8; step-3 plan §4.1, §4.2, §4.3, §4.4; AM-3, G.9).
 *
 * The file validates as `adr-089-amendments/v1` against the step-0 filing; it is the pinned file
 * (`AMENDMENTS_DIGEST`, a literal in `amendments.ts`, and the same literal here); every filed entry
 * keeps its own pin, so editing a filed entry fails with the append-only message while appending one
 * adds a pin; AM-1 supersedes `guard.mix` and `guard.byClass` and nothing else, leaving
 * `acc.intGuard`, `s4.motion.int` and `s5a.int` as filed; its lines are 2.0, 3.0 and 0; its step-2
 * base map is exactly B1, B2, B3, B4 and B7 on A1, B5 on A5 and B6 on A11; and its `filing` is the
 * step-0 file's digest. AM-2, filed before step 3, supersedes `s3.part1.m8` and
 * `s3.part1.monotone` and nothing else, leaves `mr.class.timing` and the other s3 clauses untouched,
 * carries no guard rule, and files the late block's `t_e` 1.0 s and `w` 0.1 as CHOSEN values; the
 * file's view at step 2 (the entries filed before step 2 or earlier) is still `fnv1a:d5f9de6d`, so
 * step 2's records keep grading. AM-3, filed before step 3, is step 3's guard base map: AM-1's
 * entry word for word but for its name, steps, cites, record, reason and `rule.bases` (C1 on B3, C2
 * on B6, C11 on B3, each the arm's own base), with its picture choice made (the picture as ruled, the
 * Mug worn, petition S3 granted). AM-4, filed before step 3, is the owner's sight ruling as the
 * Orchestrator reads it (G.10): it supersedes `s7.earlyShare` and nothing else, names every other s7
 * clause untouched, is read from step 7, carries no guard rule and holds no choice not yet made, so
 * step 2's view and step 3's guard are unchanged. AM-5, filed before step 3 (G.11), changes AM-2's
 * shape-L toucher die to `rush/t<tick>/<toucherId>:late:<rusherId>` through `rule.amends`, leaving
 * AM-2's entry, its rusher die and shape S as filed; the step-3 view is then pinned
 * (`STEP3_AMENDMENTS_DIGEST`). AM-6 (step 4's guard map, Appendix H, H.8) and AM-7 (step 4's
 * readings, H.9), filed before step 4, leave step 2's and step 3's views where they are; the whole
 * file is then step 4's view (`STEP4_AMENDMENTS_PIN`, read in `pocketStep4.test.ts`) and `guardFor`
 * at step 4 is AM-6's. Then every rule `validateAmendments` holds, each on a copy that breaks
 * it, `rule.amends` among them. Last, ADR-089 step 5: AM-8 (the guard at step 5, Appendix I, I.10),
 * AM-9 (step 5a's readings, I.11) and AM-10 (step 5b's readings, I.12), filed before step 5a. AM-8 is
 * its filing's text (`filing.md` §3.2) but for the chance sentence, which carries the figure computed
 * before filing; its rule is AM-1's but for the bases and the four optional fields; it is the guard at
 * 5a and 5b, read with step 5's class view, while steps 2 to 4 keep `throwClassOf`; each optional field
 * is refused when malformed. AM-9 and AM-10 carry no guard rule, name every s5a and s5b clause as
 * superseded or untouched, and widen no acceptance clause. Step 4's view stays `fnv1a:e0c05cf0`
 * (`STEP4_AMENDMENTS_PIN`): `amendmentsAtStep(file, "4")` cuts AM-8 onward.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { stableDigest } from "../src/harness/digest.js";
import { armById, OTHER_PICTURE, STEP2_ARM_DEFS, STEP2_ARM_IDS, type ArmId } from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { loadFiled, STEP0_FILED_DIGEST, type FiledFile } from "../src/pocket/filed.js";
import {
  ADR_089_STEP_IDS,
  AMENDMENTS_DIGEST,
  AMENDMENTS_FORMAT,
  AMENDMENTS_PATH,
  amendmentsAtStep,
  amendmentsDigest,
  amendmentsDigestAtStep,
  amendedRuleText,
  amendmentsProblems,
  AmendmentsValidationError,
  entryOf,
  guardFor,
  GUARD_REPORTED_SPLITS,
  guardRuleOf,
  loadAmendments,
  openAmendments,
  openAmendmentsAtStep,
  STEP2_AMENDMENTS_DIGEST,
  STEP3_AMENDMENTS_DIGEST,
  validateAmendments,
  type AmendmentsFile,
} from "../src/pocket/amendments.js";
import { AM1_LINES, guardClassifier, guardClassView, guardWithView, isFreshBase, skipsEqualDials } from "../src/pocket/guardAm1.js";
import { throwClassOf, throwClassOfS5 } from "../src/pocket/throwClass.js";
import { POCKET_1_S3_FREE_RUN } from "../src/pocket/rules.js";
import { STEP4_AMENDMENTS_PIN } from "../src/pocket/step4.js";

const PKG = join(import.meta.dirname, "..");
const PATH = join(PKG, AMENDMENTS_PATH);
const filing = (): FiledFile => loadFiled(join(PKG, FILED_PATH));

/** The committed file's digest: AM-1 as filed (commit b65ab25, shown to the owner at 200b18b), then AM-2 (G.8), AM-3 (G.9), AM-4 (G.10), AM-5 (G.11), AM-6 (H.8), AM-7 (H.9), AM-8 (I.10), AM-9 (I.11) and AM-10 (I.12). */
const PINNED_DIGEST = "fnv1a:3f9478eb";
/** The file's view at step 4 (AM-1 to AM-7): the whole file's digest when step 4's arms ran, which every step-4 record stamps (`STEP4_AMENDMENTS_PIN`). */
const STEP4_VIEW_DIGEST = "fnv1a:e0c05cf0";
/** The file's view at step 3 (AM-1 to AM-5): the whole file's digest when step 3's arms ran, which every step-3 record stamps. */
const STEP3_VIEW_DIGEST = "fnv1a:517bb9fe";
const UP_TO_AM5 = ["AM-1", "AM-2", "AM-3", "AM-4", "AM-5"];
const UP_TO_AM7 = [...UP_TO_AM5, "AM-6", "AM-7"];
const UP_TO_AM10 = [...UP_TO_AM7, "AM-8", "AM-9", "AM-10"];
/** The file's view at step 2 (AM-1 alone): the whole file's digest when step 2's arms ran, which every step-2 record stamps. */
const STEP2_VIEW_DIGEST = "fnv1a:d5f9de6d";
const APPEND_ONLY = "ADR-089: an amendment is append-only; file a new named entry";

/** One pin per filed entry (`stableDigest` of the entry). Appending an entry adds its pin here. */
const ENTRY_PINS: Readonly<Record<string, string>> = {
  "AM-1": "fnv1a:97f0cb84",
  "AM-2": "fnv1a:e8484644",
  "AM-3": "fnv1a:4c935835",
  "AM-4": "fnv1a:76b9abe5",
  "AM-5": "fnv1a:fd8a8dcd",
  "AM-6": "fnv1a:b36ea543",
  "AM-7": "fnv1a:7748c305",
  "AM-8": "fnv1a:dd8a3b2b",
  "AM-9": "fnv1a:1a2783f8",
  "AM-10": "fnv1a:56731b57",
};

const committed = (): AmendmentsFile => loadAmendments(PATH, filing());
/** A deep copy of the committed file, as plain JSON, to break. */
const copy = (): Record<string, unknown> & { entries: Record<string, unknown>[] } => JSON.parse(JSON.stringify(committed())) as Record<string, unknown> & { entries: Record<string, unknown>[] };
const ruleOf = (j: { entries: Record<string, unknown>[] }, i = 0): Record<string, unknown> => j.entries[i]!["rule"] as Record<string, unknown>;

const tmp = mkdtempSync(join(tmpdir(), "adr089-amendments-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("ADR-089: the committed amendments file", () => {
  it("is the pinned file (AMENDMENTS_DIGEST): append-only, extended only by a named entry", () => {
    expect(amendmentsDigest(committed()), APPEND_ONLY).toBe(PINNED_DIGEST);
    expect(AMENDMENTS_DIGEST, "the harness reads the same pin from the source").toBe(PINNED_DIGEST);
    expect(openAmendments(PATH, filing()).entries.map((e) => e.id)).toEqual(UP_TO_AM10);
  });

  it("keeps one pin per filed entry: editing a filed entry fails, appending one adds a pin", () => {
    const file = committed();
    expect(file.entries.map((e) => e.id), "every filed entry has a pin, and every pin an entry").toEqual(Object.keys(ENTRY_PINS));
    for (const e of file.entries) expect(stableDigest(e), `${e.id}: ${APPEND_ONLY}`).toBe(ENTRY_PINS[e.id]);
  });

  it("validates as adr-089-amendments/v1 against the step-0 filing, whose digest it names", () => {
    const file = committed();
    expect(file.format).toBe(AMENDMENTS_FORMAT);
    expect(file.adr).toBe("docs/decisions/ADR-089-the-pocket-on-a-real-clock.md");
    expect(file.filing).toBe(STEP0_FILED_DIGEST);
    expect(amendmentsProblems(file, filing())).toEqual([]);
  });

  it("AM-1 supersedes guard.mix and guard.byClass only; every id it names is a clause of the step-0 file; acceptance and the later guard clauses are untouched", () => {
    const am1 = entryOf(committed(), "AM-1");
    const ids = new Set(filing().bands.clauses.map((c) => c.id));
    expect(am1.supersedes).toEqual(["guard.mix", "guard.byClass"]);
    expect(am1.untouched).toEqual(["acc.intGuard", "s4.motion.int", "s5a.int"]);
    for (const id of [...am1.supersedes, ...am1.untouched]) expect(ids.has(id), id).toBe(true);
    for (const id of ["acc.intGuard", "s4.motion.int", "s5a.int"]) expect(am1.supersedes).not.toContain(id);
    expect(am1.filedBeforeStep).toBe("2");
    expect(am1.steps).toEqual(["2", "3", "4", "5a", "5b", "6", "7", "8a", "8b", "9", "10"]);
    expect(am1.ownersWord, "D9 and D28 are Orchestrator defaults: shown, not asked").toBeNull();
    expect(am1.record).toBe("ADR-089 Appendix F, F.11");
  });

  it("AM-1's lines are 2.0 league-wide, 3.0 in a class and 0 for a set with SE 0, as guardAm1.ts reads them", () => {
    const rule = guardRuleOf(entryOf(committed(), "AM-1"));
    expect([rule.zLeague, rule.zClass, rule.zSetSE0]).toEqual([2.0, 3.0, 0]);
    expect({ zLeague: rule.zLeague, zClass: rule.zClass, zSetSE0: rule.zSetSE0 }).toEqual(AM1_LINES);
    expect(rule.breachIf).toBe("greaterThan");
    expect(rule.statistic).toBe("pooledZ");
    expect(rule.se).toBe("binomialIndependent");
    expect(rule.seedSets).toEqual([1, 2]);
    expect(rule.cumulative).toEqual({ design: "A0", pricing: "A14", graded: false });
  });

  it("AM-1's step-2 base map is exactly B1, B2, B3, B4, B7 on A1, B5 on A5 and B6 on A11, the arms' own bases", () => {
    const g = guardFor(committed(), "2");
    expect(g.entry.id).toBe("AM-1");
    expect(g.bases).toEqual({ B1: "A1", B2: "A1", B3: "A1", B4: "A1", B5: "A5", B6: "A11", B7: "A1" });
    expect(Object.keys(g.bases)).toEqual([...STEP2_ARM_IDS]);
    for (const def of STEP2_ARM_DEFS) expect(g.bases[def.id], def.id).toBe(def.base);
    // Step 3's map is AM-3's, step 4's AM-6's, step 5's AM-8's; a later step has none yet, and its harness refuses until one is filed.
    expect(guardFor(committed(), "3").entry.id).toBe("AM-3");
    expect(guardFor(committed(), "4").entry.id).toBe("AM-6");
    expect(guardFor(committed(), "5a").entry.id).toBe("AM-8");
    expect(guardFor(committed(), "5b").entry.id).toBe("AM-8");
    expect(() => guardFor(committed(), "6")).toThrow(/no filed amendment maps step 6's guard bases/);
  });
});

describe("AM-2: step 3's filing changes (ADR-089 Appendix G, G.8; step-3 plan §4.1)", () => {
  it("supersedes s3.part1.m8 and s3.part1.monotone only; every other step-3 clause, s10.neverFitted and mr.class.timing untouched; filed before step 3, shown, not asked", () => {
    const am2 = entryOf(committed(), "AM-2");
    const clauses = filing().bands.clauses;
    const ids = new Set(clauses.map((c) => c.id));
    expect(am2.supersedes).toEqual(["s3.part1.m8", "s3.part1.monotone"]);
    expect(am2.untouched).toEqual(["s3.part1.determinism", "s3.part1.mirror", "s3.bin20.tick", "s3.hitOrSack", "s3.quick", "s3.quickOrigin", "s3.unblockedPressures", "s3.unblockedShare", "s3.unblockedMen", "s3.expected.pressure", "s3.expected.sack", "s3.expected.bin20", "s3.expected.quick", "s3.neverOffered", "s10.neverFitted", "mr.class.timing"]);
    for (const id of [...am2.supersedes, ...am2.untouched]) expect(ids.has(id), id).toBe(true);
    // Every step-3 clause of the filing is named, superseded or untouched.
    expect([...am2.supersedes, ...am2.untouched].filter((id) => id.startsWith("s3.")).sort()).toEqual(clauses.filter((c) => c.step === "3").map((c) => c.id).sort());
    expect(am2.filedBeforeStep).toBe("3");
    expect(am2.steps).toEqual(["3", "4", "5a", "5b", "6", "7", "8a", "8b", "9", "10", "11"]);
    expect(am2.defaults).toEqual(["D16", "D18", "D19", "D21", "D22", "D31"]);
    expect(am2.ownersWord, "Orchestrator defaults and CHOSEN values: shown, not asked").toBeNull();
    expect(am2.record).toBe("ADR-089 Appendix G, G.8");
  });

  it("carries no guard rule: step 2's guard is still AM-1's, and step 3's is the base map filed after it (AM-3)", () => {
    const am2 = entryOf(committed(), "AM-2");
    expect(() => guardRuleOf(am2)).toThrow(/AM-2 supersedes s3\.part1\.m8, s3\.part1\.monotone, not the guard/);
    expect(guardFor(committed(), "2").entry.id).toBe("AM-1");
    expect(guardFor(committed(), "3").entry.id).toBe("AM-3");
  });

  it("files the late block's t_e 1.0 s and w 0.1 as CHOSEN values, and the readings plan §4.1 lists", () => {
    const rule = entryOf(committed(), "AM-2").rule as Record<string, unknown>;
    expect(Object.keys(rule)).toEqual(["lateBlock", "untouchedExchange", "part1", "monotone", "design", "references", "freeRunKey", "timingAgainstAtStep3", "previews", "bench", "readings", "neverOffered"]);
    const late = rule["lateBlock"] as Record<string, unknown>;
    // The s3 overlay's blitzPickup.lateBlock is pinned equal to these once the overlay exists (plan §4.4, critique 1 N12).
    expect([late["engageSeconds"], late["weakMultiplier"]]).toEqual([1.0, 0.1]);
    expect(String(late["provenance"])).toMatch(/^CHOSEN, .*, no measurement; shown to the owner before any pocket-1\.s3 run$/);
    expect(Object.keys(late)).toEqual(["engageSeconds", "weakMultiplier", "provenance", "why", "shapeS", "shapeL", "beaten", "toucher", "invariant"]);
    expect(String(late["shapeL"])).toMatch(/Reachable only once petition P17's doc text is in contracts\.$/);
    expect(Object.keys(rule["readings"] as object)).toEqual(["s10.neverFitted", "selectionRule.freeRunClock"]);
  });

  it("superseding mr.class.timing instead is refused: an acceptance clause is never widened (§6.10), so timingAgainst is read at step 3 only", () => {
    const j = copy();
    const am2 = j.entries[1]!;
    am2["supersedes"] = [...(am2["supersedes"] as string[]), "mr.class.timing"];
    am2["untouched"] = (am2["untouched"] as string[]).filter((id) => id !== "mr.class.timing");
    expect(amendmentsProblems(j, filing())).toEqual(["entries.1.supersedes: mr.class.timing is an acceptance clause, which an amendment never widens (§6.10)"]);
  });
});

describe("AM-3: the guard at step 3 (ADR-089 Appendix G, G.9; step-3 plan §4.2)", () => {
  it("is AM-1's entry word for word but for its name, steps, cites, record, reason and rule.bases; filed before step 3, read at step 3 only, shown, not asked", () => {
    const am1 = entryOf(committed(), "AM-1");
    const am3 = entryOf(committed(), "AM-3");
    for (const key of ["supersedes", "untouched", "defaults", "adrLines", "ownersWord"] as const) expect(am3[key], key).toEqual(am1[key]);
    const { bases: am1Bases, ...am1Rule } = am1.rule;
    const { bases: am3Bases, ...am3Rule } = am3.rule;
    // The rule equals AM-1's but for bases: the same keys in the same order, every other value equal.
    expect(Object.keys(am3.rule)).toEqual(Object.keys(am1.rule));
    expect(am3Rule).toEqual(am1Rule);
    expect(am1Bases).toEqual({ "2": { B1: "A1", B2: "A1", B3: "A1", B4: "A1", B5: "A5", B6: "A11", B7: "A1" } });
    expect(am3Bases).toEqual({ "3": { C1: "B3", C2: "B6", C11: "B3" } });
    expect(am3.name).toBe("the guard at step 3: the design, its pricing arm and reading (c) against step 2's arms");
    expect(am3.filedBeforeStep).toBe("3");
    expect(am3.steps).toEqual(["3"]);
    expect(am3.cites).toEqual([943, 1030, 1287, 1159, 1036, 1053]);
    expect(am3.record).toBe("ADR-089 Appendix G, G.9");
    expect(am3.ownersWord, "D9 and D28 are Orchestrator defaults: shown, not asked").toBeNull();
  });

  it("maps step 3's guard: C1 on B3, C2 on B6 and C11 on B3, each the base this build's arm reads; step 2 keeps AM-1's map, and step 4's is AM-6's", () => {
    const g = guardFor(committed(), "3");
    expect(g.entry.id).toBe("AM-3");
    expect(g.bases).toEqual({ C1: "B3", C2: "B6", C11: "B3" });
    for (const [id, base] of Object.entries(g.bases)) expect(armById(id as ArmId).base, id).toBe(base);
    expect({ zLeague: g.rule.zLeague, zClass: g.rule.zClass, zSetSE0: g.rule.zSetSE0 }).toEqual(AM1_LINES);
    expect(g.rule.cumulative).toEqual({ design: "A0", pricing: "A14", graded: false });
    expect(guardFor(committed(), "2").entry.id).toBe("AM-1");
    expect(guardFor(committed(), "4").entry.id).toBe("AM-6");
  });

  it("is filed with its choice made: C1 reads the picture as ruled, the Mug worn (S3 granted), the picture the s3 bundle carries; C6 reads the other", () => {
    const am3 = entryOf(committed(), "AM-3");
    expect(am3.reason).toContain("C1 reads the picture as ruled, the Mug worn, as petition S3 stood when this entry was filed (AM-2's design rule); C6 reads the other.");
    expect(am3.reason).not.toMatch(/<[^<>]*\|[^<>]*>/);
    // The design picture is in every s3 record's stamp through the overlay digest: the bundle carries AS_RULED.
    expect(POCKET_1_S3_FREE_RUN.picture).toBe("AS_RULED");
    expect(OTHER_PICTURE).toBe("MUG_HEAD_ONLY");
  });
});

describe("AM-4: sight by looks (ADR-089 Appendix G, G.10; the owner's ruling of 2026-10-31, G.7 item 3)", () => {
  it("supersedes s7.earlyShare only and names every other step-7 clause untouched; filed before step 3, read from step 7; the owner's word with the Orchestrator's reading", () => {
    const am4 = entryOf(committed(), "AM-4");
    const clauses = filing().bands.clauses;
    const ids = new Set(clauses.map((c) => c.id));
    expect(am4.supersedes).toEqual(["s7.earlyShare"]);
    expect(am4.untouched).toHaveLength(26);
    for (const id of [...am4.supersedes, ...am4.untouched]) expect(ids.has(id), id).toBe(true);
    // Every step-7 clause of the filing is named, superseded or untouched, and none twice.
    expect([...am4.supersedes, ...am4.untouched].sort()).toEqual(clauses.filter((c) => c.step === "7").map((c) => c.id).sort());
    expect(am4.filedBeforeStep).toBe("3");
    expect(am4.steps).toEqual(["7", "8a", "8b", "9", "10"]);
    expect(am4.defaults).toEqual(["D20"]);
    expect(am4.record).toBe("ADR-089 Appendix G, G.10");
    const word = am4.ownersWord as { ts: string; words: string; question: { ts: string }; reading: { ts: string; status: string } };
    expect(word.ts).toBe("2026-10-31T01:44:06Z");
    expect(word.words).toBe("For the first question, there should be multiple awareness rolls. Yes, at the snap. But at other points along the way.");
    expect([word.question.ts, word.reading.ts]).toEqual(["2026-10-31T01:40:36Z", "2026-10-31T01:44:50Z"]);
    expect(word.reading.status).toMatch(/^the Orchestrator's reading, told to the owner; the owner may still switch to set moments/);
  });

  it("carries no guard rule and no choice still to be made: step 2's guard is AM-1's, step 3's AM-3's, and step 4's AM-6's", () => {
    const am4 = entryOf(committed(), "AM-4");
    expect(() => guardRuleOf(am4)).toThrow(/AM-4 supersedes s7\.earlyShare, not the guard/);
    expect(guardFor(committed(), "2").entry.id).toBe("AM-1");
    expect(guardFor(committed(), "3").entry.id).toBe("AM-3");
    expect(guardFor(committed(), "4").entry.id).toBe("AM-6");
    expect(JSON.stringify(am4)).not.toMatch(/<[^<>]*\|[^<>]*>/);
  });

  it("files the looks, the margin's CHOSEN terms, D36 as the Orchestrator's default and s7.earlyShare's band unchanged", () => {
    const rule = entryOf(committed(), "AM-4").rule as Record<string, unknown>;
    expect(rule["sight"]).toBe("LOOKS");
    expect(Object.keys(rule["looks"] as object)).toEqual(["snap", "beat", "ticks", "return", "perRusherPerTick", "orderWithinTick", "rusherNotRecord"]);
    expect(rule["label"]).toEqual({ sense: ".../t<tick>/<rusherId>:sense", return: ".../t<tick>/<rusherId>:return" });
    const margin = rule["margin"] as Record<string, unknown>;
    expect([margin["awarenessDivisor"], margin["traitBonus"], margin["fromTerm"], margin["registersAtOrAbove"], margin["preSnapTerm"]]).toEqual([5, 10, { FRONT: 20, SIDE: 0, BEHIND: -30 }, 0, false]);
    expect((margin["closeness"] as Record<string, unknown>)["slopePerSecond"]).toBe(20);
    expect(String((rule["D36"] as Record<string, unknown>)["status"])).toMatch(/^Orchestrator default, shown to the owner, not asked; not part of the owner's ruling$/);
    const early = rule["earlyShare"] as Record<string, unknown>;
    const filed = filing().bands.clauses.find((c) => c.id === "s7.earlyShare") as unknown as Record<string, unknown>;
    expect([early["lo"], early["hi"]]).toEqual([0.85, 0.95]);
    expect([early["lo"], early["hi"]]).toEqual([filed["lo"], filed["hi"]]);
  });
});

describe("AM-5: shape L's toucher die, one per pair (ADR-089 Appendix G, G.11; review CT-F7)", () => {
  const SHAPE_L = "rule.lateBlock.shapeL";

  it("changes AM-2's shape-L toucher die to the pair label through rule.amends; filed before step 3, read where AM-2 is, superseding no clause; shown, not asked", () => {
    const am2 = entryOf(committed(), "AM-2");
    const am5 = entryOf(committed(), "AM-5");
    expect(am5.rule["amends"]).toEqual([{ entry: "AM-2", path: SHAPE_L, was: "rush/t<tick>/<toucherId>:late", becomes: "rush/t<tick>/<toucherId>:late:<rusherId>" }]);
    expect([am5.supersedes, am5.untouched, am5.defaults, am5.adrLines]).toEqual([[], [], [], []]);
    // The design lines that name the late block's dice: 546 and 1320 the rusher's die, 348, 933 and 1388 the bare label.
    expect(am5.cites).toEqual([348, 546, 933, 1320, 1388]);
    expect(am5.filedBeforeStep).toBe("3");
    expect(am5.steps).toEqual(am2.steps);
    expect(am5.record).toBe("ADR-089 Appendix G, G.11");
    expect(am5.ownersWord, "an Orchestrator ruling on a label: shown, not asked").toBeNull();
    const shapeL = (am5.rule["lateBlock"] as Record<string, Record<string, string>>)["shapeL"]!;
    expect([shapeL["rusherDie"], shapeL["toucherDie"]]).toEqual(["rush/t<tick>/<rusherId>:late", "rush/t<tick>/<toucherId>:late:<rusherId>"]);
    expect((am5.rule["lateBlock"] as Record<string, unknown>)["shapeS"]).toBe("unchanged");
    expect(String(am5.rule["P17"])).toContain("<rusherId>:late and <toucherId>:late:<rusherId>");
  });

  it("reads AM-2's shape L with the pair label, its rusher die and shape S as filed; AM-2's own entry and the text before AM-5 are unchanged", () => {
    const file = committed();
    const am2 = entryOf(file, "AM-2");
    const filedL = (am2.rule["lateBlock"] as Record<string, string>)["shapeL"]!;
    expect(filedL).toContain("two d100s, rush/t<tick>/<rusherId>:late and rush/t<tick>/<toucherId>:late, and jitter");
    const amendedL = amendedRuleText(file, "AM-2", SHAPE_L);
    expect(amendedL).toBe(filedL.replace("rush/t<tick>/<toucherId>:late,", "rush/t<tick>/<toucherId>:late:<rusherId>,"));
    expect(amendedL).toContain("two d100s, rush/t<tick>/<rusherId>:late and rush/t<tick>/<toucherId>:late:<rusherId>, and jitter");
    expect(amendedRuleText(file, "AM-2", "rule.lateBlock.shapeS")).toBe((am2.rule["lateBlock"] as Record<string, string>)["shapeS"]);
    // Before AM-5 the text is AM-2's own; step 2's view holds neither.
    expect(amendedRuleText({ ...file, entries: file.entries.slice(0, 4) }, "AM-2", SHAPE_L)).toBe(filedL);
    expect(amendmentsAtStep(file, "2").entries.map((e) => e.id)).toEqual(["AM-1"]);
    expect(() => amendedRuleText(file, "AM-2", "rule.lateBlock")).toThrow(/rule\.lateBlock is not a text under AM-2's rule/);
    expect(() => amendedRuleText(file, "AM-2", "reason")).toThrow(/reason is not a text under AM-2's rule/);
  });

  it("carries no guard rule and no choice still to be made: step 2's guard is AM-1's and step 3's AM-3's", () => {
    const am5 = entryOf(committed(), "AM-5");
    expect(() => guardRuleOf(am5)).toThrow(/AM-5 supersedes .*not the guard/);
    expect(guardFor(committed(), "2").entry.id).toBe("AM-1");
    expect(guardFor(committed(), "3").entry.id).toBe("AM-3");
    expect(JSON.stringify(am5)).not.toMatch(/<[^<>]*\|[^<>]*>/);
  });

  it("validateAmendments refuses a rule.amends item that names no earlier entry, an entry filed before a later step, an entry with a guard rule, no text under its rule, a was not found once as amended so far, or no change", () => {
    const refusesAmends = (items: unknown, problem: RegExp): void => {
      const j = copy();
      ruleOf(j, 4)["amends"] = items;
      const problems = amendmentsProblems(j, filing());
      expect(problems.some((p) => problem.test(p)), `wanted ${String(problem)}, got:\n${problems.join("\n")}`).toBe(true);
      expect(() => validateAmendments(j, filing())).toThrow(AmendmentsValidationError);
    };
    const item = { entry: "AM-2", path: SHAPE_L, was: "rush/t<tick>/<toucherId>:late", becomes: "rush/t<tick>/<toucherId>:late:<rusherId>" };
    expect(amendmentsProblems(copy(), filing())).toEqual([]);
    refusesAmends([], /entries\.4\.rule\.amends: must be a non-empty array/);
    refusesAmends("AM-2", /entries\.4\.rule\.amends: must be a non-empty array/);
    refusesAmends([{ ...item, entry: "AM-5" }], /entries\.4\.rule\.amends\.0\.entry: AM-5 is not an entry filed before this one/);
    refusesAmends([{ ...item, entry: "AM-6" }], /entries\.4\.rule\.amends\.0\.entry: AM-6 is not an entry filed before this one/);
    refusesAmends([{ ...item, path: "rule.lateBlock" }], /entries\.4\.rule\.amends\.0\.path: rule\.lateBlock is not a text under AM-2's rule/);
    refusesAmends([{ ...item, path: "reason" }], /entries\.4\.rule\.amends\.0\.path: reason is not a text under AM-2's rule/);
    refusesAmends([{ ...item, was: "nowhere" }], /entries\.4\.rule\.amends\.0\.was: found 0 times in AM-2's rule\.lateBlock\.shapeL as amended so far, not once/);
    refusesAmends([{ ...item, was: ":late" }], /entries\.4\.rule\.amends\.0\.was: found 2 times/);
    refusesAmends([{ ...item, becomes: item.was }], /entries\.4\.rule\.amends\.0\.becomes: the same as was/);
    refusesAmends([{ ...item, why: "x" }], /entries\.4\.rule\.amends\.0\.why: not a field of an amends item/);
    refusesAmends([{ ...item, becomes: "" }], /entries\.4\.rule\.amends\.0\.becomes: must be a non-empty string/);
    // A guard rule is read as filed (guardFor), so an item may not change one: a guard changes only by a new guard entry.
    refusesAmends([{ entry: "AM-1", path: "rule.se", was: "binomialIndependent", becomes: "pairedPerGame" }], /entries\.4\.rule\.amends\.0\.entry: AM-1 carries a guard rule, which the harness reads as filed; a guard changes only by a new guard entry, as AM-3 did/);
    refusesAmends([{ entry: "AM-3", path: "rule.dirtyPocket", was: "lastStatusAtOrBeforeRelease", becomes: "lastStatus" }], /entries\.4\.rule\.amends\.0\.entry: AM-3 carries a guard rule/);
    // An entry amends only one filed before the same step or an earlier one, so a step's view never holds an item without its text.
    const early = copy();
    early.entries[4]!["filedBeforeStep"] = "2";
    expect(amendmentsProblems(early, filing())).toContain(
      "entries.4.rule.amends.0.entry: AM-2 is filed before step 3, a later step than this entry's 2; an entry amends only one filed before the same step or an earlier one",
    );
    expect(() => validateAmendments(early, filing())).toThrow(AmendmentsValidationError);
    // Items read the text as the items before them left it.
    refusesAmends([item, { ...item, was: "rush/t<tick>/<toucherId>:late, and", becomes: "x" }], /entries\.4\.rule\.amends\.1\.was: found 0 times in AM-2's rule\.lateBlock\.shapeL as amended so far/);
  });
});

describe("a step's view of the file (step-3 plan §4.3, critique 2 B2)", () => {
  it("at step 2 is AM-1 alone, fnv1a:d5f9de6d, the pin step 2's records stamp; at step 3 it is AM-1 to AM-5, pinned after AM-5; at step 4 AM-1 to AM-7, fnv1a:e0c05cf0, step 4's pin; at step 5a and later it is the whole file", () => {
    const file = committed();
    expect(STEP2_AMENDMENTS_DIGEST).toBe(STEP2_VIEW_DIGEST);
    expect(amendmentsDigestAtStep(file, "3")).toBe(STEP3_AMENDMENTS_DIGEST);
    expect(amendmentsDigestAtStep(file, "2")).toBe(STEP2_VIEW_DIGEST);
    const two = amendmentsAtStep(file, "2");
    expect(two.entries.map((e) => e.id)).toEqual(["AM-1"]);
    expect({ ...two, entries: [] }).toEqual({ ...file, entries: [] });
    for (const step of ["0", "1"] as const) expect(amendmentsAtStep(file, step).entries, step).toEqual([]);
    expect(amendmentsAtStep(file, "3").entries.map((e) => e.id)).toEqual(UP_TO_AM5);
    expect(STEP3_AMENDMENTS_DIGEST).toBe(STEP3_VIEW_DIGEST);
    expect(amendmentsDigestAtStep(file, "3")).toBe(STEP3_VIEW_DIGEST);
    // Step 4's view cuts AM-8 onward (filed before step 5a), so step 4's records keep grading.
    expect(amendmentsAtStep(file, "4").entries.map((e) => e.id)).toEqual(UP_TO_AM7);
    expect(amendmentsDigestAtStep(file, "4")).toBe(STEP4_VIEW_DIGEST);
    expect(STEP4_AMENDMENTS_PIN).toBe(STEP4_VIEW_DIGEST);
    for (const step of ADR_089_STEP_IDS.slice(ADR_089_STEP_IDS.indexOf("5a"))) {
      expect(amendmentsAtStep(file, step).entries.map((e) => e.id), step).toEqual(UP_TO_AM10);
      expect(amendmentsDigestAtStep(file, step), step).toBe(PINNED_DIGEST);
    }
  });

  it("an edit to AM-2 leaves step 2's view; an edit to AM-1 moves it", () => {
    const j = copy();
    (ruleOf(j, 1)["lateBlock"] as Record<string, unknown>)["engageSeconds"] = 1.5;
    expect(amendmentsDigestAtStep(j as unknown as AmendmentsFile, "2")).toBe(STEP2_VIEW_DIGEST);
    expect(amendmentsDigestAtStep(j as unknown as AmendmentsFile, "3")).not.toBe(PINNED_DIGEST);
    ruleOf(j, 0)["zLeague"] = 2.5;
    expect(amendmentsDigestAtStep(j as unknown as AmendmentsFile, "2")).not.toBe(STEP2_VIEW_DIGEST);
  });

  it("openAmendmentsAtStep returns the view under its pin, and refuses it under another", () => {
    expect(openAmendmentsAtStep(PATH, filing(), "2", STEP2_AMENDMENTS_DIGEST).entries.map((e) => e.id)).toEqual(["AM-1"]);
    expect(openAmendmentsAtStep(PATH, filing(), "4", STEP4_VIEW_DIGEST).entries.map((e) => e.id)).toEqual(UP_TO_AM7);
    expect(openAmendmentsAtStep(PATH, filing(), "5a", AMENDMENTS_DIGEST).entries.map((e) => e.id)).toEqual(UP_TO_AM10);
    expect(() => openAmendmentsAtStep(PATH, filing(), "4", AMENDMENTS_DIGEST)).toThrow(/read at step 4 .*digests to fnv1a:e0c05cf0, not the pin/);
    expect(openAmendmentsAtStep(PATH, filing(), "3", STEP3_AMENDMENTS_DIGEST).entries.map((e) => e.id)).toEqual(UP_TO_AM5);
    expect(() => openAmendmentsAtStep(PATH, filing(), "3", AMENDMENTS_DIGEST)).toThrow(/read at step 3 .*digests to fnv1a:517bb9fe, not the pin/);
    expect(() => openAmendmentsAtStep(PATH, filing(), "2", AMENDMENTS_DIGEST)).toThrow(
      new RegExp(`read at step 2 \\(its entries filed before step 2 or an earlier step\\), digests to ${STEP2_VIEW_DIGEST}, not the pin ${AMENDMENTS_DIGEST}: an amendment is append-only`),
    );
  });
});

describe("validateAmendments: every rule, on a copy that breaks it", () => {
  const refuses = (mutate: (j: ReturnType<typeof copy>) => void, problem: RegExp): void => {
    const j = copy();
    mutate(j);
    const problems = amendmentsProblems(j, filing());
    expect(problems.some((p) => problem.test(p)), `wanted ${String(problem)}, got:\n${problems.join("\n")}`).toBe(true);
    expect(() => validateAmendments(j, filing())).toThrow(AmendmentsValidationError);
  };

  it("the format and the step-0 filing's digest", () => {
    refuses((j) => (j["format"] = "adr-089-amendments/v0"), /^format: must be "adr-089-amendments\/v1"/);
    refuses((j) => (j["filing"] = "fnv1a:6b9ef02c"), /^filing: must be the step-0 filing's digest fnv1a:9a1c90e9/);
    refuses((j) => (j["extra"] = 1), /^extra: not a field/);
    refuses((j) => (j.entries = []), /^entries: must be a non-empty array/);
    expect(amendmentsProblems([], filing())).toEqual(["(root): must be an object"]);
  });

  it("ids run AM-1, AM-2, ... in order", () => {
    refuses((j) => (j.entries[0]!["id"] = "AM-2"), /entries\.0\.id: must be AM-1/);
    refuses((j) => (j.entries[1]!["id"] = "AM-3"), /entries\.1\.id: must be AM-2/);
    const n = copy().entries.length;
    refuses((j) => j.entries.push({ ...j.entries[0]! }), new RegExp(`entries\\.${String(n)}\\.id: must be AM-${String(n + 1)} `));
  });

  it("every supersedes and untouched id is a clause of the step-0 file, and none is both", () => {
    refuses((j) => (j.entries[0]!["supersedes"] = ["guard.mix", "guard.byClass", "guard.noSuchClause"]), /supersedes: guard\.noSuchClause is not a clause/);
    refuses((j) => (j.entries[0]!["untouched"] = ["s9.nothing"]), /untouched: s9\.nothing is not a clause/);
    refuses((j) => (j.entries[0]!["untouched"] = ["guard.mix"]), /guard\.mix is both superseded and untouched/);
  });

  it("no superseded clause is an acceptance clause (§6.10)", () => {
    refuses((j) => {
      j.entries[0]!["supersedes"] = ["guard.mix", "guard.byClass", "acc.intGuard"];
      j.entries[0]!["untouched"] = ["s4.motion.int", "s5a.int"];
    }, /supersedes: acc\.intGuard is an acceptance clause, which an amendment never widens/);
  });

  it("every adrLines and cites entry is a line of the design as C0 landed it", () => {
    refuses((j) => (j.entries[0]!["adrLines"] = [1306, 2019]), /adrLines\.1: 2019 is not a line of the design as C0 landed it \(1 to 2018\)/);
    refuses((j) => (j.entries[0]!["cites"] = [0]), /cites\.0: 0 is not a line/);
    refuses((j) => (j.entries[0]!["cites"] = [1287.5]), /cites\.0: 1287\.5 is not a line/);
  });

  it("filedBeforeStep and every step are steps of ADR-089", () => {
    expect(ADR_089_STEP_IDS).toEqual(["0", "1", "2", "3", "4", "5a", "5b", "6", "7", "8a", "8b", "9", "10", "11"]);
    refuses((j) => (j.entries[0]!["filedBeforeStep"] = "12"), /filedBeforeStep: "12" is not a step of ADR-089/);
    refuses((j) => (j.entries[0]!["steps"] = ["2", "5c"]), /steps\.1: "5c" is not a step of ADR-089/);
  });

  it("no step an entry reads at comes before its filedBeforeStep (review CT-F8)", () => {
    refuses((j) => (j.entries[0]!["steps"] = ["1", "2", "3"]), /^entries\.0\.steps\.0: step 1 comes before filedBeforeStep 2; an entry reads only at the step it was filed before and later ones$/);
    refuses((j) => (j.entries[0]!["filedBeforeStep"] = "5a"), /^entries\.0\.steps\.1: step 3 comes before filedBeforeStep 5a/);
    // AM-1 as filed: before step 2, read at steps 2 to 10.
    const j = copy();
    expect(amendmentsProblems(j, filing())).toEqual([]);
    expect([j.entries[0]!["filedBeforeStep"], (j.entries[0]!["steps"] as string[])[0]]).toEqual(["2", "2"]);
  });

  it("every arm in a base map is an arm of this build, mapped from a step the entry reads at", () => {
    refuses((j) => ((ruleOf(j)["bases"] as Record<string, Record<string, string>>)["2"]!["B9"] = "A1"), /bases\.2\.B9: not an arm of this build/);
    refuses((j) => ((ruleOf(j)["bases"] as Record<string, Record<string, string>>)["2"]!["B1"] = "A99"), /bases\.2\.B1: its base "A99" is not an arm of this build/);
    refuses((j) => ((ruleOf(j)["bases"] as Record<string, unknown>)["12"] = { B1: "A1" }), /bases\.12: not a step of ADR-089/);
    refuses((j) => ((ruleOf(j)["bases"] as Record<string, unknown>)["11"] = { B1: "A1" }), /bases\.11: a base map for a step the entry does not read at/);
    refuses((j) => ((ruleOf(j)["bases"] as Record<string, Record<string, string>>)["2"]!["B1"] = "B1"), /an arm is not its own base/);
  });

  it("a guard entry carries the rule the harness reads", () => {
    refuses((j) => (ruleOf(j)["statistic"] = "worstSet"), /rule\.statistic: must be "pooledZ"/);
    refuses((j) => (ruleOf(j)["zLeague"] = "2"), /rule\.zLeague: must be a finite number/);
    refuses((j) => delete ruleOf(j)["bases"], /rule\.bases: must map at least one step/);
    refuses((j) => (ruleOf(j)["breachIf"] = "atLeast"), /rule\.breachIf: must be "greaterThan"/);
  });

  it("every field of an entry, and the owner's word as null or with its ts", () => {
    refuses((j) => delete j.entries[0]!["reason"], /entries\.0\.reason: missing/);
    refuses((j) => (j.entries[0]!["note"] = "x"), /entries\.0\.note: not a field of an entry/);
    refuses((j) => (j.entries[0]!["ownersWord"] = "yes"), /ownersWord: must be null/);
    const j = copy();
    j.entries[0]!["ownersWord"] = { ts: "2026-10-27T02:28:46Z", text: "Yes" };
    expect(amendmentsProblems(j, filing())).toEqual([]);
  });
});

describe("loading and the pin", () => {
  it("an appended valid entry validates, but the file is refused until the pin moves with it (append-only)", () => {
    const j = copy();
    // A stand-in guard entry after the filed ones (the shape AM-3 will have), with a step-3 map of step-2 arms.
    const next = `AM-${String(j.entries.length + 1)}`;
    const standIn = JSON.parse(JSON.stringify(j.entries[0])) as Record<string, unknown>;
    standIn["id"] = next;
    standIn["filedBeforeStep"] = "3";
    standIn["steps"] = ["3", "4", "5a", "5b", "6", "7", "8a", "8b", "9", "10"];
    (standIn["rule"] as Record<string, unknown>)["bases"] = { "3": { B3: "A1" } };
    j.entries.push(standIn);
    expect(amendmentsProblems(j, filing())).toEqual([]);
    const path = join(tmp, "appended.json");
    writeFileSync(path, JSON.stringify(j, null, 2));
    expect(() => openAmendments(path, filing())).toThrow(new RegExp(`digests to fnv1a:[0-9a-f]{8}, not the pin ${AMENDMENTS_DIGEST}: an amendment is append-only; file a new named entry`));
    const opened = openAmendments(path, filing(), amendmentsDigest(j));
    expect(guardFor(opened, "3").entry.id).toBe(next);
    expect(guardFor(opened, "2").entry.id).toBe("AM-1");
    // Step 2's view does not see it: its pin and its guard are as before.
    expect(openAmendmentsAtStep(path, filing(), "2", STEP2_AMENDMENTS_DIGEST).entries.map((e) => e.id)).toEqual(["AM-1"]);
  });

  it("refuses a missing file, a file that is not JSON, and an edited one", () => {
    expect(() => loadAmendments(join(tmp, "none.json"), filing())).toThrow(/does not load/);
    const bad = join(tmp, "bad.json");
    writeFileSync(bad, "{ not json");
    expect(() => loadAmendments(bad, filing())).toThrow(/does not load/);
    const j = copy();
    ruleOf(j)["zLeague"] = 2.5;
    const edited = join(tmp, "edited.json");
    writeFileSync(edited, JSON.stringify(j));
    expect(() => openAmendments(edited, filing())).toThrow(/an amendment is append-only/);
  });

  it("names the entries a file holds when one is asked for that it does not", () => {
    const ids = committed().entries.map((e) => e.id);
    const next = `AM-${String(ids.length + 1)}`;
    expect(() => entryOf(committed(), next)).toThrow(`holds no ${next} (it holds ${ids.join(", ")})`);
    expect(() => guardRuleOf({ ...entryOf(committed(), "AM-1"), supersedes: ["guard.mix"] })).toThrow(/not the guard/);
  });
});

// --- ADR-089 step 5: AM-8, AM-9 and AM-10 (plan section 9 commits 2 and 3; filing.md sections 3 to 5) -----

/**
 * AM-8 as step 5's filing states it (`filing.md` §3.2), verbatim. The committed entry is this text but
 * for one sentence of its reason, the chance figure computed before filing (`AM8_CHANCE`).
 */
const AM8_FILED = {
  "id": "AM-8",
  "name": "the guard at step 5: the clean-pocket build against the s4 clean bench, the checklist on the league against step 4's design, and the clock alone",
  "filedBeforeStep": "5a",
  "steps": [
    "5a",
    "5b"
  ],
  "supersedes": [
    "guard.mix",
    "guard.byClass",
    "s5a.int"
  ],
  "untouched": [
    "acc.intGuard",
    "guard.onTheRun.clean",
    "guard.onTheRun.pressured",
    "guard.removedClass"
  ],
  "defaults": [
    "D9",
    "D28"
  ],
  "adrLines": [
    1306,
    1308,
    1053
  ],
  "cites": [
    945,
    946,
    1049,
    1051,
    1159,
    1287
  ],
  "record": "ADR-089 Appendix I, I.10",
  "reason": "AM-1 (Appendix F, F.11) reads the guard at steps 2 to 10 against the previous step's arm and requires each later step's map filed as a named entry before that step's arms run; this is step 5's, for both halves. At 5a the arms run on the clean bench, which step 4 never played, so the base is the step-4 build on that bench (E0), played fresh and twice in separate processes with identical stream digests; its decisions reproduce step 0's bench exactly and its release adds the motion. The graded 5a pair is the build that can become the game, pocket-1.s5a on the bench (E9), against E0, on both leagues. At 5b the map prices the checklist where throws on the run have a base, pocket-1.s5a on the league (F5) against step 4's design (D1), and the clock alone, the selection's winner restamped (F0) against F5; when F0's dials equal F5's (the winner is S theta 11) that pair compares a build with itself and is skipped by rule. AM-1 left s5a.int to an entry filed before 5a naming its base: its base is E0 and it is E9's by-class reading under this rule, so the clause and the guard cannot disagree on one pair; its filed reading is printed beside. Section 8 says each change is priced at its step under the guard: the checklist and the floor are priced at 5a on the bench and at 5b on the league, the clock at 5b; the alone arms (E1 to E8, E10) are printed beside, unguarded. This entry files step 5's class view, one classifier applied to both sides of every step-5 pair (steps 1 to 4 keep theirs, so their re-grades do not move): CLEAN_EXPIRY is an aimed throw, not on the run, not a CHECKDOWN decision, whose last pocket status at or before the decision is CLEAN, whose best read at the decision is below the normal bar and at 30 or more. On E0 and D1 these are today's clean desperation throws with someone at 30 or more, the very situation D23 changes, so D23's class has a like-for-like base; E0's clean desperation throws with best below 30 stay DESPERATION's clean part and are the removed class (s5a.removedClass). ON_THE_RUN has no base on the bench: it is reported at 5a against the real out-of-pocket rates (2.11% clean, 3.25% pressured) and graded at 5b on F5 against D1, which has escapes. The release clock is each arm's own, raw seconds on both sides. With nothing changed, three graded pairs at AM-1's 4.8% each stop the step by chance at most about 14% of the time (about 9% when F0 against F5 is skipped), less on shared seeds; the exact figure on the classes actually scored is computed on the step-5 harness before filing and printed in I.10. A breach stops the step and goes to the owner with both seed sets (D9).",
  "ownersWord": null,
  "rule": {
    "base": "previousStepArm",
    "pricingBase": "previousStepPricingArm",
    "bases": {
      "5a": {
        "E9": "E0"
      },
      "5b": {
        "F5": "D1",
        "F0": "F5"
      }
    },
    "laterBases": "filed as a named entry before that step's arms run",
    "gradedArms": "every arm in the step's map",
    "replayMustEqualPreviousRecords": true,
    "freshBases": {
      "E0": "no earlier record holds the s4 clean bench: played fresh and twice in separate processes, identical stream digests required, both sets, both leagues"
    },
    "skipEqualDials": true,
    "classView": "S5",
    "allowance": "filed",
    "se": "binomialIndependent",
    "statistic": "pooledZ",
    "seedSets": [
      1,
      2
    ],
    "zLeague": 2.0,
    "zClass": 3.0,
    "breachIf": "greaterThan",
    "zSetSE0": 0,
    "classes": "GUARD_CLASSES",
    "reportedSplits": {
      "DESPERATION": [
        "DIRTY",
        "CLEAN"
      ],
      "PROGRESSION": [
        "AFTER_CLEAN_MOVE",
        "OTHER"
      ],
      "CLEAN_EXPIRY": [
        "AFTER_CLEAN_MOVE",
        "OTHER"
      ],
      "ON_THE_RUN": [
        "CLEAN_BREAKOUT",
        "PRESSURED"
      ]
    },
    "dirtyPocket": "lastStatusAtOrBeforeRelease",
    "onCompositionClassBreach": [
      "DESPERATION",
      "CHECKDOWN"
    ],
    "reportFiledReading": true,
    "reportMinimumExcess": true,
    "reportPairedSE": true,
    "cumulative": {
      "design": "A0",
      "pricing": "A14",
      "graded": false
    },
    "acceptedState": {
      "design": "A1",
      "pricing": "A11",
      "fromStep": "3",
      "graded": false
    }
  }
} as const;

/** AM-8's chance sentence as the filing drafted it, and as filed with the figure (ADR-089 Appendix I, I.10). */
const AM8_CHANCE = {
  drafted:
    "With nothing changed, three graded pairs at AM-1's 4.8% each stop the step by chance at most about 14% of the time (about 9% when F0 against F5 is skipped), less on shared seeds; the exact figure on the classes actually scored is computed on the step-5 harness before filing and printed in I.10.",
  filed:
    "With nothing changed, this map stops the step by chance about 14% of the time (13.9%; 9.3% when F0 against F5 is skipped), less on shared seeds: computed before filing as AM-6's figure was, with AM-1's statistic, step 4's records for D1 and the measured s4 clean bench for E0 standing in for step 5's, on the classes step 5's view scores; I.10 gives the method.",
} as const;

/** The committed entry's index (ids run AM-1, AM-2, ...): AM-8 is the eighth. */
const AM8_AT = 7;

describe("ADR-089 step 5: AM-8, the guard at step 5, and its optional guard rule fields (classView, freshBases, skipEqualDials, reportedSplits)", () => {
  /** A copy of the committed file with AM-8's rule edited. */
  const withAm8 = (edit: (rule: Record<string, unknown>) => void = () => undefined): ReturnType<typeof copy> => {
    const j = copy();
    expect(j.entries[AM8_AT]!["id"]).toBe("AM-8");
    edit(j.entries[AM8_AT]!["rule"] as Record<string, unknown>);
    return j;
  };
  const refusesAm8 = (edit: (rule: Record<string, unknown>) => void, problem: RegExp): void => {
    const problems = amendmentsProblems(withAm8(edit), filing());
    expect(problems.some((p) => problem.test(p)), `wanted ${String(problem)}, got:\n${problems.join("\n")}`).toBe(true);
  };
  const opened = (): AmendmentsFile => openAmendments(PATH, filing());

  it("is filed as its filing states it but for the chance sentence, which carries the figure computed before filing; the file validates under its pin", () => {
    const am8 = JSON.parse(JSON.stringify(entryOf(committed(), "AM-8"))) as Record<string, unknown>;
    const filed = JSON.parse(JSON.stringify(AM8_FILED)) as Record<string, unknown>;
    expect(String(filed["reason"]).split(AM8_CHANCE.drafted)).toHaveLength(2);
    expect(am8["reason"]).toBe(String(filed["reason"]).replace(AM8_CHANCE.drafted, AM8_CHANCE.filed));
    expect({ ...am8, reason: "" }).toEqual({ ...filed, reason: "" });
    expect(am8).toMatchObject({ filedBeforeStep: "5a", steps: ["5a", "5b"], ownersWord: null, record: "ADR-089 Appendix I, I.10" });
    expect(am8["supersedes"]).toEqual(["guard.mix", "guard.byClass", "s5a.int"]);
    expect(amendmentsProblems(committed(), filing())).toEqual([]);
    expect(amendmentsProblems(withAm8(), filing())).toEqual([]);
    expect(amendmentsDigest(committed())).toBe(PINNED_DIGEST);
  });

  it("is AM-1's rule but for bases, classView, freshBases, skipEqualDials and reportedSplits", () => {
    const am1 = ruleOf(copy());
    const am8 = JSON.parse(JSON.stringify(entryOf(committed(), "AM-8").rule)) as Record<string, unknown>;
    expect(am8).toEqual(JSON.parse(JSON.stringify(AM8_FILED.rule)));
    // The composition breach classes stay AM-1's (filing.md §3).
    expect(am8["onCompositionClassBreach"]).toEqual(["DESPERATION", "CHECKDOWN"]);
    const NEW = ["bases", "classView", "freshBases", "skipEqualDials", "reportedSplits"];
    const differ = [...new Set([...Object.keys(am1), ...Object.keys(am8)])].filter((k) => JSON.stringify(am1[k]) !== JSON.stringify(am8[k])).sort();
    expect(differ).toEqual([...NEW].sort());
    for (const k of ["classView", "freshBases", "skipEqualDials"]) expect(k in am1, `AM-1 carries no ${k}`).toBe(false);
    // AM-1 reports DESPERATION's halves; AM-8 keeps them and adds three classes' splits.
    expect(am1["reportedSplits"]).toEqual({ DESPERATION: ["DIRTY", "CLEAN"] });
    expect((am8["reportedSplits"] as Record<string, unknown>)["DESPERATION"]).toEqual(["DIRTY", "CLEAN"]);
    // AM-3 and AM-6 changed only the bases (filing §3.3).
    const j = copy();
    for (const id of ["AM-3", "AM-6"]) {
      const r = j.entries.find((e) => e["id"] === id)!["rule"] as Record<string, unknown>;
      expect(Object.keys(r).filter((k) => JSON.stringify(r[k]) !== JSON.stringify(am1[k])), id).toEqual(["bases"]);
    }
  });

  it("is the guard at 5a and 5b, read with step 5's class view; step 4's is AM-6's, read with throwClassOf", () => {
    const file = opened();
    for (const step of ["5a", "5b"] as const) {
      const g = guardWithView(file, step);
      expect(g.entry.id, step).toBe("AM-8");
      expect(guardFor(file, step).entry.id, step).toBe("AM-8");
      expect(g.view, step).toBe("S5");
      expect(g.classify, step).toBe(throwClassOfS5);
      expect(g.rule.freshBases, step).toEqual(AM8_FILED.rule.freshBases);
      expect(g.rule.skipEqualDials, step).toBe(true);
      expect(g.rule.reportedSplits, step).toEqual(AM8_FILED.rule.reportedSplits);
    }
    expect(guardWithView(file, "5a").bases).toEqual({ E9: "E0" });
    expect(guardWithView(file, "5b").bases).toEqual({ F5: "D1", F0: "F5" });
    for (const [step, id] of [["2", "AM-1"], ["3", "AM-3"], ["4", "AM-6"]] as const) {
      const g = guardWithView(file, step);
      expect(g.entry.id, step).toBe(id);
      expect(g.view, step).toBeUndefined();
      expect(g.classify, step).toBe(throwClassOf);
    }
    // Step 4's view (AM-1 to AM-7) maps no step-5 guard: AM-8 is filed before 5a, so the view cuts it.
    const four = amendmentsAtStep(committed(), "4");
    expect(four.entries.map((e) => e.id)).toEqual(UP_TO_AM7);
    expect(() => guardWithView(four, "5a")).toThrow(/no filed amendment maps step 5a's guard bases/);
    expect(guardWithView(four, "4").entry.id).toBe("AM-6");
  });

  it("refuses a class view that is not one, or that maps a step before 5a", () => {
    refusesAm8((r) => (r["classView"] = "S6"), /entries\.7\.rule\.classView: must be one of S5 \(got "S6"\)/);
    refusesAm8((r) => (r["classView"] = 5), /entries\.7\.rule\.classView: must be one of S5 \(got 5\)/);
    refusesAm8((r) => (r["bases"] = { "4": { D1: "C1" }, "5a": { E9: "E0" } }), /entries\.7\.rule\.classView: S5 reads from step 5a; the rule maps step 4, which keeps the classes it was graded with/);
  });

  it("refuses freshBases that are empty, name no arm of this build, name an arm the maps do not use as a base, or say nothing", () => {
    refusesAm8((r) => (r["freshBases"] = {}), /entries\.7\.rule\.freshBases: must map at least one base arm to how it is played/);
    refusesAm8((r) => (r["freshBases"] = ["E0"]), /entries\.7\.rule\.freshBases: must map at least one base arm/);
    refusesAm8((r) => (r["freshBases"] = { E11: "played fresh" }), /entries\.7\.rule\.freshBases\.E11: not an arm of this build/);
    refusesAm8((r) => (r["freshBases"] = { E9: "played fresh" }), /entries\.7\.rule\.freshBases\.E9: not a base in the rule's maps/);
    refusesAm8((r) => (r["freshBases"] = { E0: "" }), /entries\.7\.rule\.freshBases\.E0: must say how it is played/);
  });

  it("refuses a skipEqualDials that is not a boolean", () => {
    refusesAm8((r) => (r["skipEqualDials"] = "yes"), /entries\.7\.rule\.skipEqualDials: must be true or false/);
    expect(amendmentsProblems(withAm8((r) => (r["skipEqualDials"] = false)), filing())).toEqual([]);
  });

  it("refuses reportedSplits naming a class or a split outside GUARD_REPORTED_SPLITS, an empty list, or a repeat", () => {
    expect(GUARD_REPORTED_SPLITS).toEqual(AM8_FILED.rule.reportedSplits);
    refusesAm8((r) => (r["reportedSplits"] = {}), /entries\.7\.rule\.reportedSplits: must map at least one class to its splits/);
    refusesAm8((r) => ((r["reportedSplits"] as Record<string, unknown>)["SACK"] = ["DIRTY"]), /entries\.7\.rule\.reportedSplits\.SACK: no split is read for this class/);
    refusesAm8((r) => ((r["reportedSplits"] as Record<string, unknown>)["DESPERATION"] = ["DIRTY", "LATE"]), /entries\.7\.rule\.reportedSplits\.DESPERATION: must list distinct splits of DIRTY, CLEAN/);
    refusesAm8((r) => ((r["reportedSplits"] as Record<string, unknown>)["ON_THE_RUN"] = []), /entries\.7\.rule\.reportedSplits\.ON_THE_RUN: must list distinct splits/);
    refusesAm8((r) => ((r["reportedSplits"] as Record<string, unknown>)["PROGRESSION"] = ["OTHER", "OTHER"]), /entries\.7\.rule\.reportedSplits\.PROGRESSION: must list distinct splits/);
    // A subset of a class's splits is allowed.
    expect(amendmentsProblems(withAm8((r) => (r["reportedSplits"] = { DESPERATION: ["CLEAN"] })), filing())).toEqual([]);
  });

  it("reads a rule without the fields as AM-1's: no view, nothing fresh, no pair skipped", () => {
    const am1 = guardFor(committed(), "2").rule;
    expect(guardClassView(am1)).toBeUndefined();
    expect(guardClassifier(am1)).toBe(throwClassOf);
    expect(isFreshBase(am1, "E0")).toBe(false);
    expect(skipsEqualDials(am1, "fnv1a:00000001", "fnv1a:00000001")).toBe(false);
  });
});

describe("ADR-089 step 5: AM-9, step 5a's readings (Appendix I, I.11; filing.md §4.1)", () => {
  it("supersedes s5a.under1, s5a.over35 and s5a.cleanOuts for their reading only; with AM-8's s5a.int every s5a clause is named; filed before 5a, read at 5a, shown, not asked", () => {
    const am9 = entryOf(committed(), "AM-9");
    const clauses = filing().bands.clauses;
    const ids = new Set(clauses.map((c) => c.id));
    expect(am9.supersedes).toEqual(["s5a.under1", "s5a.over35", "s5a.cleanOuts"]);
    for (const id of [...am9.supersedes, ...am9.untouched]) expect(ids.has(id), id).toBe(true);
    // Every s5a clause is superseded or untouched here, but s5a.int, which AM-8 supersedes.
    const named = [...am9.supersedes, ...am9.untouched, ...entryOf(committed(), "AM-8").supersedes].filter((id) => id.startsWith("s5a."));
    expect([...new Set(named)].sort()).toEqual(clauses.filter((c) => c.step === "5a").map((c) => c.id).sort());
    expect(am9.untouched).toContain("s10.dial.deltas");
    expect(am9.untouched).toContain("s10.fittingOrder");
    expect(am9.filedBeforeStep).toBe("5a");
    expect(am9.steps).toEqual(["5a"]);
    expect(am9.defaults).toEqual(["D23", "D25", "D26", "D27", "D33"]);
    expect(am9.ownersWord, "Orchestrator defaults and readings: shown, not asked").toBeNull();
    expect(am9.record).toBe("ADR-089 Appendix I, I.11");
  });

  it("carries no guard rule, and files the fit rule before the fit runs: three dials, 19 offsets, the clean attempts row, the estimate and its tie rule", () => {
    const am9 = entryOf(committed(), "AM-9");
    expect(() => guardRuleOf(am9)).toThrow(/AM-9 supersedes s5a\.under1, s5a\.over35, s5a\.cleanOuts, not the guard/);
    expect(Object.keys(am9.rule)).toEqual(["readings"]);
    const r = am9.rule["readings"] as Record<string, string>;
    expect(Object.keys(r).filter((k) => k.startsWith("fit."))).toEqual(["fit.dials", "fit.grid", "fit.target", "fit.population", "fit.bench", "fit.method", "fit.approximation", "fit.record", "fit.withdrawn"]);
    expect(r["fit.dials"]).toMatch(/^qb\.readSystem\.HALF_FIELD\.budgetDeltaSeconds, FULL_FIELD and CONCEPT, and nothing else\. Today -0\.5, \+1\.0 and -1\.0 s\.$/);
    expect(r["fit.grid"]).toMatch(/^Offsets from today's values, -1\.5 to \+3\.0 s in 0\.25 s steps \(19 values\)\./);
    expect(r["fit.target"]).toContain("0.5, 5.8, 14.3, 26.2, 23.4, 15.5, 7.9, 3.1, 1.2, 0.8, 1.1 percent, which sum to 99.8 as printed and are renormalized to 100");
    expect(r["fit.method"]).toContain("(6,859 combinations)");
    expect(r["fit.record"]).toMatch(/^reports\/adr-089-step5a\.fit\.json, format adr-089-step5a-fit\/v1, written once by pocket --step 5a --fit, which refuses to overwrite it/);
    expect(r["reset"]).toMatch(/^1\.0 s, CHOSEN by D33 and never fitted\./);
    // Step 5's guard is AM-8's at 5a and 5b; AM-9 and AM-10 file readings only.
    for (const step of ["5a", "5b"] as const) expect(guardFor(committed(), step).entry.id, step).toBe("AM-8");
  });
});

describe("ADR-089 step 5: AM-10, step 5b's readings (Appendix I, I.12; filing.md §5)", () => {
  it("supersedes s5b.binsTwiceFtn only, names every other s5b clause untouched, and widens no acceptance clause; filed before 5a, read at 5b and 10", () => {
    const am10 = entryOf(committed(), "AM-10");
    const clauses = filing().bands.clauses;
    const byId = new Map(clauses.map((c) => [c.id, c]));
    expect(am10.supersedes).toEqual(["s5b.binsTwiceFtn"]);
    for (const id of [...am10.supersedes, ...am10.untouched]) expect(byId.has(id), id).toBe(true);
    expect([...am10.supersedes, ...am10.untouched].filter((id) => id.startsWith("s5b.")).sort()).toEqual(clauses.filter((c) => c.step === "5b").map((c) => c.id).sort());
    // mr.bin20.raw and acc.liveWonRep.push are acceptance clauses: untouched, never superseded (§6.10).
    for (const id of ["mr.bin20.raw", "mr.unblockedPressures", "mr.unblockedShare", "mr.unblockedMen", "acc.liveWonRep.push"]) {
      expect(byId.get(id)!.step, id).toBe("acceptance");
      expect(am10.untouched, id).toContain(id);
    }
    expect(am10.filedBeforeStep).toBe("5a");
    expect(am10.steps).toEqual(["5b", "10"]);
    expect(am10.defaults).toEqual(["D1", "D6", "D31"]);
    expect(am10.record).toBe("ADR-089 Appendix I, I.12");
    expect(() => guardRuleOf(am10)).toThrow(/AM-10 supersedes s5b\.binsTwiceFtn, not the guard/);
  });

  it("records the owner's word as I.9 gives it: Accept at 2026-11-07T18:22:30Z, the fallback curve standing for 5b's selection", () => {
    const am10 = entryOf(committed(), "AM-10");
    const word = am10.ownersWord as Record<string, unknown>;
    expect(word["ts"]).toBe("2026-11-07T18:22:30Z");
    expect(word["words"]).toBe("Accept");
    const reading = word["reading"] as Record<string, unknown>;
    expect(reading["record"]).toBe("ADR-089 Appendix I, I.9 item 1");
    expect(reading["words"]).toBe("The falling curve's fallback (default D1) stands for step 5b's selection either way.");
    const adr = readFileSync(join(PKG, "../../docs/decisions/ADR-089-the-pocket-on-a-real-clock.md"), "utf8");
    const i9 = adr.slice(adr.indexOf("### I.9 The owner's answers"));
    expect(i9).toContain("At 2026-11-07 18:22:30Z the owner answered the miss card (posted 2026-11-07 18:16Z");
    expect(i9).toContain(String(reading["words"]));
    const r = am10.rule["readings"] as Record<string, string>;
    expect(Object.keys(r)).toEqual(["selectionCurve", "selectionLeague", "scorable", "selectionSeeds", "ifL", "s5b.arm", "graded", "reported", "s5b.clockExpired", "acc.liveWonRep.push.L", "missSplit", "secondProcess", "step10", "seedSets"]);
    expect(r["selectionCurve"]).toMatch(/^At 5b the pressured-by-release curve \(the filed fallback, D1\) selects/);
    expect(r["acc.liveWonRep.push.L"]).toMatch(/at most 0 on each league and seed set, from step 1's count/);
  });
});
