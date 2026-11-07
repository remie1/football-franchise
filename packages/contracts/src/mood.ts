/**
 * ADR-096 M1, M2: fan and media mood, the perception system's public side. Franchise keeps it and
 * moves it after each week's games and at the offseason's big moments; the news and the team
 * podcast read it. Apart from the president's firing chances (behind a switch, ADR-096 §6),
 * nothing in the sim reads it.
 */
import type { PlayerId, StaffId } from "./ids.js";

/** Who feels it: the fan base (fast, overreacting) or the local media (slower, closer to the facts). */
export type MoodAudience = "FANS" | "MEDIA";

/** The seats fans and media hold a mood about. */
export type MoodSeat = "HEAD_COACH" | "GM" | "OC" | "DC";

/** What the mood is about: the team, a man in one of its seats, or a player on its watch list. */
export type MoodSubject =
  | { kind: "TEAM" }
  | { kind: "STAFF"; staff: StaffId; seat: MoodSeat }
  | { kind: "PLAYER"; player: PlayerId };

/**
 * One audience's mood about one subject, from -100 (furious) to +100 (thrilled). `change` is the
 * move since the last reading; `causes` are franchise's own short strings ("LOSS_TO_WORSE_TEAM",
 * "LOSING_STREAK_3", "BIG_CALL"), so a new cause needs no contracts edit.
 */
export interface MoodReading {
  audience: MoodAudience;
  subject: MoodSubject;
  value: number;
  change: number;
  causes: string[];
}
