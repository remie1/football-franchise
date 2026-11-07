# ADR-095: Teams trade players and picks, on the real calendar, through each GM's own eyes

- **Date:** 2026-11-07
- **Proposed by:** Orchestrator, for `franchise` (trade talks, values, cap moves, the physical) and
  `narrative` (rumors, deadline news, fan demands). Thread "Design the trade system".
- **Status:** design. Q1-Q8 ruled by the owner 2026-11-07 14:07Z (all a; Q1, Q2 and Q5 with notes);
  his second round 14:15Z added full offers to the call (Q1), curve templates (Q2), and ruled P1 and
  P2 yes. Contracts edits X1-X4 (§11) are proposed and wait for a typed yes at build. Nothing is built.
- **Proposal doc (plain words, the questions as put to the owner):**
  https://claude.ai/artifact/GdRrnN3veZoq5uQaczG34u
- **Origin:** the owner, 2026-11-07 13:43Z: *"I just realized that we don't have a trade system yet."*
  No thread planned one; ADR-081, ADR-085, ADR-086 and ADR-094 each left hooks for it.

> Phase note: like ADR-081, ADR-084 and ADR-094, this is franchise and story work started before
> Charter §6 reaches it, on the owner's direction. Nothing here touches the engine, playbook,
> play-caller or calibration measurement code, or moves any sim number or seed. Trades sit behind
> their own switch, off by default, until the many-season check (§10 step 7) passes.

## Provenance of factual claims

| Claim | Source | Kind |
|---|---|---|
| The only trade piece today is the deadline: `LeagueRules.tradeDeadline` = REGULAR_SEASON week 10 day 2 (Tuesday after week 9's games) | `packages/contracts/src/save.ts`; `franchise/src/calendar/clock.ts` `seasonDeadlines` | COMPUTED (read) |
| `TRADE_EXECUTED` exists with payload `{ teams }` only, never emitted | `packages/contracts/src/events.ts` | COMPUTED (read) |
| `DeadMoneyReason` and `ContractEndReason` already carry `"TRADED"` | `packages/contracts/src/players.ts` | COMPUTED (read) |
| Staff attribute `marketSense` ("what a player would fetch in a trade or cost on the open market") exists | `packages/contracts/src/registry.ts` | COMPUTED (read) |
| Traded picks carry a `PickCondition` (PLAYING_TIME, PLAYOFF_FINISH, PICK_SWAP, OTHER); swaps settle in `draftPicks` | `contracts/src/league.ts`; `franchise/src/draft/order.ts` | COMPUTED (read) |
| Weekly GM stance BUY / HOLD / SELL, argued with the head coach | `franchise/src/winNow/stance.ts` (ADR-094 §3-§5) | COMPUTED (read) |
| A GM's guess at a man's change, refreshed at the new league year, cut-down day and after week 9's games | `franchise/src/cap/ahead.ts` (ADR-085 step 13) | COMPUTED (read) |
| Release money (acceleration, post-June-1 split) and restructures | `franchise/src/cap/money.ts` `releasePlayer`, `restructure` | COMPUTED (read) |
| 853 trades in 2016-2025, about 85 a season (50 in 2016, 86-102 since 2018); about 62 players a season | nflverse `nfldata/data/trades.csv`, downloaded 2026-11-07, counted by trade_id | COMPUTED (counted) |
| 38% picks only, 57% players and picks, 5% players only | same | COMPUTED |
| Timing: 17% Feb to mid-April, 42% draft week (20 April to 3 May), 3% May-July, 22% August to 9 September, 16% in the season to the deadline | same, by trade date | COMPUTED |
| Players moved in October-November: 7-9 a year 2016-2018, 21-23 a year 2024-2025 | same | COMPUTED |
| 8.5% of traded picks carry a condition; traded picks are 66% this year's draft, 24% next, 9% two out, 1% three out | same | COMPUTED |
| Last in-season trade each year: the Tuesday after week 9 in 2024 and 2025 (31 October to 5 November since 2016) | same | COMPUTED |
| The list may miss small trades in early years (2016 looks low) | my reading of the counts | CHOSEN (judgment) |
| Trade money: the receiver takes remaining salary and future years; the sender's unamortized bonus accelerates, split after June 1; no salary retention; both clubs under the cap; a tagged man must sign first | NFL CBA as commonly reported; matches ADR-085's release rules | REPORTED (not re-read for this ADR) |
| Voided or changed for a physical: Ballage 2020, Otah 2012 (seven days to pass), Roberts, Harrison 2011 (voided); Lane 2017 (adjusted, picks added); Crosby March 2026 (Ravens backed out, widely doubted as the real reason) | [WPTV](https://www.wptv.com/sports/football/dolphins/kalen-ballage-trade-voided-after-running-back-fails-physical), [CBS Otah](https://www.cbssports.com/nfl/news/jets-trade-for-jeff-otah-is-voided), [CBS Crosby](https://www.cbssports.com/nfl/news/ravens-maxx-crosby-trade-fallout-raiders-nfl-reaction/), [PFN](https://www.profootballnetwork.com/ravens-history-backing-out-trades-maxx-crosby-decision/) | REPORTED (search summaries) |
| The old chart: 3,000 points for pick 1, 590 for pick 32 | my memory of the Jimmy Johnson chart | REPORTED (unchecked; checked at build) |
| Next year's pick traded as about a round lower | widely reported rule of thumb | REPORTED (not counted) |
| Every share, tilt, discount and chance below | none | CHOSEN (tuned at the many-season check) |

## 1. The real rules copied

- **Windows:** the new league year to the trade deadline; picks also trade while the draft runs. No
  trades after the deadline until the next league year. A trade agreed before the deadline may finish
  its physical after it.
- **What moves:** players under contract; picks up to three drafts ahead, compensatory picks included;
  conditions of the kinds `PickCondition` already holds (8.5% of real traded picks).
- **Money:** the receiver takes the rest of this year's salary from the trade day (in the season,
  the weekly checks left of 18) and every later year. The sender takes the unamortized bonus now as
  dead money (`DeadMoneyReason "TRADED"`); after June 1, this year's share now and the rest next year.
  No salary retention; a pre-trade restructure is the only way to send money along. Both clubs must
  be under the cap after the trade.
- **Who can't move:** a tagged man before he signs; a man with a no-trade clause unless he waives it
  (Q6, §7).
- **No rule reads a position** (owner, 2026-11-06).

## 2. Talks start with a call (Q1 a, with the owner's notes)

Computer GMs trade with each other and with the user, and call the user too. A talk moves in steps:
call, asking price, offer, counters (a few rounds), agreed pending the physical, done. Either side
can stop at any step.

Owner (14:07Z): *"a team should be able to reach out and say that they're interested in a player,
or ask if the game player would be interested in one of their specific players."* Owner (14:15Z):
*"they can mention whether they're interested more in trading away a player or trading for a
player, and already have a proposal ready to go. This way, the game player will have a better idea
how to adjust the trade."*

So a call has three shapes: interest only, interest with an asking price, or a full offer. It names
its direction: shopping a player, buying a player, or moving up or down in a draft. With an offer
the GM gives his reasons in plain words, drawn from the terms of his value (§3): help now against
later, salary, this year's pick against next year's. A weak GM's reasons are noisier and can
mislead (his error showing); no GM states numbers. How often a GM leads with a full offer is his own
style, drawn once (open key `tradeStyle`).

Some calls leak (a reporter's chance, ADR-082): "teams have called about X". A team that keeps
getting calls about a man raises his asking price.

## 3. What a player is worth to a team

Built on ADR-085's value and look-ahead so a GM judges a man the same way signing or trading for him:

1. his expected play over the team's look-ahead (contend 1, retool 2, rebuild 3; backups one more),
   from `rateAhead` with the GM's error;
2. against his cost: cap numbers and guarantees over those years, against the market price of the
   same play;
3. fit: how much he lifts this team's lineup, not an average team's;
4. the week's stance (ADR-094): BUY pays more for help now, SELL wants picks and young men;
5. the GM's `marketSense` and scouting set the size of his error (Q8 a).

## 4. What a pick is worth (Q2: a and b combined; owner's corrections 14:20Z and 14:37Z)

Owner (14:37Z): the production and market curves are *"objective curves that all GMs should
consider as part of the blend"*; curves like his two are *"the subjective curves ... every GM gets
assigned one curve as part of their GM profile"*, permanently, added to the blend with the
objective curves and the team's course.

- **Objective (every GM, the same numbers):** the **Production curve**, what the players taken in
  each slot turn into in our league (measured from our own drafts), and the **Market curve**, what
  teams pay each other for picks (counted from real pick-for-pick trades at build). Weighed half and
  half to start (CHOSEN).
- **Subjective (his own):**
  1. **His GM curve**, one of the variations below, assigned when he is made and kept for his career
     (open key `pickCurve`, its own fork `franchise:pickCurve`, by his id). The draw leans on his
     background (ADR-094 §10) but is never fixed by it.
  2. **The team's course**: rebuilding about +10%, contending about -10% on pick value (owner's
     ruling; the 10% is CHOSEN).
  3. **His future-pick dial**: his markdown of next year's pick against this year's (open key
     `futurePickDiscount`, own fork), centered on about a round lower (REPORTED rule of thumb).
  4. **His error**, from market sense and scouting (Q8 a).
- **Combined:** value = 80% objective + 20% GM curve (CHOSEN, tuned), then the course tilt and the
  future-pick dial, then his error. Every GM curve is scaled to the same whole-draft total, so it
  moves value between rounds and never inflates the draft.
- **GM curve variations** (how common each is: CHOSEN): **Top-heavy** (owner's curve 1; common),
  **Middle rounds** (owner's curve 2; rounds 2-4 best), **Top-ten or bust** (rare), **Day two**
  (rounds 2-3), **Late-round finder** (rounds 5-7; rare), **Volume** (every pick near equal; rare),
  **Even-handed** (close to the objective; common).
- **Real numbers behind the shapes:** nflverse `draft_picks.csv`, drafts 2000-2016 (4,372 picks),
  value to the drafting team (`dr_av`) by pick, with our real 2026 rookie scale for cost. Production
  indexed to pick 1 = 100 runs 91 (picks 2-5), 62 (21-32), 38 (49-64), 23 (97-128), 7 (225-262).
  Per rookie dollar it peaks at picks 33-128, about 2 to 2.5 times a top-5 pick, and falls in rounds
  6-7: the real ground of the Middle rounds view. COMPUTED. The old chart's 3,000 for pick 1 and 590
  for pick 32 are REPORTED from memory, checked at build.
- **Expected compensatory picks count** (ADR-086 N2, the owner's Mac Jones example).

## 5. Computer teams trade among themselves (Q3 a, Q4 a)

Each trade day a few GMs shop or call, more in the windows the counts show (new league year, draft
week, cut-down week, the two weeks before the deadline). A trade happens only when both sides think
they gain by their own eyes. Volume is not set; the counts in the provenance table are the check
(§10 step 7). Draft-day trading moves teams up and down while the draft runs (about 32 pick-only
trades a real year).

## 6. The physical (Q5 a, P1 yes, P2 yes)

1. An agreed trade waits for the receiving team's physical, at most seven days. He stays with his
   old team until then.
2. The exam reads the public injury and part of what is hidden (ADR-087 §7: lasting cost of old
   injuries, body wear). P1: the team's head trainer and strength staff (`STRENGTH`) read it for now;
   their rating sets how much is seen. A team doctor role may come later.
3. Results: clean, concern, fail. A concern or fail lowers the receiver's expected availability or
   years.
4. The receiving GM re-values and chooses: go ahead, ask to adjust (less in return, a PLAYING_TIME
   condition on a pick, or more from the sender, as in the Lane deal), or cancel. The sender answers
   an adjust with yes, a counter, or no.
5. P2 (the Crosby case): a GM whose value of the deal has fallen since it was agreed (stance flipped,
   losses) may cancel on a concern as cover. Only when the exam found something. Costs: a ledger move
   between the two GMs (new move `BACKED_OUT_OF_TRADE`, a free string, CHOSEN size) and news that
   doubts the reason.
6. After a void: nothing moved and no cap change. The finding leaks with a chance; when it does, every
   other GM's availability guess for him drops. His body is unchanged. His view of his team takes a
   hit (ADR-084 move `TRADE_VOIDED_SENT_BACK`, free string). News and podcast stories either way.

## 7. Players, coaches and fans (Q6 a, Q7 a)

- **No-trade clauses:** copied from real contracts for the stand-ins; made-up players rarely get one,
  by their own negotiation (ADR-085 §4). Contracts edit X3.
- **Trade requests:** a later step, from personality and playing time.
- **The head coach** lobbies through ADR-094's weekly argument; trading a man he backed already costs
  the relationship (ADR-084, −2).
- **News:** rumors, deadline headlines and fan trade demands (the podcast thread's ask), all from the
  trade events.

## 8. The user's seat

Trade decisions carry authority `GM` (Iron Rule 6). When the user holds the GM seat, computer GMs
call him and he answers or calls them; the computer head coach lobbies him (ADR-094 §5). When the
user holds only the coach seat, his computer GM trades and the user argues the stance. Text first;
the trade screen comes with the UI phase.

## 9. Saves

Open talks, pending physicals and leaked findings are saved (X4), so a save made mid-talk reloads the
same talk.

## 10. Build order

1. Contracts edits X1-X4 (typed yes each).
2. Trade money in `franchise/src/cap/` (sender and receiver, June-1 split, both-under-the-cap check),
   with tests.
3. Pick values: the measured curve, the templates, the blend, with tests.
4. Player value to a team (§3). Waits for cap step 14 and the aging redesign.
5. Computer-to-computer talks on the calendar, draft-day trading, the physical. Waits as step 4.
6. The user's talks (text).
7. The many-season check against the counted figures above.
8. News, rumors, fan demands (`narrative`).

## 11. Contracts edits proposed (not made)

- **X1** Trade events: `TRADE_CALL` (direction, pieces asked about), `TRADE_OFFER` (pieces, reasons),
  `TRADE_AGREED`, `TRADE_PHYSICAL` (result), `TRADE_ADJUSTED`, `TRADE_VOIDED` (reason, pretext flag);
  `TRADE_EXECUTED` grows to `{ tradeId, pieces, capMoves }`.
- **X2** Types `TradePiece` (player or pick, from, to, any condition) and `TradeTalk` in `league.ts`.
- **X3** `PlayerContract.noTradeClause?: boolean`.
- **X4** Save: open talks, pending physicals, leaked findings.

Open keys with no edit: `pickCurve`, `futurePickDiscount`, `tradeStyle` on a GM's ratings; ledger moves as free strings.
