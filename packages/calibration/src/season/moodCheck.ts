/**
 * ADR-096 step 2's many-season look (`mood-check`): are fans furious all the time?
 *
 * Plays the stand-in league through the cap check's walk (real sim, the league year, the draft, the
 * coaches' carousel, growth and injuries) with franchise's mood step on, and counts, per team-season
 * of regular-season games, how often each audience's team mood sits at each level and how often each
 * hot take's MOOD side would be live. The takes themselves are narrative's (step 3); the parts that
 * need more than mood (a backup within 6 points, a player who could really be had, a market price)
 * are left to that step and say so in the report.
 *
 * There is no counted real figure for "how often a fan base is furious"; every share printed here is
 * ours alone, to look at, not a target. The game's real-football numbers it prints beside them (our
 * league's home margin) are measured from this walk.
 *
 * Reads only events and the season's state (contracts types): no franchise import beyond the walk's.
 */
import type { FranchiseEventEnvelope, GameResult, MoodReading, SeasonState, WinLossTie } from "@ff/contracts";

type MoodEvent = Extract<FranchiseEventEnvelope["event"], { type: "PUBLIC_MOOD_UPDATED" }>;

/**
 * The chance of making the playoffs from a record with games left: COPIED from franchise's
 * `winNow/stance.ts` (`PLAYOFF_ODDS`, MEASURED from our league's seasons, ADR-094), so this check
 * needs no import beyond the walk's. Used for TANK's "playoff chance under 10%".
 */
const PLAYOFF_ODDS = { center: 8.93, scale: 0.46, perGameLeft: 0.11, shrink: 17.6 };
export function playoffChance(record: WinLossTie, gamesLeft: number): number {
  const wins = record.wins + record.ties / 2;
  const played = record.wins + record.losses + record.ties;
  const onCourse = wins + gamesLeft * (wins + PLAYOFF_ODDS.shrink / 2) / (played + PLAYOFF_ODDS.shrink);
  const spread = Math.sqrt(PLAYOFF_ODDS.scale * PLAYOFF_ODDS.scale + PLAYOFF_ODDS.perGameLeft * gamesLeft);
  return 1 / (1 + Math.exp(-(onCourse - PLAYOFF_ODDS.center) / spread));
}

/** The mood lines ADR-096 §4 draws for each take (CHOSEN there). */
export const TAKE_LINES = {
  FIRE: -60, FIRE_DURING_STREAK: -40, STREAK: 3,
  BENCH: -40, BENCH_GAMES: 2,
  TRADE_AWAY: -30,
  PAY_HIM: 40,
  TANK_MOOD: -50, TANK_CHANCE: 0.1,
} as const;
export const LEVELS = [-60, -40, 40, 60] as const;
export const TAKES = ["FIRE", "BENCH", "TRADE_AWAY", "PAY_HIM", "TANK"] as const;
export type Take = typeof TAKES[number];

export interface MoodSeasonTally {
  season: number;
  /** Team-weeks (a regular-season game each). */
  teamWeeks: number;
  /** Team-weeks at or past each level, by audience: "-60" counts at or below -60, "40" at or above 40. */
  levels: Record<"FANS" | "MEDIA", Record<string, number>>;
  /** Team-seasons whose fans were at -60 or lower for at least one week, and for 4 or more weeks. */
  furiousOnce: number;
  furiousLong: number;
  /** Each take: team-weeks its mood side was live, and team-seasons it was live at least once. */
  takeWeeks: Record<Take, number>;
  takeSeasons: Record<Take, number>;
  /** FIRE by seat: team-seasons with the seat's man live at least once. */
  fireBySeat: Record<string, number>;
  /** Mean absolute team mood after each game, by audience. */
  meanAbs: Record<"FANS" | "MEDIA", number>;
  /** Mean final regular-season team fan mood by wins: 0-4, 5-8, 9-12, 13+. */
  byWins: Record<string, { teams: number; fans: number; media: number }>;
  /** Our league's mean home margin in the regular season (for `MOOD.homeEdge`). */
  homeMargin: number;
  games: number;
  /** Head coaches and GMs fired (any time), and those whose last fan reading was -40 or lower. */
  fired: number;
  firedAngry: number;
  /** The largest watch list seen. */
  maxWatch: number;
}

const winsBucket = (w: number) => (w <= 4 ? "0-4" : w <= 8 ? "5-8" : w <= 12 ? "9-12" : "13+");
const teamValue = (rs: readonly MoodReading[], a: "FANS" | "MEDIA") => rs.find((r) => r.audience === a && r.subject.kind === "TEAM")?.value ?? 0;

/** One season's tally from its events (stamped) and its state. */
export function tallyMoodSeason(season: number, events: readonly FranchiseEventEnvelope[], state: SeasonState): MoodSeasonTally {
  const weekOf = new Map(state.schedule.games.filter((g) => g.kind === "REGULAR").map((g) => [String(g.gameId), g.at.week]));
  const regular = state.results.filter((r) => weekOf.has(String(r.gameId)));
  const gamesOf = new Map<string, number>();
  for (const g of state.schedule.games) if (g.kind === "REGULAR") for (const t of [g.home, g.away]) gamesOf.set(String(t), (gamesOf.get(String(t)) ?? 0) + 1);
  const recordAfter = (team: string, week: number): { record: WinLossTie; left: number } => {
    const record = { wins: 0, losses: 0, ties: 0 };
    let played = 0;
    for (const r of regular as GameResult[]) {
      if ((weekOf.get(String(r.gameId)) ?? 99) > week) continue;
      const home = String(r.home) === team, away = String(r.away) === team;
      if (!home && !away) continue;
      played++;
      const own = home ? r.homeScore - r.awayScore : r.awayScore - r.homeScore;
      if (own > 0) record.wins++; else if (own < 0) record.losses++; else record.ties++;
    }
    return { record, left: (gamesOf.get(team) ?? 0) - played };
  };

  const t: MoodSeasonTally = {
    season, teamWeeks: 0,
    levels: { FANS: Object.fromEntries(LEVELS.map((l) => [String(l), 0])), MEDIA: Object.fromEntries(LEVELS.map((l) => [String(l), 0])) },
    furiousOnce: 0, furiousLong: 0,
    takeWeeks: Object.fromEntries(TAKES.map((k) => [k, 0])) as Record<Take, number>,
    takeSeasons: Object.fromEntries(TAKES.map((k) => [k, 0])) as Record<Take, number>,
    fireBySeat: { HEAD_COACH: 0, GM: 0, OC: 0, DC: 0 },
    meanAbs: { FANS: 0, MEDIA: 0 }, byWins: {}, homeMargin: 0, games: regular.length, fired: 0, firedAngry: 0, maxWatch: 0,
  };
  t.homeMargin = regular.reduce((s, r) => s + r.homeScore - r.awayScore, 0) / Math.max(1, regular.length);

  const byTeam = new Map<string, { week: number; readings: MoodReading[] }[]>();
  const lastFan = new Map<string, number>(); // staff id → his last fan reading
  for (const e of events) {
    if (e.event.type === "STAFF_DEPARTED" && e.event.payload.reason === "FIRED") {
      const v = lastFan.get(String(e.event.payload.staff));
      if (v !== undefined) { t.fired++; if (v <= -40) t.firedAngry++; }
    }
    if (e.event.type !== "PUBLIC_MOOD_UPDATED") continue;
    const m = (e.event as MoodEvent).payload;
    for (const r of m.readings) if (r.audience === "FANS" && r.subject.kind === "STAFF" && (r.subject.seat === "HEAD_COACH" || r.subject.seat === "GM")) lastFan.set(String(r.subject.staff), r.value);
    if (e.at.phase !== "REGULAR_SEASON" || m.week === undefined) continue;
    const rows = byTeam.get(String(m.team)) ?? [];
    rows.push({ week: m.week, readings: m.readings });
    byTeam.set(String(m.team), rows);
  }

  for (const [team, rows] of byTeam) {
    let furious = 0;
    const live = new Set<Take>();
    const seatsLive = new Set<string>();
    const lowRun = new Map<string, number>(); // player → straight game-weeks at or below BENCH
    for (const { week, readings } of rows) {
      t.teamWeeks++;
      t.maxWatch = Math.max(t.maxWatch, readings.filter((r) => r.audience === "FANS" && r.subject.kind === "PLAYER").length);
      for (const a of ["FANS", "MEDIA"] as const) {
        const v = teamValue(readings, a);
        t.meanAbs[a] += Math.abs(v);
        for (const l of LEVELS) if (l < 0 ? v <= l : v >= l) t.levels[a][String(l)]!++;
      }
      const fans = teamValue(readings, "FANS");
      if (fans <= -60) furious++;
      const causes = readings.find((r) => r.audience === "FANS" && r.subject.kind === "TEAM")?.causes ?? [];
      const streak = causes.map((c) => /^LOSING_STREAK_(\d+)$/.exec(c)).find((x) => x)?.[1];
      const losing = streak !== undefined && Number(streak) >= TAKE_LINES.STREAK;
      const weekTakes = new Set<Take>();
      for (const r of readings) {
        if (r.audience !== "FANS") continue;
        if (r.subject.kind === "STAFF" && (r.value <= TAKE_LINES.FIRE || (losing && r.value <= TAKE_LINES.FIRE_DURING_STREAK))) {
          weekTakes.add("FIRE"); seatsLive.add(r.subject.seat);
        }
        if (r.subject.kind === "PLAYER") {
          const id = String(r.subject.player);
          const run = r.value <= TAKE_LINES.BENCH ? (lowRun.get(id) ?? 0) + 1 : 0;
          lowRun.set(id, run);
          if (run >= TAKE_LINES.BENCH_GAMES) weekTakes.add("BENCH");
          if (r.value <= TAKE_LINES.TRADE_AWAY) weekTakes.add("TRADE_AWAY");
          if (r.value >= TAKE_LINES.PAY_HIM) weekTakes.add("PAY_HIM");
        }
      }
      const rec = recordAfter(team, week);
      if (fans <= TAKE_LINES.TANK_MOOD && playoffChance(rec.record, rec.left) < TAKE_LINES.TANK_CHANCE) weekTakes.add("TANK");
      for (const k of weekTakes) { t.takeWeeks[k]++; live.add(k); }
    }
    if (furious >= 1) t.furiousOnce++;
    if (furious >= 4) t.furiousLong++;
    for (const k of live) t.takeSeasons[k]++;
    for (const s of seatsLive) t.fireBySeat[s] = (t.fireBySeat[s] ?? 0) + 1;
    const last = rows[rows.length - 1]!;
    const wins = recordAfter(team, 99).record.wins;
    const b = (t.byWins[winsBucket(wins)] ??= { teams: 0, fans: 0, media: 0 });
    b.teams++; b.fans += teamValue(last.readings, "FANS"); b.media += teamValue(last.readings, "MEDIA");
  }
  for (const a of ["FANS", "MEDIA"] as const) t.meanAbs[a] /= Math.max(1, t.teamWeeks);
  for (const b of Object.values(t.byWins)) { b.fans /= b.teams; b.media /= b.teams; }
  return t;
}

/** Many seasons' tallies as one: counts summed, means weighted. */
export function sumTallies(ts: readonly MoodSeasonTally[]): MoodSeasonTally & { seasons: number; teamSeasons: number } {
  const out = tallyMoodSeason(0, [], { season: 0, schedule: { season: 0, games: [] }, results: [], standings: [] } as unknown as SeasonState);
  let teamSeasons = 0;
  for (const t of ts) {
    out.teamWeeks += t.teamWeeks;
    for (const a of ["FANS", "MEDIA"] as const) {
      for (const l of LEVELS) out.levels[a][String(l)]! += t.levels[a][String(l)]!;
      out.meanAbs[a] += t.meanAbs[a] * t.teamWeeks;
    }
    out.furiousOnce += t.furiousOnce; out.furiousLong += t.furiousLong;
    for (const k of TAKES) { out.takeWeeks[k] += t.takeWeeks[k]; out.takeSeasons[k] += t.takeSeasons[k]; }
    for (const [s, n] of Object.entries(t.fireBySeat)) out.fireBySeat[s] = (out.fireBySeat[s] ?? 0) + n;
    for (const [k, b] of Object.entries(t.byWins)) {
      const o = (out.byWins[k] ??= { teams: 0, fans: 0, media: 0 });
      o.fans += b.fans * b.teams; o.media += b.media * b.teams; o.teams += b.teams;
    }
    out.homeMargin += t.homeMargin * t.games; out.games += t.games;
    out.fired += t.fired; out.firedAngry += t.firedAngry; out.maxWatch = Math.max(out.maxWatch, t.maxWatch);
    teamSeasons += Object.values(t.byWins).reduce((s, b) => s + b.teams, 0);
  }
  for (const a of ["FANS", "MEDIA"] as const) out.meanAbs[a] /= Math.max(1, out.teamWeeks);
  for (const b of Object.values(out.byWins)) { b.fans /= b.teams; b.media /= b.teams; }
  out.homeMargin /= Math.max(1, out.games);
  return { ...out, seasons: ts.length, teamSeasons };
}

const pct = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(1)}%`;

/** The report, in plain words. */
export function moodReport(ts: readonly MoodSeasonTally[], meta: { league: string; seed: string; build: string }): string {
  const s = sumTallies(ts);
  const lines: string[] = [];
  lines.push("# Fan and media mood over many seasons (ADR-096 step 2, `mood-check`)", "");
  lines.push(`League: ${meta.league}, seed \`${meta.seed}\`, ${s.seasons} seasons, ${s.teamSeasons} team-seasons, ${s.teamWeeks} team-weeks of regular-season games. Build ${meta.build}.`, "");
  lines.push("No real count exists for how often a fan base is furious; every share here is ours alone, to look at, not a target.", "");
  lines.push("## How the team mood sits after each game", "");
  lines.push("| | -60 or lower (furious) | -40 or lower | +40 or higher | +60 or higher | mean distance from 0 |", "|---|---|---|---|---|---|");
  for (const a of ["FANS", "MEDIA"] as const) {
    lines.push(`| ${a === "FANS" ? "Fans" : "Media"} | ${pct(s.levels[a]["-60"]!, s.teamWeeks)} | ${pct(s.levels[a]["-40"]!, s.teamWeeks)} | ${pct(s.levels[a]["40"]!, s.teamWeeks)} | ${pct(s.levels[a]["60"]!, s.teamWeeks)} | ${s.meanAbs[a].toFixed(1)} |`);
  }
  lines.push("", `Team-seasons whose fans were furious (-60 or lower) at least one week: ${pct(s.furiousOnce, s.teamSeasons)}; four weeks or more: ${pct(s.furiousLong, s.teamSeasons)}.`, "");
  lines.push("## Final regular-season mood by wins", "", "| Wins | Teams | Fans | Media |", "|---|---|---|---|");
  for (const k of ["0-4", "5-8", "9-12", "13+"]) {
    const b = s.byWins[k];
    if (b) lines.push(`| ${k} | ${b.teams} | ${b.fans.toFixed(1)} | ${b.media.toFixed(1)} |`);
  }
  lines.push("", "## How often each hot take's mood side is live", "");
  lines.push("Only the mood part of each take (ADR-096 §4). Step 3 adds the rest: BENCH needs a backup within 6 points, TRADE_AWAY an old or overpaid man, PAY_HIM a contract's last year, GO_GET a player who could really be had (not counted here at all), so the real rates will be lower.", "");
  lines.push("| Take | Mood line | Team-weeks live | Team-seasons live at least once |", "|---|---|---|---|");
  const line: Record<Take, string> = {
    FIRE: "a seat at -60, or -40 in a 3-game losing streak",
    BENCH: "a watch-list player at -40 for 2+ games",
    TRADE_AWAY: "a watch-list player at -30",
    PAY_HIM: "a watch-list player at +40",
    TANK: "team at -50 and playoff chance under 10%",
  };
  for (const k of TAKES) lines.push(`| ${k} | ${line[k]} | ${pct(s.takeWeeks[k], s.teamWeeks)} | ${pct(s.takeSeasons[k], s.teamSeasons)} |`);
  lines.push("", `FIRE by seat (team-seasons live at least once): head coach ${pct(s.fireBySeat.HEAD_COACH ?? 0, s.teamSeasons)}, GM ${pct(s.fireBySeat.GM ?? 0, s.teamSeasons)}, OC ${pct(s.fireBySeat.OC ?? 0, s.teamSeasons)}, DC ${pct(s.fireBySeat.DC ?? 0, s.teamSeasons)}.`, "");
  lines.push("## Other numbers", "");
  lines.push(`- Head coaches and GMs fired: ${s.fired}; with their last fan reading at -40 or lower: ${pct(s.firedAngry, s.fired)} (mood does not push firings yet; part 6 is later).`);
  lines.push(`- Largest watch list seen: ${s.maxWatch} (the cap is 6).`);
  lines.push(`- Our league's home margin: ${s.homeMargin.toFixed(2)} points a game over ${s.games} games (the engine plays no home field; \`MOOD.homeEdge\` is 0; the real NFL's is about 1.5 to 2).`);
  lines.push("", "## Each season", "", "| Season | Team-weeks | Fans furious | Fans -40 or lower | FIRE seasons | TANK seasons |", "|---|---|---|---|---|---|");
  for (const t of ts) {
    const teams = Object.values(t.byWins).reduce((n, b) => n + b.teams, 0);
    lines.push(`| ${t.season} | ${t.teamWeeks} | ${pct(t.levels.FANS["-60"]!, t.teamWeeks)} | ${pct(t.levels.FANS["-40"]!, t.teamWeeks)} | ${pct(t.takeSeasons.FIRE, teams)} | ${pct(t.takeSeasons.TANK, teams)} |`);
  }
  return `${lines.join("\n")}\n`;
}
