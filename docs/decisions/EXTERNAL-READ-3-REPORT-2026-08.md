# EXTERNAL READ 3 — REPORT

**Responds to:** `docs/decisions/EXTERNAL-READ-3-BRIEF-2026-08.md`
**Repo:** `https://github.com/remie1/football-franchise`
**Pinned:** `41f37e9` — verified by diff to be the brief's stated tree (`74fa244`) plus exactly one file, the brief itself. Every line number cited below was re-checked at this pin; every run below was executed on this tree.
**Reviewer:** Claude (external), 2026-08-03.
**Run corpus (all arms):** 12-team flat league, `SYNTHETIC_ROUND_ROBIN` rounds 1 (66 games), seed `baseline-0001`, in-process executor, vitest execution path.

> This document is a distillation of the review session, not a verbatim transcript. Companion artifacts: `sack-anchor-probe.patch` (the engine patch, sandbox-only, applies clean at `41f37e9`) and `probe.arrival.test.ts` (the eight-arm runner).

---

## 1. Scope and discipline

Read order followed the brief: engine and calibration source first, `ARCHITECTURE_CHARTER.md` and `docs/decisions/` after, the corpus treated as testimony throughout. The withheld directional expectation was respected in the strong form: `PREREGISTRATION-EXT-4-rep-cadence.md` was deliberately not opened, and no expectation-recording document was sought. For the record, the corpus is genuinely balanced on this question — ADR-058 argues *for* arrival authority; entry 105 records an owner arrival-floor hypothesis *refuted* against its own pre-registered falsifier — so nothing read here leaked a lean even accidentally. The answer in §4 is derived from the code and from runs executed during the review.

One disclosure, because the corpus has a scar in exactly this shape (ADR-059 row 4; entry 127): the probe is a **patched clone with a `globalThis` toggle** — the same shape as the external rig that became a provenance problem. The differences are stated rather than assumed: the patch is disclosed in full (companion `.patch`), the flag-unset invariant was **verified at intake** (flag unset reproduces the pristine tree's accumulator exactly), and flag-set at committed values was verified **accumulator-identical** to flag-unset (§5). No roll is added or removed on either setting.

---

## 2. Verification of the brief's claims

| claim | status | note |
|---|---|---|
| `passPlay.ts:567-574` ARRIVED publication is hard-coded `etaTick > tick`, never reads the tunable | ✅ VERIFIED BY READ | |
| `hasArrived` and `pocketFloorFromArrival`'s first branch read the identical `minTta <= immediateWithinSeconds`; label and event coincide only at committed `0.0` | ✅ VERIFIED BY READ | `rushThreat.ts:538-545, 589-602` |
| `tunables.ts` `sackWhenNoTarget` comment ("actually ARRIVED (`etaTick <= tick`)") is committed-point-true, false at any other horizon | ✅ VERIFIED BY READ | entry 126 finding 8's class |
| `quantizeSeconds = 0.5`; any horizon in `[0, 0.5)` ≡ `0.0` | ✅ VERIFIED BY READ | grid, not continuum |
| `tier1.ts` — exit and entry/exit quotient have no real side by ruling; `sack` 6.560% is the only real target | ✅ VERIFIED BY READ | `tier1.ts:453-551` |
| `pocketChannelShares.ts:357-367` dead code | ✅ VERIFIED BY CONSTRUCTION | `POCKET_STATUS` never published during pursuit (`passPlay.ts:593` gate, ADR-055), so the `pursuitDeadlineTick !== undefined` branch inside that event case is unreachable |
| Horizons classified `NEITHER_RULED_NOR_DERIVED` in the register | ⚠ NOT RE-CHECKED AS STATED | Verified: no derivation exists in `tunables.ts` for either constant, and ADR-058's entry-110 amendment records both **unmarked**. The register row itself (`docConformance.ts`) was not re-read. |
| Sweep figures: committed `16.51%`; I-extinct `8.277%`; one step `+22.759pp`; arrival-extinct `0.974%` | ✅ REPRODUCED BY RUN (n=66) | `16.901%` / `8.697%` / `+21.68pp` / `0.890%` — direction and magnitude reproduce closely at small n, on an independent execution |
| Established #1, second leg: "extinction arm: `27,944` disrupted, `0` sacks, `0` COLLAPSING/IMMEDIATE ticks" | ⛔ CORRECTED | §3 below |
| Established #2: "the counter is closed by ceiling" | ⚠ RESCOPED | true at the committed point; the ceiling is arrival-imposed — §3 |

---

## 3. Correction: the extinction triple is a conflation, and #1/#2 are one fact

Entry 126 carries **both** figures for the arrival-extinct arm: its table says `sack = 0.974%`; its finding-8 prose says `0 sacks, 0 COLLAPSING/IMMEDIATE ticks`. The brief inherited the prose. The run refutes the prose as an arm description:

- **My arrival-extinct arm (all three horizons `−10`):** 3,807 disrupted dropbacks — scale-equivalent ≈ 28.6k at 496 games, matching the quoted `27,944` — with **63 sacks (0.890%)**, **2,662 COLLAPSING ticks**, **123 IMMEDIATE ticks**, 1,032 `POCKET_DURESS` throwaways, 97 escapes. The table's figure is the arm; the prose's zeros are not.
- **The narrow claim the prose was reaching for survives, and is now verified:** physical arrival has no mechanical consumer. With `hasArrived` structurally off, every sack in the arm routes counter → `forcesDecision` → failed escape. Twenty-eight thousand rushers physically reach the passer to no direct effect.
- **Corollary — Established #2 is a committed-point fact, not a property of the counter.** The counter's ceiling is imposed by the arrival channel ending plays before counters can climb. Extinguish arrival and the counter wakes up and becomes the model's main forcing channel. Established #1 and #2 are one fact: arrival dominates *because it acts first*, and every other channel's measured inertness is downstream of that.

Hazard-class note, in the corpus's own terms: a figure travelled without its context into the brief that warns about figures travelling without their context. Found by running, not by testimony.

---

## 4. The answer

**The question:** should pocket severity derive from `minTta` at all — or from what actually happened to the passer?

**The either/or is a category mistake the codebase has already half-corrected** (ADR-033 split outcome from status; ADR-055 split pursuit from pocket; the ARRIVED publication split the physical event from the label). Severity does three jobs, and the answer differs per job:

**a. As the cause-side input to the passer's next action** (accuracy, read capacity, forcing) — severity must derive from world-state, and `minTta` is the right world-state. At decision time nothing has "happened to the passer" yet; deriving the input to his behavior from his behavior is circular. ADR-058's football argument stands: after a won rep, the operative fact is how much time the passer has. The extinction arm is fresh evidence — remove the channel and the model produces a football absurdity (0.9% sacks against ~28k physical arrivals). **Yes: the forcing gradient should keep deriving from `minTta`.**

**b. As the sack trigger** — the opposite, and this is where the model is wrong by its own documents' lights. `match-engine.md` §7.2's SACK line reads "rusher reaches QB before ball released" — a physical event. The tunables comment believes the code implements that. The code implements horizon-arrival, coinciding with the physical event only at `0.0`. **The sack — the only quantity in this registry with a real side — should key on the physical event the stream already publishes** (`etaTick <= tick`, the ARRIVED predicate). At committed values this changes nothing (proven bit-identical, §5), so it is not a value choice and there is no threshold to sweep. It is a re-anchoring: the sack stops being downstream of a label constant and becomes downstream of an event. The `+22.759pp` step and the `8.277%` cell then stop being reachable states of the sack model — they were never sack physics; they were the label leaking into the outcome.

**c. As the published record** — "what happened" is the right anchor here too, but as measurement, post-hoc, in the pattern `geometryTimeRetirement.ts` already establishes. IMMEDIATE promises "in the QB's face"; if its boundary floats with an unruled constant, every horizon sweep silently redefines every historical status figure — the mechanism that produced entry 82. Related finding rather than quibble: **the second horn names something the contracts cannot currently express.** There is no passer-effect ontology — no HIT event (tier1's dropped fourth disjunct exists because of this), and the one passer-adjacent event published, ARRIVED, has zero mechanical effect. The cheapest honest version of that horn is exactly the re-anchoring in (b), because it consumes the one such event already on the stream.

> **In one sentence: derive the gradient from `minTta`, derive the sack from what happened, and stop letting one unmarked constant be both — the defect isn't which side of the disjunction is true, it's that `immediateWithinSeconds` currently sits astride it.**

---

## 5. The probe — re-anchoring measured

**Patch (companion `.patch`):** behind `globalThis.__FF_PHYS_SACK`, the arrival conjunct of the no-target sack at `passPlay.ts:996` is replaced with physical arrival (`minTta <= 0`); counters are added at the three `sack()` sites (`noTarget`, `escapeFail` named/unnamed, `clock`). No roll added or removed on either setting.

**Intake invariants, both held:** flag-unset reproduces the pristine tree's run exactly (5,840 dropbacks / 987 sacks / 4,623 disrupted); flag-set at committed values is **accumulator-identical** to flag-unset — the re-anchoring is provably a no-op today.

| arm | horizons | anchor | sack | paths (noTarget / escapeFail) | scrambles |
|---|---|---|---|---|---|
| A1 | committed (I=0.0) | label | 16.901% | 620 / 367 | 951 |
| A2 | committed | physical | 16.901% | 620 / 367 | 951 |
| B1 | I=0.5 | label | 38.581% | 2,182 / 21 | 78 |
| B2 | I=0.5 | physical | 16.957% | 614 / 390 | 968 |
| C1 | I=−10 | label | 8.697% | 0 / 518 | 1,169 |
| C2 | I=−10 | physical | 16.955% | 618 / 362 | 958 |
| D1 | all=−10 | label | 0.890% | 0 / 63 | 97 |
| D2 | all=−10 | physical | 18.318% | 1,124 / 2 | 3 |

**Findings:**

1. **The cliff is label-leak, almost in its entirety.** The I=0.5 step is `+21.68pp` label-anchored and `+0.06pp` physically anchored — despite IMMEDIATE ticks more than quintupling (853 → 4,658), i.e. the QB genuinely forced earlier and charged −30 accuracy on thousands more ticks.
2. **The mechanism of the cliff is branch order.** The sack test (`:996`) runs *before* the pocket-movement branch (`:1005`). At I=0.5 the label-anchored model sacks at `minTta 0.5` before movement is ever consulted: B1's scrambles collapse 951 → 78, escape-fail sacks 367 → 21. Raising the horizon does not make the QB fail under pressure more — it deletes the step-up/escape/throwaway mechanic from the reachable state space. That is what `+22.759pp` was measuring.
3. **Re-anchored, the sack is invariant to the labelling layer.** Physically anchored sack across {I=0.5, 0.0, −10} is 16.96 / 16.90 / 16.96% — flat across the axis, committed path mix intact — while the IMMEDIATE label all but vanishes in C2 (2 ticks against 980 sacks). Label and outcome become independent axes.
4. **D2 bounds the gradient from below.** With the entire gradient dead, sacks rise to 18.3% through a legible mechanism: nothing forces a decision early (scrambles = 3), the QB stands holding the ball, and 1,124 physical arrivals find him still there, gated through counter-COLLAPSING. The gradient does real football work — it is what makes quarterbacks move — but it should never have been the sack definition.
5. **The three-site counter is complete:** `pathSum === sacks` on all eight arms; there is no fourth sack site. This ~15-line attribution is the instrument the corridor dispute needs more than another grid.
6. **A self-correction from the counters:** the residual extinction-arm sacks are **not** coverage sacks — the `clock` path fired zero times on every arm at this n (`CLOCK_EXPIRED` throwaways soak that population). D1's 63 sacks are all failed counter-forced escapes.

---

## 6. What this leaves

- With the sack re-anchored, the committed `+10pp` overshoot against real `6.560%` is unambiguously a **supply-and-travel** problem — entry 104's `T` curve and the `INTERPRETATION`-marked `travelSecondsByAlignmentAndMove` / dominance shave, where ADR-058's entry-110 amendment already relocated the revisit obligation — because those are the only levers that move when rushers physically arrive. This is also entry 128's relabelling remark carried to its conclusion; the corridor question dissolves rather than resolves, and was not adjudicated here per the brief.
- The horizons' remaining question — how early proximity should start degrading and forcing the passer — is **separable and sweepable without touching the outcome**, bounded below by D2.
- The counter is the model's only sustained-duress channel and is dormant at committed values (C2/D2 show it waking). It can now be ruled on its own football merits instead of inheriting whatever the sack rate needed.
- One stream-consistency dividend: the hard-coded ARRIVED publication acquires a mechanical consumer, so ADR-007's cause-then-effect reading — arrival published, then the status it causes, then the sack it causes — becomes true of the sack rather than committed-point-true.

---

## 7. Reproduction

Apply `sack-anchor-probe.patch` at `41f37e9`; drop `probe.arrival.test.ts` into `packages/calibration/test/`; run `TEAMS=12 npx vitest run test/probe.arrival.test.ts` from `packages/calibration`. Eight arms complete in ~70 seconds; the counters require the in-process executor (the default). Caveats: n=66 games per arm; small-n figures reproduce the 496-game canonical closely but should be re-run at n=496 before any figure is cited; seed `baseline-0001` throughout.
