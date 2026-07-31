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

**Sub-corollary — A CLAIM IS UNVERIFIED UNTIL SOMETHING COMPUTES IT. Not distrusted. UNVERIFIED.**

> ### **RATIFICATION DOES NOT ADD EVIDENCE; IT ONLY REMOVES REVIEWERS.**

⚠ **AND RATIFICATION IS ONLY THE FIRST TRIGGER WE FOUND, NOT THE CATEGORY.** The general rule is
wider, and stating it wider is what lets the next instance be recognised:

> ### **ANYTHING THAT MAKES RE-EXAMINATION FEEL UNNECESSARY REMOVES REVIEWERS AS EFFECTIVELY AS RATIFICATION DOES — and none of them adds evidence.**

| trigger | why nobody looks again | status |
|---|---|---|
| **a ratified claim** | the ruling *is* the review's output; the author is the last to re-open it | ⛔ **two instances**: ADR-046's constant, ADR-050's accepting ruling |
| **a pleasing result** | a real derivation and a rate-chase are **indistinguishable by their result**; only the process differs, and it leaves no trace in the number | ⛔ **live** — see the derived-boundary corollary below |
| ⛔ **A CORRECT PRIOR STEP** — *the most concealed of the three* | the previous answer was **right**, so the next question reads as a **continuation** rather than as a new question. **There is no ratification event, no pleasing result, nothing to notice — just a chain of correct answers** | ⛔ **four instances in one week**, descending table → channel → branch → quantity |
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
