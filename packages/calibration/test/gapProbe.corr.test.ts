/**
 * ============================================================================
 * EXTERNAL PROBE — gapProbe.corr.test.ts
 * ============================================================================
 *
 * ⛔ EXTERNAL. Authored by an outside reviewer, NOT this project's calibration agent, as part of
 * a four-file bundle (`gapProbe.dropback.test.ts`, `gapProbe.arms.test.ts`, `gapProbe.corr.test.ts`,
 * `gapProbe.ttt.test.ts`) plus `corr-rig.engine.patch` and `PRESSURE-GAP-COLD-READ.md`. Authored
 * against commit `a7b2a6b` (pinned in the bundle's own provenance table). HEAD has since advanced;
 * see the intake dispatch's findings for whether reproduction holds.
 *
 * ⛔ THIS IS A MEASUREMENT INSTRUMENT. IT GRADES NOTHING. Confirmed by inspection: this file
 * contains zero `expect()` calls. It runs the canonical corpus through `@ff/engine`'s PUBLIC event
 * stream only (no engine-internal read, no engine modification BY THIS FILE) and prints one
 * `ROW corr=<on|off> T=<n> {...}` line per (structure × threshold) cell to console. It is gated
 * behind `FF_GAP_CORR` so it cannot execute, pass, or fail as part of this project's own suite
 * (`pnpm verify`, `pnpm -r test`, bare `vitest run`) by default — matching the convention set by
 * `backlog87Numerator.test.ts` (`FF_B87`), `dispatchCEntryExit.test.ts` (`FF_DISPATCH_C`), and
 * `gapProbe.dropback.test.ts` (`FF_GAP_DROPBACK`).
 *
 * ============================================================================
 * ⛔⛔⛔ THE `corr=on` ROWS REQUIRE AN ENGINE PATCH THAT BREAKS ADR-004. READ THIS BEFORE RUNNING.
 * ============================================================================
 *
 * This file's `corr=off` rows run against the committed, unpatched `@ff/engine` exactly like the
 * other three probes in this bundle. Its `corr=on` rows (and the `counterx3` feasibility rows) are
 * **NOT MEASURABLE ON THE COMMITTED ENGINE AT ALL** — they require applying
 * `corr-rig.engine.patch` (shipped alongside this bundle, NOT applied by this file, NOT applied by
 * this dispatch) to a scratch clone first. That patch changes
 * `packages/engine/src/resolve/passRush.ts` and `packages/engine/src/sim/passPlay.ts` to compute
 * each tick's pass-rush margin from a **per-play latent contest** (drawn once, then jittered) rather
 * than from the two independently-rolled, per-tick `rollD100` results that are what actually get
 * logged on the `CHECK` event.
 *
 * **This is a direct violation of ADR-004 ("a roll is recorded exactly once, and calibration counts
 * rolls ONLY from CHECK/PRESNAP_READ")** — not the double-counting defect ADR-004 was written to
 * close, but its precondition: ADR-004's whole audit chain assumes the `RollDetail` a `CHECK` event
 * carries is the value that actually decided the outcome. Under `corr-rig.engine.patch` with
 * `corr=on`, the band that `resolvePassRushTick` returns is computed from `args.latent`, a value
 * **the logged `rusherRoll`/`blockerRoll` `RollDetail`s do not reproduce and have no field for.**
 * The `CHECK` event a consumer reads still shows an ordinary per-tick roll; the outcome it actually
 * got was decided by something else. Any calibration instrument, replay, or audit that trusts the
 * `CHECK` stream as ground truth for what happened — which is every consumer ADR-004 was written to
 * protect — is silently wrong on a patched, `corr=on` run.
 *
 * **THEREFORE: every `corr=on` row (and every `counterx3` row, which is also `corr=on`) printed by
 * this file, on a scratch clone with the patch applied, IS INVALID FOR ANY PURPOSE OTHER THAN THIS
 * ONE MEASUREMENT** — it may not be cited as a calibration finding, may not feed a sensitivity or
 * disambiguation report, may not be compared against the registered `qb_disruption_rate` or any
 * other tier-1 metric as if it were a normal batch, and must never be run against a tree that is
 * shipped, merged, or used to produce a report consumed outside this one measurement's own
 * documentation. `corr=off` rows carry no such caveat: with the patch's `__CORR` flag unset, the
 * patch is a no-op (see the patch's own note: "with the flag unset the patched tree is
 * stream-identical to pristine — no extra RNG forks are drawn"), so `corr=off` rows are ordinary,
 * ADR-004-clean measurements of the committed engine.
 *
 * ⛔ **THIS DISPATCH DOES NOT APPLY `corr-rig.engine.patch`.** A concurrent dispatch owns evaluating
 * and applying that patch in an isolated worktree. Landing this test file does not land the patch,
 * does not run the patch, and does not touch `packages/engine`. Running this file as landed (flag
 * on, patch NOT applied) will execute only the `corr=off`-shaped code path faithfully — but because
 * the file's own loop also emits `corr=on`/`counterx3` rows unconditionally, on an unpatched engine
 * those rows will simply reproduce the `corr=off` numbers for that same `T` (the `__CORR` global has
 * no reader pre-patch), NOT the bundle's claimed correlated-structure figures. Do not mistake that
 * for a reproduction of the bundle's §5 correlated rows; it is the unpatched engine ignoring a flag
 * it does not know about. Getting the bundle's actual `corr=on` figures requires the patch, on a
 * scratch clone, per the concurrent dispatch's own mandate — not here.
 *
 * Run explicitly (from `packages/calibration`, on the COMMITTED engine — `corr=on` rows will not be
 * the bundle's reported figures without the patch, per the paragraph above):
 *
 *   FF_GAP_CORR=1 PROBE_GAMES=80 npx vitest run test/gapProbe.corr.test.ts
 *
 * No metric, band, verdict, engine code, tunable, or contract is changed by landing this file.
 * ============================================================================
 */
import { describe, it } from "vitest";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { supplyAt } from "./threatSupplyPatches.js";

const enabled = process.env["FF_GAP_CORR"] === "1";

const GAMES = Number(process.env.PROBE_GAMES ?? "80");
const FORCING = new Set(DEFAULT_TUNABLES.pocket.forcesDecision as readonly string[]);

function measure(tunables: Tunables, games: number) {
  const league = buildFlatLeague({ teams: 32 });
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds("baseline-0001", fixtures.length);
  let dropbacks = 0, pressured = 0, disrupted = 0, sacks = 0, scrambles = 0, throwaways = 0;
  let reps = 0, winReps = 0, dbWithWin = 0;
  const throwTicks: number[] = [];
  for (let i = 0; i < Math.min(games, fixtures.length); i++) {
    const built = buildFixture(index, fixtures[i]!);
    const { observation } = runOneGame({
      built, seed: seeds.seeds[i]!, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, tunables,
    });
    let isPass = false, worstNonClean = false, forced = false, arrived = false, scrambled = false;
    let threw = false, threwAway = false, tick = 0, releaseTick: number | null = null, sawWin = false;
    let curPlayId: string | null = null;
    const flush = () => {
      if (!isPass) return;
      dropbacks++;
      if (worstNonClean) pressured++;
      if (sawWin) dbWithWin++;
      const sacked = !threw && !threwAway && !scrambled;
      if (sacked) sacks++;
      if (scrambled) scrambles++;
      if (threwAway) throwaways++;
      if (arrived || forced || sacked) disrupted++;
      if (threw && releaseTick !== null) throwTicks.push(releaseTick);
    };
    for (const env of observation.events) {
      const e = env.event as { type: string; playId?: unknown; payload?: any };
      const pid = e.playId === undefined ? null : String(e.playId);
      if (pid !== null && pid !== curPlayId) {
        flush();
        curPlayId = pid;
        isPass = false; worstNonClean = false; forced = false; arrived = false; scrambled = false;
        threw = false; threwAway = false; releaseTick = null; tick = 0; sawWin = false;
      }
      switch (e.type) {
        case "PLAY_START": isPass = e.payload?.kind === "PASS_PLAY_V1"; break;
        case "TICK": tick = Number(e.payload?.tick ?? 0); break;
        case "CHECK":
          if (String(e.payload?.checkKind) === "pass_rush_tick") {
            reps++;
            if (String(e.payload?.band) === "RUSHER_WINS_REP") { winReps++; sawWin = true; }
          }
          break;
        case "POCKET_STATUS": {
          const s = String(e.payload?.status ?? "");
          if (s !== "CLEAN") worstNonClean = true;
          if (FORCING.has(s)) forced = true;
          break;
        }
        case "RUSH_THREAT": if (String(e.payload?.state) === "ARRIVED") arrived = true; break;
        case "QB_DECISION": if (String(e.payload?.choice) === "SCRAMBLE") scrambled = true; break;
        case "THROW": threw = true; releaseTick = tick; break;
        case "THROWAWAY": threwAway = true; releaseTick = tick; break;
      }
    }
    flush();
  }
  const pct = (x: number, d = dropbacks) => ((100 * x) / Math.max(1, d)).toFixed(2);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  return {
    db: dropbacks,
    entry: pct(pressured),
    exit: pct(disrupted),
    sack: pct(sacks),
    scr: pct(scrambles),
    ta: pct(throwaways),
    ttt: mean(throwTicks).toFixed(3),
    win_per_tick: pct(winReps, reps),
    db_with_win: pct(dbWithWin),
  };
}

describe.skipIf(!enabled)("gap probe: two-axis", () => {
  it("sweeps structure x threshold — corr=on rows INVALID without corr-rig.engine.patch (ADR-004, see header)", () => {
    const G = globalThis as { __CORR?: { jitter: number } };
    for (const corr of [false, true]) {
      for (const T of [15, 30, 45, 60, 75]) {
        if (corr) G.__CORR = { jitter: 4 };
        else delete G.__CORR;
        const t = T === 15 ? DEFAULT_TUNABLES : supplyAt(T, DEFAULT_TUNABLES);
        const r = measure(t, GAMES);
        console.log(`ROW corr=${corr ? "on " : "off"} T=${String(T).padStart(2)} ${JSON.stringify(r)}`);
      }
    }
    // feasibility: corr on, counter thresholds x3 (time-renormalized), T in {50,60,70}
    // ⛔ corr=on / counterx3 rows require corr-rig.engine.patch — see header (ADR-004 break, C2).
    G.__CORR = { jitter: 4 };
    for (const T of [50, 60, 70]) {
      let t = supplyAt(T, DEFAULT_TUNABLES);
      DEFAULT_TUNABLES.pocket.thresholds.forEach((th, i) => {
        if (th.minProgress > 0) {
          t = { ...t, pocket: { ...t.pocket, thresholds: t.pocket.thresholds.map((x, j) => (j === i ? { ...x, minProgress: x.minProgress * 3 } : x)) } } as unknown as typeof t;
        }
      });
      const r = measure(t, GAMES);
      console.log(`ROW corr=on  T=${T} counterx3 ${JSON.stringify(r)}`);
    }
    delete G.__CORR;
  }, 3600000);
});
