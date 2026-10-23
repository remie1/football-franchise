/**
 * Relationships (ADR-084): how one person on a staff gets on with another, or with the human who
 * runs the team. A view runs one way (owner's B2): the DC's view of the GM is not the GM's view of
 * the DC. Franchise keeps the views; nothing in the sim reads them (B7).
 */
import type { StaffId, TeamId } from "./ids.js";
import type { CalendarStamp } from "./calendar.js";

/**
 * ADR-084 V1: who a view is about. The human who runs a team has no staff record, so he is named by
 * his team. The human holds no views of his own.
 */
export type RelationshipParty = { staff: StaffId } | { user: TeamId };

/** ADR-084 §3: a view as the owner sees it (B6): words, never the number. */
export type RelationshipWord = "close" | "good" | "professional" | "strained" | "broken";

/** ADR-084 V1: one person's view of another. */
export interface RelationshipView {
  /** Whose view it is. */
  from: StaffId;
  of: RelationshipParty;
  /** −100 to +100. */
  score: number;
  /**
   * A grudge the view's holder has against the other party (§6): since when, and what opened it,
   * as the ledger names its moves (e.g. "PLAY_CALLS_TAKEN").
   */
  rift?: { since: CalendarStamp; cause: string };
}
