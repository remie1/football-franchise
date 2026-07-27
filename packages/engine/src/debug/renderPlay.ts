/**
 * §17.1 debug printout, rendered PURELY from the event stream.
 *
 * The only inputs are `MatchEventEnvelope[]` and a name lookup — this module
 * cannot see engine internals, and the engine never prints anything itself.
 * Sections outside the implemented slice (YAC, environmental) simply do not
 * render because no events describe them.
 */
import type { MatchEvent, MatchEventEnvelope, PlayerId, RollDetail } from "@ff/contracts";
import { isRollRefStub, referencedRollLabel } from "../events.js";
import { bandFor } from "../rolls.js";
import { TUNABLES } from "../tunables.js";

export type NameLookup = (id: PlayerId) => string;

const RULE = "=".repeat(71);

export function renderPlay(events: readonly MatchEventEnvelope[], names: NameLookup): string {
  const lines: string[] = [];
  const name = (id: PlayerId): string => names(id);

  lines.push(RULE, "PLAY DEBUG OUTPUT", RULE, "");
  lines.push(...renderPlayCall(events));
  lines.push(...renderLineBattle(events, name));
  lines.push(...renderRoutes(events, name));
  lines.push(...renderPocketMovement(events, name));
  lines.push(...renderQbDecisionMaking(events, name));
  lines.push(...renderThrow(events, name));
  lines.push(...renderCatch(events, name));
  lines.push(...renderTippedBall(events, name));
  lines.push(...renderResult(events));
  lines.push(RULE);
  return lines.join("\n");
}

// --- sections ---------------------------------------------------------------

function renderPlayCall(events: readonly MatchEventEnvelope[]): string[] {
  const start = firstOfType(events, "PLAY_START");
  const view = start === undefined ? undefined : readPlayStart(start.payload);
  if (view === undefined) return [];
  return [
    "PLAY CALL:",
    `  Offense: ${view.offenseFormation}, "${view.offenseCall}" (Pass)`,
    `  Reads:   ${view.readSystem} — ${view.readOrder.length} in the progression`,
    `  Defense: ${view.defenseFront}, "${view.defenseCall}" (${view.coverage})`,
    "",
    "SITUATION:",
    `  Down ${view.down} & ${view.distance}, ball on ${view.ballOn}`,
    "",
  ];
}

function renderLineBattle(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const matchups = new Map<string, { rusher: PlayerId; blocker: PlayerId; rows: string[] }>();
  for (const { event } of events) {
    if (event.type !== "CHECK" || event.payload.checkKind !== "pass_rush_tick") continue;
    const rusher = event.payload.actors[0];
    const blocker = event.payload.actors[1];
    const opposed = event.payload.opposedRoll;
    if (rusher === undefined || blocker === undefined || opposed === undefined) continue;
    const key = `${String(rusher)}|${String(blocker)}`;
    const entry = matchups.get(key) ?? { rusher, blocker, rows: [] };
    const band = bandFor(TUNABLES.passRush.bands, event.payload.margin);
    entry.rows.push(
      `  │    Tick ${tickLabel(event.tick)}: rush ${event.payload.roll.total} vs. block ${opposed.total}` +
        ` → ${band.label} (${signed(event.payload.margin)})`,
    );
    matchups.set(key, entry);
  }

  // §7.2 TIME OF ARRIVAL, read from RUSH_THREAT (ADR-007) rather than recomputed
  // from the rep. The difference is not tidiness: the arrival published here is
  // the ADJUSTED one, after every step-up and every blocker who recovered
  // position, so the printout no longer has to caveat itself as "projected".
  const threats: string[] = [];
  for (const { event } of events) {
    if (event.type !== "RUSH_THREAT") continue;
    const p = event.payload;
    const at = tickLabel(event.tick);
    const eta = p.etaTick.toFixed(1);
    if (p.state === "TRAVELLING") {
      const travel = p.etaTick - (event.tick ?? 0);
      threats.push(
        `  │    Tick ${at}: ${name(p.rusher)} wins the rep → ${p.alignment} threat,` +
          ` ${travel.toFixed(1)}s to travel, arrival ${eta}`,
      );
    } else if (p.state === "DELAYED") {
      threats.push(`  │    Tick ${at}: ${name(p.rusher)} pushed back → arrival now ${eta}`);
    } else if (p.state === "RESET") {
      threats.push(`  │    Tick ${at}: ${name(p.rusher)} reset — threat over (was arriving ${eta})`);
    } else {
      threats.push(`  │    Tick ${at}: ${name(p.rusher)} ARRIVES`);
    }
  }

  const pocket = events.flatMap(({ event }) =>
    event.type === "POCKET_STATUS" ? [`       Tick ${tickLabel(event.tick)}: ${event.payload.status}`] : [],
  );

  if (matchups.size === 0 && pocket.length === 0) return [];

  const out: string[] = ["LINE BATTLE:"];
  for (const entry of matchups.values()) {
    out.push(`  ├─ ${name(entry.blocker)} vs. ${name(entry.rusher)}:`);
    out.push(...entry.rows);
    out.push("  │");
  }
  if (threats.length > 0) {
    out.push("  ├─ RUSHER TIME OF ARRIVAL (§7.2):", ...threats);
    out.push("  │");
  }
  if (pocket.length > 0) {
    out.push("  └─ POCKET STATUS:", ...pocket);
  }
  out.push("");
  return out;
}

/**
 * §7.2's "move" branch. The CHECK is now labelled `pocket_movement` (ADR-007)
 * and the branch it selected is stated by the QB_DECISION next to it, so the
 * printout no longer has to say what the stream could not tell it.
 */
function renderPocketMovement(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const out: string[] = [];
  for (const { event } of events) {
    if (event.type !== "CHECK") continue;
    const p = event.payload;
    if (p.checkKind === "pocket_movement") {
      const band = bandFor(TUNABLES.pocketMovement.bands, p.margin);
      const actor = p.actors[0];
      out.push(`  ├─ Tick ${tickLabel(event.tick)}: pocket movement${actor === undefined ? "" : ` (${name(actor)})`}`);
      out.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      out.push(
        `  │    Result: ${band.label} (${signed(p.margin)}) → took response rank ${band.takeRank}` +
          " of his own preference list",
      );
      out.push("  │");
    }
    if (p.checkKind === "scramble") {
      const band = bandFor(TUNABLES.scramble.bands, p.margin);
      out.push(`  ├─ Tick ${tickLabel(event.tick)}: escape attempt (§8.8)`);
      out.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      out.push(`  │    Result: ${band.label} (${signed(p.margin)})`);
      out.push("  │");
    }
  }
  if (out.length === 0) return [];
  return ["POCKET MOVEMENT (§7.2 throw / MOVE / take hit):", ...out, ""];
}

function renderRoutes(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const routeNames = new Map<string, string>();
  const timeline = new Map<string, string[]>();
  for (const { event } of events) {
    if (event.type !== "ROUTE_STATUS") continue;
    const key = String(event.payload.receiver);
    routeNames.set(key, event.payload.route);
    const rows = timeline.get(key) ?? [];
    rows.push(`${tickLabel(event.tick)} ${event.payload.phase}(${event.payload.openness})`);
    timeline.set(key, rows);
  }

  // INTERIM VOCABULARY (ADR-009): §9.4's route-vs-zone rep and its
  // read-the-quarterback rep share the `zone_coverage` CheckKind, so they are
  // told apart HERE by actor shape — [receiver, defender] against
  // [defender, quarterback]. That the printout has to do this is the argument
  // for `zone_read_qb`.
  const quarterback = quarterbackOf(events);
  const releases = new Map<string, MatchEventEnvelope>();
  const coverages = new Map<string, MatchEventEnvelope>();
  const zoneCoverages = new Map<string, MatchEventEnvelope>();
  for (const envelope of events) {
    const event = envelope.event;
    if (event.type !== "CHECK") continue;
    const receiver = event.payload.actors[0];
    if (receiver === undefined) continue;
    if (event.payload.checkKind === "release_vs_press") releases.set(String(receiver), envelope);
    if (event.payload.checkKind === "man_coverage") coverages.set(String(receiver), envelope);
    if (event.payload.checkKind === "zone_coverage" && !isZoneReadCheck(event, quarterback)) {
      zoneCoverages.set(String(receiver), envelope);
    }
  }

  if (timeline.size === 0) return [];

  const out: string[] = ["ROUTE DEVELOPMENT:"];
  for (const [key, rows] of timeline) {
    const receiverId = key as unknown as PlayerId;
    out.push(`  ├─ ${name(receiverId)} (${routeNames.get(key) ?? "?"}):`);

    const release = releases.get(key);
    if (release === undefined) {
      out.push("  │    Release: no press (off coverage)");
    } else if (release.event.type === "CHECK") {
      const payload = release.event.payload;
      const defender = payload.actors[1];
      const off = actorLabel(payload.roll, "OFF");
      const def = actorLabel(payload.opposedRoll, "DEF");
      out.push("  │    Release vs. Press:");
      out.push(`  │      ${off}:  ${formatRoll(payload.roll)}`);
      if (payload.opposedRoll !== undefined) {
        out.push(`  │      ${def}:  ${formatRoll(payload.opposedRoll)}`);
      }
      out.push(
        `  │      Result: ${winnerText(payload.margin, off, def)} → ` +
          `${bandFor(TUNABLES.release.bands, payload.margin).label}` +
          (defender === undefined ? "" : ` (vs. ${name(defender)})`),
      );
    }

    const coverage = coverages.get(key);
    if (coverage !== undefined && coverage.event.type === "CHECK") {
      const payload = coverage.event.payload;
      const band = bandFor(TUNABLES.manCoverage.bands, payload.margin);
      const off = actorLabel(payload.roll, "OFF");
      const def = actorLabel(payload.opposedRoll, "DEF");
      // "Resolved at", not "break at": §8.1's anticipation resolves the rep
      // EARLY, because the ball is already on its way to the spot. The openness
      // track below is what says when the receiver actually got there.
      out.push(`  │    Man coverage (rep resolved at tick ${tickLabel(coverage.event.tick)}):`);
      out.push(`  │      ${off}:  ${formatRoll(payload.roll)}`);
      if (payload.opposedRoll !== undefined) {
        out.push(`  │      ${def}:  ${formatRoll(payload.opposedRoll)}`);
      }
      out.push(
        `  │      Result: ${winnerText(payload.margin, off, def)} → ${band.label}` +
          ` → base openness ${band.openness}`,
      );
    }

    // §9.4 — one roll against a target, not two rolls against each other. The
    // zone defender's rating sets how small the window is; it does not get its
    // own die, and the printout should not pretend otherwise.
    const zoned = zoneCoverages.get(key);
    if (zoned !== undefined && zoned.event.type === "CHECK") {
      const payload = zoned.event.payload;
      const band = bandFor(TUNABLES.zoneCoverage.bands, payload.margin);
      const defender = payload.actors[1];
      out.push(
        `  │    Zone coverage (rep resolved at tick ${tickLabel(zoned.event.tick)})` +
          (defender === undefined ? ":" : ` vs. ${name(defender)}:`),
      );
      out.push(`  │      ${actorLabel(payload.roll, "OFF")}:  ${formatRoll(payload.roll)}`);
      out.push(`  │      vs. target ${payload.target ?? "-"} (50 + defender Zone Coverage ÷ 5)`);
      out.push(
        `  │      Result: ${band.label} (${signed(payload.margin)}) → base openness ${band.openness}` +
          (band.settled ? " — sits down in it" : ""),
      );
    }

    // No coverage rep at all. Two different facts, and the stream distinguishes
    // them: a route that never declared has no rep because it never got there;
    // a route that DID declare and still has no rep found a hole in the zone.
    if (coverages.get(key) === undefined && zoned === undefined) {
      const declared = rows.some((row) => row.includes("OPEN(") || row.includes("DECAYING("));
      out.push(
        declared
          ? "  │    Zone coverage: nobody responsible for his cell — uncovered (§9.4)"
          : "  │    Coverage: no rep — the route never declared",
      );
    }

    out.push(`  │    Openness track: ${rows.join(" → ")}`);
    out.push("  │");
  }
  out.push("");
  return out;
}

function renderQbDecisionMaking(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const out: string[] = [];
  for (const { event } of events) {
    if (event.type === "CHECK" && event.payload.checkKind === "anticipation") {
      // §8.1 anticipation — throwing to a window that does not exist yet.
      const p = event.payload;
      const band = bandFor(TUNABLES.qb.anticipation.bands, p.margin);
      const actor = p.actors[0];
      out.push(
        `  ├─ Anticipation (Tick ${tickLabel(event.tick)})${actor === undefined ? "" : `: ${name(actor)}`}`,
      );
      out.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      out.push(
        `  │    Result: ${band.label} (${signed(p.margin)}) → ` +
          (band.anticipated
            ? "turns it loose before the break"
            : "cannot pull the trigger; stays on this read"),
      );
      out.push("  │");
    } else if (event.type === "QB_READ") {
      const p = event.payload;
      out.push(`  ├─ Read (Tick ${tickLabel(event.tick)}): ${name(p.target)}`);
      out.push(`  │    Actual openness: ${p.actualOpenness}`);
      out.push(`  │    Awareness variance: ${formatRoll(p.varianceRoll)}`);
      out.push(`  │    Perceived openness: ${p.perceivedOpenness}`);
      const window = p.effectiveOpenness - p.perceivedOpenness;
      out.push(
        `  │    Effective openness: ${p.effectiveOpenness}` +
          (window === 0 ? " (no tight-window adjustment)" : ` (window modifier ${signed(window)})`),
      );
      out.push("  │");
    } else if (event.type === "CHECK" && event.payload.checkKind === "qb_decision") {
      const p = event.payload;
      const band = bandFor(TUNABLES.qb.decision.bands, p.margin);
      out.push(`  ├─ Decision quality (Tick ${tickLabel(event.tick)}):`);
      out.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      out.push(`  │    Result: ${band.label} (${signed(p.margin)})`);
      out.push("  │");
    } else if (event.type === "QB_DECISION") {
      const p = event.payload;
      const target = p.target === undefined ? "" : ` → ${name(p.target)}`;
      // ADR-005: no bracket when no decision-quality roll ran. A bare HOLD means
      // "there was nothing to decide", not "he decided badly".
      const tier = p.tier === undefined ? "" : ` [${p.tier}]`;
      out.push(`  ├─ Tick ${tickLabel(event.tick)}: ${p.choice}${target}${tier}`);
    }
  }
  if (out.length === 0) return [];
  return ["QB DECISION-MAKING:", ...out, ""];
}

function renderThrow(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const thrown = firstOfType(events, "THROW");
  if (thrown === undefined) return [];
  const out: string[] = [
    "THROW EXECUTION:",
    `  ├─ Throw type: ${thrown.payload.throwType} to ${name(thrown.payload.target)}`,
    "  │",
  ];

  // Rendered in design-doc order (§17.1): the zone defender's read of the
  // release, then the lane, then ball placement — regardless of the order the
  // engine happened to roll them in.
  const zoneRead: string[] = [];
  const lane: string[] = [];
  const accuracy: string[] = [];
  const quarterback = quarterbackOf(events);
  for (const { event } of events) {
    if (event.type !== "CHECK") continue;
    const p = event.payload;
    if (p.checkKind === "zone_coverage" && isZoneReadCheck(event, quarterback)) {
      const defender = p.actors[0];
      zoneRead.push(
        `  ├─ Zone defender reading the QB (§9.4)${defender === undefined ? "" : `: ${name(defender)}`}`,
      );
      zoneRead.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"} (60 + QB disguise)`);
      zoneRead.push(
        `  │    Result: ${p.margin >= 0 ? "BREAKS ON THE BALL" : "stays in his area"} (${signed(p.margin)})` +
          (p.margin >= 0 ? ` → +${TUNABLES.zoneCoverage.readQb.contestBonus} to contest/INT` : ""),
      );
      zoneRead.push("  │");
    }
    if (p.checkKind === "passing_lane") {
      const defender = p.actors[0];
      lane.push(`  ├─ Passing lane${defender === undefined ? "" : ` (${name(defender)})`}:`);
      lane.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      lane.push(`  │    Result: ${p.margin >= 0 ? "DEFLECTED" : "ball passes cleanly"} (${signed(p.margin)})`);
      lane.push("  │");
    }
    if (p.checkKind === "accuracy") {
      const band = bandFor(TUNABLES.throwExec.accuracy.bands, p.margin);
      accuracy.push("  └─ Accuracy:");
      accuracy.push(`       ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      accuracy.push(`       Result: ${band.label} (${signed(p.margin)}) [${p.tier}]`);
      accuracy.push(
        `       Placement effects: catch ${signed(band.catchMod)}, defender contest ${signed(band.defenderContestMod)}`,
      );
    }
  }
  out.push(...zoneRead, ...lane, ...accuracy, "");
  return out;
}

/**
 * §12 — the tipped ball, joined from its CHECKs.
 *
 * INTERIM VOCABULARY (ADR-009): `TIPPED_BALL.qualityRoll` and
 * `attempts[].roll` are typed `RollDetail` in contracts, which predates ADR-004.
 * The engine fills them with self-identifying REFERENCE STUBS (`raw` 0, no
 * modifiers, `rngLabel` prefixed `ref:`) rather than repeating rolls that
 * already live in the `deflection_quality` / `deflection_recovery` CHECKs, so
 * this renderer performs the same join `renderCatch` performs for the catch.
 * When ADR-009 lands these become plain `rollRef` strings and the `ref:`
 * stripping below is the only line that changes.
 */
function renderTippedBall(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const tip = firstOfType(events, "TIPPED_BALL");
  if (tip === undefined) return [];
  const p = tip.payload;

  const checksByLabel = new Map<string, Extract<MatchEvent, { type: "CHECK" }>>();
  for (const { event } of events) {
    if (event.type !== "CHECK") continue;
    if (event.payload.checkKind !== "deflection_quality" && event.payload.checkKind !== "deflection_recovery") {
      continue;
    }
    checksByLabel.set(event.payload.roll.rngLabel, event);
  }
  const join = (roll: RollDetail): Extract<MatchEvent, { type: "CHECK" }> | undefined =>
    checksByLabel.get(isRollRefStub(roll) ? referencedRollLabel(roll) : roll.rngLabel);

  const out: string[] = ["TIPPED BALL (§12):", `  ├─ Deflected by ${name(p.deflector)}`];

  const quality = join(p.qualityRoll);
  if (quality !== undefined) {
    const q = quality.payload;
    const band = bandFor(TUNABLES.tippedBall.qualityBands, q.margin);
    out.push("  ├─ Roll 1 — deflection quality:");
    out.push(`  │    ${formatRoll(q.roll)} vs. target ${q.target ?? "-"} (throw height + velocity)`);
    out.push(`  │    Result: ${band.label} (${signed(q.margin)}) → recovery target ${p.finalTargetNumber}`);
  } else {
    out.push(`  ├─ Roll 1 — deflection quality: recovery target ${p.finalTargetNumber}`);
  }

  out.push(
    p.eligible.length === 0
      ? "  ├─ Eligible to recover: nobody (§12.3)"
      : `  ├─ Eligible to recover (§12.3, Reaction order): ${p.eligible.map(name).join(", ")}`,
  );

  if (p.attempts.length > 0) out.push("  ├─ Roll 2 — recovery attempts:");
  for (const attempt of p.attempts) {
    const check = join(attempt.roll);
    if (check === undefined) {
      out.push(`  │    ${name(attempt.player)}: roll not in this stream`);
      continue;
    }
    const a = check.payload;
    out.push(`  │    ${name(attempt.player)}: ${formatRoll(a.roll)} vs. ${a.target ?? "-"}`);
    out.push(`  │      → ${a.margin >= 0 ? "RECOVERS" : "cannot come up with it"} (${signed(a.margin)})`);
  }

  out.push(
    p.recoveredBy === undefined
      ? "  └─ Nobody recovers: incomplete"
      : `  └─ Recovered by ${name(p.recoveredBy)}`,
    "",
  );
  return out;
}

/**
 * ADR-004: the roll lives on the CHECK and the outcome references it by
 * `rollRef`. The renderer performs that join rather than reading a RollDetail
 * off the summary event — there is no longer one there to read.
 */
function renderCatch(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const checksByRollLabel = new Map<string, Extract<MatchEvent, { type: "CHECK" }>>();
  for (const { event } of events) {
    if (event.type !== "CHECK") continue;
    if (event.payload.checkKind !== "catch" && event.payload.checkKind !== "contested_catch") continue;
    checksByRollLabel.set(event.payload.roll.rngLabel, event);
  }

  const out: string[] = [];
  for (const { event } of events) {
    if (event.type !== "CATCH_RESOLUTION") continue;
    const resolution = event.payload;
    const check = checksByRollLabel.get(resolution.rollRef);
    if (check !== undefined) {
      const p = check.payload;
      const contested = p.checkKind === "contested_catch";
      const band = contested
        ? bandFor(TUNABLES.catching.contested.bands, p.margin)
        : bandFor(TUNABLES.catching.routine.bands, p.margin);
      out.push(`  ├─ Catch type: ${contested ? "CONTESTED" : "ROUTINE"}`);
      out.push(`  ├─ ${actorLabel(p.roll, "OFF")}: ${formatRoll(p.roll)}`);
      if (p.opposedRoll !== undefined) {
        out.push(`  ├─ ${actorLabel(p.opposedRoll, "DEF")}: ${formatRoll(p.opposedRoll)}`);
      }
      if (p.target !== undefined) out.push(`  ├─ vs. target ${p.target}`);
      out.push(`  ├─ Result: ${band.label} (${signed(p.margin)}) [${p.tier}]`);
    } else {
      out.push(`  ├─ Catch type: ${resolution.catchType} (roll ${resolution.rollRef} not in this stream)`);
    }
    out.push(`  └─ ${name(resolution.receiver)}: ${resolution.caught ? "CAUGHT" : "INCOMPLETE"}`);
  }
  if (out.length === 0) return [];
  return ["CATCH RESOLUTION:", ...out, ""];
}

function renderResult(events: readonly MatchEventEnvelope[]): string[] {
  const result = firstOfType(events, "PLAY_RESULT");
  if (result === undefined) return [];
  const p = result.payload;
  const out = ["PLAY RESULT:", `  ├─ Yards: ${p.yards}`, `  ├─ Turnover: ${p.turnover ? "YES" : "NO"}`];
  if (p.score !== undefined) out.push(`  ├─ Score: ${p.score}`);
  out.push(`  └─ Clock runoff: ${p.clockRunoff}s`, "");
  return out;
}

// --- formatting helpers -----------------------------------------------------

export function formatRoll(roll: RollDetail): string {
  const parts = roll.modifiers.map((m) => ` ${m.value < 0 ? "-" : "+"} ${Math.abs(m.value)} (${m.source})`);
  return `${roll.die} ${roll.raw}${parts.join("")} = ${roll.total}  [${roll.rngLabel}]`;
}

/**
 * The row label for a roll, taken from the ROLLING ENTITY rather than from the
 * nominal role of the check (B2). Resolvers prefix every attribute modifier
 * with the actor's own `bio.position`, so the first attribute-backed modifier
 * carries it: a tight end's release roll reads "TE", a linebacker in man
 * coverage reads "MLB". Falls back to the generic side when a roll has no
 * attribute modifier at all.
 */
function actorLabel(roll: RollDetail | undefined, fallback: string): string {
  const attrMod = roll?.modifiers.find((m) => m.attr !== undefined);
  const first = attrMod?.source.split(" ")[0];
  return first === undefined || first === "" ? fallback : first;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function winnerText(margin: number, offenseLabel: string, defenseLabel: string): string {
  if (margin === 0) return "even";
  return margin > 0
    ? `${offenseLabel} wins by ${margin}`
    : `${defenseLabel} wins by ${Math.abs(margin)}`;
}

function tickLabel(tick: number | undefined): string {
  return tick === undefined ? "-" : tick.toFixed(1);
}

/**
 * INTERIM VOCABULARY (ADR-009). §9.4's two rolls share the `zone_coverage`
 * CheckKind, so the only thing that separates them in the stream is who is in
 * `actors`: the route rep is [receiver, defender], the read-the-QB rep is
 * [defender, quarterback]. This function is the cost of that collision, and it
 * disappears the day `zone_read_qb` is ratified.
 */
function isZoneReadCheck(
  event: Extract<MatchEvent, { type: "CHECK" }>,
  quarterback: string | undefined,
): boolean {
  if (quarterback === undefined) return false;
  return String(event.payload.actors[1] ?? "") === quarterback;
}

function quarterbackOf(events: readonly MatchEventEnvelope[]): string | undefined {
  const start = firstOfType(events, "PLAY_START");
  return start === undefined ? undefined : readPlayStart(start.payload)?.quarterback;
}

function firstOfType<T extends MatchEvent["type"]>(
  events: readonly MatchEventEnvelope[],
  type: T,
): Extract<MatchEvent, { type: T }> | undefined {
  for (const { event } of events) {
    if (event.type === type) return event as Extract<MatchEvent, { type: T }>;
  }
  return undefined;
}

// --- PLAY_START is `unknown` in contracts; read it defensively --------------

interface PlayStartView {
  readonly offenseCall: string;
  readonly offenseFormation: string;
  readonly readSystem: string;
  readonly quarterback: string | undefined;
  readonly readOrder: readonly string[];
  readonly defenseCall: string;
  readonly defenseFront: string;
  readonly coverage: string;
  readonly down: number;
  readonly distance: number;
  readonly ballOn: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function readPlayStart(payload: unknown): PlayStartView | undefined {
  const root = asRecord(payload);
  if (root === undefined) return undefined;
  const offense = asRecord(root["offense"]) ?? {};
  const defense = asRecord(root["defense"]) ?? {};
  const situation = asRecord(root["situation"]) ?? {};
  return {
    offenseCall: asString(offense["call"], "?"),
    offenseFormation: asString(offense["formation"], "?"),
    readSystem: asString(offense["readSystem"], "?"),
    quarterback: typeof offense["quarterback"] === "string" ? offense["quarterback"] : undefined,
    readOrder: asStringArray(offense["readOrder"]),
    defenseCall: asString(defense["call"], "?"),
    defenseFront: asString(defense["front"], "?"),
    coverage: asString(defense["coverage"], "?"),
    down: asNumber(situation["down"], 0),
    distance: asNumber(situation["distance"], 0),
    ballOn: asNumber(situation["ballOn"], 0),
  };
}
