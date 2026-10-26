/**
 * ADR-089 step 0 — THE COMMITTED FILING, `reports/adr-089-step0.filed.json` (§6.0; plan §7.2, §8.1).
 *
 * The file validates as `adr-089-filed/v1`; it is written in `saveFiled`'s format; it equals
 * `step0Filing()` everywhere except where `step0Filing()` leaves a pending marker, which C3 fills
 * (append-only); the prediction's three lists are disjoint; the golden pins it records are the pins
 * the suite enforces; and the filed census path digest is the live one, so a new leaf in
 * `DEFAULT_TUNABLES` fails here naming ADR-089's census rule. The live tunables digest (a VALUE
 * check, which any tuning on main moves) is checked in the step proof, not here: plan K11 says
 * "`tunablesDigest` is checked in the step proof, not as a suite pin, so unrelated tuning is not
 * blocked" (review CT-S1). It is `adr089Base.test.ts`'s census case (P-3, `FF_POCKET_BASE=1`).
 *
 * `FF_POCKET_FILED_WRITE=1` rewrites the file from `step0Filing()`; it refuses once any pending
 * marker has been filled, because the filing is append-only from then on. C3 pins `FILED_DIGEST`
 * here (plan §7.3 item 2; §8.2): any edit to the committed file fails the suite, and a later step's
 * arm harness refuses a file whose digest is not this pin.
 *
 * C3's fill (`fillStep0`, then `fillC3`, `step0.ts`) and the base helpers it files with
 * (`baseRowValue`, `reportValue`) are unit-tested here on constructed inputs.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { numericLeafPathDigest } from "../src/knownTruth/docConformance.js";
import { rate, meanFrom, samples, categorical } from "../src/metrics/types.js";
import { BASE_ROW_IDS, FILED_PATH, step0Filing } from "../src/pocket/bands.js";
import { M_IDS, type MId } from "../src/pocket/constructs.js";
import { FILED_BLOCKS, filedDigest, isPending, loadFiled, pendingPaths, saveFiled, STEP0_FILED_DIGEST, validateFiled, type FiledFile, type JsonValue } from "../src/pocket/filed.js";
import { GOLDEN_PINS, SEASON_PATH_PINS } from "../src/pocket/golden.js";
import { baseRowValue, b1Points, C3_CLAUSE_RULES, completeFiling, fillC3, fillStep0, reportValue, type Step0Result } from "../src/pocket/step0.js";

const PATH = join(import.meta.dirname, "..", FILED_PATH);

/** The committed filing's digest (`filedDigest`, a `stableDigest` of the parsed file), pinned by C3. */
/**
 * Re-pinned once, at step 0's review and before any arm read the pin (ADR-089 Appendix E.1): the
 * first pin, fnv1a:6b9ef02c, became this when the hit level got its own row and the motion and
 * acceptance clauses were pointed at it (review F2), the Q1/Q3 clauses were split one per M9 row
 * (F3) and 5a's reset clause was added (F8). Every other filed value is unchanged.
 */
const FILED_DIGEST = "fnv1a:9a1c90e9";
const APPEND_ONLY = "ADR-089 §6.0: the step-0 filing is append-only; amend by a named entry";
const CENSUS_RULE =
  "ADR-089 §6.0, the census (K2-02, ADR-089:993): every new dial lives in the pocket-1 overlay, never in DEFAULT_TUNABLES, until step 11";

/**
 * Where `actual` differs from `expected`, by dot path. A pending marker in `expected` matches
 * anything at that path (the same marker, or the value C3 filled in); everything else must be equal.
 */
function differences(expected: unknown, actual: unknown, path = ""): string[] {
  if (isPending(expected)) return [];
  const here = path === "" ? "(root)" : path;
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [`${here}: expected an array`];
    if (expected.length !== actual.length) return [`${here}: expected ${String(expected.length)} items, found ${String(actual.length)}`];
    return expected.flatMap((x, i) => differences(x, actual[i], `${path}${path === "" ? "" : "."}${String(i)}`));
  }
  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object" || Array.isArray(actual)) return [`${here}: expected an object`];
    const e = expected as Record<string, unknown>;
    const a = actual as Record<string, unknown>;
    const out: string[] = [];
    for (const k of Object.keys(a)) if (!(k in e)) out.push(`${path}${path === "" ? "" : "."}${k}: not in step0Filing()`);
    for (const k of Object.keys(e)) {
      if (!(k in a)) out.push(`${path}${path === "" ? "" : "."}${k}: missing`);
      else out.push(...differences(e[k], a[k], `${path}${path === "" ? "" : "."}${k}`));
    }
    return out;
  }
  return Object.is(expected, actual) ? [] : [`${here}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`];
}

describe("ADR-089 step 0: the committed filing", () => {
  if (process.env["FF_POCKET_FILED_WRITE"] === "1") {
    it("writes the filing from step0Filing() (FF_POCKET_FILED_WRITE=1), only while nothing has been filled", () => {
      let current: unknown;
      try {
        current = JSON.parse(readFileSync(PATH, "utf8")) as unknown;
      } catch {
        current = undefined;
      }
      if (current !== undefined) {
        const now = pendingPaths(validateFiled(current)).map((p) => p.path);
        const fresh = pendingPaths(step0Filing()).map((p) => p.path);
        expect(now, "a pending marker has been filled: the filing is append-only (plan §8.1); amend by a named entry").toEqual(fresh);
      }
      saveFiled(PATH, step0Filing());
    });
  }

  // Read inside each case, so that the gated writer above runs first.
  const committed = (): string => readFileSync(PATH, "utf8");

  it("is the pinned filing (FILED_DIGEST): append-only, amended only by a named entry", () => {
    expect(filedDigest(JSON.parse(committed()) as unknown), APPEND_ONLY).toBe(FILED_DIGEST);
    // Step 1's harness reads the same pin from the source (plan §7.2 item 8): the two agree.
    expect(STEP0_FILED_DIGEST).toBe(FILED_DIGEST);
  });

  it("validates as adr-089-filed/v1, with every block", () => {
    const file = loadFiled(PATH);
    expect(file.format).toBe("adr-089-filed/v1");
    expect(file.adr).toBe("ADR-089");
    expect(file.step).toBe(0);
    expect(Object.keys(file).sort()).toEqual([...FILED_BLOCKS].sort());
  });

  it("is written in saveFiled's format: two-space JSON and a final newline", () => {
    const text = committed();
    expect(text).toBe(`${JSON.stringify(JSON.parse(text), null, 2)}\n`);
  });

  it("equals step0Filing() wherever step0Filing() is not pending", () => {
    const file = loadFiled(PATH);
    expect(differences(step0Filing(), file)).toEqual([]);
  });

  it("leaves pending only what step0Filing() leaves pending, all of it M- or base-derived", () => {
    const file = loadFiled(PATH);
    const fresh = new Map(pendingPaths(step0Filing()).map((p) => [p.path, p.source]));
    for (const p of pendingPaths(file)) expect(fresh.get(p.path), p.path).toBe(p.source);
    expect(new Set([...fresh.values()])).toEqual(new Set(["BASE", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"]));
  });

  it("keeps the prediction's three lists disjoint (plan §9)", () => {
    const file = loadFiled(PATH);
    const lists = { a: file.prediction.a, b: file.prediction.b, c: file.prediction.c };
    const seen = new Map<string, string>();
    for (const [name, items] of Object.entries(lists)) {
      expect(items.length, name).toBeGreaterThan(0);
      for (const item of items) {
        expect(seen.has(item.id), `${item.id} is in ${seen.get(item.id) ?? ""} and ${name}`).toBe(false);
        seen.set(item.id, name);
        expect(item.id.startsWith(`${name}.`), item.id).toBe(true);
      }
    }
    const texts = [...lists.a, ...lists.b, ...lists.c].map((x) => x.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("files the census, and the live path digest is the filed one (the tunables VALUE digest is the step proof's, plan K11)", () => {
    const file = loadFiled(PATH);
    expect(file.census).toEqual({ pathDigest: "fnv1a:365da48d", tunablesDigest: "fnv1a:395a9ae2" });
    expect(numericLeafPathDigest(), `${CENSUS_RULE}; the numeric-leaf path digest moved`).toBe(file.census.pathDigest);
  });

  it("records the golden pins the suite enforces (GOLDEN_PINS, SEASON_PATH_PINS), and the season-path prediction states them", () => {
    const file = loadFiled(PATH);
    const K11 = "ADR-089 risk K11: a golden pin is re-recorded only by a named Orchestrator commit, with the filing amended by a named entry";
    expect(file.base.golden.pins, K11).toEqual(GOLDEN_PINS);
    expect(file.base.golden.seasonPath, K11).toEqual(SEASON_PATH_PINS);
    const a = file.prediction.a.find((x) => x.id === "a.season-path");
    const { canonicalFold, byteFold, first50CanonicalFold, first50ByteFold, run } = SEASON_PATH_PINS;
    expect(a?.value, K11).toEqual({ canonicalFold, byteFold, first50CanonicalFold, first50ByteFold, run });
  });

  it("answers question 19 with Wait, and files Table now as information only", () => {
    const file = loadFiled(PATH);
    expect(file.constants["snap.answer"]?.value).toBe("WAIT");
    expect(file.selectionRule.freeRunClock.startsWith("WAIT:")).toBe(true);
    const tableNow = file.constants["snap.tableNow"]?.value as Record<string, unknown>;
    expect(String(tableNow["informationOnly"])).toMatch(/answered Wait/);
  });
});

// --- C3's fill and the base helpers, on constructed inputs -----------------------------------------

/** A step-0 result's M block and M1 bound, constructed: M2 and M9 carry the fields the clause rules read. */
function measured(): Pick<Step0Result, "M" | "m1Bound"> {
  const M = Object.fromEntries(M_IDS.map((m) => [m, { constructed: m }])) as unknown as Record<MId, JsonValue>;
  M.M2 = { flat: { "S-theta11-window": { counterFarSharePct: 0.5 } }, gen: { "S-theta11-window": { counterFarSharePct: 0.25 } } };
  M.M9 = {
    flat: { rows: { pass_rate: { Q1Q3_END: { tolerance: 0.011 } }, throwaway_rate: { Q1Q3_END: { tolerance: 0.004 } }, time_to_throw: { Q1Q3_END: { tolerance: 0.03 } } } },
    gen: { rows: { pass_rate: { Q1Q3_END: { tolerance: 0.009 } }, throwaway_rate: { Q1Q3_END: { tolerance: 0.006 } }, time_to_throw: { Q1Q3_END: { tolerance: 0.02 } } } },
  };
  return { M, m1Bound: { E: 40, SD: 10, B1: 70, H: 75, dropbacks: 20000, margins1to4: { n: 1 }, margins5to14: { n: 2 } } };
}

const baseRows = (): Record<string, { flat: JsonValue; gen: JsonValue }> =>
  Object.fromEntries(BASE_ROW_IDS.map((id) => [id, { flat: { v: 1 }, gen: { v: 2 } }]));

const clauseById = (f: FiledFile, id: string) => {
  const c = f.bands.clauses.find((x) => x.id === id);
  if (c === undefined) throw new Error(`no clause ${id}`);
  return c;
};

describe("C3's fill on a constructed step-0 result (plan §7.3 item 1)", () => {
  it("fills the M block and the M1 bound, then every base row and every clause edge, leaving nothing pending", () => {
    const m = fillStep0(step0Filing(), measured());
    expect(m.filled.length).toBe(M_IDS.length + 7);
    const c3 = fillC3(m.file, { rows: baseRows() });
    expect(c3.left).toEqual([]);
    expect(pendingPaths(c3.file)).toEqual([]);
    expect(c3.filled.length).toBe(BASE_ROW_IDS.length + 12);
    expect(c3.file.base.rows["hit_or_sack_rate"]).toEqual({ flat: { v: 1 }, gen: { v: 2 } });
    validateFiled(c3.file);
  });

  it("files the B1 edges in points (100 x B1 / dropbacks), M2's interval over the leagues and each M9 row's larger tolerance in its unit", () => {
    const f = fillC3(fillStep0(step0Filing(), measured()).file, { rows: baseRows() }).file;
    const b1 = b1Points({ B1: 70, dropbacks: 20000 });
    expect(b1).toBeCloseTo(0.35, 12);
    expect(clauseById(f, "s1.S.pressure").hi).toBe(40 + b1);
    expect(clauseById(f, "s1.window.pressure").lo).toBe(-b1);
    expect(clauseById(f, "s1.window.pressure").hi).toBe(b1);
    expect(clauseById(f, "s5b.pressure").hi).toBe(42 + b1);
    expect(clauseById(f, "s2.m2").lo).toBe(0.25);
    expect(clauseById(f, "s2.m2").hi).toBe(0.5);
    // One clause per M9 row, each in its own unit, the larger league's (review F3): throwaways and
    // pass rate in points, time to throw in seconds.
    for (const at of ["s8a.q1q3", "acc.q1q3"]) {
      expect(clauseById(f, at).tolerance, at).toBeCloseTo(0.6, 12);
      expect(clauseById(f, `${at}.passRate`).tolerance, `${at}.passRate`).toBeCloseTo(1.1, 12);
      expect(clauseById(f, `${at}.timeToThrow`).tolerance, `${at}.timeToThrow`).toBeCloseTo(0.03, 12);
      expect(clauseById(f, `${at}.passRate`).comparator).toBe("M9");
      expect(clauseById(f, `${at}.timeToThrow`).comparator).toBe("M9");
    }
  });

  it("never overwrites: a second fill finds nothing to fill", () => {
    const once = fillC3(fillStep0(step0Filing(), measured()).file, { rows: baseRows() }).file;
    const again = fillC3(once, { rows: baseRows() });
    expect(again.filled).toEqual([]);
    expect(again.file).toEqual(once);
  });

  it("refuses a base row the run did not measure", () => {
    const rows = baseRows();
    delete rows["hit_or_sack_rate"];
    expect(() => fillC3(fillStep0(step0Filing(), measured()).file, { rows })).toThrow(/no value for base\.rows\.hit_or_sack_rate/);
  });

  it("refuses the clause edges before the M block is filed", () => {
    expect(() => fillC3(step0Filing(), { rows: baseRows() })).toThrow(/must be filed before the clause edges/);
  });

  it("refuses a pending clause edge no rule names, never guessing it", () => {
    const fresh = step0Filing();
    const i = fresh.bands.clauses.findIndex((c) => C3_CLAUSE_RULES[c.id] === undefined && c.lo === undefined);
    const clauses = fresh.bands.clauses.map((c, j) => (j === i ? { ...c, lo: { pending: "M1" as const } } : c));
    const probe = validateFiled({ ...fresh, bands: { ...fresh.bands, clauses } });
    const m = fillStep0(probe, measured());
    expect(() => fillC3(m.file, { rows: baseRows() })).toThrow(/has no filed rule in C3_CLAUSE_RULES/);
  });

  it("completeFiling is the command's whole fill: it returns the filled filing and leaves nothing pending", () => {
    const fresh = step0Filing();
    const whole = completeFiling(fresh, { ...measured(), base: { rows: baseRows() } });
    expect(whole.file).toEqual(fillC3(fillStep0(fresh, measured()).file, { rows: baseRows() }).file);
    expect(pendingPaths(whole.file)).toEqual([]);
    expect(whole.filled.length).toBe(M_IDS.length + 7 + BASE_ROW_IDS.length + 12);
  });

  it("completeFiling refuses, writing nothing, when a pending field would be left (review CT-N5)", () => {
    // A valid filing never has such a field (the validator allows a marker only where a fill names
    // it), so it is constructed past the validator: a whole filing plus one marker neither fill
    // names (not an M id). fillStep0 and fillC3 both leave it.
    const whole = completeFiling(step0Filing(), { ...measured(), base: { rows: baseRows() } }).file;
    const extra = { ...whole, M: { ...whole.M, EXTRA: { pending: "M1" } } } as unknown as FiledFile;
    expect(pendingPaths(extra).map((p) => p.path)).toContain("M.EXTRA");
    expect(() => completeFiling(extra, { ...measured(), base: { rows: baseRows() } })).toThrow(/would still have 1 pending fields .*M\.EXTRA \(pending M1\)/);
  });

  it("refuses an M2 or M9 without the field its rule reads", () => {
    const r = measured();
    const bad = { ...r, M: { ...r.M, M9: { flat: { rows: {} }, gen: { rows: {} } } } };
    expect(() => fillC3(fillStep0(step0Filing(), bad).file, { rows: baseRows() })).toThrow(/(pass_rate|throwaway_rate|time_to_throw)\.Q1Q3_END\.tolerance is not filed/);
    for (const missing of ["pass_rate", "time_to_throw"]) {
      const m9 = JSON.parse(JSON.stringify(r.M.M9)) as { flat: { rows: Record<string, unknown> } };
      delete m9.flat.rows[missing];
      const partial = { ...r, M: { ...r.M, M9: m9 as unknown as JsonValue } };
      expect(() => fillC3(fillStep0(step0Filing(), partial).file, { rows: baseRows() }), missing).toThrow(new RegExp(`M\\.M9\\.flat\\.rows\\.${missing}\\.Q1Q3_END\\.tolerance is not filed`));
    }
  });
});

describe("the base helpers C3 files with", () => {
  it("baseRowValue keeps a row's counts and its point estimate, and an inapplicable row's reason", () => {
    expect(baseRowValue(rate(3, 12))).toEqual({ kind: "RATE", successes: 3, trials: 12, value: 0.25 });
    expect(baseRowValue(meanFrom(10, 4, 30))).toEqual({ kind: "MEAN", total: 10, n: 4, value: 2.5 });
    expect(baseRowValue(samples([1, 2, 6]))).toEqual({ kind: "SAMPLES", n: 3, value: 3 });
    expect(baseRowValue(categorical({ b: 2, a: 1 }))).toEqual({ kind: "CATEGORICAL", counts: { a: 1, b: 2 } });
    expect(Object.keys((baseRowValue(categorical({ b: 2, a: 1 })) as { counts: object }).counts)).toEqual(["a", "b"]);
    expect(baseRowValue({ reason: "NO_OBSERVATIONS", detail: "none" })).toEqual({ reason: "NO_OBSERVATIONS", detail: "none" });
    expect(baseRowValue(rate(0, 0))).toEqual({ kind: "RATE", successes: 0, trials: 0, value: null });
  });

  it("reportValue prints a rate in percent, a mean as it is, and nothing for a categorical, empty or inapplicable row", () => {
    expect(reportValue(rate(1, 4))).toBe(25);
    expect(reportValue(meanFrom(5, 2, 13))).toBe(2.5);
    expect(reportValue(samples([1, 3]))).toBe(2);
    expect(reportValue(categorical({ a: 1 }))).toBeNull();
    expect(reportValue(rate(0, 0))).toBeNull();
    expect(reportValue({ reason: "PROVENANCE", detail: "x" })).toBeNull();
    expect(reportValue(undefined)).toBeNull();
  });
});
