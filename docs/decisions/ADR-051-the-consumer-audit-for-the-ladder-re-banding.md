# ADR-051: The consumer audit for the ladder re-banding — the engine has no tier consumers, and the two that matter are a dead arm and a live test filter

- **Date:** 2026-07-30
- **Proposed by:** `match-engine`
- **Status:** REPORT ONLY — **nothing changed.** `pnpm typecheck` and `pnpm test` green from the root;
  every experiment reverted and the tree hashed byte-identical before and after (§7).
- **Gates:** the owner's ruling on ADR-050 §2 (*bound the extreme rungs, add a rung above and below*).
  This is the safety precondition, not the change.
- **Supersedes nothing. Feeds:** the `ResultTier` contract petition (`packages/contracts/src/events.ts:24`)
  and calibration's parallel boundary derivation.

## Why a new ADR rather than an amendment to ADR-050

The owner left the choice open. **New ADR**, for three reasons:

1. ADR-050 is `calibration`'s and is a **measurement** — a derivation of occupancies, status
   *"measurement only, no tunable moved"*. This is `match-engine`'s and is an **enumeration** by a
   different instrument (opaque-type fixpoint + reading pass). ADR-045's precedent for amending in
   place was *"this is §2.3 being resolved rather than a new question"*; this is a new question, asked
   after ADR-050 closed.
2. ADR-050's Impact section says *"`packages/calibration` only"* and that sentence is still true of
   ADR-050. Burying a cross-package consumer register inside it would make that section false about
   its own dispatch.
3. The consumer register below needs to be **citable by the petition** and re-runnable by whoever
   lands the rungs. It is a standing artefact, not a footnote.

---

## 0. The headline, before the tables

Four findings, in the order that changes what the petition has to do:

1. **The engine does not consume the ladder at all.** Not one resolver, not one mechanic, not one
   threshold. Every §6–§14 mechanic reads its own `bandFor(t.bands, margin)` band table — which is
   exactly what ADR-011 built the `band` field for. `tierFor`'s output goes straight into an event
   payload and is never read again inside `packages/engine/src`. The fixpoint proves this (§2), and
   it is the strongest possible form of the owner's *"nothing is broken today"*.
2. **⛔ The owner's hoped-for good case does not exist.** There is **no `Record<ResultTier, …>`, no
   `[K in ResultTier]`, and no `switch` on a tier anywhere in the repository.** Every tier-keyed
   structure in the tree is a runtime `Map<ResultTier, number>`, which gains a key silently. Once
   `ResultTier` is widened in contracts, **adding two rungs produces ZERO compile errors** — measured,
   not argued (§4). **No site will demand a football value for the new rungs.** Nothing forces the
   choice; the choice has to be remembered.
3. **⚠ "Re-band the extremes with no new rungs" is not expressible.** `bandFor` (`rolls.ts:31`) walks
   a descending list of **floors**; a row has no ceiling field, and the top row is open *because
   nothing sits above it*. Bounding `CRITICAL_SUCCESS` **requires** the rung above it. The owner's two
   instructions are one operation, and the "would anything silently change if only the extremes were
   re-bounded?" question is answered by the data structure before it reaches any consumer (§5).
4. **Two EQUALITY consumers exist, and neither is where anyone would look.** One is a dead fallback
   arm in a calibration metric that would mis-attribute the most dominant pass-rush win in the game as
   a **loss** (§3.B1). The other is a live engine **test filter** on `CRITICAL_FAILURE` whose
   population moves silently under a bottom-rung boundary above about −57 (§3.B2, §5.2). Its exact
   sensitivity is measured and handed to calibration as a constraint on the boundary derivation.

---

## 1. Method, and what each half can and cannot see

Charter §4.1: *hand-enumerated coverage lists have been wrong every single time they have been
checked.* Two instruments, paired, because **neither is sufficient and the pairing is mandatory for
exactly this change** (ADR-045 §1.4 — *a type cannot see a label consumer, and a scale correction is
almost always a label re-pointing*).

| instrument | what it derives | what it structurally cannot see |
|---|---|---|
| **opaque-type fixpoint** (§2) | every site that touches `tierFor`'s output *before* it is published | anything past the event boundary; anything that reads the tier's **name** |
| **reading pass** (§3) | label consumers, renderers, registers, fixtures, pins | nothing is guaranteed; it has no instrument and never will |

**The laundering site here is one call deep, and that is why the fixpoint's yield is small.**
ADR-045's openness fixpoint ran thirteen rounds because openness flowed through seven internal
thresholds before it was published. A tier is published **immediately** — `tierFor` → an emission
struct → `checkPayload` → the stream. `packages/engine/src/events.ts:97` `checkPayload` is the
laundering site, and past it every consumer in the project reads contracts' `ResultTier`, where the
brand is gone.

---

## 2. PHASE 1 — the opaque-type fixpoint

Producer opaqued: **`tierFor`** (`packages/engine/src/rolls.ts:48`), the **sole** producer of a
`ResultTier` in `packages/engine/src`. Nothing else in engine source mints one; the only tier
literals in `src` are the ladder's own labels in `tunables.ts`.

```ts
declare const __TIER_FIXPOINT__: unique symbol;
export type OpaqueTier = { readonly [__TIER_FIXPOINT__]: "tier" };
export function tierFor(tunables: Tunables, margin: number): OpaqueTier { … }
```

**Three rounds to a fixpoint.**

| round | what `tsc` surfaced | classification |
|---|---|---|
| 1 | **29 assignments across 16 files** — every resolver's `check: { … tier: tierFor(…) }` | carriers, all of them |
| 2 | `CheckEmission.tier`, `PresnapEmission.tier`, `qbDecision`'s `options.tier`, `throwBall`'s `accuracyTier` widened → **4 terminals**: `events.ts:102` (`checkPayload`), `:188`, `:299`, `:315` | **the event boundary** |
| 3 | — | fixpoint (round 2's terminals cannot be widened without editing `packages/contracts`, which is out of scope) |

Round 1's 16 files: `game/specialTeams` (3), `resolve/ballCarrier` (4), `resolve/blitz` (3),
`resolve/runBlock` (3), `resolve/catchResolution` (2), `resolve/throwExecution` (2),
`resolve/tippedBall` (2), `resolve/zoneCoverage` (2), and one each in `resolve/anticipation`,
`manCoverage`, `passRush`, `pocketMovement`, `release`, `runGame`, `scramble`, `targetSelection`.

> ### ⛔ THE RESULT IS A NEGATIVE, AND IT IS THE MOST USEFUL THING IN THIS ADR.
> **Every one of the 29 is a carrier and every terminal is the event boundary. There is not one
> comparison, not one lookup, not one branch on a tier inside `packages/engine/src`.** The engine
> produces the ladder and publishes it and never reads it. Re-banding cannot change engine behaviour
> through the tier, because no engine behaviour is downstream of the tier.

**The boundary demonstrated rather than asserted:** `packages/calibration` was typechecked under the
same brand and surfaced **nothing of its own** — only the four engine-side boundary errors. Calibration
reads the tier off `MatchEvent`, which is contracts-typed, so an engine-side brand cannot reach it.
That is the limit in §6, produced as a measurement.

---

## 3. PHASE 2 — the reading pass, and the classification the owner asked for

### A. FLOOR — reads *"this tier or better"* by rank or by margin. **Safe under re-banding.**

| site | how it reads | verdict |
|---|---|---|
| `packages/engine/src/resolve/**` — every mechanic | **does not read the tier at all**; reads its own `band` table off `bandFor(t.bands, margin)` | safe by absence (ADR-011 working) |
| `calibration/test/ladderOccupancy.measure.test.ts:245-247` | `ladderOrder().slice(0, order.indexOf("STRONG_SUCCESS") + 1)` | **the model implementation.** Rank derived from the LIVE ladder — a new top rung is picked up automatically |
| `…measure.test.ts:266-268` | the same construction, as a `Set` | safe, same reason |
| `engine/test/rollAccounting.test.ts:223` | `accuracy.tier === payload.accuracyTier` — tier against tier, no literal | safe |
| `engine/test/qbDecisionTier.test.ts` (4 tests), `eventVocabulary.test.ts:64,146` | presence / absence only (ADR-005) | safe |

### B. EQUALITY — reads a rung by identity. **These change meaning.**

#### B1. ⛔ `packages/calibration/src/metrics/collect.ts:673-676` — a FLOOR WRITTEN AS THREE IDENTITIES

```ts
const rusherWon =
  band === undefined
    ? tier === "CRITICAL_SUCCESS" || tier === "STRONG_SUCCESS" || tier === "SUCCESS"
    : band.includes("RUSHER_WINS") || band.includes("RUSHER_BEATS");
```

**This is the site the owner's constraint was written to find.** Three things about it:

1. **It is a floor spelled as identities.** Today the disjunction is exactly `margin ≥ 5`. **Add a
   rung above `CRITICAL_SUCCESS` and the disjunction stops covering it** — the rusher who beat his
   blocker by the largest margin in the game is recorded as having **lost the rep**, and his blocker
   is credited with a win (`if (!rusherWon) b.wins++`, line 686). It fails in the *worst* direction,
   silently, in a per-player metric.
2. **It is DEAD today, so this is latent and not live.** `passRush.ts:82,98` gives every
   `pass_rush_tick` CHECK a band unconditionally, and `collect.ts:553` calls this only for
   `pass_rush_tick`. The `band === undefined` arm is unreachable on the committed tree — the same
   species as ADR-045 §1.3's `?? 0` sentinels: report, do not fix inside someone else's change.
3. **The two arms already disagree, and that is a finding independent of this ruling.**
   `band.includes("RUSHER_WINS")` matches only `RUSHER_WINS_REP` (`minMargin: 15`). The tier arm is
   `margin ≥ 5`, which is `BLOCKER_BEATEN`'s floor. **Two definitions of "the rusher won the rep",
   ten margin points apart, in one expression.** ADR-050 §4a measured the gap this covers: 31.871%
   versus 40.329% of §7.1 reps.

#### B2. ⚠ `packages/engine/test/tippedBall.test.ts:391` — the one LIVE equality consumer

```ts
const missed = events.some(
  ({ event }) => event.type === "THROW" && event.payload.accuracyTier === "CRITICAL_FAILURE",
);
```

§12.1's *"an uncatchable ball never triggers the system"* identifies "uncatchable" as **the open
bottom rung by name**. It is live: **55 of 371** accuracy checks over that test's own fixture and its
own 400 seeds. Its exact sensitivity to the new bottom boundary is §5.2.

#### B3. `calibration/test/ladderOccupancy.measure.test.ts:250-251` — hand-enumerated, two lines under A2

```ts
const predictedWon =
  (predicted.get("CRITICAL_SUCCESS") ?? 0) + (predicted.get("STRONG_SUCCESS") ?? 0);
```

The **observed** column beside it is rank-derived (§3.A) and picks up a new top rung; this
**predicted** column does not. They would disagree by exactly the new rung's occupancy, and the line
is a `console.log`, so it would mis-state ADR-050's own headline comparison without reddening
anything. *A derivation and its check drifting apart is the one failure a falsification harness
cannot report.*

#### B4. `calibration/test/ladderOccupancy.test.ts:144` — the seven bounded rungs, hand-listed

```ts
const widths = { STRONG_SUCCESS: 0.15, SUCCESS: 0.1, MARGINAL_SUCCESS: 0.04, TIE: 0.01,
                 MARGINAL_FAILURE: 0.04, FAILURE: 0.1, STRONG_FAILURE: 0.15 } as const;
```

This is ADR-050 §3's TARGET-invariance claim, and its membership is *"the rungs that are bounded"* —
**the exact property the ruling changes.** After the ruling the bounded set is nine, not seven, and
this literal will still name seven. It is an object literal, not a `Record<ResultTier, …>`, so it
does **not** fail to compile. The `[−71, −30]` window it pins is also a function of the bounded span
(ADR-050 §8: *"the TARGET window is [−71, −30] — either edge moving means a ladder floor moved"*), and
that span changes from 59 points to whatever the new rungs make it.

#### B5. `packages/engine/test/pocketStatus.test.ts:106-113` — the §7.1↔ladder tie, and it does not cover the extremes

```ts
const tier = (label: string): number =>
  TUNABLES.resultTierLadder.find((t) => t.label === label)?.minMargin ?? Number.NaN;
expect(band("RUSHER_WINS_REP")).toBe(tier("STRONG_SUCCESS"));   // + SUCCESS, MARGINAL_SUCCESS, TIE
```

This is **the instrument that holds ADR-033's argument** that §7.1's band floors are a projection of
the ladder. Two things the petition needs to know:

- **It names only the four interior rungs and neither extreme**, so re-bounding `CRITICAL_SUCCESS`
  and `CRITICAL_FAILURE` leaves it **green**. It is not an instrument for this change.
- **`?? Number.NaN` on both sides makes it blind to a symmetric rename.** `Object.is(NaN, NaN)` is
  `true`, so if a rung and its paired band were both renamed away, `expect(NaN).toBe(NaN)` **passes
  vacuously**. ADR-041's *"a cardinality cannot see a swap"*, one layer down: a *sentinel* cannot see a
  double miss. A `throw` on an unresolved label is the shape Charter §4.1 asks for.

#### B6. `calibration/src/knownTruth/ladderOccupancy.ts:593` — a reachable sentinel

`let worst: ResultTier = ladderOrder(tunables)[0] ?? "TIE";` — **`TIE` is a rung of the scale**, so
this is precisely Charter §4.1's forbidden default: *the supplied value must be unreachable on that
scale, or the expression must throw.* Latent (the ladder is never empty), reported not fixed, and
calibration's to rule on.

### C. NAME — renders or exports the tier's name. **The owner's stated reason this cannot wait.**

| site | what it does |
|---|---|
| `engine/src/debug/renderPlay.ts:305` | `PRESNAP_READ` → `… → READ_IT (STRONG_SUCCESS)` |
| `…:597-598` | `QB_DECISION` → `Tick 1.0: THROW → WR1 [CRITICAL_SUCCESS]` |
| `…:658` | §10.4 accuracy → `Result: GOOD (+34) [CRITICAL_SUCCESS]` |
| `…:775` | §11 catch → `Result: CONTESTED (+41) [CRITICAL_SUCCESS]` |
| `contracts/src/events.ts` `:132,:144,:192,:197` | the four exported payload fields — `PRESNAP_READ.tier`, `CHECK.tier`, `QB_DECISION.tier?`, `THROW.accuracyTier` |
| `engine/test/harness/playScope.ts:153` | `QB_DECISION: ["choice","target","tier"]` — the tier **value** is inside the play-scope football digest (ADR-045 §3a.2's exclusive-count instrument), so any re-banding moves those digests |

`bandOf()` (`renderPlay.ts:52`) is `payload.band ?? "-"` — it does **not** fall back to the tier, so
the four sites above are the complete renderer surface.

> **§17's printout is the tuning surface, and today it prints the word `CRITICAL_SUCCESS` on
> 24.850% of every symmetric opposed rep and `CRITICAL_FAILURE` on another 24.850%.** Half of every
> debug printout in the project is labelled "critical". That is ADR-050 §2 arriving where a human
> actually reads it, and it is the strongest argument that this is a naming defect and not a
> statistics curiosity.

**Tier literals that are minted but never read** — fixtures, listed so nobody mistakes them for
consumers: `engine/test/resultBands.test.ts:104` (`tier: "CRITICAL_SUCCESS"` on a synthetic §7.1
stream whose margin is a free parameter — tier and margin are *already* decoupled there),
`renderPlay.test.ts:261` (`"STRONG_SUCCESS"`), `statline.test.ts:240` (`"SUCCESS"`). All stay
compilable and stay meaningless; none needs a value for a new rung.

### D. Registers and pins — cardinality and digest

| site | behaviour when two rungs are added |
|---|---|
| `calibration/src/knownTruth/bandTables.ts` `RECORDED_CENSUS.rows` | **RED**, 119 → 121. `resultTierLadder` *is* discovered generically as a margin band table (it is not on `KNOWN_NON_MARGIN_LADDERS`); it contributes rows but no orderable columns, which is why ADR-037 recorded it as having no effect cells |
| `calibration/test/docConformance.test.ts:444` block-rule absorption | **RED**, `resultTierLadder.* :: STRUCTURAL :: 9 :: fnv1a:1cfe67ec` → 11 and a new digest |
| same file — absorbed population / numeric denominator / leaf-path digest | **RED**, 273 → 275, 706 → 708, digest moves |
| `calibration/test/ladderOccupancy.test.ts` | **RED** ×5 — `toHaveLength(9)` ×2 and three snapshots |
| `calibration/src/knownTruth/docConformance.ts:2573` `UNIFORM_REGIONS` | **GREEN, correctly.** Its `why` says *"True of any rung added later, because the doc's silence is the argument."* A register that anticipated its own extension — worth naming as the counter-example to the stale-register pattern this project keeps finding |
| `calibration/src/knownTruth/ladderOccupancy.ts` derivation machinery | **GREEN, correctly.** It derives floors, ceilings, widths and occupancies from `DEFAULT_TUNABLES.resultTierLadder` and is rung-count-agnostic. Under the experiment it printed the new eleven-rung interval table and the new occupancies unprompted |

---

## 4. ⚠ WHAT ACTUALLY GOES RED — MEASURED BY RUNNING IT, NOT BY READING IT

Charter §4.1: *an instrument with no failing case is not yet an instrument; it is a claim.* The
ruling's shape was applied as an experiment and everything below was **observed**. Experiment:
`OVERWHELMING_SUCCESS` at `minMargin: 60` above, `CRITICAL_SUCCESS` unchanged at 30,
`CRITICAL_FAILURE` bounded at `-59`, `CATASTROPHIC_FAILURE` at `NEG_INF` below. *(Values chosen to
exercise the shape. Calibration owns the real boundaries.)*

### 4.1 Compile

**5 errors, and every one is the same error:** the new label is not assignable to `ResultTier`.

| site | |
|---|---|
| `engine/src/rolls.ts:49` | `tierFor`'s return — **the one coupling in the engine**, and it exists only because `TUNABLES` is `as const`, so the ladder's labels carry literal types |
| `calibration/src/knownTruth/ladderOccupancy.ts:122,137,146,150` | `LadderTier.tier`, `ladderOrder`, `tierOfMargin` |

> **⛔ ALL FIVE ARE SEQUENCING ERRORS, NOT CONSUMER-CHOICE ERRORS. They exist only until
> `packages/contracts` widens the union, and then they are gone.** Re-typechecked with the widening
> simulated at the engine's producer: **`packages/engine` compiles CLEAN with eleven rungs.**
> **There is no site anywhere that will demand a value for the new rungs.** The owner's *"a
> `Record<ResultTier, …>` will become a compile error — that is the good case"* **does not occur in
> this tree.** Every tier-keyed structure is a `Map<ResultTier, number>`, which gains a key in
> silence.

### 4.2 Runtime

| package | result under the experiment |
|---|---|
| **`@ff/engine`** | **47 files / 788 passed, 1 skipped — 0 RED.** Determinism, game determinism, tunables threading, roll accounting, the 24-game tipped-ball corpus fence: **all green** |
| **`@ff/calibration`** | **10 RED** — the six §3.D pins, plus three `ladderOccupancy` snapshots and its printer |

> **THE ENTIRE INSTRUMENT POPULATION FOR THIS CHANGE LIVES IN `packages/calibration`.** The engine
> ships the ladder, publishes it on every event, prints it in §17 — and **cannot fail on it.** Backlog
> entry 55's question, answered in the direction nobody wants: *what would make the engine notice?*
> **Nothing does.**

---

## 5. Would anything change SILENTLY? — the owner's first question, answered in two parts

### 5.1 The counterfactual as posed is not representable

> *"…if the two extreme rungs were re-bounded with no new rungs added."*

**That cannot be expressed.** `rolls.ts:31`'s `bandFor` walks a descending list of **floors** and
returns the first row the margin clears. A row has `label` and `minMargin` and **no ceiling**. The top
row is open *because nothing is above it*, and the bottom row is open because `bandFor` falls through
to it. **Bounding either extreme requires a rung beyond it.** The owner's *"bound the extreme rungs,
and add a rung above and below"* is therefore not two instructions that could have been given
separately — it is one operation described twice, and the ruling is internally forced.

The only extreme re-banding available *without* new rungs is moving the ±30 floors, which changes the
open rungs' occupancy while leaving them open. Under that, and stated because it is the residue of the
question: **`pocketStatus.test.ts` stays green** (§3.B5 — it names only the interior four), **the §17
printout changes the word it prints with no instrument watching**, and **`tippedBall.test.ts:391`
changes its population** — §5.2.

### 5.2 Is any equality consumer relying on `CRITICAL_*` being reached at 24.850%? — one is, and here is its price

`tippedBall.test.ts:391` (§3.B2) is the only live one. Measured on its own fixture
(`buildDeflectionScenario`) and its own 400 seeds — **371 accuracy checks, margins spanning
[−57, +63]**:

| new bottom rung's floor | throws that leave `CRITICAL_FAILURE` | share of the detector's current 55 | test still green? |
|---|---|---|---|
| **−60 or below** | **0** | 0% | yes — and **inert**, which is the safe case |
| −50 | 6 | **10.9%** | yes |
| −40 | 22 | **40.0%** | yes |
| −30 | all 55 | 100% (rung degenerates) | yes |

> **⚠ THE ROW THAT MATTERS IS THE "TEST STILL GREEN?" COLUMN: it is `yes` on every line.** The
> detector loses up to 40% of its population and §12.1's *"an uncatchable ball never triggers the
> system"* quietly becomes a claim about a smaller and differently-shaped set of throws, and **nothing
> reddens.** This is a hard constraint on calibration's derivation, so it is stated as one:
> **a bottom-rung floor at or below −60 leaves this consumer untouched; anything above it changes what
> §12.1 tests, silently.** The right fix is not a boundary chosen to dodge it — it is to re-express the
> filter as *"the worst rung the ladder has"*, derived, the way §3.A's rank-slice does.

**✅ AND THE CONSTRAINT DOES NOT FIGHT THE RULING — checked, because it easily could have.** The
owner's target is *"low single digits on an even contest"*. On a symmetric opposed roll a floor at
−60 is **8.200%** (confirmed against the experiment: calibration's own derivation printed
`CATASTROPHIC_FAILURE 8.200`), −75 is **3.250%**, −80 is **2.100%**. **Every floor that satisfies "low
single digits" is already at or beyond −60**, so the §12.1 filter is inert under any boundary the
ruling would accept. The constraint binds only if the derivation lands *short* of the owner's target,
which is exactly when someone should be told.

For completeness, the top: the experiment's `OVERWHELMING_SUCCESS` at +60 moved **3 of 91**
`CRITICAL_SUCCESS` throws out of that rung on the same fixture. No consumer noticed.

**Nothing else relies on the 24.850%.** §3.B1 is dead code; §3.B3–B4 are calibration's own pins and
would move loudly or be re-derived; §3.C is text.

---

## 6. `kick_return`'s two roll forms — is any consumer keyed on `CheckKind` assuming one?

**Confirmed at the producer**, so ADR-050 §5's finding is restated here as a fact about source lines
rather than a census result:

| line | form |
|---|---|
| `engine/src/game/specialTeams.ts:196` | `kick_return` — **d100 vs `ko.touchbackTarget`**, a real target check that spans the ladder |
| `engine/src/game/specialTeams.ts:378` (`distanceCheck`) | `kick_return` return distance **and** `punt` gross — **d20 vs a neutral die**; the file header declares these tiers meaningless |

**Answer: one consumer is keyed on `CheckKind` alone, and it is a declaration rather than a
mechanic — but it is worded as if the kind were the whole story.**

| consumer | keyed on | verdict |
|---|---|---|
| `ladderOccupancy.ts:497` `foldLadder` | **`${kind} ${form} ${die} ${shift}`** | ✅ **does not assume one form.** The two `kick_return` structures land in different cells by construction, and `form`/`die`/`shift` are *derived from the stream* rather than declared |
| `…measure.test.ts:232-235` the d20-exclusion gate | die-filtered first (`!isD100(c)`), then compared to the declared kind set | ✅ sound — the assertion is about *(kind, die)* even though the constant is about *kind* |
| `ladderOccupancy.ts:409` `LADDER_READERS_WITHOUT_SCALE` | **`CheckKind` alone** | ⚠ reads as *"this kind has no scale"*, which is **false of `kick_return`'s d100 touchback check** |
| `ladderOccupancy.ts:435` `DECLARED_NON_LADDER_EMISSIONS` | **`CheckKind` alone**, with `die: "d20"` as a **sibling scalar**, not per-kind | ⚠ same shape. Its own doc comment (`:430-433`) states the two-form problem correctly, so the prose knows what the type does not |

**Nothing is wrong today** — the only gate that reads them applies the die filter itself. But the two
exported constants are the kind of surface a future consumer reads as a per-kind exclusion, and it
would then drop a real d100 ladder reader. **Keying both on `(kind, die)` removes the class.**
Calibration's to rule on; reported here because the ruling puts new eyes on the ladder.

**Engine side: no consumer at all is keyed on `CheckKind` for tier purposes**, because the engine has
no tier consumers (§2).

---

## 7. What this derivation CANNOT cover — stated plainly

1. **⛔ IT STOPS AT THE EVENT BOUNDARY, AND THAT IS WHERE ALL THE CONSUMERS ARE.** The fixpoint
   terminates at `events.ts:{102,188,299,315}`. Past those four lines every consumer in the project
   reads contracts' `ResultTier`, and **an engine-side brand cannot reach them** — demonstrated, not
   assumed: `packages/calibration` typechecked under the brand and surfaced nothing of its own.
   **Everything in §3 past the boundary is a reading pass over grep on field names, which is not a
   derivation.** Its silence means *not observed*, never *none*.
2. **The other half of the fixpoint has not been run, and it is the half that would bound the
   consumer class.** Branding `ResultTier` **inside `packages/contracts/src/events.ts`** and walking
   `tsc` to a fixpoint over all eight packages would derive the past-boundary set the way §2 derived
   the pre-boundary set. **`packages/contracts` is out of this dispatch's scope by standing
   instruction.** ⚠ **This is the strongest recommendation in this ADR: run it as step 1 of the
   petition, before the union is widened**, because the petition is going to hold the contracts write
   anyway and the brand costs one `declare const` and a revert. Everything in §3.B and §3.C would then
   be a compiler output rather than my reading.
3. **A label consumer is invisible to both halves.** Even a contracts-side fixpoint sees only the
   *type*; a renderer interpolating `${p.tier}` into a string is type-correct forever. §3.C is a
   reading and must be **redone whenever the ladder changes** (ADR-045 §1.4's rule, inherited).
4. **`tierFor` being the sole producer is asserted by nothing.** §2's completeness rests on it. A
   resolver that hand-typed a tier literal, or a second producer added later, is outside every
   instrument in this ADR — and would not fail to compile.
5. **Consumers that do not exist yet are the entire point and are unmeasurable.** `apps/game` has one
   `.tsx` file and no tier reference; `packages/narrative` has one source file. **The UI play log and
   the narrative triggers are the consumers the owner named, and they will read the NAME (§3.C), not a
   floor.** Nothing here can constrain code that is not written; §3.C is the register they will have
   to be checked against.
6. **No football claim.** Where the new boundaries go is calibration's derivation and the owner's
   ruling. §5.2's −60 is a *constraint on one consumer*, not a proposal.

---

## 8. What would make THIS instrument go red (backlog entry 55)

**The honest answer for the fixpoint itself is: nothing. It is an enumeration, not a gate** — the
shape ADR-048's harness recorded, where the instrument has no failing case and its **controls** carry
the burden. It is run, read, and reverted; it leaves no artefact in the tree that CI could fail.

So the burden is stated as controls, and **each was run**:

| control | what it establishes | observed |
|---|---|---|
| the brand produces errors at all | the fixpoint is not vacuously silent | 29 errors, round 1 |
| the fixpoint terminates on the boundary and not on exhaustion | the walk was complete, not abandoned | round 3 empty; the four terminals are all `MatchEvent` assignments |
| the cross-package arm surfaces nothing | the boundary is real and not an artefact of which project was compiled | calibration: 0 own errors |
| a **known positive** — the ruling's own shape applied | the audit's predictions are testable | 5 compile errors, 10 calibration reds, **0 engine reds** — §4 |
| the known positive is reverted cleanly | no experiment leaked | tree hash `a8126b6f…` identical before and after, three times |

**And the one thing that would make the §3 register WRONG rather than red:** a new producer of
`ResultTier` that does not go through `tierFor` (§7.4), or a consumer added past the event boundary
after this date. Neither has an instrument. **The register must be re-derived, not re-read, when the
rungs land** — and step 1 of §7.2 is how to do it properly.

---

## 9. Verification

- `pnpm typecheck` (root, all 8 packages + `apps/game`, including every `test/`) — **clean**.
- `pnpm test` (root) — contracts **12**, playbook **1,267**, engine **788** (+1 skipped),
  calibration **501** (+39 skipped). **All green.**
- **Nothing changed.** `git status --porcelain` clean over `packages/` at the end; the tracked-tree
  hash over `packages/` is **`a8126b6f5949383505d2c06cb85aad86f3a3129b`** both before and after, and
  was re-verified after each of the three experiments (fixpoint, rung-addition typecheck,
  rung-addition test run). No untracked files left behind.
- **`packages/contracts` and `packages/calibration` never edited** — every experiment was confined to
  `packages/engine/src/{rolls,events,tunables}.ts` and one temporary probe file under
  `packages/engine/test/`, all reverted or deleted.
- **`passRush.bands` not moved.** §7.1's `minMargin` is 15 and is ruled; nothing here touches it.
- Experiments run and reverted: (1) `tierFor` opaqued, 3 rounds; (2) two rungs added + extremes
  bounded, typechecked engine and calibration; (3) the same, engine suite and calibration suite run;
  (4) a temporary probe measuring accuracy-margin tails, deleted.

## Decision

_Pending owner + Orchestrator._ **This ADR proposes no change.** It reports the consumer register the
ruling was gated on, and makes one process recommendation: **§7.2 — run the contracts-side fixpoint as
step 1 of the `ResultTier` petition, before the union is widened.**
