import { useMemo, useState } from "react";
import type { GameFile } from "./gameFile.js";
import { buildPlayLog, type LineTag, type LogLine } from "./playLog.js";

const TAG_LABELS: Readonly<Record<LineTag, string>> = {
  score: "Score",
  turnover: "Turnover",
  sack: "Sack",
  pressure: "Pressure",
  penalty: "Penalty",
  big: "Big play",
};

function Line({ line }: { line: LogLine }) {
  return (
    <li className={`line ${line.tags.join(" ")}`}>
      <div className="line-head">
        {line.when !== undefined && <span className="when">{line.when}</span>}
        {line.situation !== undefined && <span className="situation">{line.situation}</span>}
        {line.tags.map((t) => (
          <span key={t} className={`tag tag-${t}`}>
            {TAG_LABELS[t]}
          </span>
        ))}
      </div>
      <div className="text">{line.text}</div>
      {line.calls !== undefined && <div className="calls">{line.calls}</div>}
    </li>
  );
}

export function PlayLogView({ game }: { game: GameFile }) {
  const log = useMemo(() => buildPlayLog(game), [game]);
  const [only, setOnly] = useState<LineTag | "all">("all");
  const show = (l: LogLine) => only === "all" || l.tags.includes(only);

  return (
    <section className="panel">
      <div className="filter">
        <label>
          Show{" "}
          <select value={only} onChange={(e) => setOnly(e.target.value as LineTag | "all")}>
            <option value="all">every play</option>
            {(Object.keys(TAG_LABELS) as LineTag[]).map((t) => (
              <option key={t} value={t}>
                {TAG_LABELS[t].toLowerCase()} plays only
              </option>
            ))}
          </select>
        </label>
      </div>
      {only === "all" && log.opening.length > 0 && (
        <ul className="lines">
          {log.opening.map((l, i) => (
            <Line key={i} line={l} />
          ))}
        </ul>
      )}
      {log.drives.map((d) => {
        const lines = d.lines.filter(show);
        if (lines.length === 0) return null;
        return (
          <details key={d.number} className={`drive ${d.offense === game.home.id ? "home" : "away"}`} open>
            <summary>
              <span className="drive-no">Drive {d.number}</span> {d.heading}
              {d.summary !== undefined && <span className="drive-sum">{d.summary}</span>}
            </summary>
            <ul className="lines">
              {lines.map((l, i) => (
                <Line key={l.playId ?? i} line={l} />
              ))}
            </ul>
          </details>
        );
      })}
    </section>
  );
}
