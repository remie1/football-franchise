import { useLayoutEffect, useMemo, useRef } from "react";
import { drawSnap, sayAcross, sayDepth, type SnapDiagram, type SnapMark } from "./snapPicture.js";

const STANCE = (m: SnapMark): string => (m.down ? "hand down" : "standing");
const MOVING = (m: SnapMark): string => (m.moving === undefined ? "" : `, moving ${m.moving.yardsPerSecond} yards a second`);
const WHO = (m: SnapMark): string => `${m.name}${m.position === "" ? "" : ` (${m.position})`}`;

/** Where every man stood at the snap (ADR-090 step 1), drawn from behind the offense. */
export function SnapPictureView({ diagram }: { diagram: SnapDiagram }) {
  const d = useMemo(() => drawSnap(diagram), [diagram]);
  const scroller = useRef<HTMLDivElement>(null);
  // A screen too narrow for the whole field opens on the ball, the line in the middle.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el === null || el.scrollWidth <= el.clientWidth) return;
    const ball = ((d.ball.cx - d.left) / d.width) * el.scrollWidth;
    el.scrollLeft = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, ball - el.clientWidth / 2));
  }, [d]);
  return (
    <figure className="snap">
      <div className="snap-scroll" ref={scroller}>
        <svg
          viewBox={d.viewBox}
          role="img"
          aria-label={`Where every man stood at the snap: ${diagram.men.length} players, the offense at the bottom.`}
        >
          <rect className="snap-field" x={d.left} y={d.top} width={d.width} height={d.height} />
          {d.yardLines.map((l) => (
            <line key={l.yards} className="snap-yard" x1={d.left} x2={d.left + d.width} y1={l.cy} y2={l.cy} />
          ))}
          {d.hashes.map((x) => (
            <line key={x} className="snap-hash" x1={x} x2={x} y1={d.top} y2={d.top + d.height} />
          ))}
          <line className="snap-los" x1={d.left} x2={d.left + d.width} y1={0} y2={0} />
          <ellipse className="snap-ball" cx={d.ball.cx} cy={d.ball.cy} rx={0.45} ry={0.3} />
          {d.men.map(({ mark, cx, cy, arrow, labelY }) => (
            <g key={`${mark.side}:${mark.id}`} className={`snap-man ${mark.side} ${mark.team}`}>
              <title>{`${WHO(mark)}: ${sayAcross(mark.x)}, ${sayDepth(mark.y)}, ${STANCE(mark)}${MOVING(mark)}`}</title>
              {arrow !== undefined && (
                <>
                  <line className="snap-move" x1={cx} y1={cy} x2={arrow.x2} y2={arrow.y2} />
                  <polygon className="snap-head" points={arrow.head} />
                </>
              )}
              {mark.side === "offense" ? (
                <circle cx={cx} cy={cy} r={0.8} />
              ) : (
                <polygon points={`${cx},${cy - 0.9} ${cx + 0.9},${cy} ${cx},${cy + 0.9} ${cx - 0.9},${cy}`} />
              )}
              <text x={cx} y={labelY} className={labelY === cy ? "snap-label" : "snap-label past"}>
                {mark.position}
              </text>
            </g>
          ))}
          {/* Hands last, over every mark: a lineman's hand sits on the line, where the man across from him is drawn. */}
          {d.men.map(({ mark, hand }) =>
            hand === undefined ? null : (
              <g key={`hand:${mark.side}:${mark.id}`} className={`snap-man ${mark.side} ${mark.team}`}>
                <circle className="snap-hand" cx={hand.cx} cy={hand.cy} r={0.22} />
              </g>
            ),
          )}
        </svg>
      </div>
      <figcaption>
        Circles are the offense, diamonds the defense, each in his team's color; the offense is at the bottom. A dot between a
        man and the line is a hand on the ground; an arrow is a man moving at the snap, drawn to where he is a second later.
        A man stacked right behind another (the quarterback under center) shows past him, his label beyond. The lines are
        five yards apart from the line of scrimmage; the dashes are the hashes. Point at a man for his name and spot.
      </figcaption>
      <details>
        <summary>Every man&apos;s spot (yards from the ball)</summary>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th scope="col" className="left">Side</th>
                <th scope="col" className="left">Player</th>
                <th scope="col" className="left">Across</th>
                <th scope="col" className="left">Depth</th>
                <th scope="col" className="left">Stance</th>
              </tr>
            </thead>
            <tbody>
              {diagram.men.map((m) => (
                <tr key={`${m.side}:${m.id}`}>
                  <td className="left">{m.side === "offense" ? "Offense" : "Defense"}</td>
                  <td className="left">{WHO(m)}</td>
                  <td className="left">{sayAcross(m.x)}</td>
                  <td className="left">{sayDepth(m.y)}</td>
                  <td className="left">{`${STANCE(m)}${MOVING(m)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
