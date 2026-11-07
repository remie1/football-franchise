/**
 * ADR-094 §3-§6 (build step 3): the weekly read, the stance, the argument and the souring.
 *
 * After every regular-season week's games (but the last), each computer team's GM and head coach
 * each guess the team's chance of making the playoffs: the true chance (`playoffChance`, measured
 * from our own league's seasons, Q6 a) pushed by a miss that shrinks with his forecasting and
 * performance analysis. Each picks BUY, HOLD or SELL against bars his working lean moves (§4). When
 * the two differ they argue (§5): heat by the meeting's formula, the winner on politics and dice, the
 * GM decides, and a winning coach whose GM thinks well of him (view 20 and up) is met one step (Q3 b).
 * The views sour (§6) through the ledger's moves; Q4 a: a split's first argument costs in full, a
 * repeat only when it is hotter, the gap is wider, or every fourth week the split lasts.
 *
 * Q4 a needs last week's argument. Rather than keep it anywhere new, it is worked out again from
 * what the season already holds (its results and the men seated now), with the same dice, so a
 * season stopped and carried on, or saved and loaded, plays the same. Whether the two split, and how
 * far, comes out exactly as it did (stances read no views); the heat of the weeks compared is read
 * against the two men's views as they stand today, so "hotter" means hotter by temper, gap, job
 * pressure and dice, not by last week's souring.
 *
 * The stance sets `Team.stance` (W1, the GM's call) and changes nothing in play: no trade system
 * reads it yet. `Team.direction` is untouched (Q5 a).
 *
 * The user's team is left out until the user has a screen for it. Rates CHOSEN unless marked.
 */
import {
  createRng,
  type CalendarStamp, type FranchiseEvent, type RelationshipView, type SeasonState, type StaffState, type Team,
  type TeamId, type TeamStance, type WinLossTie,
} from "@ff/contracts";
import { HEAT, TEMPER } from "../meeting/clash.js";
import { applyMove, viewKey, type MoveRequest, type RelationshipContext } from "../relationships/ledger.js";
import { rating } from "../staff/ratings.js";
import { logistic, normal, seatOf, type StaffWorld } from "../staff/world.js";
import { winNowLean } from "./lean.js";
import { gmPressure, headCoachPressure, workingLean } from "./pressure.js";

export const STANCE = {
  /** §4: the bars at working lean 50 (a chance at or above `buy` buys, below `sell` sells), and their move per point of lean. */
  buy: 0.5,
  sell: 0.2,
  perLeanPoint: 0.003,
  /** §3: a man's miss, in log-odds (sd), at read skill 25; a strong man's (85) is 25% smaller (outlook Q2 b). */
  missAt25: 0.6,
  missAt85: 0.45,
  /** §3: how much of last week's miss stays in this week's. */
  carry: 0.8,
  /** Q3 b: the GM meets a winning coach one step when his view of him is at least this. */
  meetHalfwayView: 20,
  /** §5: the coach's job is on the line above this pressure. */
  jobOnLine: 0.5,
  /** Q4 a: a split's repeat argument costs anyway every this many weeks. */
  repeatEvery: 4,
};

/**
 * Q6 a: the chance of making the playoffs from a record with games left, MEASURED from our own
 * league's seasons (ADR-094 build record): a logistic in the wins a team is on course for (its pace
 * so far, pulled toward .500 as if it had played `shrink` more games at .500), its spread shrinking
 * as the games run out.
 */
export const PLAYOFF_ODDS = { center: 8.93, scale: 0.46, perGameLeft: 0.11, shrink: 17.6 };

export function playoffChance(record: WinLossTie, gamesLeft: number): number {
  const wins = record.wins + record.ties / 2;
  const played = record.wins + record.losses + record.ties;
  const onCourse = wins + gamesLeft * (wins + PLAYOFF_ODDS.shrink / 2) / (played + PLAYOFF_ODDS.shrink);
  const spread = Math.sqrt(PLAYOFF_ODDS.scale * PLAYOFF_ODDS.scale + PLAYOFF_ODDS.perGameLeft * gamesLeft);
  return logistic((onCourse - PLAYOFF_ODDS.center) / spread);
}

/** §3: a man's read skill for the team's chances: forecasting and performance analysis, half each. */
export const readSkill = (s: Pick<StaffState, "attributes">): number =>
  (rating(s.attributes, "forecasting") + rating(s.attributes, "performanceAnalysis")) / 2;

export function missSd(skill: number): number {
  const f = (skill - 25) / 60;
  return Math.max(0.2, STANCE.missAt25 + f * (STANCE.missAt85 - STANCE.missAt25));
}

const logit = (p: number): number => Math.log(Math.max(1e-6, p) / Math.max(1e-6, 1 - p));

/**
 * His guess of the chance: the truth pushed in log-odds by his own miss. One draw per man, team and
 * week, but a man's read carries over: this week's miss is `carry` of last week's plus a fresh part,
 * so he holds an opinion rather than flipping with every draw (CHOSEN). Worked out from week 1 each
 * time, so it needs nothing kept.
 */
export function guessChance(man: StaffState, truth: number, seed: string, season: number, week: number, team: TeamId): number {
  const rho = STANCE.carry;
  let z = 0;
  for (let w = 1; w <= week; w++) {
    const e = normal(createRng(seed, `franchise:winNow/read/${season}/${w}/${String(team)}/${String(man.id)}`));
    z = w === 1 ? e : rho * z + Math.sqrt(1 - rho * rho) * e;
  }
  return logistic(logit(truth) + missSd(readSkill(man)) * z);
}

/** §4: his stance from his guess and his working lean. */
export function stanceFor(guess: number, lean: number): TeamStance {
  const shift = STANCE.perLeanPoint * (lean - 50);
  if (guess >= STANCE.buy - shift) return "BUY";
  if (guess < STANCE.sell - shift) return "SELL";
  return "HOLD";
}

const ORDER: readonly TeamStance[] = ["SELL", "HOLD", "BUY"];
export const stepsBetween = (a: TeamStance, b: TeamStance): number => Math.abs(ORDER.indexOf(a) - ORDER.indexOf(b));
/** Q3 b: one step from `from` toward `to`. */
export const stepToward = (from: TeamStance, to: TeamStance): TeamStance => {
  const i = ORDER.indexOf(from), j = ORDER.indexOf(to);
  return ORDER[i + Math.sign(j - i)]!;
};
const HEAT_RANK = { POLITE: 0, OPEN_ARGUMENT: 1, RIFT: 2 } as const;
type Heat = keyof typeof HEAT_RANK;

/** Each team's record and games left after a given regular-season week, from the season's results. */
export function recordsAfter(state: SeasonState, week: number): Map<string, { record: WinLossTie; left: number }> {
  const weekOf = new Map(state.schedule.games.filter((g) => g.kind === "REGULAR").map((g) => [String(g.gameId), g.at.week]));
  const out = new Map<string, { record: WinLossTie; left: number }>();
  const row = (t: string) => {
    let r = out.get(t);
    if (!r) { r = { record: { wins: 0, losses: 0, ties: 0 }, left: 0 }; out.set(t, r); }
    return r;
  };
  for (const g of state.schedule.games) if (g.kind === "REGULAR" && g.at.week > week) { row(String(g.home)).left++; row(String(g.away)).left++; }
  for (const r of state.results) {
    const w = weekOf.get(String(r.gameId));
    if (w === undefined || w > week) continue;
    const h = row(String(r.home)).record, a = row(String(r.away)).record;
    if (r.homeScore === r.awayScore) { h.ties++; a.ties++; }
    else if (r.homeScore > r.awayScore) { h.wins++; a.losses++; } else { a.wins++; h.losses++; }
  }
  return out;
}

export interface WeekRead {
  gmStance: TeamStance;
  coachStance: TeamStance;
  /** Set when they differ. */
  argument?: { heat: Heat; steps: number; winner?: "GM" | "COACH"; outcome: TeamStance };
  outcome: TeamStance;
}

interface Pair { team: Team; gm: StaffState; hc: StaffState; president: StaffState }

/** One pair's read and argument for one week. Pure; every roll from the season, week, team and man. */
function readWeek(
  p: Pair, week: number, rec: { record: WinLossTie; left: number }, input: { seed: string; season: number; teamCount: number },
  views: ReadonlyMap<string, number>, contractEnds: (s: StaffState) => boolean,
): WeekRead {
  const truth = playoffChance(rec.record, rec.left);
  const now = { season: input.season, record: rec.record, teamCount: input.teamCount, presidentTalent: rating(p.president.attributes, "talentEvaluation") };
  const hcPressure = headCoachPressure(p.hc, { ...now, lastContractYear: contractEnds(p.hc) });
  const gmLean = workingLean(winNowLean(p.gm, input.seed), gmPressure(p.gm, { ...now, lastContractYear: contractEnds(p.gm) }));
  const hcLean = workingLean(winNowLean(p.hc, input.seed), hcPressure);
  const gmStance = stanceFor(guessChance(p.gm, truth, input.seed, input.season, week, p.team.id), gmLean);
  const coachStance = stanceFor(guessChance(p.hc, truth, input.seed, input.season, week, p.team.id), hcLean);
  if (gmStance === coachStance) return { gmStance, coachStance, outcome: gmStance };
  const steps = stepsBetween(gmStance, coachStance);
  const rng = createRng(input.seed, `franchise:winNow/argue/${input.season}/${week}/${String(p.team.id)}`);
  const gmOfHc = views.get(viewKey(p.gm.id, { staff: p.hc.id }));
  const hcOfGm = views.get(viewKey(p.hc.id, { staff: p.gm.id }));
  const lower = gmOfHc === undefined || hcOfGm === undefined ? 0 : Math.min(gmOfHc, hcOfGm);
  const heatValue = TEMPER[p.gm.personalityType] + TEMPER[p.hc.personalityType] + HEAT.perStep * steps
    + (hcPressure > STANCE.jobOnLine ? HEAT.jobOnLine : 0) + Math.max(0, -lower) * HEAT.perColdPoint + HEAT.noise * normal(rng);
  const heat: Heat = heatValue >= HEAT.rift ? "RIFT" : heatValue >= HEAT.open ? "OPEN_ARGUMENT" : "POLITE";
  const lead = rating(p.gm.attributes, "politics") - rating(p.hc.attributes, "politics") + 10 * normal(rng);
  const winner = Math.abs(lead) >= HEAT.politicsMargin ? (lead > 0 ? "GM" as const : "COACH" as const) : undefined;
  // The GM decides; Q3 b: a winning coach he thinks well of is met one step.
  const outcome = winner === "COACH" && (gmOfHc ?? 0) >= STANCE.meetHalfwayView ? stepToward(gmStance, coachStance) : gmStance;
  return { gmStance, coachStance, argument: { heat, steps, ...(winner ? { winner } : {}), outcome }, outcome };
}

export interface WeeklyStanceInput {
  world: StaffWorld;
  teams: readonly Team[];
  /** The season so far: each week's records are read from its results (`recordsAfter`). */
  state?: SeasonState;
  /** Or, where no season state is kept (the staff check's stand-in seasons), each team's record and games left after a week. */
  recordsAt?: (week: number) => ReadonlyMap<string, { record: WinLossTie; left: number }>;
  season: number;
  /** The regular-season week just played, and how many there are. */
  week: number;
  weeks: number;
  at: CalendarStamp;
  seed: string;
  views?: readonly RelationshipView[];
  context?: RelationshipContext;
}

export interface WeeklyStanceResult {
  /** Teams with their stance set (the input's teams where nothing changed). */
  teams: Team[];
  events: FranchiseEvent[];
  views?: RelationshipView[];
  /** Each computer team's read this week, for checks. */
  reads: Map<string, WeekRead>;
}

/** §3-§6 for one week. */
export function weeklyStance(input: WeeklyStanceInput): WeeklyStanceResult {
  const { season, week, seed } = input;
  const reads = new Map<string, WeekRead>();
  if (week >= input.weeks) return { teams: [...input.teams], events: [], ...(input.views ? { views: [...input.views] } : {}), reads };
  const ctx = input.context ?? {};
  const byId = new Map(input.world.staff.map((s) => [String(s.id), s]));
  const viewScores = new Map((input.views ?? []).map((v) => [viewKey(v.from, v.of), v.score]));
  const contractEnds = (s: StaffState) => input.world.contracts.some((c) => c.staff === s.id && c.terminated === undefined && c.lastSeason === season);
  const teamCount = input.teams.length;
  const recordsCache = new Map<number, ReadonlyMap<string, { record: WinLossTie; left: number }>>();
  const records = (w: number) => {
    let r = recordsCache.get(w);
    if (!r) {
      if (input.recordsAt) r = input.recordsAt(w);
      else if (input.state) r = recordsAfter(input.state, w);
      else throw new Error("weeklyStance needs the season's state or its records");
      recordsCache.set(w, r);
    }
    return r;
  };

  const events: FranchiseEvent[] = [];
  let views = input.views ? [...input.views] : undefined;
  const teams = input.teams.map((team) => {
    if (team.id === ctx.userTeam) return team;
    const staffTeam = input.world.teams.find((t) => t.id === team.id);
    const members = (staffTeam?.staff ?? []).map((id) => byId.get(String(id))!).filter(Boolean);
    const gm = members.find((s) => s.role === "GM");
    const hc = members.find((s) => seatOf(s) === "HEAD_COACH");
    const president = members.find((s) => s.role === "PRESIDENT");
    if (!gm || !hc || !president) return team;
    const pair: Pair = { team, gm, hc, president };
    const rec = records(week).get(String(team.id));
    if (!rec) return team;
    const read = readWeek(pair, week, rec, { seed, season, teamCount }, viewScores, contractEnds);
    reads.set(String(team.id), read);

    if (read.argument) {
      const a = read.argument;
      events.push({
        type: "COURSE_ARGUED",
        payload: {
          team: team.id, season, week, gm: gm.id, coach: hc.id, gmStance: read.gmStance, coachStance: read.coachStance,
          heat: a.heat, ...(a.winner ? { winner: a.winner === "GM" ? gm.id : hc.id } : {}), outcome: a.outcome,
        },
      });
      if (views && costsThisWeek(pair, week, a, (w) => records(w).get(String(team.id)), { seed, season, teamCount }, viewScores, contractEnds, input.world.contracts)) {
        const moves: MoveRequest[] = [];
        const move = a.heat === "POLITE" ? "POLITE_DISAGREEMENT" as const : "OPEN_ARGUMENT" as const;
        const losers = a.heat === "RIFT" ? (a.winner === undefined ? [gm.id, hc.id] : [a.winner === "GM" ? hc.id : gm.id]) : [];
        moves.push({ move, from: gm.id, of: { staff: hc.id }, ...(losers.includes(gm.id) ? { openRift: true } : {}) });
        moves.push({ move, from: hc.id, of: { staff: gm.id }, ...(losers.includes(hc.id) ? { openRift: true } : {}) });
        // §6: the man whose course was not taken is overruled.
        if (a.outcome !== read.coachStance) moves.push({ move: "OVERRULED_ON_COURSE", from: hc.id, of: { staff: gm.id } });
        for (const m of moves) {
          if (!views.some((v) => viewKey(v.from, v.of) === viewKey(m.from, m.of))) continue;
          const r = applyMove(views, m, input.world, input.at, ctx);
          views = r.views;
          events.push(...r.events.map((e) => e.event));
        }
      }
    }
    if (team.stance === read.outcome) return team;
    events.push({ type: "TEAM_STANCE_SET", payload: { team: team.id, season, week, stance: read.outcome, authority: "GM" } });
    return { ...team, stance: read.outcome };
  });
  return { teams, events, ...(views ? { views } : {}), reads };
}

/**
 * Q4 a: does this week's argument cost? Yes when it opens a split, is hotter or wider than last
 * week's, or falls on every fourth week of the split. Earlier weeks are read again with the same dice
 * and today's views, back to the first week both men sat together this season.
 */
function costsThisWeek(
  p: Pair, week: number, now: NonNullable<WeekRead["argument"]>,
  recordAt: (w: number) => { record: WinLossTie; left: number } | undefined,
  input: { seed: string; season: number; teamCount: number }, views: ReadonlyMap<string, number>, contractEnds: (s: StaffState) => boolean,
  contracts: StaffWorld["contracts"],
): boolean {
  const since = Math.max(seatedWeek(p.gm, p.team.id, input.season, contracts), seatedWeek(p.hc, p.team.id, input.season, contracts));
  let length = 0;
  let last: WeekRead["argument"];
  for (let w = week - 1; w >= since; w--) {
    const rec = recordAt(w);
    if (!rec) break;
    const r = readWeek(p, w, rec, input, views, contractEnds);
    if (!r.argument) break;
    if (length === 0) last = r.argument;
    length++;
  }
  if (length === 0 || !last) return true;
  return HEAT_RANK[now.heat] > HEAT_RANK[last.heat] || now.steps > last.steps || length % STANCE.repeatEvery === 0;
}

/** The first regular-season week a man was in this seat: the week he was seated in midseason, or 1. */
function seatedWeek(man: StaffState, team: TeamId, season: number, contracts: StaffWorld["contracts"]): number {
  const c = contracts.find((x) => x.staff === man.id && x.team === team && x.terminated === undefined);
  return c && c.signedAt.phase === "REGULAR_SEASON" && c.signedAt.season === season ? c.signedAt.week : 1;
}
