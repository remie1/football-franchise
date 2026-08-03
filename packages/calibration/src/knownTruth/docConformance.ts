/**
 * THE DOC-CONFORMANCE REGISTER — every numeric cell in `Tunables`, classified against the section of
 * `docs/design/match-engine.md` it claims to implement.
 *
 * ================== WHY THIS EXISTS, AND WHY A SWEEP CANNOT REPLACE IT ==================
 *
 * ADR-036 removed `tippedBall.qualityBands.DEAD.finalTargetNumber = 0`. That cell was not a tuning
 * choice and it was not wrong on any scale: §12.2 gives every *live* band a Final TN and gives
 * `DEAD` a **sentence** — *"DEAD BALL (no recovery possible)"*. **The table demanded a number where
 * the doc had prose, and a number appeared.** It was published on 163 plays.
 *
 * A sensitivity sweep reports such a cell as inert and moves on; a scale check reports it as
 * in-range. **Only reading the cell against the doc finds it.** So the finding instrument is a
 * READING, and what a machine can contribute is not the reading but its COMPLETENESS: this module
 * walks the committed `DEFAULT_TUNABLES` and asserts that **every numeric leaf is classified**, so a
 * cell added tomorrow cannot enter the tree unread.
 *
 * ================== WHAT THIS ELIMINATES AND WHAT IT MERELY BOUNDS (Charter §4.1) ==================
 *
 * **ELIMINATED:** an unclassified numeric leaf. `assertRegisterTotal` walks the tree and fails on any
 * leaf no rule matches, and on any rule no leaf matches. Both directions, so the register cannot go
 * stale in either — a deleted cell reddens as a dead rule, exactly as `attributeUsage.ts` asserts set
 * equality rather than containment.
 *
 * **ALSO ELIMINATED, AS OF ADR-047 — a `RULED_*` status that has stopped describing the engine.**
 * `auditFindingRulings` re-applies every ruled value as a no-op `applyTunablePatch` and reddens on
 * a landed ruling whose cell has moved, on a `RULED_OWED` finding whose cells have all landed, and
 * on a `cells` list that disagrees with the values pinned beside it. It exists because **this file
 * is where Charter §4.1's inverted audit priority was proved**: the `contestedMaxOpenness` type pin
 * drifted and `pnpm typecheck` went red, while this register drifted and said three false things
 * authoritatively — that SA-08's engine change was unimplemented after it had landed, the
 * superseded first ruling rather than the re-ruled column, and that the compiler would not complain
 * about a compiler that had. **Nothing compiles against a register, so nothing caught it.**
 *
 * **NOT ELIMINATED, AND THIS IS THE IMPORTANT HALF:** whether a classification is *correct*, and
 * whether a ruled VALUE is the right one. Each rule is a hand-authored claim about what the design
 * document says, and Charter §4.1 records that in this repo **hand-enumerated lists have been wrong
 * every single time they have been checked**. The completeness is machine-checked; the readings are
 * not, and they must be re-read rather than inherited. Where a reading is load-bearing it cites the
 * doc line so the next reader can falsify it in one lookup rather than re-deriving it.
 *
 * **ALSO ELIMINATED, AS OF ADR-048 — a CATCH-ALL RULE QUIETLY ACQUIRING A CELL IT WAS NOT WRITTEN
 * ABOUT.** `blockRuleAbsorption` pins the cell SET every trailing-`*` rule owns, attributed to that
 * rule. ADR-048 added seven `route.contestGain.*` cells; the catch-all `route.*` (*"Openness clamps
 * at §8.4's 0-100 scale"*) matched all seven, `unclassified` stayed empty, `deadRules` stayed empty
 * and **the totality gate stayed green while carrying a note false of every one of them**. The
 * count and the path digest DID redden — ADR-041's pair working — but they redden for the whole
 * tree at once and name no rule, so the remedy they invite is *re-record*, and re-recording re-reads
 * nothing. **A catch-all cannot go stale by CHANGING; it goes stale by ABSORBING, and it reports an
 * absorbed cell as `classified`, which is indistinguishable from `correctly classified`.**
 *
 * **AND ONE THING NOTHING HERE REACHES: the register's PROSE.** Every `note`, `headline` and
 * `ruling` string below is zero-enforcement and maximum-authority — the shape §4.1 calls the
 * extreme case. The pins make a stale VALUE loud; a stale SENTENCE beside a correct value is still
 * invisible, and the only instrument for it is a reading.
 *
 * The register is deliberately NOT a claim that a `DOC_VERBATIM` cell is *right*. §7.2's amendment
 * and §14.4's raw speed term are both cells the engine transcribed perfectly from a doc that was
 * wrong. Conformance and correctness are different questions and this file answers only the first.
 *
 * ================== THE VOCABULARY, AND THE TWO FAILURE DIRECTIONS IT SEPARATES ==================
 *
 * Both directions are proven in this project and they need different fixes:
 *
 *   - **§7.2's amendment** — the doc said something *wrong* and the engine transcribed it
 *     faithfully. The fix is a doc amendment. Such cells are `DOC_VERBATIM`; the register does not
 *     flag them, because they conform. They are found by football argument, not by reading.
 *   - **ADR-036** — the doc said **nothing** and the engine transcribed a number anyway. The fix is
 *     to remove the cell. These are `TABLE_SHAPE`, and finding them is what this register is for.
 *
 * A third direction appears below and had no name: **the doc said something and the table has no
 * cell for it at all** (`SILENT_OMISSION`). §7.1's *"Tie: slight pressure, −5 to QB accuracy if all
 * matchups are ties"*, §10.2's *"−5 to catch"* / *"+10 to catch"* and §10.4's *"Off platform
 * (moving): −15"* are all doc modifiers with no tunable, no resolver and no declared absence. They
 * cannot be found by walking the tree — **there is nothing there to walk** — so they are registered
 * as `MISSING_CELLS` beside the tree rather than inside it, and the register's totality assertion
 * says nothing about them. That is stated here rather than discovered: an instrument that walks a
 * table is structurally blind to a row that was never written.
 */
import { DEFAULT_TUNABLES, applyTunablePatch, type Tunables } from "@ff/engine";

// ---------------------------------------------------------------------------
// THE WALK
// ---------------------------------------------------------------------------

export interface NumericLeaf {
  readonly path: string;
  readonly value: number;
}

/**
 * Every numeric leaf of a tunables tree, in tree order.
 *
 * Numbers only. Strings are attribute ids and closed vocabularies (`attrs.ts`'s load-time sweep and
 * `satisfies CheckKind` already guard those, and a string carries no scale); booleans are switches
 * rather than magnitudes. **Both exclusions are declared here and counted by `leafCensus`** so that
 * "the register covers the tunables" cannot quietly mean "covers the part it chose to look at" —
 * Charter §4.1's implicit-coverage corollary applied to this file's own scope.
 *
 * ⚠ **AND THE EXCLUSION HAS A COST THIS FILE NOW KNOWS THE SIZE OF (ADR-041, backlog 51).** SA-13's
 * *worse half* — the one that made a touch pass harder to deflect than a bullet — was not a number
 * at all. It was `angleByThrowType`, a **string-valued mapping** from throw type onto §10.3's angle
 * column, and this register is structurally blind to it: the numeric angle values were verbatim and
 * correct, and the defect was entirely in which of them got selected. The register's only contact
 * with that table was its contribution to a string COUNT. Closing the gap means classifying string
 * leaves against the doc the same way, which is a reading and not a count; it is backlog 51.
 */
export function numericLeaves(tunables: Tunables = DEFAULT_TUNABLES): readonly NumericLeaf[] {
  const out: NumericLeaf[] = [];
  const walk = (node: unknown, path: string): void => {
    if (typeof node === "number") {
      out.push({ path, value: node });
      return;
    }
    if (!isPlainContainer(node)) return;
    for (const key of Object.keys(node as Record<string, unknown>)) {
      walk((node as Record<string, unknown>)[key], path === "" ? key : `${path}.${key}`);
    }
  };
  walk(tunables, "");
  return out;
}

export interface LeafCensus {
  readonly numbers: number;
  /**
   * REPORTED, NOT PINNED — see `docConformance.test.ts`'s census block for the argument. The
   * register classifies no string and no boolean, so their cardinality is a fact about a population
   * this file has declared out of scope, not a denominator for any claim it makes.
   */
  readonly strings: number;
  readonly booleans: number;
  /**
   * ⚠ THE TYPOLOGY'S OWN COMPLETENESS. Paths of leaves the walk REACHED and could not put in any of
   * the three buckets — `undefined`, `null`, a function, a `bigint`, a `Map`, a `Date`. MUST be
   * empty, and it is asserted rather than assumed because the old `else if` chain **dropped them
   * silently**: a subtree that stopped being a plain object would have vanished from every count
   * with nothing to show for it. This is the derived form of "the walk did not quietly narrow" —
   * it fails at a PATH, by name, instead of as an integer that no longer matches.
   */
  readonly untyped: readonly string[];
}

/** The whole leaf population, by type, so the register's denominator is visible. */
export function leafCensus(tunables: Tunables = DEFAULT_TUNABLES): LeafCensus {
  let numbers = 0;
  let strings = 0;
  let booleans = 0;
  const untyped: string[] = [];
  const walk = (node: unknown, path: string): void => {
    if (typeof node === "number") numbers += 1;
    else if (typeof node === "string") strings += 1;
    else if (typeof node === "boolean") booleans += 1;
    else if (isPlainContainer(node)) {
      for (const key of Object.keys(node as Record<string, unknown>)) {
        walk((node as Record<string, unknown>)[key], path === "" ? key : `${path}.${key}`);
      }
    } else untyped.push(path === "" ? "<root>" : path);
  };
  walk(tunables, "");
  return { numbers, strings, booleans, untyped };
}

/**
 * A container the walk may descend into: a plain object or an array, and nothing else.
 *
 * `typeof node === "object" && node !== null` was the old test and it is too wide in one direction
 * and too narrow in the other — it descends into a `Map` (whose entries `Object.keys` cannot see, so
 * the subtree silently disappears) and it treats `null` as an object (so a nulled cell vanishes
 * rather than reporting). Both are the same failure: a leaf that leaves the census without saying so.
 */
function isPlainContainer(node: unknown): boolean {
  if (typeof node !== "object" || node === null) return false;
  if (Array.isArray(node)) return true;
  const proto: unknown = Object.getPrototypeOf(node);
  return proto === Object.prototype || proto === null;
}

/** Every numeric leaf PATH, sorted — the register's subject as a set rather than as a count. */
export function numericLeafPaths(tunables: Tunables = DEFAULT_TUNABLES): readonly string[] {
  return numericLeaves(tunables)
    .map((l) => l.path)
    .sort();
}

/**
 * FNV-1a over the sorted numeric leaf paths.
 *
 * ⚠ **WHY A CARDINALITY WAS NOT ENOUGH, AND ADR-040 IS THE PROOF.** The census pinned `numbers:
 * 699`. ADR-040 removed `qb.awarenessVariance.d20Offset` and added `qb.awarenessVariance.baseHalfWidth`
 * in the same dispatch — **a net change of zero.** Both sit under the block rule
 * `qb.awarenessVariance.*`, so `unclassified` stayed empty and `deadRules` stayed empty too, and a
 * cell that did not exist yesterday entered the tree already wearing a `DOC_VERBATIM` classification
 * written about a different cell. Nothing reddened. A count cannot see a swap; a path set can.
 */
export function numericLeafPathDigest(tunables: Tunables = DEFAULT_TUNABLES): string {
  let h = 0x811c9dc5;
  for (const path of numericLeafPaths(tunables)) {
    for (let i = 0; i < path.length; i++) {
      h ^= path.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= 0x0a;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fnv1a:${h.toString(16).padStart(8, "0")}`;
}

// ---------------------------------------------------------------------------
// THE VOCABULARY
// ---------------------------------------------------------------------------

export type Provenance =
  /** The number appears in the doc, on this scale, for this cell. */
  | "DOC_VERBATIM"
  /**
   * An arithmetic consequence of a doc number rather than the number itself: `minMargin: -19`
   * encoding *"DL wins by 1-19"*, `minMargin: 41` encoding *"Roll > TN + 40"*. Conforming, and
   * distinguished from `DOC_VERBATIM` because the encoding is a place a transcription can go wrong
   * off by one without any value looking odd.
   */
  | "DOC_DERIVED"
  /**
   * The doc's number with its UNIT resolved. The doc labels its tick timeline in seconds (§2.1
   * *"Tick 1.5: MID-PROGRESSION"*) while §7.4, §8.7, §9.1 and §9.2 write durations in *ticks*, and a
   * tick is 0.5s. §7.4 carries an authoring correction saying the unit is seconds; the others do
   * not, and the engine resolved all of them the same way. **A silent unit resolution is a decision,
   * so it is labelled rather than filed under `DOC_VERBATIM`.**
   */
  | "DOC_UNIT_RESOLVED"
  /**
   * The doc gives a QUALITY and the engine gives a number. A declared knob. Conforming — the doc
   * asked for a judgement and one was made in the open.
   */
  | "INTERPRETATION"
  /** The doc has no rule here at all. An engine constant filling a gap (§16's sack yardage, the game loop). */
  | "DOC_GAP"
  /**
   * ⚠ **THE HUNT.** The cell exists because the TABLE's shape demanded one, not because the DOC
   * specified one. ADR-036's `DEAD.finalTargetNumber` is the ratified instance. These are invisible
   * to a scale check and inert to a sweep.
   */
  | "TABLE_SHAPE"
  /**
   * Engine bookkeeping with no doc counterpart and no football content: severity ranks, unreachable
   * sentinels, clamps that exist to stop a patched table producing a negative duration.
   */
  | "STRUCTURAL"
  /** Declared invention en bloc — the game loop, which `match-engine.md` does not specify at all. */
  | "OUT_OF_SCOPE"
  /**
   * ✅ **RATIFIED CONVENTION** (owner, July 2026), and the two REFUSALS below are the reason it was
   * ratified rather than an existing value stretched — in particular `INTERPRETATION`, which the
   * register already had and which would have swallowed this cell. Mirrors `docs/design/match-engine.md`
   * §7.1's `DERIVED MECHANIC` marker (CALIBRATION-BACKLOG entry 73), which was itself introduced by
   * the same discipline this entry follows: survey every existing value, state why each does not
   * fit, propose one new value rather than stretch an old one, and flag it as proposed pending
   * ratification.
   *
   * **THE SURVEY** (each of the other eight, and why none of them is honest here):
   *  - `DOC_VERBATIM` — no. The doc's "two consecutive reps" prose is a RECORD of a derivation, not
   *    that derivation's source; reading it as `DOC_VERBATIM` would have the doc cite the engine
   *    citing the doc, the exact trap `route.contestGain.burstSteps` above names by name.
   *  - `DOC_DERIVED` — no. That category is a re-encoding of ONE already-stated doc number for THE
   *    SAME quantity (`minMargin: -19` restating "1-19"). This cell's value is not a restatement of
   *    anything the doc says about itself; it is a NEW number computed from the relationship between
   *    TWO OTHER, DIFFERENT already-ratified cells (`recoverySecondsByBand.BLOCKER_CONTAINS` and
   *    `minTravelSeconds`), corroborated by a second, non-arithmetic structural argument (the model's
   *    one-tick memory depth). Widening `DOC_DERIVED` to cover that would blur the very distinction
   *    its own definition draws — an encoding of a stated number is a different risk from a value with
   *    no stated number to encode.
   *  - `DOC_UNIT_RESOLVED` — no. There is no unit ambiguity here; the doc's number and the engine's
   *    number are not the same quantity in different units, there is no doc number at all.
   *  - `INTERPRETATION` — no, and this is the closest miss, so it gets the longest answer.
   *    `INTERPRETATION` is a declared KNOB — "the doc asked for a judgement and one was made in the
   *    open." The doc's own words about THIS parameter are the opposite of that: "nobody chose it,"
   *    "re-litigated by moving either anchor." A judgement call is re-argued on the football; this
   *    parameter is re-derived by moving a cited number. Those are different failure modes and this
   *    vocabulary has needed to tell them apart before (`qb.awarenessVariance.baseHalfWidth` is
   *    `DOC_DERIVED` rather than `INTERPRETATION` for a related reason). Filing a "nobody chose it"
   *    cell as a knob would make the note false of the one thing the doc went out of its way to say.
   *  - `DOC_GAP` — no. `DOC_GAP` is "the doc has no rule here at all," and its own examples are
   *    content-free engine bookkeeping (sack yardage, the game loop). The doc does not stay silent
   *    here — §7.1 carries a dedicated, ratified, multi-paragraph note about this exact cell. The gap
   *    that justified building the mechanic at all (§7.1's "That is a missing mechanic, not a
   *    calibration knob") was closed by the same dispatch that added the note; nothing about this
   *    cell is unaddressed by the document any more.
   *  - `TABLE_SHAPE` — no. `TABLE_SHAPE` is a cell a table's RECTANGLE demanded where the doc gave
   *    nothing (ADR-036's `DEAD.finalTargetNumber`). This is not filler; the value is independently
   *    over-determined by two converging anchors, which is the opposite of arbitrary.
   *  - `STRUCTURAL` — no. `STRUCTURAL` is bookkeeping with "no football content." This cell is
   *    entirely football content — it is the retirement rule for a live pass-rush threat.
   *  - `OUT_OF_SCOPE` — no. Nothing about this parameter is invented outside the document's remit;
   *    §7.1 is exactly where a rusher's threat status is specified.
   *
   * **THE CATEGORY.** The cell's parent MECHANIC's existence is an OWNER RULING, cited beside the
   * cell (`CALIBRATION-BACKLOG` entry 73, *"ruled on the football, regardless of price"*). The cell's
   * VALUE is not — it is forced by two independent already-ratified anchors elsewhere in the same
   * tree, and the doc states plainly that nobody chose it. Re-litigated by moving either cited
   * anchor, never by re-reading a quoted number (there is none) and never by a football argument
   * alone (that argument re-opens only the ruling half, which is cited separately for exactly this
   * reason).
   *
   * ⚠ **THE NEXT CELL OF THIS SHAPE — an owner-ruled mechanic whose parameter is independently
   * derived rather than chosen — REUSES THIS VALUE rather than inventing a fifth.** That instruction
   * is what stops the vocabulary fragmenting, and mirrors the doc's own invitation for its next
   * `DERIVED MECHANIC` case to reuse its heading.
   *
   * ✅ **FOLLOWED (July 2026, CALIBRATION-BACKLOG entry 76).** `arrival.pressureWithinSeconds`
   * re-surveyed and landed here rather than fragmenting the vocabulary — see its own rule's
   * block comment for the full re-survey. The union stayed at eight values plus this one.
   */
  | "DERIVED_MECHANIC"
  /**
   * ✅ **RATIFIED CONVENTION** (owner, August 2026). **The reason it was ratified rather than an
   * existing value stretched is the GUARD AGAINST THE CLOSEST MISS**: `DERIVED_MECHANIC` requires
   * BOTH a ruled existence AND a magnitude reached by two independent structural facts converging.
   * ⛔ **Only the existence half is true here** — `tunables.ts` states the magnitude was *deliberately
   * not* so reached and logs it as **owed** — so asserting `DERIVED_MECHANIC` **would claim a
   * derivation that does not exist.**
   *
   * ⚠ **And the naming is load-bearing, not cosmetic: two vocabularies with different words for the
   * same fact is the RESTATED-CONSTANT FAMILY ARRIVING AT NOMENCLATURE.**
   * Named to MATCH, verbatim, the marker `packages/engine/src/tunables.ts`'s `scramble.accuracyModifier`
   * / `scramble.readCapacityDelta` comment coins for itself — `RULED, NOT DERIVED` — rather than
   * inventing a differently-spelled synonym for the same fact in the two vocabularies that both have
   * to describe it.
   *
   * **THE SURVEY** (each of the other nine, and why none is honest for
   * `scramble.accuracyModifier` / `scramble.readCapacityDelta`, ADR-055 §6 / CALIBRATION-BACKLOG
   * entry 84):
   *  - `DOC_VERBATIM` — no. Neither number appears in the doc for this cell, or for any cell.
   *  - `DOC_DERIVED` — no. Not a re-encoding of ONE already-stated doc number for THIS quantity —
   *    there is no doc number here to re-encode.
   *  - `DOC_UNIT_RESOLVED` — no. No unit ambiguity; there is no doc number in any unit to resolve.
   *  - `INTERPRETATION` — no, and this is the closest miss, so it gets the longest answer, as it did
   *    for `DERIVED_MECHANIC` and for this same discipline at entries 73 and 76. `INTERPRETATION` is
   *    a declared KNOB — "the doc asked for a judgement and one was made in the open." §8.8 does not
   *    ask for a throw-accuracy judgement at all; its only stated penalty during a scramble is on the
   *    READ (`visionConeByDepthClass`, already classified separately, above). And the MAGNITUDE was
   *    not "made" as a free knob — `tunables.ts`'s own comment says the two numbers are "the smallest
   *    claim available that is not false," carried from `pocket.accuracyModifier.PRESSURE` /
   *    `pocket.readCapacityDelta.PRESSURE` while explicitly refusing to assert anything new about
   *    magnitude. A knob turned in the open and a value carried while declining to assert are
   *    different epistemic acts, the same distinction `INTERPRETATION`'s rejection drew for entry 76.
   *  - `DOC_GAP` — no. `DOC_GAP`'s own examples are content-free bookkeeping (sack yardage, the game
   *    loop). This cell is entirely football content — a throw-accuracy and read-capacity penalty on
   *    a live §8.8 mechanic — and its EXISTENCE carries a dedicated, ratified argument (ADR-055 §6,
   *    closing backlog entry 84's flagged question), so nothing about it is unaddressed the way
   *    `DOC_GAP`'s silence is.
   *  - `TABLE_SHAPE` — no. No table's rectangle demanded this cell; nothing here is filler forced by a
   *    fixed row count.
   *  - `STRUCTURAL` — no. Not bookkeeping with "no football content" — the opposite: ADR-055 §6 ruled
   *    on football grounds that a pursued passer's throw IS less accurate than a clean one.
   *  - `OUT_OF_SCOPE` — no. Not invented outside the document's remit; §8.8 is exactly where scramble
   *    behaviour belongs, and this is the throw side of the same drill the READ side already occupies.
   *  - `DERIVED_MECHANIC` — no, and THIS IS THE ONE TO GUARD AGAINST BY NAME, because it is the
   *    closest-shaped existing value and asserting it would be false. `DERIVED_MECHANIC` requires
   *    BOTH halves answerable: existence ruled on football grounds AND magnitude reached by two
   *    independent structural facts converging (entry 73's arithmetic-plus-structural pair; entry
   *    76's width-replication). Only the first half is true here. `tunables.ts`'s own comment is
   *    explicit that the magnitude is "DELIBERATELY NOT... this number... reached by two independent
   *    structural facts converging" and is logged as OWED a derivation, not holding one. Filing this
   *    `DERIVED_MECHANIC` would assert a derivation that does not exist — the wrong answer named so
   *    the next reader does not reach for it out of vocabulary-fatigue.
   *
   * **THE CATEGORY**, mirroring `tunables.ts`'s own two-half table exactly: EXISTENCE (that a
   * scrambling passer's throw carries a penalty at all) is ⚖️ **OWNER RULING** (ADR-055 §6, closing
   * backlog entry 84), re-litigated only by a football argument to the owner. MAGNITUDE (the specific
   * −10 / −1) is ⚠ **PROVISIONAL — CARRIED, NOT DERIVED**, borrowed from `pocket.*.PRESSURE` as the
   * smallest non-false claim available, re-litigated only by an actual derivation (the
   * `DERIVED_MECHANIC` bar) or a fresh football argument — never by re-reading a quoted doc number,
   * because there is none.
   *
   * ⚠ **THE NEXT CELL OF THIS SHAPE — an owner-ruled mechanic whose magnitude is carried rather than
   * derived or chosen — REUSES THIS VALUE**, per the same instruction `DERIVED_MECHANIC`'s comment
   * carries and per this file's own header ("state what you rejected... the next reader will
   * otherwise re-derive the same dead ends").
   */
  | "RULED_NOT_DERIVED"
  /**
   * ✅ **RATIFIED CONVENTION** (owner, August 2026), added on the OWNER'S OWN DIRECTION rather than by
   * an existing value stretched: *"If the register has no provenance value meaning 'nobody ever
   * justified this,' that is the finding. A scheme missing that box cannot record the answer nobody
   * wanted."* CALIBRATION-BACKLOG entry 111's archaeology — full-repo `git log -S` on the identifier,
   * the introducing commit's full message, every commit touching it in `docs/`, every ADR/backlog
   * entry those point to, **READ-ONLY** — found `arrival.immediateWithinSeconds` (`0.0`) and
   * `arrival.collapsingWithinSeconds` (`1.0`) had **NEITHER a derivation NOR a ruling, anywhere,
   * ever.** Only a shared descriptive comment survives, and it is about what the three-rung LADDER
   * MEANS (arrived / about to arrive / still real pressure), never about why these two NUMBERS. The
   * word **NEITHER** is entry 111's own — its heading is *"NEITHER, THREE TIMES"* — not invented for
   * this comment.
   *
   * **THE SURVEY** (each of the other nine, and why none is honest for either cell):
   *  - `DOC_VERBATIM` — no. Neither number appears in the doc for this cell, or for any cell; §7.2's
   *    own KNOWN ISSUE box says the doc has no arrival model at all.
   *  - `DOC_DERIVED` — no. Not a re-encoding of ONE already-stated doc number for THIS quantity — there
   *    is no doc number here to re-encode, and (unlike `arrival.pressureWithinSeconds`, which genuinely
   *    re-encodes THESE two cells) no other already-committed cell computes either of these two either.
   *  - `DOC_UNIT_RESOLVED` — no. No unit ambiguity; there is no doc number in any unit to resolve.
   *  - `INTERPRETATION` — no, and this is the closest miss, so it gets the longest answer, as it has at
   *    every prior addition to this union. `INTERPRETATION` is a declared KNOB — "the doc asked for a
   *    judgement and one was made **in the open**." Entry 111's exhaustive search found no such
   *    declaration for either cell: no comment framing `0.0` or `1.0` as a chosen value, no sweep run
   *    to justify the choice (a sweep DOES exist for `collapsingWithinSeconds` — entry 81 — and entry
   *    81 says of ITSELF that it tests the lever's INERTNESS against `pressure_rate`, never why `1.0`
   *    rather than `0.8`), nothing. Filing these as `INTERPRETATION` would assert an act — a judgement,
   *    made in the open — that the exhaustive search found never happened. A judgement nobody can
   *    point to is not a knob quietly turned; it is the thing this value exists to name instead.
   *  - `DOC_GAP` — no, and this is the SECOND-closest miss: `arrival.*`'s own catch-all note is shaped
   *    exactly like `DOC_GAP`'s definition (*"the doc has no rule here at all"*). But `DOC_GAP`'s own
   *    examples are content-free engine bookkeeping (§16's sack yardage, the game loop) — filler where
   *    any reasonable number serves the same structural role equally well. These two cells are NOT
   *    content-free: `0.0` and `1.0` are the boundaries of a football distinction (arrived / about to
   *    arrive), and ADR-058 has since made `collapsingWithinSeconds` the SOLE determinant of whether a
   *    won INTERIOR rep floors `COLLAPSING` or `PRESSURE` — football content with a live consequence,
   *    not bookkeeping.
   *  - `TABLE_SHAPE` — no. Not a cell a table's rectangle demanded where the doc gave nothing; there is
   *    no table here, only two scalar horizons.
   *  - `STRUCTURAL` — no. Not bookkeeping with "no football content" — the opposite, per the `DOC_GAP`
   *    rejection immediately above.
   *  - `OUT_OF_SCOPE` — no. Nothing about these cells is invented outside the document's remit; §7.2 is
   *    exactly where the arrival channel belongs, and the doc simply never reached it (its own KNOWN
   *    ISSUE box says so).
   *  - `DERIVED_MECHANIC` — no. That value requires BOTH an owner-ruled EXISTENCE and a magnitude
   *    reached by two independent structural facts converging. Entry 111 found neither half for either
   *    cell: no ruling naming these two magnitudes, and — for `collapsingWithinSeconds` — a SWEEP
   *    exists but a sweep tests inertness, which is not the same claim as structural convergence on a
   *    value. Contrast `arrival.pressureWithinSeconds`, which genuinely has both halves (entry 76's
   *    ruling; width-replication off THESE two cells) — which is exactly why ITS derivation chains off
   *    two anchors that are themselves unjustified (see that rule's amended note).
   *  - `RULED_NOT_DERIVED` — no, and this is the closest-shaped existing value, so it is named
   *    explicitly. `RULED_NOT_DERIVED` requires the EXISTENCE half to be true — an owner ruling that
   *    the mechanic should exist at all (ADR-055 §6, for `scramble.accuracyModifier`), with only the
   *    MAGNITUDE left underived. Entry 111 found NEITHER half here for either cell: no owner ruling
   *    was ever made about either magnitude, and no derivation reaches it either. Asserting
   *    `RULED_NOT_DERIVED` would overclaim the EXISTENCE half a `RULED_NOT_DERIVED` cell is required to
   *    have; that overclaim is why this is a DIFFERENT value and not a re-use of that one.
   *
   * **THE CATEGORY.** Neither half of the two-half table `DERIVED_MECHANIC` and `RULED_NOT_DERIVED`
   * both use is answerable here: EXISTENCE was never argued by an owner ruling, and MAGNITUDE was
   * never reached by a derivation, a sweep (entry 81's sweep tests inertness, not magnitude), or a
   * declared interpretation. What exists is a comment describing the CONCEPT the ladder encodes, not a
   * reason for these two NUMBERS. Re-litigated the only way anything genuinely unjustified can be — by
   * an owner ruling that supplies one from scratch — and that obligation is sharper for
   * `collapsingWithinSeconds` now that ADR-058 has made it load-bearing rather than cosmetic.
   *
   * ⚠ **WHAT THE VALUE ASSERTS, AND WHAT IT DOES NOT.** The value asserts **NOT FOUND**, not **DOES
   * NOT EXIST.** Entry 111's archaeology (full-repo `git log -S` per identifier, the introducing
   * commit's full message, every commit touching them in `docs/`, and every ADR/backlog entry those
   * point to) is a record of an exhaustive search coming up empty at a point in time — it is not, and
   * cannot be, a proof that no justification exists anywhere or could ever be produced.
   * **If someone later locates one, the correct move is to RECLASSIFY WITH A CITATION — not to argue
   * the marker was wrong.** A later find does not retroactively make entry 111's search dishonest; it
   * makes the classification STALE, and staleness and dishonesty call for different remedies — the
   * former is fixed by re-reading and re-filing the one cell, the latter would call the whole scheme
   * into question. This distinction belongs in the comment rather than left implicit because the
   * failure mode is silent otherwise: a reader who finds a justification years from now, with no note
   * telling them what the marker did and did not claim, has every reason to conclude the marking
   * scheme was unreliable — when what actually happened is the scheme working exactly as designed,
   * recording an honest search's result and standing ready to be superseded by a better one. **A
   * provenance marker that cannot be safely superseded will instead be quietly ignored**, which
   * defeats the marker more thoroughly than an occasional stale cell ever could.
   *
   * ⚠ **THE NEXT CELL OF THIS SHAPE — a magnitude with no derivation, no sweep, and no ruling behind
   * it, discovered only by exhaustive archaeology rather than assumed — REUSES THIS VALUE** rather than
   * inventing an eleventh, per the same instruction every value in this union has carried since
   * `DERIVED_MECHANIC`.
   */
  | "NEITHER_RULED_NOR_DERIVED";

export interface RegisterRule {
  /**
   * A dotted path glob. `*` matches exactly one segment; a TRAILING `*` matches one or more
   * segments, so `game.*` covers the whole block and `release.bands.*.delaySeconds` covers one
   * column across every row. First match wins, so rules are ordered narrow → broad and a
   * single-cell exception is simply listed above its block.
   */
  readonly pattern: string;
  readonly provenance: Provenance;
  /** The doc section this cell claims to implement, or `null` where the doc is silent by design. */
  readonly docRef: string | null;
  readonly note: string;
  /** Set where this dispatch recorded a finding against the cell. Keys into `SCALE_AUDIT_FINDINGS`. */
  readonly finding?: string;
}

function matches(rule: RegisterRule, path: string): boolean {
  const p = rule.pattern.split(".");
  const s = path.split(".");
  const trailing = p[p.length - 1] === "*";
  const fixed = trailing ? p.length - 1 : p.length;
  if (trailing ? s.length <= fixed : s.length !== fixed) return false;
  for (let i = 0; i < fixed; i++) {
    if (p[i] !== "*" && p[i] !== s[i]) return false;
  }
  return true;
}

export function classify(path: string): RegisterRule | undefined {
  return classifyIn(REGISTER, path);
}

/**
 * The same lookup against an ARBITRARY rule list.
 *
 * It exists so `blockRuleAbsorption`'s failing case can be the ADR-048 defect itself — the register
 * as it stood, with the catch-all in place — rather than a description of it. Charter §4.1: an
 * instrument with no failing case is not yet an instrument.
 */
export function classifyIn(
  register: readonly RegisterRule[],
  path: string,
): RegisterRule | undefined {
  return register.find((rule) => matches(rule, path));
}

// ---------------------------------------------------------------------------
// THE REGISTER
// ---------------------------------------------------------------------------

/**
 * Ordered narrow → broad. Every entry is a claim about the design document, checkable in one lookup.
 *
 * The block rules (`x.*`) are the honest unit where a whole block shares one provenance: §12.2's
 * eight base target numbers are one transcription, not eight decisions. Where a single cell inside a
 * block differs it is listed ABOVE its block rule, which is the only reason the order matters.
 */
export const REGISTER: readonly RegisterRule[] = [
  // ---- §1 / engine-wide vocabulary -------------------------------------------------------------
  {
    pattern: "resultTierLadder.*",
    provenance: "STRUCTURAL",
    docRef: null,
    note:
      "The doc has no universal margin ladder; every check carries its own result table. This is " +
      "engine vocabulary (contracts `ResultTier`) and is the referent ADR-033 used to place " +
      "`passRush.bands`' new interior boundary at 5.",
  },
  {
    pattern: "traitBonuses.*",
    provenance: "DOC_VERBATIM",
    docRef: "Appendix B",
    note:
      "All eight match Appendix B's trait table exactly (Press Specialist +15, Shutdown +10, Route " +
      "Technician +10, Reliable Hands +10, Ball Hawk +15, Quick Twitch +10, Brick Wall +10, Pocket " +
      "Awareness +10). Checked cell by cell.",
  },

  // ---- §2.1 clock ------------------------------------------------------------------------------
  {
    pattern: "clock.maxTick",
    provenance: "DOC_GAP",
    docRef: "§2.1",
    note:
      "§2.1's timeline ends at '3.0+: BREAKDOWN' with no stop. 6.0s is the engine's hard stop so a " +
      "play cannot fail to terminate. No doc counterpart.",
  },
  {
    pattern: "clock.*",
    provenance: "DOC_VERBATIM",
    docRef: "§2.1",
    note: "0.5s ticks, first tick 0.5 — the doc's grid.",
  },

  // ---- §3 grid ---------------------------------------------------------------------------------
  {
    pattern: "zoneModel.verticalUpperYards.*",
    provenance: "DOC_VERBATIM",
    docRef: "§3.2",
    note:
      "SHORT 0-10, INTERMEDIATE 10-20, DEEP 20-35 as inclusive upper bounds. Verbatim. ⚠ The " +
      "FOURTH cell is `BACKFIELD: 0`, which §3.2's list does not contain — the depth ladder needs a " +
      "floor below SHORT and 0 is where the line of scrimmage is, so it is entailed by the scale " +
      "rather than demanded by the column. Named here because the earlier note listed three cells " +
      "for a rule that absorbs four, which is the ADR-048 shape in miniature.",
  },

  // ---- §5.3 blitz recognition ------------------------------------------------------------------
  {
    pattern: "presnap.blitzRecognition.disguise.*",
    provenance: "DOC_VERBATIM",
    docRef: "§5.3",
    note: "Standard +0, zone blitz +15, delayed +20, 0-blitz +25. Verbatim.",
  },
  {
    pattern: "presnap.blitzRecognition.target",
    provenance: "DOC_VERBATIM",
    docRef: "§5.3 / Appendix C",
    note: "50, and Appendix C's 'Blitz recognition | 50 | +0-25 (disguise)' agrees with §5.3.",
  },
  {
    pattern: "presnap.blitzRecognition.bands.0.minMargin",
    provenance: "INTERPRETATION",
    docRef: "§5.3",
    note:
      "§5.3 states two outcomes, SUCCESS and FAILURE, split at margin 0. READ_IT's +20 and FOOLED's " +
      "−20 subdivide them so the stream can say how well he saw it; only `recognized` is consumed, " +
      "so these two boundaries move a published LABEL and nothing else. Declared in tunables.",
  },
  {
    pattern: "presnap.blitzRecognition.bands.3.minMargin",
    provenance: "STRUCTURAL",
    docRef: "§5.3",
    note: "−∞ terminator.",
  },
  {
    pattern: "presnap.blitzRecognition.bands.2.minMargin",
    provenance: "INTERPRETATION",
    docRef: "§5.3",
    note: "See bands.0 — the FOOLED/MISSED boundary is the same subdivision.",
  },
  {
    pattern: "presnap.blitzRecognition.bands.1.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§5.3",
    note: "0 — the doc's own SUCCESS/FAILURE split.",
  },
  {
    pattern: "presnap.blitzRecognition.attrDivisor",
    provenance: "DOC_VERBATIM",
    docRef: "§5.3 / §1.3",
    note: "QB Awareness ÷5 + Centre Awareness ÷5.",
  },

  // ---- §7.1 pass rush --------------------------------------------------------------------------
  {
    pattern: "passRush.blockerStructuralAdvantage",
    provenance: "INTERPRETATION",
    docRef: "§7.1 KNOWN ISSUE",
    note:
      "0 since ADR-028, coupled to the `anchor` blocker term. The doc's own KNOWN ISSUE box names " +
      "it. Not a doc number in either direction.",
  },
  {
    pattern: "passRush.counterMoveAfterStalemate",
    provenance: "DOC_VERBATIM",
    docRef: "§7.1",
    note: "'Counter move: +15 if previous tick was stalemate'.",
  },
  {
    pattern: "passRush.bands.*",
    provenance: "DOC_DERIVED",
    docRef: "§7.1 as amended (ADR-033)",
    note:
      "15 / 5 / 1 / 0 / −14 / −∞ encode the doc's amended six-row table. −14 encodes 'blocker wins " +
      "by 1-14' and −∞ 'blocker wins by 15+'. The interior 5 is the amendment's own, argued in the " +
      "doc's ADR-033 note.",
  },
  {
    pattern: "passRush.pressureProgressByBand.*",
    provenance: "INTERPRETATION",
    docRef: "§7.2",
    note:
      "§7.2 describes statuses qualitatively and gives no counter. The per-band deltas are the " +
      "engine's mechanism for producing them; declared in tunables.",
  },
  {
    pattern: "passRush.repJitter.*",
    provenance: "NEITHER_RULED_NOR_DERIVED",
    docRef: "§7.1 (ADR-059)",
    note:
      "`divisor: 4` — the per-tick jitter magnitude around the `pass_rush_rep` latent " +
      "(`resolvePassRushTick` draws two unmodded d100s and divides their difference by this). " +
      "BORROWED-FROM-AN-UNREPRODUCED-EXTERNAL-ARM IS NOT A DERIVATION: the figure is external " +
      "cold-read §5's '±d100diff÷4', an 80-game arm run on a patched clone this tree has never " +
      "run, carried in unchanged rather than re-derived. Not `INTERPRETATION` — nobody judged " +
      "this cell in the open; it was inherited, and asserting a judgement that did not happen " +
      "would be the dishonest reading `INTERPRETATION` exists to distinguish from. ADR-059 " +
      "ratifies STRUCTURE only ('rep once + per-tick jitter') and explicitly refuses to ratify " +
      "this magnitude; re-litigated only by EXT-4's own sweep on this tree, never by feel.",
  },
  {
    pattern: "passRush.*",
    provenance: "DOC_VERBATIM",
    docRef: "§7.1 / §1.3",
    note: "The two ÷5 divisors.",
  },

  // ---- §7.3 stunts -----------------------------------------------------------------------------
  {
    pattern: "stunt.complexity.*",
    provenance: "DOC_VERBATIM",
    docRef: "§7.3",
    note: "T/E +0, T/T +10, delayed +15, triple +25. Verbatim.",
  },
  {
    pattern: "stunt.target",
    provenance: "DOC_VERBATIM",
    docRef: "§7.3",
    note:
      "§7.3 says 60. ⚠ Appendix C's own row for this check says 'Communication | 40-50 | +10-25 " +
      "(noise)'. The doc contradicts itself by 10-20 points on the base and the engine took §7.3. " +
      "See finding SA-02.",
    finding: "SA-02",
  },
  {
    pattern: "stunt.bands.1.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§7.3",
    note: "0 — the doc's pass/fail split ('If OL passes check' / 'If OL fails check').",
  },
  {
    pattern: "stunt.bands.3.minMargin",
    provenance: "STRUCTURAL",
    docRef: "§7.3",
    note: "−∞ terminator.",
  },
  {
    pattern: "stunt.bands.0.minMargin",
    provenance: "INTERPRETATION",
    docRef: "§7.3",
    note: "§7.3 is binary; +20 subdivides a pass into clean and ordinary. Consumed only via arrival delay.",
  },
  {
    pattern: "stunt.bands.2.minMargin",
    provenance: "INTERPRETATION",
    docRef: "§7.3",
    note: "−19 subdivides a failure into late exchange and clean miss.",
  },
  {
    pattern: "stunt.bands.*.arrivalDelaySeconds",
    provenance: "INTERPRETATION",
    docRef: "§7.3",
    note: "§7.3 gives the looper 'an unblocked rush at QB' and no time. Declared in tunables.",
  },
  {
    pattern: "stunt.looperArrivalSeconds",
    provenance: "INTERPRETATION",
    docRef: "§7.3",
    note: "As above — a loop is a longer path than a straight blitz. Declared.",
  },
  {
    pattern: "stunt.attrDivisor",
    provenance: "DOC_VERBATIM",
    docRef: "§7.3 / §1.3",
    note: "Centre Awareness ÷5 + adjacent OL Awareness ÷5.",
  },

  // ---- §7.4 blitz pickup -----------------------------------------------------------------------
  {
    pattern: "blitzPickup.freeRunnerArrivalSeconds",
    provenance: "DOC_UNIT_RESOLVED",
    docRef: "§7.4 step 4 + its AUTHORING CORRECTION",
    note:
      "The doc said '~1.5 ticks', which at 0.5s/tick is 0.75s and beats every route in the game. " +
      "The doc carries an authoring correction changing the UNIT to seconds; the VALUE is recorded " +
      "there as unratified. This is the one unit ambiguity the doc resolved on the record.",
  },
  {
    pattern: "blitzPickup.recognitionModifier.*",
    provenance: "INTERPRETATION",
    docRef: "§5.3 / §7.4 step 1",
    note: "§5.3's 'protection adjusted' as a ±10 modifier rather than a gate. Declared.",
  },
  {
    pattern: "blitzPickup.freeRunnerPath.*",
    provenance: "INTERPRETATION",
    docRef: "§7.4 step 4",
    note:
      "ADR-030/031. The doc contains no table here at all; every number is invented structure and " +
      "the tunables comment says so in capitals.",
  },
  {
    pattern: "blitzPickup.bands.1.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§7.4 step 3",
    note: "0 — 'if picked up' versus not.",
  },
  {
    pattern: "blitzPickup.bands.3.minMargin",
    provenance: "STRUCTURAL",
    docRef: "§7.4",
    note: "−∞ terminator.",
  },
  {
    pattern: "blitzPickup.bands.*",
    provenance: "INTERPRETATION",
    docRef: "§7.4 step 3",
    note:
      "§7.4 step 3 states one opposed roll and no result table. The four-row split and its arrival " +
      "delays are engine structure.",
  },
  {
    pattern: "blitzPickup.*",
    provenance: "DOC_VERBATIM",
    docRef: "§7.4 step 3 / §1.3",
    note: "RB/TE Pass Block ÷5 vs Blitzer Pass Rush ÷5.",
  },

  // ---- §7.2 arrival ----------------------------------------------------------------------------
  /**
   * ⚠ RE-SURVEYED (July 2026, CALIBRATION-BACKLOG entry 76). The previous entry here — `POS_INF`
   * under `INTERPRETATION`, "narrowing it is an open football question both ADR-030 and ADR-031
   * declined" — is now FALSE ON BOTH HALVES. The horizon is no longer `POS_INF` (it is `2.0`,
   * `packages/engine/src/tunables.ts`'s `pressureWithinSeconds: 2.0`), and narrowing it is no
   * longer undecided: `docs/design/match-engine.md` §7.2's `DERIVED MECHANIC` block is an OWNER
   * RULING, the SECOND use of that heading (the first is §7.1's, CALIBRATION-BACKLOG entry 73,
   * cited below at `arrival.containRetiresAfterConsecutiveContains`). Re-surveyed with the same
   * discipline entry 73's cell got — every other category read and rejected in turn, not just the
   * newest one reached for.
   *
   * **THE SURVEY** (each of the other eight, and why none of them is honest here):
   *  - `DOC_VERBATIM` — no. `2.0` appears nowhere in the doc as a number for this cell; §7.2's block
   *    explicitly frames it as DERIVED against two OTHER cells, not transcribed from prose.
   *  - `DOC_DERIVED` — no, and this is the closest miss for the same reason it was entry 73's:
   *    `DOC_DERIVED` re-encodes ONE already-stated doc number for THE SAME quantity (`minMargin:
   *    -19` restating "1-19"). This cell's `2.0` is not a restatement of anything the doc says about
   *    `pressureWithinSeconds` itself — it is a NEW number computed from the relationship between
   *    TWO OTHER, DIFFERENT cells one width over (`immediateWithinSeconds` 0.0 and
   *    `collapsingWithinSeconds` 1.0: width 1.0, replicated once — `1.0 + 1.0 = 2.0`). ⚠ **NAMED
   *    PRECISELY, NOT "ALREADY-RATIFIED"**: CALIBRATION-BACKLOG entry 111 found those two anchors
   *    themselves carry NO ruling and NO derivation of their own (`NEITHER_RULED_NOR_DERIVED` — see
   *    their own rules, above the `arrival.*` catch-all) — the arithmetic here is sound ON the two
   *    numbers AS COMMITTED, but it inherits no justification for why those two numbers are `0.0` and
   *    `1.0` in the first place. Widening `DOC_DERIVED` to cover an inter-cell derivation would blur
   *    the distinction its own definition draws, exactly as entry 73's survey found for its own cell.
   *  - `DOC_UNIT_RESOLVED` — no. No unit ambiguity: the doc states no number for this quantity in
   *    any unit for this cell to resolve.
   *  - `INTERPRETATION` — no, and this is the classification being CORRECTED, so it gets the
   *    longest answer. `INTERPRETATION` is a declared KNOB — "the doc asked for a judgement and one
   *    was made in the open." §7.2's `DERIVED MECHANIC` block says the opposite of that about the
   *    VALUE half in so many words: "DERIVED — nobody chose it," re-litigated "by moving either
   *    anchor," never by football argument alone. The PREVIOUS note here ("narrowing it is an open
   *    football question... declined") described a knob nobody had turned yet; the ruling closed
   *    that door on the EXISTENCE half (a football argument, entry 76, "the same reasoning as
   *    ADR-032's amendment, one channel over") and the VALUE half was never a knob to begin with —
   *    it was derived the moment the existence question was settled, off two cells that already
   *    existed. A judgement call is re-argued on the football; this parameter's value is re-derived
   *    by moving a cited anchor. Filing it as a knob would make the note false of the one thing the
   *    doc went out of its way to say about it.
   *  - `DOC_GAP` — no. The doc does not stay silent here — §7.2 carries a dedicated, ratified,
   *    multi-paragraph `DERIVED MECHANIC` note naming this exact parameter, with a two-half table
   *    separating what is ruled from what is derived. Nothing about this cell is unaddressed.
   *  - `TABLE_SHAPE` — no. Not a cell a table's rectangle demanded where the doc gave nothing; the
   *    value is independently over-determined by two converging, already-ratified anchors, which is
   *    the opposite of arbitrary filler.
   *  - `STRUCTURAL` — no. Entirely football content — it is the boundary past which a travelling
   *    rusher is close enough to affect the throw, the same rung this section already ranks.
   *  - `OUT_OF_SCOPE` — no. §7.2 is exactly where the arrival channel's pressure classification is
   *    specified; nothing about this parameter is invented outside the document's remit.
   *
   * **THE CATEGORY.** `DERIVED_MECHANIC`, reused rather than a fourth value invented — per its own
   * comment's instruction ("the next cell of this shape... reuses this value") and per §7.2's own
   * block explicitly naming itself the marker's SECOND use. The cell's EXISTENCE (a horizon at all,
   * as opposed to `POS_INF`'s "any live threat, at any distance") is an OWNER RULING —
   * CALIBRATION-BACKLOG entry 76, the same football reasoning ADR-032's band-map amendment used one
   * channel over. The cell's VALUE (`2.0`) is not — it is forced by two other cells elsewhere in the
   * same tree (`immediateWithinSeconds`, `collapsingWithinSeconds`), and the doc states plainly
   * nobody chose it. ⚠ **THOSE TWO CELLS ARE NOT "ALREADY-RATIFIED"** — CALIBRATION-BACKLOG entry
   * 111's archaeology found neither a ruling nor a derivation behind either one (see their own
   * rules, `NEITHER_RULED_NOR_DERIVED`), so this derivation is an arithmetic fact ABOUT two committed
   * numbers, not a claim that those numbers were themselves earned. Re-litigated by moving either
   * cited anchor, never by a football argument alone (that argument re-opens only the ruling half,
   * cited separately) — and moving either anchor now also means moving a value entry 111 found
   * nobody has ever justified.
   *
   * ⚠ **MANUFACTURING A CATEGORY TO DEMONSTRATE RIGOUR WOULD BE THE FOURTH SHAPE ARRIVING AT A
   * VOCABULARY, NOT THE THIRD.** `DERIVED_MECHANIC` is taken here because the survey above finds it
   * fits — an owner-ruled mechanic whose parameter is independently derived rather than chosen — not
   * because it is the newest value in the union.
   */
  {
    pattern: "arrival.pressureWithinSeconds",
    provenance: "DERIVED_MECHANIC",
    docRef: "§7.2 DERIVED MECHANIC (CALIBRATION-BACKLOG entry 76)",
    note:
      "§7.2's `DERIVED MECHANIC` note has two separately-cited halves and this cell inherits both. " +
      "THAT THE ARRIVAL CHANNEL GETS A FINITE HORIZON AT ALL is an OWNER RULING — CALIBRATION-" +
      "BACKLOG entry 76, the same reasoning as ADR-032's amendment above, one channel over: a " +
      "threshold so wide the classification carries no information is not a pressure model, it is a " +
      "presence model. THAT THE VALUE IS 2.0 is DERIVED, not chosen: `immediateWithinSeconds` (0.0) " +
      "and `collapsingWithinSeconds` (1.0) fix the horizon's own width at 1.0, and PRESSURE sits one " +
      "more of that same width beyond COLLAPSING (1.0 + 1.0 = 2.0) — replicating the interval once " +
      "rather than inventing a new one, landing on the engine's own 0.5s tick quantum without " +
      "rounding. ⚠ THOSE TWO ANCHORS ARE THEMSELVES UNJUSTIFIED (CALIBRATION-BACKLOG entry 111: " +
      "`NEITHER_RULED_NOR_DERIVED` — no ruling and no derivation behind either) — this derivation is " +
      "sound arithmetic ON the two committed numbers, not a claim that inherits any backing FOR them; " +
      "a future ruling that moves either anchor moves this cell too, for that reason as well as the " +
      "arithmetic one. No rate expectation is attached (CALIBRATION-BACKLOG entry 1e swept this exact " +
      "channel and refused it as a `pressure_rate` lever, -2.440pp of a 60.6pp gap); the metric this " +
      "bound is priced against is severity, not the rate. See the `DERIVED_MECHANIC` provenance " +
      "value's own comment for the full eight-category survey this entry repeats.",
  },
  /**
   * ⚠ ENTRY 73's CELL, AND THE RULE THAT WOULD HAVE SILENTLY ABSORBED IT.
   *
   * `arrival.containRetiresAfterConsecutiveContains` landed under §7.1 (CALIBRATION-BACKLOG entry
   * 73; see `docs/design/match-engine.md` §7.1's `DERIVED MECHANIC` note). Left unnamed, it would
   * have fallen to the `arrival.*` catch-all below — a `UNIFORM_REGIONS` member whose note reads
   * "the doc has no arrival model … every number in this block is engine structure filling that
   * gap." That is false of this cell specifically: the doc is not silent here, it carries a
   * dedicated, ratified, multi-paragraph derivation naming this exact parameter. Absorption would
   * have reported it `classified` (via `classifiedUniform`) under a note describing a different
   * cell's provenance — the ADR-048 shape, one dispatch later. Named here instead, ABOVE the
   * catch-all, so `arrival.*`'s remaining membership (and its `UNIFORM` claim) is unchanged.
   */
  {
    pattern: "arrival.containRetiresAfterConsecutiveContains",
    provenance: "DERIVED_MECHANIC",
    docRef: "§7.1 DERIVED MECHANIC (CALIBRATION-BACKLOG entry 73)",
    note:
      "2. §7.1's `DERIVED MECHANIC` note has two separately-cited halves and this cell inherits " +
      "both. THAT A RETIREMENT ROUTE SHOULD EXIST AT ALL is an OWNER RULING — CALIBRATION-BACKLOG " +
      "entry 73, 'ruled on the football, regardless of price.' THAT THE COUNT IS TWO is DERIVED, " +
      "not chosen, on two independent anchors, both re-verified directly against " +
      "`packages/engine/src/tunables.ts` rather than transcribed: (1) arithmetic — " +
      "`arrival.recoverySecondsByBand.BLOCKER_CONTAINS` (0.5) × 2 = 1.0 = `arrival.minTravelSeconds` " +
      "exactly, the model's own floor for how close any threat is ever allowed to be; (2) " +
      "structural — `passRush.counterMoveAfterStalemate`'s `previousBand` is the model's only " +
      "cross-tick memory (a single carried slot), so the smallest pattern expressible at that depth " +
      "that is not merely 'any one rep' is the same result twice running. NOT `DOC_VERBATIM`: the " +
      "doc's 'two consecutive reps' prose is a RECORD of this derivation, not its source. NOT " +
      "`INTERPRETATION`: the doc explicitly disclaims a judgement here ('nobody chose it'). See the " +
      "`DERIVED_MECHANIC` provenance value's own comment for the full survey against every other " +
      "category.",
  },
  /**
   * ⚠ CALIBRATION-BACKLOG ENTRY 111's ARCHAEOLOGY, AND THE CATCH-ALL THAT WAS SILENTLY ABSORBING IT.
   *
   * `arrival.immediateWithinSeconds` and `arrival.collapsingWithinSeconds` were, until this dispatch,
   * classified only by falling through to `arrival.*` below — a `UNIFORM_REGIONS` member whose note
   * reads "the doc has no arrival model … every number in this block is engine structure filling that
   * gap." Entry 110 first read that as "no provenance marker of any kind"; entry 111 corrected it —
   * the marker exists, machine-checked, in a red/green gate — but it is a statement about the
   * NEIGHBOURHOOD (§7.2's KNOWN ISSUE box), not about either CELL: it says nothing about why `0.0`
   * and `1.0` specifically, versus any other pair. Entry 111's exhaustive search (`git log -S` on each
   * identifier, every commit touching it, every ADR/backlog entry those point to) found **NEITHER a
   * derivation NOR a ruling, anywhere, ever**, for either cell — "one shared descriptive comment"
   * (`tunables.ts`, the prose above both fields explaining what the three-rung LADDER means, never why
   * these two NUMBERS) is the entire record. Named individually, ABOVE the catch-all, so
   * `arrival.*`'s remaining membership is unchanged and neither cell is reported `classified` under a
   * note that was never about it.
   */
  {
    pattern: "arrival.immediateWithinSeconds",
    provenance: "NEITHER_RULED_NOR_DERIVED",
    docRef: "§7.2 KNOWN ISSUE (missing time-of-arrival model) — CALIBRATION-BACKLOG entry 111",
    note:
      "0.0. NEITHER an owner ruling NOR a derivation exists for this value, at any point in the " +
      "project's history — CALIBRATION-BACKLOG entry 111's exhaustive archaeology found nothing but " +
      "the comment shared with `collapsingWithinSeconds` describing the three-rung ladder's CONCEPT " +
      "(arrived / about to arrive / still real pressure), which says nothing about why the ARRIVED " +
      "rung sits at exactly `0.0` rather than any other floor. Not `INTERPRETATION`: that value " +
      "asserts a judgement was made in the open, and the search found none. Not `DOC_GAP`: that " +
      "value's own examples are content-free bookkeeping, and this cell is football content — the " +
      "boundary at which a rusher is already in the QB's face. See the `NEITHER_RULED_NOR_DERIVED` " +
      "provenance value's own comment for the full ten-category survey.",
  },
  {
    pattern: "arrival.collapsingWithinSeconds",
    provenance: "NEITHER_RULED_NOR_DERIVED",
    docRef:
      "§7.2 KNOWN ISSUE (missing time-of-arrival model) — CALIBRATION-BACKLOG entries 81/111, ADR-058",
    note:
      "1.0. NEITHER an owner ruling NOR a derivation exists for this value either. A SWEEP does exist " +
      "(CALIBRATION-BACKLOG entry 81, `0.0`-`2.0`) and entry 111 is explicit that a sweep is not a " +
      "derivation: entry 81 found the lever 'STRUCTURALLY INCAPABLE of moving' `pressure_rate` — that " +
      "tests the boundary's INERTNESS against one metric, and entry 81 says of itself 'every prior " +
      "hit was this cell being USED, never EXAMINED.' It never establishes why `1.0` rather than " +
      "`0.8` against the football distinction the boundary is meant to draw. ADR-058 has since made " +
      "this cell the SOLE determinant of whether a won INTERIOR rep floors `COLLAPSING` or " +
      "`PRESSURE` (its Implied Scope section logs the value `unruled`), so the absence of any " +
      "justification is now load-bearing rather than the cosmetic gap it was when this sat inert " +
      "inside `arrival.*`. Not `INTERPRETATION`: no judgement in the open was ever found, only the " +
      "comment shared with `immediateWithinSeconds` describing the ladder's concept. See the " +
      "`NEITHER_RULED_NOR_DERIVED` provenance value's own comment for the full ten-category survey.",
  },
  {
    pattern: "arrival.*",
    provenance: "INTERPRETATION",
    docRef: "§7.2 KNOWN ISSUE (missing time-of-arrival model)",
    note:
      "The doc has no arrival model — its own KNOWN ISSUE box says so. Every number in this block " +
      "is engine structure filling that gap, declared as such in tunables. ⚠ EXCEPT " +
      "`containRetiresAfterConsecutiveContains`, named individually above: §7.1's `DERIVED " +
      "MECHANIC` note addresses that cell directly, so 'the doc has no arrival model' is not true " +
      "of it and this catch-all's `UNIFORM` claim never reaches it. ⚠ AND EXCEPT " +
      "`immediateWithinSeconds` / `collapsingWithinSeconds`, also named individually above " +
      "(CALIBRATION-BACKLOG entry 111): this note describes the BLOCK's provenance CLASS, not why " +
      "those two specific numbers are what they are, and entry 111 found no ruling and no derivation " +
      "behind either one — `NEITHER_RULED_NOR_DERIVED`, a different finding from 'the doc has no " +
      "arrival model' even though both cells happen to sit in a doc-silent block.",
  },

  // ---- §7.2 pocket -----------------------------------------------------------------------------
  {
    pattern: "pocket.accuracyModifier.*",
    provenance: "DOC_VERBATIM",
    docRef: "§10.4 / §7.2",
    note: "Clean +0, pressure −10, collapsing −20, immediate −30. Verbatim in both sections.",
  },
  {
    pattern: "pocket.readCapacityDelta.PRESSURE",
    provenance: "DOC_VERBATIM",
    docRef: "§7.2",
    note: "'POCKET PRESSURE: QB processing: −1 read capacity'. The one row the doc states.",
  },
  {
    pattern: "pocket.readCapacityDelta.CLEAN",
    provenance: "DOC_DERIVED",
    docRef: "§7.2",
    note: "'CLEAN POCKET: QB has full accuracy, full time' — 0 is the doc's own words.",
  },
  {
    pattern: "pocket.readCapacityDelta.*",
    provenance: "TABLE_SHAPE",
    docRef: "§7.2",
    note:
      "⚠ §7.2 gives a read-capacity penalty for POCKET PRESSURE **only**. COLLAPSING's entry is " +
      "'QB must throw, move, or take hit' and IMMEDIATE's is 'Must decide THIS tick' — neither " +
      "mentions processing. The table is keyed by the status ladder, so every rung needed a value " +
      "and −1/−2 appeared. Same shape as ADR-036, and this table has form: ADR-033 already deleted " +
      "an orphan `SACK: 0` row from it that handed a QB his full progression back. See SA-04.",
    finding: "SA-04",
  },
  {
    pattern: "pocket.severity.*",
    provenance: "STRUCTURAL",
    docRef: "§7.2",
    note: "The ladder's ranks. ADR-033/034; gated by `knownTruth/pocketLadder.ts`.",
  },
  {
    pattern: "pocket.thresholds.*",
    provenance: "INTERPRETATION",
    docRef: "§7.2",
    note: "The accumulated-pressure counter's entry requirements. The doc has no counter. Declared.",
  },

  // ---- §7.2's third option: pocket movement ----------------------------------------------------
  {
    pattern: "pocketMovement.*",
    provenance: "INTERPRETATION",
    docRef: "§7.2 ('throw, move, or take hit') / §8.8",
    note:
      "The doc names the MOVE branch in one clause and specifies nothing about it. The appeal " +
      "model, its bases, divisors and urgency slopes are entirely engine structure, declared as " +
      "such. §8.8's own KNOWN ISSUE box records the branch as previously absent.",
  },

  // ---- §8.8 scramble ---------------------------------------------------------------------------
  {
    pattern: "scramble.visionConeByDepthClass.*",
    provenance: "INTERPRETATION",
    docRef: "§8.8",
    note:
      "The doc's cone is SPATIAL ('direction of run −20, back toward line −40'); the slice has no " +
      "horizontal model, so depth class stands in. The two magnitudes are the doc's; the axis is not.",
  },
  {
    pattern: "scramble.target",
    provenance: "INTERPRETATION",
    docRef: "§8.8",
    note:
      "⚠ §8.8 states an OPPOSED resolution — 'QB Improvisation + Mobility vs. Pursuit'. The engine " +
      "makes it a flat target of 50 plus two situational terms and reads NO defender attribute at " +
      "all, so `pursuit` is inert in the escape. See SA-05.",
    finding: "SA-05",
  },
  {
    pattern: "scramble.attrDivisor",
    provenance: "DOC_VERBATIM",
    docRef: "§8.8 / §1.3",
    note: "Improvisation ÷5 + Mobility ÷5 — the QB half of the doc's contest.",
  },
  /**
   * ⚠ ADR-055 §6's TWO CELLS, AND THE RULE THAT WOULD HAVE SILENTLY ABSORBED THEM.
   *
   * `scramble.accuracyModifier` and `scramble.readCapacityDelta` (backlog entries 84/85, ADR-055 §6,
   * shipped `03279c8`) landed under `scramble`. Left unnamed, both would have fallen to the
   * `scramble.*` catch-all below — an `INTERPRETATION` member whose note reads "§8.8 specifies
   * NOTHING here... so every remaining `scramble` leaf is engine judgement." That is false of these
   * two specifically: `tunables.ts`'s own `RULED, NOT DERIVED` block is a dedicated, multi-paragraph
   * note naming both cells, separating an owner-ruled EXISTENCE from a carried, provisional
   * MAGNITUDE — neither half of which is "engine judgement made in the open" in the sense
   * `INTERPRETATION` means. Absorption would have reported both `classified` (via `classifiedUniform`)
   * under a note describing a different pair of cells' provenance — the ADR-048 shape, recurring a
   * third time. Named here instead, ABOVE the catch-all, so `scramble.*`'s remaining membership is
   * unchanged (still 9 — this pin holding steady is the check that the fix pulled these two OUT
   * rather than merely re-typing the count after they were absorbed IN).
   */
  {
    pattern: "scramble.accuracyModifier",
    provenance: "RULED_NOT_DERIVED",
    docRef: "§8.8 (silent on the throw side) — ADR-055 §6 / CALIBRATION-BACKLOG entry 84",
    note:
      "−10. THAT A PURSUED PASSER'S THROW IS LESS ACCURATE AT ALL is an OWNER RULING (ADR-055 §6, " +
      "closing backlog entry 84's flagged question): 'throwing on the run, pursued inside 1.5s, is " +
      "less accurate than throwing from a clean pocket — true independent of any measurement.' THAT " +
      "THE VALUE IS −10 IS NOT DERIVED — `tunables.ts`'s own comment states it is carried from " +
      "`pocket.accuracyModifier.PRESSURE`, 'the smallest claim available that is not false,' and is " +
      "explicitly flagged as NOT reached by two independent structural facts converging (the " +
      "`DERIVED_MECHANIC` bar), so it may not be cited as evidence about scramble accuracy until it " +
      "has an actual derivation or a fresh football argument. See the `RULED_NOT_DERIVED` " +
      "provenance value's own comment for the full ten-category survey.",
  },
  {
    pattern: "scramble.readCapacityDelta",
    provenance: "RULED_NOT_DERIVED",
    docRef: "§8.8 (silent on the throw side) — ADR-055 §6 / CALIBRATION-BACKLOG entry 84",
    note:
      "−1. Same ruling, same cell pair, same `RULED, NOT DERIVED` marking as `scramble" +
      ".accuracyModifier` immediately above — carried from `pocket.readCapacityDelta.PRESSURE` rather " +
      "than derived. See that rule's note and the `RULED_NOT_DERIVED` provenance value's own comment.",
  },
  {
    pattern: "scramble.*",
    provenance: "INTERPRETATION",
    docRef: "§8.8",
    note:
      "EN BLOC, and the note is written to be true of the whole subtree rather than of a list: " +
      "§8.8 specifies NOTHING here ('See Phase 6 for full resolution', a phase the doc never " +
      "writes), so every remaining `scramble` leaf is engine judgement. Today that is the four " +
      "bands, the edge penalty, the urgency slope, the pursuit clock, the flat openness gain and " +
      "`maxOpenness: 85` — an 85 cap on §8.4's 0-100 scale, which the earlier note omitted. ⚠ " +
      "`scramble.opennessGainPerTick` is the flat gain ADR-046's argument applies to verbatim; " +
      "ADR-048 §7.6 NAMED it and deliberately did not expand into it, because §8.8's receiver has " +
      "abandoned his route and there may be no rep to condition on. Named here, not owed. ⚠ EXCEPT " +
      "`accuracyModifier` and `readCapacityDelta`, named individually above: ADR-055 §6's `RULED, " +
      "NOT DERIVED` note addresses those two cells directly, so 'every remaining leaf is engine " +
      "judgement' is not true of them and this catch-all's membership never reaches them.",
  },

  // ---- §9.1 release ----------------------------------------------------------------------------
  {
    pattern: "release.bands.6.delaySeconds",
    provenance: "TABLE_SHAPE",
    docRef: "§9.1",
    note:
      "⚠ §9.1's seventh row is 'CB wins by 20+: Route disrupted, WR must improvise' — prose, with " +
      "NO delay, where the six rows above it all carry one. The column demanded a seventh value and " +
      "2.0 appeared. It is also outside §9.2's stated jam envelope of '+0.5 to +1.0 ticks'. See SA-03.",
    finding: "SA-03",
  },
  {
    pattern: "release.bands.*.delaySeconds",
    provenance: "DOC_UNIT_RESOLVED",
    docRef: "§9.1",
    note:
      "0 / 0 / 0.5 / 1.0 / 1.0 / 1.5 are §9.1's own numbers, written there in TICKS ('delayed 0.5 " +
      "ticks') and consumed here as SECONDS. Same ambiguity §7.4 carries an authoring correction " +
      "for; resolved the same way and not recorded in the doc. See SA-06.",
    finding: "SA-06",
  },
  {
    pattern: "release.bands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§9.1",
    note: "20 / 10 / 1 / 0 / −9 / −19 / −∞ encode the doc's seven rows exactly.",
  },
  {
    pattern: "release.bands.*",
    provenance: "INTERPRETATION",
    docRef: "§9.1",
    note:
      "`wrCoverageMod` / `cbCoverageMod`: §9.1 states outcomes in words ('CB beat', 'CB in phase', " +
      "'CB in trail technique') and gives no coverage modifier anywhere. Declared in tunables as " +
      "'coverage modifiers per §9.1 outcomes'.",
  },
  {
    pattern: "release.attrDivisor",
    provenance: "DOC_VERBATIM",
    docRef: "§9.1 / §1.3",
    note: "WR Release ÷5 + Agility ÷5 vs CB Press ÷5 + Strength ÷5.",
  },

  // ---- §9.2 route ------------------------------------------------------------------------------
  {
    pattern: "route.readySeconds.DEEP",
    provenance: "INTERPRETATION",
    docRef: "§9.2",
    note:
      "⚠ §9.2 gives DEEP a RANGE — 'Ready at Tick 2.5-3.0' — where the other three rows are single " +
      "values. The table demanded one number and the FAST end was taken, with no note. See SA-07.",
    finding: "SA-07",
  },
  {
    pattern: "route.readySeconds.*",
    provenance: "DOC_UNIT_RESOLVED",
    docRef: "§9.2",
    note: "QUICK 1.0, SHORT 1.5, INTERMEDIATE 2.0 — the doc's tick labels read as seconds (§2.1).",
  },
  {
    pattern: "route.opennessGainPerTick",
    provenance: "DOC_VERBATIM",
    docRef: "§8.7",
    note: "'+5 to openness per tick up to 3.0 ticks'.",
  },
  {
    pattern: "route.opennessDecayPerTick",
    provenance: "DOC_VERBATIM",
    docRef: "§8.7",
    note: "'Coverage tightens after 3.0 ticks (−5 per tick)'.",
  },
  {
    pattern: "route.decayStartsAtSeconds",
    provenance: "DOC_UNIT_RESOLVED",
    docRef: "§8.7",
    note: "'after 3.0 ticks' read as 3.0 seconds. See SA-06.",
    finding: "SA-06",
  },
  /**
   * ⚠ ADR-048's SEVEN CELLS, AND THE RULE THAT SILENTLY SWALLOWED THEM.
   *
   * These arrived under the catch-all `route.*` — `STRUCTURAL`, §8.4, *"Openness clamps at §8.4's
   * 0-100 scale"* — which is **false of every one of them**: they are a derived rate ladder, not a
   * clamp. `unclassified` stayed empty, `deadRules` stayed empty, and the totality gate stayed
   * GREEN. The count and the path digest fired; the CLASSIFICATION did not. See `BLOCK_RULE_ABSORPTION`
   * below for the structural repair, and this file's `route.*` entry — which no longer exists,
   * because the two cells it legitimately covered are now named.
   */
  {
    pattern: "route.contestGain.burstSteps",
    provenance: "INTERPRETATION",
    docRef: "§8.7 AMENDMENT (owner ruling on ADR-046) + §9.2; derived in ADR-048 §2.3",
    note:
      "2 ticks. §8.7 states its rates PER TICK, so the burst is an integer number of ticks; the " +
      "MULTIPLE is read off §9.2's 'Jam at line: +0.5 to +1.0 ticks', the only quantity in the doc " +
      "measuring how long a break is in progress. ⚠ §8.7's amendment now contains the sentence " +
      "'with a burst window of two ticks' — that is a RECORD OF WHAT LANDED, not the specification " +
      "it was derived from, and reading it as DOC_VERBATIM would make the doc cite the engine " +
      "citing the doc. Classified against what §8.7 SPECIFIES, which is a shape and two constraints.",
  },
  {
    pattern: "route.contestGain.byContest.*",
    provenance: "INTERPRETATION",
    docRef: "§8.7 AMENDMENT (owner ruling on ADR-046); derived in ADR-048 §2.2",
    note:
      "The six rates as MULTIPLES of `route.opennessGainPerTick` — TRAILING +2u/0, EVEN +1u/0, " +
      "IN_FRONT 0/−1u — keyed on the `contest` column both band tables already carry. " +
      "INTERPRETATION and not DOC_DERIVED: the UNIT is §8.7's own number, but the doc states no " +
      "conditioning at all and its amendment says in terms 'The rate mapping is the engine's to " +
      "DERIVE'. That is the doc asking for a judgement, which is this vocabulary's definition of " +
      "INTERPRETATION. ⚠ NOT a clamp and NOT §8.4 — see the block comment above.",
  },
  {
    pattern: "route.maxOpenness",
    provenance: "STRUCTURAL",
    docRef: "§8.4",
    note:
      "100 — the top of §8.4's 0-100 scale, as a clamp. Named rather than left to a `route.*` " +
      "catch-all: that catch-all is what absorbed ADR-048's seven cells while reporting them classified.",
  },
  {
    pattern: "route.minOpenness",
    provenance: "STRUCTURAL",
    docRef: "§8.4",
    note: "0 — the bottom of §8.4's 0-100 scale, as a clamp. Named for the same reason as `maxOpenness`.",
  },

  // §3's two spatial fakes (`defaultHorizontal`, `laneDeflectionVertical`) are STRING-valued, so
  // `zoneModel` contributes no numeric cell beyond `verticalUpperYards` above. A rule written for
  // them was DELETED because the totality gate reported it dead — the register catching its own
  // over-reach on its first run, which is the property the gate exists for. Backlog entry 8 owns them.

  // ---- §9.4 zone coverage ----------------------------------------------------------------------
  {
    pattern: "zoneCoverage.readQb.baseTarget",
    provenance: "DOC_VERBATIM",
    docRef: "§9.4",
    note: "'vs. Target: 60 + (QB Disguise)'. Backlog entry 7 prices the resulting 65% break rate.",
  },
  {
    pattern: "zoneCoverage.readQb.contestBonus",
    provenance: "DOC_VERBATIM",
    docRef: "§9.4",
    note: "'Creates +20 to contest/interception'.",
  },
  {
    pattern: "zoneCoverage.readQb.disguise.*",
    provenance: "INTERPRETATION",
    docRef: "§9.4",
    note: "'QB Disguise' names no registry attribute and cannot be a 0-99 rating on this target. ADR-009.",
  },
  {
    pattern: "zoneCoverage.readQb.attrDivisor",
    provenance: "DOC_VERBATIM",
    docRef: "§9.4 / §1.3",
    note: "Zone Coverage ÷5 + Awareness ÷5.",
  },
  {
    pattern: "zoneCoverage.bands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§9.4",
    note: "20 / 10 / 1 / −∞ encode 'wins by 20+ / 10-19 / 1-9 / WR loses'.",
  },
  {
    pattern: "zoneCoverage.bands.*.openness",
    provenance: "INTERPRETATION",
    docRef: "§9.4 + §8.4",
    note:
      "✅ SA-08's SECOND PRODUCER, RULED AND IMPLEMENTED (ADR-045 §2.2). The doc states outcomes in " +
      "words and §8.4 supplies the 0-100 scale; the mapping between them is the engine's. ⚠ THE " +
      "REASON THIS ROW BELONGS TO SA-08 AT ALL IS THE FINDING WORTH KEEPING: §9.4 states its bands " +
      "in §8.4's WORDS, so it produces the same scale §9.3 does — and NO TYPE CAN SEE THAT. The " +
      "opaque-type fixpoint over §9.3 returned a complete-looking numeric answer while this table " +
      "sat unchanged, and a scale used by two producers cannot be corrected for one. Found by " +
      "READING, which has no instrument. Re-pointed onto the same mapping: 70 / 52 / 38 / 20, " +
      "where `WINDOW`'s 70 was the mislabelled cell — §8.4's wide-open FLOOR carrying the word " +
      "'open' — and `DEFENDER_IN_LANE` (20) names no §8.4 band and is HELD. §9.3's two " +
      "tight-window values collapse to one here (38) because §9.4 has no half-yard boundary case; " +
      "34, interpolating to preserve §9.4's old position between them, was rejected as exactly the " +
      "invention ADR-039 SA-01 records.",
    finding: "SA-08",
  },
  /**
   * ⚠ THE SECOND LIVE INSTANCE OF THE SAME SHAPE, FOUND BY THE ADR-048 SWEEP — and a WORSE one,
   * because the classification and not just the note was wrong.
   *
   * `zoneCoverage.*` was `INTERPRETATION`, noted *"Uncovered openness and the settled-decay knob"* —
   * a claim about TWO cells. It absorbed FIVE. The other three are `target: 50`,
   * `receiverAttrDivisor: 5` and `defenderAttrDivisor: 5`, which are §9.4's opening line **verbatim**
   * (*"Roll: d100 + (WR Route Running ÷ 5) vs. Target: 50 + (Defender Zone Coverage ÷ 5)"*). They
   * were registered as engine judgement calls for their whole life. Nothing reddened, because a
   * catch-all cannot go stale by changing — it goes stale by absorbing.
   *
   * The catch-all is GONE, not re-noted: every `zoneCoverage` leaf outside the narrow rules above is
   * now named, so a cell added here lands in `unclassified` and reddens at its own path.
   */
  {
    pattern: "zoneCoverage.target",
    provenance: "DOC_VERBATIM",
    docRef: "§9.4",
    note: "50 — §9.4's 'vs. Target: 50 + (Defender Zone Coverage ÷ 5)'. Verbatim.",
  },
  {
    pattern: "zoneCoverage.receiverAttrDivisor",
    provenance: "DOC_VERBATIM",
    docRef: "§9.4 / §1.3",
    note: "WR Route Running ÷5 — §9.4's roll term. Verbatim.",
  },
  {
    pattern: "zoneCoverage.defenderAttrDivisor",
    provenance: "DOC_VERBATIM",
    docRef: "§9.4 / §1.3",
    note: "Defender Zone Coverage ÷5 — §9.4's target term. Verbatim.",
  },
  {
    pattern: "zoneCoverage.uncoveredOpenness",
    provenance: "INTERPRETATION",
    docRef: "§9.4 / §8.4",
    note:
      "90. NOT a §9.4 row — a hole in the zone shell, which §9.4 does not price — and HELD by " +
      "SA-08's ruling; pinned in that finding's `ruledValues` so the hold is asserted rather than " +
      "remembered.",
  },
  {
    pattern: "zoneCoverage.settledDecayPerTick",
    provenance: "INTERPRETATION",
    docRef: "§9.4 / §8.7",
    note:
      "0. The largest behavioural knob added by the zone pass (backlog 8a) and marked INTERPRETATION " +
      "in tunables. ⚠ ADR-048 §2.4 made the settled curve's GAIN take `route.contestGain` while " +
      "leaving this DECAY at 0 deliberately, so the two producers now agree on gain and differ on " +
      "decay by design; that divergence is asserted in the engine's gate, not here.",
  },

  // ---- §9.3 man coverage -----------------------------------------------------------------------
  {
    pattern: "manCoverage.bands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§9.3",
    note: "30 / 20 / 10 / 1 / 0 / −9 / −19 / −∞ encode the doc's eight rows exactly.",
  },
  // ---- SA-08 — RULED, RE-RULED, AND IMPLEMENTED (ADR-045 + its same-day amendment) --------------
  //
  // OWNER RULING (July 2026), as it FINALLY STANDS. §9.3's labels are re-pointed onto §8.4's
  // EXISTING FIVE BANDS. **§8.4's SCALE DOES NOT CHANGE**: its thresholds are load-bearing on the
  // effective-openness math, so adding a band to fit §9.3's words would change QB read mechanics to
  // fix a LABELLING problem. And **the word "contested" leaves the openness vocabulary entirely** —
  // it is reserved for §11.1's catch resolution, which is what forecloses ADR-040 §3's rejected 55
  // rather than merely leaving it unruled.
  //
  // ⚠ THIS BLOCK PREVIOUSLY RECORDED THE FIRST RULING, WHICH IS NOT THE ONE THAT LANDED, and said
  // so for a dispatch after the engine change had shipped. Both facts are kept here rather than
  // overwritten, because the disagreement is the finding (Charter §4.1, *log, do not smooth*):
  //
  //   - the first ruling's cell list — four cells, `1-9 → covered`, `tie → covered, low end` — was
  //     **arithmetically unsatisfiable** and the owner re-ruled it (ADR-043, then ADR-045 §2.1);
  //   - this register went on saying **"THE ENGINE MAPPING CHANGE IS NOT IMPLEMENTED"** after it
  //     had landed, and asserted that **"the compiler will NOT complain"** about a compiler that
  //     **did** — ADR-040 §3.1's second assertion exists to make it, and moving the half-yard row
  //     turned `pnpm typecheck` red. That red is how the non-separability of
  //     `catching.contestedMaxOpenness` was discovered (ADR-045 §4.1).
  //
  // Nothing compiled against those three sentences, so nothing caught them. The values below are
  // therefore no longer carried in prose alone: `SCALE_AUDIT_FINDINGS`' `ruledValues` pins each one
  // through `applyTunablePatch`, and `auditFindingRulings` reddens if a ruled cell moves or if a
  // finding still calls itself OWED after its cells have landed. See that field's own comment.
  //
  // THE RULED COLUMN, one band down per row, strictly decreasing since the amendment:
  //   §9.3  70 / 52 / 38 / 30 / 25 / 22 / 15 / 6   (`EVEN_BRACKET` 25 held; `CB_IN_PHASE` 25 → 22)
  //   §9.4  70 / 52 / 38 / 20                      (`DEFENDER_IN_LANE` names no §8.4 band; held)
  {
    pattern: "manCoverage.bands.*.openness",
    provenance: "INTERPRETATION",
    docRef: "§9.3 + §8.4 / §11.1",
    note:
      "✅ SA-08 RULED AND IMPLEMENTED (ADR-045 §2.1, amended §2.3a). Separation-in-yards mapped " +
      "onto §8.4's openness scale, one band DOWN from where it used to sit: 70 wide-open floor / " +
      "52 open / 38 tight-window mid / 30 tight-window floor / 25 covered / 22 covered / 15 / 6. " +
      "The last two rows are HELD and the ruling says so; `CB_IN_PHASE` moved 25 → 22 to break a " +
      "tie with `EVEN_BRACKET` that no instrument pointed at this table could see (ADR-045 §2.3b " +
      "— the band gate is green on a tie BY CONSTRUCTION, since it fires only on a column that " +
      "both rises and falls). ⚠ `manCoverage.bands.3` (SEPARATION_HALF_YARD, 30) is THE COUPLED " +
      "CELL: `catching.contestedMaxOpenness` is pinned to it by the compiler (ADR-040 §3), so it " +
      "moved with the row and the two findings could not be priced separately. That is the " +
      "derivation working, and the compiler DID complain — which is the evidence the coupling is " +
      "real rather than argued.",
    finding: "SA-08",
  },
  {
    pattern: "manCoverage.attrDivisor",
    provenance: "DOC_VERBATIM",
    docRef: "§9.3 / §1.3",
    note: "Route Running ÷5 + Agility ÷5 vs Man Coverage ÷5 + Agility ÷5.",
  },

  // ---- §8 QB -----------------------------------------------------------------------------------
  {
    pattern: "qb.readSystem.HALF_FIELD.readsPerTick",
    provenance: "DOC_VERBATIM",
    docRef: "§8.1",
    note: "'Processing: 1 read per tick'.",
  },
  {
    pattern: "qb.readSystem.FULL_FIELD.readsPerTick",
    provenance: "DOC_VERBATIM",
    docRef: "§8.1",
    note: "'Processing: 0.5 reads per tick'.",
  },
  {
    pattern: "qb.readSystem.CONCEPT.readsPerTick",
    provenance: "DOC_DERIVED",
    docRef: "§8.1",
    note: "'1 read per 0.5 ticks' = 2 per tick.",
  },
  {
    pattern: "qb.readSystem.*.maxReads",
    provenance: "DOC_VERBATIM",
    docRef: "§8.1",
    note: "3 / 4 / 2 — 'Max reads before checkdown'.",
  },
  {
    pattern: "qb.readSystem.CONCEPT.firstReadAnticipationModifier",
    provenance: "INTERPRETATION",
    docRef: "§8.1",
    note:
      "Anticipation is not in the doc at all. +30 against a target of 55 makes a concept QB " +
      "anticipate his key on ~79% of snaps — backlog entry 24's scale defect, already logged.",
  },
  {
    pattern: "qb.readSystem.*",
    provenance: "INTERPRETATION",
    docRef: "§8.1",
    note:
      "Budget deltas, throw-threshold deltas and anticipation modifiers. §8.1 gives each system a " +
      "read rate and a progression depth and nothing else; the rest is the engine's model of what " +
      "the systems ASK of a quarterback. Declared.",
  },
  {
    pattern: "qb.extraReads.*",
    provenance: "DOC_VERBATIM",
    docRef: "§8.2",
    note: "'+ (QB Decision Making − 70) ÷ 20 extra reads'.",
  },
  {
    pattern: "qb.minReadsPerTick",
    provenance: "INTERPRETATION",
    docRef: "§7.2 / §8.2",
    note: "§7.2's −1 read capacity would take a baseline QB to zero reads. Declared floor.",
  },
  {
    pattern: "qb.awarenessVariance.baseHalfWidth",
    provenance: "DOC_DERIVED",
    docRef: "§8.3 as amended (owner ruling, ADR-040 §1)",
    note:
      "✅ SA-09 RULED AND IMPLEMENTED. A NEW CELL — it replaced `d20Offset` and is not the same " +
      "claim. 10 is §8.3's own `d20 − 10`, re-read as the die's EXCURSION MAGNITUDE and installed " +
      "as the half-width at the baseline rating, where it used to be a shift of the centre. That " +
      "re-reading is arithmetic on a doc number rather than the number itself, so DOC_DERIVED, not " +
      "DOC_VERBATIM. ⚠ It entered the tree under the OLD block rule's `DOC_VERBATIM` note with " +
      "nothing reddening (`d20Offset` out, `baseHalfWidth` in, net 0 numeric cells) — which is why " +
      "the census now pins the numeric leaf PATH SET and not only its cardinality.",
    finding: "SA-09",
  },
  {
    pattern: "qb.awarenessVariance.*",
    provenance: "DOC_VERBATIM",
    docRef: "§8.3 as amended (owner ruling, ADR-040 §1)",
    note:
      "✅ SA-09 RULED AND IMPLEMENTED. `baseline: 70` and `divisor: 5` are §8.3's own awareness " +
      "term, unchanged in value and MOVED — from the centre of the perception band to its " +
      "half-width, which is the quantity the doc's sentence always claimed it applied to. The " +
      "engine now holds the ruled properties (centred at every awareness, half-width monotone " +
      "decreasing) and proves them exhaustively over 20 faces × 100 ratings. " +
      "⚠ CALIBRATION DECLINES TO EVALUATE THE FOOTBALL: on flat-60 this term is a CONSTANT with " +
      "ZERO VARIANCE, so any corpus number about it would be measuring the fixture. Backlog entry " +
      "49's first member; re-open when `packages/attributes` supplies real spread.",
    finding: "SA-09",
  },
  {
    pattern: "qb.window.*",
    provenance: "DOC_VERBATIM",
    docRef: "§8.4",
    note: "Threshold 50, baseline 70, Accuracy ÷2, Arm ÷4, Touch ÷4. Verbatim.",
  },
  {
    pattern: "qb.timeBudget.*",
    provenance: "DOC_UNIT_RESOLVED",
    docRef: "§8.7",
    note:
      "⚠ '2.5 TICKS + (Pocket Patience − 70) ÷ 20 TICKS' consumed as SECONDS, doubling both the " +
      "base and the slope against the doc's literal text. The largest of the unit resolutions and " +
      "the only one with no note anywhere. See SA-06.",
    finding: "SA-06",
  },
  {
    pattern: "qb.anticipation.*",
    provenance: "INTERPRETATION",
    docRef: null,
    note:
      "The anticipation mechanic is not in the design document. Backlog 2b installed it as the " +
      "missing half of §8.1; every number is engine structure and tunables says so.",
  },
  {
    pattern: "qb.decision.bands.*.poolFrom",
    provenance: "INTERPRETATION",
    docRef: "§8.5",
    note:
      "⚠ §8.5's failure rows read 'may take suboptimal' and 'likely takes wrong option'. " +
      "`poolFrom: 1` makes the best-perceived target UNREACHABLE on both, converting 'may' into " +
      "'never'. The band boundaries are the doc's; this consequence column is not. See SA-10.",
    finding: "SA-10",
  },
  {
    pattern: "qb.decision.bands.*.poolTo",
    provenance: "INTERPRETATION",
    docRef: "§8.5",
    note: "'takes best available / top 2 choice / reasonable option' as rank windows. Declared.",
  },
  {
    pattern: "qb.decision.bands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§8.5",
    note: "30 / 15 / 0 / −14 / −∞ encode the doc's five rows exactly.",
  },
  {
    pattern: "qb.decision.*",
    provenance: "DOC_VERBATIM",
    docRef: "§8.5 / §1.3",
    note: "Target 50, Decision Making ÷5.",
  },
  {
    pattern: "qb.checkdown.threshold",
    provenance: "INTERPRETATION",
    docRef: "§8.1",
    note: "The doc names a checkdown and never says what makes a QB take one. Declared.",
  },
  {
    pattern: "qb.throwThreshold",
    provenance: "INTERPRETATION",
    docRef: "§8.5",
    note: "The doc never states the openness at which a QB pulls the trigger. Declared aggression knob.",
  },
  {
    pattern: "qb.desperationThreshold",
    provenance: "INTERPRETATION",
    docRef: "§8.5",
    note: "As above.",
  },
  {
    pattern: "qb.throwawayEarliestSeconds",
    provenance: "INTERPRETATION",
    docRef: "§10.2",
    note: "§10.2 names the throwaway and gives it no timing rule. Declared.",
  },
  {
    pattern: "qb.poise.*",
    provenance: "INTERPRETATION",
    docRef: "§4.1",
    note:
      "§4.1 gives Poise the purpose 'resisting accuracy penalties from pressure' and no exchange " +
      "rate. The ÷10 refund is the engine's; backlog entry 4 prices it at ~3 of 20 for a 99-poise QB.",
  },
  {
    pattern: "qb.pressureSensing.*",
    provenance: "INTERPRETATION",
    docRef: "Appendix B",
    note: "'Pocket Awareness: +10 to sensing pressure' expressed as a half-tick of budget. Declared.",
  },

  // ---- §10 throw execution ---------------------------------------------------------------------
  {
    pattern: "throwExec.typeSelection.tightWindowMaxOpenness",
    provenance: "INTERPRETATION",
    docRef: "§10.2 / §8.4",
    note:
      "§10.2 says 'system or QB AI selects'. 50 restates §8.4's tight-window threshold — and " +
      "consumes it as `<= 50` where `qb.window.tightWindowThreshold` is consumed as `< 50`, so two " +
      "cells that mean the same thing disagree at exactly 50. See SA-11.",
    finding: "SA-11",
  },
  {
    pattern: "throwExec.armRequirements.*",
    provenance: "TABLE_SHAPE",
    docRef: "§10.1",
    note:
      "⚠ THE OPPOSITE DIRECTION FROM ADR-036. §10.1's table has SIX rows keyed by THROW TYPE (deep " +
      "out 20+ yds → 85, deep post/corner 25+ → 80, comeback 18 → 75, seam → 80, across body → 85, " +
      "into wind → +10). The engine's table is keyed by AIR YARDS and has TWO rows. The doc's " +
      "strictest requirement — 85 — has no cell anywhere, so a 20-yard out now gates at 75. The " +
      "doc's key met the table's key and four rows vanished. See SA-12.",
    finding: "SA-12",
  },
  {
    pattern: "throwExec.underArmThresholdAccuracyPenalty",
    provenance: "DOC_VERBATIM",
    docRef: "§10.1",
    note: "'Automatic −20 accuracy'.",
  },
  {
    pattern: "throwExec.lane.velocityModifier.BULLET",
    provenance: "DOC_VERBATIM",
    docRef: "§10.2",
    note:
      "✅ SA-13 RULED AND IMPLEMENTED (ADR-040 §2): 15 → 10. §10.2 is the MECHANIC DESCRIPTION and " +
      "wins; §10.3's velocity table was the restatement, and the general rule is now Appendix C's " +
      "— resolve against the section, then correct the loser. **The doc edit ADR-040 §2.1 reported " +
      "as outstanding HAS LANDED**: §10.3 now reads 'Bullet: +10' over an AMENDED note recording " +
      "what it was, so the contradiction is closed on both sides and `docRef` is §10.2 because " +
      "§10.2 is where the number is stated as a mechanic. §12.2's `Bullet pass: +15` is a " +
      "different table and is correctly untouched.",
    finding: "SA-13",
  },
  {
    pattern: "throwExec.lane.velocityModifier.*",
    provenance: "DOC_VERBATIM",
    docRef: "§10.3",
    note: "Touch −10 (both sections agree); back-shoulder and throwaway are 0, both absent from §10.3.",
  },
  {
    pattern: "throwExec.lane.angleModifier.*",
    provenance: "DOC_VERBATIM",
    docRef: "§10.3",
    note:
      "Over defender +20, past defender +0, through zone −10. Verbatim, and verbatim BEFORE and " +
      "AFTER ADR-040 — the three values never moved. ⚠ THE DEFECT WAS IN THE SELECTOR, NOT IN " +
      "THESE CELLS: `angleByThrowType` keyed §10.3's angle on the THROW TYPE, putting the type on " +
      "both of §10.3's terms and making a touch pass harder to deflect than a bullet. ADR-040 " +
      "re-keyed it onto `ContestPosition` (§11.3's own input), so the ordering is now a property " +
      "of §10.2's two velocity numbers alone. **The selector is a STRING table and this register " +
      "does not walk strings** — the register's whole contact with SA-13's worse half was one unit " +
      "of a string count. Backlog 51.",
  },
  {
    pattern: "throwExec.lane.contestOpennessMax",
    provenance: "INTERPRETATION",
    docRef: "§10.3",
    note: "'each zone it passes through' has no engine referent without a spatial model. Declared.",
  },
  {
    pattern: "throwExec.lane.target",
    provenance: "DOC_VERBATIM",
    docRef: "§10.3",
    note: "'vs. Target: 60 + velocity + angle'.",
  },
  {
    pattern: "throwExec.lane.attrDivisor",
    provenance: "DOC_VERBATIM",
    docRef: "§10.3 / §1.3",
    note: "Reaction ÷5 + Ball Skills ÷5.",
  },
  {
    pattern: "throwExec.accuracy.bands.6.catchMod",
    provenance: "TABLE_SHAPE",
    docRef: "§10.5",
    note:
      "⚠ §10.5's MISS row reads 'No catch possible | N/A | N/A' across all three columns. The engine " +
      "holds three ZEROS. This is ADR-036's cell in a different table, and the band-table gate " +
      "already derives all three GUARDED on the committed tree. See SA-01.",
    finding: "SA-01",
  },
  {
    pattern: "throwExec.accuracy.bands.6.defenderContestMod",
    provenance: "TABLE_SHAPE",
    docRef: "§10.5",
    note: "See SA-01 — the second of the three MISS-row zeros.",
    finding: "SA-01",
  },
  {
    pattern: "throwExec.accuracy.bands.6.difficulty",
    provenance: "TABLE_SHAPE",
    docRef: "§10.5 / §11.2",
    note: "See SA-01 — the third. §10.5 has no difficulty column at all; this one is spliced from §11.2.",
    finding: "SA-01",
  },
  {
    pattern: "throwExec.accuracy.bands.*.difficulty",
    provenance: "INTERPRETATION",
    docRef: "§11.2",
    note:
      "§10.5 states no difficulty column. ADEQUATE→10 is §11.2's 'adjustment needed' and matches " +
      "§10.4's own wording; POOR→15 and BAD→20 re-use §11.2's 'behind/high' and 'diving' rows for " +
      "placement rather than for a catch type. Undeclared in tunables until now.",
  },
  {
    pattern: "throwExec.accuracy.bands.*.catchMod",
    provenance: "DOC_VERBATIM",
    docRef: "§10.5",
    note: "+20 / +15 / +10 / 0 / −15 / −25. Verbatim.",
  },
  {
    pattern: "throwExec.accuracy.bands.*.defenderContestMod",
    provenance: "DOC_VERBATIM",
    docRef: "§10.5",
    note: "−15 / −10 / −5 / 0 / +10 / +15. Verbatim.",
  },
  {
    pattern: "throwExec.accuracy.bands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§10.4",
    note: "40 / 25 / 10 / 0 / −14 / −29 / −∞ encode the doc's seven rows exactly.",
  },
  {
    pattern: "throwExec.accuracy.depthModifier.*",
    provenance: "DOC_VERBATIM",
    docRef: "§10.4",
    note:
      "Short <10 → +10, intermediate 10-25 → 0, deep 25+ → −10. Note the doc assigns 25 to BOTH " +
      "the intermediate and deep rows; the engine gives it to intermediate.",
  },
  {
    pattern: "throwExec.accuracy.throwTypeModifier.*",
    provenance: "DOC_VERBATIM",
    docRef: "§10.2",
    note: "Back shoulder '−10 to accuracy'; the others 0, which §10.2 also states.",
  },
  {
    pattern: "throwExec.accuracy.*",
    provenance: "DOC_VERBATIM",
    docRef: "§10.4 / §1.3",
    note: "Target 60, Accuracy ÷5. Backlog entry 1's subject and the doc's own number.",
  },

  // ---- §11 catching ----------------------------------------------------------------------------
  {
    pattern: "catching.contestedMaxOpenness",
    provenance: "INTERPRETATION",
    docRef: "§11.1 / §9.3",
    note:
      "✅ SA-14 RULED AND IMPLEMENTED, THEN RE-RULED WITH ITS ANCHOR: 30 → 40 (ADR-040 §3), then " +
      "40 → **30** (ADR-045 §4.1a). Still INTERPRETATION and deliberately so — §11.1 states a " +
      "DISTANCE ('defender within 1 yard') and §9.3's discrete rows cannot say what openness one " +
      "yard is. What changed at ADR-040 is that the reading became ANCHORED instead of free: it is " +
      "the openness of `manCoverage.bands.3` (SEPARATION_HALF_YARD), the widest separation §11.1 " +
      "makes contested beyond argument, and the equality is asserted BY THE COMPILER in the engine " +
      "(mutual assignability of two `as const` literal types). ⚠ THE PAIR IS NOT SEPARABLE, AND " +
      "THE COMPILER IS WHAT ESTABLISHED THAT. When SA-08 moved the half-yard row 40 → 30, " +
      "`pnpm typecheck` went RED until this cell followed; there is no landing of §9.3's column " +
      "that leaves §11.1's threshold alone (ADR-045 §4.1). This register previously predicted the " +
      "opposite — *'the compiler will NOT complain, because the equality is preserved while the " +
      "football moves'* — and that sentence is corrected here rather than deleted, because it is " +
      "the clearest instance in the file of a claim nothing could falsify. The 40 → 30 move was " +
      "ratified as a DERIVATION, not a threshold choice: ADR-040's argument re-run against the " +
      "re-pointed table returns the SAME ROW, the alternative got weaker once SA-08's amendment " +
      "deleted the '(contested)' parenthetical it rested on, and **the reclassification is nil** " +
      "— the contested set is the same five §9.3 rows at 40 and at 30, which is the evidence it is " +
      "not compensation debt. Anchor identity is asserted engine-side by " +
      "`AdrO40RuledHalfYardOpenness`; the value is pinned here in `ruledValues`.",
    finding: "SA-14",
  },
  {
    pattern: "catching.routine.bands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§11.2",
    note: "20 / 10 / 0 / −9 / −19 / −∞ encode the doc's six rows exactly.",
  },
  {
    pattern: "catching.routine.*",
    provenance: "DOC_VERBATIM",
    docRef: "§11.2 / Appendix C",
    note: "Target 50, Catching ÷5. Appendix C's 'Catch (routine) | 50' agrees.",
  },
  {
    pattern: "catching.contested.positionModifier.*",
    provenance: "DOC_VERBATIM",
    docRef: "§11.3",
    note: "Trailing −10, even +0, in front +15. Verbatim.",
  },
  {
    pattern: "catching.contested.bands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§11.3",
    note:
      "20 / 10 / 1 / 0 / −9 / −19 / −∞ encode the doc's seven rows exactly. Note the doc's last row " +
      "is 'INTERCEPTION potential' and the band sets `interception: true` outright.",
  },
  {
    pattern: "catching.contested.*",
    provenance: "DOC_VERBATIM",
    docRef: "§11.3 / §1.3",
    note: "Receiver Catching+CIT+Jumping ÷5, defender Ball Skills+Jumping ÷5.",
  },

  // ---- §12 tipped ball -------------------------------------------------------------------------
  {
    pattern: "tippedBall.baseTargetByHeight.*",
    provenance: "DOC_VERBATIM",
    docRef: "§12.2",
    note: "100 / 90 / 80 / 70 / 60 / 50 / 40 / 30. Verbatim, all eight.",
  },
  {
    pattern: "tippedBall.heightStepsByThrowType.*",
    provenance: "INTERPRETATION",
    docRef: "§12.2",
    note: "Throw height is not modelled and §12.2 requires it. Declared derivation.",
  },
  {
    pattern: "tippedBall.velocityModifier.*",
    provenance: "DOC_VERBATIM",
    docRef: "§12.2",
    note: "Bullet +15, touch −15. Verbatim.",
  },
  {
    pattern: "tippedBall.weatherModifier.*",
    provenance: "DOC_GAP",
    docRef: "§12.2 / §16.1",
    note:
      "Zeroed because §16 is unimplemented, with the doc's values recorded in the comment. ⚠ The " +
      "comment claims wiring §16 will be 'a value change, not a code change'; §16.1 carries a COLD " +
      "(20-39°F) row and TWO wind rows that this key set cannot express. See SA-15.",
    finding: "SA-15",
  },
  {
    pattern: "tippedBall.qualityBands.5.speedCheckFromDistance",
    provenance: "TABLE_SHAPE",
    docRef: "§12.3",
    note:
      "⚠ THE CELL ADR-036 LEFT BEHIND. §12.3's DEAD row is 'None | None | None' — there is no " +
      "candidate, so there is no distance at which one would need a speed check. The column " +
      "demanded a value and the permissive sentinel 99 appeared, in the same row from which ADR-036 " +
      "removed `finalTargetNumber`. See SA-16.",
    finding: "SA-16",
  },
  {
    pattern: "tippedBall.qualityBands.5.maxZoneDistance",
    provenance: "DOC_DERIVED",
    docRef: "§12.3",
    note:
      "−1 encodes 'None' and is UNREACHABLE on the distance scale, so it is a legal sentinel by " +
      "§4.1's rule. Redundant with `recoverable: false` but not misleading.",
  },
  {
    pattern: "tippedBall.qualityBands.*.speedCheckFromDistance",
    provenance: "DOC_DERIVED",
    docRef: "§12.3",
    note: "2 / 2 / 99 / 1 / 99 encode the doc's Yes/No/Speed-check grid for the five live rows.",
  },
  {
    pattern: "tippedBall.qualityBands.*.maxZoneDistance",
    provenance: "DOC_DERIVED",
    docRef: "§12.3",
    note: "2 / 2 / 1 / 1 / 0 encode the doc's reach grid for the five live rows.",
  },
  {
    pattern: "tippedBall.qualityBands.*.finalTargetNumber",
    provenance: "DOC_VERBATIM",
    docRef: "§12.2",
    note: "20 / 35 / 55 / 75 / 90. Verbatim; the DEAD row has no such key (ADR-036).",
  },
  {
    pattern: "tippedBall.qualityBands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§12.2",
    note: "41 / 21 / 1 / −19 / −39 / −∞ encode 'Roll > TN+40 / TN+20 / TN / TN−20 / TN−40 / ≤'.",
  },
  {
    pattern: "tippedBall.recovery.proximityModifier.*",
    provenance: "DOC_VERBATIM",
    docRef: "§12.4",
    note: "Same zone +25, adjacent +10, two away −10. Verbatim.",
  },
  {
    pattern: "tippedBall.recovery.attrTerms.*",
    provenance: "DOC_VERBATIM",
    docRef: "§12.4",
    note: "Five of the doc's six 'each adds Rating ÷ 5' terms; the sixth is `handsDivisor`. Backlog entry 6.",
  },
  {
    pattern: "tippedBall.recovery.handsDivisor",
    provenance: "DOC_VERBATIM",
    docRef: "§12.4",
    note: "'Catching/Ball Skills: + Rating ÷ 5'.",
  },
  {
    pattern: "tippedBall.recovery.speedCheckMinSpeed",
    provenance: "INTERPRETATION",
    docRef: "§12.3",
    note: "§12.3 says 'Speed check' and names no threshold. Declared, on §10.1's rating-gate precedent.",
  },
  {
    pattern: "tippedBall.recovery.situational.*",
    provenance: "DOC_VERBATIM",
    docRef: "§12.4",
    note:
      "+10 / −20 / +20 / −15 / −25, all verbatim; the last two are recorded and not applied, and " +
      "tunables says so. §12.3 EXCLUDES men engaged in blocks and on the ground where §12.4 merely " +
      "penalises them. ✅ SA-17 RULED (owner, July 2026): **§12.4 wins — PRICED PARTICIPATION " +
      "(−20 / −25), not exclusion**, so the engine's resolution direction was right and the two " +
      "cells should become APPLIED rather than merely recorded. ⛔ AND THE RULING FORBIDS DOING IT " +
      "STANDALONE: it is **folded into backlog entry 50**, which supersedes entry 6 and specifies " +
      "eligibility and BOTH rolls as one design. The reason is measurement, not process — with " +
      "§12.4's recovery roll never failing (0 failures in 1,474 attempts) and " +
      "`deflection_quality`'s `ratingSpan` exactly 0.000, a −25 applied on its own is DECORATIVE. " +
      "It would render as instrumentation and decide nothing, which is worse than the declared " +
      "absence it replaced.",
    finding: "SA-17",
  },
  {
    pattern: "tippedBall.recovery.traits.*",
    provenance: "DOC_VERBATIM",
    docRef: "§12.4",
    note: "Ball Hawk +15, High Point +10, Reliable Hands +10. `highPoint` is not in Appendix B and is not applied (ADR-009).",
  },

  // ---- §13 / §14 ball carrier ------------------------------------------------------------------
  {
    pattern: "ballCarrier.zones.3.widthYards",
    provenance: "TABLE_SHAPE",
    docRef: "§13.1",
    note:
      "⚠ §13.1's fourth row is 'ZONE 4 (30+ yards): Pursuit only' — an OPEN upper bound where the " +
      "three rows above it are closed intervals. The table demanded a width and 30 appeared. " +
      "Backlog entry 12 has already priced the consequence at −1.842 y/c alone and −6.293 jointly " +
      "with `freeRunReachesGoalLine`, i.e. 52.6% of the yards-per-carry gap. See SA-18.",
    finding: "SA-18",
  },
  {
    pattern: "ballCarrier.zones.*.widthYards",
    provenance: "DOC_VERBATIM",
    docRef: "§13.1",
    note: "5 / 10 / 15 give the doc's closed intervals 0-5, 5-15, 15-30 exactly.",
  },
  {
    pattern: "ballCarrier.zones.*.zone",
    provenance: "STRUCTURAL",
    docRef: "§13.1",
    note: "The zone's own index.",
  },
  {
    pattern: "ballCarrier.breakawayAfterZone",
    provenance: "DOC_VERBATIM",
    docRef: "§13.4",
    note: "'If receiver clears Zone 2 with separation'.",
  },
  {
    pattern: "ballCarrier.behindReachYards",
    provenance: "INTERPRETATION",
    docRef: "§13.1",
    note: "§13's zone table is forward-only; the covering corner at the catch point is behind it. Declared.",
  },
  {
    pattern: "ballCarrier.verticalDepthYards.*",
    provenance: "INTERPRETATION",
    docRef: "§3.2",
    note: "Representative depths inside §3.2's bands, for placing a standing defender in a §13.1 zone.",
  },
  {
    pattern: "ballCarrier.marginPerExtraYard",
    provenance: "INTERPRETATION",
    docRef: "§13.2 / §14.3",
    note: "Where a stated range lands inside itself, with no second die (ADR-004/005). Declared.",
  },
  {
    pattern: "ballCarrier.catchTransition.byAccuracyBand.MISS",
    provenance: "TABLE_SHAPE",
    docRef: "§13.2",
    note:
      "⚠ A MISS is not caught, so there is no catch transition to modify. The table is keyed by " +
      "accuracy band and every band needed a value. Same cluster as SA-01.",
    finding: "SA-01",
  },
  {
    pattern: "ballCarrier.catchTransition.byAccuracyBand.*",
    provenance: "DOC_VERBATIM",
    docRef: "§13.2",
    note: "+15 in stride / −15 off balance, mapped onto §10.4's bands (the mapping is declared).",
  },
  {
    pattern: "ballCarrier.catchTransition.byThrowType.*",
    provenance: "DOC_VERBATIM",
    docRef: "§13.2",
    note: "'Bullet pass caught: −5 to WR / Touch pass caught: +5 to WR'. Verbatim.",
  },
  {
    pattern: "ballCarrier.yacMultiplierByAccuracyBand.MISS",
    provenance: "TABLE_SHAPE",
    docRef: "§10.5",
    note: "⚠ §10.5's YAC Mod for MISS is 'N/A'. Same cluster as SA-01.",
    finding: "SA-01",
  },
  {
    pattern: "ballCarrier.yacMultiplierByAccuracyBand.*",
    provenance: "INTERPRETATION",
    docRef: "§10.5",
    note:
      "The column is qualitative — Full / slight / moderate / minimal / No YAC — so every number is " +
      "a reading. BAD→0 is the one faithful transcription ('No YAC'). Stacks with §13.2 by design " +
      "(backlog entry 15).",
  },
  {
    pattern: "ballCarrier.contests.yac.bands.0.minYards",
    provenance: "TABLE_SHAPE",
    docRef: "§13.2",
    note:
      "RULED NO-CHANGE (backlog 44, owner, July 2026) — the zone walk credits the yardage " +
      "separately, so a minimum here would double-count. Classified TABLE_SHAPE because the " +
      "PROVENANCE is not in dispute: §13.2's row is 'Defender missed, advance to Zone 2', a " +
      "destination and not a yardage. The ruling is about what to do, not about what the doc says.",
  },
  {
    pattern: "ballCarrier.contests.yac.bands.0.maxYards",
    provenance: "TABLE_SHAPE",
    docRef: "§13.2",
    note:
      "⏸ OPEN AND DEFERRED INTO THIS AUDIT (backlog 44 / ADR-037). REPORTED, NOT RULED: §13.2's " +
      "DEFENDER_MISSED row specifies NO yardage in either direction — it names a DESTINATION " +
      "('advance to Zone 2'). Both halves of this row are demanded by the table's rectangle. The " +
      "ceiling is a different claim from the floor and this audit does not make it.",
    finding: "SA-R2",
  },
  {
    pattern: "ballCarrier.contests.yac.bands.4.*",
    provenance: "DOC_DERIVED",
    docRef: "§13.2",
    note:
      "'Defender wins: Tackled at catch point'. 0/0 is ENTAILED by the prose — the catch point is " +
      "where he is — rather than demanded by the column. This is the distinction the register " +
      "exists to draw, and it is why bands.0 is TABLE_SHAPE and bands.4 is not.",
  },
  {
    pattern: "ballCarrier.contests.yac.bands.*.minYards",
    provenance: "DOC_VERBATIM",
    docRef: "§13.2",
    note: "3 / 1 / 0 from 'gain 3-5 yards', 'gain 1-2 yards', 'gain 0-1 yard'.",
  },
  {
    pattern: "ballCarrier.contests.yac.bands.*.maxYards",
    provenance: "DOC_VERBATIM",
    docRef: "§13.2",
    note: "5 / 2 / 1 from the same three rows.",
  },
  {
    pattern: "ballCarrier.contests.yac.bands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§13.2",
    note: "20 / 10 / 1 / 0 / −∞ encode the doc's five rows exactly.",
  },
  {
    pattern: "ballCarrier.contests.secondLevel.bands.0.minYards",
    provenance: "TABLE_SHAPE",
    docRef: "§14.4",
    note:
      "RULED NO-CHANGE (backlog 44). §14.4's row is 'Broken tackle, CONTINUE' — a continuation, not " +
      "a yardage. Provenance and ruling are separate; see the yac twin.",
  },
  {
    pattern: "ballCarrier.contests.secondLevel.bands.0.maxYards",
    provenance: "TABLE_SHAPE",
    docRef: "§14.4",
    note:
      "⏸ OPEN AND DEFERRED INTO THIS AUDIT (backlog 44 / ADR-037). REPORTED, NOT RULED: §14.4's " +
      "BROKEN_TACKLE row specifies NO yardage in either direction — 'RB wins by 15+: Broken " +
      "tackle, continue'. Demanded by the table's rectangle. This audit states that and stops.",
    finding: "SA-R2",
  },
  {
    pattern: "ballCarrier.contests.secondLevel.bands.2.*",
    provenance: "DOC_DERIVED",
    docRef: "§14.4",
    note: "'Defender wins: Tackled' — 0/0 entailed by the prose, as with the yac twin.",
  },
  {
    pattern: "ballCarrier.contests.secondLevel.bands.*.minYards",
    provenance: "DOC_VERBATIM",
    docRef: "§14.4",
    note: "2, from 'Partial tackle, gain 2-4 yards'.",
  },
  {
    pattern: "ballCarrier.contests.secondLevel.bands.*.maxYards",
    provenance: "DOC_VERBATIM",
    docRef: "§14.4",
    note: "4, from the same row.",
  },
  {
    pattern: "ballCarrier.contests.secondLevel.bands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§14.4",
    note: "15 / 1 / −∞ encode 'RB wins by 15+ / 1-14 / defender wins'. Backlog entry 13's subject.",
  },
  {
    pattern: "ballCarrier.contests.atLosPower.bands.*",
    provenance: "INTERPRETATION",
    docRef: "§14.3",
    note:
      "§14.3's STALEMATE row states one opposed roll ('RB Power vs. Tackler Tackling') and NO " +
      "result bands at all. The split at 1 and the 1-2 yards are the engine's, declared in tunables.",
  },
  {
    pattern: "ballCarrier.contests.atLosEvade.bands.*",
    provenance: "DOC_DERIVED",
    docRef: "§14.3",
    note: "'Success: RB avoids, reduced gain. Failure: TFL' — a binary at 1, with the loss in `tflYardsLost`.",
  },
  {
    pattern: "ballCarrier.contests.*",
    provenance: "DOC_VERBATIM",
    docRef: "§13.2 / §14.3 / §14.4 / §1.3",
    note: "The four profiles' attribute divisors, every one ÷5 as the doc writes them.",
  },
  {
    pattern: "ballCarrier.carrierTraits.*",
    provenance: "DOC_VERBATIM",
    docRef: "Appendix B",
    note: "'Power Runner: +10 to break tackles'.",
  },
  {
    pattern: "ballCarrier.tacklerTraits.*",
    provenance: "DOC_VERBATIM",
    docRef: "Appendix B / §4.9",
    note: "'High Motor: +5 to pursuit'.",
  },
  {
    pattern: "ballCarrier.pursuitAngle.*",
    provenance: "DOC_VERBATIM",
    docRef: "§14.4",
    note:
      "Target 50, Pursuit ÷5 + Instincts ÷5, and the RAW speed difference in the target — the " +
      "largest single term in the engine and, per backlog entry 14, almost certainly a doc slip. " +
      "Transcribed faithfully, §7.2's failure direction.",
  },
  {
    pattern: "ballCarrier.pursuitGateZones.*",
    provenance: "DOC_DERIVED",
    docRef: "§13.1 / §14.4",
    note: "§13.1 gates only zone 4 ('Pursuit only'); §14.4 gates the whole second level.",
  },
  {
    pattern: "ballCarrier.breakaway.traits.*",
    provenance: "DOC_VERBATIM",
    docRef: "Appendix B",
    note: "'Home Run Hitter: +15 to breakaway'.",
  },
  {
    pattern: "ballCarrier.breakaway.bands.*",
    provenance: "DOC_DERIVED",
    docRef: "§13.4",
    note: "15 / 1 / −∞ encode 'WR wins by 15+ / 1-14 / defender wins'.",
  },
  {
    pattern: "ballCarrier.breakaway.*",
    provenance: "DOC_VERBATIM",
    docRef: "§13.4 / §1.3",
    note: "Speed ÷5 + Acceleration ÷5 vs Speed ÷5 + Pursuit ÷5.",
  },
  {
    pattern: "ballCarrier.blockInSpace.profiles.CRACK.blockerBonus",
    provenance: "DOC_VERBATIM",
    docRef: "§13.3",
    note: "'CRACK BLOCK: +10 to block (defender not expecting)'.",
  },
  {
    pattern: "ballCarrier.blockInSpace.illegalCrackPenalty",
    provenance: "DOC_VERBATIM",
    docRef: "§13.3",
    note: "'−15 if illegal (blindside, low)'. Recorded and not applied — no blindside model. Declared.",
  },
  {
    pattern: "ballCarrier.blockInSpace.bands.*",
    provenance: "DOC_DERIVED",
    docRef: "§14.5",
    note: "10 / 0 / −∞ encode 'Blocker wins by 10+ / 1-9 / Defender wins'.",
  },
  {
    pattern: "ballCarrier.blockInSpace.traits.*",
    provenance: "DOC_VERBATIM",
    docRef: "Appendix B",
    note: "'Road Grader: +10 to pancakes'.",
  },
  {
    pattern: "ballCarrier.blockInSpace.*",
    provenance: "DOC_VERBATIM",
    docRef: "§13.3 / §14.5 / §1.3",
    note:
      "The three profiles' term divisors, every one ÷5, PLUS `LEAD.blockerBonus` and " +
      "`STALK.blockerBonus`, both 0 — the doc states a bonus for CRACK only (§13.3's '+10 to block, " +
      "defender not expecting', which has its own rule above) and none for the other two, so 0 " +
      "spells the absence rather than filling it. STALK carries §13.3's two-term defender stack " +
      "rather than §14.5's one — a doc-internal disagreement recorded in tunables and as backlog " +
      "entry 10. The two zeroes are named because the earlier note said 'divisors' and absorbed " +
      "eleven cells of which two are not divisors.",
  },

  // ---- §6 run block ----------------------------------------------------------------------------
  {
    pattern: "runBlock.doubleTeamBonus",
    provenance: "DOC_VERBATIM",
    docRef: "§6.3 step 3",
    note: "'Double team: +20 to OL'.",
  },
  {
    pattern: "runBlock.pullingBlockerPenalty",
    provenance: "DOC_VERBATIM",
    docRef: "§6.3 step 3",
    note: "'Pulling blocker in space: −10 to OL'.",
  },
  {
    pattern: "runBlock.pullingDefenderBonus",
    provenance: "DOC_VERBATIM",
    docRef: "§6.3 step 3",
    note: "'+10 to defender'.",
  },
  {
    pattern: "runBlock.traits.*",
    provenance: "DOC_VERBATIM",
    docRef: "Appendix B",
    note: "Road Grader +10, Run Stuffer +10.",
  },
  {
    pattern: "runBlock.bands.*",
    provenance: "DOC_VERBATIM",
    docRef: "§6.3 step 4",
    note:
      "20 / 1 / 0 / −19 / −∞ are §6.3's own thresholds. They disagree with §14.3's on the same " +
      "roll — backlog entry 9, a doc reconciliation and not a tuning choice.",
  },
  {
    pattern: "runBlock.gapIntegrity.bands.*",
    provenance: "INTERPRETATION",
    docRef: "§6.2",
    note: "§6.2 states the roll and no result table; the split at 0 is the engine's. Declared.",
  },
  {
    pattern: "runBlock.secondLevelClimb.*",
    provenance: "DOC_VERBATIM",
    docRef: "§6.4",
    note: "Trigger at +10, target 50, Awareness ÷5 + Sustain ÷5 vs LB Play Recognition ÷5. Verbatim.",
  },
  {
    pattern: "runBlock.*",
    provenance: "DOC_VERBATIM",
    docRef: "§6.3 / §6.2 / §1.3",
    note: "The term divisors, every one ÷5.",
  },

  // ---- §14 run game ----------------------------------------------------------------------------
  {
    pattern: "runGame.phaseTicks.openField",
    provenance: "DOC_GAP",
    docRef: "§14.2",
    note:
      "§14.2 names three phases and stops. There is no open-field phase in the doc; the engine " +
      "needs a tick to resolve §13.1's zone walk on. See SA-19.",
    finding: "SA-19",
  },
  {
    pattern: "runGame.phaseTicks.*",
    provenance: "INTERPRETATION",
    docRef: "§14.2",
    note:
      "⚠ tunables says these are §14.2's timeline 'read onto the §2.1 grid', each phase resolving " +
      "'on the tick it ends on'. §14.2's phases END at 1.0, 1.5 and 2.0; the cells are 0.5, 1.0 and " +
      "1.5. Two of the three contradict the stated rule. See SA-19.",
    finding: "SA-19",
  },
  {
    pattern: "runGame.vision.*",
    provenance: "DOC_VERBATIM",
    docRef: "§14.2 PHASE 3",
    note: "Target 50, Vision ÷5 + Patience ÷5. Verbatim.",
  },
  {
    pattern: "runGame.pointOfAttack.bands.0.*",
    provenance: "DOC_VERBATIM",
    docRef: "§14.3",
    note: "'HOLE OPEN (OL won by 10+): RB gains 3-5 yards before contact'. All three cells verbatim.",
  },
  {
    pattern: "runGame.pointOfAttack.bands.1.*",
    provenance: "DOC_VERBATIM",
    docRef: "§14.3",
    note: "'HOLE EXISTS (OL won by 1-9): RB gains 1-2 yards'. All three verbatim.",
  },
  {
    pattern: "runGame.pointOfAttack.bands.*",
    provenance: "DOC_DERIVED",
    docRef: "§14.3",
    note:
      "STALEMATE and PENETRATION carry 0/0 yards, entailed by 'Contact at LOS' and 'DL in " +
      "backfield' — the contact happens where he is. Not table-shape: the prose fixes the value.",
  },
  {
    pattern: "runGame.tflYardsLost",
    provenance: "DOC_GAP",
    docRef: "§14.3",
    note: "'Failure: TFL' with no distance anywhere in the doc. Backlog entry 16's twin invention.",
  },
  {
    pattern: "runGame.manDefenderDepthYards",
    provenance: "INTERPRETATION",
    docRef: "§3 / §14",
    note: "A spatial fake of entry 8's kind, declared in tunables (backlog entry 17).",
  },

  // ---- §17 result bookkeeping ------------------------------------------------------------------
  {
    pattern: "result.sackYardsLost",
    provenance: "DOC_GAP",
    docRef: "§7.2 / §17.2",
    note: "The doc states no sack yardage anywhere. Backlog entry 16; reclassified there as a doc gap, not a stub.",
  },
  {
    pattern: "result.touchdownPoints",
    provenance: "DOC_GAP",
    docRef: null,
    note: "The sport's, not the doc's — `match-engine.md` specifies a play and has no scoreboard.",
  },
  {
    pattern: "result.*",
    provenance: "DOC_GAP",
    docRef: null,
    note: "Dead-ball runoff and the first-down reset. No doc counterpart; the game loop needs them.",
  },

  // ---- chemistry (ADR-008) ---------------------------------------------------------------------
  {
    pattern: "chemistry.establishedAccuracyBonus",
    provenance: "DOC_VERBATIM",
    docRef: "§10.4",
    note: "'Chemistry with receiver: +5'.",
  },
  {
    pattern: "chemistry.backShoulderWithoutChemistry",
    provenance: "DOC_VERBATIM",
    docRef: "§10.2",
    note: "'Requires chemistry (else −10)'.",
  },
  {
    pattern: "chemistry.*",
    provenance: "INTERPRETATION",
    docRef: "§10.2 / §10.4 / ADR-008",
    note:
      "EN BLOC: the doc names chemistry as a MODIFIER and never as a QUANTITY, so every leaf here " +
      "is ADR-008's. Today that is the neutral level, the established threshold, the anticipation " +
      "exchange rate and `backShoulderThreshold` (65) — the last omitted by the earlier note, which " +
      "named three cells for a rule absorbing four.",
  },

  // ---- the game loop ---------------------------------------------------------------------------
  {
    pattern: "game.*",
    provenance: "OUT_OF_SCOPE",
    docRef: null,
    note:
      "DECLARED INVENTION EN BLOC by the tunables comment: `match-engine.md` specifies a PLAY and " +
      "has no drive, clock, kickoff, punt, field goal or scoreboard. Excluded from the doc-" +
      "conformance audit because there is no doc to conform to — NOT because it is unimportant. " +
      "84 numeric cells. The §15.2 two-minute rule is the one doc contact and it is a clock rule " +
      "the engine implements (`twoMinuteSeconds`).",
  },
];

// ---------------------------------------------------------------------------
// WHAT A WALK OF THE TABLE CANNOT SEE — the third failure direction
// ---------------------------------------------------------------------------

export interface MissingCell {
  readonly id: string;
  readonly docRef: string;
  /** The doc's own words. */
  readonly quote: string;
  readonly note: string;
}

/**
 * DOC MODIFIERS WITH NO CELL, NO RESOLVER AND NO DECLARED ABSENCE.
 *
 * **This list is the register's own blind spot, made loud.** `numericLeaves` walks a tree; a rule
 * the tree never got cannot be walked. Every entry below was found by reading the doc forwards
 * rather than by reading the table backwards, and that asymmetry is why the register alone is not
 * the audit.
 *
 * Excluded from this list, deliberately: modifiers the tunables tree records-but-does-not-apply
 * (`recovery.situational.backWasTurned`, `blockInSpace.illegalCrackPenalty`,
 * `tippedBall.weatherModifier`). Those are DECLARED absences with the doc's number preserved, which
 * is the behaviour this list exists to ask for.
 */
export const MISSING_CELLS: readonly MissingCell[] = [
  {
    id: "MC-01",
    docRef: "§7.1",
    quote: "Tie: Slight pressure, -5 to QB accuracy if all matchups are ties",
    note:
      "No tunable, no resolver term, no declared absence. `pocket.accuracyModifier` has four rungs " +
      "and none of them is this; `STALEMATE` floors at CLEAN and accrues 0. The one §7.1 result row " +
      "with a stated consequence that the engine does not produce.",
  },
  {
    id: "MC-02",
    docRef: "§10.2",
    quote: "BULLET PASS: Modifier: +10 to passing lane, -5 to catch / TOUCH PASS: -10 to passing lane, +10 to catch",
    note:
      "The LANE halves exist (`throwExec.lane.velocityModifier`, at §10.3's magnitudes). The CATCH " +
      "halves exist nowhere: `catching.routine` has no throw-type term and `catching.contested` has " +
      "none either. `ballCarrier.catchTransition.byThrowType` is §13.2's YAC modifier and a " +
      "different rule with different numbers (−5/+5).",
  },
  {
    id: "MC-03",
    docRef: "§10.4",
    quote: "On platform: +0 / Off platform (moving): -15 / Throwing across body: -10",
    note:
      "`resolveAccuracy` applies pocket status, poise, depth, throw type, arm shortfall and " +
      "chemistry. It has no platform term. The population is LIVE — a scrambling quarterback throws " +
      "off platform by construction, and §8.8's scramble drill exists. 'Across body' is legitimately " +
      "unmodellable without a horizontal field model and belongs with `backWasTurned`; 'off " +
      "platform' is not, and is the one of the three that should be a declared absence at minimum.",
  },
  {
    id: "MC-04",
    docRef: "§11.1 / §11.2",
    quote: "DIFFICULT CATCH: Diving, fully extended, or off-balance — -20 to catch roll — Spectacular Catch attribute applies",
    note:
      "One of §11.1's four catch types. `catchTypeFor` returns only CONTESTED or ROUTINE; there is " +
      "no difficult branch and no −20. Consequence for Mandate 2: `spectacularCatch` is in " +
      "`ATTRIBUTE_REGISTRY_V1`, is read by NO engine resolver and appears nowhere in `TUNABLES` " +
      "(checked both ways, per backlog entry 31 — a grep for `ATTR.x` cannot see a tunables string). " +
      "It survives only as a `defaultFrom` source for `jumping` in contracts. Same shape as `anchor` " +
      "before ADR-028: a kill/merge candidate arriving from a read rather than from a sweep.",
  },
  {
    id: "MC-05",
    docRef: "§11.2",
    quote: "Difficulty Modifiers: Routine +0, Adjustment needed +10, Diving +20, One-handed +25, Behind/high +15",
    note:
      "Three of the five appear as `throwExec.accuracy.bands[].difficulty`, re-keyed from CATCH TYPE " +
      "to ACCURACY BAND. 'One-handed +25' has no cell at all, and 'diving' / 'behind-high' now mean " +
      "'the throw was bad' rather than 'the catch was athletic'. The re-keying is undeclared.",
  },
  {
    id: "MC-06",
    docRef: "§3.3",
    quote: "Adjacent Zone: -10 to interaction rolls / Two Zones Away: -25 to interaction rolls",
    note:
      "§3.3 states a GENERAL adjacency penalty for every zone interaction. Nothing in `TUNABLES` " +
      "carries it. §12.4's proximity ladder (+25 / +10 / −10) is a different rule with different " +
      "numbers for one mechanic, and §3.3's is unimplemented everywhere else.",
  },
  {
    id: "MC-07",
    docRef: "§15.1 / §15.2 / §15.3",
    quote: "+10 to zone coverage effectiveness / -10 to deep routes / +10 to goal-line blocking / Audible success rate reduced -10 / Blocking success +10 / Defensive penetration +10",
    note:
      "§15's six situational modifiers have no cells and no declared absence. §15 is unimplemented " +
      "in full; unlike §16, which `tippedBall.weatherModifier` declares with zeroed keys, §15 is " +
      "silent. Red-zone and short-yardage behaviour is a Tier 1 metric family (red-zone TD %), so " +
      "this is an absence with a metric pointed at it.",
  },
];

// ---------------------------------------------------------------------------
// THE FINDINGS
// ---------------------------------------------------------------------------

export type FindingClass =
  /** The table holds a value the doc did not specify (ADR-036's direction). */
  | "TRANSCRIPTION_ARTIFACT"
  /** The doc says something and the engine transcribed it faithfully; the DOC is the defect (§7.2's direction). */
  | "DOC_DEFECT"
  /** Two doc sections say different things about the same check (backlog entry 9's class). */
  | "DOC_CONTRADICTION"
  /** The doc's rule has no cell at all. */
  | "SILENT_OMISSION"
  /** An engine interpretation whose consequence contradicts the doc's own words elsewhere. */
  | "INTERPRETATION_DRIFT"
  /** Reported for the owner; this audit is forbidden from ruling (backlog 44 / ADR-037). */
  | "REPORTED_NOT_RULED";

/**
 * WHERE A FINDING STANDS. Added July 2026, because ADR-040 ruled three of them at once and the
 * register had no way to say so except in prose — and `bandTables.ts`'s own lesson is that
 * **a shrinking finding count cannot tell a repaired engine from a loosened register.** A finding is
 * retired WITH ITS PROVENANCE, never deleted (`pocketLadder.ts`'s `retiredRed` discipline).
 */
export type FindingStatus =
  /** Reported; nobody has ruled. The audit's default and the only status that needs no citation. */
  | "OPEN"
  /** Ruled AND the engine holds the ruling today. */
  | "RULED_IMPLEMENTED"
  /** ⏳ Ruled and the engine change is OWED. The cells still hold their pre-ruling values. */
  | "RULED_OWED"
  /** ⛔ Ruled, and the ruling forbids implementing it standalone — it belongs to a larger design. */
  | "RULED_FOLDED";

/** A cell a ruling named, with the value it named for it. `applyTunablePatch`'s path language. */
export interface RuledValue {
  readonly path: string;
  readonly value: number;
}

export interface ScaleAuditFinding {
  readonly id: string;
  readonly klass: FindingClass;
  readonly docRef: string;
  readonly cells: readonly string[];
  readonly headline: string;
  readonly status: FindingStatus;
  /**
   * The ruling that produced a non-`OPEN` status. REQUIRED whenever `status !== "OPEN"` and
   * asserted in `docConformance.test.ts`: a finding cannot be marked ruled without naming who ruled
   * it, so "this was decided" can never become a thing somebody remembered.
   */
  readonly ruling?: string;
  /**
   * ================== THE VALUES THE RULING NAMED, PINNED ==================
   *
   * REQUIRED whenever `status !== "OPEN"`, and its path set must EQUAL `cells` — see
   * `auditFindingRulings`.
   *
   * ⚠ **THIS FIELD EXISTS BECAUSE A STORED RULING IS THE WEAKEST GUARD IN THE REPO AND NOTHING
   * CAUGHT IT DRIFTING.** Charter §4.1's newest corollary states the mechanism: *a pin that drifts
   * stops the build; a stored ruling that drifts keeps being cited.* One dispatch produced both
   * ends. `catching.contestedMaxOpenness`' type pin drifted and `pnpm typecheck` went **red**. This
   * register drifted and said **three false things authoritatively** — that SA-08's engine change
   * was unimplemented when it had landed, the superseded and unsatisfiable first ruling instead of
   * the re-ruled column, and that the compiler would not complain about a compiler that had. Every
   * test in this package stayed green, because **nothing compiles against a register.**
   *
   * So the ruled values stop being prose. Each is re-applied as a NO-OP `applyTunablePatch`, which
   * throws `TunablePatchError` when the tree no longer holds what the patch was written against —
   * `bandTables.ts`'s `assertRuledCellsCurrent` trick, and deliberately the same one, so the
   * staleness check is the ENGINE's and not a comparison restated here.
   *
   * **It is directional, and the OWED direction is the half that would have fired.** For
   * `RULED_IMPLEMENTED` and `RULED_FOLDED` the values are what the tree must hold. For `RULED_OWED`
   * they are what the tree must **NOT yet** hold in full: a finding that still calls itself owed
   * after every one of its cells has landed is a status that outlived its subject, which is exactly
   * what happened here for a dispatch.
   *
   * **What it does NOT check, said out loud (§4.1's eliminated-vs-bounded rule):** whether the
   * values are the RIGHT ones. That is a reading of the ADR that ruled them, and no derivation can
   * reach it. What is eliminated is a ruled value silently ceasing to describe the tree.
   */
  readonly ruledValues?: readonly RuledValue[];
}

/**
 * The dispatch's findings, keyed so the register's `finding` fields cannot name a finding that does
 * not exist (asserted in `docConformance.test.ts`, both directions).
 *
 * **Prices live in the memo and in `scaleAudit.measure.test.ts`, not here.** A finding record that
 * carried a number would be a second source of truth about a measurement (§4.1's derivation
 * corollary), and this project has already been bitten by prose sitting beside machine-checked
 * numbers (backlog entry 33).
 */
export const SCALE_AUDIT_FINDINGS: readonly ScaleAuditFinding[] = [
  {
    id: "SA-01",
    status: "OPEN",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§10.5 / §13.2",
    cells: [
      "throwExec.accuracy.bands.6.catchMod",
      "throwExec.accuracy.bands.6.defenderContestMod",
      "throwExec.accuracy.bands.6.difficulty",
      "ballCarrier.catchTransition.byAccuracyBand.MISS",
      "ballCarrier.yacMultiplierByAccuracyBand.MISS",
    ],
    headline:
      "Five cells keyed on the MISS accuracy band, where §10.5 writes 'No catch possible | N/A | " +
      "N/A'. ADR-036's cell in three more tables.",
  },
  {
    id: "SA-02",
    status: "OPEN",
    klass: "DOC_CONTRADICTION",
    docRef: "§7.3 vs Appendix C",
    cells: ["stunt.target"],
    headline: "§7.3 puts the OL communication check at 60; Appendix C puts communication at 40-50.",
  },
  {
    id: "SA-03",
    status: "OPEN",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§9.1 / §9.2",
    cells: ["release.bands.6.delaySeconds"],
    headline:
      "§9.1's seventh row is prose with no delay; the column demanded one and 2.0s appeared — " +
      "double §9.2's stated jam ceiling.",
  },
  {
    id: "SA-04",
    status: "OPEN",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§7.2",
    cells: ["pocket.readCapacityDelta.COLLAPSING", "pocket.readCapacityDelta.IMMEDIATE"],
    headline:
      "§7.2 states a read-capacity penalty for POCKET PRESSURE only; the status-keyed table " +
      "produced two more.",
  },
  {
    id: "SA-05",
    status: "OPEN",
    klass: "INTERPRETATION_DRIFT",
    docRef: "§8.8",
    cells: ["scramble.target"],
    headline:
      "§8.8 states an opposed roll 'vs. Pursuit'; the engine's escape check reads no defender " +
      "attribute at all.",
  },
  {
    id: "SA-06",
    status: "OPEN",
    klass: "DOC_DEFECT",
    docRef: "§8.7 / §9.1 / §9.2",
    cells: ["qb.timeBudget.baseSeconds", "qb.timeBudget.divisor", "route.decayStartsAtSeconds"],
    headline:
      "The doc writes four more durations in TICKS and the engine reads all of them as SECONDS. " +
      "§7.4's identical ambiguity carries an authoring correction; these do not.",
  },
  {
    id: "SA-07",
    status: "OPEN",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§9.2",
    cells: ["route.readySeconds.DEEP"],
    headline: "§9.2 gives DEEP a range (2.5-3.0); the table took the fast end with no note.",
  },
  {
    id: "SA-08",
    status: "RULED_IMPLEMENTED",
    ruling:
      "owner ruling, July 2026, RE-RULED twice: ADR-043 refused the original four-cell list as " +
      "unsatisfiable; ADR-045 §2.1/§2.2 landed the column across BOTH producers; ADR-045 §2.3a " +
      "amended `CB_IN_PHASE` 25 → 22 to break the tie the ruled column created",
    klass: "DOC_CONTRADICTION",
    docRef: "§9.3 + §9.4 vs §8.4",
    cells: [
      "manCoverage.bands.0.openness",
      "manCoverage.bands.1.openness",
      "manCoverage.bands.2.openness",
      "manCoverage.bands.3.openness",
      "manCoverage.bands.4.openness",
      "manCoverage.bands.5.openness",
      "manCoverage.bands.6.openness",
      "manCoverage.bands.7.openness",
      "zoneCoverage.bands.0.openness",
      "zoneCoverage.bands.1.openness",
      "zoneCoverage.bands.2.openness",
      "zoneCoverage.bands.3.openness",
      "zoneCoverage.uncoveredOpenness",
    ],
    ruledValues: [
      // §9.3 — 70 / 52 / 38 / 30 / 25 / 22 / 15 / 6, strictly decreasing since §2.3a. The last two
      // are HELD by the ruling, and a hold is a ruling: the owner's standing instruction was that
      // if rows 7-8 did not fit beneath 22 monotonically that came back as a QUESTION rather than
      // being solved by compression. They fit, so they are pinned where they sat.
      { path: "manCoverage.bands.0.openness", value: 70 },
      { path: "manCoverage.bands.1.openness", value: 52 },
      { path: "manCoverage.bands.2.openness", value: 38 },
      { path: "manCoverage.bands.3.openness", value: 30 },
      { path: "manCoverage.bands.4.openness", value: 25 },
      { path: "manCoverage.bands.5.openness", value: 22 },
      { path: "manCoverage.bands.6.openness", value: 15 },
      { path: "manCoverage.bands.7.openness", value: 6 },
      // §9.4 — the second producer, which no type could see. `DEFENDER_IN_LANE` (20) names no §8.4
      // band and `uncoveredOpenness` (90) is not a §9.4 row; both HELD.
      { path: "zoneCoverage.bands.0.openness", value: 70 },
      { path: "zoneCoverage.bands.1.openness", value: 52 },
      { path: "zoneCoverage.bands.2.openness", value: 38 },
      { path: "zoneCoverage.bands.3.openness", value: 20 },
      { path: "zoneCoverage.uncoveredOpenness", value: 90 },
    ],
    headline:
      "§9.3 calls 1-2 yards of separation 'contested' and 3-4 yards 'open'; §8.4's scale calls the " +
      "engine's values for those rows 'open' and 'wide open'. RULED: the LABELS move one band down " +
      "onto §8.4's five existing bands, §8.4's scale does not change, and 'contested' leaves the " +
      "openness vocabulary for §11.1. ⚠ IT WAS RECORDED HERE AS FOUR CELLS IN ONE TABLE AND IT IS " +
      "NEITHER: the four-cell list was arithmetically unsatisfiable (ADR-043), and §9.4 states its " +
      "bands in §8.4's WORDS, so it produces the same scale and had to move with it — a coupling " +
      "no type can see, found by reading. IMPLEMENTED across both tables, with " +
      "`catching.contestedMaxOpenness` carried by its compiler pin (SA-14).",
  },
  {
    id: "SA-09",
    status: "RULED_IMPLEMENTED",
    ruling: "owner ruling on ADR-039; implemented in ADR-040 §1",
    klass: "DOC_DEFECT",
    docRef: "§8.3",
    cells: [
      "qb.awarenessVariance.baseHalfWidth",
      "qb.awarenessVariance.divisor",
      "qb.awarenessVariance.baseline",
    ],
    ruledValues: [
      { path: "qb.awarenessVariance.baseHalfWidth", value: 10 },
      { path: "qb.awarenessVariance.divisor", value: 5 },
      { path: "qb.awarenessVariance.baseline", value: 70 },
    ],
    headline:
      "§8.3 says the awareness term 'reduces variance range' and its own worked examples SHIFT THE " +
      "MEAN instead. Faithfully transcribed; an elite QB was systematically optimistic. FIXED: the " +
      "awareness term now sets the band's HALF-WIDTH, centred on the truth. ⚠ Backlog entry 49's " +
      "first member — on flat-60 the term is a constant with zero variance, so calibration DECLINES " +
      "to say whether the football improved.",
  },
  {
    id: "SA-10",
    status: "OPEN",
    klass: "INTERPRETATION_DRIFT",
    docRef: "§8.5",
    cells: ["qb.decision.bands.3.poolFrom", "qb.decision.bands.4.poolFrom"],
    headline: "'May take suboptimal' implemented as 'cannot take the best'.",
  },
  {
    id: "SA-11",
    status: "OPEN",
    klass: "INTERPRETATION_DRIFT",
    docRef: "§8.4 / §10.2",
    cells: ["throwExec.typeSelection.tightWindowMaxOpenness"],
    headline: "Two cells meaning 'tight window' with 50 in both, compared inclusively in one and exclusively in the other.",
  },
  {
    id: "SA-12",
    status: "OPEN",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§10.1",
    cells: ["throwExec.armRequirements.0.minArmStrength", "throwExec.armRequirements.1.minArmStrength"],
    headline:
      "§10.1's six throw-type rows became two air-yard rows and the doc's strictest gate (85) has " +
      "no cell.",
  },
  {
    id: "SA-13",
    status: "RULED_IMPLEMENTED",
    ruling: "owner ruling on ADR-039; implemented in ADR-040 §2",
    klass: "DOC_CONTRADICTION",
    docRef: "§10.2 vs §10.3",
    cells: ["throwExec.lane.velocityModifier.BULLET"],
    ruledValues: [{ path: "throwExec.lane.velocityModifier.BULLET", value: 10 }],
    headline:
      "The bullet's passing-lane modifier is +10 in §10.2 and +15 in §10.3; and the engine's " +
      "throw-type→angle mapping made a TOUCH pass harder to deflect than a bullet, which §10.2 " +
      "contradicts in words. FIXED both halves: §10.2's 10 wins, and the angle is re-keyed onto " +
      "contest GEOMETRY so the ordering is a property of the velocity numbers alone. ⚠ §10.3's " +
      "table in the design doc still reads +15 — an Orchestrator edit, outstanding.",
  },
  {
    id: "SA-14",
    status: "RULED_IMPLEMENTED",
    ruling:
      "owner ruling on ADR-039, implemented in ADR-040 §3 at 40; RE-RULED to 30 and RATIFIED in " +
      "ADR-045 §4.1a as a DERIVATION carried by its anchor, not a threshold choice",
    klass: "INTERPRETATION_DRIFT",
    docRef: "§11.1 / §9.3",
    cells: ["catching.contestedMaxOpenness"],
    ruledValues: [{ path: "catching.contestedMaxOpenness", value: 30 }],
    headline:
      "§11.1 makes a catch contested when a defender is within one yard; the engine's threshold " +
      "left a DEAD-EVEN coverage rep uncontested. Fixed at 40, DERIVED from §9.3's half-yard row " +
      "and compiler-pinned to it — then carried to 30 when SA-08 moved that row. The pin made this " +
      "finding a DEPENDENT of SA-08 and the dependency is NOT silent: `pnpm typecheck` went red " +
      "until the threshold followed, which is the strongest available form of the " +
      "non-separability claim. Reclassification nil at both values.",
  },
  {
    id: "SA-15",
    status: "OPEN",
    klass: "SILENT_OMISSION",
    docRef: "§16.1",
    cells: ["tippedBall.weatherModifier.DOME_CLEAR"],
    headline:
      "The weather key set cannot express two of §16.1's rows, so the comment's claim that wiring " +
      "§16 is 'a value change, not a code change' is false.",
  },
  {
    id: "SA-16",
    status: "OPEN",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§12.3",
    cells: ["tippedBall.qualityBands.5.speedCheckFromDistance"],
    headline: "The cell ADR-036 left behind, in the same row it emptied.",
  },
  {
    id: "SA-17",
    status: "RULED_FOLDED",
    ruling: "owner ruling, July 2026 — §12.4 wins; folded into backlog entry 50",
    klass: "DOC_CONTRADICTION",
    docRef: "§12.3 vs §12.4",
    cells: [
      "tippedBall.recovery.situational.engagedInBlock",
      "tippedBall.recovery.situational.onGround",
    ],
    // ⛔ FOLDED, so what is pinned is §12.4's own numbers sitting RECORDED-AND-NOT-APPLIED. If
    // either moves, the ruling that said "priced participation, not exclusion, but not standalone"
    // has to be re-made against whatever the new number means rather than inherited by it.
    ruledValues: [
      { path: "tippedBall.recovery.situational.engagedInBlock", value: -20 },
      { path: "tippedBall.recovery.situational.onGround", value: -25 },
    ],
    headline:
      "§12.3 EXCLUDES blocked and grounded players from recovery; §12.4 gives them modifiers. " +
      "RULED for §12.4 — priced participation, not exclusion. ⛔ MUST NOT BE IMPLEMENTED " +
      "STANDALONE: with the recovery roll never failing and `deflection_quality`'s ratingSpan " +
      "exactly 0.000, a −25 would be decorative — it would LOOK instrumented. Folded into backlog " +
      "entry 50, which supersedes entry 6 and specifies eligibility and both rolls as one design.",
  },
  {
    id: "SA-18",
    status: "OPEN",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§13.1",
    cells: ["ballCarrier.zones.3.widthYards"],
    headline:
      "§13.1's zone 4 is '30+ yards', an open bound; the table demanded a width. Already the " +
      "largest measured yardage term in the project.",
  },
  {
    id: "SA-19",
    status: "OPEN",
    klass: "INTERPRETATION_DRIFT",
    docRef: "§14.2",
    cells: [
      "runGame.phaseTicks.lineBattle",
      "runGame.phaseTicks.secondLevel",
      "runGame.phaseTicks.rbDecision",
      "runGame.phaseTicks.openField",
    ],
    headline:
      "tunables says each phase 'resolves on the tick it ends on'; two of three resolve on the tick " +
      "they START on, and a fourth phase exists that §14.2 does not name.",
  },
  {
    id: "SA-R2",
    status: "OPEN",
    klass: "REPORTED_NOT_RULED",
    docRef: "§13.2 / §14.4",
    cells: [
      "ballCarrier.contests.yac.bands.0.maxYards",
      "ballCarrier.contests.secondLevel.bands.0.maxYards",
    ],
    headline:
      "Backlog 44's two OPEN cells, read against the doc as ADR-037 required. Both are demanded by " +
      "the table's rectangle; neither is specified. NO VALUE IS PROPOSED — the ruling is the owner's.",
  },
];

// ---------------------------------------------------------------------------
// THE TOTALITY ASSERTION
// ---------------------------------------------------------------------------

export interface RegisterAudit {
  readonly census: LeafCensus;
  /**
   * ⚠ **NO LONGER "EVERY CELL A RULE MATCHED" — OWNER RULING, July 2026.** A prefix rule is a
   * classification that cannot be wrong, so a cell it matched has been ABSORBED, not classified.
   * This is `classifiedNarrow + classifiedUniform`, and the absorbed population is reported beside
   * it rather than folded into it.
   */
  readonly classified: number;
  /** Cells matched by a rule with NO trailing `*` — one rule, one cell, a claim that can be wrong. */
  readonly classifiedNarrow: number;
  /** Cells under a trailing-`*` rule listed in `UNIFORM_REGIONS` — a prefix claim that generalises. */
  readonly classifiedUniform: number;
  /**
   * ⛔ **THE UNCLASSIFIED REGION WEARING A CLASSIFICATION'S NAME.** Cells matched only by a prefix
   * rule that has NOT earned `UNIFORM`. Reported, pinned as a set, and deliberately NOT required to
   * be empty: the honest state of the register is that a third of the tree is in here, and hiding
   * that inside `classified` is what let ADR-048's seven cells through.
   */
  readonly absorbed: readonly string[];
  /** `UNIFORM_REGIONS` entries whose pattern is not a live block rule. MUST be empty. */
  readonly danglingUniformRegions: readonly string[];
  /** Numeric leaves no rule matched. MUST be empty. */
  readonly unclassified: readonly string[];
  /** Rules no leaf matched. MUST be empty — a stale rule is a register that has drifted. */
  readonly deadRules: readonly string[];
  readonly byProvenance: ReadonlyMap<Provenance, number>;
  /** Every cell classified `TABLE_SHAPE` — the RIDER 1 population. */
  readonly tableShapeCells: readonly string[];
  /** `finding` ids named by rules but absent from `SCALE_AUDIT_FINDINGS`. MUST be empty. */
  readonly danglingFindings: readonly string[];
  /** Findings whose `cells` name a path that is not in the tree. MUST be empty. */
  readonly danglingCells: readonly string[];
}

export function auditRegister(tunables: Tunables = DEFAULT_TUNABLES): RegisterAudit {
  const leaves = numericLeaves(tunables);
  const paths = new Set(leaves.map((l) => l.path));
  const unclassified: string[] = [];
  const absorbed: string[] = [];
  const hit = new Set<string>();
  const byProvenance = new Map<Provenance, number>();
  const tableShapeCells: string[] = [];
  const uniform = new Set(UNIFORM_REGIONS.map((r) => r.pattern));
  let classifiedNarrow = 0;
  let classifiedUniform = 0;

  for (const leaf of leaves) {
    const rule = classify(leaf.path);
    if (rule === undefined) {
      unclassified.push(leaf.path);
      continue;
    }
    hit.add(rule.pattern);
    byProvenance.set(rule.provenance, (byProvenance.get(rule.provenance) ?? 0) + 1);
    if (rule.provenance === "TABLE_SHAPE") tableShapeCells.push(leaf.path);
    // ⛔ THE OWNER'S RULING, applied at the point of counting. A prefix match is not a classification
    // unless the rule has argued that its note generalises.
    if (!isBlockRule(rule)) classifiedNarrow += 1;
    else if (uniform.has(rule.pattern)) classifiedUniform += 1;
    else absorbed.push(leaf.path);
  }

  const blockPatterns = new Set(REGISTER.filter(isBlockRule).map((r) => r.pattern));
  const danglingUniformRegions = UNIFORM_REGIONS.map((r) => r.pattern).filter(
    (p) => !blockPatterns.has(p),
  );

  const deadRules = REGISTER.filter((r) => !hit.has(r.pattern)).map((r) => r.pattern);
  const findingIds = new Set(SCALE_AUDIT_FINDINGS.map((f) => f.id));
  const danglingFindings = [
    ...new Set(
      REGISTER.map((r) => r.finding).filter(
        (id): id is string => id !== undefined && !findingIds.has(id),
      ),
    ),
  ];
  const danglingCells = SCALE_AUDIT_FINDINGS.flatMap((f) => f.cells).filter((c) => !paths.has(c));

  return {
    census: leafCensus(tunables),
    classified: classifiedNarrow + classifiedUniform,
    classifiedNarrow,
    classifiedUniform,
    absorbed,
    danglingUniformRegions,
    unclassified,
    deadRules,
    byProvenance,
    tableShapeCells,
    danglingFindings,
    danglingCells,
  };
}

// ---------------------------------------------------------------------------
// UNIFORM REGIONS — the owner's ruling on prefix rules (July 2026)
// ---------------------------------------------------------------------------

/**
 * ================== ⛔ A RULE WHOSE PREDICATE CANNOT FAIL IS NOT A RULE ==================
 *
 * **OWNER RULING, July 2026, on the ADR-048 finding:**
 *
 * > *What would make `route.*` go red? **Nothing — it matches by prefix.** A prefix rule is a
 * > classification that cannot be wrong, which means it classifies nothing. **Treat every catch-all
 * > in `REGISTER` as an UNCLASSIFIED REGION WEARING A CLASSIFICATION'S NAME.***
 *
 * So `auditRegister` no longer folds prefix-matched cells into `classified`. They are a **distinct
 * reported population** (`absorbed`), and the totality identity is
 * `classifiedNarrow + classifiedUniform + absorbed + unclassified === census.numbers`.
 *
 * ================== THE DEFAULT IS "ABSORBED", AND THAT IS THE DESIGN ==================
 *
 * A trailing-`*` rule is **ABSORBING unless it is listed below**. Silence means *not classified* —
 * the conservative reading — so a block rule added tomorrow cannot be forgotten into a false green.
 * Claiming a prefix rule is honest is an **explicit act with a written argument**, which is the
 * owner's *"say which, and say why the note is true of every member rather than assuming it."*
 *
 * ================== THE TEST EVERY ENTRY BELOW HAD TO PASS ==================
 *
 * > **Would the rule's note still be true of a member added TOMORROW?**
 *
 * That is the only question, and it separates two things that look identical in a register:
 *
 *   - a note that argues about the **SUBTREE** — *"the doc specifies nothing in this block, so every
 *     number here is engine structure"* — stays true of a cell nobody has written yet. **UNIFORM.**
 *   - a note that argues about a **LIST** — *"the two ÷5 divisors"*, *"15 / 5 / 1 / 0 / −14 / −∞
 *     encode the doc's six rows"* — is a claim about the cells that existed when it was written, and
 *     a new sibling inherits it without ever being read. **ABSORBING**, however correct the note is
 *     about its current members.
 *
 * ⚠ **AN ABSORBING RULE IS NOT A WRONG RULE.** Most of the fifty-odd below the line are accurate
 * today. The finding is that their accuracy is not *defended by anything*, and ADR-048 is what that
 * costs: seven cells entered `route.*` wearing `STRUCTURAL` / *"openness clamps"* and the totality
 * gate stayed green.
 *
 * ⚠ **AND `UNIFORM` IS NOT AN EXEMPTION FROM READING.** It is a claim that the note's ARGUMENT
 * generalises, not that any particular cell is right. `blockRuleAbsorptionPins` pins every block
 * rule's cell set either way, so a cell arriving in a UNIFORM region is still visible at the rule
 * that owns it — the difference is only whether the register counts it as classified.
 */
export interface UniformRegion {
  /** Must equal a live trailing-`*` `RegisterRule.pattern`, asserted — no dangling claims. */
  readonly pattern: string;
  /** Why the note generalises to a member added tomorrow. The argument, not a restatement. */
  readonly why: string;
}

/**
 * The sweep the owner ordered, with a verdict and an argument per catch-all.
 *
 * **32 of 85 block rules earn UNIFORM. The other 53 are absorbing regions** and are listed in
 * `docConformance.test.ts`'s pinned `absorbed` population, which is the register saying out loud how
 * much of the tunables tree it has NOT actually classified.
 *
 * The shape of the answer is worth stating because it is not what a reader would guess: **almost
 * every UNIFORM region is one where the DOC SAYS NOTHING.** *"§7.2's KNOWN ISSUE box says there is no
 * arrival model, so every number in this block is engine structure"* generalises perfectly, because
 * the doc's silence covers cells nobody has written yet. Whereas nearly every `DOC_VERBATIM` block
 * rule is ABSORBING, because a transcription is inherently a claim about the rows that were there to
 * transcribe. **The register is on firmest ground exactly where the doc is emptiest**, which is the
 * opposite of the intuition, and it is why the absorbed population is dominated by `DOC_VERBATIM`.
 */
export const UNIFORM_REGIONS: readonly UniformRegion[] = [
  {
    pattern: "resultTierLadder.*",
    why:
      "The claim is that the doc has NO universal margin ladder and this is contracts vocabulary. " +
      "True of any rung added later, because the doc's silence is the argument.",
  },
  {
    pattern: "passRush.pressureProgressByBand.*",
    why:
      "§7.2 describes its statuses qualitatively and gives no counter at all. Any per-band delta " +
      "added later is the engine's mechanism for the same reason — the absence covers the block.",
  },
  {
    pattern: "blitzPickup.recognitionModifier.*",
    why:
      "§5.3 says 'protection adjusted' and gives no magnitude. Any modifier keyed on recognition is " +
      "the engine expressing a gate as a number, which is the note's whole content.",
  },
  {
    pattern: "blitzPickup.freeRunnerPath.*",
    why:
      "The note's own words are 'the doc contains no table here at all; EVERY number is invented " +
      "structure'. A subtree claim, and ADR-030/031 ratified it as one.",
  },
  {
    pattern: "blitzPickup.bands.*",
    why: "§7.4 step 3 states one opposed roll and NO result table, so every row of the split is engine structure.",
  },
  {
    pattern: "arrival.*",
    why:
      "§7.2's own KNOWN ISSUE box says the doc has no arrival model. The note says 'every number in " +
      "this block is engine structure filling that gap' — the strongest form of a subtree argument.",
  },
  {
    pattern: "pocket.severity.*",
    why:
      "Every member is a RANK in an ordered enum, which is what the note claims. A new status gets a " +
      "rank and the claim holds; the ORDER itself is gated separately by `knownTruth/pocketLadder.ts`.",
  },
  {
    pattern: "pocket.thresholds.*",
    why: "The doc has no accumulated-pressure counter, so every entry requirement for it is the engine's.",
  },
  {
    pattern: "pocketMovement.*",
    why:
      "§7.2 names the MOVE branch in one clause and specifies nothing about it; §8.8 defers to a " +
      "phase the doc never writes. The note's 'entirely engine structure' is about the branch.",
  },
  {
    pattern: "scramble.visionConeByDepthClass.*",
    why:
      "The standing claim is that the doc's cone is SPATIAL and the slice has no horizontal model, " +
      "so depth class stands in for it. True of any depth class added to the table.",
  },
  {
    pattern: "scramble.*",
    why:
      "§8.8 specifies nothing ('See Phase 6 for full resolution', a phase the doc never writes), so " +
      "every remaining `scramble` leaf is engine judgement. Re-noted EN BLOC at ADR-048.",
  },
  {
    pattern: "route.contestGain.byContest.*",
    why:
      "§8.7's amendment says in terms that 'the rate mapping is the engine's to DERIVE'. That is a " +
      "claim about the MAPPING, so a rate for a contest class added later is INTERPRETATION on the " +
      "identical argument. ⚠ The UNIT it is a multiple of is pinned by " +
      "`route.opennessGainPerTick`'s own DOC_VERBATIM rule, not by this one.",
  },
  {
    pattern: "zoneCoverage.readQb.disguise.*",
    why:
      "'QB Disguise' names no registry attribute and cannot be a 0-99 rating on this target " +
      "(ADR-009). Any term the engine builds to stand in for it inherits exactly that argument.",
  },
  {
    pattern: "qb.readSystem.*",
    why:
      "§8.1 gives each system a read rate and a progression depth and NOTHING else. Every other " +
      "per-system number is the engine's, whichever system or field it is added for.",
  },
  {
    pattern: "qb.anticipation.*",
    why: "The anticipation mechanic is not in the design document at all (backlog 2b). The whole block is invention.",
  },
  {
    pattern: "qb.poise.*",
    why:
      "§4.1 gives Poise a PURPOSE and no exchange rate. Any number converting Poise into relief from " +
      "pressure is therefore the engine's, which is the note's argument rather than its list.",
  },
  {
    pattern: "throwExec.armRequirements.*",
    why:
      "The note is a FINDING about the table's SHAPE — §10.1 has six rows keyed by throw type and " +
      "the engine has two keyed by air yards. Any cell in this table is part of that finding, which " +
      "is why it is anchored here rather than to a cell.",
  },
  {
    pattern: "tippedBall.heightStepsByThrowType.*",
    why: "Throw height is not modelled and §12.2 requires it; every step in this table is the declared derivation.",
  },
  {
    pattern: "tippedBall.weatherModifier.*",
    why:
      "The whole block is zeroed because §16 is unimplemented. A weather row added later is zeroed " +
      "for the same reason, and the note already carries the caveat about what un-zeroing costs.",
  },
  {
    pattern: "ballCarrier.verticalDepthYards.*",
    why:
      "Every member is a REPRESENTATIVE depth inside a §3.2 band, chosen to place a standing " +
      "defender in a §13.1 zone. The claim is about the role of the number, not its value.",
  },
  {
    pattern: "ballCarrier.catchTransition.byAccuracyBand.*",
    why:
      "§13.2 gives two magnitudes ('+15 in stride', '−15 off balance') and the engine MAPS them onto " +
      "§10.4's bands. The declared mapping is the claim and it covers any band.",
  },
  {
    pattern: "ballCarrier.yacMultiplierByAccuracyBand.*",
    why:
      "The doc's column is qualitative (Full / slight / moderate / minimal / No YAC), so — the note's " +
      "own words — 'every number is a reading'. A subtree claim.",
  },
  {
    pattern: "ballCarrier.contests.yac.bands.4.*",
    why:
      "The row is 'Defender wins: Tackled at catch point'. The prose ENTAILS the whole row's " +
      "geometry, so any cell describing where that tackle happens is doc-derived by the same sentence.",
  },
  {
    pattern: "ballCarrier.contests.secondLevel.bands.2.*",
    why: "'Defender wins: Tackled' — the yac twin, same entailment, same argument.",
  },
  {
    pattern: "ballCarrier.contests.atLosPower.bands.*",
    why:
      "§14.3's STALEMATE row states one opposed roll and NO result bands. Every band here, present " +
      "or future, is the engine supplying a table the doc does not have.",
  },
  {
    pattern: "ballCarrier.pursuitGateZones.*",
    why:
      "The claim is which zones the DOC gates (§13.1 zone 4 'Pursuit only'; §14.4 the whole second " +
      "level). A zone added to either list is read off the same two sentences.",
  },
  {
    pattern: "runBlock.gapIntegrity.bands.*",
    why: "§6.2 states the roll and no result table; every band of the split is the engine's, declared.",
  },
  {
    pattern: "runGame.phaseTicks.*",
    why:
      "The note is a FINDING about the whole timeline — §14.2's phases END at 1.0/1.5/2.0 and the " +
      "engine resolves each on the tick it ends on. A phase added later joins the same finding.",
  },
  {
    pattern: "result.*",
    why: "Dead-ball runoff and the down machinery have NO doc counterpart; the game loop needs them. Subtree.",
  },
  {
    pattern: "chemistry.*",
    why:
      "The doc names chemistry as a MODIFIER and never as a QUANTITY, so every number here is " +
      "ADR-008's. Re-noted EN BLOC at ADR-048 after the earlier note listed three of four cells.",
  },
  {
    pattern: "game.*",
    why:
      "DECLARED INVENTION EN BLOC: `match-engine.md` specifies a PLAY and has no drive, clock, " +
      "kickoff, punt, field goal or scoreboard. 71 cells, and the exclusion is the register's oldest.",
  },
  {
    pattern: "throwExec.lane.angleModifier.*",
    why:
      "⚠ THE ONE UNIFORM CLAIM THAT IS NOT ABOUT DOC SILENCE, and it is here because SA-13 was " +
      "found in this table. §10.3 states an angle for every lane class the type admits ('over " +
      "defender +20, past defender +0, through zone −10') and `Record<LaneAngle, number>` closes the " +
      "key set at compile time, so a fourth member cannot arrive without a contracts change that " +
      "reddens the compiler first. ⚠ THE NOTE ALSO CARRIES SA-13's LESSON: the three VALUES were " +
      "verbatim before and after ADR-040 and the defect was entirely in WHICH of them got selected — " +
      "a string-valued mapping this register is still blind to (backlog 51).",
  },
];

// ---------------------------------------------------------------------------
// BLOCK-RULE ABSORPTION — the instrument ADR-048 proved was missing
// ---------------------------------------------------------------------------

/**
 * ================== ⚠ A CATCH-ALL CLASSIFICATION RULE IS A STALE-INHERITANCE VECTOR ==================
 *
 * ADR-048 added seven cells under `route.contestGain.*`. The catch-all `route.*` — `STRUCTURAL`,
 * §8.4, *"Openness clamps at §8.4's 0-100 scale"* — matched all seven and reported them
 * **classified**. `unclassified` was empty. `deadRules` was empty. **The totality gate was green,
 * and the note was false of every one of the seven.**
 *
 * Apply backlog entry 55's diagnostic to `route.*` as it stood: *what would make this rule go red?*
 *
 * > **NOTHING. It matches by prefix.** A block rule cannot go stale by CHANGING — it goes stale by
 * > **ABSORBING**, and it reports an absorbed cell as *classified*, which is byte-for-byte
 * > indistinguishable from *correctly classified*.
 *
 * That is entry 47's second shape — *a claim still reading true while pointing at something new* —
 * living inside the instrument built to detect it. `numericLeafPathDigest` DID redden (ADR-041's
 * pair working exactly as designed) but it reddens for the whole tree at once and names no rule, so
 * the remedy it invites is *re-record the digest*, and re-recording a digest re-reads nothing.
 *
 * ================== WHAT THIS ADDS, AND WHAT WOULD MAKE IT GO RED (entry 55) ==================
 *
 * For every rule whose pattern ends in a TRAILING `*` — the only rules that can absorb — this
 * records the SET of cells it actually owns, as a digest, **attributed to the rule**. The pin lives
 * in `docConformance.test.ts` as one line per block rule.
 *
 * | | |
 * |---|---|
 * | **stated subject** | which cells each block rule's note is a claim ABOUT |
 * | **what reddens it** | a numeric leaf entering or leaving the interior of a named block rule — including a **net-zero swap inside one rule**, which the global census cannot see, and including a cell moving between two block rules, which the global digest cannot see either |
 * | **what does NOT redden it** | a rule's note being wrong about cells it has owned all along. That is a READING, it has no instrument, and this file's header says so. This pin makes ABSORPTION loud; it does not make a misreading loud |
 * | **what does NOT redden it, second** | a cell arriving under a NARROW rule. Those are already covered — a new path with no rule is `unclassified`, a deleted path leaves a `deadRule` |
 *
 * **The remedy on red is stated so it cannot be discharged by transcription:** the failing line
 * names the pattern; call `absorbedBy(pattern)` on both trees, diff the cell sets, and **re-read
 * that rule's note against the cells it now owns**. Re-recording the digest without doing that
 * reproduces exactly the ADR-048 defect, one dispatch later.
 */
export interface BlockRuleAbsorption {
  readonly pattern: string;
  readonly provenance: Provenance;
  /** Every numeric leaf for which this rule is the FIRST match — the cells its note claims to describe. */
  readonly cells: readonly string[];
  /** FNV-1a over `cells`, same construction as `numericLeafPathDigest`. */
  readonly digest: string;
}

/** FNV-1a over an ordered list of strings. The digest construction shared with `numericLeafPathDigest`. */
function digestPaths(paths: readonly string[]): string {
  let h = 0x811c9dc5;
  for (const path of paths) {
    for (let i = 0; i < path.length; i++) {
      h ^= path.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= 0x0a;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fnv1a:${h.toString(16).padStart(8, "0")}`;
}

/** True for a rule that can ABSORB — a trailing `*` matches one or more unnamed segments. */
function isBlockRule(rule: RegisterRule): boolean {
  const p = rule.pattern.split(".");
  return p[p.length - 1] === "*";
}

/**
 * The block rules that have NOT earned `UNIFORM` — the register's own to-do list, in `REGISTER`
 * order. Every one is an unclassified region wearing a classification's name; the list shrinks when
 * a rule's note is rewritten as a subtree argument, or when its cells are named individually.
 */
export function absorbingBlockRules(): readonly string[] {
  const uniform = new Set(UNIFORM_REGIONS.map((r) => r.pattern));
  return REGISTER.filter((r) => isBlockRule(r) && !uniform.has(r.pattern)).map((r) => r.pattern);
}

/**
 * The absorbed POPULATION as a set rather than a size — §4.1's count-blindness corollary applied to
 * the one population the register admits it has not classified. A net-zero swap inside the absorbed
 * region holds the count and moves this.
 */
export function absorbedCellDigest(tunables: Tunables = DEFAULT_TUNABLES): string {
  return digestPaths([...auditRegister(tunables).absorbed].sort());
}

/** The cells a single rule owns, by pattern. The diff tool the failing pin points at. */
export function absorbedBy(pattern: string, tunables: Tunables = DEFAULT_TUNABLES): readonly string[] {
  return numericLeafPaths(tunables).filter((path) => classify(path)?.pattern === pattern);
}

/** Every block rule with the cell set it owns, in `REGISTER` order. */
export function blockRuleAbsorption(
  tunables: Tunables = DEFAULT_TUNABLES,
  register: readonly RegisterRule[] = REGISTER,
): readonly BlockRuleAbsorption[] {
  const paths = numericLeafPaths(tunables);
  const owned = new Map<string, string[]>();
  for (const path of paths) {
    const rule = classifyIn(register, path);
    if (rule === undefined) continue;
    const list = owned.get(rule.pattern);
    if (list === undefined) owned.set(rule.pattern, [path]);
    else list.push(path);
  }
  return register.filter(isBlockRule).map((rule) => {
    const cells = owned.get(rule.pattern) ?? [];
    return { pattern: rule.pattern, provenance: rule.provenance, cells, digest: digestPaths(cells) };
  });
}

/**
 * The pinnable form: one line per block rule, `pattern :: provenance :: n :: digest`.
 *
 * The count rides along for legibility ONLY. It is the digest that is the claim — §4.1's
 * count-blindness corollary applies here exactly as it does to the census, and a net-zero swap
 * inside one block is the case ADR-041 was written about.
 */
export function blockRuleAbsorptionPins(
  tunables: Tunables = DEFAULT_TUNABLES,
  register: readonly RegisterRule[] = REGISTER,
): readonly string[] {
  return blockRuleAbsorption(tunables, register).map(
    (a) => `${a.pattern} :: ${a.provenance} :: ${String(a.cells.length)} :: ${a.digest}`,
  );
}

// ---------------------------------------------------------------------------
// THE RULING-STALENESS ASSERTION — Charter §4.1's inverted audit priority
// ---------------------------------------------------------------------------

/**
 * ================== WHY THIS EXISTS, IN ONE SENTENCE ==================
 *
 * > **A pin that drifts stops the build; a stored ruling that drifts keeps being cited.**
 *
 * `auditRegister` above eliminates an unclassified cell and a dead rule. It says NOTHING about
 * whether a `RULED_*` status still describes the engine, and that is the gap this closes: SA-08 sat
 * at `RULED_OWED` — *"the cells still hold their pre-ruling values"* — for a dispatch after every
 * one of its cells had moved, and the whole package stayed green. **The three false sentences it
 * carried were found by a human reading the file, and by nothing else.**
 *
 * The check is directional because the failure is:
 *
 *   - `RULED_IMPLEMENTED` / `RULED_FOLDED` — every ruled value must be what the tree holds. A no-op
 *     `applyTunablePatch` per cell, so the staleness check is the ENGINE's own and this file holds
 *     no second copy of the comparison.
 *   - `RULED_OWED` — the ruled values are what the tree must NOT hold in full. If every cell has
 *     landed, the status is stale and `owedButLanded` names the finding. **This is the arm that
 *     would have fired**, and it is the one with no natural test case, so `docConformance.test.ts`
 *     runs it against a synthetic finding it must fail on (§4.1: an instrument with no failing case
 *     is not yet an instrument).
 *
 * And it pins the SET, not the size: `cellSetMismatch` requires `cells` and `ruledValues` to name
 * the same paths, so a ruling whose scope grew — SA-08's did, from four cells in one table to
 * thirteen across two — cannot go on quoting the narrower list while reading true.
 */
export interface FindingRulingAudit {
  /** Non-`OPEN` findings carrying no `ruledValues`. MUST be empty. */
  readonly unpinned: readonly string[];
  /** `OPEN` findings carrying `ruledValues` — a pin without a ruling behind it. MUST be empty. */
  readonly overPinned: readonly string[];
  /** `"<id> <path>"` where `cells` and `ruledValues` disagree in either direction. MUST be empty. */
  readonly cellSetMismatch: readonly string[];
  /** `"<id> <path>"` naming a path that is not a numeric leaf of the tree. MUST be empty. */
  readonly danglingRuledPaths: readonly string[];
  /**
   * `"<id> <path>: ruled X, tree Y"` for a landed status whose cell has moved. MUST be empty —
   * carries `TunablePatchError`'s message where the engine produced one.
   */
  readonly drifted: readonly string[];
  /**
   * `RULED_OWED` findings every one of whose cells already holds its ruled value. MUST be empty:
   * the work is done and the status has outlived its subject.
   */
  readonly owedButLanded: readonly string[];
}

export function auditFindingRulings(
  findings: readonly ScaleAuditFinding[] = SCALE_AUDIT_FINDINGS,
  tunables: Tunables = DEFAULT_TUNABLES,
): FindingRulingAudit {
  const live = new Map(numericLeaves(tunables).map((l) => [l.path, l.value] as const));
  const unpinned: string[] = [];
  const overPinned: string[] = [];
  const cellSetMismatch: string[] = [];
  const danglingRuledPaths: string[] = [];
  const drifted: string[] = [];
  const owedButLanded: string[] = [];

  for (const f of findings) {
    const pinned = f.ruledValues;
    if (f.status === "OPEN") {
      if (pinned !== undefined) overPinned.push(f.id);
      continue;
    }
    if (pinned === undefined || pinned.length === 0) {
      unpinned.push(f.id);
      continue;
    }

    const pinnedPaths = new Set(pinned.map((r) => r.path));
    const declared = new Set(f.cells);
    for (const p of pinnedPaths) if (!declared.has(p)) cellSetMismatch.push(`${f.id} ${p}`);
    for (const c of declared) if (!pinnedPaths.has(c)) cellSetMismatch.push(`${f.id} ${c}`);

    let allLanded = true;
    for (const cell of pinned) {
      const held = live.get(cell.path);
      if (held === undefined) {
        danglingRuledPaths.push(`${f.id} ${cell.path}`);
        allLanded = false;
        continue;
      }
      if (held !== cell.value) allLanded = false;
      if (f.status === "RULED_OWED") continue;
      // The staleness check is the engine's: a no-op patch, which throws on a stale `currentValue`.
      try {
        applyTunablePatch(tunables, {
          tunableId: cell.path,
          currentValue: cell.value,
          proposedValue: cell.value,
          evidence:
            `DOC-CONFORMANCE REGISTER — staleness check for finding ${f.id} ` +
            `(${f.status}; ${f.ruling ?? "no ruling cited"}). A no-op patch: it proposes the value ` +
            `it finds, and exists only so that a ruling cannot outlive its subject.`,
          expectedEffect: "none — the proposed value is the current value",
        });
      } catch (error) {
        drifted.push(
          `${f.id} ${cell.path}: ruled ${String(cell.value)}, tree ${String(held)} — ` +
            `${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    if (f.status === "RULED_OWED" && allLanded) owedButLanded.push(f.id);
  }

  return { unpinned, overPinned, cellSetMismatch, danglingRuledPaths, drifted, owedButLanded };
}
