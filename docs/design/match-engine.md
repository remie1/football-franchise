# NFL Management Game - Complete Design Document

## Overview

This document contains the complete game mechanics for a play-by-play NFL simulation game focused on coaching decisions and play-calling. The simulation resolves each play through a series of dice rolls modified by player attributes, scheme matchups, and situational factors.

### Core Design Principles

1. **Dice create variance, narrative explains results** - Don't create separate modifiers for things like "clean drop by receiver" - let the dice roll high/low and assign narrative afterward.
2. **Mechanics vs. narrative** - A mechanic should only exist if it changes outcomes. If something just explains a result, it's narrative, not a mechanic.
3. **Time is continuous** - Plays resolve through ticks (0.5 second increments) where situations evolve.
4. **Location matters** - Zone-based field model tracks where every player is.
5. **Relative effectiveness** - What's "open" depends on who's throwing; what's "blocked" depends on who's rushing.

---

## TABLE OF CONTENTS

1. [Dice System & Basic Mechanics](#1-dice-system--basic-mechanics)
2. [Time & Phase Structure](#2-time--phase-structure)
3. [Zone-Based Field Model](#3-zone-based-field-model)
4. [Player Attributes](#4-player-attributes)
5. [Pre-Snap Phase](#5-pre-snap-phase)
6. [Offensive Line vs. Defensive Line](#6-offensive-line-vs-defensive-line)
7. [Pass Rush vs. Protection](#7-pass-rush-vs-protection)
8. [QB Decision-Making System](#8-qb-decision-making-system)
9. [Route vs. Coverage Resolution](#9-route-vs-coverage-resolution)
10. [Throw Execution](#10-throw-execution)
11. [Catch Resolution](#11-catch-resolution)
12. [Tipped Ball System](#12-tipped-ball-system)
13. [YAC (Yards After Catch)](#13-yac-yards-after-catch)
14. [Run Game Resolution](#14-run-game-resolution)
15. [Special Situations](#15-special-situations)
16. [Environmental Factors](#16-environmental-factors-weather-stamina-crowd-noise)
17. [Debug Output System](#17-debug-output-system)

---

## 1. DICE SYSTEM & BASIC MECHANICS

### 1.1 Standard Roll

All contested actions use: `d100 + Total Modifiers vs. Target Number`

```
STANDARD ROLL:
  Roll: d100
  Add: Sum of all applicable modifiers
  Compare: Result vs. Target Number
  
  Result >= Target Number: SUCCESS
  Result < Target Number: FAILURE
  
  Margin of success/failure may determine quality
```

### 1.2 Opposed Rolls

When two players directly contest:

```
OPPOSED ROLL:
  Player A: d100 + A's modifiers
  Player B: d100 + B's modifiers
  
  Higher total wins
  Ties: Use tiebreaker rules (usually offense wins possession ties)
```

### 1.3 Attribute Contribution

Most attributes contribute as: `Attribute Rating ÷ 5` (rounded)

Example: A player with 85 Speed contributes +17 to speed-related rolls.

### 1.4 Trait Bonuses

Special traits provide flat bonuses (typically +10 to +20) in specific situations.

---

## 2. TIME & PHASE STRUCTURE

### 2.1 Tick System

Each play resolves through 0.5-second ticks. Events occur at specific ticks:

```
TICK TIMELINE (Pass Play):

Tick 0.0: SNAP
  - Ball snapped
  - All players begin assignments
  
Tick 0.5: IMMEDIATE POST-SNAP
  - Coverage shell reveals (disguise check)
  - Blitz shows
  - Press release battles begin
  
Tick 1.0: DEVELOPMENT
  - Short routes becoming available
  - Pass rush engaging
  - QB first read available
  
Tick 1.5: MID-PROGRESSION
  - Intermediate routes available
  - Pocket integrity check
  - QB second read
  
Tick 2.0: LATE PROGRESSION
  - Deep routes available
  - Pass rush winners emerging
  - QB third read / pressure building
  
Tick 2.5: EXTENDED
  - All routes at peak or declining
  - Pocket likely compromised
  - QB must decide: throw, scramble, or checkdown
  
Tick 3.0+: BREAKDOWN
  - Routes lose separation (coverage closes)
  - Pass rush wins accumulating
  - Scramble drill or sack imminent
```

### 2.2 Play Phases

```
PHASE 1: PRE-SNAP (Before snap)
  - Alignment
  - Recognition checks
  - Audibles/checks

PHASE 2: LINE BATTLE (Ticks 0.0-1.5)
  - OL vs DL engagements
  - Gap assignments
  - Protection schemes

PHASE 3: SKILL DEVELOPMENT (Ticks 0.5-2.5)
  - Routes developing
  - Coverage assignments executing
  - RB reading holes

PHASE 4: DECISION POINT (Varies by play type)
  - QB target selection
  - RB cut decision
  - Defensive adjustments

PHASE 5: EXECUTION
  - Throw/handoff
  - Catch/tackle attempts

PHASE 6: RESOLUTION
  - Yards gained
  - Ball fate
  - Down/distance update
```

---

## 3. ZONE-BASED FIELD MODEL

### 3.1 Horizontal Zones

The field is divided into zones that track player positions:

```
       LEFT SIDELINE                              RIGHT SIDELINE
            |                                           |
            |   LEFT      LEFT    CENTER    RIGHT    RIGHT   |
            |   WIDE     HASH              HASH     WIDE     |
            |   (LW)      (LH)     (C)     (RH)     (RW)    |
            |                                           |
```

### 3.2 Vertical Zones (Depth)

```
BACKFIELD (-5 to 0 yards):
  - QB, RB, FB positions
  - Pass protection zone
  
SHORT (0-10 yards):
  - Underneath routes
  - Flat, hitch, slant territory
  
INTERMEDIATE (10-20 yards):
  - Dig, out, crossing routes
  - Seam routes developing
  
DEEP (20-35 yards):
  - Corner, post routes
  - Deep safety territory
  
VERY DEEP (35+ yards):
  - Go routes
  - Prevent coverage depth
```

### 3.3 Zone Interactions

Players in the same zone can directly interact. Adjacent zones can interact with speed/reaction checks.

```
ZONE INTERACTION RULES:

Same Zone:
  - Full interaction (blocking, coverage, tackling)
  - No penalty to rolls

Adjacent Zone:
  - Must pass speed check to interact
  - -10 to interaction rolls
  - Reaction attribute determines who arrives first

Two Zones Away:
  - Only possible on extended plays (floaters, scrambles)
  - Must have elite speed + anticipation
  - -25 to interaction rolls
```

---

## 4. PLAYER ATTRIBUTES

### 4.1 Quarterback Attributes

| Attribute | Description | Primary Use |
|-----------|-------------|-------------|
| **Awareness** | Sees the full field accurately | Pre-snap reads, spotting disguised defenders, peripheral vision while scrambling |
| **Football IQ** | Understanding of schemes/coverages | Pre-snap read success, audible decisions, coverage weakness exploitation |
| **Decision Making** | Chooses correct targets | Processing speed (reads per tick), risk/reward choices |
| **Accuracy** | Ball placement quality | Throw placement within catch window |
| **Arm Strength** | Raw power and velocity | Deep throws, tight windows, required for certain throw types |
| **Touch** | Velocity variation | Soft passes, lobs over defenders, arc control |
| **Pocket Patience** | Willingness to hold | Time budget before checkdown/scramble |
| **Poise** | Performance under pressure | Resisting accuracy penalties from pressure |
| **Improvisation** | Off-script playmaking | Scramble decisions, finding receivers outside structure |
| **Release** | Throw quickness | Time from decision to ball release |
| **Mobility** | Movement in/out of pocket | Scramble speed, evading rushers |

### 4.2 Offensive Line Attributes

| Attribute | Description | Primary Use |
|-----------|-------------|-------------|
| **Pass Block** | Sustaining blocks vs. rushers | Time provided in pocket |
| **Run Block** | Creating movement at POA | Gap creation, second-level climbing |
| **Strength** | Raw power | Bull rush defense, double teams |
| **Anchor** | Holding ground | Resisting power moves |
| **Footwork** | Lateral movement | Mirroring speed rushers |
| **Awareness** | Recognizing threats | Stunt pickup, blitz recognition |
| **Sustain** | Maintaining blocks | How long blocks last |
| **Pull** | Ability to pull/trap | Power/counter schemes |

### 4.3 Defensive Line Attributes

| Attribute | Description | Primary Use |
|-----------|-------------|-------------|
| **Pass Rush** | Beating blockers to QB | Generating pressure/sacks |
| **Run Stuff** | Stopping the run | Gap control, tackle for loss |
| **Power Move** | Bull rush, push/pull | Interior penetration |
| **Finesse Move** | Spin, swim, rip | Edge rushing, counters |
| **First Step** | Initial burst | Getting off the snap |
| **Strength** | Raw power | Holding point of attack |
| **Pursuit** | Chasing plays | Backside run defense |
| **Block Shed** | Disengaging | Getting off blocks to make plays |

### 4.4 Linebacker Attributes

| Attribute | Description | Primary Use |
|-----------|-------------|-------------|
| **Tackling** | Bringing down ballcarrier | Tackle success rate |
| **Pursuit** | Chasing plays sideline to sideline | Run support angles |
| **Play Recognition** | Reading offense | Filling correct gaps |
| **Zone Coverage** | Covering areas | Defending zones |
| **Man Coverage** | Covering players | Defending TEs, RBs |
| **Pass Rush** | Rushing the QB | Blitz success |
| **Block Shed** | Getting off blocks | Making plays vs. run |
| **Instincts** | Reading QB/RB eyes | Anticipating routes, cuts |

### 4.5 Defensive Back Attributes

| Attribute | Description | Primary Use |
|-----------|-------------|-------------|
| **Man Coverage** | Staying with receivers | Route coverage |
| **Zone Coverage** | Covering areas | Reading QB, jumping routes |
| **Press** | Jamming at LOS | Disrupting timing |
| **Ball Skills** | Making plays on ball | Interceptions, PBUs |
| **Tackling** | Stopping after catch | Limiting YAC |
| **Speed** | Straight-line speed | Deep coverage |
| **Acceleration** | Getting to top speed | Closing on routes |
| **Agility** | Change of direction | Mirroring receivers |
| **Reaction** | Response time | Breaking on ball/routes |
| **Awareness** | Understanding routes/schemes | Anticipating breaks |

### 4.6 Wide Receiver Attributes

| Attribute | Description | Primary Use |
|-----------|-------------|-------------|
| **Route Running** | Quality of routes | Separation creation |
| **Release** | Getting off press | Beating jam |
| **Speed** | Straight-line speed | Deep routes |
| **Acceleration** | Burst | Separation on breaks |
| **Agility** | Change of direction | Sharp cuts |
| **Catching** | Securing the ball | Catch success |
| **Catch in Traffic** | Catching with contact | Contested catches |
| **Spectacular Catch** | Difficult catches | Diving, one-handed |
| **YAC** | Yards after catch | Breaking tackles, elusiveness |
| **Run Block** | Blocking for run game | Perimeter blocking |

### 4.7 Running Back Attributes

| Attribute | Description | Primary Use |
|-----------|-------------|-------------|
| **Speed** | Straight-line speed | Breakaway runs |
| **Acceleration** | Burst | Hitting holes |
| **Agility** | Change of direction | Cuts, jukes |
| **Vision** | Reading blocks/holes | Finding lanes |
| **Elusiveness** | Making tacklers miss | Broken tackles |
| **Power** | Running through contact | Short yardage |
| **Ball Security** | Holding onto ball | Fumble avoidance |
| **Catching** | Receiving ability | Check-down targets |
| **Pass Block** | Protection | Blitz pickup |
| **Patience** | Waiting for holes | Zone scheme running |

### 4.8 Tight End Attributes

Combination of OL blocking attributes and WR receiving attributes, weighted by TE type.

### 4.9 Special Traits

Traits provide situational bonuses. Examples:

| Trait | Bonus | Triggers When |
|-------|-------|---------------|
| **Ball Hawk** | +15 to INT attempts | Defending passes in zone |
| **Clutch** | +10 to all rolls | 4th quarter, close games |
| **High Motor** | +5 to pursuit | Every pursuit situation |
| **Pass Swatter** | +20 to tip attempts | D-lineman batting passes |
| **Press Specialist** | +15 to press | Jamming at line |
| **Reliable Hands** | +10 to catch | All catch attempts |

---

## 5. PRE-SNAP PHASE

### 5.1 Coverage Shell Recognition

```
QB COVERAGE READ:

Roll: d100 + (QB Awareness ÷ 5) + (QB Football IQ ÷ 5)

vs.

Target: 50 + (Defensive Disguise Rating) + Complexity Modifier

Complexity Modifiers:
  Basic shell (Cover 2, Cover 3): +0
  Rotated shell: +10
  Heavy disguise (late rotation): +20
  
SUCCESS RESULTS:
  Beat by 30+: Perfect read (knows exact coverage)
  Beat by 15-29: Good read (knows shell type)
  Beat by 0-14: Adequate read (knows MOFO/MOFC)
  
FAILURE RESULTS:
  Miss by 1-14: Partial read (uncertain)
  Miss by 15-29: Misread (thinks wrong shell)
  Miss by 30+: Complete misread (inverted understanding)
```

### 5.2 MOFO/MOFC Identification

Modern QB reading starts with identifying the safety structure:

```
MOFO (Middle Of Field Open):
  - Two high safeties
  - Typically Cover 2, Cover 4, or Cover 6
  - Vulnerable to middle of field
  
MOFC (Middle Of Field Closed):
  - Single high safety
  - Typically Cover 1, Cover 3
  - Vulnerable to sidelines
```

### 5.3 Blitz Recognition

```
BLITZ RECOGNITION:

Roll: d100 + (QB Awareness ÷ 5) + (Center Awareness ÷ 5)

vs.

Target: 50 + (Blitz Disguise Rating)

Disguise Ratings:
  Standard blitz (LB walked up): +0
  Zone blitz (dropping lineman): +15
  Delayed blitz: +20
  0-blitz from coverage shell: +25

SUCCESS: Hot route available, protection adjusted
FAILURE: Free rusher potential
```

### 5.4 Audibles

```
AUDIBLE CHECK:

If QB has correct read AND play has audible option:
  
  Roll: d100 + (QB Football IQ ÷ 5)
  
  vs.
  
  Target: 50 + (Defense Adjustment Speed)
  
SUCCESS: Audible executed, play advantage
FAILURE: Audible executed but defense adjusts (neutral)

CRITICAL FAILURE (miss by 30+): 
  Audible miscommunication, possible penalty or busted play
```

---

## 6. OFFENSIVE LINE VS. DEFENSIVE LINE

### 6.1 Gap System

```
GAP ASSIGNMENTS:

        LT    LG    C    RG    RT    
          \    |    |    |    /
     D     C    B    A    A    B    C     D    
                    |
               (Center)

Gap Names:
  A Gap: Between center and guard
  B Gap: Between guard and tackle
  C Gap: Outside the tackle
  D Gap: Outside tight end (edge)
```

### 6.2 Blocking Schemes

#### Zone Blocking

```
ZONE SCHEME:
  - All linemen move in same direction
  - Block whoever enters your zone
  - Creates multiple potential holes
  
RB Vision Dependency: HIGH
  - RB must read blocks and find lane
  - Cutback lanes available if defense overflows
  
Resolution:
  For each gap, check if defender maintains gap integrity
  Roll: Defender Gap Discipline vs. OL Zone Execution
```

#### Gap/Power Blocking

```
GAP SCHEME:
  - Specific man assignments
  - Pulling guards/tackles
  - Double teams at point of attack
  
RB Vision Dependency: LOW
  - Designed hole
  - RB hits it decisively
  
Resolution:
  Individual blocker vs. defender matchups
  Each engagement resolved separately
```

### 6.3 Run Blocking Resolution

```
RUN BLOCK ENGAGEMENT:

For each gap in the play design:

1. Identify matchup (OL vs. DL or LB)

2. Roll: d100 + (OL Run Block ÷ 5) + (OL Strength ÷ 5)
   
   vs.
   
   Roll: d100 + (DL Run Stuff ÷ 5) + (DL Strength ÷ 5)

3. Apply scheme modifiers:
   Double team: +20 to OL
   Pulling blocker in space: -10 to OL, +10 to defender
   
4. Results:
   OL wins by 20+: Defender driven back, hole opens wide
   OL wins by 1-19: Defender sealed, hole exists
   Tie: Stalemate at LOS
   DL wins by 1-19: Penetration, hole closes
   DL wins by 20+: TFL opportunity, defender in backfield
```

### 6.4 Second-Level Climbing

```
CLIMB TO LINEBACKER:

Triggers when OL wins first-level block by 10+:

Roll: d100 + (OL Awareness ÷ 5) + (OL Sustain ÷ 5)

vs.

Target: 50 + (LB Play Recognition ÷ 5)

SUCCESS: LB engaged, clean lane for RB
FAILURE: LB free to make play
```

---

## 7. PASS RUSH VS. PROTECTION

### 7.1 Individual Pass Rush Matchup

```
PASS RUSH ENGAGEMENT:

Each tick, resolve each rusher vs. blocker:

Roll: d100 + (DL Pass Rush ÷ 5) + Move Modifier

vs.

Roll: d100 + (OL Pass Block ÷ 5) + (OL Footwork ÷ 5)

Move Modifiers:
  Speed rush: + (DL First Step ÷ 5)
  Power rush: + (DL Power Move ÷ 5) + (DL Strength ÷ 5)
  Finesse (spin/swim): + (DL Finesse Move ÷ 5)
  Counter move: +15 if previous tick was stalemate

Results per Tick:
  Blocker wins by 15+: Rusher reset, starts fresh next tick
  Blocker wins by 1-14: Rusher contained, no progress
  Tie: Slight pressure, -5 to QB accuracy if all matchups are ties
  Rusher wins by 1-14: Rusher gaining, blocker sliding
                       (SPLIT at 5 — see the note below)
  Rusher wins by 15+: Rusher wins rep, pressure/hit next tick
```

> **CONSEQUENCE OF §7.2's AMENDMENT (July 2026, ADR-033) — the 1–14 row is now two bands.**
> §7.2 no longer treats a rusher who has merely gained ground as pressure, so this row had
> to distinguish *beaten* from *losing*. The boundary is **5**, and it was **not invented
> for this table** — it is `resultTierLadder`'s `SUCCESS` boundary, the same nine-tier scale
> every check in the game is read on, which this table already agreed with at 15
> (`STRONG_SUCCESS`), 1 (`MARGINAL_SUCCESS`) and −15 (`STRONG_FAILURE`).
>
> | band | margin | tier | reading | pocket floor |
> |---|---|---|---|---|
> | `RUSHER_WINS_REP` | 15+ | `STRONG_SUCCESS` | past him and travelling | COLLAPSING |
> | `BLOCKER_BEATEN` | 5–14 | `SUCCESS` | leverage won; the blocker is recovering, not controlling | PRESSURE |
> | `RUSHER_GAINING` | 1–4 | `MARGINAL_SUCCESS` | gained a step; the blocker is still in front of him | **CLEAN** |
>
> Both bands advance the pressure counter identically (+1, no reset), so the counter cannot
> tell them apart and the whole measured effect belongs to the status map. This also makes
> the two mechanisms agree for the first time: the floor says *one* tick of gaining is not
> pressure, the counter says *three* ticks of it is — **a rusher who gains ground every tick
> is still pressure, he just has to actually do it.** Previously the floor short-circuited
> the counter and that sentence was unreachable.

> **KNOWN ISSUE (logged July 2026, Phase 1 slice) — term asymmetry.**
> The rusher above carries two-to-three attribute terms (`Pass Rush` plus a move
> modifier, and a power rush adds both `Power Move` *and* `Strength`) against the
> blocker's two (`Pass Block`, `Footwork`). An evenly-rated matchup therefore favours
> the rush by roughly 15 points **structurally**, before any dice are thrown — on the
> literal formula every pocket collapses inside 1.5s.
>
> The engine currently absorbs this in a named tunable
> (`TUNABLES.passRush.blockerStructuralAdvantage: +15`, marked `INTERPRETATION`,
> settable to 0 to recover the formula as written). That is a **holding position, not a
> ruling.** Phase 3 must deliberately choose between adding a real blocker term
> (`Anchor` or `Strength` — what a human reading the two lists would say is missing, and
> which restores symmetry in attributes rather than in a constant) and keeping the flat
> term. See `docs/decisions/CALIBRATION-BACKLOG.md` §3.

### 7.2 Pocket Status

```
POCKET STATUS (tracked each tick):

CLEAN POCKET:
  - All rushers contained
  - QB has full accuracy, full time
  
POCKET PRESSURE:
  - AMENDED July 2026 — see the note below. Was: "1+ rushers winning by 1-14"
  - 1+ rushers either (a) having WON a rep with an arrival inside the pressure
    horizon, or (b) winning by a margin high enough to mean the blocker is BEATEN
    rather than merely losing ground
  - QB accuracy: -10
  - QB processing: -1 read capacity
  
POCKET COLLAPSING:
  - 1+ rushers won (winning by 15+) previous tick
  - QB accuracy: -20
  - QB must throw, move, or take hit
  
IMMEDIATE PRESSURE:
  - Rusher in QB's face
  - Must decide THIS tick: throw, scramble, or sack
  
SACK:
  - Rusher reaches QB before ball released
  - Play ends, loss of yardage
```

> **AMENDMENT (July 2026, owner ruling on ADR-032) — gaining ground is not pressure.**
> This section previously defined POCKET PRESSURE as *"1+ rushers winning by 1-14"*. The
> engine transcribed that faithfully; the band sat at `minMargin: 1`. **The doc was wrong.**
> Winning a rep and pressuring the passer are not the same event: a rusher who has gained a
> step at tick 1.0 with two more ticks of travel ahead of him has not affected the throw.
> Pressure in football means **the passer's platform, vision, or timing was disturbed** —
> arriving, or being close enough to force the throw. Gaining ground is neither.
>
> PRESSURE therefore now requires **either** (a) a **won** rep whose arrival falls inside the
> pressure horizon, **or** (b) a margin high enough that the blocker is **beaten** rather than
> merely losing ground. A rusher gaining by a single point against a blocker who is still in
> front of him is a CLEAN pocket.
>
> **What this amendment does NOT do.** It does not close the pressure-rate gap, and it must
> not be cited as though it had. ADR-032 measured the whole reachable domain of this band map
> at **2.382pp of pressure and 0.000pp of sack**, and showed that with **every** classification
> threshold in this section extinguished, **88.3% of the divergence survives** — the rate is
> produced by the *supply* of threats (§7.1), not by how §7.2 classifies them. This is a
> **definition correction**, banked because it is directionally right and buys nothing
> downstream. The gap itself is `CALIBRATION-BACKLOG.md` entry 40, and remains open.

> **KNOWN ISSUE (logged July 2026, Phase 1 slice) — the missing "move" branch.**
> COLLAPSING gives the quarterback three options: "throw, **move**, or take hit." The
> Phase 1 engine implements *throw* and *take hit* only — step-up and scramble (§8.8) are
> out of slice scope. A QB with no available target under COLLAPSING therefore resolves to
> a sack, because two of his three options do not exist. Combined with a correct
> single-won-rep COLLAPSING rule, this produces a **56% sack rate, 74% of it at tick 1.0**.
>
> There is also no **rusher time-of-arrival model**: a rusher who wins his rep at 0.5s is
> treated as being on the quarterback immediately, rather than needing time to cover the
> ground. Sack rate cannot be calibrated at any dial setting until that exists.
> See `docs/decisions/CALIBRATION-BACKLOG.md` §2.

### 7.3 Stunts and Twists

```
STUNT EXECUTION:

When defense calls stunt/twist:

1. OL COMMUNICATION CHECK:
   Roll: d100 + (Center Awareness ÷ 5) + (Adjacent OL Awareness ÷ 5)
   vs. Target: 60 + (Stunt Complexity)
   
   Stunt Complexity:
     T/E Twist: +0
     T/T (tackle twist): +10
     Delayed twist: +15
     Triple exchange: +25

2. If OL passes check:
   - Blocks pass off cleanly
   - Normal matchups resume
   
3. If OL fails check:
   - Free rusher created (the looper)
   - Looper gets unblocked rush at QB
```

### 7.4 Blitz Pickup

```
BLITZ PICKUP:

When extra rusher (LB or DB) comes:

1. PROTECTION RECOGNITION:
   Did protection scheme account for blitzer?
   - Slide protection: Covered if blitzer on slide side
   - Man protection: Covered if RB/TE assigned
   
2. IF HOT ROUTE AVAILABLE:
   QB must recognize and throw hot
   Uses Awareness check from Pre-Snap
   
3. IF PICKED UP BY RB/TE:
   Roll: RB/TE Pass Block vs. Blitzer Pass Rush
   
4. IF FREE RUNNER:
   Blitzer reaches QB in ~1.5 SECONDS (see the note below — this said "ticks")
   QB must throw or take sack
```

> **AUTHORING CORRECTION (July 2026) — the unit, not the value.**
> This step read *"~1.5 ticks"*. A tick is 0.5s (§2.1), so read literally that is **0.75s**,
> which is earlier than §9.2's fastest route can possibly declare — making **every blitz an
> automatic sack and hot routes decorative.** That is the same "unimplemented mechanic silently
> resolved as its worst alternative" pattern that produced the 56% sack rate, one layer up.
> The unit is corrected to seconds because it was unambiguously wrong.
>
> **KNOWN ISSUE — the VALUE is not ratified.** `TUNABLES.blitz.freeRunnerArrivalSeconds: 1.5`
> is an engine interpretation, not doctrine: at 1.5s the quick game beats a free runner and
> nothing else does, so the entire recognition-versus-pressure balance sits on it. It is
> **the first target of the Phase 3 sensitivity sweep** — see `CALIBRATION-BACKLOG.md`.
> Do not treat 1.5 as settled because the unit was fixed.

---

## 8. QB DECISION-MAKING SYSTEM

### 8.1 Reading Systems

Teams use one of three primary systems:

```
HALF-FIELD READS (Most common - 60% of NFL):
  - Pre-snap: ID coverage, choose a half
  - Post-snap: Work 2-3 reads within chosen half
  - Faster processing, but limited options
  
  Processing: 1 read per tick
  Max reads before checkdown: 3
  
FULL-FIELD PROGRESSIONS (Traditional - 25% of NFL):
  - Pre-snap: ID coverage
  - Post-snap: Work through full progression (1-2-3-4)
  - More options, but slower processing
  
  Processing: 0.5 reads per tick (takes longer)
  Max reads before checkdown: 4
  
CONCEPT READS (Spread/RPO heavy - 15% of NFL):
  - Pre-snap: ID key defender
  - Post-snap: Read key, throw based on key's action
  - Very fast, but binary
  
  Processing: 1 read per 0.5 ticks
  Max reads: 2 (then checkdown)
```

### 8.2 QB Processing

```
QB PROCESSING:

Each tick, QB can:
  1. Make a READ (see one target's status)
  2. DECIDE to throw
  3. HOLD (wait for routes to develop)
  4. SCRAMBLE (leave pocket)

READS PER TICK:
  Base: 1 read per tick
  + (QB Decision Making - 70) ÷ 20 extra reads
  
  Example: QB with 90 Decision Making
    (90-70) ÷ 20 = 1 extra read
    Can make 2 reads per tick (elite processor)
```

### 8.3 Awareness Check (Per Read)

```
AWARENESS CHECK:

For each target QB reads:

1. Calculate ACTUAL Openness (from route vs. coverage)

2. QB sees PERCEIVED Openness:
   
   Perceived = Actual + Variance
   
   AMENDED July 2026 (ADR-039 SA-09). The original text and its worked
   examples DISAGREED, and both are superseded — see the note below.
   
   Variance is SYMMETRIC ABOUT ZERO. Awareness narrows its HALF-WIDTH
   and NEVER shifts its centre.
   
   Elite QB (95 Awareness): a narrow band around the truth
     (rarely wrong, and never systematically optimistic)
   
   Average QB (75 Awareness): a wider band, still centred on truth
   
   Poor QB (60 Awareness): a wide band
     (misreads the situation in BOTH directions)
```

> **AMENDMENT (July 2026, owner ruling on ADR-039 SA-09) — awareness narrows the band; it does
> not bias the mean.**
>
> This section previously specified `+ (QB Awareness - 70) ÷ 5` annotated *"(reduces variance
> range)"*, while **its own worked examples did the opposite**: elite `-5 to +15`, average
> `-9 to +11`, poor `-12 to +8` — every range exactly **20 wide**, with only the **centre**
> moving. The prose said *variance*; the arithmetic said *bias*. The engine transcribed the
> arithmetic faithfully, so **an elite quarterback perceived receivers as MORE OPEN THAN THEY
> WERE**, and the doc's own parenthetical conceded it: *"slightly optimistic"*.
>
> **That is backwards as football.** Elite awareness means **seeing the field accurately** — a
> narrower band around the truth — not optimistically. A high-awareness passer should rarely be
> fooled *in either direction*; a low-awareness passer should be wrong *both ways*. Optimism is
> not a skill, and it is certainly not the same skill as awareness.
>
> **Both the sentence and the examples are superseded.** The sentence was right about the
> mechanism and the examples were right about nothing; they were not two readings of one rule.
>
> **The half-width mapping is deliberately left to the engine**, on the ADR-033 precedent: derive
> it from an existing scale in the game rather than inventing a constant, and state what was
> rejected. Two properties are required and are not the engine's to choose: **the distribution is
> centred on the true value at every awareness**, and **half-width is monotone decreasing in
> awareness**. Both are gateable — see Charter §4.1's monotonicity corollary.
>
> **⚠ THIS CANNOT BE MEASURED ON THE CURRENT CORPUS.** On the flat-60 synthetic league the term is
> a **constant −2 with zero variance across every quarterback**, so **no flat-league measurement
> bears on it** — this finding is *read*, never *swept*. It is the project's first
> **PHASE 2 MEASUREMENT ITEM**: a finding whose evaluation requires real attribute spread and must
> wait for `packages/attributes`. See `CALIBRATION-BACKLOG.md` entry 49.

### 8.4 Effective Openness

```
EFFECTIVE OPENNESS:

Base Openness: Determined by route vs. coverage (0-100)
  70+: Wide open
  50-69: Open
  30-49: Tight window
  15-29: Covered
  0-14: No window

EFFECTIVE Openness accounts for THIS QB's abilities:

If Base Openness < 50 (tight window):
  Window Modifier = (QB Accuracy - 70) ÷ 2
                  + (QB Arm Strength - 70) ÷ 4
                  + (QB Touch - 70) ÷ 4
  
  Effective = Base + Window Modifier

Example:
  Base Openness: 35 (tight window)
  
  Elite QB (90 Accuracy, 88 Arm, 85 Touch):
    Modifier = +10 + 4.5 + 3.75 = +18
    Effective: 53 (this is actually "open" for this QB)
  
  Average QB (75 Accuracy, 75 Arm, 75 Touch):
    Modifier = +2.5 + 1.25 + 1.25 = +5
    Effective: 40 (still a tight window)
```

### 8.5 Target Selection

```
TARGET SELECTION:

After processing all reads:

1. QB evaluates all Perceived Effective Openness values

2. Decision Quality Check:
   Roll: d100 + (QB Decision Making ÷ 5)
   vs. Target: 50
   
   Beat by 30+: OPTIMAL (takes best available)
   Beat by 15-29: GOOD (takes top 2 choice)
   Beat by 0-14: ADEQUATE (takes reasonable option)
   Miss by 1-14: QUESTIONABLE (may take suboptimal)
   Miss by 15+: POOR (likely takes wrong option)

3. Aggressive vs. Conservative:
   Some plays/situations push QB toward:
   - Aggressive: Higher upside targets
   - Conservative: Checkdowns, safe throws
```

### 8.6 Unseen Defender Check

```
UNSEEN DEFENDER CHECK:

After target selected but before throw:

For each defender QB didn't directly account for in reads:

Roll: d100 + (QB Awareness ÷ 5)
vs. Target: 50 + (Defender Disguise)

Disguise Modifiers:
  Defender in QB's vision cone: +0
  Defender behind other player: +15
  Defender rotating late: +20
  QB Spy: +25

SUCCESS: QB sees them, can adjust throw or change target
FAILURE: Throw proceeds without accounting for defender
  - If defender in passing lane: Interception risk
  - If defender closing on receiver: Contested catch risk
```

### 8.7 Hold Decision

```
HOLD VS. THROW DECISION:

If no target meets QB's threshold AND pocket is clean:

Time Budget = Base 2.5 ticks + (QB Pocket Patience - 70) ÷ 20 ticks

Example: Patient QB (90 Pocket Patience)
  Budget = 2.5 + 1 = 3.5 ticks before forced decision

Each tick held:
  + Routes develop further (+5 to openness per tick up to 3.0 ticks)
  - Coverage tightens after 3.0 ticks (-5 per tick)
  - Pass rush continues (pocket may degrade)
```

### 8.8 Scramble Decision

```
SCRAMBLE TRIGGER:

QB scrambles when:
1. Pocket collapses AND no hot route
2. Time budget exceeded AND no open target
3. Strategic decision (designed scramble/QB run)

SCRAMBLE VISION:

When scrambling, QB vision cone changes:
- Forward cone: Full awareness
- Direction of run: Reduced awareness (-20)
- Back toward line: Very limited (-40)

RECEIVER SCRAMBLE RULES:
On scramble trigger, receivers:
1. Stop running routes
2. Find open grass
3. Work back toward QB's vision cone

Scramble Resolution:
  QB Improvisation + Mobility vs. Pursuit
  See Phase 6 for full resolution
```

---

## 9. ROUTE VS. COVERAGE RESOLUTION

### 9.1 Release Battle (Press Coverage)

```
RELEASE VS. PRESS:

At Tick 0.5, if CB is in press:

Roll: d100 + (WR Release ÷ 5) + (WR Agility ÷ 5)

vs.

Roll: d100 + (CB Press ÷ 5) + (CB Strength ÷ 5)

Results:
  WR wins by 20+: Clean release, route on time, CB beat
  WR wins by 10-19: Clean release, route on time
  WR wins by 1-9: Release but delayed 0.5 ticks
  Tie: Delayed 1.0 tick
  CB wins by 1-9: Delayed 1.0 tick, CB in phase
  CB wins by 10-19: Delayed 1.5 ticks, CB in trail technique
  CB wins by 20+: Route disrupted, WR must improvise
```

### 9.2 Route Development

```
ROUTE DEVELOPMENT:

Each route has a development time:

Quick Routes (0-5 yards): Ready at Tick 1.0
  Slant, hitch, quick out, flat
  
Short Routes (5-10 yards): Ready at Tick 1.5
  Curl, out, dig, crossing
  
Intermediate Routes (10-20 yards): Ready at Tick 2.0
  Post, corner, deep out, seam
  
Deep Routes (20+ yards): Ready at Tick 2.5-3.0
  Go, fade, deep post, deep corner

Route Timing Modifiers:
  Jam at line: +0.5 to +1.0 ticks
  WR Speed (vs. depth): May arrive early
  Play-action: +0.5 ticks available (more time)
```

### 9.3 Man Coverage Resolution

```
MAN COVERAGE:

At route break point (when route "opens"):

Roll: d100 + (WR Route Running ÷ 5) + (WR Agility ÷ 5)

vs.

Roll: d100 + (CB Man Coverage ÷ 5) + (CB Agility ÷ 5)

Separation Results:
  AMENDED July 2026 (ADR-039 SA-08). Labels re-pointed onto §8.4's
  EXISTING five bands — one band DOWN from where they used to read.
  See the note below.

  WR wins by 30+:   5+ yards separation  -> 70  WIDE OPEN floor  (§8.4: 70+)
  WR wins by 20-29: 3-4 yards separation -> 52  OPEN             (§8.4: 50-69)
  WR wins by 10-19: 1-2 yards separation -> 38  TIGHT WINDOW mid (§8.4: 30-49)
  WR wins by 1-9:   half yard separation -> 30  TIGHT WINDOW flr (§8.4: 30-49)
  Tie:              even, bracket        -> 25  COVERED          (§8.4: 15-29)
  CB wins by 1-9:   CB in phase, trail position   -> 22  COVERED       (RULED July 2026 — was 25)
  CB wins by 10-19: CB on hip, can contest        -> 15  COVERED floor (held)
  CB wins by 20+:   CB in position for PBU/INT    ->  6  NO WINDOW     (held)
```

> **AMENDMENT (July 2026, owner ruling on ADR-039 SA-08) — the labels move; the scale does not.**
>
> §9.3's separation words and §8.4's openness numbers disagreed, and the audit found **both middle
> rows reading one band optimistic**. The resolution is **§8.4's scale, unchanged** — the labels here
> are re-pointed onto its existing five bands.
>
> **Why the scale does not move.** §8.4's thresholds are **load-bearing**: they are consumed by the
> effective-openness math and the tight-window modifier. **Adding a band there would change QB read
> mechanics to fix a labelling problem.** §9.3's words are *descriptive output of a separation
> contest* — they map onto the scale, they do not extend it.
>
> **Why one band down is right as football.** *Half a yard of separation is COVERED* — the throw has
> to be perfect and the defender can play the ball. **1–2 yards is a tight window.** Calling half a
> yard a "tight window" was flattering the receiver, and every read downstream inherited the
> flattery.
>
> **⚠ THE WORD "CONTESTED" LEAVES THE OPENNESS VOCABULARY ENTIRELY.** It was overloaded across two
> subsystems: here for *pre-throw geometry*, and in §11.1 for *catch resolution* — a usage ADR-039
> SA-14 has just sharpened. **It is reserved for §11.1.** An openness scale and a catch-contest scale
> sharing a term is how a reader conflates a pre-throw geometry with a post-throw event, and this
> document did exactly that for its whole life. Do not reintroduce it here under any spelling.
>
> ### RE-RULED July 2026 (ADR-043) — the first version was not arithmetically satisfiable
>
> **The original ruling mapped LABELS while the column is ORDINAL, and ignored row 5.** It put rows 3
> and 4 both into `covered (15-29)` while `CB_IN_PHASE` **already sits at 25 inside that interval** —
> so honouring *"tie → covered, low end"* **inverts the column**, and avoiding the inversion forces
> rows 3–4 into `26-29`, **compressing two distinct outcomes into four points of scale**, which is
> worse than the label imprecision it was fixing. An implementer following the recorded list would
> have written four cells and shipped an inverted column.
>
> **The corrected column above is monotone by construction, and every value sits inside the band its
> label names.** The substantive change: **row 4 lands at the tight-window FLOOR (30), not inside
> covered.** Half a yard of separation is the **boundary case** — the throw must be perfect and the
> defender can play the ball — and **30 is exactly where §8.4 draws that line.** Rows 1 and 2 keep the
> correction that motivated SA-08: they were reading one band optimistic.
>
> ### ⛔ SCOPE ENLARGED — this is now a SCALE CORRECTION ACROSS §9.3 AND §9.4, and must not land as §9.3 alone
>
> The derived consumer enumeration (ADR-043) surfaced three consequences **nobody proposed**, and two
> are disqualifying for a §9.3-only change:
>
> 1. **`targetSelection` would rank man and zone candidates on TWO DIFFERENT MAPPINGS.** That is not a
>    magnitude shift, **it is an incoherence** — it changes *who gets the ball*. **A scale used by two
>    producers cannot be corrected for one.** §9.4's zone bands are re-pointed in the same change, or
>    the change does not happen.
> 2. **`qb.throwThreshold` and its siblings** (`checkdown.threshold`, `desperationThreshold`, both
>    spellings of the tight-window boundary) would make the quarterback **materially more reluctant to
>    throw** — longer holds, more sacks, more throwaways — **with nothing erroring and no test pinning
>    those populations.** That is a **mechanic change riding inside a labelling fix**, the pattern this
>    project has refused every time it has appeared.
>
> **Therefore: the threshold consumers are enumerated and PINNED BEFORE the values move.**
>
> **In scope, same change:** `zoneCoverage.bands.1` is labelled *"open"* in §9.4 and holds **70 —
> §8.4's `wide open` FLOOR.** That is this very defect one table over, and it is **in scope**, not a
> separate finding.

> **LANDED July 2026 (ADR-045)** — §9.3's column, §9.4's zone bands and `zoneCoverage.bands.1` in one
> change, with the threshold consumers enumerated and pinned first. The QB-reluctance consequences are
> **priced separately** (ADR-045 §3) and nothing was compensated for.

> ### THE 25/25 TIE — RULED July 2026: `CB_IN_PHASE` 25 → 22
>
> ADR-045 landed the ruled five rows and **held** rows 6–8, which left `EVEN_BRACKET` (a dead-even
> rep) and `CB_IN_PHASE` (the corner has **won** the rep) **both at 25**. A tie, not an inversion — so
> the monotonicity gate accepted it — and it was **brought rather than tidied**, correctly.
>
> **Ruled: `EVEN_BRACKET` stays 25; `CB_IN_PHASE` moves to 22.** The football: **in phase, the
> defender has leverage** — he is between the receiver and the ball, or he has the hip, and **he can
> play the throw.** *Even* means neither has won, and **the receiver at least has the option of
> winning late.** Those are different situations and the column must not call them identical.
>
> **Why 22 and not lower:** it keeps `CB_IN_PHASE` comfortably inside `covered (15-29)`, leaves room
> beneath for rows 7–8 (15 and 6, both held), and preserves the roughly even spacing the rest of the
> column has. The full column is `70 / 52 / 38 / 30 / 25 / 22 / 15 / 6` — **strictly decreasing.**
>
> *(Standing instruction, same reasoning that refused `26-29`: if rows 7–8 could not have fit beneath
> 22 monotonically, that comes back as a question — it does not get solved by compression. They fit.)*
>
> **Also ratified:** `catching.contestedMaxOpenness` **40 → 30**. Not a choice — ADR-040's argument
> re-run against the re-pointed table returns the **same row**, and the alternative it weighed got
> *weaker* because SA-08's amendment deleted the "(contested)" parenthetical that rejection rested on.
> **The reclassification is nil** — the same five rows are contested before and after — which is the
> evidence it is not compensation. **Non-separability was confirmed by the compiler, not argued:** the
> type pin made `pnpm typecheck` red, which is the pin working exactly as ordered.

### 9.4 Zone Coverage Resolution

```
ZONE COVERAGE:

1. Determine which zone the route enters
2. Check if zone defender is present in that zone

If Zone Defender in same zone:

Roll: d100 + (WR Route Running ÷ 5)
vs. Target: 50 + (Defender Zone Coverage ÷ 5)

Results:
  RE-POINTED July 2026 (ADR-045) onto §9.3's corrected mapping. §9.4 states
  its bands in §8.4's WORDS, which is a coupling no type can see — the
  numbers below are §9.3's ruled column for the band each phrase names.

  WR wins by 20+:   Found soft spot, wide open -> 70  (§8.4: 70+)
  WR wins by 10-19: Window exists, open        -> 52  (§8.4: 50-69)
  WR wins by 1-9:   Tight window               -> 38  (§8.4: 30-49)
  WR loses:         Defender in passing lane   -> 20  HELD (no §8.4 word;
                                                      already inside covered)

ZONE DEFENDER READING QB:

Zone defenders can jump routes:

Roll: d100 + (Defender Zone Coverage ÷ 5) + (Defender Awareness ÷ 5)
vs. Target: 60 + (QB Disguise)

Success: Defender can break on ball at release
  Creates +20 to contest/interception
```

### 9.5 Option Routes

```
OPTION ROUTE:

WR reads coverage and adjusts:

Roll: d100 + (WR Awareness ÷ 5) + (WR Route Running ÷ 5)
vs. Target: 50

Success: WR finds soft spot in coverage
  +15 to openness
  
Failure: WR chooses wrong option
  -10 to openness
  
QB ANTICIPATION REQUIRED:
If QB and WR both succeed: Timing preserved
If only one succeeds: Timing off, -10 to accuracy
If both fail: Miscommunication, likely incompletion
```

---

## 10. THROW EXECUTION

### 10.1 Arm Strength Requirements

```
THROW REQUIREMENTS:

Certain throws require minimum arm strength:

| Throw Type | Min Arm | Failure Effect |
|------------|---------|----------------|
| Deep out (20+ yds) | 85 | Ball floats, easy INT |
| Deep post/corner (25+ yds) | 80 | Underthrow, DB closes |
| Comeback (18 yds) | 75 | Late arrival |
| Seam (between safeties) | 80 | Ball hangs |
| Across body to far side | 85 | Ball dies |
| Into 15+ mph wind | +10 to normal | Must have extra juice |

If QB attempts below threshold:
  - Automatic -20 accuracy
  - Ball velocity reduced (defenders close)
  - Underthrow risk (defender gets play on ball)
```

### 10.2 Throw Type Selection

```
THROW TYPE:

System or QB AI selects throw type:

BULLET PASS:
  - Full arm strength for velocity
  - Faster arrival
  - Harder for passing lane defenders
  - Harder to catch (receiver must be ready)
  - Modifier: +10 to passing lane, -5 to catch
  
TOUCH PASS:
  - Half velocity
  - Arc over defenders
  - Easier catch
  - More time for coverage to close
  - Modifier: -10 to passing lane, +10 to catch
  
BACK SHOULDER:
  - Specific placement away from defender
  - Requires chemistry (else -10)
  - Defender cannot contest
  - -10 to accuracy
  
THROW AWAY:
  - Intentionally uncatchable
  - Must be outside box or past LOS
  - Avoids sack/turnover
```

### 10.3 Passing Lane Check

```
PASSING LANE:

Before ball reaches target, check each zone it passes through:

For each defender in passing lane zones:

Roll: d100 + (Defender Reaction ÷ 5) + (Defender Ball Skills ÷ 5)
vs. Target: 60 + (Ball Velocity Modifier) + (Throw Angle Modifier)

Ball Velocity:
  AMENDED July 2026 (ADR-039 SA-13 / ADR-040) — was "Bullet: +15".
  Resolved toward §10.2, which specifies +10. See the note below.
  Bullet: +10 (harder to react)
  Normal: +0
  Touch: -10 (more time)
  
Throw Angle:
  KEYED ON GEOMETRY, NOT ON THROW TYPE (ADR-040). All three values
  remain reachable; the mapping is by contest position.
  Over defender: +20
  Past defender: +0
  Through defender zone: -10

Success for Defender:
  Gets hand on ball → TIPPED BALL SYSTEM triggered
  
D-LINE TIP SPECIAL CASE (see the amendment note after this block):
  D-lineman in "hands up" technique can attempt:
  Roll: d100 + Height + Awareness + Reaction
  vs. Target: 75 + QB Release Height + (Velocity ÷ 5)
```

> **AMENDMENT (July 2026, owner ruling on ADR-039 SA-13; implemented in ADR-040) — two independent
> inputs, and one of them was doing both jobs.**
>
> **Part 1 — the value.** This section said the bullet's modifier was **+15**; §10.2 says **+10**.
> **§10.2 wins** — the mechanic description is the source and this is the derived text. Now `+10`.
>
> **Part 2 — the worse half.** The engine's angle table was keyed on **throw type**, which made a
> **touch** pass *harder* to deflect than a bullet. §10.2 contradicts that **in words**, and the
> football is unambiguous: **a touch pass hangs — it gives the defender time. That is the entire
> trade against a bullet's accuracy risk.**
>
> The defect was structural rather than numeric: **Ball Velocity and Throw Angle are meant to be two
> INDEPENDENT inputs, and the throw type was feeding both**, so the ordering of the two throw types
> depended on the angle mapping rather than on velocity. The angle table is now keyed on **contest
> geometry** (`IN_FRONT → through zone`, `EVEN → past defender`, `TRAILING → over defender`), which
> restores the independence: **`bullet − touch = +20` at every geometry**, so the ordering **can no
> longer depend on the mapping at all**, and all three angle values above stay reachable.
>
> *Lesson worth keeping: when one quantity feeds two terms that the design treats as independent,
> the bug is not in either term's value.*

### 10.4 Accuracy Resolution

```
ACCURACY ROLL:

Roll: d100 + (QB Accuracy ÷ 5) + Modifiers

Modifiers:
  Clean pocket: +0
  Pressure: -10
  Collapsing pocket: -20
  Immediate pressure: -30
  
  On platform: +0
  Off platform (moving): -15
  Throwing across body: -10
  
  Short throw (<10 yards): +10
  Intermediate (10-25): +0
  Deep (25+): -10
  
  Chemistry with receiver: +5
  Against wind: -5 to -15

vs. Target: 60

Results:
  Beat by 40+: PERFECT - Ideal placement, in stride
  Beat by 25-39: EXCELLENT - Great ball, minimal adjustment
  Beat by 10-24: GOOD - Catchable, slight adjustment
  Beat by 0-9: ADEQUATE - Catchable, adjustment needed
  Miss by 1-14: POOR - Difficult catch, major adjustment
  Miss by 15-29: BAD - Barely catchable, off target
  Miss by 30+: MISS - Not catchable
```

### 10.5 Accuracy Impact on Catch

```
ACCURACY → CATCH MODIFIERS:

| Accuracy Result | Catch Mod | YAC Mod | Contest Mod |
|-----------------|-----------|---------|-------------|
| PERFECT | +20 | Full | Defender -15 |
| EXCELLENT | +15 | Full | Defender -10 |
| GOOD | +10 | Slight reduction | Defender -5 |
| ADEQUATE | +0 | Moderate reduction | Defender +0 |
| POOR | -15 | Minimal YAC | Defender +10 |
| BAD | -25 | No YAC | Defender +15 |
| MISS | No catch possible | N/A | N/A |
```

---

## 11. CATCH RESOLUTION

### 11.1 Catch Type Determination

```
CATCH TYPE:

Based on coverage and accuracy:

ROUTINE CATCH:
  - Receiver open, accurate throw
  - Standard catch roll
  
CONTESTED CATCH:
  - Defender within 1 yard
  - Both receiver and defender roll
  
DIFFICULT CATCH:
  - Diving, fully extended, or off-balance
  - -20 to catch roll
  - Spectacular Catch attribute applies
  
BACK SHOULDER CATCH:
  - Receiver turning back
  - -10 to catch roll
  - Defender cannot contest
```

### 11.2 Catch Roll

```
CATCH ROLL:

Roll: d100 + (WR Catching ÷ 5) + (WR Catch in Traffic ÷ 5 if contested)
     + Accuracy Modifier

vs. Target: 50 + Difficulty Modifier

Difficulty Modifiers:
  Routine: +0
  Adjustment needed: +10
  Diving: +20
  One-handed: +25
  Behind/high: +15
  
Results:
  Beat by 20+: Secured immediately, full YAC potential
  Beat by 10-19: Caught, slight bobble, YAC available
  Beat by 0-9: Caught after bobble, limited YAC
  Miss by 1-9: Dropped, tip possible
  Miss by 10-19: Dropped cleanly
  Miss by 20+: Nowhere near catching it
```

### 11.3 Contested Catch (50/50 Ball)

```
CONTESTED CATCH:

Both receiver and defender roll:

Receiver: d100 + (Catching ÷ 5) + (CIT ÷ 5) + (Jumping ÷ 5)
Defender: d100 + (Ball Skills ÷ 5) + (Jumping ÷ 5) + Contest Mod

Contest Mod = Based on position:
  Trailing: -10
  Even: +0
  In front: +15
  
Apply accuracy modifiers to both rolls

Outcomes:
  Receiver wins by 20+: Clean catch
  Receiver wins by 10-19: Catch, but defender may tip
  Receiver wins by 1-9: Catch, high tip risk
  Tie: TIP BALL triggered
  Defender wins by 1-9: PBU, tip ball
  Defender wins by 10-19: Clean PBU
  Defender wins by 20+: INTERCEPTION potential
```

---

## 12. TIPPED BALL SYSTEM

### 12.1 Trigger Conditions

```
TIPPED BALL TRIGGERS:

| Event | Triggers System? |
|-------|------------------|
| Receiver drops catchable ball | YES |
| Defender causes drop via hit | YES |
| Defender deflects at catch point | YES |
| Defender swats in passing lane | YES |
| D-lineman tips at release | YES |
| QB overthrow (uncatchable) | NO |
| QB throw into dirt | NO |
| Intentional throwaway | NO |
```

### 12.2 Roll 1: Deflection Quality

```
DEFLECTION QUALITY ROLL:

Determines target number for recovery attempts.

BASE TARGET NUMBER (by throw height):

| Throw Height | Base TN | Description |
|--------------|---------|-------------|
| Ground level (screen) | 100 | Almost impossible |
| Low (knees or below) | 90 | Ball goes down fast |
| Medium-low (waist) | 80 | Limited float |
| Medium (chest) | 70 | Moderate chance |
| Medium-high (shoulders) | 60 | Good chance |
| High (head level) | 50 | Ball likely floats |
| High-point (above head) | 40 | Ball probably hangs |
| Jump ball | 30 | Maximum hang time |

MODIFIERS TO BASE TN:

Ball Velocity:
  Bullet pass: +15 (ricochets hard)
  Normal: +0
  Touch pass: -15 (more float)
  
Weather (See Section 16):
  Dome/Clear: +0
  Light rain: +5
  Heavy rain: +15
  Snow: +10
  Extreme cold: +10
  Wind 15+ mph: +5

ROLL RESOLUTION:

Roll: d100

vs. Modified Target Number

Results set FINAL TARGET NUMBER for recovery:
  Roll > TN + 40: GIFT (Final TN = 20)
  Roll > TN + 20: FLOATER (Final TN = 35)
  Roll > TN: LIVE BALL (Final TN = 55)
  Roll > TN - 20: CONTESTED (Final TN = 75)
  Roll > TN - 40: DIFFICULT (Final TN = 90)
  Roll ≤ TN - 40: DEAD BALL (no recovery possible)
```

### 12.3 Eligible Players

```
RECOVERY ELIGIBILITY:

Based on deflection result:

| Result | Same Zone | Adjacent | 2 Zones |
|--------|-----------|----------|---------|
| DEAD | None | None | None |
| DIFFICULT | Yes | No | No |
| CONTESTED | Yes | Speed check | No |
| LIVE BALL | Yes | Yes | No |
| FLOATER | Yes | Yes | Speed check |
| GIFT | Yes | Yes | Speed check |

Excluded players:
  AMENDED July 2026 (ADR-039 SA-17) — §12.4 wins: PRICED PARTICIPATION,
  not exclusion. This list now keeps only what is genuinely impossible.
  See the note below.

  - Engaged in blocks   -> NOT excluded; §12.4 prices it at -20
  - On ground           -> NOT excluded; §12.4 prices it at -25
  - Facing wrong direction (penalty, not excluded)
```

> **AMENDMENT (July 2026, owner ruling on ADR-039 SA-17) — §12.4's modifiers are what was meant.**
>
> §12.3 **excluded** blocked and grounded players; §12.4 **priced** them at −20 and −25. A straight
> contradiction, and **§12.4 wins.**
>
> **Two things in §12.3's own text settle it.** Its first bullet said *"unless disengage check"* —
> already conceding that engagement is **a cost, not a hard bar**. And its third bullet says
> *"(penalty, not excluded)"* — **proving the list was drawing that distinction deliberately**, which
> makes blocks and ground appearing on the excluded side an **error of placement, not of intent.**
>
> **And §12.4's model is the more robust football:** a lineman engaged with a blocker can absolutely
> bat at a ball beside him, and balls do fall to players on the ground.
>
> ### ⛔ DO NOT IMPLEMENT THIS STANDALONE — it is folded into `CALIBRATION-BACKLOG.md` entry 50
>
> **With the scale as it is, a −25 is decorative.** Entry 6 established that §12.4's recovery roll
> **never fails** (0 of 1,474), and entry 50 established that the tipped-ball subsystem has **no
> attribute surface at all** — `deflection_quality`'s `ratingSpan` is exactly 0.000 on a bare d100.
>
> **Fixing eligibility into a mechanism where modifiers decide nothing produces precisely the state
> entry 50's prohibition warns about: it LOOKS instrumented.** A reader would see a priced,
> plausible modifier table and never learn that nothing it contains changes an outcome — which is
> harder to diagnose than the honest contradiction it replaced.
>
> **Eligibility and both rolls are specified together, as one design.** See entry 50.

### 12.4 Roll 2: Recovery Attempts

```
RECOVERY ATTEMPT:

For each eligible player (in Reaction order):

Roll: d100 + Total Modifiers

Must meet or exceed Final Target Number from Roll 1

MODIFIERS:

Proximity:
  Same zone: +25
  Adjacent zone: +10
  Two zones away: -10
  
Attributes (each adds Rating ÷ 5):
  Catching/Ball Skills: + Rating ÷ 5
  Reaction: + Rating ÷ 5
  Speed: + Rating ÷ 5
  Acceleration: + Rating ÷ 5
  Agility: + Rating ÷ 5
  Awareness: + Rating ÷ 5
  
Traits:
  Ball Hawk: +15
  High Point: +10
  Reliable Hands: +10
  
Situational:
  Already tracking ball: +10
  Back was turned: -15
  Engaged in block: -20
  On ground: -25
  Gift zone bonus: +20

ORDER OF RESOLUTION:
1. Sort by Reaction (highest first)
2. First success = recovery
3. Offense wins ties (possession advantage)
4. If offensive recovery: play continues
5. If defensive recovery: INTERCEPTION
6. All fail: incomplete pass
```

---

## 13. YAC (YARDS AFTER CATCH)

### 13.1 Post-Catch Resolution

```
YAC RESOLUTION:

After successful catch, resolve YAC zone by zone:

ZONE 1 (0-5 yards): Immediate defender
ZONE 2 (5-15 yards): Second level
ZONE 3 (15-30 yards): Deep help
ZONE 4 (30+ yards): Pursuit only
```

### 13.2 Immediate YAC (Zone 1)

```
IMMEDIATE DEFENDER:

If defender within 5 yards of catch:

Roll: d100 + (WR YAC ÷ 5) + (WR Elusiveness ÷ 5)

vs.

Roll: d100 + (Defender Tackling ÷ 5) + (Defender Pursuit ÷ 5)

Modifiers:
  Catch in stride (good accuracy): +15 to WR
  Catching off-balance: -15 to WR
  Bullet pass caught: -5 to WR (harder to transition)
  Touch pass caught: +5 to WR (easier to transition)
  
Results:
  WR wins by 20+: Defender missed, advance to Zone 2
  WR wins by 10-19: Partial tackle, gain 3-5 yards in zone
  WR wins by 1-9: Contact made, gain 1-2 yards
  Tie: Wrapped up, gain 0-1 yard
  Defender wins: Tackled at catch point
```

### 13.3 Downfield Blocking (Zone 2-3)

```
DOWNFIELD BLOCKING:

For each zone receiver enters:

1. Count blockers vs. defenders in zone
   
2. For each unblocked defender:
   Tackle attempt (see above)
   
3. For each blocked defender:
   Roll: Blocker Run Block vs. Defender Block Shed
   
   Blocker wins: Defender occupied
   Defender wins: Defender free to pursue

Blocking Types:
  STALK BLOCK (WR vs. CB):
    WR Run Block vs. CB Block Shed + Tackling
    
  CRACK BLOCK (WR vs. Safety/LB):
    +10 to block (defender not expecting)
    -15 if illegal (blindside, low)
    
  LEAD BLOCK (FB/OL pulling):
    Full Run Block attributes apply
```

### 13.4 Breakaway Potential

```
BREAKAWAY CHECK:

If receiver clears Zone 2 with separation:

Roll: d100 + (WR Speed ÷ 5) + (WR Acceleration ÷ 5)

vs.

Best pursuing defender: d100 + (Speed ÷ 5) + (Pursuit ÷ 5)

If WR wins by 15+: Touchdown potential
If WR wins by 1-14: Gains significant yards, may be caught
If defender wins: Pursuit angle successful, tackle incoming
```

---

## 14. RUN GAME RESOLUTION

### 14.1 Gap Assignment Check

```
GAP ASSIGNMENTS:

For designed run play:

1. Identify target gap (A, B, C, or D)
2. Identify all gaps and their assigned matchups
3. Resolve each gap battle
```

### 14.2 Run Play Phases

```
PHASE 1: LINE BATTLE (Ticks 0.0-1.0)

For each gap:
  OL vs. DL engagement (see Section 6.3)
  
Results create:
  - Holes (OL wins)
  - Stalemates (ties)
  - Penetration (DL wins)

PHASE 2: SECOND LEVEL (Ticks 1.0-1.5)

If first level won:
  - OL climbs to LB (see Section 6.4)
  - FB lead blocks (if applicable)
  
If first level lost:
  - TFL opportunity
  - RB must read and adjust

PHASE 3: RB DECISION (Tick 1.0-2.0)

Based on blocking scheme:
  Zone: RB must find best hole
  Gap: RB hits designed hole
  
RB Vision Check (Zone plays):
  Roll: d100 + (RB Vision ÷ 5) + (RB Patience ÷ 5)
  vs. Target: 50
  
  Success: RB finds best lane
  Failure: RB may miss cutback or hit wrong hole
```

### 14.3 RB at Line of Scrimmage

```
RB AT POINT OF ATTACK:

Depends on blocking result:

HOLE OPEN (OL won by 10+):
  RB gains 3-5 yards before contact
  Proceed to second level
  
HOLE EXISTS (OL won by 1-9):
  RB gains 1-2 yards before contact
  Contact at LOS
  
STALEMATE (Tie):
  Contact at LOS
  Roll: RB Power vs. Tackler Tackling
  
PENETRATION (DL won):
  DL in backfield
  RB must evade:
  Roll: RB Elusiveness vs. DL Tackling
  
  Success: RB avoids, reduced gain
  Failure: TFL
```

### 14.4 Second Level and Beyond

```
SECOND LEVEL RESOLUTION:

For each unblocked LB/DB:

Pursuit Angle Check:
  Roll: d100 + (Defender Pursuit ÷ 5) + (Defender Instincts ÷ 5)
  vs. Target: 50 + (RB Speed - Defender Speed)

If defender makes pursuit:
  Tackle Attempt:
  RB: d100 + (RB Elusiveness ÷ 5) + (RB Power ÷ 5)
  vs. Defender: d100 + (Tackling ÷ 5) + (Strength ÷ 5)
  
  RB wins by 15+: Broken tackle, continue
  RB wins by 1-14: Partial tackle, gain 2-4 yards
  Defender wins: Tackled
```

### 14.5 Perimeter Blocking

```
PERIMETER BLOCKING:

On outside runs, screens, sweeps:

WR vs. CB Stalk Block:
  Roll: WR Run Block vs. CB Block Shed
  
  WR wins: CB occupied, lane exists
  CB wins: CB free, can make tackle

TE/FB Lead Block:
  Roll: TE/FB Run Block + Strength vs. Defender Tackling + Strength
  
  Blocker wins by 10+: Defender pancaked
  Blocker wins by 1-9: Defender sealed
  Defender wins: Defender sheds, in pursuit
```

---

## 15. SPECIAL SITUATIONS

### 15.1 Red Zone

```
RED ZONE MODIFIERS:

Compressed field affects:

Routes:
  - Deep routes less effective (no room)
  - Back-shoulder and fade become premium
  - Crossing routes in traffic

Coverage:
  - Zone defenders in tighter spaces
  - +10 to zone coverage effectiveness
  - -10 to deep routes

Running:
  - Fewer gaps to target
  - Power schemes preferred
  - +10 to goal-line blocking
```

### 15.2 Two-Minute Drill

```
TWO-MINUTE MODIFIERS:

Time pressure affects:

Play Calling:
  - No-huddle penalties for confusion
  - Audible success rate reduced -10

QB Processing:
  - Time pressure modifier based on game state
  - Clutch trait becomes active

Defense:
  - Prevent coverage tendencies
  - Less aggressive blitzing
```

### 15.3 Short Yardage

```
SHORT YARDAGE:

3rd/4th and 1-2 yards:

Power Running:
  - Blocking success +10 (everyone knows what's coming)
  - Defensive penetration +10 (stacking the box)
  - Becomes pure strength battle
  
QB Sneak:
  Roll: OL Push (sum of Strength) vs. DL Resistance (sum of Strength)
  QB Power contributes partially
  
Play Action:
  - Higher reward (defense biting on run)
  - Higher risk (if coverage recognizes)
```

---

## 16. ENVIRONMENTAL FACTORS (Weather, Stamina, Crowd Noise)

### 16.1 Weather System

```
WEATHER CONDITIONS:

Each game has weather settings that apply throughout:

TEMPERATURE:
  Hot (85°+ F):
    - Stamina drains faster (+50%)
    - No direct gameplay effects
    
  Normal (40-84° F):
    - No modifiers
    
  Cold (20-39° F):
    - Catching: -5
    - Fumble chance: +5%
    - Tipped ball TN: +10
    
  Extreme Cold (<20° F):
    - Catching: -10
    - Fumble chance: +10%
    - Tipped ball TN: +10
    - Deep accuracy: -5

PRECIPITATION:

  Clear/Dome:
    - No modifiers
    
  Light Rain:
    - Footing (Agility-based actions): -5
    - Catching: -5
    - Fumble chance: +5%
    - Tipped ball TN: +5
    
  Heavy Rain:
    - Footing: -15
    - Catching: -15
    - Fumble chance: +10%
    - Deep passing accuracy: -10
    - Tipped ball TN: +15
    
  Snow:
    - Speed: -5 (all players)
    - Footing: -10
    - Catching: -10
    - Tipped ball TN: +10
    
WIND:

  Calm (0-10 mph):
    - No modifiers
    
  Moderate (11-20 mph):
    - Deep passing: -5 accuracy (into wind)
    - Kicking: -5 (into wind)
    - No effect with wind
    
  Strong (21-30 mph):
    - Deep passing: -15 accuracy (into wind), -5 (crosswind)
    - All passing: -5 (crosswind)
    - Tipped ball TN: +5
    - Kicking: -15 (into wind)
    
  Severe (31+ mph):
    - Deep passing: -25 accuracy (into wind), -10 (crosswind)
    - All passing: -10
    - Tipped ball TN: +10
    - Kicking: -25 (into wind)

FIELD CONDITION:

  Good:
    - No modifiers
    
  Worn (late season):
    - Agility actions: -5
    - Slightly increased injury risk
    
  Poor (muddy):
    - Speed: -10
    - Agility: -15
    - Fumble chance: +5%
```

### 16.2 Stamina System

```
STAMINA MECHANICS:

Each player has a Stamina attribute (0-100).

STAMINA DRAIN:

Per play, players lose stamina based on effort:

| Action | Stamina Cost |
|--------|--------------|
| Regular play | 2-3 |
| Long run (20+ yards) | 5-8 |
| Long catch/pursuit | 5-8 |
| Blocking (sustained) | 3-4 |
| Pass rush (intense) | 4-5 |
| Sprint coverage (deep) | 4-6 |

Modifiers:
  Hot weather: +50% drain
  Consecutive plays (no rest): +25% drain
  Altitude (Denver): +25% drain

STAMINA RECOVERY:

When player not on field:
  Recovery = (Player Stamina Attribute ÷ 10) per play
  
  Example: Player with 80 Stamina recovers 8 points per play they rest.

STAMINA THRESHOLDS:

| Stamina | Effect |
|---------|--------|
| 100-70% | No effect |
| 69-50% | -5 to Speed, Acceleration |
| 49-30% | -10 to Speed, Acceleration, Agility |
| 29-15% | -15 to all physical attributes |
| 14-0% | -20 to all attributes, injury risk +10% |

FATIGUE INDICATORS:

System tracks cumulative fatigue per quarter:
  Q1: Fresh (no accumulated penalty)
  Q2: Slight fatigue (high-snap players -2)
  Q3: Moderate (high-snap players -5)
  Q4: Heavy (high-snap players -8)
  OT: Severe (all players -10)

Substitution Strategy:
  - Rotating players preserves stamina
  - Depth becomes strategic asset
```

### 16.3 Crowd Noise / Miscommunication

```
CROWD NOISE SYSTEM:

Crowd noise affects communication, primarily the offense.

NOISE LEVEL:

| Game State | Home Noise | Away Noise |
|------------|------------|------------|
| Offense has ball (home) | Low | High |
| Offense has ball (away) | High | Low |
| Big play (either team) | Spike for 2-3 plays | - |
| Close game (4th Q) | +1 level | - |

Noise Levels:
  Silent (dome, bad team): Base
  Normal: Base
  Loud: +10 to communication checks
  Deafening: +20 to communication checks
  12th Man (SEA, KC, etc.): +25 to communication checks

COMMUNICATION CHECKS:

Affected actions when noise is Loud or higher:

1. SNAP COUNT JUMP:
   Each play, small chance of false start or offsides.
   
   Roll: d100 + (Player Awareness ÷ 5)
   vs. Target: 40 + Noise Modifier
   
   Failure: False Start (offense) or Offsides (defense that bit)

2. AUDIBLE COMMUNICATION:
   When QB calls audible:
   
   Roll: d100 + (Player Awareness ÷ 5)
   vs. Target: 50 + Noise Modifier (for each player)
   
   Failure: That player doesn't hear audible
   - OL: May block wrong gap
   - WR: May run wrong route
   - RB: May block wrong defender or run wrong path

3. PROTECTION CALLS:
   Center identifying "Mike" and line calls:
   
   Roll: d100 + (Center Awareness ÷ 5) + (OL Awareness average ÷ 5)
   vs. Target: 45 + Noise Modifier
   
   Failure: -15 to stunt/blitz pickup

4. DEFENSIVE ADJUSTMENTS:
   DC/MLB making adjustment calls:
   
   Roll: d100 + (MLB Awareness ÷ 5)
   vs. Target: 40 + Noise Modifier
   
   Failure: One random defender doesn't get call
   - May be in wrong coverage
   - May have wrong gap assignment

SILENT COUNT MITIGATION:

When offense goes to silent count:
  - Eliminates snap count jump risk
  - But defense can time the snap better
  - -5 to OL first-step advantage
  
Hard Count (HOME):
  Offense can use hard count to draw offsides
  Roll: QB acting ability (awareness + football IQ) vs. Defender discipline
```

---

## 17. DEBUG OUTPUT SYSTEM

### 17.1 Full Play Printout

For testing and tuning, the system should output every mechanic that fires on each play.

```
=======================================================================
PLAY DEBUG OUTPUT
=======================================================================

PLAY CALL:
  Offense: Shotgun Trips Right, "Y Cross" (Pass)
  Defense: Cover 3 Sky, "Tampa 2 look"

PRE-SNAP PHASE:
  ├─ QB Coverage Read:
  │    Roll: 74 + 17 (Awareness) + 15 (IQ) = 106
  │    vs. Target: 50 + 15 (disguise) = 65
  │    Result: SUCCESS by 41 → PERFECT READ
  │    QB knows: Cover 3 Sky
  │
  ├─ Blitz Recognition:
  │    No blitz called
  │
  └─ Audible Check:
       No audible called

LINE BATTLE (Ticks 0.0-2.5):
  ├─ LT vs. LOLB:
  │    Tick 1.0: LT 78 vs. LOLB 82 → Contained (+3 LT)
  │    Tick 1.5: LT 71 vs. LOLB 77 → Contained (+6 LOLB, -5 LT)
  │    Tick 2.0: LT 65 vs. LOLB 89 → RUSHER WINNING (-24 LT)
  │    Tick 2.5: Pressure arriving
  │
  ├─ LG vs. DT:
  │    Tick 1.0: LG 84 vs. DT 79 → Contained (+5 LG)
  │    Tick 1.5: LG 76 vs. DT 81 → Stalemate
  │    Tick 2.0: LG 82 vs. DT 74 → Contained
  │    Tick 2.5: Contained
  │
  [... continues for each matchup ...]
  │
  └─ POCKET STATUS:
       Tick 1.0: CLEAN
       Tick 1.5: CLEAN
       Tick 2.0: PRESSURE (LOLB winning)
       Tick 2.5: COLLAPSING

ROUTE DEVELOPMENT:
  ├─ WR1 (X): Go Route
  │    Release vs. Press:
  │      Roll: 89 + 18 (Release) + 16 (Agility) = 123
  │      vs. Roll: 45 + 14 (Press) + 12 (Strength) = 71
  │      Result: WR wins by 52 → CLEAN RELEASE
  │    Route timing: ON TIME (Tick 2.5)
  │    Man Coverage battle:
  │      Roll: 76 + 17 (Route) + 15 (Agility) = 108
  │      vs. Roll: 82 + 16 (Man) + 14 (Agility) = 112
  │      Result: CB wins by 4 → CB IN PHASE
  │    Actual Openness: 32 (tight window)
  │
  ├─ WR2 (Z): Dig Route
  │    Release: No press (off coverage)
  │    Route timing: ON TIME (Tick 1.5)
  │    Zone Coverage:
  │      In zone: Hook/Curl defender
  │      Roll: 68 + 15 (Route) = 83
  │      vs. Target: 50 + 14 (Zone Cov) = 64
  │      Result: SUCCESS by 19 → Found soft spot
  │    Actual Openness: 71 (open)
  │
  [... continues for each receiver ...]

QB DECISION-MAKING:
  ├─ Read 1 (Tick 1.5): WR2 (Dig)
  │    Actual Openness: 71
  │    Awareness variance: Roll 14 - 10 + 5 = +9
  │    Perceived Openness: 80
  │    Effective Openness: 80 (no tight window adj needed)
  │
  ├─ Read 2 (Tick 2.0): TE (Seam)
  │    Actual Openness: 45
  │    Awareness variance: Roll 7 - 10 + 5 = +2
  │    Perceived Openness: 47
  │    Window modifier: +12 (QB arm talent)
  │    Effective Openness: 59
  │
  ├─ Decision Point (Tick 2.0):
  │    Pocket Status: PRESSURE
  │    Options: WR2 (80 perceived), TE (59 perceived)
  │    Decision Quality Roll: 78 + 17 = 95 vs. 50
  │    Result: OPTIMAL (+45)
  │    Target Selected: WR2
  │
  └─ Unseen Defender Check:
       Safety (rotating): 
         Roll: 65 + 17 (Awareness) = 82
         vs. Target: 50 + 20 (late rotation) = 70
         Result: SUCCESS → QB sees safety, accounts for throw

THROW EXECUTION:
  ├─ Throw Type: BULLET (system selected for timing route)
  │
  ├─ Passing Lane Check:
  │    Zone 1 (intermediate): Hook defender
  │      Roll: 43 + 14 (Reaction) + 13 (Ball Skills) = 70
  │      vs. Target: 60 + 15 (bullet) = 75
  │      Result: MISS → Ball passes cleanly
  │
  └─ Accuracy Roll:
       Roll: 71 + 18 (Accuracy) = 89
       Modifiers: -10 (pressure)
       Final: 79 vs. Target 60
       Result: EXCELLENT (+19)
       Placement: Slight adjustment needed, defender -10 to contest

CATCH RESOLUTION:
  ├─ Catch Type: ROUTINE (open, good throw)
  │
  ├─ Catch Roll:
  │    Roll: 68 + 16 (Catching) + 15 (Accuracy bonus) = 99
  │    vs. Target: 50
  │    Result: SUCCESS by 49 → Secured in stride
  │
  └─ No tip/contest (defender not in position)

YAC RESOLUTION:
  ├─ Zone 1 (0-5 yards from catch):
  │    Nearest defender: FS (5 yards)
  │    No immediate contact → advance
  │
  ├─ Zone 2 (5-15 yards):
  │    Defender: SS pursuing
  │    WR Roll: 77 + 15 (YAC) + 14 (Elusiveness) = 106
  │    SS Roll: 82 + 13 (Tackling) + 12 (Pursuit) = 107
  │    Result: Contact, +1 defender
  │    Yards in zone: 3
  │
  └─ Total YAC: 5 yards

PLAY RESULT:
  ├─ Completion: YES
  ├─ Receiver: WR2
  ├─ Air yards: 12
  ├─ YAC: 5
  ├─ Total gain: 17 yards
  ├─ Turnover: NO
  └─ First down: YES (new set of downs)

ENVIRONMENTAL FACTORS APPLIED:
  ├─ Weather: Clear, 65°F, Calm wind
  │    No modifiers
  │
  ├─ Stamina:
  │    WR2: 87% → no effect
  │    SS: 72% → no effect (barely)
  │
  └─ Crowd Noise: LOUD (away game)
       Pre-snap check: All players heard snap count (no penalties)

=======================================================================
```

### 17.2 Summary Statistics

After each play, track cumulative stats for tuning:

```
CUMULATIVE GAME STATS (for tuning):

Pass Plays: 24
  Completions: 17 (70.8%)
  Interceptions: 1
  Sacks: 2
  Drops (receiver fault): 2
  Tipped balls: 3
    - Recovered by offense: 1
    - Recovered by defense: 1
    - Incomplete: 1
  Average time to throw: 2.3 ticks
  
Run Plays: 18
  Average gain: 4.2 yards
  TFL: 3
  Broken tackles: 4
  Fumbles: 0

Line Play:
  Pass rush wins: 8/96 matchup-ticks (8.3%)
  OL wins: 65/96 (67.7%)
  Stalemates: 23/96 (24.0%)

Coverage:
  Man coverage battles: 31
    WR wins: 18 (58%)
    CB wins: 13 (42%)
  Zone coverage attempts: 12
    Soft spots found: 8 (67%)

Weather impact:
  Cold catches affected: 0
  Wind-affected throws: 0

Stamina:
  Players below 70%: 4
  Players below 50%: 0

Crowd noise:
  Communication failures: 2
  False starts: 1
```

---

## APPENDIX A: ATTRIBUTE RANGES

Standard attribute scale: 0-99

| Range | Description | NFL Equivalent |
|-------|-------------|----------------|
| 90-99 | Elite | Top 5 at position |
| 80-89 | Excellent | Pro Bowl caliber |
| 70-79 | Good | Solid starter |
| 60-69 | Average | Backup/spot starter |
| 50-59 | Below average | Depth player |
| 40-49 | Poor | Practice squad |
| 0-39 | Replacement | Street free agent |

---

## APPENDIX B: TRAIT LIST

| Trait | Effect | Position |
|-------|--------|----------|
| Ball Hawk | +15 to INT attempts | DB |
| Clutch | +10 in crunch time | Any |
| High Motor | +5 to pursuit | DL, LB |
| Pass Swatter | +20 to tip attempts | DL |
| Press Specialist | +15 to press | CB |
| Reliable Hands | +10 to catch | WR, TE |
| Route Technician | +10 to route running | WR |
| Shutdown | +10 to man coverage | CB |
| Power Runner | +10 to break tackles | RB |
| Home Run Hitter | +15 to breakaway | RB, WR |
| Run Stuffer | +10 vs. run | DL, LB |
| Quick Twitch | +10 to first step | DL |
| Pocket Awareness | +10 to sensing pressure | QB |
| Improviser | +15 to scramble plays | QB |
| Brick Wall | +10 to anchor | OL |
| Road Grader | +10 to pancakes | OL |

---

## APPENDIX C: COMMON TARGET NUMBERS

> **⚠ DERIVED, NOT AUTHORITATIVE (owner ruling, July 2026, ADR-039 SA-02).**
>
> **This is a SUMMARY TABLE. The mechanic sections are the source; where this appendix and a
> mechanic section disagree, THE MECHANIC SECTION WINS and this table is the thing to fix.**
>
> Until this ruling, Appendix C **had never been audited against anything.** The scale audit found
> it silently contradicting its source in the `Communication` row — **§7.3 specifies `Target: 60 +
> complexity`; this table said `40-50`** — and that row is corrected below. (The audit's other
> three contradictions, SA-08/SA-13/SA-17, are *section against section* and are resolved in their
> own sections, not here.)
>
> **A summary that can contradict its source is a restated constant** (Charter §4.1's derivation
> corollary): a second source of truth, and — because it is the convenient one to read — the one
> people trust.
>
> Corrected below to match the mechanic sections. **Do not resolve a future conflict in this
> table's favour**; resolve it against the section, then correct this table.

| Check | Base Target | Common Modifiers |
|-------|-------------|------------------|
| Coverage read | 50 | +10-25 (disguise) |
| Blitz recognition | 50 | +0-25 (disguise) |
| Catch (routine) | 50 | +/- accuracy |
| Catch (contested) | Opposed | - |
| Tackle | Opposed | - |
| Break tackle | Opposed | - |
| Block shed | Opposed | - |
| Deflection recovery | Variable | Based on Roll 1 |
| Communication | **60** + complexity (§7.3) | +10-25 (noise) |

---

## DOCUMENT VERSION

Version: 1.0
Last Updated: January 2026
Based on conversation development through multiple sessions

---

END OF DOCUMENT
