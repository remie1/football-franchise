/**
 * M5, THE MIRROR GUARD (ADR-089 step 0; plan §6.2; ADR-089 §6.0 M5, §4.7; deviation O10; C1-S13).
 *
 * **Mirrored runs, not a fold:** every corpus is played again with `mirror: true` (C1's seam,
 * `mirror.ts`: LEFT and RIGHT swapped on every card, players keeping their ids), on both seed sets
 * and both leagues, and compared with the unmirrored runs. Step 0 records:
 *
 *  - **the escape CAUGHT rate:** `scramble` CHECKs whose band sacks him (CAUGHT_FROM_BEHIND), per
 *    escape roll. The escape has no direction on today's stream (P11's `QB_DECISION.direction`
 *    comes at step 7), so the check is mirrored against unmirrored; the escape rate per dropback
 *    is printed beside it;
 *  - **the no-side share:** rush entries on `PLAY_START.defense.rush` that carry no `RunSide`, per
 *    entry, and cards with at least one such entry and with none stated at all, per dropback;
 *  - **how often the looper rule (D16) moves a side:** of the stunts run (a `stunt_communication`
 *    CHECK naming the looper), those where both men state a side and the looper's differs from
 *    his partner's, so D16 counts him on the other side.
 *
 * **Within noise (O10):** a row's tolerance is 2 x its game-clustered bootstrap standard error
 * (1,000 resamples of the games with replacement, the ratio of sums each time), on the unmirrored
 * run, the larger of the two seed sets; a row is within noise on a set when |mirrored -
 * unmirrored| is at most that. The resampling draws on `createRng("adr-089:m5", <row/league/set>)`.
 * The difference's own SE, sqrt(SE_u^2 + SE_m^2), is printed beside as information.
 */
import { createRng, type MatchEventEnvelope } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { dropbacksOf } from "./throwClass.js";

export const M5_RNG_LABEL = "adr-089:m5";
export const BOOTSTRAP_RESAMPLES = 1000;

// --- the noise rule (O10), shared with M9 --------------------------------------------------------

/** One game's numerator and denominator of a ratio row. */
export interface RatioGame {
  readonly num: number;
  readonly den: number;
}

export function ratioOf(games: readonly RatioGame[]): number {
  let n = 0;
  let d = 0;
  for (const g of games) {
    n += g.num;
    d += g.den;
  }
  return d === 0 ? 0 : n / d;
}

/**
 * The game-clustered bootstrap SE of a ratio of sums: `resamples` draws of the games with
 * replacement on `createRng(seed, label)`, the sample SD (n - 1) of the resampled ratios.
 */
export function clusteredBootstrapSE(games: readonly RatioGame[], seed: string, label: string, resamples = BOOTSTRAP_RESAMPLES): number {
  if (games.length === 0 || resamples < 2) return 0;
  const rng = createRng(seed, label);
  const values: number[] = [];
  for (let b = 0; b < resamples; b += 1) {
    let n = 0;
    let d = 0;
    for (let i = 0; i < games.length; i += 1) {
      const g = games[Math.floor(rng.next() * games.length)] as RatioGame;
      n += g.num;
      d += g.den;
    }
    values.push(d === 0 ? 0 : n / d);
  }
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  const ss = values.reduce((a, v) => a + (v - mean) * (v - mean), 0);
  return Math.sqrt(ss / (values.length - 1));
}

/** O10's tolerance: 2 x the larger SE. */
export function noiseTolerance(ses: readonly number[]): number {
  return 2 * Math.max(0, ...ses);
}

export function withinNoise(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

// --- one card's side facts ------------------------------------------------------------------------

export interface SideCard {
  readonly rush: readonly { readonly rusher: string; readonly side?: string }[];
  readonly stunts?: readonly { readonly penetrator: string; readonly looper: string }[];
}

export interface CardSideFacts {
  readonly entries: number;
  readonly entriesNoSide: number;
  /** Some entry states no side. */
  readonly anyNoSide: boolean;
  /** No entry states a side. */
  readonly allNoSide: boolean;
  readonly stunts: number;
  /** Stunts whose two men both state a side. */
  readonly stuntsBothSides: number;
  /** Of those, the looper's side differs from his partner's: D16 moves him. */
  readonly stuntsMoved: number;
}

/** A card's side facts; `ran` filters the stunts to those actually run (a CHECK names the looper). */
export function cardSideFacts(card: SideCard, ran: (looper: string) => boolean = () => true): CardSideFacts {
  const sideOf = new Map(card.rush.map((r) => [String(r.rusher), r.side]));
  const entriesNoSide = card.rush.filter((r) => r.side === undefined).length;
  let stunts = 0;
  let both = 0;
  let moved = 0;
  for (const s of card.stunts ?? []) {
    if (!ran(String(s.looper))) continue;
    stunts += 1;
    const ls = sideOf.get(String(s.looper));
    const ps = sideOf.get(String(s.penetrator));
    if (ls === undefined || ps === undefined) continue;
    both += 1;
    if (ls !== ps) moved += 1;
  }
  return {
    entries: card.rush.length,
    entriesNoSide,
    anyNoSide: entriesNoSide > 0,
    allNoSide: card.rush.length > 0 && entriesNoSide === card.rush.length,
    stunts,
    stuntsBothSides: both,
    stuntsMoved: moved,
  };
}

// --- one game's counts ----------------------------------------------------------------------------

export interface M5Game {
  dropbacks: number;
  escapes: number;
  caught: number;
  bands: Record<string, number>;
  entries: number;
  entriesNoSide: number;
  cardsAnyNoSide: number;
  cardsAllNoSide: number;
  stunts: number;
  stuntsBothSides: number;
  stuntsMoved: number;
}

export function emptyM5Game(): M5Game {
  return { dropbacks: 0, escapes: 0, caught: 0, bands: {}, entries: 0, entriesNoSide: 0, cardsAnyNoSide: 0, cardsAllNoSide: 0, stunts: 0, stuntsBothSides: 0, stuntsMoved: 0 };
}

export function m5GameOf(events: readonly MatchEventEnvelope[], tunables: Tunables): M5Game {
  const g = emptyM5Game();
  const caughtBands: ReadonlySet<string> = new Set<string>(tunables.scramble.bands.filter((b) => b.sacked).map((b) => b.label));
  for (const d of dropbacksOf(events)) {
    g.dropbacks += 1;
    for (const c of d.checks) {
      if (c.checkKind !== "scramble") continue;
      g.escapes += 1;
      const band = c.band ?? "NONE";
      g.bands[band] = (g.bands[band] ?? 0) + 1;
      if (caughtBands.has(band)) g.caught += 1;
    }
    const loopersRun = new Set(d.checks.filter((c) => c.checkKind === "stunt_communication").flatMap((c) => c.actors));
    const f = cardSideFacts({ rush: d.start.rush, stunts: d.start.stunts }, (looper) => loopersRun.has(looper));
    g.entries += f.entries;
    g.entriesNoSide += f.entriesNoSide;
    if (f.anyNoSide) g.cardsAnyNoSide += 1;
    if (f.allNoSide) g.cardsAllNoSide += 1;
    g.stunts += f.stunts;
    g.stuntsBothSides += f.stuntsBothSides;
    g.stuntsMoved += f.stuntsMoved;
  }
  return g;
}

/** The rows M5 compares, each a ratio of per-game sums. */
export const M5_ROWS = {
  escape_caught_rate: (g: M5Game): RatioGame => ({ num: g.caught, den: g.escapes }),
  escape_rate: (g: M5Game): RatioGame => ({ num: g.escapes, den: g.dropbacks }),
  no_side_entry_share: (g: M5Game): RatioGame => ({ num: g.entriesNoSide, den: g.entries }),
  no_side_card_share: (g: M5Game): RatioGame => ({ num: g.cardsAnyNoSide, den: g.dropbacks }),
  all_no_side_card_share: (g: M5Game): RatioGame => ({ num: g.cardsAllNoSide, den: g.dropbacks }),
  looper_moved_share: (g: M5Game): RatioGame => ({ num: g.stuntsMoved, den: g.stuntsBothSides }),
} as const;
export type M5Row = keyof typeof M5_ROWS;

export interface M5Run {
  readonly league: string;
  readonly set: number;
  readonly mirrored: boolean;
  readonly games: readonly M5Game[];
}

function totals(games: readonly M5Game[]): Record<string, unknown> {
  const sum = (k: keyof Omit<M5Game, "bands">): number => games.reduce((a, g) => a + g[k], 0);
  const bands: Record<string, number> = {};
  for (const g of games) for (const [k, v] of Object.entries(g.bands)) bands[k] = (bands[k] ?? 0) + v;
  return {
    games: games.length,
    dropbacks: sum("dropbacks"),
    escapes: sum("escapes"),
    caught: sum("caught"),
    bands,
    entries: sum("entries"),
    entriesNoSide: sum("entriesNoSide"),
    cardsAnyNoSide: sum("cardsAnyNoSide"),
    cardsAllNoSide: sum("cardsAllNoSide"),
    stunts: sum("stunts"),
    stuntsBothSides: sum("stuntsBothSides"),
    stuntsMoved: sum("stuntsMoved"),
  };
}

/** One league's M5 table: per row and set, unmirrored against mirrored, with O10's verdict. */
export function m5Compare(league: string, runs: readonly M5Run[]): Readonly<Record<string, unknown>> {
  const mine = runs.filter((r) => r.league === league);
  if (mine.length === 0) throw new Error(`m5: no runs for ${league}`);
  const sets = [...new Set(mine.map((r) => r.set))].sort();
  const runOf = (set: number, mirrored: boolean): M5Run => {
    const r = mine.find((x) => x.set === set && x.mirrored === mirrored);
    if (r === undefined) throw new Error(`m5: no ${mirrored ? "mirrored" : "unmirrored"} run for ${league} set ${String(set)}`);
    return r;
  };
  const rows: Record<string, unknown> = {};
  for (const row of Object.keys(M5_ROWS) as M5Row[]) {
    const pick = M5_ROWS[row];
    const perSet = sets.map((set) => {
      const u = runOf(set, false).games.map(pick);
      const m = runOf(set, true).games.map(pick);
      const seU = clusteredBootstrapSE(u, M5_RNG_LABEL, `${row}/${league}/set${String(set)}/unmirrored`);
      const seM = clusteredBootstrapSE(m, M5_RNG_LABEL, `${row}/${league}/set${String(set)}/mirrored`);
      return { set, unmirrored: ratioOf(u), mirrored: ratioOf(m), seUnmirrored: seU, seMirrored: seM, seDifference: Math.sqrt(seU * seU + seM * seM) };
    });
    const tolerance = noiseTolerance(perSet.map((s) => s.seUnmirrored));
    rows[row] = {
      tolerance,
      sets: perSet.map((s) => ({ ...s, difference: s.mirrored - s.unmirrored, withinNoise: withinNoise(s.mirrored, s.unmirrored, tolerance) })),
      withinNoiseOnEverySet: perSet.every((s) => withinNoise(s.mirrored, s.unmirrored, tolerance)),
    };
  }
  return {
    league,
    rows,
    totals: Object.fromEntries(mine.map((r) => [`set${String(r.set)}/${r.mirrored ? "mirrored" : "unmirrored"}`, totals(r.games)])),
    escapeDirection: "not on today's stream (QB_DECISION.direction is P11, step 7)",
  };
}
