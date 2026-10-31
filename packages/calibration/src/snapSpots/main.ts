/**
 * `pnpm --filter @ff/calibration snap-spots [-- --step 0|1|3] [--out <file>]`
 *
 * ADR-090 step 0's report (the default; `reports/adr-090-step0.md`): every snap picture the book can
 * draw, counted, and table D4 checked against the owner's August ranges (ADR-090 §9). No seed and
 * no game: the pictures are tables read off the call.
 *
 * `--step 1` (`reports/adr-090-step1.md`): the 100 golden games played with the picture on every
 * play, read back off their streams: nothing moved, every picture whole, and where each man starts
 * against the square the engine plays him in (ADR-090 §7). About 30 seconds.
 *
 * `--step 3` (`reports/adr-090-step3.md`): ADR-091's step S-a. The golden games with the stem
 * played out at the line (nothing moved), and both leagues' base corpora: how often the Mike
 * stemmed, how each stem ended against the dice's own odds and ADR-091 §9.2, the quarterback's
 * count, the count read through a game beside ADR-092 §7, and the sideline's moves. About 7 minutes.
 *
 * The path is relative to the package.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { drawEverySnap } from "./corpus.js";
import { measureSnapSpots } from "./measure.js";
import { renderSnapSpots } from "./render.js";
import { renderStep1 } from "./renderStep1.js";
import { renderStep3 } from "./renderStep3.js";
import { measureStep1 } from "./step1.js";
import { measureStep3 } from "./step3.js";

function argValue(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv: readonly string[]): Promise<void> {
  const step = argValue(argv, "--step") ?? "0";
  if (step !== "0" && step !== "1" && step !== "3") throw new Error(`--step is 0, 1 or 3, got "${step}"`);
  const out = resolve(argValue(argv, "--out") ?? `reports/adr-090-step${step}.md`);
  await mkdir(dirname(out), { recursive: true });
  if (step === "3") {
    const measure = measureStep3();
    await writeFile(out, renderStep3(measure), "utf8");
    const stems = measure.stems.reduce((a, s) => a + s.all.stems, 0);
    process.stderr.write(`snap-spots: ${String(stems)} stems in ${String(measure.stems.reduce((a, s) => a + s.games, 0))} games; wrote ${out}\n`);
    return;
  }
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
