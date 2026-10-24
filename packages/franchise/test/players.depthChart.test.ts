import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, createRng, playerId, staffId, stampToString, teamId,
  type AttributeMap, type CalendarPhase, type CalendarStamp, type FranchiseEvent, type GameParticipation, type Injury,
  type PersonalityType, type PlayerState, type Position, type StaffRole, type StaffState, type Team,
} from "@ff/contracts";
import { phaseWeeks } from "../src/calendar/clock.js";
import { STARTERS, WANTED } from "../src/draft/board.js";
import { depthChartWeek, type DepthWeekInput, type DepthWeekResult } from "../src/players/depthChart.js";
import type { Lineup } from "../src/players/lineup.js";
import { emptyMemory, type PlayerMemory } from "../src/players/types.js";

// ADR-087 §3.1 (D4a): the weekly depth chart by each head coach's style, its labels (E5) and morale.

const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const RULES = DEFAULT_LEAGUE_RULES;
const SEASON = 2026;

function player(id: string, position: Position, rating: number, o: { age?: number; seasons?: number; volatility?: number; team?: string } = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, rating]));
  values["volatility"] = o.volatility ?? 50;
  return {
    bio: { id: playerId(id), displayName: id, position, age: o.age ?? 26, heightIn: 74, weightLb: 220, draft: "UDFA", creditedSeasons: o.seasons ?? 3 },
    attributes: { kind: "true", values, traits: new Set() },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    teamId: teamId(o.team ?? "T1"),
  };
}
const withRating = (p: PlayerState, rating: number): PlayerState => {
  const values: AttributeMap = { ...p.attributes.values };
  for (const a of ACTIVE) if (a !== "volatility") values[a] = rating;
  return { ...p, attributes: { ...p.attributes, values } };
};
function team(id: string, players: readonly PlayerState[]): Team {
  const depthChart: Team["depthChart"] = {};
  for (const p of players) (depthChart[p.bio.position] ??= []).push(p.bio.id);
  return { id: teamId(id), displayName: id, city: id, roster: players.map((p) => p.bio.id), staff: [], depthChart, capState: { capLimit: 0, committed: 0, deadMoney: 0 }, staffBudget: { limit: 0, committed: 0 } };
}
function staffFor(t: string, o: { lineup?: Lineup; type?: PersonalityType; te?: number } = {}): StaffState[] {
  return (["HEAD_COACH", "OC", "DC", "STC"] as const).map((role: StaffRole) => ({
    id: staffId(`S-${t}-${role}`), displayName: `${t} ${role}`, role, age: 50, attributes: { talentEvaluation: o.te ?? 50 }, lineage: [],
    personalityType: role === "HEAD_COACH" ? o.type ?? "quiet" : "quiet", teamId: teamId(t),
    career: [{ level: "NFL" as const, role, team: teamId(t), employer: t, firstSeason: 2020, seasons: [] }],
    ...(role === "HEAD_COACH" && o.lineup ? { lineup: o.lineup } : {}),
  }));
}
function yearWeeks(season: number, phases: readonly CalendarPhase[] = CALENDAR_PHASE_ORDER): CalendarStamp[] {
  return phases.flatMap((phase) => Array.from({ length: phaseWeeks(phase, RULES) }, (_, i) => ({ season, phase, week: i + 1, day: 7 })));
}
const FORM_COACH: Lineup = { incumbent: 10, veteran: 50, form: 95 };
const INCUMBENT_COACH: Lineup = { incumbent: 95, veteran: 50, form: 10 };

function rookieWeek(lineup: Lineup, seed: string): number {
  const vet = player("VET", "QB", 70, { age: 30, seasons: 8 });
  const kid = player("KID", "QB", 58, { age: 22, seasons: 0 });
  let teams = [team("T1", [vet, kid])];
  let players = [vet, kid];
  let memory = emptyMemory();
  const staff = staffFor("T1", { lineup, te: 100 });
  const weeks = yearWeeks(SEASON, ["TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON"]);
  for (const [i, at] of weeks.entries()) {
    players = players.map((p) => (p.bio.id === kid.bio.id ? withRating(p, 58 + i) : p));
    const r = depthChartWeek({ at, rules: RULES, seed, teams, players, staff, memory, reports: [] });
    teams = r.teams; players = r.players; memory = r.memory;
    if (teams[0]!.depthChart.QB![0] === kid.bio.id) return i;
  }
  return Infinity;
}

const at = (phase: CalendarPhase, week: number, season = SEASON): CalendarStamp => ({ season, phase, week, day: 7 });
const out = (weeks: number, since: CalendarStamp): Injury => ({ kind: "ankle", weeksRemaining: weeks, playable: false, setting: "GAME", band: weeks >= 4 ? "LONG" : "SHORT", since });
const hurt = (p: PlayerState, injury: Injury | undefined): PlayerState => {
  const { injury: _was, ...condition } = p.condition;
  return { ...p, condition: injury ? { ...condition, injury } : condition };
};
type PayloadOf<T extends FranchiseEvent["type"]> = Extract<FranchiseEvent, { type: T }>["payload"];
const ofType = <T extends FranchiseEvent["type"]>(events: readonly FranchiseEvent[], type: T): PayloadOf<T>[] =>
  events.filter((e) => e.type === type).map((e) => e.payload as PayloadOf<T>);
const moraleOf = (events: readonly FranchiseEvent[], id: string) => ofType(events, "MORALE_CHANGED").filter((m) => String(m.player) === id);
/** A report line: snaps on his side and one contest line. */
const line = (p: PlayerState, won: number, lost: number, snaps = 60): GameParticipation =>
  ({ player: p.bio.id, team: p.teamId!, snaps: { offense: snaps, defense: 0, special: 0 }, contests: [{ attr: "accuracy" as GameParticipation["contests"][number]["attr"], won, lost }] });

interface State { teams: Team[]; players: PlayerState[]; memory: PlayerMemory }
const run = (s: State, input: Partial<DepthWeekInput> & { at: CalendarStamp }): DepthWeekResult =>
  depthChartWeek({ rules: RULES, seed: "depth-test", reports: [], ...s, ...input });
const next = (r: DepthWeekResult): State => ({ teams: r.teams, players: r.players, memory: r.memory });

/** A starter whose job is on record (weeksInJob) at a week mid-season, with grades given. */
function midSeason(o: { lineup?: Lineup; type?: PersonalityType; starter?: number; challenger?: number; volatility?: number; game?: number[]; battle?: boolean }) {
  const a = player("A", "QB", o.starter ?? 62, { volatility: o.volatility ?? 50 });
  const b = player("B", "QB", o.challenger ?? 80);
  const memory: PlayerMemory = {
    ...emptyMemory(),
    weeksInJob: { "T1/QB/A": 7 },
    grades: { A: { game: o.game ?? [60, 62, 61, 63], practice: [a, a, a].map(() => o.starter ?? 62) }, B: { game: [], practice: [b, b, b].map(() => o.challenger ?? 80) } },
    ...(o.battle ? { battles: [{ team: teamId("T1"), position: "QB" as const, players: [a.bio.id, b.bio.id], declared: at("TRAINING_CAMP", 1) }] } : {}),
  };
  const state: State = { teams: [team("T1", [a, b])], players: [a, b], memory };
  const staff = staffFor("T1", { lineup: o.lineup ?? { incumbent: 50, veteran: 50, form: 50 }, type: o.type ?? "quiet", te: 100 });
  return { a, b, state, staff };
}

/** A league whose players drift (the young rise, the old fall), every team coached the same way, played through camp, preseason and the season. */
function league(lineup: Lineup, seed: string, o: { type?: PersonalityType; ownerTeam?: string; evenFor?: string } = {}) {
  const rng = createRng("league-fixture", "players");
  const players: PlayerState[] = [];
  const teams: Team[] = [];
  const staff: StaffState[] = [];
  for (let t = 1; t <= 6; t++) {
    const id = `T${t}`;
    const mine: PlayerState[] = [];
    for (const pos of Object.keys(WANTED) as Position[]) {
      for (let i = 0; i < WANTED[pos]; i++) {
        const age = 22 + rng.int(0, 10);
        mine.push(player(`${id}-${pos}-${i}`, pos, 72 - 4 * i + rng.int(-3, 3), { age, seasons: age - 22, team: id, volatility: rng.int(20, 80) }));
      }
    }
    players.push(...mine);
    teams.push(team(id, mine));
    staff.push(...(id === o.evenFor ? staffFor(id, { lineup: { incumbent: 50, veteran: 50, form: 50 }, type: "quiet" }) : staffFor(id, { lineup, type: o.type ?? "quiet" })));
  }
  let state: State = { teams, players, memory: emptyMemory() };
  const events: FranchiseEvent[] = [];
  const weeks = yearWeeks(SEASON, ["TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON"]);
  for (const stamp of weeks) {
    const drift = (p: PlayerState) => {
      const r = createRng("drift", `${stampToString(stamp)}/${String(p.bio.id)}`);
      return withRating(p, p.attributes.values["accuracy"]! + (p.bio.age <= 25 ? 0.4 : p.bio.age >= 30 ? -0.4 : 0) + (r.next() - 0.5));
    };
    state = { ...state, players: state.players.map(drift) };
    const reports: GameParticipation[] = [];
    if (stamp.phase === "REGULAR_SEASON") {
      for (const tm of state.teams) {
        for (const [pos, ids] of Object.entries(tm.depthChart) as [Position, Team["roster"]][]) {
          for (const pid of ids.slice(0, Math.max(1, STARTERS[pos]))) {
            const p = state.players.find((x) => x.bio.id === pid)!;
            const r = createRng("contests", `${stampToString(stamp)}/${String(pid)}`);
            const chance = 0.5 + (p.attributes.values["accuracy"]! - 65) / 100;
            let won = 0;
            for (let k = 0; k < 10; k++) if (r.next() < chance) won++;
            reports.push(line(p, won, 10 - won));
          }
        }
      }
    }
    const r = run(state, { at: stamp, staff, reports, seed, ...(o.ownerTeam ? { ownerTeam: teamId(o.ownerTeam) } : {}) });
    events.push(...r.events);
    state = next(r);
  }
  return { state, events };
}
const startersOf = (s: State) => s.teams.flatMap((t) => (Object.entries(t.depthChart) as [Position, Team["roster"]][]).flatMap(([pos, ids]) => ids.slice(0, STARTERS[pos]).map(String)));

describe("depthChartWeek (ADR-087 §3.1)", () => {
  it("is the same chart and events for the same seed, and the inputs are left untouched", () => {
    const a = league(FORM_COACH, "same-seed");
    const b = league(FORM_COACH, "same-seed");
    expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events));
    expect(JSON.stringify(b.state)).toBe(JSON.stringify(a.state));
    const c = league(FORM_COACH, "other-seed");
    expect(JSON.stringify(c.events)).not.toBe(JSON.stringify(a.events));

    const { state, staff } = midSeason({});
    const before = JSON.stringify(state);
    run(state, { at: at("REGULAR_SEASON", 8), staff });
    expect(JSON.stringify(state)).toBe(before);
  });

  it("lets an improving rookie win the job sooner under a form coach than under an incumbent coach", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ form: rookieWeek(FORM_COACH, `s${i}`), incumbent: rookieWeek(INCUMBENT_COACH, `s${i}`) }));
    console.log("week the rookie first starts (form coach, incumbent coach):", rows.map((r) => `${r.form}/${r.incumbent}`).join(" "));
    for (const r of rows) {
      expect(r.form).toBeLessThan(Infinity);
      expect(r.form).toBeLessThanOrEqual(r.incumbent);
    }
    const mean = (k: "form" | "incumbent") => rows.reduce((s, r) => s + r[k], 0) / rows.length;
    expect(mean("incumbent") - mean("form")).toBeGreaterThan(2);
  });

  it("moves an injured starter's backup up with INJURY_COVER, no morale hit for the starter, and leaves him off the chart", () => {
    const { a, b, state, staff } = midSeason({ starter: 75, challenger: 65 });
    const week = at("REGULAR_SEASON", 3);
    const r = run({ ...state, players: [hurt(a, out(3, week)), b] }, { at: week, staff });
    expect(r.teams[0]!.depthChart.QB).toEqual([b.bio.id]);
    expect(ofType(r.events, "DEPTH_CHART_CHANGED")).toEqual([{ team: teamId("T1"), position: "QB", up: b.bio.id, down: a.bio.id, situation: "INJURY_COVER", authority: "COACH", decidedBy: "NPC" }]);
    expect(moraleOf(r.events, "A")).toEqual([]);
    expect(moraleOf(r.events, "B")).toEqual([{ player: b.bio.id, delta: 2, reason: "INJURY_COVER" }]);
    expect(r.memory.injuredStarters).toEqual([{ team: teamId("T1"), position: "QB", player: a.bio.id, cover: b.bio.id, since: week }]);
    expect(r.memory.weeksInJob).toEqual({ "T1/QB/B": 1 });
  });

  it("moves up whoever can fill a hurt starter's place later as his cover, when nobody could at first", () => {
    const k = player("K1", "K", 70);
    const staff = staffFor("T1", { te: 100 });
    const week = at("REGULAR_SEASON", 4);
    const s: State = { teams: [team("T1", [k])], players: [hurt(k, out(3, week))], memory: { ...emptyMemory(), weeksInJob: { "T1/K/K1": 3 } } };
    const alone = run(s, { at: week, staff });
    expect(alone.teams[0]!.depthChart.K).toEqual([]);
    expect(alone.events).toEqual([]);
    expect(alone.memory.weeksInJob).toEqual({ "T1/K/K1": 3 });
    // An emergency kicker is signed and listed after the step; the next week he is the cover.
    const fill = player("K2", "K", 55);
    const signed: State = { ...next(alone), teams: [{ ...alone.teams[0]!, roster: [k.bio.id, fill.bio.id], depthChart: { K: [fill.bio.id] } }], players: [...alone.players, fill] };
    const covered = run(signed, { at: at("REGULAR_SEASON", 5), staff });
    expect(ofType(covered.events, "DEPTH_CHART_CHANGED").map((e) => [e.situation, e.up, e.down])).toEqual([["INJURY_COVER", fill.bio.id, k.bio.id]]);
    const healed = { ...next(covered), players: next(covered).players.map((p) => hurt(p, undefined)) };
    const back = run(healed, { at: at("REGULAR_SEASON", 8), staff });
    expect(ofType(back.events, "DEPTH_CHART_CHANGED").map((e) => [e.situation, e.up, e.down])).toEqual([["STARTER_RETURNS", k.bio.id, fill.bio.id]]);
    expect(back.teams[0]!.depthChart.K).toEqual([k.bio.id, fill.bio.id]);
  });

  it("keeps a player who plays hurt (day to day) on the chart, and leaves every player who is out off it", () => {
    const qb = player("Q1", "QB", 70), qb2 = player("Q2", "QB", 60), wr = player("W1", "WR", 70), wr2 = player("W2", "WR", 65);
    const week = at("REGULAR_SEASON", 5);
    const dayToDay: Injury = { kind: "hand", weeksRemaining: 0, playable: true, setting: "GAME", band: "DAY_TO_DAY", since: week };
    const players = [hurt(qb, dayToDay), qb2, hurt(wr, out(6, week)), hurt(wr2, out(1, week))];
    const r = run({ teams: [team("T1", [qb, qb2, wr, wr2])], players, memory: emptyMemory() }, { at: week, staff: staffFor("T1") });
    expect(r.teams[0]!.depthChart.QB).toEqual([qb.bio.id, qb2.bio.id]);
    expect(r.teams[0]!.depthChart.WR).toEqual([]);
  });

  it("gives the healthy starter his job back (STARTER_RETURNS) or lets the backup keep it (KEPT_AFTER_INJURY), labelled once", () => {
    const hurtWeek = at("REGULAR_SEASON", 3);
    const backWeek = at("REGULAR_SEASON", 6);
    const runBack = (lineup: Lineup, backupRating: number) => {
      const { a, b, state, staff } = midSeason({ starter: 72, challenger: 66, lineup });
      let s = next(run({ ...state, players: [hurt(a, out(3, hurtWeek)), b] }, { at: hurtWeek, staff }));
      s = { ...s, players: s.players.map((p) => (p.bio.id === b.bio.id ? withRating(p, backupRating) : hurt(p, undefined))) };
      const back = run(s, { at: backWeek, staff, reports: [line(s.players[1]!, 9, 1)] });
      const after = run(next(back), { at: at("REGULAR_SEASON", 7), staff });
      return { a, b, back, after };
    };

    const restored = runBack(INCUMBENT_COACH, 68);
    expect(restored.back.teams[0]!.depthChart.QB).toEqual([restored.a.bio.id, restored.b.bio.id]);
    expect(ofType(restored.back.events, "DEPTH_CHART_CHANGED").map((e) => [e.situation, e.up, e.down])).toEqual([["STARTER_RETURNS", restored.a.bio.id, restored.b.bio.id]]);
    expect(moraleOf(restored.back.events, "B")).toEqual([{ player: restored.b.bio.id, delta: -1, reason: "STARTER_RETURNS" }]);
    expect(restored.back.memory.injuredStarters).toEqual([]);

    const kept = runBack(FORM_COACH, 82);
    expect(kept.back.teams[0]!.depthChart.QB).toEqual([kept.b.bio.id, kept.a.bio.id]);
    expect(ofType(kept.back.events, "DEPTH_CHART_CHANGED").map((e) => [e.situation, e.up, e.down])).toEqual([["KEPT_AFTER_INJURY", kept.b.bio.id, kept.a.bio.id]]);
    expect(moraleOf(kept.back.events, "A")).toEqual([{ player: kept.a.bio.id, delta: -4, reason: "KEPT_AFTER_INJURY" }]);
    // Emitted once: the next week nothing is said about it.
    expect(ofType(kept.after.events, "DEPTH_CHART_CHANGED")).toEqual([]);
    expect(kept.after.teams[0]!.depthChart.QB).toEqual([kept.b.bio.id, kept.a.bio.id]);
  });

  it("calls a mid-season benching of a healthy, in-form starter SUDDEN, and it hurts more than one for FORM", () => {
    const week = at("REGULAR_SEASON", 8);
    const sudden = midSeason({});
    const s = run(sudden.state, { at: week, staff: sudden.staff, reports: [line(sudden.a, 6, 4)] });
    expect(s.teams[0]!.depthChart.QB).toEqual([sudden.b.bio.id, sudden.a.bio.id]);
    expect(ofType(s.events, "DEPTH_CHART_CHANGED").map((e) => e.situation)).toEqual(["SUDDEN"]);

    const slumping = midSeason({ game: [70, 68, 45, 40] });
    const f = run(slumping.state, { at: week, staff: slumping.staff, reports: [line(slumping.a, 2, 8)] });
    expect(ofType(f.events, "DEPTH_CHART_CHANGED").map((e) => e.situation)).toEqual(["FORM"]);

    const hit = (r: DepthWeekResult) => moraleOf(r.events, "A")[0]!.delta;
    expect(hit(s)).toBe(-10);
    expect(hit(f)).toBe(-5);
    expect(hit(s)).toBeLessThan(hit(f));
    expect(s.players[0]!.condition.morale).toBe(-10);
    expect(moraleOf(s.events, "B")).toEqual([{ player: sudden.b.bio.id, delta: 2, reason: "SUDDEN" }]);

    // In a declared battle the same change is open competition, and hurts least.
    const battle = midSeason({ battle: true, lineup: FORM_COACH });
    const o = run(battle.state, { at: week, staff: battle.staff, reports: [line(battle.a, 6, 4)] });
    expect(ofType(o.events, "DEPTH_CHART_CHANGED").map((e) => e.situation)).toEqual(["OPEN_COMPETITION"]);
    expect(hit(o)).toBe(-2);
  });

  it("scales every morale move by the player's volatility", () => {
    const week = at("REGULAR_SEASON", 8);
    const delta = (volatility: number) => {
      const m = midSeason({ volatility });
      return moraleOf(run(m.state, { at: week, staff: m.staff }).events, "A")[0]!.delta;
    };
    expect(delta(0)).toBe(-5);
    expect(delta(50)).toBe(-10);
    expect(delta(100)).toBe(-15);
  });

  it("uses even leanings for the owner's team, decided by the computer", () => {
    // A form coach would open every spot at camp; on the owner's team he has the middle leanings.
    const players = [player("Q1", "QB", 75), player("Q2", "QB", 60), player("W1", "WR", 75), player("W2", "WR", 74), player("W3", "WR", 73), player("W4", "WR", 60)];
    const s: State = { teams: [team("T1", players)], players, memory: emptyMemory() };
    const staff = staffFor("T1", { lineup: FORM_COACH, type: "cerebral", te: 100 });
    const camp = at("TRAINING_CAMP", 1);
    const coached = run(s, { at: camp, staff });
    expect(ofType(coached.events, "POSITION_BATTLE_DECLARED").map((b) => b.position)).toEqual(["QB", "WR"]);
    const owners = run(s, { at: camp, staff, ownerTeam: teamId("T1") });
    expect(ofType(owners.events, "POSITION_BATTLE_DECLARED")).toEqual([]);
    expect(owners.memory.battles).toEqual([]);
    // Week by week, the owner's team is exactly a team whose head coach has the middle leanings and no quick hook.
    const ownerRun = league(FORM_COACH, "owner", { type: "fiery", ownerTeam: "T1" });
    const evenRun = league(FORM_COACH, "owner", { type: "fiery", evenFor: "T1" });
    expect(JSON.stringify(ownerRun.state)).toBe(JSON.stringify(evenRun.state));
    expect(JSON.stringify(ownerRun.events)).toBe(JSON.stringify(evenRun.events));
    for (const e of [...coached.events, ...owners.events, ...ownerRun.events]) if ("decidedBy" in e.payload) expect(e.payload.decidedBy).toBe("NPC");
  });

  it("gives a league of incumbent coaches and a league of form coaches different starters", () => {
    const steady = league(INCUMBENT_COACH, "two-leagues");
    const chasing = league(FORM_COACH, "two-leagues");
    const a = startersOf(steady.state), b = startersOf(chasing.state);
    const differ = a.filter((id, i) => id !== b[i]).length;
    const changes = (events: readonly FranchiseEvent[]) => ofType(events, "DEPTH_CHART_CHANGED").length;
    console.log(`starter slots that differ: ${differ} of ${a.length}; chart changes: incumbent coaches ${changes(steady.events)}, form coaches ${changes(chasing.events)}`);
    expect(differ).toBeGreaterThan(a.length * 0.05);
    expect(changes(chasing.events)).toBeGreaterThan(changes(steady.events));
  });
});

describe("open competition", () => {
  const players = [player("Q1", "QB", 70), player("Q2", "QB", 69.5), player("R1", "RB", 75), player("R2", "RB", 60)];
  const fresh = (): State => ({ teams: [team("T1", players)], players, memory: emptyMemory() });
  const walk = (lineup: Lineup, phases: readonly CalendarPhase[], seasons = [SEASON]) => {
    const staff = staffFor("T1", { lineup, te: 100 });
    let s = fresh();
    const events: { at: string; event: FranchiseEvent }[] = [];
    for (const season of seasons) {
      for (const stamp of yearWeeks(season, phases)) {
        const r = run(s, { at: stamp, staff });
        events.push(...r.events.map((event) => ({ at: stampToString(stamp), event })));
        s = next(r);
      }
    }
    return { s, events };
  };
  const battles = (events: readonly { at: string; event: FranchiseEvent }[]) =>
    events.filter((e) => e.event.type === "POSITION_BATTLE_DECLARED" || e.event.type === "POSITION_BATTLE_ENDED").map((e) => [e.at, e.event.type, (e.event.payload as { position: string }).position]);

  it("opens a close spot at camp and names a starter when preseason ends", () => {
    const { events } = walk({ incumbent: 30, veteran: 50, form: 40 }, ["TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON"]);
    expect(battles(events)).toEqual([
      ["2026/TRAINING_CAMP/W1D7", "POSITION_BATTLE_DECLARED", "QB"],
      ["2026/PRESEASON/W3D7", "POSITION_BATTLE_ENDED", "QB"],
    ]);
  });

  it("lets a coach who leans hard to incumbents see no spot as close", () => {
    const { events } = walk({ incumbent: 100, veteran: 50, form: 40 }, ["TRAINING_CAMP", "PRESEASON"]);
    expect(battles(events)).toEqual([]);
  });

  it("has a form coach open every spot once at camp and keep it open until the season is over", () => {
    const { events, s } = walk(FORM_COACH, CALENDAR_PHASE_ORDER, [SEASON, SEASON + 1]);
    expect(battles(events)).toEqual([
      ["2026/TRAINING_CAMP/W1D7", "POSITION_BATTLE_DECLARED", "QB"],
      ["2026/TRAINING_CAMP/W1D7", "POSITION_BATTLE_DECLARED", "RB"],
      ["2026/OFF_EVAL/W1D7", "POSITION_BATTLE_ENDED", "QB"],
      ["2026/OFF_EVAL/W1D7", "POSITION_BATTLE_ENDED", "RB"],
      ["2027/TRAINING_CAMP/W1D7", "POSITION_BATTLE_DECLARED", "QB"],
      ["2027/TRAINING_CAMP/W1D7", "POSITION_BATTLE_DECLARED", "RB"],
      ["2027/OFF_EVAL/W1D7", "POSITION_BATTLE_ENDED", "QB"],
      ["2027/OFF_EVAL/W1D7", "POSITION_BATTLE_ENDED", "RB"],
    ]);
    expect(s.memory.battles).toEqual([]);
    // Two near-equal quarterbacks swap on how they look; on his team every change is open competition.
    const changes = events.filter((e) => e.event.type === "DEPTH_CHART_CHANGED").map((e) => (e.event.payload as { situation: string }).situation);
    expect(changes.length).toBeGreaterThan(0);
    expect(new Set(changes)).toEqual(new Set(["OPEN_COMPETITION"]));
  });

  it("keeps the starters through the offseason: no coach's decisions, and no grades without practice", () => {
    const staff = staffFor("T1", { lineup: FORM_COACH });
    const s: State = { teams: [team("T1", [player("Q1", "QB", 60), player("Q2", "QB", 90)])], players: [player("Q1", "QB", 60), player("Q2", "QB", 90)], memory: emptyMemory() };
    const r = run(s, { at: at("OFF_RESET_FA", 2), staff });
    expect(r.events).toEqual([]);
    expect(r.teams[0]).toBe(s.teams[0]);
    expect(r.memory.grades).toEqual({});
    expect(r.memory.weeksInJob).toEqual({ "T1/QB/Q1": 1 });
  });
});

describe("grades, the read and the record", () => {
  it("grades every healthy rostered player's practice, and each player's game from the report; four kept", () => {
    const q1 = player("Q1", "QB", 70), q2 = player("Q2", "QB", 60), q3 = player("Q3", "QB", 50);
    let s: State = { teams: [team("T1", [q1, q2, q3])], players: [q1, hurt(q2, out(9, at("REGULAR_SEASON", 1))), q3], memory: emptyMemory() };
    const staff = staffFor("T1");
    for (let w = 1; w <= 6; w++) s = next(run(s, { at: at("REGULAR_SEASON", w), staff, reports: [line(q1, 8, 2)] }));
    expect(s.memory.grades["Q1"]!.game).toEqual([71.4, 71.4, 71.4, 71.4]);
    expect(s.memory.grades["Q1"]!.practice).toHaveLength(4);
    expect(s.memory.grades["Q3"]!.game).toEqual([]);
    expect(s.memory.grades["Q3"]!.practice).toHaveLength(4);
    for (const g of s.memory.grades["Q3"]!.practice) expect(Math.abs(g - 50)).toBeLessThan(16);
    expect(s.memory.grades["Q2"]).toBeUndefined();
    // Gone in the first offseason week without practice.
    expect(run(s, { at: at("OFF_EVAL", 1), staff }).memory.grades).toEqual({});
  });

  it("pulls a game grade toward even on a small sample or few snaps", async () => {
    const { gameGrade } = await import("../src/players/depthChart.js");
    expect(gameGrade({ snaps: 60, won: 0, lost: 0 }, "QB")).toBe(50);
    expect(gameGrade({ snaps: 60, won: 10, lost: 0 }, "QB")).toBeGreaterThan(gameGrade({ snaps: 60, won: 2, lost: 0 }, "QB"));
    expect(gameGrade({ snaps: 10, won: 10, lost: 0 }, "QB")).toBeLessThan(gameGrade({ snaps: 60, won: 10, lost: 0 }, "QB"));
    expect(gameGrade({ snaps: 60, won: 0, lost: 10 }, "CB")).toBeLessThan(25);
    expect(gameGrade({ snaps: 10, won: 4, lost: 0 }, "K")).toBe(75);
  });

  it("benches a starter after one bad game under a fiery coach's quick hook, and not under another", () => {
    const week = at("REGULAR_SEASON", 8);
    const fiery = midSeason({ starter: 70, challenger: 69, type: "fiery" });
    const f = run(fiery.state, { at: week, staff: fiery.staff, reports: [line(fiery.a, 1, 9)] });
    expect(ofType(f.events, "DEPTH_CHART_CHANGED").map((e) => [e.situation, e.up])).toEqual([["FORM", fiery.b.bio.id]]);
    const calm = midSeason({ starter: 70, challenger: 69, type: "quiet" });
    expect(ofType(run(calm.state, { at: week, staff: calm.staff, reports: [line(calm.a, 1, 9)] }).events, "DEPTH_CHART_CHANGED")).toEqual([]);
    // The owner's team has no hook, whatever the coach's type.
    expect(ofType(run(fiery.state, { at: week, staff: fiery.staff, ownerTeam: teamId("T1"), reports: [line(fiery.a, 1, 9)] }).events, "DEPTH_CHART_CHANGED")).toEqual([]);
  });

  it("knows the incumbents from its own record, not the chart's order, and counts their weeks in the job", () => {
    const a = player("A", "QB", 70), b = player("B", "QB", 72);
    const s: State = { teams: [team("T1", [b, a])], players: [a, b], memory: { ...emptyMemory(), weeksInJob: { "T1/QB/A": 3 } } };
    const r = run(s, { at: at("PRESEASON", 3), staff: staffFor("T1", { lineup: INCUMBENT_COACH, te: 100 }) });
    expect(r.teams[0]!.depthChart.QB).toEqual([a.bio.id, b.bio.id]);
    expect(r.events).toEqual([]);
    expect(r.memory.weeksInJob).toEqual({ "T1/QB/A": 4 });
  });

  it("fills a spot whose starter has gone without a label, and orders positions without starters by the read", () => {
    const fb1 = player("F1", "FB", 60), fb2 = player("F2", "FB", 75), q2 = player("Q2", "QB", 60), q3 = player("Q3", "QB", 65);
    const t = { ...team("T1", [fb1, fb2, q2, q3]), depthChart: { FB: [fb1.bio.id, fb2.bio.id], QB: [playerId("GONE"), q2.bio.id, q3.bio.id] } };
    const s: State = { teams: [t], players: [fb1, fb2, q2, q3], memory: { ...emptyMemory(), weeksInJob: { "T1/QB/GONE": 9 } } };
    const r = run(s, { at: at("REGULAR_SEASON", 4), staff: staffFor("T1", { te: 100 }) });
    expect(r.teams[0]!.depthChart.FB).toEqual([fb2.bio.id, fb1.bio.id]);
    expect(r.teams[0]!.depthChart.QB).toEqual([q3.bio.id, q2.bio.id]);
    expect(r.events).toEqual([]);
    expect(r.memory.weeksInJob).toEqual({ "T1/QB/Q3": 1 });
  });
});

describe("returns, resumes and the record (review)", () => {
  it("puts a returning starter in the place of a cover hurt the same week, not the third-stringer", () => {
    const a = player("A", "QB", 75), b = player("B", "QB", 70), c = player("C", "QB", 55);
    const staff = staffFor("T1", { te: 100 });
    const hurtWeek = at("REGULAR_SEASON", 3), backWeek = at("REGULAR_SEASON", 5);
    const covered = run({ teams: [team("T1", [a, b, c])], players: [hurt(a, out(2, hurtWeek)), b, c], memory: { ...emptyMemory(), weeksInJob: { "T1/QB/A": 5 } } }, { at: hurtWeek, staff });
    expect(covered.teams[0]!.depthChart.QB).toEqual([b.bio.id, c.bio.id]);
    // A is healthy again the week B goes down.
    const back = run({ ...next(covered), players: [a, hurt(b, out(2, backWeek)), c] }, { at: backWeek, staff });
    expect(back.teams[0]!.depthChart.QB).toEqual([a.bio.id, c.bio.id]);
    expect(ofType(back.events, "DEPTH_CHART_CHANGED").map((e) => [e.situation, e.up, e.down])).toEqual([["STARTER_RETURNS", a.bio.id, undefined]]);
    expect(back.memory.weeksInJob).toEqual({ "T1/QB/A": 1 });
    expect(back.memory.injuredStarters).toEqual([{ team: teamId("T1"), position: "QB", player: b.bio.id, cover: a.bio.id, since: backWeek }]);
    // A week later nothing moves: C never held the job.
    const after = run(next(back), { at: at("REGULAR_SEASON", 6), staff });
    expect(after.teams[0]!.depthChart.QB).toEqual([a.bio.id, c.bio.id]);
    expect(after.events).toEqual([]);
  });

  it("settles a spot for the week: a second starter back to the same spot waits a week for his answer", () => {
    const q0 = player("Q0", "QB", 80), q1 = player("Q1", "QB", 70), q3 = player("Q3", "QB", 60);
    const staff = staffFor("T1", { lineup: INCUMBENT_COACH, te: 100 });
    const since = at("REGULAR_SEASON", 2);
    // Q1 went down and Q3 covered; Q0 later won the job, went down too, and Q3 covered again.
    const memory: PlayerMemory = {
      ...emptyMemory(),
      weeksInJob: { "T1/QB/Q3": 4 },
      injuredStarters: [
        { team: teamId("T1"), position: "QB", player: q1.bio.id, cover: q3.bio.id, since },
        { team: teamId("T1"), position: "QB", player: q0.bio.id, cover: q3.bio.id, since: at("REGULAR_SEASON", 4) },
      ],
    };
    const both = run({ teams: [{ ...team("T1", [q0, q1, q3]), depthChart: { QB: [q3.bio.id] } }], players: [q0, q1, q3], memory }, { at: at("REGULAR_SEASON", 7), staff });
    expect(both.teams[0]!.depthChart.QB).toEqual([q1.bio.id, q0.bio.id, q3.bio.id]);
    expect(ofType(both.events, "DEPTH_CHART_CHANGED").map((e) => [e.situation, e.up, e.down])).toEqual([["STARTER_RETURNS", q1.bio.id, q3.bio.id]]);
    expect(both.memory.injuredStarters).toEqual([memory.injuredStarters[1]]);
    const answer = run(next(both), { at: at("REGULAR_SEASON", 8), staff });
    expect(answer.teams[0]!.depthChart.QB![0]).toBe(q0.bio.id);
    expect(ofType(answer.events, "DEPTH_CHART_CHANGED").map((e) => [e.situation, e.up, e.down])).toEqual([["STARTER_RETURNS", q0.bio.id, q1.bio.id]]);
    expect(answer.memory.injuredStarters).toEqual([]);
  });

  it("calls any benching on a form coach's team open competition all season, even by a player who came after camp", () => {
    const { a, b, state, staff } = midSeason({ lineup: FORM_COACH });
    // The camp battle listed A and a player since gone; B arrived later.
    const battles = [{ team: teamId("T1"), position: "QB" as const, players: [a.bio.id, playerId("LEFT")], declared: at("TRAINING_CAMP", 1) }];
    const r = run({ ...state, memory: { ...state.memory, battles } }, { at: at("REGULAR_SEASON", 8), staff, reports: [line(a, 6, 4)] });
    expect(r.teams[0]!.depthChart.QB).toEqual([b.bio.id, a.bio.id]);
    expect(ofType(r.events, "DEPTH_CHART_CHANGED").map((e) => e.situation)).toEqual(["OPEN_COMPETITION"]);
    expect(moraleOf(r.events, "A")[0]!.delta).toBe(-2);
  });

  /** Two teams with injuries drawn from the week and player, walked camp to season's end; optionally stopped, saved as JSON and carried on. */
  function injuredLeague(stopAfter?: string) {
    const players: PlayerState[] = [];
    const teams: Team[] = [];
    const staff: StaffState[] = [];
    const rng = createRng("injured-league", "players");
    for (const [t, lineup, type] of [["T1", FORM_COACH, "cerebral"], ["T2", INCUMBENT_COACH, "fiery"]] as const) {
      const mine: PlayerState[] = [];
      for (const pos of ["QB", "RB", "WR", "CB", "K"] as Position[]) {
        for (let i = 0; i < WANTED[pos]; i++) mine.push(player(`${t}-${pos}-${i}`, pos, 72 - 3 * i + rng.int(-3, 3), { team: t, age: 22 + rng.int(0, 10), volatility: rng.int(20, 80) }));
      }
      players.push(...mine);
      teams.push(team(t, mine));
      staff.push(...staffFor(t, { lineup, type }));
    }
    let state: State = { teams, players, memory: emptyMemory() };
    const events: { at: string; event: FranchiseEvent }[] = [];
    const tooMany: string[] = [];
    for (const stamp of yearWeeks(SEASON, ["TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON"])) {
      // Heal a week, then draw this week's injuries.
      const ps = state.players.map((p) => {
        const was = p.condition.injury;
        if (was) return hurt(p, was.weeksRemaining <= 1 ? undefined : { ...was, weeksRemaining: was.weeksRemaining - 1 });
        const r = createRng("injured-league", `${stampToString(stamp)}/${String(p.bio.id)}`);
        return r.next() < 0.06 ? hurt(p, out(1 + r.int(0, 3), stamp)) : p;
      });
      const reports = stamp.phase === "REGULAR_SEASON"
        ? state.teams.flatMap((tm) => (["QB", "RB", "WR", "CB"] as Position[]).flatMap((pos) => (tm.depthChart[pos] ?? []).slice(0, STARTERS[pos]).map((pid) => {
          const r = createRng("injured-league/contests", `${stampToString(stamp)}/${String(pid)}`);
          const won = r.int(0, 10);
          return line(ps.find((p) => p.bio.id === pid)!, won, 10 - won);
        })))
        : [];
      const r = run({ ...state, players: ps }, { at: stamp, staff, reports, seed: "injured" });
      events.push(...r.events.map((event) => ({ at: stampToString(stamp), event })));
      state = next(r);
      for (const tm of state.teams) {
        for (const pos of Object.keys(STARTERS) as Position[]) {
          const holders = Object.keys(state.memory.weeksInJob).filter((k) => k.startsWith(`${String(tm.id)}/${pos}/`));
          if (holders.length > STARTERS[pos]) tooMany.push(`${stampToString(stamp)} ${String(tm.id)} ${pos}`);
        }
      }
      // Whoever a change names as up ends the week starting; whoever it names as down does not.
      for (const e of ofType(r.events, "DEPTH_CHART_CHANGED")) {
        const starting = (state.teams.find((tm) => tm.id === e.team)!.depthChart[e.position] ?? []).slice(0, STARTERS[e.position]);
        if (e.up !== undefined && !starting.includes(e.up)) tooMany.push(`${stampToString(stamp)} ${e.situation} up ${String(e.up)} not starting`);
        if (e.down !== undefined && starting.includes(e.down)) tooMany.push(`${stampToString(stamp)} ${e.situation} down ${String(e.down)} still starting`);
      }
      if (stopAfter !== undefined && stampToString(stamp) === stopAfter) {
        const saved = JSON.parse(JSON.stringify({ teams: state.teams, memory: state.memory, players: state.players.map((p) => ({ ...p, attributes: { ...p.attributes, traits: [] } })) })) as State;
        state = { ...saved, players: saved.players.map((p) => ({ ...p, attributes: { ...p.attributes, traits: new Set() } })) };
      }
    }
    return { state, events, tooMany };
  }

  it("carries on exactly from a saved memory, and never names more starters than a position has", () => {
    const straight = injuredLeague();
    const carried = injuredLeague(`${SEASON}/REGULAR_SEASON/W9D7`);
    expect(JSON.stringify(carried.events)).toBe(JSON.stringify(straight.events));
    expect(JSON.stringify(carried.state.teams)).toBe(JSON.stringify(straight.state.teams));
    expect(JSON.stringify(carried.state.memory)).toBe(JSON.stringify(straight.state.memory));
    expect(straight.tooMany).toEqual([]);
    // The walk exercises the injury paths it claims to carry across the save.
    const seen = new Set(ofType(straight.events.map((e) => e.event), "DEPTH_CHART_CHANGED").map((e) => e.situation));
    for (const s of ["INJURY_COVER", "STARTER_RETURNS", "OPEN_COMPETITION"] as const) expect(seen.has(s)).toBe(true);
  });
});
