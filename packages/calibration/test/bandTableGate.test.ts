/**
 * THE BAND-TABLE MONOTONICITY GATE — Charter §4.1, ADR-035 §7, ADR-037.
 *
 * ============================ HOW TO RUN THE HALF THAT COSTS MONEY ============================
 *
 *   FF_BAND_GATE=1                          pnpm --filter @ff/calibration test bandTableGate
 *   FF_BAND_GATE=1 FF_BAND_STAGE=falsify    pnpm --filter @ff/calibration test bandTableGate
 *
 * `gate` (the default stage) is ~27 minutes: 97 runs of a 160-game corpus. `falsify` is ~22 and
 * runs the two demonstrations that this gate HAS BEEN OBSERVED TO GO RED.
 *
 * ============================ ⚠ WHAT IS GREEN ON A DEFAULT `pnpm test` ============================
 *
 * **TIER A ONLY, AND TIER A CANNOT SEE A RESOLVER CHANGE.** It reads the tables and asserts:
 *
 *   - the census (26 tables, 248 cells, 52 orderable columns) is what was recorded;
 *   - every labelled ladder is either a discovered band table or the one declared non-margin one;
 *   - the RAW inversion set is exactly the ten columns recorded, WITH THEIR SEQUENCES — so a
 *     removed cell (a FIX) is distinguishable from an exemption growing (a NOTE);
 *   - every cell an owner ruling was made ABOUT still holds the value it was ruled about.
 *
 * That catches a new inversion the moment a band table changes, for free, on every push. What it
 * structurally CANNOT catch is the case ADR-035 exists for: a resolver that starts reading a cell
 * which used to be inert. `throwExec.accuracy.bands`' three `MISS` cells are exempt today because
 * `sim/passPlay.ts` returns before the catch is resolved; change that and Tier A stays green while
 * three real inversions go live.
 *
 * **SO: GREEN-BY-SKIP IS NOT GREEN.** `CALIBRATION-BACKLOG.md` §22c bought this warning with a real
 * defect — `pocketBandSweep.test.ts` carried a type error for a whole ADR because it was env-gated
 * and `vitest run` does not typecheck `test/`. Two mitigations, both concrete: `pnpm --filter
 * @ff/calibration typecheck` covers `test/` (`tsconfig.test.json` includes it), and Tier B must be
 * re-run and its output re-recorded on any `packages/engine` dispatch that touches a resolver which
 * reads a band table. That instruction is in ADR-037 §6 as well as here, because an instruction
 * that lives only in a skipped test file is an instruction nobody reads.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES, discoverBandTables, labelledLadderPaths } from "@ff/engine";
import {
  BAND_GATE_CORPUS,
  DECLARED_ABSTENTIONS,
  GATE_DEMONSTRATIONS,
  KNOWN_INVERSIONS,
  KNOWN_NON_MARGIN_LADDERS,
  RECORDED_CENSUS,
  RECORDED_RAW_INVERSIONS,
  abstainedRowKeys,
  assertRuledCellsCurrent,
  bandTableCensus,
  measuredRawInversions,
  rawViolations,
  renderBandGate,
  runBandTableGate,
  violationKey,
} from "../src/knownTruth/bandTables.js";

const enabled = process.env["FF_BAND_GATE"] === "1";
const STAGE = process.env["FF_BAND_STAGE"] ?? "gate";

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

// ---------------------------------------------------------------------------
// TIER A — free, deterministic, runs on every push
// ---------------------------------------------------------------------------

describe("band tables — the free tier", () => {
  it("the census is what was recorded", () => {
    expect(bandTableCensus(DEFAULT_TUNABLES)).toEqual(RECORDED_CENSUS);
  });

  it("every labelled ladder is either a band table or the one declared non-margin ladder", () => {
    // ADR-035 §1's design: the surviving declaration is "which labelled ladders are NOT margin band
    // tables" — one entry, and it breaks loudly when it is wrong. Never "which cells are exempt".
    const discovered = new Set(discoverBandTables(DEFAULT_TUNABLES).map((t) => t.path));
    const untriaged = labelledLadderPaths(DEFAULT_TUNABLES).filter(
      (p) => !discovered.has(p) && !KNOWN_NON_MARGIN_LADDERS.includes(p),
    );
    expect(untriaged).toEqual([]);
    // …and the declaration itself may not rot in the other direction: a "non-margin ladder" that
    // has become a band table would sit on the list unread.
    for (const path of KNOWN_NON_MARGIN_LADDERS) expect(discovered.has(path)).toBe(false);
  });

  it("the raw inversion set is exactly the ten SEQUENCES recorded", () => {
    // The sequence, not the column name. A count cannot tell a repaired engine from a loosened
    // gate: ADR-036 removed one CELL from `tippedBall.qualityBands.finalTargetNumber` and the
    // column stopped inverting, which is a FIX — and a name-only record would have shown the same
    // decrement as an exemption growing, which is a NOTE.
    expect(measuredRawInversions(DEFAULT_TUNABLES)).toEqual(RECORDED_RAW_INVERSIONS);
  });

  it("every ruled cell still holds the value its ruling was made about", () => {
    // `applyTunablePatch` throws `TunablePatchError` on a stale `currentValue`, so the staleness
    // check is the engine's own and not a comparison restated here. Entry 44's coupling to entry 23
    // is the live reason this matters: if `yac.bands.0.minYards` ever moves, the ruling that said
    // "no change, the zone walk credits it" has to be re-made rather than inherited.
    expect(() => {
      assertRuledCellsCurrent(DEFAULT_TUNABLES);
    }).not.toThrow();
  });

  it("every adjudicated inversion names a column that actually inverts", () => {
    // The other direction of the same staleness. An entry naming a column with no inversion is an
    // orphan — the shape ADR-033 removed from `readCapacityDelta`, on the gate's side of the fence.
    const raw = new Set(rawViolations(DEFAULT_TUNABLES).map(violationKey));
    for (const k of KNOWN_INVERSIONS) expect(raw.has(violationKey(k))).toBe(true);
  });

  it("the adjudicated set is a strict subset of the raw set, and says which half it is", () => {
    // Four of ten adjudicated; the other six are the ones the derivation is expected to exempt.
    // Recorded as an inequality rather than a list so it cannot be read as an exemption list.
    expect(KNOWN_INVERSIONS.length).toBeLessThan(RECORDED_RAW_INVERSIONS.length);
    expect(KNOWN_INVERSIONS.filter((k) => k.status === "RULED_NO_CHANGE")).toHaveLength(2);
    expect(KNOWN_INVERSIONS.filter((k) => k.status === "OPEN")).toHaveLength(2);
  });

  it("every declared abstention names a row that exists", () => {
    // An abstention whose subject was deleted is a note about nothing. `abstainedRowKeys` throws
    // rather than resolving to `undefined` — Charter §4.1, prefer a loud failure to a silent
    // default, and a silently-unresolved abstention would stop protecting the row it names.
    expect(() => abstainedRowKeys(DEFAULT_TUNABLES)).not.toThrow();
    expect(abstainedRowKeys(DEFAULT_TUNABLES)).toHaveLength(DECLARED_ABSTENTIONS.length);
  });

  it("the gate refuses an unfloored or undersized corpus", () => {
    // §7 property 4 and §22c, as behaviour rather than as prose. Both throw BEFORE any simulation.
    expect(() =>
      runBandTableGate({ corpus: { ...BAND_GATE_CORPUS, minRowReach: 0 } }),
    ).toThrow(/minRowReach/);
    expect(() => runBandTableGate({ corpus: { ...BAND_GATE_CORPUS, games: 24 } })).toThrow(/§22c/);
  });
});

// ---------------------------------------------------------------------------
// TIER B — the derivation. Env-gated; ~27 minutes.
// ---------------------------------------------------------------------------

describe.skipIf(!enabled)("band-table monotonicity gate", () => {
  it.skipIf(STAGE !== "gate")(
    "no unadjudicated inversion survives the derived exemption set",
    () => {
      const result = runBandTableGate({ log: say });
      say(renderBandGate(result));

      // ADR-035 §7 property 4 — asserted, never assumed.
      expect(result.derivation.reachFloorApplied).toBe(true);

      // §7 property 1 — the exemption set is GUARDED and nothing else.
      for (const id of result.derivation.exempt) {
        const verdict = result.derivation.verdicts.find(
          (v) => `${v.table}.${String(v.rowIndex)}.${v.column}` === id,
        );
        expect(verdict?.liveness).toBe("GUARDED");
      }

      // The gate's verdict, all four directions. See ADR-037 for why this is equality and not
      // `F is empty`: four surviving inversions are adjudicated and cannot be made to vanish, and
      // a guard that always fires gets deleted.
      expect(result.unadjudicated.map((f) => `${f.table}.${f.column}`)).toEqual([]);
      expect(result.vanished.map((v) => `${v.known.table}.${v.known.column} ${v.reason}`)).toEqual([]);
      // A declared abstention whose row has cleared the floor is the population arriving —
      // backlog 45's own instruction, asserted rather than remembered.
      expect(result.abstentionsNowMeasurable.map((a) => `${a.table}.${a.rowLabel}`)).toEqual([]);
      // §7 property 5: a blind spot nobody has declared is a blind spot nobody has looked at.
      expect(result.undeclaredBlindSpots).toEqual([]);
    },
    45 * 60 * 1000,
  );

  /**
   * §22a: *a gate that never fired was worse than the one that went red.* A gate shipped without
   * ever having been observed to fail is indistinguishable from a vacuous one — so it is made to
   * fail, twice, with the same unedited `runBandTableGate`.
   */
  it.skipIf(STAGE !== "falsify")(
    "goes RED when the guard stops holding, and when a clean table is given an inversion",
    () => {
      for (const demo of GATE_DEMONSTRATIONS) {
        say("");
        say("=======================================================================");
        say(`FALSIFIABILITY DEMONSTRATION "${demo.id}" — ${demo.what}`);
        say(demo.why);
        say("=======================================================================");

        // The control arm: the same restricted scope, unpatched. Establishes that the columns
        // below are NOT red without the patch, which is the half that makes the red mean something.
        const control = runBandTableGate({ restrictToTables: [demo.table], log: say });
        say(renderBandGate(control));
        const controlRed = control.unadjudicated
          .filter((f) => f.table === demo.table)
          .map((f) => f.column);
        expect(controlRed).toEqual([]);

        const patched = runBandTableGate({
          tunables: demo.patch(DEFAULT_TUNABLES),
          restrictToTables: [demo.table],
          log: say,
        });
        say(renderBandGate(patched));
        const red = patched.unadjudicated
          .filter((f) => f.table === demo.table)
          .map((f) => f.column)
          .sort();
        expect(red).toEqual([...demo.expectRed].sort());
      }
    },
    45 * 60 * 1000,
  );
});
