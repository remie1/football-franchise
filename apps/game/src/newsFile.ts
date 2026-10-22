/**
 * THE VIEWER'S NEWS FILE — read side (ADR-082 step 3).
 *
 * Written by `@ff/narrative`'s `news` command (`packages/narrative/src/news/file.ts`), whose
 * `NewsFile` this mirrors by hand: the screen may import nothing but `@ff/contracts`. The stories
 * are the contract's `PRESS_STORY_PUBLISHED` events and the results its `GameResult`s. The page
 * lays out what the news desk wrote; it picks, ranks and words nothing (Charter D7).
 */
import type { CalendarStamp, FranchiseEvent, FranchiseEventEnvelope, GameResult } from "@ff/contracts";

export const NEWS_FILE_FORMAT = "ff-news/1";

export interface NewsFileTeam {
  readonly id: string;
  readonly city: string;
  /** The nickname: "Bison" for the Elmwood Bison. */
  readonly name: string;
}

export interface NewsEdition {
  /** "Week 6", "Wild-card round", "Season review". */
  readonly label: string;
  readonly at: CalendarStamp;
  readonly stories: readonly FranchiseEventEnvelope[];
}

export interface NewsFile {
  readonly format: typeof NEWS_FILE_FORMAT;
  readonly seed: string;
  readonly season: number;
  readonly teams: readonly NewsFileTeam[];
  readonly results: readonly GameResult[];
  readonly editions: readonly NewsEdition[];
}

export class NewsFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewsFileError";
  }
}

/** Checks the outline only: a file from a newer desk with new story kinds still opens. */
export function parseNewsFile(text: string): NewsFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new NewsFileError("This isn't a news file: it doesn't read as JSON.");
  }
  if (typeof raw !== "object" || raw === null) throw new NewsFileError("This isn't a news file.");
  const file = raw as Partial<NewsFile>;
  if (file.format !== NEWS_FILE_FORMAT) {
    throw new NewsFileError(
      `This file says it is "${String(file.format)}", and this page reads "${NEWS_FILE_FORMAT}". ` +
        "Make it again with the news command.",
    );
  }
  if (!Array.isArray(file.editions) || file.editions.length === 0) throw new NewsFileError("This news file has no headlines in it.");
  if (!Array.isArray(file.teams) || !Array.isArray(file.results)) throw new NewsFileError("This news file is missing its teams or scores.");
  return file as NewsFile;
}

type Story = Extract<FranchiseEvent, { type: "PRESS_STORY_PUBLISHED" }>["payload"];

export interface NewsLine {
  readonly headline: string;
  readonly kind: string;
  readonly importance: number;
  /** "Crestview Miners 42, Harbor City Bison 27", winner first, for a story about one game. */
  readonly score?: string;
}

export interface NewsPageEdition {
  /** For the page's "go to" links. */
  readonly id: string;
  readonly label: string;
  readonly lines: readonly NewsLine[];
}

/** The editions as the page shows them, in the desk's order: each story's headline, and its game's score. */
export function readNews(file: NewsFile): NewsPageEdition[] {
  const teams = new Map(file.teams.map((t) => [t.id, t]));
  const results = new Map(file.results.map((g) => [String(g.gameId), g]));
  const name = (id: string) => {
    const t = teams.get(id);
    return t === undefined ? id : `${t.city} ${t.name}`;
  };
  const score = (story: Story): string | undefined => {
    const g = story.games.length === 1 ? results.get(String(story.games[0])) : undefined;
    if (g === undefined) return undefined;
    const home = `${name(String(g.home))} ${g.homeScore}`;
    const away = `${name(String(g.away))} ${g.awayScore}`;
    return g.awayScore > g.homeScore ? `${away}, ${home}` : `${home}, ${away}`;
  };
  return file.editions.map((edition, i) => ({
    id: `edition-${i + 1}`,
    label: edition.label,
    lines: edition.stories.flatMap((s) => {
      if (s.event.type !== "PRESS_STORY_PUBLISHED") return [];
      const story = s.event.payload;
      const line = score(story);
      return [{ headline: story.headline, kind: story.kind, importance: story.importance, ...(line === undefined ? {} : { score: line }) }];
    }),
  }));
}
