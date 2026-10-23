/**
 * @ff/attributes — see ARCHITECTURE_CHARTER.md §3 and docs/design/attributes.md.
 *
 * Today: the fictional league generator (ADR-079, team rosters). The real importer, rookie
 * classes and calibration patches (attributes.md §9) come later.
 */
export {
  generateLeagueRosters, overallAt, DEFAULT_TEAM_STRENGTH_SD,
  type GenerateLeagueInput, type FictionalProvenance,
} from "./fictional/generate.js";
export type { Measurements } from "./fictional/derive.js";
export { ROSTER_SHAPE, ROSTER_SIZE } from "./fictional/shape.js";
