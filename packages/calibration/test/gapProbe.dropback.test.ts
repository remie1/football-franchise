/**
 * ============================================================================
 * EXTERNAL PROBE — gapProbe.dropback.test.ts
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
 * stream only (no engine-internal read, no engine modification) and prints a decomposition of
 * `qb_disruption_rate` to console (`PROBE_RESULT ...`). It is gated behind `FF_GAP_DROPBACK` so it
 * cannot execute, pass, or fail as part of this project's own suite (`pnpm verify`, `pnpm -r test`,
 * bare `vitest run`) by default — matching the existing convention set by `backlog87Numerator.test.ts`
 * (`FF_B87`) and `dispatchCEntryExit.test.ts` (`FF_DISPATCH_C`).
 *
 * Run explicitly (from `packages/calibration`):
 *
 *   FF_GAP_DROPBACK=1 PROBE_GAMES=496 npx vitest run test/gapProbe.dropback.test.ts
 *
 * `PROBE_GAMES=496` reproduces the canonical 496-game corpus (`flat-60-32t`,
 * `SYNTHETIC_ROUND_ROBIN` season 2024, batch seed `baseline-0001`, 16*31=496 games) every prior
 * dispatch (backlog 87, dispatch C) measured on and the bundle's own headline figures cite. The
 * file's own default (`GAMES = 150`) is a smaller smoke-test slice, not the reproduction corpus.
 *
 * ⚠ HYGIENE NOTE — the bundle's own caveat C5, CONFIRMED by inspection rather than assumed: this
 * file accumulates band/rep tallies on `globalThis.__bands` / `globalThis.__reps`, initialized
 * lazily (`?? {}` / `?? 0`) and never reset. That is harmless for THIS file's own shape — one
 * `describe`, one `it()`, one measurement pass per process — so the numbers this file prints are
 * correct as authored. It would NOT be safe to lift this accumulation pattern into a multi-arm
 * sweep (the shape `gapProbe.arms.test.ts` uses, looping `measure()` over several `Tunables`
 * arms in one process) without inserting a reset between arms: the tallies would silently carry
 * over from arm N into arm N+1's printed share. `gapProbe.corr.test.ts` avoids this by tallying
 * locally rather than on `globalThis`.
 *
 * No metric, band, verdict, engine code, tunable, or contract is changed by landing this file.
 * ============================================================================
 */
/** One-off probe: reproduce the canonical arm and decompose qb_disruption_rate per dropback. */
import { describe, it } from "vitest";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { DEFAULT_TUNABLES } from "@ff/engine";

const enabled = process.env["FF_GAP_DROPBACK"] === "1";

const GAMES = Number(process.env.PROBE_GAMES ?? "150");

interface DropbackRow {
  terminal: "THROW" | "SACK" | "SCRAMBLE" | "THROWAWAY" | "UNKNOWN";
  releaseTick: number | null; // THROW or THROWAWAY tick
  worst: string;
  statuses: string[]; // per tick
  ticks: number[];
  firstForcingTick: number | null; // first COLLAPSING/IMMEDIATE status tick
  firstArrivedTick: number | null;
  arrived: boolean;
  forced: boolean;
  origins: Set<string>;
  scrambled: boolean;
  statusAtRelease: string | null;
  freeRunner: boolean;
  rushers: number;
}

const FORCING = new Set(DEFAULT_TUNABLES.pocket.forcesDecision as readonly string[]);

describe.skipIf(!enabled)("gap probe", () => {
  it("decomposes disruption", () => {
    const league = buildFlatLeague({ teams: 32 });
    const index = indexLeague(league);
    const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
    const seeds = generateSeeds("baseline-0001", fixtures.length);

    const rows: DropbackRow[] = [];
    for (let i = 0; i < Math.min(GAMES, fixtures.length); i++) {
      const built = buildFixture(index, fixtures[i]!);
      const { observation } = runOneGame({
        built,
        seed: seeds.seeds[i]!,
        tendencies: FROZEN_TENDENCIES,
        fourthDown: FROZEN_FOURTH_DOWN,
      });
      let cur: DropbackRow | null = null;
      let tick = 0;
      let curPlayId: string | null = null;
      const flush = () => {
        if (cur !== null) rows.push(cur);
        cur = null;
      };
      for (const env of observation.events) {
        const e = env.event as { type: string; playId?: unknown; payload?: any };
        const pid = e.playId === undefined ? null : String(e.playId);
        if (pid !== null && pid !== curPlayId) {
          flush();
          curPlayId = pid;
        }
        switch (e.type) {
          case "PLAY_START": {
            const p = e.payload;
            if (p?.kind === "PASS_PLAY_V1") {
              cur = {
                terminal: "UNKNOWN",
                releaseTick: null,
                worst: "CLEAN",
                statuses: [],
                ticks: [],
                firstForcingTick: null,
                firstArrivedTick: null,
                arrived: false,
                forced: false,
                origins: new Set(),
                scrambled: false,
                statusAtRelease: null,
                freeRunner: Array.isArray(p?.defense?.unaccountedRushers) && p.defense.unaccountedRushers.length > 0,
                rushers: Array.isArray(p?.defense?.rush) ? p.defense.rush.length : 0,
              };
              tick = 0;
            } else {
              cur = null;
            }
            break;
          }
          case "TICK":
            tick = Number(e.payload?.tick ?? 0);
            if (cur) cur.ticks.push(tick);
            break;
          case "CHECK": {
            const kind = String(e.payload?.checkKind ?? "");
            if (kind === "pass_rush_tick") {
              (globalThis as any).__bands = (globalThis as any).__bands ?? {};
              const b = String(e.payload?.band ?? "?");
              (globalThis as any).__bands[b] = ((globalThis as any).__bands[b] ?? 0) + 1;
              (globalThis as any).__reps = ((globalThis as any).__reps ?? 0) + 1;
              if (cur && b === "RUSHER_WINS_REP" && (cur as any).firstWinTick === undefined) (cur as any).firstWinTick = tick;
            }
            break;
          }
          case "POCKET_STATUS": {
            if (!cur) break;
            const s = String(e.payload?.status ?? "");
            cur.statuses.push(s);
            const sev: Record<string, number> = { CLEAN: 0, PRESSURE: 1, COLLAPSING: 2, IMMEDIATE: 3 };
            if ((sev[s] ?? 0) > (sev[cur.worst] ?? 0)) cur.worst = s;
            if (FORCING.has(s)) {
              cur.forced = true;
              if (cur.firstForcingTick === null) cur.firstForcingTick = tick;
            }
            break;
          }
          case "RUSH_THREAT": {
            if (!cur) break;
            const st = String(e.payload?.state ?? "");
            const origin = String(e.payload?.origin ?? "");
            if (origin) cur.origins.add(origin);
            if (st === "ARRIVED") {
              cur.arrived = true;
              if (cur.firstArrivedTick === null) cur.firstArrivedTick = tick;
            }
            break;
          }
          case "QB_DECISION": {
            if (!cur) break;
            if (String(e.payload?.choice) === "SCRAMBLE") cur.scrambled = true;
            break;
          }
          case "THROW": {
            if (!cur) break;
            cur.terminal = "THROW";
            cur.releaseTick = tick;
            cur.statusAtRelease = cur.statuses.length > 0 ? cur.statuses[cur.statuses.length - 1]! : null;
            break;
          }
          case "THROWAWAY": {
            if (!cur) break;
            cur.terminal = "THROWAWAY";
            cur.releaseTick = tick;
            cur.statusAtRelease = cur.statuses.length > 0 ? cur.statuses[cur.statuses.length - 1]! : null;
            break;
          }
          case "PLAY_RESULT": {
            if (!cur) break;
            if (cur.terminal === "UNKNOWN") cur.terminal = cur.scrambled ? "SCRAMBLE" : "SACK";
            break;
          }
        }
      }
      flush();
    }

    // ---- aggregate ----
    const n = rows.length;
    const count = (f: (r: DropbackRow) => boolean) => rows.filter(f).length;
    const pct = (x: number) => ((100 * x) / n).toFixed(2) + "%";

    const sacked = (r: DropbackRow) => r.terminal === "SACK";
    const disrupted = (r: DropbackRow) => r.arrived || r.forced || sacked(r);
    const pressured = (r: DropbackRow) => r.worst !== "CLEAN";

    const out: Record<string, string | number> = {
      games: Math.min(GAMES, fixtures.length),
      dropbacks: n,
      pressured_entry: pct(count(pressured)),
      disrupted_exit: pct(count(disrupted)),
      sack_rate: pct(count(sacked)),
      scramble_rate: pct(count((r) => r.terminal === "SCRAMBLE")),
      throwaway_rate: pct(count((r) => r.terminal === "THROWAWAY")),
      throw_rate: pct(count((r) => r.terminal === "THROW")),
    };

    // disjunct decomposition (exclusive)
    out["d_forced_only"] = pct(count((r) => r.forced && !r.arrived && !sacked(r)));
    out["d_arrived_no_sack"] = pct(count((r) => r.arrived && !sacked(r)));
    out["d_sacked"] = pct(count(sacked));
    out["d_arrived_only"] = pct(count((r) => r.arrived && !r.forced && !sacked(r)));
    out["d_forced_and_arrived_no_sack"] = pct(count((r) => r.forced && r.arrived && !sacked(r)));

    // status-at-release for throws
    const throws = rows.filter((r) => r.terminal === "THROW" && r.releaseTick !== null);
    const relStatus: Record<string, number> = {};
    for (const r of throws) relStatus[r.statusAtRelease ?? "?"] = (relStatus[r.statusAtRelease ?? "?"] ?? 0) + 1;
    out["throws_n"] = throws.length;
    out["release_status"] = JSON.stringify(
      Object.fromEntries(Object.entries(relStatus).map(([k, v]) => [k, ((100 * v) / throws.length).toFixed(1) + "%"])),
    );
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    out["mean_time_to_throw"] = mean(throws.map((r) => r.releaseTick!)).toFixed(3);
    const ttDist: Record<string, number> = {};
    for (const r of throws) ttDist[r.releaseTick!.toFixed(1)] = (ttDist[r.releaseTick!.toFixed(1)] ?? 0) + 1;
    out["ttt_dist"] = JSON.stringify(
      Object.fromEntries(
        Object.entries(ttDist)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([k, v]) => [k, ((100 * v) / throws.length).toFixed(1) + "%"]),
      ),
    );

    // disruption conditional on terminal type
    for (const t of ["THROW", "SACK", "SCRAMBLE", "THROWAWAY"] as const) {
      const sub = rows.filter((r) => r.terminal === t);
      out[`disrupted_given_${t}`] =
        sub.length === 0 ? "n/a" : ((100 * sub.filter(disrupted).length) / sub.length).toFixed(1) + "%" + ` (n=${sub.length})`;
    }

    // among disrupted throws: had anything ARRIVED by release? was release under forcing status?
    const disruptedThrows = throws.filter(disrupted);
    out["throws_disrupted"] = ((100 * disruptedThrows.length) / Math.max(1, throws.length)).toFixed(1) + "%";
    out["throws_released_under_forcing"] = (
      (100 * throws.filter((r) => FORCING.has(r.statusAtRelease ?? "")).length) / Math.max(1, throws.length)
    ).toFixed(1) + "%";
    out["throws_arrival_strictly_before_release"] = (
      (100 * throws.filter((r) => r.firstArrivedTick !== null && r.firstArrivedTick < (r.releaseTick ?? 99)).length) /
      Math.max(1, throws.length)
    ).toFixed(1) + "%";
    out["throws_arrival_by_release_tick"] = (
      (100 * throws.filter((r) => r.firstArrivedTick !== null && r.firstArrivedTick <= (r.releaseTick ?? 99)).length) /
      Math.max(1, throws.length)
    ).toFixed(1) + "%";

    // a strict "QB affected" candidate: sack OR scramble OR throwaway(POCKET_DURESS not distinguished here) OR release under COLLAPSING+/arrival<=release
    const affectedStrict = (r: DropbackRow) =>
      sacked(r) ||
      r.terminal === "SCRAMBLE" ||
      (r.terminal === "THROW" &&
        (FORCING.has(r.statusAtRelease ?? "") || (r.firstArrivedTick !== null && r.firstArrivedTick <= (r.releaseTick ?? 99)))) ||
      (r.terminal === "THROWAWAY" && FORCING.has(r.statusAtRelease ?? ""));
    out["strict_qb_affected"] = pct(count(affectedStrict));

    // free runner slice
    out["freeRunner_dropbacks"] = pct(count((r) => r.freeRunner));
    out["disrupted_given_freeRunner"] = (
      (100 * rows.filter((r) => r.freeRunner && disrupted(r)).length) / Math.max(1, count((r) => r.freeRunner))
    ).toFixed(1) + "%";
    out["disrupted_given_no_freeRunner"] = (
      (100 * rows.filter((r) => !r.freeRunner && disrupted(r)).length) / Math.max(1, count((r) => !r.freeRunner))
    ).toFixed(1) + "%";
    const originCounts: Record<string, number> = {};
    for (const r of rows) for (const o of r.origins) originCounts[o] = (originCounts[o] ?? 0) + 1;
    out["origin_dropback_share"] = JSON.stringify(
      Object.fromEntries(Object.entries(originCounts).map(([k, v]) => [k, ((100 * v) / n).toFixed(1) + "%"])),
    );

    // first forcing tick distribution
    const ff = rows.filter((r) => r.firstForcingTick !== null).map((r) => r.firstForcingTick!);
    const ffDist: Record<string, number> = {};
    for (const t of ff) ffDist[t.toFixed(1)] = (ffDist[t.toFixed(1)] ?? 0) + 1;
    out["first_forcing_tick_dist"] = JSON.stringify(
      Object.fromEntries(
        Object.entries(ffDist)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([k, v]) => [k, ((100 * v) / Math.max(1, ff.length)).toFixed(1) + "%"]),
      ),
    );
    out["median_first_forcing_tick"] = ff.sort((a, b) => a - b)[Math.floor(ff.length / 2)] ?? "n/a";

    // disruption among quick releases
    const quick = rows.filter((r) => r.terminal === "THROW" && (r.releaseTick ?? 9) <= 1.0);
    out["quick_throws_share_of_dropbacks"] = pct(quick.length);
    out["disrupted_given_quick_throw"] = (
      (100 * quick.filter(disrupted).length) / Math.max(1, quick.length)
    ).toFixed(1) + "%";

    const bands = (globalThis as any).__bands ?? {};
    const reps = (globalThis as any).__reps ?? 1;
    out["pass_rush_reps"] = reps;
    out["band_share"] = JSON.stringify(Object.fromEntries(Object.entries(bands as Record<string, number>).map(([k, v]) => [k, ((100 * (v as number)) / reps).toFixed(2) + "%"])));
    const fw = rows.filter((r) => (r as any).firstWinTick !== undefined).map((r) => (r as any).firstWinTick as number);
    out["dropbacks_with_won_rep"] = pct(fw.length);
    const fwDist: Record<string, number> = {};
    for (const t of fw) fwDist[t.toFixed(1)] = (fwDist[t.toFixed(1)] ?? 0) + 1;
    out["first_win_tick_dist"] = JSON.stringify(Object.fromEntries(Object.entries(fwDist).sort(([a],[b])=>Number(a)-Number(b)).map(([k,v])=>[k,((100*v)/Math.max(1,fw.length)).toFixed(1)+"%"])));
    console.log("PROBE_RESULT " + JSON.stringify(out, null, 1));
  }, 1200000);
});
