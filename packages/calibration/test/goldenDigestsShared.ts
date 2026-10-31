/**
 * ADR-089 step 0 — THE GOLDEN DIGESTS, shared by `goldenDigests.flat.test.ts` and
 * `goldenDigests.gen.test.ts` (one file per league, so the two run in parallel).
 *
 * For each caller v1 to v7, the league's 50 golden games are played and each game's canonical and
 * byte digests taken (`src/pocket/golden.ts`). Their folds must equal the pins MEASURED at e23bf69
 * (`GOLDEN_PINS`, plan §0). On a mismatch the failure names the first game that moved, from the
 * per-game lists in `test/fixtures/adr089-golden.json`.
 *
 * THE FIXTURE is written once, by this same code, with `FF_POCKET_GOLDEN_WRITE=<league>` (`flat` or
 * `gen`): the variable names the ONE league file that writes, so the two files, which share the
 * fixture, never write it at once. A written list must still fold to the pins, or the write fails,
 * and the writer stamps `measuredAt` from `GOLDEN_MEASURED_AT`, which the fixture case asserts.
 * Re-recording is a named commit's job (`src/pocket/golden.ts`, risk K11).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { CALLER_VERSIONS, type CallerVersion } from "../src/caller/anticipate.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { foldDigests, gameBytesDigest, gameDigest, GOLDEN_LEAGUES, GOLDEN_MEASURED_AT, GOLDEN_PINS, goldenStream, type GoldenLeague } from "../src/pocket/golden.js";

export const GOLDEN_FIXTURE_PATH = resolve(import.meta.dirname, "fixtures", "adr089-golden.json");
export const GOLDEN_FIXTURE_FORMAT = "adr-089-golden/v1";

export interface GoldenList {
  readonly seeds: readonly string[];
  readonly canonical: readonly string[];
  readonly bytes: readonly string[];
}
export interface GoldenFixture {
  readonly format: string;
  readonly measuredAt: string;
  readonly leagues: Partial<Record<GoldenLeague, Partial<Record<CallerVersion, GoldenList>>>>;
}

export function readGoldenFixture(): GoldenFixture | undefined {
  if (!existsSync(GOLDEN_FIXTURE_PATH)) return undefined;
  const parsed = JSON.parse(readFileSync(GOLDEN_FIXTURE_PATH, "utf8")) as GoldenFixture;
  if (parsed.format !== GOLDEN_FIXTURE_FORMAT) throw new Error(`${GOLDEN_FIXTURE_PATH}: format ${String(parsed.format)}, expected ${GOLDEN_FIXTURE_FORMAT}`);
  return parsed;
}

/** The first game whose canonical or byte digest differs from the fixture's, said in words. */
export function firstMoved(league: GoldenLeague, caller: CallerVersion, got: GoldenList, pinned: GoldenList | undefined): string {
  if (pinned === undefined) return `no per-game list for ${league} ${caller} in ${GOLDEN_FIXTURE_PATH}`;
  const n = Math.max(got.canonical.length, pinned.canonical.length);
  for (let i = 0; i < n; i++) {
    if (got.canonical[i] !== pinned.canonical[i] || got.bytes[i] !== pinned.bytes[i]) {
      return (
        `first game that moved: ${league} ${caller} game ${String(i)} (seed ${String(got.seeds[i] ?? pinned.seeds[i])}): ` +
        `canonical ${String(got.canonical[i])} against ${String(pinned.canonical[i])}, ` +
        `bytes ${String(got.bytes[i])} against ${String(pinned.bytes[i])}`
      );
    }
  }
  return `every game equals the fixture's list, so the fixture itself no longer folds to the pin`;
}

export function playGolden(league: GoldenLeague, callerVersion: CallerVersion): GoldenList & { readonly events: number } {
  const seeds: string[] = [];
  const canonical: string[] = [];
  const bytes: string[] = [];
  let events = 0;
  goldenGames(
    league,
    (observation, _snapshot, meta) => {
      seeds.push(meta.seed);
      canonical.push(gameDigest(observation.events));
      bytes.push(gameBytesDigest(observation.events));
      // The entries the digests read: ADR-090 step 3's records at the line are stripped (GOLDEN_STRIP).
      events += goldenStream(observation.events).length;
    },
    { callerVersion },
  );
  return { seeds, canonical, bytes, events };
}

/**
 * Which league file the gated writer runs in: `FF_POCKET_GOLDEN_WRITE` must name one league
 * (`flat` or `gen`); any other value is refused, so `=1` (both files writing the one fixture at
 * once) cannot happen.
 */
export function goldenWriter(value: string | undefined): GoldenLeague | undefined {
  if (value === undefined || value === "") return undefined;
  if ((GOLDEN_LEAGUES as readonly string[]).includes(value)) return value as GoldenLeague;
  throw new Error(`FF_POCKET_GOLDEN_WRITE must name one league (${GOLDEN_LEAGUES.join(" or ")}), so that one file writes the fixture; got "${value}"`);
}

export function goldenSuite(league: GoldenLeague): void {
  const writing = goldenWriter(process.env["FF_POCKET_GOLDEN_WRITE"]) === league;
  const fixture = readGoldenFixture();
  const written: Partial<Record<CallerVersion, GoldenList>> = {};

  describe(`ADR-089 step 0: golden digests, ${league} league, callers v1-v7 (no play change)`, () => {
    it.skipIf(writing)("the fixture's per-game lists fold to the pins, for every caller", () => {
      expect(fixture, `${GOLDEN_FIXTURE_PATH} is missing; write it with FF_POCKET_GOLDEN_WRITE=${league}`).toBeDefined();
      expect(fixture!.measuredAt, "the fixture's stamp is the tree the pins were measured at (GOLDEN_MEASURED_AT)").toBe(GOLDEN_MEASURED_AT);
      for (const caller of CALLER_VERSIONS) {
        const list = fixture!.leagues[league]?.[caller];
        expect(list, `${league} ${caller}`).toBeDefined();
        expect(list!.canonical.length, `${league} ${caller}`).toBe(50);
        expect(list!.bytes.length, `${league} ${caller}`).toBe(50);
        expect(foldDigests(list!.canonical), `${league} ${caller} canonical`).toBe(GOLDEN_PINS[league][caller].canonicalFold);
        expect(foldDigests(list!.bytes), `${league} ${caller} bytes`).toBe(GOLDEN_PINS[league][caller].byteFold);
      }
    });

    it.each(CALLER_VERSIONS)(
      "%s: the 50 games' canonical and byte folds equal the pins measured at e23bf69",
      (caller) => {
        const got = playGolden(league, caller);
        const pin = GOLDEN_PINS[league][caller];
        const canonicalFold = foldDigests(got.canonical);
        const byteFold = foldDigests(got.bytes);
        if (canonicalFold !== pin.canonicalFold || byteFold !== pin.byteFold) {
          expect.fail(
            `ADR-089 §6.0: the ${league} ${caller} stream moved (canonical fold ${canonicalFold}, pinned ` +
              `${pin.canonicalFold}; byte fold ${byteFold}, pinned ${pin.byteFold}). ` +
              firstMoved(league, caller, got, fixture?.leagues[league]?.[caller]),
          );
        }
        expect(got.events, `${league} ${caller}: {at, event} entries over the 50 games`).toBe(pin.events);
        if (writing) written[caller] = { seeds: got.seeds, canonical: got.canonical, bytes: got.bytes };
      },
      5 * 60_000,
    );

    afterAll(() => {
      if (!writing) return;
      // Written only when every caller was played and folded to its pin (a failed `it` throws first).
      if (CALLER_VERSIONS.some((c) => written[c] === undefined)) return;
      const now = readGoldenFixture();
      const next: GoldenFixture = {
        format: GOLDEN_FIXTURE_FORMAT,
        measuredAt: GOLDEN_MEASURED_AT,
        leagues: { ...(now?.leagues ?? {}), [league]: written },
      };
      writeFileSync(GOLDEN_FIXTURE_PATH, `${JSON.stringify(next, null, 1)}\n`);
    });
  });
}
