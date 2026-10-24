/**
 * `pnpm --filter @ff/calibration player-checks -- [--seeds 20] [--arms off,development,injuries,both] [--shard 1/3]`
 *
 * ADR-087 D5a, the single-season checks: plays `--seeds` seasons (seeds `spread-1`… , ADR-079 R5's)
 * in each arm and writes `reports/player-checks.md` and `.json`:
 * the win spread against the NFL (R5's table), injuries against the real numbers
 * (`reports/injury-rates.json`, when measured), how far players move in a year, the starter-versus-
 * backup gap, and what the depth charts and the free-agent pool did. Each season's summary is kept
 * under `data-cache/player-checks/`, so a re-run only plays what is missing. Seasons play one after
 * another in this process (library code never starts processes); to go faster, run the command in
 * a few shells with `--shard 1/3`, `--shard 2/3`, `--shard 3/3`, each playing its share, and the
 * report is written once every season is in the cache.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { NFL_SPREAD, summariseArm, type ArmSummary, type SeasonCheck } from "./playerChecks.js";
import { checkSeason, isArm } from "./playerChecksRun.js";

const argv = process.argv.slice(2).filter((a) => a !== "--");
const opt = (name: string, fallback: string) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1]! : fallback; };
const seeds = Number(opt("--seeds", "20"));
const arms = opt("--arms", "off,development,injuries,both").split(",");
for (const a of arms) if (!isArm(a)) throw new SyntaxError(`unknown arm ${a}: off, development, injuries or both`);
const shard = /^(\d+)\/(\d+)$/.exec(opt("--shard", "1/1"));
if (!shard || Number(shard[1]) < 1 || Number(shard[1]) > Number(shard[2])) throw new SyntaxError("--shard takes i/n, e.g. 2/3");
const [part, parts] = [Number(shard[1]), Number(shard[2])];
const root = fileURLToPath(new URL("../..", import.meta.url));
const cache = join(root, "data-cache", "player-checks");
mkdirSync(cache, { recursive: true });

const runs = arms.flatMap((arm) => Array.from({ length: seeds }, (_, i) => ({ arm, seed: `spread-${i + 1}` })));
const fileOf = (r: { arm: string; seed: string }) => join(cache, `${r.arm}-${r.seed}.json`);

const todo = runs.filter((r, i) => i % parts === part - 1 && !existsSync(fileOf(r)));
const started = Date.now();
todo.forEach((r, i) => {
  writeFileSync(fileOf(r), JSON.stringify(checkSeason(r.seed, r.arm as Parameters<typeof checkSeason>[1])));
  console.log(`${i + 1}/${todo.length} ${r.arm} ${r.seed} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
});
const missing = runs.filter((r) => !existsSync(fileOf(r)));
if (missing.length > 0) {
  console.log(`${missing.length} seasons are still to play (other shards); the report is written once all are in.`);
  process.exit(0);
}

const summaries: ArmSummary[] = arms.map((arm) =>
  summariseArm(runs.filter((r) => r.arm === arm).map((r) => JSON.parse(readFileSync(fileOf(r), "utf8")) as SeasonCheck)));

// The real injury numbers, when the measurement has been run (reports/injury-rates.json).
const realPath = join(root, "reports", "injury-rates.json");
interface RealInjuries {
  seasons: number[];
  pooled: {
    timeLoss: { perTeamGame: number; perTeamSeason: number };
    durations: { weeks: { bands: Record<string, number> } };
    groups: { group: string; perTeamGame: number }[];
    episodes: { dayToDayDesignatedPerTeamGame: number };
    reserve: { missing4PlusWeeksAll: number; missing4PlusGamesNew: number };
  };
}
const real = existsSync(realPath) ? (JSON.parse(readFileSync(realPath, "utf8")) as RealInjuries) : undefined;

const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const n2 = (x: number) => x.toFixed(2);
const lines: string[] = [];
const say = (s = "") => lines.push(s);
say("# ADR-087 D5a: one season with the players' switches");
say();
say(`${seeds} seasons per arm (seeds spread-1 to spread-${seeds}, ADR-079 R5's), generated squads, the caller default. ` +
  "Arms: `off` (today), `development` (growth and aging), `injuries`, `both`. Made by `pnpm --filter @ff/calibration player-checks`.");
say();
say("## Win spread (ADR-079 R5)");
say();
say("| | Win spread | Best record (avg) | Worst record (avg) | Teams with 13+ wins | Teams with 4 or fewer | Better record wins the game |");
say("|---|---|---|---|---|---|---|");
say(`| NFL 2021-24 | ${NFL_SPREAD.winSpread} | ${NFL_SPREAD.best} | ${NFL_SPREAD.worst} | ${pct(NFL_SPREAD.share13Plus)} | ${pct(NFL_SPREAD.share4OrFewer)} | ${pct(NFL_SPREAD.betterRecordWins)} |`);
for (const s of summaries) {
  const p = s.spread;
  say(`| ${s.arm} | ${n2(p.winSpread)} | ${p.best.toFixed(1)} | ${p.worst.toFixed(1)} | ${pct(p.share13Plus)} | ${pct(p.share4OrFewer)} | ${pct(p.betterRecordWins)} |`);
}
say();
const hurt = summaries.filter((s) => s.injuries.perTeamSeason > 0);
if (hurt.length > 0) {
  say("## Injuries");
  say();
  say("| | Game injuries per team-game | All injuries per team-season | Game / practice / away | 4+ weeks per team (camp to season's end) | Weeks lost per injury |");
  say("|---|---|---|---|---|---|");
  for (const s of hurt) {
    const i = s.injuries;
    say(`| ${s.arm} | ${n2(i.perTeamGame)} | ${i.perTeamSeason.toFixed(1)} | ${pct(i.settingShares.GAME ?? 0)} / ${pct(i.settingShares.PRACTICE ?? 0)} / ${pct(i.settingShares.AWAY ?? 0)} | ${i.longInSeasonPerTeam.toFixed(1)} | ${i.weeksPerInjury.toFixed(1)} |`);
  }
  say();
  say("Length bands (share of all injuries) and game injuries per team-game by position group:");
  say();
  for (const s of hurt) {
    say(`- **${s.arm}**: ${Object.entries(s.injuries.bandShares).map(([k, v]) => `${k} ${pct(v)}`).join(", ")}; ` +
      Object.entries(s.injuries.gameByGroupPerTeamGame).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(", "));
    say(`  - most common: ${s.injuries.topKinds.map((k) => `${k.kind} ${pct(k.share)}`).join(", ")}`);
  }
  say();
  if (real === undefined) {
    say("_The real numbers (`reports/injury-rates.json`) have not been measured yet._");
  } else {
    const r = real.pooled;
    say(`### Against the NFL (regular seasons ${real.seasons[0]}-${real.seasons.at(-1)}, \`reports/injury-rates.md\`)`);
    say();
    say("Injuries that begin in the regular season, in any setting, since the real reports cannot tell a game injury from a practice one. " +
      "Time-loss = costs at least a week. The real \"4+ weeks\" counts every player out 4+ weeks during the season, " +
      "including those already out at week 1; the sim's counts only injuries that begin in the season, so it should come in lower.");
    say();
    say("| | Time-loss per team-game | Day-to-day per team-game | Time-loss per team-season | Short / long / major (of time-loss) | 4+ weeks per team-season |");
    say("|---|---|---|---|---|---|");
    const b = r.durations.weeks.bands;
    say(`| NFL | ${n2(r.timeLoss.perTeamGame)} | ${n2(r.episodes.dayToDayDesignatedPerTeamGame)} | ${r.timeLoss.perTeamSeason.toFixed(1)} | ${pct(b.short ?? 0)} / ${pct(b.long ?? 0)} / ${pct(b.major ?? 0)} | ${r.reserve.missing4PlusWeeksAll.toFixed(1)} (new in season: ${r.reserve.missing4PlusGamesNew.toFixed(1)}, by games) |`);
    for (const s of hurt) {
      const g = s.injuries.regular;
      say(`| ${s.arm} | ${n2(g.timeLossPerTeamGame)} | ${n2(g.dayToDayPerTeamGame)} | ${g.timeLossPerTeamSeason.toFixed(1)} | ${pct(g.timeLossBands.SHORT ?? 0)} / ${pct(g.timeLossBands.LONG ?? 0)} / ${pct(g.timeLossBands.MAJOR ?? 0)} | ${g.longPerTeamSeason.toFixed(1)} |`);
    }
    say();
    say("Time-loss injuries per team-game by position group:");
    say();
    const groups = r.groups.map((x) => x.group);
    say(`| | ${groups.join(" | ")} |`);
    say(`|---|${groups.map(() => "---").join("|")}|`);
    say(`| NFL | ${r.groups.map((x) => x.perTeamGame.toFixed(3)).join(" | ")} |`);
    for (const s of hurt) say(`| ${s.arm} | ${groups.map((gr) => (s.injuries.regular.timeLossByGroupPerTeamGame[gr] ?? 0).toFixed(3)).join(" | ")} |`);
  }
  say();
}
const grown = summaries.filter((s) => s.arm !== "off");
if (grown.length > 0) {
  say("## How far players move in a year (position overall, start of camp to the end of the league year)");
  say();
  say("| Arm | Age | Starters: mean (10th to 90th) | n | Backups: mean (10th to 90th) | n |");
  say("|---|---|---|---|---|---|");
  for (const s of grown) {
    for (const [band, roles] of Object.entries(s.movement).sort()) {
      const c = (r: string) => { const x = roles[r]; return x ? [`${x.mean >= 0 ? "+" : ""}${n2(x.mean)} (${n2(x.p10)} to ${n2(x.p90)})`, String(x.n)] : ["-", "0"]; };
      say(`| ${s.arm} | ${band} | ${c("starter").join(" | ")} | ${c("backup").join(" | ")} |`);
    }
  }
  say();
  say("## Starters and backups (mean position overall)");
  say();
  say("| Arm | Starters at camp | Starters at year's end | Backups at camp | Backups at year's end | Gap at camp | Gap at year's end |");
  say("|---|---|---|---|---|---|---|");
  for (const s of summaries) {
    const g = s.gap;
    say(`| ${s.arm} | ${g.starterStart.toFixed(1)} | ${g.starterEnd.toFixed(1)} | ${g.backupStart.toFixed(1)} | ${g.backupEnd.toFixed(1)} | ${(g.starterStart - g.backupStart).toFixed(2)} | ${(g.starterEnd - g.backupEnd).toFixed(2)} |`);
  }
  say();
  say("## Depth charts and the free-agent pool");
  say();
  say("| Arm | Emergency signings a season | Unsigned retirements a season | Position battles per team | Depth-chart changes per team, by reason |");
  say("|---|---|---|---|---|");
  for (const s of grown) {
    const r = s.roster;
    say(`| ${s.arm} | ${r.emergencySigningsPerSeason.toFixed(1)} | ${r.unsignedRetiredPerSeason.toFixed(1)} | ${r.battlesPerTeamSeason.toFixed(2)} | ${Object.entries(r.depthChangesPerTeamSeason).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(", ")} |`);
  }
  say();
}
writeFileSync(join(root, "reports", "player-checks.md"), lines.join("\n"));
writeFileSync(join(root, "reports", "player-checks.json"), JSON.stringify({ seeds, arms, summaries }, null, 2));
console.log(lines.join("\n"));
