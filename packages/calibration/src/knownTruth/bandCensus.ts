/**
 * ============================================================================
 * THE §7.1 BAND CENSUS — precondition for ruling 2's re-measurement (backlog entry 68-RESULT).
 * ============================================================================
 *
 * ⛔ **A CENSUS, NOT A LEVER.** Backlog's owner ruling: *"a lever's price is uninterpretable without
 * the size of the population it acts on — and that band inherited part of a range that no longer
 * exists."* `BLOCKER_BEATEN` was split out of `RUSHER_GAINING` by ADR-033 (pre-split combined range
 * 1–14; now `RUSHER_GAINING` 1–4 / `BLOCKER_BEATEN` 5–14) and no post-split census of either band has
 * ever been published. This module builds that census and, because `passPlay.ts:524` sets
 * `m.previousBand = rush.band` **unconditionally, before the branch dispatch**, the retirement
 * decomposition ADR-049's P2 needs: of P2-eligible retirements, how many are triggered by
 * `BLOCKER_BEATEN` (which maps to a DIRTY floor, `PRESSURE` — a DEMOTION, not a clear) versus the
 * other three P2-eligible bands (which map to `CLEAN` — a genuine clear).
 *
 * ================== WHAT IS FOLDED, AND WHY IT NEEDS PLAY SCOPE ==================
 *
 * The six-band population share (§1) needs nothing but a flat walk over every `pass_rush_tick`
 * `CHECK` in the corpus — no play boundary, no per-rusher state. The retirement decomposition (§3)
 * and the arrival-clock coincidence (§4) both need to know, AT THE MOMENT a `CHECK` of a given band is
 * published, whether that rusher ALREADY has a live threat (`before !== undefined` in the engine's own
 * `passPlay.ts` — the threat a P2-style retirement would remove). That is per-rusher, per-play state
 * (a threat never survives a play boundary), so the fold is play-scoped, exactly like
 * `pocketChannelShares.reconstructGame` and `geometryTimeRetirement.reclassifyGame` — a THIRD reader
 * of the same `RUSH_THREAT`/`pass_rush_tick` public vocabulary, doing a cheaper thing than either
 * (no `POCKET_STATUS` identity to reconstruct here; this module never predicts a status).
 *
 * ================== THE P2-ELIGIBLE BAND SET, DERIVED — NOT THE FOUR LABELS RETYPED ==================
 *
 * ADR-049 §Proposal / entry 68-RESULT both state the set as "`BLOCKER_BEATEN`, `RUSHER_GAINING`,
 * `STALEMATE`, `BLOCKER_CONTAINS`" in prose. Restating that as a literal here would be exactly the
 * class of defect Charter §4.1 keeps finding (a hand-enumerated list silently going stale the day a
 * band is added or a `reset` flag flips). `P2_RETIRE_ELIGIBLE_BANDS` is instead the set difference:
 * every `passRush.bands` label MINUS the winning band (`RUSHER_WINS_REP` — structurally cannot reach
 * the retirement branch; `startsThreat` is tested first, `geometryTimeRetirement.ts`'s header names
 * this the "ordering bug") MINUS every band that already retires on the committed tree
 * (`pressureProgressByBand[band].reset === true` — only `BLOCKER_RESETS` today, so P2 adds nothing new
 * there). Recomputed from `DEFAULT_TUNABLES` rather than hand-listed; `bandCensus.test.ts`'s free tier
 * asserts it equals the four-label set this file's header quotes, so a silent drift is caught rather
 * than trusted.
 *
 * ================== WHAT WOULD MAKE THIS INSTRUMENT GO RED (backlog entry 55) ==================
 *
 * | claim | what reddens it |
 * |---|---|
 * | the six bands partition every `pass_rush_tick` rep | `sum(byBand) !== reps` on any fold |
 * | `P2_RETIRE_ELIGIBLE_BANDS` is the four-label set ADR-049/68-RESULT name | the free-tier equality assertion in `bandCensus.test.ts` |
 * | a `pass_rush_tick` CHECK never publishes an unknown band | `RangeError` thrown by `foldPlayBandCensus` |
 * | `p2Retirements[band]` counts a live threat correctly | a `RUSH_THREAT{state:"RESET"}` not removing the rusher from `liveThreat` before the next `CHECK` on that rusher is folded — cross-checked against `geometryTimeRetirement.ts`'s own `real` map logic, which this module's `liveThreat` set mirrors exactly (add on any non-RESET state, delete on RESET) |
 * | the census is play-scoped correctly | a `pass_rush_tick` CHECK folded outside a `PASS_PLAY_V1` buffer — cannot happen structurally (the check only fires inside `passPlay.ts`'s tick loop) but the `PLAY_START.kind` gate is asserted the same structural way `metrics/collect.ts` and every sibling module in this package reads it |
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";

export type BandLabel = (typeof DEFAULT_TUNABLES.passRush.bands)[number]["label"];

/** Every §7.1 band label, in the table's own (descending-margin) order. */
export const BAND_LABELS: readonly BandLabel[] = DEFAULT_TUNABLES.passRush.bands.map((b) => b.label);

const WINNING_BAND: BandLabel = "RUSHER_WINS_REP";

/** Bands that already retire a threat on the committed tree (`pressureProgressByBand[b].reset`). */
export const COMMITTED_RETIRING_BANDS: readonly BandLabel[] = BAND_LABELS.filter(
  (b) => DEFAULT_TUNABLES.passRush.pressureProgressByBand[b].reset,
);

/**
 * ADR-049's P2 ("persistence ceiling") retirement set — derived, see the module header. This is the
 * band set a `retireOn(...)` arm ADDS `reset: true` to; `BLOCKER_RESETS` is excluded because it is
 * already `true` on the committed tree (P2 changes nothing there) and `RUSHER_WINS_REP` is excluded
 * because `startsThreat` is tested before `clearsThreat`, so it can never reach the retiring branch.
 */
export const P2_RETIRE_ELIGIBLE_BANDS: readonly BandLabel[] = BAND_LABELS.filter(
  (b) => b !== WINNING_BAND && !COMMITTED_RETIRING_BANDS.includes(b),
);

/** Whether a band's §7.1 floor dirties the pocket (`pocket.minimumStatusByBand[band] !== "CLEAN"`). */
export function dirtiesFloor(tunables: Tunables, band: BandLabel): boolean {
  return tunables.pocket.minimumStatusByBand[band] !== "CLEAN";
}

function isBandLabel(x: string): x is BandLabel {
  return (BAND_LABELS as readonly string[]).includes(x);
}

function zeroRecord(): Record<BandLabel, number> {
  return Object.fromEntries(BAND_LABELS.map((b) => [b, 0])) as Record<BandLabel, number>;
}

export interface BandCensusFold {
  /** Every `pass_rush_tick` CHECK folded, of any band. */
  reps: number;
  /** §1 — the six-band population share, keyed by band. */
  byBand: Record<BandLabel, number>;
  /**
   * §3/§4 — of `P2_RETIRE_ELIGIBLE_BANDS` reps ONLY, the count where the same rusher already carried
   * a live threat (`liveThreat.has(rusherId)`) — the population a P2-style `clearsThreat` would
   * actually retire, since `passPlay.ts`'s `RESET` publication is itself gated on `before !== undefined`.
   * Bands outside `P2_RETIRE_ELIGIBLE_BANDS` are always 0 here (never incremented).
   */
  p2Retirements: Record<BandLabel, number>;
}

export function emptyBandCensusFold(): BandCensusFold {
  return { reps: 0, byBand: zeroRecord(), p2Retirements: zeroRecord() };
}

export function mergeBandCensusFold(a: BandCensusFold, b: BandCensusFold): void {
  a.reps += b.reps;
  for (const band of BAND_LABELS) {
    a.byBand[band] += b.byBand[band];
    a.p2Retirements[band] += b.p2Retirements[band];
  }
}

/**
 * Fold one PASS dropback's own event slice. `liveThreat` is local to this call (a threat never
 * survives a play boundary — every play starts every rusher un-threatened) and tracks exactly what
 * `passPlay.ts`'s `m.threat !== undefined` tracks: present from the tick a `RUSH_THREAT` publishes any
 * state other than `RESET`, absent again the tick one publishes `RESET`. Order within a tick is CHECK
 * first, RUSH_THREAT (if any) second (`passPlay.ts:497-546`), so `liveThreat` read at CHECK time
 * always reflects the PRIOR tick's outcome — exactly `before` in the engine's own retirement branch.
 */
export function foldPlayBandCensus(fold: BandCensusFold, buf: readonly MatchEventEnvelope[]): void {
  const liveThreat = new Set<string>();
  for (const envelope of buf) {
    const event = envelope.event;
    switch (event.type) {
      case "CHECK": {
        if (event.payload.checkKind !== "pass_rush_tick") break;
        const actors = event.payload.actors;
        const band = event.payload.band;
        if (!Array.isArray(actors) || actors.length === 0 || typeof band !== "string") break;
        if (!isBandLabel(band)) {
          throw new RangeError(
            `bandCensus: pass_rush_tick published band "${band}" which is not a row of passRush.bands.`,
          );
        }
        const rusherId = String(actors[0]);
        fold.reps += 1;
        fold.byBand[band] += 1;
        if (P2_RETIRE_ELIGIBLE_BANDS.includes(band) && liveThreat.has(rusherId)) {
          fold.p2Retirements[band] += 1;
        }
        break;
      }
      case "RUSH_THREAT": {
        const id = String(event.payload.rusher);
        if (event.payload.state === "RESET") liveThreat.delete(id);
        else liveThreat.add(id);
        break;
      }
      default:
        break;
    }
  }
}

/**
 * Split one game's stream into PASS dropbacks and fold each. Same `PLAY_START`/`kind` structural
 * read as `geometryTimeRetirement.reclassifyGame` and `pocketChannelShares.reconstructGame`.
 */
export function foldGameBandCensus(fold: BandCensusFold, events: readonly MatchEventEnvelope[]): void {
  let buf: MatchEventEnvelope[] = [];
  let isPass = false;

  const flush = (): void => {
    if (isPass && buf.length > 0) foldPlayBandCensus(fold, buf);
    buf = [];
    isPass = false;
  };

  for (const envelope of events) {
    const event = envelope.event;
    if (event.type === "PLAY_START") {
      flush();
      const payload = event.payload;
      isPass =
        typeof payload === "object" && payload !== null && (payload as { kind?: unknown }).kind === "PASS_PLAY_V1";
    }
    buf.push(envelope);
  }
  flush();
}
