/**
 * ADR-089 step 6: THE STEP-6 FOLDS AND THEIR FOLD-TIME PROOFS (step-6 plan §3.2 K2, §8.2 R-3; AM-13
 * as drafted in `filing.md`; engine-1.md §6, engine-2.md §6 and cal-2.md's rulings).
 *
 * One fold a league, fed every game an arm plays, read with the arm's own tunables (K14), and plain
 * data, so an arm's record carries it:
 *
 *  - **the rows** (`s6Rows.ts`): the failed scrambles' share of sacks, the failed-escape rate, the
 *    box-score scramble count, the pressure variants, the real figures beside, the drill and the
 *    Mobility thirds (from the seed set's rosters, `thirdsOf`, on the generated league);
 *  - **the structural proofs S-11 to S-20**, each a fold-time check on every play stamped
 *    `pocket-1.s6` (`readS6Play`), bound to the arms that carry the part it tests (R-3): the side
 *    with the part reads the part's rule, the side without it reads that the stream carries none of
 *    the part's records. A proof records the plays it read (`checked`) and its faults (`faults`, the
 *    count and the first three); a fault is a build fault, never waived;
 *  - **S-14, the sack readers' agreement**, on the arms whose clauses read `s6.readersAgree`: the
 *    dropback reader, the step-6 reading, the sacker mix and the engine's statline count the same
 *    sacks and credit the same man, game by game, and the metrics fold's totals at the league's end
 *    (`finishStep6League`); the step-4 contact fold and the s4 fold's contacts at the escape site
 *    are compared at grading, from the record;
 *  - **the counts** the report prints beside the clauses (escape rolls by band and outcome, re-rolls
 *    after a shed, the spent case by branch, the label rule's sacks, the deadline picks, the drill's
 *    dice, coverage sacks, every part's affected plays), and the throws on the run by pocket;
 *  - **M5's games** (H0 and H0M: direction and catches), **each game's stripped digest** (F5, E9,
 *    H6, H12 and HBN: the stream equalities S-8' and the fresh plays) and **the movement
 *    cross-check's deadline picks** (`m6Contact.ts`'s `crossCheckMovement`, with no replay, as the
 *    lifted test reads it; cal-2's handoff) on the joint builds, against the step-6 reading's.
 *
 * Every sim figure the fold makes is MEASURED by it on the games it is given; the rules it restates
 * are the engine's (`engine/src/sim/outs.ts`, `passPlay.ts`), named where restated. No die is drawn,
 * nothing here grades, and on a stream with no `pocket-1.s6` play only the rows and the counts read
 * (every proof reads nothing).
 */
import { getAttr } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, PlayerState, Position } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import { buildLeague } from "@ff/franchise";
import { positionsFromSnapshot } from "../knownTruth/pocketChannelShares.js";
import { indexLeague } from "../league/snapshot.js";
import type { SimAccumulator } from "../metrics/collect.js";
import { buildGeneratedLeague } from "../season/generatedLeague.js";
import { cleanPocketOf } from "./cleanPick.js";
import { CORPORA, type SeedSet } from "./corpus.js";
import { dropOfCall, registryAttr } from "./freeRun.js";
import { GOLDEN_STRIP, gameDigest, type StripEntry } from "./golden.js";
import { emptyM3Fold, foldM3Dropback, s4SackCreditOf, s6SackCreditOf, sackCreditsOf } from "./m3SackerMix.js";
import { m5GameOf, type M5Game } from "./m5Mirror.js";
import { appealOf, crossCheckMovement, emptyM6Fold, movementBandOf, ratingReader } from "./m6Contact.js";
import type { OutsPart } from "./rules.js";
import { rowPocketOf, type RowPocket } from "./rows.js";
import type { S5Dropback } from "./s5Stream.js";
import { emptyS6RowsFold, foldS6RowsDropback, type S6RowsFold, type ThirdOf } from "./s6Rows.js";
import { isDeadlinePickLabel, OUT_OF_POCKET, outsOf, readS6Play, SCRAMBLE_DRILL_KIND, throwawayLegalAt, type OutsTunables, type S6Play } from "./s6Stream.js";
import { isAimed, playsOf, readDropback, type Dropback, type ThrowClassifier } from "./throwClass.js";

const TOL = 1e-9;
const same = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const obj = (v: unknown): Readonly<Record<string, unknown>> | undefined => (typeof v === "object" && v !== null ? (v as Readonly<Record<string, unknown>>) : undefined);

// --- the proofs and the parts they read (R-3) ----------------------------------------------------------

/**
 * The fold-time proofs (plan §8.2, S-11 to S-20) and what each reads: the part whose arms its rule
 * binds (the arms without the part are read for the absence of its records), the filed clause it
 * answers where one is filed, and what it holds. S-11c is S-11 with clean break-outs counted
 * (`s6.oneEscapeClean`); S-14 is read on the arms whose clauses carry `s6.readersAgree`.
 */
export const S6_PROOFS = Object.freeze({
  "S-11": { parts: ["escapeCap"], clause: "s6.oneEscape", what: "under the cap, no forced escape roll once his one escape is spent" },
  "S-11c": { parts: ["escapeCap"], clause: "s6.oneEscapeClean", what: "under the cap, no escape roll of any kind once his one escape is spent, but the one second clean roll SECOND_ESCAPE allows" },
  "S-12": { parts: ["noLateHorizonSack"], clause: "s6.horizonSacks", what: "with the part, no horizon sack after an escape, and a play past the clock's last tick only on a live scramble up to its deadline; without it, no play past the last tick" },
  "S-13": { parts: ["scrambleStart"], clause: "s6.behindLine", what: "a scramble run's yards and zone events by the start rule (ZERO_GAIN_ONLY: a run of 0 or less ends at minus the drop, its zone events summing to 0; EVERY_RUN: no run past minus the drop, a run of 0 or less summing its zones to its yards plus the drop); without the part no run ends behind the line" },
  "S-14": { parts: [], clause: "s6.readersAgree", what: "the dropback reader, the step-6 reading, the sacker mix, the statline and the metrics fold count the same sacks and credit the same man" },
  "S-15": { parts: ["throwawayRule", "deadlinePick"], clause: undefined, what: "P10's flag on every throwaway of a play that reads a position (true only out of the pocket) and on no other; OUT_OF_POCKET only from the deadline pick on its tick; under the real rule every in-pocket throwaway on a tick the rule allows" },
  "S-16": { parts: ["drill"], clause: undefined, what: "every scramble_drill CHECK after an ESCAPED roll on its tick, on its roll, once per receiver, with the rep's ratings; none without the part" },
  "S-17": { parts: ["direction"], clause: undefined, what: "the first decision after each roll on its tick: ESCAPED a SCRAMBLE with its side, CONTAINED a HOLD with its side, a catch no side; no other decision names a side, and none without the part" },
  "S-18": { parts: ["deadlinePick"], clause: undefined, what: "the deadline pick at the pursuit's deadline, at most one a play, THROWAWAY (OUT_OF_POCKET naming it) or RUN (a SCRAMBLE run on its tick), no THROW on its tick, its band and choice the restated ranking's; none without the part" },
  "S-19": { parts: ["caughtAsContact"], clause: undefined, what: "a caught escape's contest has its QB_HIT (its roll, its phase, the roll's tick, BLOCKED for a man not ARRIVED, seen by the answer); without the part no contest or QB_HIT follows a catch" },
  "S-20": { parts: ["escapeCap"], clause: undefined, what: "a clean expiry with his escape spent runs the answer's branch (HOLD: a hold; TODAYS_PATH: a throwaway, a hold or nothing; SECOND_ESCAPE: an escape while one is left, then a hold; BELOW_30: a throw or a hold); one with his escape open neither holds nor throws away" },
} as const satisfies Readonly<Record<string, { readonly parts: readonly OutsPart[]; readonly clause: string | undefined; readonly what: string }>>);
export type S6ProofId = keyof typeof S6_PROOFS;
export const S6_PROOF_IDS = Object.keys(S6_PROOFS) as readonly S6ProofId[];

/** The parts an outs block turns on, in `OUTS_PARTS`' order (an absent block turns on none). */
export function partsOfOuts(outs: OutsTunables | undefined): readonly OutsPart[] {
  if (outs === undefined) return [];
  const on: Readonly<Record<OutsPart, boolean>> = {
    throwawayRule: outs.throwawayRule,
    scrambleStart: outs.scrambleStart !== undefined,
    escapeCap: outs.escapeCap !== undefined,
    pursuit: outs.pursuit !== undefined,
    noLateHorizonSack: outs.noLateHorizonSack,
    direction: outs.direction,
    sideCatch: outs.sideCatch !== undefined,
    caughtAsContact: outs.caughtAsContact,
    drill: outs.drill,
    drillBySide: outs.drillBySide,
    deadlinePick: outs.deadlinePick !== undefined,
    failedScrambleSack: outs.failedScrambleSack,
  };
  return (Object.keys(on) as OutsPart[]).filter((p) => on[p]);
}

// --- the fold --------------------------------------------------------------------------------------

export interface FaultList {
  n: number;
  first: string[];
}

/** S-14's tallies on one league (arms reading `s6.readersAgree`). */
export interface AgreeTally {
  games: number;
  sacks: number;
  failedScrambleSacks: number;
  nobody: number;
  fallbacks: number;
}

/** The metrics fold's counts at a league's end (`finishStep6League`): the clauses' denominators and S-14's totals. */
export interface PocketTotals {
  dropbacks: number;
  pressuredDropbacks: number;
  throwaways: number;
  pressuredThrowaways: number;
  throwawaysByCause: Record<string, number>;
  sacks: number;
  pressuredSacks: number;
  failedScrambleSacks: number;
  scrambles: number;
  contactsIn: number;
  sacksIn: number;
  contactsOut: number;
  sacksOut: number;
  cleanEscapes: number;
  sacksCleanAtSack: number;
  sackSecondsN: number;
  sackSecondsSum: number;
}

/**
 * The movement cross-check on one league (`crossCheckMovement` with no replay, as the lifted test
 * reads it): the M2 replay it restates a pick on refuses a stream with step 3's blocks (MEASURED on F5
 * and D1's golden games: "a pass_rush_tick ... before his rep"), so every forced pocket_movement CHECK
 * reads unread, and what it reads is the picks it counts apart: the `:clean` picks and the `:deadline`
 * picks, these against the step-6 reading's deadline picks (cal-2's handoff).
 */
export interface CrossCheckTally {
  dropbacks: number;
  movementChecks: number;
  unread: number;
  cleanPicks: number;
  deadlinePicks: number;
  readerDeadlinePicks: number;
}

export interface OnTheRunCell {
  aimed: number;
  completions: number;
  interceptions: number;
}

/** Step 6's folds on one league (plain data). */
export interface Step6LeagueFolds {
  readonly rows: S6RowsFold;
  /** Plays each proof read. */
  readonly checked: Record<string, number>;
  readonly faults: Record<string, FaultList>;
  readonly counts: Record<string, number>;
  /** Aimed throws of the ON_THE_RUN class (the guard's class view) by the rows' pocket ("rusher got close"). */
  readonly onTheRun: Record<RowPocket, OnTheRunCell>;
  agree: AgreeTally | null;
  pocket: PocketTotals | null;
  /** M5's games (H0, H0M), the free-run pictures left out. */
  m5: M5Game[] | null;
  /** Each game's digest with `STEP6_EQUALITY_STRIP` (F5, E9, H6, H12, HBN). */
  digests: string[] | null;
  /** The movement cross-check's tallies (H0 and HB0): its deadline picks against the step-6 reading's. */
  crossCheck: CrossCheckTally | null;
  /** The probes' rating overrides as they reached the rosters (H13 to H15): the men patched, each rating's mean change. */
  ratings: { games: number; men: number; byAttr: Record<string, { men: number; sumChange: number }> } | null;
}

export function emptyStep6LeagueFolds(): Step6LeagueFolds {
  return {
    rows: emptyS6RowsFold(),
    checked: Object.fromEntries(S6_PROOF_IDS.map((p) => [p, 0])),
    faults: Object.fromEntries(S6_PROOF_IDS.map((p) => [p, { n: 0, first: [] }])),
    counts: {},
    onTheRun: { CLEAN: { aimed: 0, completions: 0, interceptions: 0 }, PRESSURED: { aimed: 0, completions: 0, interceptions: 0 } },
    agree: null,
    pocket: null,
    m5: null,
    digests: null,
    crossCheck: null,
    ratings: null,
  };
}

/** What one league's games are folded with, beside the arm's tunables. */
export interface Step6FoldOptions {
  /** S-14 on this arm (its clauses read `s6.readersAgree`). */
  readonly agree?: boolean;
  /** M5's games kept (H0, H0M). */
  readonly m5?: boolean;
  /** Each game's stripped digest kept (F5, E9, H6, H12, HBN). */
  readonly digests?: boolean;
  /** The movement cross-check's deadline picks read (H0 and HB0; needs `players`). */
  readonly crossCheck?: boolean;
  /** The passer's Mobility third, from the seed set's rosters (the generated league). */
  readonly thirdOf?: ThirdOf;
  /** The guard's class view (AM-12: S5), which classifies the throws on the run. */
  readonly classify: ThrowClassifier;
  /** The rosters as played (the probes' patched snapshot), whose quarterback the deadline pick's restated ranking reads. */
  readonly players?: ReadonlyMap<string, PlayerState>;
}

const bump = (counts: Record<string, number>, key: string, by = 1): void => {
  counts[key] = (counts[key] ?? 0) + by;
};

function fault(L: Step6LeagueFolds, proof: S6ProofId, where: string): void {
  const f = (L.faults[proof] ??= { n: 0, first: [] });
  f.n += 1;
  if (f.first.length < 3) f.first.push(where);
}

function read(L: Step6LeagueFolds, proof: S6ProofId): void {
  L.checked[proof] = (L.checked[proof] ?? 0) + 1;
}

/** One play's events with their ticks, as the checks read them. */
export interface Indexed {
  readonly index: number;
  readonly tick: number;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export function indexed(events: readonly MatchEventEnvelope[]): readonly Indexed[] {
  let tick = 0;
  return events.map(({ event }, index) => {
    if (event.type === "TICK") tick = event.payload.tick;
    return { index, tick, type: event.type, payload: obj((event as { readonly payload?: unknown }).payload) ?? {} };
  });
}

/** The events after `i` on its own tick, in order (the next TICK ends them). */
function restOfTick(xs: readonly Indexed[], i: number): readonly Indexed[] {
  const out: Indexed[] = [];
  for (let j = i + 1; j < xs.length; j++) {
    if (xs[j]!.type === "TICK") break;
    out.push(xs[j]!);
  }
  return out;
}

const checkKindOf = (x: Indexed): string | undefined => (x.type === "CHECK" ? String(x.payload["checkKind"]) : undefined);
const rngLabelOf = (x: Indexed): string | undefined => {
  const roll = obj(x.payload["roll"]);
  return typeof roll?.["rngLabel"] === "string" ? roll["rngLabel"] : undefined;
};

/**
 * A horizon sack after an escape (`s6.horizonSacks`): an escape began (QB_PURSUIT) and the play ends
 * in a sack with no scramble run, no throw and no throwaway (the coverage sack the loop's end gives
 * an escape whose deadline is past the last tick).
 */
export function horizonSackAfterEscape(d: Dropback): boolean {
  return d.pursuitTick !== undefined && d.sacked && !d.scramble && d.throwTick === undefined && d.throwawayTick === undefined;
}

/** 2.3, restated (`engine/src/sim/outs.ts`'s `spentBranch`): the spent case's branch after `rolls` escape rolls. */
export function spentBranchS6(cap: NonNullable<OutsTunables["escapeCap"]>, rolls: number): "HOLD" | "TODAYS_PATH" | "SECOND_ESCAPE" | "BELOW_30" {
  switch (cap.whenSpent) {
    case "HOLD":
    case "CONTAINED_DOES_NOT_SPEND":
      return "HOLD";
    case "TODAYS_PATH":
      return "TODAYS_PATH";
    case "SECOND_ESCAPE":
      return rolls <= cap.maxPerPlay ? "SECOND_ESCAPE" : "HOLD";
    case "BELOW_30":
      return "BELOW_30";
  }
}

/** S-20's allowed clean-expiry outcomes in the spent case, by branch (CHOSEN from the engine's call site, `passPlay.ts` THE SPENT CASE). */
export const SPENT_OUTCOMES: Readonly<Record<ReturnType<typeof spentBranchS6>, readonly string[]>> = Object.freeze({
  HOLD: ["HOLD"],
  TODAYS_PATH: ["THROWAWAY", "HOLD", "NONE"],
  SECOND_ESCAPE: ["ESCAPE"],
  BELOW_30: ["THROW", "HOLD"],
});

/**
 * 2.11 restated (`engine/src/sim/outs.ts`'s `deadlineRanking` and the call site's band clamp): his
 * own ranking of the deadline's two options at urgency 0, THROWAWAY first on a tie, and the option
 * the CHECK's band takes (`takeRank`, clamped to the two). `ratingOf` reads the quarterback as played.
 */
export function deadlineChoiceOf(tunables: Tunables, runMargin: number, ratingOf: (name: string) => number, margin: number): { readonly band: string; readonly choice: "THROWAWAY" | "RUN"; readonly tie: boolean } {
  const a = tunables.pocketMovement.appeal;
  const throwaway = appealOf(tunables, a.throwaway, ratingOf, 0);
  const run = appealOf(tunables, { base: a.throwaway.base + runMargin, terms: a.escape.terms, perUrgencyStep: a.escape.perUrgencyStep }, ratingOf, 0);
  const ranked: readonly ("THROWAWAY" | "RUN")[] = run > throwaway ? ["RUN", "THROWAWAY"] : ["THROWAWAY", "RUN"];
  const band = movementBandOf(tunables, margin);
  return { band: band.label, choice: ranked[Math.min(band.takeRank, ranked.length - 1)]!, tie: run === throwaway };
}

/** The bands a drill's CHECK may carry (2.9: where the defender stands after it). */
export const DRILL_BANDS: readonly string[] = ["TRAILING", "EVEN", "IN_FRONT"];

/**
 * The step-6 plan's stream equalities strip (S-8', R-1): the golden strip, then what an alone arm
 * writes beside the dice it replays: the rules stamp and the scoring marker on PLAY_START, the side
 * on the decision and P10's flag on the throwaway (ADR-089 step 6).
 */
export const STEP6_EQUALITY_STRIP: readonly StripEntry[] = Object.freeze([
  ...GOLDEN_STRIP,
  { adr: "ADR-089", path: "PLAY_START.payload.rules" },
  { adr: "ADR-089", path: "PLAY_START.payload.scoring" },
  { adr: "ADR-089", path: "QB_DECISION.payload.direction" },
  { adr: "ADR-089", path: "THROWAWAY.payload.outsideTackleBox" },
]);

// --- one play's proofs ----------------------------------------------------------------------------------

/** The quarterback's ratings as played, or undefined when the rosters do not hold him. */
function ratingOfQb(players: ReadonlyMap<string, PlayerState> | undefined, qb: string): ((name: string) => number) | undefined {
  const p = players?.get(qb);
  return p === undefined ? undefined : ratingReader(p);
}

/**
 * One step-6 play into the proofs and the counts: `d` its dropback, `s6` its step-6 reading, `x5` its
 * step-5 reading (the clean expiries and the drop floor), `xs` its events with their ticks.
 */
export function checkS6Play(L: Step6LeagueFolds, tunables: Tunables, d: Dropback, s6: S6Play, x5: S5Dropback | undefined, xs: readonly Indexed[], opts: Pick<Step6FoldOptions, "players">): void {
  const outs = outsOf(tunables);
  const parts = new Set(partsOfOuts(outs));
  const c = L.counts;
  const where = d.playId;
  bump(c, "s6Plays");
  // Every part's affected plays (a lower bound by its signature; CHOSEN), and the plays only one part touched.
  const acted: OutsPart[] = [];
  const act = (p: OutsPart, on: boolean): void => {
    if (on && parts.has(p)) acted.push(p);
  };
  act("throwawayRule", d.throwawayTick !== undefined && d.throwawayCause !== OUT_OF_POCKET);
  act("scrambleStart", d.scramble && (d.scrambleYards ?? 1) <= 0);
  act("pursuit", s6.escapes.length > 0);
  act("sideCatch", s6.escapes.length > 0);
  act("noLateHorizonSack", s6.escapes.some((e) => e.outcome === "ESCAPED" && e.tick + tunables.scramble.pursuitSeconds > tunables.clock.maxTick + TOL));
  act("direction", s6.directions.length > 0);
  act("caughtAsContact", s6.escapes.some((e) => e.contestBand !== undefined));
  act("drill", s6.drills.length > 0);
  act("drillBySide", s6.drills.length > 0 && outs?.direction === true);
  act("deadlinePick", s6.deadlinePicks.length > 0);
  act("failedScrambleSack", s6.failedScrambleSack);
  for (const p of acted) bump(c, `acted.${p}`);
  if (acted.length > 0) bump(c, "acted.any");
  if (acted.length === 1) bump(c, `exclusive.${acted[0]!}`);

  // The escape rolls: their bands and outcomes by pocket, a roll after a shed, the label rule's sacks.
  const pocket = rowPocketOf(d);
  const rollEvents = xs.filter((x) => checkKindOf(x) === "scramble");
  let shedBefore = false;
  s6.escapes.forEach((e, i) => {
    bump(c, `rolls.band.${e.band}.${pocket}`);
    bump(c, `rolls.outcome.${e.outcome}.${pocket}`);
    bump(c, `rolls.event.${e.eventOutcome}`);
    if (i > 0) bump(c, "rolls.repeat");
    if (shedBefore) {
      bump(c, "rolls.afterShed");
      if (e.outcome === "ESCAPED") bump(c, "escapes.afterShed");
    }
    if (e.outcome === "CAUGHT_SHED") shedBefore = true;
    if (e.labelRuleSack) bump(c, "labelRuleSacks");
    if (e.outcome === "CAUGHT_SACKED" && e.catcher === undefined) bump(c, "nobodyCatches");
    if (e.contestBand !== undefined) bump(c, "contestsAtEscape");
  });
  if (d.sacked) {
    bump(c, "sacks");
    bump(c, `sacks.${s6.failedScrambleSack ? "failedScramble" : horizonSackAfterEscape(d) ? "horizon" : s6.escapes.some((e) => e.outcome === "CAUGHT_SACKED" && e.tick === s6.endTick) ? "caughtEscape" : pocket}`);
  }
  if (d.throwawayTick !== undefined) bump(c, `throwaways.${d.throwawayCause ?? "NONE"}.${pocket}`);
  if (d.scramble && (d.scrambleYards ?? 0) < 0) bump(c, "behindLine");
  for (const p of s6.deadlinePicks) bump(c, `deadline.${p.choice ?? "NONE"}`);
  for (const x of s6.drills) bump(c, `drill.${x.band ?? "NONE"}`);

  // S-11: the one escape a play.
  const cap = outs?.escapeCap;
  if (cap !== undefined) {
    read(L, "S-11");
    read(L, "S-11c");
    let spentBefore = 0;
    s6.escapes.forEach((e, rollsBefore) => {
      if (spentBefore >= cap.maxPerPlay) {
        if (!e.clean) {
          fault(L, "S-11", `${where} t${String(e.tick)}: a forced escape roll with his escape spent`);
          fault(L, "S-11c", `${where} t${String(e.tick)}: a forced escape roll with his escape spent`);
        } else if (!(cap.whenSpent === "SECOND_ESCAPE" && rollsBefore <= cap.maxPerPlay)) {
          fault(L, "S-11c", `${where} t${String(e.tick)}: a clean escape roll with his escape spent (${cap.whenSpent})`);
        }
      }
      if (e.spends) spentBefore += 1;
    });
  }

  // S-12: the horizon.
  read(L, "S-12");
  const maxTick = tunables.clock.maxTick;
  const pursuitEvent = xs.find((x) => x.type === "QB_PURSUIT");
  const deadlineTick = typeof pursuitEvent?.payload["deadlineTick"] === "number" ? pursuitEvent.payload["deadlineTick"] : undefined;
  if (horizonSackAfterEscape(d)) bump(c, "horizonSacks");
  if (s6.endTick > maxTick + TOL) bump(c, "pastLastTick");
  if (parts.has("noLateHorizonSack")) {
    if (horizonSackAfterEscape(d)) fault(L, "S-12", `${where}: a horizon sack after the escape at ${String(d.pursuitTick)} s`);
    if (s6.endTick > maxTick + TOL && (deadlineTick === undefined || s6.endTick > deadlineTick + TOL)) fault(L, "S-12", `${where}: the play runs to ${String(s6.endTick)} s, past the last tick ${String(maxTick)} s, ${deadlineTick === undefined ? "with no live scramble" : `past its deadline ${String(deadlineTick)} s`}`);
    if (d.pursuitTick !== undefined && d.pursuitTick + tunables.scramble.pursuitSeconds > maxTick + TOL) bump(c, "lateEscapes");
  } else if (s6.endTick > maxTick + TOL) fault(L, "S-12", `${where}: the play runs to ${String(s6.endTick)} s, past the last tick, without the part`);

  // S-13: the scramble start.
  const run = xs.find((x) => x.type === "RUN_RESOLUTION" && x.payload["carryType"] === "SCRAMBLE");
  if (run !== undefined) {
    read(L, "S-13");
    const y = Number(run.payload["yards"]);
    const qb = d.start.quarterback;
    const zoneSum = xs.filter((x) => x.type === "RUSH_ZONE" && String(x.payload["carrier"]) === qb).reduce((a, x) => a + Number(x.payload["yardsInZone"]), 0);
    const start = outs?.scrambleStart;
    if (start === undefined) {
      if (y < 0) fault(L, "S-13", `${where}: a scramble run of ${String(y)} yards, behind the line, without the scramble start`);
    } else {
      let drop: number | undefined;
      try {
        drop = dropOfCall(d.start.call);
      } catch {
        drop = undefined;
      }
      if (drop === undefined) bump(c, "dropUnread");
      else if (start === "ZERO_GAIN_ONLY") {
        if (y <= 0 && !same(y, -drop)) fault(L, "S-13", `${where}: a failed scramble of ${String(y)} yards, not minus the drop ${String(drop)} (ZERO_GAIN_ONLY)`);
        if (y <= 0 && !same(zoneSum, 0)) fault(L, "S-13", `${where}: a failed scramble's zone events sum to ${String(zoneSum)}, not the run as played, 0 (ZERO_GAIN_ONLY)`);
      } else {
        if (y < -drop - TOL) fault(L, "S-13", `${where}: a scramble run of ${String(y)} yards, past minus the drop ${String(drop)} (EVERY_RUN)`);
        if (y <= 0 && !same(zoneSum, y + drop)) fault(L, "S-13", `${where}: a scramble run of ${String(y)} yards whose zone events sum to ${String(zoneSum)}, not ${String(y + drop)} (EVERY_RUN)`);
      }
    }
  }

  // S-15: P10's flag, the OUT_OF_POCKET cause and the real throwaway rule.
  const readsPosition = parts.has("throwawayRule") || parts.has("deadlinePick");
  for (const t of xs.filter((x) => x.type === "THROWAWAY")) {
    read(L, "S-15");
    const cause = String(t.payload["cause"]);
    const hasFlag = "outsideTackleBox" in t.payload;
    const flag = t.payload["outsideTackleBox"];
    if (readsPosition) {
      if (!hasFlag || typeof flag !== "boolean") fault(L, "S-15", `${where} t${String(t.tick)}: a throwaway with no outsideTackleBox on a play that reads a position`);
      else if (flag !== (cause === OUT_OF_POCKET)) fault(L, "S-15", `${where} t${String(t.tick)}: outsideTackleBox ${String(flag)} on a ${cause} throwaway`);
    } else if (hasFlag) fault(L, "S-15", `${where} t${String(t.tick)}: outsideTackleBox on a play that reads no position`);
    if (cause === OUT_OF_POCKET) {
      const pick = xs.find((x) => x.index < t.index && same(x.tick, t.tick) && checkKindOf(x) === "pocket_movement" && isDeadlinePickLabel(rngLabelOf(x) ?? ""));
      if (!parts.has("deadlinePick")) fault(L, "S-15", `${where} t${String(t.tick)}: an OUT_OF_POCKET throwaway without the deadline pick`);
      else if (pick === undefined) fault(L, "S-15", `${where} t${String(t.tick)}: an OUT_OF_POCKET throwaway with no deadline pick on its tick before it`);
      else if (t.payload["rollRef"] !== rngLabelOf(pick)) fault(L, "S-15", `${where} t${String(t.tick)}: an OUT_OF_POCKET throwaway naming ${String(t.payload["rollRef"])}, not its pick ${String(rngLabelOf(pick))}`);
    } else if (parts.has("throwawayRule") && (cause === "POCKET_DURESS" || cause === "CLOCK_EXPIRED")) {
      if (!throwawayLegalAt(d, t.tick, x5?.floorSeconds ?? 0)) fault(L, "S-15", `${where} t${String(t.tick)}: a ${cause} throwaway the real rule does not allow (floor ${String(x5?.floorSeconds ?? 0)} s)`);
    }
  }

  // S-16: the drill.
  const drills = xs.filter((x) => checkKindOf(x) === SCRAMBLE_DRILL_KIND);
  if (drills.length > 0 || parts.has("drill")) read(L, "S-16");
  if (!parts.has("drill")) {
    if (drills.length > 0) fault(L, "S-16", `${where}: ${String(drills.length)} scramble_drill CHECK(s) without the drill`);
  } else {
    const route = registryAttr("routeRunning");
    const man = registryAttr("manCoverage");
    const zone = registryAttr("zoneCoverage");
    const seen = new Map<string, Set<string>>();
    for (const x of drills) {
      const roll = [...rollEvents].reverse().find((r) => r.index < x.index && same(r.tick, x.tick));
      const rollRef = roll === undefined ? undefined : rngLabelOf(roll);
      const rollOutcome = roll === undefined ? undefined : s6.escapes.find((e) => e.index === roll.index)?.outcome;
      const actors = Array.isArray(x.payload["actors"]) ? (x.payload["actors"] as readonly unknown[]).map(String) : [];
      const attrs = Array.isArray(x.payload["testsAttrs"]) ? (x.payload["testsAttrs"] as readonly unknown[]).map(String) : [];
      const label = rngLabelOf(x) ?? "";
      const at = `${where} t${String(x.tick)} ${label}`;
      if (roll === undefined || rollOutcome !== "ESCAPED") fault(L, "S-16", `${at}: a drill CHECK with no ESCAPED roll before it on its tick`);
      else if (x.payload["rollRef"] !== rollRef) fault(L, "S-16", `${at}: a drill CHECK naming ${String(x.payload["rollRef"])}, not its roll ${String(rollRef)}`);
      if (actors.length !== 2) fault(L, "S-16", `${at}: a drill CHECK with ${String(actors.length)} actors, not the receiver and his defender`);
      else if (!label.endsWith(`:drill:${actors[0]!}`)) fault(L, "S-16", `${at}: a drill label that does not end with its receiver ${actors[0]!}`);
      if (!attrs.includes(String(route)) || !(attrs.includes(String(man)) || attrs.includes(String(zone)))) fault(L, "S-16", `${at}: a drill CHECK whose ratings are not a coverage rep's (${attrs.join(", ")})`);
      if (!DRILL_BANDS.includes(String(x.payload["band"]))) fault(L, "S-16", `${at}: a drill band ${String(x.payload["band"])}`);
      const key = rollRef ?? "?";
      const men = seen.get(key) ?? new Set<string>();
      if (actors[0] !== undefined && men.has(actors[0])) fault(L, "S-16", `${at}: a second drill for ${actors[0]} on one escape`);
      if (actors[0] !== undefined) men.add(actors[0]);
      seen.set(key, men);
    }
    for (const r of seen.values()) bump(c, "drill.reps", r.size);
  }

  // S-17: the direction.
  const decisions = xs.filter((x) => x.type === "QB_DECISION");
  const withSide = decisions.filter((x) => "direction" in x.payload);
  if (withSide.length > 0 || parts.has("direction")) read(L, "S-17");
  if (!parts.has("direction")) {
    if (withSide.length > 0) fault(L, "S-17", `${where}: ${String(withSide.length)} decision(s) with a side without the part`);
  } else {
    const firsts = new Set<number>();
    for (const e of s6.escapes) {
      const first = restOfTick(xs, e.index).find((x) => x.type === "QB_DECISION");
      const at = `${where} t${String(e.tick)} ${e.outcome}`;
      if (first !== undefined) firsts.add(first.index);
      const side = first?.payload["direction"];
      const choice = first?.payload["choice"];
      if (e.outcome === "ESCAPED") {
        if (choice !== "SCRAMBLE" || (side !== "LEFT" && side !== "RIGHT")) fault(L, "S-17", `${at}: the escape's decision is ${String(choice)} with side ${String(side)}, not a SCRAMBLE with LEFT or RIGHT`);
      } else if (e.outcome === "CONTAINED") {
        if (choice !== "HOLD" || (side !== "LEFT" && side !== "RIGHT")) fault(L, "S-17", `${at}: the contained roll's decision is ${String(choice)} with side ${String(side)}, not a HOLD with its side`);
      } else if (first !== undefined && "direction" in first.payload) fault(L, "S-17", `${at}: a catch's decision names a side`);
    }
    for (const x of withSide) if (!firsts.has(x.index)) fault(L, "S-17", `${where} t${String(x.tick)}: a ${String(x.payload["choice"])} decision names a side, and it is no roll's first decision`);
  }

  // S-18: the deadline pick.
  const picks = xs.filter((x) => checkKindOf(x) === "pocket_movement" && isDeadlinePickLabel(rngLabelOf(x) ?? ""));
  if (picks.length > 0 || parts.has("deadlinePick")) read(L, "S-18");
  if (outs?.deadlinePick === undefined) {
    if (picks.length > 0) fault(L, "S-18", `${where}: ${String(picks.length)} deadline pick(s) without the part`);
  } else {
    if (picks.length > 1) fault(L, "S-18", `${where}: ${String(picks.length)} deadline picks on one play`);
    for (const p of picks) {
      const at = `${where} t${String(p.tick)}`;
      if (deadlineTick === undefined || !same(p.tick, deadlineTick)) fault(L, "S-18", `${at}: a deadline pick off the pursuit's deadline ${String(deadlineTick)}`);
      const rest = restOfTick(xs, p.index);
      const first = rest.find((x) => x.type === "QB_DECISION");
      const choice = first?.payload["choice"];
      if (rest.some((x) => x.type === "THROW")) fault(L, "S-18", `${at}: a THROW on the deadline pick's tick`);
      if (choice === "THROWAWAY") {
        const t = rest.find((x) => x.type === "THROWAWAY");
        if (t === undefined || t.payload["cause"] !== OUT_OF_POCKET || t.payload["rollRef"] !== rngLabelOf(p)) fault(L, "S-18", `${at}: a THROWAWAY pick with no OUT_OF_POCKET throwaway naming it`);
      } else if (choice === "SCRAMBLE") {
        if (!rest.some((x) => x.type === "RUN_RESOLUTION" && x.payload["carryType"] === "SCRAMBLE")) fault(L, "S-18", `${at}: a RUN pick with no SCRAMBLE run on its tick`);
      } else fault(L, "S-18", `${at}: the deadline pick's decision is ${String(choice)}, not THROWAWAY or SCRAMBLE`);
      const ratingOf = ratingOfQb(opts.players, d.start.quarterback);
      if (ratingOf === undefined) bump(c, "deadline.unrestated");
      else {
        const want = deadlineChoiceOf(tunables, outs.deadlinePick.runMargin, ratingOf, Number(p.payload["margin"]));
        if (want.tie) bump(c, "deadline.ties");
        const got = choice === "THROWAWAY" ? "THROWAWAY" : choice === "SCRAMBLE" ? "RUN" : undefined;
        if (want.band !== p.payload["band"]) fault(L, "S-18", `${at}: the pick's band ${String(p.payload["band"])}, restated ${want.band}`);
        else if (got !== undefined && got !== want.choice) fault(L, "S-18", `${at}: the pick took ${got}, the restated ranking ${want.choice}`);
      }
    }
  }

  // S-19: the caught escape as contact.
  const caught = s6.escapes.filter((e) => e.outcome === "CAUGHT_SACKED" || e.outcome === "CAUGHT_SHED");
  if (caught.length > 0) read(L, "S-19");
  for (const e of caught) {
    const rest = restOfTick(xs, e.index);
    const at = `${where} t${String(e.tick)}`;
    const contest = rest.find((x) => checkKindOf(x) === "arrival_contest");
    if (!parts.has("caughtAsContact")) {
      if (e.contestBand !== undefined || rest.some((x) => x.type === "QB_HIT")) fault(L, "S-19", `${at}: a contest or QB_HIT after a catch without the part`);
      continue;
    }
    if (contest === undefined) {
      if (e.outcome !== "CAUGHT_SACKED") fault(L, "S-19", `${at}: a shed catch with no contest`);
      continue;
    }
    const label = rngLabelOf(contest);
    const hit = rest.find((x) => x.type === "QB_HIT" && x.payload["rollRef"] === label);
    const catcher = Array.isArray(contest.payload["actors"]) ? String((contest.payload["actors"] as readonly unknown[])[0]) : undefined;
    const arrived = rest.some((x) => x.index < contest.index && x.type === "RUSH_THREAT" && x.payload["state"] === "ARRIVED" && String(x.payload["rusher"]) === catcher);
    const blocked = !arrived;
    if (hit === undefined) {
      fault(L, "S-19", `${at}: the caught escape's contest ${String(label)} has no QB_HIT`);
      continue;
    }
    const phase = e.outcome === "CAUGHT_SHED" ? "SHED" : "SACK";
    if (hit.payload["phase"] !== phase) fault(L, "S-19", `${at}: QB_HIT phase ${String(hit.payload["phase"])} on a ${e.outcome} roll`);
    if (typeof hit.payload["contactSeconds"] !== "number" || !same(hit.payload["contactSeconds"], e.tick)) fault(L, "S-19", `${at}: QB_HIT contactSeconds ${String(hit.payload["contactSeconds"])}, not the roll's tick`);
    if ((hit.payload["approach"] === "BLOCKED") !== blocked) fault(L, "S-19", `${at}: QB_HIT approach ${String(hit.payload["approach"])} for a catcher ${blocked ? "not ARRIVED (in his block)" : "ARRIVED"}`);
    const seenWant = outs?.caughtSeen === "UNSEEN_IF_UNREGISTERED" ? !blocked : true;
    if (hit.payload["seen"] !== seenWant) fault(L, "S-19", `${at}: QB_HIT seen ${String(hit.payload["seen"])}, the answer ${String(outs?.caughtSeen ?? "SEEN")} gives ${String(seenWant)}`);
  }

  // S-20: the spent case at a clean expiry.
  if (cap !== undefined && x5 !== undefined) {
    const breakOut = cleanPocketOf(tunables)?.breakOut === true;
    for (const e of x5.cleanExpiries) {
      read(L, "S-20");
      const atIndex = xs.find((x) => same(x.tick, e.tick) && x.type === "TICK")?.index ?? xs.length;
      const spentBefore = s6.escapes.filter((r) => r.index < atIndex && r.spends).length;
      const rollsBefore = s6.escapes.filter((r) => r.index < atIndex).length;
      const pick = x5.picks.find((p) => same(p.tick, e.tick));
      const at = `${where} t${String(e.tick)}`;
      if (spentBefore < cap.maxPerPlay) {
        if (breakOut && (e.outcome === "HOLD" || e.outcome === "THROWAWAY")) fault(L, "S-20", `${at}: a ${e.outcome} on a clean expiry with his escape open`);
        continue;
      }
      if (pick !== undefined && pick.option === "MOVE") continue;
      const branch = spentBranchS6(cap, rollsBefore);
      bump(c, `spent.${branch}.${e.outcome}`);
      if (pick !== undefined && pick.option === "ESCAPE" && branch !== "SECOND_ESCAPE") fault(L, "S-20", `${at}: an escape offered with his escape spent (${cap.whenSpent}, branch ${branch})`);
      else if (!SPENT_OUTCOMES[branch].includes(e.outcome)) fault(L, "S-20", `${at}: the spent case's ${e.outcome} under ${cap.whenSpent} (branch ${branch}: ${SPENT_OUTCOMES[branch].join(", ")})`);
    }
  }
}

// --- one game -------------------------------------------------------------------------------------------

/** What the visit hands one game: its events, the engine's statlines and the seed. */
export interface Step6Game {
  readonly seed?: string;
  readonly events: readonly MatchEventEnvelope[];
  readonly statlines?: readonly { readonly player: unknown; readonly passing: { readonly sacked: number }; readonly defense: { readonly sacks: number } }[];
}

/**
 * One game into a league's step-6 folds, with the arm's tunables, the snapshot as played (its
 * positions read the sacker mix) and the step-5 readings of its dropbacks (`s5DropbacksOf`).
 */
export function foldStep6Game(L: Step6LeagueFolds, game: Step6Game, snapshot: GameSnapshot, tunables: Tunables, opts: Step6FoldOptions, x5s: readonly S5Dropback[]): void {
  const positions: ReadonlyMap<PlayerId, Position> = positionsFromSnapshot(snapshot);
  const positionOf = (id: string): string | undefined => positions.get(id as PlayerId);
  const byPlay = new Map(x5s.map((x) => [x.playId, x]));
  const disagreementsBefore = L.rows.wholePlayPocketDisagreements;
  const outs = outsOf(tunables);
  const credits = new Map<string, number>();
  const m3 = emptyM3Fold();
  let readerSacks = 0;
  let failedScrambleSacks = 0;
  let nobody = 0;
  let fallbacks = 0;
  const cross = opts.crossCheck === true ? emptyM6Fold() : undefined;
  if (cross !== undefined && opts.players === undefined) throw new Error("s6Checks: the movement cross-check reads the rosters as played (opts.players)");
  for (const play of playsOf(game.events)) {
    const d = readDropback(play);
    if (d === undefined) continue;
    bump(L.counts, "dropbacks");
    const s6 = readS6Play(play.events, tunables);
    if (cross !== undefined) {
      const t = (L.crossCheck ??= { dropbacks: 0, movementChecks: 0, unread: 0, cleanPicks: 0, deadlinePicks: 0, readerDeadlinePicks: 0 });
      t.dropbacks += 1;
      t.readerDeadlinePicks += s6?.deadlinePicks.length ?? 0;
      crossCheckMovement(cross, d, [], opts.players!, tunables);
    }
    foldS6RowsDropback(L.rows, d, tunables, s6, positionOf, opts.thirdOf);
    const pocket = rowPocketOf(d);
    if (isAimed(d) && d.throwTick !== undefined && opts.classify(d, tunables).cls === "ON_THE_RUN") {
      const cell = L.onTheRun[pocket];
      cell.aimed += 1;
      if (d.caught) cell.completions += 1;
      if (d.intercepted) cell.interceptions += 1;
    }
    // Coverage sacks: the last status before the sack CLEAN (`coverage_sack_rows`), and their tick.
    if (d.sacked && (d.statuses.at(-1)?.status ?? "CLEAN") === "CLEAN") {
      bump(L.counts, "coverageSacks");
      bump(L.counts, "coverageSackSeconds", d.endTick);
    }
    if (s6 !== undefined) checkS6Play(L, tunables, d, s6, byPlay.get(d.playId), indexed(play.events), opts);
    if (opts.agree === true) {
      read(L, "S-14");
      const where = `${String(game.seed ?? "?")} ${d.playId}`;
      if (s6 === undefined) {
        fault(L, "S-14", `${where}: a dropback with no step-6 reading on an agreement arm`);
        continue;
      }
      if (d.sacked !== s6.sacked) fault(L, "S-14", `${where}: the dropback reader says ${d.sacked ? "sacked" : "not sacked"}, the step-6 reading ${s6.sacked ? "sacked" : "not sacked"}`);
      if ((d.failedScrambleSack === true) !== s6.failedScrambleSack) fault(L, "S-14", `${where}: the failed-scramble sack read two ways`);
      if (outs?.failedScrambleSack !== true && s6.failedScrambleSack) fault(L, "S-14", `${where}: a rescored sack without the marker`);
      if (!s6.marker && d.scramble && (d.scrambleYards ?? 0) <= 0 && d.sacked) fault(L, "S-14", `${where}: a run of 0 or less read as a sack without the marker`);
      foldM3Dropback(m3, d, positionOf, true, s6);
      if (d.sacked) {
        readerSacks += 1;
        if (s6.failedScrambleSack) failedScrambleSacks += 1;
        const own = s6SackCreditOf(d, s6);
        if (own === null) nobody += 1;
        if (own?.statlineFallback === true) fallbacks += 1;
        const credit = own === null ? undefined : (own ?? s4SackCreditOf(d) ?? sackCreditsOf(d));
        if (credit !== undefined) credits.set(credit.last, (credits.get(credit.last) ?? 0) + 1);
      }
    }
  }
  if (L.rows.wholePlayPocketDisagreements !== disagreementsBefore && opts.agree === true) fault(L, "S-14", `${String(game.seed ?? "?")}: ${String(L.rows.wholePlayPocketDisagreements - disagreementsBefore)} dropback(s) whose whole-play pocket and the rows' pocket disagree`);
  if (opts.agree === true) {
    const a = (L.agree ??= { games: 0, sacks: 0, failedScrambleSacks: 0, nobody: 0, fallbacks: 0 });
    a.games += 1;
    a.sacks += readerSacks;
    a.failedScrambleSacks += failedScrambleSacks;
    a.nobody += nobody;
    a.fallbacks += fallbacks;
    const where = String(game.seed ?? "?");
    if (game.statlines !== undefined) {
      const statSacks = game.statlines.reduce((s, x) => s + x.passing.sacked, 0);
      if (statSacks !== readerSacks) fault(L, "S-14", `${where}: the statline's ${String(statSacks)} sacks, the readers' ${String(readerSacks)}`);
      const stat = new Map(game.statlines.filter((x) => x.defense.sacks > 0).map((x) => [String(x.player), x.defense.sacks]));
      const keys = [...new Set([...stat.keys(), ...credits.keys()])].sort();
      const off = keys.filter((k) => (stat.get(k) ?? 0) !== (credits.get(k) ?? 0));
      if (off.length > 0) fault(L, "S-14", `${where}: the sack credit differs from the statline's for ${off.join(", ")}`);
    } else fault(L, "S-14", `${where}: the game came with no statlines`);
    if (m3.sacks !== readerSacks || (m3.noSacker ?? 0) !== nobody || (m3.statlineFallbacks ?? 0) !== fallbacks) {
      fault(L, "S-14", `${where}: the sacker mix counts ${String(m3.sacks)} sacks, ${String(m3.noSacker ?? 0)} with nobody and ${String(m3.statlineFallbacks ?? 0)} statline credits, the readers ${String(readerSacks)}, ${String(nobody)} and ${String(fallbacks)}`);
    }
  }
  if (opts.m5 === true) {
    const g = m5GameOf(game.events, tunables);
    const { freeRun: _drop, ...rest } = g;
    void _drop;
    (L.m5 ??= []).push(rest);
  }
  if (opts.digests === true) (L.digests ??= []).push(gameDigest(game.events, STEP6_EQUALITY_STRIP));
  if (cross !== undefined) {
    const t = (L.crossCheck ??= { dropbacks: 0, movementChecks: 0, unread: 0, cleanPicks: 0, deadlinePicks: 0, readerDeadlinePicks: 0 });
    t.movementChecks += cross.movementChecks;
    t.unread += cross.unreadChecks;
    t.cleanPicks += cross.cleanPicks ?? 0;
    t.deadlinePicks += cross.deadlinePicks ?? 0;
  }
}

/**
 * A league's end: the metrics fold's counts (the clauses' denominators), and S-14's totals on an
 * agreement arm (the metrics fold's sacks and failed-scramble sacks are the readers').
 */
export function finishStep6League(L: Step6LeagueFolds, accumulator: SimAccumulator): void {
  const p = accumulator.play;
  const pf = p.pocket;
  L.pocket = {
    dropbacks: p.dropbacks,
    pressuredDropbacks: p.pressuredDropbacks,
    throwaways: p.throwaways,
    pressuredThrowaways: pf.pressuredThrowaways,
    throwawaysByCause: { ...p.throwawaysByCause },
    sacks: p.sacks,
    pressuredSacks: p.pressuredSacks,
    failedScrambleSacks: p.failedScrambleSacks ?? 0,
    scrambles: p.scrambles,
    contactsIn: pf.contactsIn,
    sacksIn: pf.sacksIn,
    contactsOut: pf.contactsOut,
    sacksOut: pf.sacksOut,
    cleanEscapes: pf.cleanEscapes,
    sacksCleanAtSack: pf.sacksCleanAtSack,
    sackSecondsN: pf.sackSeconds.length,
    sackSecondsSum: pf.sackSeconds.reduce((a, b) => a + b, 0),
  };
  if (L.agree !== null) {
    if (p.sacks !== L.agree.sacks) fault(L, "S-14", `the league: the metrics fold's ${String(p.sacks)} sacks, the readers' ${String(L.agree.sacks)}`);
    if ((p.failedScrambleSacks ?? 0) !== L.agree.failedScrambleSacks) fault(L, "S-14", `the league: the metrics fold's ${String(p.failedScrambleSacks ?? 0)} failed-scramble sacks, the readers' ${String(L.agree.failedScrambleSacks)}`);
  }
}

/** The probes' rating overrides as they reached one game's rosters: each patched man's change, by rating (MEASURED). */
export function foldRatingsGame(L: Step6LeagueFolds, unpatched: GameSnapshot, patched: GameSnapshot, attrs: readonly string[]): void {
  const r = (L.ratings ??= { games: 0, men: 0, byAttr: {} });
  r.games += 1;
  const before = new Map<string, PlayerState>();
  for (const team of [unpatched.home, unpatched.away]) for (const p of Object.values(team.players)) before.set(String(p.bio.id), p);
  for (const team of [patched.home, patched.away]) {
    for (const p of Object.values(team.players)) {
      const b = before.get(String(p.bio.id));
      if (b === undefined) continue;
      let changed = false;
      for (const name of attrs) {
        const id = registryAttr(name);
        const delta = getAttr(p.attributes.values, id) - getAttr(b.attributes.values, id);
        if (delta === 0) continue;
        changed = true;
        const cell = (r.byAttr[name] ??= { men: 0, sumChange: 0 });
        cell.men += 1;
        cell.sumChange += delta;
      }
      if (changed) r.men += 1;
    }
  }
}

// --- the Mobility thirds (plan §6.2; CHOSEN) -----------------------------------------------------------

/** The thirds a passer falls in. */
export const MOBILITY_THIRDS = ["LOW", "MID", "HIGH"] as const;

/**
 * Thirds by Mobility (CHOSEN): the men sorted by their Mobility, then their id, the first third LOW,
 * the second MID, the rest HIGH (a third is `floor(n / 3)` men, the remainder in HIGH).
 */
export function thirdsByMobility(men: readonly { readonly id: string; readonly mobility: number }[]): ReadonlyMap<string, (typeof MOBILITY_THIRDS)[number]> {
  const sorted = [...men].sort((a, b) => a.mobility - b.mobility || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const third = Math.floor(sorted.length / 3);
  return new Map(sorted.map((m, i) => [m.id, i < third ? "LOW" : i < 2 * third ? "MID" : "HIGH"]));
}

/**
 * A seed set's thirds on the generated league, from its rosters before any arm plays (plan §6.2;
 * cal-2's handoff): every quarterback on the season's rated rosters (CHOSEN: every man listed QB,
 * starters and backups, read through the registry), by Mobility. A passer the rosters do not hold
 * reads UNKNOWN (`foldS6RowsDropback`).
 */
export function thirdsOf(seedSet: SeedSet): ThirdOf {
  const def = CORPORA.genSeason;
  const index = indexLeague(buildGeneratedLeague(buildLeague(def.seasonSeed[seedSet]), { season: def.season }));
  const mobility = registryAttr("mobility");
  const men = [...index.players.values()].filter((p) => p.bio.position === "QB").map((p) => ({ id: String(p.bio.id), mobility: getAttr(p.attributes.values, mobility) }));
  const map = thirdsByMobility(men);
  return (passer) => map.get(passer);
}
