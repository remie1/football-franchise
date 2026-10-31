/**
 * ADR-081 point 1, the truth side: were we lucky?
 *
 * A team's record against what its points say it should have been. Regular-season games only (the
 * playoffs are too few and the opponents too strong to read luck from).
 *  - Expected wins: the Pythagorean share of points, `PF^e / (PF^e + PA^e)`, times games played.
 *    e = 2.37 is the exponent usually fitted to the NFL (Football Outsiders; REPORTED).
 *  - One-score games (decided by 8 points or fewer): the record in them, which is mostly luck.
 *  - Schedule strength: the opponents' win share in their other games.
 * Verdict (owner's Q3): luckier than the record says, unluckier, or exactly as good as the record.
 * "Exactly as good" is a gap under `LUCK.evenWins` wins; CHOSEN, provenance NONE, tuned at M5.
 */
import type { GameResult, SeasonState, TeamId } from "@ff/contracts";

export const LUCK = {
  /** The Pythagorean exponent for the NFL (REPORTED). */
  exponent: 2.37,
  /** A one-score game: decided by this many points or fewer. */
  oneScore: 8,
  /** Wins above or below expectation still read as "exactly as good as our record" (CHOSEN). */
  evenWins: 1,
} as const;

export type LuckVerdict = "LUCKY" | "UNLUCKY" | "EVEN";

export interface TeamLuck {
  team: TeamId;
  games: number;
  /** Wins, ties counted as half. */
  wins: number;
  expectedWins: number;
  /** wins − expectedWins: above 0, the record flatters the team. */
  gap: number;
  pointsFor: number;
  pointsAgainst: number;
  oneScore: { wins: number; losses: number; ties: number };
  /** Opponents' win share in their games against everyone else, 0..1. */
  scheduleStrength: number;
  verdict: LuckVerdict;
}

/** The Pythagorean share of games a team with these points should win, 0..1 (0.5 with no points at all). */
export function pythagorean(pointsFor: number, pointsAgainst: number, exponent: number = LUCK.exponent): number {
  if (pointsFor <= 0 && pointsAgainst <= 0) return 0.5;
  const f = Math.pow(Math.max(pointsFor, 0), exponent);
  const a = Math.pow(Math.max(pointsAgainst, 0), exponent);
  return f / (f + a);
}

export function verdictOf(gap: number, even: number = LUCK.evenWins): LuckVerdict {
  return gap > even ? "LUCKY" : gap < -even ? "UNLUCKY" : "EVEN";
}

/** Every team's luck in a season's regular-season games, in standings order. */
export function seasonLuck(state: SeasonState): TeamLuck[] {
  const regular = new Set(state.schedule.games.filter((g) => g.kind === "REGULAR").map((g) => String(g.gameId)));
  const games = state.results.filter((r) => regular.has(String(r.gameId)));
  const byTeam = new Map<string, GameResult[]>();
  for (const r of games) {
    for (const t of [r.home, r.away]) {
      const list = byTeam.get(String(t)) ?? [];
      list.push(r);
      byTeam.set(String(t), list);
    }
  }
  const side = (r: GameResult, t: string) => (String(r.home) === t
    ? { for: r.homeScore, against: r.awayScore, opp: String(r.away) }
    : { for: r.awayScore, against: r.homeScore, opp: String(r.home) });
  const share = (w: number, l: number, tie: number) => (w + l + tie === 0 ? 0.5 : (w + tie / 2) / (w + l + tie));

  return state.standings.map((row) => {
    const t = String(row.team);
    const mine = byTeam.get(t) ?? [];
    let pf = 0, pa = 0, w = 0, l = 0, tie = 0;
    const one = { wins: 0, losses: 0, ties: 0 };
    const opponents: string[] = [];
    for (const r of mine) {
      const s = side(r, t);
      pf += s.for; pa += s.against;
      opponents.push(s.opp);
      const won = s.for > s.against, lost = s.for < s.against;
      if (won) w++; else if (lost) l++; else tie++;
      if (Math.abs(s.for - s.against) <= LUCK.oneScore) {
        if (won) one.wins++; else if (lost) one.losses++; else one.ties++;
      }
    }
    // Opponents' record in their other games: drop the games against this team.
    let ow = 0, ol = 0, ot = 0;
    for (const o of opponents) {
      for (const r of byTeam.get(o) ?? []) {
        const s = side(r, o);
        if (s.opp === t) continue;
        if (s.for > s.against) ow++; else if (s.for < s.against) ol++; else ot++;
      }
    }
    const n = mine.length;
    const wins = w + tie / 2;
    const expectedWins = n * pythagorean(pf, pa);
    const gap = wins - expectedWins;
    return {
      team: row.team, games: n, wins, expectedWins, gap, pointsFor: pf, pointsAgainst: pa, oneScore: one,
      scheduleStrength: share(ow, ol, ot), verdict: verdictOf(gap),
    };
  });
}
