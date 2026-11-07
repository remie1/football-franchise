# ADR-089 step 4: the arms

Contact by approach and the throwing motion, built behind the rules name pocket-1.s4, which nothing plays by default; these arms turn it on for measurement only.

- filing: fnv1a:9a1c90e9; amendments at step 4: fnv1a:e0c05cf0 (the guard AM-6 (ADR-089 Appendix H, H.8); the readings AM-7 (ADR-089 Appendix H, H.9))
- fingerprint: 50ac610534081425; commit: 40137fc2124c136b51be4203c70a214cc3af11f4; node v22.22.0; caller v7
- PR #33: OPEN

## What failed, first

- GRADED, a failed prediction (taken to the owner; nothing in it is automatic): s4.contact.gen.sack: gen set 1 13.29 (set 2 13.00) [time to throw D3 1.263 s (throwaways in), 1.216 s aimed]; beside, never graded: D4 gen set 1 36.03 (set 2 37.08) [time to throw D4 2.219 s (throwaways in), 2.159 s aimed]
- GRADED, a failed prediction (taken to the owner; nothing in it is automatic): s4.contact.hitOrSack: flat set 1 -1.39 (set 2 -1.36) [time to throw D3 1.258 s (throwaways in), 1.164 s aimed against A0 1.242 s (throwaways in)]; gen set 1 -0.64 (set 2 -0.68) [time to throw D3 1.263 s (throwaways in), 1.216 s aimed against A0 1.235 s (throwaways in)]; beside, never graded: D4 against A14 flat set 1 -3.52 (set 2 -3.54) [time to throw D4 2.372 s (throwaways in), 2.286 s aimed against A14 2.396 s (throwaways in)]; beside, never graded: D4 against A14 gen set 1 -2.03 (set 2 -0.95) [time to throw D4 2.219 s (throwaways in), 2.159 s aimed against A14 2.250 s (throwaways in)]
- GRADED, a failed prediction (taken to the owner; nothing in it is automatic): s4.contact.gen.share: gen set 1 56.79 (set 2 55.11) [time to throw D3 1.263 s (throwaways in), 1.216 s aimed]; beside, never graded: D4 gen set 1 66.21 (set 2 64.21) [time to throw D4 2.219 s (throwaways in), 2.159 s aimed]
- GRADED, a failed prediction (taken to the owner; nothing in it is automatic): s4.contact.flat.share: flat set 1 73.85 (set 2 73.58) [time to throw D3 1.258 s (throwaways in), 1.164 s aimed]; beside, never graded: D4 flat set 1 80.20 (set 2 80.30) [time to throw D4 2.372 s (throwaways in), 2.286 s aimed]
- GRADED, a failed prediction (taken to the owner; nothing in it is automatic): s4.motion.curveRises: flat set 1 aimed-weighted -0.0441 (attempt-weighted -0.0429); set 2 -0.04; gen set 1 aimed-weighted -0.0587 (attempt-weighted -0.0561); set 2 -0.07; beside, never graded: D5 flat set 1 aimed-weighted -0.0233 (attempt-weighted -0.0169); beside, never graded: D5 gen set 1 aimed-weighted -0.0060 (attempt-weighted -0.0053); beside, never graded: D1 flat set 1 aimed-weighted -0.0184 (attempt-weighted -0.0064); beside, never graded: D1 gen set 1 aimed-weighted -0.0136 (attempt-weighted -0.0130); beside, never graded: D2 flat set 1 aimed-weighted -0.0466 (attempt-weighted -0.0463); beside, never graded: D2 gen set 1 aimed-weighted -0.0616 (attempt-weighted -0.0602); raw release bins against decision bins (AM-7 item 3; rho below 0.5, so 0): throws moved on D6 flat set 1 0, set 2 0; raw release bins against decision bins (AM-7 item 3; rho below 0.5, so 0): throws moved on D6 gen set 1 0, set 2 0

## The s4 clauses (seed set 1 graded, set 2 beside; amendments at step 4 fnv1a:e0c05cf0)

- s4.contact.flat.sack (graded; D3; filed 10 to 14): PASS: flat set 1 13.78 (set 2 14.03) [time to throw D3 1.258 s (throwaways in), 1.164 s aimed]; beside, never graded: D4 flat set 1 28.60 (set 2 29.23) [time to throw D4 2.372 s (throwaways in), 2.286 s aimed] (split: in its band on one seed set and out on the other (reported, AM-7 seedSets))
- s4.contact.gen.sack (graded; D3; filed 9 to 13): FAIL: gen set 1 13.29 (set 2 13.00) [time to throw D3 1.263 s (throwaways in), 1.216 s aimed]; beside, never graded: D4 gen set 1 36.03 (set 2 37.08) [time to throw D4 2.219 s (throwaways in), 2.159 s aimed]
- s4.contact.pressure (graded; D3 against A0; filed -1 to 1): PASS: flat set 1 -0.30 (set 2 -0.07); gen set 1 -0.08 (set 2 -0.13); beside, never graded: D4 against A14 flat set 1 -0.01 (set 2 0.00); beside, never graded: D4 against A14 gen set 1 0.01 (set 2 0.10)
- s4.contact.hitOrSack (graded; D3 against A0; filed -1 to 1): FAIL: flat set 1 -1.39 (set 2 -1.36) [time to throw D3 1.258 s (throwaways in), 1.164 s aimed against A0 1.242 s (throwaways in)]; gen set 1 -0.64 (set 2 -0.68) [time to throw D3 1.263 s (throwaways in), 1.216 s aimed against A0 1.235 s (throwaways in)]; beside, never graded: D4 against A14 flat set 1 -3.52 (set 2 -3.54) [time to throw D4 2.372 s (throwaways in), 2.286 s aimed against A14 2.396 s (throwaways in)]; beside, never graded: D4 against A14 gen set 1 -2.03 (set 2 -0.95) [time to throw D4 2.219 s (throwaways in), 2.159 s aimed against A14 2.250 s (throwaways in)]
- s4.contact.gen.share (graded; D3; filed 40 to 55): FAIL: gen set 1 56.79 (set 2 55.11) [time to throw D3 1.263 s (throwaways in), 1.216 s aimed]; beside, never graded: D4 gen set 1 66.21 (set 2 64.21) [time to throw D4 2.219 s (throwaways in), 2.159 s aimed]
- s4.contact.flat.share (graded; D3; filed 50 to 65): FAIL: flat set 1 73.85 (set 2 73.58) [time to throw D3 1.258 s (throwaways in), 1.164 s aimed]; beside, never graded: D4 flat set 1 80.20 (set 2 80.30) [time to throw D4 2.372 s (throwaways in), 2.286 s aimed]
- s4.motion.hits (graded; D6 against C2; filed at least 3): PASS: flat set 1 9.30 (set 2 9.11) [time to throw D6 3.006 s (throwaways in), 2.981 s aimed against C2 2.741 s (throwaways in)]; gen set 1 10.14 (set 2 10.46) [time to throw D6 2.959 s (throwaways in), 2.936 s aimed against C2 2.701 s (throwaways in)]; beside, never graded: D5 against C1 flat set 1 4.15 (set 2 4.40) [time to throw D5 1.868 s (throwaways in), 1.787 s aimed against C1 1.606 s (throwaways in)]; beside, never graded: D5 against C1 gen set 1 6.72 (set 2 7.17) [time to throw D5 1.975 s (throwaways in), 1.930 s aimed against C1 1.704 s (throwaways in)]; beside, never graded: D1 against C1 flat set 1 4.26 (set 2 4.52) [time to throw D1 1.869 s (throwaways in), 1.787 s aimed against C1 1.606 s (throwaways in)]; beside, never graded: D1 against C1 gen set 1 6.85 (set 2 7.32) [time to throw D1 1.975 s (throwaways in), 1.929 s aimed against C1 1.704 s (throwaways in)]; beside, never graded: D2 against C2 flat set 1 9.38 (set 2 9.23) [time to throw D2 2.990 s (throwaways in), 2.977 s aimed against C2 2.741 s (throwaways in)]; beside, never graded: D2 against C2 gen set 1 10.57 (set 2 10.77) [time to throw D2 2.951 s (throwaways in), 2.937 s aimed against C2 2.701 s (throwaways in)]
- s4.motion.curveRises (graded; D6; filed direction UP): FAIL: flat set 1 aimed-weighted -0.0441 (attempt-weighted -0.0429); set 2 -0.04; gen set 1 aimed-weighted -0.0587 (attempt-weighted -0.0561); set 2 -0.07; beside, never graded: D5 flat set 1 aimed-weighted -0.0233 (attempt-weighted -0.0169); beside, never graded: D5 gen set 1 aimed-weighted -0.0060 (attempt-weighted -0.0053); beside, never graded: D1 flat set 1 aimed-weighted -0.0184 (attempt-weighted -0.0064); beside, never graded: D1 gen set 1 aimed-weighted -0.0136 (attempt-weighted -0.0130); beside, never graded: D2 flat set 1 aimed-weighted -0.0466 (attempt-weighted -0.0463); beside, never graded: D2 gen set 1 aimed-weighted -0.0616 (attempt-weighted -0.0602); raw release bins against decision bins (AM-7 item 3; rho below 0.5, so 0): throws moved on D6 flat set 1 0, set 2 0; raw release bins against decision bins (AM-7 item 3; rho below 0.5, so 0): throws moved on D6 gen set 1 0, set 2 0 (a falling curve records default D1's fallback at step 4 for step 5b's selection (AM-7 missRule))
- s4.motion.int (graded; D6 against C2; filed at most 0): PASS: flat: PASS, Z -1.09; filed reading beside: passes; gen: PASS, Z -0.75; filed reading beside: passes (under AM-6 (AM-1's statistic, the arm's own clock))
- s4.sackerMix.edge (reported; D1; filed 45 to 70): REPORTED: flat set 1 47.21% of credited sacks (set 2 45.62); gen set 1 46.81% of credited sacks (set 2 46.80) (reported; the man at contact is credited (s4.sackCredit))
- s4.sackerMix.interior (reported; D1; filed 12 to 32): REPORTED: flat set 1 29.65% of credited sacks (set 2 31.47); gen set 1 31.87% of credited sacks (set 2 32.76) (reported; the man at contact is credited (s4.sackCredit))
- s4.bRange (reported; D15 against D16; filed 24 to 36): REPORTED: D15 flat set 1 28.73; D15 gen set 1 24.76; D16 flat set 1 24.12; D16 gen set 1 19.75 (reported: the grid's ends against the stand-in ceiling)
- s4.tilt.pushBlocked (graded; D9 against D8; filed direction DOWN): PASS: 30/129 against 58/129: -21.71 points (SE 5.75) (under AM-7: both leagues and sets summed)
- s4.tilt.freeRun (graded; D10 against D8; filed direction UP): PASS: 2541/4478 against 2100/4506: 10.14 points (SE 1.05) (under AM-7: both leagues and sets summed)
- s4.tilt.behindNever (graded; D11 against D8; filed direction UP): PASS: 41/70 against 29/69: 16.54 points (SE 8.37) (under AM-7: both leagues and sets summed)
- s4.sackCredit (structural; D1 against D2 against D3 against D4 against D5 against D6 against D7 against D8 against D9 against D10 against D11 against D12 against D13 against D14 against D15 against D16 against D17; filed structural): PASS (every s4 sack in the pocket under the contact block credited to the man at contact (one RUSHER_SACKS contest); a sack on a motion-alone arm, an escape that ends in a sack (caught by the escape roll or run down) and the coverage sack at the horizon keep today's rule until step 6 (plan §2.2 item 8) and are counted apart)
- s4.qbHitFields (structural; D1 against D2 against D3 against D4 against D5 against D6 against D7 against D8 against D9 against D10 against D11 against D12 against D13 against D14 against D15 against D16 against D17; filed structural): PASS (every QB_HIT carries approach, from and seen; no tilt against its direction)
- s4.reading (structural; D1 against D2 against D3 against D4 against D5 against D6 against D7 against D8 against D9 against D10 against D11 against D12 against D13 against D14 against D15 against D16 against D17; filed structural): PASS (read from the arms played: every D arm but D14 plays the continuous arrival reading and is stamped pocket-1.s4; D14 alone plays the grid, is read by no clause and is in no guard map (never a candidate); the reading inside the engine is the rules tests' proof)
- s4.falsifier.ratingProbes (structural; PR-PLAY; filed structural): PASS: the quarterback's strength +30: 100 compared, 0 diverged before the contest; margin up 0, down 100; shed to sack 0, sack to shed 6; the quarterback's agility +30: 100 compared, 0 diverged before the contest; margin up 0, down 100; shed to sack 0, sack to shed 6; the rusher's tackling +30: 88 compared, 12 diverged before the contest; margin up 88, down 0; shed to sack 3, sack to shed 0; the rusher's speed +30: 97 compared, 3 diverged before the contest; margin up 97, down 0; shed to sack 3, sack to shed 0; 0 golden game(s) with no rated contest (AM-7 item 14: exact at the contest for every b and tilt (the engine's unit proof, contact.test.ts); the play-level probe replays each golden game's first rated contest with one man raised, and a quarterback's strength or agility that moves a compared contest toward the sack falsifies it; the game-level probes are printed with their paired SE, never graded; NOT JUDGED is a structural failure (AM-7))
- s4.falsifier.release (structural; PR-REL80 against PR-REL40; filed structural): PASS: both sets summed: THROWING hits per 100 aimed throws, release 80 10.40 against release 40 14.58; difference -4.18 points, SE 0.18 (independent; paired SE 0.09 beside); beyond 2 SE in its direction (more release, fewer hits): measurable; set 1: release 80 10.49 (3640/34686) against release 40 14.67 (5093/34716); difference -4.18 (SE 0.25, paired SE 0.13), beside; set 2: release 80 10.30 (3598/34935) against release 40 14.49 (5091/35136); difference -4.19 (SE 0.25, paired SE 0.13), beside (AM-7 item 13: D6's bundle on the flat league, release 80 against 40 on every player, both sets summed; measurable is the difference beyond 2 SE in its direction (more release, fewer hits); falsified when it is not)

## The guard under AM-6 (ADR-089 Appendix H, H.8) (AM-1's statistic; both mixes on the arm's own release clock, the own-clock reading beside, never graded)

- D1 against C1, flat: PASS; Z -0.31; breaches none; filed reading beside: league-wide, PROGRESSION, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.06 against the own-clock allowance -0.00 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.01 against the own-clock allowance 0.00 (TICK base, TICK arm)
- D1 against C1, gen: PASS; Z -0.45; breaches none; filed reading beside: RANK_PUSHED, CHECKDOWN, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.12 against the own-clock allowance 0.00 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise -0.04 against the own-clock allowance -0.00 (TICK base, TICK arm)
- D2 against C2, flat: PASS; Z -1.25; breaches none; filed reading beside: CHECKDOWN, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.07 against the own-clock allowance -0.00 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise -0.15 against the own-clock allowance 0.00 (TICK base, TICK arm)
- D2 against C2, gen: PASS; Z 0.12; breaches none; filed reading beside: league-wide, RANK_PUSHED, CHECKDOWN, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.04 against the own-clock allowance -0.01 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.07 against the own-clock allowance 0.00 (TICK base, TICK arm)
- D6 against C2, flat: PASS; Z -1.09; breaches none; filed reading beside: PROGRESSION, RANK_PUSHED, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.03 against the own-clock allowance 0.00 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise -0.16 against the own-clock allowance -0.00 (TICK base, TICK arm)
- D6 against C2, gen: PASS; Z -0.75; breaches none; filed reading beside: CHECKDOWN, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.23 against the own-clock allowance -0.01 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise -0.04 against the own-clock allowance -0.01 (TICK base, TICK arm)
- D1 against A0, flat [cumulative, printed beside, never graded]: REPORTED (not graded); Z 6.40; breaches league-wide, DESPERATION; filed reading beside: league-wide, RANK_PUSHED, DESPERATION
  - own clock (printed, never graded): set 1: rise 0.64 against the own-clock allowance 0.21 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.84 against the own-clock allowance 0.21 (TICK base, TICK arm)
- D1 against A0, gen [cumulative, printed beside, never graded]: REPORTED (not graded); Z 1.19; breaches none; filed reading beside: league-wide, PROGRESSION, RANK_PUSHED, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise 0.58 against the own-clock allowance 0.36 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.59 against the own-clock allowance 0.40 (TICK base, TICK arm)
- D2 against A14, flat [cumulative, printed beside, never graded]: REPORTED (not graded); Z 1.60; breaches none; filed reading beside: league-wide, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise 0.69 against the own-clock allowance 0.41 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.54 against the own-clock allowance 0.42 (TICK base, TICK arm)
- D2 against A14, gen [cumulative, printed beside, never graded]: REPORTED (not graded); Z -0.19; breaches none; filed reading beside: league-wide, PROGRESSION, RANK_PUSHED, DESPERATION
  - own clock (printed, never graded): set 1: rise 0.26 against the own-clock allowance 0.54 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.71 against the own-clock allowance 0.52 (TICK base, TICK arm)
- D1 against A1, flat [accepted, printed beside, never graded]: REPORTED (not graded); Z 0.72; breaches none; filed reading beside: league-wide, PROGRESSION, RANK_PUSHED, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise 0.11 against the own-clock allowance 0.01 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.02 against the own-clock allowance 0.01 (TICK base, TICK arm)
- D1 against A1, gen [accepted, printed beside, never graded]: REPORTED (not graded); Z -1.30; breaches none; filed reading beside: PROGRESSION, RANK_PUSHED, DESPERATION
  - own clock (printed, never graded): set 1: rise -0.29 against the own-clock allowance 0.02 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise -0.10 against the own-clock allowance 0.03 (TICK base, TICK arm)
- D2 against A11, flat [accepted, printed beside, never graded]: REPORTED (not graded); Z -0.94; breaches none; filed reading beside: league-wide, CHECKDOWN, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.01 against the own-clock allowance -0.01 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise -0.18 against the own-clock allowance -0.01 (TICK base, TICK arm)
- D2 against A11, gen [accepted, printed beside, never graded]: REPORTED (not graded); Z -0.91; breaches none; filed reading beside: PROGRESSION
  - own clock (printed, never graded): set 1: rise -0.16 against the own-clock allowance -0.01 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise -0.18 against the own-clock allowance -0.00 (TICK base, TICK arm)
- D3 against A0, flat [information, printed beside, never graded]: REPORTED (not graded); Z 1.55; breaches none; filed reading beside: league-wide, PROGRESSION, RANK_PUSHED, CHECKDOWN, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise 0.10 against the own-clock allowance 0.01 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.20 against the own-clock allowance 0.01 (TICK base, TICK arm)
- D3 against A0, gen [information, printed beside, never graded]: REPORTED (not graded); Z 0.46; breaches none; filed reading beside: league-wide, PROGRESSION, DESPERATION
  - own clock (printed, never graded): set 1: rise 0.05 against the own-clock allowance 0.02 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.16 against the own-clock allowance 0.03 (TICK base, TICK arm)
- D4 against A14, flat [information, printed beside, never graded]: REPORTED (not graded); Z 0.39; breaches none; filed reading beside: league-wide, PROGRESSION, CHECKDOWN, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise 0.06 against the own-clock allowance -0.01 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.02 against the own-clock allowance -0.02 (TICK base, TICK arm)
- D4 against A14, gen [information, printed beside, never graded]: REPORTED (not graded); Z -0.04; breaches none; filed reading beside: league-wide, PROGRESSION, RANK_PUSHED, CHECKDOWN
  - own clock (printed, never graded): set 1: rise 0.09 against the own-clock allowance -0.02 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise -0.17 against the own-clock allowance -0.04 (TICK base, TICK arm)
- D5 against C1, flat [information, printed beside, never graded]: REPORTED (not graded); Z -0.42; breaches none; filed reading beside: league-wide, PROGRESSION, RANK_PUSHED, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.08 against the own-clock allowance -0.00 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.01 against the own-clock allowance 0.00 (TICK base, TICK arm)
- D5 against C1, gen [information, printed beside, never graded]: REPORTED (not graded); Z -0.65; breaches none; filed reading beside: CHECKDOWN, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.06 against the own-clock allowance 0.00 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise -0.16 against the own-clock allowance -0.00 (TICK base, TICK arm)
- D7 against C1, flat [information, printed beside, never graded]: REPORTED (not graded); Z 0.04; breaches none; filed reading beside: league-wide, PROGRESSION, CHECKDOWN, DESPERATION, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.00 against the own-clock allowance 0.00 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.01 against the own-clock allowance 0.00 (TICK base, TICK arm)
- D7 against C1, gen [information, printed beside, never graded]: REPORTED (not graded); Z -0.08; breaches none; filed reading beside: league-wide, PROGRESSION, RANK_PUSHED, CHECKDOWN, ON_THE_RUN
  - own clock (printed, never graded): set 1: rise -0.12 against the own-clock allowance -0.00 (TICK base, TICK arm)
  - own clock (printed, never graded): set 2: rise 0.09 against the own-clock allowance 0.00 (TICK base, TICK arm)

## The tilts under AM-7 (ADR-089 Appendix H, H.9) (first rated :contest of the class, tilted arm against D8, both leagues and sets summed; a FAIL only beyond 2 SE the wrong way; under 30 contacts unreadable)

- s4.tilt.pushBlocked: D9 against D8, direction DOWN: PASS; tilted 30/129, untilted 58/129; difference -21.71 points (SE 5.75)
  - flat set 1: 13/39 against 23/39, -25.64 points (SE 10.91)
  - gen set 1: 4/25 against 9/25, -20.00 points (SE 12.08)
  - flat set 2: 6/31 against 15/31, -29.03 points (SE 11.44)
  - gen set 2: 7/34 against 11/34, -11.76 points (SE 10.60)
- s4.tilt.freeRun: D10 against D8, direction UP: PASS; tilted 2541/4478, untilted 2100/4506; difference 10.14 points (SE 1.05)
  - flat set 1: 721/1278 against 597/1277, 9.67 points (SE 1.97)
  - gen set 1: 508/854 against 425/878, 11.08 points (SE 2.38)
  - flat set 2: 761/1359 against 615/1349, 10.41 points (SE 1.91)
  - gen set 2: 551/987 against 463/1002, 9.62 points (SE 2.23)
- s4.tilt.behindNever: D11 against D8, direction UP: PASS; tilted 41/70, untilted 29/69; difference 16.54 points (SE 8.37)
  - flat set 1: 13/21 against 9/21, 19.05 points (SE 15.13)
  - gen set 1: 9/11 against 8/11, 9.09 points (SE 17.76)
  - flat set 2: 9/20 against 7/20, 10.00 points (SE 15.41)
  - gen set 2: 10/18 against 5/17, 26.14 points (SE 16.10)

## The structural proofs and fold checks

- s4.stream (structural; every s4 stream check: bands, one tilt, a first contest's tilt equal to its class, :contest2 only after a shed, known phases, SHED roll references, C-1): PASSES. clean
- C-1 (structural; on every s4 arm the stand-in's dropbacks equal those with a QB_HIT ARRIVAL or SHED or a sack (AM-7 hitConstruct)): PASSES. clean
- s4.rawBins (fold check; on every s4 arm no aimed throw's raw release (THROW.releaseSeconds) leaves the decision tick's release bin (AM-7 item 3: rho below 0.5)): PASSES. clean
- m6.step4 (fold check; every contact is FIGHT and no THROWAWAY is made while a man stands ARRIVED (no contact choice before step 7); a throwaway after a shed is the move branch, reported): PASSES. clean

## The re-played bases against step 3's records (the stamp-free projection)

- A0 set 1: PASS. equal to step 3's record on the stamp-free projection
- A0 set 2: PASS. equal to step 3's record on the stamp-free projection
- A14 set 1: PASS. equal to step 3's record on the stamp-free projection
- A14 set 2: PASS. equal to step 3's record on the stamp-free projection
- A1 set 1: PASS. equal to step 3's record on the stamp-free projection
- A1 set 2: PASS. equal to step 3's record on the stamp-free projection
- A11 set 1: PASS. equal to step 3's record on the stamp-free projection
- A11 set 2: PASS. equal to step 3's record on the stamp-free projection
- C1 set 1: PASS. equal to step 3's record on the stamp-free projection
- C1 set 2: PASS. equal to step 3's record on the stamp-free projection
- C2 set 1: PASS. equal to step 3's record on the stamp-free projection
- C2 set 2: PASS. equal to step 3's record on the stamp-free projection
- C14 set 1: PASS. equal to step 3's record on the stamp-free projection
- C14 set 2: PASS. equal to step 3's record on the stamp-free projection

## Each arm's step-4 folds

- D1 flat set 1: 51492 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.79; sacks per first contact 50.22%; second-arrival sack rate 79.35% over 92 :contest2
  - by class (first contests): BEHIND_NEVER 1/1, PUSH_BLOCKED 5/25, FREE_RUN 370/685, NONE 86/209; unclassed 0; label-only free run 179/327
  - QB_HIT by phase: ARRIVAL 396, THROWING 2200, SHED 477, SACK 535; on scrambles 50 (reported, not counted); hit-or-sack per 100 7.46 [time to throw 1.869 s (throwaways in), 1.787 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0184, attempt-weighted -0.0064
  - M6 at step 4: {"s4Dropbacks":51492,"contacts":1012,"contactsPer100Dropbacks":1.97,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":535,"QB_SHEDS":477},"brokenReceiverPctOfContacts":87.65,"throwawayAfterShed":251,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D1 gen set 1: 28734 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.87; sacks per first contact 53.07%; second-arrival sack rate 88.41% over 69 :contest2
  - by class (first contests): BEHIND_NEVER 0/1, PUSH_BLOCKED 1/10, FREE_RUN 219/374, NONE 65/152; unclassed 0; label-only free run 95/170
  - QB_HIT by phase: ARRIVAL 367, THROWING 1955, SHED 260, SACK 346; on scrambles 4 (reported, not counted); hit-or-sack per 100 10.18 [time to throw 1.975 s (throwaways in), 1.929 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0136, attempt-weighted -0.0130
  - M6 at step 4: {"s4Dropbacks":28734,"contacts":606,"contactsPer100Dropbacks":2.11,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":260,"RUSHER_SACKS":346},"brokenReceiverPctOfContacts":81.85,"throwawayAfterShed":144,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D1 flat set 2: 51981 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.68; sacks per first contact 51.83%; second-arrival sack rate 82.43% over 74 :contest2
  - by class (first contests): BEHIND_NEVER 3/3, PUSH_BLOCKED 3/14, FREE_RUN 352/661, NONE 95/196; unclassed 0; label-only free run 161/300
  - QB_HIT by phase: ARRIVAL 451, THROWING 2329, SHED 434, SACK 514; on scrambles 42 (reported, not counted); hit-or-sack per 100 7.74 [time to throw 1.872 s (throwaways in), 1.788 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0175, attempt-weighted -0.0160
  - M6 at step 4: {"s4Dropbacks":51981,"contacts":948,"contactsPer100Dropbacks":1.82,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":434,"RUSHER_SACKS":514},"brokenReceiverPctOfContacts":83.54,"throwawayAfterShed":251,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D1 gen set 2: 28571 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.85; sacks per first contact 49.72%; second-arrival sack rate 84.85% over 66 :contest2
  - by class (first contests): BEHIND_NEVER 2/4, PUSH_BLOCKED 1/14, FREE_RUN 199/374, NONE 61/137; unclassed 0; label-only free run 80/165
  - QB_HIT by phase: ARRIVAL 388, THROWING 2091, SHED 276, SACK 319; on scrambles 5 (reported, not counted); hit-or-sack per 100 10.66 [time to throw 2.010 s (throwaways in), 1.968 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0013, attempt-weighted 0.0029
  - M6 at step 4: {"s4Dropbacks":28571,"contacts":595,"contactsPer100Dropbacks":2.08,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":319,"QB_SHEDS":276},"brokenReceiverPctOfContacts":80.17,"throwawayAfterShed":155,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D2 flat set 1: 49398 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.82; sacks per first contact 52.79%; second-arrival sack rate 82.52% over 143 :contest2
  - by class (first contests): BEHIND_NEVER 13/21, PUSH_BLOCKED 12/41, FREE_RUN 732/1305, NONE 238/518; unclassed 0; label-only free run 362/626
  - QB_HIT by phase: ARRIVAL 1300, THROWING 4593, SHED 915, SACK 1113; on scrambles 110 (reported, not counted); hit-or-sack per 100 17.45 [time to throw 2.990 s (throwaways in), 2.977 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0466, attempt-weighted -0.0463
  - M6 at step 4: {"s4Dropbacks":49398,"contacts":2028,"contactsPer100Dropbacks":4.11,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":1113,"QB_SHEDS":915},"brokenReceiverPctOfContacts":54.09,"throwawayAfterShed":503,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D2 gen set 1: 27513 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 4.90; sacks per first contact 51.34%; second-arrival sack rate 85.90% over 156 :contest2
  - by class (first contests): BEHIND_NEVER 11/14, PUSH_BLOCKED 3/25, FREE_RUN 510/880, NONE 168/429; unclassed 0; label-only free run 244/440
  - QB_HIT by phase: ARRIVAL 1248, THROWING 2833, SHED 678, SACK 826; on scrambles 41 (reported, not counted); hit-or-sack per 100 20.36 [time to throw 2.951 s (throwaways in), 2.937 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0616, attempt-weighted -0.0602
  - M6 at step 4: {"s4Dropbacks":27513,"contacts":1504,"contactsPer100Dropbacks":5.47,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":826,"QB_SHEDS":678},"brokenReceiverPctOfContacts":46.08,"throwawayAfterShed":363,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D2 flat set 2: 49570 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.93; sacks per first contact 52.28%; second-arrival sack rate 86.34% over 161 :contest2
  - by class (first contests): BEHIND_NEVER 10/22, PUSH_BLOCKED 8/35, FREE_RUN 749/1344, NONE 252/548; unclassed 0; label-only free run 381/690
  - QB_HIT by phase: ARRIVAL 1294, THROWING 4570, SHED 952, SACK 1158; on scrambles 116 (reported, not counted); hit-or-sack per 100 17.47 [time to throw 2.996 s (throwaways in), 2.980 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0466, attempt-weighted -0.0462
  - M6 at step 4: {"s4Dropbacks":49570,"contacts":2110,"contactsPer100Dropbacks":4.26,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":952,"RUSHER_SACKS":1158},"brokenReceiverPctOfContacts":55.55,"throwawayAfterShed":517,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D2 gen set 2: 27435 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 5.52; sacks per first contact 51.35%; second-arrival sack rate 84.21% over 190 :contest2
  - by class (first contests): BEHIND_NEVER 7/14, PUSH_BLOCKED 5/38, FREE_RUN 582/1014, NONE 184/449; unclassed 0; label-only free run 280/519
  - QB_HIT by phase: ARRIVAL 1414, THROWING 2910, SHED 767, SACK 938; on scrambles 28 (reported, not counted); hit-or-sack per 100 21.76 [time to throw 2.968 s (throwaways in), 2.957 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0682, attempt-weighted -0.0667
  - M6 at step 4: {"s4Dropbacks":27435,"contacts":1705,"contactsPer100Dropbacks":6.21,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":767,"RUSHER_SACKS":938},"brokenReceiverPctOfContacts":47.86,"throwawayAfterShed":411,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D3 flat set 1: 44104 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 10.37; sacks per first contact 45.50%; second-arrival sack rate 83.55% over 1204 :contest2
  - by class (first contests): BEHIND_NEVER 1/6, PUSH_BLOCKED 146/324, FREE_RUN 98/217, NONE 1836/4027; unclassed 0; label-only free run 37/83
  - QB_HIT by phase: ARRIVAL 1820, THROWING 0, SHED 2691, SACK 3087; on scrambles 665 (reported, not counted); hit-or-sack per 100 18.65 [time to throw 1.258 s (throwaways in), 1.164 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0876, attempt-weighted -0.0793
  - M6 at step 4: {"s4Dropbacks":44104,"contacts":5778,"contactsPer100Dropbacks":13.1,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":2691,"RUSHER_SACKS":3087},"brokenReceiverPctOfContacts":81.14,"throwawayAfterShed":143,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D3 gen set 1: 26290 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 14.01; sacks per first contact 41.91%; second-arrival sack rate 85.29% over 1312 :contest2
  - by class (first contests): BEHIND_NEVER 2/5, PUSH_BLOCKED 118/281, FREE_RUN 57/126, NONE 1366/3270; unclassed 0; label-only free run 17/35
  - QB_HIT by phase: ARRIVAL 2381, THROWING 0, SHED 2332, SACK 2662; on scrambles 160 (reported, not counted); hit-or-sack per 100 23.40 [time to throw 1.263 s (throwaways in), 1.216 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.1511, attempt-weighted -0.1509
  - M6 at step 4: {"s4Dropbacks":26290,"contacts":4994,"contactsPer100Dropbacks":19,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":2332,"RUSHER_SACKS":2662},"brokenReceiverPctOfContacts":72.27,"throwawayAfterShed":121,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D3 flat set 2: 44201 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 10.53; sacks per first contact 45.90%; second-arrival sack rate 85.67% over 1193 :contest2
  - by class (first contests): BEHIND_NEVER 0/3, PUSH_BLOCKED 132/305, FREE_RUN 84/186, NONE 1921/4162; unclassed 0; label-only free run 25/48
  - QB_HIT by phase: ARRIVAL 1895, THROWING 0, SHED 2690, SACK 3159; on scrambles 677 (reported, not counted); hit-or-sack per 100 19.07 [time to throw 1.257 s (throwaways in), 1.164 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0756, attempt-weighted -0.0738
  - M6 at step 4: {"s4Dropbacks":44201,"contacts":5849,"contactsPer100Dropbacks":13.23,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":2690,"RUSHER_SACKS":3159},"brokenReceiverPctOfContacts":80.51,"throwawayAfterShed":143,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D3 gen set 2: 26773 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 14.57; sacks per first contact 41.47%; second-arrival sack rate 84.59% over 1421 :contest2
  - by class (first contests): BEHIND_NEVER 3/5, PUSH_BLOCKED 94/272, FREE_RUN 96/179, NONE 1425/3446; unclassed 0; label-only free run 18/42
  - QB_HIT by phase: ARRIVAL 2533, THROWING 0, SHED 2503, SACK 2820; on scrambles 120 (reported, not counted); hit-or-sack per 100 23.59 [time to throw 1.281 s (throwaways in), 1.236 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.1467, attempt-weighted -0.1472
  - M6 at step 4: {"s4Dropbacks":26773,"contacts":5323,"contactsPer100Dropbacks":19.88,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":2820,"QB_SHEDS":2503},"brokenReceiverPctOfContacts":72.06,"throwawayAfterShed":133,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D4 flat set 1: 37422 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 23.16; sacks per first contact 46.46%; second-arrival sack rate 84.13% over 2205 :contest2
  - by class (first contests): BEHIND_NEVER 9/13, PUSH_BLOCKED 340/688, FREE_RUN 198/426, NONE 3479/7539; unclassed 0; label-only free run 93/194
  - QB_HIT by phase: ARRIVAL 2160, THROWING 0, SHED 4990, SACK 5881; on scrambles 1391 (reported, not counted); hit-or-sack per 100 35.66 [time to throw 2.372 s (throwaways in), 2.286 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.1348, attempt-weighted -0.1290
  - M6 at step 4: {"s4Dropbacks":37422,"contacts":10871,"contactsPer100Dropbacks":29.05,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":5881,"QB_SHEDS":4990},"brokenReceiverPctOfContacts":8.33,"throwawayAfterShed":239,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D4 gen set 1: 21896 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 40.49; sacks per first contact 41.20%; second-arrival sack rate 84.95% over 3156 :contest2
  - by class (first contests): BEHIND_NEVER 1/7, PUSH_BLOCKED 245/604, FREE_RUN 176/378, NONE 3230/7876; unclassed 0; label-only free run 80/164
  - QB_HIT by phase: ARRIVAL 3453, THROWING 0, SHED 5688, SACK 6333; on scrambles 541 (reported, not counted); hit-or-sack per 100 54.42 [time to throw 2.219 s (throwaways in), 2.159 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.2717, attempt-weighted -0.2614
  - M6 at step 4: {"s4Dropbacks":21896,"contacts":12021,"contactsPer100Dropbacks":54.9,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":6333,"QB_SHEDS":5688},"brokenReceiverPctOfContacts":8.92,"throwawayAfterShed":304,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D4 flat set 2: 37339 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 23.53; sacks per first contact 45.81%; second-arrival sack rate 85.58% over 2267 :contest2
  - by class (first contests): BEHIND_NEVER 9/13, PUSH_BLOCKED 306/638, FREE_RUN 192/428, NONE 3517/7705; unclassed 0; label-only free run 89/206
  - QB_HIT by phase: ARRIVAL 2186, THROWING 0, SHED 5087, SACK 5964; on scrambles 1379 (reported, not counted); hit-or-sack per 100 36.40 [time to throw 2.369 s (throwaways in), 2.278 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.1351, attempt-weighted -0.1295
  - M6 at step 4: {"s4Dropbacks":37339,"contacts":11051,"contactsPer100Dropbacks":29.6,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":5087,"RUSHER_SACKS":5964},"brokenReceiverPctOfContacts":8.22,"throwawayAfterShed":266,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D4 gen set 2: 22176 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 43.39; sacks per first contact 40.92%; second-arrival sack rate 84.42% over 3459 :contest2
  - by class (first contests): BEHIND_NEVER 14/28, PUSH_BLOCKED 271/665, FREE_RUN 227/454, NONE 3426/8476; unclassed 0; label-only free run 110/230
  - QB_HIT by phase: ARRIVAL 3888, THROWING 0, SHED 6224, SACK 6858; on scrambles 433 (reported, not counted); hit-or-sack per 100 57.75 [time to throw 2.222 s (throwaways in), 2.172 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.2752, attempt-weighted -0.2680
  - M6 at step 4: {"s4Dropbacks":22176,"contacts":13082,"contactsPer100Dropbacks":58.99,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":6858,"QB_SHEDS":6224},"brokenReceiverPctOfContacts":8.79,"throwawayAfterShed":348,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D5 flat set 1: 51358 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 0.00; sacks per first contact n/a%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 0/0, NONE 0/0; unclassed 0; label-only free run 0/0
  - QB_HIT by phase: ARRIVAL 408, THROWING 2157, SHED 0, SACK 0; on scrambles 0 (reported, not counted); hit-or-sack per 100 7.54 [time to throw 1.868 s (throwaways in), 1.787 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0233, attempt-weighted -0.0169
  - M6 at step 4: {"s4Dropbacks":51358,"contacts":0,"contactsPer100Dropbacks":0,"fightPctOfContacts":null,"byBand":{},"brokenReceiverPctOfContacts":null,"throwawayAfterShed":0,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D5 gen set 1: 28615 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 0.00; sacks per first contact n/a%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 0/0, NONE 0/0; unclassed 0; label-only free run 0/0
  - QB_HIT by phase: ARRIVAL 352, THROWING 1937, SHED 0, SACK 0; on scrambles 0 (reported, not counted); hit-or-sack per 100 10.21 [time to throw 1.975 s (throwaways in), 1.930 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0060, attempt-weighted -0.0053
  - M6 at step 4: {"s4Dropbacks":28615,"contacts":0,"contactsPer100Dropbacks":0,"fightPctOfContacts":null,"byBand":{},"brokenReceiverPctOfContacts":null,"throwawayAfterShed":0,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D5 flat set 2: 51575 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 0.00; sacks per first contact n/a%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 0/0, NONE 0/0; unclassed 0; label-only free run 0/0
  - QB_HIT by phase: ARRIVAL 422, THROWING 2287, SHED 0, SACK 0; on scrambles 0 (reported, not counted); hit-or-sack per 100 7.76 [time to throw 1.871 s (throwaways in), 1.789 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0192, attempt-weighted -0.0176
  - M6 at step 4: {"s4Dropbacks":51575,"contacts":0,"contactsPer100Dropbacks":0,"fightPctOfContacts":null,"byBand":{},"brokenReceiverPctOfContacts":null,"throwawayAfterShed":0,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D5 gen set 2: 28530 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 0.00; sacks per first contact n/a%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 0/0, NONE 0/0; unclassed 0; label-only free run 0/0
  - QB_HIT by phase: ARRIVAL 368, THROWING 2072, SHED 0, SACK 0; on scrambles 0 (reported, not counted); hit-or-sack per 100 10.60 [time to throw 2.009 s (throwaways in), 1.967 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0055, attempt-weighted -0.0005
  - M6 at step 4: {"s4Dropbacks":28530,"contacts":0,"contactsPer100Dropbacks":0,"fightPctOfContacts":null,"byBand":{},"brokenReceiverPctOfContacts":null,"throwawayAfterShed":0,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D6 flat set 1: 48748 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 0.00; sacks per first contact n/a%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 0/0, NONE 0/0; unclassed 0; label-only free run 0/0
  - QB_HIT by phase: ARRIVAL 1233, THROWING 4568, SHED 0, SACK 0; on scrambles 0 (reported, not counted); hit-or-sack per 100 17.80 [time to throw 3.006 s (throwaways in), 2.981 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0441, attempt-weighted -0.0429
  - M6 at step 4: {"s4Dropbacks":48748,"contacts":0,"contactsPer100Dropbacks":0,"fightPctOfContacts":null,"byBand":{},"brokenReceiverPctOfContacts":null,"throwawayAfterShed":0,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D6 gen set 1: 27145 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 0.00; sacks per first contact n/a%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 0/0, NONE 0/0; unclassed 0; label-only free run 0/0
  - QB_HIT by phase: ARRIVAL 1173, THROWING 2765, SHED 0, SACK 0; on scrambles 0 (reported, not counted); hit-or-sack per 100 20.43 [time to throw 2.959 s (throwaways in), 2.936 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0587, attempt-weighted -0.0561
  - M6 at step 4: {"s4Dropbacks":27145,"contacts":0,"contactsPer100Dropbacks":0,"fightPctOfContacts":null,"byBand":{},"brokenReceiverPctOfContacts":null,"throwawayAfterShed":0,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D6 flat set 2: 49051 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 0.00; sacks per first contact n/a%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 0/0, NONE 0/0; unclassed 0; label-only free run 0/0
  - QB_HIT by phase: ARRIVAL 1230, THROWING 4547, SHED 0, SACK 0; on scrambles 0 (reported, not counted); hit-or-sack per 100 17.70 [time to throw 3.000 s (throwaways in), 2.977 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0444, attempt-weighted -0.0436
  - M6 at step 4: {"s4Dropbacks":49051,"contacts":0,"contactsPer100Dropbacks":0,"fightPctOfContacts":null,"byBand":{},"brokenReceiverPctOfContacts":null,"throwawayAfterShed":0,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D6 gen set 2: 27269 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 0.00; sacks per first contact n/a%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 0/0, NONE 0/0; unclassed 0; label-only free run 0/0
  - QB_HIT by phase: ARRIVAL 1335, THROWING 2899, SHED 0, SACK 0; on scrambles 0 (reported, not counted); hit-or-sack per 100 22.07 [time to throw 2.972 s (throwaways in), 2.948 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0658, attempt-weighted -0.0629
  - M6 at step 4: {"s4Dropbacks":27269,"contacts":0,"contactsPer100Dropbacks":0,"fightPctOfContacts":null,"byBand":{},"brokenReceiverPctOfContacts":null,"throwawayAfterShed":0,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D7 flat set 1: 51472 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.76; sacks per first contact 51.32%; second-arrival sack rate 75.90% over 83 :contest2
  - by class (first contests): BEHIND_NEVER 1/1, PUSH_BLOCKED 5/24, FREE_RUN 374/677, NONE 85/204; unclassed 0; label-only free run 181/325
  - QB_HIT by phase: ARRIVAL 406, THROWING 0, SHED 461, SACK 528; on scrambles 56 (reported, not counted); hit-or-sack per 100 3.21 [time to throw 1.607 s (throwaways in), 1.465 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0332, attempt-weighted -0.0259
  - M6 at step 4: {"s4Dropbacks":51472,"contacts":989,"contactsPer100Dropbacks":1.92,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":528,"QB_SHEDS":461},"brokenReceiverPctOfContacts":88.37,"throwawayAfterShed":247,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D7 gen set 1: 28530 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.84; sacks per first contact 54.48%; second-arrival sack rate 87.72% over 57 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 1/12, FREE_RUN 217/365, NONE 68/148; unclassed 0; label-only free run 95/170
  - QB_HIT by phase: ARRIVAL 360, THROWING 0, SHED 246, SACK 336; on scrambles 4 (reported, not counted); hit-or-sack per 100 3.42 [time to throw 1.703 s (throwaways in), 1.626 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0260, attempt-weighted -0.0260
  - M6 at step 4: {"s4Dropbacks":28530,"contacts":582,"contactsPer100Dropbacks":2.04,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":246,"RUSHER_SACKS":336},"brokenReceiverPctOfContacts":79.55,"throwawayAfterShed":141,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D7 flat set 2: 51814 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.69; sacks per first contact 50.63%; second-arrival sack rate 80.77% over 78 :contest2
  - by class (first contests): BEHIND_NEVER 3/3, PUSH_BLOCKED 3/17, FREE_RUN 333/647, NONE 104/208; unclassed 0; label-only free run 156/299
  - QB_HIT by phase: ARRIVAL 447, THROWING 0, SHED 447, SACK 506; on scrambles 42 (reported, not counted); hit-or-sack per 100 3.30 [time to throw 1.609 s (throwaways in), 1.466 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0377, attempt-weighted -0.0377
  - M6 at step 4: {"s4Dropbacks":51814,"contacts":953,"contactsPer100Dropbacks":1.84,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":447,"RUSHER_SACKS":506},"brokenReceiverPctOfContacts":84.37,"throwawayAfterShed":254,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D7 gen set 2: 28433 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.82; sacks per first contact 50.19%; second-arrival sack rate 84.38% over 64 :contest2
  - by class (first contests): BEHIND_NEVER 1/3, PUSH_BLOCKED 2/13, FREE_RUN 194/363, NONE 63/139; unclassed 0; label-only free run 80/161
  - QB_HIT by phase: ARRIVAL 392, THROWING 0, SHED 268, SACK 314; on scrambles 3 (reported, not counted); hit-or-sack per 100 3.41 [time to throw 1.751 s (throwaways in), 1.683 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0241, attempt-weighted -0.0240
  - M6 at step 4: {"s4Dropbacks":28433,"contacts":582,"contactsPer100Dropbacks":2.05,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":314,"QB_SHEDS":268},"brokenReceiverPctOfContacts":80.93,"throwawayAfterShed":155,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D8 flat set 1: 49379 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.77; sacks per first contact 46.88%; second-arrival sack rate 82.28% over 158 :contest2
  - by class (first contests): BEHIND_NEVER 9/21, PUSH_BLOCKED 23/39, FREE_RUN 597/1277, NONE 243/523; unclassed 0; label-only free run 306/628
  - QB_HIT by phase: ARRIVAL 1253, THROWING 0, SHED 1016, SACK 1002; on scrambles 134 (reported, not counted); hit-or-sack per 100 8.10 [time to throw 2.731 s (throwaways in), 2.655 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0509, attempt-weighted -0.0487
  - M6 at step 4: {"s4Dropbacks":49379,"contacts":2018,"contactsPer100Dropbacks":4.09,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":1002,"QB_SHEDS":1016},"brokenReceiverPctOfContacts":55.85,"throwawayAfterShed":565,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D8 gen set 1: 27367 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 4.97; sacks per first contact 45.99%; second-arrival sack rate 85.80% over 176 :contest2
  - by class (first contests): BEHIND_NEVER 8/11, PUSH_BLOCKED 9/25, FREE_RUN 425/878, NONE 183/445; unclassed 0; label-only free run 205/438
  - QB_HIT by phase: ARRIVAL 1202, THROWING 0, SHED 759, SACK 776; on scrambles 45 (reported, not counted); hit-or-sack per 100 10.08 [time to throw 2.688 s (throwaways in), 2.638 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0718, attempt-weighted -0.0707
  - M6 at step 4: {"s4Dropbacks":27367,"contacts":1535,"contactsPer100Dropbacks":5.61,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":776,"QB_SHEDS":759},"brokenReceiverPctOfContacts":46.38,"throwawayAfterShed":411,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D8 flat set 2: 49443 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.96; sacks per first contact 45.66%; second-arrival sack rate 88.00% over 175 :contest2
  - by class (first contests): BEHIND_NEVER 7/20, PUSH_BLOCKED 15/31, FREE_RUN 615/1349, NONE 257/558; unclassed 0; label-only free run 299/682
  - QB_HIT by phase: ARRIVAL 1323, THROWING 0, SHED 1085, SACK 1048; on scrambles 124 (reported, not counted); hit-or-sack per 100 8.45 [time to throw 2.734 s (throwaways in), 2.654 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0523, attempt-weighted -0.0494
  - M6 at step 4: {"s4Dropbacks":49443,"contacts":2133,"contactsPer100Dropbacks":4.31,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":1085,"RUSHER_SACKS":1048},"brokenReceiverPctOfContacts":54.9,"throwawayAfterShed":618,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D8 gen set 2: 27487 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 5.48; sacks per first contact 44.06%; second-arrival sack rate 82.78% over 209 :contest2
  - by class (first contests): BEHIND_NEVER 5/17, PUSH_BLOCKED 11/34, FREE_RUN 463/1002, NONE 185/454; unclassed 0; label-only free run 225/524
  - QB_HIT by phase: ARRIVAL 1403, THROWING 0, SHED 879, SACK 837; on scrambles 36 (reported, not counted); hit-or-sack per 100 11.21 [time to throw 2.707 s (throwaways in), 2.666 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0768, attempt-weighted -0.0756
  - M6 at step 4: {"s4Dropbacks":27487,"contacts":1716,"contactsPer100Dropbacks":6.24,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":879,"RUSHER_SACKS":837},"brokenReceiverPctOfContacts":49.71,"throwawayAfterShed":466,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D9 flat set 1: 49396 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.78; sacks per first contact 46.25%; second-arrival sack rate 81.88% over 160 :contest2
  - by class (first contests): BEHIND_NEVER 9/21, PUSH_BLOCKED 13/39, FREE_RUN 597/1280, NONE 244/526; unclassed 0; label-only free run 307/629
  - QB_HIT by phase: ARRIVAL 1258, THROWING 0, SHED 1032, SACK 994; on scrambles 134 (reported, not counted); hit-or-sack per 100 8.13 [time to throw 2.731 s (throwaways in), 2.655 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0513, attempt-weighted -0.0491
  - M6 at step 4: {"s4Dropbacks":49396,"contacts":2026,"contactsPer100Dropbacks":4.1,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":994,"QB_SHEDS":1032},"brokenReceiverPctOfContacts":55.77,"throwawayAfterShed":570,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D9 gen set 1: 27358 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 4.96; sacks per first contact 45.65%; second-arrival sack rate 86.44% over 177 :contest2
  - by class (first contests): BEHIND_NEVER 8/11, PUSH_BLOCKED 4/25, FREE_RUN 426/877, NONE 181/443; unclassed 0; label-only free run 205/436
  - QB_HIT by phase: ARRIVAL 1207, THROWING 0, SHED 761, SACK 772; on scrambles 45 (reported, not counted); hit-or-sack per 100 10.08 [time to throw 2.688 s (throwaways in), 2.638 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0720, attempt-weighted -0.0709
  - M6 at step 4: {"s4Dropbacks":27358,"contacts":1533,"contactsPer100Dropbacks":5.6,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":772,"QB_SHEDS":761},"brokenReceiverPctOfContacts":46.25,"throwawayAfterShed":408,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D9 flat set 2: 49452 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.96; sacks per first contact 45.28%; second-arrival sack rate 88.00% over 175 :contest2
  - by class (first contests): BEHIND_NEVER 7/20, PUSH_BLOCKED 6/31, FREE_RUN 616/1349, NONE 258/559; unclassed 0; label-only free run 299/680
  - QB_HIT by phase: ARRIVAL 1322, THROWING 0, SHED 1093, SACK 1041; on scrambles 124 (reported, not counted); hit-or-sack per 100 8.45 [time to throw 2.734 s (throwaways in), 2.654 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0523, attempt-weighted -0.0495
  - M6 at step 4: {"s4Dropbacks":49452,"contacts":2134,"contactsPer100Dropbacks":4.32,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":1093,"RUSHER_SACKS":1041},"brokenReceiverPctOfContacts":54.83,"throwawayAfterShed":618,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D9 gen set 2: 27484 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 5.47; sacks per first contact 43.98%; second-arrival sack rate 83.09% over 207 :contest2
  - by class (first contests): BEHIND_NEVER 6/18, PUSH_BLOCKED 7/34, FREE_RUN 464/998, NONE 184/453; unclassed 0; label-only free run 225/522
  - QB_HIT by phase: ARRIVAL 1404, THROWING 0, SHED 877, SACK 833; on scrambles 36 (reported, not counted); hit-or-sack per 100 11.20 [time to throw 2.707 s (throwaways in), 2.665 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0769, attempt-weighted -0.0756
  - M6 at step 4: {"s4Dropbacks":27484,"contacts":1710,"contactsPer100Dropbacks":6.22,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":877,"RUSHER_SACKS":833},"brokenReceiverPctOfContacts":49.65,"throwawayAfterShed":463,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D10 flat set 1: 49266 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.78; sacks per first contact 53.65%; second-arrival sack rate 84.03% over 144 :contest2
  - by class (first contests): BEHIND_NEVER 9/20, PUSH_BLOCKED 23/39, FREE_RUN 721/1278, NONE 246/525; unclassed 0; label-only free run 361/625
  - QB_HIT by phase: ARRIVAL 1242, THROWING 0, SHED 886, SACK 1120; on scrambles 113 (reported, not counted); hit-or-sack per 100 8.17 [time to throw 2.730 s (throwaways in), 2.653 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0513, attempt-weighted -0.0490
  - M6 at step 4: {"s4Dropbacks":49266,"contacts":2006,"contactsPer100Dropbacks":4.07,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":1120,"QB_SHEDS":886},"brokenReceiverPctOfContacts":54.94,"throwawayAfterShed":486,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D10 gen set 1: 27309 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 4.92; sacks per first contact 52.87%; second-arrival sack rate 84.56% over 149 :contest2
  - by class (first contests): BEHIND_NEVER 7/11, PUSH_BLOCKED 9/25, FREE_RUN 508/854, NONE 186/453; unclassed 0; label-only free run 250/430
  - QB_HIT by phase: ARRIVAL 1199, THROWING 0, SHED 656, SACK 836; on scrambles 42 (reported, not counted); hit-or-sack per 100 10.12 [time to throw 2.692 s (throwaways in), 2.641 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0714, attempt-weighted -0.0700
  - M6 at step 4: {"s4Dropbacks":27309,"contacts":1492,"contactsPer100Dropbacks":5.46,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":836,"QB_SHEDS":656},"brokenReceiverPctOfContacts":45.64,"throwawayAfterShed":355,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D10 flat set 2: 49322 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.98; sacks per first contact 52.34%; second-arrival sack rate 87.10% over 155 :contest2
  - by class (first contests): BEHIND_NEVER 6/21, PUSH_BLOCKED 14/29, FREE_RUN 761/1359, NONE 246/553; unclassed 0; label-only free run 380/701
  - QB_HIT by phase: ARRIVAL 1312, THROWING 0, SHED 955, SACK 1162; on scrambles 103 (reported, not counted); hit-or-sack per 100 8.52 [time to throw 2.735 s (throwaways in), 2.654 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0520, attempt-weighted -0.0489
  - M6 at step 4: {"s4Dropbacks":49322,"contacts":2117,"contactsPer100Dropbacks":4.29,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":955,"RUSHER_SACKS":1162},"brokenReceiverPctOfContacts":55.08,"throwawayAfterShed":542,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D10 gen set 2: 27357 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 5.44; sacks per first contact 50.00%; second-arrival sack rate 82.97% over 182 :contest2
  - by class (first contests): BEHIND_NEVER 4/16, PUSH_BLOCKED 10/34, FREE_RUN 551/987, NONE 179/451; unclassed 0; label-only free run 271/515
  - QB_HIT by phase: ARRIVAL 1389, THROWING 0, SHED 775, SACK 895; on scrambles 30 (reported, not counted); hit-or-sack per 100 11.20 [time to throw 2.706 s (throwaways in), 2.664 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0764, attempt-weighted -0.0749
  - M6 at step 4: {"s4Dropbacks":27357,"contacts":1670,"contactsPer100Dropbacks":6.1,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":775,"RUSHER_SACKS":895},"brokenReceiverPctOfContacts":48.92,"throwawayAfterShed":416,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D11 flat set 1: 49380 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.76; sacks per first contact 47.07%; second-arrival sack rate 82.17% over 157 :contest2
  - by class (first contests): BEHIND_NEVER 13/21, PUSH_BLOCKED 23/39, FREE_RUN 596/1275, NONE 242/522; unclassed 0; label-only free run 306/626
  - QB_HIT by phase: ARRIVAL 1255, THROWING 0, SHED 1011, SACK 1003; on scrambles 134 (reported, not counted); hit-or-sack per 100 8.10 [time to throw 2.731 s (throwaways in), 2.655 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0510, attempt-weighted -0.0488
  - M6 at step 4: {"s4Dropbacks":49380,"contacts":2014,"contactsPer100Dropbacks":4.08,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":1003,"QB_SHEDS":1011},"brokenReceiverPctOfContacts":55.71,"throwawayAfterShed":563,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D11 gen set 1: 27367 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 4.97; sacks per first contact 46.06%; second-arrival sack rate 85.71% over 175 :contest2
  - by class (first contests): BEHIND_NEVER 9/11, PUSH_BLOCKED 9/25, FREE_RUN 425/878, NONE 183/445; unclassed 0; label-only free run 205/438
  - QB_HIT by phase: ARRIVAL 1202, THROWING 0, SHED 758, SACK 776; on scrambles 45 (reported, not counted); hit-or-sack per 100 10.08 [time to throw 2.688 s (throwaways in), 2.638 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0718, attempt-weighted -0.0707
  - M6 at step 4: {"s4Dropbacks":27367,"contacts":1534,"contactsPer100Dropbacks":5.61,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":776,"QB_SHEDS":758},"brokenReceiverPctOfContacts":46.35,"throwawayAfterShed":411,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D11 flat set 2: 49430 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.96; sacks per first contact 45.81%; second-arrival sack rate 88.00% over 175 :contest2
  - by class (first contests): BEHIND_NEVER 9/20, PUSH_BLOCKED 15/31, FREE_RUN 616/1349, NONE 257/558; unclassed 0; label-only free run 299/681
  - QB_HIT by phase: ARRIVAL 1318, THROWING 0, SHED 1082, SACK 1051; on scrambles 124 (reported, not counted); hit-or-sack per 100 8.44 [time to throw 2.734 s (throwaways in), 2.655 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0522, attempt-weighted -0.0494
  - M6 at step 4: {"s4Dropbacks":49430,"contacts":2133,"contactsPer100Dropbacks":4.32,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":1082,"RUSHER_SACKS":1051},"brokenReceiverPctOfContacts":54.95,"throwawayAfterShed":616,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D11 gen set 2: 27480 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 5.47; sacks per first contact 44.28%; second-arrival sack rate 83.09% over 207 :contest2
  - by class (first contests): BEHIND_NEVER 10/18, PUSH_BLOCKED 10/34, FREE_RUN 461/999, NONE 185/453; unclassed 0; label-only free run 225/523
  - QB_HIT by phase: ARRIVAL 1400, THROWING 0, SHED 873, SACK 838; on scrambles 36 (reported, not counted); hit-or-sack per 100 11.19 [time to throw 2.707 s (throwaways in), 2.666 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0768, attempt-weighted -0.0756
  - M6 at step 4: {"s4Dropbacks":27480,"contacts":1711,"contactsPer100Dropbacks":6.23,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":873,"RUSHER_SACKS":838},"brokenReceiverPctOfContacts":49.68,"throwawayAfterShed":463,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D12 flat set 1: 51496 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.97; sacks per first contact 50.22%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 1/1, PUSH_BLOCKED 5/25, FREE_RUN 368/682, NONE 88/212; unclassed 0; label-only free run 178/324
  - QB_HIT by phase: ARRIVAL 396, THROWING 2203, SHED 496, SACK 518; on scrambles 58 (reported, not counted); hit-or-sack per 100 7.44 [time to throw 1.868 s (throwaways in), 1.786 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0173, attempt-weighted -0.0053
  - M6 at step 4: {"s4Dropbacks":51496,"contacts":1014,"contactsPer100Dropbacks":1.97,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":518,"QB_SHEDS":496},"brokenReceiverPctOfContacts":87.97,"throwawayAfterShed":262,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D12 gen set 1: 28759 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 2.10; sacks per first contact 52.92%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 1/10, FREE_RUN 214/369, NONE 66/152; unclassed 0; label-only free run 93/169
  - QB_HIT by phase: ARRIVAL 370, THROWING 1959, SHED 285, SACK 318; on scrambles 7 (reported, not counted); hit-or-sack per 100 10.15 [time to throw 1.976 s (throwaways in), 1.929 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0147, attempt-weighted -0.0140
  - M6 at step 4: {"s4Dropbacks":28759,"contacts":603,"contactsPer100Dropbacks":2.1,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":285,"RUSHER_SACKS":318},"brokenReceiverPctOfContacts":81.43,"throwawayAfterShed":162,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D12 flat set 2: 51980 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.83; sacks per first contact 51.82%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 3/3, PUSH_BLOCKED 4/15, FREE_RUN 354/663, NONE 94/197; unclassed 0; label-only free run 162/302
  - QB_HIT by phase: ARRIVAL 455, THROWING 2325, SHED 461, SACK 492; on scrambles 50 (reported, not counted); hit-or-sack per 100 7.74 [time to throw 1.871 s (throwaways in), 1.788 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0186, attempt-weighted -0.0170
  - M6 at step 4: {"s4Dropbacks":51980,"contacts":953,"contactsPer100Dropbacks":1.83,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":461,"RUSHER_SACKS":492},"brokenReceiverPctOfContacts":83.74,"throwawayAfterShed":271,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D12 gen set 2: 28540 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 2.14; sacks per first contact 49.25%; second-arrival sack rate n/a% over 0 :contest2
  - by class (first contests): BEHIND_NEVER 2/4, PUSH_BLOCKED 2/14, FREE_RUN 198/373, NONE 59/139; unclassed 0; label-only free run 79/166
  - QB_HIT by phase: ARRIVAL 387, THROWING 2095, SHED 307, SACK 303; on scrambles 5 (reported, not counted); hit-or-sack per 100 10.67 [time to throw 2.009 s (throwaways in), 1.967 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted 0.0005, attempt-weighted 0.0046
  - M6 at step 4: {"s4Dropbacks":28540,"contacts":610,"contactsPer100Dropbacks":2.14,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":303,"QB_SHEDS":307},"brokenReceiverPctOfContacts":80.98,"throwawayAfterShed":173,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D13 flat set 1: 51408 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 2.58; sacks per first contact 50.49%; second-arrival sack rate 78.74% over 127 :contest2
  - by class (first contests): BEHIND_NEVER 1/1, PUSH_BLOCKED 7/31, FREE_RUN 542/994, NONE 120/301; unclassed 0; label-only free run 280/501
  - QB_HIT by phase: ARRIVAL 0, THROWING 2259, SHED 684, SACK 770; on scrambles 50 (reported, not counted); hit-or-sack per 100 7.47 [time to throw 1.868 s (throwaways in), 1.785 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0021, attempt-weighted 0.0121
  - M6 at step 4: {"s4Dropbacks":51408,"contacts":1454,"contactsPer100Dropbacks":2.83,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":770,"QB_SHEDS":684},"brokenReceiverPctOfContacts":90.23,"throwawayAfterShed":260,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D13 gen set 1: 28452 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.02; sacks per first contact 54.48%; second-arrival sack rate 86.60% over 97 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 2/16, FREE_RUN 365/596, NONE 101/247; unclassed 0; label-only free run 185/307
  - QB_HIT by phase: ARRIVAL 0, THROWING 1979, SHED 404, SACK 552; on scrambles 7 (reported, not counted); hit-or-sack per 100 10.15 [time to throw 1.971 s (throwaways in), 1.926 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted 0.0057, attempt-weighted 0.0059
  - M6 at step 4: {"s4Dropbacks":28452,"contacts":956,"contactsPer100Dropbacks":3.36,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":404,"RUSHER_SACKS":552},"brokenReceiverPctOfContacts":87.13,"throwawayAfterShed":130,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D13 flat set 2: 51732 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 2.51; sacks per first contact 51.65%; second-arrival sack rate 86.24% over 109 :contest2
  - by class (first contests): BEHIND_NEVER 2/2, PUSH_BLOCKED 4/23, FREE_RUN 536/998, NONE 130/278; unclassed 0; label-only free run 247/480
  - QB_HIT by phase: ARRIVAL 0, THROWING 2404, SHED 644, SACK 766; on scrambles 43 (reported, not counted); hit-or-sack per 100 7.78 [time to throw 1.870 s (throwaways in), 1.786 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted 0.0030, attempt-weighted 0.0043
  - M6 at step 4: {"s4Dropbacks":51732,"contacts":1410,"contactsPer100Dropbacks":2.73,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":644,"RUSHER_SACKS":766},"brokenReceiverPctOfContacts":89.15,"throwawayAfterShed":237,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D13 gen set 2: 28373 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.13; sacks per first contact 49.72%; second-arrival sack rate 83.46% over 127 :contest2
  - by class (first contests): BEHIND_NEVER 1/3, PUSH_BLOCKED 3/25, FREE_RUN 338/622, NONE 99/237; unclassed 0; label-only free run 150/299
  - QB_HIT by phase: ARRIVAL 0, THROWING 2128, SHED 467, SACK 547; on scrambles 5 (reported, not counted); hit-or-sack per 100 10.73 [time to throw 2.013 s (throwaways in), 1.970 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted 0.0077, attempt-weighted 0.0112
  - M6 at step 4: {"s4Dropbacks":28373,"contacts":1014,"contactsPer100Dropbacks":3.57,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":547,"QB_SHEDS":467},"brokenReceiverPctOfContacts":86.59,"throwawayAfterShed":159,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D14 flat set 1: 51517 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.79; sacks per first contact 50.87%; second-arrival sack rate 77.91% over 86 :contest2
  - by class (first contests): BEHIND_NEVER 1/1, PUSH_BLOCKED 5/24, FREE_RUN 371/683, NONE 91/212; unclassed 0; label-only free run 177/323
  - QB_HIT by phase: ARRIVAL 397, THROWING 1269, SHED 471, SACK 535; on scrambles 56 (reported, not counted); hit-or-sack per 100 5.66 [time to throw 1.870 s (throwaways in), 1.787 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0527, attempt-weighted -0.0444
  - M6 at step 4: {"s4Dropbacks":51517,"contacts":1006,"contactsPer100Dropbacks":1.95,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":535,"QB_SHEDS":471},"brokenReceiverPctOfContacts":87.87,"throwawayAfterShed":249,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D14 gen set 1: 28715 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.87; sacks per first contact 54.29%; second-arrival sack rate 89.06% over 64 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 1/11, FREE_RUN 219/373, NONE 71/152; unclassed 0; label-only free run 99/176
  - QB_HIT by phase: ARRIVAL 356, THROWING 1094, SHED 252, SACK 348; on scrambles 4 (reported, not counted); hit-or-sack per 100 7.21 [time to throw 1.973 s (throwaways in), 1.928 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0509, attempt-weighted -0.0505
  - M6 at step 4: {"s4Dropbacks":28715,"contacts":600,"contactsPer100Dropbacks":2.09,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":252,"RUSHER_SACKS":348},"brokenReceiverPctOfContacts":80,"throwawayAfterShed":142,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D14 flat set 2: 51849 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.67; sacks per first contact 51.97%; second-arrival sack rate 82.43% over 74 :contest2
  - by class (first contests): BEHIND_NEVER 3/3, PUSH_BLOCKED 3/14, FREE_RUN 344/647, NONE 99/200; unclassed 0; label-only free run 156/293
  - QB_HIT by phase: ARRIVAL 448, THROWING 1329, SHED 428, SACK 510; on scrambles 42 (reported, not counted); hit-or-sack per 100 5.81 [time to throw 1.872 s (throwaways in), 1.789 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0594, attempt-weighted -0.0589
  - M6 at step 4: {"s4Dropbacks":51849,"contacts":938,"contactsPer100Dropbacks":1.81,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":428,"RUSHER_SACKS":510},"brokenReceiverPctOfContacts":84.75,"throwawayAfterShed":244,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D14 gen set 2: 28396 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.83; sacks per first contact 51.06%; second-arrival sack rate 84.38% over 64 :contest2
  - by class (first contests): BEHIND_NEVER 1/3, PUSH_BLOCKED 1/13, FREE_RUN 202/366, NONE 62/139; unclassed 0; label-only free run 81/162
  - QB_HIT by phase: ARRIVAL 396, THROWING 1108, SHED 265, SACK 320; on scrambles 3 (reported, not counted); hit-or-sack per 100 7.30 [time to throw 2.013 s (throwaways in), 1.971 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0496, attempt-weighted -0.0492
  - M6 at step 4: {"s4Dropbacks":28396,"contacts":585,"contactsPer100Dropbacks":2.06,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":320,"QB_SHEDS":265},"brokenReceiverPctOfContacts":80.85,"throwawayAfterShed":151,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D15 flat set 1: 49174 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.82; sacks per first contact 70.39%; second-arrival sack rate 84.54% over 97 :contest2
  - by class (first contests): BEHIND_NEVER 19/23, PUSH_BLOCKED 17/38, FREE_RUN 970/1302, NONE 316/515; unclassed 0; label-only free run 478/645
  - QB_HIT by phase: ARRIVAL 1264, THROWING 4577, SHED 571, SACK 1404; on scrambles 72 (reported, not counted); hit-or-sack per 100 17.52 [time to throw 2.997 s (throwaways in), 2.979 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0459, attempt-weighted -0.0452
  - M6 at step 4: {"s4Dropbacks":49174,"contacts":1975,"contactsPer100Dropbacks":4.02,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":1404,"QB_SHEDS":571},"brokenReceiverPctOfContacts":54.73,"throwawayAfterShed":305,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D15 gen set 1: 27419 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 4.96; sacks per first contact 69.56%; second-arrival sack rate 85.58% over 104 :contest2
  - by class (first contests): BEHIND_NEVER 9/11, PUSH_BLOCKED 8/24, FREE_RUN 666/897, NONE 263/428; unclassed 0; label-only free run 317/446
  - QB_HIT by phase: ARRIVAL 1196, THROWING 2802, SHED 429, SACK 1035; on scrambles 21 (reported, not counted); hit-or-sack per 100 20.35 [time to throw 2.951 s (throwaways in), 2.935 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0594, attempt-weighted -0.0577
  - M6 at step 4: {"s4Dropbacks":27419,"contacts":1464,"contactsPer100Dropbacks":5.34,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":1035,"QB_SHEDS":429},"brokenReceiverPctOfContacts":45.63,"throwawayAfterShed":237,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D15 flat set 2: 49331 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.97; sacks per first contact 69.19%; second-arrival sack rate 88.12% over 101 :contest2
  - by class (first contests): BEHIND_NEVER 12/20, PUSH_BLOCKED 13/37, FREE_RUN 978/1360, NONE 351/540; unclassed 0; label-only free run 493/679
  - QB_HIT by phase: ARRIVAL 1264, THROWING 4561, SHED 615, SACK 1443; on scrambles 76 (reported, not counted); hit-or-sack per 100 17.57 [time to throw 2.996 s (throwaways in), 2.977 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0435, attempt-weighted -0.0430
  - M6 at step 4: {"s4Dropbacks":49331,"contacts":2058,"contactsPer100Dropbacks":4.17,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":615,"RUSHER_SACKS":1443},"brokenReceiverPctOfContacts":55.39,"throwawayAfterShed":321,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D15 gen set 2: 27397 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 5.56; sacks per first contact 68.20%; second-arrival sack rate 86.47% over 133 :contest2
  - by class (first contests): BEHIND_NEVER 10/14, PUSH_BLOCKED 6/38, FREE_RUN 762/1035, NONE 260/435; unclassed 0; label-only free run 361/516
  - QB_HIT by phase: ARRIVAL 1374, THROWING 2872, SHED 502, SACK 1153; on scrambles 16 (reported, not counted); hit-or-sack per 100 21.70 [time to throw 2.967 s (throwaways in), 2.952 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0668, attempt-weighted -0.0650
  - M6 at step 4: {"s4Dropbacks":27397,"contacts":1655,"contactsPer100Dropbacks":6.04,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":502,"RUSHER_SACKS":1153},"brokenReceiverPctOfContacts":47.49,"throwawayAfterShed":252,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D16 flat set 1: 49480 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.85; sacks per first contact 44.07%; second-arrival sack rate 82.42% over 165 :contest2
  - by class (first contests): BEHIND_NEVER 11/22, PUSH_BLOCKED 11/39, FREE_RUN 626/1320, NONE 191/523; unclassed 0; label-only free run 314/646
  - QB_HIT by phase: ARRIVAL 1303, THROWING 4580, SHED 1094, SACK 975; on scrambles 140 (reported, not counted); hit-or-sack per 100 17.35 [time to throw 2.991 s (throwaways in), 2.979 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0451, attempt-weighted -0.0449
  - M6 at step 4: {"s4Dropbacks":49480,"contacts":2069,"contactsPer100Dropbacks":4.18,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":975,"QB_SHEDS":1094},"brokenReceiverPctOfContacts":54.42,"throwawayAfterShed":611,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D16 gen set 1: 27521 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 4.93; sacks per first contact 43.66%; second-arrival sack rate 86.84% over 190 :contest2
  - by class (first contests): BEHIND_NEVER 9/13, PUSH_BLOCKED 3/22, FREE_RUN 440/891, NONE 140/430; unclassed 0; label-only free run 208/441
  - QB_HIT by phase: ARRIVAL 1244, THROWING 2844, SHED 789, SACK 757; on scrambles 54 (reported, not counted); hit-or-sack per 100 20.33 [time to throw 2.949 s (throwaways in), 2.938 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0625, attempt-weighted -0.0614
  - M6 at step 4: {"s4Dropbacks":27521,"contacts":1546,"contactsPer100Dropbacks":5.62,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":757,"QB_SHEDS":789},"brokenReceiverPctOfContacts":46.38,"throwawayAfterShed":420,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D16 flat set 2: 49694 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 3.95; sacks per first contact 42.36%; second-arrival sack rate 86.46% over 192 :contest2
  - by class (first contests): BEHIND_NEVER 8/21, PUSH_BLOCKED 4/35, FREE_RUN 613/1354, NONE 207/554; unclassed 0; label-only free run 305/694
  - QB_HIT by phase: ARRIVAL 1314, THROWING 4570, SHED 1158, SACK 998; on scrambles 150 (reported, not counted); hit-or-sack per 100 17.41 [time to throw 2.995 s (throwaways in), 2.981 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0444, attempt-weighted -0.0443
  - M6 at step 4: {"s4Dropbacks":49694,"contacts":2156,"contactsPer100Dropbacks":4.34,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":1158,"RUSHER_SACKS":998},"brokenReceiverPctOfContacts":56.03,"throwawayAfterShed":621,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D16 gen set 2: 27577 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 5.52; sacks per first contact 42.34%; second-arrival sack rate 84.72% over 229 :contest2
  - by class (first contests): BEHIND_NEVER 3/14, PUSH_BLOCKED 4/37, FREE_RUN 486/1007, NONE 151/463; unclassed 0; label-only free run 236/522
  - QB_HIT by phase: ARRIVAL 1438, THROWING 2946, SHED 912, SACK 838; on scrambles 40 (reported, not counted); hit-or-sack per 100 21.81 [time to throw 2.969 s (throwaways in), 2.958 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted -0.0705, attempt-weighted -0.0691
  - M6 at step 4: {"s4Dropbacks":27577,"contacts":1750,"contactsPer100Dropbacks":6.35,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":912,"RUSHER_SACKS":838},"brokenReceiverPctOfContacts":47.89,"throwawayAfterShed":474,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D17 flat set 1: 52061 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.57; sacks per first contact 53.48%; second-arrival sack rate 85.71% over 77 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 385/714, NONE 53/105; unclassed 0; label-only free run 186/340
  - QB_HIT by phase: ARRIVAL 368, THROWING 1945, SHED 392, SACK 504; on scrambles 41 (reported, not counted); hit-or-sack per 100 6.63 [time to throw 1.870 s (throwaways in), 1.786 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted 0.0291, attempt-weighted 0.0363
  - M6 at step 4: {"s4Dropbacks":52061,"contacts":896,"contactsPer100Dropbacks":1.72,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":504,"QB_SHEDS":392},"brokenReceiverPctOfContacts":89.84,"throwawayAfterShed":224,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D17 gen set 1: 28889 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.51; sacks per first contact 55.40%; second-arrival sack rate 89.13% over 46 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 207/345, NONE 34/90; unclassed 0; label-only free run 92/158
  - QB_HIT by phase: ARRIVAL 328, THROWING 1857, SHED 199, SACK 282; on scrambles 4 (reported, not counted); hit-or-sack per 100 9.35 [time to throw 1.961 s (throwaways in), 1.917 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted 0.0063, attempt-weighted 0.0055
  - M6 at step 4: {"s4Dropbacks":28889,"contacts":481,"contactsPer100Dropbacks":1.66,"fightPctOfContacts":100,"byBand":{"RUSHER_SACKS":282,"QB_SHEDS":199},"brokenReceiverPctOfContacts":82.95,"throwawayAfterShed":125,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D17 flat set 2: 52221 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.47; sacks per first contact 52.99%; second-arrival sack rate 88.33% over 60 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 360/668, NONE 47/100; unclassed 0; label-only free run 161/298
  - QB_HIT by phase: ARRIVAL 388, THROWING 1955, SHED 368, SACK 460; on scrambles 31 (reported, not counted); hit-or-sack per 100 6.65 [time to throw 1.868 s (throwaways in), 1.785 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted 0.0247, attempt-weighted 0.0236
  - M6 at step 4: {"s4Dropbacks":52221,"contacts":828,"contactsPer100Dropbacks":1.59,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":368,"RUSHER_SACKS":460},"brokenReceiverPctOfContacts":85.27,"throwawayAfterShed":240,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}
- D17 gen set 2: 28916 pocket-1.s4 dropbacks; 0 stream problem(s)
  - contacts per 100 dropbacks 1.71; sacks per first contact 55.15%; second-arrival sack rate 85.71% over 63 :contest2
  - by class (first contests): BEHIND_NEVER 0/0, PUSH_BLOCKED 0/0, FREE_RUN 218/390, NONE 55/105; unclassed 0; label-only free run 106/189
  - QB_HIT by phase: ARRIVAL 355, THROWING 1859, SHED 231, SACK 327; on scrambles 3 (reported, not counted); hit-or-sack per 100 9.58 [time to throw 1.993 s (throwaways in), 1.952 s aimed]
  - hit curve slope from 2.0 s: aimed-weighted 0.0029, attempt-weighted 0.0028
  - M6 at step 4: {"s4Dropbacks":28916,"contacts":558,"contactsPer100Dropbacks":1.93,"fightPctOfContacts":100,"byBand":{"QB_SHEDS":231,"RUSHER_SACKS":327},"brokenReceiverPctOfContacts":83.69,"throwawayAfterShed":145,"throwawayWithArrived":0,"reading":"reported only: every contact is FIGHT until step 7 (no contact choice, so no throwaway while a man stands ARRIVED); a throwaway after a shed is the move branch; the broken-receiver share is the bound step 7's THROWAWAY could reach"}

## AM-6's declared prints (interceptions/aimed throws by guard class; never graded)

Each throw's class is read once, at the decision instant, as the fold reads it; the own-clock reading of these counts is not built and waits with the lift.
- D1 flat set 1: interceptions/aimed throws on THROWING-hit throws PROGRESSION 2/599, RANK_PUSHED 38/401, CHECKDOWN 2/932, CLEAN_EXPIRY 0/0, DESPERATION 8/268, ON_THE_RUN 0/0; on unhit throws PROGRESSION 67/20235, RANK_PUSHED 767/6306, CHECKDOWN 12/7862, CLEAN_EXPIRY 0/0, DESPERATION 172/2951, ON_THE_RUN 13/205
- D1 gen set 1: interceptions/aimed throws on THROWING-hit throws PROGRESSION 7/499, RANK_PUSHED 54/320, CHECKDOWN 17/708, CLEAN_EXPIRY 0/0, DESPERATION 57/428, ON_THE_RUN 0/0; on unhit throws PROGRESSION 326/13772, RANK_PUSHED 810/3860, CHECKDOWN 82/2541, CLEAN_EXPIRY 0/0, DESPERATION 432/2400, ON_THE_RUN 16/114
- D1 flat set 2: interceptions/aimed throws on THROWING-hit throws PROGRESSION 1/600, RANK_PUSHED 36/415, CHECKDOWN 2/1009, CLEAN_EXPIRY 0/0, DESPERATION 12/305, ON_THE_RUN 0/0; on unhit throws PROGRESSION 75/20160, RANK_PUSHED 753/6276, CHECKDOWN 14/8019, CLEAN_EXPIRY 0/0, DESPERATION 177/3066, ON_THE_RUN 10/213
- D1 gen set 2: interceptions/aimed throws on THROWING-hit throws PROGRESSION 13/470, RANK_PUSHED 55/392, CHECKDOWN 23/766, CLEAN_EXPIRY 0/0, DESPERATION 67/463, ON_THE_RUN 0/0; on unhit throws PROGRESSION 397/14522, RANK_PUSHED 838/3793, CHECKDOWN 83/2192, CLEAN_EXPIRY 0/0, DESPERATION 426/2424, ON_THE_RUN 13/85
- D2 flat set 1: interceptions/aimed throws on THROWING-hit throws PROGRESSION 4/1702, RANK_PUSHED 76/745, CHECKDOWN 3/1487, CLEAN_EXPIRY 0/0, DESPERATION 37/659, ON_THE_RUN 0/0; on unhit throws PROGRESSION 55/19171, RANK_PUSHED 646/5631, CHECKDOWN 2/2189, CLEAN_EXPIRY 0/0, DESPERATION 153/2237, ON_THE_RUN 13/198
- D2 gen set 1: interceptions/aimed throws on THROWING-hit throws PROGRESSION 11/1006, RANK_PUSHED 62/373, CHECKDOWN 29/824, CLEAN_EXPIRY 0/0, DESPERATION 83/630, ON_THE_RUN 0/0; on unhit throws PROGRESSION 280/11978, RANK_PUSHED 648/3162, CHECKDOWN 36/1057, CLEAN_EXPIRY 0/0, DESPERATION 345/1907, ON_THE_RUN 20/141
- D2 flat set 2: interceptions/aimed throws on THROWING-hit throws PROGRESSION 3/1720, RANK_PUSHED 59/746, CHECKDOWN 2/1466, CLEAN_EXPIRY 0/0, DESPERATION 20/638, ON_THE_RUN 0/0; on unhit throws PROGRESSION 48/19557, RANK_PUSHED 620/5489, CHECKDOWN 4/2144, CLEAN_EXPIRY 0/0, DESPERATION 144/2194, ON_THE_RUN 16/176
- D2 gen set 2: interceptions/aimed throws on THROWING-hit throws PROGRESSION 10/910, RANK_PUSHED 51/372, CHECKDOWN 36/965, CLEAN_EXPIRY 0/0, DESPERATION 97/663, ON_THE_RUN 0/0; on unhit throws PROGRESSION 321/11893, RANK_PUSHED 674/3138, CHECKDOWN 43/1002, CLEAN_EXPIRY 0/0, DESPERATION 395/2014, ON_THE_RUN 16/143
- D5 flat set 1: interceptions/aimed throws on THROWING-hit throws PROGRESSION 4/588, RANK_PUSHED 34/378, CHECKDOWN 2/911, CLEAN_EXPIRY 0/0, DESPERATION 9/280, ON_THE_RUN 0/0; on unhit throws PROGRESSION 66/20065, RANK_PUSHED 775/6302, CHECKDOWN 11/7838, CLEAN_EXPIRY 0/0, DESPERATION 155/3012, ON_THE_RUN 13/211
- D5 gen set 1: interceptions/aimed throws on THROWING-hit throws PROGRESSION 7/483, RANK_PUSHED 54/331, CHECKDOWN 17/703, CLEAN_EXPIRY 0/0, DESPERATION 57/420, ON_THE_RUN 0/0; on unhit throws PROGRESSION 329/13713, RANK_PUSHED 816/3823, CHECKDOWN 83/2538, CLEAN_EXPIRY 0/0, DESPERATION 425/2391, ON_THE_RUN 19/110
- D5 flat set 2: interceptions/aimed throws on THROWING-hit throws PROGRESSION 1/569, RANK_PUSHED 35/413, CHECKDOWN 2/1003, CLEAN_EXPIRY 0/0, DESPERATION 10/302, ON_THE_RUN 0/0; on unhit throws PROGRESSION 70/20008, RANK_PUSHED 763/6243, CHECKDOWN 17/7924, CLEAN_EXPIRY 0/0, DESPERATION 166/3064, ON_THE_RUN 11/212
- D5 gen set 2: interceptions/aimed throws on THROWING-hit throws PROGRESSION 13/471, RANK_PUSHED 51/374, CHECKDOWN 23/763, CLEAN_EXPIRY 0/0, DESPERATION 62/464, ON_THE_RUN 0/0; on unhit throws PROGRESSION 387/14489, RANK_PUSHED 815/3741, CHECKDOWN 82/2197, CLEAN_EXPIRY 0/0, DESPERATION 433/2448, ON_THE_RUN 11/82
- D6 flat set 1: interceptions/aimed throws on THROWING-hit throws PROGRESSION 4/1660, RANK_PUSHED 74/740, CHECKDOWN 2/1463, CLEAN_EXPIRY 0/0, DESPERATION 40/705, ON_THE_RUN 0/0; on unhit throws PROGRESSION 57/18844, RANK_PUSHED 646/5577, CHECKDOWN 1/2141, CLEAN_EXPIRY 0/0, DESPERATION 149/2215, ON_THE_RUN 10/187
- D6 gen set 1: interceptions/aimed throws on THROWING-hit throws PROGRESSION 11/968, RANK_PUSHED 53/354, CHECKDOWN 26/827, CLEAN_EXPIRY 0/0, DESPERATION 81/616, ON_THE_RUN 0/0; on unhit throws PROGRESSION 253/11838, RANK_PUSHED 649/3155, CHECKDOWN 34/1030, CLEAN_EXPIRY 0/0, DESPERATION 328/1848, ON_THE_RUN 19/134
- D6 flat set 2: interceptions/aimed throws on THROWING-hit throws PROGRESSION 0/1707, RANK_PUSHED 57/731, CHECKDOWN 2/1464, CLEAN_EXPIRY 0/0, DESPERATION 22/645, ON_THE_RUN 0/0; on unhit throws PROGRESSION 44/19439, RANK_PUSHED 626/5467, CHECKDOWN 4/2072, CLEAN_EXPIRY 0/0, DESPERATION 142/2202, ON_THE_RUN 15/183
- D6 gen set 2: interceptions/aimed throws on THROWING-hit throws PROGRESSION 11/903, RANK_PUSHED 58/366, CHECKDOWN 34/935, CLEAN_EXPIRY 0/0, DESPERATION 98/695, ON_THE_RUN 0/0; on unhit throws PROGRESSION 314/11820, RANK_PUSHED 661/3107, CHECKDOWN 41/1019, CLEAN_EXPIRY 0/0, DESPERATION 386/1950, ON_THE_RUN 16/145
- D1 flat set 1: interceptions/aimed throws after a SHED PROGRESSION 0/10, RANK_PUSHED 1/11, CHECKDOWN 0/2, CLEAN_EXPIRY 0/0, DESPERATION 0/1, ON_THE_RUN 3/19
- D1 gen set 1: interceptions/aimed throws after a SHED PROGRESSION 0/4, RANK_PUSHED 3/5, CHECKDOWN 0/3, CLEAN_EXPIRY 0/0, DESPERATION 2/6, ON_THE_RUN 3/14
- D1 flat set 2: interceptions/aimed throws after a SHED PROGRESSION 0/7, RANK_PUSHED 0/6, CHECKDOWN 0/4, CLEAN_EXPIRY 0/0, DESPERATION 0/0, ON_THE_RUN 1/9
- D1 gen set 2: interceptions/aimed throws after a SHED PROGRESSION 0/12, RANK_PUSHED 0/5, CHECKDOWN 0/10, CLEAN_EXPIRY 0/0, DESPERATION 1/6, ON_THE_RUN 1/4
- D2 flat set 1: interceptions/aimed throws after a SHED PROGRESSION 0/22, RANK_PUSHED 2/16, CHECKDOWN 0/28, CLEAN_EXPIRY 0/0, DESPERATION 0/7, ON_THE_RUN 0/8
- D2 gen set 1: interceptions/aimed throws after a SHED PROGRESSION 0/15, RANK_PUSHED 3/12, CHECKDOWN 1/36, CLEAN_EXPIRY 0/0, DESPERATION 0/19, ON_THE_RUN 4/13
- D2 flat set 2: interceptions/aimed throws after a SHED PROGRESSION 0/22, RANK_PUSHED 1/14, CHECKDOWN 0/28, CLEAN_EXPIRY 0/0, DESPERATION 2/8, ON_THE_RUN 1/11
- D2 gen set 2: interceptions/aimed throws after a SHED PROGRESSION 1/28, RANK_PUSHED 4/13, CHECKDOWN 1/35, CLEAN_EXPIRY 0/0, DESPERATION 6/15, ON_THE_RUN 2/11
- D3 flat set 1: interceptions/aimed throws after a SHED PROGRESSION 0/112, RANK_PUSHED 12/93, CHECKDOWN 0/42, CLEAN_EXPIRY 0/0, DESPERATION 1/33, ON_THE_RUN 6/94
- D3 gen set 1: interceptions/aimed throws after a SHED PROGRESSION 9/203, RANK_PUSHED 24/118, CHECKDOWN 4/95, CLEAN_EXPIRY 0/0, DESPERATION 20/112, ON_THE_RUN 12/86
- D3 flat set 2: interceptions/aimed throws after a SHED PROGRESSION 0/120, RANK_PUSHED 7/87, CHECKDOWN 0/58, CLEAN_EXPIRY 0/0, DESPERATION 0/24, ON_THE_RUN 12/106
- D3 gen set 2: interceptions/aimed throws after a SHED PROGRESSION 5/190, RANK_PUSHED 13/134, CHECKDOWN 8/134, CLEAN_EXPIRY 0/0, DESPERATION 25/131, ON_THE_RUN 8/94
- D7 flat set 1: interceptions/aimed throws after a SHED PROGRESSION 0/10, RANK_PUSHED 1/8, CHECKDOWN 0/1, CLEAN_EXPIRY 0/0, DESPERATION 0/1, ON_THE_RUN 2/15
- D7 gen set 1: interceptions/aimed throws after a SHED PROGRESSION 0/3, RANK_PUSHED 4/8, CHECKDOWN 0/5, CLEAN_EXPIRY 0/0, DESPERATION 0/4, ON_THE_RUN 3/16
- D7 flat set 2: interceptions/aimed throws after a SHED PROGRESSION 0/8, RANK_PUSHED 0/9, CHECKDOWN 0/5, CLEAN_EXPIRY 0/0, DESPERATION 0/1, ON_THE_RUN 1/9
- D7 gen set 2: interceptions/aimed throws after a SHED PROGRESSION 0/9, RANK_PUSHED 0/3, CHECKDOWN 1/10, CLEAN_EXPIRY 0/0, DESPERATION 2/7, ON_THE_RUN 1/4

## The step-4 probes, printed beside the falsifiers (paired SE; never graded)

- gen set 1 (printed beside, never graded): the home quarterback's release raised 40 (one team's quarterback in every game; clamped at 99): home THROWING hits per 100 aimed throws 10.26 against 12.58 unraised; difference -2.33 (paired SE 0.17)
- gen set 2 (printed beside, never graded): the home quarterback's release raised 40 (one team's quarterback in every game; clamped at 99): home THROWING hits per 100 aimed throws 11.06 against 13.26 unraised; difference -2.21 (paired SE 0.15)
- PR-QB-STRENGTH set 1 (D3's bundle, the flat league, every quarterback's strength raised 30; printed, never graded): sacks per 100 dropbacks 13.41 against 13.78, difference -0.36 (paired SE 0.06); the raised men's first contests ending in a sack -5.64 points (paired SE 0.41)
- PR-QB-STRENGTH set 2 (D3's bundle, the flat league, every quarterback's strength raised 30; printed, never graded): sacks per 100 dropbacks 13.70 against 14.03, difference -0.33 (paired SE 0.06); the raised men's first contests ending in a sack -5.56 points (paired SE 0.40)
- PR-QB-AGILITY set 1 (D3's bundle, the flat league, every quarterback's agility raised 30; printed, never graded): sacks per 100 dropbacks 13.41 against 13.78, difference -0.36 (paired SE 0.06); the raised men's first contests ending in a sack -5.64 points (paired SE 0.41)
- PR-QB-AGILITY set 2 (D3's bundle, the flat league, every quarterback's agility raised 30; printed, never graded): sacks per 100 dropbacks 13.70 against 14.03, difference -0.33 (paired SE 0.06); the raised men's first contests ending in a sack -5.56 points (paired SE 0.40)
- PR-RUSHER-TACKLING set 1 (D3's bundle, the flat league, each defense's four rushers' tackling raised 30; printed, never graded): sacks per 100 dropbacks 14.20 against 13.78, difference 0.43 (paired SE 0.13); the raised men's first contests ending in a sack 6.17 points (paired SE 0.70)
-   PR-RUSHER-TACKLING set 1, apart: the raised rushers' arrivals (rated contests) per 100 dropbacks 0.15 (paired SE 0.10); their sacks per 100 contests 6.17 (paired SE 0.70)
- PR-RUSHER-TACKLING set 2 (D3's bundle, the flat league, each defense's four rushers' tackling raised 30; printed, never graded): sacks per 100 dropbacks 14.03 against 14.03, difference 0.00 (paired SE 0.13); the raised men's first contests ending in a sack 5.39 points (paired SE 0.69)
-   PR-RUSHER-TACKLING set 2, apart: the raised rushers' arrivals (rated contests) per 100 dropbacks -0.19 (paired SE 0.11); their sacks per 100 contests 5.39 (paired SE 0.69)
- PR-RUSHER-SPEED set 1 (D3's bundle, the flat league, each defense's four rushers' speed raised 30; printed, never graded): sacks per 100 dropbacks 14.00 against 13.78, difference 0.22 (paired SE 0.07); the raised men's first contests ending in a sack 5.67 points (paired SE 0.45)
-   PR-RUSHER-SPEED set 1, apart: the raised rushers' arrivals (rated contests) per 100 dropbacks -0.04 (paired SE 0.05); their sacks per 100 contests 5.67 (paired SE 0.45)
- PR-RUSHER-SPEED set 2 (D3's bundle, the flat league, each defense's four rushers' speed raised 30; printed, never graded): sacks per 100 dropbacks 14.26 against 14.03, difference 0.23 (paired SE 0.07); the raised men's first contests ending in a sack 5.77 points (paired SE 0.48)
-   PR-RUSHER-SPEED set 2, apart: the raised rushers' arrivals (rated contests) per 100 dropbacks -0.03 (paired SE 0.05); their sacks per 100 contests 5.77 (paired SE 0.48)

## Waiting, by name

- R-1 (--digests on D1 to D17) and the s4 pins: not run and not pinned yet
- T_L's clamp and m(0) on D17: not read by --part1 or the grade (the stream carries no line margins); held by the engine's unit proofs (motion.test.ts)
- AM-6's declared prints on the own-clock rule: the counts are read at the decision instant's class only; the own-clock reading of them is not built

## The EXT-4 reports, one per base and seed set (every row, the affected plays, the pressured sacks, the interception guard on both leagues)

### C1 (re-played) with D1, D5, D7, seed set 1

```text
ADR-089 step 4: the pocket report (4 arms; both leagues; every hit and sack figure with its time to throw beside it)

== C1 (re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 1.606 s | gen 1.704 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1317 of 51346 dropbacks (2.56 per 100); pressuredSacks 1317; pressured dropbacks 11293 (21.99 per 100) [time to throw 1.606 s]
    gen: sacks 651 of 28419 dropbacks (2.29 per 100); pressuredSacks 651; pressured dropbacks 6620 (23.29 per 100) [time to throw 1.704 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.66% | -10.36 against 22.02% (PR #33, FTN only (held)) | -3.80 against 15.46% (main) [time to throw 1.606 s]
    gen: 9.83% | -12.19 against 22.02% (PR #33, FTN only (held)) | -5.63 against 15.46% (main) [time to throw 1.704 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.99 % | gen 23.29 %
  hit_or_sack_rate: flat 3.37 % [time to throw 1.606 s] | gen 3.50 % [time to throw 1.704 s]
  sack_rate: flat 2.56 % [time to throw 1.606 s] | gen 2.29 % [time to throw 1.704 s]
  time_to_throw: flat 1.606 seconds | gen 1.704 seconds
  sack_share_of_hit_or_sack: flat 76.17 % [time to throw 1.606 s] | gen 65.36 % [time to throw 1.704 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.606 s] | gen 0.00 % [time to throw 1.704 s]
  release_distribution: flat 1.606 seconds | gen 1.704 seconds
  pressured_share_by_release_bin: flat 15.57 % | gen 18.98 %
  hit_rate_by_release_bin: flat 4.29 % [time to throw 1.606 s] | gen 4.42 % [time to throw 1.704 s]
  hits_on_aimed_throws_per_dropback: flat 0.80 % [time to throw 1.606 s] | gen 1.21 % [time to throw 1.704 s]
  first_pressure_seconds: flat 1.391 seconds | gen 1.524 seconds
  first_forcing_seconds: flat 1.741 seconds | gen 1.850 seconds
  first_arrival_seconds: flat 1.889 seconds | gen 1.950 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.31%, FREE_RUNNER 69.69%, WON_REP 27.00%; gen COUNTER 3.62%, FREE_RUNNER 64.92%, WON_REP 31.46%)
  quick_pressure_share_by_origin: flat 88.91 % | gen 83.14 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.50 %
  clean_with_live_won_rep_dropbacks: flat 1.23 % | gen 1.49 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.75 % | gen 9.49 %
  throwaway_rate_clean: flat 18.39 % | gen 10.05 %
  scramble_rate: flat 2.22 % | gen 0.90 %
  scramble_yards: flat 5.43 yards | gen 4.58 yards
  by_down_fixed_calls: flat 12.19 % | gen 9.90 %
  int_per_aimed_throw: flat 2.81 % | gen 7.50 %
  completion_per_aimed_throw: flat 46.87 % | gen 43.17 %
  forced_throw_share: flat 10.54 % | gen 15.18 %
  completion_by_pocket_status: flat 29.45 % | gen 27.98 %
  qb_season_spread: flat 1.02 pp | gen 3.12 pp
  defence_season_spread: flat 0.60 pp | gen 2.19 pp
  unblocked_pressures_per_100: flat 15.67 per 100 dropbacks | gen 15.25 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 75.71 % [time to throw 1.606 s] | gen 69.78 % [time to throw 1.704 s]
  unblocked_men_per_100: flat 18.78 per 100 dropbacks | gen 18.43 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.08 % | gen 9.93 %
  quick_share_no_free_runner: flat 74.29 % | gen 63.73 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.83 % | gen 9.55 %
  situation_q1q3_last_two: flat 14.00 % | gen 10.92 %
  sack_share_of_contacts_in_out: flat 76.17 % [time to throw 1.606 s] | gen 65.36 % [time to throw 1.704 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.606 s] | gen 0.00 % [time to throw 1.704 s]
  sacker_mix.split.interior: flat 31.60 % [time to throw 1.606 s] | gen 36.76 % [time to throw 1.704 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.52 % [time to throw 1.606 s] | gen 43.09 % [time to throw 1.704 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.42 % [time to throw 1.606 s] | gen 19.99 % [time to throw 1.704 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.46 % [time to throw 1.606 s] | gen 0.15 % [time to throw 1.704 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.59 % [time to throw 1.606 s] | gen 37.02 % [time to throw 1.704 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.85 % | gen 2.53 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.33 % | gen 2.47 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.37 % | gen 21.12 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 2.84 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.16 % | gen 17.89 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.28 % | gen 15.93 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 46.01 % | gen 46.90 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.52 % | gen 19.97 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.73 % | gen 41.72 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.10 % | gen 22.11 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.09 % | gen 20.35 %
  nobody_open_share: flat 43.78 % of dropbacks | gen 33.98 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.27 % of dropbacks | gen 11.76 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.57 % of dropbacks | gen 10.01 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.37 % of dropbacks | gen 9.92 % of dropbacks
  nobody_open_share.split.SACK: flat 2.56 % of dropbacks [time to throw 1.606 s] | gen 2.29 % of dropbacks [time to throw 1.704 s]
  clean_checkdown_share: flat 19.39 % of clean aimed throws | gen 9.08 % of clean aimed throws
  clean_later_read_share: flat 15.19 % of clean aimed throws | gen 22.04 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.30, per aimed throw 2.81; forced-throw share 10.54; completion per attempt 38.32, per aimed throw 46.87; INT-source mix CONTESTED_CATCH 89.30, TIPPED_RECOVERY 10.70
      flat PROGRESSION: 20656 aimed, INT 0.33, completion 46.01
      flat RANK_PUSHED: 6863 aimed, INT 12.37, completion 18.52
      flat CHECKDOWN: 8870 aimed, INT 0.19, completion 45.73
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3374 aimed, INT 5.16, completion 29.10
      flat ON_THE_RUN: 207 aimed, INT 6.28, completion 26.09
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.28 against a real 3.25
    gen: INT per attempt 6.73, per aimed throw 7.50; forced-throw share 15.18; completion per attempt 38.75, per aimed throw 43.17; INT-source mix CONTESTED_CATCH 43.44, TIPPED_RECOVERY 56.56
      gen PROGRESSION: 14236 aimed, INT 2.47, completion 46.90
      gen RANK_PUSHED: 4157 aimed, INT 21.12, completion 19.97
      gen CHECKDOWN: 3341 aimed, INT 2.84, completion 41.72
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2845 aimed, INT 17.89, completion 22.11
      gen ON_THE_RUN: 113 aimed, INT 15.93, completion 20.35
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.93 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D1 (design): release clock the decision tick ==
  time to throw: flat 1.869 s | gen 1.975 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 968 of 51492 dropbacks (1.88 per 100); pressuredSacks 968; pressured dropbacks 11302 (21.95 per 100) [time to throw 1.869 s]
    gen: sacks 455 of 28734 dropbacks (1.58 per 100); pressuredSacks 455; pressured dropbacks 6733 (23.43 per 100) [time to throw 1.975 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.56% | -13.46 against 22.02% (PR #33, FTN only (held)) | -6.90 against 15.46% (main) [time to throw 1.869 s]
    gen: 6.76% | -15.26 against 22.02% (PR #33, FTN only (held)) | -8.70 against 15.46% (main) [time to throw 1.975 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.95 % | gen 23.43 %
  hit_or_sack_rate: flat 7.46 % [time to throw 1.869 s] | gen 10.18 % [time to throw 1.975 s]
  sack_rate: flat 1.88 % [time to throw 1.869 s] | gen 1.58 % [time to throw 1.975 s]
  time_to_throw: flat 1.869 seconds | gen 1.975 seconds
  sack_share_of_hit_or_sack: flat 25.21 % [time to throw 1.869 s] | gen 15.56 % [time to throw 1.975 s]
  qb_hit_on_scramble: flat 4.11 % [time to throw 1.869 s] | gen 1.59 % [time to throw 1.975 s]
  release_distribution: flat 1.869 seconds | gen 1.975 seconds
  pressured_share_by_release_bin: flat 16.74 % | gen 20.57 %
  hit_rate_by_release_bin: flat 10.78 % [time to throw 1.869 s] | gen 12.94 % [time to throw 1.975 s]
  hits_on_aimed_throws_per_dropback: flat 5.06 % [time to throw 1.869 s] | gen 8.06 % [time to throw 1.975 s]
  first_pressure_seconds: flat 1.389 seconds | gen 1.516 seconds
  first_forcing_seconds: flat 1.739 seconds | gen 1.846 seconds
  first_arrival_seconds: flat 1.889 seconds | gen 1.972 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.38%, FREE_RUNNER 69.92%, WON_REP 26.70%; gen COUNTER 3.47%, FREE_RUNNER 65.30%, WON_REP 31.22%)
  quick_pressure_share_by_origin: flat 88.77 % | gen 83.83 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.47 %
  clean_with_live_won_rep_dropbacks: flat 1.22 % | gen 1.42 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.94 % | gen 11.78 %
  throwaway_rate_clean: flat 18.33 % | gen 10.14 %
  scramble_rate: flat 2.31 % | gen 0.87 %
  scramble_yards: flat 5.74 yards | gen 5.69 yards
  by_down_fixed_calls: flat 9.27 % | gen 8.22 %
  int_per_aimed_throw: flat 2.75 % | gen 7.38 %
  completion_per_aimed_throw: flat 46.80 % | gen 42.82 %
  forced_throw_share: flat 10.57 % | gen 15.39 %
  completion_by_pocket_status: flat 27.19 % | gen 25.39 %
  qb_season_spread: flat 0.00 pp | gen 2.35 pp
  defence_season_spread: flat 0.57 pp | gen 1.53 pp
  unblocked_pressures_per_100: flat 15.82 per 100 dropbacks | gen 15.34 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 32.68 % [time to throw 1.869 s] | gen 23.77 % [time to throw 1.975 s]
  unblocked_men_per_100: flat 19.01 per 100 dropbacks | gen 18.50 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.55 % | gen 10.42 %
  quick_share_no_free_runner: flat 73.75 % | gen 64.75 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.51 % | gen 11.55 %
  situation_q1q3_last_two: flat 17.19 % | gen 12.24 %
  sack_share_of_contacts_in_out: flat 56.64 % [time to throw 1.869 s] | gen 45.82 % [time to throw 1.975 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.869 s] | gen 0.00 % [time to throw 1.975 s]
  sacker_mix.split.interior: flat 30.10 % [time to throw 1.869 s] | gen 31.17 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 47.45 % [time to throw 1.869 s] | gen 47.69 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.14 % [time to throw 1.869 s] | gen 20.70 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.31 % [time to throw 1.869 s] | gen 0.44 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.17 % [time to throw 1.869 s] | gen 31.21 % [time to throw 1.975 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.85 % | gen 2.54 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.33 % | gen 2.34 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.01 % | gen 20.72 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.12 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.62 % | gen 17.24 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.14 % | gen 14.84 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.88 % | gen 46.93 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.78 % | gen 19.52 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.47 % | gen 40.50 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.21 % | gen 21.84 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.55 % | gen 22.66 %
  nobody_open_share: flat 43.29 % of dropbacks | gen 33.83 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.25 % of dropbacks | gen 11.59 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.36 % of dropbacks | gen 10.13 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.81 % of dropbacks | gen 10.52 % of dropbacks
  nobody_open_share.split.SACK: flat 1.88 % of dropbacks [time to throw 1.869 s] | gen 1.58 % of dropbacks [time to throw 1.975 s]
  clean_checkdown_share: flat 19.29 % of clean aimed throws | gen 8.87 % of clean aimed throws
  clean_later_read_share: flat 15.29 % of clean aimed throws | gen 22.03 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.24, per aimed throw 2.75; forced-throw share 10.57; completion per attempt 38.10, per aimed throw 46.80; INT-source mix CONTESTED_CATCH 88.68, TIPPED_RECOVERY 11.32
      flat PROGRESSION: 20960 aimed, INT 0.33, completion 45.88
      flat RANK_PUSHED: 6825 aimed, INT 12.01, completion 18.78
      flat CHECKDOWN: 8880 aimed, INT 0.17, completion 45.47
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3275 aimed, INT 5.62, completion 28.21
      flat ON_THE_RUN: 224 aimed, INT 7.14, completion 24.55
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.14 against a real 3.25
    gen: INT per attempt 6.58, per aimed throw 7.38; forced-throw share 15.39; completion per attempt 38.20, per aimed throw 42.82; INT-source mix CONTESTED_CATCH 44.66, TIPPED_RECOVERY 55.34
      gen PROGRESSION: 14366 aimed, INT 2.34, completion 46.93
      gen RANK_PUSHED: 4267 aimed, INT 20.72, completion 19.52
      gen CHECKDOWN: 3331 aimed, INT 3.12, completion 40.50
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2912 aimed, INT 17.24, completion 21.84
      gen ON_THE_RUN: 128 aimed, INT 14.84, completion 22.66
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.84 against a real 3.25
    the filed guard against C1 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.81 -> arm 2.75, rise -0.06 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.33 -> arm 0.33, rise -0.00 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 12.37 -> arm 12.01, rise -0.36 against an allowed -0.01: PASSES
    flat CHECKDOWN: base 0.19 -> arm 0.17, rise -0.02 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.16 -> arm 5.62, rise 0.46 against an allowed -0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 6.28 -> arm 7.14, rise 0.86 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.50 -> arm 7.38, rise -0.12 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.47 -> arm 2.34, rise -0.13 against an allowed 0.00: PASSES
    gen RANK_PUSHED: base 21.12 -> arm 20.72, rise -0.40 against an allowed -0.01: PASSES
    gen CHECKDOWN: base 2.84 -> arm 3.12, rise 0.28 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 17.89 -> arm 17.24, rise -0.65 against an allowed 0.00: PASSES
    gen ON_THE_RUN: base 15.93 -> arm 14.84, rise -1.09 against an allowed -0.01: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C1 (re-played): flat 3117 | gen 2491

== D5 (printed beside the motion clauses): release clock the decision tick ==
  time to throw: flat 1.868 s | gen 1.975 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1328 of 51358 dropbacks (2.59 per 100); pressuredSacks 1328; pressured dropbacks 11251 (21.91 per 100) [time to throw 1.868 s]
    gen: sacks 651 of 28615 dropbacks (2.28 per 100); pressuredSacks 651; pressured dropbacks 6693 (23.39 per 100) [time to throw 1.975 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.80% | -10.22 against 22.02% (PR #33, FTN only (held)) | -3.66 against 15.46% (main) [time to throw 1.868 s]
    gen: 9.73% | -12.29 against 22.02% (PR #33, FTN only (held)) | -5.73 against 15.46% (main) [time to throw 1.975 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.91 % | gen 23.39 %
  hit_or_sack_rate: flat 7.54 % [time to throw 1.868 s] | gen 10.21 % [time to throw 1.975 s]
  sack_rate: flat 2.59 % [time to throw 1.868 s] | gen 2.28 % [time to throw 1.975 s]
  time_to_throw: flat 1.868 seconds | gen 1.975 seconds
  sack_share_of_hit_or_sack: flat 34.28 % [time to throw 1.868 s] | gen 22.29 % [time to throw 1.975 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.868 s] | gen 0.00 % [time to throw 1.975 s]
  release_distribution: flat 1.868 seconds | gen 1.975 seconds
  pressured_share_by_release_bin: flat 15.32 % | gen 18.90 %
  hit_rate_by_release_bin: flat 10.66 % [time to throw 1.868 s] | gen 12.33 % [time to throw 1.975 s]
  hits_on_aimed_throws_per_dropback: flat 4.96 % [time to throw 1.868 s] | gen 7.93 % [time to throw 1.975 s]
  first_pressure_seconds: flat 1.388 seconds | gen 1.525 seconds
  first_forcing_seconds: flat 1.739 seconds | gen 1.850 seconds
  first_arrival_seconds: flat 1.885 seconds | gen 1.966 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.28%, FREE_RUNNER 69.95%, WON_REP 26.77%; gen COUNTER 3.59%, FREE_RUNNER 64.99%, WON_REP 31.42%)
  quick_pressure_share_by_origin: flat 88.83 % | gen 83.13 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.47 %
  clean_with_live_won_rep_dropbacks: flat 1.22 % | gen 1.43 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.64 % | gen 9.62 %
  throwaway_rate_clean: flat 18.43 % | gen 10.12 %
  scramble_rate: flat 2.20 % | gen 0.90 %
  scramble_yards: flat 5.42 yards | gen 5.45 yards
  by_down_fixed_calls: flat 12.18 % | gen 10.66 %
  int_per_aimed_throw: flat 2.73 % | gen 7.43 %
  completion_per_aimed_throw: flat 46.86 % | gen 42.51 %
  forced_throw_share: flat 10.51 % | gen 15.27 %
  completion_by_pocket_status: flat 27.78 % | gen 25.64 %
  qb_season_spread: flat 0.96 pp | gen 2.89 pp
  defence_season_spread: flat 0.00 pp | gen 1.98 pp
  unblocked_pressures_per_100: flat 15.69 per 100 dropbacks | gen 15.28 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 33.84 % [time to throw 1.868 s] | gen 23.96 % [time to throw 1.975 s]
  unblocked_men_per_100: flat 18.82 per 100 dropbacks | gen 18.40 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.96 % | gen 9.71 %
  quick_share_no_free_runner: flat 74.17 % | gen 63.60 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.54 % | gen 9.85 %
  situation_q1q3_last_two: flat 14.55 % | gen 10.78 %
  sack_share_of_contacts_in_out: flat 76.50 % [time to throw 1.868 s] | gen 64.91 % [time to throw 1.975 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.868 s] | gen 0.00 % [time to throw 1.975 s]
  sacker_mix.split.interior: flat 31.60 % [time to throw 1.868 s] | gen 35.92 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.90 % [time to throw 1.868 s] | gen 44.09 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.05 % [time to throw 1.868 s] | gen 19.69 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.45 % [time to throw 1.868 s] | gen 0.31 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.63 % [time to throw 1.868 s] | gen 36.41 % [time to throw 1.975 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.79 % | gen 2.54 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.34 % | gen 2.37 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.16 % | gen 20.96 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.16 % | gen 3.19 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.01 % | gen 17.22 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.16 % | gen 17.27 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.95 % | gen 46.65 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.76 % | gen 19.06 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.33 % | gen 40.26 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.07 % | gen 21.86 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.17 % | gen 20.00 %
  nobody_open_share: flat 43.70 % of dropbacks | gen 34.00 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.21 % of dropbacks | gen 11.63 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.52 % of dropbacks | gen 10.09 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.38 % of dropbacks | gen 10.00 % of dropbacks
  nobody_open_share.split.SACK: flat 2.59 % of dropbacks [time to throw 1.868 s] | gen 2.28 % of dropbacks [time to throw 1.975 s]
  clean_checkdown_share: flat 19.33 % of clean aimed throws | gen 8.87 % of clean aimed throws
  clean_later_read_share: flat 15.33 % of clean aimed throws | gen 21.98 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.23, per aimed throw 2.73; forced-throw share 10.51; completion per attempt 38.30, per aimed throw 46.86; INT-source mix CONTESTED_CATCH 88.74, TIPPED_RECOVERY 11.26
      flat PROGRESSION: 20771 aimed, INT 0.34, completion 45.95
      flat RANK_PUSHED: 6803 aimed, INT 12.16, completion 18.76
      flat CHECKDOWN: 8839 aimed, INT 0.16, completion 45.33
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3350 aimed, INT 5.01, completion 29.07
      flat ON_THE_RUN: 211 aimed, INT 6.16, completion 24.17
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.16 against a real 3.25
    gen: INT per attempt 6.67, per aimed throw 7.43; forced-throw share 15.27; completion per attempt 38.12, per aimed throw 42.51; INT-source mix CONTESTED_CATCH 44.50, TIPPED_RECOVERY 55.50
      gen PROGRESSION: 14292 aimed, INT 2.37, completion 46.65
      gen RANK_PUSHED: 4228 aimed, INT 20.96, completion 19.06
      gen CHECKDOWN: 3328 aimed, INT 3.19, completion 40.26
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2887 aimed, INT 17.22, completion 21.86
      gen ON_THE_RUN: 110 aimed, INT 17.27, completion 20.00
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.27 against a real 3.25
    the filed guard against C1 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.81 -> arm 2.73, rise -0.08 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.33 -> arm 0.34, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 12.37 -> arm 12.16, rise -0.21 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.19 -> arm 0.16, rise -0.03 against an allowed 0.01: PASSES
    flat DESPERATION: base 5.16 -> arm 5.01, rise -0.14 against an allowed -0.01: PASSES
    flat ON_THE_RUN: base 6.28 -> arm 6.16, rise -0.12 against an allowed 0.01: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.50 -> arm 7.43, rise -0.06 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.47 -> arm 2.37, rise -0.09 against an allowed 0.00: PASSES
    gen RANK_PUSHED: base 21.12 -> arm 20.96, rise -0.17 against an allowed -0.00: PASSES
    gen CHECKDOWN: base 2.84 -> arm 3.19, rise 0.34 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 17.89 -> arm 17.22, rise -0.68 against an allowed 0.01: PASSES
    gen ON_THE_RUN: base 15.93 -> arm 17.27, rise 1.34 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C1 (re-played): flat 2157 | gen 1937

== D7 (printed, reported direction only): release clock the decision tick ==
  time to throw: flat 1.607 s | gen 1.703 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 959 of 51472 dropbacks (1.86 per 100); pressuredSacks 959; pressured dropbacks 11307 (21.97 per 100) [time to throw 1.607 s]
    gen: sacks 451 of 28530 dropbacks (1.58 per 100); pressuredSacks 451; pressured dropbacks 6651 (23.31 per 100) [time to throw 1.703 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.48% | -13.54 against 22.02% (PR #33, FTN only (held)) | -6.98 against 15.46% (main) [time to throw 1.607 s]
    gen: 6.78% | -15.24 against 22.02% (PR #33, FTN only (held)) | -8.68 against 15.46% (main) [time to throw 1.703 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.97 % | gen 23.31 %
  hit_or_sack_rate: flat 3.21 % [time to throw 1.607 s] | gen 3.42 % [time to throw 1.703 s]
  sack_rate: flat 1.86 % [time to throw 1.607 s] | gen 1.58 % [time to throw 1.703 s]
  time_to_throw: flat 1.607 seconds | gen 1.703 seconds
  sack_share_of_hit_or_sack: flat 58.02 % [time to throw 1.607 s] | gen 46.26 % [time to throw 1.703 s]
  qb_hit_on_scramble: flat 4.58 % [time to throw 1.607 s] | gen 1.54 % [time to throw 1.703 s]
  release_distribution: flat 1.607 seconds | gen 1.703 seconds
  pressured_share_by_release_bin: flat 16.80 % | gen 20.48 %
  hit_rate_by_release_bin: flat 4.31 % [time to throw 1.607 s] | gen 4.57 % [time to throw 1.703 s]
  hits_on_aimed_throws_per_dropback: flat 0.84 % [time to throw 1.607 s] | gen 1.32 % [time to throw 1.703 s]
  first_pressure_seconds: flat 1.392 seconds | gen 1.514 seconds
  first_forcing_seconds: flat 1.739 seconds | gen 1.847 seconds
  first_arrival_seconds: flat 1.887 seconds | gen 1.959 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.35%, FREE_RUNNER 69.76%, WON_REP 26.89%; gen COUNTER 3.49%, FREE_RUNNER 65.55%, WON_REP 30.96%)
  quick_pressure_share_by_origin: flat 88.79 % | gen 83.84 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.49 %
  clean_with_live_won_rep_dropbacks: flat 1.21 % | gen 1.45 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.91 % | gen 11.64 %
  throwaway_rate_clean: flat 18.28 % | gen 10.00 %
  scramble_rate: flat 2.34 % | gen 0.91 %
  scramble_yards: flat 5.36 yards | gen 4.80 yards
  by_down_fixed_calls: flat 9.69 % | gen 7.88 %
  int_per_aimed_throw: flat 2.80 % | gen 7.38 %
  completion_per_aimed_throw: flat 46.95 % | gen 43.58 %
  forced_throw_share: flat 10.63 % | gen 15.30 %
  completion_by_pocket_status: flat 28.80 % | gen 27.91 %
  qb_season_spread: flat 0.00 pp | gen 2.30 pp
  defence_season_spread: flat 0.00 pp | gen 1.29 pp
  unblocked_pressures_per_100: flat 15.72 per 100 dropbacks | gen 15.35 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 76.47 % [time to throw 1.607 s] | gen 70.87 % [time to throw 1.703 s]
  unblocked_men_per_100: flat 18.91 per 100 dropbacks | gen 18.55 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.48 % | gen 10.20 %
  quick_share_no_free_runner: flat 73.94 % | gen 64.25 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.12 % | gen 11.39 %
  situation_q1q3_last_two: flat 16.38 % | gen 12.57 %
  sack_share_of_contacts_in_out: flat 56.15 % [time to throw 1.607 s] | gen 46.07 % [time to throw 1.703 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.607 s] | gen 0.00 % [time to throw 1.703 s]
  sacker_mix.split.interior: flat 30.07 % [time to throw 1.607 s] | gen 31.01 % [time to throw 1.703 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 47.05 % [time to throw 1.607 s] | gen 47.67 % [time to throw 1.703 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.58 % [time to throw 1.607 s] | gen 20.88 % [time to throw 1.703 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.31 % [time to throw 1.607 s] | gen 0.44 % [time to throw 1.703 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.03 % [time to throw 1.607 s] | gen 31.04 % [time to throw 1.703 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.81 % | gen 2.62 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 2.39 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.28 % | gen 21.02 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 2.72 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.54 % | gen 17.59 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.21 % | gen 14.84 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 46.03 % | gen 47.24 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.86 % | gen 20.08 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.92 % | gen 42.28 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.51 % | gen 22.65 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.23 % | gen 21.88 %
  nobody_open_share: flat 43.32 % of dropbacks | gen 33.74 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.29 % of dropbacks | gen 11.73 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.41 % of dropbacks | gen 10.04 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.76 % of dropbacks | gen 10.38 % of dropbacks
  nobody_open_share.split.SACK: flat 1.86 % of dropbacks [time to throw 1.607 s] | gen 1.58 % of dropbacks [time to throw 1.703 s]
  clean_checkdown_share: flat 19.36 % of clean aimed throws | gen 9.06 % of clean aimed throws
  clean_later_read_share: flat 15.14 % of clean aimed throws | gen 22.05 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.28, per aimed throw 2.80; forced-throw share 10.63; completion per attempt 38.24, per aimed throw 46.95; INT-source mix CONTESTED_CATCH 89.08, TIPPED_RECOVERY 10.92
      flat PROGRESSION: 20866 aimed, INT 0.30, completion 46.03
      flat RANK_PUSHED: 6882 aimed, INT 12.28, completion 18.86
      flat CHECKDOWN: 8899 aimed, INT 0.21, completion 45.92
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3301 aimed, INT 5.54, completion 28.51
      flat ON_THE_RUN: 222 aimed, INT 7.21, completion 25.23
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.21 against a real 3.25
    gen: INT per attempt 6.59, per aimed throw 7.38; forced-throw share 15.30; completion per attempt 38.94, per aimed throw 43.58; INT-source mix CONTESTED_CATCH 43.29, TIPPED_RECOVERY 56.71
      gen PROGRESSION: 14345 aimed, INT 2.39, completion 47.24
      gen RANK_PUSHED: 4173 aimed, INT 21.02, completion 20.08
      gen CHECKDOWN: 3347 aimed, INT 2.72, completion 42.28
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2865 aimed, INT 17.59, completion 22.65
      gen ON_THE_RUN: 128 aimed, INT 14.84, completion 21.88
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.84 against a real 3.25
    the filed guard against C1 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.81 -> arm 2.80, rise -0.00 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.33 -> arm 0.30, rise -0.03 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 12.37 -> arm 12.28, rise -0.09 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.19 -> arm 0.21, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 5.16 -> arm 5.54, rise 0.39 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 6.28 -> arm 7.21, rise 0.93 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.50 -> arm 7.38, rise -0.12 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.47 -> arm 2.39, rise -0.07 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 21.12 -> arm 21.02, rise -0.10 against an allowed -0.00: PASSES
    gen CHECKDOWN: base 2.84 -> arm 2.72, rise -0.12 against an allowed -0.00: PASSES
    gen DESPERATION: base 17.89 -> arm 17.59, rise -0.30 against an allowed -0.01: PASSES
    gen ON_THE_RUN: base 15.93 -> arm 14.84, rise -1.09 against an allowed -0.02: PASSES
    gen by class: PASSES
  exclusive affected plays against C1 (re-played): flat 906 | gen 525
```

### C2 (re-played) with D2, D6, D8, seed set 1

```text
ADR-089 step 4: the pocket report (4 arms; both leagues; every hit and sack figure with its time to throw beside it)

== C2 (re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 2.741 s | gen 2.701 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2897 of 48629 dropbacks (5.96 per 100); pressuredSacks 2897; pressured dropbacks 20033 (41.20 per 100) [time to throw 2.741 s]
    gen: sacks 1651 of 26999 dropbacks (6.12 per 100); pressuredSacks 1638; pressured dropbacks 11074 (41.02 per 100) [time to throw 2.701 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 14.46% | -7.56 against 22.02% (PR #33, FTN only (held)) | -1.00 against 15.46% (main) [time to throw 2.741 s]
    gen: 14.79% | -7.23 against 22.02% (PR #33, FTN only (held)) | -0.67 against 15.46% (main) [time to throw 2.701 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.20 % | gen 41.02 %
  hit_or_sack_rate: flat 8.46 % [time to throw 2.741 s] | gen 10.26 % [time to throw 2.701 s]
  sack_rate: flat 5.96 % [time to throw 2.741 s] | gen 6.12 % [time to throw 2.701 s]
  time_to_throw: flat 2.741 seconds | gen 2.701 seconds
  sack_share_of_hit_or_sack: flat 70.38 % [time to throw 2.741 s] | gen 59.60 % [time to throw 2.701 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.741 s] | gen 0.00 % [time to throw 2.701 s]
  release_distribution: flat 2.741 seconds | gen 2.701 seconds
  pressured_share_by_release_bin: flat 41.68 % | gen 46.71 %
  hit_rate_by_release_bin: flat 16.36 % [time to throw 2.741 s] | gen 21.44 % [time to throw 2.701 s]
  hits_on_aimed_throws_per_dropback: flat 2.51 % [time to throw 2.741 s] | gen 4.14 % [time to throw 2.701 s]
  first_pressure_seconds: flat 1.979 seconds | gen 2.030 seconds
  first_forcing_seconds: flat 2.225 seconds | gen 2.280 seconds
  first_arrival_seconds: flat 2.001 seconds | gen 2.043 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.21%, FREE_RUNNER 51.32%, WON_REP 43.47%; gen COUNTER 5.73%, FREE_RUNNER 49.90%, WON_REP 44.37%)
  quick_pressure_share_by_origin: flat 61.84 % | gen 60.73 %
  clean_with_live_won_rep_ticks: flat 0.81 % | gen 0.77 %
  clean_with_live_won_rep_dropbacks: flat 3.61 % | gen 3.42 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 19.50 % | gen 14.96 %
  throwaway_rate_clean: flat 14.74 % | gen 7.15 %
  scramble_rate: flat 6.17 % | gen 2.84 %
  scramble_yards: flat 6.30 yards | gen 5.02 yards
  by_down_fixed_calls: flat 15.93 % | gen 17.26 %
  int_per_aimed_throw: flat 2.92 % | gen 7.13 %
  completion_per_aimed_throw: flat 43.26 % | gen 41.86 %
  forced_throw_share: flat 24.26 % | gen 27.48 %
  completion_by_pocket_status: flat 24.32 % | gen 25.67 %
  qb_season_spread: flat 0.00 pp | gen 2.87 pp
  defence_season_spread: flat 0.00 pp | gen 1.05 pp
  unblocked_pressures_per_100: flat 18.90 per 100 dropbacks | gen 18.21 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 74.20 % [time to throw 2.741 s] | gen 71.16 % [time to throw 2.701 s]
  unblocked_men_per_100: flat 18.95 per 100 dropbacks | gen 18.25 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.00 % | gen 24.49 %
  quick_share_no_free_runner: flat 37.24 % | gen 36.80 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 18.73 % | gen 14.35 %
  situation_q1q3_last_two: flat 18.49 % | gen 14.74 %
  sack_share_of_contacts_in_out: flat 70.32 % [time to throw 2.741 s] | gen 59.53 % [time to throw 2.701 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.741 s] | gen 0.79 % [time to throw 2.701 s]
  sacker_mix.split.interior: flat 34.09 % [time to throw 2.741 s] | gen 36.23 % [time to throw 2.701 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.74 % [time to throw 2.741 s] | gen 45.80 % [time to throw 2.701 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.42 % [time to throw 2.741 s] | gen 17.63 % [time to throw 2.701 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.74 % [time to throw 2.741 s] | gen 0.34 % [time to throw 2.701 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 34.25 % [time to throw 2.741 s] | gen 36.41 % [time to throw 2.701 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.30 % | gen 6.43 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 2.29 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.28 % | gen 20.24 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.12 % | gen 3.13 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 7.05 % | gen 16.30 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.26 % | gen 15.38 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.11 % | gen 45.61 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.38 % | gen 18.65 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.09 % | gen 36.16 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 25.09 % | gen 23.14 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.84 % | gen 26.50 %
  nobody_open_share: flat 37.22 % of dropbacks | gen 34.92 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.47 % of dropbacks | gen 8.75 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.10 % of dropbacks | gen 9.70 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.70 % of dropbacks | gen 10.35 % of dropbacks
  nobody_open_share.split.SACK: flat 5.96 % of dropbacks [time to throw 2.741 s] | gen 6.12 % of dropbacks [time to throw 2.701 s]
  clean_checkdown_share: flat 5.27 % of clean aimed throws | gen 2.90 % of clean aimed throws
  clean_later_read_share: flat 21.95 % of clean aimed throws | gen 26.30 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.37, per aimed throw 2.92; forced-throw share 24.26; completion per attempt 35.04, per aimed throw 43.26; INT-source mix CONTESTED_CATCH 91.00, TIPPED_RECOVERY 9.00
      flat PROGRESSION: 20899 aimed, INT 0.29, completion 43.11
      flat RANK_PUSHED: 6438 aimed, INT 11.28, completion 18.38
      flat CHECKDOWN: 4117 aimed, INT 0.12, completion 38.09
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2965 aimed, INT 7.05, completion 25.09
      flat ON_THE_RUN: 190 aimed, INT 5.26, completion 26.84
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.26 against a real 3.25
    gen: INT per attempt 6.32, per aimed throw 7.13; forced-throw share 27.48; completion per attempt 37.10, per aimed throw 41.86; INT-source mix CONTESTED_CATCH 43.85, TIPPED_RECOVERY 56.15
      gen PROGRESSION: 13058 aimed, INT 2.29, completion 45.61
      gen RANK_PUSHED: 3631 aimed, INT 20.24, completion 18.65
      gen CHECKDOWN: 2362 aimed, INT 3.13, completion 36.16
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2619 aimed, INT 16.30, completion 23.14
      gen ON_THE_RUN: 117 aimed, INT 15.38, completion 26.50
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.38 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D2 (pricing arm, never a design value): release clock the decision tick ==
  time to throw: flat 2.990 s | gen 2.951 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2202 of 49398 dropbacks (4.46 per 100); pressuredSacks 2202; pressured dropbacks 20410 (41.32 per 100) [time to throw 2.990 s]
    gen: sacks 1175 of 27513 dropbacks (4.27 per 100); pressuredSacks 1160; pressured dropbacks 11310 (41.11 per 100) [time to throw 2.951 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.79% | -11.23 against 22.02% (PR #33, FTN only (held)) | -4.67 against 15.46% (main) [time to throw 2.990 s]
    gen: 10.26% | -11.76 against 22.02% (PR #33, FTN only (held)) | -5.20 against 15.46% (main) [time to throw 2.951 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.32 % | gen 41.11 %
  hit_or_sack_rate: flat 17.45 % [time to throw 2.990 s] | gen 20.36 % [time to throw 2.951 s]
  sack_rate: flat 4.46 % [time to throw 2.990 s] | gen 4.27 % [time to throw 2.951 s]
  time_to_throw: flat 2.990 seconds | gen 2.951 seconds
  sack_share_of_hit_or_sack: flat 25.55 % [time to throw 2.990 s] | gen 20.98 % [time to throw 2.951 s]
  qb_hit_on_scramble: flat 3.46 % [time to throw 2.990 s] | gen 4.92 % [time to throw 2.951 s]
  release_distribution: flat 2.990 seconds | gen 2.951 seconds
  pressured_share_by_release_bin: flat 44.86 % | gen 49.88 %
  hit_rate_by_release_bin: flat 28.92 % [time to throw 2.990 s] | gen 33.99 % [time to throw 2.951 s]
  hits_on_aimed_throws_per_dropback: flat 11.89 % [time to throw 2.990 s] | gen 14.72 % [time to throw 2.951 s]
  first_pressure_seconds: flat 1.976 seconds | gen 2.024 seconds
  first_forcing_seconds: flat 2.220 seconds | gen 2.277 seconds
  first_arrival_seconds: flat 1.994 seconds | gen 2.036 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.35%, FREE_RUNNER 51.40%, WON_REP 43.24%; gen COUNTER 5.59%, FREE_RUNNER 50.00%, WON_REP 44.41%)
  quick_pressure_share_by_origin: flat 61.98 % | gen 61.15 %
  clean_with_live_won_rep_ticks: flat 0.83 % | gen 0.79 %
  clean_with_live_won_rep_dropbacks: flat 3.70 % | gen 3.49 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.20 % | gen 18.26 %
  throwaway_rate_clean: flat 14.44 % | gen 7.07 %
  scramble_rate: flat 6.44 % | gen 3.03 %
  scramble_yards: flat 6.63 yards | gen 4.09 yards
  by_down_fixed_calls: flat 11.57 % | gen 12.00 %
  int_per_aimed_throw: flat 2.86 % | gen 7.09 %
  completion_per_aimed_throw: flat 42.14 % | gen 41.21 %
  forced_throw_share: flat 24.29 % | gen 27.66 %
  completion_by_pocket_status: flat 20.75 % | gen 22.74 %
  qb_season_spread: flat 0.32 pp | gen 1.73 pp
  defence_season_spread: flat 0.00 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 19.11 per 100 dropbacks | gen 18.33 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 35.74 % [time to throw 2.990 s] | gen 36.08 % [time to throw 2.951 s]
  unblocked_men_per_100: flat 19.15 per 100 dropbacks | gen 18.36 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.16 % | gen 26.00 %
  quick_share_no_free_runner: flat 37.04 % | gen 36.95 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 21.11 % | gen 16.58 %
  situation_q1q3_last_two: flat 21.46 % | gen 17.17 %
  sack_share_of_contacts_in_out: flat 52.31 % [time to throw 2.990 s] | gen 40.89 % [time to throw 2.951 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.990 s] | gen 1.28 % [time to throw 2.951 s]
  sacker_mix.split.interior: flat 32.07 % [time to throw 2.990 s] | gen 31.14 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.52 % [time to throw 2.990 s] | gen 47.50 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.68 % [time to throw 2.990 s] | gen 21.07 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.73 % [time to throw 2.990 s] | gen 0.29 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.26 % [time to throw 2.990 s] | gen 31.33 % [time to throw 2.951 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.35 % | gen 6.43 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.28 % | gen 2.22 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.24 % | gen 20.05 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.12 % | gen 3.14 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.52 % | gen 16.62 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.31 % | gen 15.58 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.72 % | gen 45.34 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.99 % | gen 18.55 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 35.98 % | gen 33.88 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.76 % | gen 21.78 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.21 % | gen 23.38 %
  nobody_open_share: flat 36.86 % of dropbacks | gen 34.61 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.70 % of dropbacks | gen 8.81 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.06 % of dropbacks | gen 9.86 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.64 % of dropbacks | gen 11.67 % of dropbacks
  nobody_open_share.split.SACK: flat 4.46 % of dropbacks [time to throw 2.990 s] | gen 4.27 % of dropbacks [time to throw 2.951 s]
  clean_checkdown_share: flat 5.48 % of clean aimed throws | gen 2.95 % of clean aimed throws
  clean_later_read_share: flat 22.05 % of clean aimed throws | gen 26.46 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.29, per aimed throw 2.86; forced-throw share 24.29; completion per attempt 33.80, per aimed throw 42.14; INT-source mix CONTESTED_CATCH 90.87, TIPPED_RECOVERY 9.13
      flat PROGRESSION: 21255 aimed, INT 0.28, completion 42.72
      flat RANK_PUSHED: 6546 aimed, INT 11.24, completion 16.99
      flat CHECKDOWN: 4300 aimed, INT 0.12, completion 35.98
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2992 aimed, INT 6.52, completion 23.76
      flat ON_THE_RUN: 206 aimed, INT 6.31, completion 26.21
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.31 against a real 3.25
    gen: INT per attempt 6.20, per aimed throw 7.09; forced-throw share 27.66; completion per attempt 36.02, per aimed throw 41.21; INT-source mix CONTESTED_CATCH 44.53, TIPPED_RECOVERY 55.47
      gen PROGRESSION: 13343 aimed, INT 2.22, completion 45.34
      gen RANK_PUSHED: 3660 aimed, INT 20.05, completion 18.55
      gen CHECKDOWN: 2423 aimed, INT 3.14, completion 33.88
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2714 aimed, INT 16.62, completion 21.78
      gen ON_THE_RUN: 154 aimed, INT 15.58, completion 23.38
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.58 against a real 3.25
    the filed guard against C2 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.92 -> arm 2.86, rise -0.07 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.29 -> arm 0.28, rise -0.01 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 11.28 -> arm 11.24, rise -0.03 against an allowed -0.01: PASSES
    flat CHECKDOWN: base 0.12 -> arm 0.12, rise -0.01 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 7.05 -> arm 6.52, rise -0.53 against an allowed -0.01: PASSES
    flat ON_THE_RUN: base 5.26 -> arm 6.31, rise 1.05 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.13 -> arm 7.09, rise -0.04 against an allowed -0.01: PASSES
    gen PROGRESSION: base 2.29 -> arm 2.22, rise -0.07 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 20.24 -> arm 20.05, rise -0.19 against an allowed -0.01: PASSES
    gen CHECKDOWN: base 3.13 -> arm 3.14, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 16.30 -> arm 16.62, rise 0.31 against an allowed -0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 15.38 -> arm 15.58, rise 0.20 against an allowed 0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C2 (re-played): flat 6468 | gen 4172

== D6 (the motion clauses' arm (AM-7 item 2); guarded under AM-6): release clock the decision tick ==
  time to throw: flat 3.006 s | gen 2.959 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2921 of 48748 dropbacks (5.99 per 100); pressuredSacks 2921; pressured dropbacks 20206 (41.45 per 100) [time to throw 3.006 s]
    gen: sacks 1668 of 27145 dropbacks (6.14 per 100); pressuredSacks 1657; pressured dropbacks 11150 (41.08 per 100) [time to throw 2.959 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 14.46% | -7.56 against 22.02% (PR #33, FTN only (held)) | -1.00 against 15.46% (main) [time to throw 3.006 s]
    gen: 14.86% | -7.16 against 22.02% (PR #33, FTN only (held)) | -0.60 against 15.46% (main) [time to throw 2.959 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.45 % | gen 41.08 %
  hit_or_sack_rate: flat 17.80 % [time to throw 3.006 s] | gen 20.43 % [time to throw 2.959 s]
  sack_rate: flat 5.99 % [time to throw 3.006 s] | gen 6.14 % [time to throw 2.959 s]
  time_to_throw: flat 3.006 seconds | gen 2.959 seconds
  sack_share_of_hit_or_sack: flat 33.67 % [time to throw 3.006 s] | gen 30.08 % [time to throw 2.959 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 3.006 s] | gen 0.00 % [time to throw 2.959 s]
  release_distribution: flat 3.006 seconds | gen 2.959 seconds
  pressured_share_by_release_bin: flat 41.99 % | gen 47.00 %
  hit_rate_by_release_bin: flat 28.52 % [time to throw 3.006 s] | gen 33.66 % [time to throw 2.959 s]
  hits_on_aimed_throws_per_dropback: flat 11.80 % [time to throw 3.006 s] | gen 14.29 % [time to throw 2.959 s]
  first_pressure_seconds: flat 1.983 seconds | gen 2.020 seconds
  first_forcing_seconds: flat 2.227 seconds | gen 2.270 seconds
  first_arrival_seconds: flat 1.996 seconds | gen 2.036 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.27%, FREE_RUNNER 51.35%, WON_REP 43.38%; gen COUNTER 5.83%, FREE_RUNNER 49.84%, WON_REP 44.33%)
  quick_pressure_share_by_origin: flat 61.65 % | gen 61.32 %
  clean_with_live_won_rep_ticks: flat 0.83 % | gen 0.80 %
  clean_with_live_won_rep_dropbacks: flat 3.66 % | gen 3.52 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 19.45 % | gen 15.09 %
  throwaway_rate_clean: flat 14.62 % | gen 7.21 %
  scramble_rate: flat 6.17 % | gen 2.79 %
  scramble_yards: flat 6.27 yards | gen 4.45 yards
  by_down_fixed_calls: flat 15.27 % | gen 16.89 %
  int_per_aimed_throw: flat 2.89 % | gen 6.90 %
  completion_per_aimed_throw: flat 42.28 % | gen 41.25 %
  forced_throw_share: flat 24.36 % | gen 27.34 %
  completion_by_pocket_status: flat 21.88 % | gen 23.67 %
  qb_season_spread: flat 0.00 pp | gen 2.77 pp
  defence_season_spread: flat 0.00 pp | gen 1.26 pp
  unblocked_pressures_per_100: flat 19.09 per 100 dropbacks | gen 18.33 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 35.59 % [time to throw 3.006 s] | gen 36.66 % [time to throw 2.959 s]
  unblocked_men_per_100: flat 19.13 per 100 dropbacks | gen 18.36 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.21 % | gen 24.67 %
  quick_share_no_free_runner: flat 37.12 % | gen 37.51 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 18.94 % | gen 14.89 %
  situation_q1q3_last_two: flat 17.92 % | gen 14.83 %
  sack_share_of_contacts_in_out: flat 70.27 % [time to throw 3.006 s] | gen 58.65 % [time to throw 2.959 s]
  coverage_sack_rows: flat 0.00 % [time to throw 3.006 s] | gen 0.66 % [time to throw 2.959 s]
  sacker_mix.split.interior: flat 34.36 % [time to throw 3.006 s] | gen 36.16 % [time to throw 2.959 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.46 % [time to throw 3.006 s] | gen 44.93 % [time to throw 2.959 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.27 % [time to throw 3.006 s] | gen 18.63 % [time to throw 2.959 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.91 % [time to throw 3.006 s] | gen 0.27 % [time to throw 2.959 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 34.56 % [time to throw 3.006 s] | gen 36.31 % [time to throw 2.959 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.30 % | gen 6.54 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 2.06 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.36 % | gen 19.92 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.07 % | gen 2.84 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.40 % | gen 16.41 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.35 % | gen 14.18 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.44 % | gen 45.18 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.62 % | gen 18.88 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 35.69 % | gen 33.66 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.76 % | gen 21.98 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.81 % | gen 25.37 %
  nobody_open_share: flat 37.40 % of dropbacks | gen 34.95 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.60 % of dropbacks | gen 8.70 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.18 % of dropbacks | gen 9.65 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.62 % of dropbacks | gen 10.45 % of dropbacks
  nobody_open_share.split.SACK: flat 5.99 % of dropbacks [time to throw 3.006 s] | gen 6.14 % of dropbacks [time to throw 2.959 s]
  clean_checkdown_share: flat 5.37 % of clean aimed throws | gen 2.80 % of clean aimed throws
  clean_later_read_share: flat 21.98 % of clean aimed throws | gen 26.43 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.34, per aimed throw 2.89; forced-throw share 24.36; completion per attempt 34.28, per aimed throw 42.28; INT-source mix CONTESTED_CATCH 90.93, TIPPED_RECOVERY 9.07
      flat PROGRESSION: 20853 aimed, INT 0.30, completion 42.44
      flat RANK_PUSHED: 6470 aimed, INT 11.36, completion 17.62
      flat CHECKDOWN: 4194 aimed, INT 0.07, completion 35.69
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3014 aimed, INT 6.40, completion 23.76
      flat ON_THE_RUN: 187 aimed, INT 5.35, completion 27.81
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.35 against a real 3.25
    gen: INT per attempt 6.10, per aimed throw 6.90; forced-throw share 27.34; completion per attempt 36.52, per aimed throw 41.25; INT-source mix CONTESTED_CATCH 45.33, TIPPED_RECOVERY 54.67
      gen PROGRESSION: 13138 aimed, INT 2.06, completion 45.18
      gen RANK_PUSHED: 3629 aimed, INT 19.92, completion 18.88
      gen CHECKDOWN: 2362 aimed, INT 2.84, completion 33.66
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2620 aimed, INT 16.41, completion 21.98
      gen ON_THE_RUN: 134 aimed, INT 14.18, completion 25.37
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.18 against a real 3.25
    the filed guard against C2 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.92 -> arm 2.89, rise -0.03 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.29 -> arm 0.30, rise 0.01 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.28 -> arm 11.36, rise 0.08 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.12 -> arm 0.07, rise -0.05 against an allowed -0.01: PASSES
    flat DESPERATION: base 7.05 -> arm 6.40, rise -0.65 against an allowed -0.00: PASSES
    flat ON_THE_RUN: base 5.26 -> arm 5.35, rise 0.08 against an allowed -0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.13 -> arm 6.90, rise -0.23 against an allowed -0.01: PASSES
    gen PROGRESSION: base 2.29 -> arm 2.06, rise -0.23 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 20.24 -> arm 19.92, rise -0.32 against an allowed -0.01: PASSES
    gen CHECKDOWN: base 3.13 -> arm 2.84, rise -0.30 against an allowed -0.00: PASSES
    gen DESPERATION: base 16.30 -> arm 16.41, rise 0.11 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 15.38 -> arm 14.18, rise -1.21 against an allowed 0.01: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C2 (re-played): flat 4568 | gen 2765

== D8 (printed, the tilts' base): release clock the decision tick ==
  time to throw: flat 2.731 s | gen 2.688 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2103 of 49379 dropbacks (4.26 per 100); pressuredSacks 2103; pressured dropbacks 20338 (41.19 per 100) [time to throw 2.731 s]
    gen: sacks 1105 of 27367 dropbacks (4.04 per 100); pressuredSacks 1091; pressured dropbacks 11269 (41.18 per 100) [time to throw 2.688 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.34% | -11.68 against 22.02% (PR #33, FTN only (held)) | -5.12 against 15.46% (main) [time to throw 2.731 s]
    gen: 9.68% | -12.34 against 22.02% (PR #33, FTN only (held)) | -5.78 against 15.46% (main) [time to throw 2.688 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.19 % | gen 41.18 %
  hit_or_sack_rate: flat 8.10 % [time to throw 2.731 s] | gen 10.08 % [time to throw 2.688 s]
  sack_rate: flat 4.26 % [time to throw 2.731 s] | gen 4.04 % [time to throw 2.688 s]
  time_to_throw: flat 2.731 seconds | gen 2.688 seconds
  sack_share_of_hit_or_sack: flat 52.55 % [time to throw 2.731 s] | gen 40.05 % [time to throw 2.688 s]
  qb_hit_on_scramble: flat 4.08 % [time to throw 2.731 s] | gen 5.43 % [time to throw 2.688 s]
  release_distribution: flat 2.731 seconds | gen 2.688 seconds
  pressured_share_by_release_bin: flat 44.55 % | gen 50.55 %
  hit_rate_by_release_bin: flat 16.17 % [time to throw 2.731 s] | gen 22.63 % [time to throw 2.688 s]
  hits_on_aimed_throws_per_dropback: flat 2.63 % [time to throw 2.731 s] | gen 4.49 % [time to throw 2.688 s]
  first_pressure_seconds: flat 1.967 seconds | gen 2.032 seconds
  first_forcing_seconds: flat 2.214 seconds | gen 2.281 seconds
  first_arrival_seconds: flat 1.991 seconds | gen 2.039 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.26%, FREE_RUNNER 51.56%, WON_REP 43.19%; gen COUNTER 5.52%, FREE_RUNNER 49.71%, WON_REP 44.77%)
  quick_pressure_share_by_origin: flat 62.25 % | gen 60.69 %
  clean_with_live_won_rep_ticks: flat 0.82 % | gen 0.77 %
  clean_with_live_won_rep_dropbacks: flat 3.61 % | gen 3.40 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.20 % | gen 18.97 %
  throwaway_rate_clean: flat 14.43 % | gen 7.11 %
  scramble_rate: flat 6.60 % | gen 3.03 %
  scramble_yards: flat 6.53 yards | gen 4.74 yards
  by_down_fixed_calls: flat 11.18 % | gen 9.50 %
  int_per_aimed_throw: flat 2.98 % | gen 7.27 %
  completion_per_aimed_throw: flat 43.04 % | gen 41.75 %
  forced_throw_share: flat 24.09 % | gen 27.81 %
  completion_by_pocket_status: flat 23.25 % | gen 24.16 %
  qb_season_spread: flat 0.65 pp | gen 1.77 pp
  defence_season_spread: flat 0.37 pp | gen 0.59 pp
  unblocked_pressures_per_100: flat 19.18 per 100 dropbacks | gen 18.11 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 75.01 % [time to throw 2.731 s] | gen 70.75 % [time to throw 2.688 s]
  unblocked_men_per_100: flat 19.23 per 100 dropbacks | gen 18.14 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.13 % | gen 26.48 %
  quick_share_no_free_runner: flat 37.50 % | gen 36.50 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 20.86 % | gen 19.42 %
  situation_q1q3_last_two: flat 22.14 % | gen 18.10 %
  sack_share_of_contacts_in_out: flat 50.76 % [time to throw 2.731 s] | gen 39.34 % [time to throw 2.688 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.731 s] | gen 1.27 % [time to throw 2.688 s]
  sacker_mix.split.interior: flat 32.70 % [time to throw 2.731 s] | gen 33.13 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 41.85 % [time to throw 2.731 s] | gen 45.14 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.77 % [time to throw 2.731 s] | gen 21.51 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.69 % [time to throw 2.731 s] | gen 0.22 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.84 % [time to throw 2.731 s] | gen 32.96 % [time to throw 2.688 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.25 % | gen 6.33 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 2.35 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.47 % | gen 20.76 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.14 % | gen 3.11 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 7.24 % | gen 16.83 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.69 % | gen 14.48 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.07 % | gen 45.68 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.60 % | gen 18.69 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.75 % | gen 36.02 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.56 % | gen 22.48 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 22.75 % | gen 23.45 %
  nobody_open_share: flat 36.45 % of dropbacks | gen 34.63 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.54 % of dropbacks | gen 8.82 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.01 % of dropbacks | gen 9.77 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.63 % of dropbacks | gen 11.99 % of dropbacks
  nobody_open_share.split.SACK: flat 4.26 % of dropbacks [time to throw 2.731 s] | gen 4.04 % of dropbacks [time to throw 2.688 s]
  clean_checkdown_share: flat 5.38 % of clean aimed throws | gen 2.92 % of clean aimed throws
  clean_later_read_share: flat 22.07 % of clean aimed throws | gen 26.62 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.39, per aimed throw 2.98; forced-throw share 24.09; completion per attempt 34.52, per aimed throw 43.04; INT-source mix CONTESTED_CATCH 90.39, TIPPED_RECOVERY 9.61
      flat PROGRESSION: 21326 aimed, INT 0.30, completion 43.07
      flat RANK_PUSHED: 6585 aimed, INT 11.47, completion 17.60
      flat CHECKDOWN: 4219 aimed, INT 0.14, completion 38.75
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2968 aimed, INT 7.24, completion 24.56
      flat ON_THE_RUN: 211 aimed, INT 5.69, completion 22.75
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.69 against a real 3.25
    gen: INT per attempt 6.33, per aimed throw 7.27; forced-throw share 27.81; completion per attempt 36.36, per aimed throw 41.75; INT-source mix CONTESTED_CATCH 43.64, TIPPED_RECOVERY 56.36
      gen PROGRESSION: 13291 aimed, INT 2.35, completion 45.68
      gen RANK_PUSHED: 3627 aimed, INT 20.76, completion 18.69
      gen CHECKDOWN: 2415 aimed, INT 3.11, completion 36.02
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2674 aimed, INT 16.83, completion 22.48
      gen ON_THE_RUN: 145 aimed, INT 14.48, completion 23.45
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.48 against a real 3.25
    the filed guard against C2 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.92 -> arm 2.98, rise 0.06 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.29 -> arm 0.30, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.28 -> arm 11.47, rise 0.19 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.12 -> arm 0.14, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 7.05 -> arm 7.24, rise 0.20 against an allowed -0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 5.26 -> arm 5.69, rise 0.42 against an allowed 0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.13 -> arm 7.27, rise 0.14 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 2.29 -> arm 2.35, rise 0.06 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.24 -> arm 20.76, rise 0.52 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.13 -> arm 3.11, rise -0.03 against an allowed 0.01: PASSES
    gen DESPERATION: base 16.30 -> arm 16.83, rise 0.52 against an allowed -0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 15.38 -> arm 14.48, rise -0.90 against an allowed 0.02: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C2 (re-played): flat 1860 | gen 1359
```

### A0 (re-played) with D3, seed set 1

```text
ADR-089 step 4: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A0 (re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 1.242 s | gen 1.235 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 7201 of 43837 dropbacks (16.43 per 100); pressuredSacks 7201; pressured dropbacks 38071 (86.85 per 100) [time to throw 1.242 s]
    gen: sacks 4308 of 25758 dropbacks (16.72 per 100); pressuredSacks 4308; pressured dropbacks 21962 (85.26 per 100) [time to throw 1.235 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 18.91% | -3.11 against 22.02% (PR #33, FTN only (held)) | 3.45 against 15.46% (main) [time to throw 1.242 s]
    gen: 19.62% | -2.40 against 22.02% (PR #33, FTN only (held)) | 4.16 against 15.46% (main) [time to throw 1.235 s]
  rows (66, both leagues):
  threat_creation_rate: flat 86.85 % | gen 85.26 %
  hit_or_sack_rate: flat 20.05 % [time to throw 1.242 s] | gen 24.04 % [time to throw 1.235 s]
  sack_rate: flat 16.43 % [time to throw 1.242 s] | gen 16.72 % [time to throw 1.235 s]
  time_to_throw: flat 1.242 seconds | gen 1.235 seconds
  sack_share_of_hit_or_sack: flat 81.94 % [time to throw 1.242 s] | gen 69.57 % [time to throw 1.235 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.242 s] | gen 0.00 % [time to throw 1.235 s]
  release_distribution: flat 1.242 seconds | gen 1.235 seconds
  pressured_share_by_release_bin: flat 83.21 % | gen 81.29 %
  hit_rate_by_release_bin: flat 7.86 % [time to throw 1.242 s] | gen 9.95 % [time to throw 1.235 s]
  hits_on_aimed_throws_per_dropback: flat 3.62 % [time to throw 1.242 s] | gen 7.31 % [time to throw 1.235 s]
  first_pressure_seconds: flat 0.877 seconds | gen 0.883 seconds
  first_forcing_seconds: flat 1.008 seconds | gen 1.015 seconds
  first_arrival_seconds: flat 1.397 seconds | gen 1.485 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 9.41%, FREE_RUNNER 29.03%, WON_REP 61.56%; gen COUNTER 9.77%, FREE_RUNNER 28.35%, WON_REP 61.88%)
  quick_pressure_share_by_origin: flat 99.81 % | gen 99.72 %
  clean_with_live_won_rep_ticks: flat 0.15 % | gen 0.12 %
  clean_with_live_won_rep_dropbacks: flat 0.13 % | gen 0.11 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 5.31 % | gen 2.82 %
  throwaway_rate_clean: flat 6.47 % | gen 3.32 %
  scramble_rate: flat 17.07 % | gen 6.44 %
  scramble_yards: flat 5.07 yards | gen 3.72 yards
  by_down_fixed_calls: flat 19.75 % | gen 18.67 %
  int_per_aimed_throw: flat 2.11 % | gen 6.80 %
  completion_per_aimed_throw: flat 40.32 % | gen 37.84 %
  forced_throw_share: flat 64.34 % | gen 67.98 %
  completion_by_pocket_status: flat 33.99 % | gen 33.02 %
  qb_season_spread: flat 0.00 pp | gen 5.76 pp
  defence_season_spread: flat 0.35 pp | gen 1.36 pp
  unblocked_pressures_per_100: flat 19.34 per 100 dropbacks | gen 18.10 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 7.95 % [time to throw 1.242 s] | gen 7.93 % [time to throw 1.235 s]
  unblocked_men_per_100: flat 19.34 per 100 dropbacks | gen 18.10 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 79.81 % | gen 77.73 %
  quick_share_no_free_runner: flat 99.73 % | gen 99.61 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 5.38 % | gen 2.72 %
  situation_q1q3_last_two: flat 5.20 % | gen 3.28 %
  sack_share_of_contacts_in_out: flat 81.94 % [time to throw 1.242 s] | gen 69.57 % [time to throw 1.235 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.242 s] | gen 0.00 % [time to throw 1.235 s]
  sacker_mix.split.interior: flat 85.04 % [time to throw 1.242 s] | gen 86.90 % [time to throw 1.235 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 9.91 % [time to throw 1.242 s] | gen 8.64 % [time to throw 1.235 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.02 % [time to throw 1.242 s] | gen 4.43 % [time to throw 1.235 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.03 % [time to throw 1.242 s] | gen 0.03 % [time to throw 1.235 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 81.69 % [time to throw 1.242 s] | gen 82.51 % [time to throw 1.235 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.29 % | gen 0.48 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 1.96 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.62 % | gen 18.87 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.24 % | gen 4.71 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.07 % | gen 16.29 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.61 % | gen 17.10 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 41.45 % | gen 43.20 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 14.10 % | gen 15.11 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 35.99 % | gen 33.30 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.14 % | gen 19.43 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 22.54 % | gen 23.99 %
  nobody_open_share: flat 47.94 % of dropbacks | gen 54.44 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 21.13 % of dropbacks | gen 25.79 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 4.93 % of dropbacks | gen 9.03 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 5.46 % of dropbacks | gen 2.90 % of dropbacks
  nobody_open_share.split.SACK: flat 16.43 % of dropbacks [time to throw 1.242 s] | gen 16.72 % of dropbacks [time to throw 1.235 s]
  clean_checkdown_share: flat 7.75 % of clean aimed throws | gen 3.13 % of clean aimed throws
  clean_later_read_share: flat 9.20 % of clean aimed throws | gen 11.85 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.93, per aimed throw 2.11; forced-throw share 64.34; completion per attempt 37.01, per aimed throw 40.32; INT-source mix CONTESTED_CATCH 90.96, TIPPED_RECOVERY 9.04
      flat PROGRESSION: 11599 aimed, INT 0.29, completion 41.45
      flat RANK_PUSHED: 3382 aimed, INT 11.62, completion 14.10
      flat CHECKDOWN: 9261 aimed, INT 0.24, completion 35.99
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2161 aimed, INT 4.07, completion 23.14
      flat ON_THE_RUN: 355 aimed, INT 7.61, completion 22.54
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.61 against a real 3.25
    gen: INT per attempt 6.54, per aimed throw 6.80; forced-throw share 67.98; completion per attempt 36.42, per aimed throw 37.84; INT-source mix CONTESTED_CATCH 49.03, TIPPED_RECOVERY 50.97
      gen PROGRESSION: 7636 aimed, INT 1.96, completion 43.20
      gen RANK_PUSHED: 2019 aimed, INT 18.87, completion 15.11
      gen CHECKDOWN: 6643 aimed, INT 4.71, completion 33.30
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2326 aimed, INT 16.29, completion 19.43
      gen ON_THE_RUN: 421 aimed, INT 17.10, completion 23.99
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.10 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D3 (the contact clauses' arm (AM-7 item 1)): release clock the decision tick ==
  time to throw: flat 1.258 s | gen 1.263 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 6076 of 44104 dropbacks (13.78 per 100); pressuredSacks 6076; pressured dropbacks 38170 (86.55 per 100) [time to throw 1.258 s]
    gen: sacks 3494 of 26290 dropbacks (13.29 per 100); pressuredSacks 3494; pressured dropbacks 22394 (85.18 per 100) [time to throw 1.263 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 15.92% | -6.10 against 22.02% (PR #33, FTN only (held)) | 0.46 against 15.46% (main) [time to throw 1.258 s]
    gen: 15.60% | -6.42 against 22.02% (PR #33, FTN only (held)) | 0.14 against 15.46% (main) [time to throw 1.263 s]
  rows (66, both leagues):
  threat_creation_rate: flat 86.55 % | gen 85.18 %
  hit_or_sack_rate: flat 18.65 % [time to throw 1.258 s] | gen 23.40 % [time to throw 1.263 s]
  sack_rate: flat 13.78 % [time to throw 1.258 s] | gen 13.29 % [time to throw 1.263 s]
  time_to_throw: flat 1.258 seconds | gen 1.263 seconds
  sack_share_of_hit_or_sack: flat 73.85 % [time to throw 1.258 s] | gen 56.79 % [time to throw 1.263 s]
  qb_hit_on_scramble: flat 7.87 % [time to throw 1.258 s] | gen 8.14 % [time to throw 1.263 s]
  release_distribution: flat 1.258 seconds | gen 1.263 seconds
  pressured_share_by_release_bin: flat 83.89 % | gen 85.92 %
  hit_rate_by_release_bin: flat 17.40 % [time to throw 1.258 s] | gen 28.93 % [time to throw 1.263 s]
  hits_on_aimed_throws_per_dropback: flat 4.44 % [time to throw 1.258 s] | gen 9.54 % [time to throw 1.263 s]
  first_pressure_seconds: flat 0.878 seconds | gen 0.882 seconds
  first_forcing_seconds: flat 1.008 seconds | gen 1.015 seconds
  first_arrival_seconds: flat 1.393 seconds | gen 1.484 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 9.47%, FREE_RUNNER 28.76%, WON_REP 61.77%; gen COUNTER 9.61%, FREE_RUNNER 28.16%, WON_REP 62.22%)
  quick_pressure_share_by_origin: flat 99.81 % | gen 99.80 %
  clean_with_live_won_rep_ticks: flat 0.15 % | gen 0.13 %
  clean_with_live_won_rep_dropbacks: flat 0.14 % | gen 0.12 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 5.68 % | gen 3.35 %
  throwaway_rate_clean: flat 6.35 % | gen 3.23 %
  scramble_rate: flat 18.15 % | gen 6.96 %
  scramble_yards: flat 5.20 yards | gen 3.76 yards
  by_down_fixed_calls: flat 15.95 % | gen 16.11 %
  int_per_aimed_throw: flat 2.21 % | gen 6.85 %
  completion_per_aimed_throw: flat 40.42 % | gen 37.36 %
  forced_throw_share: flat 64.35 % | gen 68.24 %
  completion_by_pocket_status: flat 33.82 % | gen 32.20 %
  qb_season_spread: flat 0.00 pp | gen 4.89 pp
  defence_season_spread: flat 0.30 pp | gen 1.31 pp
  unblocked_pressures_per_100: flat 19.24 per 100 dropbacks | gen 18.16 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 8.72 % [time to throw 1.258 s] | gen 7.95 % [time to throw 1.263 s]
  unblocked_men_per_100: flat 19.24 per 100 dropbacks | gen 18.16 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 80.71 % | gen 83.27 %
  quick_share_no_free_runner: flat 99.73 % | gen 99.72 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 5.20 % | gen 2.91 %
  situation_q1q3_last_two: flat 5.63 % | gen 3.76 %
  sack_share_of_contacts_in_out: flat 68.60 % [time to throw 1.258 s] | gen 55.45 % [time to throw 1.263 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.258 s] | gen 0.00 % [time to throw 1.263 s]
  sacker_mix.split.interior: flat 82.25 % [time to throw 1.258 s] | gen 82.88 % [time to throw 1.263 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 12.50 % [time to throw 1.258 s] | gen 12.39 % [time to throw 1.263 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.25 % [time to throw 1.258 s] | gen 4.72 % [time to throw 1.263 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat n/a % [time to throw 1.258 s] | gen 0.01 % [time to throw 1.263 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 76.85 % [time to throw 1.258 s] | gen 75.91 % [time to throw 1.263 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.30 % | gen 0.42 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.08 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.73 % | gen 18.85 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.23 % | gen 4.54 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.12 % | gen 16.04 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 8.13 % | gen 15.99 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 41.14 % | gen 43.00 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 14.85 % | gen 15.99 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 35.78 % | gen 32.45 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.79 % | gen 18.92 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 21.54 % | gen 25.10 %
  nobody_open_share: flat 45.96 % of dropbacks | gen 52.23 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 21.42 % of dropbacks | gen 25.83 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.00 % of dropbacks | gen 9.77 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 5.77 % of dropbacks | gen 3.33 % of dropbacks
  nobody_open_share.split.SACK: flat 13.78 % of dropbacks [time to throw 1.258 s] | gen 13.29 % of dropbacks [time to throw 1.263 s]
  clean_checkdown_share: flat 7.43 % of clean aimed throws | gen 3.24 % of clean aimed throws
  clean_later_read_share: flat 9.97 % of clean aimed throws | gen 12.02 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.02, per aimed throw 2.21; forced-throw share 64.35; completion per attempt 37.00, per aimed throw 40.42; INT-source mix CONTESTED_CATCH 91.09, TIPPED_RECOVERY 8.91
      flat PROGRESSION: 11851 aimed, INT 0.36, completion 41.14
      flat RANK_PUSHED: 3522 aimed, INT 11.73, completion 14.85
      flat CHECKDOWN: 9445 aimed, INT 0.23, completion 35.78
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2207 aimed, INT 4.12, completion 23.79
      flat ON_THE_RUN: 455 aimed, INT 8.13, completion 21.54
      flat on the run: clean INT n/a against a real 2.11; pressured INT 8.13 against a real 3.25
    gen: INT per attempt 6.56, per aimed throw 6.85; forced-throw share 68.24; completion per attempt 35.80, per aimed throw 37.36; INT-source mix CONTESTED_CATCH 49.35, TIPPED_RECOVERY 50.65
      gen PROGRESSION: 8065 aimed, INT 2.08, completion 43.00
      gen RANK_PUSHED: 2170 aimed, INT 18.85, completion 15.99
      gen CHECKDOWN: 6791 aimed, INT 4.54, completion 32.45
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2569 aimed, INT 16.04, completion 18.92
      gen ON_THE_RUN: 494 aimed, INT 15.99, completion 25.10
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.99 against a real 3.25
    the filed guard against A0 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.11 -> arm 2.21, rise 0.10 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.29 -> arm 0.36, rise 0.07 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.62 -> arm 11.73, rise 0.11 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.24 -> arm 0.23, rise -0.00 against an allowed 0.00: PASSES
    flat DESPERATION: base 4.07 -> arm 4.12, rise 0.05 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 7.61 -> arm 8.13, rise 0.53 against an allowed 0.10: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 6.80 -> arm 6.85, rise 0.05 against an allowed 0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 1.96 -> arm 2.08, rise 0.12 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 18.87 -> arm 18.85, rise -0.02 against an allowed 0.03: PASSES
    gen CHECKDOWN: base 4.71 -> arm 4.54, rise -0.18 against an allowed 0.01: PASSES
    gen DESPERATION: base 16.29 -> arm 16.04, rise -0.26 against an allowed 0.03: PASSES
    gen ON_THE_RUN: base 17.10 -> arm 15.99, rise -1.11 against an allowed 0.09: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against A0 (re-played): flat 4574 | gen 3682
```

### A14 (re-played) with D4, seed set 1

```text
ADR-089 step 4: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A14 (re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 2.396 s | gen 2.250 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 12859 of 36904 dropbacks (34.84 per 100); pressuredSacks 12859; pressured dropbacks 35471 (96.12 per 100) [time to throw 2.396 s]
    gen: sacks 9639 of 20874 dropbacks (46.18 per 100); pressuredSacks 9639; pressured dropbacks 20011 (95.87 per 100) [time to throw 2.250 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 36.25% | 14.23 against 22.02% (PR #33, FTN only (held)) | 20.79 against 15.46% (main) [time to throw 2.396 s]
    gen: 48.17% | 26.15 against 22.02% (PR #33, FTN only (held)) | 32.71 against 15.46% (main) [time to throw 2.250 s]
  rows (66, both leagues):
  threat_creation_rate: flat 96.12 % | gen 95.87 %
  hit_or_sack_rate: flat 39.18 % [time to throw 2.396 s] | gen 56.45 % [time to throw 2.250 s]
  sack_rate: flat 34.84 % [time to throw 2.396 s] | gen 46.18 % [time to throw 2.250 s]
  time_to_throw: flat 2.396 seconds | gen 2.250 seconds
  sack_share_of_hit_or_sack: flat 88.93 % [time to throw 2.396 s] | gen 81.80 % [time to throw 2.250 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.396 s] | gen 0.00 % [time to throw 2.250 s]
  release_distribution: flat 2.396 seconds | gen 2.250 seconds
  pressured_share_by_release_bin: flat 93.27 % | gen 94.27 %
  hit_rate_by_release_bin: flat 14.18 % [time to throw 2.396 s] | gen 22.82 % [time to throw 2.250 s]
  hits_on_aimed_throws_per_dropback: flat 4.34 % [time to throw 2.396 s] | gen 10.28 % [time to throw 2.250 s]
  first_pressure_seconds: flat 0.914 seconds | gen 0.916 seconds
  first_forcing_seconds: flat 1.069 seconds | gen 1.066 seconds
  first_arrival_seconds: flat 1.411 seconds | gen 1.498 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 10.92%, FREE_RUNNER 26.00%, WON_REP 63.08%; gen COUNTER 10.79%, FREE_RUNNER 25.48%, WON_REP 63.73%)
  quick_pressure_share_by_origin: flat 99.02 % | gen 99.01 %
  clean_with_live_won_rep_ticks: flat 0.17 % | gen 0.12 %
  clean_with_live_won_rep_dropbacks: flat 0.18 % | gen 0.12 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 6.45 % | gen 4.38 %
  throwaway_rate_clean: flat 15.35 % | gen 9.04 %
  scramble_rate: flat 33.21 % | gen 16.50 %
  scramble_yards: flat 5.30 yards | gen 3.66 yards
  by_down_fixed_calls: flat 37.19 % | gen 45.13 %
  int_per_aimed_throw: flat 2.17 % | gen 6.83 %
  completion_per_aimed_throw: flat 37.95 % | gen 35.25 %
  forced_throw_share: flat 63.25 % | gen 70.01 %
  completion_by_pocket_status: flat 28.41 % | gen 29.35 %
  qb_season_spread: flat 0.00 pp | gen 8.98 pp
  defence_season_spread: flat 0.00 pp | gen 2.23 pp
  unblocked_pressures_per_100: flat 19.10 per 100 dropbacks | gen 18.16 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 9.25 % [time to throw 2.396 s] | gen 9.55 % [time to throw 2.250 s]
  unblocked_men_per_100: flat 19.10 per 100 dropbacks | gen 18.16 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 91.41 % | gen 92.56 %
  quick_share_no_free_runner: flat 98.67 % | gen 98.66 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 6.54 % | gen 4.58 %
  situation_q1q3_last_two: flat 6.44 % | gen 4.80 %
  sack_share_of_contacts_in_out: flat 88.93 % [time to throw 2.396 s] | gen 81.80 % [time to throw 2.250 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.396 s] | gen 0.00 % [time to throw 2.250 s]
  sacker_mix.split.interior: flat 84.42 % [time to throw 2.396 s] | gen 86.94 % [time to throw 2.250 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 9.95 % [time to throw 2.396 s] | gen 8.44 % [time to throw 2.250 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.61 % [time to throw 2.396 s] | gen 4.61 % [time to throw 2.250 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.03 % [time to throw 2.396 s] | gen 0.01 % [time to throw 2.250 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 80.90 % [time to throw 2.396 s] | gen 82.03 % [time to throw 2.250 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.07 % | gen 1.04 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.31 % | gen 1.42 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.61 % | gen 19.55 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.05 % | gen 4.09 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.62 % | gen 18.18 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.41 % | gen 26.88 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 36.94 % | gen 37.72 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 13.20 % | gen 17.31 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 34.60 % | gen 32.94 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 22.97 % | gen 16.84 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.03 % | gen 29.03 %
  nobody_open_share: flat 49.23 % of dropbacks | gen 62.53 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 5.12 % of dropbacks | gen 6.09 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 2.47 % of dropbacks | gen 5.69 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 6.80 % of dropbacks | gen 4.57 % of dropbacks
  nobody_open_share.split.SACK: flat 34.84 % of dropbacks [time to throw 2.396 s] | gen 46.18 % of dropbacks [time to throw 2.250 s]
  clean_checkdown_share: flat 4.04 % of clean aimed throws | gen 3.18 % of clean aimed throws
  clean_later_read_share: flat 20.53 % of clean aimed throws | gen 24.97 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.70, per aimed throw 2.17; forced-throw share 63.25; completion per attempt 29.88, per aimed throw 37.95; INT-source mix CONTESTED_CATCH 92.04, TIPPED_RECOVERY 7.96
      flat PROGRESSION: 5217 aimed, INT 0.31, completion 36.94
      flat RANK_PUSHED: 1189 aimed, INT 11.61, completion 13.20
      flat CHECKDOWN: 1890 aimed, INT 0.05, completion 34.60
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 910 aimed, INT 4.62, completion 22.97
      flat ON_THE_RUN: 74 aimed, INT 5.41, completion 27.03
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.41 against a real 3.25
    gen: INT per attempt 5.99, per aimed throw 6.83; forced-throw share 70.01; completion per attempt 30.94, per aimed throw 35.25; INT-source mix CONTESTED_CATCH 51.61, TIPPED_RECOVERY 48.39
      gen PROGRESSION: 3659 aimed, INT 1.42, completion 37.72
      gen RANK_PUSHED: 624 aimed, INT 19.55, completion 17.31
      gen CHECKDOWN: 1272 aimed, INT 4.09, completion 32.94
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 1188 aimed, INT 18.18, completion 16.84
      gen ON_THE_RUN: 93 aimed, INT 26.88, completion 29.03
      gen on the run: clean INT n/a against a real 2.11; pressured INT 26.88 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D4 (printed beside the contact clauses (AM-7 item 1's other reading)): release clock the decision tick ==
  time to throw: flat 2.372 s | gen 2.219 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 10702 of 37422 dropbacks (28.60 per 100); pressuredSacks 10702; pressured dropbacks 35965 (96.11 per 100) [time to throw 2.372 s]
    gen: sacks 7890 of 21896 dropbacks (36.03 per 100); pressuredSacks 7890; pressured dropbacks 20993 (95.88 per 100) [time to throw 2.219 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 29.76% | 7.74 against 22.02% (PR #33, FTN only (held)) | 14.30 against 15.46% (main) [time to throw 2.372 s]
    gen: 37.58% | 15.56 against 22.02% (PR #33, FTN only (held)) | 22.12 against 15.46% (main) [time to throw 2.219 s]
  rows (66, both leagues):
  threat_creation_rate: flat 96.11 % | gen 95.88 %
  hit_or_sack_rate: flat 35.66 % [time to throw 2.372 s] | gen 54.42 % [time to throw 2.219 s]
  sack_rate: flat 28.60 % [time to throw 2.372 s] | gen 36.03 % [time to throw 2.219 s]
  time_to_throw: flat 2.372 seconds | gen 2.219 seconds
  sack_share_of_hit_or_sack: flat 80.20 % [time to throw 2.372 s] | gen 66.21 % [time to throw 2.219 s]
  qb_hit_on_scramble: flat 9.44 % [time to throw 2.372 s] | gen 12.53 % [time to throw 2.219 s]
  release_distribution: flat 2.372 seconds | gen 2.219 seconds
  pressured_share_by_release_bin: flat 95.10 % | gen 96.52 %
  hit_rate_by_release_bin: flat 29.14 % [time to throw 2.372 s] | gen 54.26 % [time to throw 2.219 s]
  hits_on_aimed_throws_per_dropback: flat 6.17 % [time to throw 2.372 s] | gen 16.65 % [time to throw 2.219 s]
  first_pressure_seconds: flat 0.915 seconds | gen 0.916 seconds
  first_forcing_seconds: flat 1.066 seconds | gen 1.063 seconds
  first_arrival_seconds: flat 1.414 seconds | gen 1.496 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 10.94%, FREE_RUNNER 25.93%, WON_REP 63.13%; gen COUNTER 10.61%, FREE_RUNNER 25.59%, WON_REP 63.80%)
  quick_pressure_share_by_origin: flat 99.02 % | gen 98.98 %
  clean_with_live_won_rep_ticks: flat 0.17 % | gen 0.10 %
  clean_with_live_won_rep_dropbacks: flat 0.18 % | gen 0.10 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 7.44 % | gen 6.11 %
  throwaway_rate_clean: flat 14.34 % | gen 8.53 %
  scramble_rate: flat 36.82 % | gen 18.63 %
  scramble_yards: flat 5.15 yards | gen 3.53 yards
  by_down_fixed_calls: flat 29.03 % | gen 36.58 %
  int_per_aimed_throw: flat 2.23 % | gen 6.92 %
  completion_per_aimed_throw: flat 37.35 % | gen 33.41 %
  forced_throw_share: flat 64.90 % | gen 74.29 %
  completion_by_pocket_status: flat 27.45 % | gen 27.69 %
  qb_season_spread: flat 0.00 pp | gen 7.07 pp
  defence_season_spread: flat 0.00 pp | gen 2.10 pp
  unblocked_pressures_per_100: flat 19.07 per 100 dropbacks | gen 18.32 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 10.18 % [time to throw 2.372 s] | gen 10.37 % [time to throw 2.219 s]
  unblocked_men_per_100: flat 19.07 per 100 dropbacks | gen 18.32 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 93.70 % | gen 95.55 %
  quick_share_no_free_runner: flat 98.67 % | gen 98.61 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 7.16 % | gen 6.96 %
  situation_q1q3_last_two: flat 7.26 % | gen 6.11 %
  sack_share_of_contacts_in_out: flat 73.07 % [time to throw 2.372 s] | gen 63.49 % [time to throw 2.219 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.372 s] | gen 0.00 % [time to throw 2.219 s]
  sacker_mix.split.interior: flat 81.82 % [time to throw 2.372 s] | gen 82.90 % [time to throw 2.219 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 12.44 % [time to throw 2.372 s] | gen 12.04 % [time to throw 2.219 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.69 % [time to throw 2.372 s] | gen 5.04 % [time to throw 2.219 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.05 % [time to throw 2.372 s] | gen 0.02 % [time to throw 2.219 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 76.10 % [time to throw 2.372 s] | gen 74.65 % [time to throw 2.219 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.05 % | gen 1.01 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 1.75 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 10.92 % | gen 20.34 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.00 % | gen 4.26 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.97 % | gen 16.36 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 12.40 % | gen 19.49 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 36.68 % | gen 35.83 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 11.98 % | gen 14.47 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 32.86 % | gen 30.78 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 22.28 % | gen 16.97 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 30.23 % | gen 24.62 %
  nobody_open_share: flat 44.77 % of dropbacks | gen 58.46 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 5.88 % of dropbacks | gen 9.54 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 2.58 % of dropbacks | gen 6.67 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 7.71 % of dropbacks | gen 6.21 % of dropbacks
  nobody_open_share.split.SACK: flat 28.60 % of dropbacks [time to throw 2.372 s] | gen 36.03 % of dropbacks [time to throw 2.219 s]
  clean_checkdown_share: flat 4.25 % of clean aimed throws | gen 3.27 % of clean aimed throws
  clean_later_read_share: flat 21.55 % of clean aimed throws | gen 25.18 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.73, per aimed throw 2.23; forced-throw share 64.90; completion per attempt 29.02, per aimed throw 37.35; INT-source mix CONTESTED_CATCH 92.41, TIPPED_RECOVERY 7.59
      flat PROGRESSION: 5442 aimed, INT 0.29, completion 36.68
      flat RANK_PUSHED: 1319 aimed, INT 10.92, completion 11.98
      flat CHECKDOWN: 2200 aimed, INT 0.00, completion 32.86
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 965 aimed, INT 4.97, completion 22.28
      flat ON_THE_RUN: 129 aimed, INT 12.40, completion 30.23
      flat on the run: clean INT n/a against a real 2.11; pressured INT 12.40 against a real 3.25
    gen: INT per attempt 5.97, per aimed throw 6.92; forced-throw share 74.29; completion per attempt 28.83, per aimed throw 33.41; INT-source mix CONTESTED_CATCH 50.42, TIPPED_RECOVERY 49.58
      gen PROGRESSION: 4055 aimed, INT 1.75, completion 35.83
      gen RANK_PUSHED: 767 aimed, INT 20.34, completion 14.47
      gen CHECKDOWN: 2089 aimed, INT 4.26, completion 30.78
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 1461 aimed, INT 16.36, completion 16.97
      gen ON_THE_RUN: 195 aimed, INT 19.49, completion 24.62
      gen on the run: clean INT n/a against a real 2.11; pressured INT 19.49 against a real 3.25
    the filed guard against A14 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.17 -> arm 2.23, rise 0.06 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.31 -> arm 0.29, rise -0.01 against an allowed -0.01: PASSES
    flat RANK_PUSHED: base 11.61 -> arm 10.92, rise -0.69 against an allowed -0.06: PASSES
    flat CHECKDOWN: base 0.05 -> arm 0.00, rise -0.05 against an allowed -0.06: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 4.62 -> arm 4.97, rise 0.36 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 5.41 -> arm 12.40, rise 7.00 against an allowed -0.07: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 6.83 -> arm 6.92, rise 0.09 against an allowed -0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 1.42 -> arm 1.75, rise 0.33 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 19.55 -> arm 20.34, rise 0.79 against an allowed -0.12: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 4.09 -> arm 4.26, rise 0.17 against an allowed -0.18: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 18.18 -> arm 16.36, rise -1.82 against an allowed -0.02: PASSES
    gen ON_THE_RUN: base 26.88 -> arm 19.49, rise -7.39 against an allowed 0.01: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against A14 (re-played): flat 8666 | gen 8865
```

### D8 (printed, the tilts' base) with D9, D10, D11, seed set 1

```text
ADR-089 step 4: the pocket report (4 arms; both leagues; every hit and sack figure with its time to throw beside it)

== D8 (printed, the tilts' base) (the base arm): release clock the decision tick ==
  time to throw: flat 2.731 s | gen 2.688 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2103 of 49379 dropbacks (4.26 per 100); pressuredSacks 2103; pressured dropbacks 20338 (41.19 per 100) [time to throw 2.731 s]
    gen: sacks 1105 of 27367 dropbacks (4.04 per 100); pressuredSacks 1091; pressured dropbacks 11269 (41.18 per 100) [time to throw 2.688 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.34% | -11.68 against 22.02% (PR #33, FTN only (held)) | -5.12 against 15.46% (main) [time to throw 2.731 s]
    gen: 9.68% | -12.34 against 22.02% (PR #33, FTN only (held)) | -5.78 against 15.46% (main) [time to throw 2.688 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.19 % | gen 41.18 %
  hit_or_sack_rate: flat 8.10 % [time to throw 2.731 s] | gen 10.08 % [time to throw 2.688 s]
  sack_rate: flat 4.26 % [time to throw 2.731 s] | gen 4.04 % [time to throw 2.688 s]
  time_to_throw: flat 2.731 seconds | gen 2.688 seconds
  sack_share_of_hit_or_sack: flat 52.55 % [time to throw 2.731 s] | gen 40.05 % [time to throw 2.688 s]
  qb_hit_on_scramble: flat 4.08 % [time to throw 2.731 s] | gen 5.43 % [time to throw 2.688 s]
  release_distribution: flat 2.731 seconds | gen 2.688 seconds
  pressured_share_by_release_bin: flat 44.55 % | gen 50.55 %
  hit_rate_by_release_bin: flat 16.17 % [time to throw 2.731 s] | gen 22.63 % [time to throw 2.688 s]
  hits_on_aimed_throws_per_dropback: flat 2.63 % [time to throw 2.731 s] | gen 4.49 % [time to throw 2.688 s]
  first_pressure_seconds: flat 1.967 seconds | gen 2.032 seconds
  first_forcing_seconds: flat 2.214 seconds | gen 2.281 seconds
  first_arrival_seconds: flat 1.991 seconds | gen 2.039 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.26%, FREE_RUNNER 51.56%, WON_REP 43.19%; gen COUNTER 5.52%, FREE_RUNNER 49.71%, WON_REP 44.77%)
  quick_pressure_share_by_origin: flat 62.25 % | gen 60.69 %
  clean_with_live_won_rep_ticks: flat 0.82 % | gen 0.77 %
  clean_with_live_won_rep_dropbacks: flat 3.61 % | gen 3.40 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.20 % | gen 18.97 %
  throwaway_rate_clean: flat 14.43 % | gen 7.11 %
  scramble_rate: flat 6.60 % | gen 3.03 %
  scramble_yards: flat 6.53 yards | gen 4.74 yards
  by_down_fixed_calls: flat 11.18 % | gen 9.50 %
  int_per_aimed_throw: flat 2.98 % | gen 7.27 %
  completion_per_aimed_throw: flat 43.04 % | gen 41.75 %
  forced_throw_share: flat 24.09 % | gen 27.81 %
  completion_by_pocket_status: flat 23.25 % | gen 24.16 %
  qb_season_spread: flat 0.65 pp | gen 1.77 pp
  defence_season_spread: flat 0.37 pp | gen 0.59 pp
  unblocked_pressures_per_100: flat 19.18 per 100 dropbacks | gen 18.11 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 75.01 % [time to throw 2.731 s] | gen 70.75 % [time to throw 2.688 s]
  unblocked_men_per_100: flat 19.23 per 100 dropbacks | gen 18.14 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.13 % | gen 26.48 %
  quick_share_no_free_runner: flat 37.50 % | gen 36.50 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 20.86 % | gen 19.42 %
  situation_q1q3_last_two: flat 22.14 % | gen 18.10 %
  sack_share_of_contacts_in_out: flat 50.76 % [time to throw 2.731 s] | gen 39.34 % [time to throw 2.688 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.731 s] | gen 1.27 % [time to throw 2.688 s]
  sacker_mix.split.interior: flat 32.70 % [time to throw 2.731 s] | gen 33.13 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 41.85 % [time to throw 2.731 s] | gen 45.14 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.77 % [time to throw 2.731 s] | gen 21.51 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.69 % [time to throw 2.731 s] | gen 0.22 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.84 % [time to throw 2.731 s] | gen 32.96 % [time to throw 2.688 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.25 % | gen 6.33 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 2.35 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.47 % | gen 20.76 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.14 % | gen 3.11 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 7.24 % | gen 16.83 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.69 % | gen 14.48 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.07 % | gen 45.68 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.60 % | gen 18.69 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.75 % | gen 36.02 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.56 % | gen 22.48 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 22.75 % | gen 23.45 %
  nobody_open_share: flat 36.45 % of dropbacks | gen 34.63 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.54 % of dropbacks | gen 8.82 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.01 % of dropbacks | gen 9.77 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.63 % of dropbacks | gen 11.99 % of dropbacks
  nobody_open_share.split.SACK: flat 4.26 % of dropbacks [time to throw 2.731 s] | gen 4.04 % of dropbacks [time to throw 2.688 s]
  clean_checkdown_share: flat 5.38 % of clean aimed throws | gen 2.92 % of clean aimed throws
  clean_later_read_share: flat 22.07 % of clean aimed throws | gen 26.62 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.39, per aimed throw 2.98; forced-throw share 24.09; completion per attempt 34.52, per aimed throw 43.04; INT-source mix CONTESTED_CATCH 90.39, TIPPED_RECOVERY 9.61
      flat PROGRESSION: 21326 aimed, INT 0.30, completion 43.07
      flat RANK_PUSHED: 6585 aimed, INT 11.47, completion 17.60
      flat CHECKDOWN: 4219 aimed, INT 0.14, completion 38.75
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2968 aimed, INT 7.24, completion 24.56
      flat ON_THE_RUN: 211 aimed, INT 5.69, completion 22.75
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.69 against a real 3.25
    gen: INT per attempt 6.33, per aimed throw 7.27; forced-throw share 27.81; completion per attempt 36.36, per aimed throw 41.75; INT-source mix CONTESTED_CATCH 43.64, TIPPED_RECOVERY 56.36
      gen PROGRESSION: 13291 aimed, INT 2.35, completion 45.68
      gen RANK_PUSHED: 3627 aimed, INT 20.76, completion 18.69
      gen CHECKDOWN: 2415 aimed, INT 3.11, completion 36.02
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2674 aimed, INT 16.83, completion 22.48
      gen ON_THE_RUN: 145 aimed, INT 14.48, completion 23.45
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.48 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D9 (the PUSH or BLOCKED tilt alone (AM-7 item 5)): release clock the decision tick ==
  time to throw: flat 2.731 s | gen 2.688 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2101 of 49396 dropbacks (4.25 per 100); pressuredSacks 2101; pressured dropbacks 20342 (41.18 per 100) [time to throw 2.731 s]
    gen: sacks 1100 of 27358 dropbacks (4.02 per 100); pressuredSacks 1086; pressured dropbacks 11266 (41.18 per 100) [time to throw 2.688 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.33% | -11.69 against 22.02% (PR #33, FTN only (held)) | -5.13 against 15.46% (main) [time to throw 2.731 s]
    gen: 9.64% | -12.38 against 22.02% (PR #33, FTN only (held)) | -5.82 against 15.46% (main) [time to throw 2.688 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.18 % | gen 41.18 %
  hit_or_sack_rate: flat 8.13 % [time to throw 2.731 s] | gen 10.08 % [time to throw 2.688 s]
  sack_rate: flat 4.25 % [time to throw 2.731 s] | gen 4.02 % [time to throw 2.688 s]
  time_to_throw: flat 2.731 seconds | gen 2.688 seconds
  sack_share_of_hit_or_sack: flat 52.29 % [time to throw 2.731 s] | gen 39.87 % [time to throw 2.688 s]
  qb_hit_on_scramble: flat 4.09 % [time to throw 2.731 s] | gen 5.42 % [time to throw 2.688 s]
  release_distribution: flat 2.731 seconds | gen 2.688 seconds
  pressured_share_by_release_bin: flat 44.65 % | gen 50.57 %
  hit_rate_by_release_bin: flat 16.26 % [time to throw 2.731 s] | gen 22.70 % [time to throw 2.688 s]
  hits_on_aimed_throws_per_dropback: flat 2.64 % [time to throw 2.731 s] | gen 4.51 % [time to throw 2.688 s]
  first_pressure_seconds: flat 1.967 seconds | gen 2.031 seconds
  first_forcing_seconds: flat 2.213 seconds | gen 2.281 seconds
  first_arrival_seconds: flat 1.992 seconds | gen 2.040 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.24%, FREE_RUNNER 51.55%, WON_REP 43.21%; gen COUNTER 5.51%, FREE_RUNNER 49.77%, WON_REP 44.71%)
  quick_pressure_share_by_origin: flat 62.28 % | gen 60.73 %
  clean_with_live_won_rep_ticks: flat 0.82 % | gen 0.77 %
  clean_with_live_won_rep_dropbacks: flat 3.61 % | gen 3.40 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.25 % | gen 18.95 %
  throwaway_rate_clean: flat 14.43 % | gen 7.08 %
  scramble_rate: flat 6.58 % | gen 3.03 %
  scramble_yards: flat 6.57 yards | gen 4.73 yards
  by_down_fixed_calls: flat 11.19 % | gen 9.56 %
  int_per_aimed_throw: flat 2.98 % | gen 7.29 %
  completion_per_aimed_throw: flat 43.02 % | gen 41.77 %
  forced_throw_share: flat 24.07 % | gen 27.84 %
  completion_by_pocket_status: flat 23.25 % | gen 24.22 %
  qb_season_spread: flat 0.62 pp | gen 1.79 pp
  defence_season_spread: flat 0.34 pp | gen 0.57 pp
  unblocked_pressures_per_100: flat 19.20 per 100 dropbacks | gen 18.13 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 75.04 % [time to throw 2.731 s] | gen 70.82 % [time to throw 2.688 s]
  unblocked_men_per_100: flat 19.25 per 100 dropbacks | gen 18.17 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.18 % | gen 26.52 %
  quick_share_no_free_runner: flat 37.49 % | gen 36.58 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 20.95 % | gen 19.24 %
  situation_q1q3_last_two: flat 22.22 % | gen 18.12 %
  sack_share_of_contacts_in_out: flat 50.52 % [time to throw 2.731 s] | gen 39.16 % [time to throw 2.688 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.731 s] | gen 1.27 % [time to throw 2.688 s]
  sacker_mix.split.interior: flat 32.32 % [time to throw 2.731 s] | gen 32.78 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 42.20 % [time to throw 2.731 s] | gen 45.49 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.79 % [time to throw 2.731 s] | gen 21.52 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.69 % [time to throw 2.731 s] | gen 0.22 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.44 % [time to throw 2.731 s] | gen 32.65 % [time to throw 2.688 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.24 % | gen 6.36 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 2.35 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.45 % | gen 20.78 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.14 % | gen 3.10 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 7.25 % | gen 16.91 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.69 % | gen 14.48 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.04 % | gen 45.69 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.61 % | gen 18.80 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.74 % | gen 36.07 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.56 % | gen 22.43 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 22.75 % | gen 23.45 %
  nobody_open_share: flat 36.45 % of dropbacks | gen 34.63 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.54 % of dropbacks | gen 8.85 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.00 % of dropbacks | gen 9.79 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.65 % of dropbacks | gen 11.97 % of dropbacks
  nobody_open_share.split.SACK: flat 4.25 % of dropbacks [time to throw 2.731 s] | gen 4.02 % of dropbacks [time to throw 2.688 s]
  clean_checkdown_share: flat 5.37 % of clean aimed throws | gen 2.93 % of clean aimed throws
  clean_later_read_share: flat 22.09 % of clean aimed throws | gen 26.67 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.39, per aimed throw 2.98; forced-throw share 24.07; completion per attempt 34.50, per aimed throw 43.02; INT-source mix CONTESTED_CATCH 90.30, TIPPED_RECOVERY 9.70
      flat PROGRESSION: 21337 aimed, INT 0.30, completion 43.04
      flat RANK_PUSHED: 6593 aimed, INT 11.45, completion 17.61
      flat CHECKDOWN: 4218 aimed, INT 0.14, completion 38.74
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2964 aimed, INT 7.25, completion 24.56
      flat ON_THE_RUN: 211 aimed, INT 5.69, completion 22.75
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.69 against a real 3.25
    gen: INT per attempt 6.35, per aimed throw 7.29; forced-throw share 27.84; completion per attempt 36.39, per aimed throw 41.77; INT-source mix CONTESTED_CATCH 43.65, TIPPED_RECOVERY 56.35
      gen PROGRESSION: 13282 aimed, INT 2.35, completion 45.69
      gen RANK_PUSHED: 3628 aimed, INT 20.78, completion 18.80
      gen CHECKDOWN: 2420 aimed, INT 3.10, completion 36.07
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2679 aimed, INT 16.91, completion 22.43
      gen ON_THE_RUN: 145 aimed, INT 14.48, completion 23.45
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.48 against a real 3.25
    the filed guard against D8 (printed, the tilts' base) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.98 -> arm 2.98, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.30 -> arm 0.30, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.47 -> arm 11.45, rise -0.01 against an allowed 0.00: PASSES
    flat CHECKDOWN: base 0.14 -> arm 0.14, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 7.24 -> arm 7.25, rise 0.01 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 5.69 -> arm 5.69, rise 0.00 against an allowed 0.00: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.27 -> arm 7.29, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 2.35 -> arm 2.35, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.76 -> arm 20.78, rise 0.02 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.11 -> arm 3.10, rise -0.01 against an allowed 0.00: PASSES
    gen DESPERATION: base 16.83 -> arm 16.91, rise 0.08 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 14.48 -> arm 14.48, rise 0.00 against an allowed 0.00: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D8 (printed, the tilts' base): flat 0 | gen 0

== D10 (the free-run tilt alone (AM-7 items 5 and 6)): release clock the decision tick ==
  time to throw: flat 2.730 s | gen 2.692 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2226 of 49266 dropbacks (4.52 per 100); pressuredSacks 2226; pressured dropbacks 20323 (41.25 per 100) [time to throw 2.730 s]
    gen: sacks 1172 of 27309 dropbacks (4.29 per 100); pressuredSacks 1159; pressured dropbacks 11230 (41.12 per 100) [time to throw 2.692 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.95% | -11.07 against 22.02% (PR #33, FTN only (held)) | -4.51 against 15.46% (main) [time to throw 2.730 s]
    gen: 10.32% | -11.70 against 22.02% (PR #33, FTN only (held)) | -5.14 against 15.46% (main) [time to throw 2.692 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.25 % | gen 41.12 %
  hit_or_sack_rate: flat 8.17 % [time to throw 2.730 s] | gen 10.12 % [time to throw 2.692 s]
  sack_rate: flat 4.52 % [time to throw 2.730 s] | gen 4.29 % [time to throw 2.692 s]
  time_to_throw: flat 2.730 seconds | gen 2.692 seconds
  sack_share_of_hit_or_sack: flat 55.29 % [time to throw 2.730 s] | gen 42.40 % [time to throw 2.692 s]
  qb_hit_on_scramble: flat 3.50 % [time to throw 2.730 s] | gen 5.07 % [time to throw 2.692 s]
  release_distribution: flat 2.730 seconds | gen 2.692 seconds
  pressured_share_by_release_bin: flat 44.24 % | gen 50.07 %
  hit_rate_by_release_bin: flat 16.15 % [time to throw 2.730 s] | gen 22.59 % [time to throw 2.692 s]
  hits_on_aimed_throws_per_dropback: flat 2.60 % [time to throw 2.730 s] | gen 4.48 % [time to throw 2.692 s]
  first_pressure_seconds: flat 1.967 seconds | gen 2.033 seconds
  first_forcing_seconds: flat 2.214 seconds | gen 2.279 seconds
  first_arrival_seconds: flat 1.989 seconds | gen 2.038 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.28%, FREE_RUNNER 51.56%, WON_REP 43.15%; gen COUNTER 5.50%, FREE_RUNNER 49.45%, WON_REP 45.06%)
  quick_pressure_share_by_origin: flat 62.28 % | gen 60.69 %
  clean_with_live_won_rep_ticks: flat 0.82 % | gen 0.77 %
  clean_with_live_won_rep_dropbacks: flat 3.60 % | gen 3.43 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 21.80 % | gen 18.24 %
  throwaway_rate_clean: flat 14.47 % | gen 7.17 %
  scramble_rate: flat 6.56 % | gen 3.03 %
  scramble_yards: flat 6.45 yards | gen 4.94 yards
  by_down_fixed_calls: flat 12.31 % | gen 10.66 %
  int_per_aimed_throw: flat 2.96 % | gen 7.31 %
  completion_per_aimed_throw: flat 42.99 % | gen 41.76 %
  forced_throw_share: flat 24.20 % | gen 27.72 %
  completion_by_pocket_status: flat 23.20 % | gen 24.49 %
  qb_season_spread: flat 0.70 pp | gen 2.03 pp
  defence_season_spread: flat 0.44 pp | gen 0.64 pp
  unblocked_pressures_per_100: flat 19.18 per 100 dropbacks | gen 18.01 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 75.24 % [time to throw 2.730 s] | gen 70.15 % [time to throw 2.692 s]
  unblocked_men_per_100: flat 19.23 per 100 dropbacks | gen 18.04 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.08 % | gen 26.55 %
  quick_share_no_free_runner: flat 37.50 % | gen 36.85 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 20.02 % | gen 18.10 %
  situation_q1q3_last_two: flat 21.63 % | gen 17.00 %
  sack_share_of_contacts_in_out: flat 53.66 % [time to throw 2.730 s] | gen 41.68 % [time to throw 2.692 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.730 s] | gen 1.11 % [time to throw 2.692 s]
  sacker_mix.split.interior: flat 32.26 % [time to throw 2.730 s] | gen 32.58 % [time to throw 2.692 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 42.67 % [time to throw 2.730 s] | gen 45.99 % [time to throw 2.692 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.46 % [time to throw 2.730 s] | gen 21.15 % [time to throw 2.692 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.61 % [time to throw 2.730 s] | gen 0.29 % [time to throw 2.692 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.42 % [time to throw 2.730 s] | gen 32.46 % [time to throw 2.692 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.26 % | gen 6.32 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 2.30 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.28 % | gen 21.05 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.15 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 7.39 % | gen 16.82 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.50 % | gen 14.29 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.12 % | gen 45.66 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.79 % | gen 18.70 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.45 % | gen 36.24 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.49 % | gen 22.81 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.00 % | gen 23.13 %
  nobody_open_share: flat 36.61 % of dropbacks | gen 34.69 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.55 % of dropbacks | gen 8.83 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.04 % of dropbacks | gen 9.84 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.49 % of dropbacks | gen 11.72 % of dropbacks
  nobody_open_share.split.SACK: flat 4.52 % of dropbacks [time to throw 2.730 s] | gen 4.29 % of dropbacks [time to throw 2.692 s]
  clean_checkdown_share: flat 5.35 % of clean aimed throws | gen 2.91 % of clean aimed throws
  clean_later_read_share: flat 22.12 % of clean aimed throws | gen 26.71 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.38, per aimed throw 2.96; forced-throw share 24.20; completion per attempt 34.53, per aimed throw 42.99; INT-source mix CONTESTED_CATCH 90.39, TIPPED_RECOVERY 9.61
      flat PROGRESSION: 21223 aimed, INT 0.29, completion 43.12
      flat RANK_PUSHED: 6576 aimed, INT 11.28, completion 17.79
      flat CHECKDOWN: 4213 aimed, INT 0.17, completion 38.45
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2977 aimed, INT 7.39, completion 24.49
      flat ON_THE_RUN: 200 aimed, INT 5.50, completion 24.00
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.50 against a real 3.25
    gen: INT per attempt 6.38, per aimed throw 7.31; forced-throw share 27.72; completion per attempt 36.48, per aimed throw 41.76; INT-source mix CONTESTED_CATCH 44.15, TIPPED_RECOVERY 55.85
      gen PROGRESSION: 13246 aimed, INT 2.30, completion 45.66
      gen RANK_PUSHED: 3615 aimed, INT 21.05, completion 18.70
      gen CHECKDOWN: 2412 aimed, INT 3.15, completion 36.24
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2688 aimed, INT 16.82, completion 22.81
      gen ON_THE_RUN: 147 aimed, INT 14.29, completion 23.13
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.29 against a real 3.25
    the filed guard against D8 (printed, the tilts' base) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.98 -> arm 2.96, rise -0.02 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.30 -> arm 0.29, rise -0.01 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.47 -> arm 11.28, rise -0.18 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.14 -> arm 0.17, rise 0.02 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 7.24 -> arm 7.39, rise 0.15 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 5.69 -> arm 5.50, rise -0.19 against an allowed -0.01: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.27 -> arm 7.31, rise 0.03 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 2.35 -> arm 2.30, rise -0.04 against an allowed 0.01: PASSES
    gen RANK_PUSHED: base 20.76 -> arm 21.05, rise 0.29 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.11 -> arm 3.15, rise 0.05 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 16.83 -> arm 16.82, rise -0.01 against an allowed -0.00: PASSES
    gen ON_THE_RUN: base 14.48 -> arm 14.29, rise -0.20 against an allowed -0.01: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D8 (printed, the tilts' base): flat 0 | gen 0

== D11 (the BEHIND or NEVER tilt alone (AM-7 item 5)): release clock the decision tick ==
  time to throw: flat 2.731 s | gen 2.688 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2103 of 49380 dropbacks (4.26 per 100); pressuredSacks 2103; pressured dropbacks 20337 (41.18 per 100) [time to throw 2.731 s]
    gen: sacks 1105 of 27367 dropbacks (4.04 per 100); pressuredSacks 1091; pressured dropbacks 11269 (41.18 per 100) [time to throw 2.688 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.34% | -11.68 against 22.02% (PR #33, FTN only (held)) | -5.12 against 15.46% (main) [time to throw 2.731 s]
    gen: 9.68% | -12.34 against 22.02% (PR #33, FTN only (held)) | -5.78 against 15.46% (main) [time to throw 2.688 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.18 % | gen 41.18 %
  hit_or_sack_rate: flat 8.10 % [time to throw 2.731 s] | gen 10.08 % [time to throw 2.688 s]
  sack_rate: flat 4.26 % [time to throw 2.731 s] | gen 4.04 % [time to throw 2.688 s]
  time_to_throw: flat 2.731 seconds | gen 2.688 seconds
  sack_share_of_hit_or_sack: flat 52.58 % [time to throw 2.731 s] | gen 40.05 % [time to throw 2.688 s]
  qb_hit_on_scramble: flat 4.08 % [time to throw 2.731 s] | gen 5.43 % [time to throw 2.688 s]
  release_distribution: flat 2.731 seconds | gen 2.688 seconds
  pressured_share_by_release_bin: flat 44.55 % | gen 50.55 %
  hit_rate_by_release_bin: flat 16.18 % [time to throw 2.731 s] | gen 22.63 % [time to throw 2.688 s]
  hits_on_aimed_throws_per_dropback: flat 2.63 % [time to throw 2.731 s] | gen 4.49 % [time to throw 2.688 s]
  first_pressure_seconds: flat 1.967 seconds | gen 2.032 seconds
  first_forcing_seconds: flat 2.214 seconds | gen 2.281 seconds
  first_arrival_seconds: flat 1.991 seconds | gen 2.039 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.25%, FREE_RUNNER 51.56%, WON_REP 43.20%; gen COUNTER 5.52%, FREE_RUNNER 49.71%, WON_REP 44.77%)
  quick_pressure_share_by_origin: flat 62.26 % | gen 60.69 %
  clean_with_live_won_rep_ticks: flat 0.82 % | gen 0.77 %
  clean_with_live_won_rep_dropbacks: flat 3.61 % | gen 3.40 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.20 % | gen 18.97 %
  throwaway_rate_clean: flat 14.44 % | gen 7.11 %
  scramble_rate: flat 6.60 % | gen 3.03 %
  scramble_yards: flat 6.53 yards | gen 4.74 yards
  by_down_fixed_calls: flat 11.14 % | gen 9.50 %
  int_per_aimed_throw: flat 2.97 % | gen 7.27 %
  completion_per_aimed_throw: flat 43.02 % | gen 41.75 %
  forced_throw_share: flat 24.09 % | gen 27.81 %
  completion_by_pocket_status: flat 23.25 % | gen 24.16 %
  qb_season_spread: flat 0.64 pp | gen 1.77 pp
  defence_season_spread: flat 0.33 pp | gen 0.59 pp
  unblocked_pressures_per_100: flat 19.17 per 100 dropbacks | gen 18.11 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 74.98 % [time to throw 2.731 s] | gen 70.75 % [time to throw 2.688 s]
  unblocked_men_per_100: flat 19.22 per 100 dropbacks | gen 18.14 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.14 % | gen 26.48 %
  quick_share_no_free_runner: flat 37.51 % | gen 36.50 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 20.88 % | gen 19.42 %
  situation_q1q3_last_two: flat 22.13 % | gen 18.10 %
  sack_share_of_contacts_in_out: flat 50.79 % [time to throw 2.731 s] | gen 39.34 % [time to throw 2.688 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.731 s] | gen 1.27 % [time to throw 2.688 s]
  sacker_mix.split.interior: flat 32.70 % [time to throw 2.731 s] | gen 33.13 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 41.96 % [time to throw 2.731 s] | gen 45.14 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.65 % [time to throw 2.731 s] | gen 21.51 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.69 % [time to throw 2.731 s] | gen 0.22 % [time to throw 2.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.84 % [time to throw 2.731 s] | gen 32.96 % [time to throw 2.688 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.25 % | gen 6.33 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 2.35 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.47 % | gen 20.76 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.14 % | gen 3.11 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 7.21 % | gen 16.83 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.63 % | gen 14.48 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.05 % | gen 45.68 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.62 % | gen 18.69 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.72 % | gen 36.02 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.60 % | gen 22.48 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 22.54 % | gen 23.45 %
  nobody_open_share: flat 36.44 % of dropbacks | gen 34.63 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.54 % of dropbacks | gen 8.82 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.01 % of dropbacks | gen 9.77 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.63 % of dropbacks | gen 11.99 % of dropbacks
  nobody_open_share.split.SACK: flat 4.26 % of dropbacks [time to throw 2.731 s] | gen 4.04 % of dropbacks [time to throw 2.688 s]
  clean_checkdown_share: flat 5.37 % of clean aimed throws | gen 2.92 % of clean aimed throws
  clean_later_read_share: flat 22.05 % of clean aimed throws | gen 26.62 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.39, per aimed throw 2.97; forced-throw share 24.09; completion per attempt 34.51, per aimed throw 43.02; INT-source mix CONTESTED_CATCH 90.38, TIPPED_RECOVERY 9.62
      flat PROGRESSION: 21328 aimed, INT 0.30, completion 43.05
      flat RANK_PUSHED: 6584 aimed, INT 11.47, completion 17.62
      flat CHECKDOWN: 4217 aimed, INT 0.14, completion 38.72
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2968 aimed, INT 7.21, completion 24.60
      flat ON_THE_RUN: 213 aimed, INT 5.63, completion 22.54
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.63 against a real 3.25
    gen: INT per attempt 6.33, per aimed throw 7.27; forced-throw share 27.81; completion per attempt 36.36, per aimed throw 41.75; INT-source mix CONTESTED_CATCH 43.64, TIPPED_RECOVERY 56.36
      gen PROGRESSION: 13291 aimed, INT 2.35, completion 45.68
      gen RANK_PUSHED: 3627 aimed, INT 20.76, completion 18.69
      gen CHECKDOWN: 2415 aimed, INT 3.11, completion 36.02
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2674 aimed, INT 16.83, completion 22.48
      gen ON_THE_RUN: 145 aimed, INT 14.48, completion 23.45
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.48 against a real 3.25
    the filed guard against D8 (printed, the tilts' base) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.98 -> arm 2.97, rise -0.00 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.30 -> arm 0.30, rise -0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.47 -> arm 11.47, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.14 -> arm 0.14, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 7.24 -> arm 7.21, rise -0.03 against an allowed 0.00: PASSES
    flat ON_THE_RUN: base 5.69 -> arm 5.63, rise -0.05 against an allowed 0.00: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.27 -> arm 7.27, rise 0.00 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.35 -> arm 2.35, rise 0.00 against an allowed 0.00: PASSES
    gen RANK_PUSHED: base 20.76 -> arm 20.76, rise 0.00 against an allowed 0.00: PASSES
    gen CHECKDOWN: base 3.11 -> arm 3.11, rise 0.00 against an allowed 0.00: PASSES
    gen DESPERATION: base 16.83 -> arm 16.83, rise 0.00 against an allowed 0.00: PASSES
    gen ON_THE_RUN: base 14.48 -> arm 14.48, rise 0.00 against an allowed 0.00: PASSES
    gen by class: PASSES
  exclusive affected plays against D8 (printed, the tilts' base): flat 0 | gen 0
```

### D1 (design) with D12, D13, D14, seed set 1

```text
ADR-089 step 4: the pocket report (4 arms; both leagues; every hit and sack figure with its time to throw beside it)

== D1 (design) (the base arm): release clock the decision tick ==
  time to throw: flat 1.869 s | gen 1.975 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 968 of 51492 dropbacks (1.88 per 100); pressuredSacks 968; pressured dropbacks 11302 (21.95 per 100) [time to throw 1.869 s]
    gen: sacks 455 of 28734 dropbacks (1.58 per 100); pressuredSacks 455; pressured dropbacks 6733 (23.43 per 100) [time to throw 1.975 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.56% | -13.46 against 22.02% (PR #33, FTN only (held)) | -6.90 against 15.46% (main) [time to throw 1.869 s]
    gen: 6.76% | -15.26 against 22.02% (PR #33, FTN only (held)) | -8.70 against 15.46% (main) [time to throw 1.975 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.95 % | gen 23.43 %
  hit_or_sack_rate: flat 7.46 % [time to throw 1.869 s] | gen 10.18 % [time to throw 1.975 s]
  sack_rate: flat 1.88 % [time to throw 1.869 s] | gen 1.58 % [time to throw 1.975 s]
  time_to_throw: flat 1.869 seconds | gen 1.975 seconds
  sack_share_of_hit_or_sack: flat 25.21 % [time to throw 1.869 s] | gen 15.56 % [time to throw 1.975 s]
  qb_hit_on_scramble: flat 4.11 % [time to throw 1.869 s] | gen 1.59 % [time to throw 1.975 s]
  release_distribution: flat 1.869 seconds | gen 1.975 seconds
  pressured_share_by_release_bin: flat 16.74 % | gen 20.57 %
  hit_rate_by_release_bin: flat 10.78 % [time to throw 1.869 s] | gen 12.94 % [time to throw 1.975 s]
  hits_on_aimed_throws_per_dropback: flat 5.06 % [time to throw 1.869 s] | gen 8.06 % [time to throw 1.975 s]
  first_pressure_seconds: flat 1.389 seconds | gen 1.516 seconds
  first_forcing_seconds: flat 1.739 seconds | gen 1.846 seconds
  first_arrival_seconds: flat 1.889 seconds | gen 1.972 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.38%, FREE_RUNNER 69.92%, WON_REP 26.70%; gen COUNTER 3.47%, FREE_RUNNER 65.30%, WON_REP 31.22%)
  quick_pressure_share_by_origin: flat 88.77 % | gen 83.83 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.47 %
  clean_with_live_won_rep_dropbacks: flat 1.22 % | gen 1.42 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.94 % | gen 11.78 %
  throwaway_rate_clean: flat 18.33 % | gen 10.14 %
  scramble_rate: flat 2.31 % | gen 0.87 %
  scramble_yards: flat 5.74 yards | gen 5.69 yards
  by_down_fixed_calls: flat 9.27 % | gen 8.22 %
  int_per_aimed_throw: flat 2.75 % | gen 7.38 %
  completion_per_aimed_throw: flat 46.80 % | gen 42.82 %
  forced_throw_share: flat 10.57 % | gen 15.39 %
  completion_by_pocket_status: flat 27.19 % | gen 25.39 %
  qb_season_spread: flat 0.00 pp | gen 2.35 pp
  defence_season_spread: flat 0.57 pp | gen 1.53 pp
  unblocked_pressures_per_100: flat 15.82 per 100 dropbacks | gen 15.34 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 32.68 % [time to throw 1.869 s] | gen 23.77 % [time to throw 1.975 s]
  unblocked_men_per_100: flat 19.01 per 100 dropbacks | gen 18.50 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.55 % | gen 10.42 %
  quick_share_no_free_runner: flat 73.75 % | gen 64.75 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.51 % | gen 11.55 %
  situation_q1q3_last_two: flat 17.19 % | gen 12.24 %
  sack_share_of_contacts_in_out: flat 56.64 % [time to throw 1.869 s] | gen 45.82 % [time to throw 1.975 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.869 s] | gen 0.00 % [time to throw 1.975 s]
  sacker_mix.split.interior: flat 30.10 % [time to throw 1.869 s] | gen 31.17 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 47.45 % [time to throw 1.869 s] | gen 47.69 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.14 % [time to throw 1.869 s] | gen 20.70 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.31 % [time to throw 1.869 s] | gen 0.44 % [time to throw 1.975 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.17 % [time to throw 1.869 s] | gen 31.21 % [time to throw 1.975 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.85 % | gen 2.54 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.33 % | gen 2.34 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.01 % | gen 20.72 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.12 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.62 % | gen 17.24 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.14 % | gen 14.84 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.88 % | gen 46.93 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.78 % | gen 19.52 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.47 % | gen 40.50 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.21 % | gen 21.84 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.55 % | gen 22.66 %
  nobody_open_share: flat 43.29 % of dropbacks | gen 33.83 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.25 % of dropbacks | gen 11.59 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.36 % of dropbacks | gen 10.13 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.81 % of dropbacks | gen 10.52 % of dropbacks
  nobody_open_share.split.SACK: flat 1.88 % of dropbacks [time to throw 1.869 s] | gen 1.58 % of dropbacks [time to throw 1.975 s]
  clean_checkdown_share: flat 19.29 % of clean aimed throws | gen 8.87 % of clean aimed throws
  clean_later_read_share: flat 15.29 % of clean aimed throws | gen 22.03 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.24, per aimed throw 2.75; forced-throw share 10.57; completion per attempt 38.10, per aimed throw 46.80; INT-source mix CONTESTED_CATCH 88.68, TIPPED_RECOVERY 11.32
      flat PROGRESSION: 20960 aimed, INT 0.33, completion 45.88
      flat RANK_PUSHED: 6825 aimed, INT 12.01, completion 18.78
      flat CHECKDOWN: 8880 aimed, INT 0.17, completion 45.47
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3275 aimed, INT 5.62, completion 28.21
      flat ON_THE_RUN: 224 aimed, INT 7.14, completion 24.55
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.14 against a real 3.25
    gen: INT per attempt 6.58, per aimed throw 7.38; forced-throw share 15.39; completion per attempt 38.20, per aimed throw 42.82; INT-source mix CONTESTED_CATCH 44.66, TIPPED_RECOVERY 55.34
      gen PROGRESSION: 14366 aimed, INT 2.34, completion 46.93
      gen RANK_PUSHED: 4267 aimed, INT 20.72, completion 19.52
      gen CHECKDOWN: 3331 aimed, INT 3.12, completion 40.50
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2912 aimed, INT 17.24, completion 21.84
      gen ON_THE_RUN: 128 aimed, INT 14.84, completion 22.66
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.84 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D12 (information, direction only (AM-7 item 12)): release clock the decision tick ==
  time to throw: flat 1.868 s | gen 1.976 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 944 of 51496 dropbacks (1.83 per 100); pressuredSacks 944; pressured dropbacks 11311 (21.96 per 100) [time to throw 1.868 s]
    gen: sacks 427 of 28759 dropbacks (1.48 per 100); pressuredSacks 427; pressured dropbacks 6755 (23.49 per 100) [time to throw 1.976 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.35% | -13.67 against 22.02% (PR #33, FTN only (held)) | -7.11 against 15.46% (main) [time to throw 1.868 s]
    gen: 6.32% | -15.70 against 22.02% (PR #33, FTN only (held)) | -9.14 against 15.46% (main) [time to throw 1.976 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.96 % | gen 23.49 %
  hit_or_sack_rate: flat 7.44 % [time to throw 1.868 s] | gen 10.15 % [time to throw 1.976 s]
  sack_rate: flat 1.83 % [time to throw 1.868 s] | gen 1.48 % [time to throw 1.976 s]
  time_to_throw: flat 1.868 seconds | gen 1.976 seconds
  sack_share_of_hit_or_sack: flat 24.63 % [time to throw 1.868 s] | gen 14.63 % [time to throw 1.976 s]
  qb_hit_on_scramble: flat 4.47 % [time to throw 1.868 s] | gen 2.37 % [time to throw 1.976 s]
  release_distribution: flat 1.868 seconds | gen 1.976 seconds
  pressured_share_by_release_bin: flat 16.79 % | gen 20.71 %
  hit_rate_by_release_bin: flat 10.81 % [time to throw 1.868 s] | gen 12.98 % [time to throw 1.976 s]
  hits_on_aimed_throws_per_dropback: flat 5.07 % [time to throw 1.868 s] | gen 8.08 % [time to throw 1.976 s]
  first_pressure_seconds: flat 1.391 seconds | gen 1.518 seconds
  first_forcing_seconds: flat 1.741 seconds | gen 1.847 seconds
  first_arrival_seconds: flat 1.892 seconds | gen 1.969 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.36%, FREE_RUNNER 69.88%, WON_REP 26.76%; gen COUNTER 3.46%, FREE_RUNNER 65.33%, WON_REP 31.21%)
  quick_pressure_share_by_origin: flat 88.72 % | gen 83.75 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.48 %
  clean_with_live_won_rep_dropbacks: flat 1.22 % | gen 1.43 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 16.10 % | gen 12.09 %
  throwaway_rate_clean: flat 18.34 % | gen 10.19 %
  scramble_rate: flat 2.30 % | gen 0.88 %
  scramble_yards: flat 5.63 yards | gen 5.27 yards
  by_down_fixed_calls: flat 8.94 % | gen 7.35 %
  int_per_aimed_throw: flat 2.75 % | gen 7.38 %
  completion_per_aimed_throw: flat 46.78 % | gen 42.77 %
  forced_throw_share: flat 10.58 % | gen 15.42 %
  completion_by_pocket_status: flat 27.11 % | gen 25.38 %
  qb_season_spread: flat 0.00 pp | gen 2.05 pp
  defence_season_spread: flat 0.85 pp | gen 1.32 pp
  unblocked_pressures_per_100: flat 15.80 per 100 dropbacks | gen 15.37 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 32.38 % [time to throw 1.868 s] | gen 23.71 % [time to throw 1.976 s]
  unblocked_men_per_100: flat 19.00 per 100 dropbacks | gen 18.51 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.55 % | gen 10.42 %
  quick_share_no_free_runner: flat 73.68 % | gen 64.30 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.69 % | gen 11.71 %
  situation_q1q3_last_two: flat 17.36 % | gen 12.57 %
  sack_share_of_contacts_in_out: flat 55.46 % [time to throw 1.868 s] | gen 43.22 % [time to throw 1.976 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.868 s] | gen 0.00 % [time to throw 1.976 s]
  sacker_mix.split.interior: flat 30.35 % [time to throw 1.868 s] | gen 30.64 % [time to throw 1.976 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 47.25 % [time to throw 1.868 s] | gen 48.13 % [time to throw 1.976 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.09 % [time to throw 1.868 s] | gen 20.77 % [time to throw 1.976 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.32 % [time to throw 1.868 s] | gen 0.47 % [time to throw 1.976 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.51 % [time to throw 1.868 s] | gen 30.91 % [time to throw 1.976 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.86 % | gen 2.56 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.33 % | gen 2.34 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.05 % | gen 20.57 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.15 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.61 % | gen 17.53 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.39 % | gen 16.00 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.94 % | gen 46.88 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.72 % | gen 19.56 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.50 % | gen 40.65 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.12 % | gen 21.46 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.91 % | gen 21.60 %
  nobody_open_share: flat 43.30 % of dropbacks | gen 33.81 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.25 % of dropbacks | gen 11.59 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.37 % of dropbacks | gen 10.09 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.84 % of dropbacks | gen 10.64 % of dropbacks
  nobody_open_share.split.SACK: flat 1.83 % of dropbacks [time to throw 1.868 s] | gen 1.48 % of dropbacks [time to throw 1.976 s]
  clean_checkdown_share: flat 19.29 % of clean aimed throws | gen 8.81 % of clean aimed throws
  clean_later_read_share: flat 15.35 % of clean aimed throws | gen 22.07 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.24, per aimed throw 2.75; forced-throw share 10.58; completion per attempt 38.07, per aimed throw 46.78; INT-source mix CONTESTED_CATCH 88.79, TIPPED_RECOVERY 11.21
      flat PROGRESSION: 20972 aimed, INT 0.33, completion 45.94
      flat RANK_PUSHED: 6811 aimed, INT 12.05, completion 18.72
      flat CHECKDOWN: 8882 aimed, INT 0.17, completion 45.50
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3282 aimed, INT 5.61, completion 28.12
      flat ON_THE_RUN: 230 aimed, INT 7.39, completion 23.91
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.39 against a real 3.25
    gen: INT per attempt 6.57, per aimed throw 7.38; forced-throw share 15.42; completion per attempt 38.11, per aimed throw 42.77; INT-source mix CONTESTED_CATCH 44.80, TIPPED_RECOVERY 55.20
      gen PROGRESSION: 14406 aimed, INT 2.34, completion 46.88
      gen RANK_PUSHED: 4253 aimed, INT 20.57, completion 19.56
      gen CHECKDOWN: 3333 aimed, INT 3.15, completion 40.65
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2903 aimed, INT 17.53, completion 21.46
      gen ON_THE_RUN: 125 aimed, INT 16.00, completion 21.60
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.00 against a real 3.25
    the filed guard against D1 (design) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.75, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.33 -> arm 0.33, rise -0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 12.01 -> arm 12.05, rise 0.04 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.17 -> arm 0.17, rise -0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 5.62 -> arm 5.61, rise -0.01 against an allowed 0.00: PASSES
    flat ON_THE_RUN: base 7.14 -> arm 7.39, rise 0.25 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.38 -> arm 7.38, rise -0.00 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.34 -> arm 2.34, rise 0.00 against an allowed 0.00: PASSES
    gen RANK_PUSHED: base 20.72 -> arm 20.57, rise -0.14 against an allowed 0.00: PASSES
    gen CHECKDOWN: base 3.12 -> arm 3.15, rise 0.03 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 17.24 -> arm 17.53, rise 0.29 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 14.84 -> arm 16.00, rise 1.16 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D1 (design): flat 0 | gen 0

== D13 (information (§4.5 item 7)): release clock the decision tick ==
  time to throw: flat 1.868 s | gen 1.971 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1182 of 51408 dropbacks (2.30 per 100); pressuredSacks 1182; pressured dropbacks 11258 (21.90 per 100) [time to throw 1.868 s]
    gen: sacks 668 of 28452 dropbacks (2.35 per 100); pressuredSacks 668; pressured dropbacks 6665 (23.43 per 100) [time to throw 1.971 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.50% | -11.52 against 22.02% (PR #33, FTN only (held)) | -4.96 against 15.46% (main) [time to throw 1.868 s]
    gen: 10.02% | -12.00 against 22.02% (PR #33, FTN only (held)) | -5.44 against 15.46% (main) [time to throw 1.971 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.90 % | gen 23.43 %
  hit_or_sack_rate: flat 7.47 % [time to throw 1.868 s] | gen 10.15 % [time to throw 1.971 s]
  sack_rate: flat 2.30 % [time to throw 1.868 s] | gen 2.35 % [time to throw 1.971 s]
  time_to_throw: flat 1.868 seconds | gen 1.971 seconds
  sack_share_of_hit_or_sack: flat 30.79 % [time to throw 1.868 s] | gen 23.14 % [time to throw 1.971 s]
  qb_hit_on_scramble: flat 4.05 % [time to throw 1.868 s] | gen 2.81 % [time to throw 1.971 s]
  release_distribution: flat 1.868 seconds | gen 1.971 seconds
  pressured_share_by_release_bin: flat 15.81 % | gen 18.42 %
  hit_rate_by_release_bin: flat 8.62 % [time to throw 1.868 s] | gen 9.97 % [time to throw 1.971 s]
  hits_on_aimed_throws_per_dropback: flat 4.63 % [time to throw 1.868 s] | gen 7.33 % [time to throw 1.971 s]
  first_pressure_seconds: flat 1.388 seconds | gen 1.521 seconds
  first_forcing_seconds: flat 1.741 seconds | gen 1.848 seconds
  first_arrival_seconds: flat 1.898 seconds | gen 1.961 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.33%, FREE_RUNNER 69.94%, WON_REP 26.73%; gen COUNTER 3.34%, FREE_RUNNER 64.90%, WON_REP 31.76%)
  quick_pressure_share_by_origin: flat 88.80 % | gen 83.42 %
  clean_with_live_won_rep_ticks: flat 0.44 % | gen 0.47 %
  clean_with_live_won_rep_dropbacks: flat 1.24 % | gen 1.41 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 16.09 % | gen 11.42 %
  throwaway_rate_clean: flat 18.20 % | gen 10.06 %
  scramble_rate: flat 2.35 % | gen 0.88 %
  scramble_yards: flat 5.75 yards | gen 6.41 yards
  by_down_fixed_calls: flat 10.96 % | gen 10.92 %
  int_per_aimed_throw: flat 2.80 % | gen 7.23 %
  completion_per_aimed_throw: flat 46.75 % | gen 43.00 %
  forced_throw_share: flat 10.09 % | gen 14.71 %
  completion_by_pocket_status: flat 26.98 % | gen 26.10 %
  qb_season_spread: flat 0.00 pp | gen 2.96 pp
  defence_season_spread: flat 0.00 pp | gen 1.32 pp
  unblocked_pressures_per_100: flat 15.82 per 100 dropbacks | gen 15.28 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 32.77 % [time to throw 1.868 s] | gen 23.48 % [time to throw 1.971 s]
  unblocked_men_per_100: flat 19.03 per 100 dropbacks | gen 18.51 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.41 % | gen 9.89 %
  quick_share_no_free_runner: flat 73.48 % | gen 63.80 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 16.95 % | gen 11.33 %
  situation_q1q3_last_two: flat 16.89 % | gen 12.73 %
  sack_share_of_contacts_in_out: flat 68.92 % [time to throw 1.868 s] | gen 68.72 % [time to throw 1.971 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.868 s] | gen 0.00 % [time to throw 1.971 s]
  sacker_mix.split.interior: flat 30.72 % [time to throw 1.868 s] | gen 32.10 % [time to throw 1.971 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 47.14 % [time to throw 1.868 s] | gen 47.50 % [time to throw 1.971 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.67 % [time to throw 1.868 s] | gen 20.10 % [time to throw 1.971 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.47 % [time to throw 1.868 s] | gen 0.30 % [time to throw 1.971 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.96 % [time to throw 1.868 s] | gen 32.04 % [time to throw 1.971 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.88 % | gen 2.66 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.41 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.22 % | gen 20.30 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 2.91 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.57 % | gen 17.04 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.11 % | gen 16.53 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.76 % | gen 46.76 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.97 % | gen 19.94 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.88 % | gen 40.48 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.75 % | gen 22.36 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 21.78 % | gen 23.97 %
  nobody_open_share: flat 43.54 % of dropbacks | gen 34.18 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.11 % of dropbacks | gen 11.48 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.39 % of dropbacks | gen 9.98 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.74 % of dropbacks | gen 10.38 % of dropbacks
  nobody_open_share.split.SACK: flat 2.30 % of dropbacks [time to throw 1.868 s] | gen 2.35 % of dropbacks [time to throw 1.971 s]
  clean_checkdown_share: flat 19.27 % of clean aimed throws | gen 8.86 % of clean aimed throws
  clean_later_read_share: flat 15.37 % of clean aimed throws | gen 21.97 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.28, per aimed throw 2.80; forced-throw share 10.09; completion per attempt 38.05, per aimed throw 46.75; INT-source mix CONTESTED_CATCH 88.27, TIPPED_RECOVERY 11.73
      flat PROGRESSION: 20797 aimed, INT 0.35, completion 45.76
      flat RANK_PUSHED: 6791 aimed, INT 12.22, completion 18.97
      flat CHECKDOWN: 8796 aimed, INT 0.17, completion 45.88
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3287 aimed, INT 5.57, completion 27.75
      flat ON_THE_RUN: 225 aimed, INT 7.11, completion 21.78
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.11 against a real 3.25
    gen: INT per attempt 6.46, per aimed throw 7.23; forced-throw share 14.71; completion per attempt 38.39, per aimed throw 43.00; INT-source mix CONTESTED_CATCH 43.03, TIPPED_RECOVERY 56.97
      gen PROGRESSION: 14238 aimed, INT 2.41, completion 46.76
      gen RANK_PUSHED: 4118 aimed, INT 20.30, completion 19.94
      gen CHECKDOWN: 3266 aimed, INT 2.91, completion 40.48
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2840 aimed, INT 17.04, completion 22.36
      gen ON_THE_RUN: 121 aimed, INT 16.53, completion 23.97
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.53 against a real 3.25
    the filed guard against D1 (design) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.80, rise 0.05 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.33 -> arm 0.35, rise 0.02 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 12.01 -> arm 12.22, rise 0.21 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.17 -> arm 0.17, rise 0.00 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 5.62 -> arm 5.57, rise -0.05 against an allowed 0.02: PASSES
    flat ON_THE_RUN: base 7.14 -> arm 7.11, rise -0.03 against an allowed 0.02: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.38 -> arm 7.23, rise -0.15 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.34 -> arm 2.41, rise 0.07 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.72 -> arm 20.30, rise -0.42 against an allowed 0.01: PASSES
    gen CHECKDOWN: base 3.12 -> arm 2.91, rise -0.21 against an allowed -0.00: PASSES
    gen DESPERATION: base 17.24 -> arm 17.04, rise -0.20 against an allowed 0.01: PASSES
    gen ON_THE_RUN: base 14.84 -> arm 16.53, rise 1.69 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D1 (design): flat 0 | gen 0

== D14 (information only, never a candidate (s4.reading)): release clock the decision tick ==
  time to throw: flat 1.870 s | gen 1.973 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 966 of 51517 dropbacks (1.88 per 100); pressuredSacks 966; pressured dropbacks 11295 (21.92 per 100) [time to throw 1.870 s]
    gen: sacks 461 of 28715 dropbacks (1.61 per 100); pressuredSacks 461; pressured dropbacks 6709 (23.36 per 100) [time to throw 1.973 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.55% | -13.47 against 22.02% (PR #33, FTN only (held)) | -6.91 against 15.46% (main) [time to throw 1.870 s]
    gen: 6.87% | -15.15 against 22.02% (PR #33, FTN only (held)) | -8.59 against 15.46% (main) [time to throw 1.973 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.92 % | gen 23.36 %
  hit_or_sack_rate: flat 5.66 % [time to throw 1.870 s] | gen 7.21 % [time to throw 1.973 s]
  sack_rate: flat 1.88 % [time to throw 1.870 s] | gen 1.61 % [time to throw 1.973 s]
  time_to_throw: flat 1.870 seconds | gen 1.973 seconds
  sack_share_of_hit_or_sack: flat 33.13 % [time to throw 1.870 s] | gen 22.26 % [time to throw 1.973 s]
  qb_hit_on_scramble: flat 4.58 % [time to throw 1.870 s] | gen 1.56 % [time to throw 1.973 s]
  release_distribution: flat 1.870 seconds | gen 1.973 seconds
  pressured_share_by_release_bin: flat 16.73 % | gen 20.58 %
  hit_rate_by_release_bin: flat 7.04 % [time to throw 1.870 s] | gen 8.78 % [time to throw 1.973 s]
  hits_on_aimed_throws_per_dropback: flat 3.27 % [time to throw 1.870 s] | gen 5.09 % [time to throw 1.973 s]
  first_pressure_seconds: flat 1.390 seconds | gen 1.519 seconds
  first_forcing_seconds: flat 1.742 seconds | gen 1.850 seconds
  first_arrival_seconds: flat 1.890 seconds | gen 1.963 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.36%, FREE_RUNNER 69.89%, WON_REP 26.75%; gen COUNTER 3.49%, FREE_RUNNER 65.34%, WON_REP 31.17%)
  quick_pressure_share_by_origin: flat 88.79 % | gen 83.68 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.48 %
  clean_with_live_won_rep_dropbacks: flat 1.21 % | gen 1.43 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.97 % | gen 11.79 %
  throwaway_rate_clean: flat 18.32 % | gen 10.09 %
  scramble_rate: flat 2.33 % | gen 0.89 %
  scramble_yards: flat 5.37 yards | gen 5.54 yards
  by_down_fixed_calls: flat 9.73 % | gen 8.29 %
  int_per_aimed_throw: flat 2.78 % | gen 7.37 %
  completion_per_aimed_throw: flat 46.74 % | gen 43.06 %
  forced_throw_share: flat 10.56 % | gen 15.25 %
  completion_by_pocket_status: flat 27.58 % | gen 26.59 %
  qb_season_spread: flat 0.00 pp | gen 2.34 pp
  defence_season_spread: flat 0.00 pp | gen 1.30 pp
  unblocked_pressures_per_100: flat 15.77 per 100 dropbacks | gen 15.36 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 43.00 % [time to throw 1.870 s] | gen 33.37 % [time to throw 1.973 s]
  unblocked_men_per_100: flat 18.95 per 100 dropbacks | gen 18.46 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.48 % | gen 10.35 %
  quick_share_no_free_runner: flat 73.90 % | gen 64.02 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.90 % | gen 11.56 %
  situation_q1q3_last_two: flat 16.63 % | gen 12.13 %
  sack_share_of_contacts_in_out: flat 56.49 % [time to throw 1.870 s] | gen 46.75 % [time to throw 1.973 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.870 s] | gen 0.00 % [time to throw 1.973 s]
  sacker_mix.split.interior: flat 30.35 % [time to throw 1.870 s] | gen 32.18 % [time to throw 1.973 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.76 % [time to throw 1.870 s] | gen 47.18 % [time to throw 1.973 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.58 % [time to throw 1.870 s] | gen 20.21 % [time to throw 1.973 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.31 % [time to throw 1.870 s] | gen 0.43 % [time to throw 1.973 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.33 % [time to throw 1.870 s] | gen 32.10 % [time to throw 1.973 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.86 % | gen 2.60 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.33 % | gen 2.34 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.08 % | gen 20.75 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 3.00 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.66 % | gen 17.47 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.21 % | gen 15.75 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.88 % | gen 47.04 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.78 % | gen 19.71 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.39 % | gen 41.13 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.15 % | gen 22.12 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.23 % | gen 20.47 %
  nobody_open_share: flat 43.29 % of dropbacks | gen 33.82 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.23 % of dropbacks | gen 11.62 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.38 % of dropbacks | gen 10.11 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.81 % of dropbacks | gen 10.49 % of dropbacks
  nobody_open_share.split.SACK: flat 1.88 % of dropbacks [time to throw 1.870 s] | gen 1.61 % of dropbacks [time to throw 1.973 s]
  clean_checkdown_share: flat 19.30 % of clean aimed throws | gen 8.92 % of clean aimed throws
  clean_later_read_share: flat 15.25 % of clean aimed throws | gen 22.20 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.27, per aimed throw 2.78; forced-throw share 10.56; completion per attempt 38.06, per aimed throw 46.74; INT-source mix CONTESTED_CATCH 88.55, TIPPED_RECOVERY 11.45
      flat PROGRESSION: 20933 aimed, INT 0.33, completion 45.88
      flat RANK_PUSHED: 6862 aimed, INT 12.08, completion 18.78
      flat CHECKDOWN: 8875 aimed, INT 0.19, completion 45.39
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3286 aimed, INT 5.66, completion 28.15
      flat ON_THE_RUN: 222 aimed, INT 7.21, completion 25.23
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.21 against a real 3.25
    gen: INT per attempt 6.58, per aimed throw 7.37; forced-throw share 15.25; completion per attempt 38.43, per aimed throw 43.06; INT-source mix CONTESTED_CATCH 44.14, TIPPED_RECOVERY 55.86
      gen PROGRESSION: 14385 aimed, INT 2.34, completion 47.04
      gen RANK_PUSHED: 4236 aimed, INT 20.75, completion 19.71
      gen CHECKDOWN: 3336 aimed, INT 3.00, completion 41.13
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2902 aimed, INT 17.47, completion 22.12
      gen ON_THE_RUN: 127 aimed, INT 15.75, completion 20.47
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.75 against a real 3.25
    the filed guard against D1 (design) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.78, rise 0.03 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.33 -> arm 0.33, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 12.01 -> arm 12.08, rise 0.07 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.17 -> arm 0.19, rise 0.02 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 5.62 -> arm 5.66, rise 0.04 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 7.14 -> arm 7.21, rise 0.06 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.38 -> arm 7.37, rise -0.01 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.34 -> arm 2.34, rise -0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.72 -> arm 20.75, rise 0.03 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.12 -> arm 3.00, rise -0.12 against an allowed 0.00: PASSES
    gen DESPERATION: base 17.24 -> arm 17.47, rise 0.23 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 14.84 -> arm 15.75, rise 0.90 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D1 (design): flat 0 | gen 0
```

### D2 (pricing arm, never a design value) with D15, D16, seed set 1

```text
ADR-089 step 4: the pocket report (3 arms; both leagues; every hit and sack figure with its time to throw beside it)

== D2 (pricing arm, never a design value) (the base arm): release clock the decision tick ==
  time to throw: flat 2.990 s | gen 2.951 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2202 of 49398 dropbacks (4.46 per 100); pressuredSacks 2202; pressured dropbacks 20410 (41.32 per 100) [time to throw 2.990 s]
    gen: sacks 1175 of 27513 dropbacks (4.27 per 100); pressuredSacks 1160; pressured dropbacks 11310 (41.11 per 100) [time to throw 2.951 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.79% | -11.23 against 22.02% (PR #33, FTN only (held)) | -4.67 against 15.46% (main) [time to throw 2.990 s]
    gen: 10.26% | -11.76 against 22.02% (PR #33, FTN only (held)) | -5.20 against 15.46% (main) [time to throw 2.951 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.32 % | gen 41.11 %
  hit_or_sack_rate: flat 17.45 % [time to throw 2.990 s] | gen 20.36 % [time to throw 2.951 s]
  sack_rate: flat 4.46 % [time to throw 2.990 s] | gen 4.27 % [time to throw 2.951 s]
  time_to_throw: flat 2.990 seconds | gen 2.951 seconds
  sack_share_of_hit_or_sack: flat 25.55 % [time to throw 2.990 s] | gen 20.98 % [time to throw 2.951 s]
  qb_hit_on_scramble: flat 3.46 % [time to throw 2.990 s] | gen 4.92 % [time to throw 2.951 s]
  release_distribution: flat 2.990 seconds | gen 2.951 seconds
  pressured_share_by_release_bin: flat 44.86 % | gen 49.88 %
  hit_rate_by_release_bin: flat 28.92 % [time to throw 2.990 s] | gen 33.99 % [time to throw 2.951 s]
  hits_on_aimed_throws_per_dropback: flat 11.89 % [time to throw 2.990 s] | gen 14.72 % [time to throw 2.951 s]
  first_pressure_seconds: flat 1.976 seconds | gen 2.024 seconds
  first_forcing_seconds: flat 2.220 seconds | gen 2.277 seconds
  first_arrival_seconds: flat 1.994 seconds | gen 2.036 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.35%, FREE_RUNNER 51.40%, WON_REP 43.24%; gen COUNTER 5.59%, FREE_RUNNER 50.00%, WON_REP 44.41%)
  quick_pressure_share_by_origin: flat 61.98 % | gen 61.15 %
  clean_with_live_won_rep_ticks: flat 0.83 % | gen 0.79 %
  clean_with_live_won_rep_dropbacks: flat 3.70 % | gen 3.49 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.20 % | gen 18.26 %
  throwaway_rate_clean: flat 14.44 % | gen 7.07 %
  scramble_rate: flat 6.44 % | gen 3.03 %
  scramble_yards: flat 6.63 yards | gen 4.09 yards
  by_down_fixed_calls: flat 11.57 % | gen 12.00 %
  int_per_aimed_throw: flat 2.86 % | gen 7.09 %
  completion_per_aimed_throw: flat 42.14 % | gen 41.21 %
  forced_throw_share: flat 24.29 % | gen 27.66 %
  completion_by_pocket_status: flat 20.75 % | gen 22.74 %
  qb_season_spread: flat 0.32 pp | gen 1.73 pp
  defence_season_spread: flat 0.00 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 19.11 per 100 dropbacks | gen 18.33 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 35.74 % [time to throw 2.990 s] | gen 36.08 % [time to throw 2.951 s]
  unblocked_men_per_100: flat 19.15 per 100 dropbacks | gen 18.36 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.16 % | gen 26.00 %
  quick_share_no_free_runner: flat 37.04 % | gen 36.95 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 21.11 % | gen 16.58 %
  situation_q1q3_last_two: flat 21.46 % | gen 17.17 %
  sack_share_of_contacts_in_out: flat 52.31 % [time to throw 2.990 s] | gen 40.89 % [time to throw 2.951 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.990 s] | gen 1.28 % [time to throw 2.951 s]
  sacker_mix.split.interior: flat 32.07 % [time to throw 2.990 s] | gen 31.14 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.52 % [time to throw 2.990 s] | gen 47.50 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.68 % [time to throw 2.990 s] | gen 21.07 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.73 % [time to throw 2.990 s] | gen 0.29 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.26 % [time to throw 2.990 s] | gen 31.33 % [time to throw 2.951 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.35 % | gen 6.43 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.28 % | gen 2.22 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.24 % | gen 20.05 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.12 % | gen 3.14 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.52 % | gen 16.62 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.31 % | gen 15.58 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.72 % | gen 45.34 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.99 % | gen 18.55 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 35.98 % | gen 33.88 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.76 % | gen 21.78 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.21 % | gen 23.38 %
  nobody_open_share: flat 36.86 % of dropbacks | gen 34.61 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.70 % of dropbacks | gen 8.81 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.06 % of dropbacks | gen 9.86 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.64 % of dropbacks | gen 11.67 % of dropbacks
  nobody_open_share.split.SACK: flat 4.46 % of dropbacks [time to throw 2.990 s] | gen 4.27 % of dropbacks [time to throw 2.951 s]
  clean_checkdown_share: flat 5.48 % of clean aimed throws | gen 2.95 % of clean aimed throws
  clean_later_read_share: flat 22.05 % of clean aimed throws | gen 26.46 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.29, per aimed throw 2.86; forced-throw share 24.29; completion per attempt 33.80, per aimed throw 42.14; INT-source mix CONTESTED_CATCH 90.87, TIPPED_RECOVERY 9.13
      flat PROGRESSION: 21255 aimed, INT 0.28, completion 42.72
      flat RANK_PUSHED: 6546 aimed, INT 11.24, completion 16.99
      flat CHECKDOWN: 4300 aimed, INT 0.12, completion 35.98
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2992 aimed, INT 6.52, completion 23.76
      flat ON_THE_RUN: 206 aimed, INT 6.31, completion 26.21
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.31 against a real 3.25
    gen: INT per attempt 6.20, per aimed throw 7.09; forced-throw share 27.66; completion per attempt 36.02, per aimed throw 41.21; INT-source mix CONTESTED_CATCH 44.53, TIPPED_RECOVERY 55.47
      gen PROGRESSION: 13343 aimed, INT 2.22, completion 45.34
      gen RANK_PUSHED: 3660 aimed, INT 20.05, completion 18.55
      gen CHECKDOWN: 2423 aimed, INT 3.14, completion 33.88
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2714 aimed, INT 16.62, completion 21.78
      gen ON_THE_RUN: 154 aimed, INT 15.58, completion 23.38
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.58 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D15 (b's reachable range, the grid's low end (reported)): release clock the decision tick ==
  time to throw: flat 2.997 s | gen 2.951 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2475 of 49174 dropbacks (5.03 per 100); pressuredSacks 2475; pressured dropbacks 20315 (41.31 per 100) [time to throw 2.997 s]
    gen: sacks 1382 of 27419 dropbacks (5.04 per 100); pressuredSacks 1368; pressured dropbacks 11328 (41.31 per 100) [time to throw 2.951 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 12.18% | -9.84 against 22.02% (PR #33, FTN only (held)) | -3.28 against 15.46% (main) [time to throw 2.997 s]
    gen: 12.08% | -9.94 against 22.02% (PR #33, FTN only (held)) | -3.38 against 15.46% (main) [time to throw 2.951 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.31 % | gen 41.31 %
  hit_or_sack_rate: flat 17.52 % [time to throw 2.997 s] | gen 20.35 % [time to throw 2.951 s]
  sack_rate: flat 5.03 % [time to throw 2.997 s] | gen 5.04 % [time to throw 2.951 s]
  time_to_throw: flat 2.997 seconds | gen 2.951 seconds
  sack_share_of_hit_or_sack: flat 28.73 % [time to throw 2.997 s] | gen 24.76 % [time to throw 2.951 s]
  qb_hit_on_scramble: flat 2.28 % [time to throw 2.997 s] | gen 2.59 % [time to throw 2.951 s]
  release_distribution: flat 2.997 seconds | gen 2.951 seconds
  pressured_share_by_release_bin: flat 43.86 % | gen 49.20 %
  hit_rate_by_release_bin: flat 28.55 % [time to throw 2.997 s] | gen 33.78 % [time to throw 2.951 s]
  hits_on_aimed_throws_per_dropback: flat 11.82 % [time to throw 2.997 s] | gen 14.41 % [time to throw 2.951 s]
  first_pressure_seconds: flat 1.974 seconds | gen 2.020 seconds
  first_forcing_seconds: flat 2.219 seconds | gen 2.273 seconds
  first_arrival_seconds: flat 1.993 seconds | gen 2.032 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.26%, FREE_RUNNER 51.48%, WON_REP 43.26%; gen COUNTER 5.72%, FREE_RUNNER 49.81%, WON_REP 44.46%)
  quick_pressure_share_by_origin: flat 62.09 % | gen 61.25 %
  clean_with_live_won_rep_ticks: flat 0.82 % | gen 0.79 %
  clean_with_live_won_rep_dropbacks: flat 3.65 % | gen 3.49 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 21.05 % | gen 17.38 %
  throwaway_rate_clean: flat 14.46 % | gen 7.17 %
  scramble_rate: flat 6.42 % | gen 2.95 %
  scramble_yards: flat 6.62 yards | gen 4.29 yards
  by_down_fixed_calls: flat 12.83 % | gen 14.30 %
  int_per_aimed_throw: flat 2.90 % | gen 7.09 %
  completion_per_aimed_throw: flat 42.14 % | gen 41.05 %
  forced_throw_share: flat 24.25 % | gen 27.64 %
  completion_by_pocket_status: flat 21.46 % | gen 22.96 %
  qb_season_spread: flat 0.00 pp | gen 2.31 pp
  defence_season_spread: flat 0.00 pp | gen 1.23 pp
  unblocked_pressures_per_100: flat 19.12 per 100 dropbacks | gen 18.46 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 35.77 % [time to throw 2.997 s] | gen 36.41 % [time to throw 2.951 s]
  unblocked_men_per_100: flat 19.15 per 100 dropbacks | gen 18.49 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.14 % | gen 25.80 %
  quick_share_no_free_runner: flat 37.44 % | gen 36.84 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 20.37 % | gen 16.37 %
  situation_q1q3_last_two: flat 20.30 % | gen 17.18 %
  sack_share_of_contacts_in_out: flat 59.26 % [time to throw 2.997 s] | gen 48.32 % [time to throw 2.951 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.997 s] | gen 1.01 % [time to throw 2.951 s]
  sacker_mix.split.interior: flat 32.29 % [time to throw 2.997 s] | gen 34.16 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.43 % [time to throw 2.997 s] | gen 45.63 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.42 % [time to throw 2.997 s] | gen 19.82 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.85 % [time to throw 2.997 s] | gen 0.39 % [time to throw 2.951 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.44 % [time to throw 2.997 s] | gen 34.02 % [time to throw 2.951 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.35 % | gen 6.43 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 2.25 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.37 % | gen 20.40 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.12 % | gen 3.08 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.35 % | gen 16.19 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.22 % | gen 13.70 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.61 % | gen 45.22 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.15 % | gen 18.00 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 36.02 % | gen 33.22 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.55 % | gen 22.21 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.98 % | gen 23.97 %
  nobody_open_share: flat 36.97 % of dropbacks | gen 35.06 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.67 % of dropbacks | gen 8.87 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.09 % of dropbacks | gen 9.76 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.19 % of dropbacks | gen 11.39 % of dropbacks
  nobody_open_share.split.SACK: flat 5.03 % of dropbacks [time to throw 2.997 s] | gen 5.04 % of dropbacks [time to throw 2.951 s]
  clean_checkdown_share: flat 5.43 % of clean aimed throws | gen 3.02 % of clean aimed throws
  clean_later_read_share: flat 22.22 % of clean aimed throws | gen 26.36 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.33, per aimed throw 2.90; forced-throw share 24.25; completion per attempt 33.96, per aimed throw 42.14; INT-source mix CONTESTED_CATCH 90.85, TIPPED_RECOVERY 9.15
      flat PROGRESSION: 21082 aimed, INT 0.30, completion 42.61
      flat RANK_PUSHED: 6560 aimed, INT 11.37, completion 17.15
      flat CHECKDOWN: 4261 aimed, INT 0.12, completion 36.02
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2993 aimed, INT 6.35, completion 23.55
      flat ON_THE_RUN: 193 aimed, INT 6.22, completion 27.98
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.22 against a real 3.25
    gen: INT per attempt 6.21, per aimed throw 7.09; forced-throw share 27.64; completion per attempt 35.97, per aimed throw 41.05; INT-source mix CONTESTED_CATCH 44.86, TIPPED_RECOVERY 55.14
      gen PROGRESSION: 13218 aimed, INT 2.25, completion 45.22
      gen RANK_PUSHED: 3633 aimed, INT 20.40, completion 18.00
      gen CHECKDOWN: 2432 aimed, INT 3.08, completion 33.22
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2675 aimed, INT 16.19, completion 22.21
      gen ON_THE_RUN: 146 aimed, INT 13.70, completion 23.97
      gen on the run: clean INT n/a against a real 2.11; pressured INT 13.70 against a real 3.25
    the filed guard against D2 (pricing arm, never a design value) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.86 -> arm 2.90, rise 0.04 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.28 -> arm 0.30, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.24 -> arm 11.37, rise 0.13 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.12 -> arm 0.12, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 6.52 -> arm 6.35, rise -0.17 against an allowed -0.00: PASSES
    flat ON_THE_RUN: base 6.31 -> arm 6.22, rise -0.09 against an allowed 0.01: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.09 -> arm 7.09, rise -0.00 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.22 -> arm 2.25, rise 0.04 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.05 -> arm 20.40, rise 0.34 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.14 -> arm 3.08, rise -0.05 against an allowed 0.01: PASSES
    gen DESPERATION: base 16.62 -> arm 16.19, rise -0.43 against an allowed -0.00: PASSES
    gen ON_THE_RUN: base 15.58 -> arm 13.70, rise -1.89 against an allowed -0.00: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D2 (pricing arm, never a design value): flat 0 | gen 0

== D16 (b's reachable range, the grid's high end (reported)): release clock the decision tick ==
  time to throw: flat 2.991 s | gen 2.949 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2071 of 49480 dropbacks (4.19 per 100); pressuredSacks 2071; pressured dropbacks 20435 (41.30 per 100) [time to throw 2.991 s]
    gen: sacks 1105 of 27521 dropbacks (4.02 per 100); pressuredSacks 1091; pressured dropbacks 11291 (41.03 per 100) [time to throw 2.949 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.13% | -11.89 against 22.02% (PR #33, FTN only (held)) | -5.33 against 15.46% (main) [time to throw 2.991 s]
    gen: 9.66% | -12.36 against 22.02% (PR #33, FTN only (held)) | -5.80 against 15.46% (main) [time to throw 2.949 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.30 % | gen 41.03 %
  hit_or_sack_rate: flat 17.35 % [time to throw 2.991 s] | gen 20.33 % [time to throw 2.949 s]
  sack_rate: flat 4.19 % [time to throw 2.991 s] | gen 4.02 % [time to throw 2.949 s]
  time_to_throw: flat 2.991 seconds | gen 2.949 seconds
  sack_share_of_hit_or_sack: flat 24.12 % [time to throw 2.991 s] | gen 19.75 % [time to throw 2.949 s]
  qb_hit_on_scramble: flat 4.27 % [time to throw 2.991 s] | gen 6.41 % [time to throw 2.949 s]
  release_distribution: flat 2.991 seconds | gen 2.949 seconds
  pressured_share_by_release_bin: flat 45.24 % | gen 50.29 %
  hit_rate_by_release_bin: flat 28.82 % [time to throw 2.991 s] | gen 33.99 % [time to throw 2.949 s]
  hits_on_aimed_throws_per_dropback: flat 11.85 % [time to throw 2.991 s] | gen 14.74 % [time to throw 2.949 s]
  first_pressure_seconds: flat 1.974 seconds | gen 2.021 seconds
  first_forcing_seconds: flat 2.219 seconds | gen 2.274 seconds
  first_arrival_seconds: flat 1.993 seconds | gen 2.039 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.35%, FREE_RUNNER 51.39%, WON_REP 43.26%; gen COUNTER 5.67%, FREE_RUNNER 50.21%, WON_REP 44.12%)
  quick_pressure_share_by_origin: flat 62.03 % | gen 61.17 %
  clean_with_live_won_rep_ticks: flat 0.83 % | gen 0.78 %
  clean_with_live_won_rep_dropbacks: flat 3.66 % | gen 3.47 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.65 % | gen 18.87 %
  throwaway_rate_clean: flat 14.43 % | gen 7.01 %
  scramble_rate: flat 6.53 % | gen 3.06 %
  scramble_yards: flat 6.51 yards | gen 4.03 yards
  by_down_fixed_calls: flat 10.41 % | gen 10.79 %
  int_per_aimed_throw: flat 2.87 % | gen 6.99 %
  completion_per_aimed_throw: flat 42.24 % | gen 41.25 %
  forced_throw_share: flat 24.21 % | gen 27.55 %
  completion_by_pocket_status: flat 20.69 % | gen 22.71 %
  qb_season_spread: flat 0.62 pp | gen 1.71 pp
  defence_season_spread: flat 0.00 pp | gen 0.12 pp
  unblocked_pressures_per_100: flat 19.17 per 100 dropbacks | gen 18.40 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 35.94 % [time to throw 2.991 s] | gen 35.85 % [time to throw 2.949 s]
  unblocked_men_per_100: flat 19.21 per 100 dropbacks | gen 18.43 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.17 % | gen 26.24 %
  quick_share_no_free_runner: flat 36.96 % | gen 36.71 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 21.82 % | gen 17.29 %
  situation_q1q3_last_two: flat 22.06 % | gen 18.27 %
  sack_share_of_contacts_in_out: flat 49.04 % [time to throw 2.991 s] | gen 38.53 % [time to throw 2.949 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.991 s] | gen 1.27 % [time to throw 2.949 s]
  sacker_mix.split.interior: flat 31.61 % [time to throw 2.991 s] | gen 30.23 % [time to throw 2.949 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.96 % [time to throw 2.991 s] | gen 47.43 % [time to throw 2.949 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.73 % [time to throw 2.991 s] | gen 22.08 % [time to throw 2.949 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.70 % [time to throw 2.991 s] | gen 0.26 % [time to throw 2.949 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.75 % [time to throw 2.991 s] | gen 30.15 % [time to throw 2.949 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.35 % | gen 6.39 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 2.24 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.30 % | gen 19.87 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.09 % | gen 3.17 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.66 % | gen 16.00 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.19 % | gen 14.19 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.80 % | gen 45.31 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.94 % | gen 18.43 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 36.16 % | gen 33.81 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.83 % | gen 22.35 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.47 % | gen 25.68 %
  nobody_open_share: flat 36.77 % of dropbacks | gen 34.50 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.69 % of dropbacks | gen 8.82 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.07 % of dropbacks | gen 9.79 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.83 % of dropbacks | gen 11.88 % of dropbacks
  nobody_open_share.split.SACK: flat 4.19 % of dropbacks [time to throw 2.991 s] | gen 4.02 % of dropbacks [time to throw 2.949 s]
  clean_checkdown_share: flat 5.49 % of clean aimed throws | gen 2.90 % of clean aimed throws
  clean_later_read_share: flat 21.96 % of clean aimed throws | gen 26.46 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.30, per aimed throw 2.87; forced-throw share 24.21; completion per attempt 33.80, per aimed throw 42.24; INT-source mix CONTESTED_CATCH 90.94, TIPPED_RECOVERY 9.06
      flat PROGRESSION: 21300 aimed, INT 0.29, completion 42.80
      flat RANK_PUSHED: 6539 aimed, INT 11.30, completion 16.94
      flat CHECKDOWN: 4300 aimed, INT 0.09, completion 36.16
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3005 aimed, INT 6.66, completion 23.83
      flat ON_THE_RUN: 212 aimed, INT 5.19, completion 25.47
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.19 against a real 3.25
    gen: INT per attempt 6.10, per aimed throw 6.99; forced-throw share 27.55; completion per attempt 35.98, per aimed throw 41.25; INT-source mix CONTESTED_CATCH 43.87, TIPPED_RECOVERY 56.13
      gen PROGRESSION: 13356 aimed, INT 2.24, completion 45.31
      gen RANK_PUSHED: 3679 aimed, INT 19.87, completion 18.43
      gen CHECKDOWN: 2428 aimed, INT 3.17, completion 33.81
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2693 aimed, INT 16.00, completion 22.35
      gen ON_THE_RUN: 148 aimed, INT 14.19, completion 25.68
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.19 against a real 3.25
    the filed guard against D2 (pricing arm, never a design value) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.86 -> arm 2.87, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.28 -> arm 0.29, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.24 -> arm 11.30, rise 0.06 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.12 -> arm 0.09, rise -0.02 against an allowed 0.01: PASSES
    flat DESPERATION: base 6.52 -> arm 6.66, rise 0.14 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 6.31 -> arm 5.19, rise -1.12 against an allowed -0.01: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.09 -> arm 6.99, rise -0.10 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.22 -> arm 2.24, rise 0.02 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.05 -> arm 19.87, rise -0.19 against an allowed -0.00: PASSES
    gen CHECKDOWN: base 3.14 -> arm 3.17, rise 0.03 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 16.62 -> arm 16.00, rise -0.61 against an allowed 0.02: PASSES
    gen ON_THE_RUN: base 15.58 -> arm 14.19, rise -1.40 against an allowed -0.00: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D2 (pricing arm, never a design value): flat 0 | gen 0
```

### C14 (re-played) with D17, seed set 1

```text
ADR-089 step 4: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== C14 (re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 1.608 s | gen 1.694 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1211 of 51540 dropbacks (2.35 per 100); pressuredSacks 1211; pressured dropbacks 14256 (27.66 per 100) [time to throw 1.608 s]
    gen: sacks 537 of 28631 dropbacks (1.88 per 100); pressuredSacks 537; pressured dropbacks 8954 (31.27 per 100) [time to throw 1.694 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.49% | -13.53 against 22.02% (PR #33, FTN only (held)) | -6.97 against 15.46% (main) [time to throw 1.608 s]
    gen: 6.00% | -16.02 against 22.02% (PR #33, FTN only (held)) | -9.46 against 15.46% (main) [time to throw 1.694 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.66 % | gen 31.27 %
  hit_or_sack_rate: flat 3.04 % [time to throw 1.608 s] | gen 2.89 % [time to throw 1.694 s]
  sack_rate: flat 2.35 % [time to throw 1.608 s] | gen 1.88 % [time to throw 1.694 s]
  time_to_throw: flat 1.608 seconds | gen 1.694 seconds
  sack_share_of_hit_or_sack: flat 77.23 % [time to throw 1.608 s] | gen 64.93 % [time to throw 1.694 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.608 s] | gen 0.00 % [time to throw 1.694 s]
  release_distribution: flat 1.608 seconds | gen 1.694 seconds
  pressured_share_by_release_bin: flat 23.03 % | gen 27.71 %
  hit_rate_by_release_bin: flat 3.74 % [time to throw 1.608 s] | gen 3.38 % [time to throw 1.694 s]
  hits_on_aimed_throws_per_dropback: flat 0.69 % [time to throw 1.608 s] | gen 1.01 % [time to throw 1.694 s]
  first_pressure_seconds: flat 1.656 seconds | gen 1.790 seconds
  first_forcing_seconds: flat 1.934 seconds | gen 2.061 seconds
  first_arrival_seconds: flat 1.972 seconds | gen 2.063 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 28.45%, FREE_RUNNER 55.50%, WON_REP 16.04%; gen COUNTER 32.75%, FREE_RUNNER 46.59%, WON_REP 20.67%)
  quick_pressure_share_by_origin: flat 75.49 % | gen 69.05 %
  clean_with_live_won_rep_ticks: flat 0.07 % | gen 0.06 %
  clean_with_live_won_rep_dropbacks: flat 0.19 % | gen 0.14 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 21.22 % | gen 13.10 %
  throwaway_rate_clean: flat 16.61 % | gen 8.63 %
  scramble_rate: flat 1.90 % | gen 0.66 %
  scramble_yards: flat 6.30 yards | gen 5.52 yards
  by_down_fixed_calls: flat 8.85 % | gen 6.50 %
  int_per_aimed_throw: flat 2.79 % | gen 7.48 %
  completion_per_aimed_throw: flat 46.78 % | gen 43.03 %
  forced_throw_share: flat 11.84 % | gen 18.54 %
  completion_by_pocket_status: flat 25.10 % | gen 26.13 %
  qb_season_spread: flat 0.49 pp | gen 2.34 pp
  defence_season_spread: flat 0.20 pp | gen 0.87 pp
  unblocked_pressures_per_100: flat 16.22 per 100 dropbacks | gen 15.24 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 88.07 % [time to throw 1.608 s] | gen 81.98 % [time to throw 1.694 s]
  unblocked_men_per_100: flat 19.35 per 100 dropbacks | gen 18.39 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 16.54 % | gen 20.30 %
  quick_share_no_free_runner: flat 48.19 % | gen 44.87 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 20.22 % | gen 12.97 %
  situation_q1q3_last_two: flat 21.45 % | gen 13.77 %
  sack_share_of_contacts_in_out: flat 77.23 % [time to throw 1.608 s] | gen 64.93 % [time to throw 1.694 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.608 s] | gen 0.00 % [time to throw 1.694 s]
  sacker_mix.split.interior: flat 25.54 % [time to throw 1.608 s] | gen 28.77 % [time to throw 1.694 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 49.70 % [time to throw 1.608 s] | gen 50.28 % [time to throw 1.694 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.02 % [time to throw 1.608 s] | gen 20.67 % [time to throw 1.694 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.74 % [time to throw 1.608 s] | gen 0.28 % [time to throw 1.694 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 26.09 % [time to throw 1.608 s] | gen 29.05 % [time to throw 1.694 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 10.79 % | gen 12.86 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.44 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.25 % | gen 20.71 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.13 % | gen 3.14 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.54 % | gen 17.52 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.60 % | gen 16.22 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.85 % | gen 47.22 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.90 % | gen 19.48 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 47.04 % | gen 40.41 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.55 % | gen 22.04 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.43 % | gen 20.72 %
  nobody_open_share: flat 44.18 % of dropbacks | gen 34.79 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.43 % of dropbacks | gen 12.22 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.51 % of dropbacks | gen 10.66 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.89 % of dropbacks | gen 10.03 % of dropbacks
  nobody_open_share.split.SACK: flat 2.35 % of dropbacks [time to throw 1.608 s] | gen 1.88 % of dropbacks [time to throw 1.694 s]
  clean_checkdown_share: flat 19.88 % of clean aimed throws | gen 9.04 % of clean aimed throws
  clean_later_read_share: flat 14.51 % of clean aimed throws | gen 20.81 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.27, per aimed throw 2.79; forced-throw share 11.84; completion per attempt 38.04, per aimed throw 46.78; INT-source mix CONTESTED_CATCH 91.16, TIPPED_RECOVERY 8.84
      flat PROGRESSION: 20736 aimed, INT 0.35, completion 45.85
      flat RANK_PUSHED: 6826 aimed, INT 12.25, completion 17.90
      flat CHECKDOWN: 8982 aimed, INT 0.13, completion 47.04
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3357 aimed, INT 5.54, completion 27.55
      flat ON_THE_RUN: 232 aimed, INT 5.60, completion 25.43
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.60 against a real 3.25
    gen: INT per attempt 6.71, per aimed throw 7.48; forced-throw share 18.54; completion per attempt 38.60, per aimed throw 43.03; INT-source mix CONTESTED_CATCH 44.05, TIPPED_RECOVERY 55.95
      gen PROGRESSION: 14203 aimed, INT 2.44, completion 47.22
      gen RANK_PUSHED: 4168 aimed, INT 20.71, completion 19.48
      gen CHECKDOWN: 3499 aimed, INT 3.14, completion 40.41
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3053 aimed, INT 17.52, completion 22.04
      gen ON_THE_RUN: 111 aimed, INT 16.22, completion 20.72
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.22 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D17 (information, the build check under shape L): release clock the decision tick ==
  time to throw: flat 1.870 s | gen 1.961 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 906 of 52061 dropbacks (1.74 per 100); pressuredSacks 906; pressured dropbacks 14331 (27.53 per 100) [time to throw 1.870 s]
    gen: sacks 397 of 28889 dropbacks (1.37 per 100); pressuredSacks 397; pressured dropbacks 9014 (31.20 per 100) [time to throw 1.961 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 6.32% | -15.70 against 22.02% (PR #33, FTN only (held)) | -9.14 against 15.46% (main) [time to throw 1.870 s]
    gen: 4.40% | -17.62 against 22.02% (PR #33, FTN only (held)) | -11.06 against 15.46% (main) [time to throw 1.961 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.53 % | gen 31.20 %
  hit_or_sack_rate: flat 6.63 % [time to throw 1.870 s] | gen 9.35 % [time to throw 1.961 s]
  sack_rate: flat 1.74 % [time to throw 1.870 s] | gen 1.37 % [time to throw 1.961 s]
  time_to_throw: flat 1.870 seconds | gen 1.961 seconds
  sack_share_of_hit_or_sack: flat 26.23 % [time to throw 1.870 s] | gen 14.69 % [time to throw 1.961 s]
  qb_hit_on_scramble: flat 3.77 % [time to throw 1.870 s] | gen 2.04 % [time to throw 1.961 s]
  release_distribution: flat 1.870 seconds | gen 1.961 seconds
  pressured_share_by_release_bin: flat 24.08 % | gen 28.58 %
  hit_rate_by_release_bin: flat 8.36 % [time to throw 1.870 s] | gen 11.26 % [time to throw 1.961 s]
  hits_on_aimed_throws_per_dropback: flat 4.44 % [time to throw 1.870 s] | gen 7.54 % [time to throw 1.961 s]
  first_pressure_seconds: flat 1.655 seconds | gen 1.792 seconds
  first_forcing_seconds: flat 1.938 seconds | gen 2.059 seconds
  first_arrival_seconds: flat 1.974 seconds | gen 2.083 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 28.41%, FREE_RUNNER 55.34%, WON_REP 16.25%; gen COUNTER 32.73%, FREE_RUNNER 46.23%, WON_REP 21.04%)
  quick_pressure_share_by_origin: flat 75.79 % | gen 69.03 %
  clean_with_live_won_rep_ticks: flat 0.07 % | gen 0.06 %
  clean_with_live_won_rep_dropbacks: flat 0.18 % | gen 0.15 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 23.04 % | gen 14.53 %
  throwaway_rate_clean: flat 16.71 % | gen 8.48 %
  scramble_rate: flat 2.04 % | gen 0.68 %
  scramble_yards: flat 6.07 yards | gen 6.25 yards
  by_down_fixed_calls: flat 6.76 % | gen 4.34 %
  int_per_aimed_throw: flat 2.76 % | gen 7.41 %
  completion_per_aimed_throw: flat 46.42 % | gen 42.58 %
  forced_throw_share: flat 11.86 % | gen 18.68 %
  completion_by_pocket_status: flat 23.31 % | gen 24.11 %
  qb_season_spread: flat 0.00 pp | gen 1.95 pp
  defence_season_spread: flat 0.36 pp | gen 0.95 pp
  unblocked_pressures_per_100: flat 16.11 per 100 dropbacks | gen 15.16 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 38.77 % [time to throw 1.870 s] | gen 25.54 % [time to throw 1.961 s]
  unblocked_men_per_100: flat 19.29 per 100 dropbacks | gen 18.33 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 16.81 % | gen 20.53 %
  quick_share_no_free_runner: flat 49.09 % | gen 45.04 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 22.27 % | gen 14.43 %
  situation_q1q3_last_two: flat 22.07 % | gen 15.80 %
  sack_share_of_contacts_in_out: flat 57.74 % [time to throw 1.870 s] | gen 46.22 % [time to throw 1.961 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.870 s] | gen 0.00 % [time to throw 1.961 s]
  sacker_mix.split.interior: flat 25.59 % [time to throw 1.870 s] | gen 26.95 % [time to throw 1.961 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 49.45 % [time to throw 1.870 s] | gen 50.50 % [time to throw 1.961 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.41 % [time to throw 1.870 s] | gen 22.29 % [time to throw 1.961 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.55 % [time to throw 1.870 s] | gen 0.25 % [time to throw 1.961 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 26.27 % [time to throw 1.870 s] | gen 27.20 % [time to throw 1.961 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 11.02 % | gen 12.93 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.39 % | gen 2.45 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.90 % | gen 20.40 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.08 % | gen 3.12 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.64 % | gen 17.03 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.97 % | gen 16.39 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.58 % | gen 47.15 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.93 % | gen 19.13 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.39 % | gen 39.65 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.18 % | gen 20.18 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.41 % | gen 22.95 %
  nobody_open_share: flat 43.89 % of dropbacks | gen 34.71 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.22 % of dropbacks | gen 12.19 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.47 % of dropbacks | gen 10.77 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 18.46 % of dropbacks | gen 10.37 % of dropbacks
  nobody_open_share.split.SACK: flat 1.74 % of dropbacks [time to throw 1.870 s] | gen 1.37 % of dropbacks [time to throw 1.961 s]
  clean_checkdown_share: flat 19.80 % of clean aimed throws | gen 9.02 % of clean aimed throws
  clean_later_read_share: flat 14.74 % of clean aimed throws | gen 21.00 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.23, per aimed throw 2.76; forced-throw share 11.86; completion per attempt 37.52, per aimed throw 46.42; INT-source mix CONTESTED_CATCH 90.79, TIPPED_RECOVERY 9.21
      flat PROGRESSION: 20993 aimed, INT 0.39, completion 45.58
      flat RANK_PUSHED: 6917 aimed, INT 11.90, completion 17.93
      flat CHECKDOWN: 8966 aimed, INT 0.08, completion 46.39
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3367 aimed, INT 5.64, completion 27.18
      flat ON_THE_RUN: 244 aimed, INT 6.97, completion 25.41
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.97 against a real 3.25
    gen: INT per attempt 6.62, per aimed throw 7.41; forced-throw share 18.68; completion per attempt 38.07, per aimed throw 42.58; INT-source mix CONTESTED_CATCH 44.45, TIPPED_RECOVERY 55.55
      gen PROGRESSION: 14313 aimed, INT 2.45, completion 47.15
      gen RANK_PUSHED: 4230 aimed, INT 20.40, completion 19.13
      gen CHECKDOWN: 3523 aimed, INT 3.12, completion 39.65
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3112 aimed, INT 17.03, completion 20.18
      gen ON_THE_RUN: 122 aimed, INT 16.39, completion 22.95
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.39 against a real 3.25
    the filed guard against C14 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.79 -> arm 2.76, rise -0.03 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.35 -> arm 0.39, rise 0.03 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 12.25 -> arm 11.90, rise -0.35 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.13 -> arm 0.08, rise -0.06 against an allowed -0.01: PASSES
    flat DESPERATION: base 5.54 -> arm 5.64, rise 0.10 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 5.60 -> arm 6.97, rise 1.36 against an allowed -0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.48 -> arm 7.41, rise -0.07 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.44 -> arm 2.45, rise 0.01 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.71 -> arm 20.40, rise -0.30 against an allowed 0.00: PASSES
    gen CHECKDOWN: base 3.14 -> arm 3.12, rise -0.02 against an allowed -0.00: PASSES
    gen DESPERATION: base 17.52 -> arm 17.03, rise -0.49 against an allowed -0.00: PASSES
    gen ON_THE_RUN: base 16.22 -> arm 16.39, rise 0.18 against an allowed -0.04: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C14 (re-played): flat 2762 | gen 2292
```

### C1 (re-played) with D1, D5, D7, seed set 2

```text
ADR-089 step 4: the pocket report (4 arms; both leagues; every hit and sack figure with its time to throw beside it)

== C1 (re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 1.606 s | gen 1.748 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1336 of 51427 dropbacks (2.60 per 100); pressuredSacks 1336; pressured dropbacks 11373 (22.11 per 100) [time to throw 1.606 s]
    gen: sacks 610 of 28335 dropbacks (2.15 per 100); pressuredSacks 610; pressured dropbacks 7063 (24.93 per 100) [time to throw 1.748 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.75% | -10.27 against 22.02% (PR #33, FTN only (held)) | -3.71 against 15.46% (main) [time to throw 1.606 s]
    gen: 8.64% | -13.38 against 22.02% (PR #33, FTN only (held)) | -6.82 against 15.46% (main) [time to throw 1.748 s]
  rows (66, both leagues):
  threat_creation_rate: flat 22.11 % | gen 24.93 %
  hit_or_sack_rate: flat 3.42 % [time to throw 1.606 s] | gen 3.49 % [time to throw 1.748 s]
  sack_rate: flat 2.60 % [time to throw 1.606 s] | gen 2.15 % [time to throw 1.748 s]
  time_to_throw: flat 1.606 seconds | gen 1.748 seconds
  sack_share_of_hit_or_sack: flat 76.04 % [time to throw 1.606 s] | gen 61.68 % [time to throw 1.748 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.606 s] | gen 0.00 % [time to throw 1.748 s]
  release_distribution: flat 1.606 seconds | gen 1.748 seconds
  pressured_share_by_release_bin: flat 15.50 % | gen 20.28 %
  hit_rate_by_release_bin: flat 4.56 % [time to throw 1.606 s] | gen 4.58 % [time to throw 1.748 s]
  hits_on_aimed_throws_per_dropback: flat 0.82 % [time to throw 1.606 s] | gen 1.34 % [time to throw 1.748 s]
  first_pressure_seconds: flat 1.394 seconds | gen 1.565 seconds
  first_forcing_seconds: flat 1.745 seconds | gen 1.900 seconds
  first_arrival_seconds: flat 1.891 seconds | gen 1.981 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.74%, FREE_RUNNER 69.95%, WON_REP 26.31%; gen COUNTER 3.83%, FREE_RUNNER 64.40%, WON_REP 31.77%)
  quick_pressure_share_by_origin: flat 88.42 % | gen 80.73 %
  clean_with_live_won_rep_ticks: flat 0.42 % | gen 0.50 %
  clean_with_live_won_rep_dropbacks: flat 1.20 % | gen 1.54 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.12 % | gen 8.99 %
  throwaway_rate_clean: flat 18.68 % | gen 8.39 %
  scramble_rate: flat 2.19 % | gen 0.52 %
  scramble_yards: flat 5.23 yards | gen 3.93 yards
  by_down_fixed_calls: flat 11.01 % | gen 11.42 %
  int_per_aimed_throw: flat 2.72 % | gen 7.68 %
  completion_per_aimed_throw: flat 46.91 % | gen 43.37 %
  forced_throw_share: flat 10.95 % | gen 17.22 %
  completion_by_pocket_status: flat 29.21 % | gen 29.45 %
  qb_season_spread: flat 0.00 pp | gen 3.81 pp
  defence_season_spread: flat 0.00 pp | gen 1.00 pp
  unblocked_pressures_per_100: flat 15.87 per 100 dropbacks | gen 15.92 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 76.49 % [time to throw 1.606 s] | gen 72.19 % [time to throw 1.748 s]
  unblocked_men_per_100: flat 19.07 per 100 dropbacks | gen 19.12 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.80 % | gen 10.00 %
  quick_share_no_free_runner: flat 72.66 % | gen 58.94 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 14.22 % | gen 9.01 %
  situation_q1q3_last_two: flat 11.10 % | gen 8.98 %
  sack_share_of_contacts_in_out: flat 76.04 % [time to throw 1.606 s] | gen 61.68 % [time to throw 1.748 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.606 s] | gen 0.00 % [time to throw 1.748 s]
  sacker_mix.split.interior: flat 32.09 % [time to throw 1.606 s] | gen 34.99 % [time to throw 1.748 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.49 % [time to throw 1.606 s] | gen 46.58 % [time to throw 1.748 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 20.56 % [time to throw 1.606 s] | gen 18.27 % [time to throw 1.748 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.86 % [time to throw 1.606 s] | gen 0.16 % [time to throw 1.748 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.81 % [time to throw 1.606 s] | gen 34.92 % [time to throw 1.748 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 2.24 % | gen 3.08 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.75 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.81 % | gen 21.16 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.22 % | gen 3.94 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.44 % | gen 16.89 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 4.39 % | gen 12.35 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.57 % | gen 46.67 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.33 % | gen 19.26 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.72 % | gen 42.38 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.24 % | gen 21.26 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.80 % | gen 18.52 %
  nobody_open_share: flat 44.18 % of dropbacks | gen 32.38 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.59 % of dropbacks | gen 10.84 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.54 % of dropbacks | gen 10.84 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.45 % of dropbacks | gen 8.54 % of dropbacks
  nobody_open_share.split.SACK: flat 2.60 % of dropbacks [time to throw 1.606 s] | gen 2.15 % of dropbacks [time to throw 1.748 s]
  clean_checkdown_share: flat 19.74 % of clean aimed throws | gen 6.98 % of clean aimed throws
  clean_later_read_share: flat 15.11 % of clean aimed throws | gen 21.84 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.22, per aimed throw 2.72; forced-throw share 10.95; completion per attempt 38.31, per aimed throw 46.91; INT-source mix CONTESTED_CATCH 90.43, TIPPED_RECOVERY 9.57
      flat PROGRESSION: 20584 aimed, INT 0.35, completion 45.57
      flat RANK_PUSHED: 6790 aimed, INT 11.81, completion 17.33
      flat CHECKDOWN: 9047 aimed, INT 0.22, completion 46.72
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3365 aimed, INT 5.44, completion 29.24
      flat ON_THE_RUN: 205 aimed, INT 4.39, completion 27.80
      flat on the run: clean INT n/a against a real 2.11; pressured INT 4.39 against a real 3.25
    gen: INT per attempt 7.01, per aimed throw 7.68; forced-throw share 17.22; completion per attempt 39.56, per aimed throw 43.37; INT-source mix CONTESTED_CATCH 44.18, TIPPED_RECOVERY 55.82
      gen PROGRESSION: 14794 aimed, INT 2.75, completion 46.67
      gen RANK_PUSHED: 4139 aimed, INT 21.16, completion 19.26
      gen CHECKDOWN: 3072 aimed, INT 3.94, completion 42.38
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3072 aimed, INT 16.89, completion 21.26
      gen ON_THE_RUN: 81 aimed, INT 12.35, completion 18.52
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.35 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D1 (design): release clock the decision tick ==
  time to throw: flat 1.872 s | gen 2.010 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 982 of 51981 dropbacks (1.89 per 100); pressuredSacks 982; pressured dropbacks 11414 (21.96 per 100) [time to throw 1.872 s]
    gen: sacks 406 of 28571 dropbacks (1.42 per 100); pressuredSacks 406; pressured dropbacks 7115 (24.90 per 100) [time to throw 2.010 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.60% | -13.42 against 22.02% (PR #33, FTN only (held)) | -6.86 against 15.46% (main) [time to throw 1.872 s]
    gen: 5.71% | -16.31 against 22.02% (PR #33, FTN only (held)) | -9.75 against 15.46% (main) [time to throw 2.010 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.96 % | gen 24.90 %
  hit_or_sack_rate: flat 7.74 % [time to throw 1.872 s] | gen 10.66 % [time to throw 2.010 s]
  sack_rate: flat 1.89 % [time to throw 1.872 s] | gen 1.42 % [time to throw 2.010 s]
  time_to_throw: flat 1.872 seconds | gen 2.010 seconds
  sack_share_of_hit_or_sack: flat 24.40 % [time to throw 1.872 s] | gen 13.33 % [time to throw 2.010 s]
  qb_hit_on_scramble: flat 3.72 % [time to throw 1.872 s] | gen 3.65 % [time to throw 2.010 s]
  release_distribution: flat 1.872 seconds | gen 2.010 seconds
  pressured_share_by_release_bin: flat 16.80 % | gen 21.22 %
  hit_rate_by_release_bin: flat 11.52 % [time to throw 1.872 s] | gen 12.75 % [time to throw 2.010 s]
  hits_on_aimed_throws_per_dropback: flat 5.34 % [time to throw 1.872 s] | gen 8.66 % [time to throw 2.010 s]
  first_pressure_seconds: flat 1.393 seconds | gen 1.567 seconds
  first_forcing_seconds: flat 1.745 seconds | gen 1.898 seconds
  first_arrival_seconds: flat 1.894 seconds | gen 1.985 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.69%, FREE_RUNNER 69.66%, WON_REP 26.64%; gen COUNTER 3.92%, FREE_RUNNER 64.25%, WON_REP 31.83%)
  quick_pressure_share_by_origin: flat 88.47 % | gen 80.69 %
  clean_with_live_won_rep_ticks: flat 0.41 % | gen 0.53 %
  clean_with_live_won_rep_dropbacks: flat 1.17 % | gen 1.62 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.70 % | gen 11.16 %
  throwaway_rate_clean: flat 18.66 % | gen 8.13 %
  scramble_rate: flat 2.17 % | gen 0.48 %
  scramble_yards: flat 5.21 yards | gen 4.08 yards
  by_down_fixed_calls: flat 8.28 % | gen 7.33 %
  int_per_aimed_throw: flat 2.73 % | gen 7.65 %
  completion_per_aimed_throw: flat 46.49 % | gen 42.97 %
  forced_throw_share: flat 10.99 % | gen 17.12 %
  completion_by_pocket_status: flat 26.75 % | gen 26.13 %
  qb_season_spread: flat 0.00 pp | gen 2.21 pp
  defence_season_spread: flat 0.00 pp | gen 1.41 pp
  unblocked_pressures_per_100: flat 15.77 per 100 dropbacks | gen 15.85 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 32.62 % [time to throw 1.872 s] | gen 22.95 % [time to throw 2.010 s]
  unblocked_men_per_100: flat 19.01 per 100 dropbacks | gen 19.12 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.26 % | gen 10.70 %
  quick_share_no_free_runner: flat 72.21 % | gen 59.89 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.08 % | gen 11.53 %
  situation_q1q3_last_two: flat 13.72 % | gen 10.25 %
  sack_share_of_contacts_in_out: flat 55.76 % [time to throw 1.872 s] | gen 41.73 % [time to throw 2.010 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.872 s] | gen 0.00 % [time to throw 2.010 s]
  sacker_mix.split.interior: flat 31.84 % [time to throw 1.872 s] | gen 32.70 % [time to throw 2.010 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 45.64 % [time to throw 1.872 s] | gen 47.54 % [time to throw 2.010 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.96 % [time to throw 1.872 s] | gen 19.52 % [time to throw 2.010 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.56 % [time to throw 1.872 s] | gen 0.25 % [time to throw 2.010 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.36 % [time to throw 1.872 s] | gen 33.00 % [time to throw 2.010 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 2.18 % | gen 3.66 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.37 % | gen 2.73 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.80 % | gen 21.31 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 3.59 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.67 % | gen 16.95 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 4.95 % | gen 15.73 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.80 % | gen 46.68 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.77 % | gen 19.41 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.39 % | gen 39.91 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.43 % | gen 20.28 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.23 % | gen 16.85 %
  nobody_open_share: flat 44.04 % of dropbacks | gen 31.43 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.52 % of dropbacks | gen 10.72 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.62 % of dropbacks | gen 10.41 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 18.01 % of dropbacks | gen 8.88 % of dropbacks
  nobody_open_share.split.SACK: flat 1.89 % of dropbacks [time to throw 1.872 s] | gen 1.42 % of dropbacks [time to throw 2.010 s]
  clean_checkdown_share: flat 19.62 % of clean aimed throws | gen 6.90 % of clean aimed throws
  clean_later_read_share: flat 15.01 % of clean aimed throws | gen 21.74 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.21, per aimed throw 2.73; forced-throw share 10.99; completion per attempt 37.76, per aimed throw 46.49; INT-source mix CONTESTED_CATCH 91.03, TIPPED_RECOVERY 8.97
      flat PROGRESSION: 20913 aimed, INT 0.37, completion 45.80
      flat RANK_PUSHED: 6823 aimed, INT 11.80, completion 16.77
      flat CHECKDOWN: 9109 aimed, INT 0.18, completion 45.39
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3441 aimed, INT 5.67, completion 27.43
      flat ON_THE_RUN: 222 aimed, INT 4.95, completion 25.23
      flat on the run: clean INT n/a against a real 2.11; pressured INT 4.95 against a real 3.25
    gen: INT per attempt 6.95, per aimed throw 7.65; forced-throw share 17.12; completion per attempt 39.08, per aimed throw 42.97; INT-source mix CONTESTED_CATCH 46.02, TIPPED_RECOVERY 53.98
      gen PROGRESSION: 15105 aimed, INT 2.73, completion 46.68
      gen RANK_PUSHED: 4261 aimed, INT 21.31, completion 19.41
      gen CHECKDOWN: 3062 aimed, INT 3.59, completion 39.91
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2973 aimed, INT 16.95, completion 20.28
      gen ON_THE_RUN: 89 aimed, INT 15.73, completion 16.85
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.73 against a real 3.25
    the filed guard against C1 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.72 -> arm 2.73, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.35 -> arm 0.37, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.81 -> arm 11.80, rise -0.01 against an allowed 0.00: PASSES
    flat CHECKDOWN: base 0.22 -> arm 0.18, rise -0.05 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.44 -> arm 5.67, rise 0.23 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 4.39 -> arm 4.95, rise 0.56 against an allowed -0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.68 -> arm 7.65, rise -0.04 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.75 -> arm 2.73, rise -0.02 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 21.16 -> arm 21.31, rise 0.15 against an allowed 0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.94 -> arm 3.59, rise -0.35 against an allowed -0.01: PASSES
    gen DESPERATION: base 16.89 -> arm 16.95, rise 0.06 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 12.35 -> arm 15.73, rise 3.38 against an allowed -0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C1 (re-played): flat 3202 | gen 2619

== D5 (printed beside the motion clauses): release clock the decision tick ==
  time to throw: flat 1.871 s | gen 2.009 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1314 of 51575 dropbacks (2.55 per 100); pressuredSacks 1314; pressured dropbacks 11342 (21.99 per 100) [time to throw 1.871 s]
    gen: sacks 597 of 28530 dropbacks (2.09 per 100); pressuredSacks 597; pressured dropbacks 7036 (24.66 per 100) [time to throw 2.009 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.59% | -10.43 against 22.02% (PR #33, FTN only (held)) | -3.87 against 15.46% (main) [time to throw 1.871 s]
    gen: 8.48% | -13.54 against 22.02% (PR #33, FTN only (held)) | -6.98 against 15.46% (main) [time to throw 2.009 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.99 % | gen 24.66 %
  hit_or_sack_rate: flat 7.76 % [time to throw 1.871 s] | gen 10.60 % [time to throw 2.009 s]
  sack_rate: flat 2.55 % [time to throw 1.871 s] | gen 2.09 % [time to throw 2.009 s]
  time_to_throw: flat 1.871 seconds | gen 2.009 seconds
  sack_share_of_hit_or_sack: flat 32.83 % [time to throw 1.871 s] | gen 19.74 % [time to throw 2.009 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.871 s] | gen 0.00 % [time to throw 2.009 s]
  release_distribution: flat 1.871 seconds | gen 2.009 seconds
  pressured_share_by_release_bin: flat 15.33 % | gen 19.86 %
  hit_rate_by_release_bin: flat 11.12 % [time to throw 1.871 s] | gen 12.83 % [time to throw 2.009 s]
  hits_on_aimed_throws_per_dropback: flat 5.21 % [time to throw 1.871 s] | gen 8.51 % [time to throw 2.009 s]
  first_pressure_seconds: flat 1.391 seconds | gen 1.566 seconds
  first_forcing_seconds: flat 1.745 seconds | gen 1.897 seconds
  first_arrival_seconds: flat 1.888 seconds | gen 1.983 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.64%, FREE_RUNNER 70.01%, WON_REP 26.35%; gen COUNTER 3.96%, FREE_RUNNER 63.95%, WON_REP 32.10%)
  quick_pressure_share_by_origin: flat 88.57 % | gen 80.71 %
  clean_with_live_won_rep_ticks: flat 0.42 % | gen 0.53 %
  clean_with_live_won_rep_dropbacks: flat 1.18 % | gen 1.62 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.36 % | gen 8.91 %
  throwaway_rate_clean: flat 18.64 % | gen 8.28 %
  scramble_rate: flat 2.14 % | gen 0.50 %
  scramble_yards: flat 5.42 yards | gen 4.35 yards
  by_down_fixed_calls: flat 10.93 % | gen 11.55 %
  int_per_aimed_throw: flat 2.73 % | gen 7.53 %
  completion_per_aimed_throw: flat 46.73 % | gen 42.92 %
  forced_throw_share: flat 10.84 % | gen 16.99 %
  completion_by_pocket_status: flat 27.56 % | gen 26.66 %
  qb_season_spread: flat 0.00 pp | gen 3.87 pp
  defence_season_spread: flat 0.00 pp | gen 1.08 pp
  unblocked_pressures_per_100: flat 15.83 per 100 dropbacks | gen 15.70 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 33.42 % [time to throw 1.871 s] | gen 22.92 % [time to throw 2.009 s]
  unblocked_men_per_100: flat 19.08 per 100 dropbacks | gen 18.98 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.75 % | gen 10.26 %
  quick_share_no_free_runner: flat 72.62 % | gen 59.56 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 14.37 % | gen 9.26 %
  situation_q1q3_last_two: flat 10.66 % | gen 8.95 %
  sack_share_of_contacts_in_out: flat 75.69 % [time to throw 1.871 s] | gen 61.87 % [time to throw 2.009 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.871 s] | gen 0.00 % [time to throw 2.009 s]
  sacker_mix.split.interior: flat 31.86 % [time to throw 1.871 s] | gen 35.52 % [time to throw 2.009 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.36 % [time to throw 1.871 s] | gen 45.56 % [time to throw 2.009 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 20.98 % [time to throw 1.871 s] | gen 18.75 % [time to throw 2.009 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.80 % [time to throw 1.871 s] | gen 0.17 % [time to throw 2.009 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.74 % [time to throw 1.871 s] | gen 35.68 % [time to throw 2.009 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 2.22 % | gen 3.58 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.67 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.98 % | gen 21.09 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 3.56 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.25 % | gen 16.90 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.19 % | gen 13.41 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.94 % | gen 46.60 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.07 % | gen 19.13 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.57 % | gen 39.51 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.69 % | gen 20.54 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.83 % | gen 19.51 %
  nobody_open_share: flat 44.14 % of dropbacks | gen 31.73 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.46 % of dropbacks | gen 10.73 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.65 % of dropbacks | gen 10.48 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.48 % of dropbacks | gen 8.44 % of dropbacks
  nobody_open_share.split.SACK: flat 2.55 % of dropbacks [time to throw 1.871 s] | gen 2.09 % of dropbacks [time to throw 2.009 s]
  clean_checkdown_share: flat 19.54 % of clean aimed throws | gen 6.96 % of clean aimed throws
  clean_later_read_share: flat 15.00 % of clean aimed throws | gen 21.76 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.23, per aimed throw 2.73; forced-throw share 10.84; completion per attempt 38.16, per aimed throw 46.73; INT-source mix CONTESTED_CATCH 90.95, TIPPED_RECOVERY 9.05
      flat PROGRESSION: 20716 aimed, INT 0.35, completion 45.94
      flat RANK_PUSHED: 6776 aimed, INT 11.98, completion 17.07
      flat CHECKDOWN: 9005 aimed, INT 0.21, completion 45.57
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3431 aimed, INT 5.25, completion 27.69
      flat ON_THE_RUN: 212 aimed, INT 5.19, completion 27.83
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.19 against a real 3.25
    gen: INT per attempt 6.88, per aimed throw 7.53; forced-throw share 16.99; completion per attempt 39.21, per aimed throw 42.92; INT-source mix CONTESTED_CATCH 46.05, TIPPED_RECOVERY 53.95
      gen PROGRESSION: 15061 aimed, INT 2.67, completion 46.60
      gen RANK_PUSHED: 4192 aimed, INT 21.09, completion 19.13
      gen CHECKDOWN: 3060 aimed, INT 3.56, completion 39.51
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2989 aimed, INT 16.90, completion 20.54
      gen ON_THE_RUN: 82 aimed, INT 13.41, completion 19.51
      gen on the run: clean INT n/a against a real 2.11; pressured INT 13.41 against a real 3.25
    the filed guard against C1 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.72 -> arm 2.73, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.35 -> arm 0.35, rise -0.01 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.81 -> arm 11.98, rise 0.17 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.22 -> arm 0.21, rise -0.01 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.44 -> arm 5.25, rise -0.19 against an allowed 0.00: PASSES
    flat ON_THE_RUN: base 4.39 -> arm 5.19, rise 0.80 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.68 -> arm 7.53, rise -0.16 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.75 -> arm 2.67, rise -0.08 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 21.16 -> arm 21.09, rise -0.08 against an allowed 0.01: PASSES
    gen CHECKDOWN: base 3.94 -> arm 3.56, rise -0.38 against an allowed -0.01: PASSES
    gen DESPERATION: base 16.89 -> arm 16.90, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 12.35 -> arm 13.41, rise 1.07 against an allowed -0.04: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C1 (re-played): flat 2287 | gen 2072

== D7 (printed, reported direction only): release clock the decision tick ==
  time to throw: flat 1.609 s | gen 1.751 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 969 of 51814 dropbacks (1.87 per 100); pressuredSacks 969; pressured dropbacks 11396 (21.99 per 100) [time to throw 1.609 s]
    gen: sacks 404 of 28433 dropbacks (1.42 per 100); pressuredSacks 404; pressured dropbacks 7086 (24.92 per 100) [time to throw 1.751 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.50% | -13.52 against 22.02% (PR #33, FTN only (held)) | -6.96 against 15.46% (main) [time to throw 1.609 s]
    gen: 5.70% | -16.32 against 22.02% (PR #33, FTN only (held)) | -9.76 against 15.46% (main) [time to throw 1.751 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.99 % | gen 24.92 %
  hit_or_sack_rate: flat 3.30 % [time to throw 1.609 s] | gen 3.41 % [time to throw 1.751 s]
  sack_rate: flat 1.87 % [time to throw 1.609 s] | gen 1.42 % [time to throw 1.751 s]
  time_to_throw: flat 1.609 seconds | gen 1.751 seconds
  sack_share_of_hit_or_sack: flat 56.67 % [time to throw 1.609 s] | gen 41.69 % [time to throw 1.751 s]
  qb_hit_on_scramble: flat 3.66 % [time to throw 1.609 s] | gen 2.05 % [time to throw 1.751 s]
  release_distribution: flat 1.609 seconds | gen 1.751 seconds
  pressured_share_by_release_bin: flat 16.92 % | gen 21.23 %
  hit_rate_by_release_bin: flat 4.85 % [time to throw 1.609 s] | gen 4.55 % [time to throw 1.751 s]
  hits_on_aimed_throws_per_dropback: flat 0.91 % [time to throw 1.609 s] | gen 1.41 % [time to throw 1.751 s]
  first_pressure_seconds: flat 1.392 seconds | gen 1.569 seconds
  first_forcing_seconds: flat 1.743 seconds | gen 1.902 seconds
  first_arrival_seconds: flat 1.899 seconds | gen 1.985 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.73%, FREE_RUNNER 70.01%, WON_REP 26.27%; gen COUNTER 4.00%, FREE_RUNNER 64.30%, WON_REP 31.71%)
  quick_pressure_share_by_origin: flat 88.48 % | gen 80.52 %
  clean_with_live_won_rep_ticks: flat 0.42 % | gen 0.51 %
  clean_with_live_won_rep_dropbacks: flat 1.18 % | gen 1.57 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.62 % | gen 11.22 %
  throwaway_rate_clean: flat 18.55 % | gen 8.13 %
  scramble_rate: flat 2.21 % | gen 0.51 %
  scramble_yards: flat 5.49 yards | gen 3.36 yards
  by_down_fixed_calls: flat 8.25 % | gen 7.62 %
  int_per_aimed_throw: flat 2.73 % | gen 7.77 %
  completion_per_aimed_throw: flat 46.73 % | gen 43.38 %
  forced_throw_share: flat 11.01 % | gen 17.21 %
  completion_by_pocket_status: flat 28.37 % | gen 28.40 %
  qb_season_spread: flat 0.00 pp | gen 2.23 pp
  defence_season_spread: flat 0.00 pp | gen 1.52 pp
  unblocked_pressures_per_100: flat 15.84 per 100 dropbacks | gen 15.84 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 75.67 % [time to throw 1.609 s] | gen 71.62 % [time to throw 1.751 s]
  unblocked_men_per_100: flat 19.06 per 100 dropbacks | gen 19.15 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.10 % | gen 10.41 %
  quick_share_no_free_runner: flat 72.20 % | gen 59.45 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.32 % | gen 10.67 %
  situation_q1q3_last_two: flat 14.30 % | gen 11.02 %
  sack_share_of_contacts_in_out: flat 55.31 % [time to throw 1.609 s] | gen 41.56 % [time to throw 1.751 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.609 s] | gen 0.00 % [time to throw 1.751 s]
  sacker_mix.split.interior: flat 33.02 % [time to throw 1.609 s] | gen 32.94 % [time to throw 1.751 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.98 % [time to throw 1.609 s] | gen 47.07 % [time to throw 1.751 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.48 % [time to throw 1.609 s] | gen 19.74 % [time to throw 1.751 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.52 % [time to throw 1.609 s] | gen 0.25 % [time to throw 1.751 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.30 % [time to throw 1.609 s] | gen 33.17 % [time to throw 1.751 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 2.12 % | gen 3.43 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.38 % | gen 2.76 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.78 % | gen 21.66 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.22 % | gen 4.10 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.55 % | gen 16.79 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 3.79 % | gen 13.33 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.51 % | gen 46.64 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.14 % | gen 19.15 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.65 % | gen 42.68 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.44 % | gen 21.41 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.54 % | gen 16.67 %
  nobody_open_share: flat 44.04 % of dropbacks | gen 31.77 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.65 % of dropbacks | gen 10.80 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.61 % of dropbacks | gen 10.64 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.90 % of dropbacks | gen 8.90 % of dropbacks
  nobody_open_share.split.SACK: flat 1.87 % of dropbacks [time to throw 1.609 s] | gen 1.42 % of dropbacks [time to throw 1.751 s]
  clean_checkdown_share: flat 19.82 % of clean aimed throws | gen 6.92 % of clean aimed throws
  clean_later_read_share: flat 15.12 % of clean aimed throws | gen 21.87 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.22, per aimed throw 2.73; forced-throw share 11.01; completion per attempt 38.01, per aimed throw 46.73; INT-source mix CONTESTED_CATCH 90.40, TIPPED_RECOVERY 9.60
      flat PROGRESSION: 20778 aimed, INT 0.38, completion 45.51
      flat RANK_PUSHED: 6860 aimed, INT 11.78, completion 17.14
      flat CHECKDOWN: 9147 aimed, INT 0.22, completion 46.65
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3425 aimed, INT 5.55, completion 28.44
      flat ON_THE_RUN: 211 aimed, INT 3.79, completion 26.54
      flat on the run: clean INT n/a against a real 2.11; pressured INT 3.79 against a real 3.25
    gen: INT per attempt 7.07, per aimed throw 7.77; forced-throw share 17.21; completion per attempt 39.44, per aimed throw 43.38; INT-source mix CONTESTED_CATCH 44.19, TIPPED_RECOVERY 55.81
      gen PROGRESSION: 14950 aimed, INT 2.76, completion 46.64
      gen RANK_PUSHED: 4215 aimed, INT 21.66, completion 19.15
      gen CHECKDOWN: 3072 aimed, INT 4.10, completion 42.68
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3026 aimed, INT 16.79, completion 21.41
      gen ON_THE_RUN: 90 aimed, INT 13.33, completion 16.67
      gen on the run: clean INT n/a against a real 2.11; pressured INT 13.33 against a real 3.25
    the filed guard against C1 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.72 -> arm 2.73, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.35 -> arm 0.38, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.81 -> arm 11.78, rise -0.03 against an allowed 0.01: PASSES
    flat CHECKDOWN: base 0.22 -> arm 0.22, rise -0.00 against an allowed -0.00: PASSES
    flat DESPERATION: base 5.44 -> arm 5.55, rise 0.11 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 4.39 -> arm 3.79, rise -0.60 against an allowed -0.01: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.68 -> arm 7.77, rise 0.09 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 2.75 -> arm 2.76, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 21.16 -> arm 21.66, rise 0.50 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.94 -> arm 4.10, rise 0.16 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 16.89 -> arm 16.79, rise -0.11 against an allowed 0.00: PASSES
    gen ON_THE_RUN: base 12.35 -> arm 13.33, rise 0.99 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C1 (re-played): flat 875 | gen 518
```

### C2 (re-played) with D2, D6, D8, seed set 2

```text
ADR-089 step 4: the pocket report (4 arms; both leagues; every hit and sack figure with its time to throw beside it)

== C2 (re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 2.739 s | gen 2.717 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2996 of 48761 dropbacks (6.14 per 100); pressuredSacks 2996; pressured dropbacks 20036 (41.09 per 100) [time to throw 2.739 s]
    gen: sacks 1839 of 27016 dropbacks (6.81 per 100); pressuredSacks 1793; pressured dropbacks 11420 (42.27 per 100) [time to throw 2.717 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 14.95% | -7.07 against 22.02% (PR #33, FTN only (held)) | -0.51 against 15.46% (main) [time to throw 2.739 s]
    gen: 15.70% | -6.32 against 22.02% (PR #33, FTN only (held)) | 0.24 against 15.46% (main) [time to throw 2.717 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.09 % | gen 42.27 %
  hit_or_sack_rate: flat 8.68 % [time to throw 2.739 s] | gen 11.62 % [time to throw 2.717 s]
  sack_rate: flat 6.14 % [time to throw 2.739 s] | gen 6.81 % [time to throw 2.717 s]
  time_to_throw: flat 2.739 seconds | gen 2.717 seconds
  sack_share_of_hit_or_sack: flat 70.81 % [time to throw 2.739 s] | gen 58.57 % [time to throw 2.717 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.739 s] | gen 0.00 % [time to throw 2.717 s]
  release_distribution: flat 2.739 seconds | gen 2.717 seconds
  pressured_share_by_release_bin: flat 41.05 % | gen 48.31 %
  hit_rate_by_release_bin: flat 15.89 % [time to throw 2.739 s] | gen 23.91 % [time to throw 2.717 s]
  hits_on_aimed_throws_per_dropback: flat 2.53 % [time to throw 2.739 s] | gen 4.82 % [time to throw 2.717 s]
  first_pressure_seconds: flat 1.968 seconds | gen 2.052 seconds
  first_forcing_seconds: flat 2.215 seconds | gen 2.306 seconds
  first_arrival_seconds: flat 2.005 seconds | gen 2.065 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.50%, FREE_RUNNER 51.57%, WON_REP 42.93%; gen COUNTER 5.74%, FREE_RUNNER 50.27%, WON_REP 43.99%)
  quick_pressure_share_by_origin: flat 62.40 % | gen 60.18 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.79 %
  clean_with_live_won_rep_dropbacks: flat 3.51 % | gen 3.52 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 19.11 % | gen 14.05 %
  throwaway_rate_clean: flat 14.34 % | gen 6.16 %
  scramble_rate: flat 6.23 % | gen 2.18 %
  scramble_yards: flat 6.29 yards | gen 5.71 yards
  by_down_fixed_calls: flat 15.51 % | gen 14.89 %
  int_per_aimed_throw: flat 2.82 % | gen 7.66 %
  completion_per_aimed_throw: flat 43.09 % | gen 41.44 %
  forced_throw_share: flat 23.97 % | gen 28.69 %
  completion_by_pocket_status: flat 23.67 % | gen 25.76 %
  qb_season_spread: flat 0.62 pp | gen 2.20 pp
  defence_season_spread: flat 0.00 pp | gen 0.92 pp
  unblocked_pressures_per_100: flat 19.25 per 100 dropbacks | gen 19.06 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 73.69 % [time to throw 2.739 s] | gen 71.08 % [time to throw 2.717 s]
  unblocked_men_per_100: flat 19.31 per 100 dropbacks | gen 19.08 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 21.48 % | gen 23.77 %
  quick_share_no_free_runner: flat 37.48 % | gen 35.13 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 19.32 % | gen 12.90 %
  situation_q1q3_last_two: flat 18.37 % | gen 14.87 %
  sack_share_of_contacts_in_out: flat 70.75 % [time to throw 2.739 s] | gen 58.55 % [time to throw 2.717 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.739 s] | gen 2.50 % [time to throw 2.717 s]
  sacker_mix.split.interior: flat 33.74 % [time to throw 2.739 s] | gen 36.62 % [time to throw 2.717 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.54 % [time to throw 2.739 s] | gen 45.43 % [time to throw 2.717 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.71 % [time to throw 2.739 s] | gen 17.77 % [time to throw 2.717 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 1.02 % [time to throw 2.739 s] | gen 0.17 % [time to throw 2.717 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 33.65 % [time to throw 2.739 s] | gen 36.62 % [time to throw 2.717 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.18 % | gen 6.68 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.25 % | gen 2.62 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.29 % | gen 20.63 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.20 % | gen 3.56 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.28 % | gen 18.08 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 10.67 % | gen 7.59 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.14 % | gen 45.10 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.64 % | gen 18.34 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 37.46 % | gen 35.57 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 25.19 % | gen 20.58 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 20.79 % | gen 28.28 %
  nobody_open_share: flat 36.65 % of dropbacks | gen 35.78 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.39 % of dropbacks | gen 9.26 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.81 % of dropbacks | gen 10.22 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.30 % of dropbacks | gen 9.49 % of dropbacks
  nobody_open_share.split.SACK: flat 6.14 % of dropbacks [time to throw 2.739 s] | gen 6.81 % of dropbacks [time to throw 2.717 s]
  clean_checkdown_share: flat 5.00 % of clean aimed throws | gen 2.68 % of clean aimed throws
  clean_later_read_share: flat 21.90 % of clean aimed throws | gen 24.92 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.29, per aimed throw 2.82; forced-throw share 23.97; completion per attempt 35.08, per aimed throw 43.09; INT-source mix CONTESTED_CATCH 89.69, TIPPED_RECOVERY 10.31
      flat PROGRESSION: 21290 aimed, INT 0.25, completion 43.14
      flat RANK_PUSHED: 6387 aimed, INT 11.29, completion 16.64
      flat CHECKDOWN: 4092 aimed, INT 0.20, completion 37.46
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2835 aimed, INT 6.28, completion 25.19
      flat ON_THE_RUN: 178 aimed, INT 10.67, completion 20.79
      flat on the run: clean INT n/a against a real 2.11; pressured INT 10.67 against a real 3.25
    gen: INT per attempt 6.86, per aimed throw 7.66; forced-throw share 28.69; completion per attempt 37.12, per aimed throw 41.44; INT-source mix CONTESTED_CATCH 47.27, TIPPED_RECOVERY 52.73
      gen PROGRESSION: 13001 aimed, INT 2.62, completion 45.10
      gen RANK_PUSHED: 3616 aimed, INT 20.63, completion 18.34
      gen CHECKDOWN: 2502 aimed, INT 3.56, completion 35.57
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2760 aimed, INT 18.08, completion 20.58
      gen ON_THE_RUN: 145 aimed, INT 7.59, completion 28.28
      gen on the run: clean INT n/a against a real 2.11; pressured INT 7.59 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D2 (pricing arm, never a design value): release clock the decision tick ==
  time to throw: flat 2.996 s | gen 2.968 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2270 of 49570 dropbacks (4.58 per 100); pressuredSacks 2270; pressured dropbacks 20366 (41.09 per 100) [time to throw 2.996 s]
    gen: sacks 1258 of 27435 dropbacks (4.59 per 100); pressuredSacks 1215; pressured dropbacks 11571 (42.18 per 100) [time to throw 2.968 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.15% | -10.87 against 22.02% (PR #33, FTN only (held)) | -4.31 against 15.46% (main) [time to throw 2.996 s]
    gen: 10.50% | -11.52 against 22.02% (PR #33, FTN only (held)) | -4.96 against 15.46% (main) [time to throw 2.968 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.09 % | gen 42.18 %
  hit_or_sack_rate: flat 17.47 % [time to throw 2.996 s] | gen 21.76 % [time to throw 2.968 s]
  sack_rate: flat 4.58 % [time to throw 2.996 s] | gen 4.59 % [time to throw 2.968 s]
  time_to_throw: flat 2.996 seconds | gen 2.968 seconds
  sack_share_of_hit_or_sack: flat 26.22 % [time to throw 2.996 s] | gen 21.07 % [time to throw 2.968 s]
  qb_hit_on_scramble: flat 3.56 % [time to throw 2.996 s] | gen 4.34 % [time to throw 2.968 s]
  release_distribution: flat 2.996 seconds | gen 2.968 seconds
  pressured_share_by_release_bin: flat 44.03 % | gen 51.50 %
  hit_rate_by_release_bin: flat 28.43 % [time to throw 2.996 s] | gen 36.46 % [time to throw 2.968 s]
  hits_on_aimed_throws_per_dropback: flat 11.76 % [time to throw 2.996 s] | gen 15.59 % [time to throw 2.968 s]
  first_pressure_seconds: flat 1.965 seconds | gen 2.050 seconds
  first_forcing_seconds: flat 2.212 seconds | gen 2.301 seconds
  first_arrival_seconds: flat 1.997 seconds | gen 2.065 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.50%, FREE_RUNNER 51.69%, WON_REP 42.81%; gen COUNTER 5.80%, FREE_RUNNER 50.44%, WON_REP 43.76%)
  quick_pressure_share_by_origin: flat 62.54 % | gen 60.41 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.82 %
  clean_with_live_won_rep_dropbacks: flat 3.49 % | gen 3.64 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.12 % | gen 17.92 %
  throwaway_rate_clean: flat 14.40 % | gen 6.25 %
  scramble_rate: flat 6.46 % | gen 2.35 %
  scramble_yards: flat 6.39 yards | gen 5.71 yards
  by_down_fixed_calls: flat 10.93 % | gen 11.18 %
  int_per_aimed_throw: flat 2.66 % | gen 7.73 %
  completion_per_aimed_throw: flat 42.26 % | gen 40.82 %
  forced_throw_share: flat 24.08 % | gen 29.03 %
  completion_by_pocket_status: flat 20.58 % | gen 23.19 %
  qb_season_spread: flat 0.55 pp | gen 1.25 pp
  defence_season_spread: flat 0.00 pp | gen 1.17 pp
  unblocked_pressures_per_100: flat 19.34 per 100 dropbacks | gen 19.13 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 35.97 % [time to throw 2.996 s] | gen 37.82 % [time to throw 2.968 s]
  unblocked_men_per_100: flat 19.39 per 100 dropbacks | gen 19.15 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.75 % | gen 25.13 %
  quick_share_no_free_runner: flat 37.53 % | gen 35.12 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 23.00 % | gen 18.58 %
  situation_q1q3_last_two: flat 20.24 % | gen 20.34 %
  sack_share_of_contacts_in_out: flat 52.99 % [time to throw 2.996 s] | gen 39.75 % [time to throw 2.968 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.996 s] | gen 3.42 % [time to throw 2.968 s]
  sacker_mix.split.interior: flat 31.71 % [time to throw 2.996 s] | gen 31.59 % [time to throw 2.968 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.34 % [time to throw 2.996 s] | gen 46.78 % [time to throw 2.968 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.40 % [time to throw 2.996 s] | gen 21.29 % [time to throw 2.968 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.55 % [time to throw 2.996 s] | gen 0.34 % [time to throw 2.968 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.42 % [time to throw 2.996 s] | gen 31.49 % [time to throw 2.968 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.07 % | gen 6.65 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.24 % | gen 2.58 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 10.93 % | gen 20.78 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.66 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.77 % | gen 18.28 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.09 % | gen 11.69 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.53 % | gen 45.18 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.68 % | gen 17.49 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 36.02 % | gen 33.29 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 22.48 % | gen 19.88 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.60 % | gen 33.12 %
  nobody_open_share: flat 36.50 % of dropbacks | gen 35.70 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.47 % of dropbacks | gen 9.46 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.88 % of dropbacks | gen 10.49 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.57 % of dropbacks | gen 11.17 % of dropbacks
  nobody_open_share.split.SACK: flat 4.58 % of dropbacks [time to throw 2.996 s] | gen 4.59 % of dropbacks [time to throw 2.968 s]
  clean_checkdown_share: flat 5.20 % of clean aimed throws | gen 2.72 % of clean aimed throws
  clean_later_read_share: flat 22.11 % of clean aimed throws | gen 25.13 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.14, per aimed throw 2.66; forced-throw share 24.08; completion per attempt 33.91, per aimed throw 42.26; INT-source mix CONTESTED_CATCH 89.71, TIPPED_RECOVERY 10.29
      flat PROGRESSION: 21687 aimed, INT 0.24, completion 42.53
      flat RANK_PUSHED: 6402 aimed, INT 10.93, completion 16.68
      flat CHECKDOWN: 4200 aimed, INT 0.17, completion 36.02
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2914 aimed, INT 5.77, completion 22.48
      flat ON_THE_RUN: 187 aimed, INT 9.09, completion 24.60
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.09 against a real 3.25
    gen: INT per attempt 6.80, per aimed throw 7.73; forced-throw share 29.03; completion per attempt 35.92, per aimed throw 40.82; INT-source mix CONTESTED_CATCH 46.49, TIPPED_RECOVERY 53.51
      gen PROGRESSION: 13198 aimed, INT 2.58, completion 45.18
      gen RANK_PUSHED: 3643 aimed, INT 20.78, completion 17.49
      gen CHECKDOWN: 2595 aimed, INT 3.66, completion 33.29
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2877 aimed, INT 18.28, completion 19.88
      gen ON_THE_RUN: 154 aimed, INT 11.69, completion 33.12
      gen on the run: clean INT n/a against a real 2.11; pressured INT 11.69 against a real 3.25
    the filed guard against C2 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.82 -> arm 2.66, rise -0.15 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.25 -> arm 0.24, rise -0.02 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 11.29 -> arm 10.93, rise -0.35 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.20 -> arm 0.17, rise -0.03 against an allowed 0.00: PASSES
    flat DESPERATION: base 6.28 -> arm 5.77, rise -0.51 against an allowed 0.03: PASSES
    flat ON_THE_RUN: base 10.67 -> arm 9.09, rise -1.58 against an allowed 0.03: PASSES
    flat by class: PASSES
    gen league-wide: base 7.66 -> arm 7.73, rise 0.07 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 2.62 -> arm 2.58, rise -0.05 against an allowed 0.00: PASSES
    gen RANK_PUSHED: base 20.63 -> arm 20.78, rise 0.15 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.56 -> arm 3.66, rise 0.10 against an allowed -0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 18.08 -> arm 18.28, rise 0.20 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 7.59 -> arm 11.69, rise 4.10 against an allowed 0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C2 (re-played): flat 6507 | gen 4418

== D6 (the motion clauses' arm (AM-7 item 2); guarded under AM-6): release clock the decision tick ==
  time to throw: flat 3.000 s | gen 2.972 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2969 of 49051 dropbacks (6.05 per 100); pressuredSacks 2969; pressured dropbacks 20105 (40.99 per 100) [time to throw 3.000 s]
    gen: sacks 1853 of 27269 dropbacks (6.80 per 100); pressuredSacks 1811; pressured dropbacks 11540 (42.32 per 100) [time to throw 2.972 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 14.77% | -7.25 against 22.02% (PR #33, FTN only (held)) | -0.69 against 15.46% (main) [time to throw 3.000 s]
    gen: 15.69% | -6.33 against 22.02% (PR #33, FTN only (held)) | 0.23 against 15.46% (main) [time to throw 2.972 s]
  rows (66, both leagues):
  threat_creation_rate: flat 40.99 % | gen 42.32 %
  hit_or_sack_rate: flat 17.70 % [time to throw 3.000 s] | gen 22.07 % [time to throw 2.972 s]
  sack_rate: flat 6.05 % [time to throw 3.000 s] | gen 6.80 % [time to throw 2.972 s]
  time_to_throw: flat 3.000 seconds | gen 2.972 seconds
  sack_share_of_hit_or_sack: flat 34.21 % [time to throw 3.000 s] | gen 30.79 % [time to throw 2.972 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 3.000 s] | gen 0.00 % [time to throw 2.972 s]
  release_distribution: flat 3.000 seconds | gen 2.972 seconds
  pressured_share_by_release_bin: flat 41.04 % | gen 48.34 %
  hit_rate_by_release_bin: flat 27.96 % [time to throw 3.000 s] | gen 35.67 % [time to throw 2.972 s]
  hits_on_aimed_throws_per_dropback: flat 11.64 % [time to throw 3.000 s] | gen 15.27 % [time to throw 2.972 s]
  first_pressure_seconds: flat 1.966 seconds | gen 2.047 seconds
  first_forcing_seconds: flat 2.214 seconds | gen 2.299 seconds
  first_arrival_seconds: flat 1.997 seconds | gen 2.063 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.40%, FREE_RUNNER 51.74%, WON_REP 42.86%; gen COUNTER 5.68%, FREE_RUNNER 50.38%, WON_REP 43.94%)
  quick_pressure_share_by_origin: flat 62.57 % | gen 60.71 %
  clean_with_live_won_rep_ticks: flat 0.80 % | gen 0.81 %
  clean_with_live_won_rep_dropbacks: flat 3.54 % | gen 3.59 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 19.30 % | gen 14.26 %
  throwaway_rate_clean: flat 14.08 % | gen 6.26 %
  scramble_rate: flat 6.22 % | gen 2.12 %
  scramble_yards: flat 6.37 yards | gen 6.14 yards
  by_down_fixed_calls: flat 15.90 % | gen 15.65 %
  int_per_aimed_throw: flat 2.66 % | gen 7.61 %
  completion_per_aimed_throw: flat 42.24 % | gen 40.57 %
  forced_throw_share: flat 23.89 % | gen 28.87 %
  completion_by_pocket_status: flat 21.01 % | gen 23.91 %
  qb_season_spread: flat 0.38 pp | gen 2.52 pp
  defence_season_spread: flat 0.00 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 19.27 per 100 dropbacks | gen 19.26 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 35.99 % [time to throw 3.000 s] | gen 37.74 % [time to throw 2.972 s]
  unblocked_men_per_100: flat 19.32 per 100 dropbacks | gen 19.29 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 21.39 % | gen 23.53 %
  quick_share_no_free_runner: flat 37.57 % | gen 35.26 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 19.88 % | gen 14.31 %
  situation_q1q3_last_two: flat 18.52 % | gen 15.38 %
  sack_share_of_contacts_in_out: flat 70.67 % [time to throw 3.000 s] | gen 58.10 % [time to throw 2.972 s]
  coverage_sack_rows: flat 0.00 % [time to throw 3.000 s] | gen 2.27 % [time to throw 2.972 s]
  sacker_mix.split.interior: flat 33.56 % [time to throw 3.000 s] | gen 35.78 % [time to throw 2.972 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.22 % [time to throw 3.000 s] | gen 45.89 % [time to throw 2.972 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.34 % [time to throw 3.000 s] | gen 18.10 % [time to throw 2.972 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.88 % [time to throw 3.000 s] | gen 0.22 % [time to throw 2.972 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 33.48 % [time to throw 3.000 s] | gen 35.85 % [time to throw 2.972 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.21 % | gen 6.38 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.20 % | gen 2.55 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.03 % | gen 20.59 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.54 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.70 % | gen 18.06 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 8.20 % | gen 11.03 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.77 % | gen 44.78 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.35 % | gen 18.20 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 34.65 % | gen 32.14 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.02 % | gen 19.27 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 22.40 % | gen 28.97 %
  nobody_open_share: flat 36.61 % of dropbacks | gen 36.11 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.36 % of dropbacks | gen 9.33 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.98 % of dropbacks | gen 10.33 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.22 % of dropbacks | gen 9.65 % of dropbacks
  nobody_open_share.split.SACK: flat 6.05 % of dropbacks [time to throw 3.000 s] | gen 6.80 % of dropbacks [time to throw 2.972 s]
  clean_checkdown_share: flat 5.01 % of clean aimed throws | gen 2.65 % of clean aimed throws
  clean_later_read_share: flat 22.13 % of clean aimed throws | gen 24.93 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.17, per aimed throw 2.66; forced-throw share 23.89; completion per attempt 34.43, per aimed throw 42.24; INT-source mix CONTESTED_CATCH 89.82, TIPPED_RECOVERY 10.18
      flat PROGRESSION: 21510 aimed, INT 0.20, completion 42.77
      flat RANK_PUSHED: 6348 aimed, INT 11.03, completion 16.35
      flat CHECKDOWN: 4101 aimed, INT 0.17, completion 34.65
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2932 aimed, INT 5.70, completion 23.02
      flat ON_THE_RUN: 183 aimed, INT 8.20, completion 22.40
      flat on the run: clean INT n/a against a real 2.11; pressured INT 8.20 against a real 3.25
    gen: INT per attempt 6.80, per aimed throw 7.61; forced-throw share 28.87; completion per attempt 36.27, per aimed throw 40.57; INT-source mix CONTESTED_CATCH 47.81, TIPPED_RECOVERY 52.19
      gen PROGRESSION: 13099 aimed, INT 2.55, completion 44.78
      gen RANK_PUSHED: 3599 aimed, INT 20.59, completion 18.20
      gen CHECKDOWN: 2545 aimed, INT 3.54, completion 32.14
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2818 aimed, INT 18.06, completion 19.27
      gen ON_THE_RUN: 145 aimed, INT 11.03, completion 28.97
      gen on the run: clean INT n/a against a real 2.11; pressured INT 11.03 against a real 3.25
    the filed guard against C2 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.82 -> arm 2.66, rise -0.16 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.25 -> arm 0.20, rise -0.05 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 11.29 -> arm 11.03, rise -0.26 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.20 -> arm 0.17, rise -0.02 against an allowed -0.01: PASSES
    flat DESPERATION: base 6.28 -> arm 5.70, rise -0.58 against an allowed 0.01: PASSES
    flat ON_THE_RUN: base 10.67 -> arm 8.20, rise -2.48 against an allowed 0.01: PASSES
    flat by class: PASSES
    gen league-wide: base 7.66 -> arm 7.61, rise -0.04 against an allowed -0.01: PASSES
    gen PROGRESSION: base 2.62 -> arm 2.55, rise -0.07 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 20.63 -> arm 20.59, rise -0.04 against an allowed 0.01: PASSES
    gen CHECKDOWN: base 3.56 -> arm 3.54, rise -0.02 against an allowed -0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 18.08 -> arm 18.06, rise -0.02 against an allowed -0.01: PASSES
    gen ON_THE_RUN: base 7.59 -> arm 11.03, rise 3.45 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C2 (re-played): flat 4547 | gen 2899

== D8 (printed, the tilts' base): release clock the decision tick ==
  time to throw: flat 2.734 s | gen 2.707 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2159 of 49443 dropbacks (4.37 per 100); pressuredSacks 2159; pressured dropbacks 20286 (41.03 per 100) [time to throw 2.734 s]
    gen: sacks 1158 of 27487 dropbacks (4.21 per 100); pressuredSacks 1115; pressured dropbacks 11561 (42.06 per 100) [time to throw 2.707 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.64% | -11.38 against 22.02% (PR #33, FTN only (held)) | -4.82 against 15.46% (main) [time to throw 2.734 s]
    gen: 9.64% | -12.38 against 22.02% (PR #33, FTN only (held)) | -5.82 against 15.46% (main) [time to throw 2.707 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.03 % | gen 42.06 %
  hit_or_sack_rate: flat 8.45 % [time to throw 2.734 s] | gen 11.21 % [time to throw 2.707 s]
  sack_rate: flat 4.37 % [time to throw 2.734 s] | gen 4.21 % [time to throw 2.707 s]
  time_to_throw: flat 2.734 seconds | gen 2.707 seconds
  sack_share_of_hit_or_sack: flat 51.68 % [time to throw 2.734 s] | gen 37.60 % [time to throw 2.707 s]
  qb_hit_on_scramble: flat 3.90 % [time to throw 2.734 s] | gen 5.53 % [time to throw 2.707 s]
  release_distribution: flat 2.734 seconds | gen 2.707 seconds
  pressured_share_by_release_bin: flat 44.10 % | gen 51.59 %
  hit_rate_by_release_bin: flat 16.50 % [time to throw 2.734 s] | gen 24.39 % [time to throw 2.707 s]
  hits_on_aimed_throws_per_dropback: flat 2.77 % [time to throw 2.734 s] | gen 5.22 % [time to throw 2.707 s]
  first_pressure_seconds: flat 1.971 seconds | gen 2.051 seconds
  first_forcing_seconds: flat 2.214 seconds | gen 2.300 seconds
  first_arrival_seconds: flat 2.000 seconds | gen 2.059 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.57%, FREE_RUNNER 51.61%, WON_REP 42.82%; gen COUNTER 5.79%, FREE_RUNNER 50.25%, WON_REP 43.96%)
  quick_pressure_share_by_origin: flat 62.35 % | gen 60.30 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.81 %
  clean_with_live_won_rep_dropbacks: flat 3.50 % | gen 3.59 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.51 % | gen 18.48 %
  throwaway_rate_clean: flat 14.42 % | gen 6.15 %
  scramble_rate: flat 6.43 % | gen 2.37 %
  scramble_yards: flat 6.36 yards | gen 5.93 yards
  by_down_fixed_calls: flat 9.72 % | gen 10.01 %
  int_per_aimed_throw: flat 2.71 % | gen 7.81 %
  completion_per_aimed_throw: flat 43.12 % | gen 41.40 %
  forced_throw_share: flat 24.03 % | gen 28.94 %
  completion_by_pocket_status: flat 22.75 % | gen 24.56 %
  qb_season_spread: flat 0.84 pp | gen 1.44 pp
  defence_season_spread: flat 0.00 pp | gen 0.91 pp
  unblocked_pressures_per_100: flat 19.26 per 100 dropbacks | gen 18.87 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 74.75 % [time to throw 2.734 s] | gen 71.88 % [time to throw 2.707 s]
  unblocked_men_per_100: flat 19.31 per 100 dropbacks | gen 18.89 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.07 % | gen 25.13 %
  quick_share_no_free_runner: flat 37.19 % | gen 35.42 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 22.77 % | gen 19.41 %
  situation_q1q3_last_two: flat 22.01 % | gen 20.52 %
  sack_share_of_contacts_in_out: flat 50.10 % [time to throw 2.734 s] | gen 37.16 % [time to throw 2.707 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.734 s] | gen 3.71 % [time to throw 2.707 s]
  sacker_mix.split.interior: flat 32.25 % [time to throw 2.734 s] | gen 34.46 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.78 % [time to throw 2.734 s] | gen 45.25 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.32 % [time to throw 2.734 s] | gen 19.93 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.65 % [time to throw 2.734 s] | gen 0.37 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.06 % [time to throw 2.734 s] | gen 33.97 % [time to throw 2.707 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.08 % | gen 6.55 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.23 % | gen 2.64 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.06 % | gen 20.80 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 3.88 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.82 % | gen 18.50 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.04 % | gen 12.58 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.97 % | gen 45.52 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.02 % | gen 17.41 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.32 % | gen 35.43 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.49 % | gen 20.56 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.40 % | gen 26.49 %
  nobody_open_share: flat 36.41 % of dropbacks | gen 35.47 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.50 % of dropbacks | gen 9.47 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.81 % of dropbacks | gen 10.46 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.74 % of dropbacks | gen 11.34 % of dropbacks
  nobody_open_share.split.SACK: flat 4.37 % of dropbacks [time to throw 2.734 s] | gen 4.21 % of dropbacks [time to throw 2.707 s]
  clean_checkdown_share: flat 5.14 % of clean aimed throws | gen 2.78 % of clean aimed throws
  clean_later_read_share: flat 21.92 % of clean aimed throws | gen 25.27 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.17, per aimed throw 2.71; forced-throw share 24.03; completion per attempt 34.54, per aimed throw 43.12; INT-source mix CONTESTED_CATCH 89.96, TIPPED_RECOVERY 10.04
      flat PROGRESSION: 21616 aimed, INT 0.23, completion 42.97
      flat RANK_PUSHED: 6458 aimed, INT 11.06, completion 17.02
      flat CHECKDOWN: 4201 aimed, INT 0.19, completion 38.32
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2871 aimed, INT 5.82, completion 24.49
      flat ON_THE_RUN: 188 aimed, INT 9.04, completion 23.40
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.04 against a real 3.25
    gen: INT per attempt 6.86, per aimed throw 7.81; forced-throw share 28.94; completion per attempt 36.37, per aimed throw 41.40; INT-source mix CONTESTED_CATCH 46.37, TIPPED_RECOVERY 53.63
      gen PROGRESSION: 13281 aimed, INT 2.64, completion 45.52
      gen RANK_PUSHED: 3653 aimed, INT 20.80, completion 17.41
      gen CHECKDOWN: 2602 aimed, INT 3.88, completion 35.43
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2875 aimed, INT 18.50, completion 20.56
      gen ON_THE_RUN: 151 aimed, INT 12.58, completion 26.49
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.58 against a real 3.25
    the filed guard against C2 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.82 -> arm 2.71, rise -0.11 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.25 -> arm 0.23, rise -0.02 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.29 -> arm 11.06, rise -0.23 against an allowed 0.00: PASSES
    flat CHECKDOWN: base 0.20 -> arm 0.19, rise -0.01 against an allowed 0.00: PASSES
    flat DESPERATION: base 6.28 -> arm 5.82, rise -0.46 against an allowed 0.03: PASSES
    flat ON_THE_RUN: base 10.67 -> arm 9.04, rise -1.63 against an allowed 0.00: PASSES
    flat by class: PASSES
    gen league-wide: base 7.66 -> arm 7.81, rise 0.15 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 2.62 -> arm 2.64, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.63 -> arm 20.80, rise 0.17 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.56 -> arm 3.88, rise 0.32 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 18.08 -> arm 18.50, rise 0.42 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 7.59 -> arm 12.58, rise 5.00 against an allowed 0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C2 (re-played): flat 1958 | gen 1507
```

### A0 (re-played) with D3, seed set 2

```text
ADR-089 step 4: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A0 (re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 1.241 s | gen 1.243 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 7304 of 43741 dropbacks (16.70 per 100); pressuredSacks 7304; pressured dropbacks 37931 (86.72 per 100) [time to throw 1.241 s]
    gen: sacks 4321 of 25805 dropbacks (16.74 per 100); pressuredSacks 4321; pressured dropbacks 22110 (85.68 per 100) [time to throw 1.243 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 19.26% | -2.76 against 22.02% (PR #33, FTN only (held)) | 3.80 against 15.46% (main) [time to throw 1.241 s]
    gen: 19.54% | -2.48 against 22.02% (PR #33, FTN only (held)) | 4.08 against 15.46% (main) [time to throw 1.243 s]
  rows (66, both leagues):
  threat_creation_rate: flat 86.72 % | gen 85.68 %
  hit_or_sack_rate: flat 20.43 % [time to throw 1.241 s] | gen 24.28 % [time to throw 1.243 s]
  sack_rate: flat 16.70 % [time to throw 1.241 s] | gen 16.74 % [time to throw 1.243 s]
  time_to_throw: flat 1.241 seconds | gen 1.243 seconds
  sack_share_of_hit_or_sack: flat 81.72 % [time to throw 1.241 s] | gen 68.97 % [time to throw 1.243 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.241 s] | gen 0.00 % [time to throw 1.243 s]
  release_distribution: flat 1.241 seconds | gen 1.243 seconds
  pressured_share_by_release_bin: flat 82.24 % | gen 83.90 %
  hit_rate_by_release_bin: flat 7.86 % [time to throw 1.241 s] | gen 10.64 % [time to throw 1.243 s]
  hits_on_aimed_throws_per_dropback: flat 3.74 % [time to throw 1.241 s] | gen 7.53 % [time to throw 1.243 s]
  first_pressure_seconds: flat 0.876 seconds | gen 0.878 seconds
  first_forcing_seconds: flat 1.007 seconds | gen 1.016 seconds
  first_arrival_seconds: flat 1.395 seconds | gen 1.500 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 9.53%, FREE_RUNNER 28.90%, WON_REP 61.57%; gen COUNTER 9.57%, FREE_RUNNER 29.30%, WON_REP 61.13%)
  quick_pressure_share_by_origin: flat 99.80 % | gen 99.63 %
  clean_with_live_won_rep_ticks: flat 0.15 % | gen 0.12 %
  clean_with_live_won_rep_dropbacks: flat 0.13 % | gen 0.11 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 5.06 % | gen 2.44 %
  throwaway_rate_clean: flat 6.88 % | gen 2.79 %
  scramble_rate: flat 16.49 % | gen 4.48 %
  scramble_yards: flat 5.26 yards | gen 4.10 yards
  by_down_fixed_calls: flat 19.65 % | gen 19.80 %
  int_per_aimed_throw: flat 1.88 % | gen 7.06 %
  completion_per_aimed_throw: flat 40.29 % | gen 38.21 %
  forced_throw_share: flat 64.30 % | gen 69.08 %
  completion_by_pocket_status: flat 33.66 % | gen 33.89 %
  qb_season_spread: flat 0.33 pp | gen 6.03 pp
  defence_season_spread: flat 0.35 pp | gen 1.29 pp
  unblocked_pressures_per_100: flat 19.24 per 100 dropbacks | gen 18.95 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 7.99 % [time to throw 1.241 s] | gen 8.28 % [time to throw 1.243 s]
  unblocked_men_per_100: flat 19.24 per 100 dropbacks | gen 18.95 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 79.15 % | gen 80.54 %
  quick_share_no_free_runner: flat 99.72 % | gen 99.48 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 4.91 % | gen 2.54 %
  situation_q1q3_last_two: flat 4.74 % | gen 2.11 %
  sack_share_of_contacts_in_out: flat 81.72 % [time to throw 1.241 s] | gen 68.97 % [time to throw 1.243 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.241 s] | gen 0.00 % [time to throw 1.243 s]
  sacker_mix.split.interior: flat 84.60 % [time to throw 1.241 s] | gen 84.85 % [time to throw 1.243 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 9.92 % [time to throw 1.241 s] | gen 10.00 % [time to throw 1.243 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.48 % [time to throw 1.241 s] | gen 5.12 % [time to throw 1.243 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.01 % [time to throw 1.241 s] | gen 0.03 % [time to throw 1.243 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 80.83 % [time to throw 1.241 s] | gen 79.67 % [time to throw 1.243 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.41 % | gen 0.52 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.25 % | gen 2.34 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 10.66 % | gen 19.64 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 4.80 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 3.52 % | gen 16.77 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.85 % | gen 14.57 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 41.25 % | gen 43.70 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 14.65 % | gen 15.30 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 35.06 % | gen 33.50 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.57 % | gen 19.66 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.33 % | gen 25.38 %
  nobody_open_share: flat 48.41 % of dropbacks | gen 55.56 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 21.55 % of dropbacks | gen 26.80 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 4.87 % of dropbacks | gen 9.52 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 5.30 % of dropbacks | gen 2.49 % of dropbacks
  nobody_open_share.split.SACK: flat 16.70 % of dropbacks [time to throw 1.241 s] | gen 16.74 % of dropbacks [time to throw 1.243 s]
  clean_checkdown_share: flat 7.63 % of clean aimed throws | gen 2.98 % of clean aimed throws
  clean_later_read_share: flat 9.78 % of clean aimed throws | gen 11.72 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.73, per aimed throw 1.88; forced-throw share 64.30; completion per attempt 37.09, per aimed throw 40.29; INT-source mix CONTESTED_CATCH 94.08, TIPPED_RECOVERY 5.92
      flat PROGRESSION: 11570 aimed, INT 0.25, completion 41.25
      flat RANK_PUSHED: 3406 aimed, INT 10.66, completion 14.65
      flat CHECKDOWN: 9424 aimed, INT 0.19, completion 35.06
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2129 aimed, INT 3.52, completion 24.57
      flat ON_THE_RUN: 376 aimed, INT 5.85, completion 26.33
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.85 against a real 3.25
    gen: INT per attempt 6.83, per aimed throw 7.06; forced-throw share 69.08; completion per attempt 37.00, per aimed throw 38.21; INT-source mix CONTESTED_CATCH 47.95, TIPPED_RECOVERY 52.05
      gen PROGRESSION: 7861 aimed, INT 2.34, completion 43.70
      gen RANK_PUSHED: 2052 aimed, INT 19.64, completion 15.30
      gen CHECKDOWN: 6916 aimed, INT 4.80, completion 33.50
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2457 aimed, INT 16.77, completion 19.66
      gen ON_THE_RUN: 398 aimed, INT 14.57, completion 25.38
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.57 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D3 (the contact clauses' arm (AM-7 item 1)): release clock the decision tick ==
  time to throw: flat 1.257 s | gen 1.281 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 6202 of 44201 dropbacks (14.03 per 100); pressuredSacks 6202; pressured dropbacks 38298 (86.65 per 100) [time to throw 1.257 s]
    gen: sacks 3481 of 26773 dropbacks (13.00 per 100); pressuredSacks 3481; pressured dropbacks 22904 (85.55 per 100) [time to throw 1.281 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 16.19% | -5.83 against 22.02% (PR #33, FTN only (held)) | 0.73 against 15.46% (main) [time to throw 1.257 s]
    gen: 15.20% | -6.82 against 22.02% (PR #33, FTN only (held)) | -0.26 against 15.46% (main) [time to throw 1.281 s]
  rows (66, both leagues):
  threat_creation_rate: flat 86.65 % | gen 85.55 %
  hit_or_sack_rate: flat 19.07 % [time to throw 1.257 s] | gen 23.59 % [time to throw 1.281 s]
  sack_rate: flat 14.03 % [time to throw 1.257 s] | gen 13.00 % [time to throw 1.281 s]
  time_to_throw: flat 1.257 seconds | gen 1.281 seconds
  sack_share_of_hit_or_sack: flat 73.58 % [time to throw 1.257 s] | gen 55.11 % [time to throw 1.281 s]
  qb_hit_on_scramble: flat 8.18 % [time to throw 1.257 s] | gen 8.91 % [time to throw 1.281 s]
  release_distribution: flat 1.257 seconds | gen 1.281 seconds
  pressured_share_by_release_bin: flat 83.78 % | gen 86.95 %
  hit_rate_by_release_bin: flat 17.04 % [time to throw 1.257 s] | gen 29.17 % [time to throw 1.281 s]
  hits_on_aimed_throws_per_dropback: flat 4.61 % [time to throw 1.257 s] | gen 9.93 % [time to throw 1.281 s]
  first_pressure_seconds: flat 0.876 seconds | gen 0.879 seconds
  first_forcing_seconds: flat 1.005 seconds | gen 1.016 seconds
  first_arrival_seconds: flat 1.392 seconds | gen 1.502 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 9.42%, FREE_RUNNER 29.02%, WON_REP 61.56%; gen COUNTER 9.53%, FREE_RUNNER 29.34%, WON_REP 61.13%)
  quick_pressure_share_by_origin: flat 99.82 % | gen 99.63 %
  clean_with_live_won_rep_ticks: flat 0.16 % | gen 0.12 %
  clean_with_live_won_rep_dropbacks: flat 0.14 % | gen 0.12 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 5.51 % | gen 3.24 %
  throwaway_rate_clean: flat 6.66 % | gen 2.82 %
  scramble_rate: flat 17.76 % | gen 4.78 %
  scramble_yards: flat 4.92 yards | gen 3.79 yards
  by_down_fixed_calls: flat 16.58 % | gen 15.57 %
  int_per_aimed_throw: flat 2.08 % | gen 7.22 %
  completion_per_aimed_throw: flat 39.70 % | gen 37.18 %
  forced_throw_share: flat 64.24 % | gen 69.58 %
  completion_by_pocket_status: flat 33.07 % | gen 32.69 %
  qb_season_spread: flat 0.56 pp | gen 4.90 pp
  defence_season_spread: flat 0.00 pp | gen 1.81 pp
  unblocked_pressures_per_100: flat 19.41 per 100 dropbacks | gen 19.05 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 8.27 % [time to throw 1.257 s] | gen 9.39 % [time to throw 1.281 s]
  unblocked_men_per_100: flat 19.41 per 100 dropbacks | gen 19.05 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 80.78 % | gen 84.14 %
  quick_share_no_free_runner: flat 99.74 % | gen 99.47 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 6.22 % | gen 2.96 %
  situation_q1q3_last_two: flat 5.11 % | gen 3.41 %
  sack_share_of_contacts_in_out: flat 68.37 % [time to throw 1.257 s] | gen 54.13 % [time to throw 1.281 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.257 s] | gen 0.00 % [time to throw 1.281 s]
  sacker_mix.split.interior: flat 81.96 % [time to throw 1.257 s] | gen 79.73 % [time to throw 1.281 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 12.38 % [time to throw 1.257 s] | gen 14.51 % [time to throw 1.281 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.64 % [time to throw 1.257 s] | gen 5.75 % [time to throw 1.281 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.02 % [time to throw 1.257 s] | gen 0.01 % [time to throw 1.281 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 76.19 % [time to throw 1.257 s] | gen 71.52 % [time to throw 1.281 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.40 % | gen 0.50 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 2.28 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 10.95 % | gen 19.41 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.22 % | gen 4.76 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 3.94 % | gen 17.15 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 8.58 % | gen 12.85 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 40.86 % | gen 42.85 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 14.25 % | gen 15.07 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 34.78 % | gen 32.33 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 25.13 % | gen 19.20 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.56 % | gen 22.92 %
  nobody_open_share: flat 46.14 % of dropbacks | gen 53.60 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 21.52 % of dropbacks | gen 26.90 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 4.93 % of dropbacks | gen 10.52 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 5.66 % of dropbacks | gen 3.18 % of dropbacks
  nobody_open_share.split.SACK: flat 14.03 % of dropbacks [time to throw 1.257 s] | gen 13.00 % of dropbacks [time to throw 1.281 s]
  clean_checkdown_share: flat 7.51 % of clean aimed throws | gen 2.95 % of clean aimed throws
  clean_later_read_share: flat 10.33 % of clean aimed throws | gen 11.91 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.91, per aimed throw 2.08; forced-throw share 64.24; completion per attempt 36.40, per aimed throw 39.70; INT-source mix CONTESTED_CATCH 94.78, TIPPED_RECOVERY 5.22
      flat PROGRESSION: 11890 aimed, INT 0.29, completion 40.86
      flat RANK_PUSHED: 3551 aimed, INT 10.95, completion 14.25
      flat CHECKDOWN: 9510 aimed, INT 0.22, completion 34.78
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2181 aimed, INT 3.94, completion 25.13
      flat ON_THE_RUN: 513 aimed, INT 8.58, completion 24.56
      flat on the run: clean INT n/a against a real 2.11; pressured INT 8.58 against a real 3.25
    gen: INT per attempt 6.94, per aimed throw 7.22; forced-throw share 69.58; completion per attempt 35.74, per aimed throw 37.18; INT-source mix CONTESTED_CATCH 49.93, TIPPED_RECOVERY 50.07
      gen PROGRESSION: 8333 aimed, INT 2.28, completion 42.85
      gen RANK_PUSHED: 2303 aimed, INT 19.41, completion 15.07
      gen CHECKDOWN: 7201 aimed, INT 4.76, completion 32.33
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2817 aimed, INT 17.15, completion 19.20
      gen ON_THE_RUN: 506 aimed, INT 12.85, completion 22.92
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.85 against a real 3.25
    the filed guard against A0 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 1.88 -> arm 2.08, rise 0.20 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.25 -> arm 0.29, rise 0.04 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 10.66 -> arm 10.95, rise 0.30 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.19 -> arm 0.22, rise 0.03 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 3.52 -> arm 3.94, rise 0.42 against an allowed 0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 5.85 -> arm 8.58, rise 2.73 against an allowed 0.05: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.06 -> arm 7.22, rise 0.16 against an allowed 0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 2.34 -> arm 2.28, rise -0.06 against an allowed 0.02: PASSES
    gen RANK_PUSHED: base 19.64 -> arm 19.41, rise -0.23 against an allowed 0.04: PASSES
    gen CHECKDOWN: base 4.80 -> arm 4.76, rise -0.04 against an allowed 0.01: PASSES
    gen DESPERATION: base 16.77 -> arm 17.15, rise 0.38 against an allowed 0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 14.57 -> arm 12.85, rise -1.73 against an allowed 0.13: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against A0 (re-played): flat 4656 | gen 3902
```

### A14 (re-played) with D4, seed set 2

```text
ADR-089 step 4: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A14 (re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 2.397 s | gen 2.278 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 13007 of 36757 dropbacks (35.39 per 100); pressuredSacks 13007; pressured dropbacks 35331 (96.12 per 100) [time to throw 2.397 s]
    gen: sacks 10125 of 21123 dropbacks (47.93 per 100); pressuredSacks 10115; pressured dropbacks 20215 (95.70 per 100) [time to throw 2.278 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 36.81% | 14.79 against 22.02% (PR #33, FTN only (held)) | 21.35 against 15.46% (main) [time to throw 2.397 s]
    gen: 50.04% | 28.02 against 22.02% (PR #33, FTN only (held)) | 34.58 against 15.46% (main) [time to throw 2.278 s]
  rows (66, both leagues):
  threat_creation_rate: flat 96.12 % | gen 95.70 %
  hit_or_sack_rate: flat 39.94 % [time to throw 2.397 s] | gen 58.70 % [time to throw 2.278 s]
  sack_rate: flat 35.39 % [time to throw 2.397 s] | gen 47.93 % [time to throw 2.278 s]
  time_to_throw: flat 2.397 seconds | gen 2.278 seconds
  sack_share_of_hit_or_sack: flat 88.60 % [time to throw 2.397 s] | gen 81.66 % [time to throw 2.278 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.397 s] | gen 0.00 % [time to throw 2.278 s]
  release_distribution: flat 2.397 seconds | gen 2.278 seconds
  pressured_share_by_release_bin: flat 93.13 % | gen 93.79 %
  hit_rate_by_release_bin: flat 15.03 % [time to throw 2.397 s] | gen 24.04 % [time to throw 2.278 s]
  hits_on_aimed_throws_per_dropback: flat 4.55 % [time to throw 2.397 s] | gen 10.77 % [time to throw 2.278 s]
  first_pressure_seconds: flat 0.914 seconds | gen 0.911 seconds
  first_forcing_seconds: flat 1.068 seconds | gen 1.068 seconds
  first_arrival_seconds: flat 1.413 seconds | gen 1.513 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 10.99%, FREE_RUNNER 26.07%, WON_REP 62.94%; gen COUNTER 10.84%, FREE_RUNNER 26.58%, WON_REP 62.58%)
  quick_pressure_share_by_origin: flat 99.07 % | gen 98.99 %
  clean_with_live_won_rep_ticks: flat 0.19 % | gen 0.14 %
  clean_with_live_won_rep_dropbacks: flat 0.20 % | gen 0.16 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 6.73 % | gen 4.12 %
  throwaway_rate_clean: flat 14.80 % | gen 5.95 %
  scramble_rate: flat 32.68 % | gen 12.66 %
  scramble_yards: flat 5.18 yards | gen 3.77 yards
  by_down_fixed_calls: flat 36.10 % | gen 47.87 %
  int_per_aimed_throw: flat 2.12 % | gen 7.02 %
  completion_per_aimed_throw: flat 38.13 % | gen 35.39 %
  forced_throw_share: flat 62.83 % | gen 70.53 %
  completion_by_pocket_status: flat 28.30 % | gen 30.33 %
  qb_season_spread: flat 0.00 pp | gen 6.84 pp
  defence_season_spread: flat 0.97 pp | gen 1.96 pp
  unblocked_pressures_per_100: flat 19.28 per 100 dropbacks | gen 19.00 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 9.05 % [time to throw 2.397 s] | gen 10.54 % [time to throw 2.278 s]
  unblocked_men_per_100: flat 19.28 per 100 dropbacks | gen 19.00 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 91.28 % | gen 91.84 %
  quick_share_no_free_runner: flat 98.73 % | gen 98.62 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 6.42 % | gen 4.06 %
  situation_q1q3_last_two: flat 6.37 % | gen 4.17 %
  sack_share_of_contacts_in_out: flat 88.60 % [time to throw 2.397 s] | gen 81.66 % [time to throw 2.278 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.397 s] | gen 0.13 % [time to throw 2.278 s]
  sacker_mix.split.interior: flat 84.28 % [time to throw 2.397 s] | gen 85.30 % [time to throw 2.278 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 10.03 % [time to throw 2.397 s] | gen 9.31 % [time to throw 2.278 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.66 % [time to throw 2.397 s] | gen 5.39 % [time to throw 2.278 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.03 % [time to throw 2.397 s] | gen n/a % [time to throw 2.278 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 80.40 % [time to throw 2.397 s] | gen 79.77 % [time to throw 2.278 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.05 % | gen 1.06 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.27 % | gen 2.00 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 10.91 % | gen 21.19 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.11 % | gen 4.73 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.95 % | gen 16.06 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.56 % | gen 17.65 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 36.91 % | gen 37.81 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 15.82 % | gen 16.73 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 35.29 % | gen 32.20 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.40 % | gen 17.69 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.93 % | gen 25.00 %
  nobody_open_share: flat 49.91 % of dropbacks | gen 65.04 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 5.06 % of dropbacks | gen 6.81 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 2.42 % of dropbacks | gen 6.10 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 7.05 % of dropbacks | gen 4.19 % of dropbacks
  nobody_open_share.split.SACK: flat 35.39 % of dropbacks [time to throw 2.397 s] | gen 47.93 % of dropbacks [time to throw 2.278 s]
  clean_checkdown_share: flat 4.20 % of clean aimed throws | gen 2.37 % of clean aimed throws
  clean_later_read_share: flat 20.41 % of clean aimed throws | gen 26.54 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.65, per aimed throw 2.12; forced-throw share 62.83; completion per attempt 29.72, per aimed throw 38.13; INT-source mix CONTESTED_CATCH 92.78, TIPPED_RECOVERY 7.22
      flat PROGRESSION: 5145 aimed, INT 0.27, completion 36.91
      flat RANK_PUSHED: 1201 aimed, INT 10.91, completion 15.82
      flat CHECKDOWN: 1859 aimed, INT 0.11, completion 35.29
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 889 aimed, INT 4.95, completion 23.40
      flat ON_THE_RUN: 54 aimed, INT 5.56, completion 25.93
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.56 against a real 3.25
    gen: INT per attempt 6.27, per aimed throw 7.02; forced-throw share 70.53; completion per attempt 31.62, per aimed throw 35.39; INT-source mix CONTESTED_CATCH 52.11, TIPPED_RECOVERY 47.89
      gen PROGRESSION: 3901 aimed, INT 2.00, completion 37.81
      gen RANK_PUSHED: 741 aimed, INT 21.19, completion 16.73
      gen CHECKDOWN: 1438 aimed, INT 4.73, completion 32.20
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 1289 aimed, INT 16.06, completion 17.69
      gen ON_THE_RUN: 68 aimed, INT 17.65, completion 25.00
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.65 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D4 (printed beside the contact clauses (AM-7 item 1's other reading)): release clock the decision tick ==
  time to throw: flat 2.369 s | gen 2.222 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 10913 of 37339 dropbacks (29.23 per 100); pressuredSacks 10913; pressured dropbacks 35891 (96.12 per 100) [time to throw 2.369 s]
    gen: sacks 8223 of 22176 dropbacks (37.08 per 100); pressuredSacks 8214; pressured dropbacks 21245 (95.80 per 100) [time to throw 2.222 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 30.41% | 8.39 against 22.02% (PR #33, FTN only (held)) | 14.95 against 15.46% (main) [time to throw 2.369 s]
    gen: 38.66% | 16.64 against 22.02% (PR #33, FTN only (held)) | 23.20 against 15.46% (main) [time to throw 2.222 s]
  rows (66, both leagues):
  threat_creation_rate: flat 96.12 % | gen 95.80 %
  hit_or_sack_rate: flat 36.40 % [time to throw 2.369 s] | gen 57.75 % [time to throw 2.222 s]
  sack_rate: flat 29.23 % [time to throw 2.369 s] | gen 37.08 % [time to throw 2.222 s]
  time_to_throw: flat 2.369 seconds | gen 2.222 seconds
  sack_share_of_hit_or_sack: flat 80.30 % [time to throw 2.369 s] | gen 64.21 % [time to throw 2.222 s]
  qb_hit_on_scramble: flat 9.63 % [time to throw 2.369 s] | gen 12.81 % [time to throw 2.222 s]
  release_distribution: flat 2.369 seconds | gen 2.222 seconds
  pressured_share_by_release_bin: flat 94.93 % | gen 96.60 %
  hit_rate_by_release_bin: flat 29.39 % [time to throw 2.369 s] | gen 57.33 % [time to throw 2.222 s]
  hits_on_aimed_throws_per_dropback: flat 6.24 % [time to throw 2.369 s] | gen 18.73 % [time to throw 2.222 s]
  first_pressure_seconds: flat 0.914 seconds | gen 0.908 seconds
  first_forcing_seconds: flat 1.066 seconds | gen 1.061 seconds
  first_arrival_seconds: flat 1.411 seconds | gen 1.515 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 11.11%, FREE_RUNNER 26.03%, WON_REP 62.86%; gen COUNTER 10.37%, FREE_RUNNER 26.50%, WON_REP 63.13%)
  quick_pressure_share_by_origin: flat 99.08 % | gen 99.06 %
  clean_with_live_won_rep_ticks: flat 0.20 % | gen 0.16 %
  clean_with_live_won_rep_dropbacks: flat 0.21 % | gen 0.17 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 7.65 % | gen 5.97 %
  throwaway_rate_clean: flat 14.50 % | gen 5.91 %
  scramble_rate: flat 36.13 % | gen 14.40 %
  scramble_yards: flat 5.27 yards | gen 3.80 yards
  by_down_fixed_calls: flat 30.87 % | gen 38.94 %
  int_per_aimed_throw: flat 2.14 % | gen 6.85 %
  completion_per_aimed_throw: flat 37.16 % | gen 34.32 %
  forced_throw_share: flat 64.76 % | gen 74.31 %
  completion_by_pocket_status: flat 27.30 % | gen 28.80 %
  qb_season_spread: flat 0.20 pp | gen 5.36 pp
  defence_season_spread: flat 0.51 pp | gen 2.03 pp
  unblocked_pressures_per_100: flat 19.25 per 100 dropbacks | gen 19.15 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 10.09 % [time to throw 2.369 s] | gen 11.24 % [time to throw 2.222 s]
  unblocked_men_per_100: flat 19.25 per 100 dropbacks | gen 19.15 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 93.47 % | gen 95.51 %
  quick_share_no_free_runner: flat 98.75 % | gen 98.71 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 7.86 % | gen 5.29 %
  situation_q1q3_last_two: flat 7.45 % | gen 6.36 %
  sack_share_of_contacts_in_out: flat 73.29 % [time to throw 2.369 s] | gen 62.22 % [time to throw 2.222 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.369 s] | gen 0.15 % [time to throw 2.222 s]
  sacker_mix.split.interior: flat 81.58 % [time to throw 2.369 s] | gen 81.00 % [time to throw 2.222 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 12.66 % [time to throw 2.369 s] | gen 13.18 % [time to throw 2.222 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.74 % [time to throw 2.369 s] | gen 5.82 % [time to throw 2.222 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.02 % [time to throw 2.369 s] | gen n/a % [time to throw 2.222 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 75.58 % [time to throw 2.369 s] | gen 72.20 % [time to throw 2.222 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.06 % | gen 0.85 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.39 % | gen 1.99 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 10.31 % | gen 20.31 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.14 % | gen 4.44 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.92 % | gen 15.79 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.82 % | gen 16.74 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 35.82 % | gen 36.83 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 14.00 % | gen 16.01 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 34.96 % | gen 30.79 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 22.67 % | gen 16.49 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.79 % | gen 27.04 %
  nobody_open_share: flat 45.57 % of dropbacks | gen 60.40 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 5.81 % of dropbacks | gen 10.35 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 2.61 % of dropbacks | gen 7.00 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 7.91 % of dropbacks | gen 5.97 % of dropbacks
  nobody_open_share.split.SACK: flat 29.23 % of dropbacks [time to throw 2.369 s] | gen 37.08 % of dropbacks [time to throw 2.222 s]
  clean_checkdown_share: flat 4.28 % of clean aimed throws | gen 2.54 % of clean aimed throws
  clean_later_read_share: flat 20.44 % of clean aimed throws | gen 25.84 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.65, per aimed throw 2.14; forced-throw share 64.76; completion per attempt 28.67, per aimed throw 37.16; INT-source mix CONTESTED_CATCH 92.06, TIPPED_RECOVERY 7.94
      flat PROGRESSION: 5452 aimed, INT 0.39, completion 35.82
      flat RANK_PUSHED: 1271 aimed, INT 10.31, completion 14.00
      flat CHECKDOWN: 2171 aimed, INT 0.14, completion 34.96
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 975 aimed, INT 4.92, completion 22.67
      flat ON_THE_RUN: 112 aimed, INT 9.82, completion 26.79
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.82 against a real 3.25
    gen: INT per attempt 6.00, per aimed throw 6.85; forced-throw share 74.31; completion per attempt 30.09, per aimed throw 34.32; INT-source mix CONTESTED_CATCH 54.95, TIPPED_RECOVERY 45.05
      gen PROGRESSION: 4518 aimed, INT 1.99, completion 36.83
      gen RANK_PUSHED: 837 aimed, INT 20.31, completion 16.01
      gen CHECKDOWN: 2296 aimed, INT 4.44, completion 30.79
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 1552 aimed, INT 15.79, completion 16.49
      gen ON_THE_RUN: 233 aimed, INT 16.74, completion 27.04
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.74 against a real 3.25
    the filed guard against A14 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.12 -> arm 2.14, rise 0.02 against an allowed -0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.27 -> arm 0.39, rise 0.11 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 10.91 -> arm 10.31, rise -0.60 against an allowed -0.04: PASSES
    flat CHECKDOWN: base 0.11 -> arm 0.14, rise 0.03 against an allowed -0.06: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 4.95 -> arm 4.92, rise -0.03 against an allowed -0.07: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 5.56 -> arm 9.82, rise 4.27 against an allowed -0.16: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.02 -> arm 6.85, rise -0.17 against an allowed -0.04: PASSES
    gen PROGRESSION: base 2.00 -> arm 1.99, rise -0.01 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 21.19 -> arm 20.31, rise -0.88 against an allowed -0.17: PASSES
    gen CHECKDOWN: base 4.73 -> arm 4.44, rise -0.29 against an allowed -0.20: PASSES
    gen DESPERATION: base 16.06 -> arm 15.79, rise -0.27 against an allowed -0.05: PASSES
    gen ON_THE_RUN: base 17.65 -> arm 16.74, rise -0.91 against an allowed -0.01: PASSES
    gen by class: PASSES
  exclusive affected plays against A14 (re-played): flat 8784 | gen 9623
```

### D8 (printed, the tilts' base) with D9, D10, D11, seed set 2

```text
ADR-089 step 4: the pocket report (4 arms; both leagues; every hit and sack figure with its time to throw beside it)

== D8 (printed, the tilts' base) (the base arm): release clock the decision tick ==
  time to throw: flat 2.734 s | gen 2.707 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2159 of 49443 dropbacks (4.37 per 100); pressuredSacks 2159; pressured dropbacks 20286 (41.03 per 100) [time to throw 2.734 s]
    gen: sacks 1158 of 27487 dropbacks (4.21 per 100); pressuredSacks 1115; pressured dropbacks 11561 (42.06 per 100) [time to throw 2.707 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.64% | -11.38 against 22.02% (PR #33, FTN only (held)) | -4.82 against 15.46% (main) [time to throw 2.734 s]
    gen: 9.64% | -12.38 against 22.02% (PR #33, FTN only (held)) | -5.82 against 15.46% (main) [time to throw 2.707 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.03 % | gen 42.06 %
  hit_or_sack_rate: flat 8.45 % [time to throw 2.734 s] | gen 11.21 % [time to throw 2.707 s]
  sack_rate: flat 4.37 % [time to throw 2.734 s] | gen 4.21 % [time to throw 2.707 s]
  time_to_throw: flat 2.734 seconds | gen 2.707 seconds
  sack_share_of_hit_or_sack: flat 51.68 % [time to throw 2.734 s] | gen 37.60 % [time to throw 2.707 s]
  qb_hit_on_scramble: flat 3.90 % [time to throw 2.734 s] | gen 5.53 % [time to throw 2.707 s]
  release_distribution: flat 2.734 seconds | gen 2.707 seconds
  pressured_share_by_release_bin: flat 44.10 % | gen 51.59 %
  hit_rate_by_release_bin: flat 16.50 % [time to throw 2.734 s] | gen 24.39 % [time to throw 2.707 s]
  hits_on_aimed_throws_per_dropback: flat 2.77 % [time to throw 2.734 s] | gen 5.22 % [time to throw 2.707 s]
  first_pressure_seconds: flat 1.971 seconds | gen 2.051 seconds
  first_forcing_seconds: flat 2.214 seconds | gen 2.300 seconds
  first_arrival_seconds: flat 2.000 seconds | gen 2.059 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.57%, FREE_RUNNER 51.61%, WON_REP 42.82%; gen COUNTER 5.79%, FREE_RUNNER 50.25%, WON_REP 43.96%)
  quick_pressure_share_by_origin: flat 62.35 % | gen 60.30 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.81 %
  clean_with_live_won_rep_dropbacks: flat 3.50 % | gen 3.59 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.51 % | gen 18.48 %
  throwaway_rate_clean: flat 14.42 % | gen 6.15 %
  scramble_rate: flat 6.43 % | gen 2.37 %
  scramble_yards: flat 6.36 yards | gen 5.93 yards
  by_down_fixed_calls: flat 9.72 % | gen 10.01 %
  int_per_aimed_throw: flat 2.71 % | gen 7.81 %
  completion_per_aimed_throw: flat 43.12 % | gen 41.40 %
  forced_throw_share: flat 24.03 % | gen 28.94 %
  completion_by_pocket_status: flat 22.75 % | gen 24.56 %
  qb_season_spread: flat 0.84 pp | gen 1.44 pp
  defence_season_spread: flat 0.00 pp | gen 0.91 pp
  unblocked_pressures_per_100: flat 19.26 per 100 dropbacks | gen 18.87 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 74.75 % [time to throw 2.734 s] | gen 71.88 % [time to throw 2.707 s]
  unblocked_men_per_100: flat 19.31 per 100 dropbacks | gen 18.89 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.07 % | gen 25.13 %
  quick_share_no_free_runner: flat 37.19 % | gen 35.42 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 22.77 % | gen 19.41 %
  situation_q1q3_last_two: flat 22.01 % | gen 20.52 %
  sack_share_of_contacts_in_out: flat 50.10 % [time to throw 2.734 s] | gen 37.16 % [time to throw 2.707 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.734 s] | gen 3.71 % [time to throw 2.707 s]
  sacker_mix.split.interior: flat 32.25 % [time to throw 2.734 s] | gen 34.46 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.78 % [time to throw 2.734 s] | gen 45.25 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.32 % [time to throw 2.734 s] | gen 19.93 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.65 % [time to throw 2.734 s] | gen 0.37 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.06 % [time to throw 2.734 s] | gen 33.97 % [time to throw 2.707 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.08 % | gen 6.55 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.23 % | gen 2.64 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.06 % | gen 20.80 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 3.88 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.82 % | gen 18.50 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.04 % | gen 12.58 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.97 % | gen 45.52 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.02 % | gen 17.41 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.32 % | gen 35.43 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.49 % | gen 20.56 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.40 % | gen 26.49 %
  nobody_open_share: flat 36.41 % of dropbacks | gen 35.47 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.50 % of dropbacks | gen 9.47 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.81 % of dropbacks | gen 10.46 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.74 % of dropbacks | gen 11.34 % of dropbacks
  nobody_open_share.split.SACK: flat 4.37 % of dropbacks [time to throw 2.734 s] | gen 4.21 % of dropbacks [time to throw 2.707 s]
  clean_checkdown_share: flat 5.14 % of clean aimed throws | gen 2.78 % of clean aimed throws
  clean_later_read_share: flat 21.92 % of clean aimed throws | gen 25.27 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.17, per aimed throw 2.71; forced-throw share 24.03; completion per attempt 34.54, per aimed throw 43.12; INT-source mix CONTESTED_CATCH 89.96, TIPPED_RECOVERY 10.04
      flat PROGRESSION: 21616 aimed, INT 0.23, completion 42.97
      flat RANK_PUSHED: 6458 aimed, INT 11.06, completion 17.02
      flat CHECKDOWN: 4201 aimed, INT 0.19, completion 38.32
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2871 aimed, INT 5.82, completion 24.49
      flat ON_THE_RUN: 188 aimed, INT 9.04, completion 23.40
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.04 against a real 3.25
    gen: INT per attempt 6.86, per aimed throw 7.81; forced-throw share 28.94; completion per attempt 36.37, per aimed throw 41.40; INT-source mix CONTESTED_CATCH 46.37, TIPPED_RECOVERY 53.63
      gen PROGRESSION: 13281 aimed, INT 2.64, completion 45.52
      gen RANK_PUSHED: 3653 aimed, INT 20.80, completion 17.41
      gen CHECKDOWN: 2602 aimed, INT 3.88, completion 35.43
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2875 aimed, INT 18.50, completion 20.56
      gen ON_THE_RUN: 151 aimed, INT 12.58, completion 26.49
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.58 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D9 (the PUSH or BLOCKED tilt alone (AM-7 item 5)): release clock the decision tick ==
  time to throw: flat 2.734 s | gen 2.707 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2155 of 49452 dropbacks (4.36 per 100); pressuredSacks 2155; pressured dropbacks 20304 (41.06 per 100) [time to throw 2.734 s]
    gen: sacks 1154 of 27484 dropbacks (4.20 per 100); pressuredSacks 1111; pressured dropbacks 11553 (42.04 per 100) [time to throw 2.707 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.61% | -11.41 against 22.02% (PR #33, FTN only (held)) | -4.85 against 15.46% (main) [time to throw 2.734 s]
    gen: 9.62% | -12.40 against 22.02% (PR #33, FTN only (held)) | -5.84 against 15.46% (main) [time to throw 2.707 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.06 % | gen 42.04 %
  hit_or_sack_rate: flat 8.45 % [time to throw 2.734 s] | gen 11.20 % [time to throw 2.707 s]
  sack_rate: flat 4.36 % [time to throw 2.734 s] | gen 4.20 % [time to throw 2.707 s]
  time_to_throw: flat 2.734 seconds | gen 2.707 seconds
  sack_share_of_hit_or_sack: flat 51.54 % [time to throw 2.734 s] | gen 37.49 % [time to throw 2.707 s]
  qb_hit_on_scramble: flat 3.90 % [time to throw 2.734 s] | gen 5.52 % [time to throw 2.707 s]
  release_distribution: flat 2.734 seconds | gen 2.707 seconds
  pressured_share_by_release_bin: flat 44.13 % | gen 51.58 %
  hit_rate_by_release_bin: flat 16.50 % [time to throw 2.734 s] | gen 24.37 % [time to throw 2.707 s]
  hits_on_aimed_throws_per_dropback: flat 2.77 % [time to throw 2.734 s] | gen 5.23 % [time to throw 2.707 s]
  first_pressure_seconds: flat 1.971 seconds | gen 2.050 seconds
  first_forcing_seconds: flat 2.214 seconds | gen 2.300 seconds
  first_arrival_seconds: flat 1.999 seconds | gen 2.060 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.57%, FREE_RUNNER 51.61%, WON_REP 42.82%; gen COUNTER 5.74%, FREE_RUNNER 50.32%, WON_REP 43.94%)
  quick_pressure_share_by_origin: flat 62.33 % | gen 60.36 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.80 %
  clean_with_live_won_rep_dropbacks: flat 3.50 % | gen 3.58 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.52 % | gen 18.52 %
  throwaway_rate_clean: flat 14.42 % | gen 6.16 %
  scramble_rate: flat 6.43 % | gen 2.37 %
  scramble_yards: flat 6.38 yards | gen 5.92 yards
  by_down_fixed_calls: flat 9.65 % | gen 9.90 %
  int_per_aimed_throw: flat 2.70 % | gen 7.81 %
  completion_per_aimed_throw: flat 43.10 % | gen 41.39 %
  forced_throw_share: flat 24.06 % | gen 28.91 %
  completion_by_pocket_status: flat 22.72 % | gen 24.58 %
  qb_season_spread: flat 0.84 pp | gen 1.38 pp
  defence_season_spread: flat 0.00 pp | gen 0.93 pp
  unblocked_pressures_per_100: flat 19.28 per 100 dropbacks | gen 18.88 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 74.77 % [time to throw 2.734 s] | gen 71.83 % [time to throw 2.707 s]
  unblocked_men_per_100: flat 19.32 per 100 dropbacks | gen 18.90 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.13 % | gen 25.12 %
  quick_share_no_free_runner: flat 37.16 % | gen 35.44 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 22.56 % | gen 19.73 %
  situation_q1q3_last_two: flat 22.13 % | gen 20.61 %
  sack_share_of_contacts_in_out: flat 49.98 % [time to throw 2.734 s] | gen 37.06 % [time to throw 2.707 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.734 s] | gen 3.73 % [time to throw 2.707 s]
  sacker_mix.split.interior: flat 31.89 % [time to throw 2.734 s] | gen 34.21 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.05 % [time to throw 2.734 s] | gen 45.47 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.41 % [time to throw 2.734 s] | gen 19.95 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.65 % [time to throw 2.734 s] | gen 0.37 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.70 % [time to throw 2.734 s] | gen 33.73 % [time to throw 2.707 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.08 % | gen 6.51 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.24 % | gen 2.63 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.04 % | gen 20.82 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 3.88 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.75 % | gen 18.47 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.04 % | gen 12.58 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.95 % | gen 45.49 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.06 % | gen 17.51 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.27 % | gen 35.36 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.51 % | gen 20.63 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.40 % | gen 26.49 %
  nobody_open_share: flat 36.40 % of dropbacks | gen 35.50 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.50 % of dropbacks | gen 9.47 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.80 % of dropbacks | gen 10.48 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.74 % of dropbacks | gen 11.36 % of dropbacks
  nobody_open_share.split.SACK: flat 4.36 % of dropbacks [time to throw 2.734 s] | gen 4.20 % of dropbacks [time to throw 2.707 s]
  clean_checkdown_share: flat 5.13 % of clean aimed throws | gen 2.77 % of clean aimed throws
  clean_later_read_share: flat 21.96 % of clean aimed throws | gen 25.26 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.16, per aimed throw 2.70; forced-throw share 24.06; completion per attempt 34.53, per aimed throw 43.10; INT-source mix CONTESTED_CATCH 89.73, TIPPED_RECOVERY 10.27
      flat PROGRESSION: 21623 aimed, INT 0.24, completion 42.95
      flat RANK_PUSHED: 6459 aimed, INT 11.04, completion 17.06
      flat CHECKDOWN: 4204 aimed, INT 0.19, completion 38.27
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2868 aimed, INT 5.75, completion 24.51
      flat ON_THE_RUN: 188 aimed, INT 9.04, completion 23.40
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.04 against a real 3.25
    gen: INT per attempt 6.86, per aimed throw 7.81; forced-throw share 28.91; completion per attempt 36.36, per aimed throw 41.39; INT-source mix CONTESTED_CATCH 46.39, TIPPED_RECOVERY 53.61
      gen PROGRESSION: 13274 aimed, INT 2.63, completion 45.49
      gen RANK_PUSHED: 3650 aimed, INT 20.82, completion 17.51
      gen CHECKDOWN: 2602 aimed, INT 3.88, completion 35.36
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2880 aimed, INT 18.47, completion 20.63
      gen ON_THE_RUN: 151 aimed, INT 12.58, completion 26.49
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.58 against a real 3.25
    the filed guard against D8 (printed, the tilts' base) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.71 -> arm 2.70, rise -0.01 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.23 -> arm 0.24, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.06 -> arm 11.04, rise -0.02 against an allowed 0.00: PASSES
    flat CHECKDOWN: base 0.19 -> arm 0.19, rise -0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 5.82 -> arm 5.75, rise -0.06 against an allowed 0.00: PASSES
    flat ON_THE_RUN: base 9.04 -> arm 9.04, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.81 -> arm 7.81, rise -0.00 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.64 -> arm 2.63, rise -0.01 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 20.80 -> arm 20.82, rise 0.02 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.88 -> arm 3.88, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 18.50 -> arm 18.47, rise -0.03 against an allowed -0.00: PASSES
    gen ON_THE_RUN: base 12.58 -> arm 12.58, rise 0.00 against an allowed 0.00: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D8 (printed, the tilts' base): flat 0 | gen 0

== D10 (the free-run tilt alone (AM-7 items 5 and 6)): release clock the decision tick ==
  time to throw: flat 2.735 s | gen 2.706 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2272 of 49322 dropbacks (4.61 per 100); pressuredSacks 2272; pressured dropbacks 20286 (41.13 per 100) [time to throw 2.735 s]
    gen: sacks 1210 of 27357 dropbacks (4.42 per 100); pressuredSacks 1168; pressured dropbacks 11479 (41.96 per 100) [time to throw 2.706 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.20% | -10.82 against 22.02% (PR #33, FTN only (held)) | -4.26 against 15.46% (main) [time to throw 2.735 s]
    gen: 10.18% | -11.84 against 22.02% (PR #33, FTN only (held)) | -5.28 against 15.46% (main) [time to throw 2.706 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.13 % | gen 41.96 %
  hit_or_sack_rate: flat 8.52 % [time to throw 2.735 s] | gen 11.20 % [time to throw 2.706 s]
  sack_rate: flat 4.61 % [time to throw 2.735 s] | gen 4.42 % [time to throw 2.706 s]
  time_to_throw: flat 2.735 seconds | gen 2.706 seconds
  sack_share_of_hit_or_sack: flat 54.10 % [time to throw 2.735 s] | gen 39.49 % [time to throw 2.706 s]
  qb_hit_on_scramble: flat 3.22 % [time to throw 2.735 s] | gen 4.64 % [time to throw 2.706 s]
  release_distribution: flat 2.735 seconds | gen 2.706 seconds
  pressured_share_by_release_bin: flat 43.69 % | gen 51.28 %
  hit_rate_by_release_bin: flat 16.47 % [time to throw 2.735 s] | gen 24.20 % [time to throw 2.706 s]
  hits_on_aimed_throws_per_dropback: flat 2.75 % [time to throw 2.735 s] | gen 5.18 % [time to throw 2.706 s]
  first_pressure_seconds: flat 1.972 seconds | gen 2.048 seconds
  first_forcing_seconds: flat 2.216 seconds | gen 2.300 seconds
  first_arrival_seconds: flat 2.000 seconds | gen 2.061 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.56%, FREE_RUNNER 51.50%, WON_REP 42.94%; gen COUNTER 5.78%, FREE_RUNNER 50.13%, WON_REP 44.09%)
  quick_pressure_share_by_origin: flat 62.29 % | gen 60.52 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.81 %
  clean_with_live_won_rep_dropbacks: flat 3.52 % | gen 3.59 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.18 % | gen 17.87 %
  throwaway_rate_clean: flat 14.46 % | gen 6.11 %
  scramble_rate: flat 6.42 % | gen 2.37 %
  scramble_yards: flat 6.45 yards | gen 5.80 yards
  by_down_fixed_calls: flat 10.24 % | gen 10.87 %
  int_per_aimed_throw: flat 2.77 % | gen 7.80 %
  completion_per_aimed_throw: flat 43.06 % | gen 41.47 %
  forced_throw_share: flat 24.10 % | gen 28.93 %
  completion_by_pocket_status: flat 22.82 % | gen 24.62 %
  qb_season_spread: flat 0.54 pp | gen 1.30 pp
  defence_season_spread: flat 0.00 pp | gen 1.24 pp
  unblocked_pressures_per_100: flat 19.25 per 100 dropbacks | gen 18.84 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 74.88 % [time to throw 2.735 s] | gen 71.64 % [time to throw 2.706 s]
  unblocked_men_per_100: flat 19.30 per 100 dropbacks | gen 18.86 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.38 % | gen 25.40 %
  quick_share_no_free_runner: flat 37.25 % | gen 35.67 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 22.78 % | gen 18.79 %
  situation_q1q3_last_two: flat 20.89 % | gen 19.92 %
  sack_share_of_contacts_in_out: flat 52.72 % [time to throw 2.735 s] | gen 39.08 % [time to throw 2.706 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.735 s] | gen 3.47 % [time to throw 2.706 s]
  sacker_mix.split.interior: flat 31.71 % [time to throw 2.735 s] | gen 32.98 % [time to throw 2.706 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.44 % [time to throw 2.735 s] | gen 46.23 % [time to throw 2.706 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.09 % [time to throw 2.735 s] | gen 20.44 % [time to throw 2.706 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.75 % [time to throw 2.735 s] | gen 0.35 % [time to throw 2.706 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.49 % [time to throw 2.735 s] | gen 32.40 % [time to throw 2.706 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.13 % | gen 6.53 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.24 % | gen 2.64 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.22 % | gen 20.69 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 3.81 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.94 % | gen 18.66 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.04 % | gen 11.84 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.98 % | gen 45.57 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.97 % | gen 17.58 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.26 % | gen 35.72 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.33 % | gen 20.40 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.16 % | gen 25.00 %
  nobody_open_share: flat 36.48 % of dropbacks | gen 35.46 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.40 % of dropbacks | gen 9.50 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.84 % of dropbacks | gen 10.50 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.63 % of dropbacks | gen 11.04 % of dropbacks
  nobody_open_share.split.SACK: flat 4.61 % of dropbacks [time to throw 2.735 s] | gen 4.42 % of dropbacks [time to throw 2.706 s]
  clean_checkdown_share: flat 5.03 % of clean aimed throws | gen 2.78 % of clean aimed throws
  clean_later_read_share: flat 21.91 % of clean aimed throws | gen 25.12 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.22, per aimed throw 2.77; forced-throw share 24.10; completion per attempt 34.53, per aimed throw 43.06; INT-source mix CONTESTED_CATCH 89.73, TIPPED_RECOVERY 10.27
      flat PROGRESSION: 21495 aimed, INT 0.24, completion 42.98
      flat RANK_PUSHED: 6489 aimed, INT 11.22, completion 16.97
      flat CHECKDOWN: 4145 aimed, INT 0.19, completion 38.26
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2881 aimed, INT 5.94, completion 24.33
      flat ON_THE_RUN: 177 aimed, INT 9.04, completion 23.16
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.04 against a real 3.25
    gen: INT per attempt 6.88, per aimed throw 7.80; forced-throw share 28.93; completion per attempt 36.56, per aimed throw 41.47; INT-source mix CONTESTED_CATCH 46.35, TIPPED_RECOVERY 53.65
      gen PROGRESSION: 13223 aimed, INT 2.64, completion 45.57
      gen RANK_PUSHED: 3634 aimed, INT 20.69, completion 17.58
      gen CHECKDOWN: 2598 aimed, INT 3.81, completion 35.72
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2872 aimed, INT 18.66, completion 20.40
      gen ON_THE_RUN: 152 aimed, INT 11.84, completion 25.00
      gen on the run: clean INT n/a against a real 2.11; pressured INT 11.84 against a real 3.25
    the filed guard against D8 (printed, the tilts' base) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.71 -> arm 2.77, rise 0.06 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.23 -> arm 0.24, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.06 -> arm 11.22, rise 0.16 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.19 -> arm 0.19, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 5.82 -> arm 5.94, rise 0.12 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 9.04 -> arm 9.04, rise -0.00 against an allowed -0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.81 -> arm 7.80, rise -0.01 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.64 -> arm 2.64, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.80 -> arm 20.69, rise -0.11 against an allowed -0.00: PASSES
    gen CHECKDOWN: base 3.88 -> arm 3.81, rise -0.07 against an allowed -0.01: PASSES
    gen DESPERATION: base 18.50 -> arm 18.66, rise 0.16 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 12.58 -> arm 11.84, rise -0.74 against an allowed -0.00: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D8 (printed, the tilts' base): flat 0 | gen 0

== D11 (the BEHIND or NEVER tilt alone (AM-7 item 5)): release clock the decision tick ==
  time to throw: flat 2.734 s | gen 2.707 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2162 of 49430 dropbacks (4.37 per 100); pressuredSacks 2162; pressured dropbacks 20272 (41.01 per 100) [time to throw 2.734 s]
    gen: sacks 1159 of 27480 dropbacks (4.22 per 100); pressuredSacks 1116; pressured dropbacks 11552 (42.04 per 100) [time to throw 2.707 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.66% | -11.36 against 22.02% (PR #33, FTN only (held)) | -4.80 against 15.46% (main) [time to throw 2.734 s]
    gen: 9.66% | -12.36 against 22.02% (PR #33, FTN only (held)) | -5.80 against 15.46% (main) [time to throw 2.707 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.01 % | gen 42.04 %
  hit_or_sack_rate: flat 8.44 % [time to throw 2.734 s] | gen 11.19 % [time to throw 2.707 s]
  sack_rate: flat 4.37 % [time to throw 2.734 s] | gen 4.22 % [time to throw 2.707 s]
  time_to_throw: flat 2.734 seconds | gen 2.707 seconds
  sack_share_of_hit_or_sack: flat 51.81 % [time to throw 2.734 s] | gen 37.70 % [time to throw 2.707 s]
  qb_hit_on_scramble: flat 3.90 % [time to throw 2.734 s] | gen 5.52 % [time to throw 2.707 s]
  release_distribution: flat 2.734 seconds | gen 2.707 seconds
  pressured_share_by_release_bin: flat 44.07 % | gen 51.54 %
  hit_rate_by_release_bin: flat 16.45 % [time to throw 2.734 s] | gen 24.35 % [time to throw 2.707 s]
  hits_on_aimed_throws_per_dropback: flat 2.76 % [time to throw 2.734 s] | gen 5.21 % [time to throw 2.707 s]
  first_pressure_seconds: flat 1.972 seconds | gen 2.051 seconds
  first_forcing_seconds: flat 2.214 seconds | gen 2.301 seconds
  first_arrival_seconds: flat 2.000 seconds | gen 2.060 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.58%, FREE_RUNNER 51.61%, WON_REP 42.81%; gen COUNTER 5.80%, FREE_RUNNER 50.17%, WON_REP 44.03%)
  quick_pressure_share_by_origin: flat 62.33 % | gen 60.27 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.81 %
  clean_with_live_won_rep_dropbacks: flat 3.49 % | gen 3.60 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.49 % | gen 18.44 %
  throwaway_rate_clean: flat 14.42 % | gen 6.18 %
  scramble_rate: flat 6.43 % | gen 2.37 %
  scramble_yards: flat 6.34 yards | gen 5.92 yards
  by_down_fixed_calls: flat 9.76 % | gen 10.07 %
  int_per_aimed_throw: flat 2.71 % | gen 7.82 %
  completion_per_aimed_throw: flat 43.13 % | gen 41.39 %
  forced_throw_share: flat 24.01 % | gen 28.92 %
  completion_by_pocket_status: flat 22.75 % | gen 24.61 %
  qb_season_spread: flat 0.86 pp | gen 1.45 pp
  defence_season_spread: flat 0.00 pp | gen 0.91 pp
  unblocked_pressures_per_100: flat 19.25 per 100 dropbacks | gen 18.83 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 74.72 % [time to throw 2.734 s] | gen 71.83 % [time to throw 2.707 s]
  unblocked_men_per_100: flat 19.30 per 100 dropbacks | gen 18.85 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.06 % | gen 25.16 %
  quick_share_no_free_runner: flat 37.16 % | gen 35.46 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 22.76 % | gen 19.36 %
  situation_q1q3_last_two: flat 22.06 % | gen 20.55 %
  sack_share_of_contacts_in_out: flat 50.23 % [time to throw 2.734 s] | gen 37.27 % [time to throw 2.707 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.734 s] | gen 3.71 % [time to throw 2.707 s]
  sacker_mix.split.interior: flat 32.32 % [time to throw 2.734 s] | gen 34.33 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.79 % [time to throw 2.734 s] | gen 45.39 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.24 % [time to throw 2.734 s] | gen 19.91 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.65 % [time to throw 2.734 s] | gen 0.37 % [time to throw 2.707 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.11 % [time to throw 2.734 s] | gen 33.85 % [time to throw 2.707 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.08 % | gen 6.56 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.23 % | gen 2.64 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.07 % | gen 20.81 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 3.88 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.81 % | gen 18.54 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.09 % | gen 12.67 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.99 % | gen 45.53 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.02 % | gen 17.39 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.38 % | gen 35.54 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.40 % | gen 20.49 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 22.99 % | gen 26.00 %
  nobody_open_share: flat 36.41 % of dropbacks | gen 35.47 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.49 % of dropbacks | gen 9.46 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.81 % of dropbacks | gen 10.46 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.73 % of dropbacks | gen 11.33 % of dropbacks
  nobody_open_share.split.SACK: flat 4.37 % of dropbacks [time to throw 2.734 s] | gen 4.22 % of dropbacks [time to throw 2.707 s]
  clean_checkdown_share: flat 5.13 % of clean aimed throws | gen 2.78 % of clean aimed throws
  clean_later_read_share: flat 21.93 % of clean aimed throws | gen 25.27 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.17, per aimed throw 2.71; forced-throw share 24.01; completion per attempt 34.55, per aimed throw 43.13; INT-source mix CONTESTED_CATCH 89.97, TIPPED_RECOVERY 10.03
      flat PROGRESSION: 21608 aimed, INT 0.23, completion 42.99
      flat RANK_PUSHED: 6458 aimed, INT 11.07, completion 17.02
      flat CHECKDOWN: 4197 aimed, INT 0.19, completion 38.38
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2873 aimed, INT 5.81, completion 24.40
      flat ON_THE_RUN: 187 aimed, INT 9.09, completion 22.99
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.09 against a real 3.25
    gen: INT per attempt 6.87, per aimed throw 7.82; forced-throw share 28.92; completion per attempt 36.37, per aimed throw 41.39; INT-source mix CONTESTED_CATCH 46.32, TIPPED_RECOVERY 53.68
      gen PROGRESSION: 13273 aimed, INT 2.64, completion 45.53
      gen RANK_PUSHED: 3657 aimed, INT 20.81, completion 17.39
      gen CHECKDOWN: 2600 aimed, INT 3.88, completion 35.54
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2875 aimed, INT 18.54, completion 20.49
      gen ON_THE_RUN: 150 aimed, INT 12.67, completion 26.00
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.67 against a real 3.25
    the filed guard against D8 (printed, the tilts' base) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.71 -> arm 2.71, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.23 -> arm 0.23, rise 0.00 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 11.06 -> arm 11.07, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.19 -> arm 0.19, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 5.82 -> arm 5.81, rise -0.00 against an allowed 0.00: PASSES
    flat ON_THE_RUN: base 9.04 -> arm 9.09, rise 0.05 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.81 -> arm 7.82, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 2.64 -> arm 2.64, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.80 -> arm 20.81, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.88 -> arm 3.88, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 18.50 -> arm 18.54, rise 0.03 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 12.58 -> arm 12.67, rise 0.08 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D8 (printed, the tilts' base): flat 0 | gen 0
```

### D1 (design) with D12, D13, D14, seed set 2

```text
ADR-089 step 4: the pocket report (4 arms; both leagues; every hit and sack figure with its time to throw beside it)

== D1 (design) (the base arm): release clock the decision tick ==
  time to throw: flat 1.872 s | gen 2.010 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 982 of 51981 dropbacks (1.89 per 100); pressuredSacks 982; pressured dropbacks 11414 (21.96 per 100) [time to throw 1.872 s]
    gen: sacks 406 of 28571 dropbacks (1.42 per 100); pressuredSacks 406; pressured dropbacks 7115 (24.90 per 100) [time to throw 2.010 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.60% | -13.42 against 22.02% (PR #33, FTN only (held)) | -6.86 against 15.46% (main) [time to throw 1.872 s]
    gen: 5.71% | -16.31 against 22.02% (PR #33, FTN only (held)) | -9.75 against 15.46% (main) [time to throw 2.010 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.96 % | gen 24.90 %
  hit_or_sack_rate: flat 7.74 % [time to throw 1.872 s] | gen 10.66 % [time to throw 2.010 s]
  sack_rate: flat 1.89 % [time to throw 1.872 s] | gen 1.42 % [time to throw 2.010 s]
  time_to_throw: flat 1.872 seconds | gen 2.010 seconds
  sack_share_of_hit_or_sack: flat 24.40 % [time to throw 1.872 s] | gen 13.33 % [time to throw 2.010 s]
  qb_hit_on_scramble: flat 3.72 % [time to throw 1.872 s] | gen 3.65 % [time to throw 2.010 s]
  release_distribution: flat 1.872 seconds | gen 2.010 seconds
  pressured_share_by_release_bin: flat 16.80 % | gen 21.22 %
  hit_rate_by_release_bin: flat 11.52 % [time to throw 1.872 s] | gen 12.75 % [time to throw 2.010 s]
  hits_on_aimed_throws_per_dropback: flat 5.34 % [time to throw 1.872 s] | gen 8.66 % [time to throw 2.010 s]
  first_pressure_seconds: flat 1.393 seconds | gen 1.567 seconds
  first_forcing_seconds: flat 1.745 seconds | gen 1.898 seconds
  first_arrival_seconds: flat 1.894 seconds | gen 1.985 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.69%, FREE_RUNNER 69.66%, WON_REP 26.64%; gen COUNTER 3.92%, FREE_RUNNER 64.25%, WON_REP 31.83%)
  quick_pressure_share_by_origin: flat 88.47 % | gen 80.69 %
  clean_with_live_won_rep_ticks: flat 0.41 % | gen 0.53 %
  clean_with_live_won_rep_dropbacks: flat 1.17 % | gen 1.62 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.70 % | gen 11.16 %
  throwaway_rate_clean: flat 18.66 % | gen 8.13 %
  scramble_rate: flat 2.17 % | gen 0.48 %
  scramble_yards: flat 5.21 yards | gen 4.08 yards
  by_down_fixed_calls: flat 8.28 % | gen 7.33 %
  int_per_aimed_throw: flat 2.73 % | gen 7.65 %
  completion_per_aimed_throw: flat 46.49 % | gen 42.97 %
  forced_throw_share: flat 10.99 % | gen 17.12 %
  completion_by_pocket_status: flat 26.75 % | gen 26.13 %
  qb_season_spread: flat 0.00 pp | gen 2.21 pp
  defence_season_spread: flat 0.00 pp | gen 1.41 pp
  unblocked_pressures_per_100: flat 15.77 per 100 dropbacks | gen 15.85 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 32.62 % [time to throw 1.872 s] | gen 22.95 % [time to throw 2.010 s]
  unblocked_men_per_100: flat 19.01 per 100 dropbacks | gen 19.12 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.26 % | gen 10.70 %
  quick_share_no_free_runner: flat 72.21 % | gen 59.89 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.08 % | gen 11.53 %
  situation_q1q3_last_two: flat 13.72 % | gen 10.25 %
  sack_share_of_contacts_in_out: flat 55.76 % [time to throw 1.872 s] | gen 41.73 % [time to throw 2.010 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.872 s] | gen 0.00 % [time to throw 2.010 s]
  sacker_mix.split.interior: flat 31.84 % [time to throw 1.872 s] | gen 32.70 % [time to throw 2.010 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 45.64 % [time to throw 1.872 s] | gen 47.54 % [time to throw 2.010 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.96 % [time to throw 1.872 s] | gen 19.52 % [time to throw 2.010 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.56 % [time to throw 1.872 s] | gen 0.25 % [time to throw 2.010 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.36 % [time to throw 1.872 s] | gen 33.00 % [time to throw 2.010 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 2.18 % | gen 3.66 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.37 % | gen 2.73 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.80 % | gen 21.31 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 3.59 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.67 % | gen 16.95 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 4.95 % | gen 15.73 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.80 % | gen 46.68 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.77 % | gen 19.41 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.39 % | gen 39.91 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.43 % | gen 20.28 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.23 % | gen 16.85 %
  nobody_open_share: flat 44.04 % of dropbacks | gen 31.43 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.52 % of dropbacks | gen 10.72 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.62 % of dropbacks | gen 10.41 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 18.01 % of dropbacks | gen 8.88 % of dropbacks
  nobody_open_share.split.SACK: flat 1.89 % of dropbacks [time to throw 1.872 s] | gen 1.42 % of dropbacks [time to throw 2.010 s]
  clean_checkdown_share: flat 19.62 % of clean aimed throws | gen 6.90 % of clean aimed throws
  clean_later_read_share: flat 15.01 % of clean aimed throws | gen 21.74 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.21, per aimed throw 2.73; forced-throw share 10.99; completion per attempt 37.76, per aimed throw 46.49; INT-source mix CONTESTED_CATCH 91.03, TIPPED_RECOVERY 8.97
      flat PROGRESSION: 20913 aimed, INT 0.37, completion 45.80
      flat RANK_PUSHED: 6823 aimed, INT 11.80, completion 16.77
      flat CHECKDOWN: 9109 aimed, INT 0.18, completion 45.39
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3441 aimed, INT 5.67, completion 27.43
      flat ON_THE_RUN: 222 aimed, INT 4.95, completion 25.23
      flat on the run: clean INT n/a against a real 2.11; pressured INT 4.95 against a real 3.25
    gen: INT per attempt 6.95, per aimed throw 7.65; forced-throw share 17.12; completion per attempt 39.08, per aimed throw 42.97; INT-source mix CONTESTED_CATCH 46.02, TIPPED_RECOVERY 53.98
      gen PROGRESSION: 15105 aimed, INT 2.73, completion 46.68
      gen RANK_PUSHED: 4261 aimed, INT 21.31, completion 19.41
      gen CHECKDOWN: 3062 aimed, INT 3.59, completion 39.91
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2973 aimed, INT 16.95, completion 20.28
      gen ON_THE_RUN: 89 aimed, INT 15.73, completion 16.85
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.73 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D12 (information, direction only (AM-7 item 12)): release clock the decision tick ==
  time to throw: flat 1.871 s | gen 2.009 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 961 of 51980 dropbacks (1.85 per 100); pressuredSacks 961; pressured dropbacks 11423 (21.98 per 100) [time to throw 1.871 s]
    gen: sacks 389 of 28540 dropbacks (1.36 per 100); pressuredSacks 389; pressured dropbacks 7095 (24.86 per 100) [time to throw 2.009 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.41% | -13.61 against 22.02% (PR #33, FTN only (held)) | -7.05 against 15.46% (main) [time to throw 1.871 s]
    gen: 5.48% | -16.54 against 22.02% (PR #33, FTN only (held)) | -9.98 against 15.46% (main) [time to throw 2.009 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.98 % | gen 24.86 %
  hit_or_sack_rate: flat 7.74 % [time to throw 1.871 s] | gen 10.67 % [time to throw 2.009 s]
  sack_rate: flat 1.85 % [time to throw 1.871 s] | gen 1.36 % [time to throw 2.009 s]
  time_to_throw: flat 1.871 seconds | gen 2.009 seconds
  sack_share_of_hit_or_sack: flat 23.88 % [time to throw 1.871 s] | gen 12.77 % [time to throw 2.009 s]
  qb_hit_on_scramble: flat 4.02 % [time to throw 1.871 s] | gen 3.57 % [time to throw 2.009 s]
  release_distribution: flat 1.871 seconds | gen 2.009 seconds
  pressured_share_by_release_bin: flat 16.83 % | gen 21.33 %
  hit_rate_by_release_bin: flat 11.48 % [time to throw 1.871 s] | gen 12.72 % [time to throw 2.009 s]
  hits_on_aimed_throws_per_dropback: flat 5.34 % [time to throw 1.871 s] | gen 8.67 % [time to throw 2.009 s]
  first_pressure_seconds: flat 1.392 seconds | gen 1.567 seconds
  first_forcing_seconds: flat 1.744 seconds | gen 1.898 seconds
  first_arrival_seconds: flat 1.897 seconds | gen 1.988 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.69%, FREE_RUNNER 69.74%, WON_REP 26.57%; gen COUNTER 3.91%, FREE_RUNNER 64.25%, WON_REP 31.84%)
  quick_pressure_share_by_origin: flat 88.50 % | gen 80.72 %
  clean_with_live_won_rep_ticks: flat 0.41 % | gen 0.53 %
  clean_with_live_won_rep_dropbacks: flat 1.17 % | gen 1.60 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.85 % | gen 11.42 %
  throwaway_rate_clean: flat 18.62 % | gen 8.08 %
  scramble_rate: flat 2.20 % | gen 0.49 %
  scramble_yards: flat 5.17 yards | gen 3.94 yards
  by_down_fixed_calls: flat 8.06 % | gen 6.23 %
  int_per_aimed_throw: flat 2.71 % | gen 7.62 %
  completion_per_aimed_throw: flat 46.54 % | gen 42.95 %
  forced_throw_share: flat 10.98 % | gen 17.10 %
  completion_by_pocket_status: flat 26.78 % | gen 26.03 %
  qb_season_spread: flat 0.00 pp | gen 2.01 pp
  defence_season_spread: flat 0.00 pp | gen 1.36 pp
  unblocked_pressures_per_100: flat 15.81 per 100 dropbacks | gen 15.83 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 32.63 % [time to throw 1.871 s] | gen 22.88 % [time to throw 2.009 s]
  unblocked_men_per_100: flat 19.05 per 100 dropbacks | gen 19.08 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.23 % | gen 10.72 %
  quick_share_no_free_runner: flat 72.07 % | gen 60.00 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.71 % | gen 11.92 %
  situation_q1q3_last_two: flat 13.91 % | gen 10.20 %
  sack_share_of_contacts_in_out: flat 54.39 % [time to throw 1.871 s] | gen 40.06 % [time to throw 2.009 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.871 s] | gen 0.00 % [time to throw 2.009 s]
  sacker_mix.split.interior: flat 32.10 % [time to throw 1.871 s] | gen 31.38 % [time to throw 2.009 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.01 % [time to throw 1.871 s] | gen 46.49 % [time to throw 2.009 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.31 % [time to throw 1.871 s] | gen 21.74 % [time to throw 2.009 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.57 % [time to throw 1.871 s] | gen 0.39 % [time to throw 2.009 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.63 % [time to throw 1.871 s] | gen 31.62 % [time to throw 2.009 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 2.18 % | gen 3.62 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.37 % | gen 2.70 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.68 % | gen 21.19 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 3.60 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.68 % | gen 17.00 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 4.98 % | gen 15.12 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.81 % | gen 46.62 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.77 % | gen 19.29 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.52 % | gen 39.93 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.58 % | gen 20.52 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.24 % | gen 17.44 %
  nobody_open_share: flat 44.00 % of dropbacks | gen 31.46 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.53 % of dropbacks | gen 10.71 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.61 % of dropbacks | gen 10.47 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 18.01 % of dropbacks | gen 8.91 % of dropbacks
  nobody_open_share.split.SACK: flat 1.85 % of dropbacks [time to throw 1.871 s] | gen 1.36 % of dropbacks [time to throw 2.009 s]
  clean_checkdown_share: flat 19.64 % of clean aimed throws | gen 6.86 % of clean aimed throws
  clean_later_read_share: flat 15.01 % of clean aimed throws | gen 21.75 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.20, per aimed throw 2.71; forced-throw share 10.98; completion per attempt 37.80, per aimed throw 46.54; INT-source mix CONTESTED_CATCH 90.88, TIPPED_RECOVERY 9.12
      flat PROGRESSION: 20922 aimed, INT 0.37, completion 45.81
      flat RANK_PUSHED: 6822 aimed, INT 11.68, completion 16.77
      flat CHECKDOWN: 9114 aimed, INT 0.18, completion 45.52
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3434 aimed, INT 5.68, completion 27.58
      flat ON_THE_RUN: 221 aimed, INT 4.98, completion 26.24
      flat on the run: clean INT n/a against a real 2.11; pressured INT 4.98 against a real 3.25
    gen: INT per attempt 6.93, per aimed throw 7.62; forced-throw share 17.10; completion per attempt 39.05, per aimed throw 42.95; INT-source mix CONTESTED_CATCH 45.93, TIPPED_RECOVERY 54.07
      gen PROGRESSION: 15080 aimed, INT 2.70, completion 46.62
      gen RANK_PUSHED: 4256 aimed, INT 21.19, completion 19.29
      gen CHECKDOWN: 3058 aimed, INT 3.60, completion 39.93
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2988 aimed, INT 17.00, completion 20.52
      gen ON_THE_RUN: 86 aimed, INT 15.12, completion 17.44
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.12 against a real 3.25
    the filed guard against D1 (design) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.73 -> arm 2.71, rise -0.02 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.37 -> arm 0.37, rise -0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.80 -> arm 11.68, rise -0.12 against an allowed 0.00: PASSES
    flat CHECKDOWN: base 0.18 -> arm 0.18, rise -0.00 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.67 -> arm 5.68, rise 0.01 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 4.95 -> arm 4.98, rise 0.02 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.65 -> arm 7.62, rise -0.03 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.73 -> arm 2.70, rise -0.04 against an allowed 0.00: PASSES
    gen RANK_PUSHED: base 21.31 -> arm 21.19, rise -0.12 against an allowed -0.00: PASSES
    gen CHECKDOWN: base 3.59 -> arm 3.60, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 16.95 -> arm 17.00, rise 0.05 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 15.73 -> arm 15.12, rise -0.61 against an allowed -0.01: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D1 (design): flat 0 | gen 0

== D13 (information (§4.5 item 7)): release clock the decision tick ==
  time to throw: flat 1.870 s | gen 2.013 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1234 of 51732 dropbacks (2.39 per 100); pressuredSacks 1234; pressured dropbacks 11374 (21.99 per 100) [time to throw 1.870 s]
    gen: sacks 638 of 28373 dropbacks (2.25 per 100); pressuredSacks 638; pressured dropbacks 7094 (25.00 per 100) [time to throw 2.013 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.85% | -11.17 against 22.02% (PR #33, FTN only (held)) | -4.61 against 15.46% (main) [time to throw 1.870 s]
    gen: 8.99% | -13.03 against 22.02% (PR #33, FTN only (held)) | -6.47 against 15.46% (main) [time to throw 2.013 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.99 % | gen 25.00 %
  hit_or_sack_rate: flat 7.78 % [time to throw 1.870 s] | gen 10.73 % [time to throw 2.013 s]
  sack_rate: flat 2.39 % [time to throw 1.870 s] | gen 2.25 % [time to throw 2.013 s]
  time_to_throw: flat 1.870 seconds | gen 2.013 seconds
  sack_share_of_hit_or_sack: flat 30.67 % [time to throw 1.870 s] | gen 20.95 % [time to throw 2.013 s]
  qb_hit_on_scramble: flat 3.79 % [time to throw 1.870 s] | gen 3.60 % [time to throw 2.013 s]
  release_distribution: flat 1.870 seconds | gen 2.013 seconds
  pressured_share_by_release_bin: flat 15.59 % | gen 19.50 %
  hit_rate_by_release_bin: flat 9.03 % [time to throw 1.870 s] | gen 10.49 % [time to throw 2.013 s]
  hits_on_aimed_throws_per_dropback: flat 4.90 % [time to throw 1.870 s] | gen 7.88 % [time to throw 2.013 s]
  first_pressure_seconds: flat 1.392 seconds | gen 1.565 seconds
  first_forcing_seconds: flat 1.744 seconds | gen 1.894 seconds
  first_arrival_seconds: flat 1.889 seconds | gen 1.989 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.72%, FREE_RUNNER 69.84%, WON_REP 26.43%; gen COUNTER 3.87%, FREE_RUNNER 63.90%, WON_REP 32.22%)
  quick_pressure_share_by_origin: flat 88.47 % | gen 80.83 %
  clean_with_live_won_rep_ticks: flat 0.42 % | gen 0.53 %
  clean_with_live_won_rep_dropbacks: flat 1.18 % | gen 1.63 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.49 % | gen 11.01 %
  throwaway_rate_clean: flat 18.49 % | gen 8.22 %
  scramble_rate: flat 2.19 % | gen 0.49 %
  scramble_yards: flat 5.10 yards | gen 4.24 yards
  by_down_fixed_calls: flat 10.78 % | gen 11.69 %
  int_per_aimed_throw: flat 2.68 % | gen 7.54 %
  completion_per_aimed_throw: flat 46.77 % | gen 43.09 %
  forced_throw_share: flat 10.52 % | gen 16.57 %
  completion_by_pocket_status: flat 27.24 % | gen 26.14 %
  qb_season_spread: flat 0.53 pp | gen 2.64 pp
  defence_season_spread: flat 0.00 pp | gen 1.27 pp
  unblocked_pressures_per_100: flat 15.84 per 100 dropbacks | gen 16.00 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 32.46 % [time to throw 1.870 s] | gen 22.59 % [time to throw 2.013 s]
  unblocked_men_per_100: flat 19.11 per 100 dropbacks | gen 19.29 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.93 % | gen 10.28 %
  quick_share_no_free_runner: flat 72.13 % | gen 59.27 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.96 % | gen 11.56 %
  situation_q1q3_last_two: flat 13.82 % | gen 11.14 %
  sack_share_of_contacts_in_out: flat 70.68 % [time to throw 1.870 s] | gen 65.37 % [time to throw 2.013 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.870 s] | gen 0.00 % [time to throw 2.013 s]
  sacker_mix.split.interior: flat 31.01 % [time to throw 1.870 s] | gen 35.10 % [time to throw 2.013 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 47.23 % [time to throw 1.870 s] | gen 45.25 % [time to throw 2.013 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.11 % [time to throw 1.870 s] | gen 19.50 % [time to throw 2.013 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.65 % [time to throw 1.870 s] | gen 0.16 % [time to throw 2.013 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.31 % [time to throw 1.870 s] | gen 35.58 % [time to throw 2.013 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 2.18 % | gen 3.54 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.37 % | gen 2.75 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.42 % | gen 20.70 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.20 % | gen 3.23 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.76 % | gen 17.08 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.02 % | gen 17.53 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 46.03 % | gen 46.83 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.16 % | gen 19.60 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.80 % | gen 40.33 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.29 % | gen 20.83 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.66 % | gen 15.46 %
  nobody_open_share: flat 44.23 % of dropbacks | gen 32.06 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.48 % of dropbacks | gen 10.57 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.54 % of dropbacks | gen 10.32 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.83 % of dropbacks | gen 8.92 % of dropbacks
  nobody_open_share.split.SACK: flat 2.39 % of dropbacks [time to throw 1.870 s] | gen 2.25 % of dropbacks [time to throw 2.013 s]
  clean_checkdown_share: flat 19.58 % of clean aimed throws | gen 6.87 % of clean aimed throws
  clean_later_read_share: flat 15.14 % of clean aimed throws | gen 21.89 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.18, per aimed throw 2.68; forced-throw share 10.52; completion per attempt 38.03, per aimed throw 46.77; INT-source mix CONTESTED_CATCH 91.91, TIPPED_RECOVERY 8.09
      flat PROGRESSION: 20701 aimed, INT 0.37, completion 46.03
      flat RANK_PUSHED: 6794 aimed, INT 11.42, completion 17.16
      flat CHECKDOWN: 9043 aimed, INT 0.20, completion 45.80
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3383 aimed, INT 5.76, completion 28.29
      flat ON_THE_RUN: 219 aimed, INT 5.02, completion 24.66
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.02 against a real 3.25
    gen: INT per attempt 6.85, per aimed throw 7.54; forced-throw share 16.57; completion per attempt 39.14, per aimed throw 43.09; INT-source mix CONTESTED_CATCH 46.35, TIPPED_RECOVERY 53.65
      gen PROGRESSION: 14847 aimed, INT 2.75, completion 46.83
      gen RANK_PUSHED: 4194 aimed, INT 20.70, completion 19.60
      gen CHECKDOWN: 3000 aimed, INT 3.23, completion 40.33
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2928 aimed, INT 17.08, completion 20.83
      gen ON_THE_RUN: 97 aimed, INT 17.53, completion 15.46
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.53 against a real 3.25
    the filed guard against D1 (design) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.73 -> arm 2.68, rise -0.04 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.37 -> arm 0.37, rise -0.00 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.80 -> arm 11.42, rise -0.38 against an allowed -0.01: PASSES
    flat CHECKDOWN: base 0.18 -> arm 0.20, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 5.67 -> arm 5.76, rise 0.10 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat ON_THE_RUN: base 4.95 -> arm 5.02, rise 0.07 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.65 -> arm 7.54, rise -0.11 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.73 -> arm 2.75, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 21.31 -> arm 20.70, rise -0.61 against an allowed 0.00: PASSES
    gen CHECKDOWN: base 3.59 -> arm 3.23, rise -0.36 against an allowed 0.00: PASSES
    gen DESPERATION: base 16.95 -> arm 17.08, rise 0.12 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen ON_THE_RUN: base 15.73 -> arm 17.53, rise 1.80 against an allowed 0.03: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D1 (design): flat 0 | gen 0

== D14 (information only, never a candidate (s4.reading)): release clock the decision tick ==
  time to throw: flat 1.872 s | gen 2.013 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 974 of 51849 dropbacks (1.88 per 100); pressuredSacks 974; pressured dropbacks 11346 (21.88 per 100) [time to throw 1.872 s]
    gen: sacks 408 of 28396 dropbacks (1.44 per 100); pressuredSacks 408; pressured dropbacks 7076 (24.92 per 100) [time to throw 2.013 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.58% | -13.44 against 22.02% (PR #33, FTN only (held)) | -6.88 against 15.46% (main) [time to throw 1.872 s]
    gen: 5.77% | -16.25 against 22.02% (PR #33, FTN only (held)) | -9.69 against 15.46% (main) [time to throw 2.013 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.88 % | gen 24.92 %
  hit_or_sack_rate: flat 5.81 % [time to throw 1.872 s] | gen 7.30 % [time to throw 2.013 s]
  sack_rate: flat 1.88 % [time to throw 1.872 s] | gen 1.44 % [time to throw 2.013 s]
  time_to_throw: flat 1.872 seconds | gen 2.013 seconds
  sack_share_of_hit_or_sack: flat 32.33 % [time to throw 1.872 s] | gen 19.67 % [time to throw 2.013 s]
  qb_hit_on_scramble: flat 3.72 % [time to throw 1.872 s] | gen 2.07 % [time to throw 2.013 s]
  release_distribution: flat 1.872 seconds | gen 2.013 seconds
  pressured_share_by_release_bin: flat 16.69 % | gen 21.21 %
  hit_rate_by_release_bin: flat 7.83 % [time to throw 1.872 s] | gen 9.03 % [time to throw 2.013 s]
  hits_on_aimed_throws_per_dropback: flat 3.43 % [time to throw 1.872 s] | gen 5.30 % [time to throw 2.013 s]
  first_pressure_seconds: flat 1.394 seconds | gen 1.571 seconds
  first_forcing_seconds: flat 1.747 seconds | gen 1.901 seconds
  first_arrival_seconds: flat 1.897 seconds | gen 1.985 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.65%, FREE_RUNNER 70.01%, WON_REP 26.34%; gen COUNTER 3.88%, FREE_RUNNER 64.16%, WON_REP 31.96%)
  quick_pressure_share_by_origin: flat 88.31 % | gen 80.54 %
  clean_with_live_won_rep_ticks: flat 0.42 % | gen 0.54 %
  clean_with_live_won_rep_dropbacks: flat 1.20 % | gen 1.65 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.61 % | gen 11.05 %
  throwaway_rate_clean: flat 18.57 % | gen 8.09 %
  scramble_rate: flat 2.18 % | gen 0.51 %
  scramble_yards: flat 5.49 yards | gen 4.06 yards
  by_down_fixed_calls: flat 8.54 % | gen 7.50 %
  int_per_aimed_throw: flat 2.76 % | gen 7.71 %
  completion_per_aimed_throw: flat 46.70 % | gen 43.21 %
  forced_throw_share: flat 10.93 % | gen 17.15 %
  completion_by_pocket_status: flat 27.58 % | gen 27.13 %
  qb_season_spread: flat 0.00 pp | gen 2.26 pp
  defence_season_spread: flat 0.00 pp | gen 1.52 pp
  unblocked_pressures_per_100: flat 15.78 per 100 dropbacks | gen 15.84 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 43.15 % [time to throw 1.872 s] | gen 33.75 % [time to throw 2.013 s]
  unblocked_men_per_100: flat 19.04 per 100 dropbacks | gen 19.09 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.10 % | gen 10.62 %
  quick_share_no_free_runner: flat 71.63 % | gen 59.26 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.09 % | gen 11.26 %
  situation_q1q3_last_two: flat 14.04 % | gen 10.30 %
  sack_share_of_contacts_in_out: flat 55.85 % [time to throw 1.872 s] | gen 41.76 % [time to throw 2.013 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.872 s] | gen 0.00 % [time to throw 2.013 s]
  sacker_mix.split.interior: flat 32.70 % [time to throw 1.872 s] | gen 32.78 % [time to throw 2.013 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.75 % [time to throw 1.872 s] | gen 46.16 % [time to throw 2.013 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.99 % [time to throw 1.872 s] | gen 20.81 % [time to throw 2.013 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.56 % [time to throw 1.872 s] | gen 0.25 % [time to throw 2.013 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.14 % [time to throw 1.872 s] | gen 33.09 % [time to throw 2.013 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 2.22 % | gen 3.63 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.38 % | gen 2.82 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.93 % | gen 21.34 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 4.10 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.47 % | gen 16.68 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.02 % | gen 11.96 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.78 % | gen 46.70 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.25 % | gen 19.51 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.99 % | gen 40.72 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.87 % | gen 20.55 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.48 % | gen 16.30 %
  nobody_open_share: flat 43.96 % of dropbacks | gen 31.55 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.57 % of dropbacks | gen 10.83 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.60 % of dropbacks | gen 10.45 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.92 % of dropbacks | gen 8.83 % of dropbacks
  nobody_open_share.split.SACK: flat 1.88 % of dropbacks [time to throw 1.872 s] | gen 1.44 % of dropbacks [time to throw 2.013 s]
  clean_checkdown_share: flat 19.67 % of clean aimed throws | gen 7.01 % of clean aimed throws
  clean_later_read_share: flat 14.99 % of clean aimed throws | gen 21.72 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.24, per aimed throw 2.76; forced-throw share 10.93; completion per attempt 37.98, per aimed throw 46.70; INT-source mix CONTESTED_CATCH 90.58, TIPPED_RECOVERY 9.42
      flat PROGRESSION: 20842 aimed, INT 0.38, completion 45.78
      flat RANK_PUSHED: 6864 aimed, INT 11.93, completion 17.25
      flat CHECKDOWN: 9108 aimed, INT 0.21, completion 45.99
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3420 aimed, INT 5.47, completion 27.87
      flat ON_THE_RUN: 219 aimed, INT 5.02, completion 26.48
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.02 against a real 3.25
    gen: INT per attempt 7.01, per aimed throw 7.71; forced-throw share 17.15; completion per attempt 39.32, per aimed throw 43.21; INT-source mix CONTESTED_CATCH 43.93, TIPPED_RECOVERY 56.07
      gen PROGRESSION: 14988 aimed, INT 2.82, completion 46.70
      gen RANK_PUSHED: 4213 aimed, INT 21.34, completion 19.51
      gen CHECKDOWN: 3075 aimed, INT 4.10, completion 40.72
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2968 aimed, INT 16.68, completion 20.55
      gen ON_THE_RUN: 92 aimed, INT 11.96, completion 16.30
      gen on the run: clean INT n/a against a real 2.11; pressured INT 11.96 against a real 3.25
    the filed guard against D1 (design) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.73 -> arm 2.76, rise 0.03 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat PROGRESSION: base 0.37 -> arm 0.38, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.80 -> arm 11.93, rise 0.13 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.18 -> arm 0.21, rise 0.03 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat DESPERATION: base 5.67 -> arm 5.47, rise -0.20 against an allowed 0.00: PASSES
    flat ON_THE_RUN: base 4.95 -> arm 5.02, rise 0.07 against an allowed 0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.65 -> arm 7.71, rise 0.06 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen PROGRESSION: base 2.73 -> arm 2.82, rise 0.08 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 21.31 -> arm 21.34, rise 0.03 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.59 -> arm 4.10, rise 0.51 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 16.95 -> arm 16.68, rise -0.27 against an allowed -0.00: PASSES
    gen ON_THE_RUN: base 15.73 -> arm 11.96, rise -3.77 against an allowed 0.03: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D1 (design): flat 0 | gen 0
```

### D2 (pricing arm, never a design value) with D15, D16, seed set 2

```text
ADR-089 step 4: the pocket report (3 arms; both leagues; every hit and sack figure with its time to throw beside it)

== D2 (pricing arm, never a design value) (the base arm): release clock the decision tick ==
  time to throw: flat 2.996 s | gen 2.968 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2270 of 49570 dropbacks (4.58 per 100); pressuredSacks 2270; pressured dropbacks 20366 (41.09 per 100) [time to throw 2.996 s]
    gen: sacks 1258 of 27435 dropbacks (4.59 per 100); pressuredSacks 1215; pressured dropbacks 11571 (42.18 per 100) [time to throw 2.968 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.15% | -10.87 against 22.02% (PR #33, FTN only (held)) | -4.31 against 15.46% (main) [time to throw 2.996 s]
    gen: 10.50% | -11.52 against 22.02% (PR #33, FTN only (held)) | -4.96 against 15.46% (main) [time to throw 2.968 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.09 % | gen 42.18 %
  hit_or_sack_rate: flat 17.47 % [time to throw 2.996 s] | gen 21.76 % [time to throw 2.968 s]
  sack_rate: flat 4.58 % [time to throw 2.996 s] | gen 4.59 % [time to throw 2.968 s]
  time_to_throw: flat 2.996 seconds | gen 2.968 seconds
  sack_share_of_hit_or_sack: flat 26.22 % [time to throw 2.996 s] | gen 21.07 % [time to throw 2.968 s]
  qb_hit_on_scramble: flat 3.56 % [time to throw 2.996 s] | gen 4.34 % [time to throw 2.968 s]
  release_distribution: flat 2.996 seconds | gen 2.968 seconds
  pressured_share_by_release_bin: flat 44.03 % | gen 51.50 %
  hit_rate_by_release_bin: flat 28.43 % [time to throw 2.996 s] | gen 36.46 % [time to throw 2.968 s]
  hits_on_aimed_throws_per_dropback: flat 11.76 % [time to throw 2.996 s] | gen 15.59 % [time to throw 2.968 s]
  first_pressure_seconds: flat 1.965 seconds | gen 2.050 seconds
  first_forcing_seconds: flat 2.212 seconds | gen 2.301 seconds
  first_arrival_seconds: flat 1.997 seconds | gen 2.065 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.50%, FREE_RUNNER 51.69%, WON_REP 42.81%; gen COUNTER 5.80%, FREE_RUNNER 50.44%, WON_REP 43.76%)
  quick_pressure_share_by_origin: flat 62.54 % | gen 60.41 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.82 %
  clean_with_live_won_rep_dropbacks: flat 3.49 % | gen 3.64 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.12 % | gen 17.92 %
  throwaway_rate_clean: flat 14.40 % | gen 6.25 %
  scramble_rate: flat 6.46 % | gen 2.35 %
  scramble_yards: flat 6.39 yards | gen 5.71 yards
  by_down_fixed_calls: flat 10.93 % | gen 11.18 %
  int_per_aimed_throw: flat 2.66 % | gen 7.73 %
  completion_per_aimed_throw: flat 42.26 % | gen 40.82 %
  forced_throw_share: flat 24.08 % | gen 29.03 %
  completion_by_pocket_status: flat 20.58 % | gen 23.19 %
  qb_season_spread: flat 0.55 pp | gen 1.25 pp
  defence_season_spread: flat 0.00 pp | gen 1.17 pp
  unblocked_pressures_per_100: flat 19.34 per 100 dropbacks | gen 19.13 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 35.97 % [time to throw 2.996 s] | gen 37.82 % [time to throw 2.968 s]
  unblocked_men_per_100: flat 19.39 per 100 dropbacks | gen 19.15 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.75 % | gen 25.13 %
  quick_share_no_free_runner: flat 37.53 % | gen 35.12 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 23.00 % | gen 18.58 %
  situation_q1q3_last_two: flat 20.24 % | gen 20.34 %
  sack_share_of_contacts_in_out: flat 52.99 % [time to throw 2.996 s] | gen 39.75 % [time to throw 2.968 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.996 s] | gen 3.42 % [time to throw 2.968 s]
  sacker_mix.split.interior: flat 31.71 % [time to throw 2.996 s] | gen 31.59 % [time to throw 2.968 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.34 % [time to throw 2.996 s] | gen 46.78 % [time to throw 2.968 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.40 % [time to throw 2.996 s] | gen 21.29 % [time to throw 2.968 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.55 % [time to throw 2.996 s] | gen 0.34 % [time to throw 2.968 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.42 % [time to throw 2.996 s] | gen 31.49 % [time to throw 2.968 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.07 % | gen 6.65 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.24 % | gen 2.58 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 10.93 % | gen 20.78 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.66 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.77 % | gen 18.28 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.09 % | gen 11.69 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.53 % | gen 45.18 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.68 % | gen 17.49 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 36.02 % | gen 33.29 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 22.48 % | gen 19.88 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.60 % | gen 33.12 %
  nobody_open_share: flat 36.50 % of dropbacks | gen 35.70 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.47 % of dropbacks | gen 9.46 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.88 % of dropbacks | gen 10.49 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.57 % of dropbacks | gen 11.17 % of dropbacks
  nobody_open_share.split.SACK: flat 4.58 % of dropbacks [time to throw 2.996 s] | gen 4.59 % of dropbacks [time to throw 2.968 s]
  clean_checkdown_share: flat 5.20 % of clean aimed throws | gen 2.72 % of clean aimed throws
  clean_later_read_share: flat 22.11 % of clean aimed throws | gen 25.13 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.14, per aimed throw 2.66; forced-throw share 24.08; completion per attempt 33.91, per aimed throw 42.26; INT-source mix CONTESTED_CATCH 89.71, TIPPED_RECOVERY 10.29
      flat PROGRESSION: 21687 aimed, INT 0.24, completion 42.53
      flat RANK_PUSHED: 6402 aimed, INT 10.93, completion 16.68
      flat CHECKDOWN: 4200 aimed, INT 0.17, completion 36.02
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2914 aimed, INT 5.77, completion 22.48
      flat ON_THE_RUN: 187 aimed, INT 9.09, completion 24.60
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.09 against a real 3.25
    gen: INT per attempt 6.80, per aimed throw 7.73; forced-throw share 29.03; completion per attempt 35.92, per aimed throw 40.82; INT-source mix CONTESTED_CATCH 46.49, TIPPED_RECOVERY 53.51
      gen PROGRESSION: 13198 aimed, INT 2.58, completion 45.18
      gen RANK_PUSHED: 3643 aimed, INT 20.78, completion 17.49
      gen CHECKDOWN: 2595 aimed, INT 3.66, completion 33.29
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2877 aimed, INT 18.28, completion 19.88
      gen ON_THE_RUN: 154 aimed, INT 11.69, completion 33.12
      gen on the run: clean INT n/a against a real 2.11; pressured INT 11.69 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D15 (b's reachable range, the grid's low end (reported)): release clock the decision tick ==
  time to throw: flat 2.996 s | gen 2.967 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2530 of 49331 dropbacks (5.13 per 100); pressuredSacks 2530; pressured dropbacks 20264 (41.08 per 100) [time to throw 2.996 s]
    gen: sacks 1479 of 27397 dropbacks (5.40 per 100); pressuredSacks 1434; pressured dropbacks 11569 (42.23 per 100) [time to throw 2.967 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 12.49% | -9.53 against 22.02% (PR #33, FTN only (held)) | -2.97 against 15.46% (main) [time to throw 2.996 s]
    gen: 12.40% | -9.62 against 22.02% (PR #33, FTN only (held)) | -3.06 against 15.46% (main) [time to throw 2.967 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.08 % | gen 42.23 %
  hit_or_sack_rate: flat 17.57 % [time to throw 2.996 s] | gen 21.70 % [time to throw 2.967 s]
  sack_rate: flat 5.13 % [time to throw 2.996 s] | gen 5.40 % [time to throw 2.967 s]
  time_to_throw: flat 2.996 seconds | gen 2.967 seconds
  sack_share_of_hit_or_sack: flat 29.19 % [time to throw 2.996 s] | gen 24.87 % [time to throw 2.967 s]
  qb_hit_on_scramble: flat 2.35 % [time to throw 2.996 s] | gen 2.57 % [time to throw 2.967 s]
  release_distribution: flat 2.996 seconds | gen 2.967 seconds
  pressured_share_by_release_bin: flat 42.87 % | gen 50.08 %
  hit_rate_by_release_bin: flat 27.97 % [time to throw 2.996 s] | gen 35.66 % [time to throw 2.967 s]
  hits_on_aimed_throws_per_dropback: flat 11.72 % [time to throw 2.996 s] | gen 15.32 % [time to throw 2.967 s]
  first_pressure_seconds: flat 1.964 seconds | gen 2.043 seconds
  first_forcing_seconds: flat 2.211 seconds | gen 2.298 seconds
  first_arrival_seconds: flat 1.993 seconds | gen 2.052 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.52%, FREE_RUNNER 51.70%, WON_REP 42.77%; gen COUNTER 5.86%, FREE_RUNNER 50.59%, WON_REP 43.55%)
  quick_pressure_share_by_origin: flat 62.56 % | gen 60.64 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.83 %
  clean_with_live_won_rep_dropbacks: flat 3.51 % | gen 3.69 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 21.09 % | gen 16.69 %
  throwaway_rate_clean: flat 14.13 % | gen 6.17 %
  scramble_rate: flat 6.38 % | gen 2.27 %
  scramble_yards: flat 6.34 yards | gen 5.57 yards
  by_down_fixed_calls: flat 12.47 % | gen 12.70 %
  int_per_aimed_throw: flat 2.59 % | gen 7.72 %
  completion_per_aimed_throw: flat 42.31 % | gen 40.85 %
  forced_throw_share: flat 23.95 % | gen 28.96 %
  completion_by_pocket_status: flat 20.90 % | gen 23.54 %
  qb_season_spread: flat 0.38 pp | gen 2.10 pp
  defence_season_spread: flat 0.00 pp | gen 0.60 pp
  unblocked_pressures_per_100: flat 19.36 per 100 dropbacks | gen 19.27 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 36.07 % [time to throw 2.996 s] | gen 38.09 % [time to throw 2.967 s]
  unblocked_men_per_100: flat 19.41 per 100 dropbacks | gen 19.30 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.17 % | gen 24.37 %
  quick_share_no_free_runner: flat 37.52 % | gen 35.08 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 21.95 % | gen 16.81 %
  situation_q1q3_last_two: flat 18.83 % | gen 18.70 %
  sack_share_of_contacts_in_out: flat 59.43 % [time to throw 2.996 s] | gen 46.74 % [time to throw 2.967 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.996 s] | gen 3.04 % [time to throw 2.967 s]
  sacker_mix.split.interior: flat 32.45 % [time to throw 2.996 s] | gen 31.45 % [time to throw 2.967 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.21 % [time to throw 2.996 s] | gen 47.74 % [time to throw 2.967 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.59 % [time to throw 2.996 s] | gen 20.53 % [time to throw 2.967 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.75 % [time to throw 2.996 s] | gen 0.28 % [time to throw 2.967 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.25 % [time to throw 2.996 s] | gen 31.44 % [time to throw 2.967 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.12 % | gen 6.60 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.22 % | gen 2.58 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 10.70 % | gen 20.62 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.84 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.55 % | gen 18.22 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 10.16 % | gen 12.50 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.52 % | gen 45.19 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.52 % | gen 18.05 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 35.72 % | gen 32.92 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 22.52 % | gen 19.53 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.60 % | gen 33.55 %
  nobody_open_share: flat 36.47 % of dropbacks | gen 35.69 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.44 % of dropbacks | gen 9.33 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.91 % of dropbacks | gen 10.36 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.99 % of dropbacks | gen 10.61 % of dropbacks
  nobody_open_share.split.SACK: flat 5.13 % of dropbacks [time to throw 2.996 s] | gen 5.40 % of dropbacks [time to throw 2.967 s]
  clean_checkdown_share: flat 5.08 % of clean aimed throws | gen 2.72 % of clean aimed throws
  clean_later_read_share: flat 22.15 % of clean aimed throws | gen 24.76 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.10, per aimed throw 2.59; forced-throw share 23.95; completion per attempt 34.19, per aimed throw 42.31; INT-source mix CONTESTED_CATCH 89.51, TIPPED_RECOVERY 10.49
      flat PROGRESSION: 21654 aimed, INT 0.22, completion 42.52
      flat RANK_PUSHED: 6355 aimed, INT 10.70, completion 16.52
      flat CHECKDOWN: 4163 aimed, INT 0.17, completion 35.72
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2917 aimed, INT 5.55, completion 22.52
      flat ON_THE_RUN: 187 aimed, INT 10.16, completion 24.60
      flat on the run: clean INT n/a against a real 2.11; pressured INT 10.16 against a real 3.25
    gen: INT per attempt 6.83, per aimed throw 7.72; forced-throw share 28.96; completion per attempt 36.15, per aimed throw 40.85; INT-source mix CONTESTED_CATCH 46.30, TIPPED_RECOVERY 53.70
      gen PROGRESSION: 13188 aimed, INT 2.58, completion 45.19
      gen RANK_PUSHED: 3656 aimed, INT 20.62, completion 18.05
      gen CHECKDOWN: 2555 aimed, INT 3.84, completion 32.92
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2837 aimed, INT 18.22, completion 19.53
      gen ON_THE_RUN: 152 aimed, INT 12.50, completion 33.55
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.50 against a real 3.25
    the filed guard against D2 (pricing arm, never a design value) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.66 -> arm 2.59, rise -0.07 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.24 -> arm 0.22, rise -0.02 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 10.93 -> arm 10.70, rise -0.23 against an allowed -0.01: PASSES
    flat CHECKDOWN: base 0.17 -> arm 0.17, rise 0.00 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.77 -> arm 5.55, rise -0.21 against an allowed -0.00: PASSES
    flat ON_THE_RUN: base 9.09 -> arm 10.16, rise 1.07 against an allowed -0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.73 -> arm 7.72, rise -0.01 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.58 -> arm 2.58, rise 0.00 against an allowed -0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 20.78 -> arm 20.62, rise -0.16 against an allowed 0.01: PASSES
    gen CHECKDOWN: base 3.66 -> arm 3.84, rise 0.17 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 18.28 -> arm 18.22, rise -0.06 against an allowed -0.01: PASSES
    gen ON_THE_RUN: base 11.69 -> arm 12.50, rise 0.81 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D2 (pricing arm, never a design value): flat 0 | gen 0

== D16 (b's reachable range, the grid's high end (reported)): release clock the decision tick ==
  time to throw: flat 2.995 s | gen 2.969 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2121 of 49694 dropbacks (4.27 per 100); pressuredSacks 2121; pressured dropbacks 20400 (41.05 per 100) [time to throw 2.995 s]
    gen: sacks 1173 of 27577 dropbacks (4.25 per 100); pressuredSacks 1130; pressured dropbacks 11651 (42.25 per 100) [time to throw 2.969 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.40% | -11.62 against 22.02% (PR #33, FTN only (held)) | -5.06 against 15.46% (main) [time to throw 2.995 s]
    gen: 9.70% | -12.32 against 22.02% (PR #33, FTN only (held)) | -5.76 against 15.46% (main) [time to throw 2.969 s]
  rows (66, both leagues):
  threat_creation_rate: flat 41.05 % | gen 42.25 %
  hit_or_sack_rate: flat 17.41 % [time to throw 2.995 s] | gen 21.81 % [time to throw 2.969 s]
  sack_rate: flat 4.27 % [time to throw 2.995 s] | gen 4.25 % [time to throw 2.969 s]
  time_to_throw: flat 2.995 seconds | gen 2.969 seconds
  sack_share_of_hit_or_sack: flat 24.52 % [time to throw 2.995 s] | gen 19.50 % [time to throw 2.969 s]
  qb_hit_on_scramble: flat 4.60 % [time to throw 2.995 s] | gen 6.05 % [time to throw 2.969 s]
  release_distribution: flat 2.995 seconds | gen 2.969 seconds
  pressured_share_by_release_bin: flat 44.31 % | gen 51.89 %
  hit_rate_by_release_bin: flat 28.41 % [time to throw 2.995 s] | gen 36.70 % [time to throw 2.969 s]
  hits_on_aimed_throws_per_dropback: flat 11.81 % [time to throw 2.995 s] | gen 15.74 % [time to throw 2.969 s]
  first_pressure_seconds: flat 1.970 seconds | gen 2.049 seconds
  first_forcing_seconds: flat 2.214 seconds | gen 2.300 seconds
  first_arrival_seconds: flat 2.003 seconds | gen 2.059 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.56%, FREE_RUNNER 51.58%, WON_REP 42.85%; gen COUNTER 5.70%, FREE_RUNNER 50.63%, WON_REP 43.67%)
  quick_pressure_share_by_origin: flat 62.41 % | gen 60.18 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.82 %
  clean_with_live_won_rep_dropbacks: flat 3.50 % | gen 3.67 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.62 % | gen 18.63 %
  throwaway_rate_clean: flat 14.42 % | gen 6.34 %
  scramble_rate: flat 6.48 % | gen 2.40 %
  scramble_yards: flat 6.31 yards | gen 5.54 yards
  by_down_fixed_calls: flat 9.72 % | gen 10.27 %
  int_per_aimed_throw: flat 2.66 % | gen 7.68 %
  completion_per_aimed_throw: flat 42.31 % | gen 40.88 %
  forced_throw_share: flat 24.05 % | gen 29.10 %
  completion_by_pocket_status: flat 20.55 % | gen 23.34 %
  qb_season_spread: flat 0.59 pp | gen 1.44 pp
  defence_season_spread: flat 0.00 pp | gen 0.87 pp
  unblocked_pressures_per_100: flat 19.31 per 100 dropbacks | gen 19.14 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 36.01 % [time to throw 2.995 s] | gen 37.68 % [time to throw 2.969 s]
  unblocked_men_per_100: flat 19.36 per 100 dropbacks | gen 19.16 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.61 % | gen 25.02 %
  quick_share_no_free_runner: flat 37.27 % | gen 34.78 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 23.32 % | gen 18.91 %
  situation_q1q3_last_two: flat 21.33 % | gen 21.35 %
  sack_share_of_contacts_in_out: flat 49.17 % [time to throw 2.995 s] | gen 36.83 % [time to throw 2.969 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.995 s] | gen 3.67 % [time to throw 2.969 s]
  sacker_mix.split.interior: flat 31.27 % [time to throw 2.995 s] | gen 30.59 % [time to throw 2.969 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.18 % [time to throw 2.995 s] | gen 47.94 % [time to throw 2.969 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.05 % [time to throw 2.995 s] | gen 21.11 % [time to throw 2.969 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.50 % [time to throw 2.995 s] | gen 0.36 % [time to throw 2.969 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.00 % [time to throw 2.995 s] | gen 30.21 % [time to throw 2.969 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.01 % | gen 6.63 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.21 % | gen 2.54 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.01 % | gen 20.84 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.14 % | gen 3.74 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.74 % | gen 17.78 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 8.65 % | gen 12.18 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.50 % | gen 45.06 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.79 % | gen 17.55 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 36.43 % | gen 34.12 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 22.93 % | gen 20.65 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.04 % | gen 32.69 %
  nobody_open_share: flat 36.41 % of dropbacks | gen 35.78 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.47 % of dropbacks | gen 9.51 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.89 % of dropbacks | gen 10.48 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.78 % of dropbacks | gen 11.53 % of dropbacks
  nobody_open_share.split.SACK: flat 4.27 % of dropbacks [time to throw 2.995 s] | gen 4.25 % of dropbacks [time to throw 2.969 s]
  clean_checkdown_share: flat 5.09 % of clean aimed throws | gen 2.75 % of clean aimed throws
  clean_later_read_share: flat 22.32 % of clean aimed throws | gen 25.14 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.13, per aimed throw 2.66; forced-throw share 24.05; completion per attempt 33.88, per aimed throw 42.31; INT-source mix CONTESTED_CATCH 89.75, TIPPED_RECOVERY 10.25
      flat PROGRESSION: 21743 aimed, INT 0.21, completion 42.50
      flat RANK_PUSHED: 6428 aimed, INT 11.01, completion 16.79
      flat CHECKDOWN: 4211 aimed, INT 0.14, completion 36.43
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2926 aimed, INT 5.74, completion 22.93
      flat ON_THE_RUN: 208 aimed, INT 8.65, completion 24.04
      flat on the run: clean INT n/a against a real 2.11; pressured INT 8.65 against a real 3.25
    gen: INT per attempt 6.73, per aimed throw 7.68; forced-throw share 29.10; completion per attempt 35.83, per aimed throw 40.88; INT-source mix CONTESTED_CATCH 47.23, TIPPED_RECOVERY 52.77
      gen PROGRESSION: 13223 aimed, INT 2.54, completion 45.06
      gen RANK_PUSHED: 3670 aimed, INT 20.84, completion 17.55
      gen CHECKDOWN: 2623 aimed, INT 3.74, completion 34.12
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2891 aimed, INT 17.78, completion 20.65
      gen ON_THE_RUN: 156 aimed, INT 12.18, completion 32.69
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.18 against a real 3.25
    the filed guard against D2 (pricing arm, never a design value) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.66 -> arm 2.66, rise -0.00 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.24 -> arm 0.21, rise -0.02 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 10.93 -> arm 11.01, rise 0.08 against an allowed -0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat CHECKDOWN: base 0.17 -> arm 0.14, rise -0.02 against an allowed -0.00: PASSES
    flat DESPERATION: base 5.77 -> arm 5.74, rise -0.02 against an allowed 0.00: PASSES
    flat ON_THE_RUN: base 9.09 -> arm 8.65, rise -0.44 against an allowed 0.01: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.73 -> arm 7.68, rise -0.05 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.58 -> arm 2.54, rise -0.04 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 20.78 -> arm 20.84, rise 0.07 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen CHECKDOWN: base 3.66 -> arm 3.74, rise 0.08 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen DESPERATION: base 18.28 -> arm 17.78, rise -0.50 against an allowed 0.01: PASSES
    gen ON_THE_RUN: base 11.69 -> arm 12.18, rise 0.49 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against D2 (pricing arm, never a design value): flat 0 | gen 0
```

### C14 (re-played) with D17, seed set 2

```text
ADR-089 step 4: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== C14 (re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 1.605 s | gen 1.727 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1200 of 51840 dropbacks (2.31 per 100); pressuredSacks 1200; pressured dropbacks 14236 (27.46 per 100) [time to throw 1.605 s]
    gen: sacks 576 of 28585 dropbacks (2.02 per 100); pressuredSacks 576; pressured dropbacks 9459 (33.09 per 100) [time to throw 1.727 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.43% | -13.59 against 22.02% (PR #33, FTN only (held)) | -7.03 against 15.46% (main) [time to throw 1.605 s]
    gen: 6.09% | -15.93 against 22.02% (PR #33, FTN only (held)) | -9.37 against 15.46% (main) [time to throw 1.727 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.46 % | gen 33.09 %
  hit_or_sack_rate: flat 3.01 % [time to throw 1.605 s] | gen 3.18 % [time to throw 1.727 s]
  sack_rate: flat 2.31 % [time to throw 1.605 s] | gen 2.02 % [time to throw 1.727 s]
  time_to_throw: flat 1.605 seconds | gen 1.727 seconds
  sack_share_of_hit_or_sack: flat 76.82 % [time to throw 1.605 s] | gen 63.44 % [time to throw 1.727 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.605 s] | gen 0.00 % [time to throw 1.727 s]
  release_distribution: flat 1.605 seconds | gen 1.727 seconds
  pressured_share_by_release_bin: flat 23.09 % | gen 28.11 %
  hit_rate_by_release_bin: flat 3.76 % [time to throw 1.605 s] | gen 3.75 % [time to throw 1.727 s]
  hits_on_aimed_throws_per_dropback: flat 0.70 % [time to throw 1.605 s] | gen 1.16 % [time to throw 1.727 s]
  first_pressure_seconds: flat 1.659 seconds | gen 1.814 seconds
  first_forcing_seconds: flat 1.945 seconds | gen 2.102 seconds
  first_arrival_seconds: flat 1.961 seconds | gen 2.102 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 28.71%, FREE_RUNNER 55.19%, WON_REP 16.10%; gen COUNTER 34.14%, FREE_RUNNER 46.50%, WON_REP 19.36%)
  quick_pressure_share_by_origin: flat 75.27 % | gen 66.96 %
  clean_with_live_won_rep_ticks: flat 0.07 % | gen 0.06 %
  clean_with_live_won_rep_dropbacks: flat 0.18 % | gen 0.17 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 21.07 % | gen 12.05 %
  throwaway_rate_clean: flat 16.81 % | gen 7.34 %
  scramble_rate: flat 1.82 % | gen 0.39 %
  scramble_yards: flat 5.86 yards | gen 5.33 yards
  by_down_fixed_calls: flat 8.41 % | gen 6.96 %
  int_per_aimed_throw: flat 2.74 % | gen 7.62 %
  completion_per_aimed_throw: flat 46.69 % | gen 43.28 %
  forced_throw_share: flat 12.07 % | gen 20.17 %
  completion_by_pocket_status: flat 25.49 % | gen 27.83 %
  qb_season_spread: flat 0.00 pp | gen 3.36 pp
  defence_season_spread: flat 0.00 pp | gen 0.97 pp
  unblocked_pressures_per_100: flat 15.98 per 100 dropbacks | gen 15.90 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 87.26 % [time to throw 1.605 s] | gen 81.72 % [time to throw 1.727 s]
  unblocked_men_per_100: flat 19.21 per 100 dropbacks | gen 19.15 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 16.52 % | gen 19.99 %
  quick_share_no_free_runner: flat 48.12 % | gen 41.67 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 20.38 % | gen 10.79 %
  situation_q1q3_last_two: flat 20.95 % | gen 11.57 %
  sack_share_of_contacts_in_out: flat 76.82 % [time to throw 1.605 s] | gen 63.40 % [time to throw 1.727 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.605 s] | gen 0.00 % [time to throw 1.727 s]
  sacker_mix.split.interior: flat 25.01 % [time to throw 1.605 s] | gen 31.05 % [time to throw 1.727 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 50.56 % [time to throw 1.605 s] | gen 50.81 % [time to throw 1.727 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.43 % [time to throw 1.605 s] | gen 17.96 % [time to throw 1.727 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 1.00 % [time to throw 1.605 s] | gen 0.17 % [time to throw 1.727 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 25.04 % [time to throw 1.605 s] | gen 31.36 % [time to throw 1.727 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 11.62 % | gen 14.15 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.33 % | gen 2.69 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.93 % | gen 21.02 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 3.83 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.52 % | gen 17.57 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.19 % | gen 7.23 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.63 % | gen 46.70 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.70 % | gen 19.15 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.63 % | gen 41.50 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.16 % | gen 21.42 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.78 % | gen 15.66 %
  nobody_open_share: flat 44.46 % of dropbacks | gen 32.60 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.52 % of dropbacks | gen 10.88 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.64 % of dropbacks | gen 10.81 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.98 % of dropbacks | gen 8.90 % of dropbacks
  nobody_open_share.split.SACK: flat 2.31 % of dropbacks [time to throw 1.605 s] | gen 2.02 % of dropbacks [time to throw 1.727 s]
  clean_checkdown_share: flat 20.06 % of clean aimed throws | gen 6.63 % of clean aimed throws
  clean_later_read_share: flat 14.64 % of clean aimed throws | gen 20.52 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.23, per aimed throw 2.74; forced-throw share 12.07; completion per attempt 37.94, per aimed throw 46.69; INT-source mix CONTESTED_CATCH 90.16, TIPPED_RECOVERY 9.84
      flat PROGRESSION: 20782 aimed, INT 0.33, completion 45.63
      flat RANK_PUSHED: 6840 aimed, INT 11.93, completion 16.70
      flat CHECKDOWN: 9084 aimed, INT 0.21, completion 46.63
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3443 aimed, INT 5.52, completion 27.16
      flat ON_THE_RUN: 226 aimed, INT 6.19, completion 24.78
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.19 against a real 3.25
    gen: INT per attempt 6.93, per aimed throw 7.62; forced-throw share 20.17; completion per attempt 39.34, per aimed throw 43.28; INT-source mix CONTESTED_CATCH 44.93, TIPPED_RECOVERY 55.07
      gen PROGRESSION: 14971 aimed, INT 2.69, completion 46.70
      gen RANK_PUSHED: 4100 aimed, INT 21.02, completion 19.15
      gen CHECKDOWN: 3111 aimed, INT 3.83, completion 41.50
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3090 aimed, INT 17.57, completion 21.42
      gen ON_THE_RUN: 83 aimed, INT 7.23, completion 15.66
      gen on the run: clean INT n/a against a real 2.11; pressured INT 7.23 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== D17 (information, the build check under shape L): release clock the decision tick ==
  time to throw: flat 1.868 s | gen 1.993 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 892 of 52221 dropbacks (1.71 per 100); pressuredSacks 892; pressured dropbacks 14143 (27.08 per 100) [time to throw 1.868 s]
    gen: sacks 412 of 28916 dropbacks (1.42 per 100); pressuredSacks 412; pressured dropbacks 9574 (33.11 per 100) [time to throw 1.993 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 6.31% | -15.71 against 22.02% (PR #33, FTN only (held)) | -9.15 against 15.46% (main) [time to throw 1.868 s]
    gen: 4.30% | -17.72 against 22.02% (PR #33, FTN only (held)) | -11.16 against 15.46% (main) [time to throw 1.993 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.08 % | gen 33.11 %
  hit_or_sack_rate: flat 6.65 % [time to throw 1.868 s] | gen 9.58 % [time to throw 1.993 s]
  sack_rate: flat 1.71 % [time to throw 1.868 s] | gen 1.42 % [time to throw 1.993 s]
  time_to_throw: flat 1.868 seconds | gen 1.993 seconds
  sack_share_of_hit_or_sack: flat 25.70 % [time to throw 1.868 s] | gen 14.88 % [time to throw 1.993 s]
  qb_hit_on_scramble: flat 3.13 % [time to throw 1.868 s] | gen 2.46 % [time to throw 1.993 s]
  release_distribution: flat 1.868 seconds | gen 1.993 seconds
  pressured_share_by_release_bin: flat 23.75 % | gen 29.27 %
  hit_rate_by_release_bin: flat 8.89 % [time to throw 1.868 s] | gen 10.52 % [time to throw 1.993 s]
  hits_on_aimed_throws_per_dropback: flat 4.47 % [time to throw 1.868 s] | gen 7.64 % [time to throw 1.993 s]
  first_pressure_seconds: flat 1.656 seconds | gen 1.812 seconds
  first_forcing_seconds: flat 1.942 seconds | gen 2.099 seconds
  first_arrival_seconds: flat 1.963 seconds | gen 2.105 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 28.71%, FREE_RUNNER 55.25%, WON_REP 16.04%; gen COUNTER 34.21%, FREE_RUNNER 46.65%, WON_REP 19.14%)
  quick_pressure_share_by_origin: flat 75.59 % | gen 66.89 %
  clean_with_live_won_rep_ticks: flat 0.07 % | gen 0.07 %
  clean_with_live_won_rep_dropbacks: flat 0.19 % | gen 0.21 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 22.77 % | gen 13.67 %
  throwaway_rate_clean: flat 16.95 % | gen 7.16 %
  scramble_rate: flat 1.84 % | gen 0.42 %
  scramble_yards: flat 5.53 yards | gen 4.09 yards
  by_down_fixed_calls: flat 6.01 % | gen 5.44 %
  int_per_aimed_throw: flat 2.70 % | gen 7.54 %
  completion_per_aimed_throw: flat 46.56 % | gen 42.74 %
  forced_throw_share: flat 11.85 % | gen 20.22 %
  completion_by_pocket_status: flat 23.99 % | gen 25.31 %
  qb_season_spread: flat 0.28 pp | gen 2.06 pp
  defence_season_spread: flat 0.00 pp | gen 1.12 pp
  unblocked_pressures_per_100: flat 15.87 per 100 dropbacks | gen 16.08 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 38.38 % [time to throw 1.868 s] | gen 26.98 % [time to throw 1.993 s]
  unblocked_men_per_100: flat 19.05 per 100 dropbacks | gen 19.47 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 16.28 % | gen 19.85 %
  quick_share_no_free_runner: flat 48.76 % | gen 40.96 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 22.79 % | gen 13.55 %
  situation_q1q3_last_two: flat 22.94 % | gen 13.60 %
  sack_share_of_contacts_in_out: flat 56.92 % [time to throw 1.868 s] | gen 44.82 % [time to throw 1.993 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.868 s] | gen 0.00 % [time to throw 1.993 s]
  sacker_mix.split.interior: flat 24.81 % [time to throw 1.868 s] | gen 29.29 % [time to throw 1.993 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 51.69 % [time to throw 1.868 s] | gen 50.57 % [time to throw 1.993 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.45 % [time to throw 1.868 s] | gen 19.90 % [time to throw 1.993 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 1.04 % [time to throw 1.868 s] | gen 0.24 % [time to throw 1.993 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 24.94 % [time to throw 1.868 s] | gen 29.27 % [time to throw 1.993 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 11.40 % | gen 14.04 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.34 % | gen 2.75 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.87 % | gen 20.31 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 3.61 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.47 % | gen 17.41 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.24 % | gen 7.32 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.39 % | gen 46.37 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.06 % | gen 18.75 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.30 % | gen 39.89 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 26.56 % | gen 20.84 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.79 % | gen 13.41 %
  nobody_open_share: flat 44.28 % of dropbacks | gen 32.38 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.44 % of dropbacks | gen 10.84 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.61 % of dropbacks | gen 10.80 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 18.53 % of dropbacks | gen 9.32 % of dropbacks
  nobody_open_share.split.SACK: flat 1.71 % of dropbacks [time to throw 1.868 s] | gen 1.42 % of dropbacks [time to throw 1.993 s]
  clean_checkdown_share: flat 20.09 % of clean aimed throws | gen 6.74 % of clean aimed throws
  clean_later_read_share: flat 14.68 % of clean aimed throws | gen 20.13 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.18, per aimed throw 2.70; forced-throw share 11.85; completion per attempt 37.62, per aimed throw 46.56; INT-source mix CONTESTED_CATCH 90.08, TIPPED_RECOVERY 9.92
      flat PROGRESSION: 21128 aimed, INT 0.34, completion 45.39
      flat RANK_PUSHED: 6789 aimed, INT 11.87, completion 17.06
      flat CHECKDOWN: 9105 aimed, INT 0.18, completion 46.30
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3453 aimed, INT 5.47, completion 26.56
      flat ON_THE_RUN: 221 aimed, INT 7.24, completion 25.79
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.24 against a real 3.25
    gen: INT per attempt 6.83, per aimed throw 7.54; forced-throw share 20.22; completion per attempt 38.68, per aimed throw 42.74; INT-source mix CONTESTED_CATCH 44.58, TIPPED_RECOVERY 55.42
      gen PROGRESSION: 15113 aimed, INT 2.75, completion 46.37
      gen RANK_PUSHED: 4235 aimed, INT 20.31, completion 18.75
      gen CHECKDOWN: 3134 aimed, INT 3.61, completion 39.89
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3124 aimed, INT 17.41, completion 20.84
      gen ON_THE_RUN: 82 aimed, INT 7.32, completion 13.41
      gen on the run: clean INT n/a against a real 2.11; pressured INT 7.32 against a real 3.25
    the filed guard against C14 (re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-6 (ADR-089 Appendix H, H.8) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.74 -> arm 2.70, rise -0.04 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.33 -> arm 0.34, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat RANK_PUSHED: base 11.93 -> arm 11.87, rise -0.06 against an allowed 0.00: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.18, rise -0.03 against an allowed -0.00: PASSES
    flat DESPERATION: base 5.52 -> arm 5.47, rise -0.04 against an allowed -0.02: PASSES
    flat ON_THE_RUN: base 6.19 -> arm 7.24, rise 1.05 against an allowed -0.02: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    flat by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen league-wide: base 7.62 -> arm 7.54, rise -0.08 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.69 -> arm 2.75, rise 0.06 against an allowed 0.00: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen RANK_PUSHED: base 21.02 -> arm 20.31, rise -0.72 against an allowed -0.01: PASSES
    gen CHECKDOWN: base 3.83 -> arm 3.61, rise -0.22 against an allowed -0.01: PASSES
    gen DESPERATION: base 17.57 -> arm 17.41, rise -0.16 against an allowed -0.01: PASSES
    gen ON_THE_RUN: base 7.23 -> arm 7.32, rise 0.09 against an allowed 0.01: above the allowance (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
    gen by class: above the allowance in a class (the filed reading; AM-6 (ADR-089 Appendix H, H.8) grades)
  exclusive affected plays against C14 (re-played): flat 2722 | gen 2354
```
