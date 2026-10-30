# ADR-091: the stem, in plain words

*2026-10-30, revised the same evening: the Mike's timing now runs against how well our defense knows the quarterback's count, built from your notes on film study and in-game adjustments ([ADR-092](ADR-092-questions-explained.md)); and stems now come about 9 times a game, set by each coordinator, from your source ("How often" below). The full design is [ADR-091](ADR-091-the-stem-called-by-the-mike.md). It is built on your notes. Design only: nothing in the game changes until you answer. Two questions, both answered on 2026-10-30: Awareness and Play Recognition (S1), and the NFL's own penalty for offside (S2). You never merge: each step comes to you with its numbers, and I ask "should I merge?"*

## What changes

Today the Stem is only a picture. The offense's line is shown the front one gap over, and the defense plays its real front. Nobody calls it, nobody times it, and nobody can ever be caught moving. That is why it felt like cheating to you, and it barely works in the game today: on the snaps where it could matter, it even gave slightly fewer sacks.

In the new design the stem plays out at the line, the way your notes describe it.

1. **The coordinator calls it** as part of the call, as today: "line up here, shift there before the snap".
2. **The line sets in its first front.** The offense's line reads it and sets its blocking (this part is built today).
3. **The quarterback starts his count**: normal, a quick count, or a hard count.
4. **The Mike yells MOVE.** His Awareness and Play Recognition, and how well our defense knows this quarterback's count (from the week's film study and what the Mike has heard so far in the game, ADR-092), decide whether he gets it right.
5. **The line shifts.** Each lineman's Reaction and Agility decide whether he gets there in time.
6. **The offense answers.** If the shift came early, the quarterback may snap the ball while they are moving. If he doesn't, the center may yell "Alert!" and change everyone's blocking.
7. **The snap.**

## How it can end

| ending | what happened | what it does |
|---|---|---|
| **On time** | the line set in its new front just before the snap | the offense blocked the old front, so each moved man gets a small edge on his first move |
| **Early** | the Mike called it with time to spare | the center gets a chance to re-call; if he does, the stem was wasted, and if he doesn't, it worked |
| **Caught** | the ball was snapped while the line was moving | the man is between gaps, standing up and moving sideways: a big disadvantage on his first move, and on a run his blocker washes him out of his gap. If the quarterback snapped *because* he saw the move, a lineman can run offside |
| **Called off** | the Mike read a quick count, or the hard count went long | the line plays from where it stands, as your notes say ("earlier is always better than later") |

**Which one happens depends on the count.** On a normal count, a good call is on time, a slightly bad one is early (the coached miss) and a bad one is late, which means caught. On a quick count, the good Mike calls it off and the bad one gets caught. On a hard count, the good Mike waits it out and moves late, the decent one calls it off, and the bad one is baited into moving early.

**A worked example.** It's third and 2 at home and the offense uses a hard count. Our Mike is average and the quarterback is very good, so the Mike's call misses by 25. He is baited: on the fake "Set!" he yells MOVE and the line shifts early. The quarterback sees it and snaps at once. All three moved linemen are caught moving, and our right defensive tackle's momentum carries him offside: a free play. The offense ran for 1 yard, so (if you choose Enforce below) it takes the 5 yards and a first down.

**With average players everywhere**, the stem works about 65 times in 100, is caught about 19 times in 100, and is wasted or called off about 16 times in 100. At about 9 stems a game, offside from stems comes to about 1.4 flags per 1,000 snaps. That is about a sixth of all real defensive offside, neutral zone and encroachment flags, which run to 7.95 per 1,000 snaps (I measured them from the NFL's 2022-24 play-by-play). To keep it there I lowered the chance that a caught lineman ends up offside, from 19 in 100 to 4 in 100 for an average lineman: at the old chance, stems alone would have drawn two-thirds of all the real flags.

## The two other stems from your notes

- **Stem Back (the double-cross):** the line lines up in its real front, stems away early on purpose so the center re-calls, then slants back into its real gaps at the snap. It works best against a good center: if he re-calls, each man gets a bigger edge, and if he doesn't, the slant runs into a blocker who is ready for it.
- **Double Stem:** only on third and 7 or more. The line shifts once early to bait the re-call, then shifts back late. Against a normal or quick count there is no time for two moves, so the Mike calls the second shift off.
- **Auto-stem:** a stem the Mike calls at the line because of motion or a formation. It comes after motion is built.

## How often (your source)

You were right: the game stems far too rarely. Today it's about 2.5 times a game, because of the rate of one front look in ten calls from October, which had no real number behind it. Your source says 5 to 15 times in a standard game, and that the coordinator decides.

- **The league average becomes about 9 a game** (15 snaps in 100). The Mug keeps your 1 in 10.
- **Each coordinator gets his own rate.** About two in three stem 5 to 13 times a game. About one in six are "execution" coordinators who stem 2 to 5 times. About one in six are "multiplicity" coordinators who stem 13 to 20 times.
- **When he stems more:** on third and 7 or more, twice as often, usually with a stunt or a blitz on the same call; for the whole game against a rookie or backup center, or against an offense that changes its play at the line a lot.
- **The offense adjusts, as your source says.** At home, every stem it sees makes the quarterback a little more likely to use a hard count, and the stems lose some of their surprise.

**What that gives, with average players:** stemming pays most at about 6 to 9 a game and stops paying at about 18, your change-of-pace pitch. A coordinator with a great Mike can stem more, because his Mike gets caught about half as often.

## The two questions, one line each

1. **The Mike's ratings:** his Awareness and Play Recognition, or a new rating? *I recommend Awareness and Play Recognition.* **Your answer: Awareness and Play Recognition.**
2. **Offside from a stem:** a real 5-yard penalty now, or just counted? *I recommend Enforce.* **Your answer: follow the NFL's rules.**

## Question S1: which of the Mike's ratings time the stem?

**Your answer (2026-10-30): Awareness and Play Recognition.** As you put it, a Mike who recognizes the play before the snap also reads how the count will play out.

**An example.** Two Mikes. One has Awareness 80 and Play Recognition 75: against an average quarterback on a normal count, at an average point in the game, he's on time 82 times in 100 and never caught. The other has 40 and 45, so he's on time 68 times in 100 and caught 13 times in 100.

**The proposal (Awareness and Play Recognition).** Every linebacker already has both ratings, and they're the ones the game already uses for reading the offense. The center uses his Awareness, as the game's design document says.

**The other choice (a new rating, Line Calls).** A rating of its own for Mikes and centers. Every player would read 50 until we find a way to measure it, so in practice nothing would differ until then.

## Question S2: when a stem draws the line offside, is it a 5-yard penalty now?

**Your answer (2026-10-30): follow the real NFL rules.** So offside from a stem is always flagged and enforced as the NFL enforces defensive offside: 5 yards from where the play started, or half the distance to the goal line from inside the 10; the play runs on as a free play; the offense picks the play or the penalty. It's the game's first penalty and needs nothing else first: it's step 6 of the plan, after the stem's other effects are measured. The other fouls a stem can draw (a neutral zone infraction when an offensive lineman reacts, encroachment on contact, the defense's delay of game for an abrupt move) come with the every-snap count design you said yes to, each with the NFL's own penalty.

**An example.** The line is caught moving because the quarterback snapped on the move, and the left end's momentum carries him across. The play goes on (a free play). If the play gained 12 yards, the offense keeps it. If it lost 3, the offense takes 5 yards and replays the down.

**The proposal (Enforce).** This becomes the game's first penalty, built as its own step after the stem's other effects are measured. For teams the computer runs, the offense keeps the play if it scored, or made a first down with more yards than the penalty gives; otherwise it takes the penalty, which also wipes out a turnover. When you coach, you choose.

**The other choice (Count only).** The offside is recorded on the play and counted, but no yards change until we design penalties as a whole.

## Small choices I make unless you say otherwise

- **How often each count is used:** at home, normal 80, quick 10, hard count 10, rising to a 30 hard count on third or fourth and 2 or less. On the road, no hard count, because the noise forces a silent count.
- **Snapping on the move** is a coached rule of the offense, not something the coach's leash limits.
- **The center's re-call** uses the design document's protection-call roll as written.
- **Offside only happens when the quarterback snapped on the move.** A line caught by a late call or a quick count is moving sideways, not falling forward.
- **A called-off stem plays from where it stands**, as your notes say. It's the one time a front look changes what is played, and only the gaps change.
- **Of the stems the caller draws:** Stem 80, Stem Back 15, Double Stem 5 (third and 7 or more only). How many he calls is in "How often" above.
- **Every number** (the edges, the costs, the targets) is set before any test run and never tuned to make results look right; a miss comes to you with its numbers.

## How it's built

| step | what | changes games? |
|---|---|---|
| S-a | the stem plays out and is recorded on every play, including who was caught; nothing reads it after the snap yet | no |
| S-b | its effects: the re-call, the on-time edge, the caught cost, the called-off gaps, and the new stem rate | yes, after the pocket fix finishes measuring |
| S-c | offside (question S2) | yes |
| S-d | Stem Back and Double Stem | yes |
| later | auto-stem, after motion | yes |
