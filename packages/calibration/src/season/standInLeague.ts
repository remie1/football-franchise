/**
 * THE STAND-IN LEAGUE FOR THE SEASON (ADR-088 R5): the real NFL's players with made-up names,
 * read from the league file `@ff/attributes`' real importer writes
 * (`pnpm --filter @ff/attributes import-real`).
 *
 * A FILE, not an import: calibration's permitted surface in attributes stays
 * `generateLeagueRosters` alone (ADR-079 R1), so no Charter rule changes. The file carries a
 * `RatedLeague` whose teams use the franchise league's ids (`T01`..`T32`, real divisions in
 * `buildLeague` order); each franchise team takes its stand-in's name, roster and depth chart.
 *
 * The players' starting development (ADR-087 §2.5; `pnpm --filter @ff/attributes standin-development`)
 * is in the file too, and is read only with the switch that uses it: with `development` off, each
 * player's growth record, patience and combine record are left out, and with `injuries` off, his
 * copied injury, so a switched-off run (and an `--injuries`-only run's development) is exactly what
 * it was before the records existed. With `development` on, every player must have a growth record.
 * His fade shifts (ADR-087 §12.2.3, P7, from `standin-development/2`) are read only with development
 * on and `aging: "ability"` (§12.1), and then every growth record must hold all 12; at the default
 * `aging` they are left out too, so a growth-on run is what it was before the file had them.
 *
 * The practice squads (the file's `provenance.practiceSquad`) go on the teams only with a switch on
 * (ADR-087 §11): a team short of a player calls one up before it signs from the street. Switched off,
 * no team has one and nobody is signed, so the league is what it was.
 *
 * The league's officials (ADR-093 step 1b, §16 A11): the file's `officiating` block holds the
 * stand-in league's 17 crews, copies of the real NFL crews under made-up referee names, written by
 * attributes' `standin-officials` command. It is checked when the file is read, for every command
 * that reads the file, so a damaged block stops cap-check, draft-check, player-checks and
 * career-check too, as an unknown development record does: a version this loader knows, the file's
 * own season, a league's crews by franchise's rule (copied here as `standInCrewsProblem`, since
 * calibration may not import it), and each family's 17 leans averaging 50. Each crew is kept as
 * `{ id, referee, leans }`, so nothing else from the file rides into a season. Only a season that
 * asks for crews plays them (`officiatingFor`); the rated league never sees them.
 */
import {
  ABILITY_GROUPS, officiatingCrewId, type CrewLeanFamily, type OfficiatingCrew, type PlayerId, type PlayerState, type RatedLeague, type Team,
} from "@ff/contracts";
import type { League } from "@ff/franchise";
import { makeProvenancedLeague, type ProvenancedLeague } from "../league/provenance.js";

export type StandInLeague = ProvenancedLeague<"REAL_STAND_IN">;

export const STANDIN_FILE_FORMAT = "ff-standin-league/1";

/**
 * The starting-development records `forSwitches` knows how to leave out (the file's
 * `startingDevelopment.version`, attributes' `STARTING_DEVELOPMENT_VERSION`, copied, since
 * calibration may not import it). A file with any other version is refused: records this loader does
 * not know would reach a switched-off run. `/2` (ADR-087 AB2) adds each player's `fadeShift` to his
 * growth record, which `forSwitches` leaves out unless development is on with `aging: "ability"`.
 */
export const KNOWN_STARTING_DEVELOPMENT = ["standin-development/1", "standin-development/2"] as const;

/**
 * The officials blocks this loader knows (the file's `officiating.version`, attributes'
 * `STANDIN_OFFICIALS_VERSION`, copied, since calibration may not import it). A block of any other
 * version is refused: crews this loader does not know could lean on another scale, and a season
 * would play them with no error.
 */
export const KNOWN_STANDIN_OFFICIALS = ["standin-officials/1"] as const;

/**
 * ADR-093 step 1b (§16 A11): the league file's `officiating` block, the stand-in league's 17 crews,
 * copies of the real NFL crews under made-up referee names (attributes' `standin-officials`
 * command). Calibration reads the version, the season and the crews; the importer's own record of
 * how the leans were made passes through unread.
 */
export interface StandInOfficiating {
  readonly version: (typeof KNOWN_STANDIN_OFFICIALS)[number];
  /** The season the crews stand in: the league file's own. */
  readonly season: number;
  /** Exactly 17, each `{ id, referee, leans }`, the leans in the families' order. */
  readonly crews: readonly OfficiatingCrew[];
  /** The importer's record (the data's date, how the leans were made, the games behind each copy), unread here. */
  readonly [key: string]: unknown;
}

interface StandInFile {
  readonly format: string;
  readonly season: number;
  readonly snapshotDate: string;
  readonly league: RatedLeague;
  /** The league's crews, copies of the real ones (ADR-093 step 1b); absent in a file from before them. */
  readonly officiating?: StandInOfficiating;
  /** How the players' starting development was made (ADR-087 §2.5); absent in a file from before it. */
  readonly startingDevelopment?: { readonly version: string };
}

/** The players' switches (ADR-087 §9), as the season runner takes them. */
export interface StandInSwitches {
  readonly development?: boolean;
  readonly injuries?: boolean;
  /**
   * ADR-087 §12.1: how the players age, `"position"` (absent: the default) or `"ability"`. Acts only
   * with `development` on: then `"ability"` keeps each player's fade shifts and needs all 12 on
   * every growth record. AB2 reads it here alone; the season's own steps take it at AB3.
   */
  readonly aging?: "position" | "ability";
}

/**
 * Parse a league file: traits come back from JSON as lists and go back into Sets, and the officials
 * block, when there is one, is checked and each crew kept as `{ id, referee, leans }`.
 */
export function readStandInFile(text: string): StandInFile {
  const file = JSON.parse(text) as StandInFile;
  if (file.format !== STANDIN_FILE_FORMAT) throw new Error(`not a stand-in league file (format "${String(file.format)}", expected "${STANDIN_FILE_FORMAT}")`);
  const version = file.startingDevelopment?.version;
  if (version !== undefined && !(KNOWN_STARTING_DEVELOPMENT as readonly string[]).includes(version)) {
    throw new Error(`the stand-in league file's starting development is "${version}": forSwitches does not know these records ` +
      `(it knows ${KNOWN_STARTING_DEVELOPMENT.join(", ")}); teach it what they add before playing this file`);
  }
  const officiating = file.officiating === undefined ? undefined : readOfficials(file.officiating, file.season);
  const players: PlayerState[] = file.league.players.map((p) => ({
    ...p,
    attributes: { ...p.attributes, traits: new Set<string>(p.attributes.traits as unknown as string[]) },
  }));
  return { ...file, ...(officiating === undefined ? {} : { officiating }), league: { ...file.league, players } };
}

/**
 * The NFL's 17 crews, one to a referee (REAL, ADR-093 §6.1; Q3 rules the league's 17), as franchise's
 * crews rule counts them.
 */
const CREW_COUNT = 17;

/** The five families a crew leans on, in the contract's order; a sixth family in contracts fails this compile. */
const FAMILIES: Record<CrewLeanFamily, true> = { LINE_HOLDING: true, COVERAGE: true, PLAYER_SAFETY: true, TECHNICAL: true, SNAP: true };
const CREW_FAMILIES = Object.keys(FAMILIES) as CrewLeanFamily[];

/**
 * How far a family's mean lean may sit from 50: the importer re-centers each family on 50 and rounds
 * to whole points, which moves the mean by at most 0.5 (ADR-093 §16 A4's settle).
 */
const MEAN_TOLERANCE = 0.5;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const shown = (v: unknown): string => (typeof v === "string" ? JSON.stringify(v) : String(v));

/**
 * Why a list cannot be a league's crews, or undefined: franchise's rule for a season's crews and a
 * save's, copied, since calibration may not import it (ADR-078 R1). Exactly 17 objects, each with a
 * non-empty id and a non-empty referee, both unique, and leans on exactly the five families, each a
 * whole number from 0 to 100. Franchise checks the crews again at the season's start, so a drift
 * between the two copies could change only which message a bad block gets, never let one play;
 * `standInOfficials.test.ts` runs each broken list through `runSeason` too.
 */
export function standInCrewsProblem(crews: unknown): string | undefined {
  if (!Array.isArray(crews)) return "the crews are not a list";
  if (crews.length !== CREW_COUNT) return `there are ${crews.length} crews, not ${CREW_COUNT}`;
  const ids = new Set<string>();
  const referees = new Set<string>();
  for (const [i, c] of (crews as unknown[]).entries()) {
    if (!isObject(c)) return `crew ${i + 1} on the list is not a crew`;
    if (typeof c.id !== "string" || c.id === "") return `crew ${i + 1} on the list has no id`;
    if (ids.has(c.id)) return `crew ${c.id} appears twice`;
    ids.add(c.id);
    if (typeof c.referee !== "string" || c.referee === "") return `crew ${c.id} has no referee`;
    if (referees.has(c.referee)) return `two crews have the referee ${c.referee}`;
    referees.add(c.referee);
    const leans = c.leans;
    if (!isObject(leans)) return `crew ${c.id} has no leans`;
    for (const f of CREW_FAMILIES) {
      if (!Object.hasOwn(leans, f)) return `crew ${c.id} has no ${f} lean`;
      const v = leans[f];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 100) {
        return `crew ${c.id}'s ${f} lean is not a whole number from 0 to 100 (${shown(v)})`;
      }
    }
    const extra = Object.keys(leans).filter((k) => !Object.hasOwn(FAMILIES, k));
    if (extra.length > 0) return `crew ${c.id} leans on ${extra.join(", ")}, not one of the five families`;
  }
  return undefined;
}

const officialsError = (why: string): Error => new Error(`the stand-in league file's officials ${why}`);

/**
 * The file's officials block, checked (ADR-093 step 1b): an object with a list of crews, a version
 * this loader knows, the file's own season, a league's crews (`standInCrewsProblem`), and each
 * family's 17 leans averaging 50 within 0.5. The last is the reader's own rule: franchise plays
 * crews as they stand, so copies off 50 would move the league's own rate of those calls with no
 * error. Each crew comes back as `{ id, referee, leans }`, the leans in the families' order; the
 * block's other keys pass through as they are.
 */
function readOfficials(block: unknown, season: number): StandInOfficiating {
  if (!isObject(block) || !Array.isArray(block.crews)) throw officialsError("are damaged: the block must be an object with a list of crews");
  const version = block.version;
  if (typeof version !== "string" || !(KNOWN_STANDIN_OFFICIALS as readonly string[]).includes(version)) {
    throw officialsError(`are ${shown(version)}: this loader does not know these crews ` +
      `(it knows ${KNOWN_STANDIN_OFFICIALS.join(", ")}); teach it what they hold before playing this file`);
  }
  if (typeof block.season !== "number" || !Number.isInteger(block.season) || block.season !== season) {
    throw officialsError(`stand in ${shown(block.season)}, not the file's season ${season}; re-run attributes' standin-officials command on this file`);
  }
  const problem = standInCrewsProblem(block.crews);
  if (problem !== undefined) throw officialsError(`are not a league's crews (${problem})`);
  const crews = block.crews as readonly OfficiatingCrew[];
  for (const f of CREW_FAMILIES) {
    const mean = crews.reduce((sum, c) => sum + c.leans[f], 0) / crews.length;
    if (Math.abs(mean - 50) > MEAN_TOLERANCE) {
      throw officialsError(`average ${mean.toFixed(2)} on ${f}, not 50 (within ${MEAN_TOLERANCE}), so they would move the league's own rate ` +
        "of those calls; re-run attributes' standin-officials command on this file");
    }
  }
  return {
    ...block,
    version: version as StandInOfficiating["version"],
    season,
    crews: crews.map((c) => ({
      id: officiatingCrewId(c.id),
      referee: c.referee,
      leans: { LINE_HOLDING: c.leans.LINE_HOLDING, COVERAGE: c.leans.COVERAGE, PLAYER_SAFETY: c.leans.PLAYER_SAFETY, TECHNICAL: c.leans.TECHNICAL, SNAP: c.leans.SNAP },
    })),
  };
}

/**
 * A player as a run with these switches sees him: what a switched-off step would read, left out.
 * Development off takes off his whole growth record (his fade shifts with it); development on at the
 * default `aging` takes off only his fade shifts, which nothing but the ability path reads.
 */
export function forSwitches(p: PlayerState, switches: StandInSwitches | undefined): PlayerState {
  let out = p;
  if (switches?.development !== true) {
    const { development: _d, ...attributes } = out.attributes;
    const { patience: _p, ...personality } = out.personality;
    const { combine: _c, ...bio } = out.bio;
    out = { ...out, bio, attributes, personality };
  } else if (switches.aging !== "ability" && out.attributes.development?.fadeShift !== undefined) {
    const { fadeShift: _f, ...development } = out.attributes.development;
    out = { ...out, attributes: { ...out.attributes, development } };
  }
  if (switches?.injuries !== true) {
    const { injury: _i, ...condition } = out.condition;
    out = { ...out, condition };
  }
  return out;
}

const finite = (x: unknown): boolean => typeof x === "number" && Number.isFinite(x);

/**
 * Throws unless every player can grow: a finite growth rate and career snaps, and all four body
 * numbers; with `aging: "ability"`, a finite fade shift for each of the 12 ability groups too
 * (ADR-087 §12.2.3; a file before `standin-development/2` has none).
 */
function assertGrowthRecords(players: readonly PlayerState[], aging: StandInSwitches["aging"]): void {
  const missing = players.filter((p) => {
    const d = p.attributes.development;
    return d === undefined || !finite(d.growth) || !finite(d.snaps) || d.body === undefined
      || !finite(d.body.forty) || !finite(d.body.cone) || !finite(d.body.vertical) || !finite(d.body.bench);
  });
  if (missing.length > 0) {
    throw new Error(`the stand-in league file's players have no growth records (${missing.length} of ${players.length}, first ${String(missing[0]!.bio.id)}); ` +
      "no growth records; run standin-development (pnpm --filter @ff/attributes standin-development)");
  }
  if (aging !== "ability") return;
  const unshifted = players.filter((p) => {
    const shift = p.attributes.development!.fadeShift;
    return shift === undefined || ABILITY_GROUPS.some((g) => !finite(shift[g]));
  });
  if (unshifted.length > 0) {
    throw new Error(`the stand-in league file's players have no fade shifts for every ability group (${unshifted.length} of ${players.length}, ` +
      `first ${String(unshifted[0]!.bio.id)}); aging "ability" needs all 12; run standin-development (pnpm --filter @ff/attributes standin-development)`);
  }
}

/**
 * The season a stand-in run plays (ADR-087 §2.5). With either switch on, the file's own season: its
 * ages, credited seasons and copied injuries are that season's, and a single season has no year turn
 * to move them on, so a later season would play them stale; a different season asked for by name is
 * refused. With both off, `asked` or `fallback` (today's default), exactly as before.
 */
export function standInSeason(file: Pick<StandInFile, "season">, switches: StandInSwitches | undefined, asked: number | undefined, fallback: number): number {
  const switched = switches?.development === true || switches?.injuries === true;
  if (!switched) return asked ?? fallback;
  if (asked !== undefined && asked !== file.season) {
    throw new Error(`the stand-in league is the ${file.season} season's: with --development or --injuries it plays ${file.season}, not ${asked}; drop --season`);
  }
  return file.season;
}

/**
 * Each team's practice squad in the league file, in the file's order: `provenance.practiceSquad`
 * when it is kept by team, else the players whose `provenance.status` is "practice", in the players'
 * order. Every one must be a player in the file, on that team, not on its roster, on one squad
 * once, and (when the file gives statuses) of status "practice", the group player-checks counts
 * him in.
 */
export function standInPracticeSquads(file: Pick<StandInFile, "league">): Map<string, PlayerId[]> {
  const prov = file.league.provenance as { practiceSquad?: unknown; status?: Record<string, string> } | null | undefined;
  const players = new Map(file.league.players.map((p) => [String(p.bio.id), p]));
  const squads = new Map<string, PlayerId[]>(file.league.teams.map((t) => [String(t.id), []]));
  const status = prov?.status;
  const kept = prov?.practiceSquad;
  if (kept !== null && typeof kept === "object" && !Array.isArray(kept)) {
    for (const [team, ids] of Object.entries(kept as Record<string, unknown>)) {
      if (!squads.has(team)) throw new Error(`the stand-in league file's practice squads name a team it does not have (${team})`);
      if (!Array.isArray(ids)) throw new Error(`the stand-in league file's ${team} practice squad is not a list of players`);
      squads.set(team, ids.map((id) => String(id) as PlayerId));
    }
  } else {
    for (const p of file.league.players) {
      if (status?.[String(p.bio.id)] !== "practice") continue;
      const squad = p.teamId === undefined ? undefined : squads.get(String(p.teamId));
      if (squad === undefined) throw new Error(`the stand-in league file has ${String(p.bio.id)} on a practice squad of ${String(p.teamId ?? "no team")}, a team it does not have`);
      squad.push(p.bio.id);
    }
  }
  const seen = new Set<string>();
  for (const t of file.league.teams) {
    const roster = new Set(t.roster.map(String));
    for (const id of squads.get(String(t.id))!) {
      const p = players.get(String(id));
      const why = p === undefined ? "not in the file"
        : seen.has(String(id)) ? "on a practice squad already"
        : roster.has(String(id)) ? "on its roster"
        : p.teamId !== t.id ? `on ${String(p.teamId ?? "no team")}`
        : status !== undefined && status[String(id)] !== "practice" ? `of status "${String(status[String(id)] ?? "none")}", not "practice"`
        : undefined;
      if (why !== undefined) throw new Error(`the stand-in league file's ${String(t.id)} practice squad lists ${String(id)}, who is ${why}`);
      seen.add(String(id));
    }
  }
  return squads;
}

/**
 * The franchise league with each team's stand-in identity and squad, and the rated league that plays.
 * With either player switch on, each team also carries its practice squad from the file
 * (`standInPracticeSquads`), whom franchise's emergency signings call up before the street; with
 * both off, no team has one, as before.
 */
export function buildStandInLeague(base: League, file: StandInFile, switches?: StandInSwitches): { league: League; rated: StandInLeague } {
  const byId = new Map(file.league.teams.map((t) => [String(t.id), t]));
  const switched = switches?.development === true || switches?.injuries === true;
  const squads = switched ? standInPracticeSquads(file) : undefined;
  const teams: Team[] = base.teams.map((t) => {
    const s = byId.get(String(t.id));
    if (s === undefined) throw new Error(`stand-in league file has no team ${String(t.id)}`);
    const practiceSquad = squads?.get(String(t.id));
    return { ...t, displayName: s.displayName, city: s.city, roster: s.roster, depthChart: s.depthChart, ...(practiceSquad ? { practiceSquad } : {}) };
  });
  const players = file.league.players.map((p) => forSwitches(p, switches));
  if (switches?.development === true) assertGrowthRecords(players, switches.aging);
  const rated = makeProvenancedLeague(
    "REAL_STAND_IN",
    `standin-${file.snapshotDate}`,
    `${teams.length} teams of stand-ins for the real NFL players as of ${file.snapshotDate} (ADR-088): ` +
      `real teams, ages, sizes, depth charts; made-up names; first-version ratings.`,
    { ...file.league, teams, players },
  );
  return { league: { ...base, teams }, rated };
}
