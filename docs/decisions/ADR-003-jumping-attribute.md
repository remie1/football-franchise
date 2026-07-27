# ADR-003: Add a `jumping` attribute to the registry

- **Date:** July 2026
- **Proposed by:** `match-engine` (Phase 1 pass-play slice)
- **Status:** approved

## Need

`docs/design/match-engine.md` §11.3 (Contested Catch) specifies:

```
Receiver: d100 + (Catching ÷ 5) + (CIT ÷ 5) + (Jumping ÷ 5)
Defender: d100 + (Ball Skills ÷ 5) + (Jumping ÷ 5) + Contest Mod
```

`ATTRIBUTE_REGISTRY_V1` has no `jumping` id. The engine will not invent a local
attribute or read a hard-coded field (Iron Rule 5), so the contested-catch roll
currently ships with the two registry-backed receiver terms (`catching`,
`catchInTraffic`) and the one defender term (`ballSkills`).

Jumping is also the missing physical input for the 50/50 ball generally: it is
the one attribute that separates a 5'10" possession receiver from a 6'4"
contested-catch specialist, and it is the shared term on both sides of the roll
in the design doc — the only place in the spec where offense and defense
contribute the *same* attribute to opposite sides of a contest. Without it the
contested-catch roll is decided entirely by hands vs. ball skills, and height /
leaping ability has no mechanical expression anywhere in v1.

## Proposal

One registry addition, no event or type-schema change:

```ts
A("jumping","Jumping",["WR","TE","RB","DB","LB"],"physical",
  "Vertical leap and high-point ability at the catch point")
```

- `id`: `jumping`
- category: `physical`
- positionGroups: `WR`, `TE`, `RB`, `DB`, `LB` (the groups that contest a ball
  in the air; `TE`/`DB` are the primary consumers)
- schemaVersion: bump to 2, migration op
  `{ op: "add", attr: <jumping>, defaultFrom: { sources: [spectacularCatch, ballSkills], method: "mean" } }`
  so existing rosters get a defensible seed value until the attributes pipeline
  derives it properly (combine vertical jump is a Family A source that already
  exists in `docs/design/attributes` sourcing plans).

## Impact

- **contracts:** one entry in `ATTRIBUTE_REGISTRY_V1`, schemaVersion 1 → 2.
- **engine:** zero code change. The contested-catch formula is already
  data-driven: `TUNABLES.catching.contested.receiverTerms` and `.defenderTerms`
  are lists of `{ attr, divisor }` resolved through `resolveAttr` at roll time.
  Ratification means adding `{ attr: "jumping", divisor: 5 }` to both lists.
- **attributes pipeline:** gains a derivation target (combine vertical / RAS
  already ingested for the physical layer).
- **calibration:** gains a sensitivity-analysis subject; if contested-catch
  outcomes do not move with it, calibration recommends killing it again — which
  is exactly the registry's dev-time purpose.

## Decision

**Ratified** by project owner + Orchestrator, July 2026. `jumping` added to
`ATTRIBUTE_REGISTRY_V1`; registry `schemaVersion` 1 → 2; `MIGRATION_V1_TO_V2`
exported alongside it, seeding existing rosters from the mean of
`spectacularCatch` and `ballSkills` until the attributes pipeline derives it
properly.

Owner's rationale, recorded because it outranks the engine-side argument: combine
vertical jump is one of the cleanest signals in the entire Family A source set —
directly measured, universally available, no charting required. `jumping` may end
up better-grounded than most *skill* attributes, which depend on charting
judgment. That makes it a strong sensitivity-analysis subject for Mandate 2 as
well as a mechanic.

Engine adaptation cost was zero, as proposed: `TUNABLES.catching.contested.receiverTerms`
and `.defenderTerms` are `{ attr, divisor }` lists resolved through `resolveAttr`
at roll time, with a test asserting they stay data-driven. Ratification is one
entry in each list.

The rejected alternative — striking §11.3's Jumping line from the design doc — is
recorded here so it is not re-proposed: it would have discarded the only place in
the spec where offense and defense contribute the *same* attribute to opposite
sides of a contest, to avoid a one-line registry change.

Related: [ADR-004](ADR-004-roll-accounting.md), ratified in the same session.
