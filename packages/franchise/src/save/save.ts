/**
 * Save and load (plan: /mnt/project-files/design/save-and-load-plan.md, step L2).
 *
 * `makeSave` writes a league and its season into the shared `SaveFile` shape (Spec #1 §9).
 * `readSave` checks a file before trusting it and hands back what `runSeason` needs to carry on.
 *
 * The season's seed is the world seed: `runSeason` is given `league.seed`, as the real-sim runner
 * does. Play logs are not saved; every result keeps the seed it was played with.
 *
 * A save made mid-season is checked by replaying it: `runSeason` is run with the saved results up to
 * the saved day, with a resolver that refuses to play anything. If that rebuilds the same schedule,
 * standings and bracket, the file is consistent; if it needs a game the file does not have, or the
 * file has one it should not, the file is refused. Same code that plays the season checks the save.
 */
import {
  ATTRIBUTE_REGISTRY_V1, DEFAULT_LEAGUE_RULES, SAVE_FORMAT_VERSION, compareStamps, stampToString,
  type CalendarStamp, type LeagueRules, type PlayerState, type SaveFile, type SeasonState,
} from "@ff/contracts";
import type { League } from "../league/buildLeague.js";
import { assertValidStamp, seasonStart } from "../calendar/clock.js";
import { runSeason, type GameResolver } from "../season/runSeason.js";

export interface MakeSaveInput {
  league: League;
  /** Where the clock stands: `SeasonRun.calendar`. */
  calendar: CalendarStamp;
  /** The season so far (`SeasonRun.state`), or null before one starts. */
  season: SeasonState | null;
  /** What wrote the file, e.g. "calibration season". */
  createdBy: string;
  rules?: LeagueRules;
  /** What played the games (E1), e.g. `{ caller: "v5" }`. */
  playedWith?: { caller: string };
  /**
   * The players on the teams' rosters (ADR-079 team rosters). Absent, the save has none, and so
   * may its teams' rosters. Traits are a `Set`: write the file with a replacer that lists them.
   */
  players?: PlayerState[];
}

export function makeSave(input: MakeSaveInput): SaveFile {
  const { league, season } = input;
  const save: SaveFile = {
    formatVersion: SAVE_FORMAT_VERSION,
    createdBy: input.createdBy,
    registrySchemaVersion: ATTRIBUTE_REGISTRY_V1.schemaVersion,
    worldSeed: league.seed,
    calendar: input.calendar,
    leagueRules: input.rules ?? DEFAULT_LEAGUE_RULES,
    world: {
      teams: league.teams,
      players: input.players ?? [],
      staff: [],
      contracts: [],
      perceptions: [],
      league: league.structure,
      season,
      narrativeState: null,
      fashion: null,
    },
    history: { seasons: [], transactions: [] },
    ...(input.playedWith ? { playedWith: input.playedWith } : {}),
  };
  // A save that would not load is a bug here, not a surprise later.
  readSave(save);
  return save;
}

export interface LoadedSave {
  save: SaveFile;
  league: League;
  rules: LeagueRules;
}

/** Thrown for a file that is not a save this version can carry on from. The message says why. */
export class SaveError extends Error {
  override name = "SaveError";
}

const refuse = (why: string): never => { throw new SaveError(`This save can't be loaded: ${why}`); };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Read a save (a parsed object or the JSON text), check it, and return the league to carry on with. */
export function readSave(input: unknown): LoadedSave {
  let raw = input;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { refuse("it is not valid JSON"); }
  }
  if (!isObject(raw) || !isObject(raw.world) || !isObject(raw.calendar) || !isObject(raw.leagueRules)) {
    return refuse("it is not a save file");
  }
  const save = raw as unknown as SaveFile;

  if (save.formatVersion !== SAVE_FORMAT_VERSION) {
    refuse(save.formatVersion > SAVE_FORMAT_VERSION
      ? `it was made by a newer version of the game (format ${save.formatVersion}, this one reads ${SAVE_FORMAT_VERSION})`
      : `its format ${String(save.formatVersion)} is not one this version reads (${SAVE_FORMAT_VERSION})`);
  }
  if (typeof save.worldSeed !== "string" || save.worldSeed === "") refuse("it has no world seed");
  if (save.playedWith !== undefined && (!isObject(save.playedWith) || typeof save.playedWith.caller !== "string")) {
    refuse("its note of what played the games is damaged");
  }
  const w = save.world;
  for (const k of ["teams", "players", "staff", "contracts", "perceptions"] as const) {
    if (!Array.isArray(w[k])) refuse(`its ${k} list is missing`);
  }
  const current = ATTRIBUTE_REGISTRY_V1.schemaVersion;
  if (save.registrySchemaVersion > current) refuse(`its ratings list is version ${save.registrySchemaVersion}, newer than this game's ${current}`);
  if (save.registrySchemaVersion < current && w.players.length > 0) {
    refuse(`its ratings list is version ${save.registrySchemaVersion} and moving players' ratings to ${current} is not built yet`);
  }

  const rules = save.leagueRules;
  try { assertValidStamp(save.calendar, rules); } catch (e) { refuse(`its date is not a real league date (${(e as Error).message})`); }

  // The league: every team in exactly one division, every division in its conference.
  if (!isObject(w.league) || !Array.isArray(w.league.conferences) || !Array.isArray(w.league.divisions)) refuse("its league structure is missing");
  const teamIds = new Set(w.teams.map((t) => String(t.id)));
  if (teamIds.size !== w.teams.length) refuse("a team appears twice");
  if (w.teams.length !== rules.teamCount) refuse(`it has ${w.teams.length} teams but its rules say ${rules.teamCount}`);
  const placed = new Map<string, string>();
  for (const d of w.league.divisions) {
    const conf = w.league.conferences.find((c) => c.id === d.conference);
    if (!conf || !conf.divisions.includes(d.id)) refuse(`division ${String(d.id)} is not in its conference`);
    for (const t of d.teams) {
      if (!teamIds.has(String(t))) refuse(`division ${String(d.id)} lists a team that does not exist (${String(t)})`);
      if (placed.has(String(t))) refuse(`team ${String(t)} is in two divisions`);
      placed.set(String(t), String(d.id));
    }
  }
  if (placed.size !== teamIds.size) refuse("a team is in no division");

  // Rosters, when they exist: every listed player is in the save, on that team.
  const players = new Map(w.players.map((p) => [String(p.bio.id), p]));
  for (const t of w.teams) {
    for (const pid of t.roster) {
      const p = players.get(String(pid));
      if (!p) refuse(`${t.displayName}'s roster lists a player who is not in the save (${String(pid)})`);
      if (p!.teamId !== undefined && p!.teamId !== t.id) refuse(`${String(pid)} is on ${t.displayName}'s roster but belongs to ${String(p!.teamId)}`);
    }
  }

  const league: League = { seed: save.worldSeed, structure: w.league, teams: w.teams };

  if (w.season !== null) {
    const s = w.season;
    if (!isObject(s) || !Array.isArray(s.results) || !isObject(s.schedule)) refuse("its season is damaged");
    if (s.season !== save.calendar.season) refuse(`its season is ${s.season} but its date is in ${save.calendar.season}`);
    if (compareStamps(save.calendar, seasonStart(s.season)) < 0) refuse(`its date ${stampToString(save.calendar)} is before its season starts`);
    for (const r of s.results) {
      if (!r.seed.startsWith(`${save.worldSeed}/`)) refuse(`game ${String(r.gameId)} was played on another league's dice`);
    }
    // Replay the saved season up to the saved day without playing a single game.
    const noNewGames: GameResolver = (game) => refuse(`it is missing the result of ${String(game.gameId)}, played before its date`);
    let replay: SeasonState;
    try {
      replay = runSeason({ league, season: s.season, seed: save.worldSeed, rules, resolve: noNewGames, resumeFrom: s, stopAfter: save.calendar, through: "YEAR" }).state;
    } catch (e) {
      if (e instanceof SaveError) throw e;
      return refuse((e as Error).message.replace(/^runSeason: /, ""));
    }
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    if (!same(replay.results, s.results)) refuse("its results are out of order");
    if (!same(replay.standings, s.standings)) refuse("its standings don't match its results");
    if (!same(replay.bracket, s.bracket)) refuse("its playoff bracket doesn't match its results");
  }

  return { save, league, rules };
}
