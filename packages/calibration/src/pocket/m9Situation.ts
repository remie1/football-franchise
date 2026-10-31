/**
 * M9, TODAY'S SITUATION FOOTPRINT (ADR-089 step 0; plan §6.2; ADR-089 §6.0 M9, §2.4, §4.9; O10).
 *
 * Pass rate, throwaways and time to throw in the last two minutes of the first and third quarters,
 * against the last two minutes of the second and fourth and the rest of regulation, on both seed
 * sets. Step 8a's tolerance is filed from it.
 *
 * **Windows** (§2.4): a snap's period is the last `PERIOD_START`'s; Q1Q3_END is periods 1 and 3
 * with 120 s or less on the snap's clock, Q2Q4_END periods 2 and 4 likewise, REST every other
 * regulation snap, OVERTIME apart. **The snap's clock is `PLAY_START.situation.clockSeconds`**,
 * the clock the engine hands the play (`game/simulateGame.ts:590`).
 *
 * **Finding (the same as S2's F1):** the plan's rebuild, `PERIOD_START.clockSeconds` less each
 * `PLAY_RESULT.clockRunoff`, runs AHEAD of the game clock, because the huddle and the kicking downs
 * burn time no `PLAY_RESULT` states (`game/simulateGame.ts:413`, `:449`, `:478`, `:522`, `:724`).
 * So the rebuild is kept as a check only (`clockCheck`): how many snaps and drive starts it equals,
 * and that it is never below the published clock.
 *
 * **Rows**, each a ratio of per-game sums: pass rate = dropbacks per scrimmage snap (PASS and RUN
 * plays); throwaway rate = throwaways per dropback; time to throw = the mean release (THROW or
 * THROWAWAY tick) per attempt.
 *
 * **Tolerance (O10):** 2 x each row's game-clustered bootstrap SE (1,000 resamples, seeded
 * `createRng("adr-089:m9", <row/window/set>)`), the larger of the two seed sets.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { clusteredBootstrapSE, noiseTolerance, ratioOf, type RatioGame } from "./m5Mirror.js";
import { playsOf, readDropback, releaseTickOf } from "./throwClass.js";

export const M9_RNG_LABEL = "adr-089:m9";
export const SITUATION_SECONDS = 120;
export const M9_WINDOWS = ["Q1Q3_END", "Q2Q4_END", "REST", "OVERTIME"] as const;
export type M9Window = (typeof M9_WINDOWS)[number];

export function windowOf(period: number, clockSeconds: number): M9Window {
  if (period > 4) return "OVERTIME";
  const late = clockSeconds <= SITUATION_SECONDS;
  if (late && (period === 1 || period === 3)) return "Q1Q3_END";
  if (late && (period === 2 || period === 4)) return "Q2Q4_END";
  return "REST";
}

export interface WindowCounts {
  snaps: number;
  dropbacks: number;
  throwaways: number;
  attempts: number;
  releaseSum: number;
}

const emptyCounts = (): WindowCounts => ({ snaps: 0, dropbacks: 0, throwaways: 0, attempts: 0, releaseSum: 0 });

export interface M9Game {
  windows: Record<M9Window, WindowCounts>;
  clockCheck: { snaps: number; snapsEqual: number; snapsRebuiltBelow: number; drives: number; drivesEqual: number; drivesRebuiltBelow: number; snapsWithoutClock: number };
}

function situationClockOf(payload: unknown): number | undefined {
  const s = (payload as { readonly situation?: { readonly clockSeconds?: unknown } } | undefined)?.situation;
  return typeof s?.clockSeconds === "number" ? s.clockSeconds : undefined;
}

function kindOf(payload: unknown): string | undefined {
  const k = (payload as { readonly kind?: unknown } | undefined)?.kind;
  return typeof k === "string" ? k : undefined;
}

/** One game's window counts, and the rebuilt clock's check. */
export function m9GameOf(events: readonly MatchEventEnvelope[]): M9Game {
  const g: M9Game = {
    windows: { Q1Q3_END: emptyCounts(), Q2Q4_END: emptyCounts(), REST: emptyCounts(), OVERTIME: emptyCounts() },
    clockCheck: { snaps: 0, snapsEqual: 0, snapsRebuiltBelow: 0, drives: 0, drivesEqual: 0, drivesRebuiltBelow: 0, snapsWithoutClock: 0 },
  };
  // Each play's window, from the period and the published snap clock.
  const windowByPlay = new Map<string, M9Window>();
  let period = 0;
  let rebuilt = 0;
  for (const { event } of events) {
    switch (event.type) {
      case "PERIOD_START":
        period = event.payload.period;
        rebuilt = event.payload.clockSeconds;
        break;
      case "DRIVE_START":
        g.clockCheck.drives += 1;
        if (rebuilt === event.payload.clockSeconds) g.clockCheck.drivesEqual += 1;
        if (rebuilt < event.payload.clockSeconds) g.clockCheck.drivesRebuiltBelow += 1;
        break;
      case "PLAY_START": {
        const kind = kindOf(event.payload);
        if (kind !== "PASS_PLAY_V1" && kind !== "RUN_PLAY_V1") break;
        const published = situationClockOf(event.payload);
        g.clockCheck.snaps += 1;
        if (published === undefined) g.clockCheck.snapsWithoutClock += 1;
        else {
          if (rebuilt === published) g.clockCheck.snapsEqual += 1;
          if (rebuilt < published) g.clockCheck.snapsRebuiltBelow += 1;
        }
        const w = windowOf(period, published ?? rebuilt);
        windowByPlay.set(event.playId, w);
        g.windows[w].snaps += 1;
        break;
      }
      case "PLAY_RESULT":
        rebuilt = Math.max(0, rebuilt - event.payload.clockRunoff);
        break;
      default:
        break;
    }
  }
  for (const play of playsOf(events)) {
    const w = windowByPlay.get(play.playId);
    if (w === undefined) continue;
    const d = readDropback(play);
    if (d === undefined) continue;
    const c = g.windows[w];
    c.dropbacks += 1;
    if (d.throwawayTick !== undefined) c.throwaways += 1;
    const r = releaseTickOf(d);
    if (r !== undefined) {
      c.attempts += 1;
      c.releaseSum += r;
    }
  }
  return g;
}

export const M9_ROWS = {
  pass_rate: (c: WindowCounts): RatioGame => ({ num: c.dropbacks, den: c.snaps }),
  throwaway_rate: (c: WindowCounts): RatioGame => ({ num: c.throwaways, den: c.dropbacks }),
  time_to_throw: (c: WindowCounts): RatioGame => ({ num: c.releaseSum, den: c.attempts }),
} as const;
export type M9Row = keyof typeof M9_ROWS;

/** One league's M9 table over its seed sets: each row and window, per set, with O10's tolerance. */
export function m9Table(bySet: ReadonlyMap<number, readonly M9Game[]>): Readonly<Record<string, unknown>> {
  const rows: Record<string, unknown> = {};
  for (const row of Object.keys(M9_ROWS) as M9Row[]) {
    const perWindow: Record<string, unknown> = {};
    for (const w of M9_WINDOWS) {
      const sets = [...bySet.entries()].sort(([a], [b]) => a - b).map(([set, games]) => {
        const ratios = games.map((g) => M9_ROWS[row](g.windows[w]));
        return { set, value: ratioOf(ratios), se: clusteredBootstrapSE(ratios, M9_RNG_LABEL, `${row}/${w}/set${String(set)}`), n: ratios.reduce((a, r) => a + r.den, 0) };
      });
      perWindow[w] = { sets, tolerance: noiseTolerance(sets.map((s) => s.se)) };
    }
    rows[row] = perWindow;
  }
  const check = { snaps: 0, snapsEqual: 0, snapsRebuiltBelow: 0, drives: 0, drivesEqual: 0, drivesRebuiltBelow: 0, snapsWithoutClock: 0 };
  for (const games of bySet.values()) for (const g of games) for (const k of Object.keys(check) as (keyof typeof check)[]) check[k] += g.clockCheck[k];
  return { rows, clockCheck: check, clock: "PLAY_START.situation.clockSeconds (the rebuild runs ahead: huddles and kicking downs)" };
}
