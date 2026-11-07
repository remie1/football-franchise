import { describe, it, expect } from "vitest";
import {
  DEFAULT_LEAGUE_RULES, SAVE_FORMAT_VERSION, playerId, teamId, tradeId,
  type FranchiseEvent, type MedicalFinding, type PendingPhysical, type PlayerContract,
  type SaveFile, type TradePiece, type TradeTalk,
} from "../src/index.js";

// ADR-095 X1-X4: trade shapes are plain data and survive a save round-trip unchanged.
const at = { season: 2026, phase: "REGULAR_SEASON" as const, week: 9, day: 3 };
const T1 = teamId("T1"), T2 = teamId("T2");
const talk = tradeId("TR-2026-1");

const pieces: TradePiece[] = [
  { kind: "PLAYER", player: playerId("P1"), from: T1, to: T2 },
  {
    kind: "PICK", draft: 2027, round: 3, originalTeam: T2, pickKind: "REGULAR", from: T2, to: T1,
    condition: { text: "becomes a 2nd if he plays half the snaps", rule: { kind: "PLAYING_TIME", player: playerId("P1"), season: 2026, snapShare: 0.5, round: 2 } },
  },
];

const open: TradeTalk = {
  id: talk, teams: [T2, T1], openedBy: T2, openedAt: at, direction: "BUYING_PLAYER",
  about: [pieces[0]!], stage: "OFFER",
  offer: { by: T2, pieces, reasons: ["HELP_NOW", "SALARY"] }, rounds: 1, lastAt: at,
};
const physical: PendingPhysical = { talk, player: playerId("P1"), examiningTeam: T2, agreedAt: at, dueBy: { ...at, day: 7 } };
const finding: MedicalFinding = { player: playerId("P1"), examiningTeam: T2, at, result: "CONCERN", gamesLess: 2, leaked: false };

describe("trade shapes (ADR-095 X1-X4)", () => {
  it("X4: a SaveFile with trades in progress round-trips through JSON unchanged; absent stays absent", () => {
    const save: SaveFile = {
      formatVersion: SAVE_FORMAT_VERSION, createdBy: "test", registrySchemaVersion: 1,
      worldSeed: "w", calendar: at, leagueRules: DEFAULT_LEAGUE_RULES,
      world: {
        teams: [], players: [], staff: [], contracts: [], perceptions: [],
        league: { conferences: [], divisions: [] }, season: null, narrativeState: null, fashion: null,
        trades: { talks: [open], physicals: [physical], findings: [finding] },
      },
      history: { seasons: [], transactions: [] },
    };
    expect(JSON.parse(JSON.stringify(save))).toEqual(save);
    const { trades: _, ...older } = save.world;
    expect(JSON.parse(JSON.stringify({ ...save, world: older })).world.trades).toBeUndefined();
  });

  it("X1: every step of a talk is an event, and TRADE_EXECUTED still takes its old payload", () => {
    const events: FranchiseEvent[] = [
      { type: "TRADE_CALL", payload: { talk, from: T2, to: T1, direction: "BUYING_PLAYER", about: [pieces[0]!] } },
      { type: "TRADE_OFFER", payload: { talk, by: T2, pieces, reasons: ["HELP_NOW"], counter: false } },
      { type: "TRADE_AGREED", payload: { talk, pieces } },
      { type: "TRADE_PHYSICAL", payload: { talk, player: playerId("P1"), examiningTeam: T2, result: "CONCERN" } },
      { type: "TRADE_ADJUSTED", payload: { talk, by: T2, pieces } },
      { type: "TRADE_VOIDED", payload: { talk, by: T2, reason: "PHYSICAL_CONCERN", pretext: true } },
      { type: "TRADE_EXECUTED", payload: { teams: [T1, T2], talk, pieces, capMoves: [{ team: T1, season: 2026, change: -4_000_000 }] } },
      { type: "TRADE_EXECUTED", payload: { teams: [T1, T2] } },
    ];
    expect(JSON.parse(JSON.stringify(events))).toEqual(events);
  });

  it("X3: a contract may carry a no-trade clause; absent means none", () => {
    const c: PlayerContract = { player: playerId("P1"), team: T1, years: [], signedAt: at, noTradeClause: true };
    expect(JSON.parse(JSON.stringify(c)).noTradeClause).toBe(true);
    const { noTradeClause: _, ...plain } = c;
    expect((plain as PlayerContract).noTradeClause).toBeUndefined();
  });
});
