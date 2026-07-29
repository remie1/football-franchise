/**
 * BAND-TABLE ORDER, AND THE DERIVED EXEMPTION RELATION (ADR-035).
 *
 * Three layers, cheapest first:
 *
 *  1. STRUCTURE — discovery is complete and every cell is addressable by the
 *     patch interface. No simulation.
 *  2. THE RECORDED VIOLATION SET — the eleven column inversions
 *     `DEFAULT_TUNABLES` contains today, transcribed. A twelfth one appearing is
 *     a red test rather than a thing somebody notices in a year.
 *  3. THE RELATION — classification on a synthetic observer (exact, instant),
 *     and then the property the whole design exists for, proved against the REAL
 *     engine: **a cell stops being exempt the moment something reads it.**
 *
 * The full 26-table derivation is `packages/calibration`'s to run; it costs 358
 * observations and ~8 minutes at a 24-game corpus, and its result is recorded in
 * ADR-035 §4. This file runs the parts whose cost is proportional to the
 * mechanism rather than to the corpus.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES, applyTunablePatch } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { simulateGame } from "../src/game/simulateGame.js";
import { buildGameFixture } from "./gameFixtures.js";
import {
  allCells,
  cellId,
  cellPath,
  columnIsOrderable,
  deriveGuardedBy,
  discoverBandTables,
  labelledLadderPaths,
  orderViolations,
  perturbationsFor,
  starvationFor,
} from "../src/bandGuards.js";
import type { BandCell, BandTable, BandValue, StreamObserver } from "../src/bandGuards.js";

// ---------------------------------------------------------------------------
// 1. STRUCTURE
// ---------------------------------------------------------------------------

/**
 * The ONLY declaration in this file's subject matter, and it is a declaration
 * about DISCOVERY, never about exemption: labelled ladders that are not keyed on
 * `minMargin` and so are not band tables.
 *
 * `pocket.thresholds` is keyed on `minProgress` — an accumulated pressure count,
 * not a roll margin — and its ordering is already gated: ADR-033 removed the
 * `SACK` rung from it and `packages/calibration`'s `knownTruth.pocket-status-ladder`
 * walks what remains. It is out of scope here rather than un-gated.
 */
const NON_MARGIN_LADDERS: readonly string[] = ["pocket.thresholds"];

describe("band-table discovery", () => {
  it("recognises a band table structurally, with no list of tables anywhere", () => {
    const tables = discoverBandTables(DEFAULT_TUNABLES);
    expect(tables.length).toBe(26);
    // A spot-check that the shape, not the name, is what was matched: the
    // §12.2 table is called `qualityBands`, not `bands`, and is still found.
    expect(tables.map((t) => t.path)).toContain("tippedBall.qualityBands");
    expect(tables.map((t) => t.path)).toContain("game.specialTeams.fieldGoal.bands");
  });

  it("leaves no labelled ladder unaccounted for — discovery's blind spot is loud", () => {
    const discovered = new Set(discoverBandTables(DEFAULT_TUNABLES).map((t) => t.path));
    const unaccounted = labelledLadderPaths(DEFAULT_TUNABLES).filter(
      (p) => !discovered.has(p) && !NON_MARGIN_LADDERS.includes(p),
    );
    expect(unaccounted).toEqual([]);
  });

  it("orders every table by minMargin, strictly descending", () => {
    for (const table of discoverBandTables(DEFAULT_TUNABLES)) {
      const margins = table.rows.map((r) => r.minMargin);
      for (let i = 1; i < margins.length; i++) {
        expect(
          (margins[i] as number) < (margins[i - 1] as number),
          `${table.path} row ${String(i)}`,
        ).toBe(true);
      }
    }
  });

  it("treats label and minMargin as identity, never as effect columns", () => {
    for (const table of discoverBandTables(DEFAULT_TUNABLES)) {
      expect(table.columns).not.toContain("label");
      expect(table.columns).not.toContain("minMargin");
    }
  });

  it("addresses every cell and every starvation through applyTunablePatch", () => {
    // If a cell were not addressable the relation could not perturb it, and it
    // would read inert for a reason that has nothing to do with the engine.
    for (const cell of allCells(DEFAULT_TUNABLES)) {
      for (const patch of perturbationsFor(cell)) {
        expect(() => applyTunablePatch(DEFAULT_TUNABLES, patch), cellPath(cell)).not.toThrow();
      }
    }
    for (const table of discoverBandTables(DEFAULT_TUNABLES)) {
      for (const row of table.rows) {
        const starve = starvationFor(table, row.index);
        if (starve === undefined) continue;
        expect(() => applyTunablePatch(DEFAULT_TUNABLES, starve), starve.tunableId).not.toThrow();
      }
    }
  });

  it("excludes string columns from ordering rather than assuming one", () => {
    const man = discoverBandTables(DEFAULT_TUNABLES).find((t) => t.path === "manCoverage.bands");
    expect(man).toBeDefined();
    expect(columnIsOrderable(man as BandTable, "contest")).toBe(false);
    expect(columnIsOrderable(man as BandTable, "openness")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. THE RECORDED VIOLATION SET
// ---------------------------------------------------------------------------

/**
 * MEASURED against the committed `DEFAULT_TUNABLES`, July 2026 (ADR-035 §3).
 * Eleven column inversions across six tables. Six of the eleven are exempt under
 * the derived relation; five survive and are the owner's to rule on.
 *
 * This is a FENCE, not a target. A new entry appearing means a band table gained
 * an inversion, and that is exactly the event nothing was watching for before.
 */
const RECORDED_VIOLATIONS: readonly string[] = [
  "ballCarrier.contests.secondLevel.bands/maxYards",
  "ballCarrier.contests.secondLevel.bands/minYards",
  "ballCarrier.contests.yac.bands/maxYards",
  "ballCarrier.contests.yac.bands/minYards",
  "blitzPickup.bands/arrivalDelaySeconds",
  "stunt.bands/arrivalDelaySeconds",
  "throwExec.accuracy.bands/catchMod",
  "throwExec.accuracy.bands/defenderContestMod",
  "throwExec.accuracy.bands/difficulty",
  "tippedBall.qualityBands/finalTargetNumber",
  "tippedBall.qualityBands/speedCheckFromDistance",
];

describe("recorded column inversions", () => {
  it("matches the set ADR-035 measured", () => {
    const found = discoverBandTables(DEFAULT_TUNABLES)
      .flatMap((t) => orderViolations(t))
      .map((v) => `${v.table}/${v.column}`)
      .sort();
    expect(found).toEqual([...RECORDED_VIOLATIONS]);
  });

  it("every other orderable column is monotone", () => {
    const violating = new Set(RECORDED_VIOLATIONS);
    let checked = 0;
    for (const table of discoverBandTables(DEFAULT_TUNABLES)) {
      for (const column of table.columns) {
        if (!columnIsOrderable(table, column)) continue;
        if (violating.has(`${table.path}/${column}`)) continue;
        checked += 1;
      }
    }
    // 41 of the 52 orderable columns are clean today. The assertion above is
    // what proves it; this only stops the sample silently emptying — a
    // discovery regression that found no columns would otherwise pass.
    expect(checked).toBe(41);
  });

  it("drops an exempt cell from the sequence rather than the whole column", () => {
    const accuracy = discoverBandTables(DEFAULT_TUNABLES).find(
      (t) => t.path === "throwExec.accuracy.bands",
    ) as BandTable;
    const miss = accuracy.rows[6];
    expect(miss?.label).toBe("MISS");
    const exempt = new Set(
      ["catchMod", "defenderContestMod", "difficulty"].map((column) =>
        cellId({ table: accuracy.path, rowIndex: 6, rowLabel: "MISS", column, value: 0 }),
      ),
    );
    expect(orderViolations(accuracy).map((v) => v.column).sort()).toEqual([
      "catchMod",
      "defenderContestMod",
      "difficulty",
    ]);
    expect(orderViolations(accuracy, { exempt })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3a. THE RELATION — classification, on a synthetic observer
// ---------------------------------------------------------------------------

/**
 * A STAND-IN ENGINE, and it has to be a real one in the only respect that
 * matters: it SELECTS a band from a margin, then reads the selected row. An
 * observer that read fixed paths out of the tree could not tell a starved row
 * from a live one, because starvation moves `minMargin`, not the cell.
 *
 * `read` is the fake resolver, and writing the guard INTO it is the point: the
 * classifier is then being asked the same question it will be asked of the real
 * engine, with the answer known by construction.
 */
const ACCURACY_MARGINS: readonly number[] = [50, 30, 15, 5, -5, -20, -40];

function syntheticObserver(
  table: string,
  read: (row: Record<string, BandValue>) => unknown,
  margins: readonly number[] = ACCURACY_MARGINS,
): StreamObserver {
  return (tunables: Tunables): string => {
    const rows = table.split(".").reduce<unknown>(
      (node, key) => (typeof node === "object" && node !== null
        ? (node as Record<string, unknown>)[key]
        : undefined),
      tunables,
    ) as readonly Record<string, BandValue>[];
    const out = margins.map((margin) => {
      const row = rows.find((r) => margin >= (r["minMargin"] as number)) ?? rows[rows.length - 1];
      return read(row as Record<string, BandValue>);
    });
    return JSON.stringify(out);
  };
}

const ACCURACY = "throwExec.accuracy.bands";
const ACCURACY_CELLS = (): BandCell[] =>
  allCells(DEFAULT_TUNABLES, [ACCURACY]).filter((c) => c.column === "catchMod");

describe("deriveGuardedBy — classification", () => {
  it("calls a cell LIVE when the resolver reads it", () => {
    const rel = deriveGuardedBy({
      tunables: DEFAULT_TUNABLES,
      observe: syntheticObserver(ACCURACY, (row) => [row["label"], row["catchMod"]]),
      cells: ACCURACY_CELLS(),
    });
    expect(rel.verdicts.every((v) => v.liveness === "LIVE")).toBe(true);
    expect(rel.exempt.size).toBe(0);
  });

  it("calls a cell GUARDED when a row-level guard stops the read on that row alone", () => {
    const rel = deriveGuardedBy({
      tunables: DEFAULT_TUNABLES,
      // The shape of `sim/passPlay.ts`'s §10.4 branch, in one line.
      observe: syntheticObserver(ACCURACY, (row) =>
        row["catchable"] === true ? [row["label"], row["catchMod"]] : [row["label"]],
      ),
      cells: ACCURACY_CELLS(),
    });
    const cells = ACCURACY_CELLS();
    const miss = rel.verdicts.find((v) => v.rowIndex === 6);
    expect(miss?.liveness).toBe("GUARDED");
    expect(miss?.liveSiblings).toContain("PERFECT");
    expect([...rel.exempt]).toEqual([cellId(cells[6] as BandCell)]);
  });

  it("calls a column UNREAD_COLUMN — not exempt — when nothing reads it anywhere", () => {
    const rel = deriveGuardedBy({
      tunables: DEFAULT_TUNABLES,
      observe: syntheticObserver(ACCURACY, (row) => [row["label"]]),
      cells: ACCURACY_CELLS(),
    });
    expect(rel.verdicts.every((v) => v.liveness === "UNREAD_COLUMN")).toBe(true);
    expect(rel.exempt.size).toBe(0);
    expect(rel.unreadColumns).toEqual(["throwExec.accuracy.bands.catchMod"]);
  });

  it("calls a row UNREACHED_ROW — not exempt — when the corpus never selects it", () => {
    // Margins that stop above the MISS row: it is never selected, so nothing
    // about its cells can be ruled either way.
    const rel = deriveGuardedBy({
      tunables: DEFAULT_TUNABLES,
      observe: syntheticObserver(
        ACCURACY,
        (row) => [row["label"], row["catchMod"]],
        [50, 30, 15, 5, -5, -20],
      ),
      cells: ACCURACY_CELLS(),
    });
    expect(rel.verdicts.find((v) => v.rowIndex === 6)?.liveness).toBe("UNREACHED_ROW");
    expect(rel.exempt.size).toBe(0);
    expect(rel.unreachedRows).toEqual(["throwExec.accuracy.bands.6"]);
  });

  it("never exempts a row below the caller's reach floor", () => {
    const cells = ACCURACY_CELLS();
    const observe = syntheticObserver(ACCURACY, (row) =>
      row["catchable"] === true ? [row["label"], row["catchMod"]] : [row["label"]],
    );
    const reach = new Map(cells.map((c) => [`${c.table}.${String(c.rowIndex)}`, c.rowIndex === 6 ? 2 : 500]));

    const unfloored = deriveGuardedBy({ tunables: DEFAULT_TUNABLES, observe, cells, rowReach: reach });
    expect(unfloored.reachFloorApplied).toBe(false);
    expect(unfloored.verdicts.find((v) => v.rowIndex === 6)?.liveness).toBe("GUARDED");

    const floored = deriveGuardedBy({
      tunables: DEFAULT_TUNABLES, observe, cells, rowReach: reach, minRowReach: 30,
    });
    expect(floored.reachFloorApplied).toBe(true);
    expect(floored.verdicts.find((v) => v.rowIndex === 6)?.liveness).toBe("UNDER_SAMPLED_ROW");
    expect(floored.verdicts.find((v) => v.rowIndex === 6)?.rowReach).toBe(2);
    expect(floored.exempt.size).toBe(0);
    expect(floored.underSampledRows).toEqual(["throwExec.accuracy.bands.6"]);
  });

  it("reports a string cell UNPERTURBABLE instead of silently calling it inert", () => {
    const cells = allCells(DEFAULT_TUNABLES, ["manCoverage.bands"]).filter(
      (c) => c.column === "contest",
    );
    expect(cells.length).toBe(8);
    expect(perturbationsFor(cells[0] as BandCell)).toEqual([]);
    const rel = deriveGuardedBy({
      tunables: DEFAULT_TUNABLES,
      observe: syntheticObserver(
        "manCoverage.bands",
        (row) => [row["label"], row["contest"]],
        [40, 25, 15, 5, 0, -5, -15, -40],
      ),
      cells,
    });
    expect(rel.verdicts.every((v) => v.liveness === "UNPERTURBABLE")).toBe(true);
    expect(rel.exempt.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3b. THE RELATION — against the real engine, and the property it exists for
// ---------------------------------------------------------------------------

const CORPUS_GAMES = 8;

const engineObserver: StreamObserver = (tunables) => {
  const h = createHash("sha256");
  for (let i = 0; i < CORPUS_GAMES; i++) {
    const fixture = buildGameFixture({ seed: `bandguard-${String(i)}` });
    const result = simulateGame(fixture.state, fixture.inputs, fixture.seed, tunables);
    h.update(JSON.stringify(result.events));
    h.update(JSON.stringify(result.newState));
  }
  return h.digest("hex");
};

describe("deriveGuardedBy — against the engine", () => {
  it("derives the §10.4 MISS exemption from the engine, not from a list", { timeout: 600_000 }, () => {
    const cells = allCells(DEFAULT_TUNABLES, ["throwExec.accuracy.bands"]).filter(
      (c) => c.column === "catchMod",
    );
    const rel = deriveGuardedBy({ tunables: DEFAULT_TUNABLES, observe: engineObserver, cells });
    const miss = rel.verdicts.find((v) => v.rowLabel === "MISS");
    expect(miss?.liveness).toBe("GUARDED");
    // The evidence a declared exemption cannot produce: the rows on which the
    // very same column IS consumed.
    expect(miss?.liveSiblings?.length).toBeGreaterThan(0);
    for (const v of rel.verdicts) {
      if (v.rowLabel === "MISS") continue;
      expect(v.liveness, v.rowLabel).toBe("LIVE");
    }
  });

  /**
   * THE PROPERTY THE WHOLE DESIGN IS FOR.
   *
   * `MISS`'s `catchMod` is exempt only because `catchable: false` makes
   * `sim/passPlay.ts` return before the catch is resolved. Flip that guard and
   * the same derivation, unchanged and un-edited, reports the cell LIVE — so the
   * gate would start asserting an ordering nobody re-authorised.
   *
   * This is what a hand-maintained exemption list cannot do: it would still say
   * "MISS is exempt", the gate would still be green, and the green would mean
   * nothing. A stale exemption is indistinguishable from a suppressed defect.
   */
  it("un-exempts the cell the moment the guard stops holding", { timeout: 600_000 }, () => {
    const guardOff = applyTunablePatch(DEFAULT_TUNABLES, {
      tunableId: "throwExec.accuracy.bands.6.catchable",
      currentValue: false,
      proposedValue: true,
      evidence: "ADR-035 §5 — the un-exemption proof",
      expectedEffect: "MISS's placement columns become readable",
    });
    const cells = allCells(guardOff, ["throwExec.accuracy.bands"]).filter(
      (c) => c.column === "catchMod",
    );
    const rel = deriveGuardedBy({ tunables: guardOff, observe: engineObserver, cells });
    expect(rel.verdicts.find((v) => v.rowLabel === "MISS")?.liveness).toBe("LIVE");
    expect(rel.exempt.size).toBe(0);

    // And the consequence, stated as the gate will see it: with nothing exempt,
    // the inversion is back.
    const table = discoverBandTables(guardOff).find(
      (t) => t.path === "throwExec.accuracy.bands",
    ) as BandTable;
    expect(orderViolations(table, { exempt: rel.exempt }).map((v) => v.column)).toContain("catchMod");
  });
});
