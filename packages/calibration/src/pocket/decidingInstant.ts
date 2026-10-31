/**
 * ENTRY 107'S DECIDING-INSTANT MULTI-CHANNEL SHARE, RESTATED (ADR-089 step 0; plan §6.1, §6.4;
 * `docs/decisions/CALIBRATION-BACKLOG.md` entry 107, figure at :7599; C1-N6).
 *
 * Entry 107 asked, of every forced dropback, whether the FIRST tick whose published status forces a
 * decision (the deciding instant) needed exactly one of the three pocket channels (counter, band
 * floor, arrival) or was over-determined by two or more. The algorithm lives file-local in a test
 * (`test/forcingDecidingInstant.test.ts:166`, `soleChannelsOverRange`; and the per-game buffering
 * of `processGame`, `:331-400`), so `src` cannot import it. It is restated here unchanged in
 * method, over the same `reconstructPlay` (`knownTruth/pocketChannelShares.ts:286`):
 *
 *  - a channel is SOLE at a range of ticks when removing it leaves no tick of the range forcing
 *    (the worst of the other two channels is never in `pocket.forcesDecision`);
 *  - none sole is MULTI; exactly one is SOLE; two or more is AMBIGUOUS (never seen, asserted 0);
 *  - a dropback is forced when any published `POCKET_STATUS` is in `forcesDecision`; its deciding
 *    instant is the first reconstructed tick whose published status is.
 *
 * The whole-duration reading (the same test over every tick) is carried beside it as entry 107's
 * own cross-check, and the multi ticks are split, as entry 107 split them, into the band floor and
 * arrival tie by the argmin-arrival rusher's alignment, against everything else.
 *
 * **Entry 107 predates ADR-058** (`653d425`), which narrowed the band floor: a won rep whose threat
 * is live no longer floors it, so on today's ticks the arrival channel decides alone and the
 * deciding-instant tie entry 107 counted is gone. The same test file rereads the ticks under the
 * superseded rule for exactly this reason (`oldStyleTicks`, `forcingDecidingInstant.test.ts:263-269`:
 * `bandFloor := bandFloorUnnarrowed`, `published := ` the worst of the three), and that reading is
 * restated and folded here beside today's (`old*` fields), so the report can show both.
 */
import type { MatchEventEnvelope, PlayerId, Position } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { CHANNEL_IDS, reconstructPlay, type ChannelId, type TickChannels } from "../knownTruth/pocketChannelShares.js";
import { severityOf } from "../knownTruth/pocketLadder.js";

/** The channels that are each, alone, necessary for some tick of `ticks` to force (`soleChannelsOverRange`). */
export function soleChannelsOverRange(ticks: readonly TickChannels[], forcing: ReadonlySet<string>, tunables: Tunables): readonly ChannelId[] {
  const soleFor: ChannelId[] = [];
  for (const removed of CHANNEL_IDS) {
    const others = CHANNEL_IDS.filter((c) => c !== removed);
    let stillForces = false;
    for (const t of ticks) {
      let worst = "CLEAN";
      for (const o of others) {
        const v = t[o];
        if (severityOf(v, tunables) > severityOf(worst, tunables)) worst = v;
      }
      if (forcing.has(worst)) {
        stillForces = true;
        break;
      }
    }
    if (!stillForces) soleFor.push(removed);
  }
  return soleFor;
}

export interface Classification {
  readonly kind: "sole" | "multi" | "ambiguous";
  readonly sole: ChannelId | undefined;
}

export function classifySole(soleFor: readonly ChannelId[]): Classification {
  if (soleFor.length === 0) return { kind: "multi", sole: undefined };
  if (soleFor.length === 1) return { kind: "sole", sole: soleFor[0] };
  return { kind: "ambiguous", sole: undefined };
}

/** The tunables' forcing set (`pocket.forcesDecision`). */
export function forcingSetOf(tunables: Tunables): ReadonlySet<string> {
  return new Set<string>(tunables.pocket.forcesDecision as readonly string[]);
}

/** The game's PASS plays, each from its PLAY_START to the next PLAY_START (`processGame`'s buffering). */
export function passPlayBuffers(events: readonly MatchEventEnvelope[]): readonly (readonly MatchEventEnvelope[])[] {
  const out: MatchEventEnvelope[][] = [];
  let buf: MatchEventEnvelope[] = [];
  let isPass = false;
  const flush = (): void => {
    if (isPass && buf.length > 0) out.push(buf);
    buf = [];
    isPass = false;
  };
  for (const envelope of events) {
    const event = envelope.event;
    if (event.type === "PLAY_START") {
      flush();
      const payload = event.payload;
      isPass = typeof payload === "object" && payload !== null && (payload as { kind?: unknown }).kind === "PASS_PLAY_V1";
    }
    buf.push(envelope);
  }
  flush();
  return out;
}

/** Whether any published POCKET_STATUS of the play is in the forcing set (`processGame`'s `forcedRaw`). */
export function forcedOnTheStream(buf: readonly MatchEventEnvelope[], forcing: ReadonlySet<string>): boolean {
  for (const { event } of buf) if (event.type === "POCKET_STATUS" && forcing.has(event.payload.status)) return true;
  return false;
}

/** The ticks reread under the rule ADR-058 superseded (entry 110's `oldStyleTicks`, unchanged in method). */
export function oldStyleTicks(ticks: readonly TickChannels[], tunables: Tunables): readonly TickChannels[] {
  return ticks.map((t) => {
    let published = t.counter;
    for (const v of [t.bandFloorUnnarrowed, t.arrival]) if (severityOf(v, tunables) > severityOf(published, tunables)) published = v;
    return { ...t, bandFloor: t.bandFloorUnnarrowed, published };
  });
}

/** One forced dropback's deciding instant. */
export interface DecidingInstant {
  readonly index: number;
  readonly classification: Classification;
  /** Both the band floor and the arrival force at the deciding tick (entry 107's tie). */
  readonly bandArrivalTie: boolean;
  readonly tieAlignment: TickChannels["arrivalAlignment"];
}

/** The deciding instant of a play's reconstructed ticks, or undefined if no tick forces. */
export function decidingInstantOf(ticks: readonly TickChannels[], forcing: ReadonlySet<string>, tunables: Tunables): DecidingInstant | undefined {
  const index = ticks.findIndex((t) => forcing.has(t.published));
  if (index < 0) return undefined;
  const tick = ticks[index] as TickChannels;
  const classification = classifySole(soleChannelsOverRange([tick], forcing, tunables));
  return { index, classification, bandArrivalTie: forcing.has(tick.bandFloor) && forcing.has(tick.arrival), tieAlignment: tick.arrivalAlignment };
}

export interface DecidingInstantFold {
  dropbacks: number;
  forced: number;
  wdSole: Record<ChannelId, number>;
  wdMulti: number;
  wdAmbiguous: number;
  diSole: Record<ChannelId, number>;
  diMulti: number;
  diAmbiguous: number;
  diMultiBandArrivalInterior: number;
  diMultiBandArrivalEdge: number;
  diMultiOther: number;
  /** A forced stream play whose reconstruction has no forcing tick (asserted 0 by the identity). */
  forcedWithoutInstant: number;
  /** The pre-ADR-058 reading: a play is old-forced when any reread tick forces. */
  oldForced: number;
  oldDiSole: Record<ChannelId, number>;
  oldDiMulti: number;
  oldDiAmbiguous: number;
  oldDiMultiBandArrivalInterior: number;
  oldDiMultiBandArrivalEdge: number;
  oldDiMultiOther: number;
  identityChecks: number;
  identityMismatches: number;
}

const emptyChannels = (): Record<ChannelId, number> => ({ counter: 0, bandFloor: 0, arrival: 0 });

export function emptyDecidingInstantFold(): DecidingInstantFold {
  return {
    dropbacks: 0,
    forced: 0,
    wdSole: emptyChannels(),
    wdMulti: 0,
    wdAmbiguous: 0,
    diSole: emptyChannels(),
    diMulti: 0,
    diAmbiguous: 0,
    diMultiBandArrivalInterior: 0,
    diMultiBandArrivalEdge: 0,
    diMultiOther: 0,
    forcedWithoutInstant: 0,
    oldForced: 0,
    oldDiSole: emptyChannels(),
    oldDiMulti: 0,
    oldDiAmbiguous: 0,
    oldDiMultiBandArrivalInterior: 0,
    oldDiMultiBandArrivalEdge: 0,
    oldDiMultiOther: 0,
    identityChecks: 0,
    identityMismatches: 0,
  };
}

/** Fold one forced-or-not dropback's ticks (the per-play body of entry 107's arm). */
export function foldDropbackTicks(fold: DecidingInstantFold, ticks: readonly TickChannels[], forcedRaw: boolean, forcing: ReadonlySet<string>, tunables: Tunables): void {
  fold.dropbacks += 1;
  const old = decidingInstantOf(oldStyleTicks(ticks, tunables), forcing, tunables);
  if (old !== undefined) {
    fold.oldForced += 1;
    if (old.classification.kind === "multi") {
      fold.oldDiMulti += 1;
      if (old.bandArrivalTie) {
        if (old.tieAlignment === "INTERIOR") fold.oldDiMultiBandArrivalInterior += 1;
        else fold.oldDiMultiBandArrivalEdge += 1;
      } else fold.oldDiMultiOther += 1;
    } else if (old.classification.kind === "sole" && old.classification.sole !== undefined) fold.oldDiSole[old.classification.sole] += 1;
    else fold.oldDiAmbiguous += 1;
  }
  if (!forcedRaw) return;
  fold.forced += 1;
  const wd = classifySole(soleChannelsOverRange(ticks, forcing, tunables));
  if (wd.kind === "multi") fold.wdMulti += 1;
  else if (wd.kind === "sole" && wd.sole !== undefined) fold.wdSole[wd.sole] += 1;
  else fold.wdAmbiguous += 1;
  const di = decidingInstantOf(ticks, forcing, tunables);
  if (di === undefined) {
    fold.forcedWithoutInstant += 1;
    return;
  }
  if (di.classification.kind === "multi") {
    fold.diMulti += 1;
    if (di.bandArrivalTie) {
      if (di.tieAlignment === "INTERIOR") fold.diMultiBandArrivalInterior += 1;
      else fold.diMultiBandArrivalEdge += 1;
    } else fold.diMultiOther += 1;
  } else if (di.classification.kind === "sole" && di.classification.sole !== undefined) fold.diSole[di.classification.sole] += 1;
  else fold.diAmbiguous += 1;
}

/** Fold one game. */
export function foldDecidingInstantGame(fold: DecidingInstantFold, events: readonly MatchEventEnvelope[], tunables: Tunables, positions: ReadonlyMap<PlayerId, Position>): void {
  const forcing = forcingSetOf(tunables);
  for (const buf of passPlayBuffers(events)) {
    const reclass = reconstructPlay(buf, tunables, positions);
    fold.identityChecks += reclass.identityChecks;
    fold.identityMismatches += reclass.identityMismatches;
    foldDropbackTicks(fold, reclass.ticks, forcedOnTheStream(buf, forcing), forcing, tunables);
  }
}

/** The deciding-instant multi-channel share of forced dropbacks (entry 107's headline). */
export function multiChannelShare(fold: DecidingInstantFold): number {
  return fold.forced === 0 ? 0 : fold.diMulti / fold.forced;
}

/** The pre-ADR-058 deciding-instant multi-channel share of old-forced dropbacks. */
export function oldMultiChannelShare(fold: DecidingInstantFold): number {
  return fold.oldForced === 0 ? 0 : fold.oldDiMulti / fold.oldForced;
}

/** The whole-duration multi-channel share (entry 107's cross-check, 90.41% there). */
export function wholeDurationMultiShare(fold: DecidingInstantFold): number {
  return fold.forced === 0 ? 0 : fold.wdMulti / fold.forced;
}
