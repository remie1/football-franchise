/**
 * §17.1 debug printout, rendered PURELY from the event stream.
 *
 * The only inputs are `MatchEventEnvelope[]` and a name lookup. Note what this
 * module does NOT import, and that it is the point rather than housekeeping:
 * **no `TUNABLES`, no `bandFor`, no band tables at all** (ADR-011).
 *
 * Until the amendment, every result this printout named was RE-DERIVED here from
 * the check's margin against the engine's own band tables — which are
 * calibration's moving tuning target. A consumer coupled to those tables desyncs
 * silently the first time a boundary moves: nothing errors, the printout simply
 * starts describing a game the engine is no longer simulating. Bands now travel
 * on `CHECK.payload.band`, and this renderer prints what the stream says.
 *
 * The consequence, and it is the right one: where a line used to state a band's
 * EFFECTS (the openness a coverage band maps to, the yards a contest band pays,
 * §10.4's placement modifiers), it now states either the fact the stream carries
 * for it — `ROUTE_STATUS.openness`, `RUSH_ZONE`/`YAC_ZONE` yardage,
 * `RUN_RESOLUTION.yardsBeforeContact`, the named modifiers already inside each
 * `RollDetail` — or nothing at all. A printout that invents a number it cannot
 * read is worse than a printout that is silent about it.
 */
import type {
  MatchEvent,
  MatchEventEnvelope,
  PlayerId,
  RollDetail,
  ThreatOrigin,
} from "@ff/contracts";

export type NameLookup = (id: PlayerId) => string;

/**
 * ADR-022's `RUSH_THREAT.origin`, in the printout's own words. Every phrase is
 * the ADR's table read out: which section of the doc produced this rusher. The
 * renderer chooses WORDING, never the fact — the fact is on the event.
 */
function freeRunnerReason(origin: ThreatOrigin): string {
  switch (origin) {
    case "WON_REP":
      return "§7.1 — he beat his man";
    case "UNBLOCKED":
      return "§7.4 step 4 — nobody was left";
    case "PICKUP_LOST":
      return "§7.4 step 3 — he beat the back";
    case "STUNT_LOOPER":
      return "§7.3 — the exchange was missed";
  }
}

/** `CHECK.band` is optional; a check with no band table has none (ADR-011). */
function bandOf(payload: Extract<MatchEvent, { type: "CHECK" }>["payload"]): string {
  return payload.band ?? "-";
}

const RULE = "=".repeat(71);

export function renderPlay(events: readonly MatchEventEnvelope[], names: NameLookup): string {
  const lines: string[] = [];
  const name = (id: PlayerId): string => names(id);

  lines.push(RULE, "PLAY DEBUG OUTPUT", RULE, "");
  lines.push(...renderPlayCall(events, name));
  lines.push(...renderPreSnap(events, name));
  lines.push(...renderLineBattle(events, name));
  lines.push(...renderRunBlocking(events, name));
  lines.push(...renderRoutes(events, name));
  lines.push(...renderPocketMovement(events, name));
  lines.push(...renderQbDecisionMaking(events, name));
  lines.push(...renderThrow(events, name));
  lines.push(...renderCatch(events, name));
  lines.push(...renderTippedBall(events, name));
  lines.push(...renderBallCarrier(events, name));
  lines.push(...renderResult(events));
  lines.push(RULE);
  return lines.join("\n");
}

// --- sections ---------------------------------------------------------------

function renderPlayCall(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const start = firstOfType(events, "PLAY_START");
  const view = start === undefined ? undefined : readPlayStart(start.payload);
  if (view === undefined) return [];
  const run = view.kind === "RUN_PLAY_V1";
  return [
    "PLAY CALL:",
    `  Offense: ${view.offenseFormation}, "${view.offenseCall}" (${run ? "Run" : "Pass"})`,
    run
      ? `  Design:  ${view.scheme} scheme, ${view.designedGap} gap` +
        (view.carrier === undefined ? "" : `, ball to ${name(view.carrier as unknown as PlayerId)}`)
      : `  Reads:   ${view.readSystem} — ${view.readOrder.length} in the progression`,
    `  Defense: ${view.defenseFront}, "${view.defenseCall}" (${view.coverage})`,
    "",
    "SITUATION:",
    `  Down ${view.down} & ${view.distance}, ball on ${view.ballOn}`,
    "",
  ];
}

/**
 * §6.3 / §6.2 / §6.4 / §14.2 — the run's line of scrimmage.
 *
 * §6.3's ENGAGEMENT band comes off the `run_block` CHECK. §14.3's point-of-attack
 * band is a second table keyed on the same margin, and the doc disagrees with
 * itself about where the two sets of boundaries sit — but §14.3's table produces
 * no roll of its own, so it produces no CHECK and therefore no band in the
 * stream. What the stream DOES carry is the number that disagreement is about:
 * `RUN_RESOLUTION.yardsBeforeContact` (ADR-010). A reader tuning the run game
 * sees "SEALED, and he got 1 yard before contact" — the disagreement stated in
 * yards instead of in two label names.
 */
function renderRunBlocking(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const start = firstOfType(events, "PLAY_START");
  const view = start === undefined ? undefined : readPlayStart(start.payload);
  const blocks: string[] = [];
  const integrity: string[] = [];
  const climbs: string[] = [];
  const vision: string[] = [];

  for (const { event } of events) {
    if (event.type !== "CHECK") continue;
    const p = event.payload;
    const off = p.actors[0];
    const def = p.actors[1];
    if (p.checkKind === "run_block") {
      blocks.push(
        `  ├─ ${off === undefined ? "?" : name(off)} vs. ${def === undefined ? "?" : name(def)}:`,
      );
      blocks.push(`  │    OL:  ${formatRoll(p.roll)}`);
      if (p.opposedRoll !== undefined) blocks.push(`  │    DL:  ${formatRoll(p.opposedRoll)}`);
      blocks.push(`  │    §6.3: ${bandOf(p)} (${signed(p.margin)})`);
      blocks.push("  │");
    }
    if (p.checkKind === "gap_battle") {
      integrity.push(
        `  │    ${off === undefined ? "?" : name(off)} gap discipline ${p.roll.total}` +
          ` vs. zone execution ${p.opposedRoll?.total ?? "-"} → ${bandOf(p)} (${signed(p.margin)})`,
      );
    }
    if (p.checkKind === "second_level_climb") {
      climbs.push(
        `  │    ${off === undefined ? "?" : name(off)} climbs to ${def === undefined ? "?" : name(def)}:` +
          ` ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}` +
          ` → ${p.margin >= 0 ? "LB ENGAGED, clean lane" : "LB free to make the play"} (${signed(p.margin)})`,
      );
    }
    if (p.checkKind === "rb_vision") {
      vision.push(`  ├─ RB vision (§14.2): ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      vision.push(
        `  │    Result: ${p.margin >= 0 ? "finds the best lane" : "runs the designed hole"} (${signed(p.margin)})`,
      );
    }
  }

  if (blocks.length === 0) return [];

  const out: string[] = ["LINE BATTLE — RUN (§6.3, ticks 0.0-1.0):", ...blocks];
  if (integrity.length > 0) out.push("  ├─ GAP INTEGRITY (§6.2, zone scheme):", ...integrity, "  │");
  if (climbs.length > 0) out.push("  ├─ SECOND-LEVEL CLIMB (§6.4):", ...climbs, "  │");
  out.push("");

  const decision: string[] = [...vision];
  const resolution = firstOfType(events, "RUN_RESOLUTION");
  if (resolution !== undefined) {
    const r = resolution.payload;
    const designed = view?.designedGap;
    const actual = r.gap ?? "?";
    decision.push(
      `  ├─ Ball goes through ${actual}` +
        (designed === undefined || designed === actual
          ? " (as designed)"
          : ` — CUTBACK, designed ${designed}`),
    );
    // §14.3's half of the run, stated rather than inferred (ADR-010 item 1):
    // this minus the total is what the BACK did after contact.
    decision.push(
      `  └─ ${r.yardsBeforeContact} yards before contact, ${r.yards - r.yardsBeforeContact} after`,
    );
  }
  if (decision.length > 0) out.push("RB DECISION (§14.2 phase 3):", ...decision, "");
  return out;
}

/**
 * §13 and §14.4 — everything after somebody has the ball, from the one set of
 * checks both produce. `pursuit_angle` failing is not a missed tackle: it is a
 * defender who never got there, and the printout says so.
 */
function renderBallCarrier(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const out: string[] = [];
  for (const { event } of events) {
    // §13.1's zone table, from whichever event the carry published it on. The
    // two are distinct so aggregates cannot mix rushing with receiving
    // (ADR-010); the printout names which one it is reading.
    if (event.type === "YAC_ZONE" || event.type === "RUSH_ZONE") {
      const kind = event.type === "YAC_ZONE" ? "YAC" : "rush";
      out.push(`  ├─ ${kind} zone ${event.payload.zone}: ${event.payload.yardsInZone} yards`);
      continue;
    }
    if (event.type !== "CHECK") continue;
    const p = event.payload;
    const a0 = p.actors[0];
    const a1 = p.actors[1];
    if (p.checkKind === "downfield_block") {
      out.push(
        `  ├─ Block in space: ${a0 === undefined ? "?" : name(a0)} on ${a1 === undefined ? "?" : name(a1)}` +
          ` → ${bandOf(p)} (${signed(p.margin)})`,
      );
    }
    if (p.checkKind === "pursuit_angle") {
      out.push(
        `  ├─ Pursuit angle (§14.4): ${a0 === undefined ? "?" : name(a0)}` +
          ` ${formatRoll(p.roll)} vs. target ${p.target ?? "-"} (50 + speed difference)`,
      );
      out.push(
        `  │    ${p.margin >= 0 ? "gets there" : "TAKEN OUT OF THE PLAY — no tackle attempt"} (${signed(p.margin)})`,
      );
    }
    if (p.checkKind === "yac_tackle" || p.checkKind === "break_tackle" || p.checkKind === "tackle") {
      out.push(
        `  ├─ ${p.checkKind} (${a0 === undefined ? "?" : name(a0)} vs. ${a1 === undefined ? "?" : name(a1)}):`,
      );
      out.push(`  │    Carrier: ${formatRoll(p.roll)}`);
      if (p.opposedRoll !== undefined) out.push(`  │    Tackler: ${formatRoll(p.opposedRoll)}`);
      // The band NAMES the outcome — DEFENDER_MISSED, PARTIAL_TACKLE, TACKLED —
      // and the yards it paid are in the zone event for the zone it happened in.
      // Four contest profiles share three CheckKinds, so re-deriving this from
      // the margin also meant guessing which table to guess with.
      out.push(`  │    Result: ${bandOf(p)} (${signed(p.margin)})`);
    }
    if (p.checkKind === "breakaway") {
      out.push(
        `  ├─ Breakaway (§13.4) vs. ${a1 === undefined ? "?" : name(a1)}:` +
          ` ${bandOf(p)} (${signed(p.margin)})`,
      );
    }
  }

  // A SCRAMBLE carry has no line of scrimmage to render — no `run_block`
  // CHECKs, so `renderRunBlocking` renders nothing at all — and its
  // RUN_RESOLUTION would otherwise never be printed. It belongs here: a
  // quarterback with the ball under his arm IS a ball carrier (ADR-010 item 2).
  const carry = firstOfType(events, "RUN_RESOLUTION");
  if (carry !== undefined && carry.payload.carryType === "SCRAMBLE") {
    out.push(
      `  └─ ${name(carry.payload.carrier)} tucks it and runs: ${carry.payload.yards} yards` +
        " (SCRAMBLE — no designed gap)",
    );
  }

  if (out.length === 0) return [];
  return ["BALL CARRIER (§13 / §14.4):", ...out, ""];
}

/**
 * §5.3 recognition, §7.4 pickup, §7.3 exchange — the phase that decides who is
 * blocking whom before a single rep is rolled.
 *
 * Every line here is read from the stream, the §5.3 band included: ADR-022 gave
 * `PRESNAP_READ` the same `band` field ADR-011 gave `CHECK`, so the four-row
 * label is printed rather than re-derived from the margin here.
 */
function renderPreSnap(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const out: string[] = [];

  const start = firstOfType(events, "PLAY_START");
  const view = start === undefined ? undefined : readPlayStart(start.payload);
  if (view !== undefined && view.unaccountedRushers.length > 0) {
    out.push(
      `  ├─ PRESSURE: ${view.unaccountedRushers.length} rusher(s) the protection did not name` +
        ` — ${view.unaccountedRushers.map((id) => name(id as unknown as PlayerId)).join(", ")}` +
        ` (disguise ${view.blitzDisguise})`,
    );
    out.push(
      `  │    In protection and unassigned: ${
        view.availableBlockers.length === 0
          ? "nobody — everyone is in the route"
          : view.availableBlockers.map((id) => name(id as unknown as PlayerId)).join(", ")
      }`,
    );
  }

  // ADR-026 — the protector whose man is not rushing, printed whether or not
  // anybody needed him. An available blocker nobody used is a real outcome and
  // the printout says so rather than leaving him out, which is exactly the
  // silence the ADR was filed about.
  if (view !== undefined && view.unblockedProtectors.length > 0) {
    out.push(
      `  ├─ PROTECTION (§7.4 step 1, ADR-026): ${view.unblockedProtectors.length} blocker(s)` +
        " whose named rusher is not rushing — " +
        `${view.unblockedProtectors.map((id) => name(id as unknown as PlayerId)).join(", ")}` +
        " — available for pickup, behind the men the card nominated",
    );
    if (view.unaccountedRushers.length === 0) {
      out.push("  │    …and nobody needed him: every rusher was already accounted for");
    }
  }

  for (const { event } of events) {
    if (event.type !== "PRESNAP_READ") continue;
    const p = event.payload;
    out.push(
      `  ├─ ${p.kind} — ${name(p.actor)}: ${p.roll.total} vs. ${p.target}` +
        ` → ${p.band ?? (p.roll.total >= p.target ? "SEES IT" : "MISSED IT")} (${p.tier})`,
    );
    out.push(`  │    d100 ${p.roll.raw}${p.roll.modifiers.map((m) => ` ${signed(m.value)} ${m.source}`).join("")}`);
  }

  for (const { event } of events) {
    if (event.type !== "CHECK") continue;
    const p = event.payload;
    if (p.checkKind !== "blitz_pickup" && p.checkKind !== "stunt_communication") continue;
    const opposed = p.opposedRoll;
    const a0 = p.actors[0];
    const a1 = p.actors[1];
    if (p.checkKind === "blitz_pickup" && opposed !== undefined) {
      out.push(
        `  ├─ blitz pickup (§7.4): ${a0 === undefined ? "?" : name(a0)} ${p.roll.total}` +
          ` vs. ${a1 === undefined ? "?" : name(a1)} ${opposed.total} → ${bandOf(p)} (${signed(p.margin)})`,
      );
    } else {
      out.push(
        `  ├─ stunt communication (§7.3): ${p.roll.total} vs. ${p.target ?? "-"}` +
          ` → ${bandOf(p)} (${signed(p.margin)})`,
      );
    }
  }

  if (view !== undefined && view.hotConversions.length > 0) {
    for (const c of view.hotConversions) {
      out.push(
        `  ├─ HOT (§5.3): ${name(c.receiver as unknown as PlayerId)} breaks off "${c.from}"` +
          ` → "${c.to}" (${c.airYards} air yards)`,
      );
    }
    out.push("  │    …and moves to the front of the progression");
  }

  if (out.length === 0) return [];
  return ["PRE-SNAP (§5.3 / §7.3 / §7.4):", ...out, ""];
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
    entry.rows.push(
      `  │    Tick ${tickLabel(event.tick)}: rush ${event.payload.roll.total} vs. block ${opposed.total}` +
        ` → ${bandOf(event.payload)} (${signed(event.payload.margin)})`,
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
      // ADR-022 petition 5, ratified: the EVENT says why he is coming. This used
      // to be read off the absence of a tick ("published before the first TICK,
      // so no rep can have created him"), which was correct and was an inference
      // from an absence — the class of thing Charter §4.1 exists to eliminate.
      threats.push(
        p.origin === "WON_REP"
          ? `  │    Tick ${at}: ${name(p.rusher)} wins the rep → ${p.alignment} threat,` +
            ` ${travel.toFixed(1)}s to travel, arrival ${eta}`
          : `  │    Pre-snap: ${name(p.rusher)} is UNBLOCKED (${freeRunnerReason(p.origin)})` +
            ` → ${p.alignment} free runner,` +
            ` ${travel.toFixed(1)}s to travel, arrival ${eta} (roll ${p.rollRef})`,
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
      const actor = p.actors[0];
      out.push(`  ├─ Tick ${tickLabel(event.tick)}: pocket movement${actor === undefined ? "" : ` (${name(actor)})`}`);
      out.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      // SOUND / RUSHED / PANICKED — how far down his own preference list the
      // moment pushed him. WHICH response that landed on is the QB_DECISION
      // event beside it, so the rank itself needs no table.
      out.push(`  │    Result: ${bandOf(p)} (${signed(p.margin)})`);
      out.push("  │");
    }
    if (p.checkKind === "scramble") {
      out.push(`  ├─ Tick ${tickLabel(event.tick)}: escape attempt (§8.8)`);
      out.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      out.push(`  │    Result: ${bandOf(p)} (${signed(p.margin)})`);
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
    // ADR-009: `zone_coverage` is now exactly the route-vs-zone rep, so this is
    // a label test rather than an inference from who is in `actors`.
    if (event.payload.checkKind === "zone_coverage") zoneCoverages.set(String(receiver), envelope);
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
        `  │      Result: ${winnerText(payload.margin, off, def)} → ${bandOf(payload)}` +
          (defender === undefined ? "" : ` (vs. ${name(defender)})`),
      );
    }

    const coverage = coverages.get(key);
    if (coverage !== undefined && coverage.event.type === "CHECK") {
      const payload = coverage.event.payload;
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
      // The openness the band maps to is not restated here: the openness TRACK
      // below is `ROUTE_STATUS.openness`, which is the number the play actually
      // ran on, tick by tick, and it starts from exactly this rep.
      out.push(`  │      Result: ${winnerText(payload.margin, off, def)} → ${bandOf(payload)}`);
    }

    // §9.4 — one roll against a target, not two rolls against each other. The
    // zone defender's rating sets how small the window is; it does not get its
    // own die, and the printout should not pretend otherwise.
    const zoned = zoneCoverages.get(key);
    if (zoned !== undefined && zoned.event.type === "CHECK") {
      const payload = zoned.event.payload;
      const defender = payload.actors[1];
      out.push(
        `  │    Zone coverage (rep resolved at tick ${tickLabel(zoned.event.tick)})` +
          (defender === undefined ? ":" : ` vs. ${name(defender)}:`),
      );
      out.push(`  │      ${actorLabel(payload.roll, "OFF")}:  ${formatRoll(payload.roll)}`);
      out.push(`  │      vs. target ${payload.target ?? "-"} (50 + defender Zone Coverage ÷ 5)`);
      // Whether he SAT DOWN in it is in the openness track too: a settled
      // receiver reports the SETTLED phase, which is what ADR-009 added it for.
      out.push(`  │      Result: ${bandOf(payload)} (${signed(payload.margin)})`);
    }

    // No coverage rep at all. Two different facts, and the stream distinguishes
    // them: a route that never declared has no rep because it never got there;
    // a route that DID declare and still has no rep found a hole in the zone.
    if (coverages.get(key) === undefined && zoned === undefined) {
      const declared = rows.some(
        (row) => row.includes("OPEN(") || row.includes("SETTLED(") || row.includes("DECAYING("),
      );
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
      // ON_TIME / ANTICIPATED / NOT_YET / LOCKED_ON say it; whether the ball
      // actually left is the QB_DECISION that follows.
      const p = event.payload;
      const actor = p.actors[0];
      out.push(
        `  ├─ Anticipation (Tick ${tickLabel(event.tick)})${actor === undefined ? "" : `: ${name(actor)}`}`,
      );
      out.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      out.push(`  │    Result: ${bandOf(p)} (${signed(p.margin)})`);
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
      out.push(`  ├─ Decision quality (Tick ${tickLabel(event.tick)}):`);
      out.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      out.push(`  │    Result: ${bandOf(p)} (${signed(p.margin)})`);
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

/**
 * §10 — and the one place ADR-011's two halves meet.
 *
 * `THROW` carries `rollRef`, the accuracy CHECK's `rngLabel`; that CHECK carries
 * §10.4's PLACEMENT BAND. So the band a throw was made with is recoverable by a
 * join, exactly the way `CATCH_RESOLUTION` and `TIPPED_BALL` already work — one
 * roll, one band, referenced rather than copied (ADR-004).
 */
function renderThrow(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const thrown = firstOfType(events, "THROW");
  if (thrown === undefined) return [];
  const placement = accuracyCheckFor(events, thrown.payload.rollRef);
  const out: string[] = [
    "THROW EXECUTION:",
    `  ├─ Throw type: ${thrown.payload.throwType} to ${name(thrown.payload.target)}` +
      (placement === undefined ? "" : ` — ${bandOf(placement.payload)} placement`),
    "  │",
  ];

  // Rendered in design-doc order (§17.1): the zone defender's read of the
  // release, then the lane, then ball placement — regardless of the order the
  // engine happened to roll them in.
  const zoneRead: string[] = [];
  const lane: string[] = [];
  const accuracy: string[] = [];
  for (const { event } of events) {
    if (event.type !== "CHECK") continue;
    const p = event.payload;
    if (p.checkKind === "zone_read_qb") {
      const defender = p.actors[0];
      zoneRead.push(
        `  ├─ Zone defender reading the QB (§9.4)${defender === undefined ? "" : `: ${name(defender)}`}`,
      );
      zoneRead.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"} (60 + QB disguise)`);
      // What breaking on the ball is WORTH shows up where it is spent: as a
      // named modifier on the contested-catch roll below.
      zoneRead.push(
        `  │    Result: ${p.margin >= 0 ? "BREAKS ON THE BALL" : "stays in his area"} (${signed(p.margin)})`,
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
      accuracy.push("  └─ Accuracy:");
      accuracy.push(`       ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      // The placement band, and what it is worth is visible where it is applied:
      // "Ball placement: GOOD +10" is a named modifier on the catch roll.
      accuracy.push(`       Result: ${bandOf(p)} (${signed(p.margin)}) [${p.tier}]`);
    }
  }
  out.push(...zoneRead, ...lane, ...accuracy, "");
  return out;
}

/** The accuracy CHECK a `THROW.rollRef` names, if it is in this stream. */
function accuracyCheckFor(
  events: readonly MatchEventEnvelope[],
  rollRef: string | undefined,
): Extract<MatchEvent, { type: "CHECK" }> | undefined {
  if (rollRef === undefined) return undefined;
  for (const { event } of events) {
    if (event.type !== "CHECK" || event.payload.checkKind !== "accuracy") continue;
    if (event.payload.roll.rngLabel === rollRef) return event;
  }
  return undefined;
}

/**
 * §12 — the tipped ball, joined from its CHECKs by `rollRef` (ADR-004/009),
 * exactly as `renderCatch` joins the catch.
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
  const join = (rollRef: string): Extract<MatchEvent, { type: "CHECK" }> | undefined =>
    checksByLabel.get(rollRef);

  const out: string[] = ["TIPPED BALL (§12):", `  ├─ Deflected by ${name(p.deflector)}`];

  const quality = join(p.rollRef);
  if (quality !== undefined) {
    const q = quality.payload;
    out.push("  ├─ Roll 1 — deflection quality:");
    out.push(`  │    ${formatRoll(q.roll)} vs. target ${q.target ?? "-"} (throw height + velocity)`);
    out.push(`  │    Result: ${bandOf(q)} (${signed(q.margin)}) → recovery target ${p.finalTargetNumber}`);
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
    const check = join(attempt.rollRef);
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
      out.push(`  ├─ Catch type: ${contested ? "CONTESTED" : "ROUTINE"}`);
      out.push(`  ├─ ${actorLabel(p.roll, "OFF")}: ${formatRoll(p.roll)}`);
      if (p.opposedRoll !== undefined) {
        out.push(`  ├─ ${actorLabel(p.opposedRoll, "DEF")}: ${formatRoll(p.opposedRoll)}`);
      }
      if (p.target !== undefined) out.push(`  ├─ vs. target ${p.target}`);
      out.push(`  ├─ Result: ${bandOf(p)} (${signed(p.margin)}) [${p.tier}]`);
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
  readonly kind: string;
  readonly offenseCall: string;
  readonly offenseFormation: string;
  readonly readSystem: string;
  readonly quarterback: string | undefined;
  readonly readOrder: readonly string[];
  /** RUN_PLAY_V1 only. */
  readonly scheme: string;
  readonly carrier: string | undefined;
  readonly designedGap: string | undefined;
  readonly defenseCall: string;
  readonly defenseFront: string;
  readonly coverage: string;
  readonly down: number;
  readonly distance: number;
  readonly ballOn: number;
  /** §7.4 / §5.3. Empty on a run and on any card the printout predates. */
  readonly unaccountedRushers: readonly string[];
  readonly availableBlockers: readonly string[];
  /** ADR-026. Empty on a run, and on any card whose protection all found a man. */
  readonly unblockedProtectors: readonly string[];
  readonly blitzDisguise: string;
  readonly hotConversions: readonly {
    readonly receiver: string;
    readonly from: string;
    readonly to: string;
    readonly airYards: number;
  }[];
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
    kind: asString(root["kind"], "?"),
    offenseCall: asString(offense["call"], "?"),
    offenseFormation: asString(offense["formation"], "?"),
    readSystem: asString(offense["readSystem"], "?"),
    quarterback: typeof offense["quarterback"] === "string" ? offense["quarterback"] : undefined,
    readOrder: asStringArray(offense["readOrder"]),
    scheme: asString(offense["scheme"], "?"),
    carrier: typeof offense["carrier"] === "string" ? offense["carrier"] : undefined,
    designedGap: typeof offense["designedGap"] === "string" ? offense["designedGap"] : undefined,
    defenseCall: asString(defense["call"], "?"),
    defenseFront: asString(defense["front"], "?"),
    coverage: asString(defense["coverage"], "?"),
    down: asNumber(situation["down"], 0),
    distance: asNumber(situation["distance"], 0),
    ballOn: asNumber(situation["ballOn"], 0),
    unaccountedRushers: asStringArray(defense["unaccountedRushers"]),
    availableBlockers: asStringArray(offense["availableBlockers"]),
    unblockedProtectors: asStringArray(offense["unblockedProtectors"]),
    blitzDisguise: asString(defense["blitzDisguise"], "STANDARD"),
    hotConversions: asHotConversions(offense["hotConversions"]),
  };
}

function asHotConversions(value: unknown): PlayStartView["hotConversions"] {
  if (!Array.isArray(value)) return [];
  const out: { receiver: string; from: string; to: string; airYards: number }[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (record === undefined) continue;
    out.push({
      receiver: asString(record["receiver"], "?"),
      from: asString(record["from"], "?"),
      to: asString(record["to"], "?"),
      airYards: asNumber(record["airYards"], 0),
    });
  }
  return out;
}
