/**
 * Rendering the fourth-down table as a generated module. Split from `fourthDown.ts` so the
 * runtime lookup and the code generator do not share a file — the lookup ships, the generator is
 * only ever run by `refit.ts`.
 */
import type { FourthDownFitResult } from "./fourthDown.js";

export function renderFourthDownModule(result: FourthDownFitResult): string {
  const { fitted, diagnostics } = result;
  const cellLines = Object.keys(fitted.cells)
    .sort()
    .map((k) => {
      const c = fitted.cells[k];
      if (c === undefined) return "";
      return `  ${JSON.stringify(k)}: { key: ${JSON.stringify(k)}, decisions: ${c.decisions}, go: ${c.go}, punt: ${c.punt}, fieldGoal: ${c.fieldGoal} },`;
    })
    .filter((l) => l.length > 0);

  return `/**
 * GENERATED — do not edit by hand. The frozen caller's FOURTH-DOWN table.
 *
 * ${diagnostics.decisions} decisions across seasons ${fitted.seasons.join(", ")}:
 * go ${(diagnostics.goRate * 100).toFixed(1)}%, punt ${(diagnostics.puntRate * 100).toFixed(1)}%, field goal ${(diagnostics.fieldGoalRate * 100).toFixed(1)}%.
 * ${diagnostics.fullCellsQualified} of ${diagnostics.fullCellsObserved} full-specificity cells cleared minDecisions=${fitted.minDecisions}.
 */
import type { FittedFourthDown, FourthDownCell } from "./fourthDown.js";

const FOURTH_DOWN_CELLS: Readonly<Record<string, FourthDownCell>> = {
${cellLines.join("\n")}
};

export const FROZEN_FOURTH_DOWN: FittedFourthDown = {
  version: ${JSON.stringify(fitted.version)},
  seasons: ${JSON.stringify(fitted.seasons)},
  manifests: ${JSON.stringify(fitted.manifests)},
  minDecisions: ${fitted.minDecisions},
  decisions: ${fitted.decisions},
  cells: FOURTH_DOWN_CELLS,
};
`;
}
