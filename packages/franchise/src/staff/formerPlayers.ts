/**
 * ADR-094 §10 (build step 3b): former players come back as coaches and scouts.
 *
 * When a player retires, a few go into coaching (a young position coach on some team's staff) or
 * into scouting (a scout on some team's front office, from where a scouting director's chair is
 * filled). Who goes leans on what he is, never on his position: his awareness and discipline raise
 * both chances, and a long career raises the coaching one. The league has no leadership rating, so
 * none is read. Q14 b: his coaching and scouting ratings are drawn exactly as anyone's; Q15 b: hiring
 * never reads his playing record. So the counted shares (ADR-094 build record) are met only by how
 * many enter and how early; from there they climb like anyone else.
 *
 * Rates CHOSEN and tuned with `staff-check --gms`, which retires made-up players each year
 * (`standInRetirees`); a season walk passes the players who really retired (`fromPlayer`).
 */
import {
  attrId, createRng, getAttr, playerId, type PersonalityType, type PlayerId, type PlayerState, type StaffState, type Team,
} from "@ff/contracts";
import { makeCoach } from "./makeCoach.js";
import { frontOfficeIdFor, isFrontOfficeId, isCoachId } from "./frontOffice.js";
import { makeRatings } from "./ratings.js";
import { PERSONALITY_SHARES, STAFF_TUNING } from "./tables.js";
import { currentJob, isRetired, logistic, normal, weightedPick, type StaffWorld } from "./world.js";

/** What the staff's side reads of a retiring player. */
export interface Retiree {
  id: PlayerId;
  name: string;
  age: number;
  /** Credited seasons (ADR-085 K5): 0 = camp or practice squad only. */
  seasons: number;
  awareness: number;
  discipline: number;
}

export const FORMER_PLAYERS = {
  /** Log-odds of going into coaching at awareness and discipline 50 and no credited seasons. */
  coachBase: -5.2,
  /** ... and into scouting. */
  scoutBase: -4.9,
  /** Per rating point above 50, for both. */
  perAwareness: 0.03,
  perDiscipline: 0.02,
  /** Per credited season, up to `seasonsCap`, for coaching only. */
  perSeason: 0.3,
  seasonsCap: 10,
  /** Nobody starts on a staff past this age. */
  maxAge: 40,
  /** A scout is taken for a scouting director's chair only after this many seasons scouting. */
  scoutYears: 4,
};

export function fromPlayer(p: PlayerState): Retiree {
  return {
    id: p.bio.id, name: p.bio.displayName, age: p.bio.age, seasons: p.bio.creditedSeasons ?? 0,
    awareness: getAttr(p.attributes.values, attrId("awareness")), discipline: getAttr(p.attributes.values, attrId("discipline")),
  };
}

/** Where he goes: one draw per player, the same whenever he retires. */
export function retireeGoes(r: Retiree, seed: string): "COACH" | "SCOUT" | undefined {
  const t = FORMER_PLAYERS;
  if (r.age > t.maxAge) return undefined;
  const mind = t.perAwareness * (r.awareness - 50) + t.perDiscipline * (r.discipline - 50);
  const coach = logistic(t.coachBase + mind + t.perSeason * Math.min(r.seasons, t.seasonsCap));
  const scout = logistic(t.scoutBase + mind);
  const u = createRng(seed, `franchise:staff/former/${String(r.id)}`).next();
  if (u < coach) return "COACH";
  if (u < coach + scout) return "SCOUT";
  return undefined;
}

/** He has a job already, or was taken before (a player retires once, but a save may replay a day). */
const alreadyIn = (world: StaffWorld, id: PlayerId) => world.staff.some((s) => s.formerPlayer === id);

/**
 * Bring this day's retirees into the game. Pure: a new world when anyone comes in, the same world
 * otherwise. Each joins a team drawn by his own dice; a coach's side is drawn as any new coach's is.
 */
export function enterFormerPlayers(world: StaffWorld, retirees: readonly Retiree[], season: number, seed: string): StaffWorld {
  const going = retirees
    .map((r) => ({ r, goes: retireeGoes(r, seed) }))
    .filter((x): x is { r: Retiree; goes: "COACH" | "SCOUT" } => x.goes !== undefined && !alreadyIn(world, x.r.id));
  if (going.length === 0) return world;
  const next = structuredClone(world);
  const taken = new Set(next.staff.map((s) => s.displayName));
  let coaches = next.staff.filter((s) => isCoachId(s.id)).length;
  let office = next.staff.filter((s) => isFrontOfficeId(s.id)).length;
  for (const { r, goes } of going) {
    const rng = createRng(seed, `franchise:staff/former/join/${String(r.id)}`);
    const team = next.teams[rng.int(0, next.teams.length - 1)]!;
    taken.add(r.name);
    let s: StaffState;
    if (goes === "COACH") {
      const side = weightedPick(rng, STAFF_TUNING.newCoachSideShares);
      s = makeCoach(rng, coaches++, { kind: "NFL_POSITION", side, team, season }, taken);
      taken.delete(s.displayName);
      s = { ...s, displayName: r.name, age: r.age, formerPlayer: r.id };
    } else {
      s = makeScout(rng, office++, r, team, season);
    }
    next.staff.push(s);
  }
  return next;
}

/** A scout on a team's front office. */
function makeScout(rng: ReturnType<typeof createRng>, n: number, r: Retiree, team: Team, season: number): StaffState {
  const id = frontOfficeIdFor(n);
  return {
    id, displayName: r.name, role: "SCOUT", age: r.age, formerPlayer: r.id,
    attributes: makeRatings(rng, 0, String(id)), lineage: [],
    personalityType: weightedPick(rng, PERSONALITY_SHARES) as PersonalityType,
    career: [{ level: "NFL", role: "SCOUT", team: team.id, employer: team.displayName, firstSeason: season, seasons: [] }],
  };
}

/** A team's scouts who have done the job long enough for its scouting director's chair, best first by `score`. */
export function scoutsReady(world: StaffWorld, team: Team, season: number, score: (s: StaffState) => number): StaffState[] {
  return world.staff
    .filter((s) => {
      const job = currentJob(s);
      return !isRetired(s) && job?.role === "SCOUT" && job.team === team.id && season - job.firstSeason >= FORMER_PLAYERS.scoutYears;
    })
    .sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : 1));
}

/**
 * For the staff check, which plays no players: this year's made-up retirees. About 350 a year leave a
 * 32-team league (CHOSEN, about a fifth of 1,700 men); half never had a credited season, the rest's
 * careers run 1 to 15 seasons, shorter ones commoner; ages follow the career.
 */
export function standInRetirees(season: number, teamCount: number, seed: string): Retiree[] {
  const rng = createRng(seed, `franchise:staff/former/standin/${season}`);
  const n = Math.round(350 * teamCount / 32);
  const out: Retiree[] = [];
  for (let i = 0; i < n; i++) {
    const camp = rng.next() < 0.5;
    const seasons = camp ? 0 : Math.min(15, 1 + Math.floor(-Math.log(1 - rng.next()) * 3));
    const age = Math.round(22 + seasons + 1.5 * Math.abs(normal(rng)));
    out.push({
      id: playerId(`R${season}-${i}`), name: `Former ${season}-${i}`, age, seasons,
      awareness: Math.round(50 + 12 * normal(rng)), discipline: Math.round(50 + 12 * normal(rng)),
    });
  }
  return out;
}
