/**
 * `pnpm --filter @ff/calibration group-weights [-- --games 400] [--out reports/group-weights.json] [--report reports/group-weights.md]`
 * ADR-081 M1: measure what each position group is worth (see groupWeights.ts).
 */
import { writeFileSync } from "node:fs";
import { GROUPS, groupWeightsMarkdown, measureGroupWeights, type Group } from "./groupWeights.js";

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const games = Number(opt("--games") ?? 400);
if (!(games >= 2) || games % 2 !== 0) throw new SyntaxError("--games must be an even number, 2 or more");
const groups = opt("--groups")?.split(",") as Group[] | undefined;
for (const g of groups ?? []) if (!GROUPS.includes(g)) throw new SyntaxError(`unknown group ${g}`);
const started = Date.now();
const report = measureGroupWeights({
  games, ...(groups ? { groups } : {}),
  onGame: (label, i) => { if ((i + 1) % 50 === 0) console.error(`${label}: ${i + 1}/${games} (${Math.round((Date.now() - started) / 1000)}s)`); },
});
const md = groupWeightsMarkdown(report);
process.stdout.write(md);
const out = opt("--out"); if (out) writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
const rep = opt("--report"); if (rep) writeFileSync(rep, md);
