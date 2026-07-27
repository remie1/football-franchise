# SPEC #7 — NARRATIVE ENGINE

**Status:** Draft for owner review
**Owner agent:** `narrative`
**Governed by:** ARCHITECTURE_CHARTER.md §3-D6; effects constrained to Spec #1 §6.2 `NarrativeEffect`
**Feeds:** the advance-button interrupt queue (Spec #5 §13), media layer (Spec #12 §5), tutorial arcs (Spec #13)

## 1. PURPOSE & THE HARD BOUNDARY

Every good sports franchise game is a story machine. This package is that machine: it watches what the simulation and the franchise actually did, and turns it into arcs, characters, pressure, and choices that have consequences.

**The hard boundary:** narrative writes back **only** through the closed `NarrativeEffect` union — morale deltas, availability changes, reputation deltas, pressure deltas. It never mutates rosters, cap, ratings, or engine state directly, and it never reaches into another domain. Expanding that union is a contract petition. This is what keeps a story system from silently becoming a second, unauditable rules engine.

Corollary: **narrative may not manufacture facts.** It reacts to real simulated events. A story about a quarterback's collapse fires because he actually threw four interceptions, not because the engine decided a collapse arc was due.

## 2. ARCHITECTURE

```
Event streams (match + franchise)
   → TRIGGERS (subscriptions with conditions)
      → ARC INSTANCES (stateful, multi-week, with memory)
         → BEATS (interrupts, media stories, conversations, choice points)
            → EFFECTS (the closed union) + new trigger conditions
```

**Storylines are data.** A template declares: trigger conditions, cast roles (which entities fill which parts), beat sequence with branch points, choice options and their consequences, exit conditions, and follow-on hooks. Generated text lives in separate template files so tone can be revised without touching logic (Spec #11 agent rule).

**Arc instances are stateful and remembered.** An arc that resolved in 2029 remains queryable in 2034 — that's what lets the assistant you passed over show up as a rival head coach with history intact.

## 3. THE INTERRUPT QUEUE (the advance button's fuel)

Per Spec #5 §13, narrative is the primary source of the suspense in advancing time. Each beat emits an interrupt with:

```ts
{ id, arcId, severity: 1..5, authority, delegable, day, digestText, presentation }
```

- **Severity gates halting.** Sev 4–5 always stop the clock; 1–2 collect into the digest; 3 respects the user's sensitivity setting.
- **Delegable beats** resolve through the responsible staff seat when the user has delegated that duty, appearing in the digest as "handled by" with the outcome — the lite player still *reads* their franchise's story without being asked to run it.
- **Seeded and deterministic.** Interrupt timing and selection derive from the world seed; the same save advances identically.
- **Density budget.** A rolling cap on interrupts per week/phase prevents soap-opera saturation; the dead period gets a deliberately sparse-but-nonzero budget so a July event lands with force.

## 4. SELECTION: CAUSED, NOT RANDOM

Arc selection is weighted by state, not drawn uniformly. Weight inputs: team performance and trajectory, morale distribution, individual personality sheets (Spec #14), staff relationships, contract and cap pressure, media heat, reputation axes, fashion posture (Spec #12), and **prior user choices**. The design goal from the notes is that replays differ while every arc feels *caused* — a locker-room fracture arc should be far likelier on a losing team with a volatile star and a coach who benched him than anywhere else.

**Choices close doors.** Per the notes, a choice must be able to foreclose storylines as well as open them. Templates declare `forecloses: [arcTemplateIds]` and `unlocks: [...]`, so a season's path is genuinely narrowed by its decisions rather than fanning out forever.

## 5. THE CAST (sources, from the design notes)

Each source is a character with attributes, agenda, and memory — not a message bus:

| Source | Brings | Notes |
|---|---|---|
| Director of Player Engagement | player distress, life issues, quiet frustrations | rated seat (Spec #14 §5); accuracy and trust govern what you learn |
| Director of Team Security | arrests, incidents, 2am phone calls | the first call before media |
| VP of Football Communications | breaking stories, brand damage control | briefs you before the press does |
| Agents | contract demands, holdout threats, "fix your guy" | two-way channel; the coach can call *them* |
| NFLPA | grievances, suspension advocacy, formal buffers | escalation path |
| Cap manager | contract-trigger warnings, distracted players | numbers with narrative consequence |
| Medical / clinicians | confidential absences for treatment | formal, protective framing |
| Media | rankings, think-pieces, heat, praise | Spec #12 §5 |
| Owner & president | mandates, hot seat, budget, ambitions | NPC pressure in v1 |
| Coaching staff | lobbying, resentment, loyalty, ambition | Spec #11 entities |
| Players | teammates, leaders, malcontents, veterans | personality-driven |

## 6. STORYLINE CATEGORIES (v0 pools)

Player life and conduct (legal trouble, substance, family, fame, pursuits beyond football, charity, coming-out and other identity arcs — handled with care per §9); contract and holdout drama; locker-room dynamics and factions; coaching and staff (poaching, resentment, mentorship, the Walsh tree); media and reputation; league-context arcs (fashion, rule changes, rival dynasties); franchise arcs (rebuild fatigue, championship windows, relocation pressure); and rehabilitation arcs — the design notes' favorite, the failed first-round quarterback who becomes yours and works.

**The Aldon Smith pattern** (from the notes) is the template case for a long arc: a high-rated young player whose off-field trouble compounds, producing suspensions, absence, and rating decay across seasons, with the user's handling choices genuinely altering the branch.

## 7. REPUTATION & PRESS

Two coupled systems, per the notes:

- **Reputation axes** (not a single good/evil bar): e.g. player-first ↔ ruthless, transparent ↔ guarded, loyal ↔ opportunistic, traditional ↔ innovative. Choices move axes; axes gate future options (some players won't sign with a coach known for X) and shape how NPCs interpret your actions.
- **Press relationship** as the *manifestation* variable — the notes' sharp insight: your choices set direction, but your press relationship determines whether they become public identity. Shutting out the media limits damage *and* limits credit, and carries its own costs (heat, ownership friction).

## 8. THE STAKES VOICE (owner's directive, generalized)

Before any **irreversible or world-altering decision**, a qualified character articulates the consequences in-fiction — never as a system dialog. The owner's example is canonical:

> The user is about to vote to shorten the season by a week. A league veteran, a longtime beat writer, or the team historian says plainly: the league will no longer look like the one everyone grew up with; records set from here will not sit beside the heroes of the past; every season stat going forward exists in a different frame.

This pattern generalizes to Tier B rule votes (Spec #5 §14.1a), franchise relocation, trading a franchise cornerstone, firing a beloved coach, and tanking decisions. Two rules: the voice must be a *character with standing* on that subject (so it carries weight rather than reading as a warning label), and it must **inform without blocking** — the user may proceed, and the character remembers that they did.

## 9. CONTENT GUARDRAILS

- **Real-player mode restricts sensitive templates.** Development builds import real names; conduct arcs (arrests, substance issues, personal crises) are **disabled for real, named individuals** and enabled only for generated players. Inventing criminal or medical allegations about real people is out of bounds regardless of the fictional frame, and shipping builds are fictional anyway.
- Sensitive topics (substance, mental health, legal trouble, identity) are written with dignity, routed through the professional channels the notes describe, and never played for spectacle.
- All generated text lives in reviewable template files — not runtime-improvised — so tone stays under authorial control.

## 10. IMPLEMENTATION NOTES

- No engine coupling: `@ff/narrative` imports only `@ff/contracts`; it subscribes to streams and emits effects.
- Arc state is saved; text templates are content, hot-editable.
- Calibration ignores narrative entirely (the frozen play-caller and baseline sims run without it), so storylines can never distort statistical tuning.
- Authoring is the long pole. Build order: trigger/arc runtime and interrupt queue first (mechanical, testable), a small v0 pool second, then content growth continuously — content scales after the machine works.

## 11. DIALOGUE & CHOICE DESIGN

Decision: **free-form-feeling dialogue with several distinct options per beat**, built to avoid the legibility trap the owner named (the obvious positive / neutral / hostile triad).

### 11.1 What the tradition offers, and where it fails

| Approach | Exemplars | Known failure |
|---|---|---|
| Full-text branching tree | classic CRPGs | authoring cost; screen real estate |
| Paraphrase wheel | Mass Effect | the *paraphrase problem*: what you pick isn't what your character says |
| Valence-aligned morality meter | paragon/renegade | the documented collapse — players choose by screen position and color without reading, morality becomes a pre-chosen playstyle rather than a series of judgments, and neutral options become dead weight. **This is precisely the pattern to avoid.** |
| "X will remember that" | Telltale | convergent outcomes; the illusion of choice |
| Illusion loops ("But thou must") | many | option/response mismatch; the NPC refuses the answer the game offered |
| Skill-gated checks | Fallout, Disco Elysium | save-scumming; options degrade into stat readouts |
| **Tone selection** | **Football Manager press conferences** | closest genre analog and a cautionary one: opaque, repetitive, feels like guessing the parser rather than speaking |

### 11.2 What the field is currently pursuing

Ideological and factional tracking rather than good/evil axes; internal voices as interlocutors (skills that argue with you); deliberate **structural variety** as an anti-pattern-recognition device — mixing binary, multi-option, timed, and stat-gated beats, with silence as a valid choice, on the reasoning that predictable choice structure is itself what deadens engagement; and trope-informed design that explicitly hunts option/response mismatches. LLM-driven NPC dialogue is an active research area, with persona-consistency-versus-task-fidelity as its live problem — worth watching, not worth depending on for v1 (it would break authorial control and determinism).

### 11.3 Our rules

1. **No valence-aligned option sets.** Options differ by *which variables they touch*, not by how good they are. A beat's three options might each be defensible: one protects the locker room but costs press goodwill; one buys short-term compliance at the cost of a promise you must later keep; one defers and preserves optionality but reads as weak to a veteran watching.
2. **Show the line, not a label.** Full text (or its first clause) to eliminate the paraphrase problem.
3. **Options are filtered from a pool, not fixed.** Each beat carries many candidate lines; 3–5 surface, selected by your reputation axes, what you actually know, who is in the room, and your open commitments. Different playthroughs see different option sets — variety without a ten-option wall.
4. **Uncertainty of effect, never of intent** *(the keystone rule)*. You always know what you're saying. You don't know how it will land, because the listener's personality sheet is hidden information (Spec #14 §2). Dialogue thus becomes an *application of the perception pillar* rather than a separate guessing minigame — and unlike tone-selection systems, the opacity is diegetic: you're reading a person, not a parser.
5. **Staff shape your options and your read.** The Player Engagement director's assessment ("he needs to hear a commitment, not sympathy") is advice whose reliability equals his `readAccuracy`. Better staff also *unlock* better lines — hiring decisions literally improve your dialogue.
6. **Delegation is always an option.** Hand the conversation to a coordinator, the engagement director, or the cap manager; their attributes resolve it. Native to the delegation pillar, and the lite player's path through the story.
7. **Commitments are tracked.** Some lines create promises — more targets, a starting job, "we'll extend you in March." Kept or broken is remembered and moves needs directly (Spec #14).
8. **Standing and cost.** Some options require credibility you have or don't (you cannot credibly play the players' coach after a ruthless season); some spend press goodwill or locker-room capital. No option is free.
9. **Silence and deferral are always available and always meaningful.**
10. **Anti-mismatch.** The response must acknowledge what was actually said. No amnesia, no "but thou must" loops. If an outcome is forced, the beat is not a choice and shouldn't pretend to be.

### 11.4 Experimental swings (prototype candidates)

- **The room.** Others present react to what you say to someone else — the same words land differently in private, in the locker room, or at a podium. A public/private axis rather than more options.
- **Interpretation drift.** What you said gets *reported* — by media, by an agent, by a player to teammates — with distortion. The league remembers the reported version. This makes press relationship (§7) mechanically real: your words and your record of them can diverge.
- **Consequential ambiguity.** Occasionally the same line is available twice in a season and lands differently because the *listener* changed — teaching that people, not scripts, determine outcomes.

## 12. THE STORYLINE TRACKER

Light but real (owner decision). Arcs are grouped into tracked areas; each shows active arcs, their state, involved cast, and open obligations. It doubles as the franchise-history document.

| Area | Tracks |
|---|---|
| Player arcs | per-player: conduct, role, health/comeback, development, personal life |
| Locker room | factions, leadership, morale trends, culture arcs |
| Coaching & staff | mentorship, resentment, ambition, poaching, the tree |
| Front office & ownership | mandates, hot seat, budget fights, succession |
| Contracts & cap | holdouts, extensions, tags, restructure sagas |
| Media & reputation | running narratives, your reputation axes, current heat |
| Rivalries | team rivalries; personal ones (coaches, former players, the assistant you passed over) |
| Legacy & records | milestone chases, historical comparisons, franchise firsts |
| League & era | fashion shifts, rule-change fights, dynasties, expansion |
| Franchise arc | rebuild/window state, city and fan relationship, relocation pressure |
| Draft & scouting | bust/steal narratives, your evaluation reputation |
| **Commitments** | cross-cutting: every open promise you've made, to whom, and its deadline |
| Alumni & tree | former players and coaches elsewhere, including the tutorial cast |

## 13. DECISIONS (resolved)

1. **Free-form-feeling dialogue, several distinct options per beat**, governed by §11.3 — non-valence-aligned, full-text, pool-filtered, with uncertainty of effect rather than intent.
2. **A light storyline tracker** with the areas in §12.
3. **Fictional-mode text: shallow-but-consistent first** — names, hometowns, and basic biography generated coherently at v1; deeper backstory enrichment once arcs prove out.