/**
 * THE STEP-0 FILING'S SCHEMA, `adr-089-filed/v1` (ADR-089 step 0; plan §3.5, §7.2, §8).
 *
 * ADR-089 §6.0 files, before any engine arm runs, the selection rule, the fitting order, every
 * band, step 5b's re-derived bands, the M1 bound, step 3's two-part check, the free-run constants,
 * the rules (D21's arrival reading, L's crossing time, the late block, the miss rule, b's grid,
 * RUN's margin, the unblocked bands), the M1-M9 tables and the census. The machine-read filing is
 * `reports/adr-089-step0.filed.json` (S4 writes it; C3 fills its pending fields and pins
 * `FILED_DIGEST`); the ADR's Appendix E is the human-read record. Later steps read it ONLY through
 * this file.
 *
 * THE PENDING MARKER. A value the step-0 measurements fill at C3 is written `{"pending": <source>}`
 * (an M id, or "BASE" for the base run's row values), optionally with a `note`. A marker is allowed
 * only at the paths `PENDING_AT_S4` lists; anywhere else the file is refused. `fillPending` is the
 * only way to replace one, and it refuses to overwrite a filed value: the filing is append-only
 * (plan §8.1; amendments go in `reports/adr-089-amendments.filed.json`).
 *
 * `filedDigest(json)` is `stableDigest(json)`: key order does not move it, any value does.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { stableDigest } from "../harness/digest.js";
import { M_IDS, type MId } from "./constructs.js";
import type { SeedSet } from "./corpus.js";

export const FILED_FORMAT = "adr-089-filed/v1";

/** Lines of the design as C0 landed it (391,071 bytes): every filed `adrLine` is one of these. */
export const ADR_089_LINES = 2018;

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export const PENDING_SOURCES = [...M_IDS, "BASE"] as const;
export type PendingSource = MId | "BASE";

export interface Pending {
  readonly pending: PendingSource;
  /** What the filled value will be, in words ("42 + B1 in points"). */
  readonly note?: string;
}
export type Filed<T> = T | Pending;

/**
 * Where a pending marker may stand at S4, as dot paths (`*` is any one key or index). C3 fills
 * every one of them; from step 1 the arm harness refuses a file with any left.
 */
export const PENDING_AT_S4: readonly string[] = [
  "base.rows.*",
  "m1Bound.E",
  "m1Bound.SD",
  "m1Bound.B1",
  "m1Bound.H",
  "m1Bound.dropbacks",
  "m1Bound.margins1to4",
  "m1Bound.margins5to14",
  "bands.clauses.*.lo",
  "bands.clauses.*.hi",
  "bands.clauses.*.tolerance",
  "M.*",
];

/** The constants C3's `adr089Comparators` compares with the code's (plan §7.2's `constants` row). More may be filed. */
export const FILED_CONSTANT_NAMES: readonly string[] = [
  "freeRun.fortyYards",
  "freeRun.fortyIntercept",
  "freeRun.fortySpeedSlope",
  "freeRun.tauIntercept",
  "freeRun.tauSlope",
  "freeRun.tauMin",
  "freeRun.tauMax",
  "freeRun.pathShortenYards",
  "freeRun.edgePathFactor",
  "freeRun.loopExtraYards",
  "freeRun.getOffSeconds",
  "freeRun.delayedSeconds",
  "freeRun.etaRoundingSeconds",
  "freeRun.creeperYardsPerSecond",
  "snap.answer",
  "snap.downLinemanDepthYards",
  "snap.gapWidthYards",
  "snap.edgeExtraWidthYards",
  "snap.tableNow",
];

// --- the blocks ---------------------------------------------------------------

export interface FiledBase {
  /** The tree every base figure was measured on. */
  readonly commit: string;
  /** The caller every corpus plays, e.g. "v7". */
  readonly caller: string;
  /** The corpora of `corpus.ts`, both seed sets (plan §3.3). */
  readonly corpora: { readonly [key: string]: JsonValue };
  /** The golden definitions, §0's 28 folds, the 14 whole-canonical values (recorded) and the season-path pins. */
  readonly golden: { readonly [key: string]: JsonValue };
  /** Each new row's base value, keyed by construct id; pending "BASE" until C3. */
  readonly rows: { readonly [constructId: string]: Filed<JsonValue> };
}

export interface PredictionItem {
  readonly id: string;
  readonly text: string;
  readonly adrLine?: number;
  /** The construct or metric id it reads, where there is one. */
  readonly construct?: string;
  readonly value?: JsonValue;
}

/** §9 of the plan: (a) the design's falsifiers, (b) REPORTED reproductions, (c) code-correctness tests. Disjoint. */
export interface FiledPrediction {
  readonly a: readonly PredictionItem[];
  readonly b: readonly PredictionItem[];
  readonly c: readonly PredictionItem[];
}

export interface FiledSelectionRule {
  readonly adrLines: readonly number[];
  readonly grids: {
    readonly S: { readonly theta: readonly number[]; readonly k: number; readonly beta: number; readonly pushWindow: boolean };
    readonly L: { readonly R: readonly number[] };
  };
  /** The free-run clock every arm runs: question 19's answer. */
  readonly freeRunClock: string;
  readonly loss: { readonly [key: string]: JsonValue };
  readonly separation: { readonly [key: string]: JsonValue };
  readonly fallback: { readonly [key: string]: JsonValue };
}

export interface FiledFittingOrder {
  readonly adrLine: number;
  readonly steps: readonly string[];
  readonly maxPasses: number;
  /** "If the second pass would change the selection again, the design returns to the owner." */
  readonly ownerReturn: string;
}

export const CLAUSE_KINDS = ["graded", "reported", "structural"] as const;
export type ClauseKind = (typeof CLAUSE_KINDS)[number];
export const CLAUSE_DIRECTIONS = ["UP", "DOWN", "UNCHANGED"] as const;
export type ClauseDirection = (typeof CLAUSE_DIRECTIONS)[number];

export interface BandClause {
  readonly id: string;
  /** "1", "2", "3", "4", "5a", "5b", "6", …, "11", "acceptance", "guard". */
  readonly step: string;
  readonly row: string;
  /** An `allMetrics()` id or a `constructs.ts` id (C3's entry-125 check). */
  readonly comparator: string;
  readonly kind: ClauseKind;
  readonly adrLine: number;
  readonly text: string;
  readonly lo?: Filed<number>;
  readonly hi?: Filed<number>;
  readonly direction?: ClauseDirection;
  readonly tolerance?: Filed<number>;
}

export interface FiledBands {
  readonly clauses: readonly BandClause[];
  /** The completeness list: every design line that holds a clause (plan §7.2). */
  readonly clauseLines: readonly number[];
}

export type Interval = readonly [number, number];

export interface FiveBRow {
  readonly acceptance: Interval;
  readonly contributions: readonly { readonly step: string; readonly value: number; readonly adrLine?: number }[];
  readonly derived: Interval;
  readonly filed: Interval;
  readonly fullInterval: Interval;
}

export interface FiledFiveB {
  readonly adrLine: number;
  readonly rows: { readonly [row: string]: FiveBRow };
}

export interface FiledM1Bound {
  /** "B1 = E + 3·SD" (deviation O1). */
  readonly definition: string;
  readonly E: Filed<number>;
  readonly SD: Filed<number>;
  readonly B1: Filed<number>;
  readonly H: Filed<number>;
  readonly dropbacks: Filed<number>;
  readonly margins1to4: Filed<JsonValue>;
  readonly margins5to14: Filed<JsonValue>;
  /** Its three uses: step 1's falsifier, the S band's raised pressure edge, 5b's raised pressure edge. */
  readonly uses: readonly { readonly step: string; readonly adrLine: number; readonly text: string }[];
}

export interface FiledStep3Check {
  readonly adrLines: readonly number[];
  readonly part1: string;
  readonly part2: string;
}

export interface FiledConstant {
  readonly value: JsonValue;
  readonly adrLine: number;
  readonly unit?: string;
}

export interface FiledRule {
  readonly adrLine: number;
  readonly text: string;
  readonly params?: { readonly [key: string]: JsonValue };
}

export interface FiledRules {
  /** D21 (ADR-089:698). */
  readonly arrivalReading: FiledRule;
  /** L's crossing time, with its clamp and m(0). */
  readonly lCrossingTime: FiledRule;
  /** The late block on both shapes (ADR-089:546). */
  readonly lateBlock: FiledRule;
  /** D31: classes (i)-(iv), the class (i) formula, options A/B/C, the one-pass stop, item 2's list. */
  readonly missRule: FiledRule & { readonly classes: readonly string[]; readonly options: readonly string[]; readonly neverMoves: readonly string[] };
  /** b's grid (deviation O6). */
  readonly bGrid: FiledRule & { readonly values: readonly number[] };
  /** RUN's margin over the throwaway base at the deadline (deviation O7). */
  readonly runMargin: FiledRule & { readonly delta: number; readonly urgency: Interval };
  /** At most 14 per 100 dropbacks, and at most 40 in 100 of hit-or-sack. */
  readonly unblockedBands: FiledRule & { readonly per100DropbacksMax: number; readonly shareOfHitOrSackMax: number };
}

export interface FiledCensus {
  readonly pathDigest: string;
  readonly tunablesDigest: string;
}

export interface FiledContext {
  /** The S late arm on seed set 2, context only, run at step 1 once shape S exists (deviation O19). */
  readonly sLateArm: FiledRule & { readonly seedSet: SeedSet; readonly runAtStep: string };
}

export interface FiledFile {
  readonly format: typeof FILED_FORMAT;
  readonly adr: "ADR-089";
  readonly step: 0;
  readonly base: FiledBase;
  readonly prediction: FiledPrediction;
  readonly selectionRule: FiledSelectionRule;
  readonly fittingOrder: FiledFittingOrder;
  readonly bands: FiledBands;
  readonly fiveB: FiledFiveB;
  readonly m1Bound: FiledM1Bound;
  readonly step3Check: FiledStep3Check;
  readonly constants: { readonly [name: string]: FiledConstant };
  readonly rules: FiledRules;
  readonly M: { readonly [K in MId]: Filed<JsonValue> };
  readonly census: FiledCensus;
  readonly context: FiledContext;
}

export const FILED_BLOCKS = [
  "format", "adr", "step", "base", "prediction", "selectionRule", "fittingOrder", "bands", "fiveB",
  "m1Bound", "step3Check", "constants", "rules", "M", "census", "context",
] as const;

// --- the validator ------------------------------------------------------------

export class FiledValidationError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`not an ${FILED_FORMAT} filing:\n  - ${problems.join("\n  - ")}`);
  }
}

type Path = readonly string[];
const at = (path: Path): string => (path.length === 0 ? "(root)" : path.join("."));

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function isPending(v: unknown): v is Pending {
  return isObject(v) && "pending" in v;
}

function patternMatches(pattern: string, path: Path): boolean {
  const parts = pattern.split(".");
  return parts.length === path.length && parts.every((p, i) => p === "*" || p === path[i]);
}

export function pendingAllowedAt(path: Path): boolean {
  return PENDING_AT_S4.some((pattern) => patternMatches(pattern, path));
}

class Checker {
  readonly problems: string[] = [];

  fail(path: Path, message: string): void {
    this.problems.push(`${at(path)}: ${message}`);
  }

  object(v: unknown, path: Path, keys?: { readonly required: readonly string[]; readonly optional?: readonly string[]; readonly closed?: boolean }): v is Record<string, unknown> {
    if (!isObject(v) || isPending(v)) {
      this.fail(path, "must be an object");
      return false;
    }
    if (keys !== undefined) {
      for (const k of keys.required) if (!(k in v)) this.fail([...path, k], "is missing");
      if (keys.closed !== false) {
        const known = new Set([...keys.required, ...(keys.optional ?? [])]);
        for (const k of Object.keys(v)) if (!known.has(k)) this.fail([...path, k], "is not part of the schema");
      }
    }
    return true;
  }

  string(v: unknown, path: Path, pattern?: RegExp): v is string {
    if (typeof v !== "string" || v.trim().length === 0) {
      this.fail(path, "must be a non-empty string");
      return false;
    }
    if (pattern !== undefined && !pattern.test(v)) {
      this.fail(path, `must match ${String(pattern)} (got "${v}")`);
      return false;
    }
    return true;
  }

  number(v: unknown, path: Path): v is number {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      this.fail(path, "must be a finite number");
      return false;
    }
    return true;
  }

  /** A number, or a pending marker where one is allowed. */
  filedNumber(v: unknown, path: Path): void {
    if (isPending(v)) return; // the marker itself is checked by the pending walk
    this.number(v, path);
  }

  adrLine(v: unknown, path: Path): void {
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > ADR_089_LINES) {
      this.fail(path, `must be a line of the design, 1 to ${String(ADR_089_LINES)}`);
    }
  }

  array(v: unknown, path: Path, nonEmpty = false): v is readonly unknown[] {
    if (!Array.isArray(v)) {
      this.fail(path, "must be an array");
      return false;
    }
    if (nonEmpty && v.length === 0) this.fail(path, "must not be empty");
    return true;
  }

  numbers(v: unknown, path: Path, nonEmpty = true): void {
    if (this.array(v, path, nonEmpty)) v.forEach((n, i) => this.number(n, [...path, String(i)]));
  }

  strings(v: unknown, path: Path, nonEmpty = true): void {
    if (this.array(v, path, nonEmpty)) v.forEach((s, i) => this.string(s, [...path, String(i)]));
  }

  interval(v: unknown, path: Path): void {
    if (!Array.isArray(v) || v.length !== 2) {
      this.fail(path, "must be [lo, hi]");
      return;
    }
    if (this.number(v[0], [...path, "0"]) && this.number(v[1], [...path, "1"]) && (v[0] as number) > (v[1] as number)) {
      this.fail(path, "lo must not exceed hi");
    }
  }

  rule(v: unknown, path: Path, extra: readonly string[] = []): v is Record<string, unknown> {
    if (!this.object(v, path, { required: ["adrLine", "text", ...extra], optional: ["params"] })) return false;
    this.adrLine(v["adrLine"], [...path, "adrLine"]);
    this.string(v["text"], [...path, "text"]);
    if (v["params"] !== undefined) this.object(v["params"], [...path, "params"]);
    return true;
  }

  /** Every pending marker in the file: well formed, and only where `PENDING_AT_S4` allows it. */
  pendingWalk(v: unknown, path: Path): void {
    if (isPending(v)) {
      const keys = Object.keys(v);
      if (!(PENDING_SOURCES as readonly unknown[]).includes(v.pending)) this.fail(path, `pending names no source (${PENDING_SOURCES.join(", ")}): ${JSON.stringify(v.pending)}`);
      if (keys.some((k) => k !== "pending" && k !== "note") || (v.note !== undefined && typeof v.note !== "string")) {
        this.fail(path, "a pending marker is {pending, note?} and nothing else");
      }
      if (!pendingAllowedAt(path)) this.fail(path, "a pending marker is allowed only at the paths PENDING_AT_S4 lists");
      return;
    }
    if (Array.isArray(v)) v.forEach((x, i) => this.pendingWalk(x, [...path, String(i)]));
    else if (isObject(v)) for (const [k, x] of Object.entries(v)) this.pendingWalk(x, [...path, k]);
  }
}

const COMMIT = /^[0-9a-f]{7,40}$/;
const DIGEST = /^fnv1a:[0-9a-f]{8}$/;

function checkPredictionItems(c: Checker, v: unknown, path: Path, ids: Map<string, string>): void {
  if (!c.array(v, path)) return;
  v.forEach((item, i) => {
    const p = [...path, String(i)];
    if (!c.object(item, p, { required: ["id", "text"], optional: ["adrLine", "construct", "value"] })) return;
    if (c.string(item["id"], [...p, "id"])) {
      const id = item["id"];
      const seen = ids.get(id);
      if (seen !== undefined) c.fail([...p, "id"], `"${id}" is also in prediction.${seen}; the three lists are disjoint`);
      else ids.set(id, path[path.length - 1]!);
    }
    c.string(item["text"], [...p, "text"]);
    if (item["adrLine"] !== undefined) c.adrLine(item["adrLine"], [...p, "adrLine"]);
    if (item["construct"] !== undefined) c.string(item["construct"], [...p, "construct"]);
  });
}

/** Every problem with `json` as an `adr-089-filed/v1` filing; empty when it is one. */
export function filedProblems(json: unknown): readonly string[] {
  const c = new Checker();
  if (!c.object(json, [], { required: [...FILED_BLOCKS] })) return c.problems;
  const f = json;

  if (f["format"] !== FILED_FORMAT) c.fail(["format"], `must be "${FILED_FORMAT}"`);
  if (f["adr"] !== "ADR-089") c.fail(["adr"], `must be "ADR-089"`);
  if (f["step"] !== 0) c.fail(["step"], "must be 0");

  const base = f["base"];
  if (c.object(base, ["base"], { required: ["commit", "caller", "corpora", "golden", "rows"] })) {
    c.string(base["commit"], ["base", "commit"], COMMIT);
    c.string(base["caller"], ["base", "caller"]);
    c.object(base["corpora"], ["base", "corpora"]);
    c.object(base["golden"], ["base", "golden"]);
    c.object(base["rows"], ["base", "rows"]);
  }

  const prediction = f["prediction"];
  if (c.object(prediction, ["prediction"], { required: ["a", "b", "c"] })) {
    const ids = new Map<string, string>();
    for (const list of ["a", "b", "c"]) checkPredictionItems(c, prediction[list], ["prediction", list], ids);
  }

  const sel = f["selectionRule"];
  if (c.object(sel, ["selectionRule"], { required: ["adrLines", "grids", "freeRunClock", "loss", "separation", "fallback"] })) {
    if (c.array(sel["adrLines"], ["selectionRule", "adrLines"], true)) {
      (sel["adrLines"] as readonly unknown[]).forEach((l, i) => c.adrLine(l, ["selectionRule", "adrLines", String(i)]));
    }
    const grids = sel["grids"];
    if (c.object(grids, ["selectionRule", "grids"], { required: ["S", "L"] })) {
      const S = grids["S"];
      if (c.object(S, ["selectionRule", "grids", "S"], { required: ["theta", "k", "beta", "pushWindow"] })) {
        c.numbers(S["theta"], ["selectionRule", "grids", "S", "theta"]);
        c.number(S["k"], ["selectionRule", "grids", "S", "k"]);
        c.number(S["beta"], ["selectionRule", "grids", "S", "beta"]);
        if (typeof S["pushWindow"] !== "boolean") c.fail(["selectionRule", "grids", "S", "pushWindow"], "must be a boolean");
      }
      const L = grids["L"];
      if (c.object(L, ["selectionRule", "grids", "L"], { required: ["R"] })) c.numbers(L["R"], ["selectionRule", "grids", "L", "R"]);
    }
    c.string(sel["freeRunClock"], ["selectionRule", "freeRunClock"]);
    for (const k of ["loss", "separation", "fallback"]) c.object(sel[k], ["selectionRule", k]);
  }

  const order = f["fittingOrder"];
  if (c.object(order, ["fittingOrder"], { required: ["adrLine", "steps", "maxPasses", "ownerReturn"] })) {
    c.adrLine(order["adrLine"], ["fittingOrder", "adrLine"]);
    c.strings(order["steps"], ["fittingOrder", "steps"]);
    c.number(order["maxPasses"], ["fittingOrder", "maxPasses"]);
    c.string(order["ownerReturn"], ["fittingOrder", "ownerReturn"]);
  }

  const bands = f["bands"];
  if (c.object(bands, ["bands"], { required: ["clauses", "clauseLines"] })) {
    if (c.array(bands["clauseLines"], ["bands", "clauseLines"], true)) {
      (bands["clauseLines"] as readonly unknown[]).forEach((l, i) => c.adrLine(l, ["bands", "clauseLines", String(i)]));
    }
    const ids = new Set<string>();
    if (c.array(bands["clauses"], ["bands", "clauses"], true)) {
      (bands["clauses"] as readonly unknown[]).forEach((clause, i) => {
        const p = ["bands", "clauses", String(i)];
        if (!c.object(clause, p, { required: ["id", "step", "row", "comparator", "kind", "adrLine", "text"], optional: ["lo", "hi", "direction", "tolerance"] })) return;
        if (c.string(clause["id"], [...p, "id"])) {
          if (ids.has(clause["id"])) c.fail([...p, "id"], `"${clause["id"]}" is filed twice`);
          ids.add(clause["id"]);
        }
        for (const k of ["step", "row", "comparator", "text"]) c.string(clause[k], [...p, k]);
        if (!(CLAUSE_KINDS as readonly unknown[]).includes(clause["kind"])) c.fail([...p, "kind"], `must be one of ${CLAUSE_KINDS.join(", ")}`);
        c.adrLine(clause["adrLine"], [...p, "adrLine"]);
        for (const k of ["lo", "hi", "tolerance"]) if (clause[k] !== undefined) c.filedNumber(clause[k], [...p, k]);
        if (clause["direction"] !== undefined && !(CLAUSE_DIRECTIONS as readonly unknown[]).includes(clause["direction"])) {
          c.fail([...p, "direction"], `must be one of ${CLAUSE_DIRECTIONS.join(", ")}`);
        }
        if (clause["kind"] !== "structural" && clause["lo"] === undefined && clause["hi"] === undefined && clause["direction"] === undefined) {
          c.fail(p, "a graded or reported clause needs lo, hi or a direction");
        }
        if (typeof clause["lo"] === "number" && typeof clause["hi"] === "number" && clause["lo"] > clause["hi"]) c.fail(p, "lo must not exceed hi");
      });
    }
  }

  const fiveB = f["fiveB"];
  if (c.object(fiveB, ["fiveB"], { required: ["adrLine", "rows"] })) {
    c.adrLine(fiveB["adrLine"], ["fiveB", "adrLine"]);
    if (c.object(fiveB["rows"], ["fiveB", "rows"])) {
      for (const [row, v] of Object.entries(fiveB["rows"] as Record<string, unknown>)) {
        const p = ["fiveB", "rows", row];
        if (!c.object(v, p, { required: ["acceptance", "contributions", "derived", "filed", "fullInterval"] })) continue;
        for (const k of ["acceptance", "derived", "filed", "fullInterval"]) c.interval(v[k], [...p, k]);
        if (c.array(v["contributions"], [...p, "contributions"], true)) {
          (v["contributions"] as readonly unknown[]).forEach((x, i) => {
            const q = [...p, "contributions", String(i)];
            if (!c.object(x, q, { required: ["step", "value"], optional: ["adrLine"] })) return;
            c.string(x["step"], [...q, "step"]);
            c.number(x["value"], [...q, "value"]);
            if (x["adrLine"] !== undefined) c.adrLine(x["adrLine"], [...q, "adrLine"]);
          });
        }
      }
    }
  }

  const m1 = f["m1Bound"];
  if (c.object(m1, ["m1Bound"], { required: ["definition", "E", "SD", "B1", "H", "dropbacks", "margins1to4", "margins5to14", "uses"] })) {
    c.string(m1["definition"], ["m1Bound", "definition"]);
    for (const k of ["E", "SD", "B1", "H", "dropbacks"]) c.filedNumber(m1[k], ["m1Bound", k]);
    if (c.array(m1["uses"], ["m1Bound", "uses"])) {
      const uses = m1["uses"] as readonly unknown[];
      if (uses.length !== 3) c.fail(["m1Bound", "uses"], "B1 has exactly three uses (deviation O1)");
      uses.forEach((u, i) => {
        const q = ["m1Bound", "uses", String(i)];
        if (!c.object(u, q, { required: ["step", "adrLine", "text"] })) return;
        c.string(u["step"], [...q, "step"]);
        c.adrLine(u["adrLine"], [...q, "adrLine"]);
        c.string(u["text"], [...q, "text"]);
      });
    }
  }

  const s3 = f["step3Check"];
  if (c.object(s3, ["step3Check"], { required: ["adrLines", "part1", "part2"] })) {
    if (c.array(s3["adrLines"], ["step3Check", "adrLines"], true)) {
      (s3["adrLines"] as readonly unknown[]).forEach((l, i) => c.adrLine(l, ["step3Check", "adrLines", String(i)]));
    }
    c.string(s3["part1"], ["step3Check", "part1"]);
    c.string(s3["part2"], ["step3Check", "part2"]);
  }

  const constants = f["constants"];
  if (c.object(constants, ["constants"])) {
    for (const name of FILED_CONSTANT_NAMES) if (!(name in constants)) c.fail(["constants", name], "is missing");
    for (const [name, v] of Object.entries(constants)) {
      const p = ["constants", name];
      if (!c.object(v, p, { required: ["value", "adrLine"], optional: ["unit"] })) continue;
      c.adrLine(v["adrLine"], [...p, "adrLine"]);
      if (v["unit"] !== undefined) c.string(v["unit"], [...p, "unit"]);
    }
  }

  const rules = f["rules"];
  if (c.object(rules, ["rules"], { required: ["arrivalReading", "lCrossingTime", "lateBlock", "missRule", "bGrid", "runMargin", "unblockedBands"] })) {
    for (const k of ["arrivalReading", "lCrossingTime", "lateBlock"]) c.rule(rules[k], ["rules", k]);
    const miss = rules["missRule"];
    if (c.rule(miss, ["rules", "missRule"], ["classes", "options", "neverMoves"])) {
      for (const k of ["classes", "options", "neverMoves"]) c.strings(miss[k], ["rules", "missRule", k]);
    }
    const b = rules["bGrid"];
    if (c.rule(b, ["rules", "bGrid"], ["values"]) && c.array(b["values"], ["rules", "bGrid", "values"], true)) {
      (b["values"] as readonly unknown[]).forEach((x, i) => {
        if (typeof x !== "number" || !Number.isInteger(x)) c.fail(["rules", "bGrid", "values", String(i)], "b's grid is whole numbers");
      });
    }
    const run = rules["runMargin"];
    if (c.rule(run, ["rules", "runMargin"], ["delta", "urgency"])) {
      c.number(run["delta"], ["rules", "runMargin", "delta"]);
      c.interval(run["urgency"], ["rules", "runMargin", "urgency"]);
    }
    const unblocked = rules["unblockedBands"];
    if (c.rule(unblocked, ["rules", "unblockedBands"], ["per100DropbacksMax", "shareOfHitOrSackMax"])) {
      c.number(unblocked["per100DropbacksMax"], ["rules", "unblockedBands", "per100DropbacksMax"]);
      c.number(unblocked["shareOfHitOrSackMax"], ["rules", "unblockedBands", "shareOfHitOrSackMax"]);
    }
  }

  c.object(f["M"], ["M"], { required: [...M_IDS] });

  const census = f["census"];
  if (c.object(census, ["census"], { required: ["pathDigest", "tunablesDigest"] })) {
    c.string(census["pathDigest"], ["census", "pathDigest"], DIGEST);
    c.string(census["tunablesDigest"], ["census", "tunablesDigest"], DIGEST);
  }

  const context = f["context"];
  if (c.object(context, ["context"], { required: ["sLateArm"] })) {
    const arm = context["sLateArm"];
    if (c.rule(arm, ["context", "sLateArm"], ["seedSet", "runAtStep"])) {
      if (arm["seedSet"] !== 1 && arm["seedSet"] !== 2) c.fail(["context", "sLateArm", "seedSet"], "must be 1 or 2");
      c.string(arm["runAtStep"], ["context", "sLateArm", "runAtStep"]);
    }
  }

  c.pendingWalk(f, []);
  return c.problems;
}

/** `json` as a filing, or a `FiledValidationError` naming every problem. */
export function validateFiled(json: unknown): FiledFile {
  const problems = filedProblems(json);
  if (problems.length > 0) throw new FiledValidationError(problems);
  return json as FiledFile;
}

export function loadFiled(path: string): FiledFile {
  return validateFiled(JSON.parse(readFileSync(path, "utf8")) as unknown);
}

/** Validates, then writes two-space JSON with a final newline. */
export function saveFiled(path: string, file: FiledFile): void {
  validateFiled(file);
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
}

export function filedDigest(json: unknown): string {
  return stableDigest(json);
}

/** Every pending marker left in the file, by dot path. */
export function pendingPaths(file: FiledFile): readonly { readonly path: string; readonly source: PendingSource }[] {
  const out: { path: string; source: PendingSource }[] = [];
  const walk = (v: unknown, path: Path): void => {
    if (isPending(v)) out.push({ path: at(path), source: v.pending });
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, String(i)]));
    else if (isObject(v)) for (const [k, x] of Object.entries(v)) walk(x, [...path, k]);
  };
  walk(file, []);
  return out;
}

/**
 * The file with the pending marker at `path` (a dot path) replaced by `value`. Refuses a path that
 * holds no pending marker: a filed value is never overwritten (append-only, plan §8.1).
 */
export function fillPending(file: FiledFile, path: string, value: JsonValue): FiledFile {
  if (isPending(value)) throw new Error(`fillPending(${path}): the value must be a filed value, not another marker`);
  const parts = path.split(".");
  const replace = (node: unknown, depth: number): unknown => {
    const key = parts[depth]!;
    if (Array.isArray(node)) {
      const i = Number(key);
      if (!Number.isInteger(i) || i < 0 || i >= node.length) throw new Error(`fillPending(${path}): no index ${key}`);
      const copy = [...node];
      copy[i] = depth === parts.length - 1 ? leaf(node[i]) : replace(node[i], depth + 1);
      return copy;
    }
    if (!isObject(node) || !(key in node)) throw new Error(`fillPending(${path}): no field ${key}`);
    return { ...node, [key]: depth === parts.length - 1 ? leaf(node[key]) : replace(node[key], depth + 1) };
  };
  const leaf = (old: unknown): JsonValue => {
    if (!isPending(old)) throw new Error(`fillPending(${path}): holds a filed value, and the filing is append-only (plan §8.1)`);
    return value;
  };
  return validateFiled(replace(file, 0));
}
