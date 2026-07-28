# ADR-022: the pressure vocabulary — blitz pickup, stunts, and hot routes

- **Date:** July 2026
- **Proposed by:** `match-engine` (the §5.3 / §7.3 / §7.4 dispatch)
- **Status:** APPROVED — all six petitions ratified July 2026; petition 1 taken in the stricter
  discriminated-union shape. The interim mappings and their containment table below are
  **historical**: `src/interim/adr022.ts` is deleted and no marker survives in the engine.
- **Affects:** `packages/contracts` (`playcalls.ts`, `events.ts`), `packages/engine`,
  `packages/playbook` (which can then author pressure), `packages/calibration`
  (which can then measure it)

## Need

§5.3 blitz recognition, §7.3 stunts and twists and §7.4 blitz pickup are implemented.
They are the three named sack and pressure sources the engine structurally could not
produce, and the reason `CALIBRATION-BACKLOG.md` entries 2 and 3 have been unmeasurable
for eight dispatches.

**One thing did not need vocabulary and it is the most important thing in the dispatch.**
A rusher no `ProtectionAssignment` names was already expressible; the engine simply
refused him (`UnsupportedPlayCallError`). That refusal is entry 21 — it forced every
caller to build blocking against the actual defensive card, so protection was perfectly
informed and sack and pressure rates were biased *downward*. **It is gone, and it needed
no petition.** Free runners resolve today, on ratified types.

Everything below is the vocabulary the three mechanics need in order to be **stated by a
card** rather than resolved by an engine that guessed. Each item is a thing a real
defensive or offensive card says out loud, and each is the specific kind of thing ADR-006
forbids the engine inferring from a formation string.

ADR-018 explicitly declined to petition hot routes, with a reason that has now expired:

> **Play action, motion, shifts, hot routes, option keys.** All absent from the vocabulary;
> all real omissions; none petitioned. Each is a MECHANIC that does not exist in the engine
> yet, and a data field for an unimplemented mechanic is a field that will be wrong by the
> time the mechanic lands.

The mechanic now exists, and the field's shape was decided by implementing it rather than
by imagining it. That is the sequence ADR-018 asked for.

---

## Petition 1 — a protection has a SCHEME, and `ProtectionAssignment[]` cannot state one

**What a card can say today.** A list of `{ blocker, rusher }` pairings. That is a *man*
protection by construction. There is no way to say "we slide left"; no way to say who
stayed in without giving him a rusher to be paired with; and no way to name the centre,
whom §5.3 and §7.3 both roll.

**Why each of those three bites.**

1. **Slide.** §7.4 step 1 is *"Slide protection: covered if blitzer on slide side."* With
   no slide declaration the engine can only implement the man branch. The alternative is
   deriving a slide from where the named rushers happen to be, which is inventing a scheme
   out of a pairing list.
2. **Who stayed in.** §7.4 step 3 is a contest between a back or tight end and the
   blitzer. The engine has no way to know a back is in protection: he appears in
   `OffensivePlayCall` only if he has a route or blocks a *named* rusher, and a man kept in
   to scan does neither. **Without this field there is no §7.4 step 3 at all** — every
   unaccounted rusher goes straight to step 4.
   This field is also the load-bearing half of entry 21's fix, and the reason it is a
   pre-snap declaration rather than a resolution-time search: **a man who is running a route
   must not be able to materialise as a blocker the instant a blitz shows.** That is exactly
   the perfectly-informed protection the entry is about, moved one level down. Keeping a
   man in costs a route, before the ball is snapped, and the card has to have paid for it.
3. **The centre.** §5.3 rolls `QB Awareness ÷ 5 + Centre Awareness ÷ 5`; §7.3 rolls
   `Centre Awareness ÷ 5 + Adjacent OL Awareness ÷ 5`. The engine cannot work out which
   blocker is the centre — `ProtectionAssignment` names players, not positions on the line,
   and ADR-006 forbids reading it out of `formation`. **The engine does not substitute a
   stand-in.** Absent a stated centre the term is simply not rolled, and the modifier list
   in the stream says so.

**Proposed shape.**

```ts
export interface ProtectionCall {
  /** MAN is exactly today's behaviour: a rusher is covered iff he is named. */
  readonly kind: "MAN" | "SLIDE";
  /** SLIDE only, and required when kind is SLIDE. */
  readonly slideSide?: RunSide;
  /** §5.3 / §7.3's "Centre". Omitted ⇒ the term is not rolled. */
  readonly center?: PlayerId;
  /** Men in protection who are NOT pre-paired to a rusher, in pickup priority. */
  readonly available?: readonly PlayerId[];
}

export interface OffensivePlayCall {
  // …
  readonly protection: readonly ProtectionAssignment[];
  readonly protectionScheme?: ProtectionCall;   // omitted ⇒ MAN, i.e. today
}
```

Additive and default-preserving: an omitted `protectionScheme` means MAN protection, which
is precisely what a list of pairings already is. Every existing card and call site is
unchanged.

**A stricter alternative, and why it is not proposed.** Charter §4.1 would prefer
`kind: "SLIDE"` to make `slideSide` *required* through a discriminated union rather than
optional-with-a-runtime-check. That is the better shape and it should be taken if the
Orchestrator is willing:

```ts
export type ProtectionCall =
  | { readonly kind: "MAN"; readonly center?: PlayerId; readonly available?: readonly PlayerId[] }
  | { readonly kind: "SLIDE"; readonly slideSide: RunSide; readonly center?: PlayerId;
      readonly available?: readonly PlayerId[] };
```

The engine implements the weaker shape today and rejects a side-less slide at
`assertCoherentPlayCall`, with a test. That is policy where a type would do, and it is
recorded as such rather than left to be discovered.

---

## Petition 2 — a route has no hot conversion

**What a card can say today.** Nothing. §5.3's entire SUCCESS clause is *"Hot route
available, protection adjusted"* and §7.4 step 2 is *"IF HOT ROUTE AVAILABLE: QB must
recognize and throw hot."* Neither is expressible.

**Why this is not optional if the other two land.** Blitz and stunts add pressure; the hot
route is the only thing that takes it away. Without it §7.3 and §7.4 over-produce pressure
by construction, and a blitz becomes a free win rather than a risk. The measurement is in
this dispatch's report: a blitz the quarterback **missed** sacks him on 13.99% of
dropbacks; one he **saw and answered** sacks him on 4.29%, against 11.16% on a snap with no
blitz at all. Remove the conversion and the highest number is the only number.

**Proposed shape.** A converted route is just a different route, so the spec is the fields
a route already has:

```ts
export interface HotRouteSpec {
  readonly routeName: string;
  readonly depthClass: RouteDepthClass;
  readonly airYards: number;
  /** The area the pressure vacated, as the CARD sees it. Omitted ⇒ keep the original. */
  readonly breakZone?: FieldZone;
}

export interface RouteAssignment {
  // …
  readonly hot?: HotRouteSpec;
}
```

**What the engine deliberately does NOT do with it, and this is the refusal worth
recording.** §7.4 says the quarterback *"must recognize and throw hot"*. The engine
converts the route and moves the hot receivers to the front of the progression. It does
**not** force the throw. Forcing it would assert a decision no roll produced (ADR-005) and
would bypass §8.5's target selection entirely — a hot route that is covered should not be
thrown to, and only §8.5 knows whether it is.

---

## Petition 3 — a defence cannot say it is twisting

**What a card can say today.** `RushAssignment` is `{ rusher, move, alignment?, side? }`.
There is no pairing, and §7.3 is entirely about a pairing: a penetrator, a looper, and how
complicated the exchange is.

**Proposed shape.**

```ts
export type StuntComplexity = "T_E" | "T_T" | "DELAYED" | "TRIPLE";   // §7.3 verbatim

export interface StuntCall {
  readonly penetrator: PlayerId;
  readonly looper: PlayerId;
  readonly complexity: StuntComplexity;
}

export interface DefensivePlayCall {
  // …
  readonly stunts?: readonly StuntCall[];
}
```

**Why a separate list rather than a field on `RushAssignment`.** A stunt is a relationship
between two rushers. Putting `stuntWith: PlayerId` on each of them lets a card state the
pair inconsistently — A twisting with B while B twists with C — and the incoherence check
would then be repairing a shape that should not have been sayable. One entry names both
men, exactly as `RunBlockAssignment` names both blocker and defender.

**Why `complexity` is an enum and not a number.** §7.3's table is four named rows with
stated values (+0/+10/+15/+25). A raw number would let a card set its own difficulty, which
is a tunable wearing a card's face — the failure `game/playbook.ts` records about
`laneSpan` (§ADR-018: "a coverage-rate dial with a card's face on it").

---

## Petition 4 — a defence cannot say how well the pressure is hidden

§5.3's target is `50 + Blitz Disguise Rating`, with four named rows: standard +0, zone
blitz +15, delayed +20, 0-blitz from the coverage shell +25. Nothing on a card states which.

```ts
export type BlitzDisguise = "STANDARD" | "ZONE_BLITZ" | "DELAYED" | "ZERO";

export interface DefensivePlayCall {
  // …
  readonly blitzDisguise?: BlitzDisguise;
}
```

**An absent value is `STANDARD`, and that is not a silent default.** It is §5.3's own +0
row: "standard blitz (LB walked up)". A card that says nothing is describing the least
disguised pressure in the doc's table, which is the honest reading of a card that does not
mention disguise.

**Deliberately NOT derived from the assignments**, though it looks derivable — a card with
no deep safety *is* a zero blitz, and a rusher who also has a coverage assignment *is* a
zone blitz. Deriving it would make the disguise a property of the coverage shell, and the
whole point of a delayed blitz is that it looks like the same shell until it is not.
`CALIBRATION-BACKLOG.md` §8b's orthogonality test applies exactly: shell and pressure are
separate axes and a card must be able to state them separately.

---

## Petition 5 — `RUSH_THREAT` cannot say why a rusher is coming

```ts
| ({ type: "RUSH_THREAT"; payload: {
      rusher: PlayerId; alignment: RushAlignment;
      rollRef: string; etaTick: number; state: RushThreatState;
    } } & MatchEventBase)
```

`rollRef` is documented as *"the `pass_rush_tick` roll that created it"*. There are now
four ways to become a threat and only one of them is a won rep:

| origin | what justifies him | the roll `rollRef` names |
|---|---|---|
| `WON_REP` | §7.1, he beat his man | the `pass_rush_tick` CHECK |
| `UNBLOCKED` | §7.4 step 4, nobody was left | the `blitz_recognition` PRESNAP_READ |
| `PICKUP_LOST` | §7.4 step 3, he beat the back | the `blitz_pickup` CHECK |
| `STUNT_LOOPER` | §7.3, the exchange was missed | the `stunt_communication` CHECK |

**Every one of them points at a real roll — nothing is faked.** What a consumer cannot do
is tell them apart, so an unblocked blitzer and a beaten left tackle arrive in the stream
looking identical, and "how much pressure came from blitzing?" is not answerable from the
event stream. That is precisely the under-description ADR-007 was filed about, one mechanic
later.

**Proposed shape**, with `rollRef`'s documentation widened to "the roll that justifies this
threat":

```ts
export type ThreatOrigin = "WON_REP" | "UNBLOCKED" | "PICKUP_LOST" | "STUNT_LOOPER";
// …
| ({ type: "RUSH_THREAT"; payload: {
      rusher: PlayerId; alignment: RushAlignment;
      origin: ThreatOrigin;          // ← added
      rollRef: string; etaTick: number; state: RushThreatState;
    } } & MatchEventBase)
```

**Considered and NOT proposed: making `rollRef` optional for the unblocked case.** It was
the first shape drafted, on the reasoning that a rusher nobody blocked is caused by the
card and not by a die. It is wrong, and finding out why is worth recording: **the §5.3
recognition roll is always made when a rusher is unaccounted for, and it is the roll that
decided whether the protection adjusted to him.** So a real roll exists in every case, and
an optional `rollRef` would have created a second, emptier way to say "no roll" alongside
the honest one — and invited a sentinel value the day somebody needed to render it.

**Interim, and it is the weakest thing in this ADR.** The engine publishes free runners
**before the first `TICK`**, so `event.tick === undefined` distinguishes them — no rep has
been rolled yet, so a threat at that point cannot be a won rep. `renderPlay` reads it that
way and says so in a comment. It is correct and it is an inference from an absence, which
is the class of thing Charter §4.1 exists to eliminate.

---

## Petition 6 — `PRESNAP_READ` cannot carry a result band

```ts
| ({ type: "PRESNAP_READ"; payload: {
      actor: PlayerId; kind: CheckKind; roll: RollDetail; target: number; tier: ResultTier;
    } } & MatchEventBase)
```

`CHECK` gained `band?: string` in ADR-011, for the reason that a re-derived band desyncs
silently the first time calibration moves a boundary. `PRESNAP_READ` did not, because it
had no producer. §5.3 is its first, and §5.3 has a four-row result table.

```ts
      actor: PlayerId; kind: CheckKind; roll: RollDetail; target: number;
      tier: ResultTier; band?: string;    // ← added, same meaning as CHECK.band
```

**Severity: low, and stated as low.** The binary outcome — did he see it — is recoverable
from `roll.total >= target`, equivalently from `tier` at TIE or better, and every consumer
in this dispatch's measurements uses that. Only the four-way label is missing. It is
petitioned because ADR-011's rule is a rule about the whole stream and this is the one
event that does not meet it.

**Considered and rejected: emitting §5.3 as a `CHECK` instead.** `CheckKind` contains
`blitz_recognition`, so it would compile and it would carry a band today with no petition
at all. It is the wrong trade: `PRESNAP_READ` exists precisely for §5's pre-snap phase, it
has been in the contract since v0 waiting for exactly this producer, and routing around it
to borrow a field would leave the engine with an event type nothing ever emits and a
pre-snap read that claims to be a contested check. A missing optional field is a smaller
lie than a misclassified event (ADR-016's precedent, in reverse).

---

## Considered and NOT proposed

Recorded because a petition that quietly grows is worse than one that is refused
(ADR-018's own rule, applied to itself).

- **A `gap` on `RushAssignment`.** ADR-018 refused it as "vocabulary with no consumer",
  because §7.2's arrival model reads `alignment`. §7.4 gave it a *potential* consumer —
  a slide protection is really a gap-by-gap rule, not a side-by-side one — and it is still
  refused. `side` was enough to pair every protection in this dispatch, and a gap would let
  a card state a geometry the engine would then have to fake a response to.
- **A `hotRead` / sight-adjust key on the offensive call.** Real hot routes are triggered
  by a *specific* defender showing (the back reads the Will). Modelling that needs the
  engine to know where defenders are pre-snap, which the §3 grid does not carry for a
  rusher. The current model — recognition is a roll, and every hot route on the card
  converts together — is coarser and does not require a spatial fake. Petition it when
  there is a pre-snap alignment model to hang it on, not before.
- **A `ROUTE_STATUS` phase of `HOT`.** Genuinely wanted: a consumer watching route status
  cannot tell a conversion from a card that always ran that route. It is **not petitioned
  here** because the same information is already in `PLAY_START` (the engine's own payload
  states `hotConversions` with both ends of the change) and because `RoutePhase` is a
  closed union describing where a route is on its timeline — `JAMMED`, `DEVELOPING`,
  `OPEN`, `SETTLED`, `DECAYING`, `SCRAMBLE_DRILL`. `HOT` is not a point on a timeline, it
  is a fact about *which route he is running*. Adding it would overload the union's meaning,
  which is the thing ADR-010 exists to stop. If a consumer needs it per-tick, the honest
  shape is a separate `ROUTE_CONVERTED` event, and nothing needs one yet.
- **A `pressure` or `blitz` flag on `PLAY_START`.** Derivable: rusher count, and the
  `unaccountedRushers` list the engine's own payload already carries. A stored derivation is
  a second source of truth for the same fact.
- **Stamina, morale, weather.** Still absent, still not petitioned by this dispatch. §16 is
  unimplemented and a field for an unimplemented mechanic is ADR-018's rule again.

---

## Impact if approved

- **contracts:** four additive optional fields on play calls, two new closed unions
  (`StuntComplexity`, `BlitzDisguise`), one new interface (`ProtectionCall`,
  `HotRouteSpec`, `StuntCall`), one added enum + one added optional field on events. No
  schema bump; every existing card and consumer is unchanged.
- **engine:** `src/interim/adr022.ts` is **deleted**, its declarations move to contracts,
  and its six reader functions become plain field access. Two tests in
  `test/blitz.test.ts` assert today that nothing else in `src/` reaches through a contract
  type, so ratification is a mechanical edit rather than a search. `RUSH_THREAT` gains an
  `origin` argument at four call sites; `renderPlay` drops its tick-absence inference.
- **playbook:** can author pressure for the first time. Its `UnprotectableCallError` —
  raised because "§7.4 blitz pickup is unimplemented in the engine, so a free rusher cannot
  be simulated" — is now raised for a reason that no longer exists.
- **calibration:** can measure blitz, stunt and hot-route rates against the real corpus, and
  its frozen caller can stop re-drawing concepts it cannot protect. That is what actually
  closes `CALIBRATION-BACKLOG.md` entry 21.

## Interim state, all of it marked

| where | what |
|---|---|
| `src/interim/adr022.ts` | every petitioned declaration, and the only place the field names are read |
| `src/game/playbook.ts` | the only other file that names `protectionScheme` — it authors cards |
| `src/events.ts` | `PresnapEmission`'s comment states the missing `band` |
| `src/types.ts` | `PassPlayStartPayload`'s comment states why `hotConversions` is there |
| `src/sim/passPlay.ts` | the comment on the pre-snap `RUSH_THREAT` publication states the missing `origin` |
| `src/debug/renderPlay.ts` | the comment on the free-runner line states the tick-absence inference |
| `src/validate/playCall.ts` | the block comment on the coherence rules for the petitioned fields |
| `src/index.ts` | the type-only barrel block, which is deleted on ratification |
| `test/blitz.test.ts` | two tests that fail if the containment above is broken |

No interim marker exists in the engine that is not in this table.

---

## Decision

**All six petitions approved** by project owner + Orchestrator, July 2026 — **and petition 1
ratified in the stricter shape this ADR recommended against itself.**

`ProtectionCall` ships as a **discriminated union**, so `slideSide` is structurally required on
a slide rather than optional-with-a-runtime-check. The owner's reasoning: *Charter §4.1 landed
one dispatch ago; letting policy-where-a-type-would-do into the constitution immediately after
would make it decorative.* The same ruling applies to the engine's `RushPlan` — "blocked or
free, never neither" becomes a discriminated union on `blocker`, not a runtime throw. Both
weaknesses were **self-reported**, which is why they were caught; take the stricter shape in
both places.

**`blitzDisguise` is ratified despite having no current producer**, and the reason is the
refusal that accompanies it. Deriving disguise from the coverage shell was correctly refused —
a delayed blitz's whole point is that it looks like the same shell — and the consequence of
*not* shipping the field is that the first author who wants to disguise a blitz reaches for the
shell, which is exactly the derivation just refused. A card that wants to say something needs
somewhere to say it.

**The refusals are ratified as decisions, not merely noted:** no `RoutePhase: "HOT"` (a phase is
a timeline position, not which route he is running); no `gap` on `RushAssignment` (ADR-018
refused it, §7.4 gave it a *potential* consumer, and it is still refused); no sight-adjust key;
no `blitz` flag on `PLAY_START`; and `rollRef` stays required — the §5.3 recognition roll is
always made when a rusher is unaccounted for, so a real roll justifies every threat and an
optional field would have created a second, emptier way to say "no roll".

### Why this unblocks more than it implements

Until this landed, `packages/playbook` could not state a stunt, a hot route or a protection
scheme on ratified types, so **every pressure number in the blitz dispatch is fixture-grade** —
blitz rate 32.8% is a property of six uniformly-picked fixture cards, and the stunt-win rate is
one card at one complexity. The corpus can now say these things, which is the precondition for
measuring any of it properly.

Sequenced accordingly: **ratify → corpus states them → re-baseline → then probe entry 23's
residual.** Entry 23's +4.97 is a magnitude measured on a tree that no longer exists.
