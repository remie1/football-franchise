/**
 * `pnpm --filter @ff/calibration snap-spots [-- --out reports/adr-090-step0.md]`
 *
 * ADR-090 step 0's report: every snap picture the book can draw, counted, and table D4 checked
 * against the owner's August ranges (ADR-090 §9). No seed and no game: the pictures are tables
 * read off the call, and nothing in play calls them yet. The path is relative to the package.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { drawEverySnap } from "./corpus.js";
import { measureSnapSpots } from "./measure.js";
import { renderSnapSpots } from "./render.js";

function argValue(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv: readonly string[]): Promise<void> {
  const out = resolve(argValue(argv, "--out") ?? "reports/adr-090-step0.md");
  const measure = measureSnapSpots(drawEverySnap());
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, renderSnapSpots(measure), "utf8");
  process.stderr.write(`snap-spots: ${measure.pictures} pictures; wrote ${out}\n`);
}

main(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`snap-spots: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
