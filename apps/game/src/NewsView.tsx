import { readNews, type NewsFile } from "./newsFile.js";

/** A season's news, edition by edition, as the news desk wrote it. Big stories (importance 4-5) lead in bold. */
export function NewsView({ news }: { news: NewsFile }) {
  const editions = readNews(news);
  const headlines = editions.reduce((n, e) => n + e.lines.length, 0);
  return (
    <>
      <section className="panel">
        <h2>Season {news.season}</h2>
        <p className="meta">
          {headlines} headlines in {editions.length} editions · seed <code>{news.seed}</code>
        </p>
        <nav className="jump" aria-label="Editions">
          {editions.map((e) => (
            <a key={e.id} href={`#${e.id}`}>
              {e.label}
            </a>
          ))}
        </nav>
      </section>
      {editions.map((e) => (
        <section className="panel edition" key={e.id} id={e.id}>
          <h2>{e.label}</h2>
          <ul className="lines">
            {e.lines.map((line, i) => (
              <li key={i} className={line.importance >= 4 ? "line headline lead" : "line headline"}>
                <span className="text">{line.headline}</span>
                {line.score !== undefined && <span className="final">{line.score}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
