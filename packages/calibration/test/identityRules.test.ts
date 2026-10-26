/**
 * ADR-089 step 0 — THE RULES NAME IN THE BASELINE IDENTITY AND THE BATCH PROVENANCE (plan §4, O11).
 *
 *  1. baseline-0009's carry-forward still reads under the strict reader, and has no `engineRules`
 *     (K2-09), and a legacy identity built today is byte for byte the identity it recorded.
 *  2. Absent equals an explicit `legacy`.
 *  3. A `pocket-1.s1` predecessor against a legacy run is REFUSED by `decideTrend`, and so is the
 *     same bundle over a different overlay digest.
 *  4. A malformed value is refused as a malformed carry-forward.
 *  5. The batch: `engineRules: "legacy"` gives the same accumulator and provenance as no name, and a
 *     legacy caller leaves `config.tunables` undefined (N8, critique-2 F7). ADR-089 step 1 (plan §7.2
 *     items 3 and 11, rewriting step 0's ":179-182"): `engineRules: "pocket-1.s1"` plays the design
 *     bundle and records its name and overlay digest; a `pocket-1.s1` name with unstamped tunables,
 *     a stamped bundle under `legacy`, and a bundle patched after stamping are each refused with their
 *     own message before a game is played; an arm bundle (a patched base, then the overlay) records
 *     its own digest. A name this build does not have is refused before a game is played.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyTunablePatch, DEFAULT_TUNABLES } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runBatch, type BatchExecutor, type BatchProvenance } from "../src/harness/batch.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { EngineRulesError, POCKET_1_S1_DIGEST, POCKET_1_S1_OVERLAY, rulesTunables, withOverlay } from "../src/pocket/rules.js";
import {
  baselineIdentity,
  compareIdentity,
  decideTrend,
  readCarryForward,
  type BaselineIdentity,
} from "../src/report/identity.js";

const BASELINE_0009 = join(import.meta.dirname, "..", "reports", "baseline-0009.carry-forward.json");
const raw0009 = (): Record<string, unknown> => JSON.parse(readFileSync(BASELINE_0009, "utf8")) as Record<string, unknown>;

/** baseline-0009's run, as a provenance: the fields its identity recorded. */
const provenance0009: BatchProvenance = {
  leagueId: "flat-60-32t",
  leagueProvenance: "FLAT_SYNTHETIC",
  leagueDescription: "32 teams, every attribute at 60",
  tunablesVersion: "DEFAULT_TUNABLES",
  tunablesDigest: "fnv1a:395a9ae2",
  callerVersion: "v7/v1",
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
const COMMIT_0009 = "d1f0ef6f6f905f27768cefe7bd6203a162097542";

const identityOf = (over: Partial<BatchProvenance> = {}): BaselineIdentity =>
  baselineIdentity({ provenance: { ...provenance0009, ...over }, engineCommit: COMMIT_0009, eligibility: "TUNING", realSeasons: [2022, 2023, 2024] });

/** baseline-0009's file with its identity edited. */
const edited0009 = (identity: Record<string, unknown>): Record<string, unknown> => {
  const raw = raw0009();
  return { ...raw, identity: { ...(raw["identity"] as Record<string, unknown>), ...identity } };
};

describe("baseline-0009 under ADR-089's identity (K2-09)", () => {
  it("reads under the strict reader and has no engineRules", () => {
    const raw = raw0009();
    expect("engineRules" in (raw["identity"] as object)).toBe(false);
    expect("engineRulesDigest" in (raw["identity"] as object)).toBe(false);
    const read = readCarryForward(raw);
    expect(read.ok).toBe(true);
    if (!read.ok) throw new Error(read.problem);
    expect("engineRules" in read.value.identity).toBe(false);
    expect(read.value.id).toBe("baseline-0009");
  });

  it("a legacy identity built today is byte for byte the identity baseline-0009 recorded, and it trends against it", () => {
    for (const legacy of [identityOf(), identityOf({ engineRules: "legacy" })]) {
      expect(JSON.stringify(legacy)).toBe(JSON.stringify(raw0009()["identity"]));
      expect(decideTrend(raw0009(), legacy).kind).toBe("ACCEPTED");
    }
  });
});

describe("absent rules are legacy", () => {
  it("an explicit legacy compares equal to absent, both ways", () => {
    const absent = identityOf();
    const explicit: BaselineIdentity = { ...absent, engineRules: "legacy" };
    expect(compareIdentity(absent, explicit)).toEqual([]);
    expect(compareIdentity(explicit, absent)).toEqual([]);
    expect(decideTrend(edited0009({ engineRules: "legacy" }), absent).kind).toBe("ACCEPTED");
  });

  it("the identity writes the name only when it is not legacy, with its digest when there is one", () => {
    expect(Object.keys(identityOf({ engineRules: "legacy", engineRulesDigest: "fnv1a:00000000" }))).not.toContain("engineRules");
    const arm = identityOf({ engineRules: "pocket-1.s1", engineRulesDigest: "fnv1a:1234abcd" });
    expect(arm.engineRules).toBe("pocket-1.s1");
    expect(arm.engineRulesDigest).toBe("fnv1a:1234abcd");
    expect(Object.keys(arm).slice(-2)).toEqual(["engineRules", "engineRulesDigest"]);
  });
});

describe("another bundle is another system", () => {
  it("a pocket-1.s1 predecessor against an absent (legacy) run is REFUSED on engineRules", () => {
    const decision = decideTrend(edited0009({ engineRules: "pocket-1.s1", engineRulesDigest: "fnv1a:1234abcd" }), identityOf());
    expect(decision.kind).toBe("REFUSED");
    if (decision.kind !== "REFUSED") throw new Error("unreachable");
    expect(decision.mismatches.map((m) => [m.field, m.previous, m.current])).toEqual([
      ["engineRules", "pocket-1.s1", "legacy"],
      ["engineRulesDigest", "fnv1a:1234abcd", "(no overlay)"],
    ]);
    expect(decision.message).toContain("engineRules");
    expect(decision.message).toContain("ADR-089 §9");
  });

  it("the same bundle over a different overlay digest is REFUSED on engineRulesDigest", () => {
    const decision = decideTrend(
      edited0009({ engineRules: "pocket-1.s1", engineRulesDigest: "fnv1a:1234abcd" }),
      identityOf({ engineRules: "pocket-1.s1", engineRulesDigest: "fnv1a:9999ffff" }),
    );
    expect(decision.kind).toBe("REFUSED");
    if (decision.kind !== "REFUSED") throw new Error("unreachable");
    expect(decision.mismatches.map((m) => m.field)).toEqual(["engineRulesDigest"]);
    const same = decideTrend(
      edited0009({ engineRules: "pocket-1.s1", engineRulesDigest: "fnv1a:1234abcd" }),
      identityOf({ engineRules: "pocket-1.s1", engineRulesDigest: "fnv1a:1234abcd" }),
    );
    expect(same.kind).toBe("ACCEPTED");
  });
});

describe("a malformed rules value", () => {
  for (const [label, identity, field] of [
    ["a number", { engineRules: 5 }, "engineRules"],
    ["an empty name", { engineRules: "" }, "engineRules"],
    ["a null", { engineRules: null }, "engineRules"],
    ["a numeric digest", { engineRules: "pocket-1.s1", engineRulesDigest: 7 }, "engineRulesDigest"],
  ] as const) {
    it(`is refused as a malformed carry-forward: ${label}`, () => {
      const raw = edited0009(identity);
      const read = readCarryForward(raw);
      expect(read.ok).toBe(false);
      if (read.ok) throw new Error("unreachable");
      expect(read.problem).toContain(`identity.${field}`);
      const decision = decideTrend(raw, identityOf());
      expect(decision.kind).toBe("REFUSED");
      if (decision.kind !== "REFUSED") throw new Error("unreachable");
      expect(decision.mismatches).toEqual([]);
      expect(decision.message).toContain("not a usable carry-forward");
    });
  }
});

describe("the batch: the rules reach the engine through the tunables (ADR-089 step 1)", () => {
  const league = buildFlatLeague({ teams: 2 });
  const [home, away] = indexLeague(league).teamIds();
  const config = {
    league,
    schedule: { kind: "SYNTHETIC_PAIR", home: home!, away: away!, games: 2, season: 2024 } as const,
    seeds: { batchSeed: "adr-089:identity-rules" },
    playCalling: { tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN },
  };

  it("two games named legacy give the same accumulator and provenance as two with no name", async () => {
    const plain = await runBatch(config);
    const legacy = await runBatch({ ...config, engineRules: "legacy" });
    expect(plain.provenance.games).toBe(2);
    expect(JSON.stringify(legacy.accumulator)).toBe(JSON.stringify(plain.accumulator));
    expect(JSON.stringify(legacy.provenance)).toBe(JSON.stringify(plain.provenance));
    expect("engineRules" in legacy.provenance).toBe(false);
    expect(legacy.provenance.tunablesDigest).toBe(stableDigest(DEFAULT_TUNABLES));
  });

  const neverRuns: BatchExecutor = {
    name: "never",
    workers: 1,
    run: () => Promise.reject(new Error("a game was played")),
  };

  it("refuses a name this build does not have before a game is played", async () => {
    for (const name of ["pocket-1", "pocket-1.s9", "default", ""]) {
      await expect(runBatch({ ...config, engineRules: name, executor: neverRuns })).rejects.toThrow(EngineRulesError);
    }
    await expect(runBatch({ ...config, engineRules: "pocket-1.s9", executor: neverRuns })).rejects.toThrow(/^runBatch: engine rules "pocket-1.s9" are not in this build/);
    // The stub does run when the name is legacy or pocket-1.s1, so the refusals above are the rules
    // check, not the stub.
    await expect(runBatch({ ...config, engineRules: "legacy", executor: neverRuns })).rejects.toThrow("a game was played");
    await expect(runBatch({ ...config, engineRules: "pocket-1.s1", executor: neverRuns })).rejects.toThrow("a game was played");
  });

  it("pocket-1.s1 with no tunables plays the design bundle, and records its name and overlay digest", async () => {
    const pocket = await runBatch({ ...config, engineRules: "pocket-1.s1" });
    expect(pocket.provenance.games).toBe(2);
    expect(pocket.provenance.engineRules).toBe("pocket-1.s1");
    expect(pocket.provenance.engineRulesDigest).toBe(POCKET_1_S1_DIGEST);
    // The digest of the tunables ACTUALLY RUN is the bundle's, so the bundle is what was passed.
    expect(pocket.provenance.tunablesDigest).toBe(stableDigest(rulesTunables("pocket-1.s1")));
    expect(pocket.provenance.tunablesDigest).not.toBe(stableDigest(DEFAULT_TUNABLES));
    // The base the overlay sits on: no patch was named, so the label is the default's.
    expect(pocket.provenance.tunablesVersion).toBe("DEFAULT_TUNABLES");
    expect(Object.keys(pocket.provenance).slice(-2)).toEqual(["engineRules", "engineRulesDigest"]);
  });

  it("refuses a pocket-1.s1 name over unstamped tunables, with its own message, before a game is played", async () => {
    const patched = applyTunablePatch(DEFAULT_TUNABLES, { tunableId: "qb.timeBudget.baseSeconds", currentValue: 2.5, proposedValue: 4.5, evidence: "test", expectedEffect: "test" });
    for (const tunables of [DEFAULT_TUNABLES, patched]) {
      await expect(runBatch({ ...config, engineRules: "pocket-1.s1", tunables, tunablesVersion: "t", executor: neverRuns })).rejects.toThrow(
        "runBatch: the run names engine rules pocket-1.s1, but the tunables carry no rules stamp; a bundle is made by withOverlay or rulesTunables",
      );
    }
  });

  it("refuses a stamped bundle under legacy, and a bundle patched after stamping, before a game is played", async () => {
    const bundle = rulesTunables("pocket-1.s1");
    await expect(runBatch({ ...config, tunables: bundle, tunablesVersion: "t", executor: neverRuns })).rejects.toThrow(
      "runBatch: the run names engine rules legacy, but the tunables carry the rules stamp pocket-1.s1",
    );
    const late = applyTunablePatch(bundle, { tunableId: "passRush.beatClock.thetaSeconds", currentValue: 11, proposedValue: 9, evidence: "test", expectedEffect: "test" });
    await expect(runBatch({ ...config, engineRules: "pocket-1.s1", tunables: late, tunablesVersion: "t", executor: neverRuns })).rejects.toThrow(/a dial changed after stamping$/);
  });

  it("an arm bundle (a patched base, then the overlay) is accepted and records its own digest", async () => {
    const base = applyTunablePatch(DEFAULT_TUNABLES, { tunableId: "qb.timeBudget.baseSeconds", currentValue: 2.5, proposedValue: 4.5, evidence: "test", expectedEffect: "test" });
    const arm = withOverlay(base, "pocket-1.s1", POCKET_1_S1_OVERLAY);
    const one = { ...config, schedule: { ...config.schedule, games: 1 } };
    const r = await runBatch({ ...one, engineRules: "pocket-1.s1", tunables: arm, tunablesVersion: "hold-arm" });
    expect(r.provenance.engineRules).toBe("pocket-1.s1");
    expect(r.provenance.engineRulesDigest).toBe(arm.engineRules!.overlayDigest);
    expect(r.provenance.engineRulesDigest).not.toBe(POCKET_1_S1_DIGEST);
    expect(r.provenance.tunablesDigest).toBe(stableDigest(arm));
    expect(r.provenance.tunablesVersion).toBe("hold-arm");
  });
});

// The engine (E-b) plays the blocks, so pocket-1.s1 plays another game than legacy on the same seeds.
describe("the batch under pocket-1.s1 plays another game", () => {
  const league = buildFlatLeague({ teams: 2 });
  const [home, away] = indexLeague(league).teamIds();
  const config = {
    league,
    schedule: { kind: "SYNTHETIC_PAIR", home: home!, away: away!, games: 2, season: 2024 } as const,
    seeds: { batchSeed: "adr-089:identity-rules" },
    playCalling: { tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN },
  };

  it("the same seeds under pocket-1.s1 give another accumulator than under legacy", async () => {
    const legacy = await runBatch(config);
    const pocket = await runBatch({ ...config, engineRules: "pocket-1.s1" });
    expect(JSON.stringify(pocket.accumulator)).not.toBe(JSON.stringify(legacy.accumulator));
    // ...and again the same under pocket-1.s1 (Iron Rule 4).
    const again = await runBatch({ ...config, engineRules: "pocket-1.s1" });
    expect(JSON.stringify(again.accumulator)).toBe(JSON.stringify(pocket.accumulator));
  });
});
