# HANDOFF — Repo Setup & First Claude Code Session

Everything needed to go from the zip in your downloads to a working engine slice. Read once, then follow in order.

---

## PART 1 — REPO SETUP (~15 minutes, mechanical)

### 1.1 Prerequisites

- **Node 20+** — `node --version`
- **pnpm** — `npm install -g pnpm`
- **Claude Code** — https://claude.com/code
- **git**, and a GitHub account for a private repo

### 1.2 Unpack and verify

```bash
unzip football-franchise-scaffold.zip
cd football-franchise
pnpm install
pnpm -r test
```

**Expected: 12 tests passing** in `@ff/contracts` (PRNG determinism, fork independence, d100 range and distribution, attribute registry reads and clamping, registry migration, calendar ordering).

If tests fail, stop and fix before continuing — everything downstream assumes contracts is sound.

```bash
pnpm -r exec tsc --noEmit    # typecheck; should be silent
```

### 1.3 Version control

```bash
git init
git add -A
git commit -m "Architecture charter, 15 specs, contracts v0 (Phase 0 complete)"
git branch -M main
```

Create a **private** repo on GitHub (no README/gitignore — we have both), then:

```bash
git remote add origin git@github.com:<you>/football-franchise.git
git push -u origin main
```

On any other machine: `git clone` → `pnpm install` → `claude`. Identical environment, agents included.

### 1.4 Confirm the agents loaded

```bash
claude
```

Type `@` — you should see nine agents: `contracts-guardian`, `match-engine`, `attributes-pipeline`, `calibration`, `franchise-engine`, `narrative`, `ui-layout`, `art-director`, `fantasy-advisor`.

If they don't appear, confirm `.claude/agents/*.md` survived the unzip (hidden directories are sometimes skipped by GUI extractors — use the CLI `unzip`).

---

## PART 2 — WHAT CLAUDE CODE IS INHERITING

| File | Role |
|---|---|
| `ARCHITECTURE_CHARTER.md` | The constitution. 6 pillars, 9 domains, boundaries, amendment process, build sequence |
| `CLAUDE.md` | Orchestrator routing rules and the 8 Iron Rules |
| `docs/design/*.md` | 15 specs — contracts, match-engine, attributes, calibration, franchise-calendar, perception, narrative, ui, art-style, fantasy-brief, coaching-staff, emergent-meta, tutorial-season, player-personality |
| `docs/decisions/` | ADR-001 (fashion seeding, ratified), ADR-002 (leagueContext, ratified), ADR template |
| `packages/contracts` | **Implemented and tested.** Types, registries, PRNG, events, save format |
| `packages/{engine,attributes,calibration,franchise,narrative}` | Stubs awaiting Phase 1+ |
| `apps/game` | UI stub (Phase 5) |
| `assets/style/` | Prompt pack v0, portrait system v0, style guide placeholder |

**Protected:** `.claude/settings.json` denies Edit/Write on `packages/contracts/**`. Contract changes go through you as Orchestrator via ADR petition — the guardian reviews, agents cannot edit.

---

## PART 3 — THE FIRST SESSION: A VERTICAL SLICE

**Why a slice and not the whole engine.** The instinct is to hand `@match-engine` the 2,100-line design doc and say "build it." Don't. One complete pass play exercises every architectural contract at once — tick loop, event stream, registry reads, seeded forks, debug renderer. If any of those are wrong, you want to know in a day, not after four subsystems are stacked on top.

### 3.1 Paste this as your first prompt

```
Read ARCHITECTURE_CHARTER.md and CLAUDE.md first, then docs/design/match-engine.md
and docs/design/contracts.md.

Deploy @match-engine to build a VERTICAL SLICE in packages/engine — one complete
pass play, snap through result. Scope:

  - the tick loop (0.5s increments) and phase structure
  - pass rush vs. protection, resolved per tick, with pocket status transitions
  - one receiver route vs. man coverage, including the press release battle
  - the QB read: awareness variance, perceived vs. effective openness
  - the QB decision and target selection
  - throw accuracy and passing-lane check
  - catch resolution
  - PLAY_RESULT

Explicitly OUT of scope for this slice: tipped balls, YAC zones, the run game,
zone coverage, scrambles, penalties, weather, stamina, crowd noise.

Requirements:
  - Pure functions: (GameState, PlayCalls, seed) -> { events, newState }.
    No I/O, no globals, no console logging of game facts.
  - Import ONLY from @ff/contracts. Attribute reads via getAttr with registry
    AttrIds — never hard-coded fields.
  - All randomness through createRng from @ff/contracts, forked per play and
    per subsystem (e.g. "game:{id}/play:{n}/rush").
  - Emit a typed event for every roll, check, and status transition. Populate
    RollDetail.modifiers with named sources and RollDetail.rngLabel.
  - Put every target number and modifier weight from the design doc into a
    named tunables module so calibration can adjust them without code archaeology.
  - Build a debug renderer that prints the design doc §17 format FROM the event
    stream — not from internal logging.
  - Tests: determinism (same seed -> identical event stream), plus unit tests
    for each resolution function.

If you need a type, event, or CheckKind that @ff/contracts lacks, STOP and write
a contract-change proposal in docs/decisions/ using ADR-TEMPLATE.md. Do not
invent local copies of shared types or edit packages/contracts.
```

### 3.2 What "done" looks like

- `pnpm --filter @ff/engine test` green, determinism test included
- A debug printout for one play that reads like the design doc §17
- No imports between domain packages
- Any gaps surfaced as ADR petitions rather than worked around

### 3.3 Review before moving on

Ask the orchestrator to run `@contracts-guardian` as an audit:

```
Deploy @contracts-guardian to audit packages/engine for boundary violations:
cross-domain imports, hard-coded attribute fields, and any Math.random usage.
```

Then commit and push.

---

## PART 4 — WHAT COMES NEXT

**Phase 1 (parallel):** once the slice holds, breadth on the engine is mechanical — add subsystem by subsystem, each with tests. Meanwhile `@calibration` can start immediately and independently, since ingestion doesn't need the engine:

```
Deploy @calibration to begin Phase 1 deliverable 1 from docs/design/calibration.md:
nflverse ingestion and local caching for 2022-2025, including weekly availability
data (injury reports, inactives, IR/suspension, snap shares), with the source
manifest {source, season, fetchedAt, schemaHash}.
```

**Phase order after that** (Charter §6): attributes → tuning loop → franchise → UI shell → narrative → hardening.

**Non-blocking, do anytime:** the portrait realism test (`assets/style/PORTRAIT_SYSTEM_v0.md` §4) — one fixed parameter set at four stylization levels, judged in a grid of 20. Settles the last open art question.

---

## PART 5 — WORKING HABITS THAT KEEP THIS COHERENT

1. **`git pull` at the start of a session, commit and push at the end.** Multiple devices share this repo.
2. **Delegate to agents; don't implement in the main session.** The orchestrator handles system design, contract changes, and merge review.
3. **When an agent says it needs something from another domain, that's a petition, not a blocker.** Let it write the ADR. Every overlap becomes a visible, versioned decision instead of silent entanglement.
4. **Small increments.** A vertical slice, then breadth. A subsystem, then tests. Long agent runs without checkpoints are how architecture drifts.
5. **The specs are living.** When a design decision changes, amend the spec in the same commit as the code. A spec that lies is worse than no spec.
6. **Consult `@fantasy-advisor` at phase gates.** It writes memos, never code, and its whole job is catching decisions that would foreclose fantasy mode.
