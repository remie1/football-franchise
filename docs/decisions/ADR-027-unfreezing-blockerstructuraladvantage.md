# ADR-027: unfreezing `blockerStructuralAdvantage` — for measurement, not for editing

- **Date:** July 2026
- **Proposed by:** Orchestrator
- **Status:** approved — the sweep is authorised; **a value change remains a separate petition**

## Need

`TUNABLES.passRush.blockerStructuralAdvantage` has been frozen for **sixteen consecutive
dispatches**. It was introduced in the very first engine slice as a named `INTERPRETATION`: the
design doc's §7.1 gives the rusher two-to-three attribute terms against the blocker's two, so an
evenly-rated matchup favours the rush by roughly 15 points *structurally, before any dice*, and on
the literal formula every pocket collapsed inside 1.5s.

It has been frozen ever since precisely so that no dispatch could quietly tune it to make some
other number look better. That discipline has held and is why the backlog's figures are worth
anything.

**It is now the dominant open item in the project**, and three independent results say so:

1. **Entry 26.** `pressure_to_sack` measures **15.19% against a real 16.37%** — the engine converts
   pressure into sacks at very nearly the real rate. Since every sim sack sits on a pressured
   dropback by construction, sim `pressure_to_sack ≡ sack_rate ÷ pressure_rate` exactly, so **the
   entire sack excess is a pressure-RATE excess.** At the real 29.23% pressure rate with the sim's
   own conversion, sack rate would be **4.48% — below** the real 6.90%.
2. **ADR-024.** Ending perfectly-informed protection — the largest structural distortion in the
   caller — moved pressure by **1.54pp** against a rate of 88.68%. Almost no headroom.
3. **ADR-026.** Fixing the unblocked protector moved it another **1.08pp**, to **89.14%**, while
   `pressure_to_sack` moved by **one thousandth of a percentage point.**

Two known distortions have now been removed and pressure remains **89.14% against a real 29.23%.**
**The excess is overwhelmingly mechanical**, and this tunable is the mechanism.

## The preconditions the freeze was waiting for are met

ADR-024's stated precondition was that it be *"measured against a caller that guesses"* — it now
is. ADR-026's was that the pressure rate not be absorbing a known 13.40% distortion — it no longer
is. `calibration.md` §5.3's new precondition (a sweep must establish its subject has a live
population) is satisfied trivially: this term is in **every** §7.1 rep.

## Decision

**The sweep is authorised. The committed value is not.**

- **Unfrozen for MEASUREMENT.** A sensitivity sweep may vary `blockerStructuralAdvantage` through
  `applyTunablePatch` in memory, across whatever range the method requires, and report the
  response curve.
- **The committed value stays 15 until a separate petition changes it.** `calibration.md` §6 is
  explicit that calibration's proposals are **patches, not edits** —
  `{tunableId, currentValue, proposedValue, evidence: reportRef, expectedEffect}` filed as an ADR.
  This ADR does not pre-approve whatever the sweep finds.

That split is the whole point. The freeze existed to stop a number being *changed* to flatter a
metric; it should never have stopped the number being *measured*. Sixteen dispatches of not
measuring it is the cost of not having drawn that line earlier.

### Method requirements, carried from what the backlog has already learned

- **Map the response curve before choosing rungs** (§22d). A ladder whose rungs sit on a saturated
  shelf measures the shelf: entry 22's original accuracy figures were wrong for exactly that
  reason, reading a 9.9-point span as 4.3.
- **Probe in both directions and report signed results** (attribution rule 1). Two of four cited
  y/c levers turned out to be *inverted* — entry 14 and entry 11's own proposal both moved the
  number the wrong way when probed in their stated direction.
- **Expect non-additivity with anything it interacts with** (attribution rule 2), and **state the
  base with every share** (attribution rule 3).
- **Report the affected-play count** (§5.3's precondition).
- **§7.1's asymmetry is a design-doc defect, and the sweep is not the decision about it.** Entry 3
  records the real choice: add a genuine blocker term (`anchor` or `strength` — restoring symmetry
  in attributes rather than in a constant), or keep the flat term. The sweep informs that choice;
  it does not make it.

  > **A sweep that finds a better constant is measuring the COMPENSATOR, not the defect.**

  A proposal that only moves the number must argue **why the attribute-term fix was rejected** —
  and it argues uphill, because **the attribute-term route is the one that survives attributes
  landing.** A tuned constant is fitted to a flat-60 league where every blocker is identical; it
  will need re-litigating the moment real ratings create genuine blocker variance, which is
  precisely when the compensation becomes invisible again. Prefer the fix that does not have to be
  paid for twice.

## Impact

- **engine:** none until a petition lands. The value stays 15.
- **calibration:** may sweep it. Every report must state the tunables version and digest it
  measured (ADR-025), and a swept value never becomes a committed one without §6's patch record.
- **`sackWhenNoTarget` and `freeRunnerArrivalSeconds` remain frozen.** `freeRunnerArrivalSeconds`
  is now sweepable in principle (it governed 56 dropbacks at v1 and a real population at v2) but is
  **second** in the order, behind this.
