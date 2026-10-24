import { describe, it, expect } from "vitest";
import {
  teamId, DEFAULT_LEAGUE_RULES, SAVE_FORMAT_VERSION,
  type PlayerContract, type PlayerId, type DeadMoneyCharge, type CapSeason, type SaveFile,
  type FranchiseEvent, type PlayerBio,
} from "../src/index.js";

// ADR-085 K1-K6: the money shapes are plain data and survive a save round-trip unchanged.
const at = { season: 2026, phase: "OFF_RESET_FA" as const, week: 1, day: 1 };
const player = "P00001" as PlayerId;

const contract: PlayerContract = {
  player, team: teamId("T1"), signedAt: at, kind: "VETERAN", signingBonus: 30_000_000,
  years: [
    { season: 2026, baseSalary: 1_200_000, signingBonusProration: 10_000_000, guarantees: { fullyGuaranteed: true },
      capHit: 13_700_000, rosterBonus: 2_000_000, workoutBonus: 500_000, guaranteedSalary: 1_200_000,
      incentives: { likely: 0, unlikely: 1_000_000 } },
    { season: 2027, baseSalary: 20_000_000, signingBonusProration: 10_000_000, guarantees: { fullyGuaranteed: false },
      capHit: 31_000_000, optionBonusProration: 0, perGameRosterBonus: 1_020_000 },
    { season: 2028, baseSalary: 0, signingBonusProration: 10_000_000, guarantees: { fullyGuaranteed: false },
      capHit: 10_000_000, voidYear: true },
  ],
  ended: { at, reason: "RELEASED", postJune1: true },
};

const rookie: PlayerContract = {
  player, team: teamId("T2"), signedAt: at, kind: "ROOKIE", years: [],
  fifthYearOption: { season: 2030, price: 18_000_000, exercised: false },
};

const charge: DeadMoneyCharge = { team: teamId("T1"), player, season: 2027, amount: 20_000_000, reason: "RELEASED" };
const cap: CapSeason = { season: 2027, cap: 320_000_000, projectedLow: 315_000_000, projectedHigh: 325_000_000 };

describe("contract and cap shapes (ADR-085)", () => {
  it("a contract with every K1/K2 piece, a rookie option, a charge and a cap season survive JSON unchanged", () => {
    for (const v of [contract, rookie, charge, cap]) expect(JSON.parse(JSON.stringify(v))).toEqual(v);
  });

  it("a contract written before K1/K2 still type-checks", () => {
    const older: PlayerContract = { player, team: teamId("T1"), signedAt: at, years: [
      { season: 2026, baseSalary: 1, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: 1 },
    ] };
    expect(older.kind).toBeUndefined();
  });

  it("a save carries dead money and the cap history, and a save without them still type-checks", () => {
    const save: SaveFile = {
      formatVersion: SAVE_FORMAT_VERSION, createdBy: "test", registrySchemaVersion: 1, worldSeed: "s", calendar: at,
      leagueRules: DEFAULT_LEAGUE_RULES,
      world: {
        teams: [], players: [], staff: [], contracts: [contract], deadMoney: [charge], capHistory: [cap], perceptions: [],
        league: { conferences: [], divisions: [] }, season: null, narrativeState: null, fashion: null,
      },
      history: { seasons: [], transactions: [] },
    };
    expect(JSON.parse(JSON.stringify(save))).toEqual(save);
    const { deadMoney: _d, capHistory: _c, ...older } = save.world;
    const before: SaveFile = { ...save, world: older };
    expect(before.world.deadMoney).toBeUndefined();
  });

  it("a bio carries credited seasons (K5)", () => {
    const bio: PlayerBio = { id: player, displayName: "A", position: "QB", age: 25, heightIn: 75, weightLb: 220,
      draft: "UDFA", creditedSeasons: 3 };
    expect(bio.creditedSeasons).toBe(3);
  });

  it("the money events carry their details (K6)", () => {
    const events: FranchiseEvent[] = [
      { type: "CONTRACT_SIGNED", payload: { player, team: teamId("T1"), kind: "VETERAN", years: 3, value: 51_000_000, guaranteed: 31_200_000 } },
      { type: "CONTRACT_SIGNED", payload: { player, team: teamId("T1") } },
      { type: "CONTRACT_EXPIRED", payload: { player, team: teamId("T1") } },
      { type: "CAP_SET", payload: { season: 2027, cap: 320_000_000 } },
      { type: "OPTION_EXERCISED", payload: { player, team: teamId("T2"), season: 2030 } },
    ];
    expect(events.map((e) => e.type)).toEqual(["CONTRACT_SIGNED", "CONTRACT_SIGNED", "CONTRACT_EXPIRED", "CAP_SET", "OPTION_EXERCISED"]);
  });
});
