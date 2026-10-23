# ADR-083: your coach's personality builds up from how you answer people

- **Date:** 2026-10-23
- **Proposed by:** Orchestrator, for `narrative` (the answers) and `franchise` (the score)
  (thread "News and storylines"; plan `/mnt/project-files/design/coach-personality-plan.md`)
- **Status:** design ruled by the owner (Q1-Q6, 2026-10-23); Q7 (how the main trait resists
  flip-flopping) asked, the recommended answer written in until he picks. Nothing is built; it
  waits for the first conversation (the end-of-season meeting, ADR-081), and its two contracts
  edits (§7) each need the owner's typed yes by name.
- **Origin:** the owner's idea in the same thread (2026-10-22): a hidden personality score for the
  game user, built from his answers at meetings and press conferences, where no trait is good or bad
  and only the mixtures matter.

> Phase note: Charter §6 places narrative last. As with ADR-082 and ADR-084, the owner chose to start
> story work early, on the condition that nothing here touches engine, playbook, play-caller or
> calibration measurement code, or moves any sim number or seed.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| `PersonalityType` is the five types (demanding, players' coach, cerebral, fiery, quiet) that coaches and players share | `packages/contracts/src/players.ts:100` | COMPUTED (read) |
| ADR-080's fit table (`STYLE_MATCH`, coach rows against player columns, −0.4..+0.4) is how a coach's type mixes with a player's | `packages/franchise/src/staff/tables.ts`; ADR-080 §5 | COMPUTED (read) |
| ADR-084 §4 rests every staff member's view of the user on the user's type read through that table, at 0 until this exists; the ledger takes it as `RelationshipContext.userType` | ADR-084 §4; `packages/franchise/src/relationships/ledger.ts` | COMPUTED (read) |
| The end-of-season meeting has the user answering his staff (ADR-081); press conferences come with the story work | ADR-081; `docs/design/narrative.md` | read (spec) |
| Spec #7: answers differ by what they touch, not by which is "the good answer"; the player knows what he is saying, not exactly how it lands | `docs/design/narrative.md` | read (spec) |
| A lean halving in 52 weeks fades by 1.3% a week (0.5^(1/52) = 0.98676) | computed | COMPUTED |
| Lean sizes, the starting push (8 to the picked type, 3 to each other), the 10-point margin, the yearly review | judgement, to be tuned once conversations exist | CHOSEN — provenance NONE |
| The names `PERSONALITY_LEAN`, `UserPersonality` | named here | CHOSEN — provenance NONE |

## Conjoined mechanisms

Two pieces: the meters (leans in, fading) and the main trait (read from the meters at a review). The
main trait is the only thing other systems read (Q6), so the meters have no effect of their own to
price. Neither touches the sim. Each reader of the main trait (§6) is built and checked on its own.

## Implied scope (unruled, not built here)

- Computer coaches keep one fixed type each (ADR-080); they do not drift.
- A public reputation separate from the type (the owner chose the five types alone, Q1).
- Players' and reporters' own types reacting to the user's (the readers of §6, each in its turn).
- Staff warning the user how an answer will read (Q3 offered it; the owner chose no labels).

## Inertness proof

Claim: **this ADR changes nothing the sim produces.** It is a design note: no file in `packages/` or
`apps/` changes with it. When built, the score lives in `franchise` and is read by the relationship
ledger, player mood and (later) the press and the front office; never by the engine, the playbook,
any play-caller or the frozen calibration caller.

## 1. Need

Every computer coach has a type; the user should have one too, built from what he says rather than
handed to him. ADR-084 already reads it: each staff member's view of the user rests on how his type
takes to the user's (0 until this exists).

## 2. The owner's rulings (2026-10-23 02:44Z, thread "News and storylines")

| | Question | Ruling |
|---|---|---|
| Q1 | Which traits? | **(a)** The same five types as everyone else |
| Q2 | Can you see your own trait? | **(b)** A meter for each trait on the coach page |
| Q3 | Do you know which way an answer leans? | **(a)** No label; the words make it plain |
| Q4 | How fast does it move? | **(a)** Recent answers count more (an answer halves in weight after a season); the main trait changes only when another clearly overtakes it |
| Q5 | Where do you start? | **(a)** Pick a starting type at creation, as a light push |
| Q6 | Only the main trait, or the whole mix? | **(a)** Only the main trait does the mixing |

With the answers the owner raised a concern: *"I have a concern over game users being able to
exploit switching their coach's trait back and forth. For example, if they keep two traits within
1% of each other than they could easily make choices to push them one way or the other. So we need
some mechanic that prevents that from happening."* That is Q7 (§5).

## 3. Answers and leans

An answer the user gives (to a player, a reporter, his staff) can carry a direct effect, a lean, or
both. A lean adds weight to one type: 1 for most answers, 2 for a strong one, set by whoever writes
the answer. No answer is tagged (Q3): an apology reads soft without a label saying so.

## 4. The meters (Q2, Q4, Q5)

- Five meters, one per type, each the type's share of the user's lean weight; they add up to 100%,
  and they are shown on the coach page (Q2).
- Every lean fades by 1.3% a week, so it is worth half after a season (Q4).
- At creation the user picks a starting type (Q5): 8 weight to it and 3 to each other type, so the
  meters start at 40% and 15% each. The push fades like any answer, so a season of answers takes
  over.

## 5. The main trait and flip-flopping (Q4, Q7)

The **main trait** is the only thing anyone else reads (Q6): the staff's rest points (ADR-084 §4),
and later player mood, the press and the president. It starts as the picked type.

**Q7. How should your coach's main trait resist flip-flopping?** (asked 2026-10-23 02:46Z, on a
card; unanswered when this note was written)

- **(A) Reviewed each season, with a clear lead. Recommended, and written in until the owner
  picks.** The main trait is decided once a year, at the end of the season: it changes only if
  another trait then leads it by 10 points on the meters (say 40% to 30%). No flipping mid-season.
- (B) A clear lead held for 6 weeks: it changes whenever another trait has led by 10 points for 6
  straight weeks, and is then locked for a full season.
- (C) A clear lead only: it changes as soon as another trait leads by 10 points. Simplest, but a
  determined player could still swing it back and forth across a season.

Under (A) the owner's example does nothing: two traits within 1% of each other never flip, the
meters still move with every answer all year, and a conversation timed to tip the balance changes
the main trait no sooner than the season's end. Once a trait has taken over, the old one needs a
10-point lead of its own to come back, so a swing there and back takes two seasons and 20 points of
movement.

## 6. What the main trait acts on, in build order

1. **Your staff** (ADR-084 §4): each view of the user rests at 40 × the fit of the user's main
   trait (as the coach) with the staff member's type, the way staff views of each other do. A
   change of main trait moves those rest points at once, and the views then drift.
2. **Players**: each player's fit with you feeds his mood (the fit table).
3. **The press**: reporters and outlets get their own types, which colour how your words get
   reported.
4. **The front office**: the president's type against yours, in how patient he is with you.

## 7. Proposal: the contracts edits (shape only; each needs the owner's typed yes by name)

- **Y1 — your personality in the save:**
  `UserPersonality { team: TeamId; leans: Record<PersonalityType, number>; main: PersonalityType; reviewedAt?: CalendarStamp }`,
  in `SaveFile.world.userPersonality?` (optional, so older saves still load).
- **Y2 — `PERSONALITY_LEAN`** in `NarrativeEffect`:
  `{ kind: "PERSONALITY_LEAN"; type: PersonalityType; weight: 1 | 2; reason: StorylineId }`, so an
  answer written on the story side reaches the score through the closed effect union (Spec #7 §1).

A change of main trait is reported in the event stream; its shape is named with Y1 and Y2 at build.

## 8. Build order (later, with the first conversation)

| Step | Piece | Check |
|---|---|---|
| P0 | This note | rulings recorded |
| P1 | The score in `franchise`: leans in, fading, the review (Q7); Y1-Y2 on the owner's typed yes | unit tests: a lean halves in 52 weeks; a 1% edge never flips; the review flips only on a 10-point lead |
| P2 | Wired to the first conversation (the meeting, ADR-081) and to ADR-084's rest points | the meeting's own checks |
| Later | Players, the press, the front office (§6) | each with its own tests |

## 9. Impact

- This ADR: `docs/decisions/` only.
- When built: `contracts` (Y1, Y2), `franchise` (the score and its review), `narrative` (answers
  that lean), `apps/game` (the meters on the coach page). `engine`, `playbook`, play-callers,
  `calibration`: **no change.**

## 10. Decision

Design: **ruled by the owner, 2026-10-23 02:44Z**, thread "News and storylines": *"Six questions
about the game user's own coach's personality: 1. A 2. B 3. A 4. A 5. A 6. A"*, with the concern
quoted in §2. Q7: **asked, unanswered**; (A) is written in as recommended. Contracts edits Y1-Y2:
**not yet requested**; each will be named for the owner's typed yes at P1.
