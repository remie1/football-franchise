# ADR-086: the player draft, compensatory picks, and the year turning over

- **Date:** 2026-10-23
- **Proposed by:** Orchestrator, for `franchise` (order, picks, boards, rosters, the turnover) and
  `attributes` (the draft class) (thread "Player draft"; plan `/mnt/project-files/design/draft-plan.md`)
- **Status:** design ruled by the owner (Q1-Q9, 2026-10-23), new questions N1-N3 open (§11).
  Contracts edits C1-C7 and rule change R1 proposed, **not approved**. Nothing built.

> Phase note: Charter §6 places franchise at Phase 4. As with the season shell (ADR-078), the owner
> chose on 2026-10-23 to start the draft early, alongside the salary cap (ADR-085) and aging
> (ADR-087), on the condition that nothing here touches engine, playbook, play-caller or calibration
> measurement code, or moves any sim number.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| The calendar has an `OFF_DRAFT` phase (4 weeks) and no roster cut-down deadline; `seasonDeadlines` holds only the trade deadline | `packages/contracts/src/calendar.ts`; `packages/franchise/src/calendar/clock.ts` `PHASE_WEEKS`, `seasonDeadlines` | COMPUTED (read) |
| `DRAFT_PICK_MADE {team, player, round, pick}`, `PLAYER_RELEASED`, `CONTRACT_SIGNED` exist; no event for compensatory awards or waiver claims | `packages/contracts/src/events.ts:536-546` | COMPUTED (read) |
| `PlayerBio.draft` is `{year, round, pick} \| "UDFA"`; `LeagueRules` has `rosterLimit 53`, `practiceSquadLimit 16`, nothing on the draft or the 90-man offseason limit | `packages/contracts/src/players.ts:75`, `save.ts:49-73` | COMPUTED (read) |
| The season command rebuilds every squad from the world seed each season; no players carry into a second season | `packages/calibration/src/season/main.ts` header, `generatedLeague.ts` | COMPUTED (read) |
| `runSeason` with `through: "YEAR"` walks every day to the last day of `OFF_SUMMER` | `packages/franchise/src/season/runSeason.ts` | COMPUTED (read) |
| `attributes.md` §5 calls for a rookie-class generator in `importer/fictional/` | `docs/design/attributes.md:99` | read (spec) |
| NFL draft: 7 rounds of 32 (224) plus compensatory picks; order: non-playoff teams 1-18 worst record first, then playoff teams by round of elimination, champion 32nd; ties by strength of schedule (easier schedule picks first), then division/conference tiebreakers, then a coin flip | NFL draft order rules, public | REPORTED |
| Compensatory picks: a club that loses more or better qualifying unrestricted free agents than it signs can earn picks in rounds 3-7; the formula weighs average salary per year (APY), snaps and postseason honours; at most 32 a year league-wide and 4 per club; released players do not count; only free agents signed before a spring cutoff count (27 April in the 2027 cycle); since 2017 comp picks can be traded | operations.nfl.com comp-pick announcements; nfl.com 2026 and 2027 comp-pick projections | REPORTED |
| The exact weights of the NFL's comp formula are not public | same | REPORTED |
| Special compensatory picks (Resolution JC-2A, 2020): a club whose minority head-coach or primary football executive candidate is hired away as head coach / GM gets third-round picks in the next two drafts, outside the 32 cap (announcements list 35-37 comp picks in such years) | operations.nfl.com announcements ("36 compensatory draft choices to 17 clubs" etc.) | REPORTED |
| Roster rules: 90 players in the offseason; one cut-down to 53 by 4 p.m. ET on the Tuesday after the last preseason weekend (single cut since 2024); practice squad 16, a 17th if he is an international-pathway player; injured reserve does not count toward 53 | NBC Sports "NFL roster cutdown day 2025" explainer | REPORTED |
| Draft class size (~900 prospects), position mix, class-strength wobble, board blur size, scarcity look-ahead, position values, the comp formula's APY tiers | judgement, tuned in D7 | CHOSEN — provenance NONE |
| Names `DraftPick`, `DraftClass`, `COMPENSATORY_PICKS_AWARDED`, `WAIVER_CLAIMED`, `practiceSquad` | named here | CHOSEN — provenance NONE |

## Conjoined mechanisms

Three things are ruled together: the draft, compensatory picks, and the year turning over. They are
**not separately priceable** in the measurement sense: none moves a sim number (they change who is on
a squad between seasons, not how a play resolves). D7 checks each against its own NFL yardstick.

## Implied scope

- **Trades** (players and picks): pick ownership is built to be traded, and the comp-pick logic is
  what makes the owner's Mac Jones example work (a team keeps a backup it could trade because it
  expects a third-round comp pick when he leaves). Trade AI must value expected comp picks. `unruled`
  (no trade system yet).
- **Waivers in season** (claim order switches from draft order to standings after week 3 in the NFL):
  this ADR builds only cut-day waivers. `unruled`.
- **Injured reserve / PUP / NFI lists** (do not count toward 53): needs the aging thread's injuries.
  `unruled`, ADR-087's territory.
- **Postseason honours** as a comp-formula input: no awards exist yet. `unruled`.
- **Draft headlines and draft grades in the news** (ADR-082): the news desk can read the new events.
  `unruled`.
- **The human's own draft screen** (Q5 b later). `unruled`, UI.

## 1. The owner's rulings (2026-10-23)

| Q | Ruling |
|---|---|
| Q1 | **Seven rounds, 224 picks, plus compensatory picks**, modelled on the NFL's system (§5). "Including a system for awarding compensatory picks is a big deal." |
| Q2 | NFL draft order (§4). |
| Q3 | Blurred grades now: combine numbers public and exact, football skills and growth rate blurred per team, less blur with a better scouting director (§6). |
| Q4 | **Between best-available and need, with scarcity**: weigh how far down the board the best player at a needed position is, how severe the need is, and how steep the drop-off at each position is among players likely to be left at the team's next pick (§7). |
| Q5 | Your staff picks for you until there is a draft screen. |
| Q6 | **Match the official rules**: 90 in the offseason, cut to 53 on cut-down day, practice squads (§8). |
| Q7 | Undrafted rookies sign after the draft. |
| Q8 | Rookie quality tuned to the NFL (checked in D7). |
| Q9 | The league starts with the **real current pick ownership** copied from public records; draft classes are **made up**, built to look like real ones. |

Owner context from the cap thread (2026-10-23): players and coaches are stand-ins for the real NFL
ones, copied in every way except name and likeness.

## 2. The year turns over (D1)

Agreed with the aging thread (ADR-087): one loop. `runSeason`'s day walk (`through: "YEAR"`) carries
the offseason, and each offseason step hooks into it on its date; ADR-087's weekly development step
runs inside the same walk, exactly once per calendar week, so this ADR never calls it.

A new season begins: every player a year older; players, contracts, injuries, practice squads and
pick ownership carry over. Nobody retires yet (ADR-087: retirement waits for player personality);
players leave only by being cut and staying unsigned. Whether an unsigned player eventually leaves
the league is ADR-087's open question F2; nothing here builds on it until the owner rules.

Dates (on the current placeholder calendar; moved with it):

| When | Step |
|---|---|
| `OFF_EVAL` | draft order for the coming draft fixed from the final standings and playoff results |
| `OFF_RESET_FA` week 1 | compensatory picks awarded for last year's free-agent moves (`COMPENSATORY_PICKS_AWARDED`); offseason roster limit 90 applies |
| `OFF_DRAFT` week 1 | the draft class is announced with its combine numbers |
| `OFF_DRAFT` week 2 | comp-pick cutoff for this year's free-agent signings |
| `OFF_DRAFT` week 3 | the draft (`DRAFT_PICK_MADE` per pick), then undrafted signings up to 90 |
| `PRESEASON` last week, Tuesday | cut-down day: 53 + practice squads; cut players go through waivers |

## 3. The draft class (D2, `attributes`)

About 900 made-up prospects a year (about 260 drafted, several hundred signed undrafted to fill 90-man
rosters, the rest go home). Each has a name, home region, age 21-23, height, weight, combine numbers
in ADR-087 P2's `PlayerBio.combine` (public, exact, frozen at the draft), the same numbers seeding
the hidden `body` in ADR-087 P1's `development` (with growth rate, `snaps` 0, carry empty), and ADR-085 K5's `PlayerBio.creditedSeasons` 0, every
rating on ADR-079's absolute scale, read through ADR-087 P5's shared measurement scales. Growth is
drawn from its own random stream so adding it never shifts names or ratings. Rookies come in below veterans of
the same talent; ADR-087 grows them. Each class's overall strength and its depth at each position
wobble from year to year. Same seed and season → same class.

## 4. The draft order (D3)

NFL rules as in the provenance row. Each team starts with one pick per round of each future draft
it holds; Q9's real ownership replaces that for the drafts already traded into when the league
starts. Compensatory picks go at the end of rounds 3-7 (§5).

## 5. Compensatory picks (D3b)

Modelled on the NFL's system. The NFL does not publish its weights, so the formula below is our
approximation, checked in D7 against real award counts.

1. **Who counts (a "compensatory free agent")**: a player whose contract ran out, who signed with a
   different team as an unrestricted free agent before the spring cutoff, and who was not released.
2. **His value**: his new contract's APY, ranked against every contract in the league, sets a base
   round (3rd for the top band down to 7th); his playing time last season moves it up or down a
   band (honours later, when awards exist).
3. **Net loss**: each free agent a team signed cancels one it lost of equal or lower value, highest
   first. What is left over earns picks, at most 4 per team.
4. **League total of 32**: if more qualify, the lowest-valued are dropped; if fewer, the rest are
   filled with extra picks at the end of round 7, in draft order.
5. Picks are placed at the end of their round, highest value first, and are tradeable once trades
   exist.

Special compensatory picks (JC-2A) are question N1.

## 6. What each team knows (D4, part 1)

Each team holds a board: its own estimate of every prospect's ratings and growth rate. Combine
numbers are exact. Football skills and growth are the truth plus a team-specific error, with less
error the better the team's scouting director. The engine and the draft results always use the
truth; only the choice reads the board. When the full perception system (`perception.md`) arrives,
it replaces the error and nothing else changes.

## 7. How a team chooses (D4, part 2)

For each prospect still on the board, the team works out:

- **Board value**: its graded quality times how much the team values his position (a quarterback,
  pass rusher, left tackle or corner is worth more than a running back of the same grade; specialists
  rarely before day three).
- **Need**: how badly the team needs the position, from its depth chart (who starts, his age, the
  contract running out), from none to severe.
- **Drop-off**: how much worse the best player at his position is likely to be at the team's next
  pick, given what the teams picking in between are likely to take. A steep drop-off makes taking
  him now worth more.

Example, the owner's: the best player left is at a position the team does not need; the second best
fills a need, so he is the pick. If the first needed player is 10th on the board, the best player
wins unless the need is extreme. If an 11th-ranked player at another needed position is the last
good one at his position before the next pick, while the 10th has several similar players behind
him, the 11th is the pick.

## 8. Rosters and the official rules (D5)

- 90 in the offseason; drafted rookies and undrafted signings fill to 90.
- Cut-down day: each team keeps 53 (best at each spot by ADR-087 P5's shared position overall, the depth every formation needs, a young
  fast-growing player counting in his favour), then fills a 16-man practice squad, a 17th only for an
  international-pathway player (none exist yet).
- Waivers on cut day: newer players (under four credited seasons, ADR-085 K5 `PlayerBio.creditedSeasons`, which the year turn increments) can
  be claimed by other teams in draft order (`WAIVER_CLAIMED`); veterans become free agents at once.
- The league's starting squads gain practice squads (16 each) from the generator.

## 9. Pieces

| # | Piece |
|---|---|
| D0 | This ADR. |
| D1 | The year turns over (§2), with a hook for expiring contracts (ADR-085). |
| D2 | The draft class (§3). |
| D3 | Draft order, pick ownership, compensatory picks (§4, §5); real starting ownership (Q9). |
| D4 | Boards and choosing (§6, §7). |
| D5 | Draft day, undrafted signings, cut-down day, practice squads, waivers (§8). |
| D6 | `season --seasons N`; saves keep picks, classes and practice squads. |
| D7 | NFL check over 20 drafts: positions in round 1, first-round starters in years 1-2, late-round hits, comp picks per year (NFL: 32-37 to 15-17 clubs), cut-day claims. |

## 10. Contracts edits and rule change (proposed, need the owner's typed yes, each by name)

- **C1** `DraftPick { draft: number; round: number; originalTeam: TeamId; owner: TeamId; kind: "REGULAR" | "COMPENSATORY" | "SPECIAL_COMPENSATORY"; overall?: number; condition?: string }` (`league.ts`).
- **C2** `PlayerBio.draft` gains `"PROSPECT"` for a player in a class not yet drafted; `DraftClass { draft: number; prospects: PlayerId[] }`.
- **C3** `LeagueRules` gains `offseasonRosterLimit: 90`, `draftRounds: 7`, `compensatoryPickLimit: 32`, `compensatoryPicksPerTeam: 4`, `cutdown: { phase, week, day }`.
- **C4** `Team.practiceSquad?: PlayerId[]`.
- **C5** events `COMPENSATORY_PICKS_AWARDED { draft, picks: { team, round, kind }[] }` and `WAIVER_CLAIMED { player, from, to }`; `DRAFT_PICK_MADE` gains `overall` and `kind`.
- **C6** `SaveFile.world.draft?: { picks: DraftPick[]; classes: DraftClass[]; freeAgentMoves: unknown[] }` (optional, old saves load).
- **C7** `seasonDeadlines` vocabulary: `CUTDOWN_DAY`, `COMP_PICK_CUTOFF` deadline ids (franchise data, listed here so the ids are agreed).
- **R1** (Charter §4 rule 1, like ADR-079 R1): the season runner in `calibration` may also call `generateDraftClass` (and its input type) in `attributes`. Nothing else.

Exact wording is fixed when each is built and shown before it is made.

## 11. Open questions for the owner

- **N1. Special compensatory picks for minority hires (JC-2A)?** Copying the real league means
  including them, but it needs the game to record which coaches and executives qualify.
  Recommended: (b) leave out for now, revisit with the real-coach importer. (a) include now.
- **N2. Traded picks with conditions.** Many real traded picks carry conditions (a 3rd that becomes
  a 2nd if a player plays 70% of snaps). Recommended: (a) carry the condition and settle it from the
  game's own season (only the common kinds: playing time, playoff finish, pick swaps); (b) lock each
  at its likeliest value when the league starts.
- **N3. First comp picks.** The first draft's comp picks come from real 2026 free-agent moves.
  Recommended: (a) compute them with our formula from the real contracts the cap thread imports,
  and compare with the NFL's own announcement when it comes out in March; (b) copy public
  projections now.
