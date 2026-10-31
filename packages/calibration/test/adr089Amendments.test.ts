/**
 * ADR-089: THE COMMITTED AMENDMENTS FILE, `reports/adr-089-amendments.filed.json` (Appendix E's
 * header, ADR-089:2022; AM-1, Appendix F, F.11; the amendment's §3.4 and §3.5; step-2 plan §4.6;
 * AM-2, Appendix G, G.8; step-3 plan §4.1, §4.3, §4.4).
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
 * step 2's records keep grading, and no step-3 guard map is filed yet. Then every rule
 * `validateAmendments` holds, each on a copy that breaks it.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { stableDigest } from "../src/harness/digest.js";
import { STEP2_ARM_DEFS, STEP2_ARM_IDS } from "../src/pocket/arms.js";
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
  amendmentsProblems,
  AmendmentsValidationError,
  entryOf,
  guardFor,
  guardRuleOf,
  loadAmendments,
  openAmendments,
  openAmendmentsAtStep,
  STEP2_AMENDMENTS_DIGEST,
  validateAmendments,
  type AmendmentsFile,
} from "../src/pocket/amendments.js";
import { AM1_LINES } from "../src/pocket/guardAm1.js";

const PKG = join(import.meta.dirname, "..");
const PATH = join(PKG, AMENDMENTS_PATH);
const filing = (): FiledFile => loadFiled(join(PKG, FILED_PATH));

/** The committed file's digest: AM-1 as filed (commit b65ab25, shown to the owner at 200b18b), then AM-2 (G.8). */
const PINNED_DIGEST = "fnv1a:92c7bcf4";
/** The file's view at step 2 (AM-1 alone): the whole file's digest when step 2's arms ran, which every step-2 record stamps. */
const STEP2_VIEW_DIGEST = "fnv1a:d5f9de6d";
const APPEND_ONLY = "ADR-089: an amendment is append-only; file a new named entry";

/** One pin per filed entry (`stableDigest` of the entry). Appending an entry adds its pin here. */
const ENTRY_PINS: Readonly<Record<string, string>> = {
  "AM-1": "fnv1a:97f0cb84",
  "AM-2": "fnv1a:e8484644",
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
    expect(openAmendments(PATH, filing()).entries.map((e) => e.id)).toEqual(["AM-1", "AM-2"]);
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
    // No later step has a filed map yet: its harness refuses until one is filed.
    expect(() => guardFor(committed(), "3")).toThrow(/no filed amendment maps step 3's guard bases/);
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

  it("carries no guard rule: step 2's guard is still AM-1's, and step 3's harness refuses until a base map is filed (AM-3)", () => {
    const am2 = entryOf(committed(), "AM-2");
    expect(() => guardRuleOf(am2)).toThrow(/AM-2 supersedes s3\.part1\.m8, s3\.part1\.monotone, not the guard/);
    expect(guardFor(committed(), "2").entry.id).toBe("AM-1");
    expect(() => guardFor(committed(), "3")).toThrow(/no filed amendment maps step 3's guard bases/);
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

describe("a step's view of the file (step-3 plan §4.3, critique 2 B2)", () => {
  it("at step 2 is AM-1 alone, fnv1a:d5f9de6d, the pin step 2's records stamp; at step 3 and later it is the whole file", () => {
    const file = committed();
    expect(STEP2_AMENDMENTS_DIGEST).toBe(STEP2_VIEW_DIGEST);
    expect(amendmentsDigestAtStep(file, "2")).toBe(STEP2_VIEW_DIGEST);
    const two = amendmentsAtStep(file, "2");
    expect(two.entries.map((e) => e.id)).toEqual(["AM-1"]);
    expect({ ...two, entries: [] }).toEqual({ ...file, entries: [] });
    for (const step of ["0", "1"] as const) expect(amendmentsAtStep(file, step).entries, step).toEqual([]);
    for (const step of ADR_089_STEP_IDS.slice(ADR_089_STEP_IDS.indexOf("3"))) {
      expect(amendmentsAtStep(file, step).entries.map((e) => e.id), step).toEqual(["AM-1", "AM-2"]);
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
    expect(openAmendmentsAtStep(PATH, filing(), "3", AMENDMENTS_DIGEST).entries.map((e) => e.id)).toEqual(["AM-1", "AM-2"]);
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
    expect(() => entryOf(committed(), "AM-3")).toThrow(/holds no AM-3 \(it holds AM-1, AM-2\)/);
    expect(() => guardRuleOf({ ...entryOf(committed(), "AM-1"), supersedes: ["guard.mix"] })).toThrow(/not the guard/);
  });
});
