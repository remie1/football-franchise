/**
 * `pnpm --filter @ff/calibration pocket -- --step 5b --reselect --from reports/adr-089-step5b.json`
 *
 * ADR-089 STEP 5b, R-7's command (plan §7.2): reads the 5b records' bin counts and recorded selection
 * (`selection.points`, `selection.recorded`, written by `step5.ts`), the committed filing's JSON and
 * AM-10's entry from the amendments file (its 5b view checked against `RESELECT_VIEW_PIN`, which a test
 * holds equal to `STEP5B_AMENDMENTS_PIN`), recomputes the selection with `reselect.ts` and compares.
 * Neither this module nor anything it imports reaches `selection.ts` (a test walks the graph).
 */
import { existsSync, readFileSync } from "node:fs";
import { amendmentsAtStep, amendmentsDigest, entryOf, loadAmendments } from "./amendments.js";
import { loadFiled } from "./filed.js";
import { binCountProblems, nearTiesOf, reselect, reselectionProblems, type RePoint, type Reselection } from "./reselect.js";

/** Step 5b's view of the amendments file, as `step5.ts` pins it (`STEP5B_AMENDMENTS_PIN`). */
export const RESELECT_VIEW_PIN = "fnv1a:3f9478eb";

export interface ReselectInput {
  readonly points: readonly RePoint[];
  readonly recorded: Reselection;
}

/** The recorded selection and its bin counts from a 5b measures file; refuses a file without them. */
export function reselectInputOf(measures: unknown): ReselectInput {
  const sel = (measures as { readonly selection?: Partial<ReselectInput> } | null)?.selection;
  if (sel === undefined || !Array.isArray(sel.points) || sel.recorded === undefined) {
    throw new Error("reselect: the records hold no selection (selection.points and selection.recorded): the 5b first pass writes them once every grid point is played on both sets");
  }
  return { points: sel.points, recorded: sel.recorded };
}

/** R-7 on a records file: the recomputation's lines; throws naming every difference. */
export function reselectFromFile(from: string, filedPath: string, amendmentsPath: string, pin: string = RESELECT_VIEW_PIN, firstPass?: string): readonly string[] {
  const filedJson: unknown = JSON.parse(readFileSync(filedPath, "utf8"));
  const view = amendmentsAtStep(loadAmendments(amendmentsPath, loadFiled(filedPath)), "5b");
  const digest = amendmentsDigest(view);
  if (digest !== pin) throw new Error(`reselect: the amendments file's 5b view digests to ${digest}, not the pin ${pin}`);
  if (!existsSync(from)) throw new Error(`ADR-089 step 5b R-7: refused: there is no records file at ${from} (the 5b measures file --out writes, holding the selection)`);
  const input = reselectInputOf(JSON.parse(readFileSync(from, "utf8")));
  const binLines: string[] = [];
  if (firstPass !== undefined) {
    if (!existsSync(firstPass)) throw new Error(`ADR-089 step 5b R-7: refused: there is no first-pass records file at ${firstPass}`);
    const first = reselectInputOf(JSON.parse(readFileSync(firstPass, "utf8")));
    const bins = binCountProblems(first.points, input.points);
    if (bins.length > 0) throw new Error(`ADR-089 step 5b R-7: the fresh pass's bin counts differ from the first pass's: ${bins.join("; ")}`);
    binLines.push(`  bin counts identical to the first pass's (${firstPass}), ${String(input.points.length)} points on both curves and both sets`);
  }
  const again = reselect(filedJson, entryOf(view, "AM-10"), input.points);
  const problems = reselectionProblems(input.recorded, again);
  if (problems.length > 0) throw new Error(`ADR-089 step 5b R-7: the recomputed selection differs from the recorded one: ${problems.join("; ")}`);
  const ties = nearTiesOf(again);
  return [
    `ADR-089 step 5b R-7: the selection recomputed from the filed words agrees with the record (${from})`,
    `  winner ${String(again.winner)}; stopped ${String(again.stopped)}; pressured separated ${String(again.pressured.separated)}; hit separated ${String(again.hit.separated)}`,
    ...binLines,
    ties.length === 0 ? "  no two scorable points within 1e-9 on set 1" : `  within 1e-9: ${ties.join("; ")}`,
  ];
}
