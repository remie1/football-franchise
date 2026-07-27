# SPEC #12 — EMERGENT META & LEAGUE FASHION

**Status:** Draft for owner review
**Owner agent:** `narrative` (primary); consumed by `franchise-engine` (hiring/market) and perception
**Governed by:** ARCHITECTURE_CHARTER.md; the owner's principle below

## 1. THE PRINCIPLE (owner's, verbatim in spirit)

**Emergent meta, not prescriptive meta.**

We are not qualified to declare what actually works in football. Real life gets to discover that empirically because real physics adjudicate it; a simulation only ever reflects the past information it was built from. So the game must never encode a designer's claim that some scheme innovation *is* superior — that would be projecting a science we don't have, and it would teach players a fake truth about football.

What the game *can* honestly do is what the real sports world does: **notice what won, and talk about it.** If a Cover-2 team with elite press corners wins the Super Bowl in our simulated 2031, the league narrates that as an ascendant style — not because our engine hid a secret sauce, but because winners get imitated. And schemes that haven't won lately get called stale even when the drought was noise.

**The hard rule: fashion is a narrative layer over results. It never alters engine effectiveness.** No modifier anywhere makes a "trendy" scheme better. The engine stays a fixed physics; fashion changes *beliefs and behavior* — which is exactly the perception pillar extended from players to ideas.

## 2. WHAT FASHION ACTUALLY IS

A per-scheme-family, per-era **reputation value** (0–100, PUBLIC-owned like other consensus beliefs), computed retroactively from observed league results:

```
FashionScore(schemeFamily, season) ← weighted recent evidence:
  championships & deep playoff runs by teams identified with it   (heaviest)
  win% and unit rankings of its practitioners
  recency decay (last 3–5 seasons dominate)
  novelty bonus (a family absent from success for years returns as "rediscovered")
  media amplification (§5)
```

Scheme identity comes from data already present: coaches carry scheme family + variant (Spec #11 §3), teams inherit their coordinators' identities. No new tagging burden.

## 3. THE PERSONNEL CONFOUND (owner's insight, mechanized)

A key realism point the owner raised: metas often aren't reproducible because the original team had a **rare personnel balance**, and imitators fail without it.

This is already true in our engine by construction — scheme fit (Spec #11 §4.6) is a bounded modifier keyed to *player attribute shape*, so a scheme only pays off for rosters shaped to run it. Fashion has no idea about that. Therefore imitation naturally disappoints: a copycat GM buys the style but not the shape, gets ordinary results, and the meta "dies." That failure requires no special code — it emerges. What this spec adds is **narrative recognition of the pattern**: the league notices when a style stops working for imitators, and commentary reframes the original as a personnel accident rather than a blueprint ("nobody else has that secondary").

## 4. CONSUMPTION POINTS (where fashion actually bites)

Fashion earns existence only by changing decisions — never physics:

1. **Coaching market:** in-fashion coordinators command more money, get more HC interviews, get hired faster. Out-of-fashion coaches with real accomplishments sit available and cheap — **an explicit target scenario**: a decorated coach whose approach is deemed stale is a genuine risk/opportunity gamble.

   **Scheme labels are not destiny (owner ruling).** A coach tagged with a scheme may be excellent in another; a coach hired *into* the scheme he succeeded with is not thereby an automatic success. Whether it works depends on personnel shape, the mix of the rest of the staff, player health, his own attributes (which may be declining), and randomness. Consensus is often wrong — but it is also **sometimes accidentally right**, and the game must never make betting against consensus a reliable exploit. Mechanically: fashion adjusts *price and availability only*; outcomes route entirely through the ordinary systems (fit, staff, health, attributes, dice). Scheme tags are perception artifacts, not capability tags.

2. **AI organizational behavior:** NPC teams weight fashion when hiring, drafting for scheme, and prioritizing free agents — bandwagoning is an AI behavior, not a rule of football. **Trend response is never uniform (owner ruling):** a Cover-2 champion does not cause 31 imitators. Two new profile attributes govern receptivity, hidden and perceivable like everything else:
   - `trendReceptivity` (owner/president): willingness to fund and demand a fashionable direction — the "we want a modern offense" boss.
   - `schemeOrthodoxy` (head coach): commitment to their own system vs. adaptability to prevailing fashion.
   Combinations produce recognizable org archetypes — trend-chasing owner + orthodox coach is a *conflict generator*, not just a number. These pair with the evaluation-bias profile (Spec #6 §5) to give each franchise a coherent institutional personality.
3. **Player market pricing:** archetypes that fit fashionable schemes get bid up (PUBLIC-anchored, per Spec #6 §2). This is a *market inefficiency generator* — the pillar of your GM game: buy the unfashionable shape that your scheme still values.
4. **Narrative & media:** the storyline engine's richest recurring vein (§5).
5. **Owner/president pressure:** ownership can develop preferences ("we want a modern offense"), creating conflict between what the human believes and what their boss reads in the paper.

Explicitly **not** consumption points: engine modifiers, development rates, morale, or player performance of any kind.

## 5. THE MEDIA LAYER

The in-world media (already building PFF-like rankings per Spec #6 decision #3) narrates fashion: think-pieces after each postseason declaring the new order, "the league has passed him by" pieces about veteran coordinators, copycat-cycle coverage, and — importantly — **eventual contrarian pieces** when imitation fails. Media both *reports* and *amplifies* fashion (a feedback term in §2), which reproduces real sports discourse honestly: the narrative is real, its causal claims are frequently wrong, and the astute manager can profit from that gap.

## 6. STORYLINE HOOKS (for Spec #7)

- Your successful coordinator becomes the fashionable hire → poached → your tree grows, your team weakens.
- You hire the unfashionable veteran → wins → league reverses itself and calls you a visionary (or he flops and the press says you should have known).
- Your scheme becomes fashionable → rivals copy → your personnel edge is now the story → free agents at your archetypes get expensive.
- Ownership pressure to modernize against your judgment.
- A rediscovered-classic arc: a family dormant for a decade returns via one overachieving team.

## 7. IMPLEMENTATION NOTES

- Fashion computes once per offseason (plus a light in-season drift from surprising results); stored in league state; versioned in saves.
- Pure post-hoc computation over completed results — no forward-looking prediction, no engine coupling. A trivially auditable guarantee: `@ff/engine` never imports fashion state, and the contracts-guardian can assert it.
- Calibration ignores fashion entirely (it must, or the frozen play-caller would drift); fashion exists only in the game proper.
- Fictional-league mode benefits most: decades of simulated history generate their own coaching eras organically — a genuine long-franchise texture generator.

## 8. DECISIONS (formerly open questions — resolved)

1. **Scheme preference affects joining, not mood (directly).** A player's scheme/usage preference is primarily a **signing and re-signing** driver, not an immediate morale hit. Morale moves through the personality-sheet model in Spec #14, where an unmet scheme need is one weighted term among many — and winning damps it. The human must select a scheme identity; players may prefer or dislike it accordingly.
2. **Fashion visibility: evidence-first, no numeric dashboard.** See §9 — the player is shown the *inputs a real GM would read* plus in-world voices, and draws their own conclusion. No league-wide fashion rating is ever displayed.
3. **Real-league seeding: yes, from researched current NFL trends.** 2026 fashion values are seeded from a multi-source research pass on actual prevailing NFL scheme trends (offensive and defensive families, personnel usage, market pricing of archetypes), documented with sources in `docs/decisions/`. Fictional mode starts near-neutral and generates its own history.

## 9. HOW FASHION SURFACES (decision #2, detailed)

No "Fashion: 78" anywhere. Two complementary surfaces:

**A. The evidence set.** Wherever a coach, scheme, or archetype is evaluated (hiring screens, FA valuation, draft boards), the UI presents the raw signals a real front office would weigh, letting the user infer:
- recent win rate / unit rankings of the family's practitioners, and *who* achieved them
- asking price vs. positional or coaching market expectation (above/below)
- number of rival organizations known to be interested (competition as a fashion tell)
- headline history: the biggest stories about this person or style over recent seasons
- personnel-shape comparison: how closely your roster resembles the successful practitioner's

**B. The voices ("the room").** Rather than tags, in-world characters each say something short and specific, shaped by their own profile attributes and biases: your coordinators, the scouting director, ownership, and — where appropriate — veteran players. Consensus among voices reveals fashion's *pressure* without asserting truth, and disagreement is itself information ("the owner loves it; your DC thinks it's a fad"). This reuses the narrative and perception machinery already specified, and turns fashion into dialogue rather than a stat readout.