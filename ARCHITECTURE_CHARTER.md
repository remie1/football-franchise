# FOOTBALL FRANCHISE — ARCHITECTURE CHARTER

**Version 1.0 — July 2026**

This document precedes and governs all specifications. It defines what the systems are, where their boundaries sit, how they communicate, who is allowed to change what, and in what order everything gets built. Every spec written after this document must conform to it. Amendments to this charter go through the Orchestrator (the main Claude Code session, directed by the project owner) and are recorded in the Amendment Log at the bottom.

---

## 1. VISION & V1 SCOPE

### 1.1 The Game

A single-player American football management simulation. The player runs an NFL-style franchise as **Coach + GM combined**, progressing through a calendar of seasons and offseasons. Match outcomes are resolved by a deep, dice-driven, per-play simulation engine (fully specified in `docs/design/match-engine.md`, formerly NFL_GAME_DESIGN_DOCUMENT.md). The franchise layer surrounds the engine with roster management, cap math, free agency, scouting, the draft, and a narrative engine that turns events into storylines.

### 1.2 V1 Definition

**IN v1:**
- Match simulation engine (per the existing design doc) with full debug event output
- Statistical calibration harness testing sim outputs against real NFL baselines
- Franchise calendar (season + offseason phases as state machine)
- Roster, contracts, salary cap, free agency market phases, draft, trades
- Scouting / hidden-information system (true vs. perceived attributes)
- Narrative engine (storyline templates triggered by events)
- Coach + GM combined player role; owner and president exist as NPC pressure sources
- UI: local browser tab; menus, dashboards, illustrated static scenes; static play diagrams
- Real NFL rosters via isolated importer (dev/personal use), anonymizable at launch
- Single-player only

**OUT of v1 (deferred, but architecturally protected):**
- Playable President role (authority tags reserve the slot)
- Separated Coach vs. GM single-player modes (authority tags reserve the slot)
- Same-franchise multiplayer (authority tags reserve the slot)
- **Fantasy mode** — week-by-week league play tethered to real NFL results (advisor agent watches for foreclosing decisions)
- Stadium management / city-builder expansion
- Animated match presentation (stretch goal: 2D dot-replay of the event stream)
- Database persistence (JSON saves in v1)

### 1.3 Design Pillars

1. **Dice create variance; narrative explains results.** Mechanics exist only if they change outcomes.
2. **Hidden information is the game.** Hard math underneath; the player sees a perceived layer, not the truth.
3. **The event stream is the single source of truth.** Debug output, calibration, UI replay, and narrative triggers all consume the same events.
4. **Calibration is the arbiter.** Real NFL statistics decide disputes about mechanics and ratings — not intuition.
5. **Determinism.** Seeded PRNG; any play, game, or season is exactly replayable from its seed.
6. **No prescriptive meta.** The game never encodes a designer's claim about what schemes actually work. Fashion, trends, and "eras" are narrated retroactively over simulated results and never modify engine effectiveness.

---

## 2. TECHNOLOGY STACK

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript everywhere, strict mode | One compiler-enforced type system = mechanical contract enforcement between sub-agent domains |
| Runtime | Node.js (engine, tooling); browser (UI) | Engine is branchy conditional logic + dice — V8 excels; worker threads parallelize calibration batches |
| Monorepo | pnpm workspaces | Package isolation mirrors domain isolation |
| UI framework | Vite + React | Menus/dashboards/SVG scenes are web-native; wrappable in Tauri/Electron later |
| Testing | Vitest | Unit tests per domain; calibration harness is itself a giant statistical test |
| Persistence | JSON save files (v1) | Database deferred until fantasy mode forces one |
| RNG | Seedable PRNG utility in `contracts` | Determinism pillar |
| Version control | Private GitHub repo | Multi-device (laptop/desktop; VPS optional later as batch runner) |
| Escape hatch | Engine package portable to Rust if calibration volume ever demands it | Isolation makes this a package swap, not a rewrite |

**Multi-device workflow:** `CLAUDE.md`, `.claude/agents/`, `docs/`, and all code live in the repo. Any device with Claude Code + a clone has the identical environment. The VPS is not part of v1 infrastructure; add it (or GitHub Actions) the first time a calibration batch is worth running overnight.

---

## 3. THE DOMAIN MAP

Nine domains. Eight build; one advises. Each building domain = one package (or app), one spec, one sub-agent, one owned path.

```
football-franchise/
├── CLAUDE.md                      # Orchestrator constitution & routing rules
├── ARCHITECTURE_CHARTER.md        # This document
├── .claude/
│   └── agents/                    # Sub-agent definitions (§7)
├── docs/
│   ├── design/                    # Per-domain specs (§8)
│   └── decisions/                 # Contract amendments & ADRs
├── packages/
│   ├── contracts/                 # D1 — shared types, event schema, attribute registry, PRNG
│   ├── engine/                    # D2 — match simulation
│   ├── attributes/                # D3 — attribute derivation pipeline
│   ├── calibration/               # D4 — data ingestion, batch sims, statistical validation
│   ├── franchise/                 # D5 — calendar, roster, cap, market, draft, scouting
│   ├── narrative/                 # D6 — storyline engine
│   └── playbook/                  # CONTENT, not a domain — the play-card corpus (ADR-017).
│                                  #   No agent owns it; Orchestrator-stewarded until Phase 4,
│                                  #   when franchise takes it under ADR-006. Imports contracts
│                                  #   and nothing else.
├── apps/
│   └── game/                      # D7 — UI (browser)
└── assets/                        # D8 — art pipeline output + style guide
```

### D1 — CONTRACTS (`packages/contracts`) — the constitution

Shared types only. **Zero logic** except the PRNG utility and registry helpers.

Owns:
- `Player`, `Team`, `Roster`, `Contract` shapes
- **The dual-layer attribute model:** `TrueAttributes` (engine-facing ground truth) and `PerceivedAttributes` (per-observer estimates with confidence ranges — what the player and each AI team "knows")
- **The attribute registry:** attributes are data — `{ id, name, description, positionGroups, schemaVersion }`. Players carry a keyed map against registry IDs. Engine checks reference IDs, never hard-coded fields. *(Dev-time scaffolding: makes calibration-driven kill/merge/split recommendations cheap to act on. The registry freezes into a static, legible attribute list for ship.)*
- **The event schema:** every roll, modifier, phase transition, and result as typed data. The stream is append-only per play; consumers never mutate it.
- **Authority tags:** every player-facing decision type carries `authority: COACH | GM | PRESIDENT`. v1 = one human holds COACH+GM; PRESIDENT decisions are NPC-resolved. Future modes are permission masks over the same tags.
- Calendar event types, save-file format, seedable PRNG

**Ownership rule:** contracts are owned by the **Orchestrator**, not any sub-agent. Sub-agents petition to amend (§4); they cannot edit unilaterally.

### D2 — MATCH ENGINE (`packages/engine`)

The existing design doc, implemented. Pure and headless: `(GameState, OffensivePlayCall, DefensivePlayCall, seed) → EventStream + NewGameState`. Knows nothing about calendars, storylines, saves, or UI. All attribute reads go through registry IDs. All randomness through the seeded PRNG. The debug printout (design doc §17) is a *text renderer over the event stream*, not engine-internal logging.

### D3 — ATTRIBUTES (`packages/attributes`)

The derivation pipeline: raw source data → rated players. Sits between calibration's data ingestion and everything that consumes rosters.

**Source families (full inventory in the domain spec):**
| Family | Sources | Role |
|---|---|---|
| A. Athletic testing | Combine, pro days, RAS, MockDraftable | Physical priors only |
| B. In-game tracking | Next Gen Stats, ESPN win rates (PRWR/PBWR/RSWR), receiver scores | Best isolated skill signals; doubles as calibration targets |
| C. Charting | FTN (free via nflverse), PFF (**pluggable, optional subscription**), SIS | Per-facet human grades |
| D. Production stats | nflverse PBP (EPA, CPOE), PFR advanced | **Validation, not derivation** (context-contaminated) |
| E. Market signals | Draft capital, contracts (OTC), honors, depth charts | Bayesian priors, esp. rookies |
| F. Scouting text | NFL.com profiles, Zierlein, Brugler | Only public source for Mental/Knowledge traits; extracted to structured priors |
| G. Existing game ratings | Madden | Rank-order validation only; never copied |

**Layered build per player:** archetype prior (position/draft capital/age) → physical layer (A/B overwrite) → skill layer (B/C overwrite) → mental/knowledge layer (F + inference) → calibration adjustment loop.

**PFF rule:** the pipeline must produce valid output from free sources alone; PFF slots in as confidence-tightening enrichment, never a dependency.

**Anonymization rule:** the engine and franchise never know what a "real" player is — they see IDs and attribute maps. Real-data import lives in exactly one module here. Launch anonymization = swap importer for a fictional-league generator emitting the same shape.

### D4 — CALIBRATION (`packages/calibration`)

The arbiter. Owns:
- nflverse/NGS/ESPN data ingestion and local caching (serves D3 and itself)
- Batch simulation harness (headless, parallel, seeded)
- Statistical comparison: simulated league output vs. real baselines (INTs/game, sack rate, upset rate, yards/carry, completion %, per-player PBWR convergence, the upset metrics from our earlier analysis)
- **Mandate 1 — Disambiguation:** when sim diverges from reality, determine whether the error lives in a *mechanic* (engine formula/weight) or a *rating* (attribute derivation) — e.g., "10 INTs/game: tipped-ball formula or overrated ball-hawks?"
- **Mandate 2 — Attribute sensitivity analysis:** vary one attribute across batches; if outcomes don't move, recommend killing it. Correlation analysis across derived ratings; attributes that never diverge in predictive power are one attribute wearing costumes — recommend merging. Standing dev-time reports feeding registry amendments.

### D5 — FRANCHISE (`packages/franchise`)

The calendar as a state machine (training camp → preseason → season → playoffs → offseason phases 1–5, per the design notes), plus everything the player manages:
- Roster rules, contract structures (spring bonuses, clawbacks, June 1st logic), salary cap math
- Free agency market: tier-anchored pricing (premium 72hrs → value weeks → bargain basement), player price expectations reset by earlier signings
- Draft, scouting calendar, trade system with GM-relationship/reputation mechanics
- **The perception system:** owns which observer sees which `PerceivedAttributes` — hidden rookie ratings revealing over a season, scouting ranges, assistant-coach insight into former players, fog-of-war on other rosters
- Owner and President as **NPC pressure sources**: mandates, hot-seat expectations, budget constraints (owner sits above president narratively; neither is playable in v1)
- Stamina/morale/injury state carried between games (engine consumes these as inputs)

### D6 — NARRATIVE (`packages/narrative`)

Storyline templates, triggers, arcs, consequences. Subscribes to franchise events and match event streams ("star arrested," "4-INT game," "rookie holdout"). Sources: media, agents, NFLPA, league execs, player-life events (per design notes). Writes effects back **only through contract-defined channels** (morale modifiers, availability changes, press/reputation state). Synthesizes the coach-vs-GM tension (win-now vs. cap health) through NPC staff voices since one human holds both roles.

### D7 — UI (`apps/game`)

Renders franchise state; replays match event streams. **Zero game logic** — any computed number belongs in a domain package. Contains:
- Menu/dashboard shell (windows per design notes: opponent research, circumstances, practice, development, press, scouting, standings, awards…)
- **Data-driven scene system:** `sceneId → backdrop asset + character slots + hotspots`. Meeting the scouts renders the scout room with the actual staff portraits present. Art fully swappable without code changes.
- Match presentation: play log rendered from event stream + static play diagrams. *Stretch goal (low-hanging): top-down 2D field with player-dot markers stepping through the event stream.*

### D8 — ART PIPELINE (`assets/` + style docs)

Design-and-pipeline domain (generation happens outside Claude Code). Owns:
- The locked style guide (palette, rendering style, lighting, era/tone) — **AI-generated art under strict guideline** is the chosen process
- Versioned prompt-template library per asset class (scene backdrops, portraits, iconography)
- Asset manifest schema consumed by the scene system (ID, dimensions, slot metadata)
- Consistency review of new assets against the guide

### D9 — FANTASY ADVISOR (read-only, no owned path)

The idea guy in the design room. Primary brief: **fantasy mode** — league play among friends, week-by-week, outcomes tethered to real NFL results — including the open question of world-divergence vs. weekly re-sync. Secondary footnote: same-franchise multiplayer via authority-tag splitting. Watches decisions that would foreclose either (e.g., "does the engine cleanly accept mid-season roster/stat updates?" — noting the calibration importer becomes a live game feed in fantasy mode). Invoked at design reviews; produces memos, never code.

---

## 4. THE OVERLAP RULE & AMENDMENT PROCESS

1. Domains **never import each other's internals** — only `contracts` — **except where a domain's explicit purpose is to exercise another.** Such an exception requires a ratified ADR, must be **one-directional**, and must **name its permitted surface** explicitly rather than describing it. An exception that cannot name its surface is not an exception; it is the rule being abandoned. *(Amendment 6. The one exception ratified to date: `calibration` → `engine`, per ADR-012.)*
2. When a sub-agent needs something from another domain, it does not reach across. It files a **contract-change proposal**: a short memo in `docs/decisions/` stating what type/event/channel it needs and why.
   - **Corollary (Amendment 6, ADR-015):** when two domains both need a *type*, that type is by definition shared vocabulary and belongs in `contracts`. A dependency cycle between domains is the **signal**, not the problem — the package manager rejecting it is the tooling correctly reporting an architecture error. The discipline that keeps this from becoming a licence to dump anything shared into the constitution is `contracts.md` §10's test: **a data shape belongs; logic does not.**
3. The Orchestrator (with the project owner) approves/rejects/modifies. Approved changes are versioned in `contracts`, logged as an ADR, and both domains adapt.
4. Result: every overlap is a visible, versioned decision instead of silent entanglement.

### 4.1 Working principle: prefer a compile error to a convention; prefer a loud failure to a silent default

*(Amendment 8. Stated because it was already governing decisions; it should govern them
deliberately.)*

When a rule can be expressed in the type system, express it there. When a failure can be made
loud, make it loud. A convention is a rule that holds until someone is in a hurry; a silent
default is a defect that reports success.

> **WHAT BELONGS IN THIS SECTION — the filter, stated so the list stays a principle rather than
> becoming an accumulation.**
>
> **`CALIBRATION-BACKLOG.md` records what we found. The Charter records what we cannot find by
> looking.** An entry earns Charter space when it is a claim about a **blind spot** — a class of
> defect that the suite, the review or the measurement is structurally unable to surface — rather
> than a claim about a defect.
>
> The test is whether the claim could have been made *by* the thing it describes. "A codebase
> containing both a restated constant and a sorting sentinel has a defect class it cannot detect by
> testing, because every test passes" is a statement about the limits of the suite, **and the suite
> cannot make that statement about itself.** That is why it lives here.
>
> Applied retroactively, this explains every corollary below rather than merely permitting them:
> structural-over-conventional, the sentinel rule, the derivation rule, the sorting-default rule,
> the monotonicity rule — **each one is a statement about a blind spot, not about a bug.** Anyone
> deciding what goes here next should apply the same filter: *if the existing instruments could
> have told us this, it is a backlog entry.*

This is not style preference — it has repeatedly caught defects that review structurally could
not:

- **`playId?: never` over an optional field** (ADR-014 item 13, ADR-016). Making "not a play"
  structural rather than a missing value immediately exposed three misclassified events — and
  then, when they moved, a silent zeroing of every kicking and return statistic that no test
  was watching for.
- **Required `tunables` parameters over an optional one** (ADR-012, ADR-016). `tsc` found seven
  module-load-time reads invisible at every call site, including `tierFor` at forty `CHECK`
  construction sites. An optional parameter would have turned each into a silent default, and a
  calibration batch would have reported clean statistics about a simulation half-run under the
  wrong tunables.
- **A roll is recorded exactly once** (ADR-004). A duplicated `RollDetail` inflates aggregates
  silently; every individual number stays correct and only the total lies.
- **Widen or add; never overload an existing event's meaning** (ADR-010). Adding leaves consumers
  *loudly incomplete*; overloading makes them *silently wrong*.
- **`Evidence<T, E>` with a checkpoint token** (calibration ingestion). The sacred-season rule
  became impossible to violate rather than merely against policy.
- **`DerivedLeague` uninhabited** (ADR-020). On a flat league the upset-rate metric computes a
  rating gap of zero for every game and reports a perfectly calibrated 50% — **it renders
  green.** Making the provenance a phantom brand turns that into `NOT_APPLICABLE` with a reason.
- **The known-truth gates' recorded step SEs.** A monotonicity gate sat **1.4σ from its
  tolerance with an ~8% false-red rate and had never fired** — worse than the gate that did go
  red, and invisible *precisely because it was passing*. **A gate passing by luck is
  indistinguishable from a gate working, right up until it isn't.** The fix was not a wider
  tolerance: each scenario now carries `recordedSteps` and `recordedStepSE`, and every run
  asserts a 4σ noise margin, a signal margin of half the smallest true step, and an effect floor
  under 80% of measured span — so **widening a tolerance to go green requires editing a field
  labelled "measured", beside the seed digest that measured it.** §4.1 applied to the test suite
  itself.

- **A declared version cannot detect a change to the thing it labels** (ADR-025). Two baseline
  reports both stamped `DEFAULT_TUNABLES`, while `DEFAULT_TUNABLES` moved underneath them, compare
  as identical. **Prefer an observed hash to a declared version anywhere the two can disagree** —
  and they can disagree wherever a human writes the label. The test that catches it carries the
  general form as its own explanation: *"the label is lying."*

**Corollary — chase the visible red.** The buried gate was found only by investigating the one
that fired. A failing test is often the cheapest available sample of a class of problem, and the
instinct to fix it quickly and move on is what leaves the silent siblings in place.

**Corollary — verifying that a TOTAL FUNCTION did not change requires a total comparison.** A
sample cannot establish it. When converting a constant-by-omission into a constant-by-declaration
(ADR-031's `arrival.pressureWithinSeconds`), transcribe the old function verbatim and compare it
**point-for-point over the whole reachable domain**, then corroborate with a whole-stream hash —
124,870,341 characters, identical. That second check does double duty: it also proves the *other*
change in the same dispatch had no behavioural surface beyond its stated table. **Reuse this
pattern for every behaviour-preserving refactor**; "the tests still pass" is not the same claim.

**Corollary — do not become a field's first consumer merely because it exists.** ADR-018 added
`RushAssignment.side`; ADR-031 declined to key travel time on it, because **left and right are
mirror images and handedness is a claim no football supports.** The availability of a field is not
an argument for using it, and the temptation recurs every time a petition lands. Same restraint as
ADR-006's engine declining to assert football it cannot know.

**Corollary — frozen means "not editable", never "not observable".** A frozen tunable exists to
stop a number being *changed* to flatter a metric. It should never stop the number being
*measured*. `blockerStructuralAdvantage` went **sixteen dispatches** without a sensitivity sweep
because the freeze was stated without that distinction, and it was the project's most load-bearing
tunable throughout (ADR-027). **Any future freeze must say so in those words**, and the split it
implies — a sweep may vary the value in memory; only a patch petition changes the committed one —
is what lets a freeze be strict without being blinding.

**Corollary — an ordered enum whose order carries meaning gets a monotonicity gate.** When an
enum's *order* means something — severity, urgency, tier, priority — the ordering is a **claim about
behaviour**: that a strictly worse input never produces a strictly better outcome. An unasserted
claim about behaviour is exactly what this project keeps finding by accident. The worked example is
the pocket-status ladder (ADR-032, backlog 42): `pocket.severity` ranked `SACK` above `IMMEDIATE`
while `forcesDecision` and `sackWhenNoTarget` both stopped at `IMMEDIATE`, so **the worst status
forced nothing** and moving the band there *lowered* the sack rate by 1.889pp — a reachable state,
strictly wrong, found by a **sweep** rather than by the suite because **nothing asserted the order**.
The root cause was a category error the gate would have exposed: `SACK` is an *outcome*, not a
status, and did not belong on the ladder at all. **Gate the order wherever the order is load-bearing**
— an order that nothing checks is a silent default with extra steps.

**Corollary — a default that is also a valid extreme is not a default. It is a lie with a
fallback's name.** `severityOf(status) ?? 0` looks like defensive coding and is the opposite:
**`0` is the BEST rung**, so an unranked status reports as *the cleanest possible pocket*, and every
`worst()`, every reconstruction and every tick bucket downstream silently agrees. Nothing is
missing, nothing is `undefined`, nothing looks wrong — the value simply *is* the answer that hides
the error. This is the exact mechanism by which `SACK: 4` outranked `IMMEDIATE` unnoticed for the
life of the ladder, and it recurred **twice in one week** (`pocketBandSweep.test.ts`,
`freeRunnerSweep.test.ts`, the latter from a hand-restated map that had already gone stale).

**The rule: anywhere a `??`, `||` or `defaultValue` supplies a value on an ORDERED scale, the
supplied value must be unreachable on that scale, or the expression must throw.** A sentinel that
sorts is not a sentinel. Prefer the throw — ADR-034's narrowing removed the *conditions* for this
class rather than its instances, but the guard stays because the type cannot bind a caller arriving
from JavaScript across a package boundary.

**Corollary — derive the check from the thing it checks; a restated constant is a copy that will
drift.** A test, gate or probe that *restates* the value it verifies is a second source of truth,
and the second source is always the one that goes stale — silently, because a stale copy is
indistinguishable from a passing check. **Derive it instead, so the check cannot survive a change
to its subject.** Four applications, and it has paid every time:

1. Calibration's claimed-attribute list derived from `testsAttrs` rather than maintained by hand.
2. The pocket-ladder gate's rungs derived from `pocket.severity` — which is *why* ADR-033 worked:
   removing one key removed a rung from three tables, one type, and one gate at once.
3. `probeBands` derived from `passRush.bands` by margin sign rather than named literally —
   **a literal cannot notice a band being split underneath it**, which is precisely what ADR-033
   did to it (the previously stated "~95% reach" turned out to be one band's reach attached to a
   three-band argument).
4. The band-table `guardedBy` relation derived from the resolvers rather than declared as an
   exemption list — because **a stale exemption is indistinguishable from a suppressed defect**.

The falsifiable test to apply when someone claims a check is derived: *does a change to the subject
automatically invalidate the check?* If it does not, it is a restatement wearing a derivation's
name.

### ⛔ THE FOUR MEDIA OF A RESTATED CONSTANT — and the family is now large enough that seeing them together is what makes the next one recognisable

A restatement is not a kind of *value*; it is a **relationship** — a second source of truth about
something that already has one. It has appeared in four different media in this repo, and **all four
share the property that nothing compiles against them:**

| medium | what carries the restatement | worked example |
|---|---|---|
| **PROSE** | a comment or design-doc sentence asserting a value or a shape | `CATCH_RESOLUTION`'s comment naming the wrong quantity (ADR-044) |
| **TRANSCRIPTION** | a table hand-copied from the doc into the engine | `tippedBall.qualityBands.DEAD.finalTargetNumber = 0` — the doc had prose, the table demanded a number, **and a number appeared** |
| **QUOTATION** | an ADR quoting a constant into a `Need` section, acquiring a ratification | ADR-046's `opennessGainPerTick = 8`, a **sibling leaf of the same name**; the value is `5` |
| ⛔ **POSITION** | an **index standing in for an identity** | `ladderTail`'s `committedLabels[4]` for `TIE`, `.slice(0, 4)` for the success labels |

> ### **The positional medium is the worst of the four, and the reason is mechanical: it leaves NO STRING TO GREP.**
>
> A copied value can be searched for. A copied sentence can be read. **An index is invisible to every
> search that exists**, and — the part that makes it dangerous rather than merely hard — **it looks
> like ACCESS rather than ASSERTION.** `xs[4]` reads as *"take the fifth element"*; it *means* **"the
> fifth element is `TIE`"**, which is a claim about the structure that nothing checks and no reader
> parses as a claim at all.
>
> **THE PRACTICAL FORM: any index into an ordered structure that MEANS something specific must be
> derived by name or predicate, never written as a literal.** `ladder.indexOf(TIE)` **fails loudly**
> when `TIE` moves. `xs[4]` **returns a different rung and keeps going** — and both compile, both
> typecheck, and only one of them is a check.

**The track record, stated flatly because it is now a pattern rather than an anecdote: in this repo,
HAND-ENUMERATED COVERAGE LISTS HAVE BEEN WRONG EVERY SINGLE TIME THEY HAVE BEEN CHECKED.** Two
instances in one week, both authored carefully, both confidently wrong:

- **The six band-table exemptions (ADR-035).** Three of six were wrong — and on `stunt.bands` /
  `blitzPickup.bands` the list named *the wrong rows*, so it would have **gone green while leaving
  `LATE_EXCHANGE → LOOPER_FREE` unasserted forever.** Not incomplete: **confidently wrong while
  passing.**
- **The five packages needing a `typecheck` script (ADR-038).** Hand-counted as four; the derived
  checker found **five** — `apps/game` was missed, and the fix would have shipped with a hole in it.
  **The guard caught an omission in its own rollout.**

Treat a hand-written coverage list as a defect report about the missing derivation, not as an
artefact to review more carefully. Reviewing it harder has never been what caught these.

**These two corollaries COMPOUND, and neither alone explains the defect that produced them.**
`freeRunnerSweep.test.ts` held a hand-restated `SEVERITY` map read through `?? 0`. **The
restatement is what let it drift; the sorting sentinel is what turned the drift into a silent wrong
answer instead of a crash.** Separate them and each looks survivable — a stale copy would have
thrown on the missing key, and a bad default would never have been reached had the map been
derived. Together they produce the worst available outcome: a confident, plausible, wrong number,
with the *cleanest possible pocket* as the answer.

**So treat the pair as one review question:** wherever a constant is restated, ask what happens when
it drifts — and if the answer is a default rather than a failure, that is not two small problems, it
is one silent one. The general shape is that **drift supplies the wrong key and a sorting sentinel
supplies the wrong answer to it**, and a codebase containing both patterns has a defect class it
cannot detect by testing, because every test passes.

**Corollary — a ratified plan is not a licence to stop thinking. Check the plan against the
constitution as it stands at EXECUTION, not as it stood at drafting.** This project ratifies faster
than it executes, so a decision approved on Monday can be governed by a principle added on Tuesday.

The worked example is ADR-034's own consequence section, which proposed deleting
`PocketStatusRung` — `keyof Tunables["pocket"]["severity"] & PocketStatus`, the **derived** type — in
favour of contracts' **restated** union. Correct when drafted; **backwards** by the time it was
executed, because §4.1's derivation corollary was ratified in between. It compiled, the ADR was
approved, and the two types agreed that day. It would have been silently wrong the first day they
did not.

**Why this belongs here rather than in a workflow note:** a ratified plan is the one artefact review
structurally cannot catch, *because review already happened*. Approval converts a claim into an
assumption, and the assumption is then carried by everyone downstream — including its author, who is
the person least likely to re-open it. **The authority of a decision is not evidence for it.** The
practical form: when executing an approved plan, re-read the constitution, not the approval — and if
a step no longer fits, amend the decision on the record rather than either executing it or dropping
it silently.

**Corollary — a test asserting a comparison the type system already decides must FAIL TO COMPILE,
not pass green.** A tautology renders as a passing test. It costs a line in the suite, contributes a
green tick, and asserts nothing — and it is *indistinguishable from a real assertion* in every
report anyone reads.

The worked example is `test/passPlay.test.ts:143`, which asserted that
`event.payload.status === "SACK"` is `false`. True when written. After ADR-034 narrowed
`PocketStatus`, **provably false by type** — the comparison cannot be anything else, so the test
began passing for a reason unrelated to the behaviour it was written to protect. The fix is not to
delete it but to **replace it with the general property it was a case of, derived from the source of
truth** (here, `pocket.severity`).

**The reason this is a §4.1 claim and not a style note:** it was invisible until a *typecheck of the
test files* existed, and the repo's root `typecheck` script had never checked a test file in any
package but one. **A suite cannot report that one of its own assertions has become vacuous** — every
signal it emits says "passing". This is the sharpest available demonstration of the section's own
premise, found inside the section's own instrument.

**Corollary — a root command must check everything its name implies, or be renamed.** `typecheck`
running `pnpm -r exec tsc --noEmit` resolves each package's *nearest* `tsconfig.json`, which
everywhere includes `src` only — so a gate made blocking in CI **silently checked less than its name
claimed**, for the entire life of the repo. Fix the command, never paper over it with per-package
overrides: **a root script that silently checks less than its name implies is the same species as a
restated constant** — a second source of truth about coverage, and the one everybody trusts.

**Corollary — say whether an instrument ELIMINATES a defect class or merely BOUNDS it. Most bound;
a few eliminate; assuming the wrong one is how a family gets abandoned half-handled.**

A clean `tsc` over the test project **proves** there is no second `TS2367` tautology in the engine's
44 test files — a comparison between non-overlapping types *is* that error, so the check is
**exhaustive over its class**. No audit, no sampling, no residual doubt. That is rare here: most of
this project's instruments bound a class *probabilistically* (a sweep at some `n`, a corpus with some
reach, a gate with a tolerance), and their silence means *not observed*, never *not present*.

**The hazard is the adjacent class that looks handled and is not.** `TS2367` is closed;
`expect(x).toBe(x)`-shaped tautologies are **wide open**, because the compiler cannot see them. A
reader told "the tautology problem is fixed" will reasonably assume the family. **So state the
class, not the outcome** — "no `TS2367` in the test project" rather than "no tautologies" — and when
a class is eliminated, name what remains beside it.

### The register — THREE tiers, not two

**Tier 1 — ELIMINATED. The compiler proves it; no installation, no invocation, no human step.**

- `TS2367` tautologies in `@ff/engine` and `@ff/playbook` (wired `tsconfig.test.json`).
- `PocketStatus` / `pocket.severity` ladder drift (ADR-034's mutual-assignability assertions).
- `DEAD` recovery targets (ADR-036's discriminated union — the key's *presence* is unrepresentable).

> **⚠ A REACH FLOOR IS NOT A REDNESS LEVER — and the intuition runs the wrong way.** A floor *feels*
> like a filter that removes noisy rows from a gate. **It is a filter that removes EXEMPTIONS.**
> Refusing to exempt an under-sampled row **keeps that row's honest value in the sequence**, so a
> floor can only ever make a gate *stricter*. ADR-035 §6.3 predicted the opposite — that a column
> would "stay red until calibration has a corpus that reaches those rows" — and the gate's very first
> unpatched run refuted it: `GIFT` at reach 1 derived `LIVE`, `FLOATER` was `UNREACHED_ROW`, the
> genuine sentinels were `GUARDED` on evidence, and the sequence came out monotone. **Anyone reaching
> for a floor to suppress a noisy red is reaching for the wrong instrument, and will get a stricter
> gate than they started with.**

**Tier 2 — BOUNDED AND VERIFIABLE. A machine can check whether the guard is live.**

- ADR-038's workspace-coverage assertion. Note it proves every package **claims** to be typechecked,
  **not that the workspace IS** — `"typecheck": "true"` satisfies it. It eliminates the *silent-skip*
  class only, and a future reader will cite it as proof of more than that.
- Every sweep, corpus reach and tolerance band. **Their silence means *not observed*, never *not
  present*.**
- **🚫 BOUNDED WITH NO PATH TO ELIMINATION — the only entry of its kind: the doc → table direction
  of the scale audit (ADR-039).** Every other line in this register has at least a *theoretical*
  instrument; **this one cannot have one, in principle.** Finding a doc requirement for which **no
  cell exists** means detecting an absence, and **the absent thing has no representation to derive
  from** — there is nothing to walk, hash, perturb or enumerate. It is **irreducibly a reading**,
  and it **must be redone whenever the doc changes**, by a person, forever.

  > #### ⛔ THREE DIRECTIONS NOW POINT AT THIS SAME SURFACE, AND THAT IS WHAT MAKES IT IRREDUCIBLE RATHER THAN MERELY UNBUILT
  >
  > | direction | what it reads | why no instrument reaches it |
  > |---|---|---|
  > | **doc → table** (ADR-039) | a doc requirement for which **no cell exists** | detecting an absence; **the absent thing has no representation to derive from** |
  > | **comment → field** (backlog **2b**) | a `contracts` comment against **what the field actually carries** | ADR-044's was wrong in the exact direction that converts a correct implementation into a broken one, **with every test green** |
  > | **value → intent** (backlog **62**) | a published value against **what it was supposed to be** | an identity check proves **transport, never correctness** — publish `7` where the doc says `5`, read the same `7` back, and **both sides agree perfectly** |
  >
  > ### **A value that is computed, published, and internally consistent has NO instrument that can catch it being the WRONG value. Only a reading against intent.**
  >
  > The three are not three gaps. **They are one surface seen from three sides** — doc-shaped,
  > comment-shaped and value-shaped — and every one of them terminates in *a person reading something
  > against what it was meant to be.* ⚠ **Cross-reference them to each other**, because each looks
  > like a local problem in its own entry and is not.
  >
  > #### ⚠ WHY IT TOOK THREE ENTRIES AND A PROHIBITION TO SEE — a hazard of a WELL-INDEXED record
  >
  > **A backlog entry that is complete in itself is exactly what makes it useful, and exactly what
  > keeps it from being read alongside its siblings.** Each of the three states its own gap fully,
  > cites its own evidence, and closes. **Nothing in a self-contained entry ever prompts the question
  > *"is this the same hole as one of the others?"*** — the completeness that makes the record
  > trustworthy is what makes it resist cross-reading.
  >
  > **What actually surfaced it was §4.1's prohibition** (*name the enforcing thing, or say nothing*):
  > entry 62 was forced to state what covers the published-and-wrong case, **the honest answer was
  > *nothing*, and the plain answer is what exposed the shared surface.** A reassuring sentence about
  > the scale audit probably catching it would have closed the question **and hidden the connection.**
  >
  > ⇒ **That is twice in three dispatches the prohibition has paid, and both times by producing a
  > "nothing" that turned out to be INFORMATIVE rather than embarrassing.** ⚠ **Treat an honest
  > *"nothing covers this"* as a POINTER, not as an admission** — it is the only sentence in the
  > register that reliably names an unexplored surface.

  > #### ⛔ SECOND ENTRY ON THIS LINE (July 2026) — **A DEFECT IN THE RELATIONSHIP BETWEEN TWO INDIVIDUALLY-CORRECT CONSTANTS.**
  >
  > **Two instances, both ratified, both defensible alone:** `pressureWithinSeconds = POS_INF` against
  > `collapsingWithinSeconds` (entry 76), and `scramble.pursuitSeconds = 1.5` against
  > `pressureWithinSeconds = 2.0` (ADR-055) — **the second making 20.809% of all ticks non-`CLEAN` by
  > arithmetic.**
  >
  > ⛔ **NO INSTRUMENT HERE CAN FIND IT, and each misses for its own reason:** the doc-conformance
  > register checks **cells against the doc** and both conform; a sensitivity sweep prices **one cell
  > at a time** and each is correct where it sits; the band-table gate checks ordering **within** a
  > table and these sit in different tables; the exclusive-share sweep finds an **inert** mechanic, not
  > two live ones whose **product** is wrong; and habit 10a's ruling-search asks *"has this cell been
  > ruled on?"* — ⚠ **answering YES, correctly, for all four constants.**
  >
  > **The partial mitigation, with its own limit stated:** when a constant is derived *against* another,
  > **pin the relation rather than only the value.** ⛔ **That would not have caught ADR-055** — nobody
  > derived `1.5` against `2.0`; **the two constants never met until a census counted ticks.**
  >
  > > ### **A pin records a relation someone NOTICED. It cannot record one nobody did.**
  >
  > ⚠ **Both were found by MEASURING SOMETHING ELSE** — one by sweeping a channel, one by censusing a
  > population. **That is a habit that stumbles into the class, not an instrument that detects it.**

  Mark anything that joins
  this line the same way: not "we have not built the instrument yet", but **"no instrument is
  possible"** — the two look identical in a backlog and are opposites in a plan.

**Tier 3 — BOUNDED AND UNVERIFIABLE. Its status depends on a human having run a command, and the
repo cannot tell from inside whether they did.** *Written as "a category of one"; it was two within
the hour — see the second entry. **Assume it is larger than this list.***

- **`.githooks/commit-msg`.** It is **the strongest guard in the repo** — it sees the staged diff
  *however the bytes got there*, including shell writes by sub-agents, which `.claude/settings.json`
  cannot. And it is the **only** guard a clone can lack **silently**: `core.hooksPath` is per-machine
  and not carried, so a fresh clone can amend the constitution with no ADR and no error, looking
  identical to a machine where the guard is live. CI asserts the file exists and is executable; it
  cannot know whether your git invokes it. (HANDOFF §1.3.)

- **Every env-gated instrument** — `FF_BAND_GATE`, `FF_POCKET_LADDER`, the sweeps. **Nothing in CI can
  tell whether a human typed the variable**, and a tree where a resolver started reading an exempt
  cell is **byte-identical under `pnpm test`**. Mitigated by standing instructions in ADR-037 §6 and
  the test headers, and by `typecheck` now covering `test/` — **neither is a proof.**
- **`@ff/calibration`'s clean typecheck, historically.** Its `tsconfig.test.json` and `typecheck`
  script were correct and **invoked by nothing** until ADR-038. It came back with **zero** stale
  errors anyway — against `@ff/engine`'s eight on a smaller surface — because its agents had been
  running it **by hand** every dispatch. **The coverage was real and the guarantee was not:** a
  convention is a rule that holds until someone is in a hurry, and it held only for as long as the
  people involved were conscientious. Now tier 2. *Recorded because "it was clean anyway" is the
  most misleading possible evidence that a missing instrument did not matter.*

> **The inversion is structural, not incidental, and it generalises.** The guards that operate on
> **content** — types, a hook over the staged diff — are the strong ones *precisely because they sit
> outside the process being guarded*. **That is the same property that makes their presence
> unverifiable from inside it.** Strength and self-verifiability trade against each other here, so
> anything joining tier 3 has earned its power the same way and deserves the same scrutiny: state
> plainly what a machine lacking it would look like, and assume that is some machine.

**Corollary — a structural fix radiates to sibling boundaries; a patch does not.** ADR-036 changed
one payload into a discriminated union, and the compiler then surfaced `resolveRecoveryAttempt`
taking the band union **plus** a redundant `finalTargetNumber` — so **nothing had stopped a caller
pairing the `DEAD` row with an invented threshold.** Nobody was looking there. It was found by
**making the wrong thing unrepresentable somewhere else**, and it was behaviour-neutral *that day*
and would not have stayed so. **When weighing a structural fix against a local one, count the
siblings it will implicate** — that yield is invisible at the time of the decision and is routinely
the larger half of the value.

**Corollary — AN INSTRUMENT WHOSE COVERAGE IS IMPLICIT WILL EVENTUALLY REPORT SUCCESS OVER A SET IT
QUIETLY NARROWED.** This is the most-repeated defect family in the project, and every instance wore
different clothes:

1. `pnpm -r exec tsc --noEmit` resolving to each package's nearest `tsconfig.json` — **`src` only**,
   so the blocking CI gate never typechecked a test file outside one package.
2. `pnpm -r run <script>` **silently skipping** packages that lack the script, erroring only when
   *none* has it. The obvious repair for (1) would have rebuilt (1).
3. A sweep quoting a **raw** affected-play count where only the **exclusive** count bounds the
   result (§5.3) — the same shape in statistics rather than tooling.
4. Latent: `pnpm -r test` and `-r build` cover all eight packages **today**, but nothing *requires*
   them to. Package nine escapes in silence.

**The fix is never to enumerate better; it is to make the command know what it is SUPPOSED to cover
and fail when it does not.** Declared coverage, checked — not discovered coverage, reported. An
instrument that says "I ran everything I found" is answering a different question from "I ran
everything there is", and only the second is worth a green tick.

**Corollary — ANYTHING THAT ENFORCES MUST CALL, NEVER RESTATE.** A hook, a CI workflow, a
pre-commit step: if it *names* a command instead of *invoking the declared one*, it is a copy — and
**it is the copy that decides.**

Proven instance: `.github/workflows/ci.yml` inlined `pnpm -r exec tsc --noEmit` and `pnpm -r test`
rather than calling the root scripts. **This is the worst member of the implicit-coverage family**,
and it is worth understanding why. Every other instance let something go *unchecked*. This one would
have let ADR-038 **repair `package.json`, report the hole closed, and leave the gate that actually
blocks still running the broken command** — the fix and the false confirmation *in the same commit*.

**That failure has the longest half-life of any in this document**, because what it leaves behind is
a green gate plus a ratified ADR saying it is fixed. Nobody re-opens that. The next person inherits
two pieces of evidence that agree with each other and are both wrong.

**Corollary — a guard firing on something legitimate is not a false positive if the firing is
cheap.** §4.1's counter-corollary asks whether a guard *can* ever fire; this asks the complement:
**does firing cost more than the class it prevents?** The `packages/contracts` write-protection fires
on build tooling — `tsconfig.test.json`, a `typecheck` script — which is not contract content. It was
**deliberately not taught the distinction**, because "contract content versus package tooling" looks
crisp today and gets argued at the edges tomorrow: *tsconfig is tooling; is a barrel export? a
registry constant?* **Every carve-out invites the next, and the guard's value comes from being
unarguable.** Firing here costs one paragraph in a commit message — and **three files touched in the
constitution's directory should cost a paragraph.** The friction is the feature.

**Corollary — a register that WALKS A TABLE is structurally blind to what the table OMITS. Audit in
both directions, permanently.** Walking the implementation finds cells that are wrong, dead, or
invented. It **cannot** find the doc's requirement for which **no cell exists** — there is nothing to
walk.

ADR-039 found **seven** such omissions, and only by reading the doc **forwards**: §10.4's *"Off
platform (moving): −15"* **with a live population**, §11.1's entire DIFFICULT CATCH type, §7.1's
*"−5 if all matchups are ties"*, and four more. Alongside them, `spectacularCatch` — **active in the
registry, read by no resolver, absent from `TUNABLES`** — which is `anchor` before ADR-028, all over
again.

**So the audit has two directions and needs both every time**, not once:

- **Table → doc** finds *cells nobody asked for* (transcription artifacts: the doc had prose, the
  rectangle demanded a number, a number appeared).
- **Doc → table** finds *requirements nobody implemented*. **This direction has no instrument that
  can be derived**, because the absent thing has no representation to derive from — it is
  irreducibly a reading, and it must be redone whenever the doc changes.

This is the third distinct failure at the doc/table boundary, and the three are **not** variants of
one: the doc said something **wrong** and was transcribed faithfully (§7.2); the doc said
**nothing** and a zero was transcribed (ADR-036); the doc said something and **no cell exists**
(ADR-039). Each needs its own pass.

**Corollary — ANY CHECK WHOSE SUBJECT IS A COUNT IS BLIND TO SUBSTITUTION.** A cardinality cannot
see a swap. Pin the **set**, not its size.

ADR-041's worked example is as clean as this gets: ADR-040 **removed** one tunable cell and **added**
another under the same block rule — **net zero**. The census held at `numbers: 699`, `unclassified`
was empty, `deadRules` was empty, **every gate was green** — and **a cell that had not existed the
day before entered the tree wearing a `DOC_VERBATIM` note written about a different cell.** The
register reddened on a *string* count that same day, and was blind to the substitution that actually
mattered. Fixed by pinning the subject's identity (`numericLeafPathDigest()`), not its cardinality.

### ⛔ AND THE INVERSION — **IDENTICAL OBSERVATIONS THAT ARRIVE AS SEPARATE EVENTS NEVER GET COUNTED AT ALL.**

**The corollary above is a count blind to substitution. This is the reverse: a SUBSTITUTE for a count
that nobody ever formed.**

**`tippedBall`'s structural half read `0 / 0 / 0 / 0 / 0` across FIVE re-baselines**, on a corpus where
every football digit moved every time. ⚠ **Each arrived inside a different dispatch, about a different
subject, and each was written up as a footnote — *"the corpus moved, re-pin it."***

> ### **Each individual observation read as BOOKKEEPING. The sequence reads as a PROPERTY: a subsystem whose numbers move under every change EXCEPT the one that should move them is not noisy — IT IS UNATTACHED.**

⛔ **Nobody counted, because there was nothing to count against — the five sightings were never
co-located.** ⚠ **This is the ABSORBED FINDING appearing five consecutive times without anyone noticing
it was the same one**, which is a stronger argument for the routing clause than any single instance
was: **five authors each recorded a true observation in the only place available, and no place
aggregated them.**

**⇒ THE TELL: a note you have written before, in a different dispatch, about a different subject.**
⚠ **Repetition across contexts is the signal — and it is invisible from inside any one of them.**
⛔ **When a finding recurs, the recurrence is the finding.**

**This is the third distinct blindness class found INSIDE an instrument built to find blindnesses**
— after the implicit-coverage family and the doc→table direction. That is the argument for **keeping
the register itself under review rather than trusting it once it is green**: the instruments in this
project have a worse record of self-knowledge than the code they inspect, and each blindness was
found by using the instrument, never by reading it.

**Related, and the reason a stronger check is not automatically a safer one: a compiler pin anchored
to a SYMBOL inherits that symbol's definition.** ADR-040 pinned a threshold to §11.1's row by type
equality — unbreakable as to the coupling, and **silent when the anchor itself is re-ruled** (see
`CALIBRATION-BACKLOG.md` entry 47). **Pin what you mean: if the identity of the anchor is part of the
claim, assert the identity too.**

**Corollary — AN INSTRUMENT CAN ONLY BE AUDITED BY RUNNING IT AGAINST A CASE IT SHOULD FAIL ON.
Every instrument ships with such a case, and that case is RE-RUN whenever the instrument's subject
changes.**

`CALIBRATION-BACKLOG.md` §22a said this about *gates* — *a gate that never fired was worse than the
one that went red.* **It generalises to every instrument in this project**, and the evidence is that
all three blindnesses found in instruments were found **by using them, never by reading them**:

| instrument | blindness | found by |
|---|---|---|
| hand-written band-table exemption list | named the **wrong rows** and went green | deriving the relation and comparing |
| the doc-conformance census | a **cardinality cannot see a swap** (net-zero cell substitution) | a real swap landing under a block rule |
| ADR-040's compiler pin | **inherits its anchor's definition** when the anchor is re-ruled | a ruling moving the anchor |

**None was visible to review.** Each looked correct, careful and green. **So the review discipline
for an instrument is different in kind from the one for code:** reading an instrument tells you what
it *claims* to check; only failing it tells you what it *does* check.

**The standing practice, therefore:**

1. **Every instrument ships with a case it must fail on.** The band gate does (`guard-removed`,
   `injected-inversion`). The pocket-ladder gate did (the recorded `IMMEDIATE → SACK` red). The
   doc-conformance register now does. **A compiler pin's failing case is a second assertion** — which
   is precisely what entry 47's pin fix is.
2. **Re-run it when the instrument's SUBJECT changes**, not only when the instrument does. A green
   instrument over a changed subject is the exact configuration all three failures above shared.
3. **An instrument with no failing case is not yet an instrument.** It is a claim.

**Corollary — THE OPAQUE-TYPE FIXPOINT is how you enumerate a scale's consumers. And its ONE blind
spot is labels, which is exactly where scale changes originate.**

**The method** (ADR-043, and the best instrument built in this project so far): make the quantity an
**opaque type at its producers**, then let `tsc` walk the transitive closure. Each round's terminal
errors (`Operator '<=' cannot be applied to 'OP' and 'number'`) **are** the consumer list; re-type
each carrier and recompile to a fixpoint, then revert. **Use it for any future scale question.**

**Why it beats a careful list, stated exactly: THERE IS NOTHING TO READ AT A LAUNDERING SITE.** It
found one on its first outing (a helper returning plain `number`, whose tightening surfaced two
invisible consumers) and a worse one on its second: ADR-045's `QbReadOutcome`, which returns **all
three** openness values as plain `number`, so everything past it — `throwThreshold`,
`checkdown.threshold`, `desperationThreshold`, §8.5's ordering, §10.2's throw-type selection — **reads
a quantity whose type is already erased.** Tightening that **one** return type surfaced **four of the
seven** threshold consumers.

**No list, however careful, finds a consumer whose type was erased upstream of it.** There is no text
at that site to notice — the erasure is the absence of evidence, and a reader has nothing to be
careful *about*.

**⚠ ITS BLIND SPOT IS THE FINDING, NOT A CAVEAT. A type cannot see a LABEL consumer** — code or prose
consuming a scale's *words* rather than its *numbers*. And **scale corrections are almost always
label re-pointings**, so the method is blind precisely where the work originates.

> **THE TWO ARE COMPLEMENTS, NOT ALTERNATIVES — AND EACH IS THE OTHER'S BLIND SPOT.** The derivation
> **sees through erasure and cannot see words.** The reading **sees words and cannot see through
> erasure.** ADR-045 proved both halves in one dispatch: the fixpoint found four consumers behind a
> laundering site that no reader could reach, and the reading pass found §9.4's `WINDOW` row holding
> **70 — §8.4's wide-open floor — labelled *"open"***, which **no numeric method finds, because
> nothing in the table says "open."** Neither is sufficient; neither substitutes. **Run both, every
> time.**

This was not hypothetical for one dispatch. SA-08 **is** a label re-pointing; §9.4's zone bands are
stated in **§8.4's words**; and that invisible coupling is what forced SA-08's scope to enlarge from
one table to two — **after** the derivation had returned a complete-looking numeric answer. **A scale
used by two producers cannot be corrected for one**, and the derivation could not have told you the
second producer existed.

**So pair it, always:** the fixpoint for numeric consumers, and a **reading** for label consumers.
The second has no instrument (see this register's *no path to elimination* entry) and must be redone
whenever the doc changes. Its other stated limits: it closes over one package only and **stops at the
event boundary** — anything past the stream was found by **grep on field names, which is not a
derivation**; and laundering is **mitigated by reaching a fixpoint, not proven.**

**Corollary — TYPES, GATES AND PINS ALL CONSTRAIN THE VALUE. NOTHING CONSTRAINS THE PROSE — and the
prose is what the next implementer reads first.**

**A field's comment is a claim about the field, and it can be wrong in a way nothing checks.** In
`packages/contracts` this is **the single highest-leverage defect available in this repo**, and the
asymmetry is vicious: **the guard's own strength is what makes its prose authoritative.** A comment in
a write-protected constitution file is trusted *more* than the code, precisely because the file is
hard to change.

The worked example is ADR-044. `CATCH_RESOLUTION.openness` was documented as **effective** openness;
the engine correctly publishes **actual** openness. **The comment was wrong in the exact direction
that converts a correct implementation into a broken one** — a future author trusts the constitution
over the engine, swaps in `effectiveOpenness`, destroys the measurement the field exists for, **and
every test stays green.**

**THE RULE, because the mitigation that worked must not stay an anecdote:**

> **An implementer who finds prose contradicting behaviour REPORTS THE MISMATCH AND IMPLEMENTS THE
> BEHAVIOUR. Resolving it silently, in either direction, is the error.**

**It applies in both directions** — including when the prose is right and the code is wrong. The
report is what surfaces *which*, and an implementer who quietly "fixed" the code to match a correct
comment would have destroyed the same information: the fact that they disagreed. **This is correct
procedure, not pedantry**, and `match-engine` reporting rather than resolving is what saved ADR-042's
field from being satisfied into uselessness.

**Corollary — A CONSTANT QUOTED IN AN ADR'S `Need` SECTION IS A RESTATED CONSTANT WITH AN OWNER'S
RATIFICATION ATTACHED, AND THAT IS STRICTLY WORSE THAN AN UNRATIFIED ONE.**

**Ratification converts a restatement into an assumption.** This is the *ratified-plan* corollary and
the *derivation* corollary **compounding** — a pairing not previously seen here, and the compound is
worse than either: the number is a copy that can drift **and** it now carries authority that
suppresses re-checking.

The instance: `route.opennessGainPerTick = 8` was quoted through **three documents into a ratified
ruling**. The committed value is **5**. The `8` is `scramble.opennessGainPerTick` — **a sibling leaf
of the same name under a different block.** Every instrument in the chain was pointed at
**behaviour**, not at the **citation**, and `packages/calibration`'s doc-conformance register **held
the correct value the entire time** (`DOC_VERBATIM` against §8.7's *"+5 per tick"*). **Two artefacts
in the repo disagreed and nothing compared them.**

**Mitigation, and the cheap half is a habit rather than work:**

1. **Cite the register entry, do not transcribe the number.** An ADR that says *"§8.7's per-tick gain
   (see the doc-conformance register)"* cannot drift; one that says *"= 8"* already has.
2. *(Real work, optional)* a check that constants appearing in ADR text match the committed tunables.

**Note what did NOT go wrong:** the ruling turned on **shape**, not magnitude, so it stands. **A
quoted constant is most dangerous where the decision depends on its VALUE** — and that is exactly the
case where nobody re-reads it, because the ADR is ratified.

> **THE GENERAL FORM — LOG, DO NOT SMOOTH. The disagreement is the finding; the resolution is
> downstream of it.**
>
> This project has done this well repeatedly and mostly by instinct: declared absences with forbidden
> substitutes rather than a default; a refusal recorded as a result; `reachFloorApplied: false` so
> *not measured* cannot read as *measured and fine*; both timings printed rather than differenced;
> the retired red kept with its provenance instead of truncated.
>
> **What makes the prose case the sharpest instance is that BOTH smoothings look like diligence.**
> Fixing the comment to match the code, and fixing the code to match the comment, are each defensible
> in isolation — and each destroys the one fact that mattered, which is that two sources of truth had
> drifted apart and nothing noticed. **Whenever two things that should agree do not, the disagreement
> is data. Record it before resolving it, and record that it happened after you have.**

**This is the fourth blindness class, and it has no instrument** — it belongs with the register's *no
path to elimination* entry. There is nothing to walk, hash or perturb; a comment has no
representation a check can reach.

**Corollary — THE DANGEROUS STATE IS NOT "UNINSTRUMENTED". IT IS "APPARENTLY INSTRUMENTED": several
green artefacts around a cell, and NONE of them has the property in its subject.**

An uninstrumented surface is honest — nobody believes it is checked. **Three green instruments
pointed at a column are the condition under which a reader stops reading.**

The worked example (ADR-045, `CB_IN_PHASE`): the owner found a defect **by reading a column**, and
**every instrument aimed at that column was blind to it**:

| instrument | why it could not fail |
|---|---|
| the band-table monotonicity gate | **green on a tie by construction** — a tie neither rises nor falls |
| §8.5's rank-order pin | passing because of **`Array.prototype.sort`'s stability**, not because of the ordering it names |
| the openness consumer matrix | classified `25` and `25` **identically, and correctly** |

**So state the failure precisely: not *"no instrument exists"* but *"instruments exist and the
property is in none of their subjects."*** The former is a gap you can see in a list; **the latter
looks like coverage.**

**Extension — A FAILING ASSERTION MASKS EVERY ASSERTION AFTER IT IN THE SAME TEST. A red test is not
a fully evaluated test.**

Found by accident while clearing ADR-053's red tree, which is the only way it *can* be found.
`ladderOccupancy.test.ts` held two inline snapshots in one test — `OPPOSED`, then `TARGET`. The first
went red on the ladder change and threw; **the second never executed.** It was still asserting
`CRITICAL_SUCCESS 71.000` from the old open rung, against a true value of `15.000` — **stale, wrong,
and completely invisible**, because a test that is already failing reports nothing about what comes
after the throw.

> ### **A red test tells you about its FIRST failure and nothing else. Everything downstream of the throw is UNEVALUATED, not passing.**

**The compounding case is what makes this worth a corollary:** while a test is red for a *known*
reason, every later assertion in it is **silently unverified for as long as the red persists** — so a
long-lived red test is a place where stale assertions accumulate *undetected*, and they surface only
when someone fixes the first failure. **Clearing a red assertion is therefore not "restoring" the
test; it is EXPOSING the rest of it for the first time since it broke.**

⇒ **Practical form: when clearing a red test, re-read every assertion after the one that failed.**
And prefer one assertion per test where the assertions are independent claims, so a failure cannot
take unrelated checks down with it.

**Extension — A REFERENCE CAN NAME A REAL THING AND POINT AT A DIFFERENT ONE, and the sentence reads
identically either way.**

> ### **Naming a ladder is not identifying one.**

The corollary above says an instrument can exist without the property in its subject. This adds the
**referent** case: the *citation* is valid, the named artefact **exists**, and it is **the wrong
one** — so no reader, diff or grep can distinguish it from a correct reference. Two instances, from
one dispatch, arrived at from opposite directions:

| instance | the reference | what it actually named |
|---|---|---|
| **from the prose direction** | *"re-scope ADR-032's monotonicity gate"* — ADR-032 is real, and it **does** rule a monotonicity gate | that gate is over the **`PocketStatus` severity ladder**. The tail-occupancy property belongs to ADR-050/052, lives in `calibration`, and **was already correctly scoped.** `packages/engine` has no such gate at all. |
| **from the type direction** | `minimumStatusByBand` listed among the `PocketStatus`-keyed tables — it is real, and `PocketStatus` **does** appear in it | as its **VALUES**. Its keys are `PassRushBandLabel`. A mapped type over `PocketStatus` would have constrained **the wrong axis.** |
| **from the scope direction** ⇒ **the one with a measured cost** | *"`resultTierLadder` is structurally outside the band-table gate's scope"* — **true**, and about **one of that gate's two tiers** | true of the **monotonicity check** (no columns beyond `label`/`minMargin`, so nothing for Tier B to order); **false of the CENSUS**, which counts raw rows and had `resultTierLadder` among its 26 tables all along — `discoverBandTables` recognises *any* array of `{label, minMargin}`. **Cost: 119 → 127.** |
| **from the coordinate direction** ⇒ **the smallest instance** | *"`pocketFloorFromArrival` at `rushThreat.ts:402`"* — **right file, right function** | it is at **519**. Line **402** is inside the docstring of a **different function**, `arrivedAt`. ⚠ **Two of three components verified.** |

> ### ⛔ **A CITATION IS NOT ONE CLAIM. IT IS AS MANY CLAIMS AS IT HAS COMPONENTS, AND THEY FAIL INDEPENDENTLY.**
>
> *"`pocketFloorFromArrival` at `rushThreat.ts:402`"* is **three** claims — a file, a symbol, a
> coordinate. **Two were right. All three read as one atom**, and ⚠ **anyone spot-checking would have
> confirmed the file, confirmed the function, and stopped.**
>
> **⇒ THIS IS THE ARGUMENT FOR CHECKING UNCONDITIONALLY RATHER THAN IN PROPORTION TO HOW RISKY A
> CITATION LOOKS.** A citation that is 2/3 correct **looks more trustworthy than one that is wholly
> unverified**, because the parts that are easy to check are the parts that verify. **Checking the
> easy components is precisely how the hard one survives.**
>
> ### ⛔ AND THE COMPONENT THAT FAILS IS OFTEN THE ONE A CORRECT CONCLUSION RESTS ON.
>
> **A vocabulary survey — a dispatch whose entire job was verification — reported *"ADR-055 never
> mentions `QB_PURSUIT` — zero occurrences."*** ⛔ **It mentions it once, in the implied-scope section.**
> **The substantive point survived** (the ADR treated it as *adjacent* rather than as the thing that
> already publishes the state) **and the ruling it produced was correct.**
>
> ⚠ **But *"never mentions"* is a component a grep disproves in ONE SECOND, and it was reported as a
> null.**
>
> > ### **A correct conclusion resting on a false component is the shape that gets cited later** — because the conclusion is right, so nobody re-derives it, and the false component travels attached to it as evidence.
>
> ⛔ **So a component failure is worth recording EVEN WHEN THE ARGUMENT SURVIVES.** ⚠ Waving it through
> *because the answer was right* is exactly how a false premise acquires a track record.

> ⚠ **And note where it would have landed:** the comment would have gone into `arrivedAt`'s docstring —
> **a correct sentence, attached to the wrong subject, in a file where every other comment is
> trustworthy.** That is the **placeholder-in-an-honest-neighbourhood** shape (below) **arriving in
> prose instead of in a field**: there, a fabricated value among honest values; here, **a true sentence
> among true sentences.** ⛔ **The neighbourhood vouches for it either way.**

**Both would have produced a guard that compiles, reads as coverage, and checks a property its
subject does not have** — the *apparently-instrumented* failure, reached not by a blind instrument
but by a **correct instrument aimed one referent away.** That is why it belongs here: the
diagnostics above ask *"what would make this go red?"*, and a wrongly-aimed guard **answers that
question fluently.** The missing question is the prior one — ***what, exactly, is the subject?***

**And the standing disposition when a brief asserts that something exists and it does not: REPORT IT
FOR ROUTING. DO NOT CONSTRUCT IT.** `match-engine`, told to re-scope a gate that was not there,
reported rather than building one in `packages/engine` to make the instruction true. **An instrument
built to satisfy a brief is the same failure as a fixture manufactured to produce a measurable
population** — in both cases the artefact's existence is caused by the demand for it rather than by
the thing it claims to measure, and it will be green for exactly that reason.

> ### ⛔ THE DIAGNOSTIC HAS A PRIOR QUESTION, AND IT IS PERMANENTLY ATTACHED
>
> **1. WHAT, EXACTLY, IS THE SUBJECT?**
> **2. What would make this go red?**
>
> **Never ask the second without the first.** A guard pointed at the wrong subject has a *confident,
> specific, checkable* answer to question 2 — it simply is not about the thing you meant. **A
> wrongly-aimed guard answers the diagnostic FLUENTLY**, and fluency is what the diagnostic reads as
> coverage. Question 1 is the only one that can fail for a wrongly-aimed guard, which is exactly why
> it must be asked first and cannot be inferred from a confident answer to question 2.
>
> ⇒ **AND IT APPLIES TO WORKFLOW STEPS, NOT ONLY TO INSTRUMENTS.** A test suite is an instrument, and
> *"I ran the suite"* is an answer to question 2. ADR-053's ladder shipped red because `pnpm
> typecheck` passed across eight packages and the engine suite passed 788/788 — **both true, and
> neither about the ladder's consumers**, which extend past the engine. The verification was
> **correct, complete, and about the wrong subject.** ⚠ **A green suite is evidence about the package
> it ran in and about nothing else.** See `HANDOFF.md` habit 9.

**The diagnostic that caught it is the standing practice doing its job.** Requiring *a failing case
per instrument* is what revealed that **none of the three could produce one** for this property.
**Asking "what would make this go red?" of each instrument in turn is how an apparently-instrumented
cell is distinguished from a covered one** — and it costs nothing when the answer is easy.

**Corollary — A GUARD'S FAILURE MODE IS INVERSELY RELATED TO ITS ENFORCEMENT POWER. So the AUDIT
priority is the INVERSE of the TRUST priority.**

> ### **A pin that drifts stops the build; a stored ruling that drifts keeps being cited.**

**Strong guards fail loudly, because they are wired into a mechanism. Weak guards fail silently,
because nothing consumes them.** One dispatch produced both ends of the scale simultaneously:

| artefact | enforcement | how it drifted |
|---|---|---|
| the `contestedMaxOpenness` type pin | strongest | **`pnpm typecheck` went RED.** Impossible to miss. |
| calibration's SA-08 register | weakest | **silence** — it recorded the *superseded, unsatisfiable* ruling, said the mapping was unimplemented when it had landed, and asserted *"the compiler will NOT complain"* about a compiler that **had**. Three false claims, all reading as authoritative. |

**Nothing compiles against a register, so nothing catches it.**

**THE CHEAP TRIAGE, and it is the practical form of this corollary: for each stored ruling, ask
whether ANYTHING MECHANICALLY DEPENDS ON IT** — not whether its content is current, but whether it has
a **consumer that would notice if it went stale.** That partitions any register into **rulings that
are merely recorded** and **rulings that are enforced somewhere**, and **the first partition is the
standing exposure.**

**This inverts the reading order and makes the work tractable:** do not audit every stored ruling's
correctness by reading. **First find the ones with zero enforcement — those are the ones worth reading
carefully. The rest will announce themselves.**

Two shapes to expect, both already observed here: **(a)** a ruling that names a specific value and was
made about a *different* value of it (entry 44's shape, before no-op patches enforced it); **(b)** a
ruling whose subject was later **renamed or split**, so the ruling **still reads true while pointing
at nothing** — which is exactly why the band-table register needs its `VANISHED`-versus-`GUARDED`
distinction.

**And the answer is never a count.** Per the count-blindness corollary: *"12 rulings, all current"* is
**blind to substitution.** A register must name its rulings **as a set**.

**The practical inversion, and it is the point of this corollary:** we naturally audit in order of
importance, which puts types and gates first — **but those are the ones that announce their own
failures.** **Sweep the weakly-enforced artefacts FIRST**: registers, stored rulings, backlog entries
naming values, comments, notes. They are the ones that **can be wrong indefinitely.**

**Prose is the extreme case** — zero enforcement, maximum authority (see the corollary above, and
`CALIBRATION-BACKLOG.md` roadmap item **2b**, which exists for exactly this reason).

> ### ⛔ AND AUTHORITY IS INVERSELY RELATED TO THE READER'S ABILITY TO CHECK IT.
>
> **Not all prose is equally dangerous, and the ranking is not by importance — it is by AUDIENCE.**
>
> | prose | why it is trusted | can the reader check it? |
> |---|---|---|
> | a `packages/contracts` comment | **the file is hard to change**, so the comment reads as settled | ⚠ partly — a reader can open the field it describes |
> | ⛔ **an onboarding / next-session block** | **the reader has nothing else** | ⛔ **NO — by definition** |
>
> **Both are unenforced prose. The second is worse, and the reason is structural: its audience is
> DEFINED BY NOT KNOWING BETTER.** Every other stale artefact this project has found was read by
> someone with the context to notice. **An onboarding block is read exclusively by people who do
> not have it** — which is §4.1's weakest medium positioned where the weakness costs most.
>
> ⚠ **And it produces NO SYMPTOM until someone acts on it.** A drifted pin reddens; a drifted
> onboarding block sends a fresh session to the wrong dispatch, and the first evidence is the wasted
> work.
>
> **⇒ THE ONLY VERSION THAT SURVIVES: the block is updated BY THE DISPATCH THAT MAKES IT STALE, as a
> step in that dispatch** — not by a periodic sweep. That is the moment the author knows what actually
> comes next, and it is the *free at authoring time, expensive afterwards* test again.
>
> ⛔ **AND IT POINTS AT THE ROADMAP RATHER THAN RESTATING IT.** A second copy of the roadmap in the
> onboarding document is the **restated-constant family's fourth medium** arriving where it is least
> checkable — a copy that will drift, read by the one audience that cannot tell.

**Sub-corollary — A CLAIM IS UNVERIFIED UNTIL SOMETHING COMPUTES IT. Not distrusted. UNVERIFIED.**

> ### **RATIFICATION DOES NOT ADD EVIDENCE; IT ONLY REMOVES REVIEWERS.**

⚠ **AND RATIFICATION IS ONLY THE FIRST TRIGGER WE FOUND, NOT THE CATEGORY.** The general rule is
wider, and stating it wider is what lets the next instance be recognised:

> ### **ANYTHING THAT MAKES RE-EXAMINATION FEEL UNNECESSARY REMOVES REVIEWERS AS EFFECTIVELY AS RATIFICATION DOES — and none of them adds evidence.**

| trigger | why nobody looks again | status |
|---|---|---|
| **a ratified claim** | the ruling *is* the review's output; the author is the last to re-open it | ⛔ **two instances**: ADR-046's constant, ADR-050's accepting ruling |
| **a pleasing result** | a real derivation and a rate-chase are **indistinguishable by their result**; only the process differs, and it leaves no trace in the number | ⛔ **live** — see the derived-boundary corollary below |
| ⛔ **A CORRECT PRIOR STEP** | the previous answer was **right**, so the next question reads as a **continuation** rather than as a new question. **There is no ratification event, no pleasing result, nothing to notice — just a chain of correct answers** | ⛔ **four instances in one week**, descending table → channel → branch → quantity |
| ⛔⛔ **A CORRECTION TO A KNOWN ERROR** — *the most disguised of the four* | *"this is the fix for the thing that was wrong"* carries a plausibility that makes it **LESS likely to be checked, not more**. ⚠ **Scepticism has just been exercised — one step earlier, on the thing being corrected** — and the feeling of having been careful transfers to the repair | ⚠ **live**: a brief's premise failed, and the very next brief's premise was *a claim about that correction*. It held — **but only computing established that** |

> ### ⛔ CONSEQUENCE FOR PRE-REGISTRATION — **THERE ARE TWO KINDS AND ONLY ONE IS SAFE TO SHARE WITH THE DISPATCH**
>
> Both are called *pre-registration*, and the difference is whether the document **names a direction.**
>
> | kind | form | share with the dispatch? |
> |---|---|---|
> | **DISPOSITION** | *"if X then A, if Y then B"* | ✅ **YES, and it should be** — it names **both** outcomes and their consequences, so **there is no direction to steer toward**, and it stops the result from choosing its own interpretation after the fact |
> | ⛔ **EXPECTATION** | *"I think it will be X"* | ⛔ **NO. It supplies the answer.** |
>
> **A pre-registered EXPECTATION handed to the dispatch protects only against POST-HOC AMENDMENT — it
> does nothing against the expectation STEERING THE WORK**, which is the larger risk and the invisible
> one.
>
> > ### **An instinct confirmed by a dispatch that KNEW the instinct is worth less than one confirmed by a dispatch that did not.**
>
> **This is the pleasing-result trigger applied to pre-registration itself**, and withholding costs
> nothing: it converts a possible agreement **from noise into evidence.** ⚠ **Worked instance:** entry
> 71's fork was shared (both branches named, both dispositions stated) and resolved *against* the
> owner's expectation. Entry 75 names a direction and was **withheld** — and the dispatch reached the
> same conclusion independently, **which is the only reason that agreement means anything.**
| a number that **matches a published source** | agreement reads as corroboration, though both sides may share an ancestor | ⚠ predicted, not yet observed here |
| a fix that turns a **red gate green** | green is treated as *resolved* rather than as *no longer failing in the way it failed* | ⚠ predicted |
| a measurement that **agrees with the previous one** | consistency reads as reliability, though two runs sharing a source are not two measurements | ⚠ predicted — and note the one-live-reader corollary is exactly this failure in code |

**Three of these are written down BEFORE they have bitten**, deliberately: the whole lesson of this
register is that a class is larger than the instance that reveals it, so naming the shape in advance
is the only cheap move available.

> ⚠ **THE CORRECT-PRIOR-STEP TRIGGER IS THE HARDEST OF THE THREE TO DEFEND AGAINST, and the defence
> is NOT vigilance.** The alternative to trusting a correct prior step is **re-deriving everything**,
> which is unaffordable and would itself be a new instrument with its own blind spot. **So for this
> trigger the TERMINATION CONDITION matters more than the warning does** — descend until a
> determinant is *a constant, a roll, or an input from outside the subsystem*, and stop there because
> the structure says so, **never because the chain feels settled.**

**Everything below is instance.** **Ratification converts a claim into an assumption, and the author
is the last person who will re-open it.**

A ratified ruling is the artefact **review cannot catch**, because review is *structurally absent* by
the time it exists: the ruling **is** the review's output. Worse, when a ruling is issued by the
authority that reviews rulings, **on a distinction that authority has just drawn**, the drawing of the
distinction *itself reads as evidence that it is being applied.* That is the precise configuration in
which nobody is looking.

**The evidence is two for two in one month, both caught downstream, neither by review:**

| ruling | the claim | how it was caught |
|---|---|---|
| ADR-046's `Need` | quoted `route.opennessGainPerTick = 8`; committed value is **5** — the `8` is a **sibling leaf of the same name** under `scramble.*` | calibration's enforcement sweep, **recomputing the constant** |
| ADR-050's accepting ruling | predicted `RUSHER_WINS_REP` would fall to 10–15% once the tail was a tail | ADR-052's implementer, **computing 31.871% before and after** and finding it **structurally invariant** |

The second is the sharper one: it made **ADR-050's own error** — conflating the tier with the
cumulative band — **inside the ruling that accepted ADR-050**, one dispatch after the distinction was
named. The owner's diagnosis of why it survived is the part worth keeping: **because it was mine and
recent.**

**THE PRACTICAL CONSEQUENCE, and it exists so nobody treats the step as a formality when they are in
a hurry: the implementer who computes a ruling's numbers is not CHECKING the ruling — they are
performing THE ONLY VERIFICATION THAT RULING WILL EVER GET.** Skipping it because the number is
ratified inverts the actual reliability: ratification is the reason it needs computing, not a reason
it does not. **Quoting a ratified number forward is a restated constant with an owner's signature
attached** (ADR-046), and it propagates *further* than an unratified one precisely because nobody
argues with it.

### ⛔ CLAIMS TRAVEL IN TWO DIRECTIONS THROUGH A RATIFICATION, AND ONLY ONE OF THEM IS CATCHABLE

| direction | what moves | the defect | why it survives |
|---|---|---|---|
| **DOWNWARD** — ratified doc → implementation | a ratified **number**, quoted into a brief or a comment | **inherited authority**: a wrong number carries an authority that **outlives its verification** | the number looks decided, so nobody recomputes it |
| **UPWARD** — dispatch report → ratified doc | an **unverified implementation claim**, written into an ADR | **acquired authority**: the claim gains, at the moment of ratification, an authority **it never had** | ⛔ **the provenance disappears** |

**The upward case is strictly harder, and the reason is structural rather than a matter of care.** A
ratified ADR **looks identical whether its claims were derived or transcribed from a dispatch
report** — and by the time anyone reads it, the report is a scroll-back. Every subsequent citation
then treats **the ADR as the source**, when the ADR was only the first place the claim was written
down. The chain that would let a reader check it is gone, and nothing about the document indicates
that it ever existed.

Both directions have now fired, within one month, on the same ADR:

- **downward** — ADR-046's quoted constant, and ADR-050's accepting ruling (the table above);
- **upward** — ADR-053 §6 named four tables as `PocketStatus`-keyed. Only three are. The fourth,
  `minimumStatusByBand`, is keyed by `PassRushBandLabel` with `PocketStatus` merely as its *values*.
  The claim came from an implementer's report and was carried into the ADR **without the table's
  shape ever being checked**. Had it not been caught, the mapped type would have constrained **the
  wrong axis** — a guard that compiles, reads as coverage, and checks a property the table does not
  have.

> #### **THE PRACTICAL RULE: AN ADR THAT QUOTES AN IMPLEMENTATION CLAIM MUST CITE WHERE IT CAME FROM, AND WHETHER IT WAS COMPUTED OR REPORTED.**
>
> **This is not verification. It is PROVENANCE** — and it is cheap precisely because it does not
> pretend to be verification. It costs a clause; it buys a reader the ability to know **which claims
> in a ratified document have never been checked**. Without it, a derived claim and a transcribed one
> are typographically indistinguishable forever after.

**Corollary — ASK THE PRIOR QUESTION OF A NEW INSTRUMENT ON THE DAY IT SHIPS, NOT ON THE DAY
SOMETHING SLIPS PAST IT.**

> ### **A rule keeps being strengthened by the exact thing it was written to catch — and that pattern is itself the evidence.**

Count them. Each of these is a guard **improved by an instance of its own subject**:

| the rule | what later slipped past it |
|---|---|
| *derive the check from the thing it checks* | the band-table exemption list — **hand-enumerated, three of six wrong** |
| ADR-036, *an absence must look like an absence* | `CATCH_RESOLUTION`'s comment naming the wrong quantity (ADR-044) |
| the audit-priority corollary | ADR-050's accepting ruling, **making ADR-050's own error** |
| the referent extension | a brief that **conflated two ladders**, in the dispatch about a ladder conflation |
| ADR-038, *a command that checks less than its name implies* | **its own gate**: declaration checked, execution not — and `pnpm -r build` failing unnoticed |

**This is not bad luck and it is not irony. It is what a real defect class looks like from inside:**
the rule is written the first time the class is *seen*, and the class is larger than the instance
that revealed it — so the next instance lands **in the rule's own blind spot**, which is the one
place nobody re-examines *because a rule now exists there.*

> ### ⛔⛔ THE CLEAREST EVIDENCE THAT RULES DO NOT APPLY THEMSELVES: THE INSTRUCTION AND ITS VIOLATION IN THE SAME MESSAGE.
>
> A brief instructed a dispatch: ***"derive the set; do not list it — a hand-enumerated list is the
> thing this project has been wrong about every single time it has been checked."*** **The same brief
> then handed over a hand-carried list of two, quoted from a previous report. The derivation found
> three.**
>
> ⚠ **Knowing the rule, stating the rule, and citing the reason for the rule provided NO protection
> against the thing the rule forbids** — in the same message, within a few lines of each other.
>
> **⇒ This is the strongest available form of *naming a trap does not exempt the next decision from
> it*.** The usual case is a rule violated later, elsewhere, by someone who may not have read it.
> **Here the author had just written it down.** ⛔ **So the defence is never awareness — it is the
> mechanical step: derive, compute, enumerate to the leaves.** ⚠ **Awareness is what produced the
> instruction; it did not produce compliance.**
>
> #### ⚠ THE QUALIFIER, WITHOUT WHICH THIS READS AS AN ARGUMENT AGAINST WRITING RULES AT ALL
>
> > ### **Awareness sets the mechanism. The mechanism does the work.**
>
> **Every mechanical step in this document exists BECAUSE someone was aware of a class** — the premise
> ledger, the compile-error helper with no default, the provenance field, the red-trigger field, the
> monotonicity gate. ⛔ **None of them would exist without the awareness that produced them.**
>
> **What the ninth case proves is narrower and more useful: awareness is NECESSARY and
> NON-TRANSFERABLE TO THE MOMENT OF ACTION.** ⚠ **The failure is not in knowing. It is in expecting
> knowledge to be present at the point where it is needed** — which is a point the knower does not
> control, and often does not notice passing.
>
> **⇒ WHICH IS WHY EVERY GOOD RULE HERE HAS THE SAME SHAPE: it converts a thing you must REMEMBER
> into a thing you cannot SKIP.** A field on a form. A parameter with no default. A gate that reddens.
> ⚠ **A rule that still requires remembering at the moment of action has not been converted yet — it
> is an intention with a citation.**
>
> #### 📋 OWED — RUN THAT CRITERION OVER THIS REGISTER. **THREE BUCKETS, NOT TWO.**
>
> | bucket | meaning | what it is |
> |---|---|---|
> | ✅ **CONVERTED** | a field, a parameter with no default, a gate that reddens | done |
> | ⚠ **CONVERTIBLE** | **a mechanism exists in principle and nobody has built it** | ⛔ **a backlog** |
> | 🚫 **IRREDUCIBLE** | **no mechanism is possible** — the doc→table reading, the three-faced value-vs-intent surface | **honest, and already named as such** |
>
> ⛔ **The two-bucket version is the trap:** it makes *convertible* and *irreducible* look alike, and
> **the entries that fail the criterion are not WRONG — they are UNCONVERTED.** ⚠ **Each convertible
> entry is a candidate for a mechanism that does not exist yet**, which is why the middle bucket is
> the output that matters. **Knowing WHICH fail is worth more than knowing how many.**
>
> ⇒ **Run it at a natural break. Pair it with the red-trigger retrofit sweep** — same pass, same
> reading, and both partition this document by what enforces itself.

> ⛔ **THE OPERATIVE FORM: an instrument's blind spot must be written down BY ITS AUTHOR, WHILE THEY
> ARE BUILDING IT.** Entry 55's *"what would make this go red?"* field exists for exactly this, and it
> works — but only for instruments built after it. **Every instrument that predates the field has an
> unwritten blind spot**, and ADR-038 is the proof: it stated its subject honestly (*"verifies a
> script is declared, not that it does anything"*) and then guessed wrong about the residual risk in
> the very next clause, because nothing forced it to name the failing case it was choosing not to
> cover.

### ⛔ AND THE DEFECT WAS NOT THE BOUNDARY. IT WAS THE REASSURANCE ATTACHED TO THE BOUNDARY.

> **A gate that says *"I do not cover X"* is honest. A gate that says *"I do not cover X, and X fails
> loudly elsewhere"* has made a claim about ELSEWHERE — and nothing checks elsewhere.**

ADR-038 drew its line correctly and then added *"a lying script is a different failure, and a loud,
reviewable one."* That clause **assumed something invokes the script.** Nothing did, and:

> ### **An uninvoked script's failure is exactly as silent as a missing one — and the gate reports both states identically.**

> ### ⛔ SEVEN PREMISE FAILURES IN TWO WEEKS, AND THE SAMPLE IS NOW LARGE ENOUGH TO INVERT WHAT COUNTS AS A SIGNAL.
>
> **Every one was a claim written into a brief from a document or a reading. Every one was caught by
> someone COMPUTING rather than REVIEWING. NONE was caught by care.**
>
> **⇒ So an individual instance has stopped being notable, and the thing worth noticing is now the
> opposite: A DISPATCH THAT REPORTS NO CAUGHT PREMISE FAILURE.** ⚠ That is not evidence the brief was
> clean — **at this base rate it is more likely evidence the premises were not checked**, and it
> should prompt the question rather than pass without comment.
>
> **This is the count-blindness reflex applied to a process rather than to a register:** *"seven
> caught"* reads as a problem; **the rate is the finding, and the rate makes silence the anomaly.**
>
> #### ⛔ GUARD ON THE INVERSION — IT HAS A CHEAP FAILURE MODE, AND IT IS THE ONE THIS PROJECT KEEPS NAMING
>
> **If a clean report becomes the anomaly, the cheapest way to satisfy the expectation is to report
> something trivial found in passing.** That is the **artefact-exists-because-it-was-demanded** shape
> — a fixture manufactured to produce a measurable population, an instrument built to make a brief
> true — **arriving at a REPORT.**
>
> ⛔ **SO THE QUESTION ASKED AGAINST SILENCE IS NOT *"did you find one?"*** — which creates exactly
> that pressure — **but:**
>
> > ### **"WHICH PREMISES DID YOU COMPUTE, AND WHAT DID THEY COME OUT AS?"**
>
> | report | reading |
> |---|---|
> | lists premises verified, **all confirming** | ✅ **a clean result** — and a real one |
> | ⛔ **silent about premises** | **the anomaly** — the premises were probably not checked |
>
> **That distinguishes a clean brief from an unchecked one WITHOUT creating pressure to manufacture a
> finding.** ⚠ The signal was never *"a failure was found"*; it is *"the premises were computed."*
> **Confirmation is a result, and it only counts when it is reported as one.**
>
> #### ✅ AND THIS IS WHY THE LEDGER IS UNCONDITIONAL RATHER THAN DISCIPLINED
>
> **Establishing that a premise HELD cost one file read. Catching a ninth failure would have cost the
> same one file read.**
>
> > ### **A check whose confirming and disconfirming cases cost the SAME has no threshold to reason about.**
>
> ⚠ **There is nothing to triage.** Every argument for applying it selectively — *"this brief looks
> routine"*, *"this is only a correction"*, *"the risky one was last time"* — **is reasoning about a
> cost that does not vary.** ⛔ **And the selection criterion would be the thing this project has
> already measured as uncorrelated with failure: the briefs that failed were not the ones that felt
> risky.**

**⇒ SO THE RED-TRIGGER FIELD HAS TWO HALVES, AND THE SECOND IS A PROHIBITION:**

1. **State what the instrument does NOT redden for.** The negative half is where the next instance
   lands.
2. ⛔ **Do NOT assert what happens to it instead — unless something enforces that.** A comforting
   sentence about coverage-elsewhere is an **unguarded claim inside a guard's own documentation**, and
   it reads with the guard's authority. If the fallback is real, *name the thing that provides it*; if
   it is a hope, **say nothing.**

**⇒ AND THE PRIOR QUESTION AIMED AT THE RULE ITSELF, which is the actionable form of this whole
corollary: WHEN A RULE IS WRITTEN, ASK WHAT PART OF ITS CLASS IT DOES NOT COVER.** It will not catch
everything — the entire mechanism is that the class exceeds what is visible from the instance that
revealed it. **But it converts *"we will find out"* into *"here is what we know we have not
covered"*, which is the difference between a blind spot and a recorded gap.**

**⇒ OWED, AND PERIODIC RATHER THAN ONE-TIME: the retrofit sweep.** Add the red-trigger field to every
instrument that predates it, stated in both directions. **The periodicity is not administrative — it
follows from the mechanism.** ⚠ **The rules in this document are not accumulating because we keep
finding NEW classes. They accumulate because EACH RULE CREATES THE REGION WHERE THE NEXT INSTANCE
HIDES.** That predicts the growth continues, and a sweep run once would itself become an instrument
with an unwritten blind spot.

> #### ⛔ THE SWEEP'S OWN RED-TRIGGER FIELD — PRE-REGISTERED HERE, BEFORE IT SHIPS
>
> Written now rather than discovered as instance six, because this corollary predicts exactly where
> instance six would land: **in the sweep.**
>
> **It reddens for:** an instrument with **no** red-trigger field.
>
> ⚠ **It does NOT redden for: a red-trigger field that names the WRONG SUBJECT.** A sweep over
> *presence* can only find **missing** fields, never **wrong** ones — and a red-trigger describing a
> subject the instrument does not actually have is **the referent problem arriving at the very field
> designed to prevent it**: a fluent, specific, checkable answer to *"what would make this go red?"*,
> about the wrong thing. **Nothing enforces correctness here** (per the prohibition above, that is
> stated rather than papered over with a claim about review).
>
> **Which is why the field must be written by the instrument's AUTHOR, at build time.** A sweep can
> only ever establish that *someone answered the question*. **Only the author can answer it about the
> right subject**, and only while they still remember what they chose not to cover.

**Corollary — ⛔ EVERY INSTRUMENT HERE CHECKS THE CORPUS AGAINST ITSELF. NONE CHECKS IT AGAINST THE
THING IT CLAIMS TO MODEL.**

> ### **This register is scrupulous about internal consistency and silent at exactly one boundary — SIM VERSUS REAL — and that silence is where an error lived undetected for the length of a phase.**

⚠ **Recorded August 2026 from an EXTERNAL cold read of the repo.** ⛔ **The strong factual form is under
verification and this entry will be amended beside, not rewritten, when that reports.** **The
structural observation stands on its own and is why it is recorded now.**

**Read the register's own instruments and the pattern is unmistakable:**

| instrument | what it compares |
|---|---|
| the doc-conformance register | cells **against the doc** |
| the band-table gate | a table **against its own ordering** |
| identity checks | a reconstruction **against the engine's own stream** |
| the monotonicity gate | a ladder **against its own occupancy** |
| provenance / red-trigger / premise ledger | claims **against their own derivations** |
| the ruling-search | a cell **against our own prior rulings** |

⛔ **Every one is a closure check. Not one of them can fail because the model is wrong about
football** — **only because the model is inconsistent with itself.**

**⇒ AND THAT IS EXACTLY THE SURFACE WHERE THIS PROJECT'S HARDEST-WON DISCIPLINES DO NOT REACH.**
*Compute-don't-transcribe*, *derive-don't-restate*, *what-reads-this* — ⚠ **all of them make the corpus
more coherent, and NONE of them makes it more correct about the sport.** A perfectly self-consistent
model of the wrong quantity **passes every gate in this document.**

> ⛔ **THE OPERATIVE QUESTION, AND IT HAS NO INSTRUMENT: DOES THE SIM SIDE OF THIS METRIC COUNT THE
> SAME EVENT THE REAL SIDE COUNTS?** ⚠ **A metric with a real-world column asserts a comparability
> claim, and that claim is the one thing here nothing checks.**

**⇒ Any metric carrying a real-side comparison owes a PROVENANCE ROW FOR THE COMPARABILITY ITSELF** —
what the real column charters, what the sim column counts, and **why those are the same event.**
⚠ **Absent that, a green cell is a statement about arithmetic, not about football.**

**Corollary — WHEN A SWEEP AND A CENSUS COST THE SAME, RUN THE CENSUS.**

> ### **A sweep can only answer the question it was aimed at. A census reports the shape of a population, INCLUDING THE PARTS NOBODY ASKED ABOUT.**

**This is a method preference earned by observation, not by theory. Twice now, a census has produced
the dispatch's most valuable finding WHILE ANSWERING A DIFFERENT QUESTION:**

| dispatch | what it was asked | ⛔ what it found |
|---|---|---|
| entry 76's channel sweep | *is the horizon a lever?* (**no** — 4% of the gap) | **`POS_INF` is not correct football** — a relational defect |
| entry 82's population census | *is the threat population saturated?* (**no**) | ⛔ **`1.5 < 2.0` makes 20.809% of ticks dirty by arithmetic** |

**In both cases the ANSWER to the question asked was a refusal, and the finding was a by-product.**

⚠ **And it is the closest thing this project has to a mitigation for the relational-defect class
above** — ⛔ **not an instrument that FINDS such defects, but a habit that keeps STUMBLING INTO them.**
That is worth preferring deliberately, precisely because the class has **no path to elimination.**

**⇒ The operational form: when the marginal cost is comparable, prefer the measurement that DESCRIBES
A POPULATION over the one that PRICES A CHANGE.** ⚠ A sweep's output is bounded by its hypothesis; a
census's is not.

**Corollary — A COUNTERFACTUAL CAN PRICE A RULE THAT CANNOT EXIST. THE MEASUREMENT IS SOUND, THE
ARITHMETIC CLOSES, AND THE SUBJECT IS UNIMPLEMENTABLE.**

> ### **A reconstruction has the WHOLE STREAM. A live rule has the PRESENT TICK.**

**The instance.** Ruling 2's TIME retirement was priced at **`+6.568pp`** by a post-hoc reclassifier
that compared each threat's ETA against ***that play's own actual resolution tick*** — ⛔ **a quantity
knowable only AFTER the play ends.** A live rule cannot do that causally; it can only compare against
the play's **fixed outer ceiling** (`clock.maxTick`). **Two different rules.** The implementable one
fires on **0.0125% of plays.**

⚠ **Nothing in the number showed it.** The reclassifier was correct, the identity falsifier was
`0 of 517,753`, the arithmetic closed. **The figure was a sound measurement OF AN ORACLE.**

### ⇒ THE THIRD VARIETY OF *"A PRICE THAT DOES NOT MEAN WHAT IT APPEARS TO"*

| variety | what was wrong | worked case |
|---|---|---|
| **the metric could not see it** | `pressure_rate` is blind to `COLLAPSING → PRESSURE` | backlog entry 67 |
| **the subject was two things** | an average over mechanisms differing 22:1 | backlog entry 80 |
| ⛔ **the subject cannot exist** | the rule priced needs information unavailable when it must fire | **this** |

> ### ⛔ **THE COMMON PROPERTY IS THE GATE, AND IT OUTRANKS THE THREE QUESTIONS: A PRICE CAN BE HONEST, REPRODUCIBLE, AND ABOUT SOMETHING OTHER THAN WHAT THE READER WILL TAKE IT TO BE.**
>
> **Every one of the three is honest.** No arithmetic was wrong, no run was contaminated, no report
> overclaimed. ⚠ **The failure is entirely in the gap between what was measured and what it will be
> read as** — and that gap is invisible from inside the number.
>
> **⇒ A DISPATCH MUST MEET THIS SENTENCE BEFORE IT PRICES ANYTHING**, and it is a **better gate than
> any of the three questions individually** — because **a fourth variety we have not seen yet still
> fails it.** ⛔ The three questions are the known instances; **the sentence is the class.**

**All three produce a number that is honest, reproducible, and about something other than what the
reader will take it to be.**

> ⛔ **THE THIRD PRE-DISPATCH QUESTION, AND IT IS THE CHEAPEST OF THE THREE: CAN THE RULE BEING PRICED
> BE EVALUATED WITH INFORMATION AVAILABLE AT THE MOMENT IT MUST FIRE?**
>
> ⚠ **Any counterfactual computed over a COMPLETED play must state which quantities it used that the
> engine would not have had.** Terminal tick, final outcome, whether a throw eventually happened —
> each is free to a reconstruction and unavailable to a decision.

### ✅ AND THE DISPOSITION CHOICE — NOT THE FOOTBALL — IS WHAT SAVED THE RULING

**TIME retirement was ruled as CORRECTNESS, with the football standing alone and the size explicitly
not the justification.** ⇒ **When the size evaporated, the ruling survived unchanged.**

> ⛔ **HAD IT BEEN RULED AS A LEVER, IT WOULD NOW BE VOID** — ratified on a number about a rule that
> cannot be built.

⚠ **That makes the correctness-versus-lever distinction LOAD-BEARING rather than procedural.** It is
not a way of describing a change; **it determines what happens to the change when its number turns
out to be wrong** — and on this subsystem, numbers have turned out wrong three times in three
different ways.

**Corollary — A REPAIR THAT REMOVES THE SYMPTOM ALSO REMOVES THE RECORD THAT THERE WAS ONE.**

> ### **This is log-don't-smooth arriving at the act of FIXING rather than the act of REPORTING.**

**Every one of these is the available cheap path, defensible in the moment, and leaves the repo with
no evidence anything was ever wrong:**

| the repair | what it consumes |
|---|---|
| **widening an assertion** until it passes | the record that the assertion once excluded that state — *"a beaten tackle stays beaten"* is now weaker than its name, and nothing says so |
| **re-pointing a census pin** without re-deriving its set | the record that a population changed, and **which** one |
| **deleting a stale artefact** | the evidence the defect was ever possible — so a future change reintroduces it silently |
| **silently updating a comment** | the reason anyone believed the old thing, which is usually the useful half |

⛔ **THE COMMON PROPERTY: the repair is indistinguishable, afterwards, from a state where the problem
never existed.** The symptom and its record are the same artefact, so removing one removes both.

> **⇒ THE RULE: a repair leaves BEHIND what it fixed — as a struck line, a converted assertion, a
> named exception with its control, or a comment saying what used to be true and why.** ⚠ **The test
> is not *"is the tree correct now?"* but *"can a reader tell it was ever otherwise?"***

**This is why the backlog strikes lines rather than editing them, why ADR-033 keeps *"a one-point edge
on a hundred-point scale is not a disturbed platform"*, and why the superseded modal-`CRITICAL` claim
stayed in `ladderOccupancy`'s prose.** ⚠ **In every case the correction alone would have been shorter,
correct, and would have destroyed the reason.**

**Corollary — AN EXCEPTION ADDED TO A FAILING ASSERTION NEEDS A POSITIVE CONTROL THAT THE EXCEPTION'S
STATE IS REACHABLE. WITHOUT ONE, THE EXCEPTION IS INDISTINGUISHABLE FROM A SUPPRESSION.**

> ### **A valve added because a test failed, and a valve papering over a regression, produce the identical diff and the identical green.**

**The only thing that separates them is evidence that the state the exception admits ACTUALLY OCCURS.**

**The worked case.** Bounding the arrival horizon at `2.0` broke a pre-existing integration test
asserting *"a beaten tackle stays beaten."* The failure was **real football**:
`pocketMovement.stepUp.edgeThreatDelaySeconds` (1.0s) **stacks** with a §7.1 contain delay (0.5s) in
one tick and can push a **live, un-reset** EDGE threat past 2.0s — so it reads `CLEAN` **with no reset
event.** A rusher who beat his man, got delayed twice, and is now genuinely too far away to matter,
**which is what a horizon is for.**

**The fix added a third escape valve to the assertion — AND a positive control proving that state is
reachable.** ⚠ **Without the control, *"a beaten tackle stays beaten"* would have been weakened by
assertion**, and nothing in the repo could tell the difference afterwards.

> ⛔ **THE RULE: every exception carries its own reachability proof, in the same change.** The
> exception says *"this state is legitimate"*; the control says *"and it happens."* **The first
> without the second is a claim; the pair is a finding.**

### ✅ AND IT RUNS IN THE OTHER DIRECTION — **AN OLD CONTROL REFUSING A NEW CLAIM.** First instance, July 2026.

**The discipline above is designed forward: a NEW control proving a NEW exception is reachable.**
⚠ **This is the reverse, and nobody designs for it.**

**ADR-055's implementation drafted `pursuitForcesDecision` as UNCONDITIONALLY true**, reasoning that
*"`nextReadable` already replaces the progression the instant `scramble` is defined."* ⛔ **Not wrong
on its own terms — TOO STRONG.**

**It broke a protected invariant that had nothing to do with the change:**
`pressureMetrics.test.ts`'s ***"a MISSED blitz is more dangerous than a seen one, and than no blitz at
all"*** — by letting missed-blitz scrambles complete or check down instead of being run down.

> ### **A finding protected years-of-dispatches earlier refused a premise written today.**

**The premise was then isolated empirically** (toggling accuracy against the forcing condition),
**corrected to a zero-new-magnitude form**, and ⛔ **the wrong premise was RECORDED IN CODE rather than
silently narrowed** — per the repair-consumes-evidence corollary.

**⇒ THE STANDING VALUE THIS DEMONSTRATES: a protected finding is not only a regression guard on the
thing it names. It is a CONSTRAINT ON FUTURE CLAIMS ANYWHERE THAT CAN REACH IT** — and it pays out
without anyone anticipating the reach. ⚠ **That is an argument for protecting findings that look
narrow**, since their value is in the claims they will refuse, **not in the regressions they will
catch.**

⚠ **And note which direction the cheap path runs:** widening an assertion until it passes is always
available, always defensible in the moment, and **leaves no trace that the assertion is now weaker
than its name.** That is the same shape as re-pointing a census pin without re-deriving its set.

**Corollary — *"IS THIS A LEVER?"* AND *"IS THIS CORRECT?"* ARE DIFFERENT QUESTIONS, AND ANSWERING THE
FIRST SILENTLY CLOSES THE SECOND.**

> ### **We ran a full sweep to refuse a lever, and the football answer was available the whole time from a ruling we had already made one channel over.**
>
> **A refused lever leaves its football question UNASKED — and the refusal reads like an answer to it.**

⛔ **AND THE SHARPER HALF IS NOT THAT THE QUESTION WENT UNASKED. IT IS THAT THE ANSWER WAS ALREADY IN
THE CORPUS, ONE ADR AWAY, AND NOTHING CONNECTED THEM.** ADR-032 ruled *gaining ground is not
pressure* and removed a floor that carried no information. `POS_INF` is the identical error in the
adjacent channel. **ADR-032 was correct, ratified, and INERT with respect to the identical case next
door** — which is the **absorbed finding** (below) arriving at a *ruling* rather than at a
measurement.

> ⇒ **SO THE CHEAP FIRST PASS, BEFORE ANY FOOTBALL ARGUMENT FROM SCRATCH: for each committed value,
> ask whether a RATIFIED RULING ELSEWHERE ALREADY DECIDES IT.** It is faster than reasoning from the
> football, and **it is how this one would have been caught.** ⚠ A ruling's reach is almost never
> recorded at the cells it implies — only at the cell that provoked it.

### ⛔⛔ CORRECTED — THERE ARE **TWO** FAILURES HERE, AND THEY NEED DIFFERENT FIXES

**The diagnosis above is about IMPLICATIONS. Running the search found something worse and simpler.**

| failure | what happened | the fix |
|---|---|---|
| **the implication** | ADR-032's reasoning reached the arrival horizon; **it never named it**, so nothing connected them | ⚠ **prospective** — the ADR form's *implied scope* field, naming what a ruling reaches but does not change |
| ⛔ **THE DIRECT HIT** | **ADR-033 ruled ON THE EXACT CELL** — named, dated, approved 2026-07-29, implemented, tested — **and nothing in eight subsequent dispatches looked it up** | ⛔ **a LOOKUP before any lever is proposed** |

> ### **The first needed an inference nobody drew. The second needed a grep nobody ran. THE FAILURE WAS NOT ASKING.**

⚠ **And the base rate settles the priority: the search was run over four "refused levers" and returned
FOUR FOR FOUR already decided.** ⛔ **Not one survived to need a football argument.**

> **⇒ SO IT IS A REQUIRED STEP, NOT A DIAGNOSTIC APPLIED AFTER FOUR DISPATCHES: any brief proposing to
> move a committed value STATES WHETHER THE CELL HAS A RULING, WITH THE SEARCH SHOWN.** ⚠ **One grep.
> Assume the answer is YES until the search says otherwise.**

**A lever is refused on a number.** The refusal is recorded, the queue moves on, and **the cell keeps
its value** — not because anyone judged the value correct, but because **nothing in a lever refusal is
about correctness at all.**

**The worked case.** 1e swept `arrival.pressureWithinSeconds` and refused it: **−2.440pp against a
60.6pp gap**, ~4% of the gap, not the pressure lever. Correct, and it settled one question while
leaving the other untouched:

| question | 1e's answer |
|---|---|
| is the horizon a **LEVER** for `pressure_rate`? | ✅ **answered — no** |
| ⛔ is `POS_INF` **CORRECT FOOTBALL**? | ⛔ **never asked** |

**And the second answer was obvious once stated:** `POS_INF` means **there is no horizon at all** — a
rusher four seconds away and a rusher arriving next tick are the same fact to that channel. *"That is
not a pressure model, it is a presence model."* ⚠ **The same ruling as ADR-032 one channel over**, and
**consistency alone would have settled it without any measurement.**

> ⛔ **THE OPERATIVE FORM: when a lever is refused, ASK EXPLICITLY WHETHER ITS CURRENT VALUE IS RIGHT.**
> The sweep answered *"moving this does not help"*, which is **not** *"where it sits is correct."* The
> two are trivially separable and are constantly conflated, **because a refusal feels like a
> disposition of the whole subject.**

**⇒ AND FOUR REFUSALS ON THIS SUBSYSTEM ARE NOW CANDIDATES FOR THE SAME RE-READING** —
`blockerStructuralAdvantage`, `freeRunnerArrivalSeconds`, `RUSHER_GAINING`'s band map, and entry 40's
supply arms. **Each was refused as a lever. None was ever asked whether its committed value is
football.** ⚠ That is a *re-reading*, not a re-run: the question is answerable from the doc and the
code.

**Corollary — A RE-POINT IS NOT A RE-COUNT. AND AN UNCHANGED COUNT CAN BE THE EVIDENCE THAT A FIX WAS
RIGHT — which inverts how a count normally reads.**

> ### **Two identical numbers, two completely different states: one because nothing was examined, one because the examination concluded nothing should move.**

**The worked case.** A new tunable leaf reddened four `docConformance` pins, including
`classifiedUniform 281 → 282`. The available fix was **`281 → 282` → green → done.**

⛔ **That would have been WRONG, and green.** The cell had no narrow rule and fell through to the
`arrival.*` catch-all, whose note reads *"the doc has no arrival model … every number in this block is
engine structure filling that gap"* — **false of a cell that now has a dedicated, ratified,
multi-paragraph derivation naming it directly.** ADR-048's and entry 51's exact shape: **a catch-all
classifying a cell with a note untrue of it, green throughout.**

**The correct fix — a narrow rule above the catch-all — left `classifiedUniform` at 281 and the
absorption row at 18.** Not by leaving them alone. **Because the cell no longer belongs to that
rule.**

> ⛔ **SO THE ARITHMETIC BEING UNCHANGED WAS EVIDENCE THE FIX WAS RIGHT.** A moved count normally
> reads as *"work happened"*; here **an unmoved count was the proof that the work happened
> correctly**, and a moved one would have been the symptom.

**⇒ THE OPERATIVE TEST when a census pin reddens: ask WHICH POPULATION CHANGED, not by how much.** A
pin is a cardinality over a *set*; **re-pointing the number without re-deriving the set is the
count-blindness corollary arriving at the repair rather than at the original measurement.** ⚠ And it
is the cheaper of the two paths, always — which is why it needs naming rather than trusting.

**Corollary — A DELIBERATE DUPLICATION NEEDS A THREE-CLAUSE COMMENT AT BOTH COPIES, AND THE THIRD
CLAUSE IS THE ONLY ONE THAT STOPS THE "FIX".**

> ### **Two implementations of one function are, to any future reader, an invitation to consolidate — and consolidating silently converts an identity check into a tautology.**

**Two instances now, and both needed the identical treatment:**

| duplication | what it buys |
|---|---|
| entry 70's **seed labels** (`pcs-` / `phcs-`) | agreement between two harnesses is **cross-validation**, not an echo |
| `calibration`'s copy of **`pocketFloorFromArrival`** | agreement between reconstruction and engine is **evidence the reconstruction is correct** |

**The three clauses, at BOTH copies, each naming the other:**

1. **WHAT it duplicates** — the file and the symbol.
2. **THAT it is deliberate** — not drift, not an oversight.
3. ⛔ **WHAT THE DUPLICATION BUYS.** ⚠ **Without this, the first two read as an accident somebody
   chose not to clean up** — and a tidy-minded reader has every reason to merge them.

**And state that DIVERGENCE IS EXPECTED TO REDDEN** — that is the mechanism working, not a
maintenance burden. ⚠ **The cost of keeping the copies in step IS THE PRICE OF THE PROPERTY, never a
defect in it.**

> **This project has now paid for the two-independent-arms property in THREE MEDIA — code
> (`ladderTail`'s live reader), seeds (entry 70), and citation (ADR-046's quoted constant). Each time
> the tidier option destroyed it, and each time the tidier option looked like an improvement.**

> ### ⛔ AND THAT IS NOT A COINCIDENCE: **INDEPENDENCE ALWAYS LOOKS LIKE DUPLICATION FROM THE INSIDE, BECAUSE THE TWO ARMS GENUINELY DO THE SAME THING.**
>
> A reconstruction that agrees with the engine **is** redundant, in the only sense visible from the
> code. Two seed lists that produce the same shares **are** doing one job twice. **There is no
> structural signal that separates deliberate independence from accidental redundancy** — the arms are
> identical in behaviour, which is the whole point of having two.
>
> ⚠ **So the ONLY thing distinguishing them is the comment — which is why the third clause carries the
> entire weight, and why omitting it is not a documentation lapse but the removal of the single
> distinguishing feature.**
>
> **⇒ PREDICTION ON RECORD: this will recur, and it will recur LOOKING LIKE HOUSEKEEPING.** Not as a
> proposal to weaken a check — as a tidy-up, by someone competent, with a clean diff.

**Corollary — EXTENDING A VOCABULARY IS WIDEN-OR-ADD, AND IT NEEDS THE SAME SURVEY. A SURVEYED
EXTENSION IS A PRACTICE; AN UNSURVEYED ONE IS DRIFT — AND THEY ARE INDISTINGUISHABLE A MONTH LATER.**

> ### **Check whether an existing term fits BEFORE proposing another. Write the survey down. Flag the proposal as a proposal. Instruct the next case to reuse it.**

**This is Charter §4's widen-or-add rule applied to the vocabularies documents use about themselves** —
annotation markers, register categories, status labels — **and it matters for the same reason it
matters in types: a term added because the nearest one *felt* wrong is indistinguishable, afterwards,
from a term added because none fits.** Only the survey separates them, and **only if it was written
down at the time.**

**The worked instance:** `docs/design/match-engine.md` needed a provenance marker for a mechanic whose
*parameter* was derived though its *existence* was ruled. The dispatch **enumerated every existing
annotation** — `AMENDMENT`, `KNOWN ISSUE`, `AUTHORING CORRECTION`, and Appendix C's unrelated
`DERIVED, NOT AUTHORITATIVE` — **said why each did not fit**, proposed `DERIVED MECHANIC`, marked it
**PROPOSED CONVENTION, first use**, and **instructed the next case to reuse it rather than invent a
fifth.** Ratified on that basis.

**The four steps, and the last two are the ones that get dropped:**

1. **Enumerate the existing terms and say why each does not fit** — one line each. ⚠ **The enumeration
   IS the evidence that the addition was necessary rather than convenient.**
2. **Propose; do not adopt.** It goes to ratification like any other petition.
3. ⛔ **Instruct the next case to REUSE it.** Without this, every subsequent author faces the same
   empty vocabulary and adds a fifth.
4. ⚠ **The null result is equally valuable: *"I surveyed and `X` fits"* is a complete, good, and MORE
   LIKELY answer.** ⛔ **Do not manufacture a term to demonstrate rigour** — that is the fourth shape
   arriving at a vocabulary.

**Corollary — THE ABSORBED FINDING: A CORRECT MEASUREMENT CAN BE MADE INERT BY ITS DELIVERY MEDIUM.**

> ### **A finding in a document is available to whoever reads that document. A metric is available to everyone who runs anything.**

**The worked example is exact, and it cost five dispatches.** ADR-049 §2 measured the pocket's
severity shift under the supply lever and stated the conclusion in its own words — ***"COLLAPSING
falls by 39 points and PRESSURE rises by 48, and CLEAN does not move at all."*** Correct, ratified,
published.

**And it changed nothing.** Because it was **a table inside one ADR rather than a row in the metric
library**, it explained *that arm* and transferred to *nothing*. Four further levers were then priced
on `pressure_rate` alone — a metric **structurally blind to exactly what that table showed** (63.6%
of arrival's COLLAPSING work, 94.2% of the band floor's).

> ⛔ **THE PROJECT DID NOT LACK THE INFORMATION. It had it, in a ratified document, correctly stated —
> and the delivery medium made it INERT.**

**⇒ This is the ABSORBED-MECHANIC class (entry 64) arriving at a FINDING**: a correct thing that
produces no observable effect downstream, not because it is wrong but because **nothing consumes
it.** Three victims of one shape now — an absorbed *mechanic* (the engine implements it and nothing
is observable), an absorbed *lever* (it moves the game and the metric cannot see it), and an absorbed
*finding* (it is measured and recorded and nothing reuses it).

> ### ⛔ AND IT SCALES ALL THE WAY DOWN TO A CODE COMMENT — the same shape, one medium lower.
>
> A test in `geometryTimeRetirement.test.ts` carried the comment ***"real stream would still be dirty
> in practice; not asserted here."*** **Correct. Honest. Recorded AT THE SITE. And inert for its
> entire life** — the test published a `POCKET_STATUS` that disagreed with the reconstruction by
> **two** mismatches, and nothing noticed, **because nothing reads a comment.**
>
> ⚠ **It was found by a DERIVATION over the file's own source**, not by anyone reading it — which is
> the point. **The author declared the gap in the only medium available at the moment they saw it,
> and that medium has no consumer.**
>
> **⇒ Same anatomy as ADR-049's severity table sitting inert in one ADR, one medium down: a correct
> observation recorded where nothing can act on it.** ⛔ **Declaring a gap in prose is not covering it.
> It is a note that the gap exists, addressed to nobody.**
>
> #### ⛔ AND THE TEST APPLIES REFLEXIVELY — ***WHAT READS THIS?*** ASKED OF OUR OWN RECORDS. SOME ANSWER "NOTHING."
>
> **This register, the backlog's honest gaps, the named residuals — all prose, all addressed to
> whoever happens to arrive.** ⚠ **Being TRUE and being RECORDED AT THE RIGHT PLACE does not make a
> note reachable.**
>
> **The distinction that saves one and not another is whether something ROUTES THE READER THERE:**
>
> | record | reach |
> |---|---|
> | `reclassifyGame`'s named residual | ⛔ **stated in a place a future importer will not look** — reachable only by someone already reading the file that names it |
> | the `replay` helper's missing default | ✅ **a compile error in a place they cannot avoid** |
>
> **Same information. Different reach. Only one of them is a guard.**
>
> ⇒ **So the honest-gap standard has a second clause: a recorded gap is worth more than a partial
> closure — AND a recorded gap that nothing routes to is worth less than it appears.** ⚠ **Record it
> anyway; the alternative is worse. But do not count it as coverage**, and where the gap can be routed
> to instead of merely named, **route it.**

> ### ⛔ AND AN ABSORBED MECHANIC CAN HIDE A TRANSCRIPTION DEFECT INSIDE ITSELF — because the doc-conformance register has nothing to check.
>
> `pressureProgressByBand.RUSHER_WINS_REP.reset` contradicted §7.1's own table for its whole life.
> §7.1 says ***"Blocker wins by 15+: Rusher reset"*** — and `RUSHER_WINS_REP` is the row where **the
> RUSHER won.** A `true` there asserts that the roll which started a rusher travelling **also retired
> the threat it just created, off the same die, on the same tick.** Incoherent **on the doc's own
> terms**, and it sat there unnoticed.
>
> **⇒ It escaped the doc-conformance register for a structural reason: THE REGISTER CHECKS CELLS
> AGAINST THE DOC, AND A DEAD BRANCH HAS NO OBSERVABLE BEHAVIOUR TO CONFORM.** The cell was checked
> against **nothing anyone could run.**
>
> ⚠ **So an absorbed mechanic is not merely inert — it is a REGION WHERE OTHER DEFECTS ARE INVISIBLE.**
> Anything inside it is exempt from every behavioural check by construction, which makes the
> exclusive-share sweep (entry 64) worth more than "find the inert mechanics": **it finds the regions
> where the other instruments cannot see.**

### ⛔ THE OPERATIVE FORM, AND THE TEST IS CHEAP

> **When a dispatch measures something the standing metrics cannot see, that is a PETITION FOR A
> METRIC — not merely a row in a report.**

**The test:** *did this measurement require building something the library does not have?*

- **If yes, the library has a gap, and THE GAP OUTLIVES THE DISPATCH.** The one-off instrument dies
  with the report; the gap stays and the next dispatch pays for it again.
- ⚠ **A one-off table is not a cheaper version of a metric. It is a DIFFERENT ARTEFACT with a
  different reach** — and the reach, not the accuracy, is what determines whether a finding does
  anything.

### ⛔ THE STANDING QUESTION THAT CATCHES ALL THREE — ***WHAT READS THIS?***

**The three absorbed victims share one property, and it is the diagnostic: they are CORRECT THINGS
PRODUCING NO DOWNSTREAM EFFECT, and none is detectable by checking whether the thing itself is
right.** ⚠ **Every ordinary review method asks *"is this correct?"* — and all three pass it.**

> ### **So ask instead: WHAT READS THIS? Of a mechanic, of a lever's price, and of a finding alike.**

| subject | the answer that condemns it |
|---|---|
| **a mechanic** | nothing **solely determines** an outcome through it (entry 64's exclusive-share test) |
| **a lever's price** | it was measured on a metric **structurally blind** to what the lever does |
| **a finding** | **no instrument inherits it** — it lives in one document and is consumed by nobody |

**All three answer the same way, and the question is cheap enough to ask AT AUTHORING TIME** — which
is the only moment it costs nothing, because the author already knows what they built and what
consumes it. **Asked later it requires reconstructing both** — which is precisely why **every
instance of this class was found by ACCIDENT rather than by AUDIT.**

> ### ⛔ **A QUESTION THAT IS FREE AT AUTHORING TIME AND EXPENSIVE AFTERWARDS SHOULD BE A FIELD, NOT A HABIT.**
>
> A habit is a rule that holds until someone is in a hurry — and *"in a hurry"* is exactly when a new
> instrument ships. **A field is answered because the form has a blank in it.** This is the same
> reasoning that put the **red-trigger field** in `ADR-TEMPLATE.md` and the **provenance table** beside
> it, and it generalises: **the asymmetry between authoring-time and afterwards cost is the signal
> that something belongs in a template rather than in a discipline.**
>
> ⚠ **Cost check before adding one:** a field is only free if its honest answer is short. *"What reads
> this?"* passes — the answer is a name, a metric id, or **the word "nothing"**, and *"nothing"* is
> the answer that matters most.

### The two-sided failure around one artefact

**Charter §4.1's audit-priority corollary said a stored ruling that drifts keeps being cited. This is
the complement: a stored finding that is CORRECT can fail to be cited at all.** Both failures are
invisible in the document itself, which reads exactly the same either way.

### ✅ THE COUNTER-MOVE: **ANNOTATE AT THE DECISION, NOT ONLY IN THE ENTRY THAT PRODUCED THE MEASUREMENT**

> ### **When a measurement retroactively supports or undermines a ratified decision, it is recorded AT THAT DECISION — not merely in the backlog entry that produced it.**

**This is the exact inverse of the absorbed finding.** There, a finding stayed in a document nothing
read. Here, **a finding is routed to the document that most needs it.**

**The worked example:** ADR-033 split `BLOCKER_BEATEN` out of `RUSHER_GAINING` **on football grounds
alone, with no population figure available** — its own text could only argue that *"a one-point edge
on a hundred-point scale is not a disturbed platform."* Three months later a census established the
split reallocated **8.448% of all pass-rush reps**, with `BLOCKER_BEATEN` taking **69.734% of the
pre-split range.** That number was annotated **into ADR-033**, not left in the backlog entry that
computed it.

> ⚠ **A reader arriving at a justification should not have to know that a census happened three months
> later.** The decision's own record is where the evidence for it belongs, and **a ratified decision
> whose supporting evidence lives somewhere else is one re-litigation away from being reopened on the
> weaker argument it was originally made on.**

**Note what it costs and what it buys:** the annotation is a paragraph, and it converts a decision
that was *right for reasons it could not demonstrate* into one that is **demonstrated in place.**

#### ⛔ THE PRACTICAL FORM — ANNOTATE REGARDLESS OF DIRECTION, AND STATE THE DIRECTION EXPLICITLY

> **"This STRENGTHENS ADR-033" and "this WEAKENS ADR-046's justification" must look the same in the
> record** — same placement, same prominence, same standing obligation.

⚠ **The undermining half is the one that costs something to write, and it is the one that matters
more** — because **the drift-versus-inertness lookup cannot catch it.** A ruling with weakened support
**still has consumers, still reads as current, and nothing about it changes except that the reason is
worse.** It passes *"does anything mechanically depend on this?"* and it passes *"does anything consume
this?"*. **It is a third register failure and neither existing question sees it.**

> ### ⛔ AND IF ONLY THE STRENGTHENING ANNOTATIONS EVER GET WRITTEN, THE ADR CORPUS READS AS UNIFORMLY WELL-SUPPORTED.
>
> **That is the uniform-provenance-table failure arriving at a different artefact** (`ADR-TEMPLATE.md`:
> *a provenance table that only ever says `COMPUTED` is one nobody filled in honestly*). **Uniformity
> in a field whose whole purpose is to record difference is the signal, not the reassurance** — and a
> corpus of decisions every one of which acquired *more* support over time is not a well-run project,
> it is **a corpus with a selection effect in its annotations.**
>
> ⚠ **So the absence of weakening annotations is itself evidence, and it should be read that way.**

> ### **So a register can be WRONG AND LOAD-BEARING, or RIGHT AND INERT — and NEITHER STATE SHOWS ON INSPECTION.**
>
> ⛔ **The only distinguishing evidence, in both directions, is DOWNSTREAM: what cites it, and whether
> what cites it is current.** Reading the entry harder tells you nothing about either. **That is why
> the cheap triage is a consumer question rather than a content question** — *does anything
> mechanically depend on this?* for the drift direction, *does anything consume this?* for the inert
> direction. **Same lookup, opposite failures.**

**Corollary — A FIELD THAT IS A PLACEHOLDER IN ONE EVENT TYPE AND A FACT IN ALL THE OTHERS IS WORSE
THAN A SENTINEL, BECAUSE THE SURROUNDING ROWS VOUCH FOR IT.**

> ### **A sentinel is a lie you can learn to distrust. A placeholder in an honest neighbourhood inherits the neighbourhood's credibility.**

A sorting sentinel (`?? 0` where `0` is a valid extreme) is at least *uniformly* suspicious — once you
know the pattern, you distrust every site. **This is worse**, and ADR-054 found the first instance:

`activeThreats` synthesises the §8.8 pursuit clock with `rusher: matchups[0].rusher.bio.id` — **arbitrary
array order, not the man chasing him** — and `alignment: "EDGE"`, a hardcoded literal. Both are
documented in the engine as a *structural convenience* so status derivation and arrival stay one code
path. Neither is read for its content.

Had the pursuit clock been published as a `RUSH_THREAT` — **even with a perfectly honest fifth
`ThreatOrigin`** — those two fields would have gone onto the stream as facts.

> ⛔ **THE DEFECT WOULD NOT HAVE BEEN AVOIDED. IT WOULD HAVE BEEN RELOCATED** — from `origin`, where
> ADR-022 and ADR-036 were watching, **to `rusher`/`alignment`, where nobody was** — and it would be
> *harder* to see there, because on **every other `RUSH_THREAT` in the stream those fields are
> honest.** A consumer that has read ten thousand true `rusher` values has no reason to doubt the ten
> thousand and first.

**Three real fields and two placeholders, published under a contract whose whole meaning is that all
five are facts.**

**⇒ THE OPERATIVE TEST, and it settles vocabulary questions empirically rather than by judgement:
before reusing an event shape for a new subject, check EVERY field the shape requires — not just the
one you were worried about. If any required field would have to be fabricated, THE SUBJECTS ARE TWO
KINDS OF OBJECT SHARING A SHAPE, AND THE ANSWER IS ADD RATHER THAN WIDEN.** The count of fields you
cannot honestly fill *is* the answer; you do not have to adjudicate whether the things "feel" alike.

**And the boundary that goes with it:** *"publish a fact the engine already computes"* is the cheap,
safe kind of petition — **but a value is not a fact.** If making the shape honest requires computing
something new, **the petition has silently become a mechanism change at a publication's price**, which
is the point at which it must be re-ruled rather than completed.

**Corollary — BEFORE RULING ON A LEVER, ESTABLISH WHAT DETERMINES THE QUANTITY. A MECHANISM YOU HAVE
BEEN SHOWN IS NOT THE SET OF DETERMINANTS.**

> ### **Reasoning about the mechanism in front of you is not the same as reasoning about the number you are trying to move.**

The prior question — *what, exactly, is the subject?* — applied to a **quantity** rather than to an
instrument. It has now cost two dispatches, in the same shape both times:

| ruling | what was reasoned about | what actually determines the quantity |
|---|---|---|
| ADR-050's accepting ruling | the **tier ladder**, which had just been re-banded | `RUSHER_WINS_REP` is a **cumulative band on a separate `minMargin` table**. Structurally invariant under every ladder change. |
| entry 40's supply redirect | **threat supply**, measured on the arrival-only base where it is worth **−71pp** | the pressure rate is the **worst of THREE channels**; supply reaches **one**. On the shipping tree: **−0.130pp.** |

**In both cases the mechanism was real, the measurement was sound, and the ruling was about the wrong
determinant.** Neither error is visible from inside the mechanism — the arrival channel really does
respond to supply exactly as measured. **What was never established is whether it is the only thing,
or even the binding thing, that sets the number.**

> ⛔ **THE OPERATIVE STEP, AND IT IS CHEAP: ENUMERATE THE DETERMINANTS BEFORE PRICING ANY OF THEM.**
> Read the function that produces the quantity and list every input that can set it. `pocketStatusFor`
> is eleven lines and names its three channels explicitly; **reading it would have pre-empted an
> entire dispatch.** A lever's measured size on a base where it is the *only* live cause says nothing
> about its size on a tree where it is *one of several*.

### ⛔⛔ AND THE ENUMERATION MUST RECURSE. FINDING THE BINDING CHANNEL IS NOT FINDING THE BINDING DETERMINANT IF THE CHANNEL ITSELF BRANCHES.

**Third instance, and the first committed AFTER this corollary was written** — by its author, in the
dispatch the corollary was supposed to protect.

The three channels *were* enumerated. Arrival came back dominant at **43.9% exclusive-of-dirty**,
`arrival.pressureWithinSeconds` was sitting on it at `POS_INF`, and that was called the answer.
**But `pocketFloorFromArrival` branches too** — three horizons tested **in order**:

```ts
if (minTta <= t.immediateWithinSeconds) return "IMMEDIATE";   // 0.0
if (minTta <= t.collapsingWithinSeconds) return "COLLAPSING";  // 1.0
if (minTta <= t.pressureWithinSeconds)  return "PRESSURE";     // POS_INF
```

**So the unbounded default governs ONLY threats more than 1.0s out.** Arrival's dominance is a
**COLLAPSING** phenomenon — ~51% of ticks, **flat across the entire sweep grid**, governed by a
*finite* `1.0` the lever never touches. PRESSURE-severity ticks are ~9%. The measured ceiling on the
"cleanest finding in months" was **−2.440pp of a 60.6pp gap.**

> ### **One level of enumeration has now produced a confident wrong answer three times — and every time, the next level down was CHEAP TO READ.** Eleven lines the first time. **Three lines here.**

#### ⛔⛔ FOUR INSTANCES IN ONE WEEK, AND THEY DESCEND ONE LEVEL EACH TIME

| # | the question that was answered | the question that decided the quantity |
|---|---|---|
| 1 | which **TABLE**? — the tier ladder | `RUSHER_WINS_REP` lives on a **separate `minMargin` table**, invariant under every ladder change |
| 2 | which **CHANNEL**? — threat supply, −71pp isolated | the rate is the **worst of three**; supply reaches one → **−0.130pp** shipping |
| 3 | which **BRANCH** within the channel? — `pressureWithinSeconds` at `POS_INF` | it gates only `minTta > 1.0`; **COLLAPSING is a different branch** → **−2.440pp of 60.6** |
| 4 | which **QUANTITY** within the branch? — arrival's 43.9% exclusive-of-dirty | ⛔ **that is a DIRTY-TICK budget across three severities, not a COLLAPSING budget.** Read as COLLAPSING **by both the Orchestrator and the owner** |

> ### **The error does not repeat at one level. It DESCENDS — table, channel, branch, quantity — and each time it wears the previous level's correctness as evidence.**

**That is the part worth internalising: every one of the four was reached BY DOING THE PREVIOUS STEP
RIGHT.** The tier ladder really was re-banded; supply really is worth −71pp isolated; arrival really
is the dominant channel; 43.9% really is its exclusive share. **A correct answer to the previous
question is what makes the next question feel already answered** — which is the reviewer-removing
mechanism above, arriving inside a single investigation instead of across documents.

⚠ **So the recursion has no natural stopping point that "it looks settled" can supply.** Descend until
a determinant is a **constant, a roll, or an input from outside the subsystem** — that is the only
termination condition that is not a feeling.

**⇒ PRECONDITION, not preference: enumerate to the leaves. At each level ask *does this determinant
itself branch?* and keep descending while the answer is yes.** The cost is reading a function. The
demonstrated cost of stopping early is a dispatch.

### ✅ AND THE CONVERSE IS WORTH KEEPING: A DERIVED BOUNDARY THAT LANDS BADLY IS THE PROOF THE DERIVATION WAS HONEST.

`2.0` was derived from the table's own geometry — COLLAPSING's width `1.0 − 0.0`, replicated once, at
the engine's 0.5s quantum — **before the curve was examined.** It landed at the curve's *onset* and
captured **8.8%** of an already-small budget.

> **A fitted number lands well. That one landing badly is what proves it was not fitted** — and that
> is worth more than the measurement it produced, because it is the only evidence available that a
> derivation was real rather than a rate-chase wearing a derivation's name.

⚠ **Corollary for readers: do not treat a derived value that lands poorly as a failed derivation.**
It is a *successful* derivation reporting that the mechanism is small — which is exactly the signal a
fitted number would have destroyed.

> ### ⛔ AND THE INVERSE, WHICH IS THE UNCOMFORTABLE HALF: **A DERIVED VALUE THAT LANDS WELL DESERVES MORE SCRUTINY, NOT LESS.**
>
> If landing badly is the *only* available evidence that a value was not fitted, then **landing well
> is the case where a real derivation and a rate-chase are INDISTINGUISHABLE BY THEIR RESULT.** The
> number is the same either way; only the process differs, and the process leaves no trace in the
> number.
>
> **⇒ So the comfortable outcome is the one where PROVENANCE HAS TO CARRY THE WHOLE WEIGHT** — what
> the boundary was derived *against*, whether that anchor existed before the target rate was known,
> and whether the derivation was written down before the curve was examined. ⚠ **Ask for those three
> things hardest when the answer is pleasing**, because that is precisely when nobody wants to.
>
> This is the ratified-claim sub-corollary in another costume: **a result that confirms what we
> hoped removes the reviewers**, exactly as ratification does.

**⚠ KEEP THIS DISTINCT FROM THE REFERENT PROBLEM. They look alike and they fail differently:**

| | the referent problem | **this** |
|---|---|---|
| the instrument | **named something real and pointed elsewhere** | **pointed at exactly what it named** |
| what was wrong | the aim | **the question** |
| shorthand | **a MIS-AIMED guard** | **a WELL-AIMED guard answering an UNASKED question** |
| catchable by | *what, exactly, is the subject?* | *what determines the quantity?* — the subject was never in doubt |

**The second is harder, and the reason is worth stating: no amount of care INSIDE the measurement
could have caught it.** The measurement was about the mechanism, and it was right about the
mechanism. Rigour does not scale into this failure — **only a prior question does.**

**And note the trap this sits inside: over-determination makes a redundant cause LOOK like a
sufficient one.** We named that failure in ADR-049 — *"a lever measured against `DEFAULT_TUNABLES`
prices whether a channel is BINDING, not whether its mechanism is LARGE"* — **and then violated it on
the very next move.**

> ### ⛔ **NAMING A TRAP DOES NOT EXEMPT THE NEXT DECISION FROM IT.**
>
> **A recorded principle does not apply itself.** We wrote the over-determination rule, ratified it,
> cited it — and walked into it one dispatch later, because **writing a rule down feels like having
> handled it**, and the feeling is indistinguishable from having handled it.
>
> ⚠ **EVERY RULE IN THIS DOCUMENT HAS THIS EXPOSURE**, and the ones most likely to be violated are the
> ones most recently and most confidently added — the same configuration as §4.1's ratified-claim
> sub-corollary, where *"the drawing of the distinction itself reads as evidence that it is being
> applied."* **The Charter is not a guard. It is prose, and prose is the weakest medium in it.**

**Corollary — A MODULE THAT COMPARES PAST TO PRESENT NEEDS EXACTLY ONE LIVE READER. HISTORY IS
FROZEN.**

> ### **The restated-constant problem, inverted: not a COPY that drifted from the source, but a READER that assumed the source's SHAPE.**

Every restated-constant defect so far has been a **value** copied out of its source and left behind
when the source moved. This is the dual, and it is less visible because **nothing is copied at all.**

`ladderTail.ts` exists to re-band `resultTierLadder`, and it read the live tree not only for values
but for **positions**: `committedLabels[4]` for `TIE`, `.slice(0, 4)` and `.slice(5)` for the success
and failure label sets. Correct on nine rungs. On seventeen, `committedLabels[4]` is
`DECISIVE_SUCCESS` and **both slices grab entirely wrong label sets** — silently, because indices do
not typecheck against meaning.

> ⛔ **The module that existed to change the ladder's arity was itself keyed to the ladder's old
> arity.** No constant was stale; the *assumption about shape* was.

**The general structure, and it is the reusable part:** in any module that compares a past state to a
present one — a derivation, a regression, a migration, a before/after gate — **exactly one function
may read the live tree, and every historical reference is anchored to a frozen constant.** Then:

- the historical claims **cannot drift under the tree**, because they no longer touch it;
- the single live reader is **one obvious place to audit** when the tree's shape changes;
- and a re-derivation that reconstructs the live tree **from the frozen base plus the derivation** is
  a real check rather than a transcription — `ladderTail` now rebuilds the committed ladder rung for
  rung and label for label **with zero reads of `DEFAULT_TUNABLES`**, which is only meaningful because
  the two sides are genuinely independent.

**Positional reads deserve the same suspicion as a copied number** — see the **four media** table
above, where POSITION is catalogued as the fourth and worst medium of the restated-constant family.

**And note what the one-live-reader rule buys, because it is the load-bearing part rather than the
tidy part: A COMPARISON WHOSE TWO ARMS SHARE A SOURCE IS NOT A COMPARISON.** The re-derivation check
is only evidence because the frozen base and the live tree are genuinely independent; the old
structure destroyed exactly that independence, which is why a module full of confident assertions
could sit on top of wrong label sets and stay green.

**Corollary — WHEN A PROPERTY CANNOT BE SATISFIED, THERE ARE TWO EXPLANATIONS, AND WE HAVE ONLY EVER
ASSUMED THE FIRST.**

> ### **Either the implementation is wrong, or THE PROPERTY DOES NOT BELONG TO THIS SUBJECT.**

Every unsatisfiable property in this project so far has been met by asking *"what value fixes it?"* —
which presupposes that the property is correctly attached and only mis-tuned. **That presupposition
is invisible because it is never stated**, and it is the reason an unsatisfiable property reads as a
hard tuning problem rather than as evidence.

ADR-053 §4 produced the first case where the second explanation is live. Strict occupancy
monotonicity is **unsatisfiable on the target roll form by ANY ladder whatsoever** — not narrowly, not
at some shifts: a bounded rung's occupancy on a uniform margin **IS** its width, so equal widths are
equally likely and no partition can make an outer rung rarer than an inner one. Two readings:

| reading | what it implies | what it costs to be wrong |
|---|---|---|
| the ladder is mis-partitioned | search harder for boundaries | **the search cannot terminate** — 0 of 1,587 candidates, and the proof says 0 of all of them |
| the ladder **does not belong on target checks** | remove the tier, let them report margin | a design decision, with evidence owed |

**The tell that distinguishes them is EXHAUSTIVENESS.** A mis-tuned property fails for *some* values;
a mis-attached property fails for *all* of them. **So an exhaustive search returning empty is not a
harder tuning problem — it is a different KIND of finding, and it is the strongest available evidence
that the property is attached to the wrong subject.** Treat an empty admissible set as a signal to
re-examine the attachment, never as a licence to widen the search.

**And note which way the repair points.** If the property does not belong, the fix for a monotonicity
failure is **deleting the property's subject, not repairing the property** — the retirement-disposal
corollary below, running in the opposite direction to its usual one. That inversion is exactly why
such a case is a **design** question and not a tuning one, and why it must not be closed by a
compromise value that satisfies the gate on both subjects by satisfying the football on neither.

**Corollary — RETIRED ARTEFACTS NEED A DISPOSAL RULE, NOT A LABEL. If a retired block can still
execute, "retired" is a comment.**

ADR-047 found a **retired pricing block** asserting that
`patch("catching.contestedMaxOpenness", 30, 40)` **throws `TunablePatchError`**. With the tree back at
`30`, **that call would no longer throw — it would apply.** A *retired guard* had silently become a
**live perturbation**, inside an **env-gated file that emits no green tick on a default run.**

**That is two failures compounding:** tier 3 (**unverifiable invocation** — nothing can tell whether
a human ran it) **plus** entry 47's first shape (**a stale referent**). Neither alone would have hidden
it; together, nothing in the repo could report on it.

**So retirement is an ACTION, not an annotation.** A retired artefact is **deleted**, or **converted
to an assertion of the post-retirement state**, or **made unable to run**, or **kept LEGIBLE BUT NOT
SELECTABLE**. A block that is merely *labelled* retired and remains executable is **a live artefact
with a misleading comment** — and by §4.1's prose corollary, the comment is what the next reader will
believe.

> #### **LEGIBLE BUT NOT SELECTABLE — the third state, and it is the one that gets collapsed when moving fast.**
>
> Distinct from *"made unable to run"*, which is about **execution**. This is about **selection**: the
> artefact stays fully readable as a record of a decision, while **no code path can choose it.**
>
> It exists because a rejected alternative can be **load-bearing as evidence.** ADR-053 §8 argues that
> **no boundary was shaded to spare a consumer**, and that argument works only by comparing the two
> candidate namings and showing their **boundaries are identical** — so `NAMING.ADJACENT` must remain
> **legible**. It must not remain **selectable**, because a rejected scheme reachable as a live option
> is one argument away from being selected by someone who reads it as a supported alternative.
>
> **The test that separates the states: does anything still need to READ this, and does anything still
> need to CHOOSE it?** Two questions, four answers, and the diagonal — *read yes, choose no* — is the
> state that gets collapsed into deletion by anyone in a hurry. Note it sits **beside** the generator
> exception above and does not overlap it: there the hazard was that the artefact could **run**; here
> it is that the artefact could be **picked**.

**CONVERSION IS THE BEST OF THE THREE, and the reason is not tidiness: a DELETED guard leaves no
evidence the defect was ever possible, so a future change can reintroduce it SILENTLY. A converted one
reddens.** ADR-036's tripwire is the model — it stopped asserting *"`DEAD` publishes `0`"* and started
asserting *"no `DEAD` payload carries the key at all"*, so **something still stands where the defect
was.** Prefer conversion wherever the post-fix state is assertable; delete only when the defect has
become unrepresentable (ADR-034's narrowing, ADR-036's discriminated union), because then the type is
the standing evidence.

> ### ⛔ AND THE SAME ASYMMETRY SEEN FROM THE OTHER SIDE: **REMOVING A CONFIGURATION ASSERTS THAT ITS SUBJECT SHOULD NOT EXIST.**
>
> This corollary requires that **retiring an artefact be an ACTION rather than an ANNOTATION.** The
> mirror is that **DELETING one is a RULING rather than a TIDY-UP** — and that direction is easier to
> miss, **because deletion reads as cleanup while addition reads as a decision.**
>
> **The worked case (backlog entry 59):** `pressureProgressByBand.RUSHER_WINS_REP.reset` is
> unreachable. Two candidate fixes, and **both smuggle a football ruling if nobody names it:**
>
> | fix | the claim it *looks* like | ⛔ the claim it *makes* |
> |---|---|---|
> | make the branch reachable | *"the statement order was wrong"* | **a rusher who wins his rep SHOULD be able to retire the threat that rep created** |
> | delete the config | *"this value is a transcription artefact"* | **NO band should ever reset on a won rep** |
>
> **⇒ Neither question has ever been asked.** The branch was unreachable, so **the football never came
> up** — and both fixes answer it silently, in opposite directions, while presenting as maintenance.
>
> **THE OPERATIVE FORM: before deleting a configuration, state what its ABSENCE asserts.** If that
> sentence is a design claim, ⚠ **it is a petition, not a cleanup** — and the honest move is often a
> third option: **make the unreachability explicit and enforced, and leave the football question
> open.** That removes the silent dead config *without* answering anything.

> ### ⚠ THE EXCEPTION, AND IT CUTS THE OTHER WAY: WHEN THE CAPABILITY ITSELF IS THE HAZARD, RETIRE THE ABILITY TO RUN IT AND KEEP ONLY THE RECORD.
>
> Conversion is the default because a deleted guard leaves no evidence. **But some retired artefacts
> are not guards — they are GENERATORS, and a generator's danger is not that it is stale. It is that
> it still works.**
>
> ADR-052's `derivedLadder` padded a short ladder with literal `ABSOLUTE_SUCCESS_N` placeholders
> rather than coining plausible names, **and that was exactly right**: the ladder came up one name
> short, and what it produced read as **an unfilled slot rather than a decision.** The name was then
> supplied deliberately, by a human, from existing vocabulary.
>
> > **A placeholder that looks like a decision is worse than one that looks like a gap.**
>
> Once `OVERWHELMING_` shipped, the padding mechanism had **no live subject** — and a scheme that can
> synthesise a plausible rung name on demand is **one careless call away** from producing the bad kind
> of placeholder, at precisely the moment someone is in a hurry and a ladder is one name short. So the
> owner's ruling: **keep the record of why it existed; retire the ability to run it.**
>
> **The general form: for a generator, "retired but executable" is not a misleading comment — it is a
> loaded tool.** The correct post-retirement behaviour when a future ladder runs short of names is
> **a loud failure demanding that a human name the rung**, which is §4.1's own preference for a loud
> failure over a silent default, applied to a naming scheme rather than a value. Note that this
> exception is **narrow**: it applies where the artefact's *capability* is the hazard, not where its
> *staleness* is. Guards, pins and assertions still convert.

**Corollary — A RULE WHOSE PREDICATE CANNOT FAIL IS NOT A RULE. A catch-all is an UNCLASSIFIED REGION
WEARING A CLASSIFICATION'S NAME.**

> ### ⛔ IT ARRIVES FROM CONTROL FLOW TOO, NOT ONLY FROM A PREFIX RULE — and there it corrupts MEASUREMENTS, not classifications.
>
> `sim/passPlay.ts:528` tests `startsThreat(rush.band)` **before** `:545`'s `clearsThreat(...)` in an
> **if/else-if chain**, so `pressureProgressByBand.RUSHER_WINS_REP.reset` **is unreachable** — a rusher
> who keeps winning his rep can never reach the retirement branch on a tick he wins. No predicate is
> wrong. **The statement order makes one of them undecidable.**
>
> **⇒ AND THE CONSEQUENCE IS A NUMBER WE BELIEVED.** `retireOn` P2's measured reach of **0.108pp** was
> read as *a ceiling on a mechanism.* It is not. It is **an artefact of statement order** — the
> workaround that excludes `RUSHER_WINS_REP` exists *because* of this ordering, so the arm could only
> ever retire a threat *"one tick unless re-won."* **A dead branch does not report as dead; it reports
> as a small effect.**
>
> > **⚠ STANDING CRITERION, and it changes an owed sweep: ANY RECORDED NULL OR SMALL EFFECT MEASURED
> > ON A BRANCH NEEDS ITS REACHABILITY CHECKED BEFORE THE NUMBER IS TRUSTED.** A null on an
> > unreachable branch is **not evidence about the mechanism** — it is evidence about the control
> > flow, and the two are indistinguishable in the report. **Added to entry 53's sweep criteria**,
> > alongside corpus-versus-play scope.
>
> Note the family resemblance and the difference: the catch-all case makes a **classification**
> vacuous, this makes a **measurement** vacuous — and the measurement case is worse, because a
> classification that cannot fail at least stays visible in a register, while **a null enters the
> backlog as a finding and is cited as one.**

`docConformance.REGISTER`'s `route.*` prefix rule (`STRUCTURAL`, *"Openness clamps at §8.4's 0-100
scale"*) **silently classified all seven new `route.contestGain.*` cells**, and the note is **false of
every one.** The totality gate stayed **green** — `unclassified` empty, `deadRules` empty.

Apply the entry-55 diagnostic and it answers itself: *what would make this rule go red?* **Nothing —
it matches by prefix.** **A classification that cannot be wrong classifies nothing.**

**So a register must report catch-all-matched cells as a DISTINCT POPULATION**, never fold them into
the classified count. A cell matched only by a prefix has not been *classified*; it has been
**absorbed**, and *absorbed* is indistinguishable from *correctly classified* in every count anyone
reads. (This is entry 47's second shape — *a claim still reading true while pointing at something
new* — occurring **inside the instrument built to detect it**.)

> **DEFENSE IN DEPTH, WORKING — AND FOR THE FIRST TIME HERE.** What caught it was the **count and
> path-digest pair ADR-041 added because classification had failed before.** So **the classification
> rule failed, and the guard that exists BECAUSE classification fails caught it.** This is the first
> occasion in this project where a **second layer caught what the first missed**, rather than the
> first layer catching everything — which is the argument for keeping redundant guards whose
> individual value looks marginal at the time they are written.

**Counter-corollary — a guard that always fires gets deleted.** This principle has an obvious
failure mode in the other direction, and ADR-025 is the worked example: refusing to compare two
baselines that differ only in *seed list* would have blocked the one unambiguously legitimate
comparison — the same batch re-run larger — and a guard that forbids the legitimate case does not
survive contact with the person it inconveniences. **Deciding what NOT to guard is part of
designing the guard**, and over-guarding is how a guard loses its authority. State the criterion
that admits the legitimate case, then hold the line on everything else.

### The sharpest form of the rule

Those last two are the same failure class, and it is the one worth naming:

> **Where a wrong answer would look like a *right* one, encode the constraint in the type
> system rather than in policy.**

A tautology passing a band is worse than a failing row, because **red gets investigated and
green gets trusted.** The same holds for a metric computed from a held-out season, a roll
counted twice, a step-up reported as a hold, and a simulation half-run under the wrong tunables:
in every case the output looks healthy and no amount of care at the call site would reveal it.
Policy catches the wrong answers that look wrong. Types are for the ones that don't.

The common shape: a schema or signature that cannot express the wrong thing beats any amount of
discipline about not writing it. When choosing between the two, the cost of the stricter option
is paid once by the author; the cost of the looser one is paid repeatedly, by whoever is
debugging a number that looks right.

Corollary for sub-agents: if you find yourself writing a comment that asks a future reader to
remember something, check first whether the type system can remember it for them.

Known overlaps to expect (pre-approved as contract channels): stamina/morale/injury (franchise → engine inputs), narrative effects (narrative → franchise modifiers), perception queries (franchise perception ↔ UI display), event subscription (engine/franchise → narrative/UI/calibration).

---

## 5. SIMULATION & RANDOMNESS POSTURE

- **Structure:** Football Manager's shape (hidden opposed attribute contests per micro-event) fused with OOTP's philosophy (ratings anchored to real statistics via calibration), with the transparency both lack via the event stream.
- **Dice:** d100 + modifiers vs. target numbers with margin-sensitive result tiers (per design doc). Volume of micro-checks (~130 plays × many rolls) produces naturally bell-shaped macro outcomes without shaped dice.
- **Honest dice at launch.** No pseudo-random streak protection in v1. Luck-protection reserved as a *tunable difficulty feature* later, applied only at narrative-visible moments, only if calibration/playtesting shows streaks feel unfair.
- **Output-randomness insulated by role:** the player is a decision-layer actor; failures attribute to *players* (roster consequences), not to the human's executed action.
- **Determinism:** every sim call takes a seed; replays are exact.

---

## 6. BUILD SEQUENCE

| Phase | Work | Exit criterion |
|---|---|---|
| 0 | Repo scaffold, CLAUDE.md, agents, CI, contracts v0 (types, registry, event schema, PRNG, authority tags) | Packages compile; contracts reviewed |
| 1 | **Engine + Calibration in parallel** (they feed each other): engine implements design doc; calibration ingests nflverse + builds batch harness + baseline report | A full game sims with complete event stream; first calibration report runs |
| 2 | **Attributes:** source ingestion, layered derivation, real-roster importer | Real-league rosters rated; calibration loop closes (sim real league vs. real baselines) |
| 3 | **Tuning loop:** disambiguation + sensitivity reports drive engine weights and registry amendments | League-wide sim stats within target bands of NFL reality |
| 4 | **Franchise:** calendar, cap, market, draft, perception system | A season + offseason playable headless |
| 5 | **UI shell** (start as soon as event schema stabilizes in Phase 1–2): menus, dashboards, play log, scene system with placeholder art; art pipeline style guide locked | Playable in browser end-to-end |
| 6 | **Narrative:** templates, triggers, press/reputation | Storylines fire from real sim events |
| 7 | v1 hardening: saves, onboarding, difficulty, anonymization switch test | Shippable v1 |

Fantasy advisor reviews at every phase gate.

---

## 7. SUB-AGENT DEFINITIONS

Files in `.claude/agents/`. Frontmatter fields: `name`, `description`, `tools`, `model` (verified against current Claude Code docs — path boundaries are enforced in the system prompt body + settings permissions, not frontmatter).

| Agent | Model | Tools | Owned path | One-line mission |
|---|---|---|---|---|
| `contracts-guardian` | sonnet | Read, Grep, Glob | `packages/contracts` (write via Orchestrator only) | Reviews contract-change proposals; guards the constitution |
| `match-engine` | sonnet | Read, Edit, Write, Bash, Grep, Glob | `packages/engine` | Implements the match design doc as pure, seeded, event-emitting functions |
| `attributes-pipeline` | sonnet | Read, Edit, Write, Bash, Grep, Glob | `packages/attributes` | Source ingestion → layered derivation → rated rosters; importer isolation |
| `calibration` | sonnet | Read, Edit, Write, Bash, Grep, Glob | `packages/calibration` | Batch sims, baselines, disambiguation & sensitivity reports |
| `franchise-engine` | sonnet | Read, Edit, Write, Bash, Grep, Glob | `packages/franchise` | Calendar state machine, cap/market/draft, perception system |
| `narrative` | sonnet | Read, Edit, Write, Grep, Glob | `packages/narrative` | Storyline systems; effects only via contract channels |
| `ui-layout` | sonnet | Read, Edit, Write, Bash, Grep, Glob | `apps/game` | Menus, dashboards, scene system, event-stream play log; zero game logic |
| `art-director` | sonnet | Read, Edit, Write | `assets/`, style docs | Style guide, prompt templates, asset manifests, consistency review |
| `fantasy-advisor` | sonnet | Read, Grep, Glob | none (memos to `docs/decisions/`) | Fantasy-mode foresight; flags foreclosing decisions |

Common system-prompt rules (all agents): stay inside your owned path; import only from `contracts`; file contract-change proposals rather than reaching across; write tests for every logic block; reference your domain spec in `docs/design/`; all randomness through the contracts PRNG.

---

## 8. SPEC BACKLOG (ordered)

1. `contracts.md` — types, registry, event schema, authority tags, PRNG *(write first; short)*
2. `match-engine.md` — **exists** (v1.0 design doc); amend to registry-ID reads + event-stream output
3. `calibration.md` — baselines, harness, disambiguation method, sensitivity/correlation reports
4. `attributes.md` — source inventory, layered derivation, importer isolation, anonymization
5. `franchise-calendar.md` — phases, deadlines, market mechanics (from design notes)
6. `perception.md` — true/perceived layers, reveal curves, scouting confidence
7. `narrative.md` — template/trigger/consequence model, sources, press & reputation
8. `ui.md` — window map, scene system, play presentation
9. `art-style.md` — the locked style guide
10. `fantasy-brief.md` — advisor's standing brief and open questions
11. `coaching-staff.md` — coach attribute sheet, effect channels, staff economy, hiring/evaluation loops *(added by Amendment 1)*
12. `emergent-meta.md` — scheme fashion as retroactive narrative over results; never engine-affecting *(Amendment 2)*
13. `tutorial-season.md` — the Rookie Assistant onboarding season *(Amendment 2)*
14. `player-personality.md` — personality sheets, morale slopes/volatility, contract motivation *(Amendment 3)*
15. `owners-meeting.md` — proposal generation, voting blocs, owner personalities, rule-change propagation *(Amendment 4 — deferred, granular design pending)*

---

## 9. DECISION LOG (settled in design sessions, July 2026)

- TypeScript monorepo, everywhere; Rust escape hatch for engine only if needed
- Event-driven core; event stream as single source of truth
- Contracts as Orchestrator-owned constitution; petition process for changes
- Authority tags `COACH | GM | PRESIDENT`; v1 = Coach+GM combined; owner = NPC above president, never playable
- Real-league development, anonymize-at-launch via importer swap; engine never knows "real"
- Attribute registry fluid during development, frozen for ship; calibration recommends kill/merge/split
- Calibration as its own domain with disambiguation + sensitivity mandates
- Honest dice; no streak protection in v1; seeded determinism throughout
- Free data sources as foundation; PFF as pluggable enrichment (subscription possible)
- Madden ratings: rank-order validation only, never copied
- AI-generated art under locked style guide; art-director agent owns the pipeline, not the generation
- Fantasy mode (real-results-tethered league play) = advisor's primary brief; same-franchise multiplayer = footnote carried by authority tags
- v1: single-player, local browser, static scenes/diagrams, JSON saves; dot-replay animation as stretch

## 10. AMENDMENT LOG

| # | Date | Change | Rationale |
|---|---|---|---|
| 1 | Jul 2026 | Added Spec #11 (Coaching & Staff) to backlog; staff recognized as a cross-domain system owned by franchise with contract-channel effects into engine/development | Coaching was a gap in the original domain map; owner directed per-organization evaluation profiles and staff economics that require formal treatment |
| 8 | Jul 2026 | §4.1 added — the working principle *prefer a compile error to a convention; prefer a loud failure to a silent default*, with its five precedents | It was already governing decisions and had repeatedly caught defects review could not. An unstated principle gets applied when someone remembers it; a stated one gets applied when it matters |
| 7 | Jul 2026 | `packages/playbook` added to the domain map as **content, not a domain** — no agent, Orchestrator-stewarded, transferring to franchise in Phase 4 (ADR-017). The play-call vocabulary moves from `engine` to `contracts` in the same change, narrowing ADR-013's refusal | The play-card corpus is Phase 1's critical path (the frozen caller cannot call plays without it; backlog entry 8 makes zone metrics fixture-shaped without horizontal placement) and franchise, its eventual owner under ADR-006, does not exist until Phase 4. Three domains now need the play-call types, which under Amendment 6's corollary makes them shared vocabulary |
| 6 | Jul 2026 | §4 rule 1 amended: a domain whose explicit purpose is to exercise another may import it, under a ratified ADR, one-directional, with its permitted surface named. First and only instance: `calibration` → `engine` (ADR-012), whose surface is the simulation entry points, their input/output types, the tunables-patch interface, and the debug renderer — the engine's barrel trimmed to match in the same commit | Calibration cannot fulfil its Charter §3-D4 mandate without invoking the engine; the engine's export barrel had already made that decision implicitly and far too generously (~90 resolver functions). The alternative — a simulation-harness interface inside `contracts` — would have violated contracts.md §10 to preserve the letter of a rule about internals. Sequenced after ADR-011, since most of the pressure to import engine internals was the event stream's missing result bands wearing a dependency costume |
| 5 | Jul 2026 | ADR-001 (fashion seeding) and ADR-002 (leagueContext slot) ratified. Phase 0 complete: contracts v0 implemented and tested | Owner ratification; first implementation milestone |
| 4 | Jul 2026 | Added Spec #15 (Owners' Meeting, deferred). League rule changes tiered: competitive rules may pass autonomously; structural changes (league size, game count, playoff field) require user assent | Owner ruled the simulated league must not restructure itself autonomously across a long save; the meeting system needs granular design before it holds that power |
| 3 | Jul 2026 | Added Spec #14 (Player Personality & Morale); org trend-receptivity attributes added to Spec #12; scheme labels ruled non-deterministic of coaching outcomes | Owner specified morale as a rate-and-needs model with winning as universal damper, and required that trend response vary by organization |
| 2 | Jul 2026 | Added Spec #12 (Emergent Meta) and Spec #13 (Tutorial Season). New design pillar recorded: **scheme fashion is narrated retroactively over results and never alters engine effectiveness** | Owner ruled the game must not encode designer claims about what works in football; onboarding reuses delegation toggles, so it constrains toggle granularity in Spec #8 |

---

*Next deliverables after charter ratification: repo scaffold + CLAUDE.md + the nine agent files, then Spec #1 (contracts.md).*
