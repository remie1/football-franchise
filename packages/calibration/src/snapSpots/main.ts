/**
 * `pnpm --filter @ff/calibration snap-spots [-- --step 0|1] [--out <file>]`
 *
 * ADR-090 step 0's report (the default; `reports/adr-090-step0.md`): every snap picture the book can
 * draw, counted, and table D4 checked against the owner's August ranges (ADR-090 §9). No seed and
 * no game: the pictures are tables read off the call.
 *
 * `--step 1` (`reports/adr-090-step1.md`): the 100 golden games played with the picture on every
 * play, read back off their streams: nothing moved, every picture whole, and where each man starts
 * against the square the engine plays him in (ADR-090 §7). About 30 seconds.
 *
 * The path is relative to the package.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { drawEverySnap } from "./corpus.js";
import { measureSnapSpots } from "./measure.js";
import { renderSnapSpots } from "./render.js";
import { renderStep1 } from "./renderStep1.js";
import { measureStep1 } from "./step1.js";

function argValue(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv: readonly string[]): Promise<void> {
  const step = argValue(argv, "--step") ?? "0";
  if (step !== "0" && step !== "1") throw new Error(`--step is 0 or 1, got "${step}"`);
  const out = resolve(argValue(argv, "--out") ?? `reports/adr-090-step${step}.md`);
  await mkdir(dirname(out), { recursive: true });
  if (step === "1") {
    const measure = measureStep1();
    await writeFile(out, renderStep1(measure), "utf8");
    process.stderr.write(`snap-spots: ${measure.cells.plays} plays, ${measure.cells.pictures} pictures; wrote ${out}\n`);
    return;
  }
  const measure = measureSnapSpots(drawEverySnap());
  await writeFile(out, renderSnapSpots(measure), "utf8");
  process.stderr.write(`snap-spots: ${measure.pictures} pictures; wrote ${out}\n`);
}

main(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`snap-spots: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
