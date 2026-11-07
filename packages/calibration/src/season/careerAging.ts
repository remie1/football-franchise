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
 * - Injuries per snap by age and spot (`injuryExposure`), read the way the real side reads them.
 * - Availability by age read the real side's way (`addGameWeeks`).
 * - Concussion lengths, first and later (`concussionLengths`), and durability by how many
 *   concussions a man has had (`durabilityByConcussions`).
 *
 * Every number these give is MEASURED (the sim's). Each rule below that is not the real side's own is
 * CHOSEN, and says so.
 */
import { ABILITY_GROUPS, type AbilityGroup, type CalendarStamp, type FranchiseEventEnvelope, type GameParticipation, type PlayerState, type Position, type Team } from "@ff/contracts";
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
 *  - runBlock, runStuff, sustain, catchInTraffic and ballSecurity alone (no check names ballSecurity
 *    in an opposed roll today, so it counts 0).
 * A test walks the engine's term lists and a played game's opposed checks and fails if one side of
 * one check names contact ratings from two sets.
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

/** One man's regular-season game: the week, his team, the spot he played at, his snaps of every kind (offense, defense, special teams). */
export interface PlayedGame { readonly week: number; readonly team: string; readonly spot: Position; readonly snaps: number }

/**
 * Snaps and injuries by age (whole years in the season) then spot: [snaps, football time-loss injuries
 * after a game he played, of them hurt in the game itself].
 */
export type ExposureCells = Record<string, Record<string, [number, number, number]>>;

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
 * Injuries per snap by age and spot, read the real side's way (`reports/injury-rates.md`, "By age"
 * and "By depth-chart spot"):
 *  - snaps: every regular-season snap he took (offense, defense, special teams), at the spot he played
 *    that game (`PlayedGame.spot`) and his age in the season;
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
  const cell = (age: number | undefined, spot: string) => ((cells[age === undefined ? "?" : String(age)] ??= {})[spot] ??= [0, 0, 0]);
  for (const [id, games] of played) for (const g of games) if (g.snaps > 0) cell(ageOf(id), g.spot)[0] += g.snaps;
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
 */
export interface ConcussionTally { readonly first: [number, number]; readonly repeat: [number, number]; readonly byAge: Record<string, [number, number, number]> }

/**
 * A season's concussions (its injuries in order), each read against how many concussions the man
 * had before it (`prior`, the walk's own count, carried between seasons): every concussion draw of the
 * walk counts as a prior (any phase, setting or band), as franchise's `priorOfKind` counts his past
 * injuries of the kind. The tally reads the time-loss (SHORT, LONG, MAJOR) football (GAME, PRACTICE)
 * concussions of the regular season, as the real side counts "every football spell with body part
 * concussion/head" in its regular seasons; out 4+ weeks reads the draw's length (`weeks` ≥ 4), as the
 * real side's Kaplan-Meier share out 4+ weeks. The league file's current injuries (`real:` kinds)
 * are not draws and count as no prior. Ages are `ageOf` (his age in the season; "?" not known).
 * Returns the tally and the counts after the season.
 */
export function concussionLengths(
  injuries: readonly InjuryRead[], prior: ReadonlyMap<string, number>, ageOf: (id: string) => number | undefined = () => undefined,
): { tally: ConcussionTally; counts: Map<string, number> } {
  const counts = new Map(prior);
  const first: [number, number] = [0, 0], repeat: [number, number] = [0, 0];
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
    const age = ageOf(i.player);
    const a = (byAge[age === undefined ? "?" : String(age)] ??= [0, 0, 0]);
    a[0]++;
    if (out4) a[1]++;
    if (before > 0) a[2]++;
  }
  return { tally: { first, repeat, byAge: sortNumericKeys(byAge) }, counts };
}

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
      const d = p?.attributes.values.durability;
      if (p === undefined || d === undefined) continue;
      const n = (history[String(id)] ?? []).filter((x) => x.kind === CONCUSSION_KIND).length;
      const c = out[CONCUSSION_CLASSES[Math.min(3, n)]!];
      c[0]++; c[1] += d; c[2] += p.bio.age;
    }
  }
  return out;
}
