/**
 * FITTING THE FROZEN CALLER FROM REAL PLAY-BY-PLAY.
 *
 * Input is `TuningEvidence<PbpRow>` — the branded envelope, not a bare array. That is the
 * sacred-season rule surviving into the caller layer: a caller fitted on 2025 would put held-out
 * information into every tuning batch the project ever runs, and it would be undetectable in the
 * output because a play-caller leaves no fingerprint on a rate. The compiler refuses it, and
 * `assertTuningEvidence` refuses a cast.
 *
 * ================== WHAT COUNTS AS A PLAY, AND WHY ==================
 *
 * A tendency model answers "given this situation, does the offence drop back or hand off". So
 * the denominator is **scrimmage plays where that choice was live**:
 *
 *  - `play_type` of `pass` or `run` only. Punts, field goals, kickoffs and no-plays are the
 *    fourth-down and special-teams decisions, which are a different model (the engine asks a
 *    separate `FOURTH_DOWN` decision, so folding them in here would double-count the choice).
 *  - kneels and spikes excluded. Both are clock management wearing a play type; including them
 *    puts a run bias into the end of every half that has nothing to do with tendency.
 *  - `aborted_play` and `play_deleted` excluded — they are not decisions that happened.
 *  - regular season only. Playoff samples are small and systematically different, and the
 *    schedules the harness replays are regular-season schedules.
 *
 * **A SACK IS A PASS.** nflverse types a sack as `play_type == "pass"` with `pass_attempt == 0`,
 * which is correct for a tendency model — the offence called a dropback and the dropback failed.
 * Using `pass_attempt` as the numerator instead would fit a caller that calls fewer passes
 * precisely where pressure is highest, which is backwards.
 *
 * **A SCRAMBLE IS A PASS** for the same reason, and nflverse already types it that way.
 */

import type { Evidence } from "../ingest/eligibility.js";
import { assertTuningEvidence, citeManifests, type TuningEvidence } from "../ingest/eligibility.js";
import type { PbpRow } from "../ingest/sources/pbp.js";
import { fieldRegion, type Down } from "@ff/playbook";
import {
  BACKOFF_LEVELS,
  backoffKeys,
  distanceBand,
  hashTendencies,
  scoreState,
  type FittedTendencies,
  type TendencyCell,
  type TendencyKey,
} from "./tendencies.js";

/** Default minimum observations before a cell speaks for itself. */
export const DEFAULT_MIN_PLAYS = 200;

export interface FitOptions {
  readonly version: string;
  readonly minPlays?: number;
  /** Include postseason. Off by default; see the module header. */
  readonly includePostseason?: boolean;
}

export interface FitDiagnostics {
  readonly rowsScanned: number;
  readonly rowsUsed: number;
  readonly rejected: Readonly<Record<string, number>>;
  /** How many FULL-level cells cleared `minPlays`, out of how many were observed at all. */
  readonly fullCellsQualified: number;
  readonly fullCellsObserved: number;
  readonly globalPassRate: number;
}

export interface FitResult {
  readonly tendencies: FittedTendencies;
  readonly diagnostics: FitDiagnostics;
}

interface Counter {
  plays: number;
  passes: number;
}

function bump(map: Map<string, Counter>, key: string, isPass: boolean): void {
  let c = map.get(key);
  if (c === undefined) {
    c = { plays: 0, passes: 0 };
    map.set(key, c);
  }
  c.plays++;
  if (isPass) c.passes++;
}

/** The situation a row describes, or `null` with a reason if it is not a tendency decision. */
export function classifyRow(
  row: PbpRow,
  includePostseason: boolean,
): { readonly key: TendencyKey; readonly isPass: boolean } | { readonly reject: string } {
  if (row.playDeleted === true) return { reject: "playDeleted" };
  if (row.abortedPlay === true) return { reject: "abortedPlay" };
  if (!includePostseason && row.seasonType !== "REG") return { reject: "postseason" };
  if (row.playType !== "pass" && row.playType !== "run") return { reject: "notScrimmage" };
  if (row.qbKneel === true) return { reject: "kneel" };
  if (row.qbSpike === true) return { reject: "spike" };
  const down = row.down;
  if (down === null || down < 1 || down > 4) return { reject: "noDown" };
  if (row.ydstogo === null) return { reject: "noDistance" };
  if (row.yardline100 === null) return { reject: "noFieldPosition" };
  if (row.scoreDifferential === null) return { reject: "noScore" };
  if (row.halfSecondsRemaining === null) return { reject: "noClock" };

  // `yardline_100` is distance to the OPPONENT's goal line; `ballOn` (playbook, engine) is
  // distance from your OWN. Converting here rather than at the call site keeps one convention
  // in the caller and one in the data, with the translation in exactly one place.
  const ballOn = 100 - row.yardline100;

  return {
    key: {
      down: down as Down,
      distance: distanceBand(row.ydstogo),
      region: fieldRegion(ballOn),
      score: scoreState(row.scoreDifferential),
      twoMinute: row.halfSecondsRemaining <= 120,
    },
    isPass: row.playType === "pass",
  };
}

export function fitPlayCaller(
  evidence: TuningEvidence<PbpRow>,
  options: FitOptions,
): FitResult {
  assertTuningEvidence(evidence, "fitPlayCaller");
  const minPlays = options.minPlays ?? DEFAULT_MIN_PLAYS;
  const includePostseason = options.includePostseason ?? false;

  const counters = new Map<string, Counter>();
  const rejected = new Map<string, number>();
  let rowsUsed = 0;

  for (const row of evidence.rows) {
    const classified = classifyRow(row, includePostseason);
    if ("reject" in classified) {
      rejected.set(classified.reject, (rejected.get(classified.reject) ?? 0) + 1);
      continue;
    }
    rowsUsed++;
    const keys = backoffKeys(classified.key);
    // Every level is counted for every play, so a coarse level is a genuine aggregate of the
    // fine ones rather than a separate pass over the data that could disagree with them.
    for (const level of BACKOFF_LEVELS) bump(counters, keys[level], classified.isPass);
  }

  if (rowsUsed === 0) {
    throw new Error(
      "fitPlayCaller: no rows survived filtering. Either the cache is empty or the play-type " +
        "vocabulary changed upstream; either way a caller fitted on nothing must not be produced.",
    );
  }

  const cells: Record<string, TendencyCell> = {};
  for (const [key, counter] of [...counters.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    cells[key] = {
      key,
      plays: counter.plays,
      passes: counter.passes,
      passRate: counter.passes / counter.plays,
    };
  }

  const fullCells = [...counters.entries()].filter(([k]) => !k.includes("*"));
  const global = cells["*|*|*|*|--"];
  if (global === undefined) {
    throw new Error("fitPlayCaller: the GLOBAL backoff cell was not produced; the fit is broken");
  }

  const seasons = [...evidence.seasons].sort((a, b) => a - b);
  const contentHash = hashTendencies({ seasons, minPlays, cells });

  return {
    tendencies: {
      version: options.version,
      seasons,
      manifests: citeManifests(evidence as Evidence<PbpRow, "TUNING">),
      minPlays,
      plays: rowsUsed,
      cells,
      contentHash,
    },
    diagnostics: {
      rowsScanned: evidence.rows.length,
      rowsUsed,
      rejected: Object.fromEntries([...rejected.entries()].sort((a, b) => b[1] - a[1])),
      fullCellsQualified: fullCells.filter(([, c]) => c.plays >= minPlays).length,
      fullCellsObserved: fullCells.length,
      globalPassRate: global.passRate,
    },
  };
}

/**
 * Emit the artefact as a TypeScript module. A JSON import would need a runtime assertion clause
 * and a bundler opinion; a `.ts` file is imported by every toolchain in this repo identically
 * and is diffable in review, which for a *frozen* artefact is the property that matters.
 */
export function renderTendenciesModule(result: FitResult): string {
  const { tendencies, diagnostics } = result;
  const cellLines = Object.keys(tendencies.cells)
    .sort()
    .map((k) => {
      const c = tendencies.cells[k];
      if (c === undefined) return "";
      return `  ${JSON.stringify(k)}: { key: ${JSON.stringify(k)}, plays: ${c.plays}, passes: ${c.passes}, passRate: ${c.passRate} },`;
    })
    .filter((l) => l.length > 0);

  return `/**
 * GENERATED — do not edit by hand.
 *
 * The FROZEN baseline play-caller's tendency table (\`calibration.md\` §3.1). Regenerate with:
 *   pnpm --filter @ff/calibration exec node dist/caller/refit.js
 *
 * Editing a value here without re-running the fit trips \`assertTendencyIntegrity\`, because the
 * contentHash below is computed over the cells. That is deliberate: a caller that quietly drifts
 * makes every batch comparison in the project meaningless, and the drift would be invisible.
 *
 * Fitted from ${tendencies.plays} plays across seasons ${tendencies.seasons.join(", ")}.
 * Rows scanned ${diagnostics.rowsScanned}; used ${diagnostics.rowsUsed}.
 * Global pass rate ${diagnostics.globalPassRate.toFixed(4)}.
 * Full-specificity cells: ${diagnostics.fullCellsQualified} of ${diagnostics.fullCellsObserved} cleared minPlays=${tendencies.minPlays}.
 *
 * Manifests:
${tendencies.manifests.map((m) => ` *   ${m}`).join("\n")}
 */
import type { FittedTendencies, TendencyCell } from "./tendencies.js";

const CELLS: Readonly<Record<string, TendencyCell>> = {
${cellLines.join("\n")}
};

export const FROZEN_TENDENCIES: FittedTendencies = {
  version: ${JSON.stringify(tendencies.version)},
  seasons: ${JSON.stringify(tendencies.seasons)},
  manifests: ${JSON.stringify(tendencies.manifests, null, 2).split("\n").join("\n  ")},
  minPlays: ${tendencies.minPlays},
  plays: ${tendencies.plays},
  cells: CELLS,
  contentHash: ${JSON.stringify(tendencies.contentHash)},
};
`;
}
