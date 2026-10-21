import type { GameFile } from "./gameFile.js";
import { readBoxScore } from "./boxScore.js";

export function BoxScoreView({ game }: { game: GameFile }) {
  return (
    <div className="box-teams">
      {readBoxScore(game).map(({ team, tables }) => (
        <section key={team.id} className="panel">
          <h2>
            <span className="city">{team.city}</span> {team.name}
          </h2>
          {tables.map((t) => (
            <div key={t.title} className="table-wrap">
              <table className="grid">
                <thead>
                  <tr>
                    <th scope="col" className="left">{t.title}</th>
                    {t.columns.map((c) => (
                      <th scope="col" key={c}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r) => (
                    <tr key={r.player}>
                      <th scope="row" className="left">{r.player}</th>
                      {r.cells.map((c, i) => (
                        <td key={i}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
