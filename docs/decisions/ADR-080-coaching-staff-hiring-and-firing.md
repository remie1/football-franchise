# ADR-080: coaching staffs, hiring and firing

- **Date:** 2026-10-22
- **Proposed by:** Orchestrator, for `franchise` (thread "Coaching staff"; plan at
  `/mnt/project-files/design/coaching-staff-plan.md`, pieces C0-C5)
- **Status:** design ruled by the owner (Q1-Q7, 2026-10-22); contracts edits P1-P4 and D1 **awaiting
  the owner's typed yes**

> Phase note: Charter §6 places franchise at Phase 4. The owner pulled franchise work ahead on
> 2026-10-21 (ADR-078) and asked for this piece the same day, on the same condition: nothing here
> touches engine, playbook, play-caller or calibration code, or moves any sim number or seed.
> Coaches change no game until the engine hookup, which waits for ADR-073 and ADR-075 T1.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| Contracts already has `StaffState` (name, role, age, ratings, `schemeFamily`, `lineage`, `personalityType`, `teamId`), `StaffRole` incl. `PRESIDENT`, `Team.staff`, `Team.staffBudget`, `STAFF_HIRED` / `STAFF_DEPARTED` events, `SaveFile.world.staff` | `players.ts:114-129`, `players.ts:161-170`, `events.ts:553-554`, `save.ts:21`, read 2026-10-22 | COMPUTED (read) |
| The coach rating list has 19 skills in three timescales | `registry.ts:256-284` (`COACH_ATTRIBUTE_REGISTRY_V1`) | COMPUTED (read) |
| Players carry `personality.type` from the same five types as coaches, and a `coachingStyle` need weight | `players.ts:92-104` | COMPUTED (read) |
| **Nothing in the tree constructs a `StaffState`, a staff contract, or emits / reads `STAFF_HIRED` / `STAFF_DEPARTED`** | `grep -rn "StaffState\|STAFF_HIRED\|STAFF_DEPARTED" packages apps` | COMPUTED |
| Every team's `staff` is `[]` and `staffBudget` is `{ limit: 0, committed: 0 }` | `packages/franchise/src/league/buildLeague.ts:74-77` | COMPUTED (read) |
| Spec #11 (coaching & staff): seats, the coach sheet, effect channels, style match, staff economy, hiring as "drafting with a résumé", AI head coaches | `docs/design/coaching-staff.md` §2-§9 | read (spec, not built) |
| ADR-075's disguise tendency shape, the 10%-55% spread and the 31.5% league mean | ADR-075 §3.2, §3.3, §10 Q2 | owner-ruled |
| NFL: 68 head coaching changes in the ten seasons 2004-2013 (6.8 a year) | footballscoop.com, "there have been 68 NFL coaching changes in the last decade" (2014) | REPORTED |
| NFL: 7 head coach changes after 2017 ("about average"), 18 offensive coordinator changes (the decade high), 10 the year before | The Ringer, "Offensive coordinator turnover" (2018-08-29) | REPORTED |
| NFL: 8 head coach, 16 offensive coordinator and 11 defensive coordinator changes after 2018 | Acme Packing Company (2019-02-21) | REPORTED |
| New NFL head coaches since 2005: offensive coordinators 28.3%, retreads 26.4%, defensive coordinators 18.9%, college coaches about 10% | Football Perspective, "Where do teams find new head coaches?" (2013) | REPORTED |
| Recent cycles (2017-2025) ran 5 to 10 head coach openings a year | the author's recollection, not checked line by line | REPORTED (unverified) |
| 2024 NFL staffs: about 4 offensive and 7 defensive coordinators had been NFL head coaches | the author's count from memory of the 2024 staffs | REPORTED (unverified) |
| Salary scale (head coaches about $4M-$20M a year, coordinators about $1M-$5M, special teams about $1M-$2M) | the author's recollection of public reporting | REPORTED (unverified) |
| Every weight, rate and threshold in §5-§8 below | named here | CHOSEN — provenance NONE; tuned against the REPORTED rows in step C5 |

## Conjoined mechanisms

This ADR rules a franchise-side model (§3-§8, owner-ruled Q1-Q7) and asks for five edits (P1-P4,
D1), listed separately so each can be approved or refused on its own. None of the mechanisms is read
by the sim, so there is nothing to price against sim output; their rates are priced against NFL
turnover in step C5.

## Implied scope (unruled, not built here)

- Coaches affecting games (Spec #11 §4: game plans, adjustments, play calling, the leash). Waits for
  ADR-073 and ADR-075 T1; ADR-076's weekly plan and ADR-075 T5-T7 are the first consumers.
- Coaches getting better or worse over a career (Spec #11 §6 "rising demands", §11.2 growth curves).
  Ratings are fixed for life in this build; growth arrives with player development.
- Position coaches, scouts, the strength coach (Q1: they arrive with development and scouting).
- Mid-season firings and interim coaches.
- The human's own seat: the human's own job security, and a hiring screen (the `choose` hook in §7.6
  is the seam; the screen is UI work).
- Candidates turning a job down (money, "gravity", a better offer). Every offer is accepted in v1.
- Scheme fashion (Spec #12) and the president's `trendReceptivity` / the head coach's
  `schemeOrthodoxy`. Generated, not read.
- Front-office turnover. Presidents are fixed in v1: they do not age, retire or get replaced.
- A GM seat. The thread "End-of-season staff meeting" is designing one; no `StaffRole` edit here.
- Former players entering coaching (Spec #11 §3 origin): needs player careers.
- Enforcing the staff budget (Q5: tracked, not enforced, until the salary cap work).

## Inertness proof

Claim: **this changes nothing the sim produces.**
- **Algebraic:** P1-P4 are types, an optional save field, a widened `StaffState` that nothing
  constructs, and tightened event payloads that nothing emits (provenance row 4). Types are erased
  at runtime. No engine, playbook, play-caller or calibration file is edited, and calibration's
  season runner does not call anything in this ADR.
- **Empirical:** `pnpm verify` green; the calibration suite and the determinism tests unchanged.
  Recorded in the Decision section when built.

## 1. Need

Three ruled designs are waiting on coaches who exist: the DC's disguise habit (ADR-075), the weekly
game plan (ADR-076, the DC's `gamePlanning` and film depth) and the coach's leash (ADR-068/072).
Spec #11 §9 says the employed staff *is* an NPC team's personality, so league texture comes from
staff turnover. Today every team's staff list is empty.

## 2. The owner's rulings (2026-10-22 14:35Z, thread "Coaching staff")

| # | question | ruling |
|---|---|---|
| Q1 | Which coaches now | ✅ **(a)** Head coach, offensive coordinator, defensive coordinator, special teams coordinator. Position coaches, scouts and the strength coach come with development and scouting |
| Q2 | How coaches are rated | ✅ **(a)** One ruler for every coach and every skill (same idea as the absolute player ratings ruled in thread "Team rosters"). Every coach has all 19 skills. 50 is an average NFL coordinator |
| Q3 | Who hires whom | ✅ **(a)** Like the NFL: the team president (computer-run in v1) hires and fires the head coach; the head coach picks and fires his coordinators; a new head coach usually brings his own |
| Q4 | How often coaches are fired | ✅ **(a)** Tuned to the NFL: results against expectations, the trend, playoff runs, job security from past success and `politics`; between seasons only for now |
| Q5 | Money | ✅ **(a)** Contract years and salary; a fired coach's remaining salary still counts (dead money); the staff budget tracked, not enforced |
| Q6 | How teams judge candidates | ✅ **(a)** Through a blurry lens, plus the owner's note below |
| Q7 | The DC's disguise habit now | ✅ **(a)** Each defensive coordinator gets the share of passing snaps he disguises; nothing reads it yet |

**The owner's note on Q6**, in his words: qualities to consider when hiring "are how the personality
type matches their roster, the coach's resume and where they had their recent success or failures
(for example: one coach might be building off of two great seasons but they were in college which
is less reliable information, and another coach might be coming off of two bad seasons but maybe
they were on an NFL team with a bad roster and the coach is actually better than their recent
record)". Each part lands in §7:

| the note | in the model |
|---|---|
| personality type vs the roster | **roster fit** (§7.4): the coach's type against the players' types, weighted by how much each player cares about coaching style |
| the résumé | every coach carries his **career** (P2): each job, each season's record, his unit's rank, playoff runs |
| where recent success or failure happened | **recency**: recent seasons count most; **level**: a college season counts for less than an NFL season (§7.3) |
| two bad seasons with a bad roster | each NFL season on the résumé carries the team's **roster rank**; an evaluator credits a coach for beating what his roster should have done, and the better the evaluator, the more fully he corrects (§7.3) |
| the game user weighing it | the same **candidate report** the computer uses is what a human hiring screen will show (§7.6): the blurry read, the résumé with its level and roster context, and the fit |

## 3. Who exists

| who | per team | seat | notes |
|---|---|---|---|
| Head coach | 1 | `HEAD_COACH` | offence, defence or (rarely) special-teams background |
| Offensive coordinator | 1 | `OC` | offensive background |
| Defensive coordinator | 1 | `DC` | defensive background; carries the disguise habit (P4) |
| Special teams coordinator | 1 | `STC` | special-teams background |
| President | 1 | `PRESIDENT` | computer-run; hires and fires the head coach (Q3). Rated on the same sheet; his `talentEvaluation` sets how clearly he reads candidates. Fixed in v1 |
| The pool | league-wide | none | coaches out of work, NFL position coaches (a seat not modelled in v1, shown on résumés) and college coaches (a head coach at each of 60 made-up programmes, some coordinators). About 300 at any time, most of them NFL position coaches, where most coordinators come from; topped up each year with young coaches, and every staff keeps an assistant special teams coach, where special teams coordinators come from |

A coach's **background side** comes from his `schemeFamily` (an offensive or defensive system, or
special teams), through a franchise lookup table, so no field is added for it. `team.staff` lists the
four seat holders and the president.

## 4. Ratings (Q2)

- Every coach has all 19 skills of `COACH_ATTRIBUTE_REGISTRY_V1`, 1-99, on one ruler. A special
  teams coach's `gamePlanning` is measured on the same scale as a coordinator's, so a promotion keeps
  his real number.
- **Anchor:** the average sitting coordinator's average skill is 50 at the league's first season
  (tested within 47-53). Head coaches average higher because the hiring picks them from the better
  candidates, not because the maker gives them more.
- **Shape:** a coach's skill = a shared talent level + a skill-by-skill spread, so most coaches are
  strong in a few skills and plain in the rest. Age at creation does not lift a coach's skills: with
  no growth over a career in this build (implied scope), that would let the old outrank the young
  for good.
- **What each seat values** (the weights the evaluators use; CHOSEN, tunable):

| seat | skills that count (weight) |
|---|---|
| Head coach | situationalJudgment .15, culture .15, gamePlanning .10, inGameAdjustment .10, motivation .10, staffDevelopment .10, talentEvaluation .10, playCalling .05, schemeDesign .05, mediaHandling .05, politics .05 |
| Coordinator (OC, DC) | gamePlanning .20, playCalling .20, schemeDesign .15, inGameAdjustment .15, teaching .15, development .10, situationalJudgment .05 |
| Special teams | teaching .30, development .20, gamePlanning .20, motivation .15, situationalJudgment .15 |

## 5. Personality and roster fit

Coaches get one of the five existing types (demanding, players' coach, cerebral, fiery, quiet).
Spec #11 §5's style match is a table of how well a coach's type gets on with a player's type
(**starting values, CHOSEN; the owner can change any cell**):

| coach ↓ / player → | demanding | players' coach | cerebral | fiery | quiet |
|---|---|---|---|---|---|
| **demanding** | +0.4 | −0.4 | +0.2 | +0.1 | −0.3 |
| **players' coach** | −0.2 | +0.4 | 0 | +0.1 | +0.3 |
| **cerebral** | +0.1 | −0.1 | +0.4 | −0.3 | +0.2 |
| **fiery** | +0.1 | −0.1 | −0.3 | +0.4 | −0.3 |
| **quiet** | −0.1 | +0.2 | +0.2 | −0.2 | +0.3 |

A coach's **roster fit** is the average of his row over the team's players, each weighted by the
player's `coachingStyle` need (how much he cares) and doubled for a starter. In v1 it is read only by
hiring (§7.4). Teams have no rosters yet, so fit is 0 for everyone until thread "Team rosters"
lands; nothing else has to change when it does.

## 6. Firing (Q3, Q4)

Every step runs once a year, after the playoffs (OFF_EVAL), in this order: record the season on every
résumé, retirements, the president judges the head coach, continuing head coaches judge their
coordinators, head coaches are hired, new head coaches keep or replace the coordinators they inherit,
coordinator openings are filled, contracts, the pool is topped up, everyone ages a year.

**The president judges the head coach.** A firing score rises with:
- the season's win share below **what was expected** (from the roster's rank when known, otherwise
  .500; a president corrects for the roster as far as his `talentEvaluation` allows),
- last season's shortfall too (the trend),

and falls with:
- a playoff trip and each playoff win (a champion is never fired),
- **credit from past success in this job** (earlier seasons above expectation, playoff wins), fading
  year by year,
- a **honeymoon** for a new coach (strong in year one, some in year two),
- his **`politics`** (relationship with the president).

The score becomes a probability, rolled on the league's dice. A head coach whose contract ends that
year is judged a little harder; if he is let go then, the reason is "contract ran out" rather than
"fired".

**Head coaches judge their coordinators** the same way, on their unit's scoring rank (offence) or
points-allowed rank (defence), with extra risk when the head coach himself barely survived (the
scapegoat), a honeymoon in year one, and `politics` as a shield.

**Retirement** by age (about 1 in 7 a year in the late sixties, rising after 70), and pool coaches
out of work three years or more drift out of coaching.

## 7. Hiring and poaching (Q3, Q6)

### 7.1 Who can be hired

| opening | candidates |
|---|---|
| Head coach | anyone not retired and not a sitting head coach: other teams' coordinators (they may always leave for a head job), this team's own coordinators (a promotion), the pool (out of work, college, position coaches) |
| OC / DC / special teams | the matching background, from the pool and other teams' position coaches; never a sitting coordinator elsewhere (no sideways moves under contract), and never a sitting college head coach (he is a candidate for head jobs only) |

Openings are filled worst record first. A coordinator hired as someone's head coach opens his old
seat, which his old head coach fills in the coordinator round. A team does not rehire, in the same
offseason, a coach it has just let go.

**Most fired head coaches never step down.** About three in ten former NFL head coaches (CHOSEN; one
roll per coach, kept for life) will take a coordinator job again. The rest sit out on the old
contract's money, take TV or consulting work, or wait for another head job (head coach searches still
see them, and they drift out of coaching like anyone else out of work). Without this rule, fired head
coaches, picked as the best of their generation and not getting worse, filled 20 to 29 of the 32
offensive coordinator seats after the made-up history.

### 7.2 Two stages: reputation, then the interview

1. **Who gets an interview** is decided by **reputation**: the résumé as the public reads it (records
   at face value, little roster correction). Ten for a head coach job, six for a coordinator job. A
   head coach always interviews his own coaching tree. So a good coach with a thin résumé is easy to
   overlook, and a coordinator whose great players made him look good gets the calls.
2. **The interview** gives the evaluator (the president for a head coach, the head coach for a
   coordinator) a **blurry read of every skill**: each skill read with an error whose size falls as
   the evaluator's `talentEvaluation` rises (from about ±18 for a poor judge to about ±3 for the best,
   one standard deviation). The same team reading the same candidate in the same year always gets the
   same read.

### 7.3 Reading the résumé

Each season on the résumé counts by:
- **recency**: last season fully, then a quarter less each year back,
- **level**: an NFL season fully, a college season much less (a strong program can make anyone look
  good, and the evaluator cannot see how strong it was),
- **relevance**: a head coach's own record for a head job; a coordinator's unit rank for a
  coordinator job and partly for a head job; a position coach's lines barely,
- **roster context**: an NFL season is judged against what the team's roster rank said it should do.
  A great evaluator credits the coach who went 6-11 with the league's worst roster; a poor one sees
  only 6-11.

A long good record moves the judgement more than one good year (the résumé is shrunk toward
average when it is short). **Experience** counts on top: years as an NFL head coach (the "retread"),
as an NFL coordinator, as a college head coach.

### 7.4 The judgement

For each interviewed candidate: the interview's read of the seat's skills (§4), plus the résumé
reading, plus experience, plus **roster fit** (§5), plus, for a coordinator, a bonus for the head
coach's own **tree** (worked under him, or under the same mentor), minus an age term for candidates
past about 52 for a head job and 58 for a coordinator job. Head coach searches add three more terms,
all CHOSEN in C5 to bring the hiring sources near the REPORTED shares:
- a **stigma** for a head coach his last NFL team let go, heavier in the four seasons after, lighter
  later;
- a **lean by background**: toward offensive minds (the REPORTED hires run 28% offensive to 19%
  defensive coordinators) and away from special teams coaches;
- a cost for a candidate who has **never run a unit or a programme**, and a smaller one for one who
  has run them **only in college**, where it is hard to tell what carries over.

Reputation (who gets the interview) carries the same three terms. The best judgement gets the job;
every offer is accepted in v1.

### 7.5 What a hire carries

- **Contract** (P1): head coach 4 or 5 years, coordinators 2 or 3; salary from the judgement on the
  scale in the provenance table. A kept coach in his last year is extended (head coach 3 years,
  coordinator 2) with a raise, including a coordinator a new head coach decides to keep.
- **Career** (P2): the old job closes with how it ended; the new one opens.
- **Tree**: a coordinator who takes a seat under a head coach adds him to his `lineage`.
- **Events and decisions**: `STAFF_DEPARTED` (P3 reasons) and `STAFF_HIRED` events; every hire,
  firing and extension is also returned as a `Decision` with its authority tag (Iron Rule 6):
  `PRESIDENT` for the head coach, `COACH` for coordinators, `decidedBy: "NPC"`.
- **Dead money**: a fired coach's contract is marked ended; his salary keeps counting in the team's
  `staffBudget.committed` through its last season. A coach who retires or is hired away stops
  counting. `staffBudget.limit` is set to a league default, shown, and not enforced (Q5).

### 7.6 The human

The candidate report (§7.2-§7.4: the read of each skill with its error, the résumé lines with level,
record and roster rank, the fit) is a function a hiring screen can call. Hiring takes an optional
`choose` hook per team: when given, it is shown the shortlist's reports and its pick replaces the
computer's (a human holding the COACH seat picks his coordinators). No screen is built here.

## 8. The league's history and the turnover check

- **History.** A new league starts with 20 seasons of made-up history before its first real season,
  run through exactly this offseason on stand-in results (each team's hidden roster strength drifts
  year to year; coaches nudge results a little; college programmes have their own strength). So on
  day one the league has coaching trees, retreads, rising coordinators and résumés that agree with
  each other: no two head coaches of the same team in the same year.
- **Stand-in results are not the sim.** They exist only for the made-up history and the check. Real
  seasons feed the same offseason through a summary of the real `SeasonState`. Until rosters exist,
  real records are close to coin flips and their roster rank is unknown, so who gets fired is mostly
  luck; and until coaches are hooked into games, real records carry no coaching signal at all.
- **The check (C5).** 50 offseasons in a row on stand-in results, compared with the REPORTED rows:
  head coach changes a year (target 5-8, about 7), offensive coordinator changes (10-18), defensive
  coordinator changes (8-14), how long head coaches last (about 4-5 seasons on average), and where new
  head coaches come from (coordinators about half, retreads about a quarter, college about a tenth).
  Also reported: pool size, ages, tree hires, dead money, and the sitting DCs' mean disguise share.

### 8.1 The disguise habit (Q7, ADR-075 T2 part, T3)

Every coach with a defensive background is created with ADR-075's tendency: the share of passing
snaps he disguises, drawn around 31.5% between 10% and 55%. Only the `passSnapMaskShare` is drawn;
favourite looks, late rotation and the fake-rush rate stay absent (the league defaults) until the
ADR-075 build, as ADR-075 Q3 sequenced them. At the league's first season the 32 sitting DCs are
re-centred so their mean is exactly 31.5% (ADR-075 §3.3). After that, new DCs are drawn from the same
spread and the check reports how far the mean wanders; holding it exact every year would mean
quietly changing coaches' habits, which ADR-075 does not ask for. Nothing reads the tendency yet.

In the check (§8.2) the mean wandered between 28.7% and 34.1% over 50 seasons, so it leaves the
owner's 30-33% band at times. Holding it inside would take either re-centring every year or drawing
new DCs around a centre that leans against the drift. Both are the owner's call, best made at the
ADR-075 build, when something first reads the habit.

### 8.2 What the check found (C5, 2026-10-22)

Eight made-up leagues, 50 offseasons each after their 20 seasons of history. `pnpm --filter
@ff/franchise staff-check` runs one league and prints these rows; `staff.check.test.ts` holds the
bands on another.

| measure | the game (8-league mean) | NFL |
|---|---|---|
| head coach changes a year | 7.6 (7.2 to 8.1 by league) | 6.8 (2004-2013); 7 and 8 after 2017 and 2018 (REPORTED) |
| offensive coordinator changes a year | 13.4 | 10, 18, 16 after 2016-2018 (REPORTED) |
| defensive coordinator changes a year | 12.2 | 11 after 2018 (REPORTED) |
| special teams coordinator changes a year | 9.7 | no figure on file |
| head coach tenure, jobs that ended | 4.2 seasons | §8 target 4-5 (CHOSEN, no figure on file) |
| new head coaches who were offensive coordinators | 35% | 28% (REPORTED) |
| ... defensive coordinators | 21% | 19% (REPORTED) |
| ... retreads (an earlier NFL head job) | 28% | 26% (REPORTED) |
| ... college coaches | 10% | about 10% (REPORTED) |
| ... special teams coordinators, position coaches | 4%, 1% | inside the other 16%, not broken down (REPORTED) |
| coordinator hires from the head coach's own tree | 34% | no figure on file |
| sitting coordinators' average skill at the first season | 49.7 | 50 by ruling (Q2) |
| former NFL head coaches sitting as coordinators | about 12 OCs and 7 DCs | about 4 and 7 in 2024 (REPORTED, unverified) |
| the DCs' mean disguise share | 31.5% at the start, then 28.7% to 34.1% | 30-33% (owner, ADR-069) |

Rules and values set in C5 to get there, all CHOSEN: most fired head coaches never step down (§7.1,
three in ten will); every staff keeps a special teams assistant (§3); in head coach searches the
stigma of being let go (8 rating points for four seasons, 6 after), the lean by background
(offence +4, defence 0, special teams −3), and the costs of never having run a unit (5) or of
having run one only in college (2) (§7.4); the rating base set so the anchor lands on 50 (§4).

**Known gaps.** (1) Offensive coordinators are hired as head coaches a little too often (35% against
28%), mostly because assistants below coordinator are almost never hired (1%); a fuller pool comes
with position coaches (Q1). (2) About three times too many former head coaches sit as offensive
coordinators (12 against about 4, by an unverified count); the §7.1 rule brought it down from 20-29.
(3) The disguise drift above.

## 9. Proposal: the contracts edits

All additive. `CONTRACTS_SCHEMA_VERSION` unchanged, as in ADR-078.

### P1 — the staff contract (new `staff.ts`; `save.ts`)

```ts
/** ADR-080 P1: a coach's contract with a team. Money is dollars per season. */
export interface StaffContract {
  staff: StaffId;
  team: TeamId;
  role: StaffRole;
  firstSeason: number;
  lastSeason: number;
  salary: number;
  signedAt: CalendarStamp;
  /** Set when it ends early. A FIRED coach's salary still counts through lastSeason (dead money). */
  terminated?: { at: CalendarStamp; reason: StaffDepartureReason };
}

// SaveFile.world gains — optional, so saves written before it still load (as Save and load E1 did):
staffContracts?: StaffContract[];
```

### P2 — the career (`staff.ts`; `players.ts`)

```ts
/** ADR-080 P2: where a job was. College jobs appear only on résumés. */
export type CoachingLevel = "NFL" | "COLLEGE";

/** ADR-080 P2: one season of a job, as a résumé shows it. */
export interface StaffJobSeason {
  season: number;
  record: WinLossTie;                                  // the team's regular season
  rosterRank?: number;                                 // 1 = best roster in its league; absent when not known
  unitRank?: number;                                   // a coordinator's unit, 1 = best; absent otherwise
  playoffs?: { wins: number; champion: boolean };      // absent = missed the playoffs
}

/** ADR-080 P2: one job on a résumé. */
export interface StaffJob {
  level: CoachingLevel;
  role: StaffRole;
  team?: TeamId;                                       // a job in this league; absent for college
  employer: string;                                    // the team's or the college programme's name
  firstSeason: number;
  lastSeason?: number;                                 // absent while he holds it
  seasons: StaffJobSeason[];
  ended?: StaffDepartureReason | "PROMOTED";           // absent while he holds it
}

// StaffState gains:
/** ADR-080 P2: his résumé, oldest job first. */
career: StaffJob[];
/** ADR-080 P2: the last season he coached, once he has retired; absent while he is in the game. */
retiredAfter?: number;
```

`career` is required: nothing constructs a `StaffState` today (provenance row 4). `retiredAfter` is
needed because a coach out of work can retire, and his last job's ending ("fired") must not be
overwritten. For a coach not in a seat, `role` is his current or most recent role and `teamId` is
absent; `teamId` is set only for a seat holder or a president, matching `Team.staff`.

### P3 — why a coach left (`staff.ts`; `events.ts`)

```ts
/** ADR-080 P3. */
export type StaffDepartureReason = "FIRED" | "HIRED_AWAY" | "RETIRED" | "CONTRACT_EXPIRED";

// events.ts, tightened from free text (nothing emits or reads them):
| { type: "STAFF_HIRED"; payload: { staff: StaffId; team: TeamId; role: StaffRole } }
| { type: "STAFF_DEPARTED"; payload: { staff: StaffId; team: TeamId; reason: StaffDepartureReason } }
```

### P4 — the disguise habit (`staff.ts`; `players.ts`), ADR-075 §3.2's shape as ruled

```ts
/** ADR-075 §3.2, added by ADR-080 P4. Owner's units: share of passing snaps. Absent fields = league defaults. */
export interface DefensiveDisguiseTendency {
  readonly passSnapMaskShare: number;
  readonly lookWeights?: Readonly<Record<string, number>>;
  readonly lateShare?: number;
  readonly frontLookShare?: number;
}

// StaffState gains:
/** Read only in the DC seat. Absent = the league default. */
disguise?: DefensiveDisguiseTendency;
```

This is the tendency half of ADR-075 T2. Its other half (the player rating `disguise`, the
`teaching` description) stays with the ADR-075 build.

### D1 — the contracts spec (`docs/design/contracts.md`)

§4 gains the staff shapes (P1-P4), §6.2 the two staff events, §9 the `staff` and `staffContracts`
save fields (the doc never listed `staff`).

Contracts tests: a `StaffState` with a career and a disguise habit, a terminated contract and a save
with `staffContracts` round-trip through JSON unchanged; both staff events type-check with their
tightened payloads.

## 10. Build order

| step | what | proof |
|---|---|---|
| **C0** | this note; P1-P4 and D1 on the owner's typed yes | contracts tests; `pnpm verify` |
| **C1** | coach maker: seats, president, pool, ratings, personality, scheme, disguise habit; the 20 seasons of history | same seed, same league of coaches; the 50 anchor; DC mean exactly 31.5% at the first season; no team-season with two holders of one seat |
| **C2** | contracts and careers kept through each offseason; real-season summary | résumé lines match the season they came from; dead money counted to the right seasons |
| **C3** | firing and retirement | rules tested one by one (champion never fired, honeymoon, politics) |
| **C4** | hiring, poaching, trees, the candidate report, the `choose` hook | every seat filled every year; tree hires happen; a human pick replaces the computer's |
| **C5** | the turnover check (a `staff-check` command and a test that holds the bands) | the figures in §8 against the REPORTED rows; a short report for the owner |

One pull request (this thread has one branch), with the contracts edits in a commit of their own so
they can be read alone. Save and load (PR #19) writes `world.staff`; once both are on `main`,
`makeSave` / `readSave` carry the staff and contracts and check that every team's staff ids exist.

## 11. Impact

- `contracts`: P1-P4 and D1 above. New file `staff.ts`, exported from `index.ts`.
- `franchise`: a new `staff/` folder; `buildLeague` unchanged (staff are built by their own function).
  A new league's coaches take about 2 seconds to build.
- Save size: staff and staff contracts are about 1.4 MB of JSON after the 20-season history (about
  730 coaches, a third of them retired, and 930 contracts), and grow each season, since retired
  coaches and ended contracts stay for résumés and trees. Trimming them is a later save-format
  question.
- `apps/game`: may read staff, careers and contracts later; nothing now.
- `engine`, `playbook`, play-callers, `calibration`: **no change.**

## 12. Decision

Design: **ruled by the owner, 2026-10-22 14:35Z** (Q1-Q7 all (a), with the note on Q6 recorded in §2).

Contracts edits: **awaiting the owner's typed yes**, e.g. *"Yes, make contracts edits P1, P2, P3, P4
and D1."*
