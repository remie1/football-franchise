/**
 * ADR-093 F1 (step 0): `FoulKind`, `FoulFamily` and `FoulTiming`, what they hold and what they
 * refuse.
 *
 * Type-level: the `@ts-expect-error` lines fail `pnpm --filter @ff/contracts typecheck` (part of
 * `pnpm verify`) if the edit is loosened or lost, and each table below is a `Record` over its
 * union, so a member added or lost without the table fails to compile too. The runtime asserts
 * show the file ran. Contracts gain types and comments only, so nothing here can change a stream.
 */
import { describe, expect, it } from "vitest";
import type { FoulFamily, FoulKind, FoulTiming } from "../src/index.js";

/** Every kind with the NFL's own name for it, as its game books write it. */
const NFL_NAME: Record<FoulKind, string> = {
  FALSE_START: "False Start",
  DEFENSIVE_OFFSIDE: "Defensive Offside",
  NEUTRAL_ZONE_INFRACTION: "Neutral Zone Infraction",
  ENCROACHMENT: "Encroachment",
  OFFENSIVE_OFFSIDE: "Offensive Offside",
  DELAY_OF_GAME: "Delay of Game",
  DEFENSIVE_DELAY_OF_GAME: "Defensive Delay of Game",
  ILLEGAL_FORMATION: "Illegal Formation",
  ILLEGAL_SHIFT: "Illegal Shift",
  ILLEGAL_MOTION: "Illegal Motion",
  OFFENSIVE_TOO_MANY_MEN_ON_FIELD: "Offensive Too Many Men on Field",
  DEFENSIVE_TOO_MANY_MEN_ON_FIELD: "Defensive Too Many Men on Field",
  OFFENSIVE_HOLDING: "Offensive Holding",
  ILLEGAL_USE_OF_HANDS: "Illegal Use of Hands",
  DEFENSIVE_HOLDING: "Defensive Holding",
  ILLEGAL_CONTACT: "Illegal Contact",
  DEFENSIVE_PASS_INTERFERENCE: "Defensive Pass Interference",
  OFFENSIVE_PASS_INTERFERENCE: "Offensive Pass Interference",
  INELIGIBLE_DOWNFIELD_PASS: "Ineligible Downfield Pass",
  ILLEGAL_FORWARD_PASS: "Illegal Forward Pass",
  INTENTIONAL_GROUNDING: "Intentional Grounding",
  ROUGHING_THE_PASSER: "Roughing the Passer",
  UNNECESSARY_ROUGHNESS: "Unnecessary Roughness",
  FACE_MASK: "Face Mask",
  HORSE_COLLAR_TACKLE: "Horse Collar Tackle",
  CLIPPING: "Clipping",
  CHOP_BLOCK: "Chop Block",
  ILLEGAL_BLOCK_ABOVE_THE_WAIST: "Illegal Block Above the Waist",
  TRIPPING: "Tripping",
  UNSPORTSMANLIKE_CONDUCT: "Unsportsmanlike Conduct",
  TAUNTING: "Taunting",
};

describe("ADR-093 F1: FoulKind", () => {
  it("holds §4.3's 31 fouls, each the NFL's name in capitals with _ between the words", () => {
    expect(Object.keys(NFL_NAME)).toHaveLength(31);
    for (const [kind, name] of Object.entries(NFL_NAME)) expect(kind).toBe(name.toUpperCase().replace(/ /g, "_"));
  });

  it("is closed: no free string, and no foul §4.3 does not name", () => {
    // @ts-expect-error a free string is not a foul
    const free: FoulKind = "Holding";
    // @ts-expect-error nor is a kicking-game foul, which comes with step 8
    const kick: FoulKind = "ROUGHING_THE_KICKER";
    // @ts-expect-error nor a low block, which §4.3's table has no row for
    const low: FoulKind = "LOW_BLOCK";
    // @ts-expect-error nor illegal substitution: the NFL writes §4.3's substitution foul as too many men
    const substitution: FoulKind = "ILLEGAL_SUBSTITUTION";
    expect([free, kick, low, substitution]).toHaveLength(4);
  });
});

describe("ADR-093 F1: FoulFamily", () => {
  it("has §6.1's five families and kicks, and no other", () => {
    const families: Record<FoulFamily, true> = {
      LINE_HOLDING: true, COVERAGE: true, PLAYER_SAFETY: true, TECHNICAL: true, SNAP: true, KICKS: true,
    };
    // @ts-expect-error the families are §6.1's five and KICKS
    const other: FoulFamily = "SPECIAL_TEAMS";
    expect(Object.keys(families)).toHaveLength(6);
    expect(other).toBe("SPECIAL_TEAMS");
  });
});

describe("ADR-093 F1: FoulTiming", () => {
  it("is before the snap, at it, during the play or after it, and no other time", () => {
    const timings: Record<FoulTiming, true> = { BEFORE_SNAP: true, AT_SNAP: true, DURING_PLAY: true, AFTER_PLAY: true };
    // @ts-expect-error a foul between downs is AFTER_PLAY's, or BEFORE_SNAP's of the next down
    const between: FoulTiming = "BETWEEN_DOWNS";
    expect(Object.keys(timings)).toHaveLength(4);
    expect(between).toBe("BETWEEN_DOWNS");
  });
});
