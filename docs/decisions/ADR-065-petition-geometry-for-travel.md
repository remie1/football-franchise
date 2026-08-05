# ADR-065 (PETITION): What the playbook must publish for a geometric travel model

- **Date:** August 2026
- **Proposed by:** Orchestrator, on owner ruling (backlog entries 155, 158; ADR-064)
- **Status:** ✅ **P1 APPROVED AND LANDED** · ⛔ **P2 and P3 remain `proposed`** — a PETITION under Iron Rule 2, ratified in part.

---

## ⛔ WHAT THIS IS FOR, AND WHAT ADR-064 LEFT UNDONE

**The owner's decomposition names FOUR inputs to a travel time: where the defender starts, distance
to the launch point, how deep the QB drops, and the attributes governing closing speed.**

⛔ **ADR-064 delivered ONE, categorically** — a depth class *(`LINE`/`BOX`/`DEEP`)* resolved from
`Position`. ✅ **It was the right first step and it needed no petition.** ⚠ **It is also not a
geometric model, and the honest framing at the time was that the next dispatch should be this
petition rather than another neighbour.**

> ## ⛔ **A TABLE KEYED ON `alignment × depth` COLLAPSES A DISTANCE INTO A CATEGORY. THE CATEGORY IS NOT THE DISTANCE.**

## ⛔ THREE PETITIONS, SEPARATELY PRICEABLE — and they must be priced separately

**Per the `Conjoined mechanisms` field: these are joined by "and" in the ruling, and they ARE
separately priceable, so each must be measured ALONE before any joint arm.**

⚠ **The template's own worked example is the reason: *"add retirement by GEOMETRY and by TIME"* was
priced at one number, `0.108pp`, and refused — then re-measured at geometry `+0.298pp` versus time
`+6.568pp`. Twenty-two to one, invisible in the average.** ⛔ **These three differ far more in cost
than those two did.**

---

## ✅ PETITION 1 — `gap` crosses the boundary *(precedented, no new authoring)*

**`RushDuty` already carries it** *(`packages/playbook/src/defense.ts:99`)*:

```ts
/** His gap in the run fit. Every front defender owns one. */
readonly gap: RunGap;
```

⛔ **It is authored on EVERY rush duty in the shipped corpus** and **stops at the playbook boundary.**
`@ff/engine` depends on `@ff/contracts` only, so a playbook field reaches the engine solely by being
carried into a contracts type — and `RushAssignment` *(`playcalls.ts:251-263`)* carries `rusher`,
`move`, optional `alignment`, and `side`. ⛔ **Not `gap`.**

> ## ⛔ **THE PRECEDENT IS EXACT, AND ITS OWN JUSTIFICATION NAMES THE MISSING FIELD.** **ADR-018 §Petition 2 carried `side` across this same boundary, and `RushAssignment.side`'s comment reads: *"Without it a card cannot say **'left A-gap blitz'** … pairing has no geometry and has to be invented."***

⚠ **`side` was petitioned so a card could say *left A-gap blitz*. The `A-gap` half never crossed.**

**PROPOSAL:** add `readonly gap?: RunGap` to `RushAssignment`, optional for the same reason
`alignment` is — omitted, it falls back to today's behaviour.

**COST:** ⛔ **Zero new authoring. The data exists on every card.** This is a carry-across, not new
information, and it is the one petition here whose subject already exists.

---

## ⛔ PETITION 2 — drop depth *(genuinely new state)*

⛔ **Nothing in the tree represents how deep the quarterback drops.** No field on `PlayCalls`, no
constant, no derivation. `formation` is `readonly formation: string` and the engine is **forbidden to
parse football from it** *(`playcalls.ts:22`)*.

⚠ **This is NOT a carry-across. It requires the playbook to SAY SOMETHING IT DOES NOT CURRENTLY
SAY** — every offensive card must gain a value an author has to choose.

**PROPOSAL:** a numeric drop depth on the offensive play call. **Units, default, and whether it is
per-card or per-formation are all open and are the owner's.**

⛔ **COST: authoring across the whole offensive corpus, plus a value nobody has derived.** ⚠ **Note
what this register already records about such values: `arrival.minTravelSeconds` has NO dedicated
provenance rule, and `blitzPickup.freeRunnerArrivalSeconds` is `DOC_UNIT_RESOLVED` with its VALUE
recorded unratified. A third underived constant should be recognised as such at authoring time, not
discovered later.**

---

## ⚠ PETITION 3 — attribute terms as DECLARED INPUTS *(not a contracts change)*

⛔ **`ATTR.speed` and `ATTR.acceleration` already exist in the registry.** Wiring them into travel
time is an **engine change against existing IDs — no petition required.** ✅ **What belongs here is
the DESIGN COMMITMENT: that a travel model declares closing speed as an input.**

⛔ **AND IT IS UNMEASURABLE ON THE CANONICAL CORPUS** *(backlog entry 49)*. `flat-60-32t` sets every
attribute equal, so it can verify a geometric model and **structurally cannot** verify an attribute
spread.

> ## ⛔ **BUILD IT, DECLARE IT, AND DO NOT TUNE IT.** ✅ **Verify what flat CAN verify — the geometry. Leave the spread to Phase 2, on a corpus that has one.**

⚠ **`tunables.ts:604-606` already records an abstention on exactly this** — *"a speed term would be a
second petition, on a league that has no speed variance to measure it with. ADR-031 records it as
unclaimed."* ⛔ **That comment sits in the `freeRunnerPath` block, so per entry 155 it ratifies THAT
path; transferring it here is the citation-transfer entry 134 governs and is NOT established.**

---

## Provenance of factual claims — REQUIRED

| # | claim | provenance |
|---|---|---|
| 1 | `RushDuty.gap` exists and is authored on every rush duty | ✅ **READ** — `defense.ts:99`, `defensiveCards.ts` |
| 2 | `RushAssignment` carries `side` but not `gap` | ✅ **READ** — `playcalls.ts:251-263` |
| 3 | ADR-018 §Petition 2 carried `side` across, citing "left A-gap blitz" | ✅ **READ** — the comment above `RushDuty`, and `RushAssignment.side`'s own doc |
| 4 | `@ff/engine` depends on `@ff/contracts` only | ✅ **READ** — `package.json` |
| 5 | No drop depth exists anywhere | ✅ **COMPUTED** — corpus grep, entry 155 |
| 6 | `formation` is `string` and unparseable by rule | ✅ **READ** — `playcalls.ts:22` |
| 7 | `speed`/`acceleration` exist and reach neither travel function | ✅ **READ** — entry 155's null |
| 8 | What the drop-depth VALUE should be | ⛔ **NO PROVENANCE. Nobody has derived one** |
| 9 | Whether gap→distance is the right geometry | ⛔ **NO PROVENANCE — a football question, unruled** |

## Conjoined mechanisms — REQUIRED

⛔ **SEPARATELY PRICEABLE, and the three arms are NOT optional.** Petition 1 is a carry-across of
existing data; Petition 2 requires new authoring across the whole offensive corpus; Petition 3 is
unmeasurable on the only corpus that exists. ⚠ **Pricing them jointly would produce one number
attributable to none of them.**

## Subject condition — REQUIRED

⛔ **Petition 2 ratifies a field with NO CONSUMER until the geometric model is built.** ✅ **A subject
appears when `travelSecondsFor` computes a distance rather than looking one up.** ⚠ **Until then, a
ratified drop-depth field is a shape with no reader — the exact standing `ByTier<T>` held, and the
reason that field exists.**

## Inertness proof — NOT APPLICABLE

⚠ **This ADR changes no behaviour: it is a petition.** ⛔ **The field is marked inapplicable rather
than omitted, because an ADR that claims nothing about rates should say so explicitly** — **the four
inert changes before ADR-064 all filled it, and a silent omission would read as an oversight.**

## Implied scope — REQUIRED

- ⛔ **`gap` may make `alignment` redundant.** `alignment` is `EDGE|INTERIOR`; a gap is `A|B|C|D` with
  a side. **If gap crosses, two fields describe overlapping geometry.** **`unruled` — and it is the
  question that decides whether Petition 1 is additive or a replacement.**
- ⚠ **A distance model may make `travelSecondsByAlignmentAndMove` dead.** ⛔ **It is the table
  ADR-061 ratified as the lever and ADR-064 just extended.** **`unruled`.**
- ⚠ **`RunGap` is named for the run fit.** **Whether a run-fit gap is the right lateral coordinate for
  a pass rush is a football question and NOT established by the field existing.** **`unruled`.**
- ⚠ **The `INTERIOR` base sits at `minTravelSeconds`, so a distance model that produces anything
  shorter will clamp** — **the same clamp that makes `INTERIOR.LINE` inert today** *(ADR-064)*.
  **`unruled`.**

## Decision

### ✅ PETITION 1 — **APPROVED AND LANDED** *(owner, August 2026)*

**Owner's ruling:** *"The precedent settles it, and it settles it more sharply than a precedent
usually does … ADR-018 carried `side` across this exact boundary for a justification that names the
gap it didn't carry. That's not an analogous case — it's the same case, half-finished."*

⛔ **AND `gap` IS ADDITIVE, NOT A REPLACEMENT** *(ruled before implementation, deliberately)*:
`EDGE|INTERIOR` is a coarse classification the engine reads in several places; `A|B|C|D` plus a side
is finer. ⚠ **Replacing `alignment` inside this petition would be a change with consumers dressed as
a field addition.** ✅ **Whether `alignment` becomes redundant is ruled when there is a distance model
to make it redundant — not on the strength of a projection.** **Same reasoning as the `Implied scope`
note about the travel table possibly going dead: both are consequences of a model that does not
exist, and ruling on them now would be ruling on a prediction.**

**Landed in two edits, `pnpm verify` green with ZERO test changes:**
- `contracts/src/playcalls.ts` — `readonly gap?: RunGap` on `RushAssignment`, optional, defaulting to today's behaviour.
- `playbook/src/instantiate.ts` — `declaredRush` carries `gap: duty.gap`. ⛔ **That line is where it was previously lost.**

⚠ **`DeclaredRush extends RushAssignment`, so nothing else needed touching.**

> ## ⛔ **NOTHING READS `gap` YET — recorded here, in the field's own doc, and in `declaredRush`'s comment.** ✅ **This is `quickTwitchMove`'s anatomy with the subject condition stated in advance instead of discovered by an audit.** ⚠ **If the geometry is never built, this becomes dead configuration with a good excuse, and the honest time to say so is now.**

**Precedent for landing it unread:** ⚠ **`declaredRush`'s pre-existing comment already made this
argument for `side`** — *"§7.2's model reads `alignment` today and nothing reads `side`, but the call
is what the stream records."*

### ⛔ PETITIONS 2 AND 3 — **NOT RATIFIED, and explicitly not smuggled behind P1**

**P2** *(drop depth)*: ⛔ **genuinely new state, every offensive card gains a value an author must
choose, and it becomes a THIRD underived constant** alongside `minTravelSeconds` and
`freeRunnerArrivalSeconds`. ⚠ **Owner: *"three underived constants in one subsystem is how this
project got here"* — a reason for caution, not a formality.**

**P3** *(attributes as declared inputs)*: ⛔ **ratified when there is a geometry for them to be an
input to, not before.**
