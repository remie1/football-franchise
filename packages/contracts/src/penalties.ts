/**
 * PENALTIES (ADR-093): the fouls players commit, the flags the officials throw, and what the
 * rulebook does with a flag. Each name below says which of ADR-093's petitions (§10) brought it;
 * a bare § is a section of ADR-093.
 *
 * Names and shapes only (`contracts.md` §10): no table, no rule, no chance. The rulebook that
 * enforces a flag, the offended team's options and the officials' rolls are domain logic (§11).
 */

/**
 * ADR-093 F1: every foul §4.3 names, and no other. Closed: a foul not here comes in by a widening
 * petition at the step that builds it (the kicking game's fouls at step 8, for instance).
 *
 * Each is the NFL's own name for the foul, as its game books write it, in capitals with "_"
 * between the words, so a count of one kind lines up with the row of the same name on ADR-093's
 * real-numbers page (its Table 1 lists every foul flagged 30 times or more in three seasons). One
 * name serves the foul a player commits and the flag the officials throw, since officials call
 * fouls by these names. Where the NFL gives the offense's and the defense's foul one name (illegal
 * use of hands, unnecessary roughness, face mask), it is one kind, and the flagged team says whose
 * it was; where it gives them two (holding, offside, pass interference, delay of game, too many
 * men), it is two kinds. Two of Table 1's scrimmage rows are not kinds: Disqualification is an
 * ejection, which comes with step 6, and §4.3 has no row for a low block.
 */
export type FoulKind =
  // §4.3, before the snap and at it.
  | "FALSE_START" | "DEFENSIVE_OFFSIDE" | "NEUTRAL_ZONE_INFRACTION" | "ENCROACHMENT"
  | "OFFENSIVE_OFFSIDE" | "DELAY_OF_GAME"
  /**
   * The defense's delay of game, the NFL's one name for two fouls: before the snap, §4.3's abrupt
   * move that draws the offense into a flinch; after a play, a defender who delays the next snap
   * (about half the real flags), which waits for the step that builds it.
   */
  | "DEFENSIVE_DELAY_OF_GAME"
  | "ILLEGAL_FORMATION" | "ILLEGAL_SHIFT" | "ILLEGAL_MOTION"
  /**
   * Too many men on the field, the offense's or the defense's, whether caught at the snap (a live
   * ball) or before it (a dead ball, §4.3's substitution foul): the NFL writes both under these
   * names.
   */
  | "OFFENSIVE_TOO_MANY_MEN_ON_FIELD" | "DEFENSIVE_TOO_MANY_MEN_ON_FIELD"
  // §4.3, holding and hands.
  | "OFFENSIVE_HOLDING" | "ILLEGAL_USE_OF_HANDS" | "DEFENSIVE_HOLDING" | "ILLEGAL_CONTACT"
  // §4.3, the pass.
  | "DEFENSIVE_PASS_INTERFERENCE" | "OFFENSIVE_PASS_INTERFERENCE"
  /** §4.3's "ineligible man downfield on a pass". */
  | "INELIGIBLE_DOWNFIELD_PASS"
  | "ILLEGAL_FORWARD_PASS" | "INTENTIONAL_GROUNDING"
  // §4.3, personal fouls and blocks.
  | "ROUGHING_THE_PASSER" | "UNNECESSARY_ROUGHNESS" | "FACE_MASK" | "HORSE_COLLAR_TACKLE"
  | "CLIPPING" | "CHOP_BLOCK"
  /** §4.3's "illegal block in the back". */
  | "ILLEGAL_BLOCK_ABOVE_THE_WAIST"
  | "TRIPPING"
  // §4.3, conduct.
  | "UNSPORTSMANLIKE_CONDUCT" | "TAUNTING";

/**
 * ADR-093 F1: the families of fouls (§6.1, §8). Each has its own moment in a play and its own build
 * step (§11), and a crew leans on each but KICKS (§6.1). A foul's family follows §6.1's lists on a
 * scrimmage snap (DELAY_OF_GAME is TECHNICAL, though step 3 builds it with the snap), and every foul
 * on a kick is KICKS, whatever its kind (§8, step 8). So the engine says which for each foul;
 * contracts hold no table.
 */
export type FoulFamily = "LINE_HOLDING" | "COVERAGE" | "PLAYER_SAFETY" | "TECHNICAL" | "SNAP" | "KICKS";

/**
 * ADR-093 F1: when a foul happened (§4.3, §4.4). Step 0's rulebook reads it: unnecessary roughness
 * is marked from the basic spot when the ball was live and from the succeeding spot after the play,
 * too many men on the field is a live-ball or a dead-ball foul by when it was caught, and fouls
 * after the play are enforced in the order they happened.
 *  - BEFORE_SNAP: a dead-ball foul before the snap; no play ran (a false start, encroachment, a
 *    neutral zone infraction, a delay of game, too many men caught before the snap).
 *  - AT_SNAP: a live-ball foul at the snap; the play ran, and the offended team may keep its
 *    result (an offside, an illegal formation, shift or motion, too many men at the snap; on the
 *    defense, ADR-091 §8's free play).
 *  - DURING_PLAY: after the snap, while the ball was live.
 *  - AFTER_PLAY: once the ball was dead; marked off from the succeeding spot, and the play stands
 *    (§4.4).
 */
export type FoulTiming = "BEFORE_SNAP" | "AT_SNAP" | "DURING_PLAY" | "AFTER_PLAY";

/**
 * ADR-093 F3: the spot a penalty is marked off from (§4.2).
 *  - PREVIOUS_SPOT: where the ball was snapped, or, for a dead-ball foul before the snap (a false
 *    start, encroachment, a delay of game, for instance), where it was to be snapped: there the
 *    previous and succeeding spots are one yard line, and §4.3 marks these fouls from the previous
 *    spot.
 *  - SPOT_OF_FOUL: where the foul was (for a passer's foul, where he threw).
 *  - END_OF_RUN: where the runner was down or went out of bounds, or where he lost the ball.
 *  - SUCCEEDING_SPOT: where the next play would have started (a foul after the play), written so
 *    even when that is the previous spot's yard line (after an incomplete pass), since a foul after
 *    the play leaves the down played.
 * A spot foul (defensive pass interference at the spot of the foul; intentional grounding at the
 * spot of the pass, when that is worse) is written as the NFL writes it: from the previous spot, by
 * the yards to that spot. The kicking game's spots, and a foul marked off on the try or on the
 * kickoff after a touchdown, come with the step that first needs one (8 for kicks; 6 for a personal
 * foul on a scoring play).
 */
export type EnforcementSpot = "PREVIOUS_SPOT" | "SPOT_OF_FOUL" | "END_OF_RUN" | "SUCCEEDING_SPOT";

/**
 * ADR-093 F3: what became of a flag (§4.4). ENFORCED: marked off. DECLINED: the offended team
 * refused it: it kept the play's result, took another flag instead, or, for a foul before the snap,
 * kept the down where it stood. OFFSET: cancelled by a flag on the other team. SUPERSEDED: set
 * aside because a bigger flag on the other team was enforced instead (a 15-yard foul against a
 * 5-yard one, §4.4), the NFL's own word for it.
 */
export type PenaltyOutcome = "ENFORCED" | "DECLINED" | "OFFSET" | "SUPERSEDED";

/**
 * ADR-093 F3: what a penalty does to the down besides its yards (§4.3's "first down / down"
 * column). AUTOMATIC_FIRST_DOWN: a first down whatever the yards (the defense's fouls §4.3 marks
 * so). LOSS_OF_DOWN: the offense loses the down (an illegal forward pass, intentional grounding).
 * YARDS_ONLY: neither, though the yards may still reach the line to gain. One value, since no flag
 * carries both: the first is only ever the defense's, the second only ever the offense's.
 */
export type PenaltyDown = "AUTOMATIC_FIRST_DOWN" | "LOSS_OF_DOWN" | "YARDS_ONLY";

/**
 * ADR-093 F3: how the rulebook marked off a flag (§4.2, §4.3). `yards`: what the flag cost the
 * flagged team, as the NFL writes it and the real-numbers page counts it: the yards marked off
 * from `spot`, after half the distance when `halfTheDistance`. `down`: what it did to the down
 * besides. The down and distance that follow are the next play's to say, not this record's.
 *
 * `safety`: the flagged offense fouled in its own end zone, so the defense scores (§4.2). Then
 * `spot` is SPOT_OF_FOUL and `yards` the distance from the previous spot to the goal line, as the
 * NFL writes it. No down follows a safety, so half the distance and the down do not apply: both are
 * absent, never `false` or YARDS_ONLY (ADR-036).
 */
export type PenaltyEnforcement =
  | {
      safety: false;
      spot: EnforcementSpot;
      yards: number;
      halfTheDistance: boolean;
      down: PenaltyDown;
    }
  | {
      safety: true;
      spot: "SPOT_OF_FOUL";
      yards: number;
      halfTheDistance?: never;
      down?: never;
    };
