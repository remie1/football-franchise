/**
 * The players' day steps (ADR-087 §3, §10): what runs in `runSeason`'s walk when development or
 * injuries is switched on.
 *
 * On a day with games, after them: each game's injuries, drawn at the final whistle (§5.2).
 * On each week's last day (day 7), after that day's games, in this order:
 *   healing → practice and away-from-football injuries → the development week → the depth chart →
 *   emergency signings, so every team with a game next week can field a side for it.
 * Every day: unsigned players' patience (§6.1).
 * With `retirement: "choice"` (ADR-087 §12.4, AB8): each regular-season game week's starts are counted
 * before the week's chart rebuild, and on the three own-choice days (OFF_EVAL week 1 day 7, OFF_RESET_FA
 * week 1 day 2, training camp week 1 day 1) men may retire by their own choice (`retirement.ts`),
 * after the week step and before the unsigned rule's step, which still runs after it on camp's first day.
 *
 * What each player did this week (`PlayerWeek`) is read once, before the day's new injuries: who was
 * with a team still playing, who practised, who played and how (the who-played report, P4, which the
 * season runner hands back beside each result as `{ participation }`), and his coordinators.
 *
 * The weekly depth chart and unsigned retirements run whenever either switch is on, since either one
 * changes who can play; growth and aging only with `development`, injuries only with `injuries`.
 * Memory between days lives in `people.playerMemory`, so the steps stay pure functions of the people
 * and the day, and a save carries on exactly. With `aging: "ability"` it also counts each man's contact
 * taken (ADR-087 §12.3.6, AB6; `wear.ts`), the wear the spot path's `perContact` reads.
 */
import { lineupHopes } from "../winNow/lineupHopes.js";
import {
  DEFAULT_LEAGUE_RULES, positionOverall,
  type CalendarPhase, type FranchiseEvent, type GameParticipation, type LeagueRules, type PlayerId, type PlayerState, type Position, type SeasonState,
  type StaffState, type Team, type TeamId,
} from "@ff/contracts";
import { minimumContract } from "../cap/signings.js";
import { flatCap, type CapForSeason } from "../draft/money.js";
import type { DayStep, DayStepContext, LeaguePeople } from "../season/people.js";
import { currentJob, seatOf } from "../staff/world.js";
import { nextDay } from "../calendar/clock.js";
import { ABILITY_FOLLOWS, abilityRules, agingSwitches, chartSpots, weekSide, type AgingOptions, type AgingRule } from "./aging.js";
import { depthChartWeek, readBlur } from "./depthChart.js";
import { PRACTICE_PHASES, developmentWeek } from "./development.js";
import { gameInjuries, healWeek, isAvailable, weekInjuries } from "./injuries.js";
import { injuryRiskRule, type InjuryRisk } from "./injurySpot.js";
import { countStarts, ownMoment, ownRetirements, retirementRule, type RetirementRule } from "./retirement.js";
import { emptyMemory, type PlayerMemory, type PlayerWeek } from "./types.js";
import { unsignedDay } from "./unsigned.js";
import { addContact, perContactRule, wearYears } from "./wear.js";

/** Every players' step id starts with this, so a save can tell their events from other steps'. */
export const PLAYER_STEP_PREFIX = "players:";

/**
 * ADR-087 §12.1: the aging options (`aging`, default `"position"`; on the ability path `abilityCurves`,
 * `techniqueKnee` and `smartsSnaps`, `aging.ts` `AgingOptions`) act only with `development` on and
 * `aging: "ability"`. They are recorded in `PlayerMemory.switches` only then, and only when not the
 * default, so a run at the defaults is main's to the byte. `injuryRisk` (AB5) likewise acts only with
 * `injuries` on and is recorded only then, and only when not the default (`"group"`). AB6's tuning
 * options act only on the spot path and are recorded only where they act and are not the default:
 * `healingByAge: false` (AB9-T6) with injuries on and `injuryRisk: "spot"`; `perContact` above 0
 * (AB9-T5) with that and development on with `aging: "ability"` too. `retirement` (AB8) acts with
 * either switch on and is recorded only when not the default (`"unsigned"`).
 */
export interface PlayerStepsConfig extends AgingOptions {
  /** Growth and aging (§2, §4). */
  readonly development?: boolean;
  /** Injuries in games, practice and away from football (§5). */
  readonly injuries?: boolean;
  /**
   * ADR-087 §12.1, §12.3.1 (AB5): where injury risk comes from. Default `"group"` (his listed
   * position's group, today's); `"spot"` reads the chart key his team lists him at this week (the
   * team's chart as it stands when the draw is made, before the week's rebuild) with §12.3.2's age
   * factor (`injurySpot.ts`). Acts only with `injuries` on.
   */
  readonly injuryRisk?: InjuryRisk;
  /**
   * ADR-087 §12.3.3 (AB6; tuning arm AB9-T6): slower healing for back and ribs at 31 and over
   * (`HEALING_BY_AGE`) on the spot path. Default true there; false turns it off. Acts only with
   * injuries on and `injuryRisk: "spot"`; the group path never reads it.
   */
  readonly healingByAge?: boolean;
  /**
   * ADR-087 §12.3.6 (AB6; tuning arm AB9-T5): years of wear per contest of contact past `WEAR.free`
   * (`wear.ts`), added to the body groups' and DURABILITY's years past on the ability path. Default 0
   * (no wear). Acts only with development on and `aging: "ability"` (where the contact count is kept)
   * and injuries on with `injuryRisk: "spot"`.
   */
  readonly perContact?: number;
  /**
   * ADR-087 §12.1, §12.4 (AB8): how players retire. Default `"unsigned"` (today's: only men nobody
   * signs in time, §6.1); `"choice"` adds retiring by his own choice at three moments a year
   * (`retirement.ts`), on top of the unsigned rule. Acts with either switch on.
   */
  readonly retirement?: RetirementRule;
  /**
   * The season runner's lineup rule (§10): a position this team cannot fill from these available
   * players, or undefined when it can field a side. Absent = every team can always be fielded, and
   * nobody is signed in an emergency.
   */
  readonly unfilled?: (team: Team, available: ReadonlySet<string>, players: ReadonlyMap<string, PlayerState>) => Position | undefined;
  /** The owner's team: even depth-chart leanings until ADR-083's trait exists. */
  readonly ownerTeam?: TeamId;
  /**
   * ADR-094 §9: each computer head coach sizes up his team's hopes after the week's games and moves
   * his leanings for next week's chart (a look at the young men, a desperate shake-up). Needs the
   * coaching world (`people.coaching`); off by default, as growth and injuries are.
   */
  readonly lineupHopes?: boolean;
  /**
   * The cap by season, for the emergency signings' one-year minimums (ADR-085's forecast), as the
   * draft's `cap` prices its deals. Default: flat at the rules' cap, as the draft's default is. Up to
   * the CBA's last season (2030) the minimum is the CBA's table and the cap changes nothing; past it,
   * the table grows with the cap, so a league that signs players then needs one. `runSeason` gives
   * these steps the year's one cap, the draft's, else the league year's (ADR-085), when they have none
   * of their own, so they are priced as the draft's deals are.
   */
  readonly cap?: CapForSeason;
}

/** What a resolver hands back beside a result for these steps: the who-played report (P4). */
export interface PlayerGameExtras {
  readonly participation: readonly GameParticipation[];
}


const OFFENSE: ReadonlySet<Position> = new Set(["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
const SPECIAL: ReadonlySet<Position> = new Set(["K", "P", "LS"]);
type Side = "offense" | "defense" | "special";
const sideOf = (p: Position): Side => (OFFENSE.has(p) ? "offense" : SPECIAL.has(p) ? "special" : "defense");
const SIDE_SEAT: Readonly<Record<Side, "OC" | "DC" | "STC">> = { offense: "OC", defense: "DC", special: "STC" };

function participationOf(games: DayStepContext["games"]): GameParticipation[] {
  const out: GameParticipation[] = [];
  for (const g of games) {
    const p = (g.extras as Partial<PlayerGameExtras> | undefined)?.participation;
    if (Array.isArray(p)) out.push(...p);
  }
  return out;
}

/** Teams whose year is still on this week: every team, except in the playoffs, where only teams not yet knocked out. */
function teamsStillPlaying(phase: CalendarPhase, state: SeasonState, today: DayStepContext["games"], teams: readonly Team[]): ReadonlySet<string> {
  if (phase !== "PLAYOFFS") return new Set(teams.map((t) => String(t.id)));
  const bracket = state.bracket;
  if (!bracket) return new Set();
  const alive = new Set(bracket.seeds.flatMap((s) => s.teams.map(String)));
  const todays = new Set(today.map((g) => String(g.game.gameId)));
  for (const r of state.results) {
    const game = bracket.games.find((g) => g.gameId === r.gameId);
    if (!game || todays.has(String(r.gameId))) continue;
    alive.delete(String(r.homeScore > r.awayScore ? r.away : r.home));
  }
  return alive;
}

/**
 * Teams with a game next week, who sign before it (§5.3): next week's scheduled teams in the regular
 * season; in the playoffs, the field's teams not yet knocked out (every team in the week before the
 * field is set, which is on the playoffs' first day). Nobody in the offseason.
 */
function teamsPlayingNextWeek(ctx: DayStepContext, teams: readonly Team[]): ReadonlySet<string> {
  const next = nextDay(ctx.day, ctx.rules);
  if (next.phase === "REGULAR_SEASON") {
    return new Set(ctx.state.schedule.games
      .filter((g) => g.at.season === next.season && g.at.phase === "REGULAR_SEASON" && g.at.week === next.week)
      .flatMap((g) => [String(g.home), String(g.away)]));
  }
  if (next.phase !== "PLAYOFFS") return new Set();
  const bracket = ctx.state.bracket;
  if (!bracket) return new Set(teams.map((t) => String(t.id)));
  if (bracket.champion !== undefined) return new Set();
  const alive = new Set(bracket.seeds.flatMap((s) => s.teams.map(String)));
  for (const r of ctx.state.results) {
    if (!bracket.games.some((g) => g.gameId === r.gameId)) continue;
    alive.delete(String(r.homeScore > r.awayScore ? r.away : r.home));
  }
  return alive;
}

/** A team's sitting coordinator in a seat, if any. */
function coordinator(staff: readonly StaffState[] | undefined, team: TeamId, seat: "OC" | "DC" | "STC"): StaffState | undefined {
  return staff?.find((s) => seatOf(s) === seat && currentJob(s)?.team === team);
}

/**
 * Each player's week, read before the day's new injuries (§3; `PlayerWeek`). Free agents and prospects
 * are left out. His side (which coordinator's `development` coaches him, and which side's snaps make
 * his `playShare`): with `aging: "position"` (the default) the side of his listed position, as before;
 * with `"ability"` (ADR-087 §12.2.6) the side of the chart key that lists him this week, else the side
 * where most of his snaps came, else none (no coordinator, a share of 0), never his listed position.
 */
export function playerWeeks(people: LeaguePeople, ctx: DayStepContext, reports: readonly GameParticipation[], aging: AgingRule = "position"): Map<string, PlayerWeek> {
  const phase = ctx.day.phase;
  const playing = teamsStillPlaying(phase, ctx.state, ctx.games, people.teams);
  const byPlayer = new Map<string, GameParticipation[]>();
  // Each game's busiest player on each side sets that side's snap count, for a share.
  const sideSnaps = new Map<string, number>();
  for (const r of reports) {
    byPlayer.set(String(r.player), [...(byPlayer.get(String(r.player)) ?? []), r]);
    for (const side of ["offense", "defense", "special"] as const) {
      const k = `${String(r.team)}/${side}`;
      sideSnaps.set(k, Math.max(sideSnaps.get(k) ?? 0, r.snaps[side]));
    }
  }
  // The ability path's chart keys, by team (the charts as they stand this week, before this week's rebuild).
  const spots = aging === "ability" ? new Map(people.teams.map((t) => [String(t.id), chartSpots(t)])) : undefined;
  const weeks = new Map<string, PlayerWeek>();
  for (const p of people.players) {
    if (p.teamId === undefined || p.bio.draft === "PROSPECT") continue;
    const withTeam = playing.has(String(p.teamId)) && PRACTICE_PHASES.has(phase);
    const hurt = p.condition.injury;
    const practiced = !withTeam ? 0 : !hurt ? 1 : hurt.playable ? 0.5 : 0;
    const mine = byPlayer.get(String(p.bio.id)) ?? [];
    const side = spots === undefined ? sideOf(p.bio.position) : weekSide(spots.get(String(p.teamId))?.get(String(p.bio.id)), mine);
    const ownSnaps = side === undefined ? 0 : mine.reduce((n, r) => n + r.snaps[side], 0);
    const teamSnaps = side === undefined ? 0 : sideSnaps.get(`${String(p.teamId)}/${side}`) ?? 0;
    const contests = new Map<string, { attr: GameParticipation["contests"][number]["attr"]; won: number; lost: number }>();
    for (const r of mine) {
      for (const c of r.contests) {
        const was = contests.get(String(c.attr));
        contests.set(String(c.attr), { attr: c.attr, won: (was?.won ?? 0) + c.won, lost: (was?.lost ?? 0) + c.lost });
      }
    }
    const coach = side === undefined ? undefined : coordinator(people.staff, p.teamId, SIDE_SEAT[side]);
    const dc = coordinator(people.staff, p.teamId, "DC");
    const development = coach?.attributes["development"];
    const teaching = dc?.attributes["teaching"];
    weeks.set(String(p.bio.id), {
      withTeam,
      practiced,
      playShare: teamSnaps > 0 ? Math.min(1, ownSnaps / teamSnaps) : 0,
      snaps: mine.reduce((n, r) => n + r.snaps.offense + r.snaps.defense + r.snaps.special, 0),
      contests: [...contests.values()].sort((a, b) => String(a.attr).localeCompare(String(b.attr))),
      ...(development === undefined ? {} : { coachDevelopment: development }),
      ...(teaching === undefined ? {} : { dcTeaching: teaching }),
    });
  }
  return weeks;
}

/**
 * Next man up (§5.3), a stopgap until the cap thread's injured reserve and street signings: before the
 * next game, a team that cannot field a side fills the spot it cannot fill, on a one-year minimum
 * deal: from its own practice squad first (`Team.practiceSquad`, ADR-086 C4), as real teams do, and
 * only when nobody there is fit, with the free agent who best fits. In either pool one who plays
 * that position is preferred; failing that, the best overall at it, listed there from now on. For a
 * kicker, punter or long snapper, a specialist off the street comes before a squad player of
 * another trade.
 * "Best" is the side's coordinator's read (his position overall there through `readBlur`), never
 * the true ratings (§7). A call-up leaves the practice squad for the roster and the position's depth
 * chart, and is a `CONTRACT_SIGNED` like a street signing (a squad player called up signs a standard
 * deal); a team with no practice squad signs from the street exactly as before. Where a contract book
 * is kept, each signing adds his one-year minimum to it, priced by `cap` (default: flat at `rules`'
 * cap, as the draft's deals are; it moves the price only past the CBA's last season), and a call-up
 * also ends his live practice-squad deal with that team at the call-up day (reason `EXPIRED`: no dead
 * money, since a squad deal has no bonus, and no event of its own, the `CONTRACT_SIGNED` tells it),
 * so the call-up never adds a second live deal for him; with no such deal on the book, nothing else
 * changes. Other deals of his the book holds are left as they are: whether it held only the squad deal
 * is up to the code that wrote it. Only `playing` teams sign (absent = every team). Neither the 53-man
 * limit nor the cap is checked for these signings: their money and real rules are the cap thread's
 * (ADR-087 §5.3, ADR-085), whose in-season signings replace this stopgap.
 */
export function emergencySignings(
  people: LeaguePeople, at: DayStepContext["day"], unfilled: NonNullable<PlayerStepsConfig["unfilled"]>,
  opts: { readonly seed: string; readonly playing?: ReadonlySet<string>; readonly cap?: CapForSeason; readonly rules?: LeagueRules },
): { people: LeaguePeople; events: FranchiseEvent[] } {
  const cap = opts.cap ?? flatCap(opts.rules ?? DEFAULT_LEAGUE_RULES);
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  let freeAgents = [...people.freeAgents];
  const contracts = people.contracts ? [...people.contracts] : undefined;
  const events: FranchiseEvent[] = [];
  const teams = people.teams.map((team) => {
    if (opts.playing && !opts.playing.has(String(team.id))) return team;
    let t = team;
    for (;;) {
      const available = new Set(t.roster.map(String).filter((id) => { const p = byId.get(id); return p !== undefined && isAvailable(p); }));
      const position = unfilled(t, available, byId);
      if (position === undefined) return t;
      const seat = SIDE_SEAT[sideOf(position)];
      const lens = coordinator(people.staff, t.id, seat);
      /** The coordinator's pick from a pool (his read is a pure function of the day, so reading more men moves nothing); ties by id. */
      const best = (pool: readonly PlayerState[]): PlayerState | undefined => {
        const read = new Map(pool.map((p) => [String(p.bio.id),
          positionOverall(position, p.attributes.values) + readBlur({ seed: opts.seed, at, team: t.id, seat, coordinator: lens, player: p.bio.id })]));
        return [...pool].sort((a, b) =>
          read.get(String(b.bio.id))! - read.get(String(a.bio.id))! || String(a.bio.id).localeCompare(String(b.bio.id)))[0];
      };
      const fit = (id: PlayerId) => { const p = byId.get(String(id)); return p !== undefined && isAvailable(p) && p.bio.draft !== "PROSPECT" ? p : undefined; };
      const listed = (pool: readonly PlayerState[]) => pool.filter((p) => p.bio.position === position);
      const squad = (t.practiceSquad ?? []).map(fit).filter((p): p is PlayerState => p !== undefined);
      const street = freeAgents.map(fit).filter((p): p is PlayerState => p !== undefined);
      // Where to look, in order (`true` = a call-up): the squad, one listed at the position first, then the
      // street the same way. A specialist (K, P, LS) is the exception: a kicker off the street comes before a
      // squad man of another trade, so a hurt kicker brings in a kicker while there is one (ADR-087 §11).
      const tiers: readonly (readonly [readonly PlayerState[], boolean])[] = SPECIAL.has(position)
        ? [[listed(squad), true], [listed(street), false], [squad, true], [street, false]]
        : [[listed(squad), true], [squad, true], [listed(street), false], [street, false]];
      let pick: PlayerState | undefined;
      let calledUp = false;
      for (const [pool, fromSquad] of tiers) {
        pick = best(pool);
        if (pick) { calledUp = fromSquad; break; }
      }
      if (!pick) return t; // Nobody left to sign: the season runner reports the team it cannot field.
      const signed: PlayerState = { ...pick, teamId: t.id, bio: { ...pick.bio, position } };
      byId.set(String(pick.bio.id), signed);
      if (calledUp) t = { ...t, practiceSquad: t.practiceSquad!.filter((id) => id !== pick.bio.id) };
      else freeAgents = freeAgents.filter((id) => id !== pick.bio.id);
      t = { ...t, roster: [...t.roster, pick.bio.id], depthChart: { ...t.depthChart, [position]: [...(t.depthChart[position] ?? []), pick.bio.id] } };
      events.push({ type: "CONTRACT_SIGNED", payload: { player: pick.bio.id, team: t.id, kind: "MINIMUM", years: 1 } });
      if (calledUp && contracts) {
        // His squad deal ends at the call-up (ADR-087 §11): EXPIRED, so no charge (it has no bonus) and no event.
        const i = contracts.findIndex((c) =>
          String(c.player) === String(pick.bio.id) && String(c.team) === String(t.id) && c.kind === "PRACTICE_SQUAD" && !c.ended);
        if (i >= 0) contracts[i] = { ...contracts[i]!, ended: { at, reason: "EXPIRED" } };
      }
      contracts?.push(minimumContract({
        player: pick.bio.id, team: t.id, season: at.season, signedAt: at, creditedSeasons: pick.bio.creditedSeasons ?? 0, years: 1, capForSeason: cap,
      }));
    }
  });
  if (events.length === 0) return { people, events };
  return {
    people: { ...people, teams, players: people.players.map((p) => byId.get(String(p.bio.id))!), freeAgents, ...(contracts ? { contracts } : {}) },
    events,
  };
}

/** The players' day steps for `runSeason` (§10). Empty when both switches are off. */
export function playerSteps(config: PlayerStepsConfig): DayStep[] {
  const development = config.development === true;
  const injuries = config.injuries === true;
  if (!development && !injuries) return [];
  // ADR-087 §12.1: the aging options, checked here (a misspelled value throws) and recorded only when they act.
  const aging: AgingRule = development && abilityRules(config) !== undefined ? "ability" : "position";
  // AB5: checked here too (a misspelled value throws), and acting (and recorded) only with injuries on.
  const asked = injuryRiskRule(config.injuryRisk);
  const injuryRisk: InjuryRisk = injuries && asked === "spot" ? "spot" : "group";
  // AB6: the two tuning options, checked here (a value they do not take throws), acting only on the spot path.
  if (config.healingByAge !== undefined && typeof config.healingByAge !== "boolean") {
    throw new RangeError(`healingByAge is true or false, not ${JSON.stringify(config.healingByAge)}`);
  }
  const healingByAge = injuryRisk === "spot" ? config.healingByAge !== false : true;
  const askedWear = perContactRule(config.perContact);
  // The contact count is kept on the ability path (§12.3.6); wear reads it only on the spot path too.
  const countContact = aging === "ability";
  const perContact = countContact && injuryRisk === "spot" ? askedWear : 0;
  // AB8: checked here too (a misspelled value throws); it acts with either switch on, so whenever these steps run.
  const retirement = retirementRule(config.retirement);
  const switches = {
    development, injuries, ...agingSwitches(config, development), ...(injuryRisk === "spot" ? { injuryRisk } : {}),
    ...(healingByAge ? {} : { healingByAge: false }), ...(perContact > 0 ? { perContact } : {}),
    ...(retirement === "choice" ? { retirement } : {}),
  };
  // What the spot path's injury steps take beyond the charts (AB6): the healing switch, only when off.
  const spotRules = healingByAge ? {} : { healingByAge: false };

  const week: DayStep = {
    id: `${PLAYER_STEP_PREFIX}week`,
    run: (people, ctx) => {
      const weekEnd = ctx.day.day === 7;
      if (!weekEnd && (!injuries || ctx.games.length === 0)) return undefined;
      const held: PlayerMemory = people.playerMemory ?? emptyMemory();
      // AB8: the week's regular-season starts, read off the charts the games were played from (before this week's rebuild).
      const memory: PlayerMemory = retirement === "choice" && weekEnd ? countStarts(held, ctx.day, people.teams, ctx.games) : held;
      const reports = participationOf(ctx.games);
      const weeks = weekEnd ? playerWeeks(people, ctx, reports, aging) : new Map<string, PlayerWeek>();
      const events: FranchiseEvent[] = [];
      let players = people.players;
      let history = memory.injuries;

      if (injuries) {
        const games = [...ctx.games].sort((a, b) => String(a.game.gameId).localeCompare(String(b.game.gameId)));
        for (const g of games) {
          const own = (g.extras as Partial<PlayerGameExtras> | undefined)?.participation ?? [];
          const r = gameInjuries({
            game: g.game.gameId, at: ctx.day, reports: own, players, history, seed: ctx.seed, rules: ctx.rules,
            // AB5: on the spot path, each man's key on his team's chart as it stands at the game.
            ...(injuryRisk === "spot" ? { injuryRisk, teams: people.teams, ...spotRules } : {}),
          });
          players = r.players; history = r.history; events.push(...r.events);
        }
      }
      if (!weekEnd) return { people: { ...people, players, playerMemory: { ...memory, injuries: history, switches } }, events };

      if (injuries) {
        // ADR-087 §12.2.1: on the ability path a lasting mark moves what follows the body there (elusiveness and yac too).
        // AB6: on the spot path a concussion leaves its mark (CONCUSSION_MARK).
        const healed = healWeek({
          at: ctx.day, players, history, ...(aging === "ability" ? { follows: ABILITY_FOLLOWS } : {}), ...(injuryRisk === "spot" ? { injuryRisk } : {}),
        });
        players = healed.players; history = healed.history; events.push(...healed.events);
        const drawn = weekInjuries({
          at: ctx.day, rules: ctx.rules, players, weeks, history, seed: ctx.seed,
          // AB5: the week's chart, before this week's rebuild below.
          ...(injuryRisk === "spot" ? { injuryRisk, teams: people.teams, ...spotRules } : {}),
        });
        players = drawn.players; history = drawn.history; events.push(...drawn.events);
      }
      // ADR-087 §12.3.6 (AB6): each man's contact this week's games, kept on the ability path only.
      const contact = countContact ? addContact(memory.contact, reports) : undefined;
      if (development) {
        // Wear (years) for the men past `free`, only when `perContact` acts; else none, and nothing moves.
        const wear = contact !== undefined && perContact > 0
          ? new Map(Object.entries(contact).map(([id, n]) => [id, wearYears(n, perContact)] as const).filter(([, w]) => w > 0))
          : undefined;
        const grown = developmentWeek({
          players, at: ctx.day, rules: ctx.rules, seed: ctx.seed, weeks, ...agingSwitches(config, development), ...(wear ? { wear } : {}),
        });
        players = grown.players; events.push(...grown.events);
      }
      const hopes = config.lineupHopes && people.coaching && ctx.day.phase === "REGULAR_SEASON"
        ? lineupHopes({
          world: people.coaching.world, state: ctx.state, season: ctx.season, week: ctx.day.week, seed: ctx.seed, teamCount: people.teams.length,
          ...(config.ownerTeam ? { ownerTeam: config.ownerTeam } : {}),
        })
        : undefined;
      const depth = depthChartWeek({
        at: ctx.day, rules: ctx.rules, seed: ctx.seed, teams: people.teams, players,
        ...(hopes ? { hopes } : {}),
        ...(people.staff ? { staff: people.staff } : {}),
        memory: { ...memory, injuries: history, ...(contact === undefined ? {} : { contact }) }, reports,
        ...(config.ownerTeam ? { ownerTeam: config.ownerTeam } : {}),
      });
      events.push(...depth.events);
      let next: LeaguePeople = { ...people, teams: depth.teams, players: depth.players, playerMemory: { ...depth.memory, switches } };
      if (config.unfilled) {
        const signed = emergencySignings(next, ctx.day, config.unfilled, {
          seed: ctx.seed, playing: teamsPlayingNextWeek(ctx, next.teams), rules: ctx.rules, ...(config.cap ? { cap: config.cap } : {}),
        });
        next = signed.people; events.push(...signed.events);
      }
      return { people: next, events };
    },
  };

  // AB8: retiring by his own choice on the three days (`retirement.ts`), only with `retirement: "choice"`.
  const retire: DayStep = {
    id: `${PLAYER_STEP_PREFIX}retire`,
    run: (people, ctx) => {
      const timing = ownMoment(ctx.day);
      if (timing === undefined) return undefined;
      const r = ownRetirements({ people, at: ctx.day, timing, seed: ctx.seed, rules: ctx.rules, cap: config.cap ?? flatCap(ctx.rules) });
      return { people: { ...r.people, playerMemory: { ...(r.people.playerMemory ?? emptyMemory()), switches } }, events: r.events };
    },
  };

  const unsigned: DayStep = {
    id: `${PLAYER_STEP_PREFIX}unsigned`,
    run: (people, ctx) => {
      const memory = people.playerMemory ?? emptyMemory();
      if (people.freeAgents.length === 0 && Object.keys(memory.unsignedSince).length === 0) return undefined;
      const r = unsignedDay({ at: ctx.day, rules: ctx.rules, seed: ctx.seed, players: people.players, freeAgents: people.freeAgents, memory });
      return { people: { ...people, players: r.players, freeAgents: r.freeAgents, playerMemory: { ...r.memory, switches } }, events: r.events };
    },
  };

  return retirement === "choice" ? [week, retire, unsigned] : [week, unsigned];
}

