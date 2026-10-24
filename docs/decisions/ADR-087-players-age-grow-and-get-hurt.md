# ADR-087: players age, grow and get hurt

- **Date:** 2026-10-23
- **Proposed by:** Orchestrator, for `franchise` (development, aging, injuries), with small parts in
  `attributes` (starting values) and `calibration` (the season runner hands each week's players to
  the game and reports who played)
- **Status:** design ruled by the owner (Q1-Q8, 2026-10-23 18:28Z; follow-ups F1-F3, 20:49Z).
  Contracts edits P1-P6, S1, C1, E1-E5 and D1 approved by the owner's typed yes (2026-10-24
  02:39Z). D1-D4 built and D5a measured 2026-10-24 (PR #35; §11); both switches off by default.
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

| # | Owner's answer (Q1-Q8 2026-10-23 18:28Z; F1-F3 20:49Z) | Where |
|---|---|---|
| Q1 | **(b) No ceiling.** "Many things affect how a player grows ... a hidden growth rate, performance, playing time, practice, coaching, and potentially storylines ... none of it ever hits any ceiling other than an attribute hitting 99." | §2. No hidden ceiling or potential; 99 is the only cap. Spec #11's "potential" term is dropped. |
| Q2 | **Ratings change every week**, with larger jumps over the offseason and training camp. A variable from age and experience lets young players improve faster. Injury is a lasting physical modifier depending on the injury (a broken hand doesn't slow a receiver; a torn ACL does). Age weighs more in the offseason because so much time passes. | §3 (weekly), §2.2 (learning rate), §4.1 (aging weighted to the offseason), §5.4 (lasting marks) |
| Q3 | (a) Playing time helps a little. | §2.3 |
| Q4 | (a) Coaches matter, small. | §2.3 |
| Q5 | **Injuries at any time**: in games (highest risk), in practice (second), and away from football in any week, offseason included. | §5. Game injuries are drawn at the final whistle until the engine can take a player off mid-game (§5.2). |
| Q6 | (a) A serious injury can leave a lasting mark. | §5.4 |
| Q7 | **(b) Retirement waits for player personality.** | §6. No general retirement rule; F2 below covers players nobody signs. |
| F1 | **No slope.** "Once a player starts climbing in age, their physical skills start to diminish. Also, young age and inexperience are two major aspects for a player's ratings going up ... once they head into the middle section of their career ... they won't continue to improve as fast ... These two effects help to create a natural curve." Most players don't last 20 years, and after 10 most struggle to keep a roster spot, let alone the game time it takes to improve. | §2.3: no slope; the natural curve comes from aging and the learning rate. The 20-year check (D5b) checks that the league does not drift upward. |
| F2 | **An unsigned player waits up to 2 seasons for a call, then retires; how long depends on his personality.** | §6.1 |
| F3 | **Starters follow the coach's personality**: some stick with incumbents even when a rookie behind them is improving, some lean to any veteran, some are cold and calculating and re-order every week by who looks best. The situation matters, for the owner's own coach as well: open competition for a spot hurts less when a player goes from starting to benched; a starter who returns from injury to find his backup has taken the job is hurt less than one suddenly demoted; a sudden mid-season demotion for no reason can strain the relationship. The same for the owner's team and computer teams. | §3.1. The relationship strain is ruled but waits until players hold views of their coach (ADR-084's later step with Spec #14); this build moves morale and records every change (E5) so the strain can be applied then. |
| Q8 | (a) Off by default until the owner has seen the checks. | §9, D5 |

## 2. Getting better and worse: no ceiling

### 2.1 What each player carries (all hidden)

- **Growth rate**: his own, fixed for life. How much he gets out of what he does. A high growth
  rate turns the same practice, snaps, coaching and workouts into bigger gains, and later slows his decline
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
| **Body** | speed, agility, jumping, strength | only his body: age, workouts, injury (§4, §5.4). So his ratings and his 40 always agree, as ADR-079 requires |
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
| **Morale** | an unhappy player develops a little slower | later: Spec #14 §3 makes morale a development-rate modifier; not in this build |
| **Wobble** | a small random step each week | from the season seed, so the same seed always gives the same careers |

**No slope near the top (F1).** Every point costs the same wherever a rating stands. What keeps the
league from climbing into the 90s is the natural curve the owner described: the learning rate is
high only while a player is young and new, falls through the middle of his career, and his body
declines with age; and few players keep a roster spot, let alone the snaps that drive growth, past
about ten seasons. The 20-year check (D5b) shows the spread of ratings year by year to confirm it.

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

Where these come from in the stand-in league file (PR #32, `packages/attributes/leagues/standin-2026-10-23.json`,
as of 7d4024c): age and listed weight in the bio; credited seasons in `provenance.creditedSeasons`;
combine drills in `provenance.measurements`, with drills he never ran filled by his position's
average and listed in `provenance.ratings[id].imputed` (those are aged as averages, not as his own
numbers); career snaps, games played over the last five seasons, reserve status and his latest
2026 injury in `provenance.history[playerId]`. Known gaps: snaps before 2012 are missing, so older
veterans' career snaps run low; "games missed" counts healthy scratches as missed, so durability
reads only the games missed while on an injury report or a reserve list; a player on a reserve list
starts out with a length drawn from the reserve type (IR, PUP, NFI, designated to return), and his
latest injury report sets the body part where it is recent enough not to have healed.

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
| Offseason: rookies and OTAs (4) | practice reps (skills, larger for rookies), coaching, practice injuries, workouts, away injuries |
| Offseason: summer (6) | light workouts, away injuries |
| Training camp (3) | the heaviest practice of the year: the biggest skill moves, coaching, most practice injuries, away injuries |
| Preseason (3) | practice and away injuries (practice only, since no preseason games are scheduled yet) |
| Regular season (18) and playoffs (5) | practice, playing time, performance, coaching; game, practice and away injuries |
| After his team's season ends (missed the playoffs, or knocked out) | as the early offseason: workouts and away injuries; no practice, snaps or coach |
| A free agent, all year | the same: workouts and away injuries only |

The season loop runs these weeks itself; the draft thread's draft day, undrafted signings and trim
to 53 happen inside the same loop at their dates, so no week ever runs twice.

### 3.1 Who starts: the coach's style and the situation (F3)

Each week every team sets its depth chart, a COACH-authority decision (Iron Rule 6). Each
coordinator ranks the players on his side by how good he thinks they are; the head coach decides,
leaning the way his personality leans. An improving rookie can win a job and a declining or injured
starter can lose one, but how quickly depends on the coach.

**His leanings.** Every head coach has three, set by his personality type with some variation of his
own (the type-to-leaning mapping is proposed, not ruled):

| Leaning | What it does | Strongest in (proposed) |
|---|---|---|
| **Sticks with the incumbent** | the starter keeps the job until someone is clearly better, not just a little, even while a rookie behind him improves | players' coach, quiet |
| **Leans to veterans** | any veteran (incumbent or newcomer, star or journeyman) gets the nod over a younger player of about the same level | demanding, quiet |
| **Plays who looks best** | cold and calculating: re-orders every week by who looks best right now | cerebral |

A fiery coach (proposed) has his own habit, read from his personality type rather than a fourth leaning: a quick hook, benching a starter after one bad game.

**Who looks best** is the coordinator's read: the player's recent form (his last four weeks' game
grades from the who-played report, P4, and his weekly practice grades, so a backup who seldom plays
is still seen; the practice grade is made by the depth-chart step itself, so it exists with
`--injuries` alone) and his ratings as the coordinator judges them. Until scouting
exists, that judgement is the true rating seen through a blur set by the coordinator's
`talentEvaluation`, the same blurry lens ADR-080 Q6 uses for hiring; perception replaces it later.
When the head coach starts a player over his coordinator's pick, ADR-084 §5.1's move "start a player
over his pick" applies to the coordinator's view of him.

**Open competition.** A spot is open when the coach says so: at camp, when his coordinator rates two
players there as close; at any time for a coach who plays who looks best, since on his team every
spot is open all season and his players know it (the owner: open competition "can be normal").
Incumbent-loving coaches rarely open a spot. A battle ends when the coach names a starter.

**The situation, and how the player takes it.** Each change is labelled by what the player himself
can see: his own recent form, his injury, and whether the spot was declared open. The coach's private
read does not set the label, so a coach who misjudges and benches a starter in good form has made a
sudden demotion, whatever he thought.

| Situation | Example | How much it hurts the player who loses the spot |
|---|---|---|
| **Open competition** | the two players in a declared battle swap weeks | little (ruled: less than a sudden demotion) |
| **Injury cover** | the starter is hurt and his backup moves up | none |
| **Starter returns** | the starter is healthy again and takes his job back from the backup | little, for the backup (proposed) |
| **Kept after injury** | the starter comes back and his backup, who played well, keeps the job | some (ruled: less than a sudden demotion) |
| **Benched for form** | a starter whose own form has dropped over recent weeks loses the job | moderate (proposed) |
| **Sudden demotion** | mid-season, no declared battle, a healthy starter whose own form has not dropped is benched | a lot, and it can strain his view of the coach (ruled) |

Also proposed: the player who gains a spot gets a small lift; the sizes are scaled by each player's
`volatility` rating (the registry's "rate morale moves in both directions").

**Feelings, now and later.** In this build each change moves the player's morale (`MORALE_CHANGED`,
already in contracts). That per-change hit is a placeholder: Spec #14's weekly need terms (playing
time, role clarity, positional competition, which is exactly the open-battle case) replace it when
player personality is built. The strain on his view of the coach is ruled (F3) but needs players to
hold views, which ADR-084 left for its later step with Spec #14; every change is recorded (E5) so that
system applies the strain when it exists.

**The owner's team.** He has no staff record and is not rated (Spec #11 §1; ADR-084 V1), so his
leanings come from his own personality: ADR-083's main trait, read the same way as a computer head
coach's type, with no personal variation. Until ADR-083 is built, his team uses even leanings (the
middle of all three). His coordinators' reads are blurred like everyone's. While the staff sets his
chart the decision is recorded as made by the computer for him; once he can set his own chart in the
game he decides, and the same labels and feelings follow from his choices.

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

No general retirement rule in this ADR. When player personality (Spec #14) is built, the choice to
retire will come from the player's needs, body and contract (`franchise-calendar.md`'s retirement
windows, spring-bonus pressure), through `PLAYER_RETIRED`. Spec #14 has no retirement section yet;
whoever designs personality writes it.

### 6.1 Players nobody signs (F2)

A player without a team (released, contract run out, or never signed) waits **up to two seasons**
for a call, then retires. How long he waits depends on his personality. He may decide at two moments
each year: when camps open (the calendar's late-retirement window) and when the regular season ends.
His patience is counted from the day he became unsigned (kept in the free-agent record, ADR-085; until that exists, in S1's step memory); he retires at the first of those moments
after it has run out, and in any case once two regular seasons that began after he became unsigned
have ended. He retires with `PLAYER_RETIRED`, reason `UNSIGNED` (E4).

Until player personality is built, every personality sheet is the flat placeholder (ADR-079 Q7), so
his patience is a hidden draw between none and two seasons, stored on his personality sheet (P6) and
replaced by his needs once Spec #14 says which of them set it. The draft and cap threads use the same
rule for their free-agent pool.

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

Four franchise steps read true ratings until perception exists: the development week, the injury
draws (true `durability`), the coordinators' read for the depth chart (§3.1, through their blur) and
the morale step (true `volatility`, §3.1). D1 names all four in the `TrueAttributes` reader comment. The unsigned-retirement check (§6.1) reads
only the personality sheet.

## 8. Contracts edits this needs (each needs the owner's typed yes)

| Id | Edit | Why |
|---|---|---|
| **P1** | `TrueAttributes.development?: { growth: number; snaps: number; carry: Partial<Record<string, number>>; body: { forty: number; cone: number; vertical: number; bench: number } }` (optional; absent = the player never changes, today's behaviour) | §2.1, §4. Prospects carry `growth` and `body` |
| **P2** | `PlayerBio.combine?: { forty?: number; cone?: number; vertical?: number; bench?: number }`, frozen at the draft | the public record (§7) |
| **P3** | `Injury` gains `setting: "GAME" \| "PRACTICE" \| "AWAY"`, `band: "DAY_TO_DAY" \| "SHORT" \| "LONG" \| "MAJOR"`, `since: CalendarStamp` | availability, reports, lasting marks |
| **P4** | `GameParticipation { player; team; snaps: { offense; defense; special }; contests: { attr; won; lost }[] }`, returned with each game | who played and how (§10) |
| **P5** | **an amendment to `contracts.md` §10**, which today keeps formulas out of contracts: the measurement scales (4.22/5.60 s, 6.50/8.10 s, 22/44 in, the strength formula) and the position profiles with their overall (which ratings each position leans on), as data with small readers beside `getAttr` | the generator, the draft's class maker and franchise (aging, depth-chart sort, the draft's trim) all need the same scales and overall; each domain may import only contracts, so it is one shared copy or several. These are ADR-079's ruled anchors, which rarely change; any change to them would come back to the owner as a contracts edit. The aging curves and injury table, which D5 tunes, stay in franchise |
| **S1** | `SaveFile.world.development?: { events: FranchiseEventEnvelope[]; depthMemory: unknown }` | every event the development, injury, depth-chart and retirement steps emitted (truth-layer and public) and the emergency signings' `CONTRACT_SIGNED`, plus the step memory: what §3.1 needs (open battles, who started before an injury, each starter's weeks in the job, the last four weeks' grades) and when each free agent became unsigned, so a loaded season carries on exactly (§10). `depthMemory` is franchise's own shape, typed `unknown` like the other open save slots |
| **E1** | `RATINGS_CHANGED { team?: TeamId; changes: { player; attr; from; to }[]; body?: { player; measure: "forty" \| "cone" \| "vertical" \| "bench" \| "weightLb"; from; to }[] }`, truth-layer: one per team per week, plus one for free agents; whole-point rating moves and body changes from practice, play, coaching, workouts and aging (injury marks are in E3, not here); the week is the envelope's `at` | every change on the event stream (Iron Rule 3); about 1,700 events a year (33 × 52) |
| **E2** | `INJURY_OCCURRED` gains `setting`, `band`, `game?: GameId`; public | when, where and how bad |
| **E3** | `INJURY_HEALED { player; lasting: { attr; from; to }[]; body?: { measure; from; to }[] }`, truth-layer | the one record of a lasting mark |
| **E4** | `PLAYER_RETIRED` gains `reason?: "UNSIGNED"`, and its `timing` gains `"SEASON_END"` (the camp-opening moment uses the existing `"LATE"`) | an unsigned player retiring (§6.1); later personality-driven retirements leave the reason out or add their own |
| **C1** | `StaffState.lineup?: { incumbent: number; veteran: number; form: number }` (0-100 each), drawn for computer head coaches from their personality type by `buildStaff` on its own random stream (existing coaches unchanged) | the coach's three leanings (§3.1). The owner's team reads ADR-083's main trait instead |
| **E5** | `DEPTH_CHART_CHANGED { team; position; up?: PlayerId; down?: PlayerId; situation: "OPEN_COMPETITION" \| "INJURY_COVER" \| "STARTER_RETURNS" \| "KEPT_AFTER_INJURY" \| "FORM" \| "SUDDEN" }`, `POSITION_BATTLE_DECLARED { team; position; players: PlayerId[] }` and `POSITION_BATTLE_ENDED { team; position; starter: PlayerId }`, public; each is a COACH-authority decision, `decidedBy` NPC unless the owner set it | why each change happened, for morale now and players' views of the coach later |
| **P6** | `PersonalitySheet.patience?: number` (0-2 seasons), the placeholder until Spec #14's needs set it | §6.1 |
| **D1** | `contracts.md` wording for the above; the `TrueAttributes` reader comment (§7's four franchise readers of truth); `contracts.md` §3 truth-layer note; the `contracts.md` §10 amendment (P5) | documents |

No change to `GameResult` or the engine's types.

## 9. Build plan

| Step | What | Moves sim output? |
|---|---|---|
| D1 | contracts P1-P6, S1, C1, E1-E5, D1, on the owner's typed yes naming each | no |
| D2 | the development week: a pure function in `franchise/src/players/` (players + week → changed players + events): learning rate, the inputs and groups of §2.3, aging with the offseason split, workouts. Generator draws the growth rate from its own random stream and fills the new fields only when development is switched on. Tests: same seed gives the same events; nothing past 99; an old player loses more over the offseason than over the season; a free agent and a rostered player of the same age age equally; every active rating is in exactly one group; the generated league is unchanged with the switch off | no (not called yet) |
| D3 | injuries: three settings, length bands, kinds, playing-hurt penalties, lasting marks (tests: a hand injury leaves the 40 alone, an ACL does not), emergency signings; rates measured from free data first, every number listed with its source | no (not called yet) |
| D4 | wire it in (§10); the weekly depth chart by each coach's style, with its labels and morale effects (§3.1), on whenever either switch is on, since either one changes who can play; unsigned players retiring (§6.1), on with either switch wherever there are free agents; switches `--development` and `--injuries`, both off by default | season runs only, and only when switched on |
| D5a | single-season checks, available after D4: a season's injuries by setting and position against real ones; how far players move in a season; the starter-vs-backup gap (Q3 says "a little"); ADR-079 R5's win spread re-measured in three arms (development alone, injuries alone, both). If the spread moves, a retuned team-strength setting applies only with the switches on, or lands with Q8's default flip | season runs only |
| D5b | the 20-year check, once the draft thread's year turnover (ADR-086) and the cap thread's cuts and free-agent pool (ADR-085) exist: whether the ratings spread stays like today's year after year (F1's natural curve; any drift is tuned through the learning rate, the aging curves and the playing-time share, never a slope, and reported to the owner), roster ages, peak ages and career lengths by position against the NFL, and how often unsigned players retire after one season or two. Run on the generated league until the stand-in importer exists. Then, on the owner's yes, both switches on by default (Q8) | season runs only |
| later | injuries during the game (engine, §5.2); preseason games; the weekly practice plan; storyline effects; morale slowing development; the strain a sudden demotion puts on a player's view of his coach (ruled F3, needs players' views); retirement with personality; head coach and position coaches; scheme fit and style match | engine held |

## 10. How it plugs in (for builders)

The draft thread built the shared season walk on PR #31 (`franchise/src/season/people.ts`, agreed
2026-10-23); this ADR plugs into it.

- **One loop.** `runSeason` takes `people` (`LeaguePeople`: teams, players, picks, classes,
  `freeAgents`, `staff?`) and `daySteps`. Steps run once for every calendar day the clock passes,
  games or not, after that day's games and before the clock moves on or the run stops. Development
  is a `DayStep` that acts on each week's last day; the depth chart and injury steps are DaySteps
  too. The year turn (age +1, credited seasons) is the draft thread's `runYears`. Nobody else calls
  the development week. With `--development` or `--injuries` on, the season command runs
  `through: "YEAR"`; with both off it stops where it does today.
- **Staff**: `people.staff`, built inside franchise from the season seed with its own `buildStaff`
  (calibration's permitted imports do not change).
- **Emergency signings** come from `people.freeAgents`. Before each game the season runner, which
  owns the lineup rules (`snapshot.ts`'s fallback chains), checks each team can be fielded; if not,
  the team signs the best fit from the free agents, recorded with `CONTRACT_SIGNED`. Until the cap
  thread's pool fills `freeAgents`, calibration seeds it at season start with players made by its
  permitted `generateLeagueRosters` from a reserve seed.
- **The resolver** receives the current `people` (its third argument), skips unavailable players,
  takes the playing-hurt penalties off that week's copies of their ratings, and returns
  `{ result, extras }` with the who-played report (P4) in `extras`; steps read it from `ctx.games`.
  Calibration's season runner builds the report from the match events (it may read the engine,
  ADR-012); franchise reads only the report and never parses engine-shaped play events (Iron Rule 1).
  P4 is needed for performance and for §3.1's form and labels, so it is part of D1.
- **Depth chart**: coordinators' reads use P5's position overall plus form; the draft's trim uses the
  same overall.
- **Randomness**: coach leanings are drawn once by `buildStaff` (C1) and patience once when a player is created (P6), each on its own stream; every weekly draw (development, injuries, practice grades) is forked from the
  season seed by week and player, so a resumed run draws exactly what a straight run would.
- **Saves.** With either switch on, a save stores `people` as they are that day (players, current
  depth charts, emergency signings), every event the steps and the emergency signings emitted, and the step memory (S1).
  `--load` uses those people instead of rebuilding from the seed; `stepsDoneThrough` stops a resumed
  run repeating a day; resuming re-emits those saved events up to the save day. The saved games'
  inputs are not needed again: each day's steps have run by the time a save is made. `readSave`'s
  check replays without the steps. The save-and-load check (stop at week 9, load, finish) must give a
  byte-identical season with both switches on.
- **Truth-layer events** are filtered out in the season command's event hook before the news desk,
  and the game viewer never loads them.

## 11. Build notes (D1-D4 built, D5a measured, 2026-10-24)

Built as §9 and §10 lay out, with these choices the design left to the build (CHOSEN unless marked):

- **Street free agents.** Until the cap thread's pool fills `freeAgents`, calibration's season runner
  starts each switched-on season with three made-up reserve squads (`FA1`-`FA3`, from the world seed's
  own `/free-agents` stream), less each position's best man wherever a backup stands behind him: 114
  players, specialists included (`reservePool`).
- **Emergency signings** happen on the last day of a week for teams with a game the next week (in the
  week before the playoff field is set, every team; never in the offseason), after that day's
  injuries. The side's coordinator picks by his blurred read (`readBlur`, the depth chart's read), not
  by true ratings (§7). One-year minimum; the 53-man limit is not enforced. The lineup check asks for
  a kicker or a punter by name before the snapshot would let one stand in for the other, so a hurt
  kicker brings in a kicker.
- **Practice-squad call-ups before street signings** (Orchestrator's ruling, 2026-10-24). A team
  short of a player calls up the best fit man on its own practice squad (`Team.practiceSquad`) first,
  as real teams do, by the same coordinator's read (one listed at the position first, then anyone,
  listed there from now on): he moves to the roster and that position's depth chart, a
  `CONTRACT_SIGNED` one-year minimum like the street signing (a called-up squad player signs a
  standard deal; no new event or field). Only when nobody on the squad is fit does the team sign off
  the street, with one exception (build choice, for the Orchestrator to confirm): for a kicker,
  punter or long snapper, a specialist off the street comes before a squad man of another trade
  (squad at the position, street at the position, squad anyone, street anyone), so a hurt kicker
  brings in a kicker while there is one to sign. Read literally, the ruling had 16 of spread-17's 20
  kicking signings (`--injuries`) go to men who were not specialists (a defensive tackle kicking)
  while the street's three kickers and three punters sat unsigned; with the exception it is 11 of
  20, all from week 7 on, once those six are signed (only 8 of the 32 squads carry a specialist). A
  bigger street, or letting the punter kick, would close that; neither is built. Why: the stand-in
  league makes about 90-100 emergency signings a season (the made-up league 49), the 114-man street
  ran dry, and `player-checks --league` crashed on seed spread-17 in the playoffs (T32 could not
  field a right guard). With a switch on, the stand-in loader gives each team its practice squad from
  the file (`provenance.practiceSquad`, the file's order; switched off, none, so those runs are
  unchanged); spread-17 with `--injuries` now plays through, with 115 call-ups and 6 street signings
  (those specialists). `player-checks`
  keeps a called-up man in his file group (practice squad) but counts him in the like-for-like
  injury tables from his call-up on, as it counts a street signing, and reports the call-ups among
  the emergency signings; like a street signing's, his injuries are filed under the position he held
  at camp. The loader refuses a squad entry that is not of status "practice" in the file, so the two
  agree. The generated league has no practice squads yet (cut-down day fills them, but the season
  runner does not run it), so it signs from the street byte for byte as before and its D5a numbers
  do not move. Where a contract book is kept, the call-up ends the man's live practice-squad deal
  with that team at the call-up day, reason `EXPIRED` (the draft thread's suggestion): no dead-money
  charge, since a squad deal has no bonus, and no event of its own, the `CONTRACT_SIGNED` tells it.
  His new minimum is then his one live deal: `liveContract` finds it, a later `release` ends it, and
  `teamCapTotal` counts one deal for him that season (an ended deal stops counting in the league
  year it ends, so the squad deal's pay is not counted at all, and the minimum counts in full, as
  every in-season signing does here). With no live squad deal for him with that team on the book,
  nothing more changes; street signings are unchanged. A truer reason, such as `PROMOTED`, would be
  an edit to `ContractEndReason`, which the cap thread owns, and needs the owner's typed yes; it is
  not done. Calibration keeps no book, and nothing that keeps one calls players up yet.
- **The who-played report** credits a snap to every player a play card names and to the offence's
  quarterback on every scrimmage play (a run card does not name him). Kicks credit the kicker or
  punter and the returner only: the engine has no coverage or return units yet.
- **The stand-in league** (ADR-088) runs with `--injuries` but refuses `--development` until its
  players get growth rates and bodies (§2.5); without them none of them would change. (Since
  "Stand-in records, step 1" below, it runs with both.)
- **The game injury rate** stays at its MEASURED per-snap value (`INJURY_RATES.game.perSnap`, fitted
  on franchise's model season with NFL snap counts). It is not refitted to the real sim's per-game
  total, for the reason below.
- **Saves.** `--load` reads the switches from the save and refuses them on the command line. As on
  main before this build, an `--out` file written after `--load` differs from a straight run's only
  in its `league` header's staff lists (a loaded save carries the staffed teams); the season, its
  events and its players match.

**Proofs.** `pnpm verify` passes. With both switches off, `season --seed homie-1 --out` and
`--stop-after 9 --save` are byte-identical to main (ba1f0e3). With both on, a week-9 save and load
carried to the end of the league year gives a save identical in every field to a straight run's,
every rating change and injury included.

### D5a: one season with the switches (`reports/player-checks.md`)

20 seasons per arm on ADR-079 R5's seeds, generated squads, caller v7 (the default). The `off` arm is
today's league: its 2.81 win spread is below R5's 3.02 because R5 was measured with an older caller.

| | Win spread | Best | Worst | 13+ wins | 4 or fewer | Better record wins |
|---|---|---|---|---|---|---|
| NFL 2021-24 | 3.05 | 13.8 | 2.8 | 10.0% | 14.0% | 74.0% |
| off | 2.81 | 14.5 | 2.6 | 6.4% | 8.8% | 71.3% |
| development | 2.93 | 14.7 | 2.5 | 10.3% | 8.1% | 71.7% |
| injuries | 2.78 | 14.4 | 3.3 | 8.6% | 7.2% | 70.9% |
| both | 2.62 | 14.3 | 3.3 | 7.0% | 5.3% | 69.3% |

- **Win spread.** Against `off` on the same seeds: development +0.12 (1.8 standard errors), injuries
  -0.03 (0.5), both -0.19 (2.6); the better record wins 2.0 points less often with both (3.0
  standard errors), and neither switch alone moves it beyond luck. So with both on the league is a
  little more even, further from the NFL. §9 lets the retuned team-strength setting apply either with
  the switches on or with Q8's default flip; the build takes the default flip, since D5b re-measures
  the spread over 20 years with the draft and the year turnover, which a single season cannot show.
- **Injuries against the NFL**, like for like (players on a team, begun between his team's games, per
  team interval, football injuries only): time-loss 1.83 a team-game against 2.02 (the real seasons
  ran 1.87-2.16; ours 1.70-1.96), with illness and accidents 1.91 against 2.09, day-to-day 0.73
  against 0.78. Lengths match (short / long / major 58.5% / 18.8% / 22.6% against 57.9% / 19.2% /
  22.9%), and so do players out 4+ games with an injury begun in the season (8.9 a team against 9.4).
  By position, quarterbacks (0.067 against 0.062) and linemen (0.344 against 0.341) match; linebackers
  (0.147 against 0.277), backs, tight ends and defensive backs are low, defensive linemen and
  receivers high. The mix follows the snaps the sim gives each group (16 games measured, snaps per
  team-game against the NFL's 2019-2024: QB 1.22×, RB 0.98×, WR 1.23×, TE 0.85×, OL 1.15×, DL 1.34×,
  LB 0.64×, DB 1.01×, K/P 1.22×; all 1.05×): it plays about 75 downs a team against the NFL's about
  63 and has no kick-coverage or return units, and its defence fields more linemen and fewer
  linebackers. Weighted for special teams, the exposure comes out about equal, so per snap the sim
  hurts about 10% fewer players than the measured rate. The likeliest reason is age: the generated
  squads (ADR-079) average 24.2 years, with 33.5% aged 21-22 and 2.4% aged 31 or more, against the
  real 2026 rosters' 26.3, 6.8% and 10.4% (the stand-in league file), and older players get hurt
  more. So the per-snap rate is left as measured. The made-up league's youth also inflates the
  league-wide rise below; D5b should run on the stand-in league, with real ages, once its players
  have growth records (§2.5). Players out 4+ weeks by any onset come to 10.5 a team against 15.5: the
  sim has no preseason games (about half of the 6.2 new injuries a real team has at week 1) and starts
  every league healthy (no carry-over from a previous season, 1.7, or the non-football list, 0.4).
- **How far players move in a year** (position overall, start of camp to the end of the league year,
  development arm, starters / backups): 21-22 +3.4 / +2.7; 23-24 +2.1 / +1.7; 25-26 +1.2 / +1.0;
  27-28 +0.7 / +0.5; 29-30 +0.1 / -0.1; 31-32 -0.9 / -1.1; 33+ -1.7 / -2.0. Injuries alone move
  ratings by a few hundredths (lasting marks).
- **Starters and backups.** The gap (11.3 points at camp) widens a little over the year with growth
  alone (+0.35) and hardly with both (+0.08), since hurt starters' backups play and grow. Q3's "a
  little" holds. Over one year the whole league rises (starters +1.9, backups +1.6) because nobody
  leaves, no rookies arrive and the made-up league is young; D5b checks the steady state.
- **Depth charts and the street.** With injuries on, about 49 emergency signings a season (1.5 a
  team), 27 injury covers and 25 starter returns per team-season, about 4 position battles per team,
  and 16-28 unsigned players retiring a season from the street pool.

**Left for D5 tuning** (from the build's reviews): away-from-football injuries are 11.2% of a year's
time-loss; the recent-return risk factor also counts day-to-day knocks; `SKILL_FADE` is the same for
every position; weight keeps its fraction; a team on a playoff bye keeps the previous week's
starters; the coordinators' views of players (ADR-084's later step) are not built.

### Stand-in records, step 1 (2026-10-24)

§2.5 for the stand-in league, first step, on the Orchestrator's rulings. Built in attributes'
importer (`importer/real/development.ts`): `pnpm --filter @ff/attributes standin-development` writes
the records into the league file from the file alone (no raw data, no name table), taking off any
earlier ones first, so a second run changes nothing; `import-real` calls the same step. The file's
new top-level `startingDevelopment` key records the version, seed, as-of date, every constant used,
the teams whose latest injury report had no game statuses, and per player how growth was set and
where a copied injury came from (ADR-088 Q5's guess flags). A test fails with "re-run
standin-development" when the code's constants move.

- **Body**: the four drills he was rated from (his drill, else his position's average, else the
  fallback; the one fill in `rate.ts`), so his 40 and his speed agree for all 2,528. Not aged forward
  from when he tested: that waits for §4's curves to be tuned (D5b), and goes in one place, the fill
  (`fillMeasurements`), before both the ratings and the body read it, so they keep agreeing (§2.3);
  since it moves ratings it comes with a re-rate (`import-real`), not in `standin-development` alone.
  Players who never tested keep their position's average, not one set by size and age.
- **Growth** is drawn (`drawGrowth`, the made-up league's lognormal), and **patience** too
  (`drawPatience`), each on `createRng("standin", "attributes:real:development").fork(<id>)`, split
  "growth" / "patience" / "injury": no season in the seed, so growth stays fixed for life. Step 2
  estimates growth from playing time.
- **Career snaps**: offence + defence + special teams from `provenance.history`. They include every
  2026 game played by the snapshot (`snapsThrough`: at most 7 a team; 24 teams had played 6, 6 had
  played 5 and 2 had played 7), which a run then plays again; nothing reads the total yet.
  **Combine record**: only the drills he ran (1,340 players). **Durability**: unchanged (step 2).
- **Today's injuries** (327): injured reserve 227, designated to return 52, PUP 21, non-football 5,
  and active players Out 20 and Doubtful 2 on their team's latest report. Left out: Questionable
  players (23 active; they would play hurt, and the report gives no penalty), the other lists (R40/R49,
  3), the practice squad. Weeks are CHOSEN placeholders, drawn flat: injured reserve 11-15, designated
  to return 1-4, PUP and non-football 1-8, Out or Doubtful 1-3. The kind is `real:<body part>`, or
  `real:reserve-<list>` without one, so no lasting mark or repeat rule fires on it; non-football is
  AWAY, the rest GAME. `since` is the first day of the previous league year's summer: franchise's
  healing skips the week an injury is stamped in, so this way a w-week injury keeps him out of exactly
  the run's first w weeks (calibration's `standInDevelopment.test.ts`; a camp week 1 stamp would cost
  a week more). The snapshot was a Friday: 25 of 32 teams' latest report has no game statuses yet, so
  the 22 Out or Doubtful come from 7 teams (recorded in the file).
- **What the copied injuries do**: little in a game. The 305 on reserve lists are not on the 53
  (the loader leaves `Team.reserve` out), and the 22 actives heal within camp. They change camp and
  preseason practice, growth and the depth chart. His injury history beyond today's is not copied
  (franchise's injury memory starts empty).
- **Calibration**: the stand-in loader reads each record only with its switch: development off drops
  the growth record, patience and combine record; injuries off drops the copied injury. So both off,
  the league is the old file's to the byte, and `--injuries` alone grows nobody, as before. A file
  whose records are of a version the loader does not know (`startingDevelopment.version`) is refused,
  so a later step's new record cannot reach a switched-off run unnoticed. With
  development on, a file without records is refused ("no growth records; run standin-development"),
  and the old refusal is gone. A switched-on stand-in run plays the file's season, 2026 (its ages and
  injuries are that season's, and one season has no year turn); a different `--season` is refused.
  Switched off, the season is the default, 2027, as before. With development on and injuries off,
  reserve players practise and grow.
- **Checks**: `player-checks -- --league <file>` plays every arm in 2026 on the stand-ins, keeps
  its seasons under a fingerprint that includes the file's sha256, and writes
  `reports/player-checks-standin.md`: players counted by roster group (the 53, practice squad,
  reserve lists, street), the players who started hurt (copied, so no INJURY_OCCURRED), and the
  growth rates' scale on the 53 at camp. Its injury tables count the 53 and the street, the people
  the generated league's count (it has no practice squad or reserve lists; the stand-ins' practise
  with their teams and get hurt, about 13% of all injuries in a one-seed smoke run); their injuries
  are in the roster-group table alone. Its starters are who the engine fields from each real depth
  chart (11 personnel, base and nickel defences, the specialists: 26 a team), since the generated
  league's starters-per-position table never starts an inside linebacker (`ILB`), which 25 of the 32
  real charts list. The generated league's report is unchanged.

**Proofs.** Taking the new keys off the rewritten file and writing it the same way gives back the
file before, byte for byte (sha256 3a9ae152…d3d3). With both switches off, `season --seed homie-1
--league <file> --out` is byte-identical on the old file with main's code (e23bf69), the old file
with this code and the new file with this code, and so is `--stop-after 9 --out` on the old and new
files. Rated from the same inputs, `rateStandIns` gives the same bytes before and after the fill
moved out of it. Rendered from D5a's cached seasons, the generated league's `player-checks` report is
the committed one but for its code fingerprint. The tests pin the two "as before" claims by sha256
(the stripped file's bytes in attributes; the players a switched-off run reads in calibration), check
that the step changes nothing on any player but its four records, and play a switched-on stand-in
run twice to the same events.

#### One season on the stand-ins (`reports/player-checks-standin.md`)

20 seasons per arm on the same seeds, every arm in 2026, code and file fingerprinted `19e18924e0ef`
(735c08b; the later contract-book change, 5e34b8f, does not reach calibration, which keeps no book).

| | Win spread | Best | Worst | 13+ wins | 4 or fewer | Better record wins |
|---|---|---|---|---|---|---|
| NFL 2021-24 | 3.05 | 13.8 | 2.8 | 10.0% | 14.0% | 74.0% |
| off | 2.79 | 14.7 | 3.3 | 9.4% | 6.6% | 70.7% |
| development | 2.82 | 13.9 | 2.5 | 7.5% | 7.8% | 70.5% |
| injuries | 2.49 | 13.8 | 3.1 | 5.5% | 5.0% | 68.5% |
| both | 2.51 | 13.7 | 3.6 | 5.9% | 4.8% | 68.2% |

- **Win spread.** Against `off` on the same seeds: development +0.04 (0.5 standard errors), injuries
  -0.30 (3.7), both -0.28 (2.9); the better record wins 2.2 and 2.5 points less often (3.6 and 3.1).
  Unlike the generated league (injuries -0.03), on the stand-ins injuries alone even the league out:
  across the 32 teams, wins with injuries regress on wins without them with slope 0.64 (a strong team
  loses about 0.4 of a win per win above average). Starter age does not explain it (correlation with
  the change -0.11). Not yet understood; a candidate, unverified: on real rosters a team's quality sits
  in its starters more than in its depth, so losing starters costs strong teams more. It goes to the
  team-strength retune with D5b, which for the stand-ins cannot be a hidden boost (ADR-088 Q8).
- **Injuries against the NFL**, like for like: time-loss 1.88 a team-game against 2.02 (generated
  league 1.83), any cause 1.97 against 2.09, day-to-day 0.76 against 0.78; lengths 57.7% / 19.2% /
  23.0% against 57.9% / 19.2% / 22.9%; out 4+ games begun in season 9.5 a team against 9.4. By
  group (NFL in brackets): QB 0.079 (0.062), RB 0.141 (0.174), WR 0.275 (0.256), TE 0.102 (0.124),
  OL 0.348 (0.341), DL 0.262 (0.260), LB 0.208 (0.277), DB 0.429 (0.494), K/P 0.035 (0.028). The
  older league adds 0.05 a team-game, as the age reading above expected; the per-snap rate stays as
  measured. Out 4+ by any onset is 11.1 against 15.5 (no preseason games; the reserve lists' players
  start hurt off the 53).
- **How far players move** (development arm, starters / backups): 21-22 +2.9 / +2.5; 23-24 +2.1 /
  +1.9; 25-26 +1.3 / +1.2; 27-28 +0.8 / +0.6; 29-30 +0.2 / 0.0; 31-32 -0.8 / -0.9; 33+ -1.8 / -1.9:
  close to the generated league's, a little smaller at 21-22. Growth on the 53 at camp: median
  0.989, sd of ln(growth) 0.255.
- **Starters and backups.** The 26 fielded starters average 69.8 at camp and the rest of the 53
  63.4, a 6.4-point gap that narrows to 6.0 (development) and 5.9 (both). The league rises less in a
  year than the generated one (starters +0.8, backups +1.2, against +1.9 and +1.6): real rosters are
  older.
- **Depth.** With injuries on, about 91 emergency signings a season, 85 of them practice-squad
  call-ups and about 6 street specialists; 24-26 unsigned street players retire a season; about 3.5
  position battles, 24.5 injury covers and 23 starter returns per team.

## Conjoined mechanisms

Development and injuries are separate mechanisms that both change who plays and how well. Each has
its own switch, and D5a prices them alone and together (three arms) before either becomes the
default. Inside development, aging and growth are priced together, since one without the other is
not a football year. The weekly depth chart by coach style (§3.1) only matters once players change,
so it is priced inside each arm, with a check that a league of incumbent-loving coaches and one of
form-chasing coaches differ in who starts but not in how the league's ratings spread.

## Implied scope (unruled, not built here)

- Injured reserve, real replacement signings, practice squad, and what an injured player costs
  under the cap (ADR-085).
- Perception: what each team believes about a player's development and lasting injury costs.
- News stories about breakouts, declines and injuries (through perception for ratings; injuries are
  public).
- The owner's weekly practice plan as a decision (Spec #5, "practice allocation"), and setting his
  own depth chart in the game (the same situations and feelings apply, §3.1).
- Players holding views of their coach in general (ADR-084's later step with Spec #14). The strain a
  sudden demotion causes is not unruled: F3 ruled it, and it is built with that step, reading E5.
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
