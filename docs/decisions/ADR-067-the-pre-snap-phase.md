# ADR-067 (DESIGN): The pre-snap phase — relocating one disguise and building the other

- **Date:** August 2026
- **Proposed by:** Orchestrator, on the pre-snap mechanism read (backlog entries 165, 166)
- **Status:** **proposed** — DESIGN ONLY. Nothing implemented. Brought for ruling.

---

## ⛔⛔ THE FINDING THAT REFRAMES THE PHASE — **there are TWO disguise mechanics, not one**

**The read established that the engine has a disguise mechanic and that it sits downstream of what it
would conceal. That is true and it is HALF the picture.**

| | what it deceives about | what it produces | status |
|---|---|---|---|
| ⚠ **RUSH disguise** | *who is coming* | ⛔ **PRESSURE. SACKS.** | ✅ **EXISTS** *(`blitzDisguise` → `resolveBlitzRecognition`, `target = 50 + {0,15,20,25}`)* — ⛔ **but resolves AFTER protection has already paired against the truth** |
| ⛔ **COVERAGE disguise** | *who is covering whom* | ⛔ **INTERCEPTIONS** | ⛔ **ABSENT ENTIRELY** |

> ## ⛔ **ENTRY 163's NUMBERS ARE ABOUT THE SECOND ONE.** ⚠ **Completion 65.3% vs 64.2% — barely moves. TD:INT ~1:1 vs ~2.25:1 — moves enormously.** ✅ **A quarterback deceived about the RUSH gets sacked. A quarterback deceived about the COVERAGE throws it to the wrong man.**

⛔ **SO RELOCATING THE RUSH DISGUISE FIXES ITS PLACEMENT AND WILL NOT MOVE `int_rate`.** ⚠ **The two
are separate builds with separate outputs, and only the second addresses the anchor.**

---

## ✅ WHAT IS ACTUALLY THERE — the phase is not a gap

- ⛔ **The seam EXISTS and already draws dice.** `resolvePreSnap` *(`preSnap.ts:163`)* is called at
  `passPlay.ts:325` — **before `PLAY_START` (`:395`) and before `firstTick` (`:417`)** — and resolves
  recognition, pickup contests, stunt communication.
- ⛔ **Protection pairs OUTSIDE the engine, at instantiation.** `assignProtection`
  *(`playbook/protection.ts:254`)* reads the fully-resolved `DeclaredRush[]` before either call
  reaches `packages/engine`.
- ⛔ **The card and the truth are the same object.** No shown-vs-played pair anywhere.
- ⚠ **Coverage ASSIGNMENT is pre-loop** *(`buildReceiverTracks`, `passPlay.ts:335`)*; the coverage
  CONTEST is **lazy, first call at the receiver's break** *(`resolveBreakPoint`, memoised)*.
- ⛔ **No event precedes `PLAY_START`.**
- ✅ **No coordinates.** `FieldZone` is a 5×5 categorical grid whose own comment reads *"no yard
  lines, no motion; a player occupies one cell for the whole play."*

---

## ⇒ ADD / MOVE / CONSUME

### ⛔ ADD — three things, and only three

1. ⛔ **A SHOWN DEFENSIVE STATE, DISTINCT FROM THE PLAYED ONE.** ⚠ **This is the whole mechanic.**
   Minimally a pair on the defensive call: what the offence sees when it sets protection and makes its
   read, and what actually resolves.
2. ⛔ **A PRE-SNAP EVENT VOCABULARY.** ⚠ **Charter §3 — the stream is the single source of truth, and
   nothing currently precedes `PLAY_START`.** **What was shown and what was read must be published or
   a play cannot be reconstructed.** ✅ **Same argument that carried `RUSH_THREAT.origin`.**
3. ⚠ **A SHOWN/PLAYED PAIR ON COVERAGE**, separately from rush. ⛔ **This is the half that moves
   `int_rate`, and it is a different build.**

### ⛔ MOVE — one thing, and it is the relocation

⛔ **PROTECTION MUST PAIR AGAINST THE *SHOWN* RUSH, NOT THE RESOLVED ONE.**

⚠ **Today the ordering is: resolve defence → pair protection against it → roll recognition about the
residue.** ⛔ **The concealment is bypassed upstream, not defeated at the read.**

**Two candidate shapes, and the choice is the owner's:**
- ✅ **(a)** the playbook produces BOTH states and `assignProtection` pairs against SHOWN — smaller,
  keeps pairing where it lives, and `instantiate.ts` already resolves defence-first.
- ⚠ **(b)** protection pairing moves into the engine's pre-snap phase — larger, and it relocates a
  computation ADR-006 deliberately put upstream.

### ✅ CONSUME — do not duplicate any of these

| already exists | the phase should feed it, not replace it |
|---|---|
| ⛔ **`blitzDisguise` → `resolveBlitzRecognition`** | **A real target shift, `+0/15/20/25`.** ⚠ **Do NOT invent a second disguise scale.** The phase changes WHAT the roll is about, not the roll |
| ⛔ **`resolveReleaseVsPress`** | **A branch with its own actors, band table and timing** *(`jamDelaySeconds` → `readySeconds` → `JAMMED`)*. ✅ **A defender's snap position is a NEW INPUT to an EXISTING sub-roll — not a new consumer** |
| ⛔ **`runFit`** *(gap + side on every `ZONE` duty)* | ⛔ **A STARTING POSITION BY ANOTHER NAME. Authored across the corpus, read by NOTHING in the engine.** ✅ **ADR-053's shape exactly: a ratified declaration whose subject appears when something computes with it. THE PHASE IS THAT SUBJECT** |
| ✅ **`FieldZone`'s 5×5 grid** | **The existing spatial vocabulary.** ⛔ **A "position" can be a CELL. Do not add coordinates** — ADR-066 was halted for reaching past what the tree holds |

---

## ⛔ SEPARABILITY — what can land alone, and what cannot

**Per the split ruling *(entry 162)*: a split justified on attribution also buys revocability, and the
second is uncounted at ruling time.**

| # | change | inert? | lands alone? |
|---|---|---|---|
| **A** | **shown/played pair EXISTS in contracts**, `shown === played` on every card | ✅ **PROVABLY INERT** — identical values, no behaviour change | ✅ **YES** |
| **B** | **pre-snap event vocabulary** — publish shown and read | ✅ **INERT** — additive to the stream; a consumer may assert equality | ✅ **YES** |
| **C** | **`runFit` consumed** — the phase reads the gap+side already authored | ⚠ **depends on what consumes it** | ⚠ **only once a consumer exists** |
| ⛔ **D** | ⛔ **PROTECTION PAIRS AGAINST SHOWN** | ⛔ **NOT INERT.** The moment `shown ≠ played`, protection differs | ⛔ **NO — this IS the mechanic** |
| ⛔ **E** | ⛔ **COVERAGE shown/played** | ⛔ **NOT INERT** | ⛔ **NO — and it is a SEPARATE build from D** |

> ## ✅ **A AND B LAND INERT AND FIRST. D IS THE RUSH MECHANIC. E IS THE ONE THAT MOVES `int_rate`.** ⛔ **D AND E MUST NOT LAND TOGETHER — they have different outputs, and a joint arm would attribute an interception effect to a pressure change.**

---

## Provenance of factual claims — REQUIRED

| # | claim | provenance |
|---|---|---|
| 1 | The pre-snap seam exists, draws dice, precedes `PLAY_START` | ✅ **READ** — verified by Orchestrator at `:325`/`:395`/`:417` |
| 2 | `blitzDisguise` shifts a real target, `+0/15/20/25` | ✅ **READ** — `blitz.ts:64`, `tunables.ts` |
| 3 | Protection pairs at instantiation against resolved rush | ✅ **READ** — `protection.ts:254`, `instantiate.ts` header |
| 4 | PRESS/OFF is a branch, not a modifier | ✅ **COMPUTED** — four consumption sites traced |
| 5 | `runFit` read nowhere in the engine | ✅ **COMPUTED** — corpus grep, entry 166 |
| 6 | No coordinates; `FieldZone` is 5×5 categorical | ✅ **COMPUTED** — re-derived, all grep hits false positives |
| 7 | Disguise's real-world effect is on turnovers not completions | ⚠ **OWNER, EXTERNAL** — entry 163. **Not derivable from this tree** |
| 8 | That coverage disguise would move `int_rate` here | ⛔ **NO PROVENANCE — an inference from 7, untested** |

## Conjoined mechanisms — REQUIRED

⛔ **D and E are SEPARATELY PRICEABLE and must be measured in separate arms.** ⚠ **Rush disguise
produces pressure; coverage disguise produces turnovers.** **A joint arm would move two metrics and
attribute both to whichever landed louder** — **the template's own worked example, with the two
mechanisms having DIFFERENT TARGET METRICS rather than merely different sizes.**

## Implied scope — REQUIRED

- ⚠ **Motion and cadence are OUT.** ⛔ **They perturb a loop; the loop does not exist yet.** `unruled`.
- ⚠ **`simulateRunPlay` has no pre-snap stage at all.** **Whether the phase is pass-only. `unruled`.**
- ⛔ **The fixture harness orders offense-then-defence while the corpus orders defence-first**
  *(entry 165 §6)*. ⚠ **A shown/played pair makes ordering load-bearing. `unruled`.**
- ⚠ **`disrupted` is computed and never read** *(entry 166 §5)*. **A release outcome the phase might
  want. `unruled`.**

## Decision

⛔ **AWAITING RULING.** **Three questions I would want answered before any code:**
1. ⛔ **Shape (a) or (b) for the relocation** — playbook produces both states, or protection pairing moves into the engine?
2. ⛔ **Does the first build target D or E?** ⚠ **E is the one with the anchor behind it; D is the one whose mechanism already half-exists.**
3. ⚠ **Is a "shown" state a full defensive call, or a projection of one?** ⛔ **A full second call doubles the authoring burden; a projection needs rules for what is concealable.**
