# ADR-081: the end-of-season staff meeting

- **Date:** 2026-10-22
- **Proposed by:** Orchestrator, for `franchise` (thread "End-of-season staff meeting", written in the
  `franchise-engine` role; working copy at `/mnt/project-files/design/end-of-season-meeting-plan.md`)
- **Status:** design ruled by the owner (Q1-Q10 and F1-F5, 2026-10-22). **Build started 2026-10-31.**
  The owner typed the yes for G1, G2, G3 and G5 on 2026-10-31 16:04Z ("Yes, make contracts edits G1,
  G2, G3 and G5"); they are made (see "Contracts edits as made" below). G4 and G6 needed no edit: every
  staff member already carries a personality type, and ADR-084 V1 already saves the views.

> Phase note: Charter §6 places franchise at Phase 4; the owner pulled franchise work ahead
> (ADR-078). Nothing here touches engine, playbook, play-caller or calibration code. The build waits
> for team rosters and ADR-080's step C1 (see "Build order").
>
> Numbering: ADR-079 is claimed by the team rosters note and ADR-082 by the news desk note. If 081
> is taken first, this note is renumbered on merge.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| `StaffRole` has no GM (`HEAD_COACH`, `OC`, `DC`, `STC`, `POSITION_COACH`, `SCOUTING_DIRECTOR`, `SCOUT`, `PLAYER_ENGAGEMENT`, `STRENGTH`, `CAP_MANAGER`, `PRESIDENT`) | `packages/contracts/src/players.ts:114-117`, read 2026-10-22 | COMPUTED (read) |
| Decisions carry `Authority = "COACH" \| "GM" \| "PRESIDENT"` | `packages/contracts/src/calendar.ts:32` | COMPUTED (read) |
| v1: one human holds COACH+GM; the coach-vs-GM tension is voiced by NPC staff | CLAUDE.md Iron Rule 6; `ARCHITECTURE_CHARTER.md:156` | COMPUTED (read) |
| `talentEvaluation` and `politics` are existing coach skills | `packages/contracts/src/registry.ts:275`, `:282` | COMPUTED (read) |
| Offseason phase lengths are placeholders; the only seasonal deadline is the trade deadline | `packages/franchise/src/calendar/` (`PHASE_WEEKS`, `seasonDeadlines`), read 2026-10-22 | COMPUTED (read) |
| Spec #5 puts the staff evaluation period and the coaching carousel in `OFF_EVAL` | `docs/design/franchise-calendar.md` §5, §8; `docs/design/coaching-staff.md` §8 | read (spec, not built) |
| ADR-080 rulings (seats, one 0-100 ruler for all 19 coach skills, president hires the HC, no GM role) | `/mnt/project-files/design/ADR-080-coaching-staff-hiring-and-firing.md`; message from the "Coaching staff" thread 2026-10-22 | REPORTED |
| 18 teams miss the playoffs (32 teams, 7 per conference qualify) | ADR-078 league shape | COMPUTED (32 - 14) |
| Accuracy target rates (sharp / close / off / miss) and the skill-mix percentages | proposed in this note, to be tuned in M5 | PROPOSED, not measured |
| "Black Monday": NFL firings cluster on the Monday after the regular season | general knowledge | REPORTED |

## The idea in one paragraph

When your season ends, the calendar stops for a meeting with your general manager and your two
coordinators. It has three parts: **the season we just had, next season, and the season after.**
The GM always looks long: he may read that next year is not a title year and push to sell
veterans for draft picks. The coordinators always look short: they see the same holes and want
free agents and veterans traded in to fill them now. The GM's read comes from a real analysis of
the roster, the contracts and the record, split into separate points. **Each point gets its own
accuracy roll, using his skill plus a dice roll**, so a good GM is right on most points and still
misses some, and a poor GM misses more. He never says which ones he missed. The decision is
yours; the meeting gives you help, not answers.

## Your rulings (22 October) and what they change

You answered all ten on 22 October. Q1, Q2, Q5, Q7 and Q10 went as recommended. Q3, Q4, Q6, Q8
and Q9 went further, and the sections below write your answers into the design. The original
questions are kept at the end for the record. New follow-up questions (F1 to F5) are in the next
section.

**Q1 (a), with a bigger frame.** The GM is a real staff member. In the end the user picks which
seats to hold (coach, GM, president) and the computer fills the rest, so every seat must be
built to work either way. Most players will hold coach and GM. When you hold the GM seat, he
advises and you decide. When you don't, he makes the GM decisions. The shared types already tag
every decision with whose it is (coach, GM or president), so this is the intended path. This
note designs the meeting for both cases.

**Q2 (a). Black Monday is real.** The meeting falls the week after your last game. For the 18
teams that miss the playoffs, that is the Monday after week 18. Firings across the league happen
the same day, as in the NFL (that ties in with ADR-080's firing step). Playoff teams meet the
week after they are knocked out, and the champion meets after the final.

**Q3. The nine points stand, with three additions.**
- Point 1 ("were we lucky?") has three possible verdicts: _luckier than our record_, _unluckier
  than our record_, and **_exactly as good as our record_**. "About right" is a claim like the
  others, so it can be right or wrong too.
- **Who covers what.** Each man speaks to his own job, and some points belong to more than one:

| Point | GM | Coordinators (own side of the ball only) |
|---|---|---|
| 1. Were we lucky? | Yes, whole team | Yes, own unit ("our defence was better than the points say; the offence kept leaving us on a short field") |
| 2. Where were we good and bad? | Yes, whole team | **Their main stage.** They are arguing for their jobs: what went well, what fell short, and why it can be fixed |
| 3. Biggest holes | Yes | Yes, own side. Here their wants come in |
| 4. Who declines | Yes | Yes, own side |
| 5. Who we lose | **GM's alone** (contracts) | Only to say "keep him" or "let him go" about their own players |
| 6. How good are we next year? | Yes | Yes, own unit ("we'll be a top-10 defence with one more corner") |
| 7. Who grows | Yes | Only when a young player of theirs is close to breaking out |
| 8. The money cliff | **GM's alone** | No |
| 9. The window | **GM's alone** | No, though their wants push the other way |

- **Agreement, disagreement and fights.** When two men speak to the same point, the meeting shows
  whether they agree. An agreement is not proof: two wrong reads can agree. A disagreement is a
  clash, and how hot it gets depends on the two men's personality types and how they get on
  (F3, F4). A clash can stay polite, turn into an open argument in the room, or leave a rift
  that lasts past the meeting.

**Q4 (a) and (c) combined.** The leaning is the GM's **personality trait**, from the same list as
the coaches'. His analysis is split into three skills: **performance analysis** (reading what
happened), **forecasting** (reading what will happen) and **cap management** (renamed from "finance" on 22 October: the team's cap and contracts). Each
point mixes them in its own proportions. The fourth skill, **nuance**, comes from your Q6 answer,
and F1 suggests two more. A first-draft mix, to be tuned:

| Point | Performance analysis | Forecasting | Cap management | Market sense | Player judging |
|---|---|---|---|---|---|
| 1. Were we lucky? | 80% | 20% | | | |
| 2. Good and bad | 60% | | | | 40% |
| 3. Biggest holes | 20% | 30% | | | 50% |
| 4. Who declines | | 60% | | | 40% |
| 5. Who we lose | | 20% | 40% | 30% | 10% |
| 6. Next year's wins | 20% | 60% | | | 20% |
| 7. Who grows | | 50% | | | 50% |
| 8. The money cliff | | 20% | 50% | 30% | |
| 9. The window | 20% | 40% | 20% | 20% | |

_Market sense_ is what a player would fetch in a trade or would cost on the open market. _Cap
management_ is the team's own books: cap space, dead money, how contracts are structured.

The roll works as before: the mixed skill, the dice and the point's difficulty decide sharp,
close, off or miss. Coordinators carry the same skills (one ruler for every staff member, as
ADR-080 ruled), so a coordinator with good forecasting reads his unit's next year well.

**Q5 (a).** Four grades, and a miss can be silent.

**Q6, replaced by a new skill: nuance.** Every take has a certainty behind it. Nuance does two
things:
1. **How well his certainty matches reality.** A master of nuance is sure when he is right and
   unsure when he is wrong, most of the time. A poor one's certainty tells you little.
2. **How often he says it.** A master of nuance usually states his certainty without being asked.
   A poor one rarely does.

If he doesn't state it, you can ask "how sure are you?" He answers with the same skill (asking
doesn't make him more accurate, and asking twice gets the same answer). **Each time you ask, your
relationship with him drops slightly.** This applies to the GM and the coordinators alike.

Example: your GM (nuance 85) says "Our left tackle is about to fall off a cliff. I'm about 90%
on that," and he is right. Later, "the secondary is fine," with "I'd put that at maybe 55%." It is
a miss, and his low number was the warning. Your DC (nuance 30) says "Our corners are the best in
the division" and offers no number. You ask, he says "absolutely certain," he is wrong, and he
now likes you a little less for asking.

This replaces my old (a) "he always sounds as sure as his skill". A high-nuance GM is now very
valuable, because he tells you where he might be wrong. That is the point of the skill.

**Q7 (a).** A report card on last year's claims, for the GM and both coordinators.

**Q8 (c), shaped.** Coordinators speak to all three parts, on their own side of the ball only,
with their own rolls and biases (win now, protect their own players, want scheme fits, push
harder in the last year of their contract). **The season we had is where they matter most**:
they are arguing for their jobs, explaining what went well and what shortfalls can be fixed.
Their bias there is to credit themselves and blame the players or bad luck. Next season is
their wants. Beyond next season they say little, and only when it fits (a young player of theirs
about to break out, or "this scheme needs two years to install").

**Q9 (a), plus relationships and personality.** You pick a direction (contend, retool or
rebuild) and it is recorded. Your answers in the meeting can also move **your relationship with
each staff member** and lean your own personality (the coach personality plan). Siding with
the GM over the DC in a clash pleases one and stings the other. Telling an OC who argued for his
job that "the offence was the problem" might be right and still cost you his trust.

**Q10 (a).** All 32 teams hold the meeting, and their GMs misread too. For computer teams the
meeting runs quietly and its clashes can still leak to the news.

## Follow-up questions (all ruled 22 October)

F1 went (b); F2, F3, F4 and F5 went (a). F3's relationship model goes to the story-building
(narrative) side to develop further; this meeting only reads and moves the scores.

> **Update 23 October (ADR-084, relationships, ruled by the owner):** views run **one way**. Each
> staff member has his own view of the user and of every other staff member (the DC's view of the
> GM can differ from the GM's view of the DC); the user holds none. Wherever F3 and F4 below say
> "a score for each pair", read "one view in each direction". Clash heat (F4) reads the **lower** of
> the two men's views of each other. A rift is a grudge held by the man who lost the argument (the
> one you didn't back, or the one beaten on politics; both if nobody won). The sizes of the
> meeting's moves (asking "how sure are you?", siding, polite and open clashes, answer lines) are
> ADR-084's.

**F1. Other GM skills for this meeting? RULED 22 October: (b).** Talent evaluation, politics and
market sense are all added; "finance" is renamed "cap management". The options as asked:
- (a) **Add two, both reused from the coaches' existing skill list. Recommended.**
  _Player judging_ (the existing "talent evaluation" skill): how well he rates individual
  players, as distinct from reading results. Performance analysis reads the scoreboard; player
  judging reads the film. Holes, decline and growth lean on it. ADR-080 already uses it for
  judging coaching candidates, so it means the same thing everywhere.
  _Politics_ (existing skill): how well he holds his ground in a clash and keeps the president
  on his side. It decides who wins arguments and how often a clash turns into a rift.
- (b) Also add _market sense_, how well he knows what a player would fetch in a trade or on the
  open market. I'd fold that into finance for now and split it out when trades exist.
- (c) Also add _candour_, how willing he is to admit his own mistakes (players he signed or
  drafted). I'd make that a bias instead of a skill: every GM overrates players he brought in, the
  same way coordinators overrate players they coached.

**Result:** the GM's meeting skills are performance analysis, forecasting, cap management, market
sense, nuance, player judging (talent evaluation) and politics, plus his personality trait.
Performance analysis, forecasting, cap management, market sense and nuance are new skills, so they
join the coaches' skill list and every staff member carries them (one ruler). Candour stays a bias
(every GM overrates players he brought in), not a skill.

**F2. What is he called when you hold the GM seat? RULED: (a).**
- (a) **Still "General Manager", advising only. Recommended.** Like an NFL team where the head
  coach has final say on the roster. The screen shows who holds the final say.
- (b) "Assistant GM" when you hold the seat, "GM" when he does.

**F3. Relationships are new. Build them? RULED: (a).** Nothing in the game tracks how two people get on yet,
and your rulings need it (asking "how sure?", taking sides, rifts).
- (a) **Yes: a score for how you get on with each staff member, and one for each pair of staff
  members. Recommended.** It moves on meeting answers, on asking for certainty and on clashes,
  and drifts slowly back toward normal. It feeds who leaves when another team calls (ADR-080's
  poaching), how hard coaches argue next year, and news leaks. Later, the same scores can cover
  players.
- (b) You and staff only; staff-to-staff clashes leave no lasting mark.

**F4. When does a clash become a fight or a rift? RULED: (a).**
- (a) **It depends on the mix, never one trait alone. Recommended.** The two men's personality
  types, how they already get on, how far apart their claims are and how much is at stake (a
  coordinator whose job is on the line fights harder). The mix decides polite disagreement, an
  open argument, or a rift. A rift drops their relationship score and stays until something
  repairs it. You can step in and side with one, let it play out, or end it. This follows your
  rule for personality: traits are flavours, and only the mix matters.
- (b) A fixed chance of a fight whenever claims disagree.

**F5. What does a low-nuance coach's certainty look like? RULED: (a).**
- (a) **Usually too sure. Recommended.** When a poor-nuance coach does state his certainty, it
  leans high whatever the truth. That is the common human failing and makes "absolutely
  certain" from a poor reader a mild warning sign.
- (b) Random, too high or too low equally.


## What a meeting looks like (a worked example)

Your team went 10-7 and lost in the wild card round. Your GM (analysis skill 72, so above
average) and your coordinators report:

> **GM, the season we had:** "We were a bit lucky. Our points scored and allowed look like a 9-win
> team, and we went 5-1 in one-score games." _(Accurate.)_
> **GM, next season:** "Our two best defensive linemen are 31 and 32. I expect both to drop off.
> The offensive line is our biggest hole." _(The first part is accurate. The second misses: the
> real biggest hole is the secondary; the line is only average.)_
> **GM, the season after:** "Our quarterback's contract runs out after next season and he'll want
> top money. I'd rather sell a veteran or two now, collect picks and line up for the year after."
> _(Accurate on the contract; his overall verdict leans on the wrong hole.)_
> **Defensive coordinator:** "Give me a veteran corner and a pass rusher this spring and we win the
> division." **Offensive coordinator:** "I need a guard. Our line got the quarterback hit all
> year." _(The OC's read on his own unit is a miss too; the real problem was slow reads.)_

Next to each claim the screen shows the **plain facts** anyone can look up: the record, points
for and against, one-score record, ages, years left on contracts, the season's stats. Those are
always true. Only the staff's judgements can be wrong. You decide whether to contend, retool or
rebuild, and a year later the meeting opens with **last year's report card**: what each man said
and what happened.

## Words used below

- **Aspect:** one point the GM analyses (for example "were we lucky?" or "who will decline?").
- **Truth:** the game's own correct answer for an aspect, worked out from the real ratings, ages
  and contracts. The user never sees it directly.
- **Accuracy grade:** how close the GM's claim lands to the truth: _sharp_, _close_, _off_ or
  _miss_ (explained in Q5).
- **Skill:** the GM's rating for this kind of analysis, on the same 0-100 scale as coaches' skills.
  Proposed: the coaches' existing "talent evaluation" skill (ADR-080 already uses it for judging
  coaching candidates), so one skill means one thing everywhere.
- **Roll:** a dice roll from the league's seed, so the same saved game always gives the same
  meeting.

## How the analysis works

### The aspects (three parts, nine points)

| Part | Aspect | What the GM claims | Truth comes from | Difficulty |
|---|---|---|---|---|
| The season we had | 1. Were we lucky? | "We were better / worse than our record." | Points for and against (expected wins), one-score record, schedule strength | Easy |
| | 2. Where were we good and bad? | Grades for offence, defence, special teams; the strongest and weakest position group | Team strength by unit and group, from true ratings | Easy |
| Next season | 3. Biggest holes | The two or three weakest position groups | True group strength next year after aging | Medium |
| | 4. Who declines | The players likely to drop off | Aging curves applied to true ratings | Medium |
| | 5. Who we lose | Expiring contracts and who may leave | Contracts (years left now; money once the salary cap exists) | Easy |
| | 6. How good are we next year? | Expected wins and playoff chances | Projected team strength turned into wins | Hard |
| The season after | 7. Who grows | Young players who will become starters | Development curves on true ratings and potential | Hard |
| | 8. The money cliff | Big contracts coming due, who will need paying | Contracts and the players' projected ratings | Medium (once the cap exists) |
| | 9. The window | Contend now / retool / rebuild, with a reason | Projected strength over two years | Hardest |

"Easy" points are about what already happened; "hardest" are about the future. Difficulty lowers
the chance of a sharp read, so even a great GM is shakier about the year after next than about
last season, which is how it works in real front offices.

### The formula for "how good is this team?"

Aspects 2, 3, 6, 7 and 9 all need one number: **team strength**. Proposal:

1. For each position group, take the starters (from the depth chart) and average their ratings,
   using the absolute ratings you ruled for the rosters work.
2. Weight each group by how much it moves points. The weights are measured, not guessed: the
   calibration tools run games where one group is made better and see how much the point
   difference moves (a quarterback is worth far more per rating point than a fullback).
3. Strength becomes expected wins through the same points-to-wins curve used for "were we lucky".
4. For next season, apply each player's aging or growth first and drop the players whose contracts
   end and who will probably leave. For the season after, do it twice.

That gives the truth for every aspect. The GM's claim is the truth pushed off by his accuracy
grade (Q5).

### Skill plus roll

For each aspect the game rolls once. Skill, roll and the aspect's difficulty decide the grade.
Target rates, to be tuned (sharp / close / off / miss):

| GM skill | An easy point | A hard point |
|---|---|---|
| Elite (85) | 80 / 15 / 4 / 1 | 45 / 30 / 17 / 8 |
| Average (50) | 55 / 28 / 12 / 5 | 25 / 30 / 28 / 17 |
| Poor (25) | 35 / 30 / 22 / 13 | 12 / 25 / 33 / 30 |

So an average GM, across nine points, typically gets three or four right, two or three roughly
right, one or two noticeably wrong and about one badly wrong.

## The original questions (ruled 22 October, kept for the record)

Your answers are written into "Your rulings" above.

**Q1. Who is "the GM"?** Today's design says that in v1 you hold both the head coach's and the
GM's decisions yourself (you sign, cut and trade). So who sits across the table?
- (a) **A computer-run GM who advises, and you keep the final say on every roster move.
  Recommended.** He is a staff member with skills like the coaches; his job in v1 is analysis,
  advice, and carrying out moves you hand him if you choose to delegate. Nothing about who decides
  changes. This needs a new staff seat, "GM", in the shared types (contracts edit G1).
- (b) The computer GM really holds the GM decisions and makes roster moves unless you overrule
  him. That changes the v1 split of who decides what, and makes the meeting a negotiation.
- Example: your GM wants to trade your 31-year-old pass rusher for a second-round pick. Under (a)
  nothing happens unless you make the trade. Under (b) he makes it unless you stop him.

**Q2. When is the meeting?**
- (a) **The week after your last game. Recommended.** A team knocked out in the wild card round
  meets in mid-January while the playoffs carry on; the champion meets after the final. That is
  how the NFL does it (the "Black Monday" meetings and end-of-season press conferences), and it
  comes before coaches are fired or hired, so what your coordinators say can feed into whether you
  keep them.
- (b) Everyone meets on the first day of the offseason (start of the February evaluation phase).
  Simpler, but a team eliminated in week 18 waits a month.

**Q3. Are those the right nine points?**
- (a) **Yes, the nine above. Recommended.** Points 5 and 8 work on contract years only until the
  salary cap exists, then gain the money side.
- (b) Fewer for a first version: just luck, biggest holes, next year's wins and the window.
- Tell me if a point is missing. Candidates I left out: "is the coaching staff the problem?",
  "how strong is the division next year?", "how good is our draft class?".

**Q4. What is the GM's skill made of?**
- (a) **One analysis skill, plus one leaning. Recommended.** The skill is the existing "talent
  evaluation" rating that every coach already carries (ADR-080), and it sets how accurate he is
  overall. The leaning is a habit that tilts his misses in one direction, for example "trusts
  veterans" (sees decline late), "loves youth" (expects young players to grow faster than they
  do) or "chases last season" (thinks a lucky year was skill). Over a few meetings you can learn
  his leaning and correct for it, which is exactly the judgement you want the player to develop.
  It also fits the existing design, where each team's scouting has its own habits.
- (b) One skill only. Misses are pure chance, with no pattern to learn.
- (c) Separate skills for roster, contracts and forecasting. More texture, more to tune.

**Q5. How wrong can he be?**
- (a) **Four grades, and the worst one can be a silent miss. Recommended.** _Sharp_: right.
  _Close_: right direction, numbers a bit off ("9 wins" when it's 10). _Off_: noticeably wrong
  ("9 wins" when it's 6) or names the second-worst hole as the worst. _Miss_: confidently wrong,
  or the problem never comes up (he never mentions that your left tackle is about to fall off a
  cliff). Silent misses are the realistic kind and the hardest to catch.
- (b) Only numbers are blurred; he always mentions every real problem.

**Q6. Does he sound as sure when he is wrong?**
- (a) **Yes. How sure he sounds follows his skill, not his roll. Recommended.** A great GM sounds
  confident on all nine points, including the one he missed; a poor GM hedges on everything. You
  cannot tell a wrong claim from its tone, only by checking it against the facts or your own read.
- (b) He sounds less sure when the roll was bad. Friendlier, but it gives the answer away.

**Q7. Report card a year later?**
- (a) **Yes. Recommended.** Each meeting opens with last year's claims next to what happened, for
  the GM and both coordinators. It is how you learn whom to trust, and it makes a good GM's value
  visible, which matters when the coaching carousel offers you a new one.
- (b) No; you remember on your own.

**Q8. What do the coordinators do?**
- (a) **Next season only, their own side of the ball, with their own accuracy rolls and biases.
  Recommended.** Each brings two or three wants ("a veteran corner", "re-sign our slot receiver",
  "a guard who can pull"). They use their own player-judging skill (the coaches' "talent
  evaluation" rating) with the same skill-plus-roll machine. Their biases: they always want to win
  now, they overrate players they coached, and they want players who fit their scheme. A
  coordinator on the last year of his contract pushes harder for win-now moves.
- (b) Coordinators just list wants, always accurate; only the GM can be wrong.
- (c) Coordinators also talk about the year after. That blurs the contrast you described.

**Q9. What does your answer at the meeting do?**
- (a) **You pick a direction (contend, retool or rebuild) and it is recorded. Recommended.** It
  steers anything you hand to staff (if the GM runs free agency for you, he follows it), the news
  and storylines pick it up, and staff react: a coordinator told "rebuild" is more open to leaving
  for another job. The direction does nothing on the field by itself. Its effects arrive as trades,
  free agency, the draft and the news are built.
  The answers you give in the meeting can also carry a lean toward one of your own personality
  types (see the coach personality plan, coach-personality-plan.md, not yet ruled). An answer might
  have a direct effect, a lean, or both: telling a coordinator "we're rebuilding, deal with it"
  could read as hard-nosed, while promising him veterans could read as a players' coach. The
  meeting leaves room for that; the lean values come from that plan.
- (b) The meeting is information only; nothing is recorded.

**Q10. Do the other 31 teams hold the same meeting?**
- (a) **Yes, quietly, and their GMs misread too. Recommended.** Each computer team's GM runs the
  same analysis with his own skill and rolls, and the team's direction follows it. So some rivals
  rebuild a year too early or chase a title they can't win, which makes the trade market and free
  agency feel real, and a sharp GM is worth more. This also follows the project's rule that
  computer teams never see true ratings either.
- (b) Computer teams decide their direction from the truth.

## What it needs from the other work (overlaps, not decided here)

| Other work | What this meeting needs from it | Note |
|---|---|---|
| Season shell (calendar clock) | A stop the week after a team's last game | The clock already stops at phase starts and deadlines; this adds one team-specific stop. The offseason phases are still empty placeholders with guessed lengths. |
| Team rosters (thread "Team rosters") | Real rosters, depth charts, ages, absolute ratings | Without rosters every team is the same and records are near coin flips, so the truth side would be meaningless. **The meeting should be built after rosters.** |
| Coaching staff (ADR-080, ruled 22 Oct) | Coordinators with names, skills, contracts, résumés | ADR-080 gives each team a head coach, both coordinators, a special teams coach and a computer-run president, all 19 coach skills on one 0-100 ruler. It adds no GM; this note adds him (G1) on the same ruler and reuses "talent evaluation" as his skill. Whether the GM can be fired and hired like the coaches belongs to that thread. The meeting should come before firing so it can inform it. |
| Salary cap, draft, trades (planned) | Contract money, picks, a trade market | Points 5 and 8 run on contract years only until the cap exists; "sell for picks" is advice only until trades and the draft exist. |
| News and storylines | Nothing; it can use the meeting | A coordinator leaking "we need to win now" to the press, or a rebuild becoming a storyline. |
| Player aging and development (planned) | Aging and growth curves | Points 4, 6, 7 and 9 need them. Until they exist the meeting would use simple placeholder curves. |
| "What each team believes" (perception, not built) | Later: the GM reads his team's scouting picture instead of the truth | When perception exists, the GM's errors stack on top of the scouts' errors. The design does not change. |
| Game viewer | A meeting screen | Later. The meeting is first a saved report that the viewer can show. |
| Fantasy mode (future) | Nothing breaks | The meeting is seeded and repeatable, so two friends with the same league see the same meeting. |

## Contracts edits I expect (each needs your typed yes, after you rule)

- **G1. A GM staff seat** in the shared staff types (only if Q1 is a or b; either way he needs a seat).
- **G2. A meeting event** in the event stream: who said what, with the accuracy grades hidden from
  the user's view but kept for the report card and testing.
- **G3. A team direction** (contend / retool / rebuild) on each team and in the save file (if Q9 a).
- **G4. The GM's personality trait**, from the coaches' existing list (Q4).
- **G5. Five new staff skills**: performance analysis, forecasting, cap management, market sense
  and nuance, added to
  the coaches' skill list so every staff member carries them (Q4, Q6, F1).
- **G6. Relationship views**, one entry per direction (from, of, score, optional rift), in the
  save file. The shape is ADR-084's (its V1); this note only reads and moves them.

### Contracts edits as made (2026-10-31)

- **G1:** `StaffRole` gains `"GM"`. For now each team's GM is made with the league and keeps the job;
  hiring and firing GMs is a later step.
- **G2:** `meeting.ts`: `StaffMeeting` (team, season, when, takes, clashes), `MeetingTake` (speaker,
  claim, hidden grade, certainty fixed at the meeting, whether he volunteered it), `MeetingClaim`
  (point plus verdict, groups, players, wins or direction as the point needs), `MeetingClash` (point,
  the two men, polite / open argument / rift). Events `STAFF_MEETING_HELD` and
  `MEETING_CERTAINTY_ASKED`; the save keeps each team's last meeting (`world.meetings?`).
- **G3:** `TeamDirection` (contend, retool, rebuild), `Team.direction?`, event `TEAM_DIRECTION_SET`
  with the authority tag of whoever set it.
- **G5:** the coach registry gains `performanceAnalysis`, `forecasting`, `capManagement`,
  `marketSense` (season) and `nuance` (career). Franchise draws them from each coach's own fork with
  his talent level, so every coach keeps the 19 ratings he had and the carousel is unchanged (checked:
  a built staff and its history digest the same before and after).

Nothing in the match engine, play cards or play-callers is touched. ADR-073 step six's
measurements are unaffected.

## Build order (after rosters, and after coaching staff step C1)

| # | Piece | What you get |
|---|---|---|
| M0 | Design note + contracts edits | Your rulings written down; G1 to G4 on your typed yes |
| M1 | Team strength and the truth side | The formula above, the position-group weights measured by calibration, "were we lucky", aging projection |
| M2 | GM and his report | GMs made for all 32 teams, skill-plus-roll per aspect, the nine claims |
| M3 | Coordinators' voices | Their takes on all three parts (own side only), wants, rolls and biases; agreement and clashes; nuance and "how sure are you?"; relationship scores |
| M4 | The calendar stop, your direction, the report card | The meeting on the calendar, the saved report, last year's grades |
| M5 | Check it | Run 50 seasons and confirm: accuracy rates hit the targets above, and teams with sharp GMs time their rebuilds better than teams with poor ones. Short report for you |

All in the franchise package, tested on its own; the calibration step in M1 runs games but changes
nothing in them.
