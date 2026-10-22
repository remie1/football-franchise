/**
 * `pnpm --filter @ff/calibration season -- --seed <seed> [--season 2027] [--caller v5] [--out <file>]`
 *   `[--rosters generated|flat] [--team-sd <n>] [--stop-after <week> | playoffs:<week>] [--save <file>]`
 * `pnpm --filter @ff/calibration season -- --load <file> [--caller v5] [--stop-after …] [--save <file>]`
 *
 * Plays a whole season (272 games plus the playoffs) through the real sim, prints the final
 * standings and the champion, and with `--out` saves the season (schedule, results, standings,
 * bracket, and the season's event stream) as JSON.
 *
 * Save and load: `--stop-after 9` stops after the last day of regular-season week 9 (`playoffs:2`
 * after playoff week 2), and `--save` writes a save file. `--load` carries on from one; the games
 * it holds are read from it, not played again. A save records the play-caller version that played it
 * (E1): `--load` carries on with that version, and refuses a different `--caller` unless
 * `--switch-caller` is given.
 *
 * Rosters (ADR-079): each team plays with its own made-up squad unless `--rosters flat`; with
 * squads, `--out` also saves the players and each team's hidden strength. Squads are rebuilt
 * from the world seed: a save stores the players, but `--load` rebuilds them and uses squads when
 * the saved teams have rosters, the flat league when they do not. A save does not record `--team-sd`, so the
 * two cannot be combined.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_LEAGUE_RULES, stampToString, type CalendarStamp } from "@ff/contracts";
import { makeSave, readSave } from "@ff/franchise";
import { CALLER_VERSIONS, DEFAULT_CALLER_VERSION, type CallerVersion } from "../caller/anticipate.js";
import { runRealSeason, type SeasonRosters } from "./realSeason.js";

function parse(argv: readonly string[]) {
  let seed: string | undefined;
  let season = 2027;
  let callerVersion: CallerVersion | undefined;
  let out: string | undefined;
  let stopAfter: string | undefined;
  let save: string | undefined;
  let load: string | undefined;
  let switchCaller = false;
  let rosters: SeasonRosters | undefined;
  let teamStrengthSd: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new SyntaxError(`${arg} requires a value`);
      return v;
    };
    if (arg === "--") continue;
    else if (arg === "--seed") seed = next();
    else if (arg === "--season") season = Number(next());
    else if (arg === "--out") out = next();
    else if (arg === "--stop-after") stopAfter = next();
    else if (arg === "--save") save = next();
    else if (arg === "--load") load = next();
    else if (arg === "--switch-caller") switchCaller = true;
    else if (arg === "--rosters") {
      const v = next();
      if (v !== "generated" && v !== "flat") throw new SyntaxError("--rosters must be generated or flat");
      rosters = v;
    } else if (arg === "--team-sd") {
      teamStrengthSd = Number(next());
      if (!(teamStrengthSd >= 0)) throw new SyntaxError("--team-sd must be a number, 0 or more");
    }
    else if (arg === "--caller") {
      const v = next();
      if (!(CALLER_VERSIONS as readonly string[]).includes(v)) throw new SyntaxError(`--caller must be one of ${CALLER_VERSIONS.join(", ")}`);
      callerVersion = v as CallerVersion;
    } else throw new SyntaxError(`unknown argument ${arg}`);
  }
  if (load !== undefined && seed !== undefined) throw new SyntaxError("--load takes its seed from the save; drop --seed");
  if (load === undefined && (seed === undefined || seed.trim() === "")) throw new SyntaxError("--seed is required");
  if (!Number.isInteger(season)) throw new SyntaxError("--season must be a whole number");
  if (switchCaller && load === undefined) throw new SyntaxError("--switch-caller only applies with --load");
  if (load !== undefined && rosters !== undefined) throw new SyntaxError("--load takes its rosters from the save; drop --rosters");
  if (teamStrengthSd !== undefined && (load !== undefined || save !== undefined)) {
    throw new SyntaxError("a save does not record --team-sd; drop it to save or load");
  }
  return { seed, season, callerVersion, out, stopAfter, save, load, switchCaller, rosters, teamStrengthSd };
}

function stopDay(text: string, season: number): CalendarStamp {
  const m = /^(?:(playoffs):)?(\d+)$/i.exec(text);
  if (!m) throw new SyntaxError("--stop-after takes a week number, or playoffs:<week>");
  return { season, phase: m[1] ? "PLAYOFFS" : "REGULAR_SEASON", week: Number(m[2]), day: 7 };
}

const args = parse(process.argv.slice(2));
const started = Date.now();
const loaded = args.load === undefined ? undefined : readSave(readFileSync(args.load, "utf8"));
const seed = loaded?.save.worldSeed ?? args.seed!;
const season = loaded?.save.calendar.season ?? args.season;
const savedCaller = loaded?.save.playedWith?.caller;
if (savedCaller !== undefined && !(CALLER_VERSIONS as readonly string[]).includes(savedCaller)) {
  throw new Error(`This save was played with caller ${savedCaller}, which this version does not have`);
}
if (savedCaller !== undefined && args.callerVersion !== undefined && args.callerVersion !== savedCaller && !args.switchCaller) {
  throw new Error(`This save was played with caller ${savedCaller}; carrying on with ${args.callerVersion} needs --switch-caller`);
}
const callerVersion: CallerVersion = args.callerVersion ?? (savedCaller as CallerVersion | undefined) ?? DEFAULT_CALLER_VERSION;
const rosters: SeasonRosters = loaded
  ? (loaded.league.teams.some((t) => t.roster.length > 0) ? "generated" : "flat")
  : (args.rosters ?? "generated");
const { league, rated, run } = runRealSeason({
  seed, season, callerVersion, rosters,
  ...(args.teamStrengthSd === undefined ? {} : { teamStrengthSd: args.teamStrengthSd }),
  ...(loaded ? { league: loaded.league, rules: loaded.rules, ...(loaded.save.world.season ? { resumeFrom: loaded.save.world.season } : {}) } : {}),
  ...(args.stopAfter ? { stopAfter: stopDay(args.stopAfter, season) } : {}),
});
if (loaded) console.log(`Loaded ${args.load}: ${loaded.save.world.season?.results.length ?? 0} games already played`);
const name = new Map(league.teams.map((t) => [String(t.id), t.displayName]));

for (const d of league.structure.divisions) {
  console.log(`\n${d.name}`);
  for (const r of run.state.standings.filter((row) => d.teams.includes(row.team)).sort((a, b) => a.divisionRank - b.divisionRank)) {
    const o = r.overall;
    console.log(`  ${name.get(String(r.team))!.padEnd(28)} ${o.wins}-${o.losses}${o.ties ? `-${o.ties}` : ""}  PF ${r.pointsFor}  PA ${r.pointsAgainst}`);
  }
}
const took = `${run.state.results.length} games in ${((Date.now() - started) / 1000).toFixed(0)}s`;
const champion = run.state.bracket?.champion;
if (run.complete) console.log(`\nChampion: ${name.get(String(champion))} (${took})`);
else console.log(`\nStopped after ${stampToString(run.calendar)} (${took})${champion === undefined ? "" : `; champion ${name.get(String(champion))}`}`);
if (args.save) {
  const players = rated === undefined ? {} : { players: rated.league.players };
  const save = makeSave({ league, calendar: run.calendar, season: run.state, createdBy: "calibration season", playedWith: { caller: callerVersion }, rules: loaded?.rules ?? DEFAULT_LEAGUE_RULES, ...players });
  // Traits are a Set; JSON gets them as a list.
  writeFileSync(args.save, JSON.stringify(save, (_k, v: unknown) => (v instanceof Set ? [...v] : v), 2));
  console.log(`Saved ${args.save}`);
}
if (args.out) {
  const squads = rated === undefined ? {} : { rosters: rated.id, players: rated.league.players, ratedProvenance: rated.league.provenance };
  // Traits are a Set; JSON gets them as a list.
  const replacer = (_k: string, v: unknown) => (v instanceof Set ? [...v] : v);
  // The event stream rides along so the news desk (ADR-082) can read the season the way it happened.
  writeFileSync(args.out, JSON.stringify({ seed, league, season: run.state, events: run.events, ...squads }, replacer, 2));
  console.log(`Saved ${args.out}`);
}
