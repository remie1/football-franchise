/**
 * ADR-089 step 4 — EACH RUSHER'S CONTACT TIME, KEPT BESIDE THE PLAY (plan §2.2 item 9, §2.1's
 * `contactSecondsOf`; D21; `pocket-1` from `pocket-1.s4` only).
 *
 * A per-play side map keyed by rusher, created by `simulatePassPlay` only when the play's rules carry
 * a step-4 block (`pocket.contact` or `throwExec.motion`), so under `legacy`, s1, s2 and s3 it does
 * not exist and no line of it runs. It is filled where the threats are built and moved where they
 * are delayed, and read where a `QB_HIT` states `contactSeconds` and where the throwing motion's race
 * runs. The shared constructors (`threatFromWonRep`, `delayThreat`, `arrivedAt`) and `RushThreat`'s
 * key set do not change, and `publishThreat` copies named fields only, so nothing here reaches a
 * `RUSH_THREAT` (critique 3 S2, critique 2 F5).
 *
 * How a rusher's contact time is read (`resolve/motion.ts`'s `ContactClock`):
 *  - a free runner: his free-run time in tenths, his `etaTick` as the clock set it;
 *  - a won rep or a late block under shape S: the continuous breaking time (the matchup's `beat.T`,
 *    or the late beat's) plus his travel, the travel being his threat's `etaTick - wonAtTick`;
 *  - a won rep or a late block under shape L: the crossing time `T_L` from the margin on the win's
 *    tick and the margin on the tick before (the matchup's `previousMargin`), plus his travel;
 *  - the half-second reading (`throwExec.motion.reading` GRID, D14) and kind T (today's clock, which
 *    has no breaking time): his published `etaTick`, for every man;
 *  - every DELAYED wait he serves after that adds its seconds: the threat's `etaTick` after the
 *    delay minus before it (a step-up, a recovering blocker, a shed), as published.
 * A new threat for the same man (a later win that replaced his threat) starts his entry again.
 *
 * Pure bookkeeping: no die, no clock read, no event.
 */
import type { PlayerId } from "@ff/contracts";
import { contactSecondsOf } from "../resolve/motion.js";
import type { ContactClock } from "../resolve/motion.js";
import type { ArrivalClock } from "../resolve/rushThreat.js";

/** How the book reads a man's contact time: D21's continuous reading, or the published grid. */
export type ContactReading = "CONTINUOUS" | "GRID";

interface ContactEntry {
  readonly clock: ContactClock;
  /** Every DELAYED wait served since the entry began, in seconds (0 or more). */
  delayedSeconds: number;
}

/** The travel a threat built from a win carries: its arrival minus the tick it was won, in tenths. */
export function travelOf(threat: ArrivalClock): number {
  return Number((threat.etaTick - threat.wonAtTick).toFixed(1));
}

/** Shape L's inputs to `T_L` at the win (`resolve/motion.ts`'s `crossingSeconds`). */
export interface CrossingAtWin {
  readonly tickStepSeconds: number;
  /** `RUSHER_WINS_REP`'s minimum margin. */
  readonly threshold: number;
  /** m(t): the margin on the win's tick. */
  readonly margin: number;
  /** m(t - s): the margin on the tick before; absent only on the clock's first tick (m(0) = 0). */
  readonly previousMargin: number | undefined;
}

export class ContactBook {
  private readonly entries = new Map<string, ContactEntry>();

  constructor(readonly reading: ContactReading) {}

  /** A free runner's threat, published at the snap: his free-run time (or, on the grid, his `etaTick`). */
  startFreeRunner(threat: ArrivalClock): void {
    this.begin(threat.rusher, this.reading === "GRID" ? { kind: "GRID", etaTick: threat.etaTick } : { kind: "FREE_RUN", etaTick: threat.etaTick });
  }

  /**
   * A threat built from a win under shape S (a won rep or a beaten late block): the breaking time
   * plus his travel. `breakingSeconds` is the beat's continuous `T` when the threat was built on the
   * beat's own tick; a caller with no breaking time for this win passes the win's tick.
   */
  startWonRepS(threat: ArrivalClock, breakingSeconds: number): void {
    this.begin(
      threat.rusher,
      this.reading === "GRID"
        ? { kind: "GRID", etaTick: threat.etaTick }
        : { kind: "BREAKING", breakingSeconds, travelSeconds: travelOf(threat) },
    );
  }

  /** A threat built from a win under shape L: the crossing time from the two margins, plus his travel. */
  startWonRepL(threat: ArrivalClock, crossing: CrossingAtWin): void {
    if (this.reading === "GRID") {
      this.begin(threat.rusher, { kind: "GRID", etaTick: threat.etaTick });
      return;
    }
    this.begin(threat.rusher, {
      kind: "CROSSING",
      travelSeconds: travelOf(threat),
      tick: threat.wonAtTick,
      tickStepSeconds: crossing.tickStepSeconds,
      threshold: crossing.threshold,
      margin: crossing.margin,
      ...(crossing.previousMargin === undefined ? {} : { previousMargin: crossing.previousMargin }),
    });
  }

  /** Kind T's clock and any threat whose origin has no continuous time: his published `etaTick`. */
  startGrid(threat: ArrivalClock): void {
    this.begin(threat.rusher, { kind: "GRID", etaTick: threat.etaTick });
  }

  /** A DELAYED publication: the seconds his `etaTick` moved are added to his entry. */
  delayed(before: ArrivalClock, after: ArrivalClock): void {
    const entry = this.entries.get(String(before.rusher));
    if (entry === undefined) {
      throw new Error(`@ff/engine: a DELAYED threat of ${String(before.rusher)} has no contact-time entry`);
    }
    const seconds = Number((after.etaTick - before.etaTick).toFixed(1));
    if (!(seconds >= 0)) {
      throw new Error(`@ff/engine: a DELAYED threat of ${String(before.rusher)} moved earlier (${String(seconds)} s)`);
    }
    entry.delayedSeconds = Number((entry.delayedSeconds + seconds).toFixed(1));
  }

  /** His contact time now (D21), in seconds from the snap. Throws when he has no entry (an engine fault). */
  contactSeconds(rusher: PlayerId): number {
    const entry = this.entries.get(String(rusher));
    if (entry === undefined) throw new Error(`@ff/engine: the rusher ${String(rusher)} has no contact-time entry`);
    return contactSecondsOf(entry.clock, entry.delayedSeconds);
  }

  /** His entry's clock, for tests and the renderer of a debug line; `undefined` when he has none. */
  clockOf(rusher: PlayerId): ContactClock | undefined {
    return this.entries.get(String(rusher))?.clock;
  }

  private begin(rusher: PlayerId, clock: ContactClock): void {
    this.entries.set(String(rusher), { clock, delayedSeconds: 0 });
  }
}
