# ADR-075: the questions, in plain words

*Revised 2026-10-16 after your note that the players carry out a disguise and the coordinator
trains them. The full design is in
[ADR-075](ADR-075-each-coordinator-disguises-his-own-way.md). Each open question is on a card in
the thread with my recommendation marked.*

## Already ruled

- **Q1, both.** Coordinators differ in how often they disguise and how well it's done.
- **Q2, wide.** Each coordinator disguises somewhere from 10% to 55% of passing snaps, and the league
  average stays at about 31%. Your source's Rams at 50.5% sits inside that range.
- **Q3, all three.** His style also covers which looks he likes, how late he rotates, and, once the
  front work builds them, how often he shows a fake rush.

The first draft's Q4 asked whether the coordinator's own rating should make his disguises harder to
read. Your note changes that: the players carry it out, so I've withdrawn that question. If you
still see the old Q4 card, you can ignore it.

## How "how well" works now

1. **Players have a Disguise rating** (defensive backs and linebackers, and linemen once the fake
   rushes exist). It means holding the shown look with no tells, then getting to the real spot on
   the snap.
2. **The quarterback's read** gets harder when the players moving in the disguise are good at it,
   and easier when they're poor. Because one man moving early gives the whole thing away, the
   weakest of them decides. An average player (50) leaves today's read exactly as it is.
3. **Disguising has a cost.** Today it's free: the sim plays everyone from his real spot, so the
   disguise can only help. Under this design, each player moving in a disguise rolls at the snap.
   He gets there on time, he's a beat late (a corner faking off then pressing gives the receiver a
   free release), or he busts and leaves his man or zone open. Late rotations are harder to pull off
   than early ones. That's why a static coordinator like Gus Bradley makes sense: he gives up the
   trickery and never busts from it.
4. **The coordinator's skill is teaching it.** His teaching rating sets how fast his players'
   Disguise rating grows, and they practise it about as much as he calls it. So a heavy disguiser
   who inherits a static coordinator's secondary has a rough first year.
5. **The training happens** in the spring (OTAs and minicamp, learning his looks), in training camp
   (the biggest share), and in weekly practice plus game snaps during the season. A player who isn't
   practising gets nothing that week, so missing camp hurts most. A mid-season signing starts behind
   because he's still learning the playbook.

Baiting the quarterback's own pre-snap checks, the third point in your source, belongs to the weekly
game plan against a specific quarterback. That's a later piece of the coaching design, not this one.

## The open questions

**Q4. Should the coordinator's skill at teaching disguise be its own rating?** The other option is
to use the existing Teaching rating, which today means how fast he installs the playbook. *I
recommend its own rating.* A coach can be quick at installing a playbook and still poor at the
detail of disguise, which is exactly the "bad coordinator" in your source.

**Q5. When a disguise needs several players, who decides how well it holds up?** The options are
the weakest of them or their average. *I recommend the weakest,* per your source: if one moves too
early, the quarterback spots it.

**Q6. Should a disguise carry a real cost, with players a beat late or blowing their assignment?**
*I recommend yes.* Without a cost, every coordinator should disguise as much as he can, and the wide
spread you just chose would only show which coordinators are making a mistake. This is the one part
that changes what happens on the field after the snap. The play called is still the play run, but
it can now be run badly.

**Q7. When does the training happen?** The options are all three windows with camp the biggest,
camp only, or weekly practice only. *I recommend all three, with camp the biggest.* Injured players
miss whichever weeks they don't practise.
