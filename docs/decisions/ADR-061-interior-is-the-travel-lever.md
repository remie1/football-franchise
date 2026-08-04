# ADR-061: `INTERIOR` is the travel lever — and its value has never been derived

- **Date:** August 2026
- **Proposed by:** Orchestrator, on the first measurement of `arrival.travelSecondsByAlignmentAndMove`
- **Status:** approved

---

## ⛔⛔ READ THIS BEFORE ANY FIGURE IN THIS DOCUMENT

> ## ⛔ **`INTERIOR = 2.0` IS REFUSED AS A CANDIDATE VALUE. IT IS NOT A TARGET, NOT A PROPOSAL, AND NOT A RECOMMENDATION.**

**A figure appears below showing that arm landing `sack` at `+1.04pp` from real — the closest any arm
in this project has come.** ⛔ **IT IS REFUSED, for three reasons, all of which apply before the
number is read:**

1. ⛔ **POST-HOC.** It was found by sweeping, not predicted. **Same standing as the corridor and
   `(90, 2.0, 0.0)`, both refused on exactly these grounds.**
2. ⛔ **`exit` COLLAPSES ALONGSIDE IT** — `78.56% → 72.02%` — **against a real side THAT DOES NOT
   EXIST** *(`qb_disruption_rate` is sim-side-only by ruling)*. **Two of three metrics move and only
   one can be scored.**
3. ⛔ **ONE CLOSE ARM IS NOT A DERIVATION.** **This ADR ratifies WHICH CELL IS THE LEVER. It ratifies
   NO VALUE.**

⚠ **This paragraph sits before the evidence deliberately.** ⛔ **A `+1.04pp` figure left unqualified
anywhere in a document WILL be read as a target by a reader who does not reach the caveat.**

---

## ⛔ THE CONDITIONS EVERY RELATIONSHIP HERE HOLDS UNDER

**Per the class upgraded in backlog entry 134 — *any measured relationship carries its configuration,
and citing it elsewhere requires establishing the configuration transfers.*** ⚠ **These are NOT
caveats. They are the conditions.**

- **Corpus:** `flat-60-32t`, `SYNTHETIC_ROUND_ROBIN` 2024, 496 games, `baseline-0001`, seed digest
  `fnv1a:020c1dcb#496`
- ⛔ **A FLAT LEAGUE** — every attribute identical. **No rating dispersion anywhere.**
- ⛔ **A FROZEN CALLER** — `FROZEN_TENDENCIES` / `FROZEN_FOURTH_DOWN`
- ⛔ **POST-ADR-059** *(correlated reps)* **and POST-ADR-060** *(sack physically anchored)*
- ⛔ **`dominanceMarginPerHalfTick` HELD COMMITTED (`50`) on every arm** — the shave is a separate
  lever with its own discharged obligation *(entry 114)*, **and confounding them would recreate the
  joint-arm problem `ADR-TEMPLATE.md`'s worked example warns about**

## Provenance of factual claims — REQUIRED

| # | claim | provenance |
|---|---|---|
| 1 | `INTERIOR` carries **~85%** of the won-rep population | ⚠ **INHERITED** — entry 110. **Not re-derived here** |
| 2 | `INTERIOR v=2.0`: disagreement `2,520 → 15,198` *(`7.2% → 39.1%` of forced plays)* | ✅ **MEASURED** — entry 135, 20 arms, canonical corpus |
| 3 | `INTERIOR v=2.0`: `sack` `16.509% → 7.599%`; `exit` `78.56% → 72.02%`; `entry` flat | ✅ **MEASURED** |
| 4 | real `sack` = **`6.560%`** | ✅ **READ** — `tier1.ts`, post the scramble-denominator fix |
| 5 | `INTERIOR v ≤ 1.0` is **bit-identical** to committed on every metric | ✅ **MEASURED — DETERMINISTIC.** No power statement owed |
| 6 | `minTravelSeconds = 1.0`, and `INTERIOR` is committed **at that floor** | ✅ **READ** — `tunables.ts` |
| 7 | `EDGE.POWER`: only **`12` of `3,632`** merged-bucket ties are genuinely `POWER` | ✅ **MEASURED** |
| 8 | `qb_disruption_rate` and the entry/exit quotient have **NO REAL SIDE**, by ruling | ✅ **READ** — `tier1.ts:546`; entry 93 |
| 9 | The constant is `INTERPRETATION`-marked, with a physical narrative that **never reaches its own arithmetic** | ✅ **READ** — entry 111 |
| 10 | What `INTERIOR`'s value **should** be | ⛔ **NO PROVENANCE. Never derived, never ruled — see Decision** |

## Conjoined mechanisms

⛔ **This ADR rules on ONE thing: which cell of `travelSecondsByAlignmentAndMove` is the lever.**
✅ **Not separately priceable — there is one claim.** ⚠ **The four axes WERE swept independently, and
`dominanceMarginPerHalfTick` was held committed throughout, precisely so no conjunction was created.**

## Implied scope

- ⛔ **`EDGE.POWER`'s inertness is a DISTRIBUTION fact, not an arithmetic one** — `12` genuine ties in
  `3,632`. ⚠ **The constant has almost no reach REGARDLESS OF ITS VALUE.** ⛔ **That points at MOVE
  SELECTION, a different subsystem, NEVER EXAMINED — `unruled`, queued as its own item** *(entry 136)*.
  **Folding it in here would be ADR-032's implied-scope defect arriving between SUBSYSTEMS.**
- ⚠ **`EDGE.FINESSE` moves outcomes clearly and carries nearly the whole not-`SPEED` EDGE population.**
  **`unruled` — this ADR names the lever, and `EDGE.FINESSE` is not it.**
- ⛔ **`EDGE.POWER` and `EDGE.FINESSE` are both committed at `1.5`.** ⚠ **Whether they SHOULD differ is
  now answerable and unanswered** — the sweep establishes they move outcomes differently *(one is
  effectively inert, the other is not)*, **which is a different question from what value each should
  hold.** ⛔ **`unruled`.**
- **`IMMEDIATE`'s missing consumer** *(ADR-060's open item, external read 3 horn (c))* — **upstream of
  this and unaffected by it.**

## Need

**External read 3 §6 concluded that with the sack re-anchored, the committed `+10pp` overshoot against
real is unambiguously a SUPPLY-AND-TRAVEL problem**, naming `travelSecondsByAlignmentAndMove` and
entry 104's `T` curve as the only levers that move when rushers physically arrive.

⛔ **The closure audit (entry 132) then found that the travel table had NEVER BEEN SWEPT.** ⚠ **Entry
110's tie/disagree table is ARITHMETIC ON THE CONSTANTS AS COMMITTED, never counterfactualled.**
✅ **Entry 114 discharged the OTHER half of ADR-058's relocated obligation** *(the shave)*; **this half
was outstanding.**

> ### ⇒ **A CONSTANT UNDER RULING THAT HAD ONLY EVER HAD ARITHMETIC BEHIND IT.**

## The finding

> ## ⛔ **`INTERIOR` IS THE LEVER. IT IS NOT CLOSE.**

**A single half-tick of widening past committed does more than the full grid on all three EDGE axes
combined** — consistent with claim 1's ~85% population share, now visible in outcomes rather than
inferred from it.

**And the axis is ONE-SIDED, structurally:**

> ## ⛔ **`INTERIOR v ≤ 1.0` IS BIT-IDENTICAL TO COMMITTED — a DETERMINISTIC CLAMP-NULL.**

⚠ **`minTravelSeconds = 1.0` and `INTERIOR` is committed AT ITS OWN FLOOR, so narrowing is absorbed
entirely.** ⛔ **Anyone later reading *"swept 0.0 through 3.0"* must find this stated rather than infer
a continuum.** ✅ **The grid has four live points, not seven.**

## Decision

**APPROVED.** ⛔ **This ADR establishes WHICH CELL IS THE LEVER. It sets no value and proposes none.**

### ⛔ AND IT RECORDS THAT THE VALUE HAS NEVER BEEN DERIVED

**Entry 111's archaeology found the constant's comment gives a physical scenario —** *interior
"~4-5 yards from a shotgun launch point," edge "10-12 yards… arc"* — ⛔ **with NO CONVERSION FROM THOSE
YARDAGES TO THOSE SECONDS.** ⚠ **No speed constant, no distance/rate step, nowhere.**

> ### ⛔ **A PHYSICAL NARRATIVE THAT DOES NOT REACH ITS OWN NUMBERS READS AS A DERIVATION AND IS NOT ONE.**

**So: what `INTERIOR` should hold is a FOOTBALL QUESTION WITH NO PRIOR.** ⛔ **There is nothing to
weigh a proposal against.**

> ## ⇒ ✅ **NAMING THE LEVER AND RECORDING THAT ITS VALUE HAS NEVER BEEN DERIVED IS A DIFFERENT AND MORE HONEST ENDING THAN PROPOSING ONE.**

⚠ **A future ruling on the value needs a derivation — or an explicit owner ruling that none is
available and the value is chosen — not a sweep result that happened to land close.**

Related: [ADR-058](ADR-058-arrival-is-authoritative-for-a-won-rep.md) (routed won-rep forcing through
this table), [ADR-059](ADR-059-the-rep-latent-is-a-roll.md) (correlated reps — the tree this was
measured on), [ADR-060](ADR-060-the-sack-is-a-physical-event.md) (sack physically anchored — why
`sack` here means what it says), [ADR-032](ADR-032-gaining-ground-is-not-the-pressure-rate.md) (the
implied-scope precedent `EDGE.POWER` is held out under).
