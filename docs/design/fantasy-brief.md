# SPEC #10 — FANTASY MODE STANDING BRIEF

**Status:** Standing brief (living document — the advisor amends it via memos, not code)
**Owner agent:** `fantasy-advisor` (read-only; memos to `docs/decisions/`)
**Governed by:** ARCHITECTURE_CHARTER.md §3-D9

This is not an implementation spec. Fantasy mode ships in no planned version. This brief exists so that a future mode the owner cares about is *protected* while v1 is built — every architectural decision gets quietly checked against it, and decisions that would foreclose it get flagged before they harden.

## 1. THE CONCEPT (owner's words, formalized)

A league of real people — friends — playing **week by week across a real NFL season**, where the game world is **impacted by what actually happened in real life that weekend**. Kin to fantasy football's social rhythm (weekly stakes, head-to-head, a group chat arguing about it) but instead of assembling imaginary rosters of real players, each participant *runs a team* — making the coaching/GM decisions and being judged on what their decisions produce.

Timing anchor from the original notes: the mode works best starting **after preseason, before Week 1** — join windows align with the real calendar.

**Terminology lock (per owner):** *Fantasy mode* = this concept. *Multiplayer* = multiple humans sharing one franchise via authority-tag splitting (COACH vs GM as separate people). Multiplayer is a solved architectural footnote — the tags already carry it. This brief is about fantasy mode.

## 2. THE CENTRAL UNSOLVED QUESTION: DIVERGENCE VS RE-SYNC

The owner's original notes already identified the crux: fantasy football never diverges from reality because it only *scores* reality. Our mode lets you make different decisions than the real coach — which means the game world and the real world split apart the moment Week 1 kicks off. The design question is what happens next. Three candidate shapes the advisor evaluates decisions against (none chosen; all kept alive):

**Shape A — Weekly Reset ("parallel Sundays"):** every week, the world re-syncs to reality. Your rosters, records, and player states snap to IRL each Tuesday; you then coach *your* version of this week's real matchup. Scoring compares your outcome against the real result and against your league-mates. Pros: zero drift problem, maximum "impacted by real life," lowest simulation burden. Cons: no consequences carry forward — your Week 3 masterstroke doesn't exist in Week 4; the GM half of the game (roster building) mostly vanishes.

**Shape B — Persistent Divergence with Live Ratings:** the league drafts/claims real teams before Week 1, then the worlds diverge permanently — *except* player attributes keep updating from real weekly data (a breakout IRL rookie gets better in your world too; a real injury… does it happen in your world? sub-question the advisor tracks). Pros: full management game with real-world texture. Cons: drift compounds — by Week 10 your Eagles share nothing with the real Eagles but ratings, and "impacted by real life" thins.

**Shape C — Hybrid (persistent decisions, re-synced state):** roster/strategic decisions persist; player attributes, availability, and league context re-sync weekly. Your *choices* accumulate; the *world materials* stay tethered to reality. Probably the owner's instinct rendered mechanical — and the hardest to specify cleanly. The advisor's standing job is to notice which sub-decisions (injury mirroring, standings, playoff qualification) each variant needs.

## 3. ARCHITECTURAL ASSETS ALREADY ACCRUING (no extra cost)

Decisions already made for other reasons that fantasy mode inherits for free — the advisor maintains this ledger so their value is visible:

1. **Availability-matched replay harness** (Spec #3 §10.2): calibration already builds "impose this week's real-world availability on the sim" — the exact machinery Shapes A and C need for weekly re-sync.
2. **Weekly-cadence ingestion** (Spec #3 §2): the data pipeline already refreshes in-season; fantasy mode promotes it from dev tool to live feed rather than inventing one.
3. **Deterministic seeded engine** (Spec #1 §8): head-to-head fairness for free — both players' games are exactly reproducible and verifiable from seeds; no "the sim screwed me" disputes that can't be audited.
4. **Authority tags:** a fantasy league could run coach-only or GM-only variants (owner's early note) as permission masks — no new machinery.
5. **Importer isolation** (Spec #4 §5): real-data ingestion already lives in one sealed module — becoming a live feed changes its cadence, not its architecture.
6. **Attribute registry with versioned migrations** (Spec #1 §2): weekly rating updates are registry-compatible patches, same machinery as calibration's L4 adjustments.

## 4. WATCH ITEMS (what the advisor checks at every phase gate)

- **Mid-season mutability:** can the engine and franchise accept roster/rating/availability changes *between* weeks without a world rebuild? (Any design that assumes ratings are fixed at season start forecloses Shapes B and C.)
- **Save format league-awareness:** `SaveFile` (Spec #1 §9) is single-world today. Watch for assumptions that a save *is* the whole universe — fantasy needs multiple participants' worlds sharing a league identity and a common real-data feed version. A `leagueContext?: unknown` slot should be petitioned into the save format before v1 freeze (cheap now, painful later).
- **Calendar rigidity:** the franchise calendar (Spec #5, upcoming) must not hard-wire "sim advances only when the user advances" — fantasy mode's clock is the *real* calendar. Flag any design where time cannot be externally driven.
- **Determinism leaks:** any nondeterminism (unseeded randomness, wall-clock reads, iteration-order dependence) breaks verifiable head-to-head. The guardian audits for `Math.random`; the advisor watches for subtler leaks in specs.
- **Offline assumptions in the UI:** screens that assume all data is local forever complicate a future shared-league client. Low urgency; noted.

## 5. WHAT WOULD FORECLOSE FANTASY MODE (red lines)

1. Engine or franchise APIs that require a complete, closed world at construction with no mid-season injection path.
2. A save format frozen at v1 without a league-context extension slot.
3. Rating/attribute storage that can't be patched between weeks (registry migrations already prevent this — keep it that way).
4. A calendar state machine that cannot be driven by an external clock.

## 6. OPERATING RULES

- The advisor is invoked at every phase gate (Charter §6) and whenever a spec touches saves, the calendar, ingestion, or engine construction APIs.
- Output: short memos — *what was decided, what it enables/forecloses for fantasy mode, recommendation*. Never blocks, never implements, never expands this brief into a product spec without owner request.
- First standing memo (recorded now): the injury-replay decision of July 2026 (Spec #3 §10.2) is a **major asset** — it builds the weekly re-sync machinery Shapes A and C require, as a calibration necessity. No action needed; value noted.

## 7. QUESTIONS THE OWNER WILL EVENTUALLY DECIDE (not now)

- Which Shape (A/B/C) — or a season-format innovation none of them capture.
- Scoring: judged vs the real coach's actual result, vs league-mates' outcomes, or both.
- Whether real injuries occur in participants' worlds (the emotional design question hiding inside Shape B/C).
- Hosting model when leagues need shared state (the JSON-saves → database trigger identified in the Charter).
