# ADR-069 (DESIGN): The defensive call has three parts — FRONT & BLITZ, PRE-SNAP MASK, POST-SNAP ROTATION

- **Date:** 2026-10-14
- **Proposed by:** Orchestrator, on the owner's review of ADR-068 §9
- **Status:** **ruled in part** *(owner, 2026-10-14)* — §8's questions 1, 3, 4, 5, 6 approved; 2 EXPANDED
  into the owner's catalogue (§9). Three new questions in §10.
- **Builds on:** ADR-067 (shown/played pair), ADR-068 step 1 (the coverage read). Neither is reopened.

---

## ⛔ WHAT THE OWNER'S REVIEW SAID *(owner, 2026-10-14)*

1. ✅ **`int_rate` tightening stops here.** ADR-068 §9 measured 1.831% → 1.819% on the synthetic
   league. The owner: *"Isn't the NFL's interception rate at 2%? That would put 1.8+% close enough to
   move on from tightening for now."* Recorded in §7; the repo gate is unchanged and still reads
   `FAIL (known)` (see §7 for why that is not the same number).
2. ⛔ **Disguise is a CALL FREQUENCY, not a per-play property.** The owner's figure: defences call a
   disguised look on **30–33% of passing snaps**. *"That doesn't necessarily mean that 30% of the
   plays should have disguises. It just means that plays with disguises in them were called 30% of
   the time."* Today two cards carry a disguise, hard-wired, and they are **~14%** of pass attempts.
3. ⛔ **A defensive call is three separable parts**, and the corpus should say so:

| part | owner's example | what it decides |
|---|---|---|
| **Front & Blitz** | "Nickel Odd Double A" | personnel, who lines up where, who rushes |
| **Pre-Snap Mask** | "Show 2" / "Sky Mask" — both safeties ~15 yards deep, balanced, faking Cover 2 | what the offence SEES before the snap |
| **Post-Snap Rotation** | "Roll 3" / "Cover 3 Buzz" — one safety to the deep middle, the other down to rob intermediate lanes | what is actually PLAYED |

---

## 1. WHERE EACH PART LIVES TODAY

| part | in the tree | separable today? |
|---|---|---|
| **Front & Blitz** | the card's `front` string, its `RUSH` duties, its stunt, its `blitzDisguise` | ⛔ **no, and §3 argues it should stay bound to the card** |
| **Pre-Snap Mask** | `shows:` written **inline on individual duties** of two cards (Cover 3 Sky, Cover 1 Rat), plus a card-level `coverageDisguise` | ⛔ **no.** A mask is not a thing with a name; it is a few lines copied into a card. Cover 3 Sky is ALWAYS disguised and Cover 3 Buzz NEVER is |
| **Post-Snap Rotation** | the card's played duties → `DefensivePlayCall.assignments` | ✅ yes — this is what a card already is |

**The engine already handles all three.** It reads `shownAssignments` (the mask's output) and
`coverageDisguise` (its §5.1 complexity row) from the call, rolls the coverage read, and resolves
the play against `assignments`. **Nothing in this ADR changes the engine's rules.** The work is in
the playbook (what a mask is) and the caller (how often one is called).

---

## 2. THE PROPOSAL — a mask is a named piece, drawn AFTER the card

### 2.1 A mask is a catalogue entry, not card text

```ts
// packages/playbook — new
interface CoverageMask {
  readonly id: "SHOW_2" | "SHOW_1";       // v1 catalogue, §2.2
  readonly name: string;                  // "Show 2"
  readonly shows: Partial<Record<DefensiveRole, ZoneDuty>>;  // shown duty for each role it MOVES
  readonly requires: MaskRequirement;     // §2.3
}
type MaskTiming = "EARLY" | "LATE";       // EARLY → §5.1 ROTATED (+10), LATE → LATE_ROTATION (+20)
```

A mask states the shown duty only for the roles it moves; every other defender shows what he plays.
`instantiateDefense(card, unit, look, mask?)` builds `shownAssignments` from the mask the same way
it builds them from inline `shows` today, and **mirroring flips the mask with the card** (the
existing `mirrorZoneDuty` already flips `shows`).

### 2.2 The v1 catalogue — two masks, each early or late

> ⛔ **SUPERSEDED by §9.2** — the owner's ruling on question 2 replaced this two-mask catalogue with
> the owner's own (four shells and three position masks). Kept as written for the record.

| mask | shown | played under it | real-football name |
|---|---|---|---|
| **Show 2** | both safeties at two-high depth, balanced (`DEEP_HALF` LH / RH) | any single-high rotation: Cover 3 (Sky, Buzz, pressure), Cover 1, Fire Zone | "two-high, roll to one"; the owner's "Sky Mask" |
| **Show 1** | one safety in the deep middle, the other walked down (robber / box) | any two-high rotation: Cover 2, Tampa 2, Quarters, Cover 6, Cover 2 Man | "one-high, spin to two" |

Show 2 is **exactly** what Cover 3 Sky and Cover 1 Rat write inline today, so those two cards lose
their inline `shows` and become ordinary rotations that the Show 2 mask can be laid over — Sky is a
safety-force rotation, not a disguise, and it is now playable from an honest look.

**Timing** is the §5.1 complexity row the engine already has: an EARLY rotation (safeties move
before the snap, QB can see the end of it) is ROTATED (+10); a LATE one (held until the snap) is
LATE_ROTATION (+20). Split 3 : 1 early : late — `CHOSEN — provenance NONE`.

### 2.3 Which masks can sit over which rotations — checked by the validator

A mask is legal over a card only when all of these hold. Like ADR-022's disguise rows, it is
**stated and then checked**, never inferred:

1. **Every role the mask moves is on the field.** Show 2 needs both `S_F` and `S_S`, and both must
   be able to reach their played duty from the shown spot (a safety shown at two-high depth can
   rotate to the middle, the flat, the hook or a man assignment; he cannot become a rusher).
2. ⛔ *(AMENDED by §9.4: the shown DUTIES must differ, not the shell — the owner's Quarters
   conversion keeps the middle open and changes the coverage under it.)* **The shown shell differs from the played one.** Show 2 over Cover 2 is not a disguise; it is
   Cover 2. A mask that changes nothing would be a die that turns nothing (ADR-005), so the validator
   refuses it rather than letting it count toward the disguise rate.
3. **Excluded families:** `COVER_0` (its two-high lie is already the pressure axis's `ZERO` row,
   §5.3's +25 — one lie must not be charged twice), `PREVENT`, `GOAL_LINE`.

### 2.4 How the caller picks a mask

After `selectDefensiveCard`, on a **new** PRNG address:

```
card  = selectDefensiveCard(snapRng.fork("defense-card"), situation)   // unchanged
mask  = selectMask(snapRng.fork("defense-mask"), card, situation)      // new: a mask, or none
```

- **The die is rolled only when the card has a legal mask** (ADR-005).
- **The mask never changes the played coverage or the rush.** So `COVERAGE_SHELL_USAGE` and
  `BLITZ_RATE_PRIOR`, which the card weights were built to hit, are untouched **by construction** —
  the existing `distribution.test.ts` keeps asserting them without a change.
- **Existing draws keep their addresses.** The card and the offensive concept land on the same seeds
  as today; only the shown look differs.
- The draw happens inside `resolveSnap`, which both callers share, so the offence's caller and the
  defence's caller agree on the mask the same way they already agree on the card.
- **One league-wide mask rate** for v1 (a tunable in `distribution.ts`), chosen so the share of pass
  snaps with a mask lands in 30–33%. From the card weights: 96 of 105 weight units can carry a mask
  (Show 2 over 56, Show 1 over 40), so a per-card rate of ~0.345 gives ~31.5% overall.
  ⚠ That arithmetic ignores the situational filters (downs, distance, field region); the calibration
  run in §4 is what sets the number.
- **Later, a defensive coordinator trait.** A coordinator who disguises more is a franchise-level
  property; the league-wide rate is its default, not its replacement.

### 2.5 What the stream carries

`DefensivePlayCall` gains `mask?: { readonly id: string; readonly name: string }` — **a contracts
change, petitioned here.** The engine echoes it on `PLAY_START.defense` (engine-owned payload). The
coverage read does not need it (it reads `shownAssignments` and `coverageDisguise`); the UI, the
narrative layer and calibration's per-mask breakdown do. The call's display name becomes the three
parts: **"Nickel Over · Show 2 · Cover 3 Sky"**. The existing `call` field keeps the card name, so
nothing keyed on it breaks.

---

## 3. WHY FRONT & BLITZ STAYS ON THE CARD (for now)

The mask is separable because **it changes nothing after the snap** — every defender ends up where
the rotation puts him, so any legal mask over any legal card is a legal play. The front and the
pressure are not like that: a five-man pressure takes a coverage defender away, so the rotation
behind it has to be written knowing who left. Every card is validated for gap integrity and deep help
as a whole (`validate.ts`); splitting front from rotation means validating every combination.

That is doable, but it is a separate decision with a separate cost, and it does not move the disguise
rate. **Recommendation:** the three-part NAME now; a composable front × rotation only if the owner
wants the playbook itself built that way (§8 Q5).

---

## 4. CALIBRATION — the disguise rate becomes a measured number

- **New metric `disguise_rate`:** pass snaps whose `PLAY_START.defense.coverageDisguise` is not
  `BASIC`, divided by pass snaps. Read off the stream, like every other metric.
- **Target band 30–33%**, owner-stated. ⚠ No source for it is on file in the repo, so it is
  **reported in the calibration report, not gated**, until one is.
- Reported alongside, per mask (Show 2 / Show 1) and per timing, so a rate that hits the band by
  using one mask for everything is visible.
- **Pressure disguise is not counted** in this number (it already has its own row: `blitzDisguise`,
  and `BLITZ_RATE_PRIOR`'s disguise mix). §8 Q3 asks whether the owner's 30–33% meant both.

---

## 5. BUILD ORDER

> ⛔ **SUPERSEDED by §9.6.**

1. **Playbook:** the mask catalogue, the §2.3 validator rules, `selectMask`; Cover 3 Sky and Cover 1
   Rat lose their inline `shows`. Tests: every illegal pairing is refused; every family in §2.3's
   lists has at least one legal mask; mirroring flips the mask.
2. **Contracts + caller:** `mask` on `DefensivePlayCall` (on ruling); the draw in `resolveSnap`; the
   engine echoes it. `shownAssignmentsStream.test.ts` narrows from "these two calls differ" to
   "shown differs **if and only if** a mask was drawn".
3. **Calibration:** `disguise_rate`, then set the mask rate from a run. Three arms (§Conjoined) on
   `int_rate`, completion and `disguise_rate`.
4. Then **ADR-068 step 2** (`discipline` + the 0–100 leash) resumes.

---

## 6. WHAT THIS DOES TO int_rate — a prediction, written before the run

ADR-068 §9 found the coverage read moves `int_rate` very little: disguised-call INT rate was 1.90%
with or without the read, and a fooled QB reached the trap on 13% of fooled plays. Raising the
disguised share from ~14% to ~31% should therefore move `int_rate` **by less than 0.1 percentage
point**. `CHOSEN — provenance: extrapolated from ADR-068 §9's diagnostic, not measured.` If it moves
more, that is news about the read, not about masks.

---

## 7. RECORDED: the owner's int_rate ruling

- **Ruling (owner, 2026-10-14):** ~1.8% is close enough; stop tightening `int_rate` for now.
- **What the gate says, unchanged:** the repo's real-data baseline is **2.28%** with a ±15% band
  (1.94%–2.62%) — `packages/calibration/src/metrics/tier1.ts`, `interceptionRate`. 1.82% is ~20%
  under it, so the row keeps reading `FAIL (known)`, as it has since backlog 95.
- **Not done:** the band is not widened and the baseline is not edited. The owner's "about 2%" and
  the repo's 2.28% are different windows of real data; reconciling them is a data question, not a
  tuning one, and nothing here depends on it.

---

## Provenance of factual claims — REQUIRED

| claim | provenance |
|---|---|
| Disguise on 30–33% of passing snaps | **REPORTED** — owner, 2026-10-14, "a stat I saw"; no source on file |
| ~14% of pass attempts carry a disguise today | **COMPUTED** — ADR-068 §9 arm, 1,680 games; agrees with weight share 15/105 = 14.3% |
| 22 cards, total weight 105; Sky 12, Rat 3 | **COMPUTED** — `DEFENSIVE_CARDS` from built `@ff/playbook`, this session |
| Show 2 eligible weight 56, Show 1 40, excluded 9 | **COMPUTED** — same table, by `family`; excluded = Cover 0 (3), Prevent (1), Goal line (5) |
| Per-card mask rate ~0.345 → ~31.5% | **COMPUTED** from weights; ⚠ ignores situational filters |
| Show 2 = what Sky and Rat write inline | **COMPUTED** — read from `defensiveCards.ts` (both safeties `shows` `DEEP_HALF` LH/RH) |
| Engine needs no rule change | **COMPUTED** — engine reads only `shownAssignments` + `coverageDisguise` (ADR-068 step 1, `passPlay.ts`) |
| §5.1 complexity rows ROTATED +10, LATE_ROTATION +20 | **COMPUTED** — `tunables.ts` `presnap.coverageRead.complexity` |
| int_rate baseline 2.28%, ±15% | **COMPUTED** — `tier1.ts` `interceptionRate` and its backlog-95 note |
| Early : late = 3 : 1 | **CHOSEN — provenance NONE** |
| int_rate moves < 0.1pp | **CHOSEN** — extrapolated, §6 |
| Mask names "Show 2", "Show 1" | **CHOSEN** — owner's "Show 2"; "Show 1" by symmetry |
| Cover 0 excluded to avoid charging one lie twice | **CHOSEN** — football judgement, on ADR-022's `ZERO` row |

## Conjoined mechanisms — REQUIRED

This ADR rules on **masks as pieces** and **how often they are called**. Those are one operation —
a mask with no draw is never called, and a rate with no mask has nothing to count. **But Show 2 and
Show 1 are separately priceable** (different rotations underneath, different traps), so the §5 step 3
run measures **three arms: Show 2 only, Show 1 only, both**, each at the target rate.

## Implied scope — REQUIRED

- **Pressure masks** ("show blitz, bail"; simulated pressure; creepers) — the same three-part logic on
  the rush side. Belongs with ADR-068's pressure read (step 6 / D). `unruled`.
- **Shown corner technique** (press shown, bail played) — a mask could move corners too; v1 moves
  safeties only. `unruled`.
- **Box count shown** — Show 1 walks a safety down, which a run read would see; no run read exists
  yet (ADR-068 step 3). `unruled`.
- **Run plays** — the defence draws blind to run/pass, so masks appear on run snaps too. Harmless
  today (nothing reads the shown look on a run); a run read would. `unruled`.
- **Defensive coordinator disguise trait** — franchise domain. `unruled`.

## Decision

Pending the owner — §8.

---

## 8. Questions for the owner

1. **Masks as their own named pieces, drawn after the card, never changing what is played.**
   Approve?
2. **v1 catalogue: Show 2 (two-high shown, one-high played) and Show 1 (one-high shown, two-high
   played), each early or late.** Approve, or add one?
3. **The 30–33% counts coverage disguises only**, with pressure disguises measured separately.
   Yes, or should it include pressure disguise?
4. **One league-wide mask rate now; a defensive coordinator trait later.** Yes?
5. **Front & Blitz stays bound to the card** (three-part name only), rather than becoming its own
   composable piece. Yes, or build the full composition?
6. **Contracts change:** add `mask` (id + name) to the defensive call. Approve?

---

# 9. ✅ RULINGS *(owner, 2026-10-14)*

| # | question | ruling |
|---|---|---|
| 1 | Masks as named pieces, drawn after the card, never changing what is played | ✅ **YES** |
| 2 | v1 catalogue: Show 2 and Show 1 | ⛔ **EXPANDED.** *"We need more."* The owner supplied a catalogue of four primary masks and three position masks; §9.2 replaces §2.2 with it |
| 3 | The 30–33% counts coverage disguises only | ✅ **YES** |
| 4 | One league-wide mask rate now; a defensive coordinator trait later | ✅ **YES** |
| 5 | Front & Blitz stays bound to the card; the call is named in three parts | ✅ **YES** |
| 6 | Contracts: `mask` (id + name) on the defensive call | ✅ **YES** — petition approved |

Same message: the branch carrying ADR-067 B and C, ADR-068 and its step 1, and this ADR's first draft
was merged to `main` on the owner's word (fast-forward, `1161e7f`).

## 9.1 The owner's catalogue *(REPORTED — owner-supplied, with links the owner cited; not opened here)*

The disguise works on the quarterback's first question: is the **middle of the field** open (two
safeties wide) or closed (one safety in the middle)?

- **Four primary masks (the shells):** Two-High (MOF open) · Single-High (MOF closed) · Cover 0
  ("mugged up", simulated pressure) · Split-Field (lop-sided corners).
- **Three that use other positions:** Press-Bail (corners) · Robber (a safety) · Defensive line
  stemming.

## 9.2 Each mask, mapped onto the game

| mask | moves | shown before the snap | played under it (corpus rotations, weight of 105) | can the game do it today? |
|---|---|---|---|---|
| **Two-High** | safeties | both safeties at deep halves, each on the side of the duty he will play | single-high rolls — Cover 3 (Sky, Buzz, Nickel Pressure, Base), Cover 1 (Man Free, Rat, Double A, Base, Dime Man Pressure, Base Run Blitz), Fire Zone — **56** | ✅ **yes.** The look shows a hole the rotation fills — step 1's trap |
| **Two-High, Cover 2 look** *(the owner's "passive Cover 2 → aggressive Quarters match")* | safeties + corners | safeties at deep halves, corners squatting in the flats | Quarters, Dime Quarters, Cover 6 — **24** | ⚠ **half.** The hole shot between a squat corner and a half safety looks open and the Quarters corner is there: works. The flat that looks covered by the squat corner and isn't needs §9.3 |
| **Single-High** | safeties | free safety in the deep middle; strong safety walked down on his side (hook/curl, over the tight end) | two-high spins — Cover 2, Tampa 2, Base Cover 2, Quarters, Dime Quarters, Cover 6, Cover 2 Man — **40** | ✅ **yes.** The deep sideline looks open against one-high and the spinning safety is there — the owner's own description of why it works |
| **Robber** | — | **the Two-High look** | **Cover 3 Buzz is already the robber rotation** — the strong safety drops to the middle hook | ✅ **yes, nothing to build.** Robber names the ROTATION, not the mask: "Two-High · Cover 3 Buzz" is the owner's robber, and the slant it robs is the trap step 1 built (§10 Q2) |
| **Split-Field** | corners | one corner pressed (a man look), the other off at 10 yards | they flip at the snap: the pressed corner bails deep, the off corner drives the flat — **Cover 6 shown as its own mirror** | ⛔ **no.** A card can only SHOW a zone (`ZoneDuty.shows`, `defense.ts`); a pressed man look is not expressible, and the lie it tells is §9.3's |
| **Press-Bail** | corners | both corners pressed | deep-zone corners: Cover 3 family, Fire Zone, Quarters | ⛔ **no** — as Split-Field |
| **Cover 0 (mugged)** | safeties + front | no safety deep; safeties and backers in the A/B gaps, looking like seven or eight rushers | a simulated pressure: four rush (one a backer), the rest drop into zone. ⛔ **No such card** — Fire Zone and Cover 3 Nickel Pressure send five | ⛔ **no.** The rush SHOWN does not exist (ADR-068 §1), and the blitz read is rolled only when a PLAYED rusher is unblocked (`blitz.ts`, ADR-005) — a phantom blitz is invisible to it. Its two effects in the owner's description, the line blocking the wrong men and the quarterback throwing hot into a dropper, are both ADR-068 step 3 |
| **DL Stem** | front | the line one gap over from where it plays | the card's front | ⛔ **no.** Needs the shown front and a protection that is set against it and then re-identified (ADR-068 steps 3 and 5). The false start it draws needs a penalty producer: `penalty_check` has none (ADR-068 step 7) |

**Phase 1 covers every mask the game can already resolve,** and it is enough for the rate: cards
carrying 96 of the 105 weight units can wear at least one of Two-High, Two-High Cover 2 look or
Single-High, unchanged from §2.4's arithmetic.

## 9.3 The second lie — a man who LOOKS covered and is open

Step 1 built one kind of lie: **the look shows a hole the rotation fills.** Press-Bail, Split-Field
and the squat corner in the Cover 2 look tell the opposite one: **a receiver who looks blanketed,
and is open at the snap.**

This is not a new ruling. ADR-068 §5, approved as its ruling 4, already says perceived openness is
computed against the shown coverage, including *"a perception-only fork"* where a real defender is
shown in a different role. Step 1 built only the trap case (`zoneCoverage.uncoveredOpenness` for a
man nobody is shown on). **Phase 2 builds the rest of §5 as ruled:**

- A card may SHOW a man look: `shows` widens from a zone to a zone or a pressed/off man duty.
- A fooled quarterback moves the open-but-covered-looking man to the back and reads him skewed DOWN
  (perceived minus actual, now negative); one who sees through it moves him up.
- ⚠ The RECEIVER is fooled by Press-Bail too — he plans a release against press. That is ADR-068
  step 4 (receiver reads), and until it lands Press-Bail fools the quarterback only.

## 9.4 How masks combine, and what is legal

- **Masks are grouped by what they move: safeties, corners, front.** A call wears at most one per
  group, and no two masks may move the same player. "Two-High + Press-Bail" over Cover 3 — the
  commonest modern two-high disguise — is legal once Phase 2 lands. (§10 Q1.)
- **One die decides "disguised or not"** (ruling 4); a second picks among the legal combinations.
  Front masks get their own die and their own rate, measured separately (ruling 3).
- **§2.3 rule 2 is amended:** the shown duties must differ from the played ones; the shell need not.
  The owner's Quarters conversion keeps the middle open and changes the coverage under it. Each mask
  still names its legal rotations, stated and then checked, so no mask can drift onto a rotation it
  does not disguise.
- **§2.3's Cover 0 exclusion stands** for a PLAYED Cover 0 (its two-high lie is the `ZERO` row). The
  owner's Cover 0 MASK is the opposite case — shown Cover 0, played something else — and is legal.
- **Sides:** in Two-High each safety shows the half on the side of the duty he will play (his zone's
  lane, his man's side, else his run fit's side); in Single-High the free safety shows the middle and
  the strong safety walks down on his own side. On Cover 3 Sky and Cover 1 Rat this reproduces step
  1's hand-written shows exactly.

## 9.5 §5.1 complexity per mask

§5.1's target is `50 + Defensive Disguise Rating + complexity`, rows *rotated shell* +10 and *heavy
disguise (late rotation)* +20.

- Two-High, Single-High: a safety rotation → **+10 early, +20 late.** From the spec.
- Two-High Cover 2 look over Quarters: the middle stays open, the coverage changes → treated as a
  rotation, **+10 / +20.** `CHOSEN`.
- Corner masks: the bail happens at the snap → **+10.** `CHOSEN — provenance NONE`.
- §5.1's **Defensive Disguise Rating** — how WELL a defence disguises, not how often — is the natural
  home of ruling 4's coordinator trait. Not built here.

## 9.6 Build order *(replaces §5)*

| phase | what lands | engine change? | measured on |
|---|---|---|---|
| **1 — now** | Two-High, Two-High Cover 2 look, Single-High; the draw; `mask` on the call and on `PLAY_START`; `disguise_rate`; mask rate set to land 30–33%. Sky and Rat lose their hand-written shows | **none** | `disguise_rate`; `int_rate` and completion as guards. ⛔ Arms: each mask alone, then all three |
| **2** | shown man looks; §9.3's second lie; Press-Bail, Split-Field, and combinations with Phase 1's masks | coverage read only | completion and `int_rate` on the disguised share |
| then | **ADR-068 step 2** — `discipline` + the 0–100 leash | | as ADR-068 |
| **3**, with **ADR-068 step 3** | the shown rush; the pressure read rolled against it; protection adjustment; a simulated-pressure card; the Cover 0 mask; DL Stem without false starts | pressure read | `sack_rate` (moves the "wrong" way, correctly) |
| with **ADR-068 step 7** | the false start a stem draws | penalties | false-start rate |

§6's prediction stands for Phase 1: `int_rate` moves by less than 0.1 percentage point.

### Provenance — additions for §9

| claim | provenance |
|---|---|
| The catalogue in §9.1–9.2 and its football descriptions | **REPORTED** — owner, 2026-10-14, with cited links not opened here |
| Weights 56 / 24 / 40, 96 of 105 maskable | **COMPUTED** — `DEFENSIVE_CARDS` from built `@ff/playbook`, by family |
| Cards can only show a zone | **COMPUTED** — `defense.ts`, `ZoneDuty.shows?: ZoneDuty` and the MAN duty's `shows?: ZoneDuty` |
| The blitz read is rolled only when a played rusher is unblocked | **COMPUTED** — `resolve/blitz.ts` header (ADR-005) |
| No penalty producer exists | **COMPUTED** — `penalty_check` listed as waiting for mechanics, `game/events.ts:60`; ADR-068 §3 |
| Cover 3 Buzz is the robber rotation | **COMPUTED** (S_S plays `MIDDLE_HOOK@C`) + **CHOSEN** (that this is the owner's robber) |
| Split-Field is Cover 6 shown as its mirror | **CHOSEN** — a football reading of the owner's description |
| Safety sides in §9.4 reproduce Sky's and Rat's hand-written shows | **COMPUTED** — Sky S_S `FLAT@LW` → LH; Rat S_S man on #2 left → LH; S_F takes RH in both |
| Two-High Cover 2 look and corner masks complexity rows | **CHOSEN** — §9.5 |

### Implied scope — additions for §9

- A **Cover 1 Robber** card (a safety robs while the rest play man) does not exist; Rat's low-hole
  player is a linebacker. Authoring. `unruled`.
- Single-High walks a safety into the box: a **run read** would see the extra man (ADR-068 step 3's
  run-side form). `unruled`.
- **Corners showing off-coverage in Two-High** — Phase 1's Two-High moves the safeties only; the
  corners show what they play. `unruled`.

---

## 10. Questions for the owner

1. **Masks grouped by what they move** (safeties, corners, front), at most one of each per call —
   so "Two-High + Press-Bail" is one call. Yes?
2. **Robber is the rotation under a Two-High look, not its own mask** — Cover 3 Buzz already is
   it. Yes?
3. **Order:** Phase 1 now; corner masks next; then the leash; the front masks with the pressure
   read. Yes?
