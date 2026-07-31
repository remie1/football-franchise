/**
 * TUNABLES — every target number, band threshold, weight and trait bonus the
 * pass-play slice uses. Calibration adjusts this object BY PATCHING IT into a
 * new one (ADR-012); resolution code holds no magic numbers.
 *
 * The object is DEEPLY FROZEN at module load and re-exported as
 * `DEFAULT_TUNABLES` (ADR-016 item 2). Nothing in the engine writes to it, and
 * now nothing outside can either — a patch produces a new tree, which is the
 * only way a tunables version ever changes.
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
import type { ByPocketStatus, PocketStatus } from "./types.js";

const NEG_INF = Number.NEGATIVE_INFINITY;
/**
 * The other end of the same idea as `NEG_INF`: a horizon that never runs out.
 *
 * WAS the default for `arrival.pressureWithinSeconds`, reproducing "any live
 * threat at any distance" as a DECLARED value rather than as a missing branch.
 * Owner ruling (July 2026, same reasoning as ADR-032, one channel over) bounded
 * that field at `2.0` — see its `DERIVED MECHANIC` comment. Kept defined and
 * exported to nothing but the module scope so a null-arm or reproduction sweep
 * can still patch the field back to it by name.
 */
const POS_INF = Number.POSITIVE_INFINITY;

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
   * Generic 17-tier ladder (contracts ResultTier) applied to every check's
   * margin. The doc's own per-check result bands are separate, named band
   * tables below (`passRush.bands` etc.) and this ladder does not feed them.
   *
   * RE-BANDED July 2026 (ADR-052, ratified ADR-053) from the committed 9 rungs
   * (floors `1 / 5 / 15 / 30`, mirrored) to 17 (floors `1 / 5 / 15 / 30 / 45 /
   * 60 / 75 / 90`, mirrored). The committed floors through `STRONG_SUCCESS`
   * (`30` and inward) are UNCHANGED — ADR-052 §2 derives the new floors as a
   * continuation of the ladder's own outermost bounded width (15) rather than
   * a re-derivation of the whole ladder, and ADR-052's proposal states it
   * explicitly: "§7.1's minMargin is not touched. Nothing at or inside ±29
   * moves." `passRush.bands` (`:275`) is untouched by this edit and must stay
   * that way — its floors are a separate table and re-partitioning THIS ladder
   * above 15 cannot move `P(margin ≥ 15)` (ADR-053 §5, verified independently
   * below).
   *
   * ⚠ `CRITICAL_SUCCESS` IS RENAMED BY FLOOR, NEVER BY LABEL. The committed
   * rung at floor 30 is RETIRED under that name — floor 30 is now
   * `DECISIVE_SUCCESS` — and a NEW rung at floor 60 takes the name
   * `CRITICAL_SUCCESS`. The word appears twice in this transformation and a
   * label-keyed rename (`s/CRITICAL_SUCCESS/DECISIVE_SUCCESS/`) would rewrite
   * both, which is exactly the defect ADR-052 names as being of the same class
   * as a status-keyed lookup with `?? 0`. Every row below is therefore written
   * out fresh by FLOOR, not edited from the old list.
   *
   * NAMING is the OUTER assignment (ADR-052 §6, ADR-053 ruling 3): `CRITICAL`
   * sits at `[60, 74]` (4.950% at shift 0) rather than immediately outside
   * `STRONG_SUCCESS` at `[30,44]` (9.450%, the ADJACENT reading). OUTER is what
   * satisfies the owner's own "low single digits on an even contest" test for
   * a critical outcome, and it is the assignment under which
   * `tippedBall.test.ts`'s `CRITICAL_FAILURE` filter moves by zero (ADR-053
   * §8) — verify against the LIVE test file after this edit, not against the
   * ADR's transcription of it.
   *
   * SCOPE is the engine's own shift set, not shift 0 (ADR-053 ruling 1). The
   * derivation's STOP is evaluated at `ENGINE_OPPOSED_SHIFTS` (worst case
   * ±20), which is `packages/calibration`'s own name for the set this project
   * verified independently at dispatch time: with floors `15/30/45/60/75`
   * (five rungs above STRONG_SUCCESS's floor, i.e. the old 9-rung ladder's
   * shape extended by only one rung) occupancy is strictly increasing inward
   * at shifts 0 through ±8 but INVERTS at |shift| = 12 and beyond — 6 of the
   * engine's 11 even-contest shifts. Adding the fourth rung (floor 90) is what
   * restores strict monotonicity at every one of the 11 shifts; this was
   * computed directly (closed-form triangular survival on d100−d100, not
   * sampled) rather than taken on the ADR's word, because Charter §4.1 now
   * requires exactly that of a ratified ruling's numeric claims.
   *
   * ⛔ THE ADR SAID THIS GATE WAS "ADR-032's". IT IS NOT. ADR-032 is the
   * `PocketStatus`-severity/`SACK`-ordering finding (see `pocket.severity`
   * above) — an unrelated ladder. The tail-monotonicity derivation and its
   * gate (`tailMonotone`, `ENGINE_OPPOSED_SHIFTS`) are ADR-050/ADR-052's, and
   * they live in `packages/calibration/src/knownTruth/ladderTail.ts`, already
   * scoped to the engine's shift set rather than shift 0. There is no
   * occupancy-monotonicity gate over this ladder anywhere in `packages/engine`
   * — `bandGuards.ts`'s gate is a column-ordering check over per-check EFFECT
   * columns, and this table carries none (every row here is bare
   * `{label, minMargin}`), so it is structurally out of that gate's scope.
   * Flagged rather than duplicated; routed back to the Orchestrator.
   */
  resultTierLadder: [
    { label: "TOTAL_SUCCESS", minMargin: 90 },
    { label: "OVERWHELMING_SUCCESS", minMargin: 75 },
    { label: "CRITICAL_SUCCESS", minMargin: 60 },
    { label: "DOMINANT_SUCCESS", minMargin: 45 },
    { label: "DECISIVE_SUCCESS", minMargin: 30 },
    { label: "STRONG_SUCCESS", minMargin: 15 },
    { label: "SUCCESS", minMargin: 5 },
    { label: "MARGINAL_SUCCESS", minMargin: 1 },
    { label: "TIE", minMargin: 0 },
    { label: "MARGINAL_FAILURE", minMargin: -4 },
    { label: "FAILURE", minMargin: -14 },
    { label: "STRONG_FAILURE", minMargin: -29 },
    { label: "DECISIVE_FAILURE", minMargin: -44 },
    { label: "DOMINANT_FAILURE", minMargin: -59 },
    { label: "CRITICAL_FAILURE", minMargin: -74 },
    { label: "OVERWHELMING_FAILURE", minMargin: -89 },
    { label: "TOTAL_FAILURE", minMargin: NEG_INF },
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

  /**
   * §5.3 PRE-SNAP BLITZ RECOGNITION, and the hot route that is its whole point.
   *
   * WHEN THIS ROLLS, and it is an INTERPRETATION worth stating because the doc
   * gives no trigger: **when the defence sends a rusher the protection does not
   * name.** That is the moment §5.3 describes — "blitz shows" — and it is the
   * only moment at which recognition changes anything, because a pressure the
   * protection already accounts for has nothing to recognise. A play where every
   * rusher is blocked therefore rolls NOTHING here (ADR-005: an absent check
   * means no die was thrown, never a failed one).
   *
   * §5.3 states two consequences of success and the engine honours both:
   * "hot route available" (`hotRoute` below) and "protection adjusted"
   * (`blitzPickup.recognitionModifier`).
   */
  presnap: {
    blitzRecognition: {
      /** §5.3 verbatim: `d100 + QB Awareness÷5 + Centre Awareness÷5` vs `50 + disguise`. */
      target: 50,
      attrDivisor: 5,
      /**
       * §5.3's disguise table, verbatim. Stated by the defensive card; a card
       * that says nothing is a standard blitz, which is the doc's own +0 row and
       * therefore a default that asserts nothing.
       */
      disguise: { STANDARD: 0, ZONE_BLITZ: 15, DELAYED: 20, ZERO: 25 },
      /**
       * §5.3 gives two outcomes ("SUCCESS" / "FAILURE"); the four bands are the
       * usual margin split so the stream can say HOW well he saw it. Only
       * `recognized` is consumed.
       */
      bands: [
        { label: "READ_IT", minMargin: 20, recognized: true },
        { label: "RECOGNIZED", minMargin: 0, recognized: true },
        { label: "MISSED", minMargin: -20, recognized: false },
        { label: "FOOLED", minMargin: NEG_INF, recognized: false },
      ],
    },
    /**
     * §5.3's "hot route available" and §7.4 step 2's "QB must recognize and
     * throw hot".
     *
     * WHAT THE ENGINE DOES: a route the card marks hot CONVERTS — its depth
     * class, air yards and break zone become the hot spec's — and the converted
     * receivers move to the front of the progression. Both are stated on the
     * card; neither is inferred.
     *
     * WHAT THE ENGINE REFUSES TO DO: force the throw. §7.4 says the quarterback
     * "must" throw hot, but making it unconditional would assert a decision no
     * roll produced and would bypass §8.5 entirely. He looks there FIRST; §8.5
     * still decides.
     */
    hotRoute: {
      movesToFrontOfProgression: true,
    },
  },

  /** §7.1 — per-tick rusher vs. blocker opposed roll. */
  passRush: {
    rusherAttrDivisor: 5,
    blockerAttrDivisor: 5,
    /**
     * INTERPRETATION — not in the doc's table. §7.1 gives the rusher two or
     * three attribute terms; this flat term represented protection's structural
     * edge (extra blockers, depth of the drop, the rusher having ground to
     * cover) and stood in for the blocker's missing third term.
     *
     * **0 SINCE ADR-028, COUPLED TO THE `anchor` TERM IN `resolve/passRush.ts`.**
     * The two changes are one change: the blocker now has three ATTRIBUTE terms
     * (`passBlock`, `footwork`, `anchor`) instead of two attributes plus a
     * constant. Never restore a non-zero value here without removing that term,
     * or the blocker is compensated twice.
     *
     * WHY 0 rather than a better constant. ADR-028 swept this dial across its
     * whole reachable range (0…500, 60 configurations, 496 games each) and there
     * is no value at which the pressure family is jointly in band: `p→s` is
     * matched at ~12, `sack_rate` at ~40, `pressure_rate` at ~95, and at 95 only
     * 0.732% of reps clear margin 1 — the contest stops deciding anything. The
     * dial is not the pressure-rate lever it was documented as: with the §7.1 rep
     * extinguished entirely, pressure is still 24.5%, all of it §7.3/§7.4 free
     * channel. §7.1's entire budget is 4.70pp of a 59.9pp gap.
     *
     * WHAT THE CHANGE BOUGHT, and it is not a mean. Pressure 89.144→89.493% and
     * sack 13.542→14.555% both moved slightly the WRONG way; `pressure_to_sack`
     * moved 15.191→16.264% against a real 16.371%, the best measured anywhere in
     * the sweep. The gain is structural: a constant contributes nothing to the
     * slope of protection against line quality, so at a 20-rated line 65.2% of
     * the blocker's edge was rating-invariant. It is now 0%, and pressure's
     * response to line quality is ~2.9× as steep. Tier 1 means are recoverable
     * later; structural insensitivity is not.
     *
     * It remains a live dial and a legal patch target — it is simply no longer
     * the pressure-rate lever.
     *
     * ⚠ THE POINTER THAT USED TO END THIS COMMENT IS SPENT. It said
     * "`freeRunnerArrivalSeconds` is next in line"; ADR-030 swept that tunable
     * across nine rungs on eight seed lists and refuted it too — its whole
     * budget is 0.406pp of sack and it cannot move the pressure rate at all
     * (0.20pp across the entire grid, including the rung where the rusher never
     * arrives). **Both named suspects are eliminated.** So is the third:
     * ADR-032 swept `pocket.minimumStatusByBand` across its whole reachable
     * domain and priced it at 2.382 ± 0.051pp of pressure and 0.000pp of sack,
     * with 88.3% of the divergence surviving EVERY §7.2 classification threshold
     * being extinguished. ADR-033 then changed that row on football grounds and
     * banked a delta inside that envelope — a definition correction, not a lever.
     * The ONE remaining named candidate was `arrival.pressureWithinSeconds`,
     * which ADR-031 named so that it could be swept at all. Entry 1e swept it —
     * see `arrival.pressureWithinSeconds`'s own `DERIVED MECHANIC` comment for
     * the ruling and the bound it landed at (2.0, no longer `POS_INF`) — and
     * refused it as a `pressure_rate` lever, same as every candidate before it.
     * The rate is a SUPPLY problem (§7.1/§7.3/§7.4 threat creation), not a
     * classification problem; see `CALIBRATION-BACKLOG.md` entry 40.
     */
    blockerStructuralAdvantage: 0,
    /** "Counter move: +15 if previous tick was stalemate". */
    counterMoveAfterStalemate: 15,
    /** Which rush move each conditional trait bonus attaches to. */
    quickTwitchMove: "SPEED",
    brickWallMove: "POWER",
    /**
     * Margin = rusher total − blocker total.
     *
     * SIX BANDS, NOT FIVE — §7.2's July 2026 amendment, ADR-033. The doc's
     * original sentence made ONE band of everything between a stalemate and a won
     * rep and called all of it pressure ("1+ rushers winning by 1-14"). The owner
     * has ruled that sentence wrong: **gaining ground is not pressure.** A rusher
     * who has gained a step against a blocker still in front of him has not
     * disturbed the passer's platform, vision or timing, and 1-14 contains both
     * that man and the man who has genuinely beaten the block.
     *
     * So the interval is SPLIT, and the split point is not invented:
     *
     *   RUSHER_GAINING    1-4    `resultTierLadder`'s MARGINAL_SUCCESS. He got
     *                            something, marginally. The blocker is losing
     *                            ground and is still in front of him. → CLEAN.
     *   BLOCKER_BEATEN    5-14   `resultTierLadder`'s SUCCESS. The rusher has won
     *                            the leverage; the blocker is beaten and is now
     *                            recovering rather than controlling. → PRESSURE.
     *   RUSHER_WINS_REP   15+    `resultTierLadder`'s STRONG_SUCCESS, unchanged.
     *                            He is past him and TRAVELLING (see `arrival`).
     *
     * WHY 5 AND NOT A NUMBER CHOSEN BY FEEL. §7 gives no interior boundary at all,
     * so the choice had to come from somewhere; the only margin vocabulary this
     * engine has is `resultTierLadder`, which every check in the game is read on.
     * This table ALREADY agrees with it at two of its three interior boundaries —
     * 15 is STRONG_SUCCESS, 1 is MARGINAL_SUCCESS, −15 is STRONG_FAILURE — so the
     * one boundary the ladder offers between "marginal" and "decisive" is 5, and
     * adopting it makes the §7.1 bands a projection of the universal ladder rather
     * than a private set of numbers. Rejected: **1** (the committed value, and the
     * thing the amendment overturns — it makes a one-point edge pressure); **8**
     * ("half way to a won rep", a number with no referent anywhere else in the
     * engine); **15** (that is the won rep, and it would delete limb (b) of the
     * amendment rather than implement it).
     *
     * It is a `minMargin` like every other and calibration patches it by path
     * (`passRush.bands`), so being wrong about 5 costs a sweep, not an excavation.
     */
    bands: [
      { label: "RUSHER_WINS_REP", minMargin: 15 },
      { label: "BLOCKER_BEATEN", minMargin: 5 },
      { label: "RUSHER_GAINING", minMargin: 1 },
      { label: "STALEMATE", minMargin: 0 },
      { label: "BLOCKER_CONTAINS", minMargin: -14 },
      { label: "BLOCKER_RESETS", minMargin: NEG_INF },
    ],
    /**
     * §7.2 — pressure accrues per rusher. INTERPRETATION: the doc describes
     * statuses qualitatively; this counter is the mechanism that produces them.
     * A blocker win by 15+ ("rusher reset, starts fresh") zeroes the counter.
     *
     * DELIBERATELY UNCHANGED BY ADR-033's BAND SPLIT: `BLOCKER_BEATEN` inherits
     * `RUSHER_GAINING`'s row exactly, so the counter cannot tell the two apart and
     * the whole measured effect of the amendment is attributable to the status
     * map. It also makes the two mechanisms agree for the first time: the floor
     * now says one tick of gaining is not pressure, and the counter says three
     * ticks of it is (`pocket.thresholds.PRESSURE` = 3 at +1 a tick). Before the
     * amendment the floor short-circuited the counter and that sentence was
     * unreachable.
     */
    pressureProgressByBand: {
      RUSHER_WINS_REP: { delta: 2, reset: false },
      BLOCKER_BEATEN: { delta: 1, reset: false },
      RUSHER_GAINING: { delta: 1, reset: false },
      STALEMATE: { delta: 0, reset: false },
      BLOCKER_CONTAINS: { delta: 0, reset: false },
      BLOCKER_RESETS: { delta: 0, reset: true },
    },
  },

  /**
   * §7.3 — STUNTS AND TWISTS.
   *
   * One communication check per stunt, resolved at the snap because that is when
   * the exchange happens. The two outcomes the doc names are both real changes to
   * the line battle rather than a modifier:
   *
   *   PASSED OFF   "normal matchups resume" — and the matchups that resume are
   *                SWAPPED, because that is what a twist IS. The penetrator ends
   *                up on the looper's blocker and vice versa, so a stunt the line
   *                handles still changes who is blocking whom. A version that
   *                left the pairing alone would make a successful stunt a no-op,
   *                which is not what "passed off cleanly" means.
   *   FAILED       "free rusher created (the looper)" — the looper's blocker is
   *                gone and the looper arrives on his own clock.
   */
  stunt: {
    /** §7.3 verbatim: `d100 + Centre Awareness÷5 + Adjacent OL Awareness÷5` vs `60 + complexity`. */
    target: 60,
    attrDivisor: 5,
    /** §7.3's complexity table, verbatim. Stated by the defensive card. */
    complexity: { T_E: 0, T_T: 10, DELAYED: 15, TRIPLE: 25 },
    /**
     * INTERPRETATION — which "adjacent OL". The doc names the centre plus one
     * neighbour; the engine uses **the looper's own blocker**, because he is the
     * man who has to take the exchange and the man who is beaten when it fails.
     * The centre term is present only when the card names a centre: no centre is
     * stated, no centre term is rolled, and the stream shows exactly which terms
     * applied rather than a silently-substituted stand-in.
     */
    bands: [
      { label: "PASSED_OFF_CLEAN", minMargin: 20, passedOff: true, arrivalDelaySeconds: 0.0 },
      { label: "PASSED_OFF", minMargin: 0, passedOff: true, arrivalDelaySeconds: 0.0 },
      { label: "LATE_EXCHANGE", minMargin: -19, passedOff: false, arrivalDelaySeconds: 0.5 },
      { label: "LOOPER_FREE", minMargin: NEG_INF, passedOff: false, arrivalDelaySeconds: 0.0 },
    ],
    /**
     * INTERPRETATION — §7.3 gives the looper "an unblocked rush at QB" and no
     * time. A loop is a longer path than a straight blitz, so he is slower than
     * §7.4's free runner, and `arrivalDelaySeconds` above separates a late
     * exchange (somebody got a hand on him) from a clean miss.
     */
    looperArrivalSeconds: 2.0,
  },

  /**
   * §7.4 — BLITZ PICKUP, and the free runner that is the whole reason it exists.
   *
   * The doc's four steps map exactly onto four engine behaviours:
   *
   *   1. RECOGNITION   deterministic, no die. A rusher is ACCOUNTED FOR if a
   *                    `ProtectionAssignment` names him (man protection), or if
   *                    the card declares a slide and he comes from the slide side
   *                    with a slide blocker still free. Everything else is
   *                    UNACCOUNTED, which is what starts §5.3's recognition roll.
   *   2. HOT ROUTE     `presnap.hotRoute`, gated on §5.3's recognition.
   *   3. PICKED UP     the contest below — the back or tight end who stayed in.
   *   4. FREE RUNNER   nobody left to pick him up, or the pickup was lost.
   *
   * WHAT THIS UNBLOCKS, and it is the point of the dispatch: the engine used to
   * REJECT a rusher no protection named (`UnsupportedPlayCallError`). That forced
   * every caller to build blocking against the actual defensive card, so
   * protection was perfectly informed and pressure was biased DOWN
   * (`CALIBRATION-BACKLOG.md` entry 21). A free runner is football; it is now
   * resolved rather than refused.
   */
  blitzPickup: {
    /** §7.4 step 3 verbatim: RB/TE Pass Block vs Blitzer Pass Rush. */
    blockerAttrDivisor: 5,
    rusherAttrDivisor: 5,
    /**
     * INTERPRETATION of §5.3's "protection adjusted". A blitz the quarterback and
     * the centre SAW is pointed out before the snap; one they missed is picked up
     * on instinct. This is the only place recognition touches the line, and it is
     * a modifier rather than a gate — §5.3's failure text is "free rusher
     * POTENTIAL", not "free rusher".
     */
    recognitionModifier: { RECOGNIZED: 10, MISSED: -10 },
    /**
     * Margin = blocker total − rusher total, so the bands read from the
     * PROTECTION's point of view, matching §7.4's own framing ("if picked up").
     */
    bands: [
      { label: "PICKED_UP_CLEAN", minMargin: 15, blocked: true, arrivalDelaySeconds: 0.0 },
      { label: "PICKED_UP", minMargin: 0, blocked: true, arrivalDelaySeconds: 0.0 },
      { label: "RAN_THROUGH", minMargin: -19, blocked: false, arrivalDelaySeconds: 0.5 },
      { label: "BLOWN_UP", minMargin: NEG_INF, blocked: false, arrivalDelaySeconds: 0.0 },
    ],
    /**
     * §7.4 step 4: "Blitzer reaches QB in ~1.5 ticks."
     *
     * AMBIGUOUS IN THE DOC AND RESOLVED HERE, DELIBERATELY. §2.1's ticks are 0.5
     * seconds, so "1.5 ticks" reads literally as 0.75s — but every tick in the
     * document is LABELLED in seconds ("Tick 1.5: MID-PROGRESSION"), and 0.75s
     * beats the earliest route in the game (§9.2's QUICK, 1.0s) on every snap,
     * which would make a blitz an automatic sack rather than a risk. Read against
     * the doc's own labels: he arrives at 1.5 seconds. The quick game and a hot
     * route beat him; nothing else does.
     */
    freeRunnerArrivalSeconds: 1.5,
    /**
     * §7.4's PATH TERM — ADR-030 petition 1, Option A, ratified; ADR-031 is the
     * implementation record. **ENTIRELY INTERPRETATION: the doc contains no
     * table here at all**, only the one sentence quoted above, and its "~1.5
     * ticks" was already an authoring ambiguity resolved for UNITS. Every number
     * below is invented structure and is marked as such.
     *
     * ================== WHAT IT REPAIRS ==================
     * `freeRunnerArrivalSeconds` alone was the only threat clock in the engine
     * that consulted no property of the man it was timing. §7.2's won-rep clock
     * reads alignment, move, margin and the next tick's band; §7.3's looper reads
     * the stunt band; §7.4 read the pickup band for the `PICKUP_LOST` share and,
     * for `UNBLOCKED`, nothing whatever — a nose tackle nobody blocked and a
     * safety blitzing from ten yards arrived at the same instant, on every snap.
     *
     * ================== THE ZERO POINT, WHICH IS THE WHOLE DESIGN ==================
     * These are SIGNED OFFSETS ON `freeRunnerArrivalSeconds`, not travel times,
     * and the man at offset 0.0 is **§7.4's own blitzer: a second-level defender
     * in the box, coming inside**. That is the man the doc's sentence is about
     * and the man the ratified value 1.5 was chosen for ("the quick game and a
     * hot route beat him; nothing else does"). So the ratified value keeps both
     * its number AND its meaning: it is now the model's origin instead of the
     * whole model, and the modal free runner's ETA is unchanged.
     *
     * **THIS IS NOT `arrival.travelSecondsByAlignmentAndMove`, AND MUST NOT
     * BECOME IT** (ADR-030 says so explicitly, and states the cost of the
     * mistake). That table's zero point is the instant a rusher DEFEATS A
     * BLOCKER, roughly a second into the rep and already past the man; it gives
     * INTERIOR 1.0 because a three-technique who beat a guard is four yards from
     * the launch point with nothing in front of him. A §7.4 free runner was
     * never engaged: his clock starts AT THE SNAP, from wherever he lined up.
     * Two different quantities that happen to share a unit. Importing that table
     * would have moved 63% of this population an entire half-second earlier and
     * ADR-030 priced it at roughly +0.6pp of sack.
     *
     * ================== THE TWO AXES, AND WHY THESE TWO ==================
     * WHERE HE STARTS, which is what the ratification asked for, and nothing
     * else. Both axes are already on the play call or the registry:
     *
     *   ALIGNMENT (`RushAssignment.alignment`, resolved by `rushAlignmentFor`)
     *     INTERIOR is a straight line at a launch point the drop moved TOWARDS
     *     him; EDGE is an arc around the pocket to a spot the quarterback has
     *     already vacated. Same asymmetry §7.2 asserts, at HALF its magnitude
     *     (+0.5s here against +0.5-1.0s there) because a free edge rusher has no
     *     blocker riding him wide — the arc is geometry, not a defeat.
     *
     *   DEPTH (`rusher.bio.position`, via the two lists below)
     *     LINE  a hand-in-the-dirt front (DE/DT/NT): a yard off the ball, the
     *           least ground of anybody, and the heaviest body covering it.
     *     BOX   a second-level defender (OLB/MLB/ILB): four or five yards further
     *           back, a faster body, and the man §7.4's sentence describes.
     *     DEEP  a defensive back blitzing (CB/FS/SS): the most ground by a
     *           distance, the fastest body, and the reason a corner blitz is a
     *           gamble rather than free pressure.
     *
     * ONE HALF-TICK PER AXIS PER STEP, and no step larger, because 0.5s is the
     * engine's quantum and the honest resolution of "how far back does he start"
     * is not finer than that. The extreme cells are a full second apart, which is
     * the claim the ratification made in words: a linebacker walked up to the A
     * gap (1.5s) and a safety blitzing off the edge from depth (2.5s) must not
     * arrive together.
     *
     * WHAT IS DELIBERATELY NOT AN AXIS. **`move`** — a rush move is something you
     * do TO a blocker, and this man has none; §7.2 reads it for exactly that
     * reason and §7.4 must not. **`side`** — left and right are mirror images,
     * and keying a travel time on which one would assert a handedness no football
     * supports. **Attributes** — the ratification says "keyed on where the rusher
     * starts", and a speed term would be a second petition, on a league that has
     * no speed variance to measure it with. ADR-031 records it as unclaimed.
     */
    freeRunnerPath: {
      /** Fronts with a hand in the dirt: least ground, heaviest body. */
      onLinePositions: ["DE", "DT", "NT"],
      /** Defensive backs: most ground, fastest body. */
      deepPositions: ["CB", "FS", "SS"],
      /**
       * Everything else — the second level. Named as a DEFAULT rather than as a
       * third list because it is the class §7.4's own sentence is about, so a
       * position nobody classified should land on the man the constant already
       * described, at offset 0.0, rather than somewhere new.
       */
      defaultDepthClass: "BOX",
      /**
       * Seconds ADDED TO `freeRunnerArrivalSeconds`. Authored on the 0.5s tick
       * grid for the same reason the pickup bands' `arrivalDelaySeconds` are, so
       * the sum lands on a tick that is actually emitted and no rounding step is
       * needed to put it there.
       */
      offsetSecondsByAlignmentAndDepth: {
        INTERIOR: { LINE: -0.5, BOX: 0.0, DEEP: 0.5 },
        EDGE: { LINE: 0.0, BOX: 0.5, DEEP: 1.0 },
      },
      /**
       * Bounds on the SUM (offset plus the pickup band's delay), so a patched
       * table cannot produce a negative ETA or one past `clock.maxTick`. §7.2 has
       * its own pair (`arrival.minTravelSeconds` / `maxTravelSeconds`) measuring a
       * different quantity from a different zero, so these are separate numbers
       * rather than a shared one.
       */
      minArrivalSeconds: 0.5,
      maxArrivalSeconds: 4.0,
    },
    /**
     * §7.4 step 1's slide: "Covered if blitzer on slide side." No contest — the
     * slide IS the answer, and the resulting matchup is an ordinary §7.1 rep.
     */
    slideIsUncontested: true,
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
      /** ADR-033's new band. A rusher who is winning does not lose ground. */
      BLOCKER_BEATEN: 0.0,
      RUSHER_GAINING: 0.0,
      STALEMATE: 0.0,
      BLOCKER_CONTAINS: 0.5,
      BLOCKER_RESETS: 0.0,
    },
    /**
     * CALIBRATION-BACKLOG entry 73 — `BLOCKER_CONTAINS` GETS A RETIREMENT ROUTE.
     * KEPT, NOT REPLACED: `recoverySecondsByBand.BLOCKER_CONTAINS` above is
     * UNCHANGED at 0.5 and still fires on every contained rep below this count.
     * This field answers a different question — not "how much ground does one
     * contained rep cost him" (that row, still true) but "how many contained
     * reps in a row means the block actually held" (this row, new).
     *
     * ============ THE FOOTBALL, PER ENTRY 73'S RULING ============
     * §7.1 names exactly one row that retires a rusher — "blocker wins by 15+:
     * rusher reset" — and `BLOCKER_CONTAINS` (margin 1-14) is explicitly not
     * that row (59-RESULT). But entry 71-RESULT's enumeration is also correct:
     * a stalemate, a gain, or a contain today only DELAYS, never retires, so a
     * rusher contained on EVERY remaining tick keeps an ETA that recedes at
     * exactly the rate the clock advances (`recoverySecondsByBand
     * .BLOCKER_CONTAINS` (0.5s) equals `clock.tickStepSeconds` (0.5s)) and
     * therefore never gets closer, never arrives, and never goes away. That is
     * a missing mechanic, not a calibration question, and the owner ruled on it
     * regardless of price (entry 73).
     *
     * The owner also flagged the risk in the other direction: "a rusher
     * contained on one tick and free on the next is a real football event," so
     * retiring on the FIRST contain would overcorrect — a single recovered rep
     * is one blocker winning one rep, not the block being won. §7.1's own
     * "Counter move: +15 if previous tick was stalemate" answers this
     * concretely for the neighbouring band: the model already lets a rusher who
     * was just held answer with a bonus on his VERY NEXT rep. Retiring him for
     * the tick that held him would delete the rep the counter move exists to
     * let him win.
     *
     * ============ WHY TWO, DERIVED RATHER THAN PICKED ============
     * Two independent structural facts, already ratified for other reasons,
     * agree on the same number:
     *
     *  1. ONE TICK IS THE MODEL'S OWN MEMORY DEPTH. `previousBand` is a single
     *     slot, carried for exactly one purpose today (the counter-move bonus
     *     above) — the design speaks in "this rep" and "the rep before it," and
     *     has never needed a longer window. The smallest pattern expressible at
     *     that depth that is not "any one rep" is "the same result twice in a
     *     row." Reaching for a three-tick or deeper window would be inventing a
     *     memory the model does not otherwise have, for this mechanic alone.
     *  2. THE ARITHMETIC AGREES. `recoverySecondsByBand.BLOCKER_CONTAINS` (0.5)
     *     times 2 is 1.0 — exactly `minTravelSeconds` below, the model's own
     *     floor for how close ANY threat, however dominant the win that created
     *     it, is ever allowed to be. Two consecutive contains buy back the
     *     entire closest-possible cushion; the "he is still coming, from
     *     further away" reading `delayThreat` gives a single contain stops
     *     having a coherent physical referent once the recovered ground alone
     *     exceeds the shortest trip the model will ever grant a rusher.
     *
     * ============ WHAT THIS ASSERTS, AND WHAT IT DOES NOT ============
     * At 2: the FIRST contained rep against a live threat only delays it
     * (unchanged behaviour, `recoverySecondsByBand` still the whole story). The
     * SECOND consecutive one — no `RUSHER_WINS_REP`, `BLOCKER_BEATEN`, or
     * `RUSHER_GAINING` rep in between — retires it, publishing `RESET` exactly
     * as `BLOCKER_RESETS` does today (ADR-007's existing, already-generic word
     * for "this threat is over," not a new event shape). A rusher who wins
     * again, or merely gains a step, resets the streak to zero — the model
     * never counts a broken streak, matching the owner's "free on the next
     * tick" caution directly.
     *
     * Deliberately NOT reset here: `pressureProgressByBand`'s per-rusher
     * pressure counter (`resolve/pocket.ts`'s `advancePressure`). That counter
     * measures cumulative disruption over the whole rep, a different question
     * from "is a threat currently travelling," and `BLOCKER_CONTAINS` already
     * contributes `delta: 0` to it on every tick, contained or not — this entry
     * does not touch that mechanism, and widening scope to it here would be a
     * second football claim nobody has ruled on.
     *
     * ⛔ NO RATE EXPECTATION IS ATTACHED TO THIS VALUE (entry 73's disposition,
     * echoing 1d's mistake): the count is chosen on the football and the two
     * structural facts above, not on any target `pressure_rate` movement, and
     * none should be read into it. `pocket_status_distribution` — not
     * `pressure_rate` — is the Tier-1 metric this dispatch is priced against,
     * per entry 67-RESULT/68's standing ruling that a rate counting any
     * non-CLEAN tick cannot see a change that only reshuffles severity.
     */
    containRetiresAfterConsecutiveContains: 2,
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
    /**
     * DERIVED MECHANIC (July 2026, owner ruling — same reasoning as ADR-032, one
     * channel over) — THE THIRD HORIZON IS NOW BOUNDED. See `match-engine.md`
     * §7.2 for the doc-facing block; this is the implementation-level derivation
     * it summarises. `containRetiresAfterConsecutiveContains` above is the FIRST
     * use of the `DERIVED MECHANIC` marker; this is the second, and it reuses
     * the heading rather than inventing a new one, per that entry's own
     * instruction.
     *
     * THE TWO HALVES HAVE DIFFERENT STATUS, same convention as above:
     *
     *   half                                    status         re-litigate by
     *   ------------------------------------------------------------------------
     *   that this channel gets a horizon at all  OWNER RULING   a football
     *                                                            argument to the
     *                                                            owner (this
     *                                                            ruling; ADR-032's
     *                                                            reasoning, one
     *                                                            channel over)
     *   that the value is 2.0                    DERIVED        move
     *                                                            `immediateWithinSeconds`
     *                                                            or
     *                                                            `collapsingWithinSeconds`
     *
     * ⛔ THE FOOTBALL (the ruling half). `POS_INF` meant "any live threat, at any
     * distance, floors the pocket" — a rusher four seconds away and one arriving
     * next tick were the same fact to this channel. That is not a pressure model,
     * it is a PRESENCE model: it made the pocket never clean while any rusher was
     * alive and moving, which is every tick of every dropback. Pressure means the
     * passer's platform, vision or timing was disturbed — arriving, or close
     * enough to force the throw — the same reading §7.2's ADR-032 amendment
     * already gave the band map (limb (b) of that amendment); this is limb (a),
     * closing on the identical error one channel over. ADR-030 and ADR-031 both
     * declined to answer this question and left the field at its widest possible
     * form (`POS_INF`); this ruling answers it.
     *
     * 🧮 THE VALUE (the derived half), against its two neighbouring boundaries,
     * NOT picked to hit a rate. `immediateWithinSeconds` (0.0) and
     * `collapsingWithinSeconds` (1.0) already existed and give the horizon its
     * own width: `1.0 − 0.0 = 1.0`. PRESSURE sits one more of that same width
     * beyond COLLAPSING — `1.0 + 1.0 = 2.0` — the next step of a sequence the doc
     * already started (0.0, 1.0, …), replicating the interval once rather than
     * inventing a new one. It lands on the engine's own tick quantum
     * (`quantizeSeconds`, 0.5s) without rounding.
     *
     * ⛔ NO RATE EXPECTATION IS ATTACHED. `CALIBRATION-BACKLOG.md` entry 1e swept
     * this exact channel and refused it as a `pressure_rate` lever (−2.440pp of a
     * 60.6pp gap); `pocket_status_distribution` — SEVERITY, the standing Tier-1
     * metric — is the outcome this bound is priced against, not the rate. Priced
     * afterwards, in the calibration dispatch that follows this one, not
     * justified beforehand here.
     *
     * WHAT IS HELD. This channel interacts with SUPPLY (`startsThreat`'s
     * rep-win rate, ADR-032 §6b's redirect — "the pressure rate is a SUPPLY
     * problem") and with RETIREMENT (`containRetiresAfterConsecutiveContains`
     * above, entry 73) — BOTH were measured against this horizon while it was
     * unbounded. Any price taken against either mechanism before this change
     * describes a configuration this default no longer reproduces.
     *
     * WHAT A FINITE VALUE MEANS. A rusher further out than 2.0s is TRAVELLING but
     * not yet dirtying the pocket — he is in the stream, he still arrives on his
     * own clock, and until he closes to this horizon he sets no floor. `CLEAN` is
     * now reachable with a live threat still on the field, which it was not at
     * `POS_INF`. ADR-033's limb (a) of the amended §7.2 ("a WON rep whose arrival
     * falls inside the pressure horizon") is now satisfied at a genuine horizon
     * rather than at its widest possible form.
     *
     * `POS_INF` remains defined above (used by nothing else today) so a null-arm
     * or reproduction sweep can still patch this field back to it by name.
     */
    pressureWithinSeconds: 2.0,
    /**
     * DERIVED MECHANIC (July 2026, owner ruling — TIME retirement). THIRD use of
     * the `DERIVED MECHANIC` marker; `containRetiresAfterConsecutiveContains`
     * above is the first, `pressureWithinSeconds` immediately above is the
     * second, and both explain what the marker means and why its two halves are
     * read separately. See `match-engine.md` §7.1 for the doc-facing block; this
     * is the implementation-level derivation it summarises. Closes ADR-049 §9's
     * declared abstention: "no time-based or distance-based threat retirement
     * was priced, because none exists… a sweep cannot price a mechanism the
     * engine does not have."
     *
     * ⛔ THE TWO HALVES, same convention as above:
     *
     *   half                                          status       re-litigate by
     *   ---------------------------------------------------------------------------
     *   that a threat retires on TIME at all           OWNER RULING  a football
     *                                                                 argument to the
     *                                                                 owner (this
     *                                                                 ruling; the
     *                                                                 same reasoning
     *                                                                 as
     *                                                                 `pressureWithinSeconds`'s
     *                                                                 horizon ruling
     *                                                                 above, one
     *                                                                 channel over)
     *   that the comparison is against `clock.maxTick` DERIVED       moves only if
     *                                                                 `clock.maxTick`
     *                                                                 moves — this
     *                                                                 field never
     *                                                                 restates that
     *                                                                 number, it only
     *                                                                 gates whether
     *                                                                 the comparison
     *                                                                 runs at all
     *
     * ⛔ THE FOOTBALL (the ruling half). A rusher whose whole-life time of
     * arrival is beyond `clock.maxTick` — the SAME hard stop `sim/passPlay.ts`'s
     * tick loop already runs its own `while` condition against ("a play that
     * reaches this without resolving is a coverage sack") — cannot reach the
     * passer before the play is over, by construction. Counting him as a live
     * threat that floors the pocket is not a pressure model, it is a PRESENCE
     * model: exactly `pressureWithinSeconds`'s error immediately above, one
     * channel over again — a threshold so wide (here, no time-based retirement
     * existed at all, i.e. infinitely wide) that the classification carries no
     * information about whether the throw was actually disturbed.
     *
     * 🧮 THE COMPARISON (the derived half). `clock.maxTick` is not a new number
     * chosen for this mechanic — it is the play's own terminal tick, already
     * load-bearing as the tick loop's own hard stop. Nothing here restates or
     * shadows it: `resolve/rushThreat.ts`'s `retiresByTime` reads
     * `tunables.clock.maxTick` directly. This field is therefore a pure ON/OFF
     * gate rather than a magnitude — there is no second number to derive, only
     * whether the one existing anchor is compared against at all.
     *
     * ⛔ WHAT IS DELIBERATELY NOT DONE — GEOMETRY. ADR-049 §9's abstention named
     * TWO candidate retirement routes, geometry and time. Only TIME is ruled
     * here. `packages/calibration/src/knownTruth/geometryTimeRetirement.ts` (a
     * post-hoc stream reclassifier, MEASUREMENT ONLY) priced them jointly and
     * found the interaction strongly negative — TIME retires most of the same
     * threats GEOMETRY would (a threat already beyond the play's clock is
     * retired before a later STEP_UP could ever geometry-retire it), so
     * geometry buys a small additional reach for a second mechanic. That is a
     * reason to record the competition, not a reason to rule against geometry —
     * it is left UNIMPLEMENTED so it is argued on its own football merits
     * later, never inheriting this ruling by default.
     *
     * ⛔ NO RATE EXPECTATION IS ATTACHED. `pocket_status_distribution` —
     * SEVERITY, the standing Tier-1 metric — is the outcome this mechanic is
     * priced against, not `pressure_rate`, and it is priced in a calibration
     * dispatch that follows this one, not justified here. A lower-bound
     * estimate exists from the post-hoc reclassifier above (holding every
     * quarterback decision fixed at what he actually did), but a LIVE rule
     * changes later STEP_UP/HOLD/SCRAMBLE choices and which reps are even
     * rolled, so the live number is expected to differ from that bound,
     * possibly in either direction, and a mismatch is not a defect.
     */
    timeRetirementEnabled: true,
    /**
     * WHO GETS THE SACK IN A DEAD HEAT. When a quarterback goes down to a rusher
     * he ran into rather than one who ran him down (§8.8's `CAUGHT_FROM_BEHIND`),
     * the man is the NEAREST live threat — and ETAs sit on a 0.5s grid, so two of
     * them being equally near is common rather than exotic.
     *
     * AMBIGUOUS, AND NOT SETTLED BY ANY DIE: nothing in §7 or §8.8 ranks two
     * simultaneous arrivals, and rolling for the identity of a sacker would put a
     * result in the stream that no table in the doc produces (ADR-005). It is a
     * football claim, so it is named here rather than buried in a comparator:
     * §8.8's own target number charges `scramble.edgeThreatPenalty` per EDGE
     * threat because "edge rushers are the contain players", so the man the model
     * already says walls in a bailing passer is the man who gets him.
     *
     * Flip it to "INTERIOR" and the same dead heats go the other way; nothing
     * else in the simulation moves, because this decides attribution only.
     */
    simultaneousArrivalPriority: "EDGE",
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
     * §7.2 as AMENDED (July 2026, ADR-033). A single rusher's band on tick T sets
     * a FLOOR for the status on T+0.5.
     *
     *   "POCKET COLLAPSING:  1+ rushers won (winning by 15+) previous tick"   — verbatim
     *   "POCKET PRESSURE:    1+ rushers winning by 1-14"                      — OVERTURNED
     *
     * The amendment: pressure requires EITHER a won rep whose arrival falls
     * inside the pressure horizon (`arrival.pressureWithinSeconds`, limb a),
     * OR a margin high enough that the blocker is BEATEN rather than merely
     * losing ground (`BLOCKER_BEATEN`, limb b). Gaining ground is neither, so
     * `RUSHER_GAINING` — which after the band split above means margins 1-4, the
     * one-point edge the owner's ruling names — floors at CLEAN.
     *
     * A gaining rusher is NOT thereby invisible: `passRush.pressureProgressByBand`
     * still accrues +1 a tick for him, and `thresholds` turns three of those into
     * PRESSURE. The amendment says one tick of gaining is not pressure. It does
     * not say a rusher who gains ground every tick for a second and a half is
     * clean, and the counter is the mechanism that says so.
     *
     * ⚠ THIS TABLE IS KEYED BY `PassRushBandLabel` (§7.1's band), NOT BY
     * `PocketStatus` — ADR-053 §6 describes it as one of four tables "keyed by
     * `PocketStatus`" alongside `severity`/`accuracyModifier`/
     * `readCapacityDelta`, and that description does not match this tree: its
     * KEYS are `RUSHER_WINS_REP` / `BLOCKER_BEATEN` / etc., and `PocketStatus`
     * only appears as the type of its VALUES. Flagged rather than silently
     * reconciled, per this dispatch's standing instruction to bring rather than
     * paper over a disagreement between a ratified claim and the tree. The
     * `ByPocketStatus<T>` shape (`types.ts`) genuinely does not fit here for
     * that reason — a mapped type over `PocketStatus` would constrain the wrong
     * axis. What DOES apply, and is added below, is a VALUE constraint: every
     * entry must be a real `PocketStatus`, which is the axis this table
     * actually shares with the other three, and closes the same class of
     * defect (an unranked string silently accepted) without misdescribing the
     * table's own shape. `PassRushBandLabel` itself is not importable here
     * without a cycle (`resolve/passRush.ts`'s `PassRushBandLabel` is derived
     * FROM `Tunables`, which is `typeof TUNABLES`), so the key set stays
     * unconstrained at this declaration site — it is checked structurally
     * where it is READ (`resolve/pocket.ts`'s `minimumStatusByBand[band]`
     * indexing fails to compile if a `passRush.bands` label has no matching
     * key here) rather than restated as a second literal union.
     */
    minimumStatusByBand: {
      RUSHER_WINS_REP: "COLLAPSING",
      BLOCKER_BEATEN: "PRESSURE",
      RUSHER_GAINING: "CLEAN",
      STALEMATE: "CLEAN",
      BLOCKER_CONTAINS: "CLEAN",
      BLOCKER_RESETS: "CLEAN",
    } satisfies Record<string, PocketStatus>,
    /**
     * THE LADDER. Ordering used to take the worse of the derivations above, and
     * the declaration every status-keyed table in this block is checked against
     * (`packages/calibration`'s `knownTruth.pocket-status-ladder` derives its
     * rungs from this object rather than restating them).
     *
     * FOUR RUNGS, NOT FIVE (July 2026, owner ruling, ADR-033). `SACK: 4` used to
     * sit on top of it and it was a CATEGORY ERROR: a pocket status describes the
     * SPACE THE PASSER IS WORKING IN, and a sack describes THE PLAY HAVING ENDED.
     * The two are not points on one scale, and carrying the outcome on the status
     * ladder produced an inversion rather than a merely untidy table — `SACK`
     * outranked `IMMEDIATE` while `forcesDecision` and `sackWhenNoTarget` both
     * stopped at `IMMEDIATE`, so the WORST status forced nothing, and moving a
     * band up to it LOWERED the sack rate. It also orphaned a third row,
     * `readCapacityDelta.SACK = 0`, which handed a quarterback in the worst
     * pocket on the ladder his FULL progression back.
     *
     * IMMEDIATE is now the top, which is correct on its own terms: "rusher in the
     * QB's face" is the worst SPACE there is. What happens next — throw, escape,
     * or go down — is an outcome, and the stream states it as one (`PLAY_RESULT`,
     * and §17's own inference rule: a dropback with no THROW and no
     * RUN_RESOLUTION that lost yards is a sack).
     *
     * `satisfies ByPocketStatus<number>` (ADR-053 §6 ruling 2): a TOTAL map over
     * `PocketStatus`, so a rung added to this literal with no petition to widen
     * the contracts union — or a contracts petition landing with no matching
     * row here — fails to compile at THIS declaration, rather than surfacing
     * three steps away at a runtime `?? 0` the way `SACK: 4`'s inversion did
     * (ADR-033/034). No `?? 0` existed here to delete: `pocketSeverityOfEmitted`
     * (`resolve/pocket.ts`) already throws on an unranked status rather than
     * defaulting one, so this constraint moves the SAME guarantee earlier
     * (compile time) rather than replacing a fallback that was still live.
     */
    severity: { CLEAN: 0, PRESSURE: 1, COLLAPSING: 2, IMMEDIATE: 3 } satisfies ByPocketStatus<number>,
    /**
     * The counter's entry requirement per rung. The `{ label: "SACK",
     * minProgress: 9 }` row is gone with the rung: a counter that reached 9 used
     * to buy the quarterback a status that forced nothing, which is exactly the
     * inversion above, at its most reachable. Nine points of accumulated pressure
     * now reads as what it is — IMMEDIATE — and forces a decision like any other.
     */
    thresholds: [
      { label: "IMMEDIATE", minProgress: 7 },
      { label: "COLLAPSING", minProgress: 5 },
      { label: "PRESSURE", minProgress: 3 },
      { label: "CLEAN", minProgress: NEG_INF },
    ],
    /**
     * §10.4 accuracy modifiers by pocket status.
     *
     * `satisfies ByPocketStatus<number>` — see `severity` above for why: a
     * total map over `PocketStatus`, so a rung with no accuracy row is a
     * compile error here rather than a football omission discovered later.
     */
    accuracyModifier: {
      CLEAN: 0,
      PRESSURE: -10,
      COLLAPSING: -20,
      IMMEDIATE: -30,
    } satisfies ByPocketStatus<number>,
    /**
     * §7.2 "QB processing: −1 read capacity" under pressure.
     *
     * The `SACK: 0` row is REMOVED, not re-valued: with `SACK` off the ladder it
     * is an orphan, and an orphan row keyed by a status that no longer exists is
     * the same defect one step quieter. Every rung of `severity` is named here and
     * nothing else is.
     *
     * `satisfies ByPocketStatus<number>` — see `severity` above. This is the
     * table `readCapacityDelta.SACK = 0` orphaned in the first place (ADR-033):
     * a total map cannot carry an orphan, because there is no key to hang one
     * on that the union does not also declare.
     */
    readCapacityDelta: {
      CLEAN: 0,
      PRESSURE: -1,
      COLLAPSING: -1,
      IMMEDIATE: -2,
    } satisfies ByPocketStatus<number>,
    /**
     * §7.2 — statuses where the QB may no longer hold.
     *
     * VALUE UNCHANGED BY ADR-033 and now UPWARD-CLOSED for the first time: the
     * list stops at `IMMEDIATE` and `IMMEDIATE` is the top of `severity`, so there
     * is no longer a status the engine calls worse that this list does not
     * contain. The hole was `SACK`, and it was closed by removing the rung rather
     * than by adding an entry — adding one would have made the outcome a more
     * urgent kind of space instead of admitting it is not a space at all.
     */
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
     * CALIBRATION FLAG (raised by the B1 fix, still open). `sackWhenNoTarget`
     * itself remains FROZEN. The other implicated dial,
     * `passRush.blockerStructuralAdvantage`, was the §7.1 term-asymmetry
     * compensator and is now 0 (ADR-028) with the asymmetry fixed at its source
     * — the blocker's third attribute term. That resolved the asymmetry, NOT the
     * pressure rate: ADR-028 measured §7.1's whole budget at 4.70pp of a 59.9pp
     * gap and named §7.3/§7.4 as where the rest lives. See
     * docs/decisions/CALIBRATION-BACKLOG.md §2, §3.
     *
     * STILL FROZEN, and now UPWARD-CLOSED for the same reason `forcesDecision` is
     * (ADR-033). No entry was added or removed here; the rung above it went away.
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
    /**
     * §8.7 — routes keep developing, then coverage closes.
     *
     * ⚠ `opennessGainPerTick` IS NO LONGER APPLIED DIRECTLY. It is the UNIT of
     *   the contest ladder below (ADR-048), and every rate in that ladder is an
     *   integer multiple of it. It stays here, at the doc's value, under the
     *   doc's name, for a specific reason: `packages/calibration`'s
     *   doc-conformance register classifies this exact path `DOC_VERBATIM`
     *   against §8.7, and it is the ONLY place §8.7's number and the engine's
     *   number can be compared. ADR-047 §2.3 is what happens when nothing
     *   compares them — a sibling leaf of the same name under `scramble` was
     *   quoted through two ADRs into a ratified ruling.
     */
    opennessGainPerTick: 5,
    opennessDecayPerTick: 5,
    decayStartsAtSeconds: 3.0,
    minOpenness: 0,
    maxOpenness: 100,
    /**
     * ============ §8.7's GAIN IS CONTEST-CONDITIONED (ADR-048) ============
     *
     * RULED July 2026, on ADR-046's option 3. The owner's football, because it
     * governs every edge case below:
     *
     *   > **Separation is created at the break and then DEFENDED.** A corner who
     *   > lost badly closes ground as the route flattens; a receiver who won
     *   > cleanly HOLDS an advantage rather than compounding it.
     *
     * So the rep CONDITIONS the gain rate; it does not SCALE it. A flat gain
     * (what this was) makes the rep decide only *when* a receiver reaches a given
     * openness, never *whether* — hold the ball long enough and a receiver who
     * was stonewalled clears every threshold a receiver who won cleanly cleared.
     * Proportional was refused for the opposite failure: the gap widens forever.
     *
     * ------------------------------- THE KEY -------------------------------
     *
     * `ContestPosition` — the `contest` column both band tables already carry.
     * NOT a new field, and NOT the raw margin.
     *
     *   - It is the rep's own answer to *where is the defender*, which is exactly
     *     what governs how separation develops after the break.
     *   - It is already ordinal and already monotone down BOTH tables
     *     (§9.3: T T T E E E I I; §9.4: T T E I), so conditioning on it cannot
     *     invert the openness column — which is constraint 1, satisfied by
     *     construction rather than by inspection.
     *   - It covers the no-rep case for free: `uncoveredContestPosition`.
     *   - REJECTED, the raw margin: that is option 2 under another name. Keying
     *     the RATE on a continuous margin makes a receiver who won by 30 pull
     *     away from one who won by 10 without bound, which is what the ruling
     *     refused. Keying on a three-class geometry means two winners' gap stays
     *     exactly the gap their bases gave them, forever.
     *   - REJECTED, per-band rates: twelve invented numbers with no derivation,
     *     and a second table saying what `contest` already says.
     *
     * ⚠ ONE ROW READS ODDLY AND IS DELIBERATE. §9.3's `SEPARATION_HALF_YARD` is
     *   a WR win in the doc's words ("WR wins by 1-9") and carries `EVEN`. It
     *   therefore gets the middle rung, not the winner's. That is the SA-08
     *   amendment's own football: *half a yard of separation is covered — the
     *   throw has to be perfect and the defender can play the ball.* A rep that
     *   narrowly won does not produce a receiver running away from anybody.
     *
     * ------------------------- THE RATES, DERIVED -------------------------
     *
     * §8.7 states exactly two rates: `+5` (routes develop) and `−5` (coverage
     * closes). They are the same magnitude, so the mechanic already has a UNIT,
     * and `opennessGainPerTick` is it. Every cell below is an INTEGER MULTIPLE of
     * that unit and the ladder steps by exactly one unit in each direction —
     * nothing is invented but the pattern, which is the shape the owner ruled.
     *
     *              burst (at the break)      steady (afterwards)
     *   TRAILING           +2u                      0
     *   EVEN               +1u                      0
     *   IN_FRONT             0                     −1u
     *
     *   TRAILING  creates a lot at the break, then HOLDS. The steady 0 is the
     *             ruling's *"holds an advantage rather than compounding it"*
     *             taken literally. REJECTED: +1u steady (today's rate), because a
     *             receiver who keeps separating for every tick the quarterback
     *             holds is compounding — linearly rather than geometrically, but
     *             compounding, and the ruling refused compounding.
     *   EVEN      creates a little at the break, then holds. Nobody won; he gets
     *             off the line and the corner stays attached.
     *   IN_FRONT  creates nothing, and then the defender closes at §8.7's own
     *             closing rate. This is *"a lost rep produces little or no gain,
     *             and the defender may close"*, using the doc's number for
     *             closing rather than a new one.
     *
     * ---------------------- THE BURST WINDOW, DERIVED ----------------------
     *
     * `burstSteps: 2` — two ticks of `clock.tickStepSeconds`, so 1.0 s.
     *
     * The grid is fixed by §8.7 itself: it states its rates PER TICK, so the
     * burst is an integer number of ticks. The multiple is INTERPRETATION of the
     * one quantity in the doc that measures how long a route's break takes —
     * §9.2's *"Route Timing Modifiers: Jam at line: +0.5 to +1.0 ticks"*, whose
     * upper bound is the longest the doc allows a break to be in progress.
     *
     *   REJECTED, one tick: for a DEEP route (`readySeconds` 2.5,
     *   `decayStartsAtSeconds` 3.0) the gain window is one step long, so a
     *   one-step burst IS the whole window and the *"then converges toward a
     *   lower steady rate"* half of the ruling would never be observable on a
     *   deep route at all.
     *   REJECTED, the whole gain window: that is a flat gain again, just a
     *   steeper one, and it re-creates precisely the shape the ruling refused.
     *
     * ⚠ OBSERVATION, RECORDED AFTER THE DERIVATION AND EXPLICITLY NOT A REASON
     *   FOR IT: at `burstSteps: 2` a TRAILING rep on a QUICK route accumulates
     *   `2 × 2u = 4u` over its window, which is what the flat `+1u × 4 steps`
     *   accumulated. Deeper routes accumulate MORE than they used to and
     *   EVEN/IN_FRONT reps accumulate less. That coincidence is noted so nobody
     *   later mistakes it for the derivation; picking a value because a
     *   downstream quantity lands somewhere is the compensation-debt pattern.
     */
    contestGain: {
      /** How many `clock.tickStepSeconds` after the break carry the burst rate. */
      burstSteps: 2,
      /** Rates as MULTIPLES of `route.opennessGainPerTick`. Keyed by `ContestPosition`. */
      byContest: {
        TRAILING: { burst: 2, steady: 0 },
        EVEN: { burst: 1, steady: 0 },
        IN_FRONT: { burst: 0, steady: -1 },
      },
    },
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
     * §9.4's result bands. Margin = WR roll total − target.
     *
     * ============ RE-POINTED ONTO §9.3's CORRECTED MAPPING (ADR-045 §2) ============
     *
     * **A SCALE USED BY TWO PRODUCERS CANNOT BE CORRECTED FOR ONE.** §8.5's
     * `selectTarget` ranks man-covered and zone-covered candidates against each
     * other by openness, and seven thresholds compare both. Correcting §9.3 alone
     * would have left the two producers on two mappings — not a magnitude shift
     * but an INCOHERENCE, changing *who gets the ball*.
     *
     * ⚠ THE COUPLING IS INVISIBLE TO A TYPE, AND THAT IS WHY IT ALMOST SHIPPED.
     *   §9.4 states its bands in §8.4's WORDS — *"found soft spot, **wide open**"*,
     *   *"window exists, **open**"*, *"**tight window**"*. A numeric consumer
     *   enumeration returns a complete-looking answer and cannot see a LABEL
     *   consumer (Charter §4.1). This table was found by READING, and that
     *   reading must be redone whenever §8.4, §9.3 or §9.4 changes.
     *
     * So each row takes the value §9.3's ruled column gives the §8.4 band its own
     * §9.4 words name:
     *
     *   "found soft spot, WIDE OPEN"  → 70   (was 85)
     *   "window exists, OPEN"         → 52   (was 70 — §8.4's WIDE OPEN floor,
     *                                         i.e. this very defect one table
     *                                         over, and in scope for that reason)
     *   "TIGHT WINDOW"                → 38   (was 45; the mapping's tight-window
     *                                         MID. §9.3's second tight-window
     *                                         value, 30, is its FLOOR — the
     *                                         half-yard BOUNDARY case, which zone
     *                                         has no counterpart for.)
     *
     * ⚠ TWO CELLS HELD, AND NAMED SO THE ABSENCE LOOKS LIKE AN ABSENCE:
     *
     *   `DEFENDER_IN_LANE` (20). §9.4's words for this row name NO §8.4 band —
     *   "defender in passing lane" is a position, not an openness label — so the
     *   mapping does not reach it, and 20 already sits inside `covered (15-29)`.
     *   Moving it would be a value nobody asked for.
     *
     *   `uncoveredOpenness` (90). Not a §9.4 row and not label-mismatched: a hole
     *   in the zone is wider than wide open, and 90 says so.
     *
     * WHAT THE RE-POINTING DID **NOT** CHANGE: the shape difference between zone
     * and man. Zone's good outcomes were never numerically better than man's —
     * rows 0 and 1 were already EQUAL (85/85, 70/70) — the advantage is in the
     * MARGIN required (a soft spot needs +20, five yards of separation needs
     * +30). That equality is preserved exactly: 70/70 and 52/52.
     */
    bands: [
      { label: "SOFT_SPOT", minMargin: 20, openness: 70, contest: "TRAILING", settled: true },
      { label: "WINDOW", minMargin: 10, openness: 52, contest: "TRAILING", settled: true },
      { label: "TIGHT_WINDOW", minMargin: 1, openness: 38, contest: "EVEN", settled: true },
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
     * Margin = WR total − CB total. The doc states separations in YARDS; the
     * 0-100 openness each band maps to is §8.4's scale (70+ wide open, 50-69
     * open, 30-49 tight window, 15-29 covered, 0-14 no window).
     *
     * ===================== SA-08, AS RE-RULED (ADR-043 → ADR-045) =====================
     *
     * The first five rows are the owner's ruled column, verbatim from §9.3's
     * amended block: `70 / 52 / 38 / 30 / 25`, labelled *wide-open floor / open /
     * tight-window mid / tight-window floor / covered*. **Every value sits inside
     * the §8.4 band its own §9.3 words name**, which is the whole content of the
     * correction: the two middle rows had been reading ONE BAND OPTIMISTIC and
     * every read downstream inherited the flattery. Half a yard of separation is
     * the boundary case — the throw must be perfect and the defender can play the
     * ball — and **30 is exactly where §8.4 draws that line**.
     *
     * THE COLUMN IS ORDINAL, WHICH IS WHY THE FIRST RULING WAS UNSATISFIABLE.
     * (History, stated against the table AS IT THEN STOOD.) Mapping labels while
     * ignoring the ORDER put two rows into `covered (15-29)` while `CB_IN_PHASE`
     * was at 25 inside it — an inversion, or a four-point compression of two
     * distinct outcomes. ADR-043 refused it; this column is monotone by
     * construction.
     *
     * THE 25/25 TIE — RULED July 2026, `CB_IN_PHASE` 25 → 22 (ADR-045 §2.3a).
     * ADR-045 landed the ruled five rows and HELD rows 6-8, which left
     * `EVEN_BRACKET` (a dead-even rep) and `CB_IN_PHASE` (the corner has WON the
     * rep) both on 25. A tie, not an inversion, so the monotonicity gate accepted
     * it — and it was BROUGHT rather than tidied, which is why there is a ruling
     * to transcribe here instead of a number somebody picked.
     *
     * The owner's football, verbatim in substance: IN PHASE, THE DEFENDER HAS
     * LEVERAGE — he is between the receiver and the ball, or he has the hip, and
     * HE CAN PLAY THE THROW. *Even* means NEITHER has won, and the receiver at
     * least has THE OPTION OF WINNING LATE. Those are different situations and
     * the column must not call them identical.
     *
     * WHY 22 AND NOT LOWER: it keeps `CB_IN_PHASE` comfortably inside §8.4's
     * `covered (15-29)`, leaves room beneath it for rows 7-8 (15 and 6, both
     * HELD and verified to fit monotonically), and preserves the roughly even
     * spacing the rest of the column has. Standing instruction, and the same
     * reasoning that refused `26-29`: IF ROWS 7-8 HAD NOT FIT BENEATH 22
     * MONOTONICALLY THAT COMES BACK AS A QUESTION — it does not get solved by
     * compression. They fit. The full column is 70 / 52 / 38 / 30 / 25 / 22 /
     * 15 / 6, STRICTLY DECREASING.
     *
     * ⚠ ROWS 7-8 REMAIN HELD (15 and 6). No value below `CB_IN_PHASE` has been
     *   ruled and none was picked here.
     *
     * ⚠ THE WORD "CONTESTED" IS NOT IN THIS TABLE'S VOCABULARY AND MUST NOT COME
     *   BACK. §9.3's amendment reserves it for §11.1's catch resolution. An
     *   openness scale and a catch-contest scale sharing a term is how a reader
     *   conflates pre-throw geometry with a post-throw event.
     */
    bands: [
      { label: "SEPARATION_5_PLUS", minMargin: 30, openness: 70, contest: "TRAILING" },
      { label: "SEPARATION_3_4", minMargin: 20, openness: 52, contest: "TRAILING" },
      { label: "SEPARATION_1_2", minMargin: 10, openness: 38, contest: "TRAILING" },
      { label: "SEPARATION_HALF_YARD", minMargin: 1, openness: 30, contest: "EVEN" },
      { label: "EVEN_BRACKET", minMargin: 0, openness: 25, contest: "EVEN" },
      { label: "CB_IN_PHASE", minMargin: -9, openness: 22, contest: "EVEN" },
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
    /**
     * §8.3 AWARENESS PERCEPTION BAND — AMENDED (ADR-040, owner ruling on
     * ADR-039 SA-09). **Awareness narrows the band; it does not bias the mean.**
     *
     * The engine used to hold §8.3's arithmetic verbatim — `d20 − 10 + (Awareness
     * − 70) ÷ 5` — which is a MEAN SHIFT wearing the doc's own label "(reduces
     * variance range)". An elite quarterback perceived receivers as MORE OPEN
     * THAN THEY WERE (+5 at 95 awareness) and a poor one as less open. §8.3 has
     * been amended: the sentence and its worked examples are BOTH superseded,
     * and two properties are now required of any implementation — the
     * distribution is CENTRED ON THE TRUE VALUE at every awareness, and the
     * half-width is MONOTONE DECREASING in awareness.
     *
     * THE MAPPING IS THE ENGINE'S, ON THE ADR-033 PRECEDENT: derived from a
     * scale already in the game, never invented. Both numbers below are §8.3's
     * OWN, doing the job §8.3's own sentence says they do:
     *
     *   `baseHalfWidth: 10` — §8.3's `d20 − 10`. The doc's offset IS the die's
     *     excursion magnitude, so it becomes the half-width at the baseline
     *     rating instead of a shift of the centre.
     *   `baseline: 70` / `divisor: 5` — §8.3's `(Awareness − 70) ÷ 5`, moved
     *     from the CENTRE to the HALF-WIDTH. Same term, same magnitude, applied
     *     to the quantity the sentence always claimed it applied to.
     *
     * REJECTED, and named so the choice is auditable:
     *   - a per-awareness-band table of half-widths (a new scale nobody asked
     *     for: ADR-039 SA-01's failure with better intentions);
     *   - a fresh divisor picked to make the elite band ±5 (the same invention,
     *     wearing a formula);
     *   - the doc's superseded examples' 20-point width as the elite band (they
     *     are superseded precisely because they were never a narrowing).
     *
     * SCALE, at these values: 95 awareness → ±5, 70 → ±10, 60 → ±12, 40 → ±16.
     * ⚠ NOT MEASURABLE ON A FLAT LEAGUE — every quarterback shares one band, so
     * the property is invisible there. Phase 2 measurement item; backlog 49.
     */
    awarenessVariance: { baseHalfWidth: 10, baseline: 70, divisor: 5 },
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
      /**
       * §10.2's numbers, not §10.3's (ADR-040, owner ruling on ADR-039 SA-13).
       *
       * The doc contradicts itself: §10.2 states the bullet's passing-lane
       * modifier as `+10`, §10.3's velocity table says `+15`. **§10.2 wins —
       * the mechanic description is the source, and the summary is the thing to
       * fix**, which is the same rule Appendix C now carries in the doc itself.
       * Touch is −10 in both sections and is untouched.
       */
      velocityModifier: { BULLET: 10, TOUCH: -10, BACK_SHOULDER: 0, THROWAWAY: 0 },
      /** §10.3 throw angle. Verbatim. */
      angleModifier: { OVER_DEFENDER: 20, PAST_DEFENDER: 0, THROUGH_ZONE: -10 },
      /**
       * §10.3's ANGLE IS GEOMETRY, NOT VELOCITY (ADR-040, ADR-039 SA-13's worse
       * half).
       *
       * This table used to be keyed by THROW TYPE — `BULLET → THROUGH_ZONE
       * (−10)`, `TOUCH → OVER_DEFENDER (+20)` — which put the type on BOTH of
       * §10.3's terms and made the angle half the larger of the two. Net lane
       * targets came out **bullet 65, touch 70**: a touch pass was HARDER to
       * deflect than a bullet, and §10.2 says the opposite in words ("BULLET:
       * harder for passing lane defenders" / "TOUCH: more time for coverage to
       * close"). A floated ball hangs; hanging is the whole trade against a
       * bullet's accuracy risk.
       *
       * §10.3 computes `60 + velocity + angle` from two INDEPENDENT inputs: the
       * throw's speed and the ball's path relative to THIS defender. The engine
       * already knows the second one — `ContestPosition`, the same input §11.3
       * uses — so the angle is keyed on it and the throw type is left to the
       * velocity term alone:
       *
       *   IN_FRONT  he has undercut the route and is standing IN the lane; the
       *             ball goes THROUGH his zone (−10, easiest to deflect).
       *   EVEN      alongside at the catch point, not in the flight path; the
       *             ball goes PAST him (+0).
       *   TRAILING  beaten, chasing from behind and therefore nearer the line
       *             than the receiver: the ball is thrown OVER him (+20) — the
       *             bucket throw over a trailing corner, hardest to play.
       *
       * Consequence, and it is the ruling's requirement: at every geometry the
       * bullet's lane target now exceeds the touch pass's by exactly §10.2's
       * 20 points, so the ORDERING no longer depends on the mapping at all.
       * All three of §10.3's angle values are reachable — TRAILING and EVEN via
       * §9.4's zone defender who broke on the ball (`grantsLaneContest`).
       */
      angleByContestPosition: { IN_FRONT: "THROUGH_ZONE", EVEN: "PAST_DEFENDER", TRAILING: "OVER_DEFENDER" },
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
    /**
     * §11.1 "CONTESTED CATCH: **Defender within 1 yard**", expressed on §9.3's
     * openness scale (ADR-040, owner ruling on ADR-039 SA-14).
     *
     * DERIVED, NOT CHOSEN. §9.3's separation rows carry the mapping, so the
     * question "which openness is one yard of separation?" is answered by
     * reading down that table until the rows stop being unambiguously inside a
     * yard.
     *
     * ============ RE-RUN AGAINST THE RE-POINTED TABLE (ADR-045 §2.4) ============
     *
     * ⚠ **THE ANCHOR MOVED, SO THE JUDGEMENT WAS OWED AGAIN.** ADR-040 §3.1: *a
     *   compiler pin anchored to a SYMBOL inherits that symbol's definition*, and
     *   §3 did not rule "whatever the half-yard row happens to hold" — it ruled
     *   *"the widest separation §11.1 makes contested BEYOND ARGUMENT"*, a
     *   judgement about ONE YARD made against the table as it then stood. SA-08
     *   re-points that table. The argument, re-run:
     *
     *   EVEN_BRACKET          0 yards    → 25   inside a yard, beyond argument
     *   SEPARATION_HALF_YARD  ½ yard     → 30   inside a yard, beyond argument
     *   SEPARATION_1_2        1-2 yards  → 38   STRADDLES the boundary
     *
     *   Same row, new value: **30, the half-yard row's own openness**, compared
     *   inclusively.
     *
     * WHY THE OTHER CANDIDATE IS NOW WEAKER, NOT STRONGER. ADR-040 §3 rejected
     * 55 / `SEPARATION_1_2` and said so *"only because SA-08 was then unruled"* —
     * that rejection rested on §9.3's parenthetical **"(contested)"** attaching
     * to the 1-2 yard row. **SA-08's amendment DELETES that word from §9.3
     * entirely** and reserves "contested" for §11.1; the re-ruled row is labelled
     * *tight window*. The only ground for pulling `SEPARATION_1_2` in has been
     * removed by the same ruling that moved the anchor, so the row is not
     * eligible. Interpolating between 30 and 38 remains forbidden (ADR-039
     * SA-01): §9.3 is eight discrete rows, not a function of yards.
     *
     * **THIS MOVE RECLASSIFIES NOTHING.** The five rows contested at `40` against
     * the old column — half yard, dead even, and all three CB-wins rows — are
     * exactly the five contested at `30` against the new one, and
     * `SEPARATION_1_2` stays routine on both. The pair moved together because the
     * derivation is correct, not to hold an outcome in place.
     *
     * NOT SEPARABLE FROM THE SCALE CHANGE, AND REPORTED AS SUCH (ADR-045 §4.1):
     * `test/throwCatch.test.ts` pins this cell to the half-yard row BY TYPE, so
     * the scale correction cannot compile without settling this. That is a
     * property of the pin working, and it is why this paragraph exists instead of
     * an edited literal.
     *
     * ✅ RATIFIED July 2026 (owner, on ADR-045 §4.1). `40 → 30` stands, on the
     *    reasoning above: a DERIVATION, not a choice, with the nil
     *    reclassification as the evidence it is not compensation. And the
     *    non-separability was CONFIRMED BY THE COMPILER rather than argued —
     *    the type pin turning `pnpm typecheck` red is the pin working exactly as
     *    ordered, which is the strongest form of that claim available.
     *
     * ⚠ RE-CHECKED against the ruled `CB_IN_PHASE` 25 → 22 (ADR-045 §2.3a): the
     *   row moves DOWN and was already contested, so the contested set is still
     *   the same five rows and the nil-reclassification claim above is unchanged.
     */
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
     *
     * ADR-036 — THE `DEAD` ROW HAS NO `finalTargetNumber`, AND THAT IS THE POINT.
     *
     * It carried `0` until ADR-036. `0` is a legal point on the target scale and
     * the easiest one in the table, so a consumer reading it could believe it
     * (§4.1's sorting-default corollary). The row is `recoverable: false`; no
     * recovery is ever attempted, so there is no threshold for one to be measured
     * against, so THERE IS NO CELL. Because `TUNABLES` is `as const`,
     * `qualityBands[number]` is a union in which this member simply lacks the key
     * — `band.finalTargetNumber` no longer compiles, and a resolver is forced to
     * branch on `recoverable` instead of copying a number it should not have.
     *
     * Two consequences, stated here rather than discovered:
     *   - `tippedBall.qualityBands.5.finalTargetNumber` is no longer addressable
     *     by `applyTunablePatch`. There is nothing to patch.
     *   - the column's surviving sequence is `20, 35, 55, 75, 90` against
     *     descending `minMargin`, which is monotone. ADR-035's recorded inversion
     *     for this column CEASED TO EXIST; it was not exempted (see
     *     `test/bandGuards.test.ts`).
     */
    qualityBands: [
      { label: "GIFT", minMargin: 41, finalTargetNumber: 20, recoverable: true, maxZoneDistance: 2, speedCheckFromDistance: 2, giftZone: true },
      { label: "FLOATER", minMargin: 21, finalTargetNumber: 35, recoverable: true, maxZoneDistance: 2, speedCheckFromDistance: 2, giftZone: false },
      { label: "LIVE_BALL", minMargin: 1, finalTargetNumber: 55, recoverable: true, maxZoneDistance: 1, speedCheckFromDistance: 99, giftZone: false },
      { label: "CONTESTED", minMargin: -19, finalTargetNumber: 75, recoverable: true, maxZoneDistance: 1, speedCheckFromDistance: 1, giftZone: false },
      { label: "DIFFICULT", minMargin: -39, finalTargetNumber: 90, recoverable: true, maxZoneDistance: 0, speedCheckFromDistance: 99, giftZone: false },
      { label: "DEAD", minMargin: NEG_INF, recoverable: false, maxZoneDistance: -1, speedCheckFromDistance: 99, giftZone: false },
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

  /**
   * THE GAME LOOP — drives, possessions, the clock, scoring, special teams.
   *
   * ⚠ EVERY NUMBER IN THIS BLOCK IS AN INVENTION, and the block is marked as a
   * unit rather than line by line. `docs/design/match-engine.md` specifies a
   * PLAY. It has no section on drives, no section on the clock between snaps, no
   * kickoff, no punt, no field goal and no scoreboard: §15.2 mentions the
   * two-minute drill only to say audibles get harder, and §17.2's summary block
   * counts plays without ever saying how many there are. So where the rest of
   * TUNABLES is "the doc's number, or an INTERPRETATION of the doc's words",
   * this block is "a rule the engine needs in order for a game to end at all".
   *
   * That is why it is one named block instead of constants sprinkled through the
   * loop: calibration moves these first and moves them often, and every one of
   * them is reachable by `applyTunablePatch`.
   */
  game: {
    /** §2 has ticks and no periods. Four fifteen-minute quarters is the sport. */
    periodsInRegulation: 4,
    periodSeconds: 900,
    /**
     * Overtime is deliberately THIN (out of dispatch scope beyond what a tie
     * requires): one period, sudden death, and a tie stands if nobody scores.
     * Real NFL possession rules are a franchise-era concern.
     */
    overtimePeriods: 1,
    overtimeSeconds: 600,
    overtimeSuddenDeath: true,

    /**
     * THE CLOCK BETWEEN SNAPS, and the single largest dial in the block.
     *
     * A play's own `PLAY_RESULT.clockRunoff` covers the snap-to-whistle time plus
     * the doc's dead-ball runoff. Everything else — huddle, spot, play clock — is
     * this. Plays per game and time of possession are both essentially a function
     * of this one number, so it is stated once and named rather than buried.
     */
    huddleSeconds: 32,
    /** §15.2's two-minute drill, as the only clock rule it actually implies. */
    twoMinuteSeconds: 120,
    twoMinuteHuddleSeconds: 14,
    /**
     * Plays after which the clock stops and no huddle time is charged. The list
     * is the real rule set the engine can actually observe from its own stream:
     * an incompletion, a score, a change of possession, the end of a period.
     * Out of bounds and penalties are not in it because the engine models
     * neither — which shortens games slightly and is logged, not tuned.
     */
    clockStopsOnIncompletion: true,
    clockStopsOnScore: true,
    clockStopsOnPossessionChange: true,

    /**
     * Hard stop. A game that reaches this has a defect in the loop (a drive that
     * cannot end, a clock that cannot run out), and the engine throws rather than
     * truncating: a silently truncated game produces clean statistics about a
     * game nobody played.
     */
    maxPlaysPerGame: 400,

    /** Where a drive starts, and where it can no longer legally start. */
    field: {
      /** Yards from the offence's own goal line at which a touchdown is scored. */
      goalLine: 100,
      /** Yards to gain on a fresh set of downs. */
      firstDownYards: 10,
      /** Downs in a series. */
      downsInSeries: 4,
      /** Safety: the offence is tackled at or behind its own goal line. */
      safetyAtOrBehind: 0,
    },

    /** Points. The sport's, not an invention — but they belong on the dial too. */
    points: { touchdown: 6, fieldGoal: 3, extraPoint: 1, twoPoint: 2, safety: 2 },

    /**
     * SPECIAL TEAMS — PLACEHOLDER DEPTH, DECLARED.
     *
     * Field goals, punts and kickoffs are resolved by ONE probabilistic check
     * each. There is no snap, no hold, no block, no protection, no coverage unit,
     * no directional kicking, no hang time, no fair catch and no muff. They exist
     * because a game cannot end without them, and they are sized so that the
     * MACRO numbers calibration needs (points per drive, drives per game,
     * starting field position) are not obviously wrong.
     *
     * KICKING ATTRIBUTES — LIVE AS OF ADR-014 ITEM 14. `ATTRIBUTE_REGISTRY_V1`
     * had no kicking attribute of any kind and the ST positions K/P/LS existed
     * only as `Position` values, so a kicker's leg was `strength` and his
     * placement was `accuracy` — real registry ids that mean something else, and
     * under which a 99-accuracy quarterback kicked like a 99-accuracy kicker.
     * The registry now defines `kickPower`, `kickAccuracy`, `puntPower` and
     * `puntHangTime` at `schemaVersion` 3, and `MIGRATION_V2_TO_V3` seeds each
     * from exactly the id that stood in for it, so a MIGRATED roster kicks
     * identically to the way it kicked before. Four strings changed here and no
     * code did.
     *
     * ⚠ A roster that has NOT been through `applyMigration` carries no kicking
     * attribute at all, and `getAttr`'s absent-id fallback reads 50 for every
     * kicker in the league. That is the migration's job, not this module's — but
     * it is the reason the engine's own fixtures migrate their kickers and
     * punters (`test/gameFixtures.ts`).
     *
     * `returnerSpeedAttr` is deliberately still `speed`: ADR-014 declined a
     * return attribute, because returning a kick is running with the ball in
     * space and `speed`/`acceleration`/`elusiveness`/`vision` already mean that.
     */
    specialTeams: {
      kickerLegAttr: "kickPower",
      kickerAccuracyAttr: "kickAccuracy",
      punterLegAttr: "puntPower",
      /** Wired, unread: the punt resolver has no hang-time term (no net model). */
      punterAccuracyAttr: "puntHangTime",
      returnerSpeedAttr: "speed",
      attrDivisor: 5,

      /**
       * Game clock a special-teams play consumes, whistle to whistle. The
       * scrimmage plays get theirs from `result.clockRunoff` plus the tick they
       * resolved on; these have no tick loop, so they are stated.
       */
      elapsedSeconds: { kickoff: 7, punt: 14, fieldGoal: 6, extraPoint: 4 },

      fieldGoal: {
        /** Yards added to the distance-to-goal-line: 10 of end zone + 7 of snap and hold. */
        snapAndHoldYards: 17,
        /**
         * Target number at `baseDistanceYards`, rising `targetPerYardOver` per
         * yard beyond it. Sized against real NFL make rates for a 70/70 kicker
         * (+28 of modifier): ~95% from 30, ~80% from 40, ~65% from 50.
         */
        baseDistanceYards: 30,
        baseTarget: 34,
        targetPerYardOver: 1.5,
        /** Beyond this, the decision layer will not attempt one. */
        maxAttemptDistanceYards: 58,
        /** A miss is a change of possession at the spot of the kick, not the LOS. */
        missSpotYardsBehindLos: 8,
        /** Inside this, a miss gives the ball to the defence at its own 20. */
        missMinimumYardLine: 20,
        bands: [
          { label: "GOOD", minMargin: 0, made: true },
          { label: "MISSED", minMargin: NEG_INF, made: false },
        ],
      },

      extraPoint: {
        /** Snapped from the 15 → a 33-yard kick. Resolved by the field-goal check. */
        distanceYards: 33,
      },

      punt: {
        /** Gross yards for a league-average leg before the roll. */
        baseGrossYards: 46,
        legBaseline: 70,
        legYardsPerPoint: 0.25,
        /** d20 − 10, in yards: a punt is not a constant. */
        varianceDieOffset: -10,
        varianceYardsPerPoint: 1.0,
        minGrossYards: 25,
        maxGrossYards: 70,
        /** A punt that reaches the end zone comes out to here. */
        touchbackYardLine: 20,
        /** Return yards on a punt that is fielded in the field of play. */
        returnBaseYards: 4,
        returnerBaseline: 70,
        returnYardsPerSpeedPoint: 0.15,
        returnVarianceDieOffset: -10,
        returnVarianceYardsPerPoint: 0.6,
        minReturnYards: 0,
        maxReturnYards: 45,
        /**
         * Inside this many yards of the receiving team's own goal line the return
         * man does not field it — the ball is downed where it lands. Stands in
         * for the entire fair-catch / coffin-corner apparatus.
         */
        downedInsideYardLine: 10,
      },

      kickoff: {
        /** The kicking team's own yard line the ball is teed from. */
        fromYardLine: 35,
        /**
         * A touchback puts the ball here, for the RECEIVING team, measured from
         * its own goal line.
         */
        touchbackYardLine: 30,
        /** `d100 + leg÷5` at or above this is a touchback. */
        touchbackTarget: 55,
        /** A returned kick is fielded here and advanced by the return roll. */
        returnStartYardLine: 5,
        returnBaseYards: 21,
        returnerBaseline: 70,
        returnYardsPerSpeedPoint: 0.2,
        returnVarianceDieOffset: -10,
        returnVarianceYardsPerPoint: 0.8,
        minReturnYards: 0,
        maxReturnYards: 60,
        /** A safety is followed by a free kick from the 20, not the 35. */
        freeKickAfterSafetyYardLine: 20,
      },
    },

    /**
     * THE DEFAULT PLAY-CALLER'S POLICY.
     *
     * Calibration owns the frozen baseline caller (`calibration.md` §3.1) and it
     * does not exist yet. This is NOT that caller and is not a tendency model: it
     * is the smallest deterministic policy under which a game completes, so that
     * the loop can be measured at all. Every number here is expected to be
     * replaced wholesale rather than tuned.
     */
    caller: {
      /** Pass rate by down, before the situational overrides below. */
      passRateByDown: { 1: 0.55, 2: 0.55, 3: 0.75, 4: 0.75 },
      /** Third-and-short is a run regardless of the base rate. */
      shortYardagePassMaxDistance: 2,
      shortYardagePassRate: 0.35,
      /** Fourth down: go for it inside this distance and beyond this yard line. */
      goForItMaxDistance: 2,
      goForItMinYardLine: 55,
      /** Trailing by more than this in the fourth quarter, go for it on any 4th. */
      desperationPointDeficit: 8,
      desperationClockSeconds: 300,
      /** Two-minute offence throws. */
      twoMinutePassRate: 0.85,
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

// --- the base a patch is a patch OF (ADR-016 item 2) -------------------------

/**
 * Freeze a tree in place and return the SAME reference. Recursive because a
 * shallow `Object.freeze` on `TUNABLES` would freeze thirteen top-level keys and
 * leave every band table, every term list and every nested block writable —
 * which is the edit channel ADR-012 §B objected to, wearing a hat.
 *
 * Idempotent and cycle-safe: an already-frozen node is returned untouched rather
 * than re-walked. `TUNABLES` is a literal tree with no cycles, but a freeze
 * helper that recurses forever on one is a trap for whoever adds the first
 * shared sub-object.
 */
function deepFreeze<T>(node: T): T {
  if (typeof node !== "object" || node === null || Object.isFrozen(node)) return node;
  Object.freeze(node);
  for (const key of Object.getOwnPropertyNames(node)) {
    deepFreeze((node as Record<string, unknown>)[key]);
  }
  return node;
}

/**
 * THE BUILD'S TUNABLES, DEEPLY FROZEN — ratified as ADR-016 item 2, an amendment
 * to ADR-012 §B category 3.
 *
 * ADR-012 kept the tunables VALUE off the barrel because "a mutable ambient
 * constant exported across a package boundary is an edit channel". That
 * objection was to the edit channel, not to the value: `applyTunablePatch` is
 * `(Tunables, TunablePatch) → Tunables`, and from outside the package there was
 * no way to obtain the first argument, so the patch workflow the amendment
 * ratified was unreachable by the one consumer it exists for.
 *
 * A deeply frozen value is not an edit channel. It cannot be written to at any
 * depth, so the only thing a consumer can do with it is pass it to
 * `applyTunablePatch` — which is the workflow, exactly.
 *
 * It is the module constant ITSELF, not a copy: `deepFreeze` returns its
 * argument, so `DEFAULT_TUNABLES === TUNABLES` and the five entry points'
 * default and the exported base can never drift apart into two versions.
 */
export const DEFAULT_TUNABLES: Tunables = deepFreeze(TUNABLES);

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
