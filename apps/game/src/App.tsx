import { useEffect, useState } from "react";
import { GameFileError, parseGameFile, type GameFile } from "./gameFile.js";
import { BoxScoreView } from "./BoxScoreView.js";
import { DriveChartView } from "./DriveChartView.js";
import { PlayLogView } from "./PlayLogView.js";
import { ScoreboardView } from "./ScoreboardView.js";

const TABS = [
  { id: "log", label: "Play log" },
  { id: "drives", label: "Drive chart" },
  { id: "box", label: "Box score" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Games `export-game` saved into `public/games/`, listed by its `index.json`. */
async function listSavedGames(): Promise<readonly string[]> {
  try {
    const res = await fetch("games/index.json");
    if (!res.ok) return [];
    const body = (await res.json()) as { games?: unknown };
    return Array.isArray(body.games) ? body.games.filter((g): g is string => typeof g === "string") : [];
  } catch {
    return [];
  }
}

export function App() {
  const [saved, setSaved] = useState<readonly string[]>([]);
  const [game, setGame] = useState<GameFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  // `?tab=drives` / `?tab=box` opens on that tab, alongside `?game=`.
  const [tab, setTab] = useState<Tab>(() => {
    const asked = new URLSearchParams(window.location.search).get("tab");
    return TABS.find((t) => t.id === asked)?.id ?? "log";
  });

  useEffect(() => {
    void listSavedGames().then(setSaved);
    // `?game=<file>` opens a saved game straight away, so a game can be shared as a link.
    const linked = new URLSearchParams(window.location.search).get("game");
    if (linked !== null) void openSaved(linked);
  }, []);

  const open = (text: string) => {
    try {
      setGame(parseGameFile(text));
      setError(null);
    } catch (e) {
      setGame(null);
      setError(e instanceof GameFileError ? e.message : `Couldn't open that file: ${String(e)}`);
    }
  };

  const openSaved = async (name: string) => {
    const res = await fetch(`games/${encodeURIComponent(name)}`);
    if (!res.ok) {
      setGame(null);
      setError(`There's no saved game called "${name}".`);
      return;
    }
    open(await res.text());
  };

  return (
    <main>
      <header className="bar">
        <h1>Game viewer</h1>
        <div className="pickers">
          {saved.length > 0 && (
            <select defaultValue="" onChange={(e) => e.target.value && void openSaved(e.target.value)} aria-label="Saved games">
              <option value="" disabled>
                Saved games…
              </option>
              {saved.map((name) => (
                <option key={name} value={name}>
                  {name.replace(/\.json$/, "")}
                </option>
              ))}
            </select>
          )}
          <label className="file">
            Open a game file
            <input type="file" accept=".json,application/json" onChange={(e) => void e.target.files?.[0]?.text().then(open)} />
          </label>
        </div>
      </header>

      {error !== null && <p className="error">{error}</p>}
      {game === null && error === null && (
        <p className="empty">
          No game open. Make one with <code>pnpm --filter @ff/calibration export-game --seed my-game</code>, then pick it above.
        </p>
      )}
      {game !== null && (
        <>
          <ScoreboardView game={game} />
          <nav className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
          {tab === "log" && <PlayLogView game={game} />}
          {tab === "drives" && <DriveChartView game={game} />}
          {tab === "box" && <BoxScoreView game={game} />}
        </>
      )}
    </main>
  );
}
