# ADR-090: where every man stands at the snap, in plain words

*2026-10-25. The full design is [ADR-090](ADR-090-where-every-man-stands-at-the-snap.md). Design only: nothing in the game changes until you answer, and the pocket fix's measurements are not touched. Five questions, each also a card in the thread. You never merge: each step comes to you with its numbers, and I ask "should I merge?"*

## What this is

You were right: the chess game before the snap is what this version is about, and a lot of it is built. The quarterback reads the coverage, the line reads the rush, the coach's leash decides what he may change, and the defence shows looks: Two-High, Single-High, press corners, the Mug, the Stem, the creeper.

What is missing is **where each man stands when the ball is snapped**. Today nobody has a spot in yards. A defender sits in one of 25 boxes (5 across, 5 deep) for the whole play, picked from the job he will play. The looks live only in the quarterback's head. So a disguise costs the defence nothing, and an unblocked blitzer cannot start from where he really is. That is what you halted in August: *"the model needs where he is at the snap."*

This design plays the pre-snap game out in order and writes down where all 22 men are at the moment of the snap:

1. **The offence lines up.** Receivers, backs, quarterback (under centre, pistol or gun), the line.
2. **The defence lines up against it** as the real call would: linemen in their techniques, backers about 4½ yards off, corners pressed at 1 yard or off at 7, safeties 12 to 13 deep.
3. **The defence shows its looks.** A Two-High puts both safeties deep at 12. A Mug walks the backers up into the A gaps. A Stem slides the line one gap over.
4. **Motion**, once we build your motion design: the receiver moves, and the defence follows him, spins a safety down or swaps.
5. **The reads at the line**, as they work today.
6. **The last movement before the snap.** A Stem shifts back. An early rotation finishes. A late rotation holds until the snap. The creeper is already moving forward.
7. **The snap.** Everyone's spot is frozen and saved on the play, so the game viewer, the stats and the news all see the same picture.

## The five questions, one line each

1. **A look:** is the man really standing there at the snap? *I recommend Real, by look.*
2. **Tells:** does where he stands give his job away? *I recommend By rating.*
3. **The ball across the field:** always the middle for now, or the hash? *I recommend Middle for now.*
4. **The plan:** seven steps, with the pocket fix's free rushers third? *I recommend Yes.*
5. **The game viewer:** draw all 22 men at the snap? *I recommend Yes.*

## Words I use

**Snap spot:** where a man is standing, in yards, when the ball is snapped, and whether he is moving. **Across** is yards from the ball toward a sideline; **deep** is yards from the line of scrimmage. **Shown spot:** where a look puts him. **Landmark:** where his real job takes him after the snap.

## Question 1: a look, is he really standing there at the snap?

**An example.** Cover 3 under a Two-High look, late rotation. Before the snap both safeties stand 12 yards deep, just outside the hashes, so the quarterback sees two-high. At the snap one safety runs to the deep middle and the other comes down to the curl-flat, about 8 yards deep and 12 across. If he really was standing at 12 deep and 9 across when the ball was snapped, he has ground to cover, and a quick out to the flat is open a beat longer. That is the price of a late disguise; your August research said its payoff is turnovers, not completions.

**The proposal (Real, by look).** Each look is real, the way it really works:
- **Mug:** the backers really are in the A gaps at the snap. A backer who drops has to bail from 1½ yards; one who rushes comes from there.
- **Coverage look, late rotation:** really standing at the look; he moves on the snap.
- **Coverage look, early rotation:** the safeties have finished moving before the snap (that is what "early" already means in the game), so they start from their real spots, and the quarterback had an easier read.
- **Stem:** the line shows one gap over and shifts back just before the snap, so it plays from its real gaps, but the protection was set against the look.

Your rule from October still holds: a look never changes **what** a man is assigned to do. It changes **where he starts** doing it.

**The other choices.**
- **Real, every look:** the same, except the Stem's linemen are still in the shown gaps at the snap and rush from there.
- **Head only:** looks stay in the quarterback's head; at the snap everyone stands where his real job would put him. Disguise stays free.

## Question 2: tells, does where he stands give his job away?

**An example.** Your August note: linebacker depth runs 4 to 7 yards and is itself the main tell. A backer who is going to blitz on a disguised call should stand at normal depth, like everyone else. A poor disguiser creeps up a yard because he wants a head start. He gets there sooner, and the centre sees him and points him out.

**The proposal (By rating).** We use the Disguise rating you already approved for each player (50 for everyone today). A man below 50 stands a little toward his real job: up to 2 yards for the worst. He gets there sooner but is easier to read: the quarterback's coverage read or the line's blitz read gets a bonus for each yard he cheated. At 50 and above nobody cheats, so nothing changes until players have real Disguise ratings. This is built only together with the coordinator disguise design.

**The other choice (No tells):** everyone stands exactly where his look puts him; Disguise only does what you already ruled (how hard the look is to read, and the on-time / late / bust roll).

## Question 3: where is the ball across the field?

**An example.** The last play ended on the left hash, so this one starts there. The right side is now the wide side of the field, about 30 yards to the sideline, and the left side the short side, about 23. Real offences put trips to the wide side and real defences set their strength and their pressure by it.

**The proposal (Middle for now).** Every snap starts in the middle of the field, as the game does today. Tracking the hash means teaching both play-callers about the wide side and the short side, which deserves its own design.

**The other choice (Hash now):** the ball goes on the left hash, the middle or the right hash, from where the last play ended, and spots are measured from there; the play-callers ignore it until their own design.

## Question 4: the plan

| step | what | changes games? |
|---|---|---|
| 0 | the spot tables, checked against real alignments, with tests; not used in games | no |
| 1 | the game works out every snap picture and saves it on the play | no, proved replay for replay |
| 2 | **the pocket fix's unblocked rushers start from their real snap spots** (this replaces the Wait answer you gave, which said: only until real spots exist) | yes |
| 3 | a disguised man has to travel from where he stood to his job (the cost of disguise) | yes |
| 4 | tells (question 2), once Disguise ratings vary | yes |
| 5 | motion, as you ruled it in October | yes |
| 6 | later designs read the spots: blocked rushers' paths, safety depth in the interception design, run fits | yes |

Steps 0 and 1 change nothing in any game, so they can be merged while the pocket fix is being measured. Each step comes to you with its numbers. Two contracts edits come at step 1 (the snap spot itself, and putting it on the play), and each needs your typed yes by name then.

**The proposal (Yes).** **The other choice (Change the order):** tell me what should move.

## Question 5: draw it in the game viewer?

**An example.** You open a game, click a play, and see all 22 men as dots where they stood at the snap: the two safeties at 12 yards showing two-high, the backers walked up in a Mug, the slot corner at 5 yards. You can check by eye that a Mug looks like a Mug.

**The proposal (Yes, at step 1).** **The other choice (Later):** the picture is saved on every play but not drawn yet.

## Small choices I make unless you say otherwise

- Spots are in yards, to half a yard; the 25 boxes stay for everything after the snap until each piece is redesigned.
- The starting distances (backers at 4½, a walked-up backer at 2½, a Mug at 1½, press at 1, off at 7, deep halves at 12, the deep middle at 13) are placeholders, checked at step 0 against your August ranges and, if its terms allow it, the NFL's Big Data Bowl tracking data, which shows real players at the snap.
- A man-coverage defender shades a yard away from his help: outside when a safety is in the middle, inside when nobody is deep.
- At step 3, the coordinator design's "late" (a beat late to his landmark) becomes real travel from his snap spot; a bust stays a roll.
