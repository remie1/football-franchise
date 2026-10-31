/**
 * ADR-089 step 0 — the golden digests on the generated league (pk-01, 2027, seeds adr-089:golden-gen),
 * v1 to v7, per game, canonical and byte. Every later merge is checked against these pins inside
 * `pnpm verify` (plan §3.7, P-1). See `goldenDigestsShared.ts`.
 */
import { goldenSuite } from "./goldenDigestsShared.js";

goldenSuite("gen");
