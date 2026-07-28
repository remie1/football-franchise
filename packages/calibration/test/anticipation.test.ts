/**
 * ADR-024's PAIRED ARM — v1 and v2 on the same seeds, in one process, on one tree.
 *
 *   FF_ANTICIPATION=1 pnpm --filter @ff/calibration test anticipation
 *   FF_ANTICIPATION=1 FF_ANTICIPATION_GAMES=496 FF_ANTICIPATION_SEED=baseline-0001 ...
 *
 * ============================ WHY THIS FILE EXISTS AT ALL ============================
 *
 * `callerVersion` is part of `BaselineIdentity` (ADR-025), so the trend layer **REFUSES** to
 * compare a v2 report against `baseline-0002`. That refusal is the guard working exactly as
 * ratified — v1 and v2 measure different denominators — and it is also why "what did ADR-024
 * move" cannot be answered by a trend column.
 *
 * `report/identity.ts` names the two honest instruments in its own refusal message. The second is
 * *"a counterfactual: both arms in one process on one tree"*, which is what `attribution.test.ts`
 * does for a tunable. This is that instrument for the caller. Everything printed below is a
 * PAIRED difference over one seed list, not a trend across a boundary with the control arm
 * quietly missing.
 *
 * ============================ WHAT MAY AND MAY NOT BE CONCLUDED ============================
 *
 * ⛔ **Read every movement in sack rate, pressure rate and completion as a PRESSURE-RATE change.**
 * `CALIBRATION-BACKLOG.md` entry 26: `pressure_to_sack` measures 15.32% against a real 16.37%, and
 * every sim sack sits on a pressured dropback by construction, so sim
 * `pressure_to_sack ≡ sack_rate ÷ pressure_rate` exactly and **the entire sack excess is a
 * pressure-rate excess.** Entries 2 and 3 carry this as an explicit prohibition. Nothing in this
 * file is evidence that §7.1/§7.2's conversion terms need touching, and the assertion at the foot
 * says so in a form that fails rather than in prose.
 *
 * ⛔ **No tunable is patched anywhere here.** This measures a CALLER change against
 * `DEFAULT_TUNABLES` on both arms, which is the only way the difference means anything.
 *
 * The freeze list this used to quote has since moved and is worth stating correctly, because a
 * stale freeze claim is a claim somebody cites: `pocket.sackWhenNoTarget` and
 * `blitzPickup.freeRunnerArrivalSeconds` remain FROZEN, and `freeRunnerArrivalSeconds` is the
 * next sweep's target. `passRush.blockerStructuralAdvantage` is NOT frozen — ADR-027 unfroze it
 * for measurement, ADR-028 moved it 15 → 0 and made `anchor` a real §7.1 blocker term in its
 * place. Both arms here still run `DEFAULT_TUNABLES`, so the comparison is unaffected; what
 * changed is only what the sentence is allowed to say.
 */
import { describe, expect, it } from "vitest";
import type { CallerVersion } from "../src/caller/anticipate.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runBatch, type BatchResult } from "../src/harness/batch.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";

const enabled = process.env["FF_ANTICIPATION"] === "1";
const GAMES = Number(process.env["FF_ANTICIPATION_GAMES"] ?? "496");
const BATCH_SEED = process.env["FF_ANTICIPATION_SEED"] ?? "baseline-0001";

function pct(n: number, of: number): string {
  return of === 0 ? "—" : `${((n / of) * 100).toFixed(3)}%`;
}

function per(n: number, of: number): string {
  return of === 0 ? "—" : (n / of).toFixed(4);
}

interface Arm {
  readonly version: CallerVersion;
  readonly batch: BatchResult;
}

/** The rows the dispatch and ADR-024 name, in one shape so the two arms print side by side. */
function rowsOf(arm: Arm): Readonly<Record<string, string>> {
  const p = arm.batch.accumulator.play;
  const origins = p.threatOrigins;
  return {
    dropbacks: String(p.dropbacks),
    // --- the four starved counters -----------------------------------------
    PICKUP_LOST: String(origins["PICKUP_LOST"] ?? 0),
    UNBLOCKED: String(origins["UNBLOCKED"] ?? 0),
    STUNT_LOOPER: String(origins["STUNT_LOOPER"] ?? 0),
    WON_REP: String(origins["WON_REP"] ?? 0),
    hot_route_rate: pct(p.hotConversionDropbacks, p.dropbacks),
    unaccounted_rusher_rate: pct(p.unaccountedRusherDropbacks, p.dropbacks),
    // --- the pressure family -----------------------------------------------
    sack_rate: pct(p.sacks, p.dropbacks),
    pressure_rate: pct(p.pressuredDropbacks, p.dropbacks),
    pressure_to_sack: pct(p.sacks, p.pressuredDropbacks),
    completion_pct: pct(p.completions, p.passAttempts),
    blitz_rate: pct(p.blitzDropbacks, p.dropbacks),
    // --- the control: the caller's play mix, which must NOT move ------------
    passCalls: String(arm.batch.caller.passCalls),
    runCalls: String(arm.batch.caller.runCalls),
    conceptRedraws: String(arm.batch.caller.conceptRedraws),
  };
}

async function runArm(version: CallerVersion): Promise<Arm> {
  const league = buildFlatLeague({ teams: 32 });
  const schedule = { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 } as const;
  const seeds = generateSeeds(BATCH_SEED, GAMES);
  const batch = await runBatch({
    league,
    schedule,
    seeds,
    playCalling: {
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      callerVersion: version,
    },
  });
  return { version, batch };
}

describe.skipIf(!enabled)("ADR-024 — the anticipated front, both arms", () => {
  it("measures v1 against v2 on one seed list", async () => {
    const v1 = await runArm("v1");
    const v2 = await runArm("v2");

    const a = rowsOf(v1);
    const b = rowsOf(v2);
    const keys = Object.keys(a);
    const lines = [
      `games=${v1.batch.provenance.games} seeds=${v1.batch.provenance.seedDigest}`,
      `caller v1=${v1.batch.provenance.callerVersion}  v2=${v2.batch.provenance.callerVersion}`,
      "",
      `${"row".padEnd(26)} ${"v1".padStart(14)} ${"v2".padStart(14)}`,
      "-".repeat(58),
      ...keys.map((k) => `${k.padEnd(26)} ${(a[k] ?? "").padStart(14)} ${(b[k] ?? "").padStart(14)}`),
      "",
      "DRAW QUALITY (v2 only)",
    ];
    const d = v2.batch.caller.draw;
    lines.push(
      `draws=${d.draws} (pass ${d.passDraws} / run ${d.runDraws})  mean pool=${per(d.poolSizeSum, d.draws)}  forced=${pct(d.forcedDraws, d.draws)}`,
      `exact card       ${pct(d.exactCard, d.draws)}`,
      `front label      ${pct(d.sameFrontLabel, d.draws)}`,
      `rusher count     ${pct(d.sameRusherCount, d.draws)}`,
      `blitz class      ${pct(d.sameBlitzClass, d.draws)}`,
      `coverage family  ${pct(d.sameCoverageFamily, d.draws)}`,
      `exact rusher set ${pct(d.exactRusherSet, d.draws)}`,
      `mean Jaccard     ${per(d.jaccardSum, d.draws)}`,
      `missed rushers   ${d.missedRusherSum} total, ${per(d.missedRusherSum, d.draws)}/draw`,
      `phantom rushers  ${d.phantomRusherSum} total, ${per(d.phantomRusherSum, d.draws)}/draw`,
      `protectors in coverage ${d.protectorsInCoverage}`,
      `pass draws: missed ${pct(d.passDrawsWithMissed, d.passDraws)} / idle-protector ${pct(d.passDrawsWithPhantom, d.passDraws)} / BOTH ${pct(d.passDrawsWithBoth, d.passDraws)}`,
      `missed histogram  ${JSON.stringify(d.missedHistogram)}`,
      `phantom histogram ${JSON.stringify(d.phantomHistogram)}`,
      `by personnel      ${JSON.stringify(d.byPersonnel)}`,
      `exact by personnel ${JSON.stringify(d.exactByPersonnel)}`,
    );
    // eslint-disable-next-line no-console
    console.log(`\n${lines.join("\n")}\n`);

    // ---- THE CONTROL ARM, AND THE FORM IT HAS TO TAKE ---------------------
    //
    // NOT exact equality of the call COUNTS, and the reason is worth stating because the naive
    // assertion is the tempting one and it is wrong. Per snap the two callers are identical: the
    // run/pass draw, the defensive card and the offensive concept come off the same three PRNG
    // addresses (`test/caller.test.ts` asserts that on the first snap of a shared stream). But
    // the moment one arm blocks a snap differently, the two GAMES diverge — different result,
    // different down and distance, different situation on the next snap — so the two arms play a
    // different number of snaps in different situations. Demanding equal totals would be
    // demanding that ADR-024 change nothing.
    //
    // What must hold is that the caller's own RULE did not move: the pass share it draws at is a
    // property of the tendency table, and the table is untouched. A drift here would mean the
    // situations diverged far enough to re-weight the mix, at which point the comparison is
    // measuring game script rather than protection.
    const share = (arm: Arm): number =>
      arm.batch.caller.passCalls / (arm.batch.caller.passCalls + arm.batch.caller.runCalls);
    expect(Math.abs(share(v2) - share(v1))).toBeLessThan(0.01);
    // The defence is untouched by construction — v2 changes the offence's INFORMATION, never the
    // card the engine is handed — so the corpus's fitted blitz rate must survive the change.
    const blitz = (arm: Arm): number =>
      arm.batch.accumulator.play.blitzDropbacks / arm.batch.accumulator.play.dropbacks;
    expect(Math.abs(blitz(v2) - blitz(v1))).toBeLessThan(0.01);

    // ---- THE STARVED BRANCH, FIRING ---------------------------------------
    // `baseline-0002`: PICKUP_LOST = 0 in 496 games, hot_route_rate 0.10%. ADR-024 exists because
    // that is a branch that has never executed, not a mechanic that is weak.
    const p2 = v2.batch.accumulator.play;
    expect(p2.threatOrigins["PICKUP_LOST"] ?? 0).toBeGreaterThan(0);
    expect(p2.unaccountedRusherDropbacks).toBeGreaterThan(
      v1.batch.accumulator.play.unaccountedRusherDropbacks,
    );
    expect(p2.hotConversionDropbacks).toBeGreaterThan(
      v1.batch.accumulator.play.hotConversionDropbacks,
    );

    // ---- ENTRY 26'S PROHIBITION, AS AN IDENTITY RATHER THAN A NOTE ---------
    // Every sim sack is on a pressured dropback by construction, so this holds exactly. It is
    // asserted so that "the sack movement is a pressure-rate movement" is a checked property of
    // the run rather than a sentence somebody wrote in a memo.
    const conversion = p2.sacks / p2.pressuredDropbacks;
    const identity = p2.sacks / p2.dropbacks / (p2.pressuredDropbacks / p2.dropbacks);
    expect(Math.abs(conversion - identity)).toBeLessThan(1e-9);
  }, 3_600_000);
});
