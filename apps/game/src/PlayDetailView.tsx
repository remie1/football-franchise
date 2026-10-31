import { useMemo } from "react";
import type { GameFile } from "./gameFile.js";
import { buildPlayDetail, type DetailFact } from "./playDetail.js";
import { SnapPictureView } from "./SnapPictureView.js";

function Facts({ title, facts }: { title: string; facts: readonly DetailFact[] }) {
  if (facts.length === 0) return null;
  return (
    <div className="facts">
      <h4>{title}</h4>
      <dl>
        {facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PlayDetailView({ game, playId }: { game: GameFile; playId: string }) {
  const d = useMemo(() => buildPlayDetail(game, playId), [game, playId]);
  return (
    <div className="detail">
      {d.snap !== undefined && (
        <div>
          <h4>At the snap</h4>
          <SnapPictureView diagram={d.snap} />
        </div>
      )}

      <div className="facts-pair">
        <Facts title="Offense called" facts={d.offense} />
        <Facts title="Defense called" facts={d.defense} />
      </div>

      {d.disguise.length > 0 && (
        <div className="table-wrap">
          <h4>What the defense showed vs played</h4>
          <table className="grid">
            <thead>
              <tr>
                <th scope="col" className="left">Defender</th>
                <th scope="col" className="left">Showed</th>
                <th scope="col" className="left">Played</th>
              </tr>
            </thead>
            <tbody>
              {d.disguise.map((r) => (
                <tr key={r.defender}>
                  <td className="left">{r.defender}</td>
                  <td className="left">{r.showed}</td>
                  <td className="left">{r.played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {d.reads.length > 0 && (
        <div className="table-wrap">
          <h4>Pre-snap reads</h4>
          <table className="grid">
            <tbody>
              {d.reads.map((r, i) => (
                <tr key={i}>
                  <td className="left">{r.who}</td>
                  <td className="left">{r.read}</td>
                  <td title={r.modifiers}>{r.roll}</td>
                  <td className="left">{r.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {d.timeline.length > 0 && (
        <div>
          <h4>After the snap</h4>
          <ol className="timeline">
            {d.timeline.map((t, i) => (
              <li key={i}>
                <span className="tick">{t.tick === "snap" ? "snap" : `tick ${t.tick}`}</span> {t.text}
              </li>
            ))}
          </ol>
        </div>
      )}

      {d.dice.length > 0 && (
        <details className="dice">
          <summary>The dice ({d.dice.length} rolls; hover a roll for its modifiers)</summary>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th scope="col" className="left">Check</th>
                  <th scope="col" className="left">Who</th>
                  <th scope="col">Roll</th>
                  <th scope="col" className="left">Against</th>
                  <th scope="col">Margin</th>
                  <th scope="col" className="left">Tier</th>
                  <th scope="col" className="left">Band</th>
                </tr>
              </thead>
              <tbody>
                {d.dice.map((r, i) => (
                  <tr key={i}>
                    <td className="left">{r.kind}</td>
                    <td className="left">{r.who}</td>
                    <td title={r.modifiers}>{r.roll}</td>
                    <td className="left">{r.against}</td>
                    <td>{r.margin}</td>
                    <td className="left">{r.tier}</td>
                    <td className="left">{r.band}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
