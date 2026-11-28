/**
 * ADR-089 step 6: THE STREAM'S STEP-6 FACTS, read once for every reader (step-6 plan §3.2 K2; AM-13
 * `escapeOutcome`, `scrambleCount`; critique 2 #7; critique 3 #5).
 *
 * Step 6 (`pocket-1.s6`, the outs) puts on the stream what no earlier stamp carries: an escape roll
 * whose catch the quarterback sheds and plays on (2.8), the escape cap (2.3), the deadline pick
 * (`pocket_movement` on `movement/t<tick>:deadline`, 2.11) and its OUT_OF_POCKET throwaway (P9) with
 * `THROWAWAY.outsideTackleBox` (P10), the escape's direction (`QB_DECISION.direction`, P11), the drill
 * (`scramble_drill` CHECK, P12) and the failed-scramble marker (`PLAY_START.scoring`, plan §1.3).
 * This module reads them from one play's events, in stream order, so each reader asks the same
 * questions the same way:
 *
 *  - **The escape roll's outcome** (AM-13 `escapeOutcome`) is read from its `scramble` CHECK's band
 *    under the arm's own §8.8 table (K14): a band with `escaped` is ESCAPED, a band with `sacked` is
 *    caught, any other CONTAINED; a catch is split into CAUGHT_SACKED (the play is a sack at the roll)
 *    and CAUGHT_SHED (a `QB_HIT` SHED follows the roll on its tick: he shed the catch and plays on, in
 *    the pocket). Step 5a's event reading (QB_PURSUIT on the roll's tick is ESCAPED, the play's sack on
 *    it is CAUGHT, anything else CONTAINED) is kept beside as `eventOutcome`: it turns a shed into
 *    CONTAINED, which is why step 6 reads the band.
 *  - **The catcher** is the rusher of the caught escape's `arrival_contest` (2.8), else the man the
 *    stream publishes ARRIVED after the roll on its tick (a live catcher), else nobody (a catch that
 *    named nobody, or a man still in his block without 2.8, who has no threat to publish).
 *  - **The label rule's sack** (engine-2's ruling): a catch by a man whose contest label was already
 *    drawn on the tick is his sack with no die, so no `arrival_contest` and no `QB_HIT`: under
 *    `caughtAsContact`, a CAUGHT_SACKED roll with a catcher named ARRIVED and no contest after it.
 *    Readers count these apart, so a contact reader neither drops nor doubles them.
 *  - **The cap** (2.3): each roll spends the play's escape by its band (every band, but CONTAINED
 *    under CONTAINED_DOES_NOT_SPEND), restated from the engine's `escapeRollSpends`.
 *
 * No die is drawn and nothing here is graded. On a play whose `PLAY_START.rules` does not read step
 * 6's facts (`readsStep6Facts`: every `legacy` and s1 to s5a play) `readS6Play` returns `undefined`,
 * so a reader that asks it reads every earlier stream as before.
 */
import type { MatchEventEnvelope, ThrowawayCause } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { readsStep6Facts, rulesOnPlayStart } from "./rules.js";

/** The deadline pick's roll label ends `:deadline` (2.11: `.../movement/t<tick>:deadline`). */
export const DEADLINE_PICK_SUFFIX = ":deadline";

export function isDeadlinePickLabel(rngLabel: string): boolean {
  return rngLabel.endsWith(DEADLINE_PICK_SUFFIX);
}

/** P9's throwaway cause: the throwaway after an escape, out of the pocket (the deadline pick's). */
export const OUT_OF_POCKET = "OUT_OF_POCKET";

/** The causes a step-6 stream can carry: today's two and P9's (calibration's stand-in until the lift). */
export type ThrowawayCauseS6 = ThrowawayCause | typeof OUT_OF_POCKET;

/** P12's CHECK kind: the drill's fresh rep (calibration's stand-in until the lift). */
export const SCRAMBLE_DRILL_KIND = "scramble_drill";

/** A run's tackle CHECK kinds: the statline's `TACKLE_KINDS` (`engine/src/stats/statline.ts`), restated. */
export const TACKLE_KINDS: ReadonlySet<string> = new Set(["tackle", "yac_tackle", "break_tackle"]);

/** The outs block as the engine's tunables type it (`pocket.outs`; never in `DEFAULT_TUNABLES`). */
export type OutsTunables = NonNullable<Tunables["pocket"]["outs"]>;

/** The arm's outs block (K14: the arm's own tunables), `undefined` on every tree without one. */
export function outsOf(tunables: Tunables): OutsTunables | undefined {
  return tunables.pocket.outs;
}

const obj = (v: unknown): Readonly<Record<string, unknown>> | undefined => (typeof v === "object" && v !== null ? (v as Readonly<Record<string, unknown>>) : undefined);

/** The failed-scramble marker (plan §1.3): `PLAY_START.payload.scoring.failedScramble` is "SACK". */
export function failedScrambleMarkerOf(playStartPayload: unknown): boolean {
  return obj(obj(playStartPayload)?.["scoring"])?.["failedScramble"] === "SACK";
}

/** An escape roll's band read by the arm's own §8.8 table. */
export type EscapeBandOutcome = "ESCAPED" | "CONTAINED" | "CAUGHT";

export function escapeBandOutcomeOf(tunables: Tunables, band: string | undefined): EscapeBandOutcome {
  const b = tunables.scramble.bands.find((x) => x.label === band);
  if (b === undefined) throw new Error(`s6Stream: a scramble CHECK band the arm's table does not name: ${String(band)}`);
  return b.escaped ? "ESCAPED" : b.sacked ? "CAUGHT" : "CONTAINED";
}

/** Step 6's outcome of an escape roll (AM-13 `escapeOutcome`): the band's, with a catch split. */
export const S6_ESCAPE_OUTCOMES = ["ESCAPED", "CONTAINED", "CAUGHT_SACKED", "CAUGHT_SHED"] as const;
export type S6EscapeOutcome = (typeof S6_ESCAPE_OUTCOMES)[number];

/** Whether an escape roll of `band` spends the play's escape under the cap (the engine's `escapeRollSpends`). */
export function escapeRollSpendsS6(outs: OutsTunables | undefined, band: string): boolean {
  const cap = outs?.escapeCap;
  if (cap === undefined) return false;
  return cap.whenSpent !== "CONTAINED_DOES_NOT_SPEND" || band !== "CONTAINED";
}

/** One escape roll of a step-6 play. */
export interface S6EscapeRoll {
  /** The roll's index among the play's events. */
  readonly index: number;
  readonly tick: number;
  readonly band: string;
  readonly rollRef: string;
  /** The roll answered a step-5a clean pick (a `:clean` CHECK on its tick before it). */
  readonly clean: boolean;
  /** The band of the `pocket_movement` CHECK that offered it (the last before it on its tick), if any. */
  readonly offeredBy: string | undefined;
  readonly outcome: S6EscapeOutcome;
  /** Step 5a's event reading, printed beside (AM-13 `escapeOutcome`). */
  readonly eventOutcome: "ESCAPED" | "CONTAINED" | "CAUGHT";
  /** The man who caught him (the contest's rusher, else the man published ARRIVED after the roll), if any. */
  readonly catcher: string | undefined;
  /** The caught escape's `arrival_contest` band (2.8), if one ran. */
  readonly contestBand: string | undefined;
  /** The catch is the label rule's sack (no contest, no `QB_HIT`; engine-2's ruling). */
  readonly labelRuleSack: boolean;
  /** Under the cap, this roll spends the play's escape. */
  readonly spends: boolean;
}

/** The deadline pick (2.11): its tick, band and what he did. */
export interface S6DeadlinePick {
  readonly tick: number;
  readonly band: string | undefined;
  readonly rollRef: string;
  readonly choice: "THROWAWAY" | "RUN" | undefined;
}

/** One play's step-6 facts. */
export interface S6Play {
  readonly rules: string;
  /** `PLAY_START.scoring.failedScramble` is "SACK" (plan §1.3). */
  readonly marker: boolean;
  readonly escapes: readonly S6EscapeRoll[];
  readonly deadlinePicks: readonly S6DeadlinePick[];
  /** Every `scramble_drill` CHECK (P12): the receiver, the defender, the position band. */
  readonly drills: readonly { readonly tick: number; readonly receiver: string; readonly defender: string | undefined; readonly band: string | undefined }[];
  /** Every decision that names a side (P11). */
  readonly directions: readonly { readonly tick: number; readonly choice: string; readonly direction: string }[];
  /** The play's throwaway, with its cause and P10's flag when the stream carries one. */
  readonly throwaway: { readonly tick: number; readonly cause: string; readonly outsideTackleBox: boolean | undefined } | undefined;
  /** A SCRAMBLE run: its yards, and the defender of the last tackle contest the carrier lost (the statline's tackler). */
  readonly scramble: { readonly yards: number; readonly tackler: string | undefined } | undefined;
  /** The marker and a SCRAMBLE run at 0 yards or less: a sack by the rescoring rule (2.12). */
  readonly failedScrambleSack: boolean;
  /** The play ends in a sack by the dropback's dichotomy, or by the rescoring rule. */
  readonly sacked: boolean;
  readonly endTick: number;
}

/**
 * One play's step-6 facts, read with the arm's own tunables (K14), or `undefined` when its
 * `PLAY_START.rules` does not read step 6's facts. `events` is one play's slice, PLAY_START first.
 */
export function readS6Play(events: readonly MatchEventEnvelope[], tunables: Tunables): S6Play | undefined {
  const start = events.find((e) => e.event.type === "PLAY_START");
  const payload = start === undefined ? undefined : (start.event as { readonly payload?: unknown }).payload;
  const rules = rulesOnPlayStart(payload)?.name;
  if (!readsStep6Facts(rules)) return undefined;
  if (obj(payload)?.["kind"] !== "PASS_PLAY_V1") return undefined;
  const outs = outsOf(tunables);
  const marker = failedScrambleMarkerOf(payload);
  const ticks: number[] = [];
  let tick = 0;
  events.forEach(({ event }) => {
    if (event.type === "TICK") tick = event.payload.tick;
    ticks.push(tick);
  });
  const tickOf = (i: number): number => ticks[i] ?? 0;
  /** The events after `i` on its own tick, in order. */
  const restOfTick = (i: number): readonly { readonly index: number; readonly event: MatchEventEnvelope["event"] }[] => {
    const out: { index: number; event: MatchEventEnvelope["event"] }[] = [];
    for (let j = i + 1; j < events.length; j++) {
      const e = events[j]!.event;
      if (e.type === "TICK") break;
      out.push({ index: j, event: e });
    }
    return out;
  };
  let threw = false;
  let throwaway: S6Play["throwaway"];
  let scramble: { yards: number } | undefined;
  let turnover = false;
  let caught = false;
  let pursuitTick: number | undefined;
  let lastTackler: string | undefined;
  const drills: { tick: number; receiver: string; defender: string | undefined; band: string | undefined }[] = [];
  const directions: { tick: number; choice: string; direction: string }[] = [];
  const deadlinePicks: S6DeadlinePick[] = [];
  const rolls: { index: number; tick: number; band: string; rollRef: string; clean: boolean; offeredBy: string | undefined }[] = [];
  let lastMovement: { tick: number; band: string | undefined; clean: boolean } | undefined;
  events.forEach(({ event }, index) => {
    const t = tickOf(index);
    switch (event.type) {
      case "CHECK": {
        const c = event.payload;
        const kind: string = c.checkKind;
        if (kind === "pocket_movement" && c.roll !== undefined) {
          if (isDeadlinePickLabel(c.roll.rngLabel)) {
            let choice: S6DeadlinePick["choice"];
            for (const x of restOfTick(index)) {
              if (x.event.type !== "QB_DECISION") continue;
              choice = x.event.payload.choice === "THROWAWAY" ? "THROWAWAY" : x.event.payload.choice === "SCRAMBLE" ? "RUN" : undefined;
              break;
            }
            deadlinePicks.push({ tick: t, band: c.band, rollRef: c.roll.rngLabel, choice });
          } else lastMovement = { tick: t, band: c.band, clean: c.roll.rngLabel.endsWith(":clean") };
        } else if (kind === "scramble" && c.roll !== undefined) {
          const offered = lastMovement !== undefined && lastMovement.tick === t ? lastMovement : undefined;
          rolls.push({ index, tick: t, band: String(c.band), rollRef: c.roll.rngLabel, clean: offered?.clean === true, offeredBy: offered?.band });
        } else if (kind === SCRAMBLE_DRILL_KIND) {
          drills.push({ tick: t, receiver: String(c.actors[0]), defender: c.actors[1] === undefined ? undefined : String(c.actors[1]), band: c.band });
        } else if (TACKLE_KINDS.has(kind) && c.margin < 0 && c.actors[1] !== undefined) {
          lastTackler = String(c.actors[1]);
        }
        return;
      }
      case "QB_DECISION": {
        const direction = obj(event.payload)?.["direction"];
        if (typeof direction === "string") directions.push({ tick: t, choice: event.payload.choice, direction });
        return;
      }
      case "THROW":
        threw = true;
        return;
      case "THROWAWAY": {
        const cause: string = event.payload.cause;
        const flag = obj(event.payload)?.["outsideTackleBox"];
        throwaway = { tick: t, cause, outsideTackleBox: typeof flag === "boolean" ? flag : undefined };
        return;
      }
      case "QB_PURSUIT":
        pursuitTick ??= t;
        return;
      case "RUN_RESOLUTION":
        if (event.payload.carryType === "SCRAMBLE") scramble = { yards: event.payload.yards };
        return;
      case "CATCH_RESOLUTION":
        if (event.payload.caught) caught = true;
        return;
      case "PLAY_RESULT":
        turnover = event.payload.turnover;
        return;
      default:
        return;
    }
  });
  const endTick = tickOf(events.length - 1);
  const intercepted = turnover && !caught && threw;
  const failedScrambleSack = marker && scramble !== undefined && scramble.yards <= 0;
  const sacked = failedScrambleSack || (!threw && throwaway === undefined && scramble === undefined && !intercepted);
  const escapes: S6EscapeRoll[] = rolls.map((r) => {
    const byBand = escapeBandOutcomeOf(tunables, r.band);
    let catcher: string | undefined;
    let contestBand: string | undefined;
    let contestRef: string | undefined;
    let shed = false;
    let arrived: string | undefined;
    for (const x of restOfTick(r.index)) {
      const e = x.event;
      if (e.type === "RUSH_THREAT" && e.payload.state === "ARRIVED") arrived ??= String(e.payload.rusher);
      else if (e.type === "CHECK" && (e.payload.checkKind as string) === "arrival_contest" && contestBand === undefined && byBand === "CAUGHT") {
        contestBand = e.payload.band;
        contestRef = e.payload.roll?.rngLabel;
        catcher = e.payload.actors[0] === undefined ? undefined : String(e.payload.actors[0]);
      } else if ((e.type as string) === "QB_HIT" && contestRef !== undefined) {
        const hit = obj((e as { readonly payload?: unknown }).payload);
        if (hit?.["rollRef"] === contestRef && hit["phase"] === "SHED") shed = true;
      }
    }
    if (byBand === "CAUGHT") catcher ??= arrived;
    const outcome: S6EscapeOutcome = byBand === "CAUGHT" ? (shed ? "CAUGHT_SHED" : "CAUGHT_SACKED") : byBand;
    const eventOutcome = pursuitTick !== undefined && pursuitTick === r.tick ? "ESCAPED" : sacked && endTick === r.tick ? "CAUGHT" : "CONTAINED";
    const labelRuleSack = outs?.caughtAsContact === true && outcome === "CAUGHT_SACKED" && contestBand === undefined && arrived !== undefined;
    return {
      index: r.index,
      tick: r.tick,
      band: r.band,
      rollRef: r.rollRef,
      clean: r.clean,
      offeredBy: r.offeredBy,
      outcome,
      eventOutcome,
      catcher,
      contestBand,
      labelRuleSack,
      spends: escapeRollSpendsS6(outs, r.band),
    };
  });
  return {
    rules: rules ?? "",
    marker,
    escapes,
    deadlinePicks,
    drills,
    directions,
    throwaway,
    scramble: scramble === undefined ? undefined : { yards: scramble.yards, tackler: lastTackler },
    failedScrambleSack,
    sacked,
    endTick,
  };
}

/** The phases at or past a route's break (`resolve/route.ts`'s `routePhaseAt`; `m6Contact.ts`'s `BROKEN_PHASES`, restated so this file imports no reader). */
export const BREAK_PHASES: readonly string[] = ["OPEN", "SETTLED", "DECAYING"];

/** What the real throwaway rule's restatement reads of a dropback: its routes and its CHECKs, each with its tick. */
export interface ThrowawayRuleFacts {
  readonly routes: readonly { readonly tick: number; readonly receiver: string; readonly phase: string }[];
  readonly checks: readonly { readonly tick: number; readonly checkKind: string }[];
}

const RULE_TOLERANCE = 1e-9;

/**
 * ADR-089 step 6 (plan §2.1; AM-13 `throwawayRule`): the real throwaway rule, restated from the stream
 * where a reader restated the 2.0 s gate. A throwaway in the pocket is legal on a tick at or past the
 * play's drop floor (0 where the call has none) on which some receiver's route has reached its break
 * (his latest `ROUTE_STATUS` at or before the tick is OPEN, SETTLED or DECAYING: the phase leaves
 * DEVELOPING at his ready time, and his rep is resolved there, which is the engine's
 * `throwawayLegalInPocket`), and never on a tick that ran an `arrival_contest` (a throwaway with a hand
 * on him is step 7's contact choice). The engine reads it at the forced pick and on the CLOCK_EXPIRED
 * path. No die.
 */
export function throwawayLegalAt(d: ThrowawayRuleFacts, tick: number, floorSeconds: number): boolean {
  if (tick < floorSeconds - RULE_TOLERANCE) return false;
  if (d.checks.some((c) => c.checkKind === "arrival_contest" && Math.abs(c.tick - tick) < RULE_TOLERANCE)) return false;
  const latest = new Map<string, string>();
  for (const r of d.routes) if (r.tick <= tick + RULE_TOLERANCE) latest.set(r.receiver, r.phase);
  for (const phase of latest.values()) if (BREAK_PHASES.includes(phase)) return true;
  return false;
}

/**
 * Whether a throwaway was legal in the pocket on `tick` under the arm's rules: the real rule's
 * restatement under `pocket.outs.throwawayRule`, the 2.0 s gate (`qb.throwawayEarliestSeconds`) under
 * every other tree, as every earlier reader reads it.
 */
export function throwawayAvailableAt(tunables: Tunables, d: ThrowawayRuleFacts, tick: number, floorSeconds: number): boolean {
  return outsOf(tunables)?.throwawayRule === true ? throwawayLegalAt(d, tick, floorSeconds) : tick >= tunables.qb.throwawayEarliestSeconds;
}

/**
 * The escape rolls among a dropback's CHECKs on ticks before `tick` that spent his escape under the
 * cap (`escapeRollSpendsS6`; none with no cap): the spent case's test (2.3), which the must-act
 * witness reads to tell a spent-case HOLD from a closing HOLD.
 */
export function spentRollsBefore(checks: readonly { readonly tick: number; readonly checkKind: string; readonly band: string | undefined }[], tick: number, outs: OutsTunables | undefined): number {
  return checks.filter((c) => c.checkKind === "scramble" && c.tick < tick - RULE_TOLERANCE && escapeRollSpendsS6(outs, String(c.band))).length;
}

/** The escape rolls of `play` before event `index` that spent his escape under the cap. */
export function escapesSpentBefore(play: S6Play, index: number): number {
  return play.escapes.filter((e) => e.index < index && e.spends).length;
}

/** The escape rolls of `play` before event `index`. */
export function escapeRollsBefore(play: S6Play, index: number): number {
  return play.escapes.filter((e) => e.index < index).length;
}
