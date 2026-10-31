# ADR-093: penalties and human officials, in plain words

*2026-10-31. The full design is [ADR-093](ADR-093-penalties-called-by-human-officials.md); the real numbers behind it are on [their own page](ADR-093-real-penalty-numbers.md). Design only: nothing in the game changes yet. You never merge: each step comes to you with its numbers, and I ask "should I merge?"*

## What it does

Today the game has no penalties at all. A real NFL game has about **13 flags**, and each team loses about **43 yards** to them. This design adds them in two layers, the way you asked:

1. **The players foul.** A lineman who's beaten grabs the man going past him; a corner who's beat deep tugs the receiver's arm; a rusher hits the quarterback late. Whether a player does it depends on the moment and on his **Discipline** (and his **Volatility** for late hits and taunting).
2. **The officials call it, or don't.** They see most of what's plain (a false start), less of what's in the open (pass interference), and much less of what's in the pile (holding). Sometimes they flag a close play that wasn't a foul. Each crew has its own leans.

Whatever the officials call is enforced **exactly as the NFL does**: the yards, the spot, half the distance near the goal line, automatic first downs only where the NFL gives them, loss of down for intentional grounding, a safety for holding in your own end zone, offsetting flags, the 10-second runoff, the untimed down at the end of a half. Your stem offside call (a free play, 5 yards) is the first rule in it.

One honest note: the NFL rulebook website is blocked from my computer here, so I wrote the rules from what I know and marked every one to be checked. **The rulebook part won't merge until each rule has been checked against the real rulebook**, with its rule number beside it. If you can, adding `operations.nfl.com` to the environment's allowed websites (or uploading the rulebook PDF) would let me do that check.

## What the real numbers show

I counted every flag in three NFL seasons (2022 to 2024) and which referee's crew threw it.

- **The biggest flags** (per team, per game): false start 1.15, offensive holding 1.13, defensive pass interference 0.55, defensive holding 0.46, defensive offside 0.38, delay of game 0.30, unnecessary roughness 0.29.
- **Crews really differ on holding.** The strictest crew calls 3.4 offensive holds a game, the loosest 2.1, and it isn't luck: it carries from one season to the next. **Crews call pass interference almost exactly alike.** Formation and shift calls are a crew's own emphasis; false starts and offside are called alike by everyone.
- **They let them play.** Flags fall about 16% late in close games and 17% in the playoffs.
- **Road teams draw 7% more flags,** but mostly in places the crowd explains: neutral zone infractions by the road defense (the home quarterback's hard count) and delay of game by the road offense (the noise). Defensive holding by the road defense is the one gap the crowd doesn't obviously explain.
- **Nobody counts missed calls.** The data only holds flags that were thrown. So how much the officials miss, and how often they're wrong, is your call (questions 1 and 2). Whatever you pick, the game still throws the real number of flags; your choice decides how many fouls happen that nobody flags.

## Words I use

- **Foul:** what the player really did. **Flag:** what the officials called. A flag can be on nothing.
- **Seen chance:** how likely the officials are to flag a real foul.
- **Crew:** the seven officials who work a game, led by the referee. The NFL has 17.
- **Crew lean:** how much more or less a crew calls one kind of foul than the league does.
- **Judgment call:** a foul where the official decides how much is too much (holding, interference, roughing), as opposed to a plain one (a false start).

## The questions

### Q1. How much of the holding in the pile do the officials see?

**Example:** your left tackle is beaten off the edge and grabs the rusher's jersey. The sack doesn't happen. Does the umpire see it?

- **2 in 3:** an offense really holds about 1.6 times a game.
- **1 in 2 (recommended):** about 2.2 times a game, and about one of those a game saves a sack or springs a run with no flag. It matches the old line that "you could call holding on every play", without making the pile lawless.
- **1 in 3:** about 3.2 times a game; holding becomes a big hidden part of every line's play.

Under any choice, holding is flagged about 1.1 times a team-game, the real number.

### Q2. How often is a flag thrown on nothing?

**Example:** a corner breaks up a pass with a clean hand on the ball, but it came a split second early and looks like interference from the side judge's angle. Flag.

Wrong flags in this design only come from plays that were close to a foul, never from nothing at all. The share counts judgment calls (about 7.4 of a game's 12.8 flags); plain calls like false starts are wrong a tenth as often.

- **1 in 50 judgment flags:** about one wrong flag every six or seven games.
- **1 in 20 (recommended):** about one wrong flag every two or three games, so a few around the league every week. Enough that fans complain about a bad call every Sunday, as they do.
- **1 in 10:** close to one a game.

### Q3. Should the league have 17 named crews?

**Example:** in Week 6 the Bills play at the Jets, and the crew is the strictest holding crew in the league. The Bills' coaches see that on the crew sheet in game week.

- **Named crews (recommended):** 17 crews with made-up referee names, stand-ins for the real ones like the players and coaches, each with its own leans (sized to how much real crews differ), assigned each week, no crew on the same team twice in four weeks, and the coaches see the leans in game week. Later the game plan can react to them.
- **Fresh each game, unseen:** each game draws its leans at random, and nobody sees them.

### Q4. Should officials "let them play" late in close games and in the playoffs?

**Example:** fourth quarter, down 3, third and 8. The tight end and the linebacker are hand-fighting at the top of the route. In the first quarter that's a flag more often than now.

- **Yes, as measured (recommended):** on judgment calls only, the officials' seen chance drops late in close games and in the playoffs, by whatever it takes to match the real drop after the players' own share. False starts and offside get no officials' lean; their late drop has to come from the players.
- **No:** officials call every snap the same, and only the players change.

### Q5. Should officials lean toward the home team?

- **No, the crowd only (recommended):** most of the road team's extra flags come from the crowd (the hard count at home, the noise for the road offense), and the design already puts those there. The road defense's extra holding flags are a number we watch; if the game misses it, I bring it back to you.
- **A small lean:** officials call judgment calls a little more on the road team, sized to the real 7%.

### Q6. Where does the coach see fouls the officials missed, and flags on nothing?

**Example:** after the game, your coach opens the film of the drive that stalled and sees the defensive end got away with two holds on third down, and the flag that killed the drive before that wasn't a foul.

- **On film only (recommended):** the play log and box score show what the officials called, like a broadcast. The game viewer's play detail (the film room) shows every foul, flagged or not, and marks wrong flags.
- **In the play log as it happens:** "uncalled hold" right there in the play-by-play.
- **Nowhere:** the game keeps them for our own measuring only.

### Q7. May I build the first two steps now?

Step 0 is the rulebook (how every flag is enforced) and step 1 is the officials and crews. Neither changes a single play, because nothing produces a foul yet, so they can't disturb the pocket fix's measuring. It's the same arrangement you approved for the snap spots' first steps.

- **Yes, now (recommended):** I build and test them while the pocket fix finishes, and bring each to you before merging. The rulebook step still waits on the rulebook check.
- **After the pocket fix.**

Everything that makes fouls happen on the field (holding, interference, late hits, false starts) comes after the pocket fix, one family at a time, each measured against the real numbers.
