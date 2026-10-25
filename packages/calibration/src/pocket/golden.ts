/**
 * THE GOLDEN DIGESTS (ADR-089 step 0; plan §3.4 and §0).
 *
 * Step 0's prediction is that nothing about play moves: "every stream digest unchanged"
 * (ADR-089 §6.0). These are the digests that prove it, game by game, at every later merge.
 *
 *  - `gameDigest(events)`: `stableDigest` of the game's `{at, event}` list — the canonical form,
 *    keys sorted (`harness/digest.ts`), as `callerV7Stream.test.ts` digests a stream.
 *  - `gameBytesDigest(events)`: FNV-1a over the UTF-16 code units of `JSON.stringify` of the same
 *    list — `stableDigest`'s own loop without `canonicalise`. The canonical form sorts keys, so it
 *    cannot say "byte-identical" alone; this one also holds key order (deviation O15).
 *  - `foldDigests(list)`: `stableDigest` of a list of per-game digests, in fixture order.
 *
 * THE MAPPED DIGEST. `strip` removes named fields before digesting (ADR-073's practice): a later
 * ADR whose change adds a field to the stream and nothing else proves that inert against these
 * pins by stripping it. `GOLDEN_STRIP` is EMPTY at step 0, and an entry may be added only by the
 * named ADR's own commit (risk K11): ADR-090's step 1, for example, would add
 * `{adr: "ADR-090", path: "PLAY_START.payload.snap"}`. Any other move of a pin is re-recorded only
 * by a named Orchestrator commit that cites the main commit that moved it.
 *
 * The pins below were MEASURED at e23bf69 (plan §0) and are what the suite asserts
 * (`test/goldenDigests.*.test.ts`, `test/realSeasonSeam.test.ts`); the per-game lists behind
 * them are `test/fixtures/adr089-golden.json`, which names the first game that moved.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { CallerVersion } from "../caller/anticipate.js";
import { stableDigest } from "../harness/digest.js";

/** One field a named ADR strips before digesting: `<EVENT_TYPE>.<field>[.<field>…]` of the event. */
export interface StripEntry {
  /** The ADR whose commit added the entry, e.g. "ADR-090". */
  readonly adr: string;
  /** The event type, then the path inside that event, e.g. "PLAY_START.payload.snap". */
  readonly path: string;
}

/** Empty at step 0 (K11). */
export const GOLDEN_STRIP: readonly StripEntry[] = Object.freeze([]);

const ADR_NAME = /^ADR-\d{3}$/;

function parseStrip(strip: readonly StripEntry[]): readonly { readonly type: string; readonly path: readonly string[] }[] {
  return strip.map((entry) => {
    if (!ADR_NAME.test(entry.adr)) throw new Error(`a strip entry must name its ADR (got "${entry.adr}" for ${entry.path})`);
    const [type, ...path] = entry.path.split(".");
    if (type === undefined || type.length === 0 || path.length === 0 || path.some((p) => p.length === 0)) {
      throw new Error(`strip path "${entry.path}" (${entry.adr}) must be <EVENT_TYPE>.<field>[.<field>…]`);
    }
    return { type, path };
  });
}

/** `value` with the field at `path` removed; every object along the path is copied, never mutated. */
function without(value: unknown, path: readonly string[]): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const [head, ...rest] = path;
  if (head === undefined || !(head in value)) return value;
  const record = value as Record<string, unknown>;
  if (rest.length === 0) {
    const { [head]: _dropped, ...kept } = record;
    return kept;
  }
  return { ...record, [head]: without(record[head], rest) };
}

/** The game's `{at, event}` list, as the digests read it, with any strip entries applied. */
export function goldenStream(
  events: readonly MatchEventEnvelope[],
  strip: readonly StripEntry[] = GOLDEN_STRIP,
): readonly { readonly at: unknown; readonly event: unknown }[] {
  const parsed = parseStrip(strip);
  return events.map((e) => {
    let event: unknown = e.event;
    for (const s of parsed) if (e.event.type === s.type) event = without(event, s.path);
    return { at: e.at, event };
  });
}

/** FNV-1a over UTF-16 code units, printed as `stableDigest` prints it. */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export function gameDigest(events: readonly MatchEventEnvelope[], strip: readonly StripEntry[] = GOLDEN_STRIP): string {
  return stableDigest(goldenStream(events, strip));
}

export function gameBytesDigest(events: readonly MatchEventEnvelope[], strip: readonly StripEntry[] = GOLDEN_STRIP): string {
  return fnv1a(JSON.stringify(goldenStream(events, strip)));
}

export function foldDigests(list: readonly string[]): string {
  return stableDigest(list);
}

// --- the pins (MEASURED at e23bf69, plan §0) ---------------------------------

/**
 * The tree the pins and the fixture's per-game lists were measured at (plan §0). The fixture
 * carries it as `measuredAt`, its writer stamps it from here, and the golden tests assert the two
 * agree. A re-record under K11 changes it in the same named commit, with the pins, and re-runs
 * `test/goldenBaseRecipe.test.ts` at that tree (`goldenBaseCheck.test.ts` compares).
 */
export const GOLDEN_MEASURED_AT = "e23bf69";

export type GoldenLeague = "flat" | "gen";
export const GOLDEN_LEAGUES: readonly GoldenLeague[] = ["flat", "gen"];

export interface GoldenPin {
  /** `foldDigests` of the 50 `gameDigest`s. Pinned. */
  readonly canonicalFold: string;
  /** `foldDigests` of the 50 `gameBytesDigest`s. Pinned. */
  readonly byteFold: string;
  /** `stableDigest` of all 50 streams at once. RECORDED, not built in the suite (one case's string is 171 M characters). */
  readonly wholeCanonical: string;
  /** `{at, event}` entries over the 50 games. */
  readonly events: number;
}

const pin = (canonicalFold: string, byteFold: string, wholeCanonical: string, events: number): GoldenPin =>
  Object.freeze({ canonicalFold: `fnv1a:${canonicalFold}`, byteFold: `fnv1a:${byteFold}`, wholeCanonical: `fnv1a:${wholeCanonical}`, events });

/** §0's 28 folds (and the 14 whole-canonical values, recorded), by league and caller. */
export const GOLDEN_PINS: Readonly<Record<GoldenLeague, Readonly<Record<CallerVersion, GoldenPin>>>> = Object.freeze({
  flat: Object.freeze({
    v1: pin("c9f7e702", "134c54b9", "9a240402", 291_020),
    v2: pin("fac316e2", "252e550e", "bd55f0f9", 287_739),
    v3: pin("4f57e7dd", "1ac3acf0", "c162dc54", 289_075),
    v4: pin("0ec0433e", "4280708c", "88d7b637", 288_317),
    v5: pin("af5ee328", "f8c8c607", "ab94f57a", 288_653),
    v6: pin("878322ec", "9db97791", "024c2f81", 288_791),
    v7: pin("f8d592a4", "25346e73", "554597fc", 288_693),
  }),
  gen: Object.freeze({
    v1: pin("dd772d83", "17af5fcb", "e0e1aa1d", 306_555),
    v2: pin("d66f19f1", "ee616b82", "e81fd91e", 304_949),
    v3: pin("a8c42ad2", "94c09752", "11c3b336", 308_613),
    v4: pin("c66461a6", "babd2325", "2c521a34", 303_526),
    v5: pin("3b924055", "c12b3ed8", "1d545b3f", 303_311),
    v6: pin("29010b41", "c7561641", "8025b838", 305_129),
    v7: pin("339af636", "1a4d81b0", "757fdc1c", 304_621),
  }),
});

/**
 * The season path (C1-S9, C2-S5): `runRealSeason({seed: "pk-01"})` stopped after 2027's regular
 * season week 4, day 7 — 64 games, on the default caller and the default leash.
 */
export const SEASON_PATH_PINS = Object.freeze({
  seed: "pk-01",
  stopAfter: Object.freeze({ season: 2027, phase: "REGULAR_SEASON", week: 4, day: 7 } as const),
  games: 64,
  canonicalFold: "fnv1a:4575469e",
  byteFold: "fnv1a:7122fc33",
  first50CanonicalFold: "fnv1a:20964c10",
  first50ByteFold: "fnv1a:33c89b04",
  /** `stableDigest` of the returned `run`. */
  run: "fnv1a:4d13549c",
});
