import { useEffect, useState } from "react";
import { NewsFileError, parseNewsFile, type NewsFile } from "./newsFile.js";
import { NewsView } from "./NewsView.js";

/** Seasons' news the `news` command saved into `public/news/`, listed by its `index.json`. */
async function listSavedNews(): Promise<readonly string[]> {
  try {
    const res = await fetch("news/index.json");
    if (!res.ok) return [];
    const body = (await res.json()) as { news?: unknown };
    return Array.isArray(body.news) ? body.news.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

/** The News page (ADR-082 step 3): pick a season's saved news, or open a news file. */
export function NewsPage() {
  const [saved, setSaved] = useState<readonly string[]>([]);
  const [news, setNews] = useState<NewsFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listSavedNews().then(setSaved);
    // `?news=<file>` opens a season's news straight away, so it can be shared as a link.
    const linked = new URLSearchParams(window.location.search).get("news");
    if (linked !== null) void openSaved(linked);
  }, []);

  const open = (text: string) => {
    try {
      setNews(parseNewsFile(text));
      setError(null);
    } catch (e) {
      setNews(null);
      setError(e instanceof NewsFileError ? e.message : `Couldn't open that file: ${String(e)}`);
    }
  };

  const openSaved = async (name: string) => {
    const res = await fetch(`news/${encodeURIComponent(name)}`);
    if (!res.ok) {
      setNews(null);
      setError(`There's no saved news called "${name}".`);
      return;
    }
    open(await res.text());
  };

  return (
    <>
      <div className="pickers page-pickers">
        {saved.length > 0 && (
          <select defaultValue="" onChange={(e) => e.target.value && void openSaved(e.target.value)} aria-label="Saved news">
            <option value="" disabled>
              Saved seasons…
            </option>
            {saved.map((name) => (
              <option key={name} value={name}>
                {name.replace(/\.json$/, "")}
              </option>
            ))}
          </select>
        )}
        <label className="file">
          Open a news file
          <input type="file" accept=".json,application/json" onChange={(e) => void e.target.files?.[0]?.text().then(open)} />
        </label>
      </div>

      {error !== null && <p className="error">{error}</p>}
      {news === null && error === null && (
        <p className="empty">
          No news open. Save a season with <code>pnpm --filter @ff/calibration season -- --seed my-season --out season.json</code>,
          write its news with <code>pnpm --filter @ff/narrative news -- --season season.json</code>, then pick it above.
        </p>
      )}
      {news !== null && <NewsView news={news} />}
    </>
  );
}
