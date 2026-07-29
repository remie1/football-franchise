# ADR-036: An absence must look like an absence — and an intersection must say when it narrows

- **Date:** 2026-07-29
- **Proposed by:** `match-engine`
- **Status:**
  - **Item 1 — PETITION.** Awaiting the project owner. `packages/contracts` is
    unchanged and will not be touched until ratified (Iron Rule 2).
  - **Item 2 — IMPLEMENTED** in `packages/engine`, under the owner-approved
    follow-up recorded in ADR-034's amended consequence section.

Two rulings, one dispatch. They share a subject: **a fact that is true of the
system but is recorded nowhere the compiler or a consumer can see it.** In item 1
that fact is *"there is no recovery target here"*, spelled as the number `0`. In
item 2 it is *"these two declarations must contain each other"*, spelled as
nothing at all.

---

# PART A — ITEM 1: the `DEAD` recovery target (PETITION)

## The ruling being implemented

ADR-035 §6.1 priced `tippedBall.qualityBands.DEAD.finalTargetNumber = 0` and
proved zero outcome reach twice. The owner ruled:

> *"A recovery target of 0 printed on 163 plays is a value a future consumer can
> read, believe, and aggregate, and by then it's indistinguishable from a real
> target. Make it structurally unreadable rather than cosmetically zero: emit no
> target on `DEAD`, or emit a value that cannot be mistaken for a threshold. Same
> reasoning as refused-versus-an-em-dash — **an absence must look like an
> absence.**"*

**The mechanic is not touched.** Nothing behind the number is wrong; `recoverable:
false` empties the candidate list and no recovery is ever attempted. This is a
reporting change and only a reporting change.

## Why this is a petition and not an engine commit

The dispatch instructed me to prefer the option that makes the wrong reading
**impossible** over the one that makes it **unlikely**, and to stop and petition
if that requires reshaping a contracts type. It does. Every in-engine option was
considered and each fails on the same wall:

```ts
// packages/contracts/src/events.ts:216
| ({ type: "TIPPED_BALL"; payload: {
      deflector: PlayerId;
      rollRef: string;
      finalTargetNumber: number;   // <- REQUIRED. There is no legal absence.
      eligible: PlayerId[];
      attempts: { player: PlayerId; rollRef: string }[];
      recoveredBy?: PlayerId;
    } } & MatchEventBase)
```

| in-engine option | why it fails |
|---|---|
| Fix `renderPlay.ts` only — stop printing the target on `DEAD` | Cosmetic, and the owner ruled against exactly this. The debug text is a *renderer*; the stream is the source of truth (Charter §1.3 pillar 3). The `0` would still be in the payload every consumer reads, and the payload is what a future aggregator will use. |
| Emit a sentinel — `-1`, `99`, `NaN` | `number` is the type; **every number is on the target scale.** `-1` and `99` sort. `NaN` is worse: it does not sort, it *silently poisons* a mean and returns `false` from every comparison. This is §4.1's sorting-default corollary verbatim — a sentinel that a consumer can aggregate is not a sentinel. |
| Omit `finalTargetNumber` from the `DEAD` row of `tunables.qualityBands` | Correct, and I recommend it (below) — but it does not stand alone. `log.tippedBall` still has to hand contracts a `number`, so the engine would be forced to invent one at the boundary, which is the sentinel row above with an extra step. |

There is no engine-side change that produces an absent field, because the field
cannot be absent. **The petition is the right answer.**

## Proposal — the minimal contracts change

Follow ADR-016's precedent (`playId?: never`): make "not applicable" *structural*
rather than a value.

```ts
| ({ type: "TIPPED_BALL"; payload: {
      deflector: PlayerId;
      rollRef: string;
      eligible: PlayerId[];
      attempts: { player: PlayerId; rollRef: string }[];
      recoveredBy?: PlayerId;
    } & (
      /** A live ball: `finalTargetNumber` is the threshold every attempt below was measured against. */
      | { recoverable: true; finalTargetNumber: number }
      /** A ball nobody can recover (§12.3). There is no threshold, so there is no field. */
      | { recoverable: false; finalTargetNumber?: never }
    ) } & MatchEventBase)
```

Two changes: one added discriminant, one field moved into a conditional arm.

### Why an arm with `?: never`, and not simply `finalTargetNumber?: number`

An optional field gives a consumer `number | undefined` and stops there — they
can still write `?? 0` and land back on the exact value the ruling is about. The
discriminated arm is stronger in **both** directions:

- **Producer.** With `exactOptionalPropertyTypes` (already on repo-wide),
  `recoverable: false` makes the key's *presence* a type error. The engine cannot
  emit a dead-ball target even by accident. That is the property the ruling asks
  for — not "we remembered not to", but "it does not typecheck".
- **Consumer.** Reading `payload.finalTargetNumber` without narrowing on
  `recoverable` is a compile error naming the arm that lacks it. A consumer
  building a recovery-difficulty distribution is forced to decide what a dead ball
  means to their metric, at the moment they write the line.

### Why `recoverable` is a genuine addition and not a field invented for the discriminant

The obvious objection is that `eligible: []` already implies it. **Measured, it
does not** — 24-game corpus, seeds `bg-0..bg-23`:

| deflection band | events | with `eligible: []` | target published |
|---|---|---|---|
| `DEAD` | 163 | **163** | `0` — meaningless |
| `DIFFICULT` | 39 | **2** | `90` — real |
| `CONTESTED` | 49 | 0 | `75` — real |
| `LIVE_BALL` | 16 | 0 | `55` — real |
| `FLOATER` | 2 | 0 | `35` — real |

`DIFFICULT` carries `maxZoneDistance: 0`, so a live ball with nobody in the
throwing zone also arrives with an empty list — carrying a **real** target of 90
that simply went untested. A consumer inferring "not applicable" from the empty
list would silently discard those. **Two different facts, one observable**, which
is ADR-010's rule (widen or add, never overload) arriving from the reading side.
`recoverable` states the fact that is currently only inferable, incorrectly.

## Evidence — total, not sampled

ADR-035 proved zero *outcome* movement. That is not quite the claim this petition
needs, because "outcomes did not move" leaves open how much of the **stream**
moved. So the measurement was redone as a total comparison over the whole
reachable surface, per §4.1's corollary on verifying a total function.

Two complete 24-game corpora (`test/gameFixtures.ts`, seeds `bg-0..bg-23`),
hashed event-for-event plus both final `MatchState`s, under `DEFAULT_TUNABLES`
and under a `0 → 100` patch of the cell:

| measure | base | patched `0 → 100` |
|---|---|---|
| plays | 3,420 | **3,420** |
| yards | 20,047 | **20,047** |
| turnovers | 107 | **107** |
| points | 1,545 | **1,545** |
| `DEAD` deflections | 163 | 163 |
| eligible recoverers on them | **0** | 0 |
| `deflection_recovery` CHECKs on them | **0** | 0 |
| distinct targets published on `DEAD` | `[0]` | `[100]` |
| whole-stream digest | `c93f989f…` | `b1522c40…` — **DIFFERENT** |
| stream digest with `DEAD.finalTargetNumber` removed | `a554724c…` | `a554724c…` — **IDENTICAL** |

The last two rows are the petition's safety argument as a measurement, and they
say opposite and equally necessary things:

- The full digests **differ**, so the value is genuinely *published* — this is not
  a dead cell being tidied. It reaches a consumer.
- The stripped digests are **identical**, so that one field is the *entire*
  surface of the cell. Across 48 games of events and both resulting states,
  nothing else moves by one byte.

**Removing the field from the `DEAD` payload removes the misreadable number and
provably nothing else.**

This lives in `packages/engine/test/tippedBall.test.ts` as four tests that run on
every suite invocation, not as a number transcribed into this document.

## Impact — what changes on ratification, exactly

Nothing outside `packages/contracts` and `packages/engine`. `finalTargetNumber`
appears in no other package: `packages/calibration` never reads it, nothing on
disk stores a `TIPPED_BALL`, and there is no runtime validator for the payload
(the same four checks ADR-034 §"Evidence gathered before petitioning" made, re-run
for this field).

**`packages/contracts`** — the shape above.

**`packages/engine`**, four edits, all mine and all mechanical:

1. `src/events.ts:317` — `PlayEventLog.tippedBall` takes the recovery state as one
   argument instead of a bare number, so a caller cannot pass a dead ball a target:
   ```ts
   recovery: { readonly recoverable: true; readonly finalTargetNumber: number }
            | { readonly recoverable: false },
   ```
2. `src/sim/passPlay.ts:1339` — passes `quality.recoverable ? { recoverable: true, finalTargetNumber: quality.finalTargetNumber } : { recoverable: false }`. `resolveDeflectionQuality` already computes both fields; nothing new is derived.
3. `src/debug/renderPlay.ts:705` and `:707` — on `recoverable: false` print
   `→ dead ball, no recovery (§12.3)` and **emit no target at all**, so the §17
   printout carries the absence the same way the payload does.
4. `test/tippedBall.test.ts` — the `PENDING ADR-036` test inverts from
   "publishes a readable target on all 163" to "publishes no target on any of the
   163". The other three tests are unchanged and keep passing; they assert
   properties true in both worlds.

### Recommended in the same change, separable if the owner prefers

Omit `finalTargetNumber` from the `DEAD` row of `tunables.tippedBall.qualityBands`
entirely. The contracts change alone fixes the **stream**; this fixes the
**source**, and it is what makes the absence structural rather than assembled at
the boundary:

- `DeflectionQualityBand` becomes a union in which one member lacks the key, so
  `band.finalTargetNumber` **stops compiling** — the resolver is forced to branch
  on `recoverable` rather than copying a value it should not have.
- `tippedBall.qualityBands/finalTargetNumber` leaves ADR-035's recorded inversion
  set: the surviving column is `20, 35, 55, 75, 90` against descending
  `minMargin`, which is monotone. `RECORDED_VIOLATIONS` drops from **11 to 10**
  and the clean-column count rises from 41 to 42, both in
  `test/bandGuards.test.ts`. **The inversion is not suppressed by an exemption —
  it ceases to exist, because the cell that caused it is gone.**
- Cost, stated rather than discovered later: the cell is no longer addressable by
  `applyTunablePatch`, so the `0 → 100` patch above has nothing to patch. That
  test is replaced by the structural assertion that the `DEAD` row has no such
  key — a strictly stronger claim, since it cannot be satisfied by a value.

## What this petition does not claim

It does not bear on ADR-035 §6.2 (`ballCarrier.contests.{yac,secondLevel}`
`minYards`/`maxYards`) or §6.3 (`speedCheckFromDistance`). Those are live cells
with measured prices and are football rulings, still the owner's. It moves no
metric: the table above is the proof, on every digit.

---

# PART B — ITEM 2: the `PocketStatusRung` intersection, asserted (IMPLEMENTED)

## Need

ADR-034 narrowed `PocketStatus` to four members and its amended consequence
section left one defect open:

```ts
// packages/engine/src/resolve/pocket.ts
export type PocketStatusRung = keyof Tunables["pocket"]["severity"] & PocketStatus;
```

**The alias stays** — it is the *derived* type and contracts' union is the
*restated* one, so deleting it would be §4.1's derivation corollary run backwards
(ADR-034's own worked example of a ratified plan refuted before execution).

But an intersection is the quietest way two declarations can disagree. A member
on one side and not the other does not error, does not warn and does not appear —
**it silently stops existing.** Today the ladder and the union agree, and until
now nothing said they had to, in either direction.

## What was implemented

`packages/engine/src/resolve/pocket.ts`, compile-time only, erased at runtime:

```ts
export type AssertEmptyUnion<T extends never> = T;

export type _EveryRungIsAPocketStatus =
  AssertEmptyUnion<Exclude<keyof Tunables["pocket"]["severity"], PocketStatus>>;

export type _EveryPocketStatusIsARung =
  AssertEmptyUnion<Exclude<PocketStatus, keyof Tunables["pocket"]["severity"]>>;
```

`Exclude<A, B>` is empty exactly when every member of `A` is a member of `B`, so
the pair is mutual assignability — stated one direction at a time deliberately,
because the compiler then **names the drifted member**
(`Type '"PANICKED"' does not satisfy the constraint 'never'`) instead of
reporting an unhelpful union mismatch. Each direction carries a comment naming
the mistake a future author would actually be making:

**Direction 1 — a rung the shared union does not declare.** An author adds
`PANICKED: 4` to `tunables.pocket.severity` to model a new state, fills in
`accuracyModifier`, `readCapacityDelta` and `minimumStatusByBand` for it, and
never files the petition that would put it in `PocketStatus`. Without the
assertion the new rung is *intersected away*: `pocketStatusFor` cannot return it,
`worsePocketStatus` cannot rank it, the ladder the author believes they extended
is unchanged — **and the whole edit compiles clean.**

**Direction 2 — a union member the ladder does not rank.** Contracts widens
`PocketStatus` (a petition ratified for some other consumer, or `SACK` returning)
and nobody adds the row to `pocket.severity`. The engine never produces the new
status, but it is now a **legal value on the stream**, so a status the compiler
swears is fine reaches `pocketSeverityOfEmitted` and throws at runtime, in a
batch, hours in. That is the direction ADR-033 lived in for a month.

## Proved to fire, not merely to hold

A guard nobody has seen fail is indistinguishable from a guard that cannot — the
buried monotonicity gate, §4.1. Both directions were made to fail:

1. **Against the real subject.** `PANICKED: 4` added to
   `tunables.pocket.severity` → `tsc -p tsconfig.json` fails with
   `src/resolve/pocket.ts(99,3): error TS2344: Type '"PANICKED"' does not satisfy
   the constraint 'never'.` Reverted; clean.
2. **Permanently, in the suite.** `test/pocketStatus.test.ts` instantiates both
   directions against a deliberately divergent pair under `@ts-expect-error`,
   which **fails the build if either starts compiling**. Verified load-bearing by
   removing the divergence: `TS2578: Unused '@ts-expect-error' directive.`

Direction 2 is proved only by (2), since proving it against the real subject would
mean editing `packages/contracts`, which is not mine to edit.

## The runtime guards are kept, and the comment now says why

`pocketSeverityOfEmitted`'s `RangeError` is retained, and its doc comment was
rewritten to answer §4.1's counter-corollary head-on rather than leave a future
reader to conclude it is newly redundant: the function sits on the far side of a
**package boundary** from the stream's producer, and a type binds no caller
arriving from JavaScript, from a JSON save, or from a consumer built against an
older `@ff/contracts`. Calibration's `severityOf` is the mirror and is likewise
untouched.

The test that exercised it with `"SACK"` no longer typechecks, and the fix is the
test's point rather than a workaround — it now casts through `as PocketStatus`
with a comment saying the cast **is** the untyped caller this guard exists for.

## The enabling change, and the four things it found

The `@ts-expect-error` proof is worthless if nothing typechecks the test files —
and nothing did. `packages/engine/tsconfig.test.json` **already existed**,
committed in `cb21523`, correct, and wired to nothing: the `test` script was
`vitest run`, and vitest does not typecheck. So the engine had a type-checking
config that had never run, which is its own small instance of a green that means
nothing.

`packages/engine/package.json` now matches `@ff/playbook`'s precedent:

```json
"typecheck": "tsc -p tsconfig.test.json",
"test": "tsc -p tsconfig.test.json && vitest run"
```

First run: **8 errors, in 3 files, all of them ADR-033/034/035 fallout.** Fixed in
this dispatch because they are the drift item 2 exists to stop, not because they
were nearby:

1. `test/bandGuards.test.ts` ×3 — `BandValue` used as a type and never imported.
   Mine, from ADR-035. Invisible at runtime because esbuild erases type positions
   without resolving them; a genuine unresolved reference that ran green.
2. `test/passPlay.test.ts:143` — `event.payload.status === "SACK"` asserted
   `false`. After ADR-034 that comparison is **provably false by type**, and an
   assertion the compiler can discharge is worth nothing at runtime (§4.1: green
   gets trusted). Replaced with the general property it was a case of — every
   emitted status is a key of `pocket.severity`, derived from the ladder, so a
   rung added or removed moves it.
3. `test/pocketStatus.test.ts` ×3 — `PocketStatus` used and never imported.
4. `test/pocketStatus.test.ts:213` — the `"SACK"` guard test, above.

## Impact

None outside `packages/engine`. No contract petition, no runtime behaviour, no
event, no tunable, no metric. `pnpm --filter @ff/engine test` now runs `tsc` over
`src` **and** `test` before vitest: 44 files, **737 tests**, green; `tsc` clean on
both projects.

---

## Reported, not fixed

Per the dispatch's standing instruction, and ADR-035's three refuted candidates as
the standing evidence that a finding is worth more reported than assumed:

1. **The root `typecheck` script does not typecheck tests anywhere.**
   `pnpm -r exec tsc --noEmit` resolves each package's nearest `tsconfig.json`,
   which in every package includes `src` only. `@ff/playbook` and now `@ff/engine`
   typecheck their tests via their `test` script; the other packages' test
   directories are unchecked. I did not touch `packages/calibration`,
   `packages/contracts` or `packages/playbook`. Whether `@ff/calibration` has the
   same class of stale test-only type error the engine had is one command away and
   is not mine to run.

2. **`test/statline.test.ts:248` constructs a `TIPPED_BALL` with a literal
   `finalTargetNumber: 55`.** It will need the new shape when item 1 lands; noted
   here so the migration list in "Impact" is complete rather than discovered by a
   red test.

---

## Decision

**Item 1 — awaiting the project owner.** `packages/contracts` is untouched. If
ratified, the change is the payload shape above plus the four mechanical engine
edits, and the commit must reference `ADR-036` for the `commit-msg` hook.

**Item 2 — implemented** under ADR-034's amended consequence section, which
assigned the follow-up to `match-engine` and to an engine dispatch.
