/**
 * @ff/contracts — the constitution.
 * Shared types, event schema, attribute registry, authority tags, seeded PRNG.
 * Spec: docs/design/contracts.md
 * WRITES GO THROUGH THE ORCHESTRATOR ONLY (see .claude/settings.json).
 */
export const CONTRACTS_SCHEMA_VERSION = 1;

export * from "./ids.js";
export * from "./calendar.js";
export * from "./registry.js";
export * from "./rng.js";
export * from "./players.js";
export * from "./events.js";
export * from "./save.js";
