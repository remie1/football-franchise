/**
 * THE CARRY-FORWARD PROVENANCE STAMP AND THE TREND REFUSAL.
 *
 * `reports/baseline-0002.carry-forward.json` was written by a mechanism that works and was
 * silently stale within days: the corpus and sack-credit dispatches moved the engine, and nothing
 * in the file could say so. These tests are the guarantee that the next one cannot do that — that
 * a carry-forward records the tree it was produced against, and that a mismatched one produces
 * NO arrow, NO streak and NO ratchet, loudly.
 *
 * The last two describes are the ones worth reading twice:
 *
 *  - **the honesty of the stamp** — the commit is an assertion a human makes, so the tests pin
 *    down what the package does to keep that assertion from rotting: it is required at the type
 *    level, shape-checked, printed in the artefact, and read from the environment in exactly one
 *    file. Nothing in `src/` shells out to `git`, and this asserts it by scanning the tree.
 *  - **the retired artefact** — the stale file is gone, and a test says so, because "we deleted
 *    it" is a fact that decays the moment somebody restores it from history.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES, applyTunablePatch, type TunablePatch } from "@ff/engine";
import { emptyAccumulator } from "../src/metrics/collect.js";
import { makeEvidence } from "../src/ingest/eligibility.js";
import type { Season } from "../src/ingest/seasons.js";
import type { PbpRow } from "../src/ingest/sources/pbp.js";
import type { ScheduleRow } from "../src/ingest/sources/schedules.js";
import type { RealInput } from "../src/metrics/realInput.js";
import { blankCallerDiagnostics, type BatchProvenance } from "../src/harness/batch.js";
import type { FrozenCallerDiagnostics } from "../src/caller/frozen.js";
import { stableDigest } from "../src/harness/digest.js";
import {
  buildBaselineReport,
  carryForward,
  renderBaselineReport,
  withTrend,
} from "../src/report/baseline.js";
import {
  CARRY_FORWARD_FORMAT,
  EngineCommitError,
  assertEngineCommit,
  baselineIdentity,
  compareIdentity,
  decideTrend,
  mayInformArrow,
  mayRatchet,
  readCarryForward,
  type BaselineIdentity,
  type TrendDecision,
} from "../src/report/identity.js";
import { PREVIOUS_BASELINE, reconstructedTrend } from "../src/report/previous.js";
import { evaluateMetric, proposeRatchets, RATCHET_AFTER_REPORTS } from "../src/report/bands.js";
import { rate, relativeBand, type Metric, type MetricOutcome } from "../src/metrics/types.js";
import "../src/metrics/index.js";

const COMMIT_A = "1111111111111111111111111111111111111111";
const COMMIT_B = "2222222222222222222222222222222222222222";

/**
 * A tunables patch used ONLY to produce a second digest. No batch runs against it and no number
 * it produces is a proposal. `game.huddleSeconds` is chosen because it is not one of the frozen
 * dials — `pocket.sackWhenNoTarget` and `blitzPickup.freeRunnerArrivalSeconds` — and a test that
 * reaches for a frozen dial, even inertly, is a test somebody will later cite.
 *
 * ⚠ THE LIST WAS THREE AND IS NOW TWO. `passRush.blockerStructuralAdvantage` was named here as
 * frozen; ADR-027 unfroze it for measurement and ADR-028 moved it 15 → 0, coupled to `anchor`
 * becoming a real §7.1 blocker term. `game.huddleSeconds` remains the right choice for exactly
 * the reason it always was, so nothing below changes — but the reason had gone stale, and a
 * comment that names the wrong dials is worse than one that names none.
 * `freeRunnerArrivalSeconds` is the next sweep's target and is still frozen today.
 */
function probe(seconds: number): TunablePatch {
  return {
    tunableId: "game.huddleSeconds",
    currentValue: 32,
    proposedValue: seconds,
    evidence: "none — this patch exists to make a digest differ, and is never simulated",
    expectedEffect: "none; it is not applied to any batch",
  };
}

const provenance: BatchProvenance = {
  leagueId: "flat-60-32t",
  leagueProvenance: "FLAT_SYNTHETIC",
  leagueDescription: "32 teams, every attribute at 60",
  tunablesVersion: "DEFAULT_TUNABLES",
  tunablesDigest: stableDigest(DEFAULT_TUNABLES),
  callerVersion: "v1",
  callerFourthDownVersion: "v1",
  scheduleKind: "SYNTHETIC_ROUND_ROBIN",
  season: 2024,
  games: 496,
  seedDigest: "fnv1a:deadbeef#496",
  batchSeed: "baseline-0001",
  workers: 1,
  executorName: "in-process",
  availabilityMatched: false,
  teamWeeksWithAbsences: 0,
};

const caller: FrozenCallerDiagnostics = {
  ...blankCallerDiagnostics(),
  offensiveCalls: 100, defensiveCalls: 100, passCalls: 57, runCalls: 43,
  conceptRedraws: 2, fourthDownGo: 3, fourthDownPunt: 8, fourthDownFieldGoal: 4,
  backoff: { FULL: 60 },
};

function realInput(eligibility: "TUNING" | "HELD_OUT" = "TUNING"): RealInput<"TUNING" | "HELD_OUT"> {
  const seasons = [(eligibility === "TUNING" ? 2023 : 2025) as Season];
  return {
    eligibility,
    seasons,
    pbp: makeEvidence<PbpRow, "TUNING" | "HELD_OUT">(eligibility, [], seasons, []),
    schedules: makeEvidence<ScheduleRow, "TUNING" | "HELD_OUT">(eligibility, [], seasons, []),
  };
}

const testMetric: Metric = {
  id: "test_metric",
  tier: 1,
  definition: "a test metric with a definition long enough to print",
  unit: "%",
  toleranceBand: relativeBand(0.15),
  computeFromEvents: (): MetricOutcome => rate(50, 100),
  computeFromReal: (): MetricOutcome => rate(50, 100),
};

function reportAt(options: {
  readonly id?: string;
  readonly commit?: string;
  readonly provenance?: BatchProvenance;
  readonly trend?: TrendDecision;
  readonly eligibility?: "TUNING" | "HELD_OUT";
}) {
  const built = buildBaselineReport({
    id: options.id ?? "baseline-test",
    engineCommit: options.commit ?? COMMIT_A,
    accumulator: emptyAccumulator(),
    provenance: options.provenance ?? provenance,
    caller,
    real: realInput(options.eligibility ?? "TUNING"),
    metrics: [testMetric],
    ...(options.trend === undefined ? {} : { trend: options.trend }),
  });
  return withTrend(built);
}

function identityAt(commit: string, over: Partial<BatchProvenance> = {}): BaselineIdentity {
  return baselineIdentity({
    provenance: { ...provenance, ...over },
    engineCommit: commit,
    eligibility: "TUNING",
    realSeasons: [2023],
  });
}

// ---------------------------------------------------------------------------

describe("the engine commit", () => {
  it("accepts a git object name and normalises case", () => {
    expect(assertEngineCommit("a1b2c3d")).toBe("a1b2c3d");
    expect(assertEngineCommit("  A1B2C3D4E5  ")).toBe("a1b2c3d4e5");
    expect(assertEngineCommit(`${COMMIT_A}-dirty`)).toBe(`${COMMIT_A}-dirty`);
  });

  it("refuses anything that names something which moves", () => {
    for (const bad of ["", "   ", "HEAD", "main", "latest", "unknown", "v1.2.3", "abc"]) {
      expect(() => assertEngineCommit(bad), bad).toThrow(EngineCommitError);
    }
  });

  it("says how to produce one, in the error", () => {
    expect(() => assertEngineCommit("HEAD")).toThrow(/git rev-parse HEAD/);
  });
});

describe("the carry-forward file", () => {
  it("stamps the identity of the run that produced it", () => {
    const file = carryForward(reportAt({ id: "baseline-0003" }));
    expect(file.format).toBe(CARRY_FORWARD_FORMAT);
    expect(file.identity.engineCommit).toBe(COMMIT_A);
    expect(file.identity.tunablesVersion).toBe("DEFAULT_TUNABLES");
    expect(file.identity.tunablesDigest).toBe(stableDigest(DEFAULT_TUNABLES));
    expect(file.identity.leagueProvenance).toBe("FLAT_SYNTHETIC");
    expect(file.identity.realSeasons).toEqual([2023]);
    // Recorded, and deliberately not part of the identity.
    expect(file.context.seedDigest).toBe("fnv1a:deadbeef#496");
    expect(file.context.games).toBe(496);
  });

  it("is a pure function of the report — no timestamp, no host, byte-identical twice", () => {
    const report = reportAt({});
    const a = JSON.stringify(carryForward(report), null, 2);
    const b = JSON.stringify(carryForward(report), null, 2);
    expect(a).toBe(b);
    expect(a).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("round-trips through the reader", () => {
    const file = carryForward(reportAt({ id: "baseline-0003" }));
    const read = readCarryForward(JSON.parse(JSON.stringify(file)) as unknown);
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.value.identity).toEqual(file.identity);
  });
});

describe("what identifies a comparable baseline", () => {
  it("accepts a predecessor that matches on every identity field", () => {
    const file = carryForward(reportAt({ id: "baseline-0003" }));
    const decision = decideTrend(file, identityAt(COMMIT_A));
    expect(decision.kind).toBe("ACCEPTED");
    expect(mayInformArrow(decision)).toBe(true);
    expect(mayRatchet(decision)).toBe(true);
  });

  /**
   * The justification for leaving seeds and n OUT of the identity, asserted rather than argued.
   * Two seed lists over the same tree and the same league are two samples of ONE population; the
   * 95% CIs printed beside every row are how a reader judges the difference. Refusing here would
   * forbid the one trend that is unambiguously legitimate — the same batch re-run larger, which
   * backlog 22c positively encourages.
   */
  it("does NOT refuse a different seed list, batch seed or game count", () => {
    const file = carryForward(reportAt({ id: "baseline-0003" }));
    const later = identityAt(COMMIT_A);
    expect(
      decideTrend(file, later).kind,
      "same tree, more games, different seeds — still the same estimand",
    ).toBe("ACCEPTED");
    const bigger = baselineIdentity({
      provenance: { ...provenance, seedDigest: "fnv1a:00000000#4960", games: 4960, batchSeed: "x" },
      engineCommit: COMMIT_A,
      eligibility: "TUNING",
      realSeasons: [2023],
    });
    expect(decideTrend(file, bigger).kind).toBe("ACCEPTED");
  });

  it("refuses across a commit boundary, and names the field and both sides", () => {
    const file = carryForward(reportAt({ id: "baseline-0002", commit: COMMIT_A }));
    const decision = decideTrend(file, identityAt(COMMIT_B));
    expect(decision.kind).toBe("REFUSED");
    if (decision.kind !== "REFUSED") return;
    expect(decision.mismatches.map((m) => m.field)).toEqual(["engineCommit"]);
    expect(decision.message).toContain("TREND REFUSED");
    expect(decision.message).toContain("baseline-0002");
    expect(decision.message).toContain(COMMIT_A);
    expect(decision.message).toContain(COMMIT_B);
    expect(decision.message).toContain("code that is not the code running now");
    // Self-explaining: it says what to do instead.
    expect(decision.message).toContain("Re-run the predecessor's batch configuration");
    expect(decision.message).toContain("attribution.test.ts");
  });

  it("refuses across a tunables patch, and across a caller change", () => {
    const file = carryForward(reportAt({ id: "p" }));
    const patched = applyTunablePatch(DEFAULT_TUNABLES, probe(33));
    const other = identityAt(COMMIT_A, {
      tunablesVersion: "probe-1",
      tunablesDigest: stableDigest(patched),
    });
    const decision = decideTrend(file, other);
    expect(decision.kind).toBe("REFUSED");
    if (decision.kind === "REFUSED") {
      expect(decision.mismatches.map((m) => m.field).sort()).toEqual([
        "tunablesDigest",
        "tunablesVersion",
      ]);
    }
    expect(decideTrend(file, identityAt(COMMIT_A, { callerVersion: "v2" })).kind).toBe("REFUSED");
    expect(
      decideTrend(file, identityAt(COMMIT_A, { callerFourthDownVersion: "v2" })).kind,
    ).toBe("REFUSED");
  });

  /**
   * The measured half of the stamp. `tunablesVersion` is a label a caller asserts and `runBatch`
   * already refuses an unnamed patch — but no refusal can catch two reports both labelled
   * `DEFAULT_TUNABLES` while `DEFAULT_TUNABLES` itself moved underneath them. A label cannot
   * detect a change to the thing it labels.
   */
  it("catches a tunables change that the version LABEL failed to record", () => {
    const file = carryForward(reportAt({ id: "p" }));
    const drifted = applyTunablePatch(DEFAULT_TUNABLES, probe(41));
    const lying = identityAt(COMMIT_A, { tunablesDigest: stableDigest(drifted) });
    const decision = decideTrend(file, lying);
    expect(decision.kind).toBe("REFUSED");
    if (decision.kind !== "REFUSED") return;
    expect(decision.mismatches.map((m) => m.field)).toEqual(["tunablesDigest"]);
    expect(decision.mismatches[0]?.why).toContain("the label is lying");
  });

  it("refuses across a league, a schedule or an availability change", () => {
    const file = carryForward(reportAt({ id: "p" }));
    expect(decideTrend(file, identityAt(COMMIT_A, { leagueId: "archetype-32t" })).kind).toBe("REFUSED");
    expect(decideTrend(file, identityAt(COMMIT_A, { leagueProvenance: "DESIGNED_ARCHETYPE" })).kind).toBe("REFUSED");
    expect(decideTrend(file, identityAt(COMMIT_A, { season: 2023 })).kind).toBe("REFUSED");
    expect(decideTrend(file, identityAt(COMMIT_A, { availabilityMatched: true })).kind).toBe("REFUSED");
  });

  /**
   * §7, the sacred season, reaching the trend layer. The sim column would trend fine across an
   * eligibility change — but `comfortableStreak` is a verdict against the REAL side, and a streak
   * earned against 2025 is one report away from a permanent band tightening.
   */
  it("refuses a predecessor computed against different real evidence", () => {
    const file = carryForward(reportAt({ id: "p" }));
    const heldOut = baselineIdentity({
      provenance,
      engineCommit: COMMIT_A,
      eligibility: "HELD_OUT",
      realSeasons: [2025],
    });
    const decision = decideTrend(file, heldOut);
    expect(decision.kind).toBe("REFUSED");
    if (decision.kind !== "REFUSED") return;
    expect(decision.mismatches.map((m) => m.field).sort()).toEqual(["eligibility", "realSeasons"]);
    expect(decision.mismatches.find((m) => m.field === "eligibility")?.why).toContain("§7");
  });

  /**
   * ★ The sharpest rule in the module. ★ Two runs stamped `<hash>-dirty` may have been produced
   * by two different pieces of code, because nothing records which uncommitted edits were in the
   * tree. String equality would say "comparable" in exactly the situation where a developer is
   * most likely to be mid-change.
   */
  it("never compares a dirty tree equal — not even to itself", () => {
    const dirty = `${COMMIT_A}-dirty`;
    const mismatches = compareIdentity(identityAt(dirty), identityAt(dirty));
    expect(mismatches.map((m) => m.field)).toEqual(["engineCommit"]);
    expect(mismatches[0]?.why).toContain("uncommitted edits");
    const file = carryForward(reportAt({ id: "p", commit: dirty }));
    expect(decideTrend(file, identityAt(dirty)).kind).toBe("REFUSED");
  });

  it("refuses a file that predates the provenance stamp, before reading its numbers", () => {
    // The shape of the deleted `reports/baseline-0002.carry-forward.json`, exactly.
    const legacy = {
      id: "baseline-0002",
      sim: { sack_rate: 0.13585572356193928 },
      comfortableStreak: { sack_rate: 0 },
    };
    const decision = decideTrend(legacy, identityAt(COMMIT_A));
    expect(decision.kind).toBe("REFUSED");
    if (decision.kind !== "REFUSED") return;
    expect(decision.previousId).toBe("baseline-0002");
    expect(decision.message).toContain("not a usable carry-forward");
    expect(decision.message).toContain("format");
    expect(decision.message).toContain("baseline-0002.carry-forward.json");
  });

  it("refuses a malformed file rather than throwing away the batch that just ran", () => {
    for (const bad of [42, "text", [], {}, { id: "x" }, { id: "x", format: CARRY_FORWARD_FORMAT }]) {
      const decision = decideTrend(bad, identityAt(COMMIT_A));
      expect(decision.kind, JSON.stringify(bad)).toBe("REFUSED");
    }
  });

  it("has no predecessor at all when none is supplied", () => {
    expect(decideTrend(undefined, identityAt(COMMIT_A)).kind).toBe("NONE");
  });
});

describe("what a refused predecessor may do", () => {
  const stale = carryForward(reportAt({ id: "baseline-0002", commit: COMMIT_A }));

  it("produces no trend arrow", () => {
    const refused = decideTrend(stale, identityAt(COMMIT_B));
    const report = reportAt({ commit: COMMIT_B, trend: refused });
    for (const e of report.evaluations) expect(e.previousSim).toBeUndefined();
    expect(mayInformArrow(refused)).toBe(false);
  });

  it("seeds no comfort streak and can therefore ratchet no band", () => {
    // A predecessor one report short of a ratchet, refused: the streak must restart at 1.
    const primed = {
      ...stale,
      comfortableStreak: { test_metric: RATCHET_AFTER_REPORTS },
    };
    const refused = decideTrend(primed, identityAt(COMMIT_B));
    expect(mayRatchet(refused)).toBe(false);
    const report = reportAt({ commit: COMMIT_B, trend: refused });
    expect(report.ratchetProposals).toHaveLength(0);
    expect(report.comfortableStreak["test_metric"]).toBe(1);
  });

  /**
   * The precedent, generalised. `previous.ts`'s reconstruction may inform an arrow and may never
   * ratchet a band; a MISMATCHED predecessor does neither. Both halves asserted together so the
   * ordering is visible.
   */
  it("does strictly less than a RECONSTRUCTED predecessor, which does less than an ACCEPTED one", () => {
    const accepted = decideTrend(stale, identityAt(COMMIT_A));
    // The reconstruction is a v1 figure set, so it may inform an arrow only for a v1 run.
    const reconstructed = reconstructedTrend(identityAt(COMMIT_A, { callerVersion: "v1/v1" }));
    const refused = decideTrend(stale, identityAt(COMMIT_B));

    expect([mayInformArrow(accepted), mayRatchet(accepted)]).toEqual([true, true]);
    expect([mayInformArrow(reconstructed), mayRatchet(reconstructed)]).toEqual([true, false]);
    expect([mayInformArrow(refused), mayRatchet(refused)]).toEqual([false, false]);

    // And the reconstruction's own belt-and-braces still holds.
    expect(PREVIOUS_BASELINE.comfortableStreak).toEqual({});
    const comfortable = evaluateMetric(testMetric, rate(50, 100), rate(50, 100));
    expect(proposeRatchets([comfortable], PREVIOUS_BASELINE.comfortableStreak, "r1")).toHaveLength(0);
  });

  /**
   * ★ ADR-024 / ADR-025 — THE DEFAULT INVOCATION IS THE DANGEROUS ONE. ★
   *
   * Running the baseline tool with no `FF_BASELINE_PREV` falls back to `previous.ts`'s
   * reconstruction, which is a set of figures produced by the caller that could not be wrong.
   * Handing them to a v2 run would print a full column of confident arrows measuring the distance
   * between two different denominators — and `sack_rate +0.7pp` renders exactly like progress.
   *
   * This is the one door `identity.ts`'s adjudication did not cover, because a reconstruction
   * never went through `compareIdentity` at all.
   */
  it("refuses the reconstruction for an ADR-024 v2 run, naming callerVersion", () => {
    const v2 = reconstructedTrend(identityAt(COMMIT_A, { callerVersion: "v2/v1" }));
    expect(v2.kind).toBe("REFUSED");
    expect(mayInformArrow(v2)).toBe(false);
    expect(mayRatchet(v2)).toBe(false);
    if (v2.kind === "REFUSED") {
      expect(v2.mismatches.map((m) => m.field)).toEqual(["callerVersion"]);
      expect(v2.message).toContain("callerVersion");
    }
  });

  /**
   * The same refusal from the OTHER direction, on a real pair of carry-forwards: two runs that
   * agree on every field of identity except the caller. This is the assertion ADR-024's
   * comparability paragraph asks for — *"a v2 caller invalidates the trend column for every row
   * it touches, which is precisely why the caller is frozen"* — made mechanical.
   */
  it("refuses a v1 carry-forward as a predecessor for a v2 run, and vice versa", () => {
    const v1Identity = identityAt(COMMIT_A, { callerVersion: "v1/v1" });
    const v2Identity = identityAt(COMMIT_A, { callerVersion: "v2/v1" });
    const v1File = {
      format: CARRY_FORWARD_FORMAT,
      id: "baseline-final-v1",
      identity: v1Identity,
      context: { seedDigest: "fnv1a:020c1dcb#496", batchSeed: "baseline-0001", games: 496 },
      sim: { test_metric: 0.5 },
      comfortableStreak: {},
    };
    const decision = decideTrend(v1File, v2Identity);
    expect(decision.kind).toBe("REFUSED");
    if (decision.kind === "REFUSED") {
      expect(decision.mismatches.map((m) => m.field)).toEqual(["callerVersion"]);
    }
    // Symmetric: identity is a tuple equality, not a direction.
    const back = decideTrend({ ...v1File, identity: v2Identity }, v1Identity);
    expect(back.kind).toBe("REFUSED");
  });
});

describe("the refusal is loud and self-explaining", () => {
  const refused = decideTrend(
    carryForward(reportAt({ id: "baseline-0002", commit: COMMIT_A })),
    identityAt(COMMIT_B, { tunablesVersion: "probe-1" }),
  );
  const rendered = renderBaselineReport(reportAt({ commit: COMMIT_B, trend: refused }));

  it("prints a Trend section with the mismatched fields and both sides", () => {
    expect(rendered).toContain("## Trend");
    expect(rendered).toContain("TREND REFUSED");
    expect(rendered).toContain("| field | previous | this run | why it matters |");
    expect(rendered).toContain("`engineCommit`");
    expect(rendered).toContain("`tunablesVersion`");
    expect(rendered).toContain(COMMIT_A);
    expect(rendered).toContain(COMMIT_B);
  });

  /**
   * The whole point. A report that met a mismatched carry-forward and rendered em dashes would be
   * indistinguishable from a report that never had a predecessor — the silent-wrongness class
   * this rule exists to prevent, wearing the costume of a blank cell.
   */
  it("never renders a refusal as an em dash", () => {
    // The tier tables have ten columns; the band table's row for the same metric has five.
    const rows = rendered
      .split("\n")
      .filter((l) => l.startsWith("| `test_metric`") && l.split("|").length === 12);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).toContain("**refused**");
    expect(rendered).toContain("an em dash means");
  });

  it("prints the engine commit and the measured tunables digest in the provenance table", () => {
    expect(rendered).toContain("| engine commit |");
    expect(rendered).toContain(`\`${COMMIT_B}\``);
    expect(rendered).toContain(stableDigest(DEFAULT_TUNABLES));
  });

  it("warns in the artefact when the run itself came from a dirty tree", () => {
    const dirty = renderBaselineReport(reportAt({ commit: `${COMMIT_A}-dirty` }));
    expect(dirty).toContain("PRODUCED FROM A DIRTY WORKING TREE");
    expect(dirty).toContain("will be REFUSED by every successor");
  });

  it("says so when there is no predecessor, and when there is an accepted one", () => {
    expect(renderBaselineReport(reportAt({}))).toContain("No predecessor.");
    const accepted = decideTrend(
      carryForward(reportAt({ id: "baseline-0002" })),
      identityAt(COMMIT_A),
    );
    const ok = renderBaselineReport(reportAt({ trend: accepted }));
    expect(ok).toContain("matches this run on every field of baseline identity");
    expect(ok).toContain("a band may ratchet");
  });
});

// ---------------------------------------------------------------------------

/**
 * HOW THE COMMIT STAYS HONEST.
 *
 * It is an assertion a human makes at the command line, and nothing in a pure library can verify
 * it. So the guarantees are the ones that CAN be enforced, and each is enforced here rather than
 * described in a comment somewhere:
 *
 *   required          `engineCommit` is a required field, so `tsc` finds every call site that
 *                     forgets it (ADR-012's precedent — a required `tunables` parameter found
 *                     seven silent module-load-time reads that an optional one would have hidden).
 *   shape-checked     it must look like a git object name; `HEAD`, `main` and "" are refused.
 *   single entry      `FF_ENGINE_COMMIT` is read in exactly one file, the baseline tool.
 *   no subprocess     nothing in `src/` imports `child_process` or calls `execSync`. A library
 *                     that shells out is a library a worker thread cannot run, and it would move
 *                     the impurity from one visible command into forty invisible ones.
 *   visible           the commit prints in the report's provenance table and in the carry-forward,
 *                     so a wrong value is wrong in public rather than wrong in a variable.
 */
describe("the honesty of the stamp", () => {
  const srcDir = resolve(import.meta.dirname, "..", "src");

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(path));
      else if (entry.name.endsWith(".ts")) out.push(path);
    }
    return out;
  }

  const files = walk(srcDir);

  it("scans a non-trivial source tree (so a passing scan means something)", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it("never shells out to git — or to anything — from library code", () => {
    const needles = ["child" + "_process", "exec" + "Sync", "spawn" + "Sync", "exec" + "FileSync"];
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const needle of needles) if (text.includes(needle)) offenders.push(`${file}: ${needle}`);
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("reads FF_ENGINE_COMMIT in exactly one place, and that place is the tool", () => {
    const needle = "process.env[" + '"FF_ENGINE_COMMIT"' + "]";
    const inSrc = files.filter((f) => readFileSync(f, "utf8").includes(needle));
    expect(inSrc, "library code must not read the environment for its own provenance").toEqual([]);

    const toolDir = resolve(import.meta.dirname);
    const readers = readdirSync(toolDir)
      .filter((n) => n.endsWith(".ts"))
      .filter((n) => readFileSync(join(toolDir, n), "utf8").includes(needle));
    expect(readers).toEqual(["baselineTool.test.ts"]);
  });
});

describe("the retired artefact", () => {
  const reports = resolve(import.meta.dirname, "..", "reports");

  /**
   * "We deleted it" decays the moment somebody restores it from history, and the file is a loaded
   * gun: `FF_BASELINE_PREV=reports/baseline-0002.carry-forward.json` is the obvious next command
   * for anyone who finds it. `decideTrend` would refuse it — but a guard that only stops a
   * misfire is not a reason to leave the gun in the drawer.
   */
  it("has no baseline-0002 carry-forward, because it is known-stale", () => {
    expect(existsSync(join(reports, "baseline-0002.carry-forward.json"))).toBe(false);
  });

  it("keeps its numbers under a name that cannot be mistaken for a predecessor", () => {
    const path = join(reports, "baseline-0002.superseded.json");
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    // Same numbers, still citable as evidence.
    const record = parsed as { sim: Record<string, number>; _what_this_is: string[] };
    expect(record.sim["sack_rate"]).toBeCloseTo(0.13585572356193928, 12);
    expect(record._what_this_is.join(" ")).toContain("DO NOT PASS THIS FILE TO FF_BASELINE_PREV");
    // And refused anyway, by the same funnel, if somebody does.
    expect(decideTrend(parsed, identityAt(COMMIT_A)).kind).toBe("REFUSED");
  });

  it("leaves no carry-forward in reports/ that the current mechanism would refuse", () => {
    const stale: string[] = [];
    for (const name of readdirSync(reports)) {
      if (!name.endsWith(".carry-forward.json")) continue;
      const raw = JSON.parse(readFileSync(join(reports, name), "utf8")) as unknown;
      if (!readCarryForward(raw).ok) stale.push(name);
    }
    expect(stale, `unreadable carry-forwards: ${stale.join(", ")}`).toEqual([]);
  });
});
