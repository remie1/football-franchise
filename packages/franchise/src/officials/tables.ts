/**
 * ADR-093 step 1 (§6.1, §6.2): the rules the league's officiating crews are made, carried and
 * assigned by, as data. A bare § is a section of ADR-093; "§16 A<n>" is an item of its step-1
 * ledger. Each number says where it comes from: REAL from the real-numbers page, COMPUTED from
 * it, CHOSEN by judgment.
 */
import type { CrewLeanFamily } from "@ff/contracts";

export const CREW_RULES = Object.freeze({
  /** REAL: the NFL's 17 crews, one to a referee (§6.1, §6.2). */
  count: 17,
  /** The league's average lean, the middle of the contract's 0 to 100 (contracts officials.ts). */
  leagueLean: 50,
  /** The order every draw takes the families in: the contract's own (contracts penalties.ts, `FoulFamily`). */
  families: Object.freeze(["LINE_HOLDING", "COVERAGE", "PLAYER_SAFETY", "TECHNICAL", "SNAP"] as const satisfies readonly CrewLeanFamily[]),
  /**
   * One season's lean SD in points (§16 A4; COMPUTED from the real-numbers page's rounded Table 2,
   * so good to whole points): 50 × about 1.3 × the family's rate-weighted crew SD, where 1.3 is
   * offensive holding's single-season spread over its three seasons pooled (Table 6 over Table 2).
   * Provisional until each family's step measures its own single-season spread.
   */
  leanSd: Object.freeze({ LINE_HOLDING: 8.6, COVERAGE: 8.8, PLAYER_SAFETY: 14.0, TECHNICAL: 10.3, SNAP: 4.4 } satisfies Record<CrewLeanFamily, number>),
  /**
   * How a crew's lean carries into the next season (§6.1, §16 A5): 0.35 as written (REAL, Table 6,
   * 158 pairs of back-to-back referee-seasons), until the owner answers whether it should be the
   * habit that shows 0.35 in the game's records, about 0.68.
   */
  carry: 0.35,
  /**
   * Q3, ruled: no crew works the same team twice in this many weeks, byes included (§6.2, §16 A6).
   * With 17 crews and at most 16 games a week it can always be met (Hall's condition); so could a
   * rule of five weeks, though not one of six.
   */
  teamWeeks: 4,
});
