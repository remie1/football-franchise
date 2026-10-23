# ADR-071 (DESIGN): The defensive call is built from parts and tags

- **Date:** 2026-10-14
- **Proposed by:** Orchestrator, from the owner's answer to ADR-070 §8 question 3
- **Status:** **approved** *(owner, 2026-10-14)* — all four questions in §9 answered yes; the
  contracts petition in §6 is approved. Step 1 is built (§10): caller v3 reproduces arm B number
  for number; merged to `main` on the owner's word (fast-forward, `c1f27d5`). Step 2 is built
  (§11): Press, Split and Show 4, worn alone or beside a safety look by caller v4, now the
  default; measured in ADR-070 §10; merged to `main` on the owner's word (fast-forward,
  `b984074`). Reviewed at draft by the contracts guardian
  (MODIFY; its fixes are folded in below) and the fantasy advisor (nothing foreclosed; its notes are
  in Implied scope).
- **Replaces:** ADR-070 §4's contracts petition (a list of masks). ADR-070's approved rulings (1, 2
  and 4) stand, and are built under the shape below.
- **Revisits:** ADR-069 ruling 5 (front and blitz stay on the card) — §7 says when it ends; and
  ruling 6 (`mask` on the defensive call) — §6 replaces the field it approved.

---

## 0. What the owner is deciding

ADR-070 asked whether a call should carry a list of masks. The owner's answer: *"You're on the right
path and we need to build even more into it"* — a real call sheet builds every call from a base
concept plus one-word tags, said in a fixed order. This ADR is that shape:

- a call is **four parts, said in order: personnel, front, coverage, tags** (§1);
- a tag is one of **three kinds — a look, a pressure, a front tag — by which layer of the call it
  changes** (§2);
- **one rule for combining tags** (§3);
- **the words** (§4), and how today's 22 calls read in them (§5);
- **the contracts change** (§6);
- **a build order** whose first step changes nothing in play, and which keeps ADR-069's ruled order
  (§7).

## 1. The call, in the owner's order

The owner's note (REPORTED, 2026-10-14), condensed:

> The call is built sequentially: **[ PERSONNEL / PACKAGE ] ➔ [ FRONT / ALIGNMENT ] ➔ [ POST-SNAP
> COVERAGE ] ➔ [ PRE-SNAP MASK TAG ].** "Nickel Odd, Cover 3" is the vanilla call, zero disguise.
> "Nickel Odd, Cover 3, Show 2": the front and the post-snap responsibilities are identical; the
> safeties align to fake a Cover 2 shell. **Tags are single words that alter the assignment of just
> one or two position groups without changing the rest of the play.** Players know "Cover 3" and
> "Show 2" separately and can apply Show 2 to Cover 1, Cover 3, or a blitz. Against an unexpected
> formation (an empty backfield), the defensive captain can yell a single tag to change just the
> mask or just the front.

| part | what it says | where it lives today |
|---|---|---|
| **Personnel** | who is on the field: Base, Nickel, Dime, Goal Line | the card's `personnel`, which reaches the call only as the first word of its `front` text |
| **Front** | how the line and the box align: Over, Even, Under, Bear, Mug, Prevent, 5-3 | the rest of the `front` text: "Nickel **Over**", "4-3 **Bear**" (4-3 is what Base is), "**5-3** Goal Line" |
| **Coverage** | the base concept — what is played after the snap (the owner's matrix: *"Base Concept (The Foundation)"*) | the card's name: Cover 3 Sky, Quarters, … |
| **Tags** | one word each, changing one or two position groups | Phase 1's mask; the six blitzes and six line games are baked into their cards (§5) |

**Where the pressure and line-game tags are said.** The owner's order fixes the mask's place: last.
For the other two I propose the places they take on a call sheet — a line game rides the front, and
a pressure is said before the coverage it brings:

> **Nickel Over Tex, Fire, Cover 3, Show 2** — personnel, front and its line game, pressure,
> coverage, look.

`CHOSEN — provenance NONE.` It is the play log's convention; nothing reads it.

## 2. Three kinds of tag, by the layer each changes

A call has three layers a tag can change: **what the offence is shown** (`shownAssignments`), **who
rushes and who takes their coverage** (`rush` and `assignments`), and **how the line plays**
(`stunts`, and later the line's gaps). One kind of tag for each:

| kind | changes | the owner's column | the owner's examples |
|---|---|---|---|
| **Look** | **only what the offence is shown.** Never what is played (ADR-069 ruling 1, kept) | A — mask | Show 2, Show 4, Press |
| **Pressure** | **what is played:** who rushes, and who takes the rushers' coverage | B — blitz add-on | Fire, Smoke, Zero |
| **Front** | **how the line plays:** a line game now, a slant later | C — stunt / front shift | Pinch, and today's line games |

**Two of the owner's column-C words are looks.** Stem (the line aligns in one front and shifts late)
and Mug as a bluff (backers walked up into the gaps who drop at the snap) change what the offence
sees, not what is played, so they change the shown layer: they are looks on the front group. The
owner's ADR-069 catalogue already counted them as masks ("DL stem", "Cover 0 mugged"). The kind
follows the layer a word changes, not the column it sits in on a sheet, because the layer is what
the engine and calibration read.

**A pressure's word is shared; its execution depends on the coverage.** Fire over Cover 3 is a fire
zone: the backers come, an end drops into the curl-flat, and the nickel and strong safety re-space
underneath. A linebacker blitz over Cover 1 sends the backers and hands the man one of them had to a
safety. A player learns it that way — *"on Fire in Cover 3, I have the hook"* — so a pressure states,
for each coverage it may go with, who takes each rusher's coverage. That is the answer to ADR-069
§3's objection (a pressure takes a coverage defender away, so the coverage behind it has to be written
knowing who left): each pairing is **stated and then checked**, exactly as a look's `over` list is.

## 3. How tags combine

1. **One writer per man, per layer.** At most one look per position group, and never two looks on
   one man (ADR-069 §10 ruling 1, kept); and no two played tags — pressure or front — change what
   the same man plays. A look and a played tag may touch the same man, because they change different
   layers. That is what lets **Show 2 sit over Fire**, the owner's own case: Fire sets what the
   strong safety plays (the curl-flat), Show 2 sets what he shows (a deep half). It is also why
   Show 2 over a quarters rotation, which moves the corners as well as the safeties, takes no corner
   look with it (ADR-070 §2).
2. **Played first, shown second.** Pressure and front tags are applied first, and a look is checked
   against what they leave. A look that would show exactly what is played is refused, as Phase 1's
   are (ADR-005: no die that turns nothing).
3. **A look never changes what is played. A pressure never moves the deep shell** — over Cover 3, Fire
   still plays three deep. Zero is the exception by definition: removing the deep help is what Zero
   is, and `validate.ts`'s `noDeepHelp` rule already polices it.
4. **One or two position groups.** For a look or a front tag, the men it moves. For a pressure, the men
   who come; the men who fill in behind them are part of its definition and stay underneath (rule 3).
   The groups: the line, the backers, the corners, the nickel and dime, the safeties.

## 4. The words

### Looks

| tag | shows | over | the lie | state |
|---|---|---|---|---|
| **Show 2** | a Cover 2 shell: both safeties at deep halves — and over a quarters rotation, the corners squatting in the flats | Cover 3, Fire Zone, Cover 1; Quarters, Cover 6 | two-high shown | **built** — Phase 1's Two-High and Two-High Cover 2 look, one word |
| **Show 1** | one safety in the middle, the other walked down | Cover 2, Cover 2 Man, Quarters, Cover 6 | one-high shown | **built** — Phase 1's Single-High |
| **Press** | both corners pressing #1 | Cover 3, Fire Zone, Quarters | man shown, deep zone played | approved — ADR-070 ruling 1 |
| **Split** | the quarter-side corner pressed, the cloud corner off | Cover 6 | the corners trade jobs at the snap | approved — ADR-070 ruling 1 |
| **Show 4** | the corners off and deep: a quarters look | Cover 2 (Tampa 2 included), Cover 6 | the flat looks empty, and a corner squats on it at the snap | **new** — the owner's word |
| **Stem** | the line in one front, shifting to another at the snap | — | the front shown is not the front played | step 3 — ADR-069 Phase 3's DL stem |
| **Mug** | backers walked up into the gaps as if to blitz, dropping at the snap | — | pressure shown, coverage played | step 3 — ADR-069 Phase 3's Cover 0 mug |

- **Show 2 is already worn over blitzes.** Phase 1 lays it over Fire Zone and over the Cover 1 family,
  which holds three blitz calls (Double A, Base Run Blitz, Dime Man Pressure). The owner's "apply
  Show 2 to a blitz" is live today; what is new is saying so in the call's name.
- **Show 4 tells Phase 1's lie** — a hole that fills at the snap — so its main effect needs nothing
  the engine does not already resolve. It is refused over press man: a corner showing eight yards off
  cannot press at the snap, and a look may not change the technique he plays.
  `CHOSEN — a football judgement, the owner's to correct.`
- **Mug is a front today and a look at step 3.** As a front ("Nickel Mug", "Dime Mug") it is the
  name of three pressure calls' alignment (Double A, Cover 0, Dime Man Pressure). As a look it is the
  bluff. The place in the call tells them apart: second is the front, last is the look.
- **Stem and Mug enter the catalogue with the field that states them** — a shown rush, which the call
  does not have yet. Until then a word whose change nothing could carry would be a declaration
  nothing checks.

### Pressures

| tag | who comes | checked against the call | today's calls |
|---|---|---|---|
| **Fire** | backers | backers rush, not all through the A gaps; no corner rushes; deep help kept | Fire Zone (over Cover 3: an end drops); Base Run Blitz (over Cover 1, from the Bear front) |
| **Double A** | both backers through the A gaps | two backers rush, both through A gaps; no corner rushes; deep help kept. The owner's own word, from ADR-069's "Nickel Odd Double A" | Double A Blitz (over Cover 1) |
| **Smoke** | a corner — the nickel or the dime | the nickel or the dime rushes | Cover 3 Nickel Pressure (over Cover 3 Sky); Dime Man Pressure (over Cover 1) |
| **Zero** | six, nobody deep | nobody deep (`noDeepHelp`), and someone other than a down lineman rushes | Cover 0 Blitz |

**A call carries a pressure tag if and only if someone other than a down lineman rushes.** That,
not the rusher count, is the rule: the goal-line calls rush five with nobody deep, all of them
linemen, and are vanilla calls. Each of the six pressure calls passes exactly one of the four
checks, and none of the other sixteen has a rusher off the line (COMPUTED).

### Front tags

| tag | what it is | from the stunts | state |
|---|---|---|---|
| **Tex** | the tackle-end twist, match-engine §7.3's +0 row | `T_E` | on Cover 6, Fire Zone, Base Cover 3 |
| **Twist** | tackle-tackle, +10 | `T_T` | on Dime Quarters |
| **Delay** | the delayed twist, +15 | `DELAYED` | on Base Cover 2 |
| **Triple** | the triple exchange, +25 | `TRIPLE` | on Tampa 2 |
| **Pinch** | the line slants inside | — | step 3 — the line has no slant to state it with yet |

The four line-game words are mine; §7.3 names the rows "T/E twist", "T/T (tackle twist)", "Delayed
twist", "Triple exchange". `CHOSEN — provenance NONE.` They are **derived** from the stunts the call
already carries, through a total table from `StuntComplexity` to the word, so a card cannot name a
line game it does not play. A call whose stunts disagree on complexity is refused; none does (Tampa
2's two stunts are both `TRIPLE`).

## 5. Today's 22 calls, said this way

| card today | spoken under this ADR |
|---|---|
| Cover 3 Sky | Nickel Over, Cover 3 Sky |
| Cover 3 Buzz | Nickel Over, Cover 3 Buzz |
| Cover 3 Nickel Pressure | Nickel Over, **Smoke**, Cover 3 Sky |
| Cover 2 | Nickel Even, Cover 2 |
| Tampa 2 | Nickel Even **Triple**, Tampa 2 |
| Quarters | Nickel Over, Quarters |
| Cover 6 | Nickel Over **Tex**, Cover 6 |
| Cover 1 Man Free | Nickel Over, Cover 1 |
| Cover 1 Rat | Nickel Even, Cover 1 Rat |
| Cover 2 Man | Nickel Even, Cover 2 Man |
| Fire Zone | Nickel Over **Tex**, **Fire**, Cover 3 |
| Double A Blitz | Nickel Mug, **Double A**, Cover 1 |
| Cover 0 Blitz | Nickel Mug, **Zero**, Cover 0 |
| Base Cover 3 | Base Over **Tex**, Cover 3 |
| Base Cover 1 | Base Under, Cover 1 |
| Base Cover 2 | Base Over **Delay**, Cover 2 |
| Base Run Blitz | Base Bear, **Fire**, Cover 1 |
| Dime Quarters | Dime Even **Twist**, Quarters |
| Dime Man Pressure | Dime Mug, **Smoke**, Cover 1 |
| Prevent | Dime Prevent, Prevent |
| Goal Line Man | Goal Line 5-3, Man |
| Goal Line Zone | Goal Line 5-3, Zone |

Any of them can then wear a look: "Nickel Over Tex, Fire, Cover 3, **Show 2**".

**Two findings from building this table** (COMPUTED from `DEFENSIVE_CARDS`):

- **A front's name carries nothing yet.** 17 of the 22 calls put the tackles in the A gaps and the
  ends in the C gaps whatever the front is called: Over, Even, Under, Bear and Mug alike. Only Double
  A (tackles bumped out to the B gaps), Fire Zone (an end drops), Prevent (a tackle drops) and the
  goal-line calls (five down) differ. So the front is a name today, and becomes a mechanism when a
  front tag like Pinch or a look like Stem does.
- **Each blitz call is a coverage plus a pressure**, and the pressure moves two to seven men against
  the call it is laid over:

| blitz call | laid over | men moved | what moves |
|---|---|---|---|
| Cover 3 Nickel Pressure | Cover 3 Sky | 2 | the nickel comes off the right edge; the Mike slides from the right hook to the middle hook |
| Fire Zone | Cover 3 Sky | 5 | both backers come through the B gaps; the right end drops into the curl-flat; the nickel moves to the hook and the strong safety to the curl-flat |
| Double A Blitz | Cover 1 | 5 | both backers come through the A gaps; the tackles bump out to the B gaps; the strong safety takes the left #2 the Will had |
| Cover 0 Blitz | Cover 1 | 7 | both backers come through the B gaps; the free safety leaves the post for the back; the strong safety takes the left #2; the corners' fallbacks drop from the deep thirds to the flats; the nickel presses |
| Base Run Blitz | Base Cover 1 | 6 | the Will comes through the B gap and the Sam off the edge; the Mike takes the back; the strong safety takes the tight end; the corners' fallbacks drop to the flats |
| Dime Man Pressure | — | — | the corpus has no dime Cover 1 without the blitz to compare against |

  ⚠ **One wrinkle for step 3 (§7).** Base Run Blitz keeps its post safety but drops each corner's
  fallback (no #1 to his side) from a deep third to the flat. Under §3 rule 3 that would be a pressure
  moving the deep shell, so step 3 must decide whether that fallback belongs to the coverage or to
  the run blitz.

## 6. Contracts

**The petition** (replaces ADR-070 §4's):

```ts
/** The three kinds of tag on a defensive call (ADR-071), by the layer of the call each changes. */
export type DefensiveTagKind = "LOOK" | "PRESSURE" | "FRONT";

/**
 * One tag on a defensive call (ADR-071): a single word that changes one or two position groups and
 * leaves the rest of the call alone. A NAME, NOT THE CHANGE — what it changed is already in
 * `shownAssignments` (a LOOK), `rush` and `assignments` (a PRESSURE) or `stunts` (a FRONT tag).
 */
export interface DefensiveTag {
  readonly kind: DefensiveTagKind;
  /** The catalogue's key: "SHOW_2", "PRESS", "FIRE", "TEX". */
  readonly id: string;
  /** The word the captain says: "Show 2", "Press", "Fire", "Tex". */
  readonly name: string;
}

export interface DefensivePlayCall {
  /** NEW. Who is on the field: "Nickel". The call's first part. */
  readonly personnel: string;
  /** CHANGED. The front alone: "Over" (was "Nickel Over"). */
  readonly front: string;
  /** RENAMED from `name`. The base concept, played after the snap: "Cover 3 Sky". */
  readonly concept: string;
  /** REPLACES `mask`. In the order said: front tags, pressure, looks. Empty ⇒ a vanilla call. */
  readonly tags: readonly DefensiveTag[];
  // stunts, blitzDisguise, coverageDisguise, assignments, rush: unchanged.
  // shownAssignments: unchanged in type. Its doc's "unless the call wears a mask (`mask` above)"
  // reads "unless the call wears a LOOK tag".
}
// REMOVED: CoverageMaskRef (a look is a DefensiveTag of kind LOOK).
```

- **`personnel`, not `package`.** The owner's label is "PERSONNEL / PACKAGE", and `package` is a
  reserved word in strict-mode JavaScript: a field of that name cannot be destructured in a module
  (`const { package } = call` does not parse). Playbook fills it from the card's `personnel` through
  a total `Record<DefensePersonnel, string>` — Base, Nickel, Dime, Goal Line — so a fifth personnel
  group does not compile until it is named.
- **Names stay text, tags get structure.** Personnel, front and concept are names a renderer prints
  and nothing reads, as `front` and `name` are today. Tags carry a kind and an id because calibration
  splits rates by them.
- **`concept`, not `coverage`.** The stream already has a `coverage` field: `PLAY_START.defense.coverage`
  is the MAN / ZONE / MIXED shell the engine derives from the assignments, and calibration sets it
  beside the real charting's man/zone column. A second meaning for the same word on the same payload
  would be read wrongly; the owner's matrix calls this part the base concept.
- **Every tag is derived or checked, never only declared.** A look is worn exactly when
  `shownAssignments` differs from `assignments` (calibration's `shownAssignmentsStream` test already
  holds Phase 1's mask to this on every play). A line-game tag is derived from the stunts (§4). A
  pressure tag is declared on the card and checked against its rushers (§4's check column). The
  checks are playbook validation, beside `noDeepHelp`; contracts carry the types only (contracts.md
  §7), and the call stays inert data (§10). *(2026-10-23, ADR-073 step 3.5.)* From caller v7 the sentence "A look is worn exactly when `shownAssignments` differs from `assignments`" holds for coverage looks only. A front look (the Mug or the Stem, a `LOOK` tag with id `MUG` or `STEM`, ADR-073 §2.5) leaves `shownAssignments` untouched and changes `shownRush` instead, so a call can wear a look while `shownAssignments` equals `assignments`. `shownAssignmentsStream` now holds each kind to its own diff: a coverage look to `shownAssignments` differing from `assignments`, a front look to `shownRush` differing from `rush` (`shownAssignmentsStream.test.ts:34-42`). Nothing else here changes.
- **Nothing the engine resolves changes.** The engine reads `assignments`, `shownAssignments`, `rush`
  and `stunts`, as now. The tags are how the call says what produced them.

**Not contracts, but changing shape:**

- **`PLAY_START.defense`** (the engine's payload; `unknown` in contracts, ADR-010). **`call` keeps
  its key** and now echoes `concept`; `personnel` and `tags` (`[]` when none) are added; `front`
  becomes the front alone; `mask` is removed; the derived `coverage` shell is untouched. Keeping
  `call` matters because the §17 renderer reads `defense["call"]` with a `"?"` fallback: a renamed
  key would print "?" on every play and fail nothing.
- **Every reader of `mask` moves in the same step.** Most read the payload untyped, so a missed one
  reads `undefined` instead of failing to compile: `calibration/src/metrics/collect.ts` (its payload
  type, and the `disguise_mask_mix` key), `calibration/test/shownAssignmentsStream.test.ts`,
  `metrics.test.ts` and `caller.test.ts`, `engine/test/statline.test.ts`, and
  `playbook/test/masks.test.ts`; `tier1.ts`'s metric description names the field too. The renderer
  prints `personnel` before `front`. The gate is `pnpm -r --no-bail typecheck` and the full test
  run.
- `disguise_mask_mix` keys by the look tags worn (`SHOW_2+PRESS`); a pressure mix is possible on the
  same pattern, and is not proposed here.
- The anticipating caller's `sameFrontLabel` compares personnel and front together, so its meaning
  does not change.
- The engine's own six built-in calls (`engine/src/game/playbook.ts`) are re-said the same way.

## 7. Build order

| step | what | changes play? | when |
|---|---|---|---|
| **1** | **The shape.** §6's contracts change; every call states its parts and tags; pressure tags declared and checked, line-game tags derived; Phase 1's three masks re-said as Show 2 and Show 1. **No new decision, no new draw.** | **No.** The test is that caller v3 reproduces arm B (ADR-070 §9: ADR-069 §11's run with the belief rule in) exactly, number for number | now |
| **2** | **The corner looks** — Press, Split, Show 4 — under ADR-070 §3's belief rule, which is built and was measured alone first (ADR-070 §9) | yes — caller v4, priced as ADR-070 §5 lays out, with Show 4 as its own arm | next |
| **3** | **Pressure and front tags drawn on their own.** The caller draws a coverage, then a pressure at the league's blitz rate, then a line game, then the looks — each draw on a named fork of its own beside today's `defense-card` and `defense-mask` (say `defense-pressure`, `defense-line`), so adding one does not move another's dice. Smoke can then come out of Cover 1 as well as Cover 3, and Fire out of any coverage that states how to play behind it. Stem, Mug and Pinch enter with the fields that state them (a shown rush; a slant), with the pressure read | yes — a new caller, three arms (pressure, front, joint) | with ADR-069 Phase 3 |
| **4** | **The call sheet by situation** — 3rd and medium, red zone, two-minute, with concept families inside each — as a coordinator's own sheet; and **the captain's live check**, one tag changed once he sees the formation: a seeded act on the play's own dice, run on the leash, with the called tags and the checked ones both on the stream | yes | once coordinators are people (ADR-069 ruling 4's trait), and after ADR-068 step 2's leash, which the check would run on |

- **ADR-069's ruled order is kept:** Phase 1, then the corner masks (step 2), then the leash, then the
  front masks with the pressure read (step 3).
- **Until step 4, the captain's check is a rule:** a look that cannot be shown against the formation
  is not shown by the man it cannot move — ADR-070 §1's corner with no #1 to his side shows what he
  plays. And each card's `usage` (downs, distance, field region, two-minute) stays the league's
  average call sheet.
- **ADR-069 ruling 5 (front and blitz stay on the card) holds through step 2 and ends at step 3.**
  Step 1 only names them.

---

## Provenance of factual claims — REQUIRED

| claim | provenance |
|---|---|
| The call's order, the three option columns, the tag definition, the live-check example | **REPORTED** — owner, 2026-10-14 |
| "Double A" as a front-and-blitz word | **REPORTED** — owner, ADR-069 §0 ("Nickel Odd Double A") |
| "DL stem" and "Cover 0 mugged" were masks in the owner's catalogue | **REPORTED** — owner, ADR-069 §9 |
| 22 cards; their personnel, fronts, rushers, line games | **COMPUTED** — `DEFENSIVE_CARDS` from built `@ff/playbook`, this session |
| Every card's personnel is a `DefensePersonnel`; its `front` text is the personnel word (or Base's "4-3", or Goal Line's trailing "Goal Line") plus the front | **COMPUTED** — `playbook/src/roles.ts:171`; the cards' `front` strings in `defensiveCards.ts` |
| 17 of 22 calls put the line in the same gaps (A, A, C, C) whatever the front is called | **COMPUTED** — same, grouped by the linemen's gap duties |
| Each blitz call's men moved against its nearest base call (2, 5, 5, 7, 6) | **COMPUTED** — duty-by-duty diff of the pairs in §5's table |
| Each pressure call passes exactly one of §4's four checks; no other call has a rusher off the line; the goal-line calls rush five linemen with nobody deep | **COMPUTED** — `dutyList` over `DEFENSIVE_CARDS`, this session |
| Every stunted call's stunts share one complexity | **COMPUTED** — same |
| Phase 1 lays Two-High over Fire Zone and the Cover 1 family, which holds three blitz calls | **COMPUTED** — `TWO_HIGH.over` in `playbook/src/masks.ts`; card families as above |
| Merging Two-High and the Cover 2 look into Show 2 draws identically | **COMPUTED** — step 1's exact-reproduction run (§10): 1,680 games, every counted number equal to arm B's. Predicted beforehand from `selectCoverageMask`: the two masks' `over` lists are disjoint, so the legal set over every coverage keeps its size, weights and order |
| `package` cannot be destructured in a module | **COMPUTED** — `node --input-type=module`, `const { package } = …` is a SyntaxError; raised by the contracts guardian |
| The renderer reads `defense["call"]` and `defense["front"]` untyped with a `"?"` fallback; six files beyond the engine's own producers read `mask` | **COMPUTED** — `engine/src/debug/renderPlay.ts:918-919`; a search of the workspace for `mask` on the call and the payload |
| The caller's draws sit on named forks (`defense-card`, `defense-mask`, `anticipated-front`) | **COMPUTED** — `calibration/src/caller/frozen.ts` |
| The engine reads `assignments`, `shownAssignments`, `rush` and `stunts`, and not `name` or `front` | **COMPUTED** — `engine/src/sim/passPlay.ts` and `runPlay.ts` echo `name` and `front` into `PLAY_START` and read neither |
| `PLAY_START.defense.coverage` is already the derived MAN / ZONE / MIXED shell | **COMPUTED** — `engine/src/types.ts`, `coverage: CoverageShell`, filled by `coverageShellFor(calls)`; raised by the fantasy advisor's review |
| Line-game words Tex, Twist, Delay, Triple | **CHOSEN — provenance NONE**; the rows are §7.3's |
| Where pressure and line-game tags are said in the call | **CHOSEN — provenance NONE** |
| A tag's kind follows the layer it changes, so Stem and Mug are looks | **CHOSEN** — on the contracts guardian's review |
| Show 4's `over` list, and its refusal over press man | **CHOSEN** — a football judgement |
| A pressure never moves the deep shell, Zero excepted | **CHOSEN** — the reading of "without changing the rest of the play" this ADR proposes |

## Conjoined mechanisms — REQUIRED

- **Step 1 changes no play,** so there is nothing to price; its test is exact reproduction of v3.
- **Step 2** is priced in ADR-070 §5. The belief rule's own arm (B) is done (ADR-070 §9); the corner
  looks are arms C to E, and Show 4 joins as its own arm.
- **Step 3 joins two mechanisms** — pressures drawn on their own, line games drawn on their own — which
  are separately priceable, so three arms.
- **Step 4's two pieces** (the call sheet, the captain's check) are separately priceable and get an ADR
  of their own.

## Implied scope — REQUIRED

- **A human coordinator building a call from parts** — the shape makes it possible; nothing here
  builds the screen. When it is built, the call arrives as a typed request carrying its `authority`
  (COACH), as every decision does (Iron Rule 6), and is logged. `unruled`.
- **Fantasy mode** (fantasy advisor, this design review): nothing here forecloses it. Real-result
  tethering keys on the card's coverage family and rusher count, never on a tag word — the charting
  feeds chart a played coverage family, man or zone, and pressure as a count or an outcome, never
  Fire or Smoke, and never a shown shell, a front or a line game. Steps 2 and 3 change what a seed
  produces, so each bumps the caller version; the per-game version stamp the fantasy gate asks for
  at Phase 4 (FANTASY-GATE-PHASE1 §6) should name it, and from step 4 the sheet used. `unruled`.
- **Hand signals.** The owner offered to explain how the captain turns a call into signals. Signals
  matter to the sim if a player can miss one or the offence can steal them — a communication die per
  tag. `unruled`.
- **The offence's call** fits the same shape (formation, motion, concept, tag). `unruled`.
- **Pinch** needs a slant model the line does not have. `unruled`.
- **Coordinator tendencies** — which tags a coordinator likes — are where ADR-069 ruling 4's trait lands
  (step 4). `unruled`.

## Decision

Approved — §9's rulings, below. Build in §7's order, step 1 first.

---

## 9. Questions for the owner

1. **The call's shape.** A call is said and stored as personnel, front, coverage, then tags, and each
   tag is a look (what is shown), a pressure (who rushes) or a front tag (how the line plays). This
   replaces ADR-070's list of masks as the contracts change. Approve?
2. **The tag rule.** One look per position group; no two pressure or front tags on the same man; a
   look and a pressure may share a man, since one changes what he shows and the other what he plays
   (Show 2 over Fire). A pressure never moves the deep shell, Zero excepted. Yes?
3. **The words.** Looks: Show 2 (Phase 1's two two-high masks), Show 1 (Single-High), Press, Split,
   and a new Show 4 over Cover 2 and Cover 6, with Stem and Mug joining at Phase 3. Pressures: Fire,
   Double A, Smoke and Zero for the six blitz calls. Line games: Tex, Twist, Delay and Triple. Yes, or
   rename any?
4. **The order.** Names first, with nothing playing differently; then the corner looks; then pressure
   and front tags as their own draws, with Phase 3 (which ends ADR-069 ruling 5); then the call sheet
   by situation and the captain's live check, once coordinators and the leash exist. Yes?

### ✅ Rulings *(owner, 2026-10-14)*

The owner's answer: *"Yes to all."*

| # | question | ruling |
|---|---|---|
| 1 | The call's shape: personnel, front, coverage, then tags; each tag a look, a pressure or a front tag. Replaces ADR-070's list of masks as the contracts change | ✅ **YES** — petition approved |
| 2 | The tag rule: one look per position group; no two played tags on one man; a look may sit over a pressure; a pressure never moves the deep shell, Zero excepted | ✅ **YES** |
| 3 | The words: Show 2, Show 1, Press, Split, Show 4 (Stem and Mug at Phase 3); Fire, Double A, Smoke, Zero; Tex, Twist, Delay, Triple | ✅ **YES** |
| 4 | The order: names first; corner looks; pressure and front tags with Phase 3; the call sheet and the captain's check once coordinators and the leash exist | ✅ **YES** |

---

## 10. Step 1, built *(2026-10-14)*

Every call now says its parts and tags, and nothing plays differently.

- **Contracts (§6, as approved).** `DefensivePlayCall` is `personnel`, `front`, `concept`, `tags`.
  `DefensiveTag` (`kind`, `id`, `name`) and `DefensiveTagKind` replace `CoverageMaskRef`; `name` and
  `mask` are gone.
- **Playbook.** Each of the 22 cards states its front alone, its concept and, on the six blitz
  calls, its pressure word, as §5's table says them. `callTags` derives the line game from the
  stunts and adds the declared pressure; `applyCoverageMask` adds the look last. `validate.ts` holds
  each pressure word to its rushers and its deep help (`D_PRESSURE_WITHOUT_A_RUSHER`,
  `D_PRESSURE_UNNAMED`, `D_PRESSURE_MISNAMED`) and refuses one card's stunts at two complexities
  (`D_STUNT_MIXED_ROWS`). Phase 1's masks are Show 2 and Show 1, in that catalogue order.
- **Engine.** `PLAY_START.defense` carries `personnel` and `tags` beside `front`; `call` keeps its
  key and carries the concept; `mask` is gone. The debug log says the call as a sheet does:
  `Nickel Over Tex, Fire, "Cover 3", Show 2`. The engine's own six fixture calls write their tags
  out, since the engine does not import `@ff/playbook`.
- **Calibration.** `disguise_mask_mix` is keyed by the LOOK tags. The anticipation report's front
  label compares personnel and front together, so it still reads what it read when the front
  carried the personnel word.

**The test (§7): exact reproduction.** Caller v3 on arm B's seeds (`adr-068:step1-arm`, 1,680
games, two shards), against arm B's saved results with Phase 1's ids said the new way (Two-High and
its Cover 2 look are Show 2; Single-High is Show 1): **880 numbers compared, 0 differ.** They are
the dropbacks, attempts, completions, interceptions, yards, sacks and scrimmage plays; the disguised
dropbacks by look; the coverage-read bands; the misread sources; and the splits by look, by
coverage family and by disguise timing. Show 2 was worn on 32,769 disguised dropbacks (Phase 1:
Two-High 27,030 plus the Cover 2 look 5,739) and Show 1 on 13,846.

One fact the build surfaced, already true of Phase 1: over Cover 6, Show 2 moves one corner, not
two. The corner on Cover 6's Cover 2 side already plays the flat the look would show him in. It
bears on step 2, where Split is the Cover 6 look.

| claim | provenance |
|---|---|
| The 880 numbers equal arm B's | **COMPUTED** — paired arm harness (as ADR-070 §9's), `adr-068:step1-arm`, 1,680 games, 2026-10-14 |
| Show 2 moves only the quarters-side corner over Cover 6 | **COMPUTED** — `maskShows(NICKEL_COVER_6, SHOW_2)`; pinned in `playbook/test/masks.test.ts` |

---

## 11. Step 2, built *(2026-10-14)*

The corner looks are worn, alone or beside a safety look, and caller v4 draws them. Nothing changes
in contracts or the engine: `shownAssignments` already carried man assignments, and ADR-070 §3's rule
already reads a shown man.

- **A look can show a man.** `shows` is a zone or a man look (`ShownMan`: whom he shows himself on,
  and how). `instantiateDefense` finds the man in the formation; a corner with no #1 to his side
  shows what he plays (§7's rule until the captain's check). Every formation in the corpus has a #1
  to each side, so Press is always shown.
- **The three looks.** Press over Cover 3, Fire Zone and Quarters; Split over Cover 6 (the quarter
  corner shown pressed, the cloud corner shown at a deep quarter); Show 4 over Cover 2, Tampa 2
  included, and Cover 6 (the corners shown at deep quarters; over Cover 6 only the cloud corner
  moves). Each comes off at the snap: +10, and no timing die (ADR-069 §9.5).
- **One look per position group** (§3). The groups are stated once, in `roles.ts`.
  `legalLookCombinations` lists every set of looks whose moved men fall in different groups, and
  `applyLooks` refuses two looks on one group, a look that moves nobody, and a timing that would
  turn nothing.
- **The draw** (`selectLooks`). One die decides whether, at `COVERAGE_MASK_RATE` (ADR-070 ruling 4);
  a second pick chooses among the legal sets at equal weight (ADR-070 §2); the timing die is rolled
  only when a safety look is worn, and then sets the row. Phase 1's per-look weight is gone: both
  were 1, so equal weight over Phase 1's sets is the same pick.
- **Calibration.** Caller v4 is v3 with all five looks, on the same `defense-mask` address, and is
  the default now, as v3 became at Phase 1. v3 keeps Phase 1's two (`PHASE_1_MASKS`).

The sets a call may wear:

| played rotation | looks |
|---|---|
| Cover 3, Fire Zone | Show 2 · Press · Show 2 + Press |
| Quarters | Show 2 · Show 1 · Press · Show 1 + Press |
| Cover 6 | Show 2 · Show 1 · Split · Show 4 · Show 1 + Split · Show 1 + Show 4 |
| Cover 1 | Show 2 |
| Cover 2, Tampa 2 | Show 1 · Show 4 · Show 1 + Show 4 |
| Cover 2 Man | Show 1 |
| Cover 0, Prevent, goal line | none |

This is ADR-070 §2's table with Show 4 added. Over Cover 6, as over Quarters, Show 2 moves a corner,
so it goes with no corner look.

**v3 is unchanged.** Phase 1's two looks both move the safeties, so they never combine and every
set over them is one look: `selectLooks` rolls every die where Phase 1's draw rolled it, checked die
for die on every card. Caller v3 on arm B's seeds
reproduces arm B again, **880 numbers, 0 differ**. v3 and v4 also disguise the same snaps, because
the first die is the same over either catalogue (checked on every card, and on games in
`calibration/test/caller.test.ts`).

**Measured** in ADR-070 §10: the disguise rate holds at 31.45%; no arm moves completion or
`int_rate` by much more than one standard error; and ADR-070 §5's prediction, that the hidden-man
lie costs completions, is falsified, because the quarterback sees through the look twice as often as
he is fooled by it.

| claim | provenance |
|---|---|
| The sets a call may wear | **COMPUTED** — `legalLookCombinations` over `DEFENSIVE_CARDS`; pinned in `playbook/test/masks.test.ts` |
| Every formation has a #1 to each side | **COMPUTED** — `masks.test.ts` checks each pressed corner's man in every formation of the corpus |
| v3 draws as Phase 1 drew, and reproduces arm B | **COMPUTED** — `masks.test.ts` against Phase 1's draw; the paired arm harness, `adr-068:step1-arm`, 1,680 games, 2026-10-14 |
| A corner look is +10 with no timing; a set takes the safety look's row when it has one | **CHOSEN** — ADR-069 §9.5, ADR-070 §1 |
