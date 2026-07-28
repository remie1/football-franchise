# ADR-018: two spatial gaps in the play-call vocabulary, found while authoring the corpus

- **Date:** July 2026
- **Proposed by:** `franchise-engine`, from building `packages/playbook` under ADR-017
- **Status:** proposed — petition, not a decision
- **Affects:** `packages/contracts` (`playcalls.ts`), `packages/engine` (§7.4, §9.4 consumers)

## Need

ADR-017 sent the corpus in to close `CALIBRATION-BACKLOG.md` entry 8: *"without
horizontal placement on cards, every silent route shares a lane, so zone-coverage
metrics describe the fixture rather than the mechanic."*

That part is done. `RouteSpec.breakZone` is **required** in `packages/playbook`, all
123 routes in the corpus state it, and a test walks every route object rather than
sampling. Entry 8's stated cause is closed.

Authoring the other side of the ball surfaced two gaps of **exactly the same class**
— a card cannot say something spatial that the mechanic needs — and both were found
by writing real football rather than by inspection. Neither blocks the corpus. Both
put a ceiling on what calibration can conclude from it, which is why they are
petitioned now rather than discovered during a tuning run.

---

## Petition 1 — a zone defender covers one cell of twenty-five

**What the card can say today.** `ZoneAssignment` is `{ defender, zone: FieldZone }`,
one cell. `zoneDefenderFor` in `packages/engine/src/resolve/zone.ts` matches a
route's break cell to a defender's cell with `sameZone` — **exact equality**.

**The consequence, measured.** Seven coverage defenders can occupy seven of the
grid's twenty-five cells. Across the full corpus cross product (28 pass concepts x
22 defensive cards, 2,520 route instances) **66.7% of routes break into a cell that
is either manned or occupied by a zone defender** — 36.4% man, 33.0% zone. The
other third are uncovered *by construction*, not by design: a Cover 2 corner
responsible for the flat does not touch a route that breaks one band deeper in the
same lane, because his `zone` is one cell and the route's is another.

That is not what a zone is. A Cover 3 corner owns a **deep third** — a lane across
every deep band. A curl/flat defender owns a **region**. Modelling either as a point
means a defensive card's realism is capped at "did the author guess which cell the
offence would use", which is the fixture-shaped failure ADR-017 exists to prevent,
displaced from the offence to the defence.

**Mitigated, not solved, in the corpus.** `defensiveCards.ts` places defenders on the
cells the corpus's routes actually break into, and `test/corpus.test.ts` measures the
resulting reach and asserts a floor instead of assuming one. That is honest and it is
still an authoring workaround: the number is a property of how well the two halves of
one corpus were matched to each other, and it will fall the moment a real playbook or
a UI-authored card arrives.

**Proposed shape.** Widen the zone from a point to a span, in the vocabulary the §3
grid already has:

```ts
export interface ZoneAssignment {
  readonly kind: "ZONE";
  readonly defender: PlayerId;
  /** The cell the defender is anchored in — his landmark. */
  readonly zone: FieldZone;
  /** Lanes either side of `zone.horizontal` he also carries. Default 0. */
  readonly laneSpan?: number;
  /** Depth bands either side of `zone.vertical` he also carries. Default 0. */
  readonly depthSpan?: number;
}
```

Both optional and both defaulting to zero, so **every existing card and every engine
call site keeps its current behaviour** and the change is additive. A deep third
becomes `{ zone: { LW, DEEP }, depthSpan: 1 }`; a curl/flat becomes
`{ zone: { RW, SHORT }, laneSpan: 1 }`.

The engine change is confined to `zoneDefenderFor`: replace `sameZone` with a span
test. It reads no football out of it — the span is stated on the card, exactly as
`breakZone` is.

**Alternative considered and rejected: multiple `ZoneAssignment`s per defender.**
`assertCoherentPlayCall` rejects a defender with two coverage assignments, correctly
— that rule catches real incoherence and should not be weakened to smuggle in a
region.

**Calibration impact if not taken.** Entries 7 and 8 stay coupled: zone tunables
would be fitted against a coverage-reach rate that is an artefact of cell matching.
`CALIBRATION-BACKLOG.md` entry 8 says "do not fit zone tunables to measured zone
outcomes" — with horizontal placement landed, that instruction should now read *"do
not fit zone tunables until zones are regions."*

---

## Petition 2 — a rusher has no side, so blitz pickup is side-blind

**What the card can say today.** `RushAssignment.alignment` is
`RushAlignment = "EDGE" | "INTERIOR"`. There is no side.

**The consequence.** A defensive card cannot express "left A-gap blitz" or
"boundary-side edge pressure"; the two mugged linebackers in the corpus's Double A
look are indistinguishable to the engine. And because `ProtectionAssignment` states
the blocker↔rusher pairing, playbook must **invent** that pairing at instantiation
with no geometry to do it from. `assignProtection` pairs edge rushers to tackles and
interior rushers to guards and the centre, deterministically and often wrongly: the
left tackle can end up on the right end.

This is the pass-protection twin of `CALIBRATION-BACKLOG.md` entry 17 — *"§6.4's
climb pairs blockers to linebackers by ORDER, not geometry"* — and it has the same
character: not a wrong number, a missing dimension.

Note what the corpus **could** fix without contracts changing: run blocking now pairs
by GAP, because a defensive card states each defender's gap responsibility and
`RunBlockSpec` names a gap. Pass protection has no equivalent because the rush
vocabulary has no side. The asymmetry is the evidence.

**Proposed shape.** One optional field, mirroring the run game's existing `RunSide`:

```ts
export interface RushAssignment {
  readonly rusher: PlayerId;
  readonly move: RushMove;
  readonly alignment?: RushAlignment;
  /** Which side of the centre he starts on. Omitted ⇒ unknown, as today. */
  readonly side?: RunSide;
}
```

Additive and default-preserving again: omitted means what it means now. Playbook
would state it on all 22 defensive cards immediately and pair protection by side,
turning an invented pairing into a stated one.

**Why `RunSide` rather than a new enum.** It is already the vocabulary for "which
side of the centre", it is already in `playcalls.ts`, and a second enum meaning the
same thing is how two vocabularies for one fact start.

**Deliberately not petitioned: a gap for the rusher.** `RunGap` on a
`RushAssignment` would let a card say "A-gap blitz" exactly, and it is tempting.
It is also more than the pass-rush mechanic can consume — §7.2's time-of-arrival
model reads `alignment`, not a gap — so it would be vocabulary with no consumer.
Side is the minimum that makes pairing correct.

---

## What this ADR does NOT ask for

Recorded because a petition that quietly grows is worse than one that is refused.

- **Play action, motion, shifts, hot routes, option keys.** All absent from the
  vocabulary; all real omissions; none petitioned. Each is a MECHANIC that does not
  exist in the engine yet, and a data field for an unimplemented mechanic is a field
  that will be wrong by the time the mechanic lands. `packages/playbook` names them
  where they bite (`runConcepts.ts` on jet motion, `passConcepts.ts` on screens and
  on empty's missing hot route) and works without them.
- **A "blocking nobody" protection assignment.** With a four-man rush and five
  linemen protecting, the fifth lineman appears nowhere in the resulting
  `OffensivePlayCall`, so the engine sees a ten-man offence. It changes no
  resolution today. It is a reporting wart, not a modelling gap, and it should be
  fixed if and when the stream needs to account for every man.
- **Tackle-eligible and unbalanced lines.** Legal, rare, and expressible later
  without a vocabulary change.

## Impact if approved

- **contracts:** two additive optional fields. No schema bump, no breaking change.
- **engine:** `zoneDefenderFor` gains a span test; §7.4, when it lands, gains a side
  to pick up. Nothing changes for existing cards.
- **playbook:** states spans on 22 defensive cards and sides on every rush duty;
  `assignProtection`'s side-blind pairing comment comes out.
- **calibration:** coverage reach stops being an artefact of cell matching, which is
  the precondition for closing backlog entry 7 as well as 8.
