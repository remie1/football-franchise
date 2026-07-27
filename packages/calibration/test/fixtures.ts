/** Shared test helpers: fixture loading and a synthetic ingest environment. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
export const FIXTURE_DIR = join(HERE, "fixtures", "nflverse");

/** Read a committed nflverse sample as text. */
export function fixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8");
}

export function fixtureGz(name: string): Uint8Array {
  return gzipSync(Buffer.from(fixture(name), "utf8"));
}

export interface FixtureProvenance {
  readonly focusGame: string;
  readonly files: readonly {
    readonly file: string;
    readonly url: string;
    readonly upstreamRows: number;
    readonly sampledRows: number;
    readonly columns: number;
  }[];
}

export function provenance(): FixtureProvenance {
  return JSON.parse(fixture("provenance.json")) as FixtureProvenance;
}

/** A deterministic ISO timestamp for manifests under test. */
export const TEST_FETCHED_AT = "2026-07-27T00:00:00.000Z";
