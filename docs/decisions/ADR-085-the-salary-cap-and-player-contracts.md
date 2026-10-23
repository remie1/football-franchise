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
