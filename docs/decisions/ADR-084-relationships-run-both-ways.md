# ADR-084: relationships run both ways, and move on everyday choices, big moments and storylines

- **Date:** 2026-10-23
- **Proposed by:** Orchestrator, for `narrative` (the design) and `franchise` (the ledger)
  (thread "News and storylines"; plan `/mnt/project-files/design/relationships-plan.md`)
- **Status:** design ruled by the owner (B1-B7, 2026-10-23). Contracts edits V1-V3 approved by the
  owner's typed yes (2026-10-23) and made; L1 (the ledger) and the carousel's own moves of L2
  (results, firings, hires, extensions) built (§13); the carousel and the views in the season's walk
  built (§14); the stay-or-go readers built as ruled 2026-10-31 (§15); leaks and coaching-change
  news on the news desk (§16). The meeting's moves come with the meeting (ADR-081), next.
- **Origin:** the owner's F3 ruling in thread "End-of-season staff meeting" (2026-10-22: *"3. A -
  this needs to go to our story-building agent to develop it further"*), which handed the
  relationship model the meeting needs (F3, F4, G6) to the story side.

> Phase note: Charter §6 places narrative last. As with ADR-082, the owner chose to start story
> work early, on the condition that nothing here touches engine, playbook, play-caller or
> calibration measurement code, or moves any sim number or seed. B7 (a) keeps relationships off the
> field entirely.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| ADR-080's fit table: how a player of each type takes to a coach of each type (coach rows, player columns, −0.4..+0.4) | `docs/decisions/ADR-080-coaching-staff-hiring-and-firing.md` §5, lines 144-150 | COMPUTED (read) |
| §4's one-way table is that table ×40 with the judged man in the coach role and the man who feels in the player role; its average over both directions is, cell for cell, the first draft's symmetric table | script over the §5 values, 2026-10-23 | COMPUTED |
| `PersonalityType` is the five types; `StaffState` carries `personalityType` and `lineage` | `packages/contracts/src/players.ts:100`, `:120-128` | COMPUTED (read) |
| `StaffRole` has no GM seat; the GM seat is the meeting design's G1 | `players.ts:115-118`; `/mnt/project-files/design/end-of-season-meeting-plan.md` | COMPUTED (read); G1 REPORTED (plan, not on `main`) |
| Nothing in contracts, franchise or narrative models how two people get on (the only "relationship" and "rapport" hits are ADR-008's passer-receiver rapport and play-card wording) | `grep -rni "relationship\|rapport" packages/contracts/src packages/franchise/src packages/narrative/src` | COMPUTED |
| `NarrativeEffect` is `MORALE_DELTA \| AVAILABILITY \| REPUTATION_DELTA \| PRESSURE_DELTA` | `packages/contracts/src/events.ts:611-615` | COMPUTED (read) |
| ADR-080: coordinators "may always leave for a head job"; no sideways moves under contract; head coaches judge their coordinators on unit rank, with a scapegoat term, a honeymoon and `politics`; every offer is accepted in v1 | ADR-080 §6, §7.1 and Implied scope | COMPUTED (read) |
| The meeting design: a clash is polite, an open argument or a rift by the mix (F4); you may side with one, let it play out, or end it; `politics` decides who wins and how often a clash becomes a rift (F1); each "how sure are you?" lowers his relationship with you; G6 puts relationship scores in the save | `end-of-season-meeting-plan.md` (ADR-081, PR #24, not on `main`) | REPORTED (plan) |
| Spec #7: a density budget caps interrupts (§3); arc selection is weighted by state, staff relationships included (§4); "coaching and staff" is a storyline category (§6); commitments are tracked (§11.7) | `docs/design/narrative.md` | read (spec) |
| Spec #5 §3's weekly task board: opponent prep, practice allocation, depth chart, roster churn, media obligations, contract conversations | `docs/design/franchise-calendar.md` | read (spec) |
| ADR-076 §4.4: a human's chance to set the plan is a pending decision that falls back to the DC's plan | ADR-076 | COMPUTED (read) |
| The calendar has 52 weeks a year (camp 3, preseason 3, regular season 18, playoffs 5, offseason 4+5+4+4+6) | `packages/franchise/src/calendar/`, `PHASE_WEEKS`; `DEFAULT_LEAGUE_RULES.weeksPerSeason` | COMPUTED (read) |
| 2% weekly drift halves a gap in 34.3 weeks and removes 65% of it in a year | `ln 0.5 / ln 0.98`; `1 − 0.98^52` | COMPUTED |
| The worked example's figures (§9) and the pace figure (§5.1) follow from the rules as written | script, 2026-10-23 | COMPUTED |
| Every move size, the 3-a-week cap on everyday moves, the band edges, the rift rule (−25, rest −30), the sit-down odds, the storyline rate (about one per two seasons) | judgement, to be tuned | CHOSEN — provenance NONE |
| The names `RelationshipView`, `RELATIONSHIP_CHANGED`, `RELATIONSHIP_DELTA` | named here | CHOSEN — provenance NONE |
| As built (§13): the carousel decides exactly as without views; §9's figures; drift halves a gap in 34-35 weeks | `packages/franchise/test/relationships.offseason.test.ts`, `relationships.ledger.test.ts` | COMPUTED |
| §13's 20-season measurement (words, rifts, reported moves a season) | scratch script over `franchise`'s public API, run 2026-10-23, quoted in the build's PR | COMPUTED |

## Conjoined mechanisms

The rulings join several mechanisms (views, rest points, drift, rifts, three kinds of moves). None
is read by the sim (B7 a), so none has a sim rate to price. They change only who stays and goes,
how hot a clash gets, and what leaks; each reader is built and checked on its own (§10). If the
story department later proposes an on-field effect (B7 is left open), that effect is priced on its
own arms, alone and with anything that lands with it.

## Implied scope (unruled, not built here)

- Players' views: of the coach and of each other (locker-room factions), feeding morale (Spec #14).
- The president's view of the coach, alongside ADR-080's `politics`.
- The user's own personality (ADR-083, Q1-Q6 ruled 2026-10-23, not built), which sets every staff
  member's rest point with the user. Until it is built that rest point is 0.
- Conversations (sit-downs, promises, press conferences) and the storyline runtime (Spec #7 §2-§3):
  not built. Their moves are designed here and arrive with them.
- On-field effects of a broken relationship (B7: not in this version; open for the story side).
- Candidates turning down an offer: ADR-080 accepts every offer in v1. The stay-or-go reader in §7 is
  the first reason to say no and is built with its own check.

## Inertness proof

Claim: **this ADR changes nothing the sim produces.** The design note changed no file in `packages/`
or `apps/`. As built (§13), the ledger lives in `franchise` and nothing reads it yet; the coaching
carousel carries the views along and decides exactly as without them (tested: same world, decisions
and moves, and the same events apart from the added `RELATIONSHIP_CHANGED`). It will be read by
staff turnover, the meeting and the news desk, and never by the engine, the playbook, any
play-caller or the frozen calibration caller (B7 a).

## 1. Need

The end-of-season meeting's rulings need a record of how people get on: asking "how sure are you?"
costs a little goodwill, siding in a clash pleases one man and stings another, and a clash can leave
a rift that outlasts the meeting (F3, F4). Nothing in the tree models it (provenance row 5). The
owner sent the model to the story side, which also needs it: Spec #7 weighs arc selection by staff
relationships and lists coaching storylines (resentment, loyalty, ambition) among its first pools.

## 2. The owner's rulings (2026-10-23 01:00Z, thread "News and storylines")

| | Question | Ruling |
|---|---|---|
| B1 | One score or two? | **(a)** One score per view: how they get on |
| B2 | Can two people feel differently? | **(b)** Every direction is its own score |
| B3 | What is normal? | **(a)** The personality mix, plus 8 for the same coaching tree |
| B4 | What repairs a rift? | The owner's own words, below |
| B5 | Do results move it? | **(a)** Yes, a little |
| B6 | Can you see it? | **(a)** In words, for your own staff; never numbers |
| B7 | Can it hurt the coaching? | **(a)** Not in this version; *"let's leave this open for our story department to potentially build out more"* |

B4, in the owner's words: *"We need to develop quite a few things that impact the relationship.
Basically, different choices tend to slightly nudge the relationship up and down. That happens in the
day-to-day team management. Then, larger moments that more blatantly affect the relationship can
happen. Then, storyline arcs can occasionally involve the coaches, though these shouldn't happen
often."*

**Readings taken** (stated to the owner with the plan):
- B2: staff views of each other run separately in each direction; each staff member has a view of
  the user; the user holds none ("your feelings are yours").
- B4: three kinds of moves (§5). Rifts open and are repaired only by big moments, storylines, a
  playoff win between staff members, or someone leaving; never by everyday choices or time alone.

## 3. Views (B1, B2)

A **view** is one person's opinion of another: a score from −100 to +100, shown only as a word
(B6): close ≥ +50, good +20..+49, professional −19..+19, strained −20..−49, broken ≤ −50.

On each team, every staff member in a seat (head coach, OC, DC, special teams; the GM once the
meeting adds his seat) has a view of every other one. On the human's team the human replaces the
head coach: each staff member has a view of the user, and the user has none. Four staff make 4 views
of the user and 12 between them; a computer team's five make 20. All 32 teams run (B6: other staffs
are seen only through the news).

## 4. Rest points and drift (B3)

A view drifts back to its **rest point**: 40 × ADR-080's fit with the judged man as the coach and
the man who feels as the player ("how his type takes to that man's style"), plus 8 if they share a
coaching tree (ADR-080's definition: one worked under the other, or both under the same mentor).

| feels ↓ / about → | demanding | players' coach | cerebral | fiery | quiet |
|---|---|---|---|---|---|
| **demanding** | +16 | −8 | +4 | +4 | −4 |
| **players' coach** | −16 | +16 | −4 | −4 | +8 |
| **cerebral** | +8 | 0 | +16 | −12 | +8 |
| **fiery** | +4 | +4 | −12 | +16 | −8 |
| **quiet** | −12 | +12 | +8 | −12 | +12 |

A view of the user rests on the user's type (ADR-083) read the same way; 0 until that exists.

**Drift:** each calendar week every view closes 2% of the gap to its rest point (half-life 34
weeks; 65% of a gap gone in a year). Drift is computed, never stored as moves, and reports only when
it changes a word (§8, V2).

## 5. Moves (B4, B5)

All sizes are CHOSEN starting values. Moves from running the team live with the ledger in
`franchise`; moves from conversations, press conferences and storylines are written on the story
side and arrive as story effects (§8, V3).

### 5.1 Everyday choices

A nudge when a choice goes with or against something a staff member asked for or cares about,
usually on his side of the ball. Going against costs more than going with earns; doing it his way is
the default and moves nothing. Everyday moves on one view of the user are capped at ±3 a week.

| Choice | View | Move | Arrives with |
|---|---|---|---|
| Change a coordinator's weekly plan | his of the user | −1 tweak, −2 thrown out | ADR-076 build |
| Take a game's play calls from the coordinator who has them | his of the user | −2 | in-game calling |
| Start a player over his pick on his side | his of the user | −1 (−2 at QB) | depth chart |
| Grant or refuse the practice time he asked for | his of the user | +1 / −1 | practice plan |
| Sign or draft the player he asked for | his of the user | +2 | free agency, draft |
| Sign or draft at a spot he argued against; cut or trade a player he backed | his of the user | −2 | roster moves |
| Ask his view before a big roster move on his side | his of the user | +1 | roster moves |
| Overrule the GM's advice on a roster move | GM's of the user | −1 (−2 if he argued hard) | roster moves, GM seat |
| Credit his unit at the press conference after a win | his of the user | +1 | press (story side) |
| Put a loss on his unit at the press conference | his of the user | −2 | press (story side) |
| Ask "how sure are you?" | his of the user | −2; −3 if that view rests below 0, −1 if at +10 or more | meeting (ADR-081) |
| Most meeting answers | as written per answer | ±1 to ±3 | meeting |
| Two staff disagree politely | each of the other | −2 | meeting |

Pace check: −2 every week of an 18-week regular season takes a view from +24 to −13.8.

### 5.2 Big moments

| Moment | View | Move | Rift |
|---|---|---|---|
| Hire him | his of the user | starts at rest + 10 | |
| Promote him (title, or the play calls for good) | his of the user | +12 | repairs his |
| Extend early or raise | his of the user | +10 | repairs his |
| Keep a promise | his of the user | +8 | repairs his |
| Defend him in public under fire | his of the user | +12 | repairs his |
| Keep him when the president wants him gone | his of the user | +15 | repairs his |
| Lowball offer | his of the user | −5 | |
| Take away his play calls, or put a man over him | his of the user | −15 | can open |
| Blame him or his unit, hard, in public | his of the user | −12 | can open |
| Break a promise | his of the user | −15 | can open |
| Fire a man | of the user, by everyone good (−8) or close (−12) with him | −8 / −12 | can open |
| Side with one man in a clash | backed +5, other −8 (both of the user), doubled in the open; the other also −5 of the backed man | as listed | can open (his, of the user) |
| Two staff argue in the open | each of the other | −10 | per the meeting's F4 mix |
| Sit-down (two staff, or one and the user) | each of the other | +15 works / −5 fails | repairs if it works |

Sit-down odds: 50% + half the mean of the two men's views of the user, clamped to 10-90% (for a
grudge against the user, his view alone).

### 5.3 Storylines with coaches

Owner: occasional, *"shouldn't happen often."* For the user's staff about one per two seasons on
average, never two at once, inside Spec #7 §3's density budget, weighted by state (Spec #7 §4): a
storyline is far likelier when views and results set it up. An ending moves views up to ±25, can
open or repair a rift, and can end with someone leaving through the normal rules (ADR-080). Other
teams run them quietly, seen only in the news. First sketches, for the story side to build and grow:
the head-job itch, bad blood (a standing rift), the tug of war (GM and coordinator lobbying over one
roster call), the fall guy (a losing streak), the old hand (a slipping coordinator from the user's
tree). Details in the plan.

### 5.4 Results (B5)

At season end every view on a staff, views of the user included: +5 after a winning season, +5
more for a playoff win, −5 after a losing season.

## 6. Rifts (B4)

A rift is a grudge held by one man against another or against the user; it can run one way or both.

- **Opens** when a move marked "can open" leaves the view strained or worse, or when a meeting clash
  boils over (F4): the man who lost the argument holds it (the one the user did not back, or the one
  beaten on `politics`); both, if nobody won.
- **Effect:** −25 at once; the holder's rest point for that person is 30 lower while it stands.
- **Repaired** only by a move marked "repairs", a sit-down that works, a storyline ending, a playoff
  win (between two staff members, unless the view is broken), or either man leaving. Not by
  everyday moves, not by time.

## 7. Readers

1. **Stay or go** (ADR-080, `franchise`): a coordinator's view of the user shapes how he takes a
   new offer (strained may refuse and test the market; close signs). A computer head coach's view
   of a coordinator joins ADR-080's "head coaches judge their coordinators" score, and a new head
   coach's view of an inherited coordinator joins keep-or-replace. Head jobs elsewhere are always
   taken (ADR-080 §7.1).
2. **Clash heat** (meeting F4): the lower of the two views between the men.
3. **Leaks** (news desk): only a man holding a strained or broken view (of the user or a colleague)
   leaks; a rift can be its own story; sources are never named.
4. **Display** (B6, `apps/game` later): each view of the user as a word; each staff pair as one word
   when both views share a band, both words when not.
5. **Later:** player morale, the president's judgement.

## 8. Proposal: the contracts edits (shape only; each needs the owner's typed yes by name)

- **V1 — views in the save** (the meeting design's G6, now one entry per direction). A party is a
  staff member or the user, who has no staff record:
  ```ts
  /** ADR-084 V1. */
  export type RelationshipParty = { staff: StaffId } | { user: TeamId };
  export interface RelationshipView {
    from: StaffId;          // whose view; the user holds none
    of: RelationshipParty;
    score: number;          // -100..+100
    rift?: { since: CalendarStamp; cause: string };
  }
  // SaveFile.world.relationships?: RelationshipView[]
  ```
- **V2 — `RELATIONSHIP_CHANGED`** in the event stream, once per move (and once per word change from
  drift): `{ from, of, delta, cause, before: word, after: word, rift?: "OPENED" | "REPAIRED" }`, so
  the news, the meeting's report card and the viewer read the same facts (Iron Rule 3).
- **V3 — `RELATIONSHIP_DELTA`** in `NarrativeEffect`:
  `{ kind: "RELATIONSHIP_DELTA"; from: StaffId; of: RelationshipParty; delta: number; rift?: "OPEN" | "REPAIR"; reason: StorylineId }`,
  so story-side moves stay inside the closed effect union (Spec #7 §1).

## 9. Worked example

A players'-coach DC and a demanding GM: the DC's view of the GM rests at −16, the GM's of the DC at
−8; the DC's view of the user is +24, the GM's +12. At the meeting they argue in the open (DC→GM −26,
GM→DC −18); the user sides with the GM in the open (GM→user +22, DC→user +8, DC→GM −31); the user
asks the DC "how sure?" twice (DC→user +5: −2, then only −1 under §5.1's cap of 3 a week; the
first draft said +4, missing the cap). Six weeks later the user signs the GM's corner over the
DC's objection (DC→user ≈ +2, GM→user ≈ +21 after drift), and a leak about the secondary comes from
the DC, the one holding a strained view (DC→GM ≈ −29). A year after the meeting, results aside:
GM→DC ≈ −11.5 (professional), DC→GM ≈ −21 (still strained), so the next clash starts hotter. Had
the clash boiled over, the DC would hold the rift: DC→GM −56, rest point −46. Every figure here is
checked by `packages/franchise/test/relationships.ledger.test.ts`.

## 10. Build order (each step its own commit and owner yes where named)

| Step | Piece | Check |
|---|---|---|
| L0 | This note | rulings recorded |
| L1 | The ledger in `franchise`: views, rest points, drift, rifts, the moves of §5 as one data table; V1-V3 on the owner's typed yes | unit tests; same seed, same ledger; drift halves a gap in 34-35 weeks. **Built (§13)** |
| L2a | Hiring, firing, extensions and season results, carried by the carousel | the carousel decides exactly as without views. **Built (§13)** |
| L2b | The stay-or-go readers (ADR-080) | turnover bands of ADR-080 §8 still hold, or moved and reported |
| L3 | The meeting's moves and clash heat (with ADR-081's M3) | the meeting's own checks |
| L4 | Leaks on the news desk | leaks only from strained or broken views |
| Later | Each everyday choice as its part of the game arrives; conversations (sit-downs, promises, press); storylines with coaches | each with its own tests |

## 11. Impact

- Built: `contracts` (V1-V3), `franchise` (the ledger, and the carousel carrying it).
- Later: `franchise` (the readers), `narrative` (leaks, later story moves), `apps/game` (the staff
  page). `engine`, `playbook`, play-callers, `calibration`: **no change.**

## 12. Decision

Design: **ruled by the owner, 2026-10-23 01:00Z**, thread "News and storylines": *"1. A 2. B 3. A
4. [three kinds of moves, quoted in §2] 5. A 6. A 7. A. But let's leave this open for our story
department to potentially build out more."*

Contracts edits V1-V3: **approved by the owner's typed yes, 2026-10-23 02:44Z** (*"Yes, make
contracts edits V1, V2 and V3."*), and made as §8 shapes them (`packages/contracts/src/relationships.ts`,
`events.ts`, `save.ts`; spec #1 updated).

## 13. As built: L1, and the carousel's moves of L2 (2026-10-23)

- **Where:** `packages/franchise/src/relationships/`: `tables.ts` (the knobs, and every move of §5
  as one table), `ledger.ts` (views, words, rest points, drift, moves and rifts, story effects),
  `staffMoves.ts` (season results, a firing, a hire, an extension). `runStaffOffseason` carries the
  views when given them (`relationships: { views, context }`) and returns them moved.
- **Readings taken in the build** (none changes a ruling; each is a one-line change):
  1. On a computer team the head coach stands where the user stands: a move written "his of the
     user" lands on his view of his head coach, who hires, fires and extends there. A head coach
     answers to the president, whose views are not kept yet, so the president's hiring, firing or
     extending of a head coach moves nothing.
  2. "Fire a man" includes letting his contract run out (ADR-080's `LET_CONTRACT_EXPIRE`), the same
     decision made the same way.
  3. A man who leaves a staff (let go, retired, hired away) takes his views, and the views of him,
     with him; a newcomer's views start at their rest points, his view of the man who hired him 10
     above (§5.2). Two men who meet again later start afresh.
  4. The tree bonus uses ADR-080's `inTree` as it is. A hire puts the head coach in the
     coordinator's lineage, so a head coach and the coordinators he hired, and those coordinators
     among themselves, share a tree (+8); coordinators he inherited do not.
  5. A playoff win is +5 once, however many playoff games were won; whether it repairs a rift
     between two staff members (unless broken) is judged after the +5.
  6. A rift's −25 is not given back when it is repaired; only the rest point comes back up.
  7. The weekly cap (§5.1) counts the net of the week's everyday moves on that view, read from the
     week's events, and a move past it moves only up to the cap. It also caps the meeting's "how
     sure?" costs within the meeting week (§9 corrected for it); whether the meeting is exempt is
     L3's question.
  8. Each reported move is one `RELATIONSHIP_CHANGED` with the total change (a rift's −25 included)
     and the move's table name as its cause; a story effect's cause is `STORYLINE:<id>`. A move that
     changes nothing is not reported.
- **Not wired yet:** nothing in the season loop runs the weekly drift (`driftWeek`, once a calendar
  week, is the caller's), and views are not saved: saves carry no staff yet (`makeSave` writes
  `staff: []`) and a view names staff, so both arrive with staff in the save.
- **Measured** (20 seasons of ADR-080's stand-in results, views carried week by week, one team run
  by a user): views stay close to their rest points (mean distance 2.5 to 3.2):
  20-28% good, the rest professional, none strained or broken; 1 rift opened in 20 seasons (a friend
  fired), none standing at the end; about 570 reported moves a season across the league, most of
  them season results. With only the carousel's moves, staffs settle into their personality mix;
  the swings come with the meeting, conversations and storylines (L3 and later). Turnover cannot
  move: the carousel reads no view (tested).

## 14. As built: the coaches in the season's walk (2026-10-31, thread "Continue news and storylines")

§13 left two things unwired: the weekly drift and the views in the save. Building them showed a
larger gap: the carousel ran only in the made-up history, so between real seasons no coach was ever
hired or fired. This step wires both, in `franchise` only, with no contracts edit.

- **Where:** `packages/franchise/src/staff/steps.ts` (`staffSteps`), three day steps in `runSeason`'s
  walk, after the players' steps and before the draft's: the views are seated at their rest points
  if the league has none; on each week's last day every view drifts (§4); on OFF_EVAL week 1 day 1,
  once the champion is decided, `runStaffOffseason` runs on `summariseSeason` of the season just
  played, carrying the views. `LeaguePeople.coaching` holds the whole coaching world and its views
  (the save's `staff` shape); `people.staff` follows it, so the draft's scouting and the players'
  coordinators read the new staffs. A newly seated head coach gets his depth-chart leanings
  (ADR-087 C1) when the league's head coaches have them.
- **Readings taken:** the carousel's events keep their order but are stamped with the carousel's
  day (OFF_EVAL week 1 day 1), not ADR-080's weeks 1-3 of OFF_EVAL, because a day step's events
  take its day. The season command runs it only on the people's walk (`--development` or
  `--injuries`, which play through the year); a plain season stops on OFF_EVAL's first day with
  no people and is unchanged.
- **Checks:** `staff.season.test.ts`: the same games with and without the steps; the carousel is
  exactly `runStaffOffseason` on the summarised season; the views pass `checkViews` and drift; a
  stop at week 9 carried on gives the straight run's people and events; same seed, same result.
  `realSeasonPlayers.test.ts`: the real-sim weeks are byte-identical with the coaching world given.
  Through the season command: `--stop-after 9 --save`, then `--load`, saves the same file a straight
  run saves (every field of the world, the new staffs and views included).
- **Roster fit:** the carousel reads each team's roster as it stands that day (`people.teams`), with
  the coaching world's staff list and budget. Without this a loaded league (whose teams carry their
  rosters) and a straight run (whose coaching world's teams carry none) hired differently.
- **One real season** (seed `walk-1`, both switches): 36 seats changed hands (26 fired, 5 contracts
  run out, 3 hired away, 2 retired), 538 reported view moves; `--stop-after 9 --save` then `--load`
  gives the straight run's event stream exactly.

## 15. As built: stay or go (L2b, ruled 2026-10-31)

The owner's answers, thread "Continue news and storylines", 2026-10-31 01:37Z: *"1. b 2. a 3. a 4. b
5. a 6. a"* (Q4-Q6 are §16's and the meeting's).

| | Question | Ruling | As built (`RELATIONSHIP_TUNING`) |
|---|---|---|---|
| Q1 | A coordinator's contract is up and he is sour on his boss: how likely does he walk? | **(b)** strained 1 in 10, broken 4 in 10 | `walkChance`; head coaches never walk (the president holds no views) |
| Q2 | Does a head coach's opinion count when he judges a coordinator? | **(a)** strained ≈ 5 places of unit rank, broken ≈ 10; liking protects as much | `fireOpinionPerPoint` 1.6/100 in the firing logit |
| Q3 | Does style fit change whether a new head coach keeps an inherited coordinator? | **(a)** about ±10 points | `keepFitPerUnit` 0.25 × ADR-080's fit (the coordinator judged, the head coach feeling) |

- **Readings taken:** a walk-out is `STAFF_DEPARTED` with `CONTRACT_EXPIRED` (no contracts edit),
  marked `walked` on the carousel's `StaffMove`, with no team decision and no sting to his friends
  (nobody fired him). On the user's team the user holds no views, so Q2 reads nothing there; the
  user's own choice arrives with the hiring screen. The readers read only when the carousel is given
  views; the made-up history and the plain turnover check carry none and are unchanged.
  `relationships.read: false` carries views without reading them (the L2a behaviour, kept for tests
  and measurement).
- **Check** (`staff-check --views`, 50 offseasons, four seeds, against the same seeds without views):
  head coach changes 7.4-8.1 a year (7.3-8.3 without), offensive coordinators 12.5-13.6 (12.9-14.8),
  defensive 11.5-12.1 (11.9-12.8), special teams 9.1-9.7 (9.5-10.3): inside ADR-080 §8's NFL ranges,
  coordinators about 0.5 a year steadier because most head coaches like the men they hired. After each
  offseason 28-31% of views are good, 69-72% professional, 0.1-0.3% strained, none broken; **nobody
  walked in 200 offseasons.** The readers wait for the meeting, conversations and storylines to sour
  someone. `relationships.stayOrGo.test.ts` checks the sizes and the bands.

## 16. As built: leaks and coaching-change news (L4, ruled 2026-10-31)

| | Question | Ruling | As built |
|---|---|---|---|
| Q4 | How often does someone leak? | **(b)** half of (a): strained about once in two years, broken about once a year; at most one leak a team a week; only in the room the games leave; all 32 teams; sources never named | `LEAK_CHANCE` per calendar week the desk closes: strained 0.5/52, broken 1/52 |
| Q5 | Are coaching changes news? | **(a)** each head coach departure and hire a headline in the offseason; coordinator changes in one roundup | `COACH_DEPARTS` (fired, contract run out, retired, hired away), `COACH_HIRED` (promoted, hired off another staff, a former head coach, from outside), `COORDINATOR_ROUNDUP`, all of them always run |
| Q6 | Build the meeting here after this? | **(a)** yes | next; contracts edits G1-G5 need the owner's typed yes naming them |

- **Where:** `packages/narrative/src/news/staff.ts` (the coaching beat), read by the desk
  (`desk.ts`); wording in `content/headlines.json`. The desk reads only events and its input:
  `NewsInput.staff` (who sat in each seat when the stream starts) and `NewsInput.views` (how each man
  felt then), then follows `STAFF_DEPARTED`, `STAFF_HIRED` and `RELATIONSHIP_CHANGED`. The season
  command passes both and writes them into `--out` files as `coaching`, so `news` reads them too.
  No contracts edit: a story's `kind` is a string (ADR-082 N1).
- **Readings taken:** names stay out (ADR-082 Q1: teams only); men are named by job ("the defensive
  coordinator"). A grudge opening (`rift: "OPENED"`) is its own story (`RIFT`), filling room like a
  leak. A leak needs both men on the same staff. Leak dice roll only in weeks the desk closes, which
  is every week of a season played with the players' switches (their steps write every week) and
  the game weeks otherwise. An edition with no games is titled "Coaching changes" or "Around the
  league". A walk-out (§15) reads as "contract run out": the event cannot tell it from the team's
  choice without a contracts edit, left for the meeting's edits.
- **Checks:** `narrative/test/staff.test.ts`: the stories for each departure and hire, promotion
  and poaching told apart, one roundup, no names; over ten quiet years, broken views leak 160-300
  times from 24 coordinators and strained 70-170, professional and good never; a full week of games
  carries no leak; a view that sours starts leaking and one that recovers stops; a rift is a story.
- **One real season** (seed `walk-1`, both switches): 12 head coach stories (6 departures, 6
  hires), a roundup of 30 coordinator changes across 19 teams, and one leak (a defensive and a
  special teams coordinator on one staff).
