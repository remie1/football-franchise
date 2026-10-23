import { describe, it, expect } from "vitest";
import { DEFAULT_LEAGUE_RULES, createRng, type DraftPick, type TeamId } from "@ff/contracts";
import { buildLeague, runSeason, type GameResolver } from "../src/index.js";
import { draftOrder, draftPicks, draftGroups, settleConditions } from "../src/draft/order.js";
import { compValue, compensatoryPicks, netLosses, type FreeAgentMove } from "../src/draft/compensatory.js";

const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7;
  const awayScore = rng.int(0, 5) * 7;
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};
const league = buildLeague("world-1");
const { state } = runSeason({ league, season: 2026, seed: "s", resolve: fake });
const order = draftOrder(state, "s");

describe("draft order (ADR-086 §4)", () => {
  it("has all 32 teams once: 18 non-playoff teams, then 14 playoff teams by round out, champion last", () => {
    expect(new Set(order.map((r) => r.team)).size).toBe(32);
    expect(order.slice(0, 18).every((r) => r.group === "NON_PLAYOFF")).toBe(true);
    expect(order.slice(18, 24).every((r) => r.group === "WILD_CARD")).toBe(true);
    expect(order.slice(24, 28).every((r) => r.group === "DIVISIONAL")).toBe(true);
    expect(order.slice(28, 30).every((r) => r.group === "CONFERENCE_FINAL")).toBe(true);
    expect(order[30]!.group).toBe("RUNNER_UP");
    expect(order[31]!.team).toBe(state.bracket!.champion);
  });

  it("puts worse records first within a group, and the easier schedule first on a tie", () => {
    for (let i = 1; i < order.length; i++) {
      const a = order[i - 1]!, b = order[i]!;
      if (a.group !== b.group) continue;
      expect(a.winShare).toBeLessThanOrEqual(b.winShare);
      if (a.winShare === b.winShare) expect(a.strengthOfSchedule).toBeLessThanOrEqual(b.strengthOfSchedule);
    }
  });

  it("is the same for the same season and seed", () => {
    expect(draftOrder(state, "s")).toEqual(order);
    expect(draftGroups(state).size).toBe(32);
  });

  it("makes 224 regular picks, 7 rounds in the same order, with traded picks keeping their slot", () => {
    const first = order[0]!.team, second = order[1]!.team;
    const traded: DraftPick = { draft: 2027, round: 2, originalTeam: first, owner: second, kind: "REGULAR" };
    const picks = draftPicks(2027, order, [traded], DEFAULT_LEAGUE_RULES);
    expect(picks).toHaveLength(224);
    expect(picks.map((p) => p.overall)).toEqual(Array.from({ length: 224 }, (_, i) => i + 1));
    expect(picks[32]).toMatchObject({ round: 2, originalTeam: first, owner: second, overall: 33 });
    expect(picks.slice(64, 96).map((p) => p.originalTeam)).toEqual(order.map((r) => r.team));
  });

  it("settles a pick swap: the holder takes the better of the two slots", () => {
    const early = order[2]!.team, late = order[20]!.team, holder = order[10]!.team;
    // `holder` holds `late`'s 1st with the right to swap it for `early`'s 1st, which `early` still holds.
    const swap: DraftPick = { draft: 2027, round: 1, originalTeam: late, owner: holder, kind: "REGULAR",
      condition: { text: "swap", rule: { kind: "PICK_SWAP", otherTeam: early, ownerGets: "BETTER" } } };
    const picks = draftPicks(2027, order, [swap], DEFAULT_LEAGUE_RULES);
    expect(picks[2]!.owner).toBe(holder);
    expect(picks[20]!.owner).toBe(early);
    expect(picks[20]!.condition!.settled).toBe(true);
  });

  it("puts compensatory picks at the end of their round", () => {
    const comp: DraftPick[] = [
      { draft: 2027, round: 3, originalTeam: order[5]!.team, owner: order[5]!.team, kind: "COMPENSATORY" },
      { draft: 2027, round: 7, originalTeam: order[9]!.team, owner: order[9]!.team, kind: "COMPENSATORY" },
    ];
    const picks = draftPicks(2027, order, comp, DEFAULT_LEAGUE_RULES);
    expect(picks).toHaveLength(226);
    expect(picks[96]).toMatchObject({ round: 3, kind: "COMPENSATORY", overall: 97 });
    expect(picks[97]).toMatchObject({ round: 4, kind: "REGULAR" });
    expect(picks.at(-1)).toMatchObject({ round: 7, kind: "COMPENSATORY", overall: 226 });
  });
});

describe("compensatory picks (ADR-086 §5)", () => {
  const apys = Array.from({ length: 1000 }, (_, i) => (i + 1) * 50_000); // 50k .. 50M
  const T = (n: number) => `T${String(n).padStart(2, "0")}` as TeamId;
  const P = (n: number) => `p${n}` as never;
  const move = (n: number, from: number, to: number, apy: number, snapShare?: number): FreeAgentMove =>
    ({ player: P(n), from: T(from), to: T(to), apy, ...(snapShare !== undefined ? { snapShare } : {}) });

  it("sets the round by pay rank, moved a round by playing time", () => {
    expect(compValue(move(1, 1, 2, 49_000_000), apys)!.round).toBe(3);
    expect(compValue(move(1, 1, 2, 46_000_000), apys)!.round).toBe(4);
    expect(compValue(move(1, 1, 2, 46_000_000, 0.9), apys)!.round).toBe(3);
    expect(compValue(move(1, 1, 2, 46_000_000, 0.1), apys)!.round).toBe(5);
    expect(compValue(move(1, 1, 2, 31_000_000, 0.1), apys)).toBeUndefined();
    expect(compValue(move(1, 1, 2, 10_000_000), apys)).toBeUndefined();
  });

  it("cancels a signed CFA against a lost one of the same or lower value, and pays only a net loss", () => {
    const moves = [move(1, 1, 2, 49_000_000), move(2, 1, 3, 41_000_000), move(3, 4, 1, 42_000_000)];
    const net = netLosses(moves, apys, 4);
    // Team 1 lost a 3rd and a 5th, signed a 5th: the 5th cancels the lost 5th, the 3rd is left.
    expect(net.get(T(1))!.map((x) => x.v.round)).toEqual([3]);
    // Team 2 and 3 only signed; team 4 lost one and signed none.
    expect(net.has(T(2))).toBe(false);
    expect(net.get(T(4))!.map((x) => x.v.round)).toEqual([5]);
  });

  it("gives a team that signed more than it lost nothing", () => {
    const moves = [move(1, 1, 2, 49_000_000), move(2, 3, 1, 31_000_000), move(3, 4, 1, 31_000_000)];
    expect(netLosses(moves, apys, 4).has(T(1))).toBe(false);
  });

  it("caps a team at 4 and the league at 32, filling short years with 7th-rounders in draft order", () => {
    const moves = Array.from({ length: 6 }, (_, i) => move(i, 1, 2 + i, 49_000_000 - i));
    const order32 = order.map((r) => r.team);
    const picks = compensatoryPicks(2027, moves, apys, order32, DEFAULT_LEAGUE_RULES);
    expect(picks).toHaveLength(32);
    expect(picks.filter((p) => p.originalTeam === T(1))).toHaveLength(4 + (order32.slice(0, 28).includes(T(1)) ? 1 : 0));
    expect(picks.slice(4).every((p) => p.round === 7)).toBe(true);
    expect(picks.slice(4).map((p) => p.originalTeam)).toEqual(order32.slice(0, 28));
  });
});

describe("pick conditions settled by the season (ADR-086 N2)", () => {
  const champ = state.bracket!.champion!;
  const loser = order[0]!.team;
  const base = (team: TeamId): DraftPick => ({ draft: 2027, round: 3, originalTeam: team, owner: order[5]!.team, kind: "REGULAR",
    condition: { text: "becomes a 2nd if they reach the conference final", rule: { kind: "PLAYOFF_FINISH", team, season: 2026, reached: "CONFERENCE_FINAL", round: 2 } } });

  it("moves the pick when the team got that far, and leaves it when not", () => {
    const r = settleConditions([base(champ), base(loser)], state);
    expect(r.picks[0]).toMatchObject({ round: 2, condition: { settled: true } });
    expect(r.picks[1]).toMatchObject({ round: 3, condition: { settled: true } });
    expect(r.settled).toHaveLength(2);
    expect(settleConditions(r.picks, state).settled).toHaveLength(0);
  });

  it("settles playing time only once the share is known", () => {
    const p: DraftPick = { draft: 2027, round: 4, originalTeam: loser, owner: champ, kind: "REGULAR",
      condition: { text: "3rd if he plays 70%", rule: { kind: "PLAYING_TIME", player: "x" as never, season: 2026, snapShare: 0.7, round: 3 } } };
    expect(settleConditions([p], state).settled).toHaveLength(0);
    expect(settleConditions([p], state, () => undefined).settled).toHaveLength(0);
    expect(settleConditions([p], state, () => 0.8).picks[0]!.round).toBe(3);
    expect(settleConditions([p], state, () => 0.5).picks[0]!.round).toBe(4);
  });
});
