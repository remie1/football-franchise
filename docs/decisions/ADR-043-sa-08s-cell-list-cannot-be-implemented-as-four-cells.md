# ADR-043: SA-08's cell list cannot be implemented as four cells

- **Date:** 2026-07-29
- **Proposed by:** `match-engine` (found while enumerating §8.4's consumers, backlog 53)
- **Status:** DECISION REQUESTED — owner. **Nothing implemented.** SA-08's mapping remains OWED and
  this ADR does not implement any part of it.

## Why this exists

The consumer enumeration was asked for *before* SA-08's mapping lands, on the grounds that *"a scale
change with an unenumerated consumer list is the doc→table blindness pointed the other way."* It
turned one thing up that is not a consumer at all, and that has to be settled **before** the mapping
can be written: **the ruled cell list is not arithmetically satisfiable.**

## The finding

SA-08 is recorded (owner ruling; `docConformance.ts` `SA-08`, and §9.3's amendment in
`match-engine.md`) as moving **four** cells — `manCoverage.bands.1..4.openness` — with row 0 already
inside `wide open` and the three CB-wins rows unmentioned. Reading the ruled targets against the
committed table:

| # | row | now | SA-08's ruled band | ruled? |
|---|---|---|---|---|
| 0 | `SEPARATION_5_PLUS` | 85 | wide open 70+ | already inside |
| 1 | `SEPARATION_3_4` | 70 | open **50-69** | yes |
| 2 | `SEPARATION_1_2` | 55 | tight window **30-49** | yes |
| 3 | `SEPARATION_HALF_YARD` | **40** | covered **15-29** | yes |
| 4 | `EVEN_BRACKET` | 32 | covered, **low end** | yes |
| 5 | `CB_IN_PHASE` | **25** | — | **not ruled** |
| 6 | `CB_ON_HIP` | 15 | — | not ruled |
| 7 | `CB_IN_POSITION` | 6 | — | not ruled |

Rows 3 and 4 are both ruled into `15-29`, and **row 5 already sits at 25, inside that interval.** The
column is ordered and its descent is a claim about behaviour, so:

- honouring *"tie → covered, **low end**"* puts row 4 somewhere around 15-20, i.e. **below row 5** —
  the openness column then falls, rises, and falls again;
- avoiding that inversion forces row 4 into **25-28** and row 3 into **26-29**, which is the **high**
  end of `covered` and is not what was ruled.

**The two cannot both be satisfied while rows 5-7 stay where they are.**

It is loud, not silent — `manCoverage.bands.openness` currently has no inversion, and calibration's
band-table monotonicity gate fires on a column that both rises and falls, so the eleventh inversion
would redden the free tier. **But it reddens at implementation time, in a gate whose message names a
band table and not this ruling**, and the implementer's cheapest way out is to nudge row 4 up to 25
and quietly drop *"low end"*.

**As football the answer is not in doubt**, which is why this is a small decision and not a large
one: a receiver **dead even** with his man cannot be *less* open than one whose corner has **won the
rep and is in phase**. Row 5 is above row 4 today only because rows 3-4 were the optimistic ones
SA-08 is correcting. The CB-wins rows are carried down by the same correction.

## Decision requested

1. **Do rows 5-7 move with SA-08, and to what?** The available room below a `covered (15-29)` tie row
   is §8.4's `no window (0-14)`, which as football is what *"CB in position for PBU/INT"* is. Rows
   6 and 7 (15 and 6) are already at or below that ceiling; **row 5 at 25 is the only one that must
   move** for the column to stay ordered.
2. **Is SA-08's cell list amended to name them**, so the finding's `cells` list matches what the
   implementation touches? Today an implementer following the recorded list writes four cells and
   ships an inverted column.

## Scope note

This ADR settles **no** value. It does not price SA-08, does not touch `catching.contestedMaxOpenness`
(pinned by ADR-040 §3.1, which now reddens *on purpose* when row 3 moves), and does not re-point
§9.4's zone table — which is **not** re-scaled by SA-08 and whose own one-band question is reported
with the enumeration, unruled.
