/**
 * The draft order and the picks of one draft (ADR-086 §4, D3).
 *
 * NFL rules: the teams that missed the playoffs pick first, worst record first; then the playoff
 * teams by the round they went out in (wild card, divisional, conference final), the losing finalist
 * 31st and the champion last. Within a group, the worse record picks first; a tie goes to the team
 * with the easier schedule (lower opponents' winning share), then a coin flip from the seed. (The
 * NFL breaks the remaining ties with division and conference tiebreakers before the coin; v1 goes
 * straight to the coin.)
 *
 * The same order holds in every round. Traded picks keep their slot and change owner; compensatory
 * picks go at the end of rounds 3 to 7.
 */
import {
  createRng,
  type DraftPick, type GameKind, type GameResult, type LeagueRules, type PlayerId, type SeasonState, type TeamId,
} from "@ff/contracts";

/** The group a team picks in, best-off last. */
export type DraftGroup = "NON_PLAYOFF" | "WILD_CARD" | "DIVISIONAL" | "CONFERENCE_FINAL" | "RUNNER_UP" | "CHAMPION";
const GROUP_ORDER: readonly DraftGroup[] = ["NON_PLAYOFF", "WILD_CARD", "DIVISIONAL", "CONFERENCE_FINAL", "RUNNER_UP", "CHAMPION"];

export interface DraftOrderRow {
  team: TeamId;
  group: DraftGroup;
  winShare: number;
  /** Opponents' combined winning share over the regular season. */
  strengthOfSchedule: number;
}

const share = (w: number, l: number, t: number): number => (w + l + t === 0 ? 0 : (w + t / 2) / (w + l + t));

/** Regular-season games only: those in the schedule marked REGULAR. */
function regularResults(state: SeasonState): GameResult[] {
  const regular = new Set(state.schedule.games.filter((g) => g.kind === "REGULAR").map((g) => String(g.gameId)));
  return state.results.filter((r) => regular.has(String(r.gameId)));
}

/** Each team's opponents' winning share, every game counted (an opponent met twice counts twice). */
export function strengthOfSchedule(state: SeasonState): Map<TeamId, number> {
  const ws = new Map(state.standings.map((r) => [r.team, share(r.overall.wins, r.overall.losses, r.overall.ties)]));
  const sum = new Map<TeamId, { total: number; n: number }>();
  const add = (team: TeamId, opp: TeamId) => {
    const s = sum.get(team) ?? { total: 0, n: 0 };
    s.total += ws.get(opp) ?? 0;
    s.n += 1;
    sum.set(team, s);
  };
  for (const r of regularResults(state)) { add(r.home, r.away); add(r.away, r.home); }
  return new Map([...sum].map(([t, s]) => [t, s.n === 0 ? 0 : s.total / s.n]));
}

const LOST_IN: Partial<Record<GameKind, DraftGroup>> = {
  WILD_CARD: "WILD_CARD", DIVISIONAL: "DIVISIONAL", CONFERENCE_FINAL: "CONFERENCE_FINAL", CHAMPIONSHIP: "RUNNER_UP",
};

/** Where each team went out. A team with a first-round bye that lost its first game went out in the divisional round. */
export function draftGroups(state: SeasonState): Map<TeamId, DraftGroup> {
  const groups = new Map<TeamId, DraftGroup>(state.standings.map((r) => [r.team, "NON_PLAYOFF"]));
  const bracket = state.bracket;
  if (!bracket) return groups;
  const results = new Map(state.results.map((r) => [String(r.gameId), r]));
  for (const game of bracket.games) {
    const r = results.get(String(game.gameId));
    if (!r) continue;
    const loser = r.homeScore > r.awayScore ? r.away : r.home;
    const g = LOST_IN[game.kind];
    if (g) groups.set(loser, g);
  }
  if (bracket.champion !== undefined) groups.set(bracket.champion, "CHAMPION");
  return groups;
}

/**
 * The 32 teams in the order they pick, first pick first, from a finished season.
 * `seed` settles ties left after record and schedule.
 */
export function draftOrder(state: SeasonState, seed: string): DraftOrderRow[] {
  if (state.bracket?.champion === undefined) throw new Error("draftOrder: the season has no champion yet");
  const groups = draftGroups(state);
  const sos = strengthOfSchedule(state);
  const rng = createRng(seed, `draft-order/${state.season}`);
  const rows = state.standings
    .map((r) => ({
      team: r.team,
      group: groups.get(r.team)!,
      winShare: share(r.overall.wins, r.overall.losses, r.overall.ties),
      strengthOfSchedule: sos.get(r.team) ?? 0,
    }))
    // A coin for every team, drawn in a fixed order, so the order does not depend on how ties fall.
    .sort((a, b) => String(a.team).localeCompare(String(b.team)))
    .map((r) => ({ ...r, coin: rng.next() }));
  rows.sort((a, b) =>
    GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
    || a.winShare - b.winShare
    || a.strengthOfSchedule - b.strengthOfSchedule
    || a.coin - b.coin);
  return rows.map(({ coin: _coin, ...r }) => r);
}

const rounds = (rules: LeagueRules): number => rules.draft?.rounds ?? 7;

/**
 * Every pick of draft `draft` in the order it is made, `overall` set.
 *
 * `held`: the picks of this draft that are not simply a team's own (traded picks, comp picks);
 * every other slot belongs to its original team. Traded picks with a swap condition are settled
 * here (the holder gets the better or worse of the two slots); other conditions must be settled
 * first (`settleConditions`). Compensatory picks go at the end of their round, in the order given.
 */
export function draftPicks(draft: number, order: readonly DraftOrderRow[], held: readonly DraftPick[], rules: LeagueRules): DraftPick[] {
  const mine = held.filter((p) => p.draft === draft);
  const traded = new Map<string, DraftPick>();
  for (const p of mine.filter((p) => p.kind === "REGULAR")) {
    const key = `${p.round}/${String(p.originalTeam)}`;
    if (traded.has(key)) throw new Error(`draftPicks: two holders for ${draft} round ${p.round} of ${String(p.originalTeam)}`);
    traded.set(key, p);
  }
  const out: DraftPick[] = [];
  for (let round = 1; round <= rounds(rules); round++) {
    const regular = order.map((row) => traded.get(`${round}/${String(row.team)}`)
      ?? { draft, round, originalTeam: row.team, owner: row.team, kind: "REGULAR" as const });
    swapSettle(regular, order);
    out.push(...regular);
    out.push(...mine.filter((p) => p.kind !== "REGULAR" && p.round === round));
  }
  return out.map((p, i) => ({ ...p, overall: i + 1 }));
}

/** PICK_SWAP: the holder of the pick takes the better (or worse) of it and the other team's slot this round. */
function swapSettle(round: DraftPick[], order: readonly DraftOrderRow[]): void {
  const slot = (team: TeamId) => order.findIndex((r) => r.team === team);
  for (const p of round) {
    const rule = p.condition?.rule;
    if (!rule || rule.kind !== "PICK_SWAP" || p.condition!.settled) continue;
    const i = round.indexOf(p);
    const j = round.findIndex((q) => q.originalTeam === rule.otherTeam);
    if (j < 0) continue;
    const other = round[j]!;
    const mineBetter = slot(p.originalTeam) < slot(other.originalTeam);
    const take = rule.ownerGets === "BETTER" ? !mineBetter : mineBetter;
    const settled = { ...p.condition!, settled: true };
    if (take) {
      round[i] = { ...p, owner: other.owner, condition: settled };
      round[j] = { ...other, owner: p.owner };
    } else {
      round[i] = { ...p, condition: settled };
    }
  }
}

const KIND_DEPTH: readonly GameKind[] = ["WILD_CARD", "DIVISIONAL", "CONFERENCE_FINAL", "CHAMPIONSHIP"];

/**
 * Settle the conditions that a season decides (ADR-086 N2): PLAYOFF_FINISH from the season's
 * bracket, PLAYING_TIME from `snapShare` (absent = not known yet, left unsettled). A met condition
 * moves the pick to the condition's round; settled picks are marked so they are not settled twice.
 * Returns the picks and one DRAFT_PICK_CONDITION_SETTLED payload per settled pick.
 */
export function settleConditions(
  picks: readonly DraftPick[], state: SeasonState, snapShare?: (player: PlayerId, season: number) => number | undefined,
): { picks: DraftPick[]; settled: { draft: number; originalTeam: TeamId; owner: TeamId; round: number; text: string }[] } {
  const settled: { draft: number; originalTeam: TeamId; owner: TeamId; round: number; text: string }[] = [];
  const out = picks.map((p) => {
    const c = p.condition;
    if (!c || c.settled) return p;
    const rule = c.rule;
    let met: boolean | undefined;
    if (rule.kind === "PLAYOFF_FINISH" && rule.season === state.season) {
      if (state.bracket?.champion === undefined) return p;
      const reached = new Set<GameKind>();
      for (const g of state.bracket.games) if (g.home === rule.team || g.away === rule.team) reached.add(g.kind);
      met = KIND_DEPTH.slice(KIND_DEPTH.indexOf(rule.reached)).some((k) => reached.has(k));
    } else if (rule.kind === "PLAYING_TIME" && rule.season === state.season && snapShare) {
      const s = snapShare(rule.player, rule.season);
      if (s === undefined) return p;
      met = s >= rule.snapShare;
    }
    if (met === undefined) return p;
    const round = met && "round" in rule ? rule.round : p.round;
    const q: DraftPick = { ...p, round, condition: { ...c, settled: true } };
    settled.push({ draft: p.draft, originalTeam: p.originalTeam, owner: p.owner, round, text: c.text });
    return q;
  });
  return { picks: out, settled };
}
