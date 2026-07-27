# SPEC #6 — PERCEPTION (hidden information system)

**Status:** Draft for owner review
**Owner agent:** `franchise-engine` (perception is a franchise subsystem; this spec governs it)
**Governed by:** ARCHITECTURE_CHARTER.md §3-D5; shapes from Spec #1 §3
**Consumed by:** franchise AI decisions, market pricing, UI (display), narrative (perception-gap storylines)

## 1. PURPOSE & THE ONE IRON BOUNDARY

Perception is the game's second pillar made mechanical: hard truth underneath, beliefs on top, and *the beliefs are what everyone acts on*. This spec governs how beliefs form, update, err, and differ per observer.

**The iron boundary:** perception affects **decisions**, never **physics**. The engine consumes `TrueAttributes` exclusively — a receiver nobody believes in still runs his true 4.3. Perception shapes who gets signed, drafted, traded, schemed for, and feared; the field only ever obeys reality. (This is also what makes sleepers *exist*: the gap between a player's truth and the league's belief is the entire sleeper mechanic, and it resolves through play.)

## 2. THE OBSERVER MODEL

```ts
type Observer = TeamId | "PUBLIC";
```

- Every team — the human's included — holds its own `PerceivedAttributes` per player. **The human's team is just another observer**: you see your organization's beliefs, rendered as estimates with confidence bands, not truth.
- **AI symmetry rule:** AI teams read *their own* perception layers for every decision — roster moves, trade valuation, game-planning. AI never reads truth. This is non-negotiable honesty: fog-of-war is only a game if the opponents live in it too. (Difficulty levers, if ever wanted, adjust AI *scouting quality*, never grant truth access.)
- **PUBLIC** is a pseudo-observer: consensus belief synthesized from all observers + media noise. It powers two things — in-world media rankings (the PFF-like lists from the design notes: a browsable, imperfect, *useful* window into other teams' players) and **market anchoring**: free-agency price expectations (Spec #5's tier system) key off PUBLIC perceived value, so a player the market underrates is mechanically cheap. Your edge in the market IS your perception delta vs PUBLIC.

## 3. WHAT UPDATES A BELIEF (source taxonomy)

Every update is an event-driven delta to `{estimate, low, high, confidence}`. Sources, with their character:

| Source | Applies to | Effect profile |
|---|---|---|
| **Practice** | own roster | steady confidence growth on all attrs; the baseline reason you know your own players best |
| **Game exposure** | anyone who *played snaps* | attribute-specific: a CB's man-coverage belief updates when he's targeted in man — updates derive from the match event stream (`CHECK` events tagged with the attrs they tested) |
| **Film study** | upcoming opponents | scheduled franchise action; cheaper, noisier than exposure |
| **Scouting assignments** | any player | directed: assign scouts → confidence grows on that target; scout quality sets noise (§5) |
| **Combine/pro day** | draft class | near-truth on *physical* attrs only (the numbers are public and real); zero direct signal on skill/mental — the trap is authentic (§5) |
| **Interviews/top-30 visits** | draft class | small, noisy signal on mental/knowledge attrs |
| **Staff insight** | players your coaches previously coached | imported belief: hiring a coordinator imports his (high-confidence) beliefs about his former players — and when your coach leaves for a rival, that insight walks out the door *against* you. Both directions, per the design notes |
| **Trait reveals** | anyone | traits are discrete: unknown until revealed by a qualifying moment (a Ball Hawk's second diving INT fires a reveal event), then known permanently |

**The exposure gate (owner's rule, enforced):** *"arriving at solid numbers for a guy who didn't play a down all season shouldn't be real."* Confidence on skill/mental attributes is hard-capped for players below snap thresholds. Practice loosens the cap for your own roster only; nobody converges on a third-stringer's game speed from afar.

## 4. REVEAL CURVES (rookies and beyond)

Per the design notes: a drafted rookie arrives with draft-capital-anchored priors and wide bands. Roughly half the revelation happens across **training camp** (practice source, own team), the rest across the season **gated by snaps**. Other teams' rookies stay foggy until game film exists. Mechanically: each source has a confidence growth curve with diminishing returns; curves are **tunables** (calibration-adjustable, though tuned for fun/pacing rather than realism bands — playtest-owned, not baseline-owned). Veterans entering the league carry high-confidence PUBLIC priors; beliefs never fully freeze — a vet's decline phase reopens uncertainty (confidence decays slowly with age-driven change risk).

## 5. WRONGNESS, NOT JUST WIDENESS (bias model)

Wide bands are honest uncertainty. Real scouting also produces *confidently wrong* beliefs — and the game needs those for its best stories. **Bias is not a league constant: each organization carries its own evaluation profile, emergent from its staff** (per owner direction). One AI team's evaluators swoon for combine heroes; another has a "traditional values" reputation and is immune to that trap but anchored on pedigree; a third chases production stats. The typed bias sources below are the *palette*; each organization's staff composition determines which biases it exhibits and how strongly:

- **Combine-warrior bias:** athletic testing inflates skill estimates for physical outliers (the Caleb Downs insight, weaponized — for organizations whose profile carries it).
- **Pedigree anchoring:** draft capital drags estimates toward slot long after evidence should dominate (busts stay overvalued; UDFAs stay undervalued — tradeable inefficiencies).
- **Recency/small-sample bias:** one loud game moves beliefs more than it should; sharp organizations regress it.
- **Production-over-context bias:** crediting box scores without adjusting for supporting cast (the same entanglement problem our attribute pipeline avoids — organizations that don't).
- **Scout/staff quality:** each evaluator has accuracy attributes; weak evaluators add noise *and* bias magnitude. Evaluator skill is itself hidden and learned by comparing reports to eventual reality.

An organization's profile is *itself a perceivable fact*: over seasons of watching a rival's drafts and signings, observers (including the human) can learn "they always overdraft speed" — and shop accordingly. Exploiting a specific rival's known weakness is the intended play pattern; there is no universal trick that works on the whole league. Bias magnitudes are tunables; the human's own organization is subject to its staff's profile — the player's *defense* is process (more sources, better staff, comparison actions), and the player's *staff choices* are therefore perception decisions.

## 6. THE COMPARISON ACTION (from the design notes)

Direct rating lookups can lie inside overlapping bands, so the notes' idea becomes a mechanic: a **comparison scouting action** targets two players and returns an ordinal verdict ("we believe A > B at route running") with confidence — resolvable even when bands overlap, sometimes wrong at low confidence. Cheap, repeatable, and it makes draft boards and FA decisions feel like real scouting arguments rather than number sorting. (This is also exactly how the resulting UI stays honest: ranges + verdicts, not fake precision.)

## 7. DATA & EVENTS

- Storage: `PerceivedAttributes[]` per observer×subject (Spec #1 §3), persisted in saves; PUBLIC stored once.
- New franchise events (petition batch for contracts v0.1): `PERCEPTION_UPDATED {observer, subject, attrIds, cause}`, `TRAIT_REVEALED {observer, subject, trait, cause}`, `SCOUT_ASSIGNED / SCOUT_REPORT_FILED` (already listed in Spec #1 §6.2), `COMPARISON_FILED {observer, a, b, attrCluster, verdict, confidence}`, `MEDIA_RANKING_PUBLISHED {scope, list}`.
- Update computations run at franchise cadence (post-game, weekly), consuming that week's match event streams — perception is a *consumer* of engine events like every other system, never a special channel.

## 8. UI CONTRACT (what display gets, not how it looks)

The UI receives: estimate + band + confidence per attribute, known traits, report history, comparison verdicts, media rankings, and the delta-since-last-week. It never receives truth for anyone — including your own roster. Rendering (bands? letter grades? star tiers?) is Spec #8's decision; this spec fixes only the data honesty rule. One nuance for Spec #8 to inherit: at very high confidence the band is narrow enough to *feel* exact for your own veterans (matching the notes' "you get ratings with your own players") without the system ever lying about certainty.

## 9. MECHANIC-NOT-NARRATIVE CHECK (charter principle applied)

Perception earns its complexity only if beliefs change decisions. Enforced consumption points: AI trade/FA valuation uses perceived value — *per that organization's profile* (the rival whose evaluators overrate athleticism will overpay for your shopped combine hero; the traditional-values rival won't bite, so knowing your counterparty is part of the trade game); AI game-planning keys on perceived threats (your unknown rookie gets single coverage until film exists — a real, exploitable edge); market prices anchor to PUBLIC; draft boards are pure perception artifacts. If a proposed perception feature has no consumption point that alters a decision, it's narrative flavor and gets cut.

## 10. DECISIONS (formerly open questions — resolved July 2026)

1. **Own-roster endgame: uncertainty never fully dies** — bands floor at a minimum width. Additionally, evaluation excellence is an *organizational specialization with tradeoffs*: an org that hones truth-finding paid for it somewhere (game-planning, development), and elite staff **demand rising salaries** — sustaining an evaluation edge is a staff-budget problem, which ties perception economics to president-level revenue (staff budget as a real constraint; details land in the coaching/staff spec and franchise spec).
2. **Bias is diagnosable AND reviewable: staff evaluation periods.** An offseason evaluation step where the player reviews staff — assesses performance, improvement/regression, and can crystallize conclusions ("our director overrates speed") into recorded profile beliefs; primary coaches can brief the player on positional coaches (staff evaluating staff, filtered through the primary coach's own accuracy). Coach profiling is thus itself a perception loop, subject to the same honesty rules.
3. **Media rankings: full in-world PFF-like weekly lists in v1** — browsable positional/unit rankings published on a real cadence, powered by PUBLIC perception with media-noise bias, usable for exactly what the design notes intended: judging your own players' reputations and windowing rival talent you can't scout directly.
