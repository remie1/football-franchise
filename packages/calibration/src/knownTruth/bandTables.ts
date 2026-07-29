/**
 * THE BAND-TABLE MONOTONICITY GATE — Charter §4.1: *"an ordered enum whose order carries meaning
 * gets a monotonicity gate."*
 *
 * The second application of that corollary and the larger one. `pocketLadder.ts` gates ONE ordered
 * enum with six status-keyed tables hanging off it. This gates **twenty-six band tables, 248 effect
 * cells, 52 orderable columns** — every array in `Tunables` ordered by `minMargin` descending with
 * directional effect columns beside it. Every one of them is a claim about behaviour (*a strictly
 * worse roll never produces a strictly better effect*) and until ADR-035 not one was asserted.
 *
 * ⚠ **THIS FILE IMPLEMENTS ADR-035 §7 AND DOES NOT REDESIGN IT.** The shape below — derive, scope,
 * assert the floor, drop the CELL, report the blind spots — is ratified. Where this file makes a
 * decision §7 left open it says so in capitals and ADR-037 records it.
 *
 * ================== THE DIVISION OF LABOUR, AND WHY IT IS WHERE IT IS ==================
 *
 * `packages/engine`'s `bandGuards.ts` owns the VOCABULARY: what a band table is
 * (`discoverBandTables`), which columns carry an order (`columnIsOrderable`), where one inverts
 * (`orderViolations`), and — the part that matters — whether a given cell is READ, derived by
 * counterfactual perturbation against the event stream (`deriveGuardedBy`).
 *
 * This file owns everything §7 says is calibration's: **the corpus, the per-row reach census, the
 * floor, what counts as red, and how the report is filed.** It supplies `deriveGuardedBy` with a
 * `StreamObserver` and a `rowReach` map and never reimplements any part of the relation. A local
 * copy of `guardedBy` would be exactly the restated copy §4.1's derivation corollary forbids: *a
 * test that restates the value it verifies is a second source of truth, and the second source is
 * always the one that goes stale.*
 *
 * ================== THE FIVE LOAD-BEARING PROPERTIES (ADR-035 §7) ==================
 *
 *  1. **`GUARDED` is the only exemption.** `UNREAD_COLUMN`, `UNREACHED_ROW`, `UNDER_SAMPLED_ROW`
 *     and `UNPERTURBABLE` are all reported and none of them exempts. A dead cell and dead code are
 *     not the same exemption: a column that is unreadable because a guard stops it is exempt; a
 *     column that is unreadable because nothing calls it is dead code wearing an exemption. This
 *     file does not construct the exemption set at all — it passes `R.exempt` through, and
 *     `R.exempt` contains `GUARDED` and nothing else by construction in the engine.
 *  2. **An exempt cell is dropped from the SEQUENCE, not the column.** `orderViolations(table,
 *     { exempt })` drops the cell and compares its neighbours to each other, which is what *"this
 *     cell is never read"* means for an ordering claim. Dropping the whole column is how a real
 *     inversion hides behind a dead one.
 *  3. **The derivation is scoped to VIOLATING COLUMNS.** 51 cells today, not 248: cost is
 *     proportional to the number of inversions, not to the size of the tables.
 *  4. **`reachFloorApplied` is ASSERTED.** An unfloored relation is a valid object that answers a
 *     weaker question, and ADR-035 §5.1 is the worked example of it answering wrongly — `GIFT` and
 *     `FLOATER` read `GUARDED` on FOUR samples with no guard in existence. `runBandTableGate`
 *     throws rather than returning an unfloored result.
 *  5. **The blind spots are reported, not swallowed.** Under-sampled rows, unread columns,
 *     unperturbable string columns, rows whose label no CHECK emits, and check kinds this file
 *     cannot attribute to a table are all printed with their sizes.
 *
 * ================== HOW REACH IS MEASURED, AND ITS ONE BLIND SPOT MADE LOUD ==================
 *
 * `DeriveOptions.rowReach` wants "how many times the corpus SELECTED this row". The engine cannot
 * supply it (it owns no corpus) and this file will not declare it (a declared table→check-kind map
 * is a second source of truth about resolvers — the thing ADR-035 exists to avoid). So it is
 * DERIVED from the stream, in two steps, both of which are properties of the corpus:
 *
 *   1. Every `CHECK.band` and `PRESNAP_READ.band` in the corpus is counted by `(checkKind, band)`.
 *      Only those two event types, per ADR-004's roll-accounting rule — `PLACEKICK.band` is a
 *      summary that references a `field_goal` CHECK by `rollRef` and counting it would double every
 *      field-goal row.
 *   2. A check kind is the EMITTER of table T iff the set of band labels it emitted is a NON-EMPTY
 *      SUBSET of T's row labels, and T is the only table for which that holds. Reach for a row is
 *      then the count of its label under T's emitters.
 *
 * Subset rather than intersection, and the difference is a real defect this rule avoids:
 * `PARTIAL_TACKLE` is a row of BOTH `ballCarrier.contests.yac.bands` and
 * `ballCarrier.contests.secondLevel.bands`, so an intersection rule would credit `break_tackle`'s
 * 1,549 `PARTIAL_TACKLE` selections to the `yac` table as well and inflate that row's measured 430
 * to 1,979 — 4.6×, in the direction that lifts a row over the floor it should not clear.
 *
 * **WHAT THE RULE CANNOT ATTRIBUTE IS PRINTED, NOT ASSUMED.** The live instance: the `tackle` CHECK
 * emits `TACKLED_FOR_LOSS`/`EVADED` (from `ballCarrier.contests.atLosEvade.bands`) AND
 * `FELL_FORWARD`/`STOPPED` (from `...atLosPower.bands`) — one check kind, two tables, no subset
 * relation. Those two tables therefore get reach 0 from this instrument, and they are reported as
 * `tablesWithNoEmitter` rather than as "measured zero". Neither has an inversion today so neither
 * is in scope; the day one does, the gate says out loud that it cannot floor it.
 *
 * **AN UNMEASURABLE REACH IS SUPPLIED AS 0, NEVER OMITTED.** `deriveGuardedBy` skips the floor
 * comparison for a row whose reach is `undefined`, so an omission would let exactly the rows this
 * file cannot see slip back into `GUARDED`. The map is TOTAL over every row of every discovered
 * table.
 *
 * ================== THE FLOOR ==================
 *
 * `MIN_ROW_REACH = 30`, and it is a power statement rather than a preference. An inert reading over
 * `n` independent selections rules out a per-selection consequence probability `p` at confidence
 * `1 − (1 − p)^n`. At n = 30 a `GUARDED` verdict rules out `p ≥ 10%` at **95.8%**. ADR-035 §5.1's
 * over-exemption happened at **n = 2**, which rules out `p ≥ 10%` at 19% — i.e. at nothing.
 *
 * ================== WHAT RED MEANS — the one thing §7 left to calibration ==================
 *
 * §7 ends `assert F is empty`, and on the committed tree **F is not empty and cannot be made
 * empty**: four inversions survive the derivation, and the owner has RULED two of them no-change
 * (backlog 44). A gate that asserted `F is empty` would be red on every push for reasons its owner
 * has already adjudicated, and Charter §4.1's counter-corollary says what happens next: *a guard
 * that always fires gets deleted.*
 *
 * So the assertion is **`F` equals `KNOWN_INVERSIONS` exactly** — set equality, not containment —
 * plus two assertions about the rows the gate declines on:
 *
 *   - a NEW inversion that survives the derivation is red (nothing adjudicated it);
 *   - a KNOWN inversion that STOPS surviving is *also* red, **and the gate must say WHY it
 *     stopped**. `classifyVanished` separates a change to the DATA (`TABLE_REMOVED`,
 *     `COLUMN_REMOVED`, `CELLS_REMOVED`, `VALUES_CHANGED` — a **FIX**) from a change to the derived
 *     EXEMPTION (`EXEMPTED_BY_DERIVATION` — a **NOTE**, the inversion is still in the table).
 *     **A shrinking inversion count cannot tell a repaired engine from a loosened gate**, and both
 *     arrive as the same decrement;
 *   - a `DECLARED_ABSTENTION` row that has CLEARED the reach floor is red — the population arrived,
 *     which is backlog 45's own instruction turned into something that cannot be forgotten;
 *   - an in-scope row the derivation could not rule on that NO abstention declares is red. §7
 *     property 5 wants blind spots reported; an undeclared one is a blind spot nobody has looked at.
 *
 * That is `pocketLadder.ts`'s `retiredRed` discipline: **a red is retired with its provenance, never
 * deleted**, because a gate that quietly loses the finding it was recorded against is
 * indistinguishable from one that never fired (`CALIBRATION-BACKLOG.md` §22a). Every entry in
 * `KNOWN_INVERSIONS` carries its status, the ruling that produced it, the backlog entry, the
 * measured price, and — via `ruledCells` — a stale-proof assertion that the cell it was ruled about
 * still holds the value it was ruled about. ADR-037 records this decision.
 *
 * ================== THIS GATE HAS BEEN OBSERVED TO GO RED (§22a) ==================
 *
 * *A gate shipped without ever having been observed to fail is indistinguishable from a vacuous
 * one.* **It has gone red three times, and only two of them were staged.**
 *
 * The unstaged one came first and is the best evidence there is: **the gate's first full run went
 * RED on the committed tree**, reporting `tippedBall.qualityBands.speedCheckFromDistance` as
 * VANISHED. ADR-035 §6.3 had predicted that column would *"stay red until calibration has a corpus
 * that reaches those rows"*; measured, the floor keeps `GIFT` and `FLOATER` IN the sequence at
 * value `2`, the three genuine `99` sentinels are exempted on evidence, and `[2, 2, 1]` is monotone.
 * The gate contradicted the ADR that specified it, on its first run, using the ADR's own relation.
 * See `KNOWN_INVERSIONS`' header.
 *
 * The two staged demonstrations run under `FF_BAND_GATE=1 FF_BAND_STAGE=falsify`, and both use the
 * SAME UNEDITED `runBandTableGate`:
 *
 *  1. **The derivation corollary's falsifiable test, executed.** Patch
 *     `throwExec.accuracy.bands.6.catchable` `false → true` — the guard stops holding — and the
 *     three `MISS` cells that derive `GUARDED` on the committed tree derive `LIVE` instead, the
 *     exemption set empties, and `catchMod`, `defenderContestMod` and `difficulty` all reappear as
 *     unadjudicated survivors. **Nothing in this file or in `bandGuards.ts` is edited to make that
 *     happen.** A hand-maintained exemption list would have said "MISS is exempt" in both runs and
 *     the green would have meant nothing in the second.
 *  2. **An injected inversion in a table that has none.** `release.bands.delaySeconds` is monotone
 *     today (0, 0, 0.5, 1, 1, 1.5, 2). Patch the bottom row to 0 and the gate goes red on a live,
 *     unexemptable column.
 *
 * ================== COST, STATED RATHER THAN HIDDEN (§22c) ==================
 *
 * Tier B is env-gated because it costs ~25 minutes — **measured: 104 corpus runs, 1,452 s, 14.0 s a
 * run** — and **the cost is not bought down by reducing
 * `n`**. The recorded corpus is 160 games and `runBandTableGate` refuses a smaller one. Note the
 * direction, because it is unusual for this project: a SMALLER corpus makes this instrument REDDER,
 * not greener — fewer rows clear the floor, so fewer cells can be exempted. The reason to refuse a
 * small corpus is not that it would flatter the gate; it is that the recorded findings would stop
 * being comparable and two of them (`LIVE_BALL`, `WRAPPED_UP`) would drop below the floor and turn
 * a measurement back into an abstention.
 *
 * Tier A — the census, the raw-inversion set and the ruled-cell assertions — is free, runs on every
 * push, and catches every NEW inversion the moment a band table changes. What it structurally
 * cannot catch is a RESOLVER change that makes an exempt cell live, which is the whole reason Tier
 * B exists and the reason it must actually be run. `test/bandTableGate.test.ts` says so where a
 * reader will see it.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import {
  DEFAULT_TUNABLES,
  allCells,
  applyTunablePatch,
  columnIsOrderable,
  deriveGuardedBy,
  discoverBandTables,
  labelledLadderPaths,
  orderViolations,
  type BandCell,
  type BandTable,
  type GuardedByRelation,
  type OrderViolation,
  type Tunables,
} from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { stableDigest } from "../harness/digest.js";
import { runOneGame } from "../harness/runGame.js";
import { buildFixture, buildFixtures } from "../harness/schedule.js";
import { digestSeeds, generateSeeds } from "../harness/seeds.js";
import { buildFlatLeague } from "../league/flat.js";
import { indexLeague } from "../league/snapshot.js";

// ---------------------------------------------------------------------------
// THE CORPUS
// ---------------------------------------------------------------------------

export interface BandGateCorpus {
  readonly games: number;
  readonly batchSeed: string;
  readonly season: number;
  readonly teams: number;
  /** Rows selected fewer times than this are never exempted. See the header's power statement. */
  readonly minRowReach: number;
}

/**
 * 160 games of the flat-60 32-team synthetic league — the same league, caller and schedule
 * `pocketLadder.ts` and `pocketBandSweep.test.ts` use, so a reach figure here is commensurable with
 * a population figure there.
 *
 * WHY 160 AND NOT FEWER. At 96 games `tippedBall.qualityBands.LIVE_BALL` is selected 26 times and
 * `ballCarrier.contests.yac.bands.WRAPPED_UP` 28 — both under the floor, which would convert two
 * rows the corpus genuinely reaches into abstentions. At 160 both clear it comfortably. The only
 * rows still under the floor at 160 are `GIFT` and `FLOATER`, and those are backlog entry 45's
 * DECLARED ABSTENTION, which no corpus this project can honestly build is going to fix.
 *
 * WHY NOT MORE. Cost is `observations × games`, and observations are fixed by the number of
 * inversions. 160 games is ~9 s of simulation per observation; the full gate is ~100 observations.
 */
export const BAND_GATE_CORPUS: BandGateCorpus = {
  games: 160,
  batchSeed: "known-truth:band-table-monotonicity",
  season: 2024,
  teams: 32,
  minRowReach: 30,
};

/** What one pass over the corpus produced. */
export interface CorpusObservation {
  /** A digest of every event, summary and statline the corpus emitted. */
  readonly digest: string;
  readonly plays: number;
  readonly events: number;
  readonly games: number;
  readonly seedDigest: string;
  /** `${checkKind}\u0000${band}` → count. Empty unless `countBands` was set. */
  readonly bandCounts: ReadonlyMap<string, number>;
}

/**
 * FNV-1a folded STRUCTURALLY over the stream, in place, without building a canonical string.
 *
 * ⚠ WHY THIS IS NOT `stableDigest`, WHICH WOULD HAVE BEEN ONE LINE. `stableDigest` canonicalises
 * to text first; over this corpus that is **431 million characters per observation**, and the gate
 * makes ~100 observations. Measured on the smoke run: 20.8 s per corpus run, of which 11.4 s was
 * canonicalisation and 8.8 s was the simulation the gate actually exists to perform. Hashing the
 * values directly removes the allocation and leaves the simulation dominant. §22c forbids buying
 * wall clock by reducing `n`; it does not forbid buying it by making the instrument faster, which
 * is the only kind of saving that costs nothing.
 *
 * It preserves every property `canonicalise` has that this use depends on, and the doc comment on
 * that function is the checklist: object keys SORTED so the digest is a property of the value and
 * not of construction order; `undefined` members dropped; `-0` normalised to `0`; **non-finite
 * numbers distinguished rather than collapsed** the way `JSON.stringify` does. Numbers are mixed as
 * their IEEE-754 bits, which is exact and total where a decimal rendering is neither.
 *
 * Two independent bases, so the observable is effectively 64 bits. The direction of a collision
 * matters and is why 32 was not enough: a collision reads as "the perturbation changed nothing",
 * i.e. as an OVER-EXEMPTION, which is the one failure direction this whole design exists to avoid.
 * At 64 bits the chance of one across a whole gate run is ~5e-18.
 *
 * Type tags on every branch, so `"1"` and `1` and `[1]` cannot hash alike.
 */
interface Fnv {
  a: number;
  b: number;
}

const TAG_NULL = 1;
const TAG_UNDEFINED = 2;
const TAG_TRUE = 3;
const TAG_FALSE = 4;
const TAG_NUMBER = 5;
const TAG_STRING = 6;
const TAG_ARRAY_OPEN = 7;
const TAG_ARRAY_CLOSE = 8;
const TAG_OBJECT_OPEN = 9;
const TAG_OBJECT_CLOSE = 10;
const TAG_KEY = 11;
const TAG_OTHER = 12;

function mixByte(h: Fnv, c: number): void {
  h.a = Math.imul(h.a ^ c, 0x01000193) >>> 0;
  h.b = Math.imul(h.b ^ c, 0x01000105) >>> 0;
}

function foldText(h: Fnv, text: string): void {
  let a = h.a;
  let b = h.b;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000105);
  }
  h.a = a >>> 0;
  h.b = b >>> 0;
}

const NUMBER_BUFFER = new Float64Array(1);
const NUMBER_WORDS = new Uint32Array(NUMBER_BUFFER.buffer);

function mixNumber(h: Fnv, value: number): void {
  mixByte(h, TAG_NUMBER);
  // `-0` and `0` are the same value for every purpose this project has, and `canonicalise`
  // normalises them; their BIT PATTERNS differ, so the normalisation has to be explicit here too.
  NUMBER_BUFFER[0] = value === 0 ? 0 : value;
  const lo = NUMBER_WORDS[0] ?? 0;
  const hi = NUMBER_WORDS[1] ?? 0;
  mixByte(h, lo & 0xff);
  mixByte(h, (lo >>> 8) & 0xff);
  mixByte(h, (lo >>> 16) & 0xff);
  mixByte(h, (lo >>> 24) & 0xff);
  mixByte(h, hi & 0xff);
  mixByte(h, (hi >>> 8) & 0xff);
  mixByte(h, (hi >>> 16) & 0xff);
  mixByte(h, (hi >>> 24) & 0xff);
}

function mixValue(h: Fnv, value: unknown): void {
  if (value === null) {
    mixByte(h, TAG_NULL);
    return;
  }
  switch (typeof value) {
    case "undefined":
      mixByte(h, TAG_UNDEFINED);
      return;
    case "boolean":
      mixByte(h, value ? TAG_TRUE : TAG_FALSE);
      return;
    case "number":
      mixNumber(h, value);
      return;
    case "string":
      mixByte(h, TAG_STRING);
      mixNumber(h, value.length);
      foldText(h, value);
      return;
    case "object": {
      if (Array.isArray(value)) {
        mixByte(h, TAG_ARRAY_OPEN);
        for (const element of value) mixValue(h, element);
        mixByte(h, TAG_ARRAY_CLOSE);
        return;
      }
      mixByte(h, TAG_OBJECT_OPEN);
      // `Object.keys().sort()` rather than `Object.entries()`, because this runs ~900,000 times per
      // observation and the tuple array `entries` allocates is the whole difference. The SORT is
      // not optional: dropping it would make the digest a property of construction order, and a
      // branch that builds the same payload in a different order would read as a moved stream —
      // a FALSE `LIVE`, which is a false red, which §4.1's counter-corollary says gets a gate
      // deleted.
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      for (const key of keys) {
        const child = record[key];
        if (child === undefined) continue;
        mixByte(h, TAG_KEY);
        foldText(h, key);
        mixValue(h, child);
      }
      mixByte(h, TAG_OBJECT_CLOSE);
      return;
    }
    default:
      // `function`, `symbol`, `bigint`. `Tunables` and the event stream are plain data today;
      // this branch exists so an unrecognised member cannot hash to the same value as an absent
      // one, which is the one failure mode a digest must not have.
      mixByte(h, TAG_OTHER);
      foldText(h, String(value));
      return;
  }
}

function fnvText(h: Fnv): string {
  return `fnv2:${(h.a >>> 0).toString(16).padStart(8, "0")}${(h.b >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Run the corpus under one tunables tree and reduce it to a digest.
 *
 * The event stream is the observable because Charter §1.3 pillar 3 makes it the single source of
 * truth; the game SUMMARY and the STATLINES are folded in as well, per `bandGuards.ts`'s note 2 —
 * a cell that moves resulting state without moving an event is a real distinction for `newState`
 * and the caller is the one who can close it.
 */
export function runCorpus(
  tunables: Tunables,
  corpus: BandGateCorpus,
  options: { readonly countBands?: boolean } = {},
): CorpusObservation {
  const league = buildFlatLeague({ teams: corpus.teams });
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, {
    kind: "SYNTHETIC_ROUND_ROBIN",
    rounds: 1,
    season: corpus.season,
  });
  if (fixtures.length < corpus.games) {
    throw new RangeError(
      `the band gate asked for ${String(corpus.games)} games and the schedule yields ` +
        `${String(fixtures.length)}. §22c: n is not negotiable — widen the schedule, never the ask.`,
    );
  }
  const seeds = generateSeeds(corpus.batchSeed, fixtures.length);
  const bandCounts = new Map<string, number>();
  const h: Fnv = { a: 0x811c9dc5, b: 0x811c9dc5 };
  let plays = 0;
  let events = 0;
  const used: string[] = [];

  for (let i = 0; i < corpus.games; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const output = runOneGame({
      built: buildFixture(index, fixture),
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      tunables,
    });
    used.push(seed);
    const stream: readonly MatchEventEnvelope[] = output.observation.events;
    const playIds = new Set<string>();
    for (const envelope of stream) {
      events += 1;
      const event = envelope.event;
      mixValue(h, event);
      if (event.playId !== undefined) playIds.add(String(event.playId));
      if (options.countBands !== true) continue;
      if (event.type === "CHECK" && event.payload.band !== undefined) {
        const key = `${event.payload.checkKind}\u0000${event.payload.band}`;
        bandCounts.set(key, (bandCounts.get(key) ?? 0) + 1);
      } else if (event.type === "PRESNAP_READ" && event.payload.band !== undefined) {
        const key = `${event.payload.kind}\u0000${event.payload.band}`;
        bandCounts.set(key, (bandCounts.get(key) ?? 0) + 1);
      }
    }
    plays += playIds.size;
    mixValue(h, output.observation.summary);
    mixValue(h, output.observation.statlines);
  }

  return {
    digest: fnvText(h),
    plays,
    events,
    games: used.length,
    seedDigest: digestSeeds(used),
    bandCounts,
  };
}

// ---------------------------------------------------------------------------
// THE PER-ROW REACH CENSUS
// ---------------------------------------------------------------------------

export interface ReachCensus {
  /** `${table}.${rowIndex}` → selections. TOTAL over every row of every discovered table. */
  readonly reach: ReadonlyMap<string, number>;
  /** check kind → the band table it emits for. */
  readonly emitterOf: ReadonlyMap<string, string>;
  /**
   * Check kinds whose emitted vocabulary is not a subset of exactly one table's labels. A LOUD
   * blind spot: the reach of whatever tables they serve is unmeasurable by this instrument.
   */
  readonly unattributableKinds: readonly string[];
  /** Tables no emitter was found for. Their rows read 0 and that 0 is NOT a measurement. */
  readonly tablesWithNoEmitter: readonly string[];
  readonly plays: number;
  readonly labelsEmitted: number;
}

export function censusRowReach(tunables: Tunables, observed: CorpusObservation): ReachCensus {
  const tables = discoverBandTables(tunables);
  const labelsOf = new Map<string, ReadonlySet<string>>(
    tables.map((t) => [t.path, new Set(t.rows.map((r) => r.label))] as const),
  );

  const byKind = new Map<string, Map<string, number>>();
  for (const [key, n] of observed.bandCounts) {
    const split = key.indexOf("\u0000");
    const kind = key.slice(0, split);
    const band = key.slice(split + 1);
    const bucket = byKind.get(kind) ?? new Map<string, number>();
    bucket.set(band, (bucket.get(band) ?? 0) + n);
    byKind.set(kind, bucket);
  }

  const emitterOf = new Map<string, string>();
  const unattributable: string[] = [];
  for (const [kind, bands] of [...byKind].sort((a, b) => a[0].localeCompare(b[0]))) {
    const owners = tables.filter((t) => {
      const labels = labelsOf.get(t.path);
      if (labels === undefined) return false;
      return [...bands.keys()].every((b) => labels.has(b));
    });
    if (owners.length === 1 && owners[0] !== undefined) emitterOf.set(kind, owners[0].path);
    else unattributable.push(kind);
  }

  const reach = new Map<string, number>();
  const emitted = new Map<string, Map<string, number>>();
  for (const [kind, table] of emitterOf) {
    const bucket = emitted.get(table) ?? new Map<string, number>();
    for (const [band, n] of byKind.get(kind) ?? []) bucket.set(band, (bucket.get(band) ?? 0) + n);
    emitted.set(table, bucket);
  }

  const noEmitter: string[] = [];
  let labelsEmitted = 0;
  for (const table of tables) {
    const bucket = emitted.get(table.path);
    if (bucket === undefined) noEmitter.push(table.path);
    for (const row of table.rows) {
      const n = bucket?.get(row.label) ?? 0;
      reach.set(`${table.path}.${String(row.index)}`, n);
      labelsEmitted += n;
    }
  }

  return {
    reach,
    emitterOf,
    unattributableKinds: unattributable,
    tablesWithNoEmitter: noEmitter,
    plays: observed.plays,
    labelsEmitted,
  };
}

// ---------------------------------------------------------------------------
// THE FREE HALF — the census and the raw inversion set
// ---------------------------------------------------------------------------

export interface BandTableCensus {
  readonly tables: number;
  readonly rows: number;
  readonly cells: number;
  readonly orderableColumns: number;
  readonly stringColumns: number;
}

export function bandTableCensus(tunables: Tunables = DEFAULT_TUNABLES): BandTableCensus {
  const tables = discoverBandTables(tunables);
  let rows = 0;
  let cells = 0;
  let orderable = 0;
  let strings = 0;
  for (const table of tables) {
    rows += table.rows.length;
    for (const row of table.rows) cells += Object.keys(row.cells).length;
    for (const column of table.columns) {
      if (columnIsOrderable(table, column)) orderable += 1;
      else strings += 1;
    }
  }
  return { tables: tables.length, rows, cells, orderableColumns: orderable, stringColumns: strings };
}

/**
 * RECORDED, MEASURED, and asserted by the free tier. Not a design target — the shape of the tree as
 * committed. A change to any of these numbers means a band table was added, removed or re-shaped,
 * and the correct response is to re-run Tier B rather than to edit this record.
 *
 * Measured against `DEFAULT_TUNABLES` at ADR-036 (`1d02733`). **It was 249 cells at ADR-035
 * (`f3195f3`) and is 248 now**: ADR-036 deleted `tippedBall.qualityBands.DEAD.finalTargetNumber`
 * outright rather than re-spelling the sentinel, so the cell does not exist. The denominator did
 * not move — 52 orderable columns throughout; one of them changed sides.
 */
export const RECORDED_CENSUS: BandTableCensus = {
  tables: 26,
  rows: 119,
  cells: 248,
  orderableColumns: 52,
  stringColumns: 3,
};

/**
 * THE ONE DECLARATION IN THIS FILE, and it is one line long because ADR-035 §1 designed it that
 * way: *the declaration that survives is "which labelled ladders are NOT margin band tables", never
 * "which cells are exempt", which would be long and would rot quietly.*
 *
 * `pocket.thresholds` is keyed on `minProgress` — accumulated pressure, not a roll margin — and is
 * walked by `knownTruth.pocket-status-ladder` instead. `labelledLadderPaths` enumerates every
 * labelled ladder regardless of its threshold key, so a new ladder that is neither discovered as a
 * band table nor on this list breaks the free tier loudly and forces a triage.
 */
export const KNOWN_NON_MARGIN_LADDERS: readonly string[] = ["pocket.thresholds"];

/** Every unexempted inversion in the tree, in table then column order. Free and deterministic. */
export function rawViolations(tunables: Tunables = DEFAULT_TUNABLES): OrderViolation[] {
  return discoverBandTables(tunables).flatMap((t) => orderViolations(t));
}

export function violationKey(v: { readonly table: string; readonly column: string }): string {
  return `${v.table}.${v.column}`;
}

export interface RecordedInversion {
  readonly table: string;
  readonly column: string;
  /** Row LABELS, in table order — every row that carries a cell in this column. */
  readonly rows: readonly string[];
  readonly values: readonly number[];
}

/**
 * The ten columns that invert on the committed tree, RECORDED so the free tier can go red on an
 * eleventh without waiting twenty-five minutes for the derivation.
 *
 * ⚠ **THE SEQUENCE IS RECORDED, NOT JUST THE COLUMN NAME, AND THAT IS THE POINT.** A count cannot
 * distinguish a repaired engine from a loosened gate: an inversion that disappears because a CELL
 * STOPPED EXISTING is a fix, and one that disappears because it was EXEMPTED is a note, and the two
 * arrive as the same decrement. Recording the row labels and the values makes the difference
 * visible — `classifyVanished` below reads it, and the free tier goes red on any change to a
 * violating column's shape, not merely on its disappearance.
 *
 * **IT WAS ELEVEN AND IS NOW TEN, AND THE DELETION IS THE WORKED EXAMPLE.** ADR-036 removed
 * `tippedBall.qualityBands.DEAD.finalTargetNumber` — the cell, not its value — so the column's row
 * list went from six labels to five and the sequence `[20, 35, 55, 75, 90, 0]` became
 * `[20, 35, 55, 75, 90]`, which is monotone. That is a REPAIR, recorded as one.
 *
 * ⚠ WHAT THIS IS AND IS NOT. It is a change detector over the TABLES, not a monotonicity proof:
 * six of the ten are removed by the derived exemption set and four are not, and NOTHING in the free
 * tier can tell which is which. That question is a statement about resolvers and only Tier B can
 * answer it.
 */
export const RECORDED_RAW_INVERSIONS: readonly RecordedInversion[] = [
  {
    table: "ballCarrier.contests.secondLevel.bands",
    column: "maxYards",
    rows: ["BROKEN_TACKLE", "PARTIAL_TACKLE", "TACKLED"],
    values: [0, 4, 0],
  },
  {
    table: "ballCarrier.contests.secondLevel.bands",
    column: "minYards",
    rows: ["BROKEN_TACKLE", "PARTIAL_TACKLE", "TACKLED"],
    values: [0, 2, 0],
  },
  {
    table: "ballCarrier.contests.yac.bands",
    column: "maxYards",
    rows: ["DEFENDER_MISSED", "PARTIAL_TACKLE", "CONTACT_MADE", "WRAPPED_UP", "TACKLED_AT_CATCH"],
    values: [0, 5, 2, 1, 0],
  },
  {
    table: "ballCarrier.contests.yac.bands",
    column: "minYards",
    rows: ["DEFENDER_MISSED", "PARTIAL_TACKLE", "CONTACT_MADE", "WRAPPED_UP", "TACKLED_AT_CATCH"],
    values: [0, 3, 1, 0, 0],
  },
  {
    table: "blitzPickup.bands",
    column: "arrivalDelaySeconds",
    rows: ["PICKED_UP_CLEAN", "PICKED_UP", "RAN_THROUGH", "BLOWN_UP"],
    values: [0, 0, 0.5, 0],
  },
  {
    table: "stunt.bands",
    column: "arrivalDelaySeconds",
    rows: ["PASSED_OFF_CLEAN", "PASSED_OFF", "LATE_EXCHANGE", "LOOPER_FREE"],
    values: [0, 0, 0.5, 0],
  },
  {
    table: "throwExec.accuracy.bands",
    column: "catchMod",
    rows: ["PERFECT", "EXCELLENT", "GOOD", "ADEQUATE", "POOR", "BAD", "MISS"],
    values: [20, 15, 10, 0, -15, -25, 0],
  },
  {
    table: "throwExec.accuracy.bands",
    column: "defenderContestMod",
    rows: ["PERFECT", "EXCELLENT", "GOOD", "ADEQUATE", "POOR", "BAD", "MISS"],
    values: [-15, -10, -5, 0, 10, 15, 0],
  },
  {
    table: "throwExec.accuracy.bands",
    column: "difficulty",
    rows: ["PERFECT", "EXCELLENT", "GOOD", "ADEQUATE", "POOR", "BAD", "MISS"],
    values: [0, 0, 0, 10, 15, 20, 0],
  },
  {
    table: "tippedBall.qualityBands",
    column: "speedCheckFromDistance",
    rows: ["GIFT", "FLOATER", "LIVE_BALL", "CONTESTED", "DIFFICULT", "DEAD"],
    values: [2, 2, 99, 1, 99, 99],
  },
];

/** The measured raw set in `RecordedInversion` shape, so the two can be compared as values. */
export function measuredRawInversions(
  tunables: Tunables = DEFAULT_TUNABLES,
): RecordedInversion[] {
  const out: RecordedInversion[] = [];
  for (const table of discoverBandTables(tunables)) {
    for (const v of orderViolations(table)) {
      out.push({
        table: v.table,
        column: v.column,
        rows: v.rows.map((i) => table.rows[i]?.label ?? `#${String(i)}`),
        values: v.values,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE ADJUDICATED SET — what red means
// ---------------------------------------------------------------------------

/**
 * `RULED_NO_CHANGE` the owner has ruled the cell correct as it stands. It is not a defect and the
 *                   gate must not treat it as one (backlog 44's instruction, verbatim).
 * `OPEN`            a reported, priced finding with no owner ruling yet. Carried so the gate stays
 *                   usable, printed as OPEN every run so it cannot be mistaken for settled.
 *
 * ⚠ **THERE IS NO `DECLARED_ABSTENTION` STATUS HERE, AND THE MEASUREMENT IS WHY.** An abstention is
 * a statement about a ROW whose reach is too small to rule on — not about a column that inverts —
 * and the first real run of this gate proved the two are different (see `DECLARED_ABSTENTIONS`).
 */
export type KnownInversionStatus = "RULED_NO_CHANGE" | "OPEN";

export interface RuledCell {
  /** `applyTunablePatch`'s path language, so staleness is detected by the engine, not by a string. */
  readonly path: string;
  readonly value: number | boolean | string;
}

export interface KnownInversion {
  readonly table: string;
  readonly column: string;
  readonly status: KnownInversionStatus;
  /** Where the ruling or the finding is recorded. */
  readonly source: string;
  /** The sentence the owner (or the abstention) ruled. */
  readonly ruling: string;
  /** Measured reach and price, quoted from the record that measured them. */
  readonly price: string;
  /**
   * The cells the ruling was made ABOUT. The free tier re-applies each as a no-op
   * `applyTunablePatch`, which throws `TunablePatchError` if the tree has moved — so a ruling
   * cannot silently outlive its subject. Same stale-proofing as `pocketLadder.ts`'s `SIZING_DEFECT`.
   */
  readonly ruledCells: readonly RuledCell[];
}

/**
 * ================== THE ADJUDICATED POPULATION ==================
 *
 * ADR-035 §6 predicted five surviving inversions and a sixth once a floor was applied.
 * **THE FIRST REAL RUN MEASURED FOUR, AND BOTH DEPARTURES ARE FINDINGS RATHER THAN NOISE.** They
 * left for opposite reasons and the gate reports the difference, because *an inversion that
 * disappears because a cell stopped existing is a FIX; one that disappears because it was exempted
 * is a NOTE*, and a shrinking count alone cannot tell a repaired engine from a loosened gate.
 *
 * ### 1. `tippedBall.qualityBands.finalTargetNumber` left as a **FIX** ✔
 *
 * ADR-036 (`1d02733`) deleted `DEAD.finalTargetNumber` outright — the CELL, not its value — after
 * ADR-035 §6.1 priced it at 4.766% raw stream reach and **0.000% exclusive outcome reach**. The
 * column's sequence went `[20, 35, 55, 75, 90, 0]` → `[20, 35, 55, 75, 90]`, which is monotone.
 *
 * ⚠ **THE MECHANISM WAS NOT THE ONE THIS FILE PREDICTED, AND THE CORRECTION MATTERS.** The earlier
 * note here said the cell would derive `GUARDED` once the engine stopped emitting the value.
 * `match-engine` corrected it: **`allCells` skips a (row, column) pair whose value is `undefined`,
 * so no cell is produced and no verdict is derived at all.** The distinction is exactly the one
 * ADR-035's title is about — a dead cell has a verdict, a deleted cell has no existence — and it is
 * why `classifyVanished` looks at the TABLE first and the derivation last.
 *
 * ### 2. `tippedBall.qualityBands.speedCheckFromDistance` left as a **NOTE**, and ADR-035 §6.3 was wrong about it ✘
 *
 * §6.3 predicted: *"Under any sane floor they become `UNDER_SAMPLED_ROW` and the column stays red
 * until calibration has a corpus that reaches those rows."* **Measured, it does not.** Not
 * exempting `GIFT` and `FLOATER` leaves their value `2` IN the sequence, and once the three genuine
 * `99` sentinels (`LIVE_BALL`, `DIFFICULT`, `DEAD` — all `GUARDED` on evidence, `maxZoneDistance`
 * 1, 0 and −1) are dropped, what remains is `[2, 2, 1]`, which is monotone. **The column's inversion
 * was manufactured entirely by the sentinels the derivation correctly exempts.**
 *
 * The prediction assumed a floor makes a column redder. It does the opposite here: the floor
 * refuses to EXEMPT the rare rows, which KEEPS them in the sequence, and their honest values happen
 * to be in order. Backlog entry 45's abstention is untouched by this — it was always a statement
 * about two ROWS nobody can measure, never about the column's ordering — and it now lives in
 * `DECLARED_ABSTENTIONS`, where it is asserted rather than merely written down.
 *
 * ### What is left
 *
 * Four columns, all the same §4.1 species: **a sentinel sharing a column with real values**, where
 * the offending cell means *not applicable* and is spelled with a numeral that means something
 * else. Two are owner-ruled no-change; two are open.
 *
 * Every entry below is a RECORD, not a waiver. Nothing here is exempted from the ordering check;
 * all four columns are reported as violations on every run. What the entries do is say which
 * violations have been adjudicated, by whom, and against what measurement — so that an ELEVENTH
 * inversion, or the disappearance of one of these four, is the thing the gate fires on.
 */
export const KNOWN_INVERSIONS: readonly KnownInversion[] = [
  {
    table: "ballCarrier.contests.yac.bands",
    column: "minYards",
    status: "RULED_NO_CHANGE",
    source: "CALIBRATION-BACKLOG.md entry 44 (owner ruling, July 2026); ADR-035 §6.2",
    ruling:
      "No change. A broken tackle crediting zero yards is right BECAUSE the zone walk credits the " +
      "yardage separately — `resolve/ballCarrier.ts:522`, `if (!tackled) yards = max(yards, " +
      "zoneEnd)`. Crediting a minimum on top would double-count the same ground. ⚠ COUPLED TO " +
      "ENTRY 23: if the zone walk is later found to UNDER-credit, this cell is the natural place " +
      "to restore the residual, and that decision must be made ONCE with both halves visible.",
    price: "raw reach 226/3,420 plays (6.608%); `minYards 0→6` is +0.0979 y/p (+293 yards, +68 points)",
    ruledCells: [{ path: "ballCarrier.contests.yac.bands.0.minYards", value: 0 }],
  },
  {
    table: "ballCarrier.contests.secondLevel.bands",
    column: "minYards",
    status: "RULED_NO_CHANGE",
    source: "CALIBRATION-BACKLOG.md entry 44 (owner ruling, July 2026); ADR-035 §6.2",
    ruling:
      "No change, same ruling and same coupling to entry 23 as the `yac` half. +0.3332 y/p is " +
      "exactly what double-counting would buy, which is why it looks like free yardage: it is " +
      "yardage the model has already awarded once.",
    price:
      "raw reach 489/3,420 plays (14.298%); `minYards 0→5` is +0.3332 y/p (+1,437 yards, +109 " +
      "points). For scale the same table's modal row is +1.4735 y/p, which is the evidence that " +
      "this column is the YAC yardage model and not decoration.",
    ruledCells: [{ path: "ballCarrier.contests.secondLevel.bands.0.minYards", value: 0 }],
  },
  {
    table: "ballCarrier.contests.yac.bands",
    column: "maxYards",
    status: "OPEN",
    source: "ADR-035 §6.2 — reported and priced; entry 44 ruled the `minYards` half only",
    ruling:
      "OPEN, and deliberately NOT folded into entry 44. The owner ruled the two `minYards` " +
      "sentinels; the `maxYards` half of the same rows was priced in the same section and not " +
      "ruled on, and inheriting a ruling across columns is exactly the kind of silent widening " +
      "ADR-010 forbids for events. Same species: on the broken-tackle row `0` means 'the zone " +
      "walk supplies the yardage', on the bottom row it means 'he is down where he stands'.",
    price:
      "raw reach 226/3,420 plays (6.608%) on the `DEFENDER_MISSED` row; `maxYards 0→6` is " +
      "−0.1090 y/p. Note the SIGN: raising the cap LOWERS yards per play, because `yardsInBand` " +
      "caps a value the zone walk would otherwise carry.",
    ruledCells: [
      { path: "ballCarrier.contests.yac.bands.0.maxYards", value: 0 },
      { path: "ballCarrier.contests.yac.bands.3.maxYards", value: 1 },
    ],
  },
  {
    table: "ballCarrier.contests.secondLevel.bands",
    column: "maxYards",
    status: "OPEN",
    source: "ADR-035 §6.2 — reported and priced; entry 44 ruled the `minYards` half only",
    ruling:
      "OPEN, same reasoning as the `yac` half. The `BROKEN_TACKLE` and `TACKLED` rows both carry " +
      "`maxYards: 0` around a `PARTIAL_TACKLE` row carrying 4, and the two zeroes mean different " +
      "things.",
    price: "raw reach 489/3,420 plays (14.298%) on the `BROKEN_TACKLE` row",
    ruledCells: [
      { path: "ballCarrier.contests.secondLevel.bands.0.maxYards", value: 0 },
      { path: "ballCarrier.contests.secondLevel.bands.2.maxYards", value: 0 },
    ],
  },
];

export function knownFor(
  known: readonly KnownInversion[],
  table: string,
  column: string,
): KnownInversion | null {
  return known.find((k) => k.table === table && k.column === column) ?? null;
}

/**
 * Re-apply every ruled cell as a no-op patch. `applyTunablePatch` throws `TunablePatchError` when
 * the tree no longer holds the value the patch was written against, so a ruling whose subject has
 * moved fails LOUDLY instead of being inherited by a cell nobody ruled on.
 *
 * This is `pocketLadder.ts`'s `SIZING_DEFECT` trick, and it is why the ruled values are expressed
 * as patches rather than as a comparison written here: the staleness check is the ENGINE's, and it
 * is the same check every real patch goes through.
 */
export function assertRuledCellsCurrent(
  tunables: Tunables = DEFAULT_TUNABLES,
  known: readonly KnownInversion[] = KNOWN_INVERSIONS,
): void {
  for (const entry of known) {
    for (const cell of entry.ruledCells) {
      applyTunablePatch(tunables, {
        tunableId: cell.path,
        currentValue: cell.value,
        proposedValue: cell.value,
        evidence:
          `BAND-TABLE MONOTONICITY GATE — staleness check for the adjudicated inversion ` +
          `${entry.table}.${entry.column} (${entry.status}, ${entry.source}). A no-op patch: it ` +
          `proposes the value it finds, and exists only so that a ruling cannot outlive its subject.`,
        expectedEffect: "none — the proposed value is the current value",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// THE DECLARED ABSTENTIONS — a statement about ROWS, not about columns
// ---------------------------------------------------------------------------

export interface DeclaredAbstention {
  readonly table: string;
  readonly rowLabel: string;
  readonly source: string;
  readonly ruling: string;
  /** What the reach was when the abstention was declared, and on which corpus. */
  readonly measuredReach: string;
}

/**
 * ================== ROWS THE GATE DECLINES TO RULE ON, WITH THE FLOOR STATED ==================
 *
 * `calibration.md` §5.3's live-population precondition, applied per row: *below a stated floor the
 * sweep REFUSES rather than returning a wide-error-bar answer*, and *an instrument that runs and
 * returns something is more dangerous than one that declines.*
 *
 * ⚠ **AN ABSTENTION IS ABOUT A ROW, AND THIS FILE LEARNED THAT BY GETTING IT WRONG.** The first
 * version of this gate carried backlog 45 as an adjudicated INVERSION on
 * `tippedBall.qualityBands.speedCheckFromDistance`, following ADR-035 §6.3's prediction that the
 * column would "stay red" under a floor. It does not — see `KNOWN_INVERSIONS`' header §2. The
 * abstention was never a claim about that column's ordering; it is a claim that **two rows are too
 * rare to rule on**, which stays true whatever the column does, and which no ordering check can
 * express.
 *
 * **THIS IS AN ASSERTION, NOT A NOTE.** Tier B checks each row is STILL below the floor. If a
 * corpus ever reaches one, the gate goes red saying *the population arrived* — which is entry 45's
 * own instruction (*"revisit when a corpus naturally produces the population"*) turned into
 * something that cannot be forgotten. The precedent it cites is exact:
 * `freeRunnerArrivalSeconds` was worth sweeping only after ADR-024 moved its population from
 * **0.13% to 14.20%**, and the fix came first with the measurement following, rather than the
 * measurement being staged.
 */
export const DECLARED_ABSTENTIONS: readonly DeclaredAbstention[] = [
  {
    table: "tippedBall.qualityBands",
    rowLabel: "GIFT",
    source: "CALIBRATION-BACKLOG.md entry 45 (owner ruling, July 2026); ADR-035 §5.1, §6.3",
    ruling:
      "The row's `speedCheckFromDistance: 2` is reachable — `maxZoneDistance: 2` means a candidate " +
      "exactly two zones away DOES trigger the check — so an inert reading here is not evidence of " +
      "a guard, it is evidence of a thin sample. Exempting it was never an option, and " +
      "MANUFACTURING THE POPULATION IS WORSE: a targeted fixture that manufactures selection " +
      "frequency measures the fixture. The gate therefore declines, states the floor, and revisits " +
      "when a corpus NATURALLY produces the population.",
    measuredReach:
      "1 selection in 29,973 plays (0.003%) on this gate's 160-game corpus, against a floor of 30; " +
      "2 in 3,420 plays (0.058%) on the engine's own fixture at ADR-035. Three orders of magnitude " +
      "below the 0.13% figure that made `calibration.md` §5.3 refuse a sweep outright.",
  },
  {
    table: "tippedBall.qualityBands",
    rowLabel: "FLOATER",
    source: "CALIBRATION-BACKLOG.md entry 45 (owner ruling, July 2026); ADR-035 §5.1, §6.3",
    ruling:
      "Identical to `GIFT` and one step further out: on this corpus the row is not selected at all, " +
      "so it derives `UNREACHED_ROW` rather than `UNDER_SAMPLED_ROW`. Both verdicts refuse to " +
      "exempt, which is the safe direction; neither is a claim that the cell is fine.",
    measuredReach:
      "0 selections in 29,973 plays on this gate's 160-game corpus; 2 in 3,420 plays (0.058%) on " +
      "the engine's own fixture at ADR-035.",
  },
];

/** The `${table}.${rowIndex}` keys of the declared abstentions, resolved against the live tree. */
export function abstainedRowKeys(
  tunables: Tunables = DEFAULT_TUNABLES,
  abstentions: readonly DeclaredAbstention[] = DECLARED_ABSTENTIONS,
): string[] {
  const tables = discoverBandTables(tunables);
  return abstentions.map((a) => {
    const table = tables.find((t) => t.path === a.table);
    const row = table?.rows.find((r) => r.label === a.rowLabel);
    if (table === undefined || row === undefined) {
      throw new RangeError(
        `the declared abstention "${a.table}.${a.rowLabel}" names a row that does not exist. ` +
          `An abstention whose subject has been deleted is a note about nothing; delete it and ` +
          `record why in ${a.source}.`,
      );
    }
    return `${table.path}.${String(row.index)}`;
  });
}

// ---------------------------------------------------------------------------
// TIER B — THE GATE
// ---------------------------------------------------------------------------

export interface BandGateFinding {
  readonly table: string;
  readonly column: string;
  readonly rows: readonly number[];
  readonly rowLabels: readonly string[];
  readonly values: readonly number[];
  readonly detail: string;
  /** The adjudication that covers it, or `null` — and `null` is what red means. */
  readonly known: KnownInversion | null;
}

/**
 * WHY AN ADJUDICATED INVERSION STOPPED SURVIVING.
 *
 * **A shrinking inversion count cannot distinguish a repaired engine from a loosened gate**, so the
 * gate is required to say which happened. The first four reasons are all changes to the DATA and
 * are FIXES; the last is a change to the derived EXEMPTION and is a NOTE — the inversion is still
 * sitting in the table and something merely stopped reading it.
 */
export type VanishReason =
  | "TABLE_REMOVED"
  | "COLUMN_REMOVED"
  | "CELLS_REMOVED"
  | "VALUES_CHANGED"
  | "EXEMPTED_BY_DERIVATION";

export interface VanishedInversion {
  readonly known: KnownInversion;
  readonly reason: VanishReason;
  /** `FIX` — the table changed. `NOTE` — the table still inverts and the exemption grew. */
  readonly kind: "FIX" | "NOTE";
  readonly detail: string;
}

/**
 * Classify a vanished adjudication by comparing the live table against `RECORDED_RAW_INVERSIONS`.
 *
 * The order of the tests is load-bearing, and it is ADR-035's title one level up: **a deleted cell
 * and an exempted cell are not the same thing.** `allCells` produces no cell at all for a (row,
 * column) pair whose value is `undefined`, so a deleted cell has no verdict to inspect — asking the
 * derivation about it would answer a question about something that does not exist. So the TABLE is
 * consulted first and the derivation last.
 */
export function classifyVanished(
  known: KnownInversion,
  tables: readonly BandTable[],
  raw: readonly OrderViolation[],
  recorded: readonly RecordedInversion[] = RECORDED_RAW_INVERSIONS,
): VanishedInversion {
  const table = tables.find((t) => t.path === known.table);
  const fix = (reason: VanishReason, detail: string): VanishedInversion => ({
    known,
    reason,
    kind: "FIX",
    detail,
  });
  if (table === undefined) {
    return fix("TABLE_REMOVED", `the table \`${known.table}\` no longer exists in the tunables.`);
  }
  if (!table.columns.includes(known.column)) {
    return fix(
      "COLUMN_REMOVED",
      `\`${known.column}\` is no longer a column of \`${known.table}\` — no row carries it.`,
    );
  }
  const nowRows = table.rows.filter((r) => r.cells[known.column] !== undefined).map((r) => r.label);
  const before = recorded.find((r) => r.table === known.table && r.column === known.column);
  if (before !== undefined && nowRows.length < before.rows.length) {
    const gone = before.rows.filter((label) => !nowRows.includes(label));
    return fix(
      "CELLS_REMOVED",
      `the column lost ${String(before.rows.length - nowRows.length)} cell(s) — ` +
        `${gone.join(", ")}. The sequence was [${before.values.join(", ")}]. An ABSENCE, not a ` +
        `value: \`allCells\` produces no cell for a (row, column) pair that is \`undefined\`, so ` +
        `there is no verdict to inspect and nothing was exempted.`,
    );
  }
  if (!raw.some((v) => v.table === known.table && v.column === known.column)) {
    return fix(
      "VALUES_CHANGED",
      `the column still has every cell it had and no longer inverts: it now reads ` +
        `[${table.rows
          .map((r) => r.cells[known.column])
          .filter((v) => v !== undefined)
          .map((v) => String(v))
          .join(", ")}]` +
        `${before === undefined ? "" : `, against a recorded [${before.values.join(", ")}]`}.`,
    );
  }
  return {
    known,
    reason: "EXEMPTED_BY_DERIVATION",
    kind: "NOTE",
    detail:
      `the column STILL INVERTS in the table — the derived exemption set removed enough cells from ` +
      `the sequence that what remains is monotone. Nothing was repaired: a resolver stopped ` +
      `reading a cell, or this corpus stopped reaching one. Check the verdict table before ` +
      `concluding anything about the football.`,
  };
}

export interface BandGateResult {
  readonly census: BandTableCensus;
  readonly corpus: BandGateCorpus;
  /** Tables the run was restricted to, or `null` for all of them. Logged, never silent. */
  readonly restrictedTo: readonly string[] | null;
  readonly rawViolations: readonly OrderViolation[];
  readonly scopedCells: number;
  readonly derivation: GuardedByRelation;
  readonly reach: ReachCensus;
  /** Violations that survive the derived exemption set. */
  readonly surviving: readonly BandGateFinding[];
  /** …of which these have no adjudication. NON-EMPTY MEANS RED. */
  readonly unadjudicated: readonly BandGateFinding[];
  /** Adjudicated inversions that no longer survive. NON-EMPTY MEANS RED (the ruling's subject moved). */
  readonly vanished: readonly VanishedInversion[];
  /** Declared abstentions whose row has CLEARED the floor — the population arrived. RED. */
  readonly abstentionsNowMeasurable: readonly DeclaredAbstention[];
  /**
   * In-scope rows the derivation could not rule on (`UNREACHED_ROW` / `UNDER_SAMPLED_ROW`) that no
   * `DECLARED_ABSTENTION` covers. NON-EMPTY MEANS RED: §7 property 5 wants blind spots reported, and
   * an UNDECLARED blind spot is one nobody has looked at.
   */
  readonly undeclaredBlindSpots: readonly string[];
  readonly baseline: CorpusObservation;
  readonly observations: number;
  readonly wallClockMs: number;
  readonly tunablesDigest: string;
}

export interface BandGateOptions {
  readonly tunables?: Tunables;
  readonly corpus?: BandGateCorpus;
  readonly known?: readonly KnownInversion[];
  readonly abstentions?: readonly DeclaredAbstention[];
  /**
   * Restrict the derivation to these tables. USED ONLY BY THE FALSIFIABILITY DEMONSTRATIONS, which
   * need to show one table going red without paying for all six. It is reported on the result and
   * printed by `renderBandGate` — §22c's sibling rule: no silent caps, and a bounded run must say
   * what it dropped or it reads as "covered everything".
   */
  readonly restrictToTables?: readonly string[];
  readonly log?: (line: string) => void;
}

/**
 * ADR-035 §7, executed.
 *
 * ```
 * for each band table T discovered from the tunables under test:
 *     V ← orderViolations(T)                       # unexempted
 *     if V is empty: pass
 *     C ← the cells of the violating columns of T
 *     R ← deriveGuardedBy({ tunables, observe, cells: C, rowReach, minRowReach })
 *     assert R.reachFloorApplied                   # never run unfloored
 *     F ← orderViolations(T, { exempt: R.exempt })
 *     assert F is empty
 * report R.unreadColumns, R.unreachedRows, R.underSampledRows, R.verdicts
 * ```
 *
 * ⚠ ONE DEVIATION, AND IT CHANGES NO VERDICT. `deriveGuardedBy` is called ONCE with the UNION of
 * every violating table's cells rather than once per table. `GuardedByRelation` keys its
 * live-sibling evidence by `${table}.${column}` and its exemption set by `cellId`, so per-table and
 * union calls produce identical verdicts; the union saves five re-runs of the corpus baseline,
 * which at this corpus is five times nine seconds. §7's loop is written per table because it is a
 * specification of the RELATION between violations and derivation, not of the call count.
 *
 * ⚠ THIS FUNCTION ASSERTS NOTHING EXCEPT THE FLOOR. Everything else it MEASURES and returns, so
 * that the falsifiability demonstrations can call the same unedited function and observe it red.
 * The floor is the exception because §7 property 4 makes an unfloored run a different and weaker
 * question — refusing is `Evidence<T,E>`'s discipline applied here.
 */
export function runBandTableGate(options: BandGateOptions = {}): BandGateResult {
  const tunables = options.tunables ?? DEFAULT_TUNABLES;
  const corpus = options.corpus ?? BAND_GATE_CORPUS;
  const known = options.known ?? KNOWN_INVERSIONS;
  const log = options.log ?? ((): void => undefined);
  const started = Date.now();

  if (corpus.games < BAND_GATE_CORPUS.games) {
    throw new RangeError(
      `§22c: refusing to run the band gate at ${String(corpus.games)} games when the recorded ` +
        `corpus is ${String(BAND_GATE_CORPUS.games)}. Never buy wall clock by reducing n — and ` +
        `here it would also drop tippedBall.LIVE_BALL and yac.WRAPPED_UP below the reach floor, ` +
        `converting two measurements into abstentions.`,
    );
  }
  if (corpus.minRowReach <= 0) {
    throw new RangeError(
      "the band gate requires a positive minRowReach. ADR-035 §7 property 4: an unfloored " +
        "relation is a valid object that answers a weaker question, and §5.1 is the worked " +
        "example of it answering wrongly.",
    );
  }

  const allTables = discoverBandTables(tunables);
  const restrictedTo = options.restrictToTables ?? null;
  if (restrictedTo !== null) {
    const dropped = allTables.map((t) => t.path).filter((p) => !restrictedTo.includes(p));
    log(
      `⚠ RESTRICTED RUN — the derivation covers ${restrictedTo.join(", ")} only. ` +
        `${String(dropped.length)} discovered table(s) were NOT derived and their violations, if ` +
        `any, are reported as raw only: ${dropped.join(", ")}`,
    );
  }

  // 1. The corpus, once, with the band census folded into the same pass.
  const baseline = runCorpus(tunables, corpus, { countBands: true });
  const reach = censusRowReach(tunables, baseline);
  log(
    `corpus: ${String(baseline.games)} games, ${String(baseline.plays)} plays, ` +
      `${String(baseline.events)} events, digest ${baseline.digest}, seeds ${baseline.seedDigest}`,
  );

  // 2. V — every raw violation, over every table, restricted or not.
  const raw = allTables.flatMap((t) => orderViolations(t));

  // 3. C — the cells of the violating columns of each violating table.
  const inScope = allTables.filter(
    (t) => restrictedTo === null || restrictedTo.includes(t.path),
  );
  const violatingColumns = new Map<string, Set<string>>();
  for (const table of inScope) {
    for (const v of orderViolations(table)) {
      const set = violatingColumns.get(table.path) ?? new Set<string>();
      set.add(v.column);
      violatingColumns.set(table.path, set);
    }
  }
  const cells: BandCell[] = allCells(tunables).filter((c) =>
    (violatingColumns.get(c.table) ?? new Set<string>()).has(c.column),
  );

  // 4. R — the relation, floored.
  const observe = (t: Tunables): string => runCorpus(t, corpus).digest;
  const derivation =
    cells.length === 0
      ? {
          verdicts: [],
          exempt: new Set<string>(),
          unreachedRows: [],
          underSampledRows: [],
          unreadColumns: [],
          observations: 0,
          reachFloorApplied: true,
        }
      : deriveGuardedBy({
          tunables,
          observe,
          cells,
          rowReach: reach.reach,
          minRowReach: corpus.minRowReach,
        });

  if (!derivation.reachFloorApplied) {
    throw new Error(
      "the band gate derived an UNFLOORED guardedBy relation. ADR-035 §7 property 4 forbids it: " +
        "every GUARDED verdict in an unfloored relation is unqualified by reach and may be an " +
        "over-exemption. §5.1's GIFT/FLOATER case is what this refusal is made of.",
    );
  }

  // 5. F — the surviving violations, with the exempt CELL dropped from the sequence.
  const byPath = new Map(allTables.map((t) => [t.path, t] as const));
  const surviving: BandGateFinding[] = [];
  for (const table of inScope) {
    for (const v of orderViolations(table, { exempt: derivation.exempt })) {
      surviving.push(findingOf(byPath, v, known));
    }
  }
  const unadjudicated = surviving.filter((f) => f.known === null);
  const survivingKeys = new Set(surviving.map(violationKey));
  const vanished = known
    .filter(
      (k) =>
        (restrictedTo === null || restrictedTo.includes(k.table)) &&
        !survivingKeys.has(violationKey(k)),
    )
    .map((k) => classifyVanished(k, allTables, raw));

  // 6. The declared abstentions, ASSERTED rather than noted. A row that has cleared the floor is
  //    the population arriving, and entry 45's instruction is to revisit when it does.
  const abstentions = options.abstentions ?? DECLARED_ABSTENTIONS;
  const abstainedKeyList = abstainedRowKeys(tunables, abstentions);
  const abstainedKeys = new Set(abstainedKeyList);
  const abstentionsNowMeasurable = abstentions.filter((_, i) => {
    const key = abstainedKeyList[i];
    if (key === undefined) return false;
    return (reach.reach.get(key) ?? 0) >= corpus.minRowReach;
  });

  // 7. Blind spots nobody has declared. §7 property 5 wants them reported; an UNDECLARED one is a
  //    blind spot nobody has looked at, which is the state this whole design exists to end.
  const undeclaredBlindSpots = [...derivation.unreachedRows, ...derivation.underSampledRows]
    .filter((key) => !abstainedKeys.has(key))
    .sort();

  return {
    census: bandTableCensus(tunables),
    corpus,
    restrictedTo,
    rawViolations: raw,
    scopedCells: cells.length,
    derivation,
    reach,
    surviving,
    unadjudicated,
    vanished,
    abstentionsNowMeasurable,
    undeclaredBlindSpots,
    baseline,
    observations: derivation.observations + 1,
    wallClockMs: Date.now() - started,
    tunablesDigest: stableDigest(tunables),
  };
}

function findingOf(
  byPath: ReadonlyMap<string, BandTable>,
  v: OrderViolation,
  known: readonly KnownInversion[],
): BandGateFinding {
  const table = byPath.get(v.table);
  return {
    table: v.table,
    column: v.column,
    rows: v.rows,
    rowLabels: v.rows.map((i) => table?.rows[i]?.label ?? `#${String(i)}`),
    values: v.values,
    detail: v.detail,
    known: knownFor(known, v.table, v.column),
  };
}

// ---------------------------------------------------------------------------
// THE REPORT
// ---------------------------------------------------------------------------

function pct(n: number, d: number, places = 3): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(places)}%`;
}

/**
 * The standing dev-time report. Every blind spot ADR-035 §7 property 5 names has a section here,
 * and each prints its SIZE — a run that exempts nothing and declines on four rows is a useful run;
 * a run that silently exempts four under-sampled rows is the failure the whole design prevents.
 */
export function renderBandGate(result: BandGateResult): string {
  const out: string[] = [];
  const say = (line = ""): void => {
    out.push(line);
  };

  say("=======================================================================");
  say("BAND-TABLE MONOTONICITY GATE — Charter §4.1, ADR-035 §7");
  say("=======================================================================");
  say();
  say(
    `corpus: ${String(result.baseline.games)} games · flat-60 ${String(result.corpus.teams)}t ` +
      `(FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN ${String(result.corpus.season)} · caller v2 + ` +
      `FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN`,
  );
  say(
    `batch seed \`${result.corpus.batchSeed}\` · seed digest \`${result.baseline.seedDigest}\` · ` +
      `tunables digest \`${result.tunablesDigest}\` · stream digest \`${result.baseline.digest}\``,
  );
  say(
    `${String(result.baseline.plays)} plays · ${String(result.baseline.events)} events · reach ` +
      `floor ${String(result.corpus.minRowReach)} selections · ${String(result.observations)} ` +
      `corpus runs · ${(result.wallClockMs / 1000).toFixed(1)} s wall clock`,
  );
  if (result.restrictedTo !== null) {
    say();
    say(`⚠ RESTRICTED RUN — derivation covered only: ${result.restrictedTo.join(", ")}`);
  }

  say();
  say("### 1. The subject, counted rather than asserted");
  say();
  say(
    `${String(result.census.tables)} band tables · ${String(result.census.rows)} rows · ` +
      `${String(result.census.cells)} effect cells · ${String(result.census.orderableColumns)} ` +
      `orderable columns · ${String(result.census.stringColumns)} string columns (unorderable)`,
  );
  say(
    `${String(result.rawViolations.length)} columns invert before exemption; the derivation was ` +
      `scoped to their ${String(result.scopedCells)} cells, not to all ` +
      `${String(result.census.cells)} — cost proportional to defects, not to tables.`,
  );

  say();
  say("### 2. The verdicts");
  say();
  const counts = new Map<string, number>();
  for (const v of result.derivation.verdicts) counts.set(v.liveness, (counts.get(v.liveness) ?? 0) + 1);
  say("| verdict | cells | exempt? |");
  say("|---|---|---|");
  for (const liveness of [
    "LIVE",
    "GUARDED",
    "UNREAD_COLUMN",
    "UNREACHED_ROW",
    "UNDER_SAMPLED_ROW",
    "UNPERTURBABLE",
  ]) {
    const n = counts.get(liveness) ?? 0;
    say(`| \`${liveness}\` | ${String(n)} | ${liveness === "GUARDED" ? "**yes**" : "no"} |`);
  }
  say();
  say(
    `exemption set: ${String(result.derivation.exempt.size)} cells, all \`GUARDED\`. ` +
      `\`reachFloorApplied\` = ${String(result.derivation.reachFloorApplied)}.`,
  );
  say();
  say("| cell | verdict | reach | live siblings / moved by |");
  say("|---|---|---|---|");
  for (const v of [...result.derivation.verdicts].sort((a, b) =>
    `${a.table}.${a.column}.${String(a.rowIndex)}`.localeCompare(
      `${b.table}.${b.column}.${String(b.rowIndex)}`,
    ),
  )) {
    const evidence =
      v.liveness === "GUARDED"
        ? `live on: ${(v.liveSiblings ?? []).join(", ")}`
        : v.movedBy === undefined
          ? "—"
          : v.movedBy;
    say(
      `| \`${v.table}.${String(v.rowIndex)}(${v.rowLabel}).${v.column}\` = ${String(v.value)} | ` +
        `${v.liveness} | ${v.rowReach === undefined ? "—" : String(v.rowReach)} | ${evidence} |`,
    );
  }

  say();
  say("### 3. What survives the exemption — the gate's verdict");
  say();
  if (result.surviving.length === 0) {
    say("No column inverts once the derived exemption set is applied.");
  } else {
    say("| table | column | sequence (best band first, exempt cells DROPPED) | status |");
    say("|---|---|---|---|");
    for (const f of result.surviving) {
      const seq = f.values.map((v, i) => `${f.rowLabels[i] ?? "?"}=${String(v)}`).join(", ");
      say(
        `| \`${f.table}\` | \`${f.column}\` | ${seq} | ` +
          `${f.known === null ? "**UNADJUDICATED — RED**" : f.known.status} |`,
      );
    }
  }
  say();
  const red =
    result.unadjudicated.length > 0 ||
    result.vanished.length > 0 ||
    result.abstentionsNowMeasurable.length > 0 ||
    result.undeclaredBlindSpots.length > 0;
  if (!red) {
    say(
      "**GREEN.** Every surviving inversion is adjudicated, every adjudicated inversion still " +
        "survives, every declared abstention is still below the floor, and no blind spot is " +
        "undeclared.",
    );
  } else {
    say("**RED.**");
    for (const f of result.unadjudicated) {
      say(`  - UNADJUDICATED: \`${f.table}.${f.column}\` — ${f.detail}`);
    }
    for (const v of result.vanished) {
      say(
        `  - VANISHED (**${v.kind}**, \`${v.reason}\`): \`${v.known.table}.${v.known.column}\` was ` +
          `adjudicated (${v.known.status}, ${v.known.source}) and no longer survives. ${v.detail}` +
          (v.kind === "FIX"
            ? " A FIX: delete the entry, re-record the raw set, and re-run."
            : " A NOTE: the inversion is still in the table. Do NOT delete the entry without " +
              "reading the verdict table — a shrinking count cannot tell a repaired engine from a " +
              "loosened gate, which is why this line exists."),
      );
    }
    for (const a of result.abstentionsNowMeasurable) {
      say(
        `  - THE POPULATION ARRIVED: \`${a.table}.${a.rowLabel}\` was a declared abstention ` +
          `(${a.source}) and now clears the reach floor. Entry 45's own instruction is to revisit ` +
          `when a corpus NATURALLY produces the population; it has. Measure it and delete the ` +
          `abstention. Recorded reach at declaration: ${a.measuredReach}`,
      );
    }
    for (const key of result.undeclaredBlindSpots) {
      say(
        `  - UNDECLARED BLIND SPOT: \`${key}\` is in scope and the derivation could not rule on ` +
          `it (unreached, or under the floor of ${String(result.corpus.minRowReach)}). It is NOT ` +
          `exempt and it is not declared either. Either declare an abstention with its reach ` +
          `stated, or find a corpus that reaches it.`,
      );
    }
  }

  say();
  say("### 4. The adjudicated population, printed every run so it cannot be mistaken for settled");
  say();
  for (const k of KNOWN_INVERSIONS) {
    say(`- **\`${k.table}.${k.column}\` — ${k.status}** (${k.source})`);
    say(`  - ${k.ruling}`);
    say(`  - price: ${k.price}`);
  }
  say();
  say(
    "**DECLARED ABSTENTIONS** — rows the gate refuses to rule on, with the floor stated. Never an " +
      "exemption: an abstained row's cells stay in the sequence and stay eligible to fail. " +
      "`calibration.md` §5.3: *an instrument that runs and returns something is more dangerous " +
      "than one that declines.*",
  );
  for (const a of DECLARED_ABSTENTIONS) {
    const key = `${a.table}.${a.rowLabel}`;
    say(`- **\`${key}\`** (${a.source})`);
    say(`  - ${a.ruling}`);
    say(`  - reach at declaration: ${a.measuredReach}`);
  }

  say();
  say("### 5. The blind spots, reported rather than swallowed (§7 property 5)");
  say();
  say(
    `- **UNREAD COLUMNS** (${String(result.derivation.unreadColumns.length)}) — nothing consumes ` +
      `them anywhere in the corpus. NOT exempt: dead code does not get to wear a dead cell's ` +
      `exemption. ${result.derivation.unreadColumns.join(", ") || "none in scope"}`,
  );
  say(
    `- **UNREACHED ROWS** (${String(result.derivation.unreachedRows.length)}) — starvation moved ` +
      `nothing, so the corpus never selected them or their selection has no observable ` +
      `consequence at all. NOT exempt. ${result.derivation.unreachedRows.join(", ") || "none in scope"}`,
  );
  say(
    `- **UNDER-SAMPLED ROWS** (${String(result.derivation.underSampledRows.length)}) — selected ` +
      `fewer than ${String(result.corpus.minRowReach)} times. NOT exempt. ` +
      `${result.derivation.underSampledRows.join(", ") || "none in scope"}`,
  );
  say(
    `- **UNPERTURBABLE CELLS** (${String(counts.get("UNPERTURBABLE") ?? 0)} in scope; ` +
      `${String(result.census.stringColumns)} string columns tree-wide) — no perturbation exists, ` +
      `so they are excluded from ordering rather than folded in with the measured-inert ones. ` +
      `ADR-035 §5.4 names the follow-up: a string column keyed by a numeric sibling table ` +
      `inherits that table's order.`,
  );
  say(
    `- **MUTUAL MASKING** — perturbation is one cell at a time, so two cells that each ` +
      `independently suppress the same consequence both read inert and both are reported GUARDED, ` +
      `INCLUDING the one that is the guard. Live instance: \`tippedBall.qualityBands\` row \`DEAD\` ` +
      `carries \`recoverable: false\` AND \`maxZoneDistance: -1\`. A pairwise sweep closes it at ` +
      `O(n²) and is not built, because both masked columns are monotone; it must be re-examined ` +
      `the first time a masked column inverts.`,
  );
  say(
    `- **REACH THIS INSTRUMENT CANNOT MEASURE** — check kinds whose emitted vocabulary is not a ` +
      `subset of exactly one table's labels: ${result.reach.unattributableKinds.join(", ") || "none"}. ` +
      `Tables with no emitter, whose rows read reach 0 and whose 0 IS NOT A MEASUREMENT: ` +
      `${result.reach.tablesWithNoEmitter.join(", ") || "none"}.`,
  );

  say();
  say("### 6. Row reach, measured");
  say();
  say(`${String(result.reach.labelsEmitted)} band labels emitted over ${String(result.reach.plays)} plays.`);
  say();
  say("| row | selections | share of plays | floor |");
  say("|---|---|---|---|");
  const scopedRows = new Set(
    result.derivation.verdicts.map((v) => `${v.table}.${String(v.rowIndex)}`),
  );
  for (const key of [...scopedRows].sort()) {
    const n = result.reach.reach.get(key) ?? 0;
    say(
      `| \`${key}\` | ${String(n)} | ${pct(n, result.reach.plays)} | ` +
        `${n < result.corpus.minRowReach ? "**BELOW**" : "ok"} |`,
    );
  }

  say();
  say("### 7. Discovery's blind spot, checked rather than assumed");
  say();
  const ladders = labelledLadderPaths(DEFAULT_TUNABLES);
  const discovered = new Set(discoverBandTables(DEFAULT_TUNABLES).map((t) => t.path));
  const untriaged = ladders.filter(
    (p) => !discovered.has(p) && !KNOWN_NON_MARGIN_LADDERS.includes(p),
  );
  say(
    `${String(ladders.length)} labelled ladders · ${String(discovered.size)} discovered as margin ` +
      `band tables · ${String(KNOWN_NON_MARGIN_LADDERS.length)} declared non-margin ` +
      `(${KNOWN_NON_MARGIN_LADDERS.join(", ")}) · ${String(untriaged.length)} untriaged`,
  );

  return out.join("\n");
}

// ---------------------------------------------------------------------------
// THE FALSIFIABILITY DEMONSTRATIONS — §22a, executed rather than argued
// ---------------------------------------------------------------------------

export interface GateDemonstration {
  readonly id: string;
  readonly what: string;
  readonly why: string;
  readonly table: string;
  /** The columns that must go red under this patch and are NOT red without it. */
  readonly expectRed: readonly string[];
  patch(base: Tunables): Tunables;
}

/**
 * Both demonstrations run the SAME UNEDITED `runBandTableGate`. That is the point: §4.1's
 * falsifiable test is *does a change to the subject automatically invalidate the check?* — and the
 * only honest way to answer it is to change the subject and watch.
 */
export const GATE_DEMONSTRATIONS: readonly GateDemonstration[] = [
  {
    id: "guard-removed",
    what: "throwExec.accuracy.bands.6.catchable false → true",
    why:
      "ADR-035 §2.1's test, at the gate level. The three `MISS` cells derive GUARDED on the " +
      "committed tree because `sim/passPlay.ts:1075` returns before the catch is resolved. Flip " +
      "the guard and the SAME derivation returns LIVE, the exemption set empties, and all three " +
      "columns reappear as unadjudicated survivors. A hand-maintained exemption list would have " +
      "said 'MISS is exempt' in both runs and the green would have meant nothing in the second.",
    table: "throwExec.accuracy.bands",
    expectRed: ["catchMod", "defenderContestMod", "difficulty"],
    patch: (base) =>
      applyTunablePatch(base, {
        tunableId: "throwExec.accuracy.bands.6.catchable",
        currentValue: false,
        proposedValue: true,
        evidence:
          "BAND-TABLE MONOTONICITY GATE — falsifiability demonstration, not a proposal. In-memory " +
          "only; packages/engine/src/tunables.ts is unchanged and this patch dies with the process.",
        expectedEffect:
          "removes the guard that makes the MISS row's effect cells inert, so the derivation must " +
          "reclassify them LIVE and the gate must go red on three columns it passes today",
      }),
  },
  {
    id: "injected-inversion",
    what: "release.bands.6.delaySeconds 2 → 0",
    why:
      "A table with NO inversion today (`delaySeconds` runs 0, 0, 0.5, 1, 1, 1.5, 2 — monotone) " +
      "given one. The column is live on every row, so no exemption can rescue it and the gate " +
      "must report an unadjudicated survivor. This is the half of falsifiability the guard-flip " +
      "cannot show: that a NEW inversion in a clean table is caught at all.",
    table: "release.bands",
    expectRed: ["delaySeconds"],
    patch: (base) =>
      applyTunablePatch(base, {
        tunableId: "release.bands.6.delaySeconds",
        currentValue: 2,
        proposedValue: 0,
        evidence:
          "BAND-TABLE MONOTONICITY GATE — falsifiability demonstration, not a proposal. In-memory " +
          "only; packages/engine/src/tunables.ts is unchanged and this patch dies with the process.",
        expectedEffect:
          "makes ROUTE_DISRUPTED — the worst release band — cost the receiver no delay at all, " +
          "which is an inversion of a live column and must be caught",
      }),
  },
];
