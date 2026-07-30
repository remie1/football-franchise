/**
 * ============================================================================
 * ENTRY 40's PATCH VOCABULARY — the in-memory trees both threat-supply instruments run.
 * ============================================================================
 *
 * ⚠ **MEASUREMENT ONLY, ADR-027's split.** Nothing here writes `packages/engine/src/tunables.ts`.
 * Every function returns a NEW `Tunables` produced by `applyTunablePatch`, which refuses a stale
 * `currentValue`, so a cell that moves underneath this file fails loudly instead of measuring a
 * configuration nobody asked for.
 *
 * Shared by `threatSupplyPlayScope.test.ts` and `threatSupplySweep.test.ts` so that the two
 * instruments cannot drift into measuring two different treatments under one name — the failure
 * ADR-047 recorded when a constant was quoted through three documents into a ratified ruling.
 *
 * ================== WHAT EACH LEVER IS, AND WHAT ELSE IT MOVES ==================
 *
 * `supplyAt(m)` — `passRush.bands[RUSHER_WINS_REP].minMargin`. **Three mechanisms, one cell:**
 * which reps start a threat (`startsThreat`), the `pocket.minimumStatusByBand` floor those reps
 * impose (they fall into `BLOCKER_BEATEN`), and their `pressureProgressByBand` delta (2 → 1). The
 * neutralising helpers below exist to hold the last two flat.
 *
 * `retireOn(bands)` — `passRush.pressureProgressByBand[band].reset`. **Two mechanisms, one flag:**
 * `clearsThreat` retires the threat, and `advancePressure` zeroes the counter. `counterOff` removes
 * the second.
 *
 * `bandFloorOff()` — every row of `pocket.minimumStatusByBand` → `CLEAN`. ⚠ Note that this is
 * STRICTLY MORE than ADR-032 §5's "G + W" arm, which set `RUSHER_GAINING` and `RUSHER_WINS_REP` and
 * ran **before ADR-033 split `BLOCKER_BEATEN` out**. On today's engine `BLOCKER_BEATEN → PRESSURE`
 * is a third dirty row, and an arm that reproduced ADR-032's two patches would leave it standing.
 *
 * `counterOff()` — every `pocket.thresholds` label → `CLEAN`, so `pocketStatusFromPressure` can
 * only ever return `CLEAN`. The `minProgress` values are left alone: a threshold that classifies
 * nothing needs no boundary moved, and moving one would be a second edit to report.
 *
 * `arrivalOnlyBase()` — `bandFloorOff` + `counterOff` + the win/beaten delta equalised. On this tree
 * `pocketStatusFor` reduces to `pocketFloorFromArrival` alone, which is the ONLY configuration in
 * which `supplyAt` moves nothing but the supply of threats and `retireOn` moves nothing but their
 * retirement. It is a mechanism base, not a proposal, and every share measured on it says so.
 */
import { DEFAULT_TUNABLES, applyTunablePatch, type Tunables } from "@ff/engine";

const EVIDENCE =
  "backlog entry 40 — THREAT SUPPLY × THREAT PERSISTENCE measurement. In-memory only; " +
  "packages/engine/src/tunables.ts is not written by this file (ADR-027).";

function patch(
  base: Tunables,
  tunableId: string,
  currentValue: string | number | boolean,
  proposedValue: string | number | boolean,
  expectedEffect: string,
): Tunables {
  if (currentValue === proposedValue) return base;
  return applyTunablePatch(base, {
    tunableId,
    currentValue,
    proposedValue,
    evidence: EVIDENCE,
    expectedEffect,
  });
}

// ---------------------------------------------------------------------------
// THE BAND VOCABULARY — derived from the engine's own table, never restated.
// ---------------------------------------------------------------------------

export type BandLabel = (typeof DEFAULT_TUNABLES.passRush.bands)[number]["label"];

/** Every §7.1 band label, in the table's own (descending-margin) order. */
export const BAND_LABELS: readonly BandLabel[] = DEFAULT_TUNABLES.passRush.bands.map((b) => b.label);

/** The band that starts a threat. `startsThreat` is `band === "RUSHER_WINS_REP"`. */
const WINNING_BAND: BandLabel = "RUSHER_WINS_REP";

/**
 * The index of the winning band IN THE COMMITTED TABLE, derived rather than written as `0`.
 *
 * `applyTunablePatch` addresses array elements positionally, so a hard-coded index is a silent
 * mis-patch the day a band is inserted above this one — the table would still be well ordered, the
 * patch would still apply, and it would move a different band's boundary. Backlog 51a's shape.
 */
const WINNING_INDEX: number = DEFAULT_TUNABLES.passRush.bands.findIndex(
  (b) => b.label === WINNING_BAND,
);

if (WINNING_INDEX < 0) {
  throw new Error(
    `@ff/calibration: passRush.bands carries no "${WINNING_BAND}" row. Entry 40's supply lever is ` +
      "addressed by that label; refusing to patch an index derived from a missing row.",
  );
}

export const SUPPLY_PATH = `passRush.bands.${String(WINNING_INDEX)}.minMargin`;
export const SUPPLY_COMMITTED: number = DEFAULT_TUNABLES.passRush.bands[WINNING_INDEX]
  ?.minMargin as number;

/**
 * Move the won-rep threshold.
 *
 * A value above every reachable margin extinguishes the won-rep threat channel: §7.1's margin is a
 * difference of two modified d100s, so it is bounded by roughly ±150 even with every modifier in the
 * game stacked one way. The band table stays well ordered at any value above the next row's
 * `minMargin` (5), which is what `test/bandTableGate.test.ts` checks on the COMMITTED tree and what
 * every arm here preserves.
 */
export function supplyAt(minMargin: number, base: Tunables = DEFAULT_TUNABLES): Tunables {
  return patch(
    base,
    SUPPLY_PATH,
    SUPPLY_COMMITTED,
    minMargin,
    "fewer §7.1 reps land in RUSHER_WINS_REP, so fewer reps call `threatFromWonRep`; the same " +
      "reps also fall to BLOCKER_BEATEN's status floor and counter delta unless those are held flat",
  );
}

// ---------------------------------------------------------------------------
// PERSISTENCE
// ---------------------------------------------------------------------------

export function RESET_PATH_OF(band: BandLabel): string {
  return `passRush.pressureProgressByBand.${band}.reset`;
}

/** Bands that already retire a threat on the committed tree. */
export const COMMITTED_RETIRING: readonly BandLabel[] = BAND_LABELS.filter(
  (b) => DEFAULT_TUNABLES.passRush.pressureProgressByBand[b].reset,
);

/**
 * Turn `reset` ON for each named band — i.e. widen the set of reps that RETIRE a live threat.
 *
 * This is the ONLY tunable expression threat retirement has. `passPlay.ts` removes a threat in
 * exactly one place (`clearsThreat(tunables, rush.band)`), and nothing else in the engine ends one:
 * not time, not distance, not the quarterback moving, not the blocker recovering short of a reset.
 * A band already at `true` is skipped rather than re-patched, so the committed retiring set is
 * always a subset of the arm's.
 */
export function retireOn(bands: readonly BandLabel[], base: Tunables = DEFAULT_TUNABLES): Tunables {
  let out = base;
  for (const band of bands) {
    if (DEFAULT_TUNABLES.passRush.pressureProgressByBand[band].reset) continue;
    out = patch(
      out,
      RESET_PATH_OF(band),
      false,
      true,
      `a ${band} rep retires the live threat (clearsThreat) and zeroes the rusher's pressure ` +
        "counter (advancePressure) — one flag, two mechanisms",
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE NEUTRALISERS — what makes a single-mechanism arm possible at all
// ---------------------------------------------------------------------------

type StatusName = keyof typeof DEFAULT_TUNABLES.pocket.severity;
const CLEAN: StatusName = "CLEAN";

/** Every band floors the pocket at CLEAN: `pocketFloorFor` is extinguished for any band table. */
export function bandFloorOff(base: Tunables = DEFAULT_TUNABLES): Tunables {
  let out = base;
  for (const band of BAND_LABELS) {
    out = patch(
      out,
      `pocket.minimumStatusByBand.${band}`,
      DEFAULT_TUNABLES.pocket.minimumStatusByBand[band],
      CLEAN,
      "the §7.1 band table imposes no pocket-status floor",
    );
  }
  return out;
}

/** Every counter threshold classifies as CLEAN: `pocketStatusFromPressure` is extinguished. */
export function counterOff(base: Tunables = DEFAULT_TUNABLES): Tunables {
  let out = base;
  DEFAULT_TUNABLES.pocket.thresholds.forEach((threshold, i) => {
    out = patch(
      out,
      `pocket.thresholds.${String(i)}.label`,
      threshold.label,
      CLEAN,
      "the accumulated pressure counter imposes no pocket-status floor",
    );
  });
  return out;
}

/**
 * Make the counter delta of `RUSHER_WINS_REP` equal to `BLOCKER_BEATEN`'s.
 *
 * Without this, moving the won-rep threshold changes the counter for every reclassified rep, so the
 * supply arm would be measuring two things on any base where the counter is live. Kept separate
 * from `counterOff` because on the arrival-only base the counter is off anyway and this becomes a
 * no-op that costs nothing to state.
 */
export function equalWinDelta(base: Tunables = DEFAULT_TUNABLES): Tunables {
  return patch(
    base,
    "passRush.pressureProgressByBand.RUSHER_WINS_REP.delta",
    DEFAULT_TUNABLES.passRush.pressureProgressByBand.RUSHER_WINS_REP.delta,
    DEFAULT_TUNABLES.passRush.pressureProgressByBand.BLOCKER_BEATEN.delta,
    "a reclassified rep's counter contribution is unchanged by where the won-rep boundary sits",
  );
}

/**
 * THE MECHANISM BASE. `pocketStatusFor` reduces to `pocketFloorFromArrival` and nothing else, so a
 * pocket is dirty exactly when a live threat is inside a horizon — which is the claim entry 40's
 * redirect makes, expressed as a tree rather than as prose.
 */
export function arrivalOnlyBase(): Tunables {
  return equalWinDelta(counterOff(bandFloorOff(DEFAULT_TUNABLES)));
}
