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
discount from 30 (34 for quarterbacks and specialists). Term and structure (bonus share, guaranteed
years) follow his place in the market and his age. With the stand-in league the market is the real one.

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

