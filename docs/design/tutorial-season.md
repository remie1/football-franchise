# SPEC #13 — THE ROOKIE ASSISTANT SEASON (tutorial / onboarding narrative)

**Status:** Draft for owner review
**Owner agents:** `narrative` (arc, characters, scenarios) + `franchise-engine` (unlock gating) + `ui-layout` (surface)
**Governed by:** ARCHITECTURE_CHARTER.md; reuses Spec #11 delegation machinery

## 1. THE CONCEPT (owner's design)

Onboarding is not a tutorial mode bolted beside the game — it is **a playable season inside the game**, and it doubles as the franchise's most authored narrative content.

**Premise:** the user joins a staff as a new assistant coach. The head coach has announced this will be his final season before retirement. Over the year he delegates increasing responsibility to the user — each delegation being, mechanically, the unlocking of another layer of game systems. When the season ends, the user succeeds him and play continues seamlessly into ordinary Franchise Mode.

**Why this works structurally:** it needs almost no bespoke machinery. Spec #11 §11.1 already established layered involvement toggles where undelegated duties resolve through NPC staff. The tutorial is simply *that system, sequenced by story* — the head coach handing you play-calling in Week 4 is the same toggle a veteran player flips in the options menu, wrapped in narrative. Teaching load and content load share one implementation.

## 2. PROGRESSION SHAPE

A rough arc (exact pacing is playtest-owned):

| Phase | Newly delegated | Systems introduced |
|---|---|---|
| Camp / Preseason | observation, one position group's practice reps | reading perceived attributes, bands & confidence; practice basics |
| Week 1 | **the clipboard offer** — the HC asks whether you want to call plays this week or sit it out | in-game screen available from the very first regular-season game (opt-in, repeatable weekly) |
| Weeks 1–3 | weekly opponent prep for a unit; post-game prep debriefs if you declined the clipboard | film study, tendencies, gameplan packets — declining is a *learning path*, not a lockout: you see how your prep shaped a game you didn't call |
| Weeks 4–6 | expanded play-calling scope, situational authority | play families, personnel packages, sequencing |
| Weeks 7–9 | practice allocation, injury/load decisions, halftime adjustments | development, stamina, adjustment chess |
| Weeks 10–13 | roster transactions (practice squad, waivers), scouting assignments | perception mechanics, scouting economy |
| Weeks 14–end | full game management; cap/contract briefings from the GM | GM-side systems, staff evaluation |
| Postseason/offseason | succession → all systems | Franchise Mode proper |

**Rules:** every unlock is narratively motivated (the coach *asks*, and the user may decline — declining keeps the duty delegated, which is a legitimate playstyle, not a failure state). Nothing unlocked is ever forcibly re-locked. A **skip/veteran path** exists (start in Franchise Mode with everything open); a middle option starts the arc but allows accelerating unlocks at will.

## 3. THE HEAD COACH AS A CHARACTER

A fully-statted staff entity (Spec #11) with an authored personality, plus a **relationship track** with the user driven by choices across the season: whether you accept responsibilities, whether your calls succeed, whether you defer to or contradict him publicly, how you handle his players.

The relationship's end state seeds later content — but **warmth does not determine outcome, it reweights an outcome pool (owner ruling).** Each temperature makes some futures likelier without making any single one certain:

- A *warm* relationship might yield a lifelong mentor and advocate — or a beloved rival when he un-retires with another franchise two years later and you must beat someone you genuinely like (a distinct and richer story than a grudge match).
- A *cold* relationship might yield the un-retired nemesis, quiet press sniping, a race to poach the same assistants — or an unexpected late reconciliation.
- *Neutral* might fade gracefully — or resurface unpredictably when your paths cross in a playoff or a coaching search.

**The rest of the staff matter equally.** Fellow assistants during the training season are fully-fleshed characters with their own ambitions and relationship tracks — including the one who expected the promotion you received. They persist for decades of league time: the assistant who resented you becomes a rival head coach you face in a 2032 title game; the one you mentored becomes your future coordinator hire. The training season is the game's character-seeding engine.

## 4. THE SEASON'S SCENARIO POOL

Authored scenarios drawn from a pool, with selection weighted by user choices rather than pure randomness (so replays differ but feel caused). The owner's example is the template case:

> **"Picking Sides"** — the coach decides late that he wants to stay; the owner forces him out anyway. Players take sides. Depending on the user's visible loyalties, some veterans finish the year with damaged morale or request trades — and the user inherits that fractured room in Year 1 as their own problem.

Other pool candidates: a star player who trusts only the old coach; a coordinator who expected the promotion and now works under you; a midseason collapse that turns the farewell tour sour; a farewell-tour surge that raises expectations unfairly for your first year; a media narrative that credits *you* for wins and embarrasses him; an injury crisis that forces early delegation ahead of schedule.

**Design constraint:** scenarios must resolve through existing mechanics (morale deltas, availability, reputation, perception changes — Spec #1's `NarrativeEffect` union), not bespoke tutorial-only code. If a scenario needs a new effect channel, it's a contract petition like anything else.

## 5. CONSEQUENCE CARRY-OVER

The tutorial season is not a sandbox that gets discarded — its ending state *is* the franchise's starting state: the roster you inherit, the cap situation, the staff who stayed or left, the locker-room morale, your press reputation, and the relationship track. First-year Franchise Mode is therefore already dense with history, which is the fastest possible route to the "care about my franchise" feeling the design notes ask for.

## 6. IMPLEMENTATION NOTES

- **Zero engine impact.** Nothing here touches simulation; it gates *which mechanics the UI exposes* and *who resolves undelegated duties*.
- Unlock state is franchise state (saved), expressed as the same involvement-toggle flags used in ordinary play.
- The arc is authored data (a scenario script + trigger conditions), not hard-coded flow — the narrative agent owns it as content.
- Build order: this lands late (post-UI, alongside narrative, Charter Phase 6+) but is specified now because it constrains the toggle system's granularity — Spec #8 must expose toggles fine-grained enough to sequence, not just three coarse presets.

## 7. DECISIONS (formerly open questions — resolved)

1. **The user picks the franchise;** the retiring head coach, the assistant cast, and the scenario pool generate around that choice so one authored arc serves all 32 teams.
2. **Job security:** the user **is fireable by default**, in every season including this one, with a **settings toggle to disable firing** for players who want to stay with their chosen franchise permanently. Training-season specifics: the pressure is *not* ordinary hot-seat pressure, and a first-season exit should only ever result from a path the user visibly chose — never from playing the game badly, because it is training. **Being fired never ends the game**: the user becomes head coach elsewhere the following season (true in all seasons, not just this one). There is no "passed over and remain an assistant" outcome — being passed over is simply an alternate narrative route to the same head-coaching job elsewhere, and a good one (it seeds the rival-assistant grudge).
3. **Replayable campaign**, referred to in-product as the **training/tutorial campaign** — available on any new franchise, not a one-time onboarding.