# ADR-076: the questions, in plain words

The full design is in [ADR-076](ADR-076-the-weekly-game-plan-baits-the-checks.md). Each question is
on a card in the thread with my recommendation marked.

## The idea

Your source's third point about disguise was *exploit the offence's rules*: crowd the A-gaps to force
a check. In our sim every check the offence makes is a fixed rule. The QB slides toward the side with
more threats, keeps a back in when he's a man short, throws the hot when he sees a blitz, and goes
first to the hole the look shows him if he's fooled. A good coordinator learns an opponent's habits
and sets traps for them. That's the weekly game plan.

## Words I'm using

- **Check:** anything the offence changes at the line after seeing the defence.
- **Bait:** a look the defence wears on purpose to draw one check, over a call that punishes it.
- **Bite:** the offence makes the check the bait was fishing for.
- **Film:** what a staff can see of an opponent's past games. That's what was shown, what the
  offence changed at the line, and where the ball went. It doesn't include what the QB was thinking
  (our dice) or player ratings.
- **The leash:** the coach's 0 to 100 limit on what the QB may change. Work away from a covered man
  opens at 20, protection changes at 30, working to an open man at 40, motion at 90.

## The five baits

1. **Mug and drop.** Walk both inside linebackers up into the A-gaps, then drop them both. If the QB
   keeps his back in to block, the back's route is gone and seven defenders cover four receivers.
2. **Show blitz, sit on the hot.** Show pressure, then drop a man (a dropping end, a robber) right
   where the hot route goes.
3. **Two-high, rotate late.** Show two deep safeties, then rotate to the coverage that fills the hole
   the QB thinks he sees. This is the only one whose pieces exist today.
4. **Stem one way, come from the other.** Shift the line toward one side so the slide goes that way,
   and bring the extra man from the other side.
5. **Pass it off.** Answer the QB's motion so that man coverage looks like zone.

## How it works

Each week the coordinator's staff studies film of this week's opponent and works out how often this
offence bites on each bait, in each situation. A better game-planning rating means more games
studied. With only a few snaps to go on, the staff assumes the opponent is like the league. He then
calls the baits this offence bites on more often and the ones it reads well less often. He doesn't
disguise more in total; his overall rate is still his own style (ADR-075). He just picks which looks
to use, and when.

The offence's staff studies too. If it wins the prep battle, it knows what's coming, and its coach
tightens the QB's leash in those situations so he doesn't bite. That also costs him the good checks
in those situations.

Nothing about how plays are played changes. Every call the plan makes is one the sim already plays.

## The questions

**Q1. What can the game plan change?**
- (a) Only which looks he uses, over which calls, in which situations. His overall disguise rate and
  blitz rate stay the same.
- (b) He can also disguise more in total against a team that bites a lot.
- (c) He can also get bonuses on the field, as the original coaching spec sketched ("their left side
  protection is worse this week").

*I recommend (a).* It keeps his style meaning something week to week, and every effect can be traced
to a call he actually made. (c) would be the sim giving him a bonus he didn't earn by calling
anything.

**Q2. Where does the coordinator's knowledge come from?**
- (a) Film of what the offence actually did in recent games, with his game-planning rating deciding
  how many games he studies.
- (b) The offence's real ratings, with some random error added.

*I recommend (a).* It's how real staffs work. A QB who keeps falling for something is exposed on
film, and a rookie with no film is a mystery for a few weeks.

**Q3. How hard does he lean on a bait?**
- (a) At most twice as often as usual against a team that bites, and as little as half as often
  against a team that reads it well.
- (b) Up to three times as often.
- (c) He picks two or three baits and boosts them by a fixed amount.

*I recommend (a).* Leaning away from a look a QB reads well matters as much as leaning into one he
falls for. Twice as often is noticeable on film without making the defence a one-trick pony.

**Q4. What does the offence do if its staff wins the prep battle?**
- (a) Its coach tightens the QB's leash in the situations where the baits are coming. For example,
  "on third down this week, don't change the protection."
- (b) The QB reads those particular looks better. This needs a change to how reads work.
- (c) Nothing for now.

*I recommend (a).* It uses the leash we already have and has a real cost, because the QB also can't
make good checks there. One gap: the hot route isn't on the leash (it's part of the play), so bait 2
can't be answered this way yet.

**Q5. Build order?**
- (a) Build the game plan with bait 3 as soon as the first step of the coordinator style work lands,
  and add each other bait when its look exists. The front work brings Mug, Stem and the creeper, and
  the motion work brings pass-offs.
- (b) Wait until all five baits' pieces exist.

*I recommend (a).* Bait 3 tests the whole pipeline (film, plan, offence's answer) on its own. My
prediction is that bait 3 alone will barely move the numbers, because QBs see through two-high looks
about twice as often as they're fooled. The protection baits are where I expect it to show. Bait 1
also waits for the "sack and outlet" thread, because its payoff today depends on the odd result that
thread is checking.
