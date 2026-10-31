/**
 * ADR-089 step 0 — THE GOLDEN PINS AGAINST THE BASE RECIPE'S OUTPUT (plan §0; review finding NPC-S2).
 *
 * `goldenBaseRecipe.test.ts`, run in a checkout of `e23bf69`, writes every golden digest and the
 * season path's pins as the base tree plays them. This file, run in this tree, asserts that what
 * step 0 pins is exactly that: the fixture's 1,400 per-game hashes (and its seeds), the 28 folds,
 * the 14 whole-canonical digests and event counts (`GOLDEN_PINS`), and the season path's folds and
 * run digest (`SEASON_PATH_PINS`). Gated on the recipe's output file:
 *
 *   FF_POCKET_GOLDEN_BASE=<file.json> pnpm --filter @ff/calibration test goldenBaseCheck
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CALLER_VERSIONS } from "../src/caller/anticipate.js";
import { GOLDEN_LEAGUES, GOLDEN_MEASURED_AT, GOLDEN_PINS, SEASON_PATH_PINS } from "../src/pocket/golden.js";
import { readGoldenFixture } from "./goldenDigestsShared.js";

const BASE = process.env["FF_POCKET_GOLDEN_BASE"];

interface RecipeCase {
  readonly seeds: readonly string[];
  readonly canonical: readonly string[];
  readonly bytes: readonly string[];
  readonly canonicalFold: string;
  readonly byteFold: string;
  readonly wholeCanonical: string;
  readonly events: number;
}
interface Recipe {
  readonly format: string;
  readonly leagues: Readonly<Record<string, Readonly<Record<string, RecipeCase>>>>;
  readonly seasonPath: {
    readonly games: number;
    readonly canonicalFold: string;
    readonly byteFold: string;
    readonly first50CanonicalFold: string;
    readonly first50ByteFold: string;
    readonly run: string;
  };
}

describe.skipIf(BASE === undefined)(`ADR-089 step 0: the pins equal the base recipe's run at ${GOLDEN_MEASURED_AT} (FF_POCKET_GOLDEN_BASE)`, () => {
  const recipe = (): Recipe => {
    const r = JSON.parse(readFileSync(BASE!, "utf8")) as Recipe;
    expect(r.format).toBe("adr-089-golden-recipe/v1");
    return r;
  };

  it("the fixture's 1,400 per-game hashes and its seeds are the base run's, game by game", () => {
    const r = recipe();
    const fixture = readGoldenFixture();
    expect(fixture?.measuredAt).toBe(GOLDEN_MEASURED_AT);
    let hashes = 0;
    for (const league of GOLDEN_LEAGUES) {
      for (const caller of CALLER_VERSIONS) {
        const base = r.leagues[league]?.[caller];
        const pinned = fixture?.leagues[league]?.[caller];
        expect(base, `${league} ${caller} in the recipe`).toBeDefined();
        expect(pinned, `${league} ${caller} in the fixture`).toBeDefined();
        expect(pinned!.seeds, `${league} ${caller} seeds`).toEqual(base!.seeds);
        expect(pinned!.canonical, `${league} ${caller} canonical`).toEqual(base!.canonical);
        expect(pinned!.bytes, `${league} ${caller} bytes`).toEqual(base!.bytes);
        hashes += pinned!.canonical.length + pinned!.bytes.length;
      }
    }
    expect(hashes).toBe(1400);
  });

  it("GOLDEN_PINS (28 folds, 14 whole-canonical digests and event counts) are the base run's", () => {
    const r = recipe();
    for (const league of GOLDEN_LEAGUES) {
      for (const caller of CALLER_VERSIONS) {
        const base = r.leagues[league]![caller]!;
        expect(GOLDEN_PINS[league][caller], `${league} ${caller}`).toEqual({
          canonicalFold: base.canonicalFold,
          byteFold: base.byteFold,
          wholeCanonical: base.wholeCanonical,
          events: base.events,
        });
      }
    }
  });

  it("SEASON_PATH_PINS are the base run's", () => {
    const s = recipe().seasonPath;
    expect({
      games: SEASON_PATH_PINS.games,
      canonicalFold: SEASON_PATH_PINS.canonicalFold,
      byteFold: SEASON_PATH_PINS.byteFold,
      first50CanonicalFold: SEASON_PATH_PINS.first50CanonicalFold,
      first50ByteFold: SEASON_PATH_PINS.first50ByteFold,
      run: SEASON_PATH_PINS.run,
    }).toEqual({
      games: s.games,
      canonicalFold: s.canonicalFold,
      byteFold: s.byteFold,
      first50CanonicalFold: s.first50CanonicalFold,
      first50ByteFold: s.first50ByteFold,
      run: s.run,
    });
  });
});
