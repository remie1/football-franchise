/**
 * ADR-089 step 6: SYNTHETIC ARM RECORDS for the grading and harness tests (step-6 plan §6, §7, §8.3).
 *
 * Nothing here was played. Each record is step 5a's committed E9 record at its seed set
 * (`reports/adr-089-step5a.json`, only read; its step-2 and step-3 folds dropped, which step 6's
 * grading never reads), stamped as the arm, with report rows a test sets and step-6 folds built by
 * hand (`synthS6Folds`): every proof read once with no fault, and pocket totals and rows chosen so
 * each clause reads a round number. Every figure is a test's own (CHOSEN), never MEASURED.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isStep6ArmId, STEP6_RUN_IDS, step6ArmDef } from "../src/pocket/arms.js";
import type { SeedSet } from "../src/pocket/corpus.js";
import { emptyM5Game, type M5Game } from "../src/pocket/m5Mirror.js";
import { LEAGUES, type League } from "../src/pocket/report.js";
import { RECOMMENDED_OUTS_OPTIONS } from "../src/pocket/rules.js";
import { emptyStep6LeagueFolds, S6_PROOF_IDS, type Step6LeagueFolds } from "../src/pocket/s6Checks.js";
import { S6_AGREE_ARMS, S6_CROSS_CHECK_ARMS, S6_DIGEST_ARMS, S6_M5_ARMS, STEP6_ARM_FORMAT, STEP6_CLOCK_LABEL, type Step6Record, type Step6RecordRecipe } from "../src/pocket/s6Grade.js";

const STEP5A_JSON = join(import.meta.dirname, "..", "reports", "adr-089-step5a.json");

type Json = Record<string, unknown>;
let skeletons: Partial<Record<SeedSet, Json>> | undefined;

/** Step 5a's committed E9 record at `s`, without its step-2 and step-3 folds (a fresh copy each call). */
export function skeletonOf(s: SeedSet): Json {
  if (skeletons === undefined) {
    const arms = (JSON.parse(readFileSync(STEP5A_JSON, "utf8")) as { readonly arms: Readonly<Record<string, Json>> }).arms;
    const strip = (r: Json | undefined): Json => {
      if (r === undefined) throw new Error("reports/adr-089-step5a.json holds no E9 record");
      const { s2: _s2, s3: _s3, ...rest } = r;
      void _s2;
      void _s3;
      return rest;
    };
    skeletons = { 1: strip(arms["E9.set1"]), 2: strip(arms["E9.set2"]) };
  }
  return structuredClone(skeletons[s]!);
}

/** The synthetic overlay digest: the arm's own, but H13, H14, H15 and H0M carry H0's (as the built arms do: probes and the mirror change no dial). */
export const synthOverlay = (id: string): string => (["H13", "H14", "H15", "H0M"].includes(id) ? "fnv1a:H0" : `fnv1a:${id}`);

/** Each league's report rows the grading reads, as a synthetic record carries them unless a test sets them. */
export const ROW_DEFAULTS: Readonly<Record<string, number>> = Object.freeze({
  sack_rate: 6,
  scramble_rate: 4,
  throwaway_rate_pressured: 9,
  clean_outs_rate: 10,
  sack_share_of_contacts_in_out: 40,
  clean_drill_share: 3,
  "completion_per_aimed_by_throw_class.ON_THE_RUN": 60,
  "int_per_aimed_by_throw_class.ON_THE_RUN": 2.5,
});

/** F5's rows where they differ from the defaults: pressured throwaways at the "about 20%" the clause falls from, clean outs at 8. */
export const F5_ROWS: Readonly<Record<string, number>> = Object.freeze({ throwaway_rate_pressured: 20, clean_outs_rate: 8 });

/** Sets a report row on both leagues (or each league's value). */
export function setRow(r: Step6Record, rowId: string, value: number | null | Readonly<Partial<Record<League, number | null>>>): void {
  const rows = (r.report as unknown as { rows: { id: string; values: Record<string, number | null>; unit?: string; dp?: number }[] }).rows;
  let row = rows.find((x) => x.id === rowId);
  if (row === undefined) {
    row = { id: rowId, values: { flat: null, gen: null }, unit: "%", dp: 2 };
    rows.push(row);
  }
  for (const l of LEAGUES) {
    const v = typeof value === "object" && value !== null ? value[l] : value;
    if (v !== undefined) row.values[l] = v;
  }
}

/** M5's games on H0 (directions 6 LEFT, 4 RIGHT a game) or on its mirror (4 LEFT, 6 RIGHT), ten a league. */
export function synthM5Games(mirrored: boolean): M5Game[] {
  return Array.from({ length: 10 }, (_, i) => ({
    ...emptyM5Game(),
    dropbacks: 100 + i,
    escapes: 10,
    caught: 2,
    bands: { ESCAPED: 8, CAUGHT_FROM_BEHIND: 2 },
    s6: { catchesSacked: 1, catchesShed: 1, directions: mirrored ? { LEFT: 4, RIGHT: 6 } : { LEFT: 6, RIGHT: 4 } },
  }));
}

/** The stripped digests the equality arms keep (equal on every arm, so H12 and H6 equal F5 and HBN equals E9). */
export const SYNTH_DIGESTS: readonly string[] = Object.freeze(Array.from({ length: 10 }, (_, i) => `fnv1a:g${String(i)}`));

/**
 * One league's step-6 folds for `id`: every proof read once, no fault; 1,000 dropbacks, 300 of them
 * pressured; 60 sacks, 6 by the rescoring (10% of sacks); 40 throwaways (4 per 100); in-pocket
 * contacts 40 sacks of 100, out of it 38 of 100; failed escapes 36 of 120 rolls (30%); the sacker
 * mix out of the pocket 10 points more off-ball and 10 fewer interior; the M5 games, digests,
 * cross-check and ratings on the arms whose folds keep them.
 */
export function synthS6Folds(id: string, league: League): Step6LeagueFolds {
  const f = emptyStep6LeagueFolds();
  for (const p of S6_PROOF_IDS) f.checked[p] = 1;
  const s6 = isStep6ArmId(id);
  f.rows.dropbacks = 1000;
  f.rows.s6Dropbacks = s6 ? 1000 : 0;
  Object.assign(f.rows.byPocket.CLEAN, { dropbacks: 700, sacks: 10, failedScrambleSacks: 1, scrambles: 30, boxScoreScrambles: 28, escapes: 70, escapeRolls: 20, failedEscapeRolls: 6, throwaways: 10, outOfPocketThrowaways: 4 });
  Object.assign(f.rows.byPocket.PRESSURED, { dropbacks: 300, sacks: 50, failedScrambleSacks: 5, scrambles: 20, boxScoreScrambles: 15, escapes: 40, escapeRolls: 100, failedEscapeRolls: 30, throwaways: 30, outOfPocketThrowaways: 10 });
  f.rows.pressuredOrSacked = { dropbacks: 320, sacks: 60 };
  f.rows.rollsByOfferBand = { RUSHED: { rolls: 40, failed: 16 }, SOUND: { rolls: 80, failed: 20 } };
  const third = (k: number) => ({ cleanDropbacks: 230 + k, cleanScrambles: 6 + k, cleanBoxScoreScrambles: 5 + k, deadlineThrowaways: 4 - k, dropbacks: 330 + k });
  f.rows.thirds = league === "flat" ? { MID: third(0) } : { LOW: third(0), MID: third(1), HIGH: third(2) };
  f.rows.m3.byPocket = { in: { interior: 30, edge: 50, offball: 10, db: 10 }, out: { interior: 20, edge: 50, offball: 20, db: 10 } };
  Object.assign(f.counts, {
    behindLine: 1,
    "rolls.band.ESCAPED": 84,
    "rolls.band.CONTAINED": 24,
    "rolls.band.CAUGHT_FROM_BEHIND": 12,
    "rolls.outcome.ESCAPED": 84,
    "rolls.repeat": 0,
    "sacks.IN_POCKET": 40,
    "sacks.FAILED_SCRAMBLE": 6,
    "throwaways.OUT_OF_POCKET": 14,
    "deadline.THROWAWAY": 3,
    "deadline.RUN": 1,
    "drill.dice": 9,
    "spent.HOLD": 2,
  });
  f.onTheRun.CLEAN = { aimed: 200, completions: 130, interceptions: 4 };
  f.onTheRun.PRESSURED = { aimed: 100, completions: 50, interceptions: 3 };
  f.pocket = {
    dropbacks: 1000,
    pressuredDropbacks: 300,
    throwaways: 40,
    pressuredThrowaways: 27,
    throwawaysByCause: { OUT_OF_POCKET: 14, NO_TARGET: 26 },
    sacks: 60,
    pressuredSacks: 50,
    failedScrambleSacks: 6,
    scrambles: 50,
    contactsIn: 100,
    sacksIn: 40,
    contactsOut: 100,
    sacksOut: 38,
    cleanEscapes: 70,
    sacksCleanAtSack: 8,
    sackSecondsN: 60,
    sackSecondsSum: 228,
  };
  if (S6_AGREE_ARMS.includes(id)) f.agree = { games: 10, sacks: 60, failedScrambleSacks: 6, nobody: 0, fallbacks: 0 };
  if (S6_M5_ARMS.includes(id)) f.m5 = synthM5Games(id === "H0M");
  if (S6_DIGEST_ARMS.includes(id)) f.digests = [...SYNTH_DIGESTS];
  if (S6_CROSS_CHECK_ARMS.includes(id)) f.crossCheck = { dropbacks: 1000, movementChecks: 200, unread: 200, cleanPicks: 5, deadlinePicks: 4, readerDeadlinePicks: 4 };
  const ratings = step6ArmDef(id)?.step6.ratings;
  if (ratings !== undefined) f.ratings = { games: 10, men: 30, byAttr: Object.fromEntries(ratings.map((o) => [o.attr, { men: 30, sumChange: o.attr === "speed" ? 300 : 900 }])) };
  return f;
}

/** The recipe a synthetic step-6 record carries: its definition's, under the recommended answers. */
export function synthRecipe(id: string): Step6RecordRecipe | undefined {
  const d = step6ArmDef(id);
  if (d === undefined) return undefined;
  return { kind: d.step6.kind, parts: [...d.step6.parts], outsOptions: { ...RECOMMENDED_OUTS_OPTIONS }, ratingOverridesDigest: d.step6.ratings === undefined ? "none" : `fnv1a:ratings-${id}`, mirror: d.step6.mirror === true };
}

export interface SynthOptions {
  /** The record's stamp (default: the skeleton's, as the arm with `synthOverlay`). */
  readonly stamp?: (id: string, s: SeedSet) => object;
  /** The record's recipe (default `synthRecipe`). */
  readonly recipe?: (id: string) => Step6RecordRecipe | undefined;
}

/** One synthetic record of `id` at `s`: the skeleton, stamped, with the default rows (F5's own) and step-6 folds. */
export function synthRecord(id: string, s: SeedSet, o: SynthOptions = {}): Step6Record {
  const base = skeletonOf(s);
  const stamp = o.stamp?.(id, s) ?? { ...(base["stamp"] as Json), arm: id, rules: isStep6ArmId(id) ? "pocket-1.s6" : (base["stamp"] as Json)["rules"], overlayDigest: synthOverlay(id) };
  const recipe = (o.recipe ?? synthRecipe)(id);
  const r = { ...base, format: STEP6_ARM_FORMAT, stamp, clock: STEP6_CLOCK_LABEL, ...(recipe === undefined ? {} : { step6: recipe }), s6: { flat: synthS6Folds(id, "flat"), gen: synthS6Folds(id, "gen") } } as unknown as Step6Record;
  for (const [row, v] of Object.entries(ROW_DEFAULTS)) setRow(r, row, v);
  if (id === "F5") for (const [row, v] of Object.entries(F5_ROWS)) setRow(r, row, v);
  const report = r.report as unknown as { sacks: Record<League, object>; p2s: Record<League, number | null> };
  for (const l of LEAGUES) {
    report.sacks[l] = { dropbacks: 1000, sacks: 60, pressuredSacks: 50, pressuredDropbacks: 300 };
    report.p2s[l] = 20;
    // S-18 reads step 5's desperation throws after a clean break-out: none unless a test sets them.
    (r.s5[l].extra as { onRunDesperation: number }).onRunDesperation = 0;
  }
  return r;
}

export type SynthRecords = Map<string, Partial<Record<SeedSet, Step6Record>>>;

/** Synthetic records of `ids` (default: step 6's whole run) on both seed sets. */
export function synthRecords(ids: readonly string[] = STEP6_RUN_IDS, o: SynthOptions = {}): SynthRecords {
  return new Map(ids.map((id) => [id, { 1: synthRecord(id, 1, o), 2: synthRecord(id, 2, o) }]));
}

/** `f` on each record of `id` at each seed set and league given (default: both and both). */
export function onRecord(m: SynthRecords, id: string, f: (r: Step6Record, s: SeedSet) => void, sets: readonly SeedSet[] = [1, 2]): void {
  for (const s of sets) {
    const r = m.get(id)?.[s];
    if (r === undefined) throw new Error(`no synthetic ${id} set ${String(s)}`);
    f(r, s);
  }
}

/** A step-6 fold of `r` on `l`, writable. */
export const s6Of = (r: Step6Record, l: League): Step6LeagueFolds => r.s6[l] as Step6LeagueFolds;

/** The references the replays read (D1 and E9 by set), deep copies of the synthetic records. */
export function synthReferences(m: SynthRecords): Map<string, object> {
  const out = new Map<string, object>();
  for (const id of ["D1", "E9"]) for (const s of [1, 2] as const) {
    const r = m.get(id)?.[s];
    if (r !== undefined) out.set(`${id}.set${String(s)}`, structuredClone(r));
  }
  return out;
}

/** F5's second fresh plays, deep copies of F5's records. */
export function synthFresh(m: SynthRecords): Partial<Record<SeedSet, Step6Record>> {
  const f = m.get("F5");
  return { ...(f?.[1] === undefined ? {} : { 1: structuredClone(f[1]) }), ...(f?.[2] === undefined ? {} : { 2: structuredClone(f[2]) }) };
}
