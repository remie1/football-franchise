# HANDOFF — Repo Setup & First Claude Code Session

Everything needed to go from the zip in your downloads to a working engine slice. Read once, then follow in order.

---

## PART 1 — REPO SETUP (~15 minutes, mechanical)

### 1.1 Prerequisites

- **Node 20+** — `node --version`
- **pnpm** — `npm install -g pnpm`. Node 25 no longer bundles `corepack`, so this is a required install, not a fallback.
- **Claude Code** — https://claude.com/code
- **git**, and a GitHub account for a private repo

**pnpm 11 gate.** pnpm 11 refuses to run dependency build scripts until each is approved, and treats an unapproved script as a *fatal* error on every later pnpm command — including `pnpm -r test`, which re-runs the deps check first. This repo needs `esbuild` (vitest's bundler). It is already approved in `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  esbuild: true
```

If a clone errors with `ERR_PNPM_IGNORED_BUILDS`, that key is missing or left at the placeholder. `pnpm approve-builds` is interactive; setting the key directly is the scriptable fix. `--allow-build` is not a v11 flag.

### 1.2 Unpack and verify

*(Skip the first two lines if the repo is already unpacked.)*

```bash
unzip football-franchise-scaffold.zip
cd football-franchise
pnpm install
pnpm -r test
```

**Expected: 12 tests passing** in `@ff/contracts` (PRNG determinism, fork independence, d100 range and distribution, attribute registry reads and clamping, registry migration, calendar ordering).

**`pnpm -r test` exits 1 even when this passes.** The five stub packages and `apps/game` contain no test files, and vitest exits 1 on "No test files found", which pnpm reports as `[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL]`. The line that matters is `Tests  12 passed (12)` under `packages/contracts`. Expect the red exit code until each package has real tests.

Do **not** silence this by adding `--passWithNoTests` to every stub. It is correct for the genuinely dormant packages, but on `packages/engine` it would make the one package the first session is about to fill report green with zero tests — precisely the state Iron Rule 8 exists to prevent. Leave `engine` failing loudly until the slice lands.

If the contracts tests themselves fail, stop and fix before continuing — everything downstream assumes contracts is sound.

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

On any other machine: `git clone` → `npm install -g pnpm` → `pnpm install` → `claude`. Same repo, same specs, same agent definitions. Note that pnpm itself is a machine-level prerequisite the clone does not carry — §1.1 applies on every device.

### 1.4 Confirm the agents loaded

Start Claude Code in the repo root and ask it directly:

> List the project subagents available in this repo.

Expect nine: `contracts-guardian`, `match-engine`, `attributes-pipeline`, `calibration`, `franchise-engine`, `narrative`, `ui-layout`, `art-director`, `fantasy-advisor`.

Notes:
- Project subagents load from `.claude/agents/*.md`, discovered by walking up from the working directory. **Start Claude Code from the repo root**, not a subdirectory above or beside it.
- If the files are missing, a GUI extractor likely skipped the dotted directory — re-extract with the CLI `unzip`.
- **If this environment doesn't surface them,** it changes nothing structural. Every agent definition is also a plain-English brief: paste the relevant `.claude/agents/<name>.md` body into your prompt as the working instructions. The domain boundaries are enforced by `CLAUDE.md`, `.claude/settings.json`, and the specs — not by the agent-loading mechanism.
- **Always name the agent explicitly in prompts** ("Use the match-engine agent to…"). Naming bypasses automatic description-matching and is unambiguous in any environment.

---

## PART 2 — WHAT CLAUDE CODE IS INHERITING

| File | Role |
|---|---|
| `ARCHITECTURE_CHARTER.md` | The constitution. 6 pillars, 9 domains, boundaries, amendment process, build sequence |
| `CLAUDE.md` | Orchestrator routing rules and the 8 Iron Rules |
| `docs/design/*.md` | **14 spec files** — contracts, match-engine, attributes, calibration, franchise-calendar, perception, narrative, ui, art-style, fantasy-brief, coaching-staff, emergent-meta, tutorial-season, player-personality. (Spec #15, Owners' Meeting, is deliberately deferred and has **no file** — see Charter §8 and Spec #5 §14.1b. 15 numbered specs, 14 files.) |
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

Run the guardian as an audit:

```
Use the contracts-guardian agent to audit packages/engine for boundary violations:
cross-domain imports, hard-coded attribute fields, any Math.random usage, and any
place where a shared type was locally redefined instead of imported from @ff/contracts.
```

### 3.4 If the audit fails: revert, don't patch

**Prerequisite:** the scaffold must be committed *before* the first agent run (§1.3), so there is a clean baseline to diff and revert to.

Triage the findings:

- **Boundary violations** (cross-domain imports, redefined shared types, `Math.random`, hard-coded attribute fields) → **revert and re-prompt.** These are architectural, and patching them in place teaches the wrong pattern for every subsystem that follows. Revert, then re-prompt with the violated rule stated explicitly at the top.

  ```bash
  git checkout -- packages/engine && git clean -fd packages/engine
  ```

  The slice is almost entirely *new* files, which are untracked — `git checkout` only restores files git already knows about and will leave every new one in place. `git clean -fd` is the half that actually reverts. Run `git clean -nd packages/engine` first if you want to see what it will delete. (Add `-x` to also drop ignored build output such as `dist/`. If you committed the slice before auditing — against the advice below — `git revert` the commit instead.)
- **Missing tunables extraction, or a debug renderer built from internal logging instead of the event stream** → also revert-and-re-prompt. Both are structural; retrofitting them later is worse than redoing the slice.
- **Ordinary bugs, thin tests, wrong modifier values** → patch in place. These are normal iteration.

Rule of thumb: if the fix would touch the *shape* of how the engine talks to contracts, revert. If it only touches the *content* of a calculation, patch.

Only after a clean audit: commit and push.

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
