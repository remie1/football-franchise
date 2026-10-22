# ADR-073 (DESIGN): The front — the shown rush, the pressure read, and the line's answer

- **Date:** 2026-10-16
- **Proposed by:** Orchestrator, building ADR-069 Phase 3 (= ADR-068 step 3 = ADR-071 step 3) in the
  order ADR-069 §10 ruled
- **Status:** **accepted; 3.0 measured, 3.1, 3.2a and 3.2b built and merged; 3.3 built and measured (§10), then re-scoped to the slide check alone on the owner's ruling on the ADR-077 proposal (Q1, 2026-10-21) and merged; the predictions that counted on the keep-in were re-filed, and 3.4's mechanics as built and its scoring rules filed, before any arm; 3.4 built and measured (§10) and merged; 3.5 next, its stale references and its unscoreable claims re-filed, and its mechanics as built and its scoring rules filed, before any arm (§10).** The owner asked for the draft *(owner, 2026-10-16:
  "yes" to "Should I draft the front design now?")* and ruled all seven of §9's questions as
  recommended *(owner, 2026-10-16, decision cards)*. Every contracts edit in §3 still needs its own
  yes before it is made, and nothing merges without the owner's word. 3.0 re-derives §4.3: the
  informed channel is now expected to raise `sack_rate` through keep-in (§10). The design, the
  rulings and 3.0 merged to main *(owner, 2026-10-16: "Yes, merge" on the decision card)*. 3.1's
  four contracts edits were made on the owner's typed yes naming each *(owner, 2026-10-16: "Yes, make
  contracts edits P1, P2, D1 and D3a for ADR-073 step two.")*. 3.2b's six were made the same way
  *(owner, 2026-10-16 23:41Z: "Yes, make contracts edits P3, D1, D3b, D5, D8 and P2’s doc for ADR-073
  step 3.2b.")*. 3.3 needed no contracts edit; caller v5 is opt-in, and the default stays v4. 3.4 needed no contracts edit; caller v6 is opt-in, and the default stays v4. 3.5's five contracts edits were made on the owner's typed yes naming each *(owner, 2026-10-21 22:01Z: "Yes, make contracts edits D2, D4, D6, D7 and P2's tense for ADR-073 step six.")*.
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
| §10's 3.4 figures (2026-10-21) | **MEASURED** — runs M0–M14 on ccd75bb, from the scratch harness H34 in `/mnt/project-files/arms/adr073-p34/`, through its report `adr073-report34.md` and figures `adr073-figs34.json` (analyzer 28be58cb; every figure equal to the frozen 4a20eba8's); the football-unit conversions, the bench splits and the run-game figures **COMPUTED** from the same shards by the two independent verifications (`verify/verification-summary.md`) and the rushing check (`verify/rushing-check.md`), as §10 names them; the expected values beside them **COMPUTED** before any arm, in the block §10 files before the runs; the few figures §10 marks **COMPUTED** here (the joint − v5 game-level conversion, the five-man man split, the total-variation distance, and the drift's completions, attempts and dropbacks) recomputed for this write-up from the same figures and shards; `CREEPER_RATE` 0.1 (`distribution.ts:244`, pinned at `pressureDraw.test.ts:650-654`) **CHOSEN — provenance NONE**, the owner's 1 in 10 (the creeper-rate row above); `DIME_COVER_1`'s duties (`coverageCatalogue.ts:76-132`: the dime back on #3 to the right, the hole when there is none, seven or more to go) **CHOSEN — provenance NONE**, a football judgement, with no real dime Cover 1 on file to compare against (line 350); the real man/zone × rushers joint **REPORTED** — the nflverse participation feed, 2022–2024 (`pbp_participation_2022..2024.csv`, their sha256s in `realjoint34.json`), 64,293 rows charted with both fields of 142,237, tabled by `adr073-realjoint.py` (**COMPUTED**); what §10 marks **INFERRED** (among them the size per creeper run and the paths through the code) is inferred |
| The fantasy review of 3.4 (2026-10-21) | **REPORTED** — the fantasy advisor's gate memo, `verify/fantasy-gate.md` (PASS WITH NOTES), quoted in §10; its per-player figures are its own computations |
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

### 3.2a The split *(2026-10-16; no play change)*

**In short.**
- **The pre-snap phase is three stages, called apart.** `resolvePreSnap` is gone. `readPreSnap` does the accounting, the §5.3 recognition roll and the hot routes; `resolvePickups` does the slide, the pickup contests and the free runners; `resolveStunts` does §7.3's line games.
- **`simulatePassPlay` calls them in §2.4's order:** the read stage, then the receiver tracks, the coverage lies, the coverage read and its beliefs, the wants and the one leash roll; then the pickups, the line games, the matchups and the recovery spots; then `reorderForCoverageRead`, PLAY_START, and the emission in the old order (every PRESNAP_READ, then the pickup CHECKs, then the stunt CHECKs). Steps 4 (`decideProtection`) and 9 (apply) come in 3.2b; on v4 they would do nothing.
- **Proof (set A: v4, `adr-073:front-arm`, 6,720 games), against 3.1's own proof run, nothing stripped.**
  - **Numbers:** 0 of 2,874,388 differ from 3.1's shards, every key compared both ways; each shard's whole output (timing aside) has the same hash.
  - **Whole games:** all 6,720 streams have the same sha256 as 3.1's, with the same event counts.
  - **Dropbacks:** all 593,962 digests equal 3.1's.

**Departures from 3.2a as written.**
- **The stages have names, and stage two takes the protection as arguments.** The design named no functions. `resolvePickups` is handed the pool and the slide side rather than reading them off the call, so that 3.2b's apply step can hand it the protection as run (keep-in widens the pool, a slide check moves the side) without re-splitting. `resolveStunts` is handed the centre and the line games. Each stage copies what it is handed and returns a new list.
- **Tests, where the table said "proof only".** Three were added to `blitz.test.ts`, because the claim rests on a property a later edit could break silently: dice drawn on the pre-snap fork between the stages (the coverage read's, the leash's, and raw draws) move nothing, on a man card, a slide card and a card with nobody kept in; a stage leaves the read and stage two's plans untouched; and, on a blitz card given a coverage lie and a leash of 0 so that all five pre-snap rolls happen, the play emits the recognition, coverage and leash reads in that order, then the pickups, then the line games. Each was mutation-checked: a pickup, stunt or recognition die that read its parent, a pool consumed in place, plans rewritten in place, the two CHECK lists emitted in the other order, and the reads reordered or emitted after the CHECKs all fail them.
- **Three comments named the old function** and now name the stage they mean (`validate/playCall.ts`, `unblockedProtector.test.ts`, calibration's `caller/anticipate.ts`; the last also said the idle protector still stands idle, which ADR-026 ended, and is now in the past tense). The historical ADRs and the backlog keep the old name.

**How the proof ran.** 3.1's harness (`adr073Arm31.test.ts`, unchanged) ran set A in four shards on this tree, and `adr073-proof32a.py` compared every shard's numbers, every game's sha256 and every dropback's digest with 3.1's proof run, whose code differs from what merged as d9351a3 only in comments. The script was checked both ways first: 3.1 against itself passes, and the pre-3.1 main against 3.1 fails on all 6,720 games, as it should, because its streams lack 3.1's new fields. The harness's in-repo copy was deleted before this commit.

**Files** (`/mnt/project-files/arms/`, README section "Front arms (ADR-073 step 3.2a)"): `adr073-proof32a.py` and its output `adr073-proof32a.json`; the harness and run script are 3.1's.

### 3.2b The graded read and the line's options *(2026-10-17; no play change)*

**In short.**
- **The blitz read has six bands and four pictures.** The bands are §5.1's, at the coverage read's own cuts (DIAGNOSED, IDENTIFIED, COUNTED, UNSURE, MISIDENTIFIED, BUSTED), and each names its picture (TRUE, TRUE, COUNT, CALL, LOOK, LOOK). The point-out still splits at margin 0, so every snap's ±10 is today's.
- **The read works out what the front shows.** A new pure module, `sim/pressureRead.ts`, holds §2.2's accounting (extras, ghosts, moved men), each picture's answer set and slide set, the perceived pool, the trigger's "would the pictures decide alike" test, `decideProtection` (keep-in first, then the slide check) and the effective call. It throws no dice and reads no gap.
- **The read rolls** on an unnamed rusher, as today, or on a ghost or a moved man when the four pictures would decide differently. **Hot routes convert** iff the picture answers somebody.
- **The line's two options are on the call** (P3): `checkRelease` on both arms, `slideCheck` on SLIDE. The validator refuses a check-release man listed twice or running no route, and a MAN protection that states `slideCheck`. Playbook's `protectionOptions` states them where the card allows; no caller uses it yet.
- **The adjustment is a rung at 30 in the one leash roll**, applied as the effective call in §2.4's order. When made, the kept-in men leave `routes`, `readOrder` and their tracks (filtered, not rebuilt), and join the pool after the declared men and before the windfalls; a checked slide moves the slide side.
- **PLAY_START** appends `protectionScheme` (as called) on every pass play whose call states a scheme (every corpus call does), `pressurePicture` iff the read rolled, and `protectionAdjustment` iff wanted. `routes` and `availableBlockers` are as run.
- **Proof (set A: v4, `adr-073:front-arm`, 6,720 games), against 3.2a's own proof run.** On v4 the stream changes in exactly three places: the band label, `pressurePicture` and the `protectionScheme` echo.
  - **Numbers** (folded from the raw stream): 0 of 2,874,324 differ, every key compared both ways. The two summary bags the new fields reach are left out and checked on their own (below).
  - **Digests**, with the three mapped back (the two fields deleted, the band recomputed on the old four-row table from its own margin):
    - **Whole games:** all 6,720 streams have the same sha256 as 3.2a's, with the same event counts. Unmapped, all 6,720 differ, so the new fields are really there.
    - **Dropbacks:** all 593,962 digests equal 3.2a's (none missing). Unmapped, none does. Because the map only rewrites the band, every read's `roll.total` and `target` are 3.2a's.
  - **Per read:** 156,153 reads rolled, exactly 3.2a's count. Every band is the six-band label of its margin; every old label went to an allowed new one (READ_IT to DIAGNOSED 59,883 or IDENTIFIED 15,633; RECOGNIZED to IDENTIFIED 7,793 or COUNTED 23,373; MISSED to UNSURE 22,038 or MISIDENTIFIED 9,387; FOOLED to MISIDENTIFIED 10,159 or BUSTED 7,887), and none crossed margin 0. The pictures were TRUE 83,309, COUNT 23,373, CALL 22,038 and LOOK 27,433. Every picture sits on a rolled read and every rolled read has one; under TRUE and COUNT the answers are the call's unaccounted rushers, under CALL and LOOK nobody; every placed man matches the rush echo.
  - **Never on v4:** a `protectionAdjustment`, and a leash read. `protectionScheme` deep-equals the call's on all 593,962 pass starts.
- **Tier B** (`FF_BAND_GATE=1`, the band-table gate, 97 corpus runs): **green**. It counts 28 tables, 137 rows, 270 cells, 55 orderable and 4 string columns. 10 columns invert before exemption, and the derivation is scoped to their 51 cells. The verdicts are LIVE 39, GUARDED 11 (the exemption set) and UNREACHED_ROW 1, as in ADR-037's recorded run, and the four inversions that survive are the four already adjudicated.

**Departures from 3.2b as written, and the details it left open.**
- **`recognized` stays**, beside `picture`, as the point-out flag (the top three bands), and keeps its name on `PreSnapRead` and `resolvePickups`, so 3.2a's stage tests compile unchanged. A test ties it to TRUE or COUNT on every row. The band census is therefore 137 rows, 270 cells, 55 orderable and 4 string columns, and `bandGuards`' count holds at 45.
- **The slide check is also gated on `blitzPickup.slideIsUncontested`.** With that tunable off a slide answers nobody, so a check would change nothing and is never wanted.
- **Where the pictures place a man:** at his shown side if the shown list states one, else his played side. Alignments are compared resolved, as §2.2 says, so a shown entry that omits its alignment means the position's default, and can make a man moved. So 3.5's `applyFrontLook` must copy the men it leaves alone verbatim.
- **The trigger's "decide alike" test** compares, across the four pictures, whether hot routes convert (the picture answers somebody and the call has a hot route), the wanted slide side, and the kept-in men in order.
- **CALL's perceived pool** (undefined in §2.3 step 1) is the real pool, declared men and windfalls. CALL answers nobody, so it never keeps anybody in, and the pool is never emitted.
- **The effective call drops kept-in men from `checkRelease`**, so the call as run passes the validator. Its routes are the called routes minus K, and only the recovery spots read it; PLAY_START's `routes` are the routes he ran, hot conversions included, minus K.
- **`protectionScheme` is echoed as called, as §2.8 says, and omitted when the call states no scheme.** The protection as run is `routes`, `readOrder`, `availableBlockers` and `protectionAdjustment` read against that echo: the slide side at the snap is `protectionAdjustment.slideSide` when made, else the called one.
- **The validator states two rules, not four.** A check-release man must run a route in the call, once. A man who is `available` or a `protection[].blocker` runs no route (the rules above refuse a route-runner who is either), so the route rule refuses him and P3's disjointness needs no rule of its own. The engine's tests refuse an unknown man, a man listed twice and a blocker; playbook's coherence mirror refuses each of P3's four lists. `slideCheck` on a MAN protection is refused at runtime as well as by the type, because a spread of a SLIDE call can carry it past the union.
- **`protectionOptions` returns the whole `ProtectionCall`**, built separately for each arm, rather than a bag of options to spread in, so a MAN arm can never carry `slideCheck`. The engine, not playbook, leaves out men already converted hot.
- **`buildRecoverySpots` is exported from `passPlay.ts`** (not from the index) for its test, and a source pin holds its one call site to the effective call and the filtered tracks. The mutation that handed it the call as called passed every behavioural test until the pin was added.
- **Each contracts edit landed with its producer:** D5 with the six bands (1/4), P3 with the options (2/4), D1, D8 and P2's doc with the pressure read (3/4), D3b with the adjustment (4/4).
- **Left for 3.3:** the optional calibration smoke test (every corpus pass concept, with `protectionOptions` applied, through the engine validator and one snap), because v5 is the first caller; and debug renderer lines for the three new PLAY_START fields, which on v4 add nothing a renderer cannot already print (the picture follows from the band, the scheme is the call's, and no adjustment is ever wanted). **Left as it is:** contracts `playcalls.ts`'s sentence "There is no shown-vs-played pair anywhere in the engine today", out of date since ADR-068 and outside this petition; it can join 3.5's contracts batch with the owner's yes.
- **D5 keeps its words.** A capital and a full stop fit it to the sentence it now opens.
- **Tests** (the ADR named no homes): engine `test/pressureRead.test.ts` (71: the band table, then falsifier groups A and B, on a new `buildFrontScenario` fixture that is honest by default and sits in 3.1's identity list); `playCallCoherence.test.ts` (6: P3's accept and refusals, and a call with the options playing exactly as one without while the read does not roll); playbook `test/protectionOptions.test.ts` (2: the options over the pass corpus against every defensive card, and the coherence mirror's refusals of P3's four lists). Twenty-four mutations of the new code are each caught:
  - ten in group A: the trigger, hot routes, the pool, moved men, keep-in, the slide check, the alike test, LOOK's slide set;
  - seven in group B: pool order, the recovery call site, K*, unfiltered tracks, the rung never wanted, the slide not applied, routes echoed as called;
  - seven from the review (below).
- **The review** (five lenses, each finding put to skeptics) found no play bug. It found six places where a broken version of the new code still passed every test, and six comments the step had made false. All twelve are fixed in this commit.
  - **Tests.** The rule that a man whose route converts hot is never kept in is now tested through the read and the stream, on a check-release back with a hot flat. A BROKE keep-in keeps the other receivers' misreads (a second lie, on a man who keeps his route). A windfall counts as the slide check's body. The slide's majority is taken over the sided men, and the body must be found by a sided extra (the fixture can now build a rusher with no side). The moved-man comparison now keeps somebody in. The recovery spots' source pin also pins `runCalls` to the effective call. The seven broken versions the review built each fail a test now: the hot set emptied, the tracks rebuilt, windfalls dropped from the bodies, keep-in sized off the slide set, the majority over every placed man, an unsided extra finding the body, and the recovery spots handed the call as written.
  - **Comments.** These were rewritten: the rung's cost (a route for each man kept in), why a man is certain to be kept in once the leash opens the rung, where `PlacedRusher` takes its side, `PreSnapRead`'s pool and routes (as the card offers them, before any adjustment), calibration's `hotConversionDropbacks`, and the P3 test that said nothing reads the options (it now pins that the read did not roll).

**How the proof ran.** 3.1's harness, extended with the map (`map32b`), a mapped digest beside each game's and each dropback's, and per-read counters written to a separate file so the numbers stay comparable, ran set A in four shards on this tree. `adr073-proof32b.py` compared every shard's numbers, every game's sha256 and every dropback's digest with 3.2a's proof run (`s32a`). The script was checked both ways first: 3.2a against itself passes, and 3.2b unmapped fails on every game and every dropback. Two summary bags are left out of the number diff and checked on their own: `/front/observedFour`, whose labels are the band's (each disguise row's new counts equal 3.2a's six-band counts, and the top three sum to 3.2a's READ_IT and RECOGNIZED), and `/front/later/pictures`, 3.0's census of the picture field itself, which must equal the per-read counters' picture totals exactly. The harness's in-repo copy was deleted before this commit.

**Files** (`/mnt/project-files/arms/`, README section "Front arms (ADR-073 step 3.2b)"): `adr073Arm32b.test.ts` (the harness with the map and counters), `adr073-run32b.sh`, `adr073-proof32b.py` and its output `adr073-proof32b.json`. For 3.3: the harness's `short|band:*` strata now carry the six labels, and `adr073-analyze.py`, keyed on the four old ones, silently drops them; use `short|pic:*`.

### 3.3, filed before any arm *(2026-10-17; CHOSEN)*

3.3's arms are scored by the rules below, filed here before the first arm runs, as §4's figures were. §4.3 and 3.0's re-derived bounds give the predictions; these say how each is scored where the ADR left it open. A rule that proves impossible to compute as written is amended by a dated note under this heading, and recorded as a departure in 3.3's write-up.

1. **The SE that decides S2, S4 and S6** is the width the ADR filed: 2 × 0.034 points on all dropbacks and 2 × 0.067 on `short`, at 26,880 games (H4). The paired per-game SE is printed beside each verdict, never in place of it. Each is falsified outside:
   - S2, slide-only Δsack: [−0.148, +0.068];
   - S4, keep-in-only Δsack: [+0.012, +0.208];
   - S6, full Δsack: [−0.068, +0.198], and on `short` [−0.124, +0.634].
2. **S3 and S5, the counts**, are predicted in each arm's own run over its own snaps, and falsified outside ± 2 Poisson-binomial SD (p is the read's P(TRUE ∪ COUNT) on that snap):
   - S3, kept-in men on the keep-in arms: Σ over `keepable` of p × k, SD √Σp(1−p)k²;
   - S5, slide checks made: Σ over the arm's slide population of p, SD √Σp(1−p). Slide-only is scored on `slideableNoK`, the slide's want computed with no kept-in man as a body, because with keep-in off the engine keeps nobody in. Full is scored on `slideable`, which counts him as the engine does. `kBodyOnly` (in `slideable`, not in `slideableNoK`) is reported on its own.
   - On the bench, where every arm replays the same snap, both are exact per snap.
3. **S7, pressure,** is falsified unless `pressured` falls by more than 2 × 0.032 points: the unpaired binomial SE at 85.942% over 2,374,310 dropbacks, as H4 computes the sack SE. It is shown against 3.0's −0.69.
4. **Interaction ≈ 0** is scored per snap on the bench. Outside the cell where full both checks the slide and keeps a man in, two equalities are exact, and one mismatch falsifies:
   - where full checks no slide, full ≡ keep-in-only, with `slideCheck` deleted from the echo;
   - where full keeps nobody in, full ≡ slide-only, with `checkRelease` deleted.
   On the remaining cell (read-right snaps that are both `slideable` and `keepable`, `kBodyOnly` included) the 4-way residual full − slide − keep + v4 is reported as measured, with its snap SE and its share of the aggregate. The game-level interaction is printed, not scored: at 2 SE it spans about 0.05 to 0.07 points, against a structural effect of at most about 0.01 on 0.10% of dropbacks.
5. **No adjustment wanted, no change (E7).** Where an arm wants no adjustment, its snap is the base's with the option keys deleted. Exact per snap on the proof, slide-only, keep-in-only and full arms; one mismatch falsifies. Not on no-pointing, whose contested pickups' modifier lines differ by construction (a zero modifier is dropped), nor on the Discipline-95 arms at 20 and 30, which hold WORK_TO by design (rule 9 scores them).
6. **The snaps whose only coverage lie is on a kept-in man (R3, §4.3's guard).**
   - On the bench: v4 rolled a coverage read, the arm did not, and the arm kept somebody in.
   - In game mode: each made keep-in is re-run without the options against the same defence call and seed, and the snap is in the bag when that counterfactual rolls a coverage read and the actual does not.
   - The arm never adds a coverage read (`covAddedByArm` = 0).
   - The bag's share of Δ`int_rate` is the paired Σ_bag(int − int_cf) ÷ Σatt over all dropbacks, with a snap SE; the same sum over every made keep-in is printed beside it. int ÷ att on the bag against the rest is descriptive only, since bag snaps are short, `keepable` and read right by selection.
7. **Check-release men** for S16 are counted as 3.0 counted them: released, with no hot spec (`eligible`), so the figures compare with 0.0540 targets and 0.0216 receptions a dropback. Split by role (RB; FB; TE_Y). On every arm that states `checkRelease`, the stated list equals the released list and contains every `eligible` man.
8. **Slide-only's conversion "not negative" (S17)** is "not below −2 paired SE" at game level (A + B). On the bench, the sign of the paired Σ(Δsack − 0.21288 × Δexit) ÷ Σexit is reported with its snap SE.
9. **The leash pair.**
   - "Δsack(L30 − L20) ≈ Δsack(full − v4) within 2 SE" uses the paired per-game SE of the difference of the two differences over A + B. It is not exact even in expectation: at leash 20 and 30 WORK_TO (rung 40) is held, and full at 50 makes it. Both differences are printed.
   - **Exact on the bench:** v5 at leash 20 on the Discipline-95 league ≡ v4 at leash 30 on it, once the `leash_discipline` reads, `PLAY_START.offense.leash`, `protectionAdjustment` and the option keys are deleted. Discipline 95 never breaks a breach of 10 or more, so at 20 the one roll holds both PROTECTION_ADJUST and WORK_TO and makes WORK_AWAY, which is what v4 makes at 30; and nobody kept in leaves the tracks and the coverage read as v4's. One mismatch falsifies.
   - v5 at 30 against v4 at 30, per snap, is reported as measured: rung 30's effect with WORK_TO held in both.
10. **S13:** the Discipline-95 league at leash 50 ≡ the flat league at leash 50, per game (full against full, set A) and per snap (the D95 bench's v4 base against the flat records). One difference falsifies.
11. **`brokeBelow30` is not reachable in 3.3's arms.** The flat arms never roll at leash 50, and Discipline 95 never breaks a breach of 10 or more, so its 0 is not a measurement. The bag's evidence is the engine's own tests (`engine/test/pressureRead.test.ts`: a BROKE keep-in of the man the coverage lies about keeps the coverage die, and the stream test over every leash and discipline counts the bag). Caller v5's evidence for the path is `callerV5Stream.test.ts`: adjustments made on a BROKE roll at leash 0 and 20 (Discipline 60), men kept in among them, none of them beside a coverage read.

**Checks that must read 0, by arm** (game mode, every shard; any one above 0 stops the runs as a defect):

| check | what it counts | arms |
|---|---|---|
| option leak | an option key present that the arm's version or knobs do not state | every arm, v4 included |
| stated ≠ released | the stated `checkRelease` is not the card's released men | arms stating `checkRelease` |
| eligible not stated | an `eligible` man missing from the stated list | the same |
| slide check missing | a SLIDE call without `slideCheck` | arms stating `slideCheck` |
| kept-in man named | a kept-in man (when made) in a read, a throw, a hot conversion, `readOrder` or `routes` | every v5 arm |
| adjustment on a missed read | a `protectionAdjustment` with margin below 0 (every 3.3 front is honest, and there CALL and LOOK answer and place nobody, so nothing can be wanted) | every v5 arm |
| pool, contested, unblocked mismatch | the stream against the as-run accounting (declared, then kept-in when made, then windfalls; the slide side as run) | every arm |
| slide check off its population | a made slide check off the arm's slide population | slide-only, full, no-pointing, D95 at 50 |
| leash reads | any `leash_discipline` read | every arm at leash 50 |
| BROKE | any BROKE read | the D95 arms at 20 and 30 |

**Dated notes.**
- *2026-10-17, after the runs (a change made before R0).* Rule 11's last sentence was replaced in place by two in the review fix commit (e650227), naming the bag's evidence and caller v5's evidence separately. It first read: "Its evidence is the v5 stream test at leash 0 and 20 (Discipline 60)." Scoring is unchanged.
- *2026-10-17, after the runs.* Rule 4's reason for printing the game-level interaction unscored ("at 2 SE it spans about 0.05 to 0.07 points") proved wrong: paired on the same seeds, its 2 SE is 0.008 points. It is printed, not scored, as filed (3.3's write-up gives it).
- *2026-10-17, after the runs.* The contested and unblocked rows of "pool, contested, unblocked mismatch" are counted on snaps with no line game, as H has counted them since 3.0; the pool row is counted on every snap.

### 3.3 Caller v5: the line answers what it sees *(2026-10-17; built and measured; v5 is opt-in, the default stays v4)*

**Dated note, 2026-10-17, after the runs: the keep-in is withdrawn from v5, pending the owner's ruling.** The owner showed that in real football a check-release back reads his own linebackers after the snap and picks up the one who comes, with the quarterback saying nothing; a quarterback's pre-snap "Max" is for backs on a free release. So the keep-in this step gave the quarterback and centre is the wrong football, and the ADR-077 proposal (`/mnt/project-files/design/ADR-077-design-note.md`) replaces it with the back's own post-snap check, after 3.5. On its recommended ruling (Q1), v5 is re-scoped before merge: it states the slide check alone, and the keep-in stays as the opt-in measurement knob `/keep-in` (the engine machinery, on main since 3.2b, is kept for a later Max call). The section below records the runs on v5's first build. Its identities map to the re-scoped code as: `v5` (full) = `v5/keep-in`; `v5/no-slide-check` (keep-in-only) = `v5/no-slide-check/keep-in`; `v5/no-keep-in` (slide-only) = `v5`; `v5/no-slide-check/no-keep-in` (the proof) = `v5/no-slide-check`. Every number below stands as measured; only the default changes. The re-scoped v5's proof against the measured slide-only arm (R4) is in "The re-scoped v5" at the end of this section. *Ruled 2026-10-21:* the owner chose "Yes, slide only" on the Q1 card, which also carried the go-ahead to merge once that proof was re-run, so the re-scoped v5 is what merged.

**In short.**
- **v5 is v4 with the line's two options stated.** On every pass call it applies playbook's `protectionOptions`: `slideCheck` on a SLIDE, and the card's released check-release men in `checkRelease`. Knobs `/no-slide-check` and `/no-keep-in` drop either key, and each is refused on a version without options, the default v4 included. `PROFILE` is an exhaustive table over `CALLER_VERSIONS`, so a version without a row fails to compile. The default caller stays v4 until step 3.5 moves it, once, to v7.
- **The proof holds. v5 with both options off plays v4's games exactly:** all 26,880 games over sets A and B (game sha256 and event counts), all 593,962 set-A dropbacks (digest), every number both ways (0 of 3,212,100 on set A; set B against its own v4), and all 593,962 replays on the bench.
- **Every scored prediction passes**, by the rules filed before any arm ran (the section above). One filed sub-claim did not hold: TE_Y check-release targets fell 0.2% (full) and 0.7% (keep-in-only) on the bench, not by the kept-in share the §4.3 guard names (below). WORK_AWAY open at both leashes is inferred, not counted. The decisive windows are the filed ones; the paired per-game SEs beside them are 2.6 to 6 times tighter than the filed SEs (0.034 points; 0.067 on `short`; 0.032 for pressure): S2 6.0×, S4 3.0×, S6 2.7×, S6 on `short` 2.6×, S7 2.6×.

| | filed (3.0 re-derived) | measured, 26,880 games | verdict |
|---|---|---|---|
| S2 slide-only Δsack | −0.01, window [−0.148, +0.068] | **−0.011** (paired SE 0.006) | PASS |
| S4 keep-in-only Δsack | +0.13, window [+0.012, +0.208] | **+0.115** (paired SE 0.011) | PASS |
| S6 full Δsack, all | +0.12, window [−0.068, +0.198] | **+0.095** (paired SE 0.012) | PASS |
| S6 full Δsack, a `short` snap | +0.45, window [−0.124, +0.634] | **+0.439** (paired SE 0.026) | PASS |
| S7 pressured, full | down by more than 0.064; 3.0 said −0.69 | **−0.679** (paired SE 0.012) | PASS |
| S3 kept-in men (keep-in-only) | rule 2, the arm's own snaps: Σp·k = 39,334 ± 2·110 (3.0, on v4's snaps: 39,404) | 39,341 (1.66% of dropbacks) | PASS |
| S5 slide checks (full, on `slideable`) | rule 2, the arm's own snaps: Σp = 68,967 ± 2·134 (3.0, on v4's snaps: 69,106) | 68,857 | PASS |

- **Keeping a back in costs sacks, as 3.0 said it would.** Keep-in-only raises `sack_rate` by +0.115 points on all dropbacks. On `keepable` snaps (more rushers than the pool has blockers, and a released check-release man, back or end, who could stay in), it raises sacks by +4.91 points while pressure falls 12.72 and the pocket breaks down 16.21 points less often. The quarterback loses his outlet. The slide check cuts sacks only slightly overall (−0.011 points; −0.26 on `slideable` snaps) and takes pressure down 0.36. Together they raise sacks by +0.095 points and take pressure down 0.68. S4 and S6 sit inside their windows but below their re-derived centrals, by 1.3 and 2.0 paired SE.
- **The banner's direction holds** (R2's sentence, which opens the report): full moves `sack_rate` up, from v4's 16.54% to 16.64%, the wrong way for a sim already far above the real 5.58–7.54%. Every 3.3 front is honest, so the reason is keep-in, not deception (3.0's write-up, "What this changes in §4.1 and §4.5"). S10 stays FAIL. R2 itself is scored at 3.5, on the deceived real-pressure population (Q6).
- **Nothing broke that should not have.** `int_rate` and completion stay within the filed guards on every arm. Completion rises +0.091 points of attempts for full (paired SE 0.019, within the 0.110 guard). In game mode the slide check's part is the larger (+0.059 alone; keep-in +0.030 ± 0.018); on the bench, without dice, keep-in's direct part is the larger, and full's direct rise is above the guard (G1 below). The arm never adds a coverage read, and the snaps whose only coverage lie fell on a kept-in man (2,113 for full) move `int_rate` by +0.0001 points ± 0.0003.
- **Check-release targets fall about 2 a team-season,** as filed (S16: about −0.0027 a dropback): RB 29.8 to 28.1 targets and 11.9 to 11.2 receptions, FB 8.8 to 8.3 (per team-game × 17, each arm on its own dropbacks). The TE_Y clause of the fantasy gate did not show: −19 of 6,249 targets in game mode. The one TE_Y concept, RB Slip Screen, is 3.5% of pass calls (2.2% of scrimmage plays). On the bench, where every arm replays the same 593,962 set-A snaps, TE_Y targets go 1,526 (v4) to 1,523 (full) and 1,516 (keep-in-only): the effect is about zero, measured, not hidden by noise.

**What ran.** The scratch harness (H33, `adr073Arm33.test.ts`, 3.2b's harness with caller knobs, the option, adjustment and kept-in counters, the as-run pickup accounting and a multi-arm replay bench) ran in four shards from `packages/calibration` on tree e650227. Every run from R1 to R19 went through a stop guard (every must-be-0 check, scoped by the arm's own header) and then its proof line where it has one, in order; `drive33.sh` would have stopped at the first failure. None did. R0's smokes ran through `r0.sh`, which runs no guard and does not stop; its proof lines are listed under The proofs. The in-repo copy was deleted before this commit.

| run | arm | caller | seeds | size |
|---|---|---|---|---|
| R0 | the checker checked both ways, and smokes of every arm | as R1–R11 | set A, 2 rounds | 56 games each; benches 4,000 recorded snaps (1,000 a shard) |
| R1, R12 | v4 | `v4` | A, B | 6,720 + 20,160 games |
| R2, R13 | proof | `v5/no-slide-check/no-keep-in` | A, B | 26,880 games |
| R3, R14 | keep-in-only | `v5/no-slide-check` | A, B | 26,880 games |
| R4, R15 | slide-only | `v5/no-keep-in` | A, B | 26,880 games |
| R5, R16 | full | `v5` | A, B | 26,880 games |
| R6, R17 | no-pointing | `v5`, `recognitionModifier {0, 0}` (`tunablesDigest` fnv1a:3b758775) | A, B | 26,880 games |
| R7 | D95 at leash 50 | `v5` on the Discipline-95 league | A | 6,720 games |
| R8, R18 | D95 at leash 20 | `v5/leash-20` | A, B | 26,880 games |
| R9, R19 | D95 at leash 30 | `v5/leash-30` | A, B | 26,880 games |
| R10 | flat bench | each of `s32b`'s 593,962 recorded v4 dropbacks re-run alone under v4 and five arms (proof, slide, keep, full, nopoint) | A | 593,962 snaps × 6 |
| R11 | D95 bench | the same snaps on the D95 league under v4 at 50, v5 at 20, v5 at 30, v4 at 30 | A | 593,962 snaps × 4 |

**The proofs ✅**
- **R0.** The proof checker passes `s32b` against itself and fails the full arm on every game (56 of 56) and on every matched dropback that saw an option (2,087 of 2,162; the other 75 have no match in the reference); v4 on H33, the proof, D95 v4 at 50 and D95 full at 50 all equal their references on the 56-game prefix; no-pointing carries its own digest. The bench smokes replay 4,000 of 4,000.
- **R1, the instrument.** v4 on H33 equals 3.2b's own run (`s32b`) on all 6,720 games (sha256 and event counts) and on all 2,874,432 numbers `s32b` carries. Every new counter reads its v4 value (0 for every option, adjustment, kept-in and must-be-0 counter), and the new populations are consistent.
- **R2, the proof.** v5 with both options off: 6,720 of 6,720 games and 593,962 of 593,962 dropbacks equal `s32b`'s, 0 missing, 0 extra; 0 of 3,212,100 numbers differ from R1's, both ways.
- **R12, set B.** v4 on set B on H33 equals 3.0's `B4` one way over 307,136 numbers, with the remapped `observedFour` row for row, `later.pictures` its sum by picture, and all four full-accumulator sha256s. So set B reproduces through 3.1–3.2b, never having been re-run since 3.0. **R13:** the proof equals R12 on all 20,160 games and on all 9,553,764 numbers, both ways.
- **The bench.** Its v4 base replays 593,962 of 593,962 recorded dropbacks, and folds to R1's front in every population and field. `identical[proof]` = 593,962.

**The exact claims, per snap on the bench ✅** (one mismatch falsifies each)
- **E2–E6** (§4.3's "Exact, per snap on the bench" list after the proof): recognition reads, hot conversions, coverage reads and unaccounted rushers equal v4's on every arm and every snap, and no arm rolls the leash; the call (options aside) and the leash stamp also equal v4's. The only coverage-read difference is the filed bag: v4 rolled one and the arm, having kept its man in, did not (510 snaps on keep, full and nopoint). No arm adds one.
- **E7:** where an arm wants no adjustment, its snap is v4's with the option keys deleted: proof 593,962, slide 577,257, keep 584,093 and full 567,388 snaps, 0 different.
- **The adjustment is §2.3's, exactly:** the kept-in men equal `pop.kept` and the checked side equals the predicted one on all 593,962 snaps, on every arm that states the option.
- **Interaction:** full ≡ keep-in-only wherever full checks no slide (576,686 snaps), and full ≡ slide-only wherever it keeps nobody in (584,093), 0 mismatches. The 4-way residual is 0 on every outcome outside the cell (593,391 snaps); on the cell (571 read-right snaps that are both `slideable` and `keepable`) it is −0.53 points ± 0.46 a snap, −0.4% of the bench's full − v4.
- **Slide-only's UNBLOCKED count** equals v4's on all 593,962 snaps (bodies are unchanged).

**The counts ✅** Each arm's own run, against Σ over its own snaps of the read's P(TRUE ∪ COUNT), ± 2 Poisson-binomial SD:

| arm | kept-in men (S3, on `keepable`) | slide checks (S5) |
|---|---|---|
| keep-in-only | 39,341 against 39,334 ± 2·110 (z +0.06) | — |
| slide-only (on `slideableNoK`) | — | 66,633 against 66,786 ± 2·131 (z −1.16) |
| full (on `slideable`) | 39,298 against 39,307 ± 2·110 (z −0.08) | 68,857 against 68,967 ± 2·134 (z −0.83) |
| no-pointing | 39,311 against 39,240 ± 2·110 (z +0.65) | 68,788 against 68,882 ± 2·134 (z −0.71) |
| D95 at 30 | 39,310 against 39,317 ± 2·110 (z −0.07) | 68,835 against 68,945 ± 2·134 (z −0.82) |
| D95 at 50 (set A) | 9,928 against 9,923 ± 2·55 (z +0.09) | 17,267 against 17,287 ± 2·67 (z −0.30) |

No slide check was made off its arm's population. Every snap that is both `slideable` and `keepable` is `kBodyOnly` in this corpus (the slide's want exists only because the kept-in man adds a body), so the two interaction cells are one cell. On `kBodyOnly` itself, reported on its own as rule 2 asks, full made 2,275 slide checks on its 3,419 snaps against 2,268 ± 2·27 (z +0.25).

**The triple** (Δ against the comparison, points, paired per-game SE; Charter:2206-2217):

| arm | population | Δ pocket broken down (exit) | Δsack | Δconversion (sack ÷ exit) | Δpressured |
|---|---|---|---|---|---|
| slide-only − v4 | all | −0.19 ± 0.01 | −0.01 ± 0.01 | +0.04 ± 0.01 | −0.36 ± 0.01 |
| | `slideable` | −4.74 ± 0.08 | −0.26 ± 0.03 | +0.45 ± 0.05 | −8.80 ± 0.10 |
| keep-in-only − v4 | all | −0.40 ± 0.01 | +0.12 ± 0.01 | +0.26 ± 0.01 | −0.31 ± 0.01 |
| | `keepable` | −16.21 ± 0.15 | +4.91 ± 0.12 | +7.80 ± 0.14 | −12.72 ± 0.14 |
| full − v4 | all | −0.60 ± 0.01 | +0.10 ± 0.01 | +0.29 ± 0.02 | −0.68 ± 0.01 |
| | `short` | −2.26 ± 0.03 | +0.44 ± 0.03 | +1.14 ± 0.03 | −2.55 ± 0.03 |
| | `slideable` | −5.39 ± 0.11 | +0.13 ± 0.05 | +1.22 ± 0.09 | −9.30 ± 0.12 |
| | `keepable` | −16.61 ± 0.16 | +4.86 ± 0.12 | +7.82 ± 0.14 | −13.17 ± 0.14 |
| no-pointing − full | all | +0.14 ± 0.01 | +0.01 ± 0.01 | −0.03 ± 0.01 | +0.16 ± 0.01 |
| | `short` | +0.60 ± 0.03 | +0.07 ± 0.02 | −0.07 ± 0.03 | +0.64 ± 0.02 |

Held in every row, identical in the headers: seeds, rounds, shards, looks, league, leash and tunables (no-pointing's tunables excepted). The call mix is held in distribution: no concept or defensive card moves more than 0.02 points of share (SE 0.02–0.03). As §4.3 filed, exit falls with pressure on every arm; slide-only's conversion is not negative (+0.04 ± 0.01; on the bench, the paired Σ(Δsack − 0.21288·Δexit) ÷ Σexit is +0.00037 ± 0.00003); with keep-in, conversion rises (+0.29, filed about +0.3) and exit falls (−0.60, filed about −0.60).

**The rest of §4.3 ✅**
- **S8, free-runner origins (full against v4):** UNBLOCKED 1.53% to 0.62%, PICKUP_LOST 7.43% to 7.09%, WON_REP 84.10% to 85.30%, as predicted.
- **The leash pair (S11–S12, the D95 league, whose quarterbacks carry Discipline 95).** 0 BROKE in either arm. At leash 20 the read wanted 106,216 adjustments and the leash held every one (289,615 HELD rolls, breaches of 10 and 20); at 30 every one of 105,894 wanted was made (189,929 HELD rolls, every breach 10: WORK_TO held). Δsack(L30 − L20) is +0.097 ± 0.012 against full − v4's +0.095 ± 0.012; the difference of the differences is +0.002 ± 0.011. **Exact on the bench:** v5 at leash 20 ≡ v4 at leash 30 on all 593,962 snaps, once the leash reads, the stamp, the adjustment and the option keys are deleted. On the same D95 bench, v5 at 30 against v4 at 30 (rung 30's effect, WORK_TO held in both) is +0.118 ± 0.006 points of sacks a snap over all 593,962 snaps, measured. WORK_AWAY open at both leashes is **INFERRED** (rung 20 ≤ the leash, and that equality), not counted.
- **S13:** the D95 league at leash 50 plays the flat league's games exactly: full against full on all 6,720 set-A games (R7 against R5), v4 on the 56-game prefix (R0's D95 v4 smoke), and the D95 bench's v4 base replays all 593,962 flat records.
- **No-pointing (against full), direction only:** PICKUP_LOST up (+0.0297 a `short` dropback) and sacks up on `short` (+0.07 ± 0.02 a snap), as predicted. Of full's contested pickups, 65.0% carry the +10 and 35.0% the −10, inside the filed 60–75% / 25–40%. The adjustment itself is unchanged by it on all 593,962 bench snaps. So beside real adjustment the point-out is worth about 0.07 points of sacks a `short` snap in game mode (± 0.02), and +0.02 on the bench's same snaps (+28 sacks on 156,153 `short` snaps); on all dropbacks about 0.01 (not distinguishable from 0). It stays exactly as it is; its retirement is the owner's call with these numbers (§7), and needs no new question.
- **The §4.3 directions:** slide-only's slid pickups +0.030 and lost pickups −0.012 a dropback; keep-in-only's UNBLOCKED threats −0.017 and routes −0.017 a dropback, as predicted.
- **G1:** Δint/att and Δcmp/att are within 2 × (0.016, 0.055) points on every arm: full − v4 −0.002 ± 0.006 and +0.091 ± 0.019; keep-in-only −0.005 ± 0.006 and +0.030 ± 0.018; slide-only −0.000 ± 0.003 and +0.059 ± 0.009. The completion rise is real by its paired SE (4.7 SE). How it splits between the options is not settled at this size: in game mode the slide check's part is the larger (+0.059 ± 0.009 against keep-in's +0.030 ± 0.018); on the bench's same snaps, without dice, keep-in's direct part is the larger (+0.068, from 853 fewer attempts) and the slide's is +0.055 (from 246 more completions). On the bench the direct per-snap rise for full is +0.127 points, above the 0.110 guard; the game level passes because the game-level effect falls short of the direct one.
- **G2, the snaps whose only coverage lie was on a kept-in man (R3).** In game mode each made keep-in is re-run without the options against the same defence call and seed: 2,122 (keep) and 2,113 (full) are in the bag, 0 counterfactual errors, and no arm ever adds a coverage read. The bag's share of Δ`int_rate` is +0.0000 ± 0.0003 (keep) and +0.0001 ± 0.0003 (full) points; over every made keep-in it is −0.0033 ± 0.0014 and −0.0028 ± 0.0015. int ÷ att on the bag (1.0–1.1%) against the rest (1.95–1.96%) is descriptive only.
- **G3, coverage reads:** 0.2380 a dropback on v4, 0.2371 on full (almost all of the difference the bag's; on the bench exactly the bag's).
- **G4, check-release men** (released with no hot spec, as 3.0 counted them): 0.0540 targets and 0.0216 receptions a dropback on v4, 0.0512 and 0.0205 on full (S16: about −0.0027 with keep-in; measured −0.0027). By role (targets a dropback): RB 0.0397 to 0.0375, FB 0.0117 to 0.0111, TE_Y 0.0026 to 0.0026. On every arm stating `checkRelease`, the stated list equals the released list and holds every eligible man.
- **G5, position target share** (direction only; every position is already out of band): full WR 40.48% (v4 40.43%, real 59.76%), TE 39.89% (39.61%, real 21.66%), RB 13.49% (13.74%, real 17.87%), FB 6.14% (6.23%, real 0.58%).

**The guards ✅** Every must-be-0 check filed above reads 0 on every arm it covers, in every shard: option leak, stated ≠ released, eligible not stated, slide check missing, kept-in man named, adjustment on a missed read, the pool / contested / unblocked accounting as run, slide check off its population, leash reads at leash 50, BROKE at 20 and 30, and H's own six self-checks. The adjustment §2.3 predicts from the call and the read equals the one the stream states on every dropback of every arm.

**The fantasy gate: pass, with notes.** Nothing in 3.3 forecloses fantasy mode or the COACH/GM split: v5 is calibration-only, and no file outside `packages/calibration` reads it. The gate line holds for RB and FB (about −5% of their check-release targets) and does not show for TE_Y (above). The advisor's watch items for 3.4 and 3.5:
- **Cumulative drift.** Guards are scored step by step, but the league feels v4 to v7 at once. v5 uses 0.091 of the 0.110 completion guard at game level; its direct per-snap effect on the bench, 0.127, is already above it. At 3.5's closing commit, report v7 − v4 on the fantasy lines (check-release targets by role, position share, completion, interceptions including hot throws, sacks, points and yards per team-game).
- **The low-leash path is unmeasured.** BROKE below 30 is unreachable in 3.3's arms (rule 11), so only unit tests cover a human at leash 0–29 with an average quarterback. One low-Discipline, low-leash arm before humans can reach it.
- **Rating sensitivity is unmeasured.** Every 3.3 league is flat or Discipline 95; 3.5 makes Awareness decide who is fooled. An archetype-league arm at 3.5.
- **Pin the ruleset in the save, and decide who states the options in the shipped game.** The save records no engine commit, tunables digest or caller identity; and v5 lives only in calibration, so franchise must say which coaches state `protectionOptions` and from which version (Implied scope; the stamp, §2.7).
- **Promote the bench.** The recorded-snap replay is the only tool that prices "your decision against the baseline coach on the same snap" without dice luck.
- **Type the payload** before a scorer or `apps/game` reads `routes` (now as run) and `protectionAdjustment` (the typed-payload trigger, §3).

**Departures from 3.3 as written, and the details it left open.**
- **Rule 11 was reworded in place before R0** (e650227), which replaced its last sentence with two naming the bag's evidence (`engine/test/pressureRead.test.ts`) and caller v5's evidence for the BROKE path (`callerV5Stream.test.ts`). Scoring did not change. The dated note added after the runs records it.
- **The game-level interaction's filed premise was wrong.** Rule 4 prints it unscored because "at 2 SE it spans about 0.05 to 0.07 points". Pairing on the same seeds makes it far tighter: −0.009 ± 0.004 points (z −2.2; set A −0.001 ± 0.009, set B −0.012 ± 0.005). About 89% of it sits on dropbacks outside `short`, where every arm's per-snap effect is exactly 0, so it is game-state feedback after the arms' games diverge, or chance (set A shows none), not the mechanism (**INFERRED**); its `short` part (−0.001) agrees with the bench's residual (−0.0005). Printed, not scored, as filed.
- **The contested and unblocked as-run checks run on snaps with no line game** (H's definition since 3.0); the pool check runs on every snap. The filed table did not say so.
- **S3 and S5 are scored on every arm that makes the adjustment**, not only the arm each names: keep-in-only, full, no-pointing, D95 at 30 and D95 at 50 for S3, and slide-only, full, no-pointing and both D95 arms that make it for S5. D95 at 20 holds every adjustment by design, so it is scored by rule 9, not by S3 or S5.
- **One exact check was added:** the 4-way residual must be 0 outside the cell, which the two filed equalities and E7 imply.
- **R0 ran in the repository's own checkout** at e650227 (clean; this branch, not main), as R1–R19 did. Its first pass of H at 2 rounds wrote nothing (its output folder did not exist yet); it was re-run with the two proofs that use it, and both pass.
- **The proof checker was extended after R0** with set B's comparison against 3.0's `B4` (additive; R0's proof lines re-run on it give the same verdicts). The report script's presentation was corrected after the runs (labels, the no-pointing and S2 verdicts computed rather than stated, the D95 comparisons restricted to the seed set they share). No pass or fail changed: verdict 16's label went from REPORTED to AS PREDICTED once it was derived from the filed directions and share band rather than stated, and verdict 5's wording was expanded.
- **The caller now refuses a string that names no version** (the old ternary played one as a v2). No corpus or test caller passed one, and v1–v4's 12-game stream shas are unchanged (3164402).
- **Tests** (3164402, 62c6197, a2e9638, 94824b7): calibration `caller.test.ts` (v5's identity and knobs, the refusals, v5 ≡ v4 plus the two keys call for call, the leash twins at 50/40/100/30/20), `callerV5Stream.test.ts` (v5 with no options ≡ v4 game for game at leash 50 and 0, digest and bytes; the reducer for a kept-in man over three arms and five leashes, BROKE keep-ins included; determinism), `protectionOptionsSmoke.test.ts` (28 concepts × 22 cards through the engine validator and one snap); engine `renderPlay.test.ts` (the protection as called, the picture, the adjustment made and held, and an older stream printing none of them). The build's review (three lenses, each finding put to a skeptic) found no behaviour bug, four places where a broken version still passed every test (five broken versions, each now caught) and two statements the step made false, all fixed in e650227.
- **The debug renderer** now prints the three PLAY_START fields 3.2b left for 3.3: `Protect: SLIDE right, centre …, pickup …; options: slide check, check-release …` in PLAY CALL, and the PICTURE and ADJUSTMENT lines in PRE-SNAP, each iff the stream states it.

**Files** (`/mnt/project-files/arms/adr073-p33/`, README section "Front arms (ADR-073 step 3.3)"), under the names the scripts call each other by: `adr073Arm33.test.ts` (H33), `run33.sh`, `proof33.py`, `guard33.py`, `drive33.sh`, `r0.sh`, `adr073-analyze33.py`, `FROZEN.sha256`, the proof verdicts `proof33-*.json`, the logs, and the report `adr073-report33.md` with its figures `adr073-figs33.json`. The shards (`out/`, 339 MB) and dropback records (`rec/`, 127 MB) were not shared. The report and figures carry every scored number; the bench splits, the TE_Y bench counts and the call-mix shares quoted here were computed from `out/` and are not in them. The scripts re-run everything from the same seeds on e650227 (the benches also need `s32b`'s records from `../p31`).

**The re-scoped v5** *(2026-10-17, on 9e3e172; the dated note above)*. Played with no knobs (identity `frozen-v5/v1`, knobs `{}`), the re-scoped v5 plays the measured slide-only arm's games, number for number, on both seed sets. H33 ran it with its grammar moved to the new marks (`/keep-in` turns the keep-in on, and `/no-keep-in` is refused) and the guard's keep-in scope moved to "`keepIn: true` only". Nothing else in the scripts changed but their comments.
- **Set A** (`P5D`, 6,720 games): every one of the shards' 3,212,494 numbers equals R4's, checked both ways with only the label fields set aside (identity, knobs, version, callerSpec), and the tunables digest is `fnv1a:395a9ae2`.
- **Set B** (`P5DB`, 20,160 games): every one of the shards' 9,551,646 numbers equals R15's, the same way, with the same digest.
- **The guard passes on both,** scoped as a slide-only arm: no call states `checkRelease` (knob leak 0), every slide states the slide check, no kept-in man is named, the adjustment the stream states is the one §2.3 predicts on every dropback, no slide check falls outside its population, and there are no leash reads at leash 50.

So every number 3.3 measured for the slide-only arm (R4, R15) is what the re-scoped v5 plays. Its proof lines, `proof33-P5D.json` and `proof33-P5DB.json`, and its logs are beside the others in `/mnt/project-files/arms/adr073-p33/`. The two changed scripts are in its `rescoped/` folder, so the originals that `FROZEN.sha256` pins still re-run the measured arms on e650227.

### 3.4, re-filed before any arm: the keep-in terms *(2026-10-21)*

**Why.** The owner ruled three questions of the ADR-077 proposal (a) on 2026-10-21, each by a card tap (`/mnt/project-files/design/ADR-077-design-note.md`, its §9; cited below as note:n):
- **ADR-077 Q1(a), "Yes, slide only":** "Ship the line's slide check alone, and withdraw the quarterback keeping a check-release back in" (note:369-374). v5 merged stating the slide check alone, and the keep-in is the opt-in knob `/keep-in` (3.3's dated note, line 1639; "The re-scoped v5", above).
- **ADR-077 Q2(a), "Yes, his own read":** "Yes: his own read, which can be fooled, of two men named before the snap, at no leash rung"; "nothing is built until the build step (Q6)" (note:375-380).
- **ADR-077 Q6(a), "Yes, wait for fix":** the back's check is "Built after 3.4 and 3.5 as v8, opt-in" (note:395-400).

So on v5, v6 and v7 no back is kept in unless `/keep-in` is named, and the back's own check does not exist before v8. The design note asks for this block: "v6 is measured against v5, which is now slide-only", and "Before any arm runs, re-file ADR-073 §4.1's keep-in terms (`:729-733`) … Do the same in §4.4 and §4.5" (note:207-209). This ADR re-files a prediction before an arm runs and never re-labels it after one (§4.1's pre-commitment, line 737; 3.0's "What this changes in §4.1 and §4.5 (filed now, before any arm)", lines 1399-1404).

**How to read it.**
- §1–§9 stay as filed: they are the record. No line there is inserted or edited; the Status line, edited in place, names this block. Line numbers below are this file's, and nothing above this block moved.
- Each entry names where the filed text is, quotes it, and says how it reads from 3.4 on.
- Wherever an entry says no back is kept in, it reads "unless `/keep-in` is named".
- This block holds no 3.4 scoring rule and no number from a 3.4 run. Its numbers are 3.3's, quoted from this section.

**The entries.**
1. **§4.1, Informed (line 729).** Filed: "slide checked toward the unnamed (contested → slid); a back kept in when short (free → contested)", sign "**down**, in expectation", re-signed by 3.0 as "sign **up** at full, driven by keep-in" (line 1400). Reads: Informed, as merged: the slide checked toward the unnamed (contested → slid). No back is kept in unless `/keep-in` is named: the keep-in is withdrawn from v5 (ADR-077 Q1, 2026-10-21; line 1639). The sign is down and small, as 3.0 filed before any arm (lines 1392, 1400). Measured: −0.011 points of `sack_rate` (paired SE 0.006), inside S2's window (lines 1590, 1648). The aggregate sign is not shown at 2 SE. On `slideable` snaps it is −0.26 ± 0.03 a snap (game level, paired per-game SE; the triple, line 1710). The sign is taken from the pre-arm filing, not from the run (line 737).
2. **§4.1, Creeper (line 730).** Filed: "the backer is unnamed against a four-man guess; DE_R's blocker freed, a contested pickup instead of a named rep", sign "up; size ≈ creeper share × short-snap effect". No change: the row names no keep-in, and entry 8 states that no back is kept in on v5 or v6 unless `/keep-in` is named.
3. **§4.1, Deceived, bluff (line 731).** Filed: "hot into droppers; a route lost to keep-in", re-signed by 3.0 as "leans **up**. A route lost to keep-in is now measured as a cost" (line 1401). Reads without "a route lost to keep-in": no route is lost before the snap on v5–v7 unless `/keep-in` is named. Sign: up for the slants and the shallow cross (28a's filter, line 1242); undetermined for Sit and Swing.
4. **§4.1, Deceived, real pressure (line 732).** Filed: "COUNT and LOOK keep backs in against ghosts (free → contested: down)", sign "**undetermined**; up only where no eligible `checkRelease` man is listed", re-signed by 3.0: the keep-in term "is re-signed **up**, by the keep-in measurement", and the channel "leans up, on snaps with an eligible `checkRelease` man as well as without one, with its hot term undetermined" (line 1402). Reads: slide checked toward the bluff (slid → contested: up); LOOK converts hot where undisguised it did not (hot term undetermined, line 1402); no back is kept in unless `/keep-in` is named (term withdrawn). Leans up through the slide term, on snaps with and without an eligible `checkRelease` man (line 1402). `releaseListed` stays a separately scored stratum, as the owner ruled (line 825; this ADR's Q6(a), line 1207).
5. **§4.1, Deceived, Stem (line 733).** Filed: "slide set toward the shown strength (slid → contested)", sign "up; tiny population". No change: the row names no keep-in.
6. **§4.1, Aggregate (line 735), with 3.0's re-sign (lines 1241, 1404) and 3.3's banner reason (line 1657).** Filed: "Most likely **down** or within noise"; 3.0: "keep-in is now its one sized driver" and "informed about +0.12"; 3.3: "the reason is keep-in". Reads: Aggregate, whole ADR (v7 against v4): unsized. The informed channel is the slide check alone (−0.011 points, paired SE 0.006: down and small as filed, its sign not shown at 2 SE). The creeper and the deceived channels lean up, sized from 3.4's creeper share and 3.5's legal-look shares. Reported, never deciding (Decision 6, lines 1153-1154). Line 1657 stays the record of v5's first build.
7. **§4.1, Pre-commitment (line 737).** No change: it names no keep-in, and it is the rule this block follows.
8. **§4.4, its heading (line 791) and line 803.** Filed: "3.4 (v6 against v5)"; "unaccounted rushers up on creeper snaps (the backer is unnamed against a four-man guess)". Reads: §4.4 is v6 against v5 as merged: `v5` with no knob (identity `frozen-v5/v1`), the slide check only, which plays the measured slide-only arm, R4 on set A and R15 on set B, number for number (lines 1758-1763). Line 803's mechanism holds with no back kept in on v5 or v6 unless `/keep-in` is named. Neither line is edited.
9. **§4.5, Bluff, bitten (line 821).** Filed: "kept-in > 0 where an eligible `checkRelease` man is listed and |ghosts| > the perceived pool". Reads: kept-in = 0 on every arm that does not name `/keep-in`, a must-be-0 check: no v7 call states `checkRelease` without it.
10. **§4.5, Real pressure (line 825).** Filed: "scored separately on snaps with and without an eligible `checkRelease` man (`releaseListed`, 3.0)". Reads: both strata stay scored separately, as the owner ruled (this ADR's Q6(a), line 1207). No back is kept in on either stratum unless `/keep-in` is named, so their mechanisms now differ only in who is on the field. v8's scanner (ADR-077 Q6) is the man `releaseListed` names: a listed check-release man whose route has no hot spec (note:83; line 173).
11. **§4.5, Real pressure (line 827).** Filed: "COUNT and LOOK keep backs in against ghosts (free → contested: down)". Reads: withdrawn: no back is kept in on v5–v7 unless `/keep-in` is named.
12. **§4.5, Real pressure (line 829).** Filed: "with no eligible `checkRelease` man, **Δsack > 0**; with one, the direction is undetermined and reported as measured". The no-release clause stands as filed (Δsack > 0), read with 3.0's re-sign (line 1402); it never counted on the keep-in, since no back is listed there (line 173). Only the with-release clause is re-filed. Reads: with one, no back is kept in unless `/keep-in` is named (the term is withdrawn on the owner's ADR-077 Q1 ruling), so this stratum now has the no-release stratum's mechanism and leans up the same way, slide term up and hot term undetermined (line 1402). Reported as measured and scored separately (line 1207). On `r2Expected`, Δsack > 0, as filed. This agrees with entry 4.
13. **§4.5's `r2Expected` line (line 830), `r2Expected`'s reason (line 174) and §4's preamble (line 717).** Filed: "where no back can be kept in"; "No back can be kept in"; "there mechanically only where no back can be kept in and the look pulls the slide off the real rusher". Reads: the definition stays as ruled (this ADR's Q6(a) and Decision 6). Its reason, at lines 174, 717 and 830 alike, reads "no back is listed to release, so none could be kept in under `/keep-in`". `r2Expected` without its `not releaseListed` clause is also reported, as a wider, non-deciding population. Any change to the deciding population goes to the owner, and this block makes none.
14. **§4.5, Aggregate (line 832).** Filed: "[−0.08, +0.10] pp, central +0.01", its central withdrawn by 3.0 (line 1403). Reads: the interval stays, with no central: the keep-in term is gone, the slide-toward-bluff term is up, and the hot term is undetermined.
15. **§7, Risks (line 910).** Filed: "COUNT and LOOK keep backs in against ghosts, which pushes them down". Reads: that term is withdrawn on v5–v7 unless `/keep-in` is named; the real-pressure sign rests on the slide and hot terms.
16. **Implied scope (line 1022) and §7's fantasy risk (line 915).** Filed: "check-release targets fall when a check-release man is kept in (3.3)"; "check-release targets fall (3.3; RB, and FB and TE_Y on one concept each), perhaps by more than the kept-in share". Both read: not on the merged v5, which keeps nobody in unless `/keep-in` is named. 3.3's measured fall (line 1659) belongs to the full arm, which is `v5/keep-in` today (line 1639).

### 3.4, filed before any arm *(2026-10-21; CHOSEN)*

**Why.** 3.4's arms are scored by the rules below, filed in git before the first arm runs, as §4's figures were (lines 201, 710) and as 3.3's rules were (lines 1585-1587). A failed prediction is recorded as measured, and never re-labelled (line 737). 3.4 needs rules the ADR never filed, and one filed band, P5's, is re-derived here because the construction is known to break it (rule 6). The block holds, in this order: the 3.4 mechanics as built (rule 15, first because every other rule reads them), the identity grammar (rule 1's note), then scoring rules 1–14, then the checks that must read 0.

**How to read it.**
- §1–§9 stay as filed: no line there is inserted or edited, and the Status line, edited in place, names this block. Line numbers are this file's, and nothing above this block moved.
- **Labels.** P1–P11 number the predictions 3.4 is scored on: P1–P9 are §4.4's bullets in order (lines 793-805; P8 is lines 800-804), P10 is §4.1's creeper row (line 730) and P11 is line 866. They are not §3's contracts edits. "Plan point n" is open point n of 3.4's build plan, cited where this block takes its recommended default; this ADR's own Q1–Q7 (§9) and ADR-077's are named as such. W is 3.4's write-up; W0 is the owner's heads-up note (plan point 28), and W2 the results note.
- **Code** is cited at `cfb2c79`, the build's head: C1–C5 (`8b6d4d5`, `9abb907`, `bda058a`, `e6e7b35`, `84c7818`) and the review fixes. Playbook files are in `packages/playbook/src/` and the caller's in `packages/calibration/src/caller/`. Tests are cited by file name: the playbook's are in `packages/playbook/test/` and the caller's in `packages/calibration/test/`.
- **3.3's tools** are cited by line in `/mnt/project-files/arms/adr073-p33/` (line 1756): H33 is `rescoped/adr073Arm33.test.ts`, G33 is `rescoped/guard33.py`, AN33 is `adr073-analyze33.py`, and `proof33.py` and `drive33.sh` go by name. 3.4's tools are scratch, made from them at M0: the harness H34, `guard34.py`, `proof34.py` and `adr073-analyze34.py`. They are named here so that a rule can name its counter.
- **The runs.** 3.3's are `s32b` (3.2b's v4 records on set A), R1 (v4, set A), R10 (the flat bench), R12 (v4, set B), and P5D and P5DB (the re-scoped v5 on sets A and B) (lines 1663-1676, 1758-1763). P5G is v5's 6,720 set-A game sha256s, captured through H33 on F0's commit, before any build commit. 3.4's are M0 (the checker and the smokes); M1 v4, M2 v5, M3 bound, M4 joint, M5 jnc, M6 pressure and M7 front on set A; M8 the bench; M9 v5, M10 joint, M11 jnc, M12 pressure and M13 front on set B; and M14 v4 on set B.
- **The expected values are COMPUTED for this block, before any arm.** `expected34.mjs` evaluates v5's card-weight law and v6's draw analytically, with the playbook as built at `cfb2c79`: its own `hostShares`, `blitzRate`, `pressureMix`, `CREEPER_RATE`, `lineGameRate`, `lineGameMix` and `COMPOSED`. No die is thrown.
  - They are weighed by every defensive call caller v4 makes on set A: 942,361 calls (593,962 dropbacks and 348,399 runs) in 9,624 situations. The calls were captured by a v4 run on set A at `cfb2c79`, which is neither M1 nor a 3.4 arm. Its dropbacks are `s32b`'s, call for call (checked by game, snap and situation). That is a check of the weighting's input, not M1's verdict: M1 remains the reproduction proof (rule 3).
  - So each is a set-A figure over v4's situations. The scored predictions are computed by H34 over each arm's own snaps (3.3's rule-2 form, line 1593). On A + B the counts are about four times these and the SDs about twice (INFERRED: set B is three times set A's games, on the same league and caller).
  - They replace the planning previews, which took line 596's line-game legality as written. "Planning" marks a figure computed from 3.3's shards while planning, and not re-run here.
- No number in this block was measured by a 3.4 arm.
- A rule that proves impossible to compute as written is amended by a dated note under this heading, and recorded as a departure in W (line 1587's convention).

**15. The 3.4 mechanics as built** *(CHOSEN)*. Each of the first seven items departs from §2.6's text, which the owner accepted with the design, or reads it one way. The last lists where the build named or did a thing otherwise than its plan's text, where a rule reads it. W cites this list; it does not introduce these choices for the first time.
- **The coverage** (plan point 1). It is v5's card, drawn on `defense-card` with v5's own die (`selectDefensiveCard`), folded onto its host (`HOST_OF`, `coverageCatalogue.ts:369-371`; `selectCoverage`, `pressureDraw.ts:135-140`). This is line 591's law: each host's share is its own weight plus those of the pressure cards it hosts that apply in s, over v5's total. It is not line 591's wording, "over the coverage catalogue". So v6's coverage is the host of v5's card on every snap, an exact claim (rule 4).
- **The words** (plan point 7). CREEPER is four rushing, a backer among them, a down lineman dropping, deep help kept: `rushers === 4`, a backer off the ball, `lineDrops` and `deepHelp` (`validate.ts:1123-1124`; the rule's text at :1051-1053; the tag at `tags.ts:66`, :73). FIRE and DOUBLE_A both gain "five or more" (`rushers >= 5`, `validate.ts:1119-1120`).
  - Line 611 names FIRE only. DOUBLE_A needs the same clause, or a four-man Double A would fit two words. DOUBLE_A is the owner's word (R26, line 1072), so the owner was told in W0, before F0, and is told again in W2. No book card changes its word.
  - `lineDrops` (`validate.ts:1110-1112`) cannot be falsified on a valid card. Every grouping fields four or more down-lineman roles (`roles.ts:193-198`), and every role carries a duty, so four rushers with a backer among them always leave a lineman out of the rush. The clause is kept as the rule states it. No test can isolate it, and a mutation that removes it passes the tests (C1's mutation check).
- **Line-game legality** (plan point 10). It adds three conditions to line 596's, which line 367 cites for the front arm: at most five rush (`MOST_RUSHERS_UNDER_A_LINE_GAME`, `coverageCatalogue.ts:476`); not on PREVENT or GOAL_LINE (:479); and both men are down linemen who rush on the call. Only the third condition's "down linemen" is new (the refusal `NOT_A_DOWN_LINEMAN`). That both rush is line 596's already: `checkStunts`' "both rush", and "never a man the pressure dropped (Fire's or the creeper's end)", which the refusal `DROPPED_LINEMAN` carries and the code labels R25 (:487-488).
  - Line 596's own conditions stand: the call wearing the game validates (`checkStunts`, through `validateDefensiveCard`), neither man is one the pressure dropped (`DROPPED_LINEMAN`), and neither man is one the pressure moved (R25, `MOVED_BY_PRESSURE`). Every refused pair names its rule (`LineGameRefusal`, :482-494; `lineGameRefusals`, :531-552). A bare coverage's moved men are its rushers from off the line, which is none but the bound Cover 0 Blitz's (`movedOn`, :507-516).
  - `NOT_A_DOWN_LINEMAN` cannot fire on the book's five patterns, since every grouping fields DE_L, DT_L, DT_R and DE_R. It is kept, and tested on two made-up pairs (the NT over Sky; LB_W over the Sky creeper). It is the same case as `lineDrops`.
  - **Two of line 596's refusals never decide a pair on the book** (COMPUTED over `COMPOSED`'s 26 compositions with no line game, each with the five games: 130 pairs, 38 refused).
    - No pair is refused by `DROPPED_LINEMAN` alone. It always fires with `VALIDATOR`, because `checkStunts` already refuses a stunt man who does not rush (`D_STUNT_NOT_A_RUSHER`, `validate.ts:864-865`).
    - No pair is refused by `MOVED_BY_PRESSURE` alone. It fires with `VALIDATOR` or with the five-rusher rule. That is why C5 did not run the mutation removing it: on this book it survives by construction.
    - So beyond the validator, only the five-rusher rule and the Prevent and goal-line rule bind on today's book. The guards `lineGameOnMovedMan` and `lineGameOverDoubleA` (the table after rule 14) read 0 with or without these two clauses, so they cannot tell them apart.
  - Under these conditions, line games on five-or-more calls fall from 7.370% of dropbacks on v5 to 5.292% on front and 4.942% on jnc and joint (set A, COMPUTED). The planning preview for the front arm, with line 596's legality as written, was 5.881%; jnc and joint were not aggregated in planning.
- **The line game's `/which`** (plan point 11). Each pattern weighs the summed weight in s of the book's cards that state it (`STATED_BY` and `gameWeight`, `pressureDraw.ts:248-264`). This reads line 596's "today's complexity weights" one way.
  - **A pattern with no weight in s is not one the call can wear,** for `/wears` and in r_line's denominator alike (`wearable`, `pressureDraw.ts:283-287`; the filter is :286). On today's book this binds only on the Twist at six yards or less, where no card stating it applies (`pressureDraw.test.ts:386`). Each call's set of wearable games has 5, 4, 3, 2 or 0 members.
  - A call's legal games are read by its id off `COMPOSED` (`LEGAL_BY_CALL`, :272-281), so nothing is validated per snap. Each of the book's 22 cards carries its composition's id, so the front arm's stripped cards resolve too.
  - r_line is v5's stunting share in s over the share of the plan's calls in s that can wear a game (`lineGameRate`, :326-336). That share is summed coverage by coverage, with the creeper's call and its bare call weighed together inside each (`hostableShare`, :301-319). So joint and jnc have one r_line to the last bit, on all 23,760 situations of the sweep (`pressureDraw.test.ts:398`, with `toBe`). Rule 4's "a line game worn on one exactly when on the other" rests on this.
  - Over set A's situations, r_line is at most .3111 on front and .3160 on jnc and joint, and r_s takes only 1/2 (six yards or less) and 21/39 (COMPUTED).
- **The huddle** (plan point 14). With the pressures drawn, the guess is decomposed as the call is (`anticipateDecomposed`, `anticipate.ts:311-355`). This reads line 622's "decomposed the same way".
  - The coverage is drawn on `anticipated-front/coverage` by draw weight in s (`coverageDrawWeight`), over the real coverage's personnel. So the pool holds `DIME_COVER_1` where it hosts, and always holds the real coverage (both asserted).
  - The pressure is drawn through the real draw's own `drawPressure` on `anticipated-front/pressure`, with a `blitz` die independent of the real one. The creeper is guessed at the real rate unless `/creeper-0` is named.
  - No line game is guessed (line 622), and the guess is graded against the real call before its line game (`frozen.ts:763`).
  - With the pressures bound (bound and front), the huddle guesses v5's way (`anticipateFront`; `snapPlan`, `frozen.ts:482-491`).
- **The parts** (plan points 3, 8 and 12).
  - **The creepers** (`CREEPER_SPECS`, `coverageCatalogue.ts:312-349`) lie over Sky, Buzz and Base Cover 3, each in §2.6's form (lines 607-612): LB_W rushes the left B gap, DE_R drops to the right hook with a C-gap fit, LB_M takes LB_W's zone and keeps his B-gap fit; ZONE_BLITZ; the moved men are DE_R, LB_W and LB_M.
  - Over Buzz the Will's zone is the left curl/flat, so the same form slides the Mike from the right hook to CURL_FLAT LW. That is chosen by line 612's text ("in the same form"), not by a football review, and is named to the owner in W2.
  - Each creeper's id is its host's with `+CREEPER`, and its name and usage are its host's, because the creeper is drawn at its own rate and has no weight. Under lines bound a creeper keeps its host's stunts. So the creeper over Base Cover 3 keeps Base Cover 3's Tex to the left, a composition reachable only with the creeper on and the lines bound (`v6/lines-bound`), which no 3.4 arm is.
  - **`DIME_COVER_1`** (`coverageCatalogue.ts:76-132`): CB_D takes Nickel Cover 1's spare-man job (its S_S duty, `defensiveCards.ts:338-346`): MAN on #3 to the right, OFF, the HOLE C zone if #3 is absent, run fit D LEFT. Its front is "Even", its family COVER_1, and its usage weight 0, minDistance 7. It lives only in `V6_COVERAGES` (:359-362, eighteen entries), and `DEFENSIVE_CARDS` keeps its 22 cards. Its own weight is 0, so it is drawn only where Dime Man Pressure applies, and it is played bare where that pressure's die says no.
  - **The specs** (`PRESSURE_SPECS`, :193-293) carry only the men a pressure moves, its word, its disguise row, and the call-level keys on which the shipped card differs from its host: Fire over Sky's concept, family and Tex; Double A's and Dime Man Pressure's "Mug"; Base Run Blitz's "Bear". The five reproductions keep the shipped card's id, name and usage, so v5 and v6 tally a call by one key. The new ids are `DEF_DIME_COVER_1` and `<host id>+CREEPER`.
- **The bound arm** (plan point 6). `v6/pressures-bound/lines-bound` takes v5's path: with both parts bound no part is drawn (`frozen.ts:687`), v5's card is drawn on v5's die, and the huddle guesses v5's way. So it reproduces v5 (rule 3), where lines 371 and 900 say v6 has no arm that does.
- **Named or built otherwise than the build plan's text, where a rule reads it:**
  - **Composition.** The signature is `composeCall(coverage, pressure?, line: LineChoice = "BOUND")`, with `LineChoice = "BOUND" | "NONE" | LineGameId` (`coverageCatalogue.ts:407`, :458-468). BOUND keeps the call's own stunts, NONE wears none, and a game's id wears that game alone.
    - `COMPOSED` holds every reachable composition as BOUND, as NONE and with each legal game: 144 entries keyed `coverage|pressure word or -|line` (`composedKey`, :580-582; :618), built once and frozen.
    - The plan's `stripStunts` and `withLineGame` do not exist. With the pressures drawn the caller looks its call up in `COMPOSED`, and on the front arm it composes `composeCall(card, undefined, "NONE" | game.id)` (`drawInParts`, `frozen.ts:525-539`).
  - **The draws** are in `pressureDraw.ts`, a sibling of `coverageCatalogue.ts`, with their tests in `pressureDraw.test.ts`. The corpus-wide checks' copies for composed calls are in `coverageCatalogueCorpus.test.ts`.
    - `drawPressure` returns the pressure laid over the coverage, or none (:213-229), and `drawLineGame` returns the game, or none (:365-376). `lineGameRate` takes a `DrawPlan`: the pressures bound, or drawn with the creeper on or off (:234-238).
    - `pressureMix` and `lineGameMix` (:187-191, :349-353) are the conditional `which` laws. The full measure is r_s × `pressureMix`, the creeper taking `CREEPER_RATE` of a creeper host's draws with no five-or-more pressure, and r_line × `lineGameMix`. So rule 6's conditional form is `pressureMix`.
    - Each die is one `weightedPick`, a yes/no die being a two-item pick (`yes`, :109-111).
  - **`CREEPER_RATE = 0.1`** is in `distribution.ts:244`, beside `BLITZ_RATE_PRIOR` (:233). It is CHOSEN with provenance NONE: the owner's 1 in 10 (Decision 5; this ADR's Q5(a)). It is pinned at `pressureDraw.test.ts:650-654`.
  - **The tables are built at load,** in every process that imports `@ff/playbook`, v1–v5's included: `COMPOSED` and those before it (`coverageCatalogue.ts:7-10`), and `STATED_BY` and `LEGAL_BY_CALL` (`pressureDraw.ts:7-10`). They draw nothing and move no v1–v5 die. A book edit they cannot compose throws at load for every caller.
  - **Loud failures.** A rate outside [0, 1] or NaN throws `PlaybookError`, naming the situation (`checkedRate`, `pressureDraw.ts:99-104`). So does a card that is no v6 coverage given as the coverage (:87-91), and an unknown call id given to the line-game draws (:283-287).
  - **The harness's host key** is defined in the test, not exported from playbook (`coverageCatalogue.test.ts:854-859`).
    - A call whose PRESSURE tag is not the Creeper keys on (personnel, pressure word). That includes the bound Cover 0 Blitz, which carries PRESSURE ZERO (`defensiveCards.ts:552`). Every other call keys on (personnel, concept): the other bare coverages, the creeper, Prevent and both goal-line calls.
    - The test proves the key unique, and that it resolves every card and composed call to its host, with or without a look (:861-907). H34 states the same rule, verbatim.
    - A call H34's key resolves to no host counts in `hostUnresolved`, which must be 0 on every arm, v4 included, and stops the run (plan point 34).
  - **The caller.**
    - The knobs are `creeper`, `drawPressures` and `drawLines`, each on when absent (`frozen.ts:324-336`). Each is refused, whatever its value, on v1–v5 (:810-819), and `creeper: false` is refused with `drawPressures: false` (:820-825). `creeper: true` with `drawPressures: false` is accepted, since it adds no mark.
    - `snapPlan` (:482-491) folds the profile and the knobs. Three of `resolveSnap`'s lines read through it, with v1–v5's behaviour unchanged (the scratch pins, 13 v1–v5 callers over 12 games, equal the base's at every build commit).
    - The decomposed guess also carries its `coverage` and `pressure` (`DecomposedFront`, `anticipate.ts:263-268`), as read-only diagnostics.
  - **The replay tests.**
    - The snap-for-snap test (`caller.test.ts:1489`) replays every arm from a request recorder (`recordSnaps`, :1318): each side's request, and its Rng's seed and label, as H33 replays. It does not use `capturePlays`, which keeps neither the request nor the state's two-minute flag and score. It plays four v5 games (566 snaps), and since the review fixes it re-derives the huddle's guess on every snap, for v5 and all five v6 arms.
    - `callerV6Stream.test.ts` takes the states from `capturePlays` wrapped around the same recorder (:287), joined by order, with the counts asserted equal. It anchors the replay: v5's replay equals the calls v5 played.
  - **A run's `PLAY_START` carries no `blitzDisguise` and no `stunts`** (`packages/engine/src/sim/runPlay.ts:354-386`). So the stream test checks the creeper's row and the line-game rules on dropbacks only, and the creeper's host and four-man rush on every play. Rule 7's counts over runs read the call the caller hands the engine (H33's `watch` wrapper, H33:774-780), not the stream.
  - **Three pins C4 (`e6e7b35`) moved without naming them,** which `cfb2c79`'s message names:
    - `BELOW_V5` became `STATES_NO_OPTIONS = ["v1", "v2", "v3", "v4"]`, with a new test that every other version states the options and takes both knobs (`caller.test.ts:814-834`);
    - the empty-catalogue `it.each` gained "v6" (:642);
    - the identity test gained v5 ≠ v6 (:508).
  - **The draw's disguise rows are pinned at the law's value** (`pressureDraw.test.ts:595-633`).
    - The pool is v6's draw over the open field: `pressure.test.ts`'s non-situational pool, every non-goal-line card with its limits set aside, where r_s = 23/43. There STANDARD = 27·23/(43·26) = .5555, ZONE_BLITZ = 13·23/(43·26) = .2674, DELAYED = 3·23/(43·26) = .0617 and ZERO = 3/26 = .1154, and there are exactly those four rows.
    - STANDARD and DELAYED are more than .03 from `BLITZ_DISGUISE_MIX`'s .50 and .12. The cause is the one r_s shared by every host in s (line 601): it moves Dime Man Pressure, the book's only DELAYED pressure, from always on its host to r_s of it, and the mass goes to STANDARD.
    - They are the construction's values on today's book, pinned as r_s's 1/2 and 21/39 are, and not a band. Rule 6 scores the arms' rows.

**The identity grammar** *(rule 1's note)*. It reads line 625's list for v5 and v6, which named the first build's marks; line 625 is not edited. As built (`callerIdentity`, `frozen.ts:380-395`):
- The marks, in order: `/no-slide-check`, `/keep-in`, `/creeper-0`, `/pressures-bound`, `/lines-bound`, then 3.5's `/front-*`, then `/leash-N` last. A knob at its default is unmarked. v6's three parts are drawn by default, so each is marked when `false`. No 3.4 mark says "front", because `/front-*` are v7's look knobs (line 625).
- The keep-in's mark is `/keep-in`: "There is no `/no-keep-in`" (`frozen.ts:376`).
- v5's proof identity is `v5/no-slide-check`, which plays v4 (line 899, by line 1639's mapping).
- Line 621's "`protectionOptions` stated" for v5, and line 622's "as v5" for v6, read "as merged v5: the slide check only; the keep-in only under `/keep-in`".
- The bound arm is `v6/pressures-bound/lines-bound` (rule 15). A pair's name is `frozen-` and the identity with the tables' version, as in `frozen-v6/v1/creeper-0`.

**The scoring rules.**

1. **The arms and their comparisons.**

   | arm | identity | pressures | lines | creeper | huddle | compared with |
   |---|---|---|---|---|---|---|
   | v5 | `v5` | bound | bound | — | CARD | (the base of 3.4) |
   | bound | `v6/pressures-bound/lines-bound` | bound | bound | — | CARD | v5, exactly |
   | pressure | `v6/creeper-0/lines-bound` | drawn | bound | off | decomposed | v5 |
   | front | `v6/pressures-bound` | bound (v5's cards, stunts stripped) | drawn | — | CARD | v5 |
   | joint-no-creeper (jnc) | `v6/creeper-0` | drawn | drawn | off | decomposed | v5 |
   | joint (= v6) | `v6` | drawn | drawn | on | decomposed | jnc, and v5 |

   - The interaction is jnc − pressure − front + v5. The creeper's increment is joint − jnc (lines 985-986).
   - **The huddle rides with the pressure draw.** pressure − v5 and jnc − v5 measure the pressure draw together with the decomposed huddle, which line 622 couples to it. The interaction and joint − jnc are free of the switch to the decomposed huddle, and W says so. joint − jnc still carries the huddle's guessed creeper, which jnc's huddle never guesses (rules 4 and 8).
   - The grammar is the note above.
2. **P2, the construction is exact** (line 794), **and one failure stops the runs.**
   - The 1e-12 sweep passes in `pnpm verify` on this block's commit (`pressureDraw.test.ts:223-283`: every host's share, P(five or more) and the line-game share against v5's, with every r_s and r_line at most 1, over 23,760 situations).
   - In game mode, per snap, H34 recomputes v5's host share and P(five or more) from `DEFENSIVE_CARDS`, and v6's from playbook's exports: `hostShareDrift` (any |Δ| > 1e-12) = 0 and `rsAboveOne` = 0 on every arm that draws pressures.
3. **P1, reproduction by name** (line 793), exact.
   - **How the one-way numbers are compared.** Every one-way comparison skips `/seconds` and `/secondsSetup`, both timing fields. It declares only the keys the new run's harness adds over the reference's (`proof34.py`). The counts below are the reference's leaves less those skips (COMPUTED over 3.3's shards for this block).
   - **v4:**
     - M1's 6,720 game `full` sha256s (H33:845-846) equal `s32b`'s, with equal event counts.
     - Its numbers equal `s32b`'s 2,874,432 one way, with H33's and H34's keys declared. This is R1's own check (`drive33.sh:39`; `proof33-R1.json`).
     - They also equal R1's 3,212,116 one way (3,212,120 less four `secondsSetup`), with H34's keys declared. This line tests that every H33 key keeps its definition under H34.
   - **v5:**
     - M2's 6,720 game sha256s equal P5G's.
     - 0 of P5D's 3,212,510 numbers differ one way (3,212,514 less four).
     - M9 (set B) differs from P5DB in 0 of 9,551,662 one way (9,551,666 less four).
     - The 3,212,494 and 9,551,646 of lines 1759-1760 are both-way counts, with the label fields set aside too.
   - **bound:** M3's games equal M2's, and its numbers equal M2's both ways (both are H34 runs). Only the label fields are set aside (identity, knobs, version, callerSpec, and any header H34 adds that names the arm), and `secondsSetup`.
   - **On the bench:**
     - The v5 arm's scope counters, front fold and pairs equal R10's `slide` arm (run as `v5/no-keep-in` under the first build's grammar), one way over R10's leaves, with H34's bench additions declared. The base fold equals R10's base, the same way.
     - The bound arm equals the v5 arm on every snap (`boundNotIdentical` = 0). H33's own `identical` counts against the v4 base (H33:1102), so it cannot carry this claim.
   - **M14** (v4 on set B; recommended, plan point 26): its 20,160 game sha256s equal R12's, and 0 of R12's 9,553,780 numbers differ one way (9,553,784 less four).
4. **Exact per-snap pairings on the bench** (one mismatch falsifies):
   - **host:** on pressure, jnc and joint, the coverage's host equals the host of v5's card on every snap (`selectCoverage`; rule 15).
   - **front against v5:** equal offence calls; equal defence calls with `stunts` and the FRONT tags deleted; and byte-identical snaps where the stunt lists are equal.
   - **pressure against jnc:** the same three claims.
   - **joint against jnc:**
     - `rush.length >= 5` is equal on every snap (line 801's Δ`blitz_rate` = 0 per snap);
     - a line game is worn on one exactly when on the other, because both hostable masses and r_line are equal (rule 15);
     - the defence calls are equal on every snap where joint's call has no creeper and the two offence concepts are equal. The defence is instantiated against the offence's formation (`frozen.ts:734-735`), so a concept redrawn against a guessed creeper changes it;
     - the snaps are byte-identical where, in addition, the offence calls are equal.
     - The count of non-creeper snaps whose offence calls differ (`jointOffenseDiffOffCreeper`) is the huddle's guessed creeper at work. It is reported, not scored.
   - **3.3's base-scoped bench checks compare the arm with the v4 base,** so on a drawn arm they fire by design. They are:
     - `callMismatch`, `recognitionMismatch`, `hotMismatch`, `unaccountedMismatch` and `coverageMismatch`;
     - `covAddedByArm`: the arm rolled a coverage read the base did not (H33:1126);
     - `keptEqPredMismatch`, and `sideEqPredMismatch`, which H33:1144 predicts from the base's fold (`rb.pop`, `rb.readRight`; `rb` is H33:1091);
     - E7's `mappedWhenNoAdjMismatch` (H33:1131-1134).
   - **These are must-be-0 on the v5 and bound arms only,** and reported on front, pressure, jnc and joint. G33 stops on all but E7 for every bench arm (G33:33-36), so `guard34.py` does not inherit that list unscoped.
   - **The arm's own checks hold on every arm, and stop the run:**
     - `leashStampMismatch` (H33:1106), `leashRolls` at leash 50, `brokeReads`, and `n` = records;
     - a new `sideEqPredOwn`: the checked side against `ra.pop.slideWant(ra.pop.poolCalled + wantK.length)` when `ra.readRight`, from the arm's own fold (`ra` is H33:1109). Game mode already checks the same thing (H33:617-626).
   - `keptEqPred` is vacuous, since no 3.4 arm names `/keep-in`.
5. **§4.4's bands, decisive as filed,** at game level over A + B (26,880 games), each verdict printed with its paired per-game SE beside it.
   - **P3, `blitz_rate`** (line 795): |Δ(arm − v5)| ≤ 0.5 pp on pressure, jnc and joint, and each arm's rate inside 20.335–27.511% (23.923% ± 15%, tier1's `relativeBand(0.15)`: `packages/calibration/src/metrics/tier1.ts:606`, :629). "PASS+" is read as both (plan point 22). Expected: P(five or more) is 24.053% of dropbacks on every arm, v5 included, so Δ = 0 by construction (COMPUTED). v5 measured 24.081% (planning).
   - **P4, line games** (line 796): |Δ line-game share| ≤ 1 pp on front, jnc, joint and pressure, and each complexity row, counted per snap with a TRIPLE once (plan point 24), within |Δ| ≤ 0.02. The per-entry counter (H33:550) is printed beside it.
     - Expected line-game share (COMPUTED): 28.463% of dropbacks on v5, front, jnc and joint, and 28.362% on pressure, whose bound stunts over the drawn pressures move it −0.10 pp.
     - Expected rows per line-game snap (COMPUTED):

       | arm | T_E | T_T | DELAYED | TRIPLE |
       |---|---|---|---|---|
       | v5 | .7028 | .1492 | .0740 | .0740 |
       | pressure | .7017 | .1498 | .0742 | .0742 |
       | front | .6987 | .1557 | .0681 | .0775 |
       | jnc | .6986 | .1558 | .0681 | .0775 |
       | joint | .6973 | .1579 | .0662 | .0786 |

     - The largest expected |Δ| from v5 is .0087, joint's T_T. v5 measured .7028 / .1497 / .0738 / .0737 per snap (planning).
   - **P6, `disguise_rate`** (line 798): each arm inside 30–33%. v5 measured 31.636% (planning).
   - **P9, the jnc sack guard** (line 805): |Δsack(jnc − v5)| ≤ 2 × 0.034 pp, the ADR's filed width (line 723). The unpaired SE recomputes to 0.0341 pp at v5's 16.531% (planning).
6. **P5, `BLITZ_DISGUISE_MIX`, re-derived before any arm** (line 797; plan point 9).
   - **As filed:** "within ±0.03 per row of v5's". It is printed with its verdict.
   - **The construction breaks it.** §2.6's single r_s (line 601) moves Dime Man Pressure, the book's only DELAYED pressure (`defensiveCards.ts:826`), from always on its host to r_s of it at seven yards or more (21/39 = .5385). Fire's row, which line 797 names, moves only at six yards or less, where Sky's own ratio (14 of 26) is above r_s = 1/2. Expected rows on five-or-more dropbacks (COMPUTED):

     | row | v5 and front | pressure, jnc and joint | Δ | filed ±0.03 |
     |---|---|---|---|---|
     | STANDARD | .5018 | .5549 | +.0531 | expected FAIL |
     | ZONE_BLITZ | .3064 | .3022 | −.0042 | expected pass |
     | DELAYED | .1060 | .0571 | −.0489 | expected FAIL |
     | ZERO | .0859 | .0859 | .0000 | expected pass |

     So the filed band is expected to FAIL by construction on STANDARD and DELAYED, and that verdict is recorded as filed, with its cause. A per-personnel r_s would hold DELAYED, but it amends line 601's "one r_s shared by every host in s", which only the owner can do.
   - **The re-derived rule.** On the joint arm, over A + B (M4 + M10), each row's count is taken over the arm's own five-or-more dropbacks, as `disguiseOnBlitz5` counts them (H33:551). It is set against Σ over those dropbacks of the row's marginal share in s under v6's draw. A miss outside ± 2 Poisson-binomial SD, √Σp(1−p), is falsified and recorded as measured (3.3's rule-2 form, line 1593). Beyond 3 SD it counts toward the split trigger (rules 7 and 12). The marginal share is

     p_row(s) = [Σ_h hostShare(h, s) · r_s · mix_row(h, s) + Σ_c share(c, s) · 1{row(c) = row}] ÷ P(five or more | s)

     - h runs over the hosts, and mix_row(h, s) is the share of `pressureMix` over h that carries the row.
     - c runs over the bound calls that rush five or more: Cover 0 (ZERO, `defensiveCards.ts:597`), and in the goal-line region the two goal-line calls (five linemen, no row, `defensiveCards.ts:864-869`).
     - A call that names no row counts as STANDARD, as the harness counts it (H33:456, :551).
     - Expected over set A's dropbacks (COMPUTED): STANDARD 79,275 (SD 187.3), ZONE_BLITZ 43,171 (SD 173.4), DELAYED 8,152 (SD 87.0), ZERO 12,268 (SD 103.5). Over A + B the counts are about four times these and the SDs about twice (INFERRED, as above).
   - **Why marginal.** Given the coverage, the row is fixed on every host but Sky: Nickel Cover 1 hosts only Double A (STANDARD, `defensiveCards.ts:542`), Base Cover 1 only Base Run Blitz (STANDARD, :744), and `DIME_COVER_1` only Dime Man Pressure (DELAYED, :826). So a coverage-conditional predictor (`pressureMix`) has p ∈ {0, 1} there and SD 0. It would test only Sky's `/which` die, and not the shared r_s and the fold, which are what move DELAYED from .1060 to .0571.
   - **The conditional form is kept as an exact check of Sky's `/which` die.** On the joint arm, over A + B, on Sky's five-or-more dropbacks, the STANDARD count is set against half of them, since Smoke and Fire weigh 7 and 7 (`defensiveCards.ts:170`, :492), ± 2 SD. Expected: 86,342 such dropbacks on set A, with an SD of 146.9 on the half (COMPUTED).
   - The other arms are reported with their z.
7. **The sampler counts** (3.3's rule-2 form). Each is falsified outside ± 2 SD and recorded as measured. Beyond 3 SD a miss counts toward rule 12's split trigger. They are scored over A + B, each over the arm's own snaps: on joint (M4 + M10) and front (M7 + M13). They are reported on the rest:
   - five-or-more calls on host snaps, against Σ r_s over host snaps (joint);
   - line games, against Σ r_line over hostable calls (joint and front);
   - creepers, against 0.1 × N, where N is the number of creeper-eligible calls (a creeper host, no five-or-more drawn), with SD √(N × 0.1 × 0.9) (joint).
   - **The snaps each count is over:**
     - **A host snap** is a call whose coverage hosts a pressure that applies in s: the snaps on which `/blitz` is thrown (`pressureDraw.ts:221`). The count, Σ r_s and the per-host rows below are taken over those snaps only. So Base Cover 1 counts only at six yards or less, where Base Run Blitz applies (`defensiveCards.ts:745`). At seven yards or more r_s is not 0, but no die is thrown over Base Cover 1.
     - **A hostable call** is one that can wear a line game in s (`wearable` not empty): the snaps on which `/wears` is thrown (:372).
     - **A creeper-eligible call** is one whose coverage hosts a creeper (Sky, Buzz or Base Cover 3) and on which no five-or-more pressure was drawn: the snaps on which the `creeper` die is thrown when the creeper is on (:227).
   - **All are counted over all defensive calls, runs included,** because the dice are thrown on every snap.
   - **Expected** on set A, over v4's 942,361 calls (COMPUTED):

     | count | arm | calls it is over | expected | SD |
     |---|---|---|---|---|
     | five or more on host snaps | joint (the same on pressure and jnc) | 390,141 host snaps | 207,017 | 311.6 |
     | line games | joint (the same on jnc) | 866,812 hostable calls | 268,731 | 430.4 |
     | line games | front | 879,828 hostable calls | 268,731 | 431.9 |
     | creepers | joint | 220,946 eligible calls | 22,095 | 141.0 |

   - Creepers come on 2.345% of all calls and 2.337% of dropbacks, 1 in 42.8, against this ADR's Q5 "about 1 snap in 50 overall" (line 1200). Over A + B the creeper SD is about 282 over all calls (INFERRED, twice set A's). The planning figure of about 223 counted dropbacks only.
   - **Reported beside them, by host:** five-or-more calls on host h against Σ r_s over h's snaps. This makes line 799's "evens out" a count (rule 9). Expected on set A, the same on pressure, jnc and joint (COMPUTED):
     - Cover 3 Sky: 258,768 snaps, 137,348 expected (SD 253.7);
     - Nickel Cover 1: 99,526 snaps, 52,826 (SD 157.4);
     - Base Cover 1: 7,954 snaps, 3,977 (SD 44.6);
     - `DIME_COVER_1`: 23,892 snaps, 12,865 (SD 77.1).
   - **Multiplicity.** Rule 6's four rows and Sky's `/which` check, and this rule's counts, make nine: four rows, the Sky check and three counts on joint, and one count on front. The four rows are dependent, because they sum to the five-or-more count. At 2 SD about 34% of correct runs show at least one miss (INFERRED, independence assumed). That is why 2 SD only records a miss, and 3 SD is the line that counts toward the split trigger.
8. **P8, the creeper (lines 800-804), joint against jnc:**
   - creeper share: rule 7;
   - unaccounted rushers on creeper snaps: the bench's paired mean Δ`unaccountedRushers.length` on joint's creeper snaps, claimed > 0 (line 803's "up"), under the sign rule (rule 10);
   - sack on creeper snaps: the bench's paired mean Δsack there, claimed > 0 (line 804), under the sign rule.
     - P10 (line 730's "up" on creeper snaps) is the same claim, and is scored by this row. Its size, "creeper share × short-snap effect", is the aggregate's expected size below, which is printed and not scored.
     - Expected (COMPUTED): about 13,878 creeper snaps among the bench's 593,962, and a per-snap SE of at most 0.446 pp, at independent outcomes and v5's 16.531% sack rate.
     - So the smallest creeper-snap effect the sign rule can show is about 0.89 pp, and a NOT SHOWN on the creeper rows reads "smaller than about 0.9 points a snap".
   - **aggregate:** |Δsack(joint − jnc)| on all dropbacks ≤ 2 × 0.034 pp, the filed width (line 804's "aggregate within 2 SE"; plan point 23). It is taken at game level over A + B (M4 + M10 against M5 + M11), as `contrast_fn`'s joint − jnc on all dropbacks, with its paired per-game SE printed beside it.
     - It is filed as a check for gross errors, not as a test of the creeper.
     - The expected aggregate is +0.016 to +0.030 pp (INFERRED): the creeper's 2.337% of dropbacks (COMPUTED) times a creeper-snap effect of the order of 3.0's protection-information rows, 0.68 to 1.27 points a snap (lines 1343-1344). That is a quarter to under half of the band.
     - Beside it, the bench's all-snap paired mean Δsack(joint − jnc) is printed with its `bstat` SE (AN33:281-297). It is split into the creeper-snap term and the term on non-creeper snaps where the huddle guessed a creeper and the offence call differs (`jointOffenseDiffOffCreeper`, rule 4).
     - "Creeper share × the creeper-snap Δsack" leaves out that second term, so it is not the bench's prediction.
   - P11 (line 866): the creeper never counts in `blitz_rate`; `creeperNotFourMan` = 0.
9. **P7, the pressure share per hosting family** (line 799): reported, as the designed move (backlog 8b, `docs/decisions/CALIBRATION-BACKLOG.md:1149`).
   - The sim side is P(five or more | host) per host, and the family × rusher-count table, against v5's, over A + B. Expected over set A's dropbacks, v5 and front against pressure, jnc and joint (COMPUTED): Cover 3 Sky .5385 → .5310; Nickel Cover 1 .4000 → .5310; Base Cover 1 .1618 → .1618; `DIME_COVER_1` 1.0000 → .5385.
   - Rule 7's per-host counts are printed here.
   - The real side is the participation feed's `defense_man_zone_type` × `number_of_pass_rushers` (`packages/calibration/src/ingest/sources/participation.ts:171-173`, :189-197), with MIXED reported on its own and folded into MAN (plan point 25).
     - No code builds this joint today: tier1 counts the marginals only (`tier1.ts:1650-1654`), and no cache is on disk (`data-cache` is absent; `packages/calibration/src/ingest/cache.ts:26`).
     - If the feed cannot be fetched, P7 is reported against v5's sim table only, and W says so.
10. **The sign rule, for every directional claim** ("up", "> 0", "down"):
    - PASS if the estimate is beyond 0 in the claimed direction by 2 SE or more; NOT SHOWN between; FAIL if it is beyond 0 in the other direction by 2 SE or more.
    - The SE is the bench's snap SE (`bstat`, AN33:281-297) on bench rows, and the paired per-game SE (`contrast_fn`, AN33:249-268) on game rows.
    - NOT SHOWN is reported as measured, and is not a pass.
11. **Guards carried from 3.3** (line 1728): Δint/att within 2 × 0.016 points and Δcmp/att within 2 × 0.055 points, for every arm against its comparison, at game level over A + B (26,880 games), as 3.3 scored G1 (line 1728), with the paired per-game SE beside each.
    - **A miss is recorded as measured and passed to the fantasy gate.** It is neither a stop nor a split trigger.
      - There are five contrasts with two tests each, so a correct run misses one about a third of the time or more (INFERRED, independence assumed).
      - On the drawn arms, a completion move is a designed consequence of the new pressure-by-coverage mix.
      - Beside each verdict, the bench's direct per-snap effect from M8 is printed, as 3.3 did (line 1728).
    - **Cumulative drift:** joint − v4, with v4 = M1 + M14 (both H34 runs), as information for the fantasy gate. Its lines are completion, interceptions, sacks, check-release targets by role, position target share, and points and yards per team-game.
      - **Its baseline:** the merged v5 (slide-only) uses +0.059 ± 0.009 of the 0.110 completion guard at game level (line 1728). Line 1737's 0.091 was the full arm's. Drift is counted from there.
      - **Per-game columns.** H33's per-game columns carry check-release targets by role, but not position share, points or yards (H33:185-193). Those three get columns in H34's new per-game key (`perGamePops34`, beside H33's `perGamePops`, whose layout is kept), so every drift line has a paired SE. If M14 is skipped, those three lines are set A only, labelled so.
12. **The split trigger** (line 919: "If its arms disagree with its construction, split it into its own ADR before 3.5"). "Disagree" means any of:
    - an exact check in rules 2–4 fails;
    - P3, P4 or P6 falls outside its band (rule 5). The construction determines these three:
      - P3 through the 1e-12 law;
      - P4 through r_line;
      - P6 because the look code is held, a look is legal by the call's family (`masks.ts:333-338`), and every composed call carries its host's family, Fire over Sky its card's FIRE_ZONE. Every legal look applies over all 144 composed calls and moves no rusher (`coverageCatalogue.test.ts:808-841`). P6's rate staying near v5's is INFERRED from these;
    - a count in rules 6–7 misses by more than 3 SD.
    - **What does not count:** P5's filed band failing as rule 6 predicts; P9, a sack guard the construction does not fix (a true jnc − v5 of +0.04 pp would fail it about one time in five, INFERRED); the guards of rule 11; and the creeper's sign rows.
    - **If the trigger fires,** W recommends the split. The owner gets a card whose options name it, not the merge card: a Hold tap cannot say "split", and a Merge tap would contradict line 919.
13. **The triple** (R31, line 1077): exit, sack, conversion (sack ÷ exit) and pressured, with paired SEs, and the held header fields printed beside it. A report with a missing column is INCOMPLETE (`ARCHITECTURE_CHARTER.md:2206-2208`). Every game-level column is over A + B (26,880 games), and every bench column is M8's. Its populations and columns:
    - **The populations,** all of dropbacks. `short`, `blitz5` and `lineGame` are H33's (H33:182). The three new ones are H34's:
      - `creeper`: a call tagged CREEPER;
      - `creeperEligible`: a call whose host (by the host key, rule 15) is a creeper host, Sky, Buzz or Base Cover 3, and which rushes four. It is rule 7's creeper-eligible call on dropbacks, so the creeper's own snaps are in it (23.366% of dropbacks on pressure, jnc and joint, COMPUTED);
      - `bareC3`: `creeperEligible` without the creeper.
      - On the bench each stratum is the first arm's snap's (the last column below).
    - **Game level, each arm against its comparison,** on all dropbacks and on `short`.
    - **Game level, joint − jnc, on `creeperEligible`,** which both arms have. This is an intent-to-treat contrast, about 0.1 of the creeper effect.
    - **Game level, joint's `creeper` against joint's own `bareC3`,** which the creeper die randomizes.
    - **No game-level joint − jnc column on `creeper`.** jnc has no `creeper` snaps by construction, and `contrast_fn` refuses an empty bag (AN33:264).
    - **Game-level `blitz5` and `lineGame` rows carry a label.** Each arm's own dice decide which snaps are in them: P(five or more | Nickel Cover 1) goes from .4000 to .5310, and line games on five-or-more calls from 7.370% of dropbacks to 4.942% on jnc and joint (5.292% on front, 7.268% on pressure; COMPUTED). So the Δ mixes a change of population with the effect.
    - **Bench, keyed on the first arm's snap:** each pair on `blitz5`, `lineGame`, `creeper` and `bareC3`. Both arms replay the same snap there, and the first arm's own die sets the stratum.
14. **What is held** (line 373): D's and E's mechanics; no front looks; the coverage-look code; leash 50; ratings (the flat league); tunables (`fnv1a:395a9ae2` on every shard); and the offence's call mix in distribution, printed by the analyzer's held check (AN33:230's `check_held`).

**Checks that must read 0, by arm** (game mode, every shard; any one above 0 stops the runs as a defect). This is the build plan's list for `guard34.py`, filed as 3.3 filed its own; `guard34.py` scopes each by the run's own header. "All" is v4, v5, bound, pressure, front, jnc and joint. On the bench, the base's `selfOk` must equal its records, and rules 3 and 4 give the rest.

| check | arms |
|---|---|
| H33's always-list (G33): `extrasMismatch`, `poolMismatch`, `contestedMismatch`, `unblockedMismatch`, `rolledWithoutExtras`, `extrasWithoutRoll`, `centreMissing`, `conceptMissing`, `chartTeamMismatch`, `knobLeak`, `adjPredMismatch`, `crStatedMismatch`, `crEligibleNotStated`, `slideCheckMissing` | all, with `knobLeak` and `slideCheckMissing` read through H34's `statesSlide` (v5 or v6) |
| `keptInNamed`, `adjOnMissedRead`, `slideChecksOutsidePopNoK` | v5 and every v6 arm (every 3.4 front is honest, and nobody is kept in) |
| `leashReads` | all (leash 50) |
| `g2.covAddedByArm`, `g2.cfErrors` | all (vacuous with no keep-in) |
| `creeperSnaps` | v4, v5, bound, front, pressure, jnc |
| `creeperNotFourMan`, `creeperDisguiseNotZoneBlitz`, `creeperOnNonHost`, `creeperWithPressure` | all |
| `shownRushMismatch` (identity by construction until 3.5) | all |
| `lineTagWithoutStunt`, `stuntWithoutLineTag`, `lineGameNonLineman`, `tripleNotChain` | all |
| `lineGameOnMovedMan`, `lineGameOverDoubleA`, `lineGameOverSixPreventGL` | front, jnc, joint |
| `pressureUnnamed`: a non-lineman rushes with no PRESSURE tag (read on roles, since the goal-line fronts rush five linemen untagged) | all |
| `dimeCover1Called`: a four-man dime Cover 1 | v4, v5, bound, front |
| `hostUnresolved` (rule 15) | all |
| `hostShareDrift`, `rsAboveOne` (rule 2) | pressure, jnc, joint |
| `tunablesDigest` other than `fnv1a:395a9ae2` (rule 14) | all |

**Before M0.** `pnpm verify` runs on this block as committed, and M0's log records its commit hash. M0's smoke figures are read for pass or fail and timing only. If M0 shows that a filed rule cannot be computed as written, it is amended by a dated note under this heading and recorded as a departure in W (line 1587's convention).

- *2026-10-21, after M0 and before M1: a guard stop is added; no scored rule changes.* The tools review found that a defect in a draw passes every must-be-0 check and shows only as one of rule 7's counts far outside its band. Its example is a front arm that keeps the card's own stunts where no line game is drawn. The guard therefore also stops a run when one of rule 7's three counts misses its expectation by more than 10 SD:
  - five or more on host snaps, on the arms that draw their pressures;
  - line games on hostable calls, on the arms that draw their lines;
  - creepers on creeper-eligible calls, on the arms with the creeper.

  A correct run reaches 10 SD with a chance of about 10⁻²³ (normal approximation). A stop is diagnosed before the runs go on. A defect is fixed, and the runs start again from M0. If the code does what §2.6 says, the count is recorded as measured, and the runs continue. Either way rule 7 still scores the count at 2 SD and counts it toward rule 12 beyond 3 SD. Recorded as a departure in W.

### 3.4 Caller v6: pressures and line games drawn on their own, and the creeper *(2026-10-21; built and measured; v6 is opt-in, the default stays v4)*

**In short.**
- **v6 draws the defence's call in parts.** The coverage is v5's card, drawn on v5's die and folded onto its host. One `/blitz` die at r_s, shared by every host in the situation (1/2 at six yards or less, 21/39 at seven or more), decides five or more, and `/which` picks the pressure. Over the four-man Sky, Buzz and Base Cover 3 calls the creeper comes at `CREEPER_RATE` 0.1. The line game is drawn on its own (`/wears`, `/which`). The huddle decomposes coverage and pressure the same way, creeper included, and guesses no line game. These are §2.6's mechanics as the block above records them (rule 15, lines 1815-1875); this section measures them and does not re-introduce them. The default caller stays v4 (`anticipate.ts:219`) until step 3.5 moves it, once, to v7.
- **Every proof holds.** v4 and v5 replay by name. v4 replays byte for byte on both seed sets (game sha256s: M1 against `s32b`, M14 against R12). v5 replays byte for byte on set A (M2 against P5G) and number for number on set B (M9, one way: 0 of 9,551,662 differ; no set-B game hashes were taken, plan point 18). On the bench the base replays all 593,962 snaps, and v5's arm and base equal R10's one way. The bound arm plays v5's games exactly. The construction is exact, every exact per-snap claim on the bench holds, every must-be-0 check reads 0, and there is no defect.
- **Every scored prediction passes but the two the filing expected or allowed.** P5 as filed FAILS on STANDARD and DELAYED by construction, by the amounts rule 6 computed; the re-derived rule passes. G1 is OUTSIDE on joint − jnc completions, +0.123 ± 0.024 points of attempts against ±0.110: fewer throws on creeper snaps, not more catches (The guards). Neither counts toward the split trigger (rule 12), which did not fire, so W recommends no split.
- **The league blitzes as often as before, but every coverage that can blitz now blitzes alike in each situation where its pressure applies** (Base Cover 1's run blitz applies only at six yards or less, so it stays at .16). `blitz_rate` is 24.079% (v5 24.081%); Nickel Cover 1 goes from .40 to .53 and the dime's Cover 1 from 1.00 to .54. The creeper comes on 2.334% of dropbacks (1 in 42.8, 17.5 a team-season). On the bench it brings +0.76 unaccounted rushers and +0.57 points of sack a creeper snap; over all dropbacks `sack_rate` moves −0.002 ± 0.015 points (−0.02 sacks a team-season).
- **Off the filed lines, the creeper costs the run game.** joint − jnc moves designed-rush yards −1.09 ± 0.33 a team-game (z −3.3; −19 ± 6 a team-season) and points −0.106 ± 0.039 (z −2.7; −1.80 ± 0.66 a team-season). About two-thirds of the yards are lost per carry, downfield, and one-third to fewer carries, because the game has fewer snaps; the run share holds (The run game and points). Against v4 the back runs for 27 ± 10 fewer yards a season, which the fantasy gate calls 3.4's largest per-player mover.
- **Cumulative completion drift, joint − v4, is +0.150 ± 0.043 points, 0.040 past one step's 0.110** (bench +0.239). Like G1's miss, it is fewer throws, not more catches. 3.4's own increment, joint − v5, is +0.092 ± 0.043 at game level, within, but +0.183 on the bench (The guards).
- **R2's banner** (lines 26-28) opens the report and does not apply at this step: every 3.4 front is honest (`shownRushMismatch` 0 on every arm; line 91). R2 is scored at 3.5.

**What ran.** The scratch harness H34 (`adr073Arm34.test.ts`: H33 with v6's grammar, the draw, creeper and line-game counters, the host key, the new populations and a seven-way replay bench) ran in four shards from `packages/calibration` on tree ccd75bb, whose code is 770d6f9's (ccd75bb adds seven ADR lines, the dated note above). Every shard: the flat league, leash 50, tunables `fnv1a:395a9ae2`. Set A is `adr-073:front-arm` × 240 rounds (6,720 games), set B `adr-073:front-arm-2` × 720 (20,160). M0 ran through `r0-34.sh` from 13:01:30 to 13:07:28: 52 checks OK, and every negative control failed as it must (exit 1, want 1). `drive34.sh` then ran M1 to M14 in order, each through `guard34.py` and then its proof line where it has one, from 13:07:52 to 14:54:41: 14 guard passes and 7 proof passes, and it would have stopped at the first failure. HEAD did not move after 13:00:49. `run34.sh` removed the in-repo harness copy on exit.

| run | arm | caller | seeds | size |
|---|---|---|---|---|
| M0 | the checker checked both ways, and smokes of every arm | as M1–M14 | set A, 2 rounds (timing smokes 24) | 56 games each (672 for timing); bench smokes of 4,000 and 12,000 recorded snaps |
| M1, M14 | v4 | `v4` | A, B | 6,720 + 20,160 games |
| M2, M9 | v5 | `v5` | A, B | 26,880 games |
| M3 | bound | `v6/pressures-bound/lines-bound` | A | 6,720 games |
| M6, M12 | pressure | `v6/creeper-0/lines-bound` | A, B | 26,880 games |
| M7, M13 | front | `v6/pressures-bound` | A, B | 26,880 games |
| M5, M11 | jnc | `v6/creeper-0` | A, B | 26,880 games |
| M4, M10 | joint (= v6) | `v6` | A, B | 26,880 games; M4's 593,072 dropbacks recorded |
| M8 | bench | each of `s32b`'s 593,962 recorded v4 dropbacks re-run alone under v4 and six arms (v5, bound, pressure, front, jnc, joint) | A | 593,962 snaps × 7 |

**The proofs ✅** (rule 3, P1; one difference falsifies)
- **M0.** The proof checker passes P5G against itself both ways and one way. It fails the joint smoke against P5G on every game (56 of 56) and against the v5 smoke on numbers, and it fails the bench smoke's joint arm (`proof34-m0-bench-m0-neg.json`) against the slide arm of H33's own bench smoke on the same 4,000 records (`m0h33bench`), which the smoke's v5 arm and base equal one way, 0 differ on every subtree (`proof34-m0-bench-m0-h33.json`). The v4, v5 and bound smokes equal their references on the 56-game prefix (`s32b`, H at 2 rounds, H33 at 2 rounds, P5G, the v5 smoke). The bench smokes replay 4,000 of 4,000 and 12,000 of 12,000.
- **v4 by name.** M1 equals `s32b` on all 6,720 games (sha256 and event counts) and on all 2,874,432 numbers `s32b` carries, one way, with H33's and H34's keys declared, and equals R1 on all 3,212,116 one way. M14 (set B) equals R12 on all 20,160 games and on all 9,553,780 numbers. Every line reads 0 differ, 0 missing, 0 extra.
- **v5 by name.** M2's 6,720 game sha256s equal P5G's, and 0 of P5D's 3,212,510 numbers differ; M9 differs from P5DB in 0 of 9,551,662. On the bench, M8's v5 arm and base equal R10's slide arm and base one way: scalars 0 of 44, base 0 of 5,516, scope 0 of 108, pairs 0 of 7,200, the arm's front 0 of 5,516 (`g2Bench` is empty on both sides, so it shows nothing).
- **bound ≡ v5.** M3's 6,720 games equal M2's, and 0 of 3,655,334 numbers differ both ways, with only the label fields set aside. On the bench, `boundNotIdentical` is 0 of 593,962.
- **The drawn arms do differ.** M4 equals none of M1's or M2's games, and M10 none of M14's.

**The construction ✅** (rule 2, P2)
- In game mode, on every call, `hostShareDrift` (any |Δ| above 1e-12 between v5's host share and P(five or more) from `DEFENSIVE_CARDS` and v6's from playbook's exports) and `rsAboveOne` read 0: over 3,766,020 calls on pressure, 3,766,070 on jnc and 3,762,917 on joint. `rLineAboveOne` reads 0 on front, jnc and joint. The largest |Δ| on any shard is 5.551e-17 (2⁻⁵⁴).
- The 1e-12 sweep (`pressureDraw.test.ts:223-283`) and the stubbed-sampler test pass in the verify the report reads (`build34/verify-gross.log`: build, test and typecheck at exit 0; `pressureDraw.test.ts`, 45 tests).
- What a 0 here does not show (`tools-fix.md` §4 item 2): these counters test playbook's exports and law against `DEFENSIVE_CARDS`, not the caller's dice. The dice are tested by rule 7's counts (below) and by the guard's floors.

**The exact claims, per snap on the bench ✅** (rule 4; one mismatch falsifies)
- **host:** on pressure, jnc and joint the coverage's host is the host of v5's card on all 593,962 snaps (on bound and front too, reported).
- **front against v5, and pressure against jnc:** equal offence calls, and equal defence calls with the line games set aside, on all 593,962 snaps; byte-identical where the stunt lists are equal (326,394 and 327,555 snaps). 0 differ on every claim.
- **joint against jnc:** five or more is equal on every snap (`fiveDiffer` 0: line 801's Δ`blitz_rate` = 0 per snap), and a line game is worn on the same snaps (`wearsDiffer` 0). The defence calls are equal on all 580,085 snaps with no creeper (`jointDefenseDiffOffCreeper` 0), and the snaps are byte-identical on the 566,630 of them where the offence calls are equal too. The bench holds 13,877 creeper snaps (rule 8 expected about 13,878).
- **The arms' own checks** (the leash stamp, leash rolls at 50, BROKE reads, the checked side, `n`) read 0 on every arm over 593,962 records, and the base replays all 593,962 (`selfOk`). 3.3's base-scoped checks read 0 on v5 and bound, and fire by design on the drawn arms (joint's `callMismatch` 460,892), as rule 4 files.
- **The huddle's guessed creeper:** on 13,455 of the 580,085 snaps with no creeper, joint's offence call differs from jnc's (reported; The Creeper, below).

**§4.4, filed against measured** (game level over A + B, 26,880 games a role, paired per-game SE; F's readings, rules 5–9):

| prediction | filed | measured | verdict |
|---|---|---|---|
| P1 reproduction by name (line 793) | v4 and v5 replay by name; `DEFENSIVE_CARDS` and its 22 cards untouched | v4 byte-level on both sets; v5 byte-level on set A and number for number on set B (0 of 9,551,662 differ); the bench as in The proofs | PASS |
| P2 the construction (line 794) | host shares and P(five or more) equal v5's, to 1e-12 | `hostShareDrift` 0 and `rsAboveOne` 0 on every call; the largest Δ 5.551e-17 | PASS |
| P3 `blitz_rate` (line 795) | within ±0.5 pp of v5's, and inside 20.335–27.511% | Δ pressure −0.005, jnc +0.009, joint −0.002 pp (SE 0.032); joint 24.079%, every arm inside | PASS |
| P4 line games (line 796) | share within ±1 pp of v5's; each row within ±0.02 a snap | Δ share front −0.003, jnc −0.041, joint −0.039 (SE 0.041), pressure −0.078 pp (SE 0.029); the largest row Δ joint's DELAYED −.0075 (T_T +.0074; F's largest expected move was joint's T_T, +.0087, and its DELAYED −.0078) | PASS |
| P5 `BLITZ_DISGUISE_MIX`, as filed (line 797) | each row within ±0.03 of v5's; F expected FAIL on STANDARD and DELAYED (lines 1960-1965) | joint STANDARD .5556 against v5's .5023 (+.0533; F +.0531), DELAYED .0567 against .1059 (−.0492; F −.0489), ZONE_BLITZ −.0042, ZERO .0000 | FAIL, as predicted |
| P5 re-derived (rule 6) | each row's count on joint's own five-or-more dropbacks within ± 2 SD of v6's law; Sky's `/which` at half | on 570,888 dropbacks: STANDARD 317,164 against 316,821.3 (SD 374.4, z +0.92), ZONE_BLITZ 172,254 against 172,479.1 (346.5, −0.65), DELAYED 32,385 against 32,504.7 (173.7, −0.69), ZERO 49,085 against 49,082.8 (207.1, +0.01); Sky 172,472 of 344,726 against 172,363.0 (293.6, +0.37) | PASS |
| P6 `disguise_rate` (line 798) | each arm inside 30–33% | pressure 31.611%, front 31.623%, jnc 31.604%, joint 31.611% | PASS |
| P7 pressure share by host (line 799) | evens out; reported | the table below | REPORTED |
| P8 the creeper (lines 800-804); P10 (line 730) | Δ`blitz_rate` 0 a snap; share = rate × legal share; unaccounted rushers up and sack > 0 on creeper snaps; aggregate within 2 SE | `fiveDiffer` 0; 87,852 creepers against 88,187.3 (z −1.19); +0.7586 ± 0.0048 (z +158); +0.57 ± 0.24 points (z +2.40); −0.002 ± 0.015 against ±0.068 | PASS on every row |
| P9 the jnc sack guard (line 805) | within ±0.068 pp of v5's | −0.016 ± 0.027 pp | PASS |
| P11 (line 866) | the creeper never counts in `blitz_rate` | `creeperNotFourMan` 0 | PASS |

In football units: P3 is 180.5 five-or-more dropbacks a team-season (v5 180.8); P4's line games are 213.1 a team-season (v5 213.7), and pressure's −0.078 points are −0.6 of them; P9's −0.016 points are −0.12 sacks a team-season.
- **The split trigger did not fire** (rule 12): the report's verdicts 2–7 and 9 (rules 2–4: the proofs, the construction and the bench pairings; P3, P4 and P6) pass, and no scored count misses by more than 3 SD (the largest scored |z| are joint's creepers and front's line games, 1.19 each).
- **The interaction** (rule 1; printed, not scored): jnc − pressure − front + v5 at game level is +0.038 ± 0.031 points of sack, +0.004 ± 0.036 of exit, +0.017 ± 0.031 pressured, +0.002 ± 0.016 int/att and −0.003 ± 0.049 cmp/att. On the bench the four-way per snap is +0.00001 ± 0.00014 (sack), +0.00011 ± 0.00019 (exit), +0.00011 ± 0.00018 (pressured) and exactly 0 on unaccounted rushers. No interaction between the two draws shows.
- **The huddle rides with the pressure draw** (rule 1, line 1898). pressure − v5 and jnc − v5 measure the pressure draw together with the switch from v5's CARD huddle to the decomposed one, which line 622 couples to it; front, with its pressures bound, keeps the CARD huddle (`frozen.ts:486`), and no arm separates the two. The interaction and joint − jnc are free of that switch, though joint − jnc carries the huddle's guessed creeper (The Creeper, below).
- **Why P5 fails, in football.** The one r_s per situation (line 601) moves Dime Man Pressure (five rushers, the book's only DELAYED disguise, the word SMOKE) from always on its host to 21/39 of it, and raises Nickel Cover 1's Double A (six rushers, STANDARD) from .4000 to 1/2 at six yards or less and 21/39 at seven or more. So DELAYED falls and STANDARD rises by the amounts F computed. pressure and jnc read the same as filed (outside on both rows), and within 2 SD of v6's law (reported). A per-personnel r_s would hold DELAYED, but it amends line 601, which only the owner can do (line 1967).

**P7, the pressure share by host** (rule 9; reported, the designed move; dropbacks over A + B, F's set-A expected in brackets; five-or-more dropbacks a team-season):

| host | v5 | joint | a team-season |
|---|---|---|---|
| Nickel Cover 3 Sky | .5392 of 648,891 [.5385] | .5315 of 648,588 [.5310] | 110.6 → 109.0 |
| Nickel Cover 1 | .4009 of 250,275 [.4000] | .5316 of 250,138 [.5310] | 31.7 → 42.0 |
| Base Cover 1 | .1633 of 59,905 [.1618] | .1636 of 59,978 [.1618] | 3.1 → 3.1 |
| `DIME_COVER_1` | 1.0000 of 60,534 [1.0000] | .5368 of 60,334 [.5385] | 19.1 → 10.2 |
| Nickel Cover 3 Buzz | 0 of 150,197 | 0 of 150,192 | 0 |
| Base Cover 3 | 0 of 100,167 | 0 of 100,339 | 0 |
| all dropbacks | 24.081% | 24.079% | 180.8 → 180.5 |

- Rule 7's per-host counts on the snaps where `/blitz` is thrown (all calls) sit within 1 SD on joint: Sky z +0.54, Nickel Cover 1 +0.02, Base Cover 1 +0.92, the dime +0.27. Per-pressure shares of joint's dropbacks: Creeper .0233, Double A .0561, Fire .0768, Smoke .0864, Zero .0207 (v5: Double A .0423, Fire .0778, Smoke .0992, Zero .0207). FIRE_ZONE's row falls from 7.37% to 7.27% of dropbacks (the shell prior is 7%).
- **By family × rushers** (report §10, shares of dropbacks, v5 → joint): Cover 1 with five rushers .0255 → .0137 (the dime's pressure) and with six .0464 → .0602 (the Double A, .0423 → .0561, plus Base Cover 1's run blitz, .0041 on both; the rise is all the Double A); Cover 3 with four .2314 → .2338. Unfolded, the sim's MIXED (24.9% of rows) sends five or more on .3237 → .3320 of its rows, and its own MAN (1.2% of rows) always does.
- **Against real football** (the nflverse participation feed, 2022–2024: 64,293 rows charted with both coverage and rushers, of 142,237; `realjoint34.json`). Folding the sim's mixed Cover 1 looks into man (plan point 25), P(five or more | man) moves .3558 → .3636 against real .3960 (26,162 rows), and P(five or more | zone) .2001 → .1973 against real .1686 (38,131). Both move toward real: the gaps go −4.02 → −3.25 and +3.15 → +2.87 points. With 1–11 rushers only, real reads .3985 and .1699. The sim plays man on 26.2% of dropbacks against real's 40.7%.
- **The cells move away from real.** Man with five rushers falls from .0260 to .0142 of rows (real .1120), and man with six rises from .0671 to .0809 (real .0395). So five-to-six goes 0.39 → 0.175 against real 2.84: 19.5 → 10.6 five-man and 50.4 → 60.7 six-man man rushes a team-season. Almost every five-man man call in the sim is the dime's blitz: 60,534 of v5's 61,718 such dropbacks, and the rest are Goal Line Man's five-man front (1,184 → 1,166, about 0.4 a team-season on both arms; COMPUTED here from the shards). So the cell halves with the dime's blitz (19.1 → 10.2 a team-season), and the six-man Double A takes its place (31.7 → 42.0). The total-variation distance from the real shell × rushers table rises from 0.2311 to 0.2450 (COMPUTED here from the shards against `realjoint34.json`: 0.23106 and 0.24503; the gate memo's 0.2451 matches the report's rounded cells, which sum to 0.24505). Backlog 8b's dated note records it.
- **The real side moves by season:** man is 28.7%, 42.3% and 49.3% of charted rows in 2022, 2023 and 2024; P(five or more | man) .482, .365 and .381; P(five or more | zone) .176, .173 and .156.

**The sampler counts ✅** (rule 7; scored on joint and front, over all calls, runs included; each within ± 2 SD)
- **joint:** five or more on 1,557,393 host snaps, 826,730 against Σ r_s 826,325.9 (SD 622.5, z +0.65); line games on 3,460,824 hostable calls, 1,072,751 against Σ r_line 1,072,771.1 (SD 860.1, z −0.02); creepers on 881,873 eligible calls, 87,852 against 88,187.3 (SD 281.7, z −1.19).
- **front:** line games on 3,517,334 hostable calls, 1,075,263 against 1,074,238.5 (SD 863.5, z +1.19).
- **Reported, not its law:** pressure's line count is 1,070,186 against 1,073,685.3 (SD 860.4, z −4.07). Its lines are bound, so each call wears its card's own stunt and Σ r_line is not its law. The shortfall is the −0.10 pp F computed for this arm (line 1942): on the bench, pressure − v5 wears 549 fewer line games (−0.092 pp), every one of them over Sky, where Fire with its Tex falls from 7/26 to 1/4 of Sky's calls at six yards or less. Taking that out leaves z +0.56 (INFERRED: the verification's estimate of the six-yard share).

**The Creeper.**
- **How often.** 87,852 of 3,762,917 calls (2.335%) and 55,339 of 2,370,918 dropbacks (2.334%): 1 in 42.8, 1.03 a team-game, 17.5 dropbacks a team-season (27.8 calls with runs). That is 9.96% of the 881,873 eligible calls, the owner's 1 in 10. F computed 2.337% of dropbacks before any arm (line 1997). The owner was told "about 1 snap in 50 overall" (line 1200), about 15 a season: it comes about 17% more often than that, because 23.4% of dropbacks are eligible. By host: Sky 30,287 (54.7%; 9.6 a team-season), Buzz 14,957 (27.0%; 4.7), Base Cover 3 10,095 (18.2%; 3.2). Over Sky it comes on 4.69% of the bench's Sky snaps, about 1 in 21, because Sky blitzes half the time; over Buzz and Base Cover 3 on about 1 in 10 (9.98%, 10.05%). It always rushes four (`creeperNotFourMan` 0).
- **What it does on its snaps** (bench, joint − jnc, the same 13,877 snaps). It brings +0.7586 ± 0.0048 unaccounted rushers a snap (z +158; 0.068 → 0.826): the linebacker the four-man guess did not name. No creeper snap has a fully unblocked rusher (0 on both arms). The slide or a spare man reaches him: +0.29 slid pickups, +0.23 pickups lost and +0.24 hot conversions a snap. So the creeper does not free a rusher; it turns a named pickup into a contested one.
  - Sacks rise +0.57 ± 0.24 points a snap (z +2.40; 16.64% → 17.21%; +79 sacks), +0.10 ± 0.04 a team-season. On snaps whose line game is the same in both arms, +0.53 ± 0.24 (12,332); where it differs, +0.91 ± 0.89 (1,545). The smallest effect the sign rule could show here is 0.47 points (F: at most about 0.89, line 2010). Exit +1.02 ± 0.34; pressured +0.55 ± 0.28.
  - The quarterback throws less, not worse: attempts −5.84 ± 0.31 and completions −0.16 ± 0.25 a hundred snaps (−811 and −22), interceptions −0.12 ± 0.10, completion rate 36.17% → 39.30%.
  - Within joint at game level, where the creeper die randomizes, creeper against bare Cover 3: sack +1.05 ± 0.17 points (A +1.16 ± 0.33, B +1.01 ± 0.19; +0.18 a team-season). Throwaways are 3.40% against 6.58% of dropbacks, scrambles 19.94% against 15.41%, and hot throws .1422 against .0219 a dropback. cmp/att is +3.10 ± 0.27, attempts a dropback −5.57 ± 0.22, completions a dropback −0.07 ± 0.19.
  - The paired bench figure sits below the within-joint one by chance: under jnc, the snaps the creeper die later picked were sacked 0.39 points more often than the rest of bare Cover 3 (16.64% against 16.25%, z 1.17).
- **The huddle's guessed creeper** (rule 4; reported). The huddle guesses the creeper at the real rate (rule 15, line 1835). So on 13,455 of the 580,085 bench snaps with no creeper (2.32%; about 17.0 a team-season, as often as the real one) the offence protects for a creeper that does not come.
  - The concept is the same on all 580,085 snaps; only the protection differs (INFERRED from that check).
  - There the end the huddle expected to drop rushes: +0.776 ± 0.005 unaccounted rushers a snap, and fully unblocked +0.141 ± 0.003 (1,897 in all, about 2.4 a team-season). Hot conversions +0.318 a snap, pressured +1.55 and exit +1.58 points.
  - Sacks −0.36 ± 0.19 points (NOT SHOWN, z −1.9); completions +1.09 ± 0.22 and attempts +1.56 a hundred snaps (+147, +210).
  - On the 13,877 real creeper snaps the offence call differs on 395 (2.85%), more often than off them (2.32%), because the huddle's pool holds only the real coverage's personnel (`anticipate.ts:324-326`; INFERRED).
- **The aggregate** (rule 8; a gross-error check). joint − jnc moves Δsack on all dropbacks −0.002 ± 0.015 points (band ±0.068; −0.02 ± 0.11 sacks a team-season). That is below F's expected +0.016 to +0.030 (line 2013, INFERRED there). The bench says why: its all-snap +0.0052 ± 0.0070 is the creeper-snap term +0.0133 ± 0.0055, plus the huddle-guess term −0.0081 ± 0.0043, plus exactly 0 on the 566,630 identical snaps. F's expectation left out the huddle term (line 2015 says so) and took a per-snap size (0.68 to 1.27) above the bench's +0.57. Game against bench: z −0.44.

**Rule 15's choices, measured** (the owner hears these as information, with no card).
- **`DIME_COVER_1`** (line 1842): the dime back (CB_D), not the nickel back, takes the third receiver to the right, or sits in the hole (HOLE C) when there is none. It is called only with seven or more yards to go, on any down (weight 0, `minDistance` 7, `coverageCatalogue.ts:131`). That is 81.4% of joint's set-A dropbacks (482,540 of 593,072), every first-and-10 among them (203,398), so it is not "long yardage".
  - It comes on 27,949 of 2,370,918 dropbacks (1 in 84.8; about 9 a team-season; 43,962 calls with runs).
  - On set A it comes on 7,005 of the 482,540 at seven or more (1 in 68.9). The law over M4's own situations gives 6,967 (z +0.45).
  - v4, v5, bound and front never call it (`dimeCover1Called` 0).
- **The dime blitz and the Double A.** Dime Smoke comes about half as often (60,534 → 32,385 dropbacks; 19.1 → 10.2 a team-season), and Nickel Cover 1's Double A rises (100,330 → 132,968; 31.7 → 42.0). At seven or more yards the Double A gains exactly what the dime loses (by the law; INFERRED, since the shards carry no down or distance a call). At six or less its gain comes from Sky's Smoke and Fire, about 0.8 each a team-season. Total blitzes are unchanged (24.08%).
- **The creeper over Buzz** (line 1840): the Mike slides from the right hook to the far curl-flat (CURL_FLAT LW). That is 14,957 of 55,339 creeper dropbacks (27.0%; 4.7 a team-season), chosen by line 612's text, not by a football review.
- **A four-man Double A is a creeper by the word rule** (line 1818). No run called one: every Double A rushes six (v5 100,330 and joint 132,968 dropbacks, four-man 0), so the word change touched no snap.
- **The stunt limits** (line 1820: no line game on a six-man rush, Prevent or goal line, and only two down linemen who both rush) forbid nothing v5 did. v5 never stunted a six-man call (0 of 159,245; joint 0 of 191,867), and no Prevent or goal-line call stunts on any arm.
  - The line stunts as often as before (28.467% → 28.428% of dropbacks; 213.7 → 213.1 a team-season), but off the blitzes and onto four-man rushes. On five or more it falls 30.59% → 20.49% (55.3 → 37.0 a team-season); on four or fewer it rises 27.79% → 30.95%.
  - Line games on five-or-more calls are 4.933% of dropbacks, against F's computed 4.942% (line 1827). In v5 every blitz stunt was Fire Zone's own Tex; now Smoke, Fire and Dime Smoke each stunt about 31% of the time.

**The triple** (rule 13; Δ points, paired per-game SE; Charter:2206-2217):

| contrast | population | Δ pocket broken down (exit) | Δsack | Δconversion (sack ÷ exit) | Δpressured |
|---|---|---|---|---|---|
| pressure − v5 | all | +0.22 ± 0.03 | −0.03 ± 0.03 | −0.10 ± 0.03 | +0.14 ± 0.03 |
| | `short` | +0.82 ± 0.07 | −0.04 ± 0.06 | −0.25 ± 0.07 | +0.56 ± 0.05 |
| front − v5 | all | +0.10 ± 0.03 | −0.03 ± 0.02 | −0.06 ± 0.03 | +0.04 ± 0.02 |
| | `short` | +0.28 ± 0.05 | −0.11 ± 0.04 | −0.21 ± 0.05 | +0.58 ± 0.04 |
| jnc − v5 | all | +0.32 ± 0.03 | −0.02 ± 0.03 | −0.11 ± 0.03 | +0.19 ± 0.03 |
| | `short` | +1.04 ± 0.07 | −0.19 ± 0.06 | −0.49 ± 0.07 | +1.05 ± 0.05 |
| joint − jnc | all | +0.02 ± 0.02 | −0.00 ± 0.02 | −0.01 ± 0.02 | +0.03 ± 0.01 |
| | `short` | −0.49 ± 0.03 | +0.06 ± 0.03 | +0.19 ± 0.04 | −0.36 ± 0.03 |
| | `creeperEligible` (intent to treat) | +0.04 ± 0.04 | +0.03 ± 0.03 | +0.03 ± 0.04 | −0.05 ± 0.03 |
| joint − v5 | all | +0.34 ± 0.03 | −0.02 ± 0.03 | −0.12 ± 0.03 | +0.22 ± 0.03 |
| | `short` | +0.54 ± 0.06 | −0.13 ± 0.06 | −0.30 ± 0.07 | +0.68 ± 0.05 |
| joint: creeper − `bareC3` | within joint (the creeper die randomizes) | +0.63 ± 0.19 | +1.05 ± 0.17 | +1.19 ± 0.21 | +0.13 ± 0.16 |
| bound − v5 | all, `short`, `blitz5`, `lineGame` (set A only) | 0 | 0 | 0 | 0 |

Each arm's own dice move `short`, `blitz5` and `lineGame` (Departures), so those rows mix a change of population with the effect; the report prints the game-level `blitz5` and `lineGame` rows with that label. No game-level joint − jnc row on `creeper` exists: jnc has none (line 2053). In football units (COMPUTED here: the figures' deltas × 750 dropbacks a team-season), joint − v5 adds about 2.6 ± 0.24 broken pockets and 1.6 ± 0.21 pressured dropbacks a team-season, and moves sacks −0.14 ± 0.21. The bench strata are clean, because both arms replay the same snap and the first arm's die sets the stratum (Δ points a snap ± snap SE):

| pair | stratum | snaps | Δexit | Δsack | Δconversion | Δpressured |
|---|---|---|---|---|---|---|
| front − v5 | `blitz5` | 143,203 | +0.11 ± 0.04 | −0.20 ± 0.03 | −0.27 ± 0.04 | +0.30 ± 0.04 |
| | `lineGame` | 168,670 | +3.36 ± 0.08 | +0.63 ± 0.06 | −0.12 ± 0.08 | +5.10 ± 0.08 |
| | `bareC3` | 137,523 | +0.78 ± 0.06 | +0.19 ± 0.04 | +0.02 ± 0.05 | +1.12 ± 0.06 |
| pressure − v5 | `blitz5` | 142,905 | +2.60 ± 0.10 | −0.30 ± 0.08 | −1.05 ± 0.10 | +2.35 ± 0.09 |
| | `lineGame` | 168,060 | +2.61 ± 0.06 | +1.13 ± 0.05 | +0.74 ± 0.06 | +2.34 ± 0.05 |
| | `bareC3` | 138,752 | −0.44 ± 0.08 | +0.12 ± 0.06 | +0.29 ± 0.08 | −0.89 ± 0.07 |
| jnc − v5 | `blitz5` | 142,905 | +2.68 ± 0.10 | −0.47 ± 0.08 | −1.28 ± 0.10 | +2.67 ± 0.09 |
| | `lineGame` | 168,851 | +2.91 ± 0.09 | +0.70 ± 0.07 | +0.10 ± 0.09 | +4.74 ± 0.08 |
| | `bareC3` | 138,752 | +0.40 ± 0.09 | +0.29 ± 0.07 | +0.27 ± 0.09 | +0.22 ± 0.08 |
| pressure − jnc | `blitz5` | 142,905 | −0.08 ± 0.04 | +0.17 ± 0.03 | +0.23 ± 0.04 | −0.32 ± 0.04 |
| | `lineGame` | 168,060 | +3.11 ± 0.08 | +0.55 ± 0.06 | −0.14 ± 0.07 | +4.82 ± 0.07 |
| | `bareC3` | 138,752 | −0.84 ± 0.06 | −0.17 ± 0.04 | +0.02 ± 0.05 | −1.11 ± 0.06 |
| joint − jnc | `blitz5` | 142,905 | +0.15 ± 0.01 | +0.02 ± 0.01 | −0.02 ± 0.01 | +0.17 ± 0.01 |
| | `lineGame` | 168,851 | +0.00 ± 0.02 | −0.00 ± 0.01 | −0.01 ± 0.02 | +0.05 ± 0.02 |
| | `creeper` | 13,877 | +1.02 ± 0.34 | +0.57 ± 0.24 | +0.45 ± 0.32 | +0.55 ± 0.28 |
| | `bareC3` | 124,875 | −0.01 ± 0.02 | −0.01 ± 0.01 | −0.01 ± 0.01 | −0.02 ± 0.01 |
| joint − v5 | `blitz5` | 142,905 | +2.83 ± 0.10 | −0.46 ± 0.08 | −1.29 ± 0.10 | +2.84 ± 0.09 |
| | `lineGame` | 168,851 | +2.91 ± 0.10 | +0.69 ± 0.07 | +0.09 ± 0.09 | +4.78 ± 0.09 |
| | `creeper` | 13,877 | +1.56 ± 0.36 | +1.16 ± 0.26 | +1.08 ± 0.34 | +1.02 ± 0.31 |
| | `bareC3` | 124,875 | +0.37 ± 0.10 | +0.25 ± 0.07 | +0.22 ± 0.09 | +0.18 ± 0.09 |

bound − v5 is exactly 0 on every stratum (143,203, 168,609 and 137,523 snaps). Off joint the `creeper` stratum is empty by construction. Read across the rows:
- **The pressure draw, with its decomposed huddle** (Double A in place of the dime's blitz), breaks the pocket more on the blitzes and converts less: `blitz5` exit +2.60, conversion −1.05.
- **The line draw** puts games on rushes v5 never stunted: on `lineGame` snaps, front − v5 is exit +3.36, sack +0.63 and pressured +5.10 points a snap.
- **The creeper** acts on its own snaps only. joint − jnc is within 0.17 points of 0 on every other stratum; its `blitz5` row (+0.15 exit, +0.17 pressured) is the huddle's guess at work (INFERRED: those snaps carry no creeper).

**Held** (rule 14): rounds, shards, looks, league, leash, the tunables label and digest are identical in the headers on A and B (bound on A). The offence's call mix on dropbacks is held in distribution: the largest share difference is 0.04 points (Mesh 7.10% against 7.06%, pressure − v5, ± 0.02), and bound − v5 is equal call for call.

**The guards.**
- **G1** (rule 11): Δint/att within 2 × 0.016 and Δcmp/att within 2 × 0.055 points, every arm against its comparison:

  | contrast | Δint/att | Δcmp/att | verdict | bench direct: Δint/att, Δcmp/att, Δatt a snap |
  |---|---|---|---|---|
  | pressure − v5 | −0.005 ± 0.013 | −0.041 ± 0.041 | within | −0.026, +0.046, −0.00157 |
  | front − v5 | +0.002 ± 0.011 | +0.012 ± 0.036 | within | +0.004, +0.048, −0.00059 |
  | jnc − v5 | −0.001 ± 0.014 | −0.031 ± 0.043 | within | −0.028, +0.095, −0.00212 |
  | joint − jnc | −0.011 ± 0.008 | **+0.123 ± 0.024** | **OUTSIDE** (cmp) | −0.001, +0.088, −0.00101 |
  | joint − v5 | −0.012 ± 0.014 | +0.092 ± 0.043 | within | −0.029, +0.183, −0.00313 |

  - **The miss is real** (z about 5.2 against 0) and 0.013 points past the width. Set A reads +0.102 ± 0.048 and set B +0.130 ± 0.027.
  - **Its cause is fewer throws, not more catches**, established on the bench. The direct +0.088 is +0.071 (80.5%) from the creeper snaps, where attempts fall by 811 while completions hold (−22): throwaways halve and scrambles rise. The other +0.017 (19.5%) is from the huddle's guessed creeper (completions +147, attempts +210). Game against bench, the figure sits above the direct one at z about +1.3.
  - **In football units:** +0.62 ± 0.12 completions a team-season at fixed attempts (the width is 0.55). Measured a dropback: completions +0.057 ± 0.018 points (+0.43 ± 0.13 a team-season) and attempts −0.067 ± 0.020 (−0.50 ± 0.15). The fantasy gate's counts per team-game, scaled to a season (+0.28 ± 0.14 completions, −0.91 ± 0.25 attempts), also carry the fewer dropbacks a game: plays fall 0.059 a team-game and carries 0.023, so dropbacks about 0.036 (INFERRED arithmetic).
  - Recorded as measured, and passed to the fantasy gate; neither a stop nor a split trigger (rule 11).
- **Cumulative drift, joint − v4** (rule 11; information for the fantasy gate). Completion rises +0.150 ± 0.043 points (bench +0.239), 0.040 past one step's 0.110 width. It is counted from the merged v5's +0.059 ± 0.009 (line 2033); 3.4's own increment, joint − v5, is +0.092 ± 0.043, within.
  - **Game against bench, on the pressure draw** (the second verification's anomalies F2 and F3). On the bench, without dice, joint − v5's direct completion rise is +0.183 points, past the 0.110 width. All of the gap, and more, is jnc − v5's: −0.031 ± 0.043 at game level against +0.095 on the bench (z about −1.5 to −2.3, since the bench's SE lies between 0.035 and 0.071). joint − jnc runs the other way (game +0.123, bench +0.088) and takes 0.035 back. Sacks split the same way: jnc − v5 is −0.016 ± 0.027 points at game level (P9's figure) against +0.072 ± 0.033 on the bench (z −2.04), and pressure − v5 −0.028 ± 0.027 against +0.051 ± 0.028 (z −2.05). The bench is set A's dropbacks; on set A alone the game agrees with it within 1 SE, and set B carries the gap. That verification reads it as noise on contrasts that share the pressure draw. The filed verdicts are game-level and stand.
  - **In football units:** +0.75 ± 0.21 completions a team-season at fixed attempts (the width is 0.55). Measured a dropback: completions +0.034 ± 0.032 points (+0.25 ± 0.24 a team-season) and attempts −0.178 ± 0.036 (−1.34 ± 0.27). So the drift, like G1, is fewer throws, not more catches. The fantasy gate's counts per team-game, scaled to a season (completions −0.01 ± 0.24, attempts −2.05 ± 0.44), also carry the fewer dropbacks a game: −0.063 ± 0.023 a team-game, −1.07 ± 0.39 a team-season. (The ± 0.21, the figures a dropback and the dropbacks a game are COMPUTED here from the figures and shards, paired per game by the method that reproduces the figures' +0.150 ± 0.043; the +0.75 is the verifications'.)
  - Interceptions −0.012 ± 0.014 points of attempts; sacks −0.029 ± 0.027 of dropbacks.
  - Check-release targets a dropback: RB −0.077 ± 0.015 (every released man −0.034 ± 0.016), FB −0.027 ± 0.008, TE_Y −0.008 ± 0.004. That is −0.58, −0.20 and −0.06 a team-season. About 60% of the RB fall is joint − jnc (−0.046 ± 0.008, z −5.8).
  - Target share: WR +0.060 ± 0.047, TE −0.026 ± 0.047, RB +0.000 ± 0.034, FB −0.034 ± 0.023.
  - Points −0.133 ± 0.070 and yards −0.697 ± 0.704 a team-game (−2.3 ± 1.2 and −12 ± 12 a team-season).
  - Against v5 (the gate's, a team-season): RB check-release targets −0.63 ± 0.11, all RB targets −0.14 ± 0.17, RB receptions −0.16 ± 0.11. The back's receiving line does not move.
- **Every must-be-0 check reads 0** on every arm it covers, in every shard (F's table, line 2058). F's rows alone are 31, 34, 34, 35, 37, 38 and 37 checks on v4, v5, bound, pressure, front, jnc and joint. The report prints 38, 41, 41, 43, 46, 48 and 47: F's rows plus the guard's added stops (Departures), less `tunablesDigest`, which it checks but does not count (with it, 39, 42, 42, 44, 47, 49 and 48). All read 0.
  - Among them: `hostUnresolved` 0 on every arm, `dimeCover1Called` 0 on v4, v5, bound and front, `creeperSnaps` 0 off joint, and the line-game legality guards 0 on front, jnc and joint.
  - The 10 SD gross stop (lines 2079-2084) never came near firing (Departures).

**The run game and points** (not a filed line; checked on its own from the full shards, independent of the fantasy gate, which raised it). The figures are paired per game (the delta method over 26,880 game pairs), and they reproduce the report's joint − v4 points and yards exactly.
- **Designed-rush yards a team-game.** joint − v4 −1.58 ± 0.60 (z −2.6; −27 ± 10 a team-season); joint − jnc −1.09 ± 0.33 (z −3.3; −19 ± 6). The gate's point estimates are confirmed. Its SEs (0.27 and 0.24) rest on eight shard differences and are too small; these replace them.
- **No other arm moves rushing measurably:** pressure − v5 −0.71 ± 0.60, jnc − v5 −0.38 ± 0.60, front − v5 +0.09 ± 0.49, v5 − v4 −0.11 ± 0.12. So joint − v4 is mostly the creeper: joint − v5 is −1.48 ± 0.60, of which joint − jnc is −1.09. One signal is mixed and not established: runs of 10+ yards a carry move −0.00119 ± 0.00041 on pressure − v5 (z −2.9), but −0.00044 ± 0.00041 on jnc − v5 (z −1.1) and +0.00076 ± 0.00033 on jnc − pressure (z +2.3); the two pressure-drawn arms disagree.
- **How joint − jnc loses them.** Two-thirds is per carry and one-third is fewer carries: Δcarries × jnc's yards a carry gives −0.358, and joint's carries × Δ(yards a carry) gives −0.736.
  - Carries fall because the game has fewer snaps (plays −0.059 ± 0.014 a team-game, −1.00 ± 0.24 a team-season), not because teams run less. The run share holds (jnc .36994, joint .36993).
  - The per-carry loss is downfield: runs of 10+ yards fall −0.00067 ± 0.00022 a carry (−0.43 a team-season), while yards before contact are flat.
  - Scrimmage yards fall −1.007 ± 0.386 a team-game against dropback yards +0.09 ± 0.20, so the creeper's yards loss is all on the ground.
- **Creeper runs.** There are 32,513 creeper calls on runs: 2.336% of joint's 1,391,999 carries (1 in 42.8), 9.93% of the 327,480 four-man Sky, Buzz and Base Cover 3 run calls, 10.3 a team-season. If the whole per-carry change sits on them, that is −1.22 ± 0.48 yards a creeper run, about 8% of a 15.8-yard carry (INFERRED).
  - The path, INFERRED from the code, not traced snap by snap: on a run every rusher enters the second level at backfield depth and every coverage defender at his zone's depth (`runPlay.ts:279-292`). A climbing blocker takes the shallowest (:144), and the pursuit follows in depth order (:203). So the creeper puts a linebacker at backfield depth without changing the rusher count (jnc 4.3092, joint 4.3097 a run call).
  - The huddle also blocks runs against the front it guessed (`frozen.ts:72-77`), so its guessed creeper is inside joint − jnc too. The shards keep no run outcome by call, so the two cannot be separated.
- **Points.** joint − jnc −0.106 ± 0.039 a team-game (z −2.7; −1.80 ± 0.66 a team-season); joint − v4 −0.133 ± 0.070 (z −1.9; −2.26 ± 1.20). joint − v4's dropback yards rise +0.88 ± 0.37 a team-game (+15.0 ± 6.3 a team-season), which is why its scrimmage yards fall less than its rushing.
- **The back.** RB0 has 99.96% of the designed carries, so these are his rushing yards: −27 a season against about 6,960. The gate's RB0 PPR −4.20 ± 0.95 (joint − v4) has a rushing part alone of −2.69 ± 1.02 points, so its ±0.95 for the whole line is too small (INFERRED).

**The fantasy review: PASS WITH NOTES** (the fantasy advisor's gate memo, `verify/fantasy-gate.md`; per-player figures are its own computations).
- **Nothing in 3.4 forecloses fantasy mode or same-franchise multiplayer.** v6 is opt-in, the default stays v4, and v4 replays byte for byte and v5 by name, so a league pinned to v4 replays exactly and seeded head-to-head stays auditable. The diff da8c941..ccd75bb touches 21 files, all in `packages/playbook`, `packages/calibration` and this ADR; nothing in contracts, engine, franchise or apps changed. `DEFENSIVE_CARDS` keeps its 22 cards, and `SaveFile` is unchanged. A composed v6 call is still one `DefensivePlayCall`, one COACH decision.
- **Its distortions, on opt-in v6 only, are small:** (a) completion rate rises because fewer passes are thrown, as throwaways turn into scrambles; (b) running yards fall (above); (c) against the real joint, v6 moves away at cell level (P7).
- **Per player, a 17-game season, joint − v4, in PPR points:** QB0 +1.56 ± 0.69 (scramble yards), RB0 −4.20 ± 0.95 (−27 rushing yards), WR1 +0.98 ± 0.28, TE0 −0.48 ± 0.66, TE1 −0.65 ± 0.16, FB0 −0.28 ± 0.17. Every move is under 3% of a player's season, which the gate calls fantasy-immaterial. Its SEs here are crude, from 8 shard pairs, and by its own check against points about 1.2–1.45× too small; for the run game the rushing check finds its joint − v4 SE 2.2× too small (0.60 against 0.27 a team-game; The run game and points).
- **Sacks,** its one fantasy reading of them: joint − v4 −0.22 ± 0.21 a team-season (the drift's −0.029 ± 0.027 points × 750 dropbacks), under 0.3 DST points. It makes no comment on the creeper's per-snap sack and unaccounted-rusher rows, which plan §11 sent it (bench, joint − jnc on creeper snaps: sack +0.57 ± 0.24 points, unaccounted rushers +0.7586 ± 0.0048 a snap).
- **The absolute scale is still untethered,** a known gap 3.4 did not cause: completion 37.46% on v5 and 37.55% on joint (the verification's football units; the gate gives 37.4%), 15.8 yards a designed carry, sacks 16.5% against 6.6% real.
- **A footnote, also not caused by 3.4:** the stat-line reducer counts a tipped ball the offence recovers as a reception (`statline.ts:476-482`), so the centre gets about 1.9 receptions a team-season with 0 targets. 3.0 recorded the same crediting (line 1436).
- **The knobs are league rules** (line 627). The identity marks `/creeper-0`, `/pressures-bound` and `/lines-bound`, but neither it nor `tunablesDigest` carries `CREEPER_RATE` or r_s, so a league stamp needs the engine commit.
  - One r_s per situation cannot express a coordinator who blitzes from one coverage more than another. That is right for a coach-agnostic caller (line 628), but it matters for Shapes B and C (`FANTASY-GATE-PHASE1.md`), whose per-team tendencies would have to come from franchise coaches.
  - The real feed's vintage belongs in the stamp, since its man share swings from 28.7% to 49.3% across 2022–24 and only 45% of its rows are charted.
- **Recommendation:** merge v6 as opt-in, and carry the notes to the 3.5 gate. Its watch items:
  - At 3.5's closing commit, report v7 − v4 with paired SEs on completions and attempts separately, throwaways and scrambles, interceptions including hot interceptions, sacks, check-release targets by role, target share, points, total yards, and designed rush yards a team-game.
  - Drift is already +0.150 points of completion at game level (+0.239 on the bench) against one step's 0.110, and 3.5 adds deceived reads and hot interceptions on top.
  - The stamp should land before the default moves. `SaveFile` and `LeagueRules` record no engine commit, caller identity with knobs, tunables digest or feed version, and a running league must not follow the v7 default move (line 627).
  - v4, v5 and v6, each named with its knobs, must replay byte for byte on 3.5's code.
  - Report P7 against the real joint by season, not only pooled.
  - Re-report the huddle's guessed creeper (13,455 snaps, Δsack −0.36 ± 0.19), since NPC offences anticipate at the league's true rates (INFERRED there).
  - Carried from 3.3: an archetype-league arm, and one low-Discipline, low-leash arm before humans can reach it.

**For 3.5.** M4's records (593,072 joint dropbacks on set A) are 3.5's bench base and the byte reference for line 810's "v7 `/front-0` ≡ v6". The legal-look shares are on joint's dropbacks (report §23).
- Mug legal: 93.51% on v5, 92.14% on joint.
- Stem legal toward the weak side: 85.74% → 82.12%.
- Balanced rushes: 82.52% on v5, 83.91% on pressure and on jnc, 81.58% on joint, so −0.94 points in all. The pressure draw adds 1.39 (front, which draws only the line games, reads 82.52%), and the creeper takes off 2.33 (jnc → joint), its own share of joint's dropbacks (2.334%).

**Departures from 3.4 as filed, and the readings it left open.** F's rule 15 list (lines 1815-1875) holds the build's own departures from §2.6, filed before any arm; it is cited here, not re-introduced. The rest are below, each with its evidence.
- **The 10 SD gross stop** (the dated note, lines 2079-2084). It was added to `guard34.py` before M1, and M0 was re-run on ccd75bb with `FROZEN.sha256` rewritten (the earlier copies of `guard34.py`, `drive34.sh` and `FROZEN.sha256` are kept in the scratch harness's `dev/before-gross/`, which is not shared). It never came near firing: the largest in-scope per-run |z| was 1.66 (M13, front's line games), and the largest pooled 1.19.
- **Stops added beyond F's must-be-0 table** (`tools-fix.md` §4 item 1). They are T34_SELF's six self-checks; `creeperCalls` = 0 off the creeper and > 0 on it; `dimeCover1Called` > 0 on the drawn-pressure arms; `rLineAboveOne` and `lineGamesOffHostable`; rule 1's identity; the bench floors; and F's v6 rows on every bench fold. All read 0 or met their floors. The report's must-be-0 counts mix them with F's rows (The guards).
- **P6's arm scope is a reading** (`tools-fix.md` §4 item 3). It is scored on pressure, front, jnc and joint. The literal "each arm" would add v5 (31.636% over 26,880 games, inside) and bound (set A only, 31.613%, inside); v4 is outside rule 1's table. No verdict changes.
- **The split trigger leaves out the defects** (the must-be-0 table, rule 4's own checks, and the base-scoped checks on v5 and bound). That is the analyzer's reading (`tools-fix.md` §4 item 4), not rule 12's text, which counts any failed exact check in rules 2–4 (line 2036). The defects stop the runs instead (lines 1935, 2058), and all read 0, so no outcome depends on the reading.
- **bound is set A only** (F's run list, line 1807). Rule 13's bound − v5 columns are over 6,720 games (each exactly 0), G1 leaves bound − v5 out, and rule 14's held fields are on set A. bound ≡ v5 rests on M3's byte proof and on `boundNotIdentical` = 0.
- **The analyzer changed after the runs, for presentation and for one added scoring input, which F's rule 3 requires** (3.3's precedent, line 1751): 4a20eba8 → 28be58cb, recorded in `FROZEN.sha256`'s header, which calls all of it presentation. Every leaf of `adr073-figs34.json` is equal before and after, apart from the tool-hash fields, and every verdict is the same.
  - The added input is logic, not presentation: verdict 2, and so the split trigger, now read M8's rule-3 bench proof (v5's arm and base against R10, one way; lines 1915-1916, which rule 12 counts, line 2036) and would fail if it failed. The frozen analyzer named that proof but never read it; `drive34.sh` had gated on it, and it passed.
  - The presentation changes: verdict 4's largest |Δ| is now a maximum, 5.551e-17 (the frozen analyzer summed shard maxima, 4.441e-16). The bound-lines arms' rule-7 line rows are labelled "not its law", and `short` is labelled arm-dependent. G1's miss is named. Joint's must-be-0 count reads 47 (it printed 48). P6's scope, the split trigger's inputs and its exclusion of the defects are named. The verify log read is the gross-stop block's (next item).
  - `drive34.sh`'s M0 check would now refuse a resume, because `FROZEN.sha256` no longer equals M0's tool lines. No resume is needed; one would need `report/before-postrun/` restored or M0 re-run.
- **The verify log** verdict 4 reads is `build34/verify-gross.log` (sha256 00eb7a1d…). It is the full verify of the gross-stop block, run on the working tree at 13:00:35, 14 seconds before the ccd75bb commit, which changed only those seven ADR lines (the code tree is 770d6f9's). So the "as committed" of line 2077 holds in content, but no log names ccd75bb itself; the tree is tied through M0's and drive34's logs.
- **P5's law per arm is a reading** (rule 6: "under v6's draw", line 1968; "the other arms are reported", line 1978). v4, v5, bound and front are reported against v5's law, pressure and jnc against v6's, and only joint is scored. Under v6's law the four bound-pressure arms would read STANDARD z about −80 and DELAYED about +161, as their bound pressures imply.
- **P3's absolute band** (20.335–27.511%, line 1940) is applied to pressure, jnc and joint, a reading of "each arm's rate"; the other four are printed inside it.
- **`short` is arm-dependent**, like `blitz5` and `lineGame`, but rule 13 labels only those two (line 2054): a gap in F, labelled after the runs. The harness defines `short` as a snap with an unaccounted rusher, so the creeper and the guessed creeper add to it: it is 29.98% of joint's dropbacks against 26.47% of jnc's, and the joint − jnc `short` row mixes that change with the effect.
- **`/seconds`.** M3's both-ways proof, like every comparison since 3.0, also leaves out `/seconds` (wall time) besides the `/secondsSetup` line 1914 names. Lines 1904 and 1908-1913 already assume it, so this is a clarifying clause, not a departure.
- **M0's log.** `m0.out` holds a 770d6f9 run from before the gross stop (12:37:02, PASS), one ccd75bb attempt begun at 13:01:03 and interrupted with no verdict, and the attempt that passed (13:01:30 to 13:07:28). `drive34.sh` reads only the last.
- **Plan points 16 and 22–25, as built.**
  - 16: `drawPressure` throws `/blitz` only on a host with a pressure that applies in s (`pressureDraw.ts:221`), `/which` only where two or more are hosted (:224; only Sky), and `creeper` only on a creeper host where no five-or-more was drawn (:227). On `defense-line`, `drawLineGame` throws `/wears` only on a call that can wear a line game in s (`wearable` not empty: legal for the call and with weight in s, :283-287; :372), and its `/which` only where two or more are wearable (:374-375).
  - 22: P3's "PASS+" is scored as both conditions.
  - 23: the creeper aggregate's width is the filed 2 × 0.034 pp.
  - 24: P4's rows count a snap, a TRIPLE once, with the per-entry counter printed beside.
  - 25: the sim's MIXED is reported on its own and folded into MAN against the real joint.
- **Tests,** by build commit:
  - C1 (8b6d4d5): playbook `tags.test.ts` and `corpus.test.ts` (the Creeper's word, and the 22-card order pin).
  - C2 (9abb907): `coverageCatalogue.test.ts` and `coverageCatalogueCorpus.test.ts` (the v6 catalogue, the pressure specs, the creepers and line games, the composed calls through the corpus-wide checks, and the host key, `coverageCatalogue.test.ts:854-907`).
  - C3 (bda058a): `pressureDraw.test.ts` (the draws and their rates: the 1e-12 sweep at :223-283, the dice ledger, the stubbed sampler integrated to the law, and ZONE_BLITZ and ZERO within three points of `BLITZ_DISGUISE_MIX`, :602-604).
  - C4 (e6e7b35): calibration `caller.test.ts` and `baselineTool.test.ts` (v6's identity and knobs, their refusals on v1–v5, and the snap-for-snap replay of every arm, `caller.test.ts:1489`).
  - C5 (84c7818): `callerV6Stream.test.ts` and `protectionOptionsSmoke.test.ts` (v6's stream proofs, with v5's replay equal to the calls v5 played, and the composed-call smoke).
  - The review fixes (cfb2c79) touch both packages' tests, add `CREEPER_RATE`'s pin (`pressureDraw.test.ts:650-654`), and pin all four disguise rows at the law's value, STANDARD and DELAYED included, which were asserted nowhere before (:606-633). The 45 tests of `pressureDraw.test.ts` pass in the verify verdict 4 reads.
- **Recorded as measured** (line 737), not re-labelled:
  - P5 as filed FAILS, as F predicted.
  - G1 is OUTSIDE on joint − jnc completions (The guards).
  - The creeper's aggregate sack is below F's expected size, and its per-snap size (+0.57) is below the order F took (0.68 to 1.27).
  - The creeper comes 1 in 42.8, not the "about 1 in 50" the owner was told (F computed 2.337% of dropbacks before any arm).
  - The man five-against-six split moves away from real (P7; rule 9 did not predict it).
  - Cumulative completion drift exceeds one step's width.
  - The run game and points fall on joint (above).

**Files** (`/mnt/project-files/arms/adr073-p34/`, README section "Front arms (ADR-073 step 3.4, 2026-10-21)" in `/mnt/project-files/arms/README.md`), under the names the scripts call each other by:
- `plan/` and `build/`: the plan, each build commit's report, F's reports and the tool reviews (`tools-fix.md` §4 lists the readings the tools took before the runs, the second to fourth departures above among them), and `build/verify-gross.log` (cited above as `build34/verify-gross.log`, sha256 00eb7a1d…).
- `tools/`: H34 `adr073Arm34.test.ts`, `run34.sh`, `guard34.py`, `proof34.py`, `drive34.sh`, `r0-34.sh`, `adr073-analyze34.py`, `adr073-realjoint.py`, `pins.sh` with `pin34.test.ts` and `pins/`, `expected/` (F's computed expectations), `h33/` (3.3's tools, for the v5 references) and `FROZEN.sha256`.
- `report/`: `adr073-report34.md`, `adr073-figs34.json`, `realjoint34.json`, and `before-postrun/` (the frozen analyzer, its report and figures).
- `proofs/`: `proof34-*.json`, one per proof line.
- `logs/`: each shard's log, `m0.out`, `drive34.out`, `analyze34.out` and `analyze34-post.out`.
- `shards/`: the 56 game and bench shards, gzipped with `accFull` dropped, with `MANIFEST.json` keeping each original's sha256.
- `rec/`: M4's dropback and game records and M10's game records, gzipped, with `SHA256`.
- `verify/`: `verification-summary.md` and `journal-all.json` (the two independent verifications), with `football-facts/` and `football/` (the football-unit scripts of the first and second verification) and `anomaly/` (the anomaly lens's scripts, without their pickled caches); `fantasy-gate.md` with `fantasy/` (the gate's scripts and outputs); `rushing-check.md` with `rushing/` (its scripts and their outputs, without the pickled rows); and `W-brief.md`.

The full shards (`out/`, 304 MB) were not shared. The points, yards and run-game figures need their `accFull`, so they re-run from the same seeds on ccd75bb. The report and figures carry every scored number. Most football-unit conversions, the finer bench splits (the creeper's and the guessed creeper's per-snap outcomes, G1's split) and the run-game figures quoted here were computed from `out/` by the verifications and by the rushing check (`verify/rushing-check.md`), and are not in them. The few figures marked COMPUTED here were recomputed for this write-up from the figures and from the shards' `front` fields (the per-game columns, the call mix and the shell × rushers counts), which the shared shards keep.

### 3.5, re-filed before any arm: the references PR #13 made stale, and the claims that cannot be scored as filed *(2026-10-22)*

**Why.**
- **PR #13 changed every caller's play.** It merged to main after 3.4 (94ea150, backlog entry 171): it rewrote nine pass concepts' read orders and moved Flood's flat runner from the fullback to the tailback, with the fullback kept in to block (`packages/playbook/src/passConcepts.ts`). Every caller plays those concepts, so every byte reference 3.4 recorded is stale for 3.5: 3.4's runs were on ccd75bb (line 2097).
- **Seven filed 3.5 claims cannot be scored as written** on the merged callers, which keep nobody in unless `/keep-in` is named (3.4's re-filing block, entry 9, line 1789) and state `slideCheck` on every SLIDE call unless `/no-slide-check` is named.
- This ADR re-files a prediction before an arm runs and never re-labels it after one (line 737), as 3.4's block did (lines 1765-1796).

**How to read it.**
- §1–§9 stay as filed: they are the record. No line there is inserted or edited; the Status line, edited in place, names this block. Line numbers below are this file's, and nothing above this block moved.
- Each entry names where the filed text is, quotes it, and says how it reads from 3.5 on, with its reason.
- This block holds no 3.5 scoring rule and no number from a 3.5 run. Its numbers are 3.4's, quoted from this section.

**The entries.**
1. **§4.5 Exact (line 810) and 3.4's "For 3.5" (line 2310).** Filed: "v7 `/front-0` ≡ v6"; "M4's records (593,072 joint dropbacks on set A) are 3.5's bench base and the byte reference for line 810's 'v7 `/front-0` ≡ v6'". Reads: v7 `/front-0` replays v6 byte for byte against v6 references taken at the 3.5 base, before any 3.5 build commit: R3's 6,720 set-A game sha256s and dropback records, and R5's 20,160 set-B game sha256s and dropback records. M4's records were taken on ccd75bb, before PR #13 changed nine read orders and Flood's flat, and are not used. Line 2305's "v4, v5 and v6, each named with its knobs, must replay byte for byte on 3.5's code" is checked against the same base's references (R1–R5) and its pins.
2. **3.4's "For 3.5" (lines 2311-2313).** Filed: "Mug legal: 93.51% on v5, 92.14% on joint. Stem legal toward the weak side: 85.74% → 82.12%. Balanced rushes: … 81.58% on joint". Reads: these are pre-PR-#13 figures. They are re-read from R3, on v6's calls at the 3.5 base, and filed with 3.5's scoring rules. PR #13 changed no defensive card, so they are expected to move only through the situation mix (INFERRED).
3. **§4.5 Exact (line 812).** Filed: "Stem-worn snaps are identical per snap to the same snaps without the Stem unless moved ≠ ∅ and the call states `slideCheck`". Reads: on the bench every Stem-worn snap equals the same snap under `v7/front-0` in every field except `shownRush`, the STEM tag and, when the read is pictured COUNT or LOOK, `pressurePicture.placed`. The exception is a `stemLive` snap on a SLIDE call read COUNT or LOOK: there the slide check may also differ, and every other difference follows from it. The read rolls on exactly the same snaps on both arms (a Stem adds no roll, line 584). Reason: PLAY_START echoes `shownRush` and the tag on every worn snap, and `pressurePicture.placed` echoes the shown spots when the read rolls (lines 459, 465, 638 and 1562).
4. **§4.5 Bluff, bitten (line 819).** Filed: "hot conversion ≈ the hot-route share of those calls". Reads: exact: on every bitten bluff snap every `hot` route converts. No bluff snap without a ghost and a hot route rolls the read, and no Stem-worn bluff rolls. The hot-route share over all bluff snaps is reported beside it. Reason: nobody is kept in unless `/keep-in` is named (3.4's block, entry 9, line 1789), and on a bluff a slide check would move nobody (line 820). So trigger (b) rolls a bluff only where the pictures decide differently, which needs a ghost and a hot route (`preSnap.ts:359-360`). A Stem shows no ghost (line 584).
5. **§4.5 Bluff, bitten (line 822).** Filed: "completion on hot throws down, interceptions on hot throws up". Reads: on bitten bluff snaps on the bench, per snap, completions fall and interceptions rise, v7 against `v7/front-0`, each by the sign rule (lines 2023-2026), in completions and interceptions a hundred snaps. Attempts a hundred snaps and throws to a converted receiver are reported beside them, and the per-attempt rates are printed without a verdict. Reason: on the same snaps undisguised nothing is thrown hot, because the read does not roll there. And the bench keeps only n, Σ and Σ² of each per-snap difference, so a per-attempt ratio has no paired SE there; 3.4 printed its bench completion rate without one (line 2179).
6. **§4.5 Bluff, bitten (line 823), with 3.4's block, entry 3 (line 1783).** Filed: "sack as §4.1"; entry 3: "up for the slants and the shallow cross (28a's filter, line 1242); undetermined for Sit and Swing". Reads: Δsack > 0 by the sign rule on bitten bluff snaps whose converted route is a Slant or the Shallow Cross. Sit, Swing, the Out and conversions by designation alone are reported as undetermined. PR #13 rewrote the read orders of Mills (hot Slant) and Two-Minute Sail (hot Out) and moved Flood's designated hot from the FB to the RB, so 28a's per-route rows (lines 1406-1422) are re-taken from the bench's v7 − `v7/front-0` pairs, keyed by converted route, as information.
7. **§4.5 Guard (line 834).** Filed: "any `int_rate` rise of 2 SE or more must sit at least 80% on bitten, hot-converted snaps". Reads: if game-level Δint/att (v7 − v6, sets A + B, 26,880 games) is +2 paired per-game SE or more, at least 80% of the bench's paired Δinterceptions against `v7/front-0` (keyed on the disguised arm's snap) must fall on bitten snaps where the disguised arm's hot conversions differ from `v7/front-0`'s. The 80% is tested with its sampling error, by the rule filed with 3.5's scoring rules before any arm. Reason: game-level arms part after their first changed snap (line 180), so a game-level rise cannot be split by stratum. And on a fooled COUNT snap with a real blitzer both arms convert (`pressureRead.ts:166-170`), so a stratum read off v7's conversions alone would credit the slide's interceptions to the hot route.
8. **`releaseListed` (line 173), with §4.5 (line 825).** Filed: "the call lists a released check-release man with no hot spec". Reads: read off the card: the card's `protection.checkRelease` lists a role whose man is on the field running a route with no hot spec. Reason: no v7 call lists one unless `/keep-in` is named (3.4's block, entry 9, line 1789), so the literal reading is empty. Entry 10 of that block (line 1790) and 3.4's harness already read it off the card. This is a reading, not a change of population.
9. **§4.5 (line 830) and `r2Expected` (line 174).** Filed: "on a SLIDE call stating `slideCheck`". Reads: on v5–v7 every SLIDE call states `slideCheck` unless `/no-slide-check` is named, so the clause reads "on a SLIDE call". No 3.5 arm names `/no-slide-check` (3.4's `slideCheckMissing` read 0 on every arm, line 2062).

**Not re-filed, and why.**
- Line 811 is exact as filed once `disguisedDropbacksByMask` is keyed by coverage-look ids (§1 "3.5", calibration).
- Lines 814 and 832 filed no observed tolerance. 3.5's scoring rules give them one, which is a scoring rule, not a re-filing.
- Lines 816, 820, 733 and 826-830 are scored as filed, or as 3.4's block, entries 5 and 9-14, already re-filed them (lines 1785, 1789-1794).

### 3.5, filed before any arm *(2026-10-22; CHOSEN)*

**Why.** 3.5's arms are scored by the rules below, filed in git before the first arm runs, as §4's figures were (lines 201, 710) and as 3.4's rules were (line 1798). A failed prediction is recorded as measured, and never re-labelled (line 737). 3.5 needs rules the ADR never filed: a width for line 814's rates and line 832's aggregate, R2's scoring form on the bench, and the guards. It also fixes readings the build had to choose. The block above re-filed the claims PR #13 made stale or that cannot be scored as written (lines 2365-2391); this block files how each claim is scored.

**Where it sits, and why before D.**
- It follows the block above. As there, no line is inserted into §1–§9, and the Status line (line 6), edited in place, names this block. Line numbers below are this file's, and nothing above this block moved.
- It is committed before the dry run D of the default move. D runs the sack ladders and the baseline tool under the flipped default, so it sees v7 outcomes. This block's rules, its triggers and its "what does not count" list are in git before any of them is seen (lines 201, 710, 737, 1800). If D forces a code change, this block gets a dated amendment under its heading and D is repeated.
- The block holds, in this order: the 3.5 mechanics as built (rule 16, first because every other rule reads them); the arms and the identity grammar (rule 1); the scoring rules (rules 2–15, then 19 and 20); the alternate-card triggers (rule 17); the ladder re-record rule (rule 18); then the checks that must read 0 and their floors, the stop rules, the tools that compute them, and the dated amendments. The rule numbers are the build plan's, kept so that every later stage's cite reads; rules 19 and 20 are scoring rules and sit with them.

**How to read it.**
- **Labels.** "Rule n" is this block's. "Plan point n" is open point n of 3.5's build plan, cited where this block takes its recommended default; this ADR's own Q1–Q7 (§9) are named as such. "Decision n" with a line cite is this ADR's own Decision n, the owner's rulings 1–7 on §9 (lines 1143-1156). Otherwise "decision n" (capitalised only at the head of a sentence or a bullet) is one of the Orchestrator's binding decisions on the plan's rechecks: 1–10 before the block above, 11–16 on the tools review (2026-10-22 08:20Z), 17–18 on the cross-check of this block and the analyzer and on their reviews, 19 on the check of decision 17, and 20 on freezing the analyzer, which amendment 3 below carried out (plan §18 and §18b; decision 17 is dated 2026-10-22 13:30Z and decision 19 14:20Z; decision 20 carries no time). P-D1 to P-D5 are the closing commit C7's proofs (the build plan's §12: the named callers unmoved, the old default by name, the two-way flip, the commands by name, the gates). E1 is the Save and load plan's edit that makes a save record its play-caller, which waits for the owner's typed yes in that thread. CE is the contracts-edit text the owner approved (`/mnt/project-files/design/ADR-073-step-six-contracts-edits.md`). W is 3.5's write-up and W2 its results note; D is the dry run of the move; C7 and C8 are the closing commits.
- **Code** is cited at `67552bc`, the build's head: C1 `4abd0b3`, C2 `6ba0316` (with the five contracts edits), C2e `144ab05`, C3 `1de2be3`, C4 `45957bc`, C5 `f876a5b`, C6 `53832cd`, and the review fixes `67552bc`. The block above is `c257270`. Playbook files are in `packages/playbook/src/` and the caller's in `packages/calibration/src/caller/`; every other source file is cited by its repository path where it is first cited; tests go by file name. The default caller is still v4 at `67552bc` (`DEFAULT_CALLER_VERSION`, `anticipate.ts:224`).
- **The trees.** B35 is `c257270`, whose packages are 94ea150's. The references are taken there, from a clean worktree, while the build commits were written in the main checkout (decision 10); timing from overlapping runs is not used for the cost model. HEAD35 is this block's commit, where the K-runs run. C7 is the closing commit.
- **The tools** are scratch, shared with W, and named here so that a rule can name its counter: the harness H35 (`adr073Arm35.test.ts`, a copy of 3.4's H34 with append-only keys, defined in `KEYS35.md`), `run35.sh`, `guard35.py`, `proof35.py`, `drive35.sh`, `r0-35.sh`, `freeze35.sh`, `expected35.py`, the lists in `declare/`, and the analyzer `adr073-analyze35.py`, which joins the freeze by a dated amendment (it was not written at the freeze). Every tool and list is hashed into `FROZEN35.sha256`. The freeze in force when this block was committed holds 16 files (written 2026-10-22T14:58:40Z; H35 `c6733c30…`, `expected35.py` `a979eeb6…`); the dated amendments below say what each rewrite changed. `fill35.py`, which renders this block's figures from `expected35`'s output, writes text only and is outside the freeze (sha256 `d26427f8ff4b…`).
- **The runs.**
  - At B35: N0-base (the checker, smokes and timing); R0 (v6 on H34, set A); R3 (v6, set A, dropback and game records); R1 (v4, set A, game records); R2v5 (v5, set A, game records); R4 (v4, set B, game records); R5 (v6, set B, dropback and game records); and expected35 on R3 and R5.
  - At HEAD35: N0-head; K1 (v4), K2 (v5), K3 (v6), K4 (front0), K4z (v7 at rate 0, decision 11), K5 (mug), K6 (stem) and K7 (v7) on set A; K9 (v7), K10 (mug), K11 (stem), K12 (v6) and K13 (v4) on set B; the benches K8 (R3's records, six arms), K8f (R3's records, front0 and v7f) and K8b (R5's records, front0 and v7f); K14 and K15 (aware-v6 and aware-v7) and K16 and K17 (d20-v6 and d20-v7) on set A. `drive35.sh` runs them in the build plan's §8 order, with K4z after K4 (decision 11): N0-head, K4, K4z, K3, K1, K7, K8, K8f, K5, K6, K2, K9, K8b, K10, K11, K14, K15, K16, K17, K12, K13.
  - At C7: CL1 (v4), CL2 (v7) and CL3 (the default) on set A.
  - Set A is `adr-073:front-arm` × 240 rounds (6,720 games) and set B is `adr-073:front-arm-2` × 720 rounds (20,160), as in 3.4 (line 2097). Every run plays the flat league at leash 50, except the aware and d20 arms.
- **The expected values are COMPUTED for this block, before any arm,** by `expected35.py` (sha256 `a979eeb6…`) from R3's and R5's shards: 6,720 and 20,160 games of v6 at tree `c257270`, tunables `fnv1a:395a9ae2`, 593,157 and 1,778,688 dropbacks, 3,759,690 defensive calls over both sets. Its output, `expected35-amend2.json` (sha256 `62bb9b24678f…`), passed 170 consistency checks with 0 failed. Each COMPUTED figure below is a key of that file: `fill35.py` renders this block from it, checks that the file was written by the frozen `expected35.py` from R3's and R5's shards as they stand, and lists every key it read.
  - **Why it is not the B35 drive's own expected35 output.** The drive's expected35 step (STEP PASS) ran the tool frozen before amendment 2 below (`8ab08b59…`; its file, sha256 `51c95595fcbc…`, passed 162 checks), which does not print the aware cells of rule 6 (decision 15). So the tool as amendment 2 froze it, named above, was re-run on the same shards with the drive's own arguments. `fill35.py` renders this block's value placeholders from both files: of its 262 distinct value placeholders it compares 256 and finds them alike, and the other 6, the tool's own sha256, the check count and the four aware cells, are not compared.
  - It evaluates the dice analytically over v6's own calls, through H35's restatement of §2.5's pictures (the tables after rule 18). No die is thrown.
  - **Bench figures are exact in expectation,** because the benches replay R3's and R5's dropbacks. **Game-level figures are previews:** a game-level arm's calls part from v6's after its first worn snap (line 180), so rule 5 scores each arm against its own legal calls.
  - They replace the build plan's previews, which were INFERRED from its maps.
- No number in this block was measured by a 3.5 arm. R3 and R5 are v6 references at B35. The only v7 figures here are the build's suite and scratch counts in rule 16: wear counts and the look mix on 3 to 20 games, counts of looks applied and drawn through the playbook and `simulatePlay`, and stream-equality counts on 6 and 12 games. They are labelled as such and are not filed predictions. None is a sack, exit, pressure, completion, interception or yards figure, and none comes from an arm or from D.
- A rule that proves impossible to compute as written is amended by a dated note under this heading, and recorded as a departure in W (line 1587's convention, as 3.4 did at lines 2079-2084).

**16. The 3.5 mechanics as built** *(CHOSEN)*. Each item reads §2.5's text (lines 562-587) one way, or departs from it. W cites this list; it does not introduce these choices for the first time. C8's note files the closing-time departures.
- **The module** (`frontLooks.ts`) exports `FrontLookId`, `FRONT_LOOKS` (the Mug, then the Stem, :85), `frontLookTag`, `isFrontLookTag`, `FrontLookOption`, `legalFrontLooks` (:214), `FrontLookDraw`, `drawFrontLook` (:282), `shownRushDiffers` (:313), `validateFrontLook` (:349), `assertValidFrontLook` (:417) and `applyFrontLook` (:562). Its picture builders (`mugPicture`, `stemPicture`, `menOf`, `fitOf`, `alignmentOfGap`) are not exported. `checkShownRush` is test support in `packages/playbook/test/fixtures.ts`.
- **The rate.** `FRONT_LOOK_RATE = 0.1` is in `distribution.ts:254`, not in `frontLooks.ts`. It is CHOSEN with provenance NONE: the owner's 1 in 10 (Decision 5, line 1151; this ADR's Q5(a)). It is not a tunable. `drawFrontLook` takes the rate as an argument that defaults to it, and the caller passes it explicitly (`frozen.ts:822`). No suite test pins the explicit pass: a mutation that drops it passes the suite, because play is identical. It is what lets H35's module mock reach the draw (rule 1's v7f), so N0-head's v7f proof guards it (C3's scratch check: with the mock, 382 of 411 calls wore a look, 0.929; without it, 40 of 416, 0.096; with the mock and the explicit pass removed, 40 of 416, 0.096).
- **The dice.** Each is one `weightedPick` on a child of the Rng given; the caller passes `snapRng.fork("defense-front")` (line 571).
  - `wears` is a yes/no pick over `[true, false]` with weights rate and 1 − rate. It is thrown only if a look in the catalogue is legal on the called card.
  - `which` has equal weight over the remaining options in `FRONT_LOOKS` order, thrown only if both remain.
  - `stem-side` has equal weights. Line 571 names the die but not its weights. It is thrown only for a Stem over a balanced card with both sides legal. Line 571 says "only for a Stem over a balanced played rush"; the gate stops a die from picking an illegal side. On today's book every balanced Stem-legal card has both sides legal, so the gate changes no die. A balanced card with one legal side gets that side with no die, and an unbalanced card writes no `side`.
  - **Run calls wear looks too, and are counted,** because the draw comes before the concept (`frozen.ts:822`, before the concept loop at :847).
- **The catalogue narrows before `wears` and keeps the rate,** as `coverageMasks` does (plan point 1): `[]` throws no die. A catalogue that is not `FRONT_LOOKS` or an in-order part of it (reversed, repeated or unknown), or a rate outside [0, 1] or not finite, is refused before any die (`drawFrontLook`, :288-291). The build plan named neither refusal; plan point 3 files the first.
- **Legality as built** (`legalFrontLooks`).
  - No look on PREVENT or GOAL_LINE (`NO_FRONT_LOOK`, :109).
  - The walked-up backers are LB_M in Dime and LB_W and LB_M otherwise (:111-114). LB_S never is.
  - A MAN duty counts as dropping at card level. Strength is counted over every RUSH duty.
  - The one-spot rule checks each shifted lineman against every other shown rusher: the shifted linemen at their new spots and the off-line rushers at their played spots. The clamp keeps an end lineman in place, and a lineman shifted onto him is a one-spot refusal (plan point 55).
  - R25 at card level is `shows` on any man the look moves.
- **On today's book** (C1, pinned by name in `frontLooks.test.ts`).
  - Over `COMPOSED`'s 26 compositions with no line game: the Mug is legal on 21 and the Stem on 16. Both sides on 14; LEFT only on Smoke over Sky; RIGHT only on Dime Smoke. Mug only on Fire over Sky, the three Creeper calls and Fire over Base Cover 1. Neither on Double A, Zero, Prevent and both goal-line calls.
  - Over the 22 book cards: 13 take both, with `/stem-side`; `DEF_NICKEL_COVER_3_PRESSURE` the Mug and the Stem LEFT only; `DEF_DIME_MAN_BLITZ` the Mug and the Stem RIGHT only; `DEF_NICKEL_FIRE_ZONE` and `DEF_BASE_RUN_BLITZ` the Mug only; 5 neither.
  - Wearing a coverage look as well changes no answer (C5).
  - Stem-legal is a subset of Mug-legal on today's book: no composition and no card takes the Stem alone (and C3's T2 found Stem-legal and not Mug-legal on 0 of 568 snaps). So `/wears` is thrown on the same calls with the same value on v7, mug and stem (rule 4's narrowing equalities).
- **`applyFrontLook(defense, draw)`** (:562-591) is applied to the real `defense` after `instantiateDefense` (line 566).
  - It refuses a call that already carries a second list or a front tag (R21), and a draw for another card: the draw carries the called card's id.
  - R25 at instance level: the Mug moves every walked-up backer on the field and the dropping linemen; the Stem moves the rushing linemen.
  - **`shownRush` holds the played entries first, in `rush` order, then the ghosts in `dutyList` order.**
  - **The Mug is option A** (line 574 as written). A rushing walked-up backer is re-spotted to the A gap, INTERIOR, on his own side, and kept verbatim if he is already there. Each ghost is at his SECOND-level fit: a dropping down lineman at his run fit's gap and side, with the alignment from the gap; a dropping walked-up backer at the A gap, INTERIOR, on his run fit's side. Revision 1 of the plan chose otherwise, so it is listed.
  - **The Stem** reads `RushAssignment.gap` on the instantiated rush and moves each rushing down lineman one spot toward X, where X is the instance's strength, else `draw.side`. A clamped lineman stays verbatim. The one-spot rule is re-run on the instance.
  - **A formation-illegal look returns `defense` itself** and is counted as `formationDropped` (line 566's rule): the Mug with no dropper; the Stem with fewer than three linemen rushing, or one dropping; a balanced instance with no drawn side; a one-spot clash. The one-spot refusal at instance level wears none and never throws. None occurs on today's book: 4,128 of 4,128 applications in the build's tests are worn, and 0 of C5's 344 census draws dropped.
  - The output is self-checked by R28.
- **R28 as built** (`validateFrontLook`; codes at :335-342, all ERROR): `C_FRONT_LOOK_TWICE`, `C_FRONT_LOOK_UNNAMED`, `C_FRONT_LOOK_UNWORN`, `C_FRONT_LOOK_NAME`, `C_FRONT_LOOK_ORDER` and `C_SHOWN_ALIGNMENT_OMITTED`. R28 refuses an omitted alignment on either list, because playbook cannot resolve one; the check applies only under a second list. A tagged, permuted copy passes by the rule's wording; order is pinned by C2's tests and C5's echo partition.
- **The coverage looks' refusal of a look that moves a rusher** (`masks.ts:478-480`) now reads "… who rushes — a coverage look never moves a rusher; a shown rush is a front look's (`applyFrontLook`, ADR-073 §2.5)". No test pins it.
- **The caller (C3).**
  - The spec and knob field is `frontLooks?: readonly FrontLookId[]` (`frozen.ts:389`). The profile field is `fronts`, and `SnapPlan.fronts` is the same. `ResolvedSnap` gains `frontDraw` and `frontWorn`.
  - The diagnostics are `FrozenCallerDiagnostics.frontLooks = { drawn, formationDropped }` (`frozen.ts:303`), counted in `callOffense` and merged in `mergeCallerDiagnostics` (`packages/calibration/src/harness/batch.ts:151`). The merge sums `drawn` with its keys sorted by `localeCompare` (:161), so a merged count does not depend on which side comes first; `backoff` still merges in insertion order, which is older than 3.5 and was not changed.
  - `frontLooks` is refused below v7 for every value (`frozen.ts:949-953`). On v7 a list that is not `FRONT_LOOKS` or an in-order part of it is refused by the pair (:955-956) and by `callerIdentity` (`frontMark` throws), so an identity can never name a list the pair refuses. The option and part refusal messages name "v5 to v7" and "v6 and v7".
- **`front_look_rate` compares entry by entry** (line 389; C4). A dropback counts when `shownRushDiffers(PLAY_START.defense.rush, PLAY_START.defense.shownRush)` holds: rusher, side, alignment and gap; `move` never read; a side or gap stated on one list and omitted on the other is no difference. Runs are not counted, and a stream without `shownRush` counts nothing. The mix is keyed by the front LOOK ids among PLAY_START's tags, `+`-joined, or `UNNAMED`. H35 cross-checks the count by rusher (`frontLookRateMismatch`, the tables after rule 17).
  - The metric ids are `front_look_rate` and `front_look_mix`, sim-only in tier 1 with an infinite band (`packages/calibration/src/metrics/tier1.ts:900`, :928). They are metric ids only. **The accumulator fields are `accumulator.play.frontLookDropbacks`** (a count) **and `accumulator.play.frontLookDropbacksByLook`** (keyed `MUG`, `STEM` or `UNNAMED`) (`packages/calibration/src/metrics/collect.ts:319`, :325), blanked to `0` and `{}`. A shard writes them under `/accFull/play/`.
  - `disguisedDropbacksByMask` joins coverage-look ids only. On v4–v6 no key changed (the pins' batch rows), and on v7 the split equals v6's exactly.
  - The structural bound now reads "hot conversions ≤ dropbacks whose `blitz_recognition` PRESNAP_READ rolled", per play and in aggregate.
- **The contracts wording is CE's,** which departs from A §3 in D4's colon (CE:40, against line 682's dash) and D6's "A physics reader appears" (CE:50-53, beyond line 684). D2's sentence is its own paragraph. The five edits were made in C2 on the owner's typed yes (Status). contracts-guardian reviewed C2's contracts diff as its own agent and approved it (0 blocking, 0 should-fix, 1 nit; `build35/review-contracts.md`); C2's own read-through was the builder's. D2a, D2b and D11, three further contracts wording fixes offered to the owner with one optional typed yes, remain the optional re-ask, which W records if no yes comes: their reach is 37 of 80 front-look calls (6 v7 games, 826 PLAY_STARTs; that review's nit 1).
- **Added in revision 2 of the plan, with their reasons:**
  - **C2e edits five comments, where 3.5's row says "Engine: nothing" (line 394):** four in `packages/engine/src` (`types.ts:449-450`, :461-467 and :478-483, and `resolve/rushThreat.ts:356-362`, as they stood at `6ba0316`) and one test header (`packages/engine/test/shownRush.test.ts:4-6`; decision 5). Each went false under a worn look or named the pin C2 deletes. No engine code changed; the engine suite is unchanged at 995 passed and 1 skipped.
  - **C6's caller stamps are not in §1's 3.5 row (lines 377-413).** They make files truthful across the move and move no stream (decision 4):
    - the export stamp: `GameFile.callerVersion` is the resolved `CallerVersion`, never "default" (`packages/calibration/src/export/gameFile.ts:49`). The file name still carries only a version named on the command line;
    - the sack-ladder report's caller line: `LadderRung.callerVersion` holds `provenance.callerVersion`, and the report's `reproduce:` line ends `, caller "<it>"`;
    - the tier-1 divergence clause, which now reads "frozen caller: protection is built against an ANTICIPATED front and misses some rushers (ADR-024; how many is this report's own unaccounted_rusher_rate) — biases this UP, by 1.54pp when ADR-024 measured it";
    - the band-table corpus, which now passes and records its caller (`CorpusObservation.callerVersion` is `callerIdentity(DEFAULT_CALLER_VERSION, FROZEN_TENDENCIES.version)`, and `runCorpus` passes that version to `runOneGame` explicitly), and its gate, which prints it;
    - the three sweep headers, which print the caller (each sweep has a `CALLER_VERSION` constant equal to `DEFAULT_CALLER_VERSION`);
    - the pocket ladder's rungs and report, which carry the caller (`PocketLadderRung.callerVersion`), and its reworded `hypothesis` record.
    - Only `pressureSweep`'s header is not shown, because that sweep is spent. C6's new tests follow `DEFAULT_CALLER_VERSION`, and a scratch v7 flip showed they pass unedited, so they need no change at the move.
  - **`/stem-side`'s gate and the balanced instance with no side** (the dice and `applyFrontLook` above).
  - **The Mug's option A** (above).
  - **v7f, the forced-wear bench arm** (rule 1), and `FRONT_LOOK_RATE` passed explicitly by the caller (above).
- **Named or built otherwise than the build's text, where a rule reads it:**
  - C6 moved a pin it did not name: `exportGame.test.ts:54` went from `toBe("default")` to `toBe(DEFAULT_CALLER_VERSION)`, with `GameFile.callerVersion` narrowed from `CallerVersion | "default"`. C6's message says "Pins that move: none."
  - C5's message says "Seven mutations of frozen.ts were each caught by the new file." One of them, a non-determinism mutant, is caught only when the determinism tests run alone; in the whole-file run earlier tests use up its window. The test does catch it.
  - C2 deleted the `gapCarryAcross` expiry pin (2027-02-05), discharged by its branch (a). Playbook's suite went 3207 → 3224 at C2, and is 3227 at `67552bc`.
  - Two stale comments are left for C7: `anticipate.ts`'s "v5 and v6 are opt-in" and `packages/calibration/src/harness/workerPool.ts`'s default note.
  - **Tests C7 must keep** (P-D3): C4's v7 `it.each` cases in `metrics.test.ts` and `shownAssignmentsStream.test.ts`, and the review fixes' new cases: the harness's "merges the front-look counters by sum, in a sorted key order, whichever side comes first" and "sums a v7 batch's front-look counters over its games, the same on one shard and on five"; metrics' "counts the pressure facts on dropbacks only, never on a run (caller v4, named)"; and `frontLooks.test.ts`'s "compares an alignment as stated: …", "keeps a rushing walked-up backer already in his A gap, INTERIOR, where he is: …" and "shows each Mug ghost on his own run fit's side, not his role's". T2 and the band-table test gained assertions; no existing assertion was removed or loosened.
- **The suite's v7 proofs, by name** (C5, `callerV7Stream.test.ts` and `protectionOptionsSmoke.test.ts`): "v7/front-0 plays v6's game" (both leashes, five settings); its non-vacuity test, which asks the two Mug arms to differ from v6 past PLAY_START's echo; the echo partition (four arms); determinism (two leashes, four arms); and "every composed call, wearing each front look legal on it, plays through the engine".
- **Measured in the build, as scratch figures and not filed predictions:**
  - C3's T2, 4 games and 568 snaps on the two-team fixture: Mug-legal 519, Stem-legal 459; v7 wore 21 Mugs and 19 Stems; mug wore 40, equal to v7's worn set; stem wore 36; formation-dropped 0.
  - C4, 20 v7 games: `front_look_rate` 169 of 1,783 dropbacks (MUG 94, STEM 75); every front-tagged PLAY_START (263) was a drawn look.
  - C5's corpus, 6 games at leash 50: worn plays (pass + run) 45 + 23 on v7 (MUG 38, STEM 30), 45 + 23 on mug, 43 + 22 on stem and 0 on front0; ghosts 70, 128, 0 and 0. Stem-only equals v6 on all 6 games once PLAY_START's `defense.shownRush` and `defense.tags` are removed, which is line 812's thinness on 6 games; v7 parts from v6 past the echo on 5 of 6 games and mug on 6 of 6.
  - C5's census: 134 of 144 `COMPOSED` entries can wear a look; 344 draws (Mug 134; Stem 14 with no side and 98 toward each side); 9,632 worn dropbacks and 5,504 worn runs through `simulatePlay` with no throw; 0 formation drops.
- **The pins.** The base is `pins-base35.jsonl` (sha256 `022b7392b802b8c8…`), 288 game rows, 3 batch rows and 1 meta row captured at `c257270` in the clean worktree: stream rows `adr-073:pin35`, 12 games a spec on the 8-team flat league; batch rows the same seeds, 6 games on the 4-team league. Every build head's base rows equal it. The v7 pin base is `pins-v7base35.jsonl` (sha256 `994761d9…0bc3d86`, 84 v7 game rows and 1 v7 batch row), frozen at C5 and byte-identical to C4's, so the v7 stream has not changed since C3 and its batch row not since C4's re-keying. C3's pins (`pins-c3.jsonl`, sha256 `04abd0af…`) kept the base rows and joined the v7 set: `v7/front-0` ≡ v6 on 12 of 12 games, and the v7 batch drew MUG 43 and STEM 34 in 6 games. Later pin runs pass C4's two fields through `PIN35_EXTRAS`, and `PIN35_DEFAULT=v7` at C7 and C8. The review fixes (`67552bc`) touched six paths, one of them source (`packages/calibration/src/harness/batch.ts`, the sorted merge above) and five tests (`bandTableGate.test.ts`, `caller.test.ts`, `harness.test.ts`, `metrics.test.ts` and `frontLooks.test.ts`); their pins equal the v7 pin base byte for byte. The suites at `67552bc`: playbook 3227 passed; engine 995 passed and 1 skipped; calibration 721 passed and 74 skipped (695 at C3, 706 at C4, 716 at C5 and 718 at C6, each with 74 skipped). From C4 the declared batch extras are `accumulator.play.frontLookDropbacks:zero` and `accumulator.play.frontLookDropbacksByLook:zero`, beside C3's `caller.frontLooks`.

**1. The arms and their comparisons.**

| arm | identity | front looks | compared with | runs |
|---|---|---|---|---|
| v6 | `v6` | none | the base | R3, R5 (references); K3, K12; the bench base |
| front0 | `v7/front-0` | none; no die thrown | v6, exactly (rule 3) | K4; bench |
| v7 at rate 0 | `v7`, `FRONT_LOOK_RATE` mocked to 0 | none; the die thrown, answering no | v6, exactly (rule 3) | K4z; N0-head |
| mug | `v7/front-MUG` | the Mug, narrowed | front0 | K5, K10; bench |
| stem | `v7/front-STEM` | the Stem, narrowed | front0 | K6, K11; bench |
| v7 | `v7` | both | front0 per snap; v6 at game level; v4 for the drift | K7, K9; bench |
| v4 | `v4` | none | v7, for the drift | R1, R4; K1, K13; bench |
| v5 | `v5` | none | by name only | R2v5; K2 |
| v7nc | `v7/creeper-0` | both | v7: the huddle's guessed creeper | bench only |
| v7f | `v7`, `FRONT_LOOK_RATE` mocked to 1 in its own bench process | both, on every legal call | front0 per snap; v7 on v7's worn snaps, exactly | K8f, K8b (bench only) |
| aware-v6, aware-v7 | `v6` and `v7` on the Awareness league | none on aware-v6; both on aware-v7 | each other | K14, K15 |
| d20-v6, d20-v7 | `v6/leash-20` and `v7/leash-20` on the Discipline-20 league | none on d20-v6; both on d20-v7 | each other | K16, K17 |

- **Narrowing.** `/front-MUG` and `/front-STEM` filter the catalogue before `/wears` and keep the rate (rule 16). Every die on a snap has the same value in every arm, so rule 4's narrowing equalities follow.
- **At game level, v7 − v6 is v7 − front0,** because rule 3 proves front0's games are v6's.
- **v7f, the forced-wear arm.** It plays under v7's name, but it is not a caller anyone ships. It exists only on the bench, its shards say `frontLookRateMock: 1` in their header, and it is never a game reference. `/wears` is a separate fork, and a two-item pick with weights 1 and 0 always says yes (`weightedPick`, `distribution.ts:99`; `frontLooks.ts`'s `yes`, :252-254). So on every snap v7f wears whenever a look is legal, and it draws the same `/which` and `/stem-side` dice as v7. On v7's worn snaps it is v7, which rule 4 item 15 checks exactly. The wear die is independent of the snap, so the per-snap effect on any population defined by the snap and the worn call is the same quantity on both arms. v7f sees it on about 10 times the snaps.
- **The rate-0 control** (decision 11) is never a reference and never scored. H35 accepts `ARM_FRONT_RATE_MOCK=0` in game mode for it alone. It holds the whole unworn path (the die thrown and answering no), runs included, at full scale, which the `--expect worn` lines (K5–K7) cannot, because almost every v7 game wears a look.

**The identity grammar** *(rule 1's note)*. It reads line 625's list as the code's (`callerIdentity`, `frozen.ts:423-447`); line 625 is not edited.
- The marks, in order: `/no-slide-check`, `/keep-in`, `/creeper-0`, `/pressures-bound`, `/lines-bound`, then one of `/front-0`, `/front-MUG` or `/front-STEM` (`frontMark`, :461), then `/leash-N` last. A knob at its default is unmarked, so the full catalogue is unmarked.
- There is no `/no-keep-in` (`frozen.ts:430`): that was the mark of v5's first build.
- A pair's name is `frozen-` and the identity with the tables' version, as in `frozen-v7/v1/front-MUG`.

**The scoring rules.**

2. **Reproduction by name** (line 2305, as the block above re-files it, entry 1), exact.
   - v4: K1's 6,720 game sha256s and event counts equal R1's, and K13's 20,160 equal R4's. v5: K2's equal R2v5's. v6: K3's equal R3's, and K12's equal R5's.
   - Each also equals its reference number for number, one way: every reference leaf, less `/seconds` and `/secondsSetup`, which are timing fields. HEAD35's added keys are declared from the line's list (`declare/tree-B35-HEAD35.game.txt`, which names C4's fields since the tools' fix step): `pb35` and C4's two fields, `/accFull/play/frontLookDropbacks` and `/accFull/play/frontLookDropbacksByLook`, the latter two required on every shard and expected at 0 and `{}` on v4–v6 (`proof35.py --c4-zero`).
   - The pins hold at every head (rule 16), and the bench base v6 replays every R3 and R5 record (`selfOk` equals the record count).

3. **The front0 proof** (line 810, as the block above re-files it, entry 1), exact.
   - K4's 6,720 game sha256s and event counts equal R3's.
   - K4's numbers equal K3's both ways, with only the label fields, `/seconds` and `/secondsSetup` set aside, and the two write the same key set (`--keys-equal`).
   - On the bench, `/front0Exact`'s `notIdentical` (rule 4 item 1) is 0 on every R3 record (K8 and K8f) and every R5 record (K8b).
   - **The rate-0 control** (decision 11). N0-head's 2-round `v7` smoke with the mock at 0 equals the 2-round v6 smoke both ways, with the labels, timing fields, `pb35`, C4's two fields and `frontLookRateMock` aside. K4z (`v7`, set A, game records, mock 0) has 6,720 game sha256s equal to R3's (cross-tree, `--games-vs`).
   - In the suite: "v7/front-0 plays v6's game" (rule 16).

4. **The exact claims on the bench.** Items 1–14, with 7b, must read 0 on every snap: item 1 for front0 on every bench, and the rest for each disguised arm against front0, that is mug, stem and v7 on K8, and v7f on K8f and K8b. v7nc and v4 are not held to them, because their calls differ from front0's by design (v7nc draws no creeper in the call or in the huddle's guess); v7nc is compared with v7 only (rule 14). Item 15 compares K8 with K8f, and its `forcedUnwornLegal` half also runs on K8b. The narrowing equalities and the decomposition are set-A claims (K8), because only K8 has mug and stem.
   - **Every counter carries its checked count,** which must be above 0 on each arm where its population exists by construction, as `guard35.py` floors them: on the arms that wear the Mug, the Mug's items, which are 7b, item 12's `bittenBluffNotConverted` and `bluffRolledWithoutGhostAndHot`, and item 13's LOOK half (it needs a ghost, which a Stem never shows); on the arms that wear the Stem, the Stem's items, which are item 8's Stem half, item 9 and `stemBluffRolled` (its checked count is `bluffChecked` on stem and `bluffRolledChecked` where the Mug is also worn); and every other item on every disguised arm, item 12's `bluffSlideCheck` (whose population, worn snaps that are not `short`, exists on every disguised arm) and item 13's COUNT half included. Item 8's Mug half has no floor, and its checked count is reported: a Mug with no ghost needs the huddle's protection to name every shown man who drops (ghosts are shown men "not in R and not in N", `packages/engine/src/sim/pressureRead.ts:12`, :131), so its population does not exist by construction.
   1. `/front0Exact`'s `notIdentical`: front0's stream equals the base's.
   2. `offenseDiffer`: the disguised arm's offence call equals front0's. The huddle cannot see a look (line 565).
   3. `defenseDiffExceptLook`: its defence call equals front0's once `shownRush` and the front LOOK tag are removed. This is line 811's "`disguise_rate` and `disguise_mask_mix` unchanged per snap", with R7's unstamped disguise (line 569).
   4. `unwornNotIdentical`: where the arm wears no look, its stream equals front0's.
   5. `shortDiffer`: `short` is the same on both arms, because the look moves no played rusher and the huddle's names do not change.
   6. `bandDiffWhereBothRoll`: where both arms roll, the roll's total, target and band are equal. They roll the same fork, and the target is 50 plus the call's own disguise row (line 569).
   7. `wornTrueCallNotIdentical`: on worn ∩ `short` snaps read TRUE or CALL, the streams differ only in `shownRush` and the tag. Both arms roll there under trigger (a), TRUE answers the extras where they play, and CALL answers nobody (`pressureRead.ts:161-176`).
   7b. `bluffTrueCallNotIdentical`: on `bluffRolled` snaps read TRUE or CALL, the streams differ only in `shownRush`, the tag, the disguised arm's PRESNAP_READ `blitz_recognition` event and `PLAY_START.offense.pressurePicture` (`{picture, answers: [], placed: []}`). Every other event is equal, `seq` aside, and every outcome difference is 0.
      - Why: on a Mug bluff `unaccounted` is empty, so front0 does not roll. The disguised arm shows a ghost, so `looked` is true, and with a hot route the pictures do not decide alike, so it rolls (`packages/engine/src/sim/preSnap.ts:337`, :359-360).
      - On TRUE or CALL nothing is answered, no hot route converts (`preSnap.ts:382-383`), nothing is wanted (`pressureRead.ts:246-279`) and no leash is rolled (`packages/engine/src/sim/passPlay.ts:412-418`). `recognized` reaches only contested pickups (`preSnap.ts:500-505`), and a bluff has none. Every die is forked by label, so the extra roll moves no other die.
   8. `mugInertNotIdentical` and `stemInertNotIdentical`: a Mug with no ghost, or a Stem with no moved man, changes only `shownRush` and the tag.
   9. `stemAddsRoll` and `stemDiffOffLive`: the block above, entry 3.
   10. `fooledDiffWithoutDecision`: on fooled snaps every outcome difference comes with a decision difference, in the hot conversions or in the slide side. A third channel, a named dropper shown by the Mug, shrinks COUNT's and LOOK's perceived pool, which reaches only the keep-in's need (`pressureRead.ts:246-257`); no v7 call states a keep-in, so it should change no decision (INFERRED). This check counts it if it does.
   11. `keptInMen`: 0 on every arm that does not name `/keep-in` (line 1789).
   12. The bluffs (the block above, entry 4): `bluffSlideCheck` (line 820); `bittenBluffNotConverted`; `bluffRolledWithoutGhostAndHot`; `stemBluffRolled`.
   13. `lookHotMismatch`: on a fooled real-pressure snap pictured LOOK with a ghost and a hot route, the hot converts on the disguised arm and not on front0; pictured COUNT, it converts on both. This follows from the answer sets (`preSnap.ts:382-383`), and is INFERRED until the bench counts it.
   14. `countManDiff`: on fooled real-pressure snaps pictured COUNT on a MAN protection, every outcome difference is 0. COUNT answers the extras on both arms, so the hot conversions match (`pressureRead.ts:166-170`). MAN has no slide, and no back is kept in without `/keep-in`. The same holds for fooled LOOK snaps on a MAN protection with no hot route, or no ghost; their counter is `lookManNoHotDiff`.
   15. `forcedEqV7OnWorn` and `forcedUnwornLegal`. Every v7-worn snap in K8 has the same stream digest in K8f: H35 writes the per-snap list of worn snaps on both, `{i, n, look, side, digest}`, keyed `i:n`. The checked count must equal K8's v7 worn count. And v7f wears on every snap whose called card has a legal look.
   - In `guard35.py` some items are split into sub-counters, each must-be-0: 7b also counts `bluffTrueCallOutDiff`, item 9 also `stemDropsRoll`, and item 13 is `lookHotLookMismatch`, `lookHotCountMismatch` and `lookHotMismatch`. `stemDiffOffLiveStrict` and item 8's `mugInertChecked` are reported.
   - **The narrowing equalities (set A, K8):** `narrowMugEqNotIdentical` (v7's Mug snaps equal mug's), `narrowStemEqNotIdentical` (v7's Stem snaps equal stem's), and `wornSetDiffer` (mug wears on exactly v7's worn snaps, and stem on exactly v7's worn snaps whose call is Stem-legal). They hold because Stem-legal is a subset of Mug-legal on today's book (rule 16).
   - **The decomposition.** Per snap, v7 − front0 = 1[v7 wears the Mug] × (mug − front0) + 1[v7 wears the Stem] × (stem − front0), on every outcome key. `decompResidual` must read 0. v7 − mug − stem + front0 is reported and never read as an interaction: where both looks are legal it equals minus the effect of the look v7 did not choose.
   - **The runs.** That a worn look changes a run only in its PLAY_START echo stays INFERRED from the import graph (`readPreSnap` is imported only by `passPlay.ts`, and `packages/engine/src/sim/runPlay.ts` only echoes `shownRush`), because no run bench is built (plan point 22). K4z holds the unworn runs exactly (rule 3).

5. **The rates** (line 814), in 3.4's count form (lines 1979-1980). Each count is taken over all defensive calls, runs included, because the dice are thrown on every call that can wear a look (line 571). Sets A and B are pooled per arm (K5 + K10, K6 + K11, K7 + K9). Each arm is scored against its own legal calls; the expected values below are v6's calls (R3 + R5) and are previews at game level.
   - **The legal-look shares at B35** (the block above, entry 2, which re-reads them from R3), on v6's dropbacks, set A (R3), with A + B (R3 + R5) in brackets: Mug legal 92.12% (92.14%); Stem legal (toward the weak side, either side over a balanced rush) 82.12% (82.12%); both 82.12% (82.12%); the Mug alone 10.00% (10.02%); the Stem alone 0.00% (0.00%); balanced rushes 81.59% (81.57%), the Stem legal to both sides on 73.51% (73.49%). 3.4 filed 92.14%, 82.12% and 81.58% on joint at ccd75bb (lines 2311-2313). The counts below pool A + B, so their expectations use the A + B shares. Over all calls, runs included, A + B: Mug legal 92.40% and Stem legal 82.35% of 3,759,690 calls.
   - **The counts.** Worn calls against 0.1 × N_legal, with SD √(0.09 N_legal); N_legal counts any-legal calls on v7 (calls on which a look is legal, equal to the Mug-legal calls on today's book, because Stem-legal is a subset of Mug-legal), Mug-legal calls on mug and Stem-legal calls on stem. On v7, Mugs among worn calls where both looks are legal, against ½n with SD √(n/4). On v7 and stem, `/stem-side` LEFT among Stems over a balanced rush, against ½n with SD √(n/4). Expected over v6's calls on A + B (COMPUTED):

     | count | arm | what | n | expected | SD | ±2 SD | ±3 SD | ±10 SD |
     |---|---|---|---|---|---|---|---|---|
     | 1 | v7 | worn calls | 3,474,028 | 347,402.8 | 559.2 | [346,284.5, 348,521.1] | [345,725.3, 349,080.3] | [341,811.2, 352,994.4] |
     | 2 | mug | worn calls | 3,474,028 | 347,402.8 | 559.2 | [346,284.5, 348,521.1] | [345,725.3, 349,080.3] | [341,811.2, 352,994.4] |
     | 3 | stem | worn calls | 3,096,196 | 309,619.6 | 527.9 | [308,563.8, 310,675.4] | [308,036.0, 311,203.2] | [304,340.8, 314,898.4] |
     | 4 | v7 | Mugs among worn both-legal calls | 309,619.6 | 154,809.8 | 278.2 | [154,253.4, 155,366.2] | [153,975.1, 155,644.5] | [152,027.6, 157,592.0] |
     | 5 | v7 | `/stem-side` LEFT over a balanced rush | 138,544.5 | 69,272.2 | 186.1 | [68,900.0, 69,644.4] | [68,713.9, 69,830.5] | [67,411.1, 71,133.3] |
     | 6 | stem | `/stem-side` LEFT over a balanced rush | 277,088.9 | 138,544.5 | 263.2 | [138,018.1, 139,070.8] | [137,754.9, 139,334.0] | [135,912.5, 141,176.4] |

     Counts 4–6 take n as the expected worn calls of their kind, so their bands are previews twice over: the scored n is the arm's own.
   - **Verdicts.** Within ±2 SD passes. Outside ±2 SD records a miss, as measured. Beyond 3 SD a miss is a construction miss (rule 17). Beyond 10 SD the guard stops the runs, 3.4's gross stop (lines 2079-2084), filed here before N0.
   - **Multiplicity** (INFERRED, as decision 3 files it: the normal approximation, computed by `expected35`; by Šidák's inequality each chance below is at most about this, whatever the counts' correlation; the analyzer's report prints the same 3 SD figure under the build plan's wording, "INFERRED, independence assumed"). There are six counts. At 2 SD at most about 24% of correct runs would show at least one miss, which is why 2 SD only records a miss. Beyond 3 SD at most about 1.6% of correct runs would show at least one miss among the six counts, about 1 correct build in 62, and that miss fires rule 17 as Class C, so such a build would get the alternate card recommending "Merge, keep version 4" (decision 3 keeps the 3 SD line). A correct run reaches 10 SD on one count with a chance of about 1.5 × 10⁻²³, and on any of the six about 9.1 × 10⁻²³.
   - **v7f is outside these counts.** It wears at rate 1 on the bench, so neither the counts nor the 10 SD stop apply to it; its wear law is `forcedUnwornLegal` = 0 (rule 4 item 15). The rate-0 control is outside them too: its law is worn = 0 exactly (the floors after rule 18).
   - **Reported on dropbacks:** `front_look_rate` per arm against 0.1 × the legal share, and `front_look_mix`, with H35's cross-check of the mix, `pb35.frontLookMixMismatch`, which is reported and stops nothing. The preview over v6's dropbacks (COMPUTED): v7 worn on 9.21% of dropbacks, 55.4% of them Mugs; mug on 9.21%; stem on 8.21%. So "each about half" (line 814) holds only where both looks are legal.
   - **Exact:** collect's `front_look_rate` count equals H35's on every HEAD35 game shard (`frontLookRateMismatch` 0). `formationDropped` is 0, labelled "no producer on today's book": every legal draw on every `COMPOSED` entry is worn on all 12 formations (C2's test, 4,128 of 4,128 applications; rule 16), and that no MAN fallback in the book is a rush is INFERRED from the build plan's map of the book.

6. **The bite share** (line 816), scored as filed.
   - The population is rolled reads on Mug-worn dropbacks, by the call's own row: four-man calls, Smoke over Sky and Fire over Base Cover 1 are STANDARD; Fire over Sky and the three Creeper calls are ZONE_BLITZ; Dime Smoke is DELAYED.
   - The count of COUNT ∪ LOOK is set against Σ p, with p the analytic share computed per snap from that snap's quarterback's and centre's Awareness and the row (line 1311), and SD √Σ p(1 − p). "Within 2 SE" is read as ±2 SD of the count. The filed 26, 41 and 46 (line 816) are printed beside it. It is scored on v7 and mug, over A + B.
   - **Expected over v6's dropbacks** (COMPUTED over R3 + R5, A + B; previews for the game-level arms, whose own reads are scored):

     | arm | row | rolled reads | analytic share | SD of the count |
     |---|---|---|---|---|
     | v7 | STANDARD | 56,748 | 26.0% | 104.5 |
     | v7 | ZONE_BLITZ | 19,897 | 41.0% | 69.4 |
     | v7 | DELAYED | 1,484 | 46.0% | 19.2 |
     | mug | STANDARD | 112,663 | 26.0% | 147.2 |
     | mug | ZONE_BLITZ | 19,897 | 41.0% | 69.4 |
     | mug | DELAYED | 2,967 | 46.0% | 27.1 |

   - **The flat league's read on honest snaps, from R3 and R5** (v6, a reference, not an arm): rolled 453,190, 187,733, 25,887 and 44,338 reads on STANDARD, ZONE_BLITZ, DELAYED and ZERO calls; analytic shares 26%, 41%, 46% and 51%; observed 25.9% (z −1.05), 40.9% (z −1.00), 45.9% (z −0.41) and 50.6% (z −1.52). ZERO is not Mug-legal, so its row scores nothing here; it is printed because it is the engine's read that the bite share rests on.
   - **The aware cells** (decision 15), COMPUTED from §5.3's formula itself, margin = d100 + round(QB Awareness / 5) + round(C Awareness / 5) − 50 on STANDARD, with the band table that maps a margin to a picture (`packages/engine/src/tunables.ts:213-222`, :238-245; `attrMod` rounds, `packages/contracts/src/registry.ts:43-45`), with no aware reference run (expected35's `awareComputed`; its transcription is checked against the flat league's rolled reads at 60/60): the analytic STANDARD bite share is 42% at quarterback and centre Awareness 20/20, 27% at 20/95, 27% at 95/20 and 15% at 95/95, against the flat league's 26%, computed from R3 as decision 15 asks (every flat-league player is rated 60, so every snap's share is the same and the A + B figure above equals it). K14 and K15 measure them, reported by offence cell.
   - **A miss is recorded as measured, and it is not a trigger** (plan point 52). The band is a property of the engine's read, which 3.5 does not build, and 3.0 already measured DELAYED's bite share at z −3.1 (line 1309).

7. **The bluffs** (the block above, entries 4–6).
   - Exact: rule 4, item 12.
   - On bitten bluff snaps on the bench (v7f − front0 per snap, over K8f + K8b, with v7 − front0 on K8 beside it): Δcmp < 0 and Δint > 0 a hundred snaps, each by the sign rule (rule 13). Δatt a hundred snaps and throws to a converted receiver are reported beside them, and the per-attempt rates are printed without a verdict, because the bench keeps only n, Σ and Σ² of each per-snap difference.
   - Δsack > 0 by the sign rule on bitten bluffs whose converted route is a Slant or the Shallow Cross. Sit, Swing, the Out and designation-only conversions are reported as undetermined.
   - Per-route rows, as information: v6's hot-route shares on the bench base, and v7 − front0 by converted route (plan point 44).
   - **Expected sizes** (COMPUTED, expected snaps): `bluffRolled` 410,557 on v7f over A + B and 10,268 on v7 over A; bitten bluffs 108,808 and 2,721; those converted to a Slant or the Shallow Cross 22,070 and 549.
   - **Minimum detectable effects,** a hundred snaps, independent at 2 and 2.8 SE (rule 13), then paired at the borrowed ratio. Expected35 keeps v6's sacks on each stratum but not its completions or interceptions, so Δcmp's and Δint's are printed at the bound p = ½ and at a labelled proxy, v6's rate per dropback on snaps that are not `short`; neither is the stratum's own p.
     - Δcmp, v7f over A + B, at the bound, p = ½: 0.43 and 0.60 points at 2 and 2.8 SE (0.23 and 0.32 at the borrowed paired ratio); at the proxy, p = 24.4%: 0.37 and 0.52 points at 2 and 2.8 SE (0.20 and 0.27 at the borrowed paired ratio). v7 over A, at the bound, p = ½: 2.71 and 3.80 points at 2 and 2.8 SE (1.44 and 2.01 at the borrowed paired ratio); at the proxy, p = 24.4%: 2.33 and 3.26 points at 2 and 2.8 SE (1.24 and 1.73 at the borrowed paired ratio).
     - Δint, v7f over A + B, at the bound, p = ½: 0.43 and 0.60 points at 2 and 2.8 SE (0.23 and 0.32 at the borrowed paired ratio); at the proxy, p = 1.3%: 0.10 and 0.14 points at 2 and 2.8 SE (0.05 and 0.07 at the borrowed paired ratio). v7 over A, at the bound, p = ½: 2.71 and 3.80 points at 2 and 2.8 SE (1.44 and 2.01 at the borrowed paired ratio); at the proxy, p = 1.3%: 0.62 and 0.87 points at 2 and 2.8 SE (0.33 and 0.46 at the borrowed paired ratio).
     - Δsack on Slant or Shallow Cross bluffs, v7f over A + B: 0.82 and 1.15 points at 2 and 2.8 SE (0.44 and 0.61 at the borrowed paired ratio). v7 over A: 5.23 and 7.32 points at 2 and 2.8 SE (2.78 and 3.89 at the borrowed paired ratio).

8. **R2, deciding** (Decision 6, lines 1153-1154; Q6(a), line 1207).
   - **R2a:** Δsack(deciding arm − front0) > 0 on `r2Expected` ∩ `fooled`, where the deciding arm is v7f (v7 in the fallback below). This is Decision 6's "above all `r2Expected`" (lines 1153-1154; line 830, kept by line 1792).
   - **R2b:** Δsack(deciding arm − front0) > 0 on `deceivedReal` ∩ not `releaseListed` (line 829, standing as filed, line 1792; the block above, entry 8, reads `releaseListed` off the card).
   - **How.** On the bench, v7f − front0, keyed on v7f's snap, pooled over K8f (set A) and K8b (set B) by summing n, Σ and Σ². The verdict is the sign rule (rule 13), on the bench SE of rule 13. v7 − front0 on K8 (set A) is reported beside each verdict, with its own SE.
   - **v7f is deciding only if N0-head proves it.** N0-head must show that v7f wears on every legal call, and that it equals v7 on v7's worn snaps, on the 1,000-record bench (the tools below). If it cannot be built, R2a and R2b are scored on v7 as revision 1 filed: K8 and a plain-v7 K8b; their minimum detectable effects are the v7 rows over A + B below, and R2a is expected to read NOT SHOWN at that size. The owner hears it in plain words before K8, and the card says so. **If the fallback is taken** (N0-head ends PASS-FALLBACK), a dated amendment adds `expected35`'s (v7, A + B) rows for the eight channel strata (`ch:none`, `ch:lookHot`, `ch:slide` and `ch:both` of R2a and of R2b), R2bRel, `stemRule10`, `bitBluff` cmp and int, and `bitBluff|slantShallow`, and this block files them, before K8 runs (plan §18b decision 18). Until then the fallback's `ch:slide` figure is the computed one of rule 17. In the fallback the deciding arm is v7 wherever this block reads v7f on the bench: every bench figure it reads on v7f over K8f + K8b (rules 4, 7, 9, 10, 12, 19 and 20) is read on v7 − front0 over K8 + K8b, as the analyzer's deciding pool is, and rule 4's item 15 is not run, because K8f is not run and the fallback's K8b holds no v7f.
   - **Nothing else goes to the owner before the runs are measured** (decision 1). That line is the one exception. The owner hears R2's sizes in W2, and W2 and the card are written from the measured figures.
   - **Why this is not a change of the deciding population** (line 1793). Each population is defined as filed, by the snap and the worn call (`r2Expected`, `fooled`, `deceivedReal`, `releaseListed`). v7f changes only how many of its snaps are disguised, and the disguise is placed by an independent die. W2 says it in plain words.
   - **Preconditions.** Rule 4's items 5, 6, 7, 7b, 10, 14 and 15 read 0 first (item 15 drops out in the fallback, where it is not run). They put the whole effect on fooled snaps, and only through decisions. If one of them is not 0, or was not computed, R2a and R2b are not read: the analyzer prints NOT READ with the items.
   - **R2b's three channels, filed with their signs as the ADR states them:**
     1. **No decision difference** (`ch:none`: the hot conversions and the checked side both match, as on every fooled COUNT snap on a MAN protection, and on fooled LOOK snaps there with no ghost or no hot route): exactly 0, by rule 4 items 10 and 14.
     2. **LOOK-hot** (LOOK with a ghost and a hot route, any protection): the hot route converts on the disguised arm only. Its sign is undetermined (line 1402; line 1784).
     3. **SLIDE slide-changed** (a SLIDE call whose checked side differs between the arms): slid → contested, so the sign is up (line 1784).
     The channels are read off the pair keys, so they partition the stratum (decision 14 keeps it a partition): `ch:lookHot` where the hot conversions differ and the checked sides do not, `ch:slide` where the checked sides differ and the hot conversions do not, `ch:both` where both differ (a LOOK on a SLIDE call with a ghost and a hot route), printed apart, and `ch:none`. R2b's deciding sign stays as filed: Δsack > 0 on the whole stratum (lines 829, 1792). The channels decide nothing. They say which term carried the verdict, and rule 17 reads `ch:slide`'s sign. The analyzer prints each channel's Δsack with its SE beside each verdict, for R2a as for R2b.
   - **Expected sizes and v6's sack rates** (COMPUTED; expected snaps on the bench; p is v6's sack rate on the stratum, weighted by each snap's chance to be in it). v7 wears at 0.1 where v7f wears at 1, so each v7 size over A + B is a tenth of v7f's at the same p:

     | stratum | v7f, A + B | p | v7, A (K8) | p, v7, A | v7, A + B (the fallback) |
     |---|---|---|---|---|---|
     | worn | 2,185,362 | 16.6% | 54,641 | 16.5% | 218,536 |
     | worn ∩ `lookOverReal` | 545,920 | 15.8% | 13,611 | 15.7% | 54,592 |
     | `fooled` | 284,085 | 18.1% | 7,095 | 18.0% | 28,408 |
     | `deceivedReal` | 175,277 | 16.4% | 4,374 | 16.3% | 17,528 |
     | `deceivedBluff` | 108,808 | 20.8% | 2,721 | 20.7% | 10,881 |
     | `r2Expected` (worn) | 2,383 | 24.5% | 63 | 25.3% | 238 |
     | **R2a**: `r2Expected` ∩ `fooled` | 992 | 24.8% | 26 | 25.5% | 99 |
     | **R2b**: `deceivedReal` ∩ not `releaseListed` | 110,185 | 21.0% | 2,749 | 20.7% | 11,018 |
     | with release: `deceivedReal` ∩ `releaseListed` | 65,092 | 8.7% | 1,625 | 8.7% | 6,509 |
     | `r2ExpectedWide` ∩ `fooled` | 7,215 | 12.2% | 181 | 13.1% | 722 |

     The build plan's previews of these sizes were INFERRED from its maps; these computed sizes replace them. "worn ∩ `lookOverReal`" is a snap population; rule 20's `lookOverReal` is the call-level one, which both arms have.
   - **The channels' expected sizes** (COMPUTED, share of the stratum in brackets):

     | stratum, arm | `ch:none` | `ch:lookHot` | `ch:slide` | `ch:both` |
     |---|---|---|---|---|
     | R2a, v7f A + B | 353 (35.6%) | 1.8 (0.2%) | 11 (1.1%) | 626 (63.1%) |
     | R2b, v7f A + B | 98,494 (89.4%) | 10,615 (9.6%) | 333 (0.3%) | 743 (0.7%) |
     | R2a, v7 A | 9.3 (35.6%) | 0.044 (0.2%) | 0.28 (1.1%) | 16 (63.1%) |
     | R2b, v7 A | 2,455 (89.3%) | 266 (9.7%) | 7.8 (0.3%) | 19 (0.7%) |

   - **The minimum detectable effects, filed before any arm** (decision 1: on both bounds, and NOT SHOWN is a possible outcome). They are 2 × √(2p(1 − p)/n) and 2.8 × √(2p(1 − p)/n) in points a snap, with each row's own n and p from the table above (a v7 row over A uses set A's p; the fallback's rows over A + B use v7f's). 2 SE is 3.4's convention (lines 2009-2010), and it is the effect the sign rule shows only half the time; 2.8 SE is the effect it shows 80% of the time. The paired value at 3.4's observed paired-to-independent ratio, 0.531 (COMPUTED from 3.4's bench, joint − jnc on joint's 13,877 creeper snaps; lines 2009, 2178), is printed beside them, labelled as borrowed from creeper snaps. The independent bound is the filed one.
     - **R2a**, v7f over A + B: 3.88 and 5.43 points at 2 and 2.8 SE (2.06 and 2.88 at the borrowed paired ratio). v7 over A: 24.14 and 33.79 points at 2 and 2.8 SE (12.81 and 17.94 at the borrowed paired ratio). v7 over A + B (the fallback): 12.27 and 17.18 points at 2 and 2.8 SE (6.51 and 9.12 at the borrowed paired ratio).
     - **R2b**, v7f over A + B: 0.35 and 0.49 points at 2 and 2.8 SE (0.18 and 0.26 at the borrowed paired ratio). v7 over A: 2.19 and 3.06 points at 2 and 2.8 SE (1.16 and 1.63 at the borrowed paired ratio). v7 over A + B (the fallback): 1.10 and 1.54 points at 2 and 2.8 SE (0.58 and 0.82 at the borrowed paired ratio).
     - **The with-release stratum**, v7f over A + B: 0.31 and 0.44 points at 2 and 2.8 SE (0.17 and 0.23 at the borrowed paired ratio). v7 over A: 1.98 and 2.77 points at 2 and 2.8 SE (1.05 and 1.47 at the borrowed paired ratio).
     - **Channel-aware rows, labelled, beside the filed bounds** (they decide nothing). `ch:none`'s snaps differ by exactly 0 (rule 4), so the stratum's variance comes only from the share f with a decision difference: k × √(f × 2p_m(1 − p_m)/n), with p_m v6's sack rate on those snaps. **R2a**, v7f over A + B: 3.12 and 4.36 points at 2 and 2.8 SE (channel-aware, f = 0.644, p_m = 24.90%); v7 over A: 19.38 and 27.13 points at 2 and 2.8 SE (channel-aware, f = 0.644, p_m = 25.57%); v7 over A + B (the fallback): 9.85 and 13.80 points at 2 and 2.8 SE (channel-aware, f = 0.644, p_m = 24.90%). **R2b**, v7f over A + B: 0.11 and 0.16 points at 2 and 2.8 SE (channel-aware, f = 0.106, p_m = 21.95%); v7 over A: 0.73 and 1.02 points at 2 and 2.8 SE (channel-aware, f = 0.107, p_m = 21.92%); v7 over A + B (the fallback): 0.36 and 0.51 points at 2 and 2.8 SE (channel-aware, f = 0.106, p_m = 21.95%). The with-release stratum has no such row, because `expected35` keeps no channel strata for it.
     - **Which 2 SE a verdict reads.** The verdict's SE is the larger of its realised per-snap and per-game SEs (rule 13), not any figure above. On R2a and R2b, whose `ch:none` snaps differ by exactly 0, it is expected to sit near the channel-aware row, and it can fall below the filed independent bound (INFERRED, as `expected35`'s note says). So a NOT SHOWN on R2 reads as 3.4's creeper rows did (line 2010), against the verdict's own SE: the effect is smaller than about 2 × that SE, and one at 2.8 × that SE would be shown 80% of the time. W2 says so, with the verdict's own 2 SE and 2.8 SE figures and the filed bound beside them.
   - **Splits printed beside each verdict:** look; picture; SLIDE or MAN protection; hot conversions differ between the arms or not; disguise row; the three channels. For R2b the SLIDE no-release calls are printed apart, because the stratum is mostly MAN protections, where only the hot term moves sacks.
   - **Mechanism counts beside each verdict:** Δslid, ΔpickupLost, Δunblocked, ΔhotConv and Δroutes.
   - **Scored separately, never deciding:** the with-release stratum, `deceivedReal` ∩ `releaseListed`, which line 1792 re-files as "Reported as measured and scored separately" and Q6(a) scores apart (line 1207). It gets the sign rule on v7f − front0 over K8f + K8b, against its filed lean, up (line 1792), with v7's figure beside it, and it does not decide R2.
   - **Reported, never deciding:** `r2ExpectedWide`, which is `r2Expected` without its `not releaseListed` clause (line 1793), with the MDE of `r2ExpectedWide` ∩ `fooled` (the table above), 1.09 and 1.52 points at 2 and 2.8 SE (0.58 and 0.81 at the borrowed paired ratio) on v7f over A + B; `r2Expected` over every band; `deceivedReal` whole, 0.25 and 0.35 points at 2 and 2.8 SE (0.13 and 0.19 at the borrowed paired ratio); honest snaps; `ch:slide` over all `fooled` snaps (decision 14), read off H35's `ch:slide` key, which H35 writes on every snap (it keeps no `fooled|ch:` crossing); by rule 4 no decision differs off `fooled` (rule 11: the all-snap term equals the fooled-snap term), so the analyzer's row over every snap is this row (INFERRED from rule 4, not counted); and the game-level aggregate (rule 11).
   - **Outcomes.** NOT SHOWN is recorded as measured, and it is not a pass. A FAIL is recorded with its cause (line 737), and it fires rule 17, whose class rule reads `ch:slide`.

9. **Real pressure's mechanisms** (lines 826-828, as lines 1784 and 1791 re-file them).
   - Reported: slide checks made on fooled real-pressure SLIDE snaps, v7f against front0 (K8f + K8b), with v7 against front0 (K8) beside it, with Δslid, Δcontested and ΔUNBLOCKED.
   - Exact: rule 4, item 13.

10. **The Stem** (line 733; the block above, entry 3): Δsack > 0 on `stemLive` snaps on a SLIDE call read COUNT or LOOK, by the sign rule, scored on v7f over K8f + K8b, with v7 and stem on K8 beside it. Line 733 calls the population tiny, and the build plan expected a NOT SHOWN (INFERRED) before its size was computed; the sizes and minimum detectable effects below replace that expectation, and a NOT SHOWN is recorded as measured (rule 8's reading). Expected (COMPUTED): 5,689 snaps on v7f over A + B, 142 on v7 and 284 on stem over A; `stemLive` as a whole 51,227 on v7f. Its minimum detectable effect: v7f over A + B 1.07 and 1.50 points at 2 and 2.8 SE (0.57 and 0.80 at the borrowed paired ratio); v7 over A 6.79 and 9.51 points at 2 and 2.8 SE (3.60 and 5.05 at the borrowed paired ratio); stem over A 4.80 and 6.72 points at 2 and 2.8 SE (2.55 and 3.57 at the borrowed paired ratio).

11. **The aggregate** (line 832; line 1794).
    - Δsack(v7 − v6) at game level over A + B (26,880 games) is falsified outside [−0.148, +0.168] pp. That is the filed interval widened by 2 × 0.034 pp, the filed SE at 26,880 games (line 723). The independent SE of a game-level difference at v6's sack rate (16.63% over 2,371,845 dropbacks in 26,880 games) is 0.034 pp (COMPUTED), against the filed 0.034 pp. The paired per-game SE is printed beside the verdict.
    - It is reported and never deciding (Decision 6, lines 1153-1154).
    - Beside it goes the bench's all-snap Δsack(v7 − front0). By rule 4 it equals the fooled-snap term exactly, and it is split by `hot:diff` and `slide:diff`.
    - **The whole-ADR aggregate** (line 735, as line 1786 re-files it): Δsack(v7 − v4) at game level, (K7 + K9) − (K1 + K13), with its paired per-game SE. It is unsized, reported and never deciding (Decision 6, lines 1153-1154). It is the same figure as rule 14's sacks line, printed here under line 1786's name.

12. **The interception guard and G1.**
    - **The guard is line 834, with a sampling rule** (the block above, entry 7). It applies only if the game-level Δint/att (v7 − v6, K7 + K9 against K3 + K12) is +2 paired per-game SE or more.
      - Then, on the bench (v7f − front0, K8f + K8b), H is ΣΔint over fooled snaps whose hot conversions differ between the arms (`fooled|hot:diff`), and N is ΣΔint over every other snap.
      - "Bitten" in line 834 and in the block above, entry 7, is read as fooled: a worn snap whose read rolled and was pictured COUNT or LOOK, real pressure included, as entry 7's reason needs (its COUNT snap with a real blitzer). It is not rule 7's bitten bluffs. The tools compute H this way (`intGuard35`, `KEYS35.md`).
      - "At least 80% on H" is H ≥ 0.8(H + N), that is L = 0.25·H − N ≥ 0. L's SE comes from the two strata's n, Σ and Σ² (a stratum sum's SE is n times the stratum mean's SE), and from their per-game sums (rule 13).
      - The guard fails only when L < −2 SE. Then rule 17 fires.
      - By rule 4, Δint is 0 off fooled snaps, so N sits on fooled snaps whose conversions match, which is the slide's channel.
      - v7 − front0 on K8 is printed beside it, and so is the raw share H/(H + N).
    - **G1, carried from 3.3 and 3.4** (line 2027): Δint/att within 2 × 0.016 points and Δcmp/att within 2 × 0.055 points, for v7, mug and stem against v6, at game level over A + B. A miss is recorded as measured and passed to the fantasy gate. It is neither a stop nor a trigger. The bench's direct per-snap effect is printed beside each verdict.

13. **The SE rules.**
    - **Game rows** use the delta method over game pairs, paired on (seed set, `i`), as 3.4's `contrast_terms` did, with `delta` for two terms.
    - **Bench rows: the larger of two SEs** (decision 2). H35 keeps, for every key a bench verdict reads, the per-snap n, Σ and Σ² and the same sums per game (`pg35`, keyed by game index, with its key list in the bench header's `/pg35Keys`). The analyzer prints the per-snap SE (3.4's `bstat`) and the per-game clustered SE, and uses the larger.
    - **Clusters** (decision 16): per-game rows are clustered by (seed set, `i`), not `i` alone, and a league game's two side rows are kept in one cluster.
    - **Counts** use the Poisson-binomial SD √Σ p(1 − p).
    - **The sign rule** (lines 2023-2026): PASS if the estimate is beyond 0 in the claimed direction by 2 SE or more; FAIL if it is beyond 0 the other way by 2 SE or more; NOT SHOWN between, reported as measured and not a pass. **The count rule** is 3.4's `count_verdict`.
    - **Minimum detectable effects** are printed at 2 SE and at 2.8 SE (80% power at the 2 SE rule), with the independent bound filed and any borrowed paired ratio labelled. Where p is 0 or 1 on a stratum, or the stratum is expected empty, no MDE is printed, and the row says so.
    - **No shard-difference SE is used anywhere.** 3.4's per-player fantasy SEs came from 8 shard pairs and were too small (line 2294). Per-slot fantasy lines get paired per-game SEs from H35's per-game slot columns.

14. **The fantasy measurements** (lines 2301-2308).
    - **v7 − v4** = (K7 + K9) − (K1 + K13), each line with its paired per-game SE: completions and attempts separately, throwaways and scrambles, interceptions including hot interceptions, sacks, check-release targets by role, target share by position, points, total yards, designed rush yards a team-game, and per-slot PPR points a season.
    - **Hot interceptions into droppers** (line 410). A hot interception is a throw whose target is among PLAY_START's `hotConversions` receivers, on a play that ends intercepted. It is "into a dropper" when the interceptor is in PLAY_START's `shownRush` and not in its `rush`. The interceptor is the second actor of the play's `contested_catch` CHECK with band INTERCEPTION, else the defensive recoverer of a tipped ball, as the reducer credits it (`packages/engine/src/stats/statline.ts:462-463`, :551-556; `passPlay.ts:1775-1777`; amendment 1 below). `hotIntIntoDropper` gives the gate a paired per-game SE.
    - **"At 3.5's closing commit"** (line 2302) is read as these HEAD35 figures. They hold at C7 because CL1 and CL2 replay K1's and K7's games byte for byte at C7, and the pins show that only the `default` rows moved. W and C8's note say so.
    - **The drift base is re-measured.** PR #13 moved both v4 and v6, so 3.4's +0.150 ± 0.043 completion points (lines 2303 and 2094) is a ccd75bb figure, quoted as such. The base is v6 − v4 at B35, (R3 + R5) − (R1 + R4). Cumulative v7 − v4 is printed against one step's 0.110 explicitly.
    - **PR #13's own drift:** B35 − ccd75bb on v4 and v6, from the shards, labelled cross-tree.
    - **P7 by season,** against 3.4's real-joint table by season (plan point 24).
    - **The huddle's guessed creeper:** the bench's v7 − v7nc on `noCreeper|offDiff`, the stratum 3.4 measured (13,455 snaps, Δsack −0.36 ± 0.19; lines 2128, 2182-2186). That figure is joint against jnc on ccd75bb (lines 971, 2128), so it is quoted as a ccd75bb figure and the comparison is labelled cross-tree. It is split by worn and not worn through `noCreeper|offDiff|worn` and `noCreeper|offDiff|unworn`. Over all snaps v7 − v7nc also holds the real creeper's own effect (line 2180), so that figure is printed only beside it (line 2307).
    - **The two leagues** (K14–K17), reported by offence cell, never scored. A game holds two cells' offences, so H35 writes the per-game columns once per offence side, each with its side's cell, and the bite counts by cell.
    - **Target share** against G5's real shares (line 1732) and backlog 171.

15. **What is held** (line 373's pattern): the engine (line 394) and its tunables (`fnv1a:395a9ae2` on every shard); leash 50, except the d20 arms; the flat league, except the aware and d20 arms; the coverage-look code; v6's draw; `FRONT_LOOK_RATE` 0.1 (`rateConstant` reads 0.1 on every unmocked HEAD35 shard, the tables below); and the offence's call mix, printed by the analyzer's held check.

19. **D reaching E: the coverage read under a front look** (lines 434, 912, 980-982; R3 at line 1049).
    - Reported per arm on worn ∩ `coverageMasked` snaps, on the bench (mug, stem and v7 against front0 on K8, and v7f against front0 over K8f + K8b): the coverage-read difference and Δint, with Δint split by whether the hot conversions differ. The bench's per-snap `cov` outcome and its coverage-read comparison give these rows. At game level each arm (v7, mug and stem, with v6 beside them) reports its `coverageMasked` dropback count and the `coverage_read` bands over all its dropbacks: game mode keeps no band count per population, so no band count on worn ∩ `coverageMasked` is printed.
    - With no `/keep-in`, a front look reaches E only through hot conversions (line 434). A front look alone never rolls E, because `shownAssignments` keeps its reference (`passPlay.ts:2129`). So on worn ∩ `coverageHonest` snaps the coverage read must be the same on both arms: `coverageReadOnHonestWorn` is a must-be-0 counter.
    - Expected (COMPUTED, v6's dropbacks over A + B): coverage-masked calls are 31.6% of dropbacks and coverage-honest 68.4%.

20. **The triple's form** (R31 at line 1077; `ARCHITECTURE_CHARTER.md:2208`).
    - **At game level** the triple (exit, sack, conversion and pressured, with paired per-game SEs) is scored on populations both arms have: the call-level `all`, `mugLegal`, `stemLegal` and `lookOverReal`, read as intent to treat. A contrast refuses an empty bag, and v6 has no worn snap. Their sizes on v6's dropbacks over A + B (COMPUTED): 2,371,845, 2,185,362 (92.1%), 1,947,811 (82.1%) and 545,920 (23.0%), with v6's sack rates 16.63%, 16.55%, 16.26% and 15.81%.
    - **Within v7** there is a row for worn against legal-but-unworn, which the `/wears` die randomizes, as 3.4's within-joint row did. Expected on v7 over A + B: 218,536 worn and 1,966,826 legal-but-unworn dropbacks.
    - **On the bench**, the worn, fooled and `deceivedReal` triple (v7f − front0 and v7 − front0).
    - Every cell is computed. A missing column is INCOMPLETE.

17. **The alternate-card triggers.** The owner gets the alternate card, not the merge card, if any of these holds:
    - an exact claim in rules 2–5 fails although the code does what §2.5 and rule 16 say (a defect stops the runs instead);
    - a count in rule 5 misses by more than 3 SD;
    - R2a or R2b FAILs;
    - the interception guard fails (rule 12);
    - a known-truth ladder gate is red under v7 at the dry run D;
    - a sack ladder's honest v7 record cannot meet the record rules without lowering a floor or widening a tolerance (rule 18);
    - after C7 exists and before it merges, main gains a resumable save that does not record the resolved caller identity (the stop rules' "Saves": before C7 exists, C7 waits for E1 and no card is sent).
    - **What does not count:** a NOT SHOWN on R2; the with-release stratum's sign (rule 8); the bluffs' signs (rule 7); the bite share (rule 6); G1; the aggregate interval; the Stem's sign; any reported row; a record rule met through rule 18's allowed levers.
    - **The recommended option on the alternate card depends on the trigger's class:**
      - **Class C, the construction or the move is in doubt:** a defect-free exact claim fails; a count misses by more than 3 SD (a correct build does so at most about 1 time in 62, rule 5); the interception guard fails; a ladder is red, or its record cannot meet the rules; a save without its caller exists. The recommendation is "Merge, keep version 4".
      - **Class P, a football prediction failed on a build that does what was ruled:** R2a or R2b FAILs, every exact claim and count passes (read as below), and the SLIDE slide-changed channel is not itself reversed. So the reversal is carried by the LOOK-hot term the ADR left undetermined (line 1402). The recommendation is "Merge and move", with the failed prediction recorded as measured (line 737).
      - **What "every exact claim and count passes" means** (plan §18b decision 17). Every exact claim of rules 2–4 holds, and no count of rule 5 is beyond 3 SD. A count between 2 and 3 SD is a miss recorded as measured (rule 5: "Outside ±2 SD records a miss, as measured. Beyond 3 SD a miss is a construction miss"), not a doubt about the construction, so it does not by itself keep an R2 FAIL out of Class P. Such an R2 FAIL is Class P when its own `ch:slide` is not FAIL (decision 14, below), and Class C otherwise. An exact claim of rule 5 that fails is a Class C trigger above, and Class C wins. No case is left without a class.
      - **Which `ch:slide` is read** (decision 14). For an R2a FAIL or an R2b FAIL, the sign rule is read on `ch:slide` of that verdict's own deciding stratum. An empty `ch:slide`, or one whose sign rule reads NOT SHOWN, is "not FAIL". An R2 FAIL whose `ch:slide` reads FAIL is Class C. If both R2a and R2b FAIL, a FAIL on either one's `ch:slide` makes the trigger Class C.
      - **A degenerate `ch:slide`** (plan §18b decision 19). For the class test, a failing verdict's own `ch:slide` with fewer than 2 snaps, or with zero SE and zero mean, reads NOT SHOWN, so it is "not FAIL" (decision 14). With zero SE and a nonzero mean, the sign rule's z is infinite, so it reads by the sign of the mean: FAIL if the mean is below 0, else not FAIL. So no case is INCOMPLETE for want of a slide reading.
      - **At these sizes the class test catches only a large reversal.** `ch:slide` is expected at 11 snaps of R2a and 333 of R2b on v7f over A + B (rule 8), and its minimum detectable effect is, on R2a's, 32.07 and 44.89 points at 2 and 2.8 SE (17.02 and 23.83 at the borrowed paired ratio), and on R2b's, 5.74 and 8.04 points at 2 and 2.8 SE (3.05 and 4.27 at the borrowed paired ratio). So an R2 FAIL will most likely read Class P.
      - **In the fallback** (rule 8), the deciding stratum is v7's over A + B, where `ch:slide` is expected at 1.1 snaps of R2a and 33 of R2b: a tenth of v7f's at the same p, so its minimum detectable effect is √10 (about 3.2) times v7f's above, as computed (plan §18b decision 18). `expected35` prints no row for it; if the fallback is taken, the dated amendment of rule 8 files that row before K8 runs. Beside them, on v7 over A (K8): R2a's 244.54 and 342.36 points at 2 and 2.8 SE (129.80 and 181.73 at the borrowed paired ratio); R2b's 39.63 and 55.48 points at 2 and 2.8 SE (21.04 and 29.45 at the borrowed paired ratio).
      - If triggers of both classes fire, Class C wins.

18. **The ladder re-record rule,** for the two sack ladders under the flip (D's step 2).
    - **First, the honest record.** Run §22a's full procedure at the scenario's own `games` and rungs: usage, curve, then replicate with eight seed sets (`ladderRerung.test.ts:16-27`). Check the steps and SEs against the three record rules (`knownTruth.test.ts:146-190`, :230-240):
      - the record has a positive step with an SE;
      - the signal: tolerance ≤ half the smallest step;
      - the noise: (step + tolerance) / SE ≥ 4;
      - the floor: `minEffect` ≤ 0.8 × span. `dl-passrush-sack-rate` needs a span of at least 0.0938 (`packages/calibration/src/knownTruth/scenarios.ts:564`; its 2026-07 span is 0.1104).
    - **If every rule passes,** the rungs, games, tolerance and floor stay as they are, and the closing digests stay as filed.
    - **If a rule fails,** only §22a's levers are used: more `games`, or rungs re-chosen where the curve says. A tolerance is never widened and `n` is never lowered (`packages/calibration/test/knownTruthGate.ts:29`; `ladderRerung.test.ts:34`). C7's message and W name the lever. The digest clause is amended to the new `#N` (the digest's `#N` is the seed count, `packages/calibration/src/harness/seeds.ts:56`, which is the scenario's `games`, `packages/calibration/src/knownTruth/assertions.ts:131`), and CI cost is measured again.
    - **Lowering a floor is not a lever.** If no allowed lever meets the rules, rule 17 fires (Class C).
    - The usage stage's `attributesNotReadByMechanism` must still pass `attributeClaims.test.ts:58-91`. A change there is reported in C7's message.

**Checks that must read 0, by arm** (every shard; any one above 0 stops the runs for diagnosis (§8)). This is `guard35.py`'s table, filed as 3.4 filed its own (lines 2058-2075). The guard scopes each check by the run's own header.
- **The arm sets.** "Every arm" is every run's arm: v4, v5, v6, front0, mug, stem, v7, v7nc, v7f, the rate-0 control, and the league arms aware-v6, aware-v7, d20-v6 and d20-v7. "The v7 arms" are every arm whose caller is v7: front0, mug, stem, v7, v7nc, v7f, the rate-0 control, aware-v7 and d20-v7. "The Mug arms" are mug, v7, v7nc, v7f, aware-v7 and d20-v7, and "the Stem arms" are stem, v7, v7nc, v7f, aware-v7 and d20-v7. "The wearing arms" are the Mug arms and the Stem arms. v6 and every v7 arm draw their pressures, line games and the creeper, except v7nc, which draws no creeper; v4 and v5 draw none of them.
- **The rate-0 control** (decision 11; `v7z` in the guard) is v7 with the full catalogue at `FRONT_LOOK_RATE` 0. Its die is thrown on every legal call and answers no, so it wears nothing and is not a wearing arm. It runs only on the flat league, at N0-head's rate-0 line and K4z.
- **The identities** are v4 `v4`, v5 `v5`, v6 `v6`, front0 `v7/front-0`, mug `v7/front-MUG`, stem `v7/front-STEM`, v7 `v7`, v7nc `v7/creeper-0`, v7f `v7` with `frontLookRateMock: 1` (benches only), the rate-0 control `v7` with `frontLookRateMock: 0` (game runs only), and on the leagues `v6`, `v7`, `v6/leash-20` and `v7/leash-20`.

| check | arms |
|---|---|
| H33's always-list, as 3.4's guard carries it: `extrasMismatch`, `poolMismatch`, `contestedMismatch`, `unblockedMismatch`, `extrasWithoutRoll`, `centreMissing`, `conceptMissing`, `chartTeamMismatch`, `knobLeak`, `crStatedMismatch`, `crEligibleNotStated`, `slideCheckMissing` | every arm |
| `rolledWithoutExtras` | 0 on v4–v6, front0, stem and the rate-0 control (a Stem shows no ghost, so no Stem-worn bluff rolls; line 584). On the Mug arms it is reported and must equal `bluffRolled`, and `rolledWithoutExtrasOffWorn`, `bluffRollUnpredicted` and `bluffRollMissing` (against a restatement of `picturesDecideAlike`) must be 0 |
| `shownRushMismatch` | 0 on v4–v6, front0 and the rate-0 control. On the wearing arms it is replaced by `frontTagWithoutDiff` and `diffWithoutFrontTag` (R28), which are also held at 0 on the rate-0 control |
| `adjPredMismatch`, `adjOnMissedRead`, `slideChecksOutsidePop`, `slideChecksOutsidePopNoK`, bench `sideEqPredOwnMismatch` | 0 off worn snaps |
| `adjPredPictureMismatch`, `slideChecksOutsidePopPicture` | 0 on every dropback of every arm. They restate the prediction from the stream's own picture, which on an unworn snap is the honest one, so they extend the line above to worn snaps |
| `keptInNamed`, `keptInMen` | every arm without `/keep-in` |
| 3.4's rows (lines 2058-2075), with v7 treated as v6: its creeper, line-game, `pressureUnnamed` and `hostUnresolved` rows (on the wearing arms `shownRushMismatch` is left to R28, above); its line rows, `lineGameOnMovedMan`, `lineGameOverDoubleA` and `lineGameOverSixPreventGL`, with `rLineAboveOne` (T34_LINES_ADDED); its drawn-pressure rows, `hostShareDrift` and `rsAboveOne`; `dimeCover1Called`; and T34_SELF's six self-checks, `gradedUnresolved`, `lineRateError`, `eligibleDefsDiffer`, `disguiseEchoMismatch`, `situationMissing` and `stemUnplaced` | the line rows on the arms that draw line games, the drawn-pressure rows on the arms that draw their pressures, `dimeCover1Called` on v4 and v5, and the rest on every arm |
| `wornOnIllegalCall`, `frontLookOnPreventGL`, `frontLookOverDoubleAZero`, `twoFrontLooks`, `frontLookOnCoverageLookMan`, `frontTagOrder`, `mugShownWrong` (H35's as-built picture, below), `stemShownWrong`, `stemCollides`, `stemOverDroppingLine`, `blitzDisguiseStamped`, `narrowLeak`, `pictureBandMismatch`, `answersMismatch`, `placedMismatch`, and `pb35.restateNotWorn`, with `pb35` present on every fold | every v7 arm |
| at HEAD35, `pb35`'s `legalityRestateMismatch` and `legalityError`, with `rateConstant` equal to 0.1 (1 on a bench whose header says `frontLookRateMock: 1`, 0 on the rate-0 control); `pb35` on every fold of a run or on none | every fold that carries `pb35`, any arm |
| `frontLookRateMismatch` (H35's count against collect's) | every HEAD35 game shard |
| `leashReads` | every arm at leash 50; lifted on d20 |
| the 10 SD gross stop on rule 5's counts | every wearing arm, game folds and bench folds; never v7f, which wears at rate 1, and never the rate-0 control, whose wear law is the exact 0 of the floors below |
| `tunablesDigest` other than `fnv1a:395a9ae2` | every arm |
| `frontLookRateMock` in a shard header (decision 11) | absent on every game run except the rate-0 control's two, N0-head's rate-0 line and K4z, where it must be 0 on every shard. On the bench: 1 on every {front0, v7} bench (K8f, K8b and N0-head's `n0h-benchf`, whose `v7` arm is v7f because of it), unless the fallback is filed; absent on K8 and on every other bench, the fallback's plain-v7 K8b (rule 8) included. Any other value, 0 on a bench included, stops |
| bench: `selfOk` equals the records; rule 4's and rule 19's counters; 3.4's arm-own checks (`leashStampMismatch`, `leashRolls` at 50, `brokeReads`, `n`) | bench, every arm the rule names |
| 3.4's base-scoped bench checks, now against base v6 | the totals must be 0 on front0. On mug, stem and v7 (K8) and v7f (K8f, K8b), every `K_offWorn` key and `recognitionMismatchBothRoll` must be 0, and `unaccountedMismatch` must be 0 on every snap. On v4 and v7nc each is reported only, because their calls differ from v6's by design |
| the per-game sums (decision 2), per shard and pair: Σᵢ of the `pg35` rows equals the pair's n, Σ and Σ² for every `/pg35Keys` key it carries; no other key; each `i` an integer with `i` mod shards = the shard; each key's games among `intGuard35.perGame`'s; those per-game rows sum to H and N; H.n + N.n = all.n; H is `fooled\|hot:diff` on interceptions | every bench pair |

- **The base-scoped comparisons are corrected and split.** 3.4's `callMismatch` and `mappedWhenNoAdjMismatch` stripped the option keys from the arm's call alone, which is right only on base v4. On base v6 the base's own call states `slideCheck`, so both would fire on front0 on every SLIDE snap. H35 strips both calls, or neither when the arm and the base state the same options; on base v4 the two forms are identical, so 3.4's lines keep their meaning. 3.4's base-scoped counters are one total per arm, so "off worn snaps" cannot be read from them; for each key K of 3.4's list H35 adds `K_offWorn`, counted only where the arm wears no front look, with its checked count, and `recognitionMismatchBothRoll`, counted only where both arms rolled, which is rule 4 item 6 under 3.4's name.
- **H35's restatement of §2.5's pictures** is written from this ADR's text and rule 16 and is not imported. Its Mug is rule 16's as built: the played entries in `rush` order, each verbatim except a rushing walked-up backer, re-spotted to the A gap, INTERIOR, on his own side; then the ghosts in `dutyList` order, at their run fits as rule 16 says. `mugShownWrong` counts a worn Mug whose `shownRush` differs from it on any of `shownRushDiffers`' fields. Its Stem is each rushing down lineman one spot toward X, clamped, every other rusher verbatim. At B35 it sizes v6's calls for `expected35`; at both trees it gives the checks above; at HEAD35 `pb35` cross-checks it against `legalFrontLooks` and `shownRushDiffers`. That cross-check's mix count, `pb35.frontLookMixMismatch`, is reported under rule 5 and stops nothing.

**Floors,** so that no check passes vacuously:
- on every wearing arm: worn > 0 and `fooled` > 0;
- on the Mug arms: `rolledWithoutExtras` > 0, `bluffRolled` > 0 and `mugGhost` > 0; on stem, `rolledWithoutExtras` is the exact 0 of the table above;
- on the Stem arms: `stemLive` > 0;
- rule 5's two conditional populations, so that counts 4–6 cannot pass on an SD of 0: `wornBothLegal` > 0 on the arms that wear both looks, and `balancedStemWorn` > 0 on the Stem arms, never on v7f or the rate-0 control (both exist by construction: v7 always has calls on which both looks are legal, and the 14 balanced four-man rows give every Stem arm balanced Stems);
- on every arm: the dropback count > 0, and `adjPredPictureMismatch`'s checked count equal to the arm's dropbacks;
- on front0: worn = 0;
- on the rate-0 control: worn dropbacks, worn calls and `fooled` = 0, and C3's `drawn` = 0 (no look drawn on any call), with some call legal (`anyLegal` > 0). `anyLegal` counts calls with a legal look; that the die was thrown on each of them is read from the code (`frozen.ts:819-822`, `frontLooks.ts:294`), not counted, because C3 counts drawn looks only;
- each rule 4 and rule 19 counter's checked count > 0 on the arms where its population exists by construction (rule 4), each `K_offWorn` key's checked count > 0, and the narrowing and decomposition checked counts > 0, on the full benches K8, K8f and K8b only. N0-head has three benches: `n0h-bench` and `n0h-benchf` hold 1,000 records a shard, as 3.4's N0 benches did, and `n0h-bench6` replays N0-base's 2-round v6 smoke (decision 12). There, and on every run of 2 rounds or fewer, only the dense floors of this list apply: worn, `fooled`, `rolledWithoutExtras`, `bluffRolled`, `mugGhost`, `stemLive`, `wornBothLegal`, `balancedStemWorn`, the dropback count, front0's worn = 0 and the rate-0 control's floor;
- on d20: `leashReads` > 0 and `brokeReads` > 0, with `brokeBelow30Slide` reported beside them (it is not floored).

**Stops added over the table,** each stricter than it and none reading a scored figure, listed so that no check outside the table is read as part of it:
- H35's own self-checks that `KEYS35.md` files as must-be-0: `startMissing`, `lookIdUnknown`, `hotIntNoInterceptor`, `coverageMaskedNeMasked`, `biteUnkeyed`, `runYardsMismatch` (game runs), and at HEAD35 `pb35.differsMismatch`;
- rule 5's exact `formationDropped` = 0 on every v7 fold, held non-vacuous by C3's `drawn` > 0 on the wearing arms (H35 zero-fills an absent diagnostic);
- 3.4's added stops, with v7 treated as v6: `creeperCalls` = 0 on the arms without the creeper and > 0 on the arms with it; `dimeCover1Called` > 0 on the arms that draw their pressures; `lineGamesOffHostable` = 0 on the arms that draw line games; 3.4's rule-7 gross stops at 10 SD (five-or-more pressures on host snaps, line games on hostable calls and creepers on eligible calls), each on the arms that draw it; and `callsChecked` > 0;
- on the bench, an arm whose caller and tunables are the base's own is held as front0 is: every base-scoped total 0;
- the decomposition's stream form, `decomp35.notIdentical` = 0;
- 3.4's structural checks: the harness is H35; the shards agree on the arm and the tree; `covAddedByArm` and `cfErrors` 0; `adjChecked` > 0; `creeperSnaps` 0 on the arms without the creeper; `sideOwnChecked` > 0 on the bench arms that state the options; the per-game rows number the games (twice the games on the leagues); and the bench's arm set and pairs have K8's or K8f's shape.

These tables are filed here. No check outside them is read as part of them.

**Stop rules** (the plan's §8, filed here).
- **N0 or a by-name proof fails:** stop. It is a build or harness defect; fix it and re-run from N0.
- **A bench base's `selfOk` is below its records:** stop.
- **A must-be-0 check is above 0 on an arm it applies to, a floor is not met, or a stop above fires:** stop. It is a caller, playbook or harness bug. `drive35.sh` stops at the first failure.
- **A rule 5 count misses by more than 10 SD:** stop and diagnose (rule 5).
- **An exact claim fails** (rules 2–5): stop and diagnose before set B. If the code is wrong, fix it and re-run from N0. If the code does what §2.5 and rule 16 say and this ADR's claim was wrong, record it as measured (line 737), note it toward rule 17, and continue.
- **If main moves during 3.5** (plan point 50), `origin/main` is merged into the branch, never rebased, so that every hash this step records stays in main's history: each shard's `/tree`, the ladder records, and the baselines' `engineCommit`, which is "the code that produced the numbers" (`packages/calibration/src/report/identity.ts:26-29`).
  - After the merge the pins are re-run on the merge commit, with P-D1 and P-D2 if C7 exists.
  - If `git diff --stat <old base> <new base> -- packages/engine packages/playbook/src packages/contracts/src packages/calibration/src/caller packages/calibration/src/metrics packages/calibration/src/league packages/calibration/src/harness packages/calibration/src/report` is empty, the references stand, and the K-runs' byte proofs confirm it at scale. Otherwise the references are re-taken and every K-run is re-run; if C7 exists, the ladders and the baselines are re-measured and committed again.
  - If the merge touches `packages/calibration/src/season`, P-D4 is re-run.
  - **Saves.** If main can resume a season from a file that does not record the resolved caller identity (PR #19's `--load` as posted at `d128829`, whose `SaveFile` records no caller), the move does not merge with it. Before C7 exists, C7 waits for E1. After C7 exists, W's hash is pushed as its own branch, the merge is offered at W with C7 and C8 left out, and the alternate card is sent (rule 17, Class C). The Save and load thread says it will make E1 before it asks to merge PR #19, so this is expected not to fire (INFERRED).

**The tools that compute them** (frozen in `FROZEN35.sha256`; `KEYS35.md` defines every key). Decisions 11, 12, 13 and 15 reached the tools through amendment 2 below: the rate-0 control (K4z and N0-head's rate-0 line), N0-head's declared bench line, the equivalence over v4, v5 and v6 with a base-v6 bench, and the aware cells' COMPUTED bite shares. Decision 20 (the analyzer's freeze) reached them through amendment 3.
- **H35's keys are append-only.** Every H34 key keeps its definition, so R0 against R3, and K-runs against R-runs, compare one way. Within one tree every caller writes the same key set. A HEAD35 shard's only extras over a B35 shard are `pb35` (`legalityRestateMismatch`, `legalityError`, `restateNotWorn`, `frontLookRateMismatch`, `frontLookMixH35`, `frontLookMixMismatch`, `rateConstant`, and `frontLookMixCollect` with the fixed keys MUG, STEM, UNNAMED and other) and C4's two fields, and on the rate-0 control's two runs the header's `frontLookRateMock` (0); a HEAD35 bench's extras are declared in `declare/tree-B35-HEAD35.bench.txt`. `pg35` and `intGuard35` are written on every bench pair, and the bench header carries `/pg35Keys`.
- **`proof35.py`.** Each proof line declares its extras from a list in `declare/`; a line fails if an undeclared path appears or a declared one is never seen. One-way mode skips `/seconds` and `/secondsSetup`. `--games-vs` compares game sha256s and event counts; `--expect differ` is the negative control; `--expect worn` is the exact control (a game differs from the reference if and only if its `worn` count is above 0, both ways, with the unworn direction's count reported); `--keys-equal` checks two shards write one key set; `--tree` and `--cross-tree` check and label trees, and both-ways mode is forbidden across trees; `--c4-zero` requires C4's two fields on every shard at their zeros; `--keys-scope h35` folds the open-keyed mix field; `--rate0`, on a both-ways game line only, requires `frontLookRateMock` 0 on every shard of the run and on no reference shard, and sets aside exactly `pb35`, collect's two front-look counts and that header key.
- **The proof lines.** The pins at every head: the stream rows equal by `cmp`, the batch rows equal one way with C3's and C4's declared extras, and at C7 and C8 only the `default` game row and the `default` batch row move, each to C7's `v7` row (P-D2). Then N0-base; R0 → R3, one way on H34's keys with H35's declared; R1 against 3.4's M1 with `--expect differ` (every game differs, INFERRED; reported, not a stop); N0-head; K4, K4z, K3, K1, K2, K12 and K13 as rules 2 and 3 say; K5, K6 and K7 against K3 with `--expect worn`; K8, K8f and K8b through the guard; CL1 and CL2 equal K1's and K7's games, and CL3 (the pair built with no version) equals K7's with its header naming `frozen-v7/v1`.
- **N0-head** (at HEAD35, with nothing else running): a 2-round `v7/front-0` smoke against a 2-round v6 smoke both ways and `--keys-equal`; the rate-0 `v7` smoke (decision 11), guarded with `--rate0` and equal to the 2-round v6 smoke both ways under `--rate0`, with its three negative controls (its guard without `--rate0`, v7's with it, and the line without it, each failing for its own reason); 2-round v4, v5 and v6 smokes one way against N0-base's, declaring `pb35` and C4's fields; 2-round mug, stem and v7 smokes with `--expect worn`; 2-round smokes of every v7 arm and both leagues through the guard; a bench at base v6 with arms `v4=v4;v6=v6` on N0-base's v6 smoke records, one way against N0-base's base-v6 bench under `declare/tree-B35-HEAD35.bench.txt` (decision 12); a 1,000-record bench on R3's records with K8's arms and a second with K8f's arms and the mock, which together must show `frontLookRateMock: 1` on the second only, `forcedUnwornLegal` 0, and `forcedEqV7OnWorn` 0 with its checked count equal to the first bench's v7 worn count; and v7's cost.
- **The analyzer** (`adr073-analyze35.py`) resolves per-game columns by name from each seed set's own column map, clusters by (seed set, `i`) and keeps a league game's two side rows in one cluster (decision 16), pools bench strata by summing n, Σ and Σ² (v7f over K8f and K8b; v7, mug, stem and v7nc over K8 alone), computes every rule of this block and states none, reads every proof line's JSON and every guard log, and refuses any cross-tree contrast not declared as one.
- **Freezing.** Every tool and list is hashed into `FROZEN35.sha256` before N0-base, and `freeze35.sh` keeps a copy of each frozen file by its sha256. The first freeze (`freeze35.sh --write --no-analyzer`) held 15 files, and N0-base passed on it (the attempt of 2026-10-22T08:06:17Z). Amendments 1, 2 and 3 below each rewrote it; the freeze in force when this block was committed is named under "The tools" above. Each earlier freeze is kept in `frozen-history/`, named by the time of the rewrite that replaced it, not by its own. A tool change after N0-base is a dated amendment under this heading; `FROZEN35` is rewritten and both N0 parts are re-run. `run35.sh` logs each run's H35 sha256, and each run step's STEP PASS line in `drive35.sh`'s log ends with it (`; H35 <sha>`, `; H34 <sha>` on R0). `H35_FILE`, an override, is used only by `r0-35.sh equiv`; the drive and the N0 parts unset it.
  - **The equivalence record.** At HEAD35 the drive refuses a reference written by another H35 unless `logs/equiv35.out` records `EQUIV35 PASS <old> -> <current>` in decision 13's form, `(2-round v4, v5 and v6 smokes, v6 with records, and a base-v6 bench …`, as its last line for that pair in that form; a line in the first equivalence's form carries nothing, and the analyzer reads the record the same way. Before amendment 2 that log held one PASS from before any reference (`6407181b` → `0e496b76`) and one deliberate FAIL, the negative control; neither concerned a reference. R1, R2v5, R3, R4 and R5 were written by H35 `570ea2b7…` (amendment 1), so they stand at HEAD35 only through amendment 2's `EQUIV35 PASS 570ea2b7… -> c6733c30… (2-round v4, v5 and v6 smokes, v6 with records, and a base-v6 bench …`.
  - **That record covers every reference's caller** (decision 13): `r0-35.sh equiv` runs 2-round v4, v5 and v6 smokes at B35 (v6 with records and a base-v6 bench) under the old and the new H35, each equal both ways, with key sets and records byte for byte. A reference stands on a tools change only through that record; a change to a key a reference wrote re-runs it.

**Before D and N0-head.** `pnpm verify` runs on this block as committed. D's scratch copy and N0-head's log both record its commit hash. If N0-head shows that a filed rule cannot be computed as written, it is amended by a dated note under this heading and recorded as a departure in W (line 1587's convention).

- *2026-10-22, amendment 1, before this block was committed (the tools; no scored rule changes).* The B35 drive stopped at R3's guard: `checks35.hotIntNoInterceptor` read 9, a must-be-0 check. The cause was in the harness, not the engine: H35 took the interceptor only from a `contested_catch` CHECK with band INTERCEPTION (`statline.ts:462-463`), and the engine has a second interception path, a tipped ball recovered by the defence (`passPlay.ts:1775-1777`), which the reducer credits through its fallback (`statline.ts:551-556`). H35 now credits a hot interception to the defensive tip recoverer when no contested catch names one. No key changed; the values of `hotIntNoInterceptor` and `hotIntIntoDropper` can change (the latter is 0 at B35, where nobody is shown rushing who drops). H35 went from `0e496b76…` to `570ea2b7…`; `FROZEN35` was rewritten at 2026-10-22T08:28:58Z, N0-base was re-run and passed, and the drive resumed at R3, which then passed its guard (2026-10-22T08:37:29Z) and its proof under the amended H35 (STEP PASS at 2026-10-22T08:37:32Z). R0 (H34) stands untouched, and no H35 reference had passed, so nothing is carried by the equivalence record. Rule 14's definition above is the amended one. Recorded as a departure in W.

  - **Its dated text.** `freeze35.sh --rewrite` wrote it into `FROZEN35`'s header (`REWRITTEN 2026-10-22T08:28:58Z`), and that freeze is kept as `frozen-history/FROZEN35.20261022T132139Z.sha256`. It is carried here verbatim:
    > 2026-10-22 amendment 1: R3's guard stopped on checks35.hotIntNoInterceptor = 9; H35 now credits a hot interception to a defensive tipped-ball recoverer when no contested catch names one, as the reducer does (statline.ts:551-556). Both N0 parts re-run; R3 onward re-run.

- *2026-10-22, amendment 2, before this block was committed (the tools of decisions 11, 12, 13 and 15; no scored rule changes).* Plan §18b's decisions 11, 12, 13 and 15 (2026-10-22 08:20Z) needed tools the first freeze did not hold. They were staged in `tools35/amend/stage` from about 08:31Z, while the B35 drive ran on the frozen tools in P35, and installed only after the drive ended (`DRIVE35 B35 DONE`, 2026-10-22T09:17:27Z), by `install-amend.sh` (`INSTALL PASS` at 2026-10-22T13:24:31Z), which rewrote `FROZEN35` with this dated text (`tools35/amend/AMEND.md` §6), carried here verbatim:
  > 2026-10-22 amendment 2 (the tools amendment of plan §18b decisions 11, 12, 13 and 15; tools35/amend/AMEND.md): H35 accepts ARM_FRONT_RATE_MOCK=0 in game mode for the rate-0 control (exactly v7, the full catalogue, HEAD35; header frontLookRateMock: 0; refused on the bench); guard35 --rate0 and its header rule (frontLookRateMock 0 only on n0h-rate0 and K4z, which are guarded with --rate0 only, where rateConstant is 0; 1 on the {front0, v7} benches K8f, K8b and N0-head's n0h-benchf, absent on K8b under the filed fallback; absent on K8 and on every other run); proof35 --rate0, and a rate-0 run refused as a reference; drive35 K4z after K4, and an R-run carried only by an EQUIV35 PASS in decision 13's form; r0-35 N0-head's rate-0 line and declared bench line, and equiv over v4, v5 and v6 smokes and a base-v6 bench; expected35 the aware cells' analytic bite shares COMPUTED from the formula, re-run on R3 and R5 into expected35-amend2.json. H35 570ea2b71067 -> c6733c30f89e; the R-runs are carried by r0-35.sh equiv; both N0 parts re-run.
  - **Decision 11.** H35 accepts `ARM_FRONT_RATE_MOCK=0` in game mode for the rate-0 control alone (`v7` with the full catalogue, at HEAD35), whose header carries `frontLookRateMock: 0`. It refuses the mock at 0 on the bench, reading decision 11's "as well as in bench mode" as the bench's existing mock of 1. The guard gains `--rate0` and its header rule: `frontLookRateMock` is 0 only on N0-head's rate-0 line (`n0h-rate0`) and K4z, which are guarded with `--rate0` and only with it, and there `rateConstant` is 0; it is 1 on every {front0, v7} bench, K8f, K8b and N0-head's `n0h-benchf` (whose `v7` arm is v7f because of it); it is absent on K8b under the filed fallback (rule 8), on K8 and on every other run. The rate-0 control's floor is the one after rule 18: `anyLegal` > 0 counts calls with a legal look, and that the die was thrown on each of them is read from the code (`frozen.ts:819-822`, `frontLooks.ts:294`), not counted. `proof35.py` gains `--rate0` and refuses a rate-0 run as a `--numbers` or `--games-vs` reference (exit 2). `drive35.sh` runs K4z after K4. K4z is never a reference and never scored.
  - **Decisions 12 and 13.** `r0-35.sh` gains N0-head's declared bench line, and its equivalence runs 2-round v4, v5 and v6 smokes (v6 with records) and a base-v6 bench under the old and the new H35. The drive carries an R-run across a tools change only through an `EQUIV35 PASS <its H35> -> <current H35>` line in decision 13's form, `(2-round v4, v5 and v6 smokes, v6 with records, and a base-v6 bench …`; a line in the first equivalence's form carries nothing.
  - **Decision 15.** `expected35.py` prints the aware cells' STANDARD bite shares, COMPUTED from the recognition formula, beside the flat share from R3.
  - **No existing key changed.** Every existing caller and mode writes the key set and values it wrote before; only the rate-0 control's game header adds `frontLookRateMock`.
  - **The hashes.** Amendment 2 changed 7 of the freeze's 15 files: H35 (`adr073Arm35.test.ts`) from `570ea2b7…` to `c6733c30…`, `drive35.sh` from `1f2ce307…` to `91786c34…`, `expected35.py` from `8ab08b59…` to `a979eeb6…`, `freeze35.sh` from `70e0230f…` to `4dd966b9…`, `guard35.py` from `b526cfc2…` to `34422898…`, `proof35.py` from `8f351be2…` to `9d058a1a…` and `r0-35.sh` from `17c633f3…` to `da2d70f8…`; the other 8 lines are unchanged. `freeze35.sh` changed only in a comment and in the obligation it prints when H35 changes, which now names decision 13's form of the equivalence. `FROZEN35` was rewritten at 2026-10-22T13:21:39Z, with 15 files; that freeze is kept as `frozen-history/FROZEN35.20261022T145840Z.sha256`.
  - **The references.** `r0-35.sh equiv` recorded `EQUIV35 PASS 570ea2b7… -> c6733c30… (2-round v4, v5 and v6 smokes, v6 with records, and a base-v6 bench …)` (2026-10-22T13:23:15Z), in decision 13's form, which carries R1, R2v5, R3, R4 and R5. R0 (H34) stands untouched. N0-base was re-run and passed (2026-10-22T13:24:28Z).
  - **The figures.** The install's step 6 ran the installed `expected35.py` on R3's and R5's shards with the drive's own arguments into `expected35-amend2.json` (exit 0), the file named under "The expected values" above. That file is the source of this block's COMPUTED figures. The drive's own `expected35.json`, written by `8ab08b59…`, has no `awareComputed` and is not cited for them; it equals the source on every value this block reads but the aware cells, the tool's sha256 and the check count (the sentence under "The expected values").
  - Recorded as a departure in W.

- *2026-10-22, amendment 3, before this block was committed (the analyzer, decision 20; no scored rule changes).* Plan §18b's decision 20 freezes the analyzer before any HEAD35 output exists. `adr073-analyze35.py` (sha256 `485416e2…`) was copied into P35 unchanged and taken into `FROZEN35` by `freeze35.sh --rewrite`, which rewrote it at 2026-10-22T14:58:40Z with this dated text, carried here verbatim:
  > 2026-10-22T14:58:40Z amendment 3 (plan §18b decision 20): the analyzer adr073-analyze35.py 485416e24ad0 is frozen before any HEAD35 output exists; no run tool changed (H35 c6733c30 unchanged, so no equivalence); N0-base re-run.
  - **What changed.** The freeze gained one line, the analyzer's, and holds 16 files. H35 (`c6733c30…`), `expected35.py` (`a979eeb6…`) and the other 13 lines are unchanged, so no run tool changed, no equivalence was needed, and every reference stands as amendment 2 left it. The analyzer imports only Python's standard library, so no other file joined the freeze. Amendment 2's freeze is kept as `frozen-history/FROZEN35.20261022T145840Z.sha256`.
  - **N0-base** was re-run on the new freeze and passed (the attempt of 2026-10-22T14:59:01Z, `N0-base: PASS` at 15:00:11Z), and its 16 `N0 TOOL` lines are the freeze's. N0-head has not run; it runs at HEAD35 on this freeze.
  - **The frozen analyzer**, run on the B35 outputs (`--preset b35`), names itself as the freeze's and reads them as it did before the freeze.
  - Recorded as a departure in W.

- *2026-10-22, amendment 4, after this block was committed and before any arm (plan §18b decisions 21–24, and the analyzer; no COMPUTED figure changes).* Plan §18b's decisions 21–24 are the Orchestrator's rulings on four points this block was committed without, and on three of its readings; they carry no time. The review of this block's rules found four gaps: this block read a failing exact claim two ways, as a rule 17 trigger (line 2707) and as a defect (lines 2736 and 2786), while the tools then frozen computed a third, a stop under which rule 17 reads NOT DECIDED; the analyzer then frozen (`485416e2…`, amendment 3) read a `ch:slide` of 2 or more snaps all in one game as INCOMPLETE, against decision 19's sentence (line 2720); rule 13 filed no reading for a bench verdict whose per-game SE is missing or whose SEs are both 0, which that analyzer read INCOMPLETE; and rule 17 did not say when it is itself read. The commit left those four to the Orchestrator, with the three readings it filed where the plan's text was silent or loose. Each decision below first gives the ruling as plan §18b words it, with this block's line numbers added, and then, under "Read here as", what this amendment reads from it. "§8" here, as in decision 21 and in the table's heading (line 2736), is the plan's §8, filed above as the stop rules (line 2785), not this ADR's own §8 (line 1041).
  - **Decision 21: the controls, and a failing exact claim.** Rule 2's by-name lines (K3, K1, K2, K12 and K13, and CL1–CL3 at C7), the rate-0 control K4z and the `--expect worn` lines (lines 2800-2801) are controls: a failure there is always a build or harness defect (a §8 stop: fix it and re-run from N0, line 2786), and never a rule 17 input. An exact claim of rules 3–5 that fails, or a must-be-0 check that stops, first stops the runs for diagnosis (§8). If the diagnosis finds a defect, it is fixed and the runs re-run from N0, and nothing reaches rule 17. If it finds that the code does what §2.5 and rule 16 say and this ADR's claim was wrong, a dated amendment under this heading records the claim as measured (the check, its count and the runs it read) and lifts that one check for the remaining runs. The same amendment gives the analyzer that reading as FALSIFIED, by a freeze rewrite and N0-base again, before the analyzer's verdict is read. That FALSIFIED claim is a Class C trigger. Read here as:
    - **The rate-0 control** is both of its lines, N0-head's rate-0 line and K4z (lines 2492 and 2738). Neither is one of rule 3's claims (line 2524), and N0-head's line is also an N0 line (line 2786).
    - **Rules 3–5.** Line 2707's trigger is read on rules 3–5, and so is line 2790's "An exact claim fails (rules 2–5)". A rule 2 line that fails is a defect (line 2786) and is never recorded as measured.
    - **A must-be-0 check's stop** (line 2788) is read as an exact claim's is (line 2790): stop and diagnose.
    - **The FALSIFIED claim** is line 2716's "a defect-free exact claim fails", and line 2790's "record it as measured … and continue" is done by that amendment. Line 2718's "An exact claim of rule 5 that fails is a Class C trigger above" is read the same way: a failing claim of rule 5 is a §8 stop until such an amendment records it, and a Class C trigger after.
  - **The table's heading** (line 2736) is edited in place by this amendment, as decision 21's last sentence rules. It read "any one above 0 stops the runs as a defect", and now reads "any one above 0 stops the runs for diagnosis (§8)", in the plan's words; its "§8" is the stop rules at line 2785. No other line above is edited, so lines 2608, 2707, 2716, 2718, 2790, 2797 and 2803 are read with this amendment, as it says below.
  - **The record, as built.** The analyzer reads it from `asmeasured35.json` in P35, whose entries have exactly the fields claim, check, count, runs and amendment. The file is absent, so no exact claim is recorded as measured.
    - **It is outside the freeze.** The file is data. `freeze35.sh --list` names no `.json` and no run tool reads it, so `FROZEN35` does not hold it, and the analyzer checks only that an entry's `amendment` field holds a date, not that the amendment or its freeze rewrite exists. So the amendment that writes the file carries the file's sha256 and its bytes verbatim, as amendments 1–4 carry their dated text, and does decision 21's freeze rewrite and N0-base again, with dated text that names that sha256. A file that no such amendment carries is not a record under decision 21, whatever the analyzer prints.
    - **What it refuses.** An entry is refused if it names a control, or a check that is not one of the claims of rules 3–5 (rule 19's `coverageReadOnHonestWorn` among them), and a refused entry's check stays a defect. A must-be-0 check outside rules 3–5 that is found to be a wrong claim is recorded only by an amendment that also extends the analyzer's list of claims (a freeze rewrite and N0-base again); it is then a Class C trigger, as decision 21 says. Until then it stays a defect, and rule 17 reads NOT DECIDED.
    - **Its count.** An entry's count must equal the analyzer's own count of that check on the runs it names. A refused entry, an unreadable file, an entry that names a run not loaded, and a count that differs from the analyzer's are each an input not read, so rule 17 reads NOT DECIDED even when nothing else fails.
    - **Its reach.** On a run that is not a control, a guard STOP whose every line is lifted reads AS MEASURED, and a lifted proof line reads "as measured". The run tools lift nothing: `guard35.py` still stops on a recorded check and `drive35.sh` halts there, so lifting a check in the drive is a tool change after N0-base (line 2803).
    - **The harness's own forms.** Four failures that the analyzer then frozen read as failing exact claims are now harness defects (§8 stops) that no entry lifts, as decision 21 rules for a defect: `front0Exact`'s checked count, worn count, `vsBase` or arm not as built; an `exact35` counter that is missing; `forcedEqV7OnWorn`'s checked count not equal to K8's v7 worn count (filed with item 15, line 2546); and a `frontLookRateMismatch` that is not a number. Their rows still read FALSIFIED, and rule 17 reads NOT DECIDED. If a diagnosis found one of them a wrong claim, it would be recorded as a check outside the analyzer's list is, above.
  - **Decision 22: degenerate bench SEs.** Rule 13's sign rule (line 2678) uses the larger of the per-snap and the per-game clustered SE (decision 2). Where the clustered SE cannot be computed, because the stratum has fewer than 2 game clusters, the per-snap SE alone is used. Where the SE used is 0, a zero mean reads NOT SHOWN and a nonzero mean reads by its sign, because z is infinite. A stratum with fewer than 2 snaps reads NOT SHOWN. So no bench verdict, and no `ch:slide` reading (decision 19), is INCOMPLETE for want of an SE. Read here as:
    - **A `ch:slide` of 2 or more snaps in one game** reads on its per-snap SE.
    - **Rule 12's L** (lines 2667-2668) is read the same way: at an SE of 0 the guard fails exactly when L < 0, and with fewer than 2 snaps, H and N together, it does not fail.
    - **As built,** a verdict key with no per-game cells at all has no per-game sums to read, a missing input, and reads INCOMPLETE. On a correct harness every verdict key is in `/pg35Keys`, and one the pool never wrote has 0 snaps and reads NOT SHOWN.
  - **Decision 23: when rule 17 is read.** Once, after every run, guard and proof line of the HEAD35 drive is in, read and PASS (or recorded as measured under decision 21), with no §8 stop outstanding. Before that it reads NOT DECIDED. An unread or missing input is NOT DECIDED, never a class. Read here as:
    - **No case is left without a class** (line 2718) once every input is in.
    - **The order.** The analyzer reads, in order: a defect, NOT DECIDED (a §8 stop); an input not read, NOT DECIDED; a Class C trigger, Class C; a Class P trigger, Class P; else NOT FIRED. A failing exact claim is no longer a trigger of its own (lines 2707, 2716 and 2718); one recorded as measured is.
    - **R2 left unread by rule 8.** R2a and R2b, left unread by rule 8's preconditions (line 2608) because a precondition failed only through claims recorded as measured, are not inputs left unread: those claims are Class C triggers, and Class C wins whatever R2 reads.
    - **The save trigger** (line 2713) can fire only after C7 exists, and C7 comes after the HEAD35 drive and W (the plan's commit order). At a reading made before C7 it is false by construction, because before C7 exists C7 waits for E1 and no card is sent (line 2795). A save found after C7 exists takes that line's own path, which sends the alternate card (Class C). "Once" is the plan's word and stands.
  - **Decision 24: three readings stand as filed.** In the fallback, every bench figure read on v7f over K8f + K8b is read on v7 − front0 over K8 + K8b (rule 8, line 2605); "every arm" includes the league arms aware-v6, aware-v7, d20-v6 and d20-v7 (line 2737); and rule 19's rows are reported rows, with no band count per population at game level (line 2696).
  - **The analyzer.** Decisions 21–23 reached the analyzer and no other tool, so lines 2797 and 2803 read with this amendment added: decisions 21–23 reached the tools through amendment 4, which also rewrote the freeze. `adr073-analyze35.py` went from `485416e2…` to `550a0aea…`, and `freeze35.sh --rewrite` rewrote `FROZEN35` at 2026-10-22T17:02:35Z with this dated text, carried here verbatim:
    > 2026-10-22T17:02:35Z amendment 4 (plan §18b decisions 21-23): the analyzer adr073-analyze35.py 485416e24ad0 -> 550a0aea2f96 reads degenerate SEs by decision 22, reads rule 17 only when every HEAD35 input is in (decision 23), and reads /tmp/claude-0/-home-claude-football-franchise/6c81441b-6f64-5504-9ead-dcff7a2b1f80/scratchpad/arms073/p35/asmeasured35.json (absent) by decision 21; no run tool changed (H35 c6733c30), so no equivalence; N0-base re-run.
  - **Its path.** The dated text names the record by its full path in the session's scratch copy of P35, the only such path in this block. It is P35's `asmeasured35.json`, the record above.
  - **What changed.** Only the analyzer's line. The freeze holds 16 files, and H35 (`c6733c30…`), `expected35.py` (`a979eeb6…`) and the other 13 lines are unchanged, so no run tool changed, no equivalence was needed, and every reference stands as amendment 2 left it. Amendment 3's freeze is kept as `frozen-history/FROZEN35.20261022T170235Z.sha256`.
  - **N0-base** was re-run on the new freeze and passed (the attempt of 2026-10-22T17:02:49Z, `N0-base: PASS` at 17:03:57Z), and its 16 `N0 TOOL` lines are the freeze's. N0-head has not run; it runs at HEAD35 on this freeze.
  - **The analyzer now frozen** (`550a0aea…`), run on the B35 outputs (`--preset b35`), names itself as the freeze's, and every row's verdict is as before. Rule 17 reads NOT DECIDED (decision 23), where it read INCOMPLETE, because no HEAD35 output exists.
  - Recorded as a departure in W.

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
