# ADR-074: Pre-snap motion — the man who comes back, and the man who moves the formation

- **Date:** 2026-10-16
- **Proposed by:** Orchestrator (motion design thread)
- **Status:** approved — all four §9 questions ruled by the owner, 2026-10-16 (§8). Design only. Nothing in `contracts`, `playbook`, `engine` or `calibration`
  changes until the owner rules §9 and says yes to each contracts edit by name.
- **Picks up:** ADR-068 §8 question 6 ("motion as an information action only"), held since the
  owner's objection: *a receiver who motions across the formation changes the play, so motion does
  need positions.* ADR-072 §1 parks motion at a provisional rung 90. ADR-071's implied scope says the
  offence's call fits the same shape as the defence's (formation, motion, concept, tag).

## Shorthand used here

| word | what it means |
|---|---|
| **the card** | an authored play in `packages/playbook`: an offensive concept (formation, routes, read order, protection) or a defensive card (front, rush, coverage duties) |
| **look** | what the other side sees before the snap. The defence already has looks (masks, ADR-069/071); this ADR gives the offence one that can change before the snap |
| **#1, #2, #3** | receivers counted from the sideline in, per side. Defensive cards name their man assignments this way ("you have #2 to the left"), which is how an offence-blind card finds a real player (`alignment.ts`, `instantiate.ts:104`) |
| **lane** | one of five columns across the field: LW, LH, C, RH, RW (`alignment.ts:31`). A player stands in one lane for the whole play today |
| **coverage read** | ADR-068's pre-snap roll: `d100 + Awareness÷5 + Football IQ÷5` vs `50 + disguise`. It is rolled only when the shown look hides a trap (`coverageRead.ts`) |
| **the leash** | ADR-072's 0–100 slider for how much the QB may change at the line; each decision opens at a rung |
| **motion tag** | the defence's preset rule for motion, called with the coverage during the week and never improvised: **Track** (the corner chases him across), **Spin** (the corner rotates deep and a safety comes down to take him), **Bump** (defenders swap who has whom). Owner's football notes, §3.2 |
| **pass off** | Spin and Bump together: any answer where a different defender ends up with the motion man |

## Provenance of factual claims — REQUIRED

| claim | source | kind |
|---|---|---|
| The tree has one alignment per formation, a player occupies one lane for the whole play, and "no motion, no shifts" is stated | `packages/playbook/src/alignment.ts:23-26`, `packages/contracts/src/playcalls.ts:48` | COMPUTED (read) |
| Man targets resolve by receiver number against the offence's formation at instantiation | `packages/playbook/src/instantiate.ts:104-117` (`resolveManTarget`) | COMPUTED (read) |
| The engine never sees an alignment, only the pairings instantiation produced | ADR-006, restated in ADR-068 §8 | REPORTED (ADR text, not re-traced) |
| The calibration caller is where plays are instantiated | `packages/calibration/src/caller/frozen.ts:453` | COMPUTED (read) |
| Jet sweeps are refused by the validator for want of a motion vocabulary | `packages/playbook/src/validate.ts:549-556` (`R_CARRIER_NOT_A_BACK`) | COMPUTED (read) |
| Every formation in the corpus is right-strength | `packages/playbook/src/passConcepts.ts:34,55` (comment) | REPORTED (comment, not re-counted) |
| FTN charting rows carry `is_motion`, and the ingester already reads it | `packages/calibration/src/ingest/sources/ftn.ts:242,293` | COMPUTED (read) |
| A pressed receiver rolls release vs press at tick 0.5 | `packages/engine/src/resolve/release.ts:1` | COMPUTED (read) |
| An uncovered receiver starts at openness 90 | `packages/engine/src/tunables.ts:1885`, used at `passPlay.ts:557` | COMPUTED (read) |
| ADR-068 step 1: 21% of rolled reads are fooled, and a fooled QB reads the trap on 13% of those plays | ADR-068 §9 diagnostic, 280 games | REPORTED (that ADR's computed figure, not re-run) |
| Roughly half of NFL snaps carry some pre-snap motion in recent seasons | general football knowledge | REPORTED — **not checked**; §6 computes it from FTN before anything is tuned to it |
| The rung numbers, kinds and answers proposed below | this ADR | CHOSEN — provenance NONE (football judgement) |

## 1. The owner was right, and here is the shape that follows

ADR-068 §3 called motion an information action. That holds only for a man who goes out and comes
back. A man who motions across changes who is #1/#2/#3 on each side, which side is strong, which lane
he releases from, and therefore which defender has him. That is a second formation, and the tree has
exactly one per play.

**The key observation that makes this cheap:** the second formation does not need new machinery on
the offence's side. A real play is drawn from where the players end up. So **a motion play is an
ordinary concept authored on its finishing formation, plus a note saying where the motion man
started.** The routes, read order and protection are already right for formation B because that is
where the card was drawn.

**All the new work is on the defence's side**, because the defence lines up against formation A and
has to adjust to B. That is where the football is too: motion is a question the offence asks the
defence, and the defence's answer is what the QB learns from and what can go wrong.

## 2. The kinds of motion, in football terms

| kind | what happens | formation changes? | in this ADR |
|---|---|---|---|
| **Return** (out and back, "yo-yo") | a receiver goes in motion and returns to his spot | no | ✅ step 1 |
| **Across** | a receiver motions to the other side and sets there (2x2 becomes 3x1, say) | yes: side and numbering | ✅ step 1 |
| **In / out on his side** ("zoom", short motion) | a receiver moves inside or outside on the same side (wide to slot) | yes: numbering on that side | ✅ step 1 |
| **Back out of the backfield** | the running back motions out to a slot or wide spot (to empty) | yes: a back becomes a numbered receiver | ✅ step 1 |
| **Jet** (moving fast at the snap) | the snap comes while he is still running across in front of the QB; he takes a handoff (jet sweep) or carries on as a decoy or into a route | yes, mid-snap | ✅ step 1 (owner, §9 Q1) — §3.4 |
| **Orbit** | as jet, but he loops behind the QB the other way | yes, mid-snap | ⛔ deferred: same machinery as jet with a pitch instead of a handoff; added once jet is measured |
| **Shift** (several men re-set at once) | two or more players move and re-set | yes | ⛔ deferred: one man in motion is the rule-legal, common case |

**Legal-formation rule kept simple for v1:** the motion man (jet included) must start **off the line** (a slot, a
wing, a flexed man) **or in the backfield**. A man on the line who motions changes who covers whom on
the line and who is eligible, which `alignment.ts` checks once per formation today. Authoring-time
check: formations A and B have the same personnel, every other player is in the same spot, and the
motion man ends off the line or in the backfield.

## 3. What motion does in the sim

### 3.1 The tell (all kinds)

Motion makes the defence show its hand. In Track man coverage the defender runs with him, which
tells the QB "man". In zone, defenders shuffle over and nobody follows, which tells him "zone".

**Proposed mechanics:** the tell is a **bonus on the coverage read ADR-068 already rolls**, not a new
roll. A tracking defender gives the QB `+motionTell` on that read (proposed +15, provenance NONE).

⚠ **Honest consequence, stated up front:** the coverage read is rolled only when the shown look hides
a trap. On an undisguised snap the QB already sees what is played, so a return motion changes
nothing in the sim except the event it logs, and no die is rolled for it (ADR-005). By ADR-068 §9's
own arithmetic (21% fooled, 13% of those reaching the trap) **return motion alone will barely move
`int_rate`**. That is why it ships with across motion in one step rather than as its own measured
step.

### 3.2 Re-finding the man (across, in/out, back out)

The defence is instantiated twice: once against formation A (the look before motion), once against
formation B. What each defender ends up doing is set by the call's **motion tag**.

**The owner's football (2026-10-16), which this section follows:** a defence does not improvise
against motion. When the coordinator calls a coverage it comes with a built-in motion adjustment, and
the players know before the snap whether they will chase, spin or swap. Once a receiver starts
moving, the corner can no longer press him. A chasing corner is a step behind and running through
traffic, which is why offences motion against man. The pass-off trigger is a visual threshold: *"if
my man motions past the tackle, I pass him off"*, confirmed by a hand signal from the safety.

| motion tag | for which coverages | who ends up with the motion man | what the QB learns | cost / risk |
|---|---|---|---|---|
| **Track** (also Sling; "chaser") | strict man: Cover 0, Cover 1 | his own defender, who sprints across with him; the deep safety stays put | "man", honestly: +15 on the read | the chaser **trails**: a named modifier `trailPenalty` on that man-coverage contest (proposed −10 after set motion, −20 against jet, provenance NONE), and no press |
| **Spin** (also Roll, Fire) | man-free with one deep safety: Cover 1 | the safety on the side he is moving to comes down and takes him in man; the corner he left spins back to the deep middle | looks like zone: the **lie** (§9 Q4 ruled yes) | the swap can be missed (3.3) |
| **Bump** (also Switch, Rock) | zone and pattern-match coverages; also allowed on Cover 2 Man as lock-and-trade | the corner stays on his side and takes the next inside defender's job; whoever's area he enters inherits him | zone: honest on a zone card; the **lie** on a man or match card | on a man or match card the swap can be missed (3.3); on a pure zone card nobody "has" him, so there is nothing to miss |

**The tackle threshold decides when the tag fires.** Only motion that crosses the tackle triggers Spin
or Bump: **across** and **jet**. **Return** motion and **on-side** motion (wide to slot) stay inside the
defender's own area, so his defender stays with him whatever the tag; on-side motion still re-numbers
the side. **The back motioning out** is picked up by whoever the card's number rule names against
formation B (usually a linebacker widening), which is a re-resolution, not a swap.

**No press on a moved man, ever (v1 rule).** Whoever ends up on the motion man plays off on that snap,
so the release-vs-press roll is skipped for him. Every other receiver is pressed as the card says.

**Re-resolution needs no new code path:** `resolveManTarget` already maps "#2 to the left" to a role
from a formation. Spin and Bump are resolving the swapped defenders against B; Track is keeping A's
answer for the motion man and his defender.

**Spin and a safety look on one call.** Spin moves a safety before the snap, and so does a safety look
(Show 2, Show 1). The caller does not draw Spin on a call already wearing a safety look; which one
wins is not proposed.

**The pass off is a third lie**, in the family ADR-069/070 started (the first: a look shows a hole the
rotation fills; the second: a look shows a man blanketed who is open). Here nobody follows the motion
man, so it looks like zone while man is played. It fools the QB through the same coverage read.

### 3.3 The missed hand-off (Spin, and Bump on a man or match card)

When defenders swap assignments on the fly, they can miss it: the call, the threshold or the safety's
signal goes wrong. One roll per such snap, for the two defenders whose men swapped: the lower of their
`Awareness ÷ 5 + Football IQ ÷ 5` plus `d100` against a target (proposed 50, provenance NONE). Fail: the
motion man is **uncovered** at the snap and starts at openness 90, exactly as any uncovered receiver
does today (`tunables.ts:1885`). Both on the same man is a refinement not proposed. The roll is on the
stream as its own `PRESNAP_READ` kind (§5), so a bust can be read back and narrated.

This is the payoff the owner's objection points at: motion across is how offences create busted
coverage, and a defence that chooses to swap rather than chase is what risks it. Track trades that risk
for a corner who is a step behind.

### 3.4 Jet motion *(added on the owner's ruling, §9 Q1)*

Jet is the one kind where he is **still moving at the snap**. In the grid that is a state, not a
coordinate: at the snap the jet man stands in the **centre lane in the backfield, moving toward a
side** (`jetTo: LEFT | RIGHT`). Three plays come off it, and none needs a new die beyond the ones
below.

| off the jet | what the card says | what the sim does |
|---|---|---|
| **Jet sweep** | a run concept whose carrier is the jet man, designed to the side he is running to | the validator's `R_CARRIER_NOT_A_BACK` refusal lifts for a carrier with jet motion. He hits the edge with a head start: a named modifier **`jetHeadStart` (+10, provenance NONE)** on his side of the edge contest against the force defender. Everything else is the existing perimeter run (`perimeterOrder`, space blocks) |
| **Jet as a decoy** | any other play; the jet man carries on across or blocks | no die. The decoy works only through **who the defence moved**: a corner who tracked him or a safety who spun down to his side is now on the jet side, and the play goes the other way. Re-resolution (3.2) already puts them there |
| **Jet into a route** | a pass concept with a route for the jet man (flat or arrow to the side he is running to) | he **cannot be pressed** (no release-vs-press roll), as a moving man cannot be jammed |

**The defence's answers to jet** are the three tags of §3.2, and jet is where they matter most:
**Track** (his corner chases at full sprint: the larger −20 trail, and on a jet sweep the chaser is in
pursuit from behind rather than setting the edge), **Spin** (the safety on the side he is running to
comes down to meet him and becomes the force man; the corner rotates deep), and **Bump** (the defender
on the side he enters inherits him). A safety who comes down is what turns the jet sweep into a contest
rather than a free edge, and is also what the decoy pulls.

**Not modelled for jet:** the snap timing itself (a mistimed snap, an illegal-motion flag for moving
forward, a fumbled mesh). The penalty and snap-jump checks have no producer today (ADR-068 §3); jet is
a natural first producer, but that is its own question, not this one.

### 3.5 What is not modelled

No yard-level splits (a "stack" or "bunch" release still collapses to one lane per man), no moving
start for the motion man other than jet (every other kind is set at the snap), no defensive check out of the call after motion
(a defence that sees motion and changes its whole coverage is a defensive audible, out of scope).

## 4. Who calls it, and the leash

**Called motion is part of the play.** The coordinator calls "Trips right, Z across, Mesh" in the
huddle; the motion is on the card, so it sits at **rung 0** with the rest of the call, like the hot
routes a protection forces (ADR-072 §1). It carries the coordinator's authority (`COACH`, Iron Rule 6).

**A QB may also send a man himself** to check man or zone. That is a decision, so it is on the
leash. QB-sent motion is **return motion only** (he does not re-draw the play) and opens at
**rung 90** ✅ (owner, §9 Q2: the provisional 90 stands; 50 was proposed and not taken). So only a
quarterback on a nearly open leash sends a man himself.

## 5. Contract petitions this would need (each needs the owner's own yes, by name, before `contracts` changes)

All optional fields, so every existing card and save stays valid:

1. **Offensive call** (pass AND run) gains `motion?: { mover: PlayerId; kind: RETURN | ACROSS | ON_SIDE | OUT_OF_BACKFIELD | JET; from: lane; jetTo?: LEFT | RIGHT }`.
   The call's `formation` stays the finishing formation; `motion.from` names where the mover started;
   `jetTo` is present exactly when `kind` is `JET`. A run call's carrier may be the jet man.
2. **Defensive call** gains a motion tag, `TRACK | SPIN | BUMP`, in ADR-071's tag shape (the call is
   personnel, front, concept, tags). Each card states which tags it allows (§3.2's table); the
   defensive caller draws one on its own address after the card and masks, so it cannot move card
   weights.
3. **Coverage assignment** gains `passedOff?: true` on the two swapped pairings (Spin, or Bump on a man
   or match card), so the engine knows which pair rolls 3.3.
4. **Events:** `PLAY_START` carries both new fields; a new `PRESNAP_READ` kind `motion_handoff` with
   its roll and result (Iron Rule 3: the bust is a fact on the stream, not a log line).

Engine changes: the +15 tell on the existing read; the trail penalty for Track; the missed hand-off
roll; no press on a moved man; the jet head start on the edge.
Playbook changes: `motion` on concepts (pass and run), the A/B authoring check, double instantiation in
the caller, jet sweep concepts, the jet exception to `R_CARRIER_NOT_A_BACK`, the safety spin for jet.

## 6. Measurement and the real baseline

- **Real side:** FTN's `is_motion` is already ingested (`ftn.ts:293`). Before any tuning, compute the
  league motion rate and the motion vs no-motion split in yards per pass, completion %, and
  interception rate. That fixes the motion rate the caller uses instead of a guess.
- **Prediction, pre-registered:** Track raises completion % on throws to the motion man (the trail) and
  lowers `int_rate` slightly through the tell on disguised snaps; Spin and Bump raise completion % and
  yards per pass slightly through busts. Both
  small at league level; a bust rate of 3–8% of pass-off snaps is the plausible range (provenance
  NONE). If nothing moves beyond ~1 SE, that is reported as such, as ADR-070 and ADR-071 were.
- **Arms:** same seeds and league as ADR-072/073 arms, motion off vs on, after the front work
  (ADR-073) has landed so the two do not share a baseline.

## 7. Build order (once ruled)

1. **Step 1a:** contracts petitions 1, 2 (TRACK, and BUMP on zone cards only) and 4; called set motion
   of the four kinds on a handful of concepts; double instantiation; the tell; the trail; no press on a
   moved man. Measure.
   **Step 1b (same build, its own arm):** jet — jet sweep concepts, jet as decoy and into a route, the
   head start, Track's −20 trail against jet. Measured apart from 1a so each one's effect is visible; the run side
   adds a jet sweep row (yards per carry, outside-run share) to the arm.
2. **Step 2:** SPIN, BUMP on man and match cards, petition 3, the missed hand-off roll. Measure.
3. **Step 3:** QB-sent return motion on the leash at rung 90.
4. **Deferred:** orbit motion, jet timing (mistimed snap, illegal motion), shifts, left-strength formations created by motion (today's corpus is all right-strength, so
   across motion to the left is the first source of them; the sixth protector's side rule in
   `passConcepts.ts` will need checking against it), a coordinator's motion tendency.

Nothing here touches ADR-073's files. Step 1 should start after ADR-073's build lands, because both
change what a seed produces.

## Implied scope — REQUIRED

- **Fantasy mode:** FTN charts motion per play, so real-result tethering can key on it if ever
  needed; nothing here forecloses fantasy mode. Each step changes what a seed produces, so each bumps
  the caller version. `unruled`.
- **UI:** the play log can draw motion from the event stream alone (Iron Rule 3). `unruled`.
- **Coordinator traits:** how often a coordinator calls motion, and whether a defensive coordinator
  prefers Track, Spin or Bump, are traits for the DC-trait work (ADR-075 thread). `unruled`.

## 8. Decision

Approved. All four questions ruled.

| # | question | ruling |
|---|---|---|
| 1 | Which kinds go in the first build | **Those four plus jet and jet sweeps** (owner tapped "Add jet too", 2026-10-16 18:37Z). Designed in §3.4; built as step 1b. Orbit stays deferred |
| 2 | Who calls it | **Coordinator's called motion is part of the play (rung 0); a QB may send out-and-back motion himself at rung 90** (owner tapped "Coach + QB at 90", 18:39Z). §4 updated |
| 3 | How the defence answers motion | **Reshaped by the owner's football notes** (18:45Z): the answer is a preset motion tag on the call, Track / Spin / Bump, firing when motion crosses the tackle. §3.2 rewritten to follow them. Re-asked as §9 Q3 and **ruled as proposed** (owner tapped "As proposed", 18:57Z): Cover 0 Track; Cover 1 Track or Spin; Cover 2 Man and zone/match coverages Bump. Track and zone Bump in step 1a; Spin and man/match Bump with the missed hand-off in step 2. The earlier travel / pass-off card is superseded |
| 4 | Pass off can fool the QB into reading zone | **Yes** (owner tapped "Yes", 18:45Z). Pass off is the third disguise, read through the same coverage read (§3.2) |

## 9. Questions for the owner

1. **Which kinds of motion go in first?** Return, across, wide-to-slot on his own side, and the back
   motioning out to empty in the first build; jet/orbit and multi-man shifts later.
   **Recommended: yes, those four first.** ✅ **Ruled: those four plus jet and jet sweeps** (§8).
2. **Who calls it?** Motion the coordinator calls is part of the play (always allowed). A QB may also
   send a man out and back himself to see man or zone, and that opens on the leash at 50 instead of
   the 90 we pencilled in. **Recommended: yes.** ✅ **Ruled: yes, but at 90** (§8).
3. **Which motion rule goes with each coverage?** *(re-asked after the owner's notes)* Cover 0: the
   corner always chases (Track). Cover 1: chase or spin, the coordinator's call each week. Cover 2 Man:
   swap (Bump). Zone and match coverages: swap (Bump). Built with chasing and zone swaps first; spins and
   man swaps, which can be missed, second. **Recommended: yes, that pairing and that order.** ✅ **Ruled: as proposed** (§8).
4. **Should passing off be able to fool the QB into reading zone?** That makes it a third disguise
   alongside the safety and corner looks. **Recommended: yes.** ✅ **Ruled: yes** (§8).
