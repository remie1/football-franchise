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
