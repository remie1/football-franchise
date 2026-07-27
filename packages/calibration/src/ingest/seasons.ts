/**
 * Seasons in scope, and the *mechanical* expression of the held-out-season contract.
 *
 * `calibration.md` §7: **tune on 2022–2024; 2025 is sacred.** No tunable patch and no rating
 * patch may cite 2025 evidence; the 2025 baseline runs only at declared checkpoints.
 *
 * This module makes that a type, not a convention. See `eligibility.ts` for the evidence
 * envelope that carries it through to consumers.
 */

/** Seasons the ingestion layer covers (calibration.md §2). */
export const INGEST_SEASONS = [2022, 2023, 2024, 2025] as const;

export type Season = (typeof INGEST_SEASONS)[number];

/**
 * What a season's data may be used for.
 * - `TUNING`   — may be cited as evidence in a tunable or rating patch.
 * - `HELD_OUT` — may only be read under a declared checkpoint (calibration.md §7).
 */
export type Eligibility = "TUNING" | "HELD_OUT";

/** The sacred seasons. Single source of truth; everything else derives from it. */
export const HELD_OUT_SEASONS = [2025] as const satisfies readonly Season[];

export const TUNING_SEASONS = INGEST_SEASONS.filter(
  (s): s is Season => !(HELD_OUT_SEASONS as readonly number[]).includes(s),
);

export function isSeason(value: number): value is Season {
  return (INGEST_SEASONS as readonly number[]).includes(value);
}

export function assertSeason(value: number): Season {
  if (!isSeason(value)) {
    throw new RangeError(
      `season ${value} is out of ingestion scope; expected one of ${INGEST_SEASONS.join(", ")}`,
    );
  }
  return value;
}

export function eligibilityOf(season: Season): Eligibility {
  return (HELD_OUT_SEASONS as readonly number[]).includes(season) ? "HELD_OUT" : "TUNING";
}

export function isHeldOut(season: Season): boolean {
  return eligibilityOf(season) === "HELD_OUT";
}

/**
 * Parse a season range of the form `2022-2025` or a single season `2023`, or a
 * comma-separated mixture. Used by the CLI (`ingest --seasons 2022-2025`).
 */
export function parseSeasonSpec(spec: string): Season[] {
  const out = new Set<Season>();
  for (const part of spec.split(",")) {
    const token = part.trim();
    if (token.length === 0) continue;
    const range = /^(\d{4})\s*-\s*(\d{4})$/.exec(token);
    if (range !== null) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      if (hi < lo) throw new RangeError(`season range "${token}" is inverted`);
      for (let s = lo; s <= hi; s++) out.add(assertSeason(s));
      continue;
    }
    if (!/^\d{4}$/.test(token)) throw new SyntaxError(`unparseable season spec "${token}"`);
    out.add(assertSeason(Number(token)));
  }
  if (out.size === 0) throw new SyntaxError(`empty season spec "${spec}"`);
  return [...out].sort((a, b) => a - b);
}
