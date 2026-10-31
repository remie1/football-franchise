import { describe, it, expect } from "vitest";
import { compareStamps, stampToString, type CalendarStamp, type PlayerContract, type PlayerState, type Position, type Team } from "@ff/contracts";
import { runSeason, type DayStep } from "../src/index.js";
import { WANTED } from "../src/draft/board.js";
import { PLAYER_STEP_PREFIX } from "../src/players/steps.js";
import { POSITIONS, SEASON, league, makeClass, rate, resolve, startingPeople } from "./playersWorld.js";

// ADR-087 §11 with ADR-086: the players' steps and the draft in one walk, two seasons back to back, on the
// players' steps' league (`playersWorld.ts`). The first season's cut-down day cuts nobody (every team is a
// 53), so its squads are empty; the second season's cut-down fills them, and its call-ups come from them.
// Only what the call-ups own is checked here: the draft's own year turn and cut-down are its thread's.

/** A team wants its 53's shape fit: the first position with fewer fit men listed there than `WANTED`. */
const unfilled = (t: Team, available: ReadonlySet<string>, players: ReadonlyMap<string, PlayerState>): Position | undefined => {
  const fit = new Map<Position, number>();
  for (const id of t.roster) {
    if (!available.has(String(id))) continue;
    const at = players.get(String(id))!.bio.position;
    fit.set(at, (fit.get(at) ?? 0) + 1);
  }
  return POSITIONS.find((pos) => (fit.get(pos) ?? 0) < WANTED[pos]);
};

const base = { league, seed: league.seed, resolve, through: "YEAR" as const, players: { injuries: true, unfilled }, draft: { rate, makeClass } };
const cutdown: CalendarStamp = { season: SEASON + 1, phase: "PRESEASON", week: 3, day: 2 };
/**
 * The second season's offseason's first day. Its morning sees the book as the season's games left it:
 * every call-up is in by then (the players' steps sign only for a team with a regular-season or playoff
 * week to play), and the year turn has not yet come.
 */
const offseason: CalendarStamp = { season: SEASON + 1, phase: "OFF_EVAL", week: 1, day: 1 };

/**
 * Watches the second season from the day after cut-down on, before each day's other steps (so it sees
 * every day's call-ups the next morning), and notes each break of who-is-where. On the offseason's
 * first morning it also keeps the contract book as it stands (`afterGames`). It changes nothing.
 */
const broken: string[] = [];
let watched = 0;
let afterGames: readonly PlayerContract[] | undefined;
const watch: DayStep = {
  id: "watch",
  run: (people, ctx) => {
    if (compareStamps(ctx.day, cutdown) <= 0) return undefined;
    watched++;
    if (compareStamps(ctx.day, offseason) === 0) afterGames = people.contracts ?? [];
    for (const t of people.teams) {
      const roster = new Set(t.roster.map(String));
      for (const id of t.practiceSquad ?? []) if (roster.has(String(id))) broken.push(`${stampToString(ctx.day)} ${String(t.id)}: ${String(id)} on its roster and squad`);
      for (const [pos, ids] of Object.entries(t.depthChart)) {
        for (const id of ids ?? []) if (!roster.has(String(id))) broken.push(`${stampToString(ctx.day)} ${String(t.id)}: ${String(id)} on the ${pos} chart, not the roster`);
      }
    }
    return undefined;
  },
};

const one = runSeason({ ...base, season: SEASON, people: startingPeople() });
const two = runSeason({ ...base, season: SEASON + 1, people: one.people!, daySteps: [watch] });

/** A season's players' signings, in stream order. */
const signings = (r: typeof one) => r.stepEvents!
  .filter((e) => e.step.startsWith(PLAYER_STEP_PREFIX) && e.envelope.event.type === "CONTRACT_SIGNED")
  .map((e) => ({ at: e.envelope.at, ...(e.envelope.event.payload as { player: string; team: string }) }));
/** Who cut-down day put on which team's practice squad: its practice-squad deals. */
const squadAtCutdown = (r: typeof one) => new Map(r.stepEvents!
  .filter((e) => e.step === "cutdown" && e.envelope.event.type === "CONTRACT_SIGNED" && (e.envelope.event.payload as { kind?: string }).kind === "PRACTICE_SQUAD")
  .map((e) => { const p = e.envelope.event.payload as { player: string; team: string }; return [String(p.player), String(p.team)] as const; }));

describe("the players' call-ups in a league with the draft, two seasons (ADR-087 §11, ADR-086)", () => {
  const squads = squadAtCutdown(two);
  const calledUp = signings(two).filter((s) => squads.has(String(s.player)));

  it("has no squads in the first season, so it signs off the street; the second season's cut-down fills them", () => {
    expect(squadAtCutdown(one).size).toBe(0);
    const street = new Set(startingPeople().freeAgents.map(String));
    expect(signings(one).length).toBeGreaterThan(0);
    for (const s of signings(one)) expect(street.has(String(s.player)), String(s.player)).toBe(true);
    expect(squads.size).toBeGreaterThan(32 * 5);
  });

  it("calls up the second season's men from the signing team's own cut-down squad, each man once", () => {
    expect(calledUp.length).toBeGreaterThan(32);
    for (const s of calledUp) {
      expect(squads.get(String(s.player)), `${String(s.player)} called up by ${String(s.team)}`).toBe(String(s.team));
      expect(compareStamps(s.at, cutdown)).toBeGreaterThan(0);
    }
    expect(new Set(calledUp.map((s) => String(s.player))).size).toBe(calledUp.length);
    // Nobody came off another team's squad (above); the rest, on no squad, came off the street: once the
    // team's squad ran short, or a specialist (K, P, LS) off the street before a squad man of another trade.
    expect(signings(two).length).toBeGreaterThan(calledUp.length);
  });

  it("keeps nobody on both a roster and a practice squad, and every depth-chart entry on its roster, every day after cut-down", () => {
    expect(watched).toBeGreaterThan(200);
    expect(broken).toEqual([]);
  });

  it("ends each called-up man's practice-squad deal with that team on his call-up day, EXPIRED, beside a one-year minimum with it live through the season's games", () => {
    // The book as the games left it, not `two.people`'s: that is after the year turn, and his minimum
    // covers this season only, so ending it once the season is over is the turn's to do, not the call-up's.
    expect(afterGames).toBeDefined();
    const book = afterGames!;
    for (const s of calledUp) {
      const his = book.filter((c) => String(c.player) === String(s.player) && String(c.team) === String(s.team));
      const squad = his.filter((c) => c.kind === "PRACTICE_SQUAD");
      expect(squad, String(s.player)).toHaveLength(1);
      expect(squad[0]!.ended).toEqual({ at: s.at, reason: "EXPIRED" });
      const minimum = his.filter((c) => c.kind === "MINIMUM" && compareStamps(c.signedAt, s.at) === 0);
      expect(minimum, String(s.player)).toHaveLength(1);
      expect(minimum[0]!.years.map((y) => y.season)).toEqual([SEASON + 1]);
      expect(minimum[0]!.ended).toBeUndefined();
    }
  });

  it("is the same two seasons for the same seed, call-ups and all", () => {
    const again = runSeason({ ...base, season: SEASON, people: startingPeople() });
    expect(JSON.stringify(again.events)).toBe(JSON.stringify(one.events));
    // The watcher changes nothing: the second season again, unwatched, is the same stream.
    const twoAgain = runSeason({ ...base, season: SEASON + 1, people: again.people! });
    expect(JSON.stringify(twoAgain.events)).toBe(JSON.stringify(two.events));
  });
});
