/**
 * THE WHO-PLAYED REPORT (ADR-087 P4, §10): one game's match events → each player's snaps and the
 * matchups he won and lost, for franchise's development week and depth chart.
 *
 * Franchise may not parse engine-shaped events (Iron Rule 1), so the season runner, which may read
 * the engine (ADR-012), reads them here and hands franchise only `GameParticipation`.
 *
 * - Snaps. A scrimmage play's `PLAY_START` carries its play card, which names who is on the field
 *   (the play corpus picks the personnel from the depth chart, so a nickel corner or a second tight
 *   end plays some snaps and not others). Every player the card names is credited a snap: an
 *   offensive one if he is on the team with the ball (the card's offence, else the last
 *   `DRIVE_START`'s), a defensive one if not. A run card names the carrier and the blockers but not
 *   the quarterback who hands off, so the offence's quarterback (the snapshot's) is credited on every
 *   scrimmage play his team runs, named or not. Kicks carry no
 *   `PLAY_START`: each `PLACEKICK` and `KICKOFF` is a special-teams snap for its kicker, each `PUNT`
 *   one for its punter, and a return one for the returner it names.
 * - Matchups. Every opposed `CHECK` between two players (`opposedRoll` present, two actors) is a
 *   contest: the first actor rolled `roll`, the second `opposedRoll`, and the first won when the
 *   margin is above 0 (the engine's convention in every opposed resolver), the second when below.
 *   Each side is credited in the ratings its own roll used (its modifiers' `attr`). Checks that
 *   re-read an earlier roll (`rollRef`, e.g. a pass-rush tick jittering its rep) are not counted
 *   again. A tie (margin 0) is neither.
 */
import type { AttrId, GameParticipation, MatchEvent, MatchEventEnvelope, PlayerId, RollDetail, TeamId } from "@ff/contracts";
import type { GameSnapshot } from "@ff/engine";

type Side = "offense" | "defense" | "special";

/** Every known player id anywhere in a play card, each once. */
function named(card: unknown, known: ReadonlyMap<string, TeamId>, out: Set<string>): Set<string> {
  if (typeof card === "string") {
    if (known.has(card)) out.add(card);
  } else if (Array.isArray(card)) {
    for (const v of card) named(v, known, out);
  } else if (card !== null && typeof card === "object") {
    for (const v of Object.values(card)) named(v, known, out);
  }
  return out;
}

/** The ratings one side of a contest used: its roll's modifiers that name a rating, each once. */
const attrsOf = (roll: RollDetail): AttrId[] => [...new Set(roll.modifiers.flatMap((m) => (m.attr === undefined ? [] : [m.attr])))];

export function participationFrom(events: readonly MatchEventEnvelope[], snapshot: GameSnapshot): GameParticipation[] {
  const teams = [snapshot.home, snapshot.away];
  const teamOf = new Map<string, TeamId>();
  for (const t of teams) for (const id of Object.keys(t.players)) teamOf.set(id, t.team);

  const snaps = new Map<string, Record<Side, number>>();
  const contests = new Map<string, Map<string, { attr: AttrId; won: number; lost: number }>>();
  const snap = (player: PlayerId, side: Side) => {
    const s = snaps.get(String(player)) ?? { offense: 0, defense: 0, special: 0 };
    s[side] += 1;
    snaps.set(String(player), s);
  };
  const credit = (player: PlayerId, attrs: readonly AttrId[], won: boolean) => {
    const mine = contests.get(String(player)) ?? new Map<string, { attr: AttrId; won: number; lost: number }>();
    for (const attr of attrs) {
      const c = mine.get(String(attr)) ?? { attr, won: 0, lost: 0 };
      if (won) c.won += 1; else c.lost += 1;
      mine.set(String(attr), c);
    }
    contests.set(String(player), mine);
  };

  let offense: TeamId | undefined;
  for (const { event } of events) {
    const e = event as MatchEvent;
    switch (e.type) {
      case "DRIVE_START":
        offense = e.payload.offense;
        break;
      case "PLAY_START": {
        const ball = (e.payload as { offense?: { team?: TeamId } } | undefined)?.offense?.team ?? offense;
        const on = named(e.payload, teamOf, new Set());
        const qb = teams.find((t) => t.team === ball)?.offense.quarterback;
        if (qb !== undefined && teamOf.has(String(qb))) on.add(String(qb));
        for (const id of on) snap(id as PlayerId, teamOf.get(id) === ball ? "offense" : "defense");
        break;
      }
      case "PLACEKICK":
        snap(e.payload.kicker, "special");
        break;
      case "KICKOFF":
        snap(e.payload.kicker, "special");
        if (e.payload.returner !== undefined) snap(e.payload.returner, "special");
        break;
      case "PUNT":
        snap(e.payload.punter, "special");
        if (e.payload.returner !== undefined) snap(e.payload.returner, "special");
        break;
      case "CHECK": {
        const c = e.payload;
        if (c.opposedRoll === undefined || c.actors.length !== 2 || c.rollRef !== undefined || c.margin === 0) break;
        credit(c.actors[0]!, attrsOf(c.roll), c.margin > 0);
        credit(c.actors[1]!, attrsOf(c.opposedRoll), c.margin < 0);
        break;
      }
      default:
        break;
    }
  }

  const out: GameParticipation[] = [];
  const ids = [...new Set([...snaps.keys(), ...contests.keys()])].filter((id) => teamOf.has(id)).sort();
  for (const id of ids) {
    const s = snaps.get(id) ?? { offense: 0, defense: 0, special: 0 };
    const c = [...(contests.get(id)?.values() ?? [])].sort((a, b) => String(a.attr).localeCompare(String(b.attr)));
    out.push({ player: id as PlayerId, team: teamOf.get(id)!, snaps: { offense: s.offense, defense: s.defense, special: s.special }, contests: c });
  }
  return out;
}
