# ADR-092: the battle over the snap count, in plain words

*2026-10-30, revised the same evening for your source on how often defenses stem (about 9 a game on average now, set by each coordinator; see the stem's page). The full design is [ADR-092](ADR-092-the-battle-over-the-snap-count.md). It is built on your notes about film study and in-game adjustments. Design only: nothing in the game changes yet. **You answered its one question on 2026-10-30: yes, design the count on every snap next, once the pocket fix finishes measuring.** You never merge: each step comes to you with its numbers, and I ask "should I merge?"*

## What changes

In the stem design (ADR-091), the Mike's timing was set against the quarterback's ratings, and it was the same on the first snap and the last. Your notes show that timing is **learned**: the coaches study the quarterback all week, the Mike gets better at it during the game, and the offense fights back from the sideline.

So each defense now carries one number through the game: **the count read**, how well it knows when this offense's ball will be snapped. It runs from 0 to 100, and 50 is what the stem design assumed on every snap. Every 5 points above 50 makes the Mike's timing roll 2 points better; every 5 below, 2 points worse.

This also settles your question about the quarterback's ratings. His **Football IQ** decides how much of his count can be read at all, because a quarterback who varies his rhythm and sells his dummy words gives less away. Awareness stays only where it really shows: seeing the line move and snapping the ball on it.

## The week: film study (70 coaches, 30 Mike, as your notes say)

- **The coaches' part** is the defensive coordinator's **Game Planning**. He stands for his whole staff, because the game doesn't have position coaches yet.
- **The Mike's part** is his **Discipline**: your notes say he doesn't discover the patterns, he memorizes and applies the coaches' sheet. Discipline is the game's rating for sticking to the coach's instructions instead of guessing. It isn't used in his timing roll, so nothing counts twice.
- **What it gives.** An average staff goes into the game knowing about half of what can be known about the quarterback's count. A great staff knows about two-thirds, a poor one about two-fifths.
- **The offense doesn't answer in the week.** You ruled in October that the offense gets no answer to the defense's weekly plan yet. In your notes the offense answers during the game, so that's where it does here.

## The game

- **Every snap he hears, the Mike learns.** By the end of the first quarter he has closed about half the gap to everything that can be known, and by halftime about four-fifths. That's your "crack the code by halftime".
- **At halftime**, the defensive coordinator's **In-Game Adjustment** decides how much of what the booth decoded he hands the Mike.
- **Late in a close game**, a quarterback with low **Poise** falls back on his comfortable rhythm, and the Mike can read him a little better.
- **The offense's fix.** When a stem works against him, the offensive coordinator's **In-Game Adjustment** decides whether he sees it from the press box. If he does, at the start of his next drive he makes the three corrections from your notes:
  1. **A new live word.** The Mike loses most of what he learned during the game, unless our coordinator reads the change (his In-Game Adjustment against theirs).
  2. **The next three snaps on two**, at home. If our coordinator read the change, the Mike knows they're coming and isn't fooled.
  3. **"Stop tapping your thigh."** The quarterback's **Discipline** decides whether he drops the habit. If he does, a third of the film study is gone for the rest of the game.

## A worked example

The Jets' defense is at Buffalo.

- **The week.** Buffalo's quarterback has Football IQ 60, so there's 62 to know about his count. The Jets' coordinator has Game Planning 80 and their Mike has Discipline 60. They go into the game with a count read of **38**, so on the first snaps the Mike's timing roll is about 5 worse than average.
- **First half.** He hears the count every snap. By the end of the first quarter the read is **50**. On the 20th snap it's **53**, and he times a stem perfectly on third and 2: the run is stuffed.
- **The press box.** Buffalo's coordinator has In-Game Adjustment 70, so he spots it 65 times in 100, and this time he does. Next drive: a new live word, three snaps on two, and "stop tapping your thigh". The Jets' coordinator (In-Game Adjustment 50) misses the new word; he'd have caught it 46 times in 100. The quarterback (Discipline 55) drops the habit. The read falls from **55 to 30**, worse than at kickoff.
- **Halftime.** It has climbed back to **40**, and the Jets' staff hands the Mike the booth's notes: **45**.
- **Fourth quarter, a 3-point game.** Buffalo's quarterback has Poise 30, and his old rhythm creeps back under the stress. The read reaches **60** with seven snaps left and **64** by the last snap.

## What it's worth

With average players and coaches everywhere, and about 9 stems a game, stems work **about 62 times in 100 in the first quarter and about 66 in the second half**, and get caught **about 23 times in 100, falling to about 17**. Over a whole game it averages out to what the stem design already showed (65 work, 19 caught). The offense's hard counts climb through the game as it gets used to the stems.

Who matters most for the stem, over a season of about 158 stems:

- **The Mike himself.** A Mike with Awareness 80 and Play Recognition 75 is caught 16 times a season; one with 40 and 45, 34.
- **The quarterback.** Against Football IQ 85, stems are caught 39 times a season; against 35, 26.
- **The defensive coordinator.** At 90 instead of 20, about **4 more stems that work and 4 or 5 fewer caught a season**, mostly from his week's study, and mostly in the first half.
- **The offensive coordinator** fixes his count about 2 or 3 times a game; at 90 instead of 20 that's worth about one stem a season, because the Mike relearns the count within a few snaps.
- **Best against worst:** a great defensive coordinator facing a poor offensive one gets about 5 more stems that work and 5 fewer caught a season than the other way around.

## What the real NFL shows

I measured the 2022-24 play-by-play by quarter. **Real defenses jump the count a fifth less often in the second half than in the first**: 8.9 flags per 1,000 snaps against 7.1 (offside, neutral zone and encroachment). The first quarter has the most and the third the fewest, a third fewer. That's what your notes say. Offenses false-start about 13% less in the second half too, so part of it is both sides settling in, but the defense settles more. Third and short draws the most jumps on both sides, which is where hard counts live.

## The question: should knowing the count matter on every snap, not just stems?

**Your answer (2026-10-30): Yes, design it next.** It gets its own design once the pocket fix finishes measuring.

**An example.** Third and 1 at home, and Buffalo goes to a hard count. Early in the game the Jets' line hasn't cracked the live word, and the right tackle jumps: neutral zone infraction, first down. By the fourth quarter they have it, and nobody moves. Then Buffalo's offensive coordinator changes the live word on the sideline, and on the next drive his own left guard, still hearing the old word, false-starts.

**The proposal (Yes, design it next).** After the pocket fix finishes measuring, a design of its own: the count drawn on every snap; each defensive lineman's jump on a hard count, decided by his Discipline and the count read; the offense's own false starts on long counts and new live words; and the offensive coordinator's fixes set off by what he sees on every snap, not only stems. Real defenses jump the count about 8 times a season and offenses false-start about 19, so this is where good coordinators would really show, and the real numbers above are its targets.

**The other choice (Stems only for now).** The count read counts only on stems, and the coordinators' edge stays at the few stems a season above.

## Small choices I make unless you say otherwise

- Football IQ for the quarterback's count, with Awareness only in snapping on movement (the change I offered on your last question).
- The Mike's part of the homework is his Discipline, and the defensive coordinator stands for his staff.
- The numbers are set so that, with everyone average, a whole game comes out exactly as the stem design already showed. What's new is the first quarter against the second half, and good staffs against bad ones.
- The fix's three parts and "three snaps on two" are taken from your notes. On the road there's no hard count (the crowd forces a silent count), so a road fix is only the new word and the habit.
- A backup quarterback coming in mid-game starts with little film on him.
- How much a great staff is worth is one number in the design; if you want coordinators to matter more for stems, that's the one to turn.
- Every number is set before any test run and never tuned to make results look right.

## How it's built (inside the stem's steps)

| step | what | changes games? |
|---|---|---|
| with the stem's first step | the count read with every coordinator at 50, the halftime step and the offense's fixes, recorded on every play; nothing reads it after the snap yet | no |
| with the stem's effects | the count read counts | yes, after the pocket fix finishes measuring |
| next | real coordinators reach the game: each team's film study and both coordinators' In-Game Adjustment | yes |
| after the pocket fix finishes measuring | the count on every snap, its own design (your yes) | yes |
