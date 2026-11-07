/**
 * ADR-096 §3 (build step 2): fan and media mood in the season's walk.
 *
 * In `runSeason` with `mood`, one day step, run after every other step:
 *   any day     the day's offseason moments (§3.2) and watch-list joins: a head coach or GM fired
 *               lifts the fans' team mood, a new man in a seat starts his own reading, a big
 *               free-agent signing or a first-round pick lifts the fans, and a first-round pick, a
 *               top-five cap hit signing or a hurt-for-four-weeks player joins the watch list
 *   game days   every team that played: the game's read (`readGame`), split between the team, the
 *               head coach, the coordinators, the GM (with his off-field blame) and the watch list's
 *               players by their own grades; fans and media move at their own rates; one
 *               `PUBLIC_MOOD_UPDATED` per team
 *   week's end  teams without a game drift toward their rest points; a team whose season is over
 *               sets its rest point; quiet watch-list players count a quiet week and leave after
 *               four; a team whose mood moved without a game this week gets its event
 *
 * Mood lives in `Team.mood` (M2). What it needs beyond that to carry on exactly (rest points, the
 * watch list's quiet weeks, recent grade gaps, the grade fit, each team's record against
 * expectation) lives in `people.playerMemory.mood`, which a save keeps as its steps' memory
 * (`world.development.depthMemory`, franchise's own shape), so a stopped and carried-on or saved and
 * loaded season gives the same moods.
 *
 * Every team is computed (part 6 will need all 32); only the user's gets a show (Q1 a). Nothing in
 * the sim reads mood (part 6 is a later step behind its own switch). Rates: `MOOD`, all CHOSEN.
 */
import {
  createRng, positionOverall, stampToString,
  type CalendarStamp, type FranchiseEvent, type GameParticipation, type GameResult, type MoodAudience, type MoodReading,
  type MoodSeat, type MoodSubject, type PlayerState, type Position, type ScheduledGame, type SeasonState, type StaffState,
  type Team, type TeamId,
} from "@ff/contracts";
import type { DayStep, DayStepContext, LeaguePeople } from "../season/people.js";
import { DAYS_PER_WEEK } from "../calendar/clock.js";
import { STARTERS } from "../draft/board.js";
import { decisionSeason } from "../cap/ahead.js";
import { GROUP_OF, UNIT_OF, leagueStrength, startersOf, strengthWinShare, type TeamStrength } from "../meeting/strength.js";
import { seasonOverAt } from "../meeting/steps.js";
import { gameGrade } from "../players/depthChart.js";
import { expectedOverallChange } from "../players/development.js";
import { emptyMemory } from "../players/types.js";
import { normal, seatOf } from "../staff/world.js";
import { readGame, type LeagueBase } from "./game.js";
import { MOOD, MOOD_STREAM } from "./rates.js";
import { emptyMoodMemory, type MoodMemory } from "./memory.js";

export { emptyMoodMemory, type MoodMemory };

export const MOOD_STEP_PREFIX = "mood:";

/** Nothing to set yet; part 6's `--mood-firings` will live here. */
export type MoodStepsConfig = Readonly<Record<string, never>>;

// ─── Readings ─────────────────────────────────────────────────────────────────────────────────

export function subjectKey(s: MoodSubject): string {
  return s.kind === "TEAM" ? "TEAM" : s.kind === "STAFF" ? `STAFF/${s.seat}/${String(s.staff)}` : `PLAYER/${String(s.player)}`;
}
const readingKey = (audience: MoodAudience, s: MoodSubject) => `${audience}|${subjectKey(s)}`;
const AUDIENCES: readonly MoodAudience[] = ["FANS", "MEDIA"];
const SEATS: readonly MoodSeat[] = ["HEAD_COACH", "GM", "OC", "DC"];
const clampMood = (x: number) => Math.max(-MOOD.limit, Math.min(MOOD.limit, x));
const round1 = (x: number) => Math.round(x * 10) / 10 + 0; // + 0: no -0, which JSON writes as 0

/** One team's readings, as a working table. */
class Board {
  readonly map = new Map<string, MoodReading>();
  /** Subjects set by today's run, whose causes a drift keeps. */
  readonly moved = new Set<string>();
  constructor(readings: readonly MoodReading[] | undefined) {
    for (const r of readings ?? []) this.map.set(readingKey(r.audience, r.subject), { ...r, causes: [...r.causes] });
  }
  get(audience: MoodAudience, s: MoodSubject): number { return this.map.get(readingKey(audience, s))?.value ?? 0; }
  has(s: MoodSubject): boolean { return this.map.has(readingKey("FANS", s)); }
  /** Set a subject's reading; `change` and `causes` are this move's. */
  set(audience: MoodAudience, s: MoodSubject, value: number, causes: readonly string[]): void {
    const before = this.get(audience, s);
    const v = round1(clampMood(value));
    const k = readingKey(audience, s);
    const was = this.moved.has(k) ? this.map.get(k) : undefined;
    // A second move today adds to the first: the change since the last reading, and both causes.
    const from = was ? was.value - was.change : before;
    this.map.set(k, { audience, subject: s, value: v, change: round1(v - from), causes: was ? [...new Set([...was.causes, ...causes])] : [...causes] });
    this.moved.add(k);
  }
  /** Start a new subject (no move). */
  start(s: MoodSubject, fans: number, media: number, causes: readonly string[]): void {
    this.map.set(readingKey("FANS", s), { audience: "FANS", subject: s, value: round1(clampMood(fans)), change: 0, causes: [...causes] });
    this.map.set(readingKey("MEDIA", s), { audience: "MEDIA", subject: s, value: round1(clampMood(media)), change: 0, causes: [...causes] });
    this.moved.add(readingKey("FANS", s)); this.moved.add(readingKey("MEDIA", s));
  }
  drop(s: MoodSubject): void { for (const a of AUDIENCES) this.map.delete(readingKey(a, s)); }
  subjects(): MoodSubject[] {
    return [...this.map.values()].filter((r) => r.audience === "FANS").map((r) => r.subject);
  }
  /** In a fixed order: team, seats, players; fans before media. */
  readings(): MoodReading[] {
    const rank = (s: MoodSubject) => (s.kind === "TEAM" ? 0 : s.kind === "STAFF" ? 1 + SEATS.indexOf(s.seat) : 9);
    return [...this.map.values()].sort((a, b) => rank(a.subject) - rank(b.subject)
      || (subjectKey(a.subject) < subjectKey(b.subject) ? -1 : subjectKey(a.subject) > subjectKey(b.subject) ? 1 : 0)
      || AUDIENCES.indexOf(a.audience) - AUDIENCES.indexOf(b.audience));
  }
}

const TEAM: MoodSubject = { kind: "TEAM" };

// ─── Who sits where ───────────────────────────────────────────────────────────────────────────

/** The men in a team's four watched seats today. */
export function seatedMen(team: TeamId, staff: readonly StaffState[] | undefined): { seat: MoodSeat; man: StaffState }[] {
  const out: { seat: MoodSeat; man: StaffState }[] = [];
  for (const s of staff ?? []) {
    if (s.retiredAfter !== undefined || s.teamId === undefined || String(s.teamId) !== String(team)) continue;
    const seat = s.role === "GM" ? "GM" : seatOf(s);
    if (seat === "HEAD_COACH" || seat === "GM" || seat === "OC" || seat === "DC") out.push({ seat, man: s });
  }
  return out.sort((a, b) => SEATS.indexOf(a.seat) - SEATS.indexOf(b.seat) || String(a.man.id).localeCompare(String(b.man.id)));
}

/** Keep the seats' readings in step with who sits there: a man gone loses his; a new man starts at the team's mood, halved. */
function syncSeats(board: Board, team: TeamId, staff: readonly StaffState[] | undefined): void {
  const men = seatedMen(team, staff);
  const keep = new Set(men.map((m) => subjectKey({ kind: "STAFF", staff: m.man.id, seat: m.seat })));
  for (const s of board.subjects()) if (s.kind === "STAFF" && !keep.has(subjectKey(s))) board.drop(s);
  for (const { seat, man } of men) {
    const s: MoodSubject = { kind: "STAFF", staff: man.id, seat };
    if (!board.has(s)) board.start(s, board.get("FANS", TEAM) / 2, board.get("MEDIA", TEAM) / 2, ["NEW_IN_SEAT"]);
  }
}

// ─── The step ─────────────────────────────────────────────────────────────────────────────────

export function moodSteps(_config: MoodStepsConfig = {}): DayStep[] {
  return [{ id: `${MOOD_STEP_PREFIX}week`, run: (people, ctx) => moodDay(people, ctx) }];
}

type Game = { game: ScheduledGame; result: GameResult; extras?: unknown };

function participationOf(g: Game): readonly GameParticipation[] {
  return (g.extras as { participation?: readonly GameParticipation[] } | undefined)?.participation ?? [];
}

/** Every game the season knows, by id, with its day. */
function gameDays(state: SeasonState): Map<string, CalendarStamp> {
  return new Map([...state.schedule.games, ...(state.bracket?.games ?? [])].map((g) => [String(g.gameId), g.at]));
}

const sameWeek = (a: CalendarStamp, b: CalendarStamp) => a.season === b.season && a.phase === b.phase && a.week === b.week;

/** The team's streak after its games through `upTo` (positive wins, negative losses, 0 after a tie). */
function streakAfter(state: SeasonState, team: string, days: ReadonlyMap<string, CalendarStamp>): number {
  const mine = state.results
    .filter((r) => String(r.home) === team || String(r.away) === team)
    .map((r) => ({ r, at: days.get(String(r.gameId)) }))
    .filter((x): x is { r: GameResult; at: CalendarStamp } => x.at !== undefined)
    .sort((a, b) => stampToString(a.at) < stampToString(b.at) ? -1 : stampToString(a.at) > stampToString(b.at) ? 1 : 0);
  let streak = 0;
  for (const { r } of mine) {
    const own = String(r.home) === team ? r.homeScore - r.awayScore : r.awayScore - r.homeScore;
    const side = own > 0 ? 1 : own < 0 ? -1 : 0;
    streak = side === 0 ? 0 : Math.sign(streak) === side ? streak + side : side;
  }
  return streak;
}

function leagueBase(state: SeasonState, strengths: readonly TeamStrength[]): LeagueBase {
  const points = state.results.reduce((s, r) => s + r.homeScore + r.awayScore, 0);
  const n = strengths.length || 1;
  return {
    points: state.results.length > 0 ? points / (2 * state.results.length) : 0,
    offense: strengths.reduce((s, t) => s + t.units.OFFENSE, 0) / n,
    defense: strengths.reduce((s, t) => s + t.units.DEFENSE, 0) / n,
  };
}

/** The `share` of a team's contracts' cap hits in `season` that are among its five biggest, by player. */
function topCapHits(people: LeaguePeople, team: string, season: number): Set<string> {
  const hits = (people.contracts ?? [])
    .filter((c) => String(c.team) === team && c.ended === undefined)
    .map((c) => ({ player: String(c.player), hit: c.years.find((y) => y.season === season)?.capHit ?? 0 }))
    .filter((x) => x.hit > 0)
    .sort((a, b) => b.hit - a.hit || a.player.localeCompare(b.player));
  return new Set(hits.slice(0, MOOD.watch.topCapHits).map((x) => x.player));
}

/** §3.2: next year's committed cap, by team; the league's worst quarter (most committed) is blamed on the GM. */
function tightCapTeams(people: LeaguePeople, season: number, teams: readonly Team[]): Set<string> {
  if (!people.contracts || people.contracts.length === 0) return new Set();
  const committed = new Map(teams.map((t) => [String(t.id), 0]));
  for (const c of people.contracts) {
    if (c.ended !== undefined || !committed.has(String(c.team))) continue;
    const hit = c.years.find((y) => y.season === season + 1)?.capHit ?? 0;
    committed.set(String(c.team), committed.get(String(c.team))! + hit);
  }
  const ranked = [...committed].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (ranked.every(([, v]) => v === 0)) return new Set();
  return new Set(ranked.slice(0, Math.ceil(ranked.length * MOOD.gm.worstShare)).map(([t]) => t));
}

/** §3.2: each team's units whose starters are expected to slip most next year, the league's worst quarter, as `team/unit`. */
function agingUnits(people: LeaguePeople, players: ReadonlyMap<string, PlayerState>, at: CalendarStamp, rules: DayStepContext["rules"]): string[] {
  if (!people.players.some((p) => p.attributes.development !== undefined)) return [];
  const out: string[] = [];
  for (const unit of ["OFFENSE", "DEFENSE"] as const) {
    const rows = people.teams.map((t) => {
      const starters = startersOf(t, players).filter(({ position }) => UNIT_OF[GROUP_OF[position]] === unit);
      const change = starters.reduce((s, { player }) => s + expectedOverallChange(player, { at, starter: true, rules }), 0) / Math.max(1, starters.length);
      return { team: String(t.id), change };
    }).sort((a, b) => a.change - b.change || a.team.localeCompare(b.team));
    for (const r of rows.slice(0, Math.ceil(rows.length * MOOD.gm.worstShare))) if (r.change < 0) out.push(`${r.team}/${unit}`);
  }
  return out;
}

/** §3.2: starters out hurt with no healthy backup within `thinBackup` points (the ideal starters by rating, against who can play). */
function thinSpots(team: Team, players: ReadonlyMap<string, PlayerState>): number {
  let thin = 0;
  const roster = team.roster.map((id) => players.get(String(id))).filter((p): p is PlayerState => p !== undefined);
  for (const position of Object.keys(STARTERS) as Position[]) {
    const want = STARTERS[position];
    if (want === 0) continue;
    const rated = roster.filter((p) => p.bio.position === position)
      .map((p) => ({ p, overall: positionOverall(position, p.attributes.values), out: p.condition.injury !== undefined && !p.condition.injury.playable }))
      .sort((a, b) => b.overall - a.overall || String(a.p.bio.id).localeCompare(String(b.p.bio.id)));
    const ideal = rated.slice(0, want);
    const spare = rated.slice(want).filter((x) => !x.out);
    for (const starter of ideal) {
      if (!starter.out) continue;
      const cover = spare.shift();
      if (!cover || starter.overall - cover.overall > MOOD.gm.thinBackup) thin++;
    }
  }
  return thin;
}

/** A watch-list join: add him (dropping the quietest when the list is full). */
function join(board: Board, memory: MoodMemory, team: string, player: string, cause: string): void {
  const s: MoodSubject = { kind: "PLAYER", player: player as PlayerState["bio"]["id"] };
  const entry = memory.watch[player];
  if (board.has(s) && entry) {
    entry.quiet = 0; entry.joined = true;
    return;
  }
  const listed = board.subjects().filter((x): x is Extract<MoodSubject, { kind: "PLAYER" }> => x.kind === "PLAYER");
  if (listed.length >= MOOD.watch.size) {
    const out = listed
      .map((x) => ({ x, quiet: memory.watch[String(x.player)]?.quiet ?? 0, loud: Math.abs(board.get("FANS", x)) }))
      .sort((a, b) => b.quiet - a.quiet || a.loud - b.loud || String(a.x.player).localeCompare(String(b.x.player)))[0]!;
    board.drop(out.x);
    delete memory.watch[String(out.x.player)];
  }
  board.start(s, 0, 0, [cause]);
  memory.watch[player] = { team, quiet: 0, moved: 0, joined: true };
}

const wobble = (seed: string, season: number, day: CalendarStamp, team: string, s: MoodSubject): number =>
  MOOD.wobbleSd * normal(createRng(seed, `${MOOD_STREAM}/${season}/${day.phase}/${day.week}/${team}`).fork(subjectKey(s)));

/** §3.1 (5): one subject's move on its share of a game. `pullTo`: the media's record-against-expectation target. */
function move(board: Board, s: MoodSubject, share: number, causes: readonly string[], noise: number, pullTo?: number): void {
  const f = board.get("FANS", s), m = board.get("MEDIA", s);
  board.set("FANS", s, MOOD.fans.keep * f + MOOD.fans.gain * MOOD.limit * MOOD.fans.amp * share + noise, causes);
  const pull = pullTo === undefined ? 0 : MOOD.media.pull * (pullTo - m);
  board.set("MEDIA", s, MOOD.media.keep * m + MOOD.media.gain * MOOD.limit * share + pull, causes);
}

function moodDay(people: LeaguePeople, ctx: DayStepContext): { people: LeaguePeople; events: FranchiseEvent[] } | undefined {
  const { day, season, seed } = ctx;
  const memory: MoodMemory = structuredClone(people.playerMemory?.mood ?? emptyMoodMemory());
  const before = JSON.stringify(memory);
  const boards = new Map(people.teams.map((t) => [String(t.id), new Board(t.mood)]));
  const touched = new Set<string>();
  const players = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const startPlayers = new Map((ctx.dayStart ?? people).players.map((p) => [String(p.bio.id), p]));
  const startStaff = new Map(((ctx.dayStart ?? people).staff ?? []).map((s) => [String(s.id), s]));
  const inGames = day.phase === "REGULAR_SEASON" || day.phase === "PLAYOFFS" || day.phase === "PRESEASON";
  const pend = (team: string, cause: string) => { (memory.pending[team] ??= []).push(cause); touched.add(team); };

  // The day's moments and joins, from the steps before this one.
  for (const e of ctx.earlier ?? []) {
    if (e.type === "STAFF_DEPARTED" && e.payload.reason === "FIRED") {
      const man = startStaff.get(String(e.payload.staff));
      const seat = man && (man.role === "GM" ? "GM" : man.role === "HEAD_COACH" ? "HEAD_COACH" : undefined);
      const board = boards.get(String(e.payload.team));
      if (!seat || !board) continue;
      const cause = seat === "GM" ? "GM_FIRED" : "COACH_FIRED";
      board.set("FANS", TEAM, board.get("FANS", TEAM) + MOOD.offseason.firing, [cause]);
      pend(String(e.payload.team), cause);
    } else if (e.type === "STAFF_HIRED" && (e.payload.role === "HEAD_COACH" || e.payload.role === "GM" || e.payload.role === "OC" || e.payload.role === "DC")) {
      const board = boards.get(String(e.payload.team));
      if (!board) continue;
      const s: MoodSubject = { kind: "STAFF", staff: e.payload.staff, seat: e.payload.role };
      if (inGames) board.start(s, board.get("FANS", TEAM) / 2, board.get("MEDIA", TEAM) / 2, ["NEW_HIRE"]);
      else board.start(s, MOOD.offseason.hireFans, MOOD.offseason.hireMedia, ["NEW_HIRE"]);
      pend(String(e.payload.team), "NEW_HIRE");
    } else if (e.type === "DRAFT_PICK_MADE" && e.payload.round === 1) {
      const board = boards.get(String(e.payload.team));
      if (!board) continue;
      board.set("FANS", TEAM, board.get("FANS", TEAM) + MOOD.offseason.firstRoundPick, ["FIRST_ROUND_PICK"]);
      join(board, memory, String(e.payload.team), String(e.payload.player), "FIRST_ROUND_PICK");
      pend(String(e.payload.team), "FIRST_ROUND_PICK");
    } else if (e.type === "INJURY_OCCURRED" && e.payload.weeks >= MOOD.watch.longInjury) {
      const team = players.get(String(e.payload.player))?.teamId;
      const board = team !== undefined ? boards.get(String(team)) : undefined;
      if (!board) continue;
      join(board, memory, String(team), String(e.payload.player), "LONG_INJURY");
      pend(String(team), "LONG_INJURY");
    } else if (e.type === "CONTRACT_SIGNED") {
      const team = String(e.payload.team);
      const board = boards.get(team);
      if (!board) continue;
      if (topCapHits(people, team, decisionSeason(day)).has(String(e.payload.player))) {
        join(board, memory, team, String(e.payload.player), "BIG_CONTRACT");
        pend(team, "BIG_CONTRACT");
      }
    }
  }
  // §3.2: a free-agent signing among the league year's 20 biggest new deals so far lifts the fans.
  const today = stampToString(day);
  const yearMoves = (people.freeAgentMoves ?? []).filter((m) => decisionSeason(m.signedAt) === decisionSeason(day));
  for (const m of yearMoves) {
    if (stampToString(m.signedAt) !== today) continue;
    const bigger = yearMoves.filter((o) => o.apy > m.apy).length;
    const board = boards.get(String(m.to));
    if (bigger >= MOOD.offseason.bigSigningRank || !board) continue;
    board.set("FANS", TEAM, board.get("FANS", TEAM) + MOOD.offseason.bigSigning, ["BIG_SIGNING"]);
    pend(String(m.to), "BIG_SIGNING");
  }

  const events: FranchiseEvent[] = [];
  const emit = (team: string, week: number | undefined) => {
    const board = boards.get(team)!;
    if (!board.has(TEAM)) board.start(TEAM, 0, 0, []);
    events.push({ type: "PUBLIC_MOOD_UPDATED", payload: { team: team as TeamId, season, ...(week !== undefined ? { week } : {}), readings: board.readings() } });
  };

  // Game days.
  // Preseason games move nothing (fans do not judge them).
  const games = (ctx.games as readonly Game[]).filter((g) => g.game.kind !== "PRESEASON");
  if (games.length > 0) {
    const start = ctx.dayStart ?? people;
    const strengths = leagueStrength(start.teams, start.players);
    const strengthOf = new Map(strengths.map((s) => [String(s.team), s]));
    const base = leagueBase(ctx.state, strengths);
    const days = gameDays(ctx.state);
    const startTeams = new Map(start.teams.map((t) => [String(t.id), t]));
    if (day.phase === "REGULAR_SEASON" && memory.aging?.season !== season) {
      memory.aging = { season, teams: agingUnits(start, startPlayers, day, ctx.rules) };
    }
    const aging = new Set(memory.aging?.season === season ? memory.aging.teams : []);
    const tight = day.phase === "REGULAR_SEASON" ? tightCapTeams(start, season, start.teams) : new Set<string>();

    // The watch list's grades: each graded player's game against what his rating promises, by the league's fit so far.
    if (memory.fit.season !== season) {
      const f = memory.fit;
      memory.fit = { season, n: f.n / 2, sx: f.sx / 2, sy: f.sy / 2, sxx: f.sxx / 2, sxy: f.sxy / 2 };
    }
    const fit = memory.fit;
    const slope = fit.n >= 2 && fit.n * fit.sxx - fit.sx * fit.sx > 1e-9 ? (fit.n * fit.sxy - fit.sx * fit.sy) / (fit.n * fit.sxx - fit.sx * fit.sx) : 0;
    const promised = (overall: number) => (fit.n >= 50 ? (fit.sy - slope * fit.sx) / fit.n + slope * overall : undefined);
    const gapOf = new Map<string, number>();
    const add = { n: 0, sx: 0, sy: 0, sxx: 0, sxy: 0 };
    for (const g of games) {
      const lines = new Map<string, { snaps: number; won: number; lost: number }>();
      for (const r of participationOf(g)) {
        const line = lines.get(String(r.player)) ?? { snaps: 0, won: 0, lost: 0 };
        line.snaps += r.snaps.offense + r.snaps.defense + r.snaps.special;
        for (const c of r.contests) { line.won += c.won; line.lost += c.lost; }
        lines.set(String(r.player), line);
      }
      for (const [id, line] of lines) {
        const p = startPlayers.get(id);
        if (!p || line.snaps < MOOD.watch.minSnaps) continue;
        const overall = positionOverall(p.bio.position, p.attributes.values);
        const grade = gameGrade(line, p.bio.position);
        add.n++; add.sx += overall; add.sy += grade; add.sxx += overall * overall; add.sxy += overall * grade;
        const want = promised(overall);
        if (want === undefined) continue;
        const gap = grade - want;
        gapOf.set(id, gap);
        const recent = [...(memory.gaps[id] ?? []), gap].slice(-MOOD.watch.formGames);
        memory.gaps[id] = recent;
      }
    }
    memory.fit = { season, n: fit.n + add.n, sx: fit.sx + add.sx, sy: fit.sy + add.sy, sxx: fit.sxx + add.sxx, sxy: fit.sxy + add.sxy };

    for (const g of games) {
      for (const teamId of [g.result.home, g.result.away]) {
        const team = String(teamId);
        const board = boards.get(team);
        const own = strengthOf.get(team), other = strengthOf.get(String(teamId === g.result.home ? g.result.away : g.result.home));
        if (!board || !own || !other) continue;
        syncSeats(board, teamId, start.staff);
        const read = readGame(g.result, teamId, { own, other }, base, streakAfter(ctx.state, team, days));

        // Form joins (§3): his last games all ran the same way past `formGap`.
        for (const r of participationOf(g)) {
          if (String(r.team) !== team) continue;
          const recent = memory.gaps[String(r.player)] ?? [];
          if (!gapOf.has(String(r.player)) || recent.length < MOOD.watch.formGames) continue;
          if (recent.every((x) => x >= MOOD.watch.formGap)) join(board, memory, team, String(r.player), "PLAYING_ABOVE_RATING");
          else if (recent.every((x) => x <= -MOOD.watch.formGap)) join(board, memory, team, String(r.player), "PLAYING_BELOW_RATING");
        }

        // The media's pull: the season's record against what its games' odds expected.
        const rec = memory.record[team]?.season === season ? memory.record[team]! : { season, wins: 0, expected: 0 };
        const own50 = read.pointsFor > read.pointsAgainst ? 1 : read.pointsFor === read.pointsAgainst ? 0.5 : 0;
        const homeSide = String(g.result.home) === team;
        const edge = homeSide ? MOOD.homeEdge : -MOOD.homeEdge;
        rec.wins += own50;
        rec.expected += strengthWinShare(own.total + edge / 2, other.total - edge / 2);
        memory.record[team] = rec;
        const pullTo = MOOD.limit * Math.tanh((rec.wins - rec.expected) / MOOD.media.pullScale);

        const noise = (s: MoodSubject) => wobble(seed, season, day, team, s);
        move(board, TEAM, read.s, read.causes, noise(TEAM), pullTo);
        const seats = seatedMen(teamId, start.staff);
        // §3.2: the GM's off-field blame.
        const gmCauses: string[] = [];
        let offField = 0;
        const thin = startTeams.has(team) ? thinSpots(startTeams.get(team)!, startPlayers) : 0;
        if (thin > 0) { offField -= Math.min(MOOD.gm.thinCap, MOOD.gm.perThinSpot * thin); gmCauses.push("THIN_BEHIND_HURT_STARTER"); }
        for (const unit of ["OFFENSE", "DEFENSE"]) if (aging.has(`${team}/${unit}`)) { offField -= MOOD.gm.agingUnit; gmCauses.push(`AGING_${unit}`); }
        if (tight.has(team)) { offField -= MOOD.gm.tightCap; gmCauses.push("TIGHT_CAP_NEXT_YEAR"); }
        for (const { seat, man } of seats) {
          const s: MoodSubject = { kind: "STAFF", staff: man.id, seat };
          if (seat === "HEAD_COACH") move(board, s, MOOD.headCoachShare * read.s, read.causes, noise(s), pullTo);
          else if (seat === "OC") move(board, s, MOOD.coordinatorShare * read.offense, [read.offense >= 0 ? "OFFENSE_ABOVE_EXPECTED" : "OFFENSE_BELOW_EXPECTED"], noise(s));
          else if (seat === "DC") move(board, s, MOOD.coordinatorShare * read.defense, [read.defense >= 0 ? "DEFENSE_ABOVE_EXPECTED" : "DEFENSE_BELOW_EXPECTED"], noise(s));
          else move(board, s, Math.max(-1, Math.min(1, MOOD.gmShare * read.s + offField)), [...read.causes.slice(0, 1), ...gmCauses], noise(s), pullTo);
        }
        // Watch-list players move on their own games.
        for (const s of board.subjects()) {
          if (s.kind !== "PLAYER") continue;
          const gap = gapOf.get(String(s.player));
          const entry = memory.watch[String(s.player)];
          if (gap === undefined || !entry) continue;
          const f = board.get("FANS", s);
          move(board, s, Math.tanh(gap / MOOD.watch.gradeScale), [gap >= 0 ? "PLAYED_ABOVE_RATING" : "PLAYED_BELOW_RATING"], noise(s));
          entry.moved += Math.abs(board.get("FANS", s) - f);
        }
        touched.add(team);
        delete memory.pending[team];
        emit(team, day.week);
      }
    }
  }

  // The week's end.
  if (day.day === DAYS_PER_WEEK) {
    const days = gameDays(ctx.state);
    const playedThisWeek = new Set<string>();
    for (const r of ctx.state.results) {
      const at = days.get(String(r.gameId));
      if (at && sameWeek(at, day)) { playedThisWeek.add(String(r.home)); playedThisWeek.add(String(r.away)); }
    }
    for (const t of people.teams) {
      const team = String(t.id);
      const board = boards.get(team)!;
      // A team whose season is over sets its rest point once (§3.1 (6)).
      if (ctx.state.bracket && memory.rest[team]?.season !== season && seasonOverAt(ctx.state, t.id) !== undefined) {
        memory.rest[team] = { season, FANS: round1(MOOD.remember * board.get("FANS", TEAM)), MEDIA: round1(MOOD.remember * board.get("MEDIA", TEAM)) };
      }
      if (!playedThisWeek.has(team)) {
        syncSeats(board, t.id, people.staff);
        const rest = memory.rest[team];
        const pendingCauses = new Set(memory.pending[team] ?? []);
        for (const s of board.subjects()) {
          for (const a of AUDIENCES) {
            const to = s.kind === "PLAYER" || !rest ? 0 : rest[a];
            const v = board.get(a, s);
            if (v === to && !board.moved.has(readingKey(a, s))) continue;
            const kept = board.moved.has(readingKey(a, s)) || (board.map.get(readingKey(a, s))?.causes ?? []).some((c) => pendingCauses.has(c));
            if (kept) board.moved.add(readingKey(a, s));
            board.set(a, s, v + MOOD.drift * (to - v), kept ? [] : ["NO_GAME"]);
          }
          if (s.kind === "PLAYER") {
            const entry = memory.watch[String(s.player)];
            if (entry) entry.moved += MOOD.drift * Math.abs(board.get("FANS", s));
          }
        }
        if ((t.mood?.length ?? 0) > 0 || memory.pending[team]) touched.add(team);
      }
      // The watch list: quiet weeks, and who leaves.
      for (const s of board.subjects()) {
        if (s.kind !== "PLAYER") continue;
        const id = String(s.player);
        const entry = memory.watch[id];
        const p = players.get(id);
        const gone = !p || p.teamId === undefined || String(p.teamId) !== team;
        if (!entry || gone) { board.drop(s); delete memory.watch[id]; touched.add(team); continue; }
        entry.quiet = entry.joined || entry.moved >= MOOD.watch.quietMove ? 0 : entry.quiet + 1;
        entry.moved = 0; entry.joined = false;
        if (entry.quiet >= MOOD.watch.quietWeeks) { board.drop(s); delete memory.watch[id]; touched.add(team); }
      }
      if (memory.pending[team] && !playedThisWeek.has(team)) emit(team, undefined);
      delete memory.pending[team];
    }
    // Grade gaps of men no longer graded fade: keep only players still in the league.
    for (const id of Object.keys(memory.gaps)) if (!players.has(id)) delete memory.gaps[id];
  }

  if (touched.size === 0 && events.length === 0 && JSON.stringify(memory) === before) return undefined;
  const teams = people.teams.map((t) => {
    if (!touched.has(String(t.id))) return t;
    const readings = boards.get(String(t.id))!.readings();
    return { ...t, mood: readings };
  });
  return { people: { ...people, teams, playerMemory: { ...(people.playerMemory ?? emptyMemory()), mood: memory } }, events };
}
