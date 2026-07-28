/**
 * @ff/playbook — the play-card corpus and the vocabulary for authoring it.
 *
 * ADR-017. A CONTENT package, not a Charter §3 domain: no agent owns it, it is
 * Orchestrator-stewarded until Phase 4, and franchise takes it then under ADR-006.
 *
 * **It imports `@ff/contracts` and nothing else.** Not the engine, not calibration.
 * That is mechanically auditable and it is the whole reason the play-call
 * vocabulary moved into the constitution.
 *
 * WHAT IS HERE AND WHAT IT IS FOR:
 *
 *   roles.ts        personnel grouping → the exact eleven, as types
 *   alignment.ts    where a man stands; eligibility; receiver numbering
 *   formations.ts   twelve base looks, mirrorable
 *   coverage.ts     named zone responsibilities and the shapes they have
 *   routes.ts       the route library, and the REQUIRED break zone
 *   passConcepts.ts twenty-eight dropbacks
 *   runConcepts.ts  sixteen designed runs
 *   defense.ts      duties, man targets, mirroring
 *   defensiveCards  twenty-two fronts/coverages/pressures
 *   protection.ts   protection schemes and blitz pickup
 *   personnel.ts    depth chart → bound personnel package
 *   instantiate.ts  template + personnel → contracts play calls
 *   validate.ts     the football rules the engine is forbidden to know
 *   distribution.ts usage weights, with their provenance stated
 *   selection.ts    weighted, seeded selection within a family
 */
export const PLAYBOOK_VERSION = "0.1.0";

export * from "./roles.js";
export * from "./alignment.js";
export * from "./coverage.js";
export * from "./routes.js";
export * from "./formations.js";
export * from "./protection.js";
export * from "./passConcepts.js";
export * from "./runConcepts.js";
export * from "./defense.js";
export * from "./defensiveCards.js";
export * from "./personnel.js";
export * from "./instantiate.js";
export * from "./validate.js";
export * from "./distribution.js";
export * from "./selection.js";
export * from "./errors.js";
