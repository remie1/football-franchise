/**
 * Rookie ages for made-up classes on the week-8 53s (ADR-087 §12.5, AB4; fitted there by AB4b). With
 * growth on and `aging: "ability"`, a class's ages are drawn against talent (attributes' copula), so
 * the less talented, who go undrafted, run older; the class's draft-day shares and the link (ρ) are
 * fitted so that the rookies of a made-up class still on a 53 at week 8, counted like the NFL, land on
 * REAL's: whole-year mean 22.67, and the undrafted 0.62 older than the drafted (REAL, fractional ages:
 * 23.01 against 23.63; 2018-24, `reports/nfl-careers.md`'s rookie count).
 *
 * This lives in calibration because it is the one package that may both make a class
 * (`generateDraftClass`, ADR-086 R1) and run the draft and the season after it (`runSeason`, ADR-078
 * R1). The first test plays the career check's own walk (`runCapCheck` on the stand-in league, arm
 * `both`: growth and injuries on, the real engine, the players' and coaches' steps) to week 8 day 1 of
 * its second season, where the walk's first made-up class (the stand-in league's own rookies are real
 * men) is in its first season, and reads its rookies with the career check's reader (`rosterPicture`,
 * counted like the NFL). It checks attributes' fitted shares and ρ; it does not tune them. The second
 * plays only the first draft, every game a seeded coin, to show that at the default aging the class's
 * ages do not follow talent.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createRng, type FranchiseEvent, type PlayerState } from "@ff/contracts";
import type { runSeason, SeasonRun } from "@ff/franchise";
import { runCapCheck, type CapCheckInput } from "../src/season/capCheck.js";
import { outFourWeeksBand, rosterPicture, type RosterPicture } from "../src/season/careerCheck.js";
import { readStandInFile } from "../src/season/standInLeague.js";

type SeasonInput = Parameters<typeof runSeason>[0];

const hook = vi.hoisted(() => ({ draftOnly: false }));
vi.mock("@ff/franchise", async (importOriginal) => {
  const real = await importOriginal<typeof import("@ff/franchise")>();
  return {
    ...real,
    // The draft alone (the second test): a seeded coin for every game, and none of the players' or coaches' steps.
    runSeason: (input: SeasonInput): SeasonRun => {
      if (!hook.draftOnly) return real.runSeason(input);
      const { players: _p, coaching: _c, meeting: _m, ...rest } = input;
      return real.runSeason({ ...rest, resolve: coin });
    },
  };
});

/** A game's result from a seeded coin: who won does not matter here, only that the season finishes. */
const coin: SeasonInput["resolve"] = (game, seed) => {
  const rng = createRng(seed, "rookie-ages-coin");
  const homeScore = 3 * rng.int(0, 10), awayScore = 3 * rng.int(0, 10) + (rng.int(0, 1) === 0 ? 1 : 2);
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: "REGULATION", seed };
};

const FILE = join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json");
const file = readStandInFile(readFileSync(FILE, "utf8")) as CapCheckInput["file"];

class Stop extends Error {}

/**
 * The walk's week 8, day 1 of its second season on `seed`, as the career check reads it: the 53s
 * counted like the NFL, a rookie a man whose first season is that one (the walk's first made-up class,
 * ids `d:<season>:`; the league file's men came in before it).
 */
function weekEight(seed: string): RosterPicture {
  const season = file.season + 1;
  let read: RosterPicture | undefined;
  try {
    runCapCheck({
      seed, file, seasons: 2, players: { development: true, injuries: true, aging: "ability" },
      onDay: (s, day, people) => {
        if (s !== season || day.phase !== "REGULAR_SEASON" || day.week !== 8 || day.day !== 1) return;
        read = rosterPicture(people, { season, firstSeasonOf: (id) => (id.startsWith(`d:${season}:`) ? season : file.season) }, outFourWeeksBand);
        throw new Stop();
      },
    });
  } catch (e) {
    if (!(e instanceof Stop)) throw e;
  }
  return read!;
}

interface DraftAges {
  readonly drafted: number[];
  readonly undrafted: number[];
}

/**
 * The walk's first draft (class `file.season + 1`) on `seed`: the ages of the men it drafted and of
 * the undrafted it signed, as the year's end leaves them (a year older than on draft day, every one).
 */
function firstDraft(seed: string, players: CapCheckInput["players"]): DraftAges {
  const draft = file.season + 1;
  let seen: { events: readonly FranchiseEvent[]; people: { players: readonly PlayerState[] } } | undefined;
  hook.draftOnly = true;
  try {
    runCapCheck({ seed, file, seasons: 1, ...(players ? { players } : {}), onRun: (_s, events, people) => { seen = { events, people }; } });
  } finally {
    hook.draftOnly = false;
  }
  const picked = new Set(seen!.events.filter((e) => e.type === "DRAFT_PICK_MADE").map((e) => String((e.payload as { player: unknown }).player)));
  const inClass = seen!.people.players.filter((p) => String(p.bio.id).startsWith(`d:${draft}:`));
  const drafted = inClass.filter((p) => picked.has(String(p.bio.id)));
  const undrafted = inClass.filter((p) => p.bio.draft === "UDFA");
  expect(drafted.every((p) => typeof p.bio.draft === "object" && p.bio.draft.year === draft)).toBe(true);
  expect(drafted.length + undrafted.length).toBe(inClass.length);
  return { drafted: drafted.map((p) => p.bio.age), undrafted: undrafted.map((p) => p.bio.age) };
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const SEEDS = ["rookie-ages-1", "rookie-ages-2"];

describe("rookie ages of made-up classes (ADR-087 §12.5, AB4 and AB4b)", () => {
  it("with aging \"ability\", the first made-up class's rookies on the week-8 53s land on REAL: mean 22.67, the undrafted 0.62 older", () => {
    const reads = SEEDS.map(weekEight);
    // Pooled over the men of both seeds, as the career check's grader pools a window.
    const pool = (k: "drafted" | "undrafted") => {
      const n = reads.reduce((s, r) => s + r.rookieAgeByDraft[k].n, 0);
      return { n, mean: reads.reduce((s, r) => s + r.rookieAgeByDraft[k].n * r.rookieAgeByDraft[k].mean, 0) / n };
    };
    const d = pool("drafted"), u = pool("undrafted");
    for (const r of reads) {
      expect(r.rookieAgeByDraft.drafted.n).toBeGreaterThan(120);
      expect(r.rookieAgeByDraft.undrafted.n).toBeGreaterThan(50);
      expect(r.rookieAgeByDraft.drafted.n + r.rookieAgeByDraft.undrafted.n).toBe(r.rookieAge.n);
      // A year past draft day (the year turn): 21 to 26.
      expect(Object.keys(r.rookieAge.histogram).every((a) => Number(a) >= 21 && Number(a) <= 26)).toBe(true);
    }
    const all = (d.n * d.mean + u.n * u.mean) / (d.n + u.n);
    // MEASURED on these two seeds: 477 rookies (340 drafted, mean 22.45; 137 undrafted, 23.18), mean
    // 22.66, the undrafted 0.73 older (0.79 and 0.68 by seed). The bands (CHOSEN) are REAL ± 2 standard
    // errors of a two-seed reading, from the seed-to-seed sds of AB4b's confirming run (24 seeds, sd 0.074
    // for the mean and 0.099 for the gap): 22.57-22.77 and 0.48-0.76. The sim's ages are whole years and
    // REAL's gap is of fractional ages; a gap needs no offset if both groups' birthdays fall alike across
    // the year (an assumption, as the grader reads it). AB4's table (draft-day shares computed from REAL
    // for the whole class, ρ 0.57) fails both: on 24 seeds of AB4b's tool it read 22.13 and a gap of
    // 0.35 here (MEASURED, ADR-087 §12.9's AB4b note).
    expect(all).toBeGreaterThan(22.57);
    expect(all).toBeLessThan(22.77);
    const gap = u.mean - d.mean;
    expect(gap).toBeGreaterThan(0.48);
    expect(gap).toBeLessThan(0.76);
  }, 1_800_000);

  it("at the default aging, the class's ages do not follow talent: drafted and undrafted are the same age after the draft", () => {
    const all = firstDraft(SEEDS[0]!, { development: true });
    expect(Math.abs(mean(all.undrafted) - mean(all.drafted))).toBeLessThan(0.15);
    for (const a of [...all.drafted, ...all.undrafted]) expect(a >= 22 && a <= 24, String(a)).toBe(true);
  }, 600_000);
});
