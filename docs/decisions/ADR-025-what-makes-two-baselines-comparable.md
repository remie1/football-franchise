# ADR-025: what makes two baseline reports comparable

- **Date:** July 2026
- **Proposed by:** `calibration`, at the Orchestrator's direction, from a stale-artefact finding
- **Status:** **approved** July 2026 — both the identity table and the "recorded but not identity"
  list. See the Decision at the foot.

## Need

`reports/baseline-0002.carry-forward.json` was found **already stale**: re-running it reproduced
neither its scoring nor its sack rate, because corpus and sack-credit dispatches moved the engine
after it was written. The carry-forward *mechanism* was never at fault — that file simply predated
the changes, and nothing in the format could say so.

The owner's ruling, whose phrasing is the specification:

> A carry-forward file should **record the engine commit it was produced against**, and the
> harness should **refuse to trend across a commit boundary** rather than silently comparing
> against a tree that no longer exists. Same class as the tunables-patch guarantee — **the
> mechanism works, and it should be structurally impossible to use it wrong.**

## Decision to be ratified

### The criterion

**A field belongs to the identity when a change to it means the predecessor's number is no longer
an estimate of the same quantity under the same system.** Not "anything that differs" — that
refuses everything, and a guard that always fires gets deleted.

### Identity — eleven fields

`engineCommit` · `tunablesVersion` · `tunablesDigest` · `callerVersion` ·
`callerFourthDownVersion` · `leagueId` · `leagueProvenance` · `scheduleKind` · `season` ·
`availabilityMatched` · `eligibility` + `realSeasons`

Two are worth defending explicitly:

- **`tunablesDigest` is machine-observed, not asserted.** A version *label* cannot detect a change
  to the thing it labels — two reports both saying `DEFAULT_TUNABLES` while `DEFAULT_TUNABLES`
  moved underneath them is invisible. There is a test where the labels match and only the digest
  catches it; its `why` string reads *"the label is lying."*
- **`eligibility` was previously invisible to the trend layer, and this is a genuine catch.** The
  sim column would trend fine across it, but `comfortableStreak` is a verdict against the *real*
  side and is one report away from a permanent `ratchetBand`. **A streak earned against 2025 may
  never move a gate** (§7's held-out protocol).

### Recorded but deliberately NOT identity

`seedDigest` · `batchSeed` · `games` · `workers` · `executorName`

Two seed lists over the same tree and league are two samples of **one** population — the estimand
is identical and only the noise differs, which the printed CIs already let a reader judge.
Refusing here would forbid the one unambiguously legitimate trend: **the same batch re-run
larger**, which `CALIBRATION-BACKLOG.md` §22c positively encourages.

### Refusal is total, and it names the honest alternatives

Three grades, with `previous.ts`'s existing rule now structural rather than conventional:

| grade | arrow | streak / ratchet |
|---|---|---|
| `ACCEPTED` | yes | yes |
| `RECONSTRUCTED` | yes | **no** |
| `REFUSED` | **no** | **no** |

`buildBaselineReport` no longer accepts a raw predecessor — it takes an adjudicated
`TrendDecision`, and `decideTrend` is the single funnel. (`withTrend` previously took a second
argument, so it could be handed a *different* predecessor from the one that seeded the streaks:
arrows and ratchet counters disagreeing about their ancestor, with nothing saying so.)

**A refused cell renders `**refused**`, never an em dash.** An em dash means *there was no
predecessor*, which is a different fact — rendering a refusal as an absence would let a reader
conclude the trend column simply had not started yet. That is the silent-drop failure this rule
exists to prevent, wearing the costume of a blank cell.

The message names both honest instruments: **re-baseline** (re-run the predecessor's config on the
current tree — one batch run buys a real control arm), or the **counterfactual harness**, which
runs both arms in one process on one tree. The framing that makes this land: *a trend arrow across
a commit boundary is that same comparison with the control arm quietly missing, dressed as a table
cell.*

### Provenance without a subprocess

`engineCommit` is a **required** field on the report input. No env read, no subprocess, no default
anywhere in `src/` — an optional commit defaults to `"unknown"` at every call site that forgot,
and a carry-forward stamped `unknown` *is* the stale file that started this. Shape-checked to a
hex hash (`HEAD`, `main`, `latest` all name something that moves). **`-dirty` never compares equal,
including to itself**, because nothing records which edits were in the tree. A source scan asserts
no `child_process` and no `FF_ENGINE_COMMIT` read inside `src/`.

## Known limits, stated rather than papered over

- **The commit is still a human assertion.** Nothing in a pure library can verify the hash pasted
  is the hash of the running tree. The next step, if the `-dirty` convention proves insufficient,
  is a build-time generated constant — subprocess-free, and it removes the human.
- **Identity does not independently cover the metric library.** There is no honest digest of
  `computeFromEvents`. Mitigated structurally: this is a single-commit monorepo, so `engineCommit`
  moves when a metric does. **If the packages are ever split, a second commit field becomes
  necessary.**
- **`decideTrend` compares against the current run, not a declared expectation**, so a predecessor
  and successor wrong in the same way still ACCEPT.

## The stale file

Quarantined rather than deleted: `reports/baseline-0002.superseded.json` keeps the numbers verbatim
with a header recording why it was retired and that the mechanism was never at fault. The numbers
remain legitimate evidence of what baseline-0002 measured, and the backlog cites figures like them.
Renamed rather than left in place because `FF_BASELINE_PREV=…baseline-0002.carry-forward.json` is
the obvious next command for whoever finds it — **a loaded gun that only misfires because a guard
caught it is still a loaded gun in the drawer.**

---

## Decision

**Approved in full** by project owner + Orchestrator, July 2026 — both the identity table and the
"recorded but not identity" list.

**The criterion is what makes this hold**, and it is ratified as the operative rule rather than the
table it produced: *a field belongs to the identity when a change to it means the predecessor's
number is no longer an estimate of the same quantity under the same system.* It is **checkable**,
it is why `seedDigest` and `games` are correctly excluded, and it is what a future agent tempted to
relax the table has to argue against. Filing this proposed rather than taking it was itself the
right call — **this is exactly the kind of rule that gets loosened by someone who sees the friction
and not the failure it prevents.**

### The two catches, and why each generalises

**`tunablesDigest` is the sharper one.** Its general form is now a Charter §4.1 precedent: *a
declared version cannot detect a change to the thing it labels.* It applies well beyond this file —
**anywhere we are tempted to trust a declared version over an observed hash.** The test whose `why`
string reads *"the label is lying"* stays exactly as written.

**`eligibility` is the subtle one, and worth restating because the mechanism is indirect.** The sim
column trends fine across an eligibility change. But a `comfortableStreak` is a verdict against the
**real** side, and under §10.1's loose-and-ratchet a streak is *one report away from a permanent
tightening*. So a streak earned partly against 2025 could ratchet a gate — **the sacred-season rule
leaking through the trend layer rather than through data access.** The `Evidence<T, E>` brand guards
the door; this guards the window.

### Refusing to guard is as important as the guards

Excluding `seedDigest`, `games` and `workers` is ratified as **part of the decision, not an
omission from it.** Two seed lists over one tree are two samples of one population; forbidding that
would block the single unambiguously legitimate trend — the same batch re-run larger, which
`CALIBRATION-BACKLOG.md` §22c positively encourages.

**A guard that always fires gets deleted.** Over-guarding is how a guard loses its authority, and a
deleted guard protects nothing. Recorded as a Charter §4.1 design note, because the instinct this
project has repeatedly rewarded — make it structural — has an obvious failure mode in the other
direction.
