/**
 * `pnpm --filter @ff/franchise staff-check -- [--seed <seed>] [--seasons 50] [--views] [--out <file>]`
 *
 * ADR-080 C5: builds a league's coaches with their made-up history, runs `--seasons` more
 * offseasons on stand-in results, and prints the turnover next to the REPORTED NFL figures.
 * With `--views`, the staffs' views are carried and read (ADR-084 §7.1). With `--out`, saves the
 * whole report as JSON.
 */
import { writeFileSync } from "node:fs";
import { staffTurnoverCheck, type Band } from "./check.js";

function parse(argv: readonly string[]) {
  let seed = "staff-check";
  let seasons = 50;
  let out: string | undefined;
  let views = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new SyntaxError(`${arg} requires a value`);
      return v;
    };
    if (arg === "--") continue;
    else if (arg === "--seed") seed = next();
    else if (arg === "--seasons") seasons = Number(next());
    else if (arg === "--out") out = next();
    else if (arg === "--views") views = true;
    else throw new SyntaxError(`unknown argument ${arg}`);
  }
  if (!Number.isInteger(seasons) || seasons < 1) throw new SyntaxError("--seasons must be a whole number above 0");
  return { seed, seasons, out, views };
}

const args = parse(process.argv.slice(2));
const started = Date.now();
const r = staffTurnoverCheck({ seed: args.seed, seasons: args.seasons, views: args.views });
const s = r.summary;
const b = (x: Band) => `${x.mean.toFixed(1)} a year (from ${x.min} to ${x.max})`;
const pct = (x: number | undefined) => `${Math.round((x ?? 0) * 100)}%`;
const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;

console.log(`Seed ${r.seed}: ${r.seasons} offseasons after 20 seasons of made-up history (${((Date.now() - started) / 1000).toFixed(1)}s)\n`);
console.log(`Head coach changes          ${b(s.changesPerYear.HEAD_COACH)}   NFL: about 7 (68 in 2004-2013)`);
console.log(`Offensive coordinator       ${b(s.changesPerYear.OC)}   NFL: 10, 18, 16 (2017-2019)`);
console.log(`Defensive coordinator       ${b(s.changesPerYear.DC)}   NFL: 11 (2019)`);
console.log(`Special teams coordinator   ${b(s.changesPerYear.STC)}   NFL: no figure on file`);
console.log(`Head coach tenure           ${s.hcTenure.mean.toFixed(1)} seasons on average, median ${s.hcTenure.median} (${s.hcTenure.ended} jobs ended)`);
const src = s.hcSourceShares;
console.log(`New head coaches came from  offensive coordinators ${pct(src.OC)} (NFL 28%), defensive ${pct(src.DC)} (NFL 19%),`);
console.log(`                            retreads ${pct((src.RETREAD ?? 0) + (src.OUT_OF_WORK ?? 0))} (NFL 26%: earlier head job or out of the league),`);
console.log(`                            college ${pct(src.COLLEGE)} (NFL about 10%), special teams ${pct(src.STC)}, position coaches ${pct(src.POSITION_COACH)}`);
console.log(`Coordinators from the head coach's own tree: ${pct(s.treeShareOfCoordinatorHires)}`);
console.log(`Ratings anchor at the start: sitting coordinators average ${s.anchor.coordinatorAverageSkill.toFixed(1)} (target 50), head coaches ${s.anchor.headCoachAverageSkill.toFixed(1)}`);
console.log(`DC disguise share: ${pct1(s.dcDisguiseMean.atStart)} at the start, then between ${pct1(s.dcDisguiseMean.min)} and ${pct1(s.dcDisguiseMean.max)}`);
console.log(`Former head coaches sitting as coordinators: ${s.exHeadCoaches.atStart.OC} OCs and ${s.exHeadCoaches.atStart.DC} DCs at the start, then ${s.exHeadCoaches.OC.mean.toFixed(1)} and ${s.exHeadCoaches.DC.mean.toFixed(1)} on average   NFL 2024: about 4 and 7 (unverified count)`);
console.log(`Pool ${s.poolSize.mean.toFixed(0)} coaches; average head coach age ${s.meanHcAge.mean.toFixed(1)}`);
if (args.views) {
  const walked = r.perSeason.reduce((n, p) => n + (p.walked ?? 0), 0);
  const words: Record<string, number> = {};
  for (const p of r.perSeason) for (const [k, v] of Object.entries(p.words ?? {})) words[k] = (words[k] ?? 0) + v;
  const all = Object.values(words).reduce((a, b) => a + b, 0);
  console.log(`Views (ADR-084): ${(walked / r.seasons).toFixed(2)} coordinators a year refused a new contract; views after each offseason: ` +
    ["close", "good", "professional", "strained", "broken"].map((w) => `${w} ${pct1((words[w] ?? 0) / Math.max(1, all))}`).join(", "));
}
if (args.out) {
  writeFileSync(args.out, JSON.stringify(r, null, 2));
  console.log(`\nSaved ${args.out}`);
}
