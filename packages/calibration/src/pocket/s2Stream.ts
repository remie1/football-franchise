/**
 * THE STEP-2 STREAM CHECKS AND READINGS, AS FOLDS (ADR-089 step 2; plan §1.6, §1.7, §4.3, §5 F.9
 * item 4, §6 stream K2; readings O40 to O42, O44, O45, O49, O50).
 *
 * Each check reads one game's events and adds to its fold; nothing here plays a game. Step 2's
 * harness runs every fold on every game of every arm, each handed that arm's own tunables (K14),
 * and `pocketStep2Stream.test.ts` runs them on synthetic streams (one that each check must refuse)
 * and on the golden games. A structural check passes when it has no failure and saw at least one
 * case; each fold keeps a sample of what failed (`problems`, at most `S2_PROBLEM_SAMPLE` lines, the
 * full count in `problemCount`).
 *
 * **The live threat set.** Every check reads the threats live at a tick from the published
 * `RUSH_THREAT`s, in stream order: the latest state per rusher, where TRAVELLING, DELAYED and ARRIVED
 * are live and RESET removes him; `QB_PURSUIT` clears the set (the pocket is gone), so a publication
 * after it is not counted (`afterPursuit`). The set at a `POCKET_STATUS` is what was published before
 * that status, which is what the engine's tick-start `threats` held (`sim/passPlay.ts`: ARRIVED is
 * published at the tick's start, before the status; the tick's line battle publishes after it, for
 * the next tick). Its nearest time to arrival is `etaTick - tick` rounded to a tenth, the engine's
 * `timeToArrival`. Every threat counts as registered until step 7 (`ADR:490`, reading O45), so must
 * act's two minima are this one. The reconstruction is checked on every stream (`liveSetCheck`): an
 * ARRIVED is never dated after its own tick, and a live threat at or past its ETA at a status has
 * had its ARRIVED published.
 *
 * **The forced acts** (what only `mustDecide`'s branch or the movement gate can produce,
 * `sim/passPlay.ts`): a `pocket_movement` CHECK (MOVEMENT); a POCKET_DURESS throwaway; a checkdown
 * look (a `QB_READ` whose roll label is `t<tick>:checkdown:<id>:read`); a DESPERATION throw (the
 * best read below his bar, `throwClass.ts`, which only the must-decide branch throws); a
 * CLOCK_EXPIRED throwaway. Each is a pocket act: none can follow `QB_PURSUIT`.
 *
 * **The parts of must act** on a tick (`ADR:485-490`): the threat part, a live threat within the
 * arm's own `arrival.collapsingWithinSeconds` (C, K14) or one arrived; the count part, the tick at
 * or past the quarterback's budget or his progression reads (`QB_READ`s labelled `t<tick>:r<i>:`)
 * at `maxReads`. The budget is restated from `resolve/qbRead.ts`'s `timeBudgetSeconds` (lines
 * 185-196, in its own order of operations): `qb.timeBudget.baseSeconds + (pocketPatience -
 * baseline) / divisor + (the pocketAwareness trait ? pressureSensing.pocketAwarenessBudgetSeconds :
 * 0) + readSystem[system].budgetDeltaSeconds`, with the quarterback from the game's snapshot (his
 * attributes read by their registry ids, Iron Rule 5) and the read system from `PLAY_START`.
 *
 * The checks:
 *
 *  - **`mustActCheck`** (`s2.falsifier.counterAlone`, `proof:must-act-counter`; reading O40). The
 *    arm's rule part is the threat part under PER_RUSHER and the published status (in
 *    `pocket.forcesDecision`) under step 1's rule and the narrower counter. A MOVEMENT or a
 *    POCKET_DURESS throwaway must sit on a tick where the rule part holds; every other forced act
 *    on such a tick, or where the count part holds. Under PER_RUSHER a failure is "must act fired on
 *    the counter alone" (or the band floor alone: anything but a threat and the count). Under step
 *    1's rule the same fold is the **self-check** of the count part's restatement (plan §1.7 (ii)):
 *    every forced act on a tick whose status does not force must satisfy the restated count part,
 *    and an exception means the restatement is wrong (a fold fault, plan §4.7: the clause is "not
 *    judged" until it is fixed). That direction catches a restatement too strict; the fold's
 *    **witnesses** catch one too generous, on every arm (review F-1, F-6; `MustActWitnessFold`):
 *    on a closing HOLD (a pocket HOLD with no `pocket_movement` CHECK on its tick) the rule part
 *    must not hold, and at or past `qb.throwawayEarliestSeconds` the restated count part must not
 *    either; on a CLOCK_EXPIRED the rule part must not hold. A witness exception is a fold fault and
 *    never a falsifier failure. The fold counts every act by kind and by which part held, so the
 *    checkdown looks by trigger (threat or status part, count part) are its CHECKDOWN_LOOK row.
 *  - **`arrivalActsCheck`** (`s2.falsifier.everyArrival`, `proof:must-act-arrival`; O41). On the
 *    first pocket tick of a play with a live threat at `etaTick - tick <= 0`, no event of a later
 *    tick follows, and the play ends in a THROW (normal, checkdown or desperation) or a SACK on that
 *    tick. A THROWAWAY or a movement CHECK on it is a failure; a `QB_READ` after the status is
 *    expected (he takes that tick's reads first). Cases are counted, with the THROW and SACK split.
 *  - **`warningCleanCheck`** (the §6 row's "no threat inside the warning coexists with CLEAN"; O42).
 *    On every `POCKET_STATUS`, a live threat within the arm's own `arrival.pressureWithinSeconds`
 *    (P) never coexists with CLEAN, and the arrival floor rebuilt from the live set with the arm's
 *    own horizons is never above the published status (the status is the worst of three channels).
 *  - **`mustActShare`** (reported beside `forced_throw_share` and `first_forcing_seconds`; O49):
 *    the share of aimed throws released on a tick with the threat part, and each dropback's first
 *    tick with it, with the status-forced share restated beside, so the filed rows keep their
 *    definitions (R5).
 *  - **`desperationSplit`** (F.9 item 4; O50): DESPERATION's aimed throws by release bin, with
 *    interceptions and completions, split CLEAN and DIRTY by `desperationPocketOf`.
 *  - **`checkdownSplit`** (AM-1 §4.5's composition; review FID-F-2): CHECKDOWN's aimed throws the
 *    same way, split by what forced the look on the release tick (`CHECKDOWN_TRIGGERS`), so a
 *    CHECKDOWN breach carries the rise re-weighted to the base's composition as DESPERATION's does.
 *  - **`guardGameVector`** (AM-1 §4.4; S4-2): each game's guard fold (`step0.ts`'s `foldGuardGame`,
 *    the classes with an aimed throw) and its DESPERATION halves, in game order, with the game's id,
 *    so the report can print the paired, game-clustered SE beside every AM-1 reading.
 *  - **`m2Stream`** (plan §1.6; O44): M2 on the arm's own stream (`m2ForcingSource.ts`'s
 *    `foldM2StreamGame`), with TM's (b) construct `b.tm-399` beside it.
 */
import { getAttr, traitId, TRAIT_REGISTRY_V1, type MatchEventEnvelope, type PlayerId, type PlayerState, type PocketStatus, type Position, type RushAlignment, type ThreatOrigin } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import { floorFromArrival } from "../knownTruth/geometryTimeRetirement.js";
import { positionsFromSnapshot } from "../knownTruth/pocketChannelShares.js";
import { severityOf } from "../knownTruth/pocketLadder.js";
import { RELEASE_BINS, releaseBinOf } from "../metrics/collect.js";
import type { ThrowClass } from "./constructs.js";
import { registryAttr } from "./freeRun.js";
import { emptyM2StreamFold, foldM2StreamGame, forcingRuleOf, m2StreamSummary, m2ZeroByTheRule, type M2ForcingRule, type M2StreamFold } from "./m2ForcingSource.js";
import { playersOfSnapshot } from "./m6Contact.js";
import { emptyGuardFold, foldGuardGame } from "./step0.js";
import { desperationPocketOf, isAimed, playsOf, readDropback, throwClassOf, type DesperationPocket, type Dropback, type PassStart } from "./throwClass.js";

/** How many failure lines a fold keeps; the count beside them is complete. */
export const S2_PROBLEM_SAMPLE = 20;

// --- the context: one arm's dials and one game's players ------------------------------------------

/** What every step-2 check reads off the arm (K14: never a default) and the game's snapshot. */
export interface S2Context {
  readonly tunables: Tunables;
  /** The arm's forcing rule: `pocket.forcing.rule`, or step 1's when the block is absent. */
  readonly rule: M2ForcingRule;
  /** Must act's threat part (D32): `arrival.collapsingWithinSeconds`. */
  readonly C: number;
  /** The warning: `arrival.pressureWithinSeconds`. */
  readonly P: number;
  /** The statuses that force under step 1's rule: `pocket.forcesDecision`. */
  readonly forcing: ReadonlySet<string>;
  readonly players: ReadonlyMap<string, PlayerState>;
  readonly positions: ReadonlyMap<PlayerId, Position>;
}

export function s2ContextOf(tunables: Tunables, snapshot: GameSnapshot): S2Context {
  return {
    tunables,
    rule: forcingRuleOf(tunables),
    C: tunables.arrival.collapsingWithinSeconds,
    P: tunables.arrival.pressureWithinSeconds,
    forcing: new Set<string>(tunables.pocket.forcesDecision as readonly string[]),
    players: playersOfSnapshot(snapshot),
    positions: positionsFromSnapshot(snapshot),
  };
}

// --- the count part, restated -----------------------------------------------------------------------

const POCKET_PATIENCE = registryAttr("pocketPatience");
const TRAIT_NAME = "pocketAwareness";
if (TRAIT_REGISTRY_V1[TRAIT_NAME] === undefined) throw new Error(`s2Stream: "${TRAIT_NAME}" is not a trait of TRAIT_REGISTRY_V1`);
const POCKET_AWARENESS = traitId(TRAIT_NAME);

interface ReadSystemRow {
  readonly budgetDeltaSeconds: number;
  readonly maxReads: number;
}

function readSystemRow(tunables: Tunables, readSystem: string): ReadSystemRow {
  const row = (tunables.qb.readSystem as Readonly<Record<string, ReadSystemRow>>)[readSystem];
  if (row === undefined) throw new Error(`s2Stream: read system "${readSystem}" is not in qb.readSystem`);
  return row;
}

/** `resolve/qbRead.ts`'s `timeBudgetSeconds` (lines 185-196), restated in its own order of operations. */
export function restatedBudgetSeconds(tunables: Tunables, qb: PlayerState, readSystem: string): number {
  const t = tunables.qb;
  const patience = getAttr(qb.attributes.values, POCKET_PATIENCE);
  const sensing = qb.attributes.traits.has(POCKET_AWARENESS as unknown as string) ? t.pressureSensing.pocketAwarenessBudgetSeconds : 0;
  return t.timeBudget.baseSeconds + (patience - t.timeBudget.baseline) / t.timeBudget.divisor + sensing + readSystemRow(tunables, readSystem).budgetDeltaSeconds;
}

/** `maxReadsFor`: the read system's `maxReads`. */
export function restatedMaxReads(tunables: Tunables, readSystem: string): number {
  return readSystemRow(tunables, readSystem).maxReads;
}

// --- one PASS play, read once, in stream order -------------------------------------------------------

/** A threat live at a status: his latest published state (TRAVELLING, DELAYED or ARRIVED). */
export interface LiveThreat {
  readonly rusher: string;
  readonly origin: ThreatOrigin;
  readonly alignment: RushAlignment;
  readonly etaTick: number;
  /** His latest publication is ARRIVED. */
  readonly arrived: boolean;
}

export interface StatusTick {
  /** The envelope's index within the play. */
  readonly index: number;
  readonly tick: number;
  readonly status: PocketStatus;
  /** The threats published before this status, latest state per rusher: the engine's tick-start `threats`. */
  readonly live: readonly LiveThreat[];
  /** The nearest live threat's time to arrival, `etaTick - tick` to a tenth; undefined when none is live. */
  readonly minTta: number | undefined;
}

export type ReadKind = "PROGRESSION" | "CHECKDOWN" | "OTHER";

interface At {
  readonly index: number;
  readonly tick: number;
  /** Published after `QB_PURSUIT`. */
  readonly afterPursuit: boolean;
}

/** One PASS play's facts for the step-2 checks. */
export interface S2Play {
  readonly playId: string;
  readonly gameId: string;
  readonly start: PassStart;
  readonly dropback: Dropback;
  readonly statuses: readonly StatusTick[];
  /** Every TICK, in order. */
  readonly ticks: readonly { readonly index: number; readonly tick: number }[];
  /** `pocket_movement` CHECKs. */
  readonly movements: readonly At[];
  readonly reads: readonly (At & { readonly kind: ReadKind })[];
  readonly throwaways: readonly (At & { readonly cause: string })[];
  readonly throws: readonly At[];
  /** `QB_DECISION` HOLDs (the closing HOLD, a STAND_IN or a contained escape, or a scramble's). */
  readonly holds: readonly At[];
  readonly pursuit: At | undefined;
  /** `RUSH_THREAT`s published after `QB_PURSUIT` (not counted: the set is cleared). */
  readonly afterPursuit: number;
  /** Live-set faults: an ARRIVED dated after its tick, a live threat past its ETA with no ARRIVED. */
  readonly liveFaults: readonly string[];
  /** Status ticks whose live set the fault checks read. */
  readonly liveChecks: number;
}

const round1 = (x: number): number => Number(x.toFixed(1));
const TOLERANCE = 1e-9;

/** A `QB_READ` roll label's kind: `.../qbread/t<tick>:r<i>:<id>:read` or `.../qbread/t<tick>:checkdown:<id>:read`. */
export function readKindOf(rngLabel: string): ReadKind {
  const last = rngLabel.slice(rngLabel.lastIndexOf("/") + 1);
  const m = /^t[0-9.]+:(r[0-9]+|checkdown):/.exec(last);
  if (m === null) return "OTHER";
  return m[1] === "checkdown" ? "CHECKDOWN" : "PROGRESSION";
}

/** One play's events (PLAY_START first) read for the step-2 checks; `undefined` for any play but a PASS. */
export function readS2Play(playId: string, events: readonly MatchEventEnvelope[]): S2Play | undefined {
  const dropback = readDropback({ playId, events });
  if (dropback === undefined) return undefined;
  let gameId = "";
  let tick = 0;
  let pursued = false;
  const live = new Map<string, LiveThreat>();
  const statuses: StatusTick[] = [];
  const ticks: { index: number; tick: number }[] = [];
  const movements: At[] = [];
  const reads: (At & { kind: ReadKind })[] = [];
  const throwaways: (At & { cause: string })[] = [];
  const throws: At[] = [];
  const holds: At[] = [];
  let pursuit: At | undefined;
  let afterPursuit = 0;
  const liveFaults: string[] = [];
  let liveChecks = 0;
  events.forEach(({ event }, index) => {
    if (gameId === "") gameId = String((event as { readonly gameId?: unknown }).gameId ?? "");
    const at: At = { index, tick, afterPursuit: pursued };
    switch (event.type) {
      case "TICK":
        tick = event.payload.tick;
        ticks.push({ index, tick });
        return;
      case "RUSH_THREAT": {
        const t = event.payload;
        if (pursued) {
          afterPursuit += 1;
          return;
        }
        const rusher = String(t.rusher);
        if (t.state === "RESET") live.delete(rusher);
        else {
          if (t.state === "ARRIVED" && t.etaTick > tick + TOLERANCE) liveFaults.push(`tick ${String(tick)}: ${rusher}'s ARRIVED is dated ${String(t.etaTick)}, after its own tick`);
          live.set(rusher, { rusher, origin: t.origin, alignment: t.alignment, etaTick: t.etaTick, arrived: t.state === "ARRIVED" });
        }
        return;
      }
      case "POCKET_STATUS": {
        const set = [...live.values()];
        let minTta: number | undefined;
        for (const x of set) {
          const tta = round1(x.etaTick - tick);
          if (minTta === undefined || tta < minTta) minTta = tta;
          if (tta <= 0 && !x.arrived) liveFaults.push(`tick ${String(tick)}: ${x.rusher} is live at or past his ETA ${String(x.etaTick)} with no ARRIVED published`);
        }
        liveChecks += 1;
        statuses.push({ index, tick, status: event.payload.status, live: set, minTta });
        return;
      }
      case "CHECK":
        if (event.payload.checkKind === "pocket_movement") movements.push(at);
        return;
      case "QB_READ":
        reads.push({ ...at, kind: readKindOf(event.payload.varianceRoll.rngLabel) });
        return;
      case "THROWAWAY":
        throwaways.push({ ...at, cause: event.payload.cause });
        return;
      case "THROW":
        throws.push(at);
        return;
      case "QB_DECISION":
        if (event.payload.choice === "HOLD") holds.push(at);
        return;
      case "QB_PURSUIT":
        pursuit ??= at;
        pursued = true;
        live.clear();
        return;
      default:
        return;
    }
  });
  return { playId, gameId, start: dropback.start, dropback, statuses, ticks, movements, reads, throwaways, throws, holds, pursuit, afterPursuit, liveFaults, liveChecks };
}

/** Every PASS play of a game, read for the step-2 checks. */
export function s2PlaysOf(events: readonly MatchEventEnvelope[]): readonly S2Play[] {
  const out: S2Play[] = [];
  for (const slice of playsOf(events)) {
    const play = readS2Play(slice.playId, slice.events);
    if (play !== undefined) out.push(play);
  }
  return out;
}

/** The threat part on a status tick: a live threat within C, or one arrived (C >= 0, so arrived is within C). */
export function threatPartAt(s: StatusTick | undefined, C: number): boolean {
  return s?.minTta !== undefined && (s.minTta <= C || s.minTta <= 0);
}

// --- the folds' common shape ------------------------------------------------------------------------

export interface S2CheckFold {
  /** Plays read. */
  plays: number;
  problemCount: number;
  problems: string[];
}

function emptyCheck(): S2CheckFold {
  return { plays: 0, problemCount: 0, problems: [] };
}

function fail(fold: S2CheckFold, where: string, what: string): void {
  fold.problemCount += 1;
  if (fold.problems.length < S2_PROBLEM_SAMPLE) fold.problems.push(`${where}: ${what}`);
}

const atPlay = (play: S2Play, tick?: number): string => `play ${play.playId}${tick === undefined ? "" : ` tick ${String(tick)}`}`;

/** One fold reads one arm: it keeps the arm's rule and refuses another. */
function holdRule(fold: { rule: M2ForcingRule | null }, rule: M2ForcingRule, what: string): void {
  if (fold.rule === null) fold.rule = rule;
  else if (fold.rule !== rule) throw new Error(`${what}: one fold read arms under ${fold.rule} and ${rule}`);
}

// --- the live set's own check ----------------------------------------------------------------------

export interface LiveSetFold extends S2CheckFold {
  /** Status ticks whose live set was checked. */
  statusTicks: number;
  /** `RUSH_THREAT`s after `QB_PURSUIT`, not counted. */
  afterPursuit: number;
}

export function emptyLiveSetFold(): LiveSetFold {
  return { ...emptyCheck(), statusTicks: 0, afterPursuit: 0 };
}

export function liveSetCheck(fold: LiveSetFold, play: S2Play, _ctx: S2Context): void {
  fold.plays += 1;
  fold.statusTicks += play.liveChecks;
  fold.afterPursuit += play.afterPursuit;
  for (const f of play.liveFaults) fail(fold, atPlay(play), f);
}

// --- must act never fires on the counter alone (and its self-check) ---------------------------------

export const FORCED_ACT_KINDS = ["MOVEMENT", "POCKET_DURESS", "CHECKDOWN_LOOK", "DESPERATION", "CLOCK_EXPIRED"] as const;
export type ForcedActKind = (typeof FORCED_ACT_KINDS)[number];

/** MOVEMENT and POCKET_DURESS come only through the movement gate, which the count part never opens. */
const GATED: ReadonlySet<ForcedActKind> = new Set(["MOVEMENT", "POCKET_DURESS"]);

/** One kind's acts, by which part of must act held on their tick. */
export interface ForcedActCell {
  acts: number;
  /** A live threat within C, or one arrived. */
  threatPart: number;
  /** The published status forces (`pocket.forcesDecision`). */
  statusPart: number;
  /** His budget or his reads ran out. */
  countPart: number;
  /** The arm's rule part (threat under PER_RUSHER, status otherwise) and not the count part. */
  ruleOnly: number;
  /** The count part and not the rule part. */
  countOnly: number;
  both: number;
  neither: number;
}

const emptyCell = (): ForcedActCell => ({ acts: 0, threatPart: 0, statusPart: 0, countPart: 0, ruleOnly: 0, countOnly: 0, both: 0, neither: 0 });

/**
 * The engine's own witnesses that the fold's parts are not too generous (the self-check's other
 * direction, on every arm; review F-1 and F-6). Every branch inside the movement gate (`if
 * (forced)`, `sim/passPlay.ts`) breaks or continues, and its two HOLDs (a STAND_IN, a contained
 * escape) follow a `pocket_movement` CHECK on their tick, so a pocket HOLD with no such CHECK is
 * the loop's closing HOLD, reached only with `forced` false: the rule part does not hold on its
 * tick. At or past `qb.throwawayEarliestSeconds` it is reached only with `mustDecide` false too
 * (`mustDecide && throwawayAvailable` throws the ball away on the clock), so the count part does
 * not hold either. A CLOCK_EXPIRED is reached only past the gate, with `forced` false and the
 * count part true. A witness that breaks this is a self-check exception: a fold fault on any arm.
 */
export interface MustActWitnessFold extends S2CheckFold {
  /** Closing HOLDs read (a pocket HOLD with no `pocket_movement` CHECK on its tick): the rule part must not hold. */
  holds: number;
  /** Of them, at or past `qb.throwawayEarliestSeconds`: the restated count part must not hold. */
  countHolds: number;
  /** CLOCK_EXPIRED throwaways read: the rule part must not hold on their tick. */
  clockExpired: number;
}

export interface MustActFold extends S2CheckFold {
  rule: M2ForcingRule | null;
  acts: number;
  byKind: Record<ForcedActKind, ForcedActCell>;
  /** The self-check's population: acts on a tick whose rule part does not hold. */
  offRule: number;
  /** Of them, the restated count part holds. */
  offRuleCounted: number;
  /** The self-check's other direction, on every arm: its exceptions never count as the falsifier's. */
  witness: MustActWitnessFold;
  /**
   * The falsifier's chances (review FID-F-5): pocket status ticks (the first a tick, none after
   * `QB_PURSUIT`) on which the status forces and the threat part does not hold, the only ticks on
   * which PER_RUSHER and step 1's rule part ways (on step 1's clock a threat inside C floors the
   * status at COLLAPSING). A MOVEMENT or a POCKET_DURESS on one fails it. Counted on every arm.
   */
  chances: number;
  /** Of them, the count part does not hold either (review CT-F1): any forced act on one fails it. */
  chancesUncounted: number;
  /**
   * Forced acts that would fail the falsifier read as PER_RUSHER with the arm's own C (the same test
   * as the PER_RUSHER failure line, on every act with a status): on a PER_RUSHER arm its failures of
   * that kind; on a step-1-rule arm (B7) the positive control, which shows the corpus can bite.
   */
  asPerRusherFailures: number;
}

export function emptyMustActFold(): MustActFold {
  return {
    ...emptyCheck(),
    rule: null,
    acts: 0,
    byKind: Object.fromEntries(FORCED_ACT_KINDS.map((k) => [k, emptyCell()])) as Record<ForcedActKind, ForcedActCell>,
    offRule: 0,
    offRuleCounted: 0,
    witness: { ...emptyCheck(), holds: 0, countHolds: 0, clockExpired: 0 },
    chances: 0,
    chancesUncounted: 0,
    asPerRusherFailures: 0,
  };
}

/** A play's closing HOLDs: pocket HOLDs (none after `QB_PURSUIT`) with no `pocket_movement` CHECK on their tick. */
export function closingHoldsOf(play: S2Play): readonly At[] {
  const moved = (t: number): boolean => play.movements.some((m) => !m.afterPursuit && Math.abs(m.tick - t) < TOLERANCE);
  return play.holds.filter((h) => !h.afterPursuit && !moved(h.tick));
}

/** A play's forced acts, in stream order, each with the tick it fell on. */
export function forcedActsOf(play: S2Play, tunables: Tunables): readonly (At & { readonly kind: ForcedActKind })[] {
  const acts: (At & { kind: ForcedActKind })[] = [];
  for (const m of play.movements) acts.push({ ...m, kind: "MOVEMENT" });
  for (const t of play.throwaways) {
    if (t.cause === "POCKET_DURESS") acts.push({ ...t, kind: "POCKET_DURESS" });
    else if (t.cause === "CLOCK_EXPIRED") acts.push({ ...t, kind: "CLOCK_EXPIRED" });
  }
  for (const r of play.reads) if (r.kind === "CHECKDOWN") acts.push({ ...r, kind: "CHECKDOWN_LOOK" });
  const thrown = play.throws[0];
  if (thrown !== undefined && throwClassOf(play.dropback, tunables).cls === "DESPERATION") acts.push({ ...thrown, kind: "DESPERATION" });
  return acts.sort((a, b) => a.index - b.index);
}

/** Must act's parts on one tick, read with the arm's own dials (K14). */
export interface MustActParts {
  /** A live threat within C, or one arrived. */
  readonly threat: boolean;
  /** The published status forces (`pocket.forcesDecision`). */
  readonly status: boolean;
  /** His progression reads by the end of the tick's reads. */
  readonly reads: number;
  /** The tick at or past his restated budget, or his reads at `maxReads`. */
  readonly count: boolean;
  /** The arm's rule part: the threat part under PER_RUSHER, the status part otherwise. */
  readonly rulePart: boolean;
}

/** One play's must-act reader: the quarterback's restated budget and reads, the first status a tick, and the parts on a tick. */
export function mustActPartsOf(play: S2Play, ctx: S2Context): {
  readonly budget: number;
  readonly maxReads: number;
  readonly statusAt: ReadonlyMap<number, StatusTick>;
  readonly at: (s: StatusTick, tick: number) => MustActParts;
} {
  const qb = ctx.players.get(play.start.quarterback);
  if (qb === undefined) throw new Error(`mustActCheck: ${play.playId}: the quarterback ${play.start.quarterback} is not on the game's snapshot`);
  const budget = restatedBudgetSeconds(ctx.tunables, qb, play.start.readSystem);
  const maxReads = restatedMaxReads(ctx.tunables, play.start.readSystem);
  const statusAt = new Map<number, StatusTick>();
  for (const s of play.statuses) if (!statusAt.has(s.tick)) statusAt.set(s.tick, s);
  const perRusher = ctx.rule === "PER_RUSHER";
  const at = (s: StatusTick, t: number): MustActParts => {
    const threat = threatPartAt(s, ctx.C);
    const status = ctx.forcing.has(s.status);
    const reads = play.reads.filter((r) => r.kind === "PROGRESSION" && r.tick <= t + TOLERANCE).length;
    return { threat, status, reads, count: t >= budget || reads >= maxReads, rulePart: perRusher ? threat : status };
  };
  return { budget, maxReads, statusAt, at };
}

export function mustActCheck(fold: MustActFold, play: S2Play, ctx: S2Context): void {
  holdRule(fold, ctx.rule, "mustActCheck");
  fold.plays += 1;
  const w = fold.witness;
  w.plays += 1;
  const acts = forcedActsOf(play, ctx.tunables);
  const holds = closingHoldsOf(play);
  if (acts.length === 0 && holds.length === 0 && play.statuses.length === 0) return;
  const { budget, maxReads, statusAt, at: partsAt } = mustActPartsOf(play, ctx);
  const perRusher = ctx.rule === "PER_RUSHER";
  const nearOf = (s: StatusTick): string => (s.minTta === undefined ? "no live threat" : `nearest threat ${String(s.minTta)} s`);
  const countText = (reads: number): string => `budget ${budget.toFixed(3)} s, ${String(reads)} of ${String(maxReads)} reads`;
  const ruleText = perRusher ? `C ${String(ctx.C)}` : "status in pocket.forcesDecision";
  for (const act of acts) {
    fold.acts += 1;
    const cell = fold.byKind[act.kind];
    cell.acts += 1;
    if (act.afterPursuit) {
      fail(fold, atPlay(play, act.tick), `a ${act.kind} after QB_PURSUIT: forced acts are the pocket's`);
      continue;
    }
    const s = statusAt.get(act.tick);
    if (s === undefined) {
      fail(fold, atPlay(play, act.tick), `a ${act.kind} on a tick with no POCKET_STATUS`);
      continue;
    }
    const { threat, status, reads, count, rulePart } = partsAt(s, act.tick);
    if (GATED.has(act.kind) ? !threat : !(threat || count)) fold.asPerRusherFailures += 1;
    if (threat) cell.threatPart += 1;
    if (status) cell.statusPart += 1;
    if (count) cell.countPart += 1;
    if (rulePart && count) cell.both += 1;
    else if (rulePart) cell.ruleOnly += 1;
    else if (count) cell.countOnly += 1;
    else cell.neither += 1;
    if (!rulePart) {
      fold.offRule += 1;
      if (count && !GATED.has(act.kind)) fold.offRuleCounted += 1;
    }
    if (act.kind === "CLOCK_EXPIRED") {
      w.clockExpired += 1;
      if (rulePart) fail(w, atPlay(play, act.tick), `witness: a CLOCK_EXPIRED on a tick whose rule part holds (${nearOf(s)}, ${ruleText}, status ${s.status}): the engine throws it away on the clock only with forced false, so the fold's rule part or its live set is too generous`);
    }
    const ok = GATED.has(act.kind) ? rulePart : rulePart || count;
    if (ok) continue;
    const why = GATED.has(act.kind) ? "the movement gate opened" : countText(reads);
    if (perRusher) fail(fold, atPlay(play, act.tick), `must act fired on the counter alone: a ${act.kind} with ${nearOf(s)} (C ${String(ctx.C)}), status ${s.status}; ${why}`);
    else fail(fold, atPlay(play, act.tick), `self-check: a ${act.kind} on a tick whose status (${s.status}) does not force, and the restated count part does not hold (${why}): the restatement is wrong`);
  }
  for (const s of statusAt.values()) {
    if (play.pursuit !== undefined && s.index > play.pursuit.index) continue;
    const { threat, status, count } = partsAt(s, s.tick);
    if (!status || threat) continue;
    fold.chances += 1;
    if (!count) fold.chancesUncounted += 1;
  }
  const earliest = ctx.tunables.qb.throwawayEarliestSeconds;
  for (const h of holds) {
    const s = statusAt.get(h.tick);
    if (s === undefined) {
      fail(w, atPlay(play, h.tick), "witness: a pocket HOLD on a tick with no POCKET_STATUS");
      continue;
    }
    w.holds += 1;
    const { reads, count, rulePart } = partsAt(s, h.tick);
    if (rulePart) fail(w, atPlay(play, h.tick), `witness: a closing HOLD on a tick whose rule part holds (${nearOf(s)}, ${ruleText}, status ${s.status}): the engine holds with no movement check only with forced false, so the fold's rule part or its live set is too generous`);
    if (h.tick < earliest - TOLERANCE) continue;
    w.countHolds += 1;
    if (count) fail(w, atPlay(play, h.tick), `witness: a closing HOLD at or past throwawayEarliestSeconds (${String(earliest)} s) on a tick whose restated count part holds (${countText(reads)}): the engine would have thrown it away on the clock, so the restatement is too generous`);
  }
}

// --- every arrival makes him act ----------------------------------------------------------------------

export interface ArrivalFold extends S2CheckFold {
  /** Plays with a pocket tick on which a live threat had arrived. */
  cases: number;
  /** Of them, ended by a THROW on that tick, by its class. */
  throws: number;
  throwsByClass: Partial<Record<ThrowClass, number>>;
  /** Of them, ended by a SACK on that tick. */
  sacks: number;
}

export function emptyArrivalFold(): ArrivalFold {
  return { ...emptyCheck(), cases: 0, throws: 0, throwsByClass: {}, sacks: 0 };
}

export function arrivalActsCheck(fold: ArrivalFold, play: S2Play, ctx: S2Context): void {
  fold.plays += 1;
  const s = play.statuses.find((x) => x.minTta !== undefined && x.minTta <= 0);
  if (s === undefined) return;
  fold.cases += 1;
  const T = s.tick;
  const sameTick = (x: At): boolean => x.index > s.index && Math.abs(x.tick - T) < TOLERANCE;
  const wrong: string[] = [];
  const later = play.ticks.find((k) => k.index > s.index && k.tick > T + TOLERANCE);
  if (later !== undefined) wrong.push(`tick ${String(later.tick)} follows`);
  if (play.movements.some(sameTick)) wrong.push("a pocket_movement CHECK on it");
  const away = play.throwaways.find(sameTick);
  if (away !== undefined) wrong.push(`a ${away.cause} throwaway on it`);
  const thrown = play.throws.find(sameTick);
  const d = play.dropback;
  if (thrown !== undefined && away === undefined) {
    fold.throws += 1;
    const cls = throwClassOf(d, ctx.tunables).cls;
    fold.throwsByClass[cls] = (fold.throwsByClass[cls] ?? 0) + 1;
  } else if (thrown === undefined && away === undefined && d.sacked && Math.abs(d.endTick - T) < TOLERANCE) fold.sacks += 1;
  else if (away === undefined) wrong.push("the play did not end in a THROW or a SACK on that tick");
  if (wrong.length > 0) fail(fold, atPlay(play, T), `a live threat had arrived (nearest ${String(s.minTta)} s): ${wrong.join("; ")}`);
}

// --- no threat inside the warning coexists with CLEAN ---------------------------------------------

export interface WarningFold extends S2CheckFold {
  statusTicks: number;
  /** Status ticks with a live threat within P. */
  warningTicks: number;
  /** Failures by kind: a warning tick published CLEAN; the rebuilt arrival floor above the status. */
  cleanWithWarning: number;
  floorAboveStatus: number;
}

export function emptyWarningFold(): WarningFold {
  return { ...emptyCheck(), statusTicks: 0, warningTicks: 0, cleanWithWarning: 0, floorAboveStatus: 0 };
}

export function warningCleanCheck(fold: WarningFold, play: S2Play, ctx: S2Context): void {
  fold.plays += 1;
  for (const s of play.statuses) {
    fold.statusTicks += 1;
    const floor = floorFromArrival(ctx.tunables, s.minTta);
    if (severityOf(floor, ctx.tunables) > severityOf(s.status, ctx.tunables)) {
      fold.floorAboveStatus += 1;
      fail(fold, atPlay(play, s.tick), `the arrival floor rebuilt from the live set (${floor}, nearest ${String(s.minTta)} s) is above the published ${s.status}`);
    }
    if (s.minTta === undefined || s.minTta > ctx.P) continue;
    fold.warningTicks += 1;
    if (s.status === "CLEAN") {
      fold.cleanWithWarning += 1;
      fail(fold, atPlay(play, s.tick), `a live threat ${String(s.minTta)} s away, inside the warning (P ${String(ctx.P)}), on a CLEAN tick`);
    }
  }
}

// --- reported: the must-act share and the first must-act tick ---------------------------------------

export interface MustActShareFold {
  dropbacks: number;
  /** Aimed throws (a THROW to a receiver). */
  aimed: number;
  /** Released on a tick with must act's threat part (a live threat within C, or arrived). */
  aimedWithinC: number;
  /** Released on a tick whose own status forces (`forced_throw_share`'s numerator, restated beside). */
  aimedStatusForced: number;
  /** Each dropback's first tick with the threat part: how many had one, their sum, and by tick. */
  firstMustAct: { dropbacks: number; sumSeconds: number; byTick: Record<string, number> };
  /** Each dropback's first status-forcing tick, the same way (`first_forcing_seconds`'s construct). */
  firstStatusForcing: { dropbacks: number; sumSeconds: number; byTick: Record<string, number> };
}

export function emptyMustActShareFold(): MustActShareFold {
  return {
    dropbacks: 0,
    aimed: 0,
    aimedWithinC: 0,
    aimedStatusForced: 0,
    firstMustAct: { dropbacks: 0, sumSeconds: 0, byTick: {} },
    firstStatusForcing: { dropbacks: 0, sumSeconds: 0, byTick: {} },
  };
}

const tickKey = (t: number): string => t.toFixed(1);

function addFirst(cell: { dropbacks: number; sumSeconds: number; byTick: Record<string, number> }, tick: number): void {
  cell.dropbacks += 1;
  cell.sumSeconds = round1(cell.sumSeconds + tick);
  cell.byTick[tickKey(tick)] = (cell.byTick[tickKey(tick)] ?? 0) + 1;
}

export function mustActShare(fold: MustActShareFold, play: S2Play, ctx: S2Context): void {
  fold.dropbacks += 1;
  const d = play.dropback;
  if (isAimed(d) && d.throwTick !== undefined) {
    fold.aimed += 1;
    const s = play.statuses.find((x) => Math.abs(x.tick - (d.throwTick as number)) < TOLERANCE);
    if (s !== undefined && threatPartAt(s, ctx.C)) fold.aimedWithinC += 1;
    if (s !== undefined && ctx.forcing.has(s.status)) fold.aimedStatusForced += 1;
  }
  const firstThreat = play.statuses.find((s) => threatPartAt(s, ctx.C));
  if (firstThreat !== undefined) addFirst(fold.firstMustAct, firstThreat.tick);
  const firstStatus = play.statuses.find((s) => ctx.forcing.has(s.status));
  if (firstStatus !== undefined) addFirst(fold.firstStatusForcing, firstStatus.tick);
}

// --- reported: DESPERATION, clean and dirty -----------------------------------------------------------

export interface GuardCell {
  aimedByBin: number[];
  interceptions: number;
  completions: number;
}

const emptyGuardCell = (): GuardCell => ({ aimedByBin: RELEASE_BINS.map(() => 0), interceptions: 0, completions: 0 });

export type DesperationSplitFold = Record<DesperationPocket, GuardCell>;

export function emptyDesperationSplitFold(): DesperationSplitFold {
  return { CLEAN: emptyGuardCell(), DIRTY: emptyGuardCell() };
}

/** Adds one DESPERATION throw to its half; `false` for any other dropback. */
function addDesperation(fold: DesperationSplitFold, d: Dropback, tunables: Tunables): boolean {
  if (!isAimed(d) || d.throwTick === undefined || throwClassOf(d, tunables).cls !== "DESPERATION") return false;
  const cell = fold[desperationPocketOf(d)];
  const i = RELEASE_BINS.findIndex((b) => b.label === releaseBinOf(d.throwTick as number));
  cell.aimedByBin[i] = (cell.aimedByBin[i] ?? 0) + 1;
  if (d.intercepted) cell.interceptions += 1;
  if (d.caught) cell.completions += 1;
  return true;
}

export function desperationSplit(fold: DesperationSplitFold, play: S2Play, ctx: S2Context): void {
  addDesperation(fold, play.dropback, ctx.tunables);
}

// --- reported: CHECKDOWN, by what forced the look (AM-1 §4.5's composition; review FID-F-2) ----------

/**
 * What forced a CHECKDOWN, on its release tick, which is its look's (the engine looks at the outlet
 * and throws to it on one tick, in the must-decide branch): THREAT, the threat part holds (with the
 * arm's own C, K14); COUNT, the count part holds and the threat part does not; STATUS, neither, and
 * the status forces (step 1's rule only: under PER_RUSHER that is a falsifier failure); NONE,
 * nothing does (a fold fault `mustActCheck` already names on the look).
 */
export const CHECKDOWN_TRIGGERS = ["THREAT", "COUNT", "STATUS", "NONE"] as const;
export type CheckdownTrigger = (typeof CHECKDOWN_TRIGGERS)[number];

export type CheckdownSplitFold = Record<CheckdownTrigger, GuardCell>;

export function emptyCheckdownSplitFold(): CheckdownSplitFold {
  return { THREAT: emptyGuardCell(), COUNT: emptyGuardCell(), STATUS: emptyGuardCell(), NONE: emptyGuardCell() };
}

/** A CHECKDOWN aimed throw's trigger; `undefined` for any other dropback. */
export function checkdownTriggerOf(play: S2Play, ctx: S2Context): CheckdownTrigger | undefined {
  const d = play.dropback;
  if (!isAimed(d) || d.throwTick === undefined || throwClassOf(d, ctx.tunables).cls !== "CHECKDOWN") return undefined;
  const parts = mustActPartsOf(play, ctx);
  const s = parts.statusAt.get(d.throwTick);
  if (s === undefined) return "NONE";
  const p = parts.at(s, d.throwTick);
  return p.threat ? "THREAT" : p.count ? "COUNT" : p.status ? "STATUS" : "NONE";
}

/** CHECKDOWN's aimed throws by trigger, with interceptions and completions: their sum is the guard fold's CHECKDOWN row. */
export function checkdownSplit(fold: CheckdownSplitFold, play: S2Play, ctx: S2Context): void {
  const trigger = checkdownTriggerOf(play, ctx);
  if (trigger === undefined) return;
  const d = play.dropback;
  const cell = fold[trigger];
  const i = RELEASE_BINS.findIndex((b) => b.label === releaseBinOf(d.throwTick as number));
  cell.aimedByBin[i] = (cell.aimedByBin[i] ?? 0) + 1;
  if (d.intercepted) cell.interceptions += 1;
  if (d.caught) cell.completions += 1;
}

// --- reported: the per-game guard vectors (AM-1's paired SE) -----------------------------------------

export interface GuardGameVector {
  /** The game's place in the fold (0, 1, ...): two arms on the same seeds pair game by game. */
  readonly game: number;
  readonly gameId: string;
  /** The game's guard fold (`foldGuardGame`), the classes with at least one aimed throw. */
  readonly classes: Partial<Record<ThrowClass, GuardCell>>;
  /** Its DESPERATION throws by half, the halves with at least one. */
  readonly desperation: Partial<Record<DesperationPocket, GuardCell>>;
}

const aimedIn = (c: GuardCell): number => c.aimedByBin.reduce((a, b) => a + b, 0);

export function guardGameVector(games: GuardGameVector[], events: readonly MatchEventEnvelope[], ctx: S2Context): void {
  const guard = emptyGuardFold();
  foldGuardGame(guard, events, ctx.tunables);
  const classes: Partial<Record<ThrowClass, GuardCell>> = {};
  for (const [cls, cell] of Object.entries(guard) as [ThrowClass, GuardCell][]) if (aimedIn(cell) > 0) classes[cls] = { aimedByBin: [...cell.aimedByBin], interceptions: cell.interceptions, completions: cell.completions };
  const split = emptyDesperationSplitFold();
  let gameId = "";
  for (const play of s2PlaysOf(events)) {
    if (gameId === "") gameId = play.gameId;
    addDesperation(split, play.dropback, ctx.tunables);
  }
  const desperation: Partial<Record<DesperationPocket, GuardCell>> = {};
  for (const half of ["CLEAN", "DIRTY"] as const) if (aimedIn(split[half]) > 0) desperation[half] = split[half];
  games.push({ game: games.length, gameId, classes, desperation });
}

// --- M2 on the arm's own stream -------------------------------------------------------------------------

export function m2Stream(fold: M2StreamFold, events: readonly MatchEventEnvelope[], ctx: S2Context): void {
  foldM2StreamGame(fold, events, ctx.tunables, ctx.positions);
}

// --- all of them together ---------------------------------------------------------------------------------

export interface S2Folds {
  liveSet: LiveSetFold;
  mustAct: MustActFold;
  arrival: ArrivalFold;
  warning: WarningFold;
  share: MustActShareFold;
  desperation: DesperationSplitFold;
  checkdown: CheckdownSplitFold;
  guardGames: GuardGameVector[];
  m2: M2StreamFold;
}

export function emptyS2Folds(): S2Folds {
  return {
    liveSet: emptyLiveSetFold(),
    mustAct: emptyMustActFold(),
    arrival: emptyArrivalFold(),
    warning: emptyWarningFold(),
    share: emptyMustActShareFold(),
    desperation: emptyDesperationSplitFold(),
    checkdown: emptyCheckdownSplitFold(),
    guardGames: [],
    m2: emptyM2StreamFold(),
  };
}

/**
 * The table `foldS2Game` calls each check through. It is an object, not a list of direct calls, so
 * `pocketStep2K14.test.ts` can see each check's arguments (K14: every check is handed the arm's own
 * tunables, in the context). Nothing else writes it.
 */
export const s2Checks = {
  liveSet: liveSetCheck,
  mustAct: mustActCheck,
  arrival: arrivalActsCheck,
  warning: warningCleanCheck,
  share: mustActShare,
  desperation: desperationSplit,
  checkdown: checkdownSplit,
  guardGame: guardGameVector,
  m2: m2Stream,
};

/** Every step-2 stream check and reading on one game, with the arm that played it (K14: never a default). */
export function foldS2Game(folds: S2Folds, events: readonly MatchEventEnvelope[], tunables: Tunables, snapshot: GameSnapshot): void {
  const ctx = s2ContextOf(tunables, snapshot);
  for (const play of s2PlaysOf(events)) {
    s2Checks.liveSet(folds.liveSet, play, ctx);
    s2Checks.mustAct(folds.mustAct, play, ctx);
    s2Checks.arrival(folds.arrival, play, ctx);
    s2Checks.warning(folds.warning, play, ctx);
    s2Checks.share(folds.share, play, ctx);
    s2Checks.desperation(folds.desperation, play, ctx);
    s2Checks.checkdown(folds.checkdown, play, ctx);
  }
  s2Checks.guardGame(folds.guardGames, events, ctx);
  s2Checks.m2(folds.m2, events, ctx);
}

// --- verdicts -------------------------------------------------------------------------------------------

/**
 * The folds' structural failures, by check; empty when every check that applies passed. The
 * must-act line names what its failures mean on this arm: under PER_RUSHER the falsifier failed
 * ("fired on the counter alone"); under step 1's rule or the narrower counter the count part's
 * restatement failed its self-check (a fold fault). The witness line, on every arm, is the
 * self-check's other direction (a fold fault too). M2 STREAM's identity rebuild is a fold fault
 * too: its rebuilt statuses and won-rep threats must equal the stream's, its rolled ticks their
 * own clock's margin, and under PER_RUSHER (with C at or inside M2's 0.5 s far line, every
 * PER_RUSHER arm of step 2) its construct must be 0.
 */
export function s2Problems(folds: S2Folds): readonly string[] {
  const out: string[] = [];
  const line = (name: string, fold: S2CheckFold): void => {
    if (fold.problemCount > 0) out.push(`${name}: ${String(fold.problemCount)} failure${fold.problemCount === 1 ? "" : "s"}, first: ${fold.problems[0] ?? ""}`);
  };
  line("liveSet", folds.liveSet);
  line(folds.mustAct.rule === "PER_RUSHER" ? "mustAct (PER_RUSHER: counterAlone)" : `mustAct (${String(folds.mustAct.rule)}: the count part's self-check)`, folds.mustAct);
  line("mustAct witness (the self-check's other direction: closing HOLDs and CLOCK_EXPIRED)", folds.mustAct.witness);
  line("arrival (everyArrival)", folds.arrival);
  line("warning (no threat inside the warning on a CLEAN tick)", folds.warning);
  const m = folds.m2;
  const wrong: string[] = [];
  if (m.statusMismatches > 0) wrong.push(`${String(m.statusMismatches)} of ${String(m.statusChecks)} rebuilt statuses`);
  if (m.threatMismatches > 0) wrong.push(`${String(m.threatMismatches)} of ${String(m.threatChecks)} rebuilt won-rep threats`);
  if (m.jitterMismatches > 0) wrong.push(`${String(m.jitterMismatches)} of ${String(m.jitterChecks)} rolled tick margins`);
  if (m2ZeroByTheRule(m) && m.counterFar !== 0) wrong.push(`the construct is ${String(m.counterFar)}, not 0 by the rule`);
  if (wrong.length > 0) out.push(`m2 STREAM identity: ${wrong.join("; ")}`);
  return out;
}

/** The structural clauses' case counts: each must be above 0 for its clause to pass. */
export function s2Cases(folds: S2Folds): { readonly forcedActs: number; readonly arrivals: number; readonly warningTicks: number; readonly statusTicks: number } {
  return { forcedActs: folds.mustAct.acts, arrivals: folds.arrival.cases, warningTicks: folds.warning.warningTicks, statusTicks: folds.warning.statusTicks };
}

/** The self-check of one arm's must-act fold, as `selfCheckOf` reads it. */
export interface MustActSelfCheck {
  /**
   * The restated count part is not too strict, on a step-1-rule arm (A1 at step 2, plan §1.7 (ii)):
   * every forced act on a tick whose status does not force satisfies it. `null` on a PER_RUSHER
   * arm, where the same population is the falsifier's.
   */
  readonly offRule: { readonly acts: number; readonly counted: number; readonly exceptions: number } | null;
  /** The parts are not too generous, on every arm (`MustActWitnessFold`). */
  readonly witness: { readonly holds: number; readonly countHolds: number; readonly clockExpired: number; readonly exceptions: number };
  /** No exception in either direction, and each direction saw a case (a forced act; a closing HOLD past `throwawayEarliestSeconds`). */
  readonly passed: boolean;
}

export function selfCheckOf(fold: MustActFold): MustActSelfCheck {
  const w = fold.witness;
  const offRule = fold.rule === null || fold.rule === "PER_RUSHER" ? null : { acts: fold.offRule, counted: fold.offRuleCounted, exceptions: fold.problemCount };
  const witness = { holds: w.holds, countHolds: w.countHolds, clockExpired: w.clockExpired, exceptions: w.problemCount };
  return { offRule, witness, passed: (offRule === null || (offRule.exceptions === 0 && fold.acts > 0)) && witness.exceptions === 0 && witness.countHolds > 0 };
}

/** The checkdown looks by trigger (AM-1 §4.5's composition): the CHECKDOWN_LOOK row of the must-act fold. */
export function checkdownTriggersOf(fold: MustActFold): ForcedActCell & { readonly rule: M2ForcingRule | null } {
  return { rule: fold.rule, ...fold.byKind.CHECKDOWN_LOOK };
}

/** The must-act share and the first must-act tick, as the report prints them (percent; seconds). */
export function mustActShareSummary(fold: MustActShareFold): Readonly<Record<string, number | null>> {
  const pct = (n: number, d: number): number | null => (d === 0 ? null : Number(((100 * n) / d).toFixed(2)));
  const mean = (c: { dropbacks: number; sumSeconds: number }): number | null => (c.dropbacks === 0 ? null : Number((c.sumSeconds / c.dropbacks).toFixed(3)));
  return {
    dropbacks: fold.dropbacks,
    aimed: fold.aimed,
    mustActSharePct: pct(fold.aimedWithinC, fold.aimed),
    statusForcedSharePct: pct(fold.aimedStatusForced, fold.aimed),
    firstMustActSeconds: mean(fold.firstMustAct),
    firstMustActDropbacks: fold.firstMustAct.dropbacks,
    firstStatusForcingSeconds: mean(fold.firstStatusForcing),
    firstStatusForcingDropbacks: fold.firstStatusForcing.dropbacks,
  };
}

/** The M2 STREAM summary of these folds (`m2StreamSummary`), for the report. */
export function m2StreamOf(folds: S2Folds): Readonly<Record<string, unknown>> {
  return m2StreamSummary(folds.m2);
}
