# ADR-068 (DESIGN): The pre-snap phase is READ, then DECIDE — for every offensive position, against the whole defence

- **Date:** October 2026
- **Proposed by:** Orchestrator, on the owner's review of ADR-067 §E's design
- **Status:** **ruled in part** *(owner, October 2026)* — see §8. Questions 1–5 ruled; 6 (motion) held for discussion.
- **Reframes:** ADR-067 §E and §D. A, B and C stand as landed.

---

## ⛔ WHAT THE OWNER'S REVIEW CHANGED

ADR-067 §E's draft had one roll and one consequence: the quarterback recognises the coverage or
does not, and the windows he throws into look wider or not. **The owner rejected that shape on
three grounds:**

1. ⛔ **A read is not a window modifier — it feeds a DECISION.** A quarterback who reads the
   coverage correctly does not get a wider window; he learns a route is dead and stops planning to
   throw it. Recognition must be followed by a pre-snap decision step whose outputs are things the
   offence CHANGES — progression order, the play itself, the snap — and how far he may stray from
   the call is set by **the coach's leash** and the player's **discipline**.
2. ⛔ **"Coverage recognition" is half a read.** A quarterback who reads the coverage perfectly and
   misreads who is coming is sacked in four seconds. The read covers **coverage AND pressure**:
   how many are on the line, who looks like he is coming, where the extra man is.
3. ⛔ **Every offensive position reads.** The line reads tells and pressure side and adjusts
   protection; receivers read leverage and press; the back reads his pickup. A quarterback-only
   phase models one man of eleven.

> ## ✅ **THE PHASE IS: THE DEFENCE PRESENTS A LOOK → EACH OFFENSIVE GROUP READS ITS PART OF IT → THE OFFENCE DECIDES WITHIN ITS LEASH → THE PLAY RESOLVES AGAINST WHAT WAS PLAYED.**

---

## 1. THE LOOK — what the defence presents

Everything a read can be about, and where it lives today.

| element of the look | in the tree today? |
|---|---|
| **Coverage shown** — who appears to have whom / which zone | ✅ `shownAssignments` (ADR-067 §A), on `PLAY_START` (§B) |
| **Safety structure** — MOFO/MOFC (§5.2) | ✅ **derivable** from shown zone cells; no new field |
| **Run fits shown** — who is in the box and where | ✅ `runFit` on each assignment (§C) |
| **Rush shown** — who is on the line, who walks up, the box count | ⛔ **absent.** `rush` is the played truth only. A `shownRush` is §D's data and is the pressure half of every read below |
| **Technique shown** — pressed or off | ⚠ played only (`technique`). Shown technique rides on `shownAssignments` for free — a man assignment carries it |
| **Leverage / shade** — inside or outside a receiver | ⛔ **absent from the vocabulary.** A receiver's read of leverage has no subject until it exists |
| **Tells** — a lineman's stance, hips, weight | ⛔ **absent, and should stay absent as a field.** A tell is not something a card states; it is what a read ROLL discovers about a rush move already on the card |

---

## 2. READ — per position group

Each read is a roll that produces a **perceived picture**, published to the stream, never a
modifier. The picture can be right, partly right, or wrong — and the decision step acts on the
picture, not on the truth.

**Graded, not binary.** `match-engine.md` §5.1 already specifies a six-band ladder for the
coverage read: *perfect read · good read (shell) · adequate (MOFO/MOFC) · partial (uncertain) ·
misread (wrong shell) · complete misread (inverted)*. That ladder is the shape for every read here:
**how much** of the look he got, and whether what he missed he missed by not knowing or by being
wrong. *Not knowing* and *being wrong* lead to different decisions, and a binary hit/miss cannot
tell them apart.

| group | what it reads | rolls today | what the read can change |
|---|---|---|---|
| **QB — coverage** | shell, MOFO/MOFC, which receiver is the one the look lies about | ⛔ **none.** `coverage_read` is a contracts `CheckKind` with **no producer** | progression order, hot/sight adjustments, audible, kill |
| **QB + C — pressure** | box count, likely blitzers, pressure side | ✅ §5.3 blitz recognition (`blitz.ts`, `+0/15/20/25`) — ⚠ **fires only when a rusher is unaccounted**, and is binary | protection call (slide / keep a back in), hot routes, audible |
| **OL** | pressure side, Mike identification, DL tells (likely rush move) | ⛔ none | slide direction (with C), anticipated move → the `pass_rush_rep` contest |
| **WR / TE** | press vs off, inside/outside leverage | ⛔ none (`release_vs_press` resolves press but nobody READ it) | release plan into `release_vs_press`; sight adjustment (`option_route` — another `CheckKind` with **no producer**) |
| **RB** | his pickup — which linebacker is his if he comes | ✅ partly, inside `blitz_pickup` | stay in vs release; who he picks up |

**One read or many?** ⚠ The QB's coverage and pressure reads are **two rolls**, not one: different
attributes (coverage is Awareness + Football IQ per §5.1; pressure adds the centre per §5.3),
different disguise scales, and — the owner's own example — they fail independently. They share a
DECISION step, not a die.

---

## 3. DECIDE — what the offence can change before the snap

The decision step reads the perceived pictures and picks from a menu. **Every option is a stream
event**, so a reconstructed play says what was seen, what was decided, and what was played.

| decision | who | what it changes | exists today? |
|---|---|---|---|
| **Stick with the call** | QB | nothing — always available, and the default under a short leash | — |
| **Re-order the progression** — move a receiver he likes up, a dead one down or off | QB | `readOrder` | ✅ **the seam exists**: hot conversions already re-order `readOrder` in `preSnap.ts` |
| **Hot / sight adjustment** on one route | QB + receiver | that route | ✅ hot routes (ADR-022); ⛔ sight adjustments none |
| **Protection adjustment** — slide toward pressure, keep the back in | QB + C | protection pairing | ⛔ this is **ADR-067 §D**. It moves `sack_rate` the "wrong" way, correctly |
| **Audible** — change the play | QB | the whole offensive call | ⛔ §5.4 specified (Football IQ vs defence adjustment speed, critical failure = miscommunication); **the corpus carries no audible options** and the frozen caller says so (`caller/frozen.ts:36`) |
| **Check-with-me** — two plays called in the huddle, QB picks at the line | QB | the whole offensive call | ⛔ none; a narrower, authorable form of audible |
| **Hard count / delayed snap** — buy information or draw the defence offside | QB | a second pressure read with a bonus; a chance at `snap_jump` | ⛔ `snap_jump` and `penalty_check` are `CheckKind`s with **no producer**; risk is a false start |
| **Motion** — send a man across to see who follows (man) or who bumps (zone) | QB | a second coverage read with a bonus | ⛔ motion is **out of scope in ADR-067**, because it needs positions the tree does not have. ⚠ **Proposed: motion as an INFORMATION ACTION only** — it buys a better coverage read and changes no alignment, so it needs no coordinates |

---

## 4. THE LEASH — how far the quarterback may stray, and whether he does

**Two quantities, owned by different people, that multiply:**

- **Leash** — how much freedom the COACH grants: which decisions above are allowed at all.
  Proposed three levels: **NONE** (run the call; only hot routes the protection forces), **LIMITED**
  (re-order, hot/sight, protection), **FULL** (adds audible, check-with-me, hard count, motion).
  ⛔ **This is a decision type, so it carries an authority tag (Iron Rule 6): `COACH`.** The human
  sets it in the gameplan; an NPC coach derives it from his attributes and his perception of the
  quarterback (Spec #11 — `playCalling`, `inGameAdjustment`; the perception system decides how well
  he knows his own QB).
- **Discipline** — whether the PLAYER stays inside the leash when his read says otherwise. A
  disciplined quarterback who misreads still runs the call; an undisciplined one who misreads
  freelances into the misread.

**The owner's quadrant, which is the point of having both:**

| | **good reader / decision-maker** | **poor reader / decision-maker** |
|---|---|---|
| **long leash** | ✅ best case — adapts to what the defence gives | ⛔ worst case — acts freely on wrong pictures |
| **short leash** | ⚠ wasted — sees it and cannot act | ✅ protected — the plan covers for him |
| **high discipline** | stays inside whatever leash he has | stays inside — **discipline matters most here** |
| **low discipline** | strays, usually productively | strays into his misreads |

⛔ **A FINDING THAT BLOCKS THE LEASH AS DESCRIBED: THERE IS NO `discipline` ATTRIBUTE.**
`ATTRIBUTE_REGISTRY_V1` (`contracts/src/registry.ts`) has `gapDiscipline` (DL/OL/LB, run fits) and
nothing for anyone else. `attributes.md:72` names "awareness/discipline" as an inference target from
pre-snap penalty rates, so the idea is in the docs; the attribute is not in the registry. Adding it
(ALL positions, `mental`) is a registry petition.

---

## 5. HOW A MISREAD BECOMES AN INTERCEPTION — without a new magnitude

ADR-067 §E's draft left the size of the misread as an open number. **This shape removes it.**

On a failed coverage read the quarterback's **perceived** openness for a receiver is computed
against the **shown** coverage, by the same functions that compute the played one; the catch still
resolves against the **played** coverage. A receiver the look shows in a hole is perceived at
`zoneCoverage.uncoveredOpenness` — an existing tunable — while the robber who is actually there
contests the throw. **The size of the lie is the difference between two things the engine already
computes, not a constant someone picks.**

- A **successful** read lets the QB perceive against the played coverage (today's behaviour,
  awareness noise included). It does not widen anything — it lets him see the window is tight and,
  in the decision step, move that receiver down. **That is the owner's point 1 made mechanical.**
- ⚠ Where the shown coverage puts a REAL defender in a different role, perceiving against it needs a
  contest evaluated for the QB's belief only — a **perception-only fork** that changes no physical
  outcome. Its exact form is part of the E build, not this ruling.

---

## 6. BUILD ORDER — keeping each step scoreable

ADR-067's ruling put E before D because E has a metric. That reasoning holds for every step here:
**each lands alone, with its own target metric, and none shares an arm.**

| step | what lands | target metric | notes |
|---|---|---|---|
| **1** | QB **coverage read** (graded, §5.1 ladder) + **re-order** decision + perceived-vs-played openness (§5) on **two declared-divergent cards** | `int_rate` (−15.47%, failing low); completion % should barely move | this is ADR-067 §E, reshaped |
| **2** | `discipline` attribute + **leash** (NONE / LIMITED / FULL), gating step 1's decision | `int_rate` split by leash × discipline quadrant | step 1 runs at a fixed leash until this lands |
| **3** | QB+C **pressure read** made graded and unconditional + **protection adjustment** | `sack_rate` — ⛔ **moves the "wrong" way, correctly** (ADR-067's required sentence) | this is ADR-067 §D |
| **4** | Receiver reads (press/leverage → release plan) and RB pickup read | `release_vs_press` band shares; pickup success | needs leverage in the vocabulary |
| **5** | OL tells → anticipated rush move | `pass_rush_rep` margins | |
| **6** | Audible and check-with-me | play-type mix vs situation | needs authored audible options in the corpus and the caller |
| **7** | Hard count and motion as information actions | `snap_jump` / false-start rates | needs producers for two dead `CheckKind`s |

⚠ **Run plays:** `simulateRunPlay` has no pre-snap stage. Steps 3, 4 and 6 all have a run-side form
(the line reading the front, the back reading the box, a run/pass check). `unruled`.

---

## Provenance of factual claims — REQUIRED

| # | claim | provenance |
|---|---|---|
| 1 | `coverage_read`, `option_route`, `snap_jump`, `penalty_check`, `audible` have no producer in the engine | ✅ **COMPUTED** — grep of `checkKind: "<kind>"` over `packages/engine/src`, October 2026 |
| 2 | §5.3 blitz recognition fires only when a rusher is unaccounted | ✅ **READ** — `preSnap.ts:259`, backlog entry 168 |
| 3 | Hot conversions re-order `readOrder` | ✅ **READ** — `preSnap.ts` header step 3 |
| 4 | §5.1 specifies a six-band coverage-read ladder with Awareness + Football IQ | ✅ **READ** — `match-engine.md` §5.1 |
| 5 | No `discipline` attribute exists; `gapDiscipline` covers DL/OL/LB only | ✅ **READ** — `contracts/src/registry.ts` |
| 6 | An uncovered receiver's openness is `zoneCoverage.uncoveredOpenness` | ✅ **READ** — `passPlay.ts:497-501` |
| 7 | The corpus and frozen caller carry no audibles or motion | ✅ **READ** — `caller/frozen.ts:36` |
| 8 | The four-level read/decide/leash/discipline structure | ⚠ **OWNER, DESIGN** — the owner's review, October 2026 |
| 9 | Leash levels NONE / LIMITED / FULL and their contents | ⛔ **CHOSEN — provenance NONE.** A proposal, for ruling |
| 10 | That the misread mechanism will raise `int_rate` | ⛔ **NO PROVENANCE — an inference from entry 163, untested** |

## Conjoined mechanisms — REQUIRED

⛔ **Read and decide are separately priceable and are measured separately.** Step 1 lands read +
one decision (re-order) on purpose, because a read with no consequence has no metric; the leash
(step 2) is then measured as its own arm against step 1 at a fixed leash. **Coverage read and
pressure read are separately priceable and have DIFFERENT target metrics** (`int_rate` vs
`sack_rate`) — ADR-067's D/E argument, unchanged.

## Implied scope — REQUIRED

- ⚠ **The DEFENCE reads too.** Linebackers read run/pass keys (`playRecognition`, `instincts` exist);
  defenders respond to motion and the hard count. This ADR models only what the offence reads.
  `unruled`.
- ⚠ **Defensive disguise skill.** §5.1's target has a "Defensive Disguise Rating"; today disguise is a
  card property. Whether it should also read the defenders' or the coordinator's ratings (Spec #11
  `playCalling` names disguise). `unruled`.
- ⚠ **Run plays have no pre-snap stage.** `unruled`.
- ⚠ **The leash is a gameplan-level COACH decision** — it needs a home in the franchise gameplan
  packet (Spec #11 §4.1), which does not exist yet. `unruled`.

## Decision

✅ **RULED IN PART** — see §8. Motion (§7 question 6) is held.

## 7. Questions for the owner

1. **The read → decide → leash structure** (§§2–4), with coverage and pressure as two rolls sharing
   one decision step.
2. **Add `discipline`** (all positions, mental) to the registry.
3. **Leash as three levels** (NONE / LIMITED / FULL), set by the coach with authority `COACH`.
4. **Misreads perceived against the shown coverage** (§5) instead of a new magnitude.
5. **The build order** (§6), starting with step 1 on Cover 3 Sky and Cover 1 Rat.
6. **Motion as an information action only**, so it needs no field positions.

---

# 8. ✅ RULINGS *(owner, October 2026)*

| # | question | ruling |
|---|---|---|
| 1 | Read → decide → leash, coverage and pressure as two rolls sharing one decision step | ✅ **APPROVED** |
| 2 | Add `discipline` (all positions, mental) to the registry | ✅ **YES** |
| 3 | Leash as three levels | ⛔ **CHANGED: a 0–100 slider**, not three levels. The NONE / LIMITED / FULL menu in §4 is superseded; which decisions open at which point on the slider is part of step 2's design |
| 4 | Misreads perceived against the shown coverage (§5) | ✅ **YES** |
| 5 | Build order (§6), step 1 on Cover 3 Sky and Cover 1 Rat | ✅ **YES** |
| 6 | Motion as an information action only | ⏸ **HELD.** The owner's objection: a receiver who motions across the formation changes the play, so motion does need positions. See below |

## ⚠ ON MOTION — the claim in §3 was framed wrongly

**§3 said motion "needs no coordinates" and treated it as an information action.** ⛔ **That is
true only for motion that returns to its starting spot.** A receiver who motions across the
formation changes the formation: who is #1/#2/#3 to each side, which lane he releases from, the
strength of the set, and therefore which defender has him.

**What the tree actually holds, and where:**
- ✅ **Starting positions DO exist — in `playbook`, not the engine.** Every formation carries an
  alignment (lane and side) for each skill role (`formations.ts`, `AlignmentMap`), and
  `instantiateDefense`/`instantiateOffense` use it to resolve man targets ("#2 to the left") and route
  lanes. Per ADR-006 the engine never sees an alignment; it sees the pairings they produced.
- ⛔ **What does not exist is a SECOND formation per play** — the one after motion.

**So motion splits in two:**
1. **Return motion** (out and back, or a short shift that keeps the set) — the formation does not
   change; the only modelled effect is the tell (man defender follows ⇒ man; defenders bump ⇒ zone).
   A better coverage read and nothing else.
2. **Relocating motion** — the formation changes from A to B at the line. In this tree that means
   instantiating the play against formation B, so man targets and lanes re-resolve, and the defence's
   RESPONSE to the motion is itself a shown-vs-played question (does the corner travel with him?).
   It needs a starting cell, not coordinates: the alignment vocabulary `playbook` already has.

`unruled` — brought back to the owner for discussion before either is scheduled.

---

# 9. STEP 1 LANDED — and its pre-registered prediction FAILED *(October 2026)*

## What was built

| | |
|---|---|
| **Contracts** | `CoverageDisguise = BASIC \| ROTATED \| LATE_ROTATION` (§5.1's complexity rows) and an optional `coverageDisguise` on `DefensivePlayCall` |
| **Playbook** | `shows?: ZoneDuty` on zone and man duties; `instantiateDefense` builds `shownAssignments` entry-for-entry beside `assignments`, and still aliases the one array when no duty `shows` anything. Mirroring flips `shows` with its duty. **Cover 3 Sky** and **Cover 1 Rat** show two-high (both safeties in deep halves) and are declared `ROTATED`; both are named in `DECLARED_DIVERGENT` with their football reason |
| **Engine** | `presnap.coverageRead`: §5.1 verbatim — `d100 + Awareness÷5 + Football IQ÷5` vs `50 + complexity`, six bands. Rolled only when the shown look leaves a receiver uncovered whom the played coverage has a defender on (a **trap**). **Sees through** (perfect/good): traps go to the back of the progression. **Fooled** (misread/complete misread): traps go to the front, and each in-structure read of a trap carries a named modifier equal to `uncoveredOpenness`-curve minus real openness. Adequate/partial: progression as called. Published as `PRESNAP_READ` `coverage_read` with its band; `PLAY_START.defense.coverageDisguise` on every pass play |

**Falsifiers**, mutation-checked: no read on any undisguised fixture; one read per disguised play at
the right target; fooled ⇒ trap first and skewed reads; sees-through ⇒ trap last; other bands ⇒
order unchanged; the dig's coverage CHECK still names the defender actually there. Disabling the
reorder, the misread modifier, or the gate each turned the suite red.

## ⛔ The measurement — `int_rate` DID NOT MOVE

Paired arms, same 1,680 synthetic games and seeds (`adr-068:step1-arm`, 8-team flat league, frozen
caller), before = `4544707`, after = this commit. Computed with `metrics/collect.ts`'s accumulator,
so the same population as `int_rate`. ⚠ **A synthetic-league arm, not the canonical baseline** —
no `data-cache/` in this environment, so no real-side comparison.

| | before | after |
|---|---|---|
| pass attempts | 99,798 | 99,970 |
| interceptions | 1,827 | 1,818 |
| **`int_rate`** | **1.831%** | **1.819%** |
| completion % | 37.25% | 37.24% |
| `int_rate` on throws against Cover 3 Sky / Cover 1 Rat | 1.90% (269/14,155) | 1.90% (271/14,273) |
| throws to a misread trap | — | 292, **14 intercepted (4.8%)** |

**The prediction was "int_rate rises, completion barely moves." Completion held; int_rate did not
rise.** ✅ **The mechanism works per throw** — a throw to a receiver the QB misread is intercepted at
~2.5× the base rate. ⛔ **Almost no throws reach it.**

## Why, as far as one diagnostic run shows *(280 games, `adr-068:diag` — COMPUTED, small sample)*

- **Fooled is uncommon:** 2,484 fooled reads of 11,715 rolled (21%). PERFECT_READ alone is 34%:
  against `50 + 10` a QB with ~+30 from Awareness and Football IQ beats the target by 30 on any
  d100 ≥ 60. That is §5.1 verbatim, not a tuning choice.
- ⛔ **A fooled QB usually never READS the trap.** Of 434 fooled plays, the trap was read on **55
  (13%)**, though it was first in the progression on nearly all of them. The traps that do get read
  are INTERMEDIATE routes (49 of 55). ⚠ **Inferred, not traced:** a late-developing route moved to
  the front leaves him waiting on it (§8.1: he does not skip to the next man), and pressure or the
  clock forces the decision first — 128 of the 434 fooled plays produced no throw at all.
- When the trap IS read, the lie is large: median misread modifier **+52** openness (p10 +20, p90 +70).

## What this leaves for the owner — NOT acted on

1. **Promoting the trap to first read may be the wrong lever.** A fooled QB in real football
   doesn't wait on the shown hole; he throws there when he gets to it. Leaving the order as called
   (misread only skews the reads) is a one-line change worth its own arm.
2. **Two cards of twenty-two disguise anything.** More disguised cards is authoring, not tuning —
   and the per-throw rate says each one would carry its share.
3. **The disguise only lies about one thing** (phantom holes). A shown man look, or a shown zone
   that hides a man, are the next authoring shapes.

`int_rate`'s verdict is unchanged: FAIL (known), low.
