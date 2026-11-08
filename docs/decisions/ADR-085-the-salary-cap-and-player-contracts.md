# ADR-085: the salary cap and player contracts, copied from the real NFL

- **Date:** 2026-10-23
- **Proposed by:** Orchestrator, for `franchise` (thread "Salary cap and contracts",
  plan `/mnt/project-files/design/salary-cap-plan.md`)
- **Status:** design ruled by the owner (Q1-Q10, 2026-10-23). Contracts edits K1-K7 **approved** by the owner's
  typed yes (2026-10-23 20:52Z, "Yes, make contracts edits K1, K2, K3, K4, K5, K6 and K7"). The
  real-player stand-ins are built in their own thread (owner's card, 2026-10-23).

## Problem

Contracts already has the shapes of a player contract (`PlayerContract`, `ContractYear`), a team's
cap (`CapState`) and a league cap (`LeagueRules.salaryCap`), but nothing creates, prices or enforces
any of them. Every team shows $0 committed. Without money there is no reason to let a good player go,
so the offseason (draft, free agency, the end-of-season meeting) has nothing to decide.

## Provenance of factual claims

| Claim | Source | Kind |
|---|---|---|
| `PlayerContract`, `ContractYear`, `CapState`, `LeagueRules.salaryCap` (300M), `franchiseTagEnabled`, save `world.contracts` exist; nothing constructs them; `CONTRACT_SIGNED`, `CONTRACT_RESTRUCTURED`, `PLAYER_RELEASED`, `TAG_APPLIED` exist, nothing emits them | `packages/contracts/src/players.ts`, `save.ts`, `events.ts`; `grep` of `packages/` | COMPUTED (read 2026-10-23) |
| 2026 NFL cap $301.2M; 2025 $279.2M; league told teams to expect $301.2-305.7M | NFL.com "NFL salary cap" (nfl.com/news/nfl-salary-cap), ESPN story 48055711 | REPORTED |
| Cap history 2011-2025 used in §5 (120.0, 120.6, 123.0, 133.0, 143.28, 155.27, 167.0, 177.2, 188.2, 198.2, 182.5 (2021, pandemic), 208.2, 224.8, 255.4, 279.2) | author's recollection of public reporting | REPORTED (unverified; check against OverTheCap before use) |
| Free contract data: nflverse `historical_contracts.parquet` (from OverTheCap), 53,348 contracts, 2,542 marked active, newest signed in 2026, 99.4% of active rows carry a `gsis_id`, all 32 teams present | downloaded 2026-10-23 from github.com/nflverse/nflverse-data release `contracts` | COMPUTED |
| Each contract carries year by year: base salary, prorated bonus, roster bonus, workout bonus, option bonus, per-game roster bonus, guaranteed salary, cap number, cash paid | same file, `season_history` field | COMPUTED |
| Summed 2026 cap numbers of active contracts per team run from $93M (Dolphins) to $289M (Patriots); this leaves out dead money from players already cut | same file | COMPUTED. Dead money must be derived separately (§3) |
| The CBA rules in §4 (proration max 5 years, top 51, rookie scale, minimums by credited season, tag prices, June 1 split, RFA/ERFA, LTBE/NLTBE incentives, void years) | the 2020 CBA as publicly summarised | REPORTED (each number to be checked against the CBA text when built) |
| Coaches' salaries do not count against the player cap | public reporting on the CBA | REPORTED |
| Growth model constants in §5 | chosen here | CHOSEN, provenance NONE |

## Rulings (owner, 2026-10-23)

- **Q1 (b): full NFL money rules from the start**: salary, signing bonus spread over up to five
  years, guarantees, dead money, restructures, void years, roster/workout/option bonuses, likely and
  unlikely incentives, the top-51 rule, post-June-1 cuts.
- **Q2: start at the real current cap ($301.2M for 2026)** and predict each later year with a model
  that reflects current expectations and the real-world things that move the cap; the yearly cap is
  a natural topic for the owners' meeting.
- **Q3: real contracts on stand-in players.** "We want to copy the real players in every way except
  for name and likeness." Each made-up player stands in for a real one and carries his real contract.
- **Q4 (a)**: real rookie scale by draft slot, four years, fifth-year option on first-rounders,
  undrafted players on three-year minimum deals.
- **Q5 (b): the full personality-driven negotiation now** (player-personality.md §4), even though
  players' needs are placeholders today; it gets richer when real personalities arrive.
- **Q6 (a)**: franchise tag (and transition tag) as in the NFL.
- **Q7 (a)**: hard cap; computer-run teams get under it themselves; a human who misses the deadline
  has the cap manager do it.
- **Q8 (a)**: minimum salaries mirror the real NFL (by credited seasons), plus practice-squad pay.
- **Q9 (a)**: coaches' pay stays off the player cap, mirroring the real NFL as closely as possible
  except for name and likeness. (Real coaches as stand-ins is new work, outside this ADR.)
- **Q10 yes**: the season runner may call the cap functions by name (Charter §4 rule 1, the ADR-078
  R1 surface grows; exact names listed when the step is built).

## 1. What changes from the first plan

Q3 changes the shape of the work. The first plan priced made-up players by rating. Now the money
comes from the real league: real contracts, year by year, on the stand-in who replaces each real
player. Two consequences:

1. **Real data enters in one place only** (Iron Rule 7): the importer in `packages/attributes`. It
   reads the contract file, swaps each real player for his stand-in's `PlayerId`, and hands out
   `PlayerContract`s. Nothing downstream ever sees a real name. `franchise` never reads the file.
2. **The roster must be the real roster too**: the stand-in for a real Chiefs quarterback has to be on
   the stand-in Chiefs, at his real age, from his real draft slot. That is the "real importer" that
   ADR-079 Q6 put off until later ("made-up players now"). This ADR needs it now. See §3.

## 2. The money rules (franchise, `src/cap/`)

All of these are pure functions over contracts, tested one by one:

- **Cap number for a season** = base salary + prorated bonuses + roster and workout bonuses earned or
  scheduled + likely-to-be-earned incentives (LTBE). Unlikely incentives (NLTBE) that get earned land
  on next year's cap.
- **Proration**: a signing (or option, or restructure) bonus spreads evenly over the remaining
  contract years, at most five, void years included.
- **Top 51**: from the new league year until the first game, only a team's 51 biggest cap numbers
  count, plus all dead money.
- **Cutting or trading a player**: every proration not yet counted lands now as dead money, plus
  guaranteed salary still owed. **Post-June-1** (or one of two pre-June designations): this year's
  share stays this year, the rest moves to next year.
- **Void years**: when the contract voids, their prorations land as dead money.
- **Restructure**: base salary turned into signing bonus, spread over the remaining years.
- **Rookie scale**: four-year deals priced by draft slot; first-rounders get a fifth-year option with
  the CBA's tiered price; undrafted players sign three-year minimum deals.
- **Minimums** by credited seasons (a season counts when the player was on the roster or injured
  reserve long enough; the CBA's rule), practice-squad pay.
- **Tags**: franchise (exclusive and non-exclusive) and transition, priced from the top salaries at
  the position over five years as a share of the cap, at least 120% of the player's last salary.
- **Restricted free agents** (three credited seasons) and **exclusive-rights free agents** (under
  three): tenders at the CBA levels; another team's offer sheet can be matched or answered with picks.

## 3. The stand-in league (open: who builds it)

To copy real players "in every way except name and likeness", the importer needs per player: team,
position, age, height, weight, draft slot, credited seasons and contract. The contract file has all
of it (it also carries college, which the stand-in may keep or not). Known gaps:

- **Dead money** from players already cut is not in the active rows; the importer derives it from
  inactive contracts of 2025-2026 or the season starts without it (the Dolphins would then look
  $100M+ richer than they are).
- **Who is on each 53** (and the practice squad) comes from nflverse's weekly roster file, not the
  contract file.
- **Ratings** for stand-ins: still made up (ADR-079) until the real ratings pipeline exists, but the
  Charter (§3 source E) already names draft slot and contract as priors, so a $50M quarterback should
  not come out rated 55.
- **Licensing**: nflverse publishes the file; it originates at OverTheCap. Fine for development; check
  its terms before anything ships.
- **When the game starts**: the season the data describes (2026), contracts as of the download date.

That is the attributes domain's work, and the Player draft and Aging threads lean on it too. **Ask:**
build it in its own thread, or here. Until it exists, the money rules are tested on hand-written
contracts and the made-up league gets placeholder contracts, so nothing waits.

## 4. The year and the market (franchise)

The calendar (franchise-calendar.md §4-§6) already places every date. This ADR fills them:

- **League year starts**: contracts end, the new cap is set, every team must be under it by the
  deadline. Computer teams pick from: cut (pre or post June 1), restructure, let a player walk.
- **Tag window**, **re-signing**, **RFA tenders**, **free agency** as a market (premium window, value
  window, bargain basement; calendar §6): each free agent has an asking price from his position's
  market and comparable deals; offers are judged by need satisfaction (player-personality.md §4).
  Signings reset the market for the rest.
- **The draft** (ADR-086) calls the rookie scale when a pick signs. The year-turnover step there calls
  this ADR's contract-expiry step.
- **Injured reserve, street signings and the practice squad** are moves this ADR adds; injured reserve
  reads `condition.injury.weeksRemaining` (ADR-087) and the public injury band. Not in the first
  build. Until then ADR-087's stopgap (an emergency stand-in from a reserve pool, no money) fills a
  team that cannot field a lineup; the free-agent pool replaces it.

## 5. How the cap grows each year

The real cap is the players' share (about 48-48.8%) of the league's counted revenue, divided by 32,
plus adjustments. The model predicts revenue, not the cap directly:

- **National media money**: the current TV deals run through 2033 with a league opt-out after the 2029
  season; the model carries a scheduled step up at each renewal, sized with seeded uncertainty.
- **Other revenue** (tickets, sponsorship, international games, streaming, betting partners): seeded
  growth each year near the recent trend.
- **Shocks**: rare seeded events. A pandemic-style drop (2021 fell from $198.2M to $182.5M), a
  recession year, a labour fight when the CBA ends (after the 2030 season), which can move the
  players' share itself.
- **What teams see**: like the real league, a projected range is published months ahead and the
  official number is announced at the start of the league year. The owners' meeting is where the
  forecast is discussed (and the shocks argued over); computer GMs plan around the projected range,
  and the GM's cap-management skill (ADR-081) decides how well they read it.
- **Check**: run 2011-2026 from 2011 with the model and compare to the real history; the model's
  yearly growth should look like the real spread (mostly +5-14%, one drop).

## 6. Proposal: the contracts edits (each needs a typed yes)

All additive; `CONTRACTS_SCHEMA_VERSION` unchanged.

- **K1 — `ContractYear` gains the real pieces**: `rosterBonus`, `workoutBonus`, `optionBonusProration`,
  `perGameRosterBonus`, `incentives { likely, unlikely }`, `guaranteedSalary` (an amount; the existing
  `guarantees` flags stay), `voidYear` (true for a year that only exists to spread a bonus).
- **K2 — `PlayerContract` gains** `kind` (`ROOKIE` | `VETERAN` | `EXTENSION` | `MINIMUM` |
  `FRANCHISE_TAG` | `TRANSITION_TAG` | `RFA_TENDER` | `ERFA_TENDER` | `PRACTICE_SQUAD`),
  `signingBonus`, `fifthYearOption?` (`{ season, price, exercised? }`), and `ended?`
  (`{ at, reason: "RELEASED" | "TRADED" | "EXPIRED" | "VOIDED" | "RETIRED", postJune1? }`).
- **K3 — dead money is a list**: `DeadMoneyCharge { team, player, season, amount, reason }`; save
  `world.deadMoney?: DeadMoneyCharge[]`. `CapState.deadMoney` stays the sum.
- **K4 — the cap by season**: save `world.capHistory?: { season, cap, projectedLow?, projectedHigh? }[]`;
  `LeagueRules.salaryCap` stays the current season's number.
- **K5 — credited seasons**: `PlayerBio.creditedSeasons?: number` (drives minimums, RFA/ERFA, the
  veteran salary benefit). Public, not hidden. Raised by one at the year turn when the player had 3+
  games on full pay status (the CBA rule). Shared with ADR-087: development reads it from the bio
  (agreed with that thread 2026-10-23; ADR-087 P1 no longer carries its own season count).
- **K6 — fuller events**: `CONTRACT_SIGNED` payload gains optional `kind`, `years`, `value`,
  `guaranteed`; new `CONTRACT_EXPIRED { player, team }`, `CAP_SET { season, cap }`,
  `OPTION_EXERCISED { player, team, season }`.
- **K7 — the contracts spec** (`docs/design/contracts.md` §4, §6.2, §9) documents K1-K6.

The rookie scale, minimums and tag formulas are CBA data and live in `franchise`, not contracts.

## 7. Build order

1. K1-K7 (on the typed yes), then the money rules (§2) with tests on hand-written contracts.
2. The cap growth model (§5) and its 2011-2026 check.
3. The league year and cap compliance; placeholder contracts on the made-up league.
4. Tags, re-signing, RFA, free agency as a market with the personality-driven negotiation.
5. Rookie scale wired to the draft (ADR-086).
6. Real contracts on stand-ins, once the importer (§3) exists.
7. Many seasons in a row, checked against real numbers (cap share by position, dead money, how many
   free agents move, how many teams are tight).

None of it touches engine, playbook or play-caller code.

## 8. Build log

### Step 1 — the money rules (`packages/franchise/src/cap/`), 2026-10-23

- `money.ts`: cap number, proration (at most five years), league years (a February cut counts in
  the new league year and saves its roster bonus), release before / after June 1 and the designation,
  injury-only guarantees, expiry and void years, restructures (with added void years and a salary
  floor), a team's cap total with the top-51 rule.
- `signings.ts`: minimums by credited seasons, practice-squad pay, the rookie scale, tags, RFA
  tenders, `earnsCreditedSeason` (called by the draft thread's year turn).
- Real numbers it reproduces (tests): the 2026 minimums 885k / 1.005M / 1.075M / 1.145M / 1.215M /
  1.3M (COMPUTED from the contract file: the most common 2026 base by years since the draft), the
  practice squad's $247,500 / $330,300 / $411,300, all eleven 2026 tag prices, the 2026 RFA tenders,
  and the 2026 rookie total for every one of the 257 picks (COMPUTED, `rookieScale2026.ts`).
- Simplifications, each named in the code: a player cut in season costs his whole season's cap
  number; top picks' rookie raises (the 25% rule) are folded into the signing bonus, so totals and
  guarantees match but the yearly split differs; tags use the 2026 price grown with the cap until
  the league has five seasons of its own; the veteran salary benefit and earned unlikely incentives
  wait for the league year step.

### Step 2 — the cap growth model (`capGrowth.ts`), 2026-10-23

2,000 simulated leagues, 2027-2041, against the real 2012-2026 history (COMPUTED):

| | Real 2012-2026 | Model |
|---|---|---|
| Mean yearly growth | 6.46% | 6.48% |
| Spread (sd) | 5.13% | 4.35% |
| Years the cap fell | 1 in 15 (6.7%) | 4.5% |

The 2036 cap: median $582M, 10th-90th percentile $518M-$650M. Each season also carries the range
announced before it and the drivers that moved it (trend, TV money, labour talks, shock, rebound), for
the owners' meeting and the news. The real 2011-2024 history is REPORTED from memory and still needs
checking against OverTheCap.

### Steps 3-4 — the league year and the market (`leagueYear.ts`, `value.ts`, `negotiation.ts`), 2026-10-24

Day steps in the season's walk, beside the draft's (ADR-086 §2):

| Day | What happens |
|---|---|
| OFF_EVAL week 2 day 1 | `CAP_SET` for next season, from the league's forecast (`capForecast(seed)`) |
| OFF_EVAL week 3 day 1 | Each team grades its expiring players (its evaluator's error, as the draft board). Those who make its roster: under 3 credited seasons get an exclusive-rights tender; at 3, a restricted tender at the highest level his value reaches; 4+, an extension offer at his market price, which he takes only if it is worth his ask to him (see below). The best player who said no is franchise-tagged if he is in the top 15% and it fits. Room keeps back the coming draft class's first-year cost (from the picks held) plus its in-season cushion ($3M; $5M to $10M by leaning from step 10) |
| OFF_RESET_FA week 1 day 1 | The new league year: deals run out (`CONTRACT_EXPIRED`; void years land as dead money); those players leave for free agency. Every team gets under the cap (top 51): restructure the biggest base salaries first, then cut whoever saves most per point of value |
| OFF_RESET_FA week 1 days 2, 3, 5 | Premium window: asks at 110% of value |
| First day of each later week, to cut-down day | Value window (100%) through OFF_RESET_FA, then the bargain basement (85%, falling 3% a week) |
| OFF_DRAFT week 4 day 1 | Compliance check after the draft (top 51) |
| The day after cut-down day | Compliance with every deal counting; a team short of its 53 fills up with the best free agents on one-year minimum deals |

**Prices** come from the league's own contracts (`value.ts`): a player's price is the deal at the same
place in his tag group's market as his grade holds among the players on those deals, less an age
discount from 30 (34 for quarterbacks and specialists). Term follows his place in the market and his
age; structure (the signing bonus's share and the share guaranteed at signing) follows the deal's pay and
length, as in real deals (step 14). With the stand-in league the market is the real one.

**Offers are judged by need** (Q5 b, `negotiation.ts`): worth = money ÷ ask, moved up to 25% by
winning, playing time, loyalty and guarantees, by his need weights (age-reweighted per
player-personality.md §2). A player with money as his only need ignores the rest. Each market day
every team with room and seats makes its best offer (need × value), up to three rounds; each player
takes the offer worth most to him if it reaches his ask.

Tested on a 32-team made-up league over a full year (`test/cap.leagueYear.test.ts`): extensions,
tenders and tags are signed; 566 deals run out; every team ends the offseason under the 2027 cap;
the same seed gives the same year. Not yet: RFA offer sheets, trades, earned unlikely incentives, the
veteran salary benefit, in-season street signings and injured reserve, compensatory-pick moves.


### Step 5 — the league year in `runSeason`, and moves kept for compensatory picks, 2026-10-31

- `runSeason` takes `leagueYear?: LeagueYearConfig`, as the draft thread's PR #36 did for `draft`. Steps run in this order: the caller's, the players' (ADR-087), the league year's, then the draft's (ADR-086). Calibration needs no new surface names: `runSeason` is already on the R1 list (Q10).
- The market appends each signing with a new team to `people.freeAgentMoves` (ADR-086 §5) when the player's deal ran out (`ended.reason` EXPIRED) rather than being released, and the signing comes before the post-draft day (`countsForComp`; the real cutoff is a date in early May, just after the draft). The draft's compensatory step reads these moves the next year.
- Tests: the moves are checked (expired deal, new team, signed before the cutoff). `runSeason` with both options plays two years, keeps every team under the cap, and awards compensatory picks in year two.
- Next: `--seasons N` in the calibration season command with the stand-in league, once the aging thread's realSeason/main edits are on main, then the multi-season check against real numbers.

### Step 6: the multi-season check (`cap-check`), 2026-10-31

- `pnpm --filter @ff/calibration cap-check -- --league <stand-in file> [--seasons 5] [--out <file>]` plays the stand-in league for several seasons. The league year and the draft run in each season's walk. Results are in `packages/calibration/reports/cap-check.md`.
- Calibration's franchise surface gains `capForecast` and `teamCapTotal` (ADR-078 R1 amendment 3), under the owner's Q10 yes.
- Rule added: **carryover**. Unused room at the end of a league year carries into the next (`LeaguePeople.capCarryover`, `adjustedCap`). Saves do not hold it yet; that needs a contracts petition.
- Fixes found by the run:
  - Cap cuts keep each roster's starters.
  - Empty positions are filled on the day after cut-down.
  - At the new league year teams clear room for their class, the in-season buffer and $15M for free agency, by restructures and cap casualties (`MARKET.freeAgencyRoom`, `casualtyShare`, `casualtySaving`, all CHOSEN).
  - Rookie room is held until the draft.
- Open, against real numbers:
  - Too few own-team deals (no early extensions yet).
  - Free agency moves about a third to a half of the real number of $2M+ deals.
  - Dead money is a third to a half of the real figure.
  - The position mix drifts.
  - Offseason rosters exceed 90.

### Step 7: early extensions (owner's pick, 2026-10-31)

- On re-signing day, a team extends a player whose deal has one year left. The conditions:
  - He grades at or above the 40th percentile of his position's market (`MARKET.extendPercentile`).
  - His price is still at least 90% of his peak in the new deal's first year (`extendAgeFactor`).
  - A drafted player must have finished his third season (`rookieExtensionSeasons`, the real CBA rule).
  - He must accept at a fair price, and the deal must fit the team's room for that year.
- The new deal starts when the old one ends.
- Re-signings of expiring players now ask the fair (VALUE) price, where before they asked the PREMIUM one.
- Five-year check: own-team deals of two years or more average 84 a year (55 before; the real number is 210 to 290). The limit is now cap room: teams end each year at about 99% of the cap. Details are in `packages/calibration/reports/cap-check.md`.

### Step 8: cap trouble tools (owner's pick, 2026-10-31)

- **Void-year restructures.** At the new league year, a team short of the room it wants first restructures over a deal's own years, as before. If it is still short, it restructures again with void years added (up to `MARKET.maxVoidYears`, 4), so the bonus spreads over the real limit of five years. A player in his last real year can now be restructured this way. When the void years come due, their proration lands as dead money, as in the real league.
- **Post-June-1 cuts.** A team may designate two releases before June 1 each league year (`POST_JUNE_1_DESIGNATIONS`, CBA Art. 13). Under the real timing, the player's whole cap number still counts until June 2 (`teamCapTotal(..., { at })` adds it as `held`). After that, only this year's share counts, and the rest lands next year. Teams use the designation for cap casualties when they already have the room they want without the saving, and when it moves at least `MARKET.designateLater` ($2M) to next year.
- **The spiral the draft thread found was mostly bad data.** The stand-in file has about 128 placeholder years at the end of deals, not 23 as first thought. Their base salaries are $10M to $500M, and their stored cap hit leaves the base out. One team had 33 of them, which put it about $178M over its 2027 cap. The cap check now reads any trailing years after the file's season whose stored cap hit leaves the base out as void years (`withDummyYearsVoid`). With that fixed, the team ends its years at 58, 74, 80 and 95 men, not 58, 65 and 44. The importer should still set `voidYear` itself.
- Five-year check: own-team deals of 2+ years average 86 a year (84 before). New-team deals at $2M+ average 77 (73). Dead money averages $16.9M a team (13.6; the real figure is about 34). Cap use is still about 99%.

### Step 9: cap room and free agency (owner's "continue", 2026-10-31)

- **Where the money sits, against the real league.** The real numbers are counted from OverTheCap's table: active deals, and deals signed 2021 to 2025, grouped by size as a share of the cap.
  - Our deals ran about a year longer at every size.
  - Deals of 0.5% to 2% of the cap (the middle class, about $1.5M to $6M) were 10 a team; the real number is 19.
  - Deals above 8% were 1.3 a team; the real number is 3.4.
  - On the first day of free agency, about 430 free agents asked more than $1.5M and 35 signed. Most offers did not fit a team's room.
- **Deal lengths.** A new deal now starts from the real average length for its size (`REAL_TERM`, REPORTED): 1.41 years up to 0.5% of the cap, 1.80 to 1%, 1.85 to 2%, 2.28 to 4%, 2.78 to 8%, and 3.55 above 8%. A younger man gets 0.2 years more a year of age under 27, an older man less (CHOSEN), within the old age limits.
- **Prices keep pace with the cap.** The market counts each deal at its share of the cap in its first season, in this season's dollars, as OverTheCap compares deals across years. Before this, prices stood still while the cap grew 6% a year, so star deals shrank.
- **More room for free agency.** In March, teams now make $35M of room for free agency, up from $15M (`MARKET.freeAgencyRoom`; my judgment, as I found no league-wide count of real teams' room). They make it by restructures and cap cuts. A cap casualty may be designated post-June-1 when the team has room for its rookies and its buffer without the saving.
- I tried letting teams chase depth veterans (anyone who would make their 53, not only starters). It changed nothing, so it is not kept.
- **Five-year check:**
  - New-team deals of $2M+ average 84 a year (77 before; the real number is 180 to 240), and of $5M+ 64 (56; real 80 to 120).
  - Dead money averages $30.0M a team (16.9; real about 34).
  - Own-team deals of 2+ years average 84 a year (86; real 210 to 290).
  - Cap use is still about 99%.
- **Still open: the middle class.** Teams fill depth with rookies and minimum deals, not $1.5M to $6M veterans, and they spend the rest on their own players.

### Step 10: how front offices plan cap room (owner's note and rulings Q1-Q3, 2026-10-31)

- **Owner's note** (press sources the owner gave): real teams enter the season with a $5M to $10M cushion, keep room for the rookie pool, roll unused room over on purpose to cover next year (the 49ers, about $31.5M over 2027, carrying $30M+), split into win-now and flexible front offices, and must spend 89% of the cap in cash over four years.
- **Rulings:** Q1, the team president holds the leaning; Q2, a drawn spread; Q3, build the floor now.
- **The leaning** (`cap/leaning.ts`). A president's `capLeaning` rating, 0 (win now) to 100 (flexible), on his open ratings (no contracts edit). A president made before this step draws his from his id and name, the same every time, evenly 0 to 100 (the spread is CHOSEN). It sets:
  - the in-season cushion, $5M to $10M (REPORTED range; replaces the $3M buffer);
  - the look-ahead: the share of next season's overage the team keeps unspent now so it rolls over, 25% to 100% (CHOSEN);
  - the March room: the share of `MARKET.freeAgencyRoom` it clears by restructures and cuts, 100% to 50% (CHOSEN);
  - void years in restructures: yes up to 67, no above (CHOSEN).
  The human's team is steered by the human's choices, not the leaning.
- **The spending floor** (`CASH_FLOOR`, REPORTED, CBA Art. 12): 89% of the cap over four league years. Spending is counted as cap total (live deals and dead money), a simplification: real cash pays a signing bonus up front. A team behind the floor plans like a win-now team (keeping its own cushion) until it catches up. The window starts at the first league year the sim holds a carryover for, so seasons before the league began never count; carryover records are now kept four years for this.
- **The middle class.** The market's price list counts each veteran once, on his latest deal live this season or last. Before, it held mostly starters, so backups were priced near the minimum.
- **Five-year check** (`reports/cap-check.md`): cap use median 97% (99% before), carryover mean $6.5M a team (2.4), most $35.5M; own-team deals of 2+ years 144 a year (84; real 210 to 290); new-team deals of $2M+ 67 (84; real 180 to 240), $5M+ 50 (64; real 80 to 120); dead money $20.1M a team (30.0; real about 34).
- **Still open:** free agency is now the larger gap. Flexible teams clear only half their March room, so fewer veterans move. The March room size and the share flexible teams keep are the knobs for the next step.

### Step 11: free agency and real deal shapes (owner's "continue", 2026-10-31)

- **Finding.** On free agency's first day each team signed two or three players and was then out of room for the year. Our deals charged 97% of their yearly value in year one. Real multi-year deals charge 81% (up to 1% of the cap), 75% (1-2%), 59% (2-4%), 45% (4-8%) and 34% (over 8%) (`REAL_FIRST_YEAR`, REPORTED, counted from OverTheCap, deals of $2M+ a year and 2+ years signed 2021 to 2024, median). Real new-team deals of $2M+ add up to about 20% of the cap a team a year, in yearly value (counted, 2021 to 2025). Also, a team turned down by its top target offered him again every round and never moved on.
- **Changes.**
  - `veteranContract` takes `firstYearShare`. Every offer (free agency and extensions) is shaped to the real share for its size. The later years rise to make up the rest. The bonus's yearly proration is a floor, so the biggest deals come to about 38%, not 34%. A shaped deal guarantees as much base salary as an even deal.
  - `MARKET.freeAgencyShare` = 0.2 of the cap (counted) replaces the $35M `freeAgencyRoom`. The leaning's `marchRoom` still scales it.
  - `secondYearFits`: a signing, re-signing or extension must fit its second year into that season's room. That room is the top 51, less the cushion and the free-agency room the team will want that March. A team's last man at a starting position is exempt.
  - The look-ahead counts next season's top 51 and holds back at most `MARKET.lookAheadMost` = 10% of next season's cap. That is the 49ers' case from the owner's note (REPORTED case; the bound is judgment). Before, it counted all 90 and had no limit.
  - A team turned down moves to its next target that day. `MARKET.rounds` goes from 3 to 8.
  - Teams chase any veteran who would make their 53 by the upgrade margin, not only starters.
  - Void years in restructures are for win-now teams only (leaning 33 and under, was 67; CHOSEN). With real shapes, void years for two thirds of teams left $30-40M a team of dead money a year.
- **Later years** (the owner chose "fix the later years first"). Checking the second year against the cushion alone left teams starting each March $0M to $50M over the cap, and new-team signings fell from 144 in year one to 52 to 79 after it. Keeping next March's free-agency room in the check fixed most of that.
- **Five-year check** (`reports/cap-check.md`):
  - New-team deals of $2M+ average 108 a year (67; real 180 to 240): 140 in year one and 100 a year after it.
  - New-team deals of $5M+ average 74 (50; real 80 to 120).
  - Own-team deals of 2+ years average 149 (144; real 210 to 290).
  - Dead money averages $21.5M a team (20.1; real about 34).
  - Cap use is 97%. No team ends a year more than 1% over its cap.
- **Still open.** New-team deals are still about half the real number. Own-team multi-year deals dip in 2029 (51).

### Fix: same-day tender and extension (2026-11-01, found by the aging thread's 20-season runs)

- **The bug.** The early-extension pass in `reSign` read a tender, tag or re-signing signed minutes earlier as "a deal ending after next season" and extended it the same day. A later cut ended only the deal live that year, so the extension outlived it. The player then sat on another team's roster while carrying the first team's extension, went to free agency when that extension was cut, retired unsigned, and left a dangling roster id. That crashed cut-down day.
- **The fix.** No extension on the day the team signs the player anything else. `release` also ends that team's deals with him that have not started yet; their bonus lands as dead money. Both fixes have tests.
- **Effect on the five-year check.** First-year extensions fall from 327 to 205; about 120 were the bug, so own-team counts in steps 7 to 11 were inflated. Means: new-team deals of $2M+ 111 a year, of $5M+ 81 (now in the real 80 to 120), own-team deals of 2+ years 119 (real 210 to 290), dead money $22.2M a team.


### Step 12: good free agents find teams, and each team's own scout (owner's "continue", 2026-11-01)

- **Finding** (asked by the aging thread). About 100 above-average players a year reached free agency and never signed again. A trace of every free agent rated at or above the league's average 53-man player showed that teams wanted them but never made an offer. A team bid its own full price even after his ask had fallen, passed when a longer deal didn't fit next year, and from the second week of March had under $2M of room. Of those newly free, 48%, 28% and 8% signed in years one to three. Real (counted from OverTheCap, deals of 1.5%+ of the cap that ran out in 2016 to 2022): 86% to 94% of veterans 30 and under signed again within two years, 71% at 31 to 32 and 58% at 33 or older. About half of the next deals were for one year.
- **Changes** (`leagueYear.ts`, free agency):
  - An offer is the team's own value, but never more than the player asks.
  - When a longer deal won't fit the second year, the team offers one year.
  - After the draft (the bargain window), a player nobody could fit lowers his ask to what the team with the most room that wanted him can pay, never below his minimum.
  - A swap: a team short of room may let go a lesser man at the same position (graded at least the upgrade margin below the newcomer) to sign him. The cut must save enough this year, and his dead money over all seasons must be at most `MARKET.swapDeadMost` = 2% of the cap (CHOSEN). The man let go joins the free agents.
  - `leagueYearSteps` now defaults its scouting to `headCoachEvaluation`, as the draft does, instead of a flat 50. Every caller (the cap check, `runSeason`'s league year) gets each team's own evaluator.
- **Five-year check** (`reports/cap-check.md`): newly free above-average players signing that offseason went from 48%, 28% and 8% to 94%, 87% and 43% in years one to three. The cap check has no retirements, so the unsigned pool grows and later years read low. Means: new-team deals of $2M+ 175 a year (111; real 180 to 240), of $5M+ 87 (81; real 80 to 120), own-team deals of 2+ years 120 (119; real 210 to 290), dead money $29.4M a team (22.2; real about 34), cap use 98%.
- **Not kept.** The swap with no dead-money limit signed nearly all of them, but left $37M to $47M a team of dead money. A 0.5% limit signed only about half after year one.
- **With growth and injuries on** (the aging thread's panel on PR #57's tools, seeds d5b-t2 and d5b-t4, 12 seasons, 2029-37 means on the week-8 53s, 2026-11-01): good veterans now keep their jobs, but nothing yet moves aging men out. The 31-and-over share rises from 10.7% (old market) to 19.0% (NFL 10.1%), the 34-and-over share from 4.6% to 6.6% (NFL 2.9%), the mean rating from 65.8 to 68.1, and the undrafted share falls from 23.9% to 17.9% (NFL 25.7%). Growth and injuries stay off by default, so the game as played does not change. Dead money with growth on is about $34M a team with no swaps, and the 2% swap adds $5M to $20M a team in later years. The owner chose to merge step 12 now (2026-11-06) rather than wait for step 13.
- **Next: step 13, "cut aging players sooner"** (drafted, on PR #57's `expectedOverallChange`): every keep, cut, re-sign and signing, and cut-down day, judges a man on his expected rating ahead, a backup at a backup's pace. Looking one year ahead brings the 31-and-over share to about 14%; averaging three years ahead brings it to 10.5-10.9% and 34-and-over to 2.6-2.8%. The horizon is the owner's call (card of 2026-11-01). Step 13 waits on PR #57 and the aging thread's learning-rate PR, and will tighten the swap's dead-money limit when growth is on. Own-team multi-year deals remain the largest money gap.

### Step 13: teams judge a man ahead, through their GMs' eyes (owner's rulings of 2026-10-31 and 2026-11-06)

- **Rulings.** On the aging thread's doc (2026-11-06): how far ahead a team looks follows its direction (contend one year, retool two, rebuild three); a backup is judged further ahead than a starter; an offer is priced on the man's expected rating across the deal's years (§4.1); a deal's length comes from his expected decline, not an age band (§2.3); nothing is based on position. On the outlook (answers 1a, 2b, 3a and 4a): the GM judges both today's rating and the outlook for contract calls; the outlook is a guess with an error, and a strong GM's typical miss is about 25% smaller than a weak one's; the guess is refreshed at the new league year, at the end of camp, and right after the last games before the trade deadline; expected availability waits for the aging thread's `expectedAvailability`.
- **The view ahead** (`cap/ahead.ts`, `aheadView`). What a team sees of a man with a growth record:
  - His rating today plus his expected change averaged over the years ahead, from the development week at its mean (`expectedOverallPath`, ADR-087). No extra age penalty.
  - Years ahead: one, two or three by the team's direction, two before its first meeting (CHOSEN). A backup one more (CHOSEN), three at most. A newcomer (a free agent, another team's man) counts as a backup when he would not start for the team by today's ratings.
  - Through the GM's eyes: the truth plus an error, a misjudged pace in points a year. Its sd is 1.0 at outlook skill 25 and 0.725 at 85 (CHOSEN so that, with the season's own luck of sd 0.29 a year as the aging thread measured it, a strong GM's typical miss is 25% smaller: 0.78 against 1.04). Outlook skill is half Forecasting and half Talent Evaluation, as the meeting's growth read. Half the error (by variance) stays with the GM and the man; the other half is drawn again at each refresh (`AHEAD.errorKeep`, CHOSEN: drawn fresh each time, a GM's opinion jumped and teams cut in August the men they had signed in March). A team with no GM seated reads the truth.
  - The refreshes: the new league year, cut-down day (the end of camp), and the first day of the trade deadline's week, right after the last games before it. There are no trades yet; the third refresh is ready for them.
  - His age for the cap's age rules (`ruleAge`): the age at which the league's men are expected to change as he is, from a straight line of three-year change against age (ages 23 to 33, fitted on the league each season, COMPUTED). It replaces his age less four years at QB, K, P and LS. A man with no growth record keeps the old rule (`legacyRuleAge`).
- **Where it is used.**
  - The league year (`leagueYear.ts`): every keep, cap cut, re-signing, tender, extension and signing judges a man through the team's view. The market's grader is the GM's Talent Evaluation (`gmEvaluation`; the head coach's with no GM seated, as before; 50 with neither). A man's own asking price reads him ahead with no GM's error. The market's price curves and the depth charts stay on today's ratings.
  - A deal (`valuePlayer` with `ValueAhead`): its length comes from his rule age and his place in the market (`termAt`), then its price from his expected rating across those years. Age takes nothing more off the price. The extension and cap-casualty gates read his rule age (`ageFactorAt`).
  - Cut-down day (`cutdown.ts`, `rateFor`): who makes the 53, waiver claims and practice squads are judged by each team's view. The depth charts and the waiver order stay on today's ratings.
  - A season's walk (`runSeason`) keeps one view, so the league year and cut-down judge a man alike and read his expected path once a season.
- **Growth off, nothing changes.** Over three league years, main and step 13 play the same league, money for money: no man has a growth record, and the cap check seats no GMs with growth off.
- **Growth and injuries on** (the cap check on the stand-in league, 5 seasons; week-8 53s, 2027-30 means; dead money and deals 2027-31 league years; seeds d5b-t2 / d5b-t4; "before" is main with the aging thread's learning-rate change, PR #66, which step 13 was tuned against):

  | | Before | Step 13 | NFL |
  |---|---|---|---|
  | 31 and over | 14.0% / 13.0% | 10.3% / 9.5% | 10.1% |
  | 34 and over | 4.2% / 3.9% | 2.7% / 2.5% | 3.1% |
  | Undrafted | 25.3% / 26.1% | 27.4% / 29.0% | 27.4% |
  | Mean age | 26.52 / 26.44 | 26.07 / 25.96 | 26.18 |
  | Mean rating | 67.91 / 68.27 | 67.57 / 67.77 | |
  | Dead money a team | $35.7M / $38.1M | $40.6M / $38.8M | about $34M |
  | New-team deals of $2M+ a year | 177 / 178 | 172 / 188 | 180 to 240 |
  | New-team deals of $5M+ | 93 / 93 | 90 / 87 | 80 to 120 |
  | Own-team deals of 2+ years | 128 / 126 | 116 / 104 | 210 to 290 |

  NFL ages are `NFL_CAREERS` (week-8 53s, 2018-24, COUNTED); the money rows are those of steps 9 to 12. Veteran deals of $2M+ at 33 and over fall from 178 / 183 to 108 / 97 over the five years, and run 1.16 / 1.29 years (1.04 / 1.04 before), as a deal's length now follows each man's expected decline.
- **Where the dead money comes from** (per walk, a team, 2027-30 walks). Cut-down day: $24.4M / $18.6M (15.2 / 11.4 before). Cap cuts at the new league year: $10.9M / $11.9M (7.0 / 8.0). Void years: $17.2M / $15.9M (20.1 / 22.1). The first real cut-down (the 2027 walk) is the largest, $28.5M / $35.0M, as the stand-in league's deals meet the new judgment. A trace of that day: teams now let go of older men who are paid, starters among them, because nothing on cut-down day weighs the money a cut leaves (that is §3.2, "cut-down counts the cap a cut saves", in step 14). A 1% swap limit saved only $1M to $3M a team and cost 20 to 40 new-team signings a year, so the swap limit stays at 2%.
- **Cost.** With growth on, a league year takes about 45% longer (69 s to 99 s, and 63 s to 94 s, on four busy cores): each man's expected path is walked twice a season, for cut-down and for the offseason.
- **Still open.** Cut-down weighs no money (§3.2), and own-team multi-year deals fell further from the real number (§3.1 and §3.4); both are step 14, after the aging thread's measurements. The 34-and-over share is now a little under the real one; the aging thread's grade will say whether it is inside its bands. Expected availability (answer 4a) waits for `expectedAvailability`. The outlook on screen for the human's GM needs a contracts type and a typed yes.

### Step 14: the missing middle class (owner's rulings on the aging doc, 2026-11-06)

- **Rulings.** On the aging doc's §3 (2026-11-06): §3.1 yes to value for money, with the owner's words "it shouldn't just be the cheapest option at that position. The formula should take into account each player on the roster at any specific position"; §3.2 okay (cut-down counts the cap a cut saves); §3.3 okay (keep more 90-man spots open for undrafted rookies before the draft); §3.4 yes (re-signing sees the draft class: seats held for the team's own picks, valued at what a typical pick of that round becomes).
- **Finding** (the doc "Step 14: the missing middle class", 2026-11-07). Each team's cap, split by deal size as a share of the cap in the deal's first year (the league file's 2026 53s, contracts as of 23 October, by the same split as ours at week 1, COUNTED): big deals (4% and up) 39.5% of a team's cap, 7.7 men; the middle class (0.66% to 4%, about $2M to $12M in 2026) 21.4%, 13.7 men. Ours, growth on: about 50% and 10%. The market scored a target by need and grade (a hole, then (grade − 50) × position value × (1 + need)); his price only decided whether he fit. So the room went to the best man it could fit, and the middle went unsigned. Middle-class deals a year: own team 35, real 155; new team 80, real 199 (OverTheCap rows, 2021-25 signings, by the same split, COUNTED).
- **Value for money** (§3.1, `cap/valueForMoney.ts`). What a man is worth to a team, in dollars a year: what he lifts its men at his position, times the market's price of a rating point at his level, less what he costs over the least the team could pay him for the same years.
  - The lift counts every seat of the position's 53-man shape (`WANTED`), best man first, through the team's own eyes: starters fully (the first man at a position with no set starter, fullback and inside linebacker, as half a starter), backups at a tenth (`backupWeight` 0.1, CHOSEN: at a quarter, teams overbought depth), and an empty seat or a man below 50 as a street free agent at 50 (`REPLACEMENT_GRADE`). So a man nearly as good as the starter he would replace lifts the team little, however good he is, and a cheap man who fills a hole lifts it a lot. That is the owner's "each player on the roster at that position".
  - A point's price is read around his own place in the market (the rise in pay over the rise in grade across 10 percentiles each side, `priceSpan`, CHOSEN), so a point costs more at the top than in the middle. With no price for a point yet (no deals at his group, or all at one pay), he is worth his lift alone.
  - The least the team could pay him: each of the deal's years at his minimum for his credited seasons then, averaged (`dealFloor`).
  - Free agency: a hole still comes first; then the best value; a man worth less than his price is passed over. (With free agency's prices from the offers, below, the man who would help most among those worth their price.)
  - Re-signing day takes the team's own free agents in value order, so the room goes first to the men worth most over their price, and lets go a man worth less than his price, unless he is the last man at a starting seat.
- **The seat rule.** A signing that would push a teammate off the 53 counts that man's dead money (all seasons), spread over the new deal's years, as part of its cost, and is passed over when that dead money is more than a swap may leave (`swapDeadMost`, 2% of the cap, step 12).
- **Seats for the rookies** (§3.3, §3.4).
  - Before the draft, free agency keeps 16 more 90-man spots open for the undrafted rookies signed after it (`MARKET.undraftedSeats`; COUNTED: about 16 undrafted rookie deals a team a year, 2022-25, OverTheCap's contract histories), besides the 9 kept for the draft class.
  - On re-signing day, each pick the team holds is a seat at the position it needs most that no earlier pick took (one seat a position, rounds in order), rated what a pick of that round has become in this league: the mean rating today of that round's picks in the last three classes (`typicalPicks`, `PICK_SEAT_CLASSES` = 3, CHOSEN). Its own free agents are judged with them in the room: whether they make the 53, and what they add for the money.
- **Cut-down counts the cap a cut saves** (§3.2, `cutdown.ts`). What a cut would save this season (his cap number less the dead money it leaves this season) counts against keeping him, in rating points at his market's price of a point, up to 3 points (`SAVING_MOST`, CHOSEN: close calls only). Alone (growth on, 5 seasons, two seeds) it moved dead money by half a million a team and the 31-and-over and undrafted shares by under half a point: most of cut-down day's dead money comes from men well below the cut line, whose pay is guaranteed either way.
- **An extension takes over the old deal's last year.** As a real extension tears up a deal's last year, the new deal runs from the season it is signed in (training camp, below). The old deal is shortened to end the season before; its bonus money still to count from then on moves into the new deal's real years, and what its last year has paid by then (roster and workout bonuses) stays in that season. The room check counts the old last year leaving the books. Before, the new deal started after the old deal's last year, so a team paid both that year and could afford fewer. No contracts edit was needed (the plan said one might be): the old deal keeps its record up to the season before, and the moved money is ordinary proration.
- **The real re-signing windows** (owner, 2026-11-07: "I would like our systems to mirror real life systems as much as possible", with the three windows real teams re-sign in: late winter, training camp and cut-down day; the owner chose to build the first two before the aging thread's joint tuning). Before, a team re-signed its own free agents, tendered, tagged and extended on one day, about two weeks before the new league year, and cut and restructured only on the league year's first day, so most of its own men who left that day went for want of room it had not made yet.
  - *Late winter* (`reSignOpens`, OFF_EVAL week 1 day 7, to the tag deadline, `reSign`, week 3 day 1). Re-signing opens a week after the season, once the season just played is credited, so each man is judged as the free agent he is about to be (restricted after three credited seasons, unrestricted after four). That day each team cuts its cap casualties and gets under next season's cap (a release then counts in the new league year, as real February cuts do), then takes its own free agents in value-for-money order. A man it wants, and who would sign, but who does not fit gets the room the team can make by restructuring (base salary turned into bonus, the biggest first), tried on a copy of the book and kept only when he then fits. The tag deadline, about a week before the new league year, is a last round, then one franchise tag for the best star still unsigned, its room made the same way. Anyone not re-signed reaches the market when free agency opens. The new league year still restructures toward the room a team wants for its rookies, its cushion and March's free agency.
  - *Restricted free agents.* A team tendered every one who made its roster, at the lowest level when he was worth less than any tender; once room was made as needed, that came to 106 to 164 tenders a year. Real teams tender a man only when he is worth it: one-year deals at exactly a tender amount number 22, 18, 11, 6 and 9 in 2021-25 (OverTheCap's rows via nflverse, COUNTED; a floor, since a tendered man who later signed a longer deal shows only that deal). Now a man is tendered at the highest level his value covers, when the tender is worth its price to the team (§3.1); one worth less than the lowest tender is not tendered, as real teams let such a man become an unrestricted free agent, and his team may still re-sign him for less, as any of its own free agents. A restricted free agent is never a tag candidate.
  - *Training camp* (`campExtensions`, TRAINING_CAMP week 1 day 1). Teams extend the men in the last year of their deals, stars first; the early extensions of the old re-signing day move here, with step 7's rules. The new deal takes over this season (above), so its bonus spreads from this season, and a star whose last year was dear counts less this season. A team short of room restructures other deals (never the man's own), as in late winter. The cap check's walk starts at the league file's camp, and the file's deals (as of 23 October) already hold that camp's extensions, so the walk extends from the next camp on (`campExtensionsFrom`).
  - *A team's own men and next March's money.* Step 11's second-year check keeps next March's free-agency room free, so a team does not spend next year's free-agency money now. For a team's own men it stopped most extensions: at camp 2027 and 2028 (growth on, one seed) it turned down 98 of 136 and 62 of 117 men who passed every other check, against 32 and 34 for want of room this season. That money is what a team would spend to replace men like him, and real teams keep their own before they shop, so a re-signing or an extension keeps only the cushion in its second year (`secondYearFits`, `own`). Free-agency signings keep both.
  - *Cut-down day* (cut a vested veteran, put a younger injured man on injured reserve, sign the veteran back a day later) waits for the real reserve rules: a man put on injured reserve before cut-down is out for the season, which we do not model yet (ADR-088 Q2 leaves reserve and practice-squad moves to this thread).
  - *Measured* (growth and injuries on, the panel above, seeds d5b-t2 / d5b-t4, both builds with PR #73's class talent put in by hand; step 14 before the windows against the windows with the fixes above, re-signing opening a week after the season):

    | | Step 14 before | With the windows | Real |
    |---|---|---|---|
    | Good free agents (top 40% at their position) unsigned at week 1, a year | 47 / 71 | 24 / 36 |  |
    | New-team deals of $2M+ a year | 333 / 334 | 278 / 282 | 180 to 240 |
    | New-team deals of $5M+ a year | 124 / 118 | 106 / 111 | 80 to 120 |
    | Middle class's share of the cap, week 1 (2029-30) | 18.9% / 18.9% | 15.5% / 14.3% | 21.4% |
    | Middle-class men a team | 12.0 / 12.4 | 9.7 / 9.6 | 13.7 |
    | Big deals' share of the cap | 42.9% / 42.0% | 39.1% / 38.5% | 39.5% |
    | Big deals a team | 6.9 / 6.5 | 6.7 / 6.7 | 7.7 |
    | Middle-class deals a year, own team | 66 / 64 | 52 / 56 | 155 |
    | Middle-class deals a year, new team | 221 / 240 | 166 / 179 | 199 |
    | Big deals a year, own team | 52 / 51 | 44 / 44 | 60 |
    | Big deals a year, new team | 35 / 36 | 34 / 36 | 51 |
    | Own-team deals of 2+ years | 116 / 111 | 98 / 89 | 210 to 290 |
    | ... above the minimum | 112 / 107 | 92 / 83 | about 135 |
    | Camp extensions a year (2027-30) |  | 26 / 26 | about 60 extended in a deal's last year, at any time |
    | Restricted free agents tendered a year | 13 to 44 | 3 to 18; 82 / 54 in 2029 | at least 6 to 22 |
    | Dead money a team once the season is over (2027-30) | $49.3M / $44.4M | $60.3M / $58.5M | $49.3M (2026) |
    | ... as a share of the cap | 13.8% / 13.2% | 16.7% / 17.5% | 16.4% |
    | Quarterbacks' share of the cap (2029-31) | 8.0% / 9.7% | 9.3% / 8.1% | 10.7% |
    | Offensive line's share (2029-31) | 18.9% / 19.7% | 18.7% / 18.3% | 18.7% |
    | Position shares off real, summed (2029-31) | 11.9 points / 12.2 points | 9.4 points / 15.1 points |  |
    | Biggest deal outside quarterback, share of the cap (2027-31, most) | 15.6% / none in the top five | 15.1% / 15.4% | 13.7% to 16.7% |
    | 31 and over (week-8 53s, 2027-30) | 14.5% / 13.8% | 15.2% / 14.1% | 10.1% |
    | 34 and over | 3.9% / 3.6% | 4.0% / 3.6% | 3.1% |
    | Undrafted | 19.1% / 20.2% | 18.3% / 19.2% | 27.4% (2022-24: 25.7%) |
    | Mean rating | 68.08 / 68.14 | 68.36 / 68.45 |  |

    Real extensions in a deal's last year: OverTheCap's 2021-25 rows (26 big, 31 middle-class and 3 smaller a year, COUNTED; the rows do not say when in the year). Free agency moved toward the real numbers: more good free agents find teams, new-team deals come down toward the real range, dead money is real-sized as a share of the cap, and the line and the biggest deals stay real. A team's own middle class did not: its share of the cap fell, and own-team deals stayed under half of real. With growth off (the cap check as it runs by default, against step 14 before the windows): new-team deals of $2M+ 232 a year (279; real 180 to 240), of $5M+ 104 (118); own-team deals of 2+ years 88 (115), 83 above the minimum (110); the middle class at week 1 22.1% of the cap (23.2%), big deals 44.3% (45.9%); dead money once a season is over $37.6M a team (29.9); the quarterbacks' share 9.6% (8.5%), the line's 18.8% (20.2%). Growth off, the middle class stays near real each year (19.7% to 24.4% of the cap at week 1). With growth on it is near real in 2027 and 2028 (about 22% and 20%) and falls to 13% to 17% in 2029 and 2030, while dead money at week 1 climbs from about 11% of the cap to about 21%; by the cap check's own tally, cut-down day's cuts leave the most of it, then void years, then late winter's cap cuts. Re-signing first opened on the season's last day, before the draft order's day credits the season (the walk runs the league year's steps before the draft's on any one day), so a man who had just played out his fourth season was handled as a restricted free agent: restricted tenders ran at 34 to 70 a year, and own-team deals of 2+ years at 92 / 91.
  - *Why a team's own middle class still leaves* (late winter's first round, a diagnostic build, four late winters, seed d5b-t2, re-signing a week after the season; COUNTED in our walk). Teams judge about 160 of their own middle-class free agents a year and keep about 47. Value for money turns down about 83, about 60 of them men who would be backups; the man himself turns down about 27; want of room stops 1 to 14. A backup counts a tenth of a starter (`backupWeight`), so a backup is rarely worth middle-class money; on the real 2026 53s, 4.7 of a team's 11.5 middle-class veterans are not first on its ESPN depth chart (the league file, COUNTED; backup quarterbacks, second tight ends, extra receivers and rotation pass rushers most). Some starters lose their seat to one of the team's coming picks (about 24 a year in an earlier count, before re-signing waited for the season's credit): a pick is seated at the position the team needs most counting none of its own free agents (`pickSeats`), so it lands where they play, and it is rated what that round's picks have become after one to three seasons (`typicalPicks`: round 1 about 71 to 74, round 3 about 66, round 7 about 60, against about 66.5 for the average man on a 53). Real own-team middle-class deals a year: 117 re-signings after a deal ran out (71 of them for one year), 31 extensions in its last year and 8 earlier (OverTheCap's rows, 2021-25, COUNTED). We re-sign about 18 of a team's own middle-class men a year for one year, in late winter and in the market together. Two fixes were tried and not kept (below).
  - *Where the fade's dead money comes from* (the windows, growth and injuries on, seed d5b-t2, PR #73's class talent put in by hand, the cut-downs of 2027-29; COUNTED in our walk). Cut-down day leaves more dead money than any other step, about two fifths of it ($618M, $826M and $580M league-wide, about $21M a team a year), because teams cut men they have just paid:
    - About 80 a year cut with $1M or more of dead money were signed that same offseason: 42 to 65 in March's free agency, 2 to 7 re-signed in late winter, and one-year deals of $1.2M to $2M signed in draft week or the summer, fully guaranteed (a deal for a man in the top 40% of his market was built with a guaranteed year, however small). Real teams let about 13 such men a year go (18, 6 and 16 in 2022-24): signed that year with $1M or more guaranteed and never on the signing team's roster in a regular-season week (active, inactive, reserve or unable to perform; OverTheCap's deals against nflverse's weekly rosters, COUNTED).
    - 25 to 39 a year are the new class's draft picks. Picks cut at their first cut-down, rounds 1 to 7 (2027-29): 0-6%, 0-14%, 22-42%, 36-61%, 50-61%, 56-76% and 69-79% (main, 2027-28: 0-12%, 3-6%, 15-28%, 15-25%, 33-35%, 44-47% and 59-69%). Real teams kept almost all of rounds 1 to 5: 0 of 95, 1 of 96, 0 of 116, 1 of 106, 3 of 119, 25 of 126 and 37 of 120 were not on their drafting team's 53 or reserve lists at their first week 1, practice squads included (the 2022-24 classes, nflverse's weekly rosters, COUNTED). A cut pick is rated a median 4.3 points below the weakest man kept at his position, both judged ahead (one in six within 1.5 points); one in twenty lost a close call on the cap a cut saves (§3.2), to a veteran whose small one-year deal was fully guaranteed. So most of it is how good the picks are when they arrive and how fast they are expected to grow (the aging thread's redesign), and how far ahead cut-down judges a pick: a team's years ahead plus one, at most three (step 13), where real teams judge a pick over his four-year rookie deal.
- **Deals guarantee money as real deals at their pay and length do** (`realStructure`, `REAL_STRUCTURE`; the owner's yes, 2026-11-07). Before, a deal's bonus share and fully guaranteed years followed the man's place in his market (`structureFor`: a 35% bonus and two guaranteed years for the top 10%, a 20% bonus and one for the top 40%), so a good man who signed late for a little had his whole year guaranteed, and cutting him at cut-down cost all of it. Real deals guarantee by what they pay and how long they run. Each offer, in free agency, re-signing and extensions alike, now takes the real deals' bonus share and the share guaranteed at signing (bonus included) for its pay and length. COUNTED: OverTheCap's new-team veteran deals signed 2021-25 (the man's previous season with another team), medians, the bonus read from the deal's first season's proration, pay as a share of the cap, shown as bonus share / guaranteed share:

  | Deal's pay | 1 year | 2 years | 3 years or more |
  |---|---|---|---|
  | About the minimum (up to 1.1 times his minimum; 95% of real ones guarantee nothing) | 0 / 0 | 0 / 0 | 0 / 0 |
  | Under the middle class (to $2M of 2026's cap) | 10% / 23% | as one year | as one year |
  | The middle class (to 4% of the cap) | 23% / 74% | 25% / 50% | 23% / 48% |
  | Big deals (4% and up) | 24% / 90% | 22% / 60% | 25% / 52% |

  Deals under the middle class run a year (276 real ones against 7 longer), so every length reads the one-year row. The guarantee is base salary from the first year on until the deal reaches its share, the year where it runs out guaranteed in part (`guaranteedSalary`); `guaranteedShare` now counts such part-year guarantees too.
  - *Measured* (growth and injuries on, seeds d5b-t2 / d5b-t4, PR #73's class talent put in by hand, against the windows above; dead money by step as the cap check tallies it, 2027-30):

    | | The windows | Real guarantees | Real |
    |---|---|---|---|
    | Cut-down day's dead money a team, a year | $25.2M / $23.2M | $18.6M / $14.7M |  |
    | Late winter's cap cuts' dead money a team, a year | $10.9M / $11.3M | $20.8M / $18.7M |  |
    | Dead money a team once the season is over | $60.3M / $58.5M | $58.9M / $55.3M | $49.3M (2026) |
    | ... as a share of the cap | 16.7% / 17.5% | 16.2% / 16.5% | 16.4% |
    | Good free agents (top 40% at their position) unsigned at week 1, a year | 24 / 36 | 10 / 21 |  |
    | New-team deals of $2M+ a year | 278 / 282 | 256 / 235 | 180 to 240 |
    | New-team deals of $5M+ a year | 106 / 111 | 112 / 109 | 80 to 120 |
    | Own-team deals of 2+ years | 98 / 89 | 112 / 106 | 210 to 290 |
    | ... above the minimum | 92 / 83 | 96 / 91 | about 135 |
    | Big deals a year, own team | 44 / 44 | 47 / 54 | 60 |
    | Big deals a year, new team | 34 / 36 | 43 / 42 | 51 |
    | Middle-class deals a year, own team | 52 / 56 | 63 / 54 | 155 |
    | Middle-class deals a year, new team | 166 / 179 | 178 / 154 | 199 |
    | Middle class's share of the cap, week 1 (2029-30) | 15.5% / 14.3% | 14.4% / 13.6% | 21.4% |
    | Big deals' share of the cap | 39.1% / 38.5% | 41.1% / 39.9% | 39.5% |
    | Quarterbacks' share of the cap (2029-31) | 9.3% / 8.1% | 10.0% / 8.3% | 10.7% |
    | Offensive line's share (2029-31) | 18.7% / 18.3% | 19.7% / 19.3% | 18.7% |
    | 31 and over (week-8 53s, 2027-30) | 15.2% / 14.1% | 14.9% / 13.8% | 10.1% |
    | Undrafted | 18.3% / 19.2% | 18.5% / 19.0% | 27.4% (2022-24: 25.7%) |

    Free agency moved toward real: fewer good free agents go unsigned, new-team deals of $2M+ come down toward the real range, and more big deals are signed with new teams and own teams alike. Cut-down day's dead money fell by a quarter to a third, as a small late deal no longer guarantees its whole year; late winter's cap cuts now leave about as much more, likely as longer deals guarantee part of their second year, as real ones do. So dead money once a season is over barely moved and stays real-sized. The middle class did not move: about a point lower with growth on. Its dip is deepest in 2029, the year the cap stalls in seed d5b-t2 and falls in d5b-t4 (to $316M), and it partly comes back in 2030 as the cap jumps, so part of the fade may be these seeds' cap path. With growth off (the cap check as it runs by default, against the windows): new-team deals of $2M+ 233 a year (232), of $5M+ 117 (104); own-team deals of 2+ years 102 (88), 85 above the minimum (83); the middle class at week 1 21.6% of the cap (22.1%), big deals 44.6% (44.3%); dead money once a season is over $39.4M a team (37.6); the quarterbacks' share 9.0% (9.6%), the line's 18.9% (18.8%).
- **Price lists count a deal's own pay.** Two things set the top of a position's price list too high, so the best man there was asked for 18% to 21% of the cap (a guard at $60M, a center at $71M; the year's biggest real deal outside quarterback was 13.7% to 16.7% of the cap, 2021-25, OverTheCap, COUNTED):
  - An extension's bonus money carried over from the old deal counted as its pay. The price list, the player's view of an extension offer and the cap check's biggest deals now count a deal's own pay (`newPayOf`: its pay over its real years and its own signing bonus), as OverTheCap counts APY.
  - The league file writes some placeholder years into a roster bonus ($50M or $100M on four deals, in years whose stored cap hit leaves them out) instead of a base salary, and one void year still carries a $50M roster bonus. They inflated the guard, tackle, defensive tackle and linebacker price lists from the first league year, in main too. The cap check now brings such a roster bonus down to what the year's stored cap hit holds (`PLACEHOLDER_SLACK`, $1M, CHOSEN) and a void year keeps only its bonus proration (`withDummyYearsVoid`). The importer should do this itself (the stand-in data fix still pending).
- **The cap check** (`capCheck.ts`). Three new measures:
  - Each season's cap at week 1, split by kind of deal and a veteran's deal by its size, as the finding splits it (`capSplit`: 0.66% and 4% of the cap in the deal's first real year, a deal's own pay). On the league file's own 2026 season it reads 13.1 middle-class men a team and 20.6% of the cap, and 7.7 big deals and 38.4%, against 13.7 and 21.4%, 7.7 and 39.5% counted on the file's 53s of 23 October: the two counts agree. The cap-check command counts it; other checks built on the walk count it only when they ask (`weekOneSplit`), so their walk is handed what it was before.
  - Each league year's dead money once its season is over (`playedYearDead`), beside the old "next year, before its cut-down". The old measure missed the dead money that cut-down day and the season make. Real 2026: $49.3M a team, 16.4% of the cap (the league file, COUNTED).
  - Own-team deals of two years or more above the minimum (`ownTeamMultiYearAboveMinimum`, an average a year over 1.1 times the top minimum): real about 135 a year (OverTheCap rows, 2021-25, COUNTED). The old row counts minimum deals too.
- **Measured** (growth and injuries on, the cap check's walk of the stand-in league, 5 seasons, seeds d5b-t2 / d5b-t4, both builds with the aging thread's draft-class talent change, PR #73, put in by hand, and main with the cap check's placeholder fix put in by hand; cap shares at week 1 of 2029 and 2030, deals a year over the league years 2027-31 (by cap share, 2028-31), ages on the week-8 53s of 2027-30):

  | | Main | Step 14 | Real |
  |---|---|---|---|
  | Middle class's share of the cap, week 1 (2029-30) | 10.1% / 9.7% | 18.9% / 18.9% | 21.4% |
  | Middle-class men a team | 6.1 / 5.2 | 12.0 / 12.4 | 13.7 |
  | Big deals' share of the cap | 51.0% / 51.2% | 42.9% / 42.0% | 39.5% |
  | Big deals a team | 8.0 / 7.5 | 6.9 / 6.5 | 7.7 |
  | Middle-class deals a year, own team | 38 / 32 | 66 / 64 | 155 |
  | Middle-class deals a year, new team | 91 / 87 | 221 / 240 | 199 |
  | Big deals a year, own team | 54 / 54 | 52 / 51 | 60 |
  | Big deals a year, new team | 42 / 37 | 35 / 36 | 51 |
  | New-team deals of $2M+ a year | 190 / 176 | 333 / 334 | 180 to 240 |
  | New-team deals of $5M+ a year | 86 / 85 | 124 / 118 | 80 to 120 |
  | Own-team deals of 2+ years | 113 / 110 | 116 / 111 | 210 to 290 |
  | ... above the minimum |  | 112 / 107 | about 135 |
  | Good free agents (top 40% at their position) unsigned at week 1, a year | 128 / 180 | 47 / 71 |  |
  | Dead money a team once the season is over (2027-30) |  | $49.3M / $44.4M | $49.3M (2026) |
  | ... as a share of the cap |  | 13.8% / 13.2% | 16.4% |
  | Quarterbacks' share of the cap (2029-31) | 9.9% / 11.9% | 8.0% / 9.7% | 10.7% |
  | Offensive line's share (2029-31) | 19.4% / 20.2% | 18.9% / 19.7% | 18.7% |
  | Position shares off real, summed (2029-31) | 12.2 points / 14.8 points | 11.9 points / 12.2 points |  |
  | Biggest deal outside quarterback, share of the cap (2027-31, most) | 16.8% / 16.9% | 15.6% / none in the top five | 13.7% to 16.7% |
  | 31 and over (week-8 53s, 2027-30) | 11.5% / 10.4% | 14.5% / 13.8% | 10.1% |
  | 31 and over in 2030 | 12.6% / 10.2% | 17.2% / 17.1% |  |
  | 34 and over | 3.2% / 2.7% | 3.9% / 3.6% | 3.1% |
  | Undrafted | 23.9% / 25.7% | 19.1% / 20.2% | 27.4% (2022-24: 25.7%) |
  | Undrafted in 2030 | 21.1% / 24.3% | 15.4% / 16.7% |  |
  | Mean rating | 66.91 / 66.78 | 68.08 / 68.14 |  |

  Real: the cap split is the league file's own 2026 53s (contracts as of 23 October), by the same split; deals a year are OverTheCap's 2021-25 rows by the same split; the position shares are OverTheCap's active deals (APY), as in the cap report; ages are `NFL_CAREERS` (undrafted: its 2022-24 seasons, as the aging thread's grade). The $2M and $5M rows count flat dollars while our cap grows about 7% a year, so later years count smaller deals than the real 2021-25 rows did. Both columns read the league file with the placeholder fix and carry PR #73's class talent, so they differ by step 14 alone. By cap share (0.66% and up), new-team deals run 256 / 276 a year against 250 real.

  The money moved as the step meant. The middle class's share nearly doubled, to within 2.5 points of real, and big deals came down toward real. The line's share is real again (23.4% / 20.0% before the price-list fix), the biggest deal outside quarterback is real-sized, and the position shares end closer to real than main's. Middle-class deals with new teams run a little over real, and those with a man's own team at under half of real: on the one re-signing day most of a team's own men who left went for want of room. With the real windows (below) room no longer stops them; value for money does. The ages moved the wrong way: 31 and over sits above the D5b band (7.1% to 13.1%) and undrafted below it (21.7% at least), further each year. The aging thread's reading: our men decline later than real men (their peak usage comes at 26 to 29, against 24 to 26), so value for money rightly likes good, cheap 31-year-olds, and its redesign (ADR-087) should take most of them out. The two are tuned together, against the D5b bands, before step 14 goes to the owner.
- **Growth off** (the cap check as it runs by default, 5 seasons, main with the placeholder fix and the new measures against step 14): means over the five league years, main's first: new-team deals of $2M+ 186 and 279 a year (real 180 to 240; flat dollars against a growing cap, as above), of $5M+ 94 and 118 (80 to 120); the middle class at week 1 17.1% and 23.2% of the cap (21.4%; 2027-30), big deals 49.7% and 45.9% (39.5%); own-team deals of 2+ years 122 and 115 (210 to 290), 117 and 110 of them above the minimum (about 135); dead money once a season is over $35.3M and $29.9M a team (2027-30; real $49.3M in 2026); the quarterbacks' share 9.4% and 8.5% (10.7%), the line's 19.5% and 20.2% (18.7%). The table is in `reports/cap-check.md`.
- **Free agency's prices from the offers** (the design "Free agency: prices from the offers", 2026-11-07, https://claude.ai/artifact/5BvH4TYC2cmSpJjtYfNTzy; built behind `LeagueYearConfig.marketPrices: "offers"`, off by default, `--market-prices offers` in the cap check). Teams cut about 60 men a year whom they signed that same offseason with $1M or more still owed (real about 13: 18, 6 and 16 in 2022-24). They do not get worse; they lose their seats to better men the team signs later for about the minimum. Two of our rules make those late bargains, and neither is real:
  - the date sets a free agent's price (`WINDOW_ASK`: 1.1 on days 2, 3 and 5 of the first week, then 1.0, then 0.85 and 3% less each week from a week before the draft), so a good man whose ask is above every team's value waits five weeks and then falls 15% at once, when most room is spent;
  - each round of a market day a team makes one call, to its biggest bargain (value for money), so a man priced fairly is nobody's first call however many teams want him at his price. Traced (try 4 below, seed d5b-t2): an 84-rated receiver, 30, asking $34.9M, was wanted at that price by 35 teams on the first day and called by none; teams spent their room on bargains, his ask came down to the little room left, and he signed in week 4 for $1.6M.

  Real veterans who change teams sign in two waves (Wikipedia's dated signings for 62 team-seasons, 2021-26, joined to OverTheCap's money for 650 of them, COUNTED): 92% of deals of 2% of the cap or more in the first week, 2% of all new-team deals in the weeks just before the draft (ours 28%), 47% after the draft, almost all near the minimum. No real rule lowers a price on a date; the price is the best offer (REPORTED, how the league works). So the four rules:
  1. *No price by the date.* His ask is his value times his agent's optimism on every market day (`askingPrice` at `VALUE`), or the ask he carried from his last market day when that is lower.
  2. *Top target first.* Among the men worth their price to it (value for money decides, as before), a team calls first the man who would help it most: his lift at the market's price of a point, before his pay (`helpOf`). A hole keeps the head start it has today (`HOLE_FIRST`).
  3. *Bidding.* Each offer carries its team's limit (its value of him, need counted, as before) and its room. He goes to the offer worth most to him at its team's limit (money and the rest he weighs, `offerWorth`), for the money that makes it worth as much as the next team's at that team's limit and at least his ask, never above the winner's limit. A team alone pays his ask, and raises toward its limit when the rest of its offer (a backup's role, say) leaves him short. A raise that would not fit the team's room, or that needs a swap, is not made: he weighs the offers as made.
  4. *A man no offer meets comes down overnight to what the market showed him.* Still unsigned at the day's end, he carries into his next market day the most any team that wanted him that day would have paid (its offer; for a team that could not fit him, the lesser of its room and its limit), when that is less than his ask. His ask never drops inside a day (step 12's drop to the roomiest team's room between rounds goes). The carried asks ride in `LeaguePeople.freeAgentAsks`, by league year, and only a man still unsigned keeps one; saves do not hold them yet.

  The market days, how a team values a man, value for money, the agent's optimism, how a man weighs an offer, the room and seats held for the draft, swaps, one-year deals and the re-signing windows are unchanged. Switched off, the cap check is the same, number for number (two seasons, growth off, against the build before).
  - *Measured* (tries on a local copy of step 14, growth and injuries on, seeds d5b-t2 / d5b-t4, with the aging thread's class talent and the rookie-class file put in by hand; signing dates and cut-downs over the offseasons 2027-29, money over five seasons; the mean of the two seeds, COUNTED in our walk; real as above or in the cap checks). Try 2 is rules 1 and 3 with step 12's drop to the room left in, between rounds on every market day; try 4 adds rule 4; try 6 adds rule 2. The build is the committed code, switched on, replayed the same way; it differs from try 6 only within the two seeds' spread:

    | | Today | Try 2 | Try 4 | Try 6 | The build | Real |
    |---|---|---|---|---|---|---|
    | Veterans signed that offseason and cut at cut-down with $1M+ owed, a year | 30 | 6 | 22 | 12 | 11 |  |
    | Everyone signed that offseason and cut so (picks and extensions too), a year | 62 | 44 | 57 | 45 | 46 | 13 |
    | Deals of 2%+ of the cap signed in the first week | 86% | 96% | 91% | 96% | 94% | 92% |
    | New-team deals signed in the weeks just before the draft | 28% | 1% | 8% | 5% | 5% | 2% |
    | New-team deals signed after the draft | 14% | 17% | 26% | 37% | 34% | 47% |
    | Veterans rated 70+ who changed teams in the first week: median pay, share of the cap | 2.6% | 0.4% | 2.7% | 3.5% | 3.4% |  |
    | Veterans rated 70+ who changed teams after the first week for under 0.8% of the cap, a year | 140 | 13 | 161 | 201 | 186 |  |
    | New-team deals of 4%+ of the cap, a year | 43 | 33 | 41 | 50 | 52 | 51 |
    | New-team deals of $2M+, a year | 243 | 109 | 227 | 185 | 191 | 180 to 240 |
    | New-team middle-class deals (0.66% to 4%), a year | 160 | 66 | 155 | 107 | 116 | 199 |
    | Middle class's share of the cap at week 1 | 13.7% | 11.0% | 14.8% | 10.4% | 11.1% | 21.4% |
    | Dead money a team | $44M | $39M | $46M | $47M | $46M | about $34M |

    Without bidding (try 7: try 6 with offers stopping at the ask), the cuts were the same but fewer deals came after the draft (19%), so the bidding stays.
  - *Still off with it on.* The middle class is thinner, and about 200 good men a year sign late for about the minimum: by the second or third market day most teams' room is gone. Two gaps we already had feed it: our teams re-sign about 55 of their own middle-class men a year (real 155), so more reach the market, and sign two to three times as many veterans from other teams as real teams do (about 25 to 30 a team each offseason, against about 10 to 15 in the Wikipedia tables), mostly depth men near the minimum that real teams fill with undrafted rookies (18% of our 53s, 27% real). Rule 4 also compares a team's room with a deal's pay a year, while a deal's first-year cap number can be less (its bonus spread over its years), so a team with a little room could have paid a little more than its room; to look at with the middle class. The cuts left are mostly the new class's picks (about 25 a year), the aging thread's tuning. The switch goes on once the money check is back in range.
- **The price list: typical pay, held at the real 2026 shape** (the doc "Why middle-class men leave their teams and end at the minimum", 2026-11-07, https://claude.ai/artifact/5FspPFUUgDfLz37bhJ5w1U; the owner's ruling on 2026-11-08: build it, held at the real shape, behind the free agency switch, off). The main reason the middle class fades is the price list. It priced a man at the pay of the man at his place in his position's market (`marketCurves`, the rank list). Real pay follows our ratings only loosely, so the rank list is steeper than real pay: for the top fifth of each position it asks about 1.4 times what real teams typically pay men rated there. A man near the top whose middle-class deal ends is re-signed into a big deal (28% of such re-signings, real 5%), the rest get less, and the middle class falls from 20.5% of the cap at week 1 in 2026 to 12% by 2029 (real 21.4%; growth and injuries on, today's market, seeds d5b-t2 / d5b-t4, PR #86's rookie-class file, COUNTED in our walk).
  - *Typical pay.* A man's price is what men rated like him typically earn: the median pay (its share of the cap in the deal's first year) of the tenth of his position's market rated closest to him, never less for a better-rated man (`PriceList` "typical"). Real deals are priced against comparable players the same way (REPORTED, how the league works).
  - *Held at the real shape.* The list is read once, from the league file's 2026 deals (contracts as of 23 October, with PR #86's rookie-class lengths), and kept as shares of the cap at 101 places in each position's market (`TYPICAL_PAY_2026`). A man's price is the share at his rating's place among the men there now, times the year's cap. Real pay keeps its shape against the cap: from 2019 to 2025 the veteran deal 90% of the way up the league took 4.7% to 5.1% of that year's cap, and the one 95% of the way up 6.9% to 7.9% (OverTheCap, COUNTED). Rebuilt each year from our own deals instead, the list squeezes pay into the middle (tried and not kept, below).
  - *Measured* (the build, switched on with free agency's prices from the offers, growth and injuries on, seeds d5b-t2 / d5b-t4, PR #86's rookie-class file, eight seasons; week 1, the mean of the two seeds, COUNTED in our walk):

    | Week 1 | Big deals' share of the cap | Middle class's share |
    |---|---|---|
    | 2027 | 39.8% | 23.3% |
    | 2029 | 39.0% | 17.8% |
    | 2031 | 41.2% | 21.9% |
    | 2033 | 39.8% | 22.6% |
    | Real (the league file's 2026 53s) | 39.5% | 21.4% |

    Teams keep 22% of their own expiring middle-class men and 26% of their big-deal men (real 29% and 29%); 11% of middle-class men get no next deal (real 13%). Keeping too few of their own is growth's: with growth off, teams keep 28% to 29% on either list. That waits for the aging thread's redesign.
  - The list is its own setting (`LeagueYearConfig.priceList`, handed to the draft's cut-down by `runSeason`); the cap check takes typical pay with `--market-prices offers`. Off, the cap check is the same, number for number (two seasons, growth off, against the build before).
- **Tried and not kept.**
  - Re-signing a team's own free agents with the room it makes in March (the owner said yes on 2026-11-07, before this test): stars stayed home, but new-team middle-class deals fell from about 210 a year to 123 and the middle class's share from 16% to 12%, as the room went to the team's own big deals first. Not kept: the owner asked instead for the real re-signing windows (above), where a team makes its room in late winter, before free agency, as real teams do.
  - For the quarterbacks (short runs, growth off, 3 seasons): re-signing day giving its room first to the men who lift the team most instead of those worth most over their price; never letting a starter go over value for money; seating the draft picks as if the team's own free agents stayed. None moved the quarterbacks' share by more than half a point: most starters who leave on re-signing day go because the team has no room for them yet (449 of 780 starters over the three re-signing days), which is the March question.
  - Two fixes for a team's own middle class (2026-11-07): counting a backup by the share of a starter's snaps such backups really play (nflverse snap counts, regular seasons 2021-25, COUNTED: a team's fourth receiver 0.49, its backup quarterback 0.27, its second tight end 0.63), and a draft pick filling one hole (seated as if the man judged stays) at what that round's picks are after one season. Together, growth on (the panel above): own-team deals of 2+ years rose (98 / 89 to 113 / 102; in the first season 137 / 133 against 97 / 83), but the middle class's share fell (15.5% / 14.3% to 12.1% / 10.0%), new-team middle-class deals fell (166 / 179 to 118 / 125), big deals rose (39.1% / 38.5% to 42.8% / 41.0%) and more good free agents went unsigned (24 / 36 to 44 / 43). Not kept.
  - A second year on futures and call-up deals: we sign a futures deal for every practice-squad man, so real second-year shares would overshoot. Deferred.
  - Typical pay rebuilt each year from our own deals (with free agency's prices from the offers, growth and injuries on, seeds d5b-t2 / d5b-t4, eight seasons, COUNTED): big deals 41.1%, 33.2%, 24.6% and 18.5% of the cap at week 1 in 2027, 2029, 2031 and 2033, the middle class 22.8%, 22.6%, 38.6% and 43.9%. Our reading, not measured: when every man who signs is paid about what men rated like him typically earn, the spread between men rated alike shrinks, and next year's list is built from those flatter deals. Not kept.
  - On typical pay with the prices from the offers (week 1 of 2029, the same seeds, four offseasons, COUNTED): a re-signing man asking what the open market would pay him (big deals 36.6% of the cap, middle class 19.8%, teams kept 14% of their own middle-class men; every man had four or more teams that wanted him, and his ask ran about 1.6 times his usual one); camp extensions judged like late winter (32.6% and 22.5%; men on rookie deals extended fell from 29 a year to 10); and men with two years left extended too (29.5% and 25.4%). Not kept.
  - Four tries at the ages (two seeds each, none moved them): March free agency also holding seats for a team's coming picks (§3.4's seats before the draft); cut-down weighing a cut's saving up to 6 points; weighing pay over the cheapest man's minimum (a rookie's) instead of the man's own; counting an empty seat as a 56 or 60 man instead of 50.
- **Still open.**
  - The ages, above: tuned with the aging thread's redesign before step 14 goes to the owner.
  - Own-team middle-class deals run at about 55 a year against 155. With the windows, room no longer stops them; value for money does (the windows, above).
  - With growth on the middle class fades from the third season while dead money climbs: cut-down day cuts men signed that same offseason and many of the new class's picks (above). The picks are tuned with the aging thread's redesign; how far ahead cut-down judges a pick (a team's years ahead plus one, at most three, against the real four-year rookie deal) is this ADR's, and waits for that tuning.
  - The quarterbacks' share stays under real (growth on 9.3% / 8.1%, growth off 9.6%, against 10.7%; main 9.4% growth off).
  - Restricted free agents are tendered 3 to 18 times a year (a counted floor of 6 to 22), but 82 / 54 times in 2029. The league file holds its 2026 rookie class on one-year deals: the importer writes a deal OverTheCap's history has no year rows for yet as one year at its average a year (`buildContracts`, "estimated"). For 235 drafted and 69 undrafted rookies paid at least about the rookie minimum that is wrong (the 139 on practice-squad pay are rightly on one-year deals): real rookie deals run four years drafted, three undrafted. So in the walk they are exclusive-rights free agents in 2027 and 2028 and restricted free agents in 2029. The importer should write them whole (the stand-in data fix).
  - Camp extends about 26 men a year; real teams extend about 60 in a deal's last year, at camp and at other times of the year.
  - Cut-down day's re-signing (the third window) waits for the real injured-reserve rule.
  - Two-year minimum deals (futures and call-ups): deferred, above.
  - The importer should strip the league file's placeholder roster bonuses itself (the stand-in data fix).
  - Free agency's prices from the offers and typical pay (above) stay switched off until step 14 is tuned with the aging thread's redesign and goes to the owner.
