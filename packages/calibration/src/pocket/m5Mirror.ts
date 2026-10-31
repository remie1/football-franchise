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
 *
 * **Step 3's exact free-run mirror row** (ADR-089 step 3, plan §2.7, §2.8; critique 3 N6). Written
 * only for a game with a play whose `PLAY_START.rules` names `pocket-1.s3`, so step 0's M5 and P-7
 * stay byte-identical: such a game's `M5Game` carries `freeRun`, each such play's snap picture
 * (every defender's spot relative to the ball, the call and the rush) and the men on the free-run
 * clock under the arm's own reading (`freeRunKey.ts`) with the `etaTick` each first published. The
 * free-run clock reads a man's width only through its size, so a play whose mirrored game drew the
 * mirrored picture (every x -> -x about the ball, the same depths, the same call and rush) must
 * publish the same `etaTick` for every man on the clock in both, to the tenth: not within noise,
 * exactly. `m5FreeRunMirror` pairs the games by place and the plays by id, compares every man on
 * the clock in both whose picture mirrors, and counts each tenth that differs; `m5Compare` adds it
 * as `freeRunMirror` only when some game carries it.
 */
import { createRng, type MatchEventEnvelope } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { centerOfPlayStart, clockKeyOf, onClockUnder, touchOfCheck, type Touch } from "./freeRunKey.js";
import { POCKET_1_S3_RULES, rulesOnPlayStart } from "./rules.js";
import { dropbacksOf, playsOf } from "./throwClass.js";

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

/** One s3 play's picture as the free-run mirror reads it, and its men on the free-run clock. */
export interface FreeRunMirrorPlay {
  readonly playId: string;
  /** `PLAY_START.offense.call` and the rush (rusher, move, alignment), which the mirror keeps. */
  readonly call: string;
  readonly rush: string;
  /** Every defender's spot as [player, x - ballX, y], in the picture's order. */
  readonly defense: readonly (readonly [string, number, number])[];
  /** The men on the free-run clock under the arm's reading: his first published `etaTick` and origin. */
  readonly men: readonly { readonly rusher: string; readonly origin: string; readonly eta: number }[];
}

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
  /** Step 3 only: present on a game with a `pocket-1.s3` play, absent on every other (step 0's M5 is unchanged). */
  freeRun?: FreeRunMirrorPlay[];
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
  const freeRun = freeRunMirrorPlaysOf(events, tunables);
  if (freeRun.length > 0) g.freeRun = freeRun;
  return g;
}

/** The s3 plays of a game with a snap picture, as the free-run mirror reads them (empty with none). */
export function freeRunMirrorPlaysOf(events: readonly MatchEventEnvelope[], tunables: Tunables): FreeRunMirrorPlay[] {
  const key = clockKeyOf(tunables);
  const out: FreeRunMirrorPlay[] = [];
  for (const slice of playsOf(events)) {
    const first = slice.events[0]?.event;
    if (first?.type !== "PLAY_START") continue;
    const payload = first.payload as {
      readonly kind?: unknown;
      readonly offense?: { readonly call?: unknown };
      readonly defense?: { readonly rush?: readonly { readonly rusher?: unknown; readonly move?: unknown; readonly alignment?: unknown }[] };
      readonly snap?: { readonly ballX: number; readonly defense: readonly { readonly player: unknown; readonly x: number; readonly y: number }[] };
    };
    if (payload.kind !== "PASS_PLAY_V1" || rulesOnPlayStart(first.payload)?.name !== POCKET_1_S3_RULES || payload.snap === undefined) continue;
    const snap = payload.snap;
    const center = centerOfPlayStart(first.payload);
    const touches = new Map<string, Touch>();
    const men: { rusher: string; origin: string; eta: number }[] = [];
    const seen = new Set<string>();
    for (const { event } of slice.events) {
      if (event.type === "CHECK" && event.payload.roll !== undefined) {
        const touch = touchOfCheck(event.payload, center);
        if (touch !== undefined) touches.set(event.payload.roll.rngLabel, touch);
      } else if (event.type === "RUSH_THREAT") {
        const t = event.payload;
        const rusher = String(t.rusher);
        if (seen.has(rusher)) continue;
        seen.add(rusher);
        if (onClockUnder(key, t.origin, touches.get(t.rollRef))) men.push({ rusher, origin: t.origin, eta: t.etaTick });
      }
    }
    out.push({
      playId: slice.playId,
      call: String(payload.offense?.call ?? ""),
      rush: (payload.defense?.rush ?? []).map((r) => `${String(r.rusher)}:${String(r.move)}:${String(r.alignment)}`).join(","),
      defense: snap.defense.map((d) => [String(d.player), d.x - snap.ballX, d.y] as const),
      men,
    });
  }
  return out;
}

const SPOT_TOLERANCE = 1e-9;

/** Whether `m`'s picture is `u`'s mirrored: the same call, rush and men, every x - ballX turned round, the same depths. */
export function picturesMirror(u: FreeRunMirrorPlay, m: FreeRunMirrorPlay): boolean {
  if (u.call !== m.call || u.rush !== m.rush || u.defense.length !== m.defense.length) return false;
  const byPlayer = new Map(m.defense.map(([p, dx, y]) => [p, { dx, y }]));
  return u.defense.every(([p, dx, y]) => {
    const o = byPlayer.get(p);
    return o !== undefined && Math.abs(o.dx + dx) < SPOT_TOLERANCE && Math.abs(o.y - y) < SPOT_TOLERANCE;
  });
}

export interface FreeRunMirrorRow {
  /** s3 plays read in each run, and the plays whose pictures mirror. */
  readonly playsUnmirrored: number;
  readonly playsMirrored: number;
  readonly playsPaired: number;
  /** Men on the clock in both games of a paired play, compared; those whose tenths differ. */
  readonly menCompared: number;
  readonly menDiffering: number;
  /** Men on the clock in one of the pair only (the line's dice put them on it in one game), not compared. */
  readonly menInOneOnly: number;
  /** Every compared man's tenth equal, and at least one compared. */
  readonly exact: boolean;
  readonly sample: readonly string[];
}

/** The exact free-run mirror row: games paired by place, plays by id, men by id (plan §2.8). */
export function m5FreeRunMirror(unmirrored: readonly M5Game[], mirrored: readonly M5Game[]): FreeRunMirrorRow {
  let playsU = 0;
  let playsM = 0;
  let paired = 0;
  let compared = 0;
  let differing = 0;
  let oneOnly = 0;
  const sample: string[] = [];
  const n = Math.max(unmirrored.length, mirrored.length);
  for (let i = 0; i < n; i += 1) {
    const u = unmirrored[i]?.freeRun ?? [];
    const m = mirrored[i]?.freeRun ?? [];
    playsU += u.length;
    playsM += m.length;
    const mById = new Map(m.map((p) => [p.playId, p]));
    for (const up of u) {
      const mp = mById.get(up.playId);
      if (mp === undefined || !picturesMirror(up, mp)) continue;
      paired += 1;
      const mMen = new Map(mp.men.map((x) => [`${x.rusher}/${x.origin}`, x]));
      for (const x of up.men) {
        const y = mMen.get(`${x.rusher}/${x.origin}`);
        if (y === undefined) {
          oneOnly += 1;
          continue;
        }
        mMen.delete(`${x.rusher}/${x.origin}`);
        compared += 1;
        if (x.eta !== y.eta) {
          differing += 1;
          if (sample.length < 20) sample.push(`game ${String(i)} ${up.playId} ${x.rusher} (${x.origin}): ${String(x.eta)} unmirrored, ${String(y.eta)} mirrored`);
        }
      }
      oneOnly += mMen.size;
    }
  }
  return { playsUnmirrored: playsU, playsMirrored: playsM, playsPaired: paired, menCompared: compared, menDiffering: differing, menInOneOnly: oneOnly, exact: compared > 0 && differing === 0, sample };
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
  const sum = (k: keyof Omit<M5Game, "bands" | "freeRun">): number => games.reduce((a, g) => a + g[k], 0);
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
  const s3 = mine.some((r) => r.games.some((g) => g.freeRun !== undefined));
  return {
    league,
    rows,
    totals: Object.fromEntries(mine.map((r) => [`set${String(r.set)}/${r.mirrored ? "mirrored" : "unmirrored"}`, totals(r.games)])),
    escapeDirection: "not on today's stream (QB_DECISION.direction is P11, step 7)",
    // Step 3 only (an s3 stream): the exact free-run mirror row, per set.
    ...(s3 ? { freeRunMirror: Object.fromEntries(sets.map((set) => [`set${String(set)}`, m5FreeRunMirror(runOf(set, false).games, runOf(set, true).games)])) } : {}),
  };
}

/** One row's z on one seed set: mirrored minus unmirrored over the difference's own SE (`null` when that SE is 0). */
export interface M5RowZ {
  readonly set: number;
  readonly difference: number;
  readonly seDifference: number;
  readonly z: number | null;
}

/**
 * Step 3's M5 z per row (ADR-089 step 3, plan §2.8; critique 4 S4-10): for each row and seed set of a
 * league's `m5Compare` table, the difference over its own SE, sqrt(SE_u^2 + SE_m^2), printed beside
 * O10's verdict. Read off the table as `m5Compare` returns it, whose shape the step-0 filing holds
 * and which this leaves unchanged; a zero SE (a row with no events on either side) has no z.
 */
export function m5RowZ(compared: Readonly<Record<string, unknown>>): Readonly<Record<string, readonly M5RowZ[]>> {
  const rows = compared["rows"];
  if (typeof rows !== "object" || rows === null) throw new Error("m5RowZ: the table has no rows");
  const out: Record<string, readonly M5RowZ[]> = {};
  for (const [row, value] of Object.entries(rows as Readonly<Record<string, unknown>>)) {
    const sets = (value as { readonly sets?: unknown }).sets;
    if (!Array.isArray(sets)) throw new Error(`m5RowZ: row ${row} has no sets`);
    out[row] = sets.map((s: { readonly set: number; readonly difference: number; readonly seDifference: number }): M5RowZ => ({
      set: s.set,
      difference: s.difference,
      seDifference: s.seDifference,
      z: s.seDifference === 0 ? null : s.difference / s.seDifference,
    }));
  }
  return out;
}
