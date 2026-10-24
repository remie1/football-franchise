/**
 * The weekly depth chart, set by each head coach's style (ADR-087 §3.1, F3; labels E5).
 *
 * On each week's last day every team's chart is rebuilt from its roster: every available player (no
 * injury, or one he plays through) at his `bio.position`, players who are out left off. The head
 * coach names the starters (franchise's `STARTERS` per position); below them the order is his
 * coordinators' read. Ties go by id.
 *
 * - **Grades** (kept in memory, last four each). A game grade from this week's who-played report
 *   (P4): his contests won against lost, pulled toward even when the sample is small or he played
 *   few snaps; 50 is even. A practice grade every week his team practises, for every healthy rostered
 *   player, so a backup who seldom plays is still seen: his position overall plus seeded noise.
 *   Grades are dropped in offseason weeks with no practice, so camp starts fresh.
 * - **The coordinators' read** of a player: his position overall through a blur set by the side's
 *   coordinator's `talentEvaluation` (OC offence, DC defence, STC for K/P/LS; absent = 50), drawn once
 *   per coordinator, player and season (ADR-080 Q6's lens), blended with how he has looked lately
 *   (his practice grades, with those ratings counted as a couple of weeks of them, shifted by his
 *   game grades).
 * - **The head coach decides** with his leanings (`teamLineup`): his own weight on recent looks
 *   (`form`), a bonus for veterans (`veteran`), and the margin a challenger must beat an incumbent by
 *   (`incumbent`). In a declared battle the margin is small. A fiery coach's quick hook benches a
 *   starter after one bad game.
 * - **Open competition.** At camp a spot the coordinator rates close is declared open; a coach who
 *   leans hard to incumbents rarely sees one as close. A coach who plays who looks best (`form` of
 *   `COACH.formCoachFrom` or more) opens every spot at camp and keeps them open all season. A battle
 *   ends when the coach names a starter: at the end of preseason, or for a form coach when the
 *   season is over.
 * - **Labels** come from what the player can see (his own grades, his injury, whether the spot was
 *   declared open: a benching in a declared battle is open competition, whoever the challenger is,
 *   so on a form coach's team every one is), never the coach's private read, and set the morale each
 *   change costs (`MORALE_HIT`), scaled by the player's true `volatility`. The strain a sudden demotion puts on his view of his coach (F3)
 *   waits for players' views (ADR-084's later step); E5's `DEPTH_CHART_CHANGED` is the record it will read.
 *
 * When the head coach decides: in camp, preseason and the regular season, for every team; in the
 * playoffs, for the teams that played that week (a team knocked out, or on a bye, keeps its
 * starters). In the offseason the starters are kept. Injuries move the chart at any time (injury
 * cover, a starter's return), and a spot left by a player who has gone (released, traded, moved to
 * another position) is filled without a label, since nobody lost it.
 *
 * The incumbents are the starters this step named last week (`memory.weeksInJob`), so another step
 * re-sorting a chart (cut-down day) does not change who holds a job; in the first week, the current
 * chart's order.
 *
 * This is a COACH-authority decision (Iron Rule 6), made by the computer for every team, the owner's
 * included while the staff sets his chart (`decidedBy: "NPC"`). Pure: same inputs, same output. Every
 * draw is forked from the season seed by what it is for, so a resumed run draws what a straight run draws.
 */
import {
  attrId, createRng, getAttr, positionOverall, stampToString,
  type CalendarPhase, type CalendarStamp, type DepthChartSituation, type FranchiseEvent, type GameParticipation, type LeagueRules,
  type PlayerId, type PlayerState, type Position, type StaffState, type Team, type TeamId,
} from "@ff/contracts";
import { phaseWeeks } from "../calendar/clock.js";
import { STARTERS } from "../draft/board.js";
import { clamp, currentJob, normal, seatOf } from "../staff/world.js";
import { isAvailable } from "./injuries.js";
import { hasQuickHook, headCoachOf, teamLineup, type Lineup } from "./lineup.js";
import type { InjuredStarter, PlayerMemory, PositionBattle } from "./types.js";

export interface DepthWeekInput {
  /** The week's last day. */
  readonly at: CalendarStamp;
  readonly rules: LeagueRules;
  readonly seed: string;
  readonly teams: readonly Team[];
  readonly players: readonly PlayerState[];
  readonly staff?: readonly StaffState[];
  readonly memory: PlayerMemory;
  /** This week's who-played reports (every game), for game grades. */
  readonly reports: readonly GameParticipation[];
  /** The owner's team: even leanings until ADR-083's trait; decided "NPC" while the staff sets it. */
  readonly ownerTeam?: TeamId;
}

export interface DepthWeekResult {
  /** New depth charts; a team whose chart did not change is the same object. */
  readonly teams: Team[];
  /** Same order; morale moved (`condition.morale`, -100..100). Unchanged players are the same objects. */
  readonly players: PlayerState[];
  readonly events: FranchiseEvent[];
  readonly memory: PlayerMemory;
}

// ─── Tables (every number CHOSEN, tuned in D5 unless marked) ──────────────────────────────────────

/** The random stream for practice grades and the coordinators' blur. */
export const DEPTH_STREAM = "franchise:depth";

/**
 * The coordinators' blur on a player's position overall: one standard deviation, in rating points,
 * = min + span × (1 − talentEvaluation / 100). The shape of ADR-080 Q6's interview lens; the sizes are
 * CHOSEN for player ratings (a typical coordinator, 50, misreads by about 3 points).
 */
export const READ_BLUR = {
  min: 1,
  span: 4,
  /** The skill read for a seat with nobody in it (the brief: "absent = 50", a typical coordinator). */
  absentSkill: 50,
} as const;

/** How grades are made and kept. CHOSEN, except where marked. */
export const GRADES = {
  /** The grade scale, 0..100 (a practice grade is on the rating scale), and an even game's grade on it. Scale, not tuned. */
  min: 0,
  max: 100,
  even: 50,
  /** Weeks of grades kept, each kind: "the last four weeks" (ADR-087 §3.1, ruled). */
  keep: 4,
  /** One standard deviation of a week's practice look about his position overall, rating points. */
  practiceNoiseSd: 4,
  /** Game-grade points either side of 50 for winning (or losing) every contest of a full game. */
  gameSpread: 50,
  /** Even contests added to his own when grading a game, so a small sample stays near 50. */
  gamePriorContests: 4,
  /** Snaps for a full-weight game grade, by his side of the ball; fewer snaps pull the grade toward 50. */
  fullSnaps: { offense: 40, defense: 40, special: 10 },
  /** Decimal places a grade keeps, so saves stay tidy. */
  decimals: 1,
} as const;

/** How recent form enters the read and the head coach's view, and when a player sees his own form drop. CHOSEN. */
export const FORM = {
  /** Rating points a run of perfect game grades (100 against an even 50) adds to how he looks. */
  gamePoints: 4,
  /** Weeks of practice his blurred ratings count for in how he looks, so one week's practice does not outweigh them. */
  priorWeeks: 2,
  /** The coordinators' weight on recent looks against the blurred ratings, 0..1. */
  readWeight: 0.5,
  /** The head coach's weight on recent looks = coachMin + coachSpan × form leaning / 100. */
  coachMin: 0.2,
  coachSpan: 0.7,
  /** A game grade at or below this is a bad game: the fiery coach's hook, and the player sees his form drop. */
  badGame: 35,
  /** Game-grade points his newest grades sit below his earlier ones for his form to have dropped. */
  gameDrop: 10,
  /** The same for practice grades, in rating points. */
  practiceDrop: 6,
  /** Grades needed before a drop can show: game grades, and practice grades (three, so one noisy week is not a drop). */
  gameDropGrades: 2,
  practiceDropGrades: 3,
  /** The newest grades compared with the ones before them (one when only two are kept). */
  recentGrades: 2,
} as const;

/** How the head coach decides. CHOSEN. */
export const COACH = {
  /** Rating points a challenger must beat an incumbent by = incumbentMin + incumbentSpan × incumbent leaning / 100. */
  incumbentMin: 0.5,
  incumbentSpan: 5,
  /** The margin between two players in a declared battle (or on a form coach's team): a little, so they do not swap on noise alone. */
  openMargin: 0.5,
  /** Rating points a veteran is worth to him = veteranPoints × veteran leaning / 100. */
  veteranPoints: 3,
  /** A veteran: this many credited seasons (ADR-085 K5), or, where they are not kept, this age. From the ADR-087 build brief. */
  veteranSeasons: 4,
  veteranAge: 27,
  /** Fiery: after a bad game the challenger may be this many points worse and still take the job. */
  quickHookPoints: 2,
  /** A form leaning of this or more opens every spot at camp and keeps it open all season. */
  formCoachFrom: 70,
  /** Camp: a spot is declared open when the coordinator's read has the two within closeMax × (1 − incumbent leaning / 100) points. */
  closeMax: 3,
} as const;

/**
 * Morale (-100..100) the player who loses the spot takes, by situation (E5). CHOSEN, ordered as
 * ruled (F3): open competition and a kept-after-injury both hurt less than a sudden demotion.
 */
export const MORALE_HIT: Readonly<Record<DepthChartSituation, number>> = {
  OPEN_COMPETITION: -2,
  INJURY_COVER: 0,
  STARTER_RETURNS: -1,
  KEPT_AFTER_INJURY: -4,
  FORM: -5,
  SUDDEN: -10,
};

/** The rest of the morale step. CHOSEN, except where marked. */
export const MORALE = {
  /** The lift for the player who gains a spot. */
  lift: 2,
  /** Every delta × (volatilityBase + volatility / 100) (the registry's "rate morale moves in both directions"). */
  volatilityBase: 0.5,
  /** Volatility read when a player has none. */
  typicalVolatility: 50,
  decimals: 2,
  /** PlayerCondition's range (contracts). */
  min: -100,
  max: 100,
} as const;

// ─── The calendar and the sides ───────────────────────────────────────────────────────────────

const POSITIONS = Object.keys(STARTERS) as Position[];
const OFFENSE: ReadonlySet<Position> = new Set(["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
const SPECIAL: ReadonlySet<Position> = new Set(["K", "P", "LS"]);
type Side = "offense" | "defense" | "special";
const sideOf = (p: Position): Side => (OFFENSE.has(p) ? "offense" : SPECIAL.has(p) ? "special" : "defense");
const SIDE_SEAT: Readonly<Record<Side, "OC" | "DC" | "STC">> = { offense: "OC", defense: "DC", special: "STC" };

/** Weeks a team in its year practises (§3's table); in the playoffs, only the teams that played that week (see `weekGrades`). */
const PRACTICE_PHASES: ReadonlySet<CalendarPhase> = new Set(["OFF_ROOKIES_OTAS", "TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON", "PLAYOFFS"]);
/** Weeks the head coach names his starters. */
const DECIDING_PHASES: ReadonlySet<CalendarPhase> = new Set(["TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON", "PLAYOFFS"]);
/** Camp and preseason: every non-injury change is open competition. */
const OPEN_PHASES: ReadonlySet<CalendarPhase> = new Set(["TRAINING_CAMP", "PRESEASON"]);
/** Mid-season, where a benching can be sudden. */
const SEASON_PHASES: ReadonlySet<CalendarPhase> = new Set(["REGULAR_SEASON", "PLAYOFFS"]);

// ─── Small helpers ────────────────────────────────────────────────────────────────────────────

const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const roundTo = (x: number, decimals: number) => {
  const k = 10 ** decimals;
  return Math.round(x * k) / k;
};
/** Plain code-point order, the same on every machine. */
const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const keepLast = (xs: number[]) => xs.slice(-GRADES.keep);

/** The highest-scoring id, ties to the lower id. Undefined when there are none. */
function bestOf(ids: readonly string[], score: (id: string) => number): string | undefined {
  let best: string | undefined;
  for (const id of ids) {
    if (best === undefined) { best = id; continue; }
    const d = score(id) - score(best);
    if (d > 0 || (d === 0 && byId(id, best) < 0)) best = id;
  }
  return best;
}

/** A veteran (§3.1): credited seasons when kept, else age. */
export function isVeteran(p: PlayerState): boolean {
  const seasons = p.bio.creditedSeasons;
  return seasons !== undefined ? seasons >= COACH.veteranSeasons : p.bio.age >= COACH.veteranAge;
}

/** Has his own form dropped, as he can see it: a bad last game, or his newest grades well below his earlier ones. */
export function formDropped(grades: { readonly game: readonly number[]; readonly practice: readonly number[] } | undefined): boolean {
  if (!grades) return false;
  const lastGame = grades.game[grades.game.length - 1];
  if (lastGame !== undefined && lastGame <= FORM.badGame) return true;
  return fell(grades.game, FORM.gameDropGrades, FORM.gameDrop) || fell(grades.practice, FORM.practiceDropGrades, FORM.practiceDrop);
}

/** The newest grades (`FORM.recentGrades`, fewer when few are kept) sit at least `drop` below the ones before them. */
function fell(series: readonly number[], least: number, drop: number): boolean {
  if (series.length < Math.max(2, least)) return false;
  const recent = Math.min(FORM.recentGrades, series.length - 1);
  return mean(series.slice(0, -recent)) - mean(series.slice(-recent)) >= drop;
}

// ─── Grades ───────────────────────────────────────────────────────────────────────────────────

interface GameLine { snaps: number; won: number; lost: number }

/** This week's snaps and contests by player, over every game he played. */
function gameLines(reports: readonly GameParticipation[]): Map<string, GameLine> {
  const lines = new Map<string, GameLine>();
  for (const r of reports) {
    const line = lines.get(String(r.player)) ?? { snaps: 0, won: 0, lost: 0 };
    line.snaps += r.snaps.offense + r.snaps.defense + r.snaps.special;
    for (const c of r.contests) { line.won += c.won; line.lost += c.lost; }
    lines.set(String(r.player), line);
  }
  return lines;
}

/** A game grade, 0..100 (50 = even): contests won against lost, pulled toward even by a small sample or few snaps. */
export function gameGrade(line: { readonly snaps: number; readonly won: number; readonly lost: number }, position: Position): number {
  const weight = Math.min(1, line.snaps / GRADES.fullSnaps[sideOf(position)]);
  const share = (line.won - line.lost) / (line.won + line.lost + GRADES.gamePriorContests);
  return roundTo(clamp(GRADES.even + GRADES.gameSpread * share * weight, GRADES.min, GRADES.max), GRADES.decimals);
}

/** A practice grade: how good he looked this week, his position overall plus seeded noise. */
export function practiceGrade(p: PlayerState, seed: string, at: CalendarStamp): number {
  const rng = createRng(seed, DEPTH_STREAM).fork(`practice/${stampToString(at)}/${String(p.bio.id)}`);
  const look = positionOverall(p.bio.position, p.attributes.values) + GRADES.practiceNoiseSd * normal(rng);
  return roundTo(clamp(look, GRADES.min, GRADES.max), GRADES.decimals);
}

/**
 * This week's grades for every rostered player, added to the last four kept. A player who has left
 * every roster is forgotten; in an offseason week with no practice everyone is. In the playoffs only
 * the teams that played that week practise here: the step cannot tell a team on a bye from one
 * knocked out, so a bye team simply keeps last week's grades.
 */
function weekGrades(
  input: DepthWeekInput, players: ReadonlyMap<string, PlayerState>, lines: ReadonlyMap<string, GameLine>, played: ReadonlySet<string>,
): { grades: PlayerMemory["grades"]; gameThisWeek: Map<string, number> } {
  const { at, seed } = input;
  const practiceWeek = PRACTICE_PHASES.has(at.phase);
  const rostered = new Set(input.teams.flatMap((t) => t.roster.map(String)));
  const grades: PlayerMemory["grades"] = {};
  if (practiceWeek) for (const [id, g] of Object.entries(input.memory.grades)) if (rostered.has(id)) grades[id] = g;
  const gameThisWeek = new Map<string, number>();
  for (const team of input.teams) {
    const practises = practiceWeek && (at.phase !== "PLAYOFFS" || played.has(String(team.id)));
    for (const pid of team.roster) {
      const id = String(pid);
      const p = players.get(id);
      if (!p || p.bio.draft === "PROSPECT") continue;
      const line = lines.get(id);
      const game = line && line.snaps > 0 ? gameGrade(line, p.bio.position) : undefined;
      const practice = practises && p.condition.injury === undefined ? practiceGrade(p, seed, at) : undefined;
      if (game === undefined && practice === undefined) continue;
      if (game !== undefined) gameThisWeek.set(id, game);
      const was = grades[id] ?? { game: [], practice: [] };
      grades[id] = {
        game: game === undefined ? was.game : keepLast([...was.game, game]),
        practice: practice === undefined ? was.practice : keepLast([...was.practice, practice]),
      };
    }
  }
  return { grades, gameThisWeek };
}

// ─── One team ─────────────────────────────────────────────────────────────────────────────────

/** Everything one team's week reads and writes. */
interface TeamWeek {
  readonly input: DepthWeekInput;
  readonly team: Team;
  readonly lineup: Lineup;
  /** A form coach: every spot open all season. */
  readonly formCoach: boolean;
  readonly quickHook: boolean;
  /** Does the head coach name his starters this week? */
  readonly deciding: boolean;
  readonly grades: PlayerMemory["grades"];
  readonly gameThisWeek: ReadonlyMap<string, number>;
  /** The working players: morale moves replace entries. */
  readonly players: Map<string, PlayerState>;
  readonly events: FranchiseEvent[];
  readonly battles: PositionBattle[];
  readonly injuredStarters: InjuredStarter[];
  readonly weeksInJob: Record<string, number>;
  /** Positions where last week's starters are on record (`memory.weeksInJob`), even if they have since gone. */
  readonly recorded: ReadonlySet<string>;
  /** The roster by `bio.position`, in roster order (prospects left out). */
  readonly byPosition: ReadonlyMap<Position, readonly string[]>;
  /** How each player looks to the coordinators (`read`) and to the head coach (`view`), in rating points. */
  readonly look: (id: string) => { read: number; view: number };
}

function makeTeamWeek(
  input: DepthWeekInput, team: Team, seats: ReadonlyMap<string, StaffState>,
  shared: Omit<TeamWeek, "input" | "team" | "lineup" | "formCoach" | "quickHook" | "deciding" | "recorded" | "byPosition" | "look">,
  played: ReadonlySet<string>,
): TeamWeek {
  const { at, seed, ownerTeam } = input;
  const owner = ownerTeam !== undefined && team.id === ownerTeam;
  const lineup = teamLineup(team.id, input.staff, seed, ownerTeam);
  const coachWeight = FORM.coachMin + FORM.coachSpan * lineup.form / 100;
  const veteranPoints = COACH.veteranPoints * lineup.veteran / 100;

  const blur = (p: PlayerState) => {
    const seat = SIDE_SEAT[sideOf(p.bio.position)];
    const coordinator = seats.get(`${String(team.id)}/${seat}`);
    const skill = coordinator?.attributes["talentEvaluation"] ?? READ_BLUR.absentSkill;
    const sd = READ_BLUR.min + READ_BLUR.span * (1 - skill / 100);
    const lens = coordinator ? String(coordinator.id) : `${String(team.id)}:${seat}`;
    return sd * normal(createRng(seed, DEPTH_STREAM).fork(`blur/${at.season}/${lens}/${String(p.bio.id)}`));
  };
  const seen = new Map<string, { read: number; view: number }>();
  const look = (id: string) => {
    const known = seen.get(id);
    if (known) return known;
    const p = shared.players.get(id)!;
    const rating = positionOverall(p.bio.position, p.attributes.values) + blur(p);
    const g = shared.grades[id];
    const seenPractice = g ? g.practice : [];
    const practice = (seenPractice.reduce((sum, x) => sum + x, 0) + FORM.priorWeeks * rating) / (seenPractice.length + FORM.priorWeeks);
    const game = g && g.game.length > 0 ? FORM.gamePoints * (mean(g.game) - GRADES.even) / (GRADES.max - GRADES.even) : 0;
    const looks = practice + game;
    const v = {
      read: (1 - FORM.readWeight) * rating + FORM.readWeight * looks,
      view: (1 - coachWeight) * rating + coachWeight * looks + (isVeteran(p) ? veteranPoints : 0),
    };
    seen.set(id, v);
    return v;
  };

  const byPosition = new Map<Position, string[]>();
  for (const pid of team.roster) {
    const p = shared.players.get(String(pid));
    if (!p || p.bio.draft === "PROSPECT") continue;
    const list = byPosition.get(p.bio.position);
    if (list) list.push(String(pid));
    else byPosition.set(p.bio.position, [String(pid)]);
  }
  const prefix = `${String(team.id)}/`;
  const recorded = new Set(Object.keys(input.memory.weeksInJob).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length).split("/")[0]!));

  return {
    ...shared, input, team, lineup, look, recorded, byPosition,
    formCoach: lineup.form >= COACH.formCoachFrom,
    quickHook: !owner && hasQuickHook(headCoachOf(team.id, input.staff)),
    deciding: DECIDING_PHASES.has(at.phase) && (at.phase !== "PLAYOFFS" || played.has(String(team.id))),
  };
}

/** Move a player's morale by a situation's amount, scaled by his true volatility, and say so. */
function moveMorale(t: TeamWeek, id: string, amount: number, reason: DepthChartSituation): void {
  if (amount === 0) return;
  const p = t.players.get(id)!;
  const volatility = getAttr(p.attributes.values, attrId("volatility"), MORALE.typicalVolatility);
  const delta = roundTo(amount * (MORALE.volatilityBase + volatility / 100), MORALE.decimals);
  if (delta === 0) return;
  const morale = roundTo(clamp(p.condition.morale + delta, MORALE.min, MORALE.max), MORALE.decimals);
  t.players.set(id, { ...p, condition: { ...p.condition, morale } });
  t.events.push({ type: "MORALE_CHANGED", payload: { player: p.bio.id, delta, reason } });
}

/** A labelled chart change (E5), then its morale: the hit for the one who lost the spot, the lift for the one who gained it. */
function change(t: TeamWeek, position: Position, situation: DepthChartSituation, up: string | undefined, down: string | undefined): void {
  const pid = (id: string): PlayerId => t.players.get(id)!.bio.id;
  t.events.push({
    type: "DEPTH_CHART_CHANGED",
    payload: {
      team: t.team.id, position,
      ...(up !== undefined ? { up: pid(up) } : {}),
      ...(down !== undefined ? { down: pid(down) } : {}),
      situation, authority: "COACH", decidedBy: "NPC",
    },
  });
  if (down !== undefined) moveMorale(t, down, MORALE_HIT[situation], situation);
  if (up !== undefined) moveMorale(t, up, MORALE.lift, situation);
}

/** One position's week: who starts, the order below, and every labelled change. Returns the new chart. */
function positionWeek(t: TeamWeek, position: Position): PlayerId[] {
  const { team, input } = t;
  const { at, rules, memory } = input;
  const n = STARTERS[position];
  const here = t.byPosition.get(position) ?? [];
  const onRoster = new Set(here);
  const available = here.filter((id) => isAvailable(t.players.get(id)!));
  const isFit = new Set(available);
  const byRead = (ids: readonly string[]) => [...ids].sort((a, b) => t.look(b).read - t.look(a).read || byId(a, b));
  const chartOf = (slots: readonly (string | undefined)[]) => {
    const starters = slots.filter((id): id is string => id !== undefined);
    const rest = byRead(available.filter((id) => !starters.includes(id)));
    return [...starters, ...rest].map((id) => t.players.get(id)!.bio.id);
  };
  if (n === 0) return chartOf([]);

  const jobKey = (id: string) => `${String(team.id)}/${position}/${id}`;
  const oldChart = (team.depthChart[position] ?? []).map(String).filter((id) => onRoster.has(id));
  const chartIndex = (id: string) => { const i = oldChart.indexOf(id); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
  const held = here.filter((id) => memory.weeksInJob[jobKey(id)] !== undefined).sort((a, b) => chartIndex(a) - chartIndex(b) || byId(a, b));
  const incumbents = (t.recorded.has(position) ? held : oldChart).slice(0, n);

  // Slots: each incumbent keeps his slot while fit; an injured one leaves a hole for his cover.
  const slots: (string | undefined)[] = incumbents.map((id) => (isFit.has(id) ? id : undefined));
  const placed = new Set<string>();
  const benched = new Set<string>();
  const battle = memory.battles.find((b) => b.team === team.id && b.position === position);
  const inBattle = (b: PositionBattle | undefined, ...ids: string[]) => b !== undefined && ids.every((id) => b.players.map(String).includes(id));
  const challengers = () => available.filter((id) => !slots.includes(id));
  const free = () => { const i = slots.indexOf(undefined); return i >= 0 ? i : slots.length < n ? slots.length : -1; };

  // 1. Starters back from injury: their job back (STARTER_RETURNS) or the cover keeps it (KEPT_AFTER_INJURY).
  for (const entry of memory.injuredStarters) {
    if (entry.team !== team.id || entry.position !== position) continue;
    const back = String(entry.player);
    if (!onRoster.has(back)) continue;
    if (!isFit.has(back)) { t.injuredStarters.push(entry); continue; }
    if (slots.includes(back)) continue;
    const cover = String(entry.cover);
    // A free place first (the place of a starter hurt this week, or one never filled): nobody loses it.
    const hole = slots.indexOf(undefined);
    if (hole >= 0 || slots.length < n) {
      if (hole >= 0) slots[hole] = back;
      else slots.push(back);
      placed.add(back);
      change(t, position, "STARTER_RETURNS", back, undefined);
      continue;
    }
    // Else his cover, or (cover gone) the weakest starter; never one already settled this week.
    const unsettled = slots.filter((id): id is string => id !== undefined && !placed.has(id));
    const target = unsettled.includes(cover) ? cover : bestOf(unsettled, (id) => -t.look(id).view);
    // Every place was settled this week (another starter came back to it): his return is decided next week.
    if (target === undefined) { t.injuredStarters.push(entry); continue; }
    const margin = t.formCoach || inBattle(battle, back, target) ? COACH.openMargin : incumbentMargin(t);
    if (t.look(target).view > t.look(back).view + margin) {
      // The cover keeps the job: it is settled for the week.
      placed.add(target); benched.add(back);
      change(t, position, "KEPT_AFTER_INJURY", target, back);
    } else {
      slots[slots.indexOf(target)] = back; placed.add(back); benched.add(target);
      change(t, position, "STARTER_RETURNS", back, target);
    }
  }

  // 2. Starters hurt: the best of the rest moves up (INJURY_COVER), and the starter is remembered for his return.
  //    Where a starter back from injury has already taken the place (1.), he is the cover; his return said so.
  incumbents.forEach((id, i) => {
    if (isFit.has(id)) return;
    const filler = slots[i];
    if (filler !== undefined) {
      t.injuredStarters.push({ team: team.id, position, player: t.players.get(id)!.bio.id, cover: t.players.get(filler)!.bio.id, since: at });
      return;
    }
    const cover = bestOf(challengers(), (c) => t.look(c).view);
    if (cover === undefined) return;
    slots[i] = cover; placed.add(cover);
    t.injuredStarters.push({ team: team.id, position, player: t.players.get(id)!.bio.id, cover: t.players.get(cover)!.bio.id, since: at });
    change(t, position, "INJURY_COVER", cover, id);
  });

  // 3. A spot left by a player who has gone, or never filled: the best of the rest, unlabelled.
  for (let i = free(); i >= 0; i = free()) {
    const next = bestOf(challengers(), (c) => t.look(c).view);
    if (next === undefined) break;
    slots[i] = next; placed.add(next);
  }

  // A starter hurt with nobody to cover him keeps his place on record (his weeks not counted), so
  // whoever can fill it later (an emergency signing) moves up as his cover and his return is labelled.
  incumbents.forEach((id, i) => {
    if (!isFit.has(id) && slots[i] === undefined) t.weeksInJob[jobKey(id)] = memory.weeksInJob[jobKey(id)] ?? 0;
  });

  // 4. Camp opens: declare the spot open where the coordinator rates two close (every spot, for a form coach).
  let open = battle;
  if (t.deciding && open === undefined && at.phase === "TRAINING_CAMP" && at.week === 1) {
    open = declareBattle(t, position, slots, byRead(challengers()));
  }

  // 5. The head coach's call on each healthy starter.
  if (t.deciding) decide(t, position, available, slots, placed, benched, open);

  // 6. A battle ends when he names a starter.
  if (open !== undefined) {
    const ends = !DECIDING_PHASES.has(at.phase)
      || (!t.formCoach && (SEASON_PHASES.has(at.phase) || (at.phase === "PRESEASON" && at.week >= phaseWeeks("PRESEASON", rules))));
    if (!ends) t.battles.push(open);
    else {
      const filled = slots.filter((id): id is string => id !== undefined);
      const starter = [...filled].reverse().find((id) => inBattle(open, id)) ?? filled[filled.length - 1];
      if (starter !== undefined) {
        t.events.push({ type: "POSITION_BATTLE_ENDED", payload: { team: team.id, position, starter: t.players.get(starter)!.bio.id, authority: "COACH", decidedBy: "NPC" } });
      }
    }
  }

  for (const id of slots) if (id !== undefined) t.weeksInJob[jobKey(id)] = (memory.weeksInJob[jobKey(id)] ?? 0) + 1;
  return chartOf(slots);
}

/** Points a challenger must beat this coach's incumbent by. */
const incumbentMargin = (t: TeamWeek) => COACH.incumbentMin + COACH.incumbentSpan * t.lineup.incumbent / 100;

/**
 * At camp: a form coach opens every spot with more fit players than starters, the whole room in the
 * battle; any other coach opens a spot when his coordinator reads the weakest starter and the best of
 * the rest within his closeness, which shrinks as he leans to incumbents.
 */
function declareBattle(t: TeamWeek, position: Position, slots: readonly (string | undefined)[], rest: readonly string[]): PositionBattle | undefined {
  const starters = slots.filter((id): id is string => id !== undefined);
  if (starters.length === 0 || rest.length === 0) return undefined;
  let players: string[];
  if (t.formCoach) players = [...starters, ...rest];
  else {
    const weakest = bestOf(starters, (id) => -t.look(id).read)!;
    const challenger = rest[0]!;
    const close = COACH.closeMax * (1 - t.lineup.incumbent / 100);
    if (Math.abs(t.look(challenger).read - t.look(weakest).read) > close) return undefined;
    players = [weakest, challenger];
  }
  const ids = players.map((id) => t.players.get(id)!.bio.id);
  t.events.push({ type: "POSITION_BATTLE_DECLARED", payload: { team: t.team.id, position, players: ids, authority: "COACH", decidedBy: "NPC" } });
  return { team: t.team.id, position, players: ids, declared: t.input.at };
}

/**
 * The head coach's call: while the best challenger (by his view) beats the starter he would most
 * readily drop, by that starter's margin, they swap. The margin: small in a declared battle or on a
 * form coach's team, else his incumbent margin; after a bad game a fiery coach's hook turns it
 * against the starter. Players moved or kept this week stay where they are until next week.
 */
function decide(
  t: TeamWeek, position: Position, available: readonly string[], slots: (string | undefined)[], placed: Set<string>, benched: Set<string>,
  battle: PositionBattle | undefined,
): void {
  const { at } = t.input;
  const inBattle = (...ids: string[]) => battle !== undefined && ids.every((id) => battle.players.map(String).includes(id));
  for (let round = 0; round < slots.length; round++) {
    const challenger = bestOf(available.filter((id) => !slots.includes(id) && !benched.has(id)), (id) => t.look(id).view);
    if (challenger === undefined) return;
    const contestable = slots.filter((id): id is string => id !== undefined && !placed.has(id));
    const keep = (id: string) => {
      const hooked = t.quickHook && (t.gameThisWeek.get(id) ?? Infinity) <= FORM.badGame;
      const margin = hooked ? -COACH.quickHookPoints
        : t.formCoach || inBattle(id, challenger) ? COACH.openMargin
        : incumbentMargin(t);
      return t.look(id).view + margin;
    };
    const starter = bestOf(contestable, (id) => -keep(id));
    if (starter === undefined || t.look(challenger).view <= keep(starter)) return;
    slots[slots.indexOf(starter)] = challenger;
    placed.add(challenger); benched.add(starter);
    // The label is what the benched player can see: a spot declared open (on a form coach's team every
    // spot, all season, whoever the challenger is), else his own form.
    const situation: DepthChartSituation = OPEN_PHASES.has(at.phase) || battle !== undefined ? "OPEN_COMPETITION"
      : formDropped(t.grades[starter]) ? "FORM"
      : "SUDDEN";
    change(t, position, situation, challenger, starter);
  }
}

/** The sitting coordinators and head coaches, by `team/seat`. */
function seatMap(staff: readonly StaffState[] | undefined): Map<string, StaffState> {
  const seats = new Map<string, StaffState>();
  for (const s of staff ?? []) {
    const seat = seatOf(s);
    const team = currentJob(s)?.team;
    if (seat === undefined || team === undefined) continue;
    const key = `${String(team)}/${seat}`;
    if (!seats.has(key)) seats.set(key, s);
  }
  return seats;
}

/** The new chart, keeping the old one's key order; the same team object when nothing moved. */
function withChart(team: Team, listed: ReadonlyMap<Position, PlayerId[]>): Team {
  const keys = [...Object.keys(team.depthChart) as Position[], ...POSITIONS.filter((p) => !(p in team.depthChart) && (listed.get(p)?.length ?? 0) > 0)];
  const chart: Team["depthChart"] = {};
  let same = keys.length === Object.keys(team.depthChart).length;
  for (const pos of keys) {
    const ids = listed.get(pos) ?? [];
    chart[pos] = ids;
    const was = team.depthChart[pos];
    if (!was || was.length !== ids.length || was.some((id, i) => id !== ids[i])) same = false;
  }
  return same ? team : { ...team, depthChart: chart };
}

// ─── The week ─────────────────────────────────────────────────────────────────────────────────

/** One week's depth charts for every team (§3.1). */
export function depthChartWeek(input: DepthWeekInput): DepthWeekResult {
  const players = new Map(input.players.map((p) => [String(p.bio.id), p]));
  const lines = gameLines(input.reports);
  const played = new Set(input.reports.map((r) => String(r.team)));
  const { grades, gameThisWeek } = weekGrades(input, players, lines, played);
  const seats = seatMap(input.staff);
  const events: FranchiseEvent[] = [];
  const battles: PositionBattle[] = [];
  const injuredStarters: InjuredStarter[] = [];
  const weeksInJob: Record<string, number> = {};
  const shared = { grades, gameThisWeek, players, events, battles, injuredStarters, weeksInJob };

  const teams = input.teams.map((team) => {
    const t = makeTeamWeek(input, team, seats, shared, played);
    const listed = new Map<Position, PlayerId[]>();
    for (const position of POSITIONS) listed.set(position, positionWeek(t, position));
    return withChart(team, listed);
  });

  return {
    teams,
    players: input.players.map((p) => players.get(String(p.bio.id))!),
    events,
    memory: { ...input.memory, grades, battles, injuredStarters, weeksInJob },
  };
}
