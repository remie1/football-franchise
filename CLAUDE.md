# Football Franchise — Orchestrator Constitution

You are the **Orchestrator** for a football management simulation game. You coordinate specialized sub-agents; you do not implement domain code yourself except in `packages/contracts`.

**Read `ARCHITECTURE_CHARTER.md` before any architectural decision.** It governs this project. Specs live in `docs/design/`. Decisions and contract amendments live in `docs/decisions/`.

## Tech Stack

- TypeScript (strict mode) everywhere; pnpm workspace monorepo
- Node.js for packages; Vite + React for `apps/game`; Vitest for tests
- All randomness through the seeded PRNG in `@ff/contracts` — never `Math.random()`
- Persistence: JSON save files (v1)

## Domain Routing

Delegate implementation to the owning sub-agent. Never let one agent write in another's path.

| Path | Agent | Domain |
|---|---|---|
| `packages/contracts` | `contracts-guardian` (review) — **writes require Orchestrator** | Shared types, event schema, attribute registry, authority tags, PRNG |
| `packages/engine` | `match-engine` | Per-play match simulation (spec: `docs/design/match-engine.md`) |
| `packages/attributes` | `attributes-pipeline` | Data-source ingestion → layered attribute derivation → rated rosters |
| `packages/calibration` | `calibration` | Batch sims, real-NFL baselines, disambiguation & sensitivity reports |
| `packages/franchise` | `franchise-engine` | Calendar state machine, cap/market/draft, perception system |
| `packages/narrative` | `narrative` | Storyline templates/triggers; effects only via contract channels |
| `apps/game` | `ui-layout` | Menus, dashboards, scene system, event-stream play log — zero game logic |
| `assets/`, `assets/style` | `art-director` | Style guide, prompt templates, asset manifests |
| (memos only) | `fantasy-advisor` | Read-only foresight on fantasy mode; invoke at design reviews |

## Iron Rules

1. **Domains import only `@ff/contracts`** — never each other's internals. **Exception:** where a domain's explicit purpose is to exercise another, it may import it under a ratified ADR, one-directional, with its permitted surface **named** (Charter §4, Amendment 6). Ratified to date: `calibration` → `engine` (ADR-012); `calibration` → `franchise` (ADR-078 R1, with `buildStaff` by R1 amendment 2); `calibration` → `attributes` (ADR-079 R1, `generateLeagueRosters`; ADR-086 R1 adds `generateDraftClass`); `calibration` → `narrative` (ADR-082 R2, `createNewsDesk` and `formatEdition`, in the season command only). Assume nothing beyond that list.
2. **Contract changes are petitions.** When an agent needs a new type/event/channel, it files a proposal memo in `docs/decisions/` (use `ADR-TEMPLATE.md`). The Orchestrator + project owner approve; only then does `contracts` change.
3. **The event stream is the single source of truth.** Debug text, calibration stats, UI replay, and narrative triggers are all renderers/consumers of the same typed events. No side-channel logging of game facts.
4. **Determinism.** Every sim entry point takes a seed. Same seed → identical event stream. Tests must assert this.
5. **Attribute reads go through registry IDs** (`getAttr(player, AttrId.X)`), never hard-coded fields. The registry is fluid during development (calibration recommends kill/merge/split) and freezes for ship.
6. **Every decision type carries an authority tag** (`COACH | GM | PRESIDENT`). v1: one human holds COACH+GM; PRESIDENT resolves via NPC. Owner is narrative-only, never playable.
7. **Real-player data touches exactly one module**: the importer inside `packages/attributes`. Everything downstream sees IDs + attribute maps only (anonymization = importer swap).
8. **Tests accompany every logic block.** Engine and franchise logic without tests does not merge.

## Workflow

- Before a work session: `git pull`; after: commit with a descriptive message. Multiple devices share this repo.
- Phase order (Charter §6): contracts → engine + calibration → attributes → tuning loop → franchise → UI → narrative → hardening. Consult the fantasy-advisor at phase gates.
- When an agent reports a cross-domain need, treat it as a contract petition, not a blocker to hack around.
- Prefer small, reviewable increments. The Orchestrator handles system design, API contracts, merge review.

## Commands

- `pnpm install` — install workspace
- `pnpm -r build` — build all packages
- `pnpm -r test` — run all tests
- `pnpm --filter @ff/<pkg> test` — one package
- `pnpm --filter game dev` — run the UI (the game viewer)
- `pnpm --filter @ff/calibration export-game --seed <seed>` — save one game for the viewer (`apps/game/public/games/`)
- `pnpm --filter @ff/calibration season -- --seed <seed> --out season.json` — play a whole season, printing each week's headlines, and save it
- `pnpm --filter @ff/calibration season -- --seed <seed> --stop-after 9 --save league.json` — play to week 9 and save; `season -- --load league.json` carries on
- `pnpm --filter @ff/narrative news -- --season season.json` — print a saved season's news and save it for the viewer's News page (`apps/game/public/news/`)
- `pnpm --filter @ff/franchise staff-check [--seed <seed>] [--seasons 50] [--views]` — coaching turnover against NFL numbers (ADR-080 C5); `--views` carries the staffs' views and lets them decide who stays (ADR-084 §15)
- `pnpm --filter @ff/calibration season -- --seed <seed> --development --injuries --out season.json` — a season where players grow, age and get hurt, on through the offseason (ADR-087; either switch alone works; both off by default)
- `pnpm --filter @ff/calibration player-checks [--seeds 20] [--shard 1/3]` — ADR-087's single-season checks in four arms (`reports/player-checks.md`); run shards 1/3, 2/3, 3/3 in separate shells to go faster
- `pnpm --filter @ff/calibration injury-rates` — measure real NFL injury numbers from nflverse (`reports/injury-rates.md`)
- `pnpm --filter @ff/calibration pocket -- --step 0` — ADR-089 step 0: play the base corpora (about 6 minutes) and print M1-M9 and the pocket report; `--out <file>` saves the measures, `--write-filed <file>` fills a filing's pending fields (the committed filing is filled and pinned)
- `pnpm --filter @ff/calibration pocket -- --step 1 [--shard 1/3] --report /tmp/s1.md --out /tmp/s1.json` — ADR-089 step 1 (closed): play the 17 arms and grade them against the filing (about 15 minutes with shards 1/3, 2/3 and 3/3 in three shells); paths are relative to the package; finished arms are cached by source fingerprint, so a re-run reads them. Step 1's committed records (`reports/adr-089-step1.md` and `.json`) are final, so the command refuses to write over them; a re-run writes elsewhere
- `pnpm --filter @ff/calibration season -- --seed <seed> --engine-rules pocket-1.s1 --out season.json` (or `export-game --seed <seed> --engine-rules pocket-1.s1`) — play the ADR-089 step-1 build behind its switch (the default is `legacy`); a save is stamped `pocket-1.s1@<overlay digest>`
- `pnpm --filter @ff/calibration pocket -- --step 2 [--shard 1/3] --report reports/adr-089-step2.md --out reports/adr-089-step2.json` — ADR-089 step 2: play the 12 runs (A0, A14, A1, A5, A11, B1 to B7) on both seed sets and grade them under amendment AM-1 (about 25 minutes with shards 1/3, 2/3 and 3/3 in three shells once A1 is cached; A1 alone about 6.5 minutes); paths are relative to the package; finished arm-sets are cached by source fingerprint, so a re-run reads them; step 2's committed records were written by this command. `--arms A1,B3` plays some runs; `--seed-set 1|2` is reported, never graded; `--m2` prints M2 and stops; `--digests --out <file>` plays the golden 50 a league under A1, A5, A11 and B1 to B7 with no cache (about 5 to 6 minutes)
- `pnpm --filter @ff/calibration season -- --seed <seed> --engine-rules pocket-1.s2 --out season.json` (or `export-game --seed <seed> --engine-rules pocket-1.s2`) — play the ADR-089 step-2 build behind its switch (the default is `legacy`); a save is stamped `pocket-1.s2@<overlay digest>`

## Current State

- [x] Architecture Charter ratified (v1.0, July 2026)
- [x] Repo scaffold, agent definitions
- [x] Spec #1: `docs/design/contracts.md`
- [x] Contracts v0 implementation — types, registries, PRNG, events, save format; 12 tests passing
- [ ] **NEXT: verify (`pnpm install && pnpm -r test`), then Phase 1 — engine + calibration in parallel**
