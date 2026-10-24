/**
 * `pnpm --filter @ff/calibration player-checks -- [--seeds 20] [--arms off,development,injuries,both] [--shard 1/3] [--league <file>]`
 *
 * ADR-087 D5a, the single-season checks: plays `--seeds` seasons (seeds `spread-1`… , ADR-079 R5's)
 * in each arm and writes `reports/player-checks.md` and `.json`:
 * the win spread against the NFL (R5's table), injuries against the real numbers
 * (`reports/injury-rates.json`, when measured), how far players move in a year, the starter-versus-
 * backup gap, and what the depth charts and the free-agent pool did. Each season's summary is kept
 * under `data-cache/player-checks/<code>/`, where `<code>` is a fingerprint of every package's source,
 * so a re-run only plays what is missing and a change to the code (a retuned table, say) starts a
 * fresh cache rather than reporting old seasons. Seasons play one after
 * another in this process (library code never starts processes); to go faster, run the command in
 * a few shells with `--shard 1/3`, `--shard 2/3`, `--shard 3/3`, each playing its share, and the
 * report is written once every season is in the cache.
 *
 * `--league <file>`: the same checks on the stand-in league (ADR-088; its growth records from
 * `pnpm --filter @ff/attributes standin-development`, ADR-087 §2.5), every arm on the file's own
 * season, written to `reports/player-checks-standin.md` and `.json`. The file's sha256 joins the
 * fingerprint, so a rewritten file starts a fresh cache. Where the report counts players it splits
 * them into the 53, the practice squad, the reserve lists and the street (the injury tables take the
 * 53 and the street, as the generated league's do); the players who start the year hurt (copied from
 * the file, so no INJURY_OCCURRED) are counted from the start; the starters are who the engine fields
 * from the real depth charts; and a section gives the growth rates' scale on the 53 at camp. The
 * report names the file by its path from the repository (its name alone when outside it).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NFL_SPREAD, ROSTER_GROUPS, summariseArm, type ArmSummary, type SeasonCheck } from "./playerChecks.js";
import { checkSeason, isArm } from "./playerChecksRun.js";
import { readStandInFile } from "./standInLeague.js";

const argv = process.argv.slice(2).filter((a) => a !== "--");
const opt = (name: string, fallback: string) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1]! : fallback; };
const seeds = Number(opt("--seeds", "20"));
const arms = opt("--arms", "off,development,injuries,both").split(",");
for (const a of arms) if (!isArm(a)) throw new SyntaxError(`unknown arm ${a}: off, development, injuries or both`);
const shard = /^(\d+)\/(\d+)$/.exec(opt("--shard", "1/1"));
if (!shard || Number(shard[1]) < 1 || Number(shard[1]) > Number(shard[2])) throw new SyntaxError("--shard takes i/n, e.g. 2/3");
const [part, parts] = [Number(shard[1]), Number(shard[2])];
const root = fileURLToPath(new URL("../..", import.meta.url));
// The stand-in league, when asked for: a path from the folder the command was typed in.
const leagueAt = argv.indexOf("--league");
if (leagueAt >= 0 && (argv[leagueAt + 1] === undefined || argv[leagueAt + 1]!.startsWith("--"))) throw new SyntaxError("--league requires a file");
const leagueFull = leagueAt < 0 ? undefined : resolve(process.env.INIT_CWD ?? process.cwd(), argv[leagueAt + 1]!);
// As the report names it: from the repository's root, so the same file gives the same report however it was typed.
const leaguePath = leagueFull === undefined ? "" : (() => {
  const rel = relative(join(root, "..", ".."), leagueFull);
  return rel.startsWith("..") || isAbsolute(rel) ? basename(leagueFull) : rel;
})();
const leagueBytes = leagueFull === undefined ? undefined : readFileSync(leagueFull);
const standIn = leagueBytes === undefined ? undefined : readStandInFile(leagueBytes.toString("utf8"));
const leagueSha = leagueBytes === undefined ? undefined : createHash("sha256").update(leagueBytes).digest("hex");
// The code the seasons were played with: every package's source files, by path and content.
const code = createHash("sha256");
for (const pkg of ["contracts", "engine", "playbook", "attributes", "franchise", "calibration"]) {
  const src = join(root, "..", pkg, "src");
  const files = (readdirSync(src, { recursive: true }) as string[]).filter((f) => f.endsWith(".ts")).sort();
  for (const f of files) code.update(`${pkg}/${f}\n`).update(readFileSync(join(src, f)));
}
// The stand-in league's file is an input too: its bytes' hash joins the code's.
if (leagueSha !== undefined) code.update(`league\n${leagueSha}\n`);
const fingerprint = code.digest("hex").slice(0, 12);
const cache = join(root, "data-cache", "player-checks", fingerprint);
mkdirSync(cache, { recursive: true });
console.log(`Code ${fingerprint}: seasons cached in ${cache}`);

const runs = arms.flatMap((arm) => Array.from({ length: seeds }, (_, i) => ({ arm, seed: `spread-${i + 1}` })));
const fileOf = (r: { arm: string; seed: string }) => join(cache, `${r.arm}-${r.seed}.json`);

const todo = runs.filter((r, i) => i % parts === part - 1 && !existsSync(fileOf(r)));
const started = Date.now();
todo.forEach((r, i) => {
  writeFileSync(fileOf(r), JSON.stringify(standIn === undefined
    ? checkSeason(r.seed, r.arm as Parameters<typeof checkSeason>[1])
    : checkSeason(r.seed, r.arm as Parameters<typeof checkSeason>[1], standIn.season, standIn)));
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
    timeLoss: { perTeamGame: number; perTeamGameAllCauses: number };
    durations: { weeks: { bands: Record<string, number> } };
    groups: { group: string; perTeamGame: number }[];
    episodes: { dayToDayDesignatedPerTeamGame: number };
    reserve: { missing4PlusWeeksAll: number; missing4PlusGamesNew: number; pupAtWeek1PerTeamSeason: number; nfiAtWeek1PerTeamSeason: number };
  };
}
const real = existsSync(realPath) ? (JSON.parse(readFileSync(realPath, "utf8")) as RealInjuries) : undefined;

const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const n2 = (x: number) => x.toFixed(2);
const lines: string[] = [];
const say = (s = "") => lines.push(s);
if (standIn === undefined) {
  say("# ADR-087 D5a: one season with the players' switches");
  say();
  say(`${seeds} seasons per arm (seeds spread-1 to spread-${seeds}, ADR-079 R5's), generated squads, the caller default. ` +
    "Arms: `off` (today), `development` (growth and aging), `injuries`, `both`. Made by `pnpm --filter @ff/calibration player-checks` " +
    `with the code fingerprinted \`${fingerprint}\`.`);
} else {
  say("# ADR-087 D5a on the stand-in league: one season with the players' switches");
  say();
  say(`${seeds} seasons per arm (seeds spread-1 to spread-${seeds}, ADR-079 R5's), the stand-in league of ${standIn.snapshotDate} ` +
    `(ADR-088; \`${leaguePath}\`, sha256 \`${leagueSha!.slice(0, 12)}\`), every arm in its own season, ${standIn.season}, the caller default. ` +
    "Arms: `off` (today), `development` (growth and aging), `injuries`, `both`. Growth records and copied injuries come from the file " +
    "(ADR-087 §2.5, step 1: growth drawn, bodies as rated, injury lengths placeholders); each is read only with its switch. " +
    "Made by `pnpm --filter @ff/calibration player-checks -- --league <file>` " +
    `with the code and file fingerprinted \`${fingerprint}\`.`);
}
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
    say("Like for like with the real measurement: injuries to players on a team that begin after one of his team's regular-season games " +
      "and before its next, per team interval (a game followed by another, the real denominator), in any setting, since the real reports " +
      "cannot tell a game injury from a practice one. Football injuries only, as in the real headline; \"any cause\" adds illness and " +
      "accidents away from football. Time-loss = costs at least a week. \"Out 4+, begun in season\" counts each player once, by his " +
      "team's games missed before the season ends; \"any onset\" counts regular-season weeks missed whenever the injury began. The real " +
      `"any onset" also holds players hurt before camp (about ${(real.pooled.reserve.pupAtWeek1PerTeamSeason + real.pooled.reserve.nfiAtWeek1PerTeamSeason).toFixed(1)} a team on the PUP and non-football lists at week 1), ` +
      (standIn === undefined
        ? "whom the sim, which starts healthy at camp, cannot have."
        : "whom the sim counts apart: the stand-ins hurt at camp are copied from the file and raise no INJURY_OCCURRED (\"Started hurt\" below)."));
    say();
    say("| | Time-loss per team-game | Any cause | Day-to-day per team-game | Short / long / major (of time-loss) | Out 4+, begun in season (per team) | Out 4+, any onset (per team) |");
    say("|---|---|---|---|---|---|---|");
    const b = r.durations.weeks.bands;
    say(`| NFL | ${n2(r.timeLoss.perTeamGame)} | ${n2(r.timeLoss.perTeamGameAllCauses)} | ${n2(r.episodes.dayToDayDesignatedPerTeamGame)} | ${pct(b.short ?? 0)} / ${pct(b.long ?? 0)} / ${pct(b.major ?? 0)} | ${r.reserve.missing4PlusGamesNew.toFixed(1)} | ${r.reserve.missing4PlusWeeksAll.toFixed(1)} |`);
    for (const s of hurt) {
      const g = s.injuries.regular;
      say(`| ${s.arm} | ${n2(g.timeLossPerTeamGame)} | ${n2(g.timeLossAllCausesPerTeamGame)} | ${n2(g.dayToDayPerTeamGame)} | ${pct(g.timeLossBands.SHORT ?? 0)} / ${pct(g.timeLossBands.LONG ?? 0)} / ${pct(g.timeLossBands.MAJOR ?? 0)} | ${g.longPerTeamSeason.toFixed(1)} | ${g.longAllPerTeamSeason.toFixed(1)} |`);
    }
    say();
    say("Football time-loss injuries per team-game by setting (the game rate is the one fitted to the NFL; practice and away are set apart, see `injuryTables.ts`):");
    say();
    for (const s of hurt) say(`- **${s.arm}**: ${Object.entries(s.injuries.regular.timeLossBySettingPerTeamGame).map(([k, v]) => `${k.toLowerCase()} ${v.toFixed(2)}`).join(", ")}`);
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
const GROUP_NAME: Readonly<Record<string, string>> = { "53": "the 53", practice: "practice squad", reserve: "reserve lists", street: "street free agents" };
if (standIn !== undefined) {
  const sized = summaries.filter((s) => s.standIn !== undefined);
  say("## Roster groups (stand-in league)");
  say();
  say("Each stand-in's group is his status in the league file at the start: the 53 (active), the practice squad, or a reserve list; " +
    "\"street\" is the run's street free agents. The injury tables above count the 53 and the street, the people the made-up league's " +
    "count (it has no practice squad or reserve lists); the tables against the NFL count the 53 (and any street signing) only. The " +
    "practice squad's and the reserve lists' injuries are counted here alone. \"Started hurt\" are the players the file copies hurt at " +
    "camp (ADR-087 §2.5): they raise no INJURY_OCCURRED, so no count above includes them. Starters below are who the engine fields from " +
    "each team's real depth chart at camp (11 personnel, the base and nickel defences, the specialists: 26 a team), not the made-up " +
    "league's starters-per-position table, which the real charts do not follow.");
  say();
  // Every arm starts from the same file, so the groups' sizes are the same in each.
  const start = sized[0]?.standIn?.playersPerTeam ?? {};
  say(`Players per team at camp: ${["53", "practice", "reserve"].map((g) => `${GROUP_NAME[g]} ${(start[g] ?? 0).toFixed(1)}`).join(", ")}.`);
  say();
  say("| Arm | Started hurt per team: the 53 / practice / reserve | Injuries per team-season: the 53 / practice / reserve / street | Injuries per player-season: the 53 / practice / reserve |");
  say("|---|---|---|---|");
  for (const s of sized) {
    const x = s.standIn!;
    const v = (m: Record<string, number>, gs: readonly string[], d = 2) => gs.map((g) => (m[g] ?? 0).toFixed(d)).join(" / ");
    say(`| ${s.arm} | ${v(x.startedHurtPerTeam, ["53", "practice", "reserve"])} | ${v(x.injuriesPerTeamSeason, ROSTER_GROUPS)} | ${v(x.injuriesPerPlayerSeason, ["53", "practice", "reserve"], 3)} |`);
  }
  say();
  const scaled = sized.filter((s) => s.standIn!.growthScale !== undefined);
  if (scaled.length > 0) {
    say("## Growth rates on the 53 at camp (ADR-087 §2.1)");
    say();
    say("The rates every season starts from (the file's, the same each season). The made-up league draws them lognormal with median 1 and a " +
      "log spread of 0.25 (`GROWTH`); step 1 draws the stand-ins' the same way.");
    say();
    say("| Arm | n | Median growth | Median of ln(growth) | sd of ln(growth) |");
    say("|---|---|---|---|---|");
    for (const s of scaled) {
      const g = s.standIn!.growthScale!;
      say(`| ${s.arm} | ${g.n} | ${g.median.toFixed(3)} | ${g.medianLog >= 0 ? "+" : ""}${g.medianLog.toFixed(3)} | ${g.sdLog.toFixed(3)} |`);
    }
    say();
  }
}
const grown = summaries.filter((s) => s.arm !== "off");
if (grown.length > 0) {
  say("## How far players move in a year (position overall, start of camp to the end of the league year)");
  say();
  // The stand-in league adds its practice squad and reserve lists (off the 53, so not in the gap below).
  const roles = standIn === undefined ? ["starter", "backup"] : ["starter", "backup", "practice", "reserve"];
  const roleName: Readonly<Record<string, string>> = { starter: "Starters", backup: "Backups", practice: "Practice squad", reserve: "Reserve lists" };
  say(`| Arm | Age | ${roles.map((r) => `${roleName[r]}: mean (10th to 90th) | n`).join(" | ")} |`);
  say(`|---|---|${roles.map(() => "---|---").join("|")}|`);
  for (const s of grown) {
    for (const [band, cells] of Object.entries(s.movement).sort()) {
      const c = (r: string) => { const x = cells[r]; return x ? [`${x.mean >= 0 ? "+" : ""}${n2(x.mean)} (${n2(x.p10)} to ${n2(x.p90)})`, String(x.n)] : ["-", "0"]; };
      say(`| ${s.arm} | ${band} | ${roles.map((r) => c(r).join(" | ")).join(" | ")} |`);
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
const report = standIn === undefined ? "player-checks" : "player-checks-standin";
writeFileSync(join(root, "reports", `${report}.md`), lines.join("\n"));
writeFileSync(join(root, "reports", `${report}.json`), JSON.stringify(standIn === undefined
  ? { seeds, arms, code: fingerprint, summaries }
  : { seeds, arms, code: fingerprint, league: { file: leaguePath, sha256: leagueSha, snapshotDate: standIn.snapshotDate, season: standIn.season }, summaries }, null, 2));
console.log(lines.join("\n"));
