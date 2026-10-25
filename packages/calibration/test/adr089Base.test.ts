/**
 * ADR-089 step 0 — THE BASE PROOFS (plan §7.3 item 3; §9 (a) and (b); §10 P-3, P-4, P-5). Gated
 * `FF_POCKET_BASE=1`: it plays baseline-0009's 496 games twice (once through `runBatch`, once through
 * `corpus.ts`'s `flatBaseline`) and the gen season once, and reads the data cache.
 *
 *   FF_POCKET_BASE=1 pnpm --filter @ff/calibration test adr089Base
 *   FF_POCKET_BASE=1 FF_POCKET_CARRY=<scratch>/baseline-0009-s0.carry-forward.json pnpm --filter @ff/calibration test adr089Base
 *
 *  - **P-3:** `runBatch` on baseline-0009's config (`baselineTool.test.ts`) reproduces all 35 of
 *    `reports/baseline-0009.carry-forward.json`'s sim values exactly (`===`), prints 86.85 / 20.05 /
 *    16.43 / 1.242, and gives the filed flat base value of every registry row. With
 *    `FF_POCKET_CARRY` (the carry-forward P-3(b)'s `baselineTool` run wrote at this tree), its 35 old
 *    keys are identical, its identity is identical except `engineCommit`, and it has no `engineRules`.
 *  - **The flat corpus:** `flatBaseline(1)` plays the same games (its accumulator gives the same
 *    registry rows), and its pocket rows equal the filed flat values.
 *  - **P-4:** `genSeason(1)` prints 85.26 / 24.04 / 16.72 / 1.235 and gives the filed gen value of
 *    every registry row and pocket row, and the filed M3 and M4.
 *  - **P-5, the (b) checks:** each printed as reproduced or REPORTED-UNREPRODUCED with its own
 *    construct and value, and the classification asserted (a miss never falsifies step 0, §9 (b);
 *    the assertion pins which figures miss, so a change in either direction is seen).
 *  - **P-5, the real sides:** every new real side against its §2 figure at the printed precision
 *    (a figure reproduces when the printed number is a rounding of the measured one), with its
 *    design line. A miss stops C3 (K16) unless it is listed in `K16_LISTED`, where the measured
 *    figure is printed beside the design's and the discrepancy is in Appendix E.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runBatch, type BatchResult } from "../src/harness/batch.js";
import { stableDigest } from "../src/harness/digest.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { fsCacheStore } from "../src/ingest/cache.js";
import { TUNING_SEASONS } from "../src/ingest/seasons.js";
import { numericLeafPathDigest } from "../src/knownTruth/docConformance.js";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { buildFlatLeague } from "../src/league/flat.js";
import type { LeagueProvenance } from "../src/league/provenance.js";
import { emptyAccumulator, foldGame, mergeAccumulators, RELEASE_BINS, releaseBinOf, type SimAccumulator } from "../src/metrics/collect.js";
import "../src/metrics/index.js";
import {
  isAimed,
  isFlagged,
  isRealHitOrSack,
  realCleanOuts,
  realDropbacks,
  realOutOfPocketThrows,
  realReleaseDistribution,
  realSackShareOfContacts,
  realSituation,
  realWindowOf,
  realThrowawayRate,
  tickAligned,
  type RealDropback,
} from "../src/metrics/pocketReal.js";
import { openRealForTuning, type TuningRealInput } from "../src/metrics/realInput.js";
import { getMetric } from "../src/metrics/registry.js";
import { isInapplicable, pointEstimate, type MetricOutcome } from "../src/metrics/types.js";
import { BASE_ROW_IDS, FILED_PATH } from "../src/pocket/bands.js";
import { constructById } from "../src/pocket/constructs.js";
import { flatBaseline, genSeason } from "../src/pocket/corpus.js";
import { loadFiled, type JsonValue } from "../src/pocket/filed.js";
import { emptyM4Fold, foldM4Game, m4Summary } from "../src/pocket/m4AlarmMix.js";
import { registryBaseRows, sanitize } from "../src/pocket/step0.js";
import { BIN_20_LIMIT } from "../src/pocket/missRule.js";
import { emptyRowsFold, foldRowsGame, pocketRows, type RowsFold } from "../src/pocket/rows.js";
import { dropbacksOf } from "../src/pocket/throwClass.js";

const BASE = process.env["FF_POCKET_BASE"] === "1";
const CARRY = process.env["FF_POCKET_CARRY"];
const ROOT = join(import.meta.dirname, "..");
const T = DEFAULT_TUNABLES;
const LONG = 900_000;

const filed = loadFiled(join(ROOT, FILED_PATH));
const filedRow = (id: string, league: "flat" | "gen"): unknown => (filed.base.rows[id] as Record<string, unknown>)[league];
const REGISTRY_IDS = BASE_ROW_IDS.filter((id) => constructById(id)?.home === "registry");
const POCKET_IDS = BASE_ROW_IDS.filter((id) => constructById(id)?.home === "pocket-row");

const BASELINE_0009 = JSON.parse(readFileSync(join(ROOT, "reports", "baseline-0009.carry-forward.json"), "utf8")) as {
  identity: Record<string, unknown>;
  context: Record<string, unknown>;
  sim: Record<string, number>;
};

function outcome(id: string, acc: SimAccumulator, provenance: LeagueProvenance): MetricOutcome {
  return getMetric(id).computeFromEvents({ accumulator: acc, provenance });
}
function point(id: string, acc: SimAccumulator, provenance: LeagueProvenance): number {
  const o = outcome(id, acc, provenance);
  if (isInapplicable(o)) throw new Error(`${id} is inapplicable: ${o.detail}`);
  const v = pointEstimate(o);
  if (v === null) throw new Error(`${id} has no point estimate`);
  return v;
}
/** pressure / hit-or-sack / sack in percent at 2 dp, release at 3 dp: the baseline's printed row. */
function headline(acc: SimAccumulator, provenance: LeagueProvenance): readonly string[] {
  return [
    (100 * point("threat_creation_rate", acc, provenance)).toFixed(2),
    (100 * point("hit_or_sack_rate", acc, provenance)).toFixed(2),
    (100 * point("sack_rate", acc, provenance)).toFixed(2),
    point("time_to_throw", acc, provenance).toFixed(3),
  ];
}

/** Does the printed figure round the measured one at `dp` places? (A tie may round either way.) */
function printedAs(measured: number, printed: number, dp: number): boolean {
  return Math.abs(measured - printed) <= 0.5 * 10 ** -dp + 1e-9;
}

// --- the (b) checks, collected by the blocks that measure them, printed and asserted at the end ------------

type BClass = "reproduced" | "REPORTED-UNREPRODUCED" | "checked by P-6";
interface BCheck {
  readonly id: string;
  readonly construct: string;
  readonly design: string;
  readonly measured: string;
  readonly verdict: BClass;
}
const bChecks = new Map<string, BCheck>();
const record = (c: BCheck): void => {
  bChecks.set(c.id, c);
};

/** §9 (b)'s classification on this tree (MEASURED by S3 and C3; plan §9 marks three as MEASURED: reproduce). */
const B_EXPECTED: Readonly<Record<string, BClass>> = Object.freeze({
  "b.m4": "reproduced",
  "b.clean-bench-nobody-open": "checked by P-6",
  "b.m3": "reproduced",
  "b.first-pressure": "reproduced",
  "b.live-won-rep": "reproduced",
  "b.unblocked-men": "reproduced",
  "b.won-rep-origin": "reproduced",
  "b.entry-107": "REPORTED-UNREPRODUCED",
  "b.cp-classes": "reproduced",
  "b.tm-399": "REPORTED-UNREPRODUCED",
});

// --- a.census: the step proof's census (plan K11; review CT-S1) ----------------------------------------

describe.skipIf(!BASE)("a.census: the tunables digest and the path digest at the step proof (FF_POCKET_BASE=1)", () => {
  it("DEFAULT_TUNABLES still digests to the filed fnv1a:395a9ae2, and its numeric-leaf path set to fnv1a:365da48d", () => {
    // Checked here, in the step proof, not as a suite pin (plan K11): a value change on main that adds
    // no leaf moves this digest, and the step's proof is where ADR-089:995's "tunablesDigest is still"
    // is graded. The path digest is also the suite's pin (docConformance, adr089Filed).
    expect(stableDigest(DEFAULT_TUNABLES), "ADR-089:995 a.census: a tunables value or leaf moved since step 0's filing").toBe(filed.census.tunablesDigest);
    expect(numericLeafPathDigest(), "ADR-089:993 the census: a numeric leaf was added to or removed from DEFAULT_TUNABLES").toBe(filed.census.pathDigest);
  });
});

// --- P-3: baseline-0009 ------------------------------------------------------------------------------

describe.skipIf(!BASE)("P-3: baseline-0009 reproduced on its 496 games (FF_POCKET_BASE=1)", () => {
  let batch: BatchResult;
  beforeAll(async () => {
    batch = await runBatch({
      league: buildFlatLeague({ teams: 32 }),
      schedule: { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 },
      seeds: generateSeeds("baseline-0001", 16 * 31),
      playCalling: { tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN },
    });
  }, LONG);

  it("plays baseline-0009's batch: 496 games on its seed digest", () => {
    expect(batch.provenance.games).toBe(496);
    expect(batch.provenance.seedDigest).toBe(BASELINE_0009.context["seedDigest"]);
    expect(batch.provenance.leagueProvenance).toBe("FLAT_SYNTHETIC");
  });

  it("reproduces all 35 of baseline-0009's sim values exactly (===)", () => {
    const keys = Object.keys(BASELINE_0009.sim);
    expect(keys).toHaveLength(35);
    const prov = batch.provenance.leagueProvenance as LeagueProvenance;
    const moved = keys.filter((id) => point(id, batch.accumulator, prov) !== BASELINE_0009.sim[id]).map((id) => `${id}: ${String(BASELINE_0009.sim[id])} -> ${String(point(id, batch.accumulator, prov))}`);
    expect(moved).toEqual([]);
  });

  it("prints 86.85 / 20.05 / 16.43 / 1.242 (pressure / hit-or-sack / sack / release)", () => {
    expect(headline(batch.accumulator, "FLAT_SYNTHETIC")).toEqual(["86.85", "20.05", "16.43", "1.242"]);
  });

  it("gives the filed flat base value of every registry row", () => {
    const rows = registryBaseRows(batch.accumulator, "flat");
    for (const id of REGISTRY_IDS) expect(sanitize(rows[id]), id).toEqual(filedRow(id, "flat"));
  });

  it.skipIf(CARRY === undefined)("P-3(b): the new carry-forward keeps the 35 old values, the identity except engineCommit, and no engineRules", () => {
    const path = resolve(CARRY ?? "");
    expect(existsSync(path), path).toBe(true);
    const next = JSON.parse(readFileSync(path, "utf8")) as { identity: Record<string, unknown>; context: Record<string, unknown>; sim: Record<string, number> };
    for (const [id, v] of Object.entries(BASELINE_0009.sim)) expect(next.sim[id], id).toBe(v);
    const { engineCommit: oldCommit, ...oldRest } = BASELINE_0009.identity;
    const { engineCommit: newCommit, ...newRest } = next.identity;
    expect(newRest).toEqual(oldRest);
    expect(typeof newCommit).toBe("string");
    expect(newCommit).not.toBe(oldCommit);
    expect("engineRules" in next.identity).toBe(false);
    expect(JSON.stringify(next)).not.toContain("engineRules");
    expect(next.context).toEqual(BASELINE_0009.context);
  });
});

// --- the flat corpus: the same games, and the flat pocket rows ----------------------------------------

describe.skipIf(!BASE)("the flat corpus: flatBaseline(1) plays baseline-0009's games, and files the flat pocket rows (FF_POCKET_BASE=1)", () => {
  let acc: SimAccumulator = emptyAccumulator();
  const rows: RowsFold = emptyRowsFold();
  let games = 0;
  beforeAll(() => {
    games = flatBaseline(1, (o, snapshot) => {
      acc = mergeAccumulators(acc, foldGame(emptyAccumulator(), o));
      foldRowsGame(rows, o.events, T, positionsFromSnapshot(snapshot));
    }).games;
  }, LONG);

  it("its accumulator gives the filed flat registry rows (the corpus is baseline-0009's batch)", () => {
    expect(games).toBe(496);
    const reg = registryBaseRows(acc, "flat");
    for (const id of REGISTRY_IDS) expect(sanitize(reg[id]), id).toEqual(filedRow(id, "flat"));
    expect(headline(acc, "FLAT_SYNTHETIC")).toEqual(["86.85", "20.05", "16.43", "1.242"]);
  });

  it("its pocket rows equal the filed flat values", () => {
    const p = sanitize(pocketRows(rows)) as Record<string, JsonValue>;
    for (const id of POCKET_IDS) expect(p[id], id).toEqual(filedRow(id, "flat"));
  });

  it("(b) on flat: first pressure 0.877 s, live WON_REP 60 ticks on 57 dropbacks, entry 107's 79.94%", () => {
    const fp = point("first_pressure_seconds", acc, "FLAT_SYNTHETIC");
    const ticks = outcome("clean_with_live_won_rep_ticks", acc, "FLAT_SYNTHETIC");
    const drops = outcome("clean_with_live_won_rep_dropbacks", acc, "FLAT_SYNTHETIC");
    const t = !isInapplicable(ticks) && ticks.kind === "RATE" ? ticks.successes : Number.NaN;
    const d = !isInapplicable(drops) && drops.kind === "RATE" ? drops.successes : Number.NaN;
    flatFirstPressure = fp;
    flatLive = [t, d];
    const mc = (pocketRows(rows) as Record<string, { pct: number; multi: number; forced: number }>)["multi_channel_share"]!;
    record({
      id: "b.entry-107",
      construct: "multi_channel_share (rows.ts, the in-tree deciding-instant algorithm, the current forcing rule), flat seed set 1",
      design: "79.94% on the 496-game flat corpus",
      measured: `${mc.pct.toFixed(2)}% (${String(mc.multi)} of ${String(mc.forced)} forced); S3's pocketDecidingInstant pins the pre-ADR-058 old-forced reading at 76.55%`,
      verdict: printedAs(mc.pct, 79.94, 2) ? "reproduced" : "REPORTED-UNREPRODUCED",
    });
    expect(fp.toFixed(3)).toBe("0.877");
    expect([t, d]).toEqual([60, 57]);
  });
});

let flatFirstPressure: number | undefined;
let flatLive: readonly number[] | undefined;

// --- P-4: the gen base -------------------------------------------------------------------------------

describe.skipIf(!BASE)("P-4: the gen base, genSeason(1) (FF_POCKET_BASE=1)", () => {
  let acc: SimAccumulator = emptyAccumulator();
  const rows: RowsFold = emptyRowsFold();
  const m4 = emptyM4Fold();
  /** TM's construct (ADR-089:492): each rusher's first WON_REP threat on a dropback, EDGE, travel = etaTick - tick. */
  const tm399 = { edge: 0, far: 0, farCB: 0 };
  let games = 0;
  beforeAll(() => {
    games = genSeason(1, (o, snapshot, meta) => {
      const positions = positionsFromSnapshot(snapshot);
      acc = mergeAccumulators(acc, foldGame(emptyAccumulator(), o));
      foldRowsGame(rows, o.events, T, positions);
      foldM4Game(m4, o.events, T, positions, meta.seed);
      for (const d of dropbacksOf(o.events)) {
        const seen = new Set<string>();
        for (const t of d.threats) {
          if (t.origin !== "WON_REP" || seen.has(t.rusher)) continue;
          seen.add(t.rusher);
          if (t.alignment !== "EDGE") continue;
          tm399.edge += 1;
          if (Math.round((t.etaTick - t.tick) * 10) / 10 >= 2.5) {
            tm399.far += 1;
            if (String(positions.get(t.rusher as never)) === "CB") tm399.farCB += 1;
          }
        }
      }
    }).games;
  }, LONG);

  it("prints 85.26 / 24.04 / 16.72 / 1.235 on 272 games", () => {
    expect(games).toBe(272);
    expect(headline(acc, "GENERATED_FICTIONAL")).toEqual(["85.26", "24.04", "16.72", "1.235"]);
  });

  it("gives the filed gen base value of every registry row", () => {
    const reg = registryBaseRows(acc, "gen");
    for (const id of REGISTRY_IDS) expect(sanitize(reg[id]), id).toEqual(filedRow(id, "gen"));
  });

  it("gives the filed gen base value of every pocket row, and the filed M3 and M4", () => {
    const p = sanitize(pocketRows(rows)) as Record<string, JsonValue>;
    for (const id of POCKET_IDS) expect(p[id], id).toEqual(filedRow(id, "gen"));
    const M = filed.M as unknown as { M3: { sim: Record<string, unknown> }; M4: Record<string, unknown> };
    expect(p["sacker_mix"]).toEqual(M.M3.sim["gen"]);
    expect(sanitize(m4Summary(m4))).toEqual(M.M4["gen"]);
  });

  it("(b) on gen: M3, M4, first pressure, live WON_REP, unblocked men, the won-rep origin share, CP's after-escape INT", () => {
    const p = pocketRows(rows) as Record<string, unknown>;
    const m3 = p["sacker_mix"] as { splitPct: Record<string, number>; unsplitPct: Record<string, number>; multiSame: number; sacks: number };
    const m3ok = printedAs(m3.splitPct["interior"]!, 86.9, 1) && printedAs(m3.splitPct["edge"]!, 8.6, 1) && printedAs(m3.splitPct["offball"]!, 4.4, 1) && printedAs(m3.unsplitPct["interior"]!, 82.5, 1) && m3.multiSame === 1110;
    record({
      id: "b.m3",
      construct: "M3: the last ARRIVED rusher credited, same-tick arrivals split evenly (m3SackerMix.ts), gen seed set 1",
      design: "split 86.9 / 8.6 / 4.4, unsplit interior 82.5, 1,110 sacks with same-tick arrivals",
      measured: `split ${String(m3.splitPct["interior"])} / ${String(m3.splitPct["edge"])} / ${String(m3.splitPct["offball"])}, unsplit interior ${String(m3.unsplitPct["interior"])}, ${String(m3.multiSame)} of ${String(m3.sacks)} sacks`,
      verdict: m3ok ? "reproduced" : "REPORTED-UNREPRODUCED",
    });

    const s4 = m4Summary(m4) as { multiCause: number; firstNonClean: number; multiCauseSharePct: number; naiveMulti: number; naiveMultiSharePct: number };
    record({
      id: "b.m4",
      construct: "M4: first non-clean ticks with two causes or more by TM's cause rule (m4AlarmMix.ts), gen seed set 1",
      design: "6,395 of 21,962 (29.1%); the naive construct's 36.3% beside it",
      measured: `${String(s4.multiCause)} of ${String(s4.firstNonClean)} (${String(s4.multiCauseSharePct)}%); naive ${String(s4.naiveMulti)} (${String(s4.naiveMultiSharePct)}%)`,
      verdict: s4.multiCause === 6395 && s4.firstNonClean === 21962 && printedAs(s4.multiCauseSharePct, 29.1, 1) && printedAs(s4.naiveMultiSharePct, 36.3, 1) ? "reproduced" : "REPORTED-UNREPRODUCED",
    });

    const fp = point("first_pressure_seconds", acc, "GENERATED_FICTIONAL");
    const both = flatFirstPressure !== undefined;
    record({
      id: "b.first-pressure",
      construct: "first_pressure_seconds (the first tick at PRESSURE or worse, mean), seed set 1",
      design: "0.877 s flat, 0.883 s gen",
      measured: `${flatFirstPressure?.toFixed(3) ?? "(flat not run)"} s flat, ${fp.toFixed(3)} s gen`,
      verdict: both && printedAs(flatFirstPressure!, 0.877, 3) && printedAs(fp, 0.883, 3) ? "reproduced" : "REPORTED-UNREPRODUCED",
    });

    const ticks = outcome("clean_with_live_won_rep_ticks", acc, "GENERATED_FICTIONAL");
    const drops = outcome("clean_with_live_won_rep_dropbacks", acc, "GENERATED_FICTIONAL");
    const t = !isInapplicable(ticks) && ticks.kind === "RATE" ? ticks.successes : Number.NaN;
    const d = !isInapplicable(drops) && drops.kind === "RATE" ? drops.successes : Number.NaN;
    record({
      id: "b.live-won-rep",
      construct: "clean_with_live_won_rep_ticks and _dropbacks (a live WON_REP threat on a CLEAN tick), seed set 1",
      design: "60 ticks on 57 dropbacks flat, 30 on 29 gen",
      measured: `${flatLive === undefined ? "(flat not run)" : `${String(flatLive[0])} on ${String(flatLive[1])}`} flat, ${String(t)} on ${String(d)} gen`,
      verdict: flatLive !== undefined && flatLive[0] === 60 && flatLive[1] === 57 && t === 30 && d === 29 ? "reproduced" : "REPORTED-UNREPRODUCED",
    });

    const men = point("unblocked_men_per_100", acc, "GENERATED_FICTIONAL");
    record({
      id: "b.unblocked-men",
      construct: "unblocked_men_per_100 (men on the free-run clock per 100 dropbacks), gen seed set 1",
      design: "18.1",
      measured: men.toFixed(2),
      verdict: printedAs(men, 18.1, 1) ? "reproduced" : "REPORTED-UNREPRODUCED",
    });

    const origin = outcome("first_pressure_origin", acc, "GENERATED_FICTIONAL");
    const counts = !isInapplicable(origin) && origin.kind === "CATEGORICAL" ? origin.counts : {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const won = total === 0 ? Number.NaN : (100 * (counts["WON_REP"] ?? 0)) / total;
    record({
      id: "b.won-rep-origin",
      construct: "first_pressure_origin (the origin of the first PRESSURE-or-worse tick, same-tick causes split), gen seed set 1",
      design: "62% from won reps",
      measured: `${won.toFixed(2)}%`,
      verdict: printedAs(won, 62, 0) ? "reproduced" : "REPORTED-UNREPRODUCED",
    });

    const run = (p["int_per_aimed_by_throw_class"] as Record<string, { aimed: number; value: number }>)["ON_THE_RUN"]!;
    record({
      id: "b.cp-classes",
      construct: "int_per_aimed_by_throw_class.ON_THE_RUN on gen base (throws after an escape); the clean-bench class figures are cleanBench.test.ts's (P-6)",
      design: "after an escape on gen base 17.1% INT; desperation 19.0% INT and rank-pushed 16.3% at 20.9% on the gen clean bench",
      measured: `after an escape ${run.value.toFixed(2)}% on ${String(run.aimed)} aimed here; the clean-bench figures are asserted by P-6`,
      verdict: printedAs(run.value, 17.1, 1) && run.aimed === 421 ? "reproduced" : "REPORTED-UNREPRODUCED",
    });

    // Review F1: TM's figure is a count of threats on the gen base, which this tree can measure; the
    // verdict is derived from that count, and M2's decision-level figure is printed beside it.
    const M2 = filed.M.M2 as unknown as Record<string, Record<string, { forced: number; counterFar: number; counterFarSharePct: number }>>;
    const s = M2["gen"]?.["S-theta11-window"];
    record({
      id: "b.tm-399",
      construct:
        "each rusher's first WON_REP RUSH_THREAT on a dropback, EDGE, with travel (etaTick - tick) of 2.5 s or more, and how many are cornerbacks (the snapshot's position), gen seed set 1; M2's S arm (theta 11, the window) counts decisions, beside it",
      design: "TM's 399 of 14,627 edge won-rep threats whose travel is 2.5 s or more on gen base (2.7%), 393 of them cornerbacks",
      measured: `${String(tm399.far)} of ${String(tm399.edge)} (${((100 * tm399.far) / tm399.edge).toFixed(2)}%), ${String(tm399.farCB)} of them cornerbacks; M2's S arm: counter-forced ${String(s?.counterFar)} of ${String(s?.forced)} forced decisions (${String(s?.counterFarSharePct)}%)`,
      verdict: tm399.far === 399 && tm399.edge === 14627 && tm399.farCB === 393 ? "reproduced" : "REPORTED-UNREPRODUCED",
    });
    // MEASURED by the fidelity review's scratch run (398 of 14,447, 392 CB), pinned so a change in either direction is seen.
    expect(tm399).toEqual({ edge: 14447, far: 398, farCB: 392 });

    record({
      id: "b.clean-bench-nobody-open",
      construct: "the clean bench's nobody-open share and split by throwClass.ts (cleanBench.test.ts, FF_POCKET_BENCH=1)",
      design: "gen 30.2% (8,631 of 28,588): 10.1 / 8.9 / 11.1; flat 43.6% (23,064 of 52,882): 6.8 / 16.2 / 20.6",
      measured: "asserted by P-6, not replayed here",
      verdict: "checked by P-6",
    });
  });
});

// --- P-5: the (b) checks, printed and classified ------------------------------------------------------

describe.skipIf(!BASE)("P-5: the (b) checks, each with its construct and value (FF_POCKET_BASE=1)", () => {
  it("prints every (b) check and classifies each as filed in §9 (b)", () => {
    const lines = [...bChecks.values()].map((c) => `  ${c.id}: ${c.verdict}\n    construct: ${c.construct}\n    design: ${c.design}\n    measured: ${c.measured}`);
    // eslint-disable-next-line no-console
    console.log(`ADR-089 step 0, the (b) checks:\n${lines.join("\n")}`);
    expect([...bChecks.keys()].sort()).toEqual(filed.prediction.b.map((b) => b.id).sort());
    expect(Object.fromEntries([...bChecks.values()].map((c) => [c.id, c.verdict]))).toEqual(B_EXPECTED);
  });
});

// --- P-5: the real sides against §2 --------------------------------------------------------------------

interface RealCheck {
  readonly label: string;
  readonly adrLine: number | string;
  readonly design: number;
  readonly measured: number;
  readonly dp: number;
}

/**
 * The real sides that do not reproduce their §2 figure and cannot be matched (K16): the measured
 * figure is printed beside the design's, and each is listed in Appendix E. Bands stay filed against
 * the design's figures.
 */
const K16_LISTED: Readonly<Record<string, string>> = Object.freeze({
  "hit-or-sack 95% interval, upper (ADR-089:86)":
    "the design's [14.43-15.00] states no construct; the play-level binomial 95% interval is [14.43, 14.99], and a game-clustered bootstrap is wider",
  "QB hit rate counting throwaways, raw, 2.5-3.0 (ADR-089:171)":
    "803 of 7,401 is 10.850 (10.8499 to four places), so the printed 10.9 is a half-up rounding of the two-place 10.85 (double rounding, INFERRED); K1's reference row, which no band reads",
});

describe.skipIf(!BASE)("P-5: every new real side against its §2 figure (FF_POCKET_BASE=1)", () => {
  let real: TuningRealInput;
  beforeAll(async () => {
    real = await openRealForTuning(fsCacheStore(join(ROOT, "data-cache")), TUNING_SEASONS, { withParticipation: true, withFtn: true });
  }, LONG);

  it("reproduces §2.1-§2.4's real figures at their printed precision, each with its design line", () => {
    const checks: RealCheck[] = [];
    const add = (label: string, adrLine: number | string, design: number, measured: number, dp: number): void => {
      checks.push({ label: `${label} (ADR-089:${String(adrLine)})`, adrLine, design, measured, dp });
    };
    const pctOf = (o: MetricOutcome): number => {
      if (isInapplicable(o) || o.kind !== "RATE") throw new Error(`not a rate: ${JSON.stringify(o)}`);
      return (100 * o.successes) / o.trials;
    };
    const table = realDropbacks(real);
    const ftnSeasons = (d: RealDropback): boolean => d.season === 2023 || d.season === 2024;

    // §2.1 (:86, :87, :155-158)
    const hos = pctOf(getMetric("hit_or_sack_rate").computeFromReal(real));
    add("hit-or-sack per dropback, 2022-24", 86, 14.71, hos, 2);
    const n = table.length;
    const p = hos / 100;
    const se = 100 * Math.sqrt((p * (1 - p)) / n);
    add("hit-or-sack 95% interval, lower", 86, 14.43, hos - 1.96 * se, 2);
    add("hit-or-sack 95% interval, upper", 86, 15.0, hos + 1.96 * se, 2);
    const recent = table.filter(ftnSeasons);
    add("hit-or-sack per dropback, 2023-24", 155, 14.73, (100 * recent.filter(isRealHitOrSack).length) / recent.length, 2);
    add("sack share of hit-or-sack, 2022-24", 87, 44.6, pctOf(getMetric("sack_share_of_hit_or_sack").computeFromReal(real)), 1);
    add("sack share of hit-or-sack, 2023-24", 156, 45.1, (100 * recent.filter((d) => d.sack).length) / recent.filter(isRealHitOrSack).length, 1);
    add("sack per dropback, 2022-24", 157, 6.56, pctOf(getMetric("sack_rate").computeFromReal(real)), 2);
    const release = realReleaseDistribution(real, "RAW");
    const times = !isInapplicable(release) && release.kind === "SAMPLES" ? [...release.values].sort((a, b) => a - b) : [];
    add("time to throw, FTN 2023-24, raw seconds", 158, 2.631, times.reduce((a, b) => a + b, 0) / times.length, 3);
    add("time to throw, median", 158, 2.4, times[Math.floor(times.length / 2)]!, 2);

    // §2.2's curves (:165-188) and the 0.5 s release shape (:190-196)
    const curve = (grid: "RAW" | "TICK") => {
      const cell = () => ({ att: 0, flagged: 0, pressured: 0, ftnAtt: 0, hitAll: 0, throwaway: 0, int: 0, aimed: 0, aimedHit: 0, aimedInt: 0 });
      const out = Object.fromEntries(RELEASE_BINS.map((b) => [b.label, cell()]));
      for (const d of table) {
        if (!ftnSeasons(d) || !d.attempt || d.timeToThrow === null) continue;
        const c = out[releaseBinOf(grid === "TICK" ? tickAligned(d.timeToThrow) : d.timeToThrow)]!;
        c.att += 1;
        if (d.wasPressure !== null) {
          c.flagged += 1;
          if (d.wasPressure) c.pressured += 1;
        }
        if (d.inFtn) {
          c.ftnAtt += 1;
          if (d.qbHit) c.hitAll += 1;
          if (d.throwaway === true) c.throwaway += 1;
          if (d.interception) c.int += 1;
          if (isAimed(d)) {
            c.aimed += 1;
            if (d.qbHit) c.aimedHit += 1;
            if (d.interception) c.aimedInt += 1;
          }
        }
      }
      const total = Object.values(out).reduce((a, c) => a + c.att, 0);
      return { cells: RELEASE_BINS.map((b) => out[b.label]!), total };
    };
    const raw = curve("RAW");
    const tick = curve("TICK");
    const row = (label: string, line: number, design: readonly number[], values: readonly number[], dp: number): void => {
      design.forEach((v, i) => add(`${label}, ${RELEASE_BINS[i]!.label}`, line, v, values[i]!, dp));
    };
    const ratio = (cells: typeof raw.cells, num: (c: (typeof raw.cells)[number]) => number, den: (c: (typeof raw.cells)[number]) => number): number[] =>
      cells.map((c) => (100 * num(c)) / den(c));
    row("QB hit rate on aimed throws, raw", 169, [2.7, 7.1, 10.6, 11.0, 13.8, 16.1, 18.0], ratio(raw.cells, (c) => c.aimedHit, (c) => c.aimed), 1);
    row("QB hit rate on aimed throws, tick", 170, [1.9, 5.4, 9.7, 10.6, 12.7, 15.3, 18.0], ratio(tick.cells, (c) => c.aimedHit, (c) => c.aimed), 1);
    row("QB hit rate counting throwaways, raw", 171, [2.7, 7.3, 10.9, 11.4, 14.8, 19.2, 21.5], ratio(raw.cells, (c) => c.hitAll, (c) => c.ftnAtt), 1);
    row("pressured share, raw", 179, [9.0, 18.1, 24.6, 27.9, 36.9, 56.0, 72.6], ratio(raw.cells, (c) => c.pressured, (c) => c.flagged), 1);
    row("pressured share, tick", 180, [7.3, 14.7, 22.3, 26.8, 32.5, 49.6, 71.5], ratio(tick.cells, (c) => c.pressured, (c) => c.flagged), 1);
    row("share of attempts, raw", 181, [26.1, 24.3, 20.6, 12.9, 6.7, 5.2, 4.2], raw.cells.map((c) => (100 * c.att) / raw.total), 1);
    row("share of attempts, tick", 182, [17.0, 23.4, 23.0, 16.1, 8.9, 6.6, 5.0], tick.cells.map((c) => (100 * c.att) / tick.total), 1);
    row("throwaway per attempt, raw", 183, [0.4, 1.5, 2.4, 3.3, 8.1, 17.0, 27.3], ratio(raw.cells, (c) => c.throwaway, (c) => c.ftnAtt), 1);
    row("INT per attempt, raw", 184, [1.09, 2.04, 2.91, 2.99, 3.44, 2.54, 3.21], ratio(raw.cells, (c) => c.int, (c) => c.ftnAtt), 2);
    row("INT per aimed throw, raw", 185, [1.1, 2.07, 2.98, 3.07, 3.74, 3.0, 4.41], ratio(raw.cells, (c) => c.aimedInt, (c) => c.aimed), 2);
    row("INT per aimed throw, tick", 186, [0.93, 1.64, 2.74, 2.96, 3.42, 3.46, 4.16], ratio(tick.cells, (c) => c.aimedInt, (c) => c.aimed), 2);
    // :188: twice FTN in the 2.0-2.5 s bin, from the printed share, and the miss rule's limits.
    const twice = (grid: typeof raw): number => 2 * Number(((100 * grid.cells[1]!.pressured) / grid.cells[1]!.flagged).toFixed(1));
    add("twice FTN in the 2.0-2.5 s bin, tick", 188, 29.4, twice(tick), 1);
    add("twice FTN in the 2.0-2.5 s bin, raw", 188, 36.2, twice(raw), 1);
    expect([BIN_20_LIMIT.TICK, BIN_20_LIMIT.RAW]).toEqual([29.4, 36.2]);
    const shape = (keep: (d: RealDropback) => boolean): number[] => {
      const keys = ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", ">5.25"];
      const counts = new Map<string, number>();
      let m = 0;
      for (const d of table) {
        if (!ftnSeasons(d) || !d.attempt || d.timeToThrow === null || !keep(d)) continue;
        const t = tickAligned(d.timeToThrow);
        const k = t > 5 ? ">5.25" : String(t);
        counts.set(k, (counts.get(k) ?? 0) + 1);
        m += 1;
      }
      return keys.map((k) => (100 * (counts.get(k) ?? 0)) / m);
    };
    const ticks = ["0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0", ">5.25"];
    const clean = shape((d) => d.wasPressure === false);
    [0.5, 5.8, 14.3, 26.2, 23.4, 15.5, 7.9, 3.1, 1.2, 0.8, 1.1].forEach((v, i) => add(`release shape, clean attempts, ${ticks[i]!}`, 194, v, clean[i]!, 1));
    const all = shape(() => true);
    [0.4, 4.5, 12.1, 23.4, 23.0, 16.1, 8.9, 4.3, 2.2, 1.7, 3.2].forEach((v, i) => add(`release shape, all attempts, ${ticks[i]!}`, 195, v, all[i]!, 1));

    // §2.3 (:204) and §2.4's clean pocket (:246) and contacts (:290)
    add("throwaway per flagged dropback, all", 204, 3.54, pctOf(realThrowawayRate(real, "ALL")), 2);
    add("throwaway per flagged dropback, pressured", 204, 8.84, pctOf(realThrowawayRate(real, "PRESSURED")), 2);
    add("throwaway per flagged dropback, clean", 204, 1.25, pctOf(realThrowawayRate(real, "CLEAN")), 2);
    add("out of the pocket per 100 clean dropbacks", 246, 10.63, pctOf(realCleanOuts(real)), 2);
    const out = table.filter((d) => isFlagged(d) && d.wasPressure === false && d.outOfPocket === true);
    add("out of the pocket: scramble share", 246, 33.0, (100 * out.filter((d) => d.scramble).length) / out.length, 1);
    add("out of the pocket: throwaway share", 246, 4.7, (100 * out.filter((d) => d.throwaway === true).length) / out.length, 1);
    add("out of the pocket: aimed-throw share", 246, 62.3, pctOf(realOutOfPocketThrows(real)), 1);
    add("sack share of contacts in the pocket", 290, 45.5, pctOf(realSackShareOfContacts(real, "IN")), 1);
    add("sack share of contacts out of the pocket", 290, 43.9, pctOf(realSackShareOfContacts(real, "OUT")), 1);

    // §2.4's situation table (:228-232): dropbacks, the three rates with their binomial SEs, time to throw with its SE
    const sit = realSituation(real);
    const SITUATION: readonly [string, number, readonly [number, number, number, number, number, number, number, number, number]][] = [
      ["REST", 228, [32_296, 8.51, 0.28, 1.01, 0.07, 21.9, 0.4, 2.622, 0.006]],
      ["Q1Q3_END", 229, [2_338, 8.94, 1.06, 1.12, 0.26, 21.9, 1.5, 2.616, 0.024]],
      ["HALF_END_TRAILING", 230, [3_882, 10.09, 0.86, 2.59, 0.31, 21.8, 1.2, 2.719, 0.019]],
      ["HALF_END_LEVEL_OR_LEADING", 231, [2_273, 11.38, 1.25, 2.53, 0.39, 23.1, 1.7, 2.624, 0.025]],
    ];
    const binSe = (k: number, m: number): number => 100 * Math.sqrt(((k / m) * (1 - k / m)) / m);
    const releaseSe = situationReleaseSe(table);
    for (const [w, line, [db, prTw, prTwSe, clTw, clTwSe, p2s, p2sSe, ttt, tttSe]] of SITUATION) {
      const r = sit[w]!;
      add(`situation ${w}: dropbacks`, line, db, r.dropbacks, 0);
      add(`situation ${w}: pressured throwaways per 100 pressured`, line, prTw, (100 * r.pressuredThrowaways) / r.pressured, 2);
      add(`situation ${w}: its SE`, line, prTwSe, binSe(r.pressuredThrowaways, r.pressured), 2);
      add(`situation ${w}: clean throwaways per 100 clean`, line, clTw, (100 * r.cleanThrowaways) / r.clean, 2);
      add(`situation ${w}: its SE`, line, clTwSe, binSe(r.cleanThrowaways, r.clean), 2);
      add(`situation ${w}: P2S`, line, p2s, (100 * r.pressuredSacks) / r.pressured, 1);
      add(`situation ${w}: its SE`, line, p2sSe, binSe(r.pressuredSacks, r.pressured), 1);
      add(`situation ${w}: time to throw`, line, ttt, r.releaseTotal / r.attempts, 3);
      add(`situation ${w}: its SE`, line, tttSe, releaseSe[w] ?? Number.NaN, 3);
    }
    const rowsAll = Object.values(sit).reduce(
      (a, r) => ({ d: a.d + r.dropbacks, p: a.p + r.pressured, pt: a.pt + r.pressuredThrowaways, c: a.c + r.clean, ct: a.ct + r.cleanThrowaways, ps: a.ps + r.pressuredSacks, at: a.at + r.attempts, rt: a.rt + r.releaseTotal }),
      { d: 0, p: 0, pt: 0, c: 0, ct: 0, ps: 0, at: 0, rt: 0 },
    );
    add("situation all: dropbacks", 232, 40_982, rowsAll.d, 0);
    add("situation all: pressured throwaways", 232, 8.84, (100 * rowsAll.pt) / rowsAll.p, 2);
    add("situation all: clean throwaways", 232, 1.25, (100 * rowsAll.ct) / rowsAll.c, 2);
    add("situation all: P2S", 232, 22.0, (100 * rowsAll.ps) / rowsAll.p, 1);
    add("situation all: time to throw", 232, 2.631, rowsAll.rt / rowsAll.at, 3);

    const lines = checks.map((c) => {
      const ok = printedAs(c.measured, c.design, c.dp);
      const listed = K16_LISTED[c.label];
      return { c, ok, line: `  ${ok ? "reproduced" : listed === undefined ? "MISS" : "K16 (listed)"}: ${c.label}: design ${c.design.toFixed(c.dp)}, measured ${c.measured.toFixed(c.dp + 2)}${listed === undefined || ok ? "" : ` (${listed})`}` };
    });
    // eslint-disable-next-line no-console
    console.log(`ADR-089 step 0, the real sides against §2 (${String(checks.length)} figures):\n${lines.map((l) => l.line).join("\n")}`);
    const misses = lines.filter((l) => !l.ok).map((l) => l.c.label);
    expect(misses.sort(), "K16: a real side that does not reproduce its §2 figure stops C3 until the construct matches").toEqual(Object.keys(K16_LISTED).sort());
  }, LONG);
});

/** The binomial-style SE of the mean release time per situation window (sd / sqrt(n)), on flagged attempts with a release. */
function situationReleaseSe(table: readonly RealDropback[]): Record<string, number> {
  const byWindow = new Map<string, number[]>();
  for (const d of table) {
    if (!isFlagged(d) || !d.attempt || d.timeToThrow === null) continue;
    const w = realWindowOf(d);
    if (w === null) continue;
    const list = byWindow.get(w) ?? [];
    list.push(d.timeToThrow);
    byWindow.set(w, list);
  }
  const out: Record<string, number> = {};
  for (const [w, xs] of byWindow) {
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) * (x - mean), 0) / (xs.length - 1));
    out[w] = sd / Math.sqrt(xs.length);
  }
  return out;
}
