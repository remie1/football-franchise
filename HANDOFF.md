# HANDOFF

> ## ▶ NEXT SESSION STARTS HERE
>
> **Phase 1 complete; the pocket subsystem is mid-correction.** ADR-055 ratified and implemented,
> backlog through entry 86, ~3,640 tests, CI gating `build` + `test` + `typecheck`.
>
> ### The immediate next dispatch
>
> ⛔ **Entry 40's SUPPLY RE-PRICE, on the bounded-horizon base.** It has been queued behind three
> base-moving changes and they have all landed: the horizon bounded at `2.0` (entry 76), `TIME`
> retirement (entry 80), and ADR-055's pursuit reclassification. ⚠ **Every ADR-049 supply and
> persistence figure was measured with `pressureWithinSeconds = POS_INF` and describes a configuration
> the tree no longer reproduces.**
>
> ⚠ **And read entry 82-RESULT first** — the census says the threat population is **NOT saturated**
> (32.3% of ticks carry no live threat within 2.0s; 76.3% of dropbacks have such a moment), **which is
> why supply is a live frame rather than a lever inside a saturated space.**
>
> ### ⛔ Two things are OWED to the owner before they are cited
>
> - **`scramble.accuracyModifier = -10` / `readCapacityDelta = -1`** are marked `RULED, NOT DERIVED`.
>   **Existence is ruled; the MAGNITUDE is carried from `pocket.*.PRESSURE` and is provisional.**
>   ⛔ **Neither may be cited as evidence about scramble accuracy until it has a derivation or a
>   football argument of its own.**
> - ⚠ **Every recorded pocket-severity number folds the 20.809% of ticks ADR-055 reclassified** —
>   `dirtyTickShare`, the channel shares, entries 81 and 82. **They are stale and must be re-read
>   before citation.**
>
> ### Where the roadmap lives — do not restate it here
>
> ⛔ **`docs/decisions/CALIBRATION-BACKLOG.md`, roadmap head.** It is the single source for what comes
> next. **This block points at it and must never summarise it** — a second copy of the roadmap is the
> restated-constant family's fourth medium arriving in the onboarding document (Charter §4.1).
>
> ### The three things that change how you read everything else
>
> 1. ⛔ **`pressure_rate` is NOT the outcome variable for pocket levers** (entry 68). It counts any
>    non-CLEAN tick, so a `COLLAPSING → PRESSURE` demotion is invisible to it — **63.6%** of what the
>    dominant channel does. Use `pocket_status_distribution` alongside it. `pressure_rate` stays as the
>    figure comparable to real football.
> 2. ⛔ **The rate lives in `COLLAPSING`** (~51% of all ticks, ~72% of dirty ticks), **not `PRESSURE`**,
>    and the three `pocketStatusFor` channels are **not independent** — two read one roll (entry 1g).
> 3. ⚠ **Every number priced before entry 76 was measured against an unbounded horizon**, and supply
>    and retirement were both priced that way. **They describe a configuration the tree no longer
>    reproduces.**
> 4. ⛔ **THE LAST NAMED THRESHOLD CANDIDATE IS CLOSED** (entry 81). All three arrival horizons have now
>    been examined — `immediate` `0.0`, `collapsing` `1.0`, `pressure` `2.0` — and
>    `collapsingWithinSeconds` is **structurally incapable of moving the rate**: it slides 23.7pp
>    between `COLLAPSING` and `PRESSURE` while their **sum stays constant**, so `pressure_rate` moves
>    `0.035pp` across the whole domain. ⚠ **No horizon lever remains. Do not propose one.**
>
> ### Standing operational rules
>
> - **RUN BASELINES FROM A CLEAN TREE.** `FF_ENGINE_COMMIT` is required and shape-checked, and a
>   `-dirty` stamp **never compares equal, including to itself** (ADR-025) — a baseline from a dirty
>   tree is honest and useless. Commit first, then measure:
>   ```
>   FF_BASELINE=1 FF_ENGINE_COMMIT=$(git rev-parse HEAD) FF_BASELINE_OUT=reports/baseline-000N.md pnpm --filter @ff/calibration test baselineTool
>   ```
>   ⚠ **One line, no continuation.** A July 2026 rewrite of this block turned the line-continuation
>   backslash into a `>`, which would have **redirected output into a file named
>   `FF_BASELINE_OUT=reports/…`** instead of continuing the command. ⛔ **Introduced by the
>   Orchestrator, in the one document whose readers cannot check it** — the exact failure this block's
>   closing note describes. Recorded rather than silently repaired.
> - **Never buy CI time by reducing `n`** on a known-truth ladder (backlog §22c). `db-coverage` needs
>   ~5× the sample of any other family and its SE estimate is itself unstable.
> - **Contracts is write-protected and the deny applies to the Orchestrator too.** Lift → amend →
>   restore in one window, with the audit trail in the commit message (habit 7). A `commit-msg` hook
>   rejects any commit staging `packages/contracts/**` without an `ADR-0NN` reference.
> - ⚠ **The working habits in PART 5 are not optional colour** — **habits 8 through 11 each exist
>   because something shipped broken or was rediscovered for the fifth time.** Read them before the
>   first dispatch. ⛔ **Habit 10a is the cheapest: one grep, before proposing to move any committed
>   value.** It was run over four "refused levers" and **all four turned out already ruled.**
>
> ### ⛔ THIS BLOCK IS UPDATED BY THE DISPATCH THAT MAKES IT STALE
>
> Not by a periodic sweep. **The moment a dispatch changes what comes next, it updates this block** —
> that is when the author knows the answer, and it is free then and expensive later.
>
> **Why this one is enforced when other prose is not:** *the authority of a document is inversely
> related to its readers' ability to check it.* This block is **read first, trusted most, by a reader
> with no context to check it against** — the only stale artefact in this repo whose audience is
> defined by not knowing better. ⚠ **A stale onboarding block produces no symptom until someone acts
> on it.**

---

# Original handoff — Repo Setup & First Claude Code Session

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

Then create the **private** GitHub repo and push in one step:

```bash
gh repo create football-franchise --private --source=. --remote=origin --push
```

This creates the repo with no README or `.gitignore` (we have both), wires `origin`, and pushes `main`. It also uses whatever protocol `gh auth` is configured for — check with `gh auth status`. If that reports `Git operations protocol: https`, an SSH remote (`git@github.com:…`) will not work on that machine, which is why the `gh` form is preferred over `git remote add` here.

**Already done:** this repo is live at `remie1/football-franchise` (private). On an existing clone, `git pull` is all you need.

On any other machine: `git clone` → `npm install -g pnpm` → `pnpm install` → **`git config core.hooksPath .githooks`** → `claude`. Same repo, same specs, same agent definitions. Note that pnpm itself is a machine-level prerequisite the clone does not carry — §1.1 applies on every device.

> ### ⚠ REQUIRED, NOT OPTIONAL — a fresh clone has NO contracts guard until you run this
>
> ```bash
> git config core.hooksPath .githooks
> ```
>
> `.githooks/commit-msg` is what actually enforces Iron Rule 2 — it rejects any commit touching
> `packages/contracts/**` without an `ADR-0NN` reference, and unlike `.claude/settings.json` it sees
> the staged diff **however the bytes got there**, including shell writes by sub-agents. **Git only
> runs it when `core.hooksPath` is configured, and that setting is per-machine: a clone does not
> carry it.**
>
> **So a fresh clone can amend the constitution with no ADR, no petition, and no error** — and it
> looks *identical* to a machine where the guard is live. There is no warning, because the absence of
> a hook is silent by construction. CI asserts the hook file exists and is executable (ADR-038), which
> is the most CI can do; **it cannot know whether your machine invokes it.**
>
> **This is concrete rather than hypothetical for this project: multiple devices share this repo, and
> the second machine IS a fresh clone.** Recorded in the Charter's eliminated-vs-bounded register as
> **mitigated, not closed**, for exactly this reason.
>
> Verify with `git config core.hooksPath` — it must print `.githooks`.

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

**Protected — two layers, and only one of them is a wall.**

`.claude/settings.json` denies Edit/Write on `packages/contracts/**`. Understand what that does and does not buy you:

- It applies to **every participant in a session, including the Orchestrator**. Permissions have no notion of "agent vs. orchestrator," so this is not a distinction the file can express. It is a gate the human opens: to amend contracts, remove the two deny lines, make the ratified change, and restore them.
- It stops `Edit` and `Write`. It does **not** stop a shell redirect, and `match-engine`, `franchise-engine`, `calibration`, `attributes-pipeline` and `ui-layout` all have `Bash`. Treat it as a reliable speed bump against accidental edits, not as enforcement.

`.githooks/commit-msg` is the actual wall. It rejects any commit staging `packages/contracts/**` unless the message names a decision record (`ADR-0NN`). It reads the staged diff, so it catches shell writes the permission rule cannot. Install it per machine — **git config does not travel with a clone**:

```bash
git config core.hooksPath .githooks
```

Contract changes remain petitions either way: an agent files an ADR in `docs/decisions/`, the Orchestrator and owner ratify, and only then does `contracts` change. The hook enforces the paper trail, not the approval — it can tell that you named an ADR, not that anyone agreed to it.

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
7. **Every `packages/contracts` unlock states itself in the commit message.** The write-protection in
   `.claude/settings.json` is lifted, the contracts edit is made, and the deny is restored **before
   the commit** — which means the lift and the restore **net to zero and the diff shows nothing at
   all.** So the commit message must record: **what was lifted, what changed, and that it was
   restored.** Otherwise the guard's own history is the one thing in this repo that cannot be
   reconstructed — every other change is recoverable from the diff, but a guard that was off for
   one commit and back on by the next leaves no trace by construction. Name the ADR that authorised
   it (the `commit-msg` hook already requires an `ADR-0NN` reference for contracts changes; this is
   the *narrative* half the hook cannot enforce).
8. **Every dispatch that carries a quoted number tells the implementer the number is unverified.**
   Standing rule, owner, July 2026 — it has caught **two ratified errors in one month.** A dispatch
   brief quotes constants and rates out of ADRs and design docs, and **ratification makes a quoted
   number MORE likely to be wrong, not less**: it converts a claim into an assumption, and the author
   is the last person who will re-open it (Charter §4.1). So every brief carrying quoted numbers must
   say, in the brief itself: *these numbers are quoted from a ratified document, you are the
   verification, **compute rather than transcribe**, and **if a number disagrees with the tree, bring
   the conflict — do not reconcile it quietly.*** Both catches this month came from an implementer
   computing rather than quoting — ADR-046's constant (`8` was a sibling leaf of the same name; the
   value is `5`) and ADR-050's accepting ruling (predicted a movement in a quantity that is
   structurally invariant). **Neither came from review**, because by the time a ruling is ratified
   there is no reviewer left. Point the instruction at the brief's own numbers explicitly, including
   the Orchestrator's — that is where both errors were.

   ⛔ **UNCONDITIONAL, NOT RISK-TRIGGERED — earned rather than argued.** In one week **four briefs had
   their premise fail**, and every one was caught by an implementer **computing** the claim rather
   than reviewing it: a ladder conflated with a separate `minMargin` table; a channel mistaken for the
   determinant; a branch mistaken for the channel; and a dead cell reported as a confound that
   ADR-049 had already excluded correctly.

   > ### **The briefs that failed were not the ones that felt risky.**

   ⛔ **EXTENSION, July 2026 — THE RULE IS BROADER THAN IT WAS WRITTEN FOR.** It was aimed at
   **quoted constants**: a number transcribed out of a ratified document. It has now caught something
   else entirely — **freshly written code producing `7.971%` because a reimplementation forgot to gate
   on a live threat existing.** ⚠ **No amount of re-reading the quotation would have found that**;
   the quotation was fine and the *new* work was wrong.

   > ### **Recomputing a claim independently checks the claim's DERIVATION as well as its TRANSCRIPTION — and the derivation is where the NEW errors live.**

   ⛔ **THE OPERATIONAL FORM — A PREMISE LEDGER, REPORTED EITHER WAY.** Every dispatch states **what it
   computed and what each came out as**, including the ones that **confirmed**.

   | report | reading |
   |---|---|
   | a ledger of premises, **all confirming** | ✅ a clean dispatch — **and a real result** |
   | ⛔ **silent about premises** | **the anomaly** — they were probably not checked |

   ⚠ **The question against silence is *"which premises did you compute?"*, never *"did you find
   one?"*** — the second creates pressure to report something trivial found in passing, which is the
   **artefact-exists-because-it-was-demanded** shape arriving at a report. **The signal was never *a
   failure was found*; it is *the premises were computed*.**

   **Settled by demonstration:** the first dispatch to run under this form was asked to verify a claim
   *about a correction to an earlier wrong premise* — it read the function, **confirmed it, and said
   so.** ⚠ **A confirming ledger proves the form cannot be satisfied by silence**, which a caught
   defect would not have shown.

   ⛔ **AND A CLAIM ABOUT A CORRECTION GETS NO EXEMPTION.** It is still quoted, still one layer from
   the code, still travelling upward. **The correction that follows a premise failure is exactly as
   unverified as the premise was.**

   **So "compute, do not transcribe" is not only a defence against inherited numbers. It is a defence
   against your own fresh ones**, and an implementer who recomputes gets both checks for one cost.

   Every one read as routine — quoted numbers from ratified documents, in dispatches nobody flagged as
   uncertain. **So this goes on EVERY dispatch carrying a quoted number, permanently, and is never
   attached selectively when a brief "feels" like it needs it.** A sense of risk is **not correlated
   with the failure**, and using it as the trigger would have missed all four.
9. **Before committing a change to a SHARED artefact, name the packages that read it and run those.**
   Standing rule, owner, July 2026, after a red tree shipped and survived a review. **For
   `packages/contracts` and `packages/engine/src/tunables.ts` the answer is "all of them"** — so the
   standing verification for a shared-tunable or contracts change is the whole workspace, not
   `typecheck` plus the owning package.

   > ### ⛔ NAME THE COMMAND, NOT THE INTENT. All three, literally:
   > ```
   > pnpm -r build     # ⚠ does NOT run tests
   > pnpm -r test
   > pnpm typecheck
   > ```
   >
   > **Amended July 2026 after the phrase *"the full workspace suite"* was satisfied by a dispatch that
   > ran `pnpm -r build` across eight packages plus its own package's tests — and shipped a tree with
   > four calibration failures.** The reading was defensible; the phrase was ambiguous. ⚠ **`build`
   > does not run tests, so a green build across every package says NOTHING about any package's
   > behaviour.**
   >
   > **This is the same class as a red-trigger asserting what happens on the other side of its
   > boundary (ADR-038) — arriving at a BRIEF instead of at an INSTRUMENT.** An instruction that names
   > an *intent* delegates the choice of command to the reader, and **a defensible wrong choice is
   > indistinguishable from compliance.**
   >
   > ### ⛔ AMENDED AGAIN, August 2026 — **RUNNING THE RIGHT COMMAND IS NOT ENOUGH IF YOU DISCARD ITS ANSWER.**
   >
   > **The literal command was run — `pnpm -r test` — and PIPED TO `tail -30`.** ⛔ **That took the exit
   > code of `tail`, not of `pnpm`, and showed ONE package's summary out of four.** ⚠ **The output
   > looked green and the run was, but NOTHING IN WHAT WAS READ ESTABLISHED IT.**
   >
   > ⛔ **SAME SHAPE AS THE ORIGINAL MISS, WITH A DIFFERENT MASK: verification correct in form,
   > scoped down to one package by accident rather than by reading.** **Caught before committing, which
   > is the habit working rather than the habit failing.**
   >
   > **⇒ So the rule extends to the OUTPUT, not just the invocation: CAPTURE THE EXIT CODE, and read a
   > summary line PER PACKAGE.** ⚠ **A pipeline's exit status belongs to its LAST command — piping any
   > verification through `tail`, `head` or `grep` silently discards the only unambiguous signal it
   > produced.**

   **What went wrong is worth keeping, because the verification that failed was not sloppy — it was
   CORRECT, COMPLETE, AND ABOUT THE WRONG SUBJECT.** The seventeen-rung `resultTierLadder` landed
   after `pnpm typecheck` passed across eight packages and the engine suite passed 788/788. Both true.
   **Neither was the question**: the change's subject was the ladder, the ladder's consumers extend
   past the engine, and the package that reads it most was the one not run. Ten calibration tests were
   red at the moment of commit.

   ⇒ **This is the implicit-coverage family arriving at a WORKFLOW STEP rather than at an instrument**
   (Charter §4.1), and the diagnostic that would have caught it is the one already standing: ***what,
   exactly, is the subject?*** A green suite is evidence about the package it ran in and about nothing
   else. **It is cheap to state and it would have caught this.**
11. ⛔ **EVERY BRIEF ASKS FOR INCIDENTAL OBSERVATIONS, AND THEY GO TO THE ACCUMULATOR** —
    `CALIBRATION-BACKLOG.md` entry **86**. ⚠ **Not a hope that authors remember: a required line in the
    report.**

    **Why a PLACE and not a HABIT:** `tippedBall`'s structural half read `0/0/0/0/0` across **five**
    re-baselines. ⛔ **All five were RECORDED** — in reports and commit messages — **and never
    CO-LOCATED**, so five authors each wrote a true observation and none could see it was the same one.
    **The sixth would have met it fresh too.**

    > ### **When a finding recurs, the recurrence is the finding — but only if the sightings land in one place.**

    ⛔ **The rule that makes it work: READ THE LIST BEFORE APPENDING.** ⚠ If the observation is already
    there, **add a line beneath it rather than a new bullet.** **Skipping that returns the section to
    being five footnotes in five places.** ⚠ **Three sightings promotes to an entry.**

    ⚠ **Honest limit:** ⛔ **nothing routes a reader to the accumulator from the place they would
    notice a recurrence.** A place with nothing in it reads as coverage. **This is partial.**

10a. ⛔ **A BRIEF PROPOSING TO MOVE A COMMITTED VALUE STATES WHETHER THE CELL HAS A RULING — WITH THE
    SEARCH SHOWN.** One grep, before anything else. ⚠ **Assume the answer is YES until the search says
    otherwise.**

    **The base rate that made this required rather than advisory:** the search was run over **four**
    values previously refused as levers. ⛔ **All four were already decided by ratified rulings. None
    survived to need a football argument.**

    ⚠ **And the worst case needed no inference at all.** `RUSHER_GAINING`'s band map was ruled by
    **ADR-033 — named, dated, approved 2026-07-29, implemented and tested** — and **eight subsequent
    dispatches never looked it up**, one of them citing ADR-032 instead and inheriting a value that
    had been stale for twenty-one ADRs.

    > ### **The failure was not subtle inference. It was NOT ASKING.**

    **Search for the identifier AND the reasoning-shape** — *"X is not pressure"*, threshold-width
    language, band-floor semantics — because **a ruling's reach is recorded only at the cell that
    provoked it.** ⛔ **State the search's boundary**: what a grep of that shape would have missed.

10. **Stage explicit paths whenever a dispatch is live. `git add -A` NEVER, while an agent is running.**
    Standing rule, owner, July 2026, **on the second occurrence of the same cause** — which is where
    a slip becomes a habit.

    **What happens:** a background agent is mid-edit; the Orchestrator commits an unrelated
    documentation change with `git add -A`; **a partially-written instrument lands inside a docs
    commit** under a message that says nothing about it. It happened twice — once sweeping in a
    half-written `pocketChannelShares.ts`, once sweeping in four in-flight engine files.

    **The repair is `git reset --soft HEAD~1`, then re-stage the intended paths** — it does not touch
    the working tree, so nothing of the agent's is lost. ⚠ **But the repair only runs if the mistake
    is NOTICED, and a commit that succeeded looks identical to one that staged what it meant to.**

    > ### **`git add <explicit paths>` always. `-A` only when no dispatch is live, and checking is cheaper than remembering.**

    **Why unconditional rather than careful:** the failure is silent by construction — the commit
    succeeds, the tests still pass, and the only symptom is a file appearing in a diff that has nothing
    to do with the message. **A rule that fires on "is an agent running?" is checkable; one that fires
    on "was I careful?" is not.**
