# ADR-075: each defensive coordinator disguises his own way

- **Date:** 2026-10-16
- **Proposed by:** Orchestrator (thread "Coordinator disguise trait")
- **Status:** approved (design), all rulings 2026-10-16 (§10). Design only: nothing in `packages/` changes with this ADR. The build steps
  in §6 wait for the owner's rulings and for ADR-073 to finish measuring.
- **Plain-words version of the questions:** [ADR-075-questions-explained.md](ADR-075-questions-explained.md)

## 1. Need

ADR-069 ruling 4 (owner, 2026-10-14): *one league-wide mask rate now; a defensive coordinator trait
later.* ADR-069 §2.4 adds that the league-wide rate is the trait's **default, not its replacement**.
Three later ADRs left a piece of their own design waiting on that trait:

| left waiting | where | what it is |
|---|---|---|
| Which look a call wears, among the legal ones | ADR-070 §2, `masks.ts:508-509` | picked at equal weight, `CHOSEN — provenance NONE`, "becomes a defensive coordinator's tendency when ruling 4's trait lands" |
| How WELL a defence disguises | ADR-069 §9.5, ADR-070 §10 | §5.1's "Defensive Disguise Rating" term in the coverage read's target, not rolled today (`tunables.ts:246-249`) |
| Which tags a coordinator likes; the call sheet by situation | ADR-071 §7 (line 306, row 4) and Implied scope (line 371) | "where ADR-069 ruling 4's trait lands" |

Spec #11 (`coaching-staff.md`) already gives the trait a home: coordinators are rated staff
(`StaffState`, role `DC`), `playCalling` is described there as "tendency discipline, sequencing,
disguise" (§3), and coach attributes parameterise the NPC play-caller in the game proper but **not**
the frozen calibration caller (§4.3).

## 2. The design in one paragraph

*Revised 2026-10-16 after the owner's note on how disguise is executed (§4).*

A defensive coordinator carries a **style** and a **teaching skill**, and his players carry the
**execution**. **How often** he disguises is his style: a few numbers on his profile (his mask rate,
which looks he favours, how late he rotates, how often he shows a fake rush), visible on film, read
by the NPC caller in place of the league-wide constants. **How well** a disguise holds up belongs to
the players who have to carry it: a new player rating, Disguise, decides how hard the look is to
read and whether the men moving from the shown look to the played one get there on time. The
coordinator's skill is **training** that rating, in the offseason, in camp and in weekly practice,
and a player who is hurt misses those reps. The league's coordinators are generated so that their
average lands on today's 31.4% of passing snaps disguised (inside the owner's 30–33%); only the
spread between teams is new.

## 3. How often: the tendency

### 3.1 What it holds

| field | today's league-wide value | per coordinator | provenance |
|---|---|---|---|
| `maskRate`: share of maskable calls that wear a coverage look | `COVERAGE_MASK_RATE` 0.323 (`distribution.ts:332`) | drawn around the league value (§3.3) | 0.323: COMPUTED in ADR-069 §11 from the 97.5% maskable share; spread: Q2 |
| `lookWeights`: weight on each legal look combination | 1 each (`masks.ts:530`) | a lean toward some looks (e.g. two-high shells, or corner Press-Bail) | equal weight is `CHOSEN — provenance NONE` (ADR-070 §2) |
| `lateShare`: of rotations, the share held to the snap | `LATE_ROTATION_SHARE` 0.25 (`distribution.ts:339`) | drawn around 0.25 | `CHOSEN — provenance NONE` |
| `frontLookRate`: share of legal calls that wear a front look (Mug, Stem) | 1 in 10 (ADR-073 Q5(a), owner 2026-10-16) | drawn around 1 in 10, *once ADR-073 step 3.5 has built front looks* | owner-ruled, no real figure on file |

The owner's 30–33% counts **coverage disguises only** (ADR-069 ruling 3), so `frontLookRate` is
kept as its own number and never folded into `maskRate`.

**Stated in the owner's units.** A coordinator's rate is shown and generated as a share of passing
snaps ("he disguises 40% of passing snaps") and converted to the per-maskable-call die by dividing
by the maskable share (97.5% today, ADR-069 §11, REPORTED from that run). The die stays where it is.

### 3.2 Where it lives

A profile fact on `StaffState`, beside `schemeFamily`, not a `CoachAttrId` attribute: attributes are
ratings where higher is better and calibration runs sensitivity on them (Spec #11 §3), and a
tendency is neither. **Contracts petition** (shape only, for Q1/Q3 to settle):

```ts
// packages/contracts/src/players.ts — proposed, not written
export interface DefensiveDisguiseTendency {
  readonly passSnapMaskShare: number;               // owner's units, 0–1
  readonly lookWeights?: Readonly<Record<string, number>>; // keyed by look id; absent = equal
  readonly lateShare?: number;                      // absent = LATE_ROTATION_SHARE
  readonly frontLookShare?: number;                 // absent = the league rate (ADR-073 Q5)
}
// StaffState gains: readonly disguise?: DefensiveDisguiseTendency  (DC seat only)
```

Absent means the league default, so every existing save, league and test reads exactly as today.

### 3.3 Keeping the league on target

Coordinators are generated so that the **league mean** of `passSnapMaskShare` is the midpoint of the
owner's band (0.315) and the spread is bounded (Q2). Over a league of 32 the sample mean of the
draw will wander; the generator re-centres the draw on the league, so the mean is exact by
construction rather than by luck. Calibration still measures `disguise_rate` and reports it beside
the 30–33% target, as now.

### 3.4 Who uses it

- **The NPC caller in the game proper** (not built yet: Spec #11 §4.3) passes its DC's tendency to
  `selectLooks` in place of the constants.
- **The human.** Spec #11 §1: attributes govern NPCs, humans govern themselves. When the human calls
  the defence, he picks the look on each call himself and no rate applies. When he delegates the
  defence to his coordinator, that coordinator's tendency applies.
- **The frozen calibration caller stays coach-agnostic** (Spec #11 §4.3; ADR-072 §3; ADR-073 R31):
  league-wide constants in every report run. A spread is used only in a named measurement arm
  (§6 step T4), and a caller doing that says so in its identity, as the leash arms did.

### 3.5 What the offence knows

The tendency is a fact on film. ADR-070's belief rule reads the "typical outcome" of a look, not the
rate it is worn at (ADR-070 §2, line 73), so nothing in today's read changes with a coordinator's
rate. Whether a quarterback who has studied this coordinator reads his favourite looks better is a
weekly game-plan question (Spec #11 §4.1 GameplanPacket), out of scope here (§8).

## 4. How well: the players execute, the coordinator trains

*Revised 2026-10-16. The first draft gave the coordinator a rating that made every disguise of his
harder to read. The owner (2026-10-16 18:56) pointed out that the players execute a disguise and
the coordinator trains them to, and supplied an account of what good and bad disguise look like.
This section is rebuilt on that account.*

### 4.1 What the owner's account says, and where each part lands

| from the account | what it is in the sim | where |
|---|---|---|
| **Posture and tells**: a safety looks the same whatever he is about to do | how hard the look is to read | the read term, §4.3 |
| **Synchronised rotation**: if one man moves early, the QB spots it | the look is only as good as its weakest mover | the read term, §4.3 |
| **Exploiting the offence's rules**: crowd the A-gaps to force a check | the coordinator's weekly game plan against this quarterback | out of scope, §8 (GameplanPacket) |
| **Tipping the hand early** | a poor disguiser is easy to read | the read term, §4.3 |
| **Busts**: defenders confused, late to their landmark, a man left open | a disguised call can be executed badly | the execution roll, §4.4 |
| **Giving up leverage**: a corner faking off who must press | a late corner gives a free release | the execution roll, §4.4 |
| **Static coordinators** who don't want players overthinking | disguise has a cost, so not disguising is a real choice | §4.4 |

The account's league figures (32% average, the Rams at 50.5%) agree with the owner's 30–33% target
and with Q2's wide ruling (10% to 55%). They are REPORTED from the owner's sources (Yahoo Sports,
Athlon Sports), not ingested into the repo.

### 4.2 The player rating: Disguise

A new player attribute `disguise` (registry addition, contracts petition): **DB and LB** now, **DL**
once ADR-073 builds the front looks (Mug, Stem). It is a technique learned by practice: holding the
shown look without tells and moving to the played spot on the snap count. 0–100, 50 average.

- **Starting values.** No public measurement exists, so like `discipline` (ADR-072) it has no
  `defaultFrom`, and every player reads 50 until the attributes pipeline can derive it. At 50
  everywhere, §4.3 adds nothing to today's read, exactly.
- **Not `discipline`.** Discipline is whether a player obeys his instructions when his own read says
  otherwise (ADR-072). Disguise is a technique that grows with reps under a coach. Different things,
  so different ratings.

### 4.3 The read: a coverage look holds only as well as its weakest mover

*Owner Q5 (2026-10-16 19:14): the weakest disguiser decides how well **the coverage** disguise holds.
A man who is bad at disguising a blitz does not give away the coverage; he only ruins his own
assignment on the play.*

The **coverage movers** of a worn look are the defenders whose shown coverage assignment differs
from their played one (both are on the call already: `shownAssignments` against `assignments`).
The look's disguise term is the **weakest coverage mover's** rating: `(disguise − 50) ÷ 5`, from −10
to +10, filling §5.1's Defensive Disguise Rating in `50 + Defensive Disguise Rating + complexity`.
A disguise held by two good safeties and one poor slot corner reads like the slot corner.

**Rushers and blitzers are not coverage movers.** A linebacker walked up to show blitz who drops,
or one who shows coverage and blitzes, never enters this term. A poor one pays only through his own
execution roll (§4.4): he is late to his drop or his gap, and nobody else's assignment suffers.

`CHOSEN — provenance NONE` for the scale; the weakest-mover rule and the coverage-only scope are the
owner's (Q5).

### 4.4 The cost: getting there late

**Today a disguise is free.** The engine plays every defender from his played assignment and uses
the shown one only for the quarterback's read (`passPlay.ts:424`), so wearing a look can only help
the defence. With a free disguise, the best coordinator would always disguise as much as he could,
and a static coordinator would simply be a worse one. The owner's account says otherwise.

**Proposal.** On a worn look, each mover (coverage or pressure) rolls once at the snap, and its result touches **only his own assignment**: `d100 + disguise ÷ 5 + awareness ÷ 5`
against `50 + complexity` (the same +10 early rotation, +20 late rotation, +10 corner bail rows the
read uses).
- **Made it:** plays his assignment exactly as today.
- **Late** (missed by up to 29): reaches his landmark a beat late; for a pressing corner faking off,
  the receiver gets a free release. The size of "a beat" is a tunable, `CHOSEN — provenance NONE`.
- **Bust** (missed by 30 or more): he does not get there; his man or zone is open on that snap.

This keeps ADR-069's rule that a mask never changes the **call**: what is called is still played.
What changes is that a call can be **executed** badly, which is physics on the played men, and the
reason it is an owner question (Q6). A coordinator who disguises late and often with players who
are poorly trained will outsmart himself, which is the account's last line.

### 4.5 The coordinator's skill: teaching disguise

*Owner Q4 (2026-10-16): use the existing `teaching` coach attribute, not a new one.* The DC's
`teaching` (today "Playbook install rate", `registry.ts:272`) also drives how fast his players'
`disguise` grows in Spec #11's DevelopmentTick (§4.4 there: position coach `development` ×
coordinator multiplier × reps × age), as the coordinator multiplier for this one rating. A coach who
installs fast also teaches disguise well; that is the owner's call, and it means one rating has two
consumers, which calibration's sensitivity report on `teaching` must show separately (§5).

**Practice time follows his style.** The share of practice spent on disguise follows the
coordinator's own rate: a static coordinator's players barely practise it. So a disguise-heavy
coordinator who inherits a static coordinator's secondary has a hard first year, and that is the
account's point about talent and philosophy going together.

### 4.6 When the training happens

All three windows, weighted (`CHOSEN — provenance NONE`; the calendar phases exist in
`calendar.ts:3-7`, and practice allocation is already a weekly task in `franchise-calendar.md:42`):

| window | share of a year's growth | why |
|---|---|---|
| OTAs and minicamp (spring) | about a quarter | install: learning this coordinator's looks |
| Training camp | about half | the heaviest team reps; full-speed rotations against a live offence |
| Regular season, weekly | about a quarter | upkeep and polish, as much as the week's practice plan gives it, plus live game snaps in disguised looks |

**Injury.** A player who is not practising gets no growth that week; limited practice gets part. A
player who misses camp misses the biggest window. A new arrival also goes through PlaybookInstall
(Spec #11 §4.5) for this coordinator's looks, so a mid-season signing is a weaker disguiser at first.

### 4.7 In calibration

The test league's players all read 50 and its caller keeps one league rate, so §4.3 changes nothing
there. §4.4 changes things even at 50 (an average player is sometimes late), so it gets its own arms.
Training needs a franchise season and is not measured by the match calibration at all.

## 5. Conjoined mechanisms

Five things, separately priceable: **(a)** the spread of how often (league mean held), **(b)** look
preferences, **(c)** the weakest-mover read term, **(d)** the execution roll, **(e)** training.
(a) and (b) are predicted to move nothing measurable league-wide (the mean is held; ADR-070 §10 found
the looks alone inert). (c) is inert at 50 everywhere and is measured with spread ratings.
(d) is predicted to raise completions and yards on disguised snaps, since today's disguises cost
nothing. (c) and (d) pull in opposite directions on the same snaps, so they are measured alone and
together (§6 T5, T6). (e) is measured over franchise seasons, once those exist.

## 6. Build order (later, each step its own commit and owner yes)

| step | what | engine? | proof |
|---|---|---|---|
| **T1** | `selectLooks` takes the rate, look weights and late share as inputs, defaulting to today's constants | no (playbook) | same seeds, identical stream on the frozen caller; suite green with zero test changes |
| **T2** | contracts: the tendency on `StaffState`; player attribute `disguise` (registry bump); `teaching`'s description gains disguise growth (Q4) | no | contracts tests; absent field and rating 50 = today |
| **T3** | coordinator generator: tendencies drawn in Q2's range, league mean held (§3.3) | no | league mean exact; spread within 10%–55% |
| **T4** | calibration arm: a league of spread coordinators through the frozen caller, named in its identity | no | league `disguise_rate` 30–33%; per-team rates match; completion, `int_rate` as guards |
| **T5** | the weakest-mover read term (§4.3) | **yes** (coverage read) | rating 50 everywhere ≡ today's stream; arms at spread ratings |
| **T6** | the execution roll (§4.4) | **yes** (coverage physics) | arms: T6 alone, T5 + T6; completion, yards and `int_rate` on the disguised population |
| **T7** | training (§4.5–4.6) in DevelopmentTick | no (franchise) | waits for DevelopmentTick to exist; growth curves per window, injury weeks give none |

T1–T4 can follow ADR-073 directly. T5 and T6 wait until ADR-073's measurements are finished, so
their changes do not land under another thread's arms.

## 7. Provenance

| claim | source | kind |
|---|---|---|
| 30–33% target, coverage only | owner, ADR-069 rulings 3–4 | REPORTED (owner-stated, no source on file) |
| League rate 31.4%, `COVERAGE_MASK_RATE` 0.323, 97.5% maskable | ADR-069 §11 run `adr-069:pilot` | REPORTED from that run; constant read at `distribution.ts:332` |
| Equal look weights, `LATE_ROTATION_SHARE` 0.25 | `masks.ts:530`, `distribution.ts:339` | read; both `CHOSEN — provenance NONE` |
| Front-look rate 1 in 10 | ADR-073 Q5(a), owner 2026-10-16 | REPORTED |
| Disguise Rating not rolled | `tunables.ts:246-249`, `docConformance.ts:633` | read |
| Calibration caller coach-agnostic | `coaching-staff.md` §4.3, `frozen.ts:230-236` | read |
| `StaffState`, role `DC`, coach registry has no disguise attribute | `players.ts:113-127`, `registry.ts:264-284` | read |
| 48.2% / 23.1% see-through vs fooled | ADR-070 §10 arm C | REPORTED |
| `(disguise − 50) ÷ 5`, range ±10; the execution roll's form and "a beat late" | — | `CHOSEN — provenance NONE` |
| Spread bounds 10%–55% | owner, Q2 (2026-10-16) | owner-ruled |
| League 32% average; Rams 50.5%; static coordinators (Bradley, Schwartz) | owner's pasted account, 2026-10-16, citing Yahoo Sports, Athlon Sports, PFF | REPORTED, not ingested |
| Weakest mover gives the look away | owner's account ("if one moves too early, the QB spots it") | REPORTED |
| Shown assignments feed only the read; physics plays the played ones | `passPlay.ts:424`, `game/playbook.ts:418-441` | read |
| Calendar phases; practice allocation a weekly task; DevelopmentTick, PlaybookInstall | `calendar.ts:3-7`, `franchise-calendar.md:42`, `coaching-staff.md` §4.4-4.5 | read (spec, not built) |
| Training window shares (¼ spring, ½ camp, ¼ season) | — | `CHOSEN — provenance NONE` |

## 8. Implied scope (`unruled`)

- **Blitz disguise.** §5.3's Blitz Disguise Rating and `BLITZ_DISGUISE_MIX` (`distribution.ts:303`)
  are the pressure twin of this ADR. ADR-073 owns the front; a coordinator's pressure tendency is
  not designed here.
- **Situational disguise** (more on third down, less in the red zone): ADR-071's call sheet by
  situation, once coordinators exist.
- **Film study.** A quarterback reading a coordinator he has studied better (GameplanPacket).
- **Exploiting the offence's rules** (the owner's account, point 3): a coordinator studying the
  quarterback's checks and baiting them. That is the weekly game plan (Spec #11 §4.1), not built.
- **Pressure disguise by players.** The Blitz Disguise Rating's twin of §4.3 for linebackers walking
  up and bailing: same rating, not designed here.
- **Tendency drift** over a career, and a new coordinator installing his tendency (PlaybookInstall).

## 9. Questions for the owner

In plain words in [ADR-075-questions-explained.md](ADR-075-questions-explained.md), and on cards in
the thread. Q1–Q3 are ruled (§10). The first draft's Q4 (the coordinator's own rating in the read)
is withdrawn by the redesign of §4 and replaced by Q4–Q7. All seven are ruled (§10).

## 10. Decision

| # | question | ruling | when |
|---|---|---|---|
| Q1 | How often, how well, or both | ✅ **Both**, built "how often" first; "how well" (§4) waits for ADR-073's measurements | owner, 2026-10-16 18:46 |
| Q2 | Spread of how often | ✅ **Wide**: 10% to 55% of passing snaps, league mean held at 31.5% (§3.3). The top of the range is a per-call die of 0.55 ÷ 0.975 ≈ 0.564 | owner, 2026-10-16 18:56 |
| Q3 | What else the style carries | ✅ **All three**: favourite looks and rotation timing now; the fake-rush (front-look) rate once ADR-073 step 3.5 builds those looks, kept separate from the 30–33% | owner, 2026-10-16 18:56 |
| Q4 (first draft) | Own rating or Play Calling | withdrawn: §4 redesigned on the owner's note (players execute, coordinator trains) | owner note, 2026-10-16 18:56 |
| Q4 | Coach skill: own rating or the existing Teaching | ✅ **Use Teaching**: the DC's `teaching` drives disguise growth; no new coach attribute (§4.5) | owner, 2026-10-16 19:07 |
| Q5 | Player rating; weakest mover or average | ✅ **Weakest**, for the coverage disguise only; a poor blitz disguiser ruins only his own assignment (§4.3, §4.4) | owner, 2026-10-16 19:14 |
| Q6 | Disguise carries a cost | ✅ **Yes**: the execution roll (§4.4), on time / a beat late / bust, on every mover of a worn look | owner, 2026-10-16 19:14 |
| Q7 | When training happens | ✅ **All three windows, camp biggest**: spring ~¼, camp ~½, season ~¼; no growth in weeks a player does not practise (§4.6) | owner, 2026-10-16 19:14 |
