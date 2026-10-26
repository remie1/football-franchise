/**
 * THE POCKET FIX'S CONSTRUCT IDS (ADR-089 step 0; plan §3.5).
 *
 * One `as const` list of every construct id that the rows, the M tables and the bands share, so
 * that S2 (registry rows), S3 (measurements, benches and report rows) and S4 (the filing) all key
 * by the same names and each compiles alone (C2-B3). C3's `adr089Comparators` test checks that
 * every filed clause's comparator is one of these or an `allMetrics()` id, and that the filing's
 * M block has exactly the M ids.
 *
 * `home` says where each construct is computed:
 *  - `registry`: a metric registered in `src/metrics` (S2, plan §5), a pure fold of the events.
 *    Its id and definition pass the registry's word guard (`metrics/absence.ts`).
 *  - `pocket-row`: a pocket report row in `src/pocket` (S3, plan §6.4): it needs the snapshot, the
 *    tunables or the quarterback's decision bar, so it is not a registry row (deviation O18).
 *  - `m-table`: one of M1 to M9 (plan §6.2), keyed by its M id in the filing.
 *  - `bench`: a bench's output (plan §6.3).
 *
 * Adding an id is an edit to this file; renaming or removing one after the filing is pinned is an
 * amendment (plan §8.1).
 */

export type ConstructHome = "registry" | "pocket-row" | "m-table" | "bench";

export const CONSTRUCTS = [
  // --- S2: registry rows (plan §5) -----------------------------------------
  { id: "hit_or_sack_rate", home: "registry", adrLine: 692, what: "A sack, or a QB_HIT on a play ending in a pass attempt (throwaways included), per dropback; under legacy an ARRIVED threat with the ball in his hand stands in for QB_HIT." },
  { id: "sack_share_of_hit_or_sack", home: "registry", adrLine: 87, what: "Sacks as a share of hit-or-sack." },
  { id: "qb_hit_on_scramble", home: "registry", adrLine: 692, what: "The same contact on a play that ends in a scramble: reported, not counted." },
  { id: "release_distribution", home: "registry", adrLine: 90, what: "Release on the named clock: the decision tick under legacy, THROW.releaseSeconds once it exists (P8, step 4)." },
  { id: "pressured_share_by_release_bin", home: "registry", adrLine: 161, what: "Pressured share of dropbacks by release bin, tick-aligned and raw-second real comparators." },
  { id: "hit_rate_by_release_bin", home: "registry", adrLine: 161, what: "Hit rate on thrown balls by release bin, tick-aligned and raw-second real comparators." },
  { id: "hits_on_aimed_throws_per_dropback", home: "registry", adrLine: 1140, what: "Hits on aimed throws per dropback, every release bin together: the level s4.motion.hits and acc.hitsOnThrown grade (real 7.1, ADR-089:206; today 3.62 flat, 7.31 gen, ADR-089:88; review F2)." },
  { id: "first_pressure_seconds", home: "registry", adrLine: 962, what: "Time of the first PRESSURE-or-worse status; the clock compared with NGS's 2.9 s." },
  { id: "first_forcing_seconds", home: "registry", adrLine: 962, what: "Time of the first COLLAPSING or IMMEDIATE status (deviation O13)." },
  { id: "first_arrival_seconds", home: "registry", adrLine: 962, what: "Time of the first ARRIVED threat." },
  { id: "first_pressure_origin", home: "registry", adrLine: 962, what: "The origin of the first non-clean tick: won rep, free runner or counter." },
  { id: "quick_pressure_share_by_origin", home: "registry", adrLine: 962, what: "First PRESSURE-or-worse before 2.5 s, by origin." },
  { id: "clean_with_live_won_rep_ticks", home: "registry", adrLine: 962, what: "POCKET_STATUS CLEAN ticks at which some WON_REP threat's latest state is TRAVELLING or DELAYED." },
  { id: "clean_with_live_won_rep_dropbacks", home: "registry", adrLine: 962, what: "The dropbacks those ticks fall on." },
  { id: "clean_with_live_won_rep_push_ticks", home: "registry", adrLine: 1160, what: "Those ticks whose live threat is a PUSH rep (approach.ts), counted apart: under legacy and S, a POWER rep won from a latent margin of 1 to 14; under L, the same range and BLOCKER_BEATEN reported before the win (ADR-089 Appendix F, F1 option (b))." },
  { id: "throwaway_rate_pressured", home: "registry", adrLine: 204, what: "Throwaways per pressured dropback, beside the existing throwaway_rate; real side FTN is_throw_away." },
  { id: "throwaway_rate_clean", home: "registry", adrLine: 204, what: "Throwaways per clean dropback; real side FTN is_throw_away." },
  { id: "scramble_rate", home: "registry", adrLine: 962, what: "RUN_RESOLUTION carryType SCRAMBLE per dropback." },
  { id: "scramble_yards", home: "registry", adrLine: 962, what: "Yards per scramble." },
  { id: "by_down_fixed_calls", home: "registry", adrLine: 950, what: "Dropbacks at 7-10 to go, goal-to-go excluded, by down, on the frozen caller (deviation O12)." },
  { id: "int_per_aimed_throw", home: "registry", adrLine: 962, what: "Interceptions per aimed throw (a guard), with the real side per aimed throw." },
  { id: "completion_per_aimed_throw", home: "registry", adrLine: 962, what: "Completions per aimed throw (a guard), with the real side per aimed throw." },
  { id: "forced_throw_share", home: "registry", adrLine: 1289, what: "The share of aimed throws that were forced (part of the interception guard)." },
  { id: "completion_by_pocket_status", home: "registry", adrLine: 962, what: "Each dropback's PLAY_RESULT joined to its worst pocket status." },
  { id: "qb_season_spread", home: "registry", adrLine: 962, what: "Per-quarterback season spread." },
  { id: "defence_season_spread", home: "registry", adrLine: 962, what: "Per-defence season spread." },
  { id: "unblocked_pressures_per_100", home: "registry", adrLine: 1172, what: "Pressures by a man on the free-run clock (D19's three origins) whose own arrival floor reached PRESSURE or worse with the ball in hand, once per play, per 100 dropbacks." },
  { id: "unblocked_share_of_hit_or_sack", home: "registry", adrLine: 1172, what: "Those men's share of hit-or-sack." },
  { id: "unblocked_men_per_100", home: "registry", adrLine: 1028, what: "Completely unblocked men per 100 dropbacks (reported)." },
  { id: "pressured_share_2s_no_free_runner", home: "registry", adrLine: 1172, what: "The pressured share of throws released at 2.0-2.5 s with no free runner: the miss rule's n." },
  { id: "quick_share_no_free_runner", home: "registry", adrLine: 1172, what: "The quick-pressure share on pressured dropbacks with no free runner: the miss rule's quick split." },
  { id: "clean_outs_rate", home: "registry", adrLine: 246, what: "Clean dropbacks with an escape, per 100 clean dropbacks (§2.4)." },
  { id: "out_of_pocket_rate", home: "registry", adrLine: 246, what: "Throws after a clean break-out (§2.4)." },
  { id: "clean_drill_share", home: "registry", adrLine: 246, what: "The drill share of clean dropbacks (§2.4)." },
  { id: "situation_end_of_half", home: "registry", adrLine: 1100, what: "Pass rate, throwaways and time to throw at the end of each half against the rest, on the rebuilt clock." },
  { id: "situation_q1q3_last_two", home: "registry", adrLine: 1100, what: "The same in the last two minutes of the first and third quarters." },
  { id: "sack_share_of_contacts_in_out", home: "registry", adrLine: 290, what: "Sacks as a share of contacts (an ARRIVED threat, or the escape's CAUGHT, ball in hand), in and out of the pocket." },
  { id: "coverage_sack_rows", home: "registry", adrLine: 730, what: "Sacks whose pocket was CLEAN when the count ran out, as a share of sacks, and the mean time to sack (report only)." },

  // --- S3: pocket report rows (plan §6.4) ----------------------------------
  { id: "sacker_mix", home: "pocket-row", adrLine: 977, what: "The credited sacker (the last ARRIVED rusher; same-tick arrivals split 0.5) by position and origin (M3)." },
  { id: "multi_channel_share", home: "pocket-row", adrLine: 962, what: "Entry 107's deciding-instant multi-channel share." },
  { id: "int_per_aimed_by_throw_class", home: "pocket-row", adrLine: 1308, what: "Interceptions per aimed throw by throw class (D28)." },
  { id: "completion_per_aimed_by_throw_class", home: "pocket-row", adrLine: 1308, what: "Completions per aimed throw by throw class (D28)." },
  { id: "nobody_open_share", home: "pocket-row", adrLine: 964, what: "Checkdown + desperation + throwaway + sack, per dropback, with its split by class." },
  { id: "clean_checkdown_share", home: "pocket-row", adrLine: 964, what: "The checkdown share of clean dropbacks (§2.4)." },
  { id: "clean_later_read_share", home: "pocket-row", adrLine: 964, what: "The later-read share of clean dropbacks (§2.4)." },

  // --- S3: the measurements (plan §6.2), keyed in the filing's M block by these ids ---
  { id: "M1", home: "m-table", adrLine: 975, what: "The push window's price: E, SD, the bound B1 = E + 3·SD, and the hard bound H." },
  { id: "M2", home: "m-table", adrLine: 976, what: "Where the forcing comes from, today and under S and L (engine-free, first-order)." },
  { id: "M3", home: "m-table", adrLine: 977, what: "The sacker mix, against D34's band (reported)." },
  { id: "M4", home: "m-table", adrLine: 978, what: "The alarm mix: first registrations by approach, and the multi-cause share." },
  { id: "M5", home: "m-table", adrLine: 979, what: "The mirror guard: mirrored runs against unmirrored, both seed sets and both leagues." },
  { id: "M6", home: "m-table", adrLine: 980, what: "Contact's branches: the upper bound, then FIGHT against THROWAWAY by approach and down." },
  { id: "M7", home: "m-table", adrLine: 981, what: "Sight's size: the pocket_sense margin by from-class, the target and the NEVER share." },
  { id: "M8", home: "m-table", adrLine: 982, what: "The free-run clock: every free runner's arrival on the base seasons, Wait built, Table now as information." },
  { id: "M9", home: "m-table", adrLine: 983, what: "Today's situation footprint and step 8a's tolerance." },

  // --- S3: the benches (plan §6.3) ------------------------------------------
  { id: "line_bench", home: "bench", adrLine: 967, what: "The uncensored line bench: today's survival curve, P(rep not yet won at t), over the O9 grid (packages/engine/test)." },
  { id: "clean_bench", home: "bench", adrLine: 969, what: "The tunables-only clean bench: release, throwaways, nobody open and its split." },
  { id: "one_threat_bench", home: "bench", adrLine: 970, what: "Exactly one unblocked rusher at X = 1.5, 2.5 and 3.5 s: release, pressure, sacks, hit-or-sack, throwaways, scrambles, the decision mix." },
] as const;

export type ConstructDef = (typeof CONSTRUCTS)[number];
export type ConstructId = ConstructDef["id"];

export const CONSTRUCT_IDS: readonly ConstructId[] = CONSTRUCTS.map((c) => c.id);

/** The M tables' ids, in order: the filing's M block has exactly these keys. */
export const M_IDS = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"] as const;
export type MId = (typeof M_IDS)[number];

const BY_ID: ReadonlyMap<string, ConstructDef> = new Map(CONSTRUCTS.map((c) => [c.id, c]));

export function isConstructId(id: string): id is ConstructId {
  return BY_ID.has(id);
}

export function constructById(id: string): ConstructDef | undefined {
  return BY_ID.get(id);
}

export function constructsIn(home: ConstructHome): readonly ConstructDef[] {
  return CONSTRUCTS.filter((c) => c.home === home);
}

/**
 * D28's throw classes (ADR-089:1308), by CP's rules, as `throwClass.ts` (S3) assigns them and the
 * by-class rows and bands key them. "Nobody open" is checkdown + desperation + throwaway + sack.
 * The class of a normal-bar pocket throw is `PROGRESSION` here: it is the QB's own bar, never a
 * real separation figure (ADR-019's forbidden substitute; deviation O18).
 */
export const THROW_CLASSES = [
  "PROGRESSION",
  "RANK_PUSHED",
  "CHECKDOWN",
  "CLEAN_EXPIRY",
  "DESPERATION",
  "ON_THE_RUN",
  "THROWAWAY",
  "SCRAMBLE",
  "SACK",
] as const;
export type ThrowClass = (typeof THROW_CLASSES)[number];
export const NOBODY_OPEN_CLASSES: readonly ThrowClass[] = ["CHECKDOWN", "DESPERATION", "THROWAWAY", "SACK"];

/** Where a pressure starts (`first_pressure_origin`, M2, M4): a won rep, a free runner, or the counter. */
export const PRESSURE_ORIGINS = ["WON_REP", "FREE_RUNNER", "COUNTER"] as const;
export type PressureOrigin = (typeof PRESSURE_ORIGINS)[number];
