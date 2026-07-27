/**
 * TUNABLES — every target number, band threshold, weight and trait bonus the
 * pass-play slice uses. Calibration adjusts this object; resolution code holds
 * no magic numbers.
 *
 * Each block cites the section of docs/design/match-engine.md it implements.
 * Where the design doc is qualitative ("CB in phase", "route disrupted"), the
 * numeric expression of that outcome lives here under a descriptive key and is
 * marked INTERPRETATION so calibration knows it is a knob, not a doc quote.
 *
 * TWO KINDS OF STRINGLY-TYPED REFERENCE LIVE IN HERE, and both are checked:
 *  - attribute ids (`{ attr: "poise" }`, `speedAttr: "speed"`) are resolved
 *    against `ATTRIBUTE_REGISTRY_V1` at module load by `src/attrs.ts`'s sweep,
 *    which walks this whole object generically. An id the registry does not
 *    define throws at import, not mid-simulation;
 *  - `checkKind` fields are `satisfies CheckKind`, so a value contracts does not
 *    define fails to compile HERE, at the site that is wrong, rather than at the
 *    resolver that reads it (R9).
 */
import type { CheckKind } from "@ff/contracts";

const NEG_INF = Number.NEGATIVE_INFINITY;

export const TUNABLES = {
  /**
   * QB↔RECEIVER CHEMISTRY — live as of ADR-008.
   *
   * Chemistry is **pair state**: it belongs to a (quarterback, receiver) PAIR, it
   * accrues over a season of reps, and it is not a property of either player.
   * ADR-008 ratified `ChemistryPair`/`ChemistryTable` in `@ff/contracts` as
   * franchise-owned state delivered to the engine RESOLVED, the same way
   * attribute maps are. The engine reads `MatchGameState.chemistry` and never
   * writes it; an absent table, an absent passer, or an absent pair all read
   * `neutralLevel`, so migration is a genuine no-op.
   *
   * The doc's two exchange rates are now consumed rather than merely recorded:
   * §10.4's "+5 chemistry with receiver" and §10.2's back-shoulder −10.
   */
  chemistry: {
    /** ADR-008: 50 is "a competent pairing with no particular history". */
    neutralLevel: 50,
    /**
     * §8.1 anticipation term: `(level − neutralLevel) ÷ divisor`. The doc gives
     * no exchange rate for chemistry-on-anticipation (anticipation is not in the
     * doc at all), so this is the knob. At /5 a 0-chemistry pair is −10 and a
     * 100-chemistry pair +10 on a target of 55 — comparable to the reading
     * system's own ±10-15, which is the intended magnitude: knowing the man is
     * worth about as much as the system you were taught.
     */
    anticipationDivisor: 5,
    /** §10.4 verbatim: "Chemistry with receiver: +5", above the threshold below. */
    establishedAccuracyBonus: 5,
    /**
     * INTERPRETATION — the doc says "chemistry with receiver", not "how much".
     * This is the level at which a pairing counts as ESTABLISHED. Set above
     * neutral so the bonus is earned rather than default.
     */
    establishedThreshold: 65,
    /**
     * §10.2 verbatim: the back-shoulder throw "requires chemistry (else −10)".
     * WIRED AND DORMANT: `selectThrowType` never returns BACK_SHOULDER today, so
     * this term is reachable only when §10.2's throw-type selection grows the
     * branch. It is applied in `resolveAccuracy` rather than held in reserve, so
     * the day the branch exists the penalty is already correct.
     */
    backShoulderWithoutChemistry: -10,
    /** The level at or above which a back-shoulder throw is "with chemistry". */
    backShoulderThreshold: 65,
  },

  /** §2.1 — 0.5s ticks. Times are expressed in seconds, matching the doc's tick labels. */
  clock: {
    tickStepSeconds: 0.5,
    firstTick: 0.5,
    /** Hard stop; a play that reaches this without resolving is a coverage sack. */
    maxTick: 6.0,
  },

  /**
   * Generic 9-tier ladder (contracts ResultTier) applied to every check's margin.
   * The doc's own per-check result bands are separate, named band tables below.
   */
  resultTierLadder: [
    { label: "CRITICAL_SUCCESS", minMargin: 30 },
    { label: "STRONG_SUCCESS", minMargin: 15 },
    { label: "SUCCESS", minMargin: 5 },
    { label: "MARGINAL_SUCCESS", minMargin: 1 },
    { label: "TIE", minMargin: 0 },
    { label: "MARGINAL_FAILURE", minMargin: -4 },
    { label: "FAILURE", minMargin: -14 },
    { label: "STRONG_FAILURE", minMargin: -29 },
    { label: "CRITICAL_FAILURE", minMargin: NEG_INF },
  ],

  /** Appendix B trait bonuses. Only the ones this slice can fire are consumed. */
  traitBonuses: {
    pressSpecialist: 15,      // CB press roll
    shutdown: 10,             // CB man coverage roll
    routeTechnician: 10,      // WR man coverage (route running) roll
    reliableHands: 10,        // WR catch roll
    ballHawk: 15,             // DB contested-catch roll (doc: "+15 to INT attempts")
    quickTwitch: 10,          // DL first step — applied on SPEED rushes only
    brickWall: 10,            // OL anchor — INTERPRETATION: applied vs POWER rushes only
    pocketAwareness: 10,      // QB sensing pressure — INTERPRETATION: see qb.pressureSensing
  },

  /** §7.1 — per-tick rusher vs. blocker opposed roll. */
  passRush: {
    rusherAttrDivisor: 5,
    blockerAttrDivisor: 5,
    /**
     * INTERPRETATION — not in the doc's table. §7.1 gives the rusher two or
     * three attribute terms and the blocker two, which makes an even matchup
     * favour the rush by ~15 points and collapses every pocket inside 1.5s.
     * This flat term represents protection's structural edge (extra blockers,
     * depth of the drop, the rusher having ground to cover). It is the primary
     * pressure-rate dial for calibration; set it to 0 for the raw doc formula.
     */
    blockerStructuralAdvantage: 15,
    /** "Counter move: +15 if previous tick was stalemate". */
    counterMoveAfterStalemate: 15,
    /** Which rush move each conditional trait bonus attaches to. */
    quickTwitchMove: "SPEED",
    brickWallMove: "POWER",
    /** Margin = rusher total − blocker total. */
    bands: [
      { label: "RUSHER_WINS_REP", minMargin: 15 },
      { label: "RUSHER_GAINING", minMargin: 1 },
      { label: "STALEMATE", minMargin: 0 },
      { label: "BLOCKER_CONTAINS", minMargin: -14 },
      { label: "BLOCKER_RESETS", minMargin: NEG_INF },
    ],
    /**
     * §7.2 — pressure accrues per rusher. INTERPRETATION: the doc describes
     * statuses qualitatively; this counter is the mechanism that produces them.
     * A blocker win by 15+ ("rusher reset, starts fresh") zeroes the counter.
     */
    pressureProgressByBand: {
      RUSHER_WINS_REP: { delta: 2, reset: false },
      RUSHER_GAINING: { delta: 1, reset: false },
      STALEMATE: { delta: 0, reset: false },
      BLOCKER_CONTAINS: { delta: 0, reset: false },
      BLOCKER_RESETS: { delta: 0, reset: true },
    },
  },

  /**
   * §7.2 — RUSHER TIME OF ARRIVAL. A won rep does not put a rusher on the
   * quarterback; it starts him TRAVELLING. Winning by 15+ creates a threat with
   * an ETA, and the QB has the intervening ticks to respond (throw, climb,
   * escape). Without this, COLLAPSING and SACK are the same state.
   *
   * The travel time is a PHYSICAL quantity, not a pressure dial:
   *  - An interior rusher who defeats a guard is ~4-5 yards from a shotgun
   *    launch point on a straight line. He is on top of the passer almost at
   *    once, and he collapses the very space a step-up would use.
   *  - An edge rusher who wins outside has depth and an ARC to run — 10-12
   *    yards to a spot the QB has already vacated by dropping.
   * The asymmetry is the point: interior pressure is worth more than edge
   * pressure, and it falls out of these numbers rather than being asserted.
   *
   * No die is rolled here (ADR-005): the ETA is a deterministic function of the
   * §7.1 rep that the stream already carries — alignment, move, and the winning
   * margin — so it is reconstructible from the CHECK that produced it.
   */
  arrival: {
    /** Seconds from the won rep to the quarterback. Rows: alignment; cols: §7.1 move. */
    travelSecondsByAlignmentAndMove: {
      INTERIOR: { SPEED: 1.0, POWER: 1.0, FINESSE: 1.0 },
      /** A speed rush IS the arc; a bull rush walks the tackle back on a straighter line. */
      EDGE: { SPEED: 2.0, POWER: 1.5, FINESSE: 1.5 },
    },
    /**
     * INTERPRETATION: a rusher who obliterates a blocker is past him cleanly and
     * arrives sooner than one who scrapes a win. Every this many points of
     * margin ABOVE the RUSHER_WINS_REP threshold shaves one half-tick.
     *
     * Sized against the actual margin distribution, not by feel. §7.1 margins are
     * a difference of two d100s, so on an evenly-matched rep P(margin ≥ 15) ≈ .36
     * while P(margin ≥ 65) ≈ .06 — a half-tick shave should be the top sixth of
     * won reps, not the top half of them. At 25 it fired on more than half of all
     * won reps and turned "beat his man" into "unblocked", which is what a value
     * chosen by feel does.
     */
    dominanceMarginPerHalfTick: 50,
    /**
     * A threat is not frozen at the instant it was created. §7.1's "blocker wins
     * by 1-14: rusher contained" is the tackle recovering position and riding him
     * past the launch point — the rusher is still coming, but from further away.
     * Seconds added to the ETA by the FOLLOWING tick's rep, per band.
     * (BLOCKER_RESETS does not appear: it does not delay the threat, it ends it.)
     */
    recoverySecondsByBand: {
      RUSHER_WINS_REP: 0.0,
      RUSHER_GAINING: 0.0,
      STALEMATE: 0.0,
      BLOCKER_CONTAINS: 0.5,
      BLOCKER_RESETS: 0.0,
    },
    /**
     * Nobody teleports. Even an unblocked interior rusher needs a beat to cover
     * the ground to a launch point six or seven yards deep, so the dominance
     * shave cannot produce a same-tick arrival — in practice it shortens the
     * EDGE arc, which is the path that actually has slack in it.
     */
    minTravelSeconds: 1.0,
    maxTravelSeconds: 3.0,
    /** ETAs live on the tick grid so status transitions land on emitted ticks. */
    quantizeSeconds: 0.5,
    /**
     * Default alignment when the play call does not state one. Everything not
     * listed rushes from the edge — an A-gap blitzer must say so explicitly.
     */
    interiorPositions: ["DT", "NT"],
    defaultAlignment: "EDGE",
    /**
     * Time-to-arrival → pocket-status floor. A threat still 1.5s out is real
     * pressure; one arriving next tick is a collapsing pocket; one that has
     * arrived is in the QB's face.
     */
    immediateWithinSeconds: 0.0,
    collapsingWithinSeconds: 1.0,
  },

  /**
   * §7.2 — pocket status. Three inputs, combined by taking the WORST, all read
   * from tick T−0.5 so the doc's one-tick lag ("pressure/hit next tick") holds:
   *
   *  1. `minimumStatusByBand` — the doc's rule, stated per rusher and per tick.
   *     One won rep is sufficient; it is not a quantity that must accumulate.
   *  2. `arrival` above — how long the nearest travelling threat still needs.
   *     This is what keeps a beaten tackle beaten: a rusher who won at 1.0 and
   *     stalemates at 1.5 has NOT un-beaten his block, he is still coming.
   *  3. `thresholds` — the accumulated per-rusher pressure counter, which is
   *     what escalates a sustained rush to IMMEDIATE. The counter can only make
   *     the status worse than the floors, never better.
   */
  pocket: {
    /**
     * §7.2 verbatim:
     *   "POCKET PRESSURE:    1+ rushers winning by 1-14"
     *   "POCKET COLLAPSING:  1+ rushers won (winning by 15+) previous tick"
     * A single rusher's band on tick T sets a FLOOR for the status on T+0.5.
     */
    minimumStatusByBand: {
      RUSHER_WINS_REP: "COLLAPSING",
      RUSHER_GAINING: "PRESSURE",
      STALEMATE: "CLEAN",
      BLOCKER_CONTAINS: "CLEAN",
      BLOCKER_RESETS: "CLEAN",
    },
    /** Ordering used to take the worse of the two derivations. */
    severity: { CLEAN: 0, PRESSURE: 1, COLLAPSING: 2, IMMEDIATE: 3, SACK: 4 },
    thresholds: [
      { label: "SACK", minProgress: 9 },
      { label: "IMMEDIATE", minProgress: 7 },
      { label: "COLLAPSING", minProgress: 5 },
      { label: "PRESSURE", minProgress: 3 },
      { label: "CLEAN", minProgress: NEG_INF },
    ],
    /** §10.4 accuracy modifiers by pocket status. */
    accuracyModifier: {
      CLEAN: 0,
      PRESSURE: -10,
      COLLAPSING: -20,
      IMMEDIATE: -30,
      SACK: -30,
    },
    /** §7.2 "QB processing: −1 read capacity" under pressure. */
    readCapacityDelta: {
      CLEAN: 0,
      PRESSURE: -1,
      COLLAPSING: -1,
      IMMEDIATE: -2,
      SACK: 0,
    },
    /** §7.2 — statuses where the QB may no longer hold. */
    forcesDecision: ["COLLAPSING", "IMMEDIATE"],
    /**
     * §7.2 COLLAPSING/IMMEDIATE: "QB must throw, move, or take hit" / "must
     * decide THIS tick: throw, scramble, or sack". A status in this list is a
     * status under which the QB may go down.
     *
     * VALUE UNCHANGED, SEMANTICS NARROWED (July 2026, time-of-arrival patch).
     * This list is now a NECESSARY but no longer SUFFICIENT condition: a sack
     * additionally requires a rusher who has actually ARRIVED
     * (`RushThreat.etaTick <= tick`). Since an arrived threat floors the status
     * at IMMEDIATE, the `COLLAPSING` entry is currently subsumed — it is kept at
     * its pre-patch value deliberately rather than pruned, because pruning it
     * would move a calibration decision under cover of a defect fix. It becomes
     * live again the moment a mechanic can produce COLLAPSING with an arrived
     * rusher (a free runner off a failed blitz pickup, §7.4, is the obvious one).
     *
     * CALIBRATION FLAG (raised by the B1 fix, still open). The other implicated
     * dial, `passRush.blockerStructuralAdvantage`, belongs to the §7.1 KNOWN
     * ISSUE (term asymmetry) that the design doc defers to Phase 3. Also
     * untouched. See docs/decisions/CALIBRATION-BACKLOG.md §2, §3.
     */
    sackWhenNoTarget: ["COLLAPSING", "IMMEDIATE"],
  },

  /**
   * §7.2's third option — "throw, MOVE, or take hit" — as two distinct
   * mechanics rather than one blended "evade".
   *
   * STEP UP / CLIMB resets or delays EDGE threats and does nothing whatever
   * against interior penetration: you cannot climb into a three-technique. It
   * is the cheap, common, correct answer to most collapsing pockets, and a QB
   * who climbs stays a passer.
   *
   * ESCAPE / SCRAMBLE leaves the pocket entirely and triggers §8.8's scramble
   * drill. It is gated by mobility and improvisation.
   *
   * Selection is NOT an if-ladder on pocket status. Each response carries an
   * APPEAL score built from the quarterback's own attributes and the shape of
   * the threat; the §8.5 band mechanic then decides how far down his own
   * preference list the die pushes him. A composed QB takes his best option; a
   * panicked one takes his second or third — which is how a bail-out into a
   * worse outcome than the one he fled emerges rather than being scripted.
   */
  pocketMovement: {
    target: 50,
    /** Attributes on the die itself: can he think while it caves in? */
    checkTerms: [
      { attr: "poise", divisor: 5 },
      { attr: "awareness", divisor: 5 },
    ],
    /** Appeal attribute terms are measured against this rating. */
    appealBaseline: 70,
    /**
     * Half-ticks by which the nearest arrival is already inside this horizon.
     * 0 when nothing is travelling; 3 when a rusher is on top of him.
     */
    urgencyHorizonSeconds: 1.5,
    appeal: {
      /**
       * Stand in and keep reading. Poise and patience. Urgency erodes it, but
       * gently: standing in and taking the hit is what MOST quarterbacks do
       * when the climb lane is gone, and a steep penalty here turns every
       * collapsed pocket into a bail-out.
       */
      standIn: {
        base: 35,
        terms: [
          { attr: "poise", divisor: 2 },
          { attr: "pocketPatience", divisor: 2 },
        ],
        perUrgencyStep: -6,
      },
      /**
       * Climb. The default answer, and by design the highest base — this is
       * what the drop is FOR. Unavailable against interior penetration and
       * capped per play, so it cannot be spammed into a forcefield.
       */
      stepUp: {
        base: 55,
        terms: [
          { attr: "awareness", divisor: 3 },
          { attr: "pocketPatience", divisor: 3 },
        ],
        perUrgencyStep: -2,
      },
      /**
       * Leave. Low base — most dropbacks are not scrambles — but it is the
       * answer when the climb lane is gone, which is exactly what interior
       * penetration takes away.
       */
      /**
       * Leave. The base is deliberately near zero and the attribute divisors
       * are the steepest in the table, because leaving the pocket is a THING
       * YOU HAVE TO BE ABLE TO DO. A 70/50 pocket passer scores negative here
       * and stands in; a 90/88 improviser outscores every other option the
       * moment the climb lane shuts. Mobility gates it, not the situation.
       */
      escape: {
        base: 5,
        terms: [
          { attr: "mobility", divisor: 1.5 },
          { attr: "improvisation", divisor: 1.5 },
        ],
        perUrgencyStep: 5,
        /** INTERPRETATION: no climb lane (interior threat, or climbs spent). */
        noClimbLaneBonus: 20,
      },
      /** Eat the down. Available only once the concept has had time to develop. */
      throwaway: {
        base: 25,
        terms: [
          { attr: "decisionMaking", divisor: 3 },
          { attr: "awareness", divisor: 4 },
        ],
        perUrgencyStep: 8,
      },
    },
    stepUp: {
      /** You can only climb so far before you are standing on the centre's heels. */
      maxPerPlay: 2,
      /** Seconds added to every EDGE threat's ETA. Interior threats: nothing. */
      edgeThreatDelaySeconds: 1.0,
      /** A rusher run past by a climbing QB starts his rep over. */
      resetsEdgePressure: true,
    },
    /**
     * §8.5's rank mechanic applied to the response list ordered by appeal.
     * `takeRank` 0 is what the quarterback WANTS to do; a bad roll pushes him
     * down his own list, which is where a panicked bail-out comes from. Ranks
     * clamp to the number of responses actually available.
     */
    bands: [
      { label: "SOUND", minMargin: 0, takeRank: 0 },
      { label: "RUSHED", minMargin: -20, takeRank: 1 },
      { label: "PANICKED", minMargin: NEG_INF, takeRank: 2 },
    ],
  },

  /** §8.8 — the scramble itself, and the drill it triggers. */
  scramble: {
    target: 50,
    attrDivisor: 5,
    /**
     * INTERPRETATION: edge rushers are the contain players. Getting out past a
     * threat that is already outside you is the hard version; escaping a purely
     * interior collapse is the easy one.
     */
    edgeThreatPenalty: 10,
    perUrgencyStepPenalty: 5,
    bands: [
      { label: "CLEAN_ESCAPE", minMargin: 15, escaped: true, sacked: false },
      { label: "ESCAPED", minMargin: 0, escaped: true, sacked: false },
      { label: "CONTAINED", minMargin: -20, escaped: false, sacked: false },
      { label: "CAUGHT_FROM_BEHIND", minMargin: NEG_INF, escaped: false, sacked: true },
    ],
    /**
     * §8.8 vision cone, read as DEPTH relative to the scrambling passer:
     * "forward cone: full / direction of run: −20 / back toward line: −40".
     * The deep and intermediate routes are in front of him; the short stuff is
     * where he is running; the quick game is behind him, and he cannot see it.
     * INTERPRETATION — the doc's cone is spatial and the slice has no horizontal
     * field model, so depth class stands in for it. Applied as a named modifier
     * on §8.3's awareness roll, which is the check the doc's "-20/-40" describes.
     */
    visionConeByDepthClass: { DEEP: 0, INTERMEDIATE: 0, SHORT: -20, QUICK: -40 },
    /** §8.8 "receivers stop running routes, find open grass". */
    opennessGainPerTick: 8,
    maxOpenness: 85,
    /** Seconds outside the pocket before pursuit forces the ball down. */
    pursuitSeconds: 1.5,
  },

  /** §9.1 — release vs. press at tick 0.5. */
  release: {
    attrDivisor: 5,
    /** Margin = WR total − CB total. delayTicks in seconds; coverage modifiers per §9.1 outcomes. */
    bands: [
      { label: "CLEAN_RELEASE_CB_BEAT", minMargin: 20, delaySeconds: 0.0, wrCoverageMod: 10, cbCoverageMod: 0, disrupted: false },
      { label: "CLEAN_RELEASE", minMargin: 10, delaySeconds: 0.0, wrCoverageMod: 0, cbCoverageMod: 0, disrupted: false },
      { label: "RELEASE_DELAYED", minMargin: 1, delaySeconds: 0.5, wrCoverageMod: 0, cbCoverageMod: 0, disrupted: false },
      { label: "JAM_TIE", minMargin: 0, delaySeconds: 1.0, wrCoverageMod: 0, cbCoverageMod: 0, disrupted: false },
      { label: "CB_IN_PHASE", minMargin: -9, delaySeconds: 1.0, wrCoverageMod: 0, cbCoverageMod: 5, disrupted: false },
      { label: "CB_TRAIL_TECHNIQUE", minMargin: -19, delaySeconds: 1.5, wrCoverageMod: 0, cbCoverageMod: 10, disrupted: false },
      { label: "ROUTE_DISRUPTED", minMargin: NEG_INF, delaySeconds: 2.0, wrCoverageMod: 0, cbCoverageMod: 15, disrupted: true },
    ],
  },

  /** §9.2 — route development times by depth class (seconds from snap). */
  route: {
    readySeconds: {
      QUICK: 1.0,
      SHORT: 1.5,
      INTERMEDIATE: 2.0,
      DEEP: 2.5,
    },
    /** §8.7 — routes keep developing, then coverage closes. */
    opennessGainPerTick: 5,
    opennessDecayPerTick: 5,
    decayStartsAtSeconds: 3.0,
    minOpenness: 0,
    maxOpenness: 100,
  },

  /**
   * §3 — THE ZONE GRID, and the two places it is faked.
   *
   * `verticalUpperYards` is the doc verbatim (§3.2: SHORT 0-10, INTERMEDIATE
   * 10-20, DEEP 20-35, VERY DEEP 35+), so the depth half of a route's cell is
   * derived, not invented.
   *
   * `defaultHorizontal` is the FAKE. Nothing on a play card says which side of
   * the field a route runs to, and the engine will not guess from a formation
   * string it is forbidden to interpret (ADR-006). A route that does not state
   * its `breakZone` is placed in this lane — which means every silent route
   * shares a lane, and therefore a zone. Play cards meant to exercise zone
   * coverage state `breakZone`.
   */
  zoneModel: {
    horizontalOrder: ["LW", "LH", "C", "RH", "RW"],
    verticalOrder: ["BACKFIELD", "SHORT", "INTERMEDIATE", "DEEP", "VERY_DEEP"],
    /** §3.2 verbatim, as inclusive upper bounds in air yards. */
    verticalUpperYards: { BACKFIELD: 0, SHORT: 10, INTERMEDIATE: 20, DEEP: 35 },
    /** FAKE — see the block comment. */
    defaultHorizontal: "C",
    /** §3.2 "BACKFIELD (−5 to 0 yards): QB, RB, FB positions; pass protection zone". */
    backfieldVertical: "BACKFIELD",
    /**
     * INTERPRETATION — a ball knocked down in the throwing lane never gets to
     * the route's cell. It comes down short, in the target's lane.
     */
    laneDeflectionVertical: "SHORT",
  },

  /** §9.4 — zone coverage: the route entering a zone, and the defender reading the QB. */
  zoneCoverage: {
    /** §9.4 verbatim: target `50 + (Defender Zone Coverage ÷ 5)`. */
    target: 50,
    receiverAttrDivisor: 5,
    defenderAttrDivisor: 5,
    /**
     * §9.4's result bands verbatim. Margin = WR roll total − target. The 0-100
     * openness each maps to is calibrated against §8.4's scale exactly as
     * `manCoverage.bands` is — the doc states the outcome, not the number.
     *
     * Note the SHAPE difference from man coverage, and it is the point of zone:
     * the good outcomes are BETTER (a soft spot is uncontested grass, not a step
     * of separation from a corner who is still running with you) and the bad
     * outcome is not as bad (a zone defender in the lane is not on your hip).
     */
    bands: [
      { label: "SOFT_SPOT", minMargin: 20, openness: 85, contest: "TRAILING", settled: true },
      { label: "WINDOW", minMargin: 10, openness: 70, contest: "TRAILING", settled: true },
      { label: "TIGHT_WINDOW", minMargin: 1, openness: 45, contest: "EVEN", settled: true },
      { label: "DEFENDER_IN_LANE", minMargin: NEG_INF, openness: 20, contest: "IN_FRONT", settled: false },
    ],
    /**
     * INTERPRETATION — nobody is in the cell. This is a hole in the zone, and it
     * is the thing zone coverage is FOR giving up. No die is rolled: there is no
     * contest to roll (ADR-005 forbids inventing a failed check where none ran).
     */
    uncoveredOpenness: 90,
    uncoveredContestPosition: "TRAILING",
    /**
     * INTERPRETATION — §8.7's openness decay is "coverage closes on him". A
     * receiver who has SAT DOWN in the soft spot of a zone is not being run away
     * from: the defender's responsibility is the area, not the man, so the
     * window shuts far more slowly. Set this equal to
     * `route.opennessDecayPerTick` to recover uniform man-style decay.
     */
    settledDecayPerTick: 0,
    /** §9.4 "ZONE DEFENDER READING QB" — jumping the route. */
    readQb: {
      /** §9.4 verbatim: `d100 + ZoneCoverage÷5 + Awareness÷5` vs `60 + QB Disguise`. */
      baseTarget: 60,
      attrDivisor: 5,
      /**
       * INTERPRETATION — §9.4's "QB Disguise" names an attribute that does not
       * exist. It is not in §4.1's quarterback table and not in
       * `ATTRIBUTE_REGISTRY_V1`, and its scale cannot be a 0-99 rating: added
       * RAW to a target of 60 it would put the target at 159 for an elite passer
       * and make the check unwinnable. So it is a MODIFIER-scale quantity, and
       * it is derived here from the two registry attributes that already mean
       * "understands what the defence is looking at" — the same two §8.1's
       * anticipation uses, because looking a safety off and throwing him open
       * are the same skill. Range at these settings: roughly −6 to +6.
       *
       * **Settled, not pending:** ADR-009 ratified "no `disguise` attribute" as
       * a decision, not merely as a note. If calibration later finds that
       * quarterbacks must differ on disguise INDEPENDENTLY of `awareness` and
       * `footballIQ`, that is a genuine finding and earns its own petition.
       */
      disguise: {
        baseline: 70,
        terms: [
          { attr: "awareness", divisor: 10 },
          { attr: "footballIQ", divisor: 10 },
        ],
      },
      /** §9.4 verbatim: "Creates +20 to contest/interception". */
      contestBonus: 20,
      /**
       * INTERPRETATION of "can break on ball at release": a defender who read it
       * is IN the throwing lane, so he gets §10.3's lane check regardless of the
       * contest position his coverage rep left him in. Openness still gates it
       * (`throwExec.lane.contestOpennessMax`), so a receiver sitting wide open in
       * a soft spot is not lane-contested by a defender two cells away.
       */
      grantsLaneContest: true,
      /**
       * The stronger reading of the same phrase — he arrives, so every catch
       * becomes a 50/50 ball. OFF by default: §11.3's contested roll ignores
       * openness entirely, so switching this on treats a wide-open soft-spot
       * throw as a jump ball, which is not what "broke on the ball" means when
       * the receiver has eight yards on him.
       */
      forcesContestedCatch: false,
    },
  },

  /** §9.3 — man coverage at the break point. */
  manCoverage: {
    attrDivisor: 5,
    /**
     * Margin = WR total − CB total. The doc states separations in yards; the
     * 0-100 openness value each band maps to is calibrated here against §8.4's
     * openness scale (70+ wide open, 50-69 open, 30-49 tight, 15-29 covered).
     */
    bands: [
      { label: "SEPARATION_5_PLUS", minMargin: 30, openness: 85, contest: "TRAILING" },
      { label: "SEPARATION_3_4", minMargin: 20, openness: 70, contest: "TRAILING" },
      { label: "SEPARATION_1_2", minMargin: 10, openness: 55, contest: "TRAILING" },
      { label: "SEPARATION_HALF_YARD", minMargin: 1, openness: 40, contest: "EVEN" },
      { label: "EVEN_BRACKET", minMargin: 0, openness: 32, contest: "EVEN" },
      { label: "CB_IN_PHASE", minMargin: -9, openness: 25, contest: "EVEN" },
      { label: "CB_ON_HIP", minMargin: -19, openness: 15, contest: "IN_FRONT" },
      { label: "CB_IN_POSITION", minMargin: NEG_INF, openness: 6, contest: "IN_FRONT" },
    ],
  },

  /** §8.2–§8.7 — QB processing, perception, and the hold/throw decision. */
  qb: {
    /**
     * §8.1 READING SYSTEMS. The doc gives each system a read rate and a
     * progression depth; those two numbers alone produced three quarterbacks who
     * behaved identically, because the engine's progression pointer skipped past
     * any receiver whose route had not developed (CALIBRATION-BACKLOG 2b). With
     * the pointer honouring the progression, the rate and depth are live — and
     * the rest of each system's character is the ANTICIPATION profile below.
     *
     * `readsPerTick` / `maxReads` are the doc's. Everything else is
     * INTERPRETATION, and each entry exists because the systems differ in what
     * they ASK OF THE QUARTERBACK, not merely in how fast he processes:
     *
     *  HALF_FIELD  a timing system. The throw and the break happen together, so
     *              the QB is coached to turn it loose before the window exists:
     *              the easiest anticipation in the table, and the shortest
     *              budget, because being late IS the failure mode.
     *  FULL_FIELD  see it, then throw it. Four reads and the longest budget buy
     *              him the right to be sure — and the hardest anticipation,
     *              because a progression QB throwing blind is a progression QB
     *              guessing. He gets there later and picks better.
     *  CONCEPT     binary. The key is identified pre-snap, so the FIRST read is
     *              anticipated better than any other system manages — and there
     *              are only two of them. Fastest ball out; nothing behind it.
     */
    readSystem: {
      HALF_FIELD: {
        readsPerTick: 1,
        maxReads: 3,
        budgetDeltaSeconds: -0.5,
        throwThresholdDelta: 0,
        anticipationModifier: 10,
        firstReadAnticipationModifier: 0,
      },
      FULL_FIELD: {
        readsPerTick: 0.5,
        maxReads: 4,
        budgetDeltaSeconds: 1.0,
        throwThresholdDelta: 5,
        anticipationModifier: -15,
        firstReadAnticipationModifier: 0,
      },
      CONCEPT: {
        readsPerTick: 2,
        maxReads: 2,
        budgetDeltaSeconds: -1.0,
        throwThresholdDelta: -5,
        anticipationModifier: -10,
        firstReadAnticipationModifier: 30,
      },
    },
    /** §8.2 "+ (Decision Making − 70) ÷ 20 extra reads". */
    extraReads: { baseline: 70, divisor: 20 },
    /**
     * INTERPRETATION: §7.2's "−1 read capacity" under pressure would take a
     * baseline half-field QB to zero reads, i.e. he could never see the man he
     * is already looking at. Pressure removes ADDITIONAL reads; the current read
     * survives. Capped by the reading system's own rate so full-field
     * progressions still process at half speed.
     */
    minReadsPerTick: 1,
    /** §8.3 awareness variance: d20 − 10 + (Awareness − 70) ÷ 5. */
    awarenessVariance: { d20Offset: -10, baseline: 70, divisor: 5 },
    /** §8.4 tight-window compensation. */
    window: {
      tightWindowThreshold: 50,
      baseline: 70,
      accuracyDivisor: 2,
      armStrengthDivisor: 4,
      touchDivisor: 4,
    },
    /**
     * §8.7 time budget: 2.5 + (Pocket Patience − 70) ÷ 20 seconds, plus the
     * reading system's own `budgetDeltaSeconds`.
     *
     * The system term is not a separate change from anticipation — it is the
     * SAME change. A quarterback who releases on timing needs a different hold
     * profile from one who waits to see separation: giving a half-field passer a
     * full-field budget makes him late on every rhythm throw the system exists
     * to produce, and giving a full-field passer a half-field budget forces a
     * checkdown before his third read has broken.
     */
    timeBudget: { baseSeconds: 2.5, baseline: 70, divisor: 20 },
    /**
     * §8.1 ANTICIPATION — the mechanic the three reading systems differ on.
     *
     * NOT IN THE DESIGN DOC. It is the missing half of §8.1: half-field football
     * assumes the quarterback releases BEFORE the receiver is open, on timing.
     * Without it the only honest model is "wait until you can see him", which is
     * a full-field progression — so every system collapsed into the same
     * quarterback, and CALIBRATION-BACKLOG 2b's counterfactual (force him to
     * stay on the primary, no anticipation) produced 25.7% sacks and 24.4%
     * completion: the worst of both models.
     *
     * A quarterback who passes this check throws to a window that does not exist
     * yet — the coverage rep resolves at the break and the ball is already gone.
     * One who fails it waits for separation he can SEE, and pays for the wait in
     * pressure. Gated on `awareness` and `footballIQ` (knowing where he will be)
     * plus chemistry (knowing how HE runs it) — which is why chemistry's absence
     * from the data model is load-bearing rather than cosmetic.
     */
    anticipation: {
      target: 55,
      terms: [
        { attr: "awareness", divisor: 5 },
        { attr: "footballIQ", divisor: 5 },
      ],
      /*
       * ADR-008 — a third term rides on this roll from `TUNABLES.chemistry`:
       * awareness and football IQ are "can he see the picture", chemistry is
       * "does he know how THIS man runs it". Exchange rate:
       * `TUNABLES.chemistry.anticipationDivisor`.
       */
      /**
       * "On rhythm" means ONE TICK, not "early". A quarterback releases as the
       * receiver plants; he does not throw a fourteen-yard dig a full second
       * before the break, because the ball would arrive before the man did.
       * Beyond this lead NO ROLL IS MADE — he simply is not there yet (ADR-005:
       * an absent check means no die, never a failed one).
       *
       * Measured: at 1.0s this put 44-51% of all throws on tick 1.0, because the
       * earliest anticipable tick is the one everybody throws on.
       */
      maxLeadSeconds: 0.5,
      /** Cost per half-tick between the release and the break. */
      perHalfTickAheadPenalty: -20,
      /**
       * How far ahead the route declares itself, and the discriminating term now
       * that the lead is capped at one tick. A slant tells you at the snap; a dig
       * does not declare until the receiver is at depth; a go route never
       * declares at all, and the throw is pure projection.
       */
      depthModifier: { QUICK: 10, SHORT: 0, INTERMEDIATE: -10, DEEP: -20 },
      bands: [
        { label: "ON_TIME", minMargin: 15, anticipated: true },
        { label: "ANTICIPATED", minMargin: 0, anticipated: true },
        { label: "NOT_YET", minMargin: -20, anticipated: false },
        { label: "LOCKED_ON", minMargin: NEG_INF, anticipated: false },
      ],
    },
    /**
     * §8.1's "max reads before CHECKDOWN". The checkdown is the OUTLET — it is
     * not part of the progression and does not cost a progression read, which is
     * the whole point of having one. Once the progression is spent (or the
     * pocket ends the play early) the quarterback looks at the shortest route on
     * the field and takes it at a lower bar than he would take a primary.
     *
     * INTERPRETATION: the doc names the checkdown but never says what makes a QB
     * take one. Without this branch a progression QB whose primary never opens
     * has only "throw it away" and "eat it" — which is precisely the 25.7% sack
     * rate 2b's counterfactual measured.
     */
    checkdown: { threshold: 30 },
    /**
     * INTERPRETATION: the doc never states the openness at which a QB pulls the
     * trigger. These two thresholds are the primary aggression knobs.
     * `throwThreshold` is adjusted per reading system by `throwThresholdDelta`:
     * a full-field passer has options coming and passes on a marginal window; a
     * concept passer has two reads and takes what the key gives him.
     */
    throwThreshold: 50,
    desperationThreshold: 25,
    /**
     * INTERPRETATION: a QB cannot throw the ball away before the concept has
     * had time to develop — before this he keeps holding and eats the rush.
     */
    throwawayEarliestSeconds: 2.0,
    /**
     * INTERPRETATION (§4.1 Poise "resisting accuracy penalties from pressure"):
     * poise refunds a fraction of the pocket accuracy penalty.
     */
    poise: { baseline: 70, divisor: 10 },
    /**
     * INTERPRETATION (Appendix B Pocket Awareness "+10 to sensing pressure"):
     * the trait raises the pressure counter at which the QB is forced to act,
     * expressed as an extra half-tick of time budget.
     */
    pressureSensing: { pocketAwarenessBudgetSeconds: 0.5 },
    /** §8.5 decision quality. */
    decision: {
      target: 50,
      attrDivisor: 5,
      /**
       * Bands select from a rank window of the candidate list ordered by
       * effective openness: [poolFrom, poolTo) with clamping.
       */
      bands: [
        { label: "OPTIMAL", minMargin: 30, poolFrom: 0, poolTo: 1 },
        { label: "GOOD", minMargin: 15, poolFrom: 0, poolTo: 2 },
        { label: "ADEQUATE", minMargin: 0, poolFrom: 0, poolTo: 3 },
        { label: "QUESTIONABLE", minMargin: -14, poolFrom: 1, poolTo: 4 },
        { label: "POOR", minMargin: NEG_INF, poolFrom: 1, poolTo: 99 },
      ],
    },
  },

  /** §10 — throw execution. */
  throwExec: {
    /**
     * §10.2 throw type. INTERPRETATION: the doc says "system or QB AI selects".
     * Rule: tight windows and short timing routes get velocity; everything deep
     * and uncontested gets touch.
     */
    typeSelection: {
      tightWindowMaxOpenness: 50,
      bulletDepthClasses: ["QUICK", "SHORT", "INTERMEDIATE"],
      touchDepthClasses: ["DEEP"],
    },
    /** §10.1 arm-strength gates by air yards (first match wins). */
    armRequirements: [
      { minAirYards: 25, minArmStrength: 80 },
      { minAirYards: 18, minArmStrength: 75 },
    ],
    underArmThresholdAccuracyPenalty: -20,

    /** §10.3 passing lane. */
    lane: {
      target: 60,
      attrDivisor: 5,
      /** Only a defender this close to the target can get into the throwing lane. */
      contestOpennessMax: 60,
      /**
       * INTERPRETATION: the man defender is only IN the throwing lane when he
       * has undercut the route. A trailing or even defender contests at the
       * catch point instead (§11.3) — running both for him would double-count
       * one defender's chance to break the pass up.
       */
      eligibleContestPositions: ["IN_FRONT"],
      velocityModifier: { BULLET: 15, TOUCH: -10, BACK_SHOULDER: 0, THROWAWAY: 0 },
      /** §10.3 throw angle. Touch passes go over the trailing defender; bullets through him. */
      angleModifier: { OVER_DEFENDER: 20, PAST_DEFENDER: 0, THROUGH_ZONE: -10 },
      angleByThrowType: { BULLET: "THROUGH_ZONE", TOUCH: "OVER_DEFENDER", BACK_SHOULDER: "PAST_DEFENDER", THROWAWAY: "PAST_DEFENDER" },
    },

    /** §10.4 accuracy. */
    accuracy: {
      target: 60,
      attrDivisor: 5,
      depthModifier: { shortMaxYards: 10, shortBonus: 10, intermediateMaxYards: 25, intermediateBonus: 0, deepBonus: -10 },
      throwTypeModifier: { BULLET: 0, TOUCH: 0, BACK_SHOULDER: -10, THROWAWAY: 0 },
      /** §10.4 result bands (margin vs. target) and §10.5 downstream modifiers. */
      bands: [
        { label: "PERFECT", minMargin: 40, catchMod: 20, defenderContestMod: -15, difficulty: 0, catchable: true },
        { label: "EXCELLENT", minMargin: 25, catchMod: 15, defenderContestMod: -10, difficulty: 0, catchable: true },
        { label: "GOOD", minMargin: 10, catchMod: 10, defenderContestMod: -5, difficulty: 0, catchable: true },
        { label: "ADEQUATE", minMargin: 0, catchMod: 0, defenderContestMod: 0, difficulty: 10, catchable: true },
        { label: "POOR", minMargin: -14, catchMod: -15, defenderContestMod: 10, difficulty: 15, catchable: true },
        { label: "BAD", minMargin: -29, catchMod: -25, defenderContestMod: 15, difficulty: 20, catchable: true },
        { label: "MISS", minMargin: NEG_INF, catchMod: 0, defenderContestMod: 0, difficulty: 0, catchable: false },
      ],
    },
  },

  /** §11 — catch resolution. */
  catching: {
    /** §11.1 "defender within 1 yard" expressed on the openness scale. */
    contestedMaxOpenness: 30,
    routine: {
      target: 50,
      attrDivisor: 5,
      bands: [
        { label: "SECURED", minMargin: 20, caught: true },
        { label: "CAUGHT_SLIGHT_BOBBLE", minMargin: 10, caught: true },
        { label: "CAUGHT_AFTER_BOBBLE", minMargin: 0, caught: true },
        { label: "DROPPED_TIP_POSSIBLE", minMargin: -9, caught: false },
        { label: "DROPPED_CLEANLY", minMargin: -19, caught: false },
        { label: "NOT_CLOSE", minMargin: NEG_INF, caught: false },
      ],
    },
    /**
     * §11.3 contested catch. Attribute terms are DATA so a ratified attribute
     * (see ADR-003, "jumping") is absorbed by adding one entry here — no code
     * change in the resolver.
     */
    contested: {
      attrDivisor: 5,
      receiverTerms: [
        { attr: "catching", divisor: 5 },
        { attr: "catchInTraffic", divisor: 5 },
        { attr: "jumping", divisor: 5 },
      ],
      defenderTerms: [
        { attr: "ballSkills", divisor: 5 },
        { attr: "jumping", divisor: 5 },
      ],
      /** §11.3 contest modifier by defender position relative to the receiver. */
      positionModifier: { TRAILING: -10, EVEN: 0, IN_FRONT: 15 },
      /** Margin = receiver total − defender total. */
      bands: [
        { label: "CLEAN_CATCH", minMargin: 20, caught: true, interception: false },
        { label: "CATCH_TIP_RISK", minMargin: 10, caught: true, interception: false },
        { label: "CATCH_HIGH_TIP_RISK", minMargin: 1, caught: true, interception: false },
        { label: "TIP_BALL", minMargin: 0, caught: false, interception: false },
        { label: "PBU_TIP", minMargin: -9, caught: false, interception: false },
        { label: "CLEAN_PBU", minMargin: -19, caught: false, interception: false },
        { label: "INTERCEPTION", minMargin: NEG_INF, caught: false, interception: true },
      ],
    },
  },

  /**
   * §12 — THE TIPPED BALL SYSTEM.
   *
   * Until this landed, every deflection terminated as a batted-down
   * incompletion. That is the single largest missing source of interceptions in
   * the engine: in real football a tipped ball is a live ball, and defensive tip
   * recoveries are a material fraction of NFL picks. Expect the INT rate to rise
   * — that is the mechanic arriving, not a mis-calibration.
   */
  tippedBall: {
    /**
     * §12.1's trigger table, expressed as the §11 result bands that produce a
     * live ball. The doc's other two triggers are not reachable: the engine has
     * no D-line tip-at-release check (§12.1 row 5, `dline_tip` CheckKind exists
     * and has no producer), and "defender causes drop via hit" is not a distinct
     * outcome of §11.2.
     */
    triggerRoutineBands: ["DROPPED_TIP_POSSIBLE"],
    triggerContestedBands: ["TIP_BALL", "PBU_TIP"],
    /** §12.1 explicitly does NOT trigger on an uncatchable ball or a throwaway. */

    /** §12.2 base target number by throw height — the doc's table verbatim. */
    baseTargetByHeight: {
      GROUND: 100,
      LOW: 90,
      WAIST: 80,
      CHEST: 70,
      SHOULDER: 60,
      HEAD: 50,
      HIGH_POINT: 40,
      JUMP_BALL: 30,
    },
    /** Ordered low to high; `heightStepsByThrowType` walks it. */
    heightLadder: ["GROUND", "LOW", "WAIST", "CHEST", "SHOULDER", "HEAD", "HIGH_POINT", "JUMP_BALL"],
    /**
     * INTERPRETATION — THROW HEIGHT IS NOT MODELLED, and §12.2 requires it.
     *
     * The engine has no ball trajectory. What it has is where the ball was hit,
     * how far it was going, and how it was thrown, and those three do determine
     * height well enough to be worth deriving rather than inventing a field:
     *
     *  - A ball knocked down IN THE THROWING LANE is hit a stride after release,
     *    at its flattest and lowest point. One height, regardless of the route.
     *  - A ball deflected AT THE CATCH POINT is at the end of its arc, and the
     *    arc rises with distance: a quick hitch arrives at the waist, a go route
     *    arrives above everybody's head.
     *  - Velocity tilts it either way at the same depth — a bullet is thrown
     *    flat and arrives a notch lower, a touch pass a notch higher.
     *
     * Every one of those is a knob, and the whole mapping is replaceable by a
     * real trajectory the day one exists.
     */
    heightAtLane: "WAIST",
    heightAtCatchPointByDepth: {
      QUICK: "WAIST",
      SHORT: "CHEST",
      INTERMEDIATE: "SHOULDER",
      DEEP: "HIGH_POINT",
    },
    /** Steps along `heightLadder`, applied at the catch point only. */
    heightStepsByThrowType: { BULLET: -1, TOUCH: 1, BACK_SHOULDER: 0, THROWAWAY: 0 },
    /** §12.2 "Ball Velocity" verbatim: bullet +15, normal 0, touch −15. */
    velocityModifier: { BULLET: 15, TOUCH: -15, BACK_SHOULDER: 0, THROWAWAY: 0 },
    /**
     * §12.2 weather — OUT OF SCOPE. §16's weather system is not implemented, so
     * the engine has no weather input and applies nothing. The keys are present
     * and ZERO so the day §16 lands the wiring is a value change, not a code
     * change. Doc values, recorded so they are not lost: light rain +5, heavy
     * rain +15, snow +10, extreme cold +10, wind 15+ mph +5, dome/clear +0.
     */
    weatherModifier: {
      DOME_CLEAR: 0,
      LIGHT_RAIN: 0,
      HEAVY_RAIN: 0,
      SNOW: 0,
      EXTREME_COLD: 0,
      WIND_15_PLUS: 0,
    },
    /**
     * §12.2's result bands. Margin = d100 − modified TN, so the doc's
     * "Roll > TN + 40" is `minMargin: 41`. Each band sets the FINAL target
     * number every recovery attempt is then rolled against, and §12.3's
     * eligibility reach.
     *
     * `speedCheckFromDistance` is §12.3's "Speed check" column: at or beyond
     * this many zones away a candidate must ALSO clear
     * `recovery.speedCheckMinSpeed`. 99 means the column says a plain "Yes"/"No".
     */
    qualityBands: [
      { label: "GIFT", minMargin: 41, finalTargetNumber: 20, recoverable: true, maxZoneDistance: 2, speedCheckFromDistance: 2, giftZone: true },
      { label: "FLOATER", minMargin: 21, finalTargetNumber: 35, recoverable: true, maxZoneDistance: 2, speedCheckFromDistance: 2, giftZone: false },
      { label: "LIVE_BALL", minMargin: 1, finalTargetNumber: 55, recoverable: true, maxZoneDistance: 1, speedCheckFromDistance: 99, giftZone: false },
      { label: "CONTESTED", minMargin: -19, finalTargetNumber: 75, recoverable: true, maxZoneDistance: 1, speedCheckFromDistance: 1, giftZone: false },
      { label: "DIFFICULT", minMargin: -39, finalTargetNumber: 90, recoverable: true, maxZoneDistance: 0, speedCheckFromDistance: 99, giftZone: false },
      { label: "DEAD", minMargin: NEG_INF, finalTargetNumber: 0, recoverable: false, maxZoneDistance: -1, speedCheckFromDistance: 99, giftZone: false },
    ],
    /**
     * §12.4 — the recovery attempt, in Reaction order.
     *
     * MEASURED DEFECT, IMPLEMENTED AS SPECIFIED AND NOT TUNED — for the
     * calibration backlog, same class as the §7.1 term asymmetry (entry 3).
     *
     * §12.4's modifier stack and §12.2's target numbers are on incompatible
     * scales. The doc gives a recovering player SIX attribute terms at Rating÷5
     * (hands, reaction, speed, acceleration, agility, awareness) — roughly +90
     * for an average player — plus +25 for being in the ball's zone, against a
     * FINAL target number of 20 (GIFT) to 90 (DIFFICULT). Even the hardest ball
     * in the table is cleared by a d100 roll of 1.
     *
     * Measured over 18,000 plays across six fixtures: **1,474 recovery attempts,
     * ZERO failures.** Roll 2 never fails, so it decides nothing. Who ends up
     * with a tipped ball is settled entirely by (a) whether Roll 1 killed the
     * ball and (b) the deterministic Reaction ordering — the highest-Reaction
     * player within reach takes it, every time. A §17 printout of a live tip
     * reads "RECOVERS (+166)".
     *
     * NOT TUNED HERE, deliberately: the value that would fix it is either the
     * attribute divisor or the final target numbers, and both are calibration
     * decisions about how much of an outcome should be skill (Mandate 1 /
     * backlog entry 5), not a defect fix to be smuggled into a feature dispatch.
     * The knobs are `attrTerms[].divisor` and `qualityBands[].finalTargetNumber`.
     */
    recovery: {
      /** §12.4 "Proximity" verbatim. */
      proximityModifier: { sameZone: 25, adjacentZone: 10, twoZonesAway: -10 },
      /** §12.4 "Attributes (each adds Rating ÷ 5)". */
      attrTerms: [
        { attr: "reaction", divisor: 5 },
        { attr: "speed", divisor: 5 },
        { attr: "acceleration", divisor: 5 },
        { attr: "agility", divisor: 5 },
        { attr: "awareness", divisor: 5 },
      ],
      /** §12.4's "Catching/Ball Skills" — whichever of the two the side owns. */
      offenseHandsAttr: "catching",
      defenseHandsAttr: "ballSkills",
      handsDivisor: 5,
      /**
       * §12.3's "Speed check" for a candidate at reach. Implemented as a
       * DETERMINISTIC attribute gate rather than a die, on §10.1's precedent
       * (`armStrengthShortfall` is a rating threshold with no roll). The doc's
       * own §12.4 already pays speed twice — once as an eligibility gate and
       * once as a `Speed ÷ 5` modifier — so a third die here would be noise.
       */
      speedCheckMinSpeed: 75,
      /** §12.4 "Situational". */
      situational: {
        /** The two men who were already playing the ball: the target and whoever contested him. */
        alreadyTrackingBall: 10,
        engagedInBlock: -20,
        giftZoneBonus: 20,
        /**
         * NOT APPLIED — recorded so the doc's number survives. The engine has no
         * facing and no ground state, and inventing either to spend a modifier
         * would be asserting a fact no die and no input produced (ADR-005).
         */
        backWasTurned: -15,
        onGround: -25,
      },
      /**
       * §12.4 "Traits". `highPoint` is NOT in `TRAIT_REGISTRY_V1` and is never
       * applied — the value is recorded, not used. **This is settled, not
       * pending:** ADR-009 ratified "no `highPoint` trait" as a decision. Do not
       * re-petition; `ballHawk` and `reliableHands`, which do exist, are applied.
       */
      traits: { ballHawk: 15, highPoint: 10, reliableHands: 10 },
    },
    /**
     * §12.4 step 4: "If offensive recovery: play continues." It now does. The
     * recovering player is credited with the air yards of wherever he caught it
     * (his own route's, or zero for a lineman who fell on it in protection) and
     * is then run through §13's ball-carrier machinery from that spot like any
     * other man with the ball — which is what retired the placeholder that
     * scored the whole play as a completion for those air yards and stopped.
     */
    offensiveRecoveryUsesAirYards: true,
  },

  /**
   * §6.1–§6.4 — THE RUN BLOCK, and the two places the design doc contradicts
   * itself. Both are implemented literally and neither is rescaled; see
   * `pointOfAttack` below and CALIBRATION-BACKLOG.
   */
  runBlock: {
    /** §6.3 verbatim: `d100 + RunBlock÷5 + Strength÷5` vs `d100 + RunStuff÷5 + Strength÷5`. */
    blockerTerms: [
      { attr: "runBlock", divisor: 5 },
      { attr: "strength", divisor: 5 },
    ],
    defenderTerms: [
      { attr: "runStuff", divisor: 5 },
      { attr: "strength", divisor: 5 },
    ],
    /**
     * §6.3 step 3's scheme modifiers, verbatim. Note the pulling pair is the
     * only modifier in the doc that moves BOTH sides — a puller in space is
     * worse off and the man he is trying to reach is better off, which is a
     * 20-point swing on one assignment.
     */
    doubleTeamBonus: 20,
    pullingBlockerPenalty: -10,
    pullingDefenderBonus: 10,
    /** Appendix B "Road Grader: +10 to pancakes" / "Run Stuffer: +10 vs. run". */
    traits: { roadGrader: 10, runStuffer: 10 },
    /**
     * §6.3 step 4, verbatim. Margin = blocker total − defender total.
     *
     * ⚠ THESE THRESHOLDS DISAGREE WITH §14.3's, ON THE SAME ROLL. §6.3 calls a
     * hole "wide open" at +20 and "exists" from +1; §14.3 calls it HOLE OPEN at
     * +10 and HOLE EXISTS at +1..+9. A margin of +15 is therefore SEALED here
     * and HOLE OPEN there. §6.4's climb trigger ("OL wins by 10+") agrees with
     * §14.3, which makes §6.3's +20 the outlier. Both tables are kept, verbatim
     * and separate: this one names the ENGAGEMENT (what the CHECK reports) and
     * `pointOfAttack.bands` decides the BALL CARRIER'S yardage. Reconciling them
     * is a calibration decision, not a feature-dispatch one.
     */
    bands: [
      { label: "DRIVEN_BACK", minMargin: 20 },
      { label: "SEALED", minMargin: 1 },
      { label: "STALEMATE", minMargin: 0 },
      { label: "PENETRATION", minMargin: -19 },
      { label: "TFL_OPPORTUNITY", minMargin: NEG_INF },
    ],
    /**
     * §6.2 ZONE SCHEME: "For each gap, check if defender maintains gap
     * integrity — Roll: Defender Gap Discipline vs. OL Zone Execution."
     *
     * Fired on ZONE plays only, one per gap, IN ADDITION to the §6.3 engagement:
     * the doc states it as the zone scheme's own resolution and it is what
     * produces §6.2's "cutback lanes available if defense overflows". A defender
     * who loses it has overflowed, and the gap BEHIND him opens.
     *
     * INTERPRETATION — "OL Zone Execution" is not a registry attribute. It is
     * expressed as `runBlock` alone rather than as a stack, so the roll stays
     * one term against one term the way the doc writes it. Margin =
     * defender − blocker: a defender who WINS keeps his gap.
     */
    gapIntegrity: {
      defenderTerms: [{ attr: "gapDiscipline", divisor: 5 }],
      blockerTerms: [{ attr: "runBlock", divisor: 5 }],
      bands: [
        { label: "GAP_HELD", minMargin: 0, overflowed: false },
        { label: "OVERFLOWED", minMargin: NEG_INF, overflowed: true },
      ],
    },
    /**
     * §6.4 CLIMB TO LINEBACKER, verbatim:
     * `d100 + OL Awareness÷5 + OL Sustain÷5` vs `50 + LB Play Recognition÷5`,
     * triggered when the first-level block was won by 10+.
     */
    secondLevelClimb: {
      triggerMinMargin: 10,
      target: 50,
      climberTerms: [
        { attr: "awareness", divisor: 5 },
        { attr: "sustain", divisor: 5 },
      ],
      defenderAttrDivisor: 5,
    },
  },

  /**
   * §14 — THE RUN GAME.
   *
   * `phaseTicks` is §14.2's own timeline read onto the §2.1 half-second grid:
   * "PHASE 1: LINE BATTLE (Ticks 0.0-1.0) / PHASE 2: SECOND LEVEL (1.0-1.5) /
   * PHASE 3: RB DECISION (1.0-2.0)". Each phase resolves on the tick it ends on,
   * so the stream reads in the doc's order.
   */
  runGame: {
    phaseTicks: { lineBattle: 0.5, secondLevel: 1.0, rbDecision: 1.5, openField: 2.0 },
    /**
     * §14.2 PHASE 3's vision check, verbatim: `d100 + Vision÷5 + Patience÷5` vs
     * a flat target of 50. ZONE scheme only — §6.2 gives gap/power "RB Vision
     * Dependency: LOW: designed hole, RB hits it decisively", so no die is
     * rolled on a gap play (ADR-005: an absent check means no roll, never a
     * failed one).
     */
    vision: {
      target: 50,
      terms: [
        { attr: "vision", divisor: 5 },
        { attr: "patience", divisor: 5 },
      ],
      /**
       * INTERPRETATION of §14.2's "Failure: RB may miss cutback or hit wrong
       * hole". He runs the gap that was CALLED. The doc's "may" is not a second
       * die and there is nothing here to invent a penalty from — a back who runs
       * the designed hole on a zone play is not punished, he simply does not get
       * the cutback his vision would have found.
       */
      failureTakesDesignedGap: true,
    },
    /**
     * §14.3 RB AT POINT OF ATTACK. Margin is the §6.3 engagement's margin in the
     * gap he actually runs through. See the ⚠ note on `runBlock.bands`: these
     * thresholds are the doc's and they are NOT the same thresholds.
     *
     * `yards` are §14.3's, verbatim ("gains 3-5 yards before contact", "1-2
     * yards"). Where the doc gives a RANGE, the position within it is a
     * deterministic function of the margin the recorded roll already produced
     * (`marginPerExtraYard`) — no second die, on the ADR-007 precedent that made
     * a rusher's ETA a function of his rep rather than a fresh roll.
     */
    pointOfAttack: {
      bands: [
        { label: "HOLE_OPEN", minMargin: 10, minYards: 3, maxYards: 5, contact: "SECOND_LEVEL" },
        { label: "HOLE_EXISTS", minMargin: 1, minYards: 1, maxYards: 2, contact: "AT_LOS" },
        { label: "STALEMATE", minMargin: 0, minYards: 0, maxYards: 0, contact: "POWER" },
        { label: "PENETRATION", minMargin: NEG_INF, minYards: 0, maxYards: 0, contact: "EVADE" },
      ],
    },
    /**
     * INTERPRETATION — §14.3 says "Failure: TFL" and never says how far back.
     * A tackle for loss on a penetrated gap happens a stride or two behind the
     * line, not at the quarterback's depth; `sackYardsLost` (7) would be absurd
     * here. Named so calibration can move it, and the ONLY invented number in
     * the run game's yardage.
     */
    tflYardsLost: 2,
    /**
     * INTERPRETATION — where a defender who is not at the line is standing, in
     * yards downfield, when the play starts. Used to place him in a §13.1 zone.
     *  - a rusher (`defense.rush`) is at the line;
     *  - a ZONE defender is at the depth of his own stated §3 cell;
     *  - a MAN defender on a run play is covering somebody who is not running a
     *    route, so the §3 model has nothing to say about where he is.
     */
    manDefenderDepthYards: 8,
    /** The horizontal lane each §6.1 gap runs through, for the §3 grid. */
    gapLane: {
      LEFT: { A: "C", B: "LH", C: "LH", D: "LW" },
      RIGHT: { A: "C", B: "RH", C: "RH", D: "RW" },
    },
  },

  /**
   * §13 + §14.4 — THE BALL CARRIER, and it is ONE set of machinery.
   *
   * Tackling a man, breaking a tackle, blocking somebody in space and running a
   * pursuit angle are the same four mechanics whether the carrier caught the
   * ball or was handed it, so they are resolved by one set of functions
   * (`resolve/ballCarrier.ts`) parameterised by the PROFILES below. What differs
   * between YAC and the run game is which profile the doc points at where, and
   * that difference is data in this block rather than two copies of the code.
   */
  ballCarrier: {
    /** §13.1's zones, measured forward from where the carrier got the ball. */
    zones: [
      { zone: 1, widthYards: 5 },
      { zone: 2, widthYards: 10 },
      { zone: 3, widthYards: 15 },
      { zone: 4, widthYards: 30 },
    ],
    /** §13.4 fires once, after the carrier clears this zone. */
    breakawayAfterZone: 2,
    /**
     * A defender this far BEHIND the carrier still counts as the immediate
     * (zone 1) defender — it is the covering corner at the catch point, who is
     * a stride the wrong side of the receiver by definition. Anyone further back
     * than this is chasing from behind, which §13's forward-only zone table does
     * not model.
     */
    behindReachYards: 2,
    /** Depth (yards downfield) of each §3.2 band, for placing a man in a zone. */
    verticalDepthYards: { BACKFIELD: 0, SHORT: 5, INTERMEDIATE: 15, DEEP: 27, VERY_DEEP: 40 },
    /**
     * Where a range like "gain 3-5 yards" lands inside itself: one extra yard
     * per this much margin above the band floor. No second die (ADR-004/005) —
     * the margin came from a roll the stream already carries.
     */
    marginPerExtraYard: 5,
    /**
     * §13.2 "Modifiers" on the immediate-YAC roll, verbatim (+15 in stride, −15
     * off balance, bullet −5, touch +5). INTERPRETATION: the doc says "good
     * accuracy" and "off-balance" without naming §10.4's bands, so the mapping
     * from accuracy band to modifier is here.
     */
    catchTransition: {
      byAccuracyBand: {
        PERFECT: 15, EXCELLENT: 15, GOOD: 15, ADEQUATE: 0, POOR: -15, BAD: -15, MISS: 0,
      },
      byThrowType: { BULLET: -5, TOUCH: 5, BACK_SHOULDER: 0, THROWAWAY: 0 },
    },
    /**
     * §10.5's "YAC Mod" column, as a multiplier on total yards after catch.
     * The column is QUALITATIVE ("Full", "Slight reduction", "Moderate
     * reduction", "Minimal YAC", "No YAC") so every number here is
     * INTERPRETATION.
     *
     * ⚠ THIS STACKS WITH `catchTransition.byAccuracyBand`, and deliberately: the
     * doc states the accuracy effect TWICE, once in §13.2 as a roll modifier and
     * once in §10.5 as a yardage reduction, and the engine's rule is to
     * implement what is written rather than to pick. Set every entry to 1 to
     * apply §13.2's version alone. This is the first thing to try if YAC by
     * accuracy tier comes out too steep.
     */
    yacMultiplierByAccuracyBand: {
      PERFECT: 1, EXCELLENT: 1, GOOD: 0.85, ADEQUATE: 0.7, POOR: 0.4, BAD: 0, MISS: 0,
    },
    /**
     * §13.2 / §14.3 / §14.4 — the carrier-versus-tackler contests. Four
     * profiles, because the doc gives four different attribute pairings and four
     * different result tables for what is structurally one roll.
     */
    contests: {
      /**
       * §13.2 IMMEDIATE DEFENDER, verbatim:
       * `d100 + YAC÷5 + Elusiveness÷5` vs `d100 + Tackling÷5 + Pursuit÷5`.
       * §13.3 sends every later YAC zone back here ("Tackle attempt (see
       * above)"), so this profile covers all of §13.
       */
      yac: {
        checkKind: "yac_tackle" satisfies CheckKind,
        carrierTerms: [
          { attr: "yac", divisor: 5 },
          { attr: "elusiveness", divisor: 5 },
        ],
        tacklerTerms: [
          { attr: "tackling", divisor: 5 },
          { attr: "pursuit", divisor: 5 },
        ],
        bands: [
          { label: "DEFENDER_MISSED", minMargin: 20, minYards: 0, maxYards: 0, tackled: false, broken: true },
          { label: "PARTIAL_TACKLE", minMargin: 10, minYards: 3, maxYards: 5, tackled: true, broken: false },
          { label: "CONTACT_MADE", minMargin: 1, minYards: 1, maxYards: 2, tackled: true, broken: false },
          { label: "WRAPPED_UP", minMargin: 0, minYards: 0, maxYards: 1, tackled: true, broken: false },
          { label: "TACKLED_AT_CATCH", minMargin: NEG_INF, minYards: 0, maxYards: 0, tackled: true, broken: false },
        ],
      },
      /**
       * §14.4 TACKLE ATTEMPT, verbatim:
       * `d100 + Elusiveness÷5 + Power÷5` vs `d100 + Tackling÷5 + Strength÷5`.
       * This is the check whose success IS a broken tackle, which is what §17.2
       * counts.
       */
      secondLevel: {
        checkKind: "break_tackle" satisfies CheckKind,
        carrierTerms: [
          { attr: "elusiveness", divisor: 5 },
          { attr: "power", divisor: 5 },
        ],
        tacklerTerms: [
          { attr: "tackling", divisor: 5 },
          { attr: "strength", divisor: 5 },
        ],
        bands: [
          { label: "BROKEN_TACKLE", minMargin: 15, minYards: 0, maxYards: 0, tackled: false, broken: true },
          { label: "PARTIAL_TACKLE", minMargin: 1, minYards: 2, maxYards: 4, tackled: true, broken: false },
          { label: "TACKLED", minMargin: NEG_INF, minYards: 0, maxYards: 0, tackled: true, broken: false },
        ],
      },
      /**
       * §14.3 STALEMATE: "Contact at LOS — Roll: RB Power vs. Tackler Tackling."
       * One term each, as written. The doc states NO result bands for it, so the
       * split is at zero and the yardage below is INTERPRETATION: a back who
       * wins a collision at the line falls forward and the play goes on; one who
       * loses is down where he stood.
       */
      atLosPower: {
        checkKind: "tackle" satisfies CheckKind,
        carrierTerms: [{ attr: "power", divisor: 5 }],
        tacklerTerms: [{ attr: "tackling", divisor: 5 }],
        bands: [
          { label: "FELL_FORWARD", minMargin: 1, minYards: 1, maxYards: 2, tackled: false, broken: true },
          { label: "STOPPED", minMargin: NEG_INF, minYards: 0, maxYards: 0, tackled: true, broken: false },
        ],
      },
      /**
       * §14.3 PENETRATION: "RB must evade — Roll: RB Elusiveness vs. DL
       * Tackling. Success: RB avoids, reduced gain. Failure: TFL." The loss on
       * a failure is `runGame.tflYardsLost`, applied by the resolver.
       */
      atLosEvade: {
        checkKind: "tackle" satisfies CheckKind,
        carrierTerms: [{ attr: "elusiveness", divisor: 5 }],
        tacklerTerms: [{ attr: "tackling", divisor: 5 }],
        bands: [
          { label: "EVADED", minMargin: 1, minYards: 0, maxYards: 0, tackled: false, broken: true },
          { label: "TACKLED_FOR_LOSS", minMargin: NEG_INF, minYards: 0, maxYards: 0, tackled: true, broken: false },
        ],
      },
    },
    /** Appendix B "Power Runner: +10 to break tackles". */
    carrierTraits: { powerRunner: 10 },
    /** Appendix B "High Motor: +5 to pursuit" / §4.9's "every pursuit situation". */
    tacklerTraits: { highMotor: 5 },
    /**
     * §14.4 PURSUIT ANGLE CHECK, verbatim:
     * `d100 + Pursuit÷5 + Instincts÷5` vs `50 + (RB Speed − Defender Speed)`.
     *
     * Note the target term is a RAW rating difference, not a ÷5 one — it is the
     * doc's, and it is the largest single term anywhere in the engine (±99 in
     * principle). A defender who fails it never gets a tackle attempt.
     */
    pursuitAngle: {
      target: 50,
      defenderTerms: [
        { attr: "pursuit", divisor: 5 },
        { attr: "instincts", divisor: 5 },
      ],
      speedAttr: "speed",
    },
    /**
     * Which zones gate a tackle attempt behind a §14.4 pursuit-angle check.
     * §13's YAC zones 1-3 do not: §13.2/§13.3 send an unblocked defender
     * straight into the tackle attempt, and only §13.1's zone 4 is "pursuit
     * only". §14.4 gates the whole second level, which is the doc's own
     * difference between the two sections rather than an engine choice.
     */
    pursuitGateZones: { YAC: [4], RUSH: [2, 3, 4] },
    /**
     * §13.4 BREAKAWAY, verbatim:
     * `d100 + Speed÷5 + Acceleration÷5` vs `d100 + Speed÷5 + Pursuit÷5`.
     * Appendix B "Home Run Hitter: +15 to breakaway".
     */
    breakaway: {
      carrierTerms: [
        { attr: "speed", divisor: 5 },
        { attr: "acceleration", divisor: 5 },
      ],
      pursuerTerms: [
        { attr: "speed", divisor: 5 },
        { attr: "pursuit", divisor: 5 },
      ],
      traits: { homeRunHitter: 15 },
      bands: [
        { label: "TOUCHDOWN_POTENTIAL", minMargin: 15, freeRun: true },
        { label: "SIGNIFICANT_GAIN", minMargin: 1, freeRun: false },
        { label: "PURSUIT_ANGLE_WORKS", minMargin: NEG_INF, freeRun: false },
      ],
      /**
       * INTERPRETATION of "Touchdown potential". A carrier nobody has an angle
       * on runs to the goal line rather than to the end of §13.1's zone table
       * (which stops at 60 yards and would strand a 70-yard breakaway on the
       * ten). Set false to make a free runner merely clear the remaining zones.
       *
       * This is the single largest yardage lever in §13/§14: the check only
       * fires on a carrier who is already past `breakawayAfterZone` clean, but
       * once it does, an opposed roll won by 15+ is the whole rest of the field.
       */
      freeRunReachesGoalLine: true,
    },
    /**
     * §13.3 / §14.5 — BLOCKING IN SPACE. Three named block types.
     *
     * ⚠ §13.3 and §14.5 DISAGREE about the stalk block's defender: §13.3 says
     * "WR Run Block vs. CB Block Shed + Tackling" and §14.5 says "Roll: WR Run
     * Block vs. CB Block Shed" — two terms against one for the same block.
     * §13.3's is used, because it is the section that enumerates block TYPES and
     * gives each one its own stack; §14.5's shorter form is recorded here and is
     * recovered by deleting the `tackling` term. Not rescaled either way.
     */
    blockInSpace: {
      checkKind: "downfield_block" satisfies CheckKind,
      profiles: {
        STALK: {
          blockerTerms: [{ attr: "runBlock", divisor: 5 }],
          defenderTerms: [
            { attr: "blockShed", divisor: 5 },
            { attr: "tackling", divisor: 5 },
          ],
          blockerBonus: 0,
        },
        /** §13.3 "CRACK BLOCK: +10 to block (defender not expecting)". */
        CRACK: {
          blockerTerms: [{ attr: "runBlock", divisor: 5 }],
          defenderTerms: [{ attr: "blockShed", divisor: 5 }],
          blockerBonus: 10,
        },
        /** §14.5 "TE/FB Lead Block: Run Block + Strength vs. Tackling + Strength". */
        LEAD: {
          blockerTerms: [
            { attr: "runBlock", divisor: 5 },
            { attr: "strength", divisor: 5 },
          ],
          defenderTerms: [
            { attr: "tackling", divisor: 5 },
            { attr: "strength", divisor: 5 },
          ],
          blockerBonus: 0,
        },
      },
      /**
       * NOT APPLIED — §13.3's "−15 if illegal (blindside, low)". The engine has
       * no blindside and no block height, and inventing either to spend a
       * modifier would assert a fact no die and no input produced (ADR-005).
       * Recorded so the doc's number is not lost, exactly as `backWasTurned` is
       * in §12.4.
       */
      illegalCrackPenalty: -15,
      /** §14.5's bands. A tie is not "defender wins", so it holds. */
      bands: [
        { label: "PANCAKED", minMargin: 10, occupied: true },
        { label: "SEALED", minMargin: 0, occupied: true },
        { label: "SHED", minMargin: NEG_INF, occupied: false },
      ],
      traits: { roadGrader: 10 },
    },
  },

  /** §17 result bookkeeping. */
  result: {
    /**
     * INTERPRETATION, and RECLASSIFIED (breadth pass 2) rather than retired.
     *
     * This was flagged as "a placeholder standing in for a tackle resolution"
     * that §14 would supply. §14 does not supply it: the design doc states no
     * sack yardage anywhere — §7.2 ends the play at "sack" and §17.2 counts
     * sacks without a distance — and §14.3's own tackle for loss is equally
     * silent (`runGame.tflYardsLost` is the twin invention). Retiring this
     * constant would therefore mean fabricating a rule, not implementing one, so
     * it stays flat and is now honestly labelled: an engine constant filling a
     * doc gap, of the same class as `tflYardsLost`, not a stub awaiting a
     * section that turned out not to exist.
     */
    sackYardsLost: 7,
    touchdownPoints: 6,
    /** Seconds burned after the ball is dead, added to the play's elapsed time. */
    clockRunoff: {
      completion: 5,
      incompletion: 0,
      sack: 5,
      throwaway: 0,
      interception: 0,
      scrambleRun: 5,
      run: 5,
    },
    firstDownResetsDistance: 10,
  },
} as const;

export type Tunables = typeof TUNABLES;

// --- the calibration patch interface (ADR-012) -------------------------------

/**
 * ONE tuning change, in the shape `docs/design/calibration.md` §3.1 states:
 * *"Calibration proposals are patches, not edits:
 * `{tunableId, currentValue, proposedValue, evidence, expectedEffect}` filed as
 * ADR petitions."*
 *
 * `tunableId` is the dotted path of a LEAF inside `TUNABLES`
 * ("passRush.blockerStructuralAdvantage", "ballCarrier.contests.yac.bands.0.minMargin").
 * `evidence` and `expectedEffect` are the petition's own prose: this module
 * records them and reads neither, because neither is an engine input.
 */
export interface TunablePatch {
  readonly tunableId: string;
  /** What the patch was written against. A mismatch is a STALE patch and throws. */
  readonly currentValue: string | number | boolean;
  readonly proposedValue: string | number | boolean;
  /** Report reference the proposal cites. Carried, never interpreted. */
  readonly evidence: string;
  readonly expectedEffect: string;
}

export class TunablePatchError extends Error {
  constructor(message: string) {
    super(`@ff/engine: tunable patch — ${message}`);
    this.name = "TunablePatchError";
  }
}

/**
 * Apply one patch, purely: the argument is never touched and a new `Tunables` is
 * returned with structural sharing along the untouched branches. Fold a list
 * with `patches.reduce(applyTunablePatch, TUNABLES)`.
 *
 * Four rejections, all loud, because a silently-ignored patch is a calibration
 * report about a simulation that never ran:
 *   1. the path does not exist;
 *   2. the path names a branch (an object or an array) rather than a leaf;
 *   3. `currentValue` disagrees with what is actually there — the patch was
 *      written against a different tunables version;
 *   4. `proposedValue` is a different primitive type from the value it replaces.
 *
 * NOTE ON THE RETURN TYPE. `Tunables` is `typeof TUNABLES` on an `as const`
 * object, so every leaf carries a LITERAL type (`blockerStructuralAdvantage: 15`).
 * A patched copy is the same shape with a different literal, which no amount of
 * generic machinery can express; the single cast below is that fiction and
 * nothing more. It is not `any` and it hides no runtime uncertainty — the four
 * checks above have already established the shape.
 */
export function applyTunablePatch(tunables: Tunables, patch: TunablePatch): Tunables {
  const path = patch.tunableId.split(".");
  if (path.length === 0 || patch.tunableId === "") {
    throw new TunablePatchError("tunableId is empty");
  }

  const rewrite = (node: unknown, depth: number): unknown => {
    const key = path[depth];
    if (key === undefined) throw new TunablePatchError(`path "${patch.tunableId}" ran out of segments`);
    if (typeof node !== "object" || node === null) {
      throw new TunablePatchError(
        `"${path.slice(0, depth).join(".")}" is a leaf, so "${patch.tunableId}" does not exist`,
      );
    }
    const record = node as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      throw new TunablePatchError(`"${patch.tunableId}" is not a path into TUNABLES`);
    }
    const child = record[key];

    if (depth === path.length - 1) {
      if (typeof child === "object" && child !== null) {
        throw new TunablePatchError(
          `"${patch.tunableId}" names a branch, not a tunable value; patch a leaf`,
        );
      }
      if (child !== patch.currentValue) {
        throw new TunablePatchError(
          `"${patch.tunableId}" is ${String(child)}, but the patch was written against ` +
            `${String(patch.currentValue)} — stale patch, re-measure before filing`,
        );
      }
      if (typeof child !== typeof patch.proposedValue) {
        throw new TunablePatchError(
          `"${patch.tunableId}" is a ${typeof child}; the patch proposes a ${typeof patch.proposedValue}`,
        );
      }
      const next = Array.isArray(record) ? [...record] : { ...record };
      (next as Record<string, unknown>)[key] = patch.proposedValue;
      return next;
    }

    const next = Array.isArray(record) ? [...record] : { ...record };
    (next as Record<string, unknown>)[key] = rewrite(child, depth + 1);
    return next;
  };

  return rewrite(tunables, 0) as unknown as Tunables;
}
