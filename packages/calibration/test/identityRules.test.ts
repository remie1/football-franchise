/**
 * ADR-089 step 0 — THE RULES NAME IN THE BASELINE IDENTITY AND THE BATCH PROVENANCE (plan §4, O11).
 *
 *  1. baseline-0009's carry-forward still reads under the strict reader, and has no `engineRules`
 *     (K2-09), and a legacy identity built today is byte for byte the identity it recorded.
 *  2. Absent equals an explicit `legacy`.
 *  3. A `pocket-1.s1` predecessor against a legacy run is REFUSED by `decideTrend`, and so is the
 *     same bundle over a different overlay digest.
 *  4. A malformed value is refused as a malformed carry-forward.
 *  5. The batch: `engineRules: "legacy"` gives the same accumulator and provenance as no name; any
 *     other name is refused before a game is played (K4).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runBatch, type BatchExecutor, type BatchProvenance } from "../src/harness/batch.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { EngineRulesError } from "../src/pocket/rules.js";
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

describe("the batch (K4: nothing reaches the engine at step 0)", () => {
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

  it("refuses any other name before a game is played", async () => {
    const neverRuns: BatchExecutor = {
      name: "never",
      workers: 1,
      run: () => Promise.reject(new Error("a game was played")),
    };
    for (const name of ["pocket-1.s1", "pocket-1", "default", ""]) {
      await expect(runBatch({ ...config, engineRules: name, executor: neverRuns })).rejects.toThrow(EngineRulesError);
    }
    await expect(runBatch({ ...config, engineRules: "pocket-1.s1", executor: neverRuns })).rejects.toThrow(/^runBatch: engine rules "pocket-1.s1"/);
    // The stub does run when the name is legacy, so the refusal above is the rules check, not the stub.
    await expect(runBatch({ ...config, engineRules: "legacy", executor: neverRuns })).rejects.toThrow("a game was played");
  });
});
