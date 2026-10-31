# ADR-090 (DESIGN): where every man stands at the snap

- **Date:** 2026-10-25
- **Proposed by:** Orchestrator (thread "Design snap spots for every player")
- **Status:** **approved (design), all five questions ruled on 2026-10-30 and 2026-10-31 (§13). Step 0 built 2026-10-31 (§14): the tables and the beats as pure code in `packages/playbook`, called from no game; two placements refined and one petition (S5) added for step 1. Step 1 built 2026-10-31 (§15) on the owner's typed yes for S1, S2 and S5: every play's `PLAY_START` carries the snap picture and the game viewer draws it; no game moved.** Nothing in play changes with this ADR. **Revised 2026-10-30:** the Stem moved to its own design, [ADR-091](ADR-091-the-stem-called-by-the-mike.md), on the owner's objection and notes; questions 1 and 4 were re-asked. Later that evening the stem's timing gained [ADR-092](ADR-092-the-battle-over-the-snap-count.md) (the count read: the week's film study and the in-game adjustments), which goes in with ADR-091's steps 3 and 5 below. Five questions go to the owner (§11), in plain words in [ADR-090-questions-explained.md](ADR-090-questions-explained.md) and on cards in the thread Each contracts edit in §8 needs the owner's typed yes naming it, asked at the step that needs it. The owner never merges: each step comes with its numbers and needs the owner's word before the Orchestrator merges it.
- **Asked for by:** the owner, 2026-10-25 01:40Z: *"We identified that there's a huge chess game that's played before the ball is ever snapped and it effects the play that happens after the snap. ... That's what led us into disguises and where defenders were physically located at when the ball is snapped because they might have moved or they might be in motion when the ball is snapped."* The owner then chose "Design now" (01:42:55Z).
- **Builds on, and does not reopen:** ADR-066's August halt (snap position is the output of the pre-snap phase; geometry consumes it when there is one); ADR-067 (the shown/played pair); ADR-068 and ADR-072 (the reads at the line and the leash); ADR-069 and ADR-071 (coverage looks as named pieces; ruling 1, a look never changes what is played); ADR-073 (front looks Mug and Stem, the shown rush, the pressure read, the creeper); ADR-074 (motion; designed, not built); ADR-075 (the coordinator's disguise and the execution roll; designed, not built); ADR-076 (the weekly game plan; designed, not built); ADR-089 (the pocket fix; its step 3 waits for this design, question 19 answered Wait).

## Shorthand used here

| word | what it means |
|---|---|
| **snap spot** | where one man is standing, in yards, at the instant the ball is snapped, and whether he is moving then and how fast |
| **the snap picture** | all 22 snap spots for one play, plus where the ball is |
| **aligned spot** | where the played call would line him up if nobody disguised anything |
| **shown spot** | where a look (a coverage look or a front look) puts him for the offense to see |
| **played spot / landmark** | where his played job takes him after the snap (a zone's landmark, his man, his gap) |
| **the grid** | the engine's 5 lanes across by 5 depth bands (`match-engine.md` §3); every man sits in one cell for the whole play today |
| **a tell** | something in where a man stands that gives his job away |

## 1. The need, in one paragraph

The pre-snap game is built as reads and looks: the quarterback's coverage read, the line's pressure read, the leash, the slide check, coverage looks (Two-High, Single-High, Press, Split, Show 4), front looks (Mug, Stem), the creeper. What is not built is **where each man stands at the snap**. No player has a spot in yards: a man occupies one grid cell for the entire play (`engine/src/resolve/zone.ts:18-25`, CHECKED), a defender's spot is read from his played job (a man defender sits in his receiver's cell, a zone defender in his anchor cell, same lines), and the looks live only in the offense's head (`contracts/src/playcalls.ts:471`, `:573`, CHECKED). So a disguise costs nothing physically, an unblocked rusher's start is a table keyed on his position, and the August halt still stands: *"`gap`, `side`, and a rusher's depth class describe WHERE A DEFENDER LINES UP. THE MODEL NEEDS WHERE HE IS AT THE SNAP"* (`ADR-066:596-599`, CHECKED). This ADR designs the piece the halt asks for: the sequence of the pre-snap game, played out in order, whose output is the snap picture.

## 2. The design in brief

1. **Every man gets a snap spot in yards**: across (x, from the ball), deep (y, from the line of scrimmage), stance (down or up), and, if he is moving at the snap, his direction and speed. Rounded to half a yard (§3).
2. **The snap picture is built by playing the pre-snap game in order**, seven beats (§4): the offense lines up; the defense aligns to it; the defense shows its looks; motion (when ADR-074 is built); the reads and checks at the line (already built); the defense's last movement into the snap; the snap.
3. **A look is real** (question 1, recommended): a man shown in a Mug or a Two-High shell is standing there when the ball is snapped, and has to travel from there to his played job. **A Stem plays out in time**, called by the Mike against the snap count, and can end on time, early, caught moving or called off (ADR-091). **ADR-069's ruling 1 still holds**: the look never changes what he is assigned to do; it changes where he starts doing it. The one exception is a called-off stem, which plays from where it stands (ADR-091 §6, from the owner's notes).
4. **The output is published on the stream**, at the start of the play, so the viewer, calibration, the news desk and every later physical model read one picture (Iron Rule 3).
5. **It is built in steps, each switched off and proved inert, then switched on and measured** (§7). Step 2 is ADR-089 step 3's free runners: they read real snap spots and question 19's Wait is lifted by its own condition ("until the pre-snap phase gives real spots").

## 3. The snap spot

| field | meaning | unit |
|---|---|---|
| `x` | across the field, from the ball; negative is the offense's left (lane LW's side), positive its right | yards, to 0.5 |
| `y` | from the line of scrimmage; positive is downfield (the defense's side), negative is the offensive backfield | yards, to 0.5 |
| `stance` | `DOWN` (a hand on the ground) or `UP` | |
| `moving` | absent if set; else `{ dx, dy, yardsPerSecond }`, his direction and speed at the snap | yards per second, to 0.5 |

**Field frame (default D1, CHOSEN).** The field is 53.3 yards wide; the hashes are 6.2 yards apart, about 3.1 either side of the middle; the numbers start about 12 yards in from each sideline (REPORTED, NFL field dimensions, not ingested). **The ball is in the middle of the field on every snap** until question 3 is answered otherwise, so x runs from about -26.7 to +26.7.

**The grid stays as it is.** Every consumer that reads lanes and bands today keeps reading them. A snap spot maps to a cell by fixed boundaries (default D2, CHOSEN): lane C for |x| under 3.5 (between the hashes, roughly), LH/RH from 3.5 to 13, LW/RW beyond 13; bands as `match-engine.md` §3.2 (BACKFIELD -5 to 0, SHORT 0 to 10, INTERMEDIATE 10 to 20, DEEP 20 to 35, VERY DEEP beyond). Step 1's proof (§7) is that every man's mapped cell equals the cell the engine uses for him today, or the difference is listed and explained before anything reads the picture.

**Why yards and not the grid.** A Mug backer at 1.5 yards and a base backer at 4.5 are in the same SHORT band, and the difference is the whole point (ADR-089 §4.4.5: lining up 5 yards off instead of 1.5 costs about 0.45 s, COMPUTED by its free-runner reader).

## 4. The pre-snap game, in seven beats

Each beat starts from the picture the beat before left. Beats 1 to 3 and 7 are pure tables (no die). Beat 4 is ADR-074. Beat 5 is what is built today. Beat 6 rolls dice only for a stem (ADR-091); otherwise it reads ratings and rolls nothing.

### 4.1 Beat 1: the offense lines up (formation A)

From the formation's `Alignment` (spot `LINE` / `OFF_LINE` / `BACKFIELD`, lane, `outsideRank`; `playbook/src/alignment.ts:59-83`, CHECKED) and its `QuarterbackSpot` (`UNDER_CENTER` / `SHOTGUN` / `PISTOL`, `:86`, CHECKED, "affects nothing mechanical yet"). Default table D3 (CHOSEN, every value checked at step 0, §7):

| man | x | y |
|---|---|---|
| center | 0 | -0.5 |
| guards, tackles | +-1.5, +-3.0 (about 1.5 yards per man, the split ADR-089 §4.4.3 used, INFERRED) | -0.5 |
| quarterback | 0 | under center -1.0; pistol -4.0; shotgun -5.0 |
| a receiver in a W lane | outermost +-18 (outside the numbers); each next man in 3 yards further in | -0.5 on the line, -1.5 off it |
| a receiver in an H lane | outermost +-11; each next man in 2.5 yards further in; the innermost man on the line next to a tackle is an inline end at +-4.5 | as above |
| a back | under center: tailback 0, -7.0; fullback 0, -4.5. Shotgun: beside the quarterback, +-1.5, -5.0. Pistol: 0, -7.0 | |

The first five rows read only what the formation already says; the yard values are placeholders until formations author their own splits (a bunch, a stack, a tight split), which is a later, separate change (§10).

### 4.2 Beat 2: the defense aligns to the formation (aligned spots)

From each defender's **played** duty on the call, against formation A's spots. Default table D4 (CHOSEN; the ranges are the owner's August research, `ADR-066:607-610`, "REPORTED, OWNER, EXTERNAL": DL technique 0 to 9, linebacker depth 4 to 7, press 1 to 2 yards, off 5 to 8):

| defender's played duty | depth (y) | across (x) |
|---|---|---|
| down lineman, by `gap` and `side` | 1.0 | A 0.75, B 2.25, C 3.75, D 5.25 on his side; EDGE 0.75 wider (ADR-089 §4.4.3's widths, INFERRED) |
| linebacker, not rushing | 4.5 | over his run-fit gap; in man on a back or tight end, over that man, a yard inside |
| linebacker rushing, `STANDARD` or `ZERO` disguise ("LB walked up", `playcalls.ts:442`) | 2.5 | his gap |
| linebacker rushing, `ZONE_BLITZ` or `DELAYED` (disguised) | 4.5 | his gap |
| corner in man, `PRESS` | 1.0 | his receiver, shaded by leverage (below) |
| corner in man, `OFF` | 7.0 | his receiver, shaded by leverage |
| corner in a deep-third or quarter zone | 7.0 | the outside receiver on his side, a yard outside |
| corner in a flat zone (Cover 2's squat corner) | 5.0 | the outside receiver, a yard outside |
| slot (nickel or dime) corner | 5.0 off, 1.0 pressed | over the slot receiver; blitzing, 5.0 at 7.0 (ADR-089 §4.4.3) |
| safety, deep half | 12.0 | +-9 (between the hash and the numbers on his half; the gloss corrected at step 0, §14) |
| safety, deep middle | 13.0 | 0 |
| safety, hook, curl or robber | 8.0 | over the inside receiver on his zone's side; a hole or robber player in the middle (refined at step 0, §14; was "over the strong side's inside receiver") |
| safety in man on a tight end or back | 7.0 | over his man |

**Leverage** (default D5, CHOSEN, from the owner's August point that leverage "flips based on where the help is", `ADR-066:609`): a man defender shades a yard **away from his help**: outside if a safety is in the deep middle (Cover 1), inside if nobody is deep (Cover 0). A zone defender takes the shade of his zone.

### 4.3 Beat 3: the defense shows its looks (shown spots)

**A look moves the men it moves to their shown spots**, using beat 2's own table on the **shown** duty: a coverage look reads `shownAssignments` (ADR-067), a front look reads `shownRush` (ADR-073). So:

- **Two-High (Show 2)** over Cover 3: both safeties at 12.0, +-9, though one plays the deep middle and the other the curl-flat.
- **Single-High (Show 1)** over Cover 2: the free safety at 13.0 in the middle, the strong safety at 8.0 on his side.
- **Press** over a deep-zone corner: the corner at 1.0 on his receiver. **Split** as its two halves.
- **Mug**: the walked-up backers at 1.5 in the A gaps (ADR-073 §2.5; ADR-089 §4.4.5 used 1.5 for its Mug information arm).
- **Stem**: the line one position over (ADR-073 §2.5). This is the stem's **lineup front**; where the line is at the snap is ADR-091's (beat 6).

**Whether a look really stands there at the snap is question 1** (§11), now asked for the Mug and the coverage looks only; the Stem is real by construction under ADR-091, because it plays out in time. Beats 3 and 6 are written for the recommended answer, *Real*. Under *Head only*, beat 3 is skipped for the Mug and the coverage looks (they stay perception-only, as today) and those men are at their aligned spots.

### 4.4 Beat 4: motion (ADR-074; designed, not built)

When ADR-074 is built, it becomes this beat and needs no new design here: the offense moves from formation A to formation B, and the defense re-runs beats 2 and 3 for the men its motion tag moves (Track: the man defender goes with him; Spin: the safety on that side comes down and the corner spins deep; Bump: the swap). A jet man is moving at the snap: in the backfield, about 4 yards deep, crossing toward his side at about 7 yards a second (default D6, CHOSEN; ADR-074 §3.4 puts him in the center lane in the backfield, moving toward a side). Until ADR-074 is built, formation B is formation A.

### 4.5 Beat 5: the reads at the line (built today; no change)

The coverage read, the pressure read, the slide check, the leash and the keep-in knob (ADR-068, ADR-072, ADR-073) run here, as they do now, against the shown lists. **They move nobody** in v1. A quarterback's check that changes the formation is not modeled (§10).

### 4.6 Beat 6: the defense's last movement into the snap

| what | where he is at the snap | source |
|---|---|---|
| **Stem** (and Stem Back, Double Stem) | **by how the stem ended (ADR-091 §6):** on time or early, set in the front it shifted to; caught, halfway between his two gaps, moving toward the new one and standing up; called off, set in the lineup front, which he then plays | revised 2026-10-30 on the owner's objection ("sounds like cheating to me") and his notes: the stem is called by the Mike and timed against the snap count (ADR-091) |
| **Mug** | still walked up at his shown spot; a dropper bails after the snap, a rusher comes from 1.5 yards | ADR-073 §2.5 ("six shown, four come") |
| **coverage look, `EARLY` timing** | at his **played** spot: "the safeties move before the snap and the quarterback can see the end of it" | `playbook/src/masks.ts:84-88`, CHECKED |
| **coverage look, `LATE` timing** (and every corner look) | at his **shown** spot, set; he rotates on the snap | same lines ("the look is held until the ball is snapped") |
| **the creeper** | moving forward at 3 yards a second from his aligned spot | ADR-089 §4.4.3's creeping row, `FR` §2.3 (CHOSEN) |
| **a tell** (question 2) | a poor disguiser stands a little toward his real job | §5 |

**What this does, in football:** a late Two-High over Cover 3 leaves the rolling safety 12 yards deep and 9 across at the snap, with his curl-flat landmark about 8 deep and 12 across, so he is late to the flat by the time it takes to cover that ground; an early rotation is honest about the coverage (easier to read, ADR-069 §9.5's +10 against +20) and costs no ground. That is the owner's August finding in physical form: *"the payoff of disguise is turnovers, not completions"* (`ADR-066:614`), with a cost the owner asked for in ADR-075 Q6.

### 4.7 Beat 7: the snap

The picture is frozen and published (§6). Nothing after the snap may change a snap spot.

## 5. Tells: does where he stands give him away? (question 2)

The owner's August research: *"LB depth runs 4–7 yards AND IS ITSELF THE PRIMARY TELL"* (`ADR-066:607-608`). ADR-075 gives every defender a `disguise` rating, 50 for everyone until the attributes pipeline can derive it, and rules that a poor blitz disguiser ruins only his own assignment (ADR-075 Q5).

**Proposal (recommended "By rating").** A man whose look or job differs from where his job takes him **cheats toward his job** by `(50 - disguise) / 25` yards, from 0 to 2, never past his played spot (default D7, CHOSEN). At 50, nobody cheats, so nothing moves until ratings are derived. A cheat gets him there sooner and is a tell: the quarterback's coverage read (for coverage movers) and the line's pressure read (for rushers) each see it as a bonus of `+cheat yards x 5` on their roll (default D8, CHOSEN). So bad disguisers are a step closer and easier to read; good ones stand exactly at the look and are harder to read but further away. **Built only with ADR-075's rating** (step 8, §7); nothing before it reads it.

**The alternative ("No tells"):** everyone stands exactly at his look; disguise skill touches only ADR-075's read term and execution roll, as already ruled.

## 6. What is published

**`PLAY_START` gains `snap`: the snap picture** (petitions S1 and S2, §8). One entry per player on the field: his id, x, y, stance and, if moving, direction and speed; plus the ball's spot across the field (always 0 until question 3 says otherwise). Debug text, the calibration reports, the game viewer and the news desk read this, never a recomputation (Iron Rule 3). The beat-by-beat steps are not published in v1: the picture is the fact; the beats are how it was made, and every input to them is already on `PLAY_START` (the shown and played lists, the tags, the disguises).

## 7. The stepped build

Each step is its own commit and pull request, comes to the owner with its numbers, and needs the owner's word before the Orchestrator merges it. Engine and franchise logic carries tests (Iron Rule 8). Every step keeps ADR-089's measurement clean: steps 0 and 1 change no outcome number, so they can merge while ADR-089 is being measured.

| step | what | changes play? | proof |
|---|---|---|---|
| **0** | the tables (D3, D4, D5), the field frame (D1, D2), the beat functions as pure code, and their tests; **nothing calls them from a game** | no | unit tests: every corpus formation and card gets a spot for every man; no two men on one spot unless the card says so (a Mug backer over a tackle); mirror symmetry; same input, same picture. The spot table is checked against real alignment figures (§9) and reported. |
| **1** | the engine builds the snap picture at the snap and publishes it on `PLAY_START` (S1, S2); the game viewer draws it (question 5) | no | inert: replayed seeds give byte-identical outcomes, every number the same, only `PLAY_START` grows; each man's mapped cell is compared with the cell the engine uses for him today and every difference is listed |
| **2** | ADR-089 step 3: free runners read their snap spot instead of question 19's Wait table | yes, ADR-089's | ADR-089 §6.3's own checks, with "M8's table for his snap row" replaced by "his published snap spot" |
| **3** | ADR-091 step S-a: the stem plays out at the line and is recorded (the cadence, the Mike's call, the shift, the re-call's roll, the snap spots of every ending, and ADR-092's count read with every coordinator at 50); nothing reads it after the snap | no | inert, as step 1 |
| **4** | looks cost ground: after the snap, a moved coverage man starts from his snap spot, and how far he is from his landmark sets when he gets there (ADR-075 §4.4's "late" becomes travel instead of a fixed beat, if the owner wants it, §11 note) | yes | arms per §7.1 |
| **5** | ADR-091 step S-b: the stem's effects (the re-call, the on-time edge, the caught cost, the called-off gaps); then ADR-092's step S-b2, real coordinators' film study and in-game fixes | yes | ADR-091 §10, ADR-092 §10 |
| **6** | ADR-091 step S-c: defensive offside, the game's first penalty (ADR-091 question S2) | yes | ADR-091 §9 band |
| **7** | ADR-091 step S-d: Stem Back and Double Stem | yes | ADR-091 §10 |
| **8** | tells (question 2), with ADR-075's rating | yes, once ratings vary | arms per §7.1 |
| **9** | motion (ADR-074) as beat 4, then the auto-stem (ADR-091 §7.3) | yes | ADR-074 §6 |
| **10** | later consumers, each its own design: blocked rushers' travel (ADR-061's table), coverage depth in the interceptions design (the next design after the pocket fix), run fits | yes | in their own designs |

Steps 0, 1 and 3 change no outcome, so they can merge while ADR-089 is being measured; every step from 4 on waits until ADR-089 has finished measuring.

### 7.1 Conjoined mechanisms

Question 1 (looks are real) and question 2 (tells) are **separately priceable**: they are measured alone and jointly at steps 4 and 8 (each alone, then together). The stem's pieces are priced in ADR-091 §10. Step 2 reads only free runners, whose rows in the picture under question 1 differ only for a Mug's backers, so step 2 runs with the Mug arm on and off, as ADR-089 §6.3 already plans.

## 8. Contract petitions (shape only; each needs the owner's typed yes naming it, at its step)

| # | edit | step | why it is a contract |
|---|---|---|---|
| **S1** | new types `SnapSpot` and `SnapPicture` in `packages/contracts` (§3, §6) | 1 | the viewer, calibration and the news desk read them (Iron Rule 1) |
| **S2** | `PLAY_START`'s payload carries `snap: SnapPicture` | 1 | the event stream is the single source of truth (Iron Rule 3) |
| **S3** | doc text only: the front `LOOK` tag and `shownRush` say "never what is played" and "physics never reads it" (`playcalls.ts:471`, `:573`); they gain "the snap picture is built from it (ADR-090), so a look sets where the man starts; what he is assigned to do is unchanged" (made together with ADR-091's M6, which adds the called-off stem) | 3 | the comment is the contract's own statement of the rule |
| **S4** | doc text only: `RushThreat.distanceYards`' subject condition becomes "a snap spot (ADR-090)", which ADR-066's halt left `unruled` (`ADR-066:655-660`) | 2 | engine-internal field; listed so the halt's open item is closed |
| **S5** *(added at step 0, §14)* | what a simulation takes (`PlayCalls`, `RunPlayCalls`, `playcalls.ts:580`) carries the snap picture the caller built with the playbook; the engine copies it onto `PLAY_START` (S2) and never builds one itself | 1 | the beats read formations, roles and zone names, which the engine may not see (ADR-006, Iron Rule 1), so the picture has to cross into the engine on the call |

**Not petitioned:** the tables (D3 to D8) live in `packages/playbook` (football authoring data). **The beats live there too** (`packages/playbook/src/snapSpots.ts`), **amended at step 0** (§14): this section first put them in `packages/engine/src/sim/preSnap.ts`, but every beat that places a man reads something the engine may not see, so step 1 carries the picture across on the call (S5). The engine keeps the beats that roll dice: ADR-091's stem plays out over the picture at step 3. This ADR adds no die; the stem's dice are ADR-091's.

## 9. Real figures to check the table against

- **The owner's August ranges** (`ADR-066:607-610`, REPORTED, OWNER, EXTERNAL): DL 0 to 9 technique, LB 4 to 7 yards, press 1 to 2, off 5 to 8. D4 sits inside every one.
- **Player-tracking data at the snap.** The NFL's Big Data Bowl releases on-field tracking (every player's x and y, ten times a second) for several thousand plays per season, with the snap frame marked (REPORTED, general knowledge, not opened here). It would give real distributions of linebacker depth, corner depth by coverage, safety depth before and after rotation. **Its terms of use have not been checked**: step 0 checks them first and uses it only if they allow it; otherwise step 0 reports against the August ranges alone. nflverse's free play-by-play has no per-player spots (INFERRED from its published columns; not checked here).
- **What the stand-ins cannot check:** individual players' habits; that comes with ratings.

## 10. Implied scope (`unruled`; not in this design)

- **Formations authoring their own splits** (bunch, stack, tight, nasty splits). D3 is one table for all.
- **The hash** (question 3, ruled Middle for now on 2026-10-31): the ball is in the middle until the hash gets its own design, with both play-callers learning the wide and the short side.
- **The offensive line's own splits and a quarterback's drop as he moves** (ADR-089's "moving launch point", `playcalls.ts:196-200`).
- **A quarterback's check that changes the formation**, offensive shifts of several men, and a defensive check out of the call after motion (ADR-074 §3.5).
- **Players moving after the snap.** The post-snap game keeps the grid; only the consumers named in §7 read yards.
- **Weekly game plan baits** (ADR-076: crowding the A gaps to force a check) use the Mug's spots once ADR-076 is built.

## 11. Questions for the owner

| # | question | options | recommended |
|---|---|---|---|
| 1 | For the Mug and the coverage looks, is the man really standing there when the ball is snapped? *(Revised 2026-10-30: the Stem left this question for ADR-091, so the first card's three options were withdrawn.)* | **Real** (a Mug backer and a late rotation are there at the snap; an early rotation has finished, as "early" already means) / **Head only** (looks stay in the quarterback's head; everyone is at his aligned spot) | **Real** |
| 2 | Does where a man stands give his job away? | **By rating** (a poor disguiser cheats toward his job: sooner there, easier to read) / **No tells** | **By rating** |
| 3 | Where is the ball across the field? | **Middle for now** / **Hash now** (left hash, middle, right hash, from where the last play ended; the wide side and the short side matter to both play-callers) | **Middle for now** |
| 4 | The plan: steps 0 to 10 (§7), steps 0, 1 and 3 changing nothing, step 2 being the pocket fix's free runners, steps 3, 5, 6 and 7 the stem *(revised 2026-10-30 to take in ADR-091)* | **Yes** / **Change the order** | **Yes** |
| 5 | Should the game viewer draw all 22 men at the snap on every play? | **Yes, at step 1** / **Later** | **Yes, at step 1** |

**Confirmations, not questions** (each stands unless the owner says otherwise): the field frame and half-yard rounding (D1, D2); the starting tables (D3, D4, D5) as placeholders checked at step 0; an `EARLY` rotation is at its played spot at the snap and a `LATE` one at its shown spot, as the masks already define them (§4.6); the jet man's spot (D6); ADR-075 §4.4's "late" becoming travel at step 4 (the execution roll's bust stays a roll).

## 12. Provenance of factual claims

| claim | where from | tag |
|---|---|---|
| A man occupies one cell for the whole play; man defenders sit in their receiver's cell, zone defenders in their anchor | `engine/src/resolve/zone.ts:18-25` | CHECKED |
| Offensive alignment is spot, lane, outside rank; quarterback spot "affects nothing mechanical yet" | `playbook/src/alignment.ts:59-86` | CHECKED |
| Front looks and `shownRush`: "Never what is played", "Physics never reads it" | `contracts/src/playcalls.ts:471`, `:573` | CHECKED |
| `STANDARD` disguise is "LB walked up"; four disguise rows | `contracts/src/playcalls.ts:442-448` | CHECKED |
| `EARLY`: safeties move before the snap and the QB sees the end; `LATE`: held until the snap | `playbook/src/masks.ts:84-88` | CHECKED |
| The August halt's words and the owner's alignment ranges, leverage, 32.2% disguise, turnovers not completions | `ADR-066:590-659` | CHECKED (the research inside is REPORTED, OWNER, EXTERNAL) |
| Mug and Stem mechanics, "six shown, four come" | `ADR-073` §2.5 (`:562-586`) | CHECKED |
| Free-runner snap table, gap widths, 1.5 yd per lineman, creeper 3 yd/s, 0.45 s for 5 yards off vs 1.5 | ADR-089 §4.4.3, §4.4.5, from its free-runner reader `FR` | REPORTED |
| A look never changes what is played (ruling 1) | ADR-069 §9 | CHECKED |
| Motion tags Track, Spin, Bump; jet in the center lane in the backfield, moving to a side | ADR-074 §3.2, §3.4 | CHECKED |
| Disguise rating at 50 for everyone; weakest mover; a poor blitz disguiser ruins only his own job; execution roll | ADR-075 §4.2-§4.4, §10 | CHECKED |
| A disguise is free today: the engine plays every defender from his played assignment (`passPlay.ts:424`) | ADR-075 §4.4 | REPORTED (line not re-read here) |
| Field 53.3 yards wide, hashes about 6.2 yards apart, numbers about 12 yards from the sideline | NFL field dimensions | REPORTED, not ingested |
| Big Data Bowl tracking data exists with snap frames | general knowledge | REPORTED, not opened; terms unchecked |
| Every value in D1 to D8 | football judgment | CHOSEN, provenance NONE beyond the cited ranges |

## 13. Decision

| # | question | ruling | when |
|---|---|---|---|
| 1 | For the Mug and the coverage looks, is the man really standing there when the ball is snapped? | ✅ **Real**: a Mug backer and a late rotation are there at the snap, and an early rotation has finished (§4.6); disguise costs ground. The Stem is ADR-091's | owner, 2026-10-30 23:43Z (card tap) |
| 2 | Does where a man stands give his job away? | ✅ **By rating**: a man whose Disguise is below 50 stands up to 2 yards toward his real job, so he gets there sooner but is easier to read; Disguise is 50 for everyone today, so nothing moves until ratings vary; built at step 8 (tells), with the coordinator disguise design (ADR-075) | owner, 2026-10-31 00:03Z (card tap) |
| 3 | Where is the ball across the field? | ✅ **Middle for now**: every snap stays in the middle of the field; the hash gets its own design later, with both play-callers learning the wide and the short side (§10) | owner, 2026-10-31 00:04Z (card tap) |
| 4 | The plan, steps 0 to 10 (§7) | ✅ **Yes**: steps 0, 1 and 3 change nothing and may merge while ADR-089 is measured; the rest wait until it finishes; each step comes with its numbers and merges only on the owner's word | owner, 2026-10-30 23:43Z (card tap) |
| 5 | Should the game viewer draw all 22 men at the snap? | ✅ **Yes, at step 1**: the viewer draws the snap picture as soon as the game saves it | owner, 2026-10-31 00:04Z (card tap) |

## 14. Step 0 record (2026-10-31)

**What was built.** Nothing in play changes: no game calls any of it (a search of `packages` and `apps` finds no caller outside its tests and the report).

- `packages/playbook/src/snapSpots.ts`: the field frame and the grid mapping (D1, D2), the offense's table (D3, `lineUpOffense`), the defense's tables (D4, D5) and the seven beats as pure functions (`playPreSnap`, `snapPicture`). Beat 4 (motion) and beat 5 (the reads) move nobody, as §4.4 and §4.5 say.
- `packages/playbook/test/snapSpots.test.ts`: §7's proof over every call the book can draw, plus the tables' own values, 37 tests.
- `pnpm --filter @ff/calibration snap-spots` (`packages/calibration/src/snapSpots/`): the report, [`packages/calibration/reports/adr-090-step0.md`](../../packages/calibration/reports/adr-090-step0.md), with its own test.

**The proof (§7), MEASURED over 4,800 pictures**: 26 calls (the book's cards, v6's coverages, the composed pressures and creepers) worn 121 ways (bare and in every set of coverage looks each can wear, early and late), under no front look, the Mug or the Stem, against the 12 formations.

- Every picture has all 22 men, each once.
- Nobody stands within a yard of anybody except the two the calls ask for: the quarterback under center behind his center (2,000) and a Mug linebacker behind his tackle (2,568).
- A mirrored call against a mirrored formation draws the mirror picture (over 100,000 spots compared). Two kinds of men are left out, by name: a man-to-man defender on "the n-th back from the left" when the backs stand in different lanes (the mirror changes who that is), and the Mug over a front with a Will and a Sam (the Mug walks up the Will by name, and mirroring a card hands the Will the Sam's job; no game mirrors a card).
- The same call draws the same picture, and drawing it changes nothing in the call.

**Against the August ranges (§9).** D4 sits inside every one: down linemen at techniques 1, 3 and 6, a yard off the ball, hand down; linebackers not rushing 4.5 deep (one steps back to 5.5 rather than stand on a teammate); press at 1; off at 5 (slot corners) and 7 (safeties); a man defender outside his man every time a safety is in the deep middle, and never outside with nobody there. Today's book presses every outside corner it puts in man, so the 7-yard off corner is drawn only by a test card. **The Big Data Bowl's terms could not be read**: operations.nfl.com and www.kaggle.com are outside this environment's network, and the files also need a Kaggle account. So the report checks the table against the August ranges alone, as §9 allows.

**Amendments made at step 0.**

- **Where the beats live (§8).** In `packages/playbook` beside the tables, not in the engine. Every beat that places a man reads something the engine may not see: the formation's alignments (ADR-006), a defender's role and position group, his zone's name (a deep third and a curl-flat start in different places, and a contracts zone carries only its cell), and which look moved him. So step 1 adds a third petition, **S5**: the calls carry the picture to the engine. It is asked with S1 and S2 at step 1, each needing the owner's typed yes.
- **D4's deep-half gloss.** "Just outside the hash" did not fit 9 yards (the hash is 3.1 from the middle). The value stands; the words now say "between the hash and the numbers".
- **D4's underneath safety.** "Over the strong side's inside receiver" put Cover 3 Sky's strong safety over the trips while his flat was on the other side. He now stands over the inside receiver on his zone's side, and a safety who plays the hole or robs the middle stands in the middle.

**Rules the tables did not name.** Each is `CHOSEN — provenance NONE`, a placeholder like the tables, and the report's §6 lists them in plain words: a lineman who drops, a backer with no run fit, a backer in man, quarters safeties, prevent, a nub-side corner, a slot corner with no slot receiver, a bracket, nobody standing on anybody, a blitzing safety or corner, the inline end, the backs' sides, stance, the Stem ending on time until ADR-091 step S-a, and a creeper the Mug walked up.

**Findings for later steps** (nothing reads them now):

- **Show 2 over Base Run Blitz shows the strong safety on the far half from his man**, up to 21.6 yards from where his job lines him up (`CALIBRATION-BACKLOG.md` entry 177). Fix before step 4 makes ground cost time.
- **Split backs map to the middle lane**: D3 seats them 1.5 yards either side of the quarterback, and the formation names LH and RH. The first entry on step 1's list of cell differences.

## 15. Step 1 record (2026-10-31)

**Ruled.** The owner's typed yes, 2026-10-31 02:12Z: *"Yes, make contracts edits S1, S2 and S5"*.

**The contract edits, as made.**

- **S1.** `packages/contracts/src/snap.ts`: `SnapSpot` (x, y, stance, and `moving` when he moves at the snap), `PlayerSnapSpot` (a spot with its man), `SnapPicture` (the ball across the field, the offense's eleven, the defense's eleven), `Stance` (`DOWN | UP`) and `SnapMovement` (a unit direction and yards a second). The frame is §3's: yards from the ball, x across (negative to the offense's left), y downfield. The playbook's step-0 copies of these shapes are gone; it uses the contract's.
- **S2.** `PLAY_START`'s payload stays `unknown` in contracts, as it was: each engine payload names its own fields. So the one contracted field is named by `PlayStartSnap { snap?: SnapPicture }`, which the pass and run payloads extend. `snap` is the payload's **last** key, and it is absent when the play-caller drew no picture (a caller that lines nobody up, as every test caller written before step 1; the engine never builds one itself).
- **S5.** `PlayCalls` and `RunPlayCalls` carry `snap?: SnapPicture`; the pass and run simulations copy it onto `PLAY_START` untouched.

**Where the picture is drawn.** The engine's game loop asks for it through a seam inside the engine: `PlayCaller.lineUp?(request, rng)`, asked of the **defense's** caller once both calls are made (the defense lines up last, against the formation; beats 2 to 7 are its beats). The request carries both calls, the situation and both teams' snapshots; the rng is the snap's call stream forked `line-up`. Forks are named by label, so no other stream moves. The frozen caller pair (`calibration/src/caller/frozen.ts`) answers it by resolving the snap again with its own fork and calling the playbook's `snapPicture`: about 5 to 10% slower to simulate, with no memory between calls. A caller with no `lineUp` gets no picture, and its games are byte for byte what they were. The ADR-089 mirror flag mirrors the picture (`mirrorPicture`), and the play-scope capture carries it. Calibration names no new engine type (ADR-089's surface pin holds); the engine's barrel exports `LineUpRequest` for callers that want it.

**The proof (§7), MEASURED** (`pnpm --filter @ff/calibration snap-spots -- --step 1`, about 30 seconds; [`reports/adr-090-step1.md`](../../packages/calibration/reports/adr-090-step1.md)):

- **Inert.** ADR-089's strip list has its first entry, this step's (`PLAY_START.payload.snap`, risk K11), and **all 28 pinned folds** (seven callers, two leagues, canonical and byte) and the real season's pinned path are unchanged with it stripped. The report re-checks v7 on its 100 golden games: 288,693 and 304,621 events, both digests the same in both leagues. The older tests that pinned the start record's keys or an empty strip list (`pocketLegacyShape`, `pocketPrelude`) now expect the new last key and this one entry.
- **Whole.** 100 games, 14,587 plays (9,170 passes, 5,417 runs): every play carries a picture of eleven different men a side, each on his own team and his own side of the ball (nobody offside), with every man the call names in it. None broken.
- **Cells.** Pass plays only (a run puts nobody in a cell). The quarterback is in the engine's cell on every snap (9,170). Men in protection match on 99.6%: 215 tight ends or backs kept in to block line up more than 3.5 yards across, in a half lane, where the engine puts them in the middle. Every route runner differs (he starts at the line; the engine plays him at his break); rushers never share the engine's band (he starts across the line; the engine plays him in the backfield the whole snap); man defenders match 17.1% and zone defenders 20.6% (they start short of their landmark). Every pair is listed with its count; 1,064 man defenders whose man stayed in to block break to no cell and are not compared. Nothing reads the picture yet, so none of these moves a number: they are what step 2 onward changes, the rushers' row first.
- **Step 0's split-back finding** does not show up here: the engine places no man by his formation's lane, so a split back's middle-lane snap spot matches the backfield cell when he blocks and is compared with his break when he runs a route. It stays a finding for a later reader of lanes.

**The game viewer** (question 5). A play's details open with "At the snap": the field drawn from behind the offense, sideline to sideline, a line every five yards and the hashes; circles for the offense and diamonds for the defense in team colors; a hand on the ground as a dot on the line; a man moving at the snap as an arrow to where he is a second later; a man stacked behind another (the quarterback under center) drawn under him with his label past. A table lists every man's spot in yards. A narrow screen scrolls the field sideways and opens on the ball. A game saved before step 1 shows no picture.
