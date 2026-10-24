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
 *
 * Coaches (thread "Saves keep coaching staff"): given the staff world, a save keeps every coach,
 * their contracts, each team's staff list and budget, and the staffs' views of each other (ADR-084).
 * `readSave` checks them and hands the world back, ready for the next carousel. The world's season
 * is not stored: it is the one after the last season on anyone's résumé (the carousel writes the
 * season just played onto résumés first), or the save's own season when no résumé has one.
 */
import {
  ATTRIBUTE_REGISTRY_V1, DEFAULT_LEAGUE_RULES, SAVE_FORMAT_VERSION, compareStamps, stampToString,
  type CalendarStamp, type DeadMoneyCharge, type LeagueRules, type PlayerContract, type PlayerState, type RelationshipView,
  type SaveFile, type SeasonState,
} from "@ff/contracts";
import type { StaffWorld } from "../staff/world.js";
import { checkViews } from "../relationships/ledger.js";
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
  /**
   * The league's coaches (ADR-080), and their views of each other when kept (ADR-084). Each team's
   * staff list and budget are taken from `world.teams`. Absent, the save has no coaches.
   */
  staff?: { world: StaffWorld; relationships?: readonly RelationshipView[] };
  /** ADR-086 C6: the draft (picks someone holds, classes not yet drafted, last year's free-agent moves). */
  draft?: NonNullable<SaveFile["world"]["draft"]>;
  /** ADR-085: player contracts, and dead money (K3). Absent, the book is empty. */
  contracts?: readonly PlayerContract[];
  deadMoney?: readonly DeadMoneyCharge[];
}

export function makeSave(input: MakeSaveInput): SaveFile {
  const { league, season, staff } = input;
  const staffTeams = new Map((staff?.world.teams ?? []).map((t) => [String(t.id), t]));
  const teams = staff === undefined ? league.teams : league.teams.map((t) => {
    const s = staffTeams.get(String(t.id));
    if (!s) throw new Error(`makeSave: the coaches have no team ${String(t.id)}`);
    return { ...t, staff: [...s.staff], staffBudget: { ...s.staffBudget } };
  });
  const save: SaveFile = {
    formatVersion: SAVE_FORMAT_VERSION,
    createdBy: input.createdBy,
    registrySchemaVersion: ATTRIBUTE_REGISTRY_V1.schemaVersion,
    worldSeed: league.seed,
    calendar: input.calendar,
    leagueRules: input.rules ?? DEFAULT_LEAGUE_RULES,
    world: {
      teams,
      players: input.players ?? [],
      staff: staff?.world.staff ?? [],
      ...(staff ? { staffContracts: staff.world.contracts } : {}),
      ...(staff?.relationships ? { relationships: [...staff.relationships] } : {}),
      ...(input.draft ? { draft: input.draft } : {}),
      contracts: [...(input.contracts ?? [])],
      ...(input.deadMoney ? { deadMoney: [...input.deadMoney] } : {}),
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
  /** The coaches, when the save has any: the world the carousel reads, and their views if kept. */
  staff?: { world: StaffWorld; relationships?: RelationshipView[] };
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

  // ADR-086: practice squads and the draft, when the save has them.
  for (const t of w.teams) {
    for (const pid of t.practiceSquad ?? []) {
      const p = players.get(String(pid));
      if (!p) refuse(`${t.displayName}'s practice squad lists a player who is not in the save (${String(pid)})`);
      if (p!.teamId !== t.id) refuse(`${String(pid)} is on ${t.displayName}'s practice squad but belongs to ${String(p!.teamId ?? "no team")}`);
      if (t.roster.some((r) => String(r) === String(pid))) refuse(`${String(pid)} is on ${t.displayName}'s roster and practice squad`);
    }
  }
  if (w.draft !== undefined) {
    if (!isObject(w.draft) || !Array.isArray(w.draft.picks) || !Array.isArray(w.draft.classes) || !Array.isArray(w.draft.freeAgentMoves)) refuse("its draft is damaged");
    for (const pk of w.draft!.picks) {
      if (!teamIds.has(String(pk.owner)) || !teamIds.has(String(pk.originalTeam))) refuse(`a ${pk.draft} round ${pk.round} pick names a team that does not exist`);
    }
    for (const c of w.draft!.classes) {
      for (const pid of c.prospects) {
        const p = players.get(String(pid));
        if (!p) refuse(`the ${c.draft} class lists a prospect who is not in the save (${String(pid)})`);
        if (p!.bio.draft !== "PROSPECT") refuse(`${String(pid)} is in the ${c.draft} class but is not a prospect`);
      }
    }
  }

  const league: League = { seed: save.worldSeed, structure: w.league, teams: w.teams };
  const staff = w.staff.length === 0 && w.staffContracts === undefined && w.relationships === undefined
    ? undefined : readStaff(save);

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

  return { save, league, rules, ...(staff ? { staff } : {}) };
}

/** The coaches: everyone once, every team's staff list theirs, every contract and view between real people. */
function readStaff(save: SaveFile): NonNullable<LoadedSave["staff"]> {
  const w = save.world;
  if (w.staff.length === 0) refuse("it has coaches' contracts or views but no coaches");
  if (!Array.isArray(w.staffContracts)) refuse("its coaches have no contracts list");
  if (w.relationships !== undefined && !Array.isArray(w.relationships)) refuse("its coaches' views are damaged");
  const people = new Map<string, (typeof w.staff)[number]>();
  for (const s of w.staff) {
    if (!isObject(s) || typeof s.id !== "string" || !Array.isArray(s.career)) refuse("a coach's record is damaged");
    if (people.has(String(s.id))) refuse(`coach ${String(s.id)} appears twice`);
    people.set(String(s.id), s);
  }
  const teamIds = new Set(w.teams.map((t) => String(t.id)));
  const listed = new Map<string, string>();
  for (const t of w.teams) {
    for (const id of t.staff) {
      const s = people.get(String(id));
      if (!s) refuse(`${t.displayName}'s staff lists a coach who is not in the save (${String(id)})`);
      if (listed.has(String(id))) refuse(`coach ${String(id)} is on two teams' staffs`);
      if (s!.teamId !== t.id) refuse(`coach ${String(id)} is on ${t.displayName}'s staff but his record says ${String(s!.teamId ?? "no team")}`);
      listed.set(String(id), String(t.id));
    }
  }
  for (const s of w.staff) {
    if (s.teamId !== undefined && listed.get(String(s.id)) !== String(s.teamId)) {
      refuse(`coach ${String(s.id)} says he works for ${String(s.teamId)}, whose staff list doesn't have him`);
    }
  }
  for (const c of w.staffContracts!) {
    if (!people.has(String(c.staff))) refuse(`a contract is for a coach who is not in the save (${String(c.staff)})`);
    if (!teamIds.has(String(c.team))) refuse(`coach ${String(c.staff)}'s contract is with a team that does not exist (${String(c.team)})`);
  }

  // The season the staffs are set for: the one after the last season on any résumé.
  let last = -Infinity;
  for (const s of w.staff) for (const j of s.career) for (const x of j.seasons) last = Math.max(last, x.season);
  const season = last === -Infinity ? save.calendar.season : last + 1;
  if (season !== save.calendar.season && season !== save.calendar.season + 1) {
    refuse(`its coaches are set for ${season}, but its date is in ${save.calendar.season}`);
  }
  const world: StaffWorld = { season, teams: w.teams, staff: w.staff, contracts: w.staffContracts! };
  if (w.relationships === undefined) return { world };
  try { checkViews(w.relationships, world); } catch (e) { refuse(`its coaches' views don't match their staffs (${(e as Error).message.replace(/^relationships: /, "")})`); }
  return { world, relationships: w.relationships };
}
