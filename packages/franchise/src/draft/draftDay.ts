/**
 * Draft day and the undrafted scramble (ADR-086 §2, D5).
 *
 * Every pick is made in order by its holder, from that team's board (`board.ts`). A drafted
 * prospect joins the team (bio.draft gets year, round and overall pick; he goes to the bottom of his
 * position's depth chart until camp sorts it). After the last pick, teams sign undrafted prospects
 * in draft order, one at a time, while they have room under the offseason limit and a prospect
 * worth signing; the rest of the class goes home. Every pick and undrafted rookie signs his rookie
 * deal on the spot (ADR-085's scale, `money.ts`). A team its picks take past the offseason limit
 * (90) cuts its weakest veterans to make room, as real teams do.
 */
import type { CalendarStamp, DraftPick, FranchiseEvent, LeagueRules, PlayerId, PlayerState, Team, TeamId } from "@ff/contracts";
import type { LeaguePeople } from "../season/people.js";
import { flatCap, release, signRookie, type CapForSeason } from "./money.js";
import { boardValue, buildBoard, choose, consensusBoard, needAt, type Board, type Rate } from "./board.js";

/** Undrafted signings a team makes at most, and the board value below which a prospect is not worth a spot. */
export const UDFA = { perTeam: 20, minValue: 2 } as const;

export interface DraftDayInput {
  draft: number;
  /** The draft's picks in order, owners final, `overall` set (`draftPicks`). */
  picks: readonly DraftPick[];
  seed: string;
  rules: LeagueRules;
  rate: Rate;
  /** A team's evaluator skill, 0..100. */
  scouting: (team: TeamId) => number;
  /** When the picks are made (default: the draft's day, OFF_DRAFT week 3 day 4). */
  at?: CalendarStamp;
  /** The cap by season, for the rookie scale (default: flat at the rules' cap). */
  cap?: CapForSeason;
}

export interface DraftDayResult {
  people: LeaguePeople;
  events: FranchiseEvent[];
  /** Who went where, in pick order. */
  selections: { pick: DraftPick; player: PlayerId }[];
}

export function runDraftDay(people: LeaguePeople, input: DraftDayInput): DraftDayResult {
  const { draft, picks, seed, rules, rate } = input;
  const cls = people.classes.find((c) => c.draft === draft);
  if (!cls) throw new Error(`runDraftDay: no class for ${draft}`);
  const inClass = new Set(cls.prospects.map(String));
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const prospects = cls.prospects.map((id) => byId.get(String(id))!).filter((p) => p.bio.draft === "PROSPECT");
  const teams = new Map(people.teams.map((t) => [t.id, { ...t, roster: [...t.roster], depthChart: { ...t.depthChart } }]));
  const boards = new Map<TeamId, Board>();
  const boardOf = (team: TeamId) => {
    if (!boards.has(team)) boards.set(team, buildBoard(prospects, team, input.scouting(team), rate, seed, draft));
    return boards.get(team)!;
  };
  const consensus = consensusBoard(prospects, rate, seed, draft);
  const rosterOf = (team: TeamId) => teams.get(team)!.roster.map((id) => byId.get(String(id))!);
  const available = new Map(prospects.map((p) => [String(p.bio.id), p]));
  const events: FranchiseEvent[] = [];
  const selections: { pick: DraftPick; player: PlayerId }[] = [];
  const at: CalendarStamp = input.at ?? { season: draft - 1, phase: "OFF_DRAFT", week: 3, day: 4 };
  const cap = input.cap ?? flatCap(rules);
  const contracts = [...(people.contracts ?? [])];
  const signDeal = (team: TeamId, player: PlayerId, pick: number | "UDFA") => {
    const { contract, event } = signRookie(player, team, pick, draft, at, cap);
    contracts.push(contract);
    events.push(event);
  };

  const sign = (team: TeamId, p: PlayerState, draftLine: PlayerState["bio"]["draft"]) => {
    available.delete(String(p.bio.id));
    const signed: PlayerState = { ...p, bio: { ...p.bio, draft: draftLine }, teamId: team };
    byId.set(String(p.bio.id), signed);
    const t = teams.get(team)!;
    t.roster.push(p.bio.id);
    t.depthChart[p.bio.position] = [...(t.depthChart[p.bio.position] ?? []), p.bio.id];
  };

  picks.forEach((pick, i) => {
    const next = picks.findIndex((q, j) => j > i && q.owner === pick.owner);
    const { player } = choose({
      board: boardOf(pick.owner),
      consensus,
      available: [...available.values()],
      roster: rosterOf(pick.owner),
      rate,
      othersBeforeNext: next < 0 ? Infinity : next - i - 1,
    });
    const overall = pick.overall ?? i + 1;
    sign(pick.owner, player, { year: draft, round: pick.round, pick: overall });
    selections.push({ pick, player: player.bio.id });
    events.push({ type: "DRAFT_PICK_MADE", payload: { team: pick.owner, player: player.bio.id, round: pick.round, pick: overall, overall, kind: pick.kind } });
    signDeal(pick.owner, player.bio.id, overall);
  });

  // A team its picks took past the offseason limit lets its weakest veterans go (never a new pick).
  const limit = rules.offseasonRosterLimit ?? 90;
  const deadMoney = [...(people.deadMoney ?? [])];
  const letGo: PlayerId[] = [];
  const drafted = new Set(selections.map((x) => String(x.player)));
  for (const t of teams.values()) {
    const over = t.roster.length - limit;
    if (over <= 0) continue;
    const weakest = rosterOf(t.id).filter((p) => !drafted.has(String(p.bio.id)))
      .sort((a, b) => rate(a) - rate(b) || String(a.bio.id).localeCompare(String(b.bio.id))).slice(0, over);
    for (const p of weakest) {
      const id = String(p.bio.id);
      t.roster = t.roster.filter((x) => String(x) !== id);
      t.depthChart[p.bio.position] = (t.depthChart[p.bio.position] ?? []).filter((x) => String(x) !== id);
      const { teamId: _gone, ...rest } = p;
      byId.set(id, rest as PlayerState);
      events.push(...release(contracts, deadMoney, p.bio.id, t.id, at));
      letGo.push(p.bio.id);
    }
  }

  // The undrafted scramble: in draft order (first-round order), one signing a turn.
  const order = [...new Map(picks.filter((p) => p.round === 1 && p.kind === "REGULAR").map((p) => [p.originalTeam, p.originalTeam])).keys()];
  const signedBy = new Map<TeamId, number>();
  for (let progress = true; progress && available.size > 0;) {
    progress = false;
    for (const team of order) {
      if ((signedBy.get(team) ?? 0) >= UDFA.perTeam || teams.get(team)!.roster.length >= limit) continue;
      const board = boardOf(team);
      const roster = rosterOf(team);
      const need = new Map<string, number>();
      let best: { p: PlayerState; v: number } | undefined;
      for (const p of available.values()) {
        if (!need.has(p.bio.position)) need.set(p.bio.position, needAt(p.bio.position, roster, rate));
        const v = boardValue(board.get(p.bio.id)!, p.bio.position) + 3 * need.get(p.bio.position)!;
        if (!best || v > best.v) best = { p, v };
      }
      if (!best || best.v < UDFA.minValue) continue;
      sign(team, best.p, "UDFA");
      signedBy.set(team, (signedBy.get(team) ?? 0) + 1);
      signDeal(team, best.p.bio.id, "UDFA");
      progress = true;
    }
  }

  // The rest of the class goes home.
  const players = [...byId.values()].filter((p) => !(inClass.has(String(p.bio.id)) && p.bio.draft === "PROSPECT"));
  const classes = people.classes.filter((c) => c.draft !== draft);
  return {
    people: {
      ...people, teams: people.teams.map((t) => teams.get(t.id) as Team), players, classes, contracts,
      ...(people.deadMoney || letGo.length > 0 ? { deadMoney } : {}),
      ...(letGo.length > 0 ? { freeAgents: inPlayersOrder(players, [...people.freeAgents, ...letGo]) } : {}),
    },
    events,
    selections,
  };
}

/** Free agents in the players' order, as a loaded save lists them (`peopleFromSave`). */
function inPlayersOrder(players: readonly PlayerState[], ids: readonly PlayerId[]): PlayerId[] {
  const set = new Set(ids.map(String));
  return players.filter((p) => set.has(String(p.bio.id))).map((p) => p.bio.id);
}
