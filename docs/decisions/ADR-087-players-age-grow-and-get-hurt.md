# ADR-087: players age, grow and get hurt

- **Date:** 2026-10-23
- **Proposed by:** Orchestrator, for `franchise` (development, aging, injuries), with small parts in
  `attributes` (starting values) and `calibration` (the season runner hands each week's players to
  the game and reports who played)
- **Status:** design ruled by the owner (Q1-Q8, 2026-10-23 18:28Z); follow-ups F1-F3 open.
  Nothing is built. The contracts edits in §8 each wait on the owner's typed yes.
- **Works with:** "Player draft" (ADR-086: the year turnover, rookies), "Salary cap and contracts"
  (ADR-085: cuts, free agents, injured reserve, replacements; real-player stand-ins), ADR-079
  (absolute ratings, physical ratings pinned to measurements), ADR-080 (coaches), ADR-075 (players'
  `disguise` growth, T7), ADR-078 (calendar), Spec #11 `coaching-staff.md` §4.4 (this ADR builds its
  `DevelopmentTick`), Spec #14 `player-personality.md` (retirement, later), `perception.md`.

> Phase note: Charter §5 places franchise at Phase 4. The owner chose on 2026-10-23 to design this
> now, alongside the ADR-073 tuning, on the same condition as the other parallel threads: nothing
> here touches engine, playbook, play-caller or calibration test-league code, or moves a measured
> number while it is switched off. Taking a player out *during* a game needs the engine and is
> held (§5.2).

## Problem

Today a player is the same player forever. His ratings are minted once (ADR-079) and never move;
he never improves, never declines, never gets hurt. A franchise game needs a 22-year-old corner
who becomes a star, a 31-year-old running back who loses a step, a starter who misses six weeks
and the backup who plays well in his place.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| `PlayerBio.age`, `PlayerBio.weightLb`, `PlayerCondition.injury` (`kind`, `weeksRemaining`, `playable`, `inGamePenalty`), `INJURY_OCCURRED`, `PLAYER_RETIRED`, `CONTRACT_SIGNED`, `PERCEPTION_UPDATED` exist | `packages/contracts/src/players.ts`, `events.ts`, read 2026-10-23 | COMPUTED (read) |
| No package reads `condition.injury`, `condition.stamina` or `inGamePenalty` today | `grep` over `packages/*/src`, 2026-10-23 | COMPUTED (read) |
| `setAttr` rounds every rating to a whole number | `packages/contracts/src/registry.ts` | COMPUTED (read) |
| The registry has 56 active ratings: 15 physical, 29 skill, 11 mental (including `volatility` and `discipline`), 1 knowledge | `registry.ts` | COMPUTED (read) |
| `TrueAttributes` is documented as read only by engine, attributes and calibration | `players.ts` | COMPUTED (read) |
| `contracts.md` §10 lists "any modifier table, target number, or formula" as deliberately absent from contracts | `docs/design/contracts.md` §10 | COMPUTED (read) |
| The generator keeps each player's measurements in `FictionalProvenance.measurements` (typed `unknown` in contracts); it draws each player's numbers from one random stream in a fixed order (measurements, age, ratings, name, draft slot) | `packages/attributes/src/fictional/generate.ts` | COMPUTED (read) |
| Speed, agility and jumping map from one measurement each (speed: 4.22 s = 99, 5.60 s = 0 on a straight line, about 0.72 points per hundredth); strength from bench and weight; acceleration and mobility blend speed and agility plus a per-player offset that is not stored; firstStep, pursuit, power, anchor, armStrength, kickPower and puntPower are drawn like skills | `derive.ts`, `profiles.ts` | COMPUTED (read) |
| Depth charts are ordered once, at generation, by attributes' `overallAt`; nothing re-sorts them. The lineup builder throws `RosterUnavailableError` when it cannot fill a spot; kicker, punter and returner share one pool, so losing the only K or the only P alone stops the game | `generate.ts`, `calibration/src/league/snapshot.ts` | COMPUTED (read) |
| The calendar year is 52 weeks: camp 3, preseason 3, regular season 18, playoffs 5, offseason 23 (4+5+4+4+6); the offseason lengths are placeholders. No preseason games are scheduled | `franchise/src/calendar/clock.ts`, `LeagueRules.weeksPerSeason`, `buildSchedule` | COMPUTED (read) |
| `runSeason` walks day by day to the end of `OFF_SUMMER` only with `through: "YEAR"`; the season command passes no `through`, so it stops at the start of the offseason | `runSeason.ts`, `calibration/src/season/realSeason.ts` | COMPUTED (read) |
| `GameResolver` returns only a `GameResult`; the resolver is built once before the season from fixed squads; season runs build no coaching staff (`makeSave` writes `staff: []`); the season command hands every event to the news desk | `runSeason.ts`, `realSeason.ts`, `main.ts`, franchise save code | COMPUTED (read) |
| Saves store players, but `--load` rebuilds squads from the world seed; resuming replays saved results without calling the resolver; `SaveFile` has no place for events | ADR-079 "Save and load", `realSeason.ts`, `runSeason.ts`, `contracts/src/save.ts` | COMPUTED (read) |
| Spec #11 designs a weekly/offseason `DevelopmentTick`; ADR-075 T7 grows players' `disguise` through it, driven by the defensive coordinator's `teaching` (ADR-075 Q4), in windows spring ~1/4, camp ~1/2, season ~1/4, with no growth in a week a player does not practise (Q7) | `coaching-staff.md` §4.4, ADR-075 | COMPUTED (read) |
| Spec #14 has no retirement section yet | `docs/design/player-personality.md` | COMPUTED (read) |
| Peak ages differ by position (running backs earliest, quarterbacks and kickers latest) | public aging-curve studies of NFL production | REPORTED (approximate; checked in D5b against nflverse snap counts by age) |
| Most NFL injuries happen in games, practice is second, injuries away from football are rare | NFL Injury Surveillance summaries, public | REPORTED (approximate; D3 measures what free data allows) |
| A torn ACL or Achilles commonly costs speed or burst after return, more for older players; a broken hand usually does not; ACL and Achilles returns take about 9-12 months | sports-medicine return-to-play literature, public | REPORTED (approximate; sizes CHOSEN in D3's table) |
| Most NFL careers end without an announced retirement: the player is not signed again | common reporting on NFL careers | REPORTED (approximate; not measured here) |
| Every number in this note's examples and splits (weekly step sizes, the 75/25 aging split, how much a coach adds, how much an ACL costs) | chosen for illustration | CHOSEN — provenance NONE; tuned in D5 |

## 1. The rulings

| # | Owner's answer (2026-10-23 18:28Z) | Where |
|---|---|---|
| Q1 | **(b) No ceiling.** "Many things affect how a player grows ... a hidden growth rate, performance, playing time, practice, coaching, and potentially storylines ... none of it ever hits any ceiling other than an attribute hitting 99." | §2. No hidden ceiling or potential; 99 is the only cap. Spec #11's "potential" term is dropped. |
| Q2 | **Ratings change every week**, with larger jumps over the offseason and training camp. A variable from age and experience lets young players improve faster. Injury is a lasting physical modifier depending on the injury (a broken hand doesn't slow a receiver; a torn ACL does). Age weighs more in the offseason because so much time passes. | §3 (weekly), §2.2 (learning rate), §4.1 (aging weighted to the offseason), §5.4 (lasting marks) |
| Q3 | (a) Playing time helps a little. | §2.3 |
| Q4 | (a) Coaches matter, small. | §2.3 |
| Q5 | **Injuries at any time**: in games (highest risk), in practice (second), and away from football in any week, offseason included. | §5. Game injuries are drawn at the final whistle until the engine can take a player off mid-game (§5.2). |
| Q6 | (a) A serious injury can leave a lasting mark. | §5.4 |
| Q7 | **(b) Retirement waits for player personality.** | §6. No retirement rule. F2 asks how players leave meanwhile. |
| Q8 | (a) Off by default until the owner has seen the checks. | §9, D5 |

## 2. Getting better and worse: no ceiling

### 2.1 What each player carries (all hidden)

- **Growth rate**: his own, fixed for life. How much he gets out of what he does. A high growth
  rate turns the same practice, snaps and coaching into bigger gains, and later slows his decline
  because he keeps adding while his body loses.
- **Experience**: *career snaps* (hidden, they feed his smarts). His credited seasons in the league
  are public and live on his bio (ADR-085 K5, `PlayerBio.creditedSeasons`, which the cap and draft
  threads use for minimum salaries and waivers); development reads them from there.
- **Unshown progress**: ratings are whole numbers, but a week's change is a fraction of a point.
  The fraction is kept per rating and the rating moves when it adds up to a whole point, so small
  weekly steps are never rounded away.
- **His body now**: 40, 3-cone, vertical, bench. His weight is the public listed weight on his bio,
  which changes as he trains.

There is no ceiling. A rating climbs as long as what he does keeps pushing it up, and stops at 99.

### 2.2 Learning rate: age and seasons

Each week's gains are scaled by a learning rate built from age and credited seasons. It is
highest for a young player in his first seasons (a rookie learns fastest), falls through the
mid-20s, and is low but never zero for a veteran.

### 2.3 What moves each rating

Every rating belongs to one group (all 56 active ratings, plus `disguise` when ADR-075 adds it):

| Group | Ratings | What moves them |
|---|---|---|
| **Body** | speed, agility, jumping, strength | only his body: age, workouts, injury (§4). So his ratings and his 40 always agree, as ADR-079 requires |
| **Body plus practice** | acceleration, mobility, firstStep, pursuit (follow speed and agility), power, anchor (follow strength) | the change in his body, plus a smaller share of the practice, play and coaching gains below |
| **Own curve** | armStrength, kickPower, puntPower, stamina, durability | grow a little while young (workouts, practice); hold late (arm into the late 30s, kicking leg into the 40s); stamina fades in the 30s; durability falls with age and repeat injuries (§5.4) |
| **Skills** (29) | accuracy, route running, coverage, blocking, catching, tackling and the rest; `disguise` when it exists | the inputs below; fade slowly in the 30s as learning slows and the body declines |
| **Smarts** | awareness, reaction, decision making, pocket patience, poise, play recognition, instincts, vision, patience, football IQ | the inputs below plus career snaps directly: they keep rising slowly into the 30s, which keeps the clever old safety on the field after his speed has gone |
| **Not moved yet** | volatility, discipline | they are personality; they wait for Spec #14 |

The inputs, each week:

| Input | Example | Notes |
|---|---|---|
| **Practice** | the default week of reps; heaviest in camp and OTAs | a player who doesn't practise (injured) gets no practice gain that week; a limited one gets part. Later the owner's weekly practice plan (install vs reps vs rest) becomes the knob: more reps, more growth and more practice injuries |
| **Playing time** (Q3) | a starter gains a little more than a backup | from the game's report of who played (§10) |
| **Performance** | a corner who wins his matchups gains a little more in coverage; one beaten repeatedly gains less and can slip | from the same report |
| **Coaching** (Q4) | the best staff against the worst is worth about one rating point a year on a young player | the coordinator on his side of the ball, through his `development` skill (special teams coordinator for K, P, LS). For `disguise`, the defensive coordinator's `teaching`, in ADR-075's windows (spring ~1/4, camp ~1/2, season ~1/4), as the owner ruled there |
| **Storylines** | a mentor taking a rookie under his wing; a player distracted by a contract fight | later, through a channel the story side can write to (its own petition) |
| **Wobble** | a small random step each week | from the season seed, so the same seed always gives the same careers |

**Gains get harder near the top (F1, proposed).** Going from 60 to 65 is easier than from 85 to 90:
each point gained shrinks a little as a rating climbs. It is a slope, not a wall: nothing stops a
player short of 99, and one who keeps playing well and practising keeps climbing. Without it, a
league whose players mostly improve would drift upward year after year, and ADR-079's rule that
"a 90 is among the league's best" would stop holding. The owner ruled out a ceiling, so this is
asked separately (F1); the 20-year check shows the league with and without it.

### 2.4 Spec #11's development tick

This is Spec #11 §4.4's `DevelopmentTick`. Kept: the coordinator's effect, age, snap experience.
Dropped by Q1: potential. Deferred: the head coach's effect, position coaches (ADR-080 left them
out), scheme fit and Spec #11 §5's style match, each plugging into the coaching input later.
ADR-075 T7 (players' `disguise` growth) plugs into this same week as a skill, as above.

### 2.5 Starting values

**Real-player stand-ins** (the owner's cap-thread ruling: copy the real current NFL in every way
except name and likeness), from free data only:
- *copied*: age, credited seasons, career snaps, listed weight, current injuries, injury history (which sets
  `durability`);
- *estimated*: his body today (his combine or pro-day numbers aged forward from when he tested, by
  §4's curves; for a player who never tested, a typical body for his position, size and age,
  refined by public tracking speeds where they exist); his growth rate (from how his playing time
  and production rose year to year for his age; a rookie or second-year player with no record
  gets a draw typical for his age and draft slot).
Because §4's curves set every veteran's starting speed, they are tuned in D5 before stand-ins are
built.

**Made-up players** (the generator and the draft thread's prospects): growth rate drawn; career
snaps 0 for rookies, from age for generated veterans; body from the measurements the generator
already draws.

## 3. Every week, all year

Every player has a development week once a calendar week, 52 a year, in order. Aging always follows
the calendar (§4.1), the same for everyone. What else the week holds depends on the time of year
and on whether he is with a team that is still playing:

| When | What the week holds besides aging |
|---|---|
| Offseason: evaluation, free agency, draft (13 weeks) | workouts (strength, weight, and small body gains while young), away-from-football injuries |
| Offseason: rookies and OTAs (4) | practice reps (skills, larger for rookies), practice injuries, workouts, away injuries |
| Offseason: summer (6) | light workouts, away injuries |
| Training camp (3) | the heaviest practice of the year: the biggest skill moves, most practice injuries, away injuries |
| Preseason (3) | practice and away injuries (practice only, since no preseason games are scheduled yet) |
| Regular season (18) and playoffs (5) | practice, playing time, performance, coaching; game, practice and away injuries |
| After his team's season ends (missed the playoffs, or knocked out) | as the early offseason: workouts and away injuries; no practice, snaps or coach |
| A free agent, all year | the same: workouts and away injuries only |

The season loop runs these weeks itself; the draft thread's draft day, undrafted signings and trim
to 53 happen inside the same loop at their dates, so no week ever runs twice.

**Depth charts.** Every team's staff re-sorts its depth chart at the end of camp and each week after,
so an improving rookie can win the job and a declining or injured starter loses it. Until scouting
(perception) exists, coaches would sort by the players' true ratings, which the perception spec
otherwise forbids (F3). The owner's own team is sorted the same way until he can set his own chart
in the game.

## 4. Aging

### 4.1 More of it in the offseason

Each position has a yearly aging amount (how much the body loses at each age past its peak). About
**three quarters of it lands in the 23 offseason weeks** and a quarter is spread thinly over camp,
preseason, season and playoffs (CHOSEN, tuned in D5). It follows the calendar for everyone: a free
agent and a champion of the same age lose the same amount in a year. Each phase's share is divided
by that phase's length, so changing the calendar's placeholder week counts does not change how much
a player ages in a year.

### 4.2 The body ages through its measurements

ADR-079 pins physical ratings to measurements. Aging moves the measurements, and the ratings follow
by the change, so each player's own quirks from generation (acceleration and mobility carry one)
survive.

Example: a running back runs a 4.45 at 24 (speed 82). Past his position's peak his 40 slows, mostly
over each offseason: 4.47 at 28 (81), 4.51 at 29 (78), 4.57 at 30 (74).

Workouts can still add a little at any age, but the gain shrinks as he gets older. Before his
position's peak it can take a few hundredths off his 40 or add to his vertical; past the peak it is
smaller than what age takes away, so speed, agility, jumping and strength mostly fall. Nothing caps
them except 99; it is the body getting older.

Each position gets a peak age and decline speed, checked in D5b against real careers. A high growth
rate offsets part of the decline (§2.1); the body still ages.

## 5. Injuries, at any time

### 5.1 Three settings

| Setting | When | Risk |
|---|---|---|
| **Game** | every game (regular season and playoffs; preseason once preseason games exist) | highest; depends on snaps, position, `durability`, age, and a recent return from injury |
| **Practice** | every week with practice: OTAs, camp, preseason, in season | second; heaviest in camp; depends on position, `durability`, age, the week's workload |
| **Away from football** | every one of the 52 weeks, for every player, free agents too | rare |

Rates and lengths by position come from free real data where it exists (nflverse weekly injury
reports, including practice participation; published NFL injury summaries for the game/practice
split). D3 lists every number with its source or marks it CHOSEN.

### 5.2 Game injuries: at the final whistle for now

The owner ruled games the highest risk, and game injuries are in from the start. Taking a player off
*during* a game (he limps off in the second quarter, the backup finishes) needs the match engine to
stop using him partway, an engine change that would move measured numbers. So until the engine
work and the pocket fix (backlog 100) are done, a game's injuries are drawn at the final whistle
from who played and how much, at the same rates, and count from the next game. When the engine can
do it, the draw moves inside the game and replaces this; season totals should barely change.

### 5.3 How long, playing hurt, and next man up

Length bands, in weeks lost:
- **day to day** (0): he plays, slightly worse;
- **short** (1-3);
- **long** (4-8; injured reserve once the cap thread adds it);
- **major** (9 or more). An ACL or Achilles takes about 9-12 months: one torn in February can still
  keep him out in November; one torn in June costs the whole season.

Injuries are public, as on real NFL injury reports: who is hurt, how, and for about how long. What
an injury will cost him for good (§5.4) is hidden.

*Playing hurt*: each kind of injury lowers the ratings that body part uses while it heals (an ankle
lowers speed and agility, a hand lowers catching). He plays that week with those ratings lowered;
the game itself is unchanged.

*Next man up*: the injured player comes off the depth chart until healed. Before every game the team
checks it can field every spot. If it cannot (all three quarterbacks hurt, or the kicker or the
punter out), it signs an emergency stand-in that week, so the season never stops. Injured reserve,
real replacement signings and their money belong to the cap thread (ADR-085), which replaces this
stopgap.

### 5.4 Lasting marks (Q6, and Q2's "depends on the injury")

Each kind of injury carries its own lasting effect, applied when he returns:

| Kind (examples) | Lasting effect |
|---|---|
| Broken hand, sprained ankle, most muscle strains | none: he comes back as he was |
| Torn ACL | 40 and 3-cone a little slower for good, vertical a little lower |
| Torn Achilles | larger: acceleration and firstStep lower, 40 slower, vertical lower |
| Repeated injuries of the same kind | `durability` lower |

The same tear costs an older player more (older bodies come back slower), and it adds to the loss
he is already taking from age: a 29-year-old back who tears his ACL ends up much slower than a
23-year-old with the same injury. Sizes are CHOSEN in D3 from the return-to-play literature and
tuned in D5.

## 6. Retirement: waits for personality (Q7)

No retirement rule in this ADR. When player personality (Spec #14) is built, the choice to retire
will come from the player's needs, body and contract (`franchise-calendar.md`'s retirement windows,
spring-bonus pressure), through `PLAYER_RETIRED`. Spec #14 has no retirement section yet; whoever
designs personality writes it.

**F2 (open): how do players leave the league meanwhile?** Without retirement, nobody under contract
ever leaves: a 38-year-old starter plays on until he is cut, and every player without a team stays
in the free-agent pool, which grows by a few hundred a year (each spring's rookies push about as
many veterans off rosters). Two options:
- **(a) Nobody leaves until personality arrives.** Exactly as ruled in Q7. The pool grows; the
  20-year check leaves out career lengths, since careers never end.
- **(b) A placeholder exit, honestly a stand-in retirement:** a player without a team (released,
  contract run out, or never signed) who is still without one when the first regular season that
  starts after that ends, leaves the league, with an event saying so (E4). This is how most real
  careers end, and it keeps the pool and the 20-year check meaningful. Personality-driven
  retirement replaces it later. The draft thread uses the same wording.

Recommendation: (b), because the long-run checks mean little without it; but it is the kind of
simple rule Q7 set aside, so it is the owner's call.

## 7. Hidden information

Growth rate, unshown progress, today's body and an injury's lasting cost are hidden truth, kept in
`TrueAttributes` (P1), not in the public bio. The bio keeps a frozen public combine record (P2),
since real combine numbers are public; it never changes after the draft. Listed weight and
injuries are public, as in the NFL.

The rating-change events (E1, E3) carry true values and are **truth-layer events**: kept for
calibration, saves and franchise's own checks, filtered out before the news desk and never shown in
the UI or read by computer teams' decisions. Fans, the news and other teams learn of changes only
through perception (`PERCEPTION_UPDATED`) once it is built; until then the news writes no
"breakout" or "lost a step" stories.

Three franchise steps read true ratings until perception exists: the development week, the injury
draws (true `durability`), and the depth-chart sort (F3). D1 names all three in the `TrueAttributes`
reader comment.

**F3 (open): may coaches sort depth charts by true ratings until scouting exists?**
- **(a) Yes, as a stated stopgap**, replaced by each staff's own (blurred) view when perception is
  built. Recommended: without it, injuries and development cannot change who starts.
- (b) No: depth charts stay as generated; injured starters are skipped, but a rookie never wins a
  job until perception exists.

## 8. Contracts edits this needs (each needs the owner's typed yes)

| Id | Edit | Why |
|---|---|---|
| **P1** | `TrueAttributes.development?: { growth: number; snaps: number; carry: Partial<Record<string, number>>; body: { forty: number; cone: number; vertical: number; bench: number } }` (optional; absent = the player never changes, today's behaviour) | §2.1, §4. Prospects carry `growth` and `body` |
| **P2** | `PlayerBio.combine?: { forty?: number; cone?: number; vertical?: number; bench?: number }`, frozen at the draft | the public record (§7) |
| **P3** | `Injury` gains `setting: "GAME" \| "PRACTICE" \| "AWAY"`, `band: "DAY_TO_DAY" \| "SHORT" \| "LONG" \| "MAJOR"`, `since: CalendarStamp` | availability, reports, lasting marks |
| **P4** | `GameParticipation { player; team; snaps: { offense; defense; special }; contests: { attr; won; lost }[] }`, returned with each game | who played and how (§10) |
| **P5** | **an amendment to `contracts.md` §10**, which today keeps formulas out of contracts: the measurement scales (4.22/5.60 s, 6.50/8.10 s, 22/44 in, the strength formula) and the position profiles with their overall (which ratings each position leans on), as data with small readers beside `getAttr` | the generator, the draft's class maker and franchise (aging, depth-chart sort, the draft's trim) all need the same scales and overall; each domain may import only contracts, so it is one shared copy or several. These are ADR-079's ruled anchors, which rarely change; any change to them would come back to the owner as a contracts edit. The aging curves and injury table, which D5 tunes, stay in franchise |
| **S1** | `SaveFile.world.development?: { events: FranchiseEventEnvelope[] }` | the saved truth-layer events (E1, E3, emergency signings), so a loaded season carries on exactly (§10) |
| **E1** | `RATINGS_CHANGED { team?: TeamId; changes: { player; attr; from; to }[]; body?: { player; measure: "forty" \| "cone" \| "vertical" \| "bench" \| "weightLb"; from; to }[] }`, truth-layer: one per team per week, plus one for free agents; whole-point rating moves and body changes from practice, play, coaching, workouts and aging (injury marks are in E3, not here); the week is the envelope's `at` | every change on the event stream (Iron Rule 3); about 1,700 events a year (33 × 52) |
| **E2** | `INJURY_OCCURRED` gains `setting`, `band`, `game?: GameId`; public | when, where and how bad |
| **E3** | `INJURY_HEALED { player; lasting: { attr; from; to }[]; body?: { measure; from; to }[] }`, truth-layer | the one record of a lasting mark |
| **E4** | `PLAYER_LEFT_LEAGUE { player; reason: "UNSIGNED" }`, public, only if F2 is (b) | a player leaving football is a game fact |
| **D1** | `contracts.md` wording for the above; the `TrueAttributes` reader comment (§7's three franchise readers); `contracts.md` §3 truth-layer note; the `contracts.md` §10 amendment (P5) | documents |

No change to `GameResult` or the engine's types.

## 9. Build plan

| Step | What | Moves sim output? |
|---|---|---|
| D1 | contracts P1-P5, S1, E1-E3 (E4 if F2 is b), D1, on the owner's typed yes naming each | no |
| D2 | the development week: a pure function in `franchise/src/players/` (players + week → changed players + events): learning rate, the inputs and groups of §2.3, aging with the offseason split, workouts, the top-end slope (if F1 yes). Generator draws the growth rate from its own random stream and fills the new fields only when development is switched on. Tests: same seed gives the same events; nothing past 99; an old player loses more over the offseason than over the season; a free agent and a rostered player of the same age age equally; every active rating is in exactly one group; the generated league is unchanged with the switch off | no (not called yet) |
| D3 | injuries: three settings, length bands, kinds, playing-hurt penalties, lasting marks (tests: a hand injury leaves the 40 alone, an ACL does not), emergency signings; rates measured from free data first, every number listed with its source | no (not called yet) |
| D4 | wire it in (§10); switches `--development` and `--injuries`, both off by default | season runs only, and only when switched on |
| D5a | single-season checks, available after D4: a season's injuries by setting and position against real ones; how far players move in a season; the starter-vs-backup gap (Q3 says "a little"); ADR-079 R5's win spread re-measured in three arms (development alone, injuries alone, both). If the spread moves, a retuned team-strength setting applies only with the switches on, or lands with Q8's default flip | season runs only |
| D5b | the 20-year check, once the draft thread's year turnover (ADR-086) and the cap thread's cuts and free-agent pool (ADR-085) exist, and F2 is ruled: ratings spread stays like today's (with and without F1's slope), roster ages and peak ages by position against the NFL, career lengths only if F2 is (b). Run on the generated league until the stand-in importer exists. Then, on the owner's yes, both switches on by default (Q8) | season runs only |
| later | injuries during the game (engine, §5.2); preseason games; the weekly practice plan; storyline effects; retirement with personality; head coach and position coaches; scheme fit and style match | engine held |

## 10. How it plugs in (for builders)

- **One loop.** `runSeason` (franchise) runs the development week inside its walk of the calendar,
  once per week, on the week's last day after that day's games and before any stop or save. The
  draft thread's year turnover hooks its steps into the same walk and never calls the development
  week itself (agreed 2026-10-23). With `--development` or `--injuries` on, the season command runs
  `through: "YEAR"`; with both off it stops where it does today.
- **New inputs to `runSeason`**: the players; the coaching staff, built inside franchise from the
  season seed with its own `buildStaff` (calibration's permitted imports do not change); a reserve
  pool of unattached players for emergency signings, which calibration makes at season start with
  its permitted `generateLeagueRosters` from a reserve seed, until ADR-085's free-agent pool replaces
  it; and a `canField(team, available)` check from the season runner, which owns the lineup rules
  (`snapshot.ts`'s fallback chains), so the emergency signing fires whenever a lineup cannot be
  fielded. Signings are recorded with `CONTRACT_SIGNED`.
- **The resolver** is given the players as they are that week, who is available, and the
  playing-hurt penalties already taken off their ratings; it returns the `GameParticipation` report
  (P4) with the result. Calibration's season runner builds the report from the match events (it may
  read the engine, ADR-012); franchise reads only the report and never parses engine-shaped play
  events (Iron Rule 1). If P4 waits, version 1 counts playing time from the depth chart and leaves
  performance out.
- **Depth-chart sort** uses P5's position overall; the draft's trim uses the same.
- **Randomness**: every week's development and injury draws are forked from the season seed by week
  and player, so a resumed run draws exactly what a straight run would.
- **Saves.** With either switch on, a save stores the players and teams as they are that day
  (current depth charts and any emergency signings) and the season's truth-layer events (S1);
  `--load` uses those players instead of rebuilding from the seed; resuming re-emits the saved
  events up to the save day and runs development from the next week. The saved games' inputs are
  not needed again: each week's development has already run by the time a save is made. `readSave`'s
  check replays without development. The save-and-load check (stop at week 9, load, finish) must give
  a byte-identical season with both switches on.
- **Truth-layer events** are filtered out in the season command's event hook before the news desk,
  and the game viewer never loads them.

## Conjoined mechanisms

Development and injuries are separate mechanisms that both change who plays and how well. Each has
its own switch, and D5a prices them alone and together (three arms) before either becomes the
default. Inside development, aging and growth are priced together, since one without the other is
not a football year.

## Implied scope (unruled, not built here)

- Injured reserve, real replacement signings, practice squad, and what an injured player costs
  under the cap (ADR-085).
- Perception: what each team believes about a player's development and lasting injury costs.
- News stories about breakouts, declines and injuries (through perception for ratings; injuries are
  public).
- The owner's weekly practice plan as a decision (Spec #5, "practice allocation"), and his own depth
  chart.
- Preseason games (season shell).
- Storylines nudging growth (narrative petition).
- In-game injuries (engine, after the pocket fix).
- Retirement in Spec #14.
- Coaches' own growth (Spec #11), which this ADR does not cover.

## Inertness proof

Claim: **while `--development` and `--injuries` are off, this ADR changes nothing the sim produces
and no output file.** The design note changes no file in `packages/` or `apps/`. As built, every new
field is optional and absent means "never changes"; the generator fills the new fields only when
development is switched on, and its new draw uses its own random stream (tested: the league and its
files are identical with the switch off); the season command stops where it does today and passes
the same players to the same resolver. Engine, playbook, play-callers and calibration's test leagues
and arms are not touched, so ADR-073's measurements cannot move. With the switches on, season
results do change, which is the point; D5a measures by how much before the owner decides on the
default.
