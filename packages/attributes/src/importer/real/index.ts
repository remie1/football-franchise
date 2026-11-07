/**
 * The real importer (ADR-088; attributes.md §5). The only module that reads real-player data.
 * Everything it returns carries made-up names; the sealed table is the one join back, and it
 * stays in the local cache.
 */
export * from "./snapshot.js";
export * from "./positions.js";
export * from "./standins.js";
export * from "./rate.js";
export * from "./signals.js";
export * from "./tracking.js";
export * from "./league.js";
export * from "./contracts.js";
export * from "./history.js";
export * from "./picks.js";
export * from "./deadMoney.js";
export * from "./development.js";
export * from "./leagueFile.js";
export * from "./officials.js";
export {
  copiedCrews, crewsOfSnapshot, fetchOfficialsSnapshot, officialsSnapshotDir, readOfficialsSnapshot, snapshotTaken,
  type CopiedCrews, type CopiedCrewsBuilt, type OfficialsSnapshot, type SealedTables,
} from "./officialsSnapshot.js";
export type { RosterRow, PlayerRow, CombineRow, DepthRow, ContractRow, SnapRow, InjuryRow, ScheduleRow, OfficialRow, PlayRow } from "./rows.js";
export {
  loadSnapRows, loadSnapshotRows, loadTrackingRows, loadScheduleRows, loadOfficialRows, loadPlayerNames, loadPlayRows,
} from "./rows.js";
