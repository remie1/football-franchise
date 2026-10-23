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
export type { RosterRow, PlayerRow, CombineRow, DepthRow, ContractRow, SnapRow } from "./rows.js";
export { loadSnapshotRows, loadTrackingRows } from "./rows.js";
