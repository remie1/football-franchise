/**
 * OFFICIALS (ADR-093 F5): the league's officiating crews; a bare § is a section of ADR-093. Names
 * and shapes only (`contracts.md` §10), as in `penalties.ts`, which holds the fouls and the flags.
 * How a crew is made, assigned each week and carried into a new season is franchise's (§6.2,
 * §6.3); how a lean moves the officials' chances is the engine's (§5, §6.1).
 */
import type { OfficiatingCrewId } from "./ids.js";
import type { FoulFamily } from "./penalties.js";

/** ADR-093 F5: the five families a crew leans on (§6.1): all but KICKS, the kicking game's (step 8). */
export type CrewLeanFamily = Exclude<FoulFamily, "KICKS">;

/**
 * ADR-093 F5: one of the league's officiating crews (§6.1 to §6.3): the seven officials who work a
 * game together, known by their referee. `referee` is his made-up name, a stand-in as the players
 * and coaches are (§6.2). `leans`: how much more or less than the league this crew calls each family
 * of fouls, 0 to 100 with 50 the league's average, as they stand this season (§6.1). The engine
 * reads the leans and nothing else about a crew (§6.3).
 */
export interface OfficiatingCrew {
  id: OfficiatingCrewId;
  referee: string;
  leans: Record<CrewLeanFamily, number>;
}
