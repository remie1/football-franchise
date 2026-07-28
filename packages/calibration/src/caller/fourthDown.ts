/**
 * THE FOURTH-DOWN TABLE — go, punt, or kick, fitted from real play-by-play.
 *
 * Split out from the run/pass table because it answers a different question at a different
 * decision point: the engine asks `FOURTH_DOWN` first and only asks for a play call if the
 * answer is `GO_FOR_IT`. Folding the two together would count the same choice twice — once as
 * "did they go" and once as "did they pass" — and the second is conditional on the first.
 *
 * It matters more than it looks. `CALIBRATION-BACKLOG.md`'s game-scale table has punts/game at
 * 13.0 against ~8.4 and drives/game at 32.0 against 22-24, and entry 18 attributes both to
 * completion percentage rather than to the clock. A fourth-down policy that punts more than
 * real coaches do would be a *second* cause of the same divergence, pointing at the same
 * symptom from a different direction — so it is fitted rather than assumed, and the fit is
 * stated so the two causes can be told apart.
 */
import type { Rng } from "@ff/contracts";
import type { FourthDownChoice } from "@ff/engine";
import type { PbpRow } from "../ingest/sources/pbp.js";
import { assertTuningEvidence, citeManifests, type TuningEvidence } from "../ingest/eligibility.js";
import type { Evidence } from "../ingest/eligibility.js";
import { fieldRegion, type Down } from "@ff/playbook";
import {
  BACKOFF_LEVELS,
  backoffKeys,
  distanceBand,
  scoreState,
  type BackoffLevel,
  type TendencyKey,
} from "./tendencies.js";

export interface FourthDownCell {
  readonly key: string;
  readonly decisions: number;
  readonly go: number;
  readonly punt: number;
  readonly fieldGoal: number;
}

export interface FittedFourthDown {
  readonly version: string;
  readonly seasons: readonly number[];
  readonly manifests: readonly string[];
  readonly minDecisions: number;
  readonly decisions: number;
  readonly cells: Readonly<Record<string, FourthDownCell>>;
}

export const DEFAULT_MIN_FOURTH_DOWN_DECISIONS = 60;

/**
 * Classify a fourth-down row. Returns `null` for anything that was not a live fourth-down
 * choice — including a kneel (clock management) and a penalty-only no-play.
 */
export function classifyFourthDown(
  row: PbpRow,
  includePostseason: boolean,
): { readonly key: TendencyKey; readonly choice: FourthDownChoice } | null {
  if (row.playDeleted === true || row.abortedPlay === true) return null;
  if (!includePostseason && row.seasonType !== "REG") return null;
  if (row.down !== 4) return null;
  if (row.qbKneel === true || row.qbSpike === true) return null;
  if (row.ydstogo === null || row.yardline100 === null) return null;
  if (row.scoreDifferential === null || row.halfSecondsRemaining === null) return null;

  let choice: FourthDownChoice;
  if (row.playType === "punt") choice = "PUNT";
  else if (row.playType === "field_goal") choice = "FIELD_GOAL";
  else if (row.playType === "pass" || row.playType === "run") choice = "GO_FOR_IT";
  else return null;

  return {
    key: {
      down: 4 as Down,
      distance: distanceBand(row.ydstogo),
      region: fieldRegion(100 - row.yardline100),
      score: scoreState(row.scoreDifferential),
      twoMinute: row.halfSecondsRemaining <= 120,
    },
    choice,
  };
}

interface Counter {
  decisions: number;
  go: number;
  punt: number;
  fieldGoal: number;
}

export interface FourthDownFitResult {
  readonly fitted: FittedFourthDown;
  readonly diagnostics: {
    readonly rowsScanned: number;
    readonly decisions: number;
    readonly goRate: number;
    readonly puntRate: number;
    readonly fieldGoalRate: number;
    readonly fullCellsQualified: number;
    readonly fullCellsObserved: number;
  };
}

export function fitFourthDown(
  evidence: TuningEvidence<PbpRow>,
  options: { readonly version: string; readonly minDecisions?: number; readonly includePostseason?: boolean },
): FourthDownFitResult {
  assertTuningEvidence(evidence, "fitFourthDown");
  const minDecisions = options.minDecisions ?? DEFAULT_MIN_FOURTH_DOWN_DECISIONS;
  const includePostseason = options.includePostseason ?? false;

  const counters = new Map<string, Counter>();
  let total = 0;
  for (const row of evidence.rows) {
    const classified = classifyFourthDown(row, includePostseason);
    if (classified === null) continue;
    total++;
    const keys = backoffKeys(classified.key);
    for (const level of BACKOFF_LEVELS) {
      const k = keys[level];
      let c = counters.get(k);
      if (c === undefined) {
        c = { decisions: 0, go: 0, punt: 0, fieldGoal: 0 };
        counters.set(k, c);
      }
      c.decisions++;
      if (classified.choice === "GO_FOR_IT") c.go++;
      else if (classified.choice === "PUNT") c.punt++;
      else c.fieldGoal++;
    }
  }

  if (total === 0) {
    throw new Error("fitFourthDown: no fourth-down decisions survived filtering");
  }

  const cells: Record<string, FourthDownCell> = {};
  for (const [key, c] of [...counters.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    cells[key] = { key, decisions: c.decisions, go: c.go, punt: c.punt, fieldGoal: c.fieldGoal };
  }
  const global = cells["*|*|*|*|--"];
  if (global === undefined) {
    throw new Error("fitFourthDown: the GLOBAL backoff cell was not produced; the fit is broken");
  }
  const fullCells = [...counters.entries()].filter(([k]) => !k.includes("*"));

  return {
    fitted: {
      version: options.version,
      seasons: [...evidence.seasons].sort((a, b) => a - b),
      manifests: citeManifests(evidence as Evidence<PbpRow, "TUNING">),
      minDecisions,
      decisions: total,
      cells,
    },
    diagnostics: {
      rowsScanned: evidence.rows.length,
      decisions: total,
      goRate: global.go / global.decisions,
      puntRate: global.punt / global.decisions,
      fieldGoalRate: global.fieldGoal / global.decisions,
      fullCellsQualified: fullCells.filter(([, c]) => c.decisions >= minDecisions).length,
      fullCellsObserved: fullCells.length,
    },
  };
}

/**
 * Draw a choice from the fitted cell.
 *
 * `inFieldGoalRange` is the ONE piece of football knowledge applied on top of the fit, and it is
 * applied by REDISTRIBUTION rather than by veto: a bucket whose real answer is often a field
 * goal, in a spot this engine's kicker cannot reach, becomes a punt-or-go decision in the same
 * proportion the bucket already had. Vetoing to `PUNT` would put a systematic punt bias exactly
 * where long field goals live, which is the metric (`punts/game`) this table exists to get right.
 */
export function lookupFourthDown(
  fitted: FittedFourthDown,
  key: TendencyKey,
  rng: Rng,
  inFieldGoalRange: boolean,
): FourthDownChoice {
  const keys = backoffKeys(key);
  let cell: FourthDownCell | undefined;
  let level: BackoffLevel | undefined;
  for (const l of BACKOFF_LEVELS) {
    const candidate = fitted.cells[keys[l]];
    if (candidate !== undefined && candidate.decisions >= fitted.minDecisions) {
      cell = candidate;
      level = l;
      break;
    }
  }
  if (cell === undefined || level === undefined) {
    throw new Error(
      `frozen caller: no fourth-down cell for ${keys.FULL} at any backoff level. ` +
        `The artefact (${fitted.version}) is incomplete.`,
    );
  }

  const go = cell.go;
  const punt = cell.punt;
  const fieldGoal = inFieldGoalRange ? cell.fieldGoal : 0;
  const total = go + punt + fieldGoal;
  if (total === 0) {
    // Every observation in this bucket was a field goal and the kicker cannot reach. Punting is
    // the only remaining legal answer; going for it would be an invention.
    return "PUNT";
  }
  const roll = rng.next() * total;
  if (roll < go) return "GO_FOR_IT";
  if (roll < go + punt) return "PUNT";
  return "FIELD_GOAL";
}
