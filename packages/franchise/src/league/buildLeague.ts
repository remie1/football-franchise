/**
 * S2 — a fictional league (season shell plan; ADR-078 C2).
 *
 * No real names: the downstream world sees IDs and data only (Charter, anonymization
 * rule). Team ids are stable (`T01`..`Tnn`, in division order); the seed decides only
 * which city and nickname each id gets, so a league is fully determined by its seed.
 */
import {
  createRng, conferenceId, divisionId, teamId,
  DEFAULT_LEAGUE_RULES,
  type Rng, type LeagueRules, type LeagueStructure, type Conference, type Division, type Team,
} from "@ff/contracts";

export interface League {
  readonly seed: string;
  readonly structure: LeagueStructure;
  readonly teams: Team[];
}

const CONFERENCES = ["Atlantic", "Pacific"] as const;
const DIVISIONS = ["North", "South", "East", "West"] as const;

export const CITIES: readonly string[] = [
  "Harbor City", "Ironvale", "Redmont", "Bayport", "Stonebridge", "Clearwater", "Northgate", "Ashford",
  "Granite Falls", "Westhaven", "Silver Lake", "Oakridge", "Cedar Point", "Brookfield", "Lakeshore", "Fairhaven",
  "Pine Bluff", "Riverton", "Highland", "Kingsport", "Marlow", "Easton", "Summit Valley", "Copper Ridge",
  "Mesa Verde", "Port Royal", "Elmwood", "Crestview", "Thornbury", "Bridgewater", "Dunmore", "Hollow Creek",
];

export const NICKNAMES: readonly string[] = [
  "Anchors", "Foundry", "Comets", "Mariners", "Rams", "Otters", "Sentinels", "Hawks",
  "Miners", "Gales", "Lynx", "Timberwolves", "Herons", "Stallions", "Breakers", "Ospreys",
  "Rattlers", "Pilots", "Highlanders", "Monarchs", "Bison", "Express", "Peaks", "Coppers",
  "Scorpions", "Corsairs", "Owls", "Condors", "Thunder", "Barons", "Wolverines", "Hornets",
];

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Two conferences of four divisions, `teamCount / 8` teams each (4 under the default rules). */
export function buildLeague(seed: string, rules: LeagueRules = DEFAULT_LEAGUE_RULES): League {
  const divisionCount = CONFERENCES.length * DIVISIONS.length;
  if (rules.teamCount % divisionCount !== 0 || rules.teamCount > CITIES.length) {
    throw new Error(`buildLeague: teamCount ${rules.teamCount} must be a multiple of ${divisionCount} and at most ${CITIES.length}`);
  }
  const perDivision = rules.teamCount / divisionCount;
  const rng = createRng(seed, "franchise:league");
  const cities = shuffled(CITIES, rng.fork("cities"));
  const nicknames = shuffled(NICKNAMES, rng.fork("nicknames"));

  const conferences: Conference[] = [];
  const divisions: Division[] = [];
  const teams: Team[] = [];
  let n = 0;
  for (const c of CONFERENCES) {
    const cid = conferenceId(c.toUpperCase());
    const conf: Conference = { id: cid, name: `${c} Conference`, divisions: [] };
    for (const d of DIVISIONS) {
      const did = divisionId(`${c.toUpperCase()}-${d.toUpperCase()}`);
      const div: Division = { id: did, name: `${c} ${d}`, conference: cid, teams: [] };
      for (let k = 0; k < perDivision; k++) {
        const id = teamId(`T${String(n + 1).padStart(2, "0")}`);
        teams.push({
          id,
          city: cities[n]!,
          displayName: `${cities[n]!} ${nicknames[n]!}`,
          roster: [],
          staff: [],
          depthChart: {},
          capState: { capLimit: rules.salaryCap, committed: 0, deadMoney: 0 },
          staffBudget: { limit: 0, committed: 0 },
        });
        div.teams.push(id);
        n++;
      }
      conf.divisions.push(did);
      divisions.push(div);
    }
    conferences.push(conf);
  }
  return { seed, structure: { conferences, divisions }, teams };
}
