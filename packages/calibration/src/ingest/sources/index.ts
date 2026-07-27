/** The source registry. Adding a source is adding an entry here and nothing else. */

import type { SourceId } from "../manifest.js";
import { depthChartsSource } from "./depthCharts.js";
import { ftnChartingSource } from "./ftn.js";
import { injuriesSource } from "./injuries.js";
import { ngsPassingSource, ngsReceivingSource, ngsRushingSource } from "./ngs.js";
import { participationSource } from "./participation.js";
import { pbpSource } from "./pbp.js";
import { schedulesSource } from "./schedules.js";
import { snapCountsSource } from "./snapCounts.js";
import type { AnySourceDefinition } from "./types.js";
import { weeklyRostersSource } from "./weeklyRosters.js";

export * from "./types.js";
export * from "./rosterStatus.js";
export * from "./schedules.js";
export * from "./pbp.js";
export * from "./injuries.js";
export * from "./snapCounts.js";
export * from "./weeklyRosters.js";
export * from "./depthCharts.js";
export * from "./participation.js";
export * from "./ngs.js";
export * from "./ftn.js";

/**
 * Every ingestable source. The registry is heterogeneous, so rows are `unknown` here; typed
 * access goes through the individual source exports above.
 */
export const SOURCES: readonly AnySourceDefinition[] = [
  schedulesSource,
  pbpSource,
  participationSource,
  weeklyRostersSource,
  injuriesSource,
  snapCountsSource,
  depthChartsSource,
  ftnChartingSource,
  ngsPassingSource,
  ngsRushingSource,
  ngsReceivingSource,
];

/**
 * The subset that `calibration.md` §10.2 calls weekly availability. Grouped explicitly so a
 * consumer can ask for "availability" without knowing which four files carry it, and so the gap
 * analysis has a name to point at.
 */
export const AVAILABILITY_SOURCE_IDS: readonly SourceId[] = [
  "weekly_rosters",
  "injuries",
  "snap_counts",
  "depth_charts",
];

export function sourceById(id: SourceId): AnySourceDefinition {
  const found = SOURCES.find((s) => s.id === id);
  if (found === undefined) {
    throw new RangeError(`unknown source "${id}"; known: ${SOURCES.map((s) => s.id).join(", ")}`);
  }
  return found;
}

export function allSourceIds(): SourceId[] {
  return SOURCES.map((s) => s.id);
}
