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
 *
 * The practice squads (the file's `provenance.practiceSquad`) go on the teams only with a switch on
 * (ADR-087 §11): a team short of a player calls one up before it signs from the street. Switched off,
 * no team has one and nobody is signed, so the league is what it was.
 */
import type { PlayerId, PlayerState, RatedLeague, Team } from "@ff/contracts";
import type { League } from "@ff/franchise";
import { makeProvenancedLeague, type ProvenancedLeague } from "../league/provenance.js";

export type StandInLeague = ProvenancedLeague<"REAL_STAND_IN">;

export const STANDIN_FILE_FORMAT = "ff-standin-league/1";

/**
 * The starting-development records `forSwitches` knows how to leave out (the file's
 * `startingDevelopment.version`, attributes' `STARTING_DEVELOPMENT_VERSION`, copied, since
 * calibration may not import it). A file with any other version is refused: records this loader does
 * not know would reach a switched-off run.
 */
export const KNOWN_STARTING_DEVELOPMENT = ["standin-development/1"] as const;

interface StandInFile {
  readonly format: string;
  readonly season: number;
  readonly snapshotDate: string;
  readonly league: RatedLeague;
  /** How the players' starting development was made (ADR-087 §2.5); absent in a file from before it. */
  readonly startingDevelopment?: { readonly version: string };
}

/** The players' switches (ADR-087 §9), as the season runner takes them. */
export interface StandInSwitches {
  readonly development?: boolean;
  readonly injuries?: boolean;
}

/** Parse a league file: traits come back from JSON as lists and go back into Sets. */
export function readStandInFile(text: string): StandInFile {
  const file = JSON.parse(text) as StandInFile;
  if (file.format !== STANDIN_FILE_FORMAT) throw new Error(`not a stand-in league file (format "${String(file.format)}", expected "${STANDIN_FILE_FORMAT}")`);
  const version = file.startingDevelopment?.version;
  if (version !== undefined && !(KNOWN_STARTING_DEVELOPMENT as readonly string[]).includes(version)) {
    throw new Error(`the stand-in league file's starting development is "${version}": forSwitches does not know these records ` +
      `(it knows ${KNOWN_STARTING_DEVELOPMENT.join(", ")}); teach it what they add before playing this file`);
  }
  const players: PlayerState[] = file.league.players.map((p) => ({
    ...p,
    attributes: { ...p.attributes, traits: new Set<string>(p.attributes.traits as unknown as string[]) },
  }));
  return { ...file, league: { ...file.league, players } };
}

/** A player as a run with these switches sees him: what a switched-off step would read, left out. */
export function forSwitches(p: PlayerState, switches: StandInSwitches | undefined): PlayerState {
  let out = p;
  if (switches?.development !== true) {
    const { development: _d, ...attributes } = out.attributes;
    const { patience: _p, ...personality } = out.personality;
    const { combine: _c, ...bio } = out.bio;
    out = { ...out, bio, attributes, personality };
  }
  if (switches?.injuries !== true) {
    const { injury: _i, ...condition } = out.condition;
    out = { ...out, condition };
  }
  return out;
}

const finite = (x: unknown): boolean => typeof x === "number" && Number.isFinite(x);

/** Throws unless every player can grow: a finite growth rate and career snaps, and all four body numbers. */
function assertGrowthRecords(players: readonly PlayerState[]): void {
  const missing = players.filter((p) => {
    const d = p.attributes.development;
    return d === undefined || !finite(d.growth) || !finite(d.snaps) || d.body === undefined
      || !finite(d.body.forty) || !finite(d.body.cone) || !finite(d.body.vertical) || !finite(d.body.bench);
  });
  if (missing.length > 0) {
    throw new Error(`the stand-in league file's players have no growth records (${missing.length} of ${players.length}, first ${String(missing[0]!.bio.id)}); ` +
      "no growth records; run standin-development (pnpm --filter @ff/attributes standin-development)");
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
  if (switches?.development === true) assertGrowthRecords(players);
  const rated = makeProvenancedLeague(
    "REAL_STAND_IN",
    `standin-${file.snapshotDate}`,
    `${teams.length} teams of stand-ins for the real NFL players as of ${file.snapshotDate} (ADR-088): ` +
      `real teams, ages, sizes, depth charts; made-up names; first-version ratings.`,
    { ...file.league, teams, players },
  );
  return { league: { ...base, teams }, rated };
}
