# ADR-046: A flat openness gain erases the rep that earned it

- **Date:** 2026-07-29
- **Proposed by:** Orchestrator (finding raised by `match-engine` in ADR-045 §3, brought rather than absorbed)
- **Status:** PETITION — awaiting project-owner ruling on the APPROACH. No code or doc changed.

## Need

§8.7 applies `route.opennessGainPerTick = 8` **identically, whatever the coverage rep produced.**

ADR-045 corrected §9.3's column by 15–18 points at the affected rows — and the predicted downstream
reluctance shift **did not appear.** The reason is this constant: **a 15–18 point base correction is
recovered in about two ticks.**

> **The outcome of the separation contest decays into irrelevance within a tick or two of the break.**

A receiver who **beat his man by 30** and one who **lost by 5** converge in two ticks, because a flat
additive gain **erases the difference between winning and losing the rep**. The route-running battle
that §9.3 exists to resolve has **a half-life measured in ticks.**

## This is not a tuning question, and must not be filed as one

**It is a STRUCTURAL INSENSITIVITY — the same species as ADR-028's constant swallowing blocker
quality.** In both cases a flat term sits downstream of a contest and destroys the contest's
information content. The number is not wrong on any scale; **the SHAPE is wrong.** (Compare ADR-039's
transcription artifacts: *not wrong on any scale — answers to questions never asked.*)

**And it gets WORSE when attributes land**, which is the part that makes it urgent rather than
interesting. `packages/attributes` is precisely what will make route-running differences real — and
this constant is what will flatten them. **A mechanic that erases attribute differences is a mechanic
that will make Phase 2 look like it did nothing.** Cf. `CALIBRATION-BACKLOG.md` entry 49: findings a
flat league cannot evaluate. This is the mirror image — a mechanic a flat league cannot *reveal*.

## Scope discipline, stated so it is not lost

`match-engine` **refused to re-tune §8.7 inside SA-08's labelling fix**, and that refusal was correct:
*a labelling correction that quietly re-tunes the passing game* is the pattern this project has
refused every time. **But refusing to re-tune it is not the same as refusing to look at it.** This
petition is the looking.

## The question for the owner — the SHAPE, not the value

Should openness gain be:

1. **Flat** (today): `+8/tick` regardless of the rep. **Simplest; erases the contest.**
2. **Proportional:** gain scales with current openness (a receiver already open pulls away; a covered
   one does not). Preserves ordering by construction, and compounds — **needs a ceiling**, and §8.7's
   existing decay-from-3.0s becomes the natural bound.
3. **Contest-conditioned:** gain is a function of the §9.3 margin that produced the band — the rep
   decides not just *where* the receiver starts but *how fast he separates*. **Closest to the
   football**: a receiver who won cleanly keeps winning; one who was stonewalled does not suddenly
   pull away. Also the most expensive, and it introduces a second consumer of the margin.

**Not asked here: a number.** Per the standing rule, whichever shape is ruled, the engine **derives**
its constants from an existing scale and states what it rejected — it does not pick a value that
makes a downstream metric behave (that is the compensation-debt pattern, refused every time).

## What must accompany the ruling

- **The consumer enumeration must be re-run**, per Charter §4.1: openness gain feeds the same scale
  ADR-045 just enumerated, and **the fixpoint's blind spot is label consumers** — pair it with a
  reading, always.
- **Options 2 and 3 change an ORDERED quantity's dynamics**, so the monotonicity discipline applies:
  *a receiver who won his rep by more is never less open at any later tick.* That is gateable and
  should be gated.
- **Price it as its own change**, not folded into SA-08's. ADR-045's population arm is the natural
  baseline, and its finding — *mean actual openness per read 45.62 → 38.79, tight-window reads 55.4%
  → 63.8%, everything else inside a quarter of its standard error* — is the before.

## Decision — RULED July 2026: **option 3, CONTEST-CONDITIONED.** Not proportional.

**Proportional is better than flat and still wrong, for a specific football reason: it makes the gap
widen forever.** A receiver who wins by 30 keeps pulling away from one who won by 10, **at an
accelerating absolute distance**, and that is not what happens on a route.

> **Separation is created at the break and then DEFENDED.** A corner who lost badly **closes ground as
> the route flattens**; a receiver who won cleanly **holds an advantage rather than compounding it.**

**So the rep outcome CONDITIONS the gain rate; it does not SCALE it.** A won rep produces a **higher
gain for the ticks immediately after the break**, then converges toward a **lower steady rate**. A
lost rep produces **little or no gain, and the defender may close.**

That reproduces the real shape — **separation peaks near the break and then decays or holds depending
on who won** — and it preserves the ordering the monotonicity gate needs **without unbounded
divergence**, which is precisely what disqualified option 2.

### Two constraints — SPECIFICATION, not derivation. Neither is the engine's to choose.

1. **A receiver who won his rep by more is never less open at any later tick.** The gateable
   invariant, and **the load-bearing one.**
2. **Gain must not fully erase the rep's margin at any tick within the route's live window.** This is
   **the property whose absence created this finding**: convergence in two ticks means *the contest
   decided nothing.*

**The rate mapping itself is the engine's to derive from an existing scale** (ADR-033's precedent:
derive it, state what you rejected, do not invent a constant — and never pick a value that makes a
downstream metric behave).

### Priority — this lands BEFORE the attributes pipeline

> **Phase 2 would ship and the mechanic meant to showcase it would erase it.** Route running is **the
> most legible attribute in the whole design to a player**. If it does nothing visible, the natural
> conclusion is **that attributes don't matter** — which is **worse than a wrong number, because it
> discredits the SYSTEM rather than the CELL.**

Recorded on the roadmap ahead of Phase 2 for that reason.
