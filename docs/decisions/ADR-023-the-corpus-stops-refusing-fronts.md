# ADR-023: the corpus stops refusing fronts it cannot block

- **Date:** July 2026
- **Proposed by:** `franchise-engine`, authoring pressure into `packages/playbook` under
  ADR-017's recorded exception
- **Status:** decided, implemented, no contract change requested
- **Affects:** `packages/playbook` only. `packages/calibration` sees a behaviour change it
  does not have to act on; `packages/engine` sees strictly more information on the same
  ratified types.

## Need

[ADR-022](ADR-022-pressure-vocabulary-blitz-stunts-hot-routes.md) ratified the vocabulary for
blitz pickup, stunts, hot routes and disguise, and said in its impact table:

> **playbook:** can author pressure for the first time. Its `UnprotectableCallError` — raised
> because "§7.4 blitz pickup is unimplemented in the engine, so a free rusher cannot be
> simulated" — is now raised for a reason that no longer exists.

This ADR is that sentence carried out, plus the authoring rules the four new fields are filled
in by. It needs no petition — everything below is content and local behaviour on ratified
types — but it changes what the corpus DOES rather than only what it says, and a behaviour
change that other packages can observe should be written down before it is discovered.

## Decision 1 — a rusher nobody blocks is played, not refused

`assignProtection` threw `UnprotectableCallError` the moment a rusher could not be paired.
That is gone. An unpaired rusher is now reported in `ProtectionResult.unblocked` and
`InstantiatedOffense.unblockedRushers`, and the call goes to the engine with him on it.

**This is the playbook half of `CALIBRATION-BACKLOG.md` entry 21.** The engine half was the
`UnsupportedPlayCallError` ADR-022 removed; entry 21's finding was that refusing a front the
offence cannot answer makes protection perfectly informed and biases sack and pressure rates
*downward*. Playbook's refusal did the same thing one layer up and by a different route: the
frozen caller caught the exception and **re-drew the offensive concept**, so the fronts that
generate the most pressure were systematically paired with the cards best able to absorb them.
Removing one and keeping the other would have closed the entry in name only.

Three things were considered and are recorded because they shaped the result.

- **Keeping the throw for the empty-personnel case only.** Rejected. Empty is not an edge
  case the corpus should apologise for; it is the one personnel grouping where the answer to a
  sixth rusher has *always* been a hot route rather than a body, and that is now sayable.
- **Reporting the free rusher on the call rather than in the result.** Rejected: it is already
  derivable from the call (a rusher no `ProtectionAssignment` names), and ADR-022 refused a
  `blitz` flag on `PLAY_START` for exactly that reason. `unblockedRushers` is a convenience for
  playbook's own callers and its own tests, not a second source of truth.
- **Widening `UnprotectableCallError` away entirely.** Rejected. It keeps a narrower and still
  loud job — a protector role the personnel package did not fill — because a role with no
  player behind it is a personnel error with no plausible substitute. Calibration's frozen
  caller catches the class and re-draws; it will simply stop seeing it, which is what closing
  entry 21 looks like from outside, and it needs no edit to get there.

**The one thing that got stricter.** `ProtectionScheme` is now a discriminated union, and the
cross-formation interior pickup is gated on `kind === "SLIDE"`. Before ADR-022 every protection
got the slide rule because no card could say it was not sliding. A big-on-big man protection
that runs out of bodies on one side now gives up a free runner, which is why offences slide at
all. No front in the corpus separates the two — `test/pressure.test.ts` builds one rather than
leaving the distinction asserted by nothing.

## Decision 2 — the authoring rules, and where each is enforced

Recorded because a corpus rule that lives only in a card's comment is a convention, and
Charter §4.1 prefers a compile error.

| rule | enforced by |
|---|---|
| A slide states its side | the type (`SchemeCall` is a union) |
| A scheme states its centre, and he is a line role | the type (`center: OffenseLineRole`, required) |
| The stated centre is actually protecting | `C_CENTRE_NOT_PROTECTING` |
| Five-man protections slide, six and seven are man | authored; the arithmetic is in `passConcepts.ts`'s header |
| The line slides **away from the man who answers that side** | `C_SLIDE_TOWARD_THE_OUTLET` (warning — sliding to the outlet is legal and usually a slip) |
| A hot conversion states its break zone | the type (`HotSpec.breakZone` required where contracts has it optional) |
| A hot conversion is QUICK or SHORT, and never deeper than what it replaces | `C_HOT_TOO_SLOW`, `C_HOT_DEEPER_THAN_THE_ROUTE` |
| A concept states a hot when its answer is not already its first read | `C_HOT_IS_A_NO_OP` |
| A card that cannot block six states a hot | `C_NO_ANSWER_TO_PRESSURE` |
| A stunt names two rushers, not the same man twice, at least one interior | `D_STUNT_NOT_A_RUSHER`, `D_STUNT_SELF`, `D_STUNT_BOTH_EDGE` |
| A TRIPLE is a real three-man chain | `D_STUNT_TRIPLE_NOT_CHAINED`, `D_STUNT_ROLE_REUSED` |
| Pressure names a disguise row; a front with nobody off the ball does not | `D_PRESSURE_WITHOUT_DISGUISE`, `D_DISGUISE_WITHOUT_PRESSURE` |
| ZERO means no deep help; ZONE_BLITZ means a lineman dropped | `D_ZERO_WITH_DEEP_HELP`, `D_ZONE_BLITZ_WITHOUT_A_DROP` |

`C_PROTECTION_CAPACITY` is **replaced** by `C_NO_ANSWER_TO_PRESSURE` rather than relaxed. The
old rule said "a card that cannot block six is an error, except in empty personnel where it is
a warning", and that was a statement about the ENGINE (§7.4 was unimplemented) dressed as a
statement about the card. What replaces it is a statement about football: every dropback has an
answer to the corpus's heaviest pressure, and it is either bodies or a sight adjustment.

### Two refusals worth the same weight as the rules

- **`blitzDisguise` is checked, never derived.** ADR-022 refused derivation because a delayed
  blitz's whole point is that the shell does not move. The validator asks the narrower question
  — does this card's own front contradict the row it claims — which is the opposite of
  inferring the row from the card, and the difference is that a check can be wrong out loud.
  **DELAYED accordingly has no check at all**, and the absence is deliberate: there is nothing
  on the card that separates a late rusher from a walked-up one, and the obvious proxy ("a
  defensive back is rushing") would re-derive disguise from the assignments. It is stated and
  trusted.
- **`available` excludes the two tackles and excludes any man running a route.** The first
  because a tackle with nobody on his edge is holding an edge, not free — offering him for
  pickup would reproduce the left-tackle-on-the-far-end pairing ADR-018 made unrepresentable.
  The second because ADR-022 petition 1 is explicit that a man running a route must not
  materialise as a blocker the instant a blitz shows; keeping a man in costs a route, before
  the snap, and `checkRelease`/`pulledIn` is where that is paid.

### One rule that was wrong and is recorded as such

The disguise requirement was first written as "five or more rush ⇒ state a row". It flagged
both goal-line cards, and **they were right and the rule was wrong**: a 5-3 goal-line front
rushes five down linemen and holds nobody back, so §5.3's recognition roll has no unaccounted
man to find. Pressure is somebody arriving from off the ball, not a headcount. The rule keys on
an off-ball rusher now, and `test/validate.test.ts` keeps the case that corrected it.

## Impact

- **playbook:** 1213 tests → 1267. `fiveManLine` is renamed `fiveManSlide` and takes a required
  side; nothing outside the package used it. `ProtectionScheme` gains two required fields, so a
  hand-written scheme does not compile until it states them.
- **calibration:** compiles unchanged. Its `MAX_CONCEPT_REDRAWS` path and `conceptRedraws`
  counter go quiet, which is the intended outcome of entry 21 and needs no edit. **Its frozen
  caller may now draw empty personnel against a six-man pressure**, which it previously could
  not, so the re-baseline ADR-022 sequenced will move.
- **engine:** receives `protectionScheme` on every dropback (with a centre on every one, so
  §5.3 and §7.3 never drop the Centre Awareness term), `hot` on sixteen routes, `stunts` on six
  defensive cards across all four complexities, and `blitzDisguise` on all six pressure cards.
  Every pressure number measured before this was a property of six fixture cards; they can now
  be measured against a corpus.
- **contracts:** untouched.
