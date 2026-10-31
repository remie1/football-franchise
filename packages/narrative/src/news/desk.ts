/**
 * THE NEWS DESK (ADR-082).
 *
 * Reads a season's franchise events one at a time and publishes an edition for each calendar
 * week that had news: `PRESS_STORY_PUBLISHED` events, ranked and capped. Once a champion is
 * crowned and the offseason starts, it publishes the season in review. It only reads; nothing it
 * does reaches the game (Spec #7 §1: narrative may not manufacture facts).
 *
 * Same input and events → the same news, word for word (Iron Rule 4).
 */
import {
  createRng, DEFAULT_LEAGUE_RULES,
  type CalendarStamp, type ConferenceId, type FranchiseEvent, type FranchiseEventEnvelope, type GameId,
  type GameKind, type GameResult, type LeagueStructure, type Rng, type SeasonSchedule, type TeamId,
} from "@ff/contracts";
import { indexLeague, type LeagueIndex, type TeamNames } from "./league.js";
import { gamesLeft, raceStories, type RaceMarks } from "./race.js";
import { applyResults, emptyRecords, type Records } from "./records.js";
import { fieldStories, playoffStory, reviewStories, ROUND_LABEL, seedsOf } from "./season.js";
import { DEFAULT_PER_WEEK, MAX_PER_KIND, ONCE_A_SEASON, type Candidate } from "./stories.js";
import { weeklyCandidates } from "./weekly.js";
import { createStaffBeat, type StaffSeat, type StaffView } from "./staff.js";
import { writeHeadline, WORDING, type Wording } from "./words.js";

export interface NewsInput {
  /** The season's seed; the desk's dice are forked from it under "narrative:news". */
  readonly seed: string;
  readonly structure: LeagueStructure;
  readonly teams: readonly TeamNames[];
  /** For next week's games (previews) and the games each team has left (the playoff race). */
  readonly schedule: SeasonSchedule;
  /** Playoff teams per conference; the league rules' 7 unless given. */
  readonly playoffTeams?: number;
  /** Headlines a regular-season week keeps; the owner's Q4 is 4. */
  readonly perWeek?: number;
  /** The headline wording; the content file unless a test swaps it. */
  readonly wording?: Wording;
  /**
   * ADR-084: who sat in each head coach and coordinator seat, and how the staff felt, when the
   * stream starts. Absent: the desk learns seats only from hires, and every view starts professional.
   */
  readonly staff?: readonly StaffSeat[];
  readonly views?: readonly StaffView[];
}

export type StoryEnvelope = FranchiseEventEnvelope & { event: Extract<FranchiseEvent, { type: "PRESS_STORY_PUBLISHED" }> };

export interface Edition {
  /** "Week 6", "Wild-card round", "Season review". */
  readonly label: string;
  /** The day the week's games were played, or the week's last event when it had none. */
  readonly at: CalendarStamp;
  readonly stories: readonly StoryEnvelope[];
}

export interface NewsDesk {
  /** Read the next event. Returns the editions it closed: usually none, at a new week one. */
  take(envelope: FranchiseEventEnvelope): Edition[];
  /** The stream has ended: close the last week, and review the season if it has a champion. */
  finish(): Edition[];
  /** "Elmwood Bison 41, Ironvale Comets 17" for a game the desk has seen finish. */
  scoreLine(game: GameId): string | undefined;
}

type Field = readonly { conference: ConferenceId; teams: readonly TeamId[] }[];

interface OpenWeek {
  readonly key: string;
  at: CalendarStamp;
  gameDay: CalendarStamp | null;
  readonly regular: GameResult[];
  readonly playoff: { result: GameResult; kind: GameKind }[];
  field: Field | null;
}

const weekKey = (s: CalendarStamp) => `${s.season}/${s.phase}/${s.week}`;

/**
 * Keep the most important stories: no team in two of them, at most `MAX_PER_KIND` of a kind, at
 * most `perWeek` in all, besides the ones that always run. At equal importance a once-a-season
 * story goes first; remaining ties are broken by the dice, so a team's id never decides whether
 * it makes the paper.
 */
export function selectStories(candidates: readonly Candidate[], rng: Rng, perWeek: number): Candidate[] {
  const rare = (c: Candidate) => (ONCE_A_SEASON.has(c.kind) ? 0 : 1);
  const ranked = candidates
    .map((c) => ({ c, key: rng.next() }))
    .sort((a, b) => b.c.importance - a.c.importance || rare(a.c) - rare(b.c) || a.key - b.key)
    .map((x) => x.c);
  const kept = new Set<Candidate>(ranked.filter((c) => c.always === true));
  const teams = new Set([...kept].flatMap((c) => c.teams.map(String)));
  const kinds = new Map<string, number>();
  let capped = 0;
  for (const c of ranked) {
    if (capped >= perWeek) break;
    if (kept.has(c) || c.teams.some((t) => teams.has(String(t)))) continue;
    if ((kinds.get(c.kind) ?? 0) >= MAX_PER_KIND) continue;
    kept.add(c);
    capped++;
    kinds.set(c.kind, (kinds.get(c.kind) ?? 0) + 1);
    for (const t of c.teams) teams.add(String(t));
  }
  return ranked.filter((c) => kept.has(c));
}

function label(week: OpenWeek): string {
  const at = week.gameDay ?? week.at;
  if (at.phase === "REGULAR_SEASON") return `Week ${at.week}`;
  const round = week.playoff[0] === undefined ? undefined : ROUND_LABEL[week.playoff[0].kind];
  if (round !== undefined) return round;
  return week.field !== null ? "Playoff field" : `${at.phase} week ${at.week}`;
}

export function createNewsDesk(input: NewsInput): NewsDesk {
  const league: LeagueIndex = indexLeague(input.structure, input.teams);
  const perWeek = input.perWeek ?? DEFAULT_PER_WEEK;
  const playoffTeams = input.playoffTeams ?? DEFAULT_LEAGUE_RULES.playoffTeamsPerConference;
  const wording = input.wording ?? WORDING;
  const dice = createRng(input.seed, "narrative:news");
  let records: Records = emptyRecords([...league.teams.values()].map((t) => t.id));
  let open: OpenWeek | null = null;
  let seq = 0;
  let seeds = new Map<string, number>();
  let champion: TeamId | null = null;
  let reviewed = false;
  const marks: RaceMarks = new Map();
  const playoffs: GameResult[] = [];
  const finished = new Map<string, GameResult>();
  const staff = createStaffBeat(league, input.staff ?? [], input.views ?? []);

  /** `fill` runs only in the room the week's other news leaves (ADR-084 L4: leaks). */
  function publish(key: string, title: string, at: CalendarStamp, candidates: readonly Candidate[], fill: readonly Candidate[] = []): Edition | null {
    if (candidates.length === 0 && fill.length === 0) return null;
    const rng = dice.fork(key);
    const words = rng.fork("words");
    const used = new Set<string>();
    const chosen = selectStories(candidates, rng.fork("rank"), perWeek);
    const room = perWeek - chosen.filter((c) => c.always !== true).length;
    if (room > 0 && fill.length > 0) {
      const taken = new Set(chosen.flatMap((c) => c.teams.map(String)));
      chosen.push(...selectStories(fill.filter((c) => !c.teams.some((t) => taken.has(String(t)))), rng.fork("fill"), room));
    }
    if (chosen.length === 0) return null;
    const stories = chosen.map((c): StoryEnvelope => ({
      seq: seq++,
      at,
      event: {
        type: "PRESS_STORY_PUBLISHED",
        payload: {
          kind: c.kind,
          headline: writeHeadline(c.kind, c.facts, words, used, c.flavor, wording),
          importance: c.importance,
          teams: [...c.teams],
          games: [...c.games],
          subjects: [],
        },
      },
    }));
    return { label: title, at, stories };
  }

  function close(week: OpenWeek): Edition | null {
    const candidates: Candidate[] = [];
    const day = week.gameDay ?? week.at;
    if (week.regular.length > 0) {
      const before = records;
      records = applyResults(before, week.regular);
      candidates.push(...weeklyCandidates({
        week: day.week, results: week.regular, before, after: records, league, schedule: input.schedule,
      }));
      candidates.push(...raceStories({ records, left: gamesLeft(input.schedule, day.week), league, playoffTeams }, marks));
    }
    if (week.field !== null) candidates.push(...fieldStories(week.field, records, league));
    for (const { result, kind } of week.playoff) {
      const story = playoffStory(result, kind, seeds, league);
      if (story !== null) candidates.push(story);
    }
    const beat = staff.close(dice.fork(`${week.key}/staff`), records);
    candidates.push(...beat.always);
    // A week with no games: the coaching carousel, or the week's whispers from around the league.
    const quiet = week.gameDay === null && week.field === null;
    const title = quiet && beat.always.length > 0 ? "Coaching changes" : quiet && beat.fill.length > 0 ? "Around the league" : label(week);
    return publish(week.key, title, day, candidates, beat.fill);
  }

  function seasonReview(at: CalendarStamp): Edition[] {
    if (reviewed || champion === null) return [];
    reviewed = true;
    const edition = publish(`${at.season}/review`, "Season review", at, reviewStories(records, league, champion, playoffs));
    return edition === null ? [] : [edition];
  }

  const closeOpen = (): Edition[] => {
    if (open === null) return [];
    const edition = close(open);
    open = null;
    return edition === null ? [] : [edition];
  };

  return {
    take(envelope) {
      const key = weekKey(envelope.at);
      const out = open !== null && open.key !== key ? closeOpen() : [];
      const week: OpenWeek = open ?? { key, at: envelope.at, gameDay: null, regular: [], playoff: [], field: null };
      open = week;
      week.at = envelope.at;
      const e = envelope.event;
      staff.take(e);
      if (e.type === "GAME_COMPLETED") {
        finished.set(String(e.payload.result.gameId), e.payload.result);
        week.gameDay ??= envelope.at;
        if (e.payload.kind === "REGULAR") week.regular.push(e.payload.result);
        else if (e.payload.kind !== "PRESEASON") {
          week.playoff.push({ result: e.payload.result, kind: e.payload.kind });
          playoffs.push(e.payload.result);
        }
      } else if (e.type === "PLAYOFF_FIELD_SET") {
        week.field = e.payload.seeds;
        seeds = seedsOf(e.payload.seeds);
      } else if (e.type === "CHAMPION_DECIDED") {
        champion = e.payload.team;
      } else if (e.type === "CALENDAR_PHASE_ENTERED" && e.payload.phase === "OFF_EVAL") {
        out.push(...seasonReview(envelope.at));
      }
      return out;
    },
    finish() {
      const last = open?.at ?? null;
      const out = closeOpen();
      return last === null ? out : [...out, ...seasonReview(last)];
    },
    scoreLine(game) {
      const g = finished.get(String(game));
      if (g === undefined) return undefined;
      const name = (t: TeamId) => `${league.team(t).city} ${league.team(t).nickname}`;
      const home = `${name(g.home)} ${g.homeScore}`;
      const away = `${name(g.away)} ${g.awayScore}`;
      return g.awayScore > g.homeScore ? `${away}, ${home}` : `${home}, ${away}`;
    },
  };
}

/** The whole season at once: every edition, in order. */
export function writeNews(input: NewsInput, events: readonly FranchiseEventEnvelope[]): Edition[] {
  const desk = createNewsDesk(input);
  return [...events.flatMap((e) => desk.take(e)), ...desk.finish()];
}
