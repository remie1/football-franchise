/**
 * ADR-096 §3: the rates of fan and media mood. One set for every fan base (Q3 b).
 *
 * Every number here is CHOSEN (the ADR's provenance table: "every rate, weight, band, threshold
 * below: judgment; tuned at the checks named in §8"), except where marked MEASURED. None is set to
 * hit a target: they are first guesses at how a fan base and a local press react, to be looked at
 * in `mood-check` and tuned against what real fan and media polling shows when we count it.
 */
export const MOOD = {
  /** Readings run from -100 (furious) to +100 (thrilled). */
  limit: 100,

  /** §3.1 (1): surprise = tanh((margin - expected margin) / this), in points. */
  surpriseScale: 14,
  /**
   * §3.1 (1): home field, in points of expected margin. MEASURED as 0: the engine plays no home
   * field (no home-field term anywhere in `packages/engine`). `mood-check` prints our league's home
   * margin so this can follow the engine if one is added. The real NFL's is about 1.5 to 2 points.
   */
  homeEdge: 0,

  /** §3.1 (2): how it happened. Each applies `howStep` toward the result's side; together at most `howCap`. */
  blowout: 21,
  blownLead: 14,
  /** A game decided late: within this margin, and the side ahead after three periods did not win (or it went to overtime). */
  lateMargin: 8,
  howStep: 0.1,
  howCap: 0.25,

  /** §3.1 (3): each game past the second in a streak adds this toward its side. */
  streakFrom: 3,
  streakStep: 0.1,

  /** §3.1 (4): a unit's share = tanh((points against what it was expected to allow or score) / this). */
  unitScale: 10,
  /**
   * §3.1 (4): the head coach's share of the team's move. CHOSEN placeholder: the ADR's "half of the
   * whole"; real fan polling on how much of a result fans put on the head coach is not counted yet.
   * His big calls (fourth downs, two-point tries, late timeouts) are left out until franchise can see
   * them (they live in the play-by-play only; a contracts petition when wanted).
   */
  headCoachShare: 0.5,
  /**
   * §3.1 (4): each coordinator's share of his unit's result. The owner's pick on 2026-11-07 ("cool
   * down the coordinators"): at the full unit result fans wanted an OC or DC fired in about 90% of
   * team-seasons. Half, as the head coach takes half of the team's, is CHOSEN, not counted; real fan
   * polling on coordinators is not counted yet.
   */
  coordinatorShare: 0.5,
  /** §3.2: the GM's share of the record against expectation (a third of the team's move). */
  gmShare: 1 / 3,

  /** §3.1 (5): fans overreact; the last two games carry most of it. */
  fans: { keep: 0.55, gain: 0.45, amp: 1.3 },
  /**
   * §3.1 (5): media move slower and are pulled toward the season's record against expectation:
   * target = 100 tanh((wins - expected wins) / pullScale), `pull` of the gap closed each game.
   */
  media: { keep: 0.85, gain: 0.15, pull: 0.1, pullScale: 3 },

  /** §3.1 (6): in a week with no game, both drift this share toward the rest point. */
  drift: 0.1,
  /** §3.1 (6): the rest point is this share of last season's final team mood (a bad year is remembered). */
  remember: 0.1,

  /** §3.2: the GM's off-field blame, each week the team plays. */
  gm: {
    /** A starter hurt with no healthy backup within this many rating points. */
    thinBackup: 8,
    perThinSpot: 0.1,
    thinCap: 0.3,
    /** A unit whose starters' expected change next year is in the league's worst quarter (the "old offensive line"). */
    agingUnit: 0.15,
    /** Next year's committed cap in the league's worst quarter. */
    tightCap: 0.15,
    worstShare: 0.25,
  },

  /** §3.2 (Q6 b): offseason moments, in points of fan mood on the team. */
  offseason: { firing: 15, hireFans: 10, hireMedia: 0, bigSigning: 10, bigSigningRank: 20, firstRoundPick: 5 },

  /** §3 watch list. */
  watch: {
    size: 6,
    /** Form: his game grade at least this far from what his rating promises, the same way, in `formGames` straight games. */
    formGap: 8,
    formGames: 2,
    /** A game counts toward his grade only with at least this many snaps. */
    minSnaps: 20,
    topCapHits: 5,
    longInjury: 4,
    /** He leaves after this many quiet weeks: weeks his fan reading moved less than `quietMove` and nothing put him on. */
    quietWeeks: 4,
    quietMove: 5,
    /** His share = tanh((grade - promised grade) / this). */
    gradeScale: 10,
  },

  /** §3.3: a small weekly wobble on fan readings (sd, points), from its own fork. */
  wobbleSd: 3,
} as const;

/** §3.3: the mood's own dice, by team and week, so no existing draw moves. */
export const MOOD_STREAM = "franchise:mood";
