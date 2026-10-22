/**
 * THE NEWS DESK (ADR-082).
 *
 * Reads a season's franchise events one at a time and publishes an edition for each calendar
 * week that had news: `PRESS_STORY_PUBLISHED` events, ranked and capped. It only reads; nothing
 * it does reaches the game (Spec #7 §1: narrative may not manufacture facts).
 *
 * Same input and events → the same news, word for word (Iron Rule 4).
 */
import {
  createRng, type CalendarStamp, type FranchiseEvent, type FranchiseEventEnvelope, type GameId,
  type GameResult, type LeagueStructure, type Rng, type SeasonSchedule, type TeamId,
} from "@ff/contracts";
import { indexLeague, type LeagueIndex, type TeamNames } from "./league.js";
import { applyResults, emptyRecords, type Records } from "./records.js";
import { DEFAULT_PER_WEEK, MAX_PER_KIND, ONCE_A_SEASON, type Candidate } from "./stories.js";
import { weeklyCandidates } from "./weekly.js";
import { writeHeadline, WORDING, type Wording } from "./words.js";

export interface NewsInput {
  /** The season's seed; the desk's dice are forked from it under "narrative:news". */
  readonly seed: string;
  readonly structure: LeagueStructure;
  readonly teams: readonly TeamNames[];
  /** For next week's games (previews) and, from step 2, the games each team has left. */
  readonly schedule: SeasonSchedule;
  /** Headlines a regular-season week keeps; the owner's Q4 is 4. */
  readonly perWeek?: number;
  /** The headline wording; the content file unless a test swaps it. */
  readonly wording?: Wording;
}

export type StoryEnvelope = FranchiseEventEnvelope & { event: Extract<FranchiseEvent, { type: "PRESS_STORY_PUBLISHED" }> };

export interface Edition {
  /** "Week 6". */
  readonly label: string;
  /** The day the week's games were played, or the week's last event when it had none. */
  readonly at: CalendarStamp;
  readonly stories: readonly StoryEnvelope[];
}

export interface NewsDesk {
  /** Read the next event. Returns the editions it closed: usually none, at a new week one. */
  take(envelope: FranchiseEventEnvelope): Edition[];
  /** The stream has ended: close the last week. */
  finish(): Edition[];
  /** "Elmwood Bison 41, Ironvale Comets 17" for a game the desk has seen finish. */
  scoreLine(game: GameId): string | undefined;
}

interface OpenWeek {
  readonly key: string;
  at: CalendarStamp;
  gameDay: CalendarStamp | null;
  readonly regular: GameResult[];
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

function label(at: CalendarStamp): string {
  return at.phase === "REGULAR_SEASON" ? `Week ${at.week}` : `${at.phase} week ${at.week}`;
}

export function createNewsDesk(input: NewsInput): NewsDesk {
  const league: LeagueIndex = indexLeague(input.structure, input.teams);
  const perWeek = input.perWeek ?? DEFAULT_PER_WEEK;
  const wording = input.wording ?? WORDING;
  const dice = createRng(input.seed, "narrative:news");
  let records: Records = emptyRecords([...league.teams.values()].map((t) => t.id));
  let open: OpenWeek | null = null;
  let seq = 0;
  const finished = new Map<string, GameResult>();

  function publish(week: OpenWeek, candidates: readonly Candidate[]): Edition | null {
    if (candidates.length === 0) return null;
    const rng = dice.fork(week.key);
    const words = rng.fork("words");
    const used = new Set<string>();
    const at = week.gameDay ?? week.at;
    const stories = selectStories(candidates, rng.fork("rank"), perWeek).map((c): StoryEnvelope => ({
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
    return { label: label(at), at, stories };
  }

  function close(week: OpenWeek): Edition | null {
    const candidates: Candidate[] = [];
    if (week.regular.length > 0) {
      const before = records;
      records = applyResults(before, week.regular);
      candidates.push(...weeklyCandidates({
        week: (week.gameDay ?? week.at).week,
        results: week.regular, before, after: records, league, schedule: input.schedule,
      }));
    }
    return publish(week, candidates);
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
      const closed = open !== null && open.key !== key ? closeOpen() : [];
      const week: OpenWeek = open ?? { key, at: envelope.at, gameDay: null, regular: [] };
      open = week;
      week.at = envelope.at;
      const e = envelope.event;
      if (e.type === "GAME_COMPLETED") {
        finished.set(String(e.payload.result.gameId), e.payload.result);
        week.gameDay ??= envelope.at;
        if (e.payload.kind === "REGULAR") week.regular.push(e.payload.result);
      }
      return closed;
    },
    finish: closeOpen,
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
