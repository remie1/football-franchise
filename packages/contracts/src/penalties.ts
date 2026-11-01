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
