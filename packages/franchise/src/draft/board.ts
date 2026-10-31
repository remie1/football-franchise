/**
 * Draft boards and how a team chooses (ADR-086 §6-§7, D4).
 *
 * A board is one team's estimate of every prospect: the truth plus that team's own error, smaller
 * the better its evaluator. Combine numbers are public and exact and are already in the truth the
 * error is laid on; only football skill is blurred. The error is fixed for the class, so a team's
 * opinion does not wobble from pick to pick.
 *
 * Choosing (the owner's Q4): for every prospect still on the board the team weighs
 *   - board value: its grade above a replacement level, times what his position is worth;
 *   - need: how badly it needs the position (a weak, old or thin spot), from none to severe;
 *   - drop-off: how much worse the best player left at his position is likely to be by the team's
 *     next pick, given what the teams in between are likely to take (the public consensus).
 * The highest total is the pick. All weights are CHOSEN, provenance NONE, tuned in D7.
 */
import { createRng, type PlayerId, type PlayerState, type Position, type TeamId } from "@ff/contracts";

/** A player's overall at his own position (ADR-087 P5 in contracts once it lands; injected until then). */
export type Rate = (player: PlayerState) => number;

/** Board error, 1 SD in rating points: `min + span × (1 − skill/100)`. A 50 evaluator is ±4.5. */
export const BOARD_ERROR = { min: 2, span: 5 } as const;
/** The public's error (media boards), for the consensus the drop-off reads. */
export const CONSENSUS_ERROR = 4;

/** What a position is worth, times the grade above replacement. */
export const POSITION_VALUE: Readonly<Record<Position, number>> = {
  QB: 1.3, DE: 1.15, OLB: 1.1, LT: 1.12, CB: 1.08, WR: 1.05, DT: 1.0, RT: 1.0, NT: 0.9,
  TE: 0.95, FS: 0.95, SS: 0.92, LG: 0.93, RG: 0.93, C: 0.95, MLB: 0.9, ILB: 0.88,
  RB: 0.85, FB: 0.55, K: 0.5, P: 0.45, LS: 0.35,
};
/** Grade at which a player adds nothing over a street free agent. */
export const REPLACEMENT_GRADE = 50;

/** Starters a team fields at each position (base 4-3/3-4 hybrid, three corners, one of each specialist). */
export const STARTERS: Readonly<Record<Position, number>> = {
  QB: 1, RB: 1, FB: 0, WR: 3, TE: 1, LT: 1, LG: 1, C: 1, RG: 1, RT: 1,
  DE: 2, DT: 1, NT: 1, OLB: 2, MLB: 1, ILB: 0, CB: 3, FS: 1, SS: 1, K: 1, P: 1, LS: 1,
};
/** How many a team wants on its 53 at each position (ADR-079's roster shape). */
export const WANTED: Readonly<Record<Position, number>> = {
  QB: 3, RB: 3, FB: 1, WR: 6, TE: 3, LT: 2, LG: 2, C: 2, RG: 2, RT: 1,
  DE: 4, DT: 4, NT: 1, OLB: 3, MLB: 2, ILB: 1, CB: 6, FS: 2, SS: 2, K: 1, P: 1, LS: 1,
};

export const CHOICE = {
  /** Points of value a severe need is worth. */
  need: 7,
  /** Share of the expected drop-off at a position added to the value. */
  dropOff: 0.5,
  /** Starter level the need compares with (a typical starter's overall). */
  starterLevel: 70,
  /** A starter this age or older adds to the need. */
  oldAge: 31,
} as const;

export type Board = ReadonlyMap<PlayerId, number>;

/** One team's grades of a class. */
export function buildBoard(prospects: readonly PlayerState[], team: TeamId, skill: number, rate: Rate, seed: string, draft: number): Board {
  const sd = BOARD_ERROR.min + BOARD_ERROR.span * (1 - Math.max(0, Math.min(100, skill)) / 100);
  return new Map(prospects.map((p) => {
    const rng = createRng(seed, `board/${draft}/${String(team)}/${String(p.bio.id)}`);
    return [p.bio.id, rate(p) + sd * normal(rng.next(), rng.next())];
  }));
}

/** The public consensus board (media rankings), which every team expects the others to roughly follow. */
export function consensusBoard(prospects: readonly PlayerState[], rate: Rate, seed: string, draft: number): Board {
  return new Map(prospects.map((p) => {
    const rng = createRng(seed, `consensus/${draft}/${String(p.bio.id)}`);
    return [p.bio.id, rate(p) + CONSENSUS_ERROR * normal(rng.next(), rng.next())];
  }));
}

function normal(u1: number, u2: number): number {
  return Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2);
}

export const boardValue = (grade: number, position: Position): number => (grade - REPLACEMENT_GRADE) * POSITION_VALUE[position];

/** How badly a team needs a position, 0..1, from its current players there. */
export function needAt(position: Position, roster: readonly PlayerState[], rate: Rate): number {
  const here = roster.filter((p) => p.bio.position === position).sort((a, b) => rate(b) - rate(a));
  const starters = STARTERS[position];
  let need = 0;
  if (here.length < WANTED[position]) need += 0.3 * Math.min(1, (WANTED[position] - here.length) / Math.max(1, WANTED[position] - starters + 1));
  if (starters > 0) {
    const weakest = here[starters - 1];
    need += weakest ? Math.max(0, (CHOICE.starterLevel - rate(weakest)) / 15) : 1;
    if (here.slice(0, starters).some((p) => p.bio.age >= CHOICE.oldAge)) need += 0.2;
  }
  if (here.length > WANTED[position]) need -= 0.5;
  return Math.max(0, Math.min(1, need));
}

export interface ChooseInput {
  board: Board;
  consensus: Board;
  available: readonly PlayerState[];
  roster: readonly PlayerState[];
  rate: Rate;
  /** Picks made by other teams before this team picks again (Infinity = no later pick). */
  othersBeforeNext: number;
}

/** The team's pick, and the score that chose him. */
export function choose(input: ChooseInput): { player: PlayerState; score: number } {
  const { board, consensus, available, roster, rate, othersBeforeNext } = input;
  if (available.length === 0) throw new Error("choose: nobody left");
  const need = new Map<Position, number>();
  const needOf = (pos: Position) => {
    if (!need.has(pos)) need.set(pos, needAt(pos, roster, rate));
    return need.get(pos)!;
  };
  // Who the others are likely to take before this team picks again: the consensus top `k`.
  const k = Math.min(available.length, Number.isFinite(othersBeforeNext) ? othersBeforeNext : available.length);
  const goneSoon = new Set([...available].sort((a, b) => consensus.get(b.bio.id)! - consensus.get(a.bio.id)!).slice(0, k).map((p) => p.bio.id));
  // The best this team could still get at each position at its next pick.
  const nextBest = new Map<Position, number>();
  for (const p of available) {
    if (goneSoon.has(p.bio.id)) continue;
    const g = board.get(p.bio.id)!;
    if (g > (nextBest.get(p.bio.position) ?? -Infinity)) nextBest.set(p.bio.position, g);
  }
  let best: { player: PlayerState; score: number } | undefined;
  for (const p of available) {
    const pos = p.bio.position;
    const g = board.get(p.bio.id)!;
    const later = nextBest.get(pos) ?? REPLACEMENT_GRADE;
    const drop = Math.max(0, boardValue(g, pos) - boardValue(Math.min(g, later), pos));
    const score = boardValue(g, pos) + CHOICE.need * needOf(pos) + CHOICE.dropOff * drop;
    if (!best || score > best.score || (score === best.score && String(p.bio.id) < String(best.player.bio.id))) best = { player: p, score };
  }
  return best!;
}
