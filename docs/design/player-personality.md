# SPEC #14 — PLAYER PERSONALITY, MORALE & CONTRACT MOTIVATION

**Status:** Draft for owner review
**Owner agent:** `franchise-engine` (state + negotiation) with `narrative` (events that move it)
**Governed by:** ARCHITECTURE_CHARTER.md; Spec #1 `PlayerCondition`; Spec #6 perception rules apply (personality is *perceived*, not known)

## 1. THE MODEL (owner's design)

Morale is not a single stat pushed around by a single input. It is a **level** moved at a **rate**, where the rate is personal:

```
moraleDelta(week) = Σ(need satisfaction terms) × volatility × situationalDampers
```

- **Volatility** — one per-player attribute governing how fast morale moves **in both directions**. Mercurial players spike and crash; even-keeled players drift slowly. This is the single "slope" stat. It is an **individual** attribute, never a positional constant (see §1.1).
- **Needs** — a per-player **personality sheet** of weighted wants. Each need is scored weekly; unmet needs push down, met needs push up, and *weight* determines how much any one need matters to this individual.
- **Dampers** — situational overrides, chief among them the owner's cliché-made-mechanic: **winning is the ultimate antidote.** Sustained success damps negative terms across the board, so a player in a scheme he dislikes on a 10–2 team stays largely content. Losing removes the damper and lets every grievance land at full weight. Grievances therefore *surface* during losing streaks rather than appearing from nowhere — which is exactly how real locker rooms behave.

Personality types (Spec #11 §5 style-match) remain **types**; needs are **weighted dimensions**. Both live on the same sheet.

### 1.1 Position and volatility — dependency, not stereotype (owner discussion, resolved)

The familiar pattern (volatile receivers, steady quarterbacks, invisible linemen) is genre convention with weak empirical support, and hard-coding it as positional volatility would be prescriptive stereotyping — the same error the no-prescriptive-meta pillar forbids. There is a better structural explanation, and we model *that* instead:

**Position sets need DEPENDENCY, not volatility.** How much of a player's satisfaction rests on decisions made by other people:
- WR/TE/RB: production and role depend on play-calling, QB choice, and blocking — a perfect performance can still yield two targets. **High dependency.**
- QB: touches the ball every snap; needs are largely self-determined. **Low dependency.**
- OL/DL: little individual statistical identity to be denied. **Low statistical dependency**, higher role/respect dependency.

High-dependency needs are frustrable by circumstance, so frustration events concentrate there *emergently* — the observed pattern reproduces itself without us asserting temperament by position. It also stays diagnosable and fixable for the coach (get him the ball) rather than being a character flaw, and remains falsifiable: if playtest shows the behavior doesn't emerge, we tune dependency weights rather than argue stereotypes.

**Deriving individual volatility (real-player mode):** behavioral observables only — documented holdouts, trade requests, public disputes, unsportsmanlike/taunting penalty rates, team-churn relative to talent. Noisy by nature, which is acceptable: personality is hidden information (§2), so we need a defensible prior that play reveals over time, not a truth claim.

## 2. THE PERSONALITY SHEET (v0 need dimensions)

| Need | Satisfied by | Notes |
|---|---|---|
| Winning | team record, playoff position | the damper's source; near-universal but weighted differently |
| Playing time | snap share vs. positional expectation | the classic grievance |
| Personal production | stats vs. own history/peers | mediated by perception (he sees *his* numbers, not truth) |
| Scheme fit / usage | is he used the way he believes he should be | owner's decision #1 — primarily a *signing/re-signing* driver |
| Money & respect | contract standing vs. positional market | overlaps §4 |
| Market size / spotlight | team market tier, media attention | from the design notes |
| Loyalty / stability | tenure, staff continuity, being drafted here | resists departure; punished by churn |
| Coaching style | style-match with HC/position coach (Spec #11 §5) | why the same player thrives under one coach, wilts under another |
| Role clarity | consistent, defined usage | quiet but real |
| Locker room / relationships | teammate ties, narrative bonds | narrative-driven |
| Geography / family | home region, climate, proximity, taxes & cost of living | free-agency weight mostly |
| Championship window | is this roster built to win **now** (forward-looking, distinct from "winning") | the LeBron calculus |
| Co-star gravity | quality of teammates at key positions; or inversely, wanting to be the unquestioned centerpiece | attracts and repels |
| Organizational competence | drafts well, develops, avoids dysfunction — reputation as a place to work | slow-moving, hard-won |
| Influence | a say in personnel, scheme, or usage | rare, high-weight for stars |
| Business market | endorsement/monetization potential (separable from raw market size) | |
| Reunion pull | former coaches, coordinators, teammates | makes your coaching tree a **recruiting asset** |
| Facilities & medical | training staff, facility quality, playing surface (turf vs grass) | president-side investment pays off here |
| Contract structure | guarantees vs. total value vs. length | a distinct axis from "money" |
| Positional competition | wants a clear path vs. wants to compete | |
| Spite / proving ground | signing where doubted; facing a team that cut him | narrative gold |

**Needs shift with career stage (decided):** weights reweight on an age/stage curve — young players prioritize playing time and role clarity, prime players money, influence and production, veterans winning, championship window and stability. A cheap, authentic source of career arcs.

**The players' survey (league artifact):** an annual league-wide players' association report card grades every franchise on facilities, medical/training staff, travel, food, and ownership — mirroring the real NFLPA survey. It is a public, browsable in-world document; it seeds the organizational-competence and facilities needs; and it gives president-side investment a visible free-agency payoff.

Sheets are generated (fictional mode) or derived from public reporting priors (real mode), and are **hidden information**: your organization holds *perceived* personality with confidence, learned through tenure, interviews, agents, and staff insight. Misreading a player's needs is a real, recoverable mistake — and a rival's misread is exploitable.

## 3. WHAT MORALE ACTUALLY DOES

Consumption points only (charter rule): re-signing willingness and price, trade-request likelihood, holdout risk, effort/availability at extremes (via existing engine channels — never a direct performance multiplier at ordinary levels), development-rate modifier, locker-room contagion (high-influence players propagate mood), and narrative trigger thresholds. Morale is a **decision-and-development** force, not a hidden performance dial — this keeps the sim honest and prevents morale from becoming an invisible cheat code.

## 4. CONTRACT NEGOTIATION AS NEED SATISFACTION

Per the owner: the same sheet drives negotiations. A player's ask is not one number but a **weighted evaluation of an offer**: money and structure, yes, but discounted or inflated by the offering team's record, projected playing time, scheme/usage fit, coaching, market, geography, and staff relationships (Spec #11 `gravity` folds in here as a coach-side term). This produces real behavior for free: hometown discounts, mercenary auctions, "he took less to win," and the veteran who leaves for a bigger role. It also makes the market-price system (Spec #5) a *negotiation* rather than a number-guess — the fix for the Madden complaint in the original notes.

## 5. THE PLAYER ENGAGEMENT SEAT (decision #1, expanded)

Needs are surfaced through **staff reports in qualitative language**, not numeric meters. The **Director of Player Engagement** — promoted from narrative flavor (design notes) to a rated staff seat under Spec #11 — signs those reports, and their attributes govern both:

- `playerTrust` — depth of what players disclose; a trusted director surfaces quiet frustrations (role clarity, family strain) months before they become trade requests.
- `readAccuracy` — how correct the reports are; weak directors deliver vague or occasionally wrong summaries.
- `intervention` — effectiveness when the player *acts* on a report (a conversation that actually resolves a grievance), and the primary channel for the design notes' player-crisis pathways (substance, legal, family).

This makes the explicit-meters option a *progression* rather than a settings flip: an elite engagement director already gives you near-explicit reads, earned rather than toggled. Reports are perception artifacts and obey Spec #6 rules — including the possibility of being confidently wrong.

## 6. DECISIONS (resolved)

1. **Qualitative staff reports** in v1 (no numeric need meters), delivered through the Player Engagement seat; explicit-meter mode reserved as a possible later switch.
2. **Needs shift with career stage** — age/stage reweighting curve (§2).
3. **Volatility is individual; position sets dependency** (§1.1).
4. **Annual players' survey** added as a league artifact tying president-side investment to free agency (§2).