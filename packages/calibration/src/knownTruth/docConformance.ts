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
 * **NOT ELIMINATED, AND THIS IS THE IMPORTANT HALF:** whether a classification is *correct*. Each
 * rule is a hand-authored claim about what the design document says, and Charter §4.1 records that
 * in this repo **hand-enumerated lists have been wrong every single time they have been checked**.
 * The completeness is machine-checked; the readings are not, and they must be re-read rather than
 * inherited. Where a reading is load-bearing it cites the doc line so the next reader can falsify it
 * in one lookup rather than re-deriving it.
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
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";

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
 */
export function numericLeaves(tunables: Tunables = DEFAULT_TUNABLES): readonly NumericLeaf[] {
  const out: NumericLeaf[] = [];
  const walk = (node: unknown, path: string): void => {
    if (typeof node === "number") {
      out.push({ path, value: node });
      return;
    }
    if (typeof node !== "object" || node === null) return;
    for (const key of Object.keys(node as Record<string, unknown>)) {
      walk((node as Record<string, unknown>)[key], path === "" ? key : `${path}.${key}`);
    }
  };
  walk(tunables, "");
  return out;
}

export interface LeafCensus {
  readonly numbers: number;
  readonly strings: number;
  readonly booleans: number;
}

/** The whole leaf population, by type, so the register's denominator is visible. */
export function leafCensus(tunables: Tunables = DEFAULT_TUNABLES): LeafCensus {
  let numbers = 0;
  let strings = 0;
  let booleans = 0;
  const walk = (node: unknown): void => {
    if (typeof node === "number") numbers += 1;
    else if (typeof node === "string") strings += 1;
    else if (typeof node === "boolean") booleans += 1;
    else if (typeof node === "object" && node !== null) {
      for (const key of Object.keys(node as Record<string, unknown>)) {
        walk((node as Record<string, unknown>)[key]);
      }
    }
  };
  walk(tunables);
  return { numbers, strings, booleans };
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
  | "OUT_OF_SCOPE";

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
  return REGISTER.find((rule) => matches(rule, path));
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
    note: "SHORT 0-10, INTERMEDIATE 10-20, DEEP 20-35 as inclusive upper bounds. Verbatim.",
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
  {
    pattern: "arrival.pressureWithinSeconds",
    provenance: "INTERPRETATION",
    docRef: "§7.2 as amended (limb a)",
    note:
      "ADR-031 named a constant-by-omission. POS_INF reproduces the prior behaviour exactly and is " +
      "the widest reading of the amended limb (a). Narrowing it is an open football question both " +
      "ADR-030 and ADR-031 declined.",
  },
  {
    pattern: "arrival.*",
    provenance: "INTERPRETATION",
    docRef: "§7.2 KNOWN ISSUE (missing time-of-arrival model)",
    note:
      "The doc has no arrival model — its own KNOWN ISSUE box says so. Every number in this block " +
      "is engine structure filling that gap, declared as such in tunables.",
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
  {
    pattern: "scramble.*",
    provenance: "INTERPRETATION",
    docRef: "§8.8",
    note:
      "Bands, edge penalty, urgency slope, openness gain, pursuit clock: §8.8 gives none of them " +
      "('See Phase 6 for full resolution', a phase the doc never writes).",
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
  {
    pattern: "route.*",
    provenance: "STRUCTURAL",
    docRef: "§8.4",
    note: "Openness clamps at §8.4's 0-100 scale.",
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
      "The doc states outcomes in words and §8.4 supplies the 0-100 scale; the mapping between them " +
      "is the engine's. Declared.",
  },
  {
    pattern: "zoneCoverage.*",
    provenance: "INTERPRETATION",
    docRef: "§9.4 / §8.7",
    note:
      "Uncovered openness and the settled-decay knob. The latter is the largest behavioural knob " +
      "added by the zone pass (backlog 8a) and is marked INTERPRETATION in tunables.",
  },

  // ---- §9.3 man coverage -----------------------------------------------------------------------
  {
    pattern: "manCoverage.bands.*.minMargin",
    provenance: "DOC_DERIVED",
    docRef: "§9.3",
    note: "30 / 20 / 10 / 1 / 0 / −9 / −19 / −∞ encode the doc's eight rows exactly.",
  },
  {
    pattern: "manCoverage.bands.2.openness",
    provenance: "INTERPRETATION",
    docRef: "§9.3 + §8.4",
    note:
      "⚠ §9.3 labels this row '1-2 yards separation (CONTESTED)' and §8.4's scale calls 55 'open' " +
      "(50-69). The two sections disagree about the same rep, and the engine sits on §8.4's side. " +
      "See SA-08.",
    finding: "SA-08",
  },
  {
    pattern: "manCoverage.bands.1.openness",
    provenance: "INTERPRETATION",
    docRef: "§9.3 + §8.4",
    note:
      "⚠ §9.3 labels this row '3-4 yards separation (OPEN)' and §8.4 calls 70 'wide open' (70+). " +
      "One band optimistic, same class as bands.2. See SA-08.",
    finding: "SA-08",
  },
  {
    pattern: "manCoverage.bands.*.openness",
    provenance: "INTERPRETATION",
    docRef: "§9.3 + §8.4",
    note: "Separation-in-yards mapped onto §8.4's openness scale. Declared in tunables.",
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
    pattern: "qb.awarenessVariance.*",
    provenance: "DOC_VERBATIM",
    docRef: "§8.3",
    note:
      "⚠ 'd20 − 10, modified by + (QB Awareness − 70) ÷ 5' transcribed exactly — including the " +
      "fact that the doc CALLS it variance narrowing and its own worked examples make it a MEAN " +
      "SHIFT. §7.2's failure direction: the doc is wrong and the engine is faithful. See SA-09.",
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
    docRef: "§10.3",
    note:
      "⚠ §10.3 says 'Bullet: +15'; §10.2 says the bullet's modifier is '+10 to passing lane'. The " +
      "doc contradicts itself and the engine took §10.3. See SA-13.",
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
    note: "Over defender +20, past defender +0, through zone −10. Verbatim.",
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
    docRef: "§11.1",
    note:
      "⚠ §11.1 defines a contested catch as 'defender within 1 yard'. 30 on §8.4's scale excludes " +
      "§9.3's EVEN_BRACKET (openness 32, a dead-even rep — zero yards) and SEPARATION_HALF_YARD " +
      "(40, half a yard), both of which the doc's own words make contested. See SA-14.",
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
      "tunables says so. ⚠ §12.3 EXCLUDES men engaged in blocks and on the ground where §12.4 " +
      "merely penalises them — a doc-internal contradiction the engine resolved toward §12.4. See SA-17.",
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
      "The three profiles' term divisors. STALK carries §13.3's two-term defender stack rather than " +
      "§14.5's one — a doc-internal disagreement recorded in tunables and as backlog entry 10.",
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
      "The doc names chemistry as a modifier and never as a quantity: the neutral level, the " +
      "established threshold and the anticipation exchange rate are all ADR-008's.",
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

export interface ScaleAuditFinding {
  readonly id: string;
  readonly klass: FindingClass;
  readonly docRef: string;
  readonly cells: readonly string[];
  readonly headline: string;
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
    klass: "DOC_CONTRADICTION",
    docRef: "§7.3 vs Appendix C",
    cells: ["stunt.target"],
    headline: "§7.3 puts the OL communication check at 60; Appendix C puts communication at 40-50.",
  },
  {
    id: "SA-03",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§9.1 / §9.2",
    cells: ["release.bands.6.delaySeconds"],
    headline:
      "§9.1's seventh row is prose with no delay; the column demanded one and 2.0s appeared — " +
      "double §9.2's stated jam ceiling.",
  },
  {
    id: "SA-04",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§7.2",
    cells: ["pocket.readCapacityDelta.COLLAPSING", "pocket.readCapacityDelta.IMMEDIATE"],
    headline:
      "§7.2 states a read-capacity penalty for POCKET PRESSURE only; the status-keyed table " +
      "produced two more.",
  },
  {
    id: "SA-05",
    klass: "INTERPRETATION_DRIFT",
    docRef: "§8.8",
    cells: ["scramble.target"],
    headline:
      "§8.8 states an opposed roll 'vs. Pursuit'; the engine's escape check reads no defender " +
      "attribute at all.",
  },
  {
    id: "SA-06",
    klass: "DOC_DEFECT",
    docRef: "§8.7 / §9.1 / §9.2",
    cells: ["qb.timeBudget.baseSeconds", "qb.timeBudget.divisor", "route.decayStartsAtSeconds"],
    headline:
      "The doc writes four more durations in TICKS and the engine reads all of them as SECONDS. " +
      "§7.4's identical ambiguity carries an authoring correction; these do not.",
  },
  {
    id: "SA-07",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§9.2",
    cells: ["route.readySeconds.DEEP"],
    headline: "§9.2 gives DEEP a range (2.5-3.0); the table took the fast end with no note.",
  },
  {
    id: "SA-08",
    klass: "DOC_CONTRADICTION",
    docRef: "§9.3 vs §8.4",
    cells: ["manCoverage.bands.1.openness", "manCoverage.bands.2.openness"],
    headline:
      "§9.3 calls 1-2 yards of separation 'contested' and 3-4 yards 'open'; §8.4's scale calls the " +
      "engine's values for those rows 'open' and 'wide open'.",
  },
  {
    id: "SA-09",
    klass: "DOC_DEFECT",
    docRef: "§8.3",
    cells: ["qb.awarenessVariance.divisor", "qb.awarenessVariance.baseline"],
    headline:
      "§8.3 says the awareness term 'reduces variance range' and its own worked examples SHIFT THE " +
      "MEAN instead. Faithfully transcribed; an elite QB is systematically optimistic.",
  },
  {
    id: "SA-10",
    klass: "INTERPRETATION_DRIFT",
    docRef: "§8.5",
    cells: ["qb.decision.bands.3.poolFrom", "qb.decision.bands.4.poolFrom"],
    headline: "'May take suboptimal' implemented as 'cannot take the best'.",
  },
  {
    id: "SA-11",
    klass: "INTERPRETATION_DRIFT",
    docRef: "§8.4 / §10.2",
    cells: ["throwExec.typeSelection.tightWindowMaxOpenness"],
    headline: "Two cells meaning 'tight window' with 50 in both, compared inclusively in one and exclusively in the other.",
  },
  {
    id: "SA-12",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§10.1",
    cells: ["throwExec.armRequirements.0.minArmStrength", "throwExec.armRequirements.1.minArmStrength"],
    headline:
      "§10.1's six throw-type rows became two air-yard rows and the doc's strictest gate (85) has " +
      "no cell.",
  },
  {
    id: "SA-13",
    klass: "DOC_CONTRADICTION",
    docRef: "§10.2 vs §10.3",
    cells: ["throwExec.lane.velocityModifier.BULLET"],
    headline:
      "The bullet's passing-lane modifier is +10 in §10.2 and +15 in §10.3; and the engine's " +
      "throw-type→angle mapping makes a TOUCH pass harder to deflect than a bullet, which §10.2 " +
      "contradicts in words.",
  },
  {
    id: "SA-14",
    klass: "INTERPRETATION_DRIFT",
    docRef: "§11.1 / §9.3",
    cells: ["catching.contestedMaxOpenness"],
    headline:
      "§11.1 makes a catch contested when a defender is within one yard; the engine's threshold " +
      "leaves a DEAD-EVEN coverage rep uncontested.",
  },
  {
    id: "SA-15",
    klass: "SILENT_OMISSION",
    docRef: "§16.1",
    cells: ["tippedBall.weatherModifier.DOME_CLEAR"],
    headline:
      "The weather key set cannot express two of §16.1's rows, so the comment's claim that wiring " +
      "§16 is 'a value change, not a code change' is false.",
  },
  {
    id: "SA-16",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§12.3",
    cells: ["tippedBall.qualityBands.5.speedCheckFromDistance"],
    headline: "The cell ADR-036 left behind, in the same row it emptied.",
  },
  {
    id: "SA-17",
    klass: "DOC_CONTRADICTION",
    docRef: "§12.3 vs §12.4",
    cells: [
      "tippedBall.recovery.situational.engagedInBlock",
      "tippedBall.recovery.situational.onGround",
    ],
    headline: "§12.3 EXCLUDES blocked and grounded players from recovery; §12.4 gives them modifiers.",
  },
  {
    id: "SA-18",
    klass: "TRANSCRIPTION_ARTIFACT",
    docRef: "§13.1",
    cells: ["ballCarrier.zones.3.widthYards"],
    headline:
      "§13.1's zone 4 is '30+ yards', an open bound; the table demanded a width. Already the " +
      "largest measured yardage term in the project.",
  },
  {
    id: "SA-19",
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
  readonly classified: number;
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
  const hit = new Set<string>();
  const byProvenance = new Map<Provenance, number>();
  const tableShapeCells: string[] = [];

  for (const leaf of leaves) {
    const rule = classify(leaf.path);
    if (rule === undefined) {
      unclassified.push(leaf.path);
      continue;
    }
    hit.add(rule.pattern);
    byProvenance.set(rule.provenance, (byProvenance.get(rule.provenance) ?? 0) + 1);
    if (rule.provenance === "TABLE_SHAPE") tableShapeCells.push(leaf.path);
  }

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
    classified: leaves.length - unclassified.length,
    unclassified,
    deadRules,
    byProvenance,
    tableShapeCells,
    danglingFindings,
    danglingCells,
  };
}
