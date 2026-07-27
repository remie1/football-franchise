/**
 * NFL roster status codes, as they appear in nflverse `weekly_rosters`.
 *
 * **These codes are not documented upstream.** nflverse passes the NFL feed's
 * `status_description_abbr` through verbatim and does not publish a legend. Everything below is
 * either self-evident from the coarse `status` column it co-occurs with, or *inferred from named
 * cases in 2022–2024 data*. The inference for each code is recorded so a future correction is a
 * one-line table edit rather than an archaeology exercise.
 *
 * Design consequence: the raw code is preserved on every availability row and this table is only
 * ever advisory. Unmapped codes are collected and reported by the ingest run — they are never
 * silently coerced into a neighbouring meaning, which is how an availability-matched replay
 * would quietly stop matching.
 */

export type StatusConfidence =
  /** Follows from the co-occurring coarse `status` value; not really an inference. */
  | "SELF_EVIDENT"
  /** Inferred from named players whose real-world situation is unambiguous. */
  | "INFERRED"
  /** Pattern is suggestive but the meaning is not established. */
  | "UNCERTAIN";

/** What the code implies for whether the player could take a snap that week. */
export type Availability =
  /** On the 53 and eligible to play. */
  | "AVAILABLE"
  /** On the roster but not eligible/dressed for this game (inactive list). */
  | "INACTIVE"
  /** Practice squad: eligible only via elevation, which snap counts will reveal. */
  | "PRACTICE_SQUAD"
  /** Reserve list of any kind — injured, suspended, PUP, NFI, retired, exempt. */
  | "RESERVE"
  /** Not on this team that week (waived, traded, retired off-roster). */
  | "OFF_ROSTER"
  | "UNKNOWN";

/** Why a player is unavailable, when the code says. Kept orthogonal to `Availability`. */
export type UnavailabilityReason =
  | "INJURY"
  | "INJURY_DESIGNATED_TO_RETURN"
  | "PUP"
  | "NFI"
  | "SUSPENSION_LEAGUE"
  | "SUSPENSION_INDEFINITE"
  | "SUSPENSION_CLUB"
  | "RETIRED"
  | "DID_NOT_REPORT"
  | "EXEMPT"
  | "MILITARY"
  | "FUTURE_CONTRACT"
  | "WAIVED"
  | "OTHER";

export interface StatusCodeMeaning {
  readonly code: string;
  readonly label: string;
  readonly availability: Availability;
  readonly reason: UnavailabilityReason | null;
  readonly confidence: StatusConfidence;
  /** The evidence this mapping rests on. */
  readonly basis: string;
}

const T = (m: StatusCodeMeaning): readonly [string, StatusCodeMeaning] => [m.code, m];

export const STATUS_CODES: ReadonlyMap<string, StatusCodeMeaning> = new Map([
  T({
    code: "A01", label: "Active", availability: "AVAILABLE", reason: null,
    confidence: "SELF_EVIDENT", basis: "27,260/46,579 rows in 2024, all paired with status=ACT",
  }),
  T({
    code: "I01", label: "Inactive", availability: "INACTIVE", reason: null,
    confidence: "SELF_EVIDENT", basis: "pairs exclusively with status=INA",
  }),
  T({
    code: "I02", label: "Inactive (secondary code)", availability: "INACTIVE", reason: null,
    confidence: "SELF_EVIDENT", basis: "pairs with status=INA; distinction from I01 unknown",
  }),
  T({
    code: "R01", label: "Reserve/Injured", availability: "RESERVE", reason: "INJURY",
    confidence: "INFERRED", basis: "dominant RES code; Deshaun Watson 2024 w8-18 (Achilles)",
  }),
  T({
    code: "R02", label: "Reserve/Retired", availability: "RESERVE", reason: "RETIRED",
    confidence: "SELF_EVIDENT", basis: "pairs with status=RET",
  }),
  T({
    code: "R03", label: "Reserve/Did Not Report", availability: "RESERVE", reason: "DID_NOT_REPORT",
    confidence: "INFERRED", basis: "Haason Reddick NYJ 2024 w1-5 (contract holdout)",
  }),
  T({
    code: "R04", label: "Reserve/Physically Unable to Perform", availability: "RESERVE", reason: "PUP",
    confidence: "INFERRED", basis: "Odell Beckham Jr. MIA 2024 w1-4 (PUP list)",
  }),
  T({
    code: "R05", label: "Reserve/Non-Football Injury", availability: "RESERVE", reason: "NFI",
    confidence: "INFERRED", basis: "Antonio Hamilton ARI 2022 w1-4 (burns, non-football)",
  }),
  T({
    code: "R06", label: "Reserve (unclassified)", availability: "RESERVE", reason: "OTHER",
    confidence: "UNCERTAIN", basis: "Ricky Person BAL 2022; Chukwuma Okorafor NE 2024 — no common pattern",
  }),
  T({
    code: "R23", label: "Reserve/Future", availability: "RESERVE", reason: "FUTURE_CONTRACT",
    confidence: "INFERRED", basis: "13 fringe players in 2023, all weeks 19-22 (post-season future deals)",
  }),
  T({
    code: "R27", label: "Reserve (unclassified)", availability: "RESERVE", reason: "OTHER",
    confidence: "UNCERTAIN", basis: "Corey Linsley 2023 w4-18 (heart), Chandler Jones 2023 (personal) — mixed",
  }),
  T({
    code: "R30", label: "Reserve/Suspended — indefinite", availability: "RESERVE", reason: "SUSPENSION_INDEFINITE",
    confidence: "INFERRED",
    basis: "2023: Isaiah Rodgers, Shaka Toney, Eyioma Uwazurike w1-19 (indefinite gambling bans); 2022: Calvin Ridley",
  }),
  T({
    code: "R33", label: "Reserve/Suspended by club", availability: "RESERVE", reason: "SUSPENSION_CLUB",
    confidence: "INFERRED", basis: "Jaire Alexander GB 2023 w17 (one-game team suspension)",
  }),
  T({
    code: "R34", label: "Reserve/Military", availability: "RESERVE", reason: "MILITARY",
    confidence: "UNCERTAIN", basis: "single occurrence per season; no corroborating case found",
  }),
  T({
    code: "R36", label: "Reserve/Commissioner Exempt", availability: "RESERVE", reason: "EXEMPT",
    confidence: "UNCERTAIN", basis: "week-1-only occurrences paired with status=CUT",
  }),
  T({
    code: "R40", label: "Reserve/Suspended — term", availability: "RESERVE", reason: "SUSPENSION_LEAGUE",
    confidence: "INFERRED",
    basis: "2023 set is the season's suspension list (Jameson Williams 4g, Alvin Kamara 3g, Cam Robinson 4g, Grover Stewart 6g); 2022 Deshaun Watson w1-12 (11g) and DeAndre Hopkins w1-6 (6g PED)",
  }),
  T({
    code: "R42", label: "Reserve (unclassified)", availability: "RESERVE", reason: "OTHER",
    confidence: "UNCERTAIN", basis: "one 2022 occurrence",
  }),
  T({
    code: "R47", label: "Reserve/PUP — designated to return", availability: "RESERVE", reason: "PUP",
    confidence: "UNCERTAIN", basis: "David Ojabo BAL 2022 (rookie PUP, returned mid-season)",
  }),
  T({
    code: "R48", label: "Reserve/Injured — designated to return", availability: "RESERVE", reason: "INJURY_DESIGNATED_TO_RETURN",
    confidence: "INFERRED",
    basis: "91 players in 2023 incl. Aaron Rodgers w13-15, Joey Bosa w16-18; also appears paired with status=ACT during the practice window",
  }),
  T({
    code: "R49", label: "Reserve/NFI — designated to return", availability: "RESERVE", reason: "NFI",
    confidence: "UNCERTAIN", basis: "Alex Leatherwood CHI 2022, Michael Dunn CLE 2024",
  }),
  T({
    code: "R52", label: "Reserve (unclassified)", availability: "RESERVE", reason: "OTHER",
    confidence: "UNCERTAIN", basis: "one 2022 occurrence",
  }),
  T({
    code: "P01", label: "Practice Squad", availability: "PRACTICE_SQUAD", reason: null,
    confidence: "SELF_EVIDENT", basis: "dominant DEV code",
  }),
  T({
    code: "P02", label: "Practice Squad/Injured", availability: "PRACTICE_SQUAD", reason: "INJURY",
    confidence: "UNCERTAIN", basis: "pairs with status=DEV",
  }),
  T({
    code: "P03", label: "Practice Squad (variant)", availability: "PRACTICE_SQUAD", reason: null,
    confidence: "UNCERTAIN", basis: "pairs with status=DEV",
  }),
  T({
    code: "P04", label: "Practice Squad (variant)", availability: "PRACTICE_SQUAD", reason: null,
    confidence: "UNCERTAIN", basis: "pairs with status=DEV",
  }),
  T({
    code: "P06", label: "Practice Squad (variant)", availability: "PRACTICE_SQUAD", reason: null,
    confidence: "UNCERTAIN", basis: "pairs with status=DEV",
  }),
  T({
    code: "P07", label: "Practice Squad (variant)", availability: "PRACTICE_SQUAD", reason: null,
    confidence: "UNCERTAIN", basis: "pairs with status=DEV",
  }),
  T({
    code: "P10", label: "Practice Squad (variant)", availability: "PRACTICE_SQUAD", reason: null,
    confidence: "UNCERTAIN", basis: "single occurrence",
  }),
  T({
    code: "W03", label: "Waived", availability: "OFF_ROSTER", reason: "WAIVED",
    confidence: "SELF_EVIDENT", basis: "dominant CUT code",
  }),
  T({
    code: "W04", label: "Waived/Injured", availability: "OFF_ROSTER", reason: "WAIVED",
    confidence: "UNCERTAIN", basis: "pairs with status=CUT",
  }),
  T({
    code: "E01", label: "Exempt", availability: "RESERVE", reason: "EXEMPT",
    confidence: "UNCERTAIN", basis: "Chukwuma Okorafor NE 2024 w2 (left team mid-game)",
  }),
  T({
    code: "E02", label: "Exempt/Commissioner Permission", availability: "RESERVE", reason: "EXEMPT",
    confidence: "INFERRED", basis: "pairs with status=EXE; Josh Sills PHI 2022 (legal proceedings)",
  }),
  T({
    code: "E14", label: "Exempt/International Player Pathway", availability: "RESERVE", reason: "EXEMPT",
    confidence: "UNCERTAIN",
    basis: "only occurrence 2022-2025 is Junior Aho MIN 2023 w1-4, an International Player Pathway roster exemption",
  }),
]);

/** Coarse `status` column values, which are unambiguous on their own. */
export const COARSE_STATUS: ReadonlyMap<string, Availability> = new Map<string, Availability>([
  ["ACT", "AVAILABLE"],
  ["INA", "INACTIVE"],
  ["DEV", "PRACTICE_SQUAD"],
  ["RES", "RESERVE"],
  ["EXE", "RESERVE"],
  ["CUT", "OFF_ROSTER"],
  ["RET", "OFF_ROSTER"],
  ["TRC", "OFF_ROSTER"],
  ["TRD", "OFF_ROSTER"],
]);

export interface ResolvedStatus {
  readonly availability: Availability;
  readonly reason: UnavailabilityReason | null;
  readonly confidence: StatusConfidence | "NONE";
  /** true when the description code was absent from `STATUS_CODES`. */
  readonly unmappedCode: boolean;
}

/**
 * Resolve availability. The coarse `status` column wins for the availability class — it is
 * unambiguous and complete — while the description code contributes the *reason*, which is the
 * part that is inferred. Separating them means an unknown description code degrades the reason
 * to `null` without corrupting the availability class.
 */
export function resolveStatus(status: string | null, descriptionCode: string | null): ResolvedStatus {
  const coarse = status === null ? undefined : COARSE_STATUS.get(status);
  const detail = descriptionCode === null ? undefined : STATUS_CODES.get(descriptionCode);
  const unmappedCode = descriptionCode !== null && descriptionCode.length > 0 && detail === undefined;
  return {
    availability: coarse ?? detail?.availability ?? "UNKNOWN",
    reason: detail?.reason ?? null,
    confidence: detail?.confidence ?? "NONE",
    unmappedCode,
  };
}

export function isSuspension(reason: UnavailabilityReason | null): boolean {
  return (
    reason === "SUSPENSION_LEAGUE" ||
    reason === "SUSPENSION_INDEFINITE" ||
    reason === "SUSPENSION_CLUB"
  );
}
