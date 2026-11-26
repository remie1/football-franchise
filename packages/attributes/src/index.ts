/**
 * @ff/attributes — see ARCHITECTURE_CHARTER.md §3 and docs/design/attributes.md.
 *
 * Today: the fictional league generator (ADR-079, team rosters) and the draft class maker
 * (ADR-086). The real importer and calibration patches (attributes.md §9) come later.
 */
export {
  generateLeagueRosters, overallAt, DEFAULT_TEAM_STRENGTH_SD,
  type GenerateLeagueInput, type FictionalProvenance,
} from "./fictional/generate.js";
export {
  generateDraftClass, DRAFT_CLASS_SIZE, PROSPECT_TALENT, PROSPECT_TALENT_WITH_GROWTH, CLASS_WOBBLE,
  type GenerateDraftClassInput, type GeneratedDraftClass,
} from "./fictional/draftClass.js";
export type { Measurements } from "./fictional/derive.js";
export { ROSTER_SHAPE, ROSTER_SIZE } from "./fictional/shape.js";
// ADR-087: growth rates, career snaps and patience for made-up players (only with `development`).
export { drawGrowth, drawPatience, GROWTH, CAREER_SNAPS, PATIENCE_SEASONS } from "./fictional/development.js";
// ADR-087 §12.2.3: each man's own fade shifts (only with `development` and `aging: "ability"`).
export { drawFadeShift, FADE_SHIFT, type AgingOption } from "./fictional/development.js";
