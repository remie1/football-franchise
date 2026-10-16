# ADR-073 (DESIGN): The front — the shown rush, the pressure read, and the line's answer

- **Date:** 2026-10-16
- **Proposed by:** Orchestrator, building ADR-069 Phase 3 (= ADR-068 step 3 = ADR-071 step 3) in the
  order ADR-069 §10 ruled
- **Status:** **accepted; 3.0 measured and 3.1 built (§10), 3.2a next.** The owner asked for the draft *(owner, 2026-10-16:
  "yes" to "Should I draft the front design now?")* and ruled all seven of §9's questions as
  recommended *(owner, 2026-10-16, decision cards)*. Every contracts edit in §3 still needs its own
  yes before it is made, and nothing merges without the owner's word. 3.0 re-derives §4.3: the
  informed channel is now expected to raise `sack_rate` through keep-in (§10). The design, the
  rulings and 3.0 merged to main *(owner, 2026-10-16: "Yes, merge" on the decision card)*. 3.1's
  four contracts edits were made on the owner's typed yes naming each *(owner, 2026-10-16: "Yes, make
  contracts edits P1, P2, D1 and D3a for ADR-073 step two.")*.
- **Builds on:** ADR-067 (§D, the rulings on order and the required sentence), ADR-068 (rulings 1–6,
  step 3), ADR-069 (§9.6's Phase 3 row, §10's rulings), ADR-071 (step 3, the words), ADR-072 (the
  ladder, one leash roll, the default of 50), ADR-022 (Petition 1: keeping a man in costs his route
  before the snap, R32). Nothing is reopened.
- **How it was designed:** three independent designs (scoreability first, football first, architecture
  first), scored by three judges (rulings and code, measurability, the owner and the football), then
  one synthesis from the highest-scored design with every judged defect fixed (Appendix A lists the
  disagreements and how each was settled). A plain-words version of §9 is in
  `/mnt/project-files/design/ADR-073-questions-explained.md`.

> ⛔ **THIS WILL MOVE `sack_rate` IN THE WRONG DIRECTION, AND THAT IS CORRECT.** ⚠ **A protection
> that fails when deceived is right even when the metric it touches is already overshooting**
> *(16.5% sim against 6.6% real)*. ⛔ **Read as a regression, it is not one.**
>
> *(ADR-067's ruling: D's ADR states this before any figure. §4 says which population it describes
> under today's caller, where the huddle already guesses the front.)*

**Scope.** One milestone with three names: ADR-069 §9.6's Phase 3 row (*"the shown rush; the pressure
read rolled against it; protection adjustment; a simulated-pressure card; the Cover 0 mask; DL Stem
without false starts"*), ADR-068 §6 step 3 (*"QB+C pressure read made graded and unconditional +
protection adjustment … this is ADR-067 §D"*), and ADR-071 §7 step 3 (*"pressure and front tags drawn
on their own … a new caller, three arms"*).

**Naming.** "D" means ADR-067 §D only: protection answering the shown rush. "E" means ADR-067 §E only:
the coverage read (built: ADR-068 step 1, ADR-070, ADR-072). Arms have word names.

**Citation key.** Short names used below:

| key | path |
|---|---|
| preSnap | `packages/engine/src/sim/preSnap.ts` |
| passPlay | `packages/engine/src/sim/passPlay.ts` |
| runPlay | `packages/engine/src/sim/runPlay.ts` |
| blitz | `packages/engine/src/resolve/blitz.ts` |
| leash | `packages/engine/src/resolve/leash.ts` |
| rushThreat | `packages/engine/src/resolve/rushThreat.ts` |
| tunables | `packages/engine/src/tunables.ts` |
| types | `packages/engine/src/types.ts` |
| playCall | `packages/engine/src/validate/playCall.ts` |
| fixture | `packages/engine/src/game/playbook.ts` |
| simulateGame | `packages/engine/src/game/simulateGame.ts` |
| pressureMetrics | `packages/engine/test/pressureMetrics.test.ts` |
| blitzTest | `packages/engine/test/blitz.test.ts` |
| playcalls | `packages/contracts/src/playcalls.ts` |
| events | `packages/contracts/src/events.ts` |
| rng | `packages/contracts/src/rng.ts` |
| registry | `packages/contracts/src/registry.ts` |
| protection | `packages/playbook/src/protection.ts` |
| passConcepts | `packages/playbook/src/passConcepts.ts` |
| instantiate | `packages/playbook/src/instantiate.ts` |
| masks | `packages/playbook/src/masks.ts` |
| defense | `packages/playbook/src/defense.ts` |
| defCards | `packages/playbook/src/defensiveCards.ts` |
| distribution | `packages/playbook/src/distribution.ts` |
| selection | `packages/playbook/src/selection.ts` |
| validate | `packages/playbook/src/validate.ts` |
| roles | `packages/playbook/src/roles.ts` |
| tags | `packages/playbook/src/tags.ts` |
| frozen | `packages/calibration/src/caller/frozen.ts` |
| anticipate | `packages/calibration/src/caller/anticipate.ts` |
| collect | `packages/calibration/src/metrics/collect.ts` |
| flat, archetype | `packages/calibration/src/league/flat.ts`, `packages/calibration/src/league/archetype.ts` |
| scaleSurface | `packages/calibration/src/knownTruth/scaleSurface.ts` |
| bandTables | `packages/calibration/src/knownTruth/bandTables.ts` |
| docConf | `packages/calibration/src/knownTruth/docConformance.ts` |
| streamTest | `packages/calibration/test/shownAssignmentsStream.test.ts` |
| metricsTest | `packages/calibration/test/metrics.test.ts` |
| spec | `docs/design/match-engine.md` |
| ADR-0xx, FANTASY-GATE-PHASE1, backlog, Charter | `docs/decisions/…`, `docs/decisions/FANTASY-GATE-PHASE1.md`, `docs/decisions/CALIBRATION-BACKLOG.md`, `ARCHITECTURE_CHARTER.md` |
| arms | `/mnt/project-files/arms/` (harness template `adr072Arm.test.ts`, report `adr072-report.md`) |

---

## 0. The design in brief

1. **A shown rush.** `DefensivePlayCall.shownRush` is the same array as `rush` unless a front look is worn (R4). With a call that wears nothing, what is shown is what is played. When a front look is worn, the whole front is drawn as it looks: every down lineman in his stance, including one who will drop.

2. **The pressure read.** The §5.3 roll stays the roll: same die, fork, formula, disguise rows and CheckKind (R7). What changes is the ladder and what it decides:
   - It is graded on §5.1's six bands, with new labels.
   - The bands give four pictures: **TRUE** (sees who is coming), **COUNT** (counts everyone coming or showing it, and cannot tell bluff from blitz), **CALL** (unsure, so he runs it as called) and **LOOK** (buys the look).
   - Each picture says who he treats as coming free (hot routes and keep-in answer them) and where he thinks the strength is (the slide check reads that). A man the look only moves changes where the strength seems to be, never who is answered.
   - It is rolled whenever a played rusher has no blocker named on him (today's trigger). It is also rolled when someone shown coming who is not coming, or a rusher shown elsewhere, has none and the four pictures would lead to different decisions (ADR-005).
   - On an undisguised front, the lower three bands are today's "missed". No blitzer is invented.

3. **What the read decides.**
   - Hot routes, at rung 0 (R16): every `hot` route converts iff the picture answers someone.
   - The centre's point-out: the existing ±10, exactly today's per-snap rule (+10 on every contested pickup when the band is one of the top three, else −10), at rung 0. The no-pointing arm (3.3) prices it.
   - **Protection adjustment**, at **rung 30** (ruled, Q1): check the slide toward the pressure when that changes who is slid, and keep released check-release men in when a man short. Keeping a man in costs his route before the snap (R32).
   - These are chosen by a fixed rule from options the card states. Pairing stays in playbook (ADR-006).
   - The adjustment and the coverage read's decisions share **one leash roll**.

4. **Front looks, each on its own fork:**
   - **Mug:** inside backers walked up into the A gaps, dropping at the snap.
   - **Stem:** the line shown one gap over, legal only where three or more down linemen rush and none drops (§2.5). It changes nobody's answer, only where the slide thinks the strength is.
   - **Creeper:** a four-man simulated pressure. It arrives as a pressure tag when ADR-071 step 3 draws pressures and line games on their own. Under ADR-071 rulings 1 and 4 (R24, R27) a pressure call is a coverage plus a pressure tag, so this is how the Phase 3 row's "simulated-pressure card" (R22) is delivered (Q4).

5. **Build discipline.** The engine work is inert on v4 by construction, because v4 calls state no options and show no lies, and exact reproduction proves it. Each mover is a caller version: v5 (the line answers), v6 (tags drawn on their own, plus the creeper), v7 (the front lies). The default caller moves once, at the end.

---

## 1. Build steps

| Step | What lands | Moves play? | Proof / measurement | Arms | Caller |
|---|---|---|---|---|---|
| **3.0** | Scratch arm harness, populations, replay bench, the v1 − v4 ceiling, backlog 28a's owed experiment, SEs, §4 evaluated and filed | No | Harness output equals ADR-072's L50 shards on every field those shards carry but `seconds`, and its full-accumulator sha256 (canonicalised as arms/slim.py does) equals each shard's `accFullSha256`; v4 reproduces itself | ceiling run only: v1 against v4 on set A | v4 (v1 for the ceiling) |
| **3.1** | Shown rush, identical to the played rush: contracts P1, P2, D1 (the C14 half), D3a; playbook identity; engine echo (with `gap`) and validator; `withRush` for the spread sites; C2, C3 and C15 comment fixes | No | 0 numbers differ over 6,720 games; `shownRush === rush` on every corpus call, every engine fixture and `callDefense()`'s output for every caller version | proof only | v4 |
| **3.2a** | `resolvePreSnap` split into stages | No | Byte-identical stream against 3.1 | proof only | v4 |
| **3.2b** | Six-band read, pictures (each an answer set and a slide set), widened trigger, the point-out unchanged, protection-adjustment machinery, rung 30, one leash roll over both reads; contracts P3, D1 (`shownRush`), D3b, D5, D8 and P2's doc amended; playbook `protectionOptions` | No (on v4) | 0 numbers differ; label map per snap; falsifier unit tests | proof only | v4 |
| **3.3** | v5 states options on every pass call: slide check on SLIDE, released check-release men. Informed channel | Yes | §4.3; R2's sentence opens the report | slide-only, keep-in-only, full, leash-20/30 at D95, no-pointing; proof: v5 with no options ≡ v4 | **v5** |
| **3.4** | ADR-071 step 3: coverage, then pressure, then line game drawn on their own; per-coverage pressure statements, checked; the creeper (the Phase 3 row's simulated-pressure card, as a pressure tag); anticipated draw decomposed (coverage and pressure; no line game) | Yes (mix, by design) | Each host coverage's share and P(five or more) held by construction (asserted to 1e-12); v4 and v5 reproduce by name; §4.4 | pressure, front, joint-no-creeper, joint | **v6** |
| **3.5** | Front looks Mug and Stem; front metrics; stream-test partition; contracts D2, D4, D6, D7 and P2's doc (tense). Deceived channel | Yes | §4.5; R2 scored on the deceived population (owner Q6) | Mug-only, Stem-only, both; proof: front-look rate 0 ≡ v6 | **v7**; default → v7 in the closing commit |

**§9 is ruled** (owner, 2026-10-16: all seven as recommended), so the steps proceed in order. **3.0 is measured** (§10), and it re-derives §4.3. Each step that moves play comes back to the owner with its numbers, and every merge and every contracts edit waits for the owner's own word. 3.2b's rung rows follow Q1(a): one decision at 30.

**Why this order.**
- 3.0 → 3.1 → 3.2 is forced. 3.2 needs the field and the split, and 3.1 needs a baseline to reproduce.
- D lands on honest fronts (3.3) before any look exists. This keeps "the read works" apart from "the mask works" (R1, R3).
- 3.4 comes before 3.5 for three reasons:
  - R20 ends at ADR-071 step 3 (ADR-071:314-315).
  - The creeper becomes a pressure tag rather than a card that would be thrown away later.
  - The Mug is authored once, against the call mix it ships with.

### 3.0 Instrument first (no play change, nothing committed to main)

**Harness.**
- Copy `/mnt/project-files/arms/adr072Arm.test.ts` to `packages/calibration/test/_adr073Arm.test.ts`, run it in shards (`ARM=1`, `ARM_*`), then delete the copy. This is the arms/README pattern.
- Seed sets:
  - **A:** `adr-073:front-arm`, 6,720 games, the ADR-072 reproduction standard (ADR-072:180-181, :350-351).
  - **B:** `adr-073:front-arm-2`, 20,160 games. Aggregate arms run A+B = 26,880 games.

**Bags.** ADR-072's slim `acc` keeps neither sacks nor blitzes. This harness adds:
- sacks, dropbacks, and blitz dropbacks (≥5 rushers, collect:768);
- unaccounted dropbacks (collect:769-770) and hot-converted dropbacks (collect:771-772);
- free-runner origin counts;
- `blitz_recognition` bands, and `coverage_read` count and bands;
- leash rolls and leash held;
- pickups: slid, won, lost;
- completions, attempts, interceptions; targets and receptions by position, and check-release targets and receptions per dropback (3.3 reports them against real-NFL position shares);
- the **exit / sack / conversion triple** with what each arm holds named (Charter:2206-2217; R31).

Bags that read 0 until later steps:
- kept-in men, slide checks wanted and made, PROTECTION_ADJUST wanted and made, pictures;
- snaps whose only coverage lie was on a kept-in man, where no coverage die is thrown (§2.4);
- BROKE-below-30 snaps (§2.4 step 9), in their own bag. A coverage lie is not on the stream, so the bag is read off stream facts: leash below 30, `leash_discipline` BROKE, `protectionAdjustment.made` with `keptIn` non-empty and a `coverage_read` present. That is a superset of the snaps where a coverage die or a coverage want concerned a man then kept in; the engine test (3.2b) separates the exact subset;
- front-look snaps by look and by picture (a front-look snap: `shownRush` differs from `rush` entry by entry on rusher, side, alignment or gap, `move` stripped, under P1's omitted-field rule);
- creeper snaps;
- snaps whose drawn front look the formation made illegal, so the call wore none (3.5).

**Populations.** Each is a pure function of the call, computed with no die:

| name | definition |
|---|---|
| `short` | some played rusher is named by no huddle pairing: today's `unaccounted` (preSnap:238-251) |
| `slideable` | short, a SLIDE scheme, a strict majority of the sided unnamed played rushers on the side away from `slideSide`, and the pool (as in `keepable`) has a body: §2.3 step 2's rule that a check is wanted only if it changes who is slid |
| `keepable` | short, more unnamed played rushers than pool bodies (`declaredAvailable ++ unblockedProtectors`, preSnap:221-226), and a released check-release man with no hot spec whom keeping in leaves the call a route and a `readOrder` entry |
| `mugLegal`, `stemLegal` | §2.5's legality, evaluated on v6's calls when 3.4 lands. `stemLegal` is the Stem's whole rule: three or more down linemen rush and none drops, the call is not Prevent or goal-line, and no shifted lineman lands on a (side, gap) held by another shown rusher |
| `lookOverReal` | a look is legal and the call is `short` |
| `releaseListed` | the call lists a released check-release man with no hot spec. §4.5 scores real pressure separately with and without one |
| `r2Expected` | `lookOverReal` and not `releaseListed`, on a SLIDE call stating `slideCheck`, with every unnamed played rusher on the called `slideSide` and the worn look's ghosts and moved men (sided) a strict majority on the other side. No back can be kept in and the look pulls the slide off the real rusher, so R2's direction is mechanically expected there (Q6(a)) |
| `stemLive` | Stem worn and moved ≠ ∅: an unnamed down lineman whose shown side or alignment differs from his played one, on any scheme. It moves play only on a call stating `slideCheck`, read COUNT or LOOK (§2.5) |

**Analytic band probabilities.** For every snap the harness records them with no die thrown. The read is d100 + QB Awareness÷5 + Centre Awareness÷5 against 50 + disguise (blitz:62-75; tunables:204-213). d100 runs 1–100 (rng:46).

**Replay bench.**
- The snapRng address is a function of game id and play number (frozen:381-383), so game-level arms diverge after a game's first changed outcome.
- The harness records every set-A dropback's game state, caller inputs and play seed (about 594k dropbacks). Each arm then re-simulates every recorded snap alone.
- Every "per snap" claim in §4 is scored on the bench; every aggregate is scored on 26,880-game arms.

**The ceiling** (owed to §4):
- Run caller v1 against v4 on set A (v1 is kept runnable, anticipate:163-166).
- File Δsack and Δpressure as the ceiling on what a correction can recover. The July v1 → v2 figure (+0.12 pp sacks, +1.54 pp pressure, backlog:1275-1284) is the stale anchor.
- §4.3's bounds are provisional until they are re-derived from this measured gap.

**Backlog 28a's owed experiment** (backlog:3087-3092, "one-run and needs no counterfactual"):
- On v4's hot-converted snaps, compare the converted receiver's perceived openness on QB_READ with the effective throw threshold.
- Report the share sitting below it. No tunable moves.
- It names the C8 mechanism before steps 3.4 and 3.5 send different snaps hot.

**Variance.** The binomial SE of an unpaired sack-rate difference, assuming independent dropbacks (sack rate 16.43%, §4's figure; 88.4 dropbacks a game: 2,377,214 / 26,880 in arms/adr072-report.md):
- 26,880 games: about **0.034 pp**.
- 6,720 games: about 0.068 pp.
- The per-game (clustered) SE the harness reports will be at least this.

**Proof that the instrument is the same instrument.** On ADR-072's seeds (`adr-072:leash-arm`, 240 rounds, four shards), the new harness's output equals `adr072-flat-L50-{0..3}.json` on every field those shards carry but `seconds` (wall time) (the bags this harness adds are extra fields the shards lack), and the sha256 of its full accumulator, canonicalised as arms/slim.py does (`json.dumps(sort_keys=True, separators=(",", ":"))`), equals each shard's `accFullSha256`, which is ADR-072 §10's inertness test (arms/README). v4 reproduces itself.

**Filed in 3.0:** the real-NFL position target shares, with a band, for 3.3's check-release guard (§4.3), from a real-side source 3.0 names (NGS receiving rows carry position and targets, `packages/calibration/src/ingest/sources/ngs.ts`:32, :77); and §4's formulas, evaluated into figures before any arm of 3.3 to 3.5 runs, with §4.3's bounds re-derived from the measured v1 − v4 gap.

### 3.1 The shown rush, identical to the played rush

**Contracts:** P1, P2, D1 (its C14 half: `blitzDisguise` and `coverageDisguise`), D3a (§3). The word `shownRush` joins D1's list at 3.2b, when the engine first resolves from it.

**Playbook.** `instantiateDefense` returns `shownRush: rush`, the same array object, beside `shownAssignments: anyShown ? shown : assignments` (instantiate:349). The RUSH case at :274-277 is unchanged.

**Engine fixture.** At each of the six call sites that already alias `shownAssignments` (fixture:441, :471, :496, :539, :575, :622), hoist the rush beside `assignments`, as `const rush: DefensivePlayCall["rush"] = baseRush(defense);` (or the inline array at :540 and :576), and return `rush, shownRush: rush`. Never call `baseRush` twice: it returns a fresh array, and a second call breaks the identity.

**Engine validator** (playCall, beside :126-170, after rule 3's `rushes twice` check at :134-136, so `playCallCoherence.test.ts`:120-122, routed through `withRush`, still fails on /rushes twice/ and not on a shown-twice message):
- every shown rusher is one of the defence's eleven, appearing in `rush` or in `assignments`;
- nobody is shown twice.

It holds no one-spot rule. A Mug's walked-up backer may share a gap with the tackle in front of him; the Stem's one-spot refusal is `applyFrontLook`'s own check (§2.5).

**Engine echo.**
- `PLAY_START.defense.shownRush` on both pass and run payloads (R5, R6). Alignment is resolved by `rushAlignmentFor` (rushThreat:322), as the rush is at preSnap:245; side and gap are carried.
- The played `rush` echo also gains `gap`, so the shown and played echoes can be compared field for field. `resolvedRushAssignment` (rushThreat:359) gains an optional `gap`, absent when the card states none. On pass, `RushPlanCommon` (preSnap:93-98) carries `assignment.gap` from preSnap:241-247 as a required `gap: RunGap | undefined` key, like `side`, so the compiler also finds the stunt code's two plan rebuilds (preSnap:387-397, :422-432), which would otherwise drop it on every stunt snap; `RushMatchup` (passPlay:162) carries it through `buildMatchups` (passPlay:1875-1889) to the echo (passPlay:431-438); on run, the echo passes `r.gap` (runPlay:367-374). The engine's physics still reads no gap.

**Comments only:**
- **C2.** The preSnap:11-14 header says a slide-side rusher is accounted for, and tunables:564-568 repeats it. The code counts him unaccounted when no pairing names him (:238-251). Fix both comments; the measured semantics stay.
- **C3.** rushThreat:339-341 says nothing in the engine reads `side`. The engine's slide does (preSnap:289). Playbook's `claim()` reads the card's side as well (protection:209).
- **C15.** rushThreat:349-357 says `gap` is not threaded through `resolvedRushAssignment`; 3.1 threads it as an echo. Rewrite it: the echo is a stream fact for renderers and diffs, and the engine's physics still reads no gap.

**Pin that moves**, named in the commit: `packages/playbook/test/gapCarryAcross.test.ts`. Its engine-src grep for `.gap` (:102) starts hitting on the echo, so its text is amended to name the echo as a carry, not branch (a)'s reader. The expiry pin itself stands until 3.5 discharges it.

**Tests.**
- Typecheck finds literals, not spreads. `pnpm -r --no-bail typecheck` (backlog 167) lists the literals that must gain `shownRush`: instantiate:323-361; the six fixture sites; the `engine/test/fixtures.ts` literals whose `shownAssignments` sits at :237, :444, :508, :560 and :755 (the inline `rush` arrays at :238 and :756 hoisted to one const, as in the engine fixture, or the identity test fails); the PLAY_START echo types and sites (types:369, :445; passPlay:424; runPlay:363); and `engine/test/statline.test.ts`:259-273 if the payload field is required. Fixture builders that gain `shownRush` are not counted as moved pins (backlog 167 §5).
- A spread that overrides `rush` compiles and silently inherits a stale `shownRush`. Every such site goes through one helper in `engine/test/fixtures.ts`, `withRush(defense, rush) => ({ ...defense, rush, shownRush: rush })`: fixtures.ts:319-327, 836-841, 893-896, 947-950; blitzTest:124-141 (which also rewrites `side` and `alignment` on retained rushers, so the validator alone would not catch it); `resolutionProducts.test.ts`:49-52, 158-161, 185-188, 214-217; `freeRunnerPath.test.ts`:277-281, 340-345; `passPlay.test.ts`:290-294; `unblockedProtector.test.ts`:125; `playCallCoherence.test.ts`:45-48, 120-122, 143-146 (all under `packages/engine/test/`).
- Identity tests assert `call.shownRush === call.rush` (reference identity) on every corpus call, on every engine fixture and hand-built call outside a front-look test, and on `callDefense()`'s output (frozen:537) for every caller version. They land here, so a stale list fails at 3.1 and not inside 3.2b's proof.
- A stream test asserts every PLAY_START carries a `shownRush` equal by rusher, side, alignment and gap to the resolved `rush` (`move` stripped).
- A determinism test checks that the same seed gives the same stream.

**Proof.** 0 numbers differ over set A (6,720 games). The stream differs only by the new fields. Nothing in the engine resolves from `shownRush` before 3.2b; only this step's validator and the PLAY_START echo read it.

### 3.2a The split (byte-identical)

`resolvePreSnap` (preSnap:163-414) splits into stages:
1. accounting, read and hot;
2. pickups and free runners;
3. stunts.

`simulatePassPlay` calls them around the coverage read and the leash, in the order of §2.4.

**Why it is byte-identical against 3.1:**
- Forks are addressed by label (rng:52). The pickup dice are `presnap/pickup` then `${blocker}:pickup` and `${rusher}:blitz` (preSnap:327; blitz:126-136), so moving that work moves no die.
- `buildMatchups`, `buildReceiverTracks` and `buildRecoverySpots` throw no dice (passPlay:1875, :1900, :2146).
- Emission order is unchanged (passPlay:457-460).

### 3.2b The graded read and the line's options (inert on v4)

**What lands:**
- **Tunables:**
  - `presnap.blitzRecognition.bands` becomes six rows with a `picture` column, replacing tunables:219-224 (§2.2);
  - rung `PROTECTION_ADJUST: 30` joins `rungs` (tunables:296), so `PreSnapDecision` gains it (leash:21);
  - the presnap header (tunables:190-202, "the only moment at which recognition changes anything") and the band comment (:214-218, "Only `recognized` is consumed") are rewritten.
- **Engine:** §2.2–§2.4: each picture's answer set and slide set, the trigger, `decideProtection` and the effective call (§2.3), and the order and the one leash roll (§2.4). The point-out is today's rule, unchanged. Validator rules for the options (P3): every `checkRelease` man runs a route in the call, and none is in `available`, is a `protection[].blocker` or is listed twice; `slideCheck` sits only on a SLIDE scheme. The playCall:152-157 comment is amended: by stating the option, the card has made the pre-snap decision. This honours R32 (ADR-022 Petition 1, ADR-022:61-65, ratified at :5 and :378; protection:64-67): the card states the option (`checkRelease`), the decision is made before the snap, it costs the route, and it is gated by the read and the leash; ADR-068 §3's approved menu (ADR-068:86) names it. It is not a resolution-time search.
- **Comments that 3.2b makes false**, rewritten in the same commit:
  - the recognition ones, tunables:568-569, preSnap:18-20, :151 and :254-255, and blitz:11-15, become "rolled when an unnamed rusher exists, or when a front look shows or moves a man and the pictures would decide differently (ADR-073 §2.2)", and :569's hot route is gated on the answer set, not on recognition;
  - tunables:584-590 ("the only place recognition touches the line"): the read now also decides the protection adjustment;
  - the four-label comments, `packages/engine/src/events.ts`:87-88 and blitz:88-89, name the six labels;
  - the `availableBlockers` doc (types:300-311) becomes "declared, then kept-in, then `unblockedProtectors` at the back";
  - the leash comments at tunables:283-285 ("each decision the coverage read can want") and :289-294 ("Both sit at or below 50") name the third rung and the pressure read's want.
- **Playbook:** a pure `protectionOptions(concept, unit, offense)`. It returns `slideCheck: true` on a SLIDE scheme, and `checkRelease`, which is the scheme's `checkRelease` roles not in `pulledIntoProtection` (instantiate:400, :476; protection:164, :266) and running a route, as PlayerIds in card order. It spreads each option conditionally (`exactOptionalPropertyTypes`: never `slideCheck: undefined`). No caller uses it yet.
- **Contracts:** P3, D1 (the word `shownRush`), D3b, D5, D8, and P2's doc amended ("NOTHING IN THE ENGINE READS IT YET": the pressure read consumes it from here).
- **PLAY_START:** the fields in §2.8. `routes` now means the routes as run (kept-in men removed), a meaning change of an existing field.

**Rulings first.** Like every step, 3.2b is built only after §9's rulings. If Q1 is ruled (b) or (c), the rung rows here change accordingly: the `PROTECTION_ADJUST` rung, its docConf rule and the census counts below.

**Why v4 cannot move:**
- `shownRush === rush` on every v4 call, and through 3.1's identity tests and `withRush` on every hand-built engine call, so there are no ghosts and no moved men. The trigger is today's.
- On an honest front TRUE and COUNT answer the extras at their played spots, and CALL and LOOK answer nobody. So "the answer set is non-empty" is today's `recognized` on every rolled snap, because both tables succeed at margin 0 (tunables:220-221 against the new cuts).
- Hot routes are therefore identical per snap, and the ±10 is today's rule exactly: +10 on every contested pickup iff the band is one of the top three, else −10.
- v4 calls state no options, so there is no slide check and no keep-in, `PROTECTION_ADJUST` is never wanted, the wanted set is today's, and with no rung above 50 the leash never rolls at the default.

**Proof.**
- 0 numbers differ over set A.
- For every `blitz_recognition` read, `roll.total` and `target` equal 3.1's. The new label is the six-band label of the same margin: old READ_IT ∪ RECOGNIZED map onto DIAGNOSED ∪ IDENTIFIED ∪ COUNTED, and old MISSED ∪ FOOLED onto UNSURE ∪ MISIDENTIFIED ∪ BUSTED. The map is one-to-many, so the test recomputes each band from `roll.total` against `target`, never from the old label.

**Falsifier unit tests** (engine, on hand-built calls, with seeds chosen to land in each band). Exact reproduction proves nothing about new code, so these cover:
- **Trigger:**
  - honest and short → roll;
  - honest and not short → no roll;
  - a Mug bluff whose call carries a hot route → roll;
  - a Mug bluff on a call with no hot route, no `slideCheck` and no `checkRelease` → **no roll** (ADR-005);
  - a Mug bluff on a SLIDE call with `slideCheck`, no hot route and k = 0 → **no roll**: every played rusher is named, so a checked slide would move nobody (the passPlay:2042-2043 rule).
- Each picture's answer set, slide set and decisions on a Mug over a four-man call and over a five-man call.
- **Moved men:** a call whose `shownRush` shows an unnamed played rusher at another side gives the same answers, hot conversions, ±10 and keep-in count, in every band, as the same call unmoved; only the slide set differs, under COUNT and LOOK. A side or gap stated on one list and omitted on the other, or a gap-only difference, makes nobody moved.
- **Point-out:** +10 on every contested pickup iff the band is one of the top three, else −10, on honest and lying calls alike (tunables:585-591).
- **Perceived pool:** TRUE counts a blocker whose man dropped as free; COUNT and LOOK do not.
- **Keep-in:** the walk takes eligible men in card order while fewer than max(0, |answers| − |perceived pool|) are kept; it skips a man whose keep-in would leave no route or an empty `readOrder`; never a hot-converted man.
- **Slide check:** goes toward a strict majority of the slide set's sided men; no flip on a tie; never on MAN; not wanted unless it would change who is slid (an extra whose played side is the checked side or the called one, and a body in the pool at the snap: declared, kept-in and windfalls).
- **Effective call:** a kept-in man leaves `routes` and `readOrder`, sits in `protectionScheme.available` and `availableBlockers` after the declared men and before the windfalls, and keeps his backfield recovery spot (passPlay:2183-2185).
- **Leash:**
  - at leash 20 with Discipline 95: one roll, HELD, protection as called;
  - at leash 30: the adjustment is made with no roll;
  - on BROKE, the adjustment is made;
  - at leash 20 with low Discipline, a forced BROKE and a keep-in candidate with a coverage lie: K loses route, track and `readOrder` entry (the step-5 tracks filtered, not rebuilt); the coverage die and its PRESNAP_READ stay; the stream says so.
- **Reducer:** on the stream, no target or hot conversion ever names a man in `protectionAdjustment.keptIn` when `made` is true (3.3 asserts the same over every v5 stream); in the engine test, where the lies are visible, a coverage lie or want on a kept-in man occurs only on a BROKE roll at a leash below 30, the 3.0 bag of that name.
- Every UNBLOCKED `rollRef` names an emitted `blitz_recognition`.
- Same seed gives the same stream.

**Pins that move deliberately**, each named in its commit (template: ADR-072 commit 051971e):
- bandTables `RECORDED_CENSUS` (bandTables:541-606): the recognition table goes from 4 to 6 rows and its cells change. A Tier B re-run follows (bandTables:559-561), and `calibration/test/bandTableGate.test.ts`:16's census text moves with it.
- docConf:
  - replacing docConf:592-617: rules for `bands.0`, `.1`, `.3` and `.4` (DOC_DERIVED, docRef "§5.1, applied to §5.3 by ADR-068 §2"), `bands.2` (DOC_DERIVED, §5.3's success/failure split at 0) and `bands.5` (STRUCTURAL, −∞ terminator); this retires the docConf:597 note "only `recognized` is consumed";
  - beside :701/:707, `{ pattern: "presnap.leash.rungs.PROTECTION_ADJUST", provenance: "INTERPRETATION", docRef: "ADR-072 §1 / ADR-073 §2.3", note: "30 — where the slider lets the line check the slide and keep a back in; a football judgement, ruled at ADR-073 Q1" }`;
  - `calibration/test/docConformance.test.ts`: `RECORDED_NUMERIC_CENSUS` 742 → 745 (:190; two more band boundaries plus `rungs.PROTECTION_ADJUST`), `RECORDED_NUMERIC_PATH_DIGEST` re-read off a run (:214), `audit.classifiedNarrow` 250 → 253 (:339).
- blitzTest:929-932, rewritten to the six labels, with "saw" ⇔ a top-three band.
- The scaleSurface `leash_discipline` note: "rungs at 20 and 40" becomes "20, 30 and 40". Its `flat: [1, 20]` holds, because the highest rung is still 40.

**Pins that do not move:**
- `SURFACE`'s `blitz_recognition` row (scaleSurface:234-240) and the length-46 pin: same roll.
- The four-cell `presnap.blitzRecognition.disguise.*` DOC_VERBATIM block (docConf:580-585): no new row.
- The ladderOccupancy snapshot: it derives from `resultTierLadder` and SURFACE's term stacks, and 3.2b changes no CheckKind and no term.
- pressureMetrics, all of it. The fixture is honest and states no options, so `recognitionChecks === blitzes` (:346-351) and the protected ordering at :418-422 stand.

### 3.3 Caller v5: the line answers what it sees (informed channel)

**What lands.**
- `CallerVersion` gains `v5` (anticipate:168, :183).
- `frozen.ts:408`'s exact-match ternary becomes an exhaustive `PROFILE: Record<CallerVersion, CallerProfile>`, so a version without a profile fails to compile instead of wearing no looks.
- After `instantiatePass(concept, offenseUnit, expected)` (frozen:453), v5 applies `protectionOptions`.
- Caller knobs `/no-slide-check` and `/no-keep-in`, in `callerIdentity` (frozen:270-276).
- The `DEFAULT_LEASH` comment (frozen:278-285) is amended: rung 30 now exists below 50, so the default is still unchanged, and leash knobs below 30 close it.

**What it moves.** Pickups and free runners on short snaps, and check-release routes (RB on ten concepts; FB and TE_Y on one concept each, passConcepts:456, :597). Hot conversions and recognition reads are identical per snap until divergence. So are coverage reads, except snaps whose only coverage lie is on a kept-in man, where v5 throws no coverage die (counted, §4.3).

**Arms.** Each runs on the same seeds, over 26,880 games plus the bench, against the comparison its row names (no-pointing against v5, the leash pair L30 against L20, the rest against v4):

| arm | config | isolates |
|---|---|---|
| proof | v5 `/no-slide-check/no-keep-in` | ≡ v4 exactly (the calls are identical) |
| slide-only | v5 `/no-keep-in` | the slide check alone |
| keep-in-only | v5 `/no-slide-check` | keeping a back in alone |
| full | v5 | both; interaction = full − slide-only − keep-in-only |
| leash pair | v5 at leash 20 and at leash 30, on a flat league whose QBs carry Discipline 95 (the arms/adr072Arm.test.ts:31-47 pattern) | rung 30 closed against open, with no leash ever broken (§4.3) |
| no-pointing | v5 with `blitzPickup.recognitionModifier {0, 0}` (tunables:591), named by `tunablesDigest` | against v5: what the ±10 is worth beside real adjustment; its retirement goes back to the owner with these numbers (§7) |

**Held:** the coverage looks (the v4 set), the coverage read and its rungs, leash 50 (except the leash pair), the call mix, ratings, and tunables (except no-pointing).

**Reported:** R2's sentence first; then §4.3; then the triple on `short`, `slideable`, `keepable` and all dropbacks; then guards. Among the guards: check-release targets and receptions per dropback, and position target share, against real-NFL position shares, with a band; and, per arm, the snaps whose only coverage lie was on a kept-in man, with `int_rate` decomposed onto them (R3).

**Gates:** the fantasy-advisor: check-release targets fall (RB; FB and TE_Y on one concept each).

### 3.4 Caller v6: pressures and line games drawn on their own, and the creeper (ADR-071 step 3)

**Lands in playbook.** Coverage cards, pressure specs per coverage and line-game specs, each stated and then checked (ADR-071:83-89):
- The five pressure cards that decompose become pressure-over-coverage specs reproducing ADR-071 §5's table: Smoke and Fire over Cover 3 Sky, Double A over Cover 1, Base Run Blitz over Base Cover 1 (v6's "Fire over Base Cover 1"), and Dime Man Pressure over a **new `DIME_COVER_1`** base card (v6's "Dime Smoke"). ADR-071 notes the corpus has no dime Cover 1 to compare against.
- **`DIME_COVER_1` lives only in v6's coverage catalogue**, with its own usage weight 0 (§2.6), and passes the same corpus validation. `DEFENSIVE_CARDS` and its 22 cards are untouched, so v1–v5 draw exactly as before (selection:68-69). A playbook test asserts `DEFENSIVE_CARDS.length === 22` and that its order is unchanged.
- **Cover 0 Blitz stays a bound card.** Zero moves the deep shell by definition (R25's exception).
- **Base Run Blitz's corners** take the coverage's DEEP_THIRD fallback (defCards:641, :647) instead of FLAT (:725, :731), by R25 ("a pressure never moves the deep shell"). Settled, not asked; the case is unreachable on today's formations (ADR-071:457-458: every formation has a #1 to each side).
- **The creeper** (§2.6; named "Creeper" by the owner, Q4). Under ADR-071 rulings 1 and 4 (R24, R27) a pressure call is a coverage plus a pressure tag, so ADR-069 §9.6's "simulated-pressure card" (R22) is delivered as the creeper tag over Cover 3 Sky. If the owner meant a card of its own, Q4 asks.
- `pressure.test.ts:52-115`'s card-weight marginals stay on `DEFENSIVE_CARDS`, which v1–v5 still draw, and v6 gains caller-rate versions of them.

**Lands in calibration:**
- forks `defense-pressure` and `defense-line`, with children;
- the anticipated draw decomposed into coverage and pressure, with the same personnel (R30), on `anticipated-front/{coverage, pressure}` (+children). It draws no line game: protection reads no stunts and the engine gets the real call's (anticipate:264-266), so an anticipated line game would be a die that turns nothing (ADR-005);
- a knob `/creeper-0`.

**Arms**, against v5 on the same seeds (ADR-071:305, :350-351):

| arm | config |
|---|---|
| pressure | pressures drawn; line games bound (cards keep their stunts; Fire over Sky keeps Fire Zone's Tex) |
| front | line games drawn under §2.6's legality (R25: never on a man the pressure moved or dropped, so none over Double A and none with a blitzer); pressures bound (v5's cards, stunts stripped) |
| joint-no-creeper | both drawn, `/creeper-0` |
| joint (= v6) | both drawn, plus the creeper |

**Proof.** v6 has no arm that switches its new part off and reproduces v5: it redraws the mix by design. Its proofs are that v4 and v5 reproduce by name on the new code (§4.4), and that each host coverage's share and P(five or more) equal v5's card-weight shares by construction (asserted to 1e-12, §2.6). The pressure-by-coverage joint moves by design (backlog 8b); the per-pressure shares and FIRE_ZONE's own row (distribution:179) move with it, and are reported against today's (v5's).

**Held:** D's and E's mechanics; no front looks; the coverage-look code (legality is evaluated over the composed call, "played first, shown second", ADR-071 §3 rule 2).

**Gates:** the fantasy-advisor (pressure-by-coverage joint).

### 3.5 Caller v7: the front lies (deceived channel)

**Playbook:**
- `FrontLookId = "MUG" | "STEM"`, with `legalFrontLooks` and `applyFrontLook` (§2.5). These are kept apart from `applyLooks`, which always stamps `coverageDisguise` (masks:493) and refuses rush looks (masks:474-478; that refusal stays true for coverage looks, and its message points to `applyFrontLook`).
- **Where it applies.** `applyFrontLook(defense: InstantiatedDefense, draw): InstantiatedDefense` is applied to the real `defense` after `instantiateDefense`, inside the concept loop (frozen:436), never to `expected`. The `defense-front` draw is made once, before the loop, on legality evaluated on the called card; an instantiation the drawn look is illegal for wears none (§2.5). `applyFrontLook` writes `shownRush` and appends its LOOK tag, `{kind: "LOOK", id: "MUG" | "STEM", name: "Mug" | "Stem"}`, to `call.tags` after the coverage looks, so the call keeps `callTags`' order (tags:76-82: line game, pressure, then looks). `callTags` itself cannot see a look applied after instantiation.
- **The Stem's one-spot refusal** is `applyFrontLook`'s own check on the shifted linemen against every other shown rusher (§2.5's legality). It is not a `shownRush` validator rule: a Mug's walked-up backer may share a gap with the tackle in front of him.
- `applyFrontLook` reads the rush gap (`RushDuty.gap`, carried by `declaredRush`, instantiate:162-164) for the Stem's positions, so the `declaredRush` doc's "Nothing reads `gap` yet either" (instantiate:158-160) is rewritten in the same commit, as D6 rewrites the contracts one. That discharges `packages/playbook/test/gapCarryAcross.test.ts`'s expiry pin (P1_EXPIRY 2027-02-05) by its branch (a).
- A validator rule (R28): a front LOOK tag is carried iff `shownRush` is not the same array as `rush`, and then the two differ in at least one entry on rusher, side, alignment (resolved) or gap. `move` never counts, and a side or gap stated on one list and omitted on the other is not a difference (P1).
- `defense.ts:94`'s "Never a rush" is reworded: a coverage duty never shows a rush, and a front look writes the shown rush.

**Calibration:**
- v7 with fork `defense-front`, and knobs `/front-0`, `/front-MUG`, `/front-STEM`;
- sim-only `front_look_rate` (dropbacks where `shownRush` differs from `rush` entry by entry on rusher, side, alignment and gap, `move` stripped, under P1's omitted-field rule) and `front_look_mix` (keyed by front LOOK ids);
- `disguisedDropbacksByMask` keyed by **coverage-look ids only** (collect:776-779 joins every LOOK id today; import the ids from `@ff/playbook`, already a dependency: calibration → playbook is ratified, ADR-017:95);
- streamTest:102-118 and metricsTest:447-469 partitioned: a coverage LOOK ⇔ `shownAssignments` differs, and a front LOOK ⇔ `shownRush` differs from `rush` as `front_look_rate` defines it;
- the frozen:401-406 comment rewritten. It said the anticipated card is bare "because a look changes no rusher". Now it is bare because the huddle cannot see the look, and the line reads it.

**Contracts:** D2, D4, D6, D7, and P2's doc in the present tense ("THE SAME ARRAY AS `rush` unless the call wears a front look; a front look is the only writer of a second list"). **Engine:** nothing.

**Pins that move**, each named in its commit:
- gapCarryAcross.test.ts's expiry pin (:76-132) is deleted, as its branch (a) says. The carry-across assertion (:59-74) stays.
- 3.1's identity tests over `callDefense()` and its PLAY_START stream test: for v7 they hold on every call that carries no front LOOK tag. A worn call is checked by the R28 rule above.

**Arms**, against v6 on the same seeds:
- proof: v7 `/front-0` ≡ v6 exactly;
- Mug-only (`/front-MUG`);
- Stem-only (`/front-STEM`);
- v7 (both).

**Closing commit**, the last of 3.5:
- `DEFAULT_CALLER_VERSION` = v7 (anticipate:189);
- the known-truth ladders `dl-passrush-sack-rate` and `ol-passblock-sack-rate` are re-run under the new default;
- baselines are re-recorded;
- the fantasy-advisor gate (interceptions on hot throws into droppers).

---

## 2. Mechanics

### 2.1 The shown rush

**Shape.** `ShownRusher = Pick<RushAssignment, "rusher" | "alignment" | "side" | "gap">`, which is `{rusher, alignment?, side?, gap?}`.
- There is no move. A move is played, never shown, and tells are what a read discovers, not card data (ADR-068:44).
- `Pick` is an allowlist: a field later added to `RushAssignment` stays out of the shown rush until someone chooses to show it, and a rename fails to compile. `Omit` would admit a new field silently, against ADR-068:44.
- It needs a type of its own: a Mug's walked-up backer who drops has no `move`, so reusing `RushAssignment` would force an invented one.
- A `RushAssignment` is assignable to it, also under `exactOptionalPropertyTypes`, so `shownRush = rush` type-checks as the same array.
- Omitted fields mean what they mean on `RushAssignment`; a side or gap stated on one list and omitted on the other is not a difference (P1's doc).

**Field.** `DefensivePlayCall.shownRush: readonly ShownRusher[]`, **required**, mirroring `shownAssignments` (playcalls:518). "Omitted means the same as rush" would be a second way of saying "no look". Required plus identity gives one representation. The compiler finds every literal; spreads are found by the identity tests (step 3.1).

**What it can say:**
- a man shown rushing who drops: he is in `shownRush` and `assignments`, not in `rush`;
- a rusher shown at another side, alignment or gap;
- (later, not produced here) a rusher left out of the shown rush, i.e. hidden.

**What the engine reads.** Rusher ids, `side` and resolved `alignment`. A man is **moved** iff he is an unnamed played rusher (an extra) whose shown side or alignment differs from his played one, under §2.2's comparison rule (`move` never counts; a side stated on one list and omitted on the other is no difference). The engine's physics reads no gap (playcalls:370); 3.1 echoes it on both rush lists, and rewrites rushThreat:349-357's comment to say so (C15), so a gap-only difference rides the stream only. Physics always resolves against `rush` (R10).

**Built from.** `instantiateDefense` gives identity. In v7, `applyFrontLook` writes a second list in one pass, on the real call after `instantiateDefense`, never on the anticipated one (§2.5), differing exactly in the men the look moves. It never touches `shownAssignments` (the same object stays), so on a call with no coverage look `coverageLies` still short-circuits (passPlay:2020) and a front look alone never rolls the coverage read (C11). On a call that also wears a coverage look, the front look can still change which tracks that read sees, through hot conversions and keep-in (§7). This is reported per arm.

### 2.2 The pressure read

**Sets:**
- R = the played rush (`rush`);
- S = the shown rush (`shownRush`);
- N = the rushers some pairing names (`offense.protection`).

**Derived:**
- **extras** = R entries not in N: today's `unaccounted`.
- **ghosts** = S entries whose rusher is not in ids(R) and not in N: shown rushing, unnamed, not coming.
- **moved** = S entries whose rusher is in ids(R) \ N and whose side or alignment differs from his played one: an unnamed real rusher shown elsewhere. So every moved man is also an extra.

**Comparisons** use only rusher, side, alignment (resolved) and gap; `move` never counts. An omitted side or gap on one list against a stated one on the other is not a difference (P1's doc rule). A gap-only difference never makes a man moved.

On an honest front, ghosts = moved = ∅.

**Pictures.** Each picture has two sets:
- an **answer set**: who he treats as coming free, with no blocker named on him. It drives hot conversion and the keep-in count.
- a **slide set**: the sided men he counts for the slide majority, each at the spot he perceives.

| picture | bands | answers: who he believes is coming that no blocker is named on | slide set, placed |
|---|---|---|---|
| **TRUE** | DIAGNOSED, IDENTIFIED | the extras | the extras, where they play |
| **COUNT** | COUNTED | extras ∪ ghosts: he cannot tell bluff from blitz | extras ∪ ghosts, where shown (played, if not shown) |
| **CALL** | UNSURE | nobody: "we've got them", run it as called | nobody |
| **LOOK** | MISIDENTIFIED, BUSTED | ghosts: only what the look is selling; he misses every real extra, moved or not | ghosts ∪ moved, where shown |

- On an honest front, TRUE = COUNT = (the extras, at their played spots) and CALL = LOOK = (nobody). That is exactly today's recognized / not recognized. Not knowing (CALL) and being wrong (LOOK) lead to different plays, as ADR-068 rules (ADR-068:52-59).
- **A moved man never changes who is answered; he changes only where the slide thinks the strength is** (under COUNT and LOOK). Under LOOK he is a real extra the QB misses, as on an honest snap, but the shown strength still pulls the slide. A look that made the quarterback *more* aware of a real rusher would be backwards.
- Both sets ride PLAY_START as `pressurePicture` (`answers`, and the slide set as `placed`; §2.8).

**Bands.** §5.1's cuts, the coverage read's own (tunables:271-278), with new labels. A repo grep finds none of these labels in any other table, which the band gate needs (bandTables:58-80):

| band | margin | picture |
|---|---|---|
| DIAGNOSED | ≥ 30 | TRUE |
| IDENTIFIED | 15 to 29 | TRUE |
| COUNTED | 0 to 14 | COUNT |
| UNSURE | −14 to −1 | CALL |
| MISIDENTIFIED | −29 to −15 | LOOK |
| BUSTED | < −29 | LOOK |

Paired bands act alike until the decision step has more levers. This is the coverage read's own precedent (tunables:263-264).

**Roll.** Unchanged (R7):
- d100 + QB Awareness÷5 + Centre Awareness÷5 against 50 + {STANDARD 0, ZONE_BLITZ 15, DELAYED 20, ZERO 25}, the call's own `blitzDisguise` (blitz:62-75; spec:395-405).
- On fork `presnap/blitzRecognition` (blitz:73).
- One PRESNAP_READ `blitz_recognition`, with actor QB (blitz:84-92).
- The centre's term is present whenever the scheme names him, and every playbook scheme does (protection:157, :300).

**Band shares on the flat league.** Every rating is 60 (calibration/src/league/flat.ts:32), so the margin is d100 − 26 − disguise:

| row | DIAG / IDENT / COUNT / UNSURE / MISID / BUSTED | TRUE / COUNT / CALL / LOOK |
|---|---|---|
| STANDARD | 45 / 15 / 15 / 14 / 11 / 0 | 60 / 15 / 14 / 11 |
| ZONE_BLITZ | 30 / 15 / 15 / 14 / 15 / 11 | 45 / 15 / 14 / 26 |
| DELAYED | 25 / 15 / 15 / 14 / 15 / 16 | 40 / 15 / 14 / 31 |
| ZERO | 20 / 15 / 15 / 14 / 15 / 21 | 35 / 15 / 14 / 36 |

**Trigger ("unconditional", within ADR-005).** Rolled iff **(a)** extras ≠ ∅, which is today's trigger (preSnap:259), **or (b)** ghosts ∪ moved ≠ ∅ and the four pictures would not all lead to the same decisions.
- The decisions are hot conversion, the wanted slide side (under §2.3 step 2's rule that a check is wanted only if it changes who is slid) and the wanted keep-in set.
- They are computed as a pure function before the die.
- Every moved man is an extra, so a snap with a moved man already rolls under (a). (b) adds rolls only on snaps with a ghost and no extra, where a checked slide would move nobody: there it rolls only if hot conversion or keep-in would differ. A Stem shows no ghost (§2.5), so it adds no roll.
- "Unconditional" means the read is no longer conditioned on the played truth alone. It is still never a die that turns nothing.
- Keeping (a) as a sufficient condition keeps the UNBLOCKED `rollRef` contract true (events:170-179): whenever someone is unnamed, the read exists.

### 2.3 What the read decides

| decision | rung | rule |
|---|---|---|
| **Hot routes** | 0, the call's own answer (R16) | Every `hot` route converts iff the picture's answer set is non-empty (`resolveHotRoutes`, preSnap:450-494, keyed by the answer set instead of `recognized`). Converted receivers lead the progression (tunables:240-242). The engine never forces the throw. On COUNT or LOOK over a Mug, the hot goes in against a dropper, resolved against the played coverage (R10). No post-snap belief is added |
| **Point-out** (the centre's Mike ID) | 0 | Exactly today's rule, per snap: `+10` on every contested pickup iff the band is one of the top three (the TRUE or COUNT picture), else `−10`, with the same keys, values and labels (tunables:585-591; blitz:128-131). Contested pickups are always of extras, which TRUE and COUNT answer and CALL and LOOK do not, so this is also what the picture rule gives. It is still INTERPRETATION of §5.3's "protection adjusted": a pre-snap assignment of the body, never an attribute, clock or pairing. This ADR leaves it exactly as it is; the no-pointing arm (3.3) prices it, and §7 records its tension with ADR-068:50-51 and R31 |
| **PROTECTION_ADJUST** | **30** (ruled, Q1) | the slide check and keep-in below, as one decision |

**Options exist only where the card states them** (P3):
- **Slide check:** a SLIDE scheme with `slideCheck` may flip `slideSide`. `claim()` reads `call.kind`, never `slideSide` (protection:208-220), so a flip leaves every pairing valid. A checked slide may face the check-release man's side, which the playbook warns about at authoring (C_SLIDE_TOWARD_THE_OUTLET, validate:447-463); at the snap that is the line's chosen answer.
- **Keep-in:** the listed `checkRelease` men (released, running a route) may block. This honours R32: the card states the option (`checkRelease`), the decision is made before the snap, it costs the route, and it is gated by the read and the leash; ADR-068 §3's approved menu (ADR-068:86) names it. It is not a resolution-time search (ADR-022:61-65; protection:64-67).
- There is **no re-pairing** of a named man (ADR-006). There is **no release** of a man the call kept in: ADR-068's menu is "slide toward pressure, keep the back in" (ADR-068:86; ADR-072:48).

**`decideProtection(picture)`** is deterministic, with no die. It reads the picture's answer set and slide set (§2.2).

1. **Perceived pool.** `declaredAvailable` plus the blockers whose named man the band believes is not rushing:
   - TRUE: not in ids(R). This equals `unblockedProtectors` (preSnap:220-224).
   - COUNT: not in ids(R) ∪ ids(S).
   - LOOK: not in ids(S).

   The QB does not count on a lineman whose man he thinks is coming. On an honest front every picture's pool is the real pool.
2. **Slide** (SLIDE with `slideCheck` only). If a strict majority of the slide set's sided members sit on side m ≠ `slideSide`, he wants the slide checked to m, **but only if it would change who is slid**: some extra (an unnamed PLAYED rusher) who still finds a body has played side m or the called `slideSide`. He finds one iff fewer extras come before him in rush order than the pool at the snap holds (declared, then K from step 3, then the windfalls), since every extra ahead of him, slid or in a contest, takes exactly one body (preSnap:287-297). Otherwise the check is not wanted, as a coverage decision that would move nobody is not wanted (passPlay:2042-2043). A tie or no sided member changes nothing.
3. **Keep-in.** Walk the eligible men in card order and keep each one in while fewer than max(0, |answers| − |perceived pool|) are kept. Skip a man if keeping him in would leave the call no route or an empty `readOrder`. k is the number kept, and K the men kept.
   - "Eligible" means the listed `checkRelease` men, running a route and **not converted hot**. A card that made his route hot chose the throw as his answer, and hot is rung 0 and stands.
   - So k never takes the last route, nor the last `readOrder` entry: that is the state playbook's instantiation refuses ("the whole progression was pulled into protection", instantiate:451-455).
4. PROTECTION_ADJUST is **wanted** iff the slide check is wanted (step 2) or k > 0.

In coaching words: slide to the side with more threats, when that changes who is slid; keep a back in only when a man short; never pay a route for nothing; seeing nothing, run it as called.

**Applied** (only if made):
- The slide side at the snap is the checked side.
- Kept-in men lose their route, `readOrder` entry and track before the snap (protection:60-72).
- The engine builds an effective call: routes and `readOrder` minus K, `protectionScheme.available` = [...declaredAvailable, ...K], and `slideSide` = the side at the snap. It hands that call to the pickup stage and to every downstream consumer, including recovery spots (passPlay:2178-2185), so a kept-in man keeps his backfield spot. PLAY_START echoes its routes as run (§2.8).
- The pool [...declaredAvailable, ...K, ...unblockedProtectors] then falls out of preSnap:226 unchanged: the card's stated men, then its stated alternative, then the windfalls. The echoed `availableBlockers` keeps that order (3.2b). Pickup dice are addressed by blocker, so pool order moves no die.

**Physics, on the played men, unchanged.** Each unnamed played rusher in rush order is slid (his played side equals the slide side at the snap and the pool has a body: uncontested, tunables:720), else picked up in a contest with the ±10, else UNBLOCKED with `rollRef` = the read (preSnap:282-330). Accounting is untouched, so `unaccounted_rusher_rate` stays a fact about the call.

### 2.4 Order inside the pass play, and the one leash roll

1. **Account:** R, S, N; extras, ghosts, moved; `unblockedProtectors`; `declaredAvailable`.
2. **Read**, iff the trigger fires: band, then picture (its answer set and slide set).
3. **Hot routes** from the answer set (rung 0).
4. **`decideProtection`**, which gives the wanted slide check and K. Let K* = K if `PROTECTION_ADJUST` ≤ leash (then it is certain to be made: with no rung above the leash every wanted decision is made, leash:59; otherwise HELD makes every rung at or below the leash and BROKE makes all, leash:71-73), else ∅.
5. **Tracks** = the routes he will run, as far as is known before the leash: post-hot routes minus K*. No dice (passPlay:1900).
6. **`coverageLies(tracks)`**, then the coverage read iff lies exist, then beliefs. This is the passPlay:361-373 code, unchanged.
7. **Wanted** = `decisionsWanted(lies, read, hot)` ∪ {PROTECTION_ADJUST if wanted}. A man certain to be kept in has no track (step 5), so he never enters `lies` and no coverage decision is wanted for him; `decisionsWanted(lies, read, hot)` is called unchanged (passPlay:2045-2058).
8. **One `resolveLeash`** on `presnap/leashDiscipline` (leash:58-73): breach = highest wanted rung above the leash − leash (R14). HELD makes the rungs at or below it.
9. **Apply** what was made, as the effective call (§2.3).
   - If PROTECTION_ADJUST was not made, the protection is run as called, with no new die, no recomputed lie, and the picture and band untouched: the leash governs decisions, not perception (R16).
   - If PROTECTION_ADJUST was made with K ≠ K* (BROKE below leash 30), filter the step-5 track objects to drop K; do not rebuild them, because the beliefs set at passPlay:371-373 ride on them. Drop K's `readOrder` entries. The coverage die and its PRESNAP_READ stay: he was running when it was thrown.
10. **Pickups and free runners** on the effective call, then **stunts** (preSnap:353-398, unchanged), then matchups and recovery spots.
11. **`reorderForCoverageRead(…, made ∩ {WORK_AWAY, WORK_TO})`.** It must not see a protection-only `made`, because its `made.size === 0` exit (passPlay:2086) would then be skipped.
12. **PLAY_START**, then emit `blitz_recognition`, `coverage_read`, `leash_discipline` and the CHECKs, in today's order (passPlay:457-460).

**Where D reaches E's population.** The coverage read's die and every belief about a running receiver are computed before protection is applied.
- Hot conversions reach E as today: lies are formed on post-hot tracks.
- Keep-in reaches E only through the kept-in man: his lie is never formed, so on snaps where it was the only lie no coverage read is rolled. That count is reported per arm (R3, §7).
- At a leash of 30 or more, step 5 withholds every man who will be kept in, so no coverage die is thrown for a man with no route (ADR-005). Below 30, K* = ∅; on a BROKE roll a coverage die, and a coverage want that sizes the breach, may concern a man then kept in. Such a decision moves nobody; the case is accepted rather than recomputed (Appendix A #13) and these snaps are counted in their own bag.
- On v4, K = K* = ∅ and this is today's order exactly.

### 2.5 Front looks (v7)

**Common rules:**
- Drawn after the card and the coverage looks, never on the anticipated card. The huddle cannot see a look; the line reads it (R30).
- **Where it applies.** `applyFrontLook(defense: InstantiatedDefense, draw): InstantiatedDefense` is applied to the real `defense` after `instantiateDefense`, inside the concept loop (frozen:436), never to `expected`. The `defense-front` dice (`/wears`, `/which`, `/stem-side`) are thrown once per snap, before the loop, and their legality is read off the called card (the card after its coverage looks), never off `expected` (3.5). Inside the loop `applyFrontLook` applies the drawn look to each instantiated `defense`; if a formation makes it illegal there (a MAN duty's `ifAbsent` fallback can turn a man into a rusher or a dropper, instantiate:286-298), that call wears no front look, as instantiate already drops a stunt whose man ended in coverage (instantiate:166-175). The dice stay thrown, so no later die moves, and such snaps are counted (3.0).
- **At most one front look per call** (R21), and only if no worn coverage look moves any man it moves (R25). Today's coverage looks move only the safeties and the outside corners (masks:209-310), never LINE or BACKERS, so both rulings hold together (C5). `applyFrontLook` throws on a breach, as `applyLooks` does.
- **The whole front is drawn:** every down lineman in his stance, a dropping one at his run-fit gap and side, with alignment from the gap (A/B INTERIOR, C/D EDGE).
- **Disguise row:** the call's own `blitzDisguise`, never stamped (R7). Over a four-man call, which states none, it is read as STANDARD (preSnap:180), which is §5.3's own row "Standard blitz (LB walked up): +0" (spec:402); Smoke over Sky and Fire over Base Cover 1 state STANDARD too (defCards:169, :744). Over a dropping-end call (Fire over Sky, the creeper) it is ZONE_BLITZ +15 (spec:403). Over Dime Smoke it is DELAYED +20 (defCards:826).
- Illegal over Prevent and goal-line calls, and must move somebody (ADR-005).
- **Draw:** fork `defense-front`, with children `/wears` (at the front-look rate, Q5, thrown only if a look is legal on the called card), `/which` (equal weight, only if both are legal) and `/stem-side` (only for a Stem over a balanced played rush). It never uses `defense-mask`, because a front look in that catalogue would change `legalLookCombinations` (masks:401-426) and so v4's (and v6's) `wears` and `/which` dice (masks:526-530) on every call it is legal over.

**Mug** (BACKERS):
- **Shows:** LB_W and LB_M (in Dime, LB_M only; roles:182-186) walked up as INTERIOR rushers in the A gap on their run-fit side, plus the line in its stance. A walked-up backer may share a gap with the tackle in front of him (`FOUR_MAN_RUSH`'s tackles sit in the A gaps, defCards:76-77): the one-spot refusal is the Stem's own check (below), not a `shownRush` validator rule.
- **Legal iff** at least one walked-up backer drops, or a dropping down lineman is shown. So it is legal over every four-man Nickel/Base/Dime call, over Smoke over Sky and Dime Smoke, over Fire over Sky (Fire Zone's end in his stance), over Fire over Base Cover 1 (the Mike drops to the back, defCards:714-720) and over the creeper.
- **Illegal** over Double A and Zero (the bound Cover 0 Blitz), where it would move nobody.
- **Over the creeper:** six shown, four come. This is ADR-069:299's "Cover 0 (mugged)", front half.

**Stem** (LINE):
- Positions run left to right D, C, B, A | A, B, C, D. Each rushing down lineman is shown one position toward side X (clamped at the ends). Alignment follows the gap.
- X is the side **opposite the played strength** (more played rushers), so the shown strength lies. On a balanced rush, `/stem-side` picks X.
- **Legal iff** three or more down linemen rush and none drops, the call is not Prevent or goal-line, and no shifted lineman lands on a (side, gap) held by another shown rusher. In v6's mix that leaves the four-man calls, Smoke over Sky and Dime Smoke; it excludes Fire over Sky, Double A, Zero, Fire over Base Cover 1 and the creeper.
- **The one-spot refusal** is `applyFrontLook`'s own check on the Stem's shifted linemen against every other shown rusher. `legalFrontLooks` applies the same rule, so a drawn Stem never trips it. It is not a `shownRush` validator rule: a Mug's walked-up backer may share a gap with the tackle in front of him.
- **Thin by construction.** Nobody drops, so a Stem shows no ghost, and it changes nobody's answer: a moved man changes only where the slide thinks the strength is (§2.2). Named linemen keep their blockers; re-identification is ADR-068's step 5 and the false start its step 7 (ADR-068:157-159; ADR-069:300). Its only engine-read effect is the slide set under COUNT and LOOK, through moved men, on SLIDE calls that state `slideCheck`. Every moved man is an extra, so a snap with one already rolls under trigger (a): the Stem adds no roll. Its live population is `stemLive`: Stem worn and moved ≠ ∅, on any scheme (3.0); it moves play only on a call stating `slideCheck`, read COUNT or LOOK. Shipped as ruled (R22).

**Tags:** `{kind: "LOOK", id: "MUG" | "STEM", name: "Mug" | "Stem"}`, appended to `call.tags` after the coverage looks. The renderer tells the Mug look from the "Mug" front name by its place in the call (ADR-071:131-133).

### 2.6 ADR-071 step 3 and the creeper (v6)

**Draw order:**
1. Coverage, on `defense-card`, over the coverage catalogue. Each coverage's draw weight in s is its own weight plus those of the pressure cards it hosts that apply in s (`DIME_COVER_1`'s own weight is 0), so each host coverage's share holds, and so does P(five or more). `DIME_COVER_1` lives only in v6's coverage catalogue: `DEFENSIVE_CARDS` and its 22 cards are untouched, so v1–v5 draw exactly as before (selection:68-69), and a playbook test asserts `DEFENSIVE_CARDS.length === 22` and its order.
2. Pressure, on `defense-pressure`:
   - `/blitz` is thrown only if the coverage can host a five-or-more pressure in s;
   - `/which` among the pressures legal over that coverage, in proportion to the hosted pressure cards' own usage weights in s;
   - `/creeper` only if no five-or-more pressure was drawn and a creeper is legal.
3. Line game, on `defense-line`: `/wears`, then `/which` among legal line games, in proportion to today's complexity weights. A legal line game is a T_E, T_T or DELAYED pair, or a TRIPLE chain of two entries sharing a middle man, each passing `checkStunts` (validate:846-942: both rush, not both EDGE, not self, no man reused outside a chain, chained triple); never a man the pressure dropped (Fire's or the creeper's end); and neither man's played duty set by the call's pressure (R25: no two played tags on one man; in the corpus this forbids every line game over Double A and any pair with a blitzer).
4. Coverage looks, on `defense-mask` (unchanged code).
5. (v7) The front look.

**Rates held by construction.**
- Per situation, the `/blitz` die's rate r_s = (today's decomposable-pressure card weight in s) ÷ (the host-coverage draw weight in s), one r_s shared by every host in s, so P(five-or-more pressure) equals today's card-weight share exactly. Zero stays a bound card and counts on its own.
- What moves by design is the pressure-by-coverage joint (backlog 8b): each host's pressure share becomes r_s rather than its own ratio. The per-pressure shares and FIRE_ZONE's own row (distribution:179) move with it, and are reported against today's.
- The line-game rate is built the same way, with its denominator over the composed calls (coverage and pressure) that can then host a legal line game.
- A playbook test asserts that each host coverage's share and P(five or more) equal today's to 1e-12, and that every r_s ≤ 1, and fails loudly otherwise.
- Situational limits (downs, minDistance, maxDistance) ride the specs as they ride the cards today (defCards:598, :745, :827).

**The creeper over Cover 3 Sky** (built from defCards:96-106):
- **Rushers:** DE_L, DT_L and DT_R from `FOUR_MAN_RUSH` (defCards:74-79), plus LB_W `{kind: RUSH, move: SPEED, alignment: INTERIOR, gap: B, side: LEFT}`.
- **Coverage:** DE_R drops to HOOK_CURL RH (LB_M's hook) with `runFit {gap: C, side: RIGHT}` (as Fire Zone's end, defCards:473), and LB_M slides to HOOK_CURL LH (LB_W's) and keeps `runFit {gap: B, side: RIGHT}`. CB_L, CB_R and S_F stay deep thirds; S_S and CB_N keep the flats.
- `blitzDisguise: ZONE_BLITZ`, §5.3's "zone blitz (dropping lineman)" row (spec:403). A row is required because a backer rushes (D_PRESSURE_WITHOUT_DISGUISE, validate:979-988), and ZONE_BLITZ is allowed because a lineman drops (D_ZONE_BLITZ_WITHOUT_A_DROP, validate:1010-1024).
- A pressure tag, because a non-lineman rushes (R29). Under ADR-071 rulings 1 and 4 (R24, R27) a pressure call is a coverage plus a pressure tag, so ADR-069 §9.6's "simulated-pressure card" (R22) is delivered as the creeper tag over Cover 3 Sky. Its word is Q4. If it gets its own word, the playbook `PressureTagId` and `checkPressure` gain a rule ("four rush, a backer among them, a lineman drops, deep help kept") and FIRE gains "five or more", so the words stay mutually exclusive (validate:1080-1100). No existing card changes.
- Not counted in `blitz_rate` (≥5 rushers, collect:768; `isPressure`, defense:328). Buzz and Base Cover 3 state their creepers in the same form.

**Why this beats a carved card.** Its counterfactual is **the same coverage, bare, on the same snap**: when `/creeper` says no, the call is exactly that coverage.

### 2.7 Caller versions and identity

| version | defence | anticipated (huddle) | protection |
|---|---|---|---|
| v1–v4 | today's behaviour (frozen:408), restated as `PROFILE` rows in 3.3 | unchanged | as called |
| **v5** | as v4 | as v4 | `protectionOptions` stated |
| **v6** | coverage → pressure → line → coverage looks | coverage and pressure decomposed the same way, same personnel (R30); no line game, because protection reads no stunts (anticipate:264-266) | as v5 |
| **v7** | v6, then front looks | as v6; never wears a look | as v5 |

- `callerIdentity` appends off-default knobs (`/no-slide-check`, `/no-keep-in`, `/creeper-0`, `/front-0`, `/front-MUG`, `/front-STEM`, `/leash-N`).
- `BaselineIdentity` carries the measured `tunablesDigest`, so the 3.2b engine change is named even though v4's numbers do not move.
- The fantasy per-game stamp should carry the seed string, the engine commit, the feed version in effect, the tunables digest, the caller identity with its knobs, the registry version and the human inputs (the call with its options, and the leash) (ADR-071:363-365; FANTASY-GATE-PHASE1:233-234; `packages/calibration/src/report/identity.ts`:117 already carries `engineCommit`, which is the whole-tree commit and so pins the playbook corpus too, identity.ts:26-29, :92-94). In a league the knobs are league rules, not dev switches, and the v7 default move is a calibration event a running league must not follow. This is implied scope, `unruled`.
- The calibration caller stays coach-agnostic: league-wide rates, leash 50 (R31).

### 2.8 The stream (no new event, no new CheckKind)

| where | field | meaning |
|---|---|---|
| `PLAY_START.defense` (pass and run) | `shownRush` | resolved like `rush`; gap carried |
| `PLAY_START.defense` | `rush` | gains `gap`: an echo for renderers and diffs (3.1, C15); the engine's physics reads no gap |
| `PLAY_START.defense` | `unaccountedRushers` | unchanged: a fact about the call |
| `PLAY_START.offense` | `protectionScheme` (new) | the call's `ProtectionCall` as called: kind, slideSide, center, available, slideCheck, checkRelease |
| `PLAY_START.offense` | `pressurePicture?` | `{picture: TRUE \| COUNT \| CALL \| LOOK, answers: PlayerId[], placed: {rusher, side?, alignment}[]}`: the answer set, and the slide set at its perceived spots (§2.2); present iff the read rolled |
| `PLAY_START.offense` | `protectionAdjustment?` | `{slideSide?, keptIn: PlayerId[], made: boolean}`, present iff wanted (a slide check only when it would change who is slid, §2.3); `slideSide` and `keptIn` are what he wanted and were done iff `made`, so a leash that held the adjustment back leaves `keptIn` listed and those men on `routes` |
| `PLAY_START.offense` | `routes`, `readOrder`, `availableBlockers` | as run at the snap: kept-in men removed from `routes` and `readOrder`, and added to the pool, which runs declared, then kept-in, then `unblockedProtectors` at the back |
| PRESNAP_READ `blitz_recognition` | `band` | the six labels |
| PRESNAP_READ `leash_discipline` | — | may now be caused by PROTECTION_ADJUST |
| CHECK `blitz_pickup` | modifier line | unchanged: today's labels and today's per-snap rule (+10 iff the band is one of the top three, else −10) |

**`routes` changes meaning.** It already holds the routes he ran, hot conversions included (passPlay:401-403). It now also drops the kept-in men, so it is no longer every route the card called. Statline and route-participation reducers read it as run and use `protectionAdjustment.keptIn` only when `made` is true, for the men whose called route was given up.

**Stored games.** A save holds no event stream (`packages/contracts/src/save.ts`:7: determinism regenerates a game from its seed and inputs), so this binds a stream kept outside a save (a replay, a calibration shard, an archive of played games) and a game regenerated on later code, which carries the new fields. An absent `shownRush` means `rush`. An absent `protectionAdjustment` means not wanted. An absent `pressurePicture` means no picture was recorded: on a snap from 3.2b on, the read did not roll; on a game stored before 3.2b, the `blitz_recognition` PRESNAP_READ is the record of whether it rolled. A consumer recomputes a band from `roll.total` against `target`, never by mapping an old four-row label: the map is one-to-many (3.2b).

PLAY_START's payload is engine-owned (`unknown`, events:229), so none of the PLAY_START fields is a petition (the PRESNAP_READ `band` row is a comment edit, D5 in §3). That holds while calibration is its only reader outside the engine (the engine's own statline, statline.ts:179-210, and debug renderer read it too); once `apps/game` renders these fields, the payload needs a typed contracts shape (a trigger recorded in §3, not petitioned now). A renderer can say: "C points the Will; slide checked left; RB kept in; leash held."

### 2.9 Dice ledger

| fork | thrown when | step |
|---|---|---|
| `presnap/blitzRecognition` | §2.2 trigger | existing; widened in 3.2b (identical on honest fronts) |
| `presnap/pickup` → `${blocker}:pickup`, `${rusher}:blitz` | each contested pickup | existing; a kept-in man is a pool body, so keep-in adds contests (from 3.3) |
| `presnap/coverageRead` (resolve/coverageRead.ts:39) | lies exist on the tracks he will run | existing |
| `presnap/leashDiscipline` | a wanted rung above the leash | existing; PROTECTION_ADJUST may now be among the wants |
| `presnap/stunt` | each line game | existing |
| `defense-pressure/{blitz, which, creeper}` | v6+, as §2.6 | 3.4 |
| `defense-line/{wears, which}` | v6+, among legal line games (§2.6) | 3.4 |
| `anticipated-front/{coverage, pressure}` (+children) | v6+; no line game, because protection reads no stunts (anticipate:264-266); the v2–v5 path is untouched | 3.4 |
| `defense-front/{wears, which, stem-side}` | v7+, as §2.5 | 3.5 |

The engine adds no fork. It throws existing dice on more snaps (trigger (b), a PROTECTION_ADJUST breach, kept-in pickups); a slide check, a keep-in and a picture follow from the one existing read.

---

## 3. The contracts petition

The Orchestrator writes these; `.claude/settings.json` denies Edit and Write on `packages/contracts/**`. Each commit cites ADR-073 (`.githooks/commit-msg`), and each lands with its producer (ADR-072:211-213).

| # | file:line | exact change | step |
|---|---|---|---|
| **P1** | playcalls, after `RushAssignment` (:339-384) | `export type ShownRusher = Pick<RushAssignment, "rusher" \| "alignment" \| "side" \| "gap">;` Doc: *"A man as the defence SHOWS him rushing before the snap (ADR-073). No `move`: a move is played, never shown; what a stance gives away is a read, not card data (ADR-068 §1). Omitted fields mean what they mean on `RushAssignment`; a side or gap stated on one list and omitted on the other is not a difference. Every `RushAssignment` is one."* | 3.1 |
| **P2** | playcalls, `DefensivePlayCall`, after `rush` (:519) | `readonly shownRush: readonly ShownRusher[];` Doc: *"What the offence SEES of the rush, as against `rush`, which resolves (ADR-073). THE SAME ARRAY AS `rush` on every call built today (identity by construction); a front look (ADR-073 step 3.5) will be the only writer of a second list. NOTHING IN THE ENGINE READS IT YET beyond validating it and echoing it on PLAY_START; the pressure read consumes it from 3.2b. Physics never reads it."* At 3.2b the "NOTHING … READS IT YET" sentence becomes: *"READ BY THE PRESSURE READ (ADR-073 step 3.2b), beside the validator and the PLAY_START echo: the offence's picture is judged against this list."* At 3.5, when a front look first writes a second list, the "THE SAME ARRAY" sentence moves to the present tense: *"THE SAME ARRAY AS `rush` unless the call wears a front look; a front look is the only writer of a second list."* | 3.1; the "NOTHING … READS IT YET" sentence amended at 3.2b; the tense at 3.5 |
| **P3** | playcalls, `ProtectionCall` (:99-114) | On both arms: `readonly checkRelease?: readonly PlayerId[];`. On the SLIDE arm: `readonly slideCheck?: true;`. Docs: *checkRelease:* "Check-release men who RELEASED — running a route in this call — whom the line may keep in to block before the snap, in the card's order (ADR-073). Each listed man is in `routes`; the list is disjoint from `available` and from every `protection[].blocker` (the engine validator refuses otherwise). It is not playbook's `ProtectionScheme.checkRelease`, a list of roles that includes men later pulled into protection: it is what is left of that list, by PlayerId. Omitted ⇒ nobody may be kept in." *slideCheck:* "The line may check the slide to the other side before the snap, toward the pressure it reads (ADR-073). Omitted ⇒ the slide is run as called." `slideSide` (:111) adds: "The huddle's slide; with `slideCheck` the line may check it before the snap, and the engine reports a check on the stream." | 3.2b |
| **D1** | playcalls:459-463 | At 3.1, "What the engine resolves is `assignments`, `shownAssignments`, `rush` and `stunts`" becomes "… `assignments`, `shownAssignments`, `rush`, `stunts`, `blitzDisguise` and `coverageDisguise`" (fixes C14). At 3.2b, when the engine first resolves from it, `shownRush` joins the list after `rush`. | 3.1 (the C14 half); 3.2b (`shownRush`) |
| **D2** | playcalls:497-502 | "UNLESS THE CALL WEARS A LOOK TAG" becomes "UNLESS THE CALL WEARS A COVERAGE LOOK"; "A call that wears a look" becomes "A call that wears a coverage look". Add: "A front look (Stem, Mug; ADR-073) changes `shownRush` and leaves this the same array." | 3.5 |
| **D3a** | playcalls:508 | After "Being deceived requires two." add: "For the rush, the two are `rush` and `shownRush` (ADR-073)." | 3.1 |
| **D3b** | playcalls:506-507 | "a rush that is already fixed and that protection has already paired against" becomes "a rush that is already fixed, that the offence's protection was paired against before the snap (against the real rush or a caller's anticipation of it, ADR-024), and that the line may adjust to when the call states the option (ADR-073)" (fixes C1's stale premise) | 3.2b |
| **D4** | playcalls:426-438 (`DefensiveTagKind`) | The LOOK line becomes: "only what the offence is shown — `shownAssignments` (a coverage look) or `shownRush` (a front look: Stem, Mug). Never what is played." The line's tail stays: the "(ADR-069 ruling 1)" citation and the examples. | 3.5 |
| **D5** | events:232-233 | "§5.3's four-row result table" becomes "the read's own band label (a free string, ADR-011): §5.1's six-band ladder for `coverage_read` and `blitz_recognition` (ADR-068 §2, ADR-073); HELD / BROKE for `leash_discipline` (ADR-072)". The rest of the sentence stays ("same reasoning as ADR-011 gave `CHECK.band`: a re-derived band desyncs silently …"). | 3.2b |
| **D6** | playcalls:370 (`RushAssignment.gap`) | "NOTHING READS IT YET, AND THAT IS THE POINT OF LANDING IT." becomes "ITS FIRST READER IS THE FRONT LOOK (ADR-073), which places the shown line by it; the engine only echoes it." Add: "A front look may show a different gap in `shownRush`; the engine's physics reads neither, and PLAY_START echoes both (ADR-073)." | 3.5 |
| **D7** | playcalls:445-447 (`DefensiveTag`) | "`shownAssignments` for a LOOK" becomes "`shownAssignments` for a coverage LOOK, `shownRush` for a front LOOK" | 3.5 |
| **D8** | playcalls:79 (`hot`) | "if the offence recognises pressure" becomes "if the offence's pressure read pictures pressure, truly or not (ADR-073 §2.3)" | 3.2b |

**By step:** 3.1 = P1, P2, D1 (the C14 half), D3a; 3.2b = P3, D1 (`shownRush`), D3b, D5, D8 and P2's doc amendment; 3.5 = D2, D4, D6, D7 and P2's doc (tense).

**Notes on P1 and P3:**
- **Why `Pick` (P1).** It is an allowlist: a field later added to `RushAssignment` stays out of the shown rush unless someone chooses to show it (tells stay out of card data, ADR-068:44), and a rename fails to compile. `Omit` would admit the new field silently. `RushAssignment` stays assignable to it, also under `exactOptionalPropertyTypes`. It needs a type of its own because a Mug's walked-up backer who drops has no `move`, so reusing `RushAssignment` would force an invented one.
- **Why `slideCheck?: true` (P3).** True or absent, so there is no second way to say "not checked". This is a deliberate deviation from flags such as `pulling?: boolean` (playcalls:222).
- **Producers spread each option conditionally.** With `exactOptionalPropertyTypes` on, `slideCheck: undefined` does not compile.

**Not petitioned, and why:**
- **CheckKind:** same roll, so `SURFACE` and its 46 pin stand.
- **PRESNAP_READ reshape:** one actor; the centre is a term in the roll.
- **`BlitzDisguise` member:** R7.
- **Registry:** §5.3's Awareness serves. Kept-in backs' `passBlock` is a latent registry petition, the attributes pipeline's, and is not filed. The registry lists `passBlock` for OL, TE and FB only (registry:83), so a back blocks at `getAttr`'s fallback of 50 on a roster that omits it for backs; every arm here runs a flat or archetype league, where every player carries every active attribute at 60 (§7).
- **Authority tag:** the options ride inside the COACH-authored CALL_PLAY, so no new tag (CLAUDE.md Iron Rule 6).
- **`ThreatOrigin`:** the UNBLOCKED `rollRef` stays true, because whenever someone is unnamed the read exists.
- **New events:** R5.
- **A typed PLAY_START payload:** not yet. The payload is `unknown` and engine-owned (events:229) while calibration is its only reader outside the engine, and calibration restates the shape locally (collect:463-482). Once `apps/game` reads these fields (§2.8's renderer), it needs a typed payload in contracts, because `apps/game` depends only on `@ff/contracts` (CLAUDE.md Iron Rule 1). Recorded as a trigger; no petition now.
- **Save format:** no change and no schema bump; a save holds no calls or events.
- **`RunPlayCall`:** no run-side read.
- **Engine-owned or playbook-owned:** PLAY_START fields, tag ids, tunables, forks, versions.

---

## 4. Predictions (filed in 3.0, before any arm)

> **THIS WILL MOVE `sack_rate` IN THE WRONG DIRECTION, AND THAT IS CORRECT. A protection that fails when deceived is right even when the metric it touches is already overshooting (16.5% sim against 6.6% real). Read as a regression, it is not one.**

**Which population the sentence describes under today's caller (C1).**
- Since v2 the offence is instantiated against the **anticipated** bare card (frozen:425, :444-453), so the huddle's protection is already wrong about the rush on about a quarter of dropbacks (`unaccounted_rusher_rate` 26.125% at v2; backlog 21).
- Letting the line read the real front on honest snaps therefore **corrects** a guessed protection, in expectation, and sacks go down there. (Where the pool is shorter than the extras, a checked slide can move the only body from a slid man to a contested one; that takes three or more extras.)
- Otherwise only a lie makes the adjustment go wrong. So R2's direction is expected only on the **deceived** population, and there mechanically only where no back can be kept in and the look pulls the slide off the real rusher (`r2Expected`, §4.5). The aggregate direction is decided by which channel is larger.
- **The magnitude anchor.** A correction cannot recover more than today's v1 − v4 gap, which 3.0 measures (caller v1 is still runnable, anticipate:163-166). The July v1 → v2 figure, going from perfect protection to guessed protection (+0.12 pp sacks, +1.54 pp pressure, backlog:1275-1284, measured in July on an older engine), is the stale anchor.

**Figures in use:**
- `sack_rate`: 16.43% sim (v3/v4 flat, ADR-070:299) against 6.560% real (FAIL, known).
- `blitz_rate`: 23.923% real.
- SE: the binomial SE of an unpaired sack-rate difference, assuming independent dropbacks: about 0.034 pp at 26,880 games and 0.068 pp at 6,720. The per-game (clustered) SE the harness reports will be at least this.

### 4.1 The two-channel `sack_rate` prediction

| channel | step | population | mechanism | sign |
|---|---|---|---|---|
| **Informed** | 3.3 | short honest snaps, reads TRUE or COUNT | slide checked toward the unnamed (contested → slid); a back kept in when short (free → contested) | **down**, in expectation |
| **Creeper** | 3.4 | creeper snaps | the backer is unnamed against a four-man guess; DE_R's blocker freed, a contested pickup instead of a named rep | up; size ≈ creeper share × short-snap effect |
| **Deceived, bluff** | 3.5 | front look shows more than come, no real unnamed rusher | hot into droppers; a route lost to keep-in. No slide check: with every played rusher named it would move nobody (§2.3 step 2). No protection can fail: there is no unnamed real rusher, and ADR-026 returns idle blockers to the pool (preSnap:220-227) | **set by 28a**: up if 3.0 confirms the filter, otherwise undetermined |
| **Deceived, real pressure** | 3.5 | front look over a real unnamed rusher, read COUNT or LOOK | slide checked toward the bluff (slid → contested: up); COUNT and LOOK keep backs in against ghosts (free → contested: down); LOOK converts hot where undisguised it did not (backlog 28a: up) | **undetermined**; up only where no eligible `checkRelease` man is listed. This is R2's population |
| **Deceived, Stem** | 3.5 | `stemLive` on calls stating `slideCheck`, read COUNT or LOOK | slide set toward the shown strength (slid → contested) | up; tiny population |

**Aggregate, whole ADR (v7 against v4):** the sum of the channels above. Most likely **down** or within noise, because the informed channel is larger: it acts on every `short` dropback, about a quarter of them, while the creeper and deceived channels act only on their own, far smaller populations (rates at Q5), and the real-pressure channel's own sign is undetermined. That is why owner question Q6 exists, and why every claim below is scored on its population.

**Pre-commitment.** If R2's direction fails on the deceived real-pressure population, the ADR records the failure and its cause. It is not re-labelled.

### 4.2 3.0, 3.1 and 3.2

- 0 numbers differ (3.0's v1 ceiling run aside, which is a measurement, not a reproduction).
- 3.1's identity tests hold: `shownRush === rush` on every corpus call, every engine fixture and `callDefense()`'s output for every caller version.
- 3.2a is byte-identical to 3.1.
- 3.2b maps labels per snap as 3.2b states, each band recomputed from `roll.total` against `target`.
- pressureMetrics passes untouched.
- blitzTest:513-591 stays pinned, not flipped (C8).

### 4.3 3.3 (v5 against v4, leash 50)

Every bound below is provisional: 3.0 re-derives it from the measured v1 − v4 gap before any arm runs.

**Exact, per snap on the bench:**
- the proof arm ≡ v4;
- recognition reads (snaps, dice, bands);
- hot conversions;
- coverage reads (count, bands), except snaps whose only lie is on a kept-in man (counted);
- `unaccounted_rusher_rate`;
- 0 leash rolls (rung 30 ≤ 50).

**slide-only:**
- UNBLOCKED count identical per snap (bodies are unchanged);
- slid pickups up and PICKUP_LOST down, in expectation;
- Δsack in [−0.08, 0.00] pp, central −0.03.

**keep-in-only:**
- kept-in men ≈ Σ over `keepable` of P(TRUE ∪ COUNT) × k;
- UNBLOCKED down and routes per dropback down;
- Δsack in [−0.08, +0.03] pp, central −0.02.

**full:**
- slide checks made ≈ Σ over `slideable` of P(TRUE ∪ COUNT), with P = .75 / .60 / .55 / .50 by row;
- Δsack (true effect) in **[−0.10, −0.03] pp, central −0.05**, observed within ±2 SE (±0.068 pp) of that; on `short`, −0.1 to −0.4 pp, central −0.2. Only `short` snaps change on honest fronts, so the aggregate is the short share (26.1%, backlog 21) × the short effect;
- pressure down, by no more than the v1 − v4 pressure gap 3.0 measures (1.54 pp on the stale July figure);
- UNBLOCKED and PICKUP_LOST shares of free-runner origin down, WON_REP share up;
- interaction ≈ 0;
- the sack verdict stays FAIL.

**Leash pair (D95):**
- **zero** BROKE in both arms, since 95 + 1 + round(10/2) ≥ 100 (leash:63-69; tunables:300-307);
- at leash 20, PROTECTION_ADJUST is never made; at leash 30, every wanted one is made;
- WORK_TO is held in both, WORK_AWAY open in both;
- Δsack(L30 − L20) ≈ Δsack(full − v4) within 2 SE;
- the D95 league at leash 50 ≡ the flat league at leash 50 exactly (discipline is read only at leash:65).

**no-pointing (against v5):** PICKUP_LOST up and sack up on `short`, direction only. About 60–75% of contested pickups lose a +10 and about 25–40% lose a −10.

**Guards:** `int_rate` and completion within 2 SE, with `int_rate` decomposed onto the snaps whose only coverage lie was on a kept-in man (R3). Check-release targets (RB; FB and TE_Y on one concept each) fall, by about the kept-in share or more, since keep-in lands on extra-rusher snaps, where outlet targets may concentrate. 3.3 reports them per dropback, with receptions and position target share, against real-NFL position shares, with a band.

**Triple:** exit falls with pressure. Conversion is not negative in slide-only and is ambiguous with keep-in.

### 4.4 3.4 (v6 against v5)

- v4 and v5 reproduce by name on the new code: `DEFENSIVE_CARDS` and its 22 cards are untouched, and `DIME_COVER_1` lives only in v6's coverage catalogue.
- Each host coverage's share and P(five or more pressure) equal v5's card-weight shares exactly, by construction (asserted to 1e-12, §2.6).
- `blitz_rate` within ±0.5 pp of v5's sim value, and PASS+ (±15% of 23.923%).
- Line-game share within ±0.01 of v5's, complexity mix within ±0.02 per row.
- `BLITZ_DISGUISE_MIX` within ±0.03 per row of v5's. It may move, because Fire's row depends on its coverage (defCards:489-491 against :701-745).
- `disguise_rate` stays at 30–33%.
- Backlog 8b: the pressure share per hosting coverage family evens out, which is the designed change. The per-pressure shares and FIRE_ZONE's own row (distribution:179) move with it. Reported against v5's shell × rusher-count table, and against the real man/zone × rusher-count split on file (the participation feed carries `defense_man_zone_type` and `number_of_pass_rushers`, `packages/calibration/src/ingest/sources/participation.ts`:171-173, :189-197), which is the joint real-result tethering keys on (ADR-071:360-363).
- joint against joint-no-creeper:
  - Δ`blitz_rate` = 0 per snap;
  - creeper share = rate × legal share ± sampling;
  - unaccounted rushers up on creeper snaps (the backer is unnamed against a four-man guess);
  - sack: > 0 on creeper snaps on the bench; aggregate within 2 SE.
- Sack in joint-no-creeper within 2 SE of v5 (guard).

### 4.5 3.5 (v7 against v6)

**Exact:**
- v7 `/front-0` ≡ v6;
- `disguise_rate` and `disguise_mask_mix` unchanged per snap;
- Stem-worn snaps are identical per snap to the same snaps without the Stem unless moved ≠ ∅ and the call states `slideCheck`. A Stem shows no ghost, changes nobody's answer and adds no roll; only the slide set moves, under COUNT and LOOK (`stemLive`).

**Rates:** `front_look_rate` = rate × legal share, with Mug and Stem each about half where both are legal, and the Mug alone over Fire over Sky, Fire over Base Cover 1 and the creeper, where the Stem is illegal (§2.5).

**Bite share** (COUNT ∪ LOOK) among rolled reads on Mug-worn snaps: **26%** over STANDARD calls, **41%** over ZONE_BLITZ calls and **46%** over DELAYED calls (Dime Smoke), each within 2 SE of the analytic value recorded in 3.0.

**Bluff, bitten:**
- hot conversion ≈ the hot-route share of those calls;
- no slide check: with every played rusher named it would move nobody (§2.3 step 2);
- kept-in > 0 where an eligible `checkRelease` man is listed and |ghosts| > the perceived pool;
- completion on hot throws down, interceptions on hot throws up;
- sack as §4.1.

**Real pressure, COUNT or LOOK**, against the same snaps undisguised, scored separately on snaps with and without an eligible `checkRelease` man (`releaseListed`, 3.0):
- slide checked toward the bluff on SLIDE calls stating `slideCheck` (slid → contested: up);
- COUNT and LOOK keep backs in against ghosts (free → contested: down);
- LOOK converts hot where undisguised it did not (backlog 28a: up);
- with no eligible `checkRelease` man, **Δsack > 0**; with one, the direction is undetermined and reported as measured;
- on `r2Expected` (3.0), where no back can be kept in and the shown men sit lopsided away from the real rusher, R2's direction is mechanically expected (Q6(a)).

**Aggregate:** Δsack in [−0.08, +0.10] pp, central +0.01, at the recommended rate; the sign is not determined by the mechanics (§4.1), so this is likely within 2 SE either way.

**Guard:** any `int_rate` rise of 2 SE or more must sit at least 80% on bitten, hot-converted snaps.

---

## 5. What this design settles itself, and why

1. **Pairing stays in playbook; the engine picks among options the card states** (the hybrid answer to ADR-067 Q1).
   - Shape (a) leaves no read in the loop, and under v2+ the huddle never sees the real shown rush.
   - Shape (b) duplicates `claim()` (protection:208-220) and the pairing around it (`assignProtection`, :254-320), and breaks ADR-006.
   - The hybrid works for any caller, though the game loop asks the offence first (simulateGame:552-576), so the question of which side is asked first does not arise.
   - It is the hot-route precedent (backlog 165 §5).
2. **The anticipated card stays the huddle's bare guess;** the line reads the real call's shown rush in the engine (C1). Replacing the guess with the truth would restore the clairvoyance ADR-024 ended. Giving it looks would double-count offensive error.
3. **`ShownRusher` is `Pick<RushAssignment, "rusher" | "alignment" | "side" | "gap">`,** an allowlist, required, a full list, identity by default (R4; ADR-068:44). A side or gap stated on one list and omitted on the other is not a difference.
4. **Same roll, fork, CheckKind and disguise rows; six bands with new labels; the picture as a tunables column** (R7; ADR-068:52-59; the band gate). Each picture is an answer set and a slide set (§2.2). The shape is mine; Q2 asks the owner about behaviour.
5. **No invented blitzer on an honest front.** If the worst bands also imagined pressure, awareness would stop mattering on plain snaps, and no field states a phantom. This is put to the owner as Q2(c). Nor does a look make him more aware of a real rusher: a man the look only moves changes where the slide thinks the strength is, never who is answered (§2.2).
6. **Trigger:** short, or a lie where the pictures would decide differently (ADR-005). A slide check is a decision only where it would change who is slid (passPlay:2042-2043), so a bluff with every played rusher named rolls only where hot conversion or keep-in would differ. On honest fronts it is today's trigger exactly. A Stem adds no roll: its moved men are extras, already rolled.
7. **One roll, actor QB, centre's term.** No `communication` producer and no PRESNAP_READ reshape. The OL's own re-identification is step 5 (ADR-068:157).
8. **The hot rule is unchanged, keyed to the picture's answer set:** every `hot` route converts iff it is non-empty. "Throwing hot into a dropper" emerges against the played coverage. I add no post-snap belief: that would be D writing E's belief channel (passPlay:2117-2132; R3).
9. **The ±10 stays exactly as it is today:** per snap, +10 on every contested pickup iff the band is one of the top three (the TRUE or COUNT picture), else −10, with today's keys, values and labels (tunables:585-591; blitz:128-131), so honest snaps are identical. Contested pickups are always of extras, which TRUE and COUNT answer and CALL and LOOK do not, so this is also what the picture rule gives. It sits uneasily with ADR-068:50-51 ("never a modifier") and R31 ("perception affects decisions, never physics"), but it predates ADR-068 and this ADR leaves it alone. The no-pointing arm (3.3) prices it, and its retirement comes back to the owner with that arm's numbers. It needs no new owner question.
10. **The menu is the slide check and keep-in only.** There is no re-pairing and no release (ADR-068:86; ADR-072:48; ADR-006).
11. **`decideProtection`** is deterministic, with stated tie-breaks and a pool that is perception-pure per band. It wants a slide check only where the check would change who is slid, and walks the keep-in men in card order. On honest fronts its pool equals the real pool.
12. **Keep-in:** never a hot-converted man (hot is rung 0 and stands), never the last route nor the last `readOrder` entry; the pool order is declared, then kept-in, then windfalls. It honours R32: the card states the option, the decision is made before the snap, and it costs the route (ADR-022:61-65). The engine hands an effective call downstream, so a kept-in man keeps his backfield recovery spot.
13. **E's population:** lies are formed on the routes he will run, before the leash. A man certain to be kept in has no track, so he never enters the lies and no coverage decision is wanted for him; `decisionsWanted` is called unchanged. Keep-in reaches E only through the kept-in man: where his was the only lie, no coverage read is rolled, and those snaps are counted per arm (R3). The reorder receives only the coverage decisions.
14. **One leash roll.** If the leash holds back the adjustment, the protection is run as called with no new die; the band and picture are never altered. Below leash 30 a BROKE roll makes the adjustment after the coverage die was thrown: K's tracks are filtered, not rebuilt, the die stays, and those snaps go in their own bag (§2.4 step 9).
15. **The engine change is inert on v4 by construction;** the options are stamped from caller v5, because a change to what a seed produces is a version bump (R30). 3.1's identity tests (the corpus, the engine fixtures, `callDefense()` for every caller version) keep the construction true.
16. **Exhaustive `Record<CallerVersion, CallerProfile>`** in place of frozen:408.
17. **Front looks:** their own fork; never `applyLooks`, `defense-mask` or `shownAssignments`; applied to the real call after `instantiateDefense`, never to the anticipated one; one per call, and disjoint from the coverage-look groups (C5, C11).
18. **A front look draws the whole line in its stance; no look means identity.** The presentation of the book's own pressures is not built (see §7).
19. **The Mug's row is the call's own `blitzDisguise`** (spec:402). Stamping ZERO would fail `D_ZERO_WITH_DEEP_HELP` (validate:999-1008) and contaminate `BLITZ_DISGUISE_MIX`.
20. **The Stem is drawn now** (R22): shown against the played strength, with a die only when the rush is balanced, and legal only where three or more down linemen rush, none drops and no shifted lineman lands on another shown rusher's spot (§2.5). It shows no ghost and changes nobody's answer; its only engine-read effect is the slide set, through moved men, on calls stating `slideCheck` read COUNT or LOOK (`stemLive`). It is thin by construction, and said to be.
21. **Decomposition before front looks;** the creeper is a sub-draw, so its counterfactual is matched by coverage. Under ADR-071 rulings 1 and 4 (R24, R27) a pressure call is a coverage plus a pressure tag, so the creeper tag is how R22's "simulated-pressure card" is delivered; Q4 lets the owner say if they meant a card of its own.
22. **Rates held by construction:** each host coverage's share and P(five or more pressure) hold exactly. The pressure-by-coverage joint moves by design (backlog 8b), and the per-pressure shares with it. Zero stays a bound card. `DIME_COVER_1` is added as a host, only in v6's coverage catalogue, with its own weight 0; `DEFENSIVE_CARDS` is untouched. The Base Run Blitz fallback goes to the coverage (R25) and is unreachable on today's formations (ADR-071:457-458), so I do not ask about it.
23. **`blitz_rate` stays five or more;** the creeper is a pressure, not a blitz.
24. **Metrics:** new `front_look_rate` (`shownRush` against `rush` entry by entry on rusher, side, alignment and gap, `move` stripped) and `front_look_mix`; `disguise_mask_mix` filtered to coverage looks; stream tests partitioned on the same comparison.
25. **The default caller moves once,** to v7, at the end. Known-truth ladders re-baseline once.
26. **No caller bump for rung 30;** it sits below the default 50 (ADR-072:133-134; frozen:278-285; C4).
27. **C2, C3 and C15 are fixed in comments only,** in 3.1 (C15's rewrite also amends gapCarryAcross.test.ts's text, a pin named in the commit).
28. **The stale `coverage_read` UNIMPLEMENTED SURFACE row** (scaleSurface:226-233) is calibration's own commit, not this dispatch (C13). Each pin should move for one reason.
29. **Run side:** echo only (R6; runPlay.ts:85-88).
30. **Scale:** reproductions at 6,720 games, aggregate arms at 26,880 with the stated binomial SE (a floor: the clustered SE the harness reports is at least this), per-snap claims on the replay bench.
31. **`gap` echoed on both rush lists,** so the UI can draw a Stem and diffs compare like with like. The engine's physics still reads no gap; 3.1 rewrites rushThreat:349-357's comment to say so (C15), and 3.5's `applyFrontLook` reads the rush gap for the Stem's positions, which discharges gapCarryAcross's expiry pin by its branch (a).

---

## 6. Inertness proof — REQUIRED (steps 3.1, 3.2a and 3.2b claim no change)

- **3.1, algebraic:** `shownRush` is the same array object as `rush` on every call the corpus, the
  engine fixture and `callDefense()` build, for every caller version, and on every hand-built engine
  call (literals found by typecheck, spreads routed through `withRush`); 3.1's identity tests assert
  it, so a stale list fails there. Nothing in the engine resolves from it before 3.2b; only 3.1's
  validator and the PLAY_START echo read it. **Empirical:** v4 on set A (`adr-073:front-arm`, 6,720
  games) reproduces main number for number; the stream differs only by the new fields (`shownRush`,
  and `gap` on the played `rush`).
- **3.2a, algebraic:** forks are addressed by label (rng:52), and every pickup, stunt and coverage die
  keeps its address when the work moves; the three builders that move throw no dice. **Empirical:**
  the stream is byte-identical to 3.1's.
- **3.2b, algebraic:** with `shownRush === rush` there are no ghosts and no moved men, so the trigger is
  today's. On an honest front TRUE and COUNT answer the extras and CALL and LOOK answer nobody, and
  the top three bands cut where today's success does (margin 0), so hot conversions are today's per
  snap and the ±10 is today's per-snap rule itself. v4 calls state no options, so there is no slide
  check and no keep-in, the effective call is the call (nobody is kept in, so its routes as run are today's, hot conversions included),
  `PROTECTION_ADJUST` is never wanted, and with no rung above 50 the leash never rolls at the
  default. **Empirical:** 0 numbers differ over set A, and every `blitz_recognition` read keeps its
  roll and target, its new band the six-band label of the same margin.
- **Every mover after 3.2b is a caller version.** v5 and v7 each have a proof arm that switches the
  new part off and reproduces the version before exactly (v5 `/no-slide-check/no-keep-in` ≡ v4; v7
  `/front-0` ≡ v6). v6 redraws the mix by design. Its proofs are that v4 and v5 reproduce by name on
  the new code (`DEFENSIVE_CARDS` untouched), and that each host coverage's share and P(five or
  more) equal v5's card-weight shares by construction (asserted to 1e-12).

---

## 7. Risks, and what this does not do

**Risks:**
- **The aggregate cannot be scored** (C1). Population cuts are frozen in 3.0, and there is Q6.
- **R2 may not show on bluffs, nor on all real pressure.** A bluff physically costs only routes and hot throws. R2's real test is the real-pressure population, which is smaller, and there the sign is undetermined: the slide checked toward the bluff and LOOK's hot conversions push sacks up, but COUNT and LOOK keep backs in against ghosts, which pushes them down (§4.1). R2's direction is mechanically expected only where no eligible `checkRelease` man is listed and the shown men sit lopsided away from the real rusher (`r2Expected`, Q6(a)), smaller still. Its size is computed in 3.0, before any arm.
- **C8 contamination.** Bitten snaps go hot through a known defect (blitzTest:513-591; backlog 28a). The 28a result in 3.0 names the mechanism, and every cut is split by hot-converted.
- **D reaches E's population, in counted ways.** Hot conversions, as today: lies are formed on post-hot tracks. Keep-in reaches E only through the kept-in man: his lie is never formed, so on snaps where it was the only lie no coverage read is rolled. That count is reported per arm, and `int_rate` is decomposed onto those snaps (R3). Below leash 30, on a BROKE roll, a coverage die may concern a man then kept in; those snaps are counted in their own bag (§2.4 step 9). On a call that also wears a coverage look, a front look can change which tracks that read sees, through hot conversions and keep-in (§2.1). `coverage_read` count per arm is reported, and `int_rate` is a guard decomposed onto hot-converted snaps.
- **The Stem is nearly inert** until step 5. It shows no ghost, changes nobody's answer and adds no roll; it moves only the slide set, on calls stating `slideCheck` read COUNT or LOOK (`stemLive`). Its live population is reported, not hidden.
- **Kept-in backs block at Pass Block 60 in every arm here.** On the flat and archetype leagues every player carries every active attribute at 60 (flat:41-48, :98; archetype:43, :73). `getAttr`'s fallback of 50 (registry:32-35) applies only on a roster that omits `passBlock` for backs (registry:83), which is the attributes pipeline's; a latent registry petition.
- **Fantasy:** check-release targets fall (3.3; RB, and FB and TE_Y on one concept each), perhaps by more than the kept-in share, so 3.3 reports them per dropback, with receptions and position target share, against real-NFL position shares, with a band. Hot interceptions rise (3.5). `PLAY_START.offense.routes` now means the routes as run, so stat-line reducers use `protectionAdjustment.keptIn`, when `made`, for the called ones (§2.8). Fantasy scoring should not lean on absolute sack counts while the sim's 16.43% stands against 6.560% real. The fantasy-advisor sits at each gate.
- **The ±10 stays exactly as today:** per snap, +10 on every contested pickup iff the band is one of the top three, else −10, with today's keys, values and labels (tunables:585-591; blitz:128-131). It is perception reaching a contest through a pre-snap assignment, labelled INTERPRETATION, and it sits in tension with ADR-068:50-51 (a read is a picture, "never a modifier"; R8) and R31 ("perception affects decisions, never physics"). It predates ADR-068, and this ADR leaves it exactly as it is. The no-pointing arm (3.3) prices it, and its retirement comes back to the owner with that arm's numbers.
- **Pin churn, mostly in 3.2b** (`RECORDED_NUMERIC_CENSUS` 742 → 745 and `classifiedNarrow` 250 → 253 among them), handled one stated reason per pin, each pin named in its commit (template: ADR-072 commit 051971e). Assertions that move are listed; fixture builders that gain `shownRush` are not counted as moved pins (backlog 167 §5). gapCarryAcross.test.ts's text moves in 3.1, and its expiry pin is deleted in 3.5. That pin is dated 2027-02-05 (P1_EXPIRY): if 3.5 has not landed by then it fails the suite on a day nothing changed, and moving the date is a decision named in the commit, in the pin's own words. Its recipe also greps only engine and calibration source (gapCarryAcross.test.ts:100-106), while `applyFrontLook` sits in playbook, so 3.1's amendment of the pin's text also names a reader in playbook as meeting branch (a).
- **The required `shownRush` touches every hand-built call.** Typecheck enumerates the literals (`pnpm -r --no-bail typecheck`, backlog 167). A spread that overrides `rush` compiles and silently keeps a stale `shownRush`, so those sites (in the engine's test fixtures and six engine test files, listed in 3.1) go through one `withRush` helper, and identity tests over the corpus, the engine fixtures and `callDefense()` for every caller version catch a miss at 3.1, not inside 3.2b's proof.
- **3.4's authoring is large.** If its arms disagree with its construction, split it into its own ADR before 3.5.
- **Flat-league specifics:** band shares and bite shares are flat-60 only; the leash pair's zero-BROKE holds only at Discipline 95 (a 10-point breach holds 66% at the flat league's 60, ADR-072:97).
- **No real-world rate exists** for any of the new looks; they are named in identity and never fitted to `sack_rate`.

**What I would not do:**
- Re-pair a named man, or move pairing into the engine.
- Compute the check in the caller against the real call.
- Give the anticipated card looks.
- Add a CheckKind, a centre roll, a PRESNAP_READ reshape or a `BlitzDisguise` row. Stamp ZERO or DELAYED onto a look.
- Route front looks through `applyLooks`, `defense-mask` or `shownAssignments`.
- Count the Mug in `disguise_rate`.
- Invent blitzers on honest fronts.
- Add a post-snap phantom belief.
- Leash the hot routes, the point-out, or the read itself.
- Re-use the labels READ_IT, RECOGNIZED, MISSED or FOOLED for the six-band table.
- Append cards to `DEFENSIVE_CARDS` mid-version (selection:68-69; distribution:99-118). `DIME_COVER_1` lives only in v6's coverage catalogue.
- Fix C8, move `qb.throwThreshold`, or flip blitzTest:589-590.
- **Present the book's own pressures** (dropping end in stance, delayed blitzer hidden) on calls with no look. It would move every measured pressure card, it is outside the Phase 3 row, and ADR-069 Phase 1 already moved hand-written shows into drawn looks. Fire Zone's own comment, "the picture pre-snap is a four-man rush" (defCards:489-490), marks it as the next candidate, as a drawn pressure look in its own ADR.
- Pinch (not a ruled word, R26; needs a slant model), the run read, re-identification, the false start, hard count, audibles, motion.
- Fix the stale SURFACE row here (C13).
- Judge any step on the season sack rate, or tune toward 6.560% here.

---

## Provenance of factual claims — REQUIRED

| claim | provenance |
|---|---|
| The owner's rulings this design honours (§8's table, R1–R32) | **REPORTED** — the ADRs cited in each row, read by the design panel; R2's sentence copied from ADR-067; R32 added from ADR-022 Petition 1 (ADR-022:61-65, ratified at :5 and :378) |
| Every claim about today's code cited `file:line` in §1–§5 and §7 | **REPORTED** — read by the seven-reader map and the three-design panel, and re-read by its synthesizer at the line cited; then checked again by the claim checkers (next row) |
| The cited claims, checked again at their lines (2026-10-16) | **REPORTED** — four claim checkers re-read 372 cited claims at the cited lines on 2026-10-16: 297 confirmed, 75 corrected in this text (12 wrong, 5 unbuildable, 35 imprecise, 23 nit), and 4 ruling conflicts settled (R32 added; the creeper's card reading stated; R25's line-game rule; the ±10 left exactly as today). The contracts guardian's MODIFY of §3 and the fantasy advisor's needs-now items are applied |
| Under caller v2 and later the offence is instantiated against the anticipated bare card, not the real one | **REPORTED** — frozen:401-453 (C1) |
| `unaccounted_rusher_rate` 26.125% at v2 (the `short` share, 26.1%); v1 → v2 moved sacks +0.12 pp and pressure +1.54 pp | **REPORTED** — CALIBRATION-BACKLOG.md entry 21 (backlog:1275-1284), measured in July on an older engine: the stale anchor, which 3.0 replaces with today's measured v1 − v4 gap |
| `sack_rate` 16.43% sim (v3/v4 flat), 6.560% real | **REPORTED** — ADR-070 §10 (ADR-070:299); calibration tier1 |
| `blitz_rate` real 23.923% | **REPORTED** — calibration tier1 |
| 88.4 dropbacks a game; the binomial SE of an unpaired sack-rate difference, assuming independent dropbacks: about 0.034 pp at 26,880 games and 0.068 pp at 6,720 | **COMPUTED** — 2,377,214 dropbacks over 26,880 games (arms/adr072-report.md:3), and sqrt(2p(1−p)/N) at p = 16.43%; the per-game (clustered) SE the 3.0 harness reports will be at least this, and replaces it |
| The band shares on the flat league (§2.2's table) and the Mug's bite share (26% over STANDARD, 41% over ZONE_BLITZ, 46% over DELAYED, i.e. Dime Smoke) | **COMPUTED** — from §5.3's formula at every rating 60 (flat:32): margin = d100 − 26 − disguise; a bite is COUNT ∪ LOOK (DELAYED: COUNT 15 + LOOK 31) |
| Leash outcomes at Discipline 95 (never BROKE at a breach of 10) | **COMPUTED** — ADR-072 §2's formula, 95 + 1 + round(10/2) ≥ 100 (leash:63-69) |
| At the flat league's Discipline 60, a 10-point breach holds 66% of the time | **REPORTED** — ADR-072:97 |
| Kept-in backs block at Pass Block 60 in every arm here; `getAttr`'s fallback of 50 needs a roster that omits `passBlock` for backs | **REPORTED** — flat:41-48, :98; archetype:43, :73; registry:32-35, :83 |
| `RECORDED_NUMERIC_CENSUS` 742 → 745 and `audit.classifiedNarrow` 250 → 253 at 3.2b | **REPORTED** for today's 742 and 250 (`calibration/test/docConformance.test.ts`:190, :339); the +3 **COMPUTED**: two more band boundaries (four rows to six, tunables:219-224) plus `rungs.PROTECTION_ADJUST` |
| `DEFENSIVE_CARDS` holds 22 cards, which v1–v5 draw from | **REPORTED** — defCards:944-967; selection:68-69 |
| The six band cuts | **REPORTED** — §5.1's ladder (tunables `presnap.coverageRead`, tunables:271-278) |
| The labels DIAGNOSED … BUSTED, and TRUE / COUNT / CALL / LOOK | **CHOSEN — provenance NONE**; a repo search found none of them in another band table |
| Rung 30 for protection adjustment | **CHOSEN** — ADR-072 §1's provisional point (ADR-072:48); filed INTERPRETATION in docConf's register, which has no CHOSEN provenance; ruled by the owner as one decision at 30 (Q1(a), 2026-10-16) |
| What each picture answers and where it places men (§2.2's answer and slide sets), the slide check's moves-somebody rule and the keep-in walk (§2.3) | **CHOSEN — a football judgement**; the moves-somebody rule is ADR-072's existing standard for a decision (passPlay:2042-2043) |
| The Mug's and Stem's shapes and legality, the creeper's shape | **CHOSEN — a football judgement**, within ADR-069 §9.2's and ADR-071 §4's descriptions |
| The creeper as the Phase 3 row's "simulated-pressure card" | **INFERRED** — R22's row (ADR-069:360) read through ADR-071 rulings 1 and 4 (R24, R27: a pressure call is a coverage plus a pressure tag); put to the owner in Q4 |
| No line game on a man the call's pressure moved or dropped | **INFERRED** — R25 ("no two played tags on one man", ADR-071 ruling 2) applied to the separate line-game draw (§2.6) |
| The front-look and creeper rates (1 in 10) | **CHOSEN — provenance NONE**; no real figure is on file; the owner ruled 1 in 10 (Q5(a), 2026-10-16) |
| §4's predicted sizes | **INFERRED** — from backlog 21's July v1 → v2 anchor (stale), the `short` share and the band shares; provisional until 3.0 re-derives them from the measured v1 − v4 gap and files them as figures, before any arm |
| §10's 3.0 figures | **MEASURED** — the arms, bench, probe and direct application §10 lists, from the scratch harness in `/mnt/project-files/arms/`, and the shares on which v1 keeps in or releases a different man (0.7%, 1.3%, 1.8%) and slide-only's split (−0.82, +11.75) from the independent checker's replay probe there (`adr073-review-probe.ts`); §4.3's re-derived centrals from the direct application, which **INFERS** that §2.3's adjustment made as a call edit stands for v5's; keep-in's floor and the pressure bound **CHOSEN** (the rule §10 states) on three **INFERRED** assumptions §10 names |

## Conjoined mechanisms — REQUIRED

- **The read and the line's answer (D) against the coverage read (E):** different target metrics
  (`sack_rate`, `int_rate`), never in one arm (ADR-067). D lands on honest fronts (3.3) before any
  front look exists. A front look leaves `shownAssignments` untouched, so on a call with no coverage
  look it cannot roll E by itself (C11). D still reaches E's population in counted ways: hot
  conversions, as today; the kept-in man, whose lie is not formed (so a snap where it was the only
  lie rolls no coverage read); a BROKE roll below leash 30, where a coverage die may concern a man
  then kept in; and, on a call that also wears a coverage look, a front look changing which tracks
  E sees through hot conversions and keep-in. Each is reported per arm, with `int_rate` decomposed
  onto it (R3; §7).
- **The slide check and keeping a back in** are separately priceable: three arms (slide-only,
  keep-in-only, full), with the interaction read off them (3.3).
- **Pressures drawn and line games drawn** (ADR-071 step 3): three arms, as ADR-071 named them, plus a
  fourth separating the creeper (3.4).
- **Mug and Stem:** each alone, then both (3.5).
- **The ±10 point-out and the real adjustment:** the no-pointing arm prices the first beside the
  second, and the point-out's retirement goes back to the owner with that arm's numbers (§7).
- **Rung 30 closed against open:** the leash pair at Discipline 95, where every leash roll holds, so
  the rung is priced with no broken leash in it.

## Implied scope — REQUIRED

- **The run side.** The shown rush rides run `PLAY_START` (ADR-067), but run plays have no pre-snap
  stage, so nothing reads it; the run read ("the line reading the front, the back reading the box") and
  run blocking against the shown fit are their own step. `unruled`.
- **The safety half of the Cover 0 mug** (safeties rolled down to show no deep help) is a coverage look
  with its own read and its own target metric; held for its own step (Q3). `unruled`.
- **Presenting the book's own pressures** (a dropping end shown in his stance, a delayed blitzer hidden)
  on calls that wear no look; Fire Zone's card says its picture is a four-man rush. A drawn pressure
  look, its own ADR. `unruled`.
- **Pinch** (the line slanting inside): not among the ruled words, and the line has no slant to state it
  with. `unruled`.
- **The line's own re-identification** (step 5, OL tells), **the stem's false start and the hard count**
  (step 7, which needs `snap_jump` and `penalty_check` producers), **audibles** (step 6). `unruled`.
- **Options for every coach.** The engine picks among options the card states, so a human or NPC
  coach's protection works the same way. This design assumes franchise states `protectionOptions`
  for every coach, human or NPC, so the human's only off switch is the COACH leash; otherwise the
  slide check and keep-in land only on NPC teams. Q1(a) keeps that switch for both decisions; Q1(b) would take the slide check's off switch from the human and Q1(c) both, and keep-in is the decision that spends a back's receiving line. Franchise's to build. `unruled`.
- **A coordinator's disguise tendency** (how often his front shows a Mug, a Stem or a creeper) replaces
  the league-wide rate later (ADR-069 ruling 4). `unruled`.
- **Kept-in backs' pass blocking.** On the flat and archetype leagues every player carries every
  active attribute at 60 (flat:41-48, :98; archetype:43, :73), so a kept-in back blocks at Pass Block
  60 in every arm here. `getAttr`'s fallback of 50 (registry:32-35) applies only on a roster that
  omits `passBlock` for backs (registry:83), which is the attributes pipeline's: a latent registry
  petition, not filed. `unruled`.
- **The hot-route defect** (backlog 28a; blitzTest:513-591) is measured in 3.0, not fixed here.
  `unruled`.
- **The stale `coverage_read` row in the scale surface** stays calibration's own commit (C13).
  `unruled`.
- **Fantasy mode:** check-release targets fall when a check-release man is kept in (3.3), and hot
  interceptions rise when a quarterback buys a Mug (3.5); the fantasy advisor sits at each gate. The
  per-game stamp should carry the seed string, the engine commit, the feed version in effect, the tunables digest, the caller
  identity with its knobs, the registry version and the human inputs (the call with its options, and
  the leash) (§2.7). In a league the knobs are league rules, not dev switches, and the v7 default
  move is a calibration event a running league must not follow. `unruled`.
- **Later, once humans pick looks:** a price for human-picked looks once the step-4 call sheet exists
  (physics resolves against `rush`, so always-Mug would be free); the replay bench promoted from a
  scratch harness to a kept calibration tool; new validators that throw on a removed man (ADR-006),
  never filter. `unruled`.
- **Real-result tethering.** Charting has no look data, so a front look has no real-world handle. Tethering stays on the played coverage family and the rusher count (ADR-071:360-363), and the creeper counts as a four-man rush there, as it does in `blitz_rate`. `unruled`.
- **Awareness provenance.** The pressure read keys on QB and centre Awareness, which the attributes pipeline derives from scouting text and inference, the latter capped at 0.6 confidence (`docs/design/attributes.md`:49, :72). It now sets who is fooled, and so hot interceptions and sacks. If a weekly feed moves it, it should move slowly, as ADR-072 says of Discipline (ADR-072:282-283). `unruled`.
- **CLAUDE.md's Iron Rule 1** lists only `calibration` → `engine` as ratified, but ADR-017's
  Decision 3 (ADR-017:95, with Charter Amendment 7) ratified `calibration` → `playbook`, which today's
  code and this design use. Reconcile the CLAUDE.md wording, separately; not this ADR's defect.
  `unruled`.

---

## 8. Rulings and findings this design cites

**Rulings (R):**

| # | Ruling | Source |
|---|---|---|
| R1 | Order: A, B and C (inert), then E alone, then D. Reason: "D would be RIGHT AND UNSCOREABLE". E has landed (ADR-068 step 1, ADR-070), so D is now the next item | ADR-067:135-145  |
| R2 | **D's ADR states BEFORE ANY FIGURE:** "THIS WILL MOVE `sack_rate` IN THE WRONG DIRECTION, AND THAT IS CORRECT … (16.5% sim against 6.6% real). Read as a regression, it is not one." | ADR-067:176-185  |
| R3 | D and E never share an arm (different target metrics: sack_rate against int_rate) | ADR-067:187-191 ; ADR-068 Conjoined (~:183-187)  |
| R4 | The shown state is per-assignment, built in one pass from one source, so it is inert by identity. It is not a second call | ADR-067:199-209  |
| R5 | The shown state rides on PLAY_START. It is not a new event and not a `wasDisguised` flag; consumers diff it | ADR-067:221-229 ; backlog 168 (CALIBRATION-BACKLOG.md:12703-12755) |
| R6 | Not pass-only: both pass and run PLAY_START carry the shown state | ADR-067:252-256  |
| R7 | "Do NOT invent a second disguise scale. The phase changes WHAT the roll is about, not the roll" (consume `blitzDisguise` +0/15/20/25). This is the ADR's design rule, not a separate owner ruling, but the owner ruled on the ADR | ADR-067:73  |
| R8 | Read, decide, leash approved. Coverage and pressure are **two rolls sharing one decision step**. Each read "produces a perceived picture … never a modifier" | ADR-068 §8.1 (:221) ; §2 (:50-51, :69-72)  |
| R9 | `discipline` added; the leash is a 0–100 slider (COACH authority) | ADR-068 §8.2-3  |
| R10 | Misreads of coverage are perceived against the shown coverage, and the catch resolves against the played one. This ADR applies the same rule to the rush under ADR-068 §2's "the decision step acts on the picture, not on the truth" and §1's "A `shownRush` is §D's data" | ADR-068 §8.4 (:224), §5 (:130-135) ; §2 (:50-52) ; §1 (:41)  |
| R11 | Build order approved, including step 3 = "QB+C pressure read made **graded and unconditional** + protection adjustment", target sack_rate | ADR-068 §8.5 (:225) and §6 (:155)  |
| R12 | Motion is HELD | ADR-068 §8.6  |
| R13 | Ladder: work away at 20, work to at 40, "later rungs stay provisional". Rung 30 (protection adjustment) is to be ruled with this step | ADR-072 Decision 1 (:306) , table :44-57  |
| R14 | Breach: one roll per snap, d100 + Discipline + breach÷2 against 100 | ADR-072 Decision 2 , §2  |
| R15 | Calibration default leash is 50; omitted means 100. "A rung above 50 … must bump the caller's version" | ADR-072 Decision 3 , §3 (:128-134)  |
| R16 | The leash governs decisions, not perception, and not the call's own answers. Hot routes are rung 0 | ADR-072 §1 (:36-42)  |
| R17 | Masks are named pieces, drawn after the card, never changing what is played | ADR-069 §9 ruling 1 (:269)  |
| R18 | The 30–33% disguise target counts coverage disguises only. "Front masks get their own die and their own rate, measured separately" | ADR-069 ruling 3 (:271) , §9.4 (:328-329)  |
| R19 | One league-wide rate now; a coordinator trait later | ADR-069 ruling 4  |
| R20 | Front & Blitz bound to the card (ruling 5). **This ends at ADR-071 step 3** | ADR-069:273 ; ADR-071:314-315  |
| R21 | At most one safety mask, one corner mask and **one front mask** per call | ADR-069 §10.1 (:403)  |
| R22 | Order: Phase 1, corner masks, leash, then front masks with the pressure read. "§9.6 stands as written" (so the Phase 3 row is ruled scope) | ADR-069 §10.3 (:405)  |
| R23 | The Cover 0 exclusion holds for a PLAYED Cover 0. The Cover 0 MASK (shown Cover 0, played something else) is legal | ADR-069 §9.4 (:334-335)  |
| R24 | The call is personnel, front, concept, tags. Each tag is LOOK, PRESSURE or FRONT, by the layer it changes | ADR-071 ruling 1 (:402)  |
| R25 | One look per position group; no two played tags on one man; a look may sit over a pressure; a pressure never moves the deep shell, Zero excepted | ADR-071 ruling 2 (:403) , §3  |
| R26 | Words: Stem and Mug are LOOKs at Phase 3. Pressures: Fire, Double A, Smoke, Zero. Line games: Tex, Twist, Delay, Triple. **Pinch is NOT among the ruled words** | ADR-071 ruling 3 (:404)  |
| R27 | Pressure and front tags are their own draws with Phase 3. The call sheet and the captain's check come at step 4 | ADR-071 ruling 4 (:405)  |
| R28 | Every tag is derived or checked, never only declared (approved with the ADR) | ADR-071 §6 (:270-275)  |
| R29 | A pressure tag is carried iff someone other than a down lineman rushes (approved with the ADR) | ADR-071:147-150  |
| R30 | ADR-024: the caller anticipates the front with a same-personnel draw. Matching on rusher count is rejected. A caller change is a version bump, not an edit | anticipate.ts:26-95; ADR-071:363-365  |
| R31 | Owner-carried constraints (Charter): pressure work reports the exit/sack/conversion triple and names what is held; perception changes decisions, never physics; fashion never touches the engine; the calibration caller is coach-agnostic | ARCHITECTURE_CHARTER.md:2206-2217; perception.md:12; emergent-meta.md:15; coaching-staff.md:45 (spec reader) |
| R32 | A route-runner may not materialise as a blocker at resolution; keeping a man in costs his route before the snap, and the card pays for it | ADR-022 Petition 1 (:61-65), ratified (ADR-022:5, :378); protection:64-67 |

**Findings (C), from reading the code against the docs:**

- **C1.** ADR-067's premise (protection pairs against the truth) holds only under caller v1. Since v2 the
  offence is built against the anticipated bare card (frozen:401-453), so protection is already wrong
  about the rush on about a quarter of dropbacks. Letting the line read the real front corrects that on
  honest snaps, in expectation (where the pool is shorter than the extras, a checked slide can move the
  only body from a slid man to a contested one); otherwise only a lie makes it go wrong.
- **C2.** preSnap's header says a slide-side rusher with a free slide blocker is accounted for, and
  tunables:564-568 repeats it; the code counts him unaccounted whenever no pairing names him
  (preSnap:238-251). Both comments fixed in 3.1.
- **C3.** rushThreat:339-341 says nothing in the engine reads `side`; the engine's slide does
  (preSnap:289). Playbook's `claim()` reads the card's side as well (protection:209). Comment fixed in
  3.1.
- **C4.** Rung 30 sits below the default leash of 50, so leash 50 and 100 stay equivalent and no caller
  bump is needed for it; leash knobs below 30 now close a decision.
- **C5.** ADR-069 says one front mask per call; ADR-071 and the code say one look per five position
  groups. This design allows one front look per call, never on a man a coverage look moves, which
  satisfies both.
- **C6.** ADR-069's Cover 0 mug moves safeties and backers; ADR-071's Mug moves backers. Q3.
- **C8.** pressureMetrics:418-422 asserts that a seen blitz with a hot route sacks less than no blitz at
  all, across buckets. blitzTest:552-591 pins that on the same converted snaps the hot card sacks more
  than no hot card (backlog 28a). Both hold today; the second records the defect. Measured in 3.0, not
  fixed.
- **C10.** Claims this design makes false, each swept in the step that makes it false:
  - at 3.2b, the recognition comments (tunables:568-569, preSnap:18-20, :151 and :254-255,
    blitz:11-15), which become "rolled when an unnamed rusher exists, or when a front look shows or
    moves a man and the pictures would decide differently (ADR-073 §2.2)"; tunables:584-590 ("the only
    place recognition touches the line"); the four-label comments (`packages/engine/src/events.ts`:87-88,
    blitz:88-89); the `availableBlockers` doc (types:300-311), which becomes "declared, then kept-in,
    then `unblockedProtectors` at the back"; the leash comments (tunables:283-285, :289-294), which
    gain the third rung and the pressure read's want; and the contracts' hot-route doc (playcalls:79,
    D8), the "already paired against" premise in the `blitzDisguise` doc (playcalls:506-507, D3b), and the "four-row" band comment on PRESNAP_READ (events:232-233, D5);
  - at 3.5, "a look is worn exactly when `shownAssignments` differs" (ADR-071), "a look changes no
    rusher" (frozen:401-406), the `shownAssignments` contracts doc (D2), the `DefensiveTag` doc
    (playcalls:445-447, D7), the `LOOK` line of the `DefensiveTagKind` doc (playcalls:430-431, D4), the
    `RushAssignment.gap` doc's "NOTHING READS IT YET" (playcalls:370, D6), the "same array" sentence of
    `shownRush`'s own doc (P2), the `declaredRush` doc's "Nothing reads `gap` yet either"
    (instantiate:158-160), and the two stream tests.
- **C11.** `applyLooks` always stamps `coverageDisguise`, and `coverageLies` short-circuits only on array
  identity, so a front look routed through the coverage-look code would roll the coverage read. Front
  looks get their own code.
- **C13.** scaleSurface:226-233 still calls `coverage_read` UNIMPLEMENTED with "no producer", though
  ADR-068 step 1 built it (passPlay:361-370). ADR-072:298-299 left it to calibration's own commit, and so
  does this ADR (§5 item 28).
- **C14.** The `DefensivePlayCall` doc's list of what the engine resolves omits `blitzDisguise` and
  `coverageDisguise`. Fixed in 3.1 (D1's C14 half); the word `shownRush` joins the list at 3.2b, when
  the engine first resolves from it.
- **C15.** rushThreat:349-357 says `gap` is not threaded through `resolvedRushAssignment`; 3.1 threads it
  as an echo. 3.1 rewrites that comment (the echo is a stream fact for renderers and diffs; the engine's
  physics still reads no gap) and amends `packages/playbook/test/gapCarryAcross.test.ts`, whose
  engine-src grep for `.gap` (:102) starts hitting on the echo, to name the echo as a carry and not
  branch (a)'s reader (a pin that moves, named in the commit). The expiry pin itself (P1_EXPIRY
  2027-02-05) is discharged by its branch (a) at 3.5, when `applyFrontLook` reads `RushDuty.gap`, and
  is deleted in that commit.

---

## Decision

**Accepted** *(owner, 2026-10-16)*. ✅ Rulings on §9, asked in plain words
(`/mnt/project-files/design/ADR-073-questions-explained.md`) and answered on decision cards, each as
recommended:

1. **Protection change on the leash — one decision at 30.** The slide check and keeping a back in open
   together at rung 30; below it the quarterback must break his leash (the one Discipline roll).
2. **The read — the six grades as described.** TRUE, COUNT, CALL and LOOK as §2.2 states them; a plain
   front never invents a blitzer.
3. **The Cover 0 mug — linebackers now, safeties later.** The safeties' half is its own coverage
   disguise with its own test.
4. **The four-man simulated pressure — "Creeper",** a pressure tag on Cover 3; it counts as a pressure,
   not a blitz.
5. **Rates — 1 in 10.** A Mug or a Stem on 1 in 10 of the calls that can wear one; the Creeper on 1 in
   10 of the four-man Cover 3 calls.
6. **What decides — the fooled snaps** (COUNT or LOOK on a disguised front), above all `r2Expected`;
   the season sack rate is reported, never deciding.
7. **The plan — yes.** 3.0 to 3.5 in order, each measured on its own; the default caller moves once,
   at the end.

The contracts edits in §3 (P1–P3, D1–D8, P2's doc) are not covered by these rulings: each comes to the
owner for its own yes, named, before it is made.

---

## 9. Questions for the owner

*Ruled 2026-10-16, each as recommended (Decision).*

**Q1. Can the coach forbid the line's protection change?** Before the snap, the centre and quarterback can now slide the line toward the pressure and keep a back in to block when they're a man short. On the coach's 0–100 leash, "work away from a covered man" opens at 20 and "work to an open man" at 40.
- **(a) Recommended:** one decision, opening at 30. A coach below 30 means "run the protection as called".
- (b) The slide is the centre's call and can't be forbidden; only keeping a back in opens at 30.
- (c) Neither can be forbidden; both are the line's own answer, like a hot route.

*Why (a):* your leash table already lists them together at 30. A coach who says "run it as called" means the protection too. A coach anywhere from 30 up, like the test league's 50, gets the same under every option; only a tight leash differs. Hot routes and the centre pointing out the blitzer stay allowed at any leash. And it treats every coach alike: the line may adjust on every team, yours and the computer's, and the leash is the one switch any coach has to stop it.

**Q2. When do the quarterback and centre read the pressure, and what does each grade do?** They read it whenever a man is coming with no blocker set on him, as today, and also when a man with no blocker set on him is only lined up as if he is, if that could change what they do. The six grades:
- **Best two:** sees exactly who is coming and from where.
- **Third:** counts every man coming or showing it, can't tell bluff from blitz, and blocks everybody he sees.
- **Fourth:** not sure, so he runs the protection as called.
- **Worst two:** buys the look. He throws hot and keeps backs in against the men only showing it, slides toward the strength the look shows, and misses every real blitzer coming free, even one the look has only shifted to another spot.

On a plain front with nothing disguised, the worst grades just miss: the protection runs as called and the blitzer is picked up late. They never invent a blitzer. For an average quarterback and centre against a Mug over a normal four-man call: sees through 60 times in 100, counts everybody 15, unsure 14, buys it 11. So the Mug works about 1 time in 4; over a zone blitz, about 4 times in 10; over the dime's delayed pressure (Dime Smoke), nearly half (46 in 100).
- **(a) Recommended:** as above.
- (b) The third grade also sees through a disguise; only the worst two are fooled. A Mug then works about 1 time in 9.
- (c) As (a), and a badly fooled quarterback can also imagine a blitzer on a plain front and throw hot.

*Why (a):* "didn't know" and "was wrong" lead to different plays, as you ruled for every read. The quarterback's awareness keeps mattering on plain snaps, and being fooled needs something on the field to be fooled by.

**Q3. The Cover 0 mug: linebackers now, safeties later?**
- **(a) Recommended:** now, the inside linebackers walk up into the A gaps, with the whole line in its stance, and drop at the snap. The safeties rolling down to show no deep help come later, as their own coverage disguise with their own test.
- (b) Linebackers and safeties together, now.

*Why (a):* safeties showing Cover 0 change what the quarterback reads in coverage, which drives interceptions. Testing both at once would credit interceptions to the protection. Your Phase 3 list names the Cover 0 mask, so leaving its safety half for later needs your word. For reference, a mug reads at the difficulty your blitz table already gives a walked-up linebacker: no harder than a standard blitz over a plain call, and harder when an end drops or over the dime's delayed pressure.

**Q4. What do we call the four-man simulated pressure?** Four rush, one of them a linebacker; an end drops into the hook; three deep behind it. Your Phase 3 list calls it a simulated-pressure card. Under your ruling that a call is a coverage plus its tags, with pressures drawn on their own, it arrives as a pressure called over Cover 3, not as a card of its own. (If you meant a card of its own, say so here.)
- **(a) Recommended:** a word of its own, "Creeper" (or "Sim", your choice). It counts as a pressure, but not as a blitz, because only four come.
- (b) "Fire".

*Why (a):* every Fire in the book sends five or six, and one word for both would hide which was called. The real-world blitz figure we compare against also counts five or more rushers.

**Q5. How often should defences do these?** No real-world figure is on file for either.
- **(a) Recommended:** a Mug or a Stem on 1 in 10 of the calls that can wear one, split evenly where both fit (over the Fire calls and the Creeper only the Mug fits; over Double A and Zero, neither); the Creeper on 1 in 10 of the Cover 3 calls that would otherwise rush four (about 1 snap in 50 overall).
- (b) Your own figures from film.
- (c) Half those.

*Why (a):* it gives enough snaps to measure. The rates are league-wide until coordinators have tendencies, and results are reported per disguised snap, so a later figure rescales them without a rerun.

**Q6. What decides whether this worked?** Your warning says sacks will go up because a fooled protection fails. But today's offence already guesses the front in the huddle, so letting the line fix its guess will likely lower sacks on honest snaps by more than the disguises raise them.
- **(a) Recommended:** judge on the snaps where the front was disguised and it fooled the quarterback (he counted everybody or bought it), above all where a real blitzer came behind the disguise, against the same snaps undisguised. Your direction is mechanically expected where the slide was set toward the real blitzer, no back could be kept in, and the disguise showed its strength on the other side. Snaps where a back could be kept in are scored apart, because a back kept in against a man only showing blitz can still pick up the real one. The honest snaps and the season sack rate are reported alongside, never netted.
- (b) The season sack rate alone.
- (c) Both, with the season rate deciding.

*Why (a):* the season number moves by less than its own noise at every step. Judged on it, a correct build could read as a failure, or as a regression, by luck.

**Q7. The plan.** Build it in the six steps of §1 (3.0 to 3.5, with 3.2 landing in two parts, 3.2a and 3.2b), each landing and measured on its own, and the test
league's default caller moving once, at the end? The steps: measure first; then the shown rush (no
change); then the read and the line's options (no change); then the line answering what it sees; then
pressures and line games drawn on their own, with the creeper; then the Mug and the Stem.
**Recommended: yes.** Nothing is built until you have ruled Q1 to Q6. Each step that changes play would
come to you with its numbers, and each needs your merge word.

---

## 10. Built and measured

### 3.0 Measure first *(2026-10-16; no play change, nothing in `packages/` changed)*

**In short.**
- **The instrument is the same instrument.** It reproduces ADR-072's leash-50 shards on every field, accumulator hashes included. The pressure read lands where §2.2's formula puts it.
- **§4's magnitude anchor fails as written.** Caller v1, which builds its protection against the real rush, is sacked *more* than v4: +0.42 ± 0.05 points. So v1 − v4 bounds nothing. The replay bench shows why. v1 differs from v4 in four ways at once:
  - its protection is built against the real rush;
  - it has no pressure read, so no hot routes;
  - it keeps a released back in to block whenever the rush outnumbers the bodies;
  - it wears no coverage looks (+0.11 ± 0.04 of the gap on their own).

  With the looks out of both arms (v1 − v4 without looks = +0.31), the snaps where v4's hot route fired account for +0.41. That is everything v1 does differently on them: about +0.05 is v1 keeping the back in on the read-right `keepable` ones, and most of the rest is the lost hot route (**INFERRED**). Against v4 as played, the same snaps give +0.44 of +0.41. Protection information alone is worth about −0.7 to −1.3 points *a snap* on the short snaps outside `keepable` where no hot route fires.
- **Keeping a back in costs more than it saves, today.** On `keepable` snaps the released back is the quarterback's answer to the free rusher. The throw goes to him on 17% of them (a thrown ball is never a sack), and a rusher arrives on only 1.0% of those. v1 keeps in exactly the man v5 would keep in, on all 14,723 snaps, and its sack rate there goes from 9.1% to 15.8%. Applying §2.3's keep-in directly to v4's own calls gives the same direction: +6.2 points a snap with no hot route, +11.7 with one.
- **§4.3's informed channel is therefore re-derived up, not down** (§2.3's checks applied directly to v4's calls, set A):
  - keep-in-only about **+0.13** points of `sack_rate` (the rule from v1 gives +0.095 as a floor);
  - slide-only about **−0.01**;
  - full about **+0.12** (+0.45 a short snap).

  §4.1's "most likely down" no longer holds. The banner's direction stands, and keep-in is now its one sized driver; the creeper and the deceived channels also lean up, unsized until 3.4. Nothing in the build order changes: 3.3's keep-in-only arm prices this on its own, and its result is recorded as measured, the same rule §4.1 pre-commits for R2 on the deceived real-pressure population.
- **Backlog 28a's filter is named for the slants and the shallow cross.** On the first look, 62% of the really converted receivers the quarterback reads outside the checkdown (48% of all of them) sit below the effective throw bar, against 51% of designation-only receivers.

**What ran.** The scratch harness (`/mnt/project-files/arms/adr073Arm.test.ts`) ran in four shards from `packages/calibration`. Its in-repo copy was deleted before this commit. Every arm is on the flat league at leash 50.

| arm | caller | seeds | size |
|---|---|---|---|
| proof | v4 | `adr-072:leash-arm`, 240 rounds | 6,720 games |
| A4 | v4 | `adr-073:front-arm`, 240 rounds (set A) | 6,720 games, 593,962 dropbacks, each recorded |
| B4 | v4 | `adr-073:front-arm-2`, 720 rounds (set B) | 20,160 games |
| A1 | v1 (the ceiling) | set A | 6,720 games |
| A4n | v4 without coverage looks (`coverageMasks: []`) | set A | 6,720 games |
| bench | each recorded A4 dropback (its game, play number and situation) re-run alone from the game's seed, with each caller drawing its own call at the same address, under v4, v1, and v4 without looks | set A | 593,962 snaps × 3 |
| probe | the bench's v1 replay of v4's `keepable` and `slideable` snaps, tallying what v1 did with the man v5 would keep in and with the slide | set A | 14,723 and 23,495 snaps |
| direct | v4's own call on its `keepable` and `slideable` snaps, re-run with §2.3's keep-in, its slide, and both, against the same defence call and seed, each paired with v4 | set A | 14,723 and 23,495 snaps |

**The instrument is the same instrument ✅**
- On ADR-072's seeds, all four shards equal `adr072-flat-L50-{0..3}.json` on all 12 fields those shards carry besides `seconds` and `accFullSha256` (checked next).
- Each full-accumulator sha256 matches: 375a3a1b4707…, 85c85890aff5…, 5fa70857e673…, db45abad077d….
- On the bench, 593,962 of 593,962 v4 replays match their recorded play's events (sequence numbers aside) by a stable digest of their canonical form, and they fold to set A's game-level front exactly, in every population and field.
- Set A and set B agree on the sack rate: 16.490 ± 0.049 against 16.559 ± 0.028 (1.2 SE apart).
- Every mismatch counter the harness keeps reads 0. Those counters cover:
  - the extras and the pool against the stream;
  - on the 1,698,519 dropbacks without a line game (71.5%), the predicted contested and UNBLOCKED counts against the stream's;
  - a roll without extras, and extras without a roll;
  - a missing centre, concept or depth-chart team.

**v4's baseline (H3, H4, S10, S15, S17).** Set A + B: 26,880 games, 2,374,310 dropbacks, 88.33 a game. ± is one per-game (clustered) SE; the binomial SE differs from it by under 0.001 points everywhere.

| measure | rate | ± |
|---|---|---|
| `sack_rate` (sack ÷ dropbacks) | **16.542%** (ADR-070's 16.43% was on other seeds) | 0.024 |
| exit ÷ dropbacks | 77.702% | 0.027 |
| `threat_creation_rate` (pressured ÷ dropbacks) | 85.942% | 0.022 |
| conversion (sack ÷ exit) | 21.288% | 0.030 |
| completion (cmp ÷ att) | 37.398% | 0.039 |
| `int_rate` (int ÷ att) | 1.958% | 0.011 |

- **S10:** `sack_rate` stays FAIL: 16.54% against the real band of 5.58% to 7.54% (6.560% ± 15%).
- **H4:** the SE of an unpaired sack-rate difference is 0.034 points at 26,880 games and 0.068 at 6,720. Clustered, it is 0.0345 and 0.069, as §4 said it would be: at least the binomial figure.
- **S15:** the same SE for completion is 0.055 and 0.109 points; for `int_rate`, 0.016 and 0.031.

**Populations (H1, S3, S5).** Each is a pure function of the call (§3.0's table), on set A + B.

| population | share of dropbacks | sack | exit | conversion (sack ÷ exit) | pressured |
|---|---|---|---|---|---|
| `short` | **26.26%** (H1; July's 26.125%) | 16.30% | 80.98% | 20.13% | 88.89% |
| `slideable` | 3.95% | **7.44%** | 65.86% | 11.29% | 79.14% |
| `keepable` | 2.47% | **9.18%** | 98.53% | 9.31% | 100.00% |
| `releaseListed` | 35.55% | 9.34% | 69.32% | 13.48% | 79.11% |
| 5+ rushers | 24.08% | 16.74% | 81.43% | 20.56% | 89.37% |
| line game | 28.46% | 17.33% | 81.05% | 21.39% | 90.39% |

- `slideable` and `keepable` are sacked at about half the league rate already. `keepable` is pressured on every snap, because an extra is unblocked by definition, yet sacked on 9%.
- **S5:** slide checks at v5 ≈ Σ over `slideable` of P(TRUE ∪ COUNT) = 69,106 over 93,744 snaps (mean P .737), which is 2.91% of dropbacks.
- **S3:** kept-in men ≈ Σ over `keepable` of P(TRUE ∪ COUNT) × k = 39,404, which is 1.66% of dropbacks. k is 1 on every `keepable` snap.
- 3,412 snaps are both `slideable` and `keepable`.
- The deterministic accounting of the short snaps' extras gives 156,777 slid, 696,636 contested and 65,676 unblocked. The stream's UNBLOCKED count equals the last exactly.

**The read lands where §2.2 says ✅ (F2's analytic values).** Rolled reads on v4's short snaps, observed share with the analytic share in brackets, %:

| row | reads | DIAGNOSED | IDENTIFIED | COUNTED | UNSURE | MISIDENTIFIED | BUSTED | bite (COUNT ∪ LOOK) |
|---|---|---|---|---|---|---|---|---|
| STANDARD | 393,479 | 44.8 (45) | 15.1 (15) | 15.0 (15) | 14.1 (14) | 11.0 (11) | 0 (0) | 25.96 (26) |
| ZONE_BLITZ | 146,955 | 30.3 (30) | 15.0 (15) | 15.0 (15) | 13.8 (14) | 14.9 (15) | 11.0 (11) | 40.86 (41) |
| DELAYED | 38,084 | 25.3 (25) | 15.1 (15) | 14.7 (15) | 14.4 (14) | 14.9 (15) | 15.7 (16) | 45.21 (46) |
| ZERO | 45,009 | 19.9 (20) | 15.0 (15) | 14.9 (15) | 14.2 (14) | 15.1 (15) | 20.9 (21) | 50.84 (51) |

- The largest single deviation is DELAYED's bite share: −0.79 points, z −3.1. It is one of 28 comparisons, so it is inside what multiplicity allows. Every band cell is within 2.9 SE.
- §4.5's test re-scores this on Mug-worn snaps at 3.5.
- The analytic value is computed per snap from that snap's quarterback and centre Awareness, with no die. On the flat league it is the §2.2 table exactly.

**The ceiling, and why v1 − v4 is not one (H2, S7).** Game level, set A, paired by game (6,720 games), points:

| | sack | exit | pressured | completion | `int_rate` | conversion |
|---|---|---|---|---|---|---|
| v1 − v4 | **+0.418 ± 0.050** | +0.202 ± 0.058 | +0.027 ± 0.049 | −0.481 ± 0.079 | −0.040 ± 0.025 | +0.482 ± 0.063 |
| v4 without looks − v4 | +0.111 ± 0.037 | +0.662 ± 0.043 | +0.579 ± 0.036 | −0.060 ± 0.060 | −0.079 ± 0.020 | −0.038 ± 0.046 |
| v1 − v4 without looks | +0.307 ± 0.050 | −0.460 ± 0.056 | −0.553 ± 0.047 | −0.421 ± 0.077 | +0.039 ± 0.024 | +0.519 ± 0.062 |

v1 is not "v4 told the truth":
- v1 has no coverage looks; the looks are drawn only from v3 (frozen:408).
- v1 has no pressure read and so no hot routes: 0.12% of v1's dropbacks are short, against 26.3% of v4's.
- v1 keeps backs in whenever the real rush needs them.

The bench takes these apart snap by snap. It re-runs every set-A dropback alone, so the situation is held and only the call differs. Its v1 − v4 is +0.406 ± 0.022 points, against the game-level +0.418. Below, v1 is paired against v4 *without looks*, so the looks are out of both, by v4's snap ("read right" = TRUE or COUNT, margin ≥ 0, today's RECOGNIZED and READ_IT):

| v4's snap | snaps | Δsack a snap | of the aggregate | Δexit a snap | Δpressured a snap |
|---|---|---|---|---|---|
| not short | 437,809 | −0.10 ± 0.01 | −0.075 | −0.01 | 0.00 |
| short, read missed | 49,471 | −0.58 ± 0.11 | −0.049 | −8.97 | −7.19 |
| short, read right, no hot route fired | 49,451 | +0.22 ± 0.09 | +0.018 | −10.34 | −10.55 |
| short, read right, hot route fired | 57,231 | **+4.28 ± 0.15** | **+0.413** | +11.95 | +9.45 |
| **all** | 593,962 | +0.31 ± 0.02 | +0.308 | −0.46 | −0.57 |
| `slideable`, read right, no hot | 11,416 | −0.36 ± 0.14 | −0.007 | −8.23 | −11.24 |
| `slideable`, read right, hot | 5,860 | +11.18 ± 0.46 | +0.110 | +37.88 | +28.91 |
| `keepable`, read missed | 4,854 | **+5.69 ± 0.50** | +0.046 | −21.82 | −17.90 |
| `keepable`, read right, no hot | 6,943 | **+5.73 ± 0.41** | +0.067 | −29.70 | −26.60 |
| `keepable`, read right, hot | 2,926 | +10.32 ± 0.68 | +0.051 | −6.84 | −2.26 |

- **The snaps where v4's hot route fired carry the gap.** The four disjoint rows above `all` sum to it exactly, and the hot row is more than all of it (+0.413 of +0.308; against v4 as played, +0.439 of +0.406). On those snaps v1 is sacked 4.28 points more often and pressured 9.45 more. That row is everything v1 does differently there: about +0.05 of it is v1 keeping the back in on the read-right `keepable` ones (the last row), and v1 also keeps in a hot-spec check-release man on 1.3% of the row. The rest is mostly the lost hot route, whose throw had ended the play first (**INFERRED**: the bench does not take the hot route away on its own).
- **Protection information alone is worth little, outside `keepable`.** Taking v5's `keepable` snaps out of the no-hot rows gives the figures below. On these rows v1 still differs in who is kept in on about 1–2% of snaps: it keeps in a hot-spec check-release man on 0.7% of read-missed snaps, and releases a back v4 pulled in on 1.8% of read-right ones.
  - read right, no hot: −0.68 ± 0.08 a snap (42,508 snaps; exit −7.17, pressured −7.93);
  - read missed: −1.27 ± 0.11 a snap (44,617 snaps; exit −7.58, pressured −6.03).
- **Keeping the back in is the one place full information hurts, read missed or right.** The probe shows the mechanism (set A):

| v4's `keepable` snap | snaps | sack v4 → v1 | threw v4 → v1 | scramble v4 → v1 | a rusher arrived v4 → v1 |
|---|---|---|---|---|---|
| all | 14,723 | 9.1% → **15.8%** | 73.1% → 65.4% | 17.4% → 15.4% | 10.5% → 19.4% |
| v4 threw to the man v5 would keep in | 2,481 (16.9%) | 0.0% → **30.2%** | 100% → 34.4% | 0% → 29.6% | 1.0% → 38.7% |
| v4 threw elsewhere or did not throw | 12,242 | 10.9% → 12.9% | 67.7% → 71.7% | 20.9% → 12.5% | 12.5% → 15.4% |

  - On every one of the 14,723 snaps, v1's call gives that man no route and names him in its protection: v1 keeps in exactly whom v5 would.
  - The released back is today's answer to the free rusher. On 16.9% of these snaps the quarterback throws to him, and a rusher arrives on only 1.0% of those. A thrown ball is never a sack, so v4's 0.0% there holds by construction.
  - Kept in, the rusher is blocked (pressured −18.9 points across the population). But the quarterback has lost his outlet. On the snaps where v4 threw to him, v1 lets a rusher arrive on 38.7% and is sacked on 30.2%. That row is selected on v4's outcome, so it shows the mechanism, not its size. Across all 14,723 snaps the sack rate goes from 9.1% to 15.8%, and the direct application below sizes it.
  - So in today's engine **a free rusher with a released back sacks less often than a blocked rusher without one**. That is a model statement, and it is for the calibration backlog, not for this ADR. Threats come overwhelmingly from won reps: WON_REP is 84.1% of threat origins (set A + B, all dropbacks). Sack origins were not tallied.
- **v1 does not slide toward the extras.** On all 23,495 `slideable` snaps it keeps v4's slide side and names the extras in its pairings instead. So the bench prices *accounting for* the extras on those snaps, not the slide check itself.
- **The looks are their own effect.** v4 without looks against v4 is pressured +0.58 and exits +0.66 more, sacks +0.11 more, and throws 0.08 points fewer interceptions. That is the whole look catalogue (ADR-069 Phase 1's Show 2 and Show 1, plus ADR-071 step 2's Press, Split and Show 4) measured from the other side, and it is not this ADR's to explain.

**§4.3's bounds, re-derived (H2, S2, S4, S6, S7, S16, S17).** The ADR named no rule for turning the v1 − v4 gap into bounds (§3.0:182; §4.3:745). 3.0 **CHOSE** one, found it gives a floor for keep-in only (and no estimate for the slide), and then measured §2.3's two checks directly.

*The rule from v1 (CHOSEN):*

> A v5 step acting on population P acts on P's snaps whose read is TRUE or COUNT (on an honest front, CALL and LOOK answer nobody, §2.2). Its effect per snap is v1 − v4-without-looks on P's read-right snaps where no hot route fires. That is the only part of P's read-right snaps where v1 differs from v4 in protection alone: no hot route in either arm, and no looks in either. The projected aggregate is P's read-right share × that effect, and its interval is the effect ± 2 SE times the share.

It rests on three **INFERRED** assumptions:
- v5's protection after an adjustment is no better than v1's, which names every rusher. v1 blocks the kept man in a named rep with no contest; v5 adds him to the pool, where the extra gets a contested pickup he can lose.
- Where a hot route fires, keep-in costs at least what it costs where none does. On read-right `keepable` snaps, v1 − v4-without-looks is +10.32 ± 0.68 a snap with a hot route against +5.73 ± 0.41 without one, and v4 is pressured on all of them (v1 on 97.7%). Pricing the hot third at the no-hot rate therefore understates keep-in there by about a factor of two.
- The kept man's lost route costs what it costs v1. The probe shows it is the same man.

Under these, keep-in's projection is a floor. Slide-only's is not even an estimate: v1 does not slide, and its −0.36 a snap mixes v1 naming the extras (−0.82 ± 0.12 a snap on the 96% of those snaps that are not `keepable`) with v1 keeping a back in on the 3.7% that are (+11.75 ± 1.82).

*The direct application (MEASURED).* §2.3's keep-in and slide made as edits to v4's own call (§2.3's "Applied": the kept man loses his route and `readOrder` entry and joins `protectionScheme.available`; the slide points at the side with more extras), re-run against the same defence call and seed, and paired with v4 snap by snap. Set A, 593,962 dropbacks; ± is the snap-level SE.

| check | v4's snap | snaps | v4's sack rate there | Δsack a snap | of the aggregate | Δexit a snap | Δpressured a snap |
|---|---|---|---|---|---|---|---|
| keep-in | `keepable`, read missed | 4,854 | 10.7% | +6.47 ± 0.46 | (v5 does not act) | −11.39 | −7.97 |
| keep-in | `keepable`, read right, no hot | 6,943 | 9.2% | **+6.19 ± 0.39** | +0.072 | −21.39 | −17.13 |
| keep-in | `keepable`, read right, hot | 2,926 | 6.0% | **+11.69 ± 0.66** | +0.058 | −32.06 | −25.19 |
| slide | `slideable`, read missed | 6,219 | 10.4% | −0.88 ± 0.14 | (v5 does not act) | −9.13 | −11.58 |
| slide | `slideable`, read right, no hot | 11,416 | 6.6% | −0.36 ± 0.07 | −0.007 | −6.87 | −10.35 |
| slide | `slideable`, read right, hot | 5,860 | 5.7% | −0.43 ± 0.11 | −0.004 | −5.56 | −15.17 |
| **both, as v5 would on honest fronts** | read right, either population | 26,574 | 7.0% | +2.65 ± 0.13 | **+0.118 ± 0.006** | −13.51 | −15.31 |

- Keep-in costs sacks on every row, and most where a hot route fired (+11.7 a snap), though the kept man is never the hot receiver (§2.3). The bench does not say why.
- The 571 read-right snaps that are both `slideable` and `keepable` (0.10% of dropbacks) take both checks: +10.6 a snap with no hot route, +28.6 with one.
- An independent checker's replay probe measured this first and got the same per-snap figures for keep-in and the slide (Files).

| figure | filed (provisional) | re-derived |
|---|---|---|
| H2, the anchor "cannot recover more than v1 − v4" | v1 − v4 caps the correction (stale July +0.12 sack, +1.54 pressure) | **void as written**: v1 − v4 is +0.418 ± 0.050 sack and +0.027 ± 0.049 pressure, and more than all of it sits on the snaps where v4's hot route fired (+0.44 of the bench's +0.41). The direct application replaces it. |
| S2, slide-only Δsack | [−0.08, 0.00], central −0.03 | central **−0.01** (direct: −0.011 ± 0.002, −0.38 a read-right `slideable` snap, on 2.909% of dropbacks). The rule's −0.010 agrees by coincidence. The interval stays [−0.08, 0.00]. A hard floor is about −0.2: those snaps' own sack rate (6.3%) × their share. |
| S4, keep-in-only Δsack | [−0.08, +0.03], central −0.02 | **[+0.08, +0.14], central +0.13** (direct: +0.130 ± 0.006, +7.82 a read-right `keepable` snap, on 1.662% of dropbacks). The low end is the bottom of the rule's floor (+0.095 ± 2 SE, [+0.08, +0.11], the no-hot rate on every snap); priced by v1's own rows, hot and no hot, the rule gives +0.118. The high end is the direct figure + 2 SE. |
| S6, full Δsack | [−0.10, −0.03], central −0.05; on `short` −0.1 to −0.4, central −0.2 | **[0.00, +0.13], central +0.12** (direct: +0.118 ± 0.006). On `short`, central **+0.45** a short snap (+0.01 to +0.50). The rule's +0.085 (+0.32 a short snap) sits below it, but is not itself a floor: only its keep-in term is one, its slide term is not an estimate, and its two rows both count the 571 overlap snaps. The low ends (0.00; +0.01 on `short`) are keep-in's floor bottom (+0.08) plus S2's filed slide low end (−0.08). Observed within ±2 SE: on all dropbacks 0.034 (26,880 games) or 0.068 (6,720); on `short`, 0.067 or 0.134. |
| S7, pressure | down, by no more than the v1 − v4 pressure gap | down, about **−0.69** (direct, both checks as v5 makes them; alone, slide −0.35 and keep-in −0.32, and the 571 snaps that take both add about −0.01 more; v1's own read-right `keepable` rows also give keep-in −0.32). The rule's −0.77 prices keep-in at −0.44 with the no-hot rate on hot snaps and, by the first assumption, bounds the cut rather than estimating it. The v1 − v4 gap (+0.03 ± 0.05) bounds nothing for the same reason as H2. |
| S16, check-release targets | fall by about the kept-in share or more | the kept-in share is 1.66% of dropbacks (S3). On read-right `keepable` snaps v4 throws to the man v5 keeps in on 16.2%, so targets to him fall by about 0.0027 a dropback. Applied directly, targets to every eligible check-release man fall by 0.0027 a dropback, so the other men gain almost nothing. That is about 5% of today's 0.054 check-release targets a dropback. |
| S17, the triple | exit falls with pressure; conversion not negative in slide-only, ambiguous with keep-in | exit and pressure fall; with keep-in, sacks rise as they fall, so **conversion rises**. Direct: Δexit −0.60 (keep-in −0.41, slide −0.19) with Δsack +0.12, so conversion rises about +0.3 points. The rule gives Δexit −0.73 (keep-in −0.49, slide −0.24). On `keepable` under v1, exit falls 22.6 points while sacks rise 6.6. |

**What this changes in §4.1 and §4.5 (filed now, before any arm).**
- **Informed channel:** sign **up** at full, driven by keep-in. Slide-only is down and small.
- **Deceived, bluff:** leans **up**. A route lost to keep-in is now measured as a cost, and 28a names the filter for the slants and the shallow cross (below). For Sit and Swing the hot term stays undetermined.
- **Deceived, real pressure:** "COUNT and LOOK keep backs in against ghosts (free → contested: down)" is re-signed **up**, by the keep-in measurement. The slide toward the bluff stays up. LOOK's extra hot conversions are no longer signed: 28a names the filter only for the slants and the shallow cross, and on these snaps a real rusher is free, where the bench's hot row suggests a fired hot route cuts sacks (**INFERRED**). So the channel leans up, on snaps with an eligible `checkRelease` man as well as without one, with its hot term undetermined.
- **F4 (3.5's aggregate):** [−0.08, +0.10] stays as the interval. Its central +0.01 is withdrawn: every signed term now points up, the hot term (on real pressure, and for Sit and Swing on the bluff) is undetermined, and the sizes need 3.4's legal-look shares.
- **§4.1's aggregate:** whole-ADR `sack_rate` is now expected **up**: informed about +0.12, the creeper up, and the deceived channels leaning up. The banner's sentence stands, and its reason changes. §4.1's pre-commitment (if R2's direction fails on the deceived real-pressure population, the failure and its cause are recorded, not re-labelled) is unchanged.

**Backlog 28a: the filter is named for the slants and the shallow cross (bluff channel's sign).** On v4's hot-converted snaps, set A + B: the converted receiver's first QB_READ, leaving out the checkdown look, against the effective throw bar (`qb.throwThreshold` + the read system's delta).

| converted receiver | receivers | not read outside the checkdown | read | first look below the bar | targeted | completion when targeted |
|---|---|---|---|---|---|---|
| really converted (the route changes) | 96,591 | 21,897 (3,951 of them read only on the checkdown) | 74,694 | **61.9%** of those read (47.9% of all) | 40.4% | 41.9% |
| designation-only (same route, moved up the progression) | 148,900 | 10,170 (3,669) | 138,730 | 50.6% of those read (47.2% of all) | 58.6% | 45.2% |

- By route, the share of all converted receivers on that route whose first look sat below the bar. Receivers not read outside the checkdown count as not below, so these are lower bounds; on this basis the pooled figure is 47.9%, not the table's 61.9%.
  - Deep Cross → Shallow Cross ≥64%;
  - Seam → Slant ≥64%;
  - Post → Slant ≥57%;
  - Two-Minute Sail's 12 → 6-yard Out ≥50%;
  - Wheel → Swing ≥35%;
  - Seam → Sit ≥33%.
- 18.7% of really converted receivers' first looks (7.3% for designation-only) sit 50 to 55 points below the bar: an openness at or near zero.
- Backlog 28a's stated test is "if the slant sits below it systematically, the mechanism is named". It holds for the slants and the shallow cross even on the lower bound. Sit and Swing, 48% of real conversions, are not settled: the harness kept no per-route count of receivers who were never read. There is no baseline for unconverted receivers' first looks, and designation-only receivers sit below the bar on half of theirs, so the filter is named for those three routes, not as a property of every conversion.
- No tunable moved.

**The check-release guard's baseline, against real NFL (S16, §4.3's guard).**

| position | sim target share | real share, REG 2022–2024 | real season range | band (±15% relative) | sim catch | real catch |
|---|---|---|---|---|---|---|
| WR | 40.43% | 59.76% | 59.52–60.08% | 50.80–68.72% | 39.6% | 63.3% |
| TE | 39.61% | 21.66% | 21.01–22.39% | 18.41–24.90% | 40.2% | 70.9% |
| RB | 13.74% | 17.87% | 16.86–18.58% | 15.19–20.55% | 41.4% | 78.0% |
| FB | 6.23% | 0.58% | 0.50–0.72% | 0.50–0.67% | 41.1% | 73.9% |

- Released check-release men with no hot spec draw 0.0540 targets and 0.0216 receptions a dropback (0.1677 targets a dropback on `keepable` snaps).
- **Every position is outside its band today.** The band test therefore cannot pass at 3.3, so the guard reads the direction of each position's share against this baseline. The size of the fall is §4.3's "about the kept-in share or more", re-derived as S16 above.
- The low catch rates (about 40.6% of targets; 37% completion once throwaways count as attempts) are the flat league's known low completion (ADR-072 §10), not this ADR's.
- Receptions are credited to the catcher, as the engine's stat lines and the real data do. That includes 6,055 receptions by centres who recovered a tip, which the table leaves out.

**Every other figure §4 asked 3.0 to file.**
- **S1:** 0 leash rolls at 50.
- **S8, free-runner origins (share of threats):**
  - WON_REP 84.10%;
  - PICKUP_LOST 7.43%;
  - STUNT_LOOPER 6.94%;
  - UNBLOCKED 1.53%.
- **S11 and S13:** constants, as filed (D95 never BROKE at a breach of 10; discipline is read only at leash:65).
- **S14:** of 696,636 contested pickups, 67.3% carry today's +10 and 32.7% the −10; the no-pointing arm takes those away. 53.8% are won.
- **T2:** `blitz_rate` 24.08%, PASS against 23.923% ± 15%.
- **T3:** line-game share 28.46%. Complexity:
  - T_E .655;
  - T_T .139;
  - TRIPLE .137;
  - DELAYED .069.

  The prior is T_E .68, T_T .20, TRIPLE .05, DELAYED .07.
- **T4:** blitz disguise on 5+ rushers:
  - STANDARD .502;
  - ZONE_BLITZ .306;
  - DELAYED .106;
  - ZERO .086.

  The prior is .50, .27, .12 and .11.
- **T5:** `disguise_rate` 31.64%.
- **T6:** shell × rushers, share of dropbacks:
  - ZONE: 4 rushers 58.96%, 5 rushers 14.77%, 3 rushers 0.11%;
  - MIXED: 4 rushers 16.86%, 6 rushers 5.47%, 5 rushers 2.60%;
  - MAN: 6 rushers 1.24%.
- **T7 and F1:** rate 1 in 10 (Q5) × legal share. The legal share has no code until 3.4.
- **F3:** on short snaps, 53.8% of calls carry a hot spec, and the hot route fires on 53.6% of read-right short snaps.
- Every later-step bag the harness carries reads 0, as it must at 3.0: kept-in men, slide checks and PROTECTION_ADJUST wanted and made, pictures, BROKE-below-30, front-look and creeper snaps.
  - §3.0's bag for snaps whose only coverage lie was on a kept-in man is not yet in the harness. 3.3's harness adds it, as §4.3's guard needs.
  - The illegal-look counter has no producer until 3.5, so its 0 is not a measurement.
  - Front-look snaps are keyed by LOOK tag id, not yet by §3.0's shownRush-differs rule or by picture.

**Departures from §3.0 as written.**
- **The real-side source is nflverse `player_stats`, not NGS receiving rows.** NGS rows cover only qualifying receivers and carry no running backs, so they cannot give an RB share. The source used is weekly REG rows for 2022–2024: 51,802 targets, from `nflverse-data` release `player_stats/player_stats.csv.gz`. It is not yet an ingested calibration source.
- **One arm and two tallies beyond the ceiling run:**
  - v4 without looks (game level and on the bench), to take the looks out of v1 − v4;
  - the probe;
  - the direct application, because the rule from v1 turned out to give a floor only for keep-in, and no estimate for the slide.
- **28a's definitions:**
  - "really converted" is playbook's own `isDesignationOnly` read off the card. A name comparison would misfile Two-Minute Sail's 12 → 6-yard Out.
  - "first look" leaves out the checkdown look, which the engine judges against a different bar.
  - The bar is compared with effective openness, which the throw decision reads. §3.0 and backlog 28a said perceived openness, which gives the same 61.9% and 50.6% at the precision shown.
- **The direct application** re-runs v4's own call with §2.3's keep-in and slide made as call edits. That stands in for v5's adjustment, which has no code until 3.3, so its figures are an estimate of 3.3's, not a bound.
- **F2's analytic check is made on v4's rolled reads,** since no Mug exists before 3.5.

**Files** (`/mnt/project-files/arms/`, README section "Front arms (ADR-073 step 3.0)"):
- `adr073Arm.test.ts`, the harness, and `adr073-run_arm.sh`, which runs its four shards;
- `adr073-<arm>-<shard>.json`, each game shard without its full accumulator (about 2.4 MB, 6.8 MB for set B), keeping its sha256; the bench, probe and direct shards carry none; `adr073-slim.py` makes them;
- `adr073-analyze.py`, its output `adr073-report.md`, and `adr073-figures.json`;
- `adr073-realshares.json`, built by `adr073-realshares.py` from nflverse;
- `adr073-records-A-<shard>.jsonl.gz`, the bench's 593,962 recorded dropbacks;
- `adr073-review-probe.ts` and `adr073-review-probe-pooled.json`, an independent checker's replay probe: who each caller keeps in, by stratum (the 0.7%, 1.3% and 1.8% above, and slide-only's −0.82 and +11.75), and the direct application it measured first.

### 3.1 The shown rush, identical to the played rush *(2026-10-16; no play change)*

**In short.**
- **Every call carries the rush it shows, as the same array as the rush it plays.** Playbook's `instantiateDefense`, the engine's six coverage cards and every hand-built test call build it that way; test calls that override `rush` go through `withRush`. Identity (`shownRush === rush`) is asserted on every corpus call, bare and masked, every engine card and fixture builder, the engine's own caller through a game, and `callDefense()` for every frozen caller version (v1–v4).
- **The validator** rejects a shown rusher who neither rushes nor covers, and a man shown twice. It has no one-spot rule: a man shown rushing who drops, two shown men in one gap, and a shown list shorter than the rush are all accepted.
- **PLAY_START** states the shown rush on pass and run plays (alignment resolved as the played rush's is, side and gap carried, no move), and the played rush now carries its gap. On every pass and run PLAY_START of the corpus the two agree field for field, `move` aside. The physics reads no gap: stating gaps on a card changes nothing after PLAY_START, through both of a stunt's plan rebuilds.
- **Proof (set A: v4, `adr-073:front-arm`, 6,720 games).**
  - **Numbers:** 0 of 2,874,388 differ from 3.0's shards; the accumulator hash is equal on all four.
  - **Whole games:** with `shownRush` and the rush's `gap` taken out of PLAY_START, all 6,720 streams are byte-identical to main's (sha256, same event counts). Every game's unstripped stream differs from main's, so the new fields are really there.
  - **Dropbacks:** all 593,962 match the digests 3.0 recorded once stripped, and none matches unstripped.
  - A rerun of main on the same harness reproduced 3.0's shards and all 593,962 dropback digests exactly.

**Departures from 3.1 as written.**
- **The validator runs on the run call too** (`assertCoherentRunCall`). The run PLAY_START looks every shown rusher up on the roster, so without the rule a shown man who is not on the call would crash the echo instead of being rejected as incoherent.
- **The echo has its own type and one owner.** Its elements are a new engine-local `ResolvedShownRusher` (contracts' `ShownRusher` with the alignment resolved), built by `resolvedShownRusher` in `rushThreat.ts` for both payloads, beside `resolvedRushAssignment`. The type joins ADR-018's boundary pin (`resolutionProducts.test.ts`): it is the same "same shape, different fact" case as `ResolvedRushAssignment`.
- **`resolvedRushAssignment`'s `gap` is a required `RunGap | undefined` argument**, as `side` is, not an optional one. Under `exactOptionalPropertyTypes` an optional `gap` refuses the callers' `RunGap | undefined`, and a required key makes the compiler find every caller. The output key is absent when the card states none. That added one compile site to the list (`resolutionProducts.test.ts`'s owner test).
- **C2 and C3 were fixed in more places than listed.** C2 also in the tunables `slideIsUncontested` doc. C3 also in the `RushMatchup.side` doc (passPlay), the `declaredRush` doc (instantiate) and two comments in `resolutionProducts.test.ts`.
- **The gap pin went red nowhere.** Its grep is a recipe inside the failure message, which no assertion runs. Its text now names the echo hits as a carry, says branch (a) means something DECIDES from the rush gap, and names 3.5's `applyFrontLook` as the expected first decider. The expiry date stands.
- **Where the tests live** (the ADR named no homes):
  - engine `test/shownRush.test.ts`: the cards, fixtures and engine caller, the echo, gaps through stunts, determinism, and the validator. The calls a test file builds for itself cannot be imported, so a TypeScript-parser scan of the engine's source and tests fails on any object literal that spreads a call and sets `rush` without `shownRush`; it is mutation-checked against a reverted `withRush` site;
  - playbook `shownAssignments.test.ts` (every corpus call; its header now says why the rush is asserted by identity where coverage is not) and `masks.test.ts` (masked calls);
  - calibration `test/shownRushStream.test.ts`: each frozen caller version over three games, identity on every call and the echo on every PLAY_START. The stream test is here because only the corpus authors gaps; the engine's fixtures author none.

**How the proof ran.** The 3.0 harness, unchanged except for two scratch digests (each whole game, and each dropback, with the two new facts stripped), ran set A in four shards on this tree and on a clean worktree of main (02278f9). Its in-repo copy was deleted before this commit.

**Files** (`/mnt/project-files/arms/`, README section "Front arms (ADR-073 step 3.1)"): `adr073Arm31.test.ts` (the harness with the strip), `adr073-run31.sh`, `adr073-proof31.py` and its output `adr073-proof31.json`.

---

## Appendix A. How the design panel's disagreements were settled

| # | disagreement | resolution (re-checked) |
|---|---|---|
| 1 | Where `applyLooks` stamps `coverageDisguise`: masks:490 or :493 | **:493** (`const coverageDisguise = …`), returned at :495. |
| 2 | Four bands with flags (architecture-first) against six | **Six.** ADR-068:52-59: §5.1's ladder "is the shape for every read here". R7 governs the disguise scale, not the ladder. Labels are new (repo grep: 0 hits). |
| 3 | Mug row: stamp ZERO / DELAYED (football-first) or the call's own | **Call's own.** spec:402 "Standard blitz (LB walked up): +0". ZERO without `noDeepHelp` fails validate:999-1008, and stamping would move `BLITZ_DISGUISE_MIX`. Q3 tells the owner the difficulty in football words. |
| 4 | Presentation of existing pressures: good football, or scope creep | **Excluded and settled.** Scoreable-first's version also contradicted its own example: Fire Zone's card says its picture is a **four-man** rush (defCards:489-490), not six shown. The useful part, the end in his stance, is delivered whenever a front look is worn. |
| 5 | Stem: draw now, or defer to ADR-068's step 5 (re-identification) | **Draw now** (R22: "§9.6 stands as written"). Legal only where three or more down linemen rush and none drops, it shows no ghost and changes nobody's answer; its one effect is the slide set, through moved men (`stemLive`). Its thinness is predicted and reported, not asked. |
| 6 | Ghosts on plain snaps (architecture-first) | **None.** Two judges and two designs reject phantoms on honest fronts. It is offered to the owner as Q2(c). It also keeps 3.2b exactly reproducible. |
| 7 | Phantom belief (football-first) | **Dropped.** It writes into E's belief channel (passPlay:2117-2132). "Hot into a dropper" emerges against the played coverage. |
| 8 | Engine change moving main with no bump (football-first, architecture-first) against caller-only (scoreable-first) | **Engine inert on v4 by construction; options stamped from v5** (R30). The engine still picks, so it works in the game loop (simulateGame:552-576). |
| 9 | Full re-pair in the caller (scoreable-first) | **Rejected.** It goes beyond ADR-068's menu, depends on the defence being drawn first, and would largely undo ADR-024. The hot rule stays, so v5's hot conversions are identical per snap (contradicting scoreable-first's predicted fall in hot routes, which came from re-pairing). |
| 10 | Pool for keep-in: the real pool (architecture-first, "uses truth") or `declaredAvailable` + K (football-first, "biased up") | **Perceived per band:** TRUE counts a protector whose man dropped as free; COUNT counts one free only if his man is neither played nor shown rushing; LOOK judges by the shown rush alone. Each equals the real pool on honest fronts. |
| 11 | Keep, rename or retire the ±10 | **Keep, exactly today's per-snap rule:** +10 on every contested pickup iff the band is one of the top three (the TRUE or COUNT picture), else −10, with keys and labels unchanged (a rename would change strings in an inert step). Retirement is priced by the no-pointing arm and comes back to the owner with its numbers; no new question. |
| 12 | Leash arms at Discipline 60 against D95 | **D95 pair.** Verified at leash:63-69 and tunables:300-307. Discipline is read only at leash:65. The arms/adr072Arm quadrant pattern shows how to build the league. |
| 13 | Coverage lies before keep-in (two judges) against a provisional protection (scoreable-first) | **Before the leash, on the routes he will run.** Hot men are excluded from the coverage decisions, as today (passPlay:2051-2052). A man certain to be kept in (PROTECTION_ADJUST at or below the leash) has no track, so no coverage die is thrown for a man with no route. Below leash 30 nobody is certain: on a BROKE roll a coverage die, or a coverage want that sizes the breach, may concern a man then kept in. That case is **accepted, not recomputed**: K's tracks are filtered, not rebuilt (the beliefs ride on them), the die and its PRESNAP_READ stay, and those snaps are counted in their own bag (§2.4 step 9). There is no revert recomputation. On v4 this is today's order. |
| 14 | Sim pressure: a card carved from Sky, a replacement die, or a creeper tag | **A creeper sub-draw in the decomposition.** Its counterfactual is the same coverage bare on the same snap, which is stronger than either card. Under ADR-071 rulings 1 and 4 (R24, R27) a pressure call is a coverage plus a pressure tag, so this is how ADR-069 §9.6's "simulated-pressure card" (R22) is delivered; Q4 lets the owner say if they meant a card of its own. |
| 15 | Decomposition before or after front looks | **Before.** R20 ends there; no card is thrown away; the Mug is authored against its shipping mix. |
| 16 | Blitz-rate source: 0.26 prior (architecture-first) or card-weight marginal | **Card-weight marginal per situation, by construction,** asserted by a test: P(five or more) and each host coverage's share hold to 1e-12, and the pressure-by-coverage joint moves by design (backlog 8b). |
| 17 | Base Run Blitz fallback asked (scoreable-first) or settled | **Settled by R25,** and unreachable on today's formations (ADR-071:457-458: every formation has a #1 to each side). No question. |
| 18 | 'Unconditional' and R2's scoring: settled by the designer or asked | **Asked**, in football words: Q2 (when the read happens) and Q6 (what judges). |
| 19 | Arm scale, and "~70 dropbacks a game" | **88.4 a game** (arms/adr072-report.md: 2,377,214 / 26,880). The binomial SE of an unpaired sack-rate difference, assuming independent dropbacks, is about 0.034 pp at 26,880 games and 0.068 pp at 6,720; the per-game (clustered) SE the harness reports will be at least this. Reproduction at 6,720, per ADR-072. |
| 20 | Harness template name | `adr072Arm.test.ts` exists; `adr07xArm` does not (directory listed). |
| 21 | `reorderForCoverageRead` `made` filter | Adopted. passPlay:2086 verified. |
| 22 | Football-first's "slide-only: UNBLOCKED unchanged" | Verified from preSnap:282-330: each unnamed rusher consumes one pool body whether slid or contested. |
| 23 | Architecture-first's internal contradiction (risk 3 against §2.4) | Resolved: hot conversions reach E's population, as today, and are reported. Keep-in reaches E only through the kept-in man: his lie is never formed, so on snaps where it was the only lie no coverage read is rolled. That count is reported per arm, and `int_rate` is decomposed onto those snaps (R3). |
| 24 | Stale SURFACE row in 3.0 (football-first) | Not here; one reason per pin. |
| 25 | `pressureMetrics:346-351` rewrite (architecture-first) | **Not needed.** Honest fixture, no options, no ghosts, so the test stands untouched. |
