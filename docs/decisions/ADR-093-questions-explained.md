# ADR-093: penalties and human officials, in plain words

*2026-10-31. The full design is [ADR-093](ADR-093-penalties-called-by-human-officials.md); the real numbers behind it are on [their own page](ADR-093-real-penalty-numbers.md). Design only: nothing in the game changes yet. You never merge: each step comes to you with its numbers, and I ask "should I merge?" Revised the same night, after you asked which of my numbers are real: two recommendations changed (Q1 and Q5).*

## What it does

Today the game has no penalties at all. A real NFL game has about **13 flags**, and each team loses about **43 yards** to them. This design adds them in two layers, the way you asked:

1. **The players foul.** A lineman who's beaten grabs the man going past him; a corner who's beat deep tugs the receiver's arm; a rusher hits the quarterback late. Whether a player does it depends on the moment and on his **Discipline** (and his **Volatility** for late hits and taunting).
2. **The officials call it, or don't.** They see most of what's plain (a false start), less of what's in the open (pass interference), and much less of what's in the pile (holding). Sometimes they flag a close play that wasn't a foul. Each crew has its own leans.

Whatever the officials call is enforced **exactly as the NFL does**: the yards, the spot, half the distance near the goal line, automatic first downs only where the NFL gives them, loss of down for intentional grounding, a safety for holding in your own end zone, offsetting flags, the 10-second runoff, the untimed down at the end of a half. Your stem offside call (a free play, 5 yards) is the first rule in it.

One honest note: the NFL rulebook website is blocked from my computer here, so I wrote the rules from what I know and marked every one to be checked. **The rulebook part won't merge until each rule has been checked against the real rulebook**, with its rule number beside it. If you can, adding `operations.nfl.com` to the environment's allowed websites (or uploading the rulebook PDF) would let me do that check.

## Which numbers are real

You asked whether my recommendations rest on real NFL statistics. Some do and some don't, so here is which is which.

- **Counted from real games** (the NFL's play-by-play, every flag): how often each foul is flagged, the yards, how crews differ, the drop late in close games and in the playoffs, home and road. I also counted thirteen seasons (2013 to 2025) to see how the calls move when the league changes its standard, whether a crew keeps its leans from one year to the next, what happened in 2020 without fans, and what replay found in 2019, the one season pass interference could be challenged. Where others have published the same counts, mine match.
- **Reported by others:** the NFL's own grading of its officials, the league's statements on wrong roughing-the-passer flags, and studies of "letting them play" and of home and road. I could see these only in search results, because this computer can't open those websites, and the league doesn't publish its grades.
- **Measured by no one:** how many holds happen that nobody flags, and how many flags are wrong across every foul. So **"about 2.2 holds a game" in Q1 was not a real statistic.** It was my arithmetic: the real flag rate (about 1.1 holding flags per team a game) divided by a guessed share the officials see (1 in 2).

What I did about it: I found real numbers that fence in the guess from both sides. They changed two recommendations, **Q1 (now 2 in 3)** and **Q5 (now a small lean)**, and they now back Q2, Q3 and Q4. Under each question, **Real numbers behind it** says what's measured, and **My judgment** says what's still my pick.

## What the real numbers show

- **The biggest flags** (per team, per game, 2022 to 2024): false start 1.15, offensive holding 1.13, defensive pass interference 0.55, defensive holding 0.46, defensive offside 0.38, delay of game 0.30, unnecessary roughness 0.29.
- **Crews really differ on holding.** The strictest crew calls 3.4 offensive holds a game, the loosest 2.1, and it isn't luck: a crew's lean carries into the next season (measured over eleven seasons). **Crews call pass interference almost exactly alike.** Formation and shift calls are a crew's own emphasis; false starts and offside are called alike by everyone.
- **They let them play.** Flags fall about 16% late in close games and 17% in the playoffs. It's the stage, not the teams: in the regular season, playoff teams draw only 2.5% fewer flags than everyone else.
- **Road teams draw about 7% more flags.** The 2020 season, played mostly without fans, split them. The ones the crowd explains went away (neutral zone infractions drawn by the home quarterback's hard count, delays of game in the noise). The road defense's extra pass interference, holding and illegal contact flags stayed.
- **The standard moves; the players don't.** Twice the league told crews to call holding strictly (one week late in 2018, the first two weeks of 2019). Those weeks crews flagged **twice as many holds**, while false starts didn't move, and then it fell back. The players didn't change in a week; what counted as a hold did.
- **Nobody counts missed calls in the data.** The play-by-play only holds flags that were thrown. The league's own grading says about **4 to 5 mistakes a game** of every kind, and **fewer than one wrong flag**. Whatever you pick for Q1 and Q2, the game still throws the real number of flags; your choice decides how many fouls happen that nobody flags.

## Words I use

- **Foul:** what the player really did. **Flag:** what the officials called. A flag can be on nothing.
- **Seen chance:** how likely the officials are to flag a real foul.
- **Crew:** the seven officials who work a game, led by the referee. The NFL has 17.
- **Crew lean:** how much more or less a crew calls one kind of foul than the league does.
- **Judgment call:** a foul where the official decides how much is too much (holding, interference, roughing), as opposed to a plain one (a false start).
- **Standard:** what the league counts as a foul. It can tighten it for a few weeks (a point of emphasis) or loosen it for a season.

## The questions

### Q1. How much of the holding in the pile do the officials see?

**Example:** your left tackle is beaten off the edge and grabs the rusher's jersey. The sack doesn't happen. Does the umpire see it?

- **2 in 3 (recommended now):** an offense really holds about 1.6 times a game. About one hold a game, both teams together, saves a sack or springs a run with no flag.
- **1 in 2 (my first recommendation):** about 2.2 times a game, and about two holds a game go unflagged.
- **1 in 3:** about 3.2 times a game, and about four go unflagged; holding becomes a big hidden part of every line's play.

Under any choice, holding is flagged about 1.1 times a team-game, the real number.

**Real numbers behind it:** nobody counts unflagged holds. But the league's own grading found 4.3 to 4.5 mistakes a game of every kind (2015) and fewer than one wrong flag a game (2014), so by its count officials miss about 3.5 fouls a game at most. Under 2 in 3, the game's officials make about 3.5 mistakes a game in all. Under 1 in 2 they'd make about 5.6, more than the league counted, and under 1 in 3 about 10. That's why I changed my recommendation.

**My judgment:** the league may undercount its own misses (a close call the supervisor backs isn't marked as a mistake), and that is the case for 1 in 2. The strict weeks, when crews flagged twice the holds, I count as a stricter standard, not sharper eyes: that goes into the crews' leans, not into this number.

### Q2. How often is a flag thrown on nothing?

**Example:** a corner breaks up a pass with a clean hand on the ball, but it came a split second early and looks like interference from the side judge's angle. Flag.

Wrong flags in this design only come from plays that were close to a foul, never from nothing at all. The share counts judgment calls (about 7.4 of a game's 12.8 flags); plain calls like false starts are wrong a tenth as often.

- **1 in 50 judgment flags:** about one wrong flag every six or seven games, about 1% of all flags.
- **1 in 20 (recommended):** about one wrong flag every two or three games, so a few around the league every week, about 3% of all flags. Enough that fans complain about a bad call every Sunday, as they do.
- **1 in 10:** close to one a game, about 6% of all flags.

**Real numbers behind it:** the league's grading found fewer than one wrong call a game (2014). It judged 2 of 14 roughing-the-passer flags wrong in a weekend when those calls doubled (2018), and its rules committee found 3 of more than 80 roughing calls questionable (2022). Replay took away 3 of 2019's 437 pass interference flags (only 27 were looked at, so that's a floor). The NBA's audits of close finishes find about 3% of whistles wrong. 1 in 20 sits inside all of them; 1 in 10 is near the league's ceiling and twice what the audits find.

**My judgment:** no one counts wrong flags across every NFL foul, so the exact share is still a pick within those bounds.

### Q3. Should the league have 17 named crews?

**Example:** in Week 6 the Bills play at the Jets, and the crew is the strictest holding crew in the league. The Bills' coaches see that on the crew sheet in game week.

- **Named crews (recommended):** 17 crews with made-up referee names, stand-ins for the real ones like the players and coaches, each with its own leans (sized to how much real crews differ), assigned each week, no crew on the same team twice in four weeks, and the coaches see the leans in game week. Later the game plan can react to them.
- **Fresh each game, unseen:** each game draws its leans at random, and nobody sees them.

**Real numbers behind it:** crews really differ on holding (68% of the spread between referees is more than luck), and a crew's holding lean carries into the next season at a measured 0.35 over eleven seasons (2015 to 2025), so a crew's reputation is real. In a single season the crews' holding spread is about 17% of the league average.

**My judgment:** naming the crews and showing the coaches their leans is a design choice.

### Q4. Should officials "let them play" late in close games and in the playoffs?

**Example:** fourth quarter, down 3, third and 8. The tight end and the linebacker are hand-fighting at the top of the route. In the first quarter that's a flag more often than now.

- **Yes, as measured (recommended):** on judgment calls only, the officials' seen chance drops late in close games and in the playoffs, by whatever it takes to match the real drop after the players' own share. False starts and offside get no officials' lean; their late drop has to come from the players.
- **No:** officials call every snap the same, and only the players change.

**Real numbers behind it:** flags fall 16% late in close games and 17% in the playoffs (2022 to 2024), and 12.8 against 10.7 a game over 2000 to 2019. It isn't that playoff teams are cleaner: in the regular season they draw only 2.5% fewer flags than the rest. Research across four sports finds officials make fewer judgment calls late in tight games and on big stages, because they fear a wrong call more than a missed one. Holding and interference also follow an arc through a game, fewer at the start and the end and more in the middle (offensive holding is flagged 19.9 times per 1,000 snaps in the third quarter against 14.2 in the fourth). On yes, the officials follow that arc too.

**My judgment:** how much of the drop is the officials and how much is the players; the build measures it.

### Q5. Should officials lean toward the home team?

**Example:** your corner is on the road, hand-fighting a receiver on a deep ball. The same contact draws a flag a little more often than it would at home.

- **A small lean, on the defense's judgment calls (recommended now):** pass interference, defensive holding and illegal contact get called on the road defense 1.1 to 1.3 times as often as on the home defense, as in the real numbers. The road's extra pre-snap flags stay the crowd's (the hard count at home, and the noise for the road offense).
- **No, the crowd only (my first recommendation):** the crowd makes the road team's extra pre-snap flags, and nothing else changes on the road.

**Real numbers behind it:** in 2020, played mostly without fans, the road team's extra neutral zone infractions and delays of game went away, so those are the crowd. But the road defense's extra pass interference (1.14 times the home defense's with fans, 1.17 without), defensive holding (1.11 and 1.08) and illegal contact (1.29 and 1.19) stayed. A published study that adjusts for score, time and teams finds the odds of defensive pass interference 18 to 20% higher when the home team has the ball. That's why I changed my recommendation.

**My judgment:** whether that gap is the officials or something else about playing away, the numbers can't say; a lean is the simplest way to copy it. 2020 is one season, a small sample. One small gap goes the other way (road offenses are flagged for holding a little less), and I'll watch it and bring it back to you if the game misses it.

### Q6. Where does the coach see fouls the officials missed, and flags on nothing?

**Example:** after the game, your coach opens the film of the drive that stalled and sees the defensive end got away with two holds on third down, and the flag that killed the drive before that wasn't a foul.

- **On film only (recommended):** the play log and box score show what the officials called, like a broadcast. The game viewer's play detail (the film room) shows every foul, flagged or not, and marks wrong flags.
- **In the play log as it happens:** "uncalled hold" right there in the play-by-play.
- **Nowhere:** the game keeps them for our own measuring only.

**My judgment:** a design choice; no statistic decides it.

### Q7. May I build the first two steps now?

Step 0 is the rulebook (how every flag is enforced) and step 1 is the officials and crews. Neither changes a single play, because nothing produces a foul yet, so they can't disturb the pocket fix's measuring. It's the same arrangement you approved for the snap spots' first steps.

- **Yes, now (recommended):** I build and test them while the pocket fix finishes, and bring each to you before merging. The rulebook step still waits on the rulebook check.
- **After the pocket fix.**

**My judgment:** a design choice; no statistic decides it.

Everything that makes fouls happen on the field (holding, interference, late hits, false starts) comes after the pocket fix, one family at a time, each measured against the real numbers.
