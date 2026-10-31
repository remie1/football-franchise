/**
 * THE STAND-INS' STARTING DEVELOPMENT, STEP 1 (ADR-087 §2.5; §11 "Stand-in records, step 1").
 *
 * What the league file gives each stand-in so `--development` can run on him (P1, P2, P6) and so
 * `--injuries` starts him hurt where he is hurt today (P3). Read from the league file alone: no raw
 * data, no name table, so a refresh of an existing file needs nothing but the file
 * (`standin-development`), and `import-real` calls the same step (`league.ts`).
 *
 *   - `attributes.development.body` (P1, hidden): the four drills he was RATED from, his measured
 *     drill, else his position's average, else the fallback (`rate.ts` `fillMeasurements`, the one
 *     fill), so his 40 and his speed agree exactly. Not aged forward from when he tested (the
 *     Orchestrator's step 1 ruling). Aging, when it comes, goes in that one fill, before both the
 *     ratings (`rateStandIns`) and this body read it, so they keep agreeing (§2.3: "his ratings and
 *     his 40 always agree"); never here alone, which would move his body and not his ratings. It
 *     moves ratings, so it comes with a re-rate (`import-real`): this step alone never re-rates.
 *   - `attributes.development.growth` (P1, hidden): drawn, `drawGrowth` (the made-up league's own
 *     lognormal), on his own stream. Step 2 replaces the draw with an estimate from his playing time.
 *   - `attributes.development.snaps`: his career snaps, offence + defence + special teams from
 *     `provenance.history` (franchise adds the same sum each week). They include this season's games
 *     played by the snapshot (`snapsThrough`), which the run then plays again; nothing reads the
 *     total yet.
 *   - `attributes.development.carry`: `{}`, nothing earned and unshown yet.
 *   - `bio.combine` (P2, public): only the drills he actually ran; absent when he ran none.
 *   - `personality.patience` (P6, hidden): drawn, `drawPatience`, on his own stream.
 *   - `condition.injury` (P3, public), copied (§2.5 "current injuries"): a player on injured reserve
 *     (R01), designated to return (R48), PUP (R04) or the non-football list (R05), and an active
 *     player listed Out or Doubtful on his team's latest injury report. Questionable players are
 *     left out (they would play, hurt, and the report gives no penalty to copy), and so are R40/R49
 *     (other lists, not injuries) and the practice squad. Weeks out are drawn from `INJURY_WEEKS`,
 *     CHOSEN placeholders until step 2 measures them.
 *   - `durability`: unchanged (step 2 sets it from his injury history).
 *
 * Every draw comes from `createRng(SEED_LABEL, DEVELOPMENT_STREAM).fork(<stand-in id>)`, split into
 * "growth", "patience" and "injury": no season in the seed, since growth is fixed for life and a
 * stand-in keeps his id from refresh to refresh; and one player's draws never move another's. The
 * ratings' stream (`attributes:real:rate/<id>`) is separate, so no rating moves.
 *
 * Pure: the league in, new players out, in the same order; it first takes off any records an
 * earlier run left, so running it on its own output changes nothing. This step owns the four paths
 * it writes (`attributes.development`, `bio.combine`, `personality.patience`, `condition.injury`)
 * outright: `stripStartingDevelopment` takes them off whatever wrote them, so nothing else in the
 * importer may write them (today nothing does).
 */
import {
  createRng,
  type CalendarStamp, type Injury, type InjuryBand, type InjurySetting, type PlayerBio, type PlayerDevelopment,
  type PlayerState,
} from "@ff/contracts";
import type { Measurements } from "../../fictional/derive.js";
import { bodyFrom, drawGrowth, drawPatience, GROWTH, PATIENCE_SEASONS } from "../../fictional/development.js";
import type { CareerHistory } from "./history.js";
import { fillMeasurements } from "./rate.js";
import type { RosterStatus } from "./standins.js";

/** The records' own version: a change to what this step writes bumps it. */
export const STARTING_DEVELOPMENT_VERSION = "standin-development/1";

/** The seed every stand-in's development draws start from. No season in it: growth is fixed for life (P1). */
export const SEED_LABEL = "standin";
export const DEVELOPMENT_STREAM = "attributes:real:development";

/** Reserve lists copied as injuries (nflverse detailed codes, `history.ts` `RESERVE_TYPE`). */
export const COPIED_RESERVE = ["R01", "R48", "R04", "R05"] as const;
/** Game statuses on the latest injury report copied as injuries, for active players. */
export const COPIED_REPORT = ["Out", "Doubtful"] as const;
export type InjurySource = (typeof COPIED_RESERVE)[number] | (typeof COPIED_REPORT)[number];

/**
 * Weeks a copied injury still costs him, by where it was copied from: drawn flat, min to max.
 * CHOSEN placeholders, provenance NONE (step 2 measures how long players on each list stayed there).
 * Injured reserve 11-15 (most of a season); designated to return 1-4 (already practising); PUP and
 * the non-football list 1-8; listed Out or Doubtful 1-3.
 */
export const INJURY_WEEKS: Readonly<Record<InjurySource, { readonly min: number; readonly max: number }>> = {
  R01: { min: 11, max: 15 },
  R48: { min: 1, max: 4 },
  R04: { min: 1, max: 8 },
  R05: { min: 1, max: 8 },
  Out: { min: 1, max: 3 },
  Doubtful: { min: 1, max: 3 },
};

/** Contracts P3's bands, by weeks lost: 0 day to day, 1-3 short, 4-8 long, 9 or more major. */
export const BAND_MIN_WEEKS: Readonly<Record<Exclude<InjuryBand, "DAY_TO_DAY">, number>> = { SHORT: 1, LONG: 4, MAJOR: 9 };

export function bandOf(weeks: number): InjuryBand {
  if (weeks >= BAND_MIN_WEEKS.MAJOR) return "MAJOR";
  if (weeks >= BAND_MIN_WEEKS.LONG) return "LONG";
  if (weeks >= BAND_MIN_WEEKS.SHORT) return "SHORT";
  return "DAY_TO_DAY";
}

/**
 * When a copied injury began, as a run of `season` sees it: the first day of the previous league
 * year's summer. Any day before the run's first week works the same, and this one is a real day
 * whatever the offseason's lengths (they are franchise's). Franchise's healing counts an injury down
 * at every week's end except the week it is stamped in (`injuries.ts` `healWeek`), so with this
 * stamp a w-week injury is counted down from the run's first week and keeps him out of exactly the
 * run's first w weeks (calibration's `standInDevelopment.test.ts` proves it on the file).
 */
export function copiedSince(season: number): CalendarStamp {
  return { season: season - 1, phase: "OFF_SUMMER", week: 1, day: 1 };
}

/** Every constant the records were made with, recorded in the file so a retune shows it is stale. */
export function startingConstants() {
  return { growth: GROWTH, patience: PATIENCE_SEASONS, injuryWeeks: INJURY_WEEKS, bandMinWeeks: BAND_MIN_WEEKS };
}

export interface PlayerFlags {
  /** How his growth rate was set: step 1 draws every one. */
  readonly growth: "draw";
  /** Where a copied injury came from: the reserve code or report status, and the report week of its body part. */
  readonly injury?: { readonly source: InjurySource; readonly reportWeek?: number };
}

/** The league file's `startingDevelopment` key: how the records were made, and the guesses flagged (ADR-088 Q5). */
export interface StartingDevelopment {
  readonly version: string;
  readonly seedLabel: string;
  readonly stream: string;
  /** The snapshot the records come from. */
  readonly asOf: string;
  /**
   * Career snaps run to the snapshot (`asOf`): every game of `season` played by then, up to
   * `mostGames` a team (the most any team had played; most had played fewer).
   */
  readonly snapsThrough: { readonly season: number; readonly mostGames: number };
  readonly basis: Readonly<Record<"body" | "growth" | "snaps" | "patience" | "injury" | "durability", string>>;
  readonly constants: ReturnType<typeof startingConstants>;
  /**
   * Teams whose latest injury report (the latest week any of its players is listed) has no game
   * status on it, only practice listings: nobody of theirs can be copied as Out or Doubtful.
   */
  readonly teamsWithoutGameStatus: readonly { readonly team: string; readonly reportWeek: number | null }[];
  readonly players: Readonly<Record<string, PlayerFlags>>;
}

export interface StandInDevelopmentInput {
  /** The season the league is copied in (the file's `season`). */
  readonly season: number;
  /** The snapshot's date (the file's `snapshotDate`). */
  readonly snapshotDate: string;
  readonly players: readonly PlayerState[];
  /** `provenance.status`, `provenance.measurements` and `provenance.history` of the league file. */
  readonly status: Readonly<Record<string, RosterStatus>>;
  readonly measurements: Readonly<Record<string, Partial<Measurements>>>;
  readonly history: Readonly<Record<string, CareerHistory>>;
}

/** The player without anything this step adds: what an earlier run left, taken off. */
export function stripStartingDevelopment(p: PlayerState): PlayerState {
  const { development: _d, ...attributes } = p.attributes;
  const { patience: _p, ...personality } = p.personality;
  const { combine: _c, ...bio } = p.bio;
  const { injury: _i, ...condition } = p.condition;
  return { ...p, bio, attributes, condition, personality };
}

/** His public combine record (P2): the drills he ran, none filled in; undefined when he ran none. */
function combineOf(ran: Partial<Measurements> | undefined): PlayerBio["combine"] {
  const out: NonNullable<PlayerBio["combine"]> = {};
  if (ran?.forty !== undefined) out.forty = ran.forty;
  if (ran?.cone !== undefined) out.cone = ran.cone;
  if (ran?.vertical !== undefined) out.vertical = ran.vertical;
  if (ran?.bench !== undefined) out.bench = ran.bench;
  return Object.keys(out).length > 0 ? out : undefined;
}

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Which copied injury he starts with, if any. */
function sourceOf(
  id: string, team: string | undefined, status: RosterStatus | undefined, h: CareerHistory | undefined,
  reportWeek: ReadonlyMap<string, number>,
): InjurySource | undefined {
  if (status === "reserve") {
    const code = h?.reserve?.code;
    return (COPIED_RESERVE as readonly string[]).includes(code ?? "") ? (code as InjurySource) : undefined;
  }
  if (status !== "active" || h?.injury === undefined || team === undefined) return undefined;
  if (h.injury.week !== reportWeek.get(team)) return undefined;
  const listed = h.injury.status;
  return listed !== null && (COPIED_REPORT as readonly string[]).includes(listed) ? (listed as InjurySource) : undefined;
}

/** The stand-ins with their records, and the file's `startingDevelopment` key. */
export function standInDevelopment(input: StandInDevelopmentInput): { players: PlayerState[]; startingDevelopment: StartingDevelopment } {
  const players = input.players.map(stripStartingDevelopment);
  const rated = fillMeasurements(players, input.measurements);

  // Each team's latest injury report: the latest week any of its players is listed, and whether
  // anyone on it has a game status.
  const reportWeek = new Map<string, number>();
  for (const p of players) {
    const listed = input.history[String(p.bio.id)]?.injury;
    if (listed === undefined || p.teamId === undefined) continue;
    const team = String(p.teamId);
    reportWeek.set(team, Math.max(reportWeek.get(team) ?? 0, listed.week));
  }
  const withStatus = new Set<string>();
  for (const p of players) {
    const listed = input.history[String(p.bio.id)]?.injury;
    if (listed === undefined || p.teamId === undefined) continue;
    if (listed.week === reportWeek.get(String(p.teamId)) && listed.status !== null) withStatus.add(String(p.teamId));
  }
  const teams = [...new Set(players.flatMap((p) => (p.teamId === undefined ? [] : [String(p.teamId)])))].sort();

  const since = copiedSince(input.season);
  const flags: Record<string, PlayerFlags> = {};
  let mostGames = 0;
  const out = players.map((p): PlayerState => {
    const id = String(p.bio.id);
    const h = input.history[id];
    if (h === undefined) throw new Error(`standInDevelopment: stand-in ${id} has no career history`);
    const rng = createRng(SEED_LABEL, DEVELOPMENT_STREAM).fork(id);
    const development: PlayerDevelopment = {
      growth: drawGrowth(rng.fork("growth")),
      snaps: h.snaps.offense + h.snaps.defense + h.snaps.specialTeams,
      carry: {},
      // Exactly the drills he was rated from (the one fill): his body and his ratings agree.
      body: bodyFrom(rated.get(id)!.measurements),
    };
    const patience = drawPatience(rng.fork("patience"));
    for (const g of h.gamesPlayed) if (g.season === input.season) mostGames = Math.max(mostGames, g.games);

    const team = p.teamId === undefined ? undefined : String(p.teamId);
    const source = sourceOf(id, team, input.status[id], h, reportWeek);
    let injury: Injury | undefined;
    if (source !== undefined) {
      const { min, max } = INJURY_WEEKS[source];
      const weeks = rng.fork("injury").int(min, max);
      const part = h.injury?.part;
      const setting: InjurySetting = source === "R05" ? "AWAY" : "GAME";
      const kind = part !== undefined ? `real:${slug(part)}` : `real:reserve-${slug(h.reserve?.type ?? source)}`;
      injury = { kind, weeksRemaining: weeks, playable: false, setting, band: bandOf(weeks), since };
      flags[id] = { growth: "draw", injury: { source, ...(h.injury === undefined ? {} : { reportWeek: h.injury.week }) } };
    } else flags[id] = { growth: "draw" };

    const combine = combineOf(input.measurements[id]);
    return {
      ...p,
      bio: combine === undefined ? p.bio : { ...p.bio, combine },
      attributes: { ...p.attributes, development },
      condition: injury === undefined ? p.condition : { ...p.condition, injury },
      personality: { ...p.personality, patience },
    };
  });

  return {
    players: out,
    startingDevelopment: {
      version: STARTING_DEVELOPMENT_VERSION,
      seedLabel: SEED_LABEL,
      stream: DEVELOPMENT_STREAM,
      asOf: input.snapshotDate,
      snapsThrough: { season: input.season, mostGames },
      basis: {
        body: "the four drills he was rated from (provenance.ratings[id].imputed lists those filled with his position's average); not aged",
        growth: "drawn (drawGrowth), not estimated",
        snaps: "career offence + defence + special-teams snaps from provenance.history, this season so far included",
        patience: "drawn (drawPatience)",
        injury: "copied: reserve lists R01, R48, R04, R05, and active players Out or Doubtful on their team's latest report; weeks drawn from injuryWeeks (placeholders)",
        durability: "unchanged (the rating's own draw)",
      },
      constants: startingConstants(),
      teamsWithoutGameStatus: teams.filter((t) => !withStatus.has(t)).map((team) => ({ team, reportWeek: reportWeek.get(team) ?? null })),
      players: flags,
    },
  };
}
