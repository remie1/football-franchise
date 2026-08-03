/**
 * THE RELATIONAL-CONSTANT CENSUS, RUN ONCE — env-gated so `pnpm verify`'s default `pnpm test` stays
 * green and fast. Enable with:
 *
 *     FF_RELATIONAL_CENSUS=1 pnpm --filter @ff/calibration exec vitest run test/relationalConstantCensus.test.ts
 *
 * Read-only. Changes no tunable, no engine code, no contract, no metric, no band, no verdict.
 * See `src/knownTruth/relationalConstantCensus.ts` for the instrument itself and the scope decision
 * (equality + integer multiples + sums + boundary proximity; NOT a general pairwise ordering census).
 *
 * THE POSITIVE CONTROL (CALIBRATION-BACKLOG entries 83, 110): the four known instances of the class
 * MUST be rediscovered by this instrument, or the census is broken and that is the headline.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import {
  boundaryProximities,
  censusCoverage,
  classifyAll,
  equalPairs,
  groupByUnit,
  integerMultiplePairs,
  sumTriples,
  valueHistogram,
} from "../src/knownTruth/relationalConstantCensus.js";
import { numericLeafPathDigest } from "../src/knownTruth/docConformance.js";

const ENABLED = process.env.FF_RELATIONAL_CENSUS === "1";
const d = ENABLED ? describe : describe.skip;

d("relational constant census", () => {
  it("runs the full census against DEFAULT_TUNABLES and logs every finding", () => {
    const coverage = censusCoverage(DEFAULT_TUNABLES);
    const groups = groupByUnit(DEFAULT_TUNABLES);
    const equal = equalPairs(groups);
    const multiples = integerMultiplePairs(groups);
    const { triples, coverage: sumCoverage } = sumTriples(groups);
    const boundaries = boundaryProximities(groups);

    console.log(`\nARM: DEFAULT_TUNABLES, numericLeafPathDigest ${numericLeafPathDigest(DEFAULT_TUNABLES)} — no seeds, no corpus runs; a static property of the committed tree.`);
    console.log("\n================ ITEM A — COVERAGE ================");
    console.log(`numeric leaves: ${String(coverage.totalNumericLeaves)}`);
    console.log(
      `classified: ${String(coverage.classifiedLeaves)}  unclassified: ${String(coverage.unclassifiedLeaves.length)}`,
    );
    console.log(
      `non-numeric (out of scope, same as docConformance.ts): strings=${String(coverage.nonNumericLeaves.strings)} ` +
        `booleans=${String(coverage.nonNumericLeaves.booleans)} untyped=${String(coverage.nonNumericLeaves.untyped.length)}`,
    );
    console.log("\nUNIT GROUPS (unit, count):");
    for (const g of coverage.unitGroupSizes) console.log(`  ${g.unit.padEnd(32)} ${String(g.count)}`);
    if (coverage.unclassifiedLeaves.length > 0) {
      console.log("\nUNCLASSIFIED LEAVES (named, not skipped):");
      for (const p of coverage.unclassifiedLeaves) console.log(`  ${p}`);
    }

    console.log("\n================ ITEM B — POSITIVE CONTROL ================");
    const KNOWN = [
      { label: "#1 INTERIOR travel(1.0) = collapsingWithinSeconds(1.0)", a: "arrival.travelSecondsByAlignmentAndMove.INTERIOR.SPEED", b: "arrival.collapsingWithinSeconds" },
      { label: "#2 EDGE.SPEED travel(2.0) = pressureWithinSeconds(2.0)", a: "arrival.travelSecondsByAlignmentAndMove.EDGE.SPEED", b: "arrival.pressureWithinSeconds" },
    ] as const;
    for (const k of KNOWN) {
      const found = equal.some(
        (p) =>
          (p.a.path === k.a && p.b.path === k.b) || (p.a.path === k.b && p.b.path === k.a),
      );
      console.log(`  ${found ? "FOUND" : "MISSING"}  ${k.label}`);
    }
    const orderingKnown = [
      { label: "#3 pursuitSeconds(1.5) vs pressureWithinSeconds(2.0), gap 0.5", boundary: "arrival.pressureWithinSeconds", other: "scramble.pursuitSeconds" },
      { label: "#4 maxTravelSeconds(3.0) vs pressureWithinSeconds(2.0), gap 1.0", boundary: "arrival.maxTravelSeconds", other: "arrival.pressureWithinSeconds" },
    ] as const;
    for (const k of orderingKnown) {
      const found = boundaries.some(
        (p) =>
          (p.boundary.path === k.boundary && p.other.path === k.other) ||
          (p.boundary.path === k.other && p.other.path === k.boundary),
      );
      console.log(`  ${found ? "FOUND" : "MISSING"}  ${k.label}`);
    }

    console.log("\n================ VALUE HISTOGRAMS, per unit group (top 6 values, groups with >=10 leaves) ================");
    for (const g of groups) {
      if (g.leaves.length < 10) continue;
      const hist = valueHistogram(g);
      console.log(`  [${g.unit}] n=${String(g.leaves.length)}`);
      for (const row of hist.slice(0, 6)) {
        console.log(`      value=${String(row.value).padEnd(8)} count=${String(row.count)}`);
      }
    }

    console.log(`\n================ EQUALITY PAIRS (${String(equal.length)} raw) ================`);
    for (const p of equal) {
      console.log(`  [${p.unit}] ${String(p.a.value)}  ${p.a.path}  ==  ${p.b.path}`);
    }

    console.log(`\n================ INTEGER-MULTIPLE PAIRS (${String(multiples.length)}) ================`);
    for (const m of multiples) {
      console.log(
        `  [${m.unit}] ${m.larger.path}=${String(m.larger.value)} = ${String(m.k)} x ${m.smaller.path}=${String(m.smaller.value)}`,
      );
    }

    console.log(`\n================ SUM TRIPLES (${String(triples.length)}) ================`);
    for (const t of triples) {
      console.log(
        `  [${t.unit}] ${t.sum.path}=${String(t.sum.value)} = ${t.addendA.path}(${String(t.addendA.value)}) + ${t.addendB.path}(${String(t.addendB.value)})`,
      );
    }
    console.log("\nsum-scan coverage (groups too large to scan exhaustively, if any):");
    for (const c of sumCoverage) {
      if (!c.scanned) console.log(`  SKIPPED [${c.unit}] size=${String(c.size)}`);
    }

    console.log(`\n================ BOUNDARY PROXIMITY, seconds unit only, |gap| <= 2.0 (${String(boundaries.length)} pairs computed total) ================`);
    const secondsBoundaries = boundaries
      .filter((b) => b.unit === "seconds" && Math.abs(b.gap) <= 2.0)
      .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap));
    for (const b of secondsBoundaries) {
      console.log(
        `  gap=${b.gap.toFixed(2)}  boundary ${b.boundary.path}=${String(b.boundary.value)}  vs  ${b.other.path}=${String(b.other.value)}`,
      );
    }

    // The instrument must run to completion and classify the whole tree (Item A's totality).
    expect(coverage.totalNumericLeaves).toBeGreaterThan(0);
    expect(coverage.classifiedLeaves + coverage.unclassifiedLeaves.length).toBe(coverage.totalNumericLeaves);

    // THE POSITIVE CONTROL — if this fails, the census is broken, per the dispatch brief's own words.
    for (const k of KNOWN) {
      const found = equal.some(
        (p) => (p.a.path === k.a && p.b.path === k.b) || (p.a.path === k.b && p.b.path === k.a),
      );
      expect(found, `positive control MISSING: ${k.label}`).toBe(true);
    }
    for (const k of orderingKnown) {
      const found = boundaries.some(
        (p) =>
          (p.boundary.path === k.boundary && p.other.path === k.other) ||
          (p.boundary.path === k.other && p.other.path === k.boundary),
      );
      expect(found, `positive control MISSING: ${k.label}`).toBe(true);
    }

    // Never zero classification silently — every leaf reaches classifyAll or is named above.
    expect(classifyAll(DEFAULT_TUNABLES).length).toBe(coverage.totalNumericLeaves);
  });
});
