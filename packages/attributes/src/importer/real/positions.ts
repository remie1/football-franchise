/**
 * Real teams and positions → the game's (ADR-088 R2).
 *
 * Teams: each real team takes the slot of its real division in `buildLeague`'s order (Atlantic
 * North, South, East, West, then Pacific; four teams each, `T01`..`T32`), so rivals and the
 * schedule's shape stay real. Which name each team shows is ADR-088 Q9.
 *
 * Positions: nflverse's roster file already says DE / DT / NT / OLB / ILB / MLB / CB / FS / SS;
 * it lumps tackles (T) and guards (G), which take their side from ESPN's depth chart.
 */
import type { Position } from "@ff/contracts";

/** nflverse team codes in `buildLeague` slot order. */
export const REAL_TEAM_SLOTS: readonly string[] = [
  "BAL", "CIN", "CLE", "PIT", // AFC North -> Atlantic North, T01-T04
  "HOU", "IND", "JAX", "TEN", // AFC South -> Atlantic South
  "BUF", "MIA", "NE", "NYJ", // AFC East -> Atlantic East
  "DEN", "KC", "LAC", "LV", // AFC West -> Atlantic West
  "CHI", "DET", "GB", "MIN", // NFC North -> Pacific North
  "ATL", "CAR", "NO", "TB", // NFC South -> Pacific South
  "DAL", "NYG", "PHI", "WAS", // NFC East -> Pacific East
  "ARI", "LA", "SEA", "SF", // NFC West -> Pacific West
];

/** ESPN depth-chart slots → the game's position. */
export const ESPN_SLOT: Readonly<Record<string, Position>> = {
  QB: "QB", RB: "RB", FB: "FB", WR: "WR", TE: "TE",
  LT: "LT", LG: "LG", C: "C", RG: "RG", RT: "RT",
  LDE: "DE", RDE: "DE", LDT: "DT", RDT: "DT", NT: "NT",
  WLB: "OLB", SLB: "OLB", MLB: "MLB", LILB: "ILB", RILB: "ILB",
  LCB: "CB", RCB: "CB", NB: "CB", SS: "SS", FS: "FS",
  PK: "K", P: "P", LS: "LS",
};

const DIRECT: Readonly<Record<string, Position>> = {
  QB: "QB", RB: "RB", FB: "FB", WR: "WR", TE: "TE", C: "C",
  DE: "DE", DT: "DT", NT: "NT", OLB: "OLB", ILB: "ILB", MLB: "MLB",
  CB: "CB", FS: "FS", SS: "SS", S: "SS", K: "K", P: "P", LS: "LS",
};

/** When the roster file gives only the group. */
const BY_GROUP: Readonly<Record<string, Position>> = {
  QB: "QB", RB: "RB", WR: "WR", TE: "TE", OL: "LG", DL: "DT", LB: "OLB", DB: "CB", K: "K", P: "P", LS: "LS",
};

/**
 * One player's game position. `espn` is the set of the game positions ESPN lists him at;
 * `sideCount` tallies left/right linemen already placed on his team, so unlisted tackles and
 * guards split evenly.
 */
export function gamePosition(
  depthChartPosition: string | null,
  group: string | null,
  espn: ReadonlySet<Position>,
  sideCount: Record<string, number>,
): Position {
  const d = depthChartPosition ?? "";
  if (d === "T" || d === "G") {
    const [left, right] = d === "T" ? (["LT", "RT"] as const) : (["LG", "RG"] as const);
    const side = espn.has(left) ? left : espn.has(right) ? right : (sideCount[left] ?? 0) <= (sideCount[right] ?? 0) ? left : right;
    sideCount[side] = (sideCount[side] ?? 0) + 1;
    return side;
  }
  const direct = DIRECT[d];
  if (direct !== undefined) return direct;
  const fallback = BY_GROUP[group ?? ""];
  if (fallback === undefined) throw new Error(`gamePosition: no game position for "${d}" / "${group}"`);
  return fallback;
}

/**
 * Each slot's shown identity (ADR-088 Q9, recommended a: the real city or region, a made-up
 * nickname). Nicknames avoid every real NFL nickname.
 */
export const REAL_CITY: readonly string[] = [
  "Baltimore", "Cincinnati", "Cleveland", "Pittsburgh",
  "Houston", "Indianapolis", "Jacksonville", "Tennessee",
  "Buffalo", "Miami", "New England", "New York",
  "Denver", "Kansas City", "Los Angeles", "Las Vegas",
  "Chicago", "Detroit", "Green Bay", "Minnesota",
  "Atlanta", "Carolina", "New Orleans", "Tampa Bay",
  "Dallas", "New York", "Philadelphia", "Washington",
  "Arizona", "Los Angeles", "Seattle", "San Francisco",
];

export const STANDIN_NICKNAME: readonly string[] = [
  "Ironclads", "Riverboats", "Foundry", "Inclines",
  "Comets", "Racers", "Tarpons", "Sound",
  "Blizzard", "Surf", "Harbormen", "Skyliners",
  "Summit", "Monarchs", "Breakers", "High Rollers",
  "Gales", "Motors", "Frost", "Loons",
  "Firebirds", "Rapids", "Krewe", "Corsairs",
  "Wranglers", "Empire", "Founders", "Sentinels",
  "Scorpions", "Stars", "Squall", "Prospectors",
];
