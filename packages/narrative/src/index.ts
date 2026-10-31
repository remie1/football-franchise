/**
 * @ff/narrative — see ARCHITECTURE_CHARTER.md §3 and docs/design/narrative.md.
 *
 * v0 is the news desk (ADR-082): headlines built from results, which change nothing in the game.
 */
export {
  createNewsDesk, writeNews, selectStories,
  type NewsDesk, type NewsInput, type Edition, type StoryEnvelope,
} from "./news/desk.js";
export { formatEdition } from "./news/format.js";
export { createStaffBeat, wordOfScore, LEAK_CHANCE, type StaffBeat, type StaffSeat, type StaffView } from "./news/staff.js";
export { newsFile, NEWS_FILE_FORMAT, type NewsFile, type NewsFileInput, type NewsFileTeam } from "./news/file.js";
export { indexLeague, nicknameOf, type LeagueIndex, type TeamEntry, type TeamNames } from "./news/league.js";
export { LINES, STORY_FACTS, ONCE_A_SEASON, DEFAULT_PER_WEEK, MAX_PER_KIND, type Candidate, type Importance } from "./news/stories.js";
export { WORDING, fill, placeholders, numberWord, ordinalWord, type Wording, type Lines, type Facts, type Tone } from "./news/words.js";
