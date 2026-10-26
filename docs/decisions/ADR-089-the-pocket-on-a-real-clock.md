# ADR-089 (DESIGN): the pocket on a real clock: the block lost over time, three moments in the pocket, the quarterback's own count

- **Date:** 2026-10-24. Revision 1 the same day (after verification round 1, round 2 and the settle of round 2's rechecks, Appendix C). **Revision 2 the same day, after the owner's answers to all 18 questions** (§R), **settled the same day after three checkers' 53 findings** (Appendix C).
- **Proposed by:** Orchestrator synthesis of three independent designs (pkA line-first, pkB quarterback-first, pkC clock-first) and two judges' verdicts; vehicle **pkA**, grafts listed in Appendix A. Revision 2 is the Orchestrator's rewrite from the owner's answers, the two-moments model and four revision-2 readers: free-runner (`FR`), clean-pocket (`CP`), change-map (`CM`) and totals (`TOT`).
- **Status:** **DESIGN, revision 2, 2026-10-24: all 18 owner questions are answered; question 19 (the free runners' snap-spot table, §15.2) was answered **Wait** on 2026-10-25 01:37Z; nothing is built.** **2026-10-25: the owner chose a new branch for this work (01:38Z) and typed the yes for P1 (01:38:16Z, "Yes, make contracts edit P1"); step 0 started. The owner also chose (01:42:55Z) to design where every man stands at the snap now, as its own design; **step 3 waits for that design**, and Wait stands until it lands.** Step 0 starts only on the owner's word, and waits for the owner's answer on the branch card (a new branch, or PR #33's) and the typed yes for P1 (recheck). Nothing in `packages/contracts` changes before the owner's typed yes naming each petition, asked at the step that needs it (§7). The Orchestrator defaults of §15.3 stand unless the owner overrules one. **The owner never merges:** each step comes to the owner with its numbers and needs the owner's word before the Orchestrator merges it.
- **Subject:** calibration backlog entry 100, "the pocket fix".
- **Builds on / amends:** ADR-059 (rep drawn once; its per-tick die and the push window, §4.1), ADR-058 (arrival authoritative for a won rep; owner-ratified August 2026; kept), ADR-033 (the owner's July 2026 amendment of §7.2, limbs (a) and (b), `ADR-033:34-38`; **kept as ruled by the owner's answers 1 and 3**), backlog entry 76 (the finite, derived pressure horizon; **applied** by its own rule under question 3 "Follows"), ADR-049 (the two pressure channels), ADR-060 (the sack is physical; the no-target sack becomes contact), ADR-061 (interior travel; not touched), ADR-056 (throwaway causes; a third), ADR-030 and ADR-031 (the free runner's 1.5 s and its path table, replaced by a physical clock with the speed term ADR-031 recorded as a separate petition, `ADR-031:116-119`), ADR-066 (the decomposition is filled for free runners; the August halt's step 3 is loosened for free runners only if the owner answers question 19 "Table now", and for down linemen only if the owner answers "Wait" (their line-up spot taken as their snap spot), and stands for everything else, §4.4.3, §7.2), ADR-073 (the call's disguise is read as a snap fact for free runners, §4.4.3; a front look is never read, so its invariant that physics never reads the shown rush stands, as does ADR-069 ruling 1), ADR-055 (escape direction and the catch by side, §4.7), ADR-012 (domain exercises domain), ADR-077 (check-release, switched on only once this fix passes), `match-engine.md` §7.2 (the forcing rule becomes "must act", per rusher), the game loop's two-minute flag and the goal-to-go distance in the play outcome and the game loop (step 8a), and `calibration.md` §5.2 item 2 (the patience exception). **No longer touched under the answers:** ADR-033's limbs (questions 1 and 3), ADR-058's removal of a second won-rep channel (question 3 was not "Past him"), ADR-022 and the owner's 16 October checkdown ruling (question 13 "Own design"). §7.2 lists each amendment with the answer that triggers it, and §7.3 what moved to later designs.
- **Number:** ADR-085 to ADR-087 exist in `/mnt/project-files/design`; `standin-league-plan.md:53` reserves 088 for the R0 design note; `docs/decisions` stops at ADR-084 (CHECKED in revision 1, `ls`). So **089**.
- **Precedent for the stepped shape:** ADR-073, the one merged stepped build (ADR-077's design is unbuilt, `ADR-077-design-note.md:3`).

> **WARNING 1 (ADR-073 house style). Steps 1 to 4 make the game look worse on paper. That is expected and is not a result.** With the line slowed and the quarterback's count untouched, sacks fall to 2.41 (flat) and 2.44 (gen) in 100 against a real 6.56, and throwaways rise to 17.40 and 9.59 in 100 from 5.46 and 2.90 (REPORTED, pkA arm A12 at today's clock; J1 and J2 each re-ran it and matched). With a stand-in longer hold, revision 1's test runs give sacks of 2.0 to 6.0 in 100 (COMPUTED in revision 1, Appendix B). **No graded row is scored before step 5b.** Every step lands behind a switch that is OFF. Default play moves in exactly one commit, step 11. **And every prediction beyond the line's clock rests on mechanisms that are not built in engine code:** the rated contact and its approach tilts, the throwing motion and its arrival reading, the clean-pocket checklist, the drop floor, the real throwaway rule, sight and the alarm, make-him-miss, `SLIDE_POCKET`, the push window, must act per rusher, the physical free-runner clock, the late weak block for touched men, the side-aware escape and catch, the contact choice, the two step-8a fixes, the situation term, callers v1 to v6 and a second seed set. Revision 2's readers ran `vi.mock` stand-ins of some of them (the free-runner clock, the push window, the side-aware escape, contact by approach, the free-runner half of the alarm, the motion's accounting; Appendix D). None is engine code, and Appendix D says what each is not.

> **WARNING 2 (restated in revision 2 from `TOT` §11.1). The hit count and the pressure clock pull against each other through one channel: rushers nobody blocked. The owner has ruled how such a man moves: from where he starts, at his own speed and acceleration, to the depth of the drop, and never as a late block (question 4, §4.4). Measured as a stand-in, that clock is fast, as it should be: a throw at 2.0 s with such a man on the play is pressured 99.4 to 100 times in 100 (REPORTED, `TOT` §7). So the open question is no longer when they arrive but how many there are.** In the generated league there are about 16 to 18 completely unblocked men per 100 dropbacks (18.1 on base gen, `FR` §6; 16.3 to 16.8 under the stand-in arms, `TOT` §4.3; two on one play count twice), against PFF 2013's about 6 to 8 unblocked pressures per 100 dropbacks; the units differ (men against pressures), so the ratio of about two to three is INFERRED (`TOT` §6). Such men make 32 to 41 in 100 of the hits-or-sacks on the continuous reading, against a real 18 to 23 (PFF's unblocked hits and sacks; INFERRED, `TOT` §6).
>
> **At that supply,** with every answered piece the readers stood in (free-run clock, push window, side-aware escape, contact by approach, the free-runner half of the alarm), **on reading (c)** (every free runner on the free-run clock, a touched man +0.5 s; not default D19's reading (b), whose touched men's late block was never built or run, §4.4.2), and the throwing motion read continuously (not run: the count, sight, the checklist, question 8's scoring, the situation term and step 8a's fixes; Appendix D.2), hit-or-sack is 21.40 and sacks 5.65 at the stand-in hold (time to throw 3.02 s), and 16.00 and 3.83 at a hold nearer real (2.53 s); the 2.0 s check fails at the stand-in hold (50.0 against 36.2 on raw seconds) and is borderline at the hold nearer real (37.15 +- 0.60 on gen, a gap inside the league-to-league spread of 0.9 to 1.6; 31.0 on flat, a pass), and the quick-pressure share fails (71.7 to 80.8 against 30 to 55) (REPORTED, `TOT` §4.3-§4.5, §5).
>
> **With the supply cut to about real** (a stand-in for a protection design that this ADR does not contain), the 2.0 s check passes (24.2 to 35.2) but sacks fall to 2.40 to 3.76 in 100, the sack share stays at or below about 34 on the continuous reading even with every contact a sack and the unrun pieces at their upper bounds (INFERRED, `TOT` §9, which builds every such row from measured ones; the grid reading's ceiling in the same arm is 50.5, `TOT` §4.3, §8.3), and the quick share still fails (57.1 to 67.8) (REPORTED, `TOT` §4.3-§4.4).
>
> **No setting of the stand-ins passes sacks, sack share, the 2.0 s bin and the quick share together** (42 arms on two leagues, `TOT` §0). **This is the design's central open risk. It is not resolved by timing.** Step 3's band is filed at step 0 from the engine-free measurement M8 (§6.0), and a miss goes to the owner under the miss rule filed at step 0 (default D31, §6.10). Step 3's snap-spot arms also wait for the owner's answer to question 19 (§15.2). **No late block, no uniform delay and no refit of the free-run constants is ever a fallback for a completely unblocked man.**

> **WARNING 3. The curve this design uses to choose the block clock cannot be read until a throw takes time to leave.** In all 17 of revision 1's test runs, base included, the sim's hit rate on thrown balls **falls** with release time (flat base apart from one bin holding 0.07% of its releases; shape S theta = 13: 5.7 / 5.9 / 0.4 / 0.6 / 0.4 / 1.6 / 0.6 per 100 aimed throws across the seven bins of §2.2), where the real curve rises (1.9 to 18.0 on the decision-tick grid, 2.7 to 18.0 in raw seconds; COMPUTED in revision 1). So the block clock's shape and scale are chosen at **step 5b**, after the throwing motion (step 4) and the quarterback's count (step 5a), not at step 1 (§4.1). **Revision 2 adds: on the throwing motion, when a beaten blocker's man reaches the quarterback decides 6 to 8 hits in 100 and whether the hit curve rises at all** (REPORTED, `TOT` §8.5: on the half-second grid the curve still falls, 5.2 / 3.5 / 4.3 / 2.4 / 1.3 / 1.0 / 2.6; read at his breaking time plus his travel it rises, 7.4 / 8.7 / 11.4 / 10.1 / 22.7 / 14.2 / 11.5). **The rule is filed at step 0 (default D21: his breaking time plus his travel), never chosen by a fit.** On that reading the contact boundary b cannot reach the real sack share in any stand-in arm (its ceiling with every contact a sack is a share of 24 to 36 against 44.6, `TOT` §8.3); §6.10 records that as a reachable-range report, never a reason to widen b.

**Citation keys.** `maps/` = `/tmp/claude-0/-home-claude-football-franchise/6c81441b-6f64-5504-9ead-dcff7a2b1f80/scratchpad/pocket/maps/{history,engine,requirements,realdata,spec,gaps}.md` (copies in `/mnt/project-files/arms/pocket-fix/design-wip/maps/`). `OWN` = `/mnt/project-files/design/free-rusher-sack-check.md`. `TECH` = `/mnt/project-files/design/free-rusher-sack-check-technical.md`. `MEAS` = `/mnt/project-files/arms/free-rusher-check/out/measure/results.md`. `RES` = `/mnt/project-files/arms/free-rusher-check/out/research.md`. `INTDOC` = `/mnt/project-files/design/generated-league-interceptions.md`. `k2out/` = K2's saved re-run outputs in `.../scratchpad/pocket/k2out/`. **Revision 2 adds:** `R1:<line>` = revision 1, `/mnt/project-files/arms/pocket-fix/design-wip/revision1/ADR-089-revision-1.md` (byte-for-byte the file this revision replaced at `/mnt/project-files/design/ADR-089-the-pocket-on-a-real-clock.md`); `OWNF` = the owner file `/mnt/project-files/design/ADR-089-questions-explained.md`; `TMP` = the two-moments owner page `/mnt/project-files/design/ADR-089-two-moments-explained.md`; `TM` = the two-moments technical model `/mnt/project-files/arms/pocket-fix/design-wip/two-moments/model.md` (its measurements C1 to C3); `NEWQ` and `QCH` = `newq.json` and `qchanges.json` beside it; `DEF` = `/mnt/project-files/arms/pocket-fix/design-wip/round2/defaults.json`; and the four revision-2 readers in `/tmp/claude-0/-home-claude-football-franchise/6c81441b-6f64-5504-9ead-dcff7a2b1f80/scratchpad/pocket/rev/` (copies in `/mnt/project-files/arms/pocket-fix/design-wip/revision2/`): `FR` = `free-runner.md`, `CP` = `clean-pocket.md`, `CM` = `change-map.md`, `TOT` = `totals.md`. Engine paths are relative to `packages/engine/src` unless stated; line numbers are at main `8b387f7` in the working copy `/tmp/claude-0/-home-claude-football-franchise/6c81441b-6f64-5504-9ead-dcff7a2b1f80/scratchpad/pocket/copy`. `pkA`/`pkB`/`pkC` are the three designs; `J1`/`J2` the judges; `V1-nn`/`V2-nn`, `K1-nn` to `K4`, `R1-nn`/`R2-nn` the verification findings of revision 1, settled in Appendix C. **Tags:** CHECKED (read in code or file; in revision 2, re-read by the writer unless a reader is named, as "CHECKED, FR"), COMPUTED (measured or calculated by the author of the revision named; revision 1's arms are Appendix B), REPORTED (from a named designer, judge, verifier, checker, map or reader), REPORTED-UNREPRODUCED (a measured figure a later checker re-ran and did not reproduce), CHOSEN (a declared dial with no provenance beyond football judgement) or INFERRED (not checked). "Revision 1's test runs" are Appendix B; "the readers' arms" are Appendix D. **The writer of revision 2 ran no new arm**; every revision-2 measurement is a reader's, REPORTED, except the settle's quick-share floor (§2.4) and the class (i) threshold arithmetic (§4.4.6), COMPUTED in the settle.

---

## R. Revision 2: the owner's answers, and what each changed

The owner (Homie, they/them) answered all 18 questions on 2026-10-24; every answer binds. Questions 1 to 14 are the cards of revision 1 (`OWNF`); question 5 was replaced by the contact card and questions 15 to 18 were added after the owner's two-moments message (`TMP`, `NEWQ`). Questions 4 and 7 were answered in the owner's own words, quoted in full in §15.1.

| # | the question, short | answer | what it changed | where |
|---|---|---|---|---|
| 1 | a blocker beaten but still in front: pressure? | **Today** | The July ruling stands (ADR-033 limb (b)); no tunables change. With the push window (question 16) a bull rush winning by 1 to 14 now reads PRESSURE on the half second its block breaks (when it breaks at 1.0 s or later), so revision 1's "changes nothing under shape S" is withdrawn. | §4.2 |
| 2 | must he act when a rusher is half a second away? | **Half** | `arrival.collapsingWithinSeconds` 1.0 -> 0.5, made per rusher: he must act when a rusher he has registered is within 0.5 s, when any rusher arrives, or when his count runs out (as question 7 decides). The running count of block grades alone no longer forces him. | §4.3 |
| 3 | how far out a loose rusher means pressure | **Follows** | The warning is re-derived by the July arithmetic to 1.0 s and stays a status only. Must act reads the same tunable as the forcing point, so the derivation stays tied to it. "Past him", and its reversal of ADR-033 limb (a) and entry 76, leaves the design. | §4.3 |
| 4 | rushers nobody blocked | **the owner's words** | A completely unblocked rusher is never a late block; he arrives by his starting position, his acceleration and speed, and how far back the quarterback drops; if the quarterback sees him, at a certain point he sets off the alarm. Revision 1's late, weak block survives only for a man somebody got a hand on (default D19); the uniform delay is no longer anyone's fallback. Where he starts needs a placeholder table ahead of the pre-snap phase the August halt waits for, which is the owner's call: question 19, open (§15.2). | §4.4, WARNING 2 |
| 5 | contact (replacing "nobody open") | **By approach** | A rusher's hands on him with the ball still in his hand: a man open enough, the ball goes; never seen, no choice; otherwise he fights or throws it away; the hit is tilted by how the rusher came. Revision 1's Elusiveness option and its registry petition leave the design (default D11). | §4.5 |
| 6 | a throw takes a moment to leave | **Now** | About a third of a second, less with a better Release rating; a rusher inside it hits him as he throws (`QB_HIT`) and the ball still goes, with the existing accuracy penalty. Revision 2 files when a beaten blocker's man reaches him (default D21). Revision 1's notes on "Later" are deleted. | §4.5 |
| 7 | his count runs out, clean pocket | **Keep, widened by the owner's checklist** | Keep-looking becomes the owner's four-item checklist: the checkdown; pocket movement (a climb or slide that restarts his reads); the scramble drill (each receiver a fresh chance); scramble for yards or throw it away. Gone wrong, it is the coverage sack. Who the checkdown is, extra outlets and routes that change go to question 13's design; receivers breaking toward his side are built here from each route's break lane on the card (default D24). | §4.6 |
| 8 | a scrambler tackled at or behind the line | **Sack** | As revision 1: a sack in all three readers, and the scramble starts where he is. Question 17 now credits the man actually there. | §4.7 |
| 9 | throwing it away | **Real rule** | As revision 1, and the same rule now also decides a throwaway with a hand on him at contact and after a clean break-out. | §4.7 |
| 10 | a slide off an inside rusher | **Yes** | `SLIDE_POCKET` is his own call; widened (two-moments page and question 7) to a bull rush on either side and a clean expiry; once a play in all. | §4.8 |
| 11 | a patient quarterback | **Yes** | The named exception to "better rating, better outcome" for patience in the pocket; every other new rating read carries a monotone probe. | §4.8 |
| 12 | what he weighs | **All** (not the recommendation) | Down, distance, score and clock. The two-minute flag (which fires every quarter) and the goal-to-go distance are fixed first, at a new step 8a, before step 8b reads them. | §4.9, §6.8 |
| 13 | hot throws after the snap, extra outlets | **Own design** | Step 9b and its two petitions leave; their design follows the interception design, with who the checkdown is; receivers breaking toward his side, by each route's lane, are built here at step 6 (D24). | §6.12, §11 |
| 14 | the plan | **Yes** | Twelve numbered steps (0 to 11), with 5 and 8 in halves and no 9b; every step OFF with by-name replay proofs; one flip commit. | §6 |
| 15 | the alarm | **All** | A first moment when he registers a particular rusher, with every reaction on the list, make-him-miss included (`SIDESTEP`). | §4.0, §4.8 |
| 16 | a bull rush before the block breaks | **Yes** | The push window under shape S: losing ground, then beaten but in front, then a hand on him with the blocker still on him. | §4.1 |
| 17 | running into a man he had not seen | **Yes** | When he moves to one side, an unseen rusher there can get him, even one still in his block (on a run); on a slide an unseen loose rusher arrives sooner. | §4.7 |
| 18 | the unseen-tackler fumble rule | **Later** | Its own short design after the interception design. This fix writes how the rusher came and whether he was seen on every `QB_HIT`. | §6.12, §11 |
| D1-D10 | the Orchestrator's round-2 defaults | **stand** | D9 (the interception guard) is refined by D28 (read by throw class), because default D23 removes a whole class of throws. | §8, §15.3 |

**What revision 2 does not change:** the block clock's two shapes and its selection rule (D1), the five fitted dials, the graded rows and their bands, the interception rules held fixed, the replay and save handling, the contest's reads and its second-arrival rule, and every real target of revision 1. Each is kept with its evidence; where a number moved, the change log says so.

---

## 0. The design in brief

Today about five in six of the reps a rusher wins are won on the very first half-second tick: 32% of offensive-line one-on-ones are won at 0.5 s, against 37.9% by 2.5 s (REPORTED, `maps/engine.md:145`, `:255`). A won rep becomes a travelling rusher who floors the pocket one to two seconds before he gets anywhere; the floor forces the quarterback to decide; and an arrival is a sack unless a receiver clears the low desperation bar that tick (about 3 in 10 generated-league arrivals end in a throw, §1). The quarterback's count runs out at 1.0 to 1.5 s on most plays, and he cannot throw the ball away before 2.0 s. A rusher nobody blocked arrives on a fixed clock that reads no rating, no snap spot and no drop (`resolve/rushThreat.ts:507-525`, CHECKED). In a clean pocket he never moves and is never sacked (`CP` §1.3, §1.9).

This design does six things, in this order:

1. **Every block gets its own clock.** A block is lost over two to three seconds, sooner for a bigger mismatch; a bull rush shows its push for a second before it breaks (question 16). Two candidate shapes are built at step 1 and one is chosen at step 5b by a rule filed at step 0 (§4.1).
2. **Pressure keeps the owner's July meaning** (questions 1 and 3), and the quarterback must act when a rusher he has registered is half a second away (question 2), per rusher (§4.2, §4.3).
3. **A rusher nobody touched runs on his own physical clock** (question 4, in the owner's words): from where he is at the snap, at his own speed and acceleration, to the depth of the drop, and never as a late block. A man somebody got a hand on is a late, weak block (default D19). Where he starts comes from a small table ahead of the pre-snap phase only if the owner answers question 19 "Table now" (§4.4, §15.2).
4. **The pocket has three moments** (question 15 and the owner's two-moments message): **the alarm** (he registers a particular rusher and may adjust), **must act** (question 2's half second), and **contact** (a rusher's hands on him with the ball still in his hand, decided by how the rusher came, question 5). Each dangerous rusher carries a small card: how he is coming, from where, which side, how fast, and whether he has been seen. A throw takes a moment to leave, so he can be hit as he throws (question 6). Moving to a side can take him into a man he never saw (question 17) (§4.0, §4.5, §4.7, §4.8).
5. **Then the quarterback:** his count and the owner's clean-pocket checklist (question 7), his outs (questions 8 and 9), his feel and the slide (questions 10 and 11), the situation with score and clock once two bugs are fixed (question 12), the scheme (§4.6 to §4.10).
6. **After this fix:** the interception design, then the fumble design (question 18) and the hot-throws and outlets design (question 13), in that order by default D30 (§6.12).

Five dials are fitted, in a filed order, each declared with what it is blind to; everything else is chosen and shown to the owner, or a prediction filed before its arm runs (§6.10). WARNING 2's supply problem is not something this design can fix; a miss is classed and taken to the owner by the rule filed at step 0 (default D31).

---


## 1. The problem, in numbers

*Kept from revision 1 (`R1:37-70`); first-person wording now reads "revision 1's". Revision 2's additions are §1.1 to §1.4 below.*

**Our game today.** Flat = the baseline-0009 corpus, 496 fixtures (REPORTED from `baseline-0009.md` and pkA, which reproduce each other exactly). Gen = `runRealSeason` seed `pk-01` through 2027 week 18, 272 games (COMPUTED, revision 1's base run, which reproduces `maps/engine.md` to the decimal; K2 reproduced it exactly). Caller v7.

| measure | flat (496) | gen (272) | real | source |
|---|---|---|---|---|
| dropbacks | 43,837 | 25,758 | | |
| pressured (worst status not CLEAN) | 86.85% | 85.26% | 30.17% | FTN 2023-24 |
| sack per dropback | 16.43% | 16.72% | 6.56% | pbp 2022-24 |
| hit-or-sack per dropback | 20.05% | 24.04% | 14.71% [14.43-15.00] | pbp `qb_hit` or sack |
| sack share of hit-or-sack | 81.9% | 69.6% | 44.6% | same |
| arrived, then threw (a hit on a thrown ball) | 3.62% | 7.31% | **7.1%** on aimed throws; 8.1% counting throwaways | `maps/gaps.md:58-59`; real recomputed by V1-07 |
| pressure to sack (P2S) | 18.91% | 19.62% | 22.02% FTN-only (PR #33, held) / 15.46% on main | entry 173 |
| release (decision tick) | 1.242 s | 1.235 s | 2.631 s FTN 2023-24 / 2.79-2.82 s NGS | `maps/realdata.md:15` |
| first tick at PRESSURE or worse, mean | 0.877 s | 0.883 s | 2.9 s (NGS average time to pressure; REPORTED, nfl.com, §2.3) | |
| share of those before 2.5 s | 99.8% | 99.7% | about 41-45% (INFERRED arithmetic on two REPORTED team figures) | `maps/realdata.md:186-195` |
| throwaway per dropback | 5.46% | 2.90% | 3.54% | FTN `is_throw_away`, 2023-24 |
| scramble per dropback | 17.07% | 6.44% | 5.12% | pbp 2023-24 (2,097 of 40,982; 4.90% for 2022-24) |
| pressured share of throws at the 0.5 to 1.5 s decision ticks | 79.1% (revision 1's 272-game flat run) | 80.5% | 7.3% (real releases up to 1.75 s); 9.0% under 2.0 s in raw seconds | FTN by release bin, §2.2 |
| INT per aimed throw | 2.10% | 6.80% | 2.35% overall; 2.01% clean / 3.56% pressured | 2023-24, revision 1's recompute; `maps/realdata.md:123` |

**Where the dirt comes from** (REPORTED, `maps/engine.md:7`, flat; gen within 1 point): won-rep arrival projection 62.6%, BLOCKER_BEATEN band floor 8.4%, counter 0%, rushers nobody blocked 29%: 100% in all. On 46% of pressured dropbacks (gen 43%) the arrival projection flagged a rusher who never arrived.

**The chain in the code** (CHECKED at `8b387f7`):

1. **The rep is drawn once per matchup per play** (ADR-059, `resolve/passRush.ts:59-124`). Each tick only jitters its margin by `round((d100 - d100)/4)`, at most +-25 (`:162-192`; divisor `tunables.ts:516-517`). About five in six won reps are won on the first tick rolled.
2. **A margin of 15 or more is RUSHER_WINS_REP.** Base travel is 1.0 s interior and 1.5 to 2.0 s edge (`tunables.ts:784-788`), plus a depth offset of up to +1.0 s for an edge rusher aligned deep (`:836-839`), clamped to [1.0, 3.0] (`:1030-1031`). **So a won rep can need 3.0 s to arrive.**
3. **The arrival projection floors the pocket:** IMMEDIATE at 0.0, COLLAPSING within 1.0 s, PRESSURE within 2.0 s (`tunables.ts:1045-1046`, `:1117`). The 2.0 s is the owner's July 2026 ruling, bounded and derived (`tunables.ts:1047-1117`; entry 76).
4. **COLLAPSING or IMMEDIATE forces the decision** (`tunables.ts:1398`; `sim/passPlay.ts:1026-1029`).
5. **On a forcing tick he throws first, if anything clears the desperation bar** (25, `tunables.ts:2249`; `sim/passPlay.ts:1108-1114`). Only after that does an arrival with nobody to throw to become a sack (`sim/passPlay.ts:1178`; `resolve/pocket.ts:239`). TECH §2: of 281 start-of-tick arrivals in 16 games, 90 ended in a throw that tick and 191 in a sack. On gen, 7.31 of 24.04 hits-or-sacks (30%) are "arrived, then threw".
6. **Band floor and counter.** BLOCKER_BEATEN floors PRESSURE (`tunables.ts:1303`), the consequence of the owner's July amendment, limb (b) (`match-engine.md:565-587`). Per tick the counter adds RUSHER_WINS_REP +2, BLOCKER_BEATEN +1, RUSHER_GAINING +1 (`:534-536`); it is kept per rusher and only BLOCKER_RESETS zeroes it (`:520-540`); it reads PRESSURE at 3, COLLAPSING at 5, IMMEDIATE at 7 (`:1350-1355`).
7. **The quarterback's budget** is `2.5 + (patience - 70)/20 + trait + read-system delta` (`resolve/qbRead.ts:185-197`; deltas HALF -0.5, FULL +1.0, CONCEPT -1.0 at `tunables.ts:2082/2090/2098`; the Pocket Awareness trait adds +0.5 s through `pressureSensing.pocketAwarenessBudgetSeconds`, `:2265`, explained at `:2261-2264`). For a patience-60 quarterback that is 1.0 / 1.5 / 3.0 s, and **on the flat league** 75% of dropbacks get 1.5 s or less (REPORTED, `maps/gaps.md:112-121`; the generated league's share is not computed). The throwaway gate opens on the 2.0 s tick (`tunables.ts:2254`, read at `sim/passPlay.ts:1116`).

**So P2S lands between the two real figures only by coincidence:** its numerator and its denominator are both wrong by factors that happen to cancel (requirement P1(b), `maps/requirements.md`).

### 1.1 Rushers nobody blocked, today (revision 2)

"Free runner" here means a rusher with no blocker on him: the protection had nobody left for him (origin UNBLOCKED), a back or tight end stayed in and lost to him (PICKUP_LOST), or a line stunt failed to hand him over (STUNT_LOOPER). The game's contest result for a lost pickup is RAN_THROUGH (the blocker got a piece of him) or BLOWN_UP (a clean miss); for a failed stunt hand-off it is LATE_EXCHANGE ("somebody got a hand on him") or LOOPER_FREE (a clean miss) (`tunables.ts:573-585`, `:630-635`, CHECKED).

- **The clock reads none of what the owner listed in question 4.** One function times the unblocked man and the man who beat his pickup: 1.5 s, plus an offset by alignment and by a depth class taken from his position alone (LINE for DE, DT and NT; DEEP for CB, FS and SS; BOX for everyone else), plus 0.5 s for RAN_THROUGH, clamped to 0.5 to 4.0 s and rounded to a tenth (`resolve/rushThreat.ts:507-525`, CHECKED; `tunables.ts:647`, `:720-748`, CHECKED, FR). A free looper arrives at 2.0 s, plus 0.5 for LATE_EXCHANGE, whoever he is (`sim/preSnap.ts:584-596`, CHECKED, FR). No snap spot, no Speed, no Acceleration, no drop depth: the tunables say a speed term "would be a second petition" (`tunables.ts:706-716`, CHECKED, FR), and no engine code outside fixtures reads `dropDepthYards` (grep, CHECKED, FR §1.1).
- **He is known from the snap.** A free runner is published TRAVELLING at the snap (`sim/passPlay.ts:237-247`, `:606-627`, CHECKED, FR), so today the pocket "sees" him from the first moment.
- **How many** (COMPUTED by FR on gen base, REPORTED; 25,758 dropbacks): PICKUP_LOST on 11.3 dropbacks in 100, STUNT_LOOPER on 11.5, UNBLOCKED on 3.3, at most 26.1 in 100 with one. Of lost pickups 65% are BLOWN_UP (2,156 of 3,327); of failed hand-offs 52% are LOOPER_FREE (1,629 of 3,161). **There are about 18.1 men nobody got a hand on per 100 dropbacks** (878 + 2,156 + 1,629 records in 25,758 dropbacks, so a play with two counts twice, FR §6). Flat is nearly the same (FR §1.2).
- **Their ratings are not read.** Speed of the men who ran free, 10th / 50th / 90th percentile: UNBLOCKED MLB 59 / 69 / 80, PICKUP_LOST CB 73 / 79 / 87, looping DT 29 / 41 / 51 (COMPUTED by FR, REPORTED).
- **Under revision 1's slower line they make most of the contacts:** 2,728 of 3,473 first contacts (79%) in the "Today" pricing arm come from free runners (COMPUTED by FR, REPORTED, FR §1.2).

### 1.2 The clean pocket, today (revision 2)

"Clean pocket" means the pocket status stayed CLEAN all play and he never left it. "His count" is the time budget of item 7 above.

- **What a spent count does** (CHECKED, CP §1.3, at `sim/passPlay.ts:1026-1353`): anyone at the normal bar of 50 is thrown to; then the checkdown look (bar 30); then **the desperation throw** to anyone he has read at 25 or better; the pocket-movement branch needs a forcing pocket (`:1187`), which a clean pocket never gives, so **no climb, no escape and no pocket throwaway**; then a throwaway with cause `CLOCK_EXPIRED` from the 2.0 s tick; otherwise he holds.
- **He is never sacked in a clean pocket:** 0 sacks in 3,796 clean gen dropbacks and 0 in 5,766 flat; 0 end-of-clock sacks in any run (COMPUTED by CP, REPORTED, CP §1.9, §3.1). The code's own comment already names the coverage sack (`sim/passPlay.ts:1253-1256`, CHECKED, CP).
- **On the clean bench** (no rusher ever gets home; revision 1's step-5a instrument, §6.0) he gives up with nobody open on **30.2 gen dropbacks in 100**: desperation throws 10.1 (19.0% intercepted), checkdowns 8.9 (49.8% complete), throwaways 11.1; scrambles, escapes, climbs and sacks all 0 (COMPUTED by CP, REPORTED, CP §3.2). Real clean quarterbacks scramble 3.92 times and throw away 1.25 times in 100 (§2.4). On 49.7% of the nobody-open plays (4,286 of 8,631) a man in his read order was at the bar at that moment; on 2,889 of them he had never read that man (2,340) or had read him stale (549) (upper bound, CP §3.2). INT per aimed throw on the bench is 7.82 gen and 2.93 flat.
- **Throws after an escape** complete 24.0% and are intercepted 17.1% on gen (421 throws), against real 69.3% and 2.11% from outside a clean pocket (CP §3.1, §2.1). No throwaway exists out of the pocket today, and at the pursuit deadline he always runs, from the line (`sim/passPlay.ts:1118-1146`, CHECKED, CP).

### 1.3 One decision point, two facts (revision 2)

- **The engine has one decision point:** `mustDecide = forcesDecision(pocket) || tick >= budgetSeconds || readsUsed >= maxReads` (`sim/passPlay.ts:1026-1029`, CHECKED; `forcesDecision` is COLLAPSING or IMMEDIATE, `tunables.ts:1398`, CHECKED), and the movement branch is gated by the same `forcesDecision` (`sim/passPlay.ts:1187`, CHECKED).
- **His reaction reads two facts about the rush:** the rusher's alignment (any INTERIOR threat closes the climb lane) and the time to arrival (urgency) (`resolve/pocketMovement.ts:115-122`, `:135`; `resolve/scramble.ts:59-71`; CHECKED, TM §0). The threat record holds no move, angle, engaged flag or sight (`resolve/rushThreat.ts:60-137`, CHECKED, TM). The owner's two-moments message asked for more than that (`TMP:5-37`).

### 1.4 The situation, today (revision 2)

- **The play sees down, distance, field position and clock, but no score or period** (`MatchGameState`, `engine/src/types.ts:301-325`, CHECKED).
- **The two-minute flag fires in the last two minutes of every quarter:** `twoMinute: s.clockSeconds <= G.twoMinuteSeconds` on the period clock (`game/simulateGame.ts:193`, CHECKED), reset every period (`:299`, CHECKED), documented as "of the end of the period" (`game/types.ts:147`, CHECKED). It is read by the default caller's pass rate of 0.85 (`game/playCaller.ts:48`; `tunables.ts:3331`), the huddle burn (`simulateGame.ts:724`), the calibration callers' tendency keys (`calibration/src/caller/tendencies.ts:85`, `:115-116`) and two-minute-only concepts (`playbook/src/distribution.ts:91`; `playbook/src/passConcepts.ts:713`) (CHECKED, CM T12).
- **Goal-to-go distance is wrong after a first down or a turnover:** it resets to 10 with no goal line in the play outcome (`sim/outcome.ts:60`, `:70`, CHECKED), which the game loop takes after a first down (`simulateGame.ts:649`, CHECKED, CM); a turnover or change of possession resets it again in the game loop itself (`startDrive`, `simulateGame.ts:243`, which an interception reaches at `:655`; `changePossession`, `:292`; CHECKED in the settle).
- Real data agrees the clock matters only at the end of each half (§2.4, COMPUTED by CM).

---

## 2. Real targets, with sources

*Kept from revision 1 (`R1:74-145`), with revision 1's petition P4 renumbered P8 (§7) and first-person wording now reading "revision 1's". Revision 2 adds §2.4 and §2.5.*

Computed from the cached nflverse data in `packages/calibration/data-cache/{pbp,pbp_participation,ftn_charting,ngs_passing}/{2022,2023,2024}/rows.ndjson`, fetched 2026-10-22T02:38Z; each `manifest.json` carries its origin URL (REPORTED, `maps/realdata.md:39-40`). The cache holds no 2025 data. **Round 2 recomputed every curve of this section** (COMPUTED, `python3 -I` over 2023-24, rows joined on `(gameId, playId)`, dropbacks by the repo's `isDropback` and attempts by `isPassAttempt`, `packages/calibration/src/metrics/realInput.ts:157-198`: 40,982 dropbacks, 36,001 attempts with a release time; K1 independently matched every figure; the settle re-derived the pressured rows at full precision on 36,006 attempts and matched to the printed decimal).

### 2.1 Graded rows

| row | real | interval | source, clock and role |
|---|---|---|---|
| **hit-or-sack per dropback** | **14.71%** | [14.43-15.00] | pbp `qb_hit` OR sack, 2022-24 (14.73% for 2023-24). The official scorer's flag, set on 94.4% of sacks and on 0 of 3,002 scrambles in 2022-24 (REPORTED, `maps/gaps.md:47`; scramble count recomputed by V1-16). **Definition-free.** |
| **its sack share** | **44.6%** | 45.1% for 2023-24 | Same. **The target of a fitted dial** (the contest's sack boundary, §6.10), so not an independent grade. |
| **sack per dropback** | **6.56%** | 6.37-6.76 | pbp 2022-24. With the share fitted, the sack rate and the hit-or-sack rate are **one** prediction (sack = share x hit-or-sack), not two. |
| **time to throw** | **2.631 s**, median 2.40 | boot 2.611-2.648 | **FTN 2023-24 only** (Orchestrator default D3). NGS gives 2.79-2.82 s. The repo's 2.682 s pools the two clocks, the same kind of source mixing that entry 173 addresses for `was_pressure` (PR #33, held). The tier-1 `time_to_throw` row stays as it is; this design grades its own acceptance on 2.631 and reports against 2.682 as well. |
| P2S | **22.02%** [21.30-22.76] FTN-only; **15.46%** on main | | Entry 173 is PR #33 on the project branch (`060c23c`). **The owner put it on hold on 2026-10-24 00:18Z: it stays open, main keeps 15.46%, and nothing here depends on it merging** (CHECKED, `git branch -a --contains 060c23c` lists only `claude/project-thread-di5svc` and its remote). The tier-1 row stays exactly as it is. This design reports P2S in every arm against both figures and **never grades it** (K3-06). |

### 2.2 Curves

**Which grid to compare on (K1-03).** The sim's release is the decision tick on the 0.5 s grid until `THROW.releaseSeconds` (P8) exists (`calibration/src/metrics/tier1.ts:1055-1057` reads release "off the SAME 0.5s-grid TICK.payload.tick"). A tick `t` stands for real releases in `(t - 0.25, t + 0.25]`, so the sim's `[2.0, 2.5)` bin, which holds only the 2.0 tick, matches real `(1.75, 2.25]`. **Every comparison while release is the decision tick (steps 0 to 3, every pricing arm, Appendix B) uses the tick-aligned rows; every comparison once release is `releaseSeconds` (step 4 on, including the step-5b selection and acceptance) uses the raw-second rows.** Round 1 compared tick bins with raw-second bins; the corrected figures are below and in Appendix B.

**Hit rate on thrown balls by release bin** (FTN clock, **aimed throws**: pass attempts not charted as throwaways, n 34,578 with a release time; COMPUTED, and K1 matched it to 0.01 pp). This is the curve the block clock is chosen on at step 5b, **by shape only** (§4.1):

| release | <2.0 | 2.0-2.5 | 2.5-3.0 | 3.0-3.5 | 3.5-4.0 | 4-5 | >=5 |
|---|---|---|---|---|---|---|---|
| QB hit rate, raw seconds (the selection curve) | 2.7% | 7.1% | 10.6% | 11.0% | 13.8% | 16.1% | 18.0% |
| QB hit rate, tick-aligned | 1.9% | 5.4% | 9.7% | 10.6% | 12.7% | 15.3% | 18.0% |
| counting throwaways, raw (K1, for reference) | 2.7% | 7.3% | 10.9% | 11.4% | 14.8% | 19.2% | 21.5% |

The round-1 UNCHECKED mark is lifted: the curve was already on aimed throws (K1). Counting throwaways makes it 7 to 9% steeper only from 4 s on, where throwaways are 17 to 27% of attempts; the shape distance between the two real versions is 0.0035 (REPORTED, K1) against 1.10 to 4.18 between the aimed-throw curve and each test-run curve (1.14 to 4.28 against the curve counting throwaways; COMPUTED in the settle with real attempt-share weights, R1-13), so the population choice does not move the selection. **Both sides count aimed throws only** (J1-3).

**Pressured share by release bin** (COMPUTED; raw row = `maps/realdata.md:170-178`):

| release | <2.0 | 2.0-2.5 | 2.5-3.0 | 3.0-3.5 | 3.5-4.0 | 4-5 | >=5 |
|---|---|---|---|---|---|---|---|
| pressured, raw seconds | 9.0% | 18.1% | 24.6% | 27.9% | 36.9% | 56.0% | 72.6% |
| pressured, tick-aligned | 7.3% | 14.7% | 22.3% | 26.8% | 32.5% | 49.6% | 71.5% |
| share of attempts, raw | 26.1% | 24.3% | 20.6% | 12.9% | 6.7% | 5.2% | 4.2% |
| share of attempts, tick-aligned | 17.0% | 23.4% | 23.0% | 16.1% | 8.9% | 6.6% | 5.0% |
| throwaway, raw | 0.4% | 1.5% | 2.4% | 3.3% | 8.1% | 17.0% | 27.3% |
| INT per attempt, raw | 1.09% | 2.04% | 2.91% | 2.99% | 3.44% | 2.54% | 3.21% |
| INT per aimed throw, raw | 1.10% | 2.07% | 2.98% | 3.07% | 3.74% | 3.00% | 4.41% |
| INT per aimed throw, tick-aligned | 0.93% | 1.64% | 2.74% | 2.96% | 3.42% | 3.46% | 4.16% |

"Twice FTN" in the 2.0-2.5 s bin is therefore **29.4** on the tick grid (36.2 in raw seconds). Both sides of the pressured curve count throwaways as throws.

**Release shape on the sim's 0.5 s grid** (FTN 2023-24, bin (t-0.25, t+0.25]):

| tick | 0.5 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0 | 3.5 | 4.0 | 4.5 | 5.0 | >5.25 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **clean attempts** (the step-5a fitting target) | 0.5% | 5.8% | 14.3% | 26.2% | 23.4% | 15.5% | 7.9% | 3.1% | 1.2% | 0.8% | 1.1% |
| all attempts | 0.4% | 4.5% | 12.1% | 23.4% | 23.0% | 16.1% | 8.9% | 4.3% | 2.2% | 1.7% | 3.2% |

The clean row is REPORTED from V1-06's recompute on the data cache (pkB reports 0.6 in the first bin); the all-attempts row is `maps/realdata.md:160-164`. Clean attempts: 6.3% at or under 1.0 s and 14.1% at or over 3.5 s (sums of the tick row above, K1); mean 2.412 s, median 2.30 (`maps/realdata.md:153`).

### 2.3 Reported rows, and the one named clock

| row | real | source |
|---|---|---|
| pressure rate (charted) | 30.17% [29.5-30.8, game bootstrap] | FTN. **Retired as a grade** by entry 93 (`threat_creation_rate`, `tier1.ts:261` at `8b387f7`). Reported in every arm; never pass or fail (default D5). |
| throwaway | 3.54% overall; **8.84%** pressured; **1.25%** clean | FTN `is_throw_away`, 2023-24 |
| scramble | 5.12% overall; 7.89% pressured; 3.92% clean | pbp 2023-24 |
| hits on aimed throws, per dropback | 7.1% (8.1% counting throwaways) | V1-07 recompute |
| hit-or-sack per charted pressure | 48.8% | `maps/gaps.md:51` |
| completion per aimed throw | 67.5% | `maps/gaps.md:213` |
| INT per aimed throw | 2.35% overall; 2.01% clean, 3.56% pressured | revision 1's recompute, 2023-24; `maps/realdata.md:123` |
| by down, all distances and goal-to-go included: pressure / P2S / pressured throwaway | early 27.4 / 19.7 / 10.2; 3rd 36.8 / 26.9 / 6.7; 4th 35.6 / 20.5 / 3.3 | `maps/realdata.md:261-267`; matched by revision 1's recompute |
| by down, **at 7-10 to go, goal-to-go excluded** (the population §6.8 predicts on) | early 27.3 / 19.6 / 9.7; 3rd 41.4 / 26.5 / 6.0; 4th 45.6 / 17.8 / 2.7 (only 73 pressured fourth downs) | COMPUTED, 2023-24 (K1 noted the mismatch) |
| by down, **our game today** | P2S 20.5 / 18.9 / 18.6 / 15.2 (1st to 4th); pressured throwaway 2.64% on every down | `maps/realdata.md:277` |
| blitz | at least one blitzer vs none: pressure 39.1 vs 26.7, P2S 21.3 vs 22.4; five or more rushers vs fewer: 38.4 vs 27.3 and 21.0 vs 22.5; by rushers, pressure 27.6 / 36.6 / 43.5 at 4 / 5 / 6 | V1-29 recompute, FTN 2023-24; `maps/realdata.md:19` |
| QB-season true SD | P2S 3.56 pp, pressure 3.90 pp, time to throw 0.162 s; defence P2S SD 0. **FTN 2023-24 only, 61 QB-seasons with 300+ dropbacks.** Sim today: P2S true SD 6.48 pp | `maps/realdata.md:289-309`; MEAS:481 |
| deep routes (sim today) | P2S 11.7 / 17.7 / 30.1 / 52.0% at 0 / 1 / 2 / 3+ deep | pkC, REPORTED |
| failed scrambles as a share of sacks | 10% (SIS 2019-20, main reason per sack) | REPORTED, `RES:171`, https://www.sharpfootballanalysis.com/analysis/pressure-timing-data-patrick-mahomes-josh-allen-lamar-jackson/ ; not in the cache, which scores them as sacks |

**The named clock (J1-5, requirement P2).** NGS's "average pressure occurs in 2.9 seconds; quick means within 2.5 s" (REPORTED, https://www.nfl.com/news/next-gen-stats-introduction-to-pressure-probability; not in the cache) is compared with **the sim's first tick at PRESSURE or worse**, and with nothing else. Because the status ladder is CLEAN < PRESSURE < COLLAPSING < IMMEDIATE, that tick **is** the first non-CLEAN tick, which is the column every table here reports. The 41-45% quick share is INFERRED arithmetic on REPORTED team figures (KC 15.2 / 36.7 = 41.4%, SF 17.2 / 38.5 = 44.7%, `maps/realdata.md:190-191`); no league figure is published. The first forcing tick and the first ARRIVED tick are reported as distributions in every arm and are **never** compared with 2.9 s. Every report restates the construct difference: NGS's is a model, FTN's is hand charting, ours is a status rung. ESPN's pass-rush win rate is context only; no league average is published, so under entry 125 it cannot be a falsifier.

### 2.4 New real rows (revision 2)

Each row says who computed it. Rows computed by a reader are REPORTED here; the reader's command is in its report (Appendix D). Unless a row says otherwise it is 2023-24, regular season, the repo's dropback filter, 40,982 dropbacks with the FTN pressure flag (28,619 clean, 12,363 pressured).

**Situation, for question 12** (COMPUTED by CM, `CM` §7.3; "half-end" = the last 120 s of the second or fourth quarter; "Q1/Q3 end" = the last 120 s of the first or third; "rest" = every other non-overtime snap; plus-or-minus is one binomial standard error, without game clustering):

| situation | dropbacks | pressured throwaway per 100 pressured | clean throwaway per 100 clean | P2S | time to throw |
|---|---|---|---|---|---|
| rest | 32,296 | 8.51 +- 0.28 | 1.01 +- 0.07 | 21.9 +- 0.4 | 2.622 +- 0.006 s |
| Q1/Q3 end | 2,338 | 8.94 +- 1.06 | 1.12 +- 0.26 | 21.9 +- 1.5 | 2.616 +- 0.024 s |
| half-end, trailing | 3,882 | **10.09 +- 0.86** | **2.59 +- 0.31** | 21.8 +- 1.2 | **2.719 +- 0.019 s** |
| half-end, level or leading | 2,273 | **11.38 +- 1.25** | **2.53 +- 0.39** | 23.1 +- 1.7 | 2.624 +- 0.025 s |
| all | 40,982 | 8.84 | 1.25 | 22.0 | 2.631 s |

What it says: the last two minutes of the first and third quarters look like ordinary play (step 8a's bug-fix check); at the end of each half clean throwaways are about 2.5 times the rest and pressured throwaways 1.6 to 2.9 points higher (step 8b's fitting rows); P2S is flat by situation within about 2 points, and time to throw is about 0.10 s longer only when trailing (step 8b's falsifiers). The "all" row reproduces revision 1's figures, so the join matches (`CM` §9).

**The clean pocket, for question 7** (COMPUTED by CP, `CP` §2.1):

| row | real | note |
|---|---|---|
| scrambles per 100 clean dropbacks | **3.92** | none at or below 0 yards |
| throwaways per 100 clean dropbacks | **1.25** | 217 in the pocket (median release 2.8 s), 142 out of it (median 4.4 s) |
| clean "outs" (scramble plus throwaway) | 5.17 per 100 | |
| checkdown throws (FTN `read_thrown` CHK) | **14.7% of clean aimed throws** | 86.4% complete, 0.48% intercepted; to a back 62%, tight end 23%, receiver 15% |
| later-read throws (`read_thrown` "2") | 10.0% of clean aimed throws | 61.7% complete, 3.01% intercepted |
| scramble-drill throws (`read_thrown` SD) | **3.0% of clean aimed throws** | 56.3% complete, 2.93% intercepted, release median 4.5 s |
| out of the pocket (FTN `is_qb_out_of_pocket`) | **10.63 per 100 clean dropbacks** | of them scramble 33.0%, throwaway 4.7%, aimed throw 62.3% |
| aimed throws from outside the pocket | 69.3% complete, 2.11% intercepted | pressured: 53.4%, 3.25% |
| short throws to a back or tight end (air yards 5 or less) | 26.8 per 100 clean dropbacks | 84.7% complete |

`read_thrown`'s codes are UNCERTAIN: the dictionary page could not be read in full and the data contradict one reading; CP reads "1" as the first read and "2" as later reads; CHK and SD are not affected (`CP` §2.3).

Clean aimed throws by release (raw seconds; `CP` §2.1):

| release | under 2.0 | 2.0-2.5 | 2.5-3.0 | 3.0-3.5 | 3.5-4.0 | 4.0-5.0 | 5.0+ |
|---|---|---|---|---|---|---|---|
| share | 31.6% | 26.3% | 20.4% | 12.2% | 5.4% | 2.9% | 1.3% |
| out of the pocket | 0.8% | 2.6% | 6.2% | 10.5% | 20.6% | 48.8% | 77.7% |
| scramble drill (SD) | 0.0% | 0.1% | 0.3% | 2.4% | 9.4% | 38.0% | 80.1% |
| checkdown (CHK) | 4.6% | 12.7% | 21.9% | 26.7% | 27.5% | 20.4% | 7.0% |
| INT per aimed throw | 1.03% | 1.97% | 2.48% | 2.81% | 3.42% | 2.97% | 4.11% |

**Mobile and pocket passers** (COMPUTED by CP, `CP` §2.2; 61 QB-seasons with 300 or more dropbacks, split into thirds by designed quarterback runs per dropback, a behaviour measure, not a rating):

| third | clean scrambles per 100 | clean throwaways per 100 | outside a clean pocket, not sacked: scramble / throw away / throw to someone |
|---|---|---|---|
| pocket passers (20) | **2.44** | **1.17** | 25.4% / **3.3%** / **71.3%** |
| middle (20) | 3.72 | 1.22 | 33.5% / 5.7% / 60.8% |
| mobile (21) | **5.18** | **1.33** | 36.3% / 5.2% / 58.5% |

So mobile quarterbacks run about twice as often, throwaways are flat, and a pocket passer outside the pocket mostly throws to someone. The owner's "A pocket passer will roll outside the tackle box and throw the ball safely out of bounds to preserve the next down" is real football but is not where the two kinds differ in the data (`CP` §2.2).

**Coverage sacks and time to sack** (report only; the cache cannot count them: FTN marks 2,722 of 2,724 sacks as pressured, and only 73 sacks carry a time, `CP` §2.3):

- Sports Info Solutions, main reason for each sack, 2019-20: Blown Block 45%, Blitz or Overall Pressure 18%, **Coverage Sack 13%**, **Rusher Untouched 13%**, **Failed Scramble 10%**, QB Fault 1% (REPORTED, https://www.sharpfootballanalysis.com/analysis/pressure-timing-data-patrick-mahomes-josh-allen-lamar-jackson/ ; `TOT` §6 re-fetched it, CHECKED there). At the real 6.65 sacks per 100 dropbacks that is about 0.86 coverage sacks and 0.66 failed scrambles per 100 (INFERRED arithmetic, `CP` §2.3).
- PFF, "The Overrated Sack" (2012 season, INFERRED from its February 2013 date): average time to sack 3.8 s, and 305 sacks of five seconds or more (REPORTED, https://www.pff.com/news/the-overrated-sack).

**How many rushers come completely unblocked, and how many hits they make** (all INFERRED: PFF's and SIS's definitions are their own):

- PFF, 2013 season: the team table sums to 1,552 unblocked pressures, 218 unblocked sacks and 431 unblocked hits; "18.1% of plays that featured unblocked pressure culminated in a sack" (COMPUTED by TOT from the table, CHECKED there, https://www.pff.com/news/unblocked-pressure-defense). Against an assumed 19,000 to 25,000 dropbacks that is **about 6 to 8 unblocked pressures in 100 dropbacks**, and 2.6 to 3.4 unblocked hits-or-sacks in 100, which is **about 18 to 23 in 100 of all hits-or-sacks** (INFERRED, `TOT` §6). Of sacks alone, unblocked men make about 13 in 100 (SIS's "Rusher Untouched", above) to 18 (PFF's 218 against about 1,180 sacks that season, a total from memory, not checked) (INFERRED, `TOT` §6). **The bands this design files from them** (CHOSEN, at an assumed 22,000 dropbacks): completely unblocked pressures at most 14 per 100 dropbacks (twice 7), and their share of hit-or-sack at most 40 in 100 (twice 20).
- PFF's unblocked pressures per blitz ran from 8.6% to 26.7% by team in 2023 (REPORTED, `RES:181`).

**Who makes the sacks** (COMPUTED by the two-moments model, `TM` C3; credited sacker, half sacks split):

| where | credits | edge (DE, OLB) | interior | off-ball LB | DB |
|---|---|---|---|---|---|
| in the pocket | 2,086 | 60.9% | 23.2% | 9.0% | 6.9% |
| out of the pocket | 617 | 58.1% | 16.5% | 16.0% | 9.3% |
| our game today, credited (gen) | 4,308 sacks | 10.1% | 82.5% | 7.3% | 0% |

Sack share of contacts in and out of the pocket: 45.5 against 43.9 (REPORTED, `TM` §7, from r-realdata). Read thrown on aimed throws: first read 40.1% pressured against 59.5% clean; checkdown 18.3% against 14.8% (`TM` C3). Strips per 100 credited sacks (edge 14.0, DB 12.3, interior 7.6, off-ball LB 7.7, 2022-24) are for the fumble design and are not read here (`TM` C3).

**Speed, the start and the get-off** (REPORTED, `FR` §3.2): average 40-yard times since 2003, edge or DE 4.83, DT 5.11, CB 4.50, S 4.57 (https://www.nfl.com/news/2026-nfl-combine-best-and-average-40-yard-dash-times-by-position); 10-yard splits for DE and OLB, average 1.60 to 1.62 at the 2006-08 combines (https://sports.yahoo.com/ys-behindthetimes031109.html) and 1.67 for Pro Bowl edge rushers since 2003 (https://nfl.com/_amp/2019-nfl-scouting-combine-twelve-numbers-that-matter-most-0ap3000001021021); a sprint start follows `v(t) = vmax(1 - e^(-t/tau))` with tau 0.768 s (fast group) and 0.773 s (slow group), "both fast and slow groups accelerated in a similar pattern" (Clark et al., JSCR 2019 33(6):1542-1550, https://lida.sport-iat.de/ta/Record/4054398?lng=de); get-off from snap to crossing the line, fastest average Myles Garrett 0.73 s (https://www.nfl.com/news/11-outrageous-next-gen-stats-entering-week-12) and Rashan Gary 0.85 to 0.95 s (https://www.acmepackingcompany.com/2024/10/7/24264720/green-bay-packers-pass-rush-production-rashan-gary-preston-smith-lukas-van-ness-kingsley-enagbare). No league-average get-off was found.

**How deep he sets** (REPORTED, `FR` §4): PFF maps 4 to 6 yards to a three-step from under centre or one step from the gun, 7 to 8 to a five-step or three steps from the gun (https://www.pff.com/news/qbs-in-focus-drop-back-depth); pressure rises with the drop, under centre / shotgun 15 / 21% at 0 to 1 step up to 43 / 45% at 7 steps (https://www.sharpfootballanalysis.com/analysis/how-drop-depth-affects-our-view-of-quarterbacks). The card corpus authors 5.0 yards for every shotgun card and 7.0 for every under-centre card (`playbook/src/passConcepts.ts:106-115`, CHECKED, FR); gen sets at 5.0 on 78% of dropbacks (COMPUTED by FR).

**When free runners arrive** (REPORTED, `FR` §5.2): SIS: "Pressure that occurs in the first two seconds of a play is much more likely to be the result of a free rusher"; "the two-and-a-half second mark is a clear peak" (same Sharp Football URL).

**A floor under the quick-pressure share** (COMPUTED in revision 2's settle: `python3 -I -c` over `.../scratchpad/pocket/realdata/db.json` rows, seasons 2023-24, FTN's `wp` flag and `ttt`: 40,982 dropbacks, 12,363 pressured, 8,666 pressured attempts, 2,724 sacks, 975 pressured scrambles). A charted pressure comes before the release, so a pressured attempt released before 2.5 s was first pressured before 2.5 s. Those are 2,429 attempts in raw seconds (`ttt` under 2.5) and 1,686 on the tick grid (`ttt` at or under 2.25), which is **19.6% of pressured dropbacks in raw seconds and 13.6% on the tick grid**, in the quick share's own denominator. Sacks and scrambles are not bounded by it. So the band's floor of 30 sits well above this bound, which does not test the INFERRED 41 to 45 (§6.10). (Revision 2 first printed 28.3% and 19.6%: those are shares of pressured attempts, not of pressured dropbacks.)

### 2.5 What real data cannot check (revision 2)

- **The drop.** No real field records drop depth. Under-centre dropbacks are 79.7% play action, screen, RPO or trick plays (4,870 of 6,107, COMPUTED by CM, `CM` §9), so a shotgun-against-under-centre split is confounded. Question 4's drop term has no direct real check.
- **The approach card, sight, the alarm moment and movement inside the pocket.** FTN charts only whether he left the pocket (`TM` §7).
- **Coverage sacks, time to sack, broken sacks** (`qb_hit` is never set on a scramble) and the fumbler (not cached): report only, from public sources.
- **The unblocked supply.** No league figure is in the cache; PFF 2013 is the one public table, so every unblocked row here is INFERRED.

---

## 3. Provenance of factual claims

**Revision 1's claims** (kept, `R1:151-167`; "my test runs" now reads "revision 1's test runs"):

| claim | provenance |
|---|---|
| Every `file:line` in §1 and §4 | **CHECKED** at `8b387f7` in the working copy, in rounds 1 and 2 and the settle; K2 re-checked about 60 and found two off by one (now `:633` and `:2265`); the settle found four more (now `tunables.ts:1545` and `:1552-1553`, `apps/game/src/playLog.ts:147-148`, `report/identity.ts:120`, `season/main.ts:135`, R1-11) and spot-checked about 90 others without a further miss |
| Flat base row, 496 games | **REPORTED** (`baseline-0009.md`; pkA; J1 and J2 re-ran and matched) |
| Gen base row, and every arm row in Appendix B | **COMPUTED**, revision 1's test runs; two leagues, one seed set each, mocks not engine code. K2 reproduced the base rows exactly and the shape S rows within 0.1 to 0.7 under the formula of §4.1, **except the gen late-free-rusher S rows' sacks and P2S (REPORTED-UNREPRODUCED)** |
| Contest probabilities on the real arrival population (§4.5) | **COMPUTED**, 6,190 first arrivals of base gen |
| Curve RMS, bins above twice FTN, the interception release-mix fold, the clock-expired share of throwaways, the hit-curve shapes | **COMPUTED** from revision 1's test runs' saved outputs, **re-scored in round 2 on both grids and again at full precision in the settle** (R1-06) |
| Ticks with a live WON_REP threat and a CLEAN pocket, today and under shape S (§4.3, §6.10) | **REPORTED**: K2's saved diagnostics (`k2out/gen-base-diag2.json`, `flat-base-diag2.json`, `gen-S11lp-scale-unclamp.json`, `flat272-S11-scale.json`, `flat272-S13lp-scale.json`, read in the settle) and R1's own re-measure (R1-02) |
| Real curves, the by-down rows at 7-10 to go, INT per aimed throw (§2) | **COMPUTED** in round 2 and matched by K1; other real rows REPORTED from `maps/realdata.md` and `maps/gaps.md`; four rows (clean shape, hits on aimed throws per dropback, scramble counts, blitz P2S) are verifiers' recomputes (V1-06, V1-07, V1-16, V1-29) |
| NGS's 2.9 s, the 41-45% quick share, SIS's 10% failed scrambles | **REPORTED** (URLs in §2.3) or INFERRED arithmetic; none is in the cache (K1-18) |
| pkA's 496-game flat arms, pkB's clean bench (1.663 s, 20.63%), pkB's K arm (INT 6.95 -> 8.74), pkB's rescoring (27.61 / 21.25), pkC's hazard arm | **REPORTED** from the designers' feasibility fields; J1 and J2 re-ran parts and matched; K2 re-ran pkB's clean bench and matched exactly |
| ESPN win-rate ranges 25-59% and 39-67% | **REPORTED** (`maps/engine.md:44`), context only |
| Shed delay 0.5 s; release base about 0.3 s; felt rate 0.85-0.95; drop floor 1.0 / 1.5 / 2.0 s by first-read depth; reset 1.0 s; weak-block multiplier; engagement time `t_e`; second-arrival probability 0.85; slide delay 0.5 s; stand-in path table | **CHOSEN**, no provenance beyond football judgement. Each is a declared, owner-visible dial (§6.10). |
| The names `legacy`, `pocket-1`, `SLIDE_POCKET`, `arrival_contest`, `pocket_sense`, `pass_rush_beat`, `QB_HIT`, `releaseSeconds`, `engineRules` | **CHOSEN** |
| The viewer renders unknown CHECK kinds and `QB_HIT` gracefully | **INFERRED** from `apps/game/src/playLog.ts:13-14` ("an event kind it does not know is skipped"); `ui-layout` confirms at step 0 |
| That the failed-scramble scoring rule needs no contracts edit (§4.7) | **INFERRED**; `contracts-guardian` confirms at step 6 |
| That a scorer would flag a shed followed by a throw as a QB hit (§4.5) | **INFERRED** |

**Revision 2's claims:**

| claim | provenance |
|---|---|
| Every `file:line` added in revision 2 | **CHECKED** at `8b387f7` in the working copy; marked "CHECKED, FR" (or CP, CM, TOT, TM) where a reader read it and the writer did not re-read it. The writer re-read the two-minute flag, the goal-to-go distance, the free-runner function, the decision gate, the pickup and stunt bands, the contracts lines of §7 and `MatchGameState` (`git log --oneline -1` printed `8b387f7`) |
| Every arm row from the four readers (§1.1, §1.2, §4, §6, WARNING 2, WARNING 3) | **REPORTED**: `vi.mock` stand-ins and tunables copies over the repo's own runners, never engine code, one or two seed sets (Appendix D says what each is not). FR's harness reproduces K2's Today arm exactly (digest `316b37cd`); TOT reproduces FR's (c) row and K2's Today, and its alarm-off build gives the digest of the build before the alarm code (`69be72e5`); CP's clean bench reproduces default D2's 1.799 s and 11.13% |
| The new real rows of §2.4 | **REPORTED**: COMPUTED by CM (situation, drop), CP (clean pocket, mobility) and the two-moments model (sacker mix, read thrown, strips) on the data cache with `python3 -I`; CM's "all" row reproduces revision 1's 2.631 s and 8.84 / 1.25 |
| The quick-share floor (19.6% of pressured dropbacks raw, 13.6% tick) | **COMPUTED** in the settle, `python3 -I` over `realdata/db.json` (§2.4) |
| Public figures (SIS sack reasons, PFF unblocked table, PFF time to sack, combine and get-off figures, drop-depth studies) | **REPORTED** with URLs (§2.4); TOT re-fetched the SIS and PFF unblocked pages. The real unblocked supply (6 to 8 pressures in 100 dropbacks) and share (18 to 23 in 100 of hits-or-sacks; 13 to 18 of sacks) are **INFERRED**; the bands (at most 14, at most 40) are **CHOSEN** |
| The free-run clock's constants: the snap-spot table (with its DELAYED wait +0.5 s and the creeper's 3 yd/s), 40 time from Speed, tau from Acceleration against Speed, get-off 0.35 s, reach 1.0 yd, edge bend 1.1, loop +0.5 yd | **CHOSEN** (the snap-spot table, its DELAYED wait and creep speed included, under question 19's answer; the rest default D18; recheck), each checked against the real figures of §2.4 (`FR` §3.3: a 4.76 s end gives a 1.69 s ten-yard split in the model against a real 1.60 to 1.67) and **filed at step 0, never fitted** |
| The two-moments dials (15): the push window's 1.0 s and margin range, the sight terms and band edges, the slide delays and slide-sooner tick, the sidestep window, overrun and dodge boundary, the escape side penalties, the contact tilts and the push shed delay, the LATE read penalty, the contact-choice appeals, the no-side and two-stunt side rules | **CHOSEN** (`TM` §3.10), pinned by the rules version |
| The clean checklist's dials: the clean pick's appeals at urgency 0; the window bump and the drill's fresh rep, which reuse the route ladder's existing magnitudes | **CHOSEN** (`CP` §4.3, §4.4); no new number beyond the appeals |
| Revision 1's "felt rate 0.85 to 0.95" | Now the target that sets sight's EARLY share at step 7 (§4.8), still **CHOSEN** |
| Revision 1's "stand-in path table" | Replaced by the free-run clock (D18; the start spot is question 19) for men nobody got a hand on |
| That `MatchGameState` gaining period and score needs no contracts edit | **INFERRED**; `contracts-guardian` confirms at step 8a (`CM` T12(d)) |
| That `QB_HIT`'s three phases cover a throwaway with a hand on him (ARRIVAL) and a caught escape that sheds (SHED) | **INFERRED**; `contracts-guardian` checks when P7 is asked at step 4 (`CM` T18) |
| That the viewer skips the new decision choices SIDESTEP and SLIDE_POCKET without crashing | **INFERRED** from `apps/game/src/playLog.ts:13-14`; `ui-layout` confirms at step 0 |
| The names SIDESTEP, `scramble_drill`, FREE, ARC, THROUGH, PUSH, BLOCKED, EARLY, LATE, NEVER, alarm, must act, contact, and the fork labels `:alarm`, `:contact`, `:dodge`, `:return`, `:clean`, `:deadline`, `:drill:<receiverId>`, `:late` | **CHOSEN** |

---

## 4. Mechanism

Every item sits behind a rules-version switch, default OFF (§9). **New dials live in the `pocket-1` overlay, not in `DEFAULT_TUNABLES`, until step 11** (K2-02, §12). Two names used throughout: **`legacy`** is today's rules, which must replay byte for byte; **`pocket-1`** is the new rules bundle, a tunables overlay plus the switches.

### 4.0 Three moments, and a card for each dangerous rusher (questions 2, 5, 15 and the two-moments message)

The owner's message of 2026-10-24 13:54Z said the pocket has a first registered breakdown and a contact, that what he does at each depends on how the rusher got there, and that moving without full awareness can take him into a man he never registered (`TMP:5-9`). Questions 2, 5 and 15 made that three moments, named by default D13:

1. **The alarm** (question 15, All): the first moment he registers a particular rusher. It never forces him; he may adjust or get ready. In the owner's question-4 words it is "what we were calling our first forcing point where the QB recognizes that his pocket is breaking". In this design it is called the alarm, and **must act** keeps the name "forcing point" of question 2; question 3's pressured warning is derived from must act, never from the alarm (default D32).
2. **Must act** (question 2, Half): he must throw, run, throw it away or stand in when a rusher he has registered is within 0.5 s, when any rusher arrives, or when his count or reads are spent, as question 7 decides (§4.3).
3. **Contact** (question 5, By approach): a rusher's hands on him with the ball still in his hand, which is an arrival or a caught escape (§4.5).

For a seen free runner up the middle the three come within about a second of each other; for a slow bull rush the alarm can come a second and a half or more before contact (`TMP:19`; `TM` §3.1).

**Tick order** (CHECKED, `sim/passPlay.ts:722-790`; `TM` §3.1). Each tick first builds the threat list and the pocket status from the previous tick's line battle ("`previousBand` is exactly tick-0.5", `:726`), then runs this tick's line battle. So a band reported on tick t first shows in the status at t + 0.5.

**When the alarm fires.** For a threat seen EARLY (sight, below), on the tick it first enters the list; **for a man on the free-run clock seen EARLY (all three origins of default D19, whatever his approach label), on the first tick his own remaining time is within 1.0 s, not at the snap** (default D20: the owner's "at a certain point"; 1.0 s is the Follows warning and also the window in which "make him miss" is offered, `CM` T6, `FR` §5.4); for a bull rush (PUSH), on the first status tick after the push window's first report: t_b - 0.5 when t_b is 1.5 s or later, else t_b (§4.1.1). One reaction from the menu of §4.8, once per registered threat.

**The approach card** (engine-internal, deterministic, no die; `TM` §3.2). Every threat carries:

| field | values | source |
|---|---|---|
| approach | FREE (nobody laid a hand on him), ARC (round the corner), THROUGH (straight through), PUSH (bull rush, still engaged), BLOCKED (still in his block, not a threat) | the derivation below |
| from | FRONT, SIDE, BEHIND | alignment and approach; BEHIND after he steps up under an ARC, or after he wins a SIDESTEP |
| side | LEFT, RIGHT, or none | the card's side (`sim/passPlay.ts:181-197`, CHECKED, TM), used only as the side the rusher is assigned to attack; never defaulted where the card says nothing; a lineman looping across the centre counts on his partner's side (default D16) |
| speed | `getAttr(ATTR.speed)` | registry, every position (`contracts/src/registry.ts:63`, CHECKED) |
| timing | `etaTick`, as today | `RUSH_THREAT.etaTick` (`contracts/src/events.ts:282-291`, CHECKED) |
| sight | EARLY, LATE, NEVER | one `pocket_sense` roll per threat (§4.8) |

**The derivation of approach** (CHOSEN rules over facts the engine already holds: the matchup's move and alignment, `sim/passPlay.ts:178-179`; the rep's latent margin on its `pass_rush_rep` CHECK, `resolve/passRush.ts:95-124`; the threat's origin, `events.ts:183`; all CHECKED, TM):

| engine facts | approach | from |
|---|---|---|
| completely unblocked and not a looper (default D19): origin UNBLOCKED, or a pickup BLOWN_UP | FREE | FRONT if INTERIOR, SIDE if EDGE |
| a looper the line never touched (LOOPER_FREE; completely unblocked under D19, so on the free-run clock), and a twist's penetrator | THROUGH (the owner's "came through on a stunt", `TMP:27`) | FRONT |
| a man somebody got a hand on (RAN_THROUGH, LATE_EXCHANGE), once his late block is beaten (default D19) | ARC if EDGE, THROUGH if INTERIOR | SIDE / FRONT |
| won rep, move SPEED or FINESSE, EDGE | ARC | SIDE |
| won rep, move POWER, latent margin 1 to 14 | PUSH | FRONT if interior, SIDE if edge |
| any other won rep (POWER 15 or more, a late beat from a margin of 0 or less, interior SPEED or FINESSE) | THROUGH (ARC if EDGE) | FRONT / SIDE |
| a matchup not beaten | BLOCKED | read only by the side-aware escape (§4.7) |

Under shape L, PUSH is a POWER rep that reported BLOCKER_BEATEN before it reported RUSHER_WINS_REP. **What the owner should know** (`TM` §3.2, C1): card slots make every base DT a POWER rusher and every end SPEED or FINESSE (`playbook/src/defensiveCards.ts:74-79`, CHECKED, TM), so PUSH is effectively interior only (44 edge POWER reps against about 104,000); and a dominant bull rusher (margin 15 or more) is labelled THROUGH, because in football terms he sheds his man rather than walking him back. `RUSH_THREAT` publishes the approach (petition P4), so no consumer re-derives it.

**On the free-run clock, whatever the label** (settle; defaults D19 and D20). All three origins of D19 (UNBLOCKED, BLOWN_UP, LOOPER_FREE) run on the free-run clock. A LOOPER_FREE man keeps THROUGH's lean list at the alarm (the owner's "came through on a stunt"), but the alarm's timing (D20), the +10 contact tilt and the rule of no throwaway at contact (§4.5) are keyed on "on the free-run clock", not on the FREE label, so they cover him too.

**The label at steps 1 and 2** (settle). The derivation reads facts the engine already has (the origin and the pickup or stunt result), so it runs from step 1 for every threat, P4 included. At steps 1 and 2 free runners keep today's times with these labels, and a touched man (RAN_THROUGH, LATE_EXCHANGE), still a free runner then, takes ARC if EDGE and THROUGH if INTERIOR. Step 3 changes their timing, not their labels.

### 4.1 The block clock: two candidate shapes, chosen at step 5b

*§4.1 is kept from revision 1 (`R1:175-223`) with these edits: petitions renumbered (§7), the question-6 "Later" clauses deleted (question 6 is Now), the late engagement time limited to touched men (D19), and the push window and free-run clock added to the grid. §4.1.1 is new.*

**The defect.** `margin_t = repMargin + jitter_t`, so the rep decides the play at 0.5 s.

**Shape S, the breaking time** (pkC's mechanism), **stated as the test runs ran it** (K2-01). Each blocked matchup gets one breaking time when its rep is drawn, and is beaten on the first tick at or after it:

```
T_j = t0_lane + theta * exp(-beta * z_j) * E_j^(1/k)        k > 1
z_j = m_j / 41                    (m_j the rep's own margin; uncentred)
E_j = -ln U_j,  U_j drawn once per rep on fork beat/<rollRef>   (rollRef = the rep's pass_rush_rep rngLabel)
beaten on the first tick t >= T_j
```

`t0_lane` is when the matchup's block starts: 0 for every block engaged at the snap, which is every block in every test run, and the late engagement time `t_e` for step 3's late weak blocks, which in revision 2 exist only for a man somebody got a hand on (default D19, §4.4) (R1-14). Provisional values: theta 11, k 2, beta 0.5. In hazard notation this is `B(t) = ((t - t0)/theta)^k` with multiplier `exp(k * beta * z_j)`, a rating weight of 1.0 at k = 2, uncentred. **Round 1's text gave a centred hazard with weight 0.5 (`c(beta) = ln E[exp(beta z)]`); that is not what the test runs ran, and at the same theta it gives pressure about 5 points lower** (K2-01: gen theta 11 late 29.4 to 30.1 against the runs' 34.5; flat theta 11 today 39.6 against 42.9). The grid of theta values and the provisional theta 11 are on the scale stated here.

Before the beat the matchup reports its rep margin capped at 0, `min(0, m_j)`, with its band from `passRush.bands` (STALEMATE, BLOCKER_CONTAINS or BLOCKER_RESETS): no counter progress, no band floor, and **no per-tick jitter die drawn**, a **named ADR-059 amendment** (the rep latent is kept). On the beat tick the threat is built once by `threatFromWonRep` (`resolve/rushThreat.ts:552-592`) with the **unchanged** travel table, so ADR-058's one path and ADR-061's interior 1.0 s stand. **On every later tick the matchup reports `max(15, m_j)`, RUSHER_WINS_REP**, as a won rep does today, so the counter adds +2 a tick (`tunables.ts:534`). **The per-tick `pass_rush_tick` CHECK then has no die behind it, but `CHECK.roll` is required today** (`contracts/src/events.ts:243-273`), and calibration's pass-block win rows (`metrics/collect.ts:926-928`), `bandCensus`, `ladderOccupancy` and `engine/test/determinism.test.ts:378-379` (which asserts BEATEN and GAINING ticks occur) all read those per-tick fields (K2-03). **So do these, which round 2 missed** (R1-04, CHECKED at `8b387f7`): the debug renderer prints `roll.total` for every `pass_rush_tick` (`debug/renderPlay.ts:383`; its guard at `:379` covers only `opposedRoll`), and `renderPlay` is an ADR-012 surface; a won rep's threat takes its `rollRef` from the tick's roll (`sim/passPlay.ts:840`), which under S must name the `pass_rush_beat` roll instead; ADR-004's roll audit and the event-vocabulary test join `RUSH_THREAT.rollRef` to `pass_rush_tick` roll labels (`engine/test/rollAccounting.test.ts:147`, `engine/test/eventVocabulary.test.ts:131`); `ladderOccupancy` reads `roll.die` and `roll.raw` of every CHECK (`calibration/src/knownTruth/ladderOccupancy.ts:510-511`); and if P3 is typed as a plain optional field rather than a union keyed on `checkKind`, the generic CHECK roll reads in `engine/test/determinism.test.ts:197`, `:216`, `:325` and `eventVocabulary.test.ts:567` stop compiling too. The other calibration readers of `pass_rush_tick` read no roll field (`ruling2CommittedRetirement`, `scaleSurface`, `attributeUsage`, `scenarios`, `pocketChannelShares`, `geometryTimeRetirement`, `bandCensus`, `metrics/tier34`, `metrics/absence`; grep at `8b387f7`), and `ladderTail` and `relationalConstantCensus` do not read it at all. So shape S needs petition **P3** (§7; revision 1's P11), and every reader listed here changes at step 1; the determinism assertion is kept for `legacy` and shape L, and may pass again under S with the push window (§4.1.1; INFERRED, verified at step 1).

**Shape L, the gradual clock** (pkA's mechanism): `margin_t = round(min(1, t/R) * (repMargin + jitter_t))`. Same dice, same fork labels, same stream of d100s; only the margin and the band derived from them change. It is the same as dividing every band threshold by `min(1, t/R)`. **It equals today's tick from `t >= R` only when `R <= 6.0`**, because a play stops at `clock.maxTick` 6.0 s (`tunables.ts:93`). At R = 8 the factor never exceeds 0.75 within a play, so every margin is capped at 0.75 of today's for the whole play and a rep needs `latent + jitter >= 20` to win at all.

**Both shapes are built at step 1**, each behind its own switch, with provisional values declared as provisional (S: theta 11, k 2, beta 0.5 as stated above; L: R 5, and R 8 as the priced point). Neither value is a candidate (ADR-061).

**How one is chosen, and when (V2-05, J1-3, J2-9).** The rule is filed at step 0 and applied mechanically at **step 5b**, once the contest, the throwing motion and the fitted quarterback count are in. Each shape is run over a filed grid of its one scale parameter (theta from 7 to 15 at k = 2, beta = 0.5, as stated above; R from 4 to 8). **Revision 2: every S grid point carries the push window (question 16, §4.1.1), and every arm of either shape runs step 3's free-run clock (question 4, §4.4).** The winner is the shape and value that minimise the attempt-weighted squared distance between the sim's hit rate on thrown balls by release bin and the real curve of §2.2, **each first divided by its own all-bin mean**, on **aimed throws on both sides** and **raw-second bins read from `THROW.releaseSeconds`**. Shape only: the level is left out on purpose, so that hits on thrown balls per dropback stay a prediction (§6.10). **The selection is re-run once, mechanically, after the contest's sack boundary b is fitted at step 10** (b moves hits between release bins, §4.5); §6.10 files the order. **Question 6 was answered Now,** so `releaseSeconds` (P8) exists from step 4 and the selection reads raw-second bins. **When a beaten blocker's man reaches him, for that reading, is filed at step 0 (default D21, §4.5):** read at his breaking time plus his travel, the stand-in hit curve rises like the real one; read on the half-second grid it still falls (REPORTED, `TOT` §8.5). **Under shape L, filed at step 0 too** (settle): L has no breaking time, so a won rep's continuous time is its crossing time, interpolated within the tick from its two reported margins, `T_L = (t - 0.5) + 0.5 * (15 - m(t - 0.5)) / (m(t) - m(t - 0.5))`, clamped to (t - 0.5, t], where t is the first tick at which the margin reaches 15 (RUSHER_WINS_REP); his arrival is T_L plus his travel, so both shapes are scored on the same reading. A touched man's late block is read the same way on each shape (§4.4.2).

- **Why not at step 1.** Warning 3: in every test run the sim's hit curve falls with release time, so it cannot discriminate before step 4's motion exists (attempt-weighted RMS against the real curve is 7.9 to 10.1 over the seven bins in all 17 runs, S and L alike; 8.2 to 10.6 against the tick-aligned curve; COMPUTED in round 2).
- **Fallback (Orchestrator default D1).** If the shape-only loss does not separate the grid (the best and worst points within twice the loss's own spread across two seed sets), the **pressured-by-release** curve becomes the selection curve. It is then moved out of the falsifiers and into the fitted ledger, and the report says so.
- **Not on sacks** (post hoc in the ADR-061 sense; pkA's own evidence has sacks moving 4.9 to 7.1 between R = 8 and R = 5). **Not on ESPN** (no league average; entry 125).

**What revision 1's test runs already show, and what it does and does not license** (COMPUTED, gen, all with the stand-in hold and the coin contest of Appendix B; RMS = attempt-weighted RMS distance from FTN's pressured-by-release curve over the first five bins, weighted by FTN's attempt shares on the same grid; "bins > 2x" counts release bins from 2.0 s on above twice FTN; both shown **tick-aligned, with the raw-second figure in brackets**, re-scored at full precision in the settle):

| run | pressure | hit-or-sack | sack | release | first PRESSURE-or-worse | curve RMS | bins > 2x |
|---|---|---|---|---|---|---|---|
| base | 85.26 | 24.04 | 16.72 | 1.235 | 0.883 | 63.9 (63.3) | 4 (3) |
| L, R = 8, free rushers as today | 65.30 | 12.07 | 5.64 | 2.577 | 1.931 | 42.8 (38.6) | 4 (3) |
| L, R = 8, free rushers late | 57.56 | 4.99 | 2.38 | 2.657 | 2.443 | 36.3 (31.2) | 4 (4) |
| L, R = 8, late, PRESSURE horizon 0.5 s, **heels counter off** | 39.35 | 4.87 | 2.31 | 2.674 | 2.720 | 18.4 (15.0) | 2 (0) |
| L, R = 5, late, PRESSURE horizon 0.5 s | 68.19 | 12.22 | 4.82 | 2.477 | 2.126 | 48.0 (43.5) | 4 (4) |
| S, theta = 9, late | 40.81 | 6.97 | 3.17 | 2.722 | 2.503 | 16.4 (13.0) | 1 (0) |
| S, theta = 11, late | 34.52 | 5.95 | 2.77 | 2.771 | 2.568 | 10.4 (7.3) | 0 (0) |
| S, theta = 13, late | 29.77 | 5.28 | 2.45 | 2.804 | 2.577 | 7.4 (5.0) | 0 (0) |
| S, theta = 8, k = 3, late | 34.28 | 4.88 | 2.26 | 2.776 | 2.753 | 9.7 (6.7) | 0 (0) |
| S, theta = 11, free rushers as today | 43.72 | 12.75 | 5.95 | 2.694 | 1.743 | 24.0 (22.9) | 1 (1) |

The sack figures of the S rows with late free rushers are REPORTED-UNREPRODUCED (K2's re-run under the stated formula gives 2.47 to 2.50 at theta 11, 3.01 at theta 9, 2.27 at theta 13; theta 8 with k = 3 was not re-run; Appendix B).

Stated plainly: (1) **shape S at theta 11 and 13, and at theta 8 with k = 3, leaves no bin above twice FTN on either grid; no shape L run passes on the tick grid**, the best (heels counter off) leaving two bins, the second marginal (45.1 against 44.6); that run and the R = 5 run used a half-second PRESSURE warning that no answer to question 3 offers (R2-01); (2) the theta values above were chosen **while looking at that curve**, so they are existence proofs, not candidates (ADR-061); (3) **sack rows for both shapes are already open** in Appendix B, so the protection against a post-hoc choice is the mechanical rule filed at step 0, not blindness.

**Pre-registered falsifier (J1-2, J2-6).** After step 5b, any release bin from 2.0 s on above twice FTN fails, on raw-second bins read from `releaseSeconds` (if the fallback was used, this row is fitted and is reported instead).

**Reproducibility from the stream (J2-4, V2-14).** The margin now depends on R (or theta, k, beta), which is not on the stream today. The **rules version and the tunables digest of its overlay are written on `PLAY_START`'s engine payload**, typed `unknown` (`contracts/src/events.ts:233`), so no contracts edit, and **only when the rules are not `legacy`**, so legacy streams stay byte-identical. Every dial is pinned by that version. `determinism.test.ts`'s `pass_rush_tick` margin rule and the roll-accounting rule are updated in step 1. Shape S's once-per-rep draw is a new die, published as a `pass_rush_beat` CHECK (petition **P2, needed at step 1 in every case** (revision 1's P7), because both shapes are built there; its `RollDetail` for a uniform rather than a d100 is confirmed by `contracts-guardian`, INFERRED). **If L wins at step 5b, the S path is deleted from the engine in that commit and the kind is removed by a named contracts edit (P2r), with P3 reverted (P3r)**, rather than left without a producer as `fumble` is today.

#### 4.1.1 The push window (question 16, Yes; shape S, `pocket-1` only; new in revision 2)

Under shape S a block reports `min(0, m)` before its beat, so a slow bull rush shows nothing until it breaks (above). The owner answered Yes to showing it (`NEWQ` card 3). The rule (`TM` §3.3):

- **It applies to a matchup with move POWER and latent margin m from 1 to 14** (CHOSEN). Let t_b be the beat tick, the first tick at or after T_j.
- **On t_b - 1.0 the rep reports `min(m, 4)`, which is RUSHER_GAINING; on t_b - 0.5 it reports `max(m, 5)`, which is BLOCKER_BEATEN, for every margin from 1 to 14.** Settle: the owner's Yes card showed him "losing ground, then beaten but in front" with no margin limit (`NEWQ` card 3), so a narrow bull rush is shown beaten too; revision 2 first reported m, which left margins 1 to 4 at GAINING. The bands are today's (`tunables.ts:482-487`, CHECKED, TM). The window's length, 1.0 s, is CHOSEN; a window tick before 0.5 s is dropped, so a rep that breaks at 1.0 s reports only its t_b - 0.5 tick, and one that breaks at 0.5 s reports none.
- **What the status shows, one tick late:** at t_b - 0.5 it reads t_b - 1.0's GAINING, so CLEAN (`tunables.ts:1304`) with the counter at 1; at t_b it reads BEATEN, so PRESSURE (`:1303`) with the counter at 2; at t_b + 0.5 the interior threat built at t_b with the unchanged 1.0 s travel is 0.5 s out, COLLAPSING under Half from the arrival floor anyway. **So the window adds exactly one PRESSURE tick, the beat tick, for every 1 to 14 POWER rep whose block breaks at 1.0 s or later** (CHECKED, TM, for 5 to 14; margins 1 to 4 add about 40% to M1's count, since POWER interior reps are 3.6% at 1 to 4 against 9.1% at 5 to 14, `TM` C1, INFERRED).
- **At t_b the threat is built exactly as §4.1 says, tagged PUSH and engaged.** ADR-058's one arrival path and ADR-061's interior 1.0 s stand: "still on him" changes the contact tilt (§4.5), not when he arrives (`CM` T23). A separate reach clock racing the beat was rejected because it needs a second die per rep and a second arrival path, which ADR-058 closed (`TM` §3.3).
- **No new die.** The window is a function of T_j, which is drawn once per rep (P2). P3's description names the window's two ticks (§7). The ADR-059 amendment widens: before the beat a matchup reports `min(0, m)` except on those two ticks.
- **Shape L is unchanged.** Under L there is no window; PUSH is a POWER rep that reported BEATEN before it won.
- **Size.** On gen base 17.6% of dropbacks hold at least one POWER rep at 5 to 14, 4,522 of 4,523 of them interior (COMPUTED by TM, C1), a loose ceiling; margins 1 to 4 add about 40% more reps (INFERRED, above). In TOT's stand-in, which followed revision 2's first rule (so margins 1 to 4 added no PRESSURE there, INFERRED), the window moved pressure by +0.3 points and hits and sacks by 0, with about 40 PUSH contacts a season (REPORTED, `TOT` §8.4). Step 0's M1 counts the real effect engine-free; step 1 files "the window alone moves pressure by at most M1's count, and sacks within 0.3" (`CM` T1).
- **S without the window is an information arm only, never a candidate**, because question 16 is Yes. `engine/test/determinism.test.ts:354-381` asserts BEATEN and GAINING ticks occur; with the window its POWER fixtures may make it pass again under S (INFERRED, `TM` §3.3; verified at step 1).

### 4.2 Whether a beaten blocker is pressure (question 1, answered Today)

**The ruling this question touches (K3-02).** In July 2026 the owner amended §7.2: PRESSURE requires either (a) a won rep whose arrival falls inside the pressure horizon, or (b) "a margin high enough that the blocker is **beaten** rather than merely losing ground" (`ADR-033:34-38`; ADR-033 is approved and implements it). Limb (b) is today's `BLOCKER_BEATEN -> PRESSURE` floor, recorded as its consequence at `match-engine.md:565-587` with the counter row that gives BEATEN and GAINING +1 each.

**The answer: Today.** The July ruling stands as it is: BEATEN floors PRESSURE, and BEATEN and GAINING each add 1 to the counter. No tunables change, and ADR-033's limb (b) is not amended.

**What revision 2 withdraws.** Revision 1's first reason for recommending Today was that under shape S "the answer changes nothing on the field". **With the push window that no longer holds:** a bull rush winning by 1 to 14 shows BEATEN on t_b - 0.5, so the pocket reads PRESSURE on its beat tick when the block breaks at 1.0 s or later (§4.1.1; `QCH` card 1). The window's price is M1's, filed at step 0.

**Kept from revision 1, as the record behind the answer** (`R1:235`; its first clause is the one withdrawn above):

> **Why Today is recommended (round 2 changed this from Heels).** (1) Under shape S, the shape every test run favours, a matchup reports only `min(0, m_j)` bands before the beat and RUSHER_WINS_REP after it (§4.1), so BEATEN and GAINING never occur and **the answer changes nothing on the field**. (2) Under shape L, no answer passes the twice-FTN check on the tick grid in revision 1's test runs: every run that keeps the heels counter (L R8 today, L R8 late, L R8 late with PRESSURE 0.5 s, L R5 late, and flat L R8) leaves four bins from 2.0 s on above twice FTN (on raw bins three or four: three for L R8 today on gen and on flat, four for the rest, re-scored at full precision, R1-06), and the run with Past only leaves two, one marginal (§4.1); the Past-only run and the R = 5 run used a half-second warning no answer to question 3 offers (R2-01). Today was not run under L (INFERRED no better than Heels). So a reversal of the owner's ruling buys nothing measured. (3) **If L wins at step 5b, question 1 comes back to the owner with those numbers before 5b's graded arm runs.**

**If shape L wins at step 5b, questions 1, 3 and 16 come back to the owner together, with the per-rusher must-act effect of §4.3, before 5b's graded arm runs** (`CM` T1, T2(c)). Under L, PUSH is defined as BEATEN before WINS. Revision 1's Heels and Past-only tunables (its M2a to M2c: the BLOCKER_BEATEN floor to CLEAN at `tunables.ts:1303`, GAINING's counter delta 1 to 0 at `:536`, and for Past only BEATEN's delta too) run at step 1 only as information arms under L, for that return package.

**The price of each, for the record.** At the design horizon (pkA, hold proxy h2, REPORTED): removing the heels counter takes pressure down 13.5 (flat, R = 8), 12.6 (gen, R = 8), 7.9 (flat, R = 5) and 7.1 (gen, R = 5) points, with sacks within 0.2. In revision 1's run with a shorter PRESSURE horizon of 0.5 s (beyond this design), 55.95 -> 39.35, sacks 2.36 -> 2.31 (COMPUTED). The ruling covers both ADR-049 channels at once, before step 1 lands (J1-4).

### 4.3 Must act, per rusher, and the pressured warning (questions 2 and 3, answered Half and Follows)

- **The forcing point (question 2, Half).** `arrival.collapsingWithinSeconds` 1.0 -> 0.5 (`tunables.ts:1046`, CHECKED): he must act when a rusher is half a second away, not a second (revision 1's M3a).
- **Made per rusher** (`TM` §3.6; question 2 told as "when a rusher is one step away"):

  ```
  mustAct(tick) = exists threat:  (registered(threat) and eta(threat) - tick <= 0.5)  or  arrived(threat)
               or tick >= budget  or  readsUsed >= maxReads       // the count part, as question 7 decides (§4.6)
  ```

  Under `pocket-1` it replaces `forcesDecision(pocket)` inside `mustDecide` (`sim/passPlay.ts:1029`, CHECKED). The movement branch (`:1187`) is gated by its threat part: a registered threat within 0.5 s. An arrival goes to contact (§4.5). `POCKET_STATUS` stays the worst of the counter, the band floor and the arrival floor (`resolve/pocket.ts:212-223`, CHECKED, TM) and still drives accuracy and the read penalty. **The counter's COLLAPSING alone no longer forces**, a named amendment of `match-engine.md` §7.2 and of the use of `tunables.ts:1398`. Until step 7 builds sight, every threat counts as registered.
- **Must act reads the same tunable as the forcing point (default D32).** Its half second is `arrival.collapsingWithinSeconds` itself, not a new dial, so question 3's warning stays tied to it by the July rule (`CM` T2).
- **How much it changes under S** (`TM` §3.6, C2, corrected arithmetic): under S the counter is 0 before the beat, the beat adds 2, and the status reads the previous tick's count, so it shows PRESSURE at t_b + 1.0 and COLLAPSING at t_b + 1.5. The rusher arrives at t_b plus his travel. **So the counter forces earlier than Half only when travel is 2.5 s or more**: 399 of 14,627 edge won-rep threats on gen base (2.7%), 393 of them cornerback blitzes (COMPUTED by TM). Under L the counter builds without a threat, so the effect is larger there (INFERRED); it joins the L return package (§4.2).
- **An unseen rusher does not force at half a second; his arrival does** (`TM` §3.6), which keeps revision 1's "IMMEDIATE always forces" for arrivals. So "half a second away" means a rusher he has registered. **A LATE threat** (§4.8) **is registered from the first tick he is within 0.5 s and not before** (recheck, CHOSEN): he sees that man only at half a second, so the man sets must act there, with one read fewer, and never sets off the alarm; a NEVER threat is never registered. The same definition holds in §4.7 and §4.8. Before answering, the owner was told that only a rusher half a second away, a rusher reaching him, or his count running out would make him act (`TMP:107`), and that sight is one roll per rusher (`TMP:46`); the owner answered question 15 All.
- **A narrower alternative runs as an information arm at step 2:** keep `forcesDecision`, but leave out of the counter any matchup whose won rep already has a live threat the arrival floor sees.
- **The pressured warning (question 3, Follows).** `pressureWithinSeconds` is 2.0 today (`tunables.ts:1117`, CHECKED). The owner ruled in July 2026 that its value is derived, C + (C - I), where C is the collapsing horizon and I the immediate one, "ratified as derived", and re-litigated only by moving one of them (`tunables.ts:1047-1088`, the table at `:1058-1069`; entry 76, `docs/decisions/CALIBRATION-BACKLOG.md:4918-4935`; CHECKED in revision 1). Follows applies that rule. As revision 1 described it (`R1:243`, kept):

  > **Follows (recommended).** The warning is re-derived by that rule: 1.0 s if question 2 is Half, 2.0 s if Second. Entry 76 ratified 2.0 "as derived, and explicitly NOT re-derived", because "re-deriving it now that more is known would be the fitted version wearing the derivation's clothes" (`CALIBRATION-BACKLOG.md:4930`, `:4936-4938`). Follows does not do that: it keeps the formula and looks at no rate; the value moves only because C moves, which is the route the ratified derivation itself names for re-litigating its value (`tunables.ts:1058-1069`). So it applies the July ruling rather than amending it; the owner is asked because keeping the number (Two seconds) is the other defensible reading (R1-15). **Fourteen of the 17 test runs of Appendix B, and pkA's A123, used it; the three labelled "PRESSURE 0.5 s" used a half-second warning that no answer offers** (R1-01, R2-01; CHECKED in the runs' saved configurations).

  With Half, the warning is **1.0 s, a status only**: with must act per rusher, PRESSURE no longer forces, but it still drives the pressured count, accuracy and the pocket's read penalty (`tunables.ts:1382-1387`, as cited at `TM` §3.4). At step 7 an information arm counts only registered threats in that read penalty; the status itself stays physical (`CM` T3(b)). The counter is untouched (`QCH` card 3).
- **"Past him" was not chosen**, so ADR-033's limb (a), entry 76 and ADR-058's removal of a second won-rep channel are not amended. The one-tick CLEAN gap after a won rep it would have closed stays, as a reported falsifier (§6.10), with PUSH reps counted apart because the window fills that gap for them (`CM` T3(c)). Revision 1's measurement of that gap is kept (`R1:247`):

  > **Why Follows is recommended.** It keeps both July rulings as written and is the only answer with a measured basis. **The gap Past him closes is one tick long under the shape the test runs favour, but it is not rare** (R1-02): under shape S every post-beat tick reports RUSHER_WINS_REP (+2 a tick, PRESSURE at 3, `tunables.ts:534`, `:1350-1355`), so a won rep floors the pocket through the counter from his second tick, and the gap is the beat tick of a won rep more than the warning away. Today the state "live WON_REP threat, CLEAN pocket" occurs on 30 ticks in 272 gen games and 60 in 496 flat games, about 33 per 272 (REPORTED, K2's saved diagnostics; the comment at `resolve/rushThreat.ts:821-823` calling it unreachable is stale, `maps/gaps.md` item 13). **Under shape S it occurs 812 to 1,020 times per 272 games in K2's runs** (gen theta 11 late 1,020 ticks on 1,019 dropbacks; flat theta 11 with free rushers as today 924 on 920; flat theta 13 late 812 on 805) **and 932 to 1,066 in R1's re-measure** (REPORTED, `k2out/*.json` diag, read in the settle). So on about one gen dropback in 27 (1,019 of 27,648) the pocket reads CLEAN for the half second in which a rusher has beaten his man, and on at least 99% of those dropbacks it is that one tick only. Past him would make that tick PRESSURE. It changes the pressured count only on plays that end on that tick, so by at most about 3.7 points (INFERRED upper bound), the same order as the bracket filed for Past him below. The recommendation stands on the July rulings, and the owner is shown the count (card 3). Under shape L a rep that wins once and is then held reports lower bands and the counter stops, so the gap is larger: **if L wins at step 5b, question 3 comes back to the owner with that count before 5b's graded arm runs.** Past him was never measured (J2-2); its price is INFERRED at 0 to +3.4 points of pressure flat and 0 to +2.8 gen (bracketed by pkA's A12 and A123) and is marked **unpriced** in §6.2.

**Price of the forcing point with Follows** (pkA, A12 -> A123 on top of the slowed line at today's clock, REPORTED): pressure -3.36 flat / -2.84 gen; hit-or-sack +0.81 / +0.61 (2.86 -> 3.67 flat, 3.40 -> 4.01 gen); sacks +0.53 / +0.39. Revision 1's own pair 57.56 -> 55.95 shrinks PRESSURE from 1.0 to 0.5 s, beyond this design, and is **not** M3a. Every one of revision 1's slowed-line runs already has COLLAPSING at 0.5 s.

### 4.4 Rushers nobody blocked (question 4, in the owner's words)

**The owner's answer, quoted in full** (2026-10-24):

> "A completely unblocked rusher does not turn into a late block. It turns into a situation of their starting position (a rusher from the nose tackle position will be closer to the QB than a linebacker lining up on the outside), their acceleration and speed, how far back the QB is dropping, and if it's seen by the QB then at a certain point it initiates what we were calling our first forcing point where the QB recognizes that his pocket is breaking."

**The rule this design builds from it:**

1. **A completely unblocked rusher is never a late block, and never a uniform delay.** Revision 1's late, weak block is dropped for him, and so is its fallback (revision 1's card-4 option "Later", the delay the owner's words replaced).
2. **He arrives by a physical clock**: from where he is at the snap (a placeholder table, the owner's question 19, §4.4.3), at his own acceleration and speed (default D18), to the depth of the quarterback's drop (default D22). Rounded to a tenth, with no die (ADR-005).
3. **If the quarterback sees him, the alarm fires at a certain point**: on the first tick the man is within 1.0 s, never at the snap (default D20, §4.0); seen late, there is no alarm and he reacts at must act with one read fewer; never seen, nothing until contact (§4.8).

**Today's free runners** (revision 1's paragraph, `R1:253`, kept):

**Today** (REPORTED, `maps/gaps.md:81-88` from MEAS:160-163): UNBLOCKED 3.4%, PICKUP_LOST 11.4%, STUNT_LOOPER 11.7% of dropbacks, each counting a dropback with at least one threat of that origin, so the shares overlap (MEAS:155); 29% of first dirt. **Due times (K2-06):** truly unblocked rushers are nearly all due at 1.5 s (26,034 of 28,128 unblocked dropbacks, 92.6%, by the first published ETA, MEAS:192); lost pickups have median 1.5 s and mean 1.83 s (MEAS:162); loopers median 2.0 s (MEAS:163; `tunables.ts:585`). Measured arrival ticks on gen base (REPORTED, K2, `k2out/gen-base-diag2.json`): UNBLOCKED 92.4% at 1.5 s (811 of 878); PICKUP_LOST 54.8 / 29.8 / 9.9 / 5.4% at 1.5 / 2.0 / 2.5 / 3.0 s; STUNT_LOOPER 51.5 / 48.5% at 2.0 / 2.5 s. RAN_THROUGH and LATE_EXCHANGE add +0.5 s (`tunables.ts:633`, `:576`); free paths are clamped to 0.5 to 4.0 s (`:747-748`).

#### 4.4.1 Who is "completely unblocked" (Orchestrator default D19)

**Default: a man nobody laid a hand on.** That is origin UNBLOCKED, a pickup BLOWN_UP (the back missed him clean) and a looper LOOPER_FREE (the line never touched him). These men run on the free-run clock, and every rule keyed on that clock (the alarm's timing D20, the +10 contact tilt, no throwaway at contact) applies to all three, the looper labelled THROUGH included (§4.0). A man who ran through a back's hands (RAN_THROUGH) or was picked up late on a stunt (LATE_EXCHANGE) is a block lost in contact: the blocker is still on or beside him (`FR` §6, D-F3).

- **Why.** "Completely" means nobody's hands were on him; a back who whiffs is behind the blitzer and turned the wrong way, so the blitzer is as free as a man nobody was assigned (INFERRED). The engine's own tables already draw this line: the late exchange is "somebody got a hand on him", against "a clean miss" (`tunables.ts:579-584`, CHECKED), and a lost pickup's delay is "he had to get through a body" (`sim/preSnap.ts:509-511`, CHECKED, FR), which the clean miss does not carry.
- **The three readings, priced as stand-ins** (gen, revision 1's pricing setting: shape S theta 11, stand-in hold, the coin contact, no motion; REPORTED, `FR` §7.2 and `TOT` §4.1; the 2.0 s bin is on the tick grid, limit 29.4):

| reading of "completely unblocked" | who is on the free-run clock | pressure | hit-or-sack | sacks | 2.0 s bin | quick share |
|---|---|---|---|---|---|---|
| (a) nobody was assigned to him | UNBLOCKED only; every lost block late | 33.93 | 4.82 to 4.92 | 1.86 | 29.36 | 33.7 |
| **(b) nobody touched him (D19)** | UNBLOCKED, BLOWN_UP, LOOPER_FREE; touched men late | 39.04 | 9.09 to 9.27 | 3.55 | 46.97 | 60.3 |
| (c) every free runner | all three origins; touched men +0.5 s | 43.18 | 9.31 to 9.49 | 3.60 | 58.50 | 71.7 |
| contrast: today's times | | 43.22 | 12.37 to 13.00 | 5.89 | 53.64 | 72.2 |
| contrast: revision 1's "Later" | lost pickups +2.5 s, loopers +2.0 s | 33.85 | 5.41 to 5.69 | 2.47 | 26.87 | 33.3 |
| real | | | 14.71 | 6.56 | 14.7 (FTN) | about 41 to 45 (INFERRED) |

  (The hit-or-sack ranges are the two readers' counts: TOT's official count leaves out hits on scrambles, FR's counts every arrival.) Reading (a) holds the bin only by turning a clean whiff into a late block, and it has fewer hits than "Later". **It would make a whiffed back's man (BLOWN_UP) and an untouched looper (LOOPER_FREE) late blocks, which the owner's question-4 words rule out, so it is priced as information only and is never offered** (settle). Reading (b) is the honest middle; it still leaves the 2.0 s bin at 47.0, and the bin comes down only if free runners are rarer (§4.4.6). Flat moves the same way (`FR` §7.2).
- **One line to the owner, a confirmation, not a new card:** "we read 'completely unblocked' as a man nobody got a hand on; a back or lineman who got a piece of him becomes a late, weak block, as card 4 described."

#### 4.4.2 Where revision 1's late, weak block survives, and why

**Only for a man somebody got a hand on** (RAN_THROUGH, LATE_EXCHANGE), because the owner's words are about "a completely unblocked rusher" and do not reach a man who was touched. The two-moments page had already shown the owner "a late man: a lineman looping round on a stunt, or a back who loses the blitzer he picked up" among the situations the game can do (`TMP:32`), and that a beaten late block comes round the corner or straight through (`TMP:109`). Revision 1's mechanism, restricted to those men (`R1:257-258`, kept):

- **A lost pickup becomes a late, weak block.** The picking-up player engages at a **new** engagement time `t_e` (a declared dial: today's bands at `tunables.ts:630-634` carry the rusher's `arrivalDelaySeconds` 0.0 / 0.0 / 0.5 / 0.0, not a blocker's engagement time, V1-45), and that matchup starts its own block clock at `t0 = t_e`, with a weak-block multiplier in its scale. He is not free; he is blocked late and badly.
- **How the late block runs on each shape** (settle; CHOSEN, filed at step 0). Its rep margin is the touching CHECK's margin turned round, `m = -(margin)` of the `blitz_pickup` or `stunt_communication` CHECK, so 1 to 19 (RAN_THROUGH and LATE_EXCHANGE both span -19 to -1, `tunables.ts:576`, `:633`, CHECKED in the settle). **Shape S:** its breaking time is `T = t_e + w * theta * exp(-beta * m/41) * E^(1/k)`, w the weak-block multiplier, with E drawn on fork `beat/<rollRef>`, where rollRef is that CHECK's `rngLabel` (`sim/preSnap.ts:525`, `:594`), which no `pass_rush_rep` shares, so it cannot collide with a won rep's beat; it is published as a `pass_rush_beat` CHECK (P2 names this use). **Shape L:** its margin is `round(min(1, (t - t_e)/(w * R)) * (m + jitter_t))`, the jitter drawn each tick on `.../t<tick>/<rusherId>:late`. Once beaten, his threat is built as a won rep's is (§4.1), and D21 reads his time as the shape's breaking or crossing time plus that travel.
- **A looper off a failed exchange becomes a late matchup with the second blocker** (`tunables.ts:573-577`), and the stunt ETA hand-off defect (`sim/preSnap.ts:570-581`, `:608-618`) is fixed here.

Restricted: the late block covers RAN_THROUGH pickups and LATE_EXCHANGE loopers only; BLOWN_UP and LOOPER_FREE men are on the free-run clock. Once beaten, the late block's man is ARC if EDGE and THROUGH if INTERIOR (§4.0). **It was never built or run in any form:** FR's reading (b) stood it in with revision 1's uniform "Later" delay (Appendix D). Its dials (`t_e`, the weak-block multiplier) stay CHOSEN. The stunt ETA hand-off fix stays for every looper. **Where it would conflict with the owner's words, that is for any man nobody touched, it is dropped**, and the uniform delay is no one's fallback (§6.3, §6.10). The owner may overrule D19 with reading (c), in which nobody is a late block and a touched man is a free runner half a second later, as today (`tunables.ts:576`, `:633`).

#### 4.4.3 Where he starts, and the August halt (question 19, open; revision 2 first filed it as default D17)

**The facts** (CHECKED, `docs/decisions/ADR-066-the-geometric-travel-model.md:590-660` in the working copy). The owner halted ADR-066's geometry in August because "`gap`, `side`, and a rusher's depth class describe WHERE A DEFENDER LINES UP. THE MODEL NEEDS WHERE HE IS AT THE SNAP", ruled that "SNAP POSITION IS AN OUTPUT OF THAT [pre-snap] PHASE" and that "Geometry consumes snap position WHEN THERE IS ONE. Not before". What survives is the split of an arrival into distance and closing speed, and the card's gap and drop depth as the starting state of a phase (`FR` §2.2). ADR-066 also planned the free-runner path as its own later, measured change (`:251-257`, CHECKED, FR). The front looks already say where some men stand at the snap: a Mug shows backers walked up in the A gaps (ADR-073 §2.5, `docs/decisions/ADR-073-the-front-shown-rush-and-pressure-read.md:568-586`, CHECKED, CM), but physics never reads the shown rush today (`engine/src/types.ts:484-489`, CHECKED), and the contracts say a front look is "Never what is played (ADR-069 ruling 1)" and "Physics never reads it" (`contracts/src/playcalls.ts:470-471`, `:573`, CHECKED in the settle).

**What this needs from the owner: question 19, open** (settle; §15.2). The owner's question-4 words came after the halt and ask for exactly a starting position ("a rusher from the nose tackle position will be closer to the QB than a linebacker lining up on the outside"). But a table that takes a man's width from his gap, before any pre-snap phase exists, is the gap-to-position mapping the halt stopped (`ADR-066:596-599`: "A gap->lateral-offset mapping computes a distance from a position the defender does not occupy when the ball is snapped"; the halt's sequence, `:639-644`: "Geometry consumes snap position WHEN THERE IS ONE. Not before."). So the table loosens the August halt for free runners, and an Orchestrator default cannot amend an owner ruling: the free-runner reader said so ("Strictly, not without the owner", `FR` §2.3; "needs his word on a card", `FR` §8). Revision 2's first text ("follows ADR-066's own sequencing item 3", "states the halt rather than lifting it") is withdrawn: item 3 (`ADR-066:251-257`) is the plan the halt replaced, and it put the blocked path first. The question, recommended **Table now**:

- **Table now:** the table below is used **for men on the free-run clock only**, labelled a placeholder that the pre-snap phase replaces when it publishes snap spots; this is the halt's step 3 loosened for free runners on the owner's yes (§7.2);
- **Wait:** only down linemen get a spot (a down lineman lines up on the ball, so where he lines up is close to where he is at the snap, `FR` §2.3); this too is the halt's step 3 loosened, for down linemen only, on the owner's word (recheck: a down lineman's spot still comes from his gap before any pre-snap phase, so it is not outside the halt); every other free runner keeps today's set times (`resolve/rushThreat.ts:507-525`, `sim/preSnap.ts:584-596`) until the pre-snap phase gives real spots;
- **either way the halt stands for everything else**: blocked rushers keep revision 1's travel table (ADR-061), no gap-to-lateral offsets or coordinates are built for anyone else, and "his own deep drop into the edge rusher" stays later (`TMP:37`; `CM` T5(d));
- **either way no front look is read.** The table is keyed on his position, the call's disguise (a played field, `BlitzDisguise`, `contracts/src/playcalls.ts:448`) and his gap, never on a front look (Stem or Mug), because a look is "Never what is played" (above). A Mug's walked-up backer sits on the walked-up row. Reading the Mug for his depth runs only as an information arm at step 3; adopting it would need the owner's yes and a contracts petition for that doc text (§7.2), and is not proposed;
- **step 3's snap-spot arms wait for the answer**; M8 is filed at step 0 for both answers, and step 3's build check (§6.3) runs with the Mug arm off.

The card's words: "Until the pre-snap phase exists, may a rusher nobody blocked start from a small table of typical snap spots, set by his position, how his blitz is disguised and his gap? In August you ruled snap spots come only from that phase." (`cards-r2.json`).

**The table under Table now** (`FR` §2.3, CHOSEN; yards; depth is off the ball, width is from the centre; gap widths A 0.75, B 2.25, C 3.75, D 5.25 from about 1.5 yards per offensive lineman, INFERRED; an EDGE rusher sets up 0.75 outside his gap):

| man at the snap | depth | width | start |
|---|---|---|---|
| down lineman (where the card aligns him; a Stem is a look and is never read) | 1.0 | his gap; EDGE +0.75 | reacts to the snap |
| linebacker walked up (STANDARD or ZERO disguise; STANDARD's text is "LB walked up", `contracts/src/playcalls.ts:439-448`) | 2.5 | his gap | reacts |
| linebacker disguised (ZONE_BLITZ, DELAYED, the creeper) | 4.5 | his gap | reacts; DELAYED waits +0.5 s |
| linebacker on the edge (EDGE D) | 1.5 | D +0.75 | reacts |
| slot or dime corner | 5.0 | 7.0 | reacts; DELAYED +0.5 s |
| safety creeping (none on today's cards) | 7.0 | 3.0 | already moving at 3 yd/s, no reaction |

No safety rushes on any card today; the rushers from depth are the nickel and dime corners and A- and B-gap backers (`playbook/src/defensiveCards.ts:154`, `:786`, `:470-471`, `:505-510`, `:558-559`, `:712`, CHECKED, FR; `:713` on the same card is an edge backer in the D gap, the table's edge row, recheck). A Mug-tagged backer and the Double A calls' backers alike sit on the walked-up row at 2.5 yards, because no front look is read (`FR` §5.2 for Double A).

#### 4.4.4 His speed and acceleration (Orchestrator default D18; filed, never fitted)

Read through the registry: `getAttr(player, ATTR.speed)` and `ATTR.acceleration`, registered for every position (`contracts/src/registry.ts:63-64`, CHECKED; `engine/src/attrs.ts:56-57`, CHECKED, CM). No applicability petition. This is the speed term ADR-031 recorded as a separate petition (`ADR-031:116-119`), now with acceleration. The conversion (`FR` §3.3):

1. **40 time from Speed:** the fictional rosters rate Speed from the 40 with 4.22 s = 99 and 5.60 s = 0 (`attributes/src/fictional/derive.ts:19-28`, CHECKED, FR), so `40 time = 5.6 - 1.38 * Speed / 99`.
2. **The start, tau, from Acceleration against Speed:** `tau = 0.77 - 0.007 * (Acceleration - Speed)`, clamped to 0.63 to 0.91 s. Clark's 0.77 s is the centre and ten points of Acceleration above Speed is one of Clark's standard deviations; it is relative because fast and slow men start alike and because our Acceleration is 0.7 Speed + 0.3 Agility plus noise (`derive.ts:30-50`, CHECKED, FR).
3. **Top speed** solves the 40: `40 = vmax * (F - tau * (1 - e^(-F/tau)))`, F the 40 time.
4. **Distance after t seconds:** `x(t) = vmax * [t - tau * (1 - e^(-t/tau))]`; for a man already moving at v0 (the creeper), `x(t) = vmax * t - (vmax - v0) * tau * (1 - e^(-t/tau))`.
5. **The get-off allowance, 0.35 s,** before he runs (0 for a man already moving). A 4.76 s end then crosses his first yard at 0.78 s, between Myles Garrett's league-best 0.73 and Rashan Gary's 0.85 to 0.95 (INFERRED fit, `FR` §3.3).

What it gives (COMPUTED by FR offline): a nose tackle at Speed 32 runs a 5.15 s 40 and reaches 9.17 yd/s; an end at 60 runs 4.76 s, 10.05 yd/s and a 1.69 s ten-yard split, against a real 1.60 to 1.67 (so the model is 0.02 to 0.09 s slow over 10 yards, partly because the combine timer starts on first movement, INFERRED); a corner at 80 runs 4.48 s and 10.80 yd/s. On a pass rush he rarely reaches top speed: at 1.2 s an end is at 79% of it (COMPUTED by FR).

**These constants are filed at step 0 and never fitted.** A 0.1 s change in the get-off moves sacks by more than a point (below), so fitting them would quietly fit the sack rate (`TOT` §11.2).

#### 4.4.5 How deep he sets, the path, and the time (Orchestrator default D22)

- **The drop, by default D22, is the card's own `dropDepthYards`:** "the quarterback's distance behind the line of scrimmage at the moment of release", required on every card (`contracts/src/playcalls.ts:174-205`, CHECKED, FR): 5.0 yards for every shotgun card and 7.0 for every under-centre card (`playbook/src/passConcepts.ts:106-115`, CHECKED, FR). It is the field that already says how far back he is when he throws. **Its stated limit is a moving launch point** (`playcalls.ts:196-200`, CHECKED): under centre, a man due at 1.5 s meets him before his drop is done, so the model makes that man about 0.2 s late (INFERRED, `FR` §4). Putting every quarterback at 7 yards or deeper costs 0.6 sacks in 100 (COMPUTED by FR). The alternative is a drop derived from the first read's depth class (`CM` T5); the drop floor of §4.6 keeps reading that class, as revision 1 ruled (J1-9).
- **The path** (`FR` §5.1): straight through a gap, `L = sqrt((depth + drop)^2 + width^2) - 1.0`, the 1.0 being the reach (hands on him from about a yard, INFERRED); around the edge the same times 1.1 for the bend round the tackle (INFERRED); a looper first crosses to his partner's gap, |x_partner - x_own| + 0.5 yards, positions signed by side, then runs straight.
- **The time:** `ETA = get-off 0.35 s + any DELAYED wait 0.5 s + T`, where `x(T) = L`, rounded to 0.1 s as today (`resolve/rushThreat.ts:524`, CHECKED). A touched man under reading (c) would add 0.5 s; under D19 he is a late block instead (§4.4.2).

**Typical times** (COMPUTED by FR offline, each man at his position's typical rating; today's figure for the same man in the last column):

| rusher | snap spot (depth, width) | quarterback at 5 yd | at 7 yd | today |
|---|---|---|---|---|
| free nose tackle, head up on the centre | 1.0, 0 | **1.50** | 1.77 | 1.0 |
| 3-technique | 1.0, 1.9 | **1.53** | 1.78 | 1.0 |
| end in the C gap | 1.0, 4.5 | **1.71** | 1.92 | 1.5 |
| wide edge rusher | 1.5, 6.0 | **1.88** | 2.08 | 1.5 |
| A-gap linebacker at 1.5 yards (the Mug information arm only) | 1.5, 0.75 | **1.49** | 1.73 | 1.5 |
| walked-up B-gap linebacker | 2.5, 2.25 | **1.65** | 1.87 | 1.5 |
| off linebacker at 5 yards, B gap | 5.0, 2.25 | **1.93** | 2.15 | 1.5 |
| slot corner blitz | 5.0, 7.0 | **2.20** | 2.39 | 2.5 |
| creeping safety, moving 3 yd/s at the snap | 7.0, 3.0 | **1.55** | 1.75 | 2.0 or 2.5 |
| end looping from C to the A gap | | 1.87 | 2.10 | 2.0 |

**What decides the time is where he starts and how deep the quarterback sets.** Speed from the 10th to the 90th percentile of the men who ran free moves the unblocked backers by 0.07 s (1.57 to 1.64); two yards of drop move everyone by about 0.25 s; lining up 5 yards off the ball instead of 1.5 costs about 0.45 s (COMPUTED by FR, `FR` §5.2). That is football: over 5 yards a 4.5 man and a 4.8 man are less than a tenth apart (INFERRED). Against real timing, SIS puts free-rusher pressure in the first two seconds and the overall peak at about 2.5 s (§2.4); the model puts free runners at 1.5 to 2.2 s.

#### 4.4.6 The half second, and what the clock does to the totals

- **The game checks arrival on the half second** (`tunables.ts:90`, CHECKED, FR): a man due at 1.6 s arrives on the 2.0 s tick. So a tenth of a second can move an arrival by half a second: changing the get-off from 0.35 to 0.25 s takes sacks from 3.60 to 4.75 in 100 and hit-or-sack from 9.49 to 10.86 under reading (c) (COMPUTED by FR, `FR` §5.3).
- **Default D21:** the stream keeps `etaTick` in tenths, as today; until step 4 contact resolves on the tick at or after it, as today; **from step 4 a free runner's arrival, and a beaten blocker's man at his breaking time plus his travel, are compared with the ball's release time inside the tick** (§4.5), so a tenth stays a tenth **in a race between the throw and the hit** (INFERRED to remove that knife edge, `FR` §5.3). **A held ball's contact still resolves on the half-second grid**, so a tenth in the free-run constants can still move the tick of contact when he still has the ball (settle).
- **Revision 1's step-3 check "no single tick holds more than 50% of truly unblocked arrivals" is withdrawn.** Under the free-run clock 280 of 347 unblocked arrivals (81%) land on one tick because physics puts them there (an A-gap backer at 1.6 s), against 92.4% of today's unblocked due times on the 1.5 s tick (811 of 878 records, a share of due times, not of arrivals; K2's diagnostics, R1-08) (COMPUTED by FR, `FR` §5.3). The check measured a uniform table, not a clock.
- **The clock is fast for a man nobody touched, as it should be: a throw at 2.0 s with such a man on the play is pressured 99.4 to 100 times in 100** in every free-run arm on both leagues; without one the same bin reads 17 to 27 (REPORTED, `TOT` §7). So the 2.0 s bin passes only if free runners are on at most `(L - n) / (100 - n)` of the throws at 2.0 s, where L is the bin's limit on the grid in use (29.4 tick, 36.2 raw) and n the measured pressured share of 2.0 s throws with no free runner: about 15 in 100 on raw seconds at n = 25 (COMPUTED by TOT), about 6 on the tick grid at n = 25, and 23 on raw seconds at the hold nearer real, where n is 16.7 (`TOT` §4.4; COMPUTED in the settle). Measured: 44 under (c); 25 to 32 with every answered piece (on reading (c), as in WARNING 2) at today's supply; 9 to 13 with the supply cut by 30 points (REPORTED, `TOT` §7).
- **It moves the early hits, not the curve:** hits on thrown balls move from the 1.5 s tick to the 2.0 s tick, and the hit curve still falls without the motion (gen (b): 0.9 / 20.8 / 1.2 / 0.8 / 0.7 / 0.9 / 0.5 per 100 aimed throws by bin, REPORTED, `FR` §7.2).
- **The change map's expectation that the clock keeps the quick-pressure share near the real 41 to 45 is withdrawn.** Measured it is 57 to 81 in every free-run arm (REPORTED, `TOT` §7, §11.4). Free runners alone fill about a third to almost half of the pressured dropbacks with quick pressure (INFERRED arithmetic, `TOT` §7).
- **So the problem is how many, not when** (WARNING 2): there are 16.3 to 18.1 men nobody touched per 100 dropbacks against PFF's 6 to 8 unblocked pressures (§2.4; the units differ, so the comparison is INFERRED), and that is protection, not the pocket (revision 1's risk R1; `FR` §6). §6.10's miss rule handles it.

**Revision 1's hinge table, kept as the evidence of what a uniform delay does** (COMPUTED, gen, shape S, stand-in hold and coin; bin and RMS tick-aligned, the raw figure in brackets):

| free-rusher timing | theta | pressure | hit-or-sack | sack | P2S | first PRESSURE-or-worse | 2.0 s tick bin (FTN 14.7; limit 29.4) | curve RMS |
|---|---|---|---|---|---|---|---|---|
| **today's** | 11 | 43.72 | **12.75** | **5.95** | **13.48** | 1.743 | 53.83 | 24.0 (22.9) |
| **pickups +2.5, loopers +2.0** | 11 | 34.52 | 5.95 | 2.77 | 7.90 | 2.568 | 27.48 | 10.4 (7.3) |
| pickups +1.0, loopers +1.0 | 13 | 36.04 | 5.56 | 2.53 | 6.83 | 2.176 | 44.36 | 19.0 (16.7) |
| pickups +1.5, loopers +1.0 | 13 | 34.94 | 5.53 | 2.49 | 6.92 | 2.289 | 31.13 | 16.3 (13.7) |
| pickups +2.5, loopers +2.0 | 13 | 29.77 | 5.28 | 2.45 | 7.98 | 2.577 | 21.82 | 7.4 (5.0) |

The first two rows are the same-setting pair (V1-05); K2 reproduced both (today's: 43.22 to 43.59 / 13.00 / 5.89 to 5.92; late: 33.85 to 34.40 / 5.69 / 2.47 to 2.50, with P2S 7.16 to 7.20, so the late row's sack and P2S figures are REPORTED-UNREPRODUCED and the trade is, if anything, starker). The theta step 11 -> 13 with late rushers is separate: pressure 34.52 -> 29.77, hit-or-sack 5.95 -> 5.28, sacks 2.77 -> 2.45.

**Not petitioned:** the arrival is published in `RUSH_THREAT.etaTick` as today (`contracts/src/events.ts:282-291`, CHECKED); the snap-spot table, the conversion and the drop are engine-internal and deterministic. The engine's `RushThreat.distanceYards` and `closingSpeed` (`resolve/rushThreat.ts:88-137`, CHECKED, FR), filled today only for won reps from a nominal 7.5 yd/s (`tunables.ts:877`), are filled for free runners under `pocket-1` with the clock's distance and the trip's average speed, and the comment saying they are "only ever present on a WON_REP threat" is amended. Putting them on the stream is optional petition P5 (§7), advised so that debug text, calibration and the viewer read one distance rather than re-deriving it (`FR` §8).

**For whoever builds it** (`match-engine`; INFERRED from `FR` §8): `freeRunnerArrivalSecondsFor` and the looper line become one free-run function; `blitzPickup.freeRunnerPath` becomes the snap-spot table plus the get-off, reach, bend, loop and creep values; `simulatePassPlay` passes the drop and the disguise (never a front look) to the pickups and stunts; ratings are read through `getAttr`. Tests: a faster or quicker-accelerating man is never later; a deeper drop never brings him sooner; the same seed gives the same stream.

**Amendments, not contracts edits:** ADR-030 (the 1.5 s free runner is replaced), ADR-031 (its speed term is built), ADR-066 (its halt's step 3 loosened for free runners only, on the owner's answer to question 19, Table now; under Wait for down linemen only), the engine comments at `tunables.ts:706-716` (speed "a second petition"), `:730-734` (the tick-grid claim) and `:636-647`, and `match-engine.md` §7.3 and §7.4 (the looper's time and "about 1.5 ticks") (`FR` §8).

### 4.5 Contact, and the ball leaving as he is hit (questions 5 and 6, answered By approach and Now)

**What happens today** (revision 1, `R1:278`, kept): On the tick a rusher arrives, the forced throw at `sim/passPlay.ts:1108-1114` fires first if any receiver clears the desperation bar; only then does the automatic sack at `:1178` apply. So **today a quarterback is already hit as he throws** whenever the arrival and the forced throw share a tick: 7.31% of generated-league dropbacks, 30% of its hits-or-sacks.

**Why the throw still comes first** (revision 1, `R1:280`, kept): **The design keeps that order**, because it is the structure revision 1's and pkA's coin arms measured, and because **the contest itself** changes no throw the interception rules see (the motion does change their timing, §8):

**Contact, in order** (`TM` §3.8; contact is a threat ARRIVED, or the escape roll's CAUGHT, with the ball in his hand):

1. **Throw first.** An arrival sets must act, so the throw checks (`sim/passPlay.ts:1070-1114`, CHECKED) run before contact, as today: if a man is open enough the ball goes as he is hit, published as `QB_HIT` phase ARRIVAL (P7). **The contact itself changes no throw the interception rules see; sight does**: a LATE threat costs a read at must act, and a NEVER threat does not force at half a second, so some desperation throws become normal-bar reads; these are priced under the guard of §8. On a CAUGHT escape the tick's throw checks ran before the movement roll, so contact starts at item 2.
2. **Never seen (NEVER): no choice.** The hit runs with the NEVER terms. The owner's literal reading of "no choice", no desperation throw on a NEVER arrival either, is an information arm at step 7 and comes back to the owner only if wanted (`TM` §3.8; `CM` T7).
3. **Otherwise, the contact choice** (default D14): the same ranked pick as his other reactions, one `pocket_movement` CHECK on `.../t<tick>/<rusherId>:contact`, between **FIGHT** (base appeal plus strength and agility terms plus an approach term, which a PUSH or a BLOCKED man raises) and **THROWAWAY** (today's throwaway appeal, 25 + decision making/3 + awareness/4, `tunables.ts:1513-1520`, CHECKED, TM, plus the situation term of §4.9). THROWAWAY is offered only where question 9's rule allows (§4.7), never against a man on the free-run clock (D19's three origins, the LOOPER_FREE man labelled THROUGH included, §4.0), never from BEHIND, and never on a caught escape (he is mid-run; CHOSEN). A throwaway with a hand on him is a hit: `QB_HIT` phase ARRIVAL on a play that ends in a pass attempt, consistent with the scorer's flag (INFERRED, `CM` T7, T18). An earlier rule ("throw it away if the expected margin is below b") had its sign inverted and would almost never fire (`TM` §3.8); M6 reports each branch's rate. **On the stream** (settle): FIGHT is published as `QB_DECISION` choice HOLD, told apart by the `:contact` label and the `QB_HIT` that follows, because `QbDecisionChoice` has no FIGHT (`contracts/src/events.ts:185`, CHECKED in the settle); a throwaway here carries cause POCKET_DURESS with that CHECK as its `rollRef`, as today's throwaways under duress do (`events.ts:156-170`, `:374-378`). If `contracts-guardian` prefers a separate FIGHT choice, that is a new petition, asked by name at step 7.
4. **The hit** (`arrival_contest`, P6), with the reads revision 1 chose (default D11, `R1:296-297`):

- rusher: `d100 + getAttr(ATTR.tackling)/5 + getAttr(ATTR.speed)/5`
- quarterback: `d100 + getAttr(ATTR.strength)/5 + getAttr(ATTR.agility)/5`

   **Tilted by how he came** (CHOSEN, `TM` §3.8; only the strongest single tilt applies): a seen PUSH or BLOCKED man, the quarterback +20 and the rusher's speed not read; a man on the free-run clock +10 (FREE, and the LOOPER_FREE man labelled THROUGH); from BEHIND or NEVER seen, the quarterback's agility dropped and the rusher +10. NEVER outranks the engaged tilt, as in the owner's example of an engaged man he never saw pulling him down.

   The bands (revision 1, `R1:285-288`, kept; the sack is credited to the man actually there):

  | margin | band | what happens |
  |---|---|---|
  | >= b | RUSHER_SACKS | sack, credited to the arriving rusher (fixes `stats/statline.ts:539-544`, which credits a lineman for a free rusher's sack) |
  | < b | QB_SHEDS | he breaks free; `QB_HIT` phase SHED; the threat goes DELAYED by `arrival.contest.shedDelaySeconds` = 0.5 s (CHOSEN) and the move branch runs |

   **After a shed** a PUSH is DELAYED 1.0 s and stays engaged, and a BLOCKED man stays blocked (`TM` §3.8). The move branch then runs.
5. **The boundary b** (revision 1, `R1:290`, kept): **The boundary b starts at 5** (`resultTierLadder`'s SUCCESS boundary, `match-engine.md:565-571`) **and is fitted at step 10** to the league sack share of 44.6% (V2-31). The roll's unit test is the closed form `P(d100 - d100 >= b) = (100 - b)(101 - b)/20000` for the configured `b >= 1` (0.456 at b = 5), not a fixed number.

   **Its reachable range, measured as stand-ins** (REPORTED, `TOT` §8.3): at b 5 contact by approach is essentially the coin (sacks 3.57 against 3.60 on reading (c)); by approach, in the all-pieces arm, FREE contacts end in a sack 525 times in 946 (55%), THROUGH 192 in 469 (41%), PUSH 7 in 41, ARC 9 in 25, and a second contact 143 in 173. With every contact a sack, b's ceiling is +2.0 sacks on (c), +2.2 with every answered piece (reading (c)) at the stand-in hold and +1.0 with the supply cut by 30 at a hold near real; **on the continuous arrival reading (D21) that ceiling is a sack share of 24 to 36, short of 44.6 in every stand-in arm** (37 to 57 on the grid reading). §6.10 records b's reachable range beside its fit and never widens the grid to reach the target.
6. **The second arrival** (revision 1, `R1:291`, kept): **The second arrival in a play, defined (J1-11).** Any arrival after the play's first shed, by any threat, the shed rusher re-arriving after his delay included, is not a rated contest: it is one `arrival_contest` CHECK on its own fork label `.../t<tick>/<rusherId>:contest2`, one d100 against target 15, **16 or more is RUSHER_SACKS (P = 0.85, CHOSEN, pkB's arm value), otherwise QB_SHEDS**, reading no ratings. Its unit test is the closed form 0.85 for the configured target. **The threat list is rebuilt after any shed or delay in the same tick**, fixing the stale list captured once at `sim/passPlay.ts:729`. A won dodge (§4.8) is not a shed for this rule.
7. **Not adopted, and not offered:** the contest running before the forced throw on an arrival tick, so a throw on that tick must also win it. It is an information arm at step 4. Adopting it would change which throws the interception rules see; if step 4 shows it is needed, it comes to the owner as its own question with the numbers.

**Not elusiveness (default D11).** The owner answered By approach, not Elusiveness, so the hit reads strength and agility and revision 1's registry petition (its P9) is dropped. Revision 1's facts stand (`R1:299`, kept):

> **Not elusiveness.** `contracts/src/registry.ts:114` lists `elusiveness` for RB, WR and TE only. The generator still stores one for quarterbacks as a secondary (`attributes/src/fictional/profiles.ts:47`): every generated quarterback has one, mean 48.4 at arrival (COMPUTED). **And the engine already reads it on quarterback scrambles** (K2-08): a scramble runs RUSH mode's second-level tackle contest, whose carrier terms are elusiveness and power (`tunables.ts:2938-2950`; `resolve/ballCarrier.ts:436-442`), because `getAttr` does not enforce applicability (`registry.ts:32-35`). So the literal reading would make an existing, registry-illegal read legal rather than enable a new one. The owner's words at `OWN:93` are "QB strength and elusiveness"; **strength and agility is the registry-legal reading**, and it keeps this design from adding a second unlisted read. Question 5 offers the literal reading, which needs a registry applicability edit (revision 1's P9, now dropped). The existing scramble read is listed in §11.

**On the real arrival population** (COMPUTED, 6,190 first arrivals in base gen; rushers DT 5,694, OLB 203, DE 160, MLB 129; rusher means tackling 49.3, speed 42.9; quarterback means strength 51.7, agility 62.5):

| roll at b = 5 | P(sack) | margin p10 / p50 / p90 |
|---|---|---|
| equal ratings | 0.456 | |
| tackling + speed vs strength + agility | **0.415** | -11 / -5 / 2 |
| tackling + speed vs strength + elusiveness | 0.442 | -7 / -2 / 5 |
| tackling + speed + strength vs strength + agility + mobility | 0.455 | -8 / 0 / 7 |

These are the untilted reads; the approach tilts above move each class of contact (step 4 files their directions).

**Speed now enters three places** (`TM` §3.8): his arrival (the free-run clock, §4.4), the force of the hit (not for an engaged hand), and how far he flies past on a won SIDESTEP (§4.8).

**What counts as a hit (V1-42).** The sim's hit-or-sack is **a sack, or a `QB_HIT` on a play that ends in a pass attempt (throwaways included)**. A `QB_HIT` on a play that ends in a scramble is reported but not counted, because the real flag is never set on a scramble (0 of 3,002). Revision 1's coin arms counted every ARRIVED threat, so their sack share (39.5 to 47.6 on gen; 54.9 to 56.1 on flat) is a **lower bound** on the share under this construct (INFERRED).

**The throwing motion (question 6, Now)** (revision 1, `R1:312`, kept):

**The throwing motion, in the same step (J2-7).** A throw decided at `t` leaves at `t + rho`, `rho = rho0 - (Release - 70)/rho_d`, `rho0` about 0.3 s (CHOSEN). `release` is registered for QB (`registry.ts:80`) and absent from the engine's ATTR table (`attrs.ts:100` has only `releaseWR`). A rusher whose continuous contact time lands inside `rho` produces `QB_HIT` phase THROWING, and the ball still goes. **Its accuracy uses the existing IMMEDIATE row of §10.4's pocket accuracy table (`accuracyPenaltyForPocket`, `resolve/throwExecution.ts:34-36`) with today's poise refund (`:106-110`), unchanged** (K3-21, V2-27): no new penalty, but a new situation in which an existing one applies (§8).

**When a rusher "reaches him" for the motion (default D21, filed at step 0, never chosen by a fit).** A free runner reaches him at his free-run time in tenths (§4.4.6). **A beaten blocker's man reaches him at his breaking time T_j plus his travel**, not at his published arrival on the half-second grid. Revision 1 asked for a continuous contact time ("A rusher whose continuous contact time lands inside rho", `R1:312`; J2-7) without saying where a won rep's continuous time starts (`TOT` §8.5). The two readings differ by 6 to 8 hits in 100, and only the continuous one lets the hit curve rise: with every answered piece (reading (c)), the supply cut by 30 and a hold near real, the grid reading gives aimed hits by release bin of 5.2 / 3.5 / 4.3 / 2.4 / 1.3 / 1.0 / 2.6 per 100, the continuous one 7.4 / 8.7 / 11.4 / 10.1 / 22.7 / 14.2 / 11.5, against a real 2.7 / 7.1 / 10.6 / 11.0 / 13.8 / 16.1 / 18.0; each curve divided by its own mean, the continuous reading's gap to the real shape is about half the grid reading's (0.35 to 0.81 against 0.75 to 1.39 over 11 arms) (REPORTED, `TOT` §8.5). On the grid reading a won-rep arrival can never fall inside a motion shorter than half a second, which starves the blocked rushers (§4.4.6; `TOT` §6). Under shape L the breaking time is the crossing time of §4.1. This is a race between the throw and the hit only: with the ball still in his hand, contact resolves on the half-second grid, as today (§4.4.6). `RUSH_THREAT.etaTick` keeps its documented meaning; the continuous time lives only on `QB_HIT`.

- **On the stream (V2-14).** `THROW` gains an optional `releaseSeconds` (P8), so time to throw and the hit-by-release curve read release from the stream (Iron Rule 3). `QB_HIT` carries `contactSeconds`. `RUSH_THREAT.etaTick` keeps its documented meaning, his arrival time in tenths of a second, as today (`resolve/rushThreat.ts:524`); the continuous time lives only on `QB_HIT`. Under `legacy` none of these fields or events is written.
- **Measured need** (COMPUTED). Hits on thrown balls today are 7.31 (gen) and 3.62 (flat) in 100, near the real 7.1, because today's pocket forces the throw just as rushers arrive. Once the line is slowed they fall to 1.8-2.6 on gen and 0.9 on flat with free rushers late, and to 4.5-5.1 on gen and 2.3-2.6 on flat with them on today's timing or at R = 5. **The motion makes a hit possible on a throw that today leaves before the arrival tick**, and it is what lets the hit curve of §4.1 be read at all.
- **Measured on the stand-ins** (REPORTED, `TOT` §8.5): the motion adds +6.0 hits in 100 on the grid reading and +14.1 on the continuous one under reading (c), and +1.8 and +8.3 with the supply cut by 30 at a hold near real; it adds about 0.30 s to time to throw. Against the falsifier "hits on thrown balls 5.0 to 9.5 in 100" (real 7.1), hit-or-sack minus sacks in that arm is 10.6 on the continuous reading and 4.2 on the grid one; the figure includes throwaways, so it overstates aimed throws (INFERRED).

### 4.6 His count, and the clean-pocket checklist (question 7, in the owner's words)

**The owner's answer, quoted in full** (2026-10-24; the owner's message carried links after each step, left out here):

> "Take this information into account for what QB's do when they have a clean pocket but no one is open: When a quarterback has a clean pocket but no receivers are open, it creates what coaches call a "coverage sack" scenario if it goes wrong. However, an elite quarterback has a strict checklist of options. They will usually transition through these actions in a split second: 1. Hit the "Checkdown": If downfield routes are blanketed, the QB will look for a running back or tight end sitting short in the flat. It may only gain 2 yards, but it avoids a turnover. 2. Manipulate with Pocket Movement: If there is no checkdown, the QB will not just stand still. They will climb up or slide sideways in the clean pocket to manipulate passing lanes. Even subtle movement can shift a trailing defender just enough to open a window. 3. Trigger the "Scramble Drill": If holding the ball inside the pocket becomes too risky, the QB will break out toward the sideline. This signals a structured Scramble Drill. Receivers instantly abandon their original routes and break into open space relative to where the QB is running. 4. Scramble for Yards or Throw It Away: If the scramble drill fails, a mobile QB will take the vacant green grass and run. A pocket passer will roll outside the tackle box and throw the ball safely out of bounds to preserve the next down."

**Kept from revision 1** (`R1:319-321`, `:323`):

- **In scope by the owner's ruling (default D2).** The owner's 23 October ruling puts factor 1, "pocket awareness, internal clock, sack avoidance", into this design; the internal clock is his count, so time to throw is in scope. Round 1 asked it as a question; it is stated here instead.
- **The three read-system budget deltas** (`tunables.ts:2082/2090/2098`) are **fitted on the clean bench to the clean release shape** of §2.2: three parameters against a distribution, not against the league triple (J1-6).
- **A drop floor, keyed on the concept, not the launch point (J1-9).** `dropDepthYards` is the launch point by formation, not the drop: shotgun 5.0, any under-center card 7.0, "because that class covers three-, five- and seven-step drops alike" (`packages/playbook/src/passConcepts.ts:106-114`; `contracts/src/playcalls.ts:186-205`), and step 3's path length reads it. So it is not reused. The earliest non-screen release is derived engine-internally from the depth class of the call's first read: QUICK 1.0 s (a three-step drop), SHORT 1.5 s (five-step), INTERMEDIATE or DEEP 2.0 s (seven-step or its shotgun equivalent) (CHOSEN, a declared dial). No contracts edit and no playbook content change; round 1's plan for the Orchestrator to add 3-yard drops is withdrawn.
- **Forbidden (J1-6, J2-10): lowering the forced-throw bars** (`throwThreshold` 50, `desperationThreshold` 25, `tunables.ts:2248-2249`) as the throwaway fix. pkB measured it: INT per attempt 6.95 -> 8.74 on gen and 2.32 -> 4.10 on flat (REPORTED), a rise of about 1.8 points, beyond the guard of §8 (INFERRED: that arm's release mix was not recorded).

Revision 1's "a clean expiry keeps looking" (`R1:322`) is replaced by the owner's checklist below. Lowering the forced-throw bars stays forbidden.

**The checklist on a clean expiry** (`pocket-1` only; `CP` §4.2). "Clean expiry" means his count or his reads are spent while the pocket is CLEAN and he is still in it.

- **What starts it (default D26):** a spent count **or** a spent read list. Today a spent read list in a clean pocket forces a decision, and revision 1 stopped that without saying what he does instead; with reads spent he can only re-read the checkdown (`sim/passPlay.ts:966`, `:1026-1029`, CHECKED, CP).
- **a. Anyone at the normal bar: throw** (today, `sim/passPlay.ts:1070`).
- **b. Step 1, the checkdown.** Today's look and rule, unchanged (the shortest declared route in his read order, `sim/passPlay.ts:1960-1972`; the owner's 16 October ruling "no engine checkdown change", `target-share-finding.md:75`, `:83-84`, CHECKED, CP; backlog entry 171): if it clears 30 it **joins the pool and competes there**, as today ("It then COMPETES in §8.5's pool rather than pre-empting it", `sim/passPlay.ts:1084-1106`, CHECKED in the settle). **Default D23:** on a clean expiry the throw after that look uses today's pool and decision roll at a bar of 30 instead of the desperation bar of 25 (`sim/passPlay.ts:1108-1114`), with every man below 30 taken out of the pool. If anyone is at 30 or more, the ball goes (to the checkdown or a read man, as the roll ranks them); if nobody is, he goes to the pick. So no ball goes to a man below 30, and the checkdown keeps today's place in the pool. Who the checkdown is ("a running back or tight end sitting short in the flat") stays today's rule; changing it is question 13's design (default D24).
- **c. One ranked pick at urgency 0, between MOVE and ESCAPE only** (`pocket_movement`, label `t<tick>:clean`; today's band die, `resolve/pocketMovement.ts:157-207`): MOVE (a climb if the climb lane is open, else a slide from step 7; once a play) and ESCAPE (break out). **No HOLD and no in-pocket throwaway** (settle): the owner's item 2 says "the QB will not just stand still", and item 4 puts the throwaway after a failed scramble drill, outside the tackle box. **The appeals are today's at urgency 0** (`appealFrom` rounds each term of (rating - 70)/divisor, `resolve/pocketMovement.ts:96-108`; `tunables.ts:1456-1545`; CHECKED in the settle): MOVE is today's step-up appeal, 55 + (awareness - 70)/3 + (patience - 70)/3; ESCAPE is today's escape appeal, 5 + (mobility - 70)/1.5 + (improvisation - 70)/1.5, plus 20 when the climb lane is shut. At the 70 baseline that is 55 against 5 (25 with the lane shut), so a poised quarterback (SOUND, rank 0) moves first, which is the owner's order. ESCAPE ranks first only where high Mobility and Improvisation meet low Awareness and Patience (95 and 95 against 40 and 40: 5 + 17 + 17 = 39 against 55 - 10 - 10 = 35, INFERRED arithmetic). **Default D27:** a rattled quarterback (RUSHED or PANICKED, rank 1 or 2, clamped to the last choice, `tunables.ts:1536-1540`) takes ESCAPE and skips the move, as at every other ranked pick: a mild "seeing ghosts" that happens only after his count is spent. After his one move, the next clean expiry offers ESCAPE alone; if MOVE is not available (the climb lane shut before step 7 builds the slide), ESCAPE is the pick. The full ghosts question stays the owner's to ask for (`TMP:37`).
- **d. Step 2, pocket movement.** One tick; **his reads restart** (back to his first read) and **his count gets the reset**, `qb.resetSeconds` about 1.0 s (CHOSEN, never fitted, default D33). **The window:** each receiver in his read order whose route has reached its break and whose coverage rep stands TRAILING or EVEN (`ContestPosition`, `engine/src/types.ts:175`, set at the break, `sim/passPlay.ts:656-674`) gets one extra burst step of openness, +10 TRAILING and +5 EVEN, nothing for IN_FRONT (`route.opennessGainPerTick` 5 times his position's burst multiple, `tunables.ts:1719`, `:1820-1827`; CHECKED, CP). It reuses the route ladder's magnitudes (no new die, no new number) and **writes openness only, never the rep's position** (default D25), because the passing-lane and catch rules read the position (`sim/passPlay.ts:1476-1490`; `resolve/catchResolution.ts:41`, `:90`) and interceptions are held fixed. That is the owner's "subtle movement can shift a trailing defender just enough to open a window", stated as: a defender already beaten or level loses one more step when he moves. The climb exists today; the slide joins at step 7 (P14). A clean climb counts against step-up's cap of 2 (`tunables.ts:1524`), and there is one slide a play in all (`CM` T10). **Size, upper bounds on the gen clean bench:** the restart reaches up to 15.0% of clean dropbacks (a read-order man already at the bar when he gave up), the bump at most 2.9% (a man within 10 points of it) (COMPUTED by CP, `CP` §3.2, §4.3). **Its risk under question 17:** a slide toward an unseen loose rusher brings him half a second sooner (§4.8).
- **e. Step 3, the scramble drill.** The break-out is today's escape roll with §4.7's side terms. **At every break-out, clean or not, each eligible receiver gets one fresh rep against the defender already on him:** one d100 per receiver, label `t<tick>:drill:<receiverId>`, reading the ratings his route's own rep reads (Route Running + Agility against Man Coverage + Agility in man, `resolve/manCoverage.ts:57-66`; Route Running against Zone Coverage in zone, `resolve/zoneCoverage.ts:65-83`; CHECKED, CP), giving TRAILING, EVEN or IN_FRONT; his scramble openness restarts from today's frozen value plus two burst steps for that position (+20, +10 or 0), then today's +8 a tick, cap 85, and the vision cone (`resolve/scramble.ts:104-131`). It writes openness only (D25). It is published as a `scramble_drill` CHECK (P12) unless `contracts-guardian` prefers emitting it as `man_coverage` or `zone_coverage` with a `:drill` label, in which case P12 is withdrawn (`CP` §4.10). Today no receiver gets a new chance: a man covered at the escape starts covered (`sim/passPlay.ts:1299-1301`), and throws after an escape complete 24.0% with 17.1% intercepted on gen (§1.2). **"Relative to where the QB is running", built here** (settle; default D24). Every route on every card names its break lane, LW, LH, C, RH or RW (`playbook/src/routes.ts:9-11`: "In this package it is required"; read at `resolve/zone.ts:70-72`; CHECKED in the settle), and the break-out's side is known (D15, P11). So at a break-out toward side d, a receiver whose break lane is on that side (LW or LH for LEFT, RH or RW for RIGHT) or in the middle (C) gets the drill's two burst steps (+20, +10 or 0 by his fresh rep), and a receiver on the far side gets one (+10, +5 or 0). That needs no field positions. That break lanes and `RunSide` share one frame (the offence's left and right) is INFERRED and is checked by the mirror guard M5. The comment at `tunables.ts:1838-1851` ("Nothing on a play card says which side of the field a route runs to") is stale for the playbook's cards and is amended (§7.2). **Still question 13's design:** a receiver coming back to him and routes converting when he moves, which are hot-route rules that ADR-022 refuses today (`ADR-022:317-322`). Unpriced (risk R30).
- **f. Step 4, scramble for yards or throw it away.** At the pursuit deadline with nobody at the normal bar, one ranked pick (`pocket_movement`, label `t<tick>:deadline`): RUN (today's escape terms, Mobility/1.5 + Improvisation/1.5, `tunables.ts:1502-1510`) or THROWAWAY (cause `OUT_OF_POCKET`, P9, with P10's outside-the-tackle-box flag; today's throwaway terms, Decision Making/3 + Awareness/4, `:1513-1520`). **D23 extends here:** no desperation throw at the deadline of a clean break-out. The run starts where he is, and a tackle at or behind the line is a sack (question 8, §4.7). At step 8b both appeals gain the situation term (§4.9): late and trailing, a throwaway stops the clock and a run in bounds does not (INFERRED football). **What the pick does with mobility** (settle; INFERRED from the stated appeals, not run). It is one ranked pick between RUN and THROWAWAY, so more Mobility and Improvisation mean more runs and so fewer throwaways at the deadline: the owner's item 4 ("a mobile QB will take the vacant green grass and run. A pocket passer will roll outside the tackle box and throw the ball safely out of bounds"), and the default. RUN's base is filed at step 0 as a CHOSEN margin above the throwaway appeal's base, so a quarterback at the 70 baseline ranks RUN first at the provisional 25 and after step 10 fits that base (today's escape base of 5 would have nearly every quarterback throw it away at the deadline); step 10 re-checks it as a structural row, a baseline quarterback in a neutral situation ranking RUN first at the deadline, and a failure comes back to the owner (recheck). **The data differ:** after a failed drill both kinds mostly run (outside a clean pocket and not sacked, scramble against throw away is 25.4 to 3.3 for pocket passers and 36.3 to 5.2 for mobile ones, about 88 runs in 100 for both), and mobile quarterbacks differ mainly by breaking out more often (clean out-of-pocket 12.94 against 8.58 per 100 clean dropbacks, COMPUTED by CP, `CP` §2.2). The alternative, **Data**, gives THROWAWAY the same Mobility and Improvisation terms as RUN, so mobility no longer decides between them and the split stays near the data's. The throwaway appeal's base is fitted at step 10 either way (§6.10); §14 item 18 states the gap.
- **g. The checklist runs only while the pocket is CLEAN** (settle). Once the status is PRESSURE or worse (question 3's one-second warning, a band floor or the counter), a spent count is must act by count (§4.3) and the checklist does not start. **At any time, a rusher he has seen within half a second sets must act, and an unseen one acts only at contact** (§4.3, §4.5).

**Gone wrong: the coverage sack.** Nothing new is built; it emerges (`CP` §4.6): he holds while the block clock runs and a block breaks during the checklist, a rusher comes within half a second, nobody is open, contact, sack (SIS's "coverage sack"); or he breaks out into a man he has not seen (question 17's catch, §4.7); or the drill fails and he is tackled at or behind the line (question 8, SIS's "failed scramble"). In the pocket the end-of-clock sack stays as today's fallback and should stay near 0 (reported). Report rows only, never graded (§2.4): sacks after a clean expiry as a share of all sacks against SIS's 13% coverage sacks plus part of its 10% failed scrambles, and the mean time to sack against PFF's 3.8 s.

**What is in this fix and what is question 13's own design (default D24; the owner may overrule each line)** (`CP` §4.7):

| piece | where | why |
|---|---|---|
| the checklist order on a clean expiry, and D23 | this fix | the quarterback's own clock and decisions, factor 1 of the 23 October ruling; they fix this fix's own failing rows (clean throwaways 11.1 / 20.6 in 100 against 1.25; clean scrambles 0 against 3.92) |
| the restart of his reads, the climb and the slide, the window bump | this fix | revision 1 already planned the reset and the move, and the slide; the bump moves openness but adds no receiver, route or target |
| the break-out from a clean pocket, the drill's fresh rep, run or throw it away at the deadline | this fix | §4.7 rebuilds the escape and the out-of-pocket throwaway; the fresh rep reuses the existing coverage contest and writes openness only |
| who the checkdown is, more than one outlet, the back as checkdown everywhere | question 13's design | changes the 16 October ruling and the target mix (back's share band at most 20.6%) |
| hot throws and sight adjustments after the snap (revision 1's P8a, P8b and an ADR-022 amendment) | question 13's design | the owner's answer to question 13 |
| receivers breaking toward the side he runs to, by each route's break lane | this fix, step 6 (settle) | the cards name every route's lane (`playbook/src/routes.ts:9-11`) and the break-out names his side, so no field positions are needed |
| a receiver coming back to him, routes converting when he moves | question 13's design | they are hot-route rules, which ADR-022 refuses today (`ADR-022:317-322`) |
| rewriting a receiver's rep position (who is trailing) when he moves or breaks out | the interception design (D25) | the passing-lane and catch rules read it, so it is an interception input |

**Staging.** Step 5a: the trigger, the checkdown with D23, and the clean pick (the climb with the restart, the reset and the bump; the break-out at urgency 0). **No throwaway-legality rule is needed at 5a, because no clean throwaway exists there** (settle): the clean pick has none, and until step 6 a clean break-out must end in a run, because no out-of-pocket throwaway exists yet. So 5a's clean throwaways are 0 by construction, and its clean scrambles may run up to about 0.5 in 100 high (real clean throwaways outside the pocket are 142 of 28,619; `CP` §4.9); the 2 to 6% band absorbs that. Step 6: the drill's fresh rep with its side, the deadline pick under question 9's rule, and `OUT_OF_POCKET`. Step 7: the slide. Step 8b: the situation term, the deadline pick among its four places.

**Fitting.** The three read-system deltas are fitted on the clean bench with the checklist running. The reset moves clean release time too, so it is held at 1.0 s and reported alone rather than fitted with them (default D33; `CM` T8(g)).

### 4.7 His outs (questions 8, 9 and 17, answered Sack, Real rule and Yes)

**Kept from revision 1** (`R1:327-331`, petitions renumbered):

- **The real throwaway rule (question 9)** replaces the flat 2.0 s gate (`tunables.ts:2254`; `sim/passPlay.ts:1116`), whose comment at `resolve/pocketMovement.ts:67` cites a spec rule that does not exist. **In the pocket:** legal once an eligible receiver's route has reached its break, a stand-in for the NFL's receiver-in-the-area test (where the ball lands is not checked). QUICK routes are ready at 1.0 s (`tunables.ts:1701`), so the rule allows some throwaways **earlier** than today's gate and refuses others later. **Out of the pocket:** the ball must reach the line; cause `OUT_OF_POCKET` (P9), with a flag for whether he was outside the tackle box when he threw it (P10). Otherwise there is no throwaway. No grounding penalty in this fix.
- **A failed scramble is a sack (question 8), and all three sack readers change together (V1-11, K4).** Calibration does not read the statline: `metrics/collect.ts:766-776` counts a sack directly from events ("No throw, no scramble, no throwaway: a sack"); the statline reducer counts its own (`stats/statline.ts:495-498`); and the game viewer's play log is a third reader, which promises "the log and the box score never disagree" (`apps/game/src/playLog.ts:7-9`) yet renders any `RUN_RESOLUTION` as "scrambles" (`:147-148`) before it looks at yards (`:149`). So all three change **in the same step** (the play log by `ui-layout`), the rule is written once in `match-engine.md` §8.8, and a calibration test runs the statline reducer (ADR-012 item 5) and `foldGame` over the same corpus and asserts they classify the same plays as sacks, with a `ui-layout` test asserting the play log agrees on the same corpus. Putting the classification on the stream instead, so no renderer re-derives it, would be a contracts edit; `contracts-guardian` may prefer it at step 6, and it would then be its own petition. The facts (a scramble, its yards) are already on the stream (INFERRED; `contracts-guardian` confirms at step 6). **Priced as its own arm (J1-7, V1-39):** on today's game it is +11.2 flat (16.43 -> 27.61) and +4.5 gen (16.72 -> 21.25); on pkB's rebuilt composition +3.2 flat (6.34 -> 9.51) and +1.2 gen (6.12 -> 7.33) (REPORTED, pkB, zero-yard scrambles rescored).
- **Under the Sack answer, scrambles start where he is, behind the line.** Today they cannot lose yards: `sim/passPlay.ts:1125-1135` passes no start yards, `resolve/ballCarrier.ts:442` starts at 0, and the break-tackle bands RUSH mode uses (`tunables.ts:2953-2955`) all have `minYards >= 0`. In a 20-game trace 0 of 82 scramble runs lost yards and 48 gained exactly 0 (TECH §2). Those zero-yard runs are exactly the plays the NFL scores as sacks (real: 1 of 2,097 scrambles lost yards in 2023-24; 2 of 3,002 in 2022-24). **Under the Run answer both stay as today: the scramble starts at the line and is scored as a run** (K3-18).
- **Escape capped at one per play** (`escape.maxPerPlay` 1), a per-play cap beside step-up's own of 2 (`tunables.ts:1524`). The pursuer's speed enters the escape roll (`resolve/scramble.ts:57-92`; today's target is 50 + 10 per edge threat + 5 per urgency step, with no rusher rating, `tunables.ts:1545`, `:1552-1553`, read at `resolve/scramble.ts:71`, K2-12, R1-11), and mobility's weight comes down so that a mobility 40 -> 90 probe moves P2S by at most about 2 points (F2.3). That is not an exception to "better attribute, better outcome": more mobility still helps, by less.
- **No late-escape horizon sack** (`sim/passPlay.ts:1357-1368`): a late escape ends as a scramble run.

**Revision 2 adds:**

- **The real throwaway rule also decides a throwaway with a hand on him** (the contact choice, §4.5) **and after a clean break-out** (§4.6 f) (`QCH` card 9; `TMP:109`). There is no throwaway on a caught escape, and none in a clean pocket (§4.6 c).
- **Causes** (settle; `contracts/src/events.ts:156-170`, `:374-378`, CHECKED in the settle). A throwaway at the alarm, at must act with a registered threat, or at contact carries POCKET_DURESS with that `pocket_movement` CHECK as `rollRef`, as today. One at the deadline carries OUT_OF_POCKET (P9) with the deadline pick's CHECK as `rollRef`, which P9's yes also writes into `THROWAWAY.rollRef`'s documentation. CLOCK_EXPIRED keeps its meaning and its missing roll (pinned by `engine/test/throwaway.test.ts:53` and `engine/test/statline.test.ts:187`): a spent count in a pressured pocket with no registered threat near. So step 5b's "CLOCK_EXPIRED at most 1.5% of dropbacks" (counted at `knownTruth/pocketLadder.ts:862`) never counts a checklist play.
- **Which way he moves (default D15).** ESCAPE and SLIDE_POCKET go away from the side of the threat that set off the reaction. Ties go away from the nearest registered threat, then toward the side with fewer card rushers, then by the movement roll's raw d100 parity, which needs no new die and is mirror-balanced (CHOSEN, `TM` §3.7). Published as `QB_DECISION.direction` (P11, `RunSide`, `contracts/src/playcalls.ts:233`, CHECKED).
- **Unseen men on the side he moves to (question 17)** (`TM` §3.7). Today the escape roll reads only his Mobility and Improvisation, with every live threat on both sides as actors (`resolve/scramble.ts:63-69`, `:83`, CHECKED, TM). Under `pocket-1`:

  ```
  target = 50 + 10 * (registered live threats on side d) + 15 * (unregistered men on side d) + 5 * urgency + revision 1's pursuer-speed term     (10 and 15 CHOSEN)
  actors = QB + every live threat + the blocked card rushers on side d
  ```

  The blocked men must be actors, because the caught credit may name only actors of the roll (`sim/passPlay.ts:1235-1259`, CHECKED, TM). "Unregistered" means a NEVER threat, a LATE threat not yet within half a second (§4.3, recheck), or a blocked man he had not checked (SOUND checked all, RUSHED only men in front, PANICKED none; §4.8).
- **A caught escape becomes contact with the man who caught him** (§4.5): first an unregistered man on that side, by nearest arrival then card order; otherwise the nearest registered threat there; otherwise today's rule (`sim/passPlay.ts:1255-1259` with `tunables.ts:1212`). A blocked man catches him as an engaged hand, unseen if unregistered. A caught escape is a sack today whatever question 8 says (`sim/passPlay.ts:1229-1271`); as contact it can become a shed, which removes some sacks, priced alone at step 6. **Credit goes to the man actually there**, not the last lineman to arrive (`stats/statline.ts:539-544`), and the three sack readers' agreement test also compares who is credited (`CM` T9). Clean escapes stay as today: every threat resets and pursuit runs on its own clock (`sim/passPlay.ts:1274-1305`).
- **A slide reaches no blocked man;** toward a side holding an unregistered loose rusher, that rusher comes half a second sooner (§4.8). The two-moments page asked whether a step or two should let a still-blocked man reach him on a slide (`TMP:64`); the owner's Yes card says only that an unseen loose man comes sooner (`NEWQ` card 4), so this design does not add more (`CM` T16).
- **Size, as stand-ins** (REPORTED): a live threat sat on the away side on 57.4% of today's escapes (`TM` C1); question 17's side terms added +0.32 hits and +0.24 sacks in 100 on reading (c), the caught share of escapes rising from 19.8 to 25.1 (28 with the alarm driving more escapes) (`TOT` §8.2). The scoring of question 8 was not run; its upper bound is the scrambles of zero yards or fewer, 0.7 to 1.4 in 100 at a hold near real, against real failed-scramble sacks of about 0.66 in 100 (`TOT` §8.9; §2.4).
- **Side is the card's assignment only,** mirror-symmetric (ADR-066:620, "a card SHOULD say which gap a rusher is assigned", as cited at `TM` §3.10), with the looper rule D16; step 0's mirror guard M5 swaps LEFT and RIGHT on every card and checks that escape direction and catches mirror within noise.

### 4.8 The alarm, his sight, and the slide (questions 10, 11 and 15, answered Yes, Yes and All)

*Revision 1's §4.8 (`R1:333-340`) is kept where it still holds and is quoted below, with its petitions renumbered (its P6a is now P13 and its P6b now P14, §7). Sight in three grades, the alarm and its list, make-him-miss and the wider slide are new.*

**Sight: who he has registered** (petition P13, `pocket_sense`; `TM` §3.4). "Registered" means he has seen this rusher coming. One roll per threat, when the threat is created:

```
margin = d100 + awareness/5 + 10 if he has the Pocket Awareness trait (its specified +10, match-engine.md:2763; stored at tunables.ts:183-186, read by nothing today)
       + from term (FRONT +20, SIDE 0, BEHIND -30) - target                                    (terms CHOSEN)
```

The target is set at step 7 so that EARLY is about 0.85 to 0.95 of FRONT and SIDE threats, revision 1's felt rate (CHOSEN); step 0's M7 sizes the margin engine-free over the league's quarterbacks and reports the NEVER share.

| margin | sight | what it does |
|---|---|---|
| 0 or more | EARLY | the alarm fires, at the moment §4.0 states |
| -30 to below 0 | LATE | no alarm; registered from the first tick he is within 0.5 s, so he sets must act there (§4.3, recheck); at must act his read capacity is one lower, the same mechanism as the pocket's own read penalty (`tunables.ts:1382-1387`, as cited at `TM` §3.4); the throw bars are never touched |
| below -30 | NEVER | no reaction before contact; a NEVER rusher does not make him act at half a second, only his arrival does (§4.3); no choice at contact (§4.5); `QB_HIT.seen` false |

- **A bull rush (PUSH) is always EARLY, with no roll** ("A bull rush is always seen", `TMP:46`).
- **A man still in his block (BLOCKED) gets no roll.** Whether he checked such men comes from the band of the movement roll that moved him: SOUND checked them all, RUSHED only the men in front, PANICKED none (`TM` §3.4). This is what question 17's catch reads (§4.7).
- **A threat that comes round behind him** (after a step-up under an ARC or a won dodge) re-rolls with the BEHIND term, on `:return`.
- **Memory:** once registered (EARLY, or LATE from half a second), a threat stays registered (revision 1's "a threat once felt stays felt").
- **The label is keyed by rusher**, `.../t<tick>/<rusherId>:sense`. Revision 1 keyed it by the quarterback and the tick (`R1:581`); `fork` is a pure function of its label (`contracts/src/rng.ts:52`), so two threats created on the same tick would have drawn the same die, and 40.7% of won-rep creation ticks create two or more threats (COMPUTED by TM, `TM` C2).
- **No pre-snap term:** only physical post-snap facts are read (revision 1's X3), with the permutation guard at step 7.
- **Until step 7 every threat counts as registered** (§4.3).
- **The blind side** comes from sight and the side he moves to (§4.7), not from a throwing hand (default D12): no field records a throwing hand (a grep of `packages/contracts` and `packages/engine` for one finds none, recheck), and the engine's own comment declines to key travel on side because that "would assert a handedness no football supports" (`tunables.ts:711-714`); it has no facing either (`:2659-2660`) (CHECKED, TM).
- **Not `unseen_defender`:** that kind is reserved for the spec's §8.6 passing check (`calibration/src/metrics/absence.ts:200-210`, as cited at `TM` §3.4), and the interception design keeps it.

**Kept from revision 1** (`R1:336-337`):

> **The trait is not counted twice (J1-8).** `resolve/qbRead.ts:188-189` gives the trait +0.5 s of budget today, and `tunables.ts:2261-2265` calls that the *interpretation* of "+10 to sensing". Under `pocket-1` **that budget term is retired and the trait becomes the sensing bonus it was specified as**; under `legacy` it stays.
>
> **Why a high base rate.** pkB measured a memoryless per-tick feel at about 0.5: hit-or-sack doubled, gen 19.8 -> 36.5 (REPORTED). The built rate is about 0.85 to 0.95 per threat with a small slope (CHOSEN).

Revision 2 reads "felt" as "seen EARLY": the 0.85 to 0.95 is now the target that sets EARLY's share, not a per-threat probability.

**The alarm's list, and the same list at must act** (question 15, All; `TM` §3.5; `TMP:49-58`). Every reaction is today's ranked pick (`rankResponses` and `resolvePocketMovement`, `resolve/pocketMovement.ts:96-207`, CHECKED, TM): each response has an appeal, the responses are ranked, one d100 with poise and awareness terms is rolled against 50, and a SOUND result takes the first choice, RUSHED the second and PANICKED the third, clamped to the last one available. One `pocket_movement` CHECK per call:

- **at the alarm** (new): `.../t<tick>/<rusherId>:alarm`, once per registered threat, its appeals set by that threat's approach;
- **at must act:** today's `:movement`, its appeals set by the registered threat that set must act, nearest first, ties to EDGE as today (`tunables.ts:1212`); the throw checks still come first (`sim/passPlay.ts:1070-1114`, CHECKED);
- **at contact:** `:contact` (§4.5).

Today's rating terms (`appealFrom`, `resolve/pocketMovement.ts:96-108`) and per-urgency terms still apply, so one table leans differently at the alarm (urgency 0) and at must act (urgency 2) (`TM` §3.5).

| how he is coming | what he leans to (CHOSEN base appeals, best first) | the mistake a rattled man may make | the owner's page |
|---|---|---|---|
| bull rush (PUSH) | HOLD, then SLIDE_POCKET away, then ESCAPE | running this early | "keep reading, or drift a few steps away" (`TMP:53`) |
| round the corner (ARC) | STEP_UP if the climb lane is open, then HOLD, then ESCAPE; SIDESTEP when the lane is shut | bailing outward | "step up; running outward is the mistake" (`TMP:54`) |
| straight through (THROUGH) | SLIDE_POCKET, then ESCAPE away or SIDESTEP, then HOLD | standing in | "slide a step, run away from him, or make him miss" (`TMP:55`) |
| free runner (FREE) | SIDESTEP, then ESCAPE, then HOLD | standing still | "make him miss, or throw now" (`TMP:56`); HOLD keeps reading at the normal bar, which is the throw-now case (`TOT` §8.6) |

**The reactions** (`TM` §3.5):

- **HOLD.** Always there. Reading goes on at his normal bar of 50, so "throw now if a man is open" is a read, not a menu item.
- **SLIDE_POCKET** (P14), a step sideways, **his own call** (question 10, Yes). Off a bull rush, to either side: the push is DELAYED 1.0 s, or its breaking time T_j moves 1.0 s later if the slide comes before the beat. Off a man straight through: DELAYED 0.5 s, as in revision 1. On a clean expiry with no threat at all: question 7's pocket movement (§4.6 d). **Once a play in all**, whatever the use (`CM` T10). Never toward a registered live threat on that side. **Toward a side holding an unregistered loose rusher, that rusher arrives one tick (0.5 s) sooner** (question 17). A slide reaches no blocked man (§4.7). Its direction is published (P11).
- **STEP_UP.** Open when there is no registered FRONT threat (today: no INTERIOR threat, `resolve/pocketMovement.ts:115-122`, CHECKED). At most 2 a play (`tunables.ts:1524`), sized by the drop (below). An ARC he climbs under is DELAYED as today (1.0 s with its pressure reset, `tunables.ts:1522-1529`; `sim/passPlay.ts:1199-1219`) and comes back from BEHIND; stepping up into an unregistered THROUGH brings that rusher to the next tick. It is the owner's "use their momentum to send them past" against a corner rusher (as quoted at `TM` §3.5).
- **SIDESTEP, "make him miss"** (P15; question 15, All). Against a registered EARLY FREE, ARC or THROUGH rusher within 1.0 s, once a play; the owner's page says "against a rusher not in a block that he saw early, within a second of him" (`TMP:58`). One `arrival_contest` CHECK (P6) on `:dodge`: the quarterback's d100 + agility/5 + awareness/5 against the rusher's d100 + agility/5, boundary 5 (CHOSEN). **Won:** the rusher flies past, DELAYED 0.5 + max(0, (speed - 50)/50) s rounded up to the half-second grid (CHOSEN), and comes back from BEHIND with his sight re-rolled. **Lost:** contact on this tick. A won dodge is not a shed for the second-arrival rule (§4.5).
- **ESCAPE.** Once a play (§4.7), away from the threat that set off the reaction (default D15). Its appeal rises with Mobility and Improvisation as today: Mobility/1.5 + Improvisation/1.5, and +20 with no climb lane (`tunables.ts:1502-1510`, CHECKED, CP).
- **THROWAWAY.** Only where question 9's rule allows it (§4.7).
- **A throw to a covered man** stays at must act, at the desperation bar of 25 (`tunables.ts:2248-2249`), because interceptions are held fixed (`TMP:60`).

**Kept from revision 1** (`R1:338-339`; revision 1's P6b is now P14):

> **`SLIDE_POCKET`, not `SLIDE`** (revision 1's P6b, now P14; J1-8, J2-3): `contracts/src/playcalls.ts:122` already uses `kind: "SLIDE"` for slide protection. A step sideways off an interior threat he has felt (so its trigger reads awareness and the trait through `pocket_sense`, and nothing else, K3-19), once per play, delaying that threat 0.5 s and keeping him in the pocket, so ADR-055 is not triggered. **His own call (question 10, merging round 1's questions 12 and 18):** like stepping up, running and throwing it away, it is a reaction inside the play and the leash does not reach it; the Leash answer would add a rung to ADR-072's ladder and a Discipline roll each time he feels pressure. **Measured need, named by its bench (V1-21, V2-12):** against a quarterback who never finds a receiver (throwaways allowed; flat 60, N 1,500 each), a free interior rusher sacks 44 to 51% and an edge one 2.4 to 8.5% (TECH:113). League-wide the unblocked split is only 7.7% interior against 6.8% edge (TECH:112), because the ball is usually out; the gap grows as the pocket lasts.
>
> **Step-up sized by the drop**, not a constant 1.0 s (`tunables.ts:1522-1529`), never pushing a threat past `clock.maxTick`, and the walk at `sim/passPlay.ts:1199-1219` no longer pushes a threat created in the same tick.

Revision 1's slide "off an interior threat he has felt ... delaying that threat 0.5 s" is the THROUGH use above. Revision 2 adds the bull-rush use (question 16) and the clean-expiry use (question 7), and keeps one slide a play in all. The Leash answer was not chosen, so ADR-072's ladder gains no rung.

**Patience, and every other rating (question 11, Yes).** Revision 1's text (`R1:340`), kept:

> **Rating signs (F1.4, question 11).** Poise is accuracy under pressure and no longer raises the stand-in appeal. **Patience holds longer: more pressure, P2S flat**, which raises sacks per dropback, the named exception of question 11. Awareness and the trait sense earlier.

Yes writes a **named exception** to `docs/design/calibration.md` §5.2 item 2 ("better attribute -> better outcome, always"), scoped to the pocket and to patience; revision 1's note on question 11 is kept in §15.1. Revision 2 adds (`CM` T11):

- **every other new rating read carries a monotone probe, and a failure is a failure, not a second exception:** agility (the dodge and the hit), strength (the hit), awareness (sight and the alarm's roll), poise (every ranked pick), Mobility and Improvisation (the escape and the run at the deadline);
- question 7's reset and question 12's situation term **never read patience**. The clean pick's MOVE reuses today's step-up appeal, which already reads awareness/3 and pocketPatience/3 (`tunables.ts:1482-1489`, CHECKED), so the patience probe covers that existing read;
- the patience probe runs at fixed situations, because "more time when the sticks are far" also adds pressure.

**What the stand-ins say about the alarm** (REPORTED, `TOT` §8.6; the free-runner half only, sight a flat 0.9, the coin contact, revision 1's pricing setting; Appendix D):

- On reading (c): hits on the official count -0.9 (grid reading -3.0, continuous -2.8); **sacks +1.31** (3.60 to 4.91); the 2.0 s tick bin 58.5 to 49.1; scrambles 2.78 to 4.39 in 100; 3.39 contacts in 100 dropbacks come from lost dodges.
- In 7,363 alarms (27 in 100 dropbacks): not seen 10.1%; SOUND 68.9%, RUSHED 17.5%, PANICKED 3.6%; make him miss 2,648 times, won 65.2%; escape 1,511; slide (loopers) 2,110; hold 353.
- **It is the one answered piece that moves the sack share toward 44.6 without b** (grid reading 23.5 to 40.0). The half for beaten blockers' men (drifting off a bull rush, stepping up under a corner rush, sliding from a man straight through) was not run: its sign is mixed, because stepping up and sliding delay men while a lost dodge brings contact sooner.

**Information arms at step 7** (each comes back to the owner only if wanted): the pocket's read penalty counting only registered threats, with the status itself kept physical (`CM` T3(b)); and the owner's literal "no choice" on a NEVER arrival, with no desperation throw either (`CM` T7).

**Interceptions.** LATE takes a read away at must act, and NEVER turns some desperation throws into normal-bar reads (`TM` §3.8). Both are priced at step 7 under the guard read by throw class (default D28, §8), with an agility probe on SIDESTEP (`CM` T15).

### 4.9 The situation (question 12, answered All)

**The answer is All**, not revision 1's recommendation (Down): he weighs down, distance, score and clock. Revision 1's "Score and clock are not read, so the per-period two-minute defect is not a dependency" (`R1:344`) is withdrawn with its reason; the owner's card had named the defect ("after a known bug is fixed (the two-minute flag fires every quarter)", `OWNF:193`).

**The situation term** (default D35; `CM` T12(e)):

- it reads down, yards to go, score margin and time left in the half;
- it is used at **four places, with one set of weights**: his count (the time budget), the hang-in-or-throw-it-away appeal at must act, the contact choice (§4.5), and the run-or-throw-it-away pick at the pursuit deadline (§4.6 f); a clean pocket has no throwaway of its own (§4.6 c), so the end-of-half clean-throwaway rows below are reached through the deadline pick after a clean break-out (settle);
- it is **centred on the league's own mix of situations**, so the read-system deltas fitted at step 5a stay valid;
- it never reads patience (§4.8);
- its weights are fitted at step 10 (§6.10) to pressured throwaways by down at 7 to 10 to go (revision 1's rows) and to the end-of-half rows of §2.4 (clean throwaways about 2.5 times the rest; pressured throwaways 1.6 to 2.9 points higher); P2S by down, P2S by situation and time to throw by situation are its falsifiers;
- the football behind its direction (INFERRED): late in a half and trailing, a throwaway stops the clock and a run in bounds does not; on third and long he gives himself more time (`TMP:85`).

**Two fixes come first, at step 8a, before step 8b reads score and clock** (default D29; `CM` T12):

1. **The two-minute flag fires only in the last two minutes of a half**, that is in the second and fourth quarters and in an overtime period (which has its own two-minute stop in the NFL, INFERRED), instead of every quarter. Today it is `twoMinute: s.clockSeconds <= G.twoMinuteSeconds` on the period clock (`game/simulateGame.ts:193`), reset every period (`:299`), and documented as "of the end of the period" (`game/types.ts:147`); the huddle burn makes the same per-period test itself (`:724`), under a comment that says "every half" (`:722`) (all CHECKED). The fix covers both. Real play agrees that only the end of each half is different: the last two minutes of the first and third quarters look like the rest of the game (§2.4).
2. **Goal-to-go distance:** after a first down or a turnover the distance becomes the yards to the goal line when that is under 10, instead of 10 with no goal line, **at every site that sets a first and 10, through one goal-to-go helper**: the play outcome (`sim/outcome.ts:60`, `:70`, CHECKED), which the game loop takes at `game/simulateGame.ts:649` (CHECKED), and the game loop's own `startDrive` (`:243`, which an interception reaches at `:655`) and `changePossession` (`:292`) (CHECKED in the settle; code-data F10). Step 8a's proof includes a turnover returned inside the 10. This is an Orchestrator default, so that distance means the same thing on every snap once All reads it. The owner may overrule it; then revision 1's rule stays, and on goal-to-go snaps the term reads the down only (`R1:344`).

Each fix sits behind its own switch inside `pocket-1`. Under `legacy` both bugs stay, so every older play-caller replays by name exactly and a legacy save keeps the per-quarter flag to its end (default D10, §9). Callers keep their logic and simply receive the corrected situation under `pocket-1` (`CM` T12(a)). The fixes move play (fewer stretches at the default caller's 0.85 pass rate, `game/playCaller.ts:48`, CHECKED; different huddle time), so step 8a prices them alone, with by-name OFF proofs, before 8b.

**The play state gains the score and the period.** `MatchGameState` (`engine/src/types.ts:301-325`, CHECKED) carries down, distance, field position and the period clock, but no score or period. It gains optional `period`, `offenseScore` and `defenseScore`, filled from the game loop's own decision situation, which already carries all three (`game/simulateGame.ts:183-193`, CHECKED). They are absent under `legacy`. It is an engine type, so no contracts edit is expected (INFERRED; calibration's benches construct this type under ADR-012, so `contracts-guardian` and the Orchestrator confirm at step 8a, `CM` T12(d)).

**Goal-to-go snaps stay out of the by-down rows on both sides** (revision 1's 7-to-10-to-go rows, §2.3) whatever happens to D29, so the fitting rows do not move with the fix.

### 4.10 Scheme (factor 3)

*Kept from revision 1 (`R1:348`), with its last sentence changed by question 13.*

The block clock's scale carries a double team (a free blocker halves that lane's hazard), a chip until it releases, max protect (more blockers, fewer free rushers), the existing slide-protection direction, and the drop. A blitz adds rushers, so more pressure and flat conversion (real: at least one blitzer, pressure 39.1 against 26.7, P2S 21.3 against 22.4). Deep routes cost time because he must hold through the block clock, and today's deep-route P2S ladder (11.7 / 17.7 / 30.1 / 52.0) becomes a falsifier that should fall out rather than be tuned. Today's **pre-snap** hot routes are unchanged and re-measured at step 10 (F3.5). **Post-snap hot throws and extra outlets are their own design, after the interception design (question 13, Own design; §6.12).** So are who the checkdown is, a receiver coming back to him and routes converting when he moves (default D24, §4.6); receivers breaking toward the side he runs to, by each route's lane, are built at step 6 (§4.6 e).

Revision 2 notes: the drop in that list is the blocked rushers' term; free runners read the drop through their own clock (§4.4.5). A blitzer from depth now arrives by his snap spot and his ratings (§4.4), so the blitz rows test that clock as well.

---

## 5. The owner's four factors: where each goes, and why there

*Kept from revision 1 (`R1:352-361`), with each row widened by the answers (`CM` §2).*

Ruling of 2026-10-23: all four go in; a factor may be scheduled into a later step, but each needs a place and a reason.

| factor | where | why there |
|---|---|---|
| **1. Pocket awareness, internal clock, sack avoidance** | Internal clock: **step 5a** (his count, fitted on the clean bench, and the owner's clean-pocket checklist; in scope by the 23 October ruling, default D2), widened at **steps 6 and 7** (the drill, the deadline pick, the slide). Sack avoidance: **step 4** (contact by approach: strength and agility against tackling and speed, tilted by how the rusher came), **step 6** (his outs, the side-aware escape) and **step 7** (make him miss, the slide, the contact choice). Awareness and the trait: **step 7** (sight in three grades, the alarm, step-up sizing, rating signs). The quarterback spread: **step 10** (default D4). | The real internal-clock signal shows in pressure rate, not conversion: across 61 QB-seasons, time to throw correlates with pressure rate at r 0.60 and with P2S at -0.10 (TECH:34). There is nothing to sense in a 0.9 s pocket, so feel comes after the line's clock. The clock cannot come first either: today's line with an NFL-length hold gives sacks 34.8% flat and 46.2% gen (REPORTED, pkA). The alarm and contact are the owner's two moments (§4.0), so they land where the line and the count can already give them time. |
| **2. Mobility against rusher speed** | **Step 3** (men nobody touched on their own clock: snap spot, Speed and Acceleration, the drop; the ADR-031 speed term; the stunt hand-off). **Step 4** (speed in the force of the hit). **Step 6** (pursuer speed in the escape roll; mobility weighted down; scrambles that can end behind the line; the escape cap; unseen men on the side he runs to). **Step 7** (make him miss: his agility against the rusher's, and a faster man flies further past). | The owner's item 2 at `OWN:93`. Speed now enters three places (§4.5). The snap spot comes from a small table ahead of the pre-snap phase only if the owner answers question 19 Table now (risk R7); under Wait only down linemen get one. Mobility's weight comes **down**, because real mobility barely moves conversion (F2.3); mobile quarterbacks scramble about twice as often from a clean pocket and throw it away no more often (§2.4). |
| **3. Scheme: hot routes, deep routes, time to pressure** | Time to pressure: **steps 1 to 3** (the block clock, the push window, the free-run clock). Deep routes: **step 5a** (the drop floor follows the first read) and **step 9**. Protection, chip, max protect, blitz: **step 9**. Pre-snap hot routes: unchanged, **re-measured at step 10**. Post-snap hot throws, extra outlets, who the checkdown is, a receiver coming back to him and routes converting: **their own design after the interception design** (question 13, Own design; default D24). Receivers breaking toward his side, by each route's lane on the card: **step 6** (D24). | Time to pressure *is* the line's clock. The deep-route cost should fall out of a pocket that lasts, so it is a falsifier. A post-snap hot throw needs ADR-022's refusal lifted, and ADR-072:50 pencils a sight adjustment in at leash rung 50 as provisional; extra outlets change the checkdown rule the owner kept on 16 October. The owner gave them their own design. |
| **4. Down and distance, score and clock** | **Step 8b**, after **step 8a**'s two fixes (question 12, All; default D29), with every situation row measured at fixed play calls from step 0 on. | A hang-in-or-throw-away choice exists only once the pocket lasts long enough. Fixed calls keep the callers' tendencies apart from the quarterback's judgement (F4.4). The two-minute flag must mean the end of a half before anything reads the clock. Goal-to-go snaps stay out of the by-down rows (§4.9). |

---

## 6. The stepped build

**The owner's answer to question 14 is Yes:** twelve numbered steps, 0 to 11, now with step 5 and step 8 each in two halves and no step 9b (`CM` T14). Every step lands behind a switch that is OFF, carries the by-name replay proofs below, and comes to the owner with its numbers; the Orchestrator merges only after the owner's word. Default play moves in one commit, step 11.

**The proof every step carries** (revision 1's list, `R1:369-376`, kept):

- **By name, byte-identical.** With the switch OFF, the event stream is byte-identical to main for **each caller v1 to v7 by name** (`caller/anticipate.ts:217`), at N = 50 games per caller per league, compared by `stableDigest` of `{at, event}` as in `callerV7Stream.test.ts`. Golden digests are recorded at step 0. This holds for steps 0 to 10; step 11 carries its own replay proofs (below).
- **Determinism ON.** Two separate processes give the same digest (revision 1's test runs' practice: shape S theta = 13 gave `bf8996cc7ab6` twice, COMPUTED; K2 repeated the two-process check).
- **Unit tests for every logic block** (Iron Rule 8), in the owning package.
- **Three arms wherever mechanisms are conjoined:** each alone, then jointly.
- **Predictions filed before the arm runs** (entry 125). An arm listed without a band below is marked "reported, direction only".
- **EXT-4 reporting:** `pressuredSacks` and the pressured count separately; exclusive affected-play counts per arm; every row in every arm; the interception guard on both leagues; the quick-pressure share and its origin mix; the count of ticks with a live WON_REP threat and a CLEAN pocket, with the dropbacks they fall on.
- **Pricing arms at steps 1 to 4.** Besides the design build at today's quarterback clock, each of steps 1 to 4 runs the same build with the Appendix B stand-in hold (budget +2.0 s, every route +1.0 s), labelled a pricing arm and never a design value, so that each prediction below has a measured basis to be falsified against.
- **Names.** Mid-build arms run as `pocket-1.s<step>`, with the overlay's tunables digest recorded beside the name; `pocket-1` itself is frozen at step 11 (K3-07).

**Revision 2 adds to the list** (`CM` §2, §6):

- **Roll accounting for every new label.** ADR-004's roll audit (`engine/test/rollAccounting.test.ts`) and the event-vocabulary test cover every die drawn under `pocket-1`: `beat/<rollRef>`, `:contest`, `:contest2`, `:sense` (keyed by rusher), `:return`, `:alarm`, `:contact`, `:dodge`, `:late` (a touched man's late block under shape L), `t<tick>:clean`, `t<tick>:deadline` and `t<tick>:drill:<receiverId>`, and the late block's `beat/<rollRef>` on his pickup or stunt CHECK under shape S (§4.4.2, §9). The push window and the window bump draw none, and the test says so.
- **The mirror guard (M5)**, wherever a side is read (steps 3, 6 and 7): swapping LEFT and RIGHT on every card mirrors the escape direction, the slide direction and the catches within noise, and reports how often a card gives no side.
- **Every hit and sack figure carries its time to throw beside it**, because a stand-in hold about 0.35 to 0.4 s too long inflates sacks (REPORTED, `TOT` §8.7).
- **The petitions the step needs are asked at that step,** one typed yes naming each (§7); a kind used at two steps is asked once, at its first step, naming every use (`CM` T22).

| step | what lands (new in revision 2 in **bold**) | moves play? | extra proof | arms | petitions asked here | ON-arm callers |
|---|---|---|---|---|---|---|
| 0 | Instruments, benches, rules plumbing, golden digests v1-v7, the selection rule, the fitting order, every band and prediction filed; **M1-M9 (M8 for both answers to question 19); the clean-checklist bench rows; step 5b's bands re-derived; step 3's band from M8; L's crossing time; the late block on both shapes; the class (i) formula; default D21's arrival reading; the miss rule (default D31); b's grid and its reachable range** | no | every new row reproduces baseline-0009 | base only | **P1** | v1-v7 |
| 1 | Both block clocks; the per-tick CHECK change and every reader of §4.1; **the push window under shape S; the approach on every threat**; question 1 Today, no tunables change | no | monotone in time; L equals today from t >= R at R = 4, 5, 6; margin reproducible from the stream and the rules version; **every 1-14 POWER rep reports exactly its window ticks at or after 0.5 s, `min(m, 4)` then `max(m, 5)`, no die**; the determinism assertion checked under S with the window | S with the window (design); **S without it (information only)**; L at R = 5 and R = 8; **revision 1's Heels and Past-only tunables under L only (information, for the return package)**; joint | **P2, P3 (window named), P4** | v7 |
| 2 | **Must act, per rusher** (`collapsingWithinSeconds` 0.5); the Follows warning, 1.0 s, a status only; **every threat registered until step 7** | no | **must act never fires on the counter alone; every arrival makes him act**; no threat inside the warning coexists with CLEAN | forcing point alone; warning alone; both; **the narrower counter rule (information); M2 by alignment** | none | v7 |
| 3 | **Men nobody touched on the free-run clock (the snap spot by question 19's answer, Speed and Acceleration D18, the drop D22); the late weak block for touched men only (D19), on both shapes**; the stunt hand-off fix; **the looper's side (D16); the climb lane reads FRONT**; the clean bench restated | no | a faster or quicker-accelerating man is never later; **a deeper drop never brings him sooner; the built clock reproduces M8's table for the answer given, with the Mug arm off**; mirror guard | **the free-run clock joint; snap spot alone (once question 19 is answered); Speed and Acceleration alone; drop alone; the Mug arm on and off (information); by origin; touched men's late block alone; reading (c) (information, for the miss rule's option C); reading (a) (information only, never offered)**. Removed: the uniform delay as a candidate | P5 (optional, advised) | v7 |
| 4 | Contact (FIGHT only until step 7) **with its approach tilts**; the second arrival; the throwing motion **with D21's arrival reading**; `QB_HIT` **with approach, from and seen** (seen true until step 7); `releaseSeconds`; sack credit to the man at contact; the threat-list rebuild | no | contact monotone in each of its four ratings; closed forms; `release` monotone on hits; **the tilts move the margin only in their stated directions** | contact alone on today's line; motion alone; both; **tilts alone**; second arrival on and off; the contest-before-throw alternative (information); **the half-second arrival reading (information, never a candidate)** | **P6 (contest, second arrival and dodge named), P7, P8** | v7 |
| 5a | His count fitted on the clean bench; the drop floor; **the owner's clean-pocket checklist: the checkdown, one climb with the read restart and the reset, the window bump, the break-out; defaults D23, D25, D26, D27** | no | **a clean expiry never throws to a man below 30; no clean throwaway and no clean HOLD**; the drop floor removes 0.5 s throws; **at most one clean move a play** | count alone; drop floor alone; **each checklist item alone; checklist joint** | none | v7 |
| 5b | **The block clock chosen by the filed rule, S with the window**; then the first graded arm with design values | no | the selection reproduced from the filed rule by a second process | S grid; L grid; the winner at design values | **P2r, P3r only if L wins**, with questions 1, 3 and 16 back to the owner first | v7 |
| 6 | Outs: the real throwaway rule **(also at contact and after a clean break-out)**, the failed scramble scored as a sack in all three readers **with credit**, the scramble start, the escape cap, pursuer speed, no late horizon sack; **escape direction; unseen men on his side and the caught escape as contact; the drill's fresh rep, side-aware by break lane (D24); run or throw it away at the deadline** | no | grounding legal or illegal by position; the three sack readers agree on every play **and on who is credited**; at most one escape **(clean break-outs included)**; **mirror guard on direction and catches** | each alone, then joint; the rescoring alone; **side-aware catch alone; caught-as-contact alone; drill alone; side-aware drill alone; deadline pick alone** | **P9 (with `THROWAWAY.rollRef`'s doc naming the deadline pick), P10, P11 (escape, slide and clean break-out named), P12 (or its no-edit form)** | v7 |
| 7 | **Sight in three grades, keyed by rusher; the alarm with its full list (free-runner moment D20); SIDESTEP; the wider SLIDE_POCKET and slide-sooner; the LATE read penalty; NEVER means no choice; the ranked contact choice (D14)**; step-up sizing; rating signs; the trait counted once | no | X3 permutation guard; rating probes **for every new read**; the trait's budget term retired under the switch only; **one slide a play in all; SIDESTEP only inside its eligibility; mirror guard on the slide direction and slide-sooner** | sense alone; **alarm alone; SIDESTEP alone**; slide alone; step-up alone; **contact choice alone**; signs alone; joint; **literal "no choice" and registered-only read penalty (information)** | **P13 (three grades, keyed by rusher), P14 (every use named), P15**; a FIGHT choice only if `contracts-guardian` asks for one (§4.5) | v7 |
| **8a** | **The two-minute flag on the halves only; the goal-to-go distance (D29); `MatchGameState` gains period and score** | no | **by-name OFF proofs; ON: no two-minute flag outside a half's last two minutes; distance never more than the yards to the goal line, a turnover returned inside the 10 included** | **each fix alone; both** | none | v7 |
| 8b | The situation term: down, distance, **score and clock**, at fixed calls, **one set of weights at four places, centred (D35)** | no | same seed and same situation give the same stream; **centring holds over the league mix; the term never reads patience** | appeals alone; sticks term alone; **score and clock alone**; both; at fixed calls | none | v7 |
| 9 | Scheme multipliers | no | max protect never raises free rushers | protection; chip; max protect; blitz; drop; joint | none | v7 |
| 10 | Joint fit in the filed order; the selection re-run; acceptance (2022-24 and fresh seeds, default D7) | no | the whole ledger of §6.10; held-out seeds; **the interception guard by throw class (D28)** | full matrix | none | v1-v7 |
| 11 | **The default flip, in its own commit, with step 8a's fixes inside `pocket-1`** | **yes** | baseline-0010; ladders and `docConformance` re-pinned with the owner's yes (default D8); v1 to v7 under `legacy` equal the step-0 golden digests; the step-11 default stream equals step 10's accepted `pocket-1` arm, by digest; `pocket-1` frozen | | **P16** | v1-v7 |
| after | **The interception design** (the owner's ruling of 2026-10-23 19:19Z), measured on the fixed pocket; **then the fumble design (question 18) and then the hot-throws and outlets design (question 13), in that order by default D30**; ADR-077's check-release switched on only once this fix passes; re-measure ADR-073 step six, ADR-076 and F3.5 (§6.12) | | | | their own petitions | |

Step 9b of revision 1 is gone (question 13, Own design), with its petitions (revision 1's P8a and P8b) and its ADR-022 amendment (§7.3).

### 6.0 Step 0: instruments (calibration only; no play change)

*Kept from revision 1 (`R1:396-415`), with the clean bench restated for the free-run clock; revision 2's additions follow each part.*

**New rows:** `hit_or_sack_rate` and `sack_share_of_hit_or_sack` on the construct of §4.5; the release distribution on the named clock; `pressured_share_by_release_bin` and `hit_rate_by_release_bin`, each with **both real comparators** (tick-aligned and raw-second, §2.2) and the rule for which applies; the first PRESSURE-or-worse, first forcing and first ARRIVED distributions, with the first named as the clock compared with NGS's 2.9 s; first-pressure origin and the **quick-pressure share by origin**; ticks with a live WON_REP threat and a CLEAN pocket, and the dropbacks they fall on (today 30 ticks per 272 gen games and 60 per 496 flat games, REPORTED, K2's saved diagnostics); entry 107's deciding-instant multi-channel share (requirement P4); the throwaway real side from FTN `is_throw_away` (`ingest/sources/ftn.ts:302`), overall, pressured and clean; scrambles and scramble yards; by-down rows at fixed calls, 7-10 to go, goal-to-go excluded; `int_per_aimed_throw` and `completion_per_aimed_throw` as guards, with the real side per aimed throw; completion by pocket status, joining each dropback's `PLAY_RESULT` to its worst status; QB-season and defence-season spreads.

**Revision 2 adds these rows:** completely unblocked pressures per 100 dropbacks and their share of hit-or-sack (graded under the miss rule, §6.10), completely unblocked men per 100 dropbacks (reported), and the pressured share of 2.0 s throws with no free runner (the miss rule's n) and the quick-pressure share on pressured dropbacks with no free runner (its quick-share split, recheck); the sacker mix (M3), reported against its band, never pass or fail (default D34); the clean-pocket rows of §2.4 (clean outs, checkdown share, later-read share, drill share, out-of-pocket rate) with the clean bench's nobody-open share and its split (`CP` §3.2: 30.2 gen dropbacks in 100, desperation throws 10.1, checkdowns 8.9, throwaways 11.1); the situation rows of §2.4 (end of each half against the rest, and the last two minutes of the first and third quarters); sack share of contacts in and out of the pocket; INT and completion per aimed throw **by throw class** (default D28, §8); and the coverage-sack report rows (§4.6).

**Benches, and the ADR-012 fix (J2-1, V1-32, K2-07).** Driving `resolvePassRushTick`, `bandFor` or `tierFor` from calibration is exactly what ADR-012 removed (`docs/decisions/ADR-012-domain-exercises-domain.md:75-77`). So:

- the **uncensored line bench** lives in `packages/engine/test`, where the resolvers are in-domain;
- the **clean bench** is tunables-only and stays in calibration, as pkB built it: `passRush.blockerStructuralAdvantage` 500, `freeRunnerArrivalSeconds` 50, `freeRunnerPath.maxArrivalSeconds` 99, looper 50. It reproduces today's clean release of 1.663 s and a 20.63% throwaway rate on the flat league, 1.799 s and 11.13% on gen (REPORTED, pkB; J2 and K2 re-ran it and matched exactly). **At step 3 the recipe is restated for `pocket-1`**: the free-run clock's get-off allowance (for men nobody touched) and the late engagement time `t_e` (for touched men) are pushed past `clock.maxTick` in the bench's tunables patch, and the bench is re-proved clean (no threat reaches the pressured warning) before step 5a fits on it (K4 D-step5a);
- the **one-threat bench** is built from constructed calls run through `simulatePassPlay`, which ADR-012 permits (items 1 and 2: the entry points and the types to construct their inputs); it is not tunables-only, and it needs no new surface;
- calibration's permitted surface is unchanged: the simulation entry points (`simulatePlay`, `simulatePassPlay`, `simulateRunPlay`), the types for their inputs and outputs, the tunables-patch interface (`Tunables`, the frozen `DEFAULT_TUNABLES`, `applyTunablePatch`), `renderPlay`, and the statline reducer (ADR-012:52-73), plus the game-loop entry points calibration already imports (`simulateGame`, `createMatchState`, `deriveGameId`, `harness/runGame.ts:11`). Which ADR names the game-loop entry points is UNCLEAR (K2-07; ADR-012 lists the play-level points, and ADR-016 and ADR-020 use `simulateGame`); this design adds no surface.

**The engine-free measurements, M1 to M9** (no play change; `TM` §8, `CM` §3):

- **M1, the push window's price.** From `pass_rush_rep` margins and the beat draw at shape S's provisional values: dropbacks whose ball leaves on the beat tick of a 1-14 POWER rep that breaks at 1.0 s or later, the only pressured dropbacks the window adds under question 1 Today, with margins 1 to 4 counted apart. Step 1 files "the window alone moves pressure by at most M1's count, and sacks within 0.3" from it.
- **M2, where the forcing comes from**, under S and L: the share of forced decisions set by the counter while the nearest threat is more than 0.5 s away, by alignment and position. It sizes must act per rusher (§4.3) and prices the narrower counter arm.
- **M3, the sacker mix:** the credited sacker, with same-tick arrivals split 0.5 each, as play-by-play splits half sacks.
- **M4, the alarm mix:** first registrations by approach, and how often two rushers set it off at once (29.1% of first non-clean ticks today, as cited at `TM` §11).
- **M5, the mirror guard:** LEFT and RIGHT swapped on every card; escape direction and catches (and, from step 7, the slide direction) must mirror within noise; it also reports how often a card gives no side and how often the looper rule moves a side.
- **M6, contact's branches:** the upper bound (no-target arrivals with a broken receiver), then FIGHT against THROWAWAY by approach and down.
- **M7, sight's size:** the `pocket_sense` margin by from-class over the league's quarterbacks, to set the target and report the NEVER share.
- **M8, the free-run clock, engine-free:** every free runner's arrival on the base seasons for both answers to question 19 (Table now: his snap row of §4.4.3; Wait: down linemen only, the rest at today's times), from Speed and Acceleration (D18) and the card's drop (D22), at the filed constants, by origin, snap row and position, with and without the Mug arm (information only). Free runners and their pre-snap facts are fixed at the snap, so M8's table is exactly what step 3's build must publish (§6.3). It is shown to the owner with the constants (§4.4.5 is its preview).
- **M9, today's situation footprint:** pass rate, throwaways and time to throw in the last two minutes of the first and third quarters against the second and fourth and the rest. Step 8a's tolerance is filed from it.

**Plumbing.** The rules version and its overlay's tunables digest reach the baseline identity (`calibration/src/report/identity.ts:115-130`) as an **optional** field, absent meaning `legacy`, so baseline-0009 still reads under the strict `readIdentity` (`:340-366`), with a test that it does (K2-09); the export file (`export/gameFile.ts:41-49`); the season save (`season/main.ts:106-113`, `:159`, petition P1, with the franchise save code edits of §7); and the `season --out` file, which today records neither caller nor rules (REPORTED, K3-07; calibration-owned).

**P2S scoring (J1-10, V1-15, K1-11).** Step 0 does **not** require entry 173 on main, which is not this design's to decide. Every arm reports P2S against **both** 22.02% and 15.46%, and says which, for as long as PR #33 is open; if it is declined, against 15.46% only. Nothing here depends on it merging.

**The selection rule of §4.1 is filed here**, with its grids, its loss, its separation test and its fallback, **and the fitting order of §6.10**, before any engine arm runs. **So is every band of §6.10.**

**Revision 2 files these at step 0 too, before any engine arm runs:** default D21's arrival reading for the motion (§4.5); the free-run constants with M8's table (§4.4); step 3's two-part check (§6.3); step 5b's bands, re-derived by revision 1's method with the new steps' filed contributions, each with a direction and a size (§6.5; `CM` T20); the window's M1 bound for step 1; M9's tolerance for step 8a; b's grid and its reachable range (§4.5; `TOT` §11.2); L's crossing time (§4.1); the late block's margin and draw on both shapes (§4.4.2); the unblocked-pressure bands, at most 14 and at most 40 (§2.4); RUN's margin over the throwaway base at the deadline (§4.6 f); and **the miss rule** with its class (i) formula (default D31, §6.10). Revision 1's "the S late arm re-measured on a second seed set before step 3's band is filed" stops being a gate, because that arm is the uniform delay the owner's words replaced; it is re-measured as context only (`CM` §3).

**The census (K2-02).** `docConformance`'s census runs over `numericLeafPaths(DEFAULT_TUNABLES)` (`knownTruth/docConformance.ts:180`) and its path digest is pinned at `fnv1a:365da48d` (`test/docConformance.test.ts:223`); the baseline identity carries `tunablesDigest` (`report/identity.ts:120`). A new leaf in `DEFAULT_TUNABLES`, even an inert one, moves both. So every new dial lives in the `pocket-1` overlay, merged only when the switch is on, and enters `DEFAULT_TUNABLES` at step 11.

**Prediction:** every stream digest unchanged; `docConformance` still `fnv1a:365da48d`; **baseline-0009 reproduced on its 496 games: 86.85 / 20.05 / 16.43 / 1.242** (pressure / hit-or-sack / sack / release); gen base 85.26 / 24.04 / 16.72 / 1.235. **Falsified if** any digest moves or any base row differs.

### 6.1 Step 1: the block clock (and the push window)

*Kept from revision 1 (`R1:419-423`), petitions renumbered.*

**Changes.** Shape S: new `resolve/beatClock.ts`; overlay `passRush.beatClock { thetaSeconds, shape, ratingWeight }`; the pre-beat and post-beat reporting rule of §4.1; the once-per-rep draw and its CHECK (P2); the per-tick CHECK without a die (P3), and every reader of it named in §4.1 (`metrics/collect.ts:926-928`, `bandCensus`, `ladderOccupancy`, `engine/test/determinism.test.ts:378-379`, `debug/renderPlay.ts:383`, `sim/passPlay.ts:840`, `engine/test/rollAccounting.test.ts:147`, `engine/test/eventVocabulary.test.ts:131`, and the generic roll reads if P3 is typed as a plain optional field). Shape L: `PassRushTickArgs` gains `tick` (`resolve/passRush.ts`, above `:140`), passed from `sim/passPlay.ts:801`; overlay `passRush.repClock.fullExpressionSeconds`. Both: question 1 Today needs no tunables change (§4.2); `determinism.test.ts`; `docs/design/match-engine.md:565-587`, as a marked `pocket-1` section.

**Revision 2 adds:** the push window under shape S (§4.1.1: a POWER rep at 1 to 14 reports `min(m, 4)` at t_b - 1.0 and `max(m, 5)` at t_b - 0.5, each only at or after 0.5 s; no die), with P3's description naming its two ticks; and the approach card on every threat (§4.0), engine-internal, published as `RUSH_THREAT.approach` (P4). The PUSH label under shape L is a POWER rep that reported BEATEN before it reported RUSHER_WINS_REP. From step 1 the approach is derived for free runners too, from their origin and the pickup or stunt result (§4.0); step 3 changes their timing, not their labels. Revision 1's Heels and Past-only tunables run only under L, as information for the return package (§4.2).

**Prediction, at today's quarterback clock.** Shape L at R = 8 (REPORTED basis, pkA A12, re-run by J1): flat 36.50 / 2.86 / 2.41 / 1.590 and gen 39.71 / 3.40 / 2.44 / 1.651 for pressure / hit-or-sack / sack / release, tolerance pressure +-3, sacks +-0.5, release +-0.05. Shape L at R = 5: reported, direction only (pressure above the R = 8 arm). Shape S (REPORTED basis, pkC arm H: flat 32.50 / 3.20 / 2.64 / 1.590, gen 33.73 / 3.85 / 2.75 / 1.655): pressure 28 to 40, sacks 2 to 4, release 1.5 to 1.7 at the provisional values. **That basis is pkC's hazard form at a different point** (theta 8, k 2.3, hazard-notation beta 0.8, which is time-scale beta 0.35, margins offset by m0 = -6, uncentred, t0 = 0; designC §2.2): the two forms coincide only at k = 2 with time-scale beta 0.5 (hazard weight 1.0), so the S band is INFERRED from it rather than measured at §4.1's provisional values (R1-14). **Falsified if** pressure is above 45 on either league for either shape; or, for L, the band floor plus counter is above 10% of first dirt; or at R <= 6 any tick at t >= R differs from today's; or one byte differs in the OFF proof.

**Revision 2 adds:** the S arm runs with the window on, so the S band's upper pressure edge is raised by M1's window count, as at step 5b, because its basis (pkC arm H) had no window (recheck). **The window alone moves pressure by at most M1's count, and sacks by at most 0.3** (`CM` T1; the readers' stand-in moved pressure +0.3 and sacks 0, REPORTED, `TOT` §8.4). **Falsified also if** any 1-14 POWER rep reports other than its window ticks at or after 0.5 s (two when t_b is 1.5 s or later, one when it is 1.0 s, none when it is 0.5 s), `min(m, 4)` then `max(m, 5)`, or the window draws a die.

**Expected and not a result:** sacks around 2.4 in 100. No graded row is scored here.

### 6.2 Step 2: must act, per rusher, and the warning

*Kept from revision 1 (`R1:427`), with the clauses for the answers not chosen (Two seconds, Past him) removed.*

**Prediction** (REPORTED basis, pkA A12 -> A123 at today's clock, which is the forcing point with Follows): pressure -3.4 flat / -2.8 gen (+-1.5), hit-or-sack +0.3 to +1.3, sacks **+0.1 to +0.9** (measured +0.53 / +0.39). **Falsified if** the forcing point lowers sacks; or the step-2 proof fails.

**Revision 2 adds:** must act is per rusher (§4.3) with every threat registered until step 7, so its basis differs from A123's by the forcing the counter alone supplied; under S that is the 399 of 14,627 edge won-rep threats whose travel is 2.5 s or more (COMPUTED by TM), and M2 sizes it before the arm runs. **Falsified also if** must act ever fires on the counter alone, or any arrival fails to make him act.

### 6.3 Step 3: rushers nobody blocked, on their own clock (question 4)

*Revision 1's step-3 prediction (`R1:431`) is replaced. Its rows, the 2.0 s tick bin at or under 29.4 with hit-or-sack at or above 9.4, fail under readings (b) and (c) alike in the stand-ins (REPORTED, `TOT` §4.1), and its fallback ("the uniform delay is adopted and the owner is told") is the option the owner's words replaced. The uniform delay survives only as a contrast row.*

**Changes.** One free-run function for men nobody touched (D19): the snap spot by question 19's answer (Table now: the table; Wait: down linemen only, §4.4.3), Speed and Acceleration through `getAttr` (D18) and the card's `dropDepthYards` (D22), rounded to a tenth, no die (§4.4.3 to §4.4.5). Touched men (RAN_THROUGH, LATE_EXCHANGE) get revision 1's late, weak block, on both shapes (§4.4.2). The stunt ETA hand-off fix (`sim/preSnap.ts:570-581`, `:608-618`). The looper's side (default D16). The climb lane reads "no FRONT threat". The engine's `RushThreat.distanceYards` and `closingSpeed` filled for free runners, with P5 asked as optional. The clean bench restated (§6.0). The comments and spec text of §4.4 amended.

**What is checked, in two parts** (`TOT` §11.3-§11.4):

1. **The build does what the design says (this step's falsifier).** Free runners and their pre-snap facts are fixed at the snap and do not depend on the post-snap rules, so on the same seeds **every free runner's published `etaTick` equals M8's table for his snap row, ratings and drop, to the tenth**, by origin and snap row, under the owner's answer to question 19 and with the Mug arm off. Also: a faster or quicker-accelerating man is never later; a deeper drop never brings him sooner; the same seed gives the same stream; the mirror guard holds. **Falsified if** any of these fails: that is a build fault, fixed before the step comes to the owner.
2. **The real rows (reported against their bands; a miss goes to the owner under the miss rule).** On the pricing arm and the design build: the 2.0 s tick bin (limit 29.4), hit-or-sack, the quick-pressure share (30 to 55) and its origin, completely unblocked pressures per 100 dropbacks (band at most 14, twice PFF's about 7, INFERRED real) and their share of hit-or-sack (band at most 40 in 100, twice PFF's about 20, INFERRED real), with completely unblocked men per 100 dropbacks reported beside them (16.3 to 16.8 in the stand-ins, 18.1 on base gen). **Expected from the stand-ins** (REPORTED, `TOT` §4.1, reading (b) at revision 1's pricing setting with the coin contact): pressure 39.0, hit-or-sack 9.1 to 9.3, sacks 3.55, the 2.0 s tick bin 47.0 and the quick share 60.3, so **WARNING 2 expects the bin and the quick share to miss.** The miss is classed by the split filed at step 0 (supply, timing or conversion) and brought to the owner with its options (default D31, §6.10). **A late block, a uniform delay or a refit of the free-run constants is never offered for a man nobody touched.**

**Arms:** the free-run clock joint; snap spot alone (once question 19 is answered); Speed and Acceleration alone; drop alone; the Mug arm on and off (information); each origin alone; touched men's late block alone; reading (c) as information, priced for the miss rule's option C; reading (a) as information only (it would make men nobody touched late blocks, so it is never offered); the uniform delay as a contrast only. Revision 1's check "no single tick holds more than 50% of truly unblocked arrivals" is withdrawn (§4.4.6).

### 6.4 Step 4: contact and the motion

*Kept from revision 1 (`R1:435`), with the late-free-rusher basis replaced.*

**Prediction, on the pricing arm.** Contact alone on today's line (the named arm), untilted: sacks 10 to 14 flat and 9 to 13 gen (INFERRED from pkA's per-tick coin, 12.97 / 11.66, against the population P(sack) of 0.415 at b = 5, once per threat), pressure and hit-or-sack within 1 point. Sack share of hit-or-sack 40 to 55 on gen and 50 to 65 flat (the coin arms' 39.5 to 47.6 gen is a lower bound under the new hit construct, INFERRED). **The motion adds at least 3 hits on thrown balls in 100 dropbacks to the step-3 build, and on default D21's reading the hit-by-release curve must rise with the bin from 2.0 s on** (in revision 1's runs it fell in every run; in the theta = 13 run the bins from 2.5 s on were 0.4 / 0.6 / 0.4 / 1.6 / 0.6, against a real 10.6 to 18.0). The motion alone is priced on interceptions under the guard of §8. **Falsified if** the contest moves pressure more than 1 point, more agility or strength ever raises sacks, `release` has no measurable effect on hits, the motion adds fewer than 3 hits on thrown balls in 100 dropbacks, or the hit curve still falls from 2.0 s on (in which case the §4.1 selection cannot run and default D1's fallback applies).

**Revision 2 adds:**

- **The basis for the motion** (REPORTED, `TOT` §8.5): +6.0 hits in 100 on the half-second reading and +14.1 on the continuous one under reading (c) at the stand-in hold; +1.8 and +8.3 with the supply cut by 30 at a hold near real. On the continuous reading the stand-in curve by bin is 7.4 / 8.7 / 11.4 / 10.1 / 22.7 / 14.2 / 11.5 against a real 2.7 / 7.1 / 10.6 / 11.0 / 13.8 / 16.1 / 18.0. **"Rises from 2.0 s on" means a positive attempt-weighted least-squares slope of hit rate on bin midpoint over the bins from 2.0 s on** (CHOSEN, to make revision 1's words testable). **The half-second reading runs as information only, and switching readings to pass a row is never allowed** (`TOT` §11.2).
- **The tilts alone:** each moves the margin only in its stated direction (a seen PUSH or BLOCKED man fewer sacks, a man on the free-run clock more (FREE, and LOOPER_FREE labelled THROUGH), BEHIND or NEVER more). In the stand-in's all-pieces arm, FREE contacts ended in a sack 55 times in 100, THROUGH 41, a second contact 83 (REPORTED, `TOT` §8.3).
- **Reported:** the sacker mix against its band (M3, default D34); b's reachable range on this build (§4.5); `QB_HIT` carries approach, from and seen on every hit (seen true until step 7), and the sack is credited to the man at contact.
- **Falsified also if** a tilt moves the margin against its stated direction, or a `QB_HIT` is missing approach, from or seen under `pocket-1`.

### 6.5 Step 5: the quarterback's count, then the first graded arm

*Kept from revision 1 (`R1:439-445`), with the checklist added at 5a and 5b's bands re-derived.*

**5a, on the clean bench (restated for `pocket-1`, §6.0).** Release 2.41 +- 0.15 s; share at or under 1.0 s at most 8% (real clean 6.3%); share at or over 3.5 s 8 to 18% (real clean 14.1%). These three are largely consequences of fitting the three deltas to that same shape, so they check the fit, not the mechanism. **The rows the deltas do not touch** are the falsifiers: clean throwaway at most 2.5% (real 1.25%); clean scramble 2 to 6% (real 3.92%); INT per attempt at most bench base + 0.3 pp; completion per aimed throw at least bench base - 2 pp. **Falsified if** any of those four is outside its band on either league (K4 D-step5a: round 1's falsifier fired only above 5%).

**Revision 2 adds at 5a** (the owner's checklist, §4.6; `CP` §4.9): report rows for clean outs (real 5.17 in 100), the clean checkdown share of aimed throws (14.7%), the later-read share (10.0%), and the bench's nobody-open share with its split; **a direction falsifier: on a clean expiry no ball goes to a man below 30** (default D23); a structural test, at most one clean move a play; the changed class's count and interceptions (today's desperation throws on the gen bench are 10.1% of dropbacks and carry 549 of 1,987 interceptions, REPORTED, `CP` §4.8; under D23 the ones at 30 or more still go, so that is an upper bound on what D23 removes).

**Revision 2's settle changes two of revision 1's four 5a falsifiers.** Clean throwaways are 0 at 5a by construction (the clean pick has no throwaway, and a clean break-out must run until step 6, §4.6), so that row is reported at 5a, as 0 in the pocket against a real 0.76 per 100 clean dropbacks (217 of 28,619) and 0 outside against 0.50 (142), and graded from step 6. **The interception falsifier at 5a is D28's guard read by throw class** (§8), because D23 alone can lower the bench's INT by up to about 1.4 (the upper bound above), so the league-wide "bench base + 0.3 pp" cannot fire; it is reported. The reset is held at 1.0 s and reported alone (default D33). Until step 6 a clean break-out must end in a run, because there is no out-of-pocket throwaway yet, so 5a's clean scrambles may run up to about 0.5 in 100 high (real clean throwaways outside the pocket are 142 of 28,619); the 2 to 6% band absorbs that (`CP` §4.9).

*Revision 1's 5b paragraph, kept as the record; its bands are replaced by the re-derivation below:*

> **5b, selection, then the first league arm with design values (J2-5).** The filed rule chooses the block clock's shape and scale (§4.1). Then the hold proxies are retired, and the bands are filed from 5a's values and from the filed contributions of the steps that follow (K4 J2-5): **sacks 2.7 to 4.6; hit-or-sack 8.5 to 12.9; release 2.45 to 2.85 s; `CLOCK_EXPIRED` at most 1.5% of dropbacks; no release bin from 2.0 s on above twice FTN (raw seconds); pressure 25 to 42 and the quick-pressure share reported.** **Graded on the generated league first** (default D6): the flat league scrambles on 17 dropbacks in 100 against a real 5, and about a third of its sacks are caught escapes (`maps/gaps.md` item 7).

*Revision 1's method, kept; revision 2 applies it below:*

> **How 5b's sack and hit bands are derived (R1-03).** Acceptance grades sacks at 5.58 to 7.54 and hit-or-sack at 12.5 to 16.9. The later steps' filed contributions are step 6's rescoring, 1 to 3 points of sacks, each of which is also a hit-or-sack (a sack is one, §4.5), and step 7's feel, 1 to 3 points of hit-or-sack, about 45% of them sacks (0.45 to 1.35 points). 5b's bands are acceptance's bands **shifted down by the midpoints** of those contributions (sacks 2.0 + 0.9 = 2.9; hit-or-sack 2.0 + 2.0 = 4.0), so they keep acceptance's width: sacks 2.68 to 4.64 and hit-or-sack 8.5 to 12.9 (INFERRED arithmetic). Full interval arithmetic (acceptance minus every combination of the contributions) gives 1.2 to 6.1 and 6.5 to 14.9; that is reported beside the result and is not the falsifier, because it is as wide as the band J2 judged unfalsifiable. The shift assumes steps 6 and 7 land near their midpoints; a 5b pass followed by an acceptance failure points at step 6 or 7 by name, because each has its own band. Round 1's 5b band (sacks 5.0 to 7.6, hit-or-sack 10 to 17) was both as wide as the band J2 judged unfalsifiable and inconsistent with the later steps' own predictions; round 2's (3.0 to 5.5, 9 to 13) matched no stated method.

**Revision 2's re-derivation, by the same method** (`CM` T20; filed at step 0, which replaces these provisional figures with its own and prints the full-interval version beside them). The filed contributions after 5b are now: **step 6**, the rescoring at 0.3 to 1.0 points of sacks (midpoint 0.65, each also a hit-or-sack; settle: the earlier 0.5 to 2.0 did not fit the failed-scramble band of 5 to 15% of sacks, which at a real 6.6 is 0.3 to 1.0), plus the side-aware catch, about +0.24 sacks and +0.32 hits-or-sacks (REPORTED, `TOT` §8.2), and the caught escape as contact at -0.5 to -1.0 sacks (midpoint -0.75; recheck: the earlier -0.3 did not follow from this basis; INFERRED: about 1.0 to 2.0 caught escapes in 100 dropbacks, about half of them shed, each shed removing a sack and, since he mostly runs on, a hit-or-sack); the side-aware drill is unpriced (risk R30) and taken at 0; **step 7**, sacks +0.5 to +2.5 (midpoint 1.5) and hit-or-sack -4 to +1 (midpoint -1.5) (§6.7); **step 8b**, centred (midpoint 0). Revision 1's step-7 contribution (feel replacing forcing, +1 to +3 hits-or-sacks) no longer applies, because must act per rusher lands at step 2. So the shift is about 1.64 sacks (0.65 + 0.24 - 0.75 + 1.5) and about -1.28 hits-or-sacks (0.65 + 0.32 - 0.75 - 1.5), and **5b's provisional bands are sacks 3.9 to 5.9 and hit-or-sack 13.8 to 18.2** (INFERRED arithmetic: acceptance's 5.58 to 7.54 and 12.5 to 16.9 shifted by those midpoints), with release 2.45 to 2.85 s, `CLOCK_EXPIRED` at most 1.5% of dropbacks (a spent count in a pressured pocket; no checklist play counts, §4.7), no release bin from 2.0 s on above twice FTN (raw seconds), and pressure 25 to 42, its upper edge raised by M1's window count, with the quick-pressure share reported. **The stand-in nearest 5b** (reading (c), the coin, no alarm, a hold of 1.0, the continuous reading; REPORTED, `TOT` §4.3) gives sacks 1.95 and hit-or-sack 17.46: sacks would miss low and hit-or-sack would pass near its top, because free runners make too many of the hits and too few of them become sacks (WARNING 2).

*Revision 1's reading of its own basis, kept as the record:*

> **The measured basis, read honestly** (COMPUTED, Appendix B, shape S runs with the stand-in hold): pressure 29.8 to 43.7, sacks 2.3 to 6.0, hit-or-sack 4.9 to 12.8, release 2.69 to 2.80 s. **The composition reaches the release clock and the pressure curve and is short of hits and sacks by a factor of 1.5 to 3.** The three named suppliers of the missing hits are step 3's late weak block, step 4's motion, and step 7's feel replacing forcing: in the theta = 13 run the first forcing tick (2.75 s) sits just before the release (2.80 s), so a pressured quarterback still throws before the rusher arrives, and only 17.7% of pressured dropbacks reach a hit-or-sack against a real 48.8%. **If 5b's hit-or-sack falls below 8.5, that is a failed prediction, recorded as such, and step 7 is the named next supplier.**

**Revision 2 reads that paragraph against the answers.** Of revision 1's three named suppliers, the late weak block is gone for the men who matter most (default D19), and must act per rusher has replaced forcing by the counter at step 2. The readers' stand-ins show the free-run clock and the motion now **oversupplying** hits at today's supply of free runners, while sacks fall short once the supply is near real (WARNING 2; `TOT` §9). **If 5b's sacks or hit-or-sack fall outside their filed bands, that is a failed prediction, recorded as such, and the miss rule's class decides what the owner is shown** (§6.10). For a conversion miss (class iii) the named next suppliers are, in order: question 8's rescoring (step 6), question 7's checklist at the deadline (step 6), the won-rep half of the alarm (step 7) and step 8b's situation term (`TOT` §11.3). The free-run clock and the throw bars are not on that list.

### 6.6 Step 6: outs

*Kept from revision 1 (`R1:449`), with the rescoring's band re-filed.*

**Prediction.** Pressured throwaways fall from about 20% of pressured dropbacks to 7 to 11% (real 8.84%); throwaways at most 5% of dropbacks; the failed-scramble rescoring, priced alone on the rebuilt pocket, adds **0.3 to 1.0** points of sacks (settle: 5 to 15% of a near-real 6.6 sacks, the failed-scramble band below; revision 1 filed 1 to 3 on pkB's composition, +1.2 gen and +3.2 flat; the readers' upper bound at a hold near real is 0.7 to 1.4 in 100, the scrambles of zero yards or fewer, REPORTED, `TOT` §8.9); scrambles tackled behind the line are 5 to 15% of sacks (SIS charts failed scrambles at 10% of sacks, REPORTED, §2.3); zero horizon sacks after an escape; at most one escape per play. **A mobility 40 -> 90 probe moves P2S by at most 2 points and raises the scramble rate; a faster pursuer never lowers the failed-escape rate** (F2.3; `maps/requirements.md:278`). **Falsified if** pressured throwaways stay above 15%, or the rescoring alone lowers sacks (the joint step may lower them, because a caught escape that sheds removes a sack; its midpoint is -0.75, §6.5), or no scramble run ever ends behind the line on the stream (under the Sack answer), or either probe fails.

**Revision 2 adds** (questions 7, 9 and 17; `CP` §4.9, `CM` §3):

- **Clean out-of-pocket, 6 to 16 per 100 clean dropbacks** (real 10.63, `CP` §2.1; width CHOSEN), a falsifier.
- **Sack share of contacts, in and out of the pocket, within 5 points of each other** (real 45.5 against 43.9, as cited at `TM` §7), a falsifier.
- **Side-aware catch alone:** the stand-in added +0.32 hits and +0.24 sacks in 100, with the caught share of escapes rising from 19.8 to 25.1 (REPORTED, `TOT` §8.2); direction: more sacks. **Caught escape as contact alone:** fewer sacks (direction), because some catches become sheds. **The drill alone, the side-aware drill alone and the deadline pick alone:** reported.
- **Reported:** the drill's share of clean aimed throws (real 3.0%); throws on the run, completion and INT, against the real 69.3% and 2.11% clean and 53.4% and 3.25% pressured; the mobility thirds against the data (more Mobility raises clean scrambles, real 2.44 to 5.18; under the default it also lowers throwaways at the deadline, where real clean throwaways stay flat at 1.17 to 1.33, so that fall is expected and is reported, not failed; §2.4, §14 item 18); the out-of-pocket sacker shift by sign (off-ball linebackers up, interior down; real 16.0 against 9.0 and 16.5 against 23.2).
- **The three sack readers agree on every play and on who is credited** (`CM` T9); at most one escape a play, clean break-outs included; the mirror guard on direction and catches.
- **Falsified also if** clean out-of-pocket is outside 6 to 16, the contacts' sack share in and out of the pocket differs by more than 5 points, or any agreement or mirror test fails.

### 6.7 Step 7: the alarm, sight and the slide

*Revision 1's step-7 prediction (`R1:453`) is kept for its benches, probes and structural rows; its pressure and hit-or-sack bands are replaced, because feel no longer replaces forcing (must act per rusher lands at step 2) and the pocket's status stays physical (§4.8).*

*Revision 1's step-7 prediction, kept as the record:*

> **Prediction.** Pressure -5 to -15 (INFERRED). Hit-or-sack +1 to +3 points at a felt rate near 0.9, not the +16.7 to +18.0 of pkB's memoryless 0.5 mock. The share of pressured dropbacks reaching a hit-or-sack rises from 17.7% toward 30 to 49%. On the never-finds-a-receiver bench (TECH:113), the interior-versus-edge sack gap comes within 2x, and a poised quarterback's edge free-runner sack rate is no longer near 1% while interior stays above 40% (F1.3, TECH:74). Zero horizon or `CLOCK_EXPIRED` sacks after a step-up (today 8 in 32 seasons, MEAS:93). Awareness 50 -> 90 moves P2S by at most 2 points and raises the clean share. **A patience 50 -> 90 probe raises pressure and keeps P2S within about 2 points** (V2-02). **Falsified if** any poise or awareness probe raises sacks per dropback; or the patience probe moves P2S by more than 2 points or does not raise pressure; or sensing moves P2S without moving pressure; or a sack follows a step-up on the horizon or clock; or the X3 permutation guard fails.

**Revision 2's bands** (CHOSEN widths around the stand-in basis; REPORTED basis, `TOT` §8.6): **pressure within -3 to +3 points; sacks +0.5 to +2.5** (the alarm's free-runner half gave +1.31 on reading (c); NEVER contacts with no choice add, won dodges and slides subtract); **hit-or-sack -4 to +1** (the free-runner half gave -2.8 on the continuous reading). The share of pressured dropbacks reaching a hit-or-sack is reported against the real 48.8%, direction only. **New probes:** agility 50 -> 90 never raises sacks per dropback and raises SIDESTEP's won share; strength never raises sacks; the EARLY share of FRONT and SIDE threats lands in 0.85 to 0.95 (a check of the setting, not the mechanism). **Reported:** SIDESTEP's won share (stand-in 65.2%), the alarm mix (M4), the contact branches (M6), and interceptions by throw class (D28). **Structural:** one slide a play in all; SIDESTEP only inside its eligibility; the mirror guard M5 on the slide direction and the slide-sooner rule (recheck); the literal "no choice" and the registered-only read penalty run as information arms.

**Revision 1's falsifiers kept, with one withdrawn:** any poise or awareness probe (and now any agility or strength probe) raising sacks per dropback; the patience probe moving P2S by more than 2 points or not raising pressure; a sack following a step-up on the horizon or the clock; the X3 permutation guard failing. **Withdrawn:** "sensing moves P2S without moving pressure", because sight now changes his reactions while the status stays physical, so P2S may move with pressure flat by design. **Falsified also if** pressure, sacks or hit-or-sack fall outside the bands above.

### 6.8 Step 8: the situation, in two halves

**8a: the two fixes** (default D29; §4.9). **Prediction:** on the ON arm, no two-minute flag outside the last two minutes of a half, and no distance above the yards to the goal line, after a first down, a turnover or a change of possession (all structural); the sim's last two minutes of the first and third quarters stop looking like a two-minute drill, their pass rate, throwaways and time to throw coming within M9's filed tolerance of the rest of the game (real: pressured throwaways 8.94 against 8.51 in 100, time to throw 2.616 against 2.622 s, §2.4). Each fix is priced alone, then both; every caller's stream moves under `pocket-1`, as expected, and stays byte-identical under `legacy` (the OFF proof). **Falsified if** a flag fires outside a half's last two minutes, a distance exceeds the yards to the goal line, or the first- and third-quarter rows stay outside M9's tolerance.

**8b: the situation term.** *Kept from revision 1 (`R1:457`):*

**Prediction.** At a fixed 7-10 to go, goal-to-go excluded, third-down P2S at least 3 points above early downs (real 26.5 against 19.6, §2.3); pressured throwaways falling by down (real 9.7 / 6.0 / 2.7; fourth down rests on 73 pressured snaps, so only early against third is graded). Today the sim's P2S falls by down (20.5 / 18.9 / 18.6 / 15.2) and its pressured throwaways are flat at 2.64%. **Appeals alone will not do it:** pkB measured appeals alone giving P2S 10.1 / 11.7 / 13.3, fourth down highest, so the budget-for-the-sticks term must carry it. **Falsified if** the ordering fails with the sticks term on; then the miss is recorded and taken to the owner with its numbers, as every failed prediction is (§6.10, "What fails means"), and the term stays, as question 12 All ruled, until the owner says otherwise (recheck: the miss rule's classes and options are about free runners and do not describe a by-down miss, so it is not routed through them) (settle: revision 1's "the down effect belongs to the play-callers (F4.4) and the term is dropped" was written under the Down recommendation and is withdrawn). (Revision 1's own test runs carry no by-down rows.)

**Revision 2 adds** (§4.9, §2.4): the end-of-half rows are fitting rows at step 10 and are reported here by direction (clean throwaways above the rest, real about 2.5 times; pressured throwaways higher, real 1.6 to 2.9 points). **Falsifiers:** no situation's P2S more than 3 points from the rest (real within 1.2); time to throw at the end of a half when trailing exceeds the rest by more than when level or leading (real +0.10 s against 0.00 s). **Structural:** the term averages 0 over the league's situation mix (the centring), and it never reads patience; the patience probe runs at fixed situations.

### 6.9 Step 9: scheme

*Kept from revision 1 (`R1:461`); step 9b is gone (question 13, Own design).*

**Prediction.** With at least one blitzer, P2S within 3 points of no blitz (real 21.3 against 22.4) while pressure is 8 to 16 points higher (real +12.4). P2S with three or more deep routes at most twice the 0-deep figure (today 52.0 against 11.7). Max protect never raises the free-rusher count. Double team, chip and drop: reported, direction only (a double team lowers that lane's beat rate; a chip delays the edge beat; a deeper drop raises pressure). **Falsified if** either ratio is outside its band.

### 6.10 Step 10: the ledger, then acceptance

*Kept from revision 1 (`R1:463-510`), with the five dials widened by the answers (`CM` §6), new falsifiers and report rows, and the miss rule.*

**The five fitted dials, declared** (nothing else is fitted):

| dial | fitted to | at | blind to | what the answers changed |
|---|---|---|---|---|
| the block clock's shape (S or L) and its one scale (theta at k = 2, or R) | the **shape** of the hit-by-release curve (each curve divided by its own mean; aimed throws; raw seconds; default D21's arrival reading); fallback the pressured-by-release curve, by default D1 | step 5b, re-run once at step 10 | every sack row, the hit level, and the pressure rows unless the fallback is used | every S grid point carries the push window (question 16); every arm runs the free-run clock (question 4) |
| the contact's sack boundary b (starts at 5) | the league sack share of hit-or-sack, 44.6% | step 10 | the hit-or-sack level | fitted on the whole contact population: approach tilts, the contact choice, caught escapes, the second arrival (questions 5 and 17); the tilts and the dodge boundary stay CHOSEN. **Its reachable range is reported beside the fit, and its grid is never widened to reach 44.6**: on the continuous reading the stand-in ceiling, with every contact a sack, is a share of 24 to 36 (REPORTED, `TOT` §8.3) |
| the three read-system budget deltas | the clean release shape (§2.2) | step 5a | the league triple | fitted with the owner's checklist running on the bench; the reset held at 1.0 s and reported alone (default D33) |
| the throwaway appeal | 3.54% overall, 8.84% pressured | step 10 | the by-down rows | one appeal used at four places: the alarm, must act, the contact choice and the pursuit deadline (the clean pick has no throwaway, §4.6 c); clean throwaways (1.25%), all from the deadline after a clean break-out, are its falsifier; RUN's base at the deadline moves with it by its filed margin, and a baseline quarterback must still rank RUN first there (§4.6 f, recheck) |
| **the situation weights** (revision 1: the down and distance weights) | pressured throwaways by down at 7-10 to go, and the end-of-half throwaway rows (§2.4) | step 10 | P2S by down and by situation; time to throw by situation | down, distance, **score margin and time left in the half** (question 12, All); one set at four places; centred (default D35) |

**The fitting order, filed at step 0 (J1-3, J2-9).** (1) Step 5a: the three deltas, on the clean bench, which sees no line. (2) Step 5b: the block clock, with b at its provisional 5. (3) Step 10: b, then the throwaway appeal, then the situation weights. (4) Step 10: the block clock selection re-run once, mechanically, with those three fixed, because b moves hits between release bins (a shed followed by a throw is a hit). (5) If the selection changes, b is refitted once on the new clock and the process stops: two passes at most, both reported. If the second pass would change the selection again, the design comes back to the owner.

**Overlaps, declared (V2-20).** Fitting the sack share ties the sack rate and the hit-or-sack rate together: they are **one** prediction, not two. The hit curve is fitted on shape only, so the level of hits on thrown balls (7.1 per 100 dropbacks) is a **second**, separate prediction; since those hits are about half of hit-or-sack, the two predictions overlap, and they are reported side by side so the overlap is visible.

**Chosen dials** (football judgement, values shown to the owner, not fitted): shed delay 0.5 s (a bull rush 1.0 s, still engaged); `rho0` about 0.3 s and `rho_d`; sight's target (revision 1's felt rate, 0.85 to 0.95 of FRONT and SIDE threats), its from terms (+20 / 0 / -30) and band edges (0 / -30); the drop floor by first-read depth; the reset, 1.0 s; the late block's weak-block multiplier and `t_e`, now for touched men only (D19); the second-arrival probability 0.85; slide delays of 1.0 s (bull rush) and 0.5 s (straight through) and the one-tick slide-sooner; step-up sizing; S's k and beta (set by probes); the push window's 1.0 s and its margin range 1 to 14; SIDESTEP's 1.0 s window, its overrun formula and its boundary 5; the escape side penalties 10 and 15; the contact tilts (+20, +10, +10); the LATE read penalty; the appeals of the alarm, must act, the contact choice, the clean pick (MOVE and ESCAPE, today's terms) and the deadline pick (RUN's margin over the fitted throwaway base, set at step 0 so a quarterback at the baseline runs first whatever the fit, §4.6 f); the no-side and two-stunt side rules; and the free-runner alarm at 1.0 s (D20) (`TM` §3.10, `CM` §6.2). **Filed at step 0 and never fitted:** the free-run constants (the snap-spot table under question 19's answer, with its DELAYED wait of 0.5 s and the creeper's 3 yd/s; and, by default D18, the 40 time from Speed, the start from Acceleration against Speed, get-off 0.35 s, reach 1.0 yd, edge bend 1.1, loop +0.5 yd) and the arrival reading (D21), with L's crossing time. The miss rule's n is measured on each arm, never chosen. The window bump and the drill's fresh rep reuse existing magnitudes and add no number. Revision 1's stand-in path table is gone.

**Graded at acceptance, on the generated league** (default D6): sack rate 5.58 to 7.54; hit-or-sack 12.5 to 16.9; time to throw 2.24 to 3.03 s (0.15 relative of 2.631, as the existing gates; 2.682's band, 2.28 to 3.08, is reported beside it).

**Unfitted falsifiers, each with its filed band** (K4 D-step10; the widths are INFERRED, filed at step 0, and may be tightened but never widened before the arm runs; raw-second bins from `releaseSeconds`):

| falsifier | band | real |
|---|---|---|
| hits on thrown balls per dropback (aimed) | 5.0 to 9.5 | 7.1 |
| time-to-throw shape: share of attempts under 2.0 s / at or over 3.5 s | 18 to 34% / 10 to 22% | 26.1% / 16.1% |
| pressured-by-release curve (unless fitted by the fallback) | no bin from 2.0 s on above twice FTN; RMS over the first five bins at most 12 | 9.0 to 72.6 |
| quick-pressure share (first PRESSURE-or-worse before 2.5 s, of pressured dropbacks) | 30 to 55%; **the direct check of question 4's clock, which WARNING 2 expects to miss** | about 41 to 45% (INFERRED); a measured floor of 19.6% of pressured dropbacks in raw seconds, 13.6% on the tick grid (§2.4) |
| quick-pressure origin | free rushers' share of quick pressures above their share of all pressures | SIS direction (`RES:140`) |
| scrambles: overall / pressured / clean | 3.5 to 7.0 / 5 to 11 / 2.5 to 5.5%; the clean band now exercised by clean break-outs | 5.12 / 7.89 / 3.92 |
| clean throwaways | at most 2.5% (0 in the pocket by construction, §4.6 c) | 1.25% (0.76 in the pocket, 0.50 outside) |
| **clean out-of-pocket, per 100 clean dropbacks** | 6 to 16 | 10.63 |
| **sack share of contacts, in and out of the pocket** | within 5 points of each other | 45.5 / 43.9 |
| **failed scrambles as a share of sacks** | 5 to 15% | 10% (SIS) |
| third down against early downs, 7-10 to go | third-down P2S at least 3 points above | 26.5 against 19.6 |
| **P2S by situation** | no situation more than 3 points from the rest | within 1.2 (§2.4) |
| **time to throw at the end of a half** | trailing exceeds the rest by more than level or leading does | +0.10 s against 0.00 s |
| **the last two minutes of the first and third quarters** | within M9's filed tolerance of the rest (step 8a) | indistinguishable from the rest |
| blitz against no blitz | P2S within 3 points; pressure 8 to 16 higher | 21.3 / 22.4; +12.4 |
| deep-route split | 3+ deep P2S at most twice 0-deep | |
| QB-season P2S spread / defence spread | 2.5 to 4.5 pp (pass or fail, default D4) / at most 1 pp | 3.56 / 0 |
| target share | WR rising toward 50.8-68.7%, RB at most 20.6%; watched closely, because more checkdowns may push the back's share up (`CP` §4.12) | |
| completion per aimed throw | a fall of more than 2 points fails | 67.5% |
| the interception guard | §8, read by throw class (default D28) | |
| ticks with a live WON_REP threat and CLEAN (R1-02) | under Follows with shape S: at least 99% of the dropbacks that have one have exactly one (the beat tick), the count reported, **with PUSH reps counted apart** because the window fills that tick for them; with shape L: a band filed from step 1's count before step 5b | today 30 per 272 gen games, 60 per 496 flat; shape S test runs 812 to 1,066 per 272 games, on 805 to 1,019 dropbacks (K2 diag; R1) |
| P1(c), the entry-104 pattern | reported; pressure 25 to 35 with P2S under 12 against both real figures sends the design back to the owner before the flip | S theta 13 today shows it: 29.77 / 7.98 |
| **the mirror guard** | escape direction, slide direction and catches mirror within noise | (symmetry) |

Also scored: entry 170's keepable ordering (keep must beat no-outlet by most of the free-rusher share and must not sack more than base); ADR-077's rows (a) to (c); today's pre-snap hot routes re-measured (F3.5, reported); the knownTruth ladders (direction only until re-recorded, default D8); `docConformance`; the monotonicity probes (with question 11's exception for patience, which the owner granted).

**Revision 2 also scores, as report rows that never pass or fail:** the sacker mix against its CHOSEN band (edge 45 to 70, interior 12 to 32; default D34), which is expected to miss on today's travel table (interior 1.0 s, edge 1.5 to 2.0 s; ADR-061) and is a finding, not a tuning target (today interior 82.5 to 91.2 and edge 6.4 to 10.1 depending on credit, REPORTED, `TM` §7; `CM` T19); the out-of-pocket sacker shift by sign; completely unblocked men per 100 dropbacks (the graded rows are the unblocked pressures and their share, under the miss rule); clean in-pocket throwaways, 0 by construction against a real 0.76 per 100 clean dropbacks; the coverage-sack rows (sacks after a clean expiry as a share of all sacks, against SIS's 13% coverage sacks plus part of its 10% failed scrambles; mean time to sack against PFF's 3.8 s); the clean checkdown, later-read and drill shares; read thrown; the alarm mix (M4) and contact's branches (M6); b's reachable range; and the time to throw beside every hit and sack figure.

**What "fails" means.** Acceptance fails if any graded row is outside its band on the generated league, or any falsifier is outside its filed band, or the interception guard is broken. A failure is reported as it is and the design comes back to the owner; nothing is retuned to make a failed row pass without a new filed prediction. **A miss is classed and taken to the owner by the miss rule below; nothing in it is automatic.** **An accepted miss is still a miss** (settle): under option B the row stays failed in the ledger as a named, accepted miss, and acceptance has not passed while it stands, unless the owner rules by name that it passes. ADR-077's check-release waits for that pass (§6.12).

**The miss rule (default D31), filed at step 0, before step 3 runs** (`TOT` §11.3). It respects the owner's question-4 words in every branch.

1. **The rows it covers:** step 3's real rows; step 5b's and acceptance's graded rows; and four rows that belong to the free-run clock: the 2.0 s bin (at most twice FTN, on the grid the step uses: the tick grid, limit 29.4, at step 3; raw seconds, limit 36.2, once the motion exists), the quick-pressure share (30 to 55), completely unblocked pressures per 100 dropbacks (a man on the free-run clock whose own arrival floor reached PRESSURE or worse while the ball was in his hand, each man counted once a play; band at most 14, twice PFF's about 7) and their share of hit-or-sack (band at most 40 in 100, twice PFF's about 20) (§2.4; the real figures INFERRED, the bands CHOSEN). Completely unblocked men per 100 dropbacks are reported beside them.
2. **What never moves on a miss:** the free-run constants (D18, D22, and the snap-spot table if question 19 is answered Table now); the reading of "completely unblocked" (D19) unless the owner changes it under option C; the arrival reading (D21); the warning rule (question 3, Follows); the throw bars (`tunables.ts:2248-2249`); the interception rules. **No completely unblocked man is ever timed as a late block or by a uniform delay, whatever the row.**
3. **The class, by a split filed in advance and measured on the arm that missed:**
   - **(i) Supply.** The 2.0 s bin passes on dropbacks without a free runner, but free runners are on more than `(L - n) / (100 - n)` of the 2.0 s throws, where L is the bin's limit on the grid the step uses (29.4 tick at step 3; 36.2 raw after the motion) and n is that arm's measured pressured share of 2.0 s throws with no free runner, printed beside each arm (about 15 in 100 on raw seconds at n = 25, about 6 on the tick grid at n = 25, and 23 on raw seconds at n = 16.7, the stand-in hold nearer real; §4.4.6); or completely unblocked pressures exceed 14 per 100 dropbacks; or their share of hit-or-sack exceeds 40 in 100; or the quick-pressure share fails while it passes on pressured dropbacks with no free runner (recheck). That points to protection.
   - **(ii) Timing.** The bin fails on dropbacks without a free runner, the quick-pressure share fails on pressured dropbacks with no free runner (recheck), or free runners arrive earlier than M8's table. That points to the block clock or the count, or to a build fault.
   - **(iii) Conversion.** Hit-or-sack is in its band but sacks or the share are short. That points to contact, the hold and the outs.
   - **(iv) Unclassed** (recheck). A covered row that misses with none of (i) to (iii) holding (time to throw or release outside its band, say, or hit-or-sack outside its band) goes to the owner labelled unclassed, with its numbers, the same options and the same stop rule. Where two classes hold on different rows, both are named.
4. **What happens next goes to the owner, never automatically.** The Orchestrator brings the miss with its class and these options, each priced on two seed sets:
   - **A. A protection design** (revision 1's risk R1; the free-runner reader's question F4): fewer blown pickups and missed stunt exchanges, first as an information arm, then as its own design with its own petitions. The readers' supply-cut stand-in shows its direction: the 2.0 s check passes at about the real supply, and sacks fall (WARNING 2).
   - **B. Accept and report.** The row is recorded in the ledger as a named, accepted miss, and the build goes on; acceptance has not passed while it stands, unless the owner rules by name that it passes (above).
   - **C. The owner revisits who counts as "completely unblocked"** (default D19, reading (b), against reading (c), in which every free runner, a touched man included, runs on the free-run clock, §4.4.1). That is the owner's reading, not a fit; under both readings a man nobody touched is never a late block. Reading (a), which would make a whiffed back's man or an untouched looper a late block, is never offered (settle).

   For a class (iii) miss the named next suppliers are, in order: question 8's rescoring (step 6); question 7's checklist at the deadline (step 6); the won-rep half of the alarm (step 7); step 8b's situation term. Neither the free-run clock nor the throw bars are on that list.
5. **Stop rule.** One pass of the options per step. If the chosen option misses again, the step stops and the design comes back to the owner, as the two-pass rule for b and the block clock already does.

**2025 (default D7, V1-43, K3-17).** `docs/design/calibration.md:165` opens 2025 only at declared checkpoints ("end of Phase 3, then before v1 ship"), and the cache holds 2022 to 2024 only. **Default: Wait.** Acceptance runs on 2022 to 2024 and fresh seed lists, and the five fitted dials are listed for the end-of-Phase-3 checkpoint. The alternative, declaring this acceptance a checkpoint, would either replace the end-of-Phase-3 look or add a third; either is an amendment to `calibration.md` §7, named here. Under it, step 10 would first ingest 2025 at a stated nflverse revision, then score every graded row and falsifier on it once; a miss would stop the flip; and the design that follows may not cite 2025 evidence for any tunable (`calibration.md:165`).

**Gates:** the fantasy-advisor review at this design review and again at acceptance (Charter D9; the fix moves sacks, scrambles, quarterback rushing and completions); `contracts-guardian` review of every petition; the Orchestrator's merge review, after the owner's word on each step. **The owner never merges.**

### 6.11 Step 11: the flip

*Kept from revision 1's step-11 row (`R1:393`), with revision 2's additions.*

**The default flip, in its own commit**, the only step that moves default play: baseline-0010; the knownTruth ladders and `docConformance` re-pinned with the owner's yes (default D8); **v1 to v7 under `legacy` equal the step-0 golden digests; the step-11 default stream equals step 10's accepted `pocket-1` arm, by digest; `pocket-1` frozen** (K3-07). **Revision 2 adds:** `pocket-1` is frozen with step 8a's two fixes inside it, so a legacy save keeps the per-quarter two-minute flag and the old goal-to-go distance to its end (default D10, §9); every new dial enters `DEFAULT_TUNABLES` in this commit and not before (§12); P16, the doc catch-up, is asked here; and the owner's word comes before the Orchestrator merges. **The owner never merges.**

### 6.12 After this fix

In this order, each its own design with its own petitions:

1. **The interception design**, right after this fix (the owner's ruling of 2026-10-23 19:19Z), measured on the fixed pocket. This fix hands it: the guard read by throw class and its numbers (§8); the question of whether movement should change who is trailing (default D25); the `unseen_defender` kind, kept for it (§4.8); and the causes already traced outside the pocket, tipped balls going to the fastest reactor and window credit that does not follow the ball (`INTDOC`).
2. **Then the fumble design** (question 18, Later), first of the two by **default D30** because it is short and reads only fields this fix writes (`CM` T13): `QB_HIT`'s approach, from and seen, and the credit to the man actually there. It needs a spec rule first (none gives a trigger, target or modifiers; `sim/runPlay.ts:14-23`, ADR-010:141-150 calls it "a design-doc gap, not a contract gap"), Ball Security for quarterbacks (an applicability petition: SKILL only today, `contracts/src/registry.ts:116`, `:55`), a FUMBLE event, recovery, FUMBLE in `PossessionCause` and `DriveResult` (`events.ts:189-196`), and the fantasy-advisor gate (all as cited at `TM` §3.9). Its real anchors: strips per 100 credited sacks, edge 14.0, DB 12.3, interior 7.6, off-ball LB 7.7 (§2.4).
3. **Then the hot-throws and outlets design** (question 13, Own design): post-snap hot throws and sight adjustments (revision 1's P8a `hot_sight` and P8b `ROUTE_CONVERTED`, with an ADR-022 amendment lifting its refusal, `ADR-022:317-322`); who the checkdown is and more than one outlet (reopening the owner's 16 October ruling, `target-share-finding.md:75`, `:83-84`); a receiver coming back to him and routes converting when he moves (hot-route rules, which ADR-022 refuses today; receivers breaking toward his side by their lane are built in this fix, §4.6 e); and a progression that can skip a jammed man (F3.3). The owner may swap 2 and 3.
4. **ADR-077's check-release is switched on only once this fix passes acceptance** (the standing rule; a miss accepted under option B is not a pass unless the owner rules by name that it is, §6.10), not after either later design (`TM` §3.9: "not a gate on ADR-077"); revision 1 recorded that its own question 7 is still unruled (`ADR-077-design-note.md:3`).
5. **Re-measure** ADR-073 step six, ADR-076 and F3.5 on the fixed pocket.

---

## 7. Contract petitions, one by one

Each needs the owner's **typed yes naming it** (Iron Rule 2), **asked at the step that needs it**: the Orchestrator puts the one edit and its reason to the owner in plain words, the owner types a yes naming that petition (for example "yes P6"), `contracts-guardian` reviews it, and only then does `packages/contracts` change. **Every edit is its own petition** (V2-13). A kind used at two steps is asked once, at its first step, naming every use, so the one yes covers them (`CM` T22). Revision 2 renumbers the petitions in the order they are asked; the "was" column gives revision 1's number, or the reader that proposed a new one.

| id | was | edit | file | asked at | needed | note |
|---|---|---|---|---|---|---|
| **P1** | P1 | `SaveFile.playedWith` gains `engineRules?: string` | `contracts/src/save.ts:43` | step 0 | yes (default D10) | The ADR-078 R1 amendment-1 precedent: carrying on cannot quietly switch to other rules. Absent means `legacy`. **Not `rules`** (K2-05): the save already has `rules?: LeagueRules` (`franchise/src/save/save.ts:39`) and `rules` names the league rules in `season/main.ts:135`, `:159`. **Franchise code changes under this petition**, by `franchise-engine`: `MakeSaveInput.playedWith` (`franchise/src/save/save.ts:41`), `readSave`'s check (`:124-125`), and a test that a save without the field loads as `legacy`. |
| **P2** | P7 | `CheckKind` gains `"pass_rush_beat"` | `contracts/src/events.ts:96-126` | step 1 | **yes, in every case** (both shapes are built at step 1) | Shape S's once-per-rep draw, and the late block's draw for a touched man (step 3, on `beat/<rollRef>` of his pickup or stunt CHECK, §4.4.2): **one yes names both uses**. Its `RollDetail` for a uniform rather than a d100 is confirmed by `contracts-guardian` (INFERRED). |
| **P3** | P11 | `CHECK.roll` becomes optional **for `checkKind: "pass_rush_tick"` only**; absent means the band comes from the beat clock whose `pass_rush_beat` roll `rollRef` names; **the description names the push window's two ticks** (§4.1.1) | `contracts/src/events.ts:243-273` | step 1 | **yes, in every case** (K2-03) | Under shape S the per-tick CHECK has no die. Its readers are listed in §4.1 (R1-04) and the typed yes covers that list. `contracts-guardian` may prefer emitting no per-tick CHECK under S, with consumers deriving bands from the beat; either way those readers change at step 1. |
| **P4** | new (two-moments model, its P12) | `RUSH_THREAT.payload` gains `approach?: RushApproach` (FREE, ARC, THROUGH, PUSH, BLOCKED; a named type, also used by P7) | `contracts/src/events.ts:282-291` | step 1 | yes | Written only under `pocket-1`. Without it every consumer re-derives the label from the move, the margin and the origin (`TM` §6; risk R20). |
| **P5** | new (free-runner reader, its P15) | `RUSH_THREAT.payload` gains `distanceYards?: number` and `closingSpeed?: number`, on every origin | `contracts/src/events.ts:282-291` | step 3 | **optional, advised** | So debug text, calibration and the viewer read one distance rather than re-deriving it from the snap spot (`FR` §8); `closingSpeed` is the trip's average speed, get-off included. One payload widened, both fields named in the one yes; `contracts-guardian` may ask for it as two. |
| **P6** | P2 | `CheckKind` gains `"arrival_contest"` | `contracts/src/events.ts:96-126` | step 4 | yes | Light, pre-approved category (`docs/design/contracts.md:360`), still a petition. **One yes names all three uses:** the contact, the second arrival, and the dodge (`:dodge`, step 7). |
| **P7** | P3, widened | New event `QB_HIT { qb, rusher, phase: "ARRIVAL" \| "THROWING" \| "SHED", contactSeconds: number, rollRef?: string, approach?: RushApproach, from?: "FRONT" \| "SIDE" \| "BEHIND", seen?: boolean }` | `contracts/src/events.ts` | step 4 | yes | The gap noted at `maps/spec.md:81`. A throwaway with a hand on him is ARRIVAL and a caught escape that sheds is SHED (INFERRED; `contracts-guardian` checks the phases, `CM` T18). `seen` is true until step 7. The fumble design reads approach, from and seen (§6.12). |
| **P8** | P4 | `THROW.payload` gains `releaseSeconds?: number` | `contracts/src/events.ts:357-363` | step 4 | yes (question 6, Now) | The ball's continuous release time, so time to throw reads the motion from the stream. Absent under `legacy`. |
| **P9** | P5a | `ThrowawayCause` gains `"OUT_OF_POCKET"` | `contracts/src/events.ts:170` | step 6 | yes (question 9, Real rule) | That union is "CLOSED at two" and a third path is a widening petition (`:168`). Also the throwaway at the deadline after a clean break-out (§4.6 f). **The same yes widens `THROWAWAY.rollRef`'s documentation** (`:374-378`, today "The `pocket_movement` CHECK behind a `POCKET_DURESS` throwaway") to name the deadline pick's CHECK behind an `OUT_OF_POCKET` throwaway (settle). `CLOCK_EXPIRED` keeps its meaning and its missing roll, so `engine/test/throwaway.test.ts:53` and `engine/test/statline.test.ts:187` stand; a throwaway at the alarm, must act or contact is `POCKET_DURESS` with its CHECK, as today (§4.7). |
| **P10** | P5b | `THROWAWAY.payload` gains `outsideTackleBox?: boolean` | `contracts/src/events.ts:373` (THROWAWAY) | step 6 | yes | Whether he was outside the tackle box when he threw it; grounding needs a position. |
| **P11** | new (two-moments model, its P14) | `QB_DECISION.payload` gains `direction?: RunSide` | `contracts/src/events.ts:346` (QB_DECISION); `RunSide` at `contracts/src/playcalls.ts:233` | step 6 | yes (questions 15 and 17) | **One yes names every use:** the escape, the clean break-out, and the slide (step 7). |
| **P12** | new (clean-pocket reader, its P15) | `CheckKind` gains `"scramble_drill"` | `contracts/src/events.ts:96-126` | step 6 | yes, **unless `contracts-guardian` prefers the no-edit form** | The drill's fresh rep per receiver at a break-out (§4.6 e). The no-edit form emits it as `man_coverage` or `zone_coverage` with a `:drill` label, and P12 is then withdrawn; the default is the kind, so readers counting route reps by kind do not count drill reps (INFERRED: which readers count those kinds was not checked, `CP` §4.10). `RoutePhase` already has `SCRAMBLE_DRILL` (`contracts/src/events.ts:184`). |
| **P13** | P6a | `CheckKind` gains `"pocket_sense"` | `contracts/src/events.ts:96-126` | step 7 | yes | Light category. **Named with its meaning:** three grades (EARLY, LATE, NEVER) in its band, keyed by rusher, re-rolled on `:return` (§4.8). |
| **P14** | P6b | `QbDecisionChoice` gains `"SLIDE_POCKET"` | `contracts/src/events.ts:185` | step 7 | yes (question 10, Yes) | Not `SLIDE`: `contracts/src/playcalls.ts:122` uses `SLIDE` for slide protection. **One yes names every use:** off a man straight through, off a bull rush to either side, on a clean expiry; once a play in all. |
| **P15** | new (two-moments model, its P13) | `QbDecisionChoice` gains `"SIDESTEP"` | `contracts/src/events.ts:185` | step 7 | yes (question 15, All) | Make him miss (§4.8). |
| **P16** | P10 | Doc catch-up: `docs/design/contracts.md` records every edit that landed | | step 11 | yes | Not a type change, but the spec must not lag the schema. |
| **P2r** | P7r | Removes `"pass_rush_beat"` | as P2 | step 5b | only if shape L wins | So no kind is left without a producer. |
| **P3r** | P11r | Reverts P3 | as P3 | step 5b | only if shape L wins | |

**Asking order:** step 0, P1; step 1, P2, P3, P4; step 3, P5 (optional); step 4, P6, P7, P8; step 5b, P2r and P3r only if L wins; step 6, P9, P10, P11, P12; step 7, P13, P14, P15; step 11, P16.

**Count under the answers:** 14 needed (P1 to P4, P6 to P11, P13 to P16), plus P12 unless its no-edit form is preferred; P5 optional; P2r and P3r conditional (`CM` §5). **Not proposed** (settle): a FIGHT choice in `QbDecisionChoice` (FIGHT is published as HOLD, §4.5; if `contracts-guardian` prefers one, it is a new petition asked by name at step 7); and the Mug arm's adoption, which would need a petition for `contracts/src/playcalls.ts:470-471` and `:573` (§4.4.3).

### 7.1 Explicitly not petitioned, and why

*Revision 1's list (`R1:537-546`), kept, with revision 2's additions.*

- **The rules version, its overlay digest and every new dial:** on `PLAY_START`'s engine payload, typed `unknown` (`events.ts:233`), written only under non-legacy rules.
- **Down and distance:** already in `MatchGameState` (`engine/src/types.ts:301-325`), engine-internal. **The period and the two scores** join it as optional engine fields (§4.9; INFERRED, `contracts-guardian` confirms at step 8a).
- **Rusher speed and path:** the arrival tick is published in `RUSH_THREAT.etaTick` as today; the snap-spot table, the ratings and the drop stay engine-internal and deterministic, with no die and no CHECK (§4.4). Putting the distance on the stream is the optional P5.
- **The drop floor and the drop:** derived engine-internally from the first read's depth class (§4.6), and the card's existing `dropDepthYards` read for free runners (§4.4.5); `OffensivePlayCall` is untouched.
- **ARRIVED:** already a `RUSH_THREAT` state.
- **New CHECK bands:** `band` is a free string and `margin` a number (`events.ts:243-270`).
- **The failed-scramble scoring rule:** a renderer rule over facts already on the stream (INFERRED; `contracts-guardian` confirms at step 6, and may prefer a stream field, which would be its own petition, §4.7).
- **The export file, the season `--out` file and the baseline identity:** calibration-owned.
- **Revision 2 adds** (INFERRED unless marked; `contracts-guardian` confirms each at its step): `pocket_movement` at the new call sites `:alarm`, `:contact`, `t<tick>:clean` and `t<tick>:deadline`, which publish today's STEP_UP, SCRAMBLE, THROWAWAY and HOLD choices: FIGHT at contact as HOLD (told apart by the `:contact` label and the `QB_HIT` that follows), the clean pick's MOVE as STEP_UP (SLIDE_POCKET from step 7, P14) and its ESCAPE as SCRAMBLE, and the deadline's RUN as SCRAMBLE (`TM` §6; `CP` §4.10; INFERRED that `contracts-guardian` accepts the mapping); the sense label keyed by rusher; the looper's side; the approach card's derivation (P4 only publishes it); the push window and the window bump (no die); the clean-expiry order and the restart of his reads; the side-aware drill's lane-against-side rule (every card already names each route's break lane); a throwaway at the alarm, must act or contact, whose cause is today's `POCKET_DURESS` with its CHECK as `rollRef`; and the two step-8a fixes, in the engine's game loop (`game/simulateGame.ts:193`, `:243`, `:292`, `:299`, `:724`) and play outcome (`sim/outcome.ts:60`, `:70`) (the flag's comment is engine-owned, `engine/src/game/types.ts:147`, CHECKED).

### 7.2 ADR, ruling and spec amendments, which are not contracts edits

Each with the answer or default that triggers it (`CM` §2):

- **ADR-059:** the margin's time profile; under shape S the per-tick die is not drawn; widened by the push window's two ticks (question 16).
- **`match-engine.md` §7.2 and the use of `tunables.ts:1398`:** the forcing rule becomes must act, per rusher (question 2, Half).
- **The July derivation of `pressureWithinSeconds`:** applied, not amended (question 3, Follows).
- **Not amended under the answers:** ADR-033 Ruling 1 limb (b) and the consequence paragraph at `match-engine.md:579-585` (question 1, Today); ADR-033 limb (a), backlog entry 76 and ADR-058's removal of a second won-rep channel (question 3 was not Past him).
- **ADR-049:** both channels ruled at once, as before.
- **ADR-030 and ADR-031:** the 1.5 s free runner is replaced, and ADR-031's speed term is built, with acceleration (question 4).
- **ADR-066:** the August halt's step 3 ("Geometry consumes snap position WHEN THERE IS ONE. Not before", `:639-644`) is **loosened for men on the free-run clock only, on the owner's answer to question 19 (Table now)**; under Wait, for down linemen only (question 4; §4.4.3). Everything else in the halt stands.
- **ADR-069 ruling 1 and ADR-073's invariant that physics never reads the shown rush** (`engine/src/types.ts:484-489`; `contracts/src/playcalls.ts:470-471`, `:573`): **not touched.** The table never reads a front look. Adopting the Mug arm, which runs only as information at step 3, would need the owner's yes and a contracts petition for that doc text.
- **ADR-060:** the automatic no-target sack becomes contact; the physical gate stays (question 5).
- **ADR-055:** the escape's direction and the catch by side (question 17).
- **ADR-056:** a third throwaway cause (question 9, Real rule).
- **ADR-061:** **not** touched; interior travel stays 1.0 s.
- **`calibration.md` §5.2 item 2:** the named exception for patience (question 11, Yes). **`calibration.md` §7:** only if the owner overrules default D7.
- **The two-minute flag's documented meaning** (`engine/src/game/types.ts:147`) **and the goal-to-go distance** (`sim/outcome.ts:60`, `:70`; `game/simulateGame.ts:243`, `:292`): step 8a (question 12, All; default D29).
- **`match-engine.md` §7.1, §7.2, §7.3, §7.4, §8.7, §8.8, §10.2**, and the engine comments at `tunables.ts:706-716`, `:730-734`, `:636-647` and `resolve/rushThreat.ts:88-136` (§4.4), and at `tunables.ts:1838-1851` ("Nothing on a play card says which side of the field a route runs to"), stale for the playbook's cards (`playbook/src/routes.ts:9-11`), amended at step 6 (§4.6 e).
- **No longer touched:** ADR-022 and the owner's 16 October checkdown ruling (question 13, Own design).

### 7.3 Moved to later designs, and dropped

- **To the fumble design** (§6.12): a FUMBLE event, recovery, FUMBLE in `PossessionCause` and `DriveResult`, Ball Security for quarterbacks, and an unseen rule for other carriers (`TM` §3.9).
- **To the hot-throws and outlets design** (§6.12): revision 1's P8a (`CheckKind` gains `"hot_sight"`) and P8b (a `ROUTE_CONVERTED` event), with the ADR-022 amendment.
- **Dropped:** revision 1's P9 (`elusiveness` applicability gains QB, `contracts/src/registry.ts:114`), because question 5 was answered By approach, not Elusiveness (default D11). The existing registry-illegal read of a quarterback's stored elusiveness on scrambles stays listed in §11, unruled.

---

## 8. Guards: interceptions held fixed, completion reported

*Kept from revision 1 (`R1:552-573`); revision 2 adds what else now changes which throws reach the interception rules, the readers' stand-in figures, and the guard read by throw class (default D28).*

**Held fixed** (the owner's ruling; interceptions get their own design right after this one, measured on the fixed pocket). **No edits** to the window credit (`resolve/qbRead.ts:115-142`), the tipped-ball rule, the contested-catch line, or the forced-throw bars (`tunables.ts:2248-2249`). **What does change what those rules see, stated (K4 D-INT-claim):** the contest replaces only the no-target sack, so it changes no throw; but the throwing motion (step 4) makes every throw leave `rho` later than its decision, and gives a throw hit inside `rho` the existing IMMEDIATE accuracy row with today's poise refund (§4.5). That is an existing input applied in a new situation, not an edit to an interception rule; it is priced alone on interceptions at step 4, and the owner's question 6 says so. The generated league's interception excess (6.8 in 100 aimed throws against a real 2.35) already has traced causes that are not the pocket: tipped balls going to the fastest reactor, and window credit that does not follow the ball (`INTDOC`).

**Revision 2 adds what else changes which throws reach those rules** (`CP` §4.8, `CM` §2): sight (a LATE threat costs a read at must act; a NEVER threat turns some desperation throws into normal-bar reads, §4.8); the throwaway at contact; default D23, which raises the bar of the throw after the checkdown look on a clean expiry to 30 and removes the desperation throw at the deadline of a clean break-out; the restart of his reads and the window bump, which add later throws at the normal bar, where higher openness also makes the passing-lane check rarer, because it is open only at openness 60 or less (`resolve/throwExecution.ts:237-244`; `tunables.ts:2308`; as cited at `CP` §4.8); and throws on the run after clean break-outs, today's worst class. Each is an existing rule meeting new inputs, never an edit to an interception rule, and each is priced at its step under the guard below.

**Reported in every arm, both leagues:** INT per attempt and per aimed throw, the forced-throw share, the INT-source mix, and completion per attempt and per aimed throw. **Revision 2 adds:** the same rows by throw class (below).

**Measured drift** (COMPUTED, INT per aimed throw; "mix-predicted" folds the real by-bin INT rates per aimed throw of §2.2, tick-aligned because these runs release on the decision tick, against each run's own release mix; K1 noted round 1 folded per-attempt rates against a per-aimed-throw measure):

| run | flat | gen | measured rise (gen) | mix-predicted rise (gen) | round 1's mix-predicted ratio (gen) |
|---|---|---|---|---|---|
| base | 2.17 | 6.80 | 0 | 0 | 1.00 |
| L, R = 8, free rushers as today | 2.62 | 6.81 | +0.01 | +1.23 | 1.87 |
| L, R = 8, late | | 7.16 | +0.36 | +1.33 | 1.92 |
| S, theta = 13, late | 3.05 | 7.67 | +0.87 | +1.42 | 1.94 |
| S, theta = 8, k = 3, late | | 7.80 | +1.00 | +1.41 | 1.94 |
| S, theta = 11, free rushers as today | 3.15 | 7.59 | +0.79 | +1.30 | 1.88 |

Across all 15 non-base runs (12 gen, 3 flat; R1-05) the mix-predicted rise is +1.13 to +1.42 on gen and +1.31 to +1.48 on flat; the measured rise is +0.01 to +1.00 on gen (shape S +0.77 to +1.00, shape L +0.01 to +0.47) and +0.45 to +0.98 on flat (re-computed in the settle, unchanged). **So the rise has the direction the longer hold predicts and is smaller than it: the release mix accounts for it, but does not prove its cause.** The sim's interceptions respond to release time far less than real ones do (measured ratio 1.00 to 1.15 on gen against a predicted 2.0 to 2.3).

**The readers' stand-ins** (REPORTED, `TOT` §12; no checklist, no sight; Appendix D): INT per aimed throw on gen is 7.51 at today's free-runner times, 7.59 under "Later", 7.47 under reading (c), 7.41 with every answered piece at the stand-in hold, 7.25 at a hold near real (7.46 with the supply cut by 30) and 7.76 with the supply cut at the stand-in hold; on flat 2.55 to 3.07. Every arm stays within about 0.3 of the today's-times arm (7.51), which is itself about +0.7 over today's game (6.80, §1), because every arm shares shape S at theta 11 and a stand-in hold (+0.9 to +2.0 s on his count; `TOT` §2, §4.3); so against today's game the arms run +0.45 to +0.96 on gen and +0.45 to +0.97 on flat (against 2.10, §1) (recheck). **On the clean bench** (REPORTED, `CP` §3.2, §4.8): desperation throws are 10.1% of gen dropbacks and carry 549 of 1,987 interceptions (19.0% each); removing them alone, if they became non-throws, would take INT per aimed throw from 7.82 to 6.39 on gen and from 2.93 to 2.67 on flat (INFERRED arithmetic); since D23 keeps the throws at 30 or more, that is an upper bound on its effect (settle); rank-pushed throws (the decision roll picking a lower man) carry 972 of the 1,987 at 20.9%; throws after an escape are intercepted 17.1% on gen.

**The guard (default D9; round 2 replaced round 1's ratio rule, K2-04, K3-08, K4 D-INT-guard).** **The additive mix rule:** in each arm, the rise in INT per aimed throw over base (same league, same seeds) may not exceed the rise the real per-aimed-throw INT rates predict for that arm's change in release mix, on the arm's own release clock. In the tested runs that allows about +1.1 to +1.4 points, a ceiling near 7.9 to 8.2 per 100 aimed throws on gen and 3.5 to 3.7 on flat; every tested arm passes, shape S with 0.4 to 0.6 points to spare. A rise beyond it **stops the step and comes back to the owner with the numbers, including a second seed set**; the owner decides whether to reorder anything (K3-09: round 1 sent the interception design first, against the 19:19Z ruling). **Why not round 1's ratio rule:** it multiplied the generated league's already inflated 6.8 by the predicted ratio of 1.82 to 1.97 and so allowed 12.4 to 13.2 per 100 aimed throws, a rule that could not fail (Charter: "a rule whose predicate cannot fail is not a rule", `ARCHITECTURE_CHARTER.md:3310`). **Why not a fixed +1.0 point:** shape S already sits at +0.8 to +1.0. **Why not an absolute NFL ceiling:** the generated league starts at three times the NFL for causes outside the pocket. Lowering the forced-throw bars (pkB, about +1.8) would be expected to break this guard (INFERRED, §4.6).

**Revision 2 refines it by throw class (default D28; `CP` §4.8, `CM` T8(f)).** D23's change to a whole class is up to the size of the whole allowance, so a league-wide reading could pass while throws on the run doubled their interceptions. So the additive mix rule is applied **to each class separately**: normal-bar pocket throws; rank-pushed throws; checkdowns; clean-expiry throws at the bar of 30 (settle); must-act desperation throws in a dirty pocket; throws on the run. Each class's rise over base may not exceed the rise the real per-bin rates predict for that class's own release mix, and **a fall in one class never offsets a rise in another**. The removed class is reported with its count and the interceptions it carried. Throws on the run are also reported against the real out-of-pocket rates (2.11% clean, 3.25% pressured, §2.4). A breach stops the step and goes to the owner with a second seed set, as D9 says.

**Completion is reported and never a success signal.** The pocket closes at most about a quarter of the completion gap (REPORTED, `maps/gaps.md:212-216`): 37.0 -> 38.1% flat and 36.4 -> 39.0% gen under an all-late probe, against a real 64.58% per attempt and 67.5% per aimed throw. Completion by pocket status becomes readable through step 0's new join row (§6.0). **Revision 2 adds:** the clean bench's checkdowns complete 49.8% against a real 86.4%, a catch and accuracy gap the checklist does not touch (`CP` §3.2, §4.12).

---

## 9. Replay, saves and exports

*Kept from revision 1 (`R1:579-584`), with the new labels and the step-8a fixes.*

- **Two rules bundles, named `legacy` and `pocket-1`.** A bundle is a tunables overlay plus the switch set; the engine entry point takes it; main's default stays `legacy` until step 11's flip commit. Mid-build arms are `pocket-1.s<step>`, recorded with the overlay's tunables digest; `pocket-1` is frozen at step 11 and never changes meaning after (K3-07, V2-29).
- **Callers are orthogonal to rules.** v1 to v7 keep their meaning. **Under `legacy`, every caller's stream is byte-identical to today's**, by name: no rules field on `PLAY_START`, no `releaseSeconds`, no `QB_HIT`, no new CHECK. **After step 11, a caller named with no rules plays `pocket-1`; reproducing a pre-flip stream needs `legacy` named as well** (precedent: ADR-073:2292, "a league pinned to v4 replays exactly"). So every replay path carries or defaults to the recorded rules: `season --load` reads `playedWith.engineRules` (absent: `legacy`); `export-game` records it; the baseline identity carries it; the `season --out` file gains caller and rules; and the news CLI's advice to play a season again names both. **Revision 2 adds:** under `pocket-1` the callers receive the corrected two-minute flag and goal-to-go distance of step 8a; their logic is unchanged, so they stay orthogonal to rules, and a legacy save keeps the per-quarter flag to its end (`CM` T12(a)).
- **New rolls fork new labels only:** `.../t<tick>/<rusherId>:contest`, `.../t<tick>/<rusherId>:contest2`, `.../t<tick>/<rusherId>:sense` (keyed by rusher in revision 2, §4.8), `beat/<rollRef>`. `fork` does not consume the parent (`contracts/src/rng.ts:52`), so an OFF build draws exactly today's dice. Under shape S with `pocket-1`, the per-tick jitter die is **not drawn**, a stream change recorded in the ADR-059 amendment and P3. **Revision 2 adds** `.../t<tick>/<rusherId>:return`, `.../t<tick>/<rusherId>:alarm`, `.../t<tick>/<rusherId>:contact`, `.../t<tick>/<rusherId>:dodge`, `.../t<tick>/<rusherId>:late` (the late block under shape L), `beat/<rollRef>` on a touched man's pickup or stunt CHECK (the late block under shape S), `t<tick>:clean`, `t<tick>:deadline` and `t<tick>:drill:<receiverId>` (`TM` §9 risk 6; `CP` §4.12). The push window and the window bump draw no die. Every label is keyed by tick and, where two could share a tick, by rusher or receiver.
- **Saves.** `playedWith: { caller, engineRules }` (P1). A save with no `engineRules` loads as `legacy` and keeps playing by it (default D10). Loading a save under other rules is refused, not converted; a save stamped `pocket-1.s<step>` loads only on the build whose overlay digest matches. `season --save` and `--load`, `export-game` and the baseline identity all carry the version. The step-8a fixes live inside `pocket-1`, so the save's rules name carries them.
- **Exports and the viewer.** The export file records the rules version. The viewer renders events only; new CHECK kinds, `QB_HIT`, and the new decision choices `SLIDE_POCKET` and `SIDESTEP` render as skipped unknown kinds rather than crash (INFERRED from `apps/game/src/playLog.ts:13-14`; `ui-layout` confirms at step 0). The play log's sack wording, and the credit to the man actually there, change at step 6 (§4.7). The News page needs no format change.
- **Determinism.** Same seed plus same rules version gives the identical stream; the determinism test asserts it per version (Iron Rule 4).

---

## 10. Conjoined mechanisms

*Kept from revision 1 (`R1:590-596`), with one item withdrawn and revision 2's pairs added (`CM` §2).*

Each is measured in three arms (each alone, joint), with what is already known:

- **The block clock and beaten-not-pressure are one mechanism on the pressure count and nearly additive on sacks** (relevant under shape L and question 1's alternatives). pkA flat (REPORTED): clock alone -20.4 points of pressure, beaten plus horizon alone -8.0, joint -53.7, an interaction of -25.3 points. A joint arm alone would hand one mechanism's effect to the other; step 1 carries five arms for that reason.
- **The block clock and unblocked-rusher timing pull two rows in opposite directions** (§4.4): together they decide whether the pressure curve and the hit supply can both land. This is WARNING 2.
- **The contest and the throwing motion** are separately priceable (the contest moves the sack share, the motion the hit count) and land in one step because the share cannot be graded without the motion.
- **The failed-scramble rescoring is priced alone**: +11.2 flat and +4.5 gen on today's game, +3.2 and +1.2 on a rebuilt pocket.
- **Sight and must act are now separable.** Revision 1 kept feel and the forcing rule as one mechanism, because feel mattered only by replacing forcing (`R1:596`). Under the answers, must act per rusher is built at step 2 with every threat registered, and step 7's sight changes only who is registered, so step 7 runs sight alone, the alarm alone and both.

**Revision 2 adds:**

- **The push window with question 1 Today and shape S:** one PRESSURE tick per 1-14 bull rush that breaks at 1.0 s or later (§4.1.1); priced by M1 and by S with and without the window at step 1.
- **The free-run clock with the alarm:** when a free runner arrives against when the alarm lets him react (§4.0, §4.4); the alarm stand-in turned some arrivals into dodges, escapes and contacts a second early (`TOT` §8.6).
- **Sight with must act:** a NEVER rusher does not make him act at half a second (§4.3, §4.8).
- **The contact choice with questions 9 and 12:** the throwaway at contact needs the real rule (step 6) and leans on the situation (step 8b).
- **The clean checklist with the count's deltas:** the reset moves clean release time too, so it is held at 1.0 s and reported alone (default D33).
- **The two-minute fix with the situation term:** the fix is priced alone at step 8a before step 8b reads the clock.
- **The side-aware drill with the escape direction:** the drill's lane bonus reads the side D15 picks, so both sit under the mirror guard M5 (§4.6 e; settle).

---

## 11. Implied scope

*Kept from revision 1 (`R1:602-616`), with the step-8a fixes taken out (they are in this design now) and revision 2's cells added (`CM` §2).*

The reasoning applies to these cells, which this ADR does **not** change. Each is marked `unruled` or given its home.

- **Run-game block reps:** the same decided-at-the-snap shape. `unruled`.
- **Coverage reps:** a route won or lost on a rep drawn once per play. `unruled`.
- **The pursuit clock after the pocket is vacated** (`resolve/scramble.ts:171`, ADR-055 §6). `unruled`.
- **Clutch:** a **trait** with no reader (`contracts/src/registry.ts:148`), the natural home of a situation term. `unruled`.
- **The `fumble` CheckKind with no producer** (`contracts/src/events.ts:124`): strips at the arrival are out of scope here and **scheduled to their own design after the interception design** (question 18, §6.12); this fix writes approach, from and seen on every `QB_HIT` for it.
- **Handedness and the blind side:** the contest and the sense roll would read it; there is no handedness in the sim. `unruled`. Default D12: no throwing hand in this fix.
- **`traitBonuses` generally** (`tunables.ts:183-186`): one specified-and-unread trait is fixed; the rest are not audited. `unruled`.
- **The attribute registry freeze:** the `release` read and the elusiveness question both touch it; so does **the existing read of a quarterback's stored elusiveness on scrambles** (`tunables.ts:2938-2950`), which `getAttr` does not stop (K2-08). `unruled`.
- **The sticks in target choice (F4.3):** `selectTarget` ranks on openness alone (`resolve/targetSelection.ts:42`). LATER, because it interacts with the interception design's window credit (§8.4 of the spec).
- **A progression that can skip a jammed man (F3.3):** **the hot-throws and outlets design** (question 13, §6.12).
- **ADR-074's motion (X5):** no dependency; any hot or slide rule keys on the post-motion formation and its lanes (ADR-074 §1).
- **Entry 110's review of the won-rep arrival times (requirement P4):** the won-rep travel table is unchanged (ADR-061), so its INTERPRETATION review stays open; LATER, with ADR-066's snap positions.

**Removed:** revision 1's "two-minute flag per period" and "goal-to-go" cell (`R1:607`): both are fixed at step 8a (§4.9).

**Revision 2 adds:**

- **Who the checkdown is, more than one outlet, a receiver coming back to him, routes converting when he moves:** the hot-throws and outlets design (default D24, §4.6). Receivers breaking toward his side by their lane are built in this fix (§4.6 e).
- **A receiver's rep position changed by his movement** (who is trailing): the interception design (default D25).
- **How often pickups are blown and stunt exchanges missed** (the supply of men nobody touched, WARNING 2): a protection design, named by the miss rule's option A. `unruled`.
- **The snap spot for everyone else, and his own deep drop into the edge rusher:** the August halt stands; the won-rep travel table stays (ADR-061) even though free runners now read the drop (question 19 decides free runners' spots; `TMP:37`).
- **The two-moments page's "for later" list** (`TMP:37`): a linebacker blitzing late when his man stays in to block; a back's chip block running out; an edge rusher his tackle runs past the pocket; both tackles giving ground at once; seeing ghosts (a nervous quarterback bailing from a clean pocket) as its own question if the owner wants it. **Not in our game:** contain and spy rushers, play action and bootlegs, hands in the passing lane (`TMP:37`; `TM` §11). `unruled`.

---

## 12. Inertness proof

*Kept from revision 1 (`R1:622-626`), with step 8a's fixes added to the algebraic list.*

No rate expectation at steps 0 to 10 (every step lands OFF); a **large** rate change at step 11.

- **ALGEBRAIC.** With the rules version `legacy`, every new branch sits behind a switch read from the bundle, every new dial lives in the `pocket-1` overlay rather than `DEFAULT_TUNABLES`, every new fork label is drawn only inside that branch, every new optional field and event is written only inside it, and `fork` does not consume the parent stream (`contracts/src/rng.ts:52`). So the dice, the bytes, the `docConformance` census and the baseline identity's `tunablesDigest` are unchanged by construction (K2-02). Shape L is additionally algebraic in time: `min(1, t/R) = 1` for `t >= R`, **which holds within a play only for R <= 6.0** (`clock.maxTick`). **Revision 2 adds:** step 8a's two fixes sit behind their own switches inside `pocket-1`, and the new labels (`:sense` by rusher, `:return`, `:alarm`, `:contact`, `:dodge`, `:late`, the late block's `beat/<rollRef>`, `:clean`, `:deadline`, `:drill:<receiverId>`) are drawn only inside the `pocket-1` branch, so `legacy` is unchanged by construction.
- **EMPIRICAL.** Per step: v1 to v7 by-name byte-identical streams at N = 50 per caller per league, `docConformance` at `fnv1a:365da48d`, and the knownTruth ladders unchanged. Spec edits describing `pocket-1` land as marked sections; if one nonetheless reddens `docConformance`'s doc-side check before step 11, that step re-records it with the owner's yes and says so (INFERRED risk).
- **BOTH**, for the OFF proof only. The ON arms carry explicit rate expectations and are not inert, which is why step 11 is its own commit, with its own replay proofs (§6).

---

## 13. Risks and mitigations

*Revision 1's risks (`R1:634-647`) are kept, with R1 and R7 rewritten for question 4 and R5, R10, R11 and R13 edited; R15 to R29 are new (`TM` §9, `CM` §2, `TOT` §11), and R30 to R32 come from the settle.*

| risk | mitigation |
|---|---|
| **R1 (rewritten). The hit count and the pressure clock cannot both land, through one channel: rushers nobody blocked** (WARNING 2). No setting of the readers' stand-ins passes sacks, the sack share, the 2.0 s bin and the quick share together (42 arms on two leagues, REPORTED, `TOT` §0). | Step 3's two-part check, with M8 filed at step 0, and the miss rule filed at step 0 (default D31, §6.10): a miss is classed (supply, timing or conversion) and taken to the owner with options A (a protection design), B (accept and report) and C (the owner's reading of "completely unblocked", (b) against (c)); an accepted miss leaves acceptance failed unless the owner rules by name that it passes. **No late block, uniform delay or refit of the free-run constants is ever a fallback for a man nobody touched.** |
| **R2. The block clock's scale is a new free parameter and sacks are sensitive to it** (R = 8 against R = 5 moves sacks 4.9 to 7.1, REPORTED). | Chosen at step 5b by a rule filed at step 0, on the hit curve's shape; never on sacks (ADR-061); re-run once after b in a filed order. |
| **R3. The hit curve may not tell the candidates apart.** | The separation test and the fallback are filed at step 0 (default D1); using the fallback moves the pressure curve from the falsifiers to the fitted ledger, and the report says so. |
| **R4. Nothing graded can be scored until step 5b.** | Warning 1; intermediate states never reach default play. |
| **R5. Interceptions rise with the hold; shape S already sits at +0.8 to +1.0 points.** | §8's additive mix rule (default D9), read by throw class (default D28), with its ceiling stated; a breach comes to the owner; the interception design next. |
| **R6. The knownTruth sack ladders (pass rush and pass block) fail their effect floors while sacks are low, and `docConformance` changes with the spec edits.** | Both re-recorded once, at step 11, with the owner's yes (default D8); directions must hold throughout. New dials stay out of `DEFAULT_TUNABLES` until then (§12). |
| **R7 (rewritten in the settle). The free runner's snap spot would come from a small table, ahead of the pre-snap phase the August halt waits for, which loosens the halt for free runners.** | It is the owner's call, question 19 (§15.2), not a default: Table now uses a placeholder keyed on position, the call's disguise and gap, for free runners only, replaced when the pre-snap phase publishes snap spots; Wait gives a spot to down linemen only. The halt stands for everything else; no front look is read; step 3's snap-spot arms wait for the answer (§4.4.3). |
| **R8. Spec and code disagree in places this ADR edits** (the gaining counter, the throwaway citation at `pocketMovement.ts:67`, the warning and the floor). | Every spec edit lands in the same commit as its code; the amendments are named in §7 with the answers that trigger them. |
| **R9. Saves continue under other rules.** | P1, and a mismatch on `--load` is refused; mid-build names carry their digest. |
| **R10. The scope grows to include progression pace** (backlog 2b). | Time to throw is in scope by the owner's 23 October ruling (default D2); progression pace beyond the count, the drop floor and the owner's clean-pocket checklist is not. |
| **R11. All the evidence here is mocks.** | Appendix B says what each mock is not, and Appendix D what each of the readers' stand-ins is not; step 0 reproduces every base row in engine code before step 1 is written. |
| **R12. Three sack readers drift apart.** | All three change in one step with agreement tests over a fixed corpus (§4.7). |
| **R13. The test runs' shape S formula was misstated in round 1, and the gen late-free-rusher S arm's sacks did not reproduce** (K2-01: 2.47 to 2.50 against 2.77; cause unknown). | §4.1 states the formula that ran; step 0 re-measures that arm on a second seed set as context only, because it is the uniform delay the owner's words replaced; step 3's check reads M8, not that arm. |
| **R14. Two release clocks, two comparators.** | §2.2's rule: tick-aligned while release is the decision tick, raw seconds once it is `releaseSeconds`; every report names which. |
| **R15. The push window raises pressure,** by one tick per 1-14 bull rush that breaks at 1.0 s or later. | M1 prices its ceiling at step 0, margins 1 to 4 apart (about 40% more reps, INFERRED); step 1 files "at most M1's count, sacks within 0.3"; the stand-in moved pressure +0.3 and sacks 0, with margins 5 to 14 only (`TOT` §8.4). |
| **R16. A bull rush comes only from inside linemen** (the card slots), so the sacker mix will likely stay interior-heavy. | The sacker mix is reported against its band, never pass or fail (default D34); a miss is a finding against the travel table (ADR-061), not a tuning target. |
| **R17. About 25 more chosen dials** (the two-moments model's 15, the free-run constants, the alarm moment, the clean pick's appeals, the situation term's form). | Each declared, shown to the owner with its value, pinned by the rules version and priced alone at its step; only the five dials of §6.10 are fitted, in the filed order. |
| **R18. Make-him-miss becomes free sack avoidance.** | Once a play, EARLY only, within 1.0 s, rolled, and the rusher comes back from behind; priced alone at step 7 with an agility probe. |
| **R19. More decision points mean more dice.** | Every label keyed by tick and rusher or receiver; roll accounting extended to each (§6, §9). |
| **R20. Two derivations of approach if P4 is refused.** | P4 is asked at step 1; if the owner refuses it, step 1 comes back with the re-derivation's cost before it lands. |
| **R21. Escape-side asymmetry.** | M5's mirror guard at steps 3, 6 and 7. |
| **R22. A caught escape as contact removes some of today's sacks.** | Priced alone at step 6; the credit goes to the man actually there. |
| **R23. More checkdowns may push the back's target share over its band** (`CP` §4.12). | The target-share falsifier watches it; the fix belongs to the hot-throws and outlets design. |
| **R24. Interceptions shift between throw classes** (default D23 removes a whole class). | The guard read by class (default D28, §8). |
| **R25. Step 8a's fixes move every caller's play mix under `pocket-1`.** | Their own sub-step, priced alone with by-name OFF proofs; `legacy` untouched. |
| **R26. The situation term has more weights than revision 1's.** | One set at four places, centred, fitted at step 10 to filed rows; P2S and time to throw by situation are its falsifiers. |
| **R27. When a beaten blocker's man reaches him decides 6 to 8 hits in 100 and whether the hit curve rises** (WARNING 3). | Default D21 filed at step 0, never chosen by a fit; the half-second reading runs as information only. |
| **R28. The half-second knife edge:** a tenth of a second in the free-run constants moves sacks by more than a point (§4.4.6). | The constants are filed at step 0 and never fitted; from step 4 a race between the throw and the hit is decided inside the tick (D21). A held ball's contact stays on the half-second grid, so the knife edge remains there (settle). |
| **R29. b cannot reach the real sack share on the continuous reading in any stand-in arm** (a ceiling of 24 to 36 against 44.6, `TOT` §8.3). | b's reachable range is reported beside its fit and its grid is never widened; a short share is a recorded miss, classed (iii) by the miss rule. |
| **R30. The side-aware drill is unpriced** (settle; no stand-in ran it). | Priced alone at step 6; its frame (break lanes against `RunSide`) is INFERRED and checked by the mirror guard M5. |
| **R31. A clean pocket never throws it away** (settle, from the owner's items 2 and 4), against a real 0.76 per 100 clean dropbacks thrown away in the pocket. | Reported from 5a; the clean-throwaway falsifier (at most 2.5%) is graded on the deadline throwaways from step 6; the alternative to D27 (HOLD and an in-pocket throwaway) needs a new throwaway cause and its petition. |
| **R32. The deadline pick follows the owner's item 4, not the data:** mobility decides run against throw away there, while real quarterbacks of both kinds who do not throw to someone mostly run. | Reported by mobility third at step 6; the alternative, Data, is one line to the owner (§15.2). |

---

## 14. What this design does badly, stated plainly

*Revision 1's list (`R1:653-664`), revised for the answers; items 13 to 19 are new (18 and 19 from the settle).*

1. **It is long:** twelve numbered steps (0 to 11), with steps 5 and 8 each in two halves, and nothing gradable for the first four.
2. **It introduces a new clock whose scale and the sack rate pull apart** (R2), and **the curve chosen to set it cannot be read until step 5b** (WARNING 3).
3. **The supply problem has turned over.** Revision 1 was short of hits under the block clock alone (4.9 to 7.0 hits-or-sacks in 100 with free rushers late). Under the owner's question-4 rule, men nobody touched arrive fast and are about twice as common as in the NFL, so at today's supply the totals are reachable only because such men make about twice their real share of the hits, while the 2.0 s check and the quick share fail; with the supply cut to about real, the clock passes and sacks fall short (WARNING 2; `TOT` §9). The fix for the supply is protection, outside this design.
4. **P2S is the row most likely to miss, and it is reported, not graded.** In revision 1's test runs it is 6.5 to 13.5 on gen for shape S (6.6 to 12.5 flat) and 4.1 to 8.6 for shape L, against 22.02 (or 15.46); the gen late-free-rusher S figures are REPORTED-UNREPRODUCED and K2's re-run is about 0.7 lower. The favoured run already shows the entry-104 pattern (§6.10).
5. **The quarterback-side steps carry many chosen numbers:** a reset time, a sight target, a shed delay, a release base, a drop floor, the alarm's lists, make-him-miss's window and more, against three fitted read-system deltas (R17).
6. **Scrambles collapse mid-build**: gen 6.44 -> 1.2 to 3.6 in revision 1's test runs (pkA A123: 0.84), flat 17.24 -> 3.1 to 7.8, recovering only at step 6, so the mobility signal is hidden for several steps.
7. **Completion barely moves** and cannot be used as evidence either way; the clean bench's checkdowns complete 49.8% against a real 86.4%.
8. **Nothing here fixes the generated league's interceptions**, which are about three times the NFL's.
9. **The quick-pressure share now runs high:** 57 to 81 in every free-run stand-in against a band of 30 to 55 (`TOT` §7). The uniform delay that kept it near real is the option the owner's words replaced.
10. **Under shape S the per-tick die stops being drawn**, a real stream change needing an ADR-059 amendment, a new CHECK (P2) and an optional roll on the per-tick CHECK (P3), whose readers reach the debug renderer and ADR-004's roll audit (§4.1).
11. **Shape S, the shape the test runs favour, raises interceptions per aimed throw by about a point**, inside the additive guard by 0.4 to 0.6 points.
12. **Under shape S with Follows, the pocket reads CLEAN for one half second after a rusher beats his man**, on 812 to 1,066 ticks per 272 games against today's 30 (§4.3), except on a 1 to 14 bull rush whose block breaks at 1.0 s or later, where the push window fills it.
13. **The sacker mix is expected to stay interior-heavy** on today's travel table (R16).
14. **The drill knows sides only by each route's break lane** (a receiver on his side or in the middle gets two burst steps, one on the far side), so a receiver coming back to him is not modelled, and **the window bump is a label, not a defender moving** (`CP` §4.12).
15. **The free runner's snap spot is a placeholder** (if the owner answers question 19 Table now) or today's set time for all but down linemen (if Wait), and the drop is the card's launch point, so under centre a man due at 1.5 s is about 0.2 s late (§4.4.5).
16. **Sight, the approach card and the alarm moment have no real check** (§2.5).
17. **Only two leagues and one or two seed sets stand behind every stand-in number,** and a gap under about 1 hit or 0.4 sacks between two of them is not a finding (`TOT` §4.5).
18. **The deadline pick follows the owner's words, not the data:** a pocket passer throws it away more after a failed drill, while real quarterbacks of both kinds, when they do not throw to someone, mostly run (about 88 in 100 of runs and throwaways) and mobile ones differ by breaking out more often (§4.6 f, R32).
19. **A clean pocket never throws it away**, where real quarterbacks do 0.76 times in 100 clean dropbacks (§4.6 c, R31).

---

## 15. Questions and defaults

**All 18 owner questions are answered (2026-10-24), and one new question goes to the owner: question 19, whether the free runners' snap spots may come from a small table before the pre-snap phase exists (§15.2, `cards-r2.json`).** Revision 1 asked 14 (`R1:670`); the owner's two-moments message replaced question 5 with the contact card and added questions 15 to 18 (`NEWQ`, `TMP`). Every other fork the four revision-2 readers left open is settled here as an Orchestrator default (§15.3), each shown to the owner as one line that one word can overrule (§15.2, and the owner page `owner-r2.md`). The defaults stand unless the owner overrules one in the thread.

### 15.1 The owner's answers

The question column is each card's wording: for 1 to 14 as revision 1 filed it (`R1:678-691`), for 5 the contact card that replaced it, for 15 to 18 the two-moments cards (`NEWQ`, CHECKED). Cards marked \* were reworded after the two-moments message with their options unchanged (`QCH`, CHECKED). Every answer is dated 2026-10-24 and binds.

| # | question (card wording) | options offered | answer, 2026-10-24 | step | what it amends or rules (where) |
|---|---|---|---|---|---|
| 1 | Choose when a beaten blocker still in front counts as pressure: at once, after a while, or never? | Today / Heels / Past only | **Today** | 1 | Nothing amended: ADR-033 limb (b) and `match-engine.md:579-585` stand. With the push window (question 16) a 1-14 bull rush that breaks at 1.0 s or later now reads PRESSURE on the half second its block breaks (§4.2). |
| 2 | Force the quarterback to act when a rusher is half a second away? | Half / Second | **Half** | 2 | `arrival.collapsingWithinSeconds` 1.0 to 0.5, made per rusher as must act; amends `match-engine.md` §7.2 and the use of `tunables.ts:1398` (§4.3). |
| 3 | Choose how far away a loose rusher makes the pocket count as pressured? | Follows / Two seconds / Past him | **Follows** | 2 | Applies the July derivation, not an amendment: the warning becomes 1.0 s, a status only; ADR-033 limb (a), entry 76 and ADR-058 untouched (§4.3). |
| 4 \* | Turn a lost pickup into a late, bad block, not a free run? | Late block / Later / Today | **the owner's own words** (quoted below; none of the three options) | 3 | ADR-030 and ADR-031 (the free-run clock, with the speed term and acceleration); ADR-066 (its halt's step 3 loosened for free runners only under question 19's Table now, and for down linemen only under Wait, §4.4.3); the engine comments at `tunables.ts:706-716`, `:730-734`, `:636-647` and `resolve/rushThreat.ts:88-136`; `match-engine.md` §7.3, §7.4. Revision 1's late weak block is kept for touched men only (D19) (§4.4). |
| 5 | When a rusher gets a hand on the quarterback before he throws, how should the game decide what happens? | By approach / Elusiveness / One contest / Sack | **By approach** (the contact card, which replaced question 5) | 4 and 7 | ADR-060 (the no-target sack becomes contact); revision 1's P9 is dropped (D11) (§4.5). |
| 6 | Make a throw take a moment to leave, so he can be hit? | Now / Later | **Now** | 4 | No ADR amended; petitions P7 and P8; the existing IMMEDIATE accuracy row meets a new situation (§4.5, §8). Revision 1's note on "Later" is deleted. |
| 7 | Keep him looking when his count runs out on a clean pocket? | Keep / Throw | **the owner's own words** (quoted below), read as Keep, widened by the owner's checklist | 5a, 6 and 7 | Nothing amended; the owner's 16 October checkdown ruling stands; defaults D23 to D27 and D33 (§4.6). |
| 8 | Score a scrambler tackled at or behind the line as a sack? | Sack / Run | **Sack** | 6 | `match-engine.md` §8.8 (the rule written once, three readers agree), with credit to the man actually there (§4.7). |
| 9 \* | Use the real throwaway rule instead of today's two-second gate? | Real rule / Clock gate | **Real rule** | 6 | ADR-056 (a third throwaway cause, P9, and its flag, P10); also decides a throwaway at contact and after a clean break-out (§4.7). |
| 10 \* | Let him slide away from an inside rusher, as his own call? | Yes / Leash / No | **Yes** | 7 | Nothing amended (the Leash answer was not chosen, so ADR-072's ladder gains no rung); petition P14 (§4.8). |
| 11 | Let a patient quarterback hold longer and draw more pressure, and more sacks? | Yes / No | **Yes** | 7 | `calibration.md` §5.2 item 2: the named exception for patience in the pocket (§4.8; note below). |
| 12 \* | Choose what he weighs before hanging in: down and distance, or score and clock too? | Down / All | **All** (revision 1 recommended Down) | 8a and 8b | The two-minute flag's documented meaning (`engine/src/game/types.ts:147`) and the goal-to-go distance (`sim/outcome.ts:60`, `:70`), fixed at step 8a (D29); the situation term reads score and clock (D35) (§4.9). |
| 13 | Give hot throws after the snap and extra outlets their own later design? | Own design / This fix | **Own design** | after this fix | No longer touched: ADR-022 and the owner's 16 October ruling; revision 1's P8a, P8b and step 9b leave (§6.12, §7.3). |
| 14 \* | Approve the stepped plan: twelve steps, all switched off until one final commit? | Yes / No | **Yes** | all | The stepped plan of §6: steps 0 to 11, with 5 and 8 in halves, every step OFF with by-name replay proofs, one flip commit. |
| 15 | Should the quarterback get a first moment, the alarm, where he reacts to how a rusher is coming before he must act? | All / No dodge / None | **All** | 7 | Petitions P13 and P15, and the dodge use of P6 (§4.0, §4.8). |
| 16 | Should a bull rusher drive his blocker back for about a second before the block breaks, then reach the quarterback with the blocker still on him? | Yes / Pressure only / No | **Yes** | 1 | ADR-059's amendment widened by the push window's two ticks, BEATEN at t_b - 0.5 for every margin 1 to 14, as the card described; named in P3 (§4.1.1). |
| 17 | When he moves to one side, can a rusher on that side he has not seen get him, even one still in his block? | Yes / Beaten only / Today | **Yes** | 6 and 7 | ADR-055 (the escape's direction and the catch by side); petition P11 (§4.7). |
| 18 | When should your rule be built, that a ball carrier tackled by a man he never saw fumbles more often? | Later / Next / Now | **Later** | after this fix | Nothing here; every `QB_HIT` carries approach, from and seen (P7) for the fumble design, which follows the interception design (D30) (§6.12). |

**Question 4, the owner's answer quoted in full** (as in §4.4):

> "A completely unblocked rusher does not turn into a late block. It turns into a situation of their starting position (a rusher from the nose tackle position will be closer to the QB than a linebacker lining up on the outside), their acceleration and speed, how far back the QB is dropping, and if it's seen by the QB then at a certain point it initiates what we were calling our first forcing point where the QB recognizes that his pocket is breaking."

**Question 7, the owner's answer quoted in full** (as in §4.6; the owner's message carried links after each step, left out here):

> "Take this information into account for what QB's do when they have a clean pocket but no one is open: When a quarterback has a clean pocket but no receivers are open, it creates what coaches call a "coverage sack" scenario if it goes wrong. However, an elite quarterback has a strict checklist of options. They will usually transition through these actions in a split second: 1. Hit the "Checkdown": If downfield routes are blanketed, the QB will look for a running back or tight end sitting short in the flat. It may only gain 2 yards, but it avoids a turnover. 2. Manipulate with Pocket Movement: If there is no checkdown, the QB will not just stand still. They will climb up or slide sideways in the clean pocket to manipulate passing lanes. Even subtle movement can shift a trailing defender just enough to open a window. 3. Trigger the "Scramble Drill": If holding the ball inside the pocket becomes too risky, the QB will break out toward the sideline. This signals a structured Scramble Drill. Receivers instantly abandon their original routes and break into open space relative to where the QB is running. 4. Scramble for Yards or Throw It Away: If the scramble drill fails, a mobile QB will take the vacant green grass and run. A pocket passer will roll outside the tackle box and throw the ball safely out of bounds to preserve the next down."

**Note on question 11** (revision 1's note, `R1:693`, kept):

> **Note on question 11.** It writes a **named exception** to `docs/design/calibration.md` §5.2 item 2 ("better attribute -> better outcome, always"): real patience raises pressure with conversion flat, which raises sacks per dropback. The exception is scoped to the pocket and to patience; mobility's smaller weight is not an exception, because more mobility still helps. Every probe is reported either way, and §6.7's falsifier is written to match it. **It also reconciles the 23 October owner note** (`OWN:94`, "fix the ratings so poise and patience stop adding sacks", K3-20): under Yes, poise stops adding sacks (§6.7's poise probe), and patience stops adding them through conversion (P2S flat) but still adds them per dropback through more pressure; the owner file and card 11 say so.

Revision 1's note on question 6 "Later" (`R1:695`) is deleted: the answer is Now.

**Two answers carry a stated reading, told to the owner before the answer** (not new questions): must act's half second means a rusher he has registered, and an unseen man forces only by arriving (`TMP:107`, `TMP:47`; §4.3); and question 17's Yes card says only that an unseen loose man comes sooner on a slide, so a still-blocked man reaching him on a slide ("a step or two", `TMP:64`) is not added (`NEWQ` card 4; `CM` T16; §4.7).


### 15.2 Questions: one (question 19), and the one-line confirmations

**Answered 2026-10-25 01:37Z: Wait** (not the recommendation). Only down linemen get a snap spot, in their gap; every other free runner keeps today's set times until the pre-snap phase publishes real spots. Step 3 builds the Wait form, and M8 at step 0 is reported for Wait as the built answer and Table now as information only.

**One question went to the owner in this revision, as a card** (`cards-r2.json`; settle findings B1 and B2):

| # | question (card wording) | options | recommended | what each does |
|---|---|---|---|---|
| 19 | "Until the pre-snap phase exists, may a rusher nobody blocked start from a small table of typical snap spots, set by his position, how his blitz is disguised and his gap? In August you ruled snap spots come only from that phase." | Table now / Wait | **Table now** | Table now: question 4's clock runs at step 3 for every man nobody blocked, and the halt's step 3 is loosened for free runners only (§4.4.3, §7.2). Wait: only down linemen get a spot, which loosens the halt's step 3 for down linemen only (recheck); the other free runners keep today's set times until the pre-snap phase gives real spots. Step 3's snap-spot arms wait for the answer either way. |

**Why it is a question and not a default:** an Orchestrator default cannot amend an owner ruling, and the table takes a man's width from his gap before the pre-snap phase exists, which is the mapping the August halt stopped (`ADR-066:596-599`, `:639-644`); the free-runner reader said it "needs his word on a card" (`FR` §8).

**Every other fork the readers left open has a default with its reason** (§15.3, mapped in §15.4):

- the free-runner reader's four questions: F1 (snap spots) is question 19, F2 (who is completely unblocked) is D19, F3 (an arrival timed inside the half second) is D21, and F4 (fewer blown pickups and missed exchanges) is option A of the miss rule, offered only on a miss (D31) (`FR` §9);
- the change map's open items for the owner: D19, question 19, D32 with D13, D29, D30, the deadline's mobility split (§4.6 f) and the clean-pocket reader's six defaults, now D23 to D28 (`CM` §8);
- question 17's "a step or two" is read from the owner's Yes card (§15.1), and the owner's literal "no choice" on a never-seen arrival is an information arm at step 7 (`CM` T7).

**What can come back to the owner later, only on a trigger written in advance** (none is a question now): questions 1, 3 and 16 with the shape-L return package if shape L wins at step 5b (§4.1, §4.2); a miss, classed and priced under the miss rule (D31, §6.10), including whether an accepted miss counts as a pass; a breach of the interception guard (D9, D28, §8); the contest running before the forced throw, only if step 4 shows it is needed (§4.5); a separate FIGHT choice, only if `contracts-guardian` asks (§4.5); and each information arm (the literal "no choice", the read penalty counting only registered threats, the Mug arm, the narrower counter rule), only if the owner wants it.

**The one-line confirmations.** They are on the owner page (`owner-r2.md`) as the list of defaults, each with a one-word bracket that says what the other word does (after the recheck, line 1's "Every" sits in the page's free-runner paragraph). Each is answered with one word; the recommendation is the first word, and no answer is needed for the default to stand.

| # | the line to the owner | one word | recommended | if the owner picks the other word |
|---|---|---|---|---|
| 1 | "We read 'completely unblocked' as a man nobody got a hand on; a back or lineman who got a piece of him becomes a late, weak block, as card 4 described." (D19) | Keep / Every | **Keep** | Every: every free runner runs on the free-run clock, a touched man half a second later, as today (§4.4.1). Reading (a), only a man nobody was assigned to, is never offered: it would make a man nobody touched a late block (settle) |
| 2 | "What you called the first forcing point is what we call the alarm. Must act is question 2's half second, and the one-second pressured warning still follows it." (D13, D32) | Keep / Alarm | **Keep** | Alarm: the warning would hang on the alarm, which has no fixed time, so the warning comes back as its own question (§4.0, §4.3) |
| 3 | "Once the throwing motion exists, a race between the throw and the hit is timed to the tenth of a second, not rounded to the half second. The cost: on this timing no test run could make as many of the hits sacks as real (at most 24 to 36 in 100, real 45)." (D21) | Keep / Grid | **Keep** | Grid: the half-second reading, which can reach the real sack share but under which the hit curve cannot rise (WARNING 3, §4.5) |
| 4 | "The goal-to-go distance is fixed along with the two-minute flag, so 'distance' means the same thing on every snap." (D29) | Keep / Leave | **Keep** | Leave: on goal-to-go snaps the situation term reads the down only (§4.9) |
| 5 | "When his count runs out in a clean pocket, he throws only to a man at the checkdown's bar or better, the checkdown included, never a desperation ball to a covered man; then he works your checklist." (D23) | Keep / Allow | **Keep** | Allow: the desperation throw at 25 stays as the last throw before the checklist (§4.6) |
| 6 | "In a clean pocket he never just stands and never throws it away: after the checkdown he moves once, then breaks out; a rattled quarterback may break out first." (D27) | Keep / Hold | **Keep** | Hold: he may also stand and keep looking, or throw it away in the pocket, which needs a new throwaway cause and its own petition (§4.6 c) |
| 7 | "Who the checkdown is, extra outlets, hot throws, a receiver coming back to him and routes changing wait for the hot-throws design (your question 13). Receivers breaking toward his side, by each route's lane on the card, are built in this fix." (D24) | Keep, or the line to move | **Keep** | the named line joins this fix at the step §4.6's table gives it |
| 8 | "After a failed scramble drill, a mobile quarterback runs and a pocket passer throws it away, as your item 4 says. When real quarterbacks of both kinds do not throw to someone, they mostly run (about 88 in 100); mobile ones differ by breaking out more often." (§4.6 f, §2.4) | Keep / Data | **Keep** | Data: the throwaway gets the same Mobility and Improvisation terms as the run, so mobility no longer decides between them and the split follows the data |
| 9 | "After the interception design, the fumble design comes before the hot-throws design." (D30) | Keep / Swap | **Keep** | Swap: the hot-throws design comes second (§6.12) |

### 15.3 Orchestrator defaults (the owner may overrule)

**D1 to D10 stand as revision 1 filed them** (the Orchestrator's defaults, not the owner's) (copied unchanged from `R1:699-710`, its round-1 column kept). Section numbers in them are revision 1's and are the same in revision 2. **D9 is refined by D28** (the guard read by throw class), because D23 removes a whole class of throws (§8).

| # | default | alternative | reasoning and evidence | round 1 |
|---|---|---|---|---|
| D1 | The block clock is chosen on the **shape of the real hit-by-release curve** (aimed throws, raw seconds), with the pressured-by-release curve as the filed fallback | Choose on the pressured-by-release curve from the start | The hit flag is the official scorer's, with no definition argument (§2.1); the pressured curve is FTN's judgement, the comparison entry 93 retired as a grade. The sack rate is not offered: choosing a setting after seeing the sack rows is the post-hoc choice ADR-061 refuses (K3-25). | Q4 |
| D2 | **Time to throw is in this fix** | Fix the line only | **Already ruled:** the owner's 23 October ruling puts factor 1, which includes the internal clock, into this design. Evidence: with no rush at all our quarterback throws at 1.663 s flat and 1.799 s gen and throws away 20.63% and 11.13% (pkB, matched by K2). The alternative would reverse that ruling. | Q8 |
| D3 | **FTN 2023-24** is the timing source for this design's time-to-throw target (2.631 s), its release shape and its clean shape; the tier-1 row keeps 2.682 and is reported beside it | NGS (2.79-2.82 s) or the pooled 2.682 | Only FTN gives the pressure and throwaway flags on the same plays as the release time (§2.2). **This is the same kind of source choice (FTN alone over pooled figures) as entry 173, PR #33, which the owner held on 2026-10-24 00:18Z;** the owner file says so, and neither file guesses at the hold's reason (R1-16). This default does not depend on the hold. The acceptance bands barely differ (2.24-3.03 against 2.28-3.08). | Q9 |
| D4 | The **QB-season P2S spread is a pass-or-fail check** at acceptance, 2.5 to 4.5 pp | Report it only | It is not a dial; it is judged once (K3-22). Real 3.56 pp (61 QB-seasons, FTN 2023-24); ours 6.48. It is what the owner sees in the franchise: a bad passer should look worse, not like another sport. | Q13 |
| D5 | **Grade on hit-or-sack**; the charted pressure rate is reported in every arm, never pass or fail; P2S is reported against both 22.02 and 15.46 and never graded | Grade on charted pressure, or on both; either would also make P2S a graded row, against main's 15.46 while PR #33 is held | Hit-or-sack is definition-free (14.71%, 2022-24); entry 93 retired charted pressure as a grade; the test runs show the two counts pulling apart (Warning 2), so grading both risks recording a correct build as a failure. Dropping P2S from grading removes any dependence on PR #33 (K3-06). | Q19 |
| D6 | The **generated league decides**; the flat league is measured in every run and must move the same way | Flat decides, or both | Half the fix is about ratings, which the flat league cannot show; the flat league scrambles on 17 in 100 against a real 5 and a third of its sacks are caught escapes (`maps/gaps.md` item 7). | Q20 |
| D7 | **Wait:** 2025 stays unopened until the end-of-Phase-3 checkpoint; acceptance runs on 2022-24 and fresh seeds | Declare this acceptance a checkpoint and open 2025 once | It follows `calibration.md` §7 as written ("end of Phase 3, then before v1 ship", `:165`). The alternative amends §7 (a third look, or replacing the Phase-3 look), needs 2025 ingested first, and after a miss the next design may not cite 2025 (K3-17; round 1 recommended Now). | Q21 |
| D8 | **Re-record the pass-rush and pass-block ladder floors and `docConformance` once, at step 11**, with the owner's yes; directions hold throughout | Keep the floors | The floors were recorded at 16 sacks in 100; mid-build sacks are 2 to 6. New dials stay out of `DEFAULT_TUNABLES` until step 11, so the census does not move earlier (K2-02). | Q22 |
| D9 | **The additive mix rule** for interceptions (§8): a rise in INT per aimed throw may not exceed the rise the real per-bin rates predict for the arm's release mix; a breach stops the step and comes to the owner | A fixed +1.0 point line; or any rise | Round 1's ratio rule could not fail (it allowed 12.4-13.2 per 100 aimed throws on gen, from 6.8). The additive rule allows about +1.1 to +1.4 (ceiling about 8 on gen), passes every tested arm, and would catch lowering the forced-throw bars. A fixed point already sits at shape S's +0.8 to +1.0; any rise blocks the longer hold. The interception rules stay untouched and their design comes next, on the fixed pocket. | Q23 |
| D10 | **Old saves keep the old rules**: a save with no rules name plays `legacy` to the end; loading under other rules is refused | Refuse old saves; or warn and convert | The ADR-078 R1 amendment-1 precedent for callers. Needs petition P1's typed yes and franchise save-code edits (§7). | Q24 |

**D11 to D35, new in revision 2.** D11 to D16 are the two-moments model's (`TM` §10, same numbers); the rest come from the four readers, as the source column says.

| # | default | alternative | reason and evidence | source | where |
|---|---|---|---|---|---|
| D11 | The hit reads **strength and agility**, not elusiveness | Elusiveness (a contact-card option the owner did not pick), with a registry applicability edit (revision 1's P9) | The owner answered By approach. `contracts/src/registry.ts:114` lists elusiveness for RB, WR and TE only (CHECKED in revision 1); strength and agility is the registry-legal reading and adds no second unlisted read | `TM` §10 | §4.5 |
| D12 | **No throwing hand**: the blind side is the side he had not checked | Add handedness (a new attribute and its petitions) | No field records a throwing hand (grep of `packages/contracts` and `packages/engine`, recheck; `tunables.ts:711-714` declines to key travel on side), and there is no facing (`:2659-2660`) (CHECKED, TM) | `TM` §10 | §4.8 |
| D13 | The three moments are named **the alarm, must act and contact** | Call the alarm the forcing point, in the owner's question-4 words | Keeps question 2's "forcing point" meaning, so question 3's warning stays derived from a fixed horizon (D32) | `TM` §10; `CM` T3 | §4.0 |
| D14 | **The contact choice is one ranked pick**, the same roll as his other reactions, between FIGHT and THROWAWAY, reading his ratings, the approach and the situation term | A fixed rule ("throw it away if the expected margin is below b") | That rule had its sign inverted and would almost never fire (`TM` §3.8); the ranked pick reuses `resolve/pocketMovement.ts:157-207` with no new kind | `TM` §10 (revised) | §4.5 |
| D15 | **He moves away from the side of the threat that set off the reaction**; ties go away from the nearest registered threat, then toward the side with fewer card rushers, then by the movement roll's raw d100 parity | No direction (today) | Needs no new die and is mirror-balanced; question 17 reads the side he moves to; published by P11 | `TM` §10, §3.7 | §4.7 |
| D16 | **A lineman looping across the centre counts on his partner's side**, the side he loops to | His own aligned side | That is where he arrives; the owner's card said so (`NEWQ` card 4); M5 reports how often it moves a side | `TM` §10 | §4.0, §4.7 |
| D17 | **Moved to question 19 in the settle (§15.2): it is the owner's call, not a default.** What the card offers: free runners start from a small snap-spot table keyed on position, the call's disguise and gap, a placeholder for the pre-snap phase; no front look is read; ADR-066's August halt stands for everything else | Wait: only down linemen get a spot; the other free runners keep today's set times | The owner's question-4 words came after the halt and ask for a starting position, but a table taking width from the gap before the pre-snap phase is the mapping the halt stopped (`ADR-066:596-599`, `:639-644`, CHECKED); the free-runner reader held that it needs the owner's word (`FR` §2.3, §8). Revision 2's first claims that it "follows ADR-066's sequencing item 3" and "states the halt rather than lifting it" are withdrawn: item 3 (`ADR-066:251-257`) is the plan the halt replaced, and it put the blocked path first | `FR` D-F1, §2.3; `CM` T5 | §4.4.3 |
| D18 | **The Speed and Acceleration conversion and the free-run constants are filed at step 0 and never fitted:** 40 time 5.6 - 1.38 x Speed/99; tau 0.77 - 0.007 x (Acceleration - Speed), clamped 0.63 to 0.91 s; get-off 0.35 s; reach 1.0 yd; bend 1.1; loop +0.5 yd (the DELAYED wait and the creeper's 3 yd/s are rows of question 19's table, §4.4.3; recheck) | Fit them to the totals | A get-off of 0.25 s instead of 0.35 moves sacks from 3.60 to 4.75 in 100 (COMPUTED by FR, `FR` §5.3), so fitting them would quietly fit the sack rate (`TOT` §11.2); `derive.ts:19-28`, `:30-50` (CHECKED, FR) | `FR` D-F2, §3.3 | §4.4.4 |
| D19 | **"Completely unblocked" means nobody laid a hand on him:** UNBLOCKED, BLOWN_UP and LOOPER_FREE run on the free-run clock, and every rule keyed on that clock (D20's alarm timing, the +10 contact tilt, no throwaway at contact) covers all three, the looper labelled THROUGH included; RAN_THROUGH and LATE_EXCHANGE are revision 1's late, weak block | (c) every free runner on the clock, a touched man +0.5 s. Reading (a), nobody assigned to him, is never offered: it would make a man nobody touched a late block (settle) | The engine's own tables draw this line (`tunables.ts:579-584`, CHECKED; `sim/preSnap.ts:509-511`, CHECKED, FR); priced as stand-ins, reading (b) gives hit-or-sack 9.09 to 9.27, sacks 3.55 and a 2.0 s bin of 46.97 (REPORTED, §4.4.1). The change map read a touched man as keeping today's +0.5 s (`CM` T4, `CM` §8 item 1), which is reading (c) for him; this design follows the free-runner reader's (b) and keeps revision 1's late block where the owner's words do not reach (§4.4.2) | `FR` D-F3, §6; `CM` T4 | §4.4.1, §4.4.2 |
| D20 | **A man on the free-run clock seen EARLY (all three D19 origins, whatever his approach label) sets off the alarm on the first tick he is within 1.0 s**, never at the snap | At the snap | The owner's "at a certain point"; 1.0 s is the Follows warning and the make-him-miss window | `FR` D-F4, §5.4; `CM` T6 | §4.0 |
| D21 | **From step 4 a race between the throw and the hit is decided inside the tick:** a free runner at his free-run time, a beaten blocker's man at his breaking time T_j plus his travel (under shape L, his crossing time, §4.1). A held ball's contact stays on the half-second grid. Filed at step 0, never chosen by a fit; `etaTick` keeps its meaning | The half-second grid reading (an information arm only) | The two readings differ by 6 to 8 hits in 100, and only the continuous one lets the hit curve rise (REPORTED, `TOT` §8.5). The cost: on this reading b's ceiling is a sack share of 24 to 36 against 44.6 (`TOT` §8.3) | `FR` D-F5; `TOT` §8.5 | §4.4.6, §4.5 |
| D22 | **The drop is the card's `dropDepthYards`** (5.0 shotgun, 7.0 under centre) | A drop derived from the first read's depth class | It is the field that says how far back he is when he throws (`contracts/src/playcalls.ts:174-205`, CHECKED, FR); under centre it makes a man due at 1.5 s about 0.2 s late (INFERRED, `FR` §4) | `FR` §4; `CM` T5 | §4.4.5 |
| D23 | **On a clean expiry the throw after the checkdown look goes only to a man at 30 or better** (today's pool and decision roll, the checkdown competing in it as today; men below 30 taken out), **and no desperation throw at the deadline of a clean break-out** | Keep the desperation throw at 25 as the last throw before the checklist | On the gen clean bench desperation throws are 10.1% of dropbacks and 19.0% of them are intercepted (REPORTED, `CP` §3.2); the owner's checklist has no throw to a covered man. Keeping the checkdown in the pool leaves the owner's 16 October ruling and `sim/passPlay.ts:1084-1088` as they are (settle) | `CP` §4.11 C1 | §4.6 |
| D24 | **The split of question 7's checklist:** the order, the restart, the move and window, the break-out, the drill with its side by each route's break lane, and run-or-throw-it-away are in this fix; who the checkdown is, extra outlets, hot throws, a receiver coming back to him and routes converting go to question 13's design; a rep's position goes to the interception design | Any line moved (the owner may overrule each) | The quarterback's own clock is in this fix by the 23 October ruling. Every card names each route's break lane (`playbook/src/routes.ts:9-11`, CHECKED in the settle), so the drill's side needs no field positions; the rest needs outlets or hot-route rules that ADR-022 refuses today (§4.6's table) | `CP` §4.11 C2, §4.7 | §4.6 |
| D25 | **The window bump and the drill's fresh rep write openness only**, never the rep's position | Write the position too | The passing-lane and catch rules read the position (`sim/passPlay.ts:1476-1490`; `resolve/catchResolution.ts:41`, `:90`; CHECKED, CP), and interceptions are held fixed | `CP` §4.11 C3 | §4.6 |
| D26 | **A spent count or a spent read list starts the checklist** | The count only | With the count only he stands idle once his reads are spent (`sim/passPlay.ts:966`, `:1026-1029`, CHECKED, CP) | `CP` §4.11 C5 | §4.6 |
| D27 | **The clean pick is MOVE or ESCAPE only, on today's appeals at urgency 0** (MOVE 55 against ESCAPE 5, or 25 with the climb lane shut, at the 70 baseline), so a poised quarterback moves first and a rattled one may break out first; no HOLD and no in-pocket throwaway | Hold: HOLD and an in-pocket throwaway kept in the pick (a new throwaway cause and its petition); or a fixed order with no die | A fixed order makes every quarterback elite, against "a poised quarterback takes his best choice, a rattled one his second or third" (`TMP:49`); the owner's item 2 ("the QB will not just stand still") and item 4 (the throwaway after a failed drill, outside the tackle box) leave no HOLD or in-pocket throwaway. Arithmetic from `tunables.ts:1456-1545` and `resolve/pocketMovement.ts:96-108` (CHECKED in the settle) | `CP` §4.11 C6 | §4.6 |
| D28 | **The interception guard (D9) is read by throw class;** a fall in one class never offsets a rise in another | D9 league-wide, as filed | D23's change to a whole class is up to the size of the whole allowance, so a league-wide reading could pass while throws on the run doubled their interceptions (`CP` §4.8) | `CP` §4.11 C4; `CM` T8(f) | §8 |
| D29 | **Step 8a fixes the two-minute flag (the halves only) and the goal-to-go distance before step 8b reads score and clock** | Leave goal-to-go as it is | The flag fires every quarter (`game/simulateGame.ts:193`, `:299`, `:722-724`; `game/types.ts:147`) and a first down inside the 10 is 10 to go with no goal line (`sim/outcome.ts:60`, `:70`), set again on a turnover in the game loop (`game/simulateGame.ts:243`, `:292`), so all three sites go through one helper (CHECKED); the owner's card named the flag (`OWNF:193`) | `CM` T12 | §4.9, §6.8 |
| D30 | **After the interception design, the fumble design (question 18) comes before the hot-throws and outlets design (question 13)** | Swap them | The fumble design is short and reads only fields this fix writes (`CM` T13) | `CM` T13 | §6.12 |
| D31 | **The miss rule,** filed at step 0 before step 3 runs: classes (i) supply, (ii) timing, (iii) conversion, (iv) unclassed (recheck); options A protection, B accept (the row stays a named miss; acceptance passes only if the owner rules so by name), C D19 against reading (c); one pass, then a stop | No rule filed; a miss handled case by case | No stand-in setting passes sacks, sack share, the 2.0 s bin and the quick share together (42 arms, REPORTED, `TOT` §0); filing the response first keeps it from being chosen after the numbers, and every branch keeps the owner's question-4 words | `TOT` §11.3; `FR` F4 | §6.10 |
| D32 | **Must act's half second is `arrival.collapsingWithinSeconds` itself;** question 3's warning derives from it, never from the alarm | A separate must-act dial | A separate dial would cut the July derivation loose from its anchor (`CM` T2) | `CM` T2, T3 | §4.3 |
| D33 | **The reset, `qb.resetSeconds` about 1.0 s, is chosen and reported alone,** never fitted | Fit it with the three read-system deltas | The reset moves clean release time too, so fitting both would fit one thing twice (`CM` T8(g)) | `CM` T8(g) | §4.6 |
| D34 | **The sacker mix is reported against its CHOSEN band** (edge 45 to 70, interior 12 to 32), **never pass or fail** | A falsifier | It is expected to miss on today's travel table (interior 82.5 to 91.2 today by credit rule, REPORTED, `TM` C2), a finding against ADR-061, not a tuning target | `CM` T19 | §6.0, §6.10 |
| D35 | **The situation term:** down, distance, score margin and time left in the half; one set of weights at four places; centred on the league's own mix; never reads patience; fitted at step 10 | Separate weights at each place | Centring keeps step 5a's fitted deltas valid, and one set keeps it one fitted dial (`CM` T12(e)) | `CM` T12(e) | §4.9, §6.10 |

### 15.4 The card map

**Revision 1's map, kept** (`R1:714`): Cards: Q1 -> 1, Q3 -> 2, Q2 -> 3, Q15 -> 4, Q5 -> 5, Q6 -> 6, Q10 -> 7, Q7 -> 8, Q11 -> 9, Q12 and Q18 -> 10, Q14 -> 11, Q16 -> 12, Q17 -> 13, Q25 -> 14. Defaults: Q4 -> D1, Q8 -> D2, Q9 -> D3, Q13 -> D4, Q19 -> D5, Q20 -> D6, Q21 -> D7, Q22 -> D8, Q23 -> D9, Q24 -> D10. (Here "Qn" is round 1's numbering.)

**Revision 2's additions** (`NEWQ`, `QCH`, CHECKED):

- the two-moments cards: N1, the contact card, replaced card 5; N2 (the alarm) is question 15, N3 (the bull rush before the block breaks) is 16, N4 (running into a man he had not seen) is 17, N5 (where the fumble rule goes) is 18;
- the two-moments model's defaults D11 to D16 keep their numbers;
- question 19 (the settle's snap-spot card) replaces default D17;
- the free-runner reader's defaults: D-F1 -> question 19 (was D17), D-F2 -> D18, D-F3 -> D19, D-F4 -> D20, D-F5 -> D21, and its question F4 -> the miss rule's option A (D31);
- the clean-pocket reader's defaults: C1 -> D23, C2 -> D24, C3 -> D25, C4 -> D28, C5 -> D26, C6 -> D27;
- the change map's tensions: T2 and T3 -> D32 (with D13), T4 -> D19, T5 -> question 19 and D22, T6 -> D20, T8(f) -> D28, T8(g) -> D33, T12 -> D29 and T12(e) -> D35, T13 -> D30, T16 -> §4.7 (nothing added), T19 -> D34;
- the totals reader's miss rule (`TOT` §11.3) -> D31.

---

## 16. Need, Proposal, Impact, Decision

**Need.** The pocket is wrong in four coupled ways, and the one row that looks close (P2S) does so by cancellation (revision 1, `R1:720`). The owner's answers add three moments to the pocket (the alarm, must act, contact), a physical clock for men nobody blocked, and the clean-pocket checklist (§R). The domains need these channels: a rules name on the save; the block clock's draw and an optional roll on the per-tick rush CHECK; how each rusher is coming, on `RUSH_THREAT`; CHECK kinds for contact and the dodge, for sight and for the drill; a `QB_HIT` event; a release time on `THROW`; a third throwaway cause and its position flag; a direction on `QB_DECISION`; two new quarterback moves; and the doc catch-up. `docs/design/match-engine.md` §7.1 to §7.4, §8.7, §8.8 and §10.2 motivate each (§7.2).

**Proposal.** The petitions of §7, each one edit with its own typed yes, asked at the step that needs it: **14 needed** (P1 to P4, P6 to P11, P13 to P16), **plus P12 unless `contracts-guardian` prefers its no-edit form**; **P5 optional, advised**; **P2r and P3r only if shape L wins** at step 5b. Revision 1's P8a and P8b move to the hot-throws and outlets design, and its P9 is dropped because question 5 was not answered Elusiveness (§7.3).

**Impact.**

- `engine` writes almost all of it: the block clocks and the push window, must act, the free-run clock, contact and the motion, the checklist, sight and the alarm, step 8a's two fixes in the game loop and the play outcome, the play state's period and score, and the debug renderer and roll-accounting tests that P3 reaches (§4.1, §6).
- `calibration` gains rows, benches, M1 to M9, the rules plumbing, the miss rule's split and the matching sack rule with its credit, inside ADR-012's permitted surface (§6.0); its `ladderOccupancy` census changes with P3.
- `franchise` changes in code under P1 only: the save type, its check and a test, by `franchise-engine` (K2-05).
- `apps/game` must skip the new CHECK kinds, `QB_HIT` and the new decision choices (`SIDESTEP`, `SLIDE_POCKET`) without crashing, and its play log adopts the failed-scramble sack rule and its credit at step 6 (`ui-layout`).
- `narrative` is untouched in code. `playbook` is untouched (the drop floor is derived, and free runners read the card's existing `dropDepthYards`). `attributes` is untouched: no registry change, because question 5 was not answered Elusiveness.
- **The fantasy-advisor** reviews at this design review and at acceptance, because box scores move: sacks, scrambles, quarterback rushing, throwaways, and sack credits going to the man actually there.

**Decision.** The owner's answers to all 18 questions are in (§15.1); the defaults of §15.3 stand unless the owner overrules one; **one question is open, question 19 on the free runners' snap spots (§15.2), and step 3's snap-spot arms wait for it.** **Next is step 0, which starts on the owner's word: it waits for the owner's answer on the branch card (a new branch, or PR #33's) and for P1's typed yes ("yes P1"), and not for question 19, which holds up only step 3 (recheck).** Each later step comes to the owner with its numbers and its petitions, each petition by a typed yes naming it, reviewed by `contracts-guardian`; the Orchestrator merges a step only after the owner's word on it. **Nothing is built before step 0's word, and the owner never merges.**

---

## Appendices A to C: revision 1's, copied unchanged

The three appendices below are revision 1's (`R1:730-1032`, the file's last line having no newline), copied without change. Read them this way:

- "I" and "my" in them are revision 1's author, and "the test runs" are revision 1's arms (Appendix B).
- Question numbers are revision 1's cards: 1 to 14 keep their numbers in revision 2 (§15.1), except that card 5 was replaced by the contact card.
- Petition numbers are revision 1's. Revision 2's are in §7's "was" column: revision 1's P1 stays P1; P7 is now P2, P11 is P3, P2 is P6, P3 is P7, P4 is P8, P5a is P9, P5b is P10, P6a is P13, P6b is P14, P10 is P16, P7r is P2r and P11r is P3r; P8a, P8b and P9 left the design (§7.3).
- **Every free-rusher row in Appendix B times men nobody blocked by today's table or by a uniform delay.** The uniform delay is now evidence for an option the owner's question-4 words replaced, never a candidate (§4.4). None of revision 2's new mechanisms ran in Appendix B: the alarm, sight in three grades, the push window, make-him-miss, the contact choice, the free-run clock, the clean-pocket checklist and the situation term. The readers' stand-ins of some of them are Appendix D.
- Appendix C ends with a short revision-2 entry, added below the copy.

## Appendix A: the judges' mustFix items, and where each is fixed

**Judge 1 (11 items).**

| # | item | fix |
|---|---|---|
| J1-1 | Contest reads elusiveness, which the registry grants RB/WR/TE only; measure P(sack) on real populations | §4.5: strength and agility; measured on 6,190 real arrivals (0.415 at b = 5); the boundary is a fitted dial; the literal reading offered as question 5's Elusiveness with P9, which would also legalise today's scramble read |
| J1-2 | Pocket realism at NFL holds not closed; name the step and pre-register; move free-rusher timing before step 4 | §4.1 and §4.4: shape S reaches the curve in the test runs (tick-aligned RMS 7.4 to 10.4, no bin above twice FTN); free rushers move to **step 3**; the falsifier is filed for step 5b (§4.1, §6.5) |
| J1-3 | The scale needs a scoreable, pre-registered anchor | §4.1 and §6.10: the hit curve's **shape**, aimed throws on both sides, by a rule filed at step 0, applied at step 5b once it can be read (Warning 3), re-run once after b in the filed fitting order, with the fallback of default D1 |
| J1-4 | Ask the ADR-049 and counter questions before step 1 | §15: the 14 before step 0; §4.2 rules on all four cells at once; question 1 comes back if shape L wins |
| J1-5 | Name the clock compared with NGS's 2.9 s; report the three tick distributions | §2.3: the first tick at PRESSURE or worse, which is the first non-CLEAN tick; §6.0 adds all three distributions |
| J1-6 | Grade the quarterback's clock on a clean bench against the real clean shape; forbid lowering the bars | §2.2's clean row (corrected, V1-06), §4.6 and §6.5a, with the bench restated for `pocket-1` |
| J1-7 | Price the failed-scramble rescoring as its own arm | §4.7, §6.6, §10: +11.2 flat / +4.5 gen on today's game, +3.2 / +1.2 rebuilt |
| J1-8 | `SLIDE_POCKET`, not `SLIDE`; the trait's +0.5 s budget | §4.8 and P6b; the budget term retired under the switch only |
| J1-9 | Any drop rule must name its data owner | §4.6: `dropDepthYards` is the launch point, so the floor is derived engine-internally from the first read's depth class; no data owner or playbook change is needed |
| J1-10 | Step 0 cannot require entry 173 merged | §2.1, §6.0: PR #33, held by the owner on 2026-10-24; P2S reported against both, never graded; nothing depends on it |
| J1-11 | One contest per threat with a second-arrival rule; rebuild the stale threat list | §4.5: once per threat; the second arrival defined (P = 0.85, its own label and closed-form test); list rebuilt (`sim/passPlay.ts:729`) |

**Judge 2 (10 items).**

| # | item | fix |
|---|---|---|
| J2-1 | The step-0 line bench breaks ADR-012 | §6.0: the uncensored bench lives in `packages/engine/test`; the clean bench is tunables-only; the one-threat bench uses the entry points; the permitted surface listed in full |
| J2-2 | The won-rep floor must key on a live WON_REP threat, be priced alone, be named as an amendment | §4.3: kept as question 3's "Past him", keyed on a live WON_REP threat, named as reversing ADR-033 limb (a) and entry 76, marked unpriced with a falsifier in §6.2; not recommended; the gap it would close is now counted (§4.3, §6.10) |
| J2-3 | Rename the petition to `SLIDE_POCKET` | P6b |
| J2-4 | Keep the margin reproducible from the stream | §4.1, §9: the rules version and its overlay digest on `PLAY_START`, only under non-legacy rules |
| J2-5 | Replace the hold proxies with a design-value arm; narrow the bands; grade gen first | §6.5b, with the pricing arms of steps 1 to 4 kept separate; 5b's bands are acceptance's shifted by the midpoints of the later steps' filed contributions, with the method and the full-interval alternative stated (settle, R1-03) |
| J2-6 | File which levers remove the pressure excess, price each alone, add a 2x-FTN falsifier | §4.1 (shape), §4.2 (heels: 7.1 to 13.5 points in pkA's runs, 16.6 in mine at a warning no answer offers, and four tick-aligned bins above twice FTN in every shape L run that keeps it), §4.3 (forcing point: about 3 points, pkA), §4.4 (free rushers: 9 points at the same setting); falsifier at §4.1 |
| J2-7 | Move the throwing motion next to the contest, continuous ETA | §4.5 and step 4, with `releaseSeconds` (P4) and `contactSeconds` on `QB_HIT` |
| J2-8 | State the contest's reads; keep the desperation bar unchanged | §4.5: the four reads; the contest replaces only the no-target sack, so the bar and every throw it gates are unchanged; the motion's effect on throws is stated in §8 |
| J2-9 | Choose the scale by a rule fixed before any sack row | §4.1: filed at step 0, mechanical at step 5b, re-run once after b; the ADR states that the mocks' sack rows are already open, so the protection is the filed rule, not blindness |
| J2-10 | Adopt keep-looking; keep the bars fixed | §4.6 |

---

## Appendix B: the measured arms (what I ran, and what it is not)

**What I ran.** Two scratch tests in the working copy at main `8b387f7`, `/tmp/claude-0/-home-claude-football-franchise/6c81441b-6f64-5504-9ead-dcff7a2b1f80/scratchpad/pocket/copy`: `packages/calibration/test/_pkdraft_contest.test.ts` (reads the stream and the roster snapshot with nothing patched, and computes the contest's analytic sack probability over the real arrival population) and `packages/calibration/test/_pkdraft_arms.test.ts` (the arm harness). **Both are deleted; `git status --short` in the copy is clean; no vitest process is left.** No test was run in either revision or in the settle; round 2 re-scored the saved outputs in `/tmp/claude-0/-home-claude-football-franchise/6c81441b-6f64-5504-9ead-dcff7a2b1f80/scratchpad/pocket/draft_out/` on both real grids with `python3 -I`, and the settle re-scored them again at full precision. **K2 rebuilt the arm harness independently** (`_pkRK2_arms.test.ts`, deleted) and its reproduction status is given below.

**Commands** (from `copy/packages/calibration`):

```
PKD_LEAGUE=gen  PKD_ARMS=base,J8,J8lp,J8lpP,J8lpPnc,J5lpP  <copy>/node_modules/.bin/vitest run test/_pkdraft_arms.test.ts
PKD_LEAGUE=gen  PKD_ARMS=H9,H11,H13,H8k3,H11nolp,H13lp1,H13lp15   (same)
PKD_LEAGUE=flat PKD_N=272 PKD_ARMS=<one arm per process; NODE_OPTIONS=--max-old-space-size=6144>
```

Generated league: `runRealSeason({seed:"pk-01", stopAfter: 2027 REGULAR_SEASON week 18})`, 272 games. **Flat league: the first 272 fixtures of the `generateSeeds("baseline-0001")` list**, `buildFlatLeague({teams:32})`, `SYNTHETIC_ROUND_ROBIN`, `FROZEN_TENDENCIES`; not the 496-game baseline-0009 corpus (V1-14). Caller v7 throughout. Gen base reproduces `maps/engine.md` (85.26 / 16.72 / 1.235).

**How behaviour was patched: `vi.mock` wrappers and `structuredClone` tunables copies only. No source edited, no `pnpm build`, no `Math.random`.**

- A wrapper on `resolvePassRushTick` applies either the gradual clock `round(min(1,t/R) * margin)` or the breaking time, then re-takes the band, the counter delta and the CHECK fields with the engine's own `bandFor` and `tierFor`. **The breaking time is the formula of §4.1 as it ran (K2-01):** `T = theta * exp(-beta * m/41) * E^(1/k)`, with `t0_lane` = 0, uncentred, beta 0.5 on the time scale (1.0 in hazard notation at k = 2), one exponential `E` per rep from a fork keyed on the rep's own roll label rather than a drawn die. The saved configuration records only `H: {theta0, k, beta}`; round 1's text described a centred hazard with weight 0.5, which does not reproduce the outputs.
- A wrapper on `sacksWithoutTarget` replaces the automatic no-target sack with a seeded coin at p = 0.5 (`createRng(seed, "pkdraft-contest")`); arrivals with a target still throw, as in the design.
- Tunables copies set: BLOCKER_BEATEN floor to CLEAN, the gaining and beaten counter deltas, COLLAPSING at 0.5 s (every non-base run) and PRESSURE at 1.0 or 0.5 s as labelled (1.0 is question 3's "Follows" with question 2's "Half"; 12 of the 15 non-base runs; the three labelled 0.5 s use a warning no answer offers), the stand-in hold (`qb.timeBudget.baseSeconds` +2.0, every `route.readySeconds` +1.0), and the free-rusher delays (unblocked pickup bands and non-passed-off stunt bands). Whether the extra delay was clamped at `freeRunnerPath.maxArrivalSeconds` (4.0 s) was not recorded; K2's clamped re-run gives 33.85 to 34.40 pressure at theta 11 late, unclamped 33.06.

**Run key.** `L` = gradual clock; `S` = breaking time (k = 2, beta = 0.5, as stated, unless stated). "Late" = pickups +2.5 s, loopers +2.0 s. Every non-base run carries the coin and the stand-in hold. Hits on thrown = "arrived, then threw" per dropback. Throwaway column shows in brackets the share of throwaways that were `CLOCK_EXPIRED`. **RMS** = attempt-weighted RMS distance from FTN's pressured-by-release curve over the first five bins, weighted by FTN's attempt shares on the same grid; **bins > 2x** = release bins from 2.0 s on above twice FTN; both tick-aligned, with the raw-second figure in brackets (K1-03), all re-scored at full precision in the settle (R1-06). Throws in the pressured curve include throwaways, on both sides.

**Reproduction status (K2).** Base rows on both leagues: exact. Shape S: reproduced within 0.1 to 0.7 under the stated formula, on pressure, hit-or-sack, release and first PRESSURE-or-worse (gen theta 11 today 43.22-43.59 / 13.00 / 5.89-5.92; gen theta 9 late 40.60 / 6.92 / 3.01; gen theta 13 late 29.83 / 5.06 / 2.27; flat theta 11 today 43.41 / 9.52 / 5.20; flat theta 13 late 30.17 / 3.48 / 1.92). **Not reproduced: the gen late-free-rusher S rows' sacks and P2S**, about 0.2 to 0.3 low on sacks and about 0.7 low on P2S at theta 11 (2.47-2.50 and 7.16-7.20 against 2.77 and 7.90) under every key; cause unknown. Those cells are **REPORTED-UNREPRODUCED** and no recommendation rests on them alone. Theta 8 with k = 3 and the shape L rows were not re-run in round 2. Noise (R1-09, re-read from `k2out/` in the settle): two beat keys moved pressure by 0.37 to 0.64, sacks by at most 0.05 and hit-or-sack by at most 0.13, under the uncentred and the centred forms; a second seed (pk-02), run only under the centred form, moved pressure by 1.06 to 1.34, sacks by 0.29 to 0.47 and hit-or-sack by 0.65 to 0.94 (`k2out/gen2-S11pair.json` against `gen-S11.json` and `gen-S11lp.json`).

**GENERATED LEAGUE, 272 games, seed pk-01:**

| run | pressure | hit-or-sack | sack | sack share | P2S | release | throwaway (clock-expired share) | scramble | INT/aimed | hits on thrown | first PRESSURE-or-worse | quick share | curve RMS | bins > 2x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base | 85.26 | 24.04 | 16.72 | 69.57 | 19.62 | 1.235 | 2.90 (62%) | 6.44 | 6.80 | 7.31 | 0.883 | 99.7 | 63.9 (63.3) | 4 (3) |
| L R8, free rushers as today | 65.30 | 12.07 | 5.64 | 46.69 | 8.59 | 2.577 | 13.90 (24%) | 3.36 | 6.81 | 4.52 | 1.931 | 55.2 | 42.8 (38.6) | 4 (3) |
| L R8 late | 57.56 | 4.99 | 2.38 | 47.64 | 4.10 | 2.657 | 14.27 (26%) | 1.24 | 7.16 | 1.81 | 2.443 | 29.9 | 36.3 (31.2) | 4 (4) |
| L R8 late, PRESSURE 0.5 s | 55.95 | 4.97 | 2.36 | 47.52 | 4.19 | 2.656 | 14.04 (26%) | 1.23 | 7.23 | 1.80 | 2.480 | 30.6 | 34.7 (29.9) | 4 (4) |
| L R8 late, PRESSURE 0.5 s, heels counter off | 39.35 | 4.87 | 2.31 | 47.41 | 5.81 | 2.674 | 14.08 (29%) | 1.22 | 7.27 | 1.86 | 2.720 | 26.1 | 18.4 (15.0) | 2 (0) |
| L R5 late, PRESSURE 0.5 s | 68.19 | 12.22 | 4.82 | 39.47 | 7.06 | 2.477 | 17.45 (15%) | 3.09 | 6.88 | 5.10 | 2.126 | 66.7 | 48.0 (43.5) | 4 (4) |
| S theta=9 late | 40.81 | 6.97 | 3.17* | 45.52 | 7.72* | 2.722 | 12.04 (37%) | 1.93 | 7.66 | 2.63 | 2.503 | 37.0 | 16.4 (13.0) | 1 (0) |
| S theta=11 late | 34.52 | 5.95 | 2.77* | 46.50 | 7.90* | 2.771 | 11.23 (47%) | 1.56 | 7.64 | 2.32 | 2.568 | 33.3 | 10.4 (7.3) | 0 (0) |
| S theta=13 late | 29.77 | 5.28 | 2.45* | 46.40 | 7.98* | 2.804 | 10.39 (54%) | 1.34 | 7.67 | 2.04 | 2.577 | 31.5 | 7.4 (5.0) | 0 (0) |
| S theta=8 k=3 late | 34.28 | 4.88 | 2.26† | 46.23 | 6.45† | 2.776 | 11.30 (43%) | 1.29 | 7.80 | 1.89 | 2.753 | 23.8 | 9.7 (6.7) | 0 (0) |
| S theta=13, pickups +1.0 / loopers +1.0 | 36.04 | 5.56 | 2.53 | 45.46 | 6.83 | 2.736 | 12.16 (44%) | 1.52 | 7.61 | 2.20 | 2.176 | 60.2 | 19.0 (16.7) | 1 (1) |
| S theta=13, pickups +1.5 / loopers +1.0 | 34.94 | 5.53 | 2.49 | 45.06 | 6.92 | 2.755 | 11.73 (47%) | 1.46 | 7.57 | 2.31 | 2.289 | 54.0 | 16.3 (13.7) | 2 (0) |
| **S theta=11, free rushers as today** | 43.72 | **12.75** | **5.95** | 46.67 | **13.48** | 2.694 | 11.30 (41%) | 3.63 | 7.59 | 4.90 | 1.743 | 71.1 | 24.0 (22.9) | 1 (1) |
| real | 30.17 | 14.71 | 6.56 | 44.6 | 22.02 / 15.46 | 2.631 | 3.54 | 5.12 | 2.35 | 7.1 | 2.9 (NGS) | about 41-45 | 0 | 0 |

\* REPORTED-UNREPRODUCED (K2, above). † Not re-run by K2 (R1-10): the same late-free-rusher family as the starred rows, so it carries the same caution, but no reproduction was attempted.

**FLAT LEAGUE, first 272 fixtures:**

| run | pressure | hit-or-sack | sack | sack share | P2S | release | throwaway (clock-expired share) | scramble | INT/aimed | hits on thrown | first PRESSURE-or-worse | quick share | curve RMS | bins > 2x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base | 86.93 | 19.73 | 16.18 | 82.03 | 18.62 | 1.246 | 5.59 (69%) | 17.24 | 2.17 | 3.55 | 0.879 | 99.8 | 69.0 (67.2) | 5 (4) |
| L R8, free rushers as today | 65.55 | 8.95 | 4.99 | 55.70 | 7.61 | 2.647 | 19.33 (37%) | 7.46 | 2.62 | 2.26 | 1.929 | 54.2 | 39.8 (35.5) | 4 (3) |
| S theta=13 late | 29.94 | 3.52 | 1.98 | 56.10 | 6.60 | 2.840 | 17.71 (66%) | 3.07 | 3.05 | 0.88 | 2.548 | 30.7 | 3.5 (2.8) | 0 (0) |
| S theta=11, free rushers as today | 42.88 | 9.72 | 5.34 | 54.89 | 12.45 | 2.738 | 17.19 (56%) | 7.75 | 3.15 | 2.56 | 1.673 | 73.5 | 20.8 (19.5) | 1 (1) |

The flat L R8 raw RMS recomputes to 35.54 both at full precision and against the printed real bins, so 35.5 stands (R1-13).

**Pressured share by release bin** (COMPUTED, gen; the sim's bins hold decision ticks: <2.0 = ticks 0.5-1.5, 2.0-2.5 = tick 2.0, and so on):

| run | the seven bins |
|---|---|
| FTN tick-aligned (the comparator) | 7.3 / 14.7 / 22.3 / 26.8 / 32.5 / 49.6 / 71.5 |
| FTN raw seconds (round 1's comparator) | 9.0 / 18.1 / 24.6 / 27.9 / 36.9 / 56.0 / 72.6 |
| base | 80.5 / 81.3 / 90.5 / 79.2 / 72.7 / 69.2 / 80.0 |
| L R8 late | 5.6 / 40.0 / 67.3 / 72.3 / 81.3 / 72.8 / 63.7 |
| L R8 late, heels counter off | 6.0 / 34.4 / 45.1 / 35.0 / 62.3 / 50.3 / 40.5 |
| S theta=11 late | 10.1 / 27.5 / 25.8 / 34.4 / 54.7 / 42.5 / 40.3 |
| S theta=13 late | 9.4 / 21.8 / 20.0 / 28.9 / 51.9 / 36.9 / 30.1 |
| S theta=11, free rushers as today | 31.7 / 53.8 / 36.6 / 30.0 / 34.6 / 35.1 / 35.0 |

**Hit rate on thrown balls by release bin** (COMPUTED, gen, per 100 aimed throws in the bin): base 10.4 / 9.9 / 1.0 / 1.4 / 0 / 0 / 0; S theta=13 late 5.7 / 5.9 / 0.4 / 0.6 / 0.4 / 1.6 / 0.6; L R8 late 4.6 / 2.8 / 1.0 / 1.6 / 1.2 / 1.9 / 2.0; real tick-aligned 1.9 / 5.4 / 9.7 / 10.6 / 12.7 / 15.3 / 18.0 (raw 2.7 / 7.1 / 10.6 / 11.0 / 13.8 / 16.1 / 18.0). In 16 of the 17 runs the first two bins hold the highest rates; the exception is flat base, whose 4-5 s bin, 0.07% of its releases, holds 8.3 (R1-12) (Warning 3).

**Determinism.** Shape S theta=13 on gen gave the stream digest `bf8996cc7ab6` in two separate processes; K2's harness gave matching digests in two processes too.

**The contest population** (COMPUTED, base gen, 6,190 first arrivals): rushers DT 5,694, OLB 203, DE 160, MLB 129, NT 3, CB 1; origins WON_REP/INTERIOR 5,787, PICKUP_LOST/INTERIOR 162, WON_REP/EDGE 118, STUNT_LOOPER 80, UNBLOCKED 29, PICKUP_LOST/EDGE 14. Rusher means tackling 49.3, speed 42.9, strength 80.5. Quarterback means strength 51.7, agility 62.5, elusiveness 48.4, mobility 59.3, release 68.6; every generated quarterback carries elusiveness, mobility and release as stored values.

**What these runs are NOT.**

- **Mocks, not engine code.** No engine tests, no roll-accounting audit, no CHECK events for the new rolls. The contest is a coin with no ratings and no shed delay, repeated per tick, on a per-game stream rather than per-play forks.
- **The breaking-time mock collapses pre-beat margins to at most 0 and post-beat margins to at least 15** (the reporting rule §4.1 now adopts), and it derives its resistance from the rep's roll label rather than drawing a die.
- **The stand-in hold is not the design's quarterback count.** It shifts every play by +2.0 s of budget and +1.0 s of route timing. In those runs 14.4 to 16.1% (gen) and 12.2 to 13.1% (flat) of releases come under 2.0 s, against a real 26.1% (17.0% on the tick grid), so the quick game is missing.
- **The free-rusher treatment is a uniform delay**, not the late weak block (§4.4).
- **Not measured by me in any form:** the structural won-rep floor, the forcing point alone (M3a's figures are pkA's), the rated contest and shed delay, the second-arrival rule, the motion, keep-looking, the drop floor, the real throwaway rule, `pocket_sense`, `SLIDE_POCKET`, the late weak block, path over speed, the by-down terms (K4 E-not-run).
- **No by-down rows** were collected.
- **One seed set per league, no confidence intervals.** Binomial SE for sacks on about 28,000 dropbacks is about 0.15 points before game clustering (INFERRED); K2's second seed moved sacks by 0.3 to 0.5.
- **"Release" is the decision tick**, not a throwing motion, and a mock ARRIVED is not a scorer's hit, so every comparison with FTN or NGS is by kind only, and on the tick-aligned grid.
- **Not run by me:** the knownTruth ladders, `docConformance`, the entry 170 and ADR-077 benches, callers v1 to v6, held-out seeds, controlled rating probes, the by-situation bench, or the official tier-1 fold (mine is a light fold to the same rules as `metrics/collect.ts`'s `foldGame`).

---

## Appendix C: the verification rounds (what each finding changed)

### Round 1

Every finding was checked; each held unless stated. "Code" = re-read at `8b387f7` that round; "outputs" = re-folded from `draft_out/*.json`; "recompute" = the verifier's own data-cache recompute, accepted and marked REPORTED.

| finding | check | action |
|---|---|---|
| V1-01 | code (`registry.ts:32-35`), outputs (`draft_contest.json`: elusiveness on every QB, mean 48.4) | Applied: the "reads 50" claim dropped; registry argument kept (§4.5, owner Q5, card 5) |
| V1-02, V1-03 | code (`passPlay.ts:1108-1114` before `:1178`) | Applied: today's throw-on-arrival described (§0, §1 item 5, §4.5); the contest replaces only the no-target sack; QB_THROWS_HIT dropped as a band, kept as `QB_HIT` phase ARRIVAL; the contest-before-throw alternative priced at step 4 |
| V1-04, V2-10 | outputs (cfg C 0.5 in every run) | Applied: M3a priced from pkA's A12 -> A123; §6.2 sack band widened to +0.1 to +0.9; heels price relabelled; owner Q3 corrected |
| V1-05 | outputs | Applied: same-setting pair H11nolp -> H11; theta step reported separately; delays labelled as pickup/looper pairs; §6.3 band re-derived |
| V1-06 | recompute | Applied: clean row added as the step-5a target |
| V1-07 | recompute | Applied: 7.1% on aimed throws, 8.1% with throwaways; the curve's population marked UNCHECKED (lifted in round 2, K1) |
| V1-08, V2-11 | outputs | Applied: per-league ranges 1.8-2.6 / 0.9 late and 4.5-5.1 / 2.3-2.6 at today's timing or R = 5; card 6 uses "0.9 to 5" |
| V1-09, V2-06 | outputs (re-folded) | Applied: shape S +0.8 to +1.0, shape L +0.0 to +0.5; "predicts almost exactly" replaced; guard proposal changed to the mix rule (replaced again in round 2) |
| V1-10 | the zeros were in a scratch record format, not engine output | Applied: the defect deleted; a calibration join row added (§6.0) |
| V1-11 | code (`collect.ts:766-776`) | Applied: both readers change together with an agreement test (§4.7, R12); round 2 added the third reader |
| V1-12 | code (`events.ts:282-291`) | Applied: no petition, by the stated reason (§4.4, §7) |
| V1-13 | code (`tunables.ts:836-839`, `:1030-1031`, `:534`, `:1353`) | Applied: §4.3 restated |
| V1-14 | outputs (272 games) | Applied: flat columns labelled; step 0 pinned to baseline-0009's 496 games |
| V1-15 | `git branch -a --contains 060c23c` | Applied (§2.1, §6.0) |
| V1-16, V2-01 (counts) | recompute | Applied: 1 of 2,097 (2023-24), 2 of 3,002 (2022-24), qb_hit on 0 of 3,002 scrambles |
| V1-17, V2-01 | code (`tunables.ts:2953-2955`; TECH §2) | Applied: our scrambles never lose yards; owner file and card corrected |
| V1-18 | `maps/realdata.md:289-309` | Applied: two seasons, 61 QB-seasons |
| V1-19 | `maps/realdata.md:277`; no by-down field in outputs | Applied: today's by-down sim rows stated; test runs marked not measured by down |
| V1-20, V2-03 | outputs (15% to 66%) | Applied: "a sixth to two thirds" |
| V1-21, V2-12 | TECH:112-113 | Applied: the bench named; league 7.7 against 6.8 |
| V1-22 | `maps/engine.md` | Applied: "about five in six" |
| V1-23 | outputs | Applied: owner glossary corrected |
| V1-24, V2-08 | ADR dates | Applied: "since ADR-058 (August 2026)" (round 2 replaced the "one won block" wording, K3-01) |
| V1-25 | code (`tunables.ts:93`) | Applied: identity only for R <= 6; R = 8 caps margins at 0.75 (§4.1, §12, step 1 proof) |
| V1-26, V2-07 | card order | Applied: cards in question order; each context opens "Question N of M" |
| V1-27 | `maps/engine.md:7` | Applied: 62.6 / 8.4 / 0 / 29 |
| V1-28 | each citation | Applied: `:729`, `tier1.ts:261`, `events.ts:96-126`, `gaps.md:51`, TECH:34, origin shares to `gaps.md:81-88` |
| V1-29 | recompute | Applied: 21.3 vs 22.4 (at least one blitzer) and 21.0 vs 22.5 (five or more rushers), named |
| V1-30 | code (`tunables.ts:1524`) | Applied |
| V1-31 | code (`registry.ts:148`) | Applied: a trait |
| V1-32 | ADR-012:52-73 | Applied: entry points added |
| V1-33 | outputs | Applied: §14 ranges replaced, with the run sets named |
| V1-34 | ladder order | Resolved by definition: the first tick at PRESSURE or worse **is** the first non-CLEAN tick |
| V1-35, V2-16 | outputs (every run carries the hold) | Applied: Warning 1 cites pkA A12 as REPORTED, and gives my runs' 2.0 to 6.0 |
| V1-36 | outputs | Applied: "in the theta = 13 run" |
| V1-37 | code (`tunables.ts:585`, `:632`, `:747-748`) | Applied (round 2 corrected `:632` to `:633`, K2-11) |
| V1-38 | ADR §4.7 | Applied: the patience question speaks of how often pressure becomes a sack |
| V1-39, V2-17 | pkB | Applied: +11.2 flat / +4.5 gen today; +3.2 / +1.2 rebuilt |
| V1-40 | outputs | Applied: card on keep-looking |
| V1-41 | code (`passPlay.ts:1116`) | Applied: "from two seconds on" |
| V1-42 | arithmetic | Resolved: a shed counts as a hit only on a play that ends in a pass attempt (§4.5) |
| V1-43 | `calibration.md:165`; cache 2022-24 | Resolved then; round 2 made it default D7, Wait |
| V1-44 | `maps/gaps.md:112-121` | Applied: "on the flat league" |
| V1-45 | code (`tunables.ts:630-634`); ADR-077 note | Applied: `t_e` a new dial; ADR-073 named as the precedent |
| V2-02 | §6.7 against the patience question | Applied: patience clause rewritten |
| V2-04 | Status line | Applied then; round 2: the 14 questions before anything is built |
| V2-05 | outputs (all 17 hit curves fall) | Applied: selection moved to step 5b, shape-only, with a filed fallback |
| V2-09 | outputs | Applied then; round 2 corrected the bins (K3-15, V2-09 again) |
| V2-13 | §7 | Applied then; round 2 reclassed P7 and split P7r (K4) |
| V2-14 | code (`events.ts:207-211`, `:357-363`) | Applied: rules field only under non-legacy; P4 `releaseSeconds`; `etaTick` keeps its meaning |
| V2-15 | GUIDE ruling; ADR-072:50 | Applied: the hot-throw question is Own design / This fix (step 9b); the "after" row puts the interception design first and gates ADR-077 on its own question |
| V2-18 | ADR §4.7 | Applied: the real rule allows some throwaways before two seconds |
| V2-19 | ADR §4.4 | Applied: option renamed Late block, marked untested; "three in ten" |
| V2-20 | owner file | Applied then; round 2 removed the "Hits" label collision by making both defaults |
| V2-21 | CLAUDE.md; ADR-073 precedent | Applied: "You never merge anything" |
| V2-22 | text | Applied: no em-dashes |
| V2-24 | §15 | Applied: "one tap" |
| V2-25 | cards and §6.10 | Applied: definitions and outcomes stated |
| V2-29 | §9 | Not applied in round 1; applied in round 2 (K3-07) |
| V2-31 | §4.5 | Applied: the boundary starts at 5 and is fitted; the unit test is the closed form |

### Verification round 2

Four checkers (K1 real data, K2 code and arms, K3 rulings and the owner, K4 completeness) re-checked the revision. Each open finding was checked by me against code, data or text at `8b387f7` ("code"), my own `python3 -I` recompute on the data cache ("data"), the saved arm outputs re-scored ("outputs"), or the documents ("text").

| finding | check | action |
|---|---|---|
| K1-03 (tick vs raw comparators) | data (tick-aligned pressured 7.3 / 14.7 / 22.3 / 26.8 / 32.5 / 49.6 / 71.5 reproduced), code (`tier1.ts:1055-1057`), outputs (every RMS and bin count re-scored) | Applied: §2.2's grid rule and tick-aligned rows; Warning 2's 14.7; §1's 7.3; §4.1, §4.4 and Appendix B tables tick (raw); §6.3 band 29.4; §4.2 "two, one marginal" |
| K1 (hit curve on aimed throws) | data (2.71 / 7.13 / 10.57 / 11.04 / 13.78 / 16.14 / 18.01, n 34,578) | Applied: UNCHECKED lifted; curve shape unchanged, so the selection rule stands; aimed throws on both sides named |
| K1-11 (entry 173 "pending the owner's yes") | text (task facts), `git branch -a --contains 060c23c` | Applied: §2.1, §6.0, Appendix A J1-10: held by the owner on 2026-10-24; nothing depends on it |
| K1-18 (NGS 2.9 s, 41-45%, SIS 10%) | text (`RES:135`, `:171`; `maps/realdata.md:190-191`) | Applied: marked REPORTED with URLs or INFERRED arithmetic; not presented as cache-checked |
| K1 notes (scramble seasons; pressure interval; by-down population; INT fold; clean shares' citation) | data (2,097 / 40,982 = 5.12%; by-down at 7-10 recomputed; INT per aimed by bin) | Applied: "pbp 2023-24"; "game bootstrap"; §2.3's 7-10-to-go row used by §6.8; §8 folds per-aimed rates; §2.2 cites the tick row sums |
| K2-01 (shape S formula) | text (K2's evidence; saved cfg records only theta, k, beta) | Applied: §4.1 and Appendix B state the time-scale, uncentred formula that ran; the gen late S sack and P2S cells marked REPORTED-UNREPRODUCED; R13; step 0 re-measures that arm |
| K2-02 (census and identity move at step 1) | code (`docConformance.ts:180`; pin at `docConformance.test.ts:223`; `identity.ts:120`) | Applied: new dials live in the `pocket-1` overlay until step 11 (§4, §6.0, §12, R6, D8) |
| K2-03 (no die but `CHECK.roll` required) | code (`events.ts:243-273`; `collect.ts:926-928`; `determinism.test.ts:378-379`) | Applied: petition P11 (and P11r); the reporting rule `min(0, m)` / `max(15, m)` defined; four consumers listed at step 1 (the settle added the rest, R1-04) |
| K2-04 (mix rule too loose) | outputs (re-folded: ratio 1.82-1.97, additive +1.13 to +1.48) | Applied: the additive mix rule (§8, D9), with its ceiling stated |
| K2-05 (P1 touches franchise; `rules` collides) | code (`franchise/src/save/save.ts:39`, `:41`, `:124-125`; `contracts/src/save.ts:43`; `season/main.ts:135`) | Applied: field renamed `engineRules`; franchise edits listed under P1 and §16 |
| K2-06 (1.5 s figure is unblocked; falsifier passes today) | text (MEAS:160-163, :192) | Applied: §4.4 relabelled with per-origin ticks; step 3's falsifier per origin (truly unblocked) |
| K2-07 (surface list; one-threat bench) | code (`harness/runGame.ts:11`; ADR-012:52-77) | Applied: the game-loop entry points named, their ADR marked UNCLEAR; the one-threat bench uses ADR-012 items 1-2, no new surface |
| K2-08 (QB elusiveness already read on scrambles) | code (`tunables.ts:2938-2950`; `ballCarrier.ts:436-442`; `registry.ts:32-35`) | Applied: §4.5, P9 and question 5 restated; the read listed in §11 |
| K2-09 (identity field must be optional) | code (`identity.ts:340-366`) | Applied: optional, absent = `legacy`, with a test that baseline-0009 reads |
| K2-10 (PR #33 wording) | as K1-11 | Applied |
| K2-11 (`:632`, `:2260-2264`) | code | Applied: `:633`, `:2265` |
| K2-12 (escape target) | code (`tunables.ts:1545`, `:1552-1553`; `scramble.ts:71`) | Applied: 50 + 10 per edge threat + 5 per urgency step (the settle corrected the line numbers, R1-11) |
| K2-13 (four bins; 4.9-7.0 range) | outputs | Applied: "four on gen and three on flat" on raw bins (four on both, tick-aligned); §14 item 3 range qualified (the settle re-scored the raw counts at full precision, R1-06) |
| K3-01 (Past him reverses limb (a) and entry 76) | code (`tunables.ts:1047-1117`), text (`ADR-033:34-38`; backlog 76 at `:4918-4935`; `ADR-058:3`, `:58-65`) | Applied: question 3 rebuilt as Follows / Two seconds / Past him, each disclosing the ruling it keeps or reverses; Follows recommended; Past him unpriced, not recommended, comes back if L wins |
| K3-02 (Heels reverses limb (b)) | text (`match-engine.md:565-587`) | Applied: §4.2 names the ruling; recommendation changed to Today, because the answer has no effect under shape S and no answer passes under L on the tick grid |
| K3-03 (Half also moves the 2.0 pressure warning) | code (`tunables.ts:1058-1069`, `:1117`) | Applied: the warning split into its own question (3), "Follows" named as applying the July rule |
| K3-04, K3-05 (stale #33 wording in owner file and ADR) | text | Applied: every PR #33 sentence rewritten to the hold |
| K3-06 (Charted/Both would grade P2S) | text | Applied: P2S never graded in this design (§2.1, D5); the alternative's consequence stated |
| K3-07 (by-name callers after the flip; `pocket-1` drifts) | code (`season/main.ts:105-113`, `:159`) | Applied: §9 (legacy must be named after the flip; every replay path), step 11 proofs, `pocket-1.s<step>` names, `pocket-1` frozen |
| K3-08, K3-09 (guard allowance; failure sent the INT design first) | outputs | Applied: additive rule with stated ceiling; a breach comes back to the owner |
| K3-10 (This fix changes the checkdown rule) | text (`target-share-finding.md:75`, `:83-84`) | Applied: §6.9 and question 13 say "This fix" reopens the 16 October ruling |
| K3-11 (owner cannot see the factors) | text | Applied: owner file section "Your four factors, and where each goes" |
| K3-12 (Q8 No and Q16 None reverse the 23 October ruling) | text | Applied: Q8 became default D2, stated as already ruled; None withdrawn from question 12 |
| K3-13 (Late block fallback differs) | text | Applied: §6.3, question 4 and its card all say the uniform delay is used and the owner told |
| K3-14 (yes/no lines on three-option questions; bundles) | text | Applied: each owner question ends naming its labels; patience asked alone (mobility not an exception); the hot-throw card states both parts |
| K3-15 (card 1 numbers) | outputs | Applied: "2 to 4 seconds on every generated-league run", "7 to 14 points", "sacks moved by under a quarter of a point" |
| K3-16 (shorthand) | text | Applied: registry, repo, Phase 3, fingerprint, roll kind, step numbers on cards replaced or explained |
| K3-17 (Now adds a 2025 look) | text (`calibration.md:165`) | Applied: default D7 Wait; the alternative names the §7 amendment and the post-miss rule |
| K3-18 (Run option unclear) | text | Applied: Run keeps today's start at the line (§4.7, question 8) |
| K3-19 (slide reads agility) | text | Applied: the slide's trigger reads awareness and the trait only; "agility" removed from the owner file |
| K3-20 (23 October note said patience should stop adding sacks) | text (`OWN:94`, "What it would take" item 3) | Applied: question 11, its card and §15.1's note reconcile it (poise stops adding sacks; patience keeps conversion flat and adds sacks per dropback through more pressure) |
| K3-21 (motion's accuracy penalty) | code (`throwExecution.ts:34-36`, `:106-110`) | Applied: the existing IMMEDIATE row with today's poise refund (§4.5); §8 restated |
| K3-22 (Q13 card does not match options) | text | Applied: Q13 became default D4 (a grading choice, no dial) |
| K3-23 (petitions bundled in the owner list) | text | Applied: every petition its own item in the owner file |
| K3-24 (50.6 KB, 25 cards) | text | Applied: 14 cards, 10 defaults, owner file under 22,000 characters |
| K3-25 (Sacks option breaks ADR-061) | text | Applied: Sacks not offered in default D1, with the reason |
| K3 classification | text | Applied with two changes: round 1's Q13 moved to a default (K3's reason, no dial, holds); Q25 kept as the last card, per the Orchestrator's restructure |
| J1-3 / J2-9 (anchor; fitting order; sim population) | text | Applied: §6.10's filed fitting order; selection re-run after b; aimed throws on both sides |
| J1-9 (drop table keys on the launch point) | code (`passConcepts.ts:106-114`; `playcalls.ts:186-205`) | Applied: the drop floor derived from the first read's depth class; no playbook change |
| J1-11 (second-arrival rule undefined) | text | Applied: defined in §4.5 with label, target, closed form and test |
| J2-2 (floor not priced before step 2) | text | Applied: marked unpriced, with a falsifier tied to it; not recommended |
| J2-5 (5b bands as wide as judged unfalsifiable) | text | Applied: 5b bands re-derived from acceptance minus later contributions (re-derived again, with the method stated, in the settle, R1-03) |
| V1-11 (third sack reader) | code (`apps/game/src/playLog.ts:7-9`, `:147-149`) | Applied: three readers, agreement tests, `ui-layout` at step 6 |
| V2-09 (card 1 bins) | outputs | Applied: 2 to 4 seconds |
| V2-13 (P7 is not conditional) | text | Applied: P7 and P11 needed in every case; P7r and P11r conditional; §16 counts |
| V2-20 ("Hits" label on two cards) | text | Applied: both questions are now defaults, named apart |
| V1-33b (§14.3 range) | outputs | Applied: as K2-13 |
| P1 (entry-104 pattern; Charted grading P2S) | outputs (S theta 13: 29.77 / 7.98) | Applied: P1(c) a reported falsifier with a consequence (§6.10); P2S never graded |
| P2 (quick share and origin) | outputs (`firstDirtyQuickShare`) | Applied: reported per arm (Appendix B), banded at acceptance, discussed in §4.4 and §14 |
| P4 (entry 107; entry 110) | text | Applied: entry 107's share reported (§6.0), expected to rise only under Past him; entry 110 placed in §11 |
| F1.3 (step-up falsifier) | text (MEAS:93; TECH:74) | Applied: §6.7 |
| F2.2 (ADR-031) | text (`ADR-031:116-119`) | Applied: named as amended; question 4 says the unblocked man's speed now counts |
| F2.3 (mobility probe in §6.6) | text | Applied |
| F3.3 (outlets and the 16 October ruling; progression skip) | text | Applied: as K3-10; progression skip placed in §11 |
| F4.3-X5 | text | Applied: §11 |
| D-step1 (L prediction at R = 8, arm at R = 5) | text | Applied: L runs at both; R = 5 reported, direction only |
| D-step4 (no band for the motion; arm unnamed; alternative's question) | text | Applied: 4 to 9 in 100; the today's-line arm named; the alternative comes to the owner only if needed |
| D-step5a (falsifier looser than band; bench recipe) | text | Applied: falsifier matches the bands on the rows the deltas do not touch; bench restated for `pocket-1` at step 3 |
| D-step3-6-9 (arms without predictions) | text | Applied: direction-only marks or bands |
| D-step10 (unfitted falsifiers without bands) | text | Applied: the band table of §6.10 |
| D-step11 (no replay proofs at the flip) | text | Applied: v1-v7 under `legacy` equal step-0 digests; the default stream equals step 10's arm; column renamed "ON-arm callers" |
| D-INT-guard | outputs | Applied: as K2-04 |
| D-INT-claim (the motion changes throws) | code (`events.ts:357-363`) | Applied: §8 restated; the motion priced alone on interceptions; question 6 says so |
| E-not-run | text | Applied: Warning 1 and the owner file say every prediction beyond the line's clock rests on unbuilt mechanisms; Appendix B lists them |
| E-sources-unread | text | Applied: `playLog.ts`, `ADR-031:116-119`, `passConcepts.ts:106-114`, ADR-074, entries 107 and 110, ADR-033's approved status, the #33 hold now cited where they bear; default D7 states the post-miss rule |

### Settle (round 3: the rechecks of the round-2 rewrite)

Each open finding of R1 (facts and code) and R2 (the owner's texts) was checked at `8b387f7` in the working copy ("code"), by `python3 -I` over `draft_out/*.json` and `k2out/*.json` ("outputs"), by a full-precision recompute of the real bins over the data cache ("data", 36,006 FTN 2023-24 attempts with a release time), or against the documents ("text"). No scratch test was written in the settle; the copy's `git status --short` is empty and no vitest process runs.

| finding | check | action |
|---|---|---|
| R1-01, R2-01 (every run used Follows) | outputs (cfg: J8lpP, J8lpPnc, J5lpP at P 0.5; the 12 other non-base runs at C 0.5 / P 1; base at C 1.0 / P 2.0) | Applied: "14 of the 17 runs" in §4.3, Appendix B, owner Q3 and card 3; §4.1 and §4.2 note that the Past-only and R = 5 runs used the unoffered warning |
| R1-02 (live WON_REP and CLEAN at most 30) | outputs (`k2out` diag `cleanWithLiveWon`: 1,020 on 1,019 dropbacks, 924 on 920, 812 on 805; today 30 gen and 60 per 496 flat); R1's re-measure 1,066 and 932 | Applied: the falsifier re-filed per shape (§6.10); §4.3 rewritten (one tick per affected dropback, about one dropback in 27); §14 item 12; owner Q3 and card 3 tell the owner. Follows still recommended |
| R1-03 (5b bands match no method) | arithmetic (interval [1.23, 6.09] / [6.5, 14.9]; midpoint [2.68, 4.64] / [8.5, 12.9]) | Applied: midpoint shift adopted and stated (sacks 2.7 to 4.6, hit-or-sack 8.5 to 12.9), interval version printed beside it, "cannot be narrower" dropped, "below 9" -> "below 8.5" |
| R1-04 (P11 readers incomplete) | code (`renderPlay.ts:379`, `:383`; `passPlay.ts:840`; `rollAccounting.test.ts:147`; `eventVocabulary.test.ts:131`, `:567`; `ladderOccupancy.ts:510-511`; `determinism.test.ts:197`, `:216`, `:325`; grep of every calibration `pass_rush_tick` reader for roll fields) | Applied: the full list in §4.1, §6.1, P11 and §16; the six calibration readers R1 left INFERRED read no roll field or no `pass_rush_tick` |
| R1-05 (16 non-base runs) | outputs (17 runs, 2 base) | Applied: 15 (12 gen, 3 flat); ranges re-computed, unchanged |
| R1-06 (gen L R8 today raw bins) | outputs and data (full precision: bin 3.5-4.0 is 73.83 against a limit of 73.84) | Applied: "4 (3)" in §4.1 and Appendix B; §4.2 "three or four" |
| R1-07 (flat base 60 per 272) | outputs (`flat-base-diag2.json`: 496 games) | Applied: 60 per 496, about 33 per 272 |
| R1-08 (92.4% and 26,034 of 28,128) | arithmetic (26,034 / 28,128 = 92.6%; 811 / 878 = 92.4%) | Applied: both stated with their own denominators (§4.4, step 3 proof) |
| R1-09 (noise line) | outputs (`k2out` seed and key pairs) | Applied: Appendix B noise restated with the measured ranges and the centred-form caveat |
| R1-10 (S theta 8 k 3 star) | outputs (no such run in `k2out`) | Applied: marked † "not re-run by K2" |
| R1-11 (four off-by-one cites) | code | Applied: `tunables.ts:1545`, `:1552-1553`; `playLog.ts:147-148`; `identity.ts:120`; `season/main.ts:135`; §3 updated |
| R1-12, R2-13(c) (first two bins highest in all 17) | outputs (flat base hit curve 5.96 / 6.46 / 1.65 / 0.59 / 0 / 8.33 / 0, 0.07% of releases in the 4-5 s bin) | Applied: "16 of 17" in Appendix B; Warning 3 qualified |
| R1-13 (flat L R8 RMS 35.6; shape distance 4.27) | outputs and data (35.54 at full precision and on printed bins; shape distance 1.10 to 4.18 against the aimed curve, 1.14 to 4.28 counting throwaways) | Refuted for the RMS (35.5 kept); the shape-distance range stated against both real curves (§2.2) |
| R1-14 (`t0_lane`; step-1 basis form) | text (designC: arm H theta 8, k 2.3, beta 0.8, m0 -6, t0 0, hazard form) | Applied: `t0_lane` defined (§4.1, Appendix B); §6.1 names the basis's form and marks the S band INFERRED |
| R1-15 (entry 76 "explicitly NOT re-derived") | text (`CALIBRATION-BACKLOG.md:4930`, `:4936-4938`; `tunables.ts:1058-1069`) | Applied: §4.3 quotes it and says why Follows is the derivation's own re-litigation route |
| R1-16 (D3 guesses at the hold's reason) | text | Applied: D3 states the hold and its date only, in §15.2, the defaults and the owner file |
| R2-02 (goal-to-go is a distance bug) | code (`sim/outcome.ts:64-71`; `game/simulateGame.ts:193`, `:299`; `maps/requirements.md:484`) | Applied: §4.9 (down only on goal-to-go snaps), §11, §5, step 8 proof, card 12, owner Q12 |
| R2-03 (owner Q11 hides sacks) | text | Applied: one-liner and question line name sacks |
| R2-05 (P2S "looks right") | text | Applied: owner glossary, §1, §16 |
| R2-06 (card 12 and card 1 questions) | text | Applied: both "Choose ..." wordings, in step with §15.1 |
| R2-07 (card 7 Throw; "per throw") | code (`passPlay.ts:1026-1029`, `:1108-1114`, `:1116`, `:1335-1342`) | Applied: card 7, owner Q7, §4.6 |
| R2-08 (ranges) | outputs | Applied (a) flat sack share 55, (b) 5 to 13, (d) "no answer we ran", (e) the Heels wording and M2c; kept (c) "7 to 14" because the 16.6 pair used the unoffered warning |
| R2-09 ("about 26"; card 9 reason; "real rule") | text (MEAS:155); code (§4.7) | Applied: "up to 26"; reason names time held; the stand-in named in card 9, owner Q9 and §4.7 |
| R2-10 (default paragraphs) | text | Applied: D1 wording; D3 per R1-16; D9 "3 to 4.4" |
| R2-11 (factors lack reasons) | text | Applied: a reason per factor in the owner file |
| R2-12 ("no judgement call") | text | Applied |
| R2-13 (a) (Later's consequence; b) the flip) | text | Applied: §4.1, §15.1 note, card 6, owner Q6; "Old games and saves keep their old rules" in the owner glossary |

### Revision 2 (2026-10-24, added to the copy)

The owner answered all 18 questions (§R, §15.1). Revision 2 was written from those answers, the two-moments model (`TM`) and four readers (`FR`, `CP`, `CM`, `TOT`), whose evidence is Appendix D. Its changes, section by section and with the reason for each, are in the revision-2 change log filed with this ADR (`changelog-r2.md`). Revision 2's writer ran no new arm.

### Revision 2's settle (2026-10-24)

Three checkers (rulings, code and data, plan) filed 53 findings against revision 2. Each was verified against the code, the readers and the data; all 53 held and were fixed, none was declined. The record, one line each, is `settle.md` beside this ADR, and the change log's settle section says what moved. The biggest: the snap-spot table became question 19 (B1, B2); the clean pick became MOVE or ESCAPE only (S2, F7, F9); the drill gained its side from each route's lane (code-data F6); the push window shows every 1 to 14 bull rush beaten (N2, plan F10); 5b's bands were re-derived (plan F8). The settle's one measurement is the quick-share floor (§2.4), `python3 -I` over `realdata/db.json`.

---

## Appendix D: the readers' evidence (revision 2), and what the stand-ins are not

**Revision 2's writer ran no arm.** Every revision-2 measurement in this design comes from one of five sources below and is tagged REPORTED with its source, except the settle's quick-share floor (§2.4) and the class (i) threshold arithmetic (§4.4.6), COMPUTED in the settle. Each ran in the working copy of main at `8b387f7` (`.../scratchpad/pocket/copy`), never in the repo; changed behaviour only through `vi.mock` wrappers and tunables copies passed in, never by editing source; drew every die from `createRng` forks of the game seed, never `Math.random`; and deleted its scratch test afterwards (each report says so; the commands and figures below are quoted from the reports, REPORTED).

**The writer's housekeeping check** (COMPUTED, 2026-10-24, before this appendix was written): `ls copy/packages/calibration/test/ | grep '^_rv'` printed nothing; `git status --short` in the copy printed nothing; `ls /home/claude/football-franchise/packages/calibration/test/ | grep '^_rv'` printed nothing; `pgrep -fa vitest` showed no test process. So the scratch tests the change map saw in the copy at 18:20Z (`CM` §8) are gone. The writer's own code reads (the facts tagged CHECKED without a reader's name) were made with `sed` and `grep` on the same copy.

### D.1 The free-runner reader (`FR`)

- **Today's arrival clock** (`FR` §1.2), a read-only fold of the event stream, from `copy/packages/calibration`:

  ```
  RV_LEAGUE=gen  <copy>/node_modules/.bin/vitest run test/_rvfree_measure.test.ts   # 32 s
  RV_LEAGUE=flat <copy>/node_modules/.bin/vitest run test/_rvfree_measure.test.ts   # 29 s
  ```

  gen is `runRealSeason({seed:"pk-01", stopAfter 2027 REGULAR_SEASON week 18 day 7})`, 272 games, 25,758 dropbacks.
- **The scratch arm** (`FR` §7.1). The harness was rebuilt from K2's saved source, recovered from its transcript (`/root/.claude/projects/-home-claude-football-franchise/6c81441b-6f64-5504-9ead-dcff7a2b1f80/subagents/workflows/wf_b0ddb9ad-a6c/agent-a797ee5a89f6749a5.jsonl`, lines 210 and 234): shape S, theta 11, k 2, beta 0.5, scale form, uncentred; the coin on `sacksWithoutTarget`; tunables copies with the BLOCKER_BEATEN floor CLEAN, gaining delta 0, beaten delta 1, COLLAPSING 0.5, PRESSURE 1.0 and the stand-in hold. The reader's wrappers: `simulatePassPlay` hands the drop, the look, the disguise and the stunts to the free-run wrapper, and `resolvePickups` and `resolveStunts` replace each free runner's `etaTick` with the model.

  ```
  RVF=1 RVF_LEAGUE=gen|flat RVF_ARM=S11|S11lp RVF_FREE=today|model|modelU|modelOU [RVF_REACT=0.25] [RVF_DROPMIN=7] \
    <copy>/node_modules/.bin/vitest run test/_rvfree_arm.test.ts      # about 52 s each
  ```

  `model` is reading (c), `modelU` reading (b), `modelOU` reading (a).
- **Reproductions:** gen Today 43.22 / 13.00 / 5.89, digest `316b37cd`, identical to K2; gen Later 33.85 / 5.69 / 2.47; flat Today 43.41 / 9.52 / 5.20. **Determinism:** the every-free arm gave digest `21bd92a3` in two separate processes, before the loop fix; the loop leg was then given its side sign and every model row re-run.
- **The conversion's figures** (§4.4.4, §4.4.5's tables) were computed offline in Python from the same formulas.
- **What it is not:** the quarterback still sees every free runner from the snap; there is no sight roll and no alarm; the hold and the coin are revision 1's stand-ins; and **reading (b) stands in the touched men's late, weak block with revision 1's uniform "Later" delay**, so that block has never been built or run (§4.4.2).

### D.2 The totals reader (`TOT`)

- **Harness** (`TOT` §2): `packages/calibration/test/_rvtotals_arm.test.ts`, built on the free-runner reader's harness, driving `runRealSeason` (gen) and `runOneGame` over `buildFlatLeague` fixtures (flat). Base of every arm: revision 1's pricing setting (shape S, theta 11, k 2, beta 0.5, the wrapper on `resolve/passRush.ts:163-200`; the stand-in hold +2.0 s and routes +1.0 s unless stated; collapsing 0.5 s and pressure 1.0 s; contact a coin, p 0.5, wherever `sacksWithoutTarget` would sack, `resolve/pocket.ts:239`).
- **The stand-ins:** the free-run clock under readings (a), (b) and (c); the push window; the side-aware escape (target 50 + 10 per seen threat on his side + 15 per unseen blocked man there + urgency); contact by approach (rusher d100 + tackling/5 + speed/5 against quarterback d100 + strength/5 + agility/5, FREE +10 to the rusher, PUSH +20 to the quarterback, b 5, a second contact a sack at 0.85); the throwing motion as accounting in the fold; the alarm for free runners only (seen with p 0.9, one pick roll, make-him-miss, escape or hold); and a supply cut moving the pickup and hand-off band edges 15 or 30 points easier.
- **Command**, from the copy's `packages/calibration`:

  ```
  env RVT=1 NODE_OPTIONS=--max-old-space-size=4096 <switches> ../../node_modules/.bin/vitest run test/_rvtotals_arm.test.ts
  ```

  Switches `RVT_LEAGUE`, `RVT_FREE`, `RVT_CONTACT`, `RVT_PUSH`, `RVT_Q17`, `RVT_ALARM`, `RVT_SUPPLY`, `RVT_HOLD`, `RVT_ROUTE`, `RVT_THETA`, `RVT_SEED`; the arm nearest real is `RVT_FREE=model RVT_SUPPLY=30 RVT_ALARM=1 RVT_CONTACT=rated RVT_PUSH=1 RVT_Q17=1 RVT_HOLD=0.9 RVT_ROUTE=0.45`. One arm is about 26,700 to 28,300 dropbacks and 50 to 56 s; 42 arms on two leagues (`TOT` §0).
- **Honesty checks:** today's reading reproduces K2's Today arm (digest `316b37cd`); question 1 Today and the Heels variant give the same digest under shape S without the window, as claimed; reading (c) reproduces the free-runner reader's (c) row (43.18 / 9.49 / 3.60, 2.0 s tick bin 58.5); with the alarm switched off the patched harness gives digest `69be72e5`, identical to the run before the alarm code. Named forks: `pkR-contest`, `pkR-alarm`, `<rollRef>/pkRbeat`.
- **A second league** (seed pk-02): the league-to-league spread is about +1 hit and +0.3 sacks, several times the within-league standard error, so **a gap under about 1 hit or 0.4 sacks between two figures is not a finding** (`TOT` §4.5).
- **What it is not** (`TOT` §10): the count fitted at step 5a; the won-rep half of the alarm; sight from awareness and the trait; "if a man is open, the ball goes" (these arms let the arrival path throw at the desperation bar of 25, `sim/passPlay.ts:1108`, which is more generous); never-seen contacts; the clean-pocket checklist and question 8's scoring; the situation term and step 8a's fixes; M8; the supply after any protection design; theta's selection and b's fit. **The motion stand-in moves no throw:** it counts a hit when a live rusher reaches him in (t, t + rho], and reports time to throw as t + rho. **The supply cut is a band-edge shift, not a protection design.** "Hits on thrown balls" there is hit-or-sack minus sacks and includes throwaways, so it overstates aimed throws (INFERRED). **Every sack figure under the stand-in hold is inflated by a hold about 0.35 to 0.4 s too long** (`TOT` §8.7).

### D.3 The clean-pocket reader (`CP`)

- **Sim measurements** (`CP` §5.1): `packages/calibration/test/_rvclean_sim.test.ts`, a `vi.mock` pass-through of `../src/harness/runGame.js` that hands each game's events to a fold and, on the bench, passes a tunables copy built with `applyTunablePatch`. Bench patches: `passRush.blockerStructuralAdvantage` 0 to 500, `blitzPickup.freeRunnerArrivalSeconds` 1.5 to 50, `blitzPickup.freeRunnerPath.maxArrivalSeconds` 4.0 to 99, `stunt.looperArrivalSeconds` 2.0 to 50 (`tunables.ts:439`, `:647`, `:748`, `:585`). Leagues: flat `buildFlatLeague({ teams: 32 })`, `SYNTHETIC_ROUND_ROBIN` 2024, `generateSeeds("baseline-0001", 496)`, `runOneGame` with `FROZEN_TENDENCIES` and `FROZEN_FOURTH_DOWN`; gen `runRealSeason({ seed: "pk-01", ... week: 18, day: 7 })`.

  ```
  RVC_LEAGUE=gen  ../../node_modules/.bin/vitest run test/_rvclean_sim.test.ts
  RVC_LEAGUE=flat ../../node_modules/.bin/vitest run test/_rvclean_sim.test.ts
  RVC_BENCH=clean RVC_LEAGUE=gen  ../../node_modules/.bin/vitest run test/_rvclean_sim.test.ts
  RVC_BENCH=clean RVC_LEAGUE=flat ../../node_modules/.bin/vitest run test/_rvclean_sim.test.ts
  ```

- **Reproductions:** the bench reproduces revision 1's default-D2 figures (1.799 s and 11.13% on gen, 1.663 s and 20.63% on flat); a re-run of the gen bench gave identical counts, 8,631 / 4,286 / 2,340 / 549.
- **Real data** (`CP` §5.2): two `python3 -I` scripts over the cache (nflverse play-by-play joined to FTN charting and the participation file, regular season 2023-24), the loader quoted verbatim in the report.
- **What it is not:** the checklist was not built or run; the bench gives upper bounds on what it can reach (the restart up to 15.0% of clean dropbacks, the window bump at most 2.9%), not its effect.

### D.4 The change map (`CM`)

No scratch test, no source edited and no background job (`CM` §9). Code was read on the copy at `8b387f7`. Real-data rows were computed with `python3 -I` over the earlier loader's table (`.../scratchpad/pocket/realdata/db.json`); the situation rows of §2.4 use 40,982 dropbacks of 2023-24 with the FTN pressure flag, classed by quarter, half seconds remaining and score margin with the classifier quoted in the report. It ran no sim.

### D.5 The two-moments model (`TM`)

- **C1** (`TM` §2): gen pk-01, 272 games, 25,758 dropbacks; scratch test `_pkTSynth.test.ts`, deleted, a pass-through `vi.mock` of `runOneGame` that reads events only. It gave the push-window sizing (17.6% of dropbacks hold a POWER rep at 5 to 14) and the escape side (a live threat on the away side on 57.4% of escapes).
- **C2**: the same season, `packages/calibration/test/_pkTSynthFixA.test.ts`, deleted, the copy's `git status` clean. It gave the sacker mix by credit rule (4,308 sacks), won-rep travel (399 of 14,627 edge threats at 2.5 s or more, 393 of them cornerback blitzes) and same-tick creation (40.7% of won-rep creation ticks).
- **C3**: `python3 -I` over the cache's play-by-play, FTN charting, participation and weekly rosters, scripts deleted: strips by sacker class, the out-of-pocket sacker shift and the read-thrown mix.
- **What it is not:** C1 and C2 ran on today's engine, so under shape S their sizes are bounds (INFERRED, `TM` §9 item 12).

### D.6 What none of it is

None of it is engine code. It is one or two seed sets on two leagues. Revision 1's arms (Appendix B) and the readers' arms share one harness lineage (K2's rebuild of Appendix B's, `TOT` §2, `FR` §7.1), so they are not independent of each other. **Step 0 reproduces every base row in engine code before step 1 is written** (§6.0), and **no graded row is scored on anything but built engine code**, from step 5b (WARNING 1).

## Appendix E: the step-0 filing record

*Appended at step 0's integration (plan §7.3 item 6). Nothing above this appendix changed, so every `adrLine` in the filing still points at the C0 bytes of this file. The machine-read filing is the JSON below; this appendix is its human-read record (plan §8.1). Amendments go in `reports/adr-089-amendments.filed.json`, never in the step-0 file.*

### E.1 The filing

- **Path:** `packages/calibration/reports/adr-089-step0.filed.json`, format `adr-089-filed/v1`.
- **`FILED_DIGEST`:** `fnv1a:9a1c90e9`, pinned in `packages/calibration/test/adr089Filed.test.ts`. It is `filedDigest` (`stableDigest` of the parsed file), and the same test pins the bytes' format (two-space JSON, final newline), so any edit fails the suite with "ADR-089 §6.0: the step-0 filing is append-only; amend by a named entry". The bytes' sha256 is `767ae0c462e22a3319c509a65975be0c6b0e9a5b4a46bf8d119575234878da07`. It was re-pinned once, at step 0's review and before any arm read the pin: the first pin, `fnv1a:6b9ef02c` (sha256 `43b62a53…`), gave way when the review's findings F2, F3 and F8 changed the filing (E.11, the named entry).
- **How it was filled:** `pnpm --filter @ff/calibration pocket -- --step 0 --write-filed <a fresh step0Filing()>` (P-7, 356 s on 4 vCPU), on a pending file written from `step0Filing()`, then copied to the path above; a second process filling another fresh file gives the same bytes (`cmp`). It filled all 73 pending fields: `m1Bound` (7), `M.M1` to `M.M9` (9), the 45 base rows on both leagues, and 12 clause edges (E.7). No pending marker is left (`adr089Comparators.test.ts`), and the command writes nothing unless it can fill every one (`completeFiling`).
- **The curve rows hold one cell** (review F6). `base.rows.pressured_share_by_release_bin` and `base.rows.hit_rate_by_release_bin` file the registered 2.0-2.5 s cell only, as the registry rows print it; the whole curve by bin is `pocketTables`' (and the step report's), not the filing's. A later step that needs today's curve re-measures it on the base arm. The level of hits on thrown balls is its own row, `hits_on_aimed_throws_per_dropback` (E.11).
- **Where it was measured:** the step-0 branch, which changes no engine source (P-12), so every base figure is today's game at `e23bf69`. The M block and `m1Bound` equal stream S3's own run of the same command field for field, and `adr089Base.test.ts` (P-3, P-4) re-plays the base corpora and gets every filed base row back.
- **How the golden pins were measured** (review NPC-S2). `GOLDEN_PINS` and `SEASON_PATH_PINS` (`src/pocket/golden.ts`) and the 1,400 per-game hashes of `test/fixtures/adr089-golden.json` (stamped `measuredAt: "e23bf69"`) come from the base, not from the code they check: `test/goldenBaseRecipe.test.ts` imports only modules that exist at `e23bf69` and, run in a checkout of the base (`FF_POCKET_GOLDEN_RECIPE_OUT=<file>`), writes every golden game's canonical and byte digest, their folds, the whole-canonical digests and event counts, and the season path's per-game digests, folds and run digest (captured around `runOneGame`, since the base has no `onGame`); `test/goldenBaseCheck.test.ts` (`FF_POCKET_GOLDEN_BASE=<file>`), run in this tree, asserts the pins and the fixture equal that output. Run at the review's fix: the recipe in a copy of `e23bf69` (343 s), then the check here, 3 of 3 passed.
- **Question 19 was answered Wait.** M8 is built for Wait; Table now is filed beside it as information only (E.3).

### E.2 The M1 bound: B1, E, SD and H (deviation O1)

B1 = E + 3·SD, over POWER reps of latent margin 1 to 14 on dropbacks released at 1.0 s or later; H is the count of reps the window could touch (`m1PushWindow.ts`). The filed bound is gen seed set 1 (`m1Bound`); the other league and set are filed beside it in `M.M1`. In points, B1 is 100 × B1 / dropbacks.

| league, set | dropbacks | E | SD | B1 | H | B1 in points | margins 1-4: B1 in points | margins 5-14: B1 in points |
|---|---|---|---|---|---|---|---|---|
| gen, 1 (filed) | 25,758 | 47.34 | 6.83 | 67.83 | 3,988 | 0.2633 | 0.0958 | 0.1979 |
| gen, 2 | 25,805 | 47.24 | 6.82 | 67.71 | 4,007 | 0.2624 | 0.0956 | 0.1972 |
| flat, 1 | 43,837 | 68.84 | 8.24 | 93.54 | 5,862 | 0.2134 | 0.0785 | 0.1567 |
| flat, 2 | 43,741 | 68.83 | 8.24 | 93.54 | 5,924 | 0.2138 | 0.0802 | 0.1556 |

Its three uses take the one filed number, 0.2633 points: step 1's window falsifier, pressure within ±0.2633 (`s1.window.pressure`, ADR-089:1007); the S band's raised upper pressure edge, 40 + B1 = 40.2633 (`s1.S.pressure`, :1005-1007); and 5b's raised edge, 42 + B1 = 42.2633 (`s5b.pressure`, :1063). It is the largest of the four league-and-set figures, so on flat (0.2134 and 0.2138) the filed bound is the looser one.

### E.3 M8: the free-run clock under Wait, with Table now beside it as information

Every free runner on both base seasons (seed set 1), by snap row. Under Wait only the down lineman's row is built: he runs the free-run clock (§4.4.4) from his gap (A 0.75 / B 2.25 / C 3.75 / D 5.25 yards, EDGE +0.75) at depth 1.0; every other free runner keeps today's set time (TODAY), and a man somebody touched keeps his (TOUCHED). Table now's rows are counted on the same men, with and without the Mug arm, and are information only.

| league | free runners | published etaTick mismatches | Wait: DOWN_LINEMAN / TODAY / TOUCHED | Table now (information) | Table now with the Mug arm (information) |
|---|---|---|---|---|---|
| gen | 7,366 | 0 | 2,099 / 2,564 / 2,703 | DOWN_LINEMAN 2,099, LB_WALKED_UP 1,284, LB_DISGUISED 878, LB_ON_THE_EDGE 58, SLOT_CORNER 344, TOUCHED 2,703 | DOWN_LINEMAN 2,099, LB_WALKED_UP 1,283, LB_DISGUISED 789, LB_ON_THE_EDGE 50, LB_MUG 98, SLOT_CORNER 344, TOUCHED 2,703 |
| flat | 13,142 | 0 | 3,947 / 4,533 / 4,662 | DOWN_LINEMAN 3,947, LB_WALKED_UP 2,293, LB_DISGUISED 1,423, LB_ON_THE_EDGE 115, SLOT_CORNER 702, TOUCHED 4,662 | DOWN_LINEMAN 3,947, LB_WALKED_UP 2,289, LB_DISGUISED 1,269, LB_ON_THE_EDGE 104, LB_MUG 169, SLOT_CORNER 702, TOUCHED 4,662 |

The down linemen under Wait, by origin and position (mean free-run time against today's set time, seconds; how many arrive sooner and later than today):

| league | origin | position | n | mean free-run time | mean today | sooner | later |
|---|---|---|---|---|---|---|---|
| gen | PICKUP_LOST/BLOWN_UP | DE | 366 | 1.771 | 1.500 | 0 | 366 |
| gen | PICKUP_LOST/BLOWN_UP | DT | 18 | 1.800 | 1.444 | 0 | 18 |
| gen | STUNT_LOOPER/LOOPER_FREE | DE | 1,086 | 1.999 | 2.000 | 449 | 244 |
| gen | STUNT_LOOPER/LOOPER_FREE | DT | 543 | 1.815 | 2.000 | 422 | 6 |
| gen | UNBLOCKED | DE | 86 | 1.703 | 1.500 | 0 | 86 |
| flat | PICKUP_LOST/BLOWN_UP | DE | 670 | 1.769 | 1.500 | 0 | 670 |
| flat | PICKUP_LOST/BLOWN_UP | DT | 42 | 1.738 | 1.429 | 0 | 42 |
| flat | STUNT_LOOPER/LOOPER_FREE | DE | 2,116 | 2.046 | 2.000 | 0 | 485 |
| flat | STUNT_LOOPER/LOOPER_FREE | DT | 939 | 1.743 | 2.000 | 939 | 0 |
| flat | UNBLOCKED | DE | 180 | 1.700 | 1.500 | 0 | 180 |

The down-lineman key (`POSITION_GROUP` DL, deviation O8) disagrees with the personnel family on 0 of 7,366 gen runners and 0 of 13,142 flat, and with the depth class on 0 and 0. The full tables (every origin, row and position, with the ETA histograms, under Wait, Table now and Table now with the Mug arm) are `M.M8` in the filing.

### E.4 M9's tolerance (deviation O10)

Two times the game-clustered bootstrap SE (1,000 resamples, seeded `adr-089:m9`), the larger of the two seed sets, by row and window. Rates are fractions; time to throw is in seconds.

| league | row | Q1/Q3 end | Q2/Q4 end | rest | overtime |
|---|---|---|---|---|---|
| gen | pass_rate | 0.012261 | 0.013356 | 0.006081 | 0.311140 |
| gen | throwaway_rate | 0.005813 | 0.006058 | 0.002871 | 0.195170 |
| gen | time_to_throw | 0.026065 | 0.026733 | 0.012562 | 0.964455 |
| flat | pass_rate | 0.009901 | 0.010032 | 0.004664 | 0.249406 |
| flat | throwaway_rate | 0.005727 | 0.006020 | 0.002569 | 0.110783 |
| flat | time_to_throw | 0.021000 | 0.020738 | 0.008533 | 0.495678 |

Steps 8a's and acceptance's Q1/Q3 clauses (ADR-089:1100, :1153) are one clause per row, each with its own Q1/Q3 tolerance in its own unit, the larger league's (E.7; review F3): throwaways 0.5813 points (`s8a.q1q3`, `acc.q1q3`), pass rate 1.2261 points (`s8a.q1q3.passRate`, `acc.q1q3.passRate`) and time to throw 0.026065 s (`s8a.q1q3.timeToThrow`, `acc.q1q3.timeToThrow`).

### E.5 Step 5b's bands, re-derived (ADR-089:1063), with the full interval

| row | acceptance | contributions after 5b (midpoints) | derived | filed | full interval |
|---|---|---|---|---|---|
| sack_rate | 5.58-7.54 | 6: the rescoring (0.3 to 1; midpoint 0.65): +0.65; 6: the side-aware catch (0.24 to 0.24; midpoint 0.24): +0.24; 6: the caught escape as contact (-1 to -0.5; midpoint -0.75): -0.75; 7: the alarm, sight and the slide (0.5 to 2.5; midpoint 1.5): +1.5; 8b: the situation term, centred (0 to 0; midpoint 0): +0 | 3.94-5.90 | 3.9-5.9 | 2.34-7.50 |
| hit_or_sack_rate | 12.5-16.9 | 6: the rescoring (each also a hit-or-sack) (0.3 to 1; midpoint 0.65): +0.65; 6: the side-aware catch (0.32 to 0.32; midpoint 0.32): +0.32; 6: the caught escape as contact (-1 to -0.5; midpoint -0.75): -0.75; 7: the alarm, sight and the slide (-4 to 1; midpoint -1.5): -1.5; 8b: the situation term, centred (0 to 0; midpoint 0): +0 | 13.78-18.18 | 13.8-18.2 | 10.68-21.28 |

### E.6 b's grid and RUN's margin (deviations O6, O7)

- **b** starts at 5 and is fitted at step 10 to 44.6% on the whole numbers -15 to 15 (31 points). The closed form is (100 − b)(101 − b)/20000 for b ≥ 1 (0.456 at b = 5) and 1 − (99 + b)(100 + b)/20000 for b ≤ 0 (0.505 at b = 0). Its reachable range is filed as REPORTED stand-ins (ADR-089:671): a sack share of 24 to 36 on the continuous reading and 37 to 57 on the grid reading, measured at the grid's ends at steps 4 and 10, and the grid is never widened.
- **Δ = 10** over urgency 0 to 3: RUN's base is the throwaway appeal's base plus Δ, the smallest whole margin at which a 70-baseline quarterback ranks RUN strictly first at every urgency (Δ + 5u > 8u for u in 0..3, so Δ > 9).

### E.7 The clause edges C3 filled, and the rule each follows (an integration finding)

The filing holds **one number** per clause edge (`lo`, `hi`, `tolerance`), while M1, M2 and M9 measure each league apart (and M9 each row and window). The plan says P-7 fills them; the step-0 command as built filled only the M block and `m1Bound`, so C3 added `fillC3` (`src/pocket/step0.ts`, `C3_CLAUSE_RULES`), which files each edge by a stated rule and refuses an edge no rule names. `adr089Comparators.test.ts` checks every filed edge equals its rule applied to the filed M values.

| clause | edge | rule | filed |
|---|---|---|---|
| `s1.S.pressure` (ADR-089:1005) | hi | 40 + B1 in points (O1) | 40.2633 |
| `s1.window.pressure` (ADR-089:1007) | lo | −B1 in points (O1) | -0.263321 |
| `s1.window.pressure` (ADR-089:1007) | hi | +B1 in points (O1) | 0.263321 |
| `s2.m2` (ADR-089:1017) | lo | the smaller league's counter-forced share under S (`M.M2.<league>["S-theta11-window"].counterFarSharePct`) | 0 |
| `s2.m2` (ADR-089:1017) | hi | the larger league's | 0.02 |
| `s5b.pressure` (ADR-089:1063) | hi | 42 + B1 in points (O1) | 42.2633 |
| `s8a.q1q3` (ADR-089:1100) | tolerance | 100 × M9's throwaway-rate Q1/Q3 tolerance, the larger league's | 0.5813 |
| `s8a.q1q3.passRate` (ADR-089:1100) | tolerance | 100 × M9's pass-rate Q1/Q3 tolerance, the larger league's | 1.2261 |
| `s8a.q1q3.timeToThrow` (ADR-089:1100) | tolerance | M9's time-to-throw Q1/Q3 tolerance in seconds, the larger league's | 0.026065 |
| `acc.q1q3` (ADR-089:1153) | tolerance | as `s8a.q1q3` | 0.5813 |
| `acc.q1q3.passRate` (ADR-089:1153) | tolerance | as `s8a.q1q3.passRate` | 1.2261 |
| `acc.q1q3.timeToThrow` (ADR-089:1153) | tolerance | as `s8a.q1q3.timeToThrow` | 0.026065 |

Three readings are named here for the owner to see. The B1 edges on flat use gen's bound, the larger. The throwaway clause's comparator `situation_q1q3_last_two` is **pressured throwaways per pressured dropback**, while M9's throwaway row is **throwaways per dropback**; the tolerance is filed from M9's row as the design says ("M9's filed tolerance"), and the construct gap is listed for step 8a, which grades it (the pass-rate and time-to-throw clauses read M9's own rows, so they have none). And `s2.m2`'s edges are M2's **censored first-order** share (review F5): under S, M2 censors 78% of dropbacks (gen 20,162 of 25,758, 78.27%; flat 78.10%), so 0 to 0.02 is reported only, never graded (O14).

### E.8 The deviations O1 to O19: Orchestrator choices within the design's words

None changes an owner answer. Each fills a number or a reading the design leaves open, or corrects a construct that cannot hold literally. "The design's words" quotes the line; "what is filed" is the step-0 filing's reading.

| id | line | the design's words | what is filed | why |
|---|---|---|---|---|
| O1 | :975, :1007, :1063 | "the window alone moves pressure by at most M1's count, and sacks within 0.3"; "raised by M1's window count"; "pressure 25 to 42, its upper edge raised by M1's window count" | "M1's count" is B1 = E + 3·SD, with H beside it, one quantity in all three places (E.2) | the beat is a random draw, so "at most E" would fail half the time on noise; one named quantity for all three uses |
| O2 | :1027 | "every free runner's published `etaTick` equals M8's table for his snap row, ratings and drop, to the tenth" | step 3's part 1 is M8's **function** applied to each play's own `PLAY_START` and snapshot, not the base table | games diverge from step 1, so step 3's free runners are not the base seasons' men |
| O3 | :1319 against :1616 | :1319 changes "the news CLI's advice to play a season"; :1616 "`narrative` is untouched in code" | the news CLI's advice changes at step 11, with the flip, by `narrative` | the advice is right while the default is `legacy`, and narrative is untouched through step 10 |
| O4 | :425, :979, :1179 | "across two seed sets"; "within noise"; "each priced on two seed sets" (no second set named) | second seed sets: flat `generateSeeds("adr-089:seed-set-2", 496)`; gen `pk-02` | the design names none; `baseline-000N` names belong to the baseline series |
| O5 | :422-427 | "theta from 7 to 15 at k = 2, beta = 0.5 ... R from 4 to 8"; "within twice the loss's own spread across two seed sets" | theta ∈ {7, …, 15}, each with the push window; R ∈ {4, …, 8}; spread_g = \|loss_g(set 1) − loss_g(set 2)\|, no separation if worst − best ≤ 2·max_g spread_g | the ranges need points, and "spread across two seed sets" needs a statistic |
| O6 | :669-671 | "b starts at 5 and is fitted at step 10"; its reachable range "measured as stand-ins" | b ∈ {−15, …, 15}, the closed form for both signs (E.6) | the lower edge effectively sets step 10's sack level (lower b, more sacks; 44.6 sits above the stand-in ceiling) |
| O7 | :727 | RUN "(today's escape terms ...)" against THROWAWAY "(today's throwaway terms ...)", no margin given | Δ = 10 over urgency 0 to 3 (E.6) | the smallest whole margin at which a 70-baseline quarterback ranks RUN first at every urgency, covering step 10's neutral-situation row |
| O8 | :569 | "down lineman (where the card aligns him; a Stem is a look and is never read)" | down lineman = `POSITION_GROUP` DL; its disagreements with the personnel family and the depth class reported (0 and 0, E.3) | the row names no key; the alternatives are shown |
| O9 | §6.0 benches (:966-972) | "the uncensored line bench lives in `packages/engine/test`" (no population) | the line bench's grid (plan §6.3), in `packages/engine/test/lineBench.test.ts` | the design gives no population |
| O10 | :979, :983 | "within noise"; "Step 8a's tolerance is filed from it" | M5's noise and M9's tolerance: 2 × the game-clustered bootstrap SE, the larger of two seed sets (E.4) | "within noise" and "tolerance" need a rule |
| O11 | :985 | "The rules version and its overlay's tunables digest reach the baseline identity ... as an optional field, absent meaning `legacy`" | export and `--out` always write `engineRules`; identity, batch provenance and the save write it only when not legacy; the overlay digest field (identity, batch provenance, the export and `--out`; never the save, see K18 below) only when not legacy | a legacy identity and a legacy save stay byte-identical to today's, while the export and `--out` say what played |
| O12 | :950, :962 | "at fixed calls" | "at fixed calls" as plan §5 reads it | undefined in the design |
| O13 | :962 | "first forcing" | the first COLLAPSING or IMMEDIATE tick | `TM`'s construct; it reproduces `TM`'s 20,130 |
| O14 | :976 | "the share of forced decisions set by the counter while the nearest threat is more than 0.5 s away" under S and L | M2's own dice and its first-order censoring (plan §6.2), the censored share printed | no engine fork exists for the beat or the unplayed ticks at step 0 |
| O15 | :922 | "byte-identical ... compared by `stableDigest` of `{at, event}`" | the byte digest of plan §3.4 (FNV-1a over `JSON.stringify`), pinned per game, beside the canonical one | `stableDigest` sorts keys, so it cannot prove "byte-identical" alone |
| O16 | :416, §4.1's reader list | the readers of `CHECK.roll` named at :416 | P3's reader list gains `apps/game/src/playDetail.ts:296-308` | the play-detail view reads `CHECK.roll` with no guard |
| O17 | :970 | "the one-threat bench is built from constructed calls run through `simulatePassPlay`" | the bench's construction of plan §6.3 | the design names the harness, not the population |
| O18 | :962-964 | the new rows, as "rows" | rows that need the snapshot, the tunables or the decision bar are pocket report rows (`constructs.ts` home `pocket-row`), not registry rows | the registry's word guard and its event-only folds |
| O19 | :991 | "the S late arm re-measured on a second seed set, context only" | it runs at step 1 | no shape S exists at step 0 |

**K18, the save's overlay digest** (plan K18, C1-N5; review F4). ADR-089:985 has the rules version "and its overlay's tunables digest" reach the season save, and :1321 loads a `pocket-1.s<step>` save only on the build whose overlay digest matches. The save carries the rules name only (P1: `SaveFile.playedWith.engineRules`, the owner's typed yes); a step-1 save needs the name to encode the overlay digest, or a second contracts petition.

### E.9 The (b) checks: reproductions of REPORTED figures

A miss is recorded as REPORTED-UNREPRODUCED with its own construct and value, as Appendix B does; it does not falsify step 0 (§9 (b) of the plan). `adr089Base.test.ts` prints each and asserts the classification; the clean bench's figures are `cleanBench.test.ts`'s (P-6).

| id | construct (this tree) | the design's figure | measured | outcome |
|---|---|---|---|---|
| b.m4 | M4, TM's cause rule, gen seed set 1 | 6,395 of 21,962 (29.1%); naive 36.3% | 6,395 of 21,962 (29.12%); naive 7,967 (36.28%) | reproduced |
| b.clean-bench-nobody-open | the clean bench's nobody-open share and split (`throwClass.ts`) | gen 30.2% (8,631 of 28,588): 10.1 / 8.9 / 11.1; flat 43.6% (23,064 of 52,882): 6.8 / 16.2 / 20.6 | asserted by P-6 at the printed precision | reproduced (P-6) |
| b.m3 | M3, the last ARRIVED rusher, same-tick arrivals split, gen | 86.9 / 8.6 / 4.4; unsplit interior 82.5; 1,110 | 86.90 / 8.64 / 4.43; 82.51; 1,110 of 4,308 | reproduced |
| b.first-pressure | `first_pressure_seconds`, seed set 1 | 0.877 flat, 0.883 gen | 0.877, 0.883 | reproduced |
| b.live-won-rep | `clean_with_live_won_rep_ticks` / `_dropbacks` | 60 on 57 flat, 30 on 29 gen | 60 on 57, 30 on 29 | reproduced |
| b.unblocked-men | `unblocked_men_per_100`, gen | 18.1 | 18.10 | reproduced |
| b.won-rep-origin | `first_pressure_origin`, gen | 62% | 61.88% | reproduced |
| b.entry-107 | `multi_channel_share`, the in-tree deciding-instant algorithm under today's forcing rule, flat | 79.94% | 0.29% (101 of 34,549 forced); the pre-ADR-058 old-forced reading gives 76.55% (26,954 of 35,211) | **REPORTED-UNREPRODUCED** |
| b.cp-classes | after an escape: `int_per_aimed_by_throw_class.ON_THE_RUN` on gen base; the rest on the gen clean bench | 17.1% after an escape; desperation 19.0%; rank-pushed 16.3% at 20.9% | 17.10% on 421 aimed; the clean-bench figures asserted by P-6 (rank-pushed after S3's reading of CP's stated rule, plan §6.1) | reproduced |
| b.tm-399 | each rusher's first WON_REP threat on a dropback, EDGE, travel (`etaTick` − tick) 2.5 s or more, and how many are cornerbacks, gen seed set 1 (review F1); M2's S arm, which counts decisions, beside it | 399 of 14,627 (2.7%), 393 of them cornerbacks | 398 of 14,447 (2.75%), 392 cornerbacks; M2's S arm: counter-forced 0 of 5,596 forced decisions | **REPORTED-UNREPRODUCED**: near-reproduced on the threat count (398 of 14,447, 392 CB); M2's S arm counts decisions, 0 of 5,596 counter-forced |

### E.10 The real sides against §2 (K16)

`adr089Base.test.ts` checks 162 real figures of §2.1-§2.4 on the data cache (2022-24 TUNING seasons; 2023-24 where the row says FTN) at their printed precision, each with its line: 14.71 and 14.73 (:86, :155), 44.6 and 45.1 (:87, :156), 6.56 (:157), 2.631 and the 2.40 median (:158), every bin of §2.2's curves (:169-186) and the 0.5 s release shapes (:194-195), the 29.4 / 36.2 limits (:188), 3.54 / 8.84 / 1.25 (:204), the hits on aimed throws per dropback, 7.1 and 8.1 counting throwaways (:206; 7.093 and 8.079), 10.63 with its 33.0 / 4.7 / 62.3 split (:246), 45.5 / 43.9 (:290), and §2.4's situation table with its standard errors (:228-232). **160 reproduce.** Two cannot be matched, and are printed beside the design's figure; the bands stay filed against the design's figures:

| figure | design | measured | why it cannot be matched |
|---|---|---|---|
| hit-or-sack's interval, upper edge (:86) | [14.43-15.00] | play-level binomial 95%: [14.43, 14.99]; 1.96 game-clustered bootstrap SEs (1,000 resamples over 815 games) are wider, [14.39, 15.03] | the design states no construct for the interval |
| QB hit rate counting throwaways, raw, 2.5-3.0 s (:171) | 10.9 | 10.850 (803 of 7,401; 10.8499 to four places) | the printed 10.9 is a half-up rounding of the two-place 10.85 (double rounding, INFERRED); K1's reference row, which no band reads |

### E.11 The step-0 review's re-filing (the named entry for the re-pin)

Revision 2's step-0 reviews (no play change, fidelity, code and tests) found that two graded clauses read the wrong quantity (F2), that one tolerance stood for three rows in three units (F3), and that one 5a line had no clause (F8). They were re-filed before any arm read the pin, by the same command on a fresh `step0Filing()`; every other block of the filing (M1-M9, `m1Bound`, the 44 earlier base rows, the census, the constants, the rules, the prediction, the clause lines) is identical to the first filing's, which also shows that the review's code fixes moved no measured value.

| finding | what changed in the filing | filed |
|---|---|---|
| F2 | a registry row, `hits_on_aimed_throws_per_dropback`: hits on aimed throws over dropbacks, every release bin together (real side: pbp `qb_hit` on FTN-season attempts FTN did not chart as throwaways, per FTN-season dropback). `s4.motion.hits` (ADR-089:1036) and `acc.hitsOnThrown` (:1140) grade it, where they read the one-bin per-throw rate before | base 3.62 flat (1,587 of 43,837) and 7.31 gen (1,884 of 25,758), ADR-089:88's figures; real 7.09 (2,907 of 40,982), 8.08 counting throwaways, :206's 7.1 and 8.1 |
| F3 | the Q1/Q3 clauses, one per M9 row: `s8a.q1q3` and `acc.q1q3` are now the throwaway clauses, beside new `.passRate` and `.timeToThrow` clauses (E.4, E.7) | 0.5813 points, 1.2261 points, 0.026065 s |
| F8 | `s5a.reset` (ADR-089:1053): "The reset is held at 1.0 s and reported alone (default D33)", a structural clause with no band | 262 clauses (257 before) |

`FILED_DIGEST` moved from `fnv1a:6b9ef02c` to `fnv1a:9a1c90e9` in the commit that re-filed (`c4686d6`).

### E.12 contracts-guardian's review of P1

`contracts-guardian` reviewed petition P1 (`0623045`, `SaveFile.playedWith.engineRules?: string`; the owner's typed yes, Status) after the build, as its own read-only agent over `e23bf69..4463c55`. The edit landed before this review, against §7's order; the branch was not pushed until the review was in (its nit F5). **Verdict: APPROVE**, 0 blocking, 2 should-fix, 4 nits.

- **Necessary, minimal, well named, backward compatible.** One optional free-text string keeps contracts engine-agnostic; every save without it, and every legacy save written now, reads as `legacy`; legacy saves stay byte-identical; `SAVE_FORMAT_VERSION` correctly stays 1. Contracts gains a type and a comment only.
- **Boundaries hold.** The names calibration imports from engine, franchise, playbook, narrative and attributes are identical at `e23bf69` and the head; no deep import; no `Math.random` in any source or test; attribute reads go through registry ids.
- **Should-fix 1: K18** (E.8). The design checks a mid-build save against its overlay digest (:1321, R9 at :1408), which P1's single string cannot hold. Settled before step 1, the first step that can write a non-legacy save: the digest inside the rules name, a second petition with its own typed yes, or name-only checking, recorded here.
- **Should-fix 2: the spec lag.** `docs/design/contracts.md:506` still shows `playedWith?: { caller: string }` until P16 at step 11; acceptable because P16 is scheduled and needs its own yes.
- **Nits:** the doc comment on `save.ts` could say "a non-empty name; writers omit it under `legacy`" (a contracts edit, so it waits for a petition); a build from before P1 ignores the field (bounded: no non-legacy save exists before step 1); `DeadlineRatings` in `contest.ts` keys four attribute names by string (it never reads a player).

The full report is `/mnt/project-files/arms/pocket-fix/step0/review-contracts.md`.

## Appendix F: the step-1 record

*Appended at step 1's record (plan §11, commit 12), after Appendix E. Lines 1 to 2,197 of this file are unchanged, so every `adrLine` in the step-0 filing still points at the C0 bytes; `pocketBands.test.ts` allows this one heading after Appendix E and no other. The step's numbers are `packages/calibration/reports/adr-089-step1.md` (the report) and `.json` (the measures), committed in `c45acae`; this appendix is their human-read record. The build's working reports (`build-*.md`, `proofs.md`, `measure.md` and the four reviews, in the Orchestrator's step-1 working folder; the planning files are in `/mnt/project-files/arms/pocket-fix/step1/`) are named where they are the source. Nothing here moves a band, re-files a clause or changes a filed number (§6.0: the step-0 filing is append-only, and `FILED_DIGEST` is still `fnv1a:9a1c90e9`). Branch `claude/pocket-fix`, base `20c5115`, record written at `c45acae`.*

### F.1 What landed, and the additions beyond §6.1

All of it sits behind the switch. A bundle plays `pocket-1` only when its tunables carry the stamp `engineRules { name: "pocket-1.s1", overlayDigest }` and the blocks it names (`passRush.beatClock`, `passRush.repClock`, `passRush.approach`). `DEFAULT_TUNABLES` carries none of them (census `fnv1a:365da48d`, digest `fnv1a:395a9ae2`, unchanged), so the default game plays `legacy` and its bytes are `20c5115`'s (F.7). The rules bundle is `pocket-1.s1`; its design digest is `POCKET_1_S1_DIGEST`, `fnv1a:69a7cc48`.

- **Shape S, the breaking time** (`engine/src/resolve/beatClock.ts`). One breaking time per blocked rep: T = theta · exp(-beta · m / 41) · (-ln U)^(1/k), with U = 1 - next() as the first draw of the fork `beat/<the rep's rngLabel>`, published as a `pass_rush_beat` CHECK with die `"uniform"` (P2) right after the rep's CHECK. Before the beat tick the matchup reports `min(0, m)` on a `pass_rush_tick` CHECK with no die (P3); from the beat tick on, `max(15, m)`, RUSHER_WINS_REP. The won rep's threat names the beat in `rollRef`, so the join runs tick, beat, rep. Provisional dials: theta 11 s, k 2, beta 0.5.
- **The bull-rush window** under S (§4.1.1). A POWER rep of latent margin 1 to 14 reports `min(m, 4)` one window length (1.0 s) before the beat tick and `max(m, 5)` on the tick before it, each only at or after the play's first tick (0.5 s), with no die. The engine refuses a window length that is not a whole number of tick steps, 2 or more (review CT-2).
- **Shape L, the gradual clock.** margin = `Math.round((Math.min(t, R) * (repMargin + jitter)) / R) + 0`, with today's dice and fork labels. R 5 is the design point and R 8 the priced point. `PassRushTickArgs` gains a required `tick`. This form differs from step 0's instrument `clocks.ts:151` at a few exact halves (R 5, t 3.5, x 45 gives 32 against 31); `pocketStep1Stream`'s CT-7 case pins where (R 3 to 8).
- **The approach card** (`engine/src/resolve/approach.ts`), computed once at the threat and published as `RUSH_THREAT.approach` (P4): FREE, ARC, THROUGH or PUSH. BLOCKED is never published; the field's type excludes it. PUSH under L follows the Orchestrator's ruling on F1 (F.4).
- **The rules on `PLAY_START`.** `PassPlayStartPayload.rules { name, overlayDigest }`, its last key, on pass plays only (O20), so a stream names the dials that played it.
- **The step-1 harness** (`pocket -- --step 1`): the 17 arms of plan §9.3, the stream folds (S-2, S-4, S-5, S-7, S-8), the guard on both levels, the report and the measures, sharding, and an arm cache keyed by a source fingerprint.
- **The docs:** the marked `pocket-1` section of `docs/design/match-engine.md` and the ADR-059 amendment note (under S the per-tick jitter die is not drawn).

The commits (`git log --oneline 20c5115..c45acae`, 31): E-a `8d30012`, K-a `5668ed2`, V-a `bbd05ea`; P2 `3f81d93`, P3 `e392792`, P4 `163a10b`; E-b with D `1bfc4cd`; K-b `a7a6532` and `5885c2a`; V-b `c2d27fa`; F `206640f`; sixteen review-fix commits, `d5f919a` to `dc640c9`; the F1 and F2 ruling, `c9fa929` and `7b27840`; the S-9 pins `0a2eb41`; the reports `c45acae`.

**The additions beyond §6.1** (plan §10; critique-1 F23), each behind the switch or outside play:

- `--engine-rules` on `season` and `export-game` (O26), the design bundle only. A save is stamped `pocket-1.s1@<overlay digest>` (K18, F.3); an export file's name gains `.<rules>` for a non-legacy run only.
- The viewer's play detail shows the beat (`uniform 0.734`), the dieless tick (`no die`) and the threat's approach in §4.0's words (`apps/game/src/playDetail.ts`, `c2d27fa`). It holds no game logic: every word comes from one field of one event.
- A separate `passRush.approach` block with two leaves, `pushMinMargin` and `pushMaxMargin`, beside the window's own range. The engine reads them as separate dials; calibration, the only maker of a stamped bundle, refuses a window whose range is not the card's PUSH range (review CT-3).
- `FreeRunner.band`, so a free runner's label reads the band of his pickup or stunt.
- `foldGame` takes the tunables, and every step-1 fold is handed the arm's own (K14; `pocketStep1K14.test.ts`, review CT-8).
- The arm cache, `packages/calibration/data-cache/pocket-step1/<fingerprint>/` (not committed), written by `writeAtomic` under a name of its own per writer (review CT-1); the fingerprint frames each file and reads the lockfile and every `package.json` (review CT-9).
- Every calibration game checks the stamp of the tunables it plays, and a stamped bundle's dials are checked as the engine checks them, before any game (review NPC-1, NPC-3); the worker pool refuses a `pocket-1` bootstrap (review NPC-2).
- `POCKET_1_S1_PINS` (`packages/calibration/src/pocket/s1Pins.ts`, S-9): a later change that moves the `pocket-1.s1` stream fails `pocketS1Pins.test.ts` and must take a new rules name.
- The ADR-059 note, the franchise comments and test value (K18), this appendix, backlog entry 175 and the GUIDE's status paragraph.

### F.2 P2, P3 and P4 as approved

| petition | the edit (hunks) | the owner's typed yes | contracts-guardian, G0.1 | contracts-guardian, G0.4 | commit |
|---|---|---|---|---|---|
| P2 | `CheckKind` gains `"pass_rush_beat"`, and `RollDetail.die` gains `"uniform"` (2) | "Yes, make contracts edit P2", 2026-10-26 13:17:47Z | Approve, with modified doc wording and two more consumer rows | Approve, land as is | `3f81d93` |
| P3 | `CHECK` becomes a union keyed on `checkKind`: today's CHECK with its required roll, or a `pass_rush_tick` with `roll?: never; opposedRoll?: never; rollRef: string` (6) | "Yes, make contracts edit P3", the same time | Modify: the dieless arm also forbids `opposedRoll` and requires `rollRef`, which cuts the reads to guard from 44 to 40 | Approve, land as is | `e392792` |
| P4 | `RushApproach` (FREE, ARC, THROUGH, PUSH, BLOCKED), and `RUSH_THREAT.payload.approach?: Exclude<RushApproach, "BLOCKED">` (2) | "Yes, make contracts edit P4", the same time | Modify: the field's type excludes BLOCKED, so "never BLOCKED" is a compile error, not a test | Approve, land as is | `163a10b` |

- **The approved text** is `/mnt/project-files/design/ADR-089-step-1-contracts-edits.md`, byte-identical to the Orchestrator's `contracts-edits.md` (`cmp` at G0.4); it supersedes `petitions.md` wherever they differ. The guardian's reviews are `review-petitions.md` (G0.1; also in `/mnt/project-files/arms/pocket-fix/step1/`) and `review-g04.md` (G0.4): no blocking defect, and nothing that changed what a card said.
- **What changed under `packages/contracts`, and nothing else:** `src/events.ts` and `test/events.test.ts`. The source equals `20c5115` with the three appendix diffs applied in order; the test equals the settled `events.test.final.ts`; the emitted JavaScript is identical (13 files, `events.js` sha256 `067bb1fb…60e3`); the package went from 45 to 48 to 49 tests over the three commits. P-12 checks each of these mechanically at every proof run (F.7).
- **K18:** the guardian approved option (a) at G0.1 with three conditions (F11, list the stale texts; F12, pin the grammar by a test; F14, record the reasoning). All three are met in F.3. K18 needs no contracts edit.
- **The K2 ruling** (G0.1, question (i)): the `"uniform"` die word is part of P2, one yes naming two hunks of one mechanism (ADR-089:1211; P5's row at :1219 is the precedent). No "yes P2u" was asked, and the two-d100 form was not used.
- **The refuted INFERRED line.** ADR-089:1216 says P2's "`RollDetail` for a uniform rather than a d100 is confirmed by `contracts-guardian` (INFERRED)", that is, that the dice record could hold U as it stood. It could not. At `20c5115` `RollDetail.die` is the closed union `"d100" | "d20"` (`contracts/src/events.ts:21`), and the replay test rebuilds logged rolls by rolling that die again from its label (`engine/test/gameDeterminism.test.ts:76-80`). So writing U under "d100" would be false and would replay to another number; making U from a d100 face would change §4.1's clock (D1, below); and the two-d100 form would put a fake second contest in `opposedRoll`. One word was added to the dice record, `"uniform"`, inside P2. The guardian ruled this at G0.1, and the settlement recomputed the figures with step 0's `clocks.ts` (plan §16).
- **D1, the corrected K2 figure** (plan §16.6). With step 0's formula at theta 11, k 2, beta 0.5: if U = face / 100, face 100 gives U = 1 and a breaking time of 0, so at least 1 block in 100 breaks on the first tick at every margin (2 in 100 from margin 65), against 0.29% at margin 14 for the smooth draw, and face 99 gives 0.93 s at margin 14; if U = (face - 0.5) / 100, the shortest time at margin 14 is 0.66 s and no block below margin 37 can break on the first tick. A d20 gives 5% on the first tick at face / 20. The draft's 0.66 s was the second reading, unstated.
- **P2r and P3r** stand as filed (ADR-089:1231-1232): asked at step 5b only if shape L wins, removing `"pass_rush_beat"` and reverting P3, each with its own typed yes, so no kind is left without a producer. Neither is asked at step 1.

### F.3 K18, settled by option (a)

- **The format.** The save's `playedWith.engineRules` holds `<name>@<digest>`, for example `pocket-1.s1@fnv1a:69a7cc48`. `<name>` is a non-legacy name in `ENGINE_RULES` (only `pocket-1.s1` at step 1), taken from that list, not from a pattern, so later steps' names need no change here. `<digest>` is the bundle's overlay digest (O28): `fnv1a:` and 8 lowercase hex digits, as `stableDigest` prints it. The grammar is `^[a-z0-9.-]+@fnv1a:[0-9a-f]{8}$`, split at the last `@` (`saveRulesName` and `rulesOfSave`, `packages/calibration/src/pocket/rules.ts`). `legacy` is never written: an absent field or exactly `"legacy"` reads as `legacy` before any other rule, so every save that loaded at step 0 still loads. The identity, the batch provenance, the export file and `season --out` keep the name and the digest in two fields, as step 0 built them. Only the design bundle can be named by a save or an export at step 1.
- **The refusals**, each with its own `EngineRulesError` message and test (`test/engineRules.test.ts`, `test/seasonStamp.test.ts`):

  | the field | read as |
  |---|---|
  | absent, or exactly `"legacy"` | `legacy` |
  | `"pocket-1.s1"` | refused: it carries no overlay digest |
  | `"pocket-1.s1@xyz"`, `"@fnv1a:1a2b3c4d"`, `""` | refused as malformed |
  | `"legacy@fnv1a:…"` | refused with its own message: a legacy save carries no digest |
  | `"pocket-1.s9@fnv1a:…"` | refused: a name this version does not have |
  | `"pocket-1.s1@fnv1a:<another digest>"` | refused with its own message: not this build's dials |
  | `"pocket-1.s1@fnv1a:69a7cc48"` | `pocket-1.s1` |

  `season --load` with an `--engine-rules` that differs from the save's is refused with its own message (ADR-089:1321, "refused, not converted").
- **What the digest does not pin** is the code. `POCKET_1_S1_PINS` does (S-9): a commit that moves the `pocket-1.s1` stream under an unchanged digest fails a test, and the changed rules must take a new name. So K24's re-recording of `POCKET_1_S1_DIGEST` under the same name applies only while those pins hold (plan §16.4), and P3's parenthetical numbers for `pocket-1.s1` cannot go stale.
- **The five stale texts** (guardian F11). Each shows a bare rules name, and each is still true at its own layer, where the field is free text:
  1. `packages/contracts/src/save.ts:67-69` ("by name") and
  2. `packages/contracts/test/league.test.ts:64-67` (P1's round-trip value `"pocket-1.s1"`) wait for P16 at step 11, because nothing else under `packages/contracts` may change at step 1. P16's text must describe `<name>@<digest>`.
  3. `packages/franchise/src/save/save.ts:51` (the example),
  4. `:152` (the comment "is a rules name") and
  5. `packages/franchise/test/save.test.ts:59-60` (a test value; items 3 to 5 at their lines at `20c5115`) were brought up to date by `franchise-engine` in `206640f` (cherry-picked from `a58626c`, its parent chain on the branch): two comments and one test value, with no change to franchise behaviour (402 tests before and after).
- **Why one parseable string is acceptable** (guardian F14). It puts two facts in one string, the pattern `CHECK.rollRef`'s doc warns against (`contracts/src/events.ts:324-325` at the head; `:269-271` at `20c5115`, before P2 to P4 moved it). It is acceptable here because the field is free text by contract (`contracts/src/save.ts:63-69`); franchise only checks that it is a non-empty string and keeps it as given (`franchise/src/save/save.ts:153-159` and `:107` at the head; `:152-156` and `:106` at `20c5115`); and only calibration writes or parses it, in one module, with F12's tests as the guard: every `ENGINE_RULES` name matches `/^[a-z0-9.-]+$/`, so none can hold an `@`; `rulesOfSave({ engineRules: saveRulesName(r) })` is `r` for each non-legacy `r`; and `saveRulesName("legacy")` is `undefined` (`test/engineRules.test.ts`).

### F.4 The readings O20 to O34, and the review rulings

The Orchestrator's readings (plan §12), shown to the owner, not asked, as built:

| id | reading | as built |
|---|---|---|
| O20 | "written on `PLAY_START`'s engine payload" (ADR-089:449) is on `PASS_PLAY_V1` only at step 1 | `PassPlayStartPayload.rules` on pass plays only; run and kick payloads unchanged |
| O21 | a rep whose T is past `clock.maxTick` has no beat tick, so no window | as read: in the golden suite under A1, 1,933 of 2,750 POWER reps at 1 to 14 had no beat tick, and every tick they reported is the one `clocks.ts` gives, with no window tick |
| O22 | the beat CHECK carries the rep's margin and tier, no band, empty `testsAttrs`, `rollRef` the rep | as read; `resultBands.test.ts` declares `pass_rush_beat` a timing draw (no band, no target) |
| O23 | "joint" is the block clock with "beaten is not pressure": A3 and A4 the clock alone, A9 and A10 beaten alone, A5 to A8 joint | as read; the tension with "only under L" (ADR-089:1003) stands: A9 and A10 run Heels and Past only on the legacy clock, as the interaction's "alone" arms, labelled information |
| O24 | Heels: BEATEN floor CLEAN and GAINING's delta 0; Past only: also BEATEN's delta 0; at R 5 and R 8 | arms A5 to A8 |
| O25 | the pricing arms are A1, A4 and A3 with the hold (A11, A12, A13), with the base with the hold (A14) as their reference | as read; A14 is printed against A0 |
| O26 | `--engine-rules` on `season` and `export-game`, the design bundle only | as read |
| O27 | A15 is revision 1's S late setting less its coin, on seed set 2, context only | as read; its base is A0b |
| O28 | an overlay digest is `stableDigest` of the effective tunables less the `engineRules` key; the name names the code, the digest the dials; every arm with a block carries `pocket-1.s1` and its own digest; legacy-clock arms carry no stamp | as read; `POCKET_1_S1_DIGEST` `fnv1a:69a7cc48` |
| O29 | only the card's approach is built at step 1 | `RUSH_THREAT.approach` only; from, side, speed, timing and sight wait for the steps that first read them |
| O30 | `collect.ts`'s pass-block win rows, `bandCensus` and `pocketChannelShares` need no code change; under S their rows are printed apart, labelled "a pre-beat tick is a capped margin, not a rep outcome" | as read |
| O31 | no NFL graded row is scored at step 1; the miss rule classes nothing and prints its n | as read: the `s1.*` clauses and the guard are graded as filed |
| O32 | the guard's bases are A0 for A1 to A10, A14 for A11 to A13, A0b for A15 | as read; see F5 and M9 below |
| O33 | `s1.falsifier.pressure45` is graded on A1 to A4 and printed on the rest | as read |
| O34 | `s1.window.ticks` covers every POWER rep at 1 to 14 of every arm with the window (A1, A11), and the golden suite | as read: 40,355 reps in the arms and 2,750 in the golden suite, 0 failures |

**The ruling on review findings F1 and F2** (the fidelity review, held by the fix stream as a blocker, `build-fix.md`). The ADR's own texts disagreed on PUSH under shape L: §4.0's table row (POWER at 1 to 14 is PUSH, POWER at 15 or more THROUGH) and the owner note at ADR-089:393 ("a dominant bull rusher (margin 15 or more) is labelled THROUGH") against the L sentence at :393 and :1003 ("a POWER rep that reported BLOCKER_BEATEN before it reported RUSHER_WINS_REP"). The build had followed the L sentence alone. **The Orchestrator ruled option (b):** under shape L, a POWER won rep is PUSH only when its latent margin is in the card's PUSH range (1 to 14 in `pocket-1.s1`) **and** it reported BLOCKER_BEATEN before the win; any other POWER won rep under L takes the card's "any other won rep" row (THROUGH, or ARC on the edge). Shape S is unchanged: the range alone decides.

- **Why:** it is the one reading under which all three texts of the approved design hold together; it keeps what the owner was told and their own picture of the bull rush (two-moments situation (d), question 16); and it makes S's PUSH and L's PUSH one quantity.
- **What it changed:** the engine's `approach.ts` and calibration's mirror together, with tests (`c9fa929`; the mirror's row is renamed `POWER_1_TO_14_BEATEN_FIRST`), and the PUSH-ticks row's definition and construct text (`7b27840`, F2). No contracts text, no filed band or clause, and no default play changed.
- **Before and after**, the first 20 flat games of seed set 1, every POWER won-rep threat: A1 (S) 7 PUSH before and 7 after; A3 (L, R 5) 485 before and 6 after; A4 (L, R 8) 226 before and 2 after. Of A3's 479 labels at margin 15 or more, 478 moved to THROUGH and 1 to ARC; of A4's 224, 223 to THROUGH and 1 to ARC. Threats per arm were unchanged (A1 850, A3 1,558, A4 1,026), and the derived and published labels disagreed 0 times before and after. S-1 at `7b27840`: A1's and A2's digests did not move; A3's and A4's moved with every event count identical, so only the published label changed, not what was played.
- **Step 1's count of L's live won-rep PUSH reps is taken under this reading** (F.8).
- **An observation from the ruling run** (no bearing on the ruling): the fidelity review's split script `lpush2.ts` read `e.type` on `EventEnvelope`s (`{ seq, at, event }`), so it found no `PLAY_START` and so no stunt penetrator. The ruling's script tags A3's 83 THROUGH reps at 15 or more with BEATEN first, and A4's 33, as penetrators (row 2, ahead of row 5). The review's inference that those reps were memoised before their BEATEN tick may therefore not hold; a corrected `lpush2` was not run.

**The review items declined, recorded here as their reviews asked:**

- **F4** (fidelity). A change staged but not committed reads as a clean tree in the arm stamp: `gitTree.ts` compares the fingerprinted files with the index, not with HEAD's tree, so a run with staged changes is stamped with HEAD's commit and `dirty: false`, and if those changes are committed later the stamp names the wrong commit. Declined, because the fix the review names (`git diff --cached --quiet` in the package script) needs a `package.json` change, which P-12 refuses, and `carryForward.test.ts` forbids `child_process` in `src/`. The gap is printed in every step-1 report header ("a change staged and not committed is not seen"), and the cache is keyed by content, so no stale bytes can be reused; only the `commit` attribution can be wrong. The review's remaining fix is a runbook step: run `git diff --cached --quiet` before a filing run.
- **F5, with M9** (fidelity; measurement). Plan O32's rationale says "the same non-clock patches", but its own mapping and the §9.3 table guard A5 to A10 against A0, which has none. So A9's and A10's guard rows read the patch alone (what those arms are for), and A5 to A8's read the clock and the patch together. The build follows the mapping, which ADR-089:1306 ("over base (same league, same seeds)") admits. No code change; O32's wording should read "A0 for A1 to A10, without their patches".
- **F6** (fidelity). The penetrator set is every stunt in `preSnap.stunts`, including a stunt that `resolveStunts` skips, so a skipped stunt's penetrator who then wins a straight rep is labelled THROUGH by row 2 where rows 4 to 6 would give ARC or PUSH. The label is publish-only at step 1, and the engine and calibration agree (0 disagreements). Its frequency was not measured. If the literal reading is wanted, the engine and calibration must read the resolved stunts together.

Of the 31 review findings, 24 were fixed in sixteen commits, F1 and F2 were ruled as above, and five were declined: F4, F5, F6 and M9 as above, and CT-10 as refuted by a run; `build-fix.md` lists each.

### F.5 The reader list as built

ADR-089:416 lists the readers of a `pass_rush_tick`'s roll that change at step 1. As measured and built:

- **Four of its lines were contradicted** (risk K1). It says only the plain-optional form breaks the generic reads `engine/test/determinism.test.ts:197`, `:216`, `:325` and `eventVocabulary.test.ts:567`. They break under the union too, because a read that does not narrow the kind sees `RollDetail | undefined` under any typing. All four are among the 40 sites below and are guarded.
- **Five files postdate its list:** step 0's `calibration/src/pocket/approach.ts`, `pocket/m2ForcingSource.ts`, `pocket/throwClass.ts` and `test/pocketApproach.test.ts`, and ADR-087's `season/participation.ts`.
- **40 compile sites, on 40 lines in 18 files** (lines at `20c5115`; the guardian's G0.1 count under the approved P3; reproduced exactly by the forward build's census with the three diffs applied, `build-forward.md` §3). Each got the kind-first guard before P3 landed (`8d30012`, `5668ed2`, `bbd05ea`): only a `pass_rush_tick` may lack a roll, and any other kind without one throws, or, in the viewer, shows "missing roll".

  | where | sites | lines at `20c5115` |
  |---|---|---|
  | `engine/src/debug/renderPlay.ts` | 6 | `:528`, `:547`, `:568`, `:749`, `:769`, `:807`, through one helper, `formatCheckRoll` |
  | engine tests, 11 files | 25 | `attrReferences:49`; `blitz:353`, `:363`, `:668`, `:763`, `:799`, `:881`, `:983`; `chemistry:155`; `determinism:197`, `:216`, `:325`; `eventVocabulary:131`, `:541`, `:567`; `gameDeterminism:124`; `renderPlay:431`, `:529`; `rollAccounting:147`, `:283`, `:325`; `throwaway:45`; `tunablesThreading:99`; `yac:137`, `:243` |
  | calibration, 5 files | 7 | `knownTruth/ladderOccupancy.ts:510`, `:511`; `pocket/approach.ts:187`; `pocket/throwClass.ts:298`, `:299`; `test/participation.test.ts:124`; `test/pocketApproach.test.ts:183` |
  | the viewer | 2 | `apps/game/src/playDetail.ts:301`, `:302` |

  Plus P2's one compile site, `calibration/src/knownTruth/scaleSurface.ts:225` (the `SURFACE` record gains the new kind's descriptor, in `3f81d93`). The petitioned plain-optional form would have broken 71 lines in 24 files; the petitioned union, before the guardian's tightening, 44 reads on 43 lines in 20 files.
- **The three readers whose meaning changed without a compile break** (guardian F9):
  1. `engine/src/debug/renderPlay.ts:375-385` (the line-battle table; `renderLineBattle`, `:386-433` at the head). It skipped any tick with no `opposedRoll`, so it would have dropped a dieless tick silently. E-a made it print one deliberately ("Tick 1.0: block clock, no die → STALEMATE (0)") and E-b added the beat's row; `renderPlay.test.ts` covers both.
  2. `calibration/src/pocket/m2ForcingSource.ts:344-348`. M2's jitter check counts a dieless tick as a jitter mismatch. That is right for an instrument of legacy streams, and no `pocket-1` stream reaches M2: the step-1 folds do not include `foldM2Game`.
  3. `calibration/src/season/participation.ts:94-96`. It skips a CHECK with no `opposedRoll` or with a `rollRef`, so it skips a dieless tick, which is right.
- **The other readers ADR-089:416 names, as built:** `sim/passPlay.ts:840`'s threat `rollRef` names the beat under S; the two `RUSH_THREAT` joins (`rollAccounting.test.ts:147`, `eventVocabulary.test.ts:131`) take the beat's label under S; `passRushRepRollRef.test.ts` asserts the join tick to beat to rep; `ladderOccupancy` skips a dieless tick; `collect.ts`'s pass-block win rows, `bandCensus` and `pocketChannelShares` read the published band and margin unchanged (O30); and `determinism.test.ts`'s BEATEN-and-GAINING assertion is kept for `legacy` and L, with its S verdict in F.8.

### F.6 Every arm against its clause

From the committed report, seed set 1 (seed set 2 for A15 and A0b), both leagues, flat then gen. Figures are pressure / hit-or-sack / sacks per 100 dropbacks / release in seconds; time to throw equals release in every arm at step 1. "Guard" is `guard.mix` and `guard.byClass`, graded against the arm's base (O32).

| arm | what; role; base | graded clauses | reported |
|---|---|---|---|
| A0 | legacy; base | none (structural `s1.falsifier.offBytes`: 45 of 45 filed base rows equal on both leagues, **PASS**) | 86.85 / 20.05 / 16.43 / 1.242, 85.26 / 24.04 / 16.72 / 1.235 (the filed base) |
| A1 | S with the window; design; A0 | `s1.S.pressure` 28 to 40.2633: 31.81, 33.05 **PASS**; `s1.S.sack` 2 to 4: 2.70, 2.80 **PASS**; `s1.S.release` 1.5 to 1.7: 1.589, 1.666 **PASS**; `pressure45`: **PASS**; `s1.window.pressure` (A1 minus A2, within 0.2633 points): +0.278, +0.245 **FAIL** (flat); `s1.window.sack` (within 0.3): +0.002, -0.006 **PASS**; guard **BREACH** | `s1.expected.sack` basis 2.4: 2.70, 2.80 |
| A2 | S without the window; information; A0 | `pressure45`: 31.53, 32.80 **PASS**; the window clauses with A1; guard **BREACH** | M1 recomputed on A2's streams: B1 0.3798 and 0.4261 points |
| A3 | L at R 5; design point, provisional; A0 | `pressure45`: 74.55, 75.35 **FAIL**; `floorCounter` (at most 10% of first dirt): 66.04, 66.94 **FAIL**; guard **BREACH** | `s1.L5.pressure` direction UP, above A4: holds on both |
| A4 | L at R 8; priced point; A0 | `s1.L8.flat.pressure` 33.5 to 39.5: 66.42 **FAIL**; `s1.L8.gen.pressure` 36.71 to 42.71: 69.01 **FAIL**; sacks 2.50 (1.91 to 2.91), 2.51 (1.94 to 2.94) **PASS**; release 1.603 (1.54 to 1.64), 1.650 (1.601 to 1.701) **PASS**; `pressure45` **FAIL**; `floorCounter`: 62.18, 64.08 **FAIL**; guard **BREACH** | `s1.L8.*.hitOrSack` basis 2.86, 3.40: 2.94, 3.34 |
| A5, A6 | L8 with Heels; L8 with Past only; information; A0 | guard **BREACH** | A5 36.50 / 2.86 / 2.41 / 1.590, 39.71 / 3.40 / 2.44 / 1.651; A6 32.02 / 2.87 / 2.43 / 1.588, 34.74 / 3.41 / 2.45 / 1.651 |
| A7, A8 | L5 with Heels; L5 with Past only; information; A0 | guard **BREACH** | A7 47.78 / 4.66 / 3.70 / 1.538, 51.19 / 5.80 / 3.95 / 1.581; A8 44.38 / 4.71 / 3.75 / 1.537, 47.35 / 5.77 / 3.89 / 1.579 |
| A9, A10 | Heels alone; Past only alone, on the legacy clock; information (O23); A0 | guard **BREACH** | A9 82.55 / 20.25 / 16.57 / 1.241, 81.42 / 24.13 / 16.63 / 1.234; A10 82.32 / 20.28 / 16.60 / 1.241, 81.17 / 24.09 / 16.60 / 1.233 |
| A11 | A1 with the hold; pricing arm; A14 | guard **BREACH** | 44.66 / 7.57 / 6.18 / 2.739, 44.28 / 10.57 / 7.55 / 2.695 |
| A12, A13 | A4 and A3 with the hold; pricing arms; A14 | guard **BREACH** | A12 89.35 / 7.47 / 6.19 / 2.628, 89.00 / 9.91 / 7.27 / 2.558; A13 91.95 / 11.30 / 8.91 / 2.475, 91.59 / 16.50 / 10.98 / 2.403 |
| A14 | the base with the hold; pricing reference | none | 96.12 / 39.18 / 34.84 / 2.396, 95.87 / 56.45 / 46.18 / 2.250 |
| A15 | revision 1's S late setting less its coin, seed set 2; context (O27); A0b | guard **BREACH** | 34.49 / 4.26 / 3.40 / 2.809, 35.25 / 6.30 / 4.47 / 2.799, beside Appendix B's gen "Later" 33.85 / 5.69 / 2.47 |
| A0b | legacy with the hold, horizons, Heels and late, seed set 2; base of A15 | none | 90.84 / 40.46 / 35.67 / 2.471, 90.52 / 58.93 / 48.06 / 2.314 |

- **The structural clauses all pass**, so there is no build fault: `s1.falsifier.offBytes` (above); `s1.falsifier.lToday` (A3, A7, A8, A13: 7,498 ticks at t of R or later checked field for field, 0 failures); `s1.window.ticks` (A1 and A11: 40,355 reps; cases two 11,673, one 294, none 108; 3,529 GAINING and 2,820 BEATEN window ticks played; A2 and A15: 0 window ticks); `s1.window.noDie` (0 rolls name the window; 0 jitter rolls under S; 1,255,559 uniform rolls for 1,255,559 beats); S-4 (17,865,774 margins rebuilt, 0 failures); S-7 (5,110,589 cases, 0 failures); S-8 (847,351 threats, 0 disagreements); the eight `guard.reported.*` rows and `guard.removedClass`.
- **The guard** breaches in all 14 arms that have a base, on both seed sets: on the first set 28 of 28 arm-league verdicts breach (league-wide in 22, by class in 27), and on the re-plays of the other set 28 of 28 again (league-wide 22, by class 28). The run's own set's figures, with each verdict's SE and z, are in the report's guard section. The other set's are below, as the 14 re-play records print them (`measure/replay/<arm>-<base>-set<n>.md` in the Orchestrator's step-1 working folder, not committed; each run `--arms <arm>,<base> --seed-set <n>`, "0 structural failure(s), 0 graded clause failure(s), 2 guard breach(es)"), in points per 100 aimed throws, SE and z as the report defines them (context only; the verdict is the filed rule):

  | arm | base, seed set | flat: rise / allowed / SE / z, league-wide; the classes that breach | gen: the same |
  |---|---|---|---|
  | A1 | A0, set 2 | 0.82 / 0.20 / 0.12 / +5.31, BREACH; RANK_PUSHED, DESPERATION, ON_THE_RUN | 0.69 / 0.37 / 0.25 / +1.28, BREACH; PROGRESSION, RANK_PUSHED, DESPERATION, ON_THE_RUN |
  | A2 | A0, set 2 | 0.83 / 0.20 / 0.12 / +5.36, BREACH; RANK_PUSHED, DESPERATION, ON_THE_RUN | 0.68 / 0.37 / 0.25 / +1.27, BREACH; PROGRESSION, RANK_PUSHED, DESPERATION, ON_THE_RUN |
  | A3 | A0, set 2 | 0.61 / 0.17 / 0.11 / +3.86, BREACH; RANK_PUSHED, DESPERATION | 0.02 / 0.29 / 0.24 / -1.10, passes; RANK_PUSHED |
  | A4 | A0, set 2 | 0.76 / 0.22 / 0.12 / +4.63, BREACH; RANK_PUSHED, DESPERATION, ON_THE_RUN | 0.14 / 0.37 / 0.24 / -0.93, passes; ON_THE_RUN |
  | A5 | A0, set 2 | 0.81 / 0.20 / 0.12 / +5.27, BREACH; RANK_PUSHED, DESPERATION, ON_THE_RUN | 0.58 / 0.36 / 0.25 / +0.88, BREACH; PROGRESSION, RANK_PUSHED, DESPERATION, ON_THE_RUN |
  | A6 | A0, set 2 | 0.82 / 0.20 / 0.12 / +5.28, BREACH; RANK_PUSHED, DESPERATION, ON_THE_RUN | 0.71 / 0.36 / 0.25 / +1.40, BREACH; PROGRESSION, RANK_PUSHED, DESPERATION, ON_THE_RUN |
  | A7 | A0, set 2 | 0.58 / 0.16 / 0.11 / +3.65, BREACH; RANK_PUSHED, DESPERATION, ON_THE_RUN | 0.38 / 0.28 / 0.25 / +0.41, BREACH; RANK_PUSHED, DESPERATION |
  | A8 | A0, set 2 | 0.67 / 0.16 / 0.12 / +4.40, BREACH; RANK_PUSHED, DESPERATION, ON_THE_RUN | 0.44 / 0.28 / 0.25 / +0.62, BREACH; PROGRESSION, RANK_PUSHED, DESPERATION |
  | A9 | A0, set 2 | 0.06 / -0.00 / 0.12 / +0.54, BREACH; PROGRESSION, RANK_PUSHED, CHECKDOWN, ON_THE_RUN | 0.17 / 0.00 / 0.26 / +0.64, BREACH; PROGRESSION, RANK_PUSHED, CHECKDOWN, DESPERATION, ON_THE_RUN |
  | A10 | A0, set 2 | 0.08 / -0.00 / 0.12 / +0.69, BREACH; PROGRESSION, RANK_PUSHED, CHECKDOWN, ON_THE_RUN | 0.17 / 0.00 / 0.26 / +0.66, BREACH; PROGRESSION, RANK_PUSHED, CHECKDOWN, ON_THE_RUN |
  | A11 | A14, set 2 | 0.73 / 0.44 / 0.18 / +1.65, BREACH; RANK_PUSHED | 0.89 / 0.53 / 0.35 / +1.04, BREACH; RANK_PUSHED, DESPERATION |
  | A12 | A14, set 2 | 0.21 / 0.37 / 0.17 / -0.93, passes; ON_THE_RUN | 0.24 / 0.47 / 0.35 / -0.68, passes; DESPERATION, ON_THE_RUN |
  | A13 | A14, set 2 | 0.12 / 0.21 / 0.17 / -0.54, passes; CHECKDOWN, ON_THE_RUN | 0.13 / 0.29 / 0.35 / -0.47, passes; DESPERATION, ON_THE_RUN |
  | A15 | A0b, set 1 | 0.93 / 0.42 / 0.16 / +3.07, BREACH; RANK_PUSHED, DESPERATION | 0.69 / 0.58 / 0.34 / +0.33, BREACH; RANK_PUSHED |

  On the same re-plays the window's price, A1 minus A2 (from the A1 and A2 records' measures), is +0.268 pressure points on flat and +0.272 on gen, each just above the one filed B1, 0.2633. No re-play grades the window clauses, which need A1 and A2 in one run (review M5; the A1 re-play prints them n/a), so this is information, not a graded failure; over the four league-sets the price is +0.278, +0.245, +0.268 and +0.272.
- **The interaction**, joint minus (clock alone + beaten alone - base), on pressure: A5 -25.62 flat and -25.46 gen; A6 -29.86 and -30.18; A7 -22.47 and -20.31; A8 -25.64 and -23.91, beside pkA's -25.3 (REPORTED, ADR-089:1333; pkA is flat only and not like for like). On sacks the two are nearly additive (within 0.3 points), as ADR-089:1333 says.
- **The window's price** (A1 minus A2): +0.278 pressure points on flat, +0.245 on gen, against the one filed B1, 0.2633 (gen set 1; flat's own B1 is 0.2134). The window-only dirt in A1, dropbacks whose only dirt follows a played window tick, is 0.264 points on flat (135 of 51,165, Poisson SE 0.023) and 0.250 on gen (71 of 28,361, SE 0.030): about the whole price.
- **P2S** (reported, never graded; PR #33 is open, so both references print): A1 8.50 and 8.46, A2 8.57 and 8.54, A3 5.14 and 5.10, A4 3.76 and 3.63, against 22.02 (PR #33, held) and 15.46 (main).

### F.7 The proofs, with times

**At `206640f`, the integrated head** (`proofs.md`; one driver in the background on 4 vCPU, 2026-10-26 17:24:40Z to 18:03:42Z; wall seconds):

| proof | what | exit | time |
|---|---|---|---|
| P-1, P-1b | golden pins v1 to v7 on both leagues, in two processes: 16 of 16 each | 0, 0 | 104 s, 103 s |
| P-1c | the season path pins: 6 of 6 | 0 | 51 s |
| P-2 | `docConformance` at census `fnv1a:365da48d`: 26 of 26 | 0 | 4 s |
| P-3 (a), P-4, P-5 | `adr089Base` and `pocketLegacyShape`: `fnv1a:395a9ae2` and `fnv1a:365da48d`; baseline-0009's 35 values exactly, 86.85 / 20.05 / 16.43 / 1.242; the generated league 85.26 / 24.04 / 16.72 / 1.235; the legacy stream's shape on all 50 games a league | 0 | 152 s |
| P-3 (b) | the baseline tool on this tree, then the new carry-forward against baseline-0009's (only `engineCommit` differs; no `engineRules`) | 0, 0, 0 | 64 s, 151 s, 0 s |
| P-5r | the real rows on the cache: 66 of 66 | 0 | 7 s |
| P-6 | the clean bench: 5 of 5 | 0 | 97 s |
| P-7 | step 0's command re-fills a fresh pending filing byte-identical to the committed one (`FILED_DIGEST` `fnv1a:9a1c90e9`), and its `--out` equals step 0's | 0 | 344 s |
| P-8 | `pnpm install --frozen-lockfile && pnpm verify`: build, test, typecheck all exit 0 | 0 | 631 s |
| P-9 | `adr089Surface`, `adr089Filed`, `adr089Comparators`, `pocketBands`: 70 passed, 4 skipped | 0 | 5 s |
| P-10 | the line bench: 5 of 5 | 0 | 8 s |
| P-11 | the one-threat bench: 5 of 5 | 0 | 29 s |
| P-12 | git order, contracts scope and emit, other packages, randomness (6 hits, all listed; 0 `Math.random`), the ADR's first 2,197 lines, `git status` | 0 | 2 s |
| P-13 | every CLI save, `--out` and export byte-identical to `20c5115`'s, at a worktree of the base | 0 | 81 s |
| P-14 | the engine suites that pin legacy behaviour: 222 of 222 | 0 | 18 s |
| P-15 | the gated knownTruth ladder census, `FF_LADDER=1 … test ladderOccupancy` | **1** | 68 s |
| S-1 | the golden 50 a league under A1 to A4, two processes, byte-identical | 0 | 269 s |
| S-engine | `rollAccounting`, `beatClock`, `passRush`, `eventVocabulary`: 108 of 108 | 0 | 17 s |
| S-stream | `FF_POCKET_ON=1 … test pocketStep1Stream`: 11 of 11 | 0 | 137 s |

**P-15 is satisfied as a no-change proof, by an unchanged census** (the Orchestrator's ruling). `ladderOccupancy.measure.test.ts` fails one test at the head with 131 `pass_rush_tick` cells (d100 against d100, shifts -74 to 57, worst z 27.82), and the same command at a worktree of `20c5115` fails the same way: the same 131 cells, and the whole 384-line census report byte-identical on the two trees. So its gate was red before step 1, and step 1's edits to `ladderOccupancy.ts` change no ladder output on a legacy stream (the non-gated suite passes 17 of 17). The red gate is recorded as a finding in backlog entry 175, not fixed here.

**After the review fixes** (`build-fix.md`): at `f36b42f`, P-1 (16 of 16), P-14 (222), the engine ON suites (108), P-9 (70 passed, 4 skipped), the stream suite (12 of 12) and S-1 (132 s and 129 s, identical to the pre-fix digests) exit 0, and `pnpm verify` exits **1**: `eb1c71a`'s CT-3 rule left `pocketApproach.test.ts` red (1 failed of 1,550), and every commit up to `f36b42f` with it, because the per-commit runs did not include that file. `dc640c9` fixes the test; no history was rewritten. At `dc640c9`: `pnpm verify` 0; P-12 0; P-3 (a) 0 (143 s); P-13 0 (76 s). P-15 was not re-run (the ruling above).

**After the ruling** (`build-ruling.md`, at `7b27840`): engine ON with `approach` and `pocketRules` 155 of 155 (14 s); calibration approach 70 passed, 4 skipped (22 s); P-9 0 (4 s); `pnpm -r typecheck` 0 (21 s); P-12 0 (2 s; a copy of the script with its output folder moved); the stream suite 12 of 12 (121 s); P-1 16 of 16 (81 s); S-1 0 (231 s; A1 and A2 unmoved, A3 and A4 moved, sha256 `093ead5d…` in both processes); `pnpm verify` 0 (530 s).

**The measurement** (`measure.md`, at `0a2eb41` and `c45acae`): the S-9 digests at `7b27840` (116 s) byte-identical to the ruling run's; `pocketS1Pins` 10 of 10 (29 s), and 10 of 10 under `FF_POCKET_ON=1` (129 s), failing when a pin or a stamp is changed; the 17 arms in three shells at once from 21:28:17, 876 s, 864 s and 785 s (fingerprint `7689307642ed08e0`), and a re-run of one shard from the cache gave identical reports; S-1b, A1 alone in a fresh process with an empty cache, 202 s (A1 played in 199 s), its record identical to the shard's; the 14 guard re-plays on the other seed set, 96 s to 289 s each, every one "0 structural failure(s), 0 graded clause failure(s), 2 guard breach(es)"; the digests again at `0a2eb41` (124 s), identical; and at `c45acae` the golden pins, the census and `FILED_DIGEST` (108 s), `pocketStep1Stream` under `FF_POCKET_ON=1` (148 s), all exit 0.

**This record** ran, on its own text before its commit: the prefix `cmp` of the ADR's first 2,197 lines against `20c5115`, P-9, `docConformance` with `knownTruth`, P-12 and `pnpm verify`. Their results are in the record commit's message.

### F.8 What goes back to the owner

1. **Five graded predictions failed. They are reported as filed: no band moved, nothing was re-filed, nothing was tuned.**
   - `s1.L8.flat.pressure`: A4 66.42 against 33.5 to 39.5.
   - `s1.L8.gen.pressure`: A4 69.01 against 36.71 to 42.71.
   - `s1.falsifier.pressure45`: A3 74.55 and 75.35, A4 66.42 and 69.01, above 45 (A1 and A2 are under it on both leagues).
   - `s1.falsifier.floorCounter`: A3 66.04 and 66.94, A4 62.18 and 64.08 (% of first dirt), above 10.
   - `s1.window.pressure`: A1 minus A2 is +0.278 points on flat, outside 0.2633 (gen +0.245, inside).

   A finding on the L8 basis, which changes no clause. The filed L8 prediction is pkA's arm A12 (ADR-089:1005, "REPORTED basis, pkA A12"), flat 36.50 / 2.86 / 2.41 / 1.590 and gen 39.71 / 3.40 / 2.44 / 1.651, and pkA's own results name that arm: "A1 is the rep clock alone at R = 8; A12 adds beaten-not-pressure" (`/mnt/project-files/arms/pocket-fix/design-wip/round1/designA.json`, read-only). Step 1's A5 (L8 with Heels) reproduces pkA's A12 on all eight numbers and P2S at the printed precision (P2S 6.61 and 6.14), and A4 (L8 with today's BEATEN floor and counter, question 1, Today) reproduces pkA's A1 the same way (flat 66.42 / 2.94 / 2.50 / 1.603, gen 69.01 / 3.34 / 2.51 / 1.650, P2S 3.76 and 3.63). A0's 86.85 less A4's 66.42 is pkA's "clock alone" -20.4 (ADR-089:1333) at one decimal. So `s1.L8.*.pressure` was filed from the arm that adds beaten-not-pressure and is graded on the clock alone; the L8 sack, release and hit-or-sack rows sit close to the basis either way.
2. **A guard breach in every arm that has a base, on both seed sets** (F.6). Under ADR-089:1306 the step stops and both sets' numbers come to the owner, who decides whether to reorder anything; the merge card is not posted while it stands. Context, not a verdict: the filed rule allows no rise beyond the mix-predicted rise. A9 and A10 (Heels and Past only on today's clock) have an allowed rise of about 0.00, because their release mix does not move, so noise breaches them (league-wide rises 0.00 to 0.17 points per 100 aimed throws, z +0.01 to +0.69). A1's and A2's flat rises are not noise-sized: z +2.75 and +2.84 on the run's set, +5.31 and +5.36 on the other (A1 flat +0.53 and +0.82 points against an allowed 0.20). The other S readings are smaller: on flat A11 and A15 run z +1.54 to +3.07, and on gen the S arms (A1, A2, A11, A15) run z -0.37 to +2.19 over both sets.
3. **A3's and A4's live won-rep PUSH counts, the basis of the named amendment that files L's PUSH-ticks band before step 5b** (ADR-089:1160; clause `acc.liveWonRep.push`). `clean_with_live_won_rep_push_ticks` is **0 on both leagues for A3 and for A4** (and for A0, A1 and A2), counted under F1 option (b) (F.4). Beside it: the live won-rep clean rate is A3 0.013% and 0.015% of ticks and 0.018% and 0.017% of dropbacks, A4 0.015% and 0.004% of ticks and 0.025% and 0.007% of dropbacks (flat, gen); the published PUSH labels over the full corpora are A1 362 and 205, A3 120 and 71, A4 7 and 13.
4. **The stock-fixture verdict of the BEATEN-and-GAINING assertion under S with the window: REFUTED.** ADR-089:416 and :462 say the determinism assertion that BEATEN and GAINING ticks occur "may pass again under S with the push window" (INFERRED). On the legacy case's own stock fixtures and seeds (`adr033-determinism`, 3 fixtures by 60 seeds, 180 plays) it does not: 0 BLOCKER_BEATEN ticks and 1 RUSHER_GAINING tick. `engine/test/determinism.test.ts` pins the verdict as the counts `{ beaten: 0, gaining: 1 }`, so a change that moves them must re-record it (`build-eb.md` §9). The window's two bands come only from its two ticks, which need a POWER rep at 1 to 14 whose beat falls inside a play still running one tick before it; the stock plays end too soon. The bands are asserted on a fixture built for them: `buildBullRushScenario` at 300 seeds gives both above 0.
5. **An observation:** `guard.onTheRun.clean` has 0 aimed throws in every arm, both leagues and both seed sets, so it prints n/a. Reading the code, not measured: the move branch that can choose ESCAPE runs only when `forcesDecision(tunables, pocket)` holds (`engine/src/sim/passPlay.ts:1312`), so no quarterback leaves a CLEAN pocket at step 1.
6. **Each departure from the plan that the build reports list:**

   | report | departures |
   |---|---|
   | `build-forward.md` (opening notes and §4) | commit 1's subject drops "`checkPayload` split by kind" (§16.2 deleted it); `gameDeterminism.test.ts`'s guard reads the kind from the CHECK or the PRESNAP_READ, because the narrowing does not survive the inner block; the dieless row prints its margin as "(15)", not "(+15)"; small tests added beyond the plan's file lists (`ladderOccupancy.test.ts`, `pocketThrowClass.test.ts`, `detail.test.ts`); the branch is `claude/pocket-fix`, not plan §10's `claude/pocket-step1` |
   | `build-contracts.md` §4 | `scaleSurface.test.ts`'s UNIMPLEMENTED list gains `pass_rush_beat`, as the approved consumer table says; the messages say "contracts-guardian: G0.4 approve, land as is"; commit 5's subject is the brief's ("a pass_rush_tick may carry no die, and only that kind"); no `git pull` (`origin` was at `20c5115`) |
   | `build-eb.md` §12 | `PocketRulesError` and `pocketRulesOf` are not on the barrel; `pocketRulesOf` validates more than listed (finite, positive, ordered, a non-empty digest, a name without `@`); `reportedMarginS` takes `clock` and `resolveBeatTick` takes `beat` and `move`; L's label is memoised at the matchup's first win; the threat's `rollRef` comes from `tickRollRef`; the renderer's beat row is its own wording; `rollAccounting`'s legacy coverage kinds are asserted under legacy only; the stock verdict is pinned as exact counts; the bull-rush fixture lives in `test/pocketTunables.ts`; the penetrator set includes skipped stunts (F6); under S a time-retired threat won again re-publishes TRAVELLING and RESET, as consecutive legacy wins do; the window cannot ride on an L bundle, by construction |
   | `build-kb1.md` §4 | `passRushRepRollRef.test.ts` asserts the S join, not legacy only; `runBatch` folds with the batch's tunables only when the rules are not `legacy`; the worker pool was left unchanged (it now refuses a `pocket-1` bootstrap, NPC-2); published labels carry the row `PUBLISHED`; L's PUSH row read no margin (superseded by the ruling, F.4); `runBatch` names the rules before its unnamed-patch refusal; `foldLadder` takes an optional skip tally |
   | `build-kb2.md` D1 to D20, E1 to E5 | `step0.ts:376` reads `rulesTunables(LEGACY_RULES)`, the same reference (D1); the stamp's `commit` and `dirty` come from reading `.git` directly and cannot see a staged change (D2, F4); the cache name is `<arm>.set<n>.json` (D3); the stamp adds `caller` and `corpus` (D4); timings go to stderr, never into a file (D5); a committed report is refused from a dirty tree or a dirty-stamped arm (D7); the fingerprint (D8); a one-arm `--out` (D9); A14 is read against A0 (D12); `offBytes` in the run, the OFF proof proper staying P-1 to P-15 (D13); pending fields checked before the digest (D14); `TunablePatch`'s type derived, not imported (D17); K14's assertion by a small lexer (D19); and E1 to E5, the engine's departures above as calibration met them |
   | `build-vb.md` | the approach words are chosen from §4.0's card; F was built as plan §16.4 says (two comments and a test value), not "comment only"; the stale note at `apps/game/test/log.test.ts:98-102` was left (backlog entry 175) |
   | `build-integrate.md` | no `git pull`, against CLAUDE.md's workflow line: the base was fixed and integration used local fetches only |
   | `proofs.md` | P-13's script was written again from step 0's case list; S-1 took about 135 s a run against the plan's 60 s; P-15 fails as above |
   | `build-fix.md` | five findings declined (F4, F5, F6, M9 above; CT-10 refuted by a run); `pocketApproach.test.ts` red from `eb1c71a` to `f36b42f`, fixed in `dc640c9` |
   | `measure.md` D1 to D3 | `POCKET_1_S1_PINS` also holds the folds of each league's first 10 games, which the suite case plays; S-1b ran beside the guard re-plays; the re-plays ran in three chains, each with `--report` and `--out` to scratch paths; the 17 arms took about 15 minutes in three shells, against the plan's 12 to 14 (INFERRED) |
   | the record (`7879522`) | plan §11's `CLAUDE.md` command lines were not in that commit: the record was written by a sub-agent, which does not change CLAUDE.md on another agent's instruction; the Orchestrator added them with F.9 |

### F.9 The Orchestrator's readings of the results

After the measure step, the Orchestrator had three independent readers and a synthesis check the guard, the source of the extra interceptions and shape L, read-only, on the cached arm records of both seed sets and the code (`investigate/` in the step-1 working folder, copied to `/mnt/project-files/arms/pocket-fix/step1/investigate/`). None found a build or measurement fault in any number: every guard rise and allowance on both seed sets was recomputed independently and matches the harness to 1e-16, and every L figure matches pkA's own file. These are readings, shown to the owner, not asked; no band, clause or pin moves.

1. **The guard's allowance is the filed rule.** §8's "about +1.1 to +1.4 ... every tested arm passes" described revision 1's runs, and all 15 of its non-base runs carried Appendix B's stand-in hold (`cfg.hold` budget 2, routes 1; release 2.48 to 2.84 s); re-folding them reproduces §8's allowances exactly. Step 1's arms run today's quarterback clock (A1's release 1.589 / 1.666 s), so the release mix barely moves and the allowance is small: A1 +0.20 flat, +0.34 gen. A11 (A1 with the hold) graded against A0, as §8's runs were, gets +1.39 / +1.30 and passes. The hold alone (A14) buys +0.96 / +0.76 of allowance and adds +0.06 / +0.03 of rise. So §8's room came from the hold's release shift, which the sim barely prices in interceptions.
2. **Which breaches are real.** Pooled over both seed sets, z = (z1 + z2) / sqrt 2. League-wide on flat, every block-clock arm (A1 to A8) breaches at pooled z +3.6 to +6.5, and A15 at +3.5; on gen, A1, A2 and A6 breach at +2.3 to +2.4. Noise: every A9 and A10 breach (allowance -0.001 to +0.001, rises +0.00 to +0.17, z at most +0.69), A7's and A8's gen breaches, A13 on flat, A11 on gen, and most single-class breaches. With class allowances of 0.1 to 0.6 against class SEs of 0.6 to 3.7 and no noise term, an arm with no real change breaches some class by chance about 97% of the time per league. The class signal that repeats is flat DESPERATION on eight clock arms (pooled z 2.1 to 3.4), read with item 4.
3. **The SE beside each verdict.** The report's note says the SE "reads high" because the arms share seeds. For the block-clock arms it is about the right size: the same arm and base on the two seed sets differ by about one SE (RMS z 0.92 over 28 arm-leagues). Only for A9 and A10, which change the game very little, does it read about twice too high (their rises' RMS z is 0.47). The note's wording is corrected in code at step 2's build (`report.ts:531`, `step1.ts:683`), not now, because any source edit moves the cache fingerprint and forces a full re-play.
4. **DESPERATION at step 1 holds clean-pocket expiry throws.** The filed class list names "must-act desperation throws in a dirty pocket" (ADR-089:1308). The build's DESPERATION is "nobody at the bar, thrown at must act at 25 or better", with no status test (`pocket/throwClass.ts`): the clean-pocket reader's own rule, under which the clean-expiry throws leave only at step 5a (D23). In a 64-game replay, flat DESPERATION was 108 dirty-pocket throws and 10 clean under A0, 67 and 131 under A1; gen 485 and 50 under A0, 292 and 436 under A1. So "flat DESPERATION rose" is not evidence that dirty-pocket desperation throws got worse. From step 2, a reported clean and dirty split of the class makes it readable.
5. **Where the extra interceptions come from.** No interception rule changed; more and cleaner balls reach the existing ones. A0 to A1, per 100 dropbacks unless marked:

   | league, seed set | INT | INT per 100 aimed | sacks | sacks plus INT | completions |
   |---|---|---|---|---|---|
   | gen, 1 | 5.03 to 6.58 | 6.80 to 7.67 | 16.72 to 2.80 | 21.75 to 9.38 | 27.98 to 36.17 |
   | gen, 2 | 5.38 to 6.79 | 7.06 to 7.74 | 16.74 to 2.81 | 22.13 to 9.60 | 29.15 to 37.34 |
   | flat, 1 | 1.29 to 2.01 | 2.11 to 2.64 | 16.43 to 2.70 | 17.71 to 4.71 | 24.61 to 34.79 |
   | flat, 2 | 1.16 to 2.07 | 1.88 to 2.71 | 16.70 to 2.68 | 17.86 to 4.74 | 24.78 to 34.72 |

   The mechanism, from a replay of 64 gen and 32 flat games an arm and the code: sacks become aimed throws; more dropbacks reach the decision roll with two or more men in the pool, so rank-pushed throws per dropback rise about 78%, onto windows of about 22, 85% of them contested; checkdowns fall (gen share 34.9% to 15.6%), because the outlet is looked at only when the decision is forced (`engine/src/sim/passPlay.ts:1195-1229`); and misses fall (23.5% to 17.2% of aimed throws), while a miss is the one throw no rule can intercept (`:1591-1594`). By source, gen's rise is mostly tipped balls (+0.77 of +0.87 per 100 aimed on set 1, +0.50 of +0.68 on set 2: the tip-recovery order traced in `INTDOC`), and flat's is contested catches (+0.47 of +0.53, and +0.66 of +0.83). A natural experiment in the arms supports the "clean pocket, accurate ball, ball picked" channel: A4 and A5 run the same clock and differ only in whether a beaten blocker shows as pressure; with the same sacks, release and class shares, A5 intercepts +0.44 per 100 aimed more on gen, on both sets. The pocket's accuracy penalty was holding interceptions down, so the guard rewards a dirtier pocket, and retuning the clock to win interceptions back would bring back the sacks and wild throws step 1 removes. Against the real 2.35 per 100 aimed (§8), the even league goes from about 2.0 to about 2.7 and the generated league from about 6.9 to about 7.7. **Reading** (INFERRED): the interception design's known causes showing through a cleaner pocket, not a pocket-fix defect. By §8's rule the breach still stops the step and goes to the owner (F.8 item 2).
6. **The L8 basis also underlies step 2's prediction.** F.8 item 1 shows `s1.L8.*.pressure` was filed from pkA's A12, which carries Heels. ADR-089 §6.2's prediction rests on "pkA A12 -> A123 at today's clock" (ADR-089:1015; clauses `s2.pressure.flat` -4.9 to -1.9 and `s2.pressure.gen` -4.3 to -1.3), both Heels arms under L at R = 8, while step 2 builds on S with question 1 Today. So a step-2 pressure miss could be the same filing error; this is recorded before step 2's arms run, and no clause moves. No other filed clause names pkA A12. pkA's 47% against step 1's 62% first-dirt share (the floor-counter falsifier) stays unexplained; both are far above 10%.
7. **The window's miss sits on its bound.** Pooled over both sets, the window's own price is 0.262 points on flat and 0.266 on gen, against the filed bound 0.2633; A1 minus A2 is 0.278 and 0.245 on set 1 and 0.268 and 0.272 on set 2 (flat, gen), so pass or fail is close to a coin toss. The bound is step 0's M1 on today's game (release about 1.24 s), the risk plan K7 named in advance; on S's own streams M1 expects 0.31 to 0.33 points, with B1 0.38 to 0.43. The failure stands as filed, and question 16 stays Yes.
8. **The guard from step 2 on.** D9 and D28 are the Orchestrator's defaults (§15.3), which the owner may overrule. Before any step-2 arm runs, the Orchestrator files a named amendment and shows it to the owner: the base is the previous step's design arm on the same seeds (§8's "priced at its step"), and a breach needs the rise to clear the allowance by a noise term (for example two SE, pooled over both seed sets). Without one, the by-class rule breaches by chance on almost every arm. At step 10's acceptance the guard still reads against today's game, so the whole rise comes back to the owner then.
9. **For the hot-throws and extra-outlets design (question 13):** the checkdown drop under a clean pocket, because the outlet is read only when the decision is forced.
