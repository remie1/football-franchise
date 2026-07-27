/**
 * TUNABLES — every target number, band threshold, weight and trait bonus the
 * pass-play slice uses. Calibration adjusts this object; resolution code holds
 * no magic numbers.
 *
 * Each block cites the section of docs/design/match-engine.md it implements.
 * Where the design doc is qualitative ("CB in phase", "route disrupted"), the
 * numeric expression of that outcome lives here under a descriptive key and is
 * marked INTERPRETATION so calibration knows it is a knob, not a doc quote.
 */

const NEG_INF = Number.NEGATIVE_INFINITY;

export const TUNABLES = {
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
   * §7.2 — pocket status. Two inputs, combined by taking the WORSE of the two,
   * both read from tick T−0.5 so the doc's one-tick lag ("pressure/hit next
   * tick") holds:
   *
   *  1. `minimumStatusByBand` — the doc's rule, stated per rusher and per tick.
   *     One won rep is sufficient; it is not a quantity that must accumulate.
   *  2. `thresholds` — the accumulated per-rusher pressure counter, which is
   *     what escalates a sustained rush to IMMEDIATE and then to a SACK. The
   *     counter can only make the status worse than the band floor, never
   *     better.
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
     * decide THIS tick: throw, scramble, or sack". Scrambling is out of the
     * slice, so a QB with nobody to throw to and the pocket caving in goes
     * down — he cannot calmly set and throw the ball away. Throwaways are what
     * happens when the clock, not the rush, runs out.
     *
     * CALIBRATION FLAG (raised by the B1 fix, July 2026). This list was set
     * while COLLAPSING required ~3 accumulated won reps. Now that §7.2's
     * single-rep rule is implemented as written, COLLAPSING means "one rusher
     * beat one block last tick" and arrives at tick 1.0 on ~63% of dropbacks —
     * before any route has developed — which takes the fixture matchup to a 56%
     * sack rate. Two dials are implicated and BOTH belong to the §7.1 KNOWN
     * ISSUE (term asymmetry) that the design doc defers to Phase 3:
     *   - `passRush.blockerStructuralAdvantage`, the pressure-rate dial;
     *   - this list, i.e. whether "take hit" at COLLAPSING is really a sack when
     *     the engine has no rusher time-of-arrival model.
     * Left at the pre-patch value deliberately: changing it here would move a
     * calibration dial under cover of a defect fix. Measured alternatives are in
     * the patch report.
     */
    sackWhenNoTarget: ["COLLAPSING", "IMMEDIATE"],
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
    /** §8.1 reads per tick and progression length by reading system. */
    readSystem: {
      HALF_FIELD: { readsPerTick: 1, maxReads: 3 },
      FULL_FIELD: { readsPerTick: 0.5, maxReads: 4 },
      CONCEPT: { readsPerTick: 2, maxReads: 2 },
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
    /** §8.7 time budget: 2.5 + (Pocket Patience − 70) ÷ 20 seconds. */
    timeBudget: { baseSeconds: 2.5, baseline: 70, divisor: 20 },
    /**
     * INTERPRETATION: the doc never states the openness at which a QB pulls the
     * trigger. These two thresholds are the primary aggression knobs.
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

  /** §17 result bookkeeping. YAC is out of this slice, so gains are air yards. */
  result: {
    sackYardsLost: 7,
    touchdownPoints: 6,
    /** Seconds burned after the ball is dead, added to the play's elapsed time. */
    clockRunoff: {
      completion: 5,
      incompletion: 0,
      sack: 5,
      throwaway: 0,
      interception: 0,
    },
    firstDownResetsDistance: 10,
  },
} as const;

export type Tunables = typeof TUNABLES;
