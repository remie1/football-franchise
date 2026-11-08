/**
 * Rookie ages for made-up classes after the draft (ADR-087 §12.5, AB4). With growth on and
 * `aging: "ability"`, a class's ages are drawn against talent (attributes' copula), so the less
 * talented, who go undrafted, run older. REAL: with fractional ages, drafted rookies on week-8 53s
 * average 23.01 and undrafted 23.63, 0.62 older (2018-24, `reports/nfl-careers.md`'s rookie count).
 *
 * This lives in calibration because it is the one package that may both make a class
 * (`generateDraftClass`, ADR-086 R1) and run the draft (`runSeason`, ADR-078 R1). It plays the walk's
 * first year on the stand-in league as `runCapCheck` sets it up (the league year, the draft with the
 * walk's own class options, the year turn), with every game answered by a seeded coin in place of the
 * engine and no players' or coaches' steps: the draft is all it reads, and nothing in the draft or the
 * undrafted scramble reads a prospect's age. It checks attributes' chosen ρ; it does not tune it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createRng, type FranchiseEvent, type PlayerState } from "@ff/contracts";
import type { runSeason, SeasonRun } from "@ff/franchise";
import { runCapCheck, type CapCheckInput } from "../src/season/capCheck.js";
import { readStandInFile } from "../src/season/standInLeague.js";

type SeasonInput = Parameters<typeof runSeason>[0];

const hook = vi.hoisted(() => ({ draftOnly: false }));
vi.mock("@ff/franchise", async (importOriginal) => {
  const real = await importOriginal<typeof import("@ff/franchise")>();
  return {
    ...real,
    // The draft alone: a seeded coin for every game, and none of the players' or coaches' steps.
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
const pooled = (runs: readonly DraftAges[]) => ({ drafted: runs.flatMap((r) => r.drafted), undrafted: runs.flatMap((r) => r.undrafted) });
const SEEDS = ["rookie-ages-1", "rookie-ages-2"];
const ABILITY = { development: true, aging: "ability" } as const;

describe("rookie ages after the draft (ADR-087 §12.5, AB4)", () => {
  it("with aging \"ability\", the undrafted signees run about 0.6 years older than the men drafted (REAL 0.62)", () => {
    const runs = SEEDS.map((s) => firstDraft(s, ABILITY));
    for (const r of runs) {
      expect(r.drafted.length).toBeGreaterThanOrEqual(224);
      expect(r.undrafted.length).toBeGreaterThan(100);
    }
    const all = pooled(runs);
    // MEASURED on these two seeds: 448 drafted, mean 22.03; 868 undrafted signees, mean 22.66; 0.631 older
    // (0.670 and 0.596). The band is about 3 standard errors of a two-seed gap (about 0.056) around 0.62.
    const gap = mean(all.undrafted) - mean(all.drafted);
    expect(gap).toBeGreaterThan(0.45);
    expect(gap).toBeLessThan(0.8);
    // Ages a year past draft day (the year turn): 21 to 26.
    for (const a of [...all.drafted, ...all.undrafted]) expect(a >= 21 && a <= 26, String(a)).toBe(true);
  }, 600_000);

  it("at the default aging, the class's ages do not follow talent: drafted and undrafted are the same age", () => {
    const all = pooled([firstDraft(SEEDS[0]!, { development: true })]);
    expect(Math.abs(mean(all.undrafted) - mean(all.drafted))).toBeLessThan(0.15);
    for (const a of [...all.drafted, ...all.undrafted]) expect(a >= 22 && a <= 24, String(a)).toBe(true);
  }, 600_000);
});
