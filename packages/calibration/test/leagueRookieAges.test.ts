/**
 * The made-up league's own rookies' ages on the week-8 53s (ADR-087 §12.5, the orchestrator's second ruling on
 * it, 2026-11-08). With growth on and `aging: "ability"`, the generator gives its rookies-to-be the league's
 * own table (attributes' `ROOKIE_AGE_ON_53`: REAL's week-8 shares, copied, and its own ρ), since every one of
 * them starts on a 53 with no cut-down from a class. Its ρ is fitted so that at week 8 of the league's first
 * season the undrafted rookies run 0.62 years older than the drafted (REAL, fractional ages: 23.01 against
 * 23.63; 2018-24, `reports/nfl-careers.md`'s rookie count).
 *
 * This plays the season command's own made-up league (`--development --injuries --aging ability`: the real
 * engine, the coaching world, the reserve pool) to the end of week 7 on four leagues and reads its rookies
 * (no credited season yet) on the 53s counted like the NFL (a man out with a LONG or MAJOR injury left out).
 * It checks attributes' table; it does not tune it.
 */
import { describe, expect, it } from "vitest";
import type { PlayerState } from "@ff/contracts";
import { buildLeague, buildStaff } from "@ff/franchise";
import { DEFAULT_SEASON, runRealSeason } from "../src/season/realSeason.js";
import { outFourWeeksBand } from "../src/season/careerCheck.js";

interface Rookies {
  readonly drafted: number[];
  readonly undrafted: number[];
}

/** The rookies on the week-8 53s of the made-up league `seed`'s first season, counted like the NFL. */
function weekEight(seed: string): Rookies {
  const season = DEFAULT_SEASON;
  const world = buildStaff(buildLeague(seed), { firstSeason: season, lineups: true }).world;
  const { run } = runRealSeason({
    seed, season, players: { development: true, injuries: true, aging: "ability" }, coaching: { world },
    stopAfter: { season, phase: "REGULAR_SEASON", week: 7, day: 7 },
  });
  const people = run.people!;
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const on53: PlayerState[] = [];
  for (const t of people.teams) for (const id of t.roster) {
    const p = byId.get(String(id));
    if (p !== undefined && !outFourWeeksBand(p)) on53.push(p);
  }
  const rookies = on53.filter((p) => p.bio.creditedSeasons === 0);
  return {
    drafted: rookies.filter((p) => typeof p.bio.draft === "object").map((p) => p.bio.age),
    undrafted: rookies.filter((p) => typeof p.bio.draft !== "object").map((p) => p.bio.age),
  };
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const SEEDS = ["league-rookie-ages-1", "league-rookie-ages-2", "league-rookie-ages-3", "league-rookie-ages-4"];

describe("the made-up league's own rookie ages (ADR-087 §12.5, the league's own table)", () => {
  it("with aging \"ability\", its rookies on the week-8 53s land on REAL: mean 22.67, the undrafted 0.62 older", () => {
    const reads = SEEDS.map(weekEight);
    for (const r of reads) {
      expect(r.drafted.length).toBeGreaterThan(300);
      expect(r.undrafted.length).toBeGreaterThan(90);
      expect([...r.drafted, ...r.undrafted].every((a) => Number.isInteger(a) && a >= 20 && a <= 26)).toBe(true);
    }
    // Pooled over the men of the four leagues.
    const drafted = reads.flatMap((r) => r.drafted), undrafted = reads.flatMap((r) => r.undrafted);
    const all = mean([...drafted, ...undrafted]);
    const gap = mean(undrafted) - mean(drafted);
    // MEASURED on these four leagues: 2,078 rookies (1,510 drafted, mean 22.52; 568 undrafted, 23.12), mean 22.68,
    // the undrafted 0.60 older (0.51, 0.61, 0.57 and 0.72 by league). The bands (CHOSEN) are REAL ± 2 standard
    // errors of a four-league reading, from the league-to-league sds of the table's confirming run (16 leagues
    // ab4b-gen-1 to -16, sd 0.051 for the mean and 0.081 for the gap): 22.62-22.72 and 0.54-0.70. AB4b's draw
    // here (the class's table at ρ 0.70, a year on) read 23.58 and a gap of 1.20 on eight leagues, and AB4's
    // 22.72 and 0.81 (MEASURED, ADR-087 §12.9's AB4b note).
    expect(all).toBeGreaterThan(22.62);
    expect(all).toBeLessThan(22.72);
    expect(gap).toBeGreaterThan(0.54);
    expect(gap).toBeLessThan(0.7);
  }, 1_200_000);
});
