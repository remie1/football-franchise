/**
 * ADR-089 step 0 — WHAT THE FILING IS COMPARED AGAINST, AND THAT THE CODE FILES WHAT IT RUNS
 * (plan §7.3 item 4; C1-S7; C2-B3; entry 125). Always on: it reads only the committed filing and
 * the code, and plays nothing.
 *
 *  - entry 125: every filed clause's comparator resolves to an `allMetrics()` id, a `constructs.ts`
 *    id, a filed future row or a filed proof, and none compares against a retired real side;
 *  - every `clauseLines` line has a clause, and every clause's `adrLine` is in the list;
 *  - the M block's keys are `constructs.ts`'s M ids;
 *  - the code's constants equal the filed ones (the free-run clock, the snap rows, b's grid, RUN's
 *    margin, the unblocked bands, the selection grids and bins, the miss rule's limits);
 *  - C3's fill: no pending marker is left, every base row is filed on both leagues, and each clause
 *    edge C3 filled is `C3_CLAUSE_RULES` applied to the filed `m1Bound`, `M.M2` and `M.M9`.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { RELEASE_BINS as COLLECT_RELEASE_BINS } from "../src/metrics/collect.js";
import { allMetrics } from "../src/metrics/index.js";
import { BASE_ROW_IDS, FILED_PATH, comparatorProblems, step0Filing } from "../src/pocket/bands.js";
import { SHAPE_L_PRICED_R, SHAPE_L_PROVISIONAL_R, SHAPE_S_PROVISIONAL, WIN_MARGIN } from "../src/pocket/clocks.js";
import { M_IDS } from "../src/pocket/constructs.js";
import { B_GRID, B_START, RUN_MARGIN, smallestRunMargin, urgencyRange } from "../src/pocket/contest.js";
import { isPending, loadFiled, pendingPaths, type BandClause, type FiledFile } from "../src/pocket/filed.js";
import { FREE_RUN_CONSTANTS, fortySeconds } from "../src/pocket/freeRun.js";
import { C3_CLAUSE_RULES, c3InputsOf, type ClauseEdge } from "../src/pocket/main.js";
import { BIN_20_LIMIT, QUICK_SHARE_BAND, UNBLOCKED_PRESSURES_PER_100_MAX, UNBLOCKED_SHARE_OF_HIT_OR_SACK_MAX } from "../src/pocket/missRule.js";
import { L_GRID, REAL, RELEASE_BINS as SELECTION_RELEASE_BINS, S_GRID } from "../src/pocket/selection.js";
import { SNAP_CONSTANTS, TABLE_NOW } from "../src/pocket/snapSpot.js";

const PATH = join(import.meta.dirname, "..", FILED_PATH);
const file = (): FiledFile => loadFiled(PATH);
const value = (f: FiledFile, name: string): unknown => {
  const c = f.constants[name];
  if (c === undefined) throw new Error(`the filing has no constant ${name}`);
  return c.value;
};
const EDGES: readonly ClauseEdge[] = ["lo", "hi", "tolerance"];

describe("entry 125: every filed clause's comparator", () => {
  it("resolves to an allMetrics() id, a constructs.ts id, a filed future row or a filed proof, never a retired real side", () => {
    const metricIds = new Set(allMetrics().map((m) => m.id));
    expect(comparatorProblems(file().bands.clauses, metricIds)).toEqual([]);
  });

  it("is checked by a rule that refuses an unknown comparator (the check is not vacuous)", () => {
    const metricIds = new Set(allMetrics().map((m) => m.id));
    const bad: BandClause = { ...file().bands.clauses[0]!, id: "probe", comparator: "no_such_row" };
    expect(comparatorProblems([bad], metricIds)).toEqual(["probe: no_such_row is neither an allMetrics() id nor a constructs.ts id (entry 125)"]);
  });
});

describe("the completeness list against the filed clauses", () => {
  it("gives every clauseLines line at least one clause", () => {
    const f = file();
    const lines = new Set(f.bands.clauses.map((c) => c.adrLine));
    for (const n of f.bands.clauseLines) expect(lines.has(n), `ADR-089:${String(n)} has no filed clause`).toBe(true);
  });

  it("lists every clause's adrLine", () => {
    const f = file();
    const listed = new Set(f.bands.clauseLines);
    for (const c of f.bands.clauses) expect(listed.has(c.adrLine), `${c.id} sits on ADR-089:${String(c.adrLine)}, not in clauseLines`).toBe(true);
  });
});

describe("the M block (C2-B3)", () => {
  it("is keyed by constructs.ts's M ids, in order", () => {
    expect(Object.keys(file().M)).toEqual([...M_IDS]);
  });
});

describe("the code's constants equal the filed constants (plan §7.2 `constants`)", () => {
  it("files the free-run clock the code runs (§4.4.4, D18, D22)", () => {
    const f = file();
    for (const [name, v] of Object.entries(FREE_RUN_CONSTANTS)) expect(value(f, name), name).toBe(v);
    // The one constant the code does not export: the Speed scale that `forty` divides by.
    const scale = value(f, "freeRun.fortySpeedScale") as number;
    expect(fortySeconds(0)).toBe(FREE_RUN_CONSTANTS["freeRun.fortyIntercept"]);
    expect(fortySeconds(scale)).toBeCloseTo(FREE_RUN_CONSTANTS["freeRun.fortyIntercept"] - FREE_RUN_CONSTANTS["freeRun.fortySpeedSlope"], 12);
    expect(fortySeconds(99)).toBeCloseTo(4.22, 12);
  });

  it("files every filed constant name from the code or the Speed scale, and nothing else", () => {
    const fromCode = new Set([...Object.keys(FREE_RUN_CONSTANTS), ...Object.keys(SNAP_CONSTANTS), "freeRun.fortySpeedScale"]);
    expect(Object.keys(file().constants).sort()).toEqual([...fromCode].sort());
  });

  it("files the snap rows the code builds: Wait, the down lineman's depth, the gaps and EDGE's extra", () => {
    const f = file();
    expect(value(f, "snap.answer")).toBe(SNAP_CONSTANTS["snap.answer"]);
    expect(value(f, "snap.downLinemanDepthYards")).toBe(SNAP_CONSTANTS["snap.downLinemanDepthYards"]);
    expect(value(f, "snap.gapWidthYards")).toEqual(SNAP_CONSTANTS["snap.gapWidthYards"]);
    expect(value(f, "snap.edgeExtraWidthYards")).toBe(SNAP_CONSTANTS["snap.edgeExtraWidthYards"]);
  });

  it("files Table now's rows (information only) with the code's depths and numeric widths", () => {
    const filed = value(file(), "snap.tableNow") as Record<string, Record<string, unknown>>;
    const rows = Object.keys(filed).filter((r) => r !== "informationOnly");
    expect(rows.sort()).toEqual(Object.keys(TABLE_NOW).sort());
    for (const [row, code] of Object.entries(TABLE_NOW) as [string, Record<string, unknown>][]) {
      const f = filed[row]!;
      expect(f["depth"], `${row}.depth`).toBe(code["depth"]);
      if (typeof code["width"] === "number") expect(f["width"], `${row}.width`).toBe(code["width"]);
      if (code["edgeExtra"] !== undefined) expect(f["edgeExtra"], `${row}.edgeExtra`).toBe(code["edgeExtra"]);
      if (Array.isArray(code["disguises"])) for (const d of code["disguises"] as string[]) expect(f["disguises"], `${row}.disguises`).toContain(d);
    }
    expect(TABLE_NOW.safetyCreeping.movingYardsPerSecond).toBe(FREE_RUN_CONSTANTS["freeRun.creeperYardsPerSecond"]);
  });

  it("files b's grid, its start and RUN's margin as the code has them (O6, O7)", () => {
    const { bGrid, runMargin } = file().rules;
    expect(bGrid.values).toEqual([...B_GRID]);
    expect((bGrid.params as Record<string, unknown>)["start"]).toBe(B_START);
    expect(runMargin.delta).toBe(RUN_MARGIN);
    expect(runMargin.delta).toBe(smallestRunMargin());
    expect(runMargin.urgency).toEqual([...urgencyRange(DEFAULT_TUNABLES)]);
  });

  it("files the unblocked bands and the miss rule's limits as the code has them", () => {
    const { unblockedBands, missRule } = file().rules;
    expect(unblockedBands.per100DropbacksMax).toBe(UNBLOCKED_PRESSURES_PER_100_MAX);
    expect(unblockedBands.shareOfHitOrSackMax).toBe(UNBLOCKED_SHARE_OF_HIT_OR_SACK_MAX);
    const p = missRule.params as Record<string, unknown>;
    expect(p["L"]).toMatchObject({ TICK: BIN_20_LIMIT.TICK, RAW: BIN_20_LIMIT.RAW });
    expect(p["quickShareBand"]).toEqual([...QUICK_SHARE_BAND]);
    expect(p["unblockedPressuresPer100Max"]).toBe(UNBLOCKED_PRESSURES_PER_100_MAX);
    expect(p["unblockedShareOfHitOrSackMax"]).toBe(UNBLOCKED_SHARE_OF_HIT_OR_SACK_MAX);
  });

  it("files L's crossing time on the engine's won band and tick", () => {
    const p = file().rules.lCrossingTime.params as Record<string, unknown>;
    expect(p["threshold"]).toBe(WIN_MARGIN);
    const won = DEFAULT_TUNABLES.passRush.bands.find((b) => b.label === "RUSHER_WINS_REP");
    expect(won?.minMargin).toBe(WIN_MARGIN);
    expect(p["tickStepSeconds"]).toBe(DEFAULT_TUNABLES.clock.tickStepSeconds);
  });

  it("files the selection grids the code runs, each holding the clocks' provisional and priced points (O5)", () => {
    const { grids, loss, fallback } = file().selectionRule;
    expect(grids.S).toEqual({ theta: [...S_GRID.theta], k: S_GRID.k, beta: S_GRID.beta, pushWindow: S_GRID.pushWindow });
    expect(grids.L).toEqual({ R: [...L_GRID.R] });
    expect(grids.S.theta).toContain(SHAPE_S_PROVISIONAL.theta);
    expect(grids.S.k).toBe(SHAPE_S_PROVISIONAL.k);
    expect(grids.S.beta).toBe(SHAPE_S_PROVISIONAL.beta);
    expect(grids.L.R).toContain(SHAPE_L_PROVISIONAL_R);
    expect(grids.L.R).toContain(SHAPE_L_PRICED_R);
    expect(loss.bins).toEqual([...SELECTION_RELEASE_BINS]);
    expect(loss.bins).toEqual(COLLECT_RELEASE_BINS.map((b) => b.label));
    expect(loss.real).toEqual([...REAL.hitRaw]);
    expect(loss.weights).toEqual([...REAL.attemptSharesRaw]);
    expect(fallback.real).toEqual([...REAL.pressuredRaw]);
  });
});

describe("C3's fill (plan §7.3 item 1)", () => {
  it("leaves no pending marker", () => {
    expect(pendingPaths(file()).map((p) => `${p.path} (pending ${p.source})`)).toEqual([]);
  });

  it("files every base row on both leagues", () => {
    const rows = file().base.rows as Readonly<Record<string, unknown>>;
    expect(Object.keys(rows).sort()).toEqual([...BASE_ROW_IDS].sort());
    for (const id of BASE_ROW_IDS) {
      const row = rows[id] as Record<string, unknown>;
      expect(Object.keys(row).sort(), id).toEqual(["flat", "gen"]);
      expect(row["flat"], `${id}.flat`).not.toBeNull();
      expect(row["gen"], `${id}.gen`).not.toBeNull();
    }
  });

  it("has a rule for exactly the clause edges step0Filing() leaves pending", () => {
    const fresh = step0Filing();
    const pendingEdges = pendingPaths(fresh)
      .filter((p) => p.path.startsWith("bands.clauses."))
      .map((p) => {
        const [, , i, edge] = p.path.split(".");
        return `${fresh.bands.clauses[Number(i)]!.id}.${edge!}`;
      })
      .sort();
    const ruled = Object.entries(C3_CLAUSE_RULES)
      .flatMap(([id, rules]) => EDGES.filter((e) => rules[e] !== undefined).map((e) => `${id}.${e}`))
      .sort();
    expect(ruled).toEqual(pendingEdges);
  });

  it("files each clause edge as C3_CLAUSE_RULES applied to the filed m1Bound, M.M2 and M.M9", () => {
    const f = file();
    const inputs = c3InputsOf(f);
    let checked = 0;
    for (const c of f.bands.clauses) {
      const rules = C3_CLAUSE_RULES[c.id];
      if (rules === undefined) continue;
      for (const edge of EDGES) {
        const rule = rules[edge];
        if (rule === undefined) continue;
        const filed = c[edge];
        expect(isPending(filed), `${c.id}.${edge}`).toBe(false);
        expect(filed, `${c.id}.${edge}`).toBe(rule(inputs));
        expect(Number.isFinite(filed as number), `${c.id}.${edge}`).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBe(8);
  });

  it("files B1 in points as one quantity in its three uses (O1)", () => {
    const f = file();
    const b1 = (100 * (f.m1Bound.B1 as number)) / (f.m1Bound.dropbacks as number);
    const byId = new Map(f.bands.clauses.map((c) => [c.id, c]));
    expect(byId.get("s1.S.pressure")?.hi).toBe(40 + b1);
    expect(byId.get("s1.window.pressure")?.hi).toBe(b1);
    expect(byId.get("s1.window.pressure")?.lo).toBe(-b1);
    expect(byId.get("s5b.pressure")?.hi).toBe(42 + b1);
  });
});
