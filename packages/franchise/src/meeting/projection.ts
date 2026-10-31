/**
 * ADR-081 M1: next season and the one after, the truth side of points 3, 4, 6, 7 and 9.
 *
 * A player's expected change in position overall over a year, by age, is MEASURED: ADR-087 D5a's
 * starters, `development` arm, 20 generated seasons (calibration `reports/player-checks.md`, "How far
 * players move in a year"). Before 29 the gain is scaled by his own growth rate (1 = typical); from
 * 29 on, aging takes the same from everyone (CHOSEN reading of the model: growth drives learning,
 * not decline).
 *
 * The projected team keeps everyone under contract next season. A player whose deal ends after this
 * season is "who we lose" (point 5): the projection drops him and the next man up starts. Rookies to
 * come and free agents to sign are not in it; the meeting is about the team as it stands.
 */
import { positionOverall, type PlayerContract, type PlayerState, type Team } from "@ff/contracts";
import { teamStrength, type MeetingGroup, type TeamStrength } from "./strength.js";

/** [first age of the band, mean change a year]: ADR-087 D5a, starters, development arm (MEASURED). */
export const YEARLY_CHANGE: readonly (readonly [number, number])[] = [
  [0, 3.36], [23, 2.12], [25, 1.24], [27, 0.73], [29, 0.05], [31, -0.87], [33, -1.74],
];
/** From this age the change is aging alone, the same for every growth rate. */
export const AGING_FROM = 29;

/** The expected change in a player's overall over the next year at `age`. */
export function expectedChange(age: number, growth: number = 1): number {
  let change = YEARLY_CHANGE[0]![1];
  for (const [from, c] of YEARLY_CHANGE) if (age >= from) change = c;
  return age < AGING_FROM ? change * growth : change;
}

/** A copy of the player a year on: one year older, every rating moved by his expected change. */
export function projectPlayer(p: PlayerState, years: number = 1): PlayerState {
  let values = { ...p.attributes.values };
  let age = p.bio.age;
  const growth = p.attributes.development?.growth ?? 1;
  for (let y = 0; y < years; y++) {
    const d = expectedChange(age, growth);
    values = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === undefined ? v : Math.max(0, Math.min(99, v + d))]));
    age++;
  }
  return { ...p, bio: { ...p.bio, age }, attributes: { ...p.attributes, values } };
}

/** The last season a contract pays for (its void years left out); -Infinity if it has none. */
export function lastSeasonOf(c: PlayerContract): number {
  return Math.max(-Infinity, ...c.years.filter((y) => !y.voidYear).map((y) => y.season));
}

export interface TeamProjection {
  /** Strength now, next season, and the season after. */
  now: TeamStrength;
  next: TeamStrength;
  after: TeamStrength;
  /** Rostered players whose deals end after this season (point 5), and after next (point 8). */
  expiring: PlayerState[];
  expiringNext: PlayerState[];
  /** Each rostered player's expected overall change next year at his position (points 4 and 7). */
  change: { player: PlayerState; now: number; next: number }[];
}

/**
 * A team now and as it would stand in a year and in two, with no one added. `season` is the season
 * just played.
 */
export function projectTeam(team: Team, players: readonly PlayerState[], contracts: readonly PlayerContract[], season: number): TeamProjection {
  const byId = new Map(players.map((p) => [String(p.bio.id), p]));
  const lastSeason = new Map<string, number>();
  for (const c of contracts) {
    if (c.ended || String(c.team) !== String(team.id)) continue;
    lastSeason.set(String(c.player), Math.max(lastSeason.get(String(c.player)) ?? -Infinity, lastSeasonOf(c)));
  }
  const ends = (id: string) => lastSeason.get(id) ?? season; // no live deal: he is gone too
  const roster = team.roster.map((id) => byId.get(String(id))).filter((p): p is PlayerState => p !== undefined);
  const expiring = roster.filter((p) => ends(String(p.bio.id)) <= season);
  const expiringNext = roster.filter((p) => ends(String(p.bio.id)) === season + 1);

  const yearOn = (years: number): TeamStrength => {
    const keep = (id: string) => ends(id) >= season + years;
    const m = new Map<string, PlayerState>();
    for (const p of roster) if (keep(String(p.bio.id))) m.set(String(p.bio.id), projectPlayer(p, years));
    const kept = { ...team, roster: team.roster.filter((id) => m.has(String(id))) };
    return teamStrength(kept, m);
  };

  const change = roster.map((p) => {
    const now = positionOverall(p.bio.position, p.attributes.values);
    return { player: p, now, next: positionOverall(p.bio.position, projectPlayer(p).attributes.values) };
  });
  return { now: teamStrength(team, byId), next: yearOn(1), after: yearOn(2), expiring, expiringNext, change };
}

/** The groups ranked weakest first by level (the biggest holes, point 3). */
export function weakestGroups(s: Pick<TeamStrength, "groups">): MeetingGroup[] {
  return (Object.entries(s.groups) as [MeetingGroup, number][])
    .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
    .map(([g]) => g);
}
