/**
 * `pnpm --filter @ff/franchise staff-check -- [--seed <seed>] [--seasons 50] [--views] [--out <file>]`
 *
 * ADR-080 C5: builds a league's coaches with their made-up history, runs `--seasons` more
 * offseasons on stand-in results, and prints the turnover next to the REPORTED NFL figures.
 * With `--views`, the staffs' views are carried and read (ADR-084 §7.1). With `--out`, saves the
 * whole report as JSON. With `--gms`, every team has a GM, hired and fired by the carousel (ADR-094
 * §8), and the GM rows print next to the COUNTED NFL figures (ADR-094 Appendix A).
 */
import { writeFileSync } from "node:fs";
import { staffTurnoverCheck, type Band } from "./check.js";

function parse(argv: readonly string[]) {
  let seed = "staff-check";
  let seasons = 50;
  let out: string | undefined;
  let views = false;
  let gms = false;
  let midseason = true;
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
    else if (arg === "--gms") gms = true;
    else if (arg === "--no-midseason") midseason = false;
    else throw new SyntaxError(`unknown argument ${arg}`);
  }
  if (!Number.isInteger(seasons) || seasons < 1) throw new SyntaxError("--seasons must be a whole number above 0");
  return { seed, seasons, out, views, gms, midseason };
}

const args = parse(process.argv.slice(2));
const started = Date.now();
const r = staffTurnoverCheck({ seed: args.seed, seasons: args.seasons, views: args.views, gms: args.gms, midseason: args.midseason });
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
if (s.midseason) {
  console.log(`Fired in midseason          head coaches ${b(s.midseason.HEAD_COACH)}   NFL: 19 in 2018-2025, about 2.4 a year (counted)` + (s.gm ? `; GMs ${b(s.midseason.GM)}   NFL: 10 in 2018-2026, about 1 a year (counted)` : ""));
}
if (s.gm) {
  const g = s.gm;
  const left = Object.entries(g.reasons).map(([k, v]) => `${k.toLowerCase().replace(/_/g, " ")} ${v}`).join(", ");
  console.log(`GM changes (after 10 seasons) ${b(g.changesPerYear)}   NFL: 36 in 2018-2026, about 4 a year (from 2 to 7), counted`);
  console.log(`                            why the old GM left: ${left}`);
  const gs = g.sourceShares;
  console.log(`New GMs came from           front offices ${pct(gs.FRONT_OFFICE)} (NFL 78%), former GMs ${pct(gs.RETREAD)} (NFL 14%), head coaches ${pct(gs.COACH)} (NFL 6%), outside ${pct(gs.OUTSIDE)} (NFL 3%)`);
  console.log(`GM tenure                   ${g.tenure.mean.toFixed(1)} seasons on average, median ${g.tenure.median} (${g.tenure.ended} jobs ended); sitting GMs' median ${g.sittingMedian.toFixed(1)} seasons served   NFL: about 3 (reported, 2024); about 4 from Appendix A's hires (2026)`);
  console.log(`Clean sweeps (GM and head coach changed together): ${g.cleanSweepsPerYear.toFixed(1)} a year   NFL: no count on file`);
}
if (args.out) {
  writeFileSync(args.out, JSON.stringify(r, null, 2));
  console.log(`\nSaved ${args.out}`);
}
