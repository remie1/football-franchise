/**
 * `pnpm --filter @ff/calibration season -- --seed <seed> [--season 2027] [--caller v5] [--engine-rules <name>] [--out <file>]`
 *   `[--rosters generated|flat|standin] [--league <file>] [--team-sd <n>] [--stop-after <week> | playoffs:<week>] [--save <file>]`
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
 * Engine rules (ADR-089 §9, petition P1): `--engine-rules <name>` plays a new league under that rules
 * bundle (`legacy`, the default; `pocket-1.s1`, step 1's design bundle; or `pocket-1.s2`, step 2's:
 * must act per rusher, the forcing point at 0.5 s and the warning at 1.0 s). A save also records the
 * rules that played it when they are not `legacy`, as `<name>@<overlay digest>` (K18 (a)); `--load`
 * carries on under the save's rules (none recorded: `legacy`), refuses rules this version cannot
 * play as written, and refuses a `--engine-rules` that differs from the save's. `--out` records the
 * caller and the rules that played (`src/season/stamp.ts`).
 *
 * News (ADR-082 R2): each week's top headlines print as the season plays, as the news command
 * prints them from a saved season. Carrying on from a save prints only the weeks after it.
 *
 * Rosters (ADR-079): each team plays with its own made-up squad unless `--rosters flat`; with
 * squads, `--out` also saves the players and each team's hidden strength. Squads are rebuilt
 * from the world seed: a save stores the players, but `--load` rebuilds them and uses squads when
 * the saved teams have rosters, the flat league when they do not. A save does not record `--team-sd`, so the
 * two cannot be combined.
 *
 * Stand-ins (ADR-088): `--league <file>` (with or without `--rosters standin`) plays the real NFL's
 * stand-ins from a league file written by `pnpm --filter @ff/attributes import-real`. Not with
 * `--save` or `--team-sd` yet. With `--development` or `--injuries` the stand-ins play the file's own
 * season (its ages and injuries are that season's), and a different `--season` is refused; with
 * both off, the season is the default, as before.
 *
 * Coaches (ADR-080; ADR-078 R1 amendment 2): a new league's coaches are made from the world seed at
 * the start, with their made-up history, and `--save` keeps them. `--load` carries on with the saved
 * coaches. Coaches do not touch the games yet.
 *
 * Players (ADR-087): `--development` (growth and aging) and `--injuries` switch on the players'
 * weekly steps, alone or together; both are off by default, and off the season is exactly today's.
 * With either on, the season runs on through the offseason to the end of the league year, hurt
 * players sit out, coaches set their depth charts each week, and teams short of a player call up a
 * man from their own practice squad (the stand-in league carries squads), else sign a street free
 * agent. `--save` then keeps the players as they are that day and what happened to
 * them, and `--load` carries on with the save's own switches. Truth-layer events (true ratings,
 * ADR-087 §7) never reach the news or `--out`. Not with `--rosters flat`, which has no squads. The
 * stand-in league's growth records and copied injuries come with the file
 * (`pnpm --filter @ff/attributes standin-development`, ADR-087 §2.5); each is read only with its switch.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareStamps, DEFAULT_LEAGUE_RULES, isTruthLayerEvent, stampToString, type CalendarStamp } from "@ff/contracts";
import { buildLeague, buildStaff, makeSave, readSave } from "@ff/franchise";
import { createNewsDesk, formatEdition } from "@ff/narrative";
import { CALLER_VERSIONS, DEFAULT_CALLER_VERSION, type CallerVersion } from "../caller/anticipate.js";
import { runRealSeason, seasonToPlay, type SeasonRosters } from "./realSeason.js";
import { readStandInFile } from "./standInLeague.js";
import { checkStamp, engineRulesDigestOf, LEGACY_RULES, rulesTunables } from "../pocket/rules.js";
import { savePlayedWith, seasonOutStamp, seasonRules } from "./stamp.js";

function parse(argv: readonly string[]) {
  let seed: string | undefined;
  /** Only when typed: stand-ins with a switch on play their file's season (`standInSeason`). */
  let season: number | undefined;
  let callerVersion: CallerVersion | undefined;
  let out: string | undefined;
  let stopAfter: string | undefined;
  let save: string | undefined;
  let load: string | undefined;
  let switchCaller = false;
  let rosters: SeasonRosters | undefined;
  let teamStrengthSd: number | undefined;
  let leagueFile: string | undefined;
  let development = false;
  let injuries = false;
  let engineRules: string | undefined;
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
    else if (arg === "--development") development = true;
    else if (arg === "--injuries") injuries = true;
    else if (arg === "--engine-rules") engineRules = next();
    else if (arg === "--rosters") {
      const v = next();
      if (v !== "generated" && v !== "flat" && v !== "standin") throw new SyntaxError("--rosters must be generated, flat or standin");
      rosters = v;
    } else if (arg === "--league") leagueFile = next(); else if (arg === "--team-sd") {
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
  if (season !== undefined && !Number.isInteger(season)) throw new SyntaxError("--season must be a whole number");
  if (switchCaller && load === undefined) throw new SyntaxError("--switch-caller only applies with --load");
  // Before --league stands for --rosters standin below; without this, a --league beside --load would be read and then ignored.
  if (load !== undefined && leagueFile !== undefined) throw new SyntaxError("--load takes its rosters from the save; drop --league");
  if (load !== undefined && rosters !== undefined) throw new SyntaxError("--load takes its rosters from the save; drop --rosters");
  if (teamStrengthSd !== undefined && (load !== undefined || save !== undefined)) {
    throw new SyntaxError("a save does not record --team-sd; drop it to save or load");
  }
  if (leagueFile !== undefined && rosters === undefined) rosters = "standin";
  if (rosters === "standin" && leagueFile === undefined) throw new SyntaxError("--rosters standin needs --league <file>");
  if (leagueFile !== undefined && rosters !== "standin") throw new SyntaxError("--league is the stand-in league; it goes with --rosters standin");
  // ADR-088 R5: saves do not record which league file was played yet.
  if (rosters === "standin" && save !== undefined) throw new SyntaxError("a save cannot hold the stand-in league yet; drop --save");
  if (rosters === "standin" && teamStrengthSd !== undefined) throw new SyntaxError("the stand-in league has no hidden team strength (ADR-088 Q8); drop --team-sd");
  if ((development || injuries) && load !== undefined) throw new SyntaxError("--load carries on with the save's own --development and --injuries; drop them");
  if ((development || injuries) && rosters === "flat") throw new SyntaxError("--development and --injuries need squads; --rosters flat has none");
  return { seed, season, callerVersion, out, stopAfter, save, load, switchCaller, rosters, teamStrengthSd, leagueFile, development, injuries, engineRules };
}

function stopDay(text: string, season: number): CalendarStamp {
  const m = /^(?:(playoffs):)?(\d+)$/i.exec(text);
  if (!m) throw new SyntaxError("--stop-after takes a week number, or playoffs:<week>");
  return { season, phase: m[1] ? "PLAYOFFS" : "REGULAR_SEASON", week: Number(m[2]), day: 7 };
}

// A relative path is from the folder the command was typed in, not this package's, where pnpm runs
// it; so `--out season.json` here and the news command's `--season season.json` agree.
const fromCaller = (path: string) => resolve(process.env.INIT_CWD ?? process.cwd(), path);

/** Traits are a Set; JSON gets them as a list. */
const listTraits = (_k: string, v: unknown): unknown => (v instanceof Set ? [...v] : v);

const args = parse(process.argv.slice(2));
const started = Date.now();
const loaded = args.load === undefined ? undefined : readSave(readFileSync(fromCaller(args.load), "utf8"));
const seed = loaded?.save.worldSeed ?? args.seed!;
// The stand-in league is read first: with a player switch on it sets the season (its own), which the
// coaches, the stop day and the season all use (ADR-087 §2.5; `seasonToPlay`, below).
const standIn = args.leagueFile === undefined ? undefined : readStandInFile(readFileSync(fromCaller(args.leagueFile), "utf8"));
const savedCaller = loaded?.save.playedWith?.caller;
if (savedCaller !== undefined && !(CALLER_VERSIONS as readonly string[]).includes(savedCaller)) {
  throw new Error(`This save was played with caller ${savedCaller}, which this version does not have`);
}
if (savedCaller !== undefined && args.callerVersion !== undefined && args.callerVersion !== savedCaller && !args.switchCaller) {
  throw new Error(`This save was played with caller ${savedCaller}; carrying on with ${args.callerVersion} needs --switch-caller`);
}
const callerVersion: CallerVersion = args.callerVersion ?? (savedCaller as CallerVersion | undefined) ?? DEFAULT_CALLER_VERSION;
// ADR-089 P1, K18: a new league plays the rules it names (default legacy); a save carries on under its
// own (absent: legacy), and a different --engine-rules is refused. Checked before any game (S1).
const engineRules = seasonRules(loaded?.save, args.engineRules);
const gameTunables = checkStamp(rulesTunables(engineRules), engineRules, "season");
const rosters: SeasonRosters = loaded
  ? (loaded.league.teams.some((t) => t.roster.length > 0) ? "generated" : "flat")
  : (args.rosters ?? "generated");
if (loaded) console.log(`Loaded ${args.load}: ${loaded.save.world.season?.results.length ?? 0} games already played`);

// The desk reads the season as it plays (ADR-082 R2). A resumed run replays from day one, so the
// desk sees the weeks the save holds too; their headlines were printed when they were played.
type Desk = ReturnType<typeof createNewsDesk>;
const base = loaded?.league ?? buildLeague(seed);
// ADR-087: the players' switches, from the command line or, carrying on, from the save.
const savedSwitches = loaded?.development?.people.playerMemory?.switches;
const players = loaded
  ? (savedSwitches ? { development: savedSwitches.development, injuries: savedSwitches.injuries } : undefined)
  : (args.development || args.injuries ? { development: args.development, injuries: args.injuries } : undefined);
// The season the run plays, worked out once, as `runRealSeason` does, for the coaches and the stop day too.
const season = loaded?.save.calendar.season
  ?? seasonToPlay({ rosters, ...(standIn === undefined ? {} : { standIn }), ...(players ? { players } : {}), ...(args.season === undefined ? {} : { season: args.season }) });
// A save from before coaches were kept has none; it carries on without them rather than inventing a staff mid-season.
// With the players' switches on, each head coach also gets his depth-chart leanings (ADR-087 C1).
const staff = loaded ? loaded.staff : { world: buildStaff(base, { firstSeason: season, ...(players ? { lineups: true } : {}) }).world };
let desk: Desk | undefined;
const printNews = (editions: ReturnType<Desk["take"]>) => {
  for (const e of editions) {
    if (loaded && compareStamps(e.at, loaded.save.calendar) <= 0) continue;
    console.log(`\n${formatEdition(e, desk!.scoreLine)}`);
  }
};
const { league, rated, run } = runRealSeason({
  seed, season, callerVersion, rosters, league: base,
  ...(standIn === undefined ? {} : { standIn }),
  ...(args.teamStrengthSd === undefined ? {} : { teamStrengthSd: args.teamStrengthSd }),
  ...(loaded ? { rules: loaded.rules, ...(loaded.save.world.season ? { resumeFrom: loaded.save.world.season } : {}) } : {}),
  ...(args.stopAfter ? { stopAfter: stopDay(args.stopAfter, season) } : {}),
  ...(players ? { players, ...(staff ? { staff: staff.world.staff } : {}) } : {}),
  ...(players && loaded?.development ? { resume: { people: loaded.development.people, events: loaded.development.events, through: loaded.save.calendar } } : {}),
  // A legacy season passes nothing, as before; any other plays its bundle in every game.
  ...(engineRules === LEGACY_RULES ? {} : { game: { tunables: gameTunables } }),
  onEvent: (envelope, schedule) => {
    if (isTruthLayerEvent(envelope.event)) return; // true ratings never reach the news (ADR-087 §7)
    desk ??= createNewsDesk({ seed, structure: base.structure, teams: base.teams, schedule });
    printNews(desk.take(envelope));
  },
});
if (desk) printNews(desk.finish());
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
  const path = fromCaller(args.save);
  // With the players' switches on, the people as they are today, and what the players' steps did (S1).
  const people = players ? run.people : undefined;
  const squad = people ? { players: people.players } : rated === undefined ? {} : { players: rated.league.players };
  const development = people ? {
    league: { ...league, teams: people.teams },
    development: {
      events: (run.stepEvents ?? []).filter((e) => e.step.startsWith("players:")).map((e) => e.envelope),
      depthMemory: people.playerMemory ?? (() => { throw new Error("the players' steps left no memory to save"); })(),
    },
  } : { league };
  const save = makeSave({ ...development, calendar: run.calendar, season: run.state, createdBy: "calibration season", playedWith: savePlayedWith(callerVersion, engineRules), rules: loaded?.rules ?? DEFAULT_LEAGUE_RULES, ...squad, ...(staff ? { staff } : {}) });
  writeFileSync(path, JSON.stringify(save, listTraits, 2));
  console.log(`Saved ${path}`);
}
if (args.out) {
  const path = fromCaller(args.out);
  const squads = rated === undefined ? {} : { rosters: rated.id, players: rated.league.players, ratedProvenance: rated.league.provenance };
  // The event stream rides along so the news desk (ADR-082) can read the season the way it happened.
  // Truth-layer events stay out: the viewer and the news never load them (ADR-087 §7).
  const events = players ? run.events.filter((e) => !isTruthLayerEvent(e.event)) : run.events;
  // ADR-089 §9: what played, caller and rules, beside the season (O11: always written).
  const playedBy = seasonOutStamp(callerVersion, engineRules, engineRulesDigestOf(engineRules));
  writeFileSync(path, JSON.stringify({ seed, ...playedBy, league, season: run.state, events, ...squads }, listTraits, 2));
  console.log(`Saved ${path}`);
}
