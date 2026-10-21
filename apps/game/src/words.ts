/**
 * Football's own notation for the numbers the stream carries. Pure wording: every number in
 * here arrives from an event and leaves as text, unchanged.
 */

/** `ballOn` is yards from the offence's own goal line: 30 is "own 30", 68 is "opp 32". */
export function spot(ballOn: number): string {
  const yard = Math.round(ballOn);
  if (yard === 50) return "the 50";
  return yard < 50 ? `own ${yard}` : `opp ${100 - yard}`;
}

/**
 * Where a kick left the ball, from the RECEIVING team's side (the stream's `resultYardLine` is
 * their `ballOn`): "their own 20". Said this way because a kick line sits in the kicking team's
 * drive, where a bare "own 20" would read as the kicking team's.
 */
export function kickSpot(resultYardLine: number): string {
  const yard = Math.round(resultYardLine);
  if (yard === 50) return "the 50";
  return yard < 50 ? `their own ${yard}` : `the kicking team's ${100 - yard}`;
}

/** Seconds left in the period, as the scoreboard shows them: 14:53, 0:07. */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Elapsed time, as a drive chart shows it: 2:47. */
export const elapsed = clock;

const ORDINAL = ["", "1st", "2nd", "3rd", "4th"];

/** "3rd & 7 at opp 32"; "1st & Goal at opp 5" when the line to gain is the goal line. */
export function downAndDistance(down: number, distance: number, ballOn: number): string {
  const toGo = Math.round(distance) >= 100 - Math.round(ballOn) ? "Goal" : String(Math.round(distance));
  return `${ORDINAL[down] ?? `${down}th`} & ${toGo} at ${spot(ballOn)}`;
}

/** "for 7 yards", "for 1 yard", "for no gain", "for a loss of 3". */
export function gain(yards: number): string {
  const y = Math.round(yards);
  if (y === 0) return "for no gain";
  if (y < 0) return `for a loss of ${-y}`;
  return `for ${y} ${y === 1 ? "yard" : "yards"}`;
}

/** "RIGHT-C" is the engine's gap label; a coach says "right C gap". */
export function gapWords(gap: string): string {
  const [side, letter] = gap.split("-");
  return letter === undefined ? gap.toLowerCase() : `${side!.toLowerCase()} ${letter} gap`;
}

/** "Q1", "Q4", "OT", "OT2". */
export function quarter(period: number): string {
  if (period <= 4) return `Q${period}`;
  return period === 5 ? "OT" : `OT${period - 4}`;
}

/** SCREAMING_CASE from the stream, as a sentence fragment: "TURNOVER_ON_DOWNS" → "Turnover on downs". */
export function sentenceCase(token: string): string {
  const words = token.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
