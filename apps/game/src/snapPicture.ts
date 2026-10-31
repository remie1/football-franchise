/**
 * WHERE EVERY MAN STOOD AT THE SNAP (ADR-090 step 1; the owner's question 5): the picture a play's
 * `PLAY_START` publishes (`snap`, contracts' `PlayStartSnap`), read defensively and laid out for a
 * drawing.
 *
 * The screen draws what the stream says and works out nothing about football (Charter D7): every
 * spot is the picture's own, to the half yard; names and positions are the file's roster; the
 * field's markings (the hashes, a line every five yards) are only a drawing's. A file made before
 * step 1 has no picture, and the play detail shows none.
 *
 * Drawing frame: x across the field from its middle (the ball's place plus the man's spot across
 * from it), negative to the offense's left; up the screen is downfield, so the offense is drawn at
 * the bottom, as a coach draws a play from behind his offense.
 */
import type { GameFile } from "./gameFile.js";
import { nameOf } from "./gameFile.js";

/** One man at the snap, as the picture placed him. */
export interface SnapMark {
  readonly side: "offense" | "defense";
  readonly id: string;
  readonly name: string;
  /** The roster's position ("QB", "CB"), or "" if the file lacks him. */
  readonly position: string;
  /** His team's color on the page. */
  readonly team: "home" | "away" | "unknown";
  /** Yards across from the ball; negative is the offense's left. */
  readonly x: number;
  /** Yards from the line of scrimmage; positive is downfield. */
  readonly y: number;
  /** A hand on the ground. */
  readonly down: boolean;
  /** His direction (a unit vector) and speed, if he is moving at the snap. */
  readonly moving?: { readonly dx: number; readonly dy: number; readonly yardsPerSecond: number };
}

export interface SnapDiagram {
  /** The ball across the field, in yards from its middle. */
  readonly ballX: number;
  readonly men: readonly SnapMark[];
}

type Obj = Readonly<Record<string, unknown>>;
const obj = (v: unknown): Obj | undefined => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Obj) : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

function markOf(file: GameFile, side: SnapMark["side"], raw: unknown): SnapMark | undefined {
  const spot = obj(raw);
  const id = typeof spot?.player === "string" ? spot.player : undefined;
  const x = num(spot?.x);
  const y = num(spot?.y);
  if (spot === undefined || id === undefined || x === undefined || y === undefined) return undefined;
  const player = file.players[id];
  const team = player === undefined ? "unknown" : player.team === file.home.id ? "home" : player.team === file.away.id ? "away" : "unknown";
  const moving = obj(spot.moving);
  const dx = num(moving?.dx);
  const dy = num(moving?.dy);
  const speed = num(moving?.yardsPerSecond);
  return {
    side,
    id,
    name: nameOf(file, id),
    position: player?.position ?? "",
    team,
    x,
    y,
    down: spot.stance === "DOWN",
    ...(dx === undefined || dy === undefined || speed === undefined ? {} : { moving: { dx, dy, yardsPerSecond: speed } }),
  };
}

/** The play's picture, or `undefined` when its PLAY_START carries none (a file made before step 1). A spot that does not read is left out. */
export function readSnapPicture(file: GameFile, snap: unknown): SnapDiagram | undefined {
  const picture = obj(snap);
  if (picture === undefined) return undefined;
  const list = (side: SnapMark["side"]): SnapMark[] =>
    (Array.isArray(picture[side]) ? (picture[side] as readonly unknown[]) : [])
      .map((raw) => markOf(file, side, raw))
      .filter((m): m is SnapMark => m !== undefined);
  const men = [...list("offense"), ...list("defense")];
  return men.length === 0 ? undefined : { ballX: num(picture.ballX) ?? 0, men };
}

// --- the drawing ------------------------------------------------------------------------------

/** Sideline to sideline, and each hash's distance from the middle (NFL field markings; ADR-090 table D1). */
export const FIELD_WIDTH_YARDS = 53.3;
export const HASH_FROM_MIDDLE_YARDS = 3.1;

/** What one man looks like on the drawing, in drawing units (a yard is one unit; up is downfield). */
export interface DrawnMan {
  readonly mark: SnapMark;
  /** His place on the drawing. */
  readonly cx: number;
  readonly cy: number;
  /** Where a moving man will be a second after the snap, and the arrowhead's three corners there. */
  readonly arrow?: { readonly x2: number; readonly y2: number; readonly head: string };
  /** The "hand on the ground" dot, between him and the line of scrimmage. */
  readonly hand?: { readonly cx: number; readonly cy: number };
  /** Where his label goes: on his mark, or past it, away from the line, when a man nearer the line covers him. */
  readonly labelY: number;
}

export interface SnapDrawing {
  /** `viewBox`: left, top, width, height. */
  readonly viewBox: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** Lines every five yards from the line of scrimmage (not the line itself), as drawing heights. */
  readonly yardLines: readonly { readonly yards: number; readonly cy: number }[];
  readonly hashes: readonly number[];
  readonly ball: { readonly cx: number; readonly cy: number };
  /**
   * In drawing order: the farthest from the line first, so a man nearer it is drawn over a man
   * stacked behind him (the quarterback under center, a Mug linebacker behind his tackle), and the
   * man behind shows past him with his label beyond.
   */
  readonly men: readonly DrawnMan[];
}

/** A mark's size, and how close two marks' centers come before the nearer one hides the other's label. */
const MARK_RADIUS = 0.8;
const COVERS_LABEL = 1.2;
const LABEL_PAST = 1.35;

const round = (v: number): number => Math.round(v * 100) / 100;

function arrowOf(cx: number, cy: number, moving: NonNullable<SnapMark["moving"]>): DrawnMan["arrow"] {
  // One second of travel, drawn; up the screen is downfield, so dy turns over.
  const x2 = cx + moving.dx * moving.yardsPerSecond;
  const y2 = cy - moving.dy * moving.yardsPerSecond;
  const length = Math.hypot(x2 - cx, y2 - cy);
  if (length === 0) return undefined;
  const [ux, uy] = [(x2 - cx) / length, (y2 - cy) / length];
  const back = (side: number): string => `${round(x2 - 0.7 * ux + side * 0.4 * uy)},${round(y2 - 0.7 * uy - side * 0.4 * ux)}`;
  return { x2: round(x2), y2: round(y2), head: `${round(x2)},${round(y2)} ${back(1)} ${back(-1)}` };
}

/** Lays the picture out: the whole width of the field, and from behind the deepest back to past the deepest defender. */
export function drawSnap(d: SnapDiagram): SnapDrawing {
  const depths = d.men.map((m) => m.y);
  const deep = Math.max(10, Math.ceil(Math.max(0, ...depths)) + 3);
  const back = Math.min(-8, Math.floor(Math.min(0, ...depths)) - 2);
  const left = -FIELD_WIDTH_YARDS / 2;
  const top = -deep;
  const height = deep - back;
  const yardLines: { yards: number; cy: number }[] = [];
  for (let y = 5 * Math.ceil(back / 5); y <= deep; y += 5) if (y !== 0) yardLines.push({ yards: y, cy: -y });
  return {
    viewBox: `${round(left)} ${top} ${FIELD_WIDTH_YARDS} ${height}`,
    left: round(left),
    top,
    width: FIELD_WIDTH_YARDS,
    height,
    yardLines,
    hashes: [-HASH_FROM_MIDDLE_YARDS, HASH_FROM_MIDDLE_YARDS],
    ball: { cx: d.ballX, cy: 0 },
    men: drawingOrder(d.men).map((mark, i, order) => {
      const cx = round(d.ballX + mark.x);
      const cy = round(-mark.y);
      const arrow = mark.moving === undefined ? undefined : arrowOf(cx, cy, mark.moving);
      // Toward the line: up the screen for the offense, down it for the defense.
      const toward = mark.side === "offense" ? -1 : 1;
      const hand = mark.down ? { cx, cy: round(cy + toward * (MARK_RADIUS + 0.15)) } : undefined;
      const covered = order
        .slice(i + 1)
        .some((other) => Math.hypot(d.ballX + other.x - cx, -other.y - cy) < COVERS_LABEL);
      const labelY = covered ? round(cy - toward * LABEL_PAST) : cy;
      return { mark, cx, cy, ...(arrow === undefined ? {} : { arrow }), ...(hand === undefined ? {} : { hand }), labelY };
    }),
  };
}

/** Farthest from the line of scrimmage first; the picture's own order among men as far from it. */
function drawingOrder(men: readonly SnapMark[]): readonly SnapMark[] {
  return men
    .map((mark, i) => ({ mark, i }))
    .sort((a, b) => Math.abs(b.mark.y) - Math.abs(a.mark.y) || a.i - b.i)
    .map(({ mark }) => mark);
}

/** "3.5 left", "on the ball", "2 right": across, from the ball, as a coach says it. */
export function sayAcross(x: number): string {
  if (x === 0) return "on the ball";
  return `${Math.abs(x)} ${x < 0 ? "left" : "right"}`;
}

/** "1 downfield" past the line of scrimmage, "5 back" behind it, "on the line" at 0. */
export function sayDepth(y: number): string {
  if (y === 0) return "on the line";
  return y > 0 ? `${y} downfield` : `${-y} back`;
}
