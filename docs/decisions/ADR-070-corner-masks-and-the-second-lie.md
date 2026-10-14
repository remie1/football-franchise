# ADR-070 (DESIGN): Corner masks and the second lie — ADR-069 Phase 2

- **Date:** 2026-10-14
- **Proposed by:** Orchestrator, building ADR-069 §9.6 in the order the owner ruled (§10 ruling 3)
- **Status:** **proposed** — four questions in §8. Nothing here is built.
- **Builds on:** ADR-069 (masks as named pieces; §9.3 the second lie; §9.4 combinations; §10's
  rulings), ADR-068 §5 (a misread is perceived against the SHOWN coverage — its "perception-only
  fork" was left to the build, and §3 below is that form). Neither is reopened.

---

## 0. What the owner is deciding

Phase 1 taught the defence one lie: **the look shows a hole the rotation fills.** Phase 2 adds the
opposite one: **the look shows a man blanketed, and he is open at the snap** — a corner pressing
the receiver he is about to bail from. It needs four things, and each is a question in §8:

1. **Two corner masks**, Press-Bail and Split-Field (§1).
2. **Combinations** — one safety mask and one corner mask on the same call, as ruled (§2).
3. **What a fooled quarterback believes** about a man the look shows covered (§3). This is the
   engine change, and it also touches Phase 1's masks.
4. **A contracts change:** the call names a LIST of masks instead of one (§4).

---

## 1. The two corner masks

| mask | moves | shown before the snap | played under it | share of dropbacks under those rotations ¹ |
|---|---|---|---|---|
| **Press-Bail** | corners | both corners pressed on the #1 receiver to their side — a man look | the corners' own deep zones: Cover 3 (Sky, Buzz, Nickel Pressure, Base), Fire Zone, Quarters (Nickel, Dime) | 53.8% |
| **Split-Field** | corners | the quarter-side corner pressed; the cloud-side corner off and deep | they flip at the snap: the pressed corner bails to his deep quarter, the deep-looking one drives the flat. **Cover 6 shown as its own mirror** | 8.3% |

¹ COMPUTED from ADR-069 §11's all-masks arm, by played family (Cover 3 30.6%, Fire Zone 7.4%,
Quarters 15.9%; Cover 6 8.3%).

- **No corner mask over man coverage.** Cover 1, Cover 2 Man and Cover 0 already press with their
  corners, so a pressed look over them is the truth.
- **A shown press needs a man to press.** The mask is drawn before the offence's formation is known
  (the caller draws the card, then the mask, then the concept). Against a formation with no #1 to
  a corner's side, that corner shows what he plays. The rule is the one man coverage already has
  for an absent man (`ifAbsent`), applied to the look.
- **Complexity row (§5.1):** a corner bail is **+10**, as ADR-069 §9.5 already chose. A call
  wearing two masks takes the **larger** of their rows — it is still one look, read once.
  `CHOSEN — provenance NONE`.

## 2. Combinations, and how often

**The rate does not change.** One die still decides whether a call is disguised (ADR-069 ruling 4,
`COVERAGE_MASK_RATE`), so the disguise rate stays at the owner's 30–33%. The corner masks change
**which** disguise a call wears, not how often one is worn. A second pick chooses among the legal
combinations, at equal weight (`CHOSEN — provenance NONE`; it becomes a defensive coordinator's
tendency when ruling 4's trait lands):

| played rotation | legal looks after Phase 2 |
|---|---|
| Cover 3, Fire Zone | Two-High · Press-Bail · **Two-High + Press-Bail** (the owner's "commonest modern two-high disguise") |
| Quarters | Two-High Cover 2 look · Single-High · Press-Bail · Single-High + Press-Bail |
| Cover 6 | Two-High Cover 2 look · Single-High · Split-Field · Single-High + Split-Field |
| Cover 1 | Two-High |
| Cover 2, Cover 2 Man | Single-High |
| Cover 0, Prevent, goal line | none |

**Two masks may never move the same man** (ADR-069 §9.4). The Two-High Cover 2 look moves the
corners as well as the safeties, so it combines with nothing.

## 3. The second lie — what a fooled quarterback believes

**The rule.** For every receiver, the quarterback's belief is the **typical outcome** of the
coverage the look shows on him, computed by the same band tables that resolve the played coverage,
at the middle of the die instead of a roll:

| shown on him | what he believes |
|---|---|
| nobody | `zoneCoverage.uncoveredOpenness` (90) — exactly Phase 1's value |
| a man, pressing or off | the man-coverage band at margin = his mods − the defender's mods (the two d100s cancel at their mean) |
| a zone defender | the zone band at the mean d100 against that defender's target |

- **A trap** is a receiver whose shown belief is HIGHER than the typical outcome of what is played
  on him (Phase 1's case). **A hidden man** is one whose belief is LOWER (Phase 2's case). Equal
  beliefs are no lie, and a play with no lie rolls no read (ADR-005, as now).
- **Fooled** (MISREAD, COMPLETE_MISREAD): traps go to the front of his progression and read high,
  as now; **hidden men go to the back and read low.** The size of each lie on the read is belief
  minus what is really there, published as the named modifier on `QB_READ` it is today.
- **Sees through** (GOOD, PERFECT): traps to the back, as now; **hidden men to the front.**
- **Anything between:** order as called, as now.

**No new die.** ADR-068 §5 left a "perception-only fork" open for this case. The typical outcome
needs no roll, so nothing new is published but the modifier, and no physical result can change.
`CHOSEN` — the alternative, rolling the shown contest on its own fork, would put a CHECK on the
stream for a contest that never happened.

**Worked example** — Quarters wearing Press-Bail, left #1 on a hitch. Shown: the left corner
pressing him; with equal ratings his belief is the man band at margin 0, `EVEN_BRACKET`, **25**.
Played: the corner bails to his deep quarter, which starts a band above the hitch, and no Quarters
defender's zone reaches the short band in the left lane — so the hitch is open, **90**. A fooled
quarterback reads a wide-open hitch at 25, last. That is the owner's Press-Bail: *he sees press,
expects the quick throw to be smothered, and lets it go.*

**⚠ The lie is only as big as the hole the rotation leaves.** Over Cover 3 Sky the same hitch
breaks into the strong safety's flat zone (the flat spans the backfield and short bands, two lanes
wide), so there the belief (25) and the truth (20 at equal ratings) barely differ. How often a
pressed receiver's route breaks into a hole is what arm C measures.

**⚠ This also changes Phase 1.** Today only "shown nobody, played somebody" is a lie. Under this
rule, a receiver shown one defender and played another (a deep post under a two-high look the
free safety actually rotates over) can be a trap or a hidden man too, if the two defenders'
ratings differ. That is why the measurement in §5 prices the rule alone, on Phase 1's masks,
before adding any corner mask.

## 4. Contracts, and what else changes shape

**The petition (contracts):**

```ts
// DefensivePlayCall — replaces `mask?: CoverageMaskRef`
/** The masks the call wore (ADR-069/070): at most one per group, never two on one man. Absent ⇒ none. */
readonly masks?: readonly CoverageMaskRef[];
```

`CoverageMaskRef` is unchanged (`id`, `name`). A renderer names the call "Nickel Over · Two-High +
Press-Bail · Cover 3 Sky" by joining the names.

**Not contracts:**
- `PLAY_START.defense.mask` (engine payload) becomes `masks`, `[]` when none.
- Playbook's `shows` widens from a zone to a zone or a shown man (`{ kind: "MAN", target, technique }`).
  `shownAssignments` already carries man assignments — `CoverageAssignment` is man or zone — so
  the shown look needs no new contract type.
- Calibration's `disguise_mask_mix` keys by the combination (`TWO_HIGH+PRESS_BAIL`).
- **Caller v4** = v3 + corner masks. A new version, by `CallerVersion`'s own criterion: the call
  mix changes, so a v4 batch must not trend against a v3 one.

## 5. Measurement, and a prediction written before it

Paired arms on ADR-069 §11's seeds (`adr-068:step1-arm`, 1,680 games):

| arm | what it prices |
|---|---|
| A — v3 today | the baseline (ADR-069 §11: `int_rate` 1.849%, completion 37.23%) |
| B — v3 + §3's rule | the rule alone, on Phase 1's masks |
| C — v4, Press-Bail only | Press-Bail |
| D — v4, Split-Field only | Split-Field |
| E — v4, everything | joint |

**Prediction** *(`CHOSEN` — extrapolated, not measured)*: the hidden-man lie costs the offence
**completions**, not interceptions — a fooled quarterback passes on an open man and throws later,
away, or not at all. So completion falls and throwaways and sacks rise a little; `int_rate`
moves less than completion does. **Falsified if** completion does not fall in C, or `int_rate`
moves more than completion.

Reported per arm: `disguise_rate` (must stay 30–33%), `disguise_mask_mix`, completion, `int_rate`,
yards per attempt, sack and throwaway rates, and throws to a hidden man.

## 6. Build order

1. **Playbook:** `shows` widens to a shown man; Press-Bail and Split-Field in the catalogue; legal
   combinations stated and checked; the second pick. Tests as Phase 1's: every stated pairing
   against every formation, played coverage untouched, no die when nothing is legal.
2. **Contracts + caller:** `masks` (on ruling); caller v4; the engine echoes `masks`.
3. **Engine:** §3's rule, behind arm B first.
4. **Calibration:** the arms; the rate re-checked; results into this ADR.

---

## Provenance of factual claims — REQUIRED

| claim | provenance |
|---|---|
| Corner duties per card (deep zones in Cover 3, Fire Zone, Quarters; press man in Cover 1, Cover 2 Man, Cover 0; Cover 6 split) | **COMPUTED** — `DEFENSIVE_CARDS` from built `@ff/playbook`, this session |
| Dropback shares by played family | **COMPUTED** — ADR-069 §11 all-masks arm, 148,845 dropbacks |
| `uncoveredOpenness` 90; man band `EVEN_BRACKET` 25 at margin 0; zone target 50 + Zone Coverage ÷ 5 | **COMPUTED** — `engine/src/tunables.ts`, `resolve/zoneCoverage.ts`, `resolve/manCoverage.ts` |
| `shownAssignments` can already carry a man assignment | **COMPUTED** — `CoverageAssignment = ManAssignment \| ZoneAssignment`, `contracts/src/playcalls.ts` |
| The caller draws card, then mask, then concept | **COMPUTED** — `calibration/src/caller/frozen.ts`, `resolveSnap` |
| Corner bail +10; a combination takes the larger row | **CHOSEN — provenance NONE** (+10 is ADR-069 §9.5's choice) |
| Equal weights across legal combinations | **CHOSEN — provenance NONE** |
| Belief = the band at the mean of the die, no roll | **CHOSEN** — the form ADR-068 §5 left open |
| The hitch is open under Quarters and covered under Cover 3 Sky | **COMPUTED** from zone spans (`playbook/src/coverage.ts`) and the cards' duties; the hitch's cell (short band, #1's own lane) **INFERRED** from the route table (`Hitch`: 4–9 air yards, no lane travel) |
| Two-High + Press-Bail is the commonest modern two-high disguise | **REPORTED** — owner, ADR-069 §9.4 |
| Completion falls more than `int_rate` moves | **CHOSEN** — a prediction, §5 |

## Conjoined mechanisms — REQUIRED

Three mechanisms: **§3's rule, Press-Bail, Split-Field.** The rule is separately priceable — it
changes Phase 1's masks on its own — so it gets arm B. **The corner masks are NOT priceable without
the rule:** a pressed look shows somebody on the receiver, which today's trap test ignores, so
corner masks without §3 are worn and inert (as Single-High over Cover 2 Man is, ADR-069 §11.3).
Each corner mask is then priced alone (C, D) and jointly (E).

## Implied scope — REQUIRED

- **The receiver is fooled by Press-Bail too** — he plans a release against press. ADR-068 step 4
  (receiver reads). Until then Press-Bail fools the quarterback only. `unruled`.
- **Single-High over Cover 2 Man stays inert** under §3: every receiver is manned in both looks, by
  the same man. What it hides is help over the top, which no read models. `unruled`.
- **The reverse corner lie** — off coverage shown, press played — is not in the owner's catalogue.
  `unruled`.
- **Run plays** wear corner masks too (the defence calls blind); nothing on a run reads them. `unruled`.
- **Defensive coordinator tendencies** — the combination weights are the natural place for ruling
  4's trait. `unruled`.

## Decision

Pending the owner — §8.

---

## 8. Questions for the owner

1. **Press-Bail over Cover 3, Fire Zone and Quarters; Split-Field over Cover 6.** Yes?
2. **A fooled quarterback believes the shown coverage's typical outcome** — so the look can make an
   open man look covered, as well as a covered man look open. No extra dice. Yes?
3. **Contracts: the call carries a list of masks** (at most one per group) instead of one. Approve?
4. **The disguise rate stays at 30–33%;** corner masks change which disguise is worn, not how
   often. Yes?
