/**
 * THE AGING REDESIGN'S MEASURES (ADR-087 §12, step AB1; rows version 6): the pure pieces the
 * 20-season check's reader (`careerCheck.ts`) adds before any of the redesign's rules lands. Each one
 * only measures what the walk hands its watchers; the game reads none of them, and every grade row
 * built on them is REPORT (`careerGrade.ts`), never GATE.
 *
 * - The ability groups (§12.2.1): `ABILITY_GROUP_COPY`, each rating in exactly one of the 12 groups
 *   (P7's `ABILITY_GROUPS`), or FIXED. A calibration table for now: AB3's franchise table must give
 *   the same membership, and AB3 adds the pin (§12.2.7 test 9 and 11).
 * - The week-8 picture by age (`abilityPicture`): each group's mean rating, the 99s by rating, group
 *   and age, the combine measures of the men who carry a body record.
 * - The spot a man plays (`chartSpots`): the first key of his team's depth chart that lists him, in
 *   `SPOT_ORDER`. Teams chart a man at his listed position today, so his spot is his listed fine
 *   position for now; the reading is by the chart so it stays right once teams move men (§12.3.1).
 * - Contact taken (§12.3.6): `CONTACT_RATINGS` grouped into the roll sets of one contact check's
 *   terms on one side (`CONTACT_ROLL_SETS`), counted per game as the largest won + lost among each
 *   set's ratings, summed over the sets (`contactOf`): a lower bound on contests, never one counted
 *   twice.
 * - Injuries per snap and per player-game by age and spot (`injuryExposure`), read the way the real
 *   side reads them, on a narrower snap base: the sim credits special-teams snaps only to the kicker,
 *   the punter and the returner (`participation.ts`), so its snaps hold no coverage, return-unit or
 *   long-snapper snaps, and a punter's none of the holds; a man who plays only on special teams has
 *   no snap there, and so no player-game.
 * - Availability by age read the real side's way (`addGameWeeks`).
 * - Concussion lengths, first and later (`concussionLengths`), and durability by how many
 *   concussions a man has had (`durabilityByConcussions`).
 * - A request from the salary-cap thread (2026-11-07), measure-only too: the new draft picks not
 *   kept at their first regular-season week 1, by round (`readPicks`, `rookieWeekOne`, `rookieCutOf`).
 *
 * Every number these give is MEASURED (the sim's). Each rule below that is not the real side's own is
 * CHOSEN, and says so.
 */
import {
  ABILITY_GROUPS, compareStamps, positionOverall, type AbilityGroup, type CalendarStamp, type FranchiseEventEnvelope, type GameParticipation, type PlayerState,
  type Position, type Team,
} from "@ff/contracts";
import type { SeasonPeople } from "./realSeason.js";

const bumpBy = (m: Record<string, number>, k: string, by = 1) => { m[k] = (m[k] ?? 0) + by; };
/** Keys that are whole numbers sorted as numbers, "?" last, any other key after them by name. */
export const sortNumericKeys = <T>(m: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.keys(m).sort((a, b) => {
    const na = Number(a), nb = Number(b);
    const fa = a !== "" && Number.isFinite(na), fb = b !== "" && Number.isFinite(nb);
    if (fa && fb) return na - nb;
    if (fa !== fb) return fa ? -1 : 1;
    return a === "?" ? 1 : b === "?" ? -1 : a.localeCompare(b);
  }).map((k) => [k, m[k]!]));

// --- the ability groups (§12.2.1) ----------------------------------------------------------------

/**
 * Each rating's ability group (ADR-087 §12.2.1), CHOSEN as the section's table names them: every
 * rating of the registry exactly once, in one of P7's 12 groups or in FIXED (volatility and
 * discipline, personality, Spec #14: they never move).
 *
 * Four ratings follow both speed and agility (franchise `body.ts` `FOLLOWS`: acceleration .7/.3,
 * mobility .6/.4, firstStep .7/.3, pursuit .6/.4), and §12.2.1 gives elusiveness (quickness .6, speed
 * .3) and yac (.4/.4) a speed share too. A membership table holds each rating once: each sits in the
 * group of its larger share (SPEED for the four), and elusiveness and yac in QUICKNESS, where
 * §12.2.1's "Leaving SKILL" moves them. The shares stay the curves' business (AB3).
 *
 * A group's mean for a man (`abilityPicture`) is the plain mean of the group's ratings he has
 * (CHOSEN): the body groups are read on the ratings, not on the combine measures, which are shown
 * apart for the men who carry a body record.
 *
 * `disguise` is not a player rating (the registry has none; it is a defensive coordinator's habit,
 * contracts `staff.ts`). It is kept in TECHNIQUE because franchise's `GROUP_MEMBERS.SKILL` and
 * §12.2.1's TECHNIQUE row both list it; no player carries it, so it reads nothing. Every one of the
 * registry's 57 ratings is in exactly one group (a test holds this to `ATTRIBUTE_REGISTRY_V1`).
 *
 * Calibration may not import franchise, so this is a copy for now: AB3's franchise membership table
 * must match it, and AB3 adds the pin against `ABILITY_GROUP_DIGEST` (the sha256 of this object's
 * `JSON.stringify`), as `RATING_GROUP_COPY` / `RATING_GROUP_DIGEST` pin `GROUP_MEMBERS`.
 */
export const ABILITY_GROUP_COPY: Readonly<Record<AbilityGroup | "FIXED", readonly string[]>> = {
  SPEED: ["speed", "acceleration", "mobility", "firstStep", "pursuit"],
  QUICKNESS: ["agility", "elusiveness", "yac"],
  SPRING: ["jumping"],
  STRENGTH: ["strength", "power", "anchor"],
  ARM: ["armStrength"],
  LEG: ["kickPower", "puntPower"],
  STAMINA: ["stamina"],
  DURABILITY: ["durability"],
  TECHNIQUE: [
    "passBlock", "runBlock", "footwork", "sustain", "pullSkill",
    "passRush", "runStuff", "powerMove", "finesseMove", "blockShed",
    "tackling", "zoneCoverage", "manCoverage", "press", "ballSkills",
    "routeRunning", "releaseWR", "catching", "catchInTraffic", "spectacularCatch",
    "ballSecurity", "disguise",
  ],
  PASSING: ["accuracy", "touch", "release", "improvisation"],
  KICKING: ["kickAccuracy", "puntHangTime"],
  SMARTS: [
    "awareness", "reaction", "decisionMaking", "pocketPatience", "poise",
    "playRecognition", "instincts", "vision", "patience", "footballIQ", "gapDiscipline",
  ],
  FIXED: ["volatility", "discipline"],
};
export const ABILITY_GROUP_DIGEST = "35bf298a23dde171f8f7accdcc39be5233f7b33c44b1191f80a7d81716cb24df";

/** Each rating's ability group (FIXED for volatility and discipline). */
export const ABILITY_GROUP_OF: Readonly<Record<string, AbilityGroup | "FIXED">> = Object.fromEntries(
  (Object.entries(ABILITY_GROUP_COPY) as [AbilityGroup | "FIXED", readonly string[]][]).flatMap(([g, ids]) => ids.map((id) => [id, g])),
);

/** The week-8 53s by age and ability (rows version 6). */
export interface AbilityPicture {
  /**
   * By whole-year age (`bio.age` as read), each group's [men, sum of the men's group means]: a man's
   * group mean is the plain mean of the group's ratings he has; one with none of them is not counted.
   */
  readonly byAge: Record<string, Record<AbilityGroup, [number, number]>>;
  /**
   * Ratings at 99, of the 12 groups' ratings (every rating but FIXED's, the same ratings the 99 count
   * of `RosterPicture.ratings` reads): how many ratings were read (`read`), how many were 99 (`total`),
   * and those by rating (every rating of the groups, 0 included), by group and by age.
   */
  readonly at99: {
    readonly read: number; readonly total: number;
    readonly byRating: Record<string, number>; readonly byGroup: Record<AbilityGroup, number>; readonly byAge: Record<string, number>;
  };
  /** The combine measures of the men with a body record (growth on): by age, [men, Σ forty, Σ cone, Σ vertical, Σ bench]. */
  readonly body: Record<string, [number, number, number, number, number]>;
}

const emptyGroups = <T>(make: () => T): Record<AbilityGroup, T> => Object.fromEntries(ABILITY_GROUPS.map((g) => [g, make()])) as Record<AbilityGroup, T>;

/** The ability picture of the men on the teams' 53s (`roster`; the practice squad, reserve lists and free agents left out). */
export function abilityPicture(people: Pick<SeasonPeople, "teams" | "players">): AbilityPicture {
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const byAge: Record<string, Record<AbilityGroup, [number, number]>> = {};
  const byRating: Record<string, number> = {};
  for (const g of ABILITY_GROUPS) for (const id of ABILITY_GROUP_COPY[g]) byRating[id] = 0;
  const byGroup = emptyGroups(() => 0);
  const at99Age: Record<string, number> = {};
  const body: Record<string, [number, number, number, number, number]> = {};
  let read = 0, total = 0;
  for (const t of people.teams) {
    for (const pid of t.roster) {
      const p = byId.get(String(pid));
      if (p === undefined) continue;
      const age = String(p.bio.age);
      const cells = (byAge[age] ??= emptyGroups(() => [0, 0] as [number, number]));
      for (const g of ABILITY_GROUPS) {
        let n = 0, sum = 0;
        for (const id of ABILITY_GROUP_COPY[g]) {
          const v = p.attributes.values[id];
          if (v === undefined) continue;
          n++; sum += v; read++;
          if (v >= 99) { total++; byRating[id]!++; byGroup[g]++; bumpBy(at99Age, age); }
        }
        if (n === 0) continue;
        cells[g][0]++;
        cells[g][1] += sum / n;
      }
      const b = p.attributes.development?.body;
      if (b !== undefined) {
        const c = (body[age] ??= [0, 0, 0, 0, 0]);
        c[0]++; c[1] += b.forty; c[2] += b.cone; c[3] += b.vertical; c[4] += b.bench;
      }
    }
  }
  return { byAge: sortNumericKeys(byAge), at99: { read, total, byRating, byGroup, byAge: sortNumericKeys(at99Age) }, body: sortNumericKeys(body) };
}

// --- the spot a man plays (§12.3.1) --------------------------------------------------------------

/** The chart keys in the order a man on two keys is read at the first of (§12.3.1, CHOSEN): contracts' `Position` order. */
export const SPOT_ORDER: readonly Position[] = [
  "QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT",
  "DE", "DT", "NT", "OLB", "MLB", "ILB", "CB", "FS", "SS", "K", "P", "LS",
];

/**
 * Each man on a team's depth chart and his spot: the first key in `SPOT_ORDER` that lists him. A man
 * the chart leaves off (out hurt, on the practice squad) has no spot here; the reader then reads the
 * spot he last played at this season, else his listed position (`bio.position`), which is the spot
 * teams chart him at today.
 */
export function chartSpots(team: Pick<Team, "depthChart">): Map<string, Position> {
  const out = new Map<string, Position>();
  for (const pos of SPOT_ORDER) for (const id of team.depthChart[pos] ?? []) if (!out.has(String(id))) out.set(String(id), pos);
  return out;
}

/** Kickers, punters and long snappers: left out of the by-age injury and availability rows, as the real side leaves them out. */
export const SPECIALIST_SPOTS: ReadonlySet<Position> = new Set<Position>(["K", "P", "LS"]);

/**
 * The real injury measurement's groups by spot (`injuries/classify.ts`: DE, DT, NT are DL; OLB, ILB,
 * MLB are LB; CB, FS, SS are DB; T, G, C are OL; FB is RB; K, P, LS are K/P): the mix the per-snap
 * age ratio is read against.
 */
export const INJURY_SPOT_GROUP: Readonly<Record<Position, string>> = {
  QB: "QB", RB: "RB", FB: "RB", WR: "WR", TE: "TE",
  LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL",
  DE: "DL", DT: "DL", NT: "DL", OLB: "LB", MLB: "LB", ILB: "LB",
  CB: "DB", FS: "DB", SS: "DB", K: "K/P", P: "K/P", LS: "K/P",
};

// --- contact taken (§12.3.6) ---------------------------------------------------------------------

/** The ratings whose contests are contact (ADR-087 §12.3.6, CHOSEN). */
export const CONTACT_RATINGS: readonly string[] = [
  "runBlock", "passBlock", "sustain", "anchor", "power", "passRush", "powerMove", "blockShed", "runStuff", "tackling",
  "ballSecurity", "catchInTraffic", "elusiveness", "yac",
];

/**
 * `CONTACT_RATINGS` in roll sets: two of them share a set when one contact check's roll names both on
 * the same side (§12.3.6). Read from the engine (MEASURED, 2026-11-07, `DEFAULT_TUNABLES` and the
 * pass-rush and blitz rolls built in `resolve/passRush.ts` and `resolve/blitz.ts`):
 *  - carry: yac_tackle's carrier rolls yac + elusiveness, break_tackle's elusiveness + power, the
 *    stalemate at the line power or elusiveness alone;
 *  - tackle: the STALK block in space's defender rolls blockShed + tackling (CRACK blockShed, the
 *    tackles tackling alone), so the two share a set;
 *  - rush: a pass-rush rep's rusher rolls passRush with powerMove (or finesseMove, firstStep, strength,
 *    none of them contact ratings); protect: its blocker passBlock + footwork + anchor;
 *  - runBlock, runStuff, sustain, catchInTraffic and ballSecurity alone.
 * Two sets count 0 today, because participation credits opposed checks only (`participation.ts`):
 * security (no check names ballSecurity in an opposed roll) and sustain (its one check, the
 * second-level climb in `resolve/runBlock.ts`, rolls against a target, with no opposed roll).
 * Tests walk the engine's term lists and a played game's opposed checks: they fail if one side of one
 * check names contact ratings from two sets, and if a set of two or more ratings is never named
 * together on one side (a set merged too far). AB6's franchise roll-set table must match this one:
 * `CONTACT_ROLL_SETS_DIGEST` is the sha256 of its `JSON.stringify`, for AB6 to pin against, as
 * `ABILITY_GROUP_DIGEST` is for AB3.
 */
export const CONTACT_ROLL_SETS: Readonly<Record<string, readonly string[]>> = {
  carry: ["elusiveness", "power", "yac"],
  tackle: ["tackling", "blockShed"],
  rush: ["passRush", "powerMove"],
  protect: ["passBlock", "anchor"],
  runBlock: ["runBlock"],
  runStuff: ["runStuff"],
  sustain: ["sustain"],
  traffic: ["catchInTraffic"],
  security: ["ballSecurity"],
};
export const CONTACT_ROLL_SETS_DIGEST = "6a0b977a173d5523165035535e299f1c21652b3a0617a13349ca7699fa804a8c";

/**
 * Contact one man took in one game's contests (`GameParticipation.contests`, each contest credited
 * once to every rating its roll named): for each roll set, the largest won + lost among its ratings,
 * summed over the sets. A lower bound on his contact contests that never counts one twice. The
 * regular season plays one game a team a week, so this is also the week's count AB6's counter keeps
 * (it merges a week's contests by rating first).
 */
export function contactOf(contests: GameParticipation["contests"]): number {
  const by = new Map<string, number>();
  for (const c of contests) by.set(String(c.attr), (by.get(String(c.attr)) ?? 0) + c.won + c.lost);
  let sum = 0;
  for (const set of Object.values(CONTACT_ROLL_SETS)) sum += Math.max(0, ...set.map((a) => by.get(a) ?? 0));
  return sum;
}

// --- injuries per snap, by age and spot ----------------------------------------------------------

/**
 * One man's regular-season game: the week, his team, the spot he played at, his snaps of every kind
 * (offense, defense, special teams: the sim's special-teams snaps are the kicker's, the punter's and
 * the returner's alone).
 */
export interface PlayedGame { readonly week: number; readonly team: string; readonly spot: Position; readonly snaps: number }

/**
 * Snaps and injuries by age (whole years in the season) then spot: [snaps, football time-loss injuries
 * after a game he played, of them hurt in the game itself, player-games (games he took a snap in)].
 */
export type ExposureCells = Record<string, Record<string, [number, number, number, number]>>;

/** An injury as the per-snap rows read it. */
export interface InjuryRead {
  readonly player: string;
  readonly at: CalendarStamp;
  readonly setting: "GAME" | "PRACTICE" | "AWAY";
  readonly band: "DAY_TO_DAY" | "SHORT" | "LONG" | "MAJOR";
  readonly kind: string;
  readonly weeks: number;
}

/** The season's injuries (`INJURY_OCCURRED`), stamped, in the order they happened. */
export function injuryReads(events: readonly FranchiseEventEnvelope[]): InjuryRead[] {
  const out: InjuryRead[] = [];
  for (const { at, event: e } of events) {
    if (e.type !== "INJURY_OCCURRED") continue;
    out.push({ player: String(e.payload.player), at, setting: e.payload.setting, band: e.payload.band, kind: e.payload.kind, weeks: e.payload.weeks });
  }
  return out;
}

/**
 * Injuries per snap and per player-game by age and spot, read the real side's way
 * (`reports/injury-rates.md`, "By age" and "By depth-chart spot"):
 *  - snaps: every regular-season snap he took (offense, defense, special teams), at the spot he played
 *    that game (`PlayedGame.spot`) and his age in the season; a player-game is a game with a snap.
 *    The base is narrower than the real side's, whose snaps are PFR's offense + defense + special
 *    teams for all eleven men on every kick (about 17% of real snaps): the sim's special-teams snaps
 *    are the kicker's, the punter's and the returner's alone (no coverage, return-unit or long-snapper
 *    snaps; a punter's holds are not snaps), so a man who plays only on special teams has no snap,
 *    and no player-game, in the sim;
 *  - injuries: football (GAME or PRACTICE; AWAY, which holds illness and the rest away from football,
 *    is left out, as the real count leaves out illness and the non-football list) time-loss (SHORT,
 *    LONG, MAJOR) injuries stamped in a regular-season week, counted after a game he played: the last
 *    regular-season game his team (his team in his latest game) played at or before the injury's week
 *    is one he took a snap in (the real side's onset AFTER_PLAYED; CHOSEN reading). A practice injury
 *    is drawn at the week's end, after that week's game, so it follows that game. Each counts at the
 *    spot and age of that game. `notAfterPlayed` counts the football time-loss injuries left out.
 * The sim knows every injury's length at the draw, so an injury after a team's last game counts too
 * (the real side cannot see those and leaves that game out).
 */
export function injuryExposure(
  played: ReadonlyMap<string, readonly PlayedGame[]>, teamWeeks: ReadonlyMap<string, ReadonlySet<number>>, injuries: readonly InjuryRead[],
  ageOf: (id: string) => number | undefined,
): { cells: ExposureCells; notAfterPlayed: number } {
  const cells: ExposureCells = {};
  const cell = (age: number | undefined, spot: string) => ((cells[age === undefined ? "?" : String(age)] ??= {})[spot] ??= [0, 0, 0, 0]);
  for (const [id, games] of played) {
    for (const g of games) {
      if (g.snaps <= 0) continue;
      const c = cell(ageOf(id), g.spot);
      c[0] += g.snaps;
      c[3]++;
    }
  }
  let notAfterPlayed = 0;
  for (const i of injuries) {
    if (i.at.phase !== "REGULAR_SEASON" || i.band === "DAY_TO_DAY" || i.setting === "AWAY") continue;
    const games = (played.get(i.player) ?? []).filter((g) => g.snaps > 0 && g.week <= i.at.week);
    const last = games.reduce<PlayedGame | undefined>((m, g) => (m === undefined || g.week > m.week ? g : m), undefined);
    const teamLast = last === undefined ? undefined : Math.max(...[...(teamWeeks.get(last.team) ?? [])].filter((w) => w <= i.at.week));
    if (last === undefined || teamLast !== last.week) { notAfterPlayed++; continue; }
    const c = cell(ageOf(i.player), last.spot);
    c[1]++;
    if (i.setting === "GAME") c[2]++;
  }
  const sorted: ExposureCells = {};
  for (const [age, spots] of Object.entries(sortNumericKeys(cells))) sorted[age] = Object.fromEntries(SPOT_ORDER.filter((s) => spots[s] !== undefined).map((s) => [s, spots[s]!]));
  return { cells: sorted, notAfterPlayed };
}

// --- availability, the real side's way -----------------------------------------------------------

/**
 * One team's game week added to availability by age, the real side's way (`reports/injury-rates.md`,
 * "Game weeks"): of the men on its 53 (`roster`) or a reserve list (`reserve`) on the game's day, a
 * game week is one he played (a snap in the game), was on the 53 healthy and did not play, or missed
 * hurt (an injury of any setting, illness included, and he took no snap, on the 53 or a reserve
 * list); the second count is the weeks missed hurt. A healthy man on a reserve list is not counted (the
 * real side never counts suspension lists and the like). Kickers, punters and long snappers (by spot,
 * `spotOf`) are left out, as the real side leaves listed K/P out. Ages are `bio.age` as read.
 * Keyed by whole-year age: [game weeks, missed hurt].
 */
export function addGameWeeks(
  into: Record<string, [number, number]>, team: Pick<Team, "roster" | "reserve">, byId: ReadonlyMap<string, PlayerState>,
  played: ReadonlySet<string>, spotOf: (p: PlayerState) => Position,
): void {
  const onRoster = new Set(team.roster.map(String));
  const seen = new Set<string>();
  for (const id of [...team.roster, ...(team.reserve ?? [])].map(String)) {
    if (seen.has(id)) continue;
    seen.add(id);
    const p = byId.get(id);
    if (p === undefined || SPECIALIST_SPOTS.has(spotOf(p))) continue;
    const hurt = p.condition.injury !== undefined;
    if (!played.has(id) && !hurt && !onRoster.has(id)) continue;
    const c = (into[String(p.bio.age)] ??= [0, 0]);
    c[0]++;
    if (!played.has(id) && hurt) c[1]++;
  }
}

// --- concussions ---------------------------------------------------------------------------------

/** The sim's concussion kind (franchise `INJURY_KINDS.concussion`; calibration may not import franchise's tables). */
export const CONCUSSION_KIND = "concussion";

/**
 * Concussion lengths: [time-loss football concussions in the regular season, of them out 4+ weeks],
 * first and later; and by age in the season, [concussions, out 4+ weeks, of them later ones], so a
 * longer absence with age can be told from the priors older men carry (§12.3.3, "Concussion: not yet").
 * `first` and `repeat` split by `priorOfKind`'s reading (every earlier concussion draw); `seen` splits
 * the same concussions the real side's way (an earlier one counted here: see `concussionLengths`).
 */
export interface ConcussionTally {
  readonly first: [number, number]; readonly repeat: [number, number]; readonly byAge: Record<string, [number, number, number]>;
  readonly seen: { readonly first: [number, number]; readonly repeat: [number, number] };
}

/**
 * A season's concussions (its injuries in order), each read against how many concussions the man
 * had before it, two ways, each count the walk's own and carried between seasons:
 *  - `prior`: every concussion draw of the walk (any phase, setting or band: a day-to-day one, one in
 *    camp, the playoffs or away from football all count), as franchise's `priorOfKind` counts his past
 *    injuries of the kind. This is the split §12.3.4's repeat rule (AB6) works on: `first`, `repeat`
 *    and `byAge`'s later ones.
 *  - `seen`: the earlier concussions this tally itself counts (time-loss football ones of a regular
 *    season), the real side's "second or later" (`injury-rates.md`, "Repeat concussions": an earlier
 *    time-loss spell seen in a regular season since 2019). A man whose only earlier one was day to day,
 *    in camp, in the playoffs or away is later by `prior` and first by `seen`. One difference stays: a
 *    camp concussion that costs regular-season games is a real spell (any onset) but is stamped in camp
 *    here, so it is neither counted nor a `seen` prior.
 * The tally reads the time-loss (SHORT, LONG, MAJOR) football (GAME, PRACTICE) concussions of the
 * regular season, as the real side counts "every football spell with body part concussion/head" in its
 * regular seasons; out 4+ weeks reads the draw's length (`weeks` ≥ 4), as the real side's Kaplan-Meier
 * share out 4+ weeks. The league file's current injuries (`real:` kinds) are not draws and count as no
 * prior either way. Ages are `ageOf` (his age in the season; "?" not known). Returns the tally and both
 * counts after the season.
 */
export function concussionLengths(
  injuries: readonly InjuryRead[], prior: ReadonlyMap<string, number>, ageOf: (id: string) => number | undefined = () => undefined,
  seenBefore: ReadonlyMap<string, number> = new Map(),
): { tally: ConcussionTally; counts: Map<string, number>; seen: Map<string, number> } {
  const counts = new Map(prior);
  const seen = new Map(seenBefore);
  const first: [number, number] = [0, 0], repeat: [number, number] = [0, 0];
  const seenFirst: [number, number] = [0, 0], seenRepeat: [number, number] = [0, 0];
  const byAge: Record<string, [number, number, number]> = {};
  for (const i of injuries) {
    if (i.kind !== CONCUSSION_KIND) continue;
    const before = counts.get(i.player) ?? 0;
    counts.set(i.player, before + 1);
    if (i.at.phase !== "REGULAR_SEASON" || i.band === "DAY_TO_DAY" || i.setting === "AWAY") continue;
    const t = before === 0 ? first : repeat;
    const out4 = i.weeks >= 4;
    t[0]++;
    if (out4) t[1]++;
    const seenAlready = seen.get(i.player) ?? 0;
    seen.set(i.player, seenAlready + 1);
    const ts = seenAlready === 0 ? seenFirst : seenRepeat;
    ts[0]++;
    if (out4) ts[1]++;
    const age = ageOf(i.player);
    const a = (byAge[age === undefined ? "?" : String(age)] ??= [0, 0, 0]);
    a[0]++;
    if (out4) a[1]++;
    if (before > 0) a[2]++;
  }
  return { tally: { first, repeat, byAge: sortNumericKeys(byAge), seen: { first: seenFirst, repeat: seenRepeat } }, counts, seen };
}

/** The registry id of the durability rating (`ATTRIBUTE_REGISTRY_V1`; a test holds it there). */
export const DURABILITY = "durability";

/** The classes of `durabilityByConcussions`: none, one, two, three or more. */
export const CONCUSSION_CLASSES = ["0", "1", "2", "3+"] as const;

/**
 * Durability on the 53s by how many concussions each man has had (his `PlayerMemory.injuries` of the
 * concussion kind, the sim's own record, the injury he is out with included): for none, one, two, three
 * or more, [men, Σ durability, Σ age], so the class's mean age shows beside its mean durability.
 */
export function durabilityByConcussions(people: Pick<SeasonPeople, "teams" | "players" | "playerMemory">): Record<(typeof CONCUSSION_CLASSES)[number], [number, number, number]> {
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const history = people.playerMemory?.injuries ?? {};
  const out = Object.fromEntries(CONCUSSION_CLASSES.map((c) => [c, [0, 0, 0]])) as Record<(typeof CONCUSSION_CLASSES)[number], [number, number, number]>;
  for (const t of people.teams) {
    for (const id of t.roster) {
      const p = byId.get(String(id));
      const d = p?.attributes.values[DURABILITY];
      if (p === undefined || d === undefined) continue;
      const n = (history[String(id)] ?? []).filter((x) => x.kind === CONCUSSION_KIND).length;
      const c = out[CONCUSSION_CLASSES[Math.min(3, n)]!];
      c[0]++; c[1] += d; c[2] += p.bio.age;
    }
  }
  return out;
}

// --- new picks not kept at their first week 1 (the salary-cap thread's request, 2026-11-07) ----------

/**
 * A new draft pick of the walk, waiting for his first regular-season week 1: his drafting team (the
 * `DRAFT_PICK_MADE` payload's), round, draft year (the season after the one whose offseason held the
 * draft, as the draft check reads it), and whether his drafting team has let him go since his pick
 * (a `PLAYER_RELEASED` by that team stamped before his first week 1's day 1).
 */
export interface PendingPick { readonly team: string; readonly round: number; readonly year: number; readonly released: boolean }

/** The first day of a season's first regular-season week: the day the week-1 53s are read. */
export const firstWeekOne = (season: number): CalendarStamp => ({ season, phase: "REGULAR_SEASON", week: 1, day: 1 });

/**
 * One season's stamped events, in order, into the picks waiting for their first week 1: each
 * `DRAFT_PICK_MADE` of its draft adds a pick (draft year `season` + 1); each `PLAYER_RELEASED` of a
 * waiting pick by his drafting team, before his first week 1's day 1, marks him let go. Season S's
 * own events reach class S's picks too (cut-down day and camp, before week 1).
 */
export function readPicks(picks: Map<string, PendingPick>, events: readonly FranchiseEventEnvelope[], season: number): void {
  for (const { at, event: e } of events) {
    if (e.type === "DRAFT_PICK_MADE") {
      picks.set(String(e.payload.player), { team: String(e.payload.team), round: e.payload.round, year: season + 1, released: false });
    } else if (e.type === "PLAYER_RELEASED") {
      const p = picks.get(String(e.payload.player));
      if (p !== undefined && !p.released && String(e.payload.team) === p.team && compareStamps(at, firstWeekOne(p.year)) < 0) {
        picks.set(String(e.payload.player), { ...p, released: true });
      }
    }
  }
}

/** Where a pick is at his first week 1's day 1. */
export type WeekOnePlace = "own" | "ownSquad" | "other" | "otherSquad" | "none";
/** A pick read at his first week 1: where he is, and (not on his drafting team's 53 or reserve lists) his overall less the weakest kept at his spot. */
export interface WeekOneRead { readonly place: WeekOnePlace; readonly gap: number | null }

/**
 * The picks of draft year `season` at that season's week 1, day 1 (the people as the day starts):
 * on his drafting team's 53 (`roster`) or reserve lists (`reserve`); on its practice squad; on another
 * team's 53 or reserve lists; on another team's practice squad; on no team's list. A pick not on his
 * drafting team's 53 or reserve lists gets a gap (CHOSEN reading, both at the pick's listed position
 * `bio.position`, `positionOverall`): his overall less the weakest overall among the men his drafting
 * team charts at that key (`depthChart[bio.position]`) on its 53 that day, to a tenth of a point; null if
 * he is not among the people or the team charts no one there.
 */
export function rookieWeekOne(
  people: Pick<SeasonPeople, "teams" | "players">, picks: ReadonlyMap<string, PendingPick>, season: number,
): Map<string, WeekOneRead> {
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const teamOf = new Map<string, { team: string; squad: boolean }>();
  for (const t of people.teams) {
    for (const id of [...t.roster, ...(t.reserve ?? [])]) teamOf.set(String(id), { team: String(t.id), squad: false });
    for (const id of t.practiceSquad ?? []) if (!teamOf.has(String(id))) teamOf.set(String(id), { team: String(t.id), squad: true });
  }
  const teams = new Map(people.teams.map((t) => [String(t.id), t]));
  const out = new Map<string, WeekOneRead>();
  for (const [id, pick] of picks) {
    if (pick.year !== season) continue;
    const on = teamOf.get(id);
    const place: WeekOnePlace = on === undefined ? "none" : on.team === pick.team ? (on.squad ? "ownSquad" : "own") : on.squad ? "otherSquad" : "other";
    let gap: number | null = null;
    const p = byId.get(id), t = teams.get(pick.team);
    if (place !== "own" && p !== undefined && t !== undefined) {
      const at = p.bio.position;
      const onRoster = new Set(t.roster.map(String));
      const kept = (t.depthChart[at] ?? []).map(String).filter((x) => onRoster.has(x) && x !== id).map((x) => byId.get(x))
        .filter((q): q is PlayerState => q !== undefined).map((q) => positionOverall(at, q.attributes.values));
      if (kept.length > 0) gap = Math.round(10 * (positionOverall(at, p.attributes.values) - Math.min(...kept))) / 10;
    }
    out.set(id, { place, gap });
  }
  return out;
}

/** A round's picks at their first week 1 (`rookieCutOf`). */
export interface RookieCutCell {
  /** Picks read. */
  readonly n: number;
  /** On his drafting team's 53 or reserve lists. */
  readonly kept: number;
  /** On another team's 53 or reserve lists, never let go by his drafting team (a trade): counted kept. */
  readonly movedKept: number;
  /** On his drafting team's practice squad. */
  readonly squad: number;
  /** Let go by his drafting team and on another team's 53, reserve lists or practice squad, or moved to another team's practice squad. */
  readonly elsewhere: number;
  /** On no team's list. */
  readonly gone: number;
}

/** One class at its first week 1, by round: the counts, and the not-kept picks' gaps (`rookieWeekOne`). */
export interface RookieCut { readonly year: number; readonly byRound: Record<string, RookieCutCell>; readonly gaps: Record<string, number[]> }

/**
 * Class `season` at its first week 1, by round: kept (his drafting team's 53 or reserve lists), moved
 * and kept (another team's 53 or reserve lists, never let go by his drafting team: a trade, counted
 * kept), on his drafting team's practice squad, elsewhere (let go, then on another team's list, or on
 * another team's practice squad), or gone (no team). Not kept = n − kept − movedKept, the real side's
 * "not on his team's week-1 roster or reserve lists". `gaps` holds each not-kept pick's gap, sorted.
 * Null when no class of the walk reaches its week 1 that season: no pick has draft year `season` (the
 * walk's first season, whose class was drafted before the walk), or no week 1 was walked (`weekOne` null).
 */
export function rookieCutOf(season: number, picks: ReadonlyMap<string, PendingPick>, weekOne: ReadonlyMap<string, WeekOneRead> | null): RookieCut | null {
  if (weekOne === null || ![...picks.values()].some((p) => p.year === season)) return null;
  const byRound: Record<string, { n: number; kept: number; movedKept: number; squad: number; elsewhere: number; gone: number }> = {};
  const gaps: Record<string, number[]> = {};
  for (const [id, pick] of picks) {
    if (pick.year !== season) continue;
    const r = String(pick.round);
    const c = (byRound[r] ??= { n: 0, kept: 0, movedKept: 0, squad: 0, elsewhere: 0, gone: 0 });
    c.n++;
    const read = weekOne.get(id) ?? { place: "none" as const, gap: null };
    const kept = read.place === "own" || (read.place === "other" && !pick.released);
    if (read.place === "own") c.kept++;
    else if (read.place === "other" && !pick.released) c.movedKept++;
    else if (read.place === "ownSquad") c.squad++;
    else if (read.place === "none") c.gone++;
    else c.elsewhere++;
    if (!kept && read.gap !== null) (gaps[r] ??= []).push(read.gap);
  }
  for (const xs of Object.values(gaps)) xs.sort((a, b) => a - b);
  return { year: season, byRound: sortNumericKeys(byRound), gaps: sortNumericKeys(gaps) };
}
