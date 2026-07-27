# ADR-001: Seeding 2026 Scheme Fashion from Real NFL Trends

- **Date:** July 2026
- **Proposed by:** Orchestrator (research pass)
- **Status:** **RATIFIED** (owner, July 2026)
- **Implements:** Spec #12 §8 decision 3

## Need

Real-league mode starts in 2026 and needs initial `FashionScore` values per scheme family, plus market-price posture per archetype. Fictional mode starts near-neutral; real mode should feel recognizable on day one. Per the no-prescriptive-meta pillar, these values affect **price, availability, AI behavior, and media voice only** — never engine effectiveness.

## Research summary (sources listed below)

### Offense — the prevailing orthodoxy

**Pre-snap motion is near-universal and plateauing.** <cite index="6-1">Motion appeared on 64.0% of plays in 2025, with every team except the Giants using it at least half the time</cite>, and <cite index="6-1">the rise from 61.5% the prior year was more modest than earlier jumps, suggesting offenses are approaching the ceiling of how much they want to use</cite>. Fashion read: **saturated orthodoxy** — high score, but no longer a differentiator (nobody gets credit for it; teams that *don't* look deficient).

**Heavy personnel is the live trend.** <cite index="5-1">Two-tight-end (12) personnel reached 22.1% of snaps, the highest rate of the 2000s, with over 10,000 two-plus-TE plays for the first time since 2015</cite>. <cite index="8-1">Three-receiver sets fell to their lowest rate since 2014, six-or-more-OL usage hit its highest mark since 2016, and 22 tight ends were drafted this spring — the most since 2002.</cite> Fashion read: **ascendant**, with visible market follow-through (the draft-capital surge is the copycat cycle in progress).

**13 personnel is the prestige innovation.** <cite index="7-1">The Rams under McVay made three-TE sets a staple and led the league in usage, and the piece notes others will copy it</cite>; the payoff is concentrated in the intermediate window, where <cite index="9-1">throws of 11–20 yards produced nearly 12 yards per dropback, a far larger split over short throws than other personnel groupings show</cite>. Fashion read: **hot, unproven at scale** — and the ideal in-game demonstration of our personnel-confound mechanic (§3 of Spec #12): imitators without three capable tight ends should get ordinary results.

**Under center is back, in service of play-action.** <cite index="8-1">Playing under center supports the two engines of the modern offense — play-action and pre-snap motion — and teams with mobile quarterbacks like the Ravens, Eagles and Commanders are expected to follow that trend</cite>. Fashion read: rising.

**Coaching-tree concentration:** <cite index="8-1">this hiring cycle again added McVay/Shanahan-tree coaches, and nearly half the league now comes from that tree</cite>. Fashion read: this is the *lineage* premium made numeric — exactly the pedigree-anchoring bias Spec #6 §5 models.

### Defense — the response

**Two-high is the settled baseline.** <cite index="13-1">Two-high safety looks on passing downs climbed from 44% in 2019 to 63% in 2024, with no sign of slowing</cite>, and <cite index="14-1">quarters-based coverages continue growing as "limit explosive plays" becomes a guiding principle, while man coverage has fallen to its lowest usage in years</cite>. Fashion read: two-high/quarters **saturated orthodoxy**; heavy man coverage **out of fashion** (and therefore a cheap, contrarian buy — press-man corners priced below their true value is precisely the market inefficiency the design wants available).

**Base personnel is quietly returning**, driven by coverage-capable linebackers: <cite index="14-1">the Lions, Packers and Vikings all rank top-six in base usage, with Detroit using base on 82.3% of first downs, more than double the league average</cite>. Fashion read: rising — a direct counter to heavy offensive personnel.

**Pressure is getting smarter, not louder.** <cite index="12-1">Early-down run-blitz rates fell from roughly 25% in 2023 to 18% in 2024 before stabilizing near 22% in 2025, as coordinators shifted toward simulated pressures from base looks that preserve coverage integrity</cite>. And front movement is champion-adjacent: <cite index="17-1">both the 2025 Super Bowl champion Seahawks and Indiana used line movement to create chaos for opposing offensive lines, though by different approaches</cite>. Fashion read: simulated pressure and stunting **ascendant**; volume blitzing **stale**.

**Run-first early downs:** <cite index="12-1">first-down run rate exceeded 50% in 2025, with early-down passing rates down over five percentage points since 2021</cite>.

### Market posture (drives Spec #14 pricing and Spec #5 tiers)

<cite index="21-1">The 2026 market produced a surplus of one-year contracts, with non-premium positions — safety, running back, and tackle — seeing few large deals or ones that age poorly</cite>, while <cite index="21-1">players like Alec Pierce, Tyler Linderbaum, Trey Hendrickson and Jaelan Phillips each cleared $27 million per year on multi-year terms</cite>. <cite index="22-1">Consistent plus starters at guard command huge free-agent money.</cite> Fashion read: interior OL and edge premium high; safety/RB/off-ball depressed; tight end rising (draft behavior).

## Round 2: testing the first pass against the champion and the market

The second research pass checked the initial read against (a) what the 2025 champion actually did, (b) the 2026 hiring cycle, and (c) draft-vs-free-agency behavior. Three findings **revised** the first pass.

### Correction 1 — the champion contradicts the "base personnel" trend

Seattle won Super Bowl LX 29–13 over New England. But <cite index="28-1">the Seahawks allowed an NFL-low 3.7 yards per carry despite leading the league in snaps with at least five defensive backs on the field</cite> — the opposite of the NFC North base-personnel approach. The real champion signal is **light-box run defense enabled by versatile safeties**, not base personnel. Base gets revised down; a distinct "big nickel / versatile safety" family is added high.

### Correction 2 — pressure without blitzing is the sharpest signal

<cite index="30-1">Macdonald's defense generated havoc mostly from its stunting front four, finishing second in the league with 267 pressures despite ranking 25th in blitz rate at 22%</cite>, and <cite index="32-1">Seattle blitzed about a quarter of the time overall, far less on early downs, spiking to 40% only on third-and-long — then in the Super Bowl inverted its own tendency, blitzing 33% in the first half and 8% in the second</cite>. This is stronger evidence than the first pass had: four-man stunting pressure isn't merely ascendant, it's the championship template. Volume blitzing stays stale, and *tendency-breaking* emerges as its own prized coaching quality (a `gamePlanning`/`inGameAdjustment` narrative hook, not a scheme family).

### Correction 3 — the coaching market swung defensive and experienced

<cite index="35-1">Macdonald became the first head coach to win a Super Bowl as his team's primary defensive play-caller</cite>, and the cycle followed: Baltimore hired Chargers DC Jesse Minter, <cite index="41-1">Tennessee hired Robert Saleh following an early trend in the cycle of teams opting for candidates with previous head-coaching experience</cite>, Pittsburgh hired Mike McCarthy, Miami hired Jeff Hafley. The first pass over-weighted the offensive-guru orthodoxy; roughly half the league still descends from the McVay/Shanahan tree, but **this cycle's fashion favored defensive play-callers and retreads**. Coaching-market seeds adjust accordingly — and the "previous HC experience" premium is itself a pedigree-anchoring bias worth modeling directly.

### New insight — fashion and market price can diverge (and that's the good part)

Veteran safety contracts stayed depressed in 2026 free agency, yet Seattle's breakout defender was rookie safety Nick Emmanwori, <cite index="28-1">taken 35th after the Seahawks moved up 17 spots, a Defensive Rookie of the Year finalist who ran 4.38 with a 43-inch vertical at the combine</cite>. So the *archetype* (versatile athletic safety) is ascendant while the *veteran market* at that position is soft. Design consequence: **fashion score and market price are separate values**, not one derived from the other. The gap between them is precisely where the GM game lives — and this real case proves the divergence is authentic rather than a modeling artifact.

## Proposed seed values (0–100, 2026 season start) — revised

| Family | Seed | Posture |
|---|---|---|
| Motion-heavy West Coast (Shanahan/McVay lineage) | 82 | saturated orthodoxy |
| Heavy personnel (12/13, 6-OL) | 78 | ascendant |
| Under-center play-action | 72 | rising |
| Spread 11-personnel shotgun | 45 | fading default |
| Air-raid / pure dropback | 30 | out of fashion |
| Two-high / quarters | 85 | saturated orthodoxy |
| **Four-man stunting pressure (low-blitz havoc)** | **88** | **championship template** |
| Big nickel / versatile-safety light box | 80 | ascendant (champion signal) |
| Base personnel with coverage LBs | 62 | rising, but not the champion's path |
| Single-high man-heavy (Cover 1/3) | 35 | out of fashion |
| Volume blitz | 28 | stale |

**Coaching-market seeds (separate axis):** defensive play-caller HCs 80 (rising sharply); prior-HC-experience premium 75; McVay/Shanahan lineage 78 (high but no longer scarce); Harbaugh/Ravens lineage 72; first-time offensive coordinators 55 (cooled from prior cycles).

**Archetype price posture (separate from fashion, per the new insight):** interior OL and edge premium high; tight end rising; versatile athletic safety — *high draft demand, soft veteran market*; veteran RB, off-ball LB, and non-premium tackle depressed; one-year "prove-it" structures common.

## Impact

Franchise (hiring market, FA pricing), narrative (media voices), and AI org behavior read these values. Engine unaffected — auditable by the guardian, since `@ff/engine` never imports fashion state. Values are data, revisable without code change; fictional mode ignores this file entirely.

## Sources

**Round 1:** PFF (Jan 2026 schematic trends; Mar 2026 free-agency contract structure), Sharp Football Analysis (2025–26 offensive trend series), ESPN (personnel groupings; Barnwell on 13 personnel), NFL Draft Diamonds (two-high adoption via Next Gen Stats), MatchQuarters (early-down pressure), NFL.com (2026 free-agent positional rankings).
**Round 2:** ESPN (Seahawks defensive scheme keys), Yahoo Sports (Macdonald pressure/blitz splits via Next Gen Stats), MatchQuarters (Super Bowl LX All-22 breakdown), NFL.com and CBS Sports (2026 hiring-cycle trackers and grades), AP (Macdonald as defensive play-caller), Wikipedia (2025 Seahawks season record).

## Confidence and gaps

Scheme-usage rates and the champion's profile are well-sourced. Weaker: precise positional APY tables (drawn from reported summaries rather than a full contract database), systematic coaching-tree lineage mapping, and college-to-NFL scheme diffusion. These would tighten the pedigree-bias seeds but do not change the postures above.

## Decision

**Ratified by the owner, July 2026.** The revised seed table (post-round-2) is authoritative for real-league mode 2026 starts. Fictional mode ignores this file and starts near-neutral. Values are data and may be revised by later research without a charter amendment; the *principle* they serve (no prescriptive meta — fashion affects price, availability, AI behavior and media voice only, never engine effectiveness) is charter-level and may not.
