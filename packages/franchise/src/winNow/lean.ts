/**
 * ADR-094 §1 (owner's Q1 a): every GM and head coach leans from patient to win-now.
 *
 * 0 is patient: build through the draft, keep the picks. 100 is win now: spend the future on this
 * year. Drawn once for each man and kept for his career: GMs center on 40 and head coaches on 60
 * (ADR-081: the GM looks long, the coaches look short), one standard deviation 15, with his
 * personality nudging it up to 10 points. Held as an open key on his ratings, the way a president
 * holds his cap leaning, so no contracts edit; a man without it is read through the same draw. The
 * draw has its own fork (`franchise:winNowLean`, by his id), so it moves no other draw.
 *
 * All centers, the spread and the nudges are CHOSEN (judgment; no real count of how patient GMs or
 * coaches are exists), to be tuned at ADR-094's many-season check. The lean reaches contract calls
 * only through `Team.direction` (agreed with the cap thread, ADR-094 §7).
 */
import { createRng, type PersonalityType, type StaffState } from "@ff/contracts";
import { clamp, normal } from "../staff/world.js";

/** The rating key that holds a man's lean (an open key on his ratings). */
export const WIN_NOW_LEAN = "winNowLean";

/** The random stream the leans are drawn from, forked by the man's id. */
export const WIN_NOW_STREAM = "franchise:winNowLean";

/** Where each kind of man centers before his own variation. CHOSEN. */
export const LEAN_CENTER = { GM: 40, HEAD_COACH: 60 } as const;

/** One standard deviation of his own variation, in lean points. CHOSEN. */
export const LEAN_SPREAD = 15;

/** Q1 a: his personality's nudge, at most 10 points either way. CHOSEN. */
export const LEAN_NUDGE: Readonly<Record<PersonalityType, number>> = {
  fiery: 10, demanding: 5, playersCoach: 0, cerebral: -5, quiet: -10,
};

/** The kinds of men who hold a lean. */
export type LeanHolder = keyof typeof LEAN_CENTER;

/** Which kind of man he is for his lean: a GM, or anyone else read as a head coach. */
export const leanHolderOf = (s: Pick<StaffState, "role">): LeanHolder => (s.role === "GM" ? "GM" : "HEAD_COACH");

/** His drawn lean, 0..100, whole points. Pure: the same man and seed always give the same lean. */
export function drawWinNowLean(s: Pick<StaffState, "id" | "role" | "personalityType">, seed: string): number {
  const rng = createRng(seed, WIN_NOW_STREAM).fork(String(s.id));
  const center = LEAN_CENTER[leanHolderOf(s)] + LEAN_NUDGE[s.personalityType];
  return Math.round(clamp(center + LEAN_SPREAD * normal(rng), 0, 100));
}

/** His lean: the one he holds, or the draw. */
export function winNowLean(s: Pick<StaffState, "id" | "role" | "personalityType" | "attributes">, seed: string): number {
  const held = s.attributes[WIN_NOW_LEAN];
  return held !== undefined ? held : drawWinNowLean(s, seed);
}

/** A copy of him holding his lean (for a world that stores it). */
export function withWinNowLean<T extends StaffState>(s: T, seed: string): T {
  if (s.attributes[WIN_NOW_LEAN] !== undefined) return s;
  return { ...s, attributes: { ...s.attributes, [WIN_NOW_LEAN]: drawWinNowLean(s, seed) } };
}
