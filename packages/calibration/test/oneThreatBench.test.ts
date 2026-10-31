/**
 * ADR-089 step 0 — the one-threat bench (plan §6.3; C1-S12, O17; K15).
 *
 * Always on: the bench's tunables, the rebuilt call's invariants on one clean-bench game's PASS
 * plays, the capture's round trip, and, on two plays, determinism and **exactly one UNBLOCKED threat
 * with `etaTick` = X and no other threat** at each X (the plan's words). If that cannot be made
 * exact the bench stops (K15): there is no looser bench.
 *
 * Gated `FF_POCKET_BENCH=1` (P-11): the rows by X over both leagues' 50 golden games played on the
 * clean bench, every replay checked exact.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES, simulatePlay, type PlayCalls } from "@ff/engine";
import { describe, expect, it } from "vitest";
import {
  CLEAN_BENCH_LEAVES,
  ONE_THREAT_SECONDS,
  captureCleanBenchPlays,
  cleanBenchTunables,
  oneThreatCalls,
  oneThreatRows,
  oneThreatTunables,
  replayOneThreat,
  type CleanBenchPlay,
} from "../src/pocket/oneThreatBench.js";
import { stableDigest } from "../src/harness/digest.js";

const GATED = process.env["FF_POCKET_BENCH"] !== "1";

let cached: { readonly plays: readonly CleanBenchPlay[]; readonly events: readonly MatchEventEnvelope[] } | undefined;
function captured(): { readonly plays: readonly CleanBenchPlay[]; readonly events: readonly MatchEventEnvelope[] } {
  if (cached === undefined) {
    let events: readonly MatchEventEnvelope[] = [];
    const plays = captureCleanBenchPlays("gen", { first: 1, onGame: (e) => (events = e) });
    cached = { plays, events };
  }
  return cached;
}
const oneGame = (): readonly CleanBenchPlay[] => captured().plays;

describe("ADR-089 step 0: the one-threat bench", () => {
  it("the clean bench is pkB's four leaves; the one-threat tunables add X with every path offset zeroed", () => {
    const clean = cleanBenchTunables();
    expect(CLEAN_BENCH_LEAVES.map((l) => l.tunableId)).toEqual([
      "passRush.blockerStructuralAdvantage",
      "blitzPickup.freeRunnerArrivalSeconds",
      "blitzPickup.freeRunnerPath.maxArrivalSeconds",
      "stunt.looperArrivalSeconds",
    ]);
    expect(clean.passRush.blockerStructuralAdvantage).toBe(500);
    expect(clean.blitzPickup.freeRunnerArrivalSeconds).toBe(50);
    expect(clean.blitzPickup.freeRunnerPath.maxArrivalSeconds).toBe(99);
    expect(clean.stunt.looperArrivalSeconds).toBe(50);
    // DEFAULT_TUNABLES itself is untouched (the patch is in memory).
    expect(DEFAULT_TUNABLES.passRush.blockerStructuralAdvantage).toBe(0);
    expect(DEFAULT_TUNABLES.blitzPickup.freeRunnerArrivalSeconds).toBe(1.5);

    expect(ONE_THREAT_SECONDS).toEqual([1.5, 2.5, 3.5]);
    for (const x of ONE_THREAT_SECONDS) {
      const t = oneThreatTunables(x);
      expect(t.blitzPickup.freeRunnerArrivalSeconds).toBe(x);
      expect(t.blitzPickup.freeRunnerPath.maxArrivalSeconds).toBe(99);
      expect(t.passRush.blockerStructuralAdvantage).toBe(500);
      expect(t.stunt.looperArrivalSeconds).toBe(50);
      const offsets = t.blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth as Readonly<Record<string, Readonly<Record<string, number>>>>;
      for (const byDepth of Object.values(offsets)) for (const v of Object.values(byDepth)) expect(v).toBe(0);
      expect(x).toBeGreaterThanOrEqual(t.blitzPickup.freeRunnerPath.minArrivalSeconds);
    }
  });

  it("the capture round-trips: every captured PASS play replayed on the clean bench is the game's own play", () => {
    const { plays, events } = captured();
    expect(plays.length).toBeGreaterThan(20);
    const byPlay = new Map<string, MatchEventEnvelope[]>();
    for (const e of events) {
      const id = e.event.playId;
      if (id === undefined) continue;
      const bucket = byPlay.get(String(id));
      if (bucket === undefined) byPlay.set(String(id), [e]);
      else bucket.push(e);
    }
    for (const p of plays) {
      const key = `${String(p.play.state.gameId)}:play:${String(p.play.playNumber)}`;
      const original = byPlay.get(key);
      expect(original, key).toBeDefined();
      const replayed = simulatePlay(p.play.state, p.play.calls, p.seed, cleanBenchTunables()).events;
      expect(stableDigest(replayed.map((e) => e.event)), key).toBe(stableDigest((original ?? []).map((e) => e.event)));
    }
    // The clean bench: a threat may be published, but never sooner than 50 s, none arrives, and
    // every pocket status is CLEAN.
    for (const { event } of events) {
      if (event.type === "RUSH_THREAT") {
        expect(event.payload.etaTick).toBeGreaterThanOrEqual(50);
        expect(event.payload.state).not.toBe("ARRIVED");
      }
      if (event.type === "POCKET_STATUS") expect(event.payload.status).toBe("CLEAN");
    }
  });

  it("the rebuilt call: rush = protection + 1, no stunt, the shown rush is the played one, no pool, no check-release", () => {
    let rebuilt = 0;
    let allNamed = 0;
    for (const p of oneGame()) {
      const calls = p.play.calls as PlayCalls;
      const r = oneThreatCalls(calls);
      if (calls.defense.rush.length === 0) {
        expect(r).toBeUndefined();
        continue;
      }
      expect(r).toBeDefined();
      if (r === undefined) continue;
      rebuilt += 1;
      const { offense, defense } = r.calls;
      expect(r.rushCount).toBe(r.protectionCount + 1);
      expect(defense.rush.length).toBe(r.rushCount);
      expect(offense.protection.length).toBe(r.protectionCount);
      expect(defense.stunts).toBeUndefined();
      expect(defense.shownRush).toBe(defense.rush);
      const scheme = offense.protectionScheme;
      if (scheme !== undefined) {
        expect("available" in scheme).toBe(false);
        expect("checkRelease" in scheme).toBe(false);
        expect("slideCheck" in scheme).toBe(false);
      }
      const rushers = defense.rush.map((x) => String(x.rusher));
      const named = offense.protection.map((x) => String(x.rusher));
      expect(new Set(rushers).size).toBe(rushers.length);
      expect(new Set(named).size).toBe(named.length);
      for (const n of named) expect(rushers).toContain(n);
      expect(named).not.toContain(r.extra);
      expect(rushers).toContain(r.extra);
      // Every rush entry is a captured one, unchanged.
      for (const entry of defense.rush) expect(calls.defense.rush).toContain(entry);
      for (const pairing of offense.protection) expect(calls.offense.protection).toContain(pairing);
      // The captured call itself is untouched.
      expect(calls.defense.rush.length).toBeGreaterThanOrEqual(r.rushCount);
      const capturedNamed = new Set(calls.offense.protection.map((x) => String(x.rusher)));
      if (calls.defense.rush.every((x) => capturedNamed.has(String(x.rusher)))) {
        allNamed += 1;
        // Every captured rusher was named: the last kept pairing's rusher is the extra man.
        const kept = calls.offense.protection.filter((x) => calls.defense.rush.some((y) => String(y.rusher) === String(x.rusher)));
        expect(r.extra).toBe(String(kept[kept.length - 1]!.rusher));
      }
    }
    expect(rebuilt).toBeGreaterThan(20);
    expect(allNamed).toBeGreaterThan(0);
  });

  it("two plays, each X: deterministic, and exactly one UNBLOCKED threat at etaTick X, his, and no other (K15)", () => {
    const plays = oneGame().filter((p) => oneThreatCalls(p.play.calls as PlayCalls) !== undefined).slice(0, 2);
    expect(plays.length).toBe(2);
    for (const p of plays) {
      for (const x of ONE_THREAT_SECONDS) {
        const a = replayOneThreat(p, x);
        const b = replayOneThreat(p, x);
        expect(a).toBeDefined();
        expect(b).toBeDefined();
        if (a === undefined || b === undefined) continue;
        expect(stableDigest(b.events)).toBe(stableDigest(a.events));
        expect(b.facts).toEqual(a.facts);
        const f = a.facts;
        expect(f.dropback).toBe(true);
        expect(f.threats.length).toBeGreaterThan(0);
        expect(f.threats[0]).toMatchObject({ rusher: a.call.extra, origin: "UNBLOCKED", etaTick: x });
        for (const t of f.threats) expect(t).toMatchObject({ rusher: a.call.extra, origin: "UNBLOCKED" });
        expect(f.exact).toBe(true);
        expect(f.poolAtSnap).toBe(0);
        expect(f.pickupChecks).toBe(0);
      }
    }
  });

  it.skipIf(GATED)(
    "the rows by X on both leagues' 50 golden games, every replay exact (FF_POCKET_BENCH=1)",
    () => {
      for (const league of ["gen", "flat"] as const) {
        const plays = captureCleanBenchPlays(league);
        const rows = oneThreatRows(plays);
        process.stdout.write(`ADR-089 one-threat bench, ${league} (${String(plays.length)} captured PASS plays):\n${JSON.stringify(rows, null, 1)}\n`);
        for (const r of rows) {
          expect(r.notExact).toBe(0);
          expect(r.pickupOffered).toBe(0);
          expect(r.plays).toBeGreaterThan(0);
        }
        // A free runner home sooner can only press harder: the sack share does not fall as X shrinks.
        expect(rows[0]!.sacksPct).toBeGreaterThanOrEqual(rows[2]!.sacksPct);
      }
    },
    900_000,
  );
});
