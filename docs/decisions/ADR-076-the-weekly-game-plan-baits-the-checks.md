# ADR-076: the weekly game plan baits the quarterback's checks

- **Date:** 2026-10-16
- **Proposed by:** Orchestrator (thread "Weekly game plan design")
- **Status:** approved (design), all five questions ruled 2026-10-16 (§10). Nothing in `packages/`
  changes with this ADR; each contracts edit in §6 needs the owner's yes by name before it is made.
- **Plain-words version of the questions:** [ADR-076-questions-explained.md](ADR-076-questions-explained.md)
- **Picks up:** ADR-075 §8 ("Exploiting the offence's rules: a coordinator studying the
  quarterback's checks and baiting them. That is the weekly game plan (Spec #11 §4.1), not built"),
  and the owner's account in ADR-075 §4.1, point 3: *crowd the A-gaps to force a check.*

## Shorthand used here

| word | what it means |
|---|---|
| **check** | anything the offence changes at the line after seeing the defence: work away from a covered man, work to an open one (ADR-072), slide the protection or keep a back in (ADR-073), throw the hot route (ADR-022), send motion to see man or zone (ADR-074) |
| **look** | what the defence shows before the snap, never what it plays (ADR-069 ruling 1). Coverage looks exist today (Show 2, Show 1, Press, Split, Show 4); front looks (Mug, Stem) arrive with ADR-073 step 3.5 |
| **bait** | a look worn on purpose to draw one particular check, over a call that punishes that check |
| **bite** | the offence makes the check the bait was fishing for |
| **the leash** | ADR-072's 0–100 slider for how much the QB may change at the line; each check opens at a rung (work away 20, protection 30, work to 40, motion 90) |
| **tilt** | how much more often than usual the coordinator calls a bait this week, as a multiplier on its weight |
| **film** | what a staff can see of an opponent's past games: what was shown, what the offence changed at the line, where the ball went. Not dice, not ratings |
| **the frozen caller** | calibration's play-caller, deliberately coach-blind so the test league measures the engine and not coaching (Spec #11 §4.3) |

## 1. Need

Every check the offence makes today is a fixed rule applied to what the QB thinks he sees:
`decideProtection` slides toward the side with more threats and keeps a back in when a man short
(ADR-073 §2.3); a fooled read puts the shown hole first (ADR-068 step 1, ADR-072 §1); a recognised
blitz converts every hot route on the card (ADR-022). Real coordinators know their opponent's rules
and use them. The owner's account (ADR-075 §4.1) names this as the third part of good disguise, and
ADR-075 left it out because it is a weekly, per-opponent decision, not a coordinator's style.

Spec #11 §4.1 already reserves the place: the **GameplanPacket**, a weekly opposed prep check
(`gamePlanning` against the opponent's). This ADR designs the defensive half's first piece: how a
coordinator studies an offence's checks and builds a plan to bait them.

## 2. The design in one paragraph

Each week the defensive coordinator's staff watches **film** of the opponent: how often, when shown
each look, this offence made each check. From that he builds a **game plan**: a short list of
**baits**, each a look paired with a call that punishes the check it draws, in the situations where
this offence bites, called more often than usual this week (a **tilt**). He does not disguise more
in total; his overall rate stays his own style (ADR-075). He only chooses which looks, over which
calls, in which situations. The offence gets no answer to the plan in this ADR (owner Q4, §5).
Nothing in the engine changes. The plan only changes what the
defence calls, and every call it makes is one the engine already plays.

## 3. Baits

### 3.1 The catalogue

Each bait names the check it draws, the look that draws it, the calls that punish the check, and
when the bait fails. "Exists" says whether the pieces are in the tree.

| bait | the check it draws (rung) | look | punished by | fails when | exists |
|---|---|---|---|---|---|
| **B1 Mug and drop** | slide to the A-gaps, keep the back in (30) | Mug: both inside backers walked up into the A-gaps | any four-man call: both backers drop, seven cover four routes | the QB reads it right (sees the backers are not coming) and runs it as called; then it is a plain four-man rush | after ADR-073 step 3.5 |
| **B2 Show blitz, sit on the hot** | throw the hot route (0) | pressure shown (Mug, or a creeper showing six) | a call with a man dropping into the hot's lane: Fire Zone's end, the creeper's end, a robber | the QB sees who is really coming and the hot does not convert | after ADR-073 steps 3.4–3.5 |
| **B3 Two-high, rotate late** | work to the shown hole (40) | a two-high shell (Show 2, Show 4) | the rotation that fills that hole at the snap (Cover 3 Buzz under Show 2, Cover 2 under Show 4), rotated late | the QB sees through it: he works away from the trap and to the man the look hid (ADR-070 §10: seen through about twice as often as fooled) | **today** |
| **B4 Stem one way, come from the other** | slide toward the shown strength (30) | Stem: the line shown one gap toward the weak side | the rush that has its extra man on the side the slide leaves | the QB reads where the strength really is | after ADR-073 step 3.5 |
| **B5 Pass it off** | send motion to learn man or zone (90) | the motion answer itself: Spin or Bump on a man call (ADR-074 Q4, the third disguise) | man coverage behind a look that reads as zone | the QB reads the pass-off for what it is | after ADR-074 step 1 |

Every bait keeps ADR-069's rule: **what is called is what is played.** A bait is a look over a call
the engine already plays. B4 is in fact the Stem as ADR-073 §2.5 already draws it (always shown
toward the side opposite the played strength); a plan only calls it more against an offence whose
slide checks follow the shown strength.

### 3.2 Why the bait has to pay for itself

A bait costs something when the offence does not bite. B1 played honestly is a four-man rush; B2
gives up a rusher; B3 against a QB who sees through it hands him the hidden man (ADR-070 §10 found
the coverage looks net to about zero league-wide for exactly that reason). So **a plan is only worth
building against an offence that bites more than the league does**, and the plan should also lean
**away** from looks a given QB reads well. Both directions are part of the tilt (§4.3).

The payoff of B1 in today's engine rests on ADR-073 step 3.0's finding that keeping a back in
**raises** sacks (the released back is the QB's outlet; ADR-073 §10, sack rate on those snaps 9.1%
to 15.8%). The thread "Sack and outlet finding" is diagnosing that result. **B1 is judged after that
diagnosis**, so a bait is not built on an engine oddity.

## 4. How the plan is built

### 4.1 Film: what a staff can see

Film is a short list of **visible facts** per offensive snap, taken from the event stream (Iron
Rule 3) and never from dice or ratings:

- the situation (down, distance, field zone);
- which look the defence wore, if any (`PLAY_START.defense` already carries the coverage looks and,
  after ADR-073, the front look);
- which checks the offence made at the line: protection slid against its call, a man kept in, a hot
  route converted, motion sent, the progression changed (visible as the ball going first to a man
  the call did not have first);
- where the ball went and what came of it.

The coverage read's band, the pressure picture and the leash roll are **not** film: a real
coordinator sees what the QB did, not what he thought. So B3's signal is the weakest on film (a
fooled QB reaches the trap on only 13% of fooled plays, ADR-068 §9) and the protection baits'
signal is the strongest (a back who stays in is plain to see).

**Events are not saved** (ADR-072 §4: the save format keeps no events). So at the end of every game
the franchise records a small **film tally** per offence: for each bait, in each situation band, how
often its look was worn and how often the offence bit. That is a few dozen counts per team per game,
saved. Recomputing film by re-simulating old games from their seeds was considered and rejected: it
is slow, and any engine change since the game would replay a different game.

### 4.2 What the coordinator's prep skill does

The DC's `gamePlanning` (Spec #11 §3, "weekly opponent-prep quality"; on the coach sheet today)
sets two things:

- **Film depth:** how many of the opponent's recent games his staff breaks down, from 3 at
  `gamePlanning` 0 to 8 at 100.
- **Trust in what he sees:** each bite rate is pulled toward the league's own rate by a fixed
  number of imaginary league snaps (the prior), so a handful of snaps cannot make a bait look
  great. A better staff sees more snaps, so the opponent's real habits show through sooner.

There is no added noise beyond small samples: a staff that watches three games simply knows less
than one that watches eight. Opponent's own advance scouting (Spec #6 film study) is the same
source and adds nothing separate in v1.

### 4.3 From film to tilts

For each bait the plan compares the opponent's perceived bite rate in a situation band with the
league's, and sets that bait's tilt in that band:

`tilt = clamp(perceived bite rate ÷ league bite rate, ½, 2)`

- An offence that bites twice as often as the league sees that bait called twice as often (the cap).
- One that bites half as often sees it half as often (the floor).
- With no film (week 1, a new QB), every tilt is 1: today's mix.

The tilts multiply the coordinator's **look weights** (ADR-075 §3.1 `lookWeights`) and, for baits
that need a punishing call (B2's dropping end, B4's weak-side extra), the **call weights** of the
punishing calls in those situations.

**His overall rate holds.** The plan changes *which* look is worn and over *which* call, not *how
often* he disguises: the coverage-look rate stays his `passSnapMaskShare` and the front-look rate
stays his `frontLookShare` (ADR-075). Call tilts are renormalised so that his pressure rate (five or
more rushers) in each situation is also unchanged. A plan is a reshuffle of his style for one
opponent, not a different coordinator.

### 4.4 Who uses it

- **NPC coordinator calling the defence** (the human delegated it, or an NPC team): his plan's tilts
  apply to his calls that week.
- **The human calling the defence himself** (Spec #11 §1: humans govern themselves): the plan is a
  **scouting report** and a highlighted set of suggested calls on his call sheet ("they keep the back
  in against A-gap looks 3 times in 5 on third and medium"). Nothing is applied for him.
- **The human building the plan himself** (the weekly "opponent prep" task, `franchise-calendar.md`
  §3): he sees the same film tallies and sets tilts within the same bounds. Doing nothing leaves it
  to the DC (Spec #11 §11.1, delegation).
- **The frozen caller** never has a plan. A plan is used only in named measurement arms (§7), and a
  caller doing that says so in its identity, as the leash and disguise arms do.

Setting the plan is a decision and carries the **COACH** authority tag (Iron Rule 6).

### 4.5 Constraints (fantasy advisor review, 2026-10-16)

1. **Film is versioned saved state.** Each tally carries a schema version and the version of the
   bait and check vocabulary it counted. When that vocabulary changes, old tallies migrate or are
   dropped; an unknown bait in a tally is ignored, never an error.
2. **Film comes from simulated games only.** Real play-by-play cannot say whether a slide was
   checked or a hot route thrown, so no real-NFL tally exists and fantasy mode uses the league's own
   sim games. Tallies hold ids and counts only (Iron Rule 7).
3. **A new quarterback starts from the league average.** Tallies are keyed by team and the QB who
   took the snaps. When the starter changes, his own tallies (from earlier games or teams) are used
   if any exist; otherwise every bite rate is the league's and every tilt is 1.
4. **Deterministic and stored.** The plan builder is a pure function of the
   saved tallies, the staff's ratings and a seed from the league seed, the week and the team, never
   the game's own dice stream. The plan in force is saved at kickoff, so a replay uses that plan and
   never recomputes it from later film.
5. **Per-team, and never blocking.** Film and scouting reports are each team's own view, not shared
   state. A human's chance to set or approve the plan is a pending decision that falls back to the
   DC's plan if nobody acts, so one absent player never stalls a shared league's week.

## 5. The offence's side: not yet

*Owner Q4 (2026-10-16): nothing for now.* The draft proposed an opposed prep roll (Spec #11 §4.1,
the offence's `gamePlanning` against the defence's) whose winner's coach tightened the QB's leash
in the baited situations. The owner chose to give the offence no answer in this ADR. So the plan
always applies as built, there is no counter-prep roll, and a human calling the offence sees no
scouting report of the defence's plan. Spec #11 §4.1's opposed check remains the place for an
answer later (§8).

## 6. Contracts petition (shape only; each edit needs the owner's yes by name)

```ts
// proposed, not written
export type BaitId = "MUG_DROP" | "SHOW_BLITZ_SIT_HOT" | "TWO_HIGH_ROTATE" | "STEM_AWAY" | "PASS_OFF";

export interface FilmTally {            // saved per team per game, offence only
  readonly teamId: TeamId;
  readonly gameId: GameId;
  readonly counts: readonly { bait: BaitId; band: SituationBand; shown: number; bit: number }[];
}

export interface DefensiveGamePlan {   // one per team per week
  readonly opponent: TeamId;
  readonly week: number;
  readonly authority: "COACH";
  readonly tilts: readonly { bait: BaitId; band: SituationBand; tilt: number }[]; // ½–2
}
```

- **C1** `BaitId` and `DefensiveGamePlan`.
- **C2** `FilmTally`, and its place in the save file (a save-format bump: a new list in franchise
  state; old saves load with none).
- **C3** `SituationBand`, if ADR-071's situational call sheet has not defined one by then (reuse it
  if it has).

The engine reads none of these. The plan reaches play only as weights on the caller's own picks,
the same seam ADR-075 T1 opens for the coordinator's style.

## 7. Build order (later; each step its own commit and owner yes)

| step | what | engine? | proof |
|---|---|---|---|
| **G1** | film tally: a pure function from one game's events to `FilmTally` | no | hand-built streams: each check counted once; dice bands never read |
| **G2** | plan builder: tallies + `gamePlanning` → tilts (§4.2–4.3), overall rates held | no | no film ⇒ all tilts 1; tilts stay in ½–2; disguise and pressure rates equal before and after |
| **G3** | the caller takes tilts on looks and calls, defaulting to 1 (needs ADR-075 T1's seam) | no | all tilts 1 ⇒ identical stream on the frozen caller |
| **G4** | calibration arm: a plan caller against designed offences (below) | no | §7.1 predictions |
| **G6** | scouting report and suggested calls in the UI | no (ui) | reads the plan only |

G1–G3 can be built any time after ADR-075 T1 with B3 alone, since B3's pieces exist today. B1, B2
and B4 join after ADR-073 step 3.5, and B1 also waits for the sack-and-outlet diagnosis. B5 joins
after ADR-074 step 1. G2 needs franchise weeks to run in the game proper; in calibration the
arm hands the plan builder tallies from a first batch of games and plays a second batch with the
plan.

### 7.1 The measurement, with predictions written first

ADR-072's designed league: quarterbacks at Football IQ 20 or 95 (poor or good reader) × Discipline
20 or 95, leash 50 or 20, every other rating 60. Batch one, no plan, builds film; batch two plays
each offence with a plan built from its own film, against the same seeds with no plan.

1. **Inert at tilt 1:** a plan of all 1s reproduces the no-plan arm number for number.
2. **The plan finds the biter:** against the poor reader at leash 50 the B3 tilt rises above 1;
   against the good reader it falls below 1.
3. **The plan never hurts by much:** against every quadrant offence, the plan is no worse than no
   plan by more than 1 standard error on completion % and yards per dropback on disguised snaps.
4. **Small, where it shows:** the gain is largest against poor reader, long leash, low discipline,
   and is predicted to be small (ADR-070 §10: the coverage looks net to about zero, so tilting among
   them moves little). If B3 alone moves nothing measurable, the bait machinery waits for B1–B4,
   whose film signal is stronger (§4.1).
5. **A tight leash leaves nothing to bait:** at leash 20 (below B3's rung 40) the B3 tilt has nothing to bite on
   and moves nothing.

## 8. Implied scope (`unruled`)

- **The rest of the defensive game plan:** blitz more against a rookie, bracket their best receiver,
  play the coverages that beat their favourite concepts. Same packet, same tilts on call weights;
  not designed here.
- **The offensive game plan:** an OC baiting the defence's checks (ADR-071 step 4's captain's live
  check, ADR-074's motion tags).
- **The QB studying the coordinator:** a read bonus on looks he has seen this coordinator wear on
  film (ADR-075 §8 "film study"). That is a term in the read, so engine work.
- **A bait wearing out within a game:** a QB burned once reads it better next time. That is the
  AdjustmentPacket's (Spec #11 §4.2) or a read term; not here.
- **The offence's answer (owner Q4: not yet).** The draft's counter-prep: an opposed
  `gamePlanning` roll whose winning coach tightens the QB's leash in the baited situations (crude:
  a situation, not a look, since the call is made before the look). Alternatives were a read bonus
  on studied looks, and a "hot route off" check so an offence could answer B2.
- **The week's baits in practice:** ADR-075 §4.6 gives the season window about a quarter of a year's
  disguise growth; whether this week's baits get extra reps is ADR-075 T7's.
- **Fantasy mode:** the advisor found nothing foreclosed; its five constraints are §4.5.

## 9. Questions for the owner

In plain words in [ADR-076-questions-explained.md](ADR-076-questions-explained.md), one card each
in the thread.

1. **What the plan may change.** (a) Which looks, over which calls, in which situations, with his
   overall disguise and blitz rates held *(recommended)*; (b) also how often he disguises in total
   against a team that bites; (c) also bonuses on the field, as Spec #11 §4.1 first sketched.
2. **Where his knowledge comes from.** (a) Film of what the offence actually did, through his
   `gamePlanning` *(recommended)*; (b) the offence's true ratings with noise added.
3. **How hard he leans.** (a) Up to twice as often, down to half as often *(recommended)*; (b) up
   to three times; (c) only picks two or three baits and calls them at a fixed boost.
4. **The offence's answer when it wins the prep battle.** (a) Its coach tightens the QB's leash in
   the baited situations *(recommended)*; (b) the QB reads those looks better (engine work); (c)
   nothing for now.
5. **Build order.** (a) Build the plan machinery with B3 as soon as ADR-075's first step lands, and
   add the other baits as their looks arrive *(recommended)*; (b) wait until all five baits'
   pieces exist.

## 10. Decision

| # | question | ruling | when |
|---|---|---|---|
| Q1 | What the plan may change | ✅ **Which looks, over which calls, in which situations**; his overall disguise and blitz rates held (§4.3) | owner, 2026-10-16 20:41 |
| Q2 | Where his knowledge comes from | ✅ **Film** of what the offence actually did, depth set by his `gamePlanning` (§4.1–4.2) | owner, 2026-10-16 20:41 |
| Q3 | How hard he leans | ✅ **Half to double**: tilt clamped to ½–2 (§4.3) | owner, 2026-10-16 20:41 |
| Q4 | The offence's answer | ✅ **Nothing yet**: no counter-prep roll, the plan always applies (§5, §8) | owner, 2026-10-16 20:43 |
| Q5 | Build order | ✅ **Start with one trap**: build with B3 after ADR-075 T1, add each bait as its look exists; B1 also waits for the sack-and-outlet diagnosis (§7) | owner, 2026-10-16 20:42 |

## Provenance

| claim | source | kind |
|---|---|---|
| Crowd the A-gaps to force a check; good disguise exploits the offence's rules | owner's account, ADR-075 §4.1 point 3 | REPORTED (owner, citing Yahoo Sports, Athlon Sports) |
| GameplanPacket: weekly, opposed, `gamePlanning` vs opponent's | `docs/design/coaching-staff.md` §4.1, §3 | read (spec, not built) |
| Humans govern themselves; delegation maximal | `coaching-staff.md` §1, §11.1 | read |
| Opponent prep / film study is a weekly task delegable to OC/DC | `docs/design/franchise-calendar.md` §3 | read |
| Rungs: work away 20, protection 30, work to 40, motion 90; hot routes at 0 | ADR-072 §1, ADR-073 Q1, ADR-074 Q2 | owner-ruled |
| Keep-in raises sacks today (9.1% → 15.8% on those snaps) | ADR-073 §10 (step 3.0) | REPORTED from that run |
| Coverage looks seen through about twice as often as fooled; net about zero | ADR-070 §10 | REPORTED |
| A fooled QB reaches the trap on 13% of fooled plays | ADR-068 §9 diagnostic | REPORTED (280 games, small) |
| Stem drawn toward the side opposite the played strength | ADR-073 §2.5 | read |
| Defence card drawn before and without the offence's call | `calibration/src/caller/frozen.ts:398` | read |
| Coverage-look rate and late share as constants today | `playbook/src/distribution.ts:332,338`; `selectLooks`, `masks.ts:520` | read |
| Events are not saved | ADR-072 §4 | REPORTED |
| Film depth 3–8 games; the prior's strength; tilt bounds ½–2 | — | `CHOSEN — provenance NONE` |
| The five baits and their football logic | — | `CHOSEN — provenance NONE` (football judgement) |
