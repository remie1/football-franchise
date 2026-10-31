/**
 * ADR-089 STEP 3 (plan §9 commit 12): determinism per rules version, with the s3 case (Iron Rule 4).
 *
 * The engine's own `determinism` test is stream E's path; this file is calibration's per-version
 * case through the real caller and the golden games: under `legacy`, `pocket-1.s1`, `pocket-1.s2`
 * and `pocket-1.s3`, the same game on the same seed gives a byte-identical event stream, and s3's
 * stream is not s2's (the step-3 blocks change the game). Every playable step-3 arm replays
 * byte-identically, a mirrored s3 game too. The only new dice are R-4's (the late beat's uniform),
 * read from the stream elsewhere (`pocketStep3Stream`, `passRushRepRollRef`); here a replay is the
 * whole stream, serialized.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { armById, armRefusal, STEP3_ARM_IDS } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES, type GoldenLeague } from "../src/pocket/golden.js";
import { ENGINE_RULES, rulesTunables } from "../src/pocket/rules.js";

/** Golden game 0 of a league, played under `tunables`: its whole stream, serialized. */
function game0(league: GoldenLeague, tunables: Tunables, mirror = false): string {
  const out: (readonly MatchEventEnvelope[])[] = [];
  goldenGames(league, (o) => out.push(o.events), { tunables, callerVersion: "v7", first: 1, ...(mirror ? { mirror: true } : {}) });
  expect(out).toHaveLength(1);
  return JSON.stringify(out[0]);
}

describe("ADR-089 step 3: the same seed gives the same stream, per rules version", () => {
  it.each(ENGINE_RULES.flatMap((rules) => GOLDEN_LEAGUES.map((league) => [rules, league] as const)))("%s, golden %s game 0, played twice", (rules, league) => {
    const t = rulesTunables(rules);
    const a = game0(league, t);
    const b = game0(league, t);
    expect(a.length).toBeGreaterThan(0);
    expect(b).toBe(a);
  }, 600_000);

  it("s3 is not s2: the step-3 blocks change golden game 0 in both leagues", () => {
    for (const league of GOLDEN_LEAGUES) expect(game0(league, rulesTunables("pocket-1.s3"))).not.toBe(game0(league, rulesTunables("pocket-1.s2")));
  }, 600_000);

  it("a mirrored s3 game replays byte-identically, and is not the unmirrored one", () => {
    const t = rulesTunables("pocket-1.s3");
    const a = game0("flat", t, true);
    expect(game0("flat", t, true)).toBe(a);
    expect(a).not.toBe(game0("flat", t));
  }, 600_000);
});

describe("ADR-089 step 3: every playable step-3 arm replays byte-identically", () => {
  const ARMS = STEP3_ARM_IDS.filter((id) => armRefusal(id) === undefined && id !== "C6");
  it.each(ARMS)("%s, golden flat game 0, played twice", (id) => {
    const t = armById(id).tunables;
    expect(game0("flat", t)).toBe(game0("flat", t));
  }, 600_000);

  it("C6 (the Mug's head-only picture) is refused by the frozen pair until it draws the arm's picture (K5)", () => {
    expect(() => game0("flat", armById("C6").tunables)).toThrow(/MUG_HEAD_ONLY/);
  });
});
