# ADR-089 step 3: the arms

Rushers nobody blocked run on their own clock from the snap picture, touched men take the late block, and the climb lane reads no FRONT threat: built behind the rules name pocket-1.s3, which nothing plays by default; these arms turn it on for measurement only. The step-3 clauses are graded on C1 (set 1, set 2 beside), part 1 and its checks are structural, and the guard is read under AM-1's reading as AM-3 maps it, on both seed sets.

- filing: fnv1a:9a1c90e9; amendments at step 3: fnv1a:517bb9fe (AM-2 (ADR-089 Appendix G, G.8); the guard AM-3, ADR-089 Appendix G, G.9)
- fingerprint (every package's source, the lockfile, the manifests and the filing): 26fe8e465322fc06
- commit: e35327cdc98cb37903967c42eb0fbf295a9fd210 (read from the repository's files; a change staged and not committed is not seen)
- node: v22.22.0; caller v7; corpora played: flat 496 games, gen 272 games an arm-set (the full corpora are flat 496 and gen 272 on each seed set)
- arms: A0 (sets 1, 2; legacy), A14 (sets 1, 2; legacy), A1 (sets 1, 2; fnv1a:69a7cc48), A11 (sets 1, 2; fnv1a:3cfc4af8), B3 (sets 1, 2; fnv1a:03754f60), B6 (sets 1, 2; fnv1a:88bca450), B5 (sets 1, 2; fnv1a:20c724a7), C1 (sets 1, 2; fnv1a:c4462712), C2 (sets 1, 2; fnv1a:113441e6), C3 (sets 1, 2; fnv1a:872d3e1c), C4 (sets 1, 2; fnv1a:22305c84), C5 (sets 1, 2; fnv1a:1d05d747), C6 (sets 1, 2; fnv1a:666bdc50), C7 (sets 1, 2; fnv1a:f1a1c6be), C8 (sets 1, 2; fnv1a:fd25b531), C9 (sets 1, 2; fnv1a:f8117e51), C10 (sets 1, 2; fnv1a:2b32f412), C11 (sets 1, 2; fnv1a:a8d97913), C12 (sets 1, 2; fnv1a:1415c66d), C13 (sets 1, 2; fnv1a:f0df4c3f), C14 (sets 1, 2; fnv1a:fb5b8611), C15 (sets 1, 2; fnv1a:d2e66f55), C16 (sets 1, 2; fnv1a:180156aa)
- PR #33: OPEN, so P2S prints against both 22.02 and 15.46

## What failed, first

- GRADED, a miss under the miss rule (classed and taken to the owner with options A, B and C priced; nothing in it is automatic): s3.quick (30 to 55): C1 flat set 1 88.91 (binomial SE 0.30; B3 94.24); set 2 88.42; two-set mean 88.67 [time to throw C1 1.606 s, B3 1.592 s]; C1 gen set 1 83.14 (binomial SE 0.46; B3 90.16); set 2 80.73; two-set mean 81.94 [time to throw C1 1.704 s, B3 1.682 s]
- GRADED, a miss under the miss rule (classed and taken to the owner with options A, B and C priced; nothing in it is automatic): s3.unblockedPressures (at most 14): C1 flat set 1 15.67 (binomial SE on dropbacks, an approximation: a dropback can count more than one man, 0.16; B3 17.53); set 2 15.87; two-set mean 15.77 [time to throw C1 1.606 s, B3 1.592 s]; on the clock under C1's own reading (AM-2's key; the filed row reads D19's band test): set 1 15.71, set 2 15.91; C1 gen set 1 15.25 (binomial SE on dropbacks, an approximation: a dropback can count more than one man, 0.21; B3 16.99); set 2 15.92; two-set mean 15.59 [time to throw C1 1.704 s, B3 1.682 s]; on the clock under C1's own reading (AM-2's key; the filed row reads D19's band test): set 1 15.27, set 2 15.94
- GRADED, a miss under the miss rule (classed and taken to the owner with options A, B and C priced; nothing in it is automatic): s3.unblockedShare (at most 40): C1 flat set 1 75.71 (binomial SE 1.03; B3 66.42); set 2 76.49; two-set mean 76.10 [time to throw C1 1.606 s, B3 1.592 s]; on the clock under C1's own reading (AM-2's key; the filed row reads D19's band test): set 1 75.82, set 2 76.78; C1 gen set 1 69.78 (binomial SE 1.46; B3 65.05); set 2 72.19; two-set mean 70.99 [time to throw C1 1.704 s, B3 1.682 s]; on the clock under C1's own reading (AM-2's key; the filed row reads D19's band test): set 1 69.78, set 2 72.19

Merge card: may be posted with the miss options priced (no structural failure, fold fault or guard breach stands).
- next: each miss is classed by the miss rule on C1 and C2, on each seed set, and goes to the owner with options A (priced by C15), B and C (priced by C11); no band moves, nothing is tuned to pass or re-run to try again (one pass of the options per step)
- next: s3.part1.determinism is NOT CHECKED by this run: the merge card cites R-1's output (pocket -- --step 3 --digests in two processes, the two outputs byte-identical) before it is posted

## The headline: C1 (pocket-1.s3) against B3 (step 2's design), and C2 against B6 (the pricing pair), re-played on the same seeds

Set 1 is graded on each league; set 2 is printed beside it. Every hit and sack figure has both arms' times to throw beside it.

- C1 against B3, flat, set 1 (the design): pressure 21.99 - 27.80 = -5.80 | hit-or-sack 3.37 - 3.94 = -0.57 [time to throw 1.606 s against 1.592 s] | sacks 2.56 - 3.11 = -0.54 [time to throw 1.606 s against 1.592 s] | release 1.606 - 1.592 = +0.014 s
- C2 against B6, flat, set 1 (pricing arm, never a design value): pressure 41.20 - 43.48 = -2.28 | hit-or-sack 8.46 - 9.54 = -1.07 [time to throw 2.741 s against 2.747 s] | sacks 5.96 - 7.54 = -1.59 [time to throw 2.741 s against 2.747 s] | release 2.741 - 2.747 = -0.006 s
- C1 against B3, flat, set 2 (the design): pressure 22.11 - 27.89 = -5.78 | hit-or-sack 3.42 - 3.95 = -0.54 [time to throw 1.606 s against 1.589 s] | sacks 2.60 - 3.10 = -0.50 [time to throw 1.606 s against 1.589 s] | release 1.606 - 1.589 = +0.017 s
- C2 against B6, flat, set 2 (pricing arm, never a design value): pressure 41.09 - 43.52 = -2.43 | hit-or-sack 8.68 - 9.58 = -0.91 [time to throw 2.739 s against 2.746 s] | sacks 6.14 - 7.64 = -1.49 [time to throw 2.739 s against 2.746 s] | release 2.739 - 2.746 = -0.008 s
- C1 against B3, gen, set 1 (the design): pressure 23.29 - 28.73 = -5.43 | hit-or-sack 3.50 - 4.38 = -0.88 [time to throw 1.704 s against 1.682 s] | sacks 2.29 - 3.01 = -0.72 [time to throw 1.704 s against 1.682 s] | release 1.704 - 1.682 = +0.022 s
- C2 against B6, gen, set 1 (pricing arm, never a design value): pressure 41.02 - 43.83 = -2.81 | hit-or-sack 10.26 - 12.43 = -2.17 [time to throw 2.701 s against 2.704 s] | sacks 6.12 - 8.54 = -2.43 [time to throw 2.701 s against 2.704 s] | release 2.701 - 2.704 = -0.003 s
- C1 against B3, gen, set 2 (the design): pressure 24.93 - 30.45 = -5.52 | hit-or-sack 3.49 - 4.46 = -0.97 [time to throw 1.748 s against 1.711 s] | sacks 2.15 - 3.00 = -0.85 [time to throw 1.748 s against 1.711 s] | release 1.748 - 1.711 = +0.037 s
- C2 against B6, gen, set 2 (pricing arm, never a design value): pressure 42.27 - 44.81 = -2.54 | hit-or-sack 11.62 - 13.97 = -2.35 [time to throw 2.717 s against 2.719 s] | sacks 6.81 - 9.90 = -3.10 [time to throw 2.717 s against 2.719 s] | release 2.717 - 2.719 = -0.001 s

## The clause table

| clause | kind | arms | filed | measured | verdict |
|---|---|---|---|---|---|
| s3.part1.m8 | structural | C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C14, C15, C16 | superseded by AM-2 (ADR-089 Appendix G, G.8): part 1 on the published picture (filed: Wait, the Mug arm off) | 289969 men checked over 30 arm-sets; failures none | PASS |
| s3.part1.monotone | structural | C1, C2 | superseded by AM-2 (ADR-089 Appendix G, G.8): graded at the tenth on C1 and C2, Speed alone reported | 58942 men read; failures none; Speed alone (reported): C1 set 1 flat 0 later at the tenth of 9666 (largest 0.000317 s); C1 set 1 gen 9 later at the tenth of 5245 (largest 0.000822 s); C1 set 2 flat 0 later at the tenth of 9832 (largest 0.000317 s); C1 set 2 gen 0 later at the tenth of 5425 (largest 0.000582 s); C2 set 1 flat 0 later at the tenth of 9237 (largest 0.000317 s); C2 set 1 gen 10 later at the tenth of 4937 (largest 0.000627 s); C2 set 2 flat 0 later at the tenth of 9439 (largest 0.000317 s); C2 set 2 gen 0 later at the tenth of 5161 (largest 0.000611 s) | PASS |
| s3.part1.determinism | structural | C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | R-1: pocket -- --step 3 --digests in two processes, the two outputs byte-identical; not played by a graded run | NOT CHECKED (proved outside the run (step-3 plan §6.2 R-1)) |
| s3.part1.mirror | structural | C1 | its proof | failures none | PASS |
| s3.bin20.tick | graded | C1 | at most 29.4 | C1 flat set 1 15.57 (binomial SE 0.30; B3 20.69); set 2 15.50; two-set mean 15.54 [time to throw C1 1.606 s, B3 1.592 s]; C1 gen set 1 18.98 (binomial SE 0.43; B3 22.67); set 2 20.28; two-set mean 19.63 [time to throw C1 1.704 s, B3 1.682 s] | PASS (C1 set 1 graded on each league, set 2 and the two-set mean beside; a miss goes to the owner under the miss rule) |
| s3.hitOrSack | reported | C2, B6 | 9.1 to 9.3 (a gen-only level from a B6-like stand-in base; read as a delta) | gen set 1: C2 - B6 -2.17 [time to throw C2 2.701 s, B6 2.704 s]; gen set 2: C2 - B6 -2.35 [time to throw C2 2.717 s, B6 2.719 s]; beside, information: flat set 1: C2 - B6 -1.07 [time to throw C2 2.741 s, B6 2.747 s]; beside, information: flat set 2: C2 - B6 -0.91 [time to throw C2 2.739 s, B6 2.746 s] | REPORTED (the stand-ins' own delta -3.3 to -3.7; C1 has no stand-in counterpart (critique 4 S4-9)) |
| s3.quick | graded | C1 | 30 to 55 | C1 flat set 1 88.91 (binomial SE 0.30; B3 94.24); set 2 88.42; two-set mean 88.67 [time to throw C1 1.606 s, B3 1.592 s]; C1 gen set 1 83.14 (binomial SE 0.46; B3 90.16); set 2 80.73; two-set mean 81.94 [time to throw C1 1.704 s, B3 1.682 s] | FAIL (C1 set 1 graded on each league, set 2 and the two-set mean beside; a miss goes to the owner under the miss rule) |
| s3.quickOrigin | reported | C1, B3 | direction UP | flat set 1: C1 men on the clock 71.67% of quick pressures against 63.73% of all (+7.95); origin-keyed beside: free rushers 74.76% against 69.69% (+5.07); B3 men on the clock 59.75% of quick pressures against 56.31% of all (+3.44); origin-keyed beside: free rushers 82.77% against 78.00% (+4.77); flat set 2: C1 men on the clock 72.30% of quick pressures against 63.93% of all (+8.37); origin-keyed beside: free rushers 75.42% against 69.95% (+5.47); B3 men on the clock 59.99% of quick pressures against 56.55% of all (+3.44); origin-keyed beside: free rushers 82.78% against 78.03% (+4.75); gen set 1: C1 men on the clock 69.61% of quick pressures against 57.87% of all (+11.73); origin-keyed beside: free rushers 72.98% against 64.92% (+8.06); B3 men on the clock 58.18% of quick pressures against 52.45% of all (+5.72); origin-keyed beside: free rushers 81.56% against 73.53% (+8.02); gen set 2: C1 men on the clock 70.41% of quick pressures against 56.85% of all (+13.57); origin-keyed beside: free rushers 73.97% against 64.40% (+9.57); B3 men on the clock 58.44% of quick pressures against 51.86% of all (+6.58); origin-keyed beside: free rushers 81.66% against 72.46% (+9.20) | REPORTED (reported; acceptance grades its direction (ADR-089:1144); keyed by AM-2's freeRunKey (the men on the free-run clock under the arm's own reading, D19 on B3), the step-0 origin key beside) |
| s3.unblockedPressures | graded | C1 | at most 14 | C1 flat set 1 15.67 (binomial SE on dropbacks, an approximation: a dropback can count more than one man, 0.16; B3 17.53); set 2 15.87; two-set mean 15.77 [time to throw C1 1.606 s, B3 1.592 s]; on the clock under C1's own reading (AM-2's key; the filed row reads D19's band test): set 1 15.71, set 2 15.91; C1 gen set 1 15.25 (binomial SE on dropbacks, an approximation: a dropback can count more than one man, 0.21; B3 16.99); set 2 15.92; two-set mean 15.59 [time to throw C1 1.704 s, B3 1.682 s]; on the clock under C1's own reading (AM-2's key; the filed row reads D19's band test): set 1 15.27, set 2 15.94 | FAIL (C1 set 1 graded on each league, set 2 and the two-set mean beside; a miss goes to the owner under the miss rule) |
| s3.unblockedShare | graded | C1 | at most 40 | C1 flat set 1 75.71 (binomial SE 1.03; B3 66.42); set 2 76.49; two-set mean 76.10 [time to throw C1 1.606 s, B3 1.592 s]; on the clock under C1's own reading (AM-2's key; the filed row reads D19's band test): set 1 75.82, set 2 76.78; C1 gen set 1 69.78 (binomial SE 1.46; B3 65.05); set 2 72.19; two-set mean 70.99 [time to throw C1 1.704 s, B3 1.682 s]; on the clock under C1's own reading (AM-2's key; the filed row reads D19's band test): set 1 69.78, set 2 72.19 | FAIL (C1 set 1 graded on each league, set 2 and the two-set mean beside; a miss goes to the owner under the miss rule) |
| s3.unblockedMen | reported | C1, C2 | 16.3 to 16.8 | flat set 1: C1 18.78 (B3 19.12), C2 18.95 (B6 18.99); on the clock under each arm's own reading C1 18.83, C2 18.99; flat set 2: C1 19.07 (B3 19.35), C2 19.31 (B6 19.17); on the clock under each arm's own reading C1 19.12, C2 19.36; gen set 1: C1 18.43 (B3 18.33), C2 18.25 (B6 18.09); on the clock under each arm's own reading C1 18.46, C2 18.29; gen set 2: C1 19.12 (B3 19.30), C2 19.08 (B6 19.21); on the clock under each arm's own reading C1 19.15, C2 19.10 | REPORTED (reported beside the unblocked rows) |
| s3.expected.pressure | reported | C2, B6 | 39 (a gen-only level from a B6-like stand-in base; read as a delta) | gen set 1: C2 - B6 -2.81; gen set 2: C2 - B6 -2.54; beside, information: flat set 1: C2 - B6 -2.28; beside, information: flat set 2: C2 - B6 -2.43 | REPORTED (the stand-ins' own delta -4.2; C1 has no stand-in counterpart (critique 4 S4-9)) |
| s3.expected.sack | reported | C2, B6 | 3.55 (a gen-only level from a B6-like stand-in base; read as a delta) | gen set 1: C2 - B6 -2.43 [time to throw C2 2.701 s, B6 2.704 s]; gen set 2: C2 - B6 -3.10 [time to throw C2 2.717 s, B6 2.719 s]; beside, information: flat set 1: C2 - B6 -1.59 [time to throw C2 2.741 s, B6 2.747 s]; beside, information: flat set 2: C2 - B6 -1.49 [time to throw C2 2.739 s, B6 2.746 s] | REPORTED (the stand-ins' own delta -2.34; C1 has no stand-in counterpart (critique 4 S4-9)) |
| s3.expected.bin20 | reported | C2, B6 | 47 (a gen-only level from a B6-like stand-in base; read as a delta) | gen set 1: C2 - B6 -3.10; gen set 2: C2 - B6 -2.25; beside, information: flat set 1: C2 - B6 -3.35; beside, information: flat set 2: C2 - B6 -5.11 | REPORTED (the stand-ins' own delta -6.7; C1 has no stand-in counterpart (critique 4 S4-9)) |
| s3.expected.quick | reported | C2, B6 | 60.3 (a gen-only level from a B6-like stand-in base; read as a delta) | gen set 1: C2 - B6 -10.72; gen set 2: C2 - B6 -11.70; beside, information: flat set 1: C2 - B6 -10.97; beside, information: flat set 2: C2 - B6 -11.17 | REPORTED (the stand-ins' own delta -11.9; C1 has no stand-in counterpart (critique 4 S4-9)) |
| s3.neverOffered | structural | C11, C12, C13, C15 | its proof | the options offered are A, B, C, priced by A C15 and C C11 (B plays nothing); never offered: C12, reading (a): never offered (AM-2; ADR-089 §6.10); C13, the uniform delay (revision 1's LATE patch): never offered for a man nobody touched (AM-2) | PASS |
| guard.reported.intPerAttempt | structural | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.intPerAimed | structural | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.forced | structural | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.intSource | structural | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.completion | structural | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.completionAimed | structural | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.intByClass | structural | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.completionByClass | structural | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.mix | graded | C1, C2, C11 | as AM-1's reading under AM-3 (ADR-089 Appendix G, G.9): pooled Z over both seed sets above 2 breaches (filed: rise over the mix-predicted rise at most 0) | 6 arm-league readings, none breaching (largest Z +0.44) | PASS (graded on C1 against B3, C2 against B6, C11 against B3; the filed reading, e* and the paired SE are printed beside every reading in the guard section) |
| guard.byClass | graded | C1, C2, C11 | as AM-1's reading under AM-3 (ADR-089 Appendix G, G.9): pooled Z over both seed sets above 3 breaches (filed: rise over the mix-predicted rise at most 0) | 6 arm-league readings, none breaching (largest Z +1.45) | PASS (graded on C1 against B3, C2 against B6, C11 against B3; the filed reading, e* and the paired SE are printed beside every reading in the guard section) |
| guard.removedClass | structural | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.onTheRun.clean | reported | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | 2.11 | B3 set 1 flat n/a (0 aimed); B3 set 1 gen n/a (0 aimed); B3 set 2 flat n/a (0 aimed); B3 set 2 gen n/a (0 aimed); C1 set 1 flat n/a (0 aimed); C1 set 1 gen n/a (0 aimed); C1 set 2 flat n/a (0 aimed); C1 set 2 gen n/a (0 aimed); C2 set 1 flat n/a (0 aimed); C2 set 1 gen n/a (0 aimed); C2 set 2 flat n/a (0 aimed); C2 set 2 gen n/a (0 aimed); C3 set 1 flat n/a (0 aimed); C3 set 1 gen n/a (0 aimed); C3 set 2 flat n/a (0 aimed); C3 set 2 gen n/a (0 aimed); C4 set 1 flat n/a (0 aimed); C4 set 1 gen n/a (0 aimed); C4 set 2 flat n/a (0 aimed); C4 set 2 gen n/a (0 aimed); C5 set 1 flat n/a (0 aimed); C5 set 1 gen n/a (0 aimed); C5 set 2 flat n/a (0 aimed); C5 set 2 gen n/a (0 aimed); C6 set 1 flat n/a (0 aimed); C6 set 1 gen n/a (0 aimed); C6 set 2 flat n/a (0 aimed); C6 set 2 gen n/a (0 aimed); C7 set 1 flat n/a (0 aimed); C7 set 1 gen n/a (0 aimed); C7 set 2 flat n/a (0 aimed); C7 set 2 gen n/a (0 aimed); C8 set 1 flat n/a (0 aimed); C8 set 1 gen n/a (0 aimed); C8 set 2 flat n/a (0 aimed); C8 set 2 gen n/a (0 aimed); C9 set 1 flat n/a (0 aimed); C9 set 1 gen n/a (0 aimed); C9 set 2 flat n/a (0 aimed); C9 set 2 gen n/a (0 aimed); C10 set 1 flat n/a (0 aimed); C10 set 1 gen n/a (0 aimed); C10 set 2 flat n/a (0 aimed); C10 set 2 gen n/a (0 aimed); C11 set 1 flat n/a (0 aimed); C11 set 1 gen n/a (0 aimed); C11 set 2 flat n/a (0 aimed); C11 set 2 gen n/a (0 aimed); C12 set 1 flat n/a (0 aimed); C12 set 1 gen n/a (0 aimed); C12 set 2 flat n/a (0 aimed); C12 set 2 gen n/a (0 aimed); C13 set 1 flat n/a (0 aimed); C13 set 1 gen n/a (0 aimed); C13 set 2 flat n/a (0 aimed); C13 set 2 gen n/a (0 aimed); C14 set 1 flat n/a (0 aimed); C14 set 1 gen n/a (0 aimed); C14 set 2 flat n/a (0 aimed); C14 set 2 gen n/a (0 aimed); C15 set 1 flat n/a (0 aimed); C15 set 1 gen n/a (0 aimed); C15 set 2 flat n/a (0 aimed); C15 set 2 gen n/a (0 aimed); C16 set 1 flat n/a (0 aimed); C16 set 1 gen n/a (0 aimed); C16 set 2 flat n/a (0 aimed); C16 set 2 gen n/a (0 aimed) | REPORTED (0 by construction, as at step 2 (F.8 item 5): under PER_RUSHER, ESCAPE runs only on the threat part, a threat within C, so the arrival floor is COLLAPSING or worse at that tick and the pocket he leaves is never CLEAN; under step 1's rule (B5 and the re-played bases) the same holds through forcesDecision; it opens at step 5a) |
| guard.onTheRun.pressured | reported | A0, A14, A1, A11, B3, B6, B5, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16 | 3.25 | B3 set 1 flat 5.44 (147 aimed); B3 set 1 gen 20.00 (70 aimed); B3 set 2 flat 9.16 (131 aimed); B3 set 2 gen 8.45 (71 aimed); C1 set 1 flat 6.28 (207 aimed); C1 set 1 gen 15.93 (113 aimed); C1 set 2 flat 4.39 (205 aimed); C1 set 2 gen 12.35 (81 aimed); C2 set 1 flat 5.26 (190 aimed); C2 set 1 gen 15.38 (117 aimed); C2 set 2 flat 10.67 (178 aimed); C2 set 2 gen 7.59 (145 aimed); C3 set 1 flat 7.66 (222 aimed); C3 set 1 gen 12.24 (98 aimed); C3 set 2 flat 7.58 (198 aimed); C3 set 2 gen 13.00 (100 aimed); C4 set 1 flat 9.57 (209 aimed); C4 set 1 gen 13.76 (109 aimed); C4 set 2 flat 7.69 (208 aimed); C4 set 2 gen 13.33 (120 aimed); C5 set 1 flat 9.72 (216 aimed); C5 set 1 gen 14.66 (116 aimed); C5 set 2 flat 8.13 (209 aimed); C5 set 2 gen 11.11 (117 aimed); C6 set 1 flat 6.67 (210 aimed); C6 set 1 gen 16.81 (119 aimed); C6 set 2 flat 5.26 (209 aimed); C6 set 2 gen 12.99 (77 aimed); C7 set 1 flat 4.35 (161 aimed); C7 set 1 gen 17.39 (69 aimed); C7 set 2 flat 8.28 (145 aimed); C7 set 2 gen 7.79 (77 aimed); C8 set 1 flat 6.34 (205 aimed); C8 set 1 gen 17.89 (95 aimed); C8 set 2 flat 7.85 (191 aimed); C8 set 2 gen 12.90 (93 aimed); C9 set 1 flat 5.44 (147 aimed); C9 set 1 gen 21.13 (71 aimed); C9 set 2 flat 9.09 (132 aimed); C9 set 2 gen 9.23 (65 aimed); C10 set 1 flat 7.20 (125 aimed); C10 set 1 gen 22.39 (67 aimed); C10 set 2 flat 4.80 (125 aimed); C10 set 2 gen 16.00 (75 aimed); C11 set 1 flat 5.63 (213 aimed); C11 set 1 gen 15.52 (116 aimed); C11 set 2 flat 6.53 (199 aimed); C11 set 2 gen 13.54 (96 aimed); C12 set 1 flat 6.25 (128 aimed); C12 set 1 gen 9.43 (53 aimed); C12 set 2 flat 5.79 (121 aimed); C12 set 2 gen 20.83 (24 aimed); C13 set 1 flat 5.19 (77 aimed); C13 set 1 gen 12.50 (40 aimed); C13 set 2 flat 6.15 (65 aimed); C13 set 2 gen 23.33 (30 aimed); C14 set 1 flat 5.60 (232 aimed); C14 set 1 gen 16.22 (111 aimed); C14 set 2 flat 6.19 (226 aimed); C14 set 2 gen 7.23 (83 aimed); C15 set 1 flat 2.42 (124 aimed); C15 set 1 gen 20.00 (65 aimed); C15 set 2 flat 8.77 (114 aimed); C15 set 2 gen 23.26 (43 aimed); C16 set 1 flat 5.85 (188 aimed); C16 set 1 gen 19.42 (103 aimed); C16 set 2 flat 9.76 (164 aimed); C16 set 2 gen 8.60 (93 aimed) | REPORTED |

## Part 1, the touched men's check, the monotone check and the mirror (AM-2 `part1`, `monotone`; s3.part1.mirror)

Every man nobody touched has his published etaTick equal, to the tenth, to M8's free-run function applied to his own entry in the published picture, his ratings and the card's drop; each arm against its own picture. Every failure is a build fault, fixed before the owner sees anything (R-3). The monotone clauses are graded on C1 and C2; Speed alone is reported by count and size.

- C1, flat, set 1: 51346 of 51346 plays under pocket-1.s3, 51346 with a picture; part 1 9666 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 5415 late blocks, 2035 beaten, 3380 held the play, 2035 checked, 0 failed; held references 0, carried records 0; mirror 9666 checked, 0 failed; monotone (graded): 9666 men, Acceleration +1 0 later of 9666, both +1 0 later of 9666, the deeper drop 0 sooner of 9666; Speed alone (reported) 0 later at the tenth and 1679 unrounded of 9666, the largest 0.000317 s; the late block's stream 0 failing on 51346 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2459 of 9643 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1892, TODAY 567); later 5176, same 2008
- C1, flat, set 2: 51427 of 51427 plays under pocket-1.s3, 51427 with a picture; part 1 9832 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 5313 late blocks, 2025 beaten, 3288 held the play, 2025 checked, 0 failed; held references 0, carried records 0; mirror 9832 checked, 0 failed; monotone (graded): 9832 men, Acceleration +1 0 later of 9832, both +1 0 later of 9832, the deeper drop 0 sooner of 9832; Speed alone (reported) 0 later at the tenth and 1671 unrounded of 9832, the largest 0.000317 s; the late block's stream 0 failing on 51427 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2561 of 9809 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1939, TODAY 622); later 5248, same 2000
- C1, gen, set 1: 28419 of 28419 plays under pocket-1.s3, 28419 with a picture; part 1 5245 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 2917 late blocks, 1241 beaten, 1676 held the play, 1241 checked, 0 failed; held references 0, carried records 0; mirror 5245 checked, 0 failed; monotone (graded): 5245 men, Acceleration +1 0 later of 5245, both +1 0 later of 5245, the deeper drop 0 sooner of 5245; Speed alone (reported) 9 later at the tenth and 595 unrounded of 5245, the largest 0.000822 s; the late block's stream 0 failing on 28419 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 828 of 5237 D19 men earlier than the filed Wait table (TODAY 405, DOWN_LINEMAN 423); later 2667, same 1742
- C1, gen, set 2: 28335 of 28335 plays under pocket-1.s3, 28335 with a picture; part 1 5425 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 3015 late blocks, 1370 beaten, 1645 held the play, 1370 checked, 0 failed; held references 0, carried records 0; mirror 5425 checked, 0 failed; monotone (graded): 5425 men, Acceleration +1 0 later of 5425, both +1 0 later of 5425, the deeper drop 0 sooner of 5425; Speed alone (reported) 0 later at the tenth and 682 unrounded of 5425, the largest 0.000582 s; the late block's stream 0 failing on 28335 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 852 of 5418 D19 men earlier than the filed Wait table (DOWN_LINEMAN 420, TODAY 432); later 2732, same 1834
- C2, flat, set 1: 48629 of 48629 plays under pocket-1.s3, 48629 with a picture; part 1 9237 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 5047 late blocks, 3762 beaten, 1285 held the play, 3762 checked, 0 failed; held references 0, carried records 0; mirror 9237 checked, 0 failed; monotone (graded): 9237 men, Acceleration +1 0 later of 9237, both +1 0 later of 9237, the deeper drop 0 sooner of 9237; Speed alone (reported) 0 later at the tenth and 1610 unrounded of 9237, the largest 0.000317 s; the late block's stream 0 failing on 48629 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2391 of 9215 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1834, TODAY 557); later 4921, same 1903
- C2, flat, set 2: 48761 of 48761 plays under pocket-1.s3, 48761 with a picture; part 1 9439 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 5093 late blocks, 3772 beaten, 1321 held the play, 3772 checked, 0 failed; held references 0, carried records 0; mirror 9439 checked, 0 failed; monotone (graded): 9439 men, Acceleration +1 0 later of 9439, both +1 0 later of 9439, the deeper drop 0 sooner of 9439; Speed alone (reported) 0 later at the tenth and 1609 unrounded of 9439, the largest 0.000317 s; the late block's stream 0 failing on 48761 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2418 of 9416 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1811, TODAY 607); later 5031, same 1967
- C2, gen, set 1: 26999 of 26999 plays under pocket-1.s3, 26999 with a picture; part 1 4937 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 2858 late blocks, 2146 beaten, 712 held the play, 2146 checked, 0 failed; held references 0, carried records 0; mirror 4937 checked, 0 failed; monotone (graded): 4937 men, Acceleration +1 0 later of 4937, both +1 0 later of 4937, the deeper drop 0 sooner of 4937; Speed alone (reported) 10 later at the tenth and 599 unrounded of 4937, the largest 0.000627 s; the late block's stream 0 failing on 26999 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 810 of 4927 D19 men earlier than the filed Wait table (DOWN_LINEMAN 405, TODAY 405); later 2489, same 1628
- C2, gen, set 2: 27016 of 27016 plays under pocket-1.s3, 27016 with a picture; part 1 5161 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 2857 late blocks, 2153 beaten, 704 held the play, 2153 checked, 0 failed; held references 0, carried records 0; mirror 5161 checked, 0 failed; monotone (graded): 5161 men, Acceleration +1 0 later of 5161, both +1 0 later of 5161, the deeper drop 0 sooner of 5161; Speed alone (reported) 0 later at the tenth and 651 unrounded of 5161, the largest 0.000611 s; the late block's stream 0 failing on 27016 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 826 of 5156 D19 men earlier than the filed Wait table (TODAY 434, DOWN_LINEMAN 392); later 2565, same 1765
- C3, flat, set 1: 51289 of 51289 plays under pocket-1.s3, 51289 with a picture; part 1 9757 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 5330 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 9757, carried records 0; mirror 9757 checked, 0 failed; monotone (computed, not graded on this arm): 9757 men, Acceleration +1 0 later of 9757, both +1 0 later of 9757, the deeper drop 0 sooner of 9757; Speed alone (reported) 0 later at the tenth and 3850 unrounded of 9757, the largest 0.000405 s; the late block's stream 0 failing on 51289 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1885 of 9737 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1053, TODAY 832); later 4998, same 2854
- C3, flat, set 2: 51557 of 51557 plays under pocket-1.s3, 51557 with a picture; part 1 9918 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 5419 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 9918, carried records 0; mirror 9918 checked, 0 failed; monotone (computed, not graded on this arm): 9918 men, Acceleration +1 0 later of 9918, both +1 0 later of 9918, the deeper drop 0 sooner of 9918; Speed alone (reported) 0 later at the tenth and 3786 unrounded of 9918, the largest 0.000405 s; the late block's stream 0 failing on 51557 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1945 of 9894 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1026, TODAY 919); later 5045, same 2904
- C3, gen, set 1: 28421 of 28421 plays under pocket-1.s3, 28421 with a picture; part 1 5192 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 3022 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 5192, carried records 0; mirror 5192 checked, 0 failed; monotone (computed, not graded on this arm): 5192 men, Acceleration +1 0 later of 5192, both +1 0 later of 5192, the deeper drop 0 sooner of 5192; Speed alone (reported) 0 later at the tenth and 2092 unrounded of 5192, the largest 0.000405 s; the late block's stream 0 failing on 28421 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 977 of 5183 D19 men earlier than the filed Wait table (DOWN_LINEMAN 574, TODAY 403); later 2968, same 1238
- C3, gen, set 2: 28473 of 28473 plays under pocket-1.s3, 28473 with a picture; part 1 5537 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 3001 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 5537, carried records 0; mirror 5537 checked, 0 failed; monotone (computed, not graded on this arm): 5537 men, Acceleration +1 0 later of 5537, both +1 0 later of 5537, the deeper drop 0 sooner of 5537; Speed alone (reported) 0 later at the tenth and 2182 unrounded of 5537, the largest 0.000405 s; the late block's stream 0 failing on 28473 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1077 of 5531 D19 men earlier than the filed Wait table (DOWN_LINEMAN 618, TODAY 459); later 3222, same 1232
- C4, flat, set 1: 51311 of 51311 plays under pocket-1.s3, 51311 with a picture; part 1 9669 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 5328 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 9669, carried records 0; mirror 9669 checked, 0 failed; monotone (computed, not graded on this arm): 9669 men, Acceleration +1 0 later of 9669, both +1 0 later of 9669, the deeper drop 0 sooner of 9669; Speed alone (reported) 0 later at the tenth and 4478 unrounded of 9669, the largest 0.000246 s; the late block's stream 0 failing on 51311 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 5210 of 9649 D19 men earlier than the filed Wait table (DOWN_LINEMAN 4457, TODAY 753); later 4439, same 0
- C4, flat, set 2: 51656 of 51656 plays under pocket-1.s3, 51656 with a picture; part 1 10001 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 5385 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 10001, carried records 0; mirror 10001 checked, 0 failed; monotone (computed, not graded on this arm): 10001 men, Acceleration +1 0 later of 10001, both +1 0 later of 10001, the deeper drop 0 sooner of 10001; Speed alone (reported) 0 later at the tenth and 4534 unrounded of 10001, the largest 0.000246 s; the late block's stream 0 failing on 51656 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 5388 of 9974 D19 men earlier than the filed Wait table (DOWN_LINEMAN 4507, TODAY 881); later 4586, same 0
- C4, gen, set 1: 28065 of 28065 plays under pocket-1.s3, 28065 with a picture; part 1 5200 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 2908 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 5200, carried records 0; mirror 5200 checked, 0 failed; monotone (computed, not graded on this arm): 5200 men, Acceleration +1 0 later of 5200, both +1 0 later of 5200, the deeper drop 0 sooner of 5200; Speed alone (reported) 0 later at the tenth and 2282 unrounded of 5200, the largest 0.000678 s; the late block's stream 0 failing on 28065 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2704 of 5188 D19 men earlier than the filed Wait table (DOWN_LINEMAN 2339, TODAY 365); later 2484, same 0
- C4, gen, set 2: 28350 of 28350 plays under pocket-1.s3, 28350 with a picture; part 1 5498 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 3046 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 5498, carried records 0; mirror 5498 checked, 0 failed; monotone (computed, not graded on this arm): 5498 men, Acceleration +1 0 later of 5498, both +1 0 later of 5498, the deeper drop 0 sooner of 5498; Speed alone (reported) 0 later at the tenth and 2361 unrounded of 5498, the largest 0.000655 s; the late block's stream 0 failing on 28350 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2855 of 5490 D19 men earlier than the filed Wait table (DOWN_LINEMAN 2464, TODAY 391); later 2635, same 0
- C5, flat, set 1: 51314 of 51314 plays under pocket-1.s3, 51314 with a picture; part 1 9683 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 5346 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 9683, carried records 0; mirror 9683 checked, 0 failed; monotone (computed, not graded on this arm): 9683 men, Acceleration +1 0 later of 9683, both +1 0 later of 9683, the deeper drop 0 sooner of 9683; Speed alone (reported) 0 later at the tenth and 6883 unrounded of 9683, the largest 0.000336 s; the late block's stream 0 failing on 51314 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 5026 of 9662 D19 men earlier than the filed Wait table (DOWN_LINEMAN 4458, TODAY 568); later 4442, same 194
- C5, flat, set 2: 51604 of 51604 plays under pocket-1.s3, 51604 with a picture; part 1 9983 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 5383 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 9983, carried records 0; mirror 9983 checked, 0 failed; monotone (computed, not graded on this arm): 9983 men, Acceleration +1 0 later of 9983, both +1 0 later of 9983, the deeper drop 0 sooner of 9983; Speed alone (reported) 0 later at the tenth and 6980 unrounded of 9983, the largest 0.000336 s; the late block's stream 0 failing on 51604 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 5156 of 9956 D19 men earlier than the filed Wait table (DOWN_LINEMAN 4508, TODAY 648); later 4562, same 238
- C5, gen, set 1: 28263 of 28263 plays under pocket-1.s3, 28263 with a picture; part 1 5201 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 2995 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 5201, carried records 0; mirror 5201 checked, 0 failed; monotone (computed, not graded on this arm): 5201 men, Acceleration +1 0 later of 5201, both +1 0 later of 5201, the deeper drop 0 sooner of 5201; Speed alone (reported) 0 later at the tenth and 3738 unrounded of 5201, the largest 0.000336 s; the late block's stream 0 failing on 28263 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2596 of 5191 D19 men earlier than the filed Wait table (DOWN_LINEMAN 2324, TODAY 272); later 2474, same 121
- C5, gen, set 2: 28418 of 28418 plays under pocket-1.s3, 28418 with a picture; part 1 5529 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 3045 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 5529, carried records 0; mirror 5529 checked, 0 failed; monotone (computed, not graded on this arm): 5529 men, Acceleration +1 0 later of 5529, both +1 0 later of 5529, the deeper drop 0 sooner of 5529; Speed alone (reported) 0 later at the tenth and 3943 unrounded of 5529, the largest 0.000336 s; the late block's stream 0 failing on 28418 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2778 of 5523 D19 men earlier than the filed Wait table (DOWN_LINEMAN 2490, TODAY 288); later 2634, same 111
- C6, flat, set 1: 51380 of 51380 plays under pocket-1.s3, 51380 with a picture; part 1 9678 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 5420 late blocks, 2041 beaten, 3379 held the play, 2041 checked, 0 failed; held references 0, carried records 0; mirror 9678 checked, 0 failed; monotone (computed, not graded on this arm): 9678 men, Acceleration +1 0 later of 9678, both +1 0 later of 9678, the deeper drop 0 sooner of 9678; Speed alone (reported) 0 later at the tenth and 1564 unrounded of 9678, the largest 0.000317 s; the late block's stream 0 failing on 51380 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2483 of 9656 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1898, TODAY 585); later 5273, same 1900
- C6, flat, set 2: 51426 of 51426 plays under pocket-1.s3, 51426 with a picture; part 1 9866 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 5287 late blocks, 2010 beaten, 3277 held the play, 2010 checked, 0 failed; held references 0, carried records 0; mirror 9866 checked, 0 failed; monotone (computed, not graded on this arm): 9866 men, Acceleration +1 0 later of 9866, both +1 0 later of 9866, the deeper drop 0 sooner of 9866; Speed alone (reported) 0 later at the tenth and 1542 unrounded of 9866, the largest 0.000317 s; the late block's stream 0 failing on 51426 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2605 of 9842 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1965, TODAY 640); later 5362, same 1875
- C6, gen, set 1: 28430 of 28430 plays under pocket-1.s3, 28430 with a picture; part 1 5252 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 2938 late blocks, 1252 beaten, 1686 held the play, 1252 checked, 0 failed; held references 0, carried records 0; mirror 5252 checked, 0 failed; monotone (computed, not graded on this arm): 5252 men, Acceleration +1 0 later of 5252, both +1 0 later of 5252, the deeper drop 0 sooner of 5252; Speed alone (reported) 8 later at the tenth and 549 unrounded of 5252, the largest 0.000822 s; the late block's stream 0 failing on 28430 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 848 of 5244 D19 men earlier than the filed Wait table (TODAY 419, DOWN_LINEMAN 429); later 2734, same 1662
- C6, gen, set 2: 28395 of 28395 plays under pocket-1.s3, 28395 with a picture; part 1 5429 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 3020 late blocks, 1382 beaten, 1638 held the play, 1382 checked, 0 failed; held references 0, carried records 0; mirror 5429 checked, 0 failed; monotone (computed, not graded on this arm): 5429 men, Acceleration +1 0 later of 5429, both +1 0 later of 5429, the deeper drop 0 sooner of 5429; Speed alone (reported) 0 later at the tenth and 599 unrounded of 5429, the largest 0.000582 s; the late block's stream 0 failing on 28395 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 861 of 5422 D19 men earlier than the filed Wait table (DOWN_LINEMAN 415, TODAY 446); later 2809, same 1752
- C7, flat, set 1: 51163 of 51163 plays under pocket-1.s3, 51163 with a picture; part 1 1856 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 13280 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 1856 checked, 0 failed; monotone (computed, not graded on this arm): 1856 men, Acceleration +1 0 later of 1856, both +1 0 later of 1856, the deeper drop 0 sooner of 1856; Speed alone (reported) 0 later at the tenth and 1031 unrounded of 1856, the largest 0.000232 s; the late block's stream 0 failing on 51163 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1397 of 9762 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1366, TODAY 31); later 2607, same 5758
- C7, flat, set 2: 51582 of 51582 plays under pocket-1.s3, 51582 with a picture; part 1 1794 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 13532 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 1794 checked, 0 failed; monotone (computed, not graded on this arm): 1794 men, Acceleration +1 0 later of 1794, both +1 0 later of 1794, the deeper drop 0 sooner of 1794; Speed alone (reported) 0 later at the tenth and 1001 unrounded of 1794, the largest 0.000232 s; the late block's stream 0 failing on 51582 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1413 of 9966 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1360, TODAY 53); later 2513, same 6040
- C7, gen, set 1: 28206 of 28206 plays under pocket-1.s3, 28206 with a picture; part 1 975 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 7071 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 975 checked, 0 failed; monotone (computed, not graded on this arm): 975 men, Acceleration +1 0 later of 975, both +1 0 later of 975, the deeper drop 0 sooner of 975; Speed alone (reported) 1 later at the tenth and 222 unrounded of 975, the largest 0.000349 s; the late block's stream 0 failing on 28206 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 727 of 5159 D19 men earlier than the filed Wait table (DOWN_LINEMAN 683, TODAY 44); later 1760, same 2672
- C7, gen, set 2: 28286 of 28286 plays under pocket-1.s3, 28286 with a picture; part 1 1024 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 7416 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 1024 checked, 0 failed; monotone (computed, not graded on this arm): 1024 men, Acceleration +1 0 later of 1024, both +1 0 later of 1024, the deeper drop 0 sooner of 1024; Speed alone (reported) 0 later at the tenth and 267 unrounded of 1024, the largest 0.000470 s; the late block's stream 0 failing on 28286 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 744 of 5468 D19 men earlier than the filed Wait table (DOWN_LINEMAN 699, TODAY 45); later 1901, same 2823
- C8, flat, set 1: 51301 of 51301 plays under pocket-1.s3, 51301 with a picture; part 1 4410 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 10767 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 4410 checked, 0 failed; monotone (computed, not graded on this arm): 4410 men, Acceleration +1 0 later of 4410, both +1 0 later of 4410, the deeper drop 0 sooner of 4410; Speed alone (reported) 0 later at the tenth and 667 unrounded of 4410, the largest 0.000317 s; the late block's stream 0 failing on 51301 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1338 of 9765 D19 men earlier than the filed Wait table (DOWN_LINEMAN 772, TODAY 566); later 3695, same 4732
- C8, flat, set 2: 51738 of 51738 plays under pocket-1.s3, 51738 with a picture; part 1 4637 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 10759 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 4637 checked, 0 failed; monotone (computed, not graded on this arm): 4637 men, Acceleration +1 0 later of 4637, both +1 0 later of 4637, the deeper drop 0 sooner of 4637; Speed alone (reported) 0 later at the tenth and 709 unrounded of 4637, the largest 0.000317 s; the late block's stream 0 failing on 51738 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1337 of 9912 D19 men earlier than the filed Wait table (DOWN_LINEMAN 769, TODAY 568); later 3886, same 4689
- C8, gen, set 1: 28334 of 28334 plays under pocket-1.s3, 28334 with a picture; part 1 2391 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 5803 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 2391 checked, 0 failed; monotone (computed, not graded on this arm): 2391 men, Acceleration +1 0 later of 2391, both +1 0 later of 2391, the deeper drop 0 sooner of 2391; Speed alone (reported) 9 later at the tenth and 222 unrounded of 2391, the largest 0.000822 s; the late block's stream 0 failing on 28334 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 745 of 5180 D19 men earlier than the filed Wait table (DOWN_LINEMAN 384, TODAY 361); later 2466, same 1969
- C8, gen, set 2: 28284 of 28284 plays under pocket-1.s3, 28284 with a picture; part 1 2489 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 5989 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 2489 checked, 0 failed; monotone (computed, not graded on this arm): 2489 men, Acceleration +1 0 later of 2489, both +1 0 later of 2489, the deeper drop 0 sooner of 2489; Speed alone (reported) 0 later at the tenth and 297 unrounded of 2489, the largest 0.000582 s; the late block's stream 0 failing on 28284 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 841 of 5493 D19 men earlier than the filed Wait table (DOWN_LINEMAN 441, TODAY 400); later 2628, same 2024
- C9, flat, set 1: 51290 of 51290 plays under pocket-1.s3, 51290 with a picture; part 1 3536 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 11637 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 3536 checked, 0 failed; monotone (computed, not graded on this arm): 3536 men, Acceleration +1 0 later of 3536, both +1 0 later of 3536, the deeper drop 0 sooner of 3536; Speed alone (reported) 0 later at the tenth and 0 unrounded of 3536, the largest 0.000000 s; the late block's stream 0 failing on 51290 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2925 of 9818 D19 men earlier than the filed Wait table (DOWN_LINEMAN 2925); later 1090, same 5803
- C9, flat, set 2: 51557 of 51557 plays under pocket-1.s3, 51557 with a picture; part 1 3499 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 11848 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 3499 checked, 0 failed; monotone (computed, not graded on this arm): 3499 men, Acceleration +1 0 later of 3499, both +1 0 later of 3499, the deeper drop 0 sooner of 3499; Speed alone (reported) 0 later at the tenth and 0 unrounded of 3499, the largest 0.000000 s; the late block's stream 0 failing on 51557 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2909 of 9965 D19 men earlier than the filed Wait table (DOWN_LINEMAN 2909); later 1061, same 5995
- C9, gen, set 1: 28221 of 28221 plays under pocket-1.s3, 28221 with a picture; part 1 1847 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 6259 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 1847 checked, 0 failed; monotone (computed, not graded on this arm): 1847 men, Acceleration +1 0 later of 1847, both +1 0 later of 1847, the deeper drop 0 sooner of 1847; Speed alone (reported) 0 later at the tenth and 157 unrounded of 1847, the largest 0.000356 s; the late block's stream 0 failing on 28221 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 941 of 5204 D19 men earlier than the filed Wait table (DOWN_LINEMAN 941); later 339, same 3924
- C9, gen, set 2: 28119 of 28119 plays under pocket-1.s3, 28119 with a picture; part 1 1963 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 6452 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 1963 checked, 0 failed; monotone (computed, not graded on this arm): 1963 men, Acceleration +1 0 later of 1963, both +1 0 later of 1963, the deeper drop 0 sooner of 1963; Speed alone (reported) 0 later at the tenth and 111 unrounded of 1963, the largest 0.000332 s; the late block's stream 0 failing on 28119 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 928 of 5472 D19 men earlier than the filed Wait table (DOWN_LINEMAN 928); later 379, same 4165
- C10, flat, set 1: 51296 of 51296 plays under pocket-1.s3, 51296 with a picture; part 1 0 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 9890 checked, 0 failed; the touched men's check: 5281 late blocks, 1927 beaten, 3354 held the play, 1927 checked, 0 failed; held references 0, carried records 0; mirror 0 checked, 0 failed; monotone (computed, not graded on this arm): 0 men, Acceleration +1 0 later of 0, both +1 0 later of 0, the deeper drop 0 sooner of 0; Speed alone (reported) 0 later at the tenth and 0 unrounded of 0, the largest 0.000000 s; the late block's stream 0 failing on 51296 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1545 of 9861 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1545); later 1098, same 7218
- C10, flat, set 2: 51485 of 51485 plays under pocket-1.s3, 51485 with a picture; part 1 0 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 9873 checked, 0 failed; the touched men's check: 5440 late blocks, 2017 beaten, 3423 held the play, 2017 checked, 0 failed; held references 0, carried records 0; mirror 0 checked, 0 failed; monotone (computed, not graded on this arm): 0 men, Acceleration +1 0 later of 0, both +1 0 later of 0, the deeper drop 0 sooner of 0; Speed alone (reported) 0 later at the tenth and 0 unrounded of 0, the largest 0.000000 s; the late block's stream 0 failing on 51485 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1518 of 9847 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1518); later 1068, same 7261
- C10, gen, set 1: 28360 of 28360 plays under pocket-1.s3, 28360 with a picture; part 1 0 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 5257 checked, 0 failed; the touched men's check: 2968 late blocks, 1185 beaten, 1783 held the play, 1185 checked, 0 failed; held references 0, carried records 0; mirror 0 checked, 0 failed; monotone (computed, not graded on this arm): 0 men, Acceleration +1 0 later of 0, both +1 0 later of 0, the deeper drop 0 sooner of 0; Speed alone (reported) 0 later at the tenth and 0 unrounded of 0, the largest 0.000000 s; the late block's stream 0 failing on 28360 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 778 of 5248 D19 men earlier than the filed Wait table (DOWN_LINEMAN 778); later 958, same 3512
- C10, gen, set 2: 28155 of 28155 plays under pocket-1.s3, 28155 with a picture; part 1 0 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 5386 checked, 0 failed; the touched men's check: 2996 late blocks, 1278 beaten, 1718 held the play, 1278 checked, 0 failed; held references 0, carried records 0; mirror 0 checked, 0 failed; monotone (computed, not graded on this arm): 0 men, Acceleration +1 0 later of 0, both +1 0 later of 0, the deeper drop 0 sooner of 0; Speed alone (reported) 0 later at the tenth and 0 unrounded of 0, the largest 0.000000 s; the late block's stream 0 failing on 28155 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 836 of 5380 D19 men earlier than the filed Wait table (DOWN_LINEMAN 836); later 1041, same 3503
- C11, flat, set 1: 51466 of 51466 plays under pocket-1.s3, 51466 with a picture; part 1 9768 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 5408 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 9768 checked, 0 failed; monotone (computed, not graded on this arm): 9768 men, Acceleration +1 0 later of 9768, both +1 0 later of 9768, the deeper drop 0 sooner of 9768; Speed alone (reported) 0 later at the tenth and 1699 unrounded of 9768, the largest 0.000317 s; the late block's stream 0 failing on 51466 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2527 of 9749 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1939, TODAY 588); later 5237, same 1985
- C11, flat, set 2: 51542 of 51542 plays under pocket-1.s3, 51542 with a picture; part 1 9983 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 5370 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 9983 checked, 0 failed; monotone (computed, not graded on this arm): 9983 men, Acceleration +1 0 later of 9983, both +1 0 later of 9983, the deeper drop 0 sooner of 9983; Speed alone (reported) 0 later at the tenth and 1711 unrounded of 9983, the largest 0.000317 s; the late block's stream 0 failing on 51542 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2559 of 9959 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1913, TODAY 646); later 5379, same 2021
- C11, gen, set 1: 28518 of 28518 plays under pocket-1.s3, 28518 with a picture; part 1 5250 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 2998 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 5250 checked, 0 failed; monotone (computed, not graded on this arm): 5250 men, Acceleration +1 0 later of 5250, both +1 0 later of 5250, the deeper drop 0 sooner of 5250; Speed alone (reported) 9 later at the tenth and 599 unrounded of 5250, the largest 0.000627 s; the late block's stream 0 failing on 28518 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 836 of 5239 D19 men earlier than the filed Wait table (DOWN_LINEMAN 439, TODAY 397); later 2669, same 1734
- C11, gen, set 2: 28338 of 28338 plays under pocket-1.s3, 28338 with a picture; part 1 5511 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 3036 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 5511 checked, 0 failed; monotone (computed, not graded on this arm): 5511 men, Acceleration +1 0 later of 5511, both +1 0 later of 5511, the deeper drop 0 sooner of 5511; Speed alone (reported) 0 later at the tenth and 684 unrounded of 5511, the largest 0.000611 s; the late block's stream 0 failing on 28338 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 852 of 5505 D19 men earlier than the filed Wait table (TODAY 438, DOWN_LINEMAN 414); later 2802, same 1851
- C12, flat, set 1: 52083 of 52083 plays under pocket-1.s3, 52083 with a picture; part 1 1966 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 13482 late blocks, 6273 beaten, 7209 held the play, 6273 checked, 0 failed; held references 0, carried records 0; mirror 1966 checked, 0 failed; monotone (computed, not graded on this arm): 1966 men, Acceleration +1 0 later of 1966, both +1 0 later of 1966, the deeper drop 0 sooner of 1966; Speed alone (reported) 0 later at the tenth and 1069 unrounded of 1966, the largest 0.000232 s; the late block's stream 0 failing on 52083 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 62 of 1940 D19 men earlier than the filed Wait table (DOWN_LINEMAN 33, TODAY 29); later 1536, same 342
- C12, flat, set 2: 52702 of 52702 plays under pocket-1.s3, 52702 with a picture; part 1 1950 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 13667 late blocks, 6453 beaten, 7214 held the play, 6453 checked, 0 failed; held references 0, carried records 0; mirror 1950 checked, 0 failed; monotone (computed, not graded on this arm): 1950 men, Acceleration +1 0 later of 1950, both +1 0 later of 1950, the deeper drop 0 sooner of 1950; Speed alone (reported) 0 later at the tenth and 1075 unrounded of 1950, the largest 0.000232 s; the late block's stream 0 failing on 52702 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 69 of 1927 D19 men earlier than the filed Wait table (TODAY 45, DOWN_LINEMAN 24); later 1540, same 318
- C12, gen, set 1: 28622 of 28622 plays under pocket-1.s3, 28622 with a picture; part 1 1029 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 7283 late blocks, 3722 beaten, 3561 held the play, 3722 checked, 0 failed; held references 0, carried records 0; mirror 1029 checked, 0 failed; monotone (computed, not graded on this arm): 1029 men, Acceleration +1 0 later of 1029, both +1 0 later of 1029, the deeper drop 0 sooner of 1029; Speed alone (reported) 2 later at the tenth and 243 unrounded of 1029, the largest 0.000349 s; the late block's stream 0 failing on 28622 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 63 of 1018 D19 men earlier than the filed Wait table (TODAY 56, DOWN_LINEMAN 7); later 822, same 133
- C12, gen, set 2: 28248 of 28248 plays under pocket-1.s3, 28248 with a picture; part 1 1073 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 7435 late blocks, 3884 beaten, 3551 held the play, 3884 checked, 0 failed; held references 0, carried records 0; mirror 1073 checked, 0 failed; monotone (computed, not graded on this arm): 1073 men, Acceleration +1 0 later of 1073, both +1 0 later of 1073, the deeper drop 0 sooner of 1073; Speed alone (reported) 0 later at the tenth and 259 unrounded of 1073, the largest 0.000470 s; the late block's stream 0 failing on 28248 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 57 of 1064 D19 men earlier than the filed Wait table (TODAY 49, DOWN_LINEMAN 8); later 843, same 164
- C14, flat, set 1: 51540 of 51540 plays under pocket-1.s3, 51540 with a picture; part 1 10000 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 4709 late blocks, 1327 beaten, 3382 held the play, 1327 checked, 0 failed; held references 0, carried records 0; mirror 10000 checked, 0 failed; monotone (computed, not graded on this arm): 10000 men, Acceleration +1 0 later of 10000, both +1 0 later of 10000, the deeper drop 0 sooner of 10000; Speed alone (reported) 0 later at the tenth and 1743 unrounded of 10000, the largest 0.000317 s; the late block's stream 0 failing on 51540 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2539 of 9972 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1939, TODAY 600); later 5335, same 2098
- C14, flat, set 2: 51840 of 51840 plays under pocket-1.s3, 51840 with a picture; part 1 9987 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 4689 late blocks, 1408 beaten, 3281 held the play, 1408 checked, 0 failed; held references 0, carried records 0; mirror 9987 checked, 0 failed; monotone (computed, not graded on this arm): 9987 men, Acceleration +1 0 later of 9987, both +1 0 later of 9987, the deeper drop 0 sooner of 9987; Speed alone (reported) 0 later at the tenth and 1753 unrounded of 9987, the largest 0.000317 s; the late block's stream 0 failing on 51840 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 2627 of 9961 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1980, TODAY 647); later 5316, same 2018
- C14, gen, set 1: 28631 of 28631 plays under pocket-1.s3, 28631 with a picture; part 1 5278 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 2563 late blocks, 844 beaten, 1719 held the play, 844 checked, 0 failed; held references 0, carried records 0; mirror 5278 checked, 0 failed; monotone (computed, not graded on this arm): 5278 men, Acceleration +1 0 later of 5278, both +1 0 later of 5278, the deeper drop 0 sooner of 5278; Speed alone (reported) 8 later at the tenth and 617 unrounded of 5278, the largest 0.000627 s; the late block's stream 0 failing on 28631 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 855 of 5266 D19 men earlier than the filed Wait table (TODAY 415, DOWN_LINEMAN 440); later 2644, same 1767
- C14, gen, set 2: 28585 of 28585 plays under pocket-1.s3, 28585 with a picture; part 1 5485 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 2657 late blocks, 926 beaten, 1731 held the play, 926 checked, 0 failed; held references 0, carried records 0; mirror 5485 checked, 0 failed; monotone (computed, not graded on this arm): 5485 men, Acceleration +1 0 later of 5485, both +1 0 later of 5485, the deeper drop 0 sooner of 5485; Speed alone (reported) 0 later at the tenth and 707 unrounded of 5485, the largest 0.000582 s; the late block's stream 0 failing on 28585 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 863 of 5475 D19 men earlier than the filed Wait table (TODAY 449, DOWN_LINEMAN 414); later 2725, same 1887
- C15, flat, set 1: 51906 of 51906 plays under pocket-1.s3, 51906 with a picture; part 1 3827 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 3137 late blocks, 1584 beaten, 1553 held the play, 1584 checked, 0 failed; held references 0, carried records 0; mirror 3827 checked, 0 failed; monotone (computed, not graded on this arm): 3827 men, Acceleration +1 0 later of 3827, both +1 0 later of 3827, the deeper drop 0 sooner of 3827; Speed alone (reported) 0 later at the tenth and 1311 unrounded of 3827, the largest 0.000317 s; the late block's stream 0 failing on 51906 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 381 of 3818 D19 men earlier than the filed Wait table (TODAY 231, DOWN_LINEMAN 150); later 2608, same 829
- C15, flat, set 2: 52224 of 52224 plays under pocket-1.s3, 52224 with a picture; part 1 3952 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 3169 late blocks, 1572 beaten, 1597 held the play, 1572 checked, 0 failed; held references 0, carried records 0; mirror 3952 checked, 0 failed; monotone (computed, not graded on this arm): 3952 men, Acceleration +1 0 later of 3952, both +1 0 later of 3952, the deeper drop 0 sooner of 3952; Speed alone (reported) 0 later at the tenth and 1343 unrounded of 3952, the largest 0.000317 s; the late block's stream 0 failing on 52224 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 395 of 3941 D19 men earlier than the filed Wait table (DOWN_LINEMAN 127, TODAY 268); later 2753, same 793
- C15, gen, set 1: 28521 of 28521 plays under pocket-1.s3, 28521 with a picture; part 1 2048 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 1577 late blocks, 871 beaten, 706 held the play, 871 checked, 0 failed; held references 0, carried records 0; mirror 2048 checked, 0 failed; monotone (computed, not graded on this arm): 2048 men, Acceleration +1 0 later of 2048, both +1 0 later of 2048, the deeper drop 0 sooner of 2048; Speed alone (reported) 4 later at the tenth and 324 unrounded of 2048, the largest 0.000627 s; the late block's stream 0 failing on 28521 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 215 of 2044 D19 men earlier than the filed Wait table (TODAY 178, DOWN_LINEMAN 37); later 1411, same 418
- C15, gen, set 2: 28294 of 28294 plays under pocket-1.s3, 28294 with a picture; part 1 2106 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 0 checked, 0 failed; the touched men's check: 1779 late blocks, 1013 beaten, 766 held the play, 1013 checked, 0 failed; held references 0, carried records 0; mirror 2106 checked, 0 failed; monotone (computed, not graded on this arm): 2106 men, Acceleration +1 0 later of 2106, both +1 0 later of 2106, the deeper drop 0 sooner of 2106; Speed alone (reported) 0 later at the tenth and 388 unrounded of 2106, the largest 0.000582 s; the late block's stream 0 failing on 28294 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 222 of 2099 D19 men earlier than the filed Wait table (TODAY 183, DOWN_LINEMAN 39); later 1461, same 416
- C16, flat, set 1: 50892 of 50892 plays under pocket-1.s3, 50892 with a picture; part 1 0 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 15009 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 0 checked, 0 failed; monotone (computed, not graded on this arm): 0 men, Acceleration +1 0 later of 0, both +1 0 later of 0, the deeper drop 0 sooner of 0; Speed alone (reported) 0 later at the tenth and 0 unrounded of 0, the largest 0.000000 s; the late block's stream 0 failing on 50892 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1572 of 9755 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1572); later 1059, same 7124
- C16, flat, set 2: 50907 of 50907 plays under pocket-1.s3, 50907 with a picture; part 1 0 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 15132 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 0 checked, 0 failed; monotone (computed, not graded on this arm): 0 men, Acceleration +1 0 later of 0, both +1 0 later of 0, the deeper drop 0 sooner of 0; Speed alone (reported) 0 later at the tenth and 0 unrounded of 0, the largest 0.000000 s; the late block's stream 0 failing on 50907 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 1536 of 9836 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1536); later 1059, same 7241
- C16, gen, set 1: 28055 of 28055 plays under pocket-1.s3, 28055 with a picture; part 1 0 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 8031 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 0 checked, 0 failed; monotone (computed, not graded on this arm): 0 men, Acceleration +1 0 later of 0, both +1 0 later of 0, the deeper drop 0 sooner of 0; Speed alone (reported) 0 later at the tenth and 0 unrounded of 0, the largest 0.000000 s; the late block's stream 0 failing on 28055 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 756 of 5113 D19 men earlier than the filed Wait table (DOWN_LINEMAN 756); later 972, same 3385
- C16, gen, set 2: 28045 of 28045 plays under pocket-1.s3, 28045 with a picture; part 1 0 checked, 0 failed (0 earlier than the function); touched on the clock (reading C) 0 checked, 0 failed; off the clock (today's time) 8375 checked, 0 failed; the touched men's check: 0 late blocks, 0 beaten, 0 held the play, 0 checked, 0 failed; held references 0, carried records 0; mirror 0 checked, 0 failed; monotone (computed, not graded on this arm): 0 men, Acceleration +1 0 later of 0, both +1 0 later of 0, the deeper drop 0 sooner of 0; Speed alone (reported) 0 later at the tenth and 0 unrounded of 0, the largest 0.000000 s; the late block's stream 0 failing on 28045 s3 plays; the literal count against the filed Wait table (printed beside, never graded): 812 of 5419 D19 men earlier than the filed Wait table (DOWN_LINEMAN 812); later 1079, same 3528

### Part 1 by origin and by snap row (both sets added)

- C1, flat: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 8865/0, UNBLOCKED 3653/0, STUNT_LOOPER/LOOPER_FREE 6934/0, STUNT_LOOPER/LATE_EXCHANGE 46/0; by snap row LB@2.5 5447/0, DL@1 8999/0, DB@5 1388/0, DB@5 DELAYED 253/0, LB@4.5 2718/0, LB@1.5 362/0, LB@4.5 moving 331/0
- C1, gen: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 4866/0, UNBLOCKED 2022/0, STUNT_LOOPER/LOOPER_FREE 3767/0, STUNT_LOOPER/LATE_EXCHANGE 15/0; by snap row LB@2.5 3062/0, DL@1 4842/0, LB@4.5 1571/0, DB@5 637/0, DB@5 DELAYED 116/0, LB@4.5 moving 210/0, LB@1.5 232/0
- C2, flat: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 8540/0, UNBLOCKED 3433/0, STUNT_LOOPER/LOOPER_FREE 6658/0, STUNT_LOOPER/LATE_EXCHANGE 45/0; by snap row LB@2.5 5168/0, DL@1 8629/0, LB@4.5 2615/0, DB@5 1361/0, LB@1.5 327/0, LB@4.5 moving 338/0, DB@5 DELAYED 238/0
- C2, gen: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 4626/0, STUNT_LOOPER/LOOPER_FREE 3515/0, UNBLOCKED 1942/0, STUNT_LOOPER/LATE_EXCHANGE 15/0; by snap row LB@2.5 2908/0, LB@1.5 218/0, DL@1 4526/0, DB@5 DELAYED 112/0, LB@4.5 1478/0, DB@5 611/0, LB@4.5 moving 245/0
- C3, flat: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 9030/0, STUNT_LOOPER/LOOPER_FREE 6914/0, UNBLOCKED 3687/0, STUNT_LOOPER/LATE_EXCHANGE 44/0; by snap row LB@2.5 5527/0, DL@1 8981/0, DB@5 1405/0, LB@4.5 moving 346/0, LB@4.5 2809/0, LB@1.5 345/0, DB@5 DELAYED 262/0
- C3, gen: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 4895/0, UNBLOCKED 2032/0, STUNT_LOOPER/LOOPER_FREE 3787/0, STUNT_LOOPER/LATE_EXCHANGE 15/0; by snap row LB@2.5 3128/0, LB@1.5 221/0, DL@1 4862/0, LB@4.5 1555/0, DB@5 636/0, LB@4.5 moving 226/0, DB@5 DELAYED 101/0
- C4, flat: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 9024/0, STUNT_LOOPER/LOOPER_FREE 6908/0, UNBLOCKED 3691/0, STUNT_LOOPER/LATE_EXCHANGE 47/0; by snap row LB@2.5 5566/0, DL@1 9012/0, DB@5 1381/0, LB@4.5 moving 357/0, LB@4.5 2769/0, LB@1.5 340/0, DB@5 DELAYED 245/0
- C4, gen: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 4908/0, UNBLOCKED 2012/0, STUNT_LOOPER/LOOPER_FREE 3758/0, STUNT_LOOPER/LATE_EXCHANGE 20/0; by snap row LB@2.5 3166/0, LB@1.5 220/0, DL@1 4823/0, DB@5 638/0, LB@4.5 1537/0, LB@4.5 moving 209/0, DB@5 DELAYED 105/0
- C5, flat: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 9009/0, STUNT_LOOPER/LOOPER_FREE 6913/0, UNBLOCKED 3696/0, STUNT_LOOPER/LATE_EXCHANGE 48/0; by snap row LB@2.5 5544/0, DL@1 9017/0, DB@5 1395/0, LB@4.5 moving 354/0, LB@4.5 2773/0, LB@1.5 338/0, DB@5 DELAYED 245/0
- C5, gen: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 4918/0, STUNT_LOOPER/LOOPER_FREE 3772/0, UNBLOCKED 2024/0, STUNT_LOOPER/LATE_EXCHANGE 16/0; by snap row LB@2.5 3130/0, LB@1.5 219/0, DL@1 4857/0, DB@5 632/0, DB@5 DELAYED 104/0, LB@4.5 1562/0, LB@4.5 moving 226/0
- C6, flat: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 8903/0, UNBLOCKED 3635/0, STUNT_LOOPER/LOOPER_FREE 6960/0, STUNT_LOOPER/LATE_EXCHANGE 46/0; by snap row LB@2.5 5435/0, DL@1 9027/0, DB@5 1389/0, DB@5 DELAYED 256/0, LB@4.5 3051/0, LB@4.5 moving 386/0
- C6, gen: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 4872/0, UNBLOCKED 2024/0, STUNT_LOOPER/LOOPER_FREE 3770/0, STUNT_LOOPER/LATE_EXCHANGE 15/0; by snap row LB@2.5 3078/0, DL@1 4833/0, LB@4.5 1762/0, DB@5 641/0, DB@5 DELAYED 114/0, LB@4.5 moving 253/0
- C7, flat: by origin (checked/failed) UNBLOCKED 3650/0; by snap row LB@2.5 3101/0, DL@1 394/0, LB@4.5 63/0, DB@5 84/0, LB@1.5 8/0
- C7, gen: by origin (checked/failed) UNBLOCKED 1999/0; by snap row LB@2.5 1694/0, DL@1 223/0, DB@5 36/0, LB@4.5 44/0, LB@1.5 2/0
- C8, flat: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 9047/0; by snap row LB@2.5 2368/0, DL@1 1640/0, DB@5 1331/0, LB@4.5 moving 356/0, LB@4.5 2732/0, LB@1.5 353/0, DB@5 DELAYED 267/0
- C8, gen: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 4880/0; by snap row LB@2.5 1395/0, LB@1.5 208/0, DL@1 852/0, DB@5 606/0, DB@5 DELAYED 110/0, LB@4.5 1488/0, LB@4.5 moving 221/0
- C9, flat: by origin (checked/failed) STUNT_LOOPER/LOOPER_FREE 6985/0, STUNT_LOOPER/LATE_EXCHANGE 50/0; by snap row DL@1 7035/0
- C9, gen: by origin (checked/failed) STUNT_LOOPER/LOOPER_FREE 3796/0, STUNT_LOOPER/LATE_EXCHANGE 14/0; by snap row DL@1 3810/0
- C10, flat: by origin (checked/failed) none; by snap row none
- C10, gen: by origin (checked/failed) none; by snap row none
- C11, flat: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 9077/0, UNBLOCKED 3668/0, STUNT_LOOPER/LOOPER_FREE 6963/0, STUNT_LOOPER/LATE_EXCHANGE 43/0; by snap row LB@2.5 5507/0, DL@1 9017/0, DB@5 1420/0, DB@5 DELAYED 271/0, LB@4.5 2833/0, LB@1.5 355/0, LB@4.5 moving 348/0
- C11, gen: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 4929/0, STUNT_LOOPER/LOOPER_FREE 3763/0, UNBLOCKED 2052/0, STUNT_LOOPER/LATE_EXCHANGE 17/0; by snap row LB@2.5 3132/0, LB@1.5 238/0, DL@1 4833/0, DB@5 625/0, DB@5 DELAYED 105/0, LB@4.5 1602/0, LB@4.5 moving 226/0
- C12, flat: by origin (checked/failed) UNBLOCKED 3789/0, STUNT_LOOPER/LOOPER_FREE 78/0, STUNT_LOOPER/LATE_EXCHANGE 49/0; by snap row LB@2.5 3247/0, DL@1 529/0, LB@4.5 59/0, DB@5 74/0, LB@1.5 7/0
- C12, gen: by origin (checked/failed) UNBLOCKED 2039/0, STUNT_LOOPER/LOOPER_FREE 43/0, STUNT_LOOPER/LATE_EXCHANGE 20/0; by snap row LB@2.5 1743/0, DL@1 264/0, DB@5 44/0, LB@4.5 49/0, LB@1.5 2/0
- C14, flat: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 9223/0, STUNT_LOOPER/LOOPER_FREE 7017/0, UNBLOCKED 3693/0, STUNT_LOOPER/LATE_EXCHANGE 54/0; by snap row LB@2.5 5655/0, DL@1 9154/0, DB@5 1406/0, DB@5 DELAYED 235/0, LB@4.5 moving 375/0, LB@4.5 2784/0, LB@1.5 378/0
- C14, gen: by origin (checked/failed) PICKUP_LOST/BLOWN_UP 4920/0, UNBLOCKED 2036/0, STUNT_LOOPER/LOOPER_FREE 3785/0, STUNT_LOOPER/LATE_EXCHANGE 22/0; by snap row LB@2.5 3146/0, DL@1 4870/0, LB@4.5 1521/0, DB@5 639/0, DB@5 DELAYED 108/0, LB@4.5 moving 233/0, LB@1.5 246/0
- C15, flat: by origin (checked/failed) UNBLOCKED 3789/0, PICKUP_LOST/BLOWN_UP 3430/0, STUNT_LOOPER/LOOPER_FREE 540/0, STUNT_LOOPER/LATE_EXCHANGE 20/0; by snap row LB@2.5 4114/0, DB@5 562/0, DL@1 1609/0, LB@4.5 moving 144/0, LB@4.5 1126/0, DB@5 DELAYED 76/0, LB@1.5 148/0
- C15, gen: by origin (checked/failed) UNBLOCKED 2010/0, PICKUP_LOST/BLOWN_UP 1857/0, STUNT_LOOPER/LOOPER_FREE 276/0, STUNT_LOOPER/LATE_EXCHANGE 11/0; by snap row LB@2.5 2220/0, DL@1 815/0, DB@5 251/0, LB@4.5 658/0, LB@4.5 moving 82/0, LB@1.5 90/0, DB@5 DELAYED 38/0
- C16, flat: by origin (checked/failed) none; by snap row none
- C16, gen: by origin (checked/failed) none; by snap row none

### The filed M8 block, unchanged (the step-0 filing's M.M8; printed beside part 1, never re-filed)

```json
{"flat":{"answer":"WAIT (question 19); Table now and its Mug arm are information only","keyDisagreements":{"dlVsDepthLine":0,"dlVsDepthLineByPosition":{},"dlVsPersonnel":0,"dlVsPersonnelByPosition":{},"runners":13142},"publishedMismatches":0,"runners":13142,"tableNow":{"rows":{"DOWN_LINEMAN":3947,"LB_DISGUISED":1423,"LB_ON_THE_EDGE":115,"LB_WALKED_UP":2293,"SLOT_CORNER":702,"TOUCHED":4662},"table":{"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DE":{"etaHistogram":{"1.7":440,"1.9":230},"later":670,"meanEta":1.769,"meanToday":1.5,"n":670,"sooner":0},"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DT":{"etaHistogram":{"1.4":4,"1.7":24,"1.9":14},"later":42,"meanEta":1.738,"meanToday":1.429,"n":42,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_DISGUISED|MLB":{"etaHistogram":{"1.9":527,"2.1":156},"later":683,"meanEta":1.946,"meanToday":1.5,"n":683,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_DISGUISED|OLB":{"etaHistogram":{"1.9":502,"2.1":210},"later":712,"meanEta":1.959,"meanToday":1.5,"n":712,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_ON_THE_EDGE|OLB":{"etaHistogram":{"1.9":12,"2.1":5},"later":5,"meanEta":1.959,"meanToday":2,"n":17,"sooner":12},"PICKUP_LOST/BLOWN_UP|LB_WALKED_UP|MLB":{"etaHistogram":{"1.6":197,"1.7":81,"1.9":176},"later":454,"meanEta":1.734,"meanToday":1.5,"n":454,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_WALKED_UP|OLB":{"etaHistogram":{"1.6":260,"1.7":126,"1.9":171},"later":557,"meanEta":1.715,"meanToday":1.5,"n":557,"sooner":0},"PICKUP_LOST/BLOWN_UP|SLOT_CORNER|CB":{"etaHistogram":{"2.3":372,"2.5":190,"2.8":70,"3.0":44},"later":114,"meanEta":2.454,"meanToday":2.5,"n":676,"sooner":372},"PICKUP_LOST/RAN_THROUGH|TOUCHED|CB":{"etaHistogram":{"3.0":344},"later":0,"meanEta":3,"meanToday":3,"n":344,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DE":{"etaHistogram":{"1.5":1,"2.0":393},"later":0,"meanEta":1.999,"meanToday":1.999,"n":394,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DT":{"etaHistogram":{"1.5":2,"2.0":14},"later":0,"meanEta":1.938,"meanToday":1.938,"n":16,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|MLB":{"etaHistogram":{"2.0":628},"later":0,"meanEta":2,"meanToday":2,"n":628,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|OLB":{"etaHistogram":{"2.0":698,"2.5":10},"later":0,"meanEta":2.007,"meanToday":2.007,"n":708,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DE":{"etaHistogram":{"2.5":2012},"later":0,"meanEta":2.5,"meanToday":2.5,"n":2012,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DT":{"etaHistogram":{"2.5":560},"later":0,"meanEta":2.5,"meanToday":2.5,"n":560,"sooner":0},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DE":{"etaHistogram":{"2.0":1631,"2.2":485},"later":485,"meanEta":2.046,"meanToday":2,"n":2116,"sooner":0},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DT":{"etaHistogram":{"1.7":736,"1.9":203},"later":0,"meanEta":1.743,"meanToday":2,"n":939,"sooner":939},"UNBLOCKED|DOWN_LINEMAN|DE":{"etaHistogram":{"1.7":180},"later":180,"meanEta":1.7,"meanToday":1.5,"n":180,"sooner":0},"UNBLOCKED|LB_DISGUISED|MLB":{"etaHistogram":{"1.9":28},"later":28,"meanEta":1.9,"meanToday":1.5,"n":28,"sooner":0},"UNBLOCKED|LB_ON_THE_EDGE|OLB":{"etaHistogram":{"1.9":98},"later":0,"meanEta":1.9,"meanToday":2,"n":98,"sooner":98},"UNBLOCKED|LB_WALKED_UP|MLB":{"etaHistogram":{"1.6":932,"1.7":340,"1.9":10},"later":1282,"meanEta":1.629,"meanToday":1.5,"n":1282,"sooner":0},"UNBLOCKED|SLOT_CORNER|CB":{"etaHistogram":{"2.3":26},"later":0,"meanEta":2.3,"meanToday":2.5,"n":26,"sooner":26}}},"tableNowMug":{"rows":{"DOWN_LINEMAN":3947,"LB_DISGUISED":1269,"LB_MUG":169,"LB_ON_THE_EDGE":104,"LB_WALKED_UP":2289,"SLOT_CORNER":702,"TOUCHED":4662},"table":{"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DE":{"etaHistogram":{"1.7":440,"1.9":230},"later":670,"meanEta":1.769,"meanToday":1.5,"n":670,"sooner":0},"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DT":{"etaHistogram":{"1.4":4,"1.7":24,"1.9":14},"later":42,"meanEta":1.738,"meanToday":1.429,"n":42,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_DISGUISED|MLB":{"etaHistogram":{"1.9":472,"2.1":130},"later":602,"meanEta":1.943,"meanToday":1.5,"n":602,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_DISGUISED|OLB":{"etaHistogram":{"1.9":456,"2.1":185},"later":641,"meanEta":1.958,"meanToday":1.5,"n":641,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_MUG|MLB":{"etaHistogram":{"1.5":55,"1.7":26},"later":26,"meanEta":1.564,"meanToday":1.5,"n":81,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_MUG|OLB":{"etaHistogram":{"1.5":49,"1.7":26,"1.8":1},"later":26,"meanEta":1.572,"meanToday":1.507,"n":76,"sooner":1},"PICKUP_LOST/BLOWN_UP|LB_ON_THE_EDGE|OLB":{"etaHistogram":{"1.9":11,"2.1":5},"later":5,"meanEta":1.963,"meanToday":2,"n":16,"sooner":11},"PICKUP_LOST/BLOWN_UP|LB_WALKED_UP|MLB":{"etaHistogram":{"1.6":197,"1.7":81,"1.9":176},"later":454,"meanEta":1.734,"meanToday":1.5,"n":454,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_WALKED_UP|OLB":{"etaHistogram":{"1.6":260,"1.7":123,"1.9":170},"later":553,"meanEta":1.714,"meanToday":1.5,"n":553,"sooner":0},"PICKUP_LOST/BLOWN_UP|SLOT_CORNER|CB":{"etaHistogram":{"2.3":372,"2.5":190,"2.8":70,"3.0":44},"later":114,"meanEta":2.454,"meanToday":2.5,"n":676,"sooner":372},"PICKUP_LOST/RAN_THROUGH|TOUCHED|CB":{"etaHistogram":{"3.0":344},"later":0,"meanEta":3,"meanToday":3,"n":344,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DE":{"etaHistogram":{"1.5":1,"2.0":393},"later":0,"meanEta":1.999,"meanToday":1.999,"n":394,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DT":{"etaHistogram":{"1.5":2,"2.0":14},"later":0,"meanEta":1.938,"meanToday":1.938,"n":16,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|MLB":{"etaHistogram":{"2.0":628},"later":0,"meanEta":2,"meanToday":2,"n":628,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|OLB":{"etaHistogram":{"2.0":698,"2.5":10},"later":0,"meanEta":2.007,"meanToday":2.007,"n":708,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DE":{"etaHistogram":{"2.5":2012},"later":0,"meanEta":2.5,"meanToday":2.5,"n":2012,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DT":{"etaHistogram":{"2.5":560},"later":0,"meanEta":2.5,"meanToday":2.5,"n":560,"sooner":0},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DE":{"etaHistogram":{"2.0":1631,"2.2":485},"later":485,"meanEta":2.046,"meanToday":2,"n":2116,"sooner":0},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DT":{"etaHistogram":{"1.7":736,"1.9":203},"later":0,"meanEta":1.743,"meanToday":2,"n":939,"sooner":939},"UNBLOCKED|DOWN_LINEMAN|DE":{"etaHistogram":{"1.7":180},"later":180,"meanEta":1.7,"meanToday":1.5,"n":180,"sooner":0},"UNBLOCKED|LB_DISGUISED|MLB":{"etaHistogram":{"1.9":26},"later":26,"meanEta":1.9,"meanToday":1.5,"n":26,"sooner":0},"UNBLOCKED|LB_MUG|MLB":{"etaHistogram":{"1.5":2},"later":0,"meanEta":1.5,"meanToday":1.5,"n":2,"sooner":0},"UNBLOCKED|LB_MUG|OLB":{"etaHistogram":{"1.8":10},"later":0,"meanEta":1.8,"meanToday":2,"n":10,"sooner":10},"UNBLOCKED|LB_ON_THE_EDGE|OLB":{"etaHistogram":{"1.9":88},"later":0,"meanEta":1.9,"meanToday":2,"n":88,"sooner":88},"UNBLOCKED|LB_WALKED_UP|MLB":{"etaHistogram":{"1.6":932,"1.7":340,"1.9":10},"later":1282,"meanEta":1.629,"meanToday":1.5,"n":1282,"sooner":0},"UNBLOCKED|SLOT_CORNER|CB":{"etaHistogram":{"2.3":26},"later":0,"meanEta":2.3,"meanToday":2.5,"n":26,"sooner":26}}},"wait":{"rows":{"DOWN_LINEMAN":3947,"TODAY":4533,"TOUCHED":4662},"table":{"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DE":{"etaHistogram":{"1.7":440,"1.9":230},"later":670,"meanEta":1.769,"meanToday":1.5,"n":670,"sooner":0},"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DT":{"etaHistogram":{"1.4":4,"1.7":24,"1.9":14},"later":42,"meanEta":1.738,"meanToday":1.429,"n":42,"sooner":0},"PICKUP_LOST/BLOWN_UP|TODAY|CB":{"etaHistogram":{"2.5":676},"later":0,"meanEta":2.5,"meanToday":2.5,"n":676,"sooner":0},"PICKUP_LOST/BLOWN_UP|TODAY|MLB":{"etaHistogram":{"1.5":1137},"later":0,"meanEta":1.5,"meanToday":1.5,"n":1137,"sooner":0},"PICKUP_LOST/BLOWN_UP|TODAY|OLB":{"etaHistogram":{"1.5":1269,"2.0":17},"later":0,"meanEta":1.507,"meanToday":1.507,"n":1286,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|CB":{"etaHistogram":{"3.0":344},"later":0,"meanEta":3,"meanToday":3,"n":344,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DE":{"etaHistogram":{"1.5":1,"2.0":393},"later":0,"meanEta":1.999,"meanToday":1.999,"n":394,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DT":{"etaHistogram":{"1.5":2,"2.0":14},"later":0,"meanEta":1.938,"meanToday":1.938,"n":16,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|MLB":{"etaHistogram":{"2.0":628},"later":0,"meanEta":2,"meanToday":2,"n":628,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|OLB":{"etaHistogram":{"2.0":698,"2.5":10},"later":0,"meanEta":2.007,"meanToday":2.007,"n":708,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DE":{"etaHistogram":{"2.5":2012},"later":0,"meanEta":2.5,"meanToday":2.5,"n":2012,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DT":{"etaHistogram":{"2.5":560},"later":0,"meanEta":2.5,"meanToday":2.5,"n":560,"sooner":0},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DE":{"etaHistogram":{"2.0":1631,"2.2":485},"later":485,"meanEta":2.046,"meanToday":2,"n":2116,"sooner":0},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DT":{"etaHistogram":{"1.7":736,"1.9":203},"later":0,"meanEta":1.743,"meanToday":2,"n":939,"sooner":939},"UNBLOCKED|DOWN_LINEMAN|DE":{"etaHistogram":{"1.7":180},"later":180,"meanEta":1.7,"meanToday":1.5,"n":180,"sooner":0},"UNBLOCKED|TODAY|CB":{"etaHistogram":{"2.5":26},"later":0,"meanEta":2.5,"meanToday":2.5,"n":26,"sooner":0},"UNBLOCKED|TODAY|MLB":{"etaHistogram":{"1.5":1310},"later":0,"meanEta":1.5,"meanToday":1.5,"n":1310,"sooner":0},"UNBLOCKED|TODAY|OLB":{"etaHistogram":{"2.0":98},"later":0,"meanEta":2,"meanToday":2,"n":98,"sooner":0}}}},
"gen":{"answer":"WAIT (question 19); Table now and its Mug arm are information only","keyDisagreements":{"dlVsDepthLine":0,"dlVsDepthLineByPosition":{},"dlVsPersonnel":0,"dlVsPersonnelByPosition":{},"runners":7366},"publishedMismatches":0,"runners":7366,"tableNow":{"rows":{"DOWN_LINEMAN":2099,"LB_DISGUISED":878,"LB_ON_THE_EDGE":58,"LB_WALKED_UP":1284,"SLOT_CORNER":344,"TOUCHED":2703},"table":{"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DE":{"etaHistogram":{"1.6":20,"1.7":206,"1.8":21,"1.9":97,"2.0":22},"later":366,"meanEta":1.771,"meanToday":1.5,"n":366,"sooner":0},"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DT":{"etaHistogram":{"1.5":2,"1.7":2,"1.8":10,"2.0":4},"later":18,"meanEta":1.8,"meanToday":1.444,"n":18,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_DISGUISED|MLB":{"etaHistogram":{"1.8":111,"1.9":166,"2.0":24,"2.1":72},"later":373,"meanEta":1.915,"meanToday":1.5,"n":373,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_DISGUISED|OLB":{"etaHistogram":{"1.8":109,"1.9":216,"2.0":34,"2.1":125},"later":484,"meanEta":1.936,"meanToday":1.5,"n":484,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_ON_THE_EDGE|OLB":{"etaHistogram":{"1.8":2,"1.9":4,"2.0":2},"later":0,"meanEta":1.9,"meanToday":2,"n":8,"sooner":6},"PICKUP_LOST/BLOWN_UP|LB_WALKED_UP|MLB":{"etaHistogram":{"1.6":117,"1.7":16,"1.8":68,"1.9":35},"later":236,"meanEta":1.709,"meanToday":1.5,"n":236,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_WALKED_UP|OLB":{"etaHistogram":{"1.6":210,"1.7":33,"1.8":52,"1.9":49},"later":344,"meanEta":1.683,"meanToday":1.5,"n":344,"sooner":0},"PICKUP_LOST/BLOWN_UP|SLOT_CORNER|CB":{"etaHistogram":{"2.1":5,"2.2":172,"2.3":11,"2.4":85,"2.7":38,"2.8":3,"2.9":11,"3.0":2},"later":54,"meanEta":2.346,"meanToday":2.5,"n":327,"sooner":273},"PICKUP_LOST/RAN_THROUGH|TOUCHED|CB":{"etaHistogram":{"3.0":179},"later":0,"meanEta":3,"meanToday":3,"n":179,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DE":{"etaHistogram":{"1.5":1,"2.0":219},"later":0,"meanEta":1.998,"meanToday":1.998,"n":220,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DT":{"etaHistogram":{"1.5":4,"2.0":8},"later":0,"meanEta":1.833,"meanToday":1.833,"n":12,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|MLB":{"etaHistogram":{"2.0":363},"later":0,"meanEta":2,"meanToday":2,"n":363,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|OLB":{"etaHistogram":{"2.0":393,"2.5":4},"later":0,"meanEta":2.005,"meanToday":2.005,"n":397,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DE":{"etaHistogram":{"2.5":1202},"later":0,"meanEta":2.5,"meanToday":2.5,"n":1202,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DT":{"etaHistogram":{"2.5":330},"later":0,"meanEta":2.5,"meanToday":2.5,"n":330,"sooner":0},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DE":{"etaHistogram":{"1.9":449,"2.0":393,"2.1":55,"2.2":188,"2.3":1},"later":244,"meanEta":1.999,"meanToday":2,"n":1086,"sooner":449},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DT":{"etaHistogram":{"1.7":170,"1.8":247,"1.9":5,"2.0":115,"2.1":6},"later":6,"meanEta":1.815,"meanToday":2,"n":543,"sooner":422},"UNBLOCKED|DOWN_LINEMAN|DE":{"etaHistogram":{"1.6":2,"1.7":79,"1.8":5},"later":86,"meanEta":1.703,"meanToday":1.5,"n":86,"sooner":0},"UNBLOCKED|LB_DISGUISED|MLB":{"etaHistogram":{"1.8":10,"1.9":11},"later":21,"meanEta":1.852,"meanToday":1.5,"n":21,"sooner":0},"UNBLOCKED|LB_ON_THE_EDGE|OLB":{"etaHistogram":{"1.8":23,"1.9":27},"later":0,"meanEta":1.854,"meanToday":2,"n":50,"sooner":50},"UNBLOCKED|LB_WALKED_UP|MLB":{"etaHistogram":{"1.6":628,"1.7":68,"1.8":5,"1.9":3},"later":704,"meanEta":1.612,"meanToday":1.5,"n":704,"sooner":0},"UNBLOCKED|SLOT_CORNER|CB":{"etaHistogram":{"2.2":16,"2.3":1},"later":0,"meanEta":2.206,"meanToday":2.5,"n":17,"sooner":17}}},"tableNowMug":{"rows":{"DOWN_LINEMAN":2099,"LB_DISGUISED":789,"LB_MUG":98,"LB_ON_THE_EDGE":50,"LB_WALKED_UP":1283,"SLOT_CORNER":344,"TOUCHED":2703},"table":{"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DE":{"etaHistogram":{"1.6":20,"1.7":206,"1.8":21,"1.9":97,"2.0":22},"later":366,"meanEta":1.771,"meanToday":1.5,"n":366,"sooner":0},"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DT":{"etaHistogram":{"1.5":2,"1.7":2,"1.8":10,"2.0":4},"later":18,"meanEta":1.8,"meanToday":1.444,"n":18,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_DISGUISED|MLB":{"etaHistogram":{"1.8":94,"1.9":148,"2.0":23,"2.1":67},"later":332,"meanEta":1.919,"meanToday":1.5,"n":332,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_DISGUISED|OLB":{"etaHistogram":{"1.8":101,"1.9":189,"2.0":33,"2.1":114},"later":437,"meanEta":1.937,"meanToday":1.5,"n":437,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_MUG|MLB":{"etaHistogram":{"1.4":3,"1.5":32,"1.7":6},"later":6,"meanEta":1.522,"meanToday":1.5,"n":41,"sooner":3},"PICKUP_LOST/BLOWN_UP|LB_MUG|OLB":{"etaHistogram":{"1.4":2,"1.5":34,"1.7":10,"1.8":3},"later":12,"meanEta":1.555,"meanToday":1.51,"n":49,"sooner":3},"PICKUP_LOST/BLOWN_UP|LB_ON_THE_EDGE|OLB":{"etaHistogram":{"1.8":2,"1.9":3,"2.0":2},"later":0,"meanEta":1.9,"meanToday":2,"n":7,"sooner":5},"PICKUP_LOST/BLOWN_UP|LB_WALKED_UP|MLB":{"etaHistogram":{"1.6":117,"1.7":16,"1.8":68,"1.9":35},"later":236,"meanEta":1.709,"meanToday":1.5,"n":236,"sooner":0},"PICKUP_LOST/BLOWN_UP|LB_WALKED_UP|OLB":{"etaHistogram":{"1.6":210,"1.7":32,"1.8":52,"1.9":49},"later":343,"meanEta":1.683,"meanToday":1.5,"n":343,"sooner":0},"PICKUP_LOST/BLOWN_UP|SLOT_CORNER|CB":{"etaHistogram":{"2.1":5,"2.2":172,"2.3":11,"2.4":85,"2.7":38,"2.8":3,"2.9":11,"3.0":2},"later":54,"meanEta":2.346,"meanToday":2.5,"n":327,"sooner":273},"PICKUP_LOST/RAN_THROUGH|TOUCHED|CB":{"etaHistogram":{"3.0":179},"later":0,"meanEta":3,"meanToday":3,"n":179,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DE":{"etaHistogram":{"1.5":1,"2.0":219},"later":0,"meanEta":1.998,"meanToday":1.998,"n":220,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DT":{"etaHistogram":{"1.5":4,"2.0":8},"later":0,"meanEta":1.833,"meanToday":1.833,"n":12,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|MLB":{"etaHistogram":{"2.0":363},"later":0,"meanEta":2,"meanToday":2,"n":363,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|OLB":{"etaHistogram":{"2.0":393,"2.5":4},"later":0,"meanEta":2.005,"meanToday":2.005,"n":397,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DE":{"etaHistogram":{"2.5":1202},"later":0,"meanEta":2.5,"meanToday":2.5,"n":1202,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DT":{"etaHistogram":{"2.5":330},"later":0,"meanEta":2.5,"meanToday":2.5,"n":330,"sooner":0},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DE":{"etaHistogram":{"1.9":449,"2.0":393,"2.1":55,"2.2":188,"2.3":1},"later":244,"meanEta":1.999,"meanToday":2,"n":1086,"sooner":449},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DT":{"etaHistogram":{"1.7":170,"1.8":247,"1.9":5,"2.0":115,"2.1":6},"later":6,"meanEta":1.815,"meanToday":2,"n":543,"sooner":422},"UNBLOCKED|DOWN_LINEMAN|DE":{"etaHistogram":{"1.6":2,"1.7":79,"1.8":5},"later":86,"meanEta":1.703,"meanToday":1.5,"n":86,"sooner":0},"UNBLOCKED|LB_DISGUISED|MLB":{"etaHistogram":{"1.8":10,"1.9":10},"later":20,"meanEta":1.85,"meanToday":1.5,"n":20,"sooner":0},"UNBLOCKED|LB_MUG|MLB":{"etaHistogram":{"1.5":1},"later":0,"meanEta":1.5,"meanToday":1.5,"n":1,"sooner":0},"UNBLOCKED|LB_MUG|OLB":{"etaHistogram":{"1.7":2,"1.8":5},"later":0,"meanEta":1.771,"meanToday":2,"n":7,"sooner":7},"UNBLOCKED|LB_ON_THE_EDGE|OLB":{"etaHistogram":{"1.8":20,"1.9":23},"later":0,"meanEta":1.853,"meanToday":2,"n":43,"sooner":43},"UNBLOCKED|LB_WALKED_UP|MLB":{"etaHistogram":{"1.6":628,"1.7":68,"1.8":5,"1.9":3},"later":704,"meanEta":1.612,"meanToday":1.5,"n":704,"sooner":0},"UNBLOCKED|SLOT_CORNER|CB":{"etaHistogram":{"2.2":16,"2.3":1},"later":0,"meanEta":2.206,"meanToday":2.5,"n":17,"sooner":17}}},"wait":{"rows":{"DOWN_LINEMAN":2099,"TODAY":2564,"TOUCHED":2703},"table":{"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DE":{"etaHistogram":{"1.6":20,"1.7":206,"1.8":21,"1.9":97,"2.0":22},"later":366,"meanEta":1.771,"meanToday":1.5,"n":366,"sooner":0},"PICKUP_LOST/BLOWN_UP|DOWN_LINEMAN|DT":{"etaHistogram":{"1.5":2,"1.7":2,"1.8":10,"2.0":4},"later":18,"meanEta":1.8,"meanToday":1.444,"n":18,"sooner":0},"PICKUP_LOST/BLOWN_UP|TODAY|CB":{"etaHistogram":{"2.5":327},"later":0,"meanEta":2.5,"meanToday":2.5,"n":327,"sooner":0},"PICKUP_LOST/BLOWN_UP|TODAY|MLB":{"etaHistogram":{"1.5":609},"later":0,"meanEta":1.5,"meanToday":1.5,"n":609,"sooner":0},"PICKUP_LOST/BLOWN_UP|TODAY|OLB":{"etaHistogram":{"1.5":828,"2.0":8},"later":0,"meanEta":1.505,"meanToday":1.505,"n":836,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|CB":{"etaHistogram":{"3.0":179},"later":0,"meanEta":3,"meanToday":3,"n":179,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DE":{"etaHistogram":{"1.5":1,"2.0":219},"later":0,"meanEta":1.998,"meanToday":1.998,"n":220,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|DT":{"etaHistogram":{"1.5":4,"2.0":8},"later":0,"meanEta":1.833,"meanToday":1.833,"n":12,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|MLB":{"etaHistogram":{"2.0":363},"later":0,"meanEta":2,"meanToday":2,"n":363,"sooner":0},"PICKUP_LOST/RAN_THROUGH|TOUCHED|OLB":{"etaHistogram":{"2.0":393,"2.5":4},"later":0,"meanEta":2.005,"meanToday":2.005,"n":397,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DE":{"etaHistogram":{"2.5":1202},"later":0,"meanEta":2.5,"meanToday":2.5,"n":1202,"sooner":0},"STUNT_LOOPER/LATE_EXCHANGE|TOUCHED|DT":{"etaHistogram":{"2.5":330},"later":0,"meanEta":2.5,"meanToday":2.5,"n":330,"sooner":0},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DE":{"etaHistogram":{"1.9":449,"2.0":393,"2.1":55,"2.2":188,"2.3":1},"later":244,"meanEta":1.999,"meanToday":2,"n":1086,"sooner":449},"STUNT_LOOPER/LOOPER_FREE|DOWN_LINEMAN|DT":{"etaHistogram":{"1.7":170,"1.8":247,"1.9":5,"2.0":115,"2.1":6},"later":6,"meanEta":1.815,"meanToday":2,"n":543,"sooner":422},"UNBLOCKED|DOWN_LINEMAN|DE":{"etaHistogram":{"1.6":2,"1.7":79,"1.8":5},"later":86,"meanEta":1.703,"meanToday":1.5,"n":86,"sooner":0},"UNBLOCKED|TODAY|CB":{"etaHistogram":{"2.5":17},"later":0,"meanEta":2.5,"meanToday":2.5,"n":17,"sooner":0},"UNBLOCKED|TODAY|MLB":{"etaHistogram":{"1.5":725},"later":0,"meanEta":1.5,"meanToday":1.5,"n":725,"sooner":0},"UNBLOCKED|TODAY|OLB":{"etaHistogram":{"2.0":50},"later":0,"meanEta":2,"meanToday":2,"n":50,"sooner":0}}}}}
```

- part 1 is read on every pocket-1.s3 arm, each against its own picture; an arm that holds an input reads AM-2's filed reference for it and nothing else (C3, C4, C5)
- the monotone clauses are graded on C1 and C2 (AM-2 `monotone`) and computed on every arm; Speed alone is reported by count and size
- the literal count of D19's men earlier than the filed Wait table (M8's WAIT answer; the later and the same beside) is printed, never graded: its differences are the table's rounding, slot corners, edge backers, creepers and carriers (AM-2 `timingAgainstAtStep3`)

## M5 on C1: the mirror, each row's z on its difference SE, and the exact free-run mirror

- flat escape_caught_rate: set 1 0.1878 -> 0.2015 (difference +0.0138, SE 0.0119, z +1.15, within the noise); set 2 0.2052 -> 0.2030 (difference -0.0022, SE 0.0117, z -0.19, within the noise); tolerance 0.0166: holds on every set
- flat escape_rate: set 1 0.0433 -> 0.0440 (difference +0.0007, SE 0.0012, z +0.59, within the noise); set 2 0.0430 -> 0.0443 (difference +0.0012, SE 0.0014, z +0.92, within the noise); tolerance 0.0019: holds on every set
- flat no_side_entry_share: set 1 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); set 2 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); tolerance 0.0000: holds on every set
- flat no_side_card_share: set 1 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); set 2 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); tolerance 0.0000: holds on every set
- flat all_no_side_card_share: set 1 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); set 2 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); tolerance 0.0000: holds on every set
- flat looper_moved_share: set 1 0.2160 -> 0.2173 (difference +0.0013, SE 0.0043, z +0.32, within the noise); set 2 0.2164 -> 0.2190 (difference +0.0025, SE 0.0041, z +0.62, within the noise); tolerance 0.0058: holds on every set
- flat the exact free-run mirror, set 1: 13570 plays paired, 2564 men compared, 0 differ, 9 on the clock in one game of a pair only: EXACT
- flat the exact free-run mirror, set 2: 13697 plays paired, 2559 men compared, 0 differ, 15 on the clock in one game of a pair only: EXACT
- gen escape_caught_rate: set 1 0.1974 -> 0.2124 (difference +0.0150, SE 0.0224, z +0.67, within the noise); set 2 0.2388 -> 0.2506 (difference +0.0118, SE 0.0317, z +0.37, within the noise); tolerance 0.0441: holds on every set
- gen escape_rate: set 1 0.0216 -> 0.0200 (difference -0.0016, SE 0.0015, z -1.01, within the noise); set 2 0.0142 -> 0.0137 (difference -0.0005, SE 0.0011, z -0.44, within the noise); tolerance 0.0022: holds on every set
- gen no_side_entry_share: set 1 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); set 2 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); tolerance 0.0000: holds on every set
- gen no_side_card_share: set 1 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); set 2 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); tolerance 0.0000: holds on every set
- gen all_no_side_card_share: set 1 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); set 2 0.0000 -> 0.0000 (difference +0.0000, SE 0.0000, z n/a, within the noise); tolerance 0.0000: holds on every set
- gen looper_moved_share: set 1 0.2219 -> 0.2158 (difference -0.0060, SE 0.0057, z -1.07, within the noise); set 2 0.2191 -> 0.2181 (difference -0.0010, SE 0.0057, z -0.18, within the noise); tolerance 0.0084: holds on every set
- gen the exact free-run mirror, set 1: 8260 plays paired, 1532 men compared, 0 differ, 6 on the clock in one game of a pair only: EXACT
- gen the exact free-run mirror, set 2: 8417 plays paired, 1609 men compared, 0 differ, 7 on the clock in one game of a pair only: EXACT

## The miss rule on C1 and C2 (ADR-089 §6.10, D31; AM-2's free-runner key)

Each reading classes the arm's covered rows on one league and seed set. "Free runner" in n, f, the quick split and the quick share's origin is a man on the free-run clock under the arm's own reading (AM-2); the origin-keyed figures are printed beside, and p beside the supply threshold, which assumes p = 1 (critique 4 S4-6). The bin's supply reason is named only when s3.bin20.tick missed. The timing trigger at step 3 is part 1's function on the published picture; the literal count against the filed Wait table is printed beside. Nothing here is automatic: the class and the options go to the owner.

- C1, flat, set 1: s3.bin20.tick 15.57 passes; s3.quick 88.91 MISSES; s3.unblockedPressures 15.67 MISSES; s3.unblockedShare 75.71 MISSES; quick share 88.91 %; by the arm's reading: n 9.68 %, f 6.53 %, p(pressured given a free runner on a 2.0 s throw) 100.00 %, the quick split 68.74 %, the quick share by cause CLOCK_RUNNER 100.00 %, COUNTER 71.90 %, FREE_RUNNER 45.99 %, WON_REP 74.31 %; origin-keyed, beside: n 8.08 %, f 13.06 %, p(pressured given a free runner on a 2.0 s throw) 65.46 %, the quick split 74.29 %, the quick share by cause COUNTER 71.90 %, FREE_RUNNER 95.38 %, WON_REP 74.31 %; part 1's men earlier than the function 0; the literal Wait count 2459 of 9643 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1892, TODAY 567); later 5176, same 2008
  - s3.quick: TIMING (the quick-pressure share fails with no free runner (68.74))
  - s3.unblockedPressures: SUPPLY (completely unblocked pressures 15.67 per 100 dropbacks, above 14)
  - s3.unblockedShare: SUPPLY (their share of hit-or-sack 75.71 in 100, above 40)
- C1, flat, set 2: s3.bin20.tick 15.50 passes; s3.quick 88.42 MISSES; s3.unblockedPressures 15.87 MISSES; s3.unblockedShare 76.49 MISSES; quick share 88.42 %; by the arm's reading: n 9.31 %, f 6.83 %, p(pressured given a free runner on a 2.0 s throw) 100.00 %, the quick split 67.07 %, the quick share by cause CLOCK_RUNNER 100.00 %, COUNTER 69.67 %, FREE_RUNNER 45.84 %, WON_REP 72.70 %; origin-keyed, beside: n 7.80 %, f 13.08 %, p(pressured given a free runner on a 2.0 s throw) 66.67 %, the quick split 72.66 %, the quick share by cause COUNTER 69.67 %, FREE_RUNNER 95.34 %, WON_REP 72.70 %; part 1's men earlier than the function 0; the literal Wait count 2561 of 9809 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1939, TODAY 622); later 5248, same 2000
  - s3.quick: TIMING (the quick-pressure share fails with no free runner (67.07))
  - s3.unblockedPressures: SUPPLY (completely unblocked pressures 15.87 per 100 dropbacks, above 14)
  - s3.unblockedShare: SUPPLY (their share of hit-or-sack 76.49 in 100, above 40)
- C1, gen, set 1: s3.bin20.tick 18.98 passes; s3.quick 83.14 MISSES; s3.unblockedPressures 15.25 MISSES; s3.unblockedShare 69.78 MISSES; quick share 83.14 %; by the arm's reading: n 11.61 %, f 8.34 %, p(pressured given a free runner on a 2.0 s throw) 100.00 %, the quick split 59.21 %, the quick share by cause CLOCK_RUNNER 100.00 %, COUNTER 62.40 %, FREE_RUNNER 39.79 %, WON_REP 64.23 %; origin-keyed, beside: n 9.93 %, f 14.35 %, p(pressured given a free runner on a 2.0 s throw) 73.06 %, the quick split 63.73 %, the quick share by cause COUNTER 62.40 %, FREE_RUNNER 93.46 %, WON_REP 64.23 %; part 1's men earlier than the function 0; the literal Wait count 828 of 5237 D19 men earlier than the filed Wait table (TODAY 405, DOWN_LINEMAN 423); later 2667, same 1742
  - s3.quick: TIMING (the quick-pressure share fails with no free runner (59.21))
  - s3.unblockedPressures: SUPPLY (completely unblocked pressures 15.25 per 100 dropbacks, above 14)
  - s3.unblockedShare: SUPPLY (their share of hit-or-sack 69.78 in 100, above 40)
- C1, gen, set 2: s3.bin20.tick 20.28 passes; s3.quick 80.73 MISSES; s3.unblockedPressures 15.92 MISSES; s3.unblockedShare 72.19 MISSES; quick share 80.73 %; by the arm's reading: n 11.86 %, f 9.56 %, p(pressured given a free runner on a 2.0 s throw) 100.00 %, the quick split 54.47 %, the quick share by cause CLOCK_RUNNER 100.00 %, COUNTER 58.38 %, FREE_RUNNER 37.96 %, WON_REP 59.12 %; origin-keyed, beside: n 10.00 %, f 15.99 %, p(pressured given a free runner on a 2.0 s throw) 74.31 %, the quick split 58.94 %, the quick share by cause COUNTER 58.38 %, FREE_RUNNER 92.72 %, WON_REP 59.12 %; part 1's men earlier than the function 0; the literal Wait count 852 of 5418 D19 men earlier than the filed Wait table (DOWN_LINEMAN 420, TODAY 432); later 2732, same 1834
  - s3.quick: SUPPLY (the quick-pressure share fails (80.73) while it passes with no free runner (54.47))
  - s3.unblockedPressures: SUPPLY (completely unblocked pressures 15.92 per 100 dropbacks, above 14)
  - s3.unblockedShare: SUPPLY (their share of hit-or-sack 72.19 in 100, above 40)
- C2, flat, set 1: s3.bin20.tick 41.68 MISSES; s3.quick 61.84 MISSES; s3.unblockedPressures 18.90 MISSES; s3.unblockedShare 74.20 MISSES; quick share 61.84 %; by the arm's reading: n 24.96 %, f 22.29 %, p(pressured given a free runner on a 2.0 s throw) 100.00 %, the quick split 34.91 %, the quick share by cause CLOCK_RUNNER 100.00 %, COUNTER 37.13 %, FREE_RUNNER 25.19 %, WON_REP 37.87 %; origin-keyed, beside: n 22.00 %, f 29.39 %, p(pressured given a free runner on a 2.0 s throw) 88.97 %, the quick split 37.24 %, the quick share by cause COUNTER 37.13 %, FREE_RUNNER 84.66 %, WON_REP 37.87 %; part 1's men earlier than the function 0; the literal Wait count 2391 of 9215 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1834, TODAY 557); later 4921, same 1903
  - s3.bin20.tick: SUPPLY (the 2.0 s bin passes without a free runner (n 24.96 <= L 29.4), but free runners are on 22.29 of the 2.0 s throws, above (L - n)/(100 - n) = 5.92)
  - s3.quick: SUPPLY (the quick-pressure share fails (61.84) while it passes with no free runner (34.91))
  - s3.unblockedPressures: SUPPLY (completely unblocked pressures 18.9 per 100 dropbacks, above 14)
  - s3.unblockedShare: SUPPLY (their share of hit-or-sack 74.2 in 100, above 40)
- C2, flat, set 2: s3.bin20.tick 41.05 MISSES; s3.quick 62.40 MISSES; s3.unblockedPressures 19.25 MISSES; s3.unblockedShare 73.69 MISSES; quick share 62.40 %; by the arm's reading: n 24.57 %, f 21.85 %, p(pressured given a free runner on a 2.0 s throw) 100.00 %, the quick split 34.98 %, the quick share by cause CLOCK_RUNNER 100.00 %, COUNTER 35.44 %, FREE_RUNNER 24.77 %, WON_REP 38.19 %; origin-keyed, beside: n 21.48 %, f 29.22 %, p(pressured given a free runner on a 2.0 s throw) 88.45 %, the quick split 37.48 %, the quick share by cause COUNTER 35.44 %, FREE_RUNNER 85.42 %, WON_REP 38.19 %; part 1's men earlier than the function 0; the literal Wait count 2418 of 9416 D19 men earlier than the filed Wait table (DOWN_LINEMAN 1811, TODAY 607); later 5031, same 1967
  - s3.bin20.tick: SUPPLY (the 2.0 s bin passes without a free runner (n 24.57 <= L 29.4), but free runners are on 21.85 of the 2.0 s throws, above (L - n)/(100 - n) = 6.41)
  - s3.quick: SUPPLY (the quick-pressure share fails (62.4) while it passes with no free runner (34.98))
  - s3.unblockedPressures: SUPPLY (completely unblocked pressures 19.25 per 100 dropbacks, above 14)
  - s3.unblockedShare: SUPPLY (their share of hit-or-sack 73.69 in 100, above 40)
- C2, gen, set 1: s3.bin20.tick 46.71 MISSES; s3.quick 60.73 MISSES; s3.unblockedPressures 18.21 MISSES; s3.unblockedShare 71.16 MISSES; quick share 60.73 %; by the arm's reading: n 27.53 %, f 26.47 %, p(pressured given a free runner on a 2.0 s throw) 100.00 %, the quick split 34.44 %, the quick share by cause CLOCK_RUNNER 100.00 %, COUNTER 34.24 %, FREE_RUNNER 23.34 %, WON_REP 37.81 %; origin-keyed, beside: n 24.49 %, f 33.57 %, p(pressured given a free runner on a 2.0 s throw) 90.69 %, the quick split 36.80 %, the quick share by cause COUNTER 34.24 %, FREE_RUNNER 84.15 %, WON_REP 37.81 %; part 1's men earlier than the function 0; the literal Wait count 810 of 4927 D19 men earlier than the filed Wait table (DOWN_LINEMAN 405, TODAY 405); later 2489, same 1628
  - s3.bin20.tick: SUPPLY (the 2.0 s bin passes without a free runner (n 27.53 <= L 29.4), but free runners are on 26.47 of the 2.0 s throws, above (L - n)/(100 - n) = 2.58)
  - s3.quick: SUPPLY (the quick-pressure share fails (60.73) while it passes with no free runner (34.44))
  - s3.unblockedPressures: SUPPLY (completely unblocked pressures 18.21 per 100 dropbacks, above 14)
  - s3.unblockedShare: SUPPLY (their share of hit-or-sack 71.16 in 100, above 40)
- C2, gen, set 2: s3.bin20.tick 48.31 MISSES; s3.quick 60.18 MISSES; s3.unblockedPressures 19.06 MISSES; s3.unblockedShare 71.08 MISSES; quick share 60.18 %; by the arm's reading: n 26.53 %, f 29.65 %, p(pressured given a free runner on a 2.0 s throw) 100.00 %, the quick split 32.95 %, the quick share by cause CLOCK_RUNNER 100.00 %, COUNTER 31.43 %, FREE_RUNNER 22.37 %, WON_REP 36.41 %; origin-keyed, beside: n 23.77 %, f 36.46 %, p(pressured given a free runner on a 2.0 s throw) 91.10 %, the quick split 35.13 %, the quick share by cause COUNTER 31.43 %, FREE_RUNNER 84.25 %, WON_REP 36.41 %; part 1's men earlier than the function 0; the literal Wait count 826 of 5156 D19 men earlier than the filed Wait table (TODAY 434, DOWN_LINEMAN 392); later 2565, same 1765
  - s3.bin20.tick: SUPPLY (the 2.0 s bin passes without a free runner (n 26.53 <= L 29.4), but free runners are on 29.65 of the 2.0 s throws, above (L - n)/(100 - n) = 3.91)
  - s3.quick: SUPPLY (the quick-pressure share fails (60.18) while it passes with no free runner (32.95))
  - s3.unblockedPressures: SUPPLY (completely unblocked pressures 19.06 per 100 dropbacks, above 14)
  - s3.unblockedShare: SUPPLY (their share of hit-or-sack 71.08 in 100, above 40)
- the sets differ: C1 gen: set 1 missed s3.quick, s3.unblockedPressures, s3.unblockedShare; classed SUPPLY, TIMING; set 2 missed s3.quick, s3.unblockedPressures, s3.unblockedShare; classed SUPPLY (both named; critique 4 S4-8)

### The options, each priced on both seed sets and both leagues (brought to the owner, never applied here)

- option A: A protection design: fewer blown pickups and missed stunt exchanges, first as an information arm, then as its own design with its own petitions. Priced by C15 (the readers' supply-cut stand-in, a band-edge shift, information; built later as its own design with its own petitions).
  - flat, set 1, s3.bin20.tick: 11.77 against C1's 15.57 (-3.81)
  - flat, set 1, s3.quick: 81.83 against C1's 88.91 (-7.09)
  - flat, set 1, s3.unblockedPressures: 5.92 against C1's 15.67 (-9.75) by D19's band test as filed; on the clock under each arm's own reading 5.94 against C1's 15.71 (-9.77)
  - flat, set 1, s3.unblockedShare: 46.76 against C1's 75.71 (-28.95) by D19's band test as filed; on the clock under each arm's own reading 46.76 against C1's 75.82 (-29.06)
  - flat, set 2, s3.bin20.tick: 12.01 against C1's 15.50 (-3.49)
  - flat, set 2, s3.quick: 82.19 against C1's 88.42 (-6.23)
  - flat, set 2, s3.unblockedPressures: 6.07 against C1's 15.87 (-9.80) by D19's band test as filed; on the clock under each arm's own reading 6.09 against C1's 15.91 (-9.82)
  - flat, set 2, s3.unblockedShare: 47.98 against C1's 76.49 (-28.51) by D19's band test as filed; on the clock under each arm's own reading 48.21 against C1's 76.78 (-28.57)
  - gen, set 1, s3.bin20.tick: 13.94 against C1's 18.98 (-5.05)
  - gen, set 1, s3.quick: 74.98 against C1's 83.14 (-8.16)
  - gen, set 1, s3.unblockedPressures: 5.70 against C1's 15.25 (-9.56) by D19's band test as filed; on the clock under each arm's own reading 5.71 against C1's 15.27 (-9.57)
  - gen, set 1, s3.unblockedShare: 41.93 against C1's 69.78 (-27.85) by D19's band test as filed; on the clock under each arm's own reading 41.93 against C1's 69.78 (-27.85)
  - gen, set 2, s3.bin20.tick: 15.44 against C1's 20.28 (-4.84)
  - gen, set 2, s3.quick: 72.58 against C1's 80.73 (-8.15)
  - gen, set 2, s3.unblockedPressures: 5.99 against C1's 15.92 (-9.93) by D19's band test as filed; on the clock under each arm's own reading 6.02 against C1's 15.94 (-9.93)
  - gen, set 2, s3.unblockedShare: 41.39 against C1's 72.19 (-30.81) by D19's band test as filed; on the clock under each arm's own reading 41.39 against C1's 72.19 (-30.81)
- option B: Accept and report: the row is recorded in the ledger as a named, accepted miss and the build goes on; acceptance has not passed while it stands, unless the owner rules by name that it passes. Priced by nothing to play: the miss stays named in the ledger.
- option C: The owner revisits who counts as 'completely unblocked' (D19, reading (b), against reading (c)); reading (a) is never offered. Priced by C11 (reading (c)); the unblocked rows as filed read D19's band test, so they show the engine change alone, and beside them the same rows on the clock under C11's own reading show the change in who counts (review MEAS-S4).
  - flat, set 1, s3.bin20.tick: 22.89 against C1's 15.57 (+7.31)
  - flat, set 1, s3.quick: 93.60 against C1's 88.91 (+4.68)
  - flat, set 1, s3.unblockedPressures: 15.80 against C1's 15.67 (+0.14) by D19's band test as filed; on the clock under each arm's own reading 22.14 against C1's 15.71 (+6.43)
  - flat, set 1, s3.unblockedShare: 72.32 against C1's 75.71 (-3.39) by D19's band test as filed; on the clock under each arm's own reading 78.90 against C1's 75.82 (+3.08)
  - flat, set 2, s3.bin20.tick: 23.01 against C1's 15.50 (+7.51)
  - flat, set 2, s3.quick: 93.48 against C1's 88.42 (+5.06)
  - flat, set 2, s3.unblockedPressures: 16.07 against C1's 15.87 (+0.20) by D19's band test as filed; on the clock under each arm's own reading 22.41 against C1's 15.91 (+6.50)
  - flat, set 2, s3.unblockedShare: 72.94 against C1's 76.49 (-3.56) by D19's band test as filed; on the clock under each arm's own reading 79.76 against C1's 76.78 (+2.98)
  - gen, set 1, s3.bin20.tick: 26.76 against C1's 18.98 (+7.77)
  - gen, set 1, s3.quick: 89.57 against C1's 83.14 (+6.43)
  - gen, set 1, s3.unblockedPressures: 15.28 against C1's 15.25 (+0.02) by D19's band test as filed; on the clock under each arm's own reading 22.17 against C1's 15.27 (+6.90)
  - gen, set 1, s3.unblockedShare: 67.77 against C1's 69.78 (-2.01) by D19's band test as filed; on the clock under each arm's own reading 72.05 against C1's 69.78 (+2.28)
  - gen, set 2, s3.bin20.tick: 29.28 against C1's 20.28 (+9.00)
  - gen, set 2, s3.quick: 87.95 against C1's 80.73 (+7.22)
  - gen, set 2, s3.unblockedPressures: 16.09 against C1's 15.92 (+0.16) by D19's band test as filed; on the clock under each arm's own reading 23.56 against C1's 15.94 (+7.62)
  - gen, set 2, s3.unblockedShare: 70.19 against C1's 72.19 (-2.00) by D19's band test as filed; on the clock under each arm's own reading 75.07 against C1's 72.19 (+2.87)
- never offered: C12, reading (a): never offered (AM-2; ADR-089 §6.10)
- never offered: C13, the uniform delay (revision 1's LATE patch): never offered for a man nobody touched (AM-2)
- never offered: a late block, a uniform delay or a refit of the free-run constants for a man nobody touched; ADR-090's tables, t_e, w, the references and the creeper's speed (AM-2)

## The stand-in expectations, read as C2 minus B6 (critique 4 S4-9; reported, never graded)

The s3.expected levels and s3.hitOrSack are gen-only levels from a B6-like stand-in base: they are read as C2's change over B6 on gen, beside the stand-ins' own change; flat is printed beside as information. C1 has no stand-in counterpart.

- s3.hitOrSack (hit_or_sack_rate), gen, set 1: C2 - B6 -2.17; the stand-ins' own delta -3.3 to -3.7; filed 9.1 to 9.3
- s3.hitOrSack (hit_or_sack_rate), gen, set 2: C2 - B6 -2.35; the stand-ins' own delta -3.3 to -3.7; filed 9.1 to 9.3
- s3.hitOrSack (hit_or_sack_rate), flat, set 1: C2 - B6 -1.07; the stand-ins' own delta -3.3 to -3.7; filed 9.1 to 9.3
- s3.hitOrSack (hit_or_sack_rate), flat, set 2: C2 - B6 -0.91; the stand-ins' own delta -3.3 to -3.7; filed 9.1 to 9.3
- s3.expected.pressure (threat_creation_rate), gen, set 1: C2 - B6 -2.81; the stand-ins' own delta -4.2; filed 39
- s3.expected.pressure (threat_creation_rate), gen, set 2: C2 - B6 -2.54; the stand-ins' own delta -4.2; filed 39
- s3.expected.pressure (threat_creation_rate), flat, set 1: C2 - B6 -2.28; the stand-ins' own delta -4.2; filed 39
- s3.expected.pressure (threat_creation_rate), flat, set 2: C2 - B6 -2.43; the stand-ins' own delta -4.2; filed 39
- s3.expected.sack (sack_rate), gen, set 1: C2 - B6 -2.43; the stand-ins' own delta -2.34; filed 3.55
- s3.expected.sack (sack_rate), gen, set 2: C2 - B6 -3.10; the stand-ins' own delta -2.34; filed 3.55
- s3.expected.sack (sack_rate), flat, set 1: C2 - B6 -1.59; the stand-ins' own delta -2.34; filed 3.55
- s3.expected.sack (sack_rate), flat, set 2: C2 - B6 -1.49; the stand-ins' own delta -2.34; filed 3.55
- s3.expected.bin20 (pressured_share_by_release_bin), gen, set 1: C2 - B6 -3.10; the stand-ins' own delta -6.7; filed 47
- s3.expected.bin20 (pressured_share_by_release_bin), gen, set 2: C2 - B6 -2.25; the stand-ins' own delta -6.7; filed 47
- s3.expected.bin20 (pressured_share_by_release_bin), flat, set 1: C2 - B6 -3.35; the stand-ins' own delta -6.7; filed 47
- s3.expected.bin20 (pressured_share_by_release_bin), flat, set 2: C2 - B6 -5.11; the stand-ins' own delta -6.7; filed 47
- s3.expected.quick (quick_pressure_share_by_origin), gen, set 1: C2 - B6 -10.72; the stand-ins' own delta -11.9; filed 60.3
- s3.expected.quick (quick_pressure_share_by_origin), gen, set 2: C2 - B6 -11.70; the stand-ins' own delta -11.9; filed 60.3
- s3.expected.quick (quick_pressure_share_by_origin), flat, set 1: C2 - B6 -10.97; the stand-ins' own delta -11.9; filed 60.3
- s3.expected.quick (quick_pressure_share_by_origin), flat, set 2: C2 - B6 -11.17; the stand-ins' own delta -11.9; filed 60.3

## The alone arms: each arm's mean first arrival tick against B3, among threats not from a won rep, touched men included; beside it, among men on the free-run clock under the arm's own reading (AM-2's key; B3 by D19) (critique 4 S4-14; information)

- C3 (information, the snap spot alone (AM-2's references hold the others)), flat: 2.030 s against B3's 1.966 s, gap +0.065 s, paired SE 0.002 over 992 games: resolved; on the clock: 1.862 s against B3's 1.770 s, gap +0.092 s, paired SE 0.002 over 992 games: resolved
- C3 (information, the snap spot alone (AM-2's references hold the others)), gen: 2.023 s against B3's 1.959 s, gap +0.064 s, paired SE 0.003 over 544 games: resolved; on the clock: 1.849 s against B3's 1.758 s, gap +0.092 s, paired SE 0.003 over 544 games: resolved
- C4 (information, Speed and Acceleration alone (AM-2's references hold the others)), flat: 1.927 s against B3's 1.966 s, gap -0.039 s, paired SE 0.002 over 992 games: resolved; on the clock: 1.709 s against B3's 1.770 s, gap -0.060 s, paired SE 0.002 over 992 games: resolved
- C4 (information, Speed and Acceleration alone (AM-2's references hold the others)), gen: 1.894 s against B3's 1.959 s, gap -0.065 s, paired SE 0.003 over 544 games: resolved; on the clock: 1.656 s against B3's 1.758 s, gap -0.101 s, paired SE 0.003 over 544 games: resolved
- C5 (information, the drop alone (AM-2's references hold the others)), flat: 1.957 s against B3's 1.966 s, gap -0.009 s, paired SE 0.002 over 992 games: resolved; on the clock: 1.754 s against B3's 1.770 s, gap -0.016 s, paired SE 0.002 over 992 games: resolved
- C5 (information, the drop alone (AM-2's references hold the others)), gen: 1.953 s against B3's 1.959 s, gap -0.007 s, paired SE 0.003 over 544 games: resolved; on the clock: 1.744 s against B3's 1.758 s, gap -0.013 s, paired SE 0.003 over 544 games: resolved
- C7 (information, UNBLOCKED alone), flat: 1.981 s against B3's 1.966 s, gap +0.015 s, paired SE 0.001 over 992 games: resolved; on the clock: 1.681 s against B3's 1.770 s, gap -0.089 s, paired SE 0.003 over 992 games: resolved
- C7 (information, UNBLOCKED alone), gen: 1.973 s against B3's 1.959 s, gap +0.013 s, paired SE 0.002 over 544 games: resolved; on the clock: 1.660 s against B3's 1.758 s, gap -0.097 s, paired SE 0.004 over 544 games: resolved
- C8 (information, BLOWN_UP alone), flat: 2.036 s against B3's 1.966 s, gap +0.070 s, paired SE 0.002 over 992 games: resolved; on the clock: 1.910 s against B3's 1.770 s, gap +0.140 s, paired SE 0.003 over 992 games: resolved
- C8 (information, BLOWN_UP alone), gen: 2.018 s against B3's 1.959 s, gap +0.058 s, paired SE 0.003 over 544 games: resolved; on the clock: 1.852 s against B3's 1.758 s, gap +0.095 s, paired SE 0.004 over 544 games: resolved
- C9 (information, LOOPER_FREE alone (the untouched exchange with it, AM-2)), flat: 1.948 s against B3's 1.966 s, gap -0.018 s, paired SE 0.001 over 992 games: resolved; on the clock: 1.927 s against B3's 1.770 s, gap +0.157 s, paired SE 0.003 over 992 games: resolved
- C9 (information, LOOPER_FREE alone (the untouched exchange with it, AM-2)), gen: 1.941 s against B3's 1.959 s, gap -0.019 s, paired SE 0.001 over 544 games: resolved; on the clock: 1.934 s against B3's 1.758 s, gap +0.176 s, paired SE 0.004 over 544 games: resolved
- C10 (information, the late block alone), flat: 2.048 s against B3's 1.966 s, gap +0.082 s, paired SE 0.004 over 992 games: resolved; on the clock: 1.769 s against B3's 1.770 s, gap -0.000 s, paired SE 0.002 over 992 games: not resolved (under about 2 SE)
- C10 (information, the late block alone), gen: 2.078 s against B3's 1.959 s, gap +0.118 s, paired SE 0.006 over 544 games: resolved; on the clock: 1.756 s against B3's 1.758 s, gap -0.001 s, paired SE 0.002 over 544 games: not resolved (under about 2 SE)
- C16 (information, the climb lane alone), flat: 1.964 s against B3's 1.966 s, gap -0.002 s, paired SE 0.001 over 992 games: not resolved (under about 2 SE); on the clock: 1.768 s against B3's 1.770 s, gap -0.001 s, paired SE 0.001 over 992 games: not resolved (under about 2 SE)
- C16 (information, the climb lane alone), gen: 1.960 s against B3's 1.959 s, gap +0.001 s, paired SE 0.002 over 544 games: not resolved (under about 2 SE); on the clock: 1.759 s against B3's 1.758 s, gap +0.001 s, paired SE 0.001 over 544 games: not resolved (under about 2 SE)

## The information arms against their bases (reported, never graded)

- C3 against B3, flat, set 1 (information, the snap spot alone (AM-2's references hold the others)): pressure 26.38 - 27.80 = -1.42 | hit-or-sack 3.78 - 3.94 = -0.15 [time to throw 1.601 s against 1.592 s] | sacks 2.87 - 3.11 = -0.24 [time to throw 1.601 s against 1.592 s] | release 1.601 - 1.592 = +0.009 s
- C4 against B3, flat, set 1 (information, Speed and Acceleration alone (AM-2's references hold the others)): pressure 26.17 - 27.80 = -1.62 | hit-or-sack 3.78 - 3.94 = -0.16 [time to throw 1.602 s against 1.592 s] | sacks 2.84 - 3.11 = -0.27 [time to throw 1.602 s against 1.592 s] | release 1.602 - 1.592 = +0.009 s
- C5 against B3, flat, set 1 (information, the drop alone (AM-2's references hold the others)): pressure 26.20 - 27.80 = -1.59 | hit-or-sack 3.75 - 3.94 = -0.19 [time to throw 1.602 s against 1.592 s] | sacks 2.83 - 3.11 = -0.28 [time to throw 1.602 s against 1.592 s] | release 1.602 - 1.592 = +0.009 s
- C6 against B3, flat, set 1 (information, the other of the two snap pictures (AM-2's Mug rule)): pressure 21.92 - 27.80 = -5.88 | hit-or-sack 3.31 - 3.94 = -0.62 [time to throw 1.607 s against 1.592 s] | sacks 2.53 - 3.11 = -0.58 [time to throw 1.607 s against 1.592 s] | release 1.607 - 1.592 = +0.014 s
- C7 against B3, flat, set 1 (information, UNBLOCKED alone): pressure 27.02 - 27.80 = -0.78 | hit-or-sack 3.98 - 3.94 = +0.04 [time to throw 1.595 s against 1.592 s] | sacks 3.13 - 3.11 = +0.02 [time to throw 1.595 s against 1.592 s] | release 1.595 - 1.592 = +0.003 s
- C8 against B3, flat, set 1 (information, BLOWN_UP alone): pressure 27.08 - 27.80 = -0.72 | hit-or-sack 3.67 - 3.94 = -0.26 [time to throw 1.596 s against 1.592 s] | sacks 2.84 - 3.11 = -0.27 [time to throw 1.596 s against 1.592 s] | release 1.596 - 1.592 = +0.003 s
- C9 against B3, flat, set 1 (information, LOOPER_FREE alone (the untouched exchange with it, AM-2)): pressure 27.78 - 27.80 = -0.01 | hit-or-sack 3.89 - 3.94 = -0.05 [time to throw 1.592 s against 1.592 s] | sacks 3.08 - 3.11 = -0.03 [time to throw 1.592 s against 1.592 s] | release 1.592 - 1.592 = +0.000 s
- C10 against B3, flat, set 1 (information, the late block alone): pressure 23.53 - 27.80 = -4.27 | hit-or-sack 3.41 - 3.94 = -0.53 [time to throw 1.597 s against 1.592 s] | sacks 2.70 - 3.11 = -0.41 [time to throw 1.597 s against 1.592 s] | release 1.597 - 1.592 = +0.004 s
- C11 against B3, flat, set 1 (information, priced for the miss rule's option C; guarded under AM-3): pressure 25.24 - 27.80 = -2.55 | hit-or-sack 3.57 - 3.94 = -0.36 [time to throw 1.600 s against 1.592 s] | sacks 2.76 - 3.11 = -0.35 [time to throw 1.600 s against 1.592 s] | release 1.600 - 1.592 = +0.007 s
- C12 against B3, flat, set 1 (information, reading (a), never offered): pressure 14.78 - 27.80 = -13.02 | hit-or-sack 1.23 - 3.94 = -2.71 [time to throw 1.631 s against 1.592 s] | sacks 0.97 - 3.11 = -2.14 [time to throw 1.631 s against 1.592 s] | release 1.631 - 1.592 = +0.039 s
- C13 against B3, flat, set 1 (contrast only: revision 1's uniform delay, never offered for a man nobody touched): pressure 13.38 - 27.80 = -14.42 | hit-or-sack 1.09 - 3.94 = -2.84 [time to throw 1.637 s against 1.592 s] | sacks 0.88 - 3.11 = -2.23 [time to throw 1.637 s against 1.592 s] | release 1.637 - 1.592 = +0.044 s
- C14 against B5, flat, set 1 (information, the L basis (its late block on shape L is petition P17's, in contracts)): pressure 27.66 - 33.14 = -5.48 | hit-or-sack 3.04 - 3.67 = -0.63 [time to throw 1.608 s against 1.589 s] | sacks 2.35 - 2.94 = -0.59 [time to throw 1.608 s against 1.589 s] | release 1.608 - 1.589 = +0.018 s
- C15 against B3, flat, set 1 (information, priced for the miss rule's option A): pressure 14.23 - 27.80 = -13.57 | hit-or-sack 1.64 - 3.94 = -2.30 [time to throw 1.630 s against 1.592 s] | sacks 1.27 - 3.11 = -1.84 [time to throw 1.630 s against 1.592 s] | release 1.630 - 1.592 = +0.037 s
- C16 against B3, flat, set 1 (information, the climb lane alone): pressure 27.65 - 27.80 = -0.15 | hit-or-sack 4.40 - 3.94 = +0.47 [time to throw 1.586 s against 1.592 s] | sacks 3.50 - 3.11 = +0.39 [time to throw 1.586 s against 1.592 s] | release 1.586 - 1.592 = -0.006 s
- C3 against B3, flat, set 2 (information, the snap spot alone (AM-2's references hold the others)): pressure 26.46 - 27.89 = -1.44 | hit-or-sack 3.84 - 3.95 = -0.11 [time to throw 1.603 s against 1.589 s] | sacks 2.98 - 3.10 = -0.12 [time to throw 1.603 s against 1.589 s] | release 1.603 - 1.589 = +0.014 s
- C4 against B3, flat, set 2 (information, Speed and Acceleration alone (AM-2's references hold the others)): pressure 26.38 - 27.89 = -1.51 | hit-or-sack 3.84 - 3.95 = -0.11 [time to throw 1.603 s against 1.589 s] | sacks 2.94 - 3.10 = -0.16 [time to throw 1.603 s against 1.589 s] | release 1.603 - 1.589 = +0.014 s
- C5 against B3, flat, set 2 (information, the drop alone (AM-2's references hold the others)): pressure 26.43 - 27.89 = -1.46 | hit-or-sack 3.78 - 3.95 = -0.17 [time to throw 1.603 s against 1.589 s] | sacks 2.89 - 3.10 = -0.21 [time to throw 1.603 s against 1.589 s] | release 1.603 - 1.589 = +0.014 s
- C6 against B3, flat, set 2 (information, the other of the two snap pictures (AM-2's Mug rule)): pressure 22.20 - 27.89 = -5.69 | hit-or-sack 3.44 - 3.95 = -0.52 [time to throw 1.607 s against 1.589 s] | sacks 2.60 - 3.10 = -0.50 [time to throw 1.607 s against 1.589 s] | release 1.607 - 1.589 = +0.018 s
- C7 against B3, flat, set 2 (information, UNBLOCKED alone): pressure 27.21 - 27.89 = -0.68 | hit-or-sack 3.92 - 3.95 = -0.03 [time to throw 1.596 s against 1.589 s] | sacks 3.07 - 3.10 = -0.04 [time to throw 1.596 s against 1.589 s] | release 1.596 - 1.589 = +0.007 s
- C8 against B3, flat, set 2 (information, BLOWN_UP alone): pressure 27.20 - 27.89 = -0.70 | hit-or-sack 3.74 - 3.95 = -0.21 [time to throw 1.598 s against 1.589 s] | sacks 2.87 - 3.10 = -0.23 [time to throw 1.598 s against 1.589 s] | release 1.598 - 1.589 = +0.008 s
- C9 against B3, flat, set 2 (information, LOOPER_FREE alone (the untouched exchange with it, AM-2)): pressure 27.87 - 27.89 = -0.03 | hit-or-sack 3.94 - 3.95 = -0.02 [time to throw 1.591 s against 1.589 s] | sacks 3.10 - 3.10 = -0.01 [time to throw 1.591 s against 1.589 s] | release 1.591 - 1.589 = +0.002 s
- C10 against B3, flat, set 2 (information, the late block alone): pressure 23.60 - 27.89 = -4.30 | hit-or-sack 3.45 - 3.95 = -0.50 [time to throw 1.604 s against 1.589 s] | sacks 2.71 - 3.10 = -0.40 [time to throw 1.604 s against 1.589 s] | release 1.604 - 1.589 = +0.015 s
- C11 against B3, flat, set 2 (information, priced for the miss rule's option C; guarded under AM-3): pressure 25.37 - 27.89 = -2.53 | hit-or-sack 3.67 - 3.95 = -0.28 [time to throw 1.596 s against 1.589 s] | sacks 2.83 - 3.10 = -0.27 [time to throw 1.596 s against 1.589 s] | release 1.596 - 1.589 = +0.007 s
- C12 against B3, flat, set 2 (information, reading (a), never offered): pressure 14.82 - 27.89 = -13.07 | hit-or-sack 1.29 - 3.95 = -2.66 [time to throw 1.630 s against 1.589 s] | sacks 1.01 - 3.10 = -2.10 [time to throw 1.630 s against 1.589 s] | release 1.630 - 1.589 = +0.041 s
- C13 against B3, flat, set 2 (contrast only: revision 1's uniform delay, never offered for a man nobody touched): pressure 13.40 - 27.89 = -14.49 | hit-or-sack 1.10 - 3.95 = -2.86 [time to throw 1.639 s against 1.589 s] | sacks 0.89 - 3.10 = -2.22 [time to throw 1.639 s against 1.589 s] | release 1.639 - 1.589 = +0.050 s
- C14 against B5, flat, set 2 (information, the L basis (its late block on shape L is petition P17's, in contracts)): pressure 27.46 - 33.18 = -5.71 | hit-or-sack 3.01 - 3.68 = -0.66 [time to throw 1.605 s against 1.590 s] | sacks 2.31 - 2.91 = -0.60 [time to throw 1.605 s against 1.590 s] | release 1.605 - 1.590 = +0.015 s
- C15 against B3, flat, set 2 (information, priced for the miss rule's option A): pressure 14.50 - 27.89 = -13.39 | hit-or-sack 1.71 - 3.95 = -2.24 [time to throw 1.627 s against 1.589 s] | sacks 1.35 - 3.10 = -1.75 [time to throw 1.627 s against 1.589 s] | release 1.627 - 1.589 = +0.038 s
- C16 against B3, flat, set 2 (information, the climb lane alone): pressure 27.83 - 27.89 = -0.06 | hit-or-sack 4.51 - 3.95 = +0.56 [time to throw 1.582 s against 1.589 s] | sacks 3.59 - 3.10 = +0.49 [time to throw 1.582 s against 1.589 s] | release 1.582 - 1.589 = -0.007 s
- C3 against B3, gen, set 1 (information, the snap spot alone (AM-2's references hold the others)): pressure 27.25 - 28.73 = -1.47 | hit-or-sack 3.80 - 4.38 = -0.59 [time to throw 1.692 s against 1.682 s] | sacks 2.50 - 3.01 = -0.51 [time to throw 1.692 s against 1.682 s] | release 1.692 - 1.682 = +0.011 s
- C4 against B3, gen, set 1 (information, Speed and Acceleration alone (AM-2's references hold the others)): pressure 27.34 - 28.73 = -1.39 | hit-or-sack 3.64 - 4.38 = -0.74 [time to throw 1.687 s against 1.682 s] | sacks 2.47 - 3.01 = -0.54 [time to throw 1.687 s against 1.682 s] | release 1.687 - 1.682 = +0.006 s
- C5 against B3, gen, set 1 (information, the drop alone (AM-2's references hold the others)): pressure 27.18 - 28.73 = -1.55 | hit-or-sack 3.71 - 4.38 = -0.67 [time to throw 1.693 s against 1.682 s] | sacks 2.45 - 3.01 = -0.56 [time to throw 1.693 s against 1.682 s] | release 1.693 - 1.682 = +0.011 s
- C6 against B3, gen, set 1 (information, the other of the two snap pictures (AM-2's Mug rule)): pressure 23.29 - 28.73 = -5.44 | hit-or-sack 3.47 - 4.38 = -0.91 [time to throw 1.703 s against 1.682 s] | sacks 2.24 - 3.01 = -0.78 [time to throw 1.703 s against 1.682 s] | release 1.703 - 1.682 = +0.022 s
- C7 against B3, gen, set 1 (information, UNBLOCKED alone): pressure 28.08 - 28.73 = -0.65 | hit-or-sack 4.24 - 4.38 = -0.14 [time to throw 1.688 s against 1.682 s] | sacks 2.88 - 3.01 = -0.13 [time to throw 1.688 s against 1.682 s] | release 1.688 - 1.682 = +0.007 s
- C8 against B3, gen, set 1 (information, BLOWN_UP alone): pressure 28.05 - 28.73 = -0.68 | hit-or-sack 3.80 - 4.38 = -0.59 [time to throw 1.685 s against 1.682 s] | sacks 2.50 - 3.01 = -0.52 [time to throw 1.685 s against 1.682 s] | release 1.685 - 1.682 = +0.004 s
- C9 against B3, gen, set 1 (information, LOOPER_FREE alone (the untouched exchange with it, AM-2)): pressure 28.66 - 28.73 = -0.07 | hit-or-sack 4.20 - 4.38 = -0.19 [time to throw 1.682 s against 1.682 s] | sacks 2.90 - 3.01 = -0.11 [time to throw 1.682 s against 1.682 s] | release 1.682 - 1.682 = +0.001 s
- C10 against B3, gen, set 1 (information, the late block alone): pressure 25.09 - 28.73 = -3.64 | hit-or-sack 3.77 - 4.38 = -0.61 [time to throw 1.688 s against 1.682 s] | sacks 2.63 - 3.01 = -0.38 [time to throw 1.688 s against 1.682 s] | release 1.688 - 1.682 = +0.006 s
- C11 against B3, gen, set 1 (information, priced for the miss rule's option C; guarded under AM-3): pressure 26.57 - 28.73 = -2.16 | hit-or-sack 3.60 - 4.38 = -0.78 [time to throw 1.697 s against 1.682 s] | sacks 2.38 - 3.01 = -0.63 [time to throw 1.697 s against 1.682 s] | release 1.697 - 1.682 = +0.015 s
- C12 against B3, gen, set 1 (information, reading (a), never offered): pressure 16.82 - 28.73 = -11.91 | hit-or-sack 1.45 - 4.38 = -2.93 [time to throw 1.730 s against 1.682 s] | sacks 0.94 - 3.01 = -2.07 [time to throw 1.730 s against 1.682 s] | release 1.730 - 1.682 = +0.048 s
- C13 against B3, gen, set 1 (contrast only: revision 1's uniform delay, never offered for a man nobody touched): pressure 14.86 - 28.73 = -13.87 | hit-or-sack 1.42 - 4.38 = -2.97 [time to throw 1.747 s against 1.682 s] | sacks 0.93 - 3.01 = -2.08 [time to throw 1.747 s against 1.682 s] | release 1.747 - 1.682 = +0.065 s
- C14 against B5, gen, set 1 (information, the L basis (its late block on shape L is petition P17's, in contracts)): pressure 31.27 - 36.87 = -5.60 | hit-or-sack 2.89 - 4.01 = -1.12 [time to throw 1.694 s against 1.663 s] | sacks 1.88 - 2.83 = -0.95 [time to throw 1.694 s against 1.663 s] | release 1.694 - 1.663 = +0.031 s
- C15 against B3, gen, set 1 (information, priced for the miss rule's option A): pressure 15.81 - 28.73 = -12.92 | hit-or-sack 1.89 - 4.38 = -2.49 [time to throw 1.738 s against 1.682 s] | sacks 1.26 - 3.01 = -1.75 [time to throw 1.738 s against 1.682 s] | release 1.738 - 1.682 = +0.057 s
- C16 against B3, gen, set 1 (information, the climb lane alone): pressure 28.49 - 28.73 = -0.24 | hit-or-sack 4.79 - 4.38 = +0.41 [time to throw 1.673 s against 1.682 s] | sacks 3.25 - 3.01 = +0.24 [time to throw 1.673 s against 1.682 s] | release 1.673 - 1.682 = -0.008 s
- C3 against B3, gen, set 2 (information, the snap spot alone (AM-2's references hold the others)): pressure 28.94 - 30.45 = -1.51 | hit-or-sack 3.82 - 4.46 = -0.64 [time to throw 1.728 s against 1.711 s] | sacks 2.41 - 3.00 = -0.59 [time to throw 1.728 s against 1.711 s] | release 1.728 - 1.711 = +0.018 s
- C4 against B3, gen, set 2 (information, Speed and Acceleration alone (AM-2's references hold the others)): pressure 29.20 - 30.45 = -1.25 | hit-or-sack 3.78 - 4.46 = -0.67 [time to throw 1.729 s against 1.711 s] | sacks 2.35 - 3.00 = -0.65 [time to throw 1.729 s against 1.711 s] | release 1.729 - 1.711 = +0.018 s
- C5 against B3, gen, set 2 (information, the drop alone (AM-2's references hold the others)): pressure 29.07 - 30.45 = -1.38 | hit-or-sack 3.75 - 4.46 = -0.70 [time to throw 1.733 s against 1.711 s] | sacks 2.35 - 3.00 = -0.66 [time to throw 1.733 s against 1.711 s] | release 1.733 - 1.711 = +0.022 s
- C6 against B3, gen, set 2 (information, the other of the two snap pictures (AM-2's Mug rule)): pressure 24.91 - 30.45 = -5.54 | hit-or-sack 3.45 - 4.46 = -1.00 [time to throw 1.748 s against 1.711 s] | sacks 2.16 - 3.00 = -0.85 [time to throw 1.748 s against 1.711 s] | release 1.748 - 1.711 = +0.038 s
- C7 against B3, gen, set 2 (information, UNBLOCKED alone): pressure 29.80 - 30.45 = -0.65 | hit-or-sack 4.49 - 4.46 = +0.03 [time to throw 1.719 s against 1.711 s] | sacks 2.97 - 3.00 = -0.04 [time to throw 1.719 s against 1.711 s] | release 1.719 - 1.711 = +0.008 s
- C8 against B3, gen, set 2 (information, BLOWN_UP alone): pressure 29.92 - 30.45 = -0.53 | hit-or-sack 3.85 - 4.46 = -0.61 [time to throw 1.725 s against 1.711 s] | sacks 2.43 - 3.00 = -0.58 [time to throw 1.725 s against 1.711 s] | release 1.725 - 1.711 = +0.014 s
- C9 against B3, gen, set 2 (information, LOOPER_FREE alone (the untouched exchange with it, AM-2)): pressure 30.60 - 30.45 = +0.15 | hit-or-sack 4.30 - 4.46 = -0.16 [time to throw 1.711 s against 1.711 s] | sacks 2.96 - 3.00 = -0.04 [time to throw 1.711 s against 1.711 s] | release 1.711 - 1.711 = +0.001 s
- C10 against B3, gen, set 2 (information, the late block alone): pressure 26.59 - 30.45 = -3.86 | hit-or-sack 3.94 - 4.46 = -0.51 [time to throw 1.726 s against 1.711 s] | sacks 2.74 - 3.00 = -0.26 [time to throw 1.726 s against 1.711 s] | release 1.726 - 1.711 = +0.015 s
- C11 against B3, gen, set 2 (information, priced for the miss rule's option C; guarded under AM-3): pressure 28.55 - 30.45 = -1.90 | hit-or-sack 3.84 - 4.46 = -0.62 [time to throw 1.733 s against 1.711 s] | sacks 2.35 - 3.00 = -0.65 [time to throw 1.733 s against 1.711 s] | release 1.733 - 1.711 = +0.023 s
- C12 against B3, gen, set 2 (information, reading (a), never offered): pressure 18.56 - 30.45 = -11.89 | hit-or-sack 1.53 - 4.46 = -2.93 [time to throw 1.769 s against 1.711 s] | sacks 0.99 - 3.00 = -2.02 [time to throw 1.769 s against 1.711 s] | release 1.769 - 1.711 = +0.058 s
- C13 against B3, gen, set 2 (contrast only: revision 1's uniform delay, never offered for a man nobody touched): pressure 16.22 - 30.45 = -14.23 | hit-or-sack 1.39 - 4.46 = -3.06 [time to throw 1.783 s against 1.711 s] | sacks 0.94 - 3.00 = -2.06 [time to throw 1.783 s against 1.711 s] | release 1.783 - 1.711 = +0.073 s
- C14 against B5, gen, set 2 (information, the L basis (its late block on shape L is petition P17's, in contracts)): pressure 33.09 - 38.79 = -5.69 | hit-or-sack 3.18 - 4.11 = -0.93 [time to throw 1.727 s against 1.694 s] | sacks 2.02 - 2.81 = -0.79 [time to throw 1.727 s against 1.694 s] | release 1.727 - 1.694 = +0.034 s
- C15 against B3, gen, set 2 (information, priced for the miss rule's option A): pressure 17.40 - 30.45 = -13.05 | hit-or-sack 1.99 - 4.46 = -2.47 [time to throw 1.778 s against 1.711 s] | sacks 1.29 - 3.00 = -1.72 [time to throw 1.778 s against 1.711 s] | release 1.778 - 1.711 = +0.067 s
- C16 against B3, gen, set 2 (information, the climb lane alone): pressure 30.61 - 30.45 = +0.16 | hit-or-sack 5.09 - 4.46 = +0.63 [time to throw 1.713 s against 1.711 s] | sacks 3.39 - 3.00 = +0.39 [time to throw 1.713 s against 1.711 s] | release 1.713 - 1.711 = +0.003 s

## The interception guard under AM-3 (ADR-089 Appendix G, G.9; amendments at step 3 fnv1a:517bb9fe)

AM-3 maps the guard at step 3; its rule is AM-1's but for the map: on each set z = (rise - allowed) / SE, SE binomial with the two arms read as independent (a set whose SE is 0 scores 0); Z = (z1 + z2) / sqrt 2; a reading breaches when Z is above 2.0 league-wide or 3.0 in a class on either league (strict). A breach stops the step and goes to the owner (D9). Beside every reading: e*, the filed reading and the paired SE. The cumulative line (C1 against A0, C2 against A14) and the accepted state (C1 against A1, C2 against A11) are reported, never graded before step 10; every other arm's reading against its base is information, unguarded.

### C1 against B3, flat (graded)

- league-wide: set 1 2.83 -> 2.81, rise -0.02 / allowed +0.01 / SE 0.12 / z -0.24 (filed: within the allowance; 39970 aimed); set 2 2.75 -> 2.72, rise -0.03 / allowed +0.01 / SE 0.12 / z -0.35 (filed: within the allowance; 39991 aimed); Z -0.42 against 2.0, e* 0.16, mean excess -0.03: PASS; paired SE 0.09 (set 1, 496 games, z -0.33), 0.08 (set 2, 496 games, z -0.51); paired Z -0.59 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.33, rise -0.01 / allowed +0.00 / SE 0.06 / z -0.23 (filed: within the allowance; 20656 aimed); set 2 0.39 -> 0.35, rise -0.04 / allowed +0.00 / SE 0.06 / z -0.67 (filed: within the allowance; 20584 aimed); Z -0.63 against 3.0, e* 0.12, mean excess -0.03: PASS; paired SE 0.04 (set 1, 496 games, z -0.31), 0.04 (set 2, 496 games, z -1.05); paired Z -0.96 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.37, rise -0.33 / allowed -0.00 / SE 0.57 / z -0.56 (filed: within the allowance; 6863 aimed); set 2 11.57 -> 11.81, rise +0.24 / allowed +0.01 / SE 0.55 / z +0.42 (filed: above the allowance; 6790 aimed); Z -0.10 against 3.0, e* 1.19, mean excess -0.05: PASS; paired SE 0.42 (set 1, 496 games, z -0.76), 0.38 (set 2, 496 games, z +0.60); paired Z -0.11 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.19, rise -0.02 / allowed +0.01 / SE 0.07 / z -0.40 (filed: within the allowance; 8870 aimed); set 2 0.16 -> 0.22, rise +0.06 / allowed +0.01 / SE 0.07 / z +0.74 (filed: above the allowance; 9047 aimed); Z +0.24 against 3.0, e* 0.14, mean excess +0.01: PASS; paired SE 0.05 (set 1, 496 games, z -0.51), 0.05 (set 2, 496 games, z +0.96); paired Z +0.32 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.16, rise -0.20 / allowed +0.03 / SE 0.54 / z -0.43 (filed: within the allowance; 3374 aimed); set 2 6.32 -> 5.44, rise -0.89 / allowed +0.03 / SE 0.57 / z -1.61 (filed: within the allowance; 3365 aimed); Z -1.45 against 3.0, e* 1.18, mean excess -0.58: PASS; paired SE 0.38 (set 1, 496 games, z -0.62), 0.41 (set 2, 496 games, z -2.23); paired Z -2.01 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 6.28, rise +0.84 / allowed +0.03 / SE 2.52 / z +0.32 (filed: above the allowance; 207 aimed); set 2 9.16 -> 4.39, rise -4.77 / allowed -0.02 / SE 2.90 / z -1.64 (filed: within the allowance; 205 aimed); Z -0.93 against 3.0, e* 5.72, mean excess -1.97: PASS; paired SE 2.01 (set 1, 496 games, z +0.40), 2.73 (set 2, 496 games, z -1.74); paired Z -0.95 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 797 / 32; set 2 base 981 aimed / 41 INT -> arm 809 / 36; set 1 4.22 -> 4.02, rise -0.21 / allowed +0.14 / SE 0.94 / z -0.37 (filed: within the allowance; 797 aimed); set 2 4.18 -> 4.45, rise +0.27 / allowed +0.16 / SE 0.97 / z +0.11 (filed: above the allowance; 809 aimed); Z -0.18 against 3.0, e* 2.03, mean excess -0.12 (reported); paired SE 0.75 (set 1, 496 games, z -0.46), 0.73 (set 2, 496 games, z +0.14); paired Z -0.22 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2577 / 142; set 2 base 2450 aimed / 176 INT -> arm 2556 / 147; set 1 5.82 -> 5.51, rise -0.31 / allowed +0.00 / SE 0.65 / z -0.48 (filed: within the allowance; 2577 aimed); set 2 7.18 -> 5.75, rise -1.43 / allowed -0.01 / SE 0.70 / z -2.05 (filed: within the allowance; 2556 aimed); Z -1.79 against 3.0, e* 1.43, mean excess -0.87 (reported); paired SE 0.45 (set 1, 496 games, z -0.69), 0.51 (set 2, 496 games, z -2.82); paired Z -2.48 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 23.62% / clean 76.38%; the class's rise -0.20, re-weighted to the base's composition -0.28 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 24.04% / clean 75.96%; the class's rise -0.89, re-weighted to the base's composition -0.95 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 25836 looks (threat part 4720, status part 4725, count part 23591; rule part 4720 under PER_RUSHER: rule only 2245, count only 21116, both 2475, neither 0); set 2 26016 looks (threat part 4740, status part 4746, count part 23701; rule part 4740 under PER_RUSHER: rule only 2315, count only 21276, both 2425, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 19.27% / count 80.73% / status 0.00% / none 0.00%; the class's rise -0.02, re-weighted to the base's composition +0.00 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 20.12% / count 79.88% / status 0.00% / none 0.00%; the class's rise +0.06, re-weighted to the base's composition +0.05 (reported)

### C1 against B3, gen (graded)

- league-wide: set 1 7.30 -> 7.50, rise +0.19 / allowed +0.01 / SE 0.24 / z +0.76 (filed: above the allowance; 24692 aimed); set 2 7.69 -> 7.68, rise -0.01 / allowed +0.02 / SE 0.24 / z -0.14 (filed: within the allowance; 25158 aimed); Z +0.44 against 2.0, e* 0.34, mean excess +0.07: PASS; paired SE 0.17 (set 1, 272 games, z +1.05), 0.15 (set 2, 272 games, z -0.22); paired Z +0.58 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.47, rise -0.24 / allowed +0.01 / SE 0.19 / z -1.32 (filed: within the allowance; 14236 aimed); set 2 2.79 -> 2.75, rise -0.04 / allowed +0.00 / SE 0.19 / z -0.20 (filed: within the allowance; 14794 aimed); Z -1.08 against 3.0, e* 0.40, mean excess -0.14: PASS; paired SE 0.14 (set 1, 272 games, z -1.81), 0.14 (set 2, 272 games, z -0.27); paired Z -1.47 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 21.12, rise +1.38 / allowed -0.01 / SE 0.89 / z +1.56 (filed: above the allowance; 4157 aimed); set 2 20.68 -> 21.16, rise +0.48 / allowed +0.03 / SE 0.90 / z +0.50 (filed: above the allowance; 4139 aimed); Z +1.45 against 3.0, e* 1.90, mean excess +0.92: PASS; paired SE 0.58 (set 1, 272 games, z +2.40), 0.61 (set 2, 272 games, z +0.73); paired Z +2.22 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 2.84, rise -0.37 / allowed +0.05 / SE 0.41 / z -1.03 (filed: within the allowance; 3341 aimed); set 2 3.75 -> 3.94, rise +0.19 / allowed +0.07 / SE 0.48 / z +0.26 (filed: above the allowance; 3072 aimed); Z -0.54 against 3.0, e* 0.94, mean excess -0.15: PASS; paired SE 0.31 (set 1, 272 games, z -1.37), 0.36 (set 2, 272 games, z +0.35); paired Z -0.72 (reported, never graded)
- DESPERATION: set 1 16.61 -> 17.89, rise +1.28 / allowed +0.03 / SE 1.00 / z +1.24 (filed: above the allowance; 2845 aimed); set 2 18.18 -> 16.89, rise -1.28 / allowed +0.07 / SE 0.97 / z -1.39 (filed: within the allowance; 3072 aimed); Z -0.10 against 3.0, e* 2.09, mean excess -0.06: PASS; paired SE 0.72 (set 1, 272 games, z +1.73), 0.67 (set 2, 272 games, z -2.02); paired Z -0.20 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 15.93, rise -4.07 / allowed +0.12 / SE 5.89 / z -0.71 (filed: within the allowance; 113 aimed); set 2 8.45 -> 12.35, rise +3.89 / allowed +0.32 / SE 4.93 / z +0.73 (filed: above the allowance; 81 aimed); Z +0.01 against 3.0, e* 11.38, mean excess -0.31: PASS; paired SE 5.29 (set 1, 272 games, z -0.79), 3.94 (set 2, 272 games, z +0.91); paired Z +0.08 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 906 / 141; set 2 base 1216 aimed / 203 INT -> arm 1108 / 164; set 1 14.26 -> 15.56, rise +1.30 / allowed +0.15 / SE 1.62 / z +0.72 (filed: above the allowance; 906 aimed); set 2 16.69 -> 14.80, rise -1.89 / allowed +0.21 / SE 1.51 / z -1.39 (filed: within the allowance; 1108 aimed); Z -0.48 against 3.0, e* 3.31, mean excess -0.47 (reported); paired SE 1.31 (set 1, 272 games, z +0.88), 1.17 (set 2, 272 games, z -1.80); paired Z -0.65 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1939 / 368; set 2 base 1815 aimed / 348 INT -> arm 1964 / 355; set 1 17.97 -> 18.98, rise +1.01 / allowed -0.03 / SE 1.26 / z +0.82 (filed: above the allowance; 1939 aimed); set 2 19.17 -> 18.08, rise -1.10 / allowed -0.02 / SE 1.27 / z -0.85 (filed: within the allowance; 1964 aimed); Z -0.02 against 3.0, e* 2.69, mean excess -0.02 (reported); paired SE 0.91 (set 1, 272 games, z +1.14), 0.86 (set 2, 272 games, z -1.25); paired Z -0.08 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 31.85% / clean 68.15%; the class's rise +1.28, re-weighted to the base's composition +1.12 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 36.07% / clean 63.93%; the class's rise -1.28, re-weighted to the base's composition -1.42 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8394 looks (threat part 3064, status part 3068, count part 6089; rule part 3064 under PER_RUSHER: rule only 2305, count only 5330, both 759, neither 0); set 2 7452 looks (threat part 3359, status part 3361, count part 4761; rule part 3359 under PER_RUSHER: rule only 2691, count only 4093, both 668, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 41.39% / count 58.61% / status 0.00% / none 0.00%; the class's rise -0.37, re-weighted to the base's composition -0.29 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 52.31% / count 47.69% / status 0.00% / none 0.00%; the class's rise +0.19, re-weighted to the base's composition +0.22 (reported)

### C2 against B6, flat (graded)

- league-wide: set 1 3.02 -> 2.92, rise -0.10 / allowed -0.01 / SE 0.13 / z -0.68 (filed: within the allowance; 34609 aimed); set 2 2.82 -> 2.82, rise -0.00 / allowed -0.01 / SE 0.13 / z +0.05 (filed: above the allowance; 34782 aimed); Z -0.45 against 2.0, e* 0.18, mean excess -0.04: PASS; paired SE 0.09 (set 1, 496 games, z -1.00), 0.10 (set 2, 496 games, z +0.07); paired Z -0.66 (reported, never graded)
- PROGRESSION: set 1 0.36 -> 0.29, rise -0.07 / allowed -0.01 / SE 0.06 / z -1.07 (filed: within the allowance; 20899 aimed); set 2 0.28 -> 0.25, rise -0.02 / allowed -0.02 / SE 0.05 / z -0.10 (filed: within the allowance; 21290 aimed); Z -0.83 against 3.0, e* 0.11, mean excess -0.03: PASS; paired SE 0.04 (set 1, 496 games, z -1.57), 0.04 (set 2, 496 games, z -0.12); paired Z -1.19 (reported, never graded)
- RANK_PUSHED: set 1 11.81 -> 11.28, rise -0.53 / allowed -0.01 / SE 0.57 / z -0.91 (filed: within the allowance; 6438 aimed); set 2 11.31 -> 11.29, rise -0.02 / allowed +0.00 / SE 0.56 / z -0.04 (filed: within the allowance; 6387 aimed); Z -0.67 against 3.0, e* 1.20, mean excess -0.27: PASS; paired SE 0.41 (set 1, 496 games, z -1.25), 0.43 (set 2, 496 games, z -0.05); paired Z -0.92 (reported, never graded)
- CHECKDOWN: set 1 0.17 -> 0.12, rise -0.05 / allowed +0.02 / SE 0.08 / z -0.84 (filed: within the allowance; 4117 aimed); set 2 0.19 -> 0.20, rise +0.00 / allowed +0.03 / SE 0.10 / z -0.29 (filed: within the allowance; 4092 aimed); Z -0.80 against 3.0, e* 0.19, mean excess -0.05: PASS; paired SE 0.06 (set 1, 496 games, z -1.17), 0.07 (set 2, 496 games, z -0.41); paired Z -1.12 (reported, never graded)
- DESPERATION: set 1 6.35 -> 7.05, rise +0.70 / allowed +0.02 / SE 0.66 / z +1.04 (filed: above the allowance; 2965 aimed); set 2 6.06 -> 6.28, rise +0.22 / allowed +0.01 / SE 0.64 / z +0.33 (filed: above the allowance; 2835 aimed); Z +0.97 against 3.0, e* 1.38, mean excess +0.45: PASS; paired SE 0.49 (set 1, 496 games, z +1.40), 0.48 (set 2, 496 games, z +0.44); paired Z +1.30 (reported, never graded)
- ON_THE_RUN: set 1 10.42 -> 5.26, rise -5.15 / allowed -0.15 / SE 3.02 / z -1.66 (filed: within the allowance; 190 aimed); set 2 6.94 -> 10.67, rise +3.73 / allowed -0.11 / SE 3.14 / z +1.22 (filed: above the allowance; 178 aimed); Z -0.31 against 3.0, e* 6.53, mean excess -0.58: PASS; paired SE 2.41 (set 1, 496 games, z -2.08), 2.85 (set 2, 496 games, z +1.35); paired Z -0.52 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1212 aimed / 59 INT -> arm 1302 / 87; set 2 base 1159 aimed / 58 INT -> arm 1205 / 60; set 1 4.87 -> 6.68, rise +1.81 / allowed +0.05 / SE 0.93 / z +1.90 (filed: above the allowance; 1302 aimed); set 2 5.00 -> 4.98, rise -0.03 / allowed +0.03 / SE 0.90 / z -0.06 (filed: within the allowance; 1205 aimed); Z +1.30 against 3.0, e* 1.93, mean excess +0.85 (reported); paired SE 0.71 (set 1, 496 games, z +2.47), 0.79 (set 2, 496 games, z -0.07); paired Z +1.70 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1624 aimed / 121 INT -> arm 1663 / 122; set 2 base 1581 aimed / 108 INT -> arm 1630 / 118; set 1 7.45 -> 7.34, rise -0.11 / allowed -0.00 / SE 0.91 / z -0.13 (filed: within the allowance; 1663 aimed); set 2 6.83 -> 7.24, rise +0.41 / allowed -0.01 / SE 0.90 / z +0.46 (filed: above the allowance; 1630 aimed); Z +0.24 against 3.0, e* 1.93, mean excess +0.15 (reported); paired SE 0.68 (set 1, 496 games, z -0.17), 0.66 (set 2, 496 games, z +0.62); paired Z +0.32 (reported, never graded)
- DESPERATION composition, set 1: base dirty 42.74% / clean 57.26% -> arm dirty 43.91% / clean 56.09%; the class's rise +0.70, re-weighted to the base's composition +0.71 (reported)
- DESPERATION composition, set 2: base dirty 42.30% / clean 57.70% -> arm dirty 42.50% / clean 57.50%; the class's rise +0.22, re-weighted to the base's composition +0.22 (reported)
- checkdown looks by trigger: base set 1 12123 looks (threat part 7455, status part 7481, count part 5398; rule part 7455 under PER_RUSHER: rule only 6725, count only 4668, both 730, neither 0); set 2 11927 looks (threat part 7323, status part 7358, count part 5277; rule part 7323 under PER_RUSHER: rule only 6650, count only 4604, both 673, neither 0); arm set 1 11849 looks (threat part 7034, status part 7097, count part 5580; rule part 7034 under PER_RUSHER: rule only 6269, count only 4815, both 765, neither 0); set 2 11627 looks (threat part 6970, status part 7026, count part 5410; rule part 6970 under PER_RUSHER: rule only 6217, count only 4657, both 753, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 67.78% / count 32.22% / status 0.00% / none 0.00% -> arm threat 66.29% / count 33.71% / status 0.00% / none 0.00%; the class's rise -0.05, re-weighted to the base's composition -0.04 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 67.96% / count 32.04% / status 0.00% / none 0.00% -> arm threat 67.79% / count 32.21% / status 0.00% / none 0.00%; the class's rise +0.00, re-weighted to the base's composition +0.00 (reported)

### C2 against B6, gen (graded)

- league-wide: set 1 7.38 -> 7.13, rise -0.25 / allowed +0.00 / SE 0.25 / z -0.99 (filed: within the allowance; 21787 aimed); set 2 7.65 -> 7.66, rise +0.01 / allowed +0.00 / SE 0.26 / z +0.03 (filed: above the allowance; 22024 aimed); Z -0.68 against 2.0, e* 0.36, mean excess -0.12: PASS; paired SE 0.19 (set 1, 272 games, z -1.29), 0.18 (set 2, 272 games, z +0.04); paired Z -0.88 (reported, never graded)
- PROGRESSION: set 1 2.19 -> 2.29, rise +0.10 / allowed +0.00 / SE 0.19 / z +0.53 (filed: above the allowance; 13058 aimed); set 2 2.40 -> 2.62, rise +0.22 / allowed -0.01 / SE 0.20 / z +1.15 (filed: above the allowance; 13001 aimed); Z +1.19 against 3.0, e* 0.40, mean excess +0.16: PASS; paired SE 0.14 (set 1, 272 games, z +0.70), 0.15 (set 2, 272 games, z +1.52); paired Z +1.57 (reported, never graded)
- RANK_PUSHED: set 1 21.87 -> 20.24, rise -1.62 / allowed -0.02 / SE 0.97 / z -1.64 (filed: within the allowance; 3631 aimed); set 2 20.34 -> 20.63, rise +0.29 / allowed -0.01 / SE 0.96 / z +0.31 (filed: above the allowance; 3616 aimed); Z -0.94 against 3.0, e* 2.05, mean excess -0.65: PASS; paired SE 0.65 (set 1, 272 games, z -2.45), 0.74 (set 2, 272 games, z +0.41); paired Z -1.44 (reported, never graded)
- CHECKDOWN: set 1 3.93 -> 3.13, rise -0.79 / allowed +0.01 / SE 0.54 / z -1.49 (filed: within the allowance; 2362 aimed); set 2 4.13 -> 3.56, rise -0.57 / allowed +0.01 / SE 0.55 / z -1.05 (filed: within the allowance; 2502 aimed); Z -1.79 against 3.0, e* 1.16, mean excess -0.69: PASS; paired SE 0.45 (set 1, 272 games, z -1.78), 0.42 (set 2, 272 games, z -1.38); paired Z -2.23 (reported, never graded)
- DESPERATION: set 1 16.17 -> 16.30, rise +0.13 / allowed +0.02 / SE 1.02 / z +0.11 (filed: above the allowance; 2619 aimed); set 2 18.49 -> 18.08, rise -0.41 / allowed +0.04 / SE 1.05 / z -0.43 (filed: within the allowance; 2760 aimed); Z -0.23 against 3.0, e* 2.20, mean excess -0.17: PASS; paired SE 0.78 (set 1, 272 games, z +0.14), 0.81 (set 2, 272 games, z -0.56); paired Z -0.30 (reported, never graded)
- ON_THE_RUN: set 1 15.85 -> 15.38, rise -0.47 / allowed -0.05 / SE 5.23 / z -0.08 (filed: within the allowance; 117 aimed); set 2 14.29 -> 7.59, rise -6.70 / allowed -0.09 / SE 4.41 / z -1.50 (filed: within the allowance; 145 aimed); Z -1.12 against 3.0, e* 10.15, mean excess -3.52: PASS; paired SE 4.81 (set 1, 272 games, z -0.09), 3.65 (set 2, 272 games, z -1.81); paired Z -1.34 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1314 aimed / 201 INT -> arm 1312 / 179; set 2 base 1405 aimed / 223 INT -> arm 1445 / 223; set 1 15.30 -> 13.64, rise -1.65 / allowed +0.07 / SE 1.37 / z -1.26 (filed: within the allowance; 1312 aimed); set 2 15.87 -> 15.43, rise -0.44 / allowed +0.10 / SE 1.36 / z -0.40 (filed: within the allowance; 1445 aimed); Z -1.17 against 3.0, e* 2.90, mean excess -1.13 (reported); paired SE 1.07 (set 1, 272 games, z -1.61), 1.05 (set 2, 272 games, z -0.51); paired Z -1.50 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1246 aimed / 213 INT -> arm 1307 / 248; set 2 base 1239 aimed / 266 INT -> arm 1315 / 276; set 1 17.09 -> 18.97, rise +1.88 / allowed -0.04 / SE 1.52 / z +1.26 (filed: above the allowance; 1307 aimed); set 2 21.47 -> 20.99, rise -0.48 / allowed -0.03 / SE 1.62 / z -0.28 (filed: within the allowance; 1315 aimed); Z +0.70 against 3.0, e* 3.33, mean excess +0.74 (reported); paired SE 1.12 (set 1, 272 games, z +1.71), 1.23 (set 2, 272 games, z -0.37); paired Z +0.95 (reported, never graded)
- DESPERATION composition, set 1: base dirty 51.33% / clean 48.67% -> arm dirty 50.10% / clean 49.90%; the class's rise +0.13, re-weighted to the base's composition +0.07 (reported)
- DESPERATION composition, set 2: base dirty 53.14% / clean 46.86% -> arm dirty 52.36% / clean 47.64%; the class's rise -0.41, re-weighted to the base's composition -0.46 (reported)
- checkdown looks by trigger: base set 1 5529 looks (threat part 4078, status part 4097, count part 1657; rule part 4078 under PER_RUSHER: rule only 3872, count only 1451, both 206, neither 0); set 2 5556 looks (threat part 4335, status part 4360, count part 1408; rule part 4335 under PER_RUSHER: rule only 4148, count only 1221, both 187, neither 0); arm set 1 5582 looks (threat part 4057, status part 4076, count part 1760; rule part 4057 under PER_RUSHER: rule only 3822, count only 1525, both 235, neither 0); set 2 5766 looks (threat part 4422, status part 4454, count part 1562; rule part 4422 under PER_RUSHER: rule only 4204, count only 1344, both 218, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 80.93% / count 19.07% / status 0.00% / none 0.00% -> arm threat 80.78% / count 19.22% / status 0.00% / none 0.00%; the class's rise -0.79, re-weighted to the base's composition -0.79 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 84.21% / count 15.79% / status 0.00% / none 0.00% -> arm threat 83.21% / count 16.79% / status 0.00% / none 0.00%; the class's rise -0.57, re-weighted to the base's composition -0.56 (reported)

### C11 against B3, flat (graded)

- league-wide: set 1 2.83 -> 2.76, rise -0.07 / allowed -0.00 / SE 0.12 / z -0.59 (filed: within the allowance; 39996 aimed); set 2 2.75 -> 2.77, rise +0.02 / allowed -0.00 / SE 0.12 / z +0.15 (filed: above the allowance; 40031 aimed); Z -0.31 against 2.0, e* 0.16, mean excess -0.03: PASS; paired SE 0.08 (set 1, 496 games, z -0.88), 0.08 (set 2, 496 games, z +0.23); paired Z -0.46 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.33, rise -0.01 / allowed -0.01 / SE 0.06 / z -0.13 (filed: within the allowance; 20640 aimed); set 2 0.39 -> 0.36, rise -0.03 / allowed -0.00 / SE 0.06 / z -0.44 (filed: within the allowance; 20635 aimed); Z -0.41 against 3.0, e* 0.13, mean excess -0.02: PASS; paired SE 0.04 (set 1, 496 games, z -0.19), 0.04 (set 2, 496 games, z -0.68); paired Z -0.62 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.28, rise -0.42 / allowed -0.02 / SE 0.57 / z -0.71 (filed: within the allowance; 6753 aimed); set 2 11.57 -> 11.86, rise +0.29 / allowed -0.01 / SE 0.56 / z +0.54 (filed: above the allowance; 6745 aimed); Z -0.12 against 3.0, e* 1.20, mean excess -0.05: PASS; paired SE 0.39 (set 1, 496 games, z -1.04), 0.36 (set 2, 496 games, z +0.82); paired Z -0.15 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.21, rise +0.00 / allowed +0.00 / SE 0.07 / z -0.02 (filed: within the allowance; 8990 aimed); set 2 0.16 -> 0.21, rise +0.05 / allowed +0.00 / SE 0.06 / z +0.69 (filed: above the allowance; 9048 aimed); Z +0.47 against 3.0, e* 0.14, mean excess +0.02: PASS; paired SE 0.05 (set 1, 496 games, z -0.03), 0.05 (set 2, 496 games, z +0.90); paired Z +0.61 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.12, rise -0.24 / allowed +0.01 / SE 0.54 / z -0.45 (filed: within the allowance; 3400 aimed); set 2 6.32 -> 5.88, rise -0.45 / allowed -0.01 / SE 0.58 / z -0.76 (filed: within the allowance; 3404 aimed); Z -0.86 against 3.0, e* 1.18, mean excess -0.34: PASS; paired SE 0.36 (set 1, 496 games, z -0.69), 0.39 (set 2, 496 games, z -1.11); paired Z -1.27 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 5.63, rise +0.19 / allowed -0.01 / SE 2.45 / z +0.08 (filed: above the allowance; 213 aimed); set 2 9.16 -> 6.53, rise -2.63 / allowed -0.05 / SE 3.07 / z -0.84 (filed: within the allowance; 199 aimed); Z -0.54 against 3.0, e* 5.78, mean excess -1.19: PASS; paired SE 1.90 (set 1, 496 games, z +0.11), 2.76 (set 2, 496 games, z -0.93); paired Z -0.59 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 872 / 32; set 2 base 981 aimed / 41 INT -> arm 972 / 50; set 1 4.22 -> 3.67, rise -0.55 / allowed +0.04 / SE 0.90 / z -0.66 (filed: within the allowance; 872 aimed); set 2 4.18 -> 5.14, rise +0.96 / allowed +0.02 / SE 0.95 / z +0.99 (filed: above the allowance; 972 aimed); Z +0.24 against 3.0, e* 1.97, mean excess +0.18 (reported); paired SE 0.64 (set 1, 496 games, z -0.93), 0.62 (set 2, 496 games, z +1.52); paired Z +0.42 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2528 / 142; set 2 base 2450 aimed / 176 INT -> arm 2432 / 150; set 1 5.82 -> 5.62, rise -0.20 / allowed -0.01 / SE 0.66 / z -0.30 (filed: within the allowance; 2528 aimed); set 2 7.18 -> 6.17, rise -1.02 / allowed -0.02 / SE 0.71 / z -1.39 (filed: within the allowance; 2432 aimed); Z -1.20 against 3.0, e* 1.45, mean excess -0.60 (reported); paired SE 0.42 (set 1, 496 games, z -0.47), 0.49 (set 2, 496 games, z -2.02); paired Z -1.76 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 25.65% / clean 74.35%; the class's rise -0.24, re-weighted to the base's composition -0.30 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 28.55% / clean 71.45%; the class's rise -0.45, re-weighted to the base's composition -0.45 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 26139 looks (threat part 5176, status part 5181, count part 23648; rule part 5176 under PER_RUSHER: rule only 2491, count only 20963, both 2685, neither 0); set 2 26295 looks (threat part 5189, status part 5192, count part 23753; rule part 5189 under PER_RUSHER: rule only 2542, count only 21106, both 2647, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 20.86% / count 79.14% / status 0.00% / none 0.00%; the class's rise +0.00, re-weighted to the base's composition +0.01 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 20.80% / count 79.20% / status 0.00% / none 0.00%; the class's rise +0.05, re-weighted to the base's composition +0.05 (reported)

### C11 against B3, gen (graded)

- league-wide: set 1 7.30 -> 7.43, rise +0.13 / allowed +0.00 / SE 0.24 / z +0.52 (filed: above the allowance; 24802 aimed); set 2 7.69 -> 7.50, rise -0.19 / allowed +0.01 / SE 0.24 / z -0.85 (filed: within the allowance; 25150 aimed); Z -0.24 against 2.0, e* 0.33, mean excess -0.04: PASS; paired SE 0.15 (set 1, 272 games, z +0.81), 0.15 (set 2, 272 games, z -1.39); paired Z -0.41 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.55, rise -0.17 / allowed -0.00 / SE 0.19 / z -0.86 (filed: within the allowance; 14263 aimed); set 2 2.79 -> 2.54, rise -0.24 / allowed -0.01 / SE 0.19 / z -1.24 (filed: within the allowance; 14711 aimed); Z -1.48 against 3.0, e* 0.40, mean excess -0.20: PASS; paired SE 0.13 (set 1, 272 games, z -1.25), 0.13 (set 2, 272 games, z -1.80); paired Z -2.16 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.79, rise +1.05 / allowed -0.01 / SE 0.89 / z +1.19 (filed: above the allowance; 4122 aimed); set 2 20.68 -> 20.47, rise -0.21 / allowed +0.02 / SE 0.89 / z -0.26 (filed: within the allowance; 4177 aimed); Z +0.66 against 3.0, e* 1.89, mean excess +0.42: PASS; paired SE 0.60 (set 1, 272 games, z +1.76), 0.61 (set 2, 272 games, z -0.38); paired Z +0.97 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 2.78, rise -0.43 / allowed +0.04 / SE 0.41 / z -1.15 (filed: within the allowance; 3383 aimed); set 2 3.75 -> 3.88, rise +0.14 / allowed +0.05 / SE 0.48 / z +0.19 (filed: above the allowance; 3141 aimed); Z -0.68 against 3.0, e* 0.93, mean excess -0.19: PASS; paired SE 0.29 (set 1, 272 games, z -1.61), 0.35 (set 2, 272 games, z +0.26); paired Z -0.95 (reported, never graded)
- DESPERATION: set 1 16.61 -> 17.48, rise +0.86 / allowed +0.00 / SE 0.99 / z +0.87 (filed: above the allowance; 2918 aimed); set 2 18.18 -> 17.26, rise -0.92 / allowed +0.03 / SE 0.98 / z -0.97 (filed: within the allowance; 3025 aimed); Z -0.07 against 3.0, e* 2.09, mean excess -0.05: PASS; paired SE 0.65 (set 1, 272 games, z +1.33), 0.69 (set 2, 272 games, z -1.38); paired Z -0.03 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 15.52, rise -4.48 / allowed +0.12 / SE 5.84 / z -0.79 (filed: within the allowance; 116 aimed); set 2 8.45 -> 13.54, rise +5.09 / allowed +0.33 / SE 4.81 / z +0.99 (filed: above the allowance; 96 aimed); Z +0.14 against 3.0, e* 11.19, mean excess +0.08: PASS; paired SE 5.05 (set 1, 272 games, z -0.91), 3.92 (set 2, 272 games, z +1.21); paired Z +0.21 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 1026 / 162; set 2 base 1216 aimed / 203 INT -> arm 1217 / 188; set 1 14.26 -> 15.79, rise +1.53 / allowed +0.05 / SE 1.57 / z +0.94 (filed: above the allowance; 1026 aimed); set 2 16.69 -> 15.45, rise -1.25 / allowed +0.08 / SE 1.49 / z -0.89 (filed: within the allowance; 1217 aimed); Z +0.04 against 3.0, e* 3.24, mean excess +0.08 (reported); paired SE 1.23 (set 1, 272 games, z +1.20), 1.07 (set 2, 272 games, z -1.24); paired Z -0.03 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1892 / 348; set 2 base 1815 aimed / 348 INT -> arm 1808 / 334; set 1 17.97 -> 18.39, rise +0.42 / allowed -0.03 / SE 1.26 / z +0.36 (filed: above the allowance; 1892 aimed); set 2 19.17 -> 18.47, rise -0.70 / allowed -0.00 / SE 1.30 / z -0.54 (filed: within the allowance; 1808 aimed); Z -0.13 against 3.0, e* 2.72, mean excess -0.12 (reported); paired SE 0.82 (set 1, 272 games, z +0.55), 0.84 (set 2, 272 games, z -0.83); paired Z -0.20 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 35.16% / clean 64.84%; the class's rise +0.86, re-weighted to the base's composition +0.83 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 40.23% / clean 59.77%; the class's rise -0.92, re-weighted to the base's composition -0.92 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8533 looks (threat part 3327, status part 3331, count part 6086; rule part 3327 under PER_RUSHER: rule only 2447, count only 5206, both 880, neither 0); set 2 7681 looks (threat part 3684, status part 3686, count part 4760; rule part 3684 under PER_RUSHER: rule only 2921, count only 3997, both 763, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 43.93% / count 56.07% / status 0.00% / none 0.00%; the class's rise -0.43, re-weighted to the base's composition -0.40 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 55.08% / count 44.92% / status 0.00% / none 0.00%; the class's rise +0.14, re-weighted to the base's composition +0.17 (reported)

### C1 against A0, flat (the cumulative line: reported, never graded)

- league-wide: set 1 2.11 -> 2.81, rise +0.70 / allowed +0.21 / SE 0.12 / z +4.06 (filed: above the allowance; 39970 aimed); set 2 1.88 -> 2.72, rise +0.83 / allowed +0.21 / SE 0.12 / z +5.38 (filed: above the allowance; 39991 aimed); Z +6.68 against 2.0, e* 0.17, mean excess +0.56: BREACH; paired SE 0.11 (set 1, 496 games, z +4.45), 0.11 (set 2, 496 games, z +5.67); paired Z +7.16 (reported, never graded)
- PROGRESSION: set 1 0.29 -> 0.33, rise +0.04 / allowed +0.19 / SE 0.06 / z -2.27 (filed: within the allowance; 20656 aimed); set 2 0.25 -> 0.35, rise +0.10 / allowed +0.18 / SE 0.06 / z -1.20 (filed: within the allowance; 20584 aimed); Z -2.45 against 3.0, e* 0.13, mean excess -0.11: PASS; paired SE 0.06 (set 1, 496 games, z -2.62), 0.06 (set 2, 496 games, z -1.31); paired Z -2.78 (reported, never graded)
- RANK_PUSHED: set 1 11.62 -> 12.37, rise +0.75 / allowed +0.22 / SE 0.68 / z +0.78 (filed: above the allowance; 6863 aimed); set 2 10.66 -> 11.81, rise +1.15 / allowed +0.25 / SE 0.66 / z +1.38 (filed: above the allowance; 6790 aimed); Z +1.53 against 3.0, e* 1.42, mean excess +0.72: PASS; paired SE 0.63 (set 1, 496 games, z +0.84), 0.63 (set 2, 496 games, z +1.44); paired Z +1.62 (reported, never graded)
- CHECKDOWN: set 1 0.24 -> 0.19, rise -0.05 / allowed +0.18 / SE 0.07 / z -3.31 (filed: within the allowance; 8870 aimed); set 2 0.19 -> 0.22, rise +0.03 / allowed +0.18 / SE 0.07 / z -2.26 (filed: within the allowance; 9047 aimed); Z -3.94 against 3.0, e* 0.14, mean excess -0.19: PASS; paired SE 0.07 (set 1, 496 games, z -3.29), 0.06 (set 2, 496 games, z -2.48); paired Z -4.08 (reported, never graded)
- DESPERATION: set 1 4.07 -> 5.16, rise +1.08 / allowed +0.37 / SE 0.57 / z +1.25 (filed: above the allowance; 3374 aimed); set 2 3.52 -> 5.44, rise +1.92 / allowed +0.38 / SE 0.56 / z +2.75 (filed: above the allowance; 3365 aimed); Z +2.83 against 3.0, e* 1.20, mean excess +1.13: PASS; paired SE 0.52 (set 1, 496 games, z +1.39), 0.52 (set 2, 496 games, z +2.96); paired Z +3.08 (reported, never graded)
- ON_THE_RUN: set 1 7.61 -> 6.28, rise -1.33 / allowed +0.39 / SE 2.20 / z -0.78 (filed: within the allowance; 207 aimed); set 2 5.85 -> 4.39, rise -1.46 / allowed +0.37 / SE 1.87 / z -0.97 (filed: within the allowance; 205 aimed); Z -1.24 against 3.0, e* 4.29, mean excess -1.77: PASS; paired SE 2.10 (set 1, 496 games, z -0.82), 1.72 (set 2, 496 games, z -1.06); paired Z -1.33 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1926 aimed / 70 INT -> arm 797 / 32; set 2 base 1896 aimed / 61 INT -> arm 809 / 36; set 1 3.63 -> 4.02, rise +0.38 / allowed +0.54 / SE 0.82 / z -0.20 (filed: within the allowance; 797 aimed); set 2 3.22 -> 4.45, rise +1.23 / allowed +0.54 / SE 0.83 / z +0.83 (filed: above the allowance; 809 aimed); Z +0.45 against 3.0, e* 1.75, mean excess +0.27 (reported); paired SE 0.74 (set 1, 496 games, z -0.21), 0.78 (set 2, 496 games, z +0.89); paired Z +0.48 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 235 aimed / 18 INT -> arm 2577 / 142; set 2 base 233 aimed / 14 INT -> arm 2556 / 147; set 1 7.66 -> 5.51, rise -2.15 / allowed +0.09 / SE 1.79 / z -1.25 (filed: within the allowance; 2577 aimed); set 2 6.01 -> 5.75, rise -0.26 / allowed +0.10 / SE 1.62 / z -0.22 (filed: within the allowance; 2556 aimed); Z -1.04 against 3.0, e* 3.61, mean excess -1.30 (reported); paired SE 1.74 (set 1, 496 games, z -1.29), 1.57 (set 2, 496 games, z -0.23); paired Z -1.07 (reported, never graded)
- DESPERATION composition, set 1: base dirty 89.13% / clean 10.87% -> arm dirty 23.62% / clean 76.38%; the class's rise +1.08, re-weighted to the base's composition +0.11 (reported)
- DESPERATION composition, set 2: base dirty 89.06% / clean 10.94% -> arm dirty 24.04% / clean 75.96%; the class's rise +1.92, re-weighted to the base's composition +1.07 (reported)
- checkdown looks by trigger: base set 1 25332 looks (threat part 21394, status part 21419, count part 12342; rule part 21419 under STEP_1: rule only 12990, count only 3913, both 8429, neither 0); set 2 25136 looks (threat part 21280, status part 21297, count part 12054; rule part 21297 under STEP_1: rule only 13082, count only 3839, both 8215, neither 0); arm set 1 25836 looks (threat part 4720, status part 4725, count part 23591; rule part 4720 under PER_RUSHER: rule only 2245, count only 21116, both 2475, neither 0); set 2 26016 looks (threat part 4740, status part 4746, count part 23701; rule part 4740 under PER_RUSHER: rule only 2315, count only 21276, both 2425, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 88.31% / count 11.68% / status 0.01% / none 0.00% -> arm threat 19.27% / count 80.73% / status 0.00% / none 0.00%; the class's rise -0.05, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 88.54% / count 11.42% / status 0.04% / none 0.00% -> arm threat 20.12% / count 79.88% / status 0.00% / none 0.00%; the class's rise +0.03, re-weighted to the base's composition n/a (reported)

### C1 against A0, gen (the cumulative line: reported, never graded)

- league-wide: set 1 6.80 -> 7.50, rise +0.70 / allowed +0.36 / SE 0.25 / z +1.37 (filed: above the allowance; 24692 aimed); set 2 7.06 -> 7.68, rise +0.63 / allowed +0.40 / SE 0.25 / z +0.91 (filed: above the allowance; 25158 aimed); Z +1.61 against 2.0, e* 0.35, mean excess +0.28: PASS; paired SE 0.26 (set 1, 272 games, z +1.33), 0.23 (set 2, 272 games, z +0.99); paired Z +1.64 (reported, never graded)
- PROGRESSION: set 1 1.96 -> 2.47, rise +0.50 / allowed +0.26 / SE 0.21 / z +1.20 (filed: above the allowance; 14236 aimed); set 2 2.34 -> 2.75, rise +0.41 / allowed +0.28 / SE 0.22 / z +0.60 (filed: above the allowance; 14794 aimed); Z +1.27 against 3.0, e* 0.45, mean excess +0.19: PASS; paired SE 0.21 (set 1, 272 games, z +1.20), 0.21 (set 2, 272 games, z +0.61); paired Z +1.28 (reported, never graded)
- RANK_PUSHED: set 1 18.87 -> 21.12, rise +2.25 / allowed +0.41 / SE 1.08 / z +1.71 (filed: above the allowance; 4157 aimed); set 2 19.64 -> 21.16, rise +1.53 / allowed +0.43 / SE 1.08 / z +1.01 (filed: above the allowance; 4139 aimed); Z +1.92 against 3.0, e* 2.29, mean excess +1.47: PASS; paired SE 0.98 (set 1, 272 games, z +1.87), 1.04 (set 2, 272 games, z +1.05); paired Z +2.07 (reported, never graded)
- CHECKDOWN: set 1 4.71 -> 2.84, rise -1.87 / allowed +0.45 / SE 0.39 / z -5.99 (filed: within the allowance; 3341 aimed); set 2 4.80 -> 3.94, rise -0.86 / allowed +0.54 / SE 0.44 / z -3.22 (filed: within the allowance; 3072 aimed); Z -6.51 against 3.0, e* 0.87, mean excess -1.86: PASS; paired SE 0.38 (set 1, 272 games, z -6.16), 0.42 (set 2, 272 games, z -3.31); paired Z -6.70 (reported, never graded)
- DESPERATION: set 1 16.29 -> 17.89, rise +1.60 / allowed +0.65 / SE 1.05 / z +0.90 (filed: above the allowance; 2845 aimed); set 2 16.77 -> 16.89, rise +0.13 / allowed +0.73 / SE 1.01 / z -0.60 (filed: within the allowance; 3072 aimed); Z +0.21 against 3.0, e* 2.19, mean excess +0.17: PASS; paired SE 1.00 (set 1, 272 games, z +0.94), 0.88 (set 2, 272 games, z -0.69); paired Z +0.18 (reported, never graded)
- ON_THE_RUN: set 1 17.10 -> 15.93, rise -1.17 / allowed +0.62 / SE 3.90 / z -0.46 (filed: within the allowance; 113 aimed); set 2 14.57 -> 12.35, rise -2.23 / allowed +0.67 / SE 4.06 / z -0.71 (filed: within the allowance; 81 aimed); Z -0.83 against 3.0, e* 8.44, mean excess -2.35: PASS; paired SE 4.12 (set 1, 272 games, z -0.43), 4.37 (set 2, 272 games, z -0.66); paired Z -0.78 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 2090 aimed / 331 INT -> arm 906 / 141; set 2 base 2219 aimed / 362 INT -> arm 1108 / 164; set 1 15.84 -> 15.56, rise -0.27 / allowed +0.73 / SE 1.45 / z -0.69 (filed: within the allowance; 906 aimed); set 2 16.31 -> 14.80, rise -1.51 / allowed +0.82 / SE 1.32 / z -1.76 (filed: within the allowance; 1108 aimed); Z -1.73 against 3.0, e* 2.93, mean excess -1.67 (reported); paired SE 1.39 (set 1, 272 games, z -0.72), 1.24 (set 2, 272 games, z -1.88); paired Z -1.84 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 236 aimed / 48 INT -> arm 1939 / 368; set 2 base 238 aimed / 50 INT -> arm 1964 / 355; set 1 20.34 -> 18.98, rise -1.36 / allowed +0.24 / SE 2.77 / z -0.58 (filed: within the allowance; 1939 aimed); set 2 21.01 -> 18.08, rise -2.93 / allowed +0.21 / SE 2.78 / z -1.13 (filed: within the allowance; 1964 aimed); Z -1.21 against 3.0, e* 5.88, mean excess -2.37 (reported); paired SE 2.64 (set 1, 272 games, z -0.60), 2.73 (set 2, 272 games, z -1.15); paired Z -1.24 (reported, never graded)
- DESPERATION composition, set 1: base dirty 89.85% / clean 10.15% -> arm dirty 31.85% / clean 68.15%; the class's rise +1.60, re-weighted to the base's composition -0.38 (reported)
- DESPERATION composition, set 2: base dirty 90.31% / clean 9.69% -> arm dirty 36.07% / clean 63.93%; the class's rise +0.13, re-weighted to the base's composition -1.65 (reported)
- checkdown looks by trigger: base set 1 14037 looks (threat part 13156, status part 13178, count part 2270; rule part 13178 under STEP_1: rule only 11767, count only 859, both 1411, neither 0); set 2 14195 looks (threat part 13469, status part 13488, count part 1638; rule part 13488 under STEP_1: rule only 12557, count only 707, both 931, neither 0); arm set 1 8394 looks (threat part 3064, status part 3068, count part 6089; rule part 3064 under PER_RUSHER: rule only 2305, count only 5330, both 759, neither 0); set 2 7452 looks (threat part 3359, status part 3361, count part 4761; rule part 3359 under PER_RUSHER: rule only 2691, count only 4093, both 668, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 95.56% / count 4.38% / status 0.06% / none 0.00% -> arm threat 41.39% / count 58.61% / status 0.00% / none 0.00%; the class's rise -1.87, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 96.56% / count 3.37% / status 0.07% / none 0.00% -> arm threat 52.31% / count 47.69% / status 0.00% / none 0.00%; the class's rise -0.86, re-weighted to the base's composition n/a (reported)

### C2 against A14, flat (the cumulative line: reported, never graded)

- league-wide: set 1 2.17 -> 2.92, rise +0.76 / allowed +0.41 / SE 0.18 / z +1.94 (filed: above the allowance; 34609 aimed); set 2 2.12 -> 2.82, rise +0.70 / allowed +0.42 / SE 0.17 / z +1.57 (filed: above the allowance; 34782 aimed); Z +2.48 against 2.0, e* 0.25, mean excess +0.31: BREACH; paired SE 0.17 (set 1, 496 games, z +2.05), 0.16 (set 2, 496 games, z +1.67); paired Z +2.64 (reported, never graded)
- PROGRESSION: set 1 0.31 -> 0.29, rise -0.01 / allowed +0.43 / SE 0.09 / z -5.18 (filed: within the allowance; 20899 aimed); set 2 0.27 -> 0.25, rise -0.02 / allowed +0.44 / SE 0.08 / z -5.64 (filed: within the allowance; 21290 aimed); Z -7.66 against 3.0, e* 0.18, mean excess -0.45: PASS; paired SE 0.08 (set 1, 496 games, z -5.37), 0.08 (set 2, 496 games, z -5.77); paired Z -7.88 (reported, never graded)
- RANK_PUSHED: set 1 11.61 -> 11.28, rise -0.33 / allowed +0.12 / SE 1.01 / z -0.45 (filed: within the allowance; 6438 aimed); set 2 10.91 -> 11.29, rise +0.38 / allowed +0.14 / SE 0.98 / z +0.25 (filed: above the allowance; 6387 aimed); Z -0.14 against 3.0, e* 2.11, mean excess -0.11: PASS; paired SE 0.92 (set 1, 496 games, z -0.49), 0.91 (set 2, 496 games, z +0.27); paired Z -0.16 (reported, never graded)
- CHECKDOWN: set 1 0.05 -> 0.12, rise +0.07 / allowed +0.46 / SE 0.08 / z -5.17 (filed: within the allowance; 4117 aimed); set 2 0.11 -> 0.20, rise +0.09 / allowed +0.47 / SE 0.10 / z -3.73 (filed: within the allowance; 4092 aimed); Z -6.29 against 3.0, e* 0.19, mean excess -0.39: PASS; paired SE 0.08 (set 1, 496 games, z -5.01), 0.10 (set 2, 496 games, z -3.70); paired Z -6.16 (reported, never graded)
- DESPERATION: set 1 4.62 -> 7.05, rise +2.43 / allowed +0.77 / SE 0.84 / z +1.98 (filed: above the allowance; 2965 aimed); set 2 4.95 -> 6.28, rise +1.33 / allowed +0.83 / SE 0.86 / z +0.59 (filed: above the allowance; 2835 aimed); Z +1.81 against 3.0, e* 1.80, mean excess +1.08: PASS; paired SE 0.79 (set 1, 496 games, z +2.11), 0.82 (set 2, 496 games, z +0.62); paired Z +1.92 (reported, never graded)
- ON_THE_RUN: set 1 5.41 -> 5.26, rise -0.14 / allowed +0.23 / SE 3.09 / z -0.12 (filed: within the allowance; 190 aimed); set 2 5.56 -> 10.67, rise +5.12 / allowed +0.09 / SE 3.88 / z +1.30 (filed: above the allowance; 178 aimed); Z +0.83 against 3.0, e* 7.30, mean excess +2.33: PASS; paired SE 3.10 (set 1, 496 games, z -0.12), 3.71 (set 2, 496 games, z +1.35); paired Z +0.87 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 772 aimed / 33 INT -> arm 1302 / 87; set 2 base 766 aimed / 33 INT -> arm 1205 / 60; set 1 4.27 -> 6.68, rise +2.41 / allowed +0.78 / SE 1.00 / z +1.62 (filed: above the allowance; 1302 aimed); set 2 4.31 -> 4.98, rise +0.67 / allowed +0.82 / SE 0.96 / z -0.15 (filed: within the allowance; 1205 aimed); Z +1.04 against 3.0, e* 2.09, mean excess +0.74 (reported); paired SE 0.92 (set 1, 496 games, z +1.77), 0.95 (set 2, 496 games, z -0.16); paired Z +1.14 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 138 aimed / 9 INT -> arm 1663 / 122; set 2 base 123 aimed / 11 INT -> arm 1630 / 118; set 1 6.52 -> 7.34, rise +0.81 / allowed -0.18 / SE 2.20 / z +0.45 (filed: above the allowance; 1663 aimed); set 2 8.94 -> 7.24, rise -1.70 / allowed -0.29 / SE 2.65 / z -0.53 (filed: within the allowance; 1630 aimed); Z -0.06 against 3.0, e* 5.10, mean excess -0.21 (reported); paired SE 2.16 (set 1, 496 games, z +0.46), 2.55 (set 2, 496 games, z -0.55); paired Z -0.07 (reported, never graded)
- DESPERATION composition, set 1: base dirty 84.84% / clean 15.16% -> arm dirty 43.91% / clean 56.09%; the class's rise +2.43, re-weighted to the base's composition +2.17 (reported)
- DESPERATION composition, set 2: base dirty 86.16% / clean 13.84% -> arm dirty 42.50% / clean 57.50%; the class's rise +1.33, re-weighted to the base's composition +0.34 (reported)
- checkdown looks by trigger: base set 1 5086 looks (threat part 4442, status part 4574, count part 786; rule part 4574 under STEP_1: rule only 4300, count only 512, both 274, neither 0); set 2 5168 looks (threat part 4479, status part 4612, count part 798; rule part 4612 under STEP_1: rule only 4370, count only 556, both 242, neither 0); arm set 1 11849 looks (threat part 7034, status part 7097, count part 5580; rule part 7034 under PER_RUSHER: rule only 6269, count only 4815, both 765, neither 0); set 2 11627 looks (threat part 6970, status part 7026, count part 5410; rule part 6970 under PER_RUSHER: rule only 6217, count only 4657, both 753, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 90.95% / count 6.88% / status 2.17% / none 0.00% -> arm threat 66.29% / count 33.71% / status 0.00% / none 0.00%; the class's rise +0.07, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 91.07% / count 6.94% / status 1.99% / none 0.00% -> arm threat 67.79% / count 32.21% / status 0.00% / none 0.00%; the class's rise +0.09, re-weighted to the base's composition n/a (reported)

### C2 against A14, gen (the cumulative line: reported, never graded)

- league-wide: set 1 6.83 -> 7.13, rise +0.30 / allowed +0.55 / SE 0.35 / z -0.71 (filed: within the allowance; 21787 aimed); set 2 7.02 -> 7.66, rise +0.64 / allowed +0.52 / SE 0.35 / z +0.32 (filed: above the allowance; 22024 aimed); Z -0.27 against 2.0, e* 0.49, mean excess -0.07: PASS; paired SE 0.32 (set 1, 272 games, z -0.78), 0.33 (set 2, 272 games, z +0.34); paired Z -0.31 (reported, never graded)
- PROGRESSION: set 1 1.42 -> 2.29, rise +0.87 / allowed +0.55 / SE 0.24 / z +1.34 (filed: above the allowance; 13058 aimed); set 2 2.00 -> 2.62, rise +0.62 / allowed +0.55 / SE 0.26 / z +0.27 (filed: above the allowance; 13001 aimed); Z +1.14 against 3.0, e* 0.53, mean excess +0.19: PASS; paired SE 0.23 (set 1, 272 games, z +1.38), 0.25 (set 2, 272 games, z +0.28); paired Z +1.18 (reported, never graded)
- RANK_PUSHED: set 1 19.55 -> 20.24, rise +0.69 / allowed +0.13 / SE 1.72 / z +0.33 (filed: above the allowance; 3631 aimed); set 2 21.19 -> 20.63, rise -0.56 / allowed +0.09 / SE 1.65 / z -0.39 (filed: within the allowance; 3616 aimed); Z -0.05 against 3.0, e* 3.57, mean excess -0.04: PASS; paired SE 1.67 (set 1, 272 games, z +0.34), 1.62 (set 2, 272 games, z -0.40); paired Z -0.04 (reported, never graded)
- CHECKDOWN: set 1 4.09 -> 3.13, rise -0.96 / allowed +0.35 / SE 0.66 / z -1.97 (filed: within the allowance; 2362 aimed); set 2 4.73 -> 3.56, rise -1.17 / allowed +0.30 / SE 0.67 / z -2.19 (filed: within the allowance; 2502 aimed); Z -2.94 against 3.0, e* 1.41, mean excess -1.39: PASS; paired SE 0.65 (set 1, 272 games, z -2.02), 0.66 (set 2, 272 games, z -2.24); paired Z -3.01 (reported, never graded)
- DESPERATION: set 1 18.18 -> 16.30, rise -1.88 / allowed +1.06 / SE 1.33 / z -2.20 (filed: within the allowance; 2619 aimed); set 2 16.06 -> 18.08, rise +2.02 / allowed +0.99 / SE 1.26 / z +0.82 (filed: above the allowance; 2760 aimed); Z -0.98 against 3.0, e* 2.74, mean excess -0.95: PASS; paired SE 1.14 (set 1, 272 games, z -2.58), 1.29 (set 2, 272 games, z +0.79); paired Z -1.26 (reported, never graded)
- ON_THE_RUN: set 1 26.88 -> 15.38, rise -11.50 / allowed +0.15 / SE 5.68 / z -2.05 (filed: within the allowance; 117 aimed); set 2 17.65 -> 7.59, rise -10.06 / allowed +0.04 / SE 5.12 / z -1.97 (filed: within the allowance; 145 aimed); Z -2.84 against 3.0, e* 11.42, mean excess -10.87: PASS; paired SE 5.35 (set 1, 272 games, z -2.18), 5.00 (set 2, 272 games, z -2.02); paired Z -2.96 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1089 aimed / 197 INT -> arm 1312 / 179; set 2 base 1158 aimed / 178 INT -> arm 1445 / 223; set 1 18.09 -> 13.64, rise -4.45 / allowed +1.01 / SE 1.50 / z -3.63 (filed: within the allowance; 1312 aimed); set 2 15.37 -> 15.43, rise +0.06 / allowed +1.01 / SE 1.42 / z -0.67 (filed: within the allowance; 1445 aimed); Z -3.04 against 3.0, e* 3.10, mean excess -3.21 (reported); paired SE 1.42 (set 1, 272 games, z -3.86), 1.50 (set 2, 272 games, z -0.63); paired Z -3.18 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 99 aimed / 19 INT -> arm 1307 / 248; set 2 base 131 aimed / 29 INT -> arm 1315 / 276; set 1 19.19 -> 18.97, rise -0.22 / allowed -0.21 / SE 4.10 / z -0.00 (filed: within the allowance; 1307 aimed); set 2 22.14 -> 20.99, rise -1.15 / allowed -0.30 / SE 3.80 / z -0.22 (filed: within the allowance; 1315 aimed); Z -0.16 against 3.0, e* 8.37, mean excess -0.43 (reported); paired SE 3.80 (set 1, 272 games, z -0.00), 3.57 (set 2, 272 games, z -0.24); paired Z -0.17 (reported, never graded)
- DESPERATION composition, set 1: base dirty 91.67% / clean 8.33% -> arm dirty 50.10% / clean 49.90%; the class's rise -1.88, re-weighted to the base's composition -4.09 (reported)
- DESPERATION composition, set 2: base dirty 89.84% / clean 10.16% -> arm dirty 52.36% / clean 47.64%; the class's rise +2.02, re-weighted to the base's composition -0.06 (reported)
- checkdown looks by trigger: base set 1 2766 looks (threat part 2544, status part 2605, count part 220; rule part 2605 under STEP_1: rule only 2546, count only 161, both 59, neither 0); set 2 3040 looks (threat part 2809, status part 2879, count part 231; rule part 2879 under STEP_1: rule only 2809, count only 161, both 70, neither 0); arm set 1 5582 looks (threat part 4057, status part 4076, count part 1760; rule part 4057 under PER_RUSHER: rule only 3822, count only 1525, both 235, neither 0); set 2 5766 looks (threat part 4422, status part 4454, count part 1562; rule part 4422 under PER_RUSHER: rule only 4204, count only 1344, both 218, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 94.58% / count 3.69% / status 1.73% / none 0.00% -> arm threat 80.78% / count 19.22% / status 0.00% / none 0.00%; the class's rise -0.96, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 95.34% / count 2.85% / status 1.81% / none 0.00% -> arm threat 83.21% / count 16.79% / status 0.00% / none 0.00%; the class's rise -1.17, re-weighted to the base's composition n/a (reported)

### C1 against A1, flat (the accepted state: reported, never graded)

- league-wide: set 1 2.64 -> 2.81, rise +0.17 / allowed +0.01 / SE 0.12 / z +1.40 (filed: above the allowance; 39970 aimed); set 2 2.71 -> 2.72, rise +0.01 / allowed +0.01 / SE 0.12 / z +0.06 (filed: above the allowance; 39991 aimed); Z +1.03 against 2.0, e* 0.16, mean excess +0.08: PASS; paired SE 0.09 (set 1, 496 games, z +1.84), 0.09 (set 2, 496 games, z +0.08); paired Z +1.36 (reported, never graded)
- PROGRESSION: set 1 0.30 -> 0.33, rise +0.04 / allowed +0.00 / SE 0.06 / z +0.65 (filed: above the allowance; 20656 aimed); set 2 0.32 -> 0.35, rise +0.04 / allowed +0.00 / SE 0.06 / z +0.63 (filed: above the allowance; 20584 aimed); Z +0.90 against 3.0, e* 0.12, mean excess +0.04: PASS; paired SE 0.04 (set 1, 496 games, z +0.86), 0.04 (set 2, 496 games, z +0.93); paired Z +1.27 (reported, never graded)
- RANK_PUSHED: set 1 12.04 -> 12.37, rise +0.33 / allowed -0.01 / SE 0.57 / z +0.61 (filed: above the allowance; 6863 aimed); set 2 11.76 -> 11.81, rise +0.05 / allowed -0.01 / SE 0.56 / z +0.12 (filed: above the allowance; 6790 aimed); Z +0.51 against 3.0, e* 1.19, mean excess +0.20: PASS; paired SE 0.44 (set 1, 496 games, z +0.78), 0.43 (set 2, 496 games, z +0.15); paired Z +0.66 (reported, never graded)
- CHECKDOWN: set 1 0.17 -> 0.19, rise +0.02 / allowed +0.01 / SE 0.06 / z +0.11 (filed: above the allowance; 8870 aimed); set 2 0.23 -> 0.22, rise -0.01 / allowed +0.01 / SE 0.07 / z -0.23 (filed: within the allowance; 9047 aimed); Z -0.08 against 3.0, e* 0.14, mean excess -0.00: PASS; paired SE 0.06 (set 1, 496 games, z +0.12), 0.06 (set 2, 496 games, z -0.28); paired Z -0.11 (reported, never graded)
- DESPERATION: set 1 5.13 -> 5.16, rise +0.02 / allowed +0.05 / SE 0.54 / z -0.04 (filed: within the allowance; 3374 aimed); set 2 5.42 -> 5.44, rise +0.02 / allowed +0.02 / SE 0.55 / z -0.01 (filed: within the allowance; 3365 aimed); Z -0.03 against 3.0, e* 1.16, mean excess -0.01: PASS; paired SE 0.41 (set 1, 496 games, z -0.05), 0.42 (set 2, 496 games, z -0.01); paired Z -0.04 (reported, never graded)
- ON_THE_RUN: set 1 6.45 -> 6.28, rise -0.17 / allowed +0.14 / SE 2.60 / z -0.12 (filed: within the allowance; 207 aimed); set 2 13.48 -> 4.39, rise -9.08 / allowed +0.11 / SE 3.21 / z -2.86 (filed: within the allowance; 205 aimed); Z -2.11 against 3.0, e* 6.09, mean excess -4.75: PASS; paired SE 2.33 (set 1, 496 games, z -0.13), 2.83 (set 2, 496 games, z -3.25); paired Z -2.39 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1054 aimed / 43 INT -> arm 797 / 32; set 2 base 1132 aimed / 44 INT -> arm 809 / 36; set 1 4.08 -> 4.02, rise -0.06 / allowed +0.19 / SE 0.92 / z -0.28 (filed: within the allowance; 797 aimed); set 2 3.89 -> 4.45, rise +0.56 / allowed +0.17 / SE 0.92 / z +0.43 (filed: above the allowance; 809 aimed); Z +0.10 against 3.0, e* 1.96, mean excess +0.07 (reported); paired SE 0.74 (set 1, 496 games, z -0.35), 0.75 (set 2, 496 games, z +0.53); paired Z +0.13 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2199 aimed / 124 INT -> arm 2577 / 142; set 2 base 2338 aimed / 144 INT -> arm 2556 / 147; set 1 5.64 -> 5.51, rise -0.13 / allowed -0.00 / SE 0.67 / z -0.19 (filed: within the allowance; 2577 aimed); set 2 6.16 -> 5.75, rise -0.41 / allowed -0.03 / SE 0.68 / z -0.56 (filed: within the allowance; 2556 aimed); Z -0.53 against 3.0, e* 1.43, mean excess -0.25 (reported); paired SE 0.50 (set 1, 496 games, z -0.25), 0.51 (set 2, 496 games, z -0.76); paired Z -0.71 (reported, never graded)
- DESPERATION composition, set 1: base dirty 32.40% / clean 67.60% -> arm dirty 23.62% / clean 76.38%; the class's rise +0.02, re-weighted to the base's composition -0.11 (reported)
- DESPERATION composition, set 2: base dirty 32.62% / clean 67.38% -> arm dirty 24.04% / clean 75.96%; the class's rise +0.02, re-weighted to the base's composition -0.09 (reported)
- checkdown looks by trigger: base set 1 26751 looks (threat part 7924, status part 7925, count part 22307; rule part 7925 under STEP_1: rule only 4444, count only 18826, both 3481, neither 0); set 2 27286 looks (threat part 8205, status part 8208, count part 22751; rule part 8208 under STEP_1: rule only 4535, count only 19078, both 3673, neither 0); arm set 1 25836 looks (threat part 4720, status part 4725, count part 23591; rule part 4720 under PER_RUSHER: rule only 2245, count only 21116, both 2475, neither 0); set 2 26016 looks (threat part 4740, status part 4746, count part 23701; rule part 4740 under PER_RUSHER: rule only 2315, count only 21276, both 2425, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 33.57% / count 66.43% / status 0.00% / none 0.00% -> arm threat 19.27% / count 80.73% / status 0.00% / none 0.00%; the class's rise +0.02, re-weighted to the base's composition +0.06 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 32.96% / count 67.03% / status 0.01% / none 0.00% -> arm threat 20.12% / count 79.88% / status 0.00% / none 0.00%; the class's rise -0.01, re-weighted to the base's composition n/a (reported)

### C1 against A1, gen (the accepted state: reported, never graded)

- league-wide: set 1 7.67 -> 7.50, rise -0.17 / allowed +0.02 / SE 0.24 / z -0.80 (filed: within the allowance; 24692 aimed); set 2 7.74 -> 7.68, rise -0.06 / allowed +0.03 / SE 0.24 / z -0.39 (filed: within the allowance; 25158 aimed); Z -0.84 against 2.0, e* 0.34, mean excess -0.14: PASS; paired SE 0.19 (set 1, 272 games, z -1.02), 0.16 (set 2, 272 games, z -0.59); paired Z -1.14 (reported, never graded)
- PROGRESSION: set 1 2.50 -> 2.47, rise -0.04 / allowed +0.01 / SE 0.19 / z -0.24 (filed: within the allowance; 14236 aimed); set 2 2.66 -> 2.75, rise +0.09 / allowed +0.02 / SE 0.19 / z +0.38 (filed: above the allowance; 14794 aimed); Z +0.10 against 3.0, e* 0.40, mean excess +0.01: PASS; paired SE 0.14 (set 1, 272 games, z -0.32), 0.15 (set 2, 272 games, z +0.49); paired Z +0.12 (reported, never graded)
- RANK_PUSHED: set 1 21.51 -> 21.12, rise -0.39 / allowed -0.00 / SE 0.91 / z -0.43 (filed: within the allowance; 4157 aimed); set 2 20.89 -> 21.16, rise +0.27 / allowed -0.00 / SE 0.91 / z +0.31 (filed: above the allowance; 4139 aimed); Z -0.09 against 3.0, e* 1.93, mean excess -0.06: PASS; paired SE 0.64 (set 1, 272 games, z -0.61), 0.68 (set 2, 272 games, z +0.41); paired Z -0.14 (reported, never graded)
- CHECKDOWN: set 1 3.65 -> 2.84, rise -0.81 / allowed +0.09 / SE 0.42 / z -2.14 (filed: within the allowance; 3341 aimed); set 2 4.17 -> 3.94, rise -0.23 / allowed +0.12 / SE 0.48 / z -0.73 (filed: within the allowance; 3072 aimed); Z -2.03 against 3.0, e* 0.95, mean excess -0.63: PASS; paired SE 0.38 (set 1, 272 games, z -2.37), 0.37 (set 2, 272 games, z -0.95); paired Z -2.35 (reported, never graded)
- DESPERATION: set 1 17.16 -> 17.89, rise +0.73 / allowed +0.06 / SE 0.99 / z +0.68 (filed: above the allowance; 2845 aimed); set 2 17.54 -> 16.89, rise -0.64 / allowed +0.11 / SE 0.96 / z -0.78 (filed: within the allowance; 3072 aimed); Z -0.07 against 3.0, e* 2.07, mean excess -0.04: PASS; paired SE 0.80 (set 1, 272 games, z +0.84), 0.69 (set 2, 272 games, z -1.08); paired Z -0.17 (reported, never graded)
- ON_THE_RUN: set 1 17.04 -> 15.93, rise -1.11 / allowed +0.50 / SE 4.72 / z -0.34 (filed: within the allowance; 113 aimed); set 2 16.00 -> 12.35, rise -3.65 / allowed +0.47 / SE 4.72 / z -0.87 (filed: within the allowance; 81 aimed); Z -0.86 against 3.0, e* 10.02, mean excess -2.87: PASS; paired SE 4.49 (set 1, 272 games, z -0.36), 4.27 (set 2, 272 games, z -0.96); paired Z -0.94 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1227 aimed / 185 INT -> arm 906 / 141; set 2 base 1357 aimed / 206 INT -> arm 1108 / 164; set 1 15.08 -> 15.56, rise +0.49 / allowed +0.21 / SE 1.58 / z +0.18 (filed: above the allowance; 906 aimed); set 2 15.18 -> 14.80, rise -0.38 / allowed +0.31 / SE 1.44 / z -0.48 (filed: within the allowance; 1108 aimed); Z -0.21 against 3.0, e* 3.20, mean excess -0.21 (reported); paired SE 1.28 (set 1, 272 games, z +0.22), 1.19 (set 2, 272 games, z -0.58); paired Z -0.26 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1798 aimed / 334 INT -> arm 1939 / 368; set 2 base 1756 aimed / 340 INT -> arm 1964 / 355; set 1 18.58 -> 18.98, rise +0.40 / allowed -0.04 / SE 1.28 / z +0.35 (filed: above the allowance; 1939 aimed); set 2 19.36 -> 18.08, rise -1.29 / allowed -0.05 / SE 1.28 / z -0.97 (filed: within the allowance; 1964 aimed); Z -0.44 against 3.0, e* 2.72, mean excess -0.40 (reported); paired SE 1.02 (set 1, 272 games, z +0.43), 0.96 (set 2, 272 games, z -1.29); paired Z -0.61 (reported, never graded)
- DESPERATION composition, set 1: base dirty 40.56% / clean 59.44% -> arm dirty 31.85% / clean 68.15%; the class's rise +0.73, re-weighted to the base's composition +0.44 (reported)
- DESPERATION composition, set 2: base dirty 43.59% / clean 56.41% -> arm dirty 36.07% / clean 63.93%; the class's rise -0.64, re-weighted to the base's composition -0.89 (reported)
- checkdown looks by trigger: base set 1 9397 looks (threat part 4660, status part 4661, count part 5596; rule part 4661 under STEP_1: rule only 3801, count only 4736, both 860, neither 0); set 2 8677 looks (threat part 4874, status part 4876, count part 4448; rule part 4876 under STEP_1: rule only 4229, count only 3801, both 647, neither 0); arm set 1 8394 looks (threat part 3064, status part 3068, count part 6089; rule part 3064 under PER_RUSHER: rule only 2305, count only 5330, both 759, neither 0); set 2 7452 looks (threat part 3359, status part 3361, count part 4761; rule part 3359 under PER_RUSHER: rule only 2691, count only 4093, both 668, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 55.82% / count 44.18% / status 0.00% / none 0.00% -> arm threat 41.39% / count 58.61% / status 0.00% / none 0.00%; the class's rise -0.81, re-weighted to the base's composition -0.67 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 64.14% / count 35.83% / status 0.03% / none 0.00% -> arm threat 52.31% / count 47.69% / status 0.00% / none 0.00%; the class's rise -0.23, re-weighted to the base's composition n/a (reported)

### C2 against A11, flat (the accepted state: reported, never graded)

- league-wide: set 1 2.86 -> 2.92, rise +0.06 / allowed -0.01 / SE 0.13 / z +0.54 (filed: above the allowance; 34609 aimed); set 2 2.85 -> 2.82, rise -0.03 / allowed -0.01 / SE 0.13 / z -0.13 (filed: within the allowance; 34782 aimed); Z +0.29 against 2.0, e* 0.18, mean excess +0.03: PASS; paired SE 0.10 (set 1, 496 games, z +0.73), 0.10 (set 2, 496 games, z -0.17); paired Z +0.39 (reported, never graded)
- PROGRESSION: set 1 0.29 -> 0.29, rise +0.01 / allowed -0.01 / SE 0.05 / z +0.30 (filed: above the allowance; 20899 aimed); set 2 0.31 -> 0.25, rise -0.06 / allowed -0.02 / SE 0.05 / z -0.78 (filed: within the allowance; 21290 aimed); Z -0.34 against 3.0, e* 0.11, mean excess -0.01: PASS; paired SE 0.04 (set 1, 496 games, z +0.45), 0.05 (set 2, 496 games, z -0.91); paired Z -0.33 (reported, never graded)
- RANK_PUSHED: set 1 11.40 -> 11.28, rise -0.13 / allowed -0.02 / SE 0.57 / z -0.19 (filed: within the allowance; 6438 aimed); set 2 11.94 -> 11.29, rise -0.65 / allowed -0.01 / SE 0.57 / z -1.12 (filed: within the allowance; 6387 aimed); Z -0.93 against 3.0, e* 1.21, mean excess -0.38: PASS; paired SE 0.44 (set 1, 496 games, z -0.25), 0.45 (set 2, 496 games, z -1.43); paired Z -1.19 (reported, never graded)
- CHECKDOWN: set 1 0.18 -> 0.12, rise -0.06 / allowed +0.00 / SE 0.08 / z -0.78 (filed: within the allowance; 4117 aimed); set 2 0.12 -> 0.20, rise +0.08 / allowed +0.03 / SE 0.09 / z +0.57 (filed: above the allowance; 4092 aimed); Z -0.15 against 3.0, e* 0.18, mean excess -0.01: PASS; paired SE 0.08 (set 1, 496 games, z -0.84), 0.07 (set 2, 496 games, z +0.75); paired Z -0.06 (reported, never graded)
- DESPERATION: set 1 6.41 -> 7.05, rise +0.64 / allowed +0.03 / SE 0.65 / z +0.93 (filed: above the allowance; 2965 aimed); set 2 5.24 -> 6.28, rise +1.04 / allowed -0.00 / SE 0.62 / z +1.67 (filed: above the allowance; 2835 aimed); Z +1.84 against 3.0, e* 1.35, mean excess +0.82: PASS; paired SE 0.49 (set 1, 496 games, z +1.23), 0.48 (set 2, 496 games, z +2.17); paired Z +2.41 (reported, never graded)
- ON_THE_RUN: set 1 5.56 -> 5.26, rise -0.29 / allowed -0.19 / SE 2.50 / z -0.04 (filed: within the allowance; 190 aimed); set 2 3.52 -> 10.67, rise +7.15 / allowed -0.11 / SE 2.78 / z +2.61 (filed: above the allowance; 178 aimed); Z +1.81 against 3.0, e* 5.59, mean excess +3.58: PASS; paired SE 1.72 (set 1, 496 games, z -0.06), 2.51 (set 2, 496 games, z +2.90); paired Z +2.00 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1290 aimed / 74 INT -> arm 1302 / 87; set 2 base 1180 aimed / 50 INT -> arm 1205 / 60; set 1 5.74 -> 6.68, rise +0.95 / allowed +0.05 / SE 0.95 / z +0.95 (filed: above the allowance; 1302 aimed); set 2 4.24 -> 4.98, rise +0.74 / allowed +0.04 / SE 0.86 / z +0.82 (filed: above the allowance; 1205 aimed); Z +1.25 against 3.0, e* 1.91, mean excess +0.80 (reported); paired SE 0.78 (set 1, 496 games, z +1.15), 0.68 (set 2, 496 games, z +1.03); paired Z +1.54 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1613 aimed / 112 INT -> arm 1663 / 122; set 2 base 1588 aimed / 95 INT -> arm 1630 / 118; set 1 6.94 -> 7.34, rise +0.39 / allowed +0.02 / SE 0.90 / z +0.42 (filed: above the allowance; 1663 aimed); set 2 5.98 -> 7.24, rise +1.26 / allowed -0.03 / SE 0.88 / z +1.47 (filed: above the allowance; 1630 aimed); Z +1.33 against 3.0, e* 1.88, mean excess +0.83 (reported); paired SE 0.66 (set 1, 496 games, z +0.57), 0.65 (set 2, 496 games, z +1.97); paired Z +1.79 (reported, never graded)
- DESPERATION composition, set 1: base dirty 44.44% / clean 55.56% -> arm dirty 43.91% / clean 56.09%; the class's rise +0.64, re-weighted to the base's composition +0.64 (reported)
- DESPERATION composition, set 2: base dirty 42.63% / clean 57.37% -> arm dirty 42.50% / clean 57.50%; the class's rise +1.04, re-weighted to the base's composition +1.04 (reported)
- checkdown looks by trigger: base set 1 12686 looks (threat part 8125, status part 8224, count part 5388; rule part 8224 under STEP_1: rule only 7298, count only 4462, both 926, neither 0); set 2 12502 looks (threat part 8075, status part 8187, count part 5208; rule part 8187 under STEP_1: rule only 7294, count only 4315, both 893, neither 0); arm set 1 11849 looks (threat part 7034, status part 7097, count part 5580; rule part 7034 under PER_RUSHER: rule only 6269, count only 4815, both 765, neither 0); set 2 11627 looks (threat part 6970, status part 7026, count part 5410; rule part 6970 under PER_RUSHER: rule only 6217, count only 4657, both 753, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 69.10% / count 30.69% / status 0.21% / none 0.00% -> arm threat 66.29% / count 33.71% / status 0.00% / none 0.00%; the class's rise -0.06, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 70.01% / count 29.87% / status 0.12% / none 0.00% -> arm threat 67.79% / count 32.21% / status 0.00% / none 0.00%; the class's rise +0.08, re-weighted to the base's composition n/a (reported)

### C2 against A11, gen (the accepted state: reported, never graded)

- league-wide: set 1 7.25 -> 7.13, rise -0.12 / allowed -0.00 / SE 0.25 / z -0.48 (filed: within the allowance; 21787 aimed); set 2 7.91 -> 7.66, rise -0.25 / allowed -0.00 / SE 0.26 / z -0.97 (filed: within the allowance; 22024 aimed); Z -1.02 against 2.0, e* 0.36, mean excess -0.19: PASS; paired SE 0.19 (set 1, 272 games, z -0.61), 0.19 (set 2, 272 games, z -1.34); paired Z -1.38 (reported, never graded)
- PROGRESSION: set 1 2.06 -> 2.29, rise +0.23 / allowed +0.00 / SE 0.18 / z +1.26 (filed: above the allowance; 13058 aimed); set 2 2.39 -> 2.62, rise +0.24 / allowed +0.00 / SE 0.20 / z +1.20 (filed: above the allowance; 13001 aimed); Z +1.74 against 3.0, e* 0.40, mean excess +0.23: PASS; paired SE 0.14 (set 1, 272 games, z +1.71), 0.16 (set 2, 272 games, z +1.47); paired Z +2.25 (reported, never graded)
- RANK_PUSHED: set 1 21.11 -> 20.24, rise -0.87 / allowed -0.02 / SE 0.97 / z -0.87 (filed: within the allowance; 3631 aimed); set 2 21.42 -> 20.63, rise -0.79 / allowed -0.01 / SE 0.97 / z -0.80 (filed: within the allowance; 3616 aimed); Z -1.18 against 3.0, e* 2.06, mean excess -0.81: PASS; paired SE 0.71 (set 1, 272 games, z -1.20), 0.75 (set 2, 272 games, z -1.03); paired Z -1.58 (reported, never graded)
- CHECKDOWN: set 1 3.66 -> 3.13, rise -0.52 / allowed -0.02 / SE 0.52 / z -0.96 (filed: within the allowance; 2362 aimed); set 2 4.11 -> 3.56, rise -0.55 / allowed -0.04 / SE 0.54 / z -0.95 (filed: within the allowance; 2502 aimed); Z -1.36 against 3.0, e* 1.12, mean excess -0.51: PASS; paired SE 0.47 (set 1, 272 games, z -1.06), 0.46 (set 2, 272 games, z -1.11); paired Z -1.54 (reported, never graded)
- DESPERATION: set 1 16.90 -> 16.30, rise -0.59 / allowed +0.05 / SE 1.04 / z -0.62 (filed: within the allowance; 2619 aimed); set 2 19.05 -> 18.08, rise -0.97 / allowed +0.06 / SE 1.06 / z -0.98 (filed: within the allowance; 2760 aimed); Z -1.13 against 3.0, e* 2.22, mean excess -0.84: PASS; paired SE 0.78 (set 1, 272 games, z -0.82), 0.76 (set 2, 272 games, z -1.36); paired Z -1.54 (reported, never graded)
- ON_THE_RUN: set 1 16.00 -> 15.38, rise -0.62 / allowed -0.00 / SE 4.96 / z -0.12 (filed: within the allowance; 117 aimed); set 2 17.05 -> 7.59, rise -9.46 / allowed -0.09 / SE 4.57 / z -2.05 (filed: within the allowance; 145 aimed); Z -1.54 against 3.0, e* 10.09, mean excess -4.99: PASS; paired SE 4.76 (set 1, 272 games, z -0.13), 3.84 (set 2, 272 games, z -2.44); paired Z -1.82 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1296 aimed / 201 INT -> arm 1312 / 179; set 2 base 1456 aimed / 251 INT -> arm 1445 / 223; set 1 15.51 -> 13.64, rise -1.87 / allowed +0.09 / SE 1.38 / z -1.42 (filed: within the allowance; 1312 aimed); set 2 17.24 -> 15.43, rise -1.81 / allowed +0.10 / SE 1.37 / z -1.39 (filed: within the allowance; 1445 aimed); Z -1.98 against 3.0, e* 2.92, mean excess -1.93 (reported); paired SE 1.21 (set 1, 272 games, z -1.63), 1.03 (set 2, 272 games, z -1.85); paired Z -2.46 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1255 aimed / 230 INT -> arm 1307 / 248; set 2 base 1216 aimed / 258 INT -> arm 1315 / 276; set 1 18.33 -> 18.97, rise +0.65 / allowed +0.00 / SE 1.54 / z +0.42 (filed: above the allowance; 1307 aimed); set 2 21.22 -> 20.99, rise -0.23 / allowed +0.00 / SE 1.62 / z -0.14 (filed: within the allowance; 1315 aimed); Z +0.20 against 3.0, e* 3.35, mean excess +0.21 (reported); paired SE 1.09 (set 1, 272 games, z +0.59), 1.16 (set 2, 272 games, z -0.20); paired Z +0.28 (reported, never graded)
- DESPERATION composition, set 1: base dirty 50.80% / clean 49.20% -> arm dirty 50.10% / clean 49.90%; the class's rise -0.59, re-weighted to the base's composition -0.63 (reported)
- DESPERATION composition, set 2: base dirty 54.49% / clean 45.51% -> arm dirty 52.36% / clean 47.64%; the class's rise -0.97, re-weighted to the base's composition -1.09 (reported)
- checkdown looks by trigger: base set 1 5857 looks (threat part 4428, status part 4484, count part 1619; rule part 4484 under STEP_1: rule only 4238, count only 1373, both 246, neither 0); set 2 5947 looks (threat part 4672, status part 4727, count part 1457; rule part 4727 under STEP_1: rule only 4490, count only 1220, both 237, neither 0); arm set 1 5582 looks (threat part 4057, status part 4076, count part 1760; rule part 4057 under PER_RUSHER: rule only 3822, count only 1525, both 235, neither 0); set 2 5766 looks (threat part 4422, status part 4454, count part 1562; rule part 4422 under PER_RUSHER: rule only 4204, count only 1344, both 218, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 83.02% / count 16.86% / status 0.12% / none 0.00% -> arm threat 80.78% / count 19.22% / status 0.00% / none 0.00%; the class's rise -0.52, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 84.53% / count 15.16% / status 0.31% / none 0.00% -> arm threat 83.21% / count 16.79% / status 0.00% / none 0.00%; the class's rise -0.55, re-weighted to the base's composition n/a (reported)

### C3 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.80, rise -0.03 / allowed +0.00 / SE 0.12 / z -0.27 (filed: within the allowance; 40076 aimed); set 2 2.75 -> 2.77, rise +0.02 / allowed +0.00 / SE 0.12 / z +0.14 (filed: above the allowance; 40111 aimed); Z -0.09 against 2.0, e* 0.16, mean excess -0.01: PASS; paired SE 0.08 (set 1, 496 games, z -0.42), 0.07 (set 2, 496 games, z +0.22); paired Z -0.15 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.36, rise +0.01 / allowed -0.00 / SE 0.06 / z +0.29 (filed: above the allowance; 20607 aimed); set 2 0.39 -> 0.36, rise -0.03 / allowed -0.00 / SE 0.06 / z -0.54 (filed: within the allowance; 20578 aimed); Z -0.18 against 3.0, e* 0.13, mean excess -0.01: PASS; paired SE 0.03 (set 1, 496 games, z +0.51), 0.04 (set 2, 496 games, z -0.84); paired Z -0.23 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.16, rise -0.54 / allowed -0.01 / SE 0.57 / z -0.93 (filed: within the allowance; 6793 aimed); set 2 11.57 -> 11.71, rise +0.13 / allowed -0.00 / SE 0.55 / z +0.25 (filed: above the allowance; 6808 aimed); Z -0.48 against 3.0, e* 1.19, mean excess -0.20: PASS; paired SE 0.37 (set 1, 496 games, z -1.41), 0.35 (set 2, 496 games, z +0.39); paired Z -0.72 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.22, rise +0.01 / allowed +0.01 / SE 0.07 / z +0.03 (filed: above the allowance; 9044 aimed); set 2 0.16 -> 0.24, rise +0.08 / allowed +0.01 / SE 0.07 / z +1.06 (filed: above the allowance; 9065 aimed); Z +0.77 against 3.0, e* 0.14, mean excess +0.04: PASS; paired SE 0.04 (set 1, 496 games, z +0.04), 0.05 (set 2, 496 games, z +1.39); paired Z +1.02 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.43, rise +0.07 / allowed +0.03 / SE 0.55 / z +0.07 (filed: above the allowance; 3410 aimed); set 2 6.32 -> 5.86, rise -0.46 / allowed +0.01 / SE 0.58 / z -0.82 (filed: within the allowance; 3462 aimed); Z -0.52 against 3.0, e* 1.19, mean excess -0.21: PASS; paired SE 0.34 (set 1, 496 games, z +0.12), 0.39 (set 2, 496 games, z -1.21); paired Z -0.77 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 7.66, rise +2.22 / allowed -0.04 / SE 2.59 / z +0.87 (filed: above the allowance; 222 aimed); set 2 9.16 -> 7.58, rise -1.58 / allowed -0.09 / SE 3.14 / z -0.48 (filed: within the allowance; 198 aimed); Z +0.28 against 3.0, e* 6.02, mean excess +0.38: PASS; paired SE 2.06 (set 1, 496 games, z +1.10), 2.33 (set 2, 496 games, z -0.64); paired Z +0.32 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 982 / 33; set 2 base 981 aimed / 41 INT -> arm 1024 / 47; set 1 4.22 -> 3.36, rise -0.86 / allowed +0.04 / SE 0.86 / z -1.05 (filed: within the allowance; 982 aimed); set 2 4.18 -> 4.59, rise +0.41 / allowed +0.01 / SE 0.91 / z +0.43 (filed: above the allowance; 1024 aimed); Z -0.43 against 3.0, e* 1.88, mean excess -0.25 (reported); paired SE 0.54 (set 1, 496 games, z -1.67), 0.55 (set 2, 496 games, z +0.72); paired Z -0.68 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2428 / 152; set 2 base 2450 aimed / 176 INT -> arm 2438 / 156; set 1 5.82 -> 6.26, rise +0.44 / allowed +0.02 / SE 0.68 / z +0.61 (filed: above the allowance; 2428 aimed); set 2 7.18 -> 6.40, rise -0.78 / allowed +0.01 / SE 0.72 / z -1.10 (filed: within the allowance; 2438 aimed); Z -0.35 against 3.0, e* 1.49, mean excess -0.19 (reported); paired SE 0.43 (set 1, 496 games, z +0.98), 0.50 (set 2, 496 games, z -1.58); paired Z -0.43 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 28.80% / clean 71.20%; the class's rise +0.07, re-weighted to the base's composition +0.06 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 29.58% / clean 70.42%; the class's rise -0.46, re-weighted to the base's composition -0.44 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 26343 looks (threat part 5753, status part 5757, count part 23605; rule part 5753 under PER_RUSHER: rule only 2738, count only 20590, both 3015, neither 0); set 2 26612 looks (threat part 5716, status part 5718, count part 23807; rule part 5716 under PER_RUSHER: rule only 2805, count only 20896, both 2911, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 23.13% / count 76.87% / status 0.00% / none 0.00%; the class's rise +0.01, re-weighted to the base's composition +0.03 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 22.84% / count 77.16% / status 0.00% / none 0.00%; the class's rise +0.08, re-weighted to the base's composition +0.08 (reported)

### C3 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.50, rise +0.20 / allowed -0.00 / SE 0.24 / z +0.85 (filed: above the allowance; 24796 aimed); set 2 7.69 -> 7.84, rise +0.15 / allowed -0.00 / SE 0.24 / z +0.63 (filed: above the allowance; 25339 aimed); Z +1.05 against 2.0, e* 0.34, mean excess +0.18: PASS; paired SE 0.15 (set 1, 272 games, z +1.30), 0.15 (set 2, 272 games, z +0.98); paired Z +1.61 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.56, rise -0.15 / allowed -0.01 / SE 0.19 / z -0.75 (filed: within the allowance; 14130 aimed); set 2 2.79 -> 2.71, rise -0.08 / allowed -0.01 / SE 0.19 / z -0.34 (filed: within the allowance; 14697 aimed); Z -0.77 against 3.0, e* 0.41, mean excess -0.10: PASS; paired SE 0.12 (set 1, 272 games, z -1.21), 0.12 (set 2, 272 games, z -0.52); paired Z -1.23 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 21.00, rise +1.25 / allowed -0.01 / SE 0.89 / z +1.42 (filed: above the allowance; 4115 aimed); set 2 20.68 -> 21.20, rise +0.52 / allowed +0.00 / SE 0.90 / z +0.57 (filed: above the allowance; 4151 aimed); Z +1.41 against 3.0, e* 1.90, mean excess +0.89: PASS; paired SE 0.54 (set 1, 272 games, z +2.34), 0.63 (set 2, 272 games, z +0.82); paired Z +2.23 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 3.22, rise +0.01 / allowed +0.01 / SE 0.42 / z -0.01 (filed: within the allowance; 3541 aimed); set 2 3.75 -> 3.87, rise +0.12 / allowed +0.01 / SE 0.47 / z +0.24 (filed: above the allowance; 3256 aimed); Z +0.16 against 3.0, e* 0.94, mean excess +0.05: PASS; paired SE 0.29 (set 1, 272 games, z -0.01), 0.33 (set 2, 272 games, z +0.34); paired Z +0.23 (reported, never graded)
- DESPERATION: set 1 16.61 -> 17.45, rise +0.83 / allowed +0.00 / SE 0.99 / z +0.84 (filed: above the allowance; 2912 aimed); set 2 18.18 -> 18.18, rise +0.00 / allowed +0.01 / SE 0.98 / z -0.01 (filed: within the allowance; 3135 aimed); Z +0.59 against 3.0, e* 2.09, mean excess +0.41: PASS; paired SE 0.64 (set 1, 272 games, z +1.30), 0.57 (set 2, 272 games, z -0.01); paired Z +0.91 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 12.24, rise -7.76 / allowed +0.12 / SE 5.82 / z -1.35 (filed: within the allowance; 98 aimed); set 2 8.45 -> 13.00, rise +4.55 / allowed +0.38 / SE 4.71 / z +0.89 (filed: above the allowance; 100 aimed); Z -0.33 against 3.0, e* 11.04, mean excess -1.85: PASS; paired SE 4.81 (set 1, 272 games, z -1.64), 3.45 (set 2, 272 games, z +1.21); paired Z -0.30 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 1051 / 158; set 2 base 1216 aimed / 203 INT -> arm 1273 / 209; set 1 14.26 -> 15.03, rise +0.77 / allowed +0.01 / SE 1.54 / z +0.49 (filed: above the allowance; 1051 aimed); set 2 16.69 -> 16.42, rise -0.28 / allowed +0.00 / SE 1.49 / z -0.19 (filed: within the allowance; 1273 aimed); Z +0.22 against 3.0, e* 3.22, mean excess +0.24 (reported); paired SE 1.11 (set 1, 272 games, z +0.68), 0.97 (set 2, 272 games, z -0.29); paired Z +0.28 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1861 / 350; set 2 base 1815 aimed / 348 INT -> arm 1862 / 361; set 1 17.97 -> 18.81, rise +0.84 / allowed -0.00 / SE 1.27 / z +0.66 (filed: above the allowance; 1861 aimed); set 2 19.17 -> 19.39, rise +0.21 / allowed +0.01 / SE 1.30 / z +0.15 (filed: above the allowance; 1862 aimed); Z +0.58 against 3.0, e* 2.73, mean excess +0.52 (reported); paired SE 0.83 (set 1, 272 games, z +1.02), 0.69 (set 2, 272 games, z +0.29); paired Z +0.92 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 36.09% / clean 63.91%; the class's rise +0.83, re-weighted to the base's composition +0.82 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 40.61% / clean 59.39%; the class's rise +0.00, re-weighted to the base's composition +0.02 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8850 looks (threat part 3607, status part 3610, count part 6112; rule part 3607 under PER_RUSHER: rule only 2738, count only 5243, both 869, neither 0); set 2 7949 looks (threat part 4011, status part 4013, count part 4704; rule part 4011 under PER_RUSHER: rule only 3245, count only 3938, both 766, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 45.61% / count 54.39% / status 0.00% / none 0.00%; the class's rise +0.01, re-weighted to the base's composition +0.06 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 58.14% / count 41.86% / status 0.00% / none 0.00%; the class's rise +0.12, re-weighted to the base's composition +0.13 (reported)

### C4 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.80, rise -0.03 / allowed +0.00 / SE 0.12 / z -0.27 (filed: within the allowance; 40071 aimed); set 2 2.75 -> 2.79, rise +0.04 / allowed +0.00 / SE 0.12 / z +0.30 (filed: above the allowance; 40260 aimed); Z +0.02 against 2.0, e* 0.16, mean excess +0.00: PASS; paired SE 0.08 (set 1, 496 games, z -0.41), 0.08 (set 2, 496 games, z +0.45); paired Z +0.03 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.35, rise +0.00 / allowed -0.01 / SE 0.06 / z +0.12 (filed: above the allowance; 20626 aimed); set 2 0.39 -> 0.38, rise -0.01 / allowed -0.00 / SE 0.06 / z -0.13 (filed: within the allowance; 20639 aimed); Z -0.00 against 3.0, e* 0.13, mean excess -0.00: PASS; paired SE 0.04 (set 1, 496 games, z +0.20), 0.04 (set 2, 496 games, z -0.20); paired Z -0.00 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.02, rise -0.68 / allowed -0.01 / SE 0.57 / z -1.18 (filed: within the allowance; 6807 aimed); set 2 11.57 -> 11.98, rise +0.41 / allowed -0.00 / SE 0.55 / z +0.74 (filed: above the allowance; 6827 aimed); Z -0.31 against 3.0, e* 1.19, mean excess -0.13: PASS; paired SE 0.38 (set 1, 496 games, z -1.77), 0.36 (set 2, 496 games, z +1.13); paired Z -0.46 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.25, rise +0.04 / allowed +0.01 / SE 0.07 / z +0.53 (filed: above the allowance; 9041 aimed); set 2 0.16 -> 0.18, rise +0.01 / allowed +0.01 / SE 0.06 / z +0.05 (filed: above the allowance; 9105 aimed); Z +0.41 against 3.0, e* 0.14, mean excess +0.02: PASS; paired SE 0.04 (set 1, 496 games, z +0.92), 0.05 (set 2, 496 games, z +0.06); paired Z +0.70 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.55, rise +0.19 / allowed +0.02 / SE 0.55 / z +0.32 (filed: above the allowance; 3388 aimed); set 2 6.32 -> 5.57, rise -0.75 / allowed +0.02 / SE 0.57 / z -1.35 (filed: within the allowance; 3481 aimed); Z -0.73 against 3.0, e* 1.19, mean excess -0.30: PASS; paired SE 0.36 (set 1, 496 games, z +0.49), 0.39 (set 2, 496 games, z -1.94); paired Z -1.03 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 9.57, rise +4.13 / allowed -0.02 / SE 2.76 / z +1.50 (filed: above the allowance; 209 aimed); set 2 9.16 -> 7.69, rise -1.47 / allowed -0.08 / SE 3.13 / z -0.44 (filed: within the allowance; 208 aimed); Z +0.75 against 3.0, e* 6.22, mean excess +1.38: PASS; paired SE 2.28 (set 1, 496 games, z +1.82), 2.36 (set 2, 496 games, z -0.59); paired Z +0.87 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 941 / 35; set 2 base 981 aimed / 41 INT -> arm 1042 / 45; set 1 4.22 -> 3.72, rise -0.50 / allowed +0.03 / SE 0.89 / z -0.60 (filed: within the allowance; 941 aimed); set 2 4.18 -> 4.32, rise +0.14 / allowed +0.01 / SE 0.90 / z +0.14 (filed: above the allowance; 1042 aimed); Z -0.33 against 3.0, e* 1.89, mean excess -0.21 (reported); paired SE 0.61 (set 1, 496 games, z -0.87), 0.60 (set 2, 496 games, z +0.21); paired Z -0.47 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2447 / 153; set 2 base 2450 aimed / 176 INT -> arm 2439 / 149; set 1 5.82 -> 6.25, rise +0.43 / allowed +0.01 / SE 0.68 / z +0.62 (filed: above the allowance; 2447 aimed); set 2 7.18 -> 6.11, rise -1.07 / allowed +0.02 / SE 0.71 / z -1.53 (filed: within the allowance; 2439 aimed); Z -0.64 against 3.0, e* 1.48, mean excess -0.33 (reported); paired SE 0.43 (set 1, 496 games, z +0.98), 0.49 (set 2, 496 games, z -2.21); paired Z -0.87 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 27.77% / clean 72.23%; the class's rise +0.19, re-weighted to the base's composition +0.16 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 29.93% / clean 70.07%; the class's rise -0.75, re-weighted to the base's composition -0.73 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 26392 looks (threat part 5732, status part 5735, count part 23702; rule part 5732 under PER_RUSHER: rule only 2690, count only 20660, both 3042, neither 0); set 2 26730 looks (threat part 5705, status part 5707, count part 23940; rule part 5705 under PER_RUSHER: rule only 2790, count only 21025, both 2915, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 23.13% / count 76.87% / status 0.00% / none 0.00%; the class's rise +0.04, re-weighted to the base's composition +0.06 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 22.72% / count 77.28% / status 0.00% / none 0.00%; the class's rise +0.01, re-weighted to the base's composition +0.02 (reported)

### C4 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.44, rise +0.14 / allowed -0.00 / SE 0.24 / z +0.62 (filed: above the allowance; 24490 aimed); set 2 7.69 -> 7.81, rise +0.12 / allowed +0.00 / SE 0.24 / z +0.48 (filed: above the allowance; 25252 aimed); Z +0.78 against 2.0, e* 0.34, mean excess +0.13: PASS; paired SE 0.16 (set 1, 272 games, z +0.94), 0.15 (set 2, 272 games, z +0.76); paired Z +1.20 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.56, rise -0.15 / allowed -0.01 / SE 0.19 / z -0.72 (filed: within the allowance; 13936 aimed); set 2 2.79 -> 2.64, rise -0.15 / allowed -0.01 / SE 0.19 / z -0.75 (filed: within the allowance; 14611 aimed); Z -1.04 against 3.0, e* 0.41, mean excess -0.14: PASS; paired SE 0.12 (set 1, 272 games, z -1.13), 0.14 (set 2, 272 games, z -1.04); paired Z -1.53 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.26, rise +0.51 / allowed -0.01 / SE 0.89 / z +0.59 (filed: above the allowance; 4058 aimed); set 2 20.68 -> 21.19, rise +0.51 / allowed +0.00 / SE 0.90 / z +0.56 (filed: above the allowance; 4115 aimed); Z +0.81 against 3.0, e* 1.90, mean excess +0.51: PASS; paired SE 0.56 (set 1, 272 games, z +0.94), 0.64 (set 2, 272 games, z +0.78); paired Z +1.22 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 3.42, rise +0.21 / allowed +0.01 / SE 0.43 / z +0.46 (filed: above the allowance; 3509 aimed); set 2 3.75 -> 4.04, rise +0.29 / allowed +0.00 / SE 0.48 / z +0.62 (filed: above the allowance; 3291 aimed); Z +0.76 against 3.0, e* 0.95, mean excess +0.25: PASS; paired SE 0.28 (set 1, 272 games, z +0.71), 0.34 (set 2, 272 games, z +0.85); paired Z +1.10 (reported, never graded)
- DESPERATION: set 1 16.61 -> 17.69, rise +1.07 / allowed -0.00 / SE 0.99 / z +1.08 (filed: above the allowance; 2878 aimed); set 2 18.18 -> 18.17, rise -0.01 / allowed +0.02 / SE 0.98 / z -0.03 (filed: within the allowance; 3115 aimed); Z +0.75 against 3.0, e* 2.10, mean excess +0.53: PASS; paired SE 0.66 (set 1, 272 games, z +1.64), 0.62 (set 2, 272 games, z -0.04); paired Z +1.13 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 13.76, rise -6.24 / allowed +0.11 / SE 5.81 / z -1.09 (filed: within the allowance; 109 aimed); set 2 8.45 -> 13.33, rise +4.88 / allowed +0.36 / SE 4.53 / z +1.00 (filed: above the allowance; 120 aimed); Z -0.07 against 3.0, e* 10.80, mean excess -0.91: PASS; paired SE 5.08 (set 1, 272 games, z -1.25), 3.67 (set 2, 272 games, z +1.23); paired Z -0.01 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 1028 / 158; set 2 base 1216 aimed / 203 INT -> arm 1259 / 194; set 1 14.26 -> 15.37, rise +1.11 / allowed +0.00 / SE 1.56 / z +0.71 (filed: above the allowance; 1028 aimed); set 2 16.69 -> 15.41, rise -1.29 / allowed +0.02 / SE 1.48 / z -0.88 (filed: within the allowance; 1259 aimed); Z -0.12 against 3.0, e* 3.22, mean excess -0.10 (reported); paired SE 1.07 (set 1, 272 games, z +1.04), 1.06 (set 2, 272 games, z -1.22); paired Z -0.13 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1850 / 351; set 2 base 1815 aimed / 348 INT -> arm 1856 / 372; set 1 17.97 -> 18.97, rise +1.00 / allowed -0.01 / SE 1.28 / z +0.79 (filed: above the allowance; 1850 aimed); set 2 19.17 -> 20.04, rise +0.87 / allowed +0.02 / SE 1.31 / z +0.65 (filed: above the allowance; 1856 aimed); Z +1.02 against 3.0, e* 2.75, mean excess +0.93 (reported); paired SE 0.87 (set 1, 272 games, z +1.17), 0.79 (set 2, 272 games, z +1.07); paired Z +1.58 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 35.72% / clean 64.28%; the class's rise +1.07, re-weighted to the base's composition +1.04 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 40.42% / clean 59.58%; the class's rise -0.01, re-weighted to the base's composition +0.01 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8696 looks (threat part 3622, status part 3625, count part 5909; rule part 3622 under PER_RUSHER: rule only 2787, count only 5074, both 835, neither 0); set 2 7874 looks (threat part 3961, status part 3964, count part 4629; rule part 3961 under PER_RUSHER: rule only 3245, count only 3913, both 716, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 46.68% / count 53.32% / status 0.00% / none 0.00%; the class's rise +0.21, re-weighted to the base's composition +0.23 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 57.49% / count 42.51% / status 0.00% / none 0.00%; the class's rise +0.29, re-weighted to the base's composition +0.33 (reported)

### C5 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.79, rise -0.03 / allowed +0.00 / SE 0.12 / z -0.30 (filed: within the allowance; 40073 aimed); set 2 2.75 -> 2.78, rise +0.03 / allowed +0.00 / SE 0.12 / z +0.18 (filed: above the allowance; 40248 aimed); Z -0.08 against 2.0, e* 0.16, mean excess -0.01: PASS; paired SE 0.08 (set 1, 496 games, z -0.45), 0.08 (set 2, 496 games, z +0.27); paired Z -0.13 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.34, rise -0.00 / allowed -0.00 / SE 0.06 / z +0.03 (filed: above the allowance; 20629 aimed); set 2 0.39 -> 0.37, rise -0.03 / allowed -0.00 / SE 0.06 / z -0.39 (filed: within the allowance; 20646 aimed); Z -0.25 against 3.0, e* 0.13, mean excess -0.01: PASS; paired SE 0.04 (set 1, 496 games, z +0.05), 0.04 (set 2, 496 games, z -0.57); paired Z -0.37 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.08, rise -0.61 / allowed -0.01 / SE 0.57 / z -1.06 (filed: within the allowance; 6794 aimed); set 2 11.57 -> 11.95, rise +0.38 / allowed -0.00 / SE 0.56 / z +0.69 (filed: above the allowance; 6801 aimed); Z -0.26 against 3.0, e* 1.19, mean excess -0.11: PASS; paired SE 0.38 (set 1, 496 games, z -1.58), 0.37 (set 2, 496 games, z +1.05); paired Z -0.38 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.25, rise +0.04 / allowed +0.01 / SE 0.07 / z +0.49 (filed: above the allowance; 9071 aimed); set 2 0.16 -> 0.18, rise +0.01 / allowed +0.01 / SE 0.06 / z +0.05 (filed: above the allowance; 9107 aimed); Z +0.38 against 3.0, e* 0.14, mean excess +0.02: PASS; paired SE 0.04 (set 1, 496 games, z +0.85), 0.05 (set 2, 496 games, z +0.06); paired Z +0.65 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.47, rise +0.11 / allowed +0.02 / SE 0.55 / z +0.18 (filed: above the allowance; 3363 aimed); set 2 6.32 -> 5.60, rise -0.73 / allowed +0.01 / SE 0.57 / z -1.30 (filed: within the allowance; 3485 aimed); Z -0.79 against 3.0, e* 1.19, mean excess -0.32: PASS; paired SE 0.35 (set 1, 496 games, z +0.28), 0.39 (set 2, 496 games, z -1.88); paired Z -1.13 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 9.72, rise +4.28 / allowed -0.02 / SE 2.75 / z +1.56 (filed: above the allowance; 216 aimed); set 2 9.16 -> 8.13, rise -1.03 / allowed -0.08 / SE 3.15 / z -0.30 (filed: within the allowance; 209 aimed); Z +0.89 against 3.0, e* 6.23, mean excess +1.68: PASS; paired SE 2.28 (set 1, 496 games, z +1.89), 2.39 (set 2, 496 games, z -0.39); paired Z +1.06 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 921 / 34; set 2 base 981 aimed / 41 INT -> arm 1047 / 45; set 1 4.22 -> 3.69, rise -0.53 / allowed +0.04 / SE 0.89 / z -0.64 (filed: within the allowance; 921 aimed); set 2 4.18 -> 4.30, rise +0.12 / allowed +0.01 / SE 0.90 / z +0.13 (filed: above the allowance; 1047 aimed); Z -0.37 against 3.0, e* 1.89, mean excess -0.23 (reported); paired SE 0.61 (set 1, 496 games, z -0.94), 0.60 (set 2, 496 games, z +0.19); paired Z -0.53 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2442 / 150; set 2 base 2450 aimed / 176 INT -> arm 2438 / 150; set 1 5.82 -> 6.14, rise +0.32 / allowed +0.01 / SE 0.68 / z +0.47 (filed: above the allowance; 2442 aimed); set 2 7.18 -> 6.15, rise -1.03 / allowed +0.01 / SE 0.71 / z -1.46 (filed: within the allowance; 2438 aimed); Z -0.71 against 3.0, e* 1.48, mean excess -0.36 (reported); paired SE 0.42 (set 1, 496 games, z +0.75), 0.50 (set 2, 496 games, z -2.11); paired Z -0.96 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 27.39% / clean 72.61%; the class's rise +0.11, re-weighted to the base's composition +0.08 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 30.04% / clean 69.96%; the class's rise -0.73, re-weighted to the base's composition -0.70 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 26374 looks (threat part 5747, status part 5751, count part 23656; rule part 5747 under PER_RUSHER: rule only 2718, count only 20627, both 3029, neither 0); set 2 26680 looks (threat part 5708, status part 5710, count part 23898; rule part 5708 under PER_RUSHER: rule only 2782, count only 20972, both 2926, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 23.25% / count 76.75% / status 0.00% / none 0.00%; the class's rise +0.04, re-weighted to the base's composition +0.06 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 22.73% / count 77.27% / status 0.00% / none 0.00%; the class's rise +0.01, re-weighted to the base's composition +0.02 (reported)

### C5 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.40, rise +0.10 / allowed -0.00 / SE 0.24 / z +0.43 (filed: above the allowance; 24722 aimed); set 2 7.69 -> 7.86, rise +0.17 / allowed +0.00 / SE 0.24 / z +0.71 (filed: above the allowance; 25329 aimed); Z +0.81 against 2.0, e* 0.34, mean excess +0.14: PASS; paired SE 0.15 (set 1, 272 games, z +0.66), 0.15 (set 2, 272 games, z +1.14); paired Z +1.27 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.56, rise -0.15 / allowed -0.01 / SE 0.19 / z -0.76 (filed: within the allowance; 14081 aimed); set 2 2.79 -> 2.67, rise -0.11 / allowed -0.01 / SE 0.19 / z -0.52 (filed: within the allowance; 14623 aimed); Z -0.90 against 3.0, e* 0.41, mean excess -0.12: PASS; paired SE 0.12 (set 1, 272 games, z -1.21), 0.12 (set 2, 272 games, z -0.80); paired Z -1.42 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.50, rise +0.76 / allowed -0.00 / SE 0.89 / z +0.86 (filed: above the allowance; 4053 aimed); set 2 20.68 -> 21.24, rise +0.55 / allowed +0.00 / SE 0.90 / z +0.61 (filed: above the allowance; 4205 aimed); Z +1.04 against 3.0, e* 1.90, mean excess +0.66: PASS; paired SE 0.54 (set 1, 272 games, z +1.42), 0.63 (set 2, 272 games, z +0.88); paired Z +1.63 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 3.30, rise +0.09 / allowed +0.01 / SE 0.42 / z +0.17 (filed: above the allowance; 3518 aimed); set 2 3.75 -> 3.87, rise +0.13 / allowed +0.01 / SE 0.47 / z +0.25 (filed: above the allowance; 3252 aimed); Z +0.30 against 3.0, e* 0.95, mean excess +0.09: PASS; paired SE 0.29 (set 1, 272 games, z +0.26), 0.32 (set 2, 272 games, z +0.36); paired Z +0.44 (reported, never graded)
- DESPERATION: set 1 16.61 -> 17.13, rise +0.51 / allowed +0.00 / SE 0.98 / z +0.52 (filed: above the allowance; 2954 aimed); set 2 18.18 -> 18.17, rise -0.01 / allowed +0.02 / SE 0.98 / z -0.03 (filed: within the allowance; 3132 aimed); Z +0.35 against 3.0, e* 2.08, mean excess +0.24: PASS; paired SE 0.64 (set 1, 272 games, z +0.80), 0.59 (set 2, 272 games, z -0.05); paired Z +0.53 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 14.66, rise -5.34 / allowed +0.11 / SE 5.80 / z -0.94 (filed: within the allowance; 116 aimed); set 2 8.45 -> 11.11, rise +2.66 / allowed +0.38 / SE 4.40 / z +0.52 (filed: above the allowance; 117 aimed); Z -0.30 against 3.0, e* 10.61, mean excess -1.59: PASS; paired SE 5.14 (set 1, 272 games, z -1.06), 3.45 (set 2, 272 games, z +0.66); paired Z -0.28 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 1058 / 160; set 2 base 1216 aimed / 203 INT -> arm 1274 / 209; set 1 14.26 -> 15.12, rise +0.86 / allowed +0.03 / SE 1.54 / z +0.54 (filed: above the allowance; 1058 aimed); set 2 16.69 -> 16.41, rise -0.29 / allowed -0.00 / SE 1.49 / z -0.19 (filed: within the allowance; 1274 aimed); Z +0.25 against 3.0, e* 3.21, mean excess +0.28 (reported); paired SE 1.11 (set 1, 272 games, z +0.75), 1.05 (set 2, 272 games, z -0.27); paired Z +0.34 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1896 / 346; set 2 base 1815 aimed / 348 INT -> arm 1858 / 360; set 1 17.97 -> 18.25, rise +0.28 / allowed -0.01 / SE 1.26 / z +0.23 (filed: above the allowance; 1896 aimed); set 2 19.17 -> 19.38, rise +0.20 / allowed +0.03 / SE 1.30 / z +0.13 (filed: above the allowance; 1858 aimed); Z +0.26 against 3.0, e* 2.72, mean excess +0.23 (reported); paired SE 0.83 (set 1, 272 games, z +0.35), 0.74 (set 2, 272 games, z +0.23); paired Z +0.41 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 35.82% / clean 64.18%; the class's rise +0.51, re-weighted to the base's composition +0.49 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 40.68% / clean 59.32%; the class's rise -0.01, re-weighted to the base's composition +0.01 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8712 looks (threat part 3573, status part 3576, count part 5988; rule part 3573 under PER_RUSHER: rule only 2724, count only 5139, both 849, neither 0); set 2 7891 looks (threat part 3985, status part 3988, count part 4678; rule part 3985 under PER_RUSHER: rule only 3213, count only 3906, both 772, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 46.11% / count 53.89% / status 0.00% / none 0.00%; the class's rise +0.09, re-weighted to the base's composition +0.12 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 57.32% / count 42.68% / status 0.00% / none 0.00%; the class's rise +0.13, re-weighted to the base's composition +0.15 (reported)

### C6 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.83, rise -0.00 / allowed +0.01 / SE 0.12 / z -0.07 (filed: within the allowance; 39995 aimed); set 2 2.75 -> 2.76, rise +0.01 / allowed +0.01 / SE 0.12 / z -0.04 (filed: within the allowance; 40026 aimed); Z -0.07 against 2.0, e* 0.16, mean excess -0.01: PASS; paired SE 0.09 (set 1, 496 games, z -0.09), 0.08 (set 2, 496 games, z -0.05); paired Z -0.10 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.34, rise -0.00 / allowed -0.00 / SE 0.06 / z -0.06 (filed: within the allowance; 20709 aimed); set 2 0.39 -> 0.34, rise -0.06 / allowed +0.00 / SE 0.06 / z -1.04 (filed: within the allowance; 20572 aimed); Z -0.77 against 3.0, e* 0.12, mean excess -0.03: PASS; paired SE 0.04 (set 1, 496 games, z -0.08), 0.04 (set 2, 496 games, z -1.63); paired Z -1.21 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.40, rise -0.30 / allowed -0.00 / SE 0.57 / z -0.51 (filed: within the allowance; 6871 aimed); set 2 11.57 -> 11.92, rise +0.35 / allowed +0.01 / SE 0.55 / z +0.61 (filed: above the allowance; 6838 aimed); Z +0.07 against 3.0, e* 1.19, mean excess +0.02: PASS; paired SE 0.42 (set 1, 496 games, z -0.69), 0.39 (set 2, 496 games, z +0.87); paired Z +0.13 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.21, rise +0.00 / allowed +0.01 / SE 0.07 / z -0.08 (filed: within the allowance; 8845 aimed); set 2 0.16 -> 0.23, rise +0.07 / allowed +0.01 / SE 0.07 / z +0.95 (filed: above the allowance; 9030 aimed); Z +0.61 against 3.0, e* 0.14, mean excess +0.03: PASS; paired SE 0.05 (set 1, 496 games, z -0.11), 0.05 (set 2, 496 games, z +1.22); paired Z +0.78 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.21, rise -0.15 / allowed +0.04 / SE 0.54 / z -0.34 (filed: within the allowance; 3360 aimed); set 2 6.32 -> 5.54, rise -0.79 / allowed +0.03 / SE 0.57 / z -1.43 (filed: within the allowance; 3377 aimed); Z -1.26 against 3.0, e* 1.18, mean excess -0.50: PASS; paired SE 0.38 (set 1, 496 games, z -0.49), 0.43 (set 2, 496 games, z -1.92); paired Z -1.71 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 6.67, rise +1.22 / allowed +0.02 / SE 2.54 / z +0.48 (filed: above the allowance; 210 aimed); set 2 9.16 -> 5.26, rise -3.90 / allowed -0.04 / SE 2.96 / z -1.30 (filed: within the allowance; 209 aimed); Z -0.59 against 3.0, e* 5.80, mean excess -1.32: PASS; paired SE 2.06 (set 1, 496 games, z +0.59), 2.79 (set 2, 496 games, z -1.38); paired Z -0.56 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 791 / 30; set 2 base 981 aimed / 41 INT -> arm 835 / 41; set 1 4.22 -> 3.79, rise -0.43 / allowed +0.14 / SE 0.93 / z -0.61 (filed: within the allowance; 791 aimed); set 2 4.18 -> 4.91, rise +0.73 / allowed +0.17 / SE 0.98 / z +0.58 (filed: above the allowance; 835 aimed); Z -0.03 against 3.0, e* 2.03, mean excess -0.00 (reported); paired SE 0.74 (set 1, 496 games, z -0.77), 0.78 (set 2, 496 games, z +0.73); paired Z -0.03 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2569 / 145; set 2 base 2450 aimed / 176 INT -> arm 2542 / 146; set 1 5.82 -> 5.64, rise -0.18 / allowed +0.01 / SE 0.66 / z -0.28 (filed: within the allowance; 2569 aimed); set 2 7.18 -> 5.74, rise -1.44 / allowed -0.01 / SE 0.70 / z -2.05 (filed: within the allowance; 2542 aimed); Z -1.65 against 3.0, e* 1.43, mean excess -0.81 (reported); paired SE 0.45 (set 1, 496 games, z -0.41), 0.52 (set 2, 496 games, z -2.76); paired Z -2.24 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 23.54% / clean 76.46%; the class's rise -0.15, re-weighted to the base's composition -0.25 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 24.73% / clean 75.27%; the class's rise -0.79, re-weighted to the base's composition -0.82 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 25852 looks (threat part 4674, status part 4679, count part 23619; rule part 4674 under PER_RUSHER: rule only 2233, count only 21178, both 2441, neither 0); set 2 26079 looks (threat part 4750, status part 4756, count part 23755; rule part 4750 under PER_RUSHER: rule only 2324, count only 21329, both 2426, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 19.13% / count 80.87% / status 0.00% / none 0.00%; the class's rise +0.00, re-weighted to the base's composition +0.03 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 20.04% / count 79.96% / status 0.00% / none 0.00%; the class's rise +0.07, re-weighted to the base's composition +0.07 (reported)

### C6 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.45, rise +0.14 / allowed +0.01 / SE 0.24 / z +0.55 (filed: above the allowance; 24727 aimed); set 2 7.69 -> 7.68, rise -0.01 / allowed +0.02 / SE 0.24 / z -0.14 (filed: within the allowance; 25205 aimed); Z +0.29 against 2.0, e* 0.33, mean excess +0.05: PASS; paired SE 0.18 (set 1, 272 games, z +0.74), 0.15 (set 2, 272 games, z -0.22); paired Z +0.37 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.46, rise -0.25 / allowed +0.00 / SE 0.19 / z -1.34 (filed: within the allowance; 14257 aimed); set 2 2.79 -> 2.76, rise -0.03 / allowed +0.00 / SE 0.19 / z -0.14 (filed: within the allowance; 14845 aimed); Z -1.04 against 3.0, e* 0.40, mean excess -0.14: PASS; paired SE 0.14 (set 1, 272 games, z -1.84), 0.14 (set 2, 272 games, z -0.19); paired Z -1.44 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.98, rise +1.23 / allowed -0.01 / SE 0.89 / z +1.40 (filed: above the allowance; 4181 aimed); set 2 20.68 -> 21.12, rise +0.43 / allowed +0.03 / SE 0.90 / z +0.44 (filed: above the allowance; 4125 aimed); Z +1.30 against 3.0, e* 1.90, mean excess +0.82: PASS; paired SE 0.60 (set 1, 272 games, z +2.07), 0.63 (set 2, 272 games, z +0.63); paired Z +1.91 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 2.83, rise -0.38 / allowed +0.05 / SE 0.41 / z -1.06 (filed: within the allowance; 3321 aimed); set 2 3.75 -> 3.95, rise +0.21 / allowed +0.07 / SE 0.48 / z +0.28 (filed: above the allowance; 3086 aimed); Z -0.55 against 3.0, e* 0.94, mean excess -0.15: PASS; paired SE 0.31 (set 1, 272 games, z -1.40), 0.36 (set 2, 272 games, z +0.37); paired Z -0.73 (reported, never graded)
- DESPERATION: set 1 16.61 -> 17.51, rise +0.90 / allowed +0.04 / SE 0.99 / z +0.87 (filed: above the allowance; 2849 aimed); set 2 18.18 -> 17.06, rise -1.12 / allowed +0.07 / SE 0.98 / z -1.22 (filed: within the allowance; 3072 aimed); Z -0.25 against 3.0, e* 2.09, mean excess -0.16: PASS; paired SE 0.72 (set 1, 272 games, z +1.20), 0.67 (set 2, 272 games, z -1.78); paired Z -0.41 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 16.81, rise -3.19 / allowed +0.11 / SE 5.88 / z -0.56 (filed: within the allowance; 119 aimed); set 2 8.45 -> 12.99, rise +4.54 / allowed +0.35 / SE 5.06 / z +0.83 (filed: above the allowance; 77 aimed); Z +0.19 against 3.0, e* 11.54, mean excess +0.44: PASS; paired SE 5.31 (set 1, 272 games, z -0.62), 3.71 (set 2, 272 games, z +1.13); paired Z +0.36 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 910 / 141; set 2 base 1216 aimed / 203 INT -> arm 1111 / 165; set 1 14.26 -> 15.49, rise +1.24 / allowed +0.15 / SE 1.61 / z +0.68 (filed: above the allowance; 910 aimed); set 2 16.69 -> 14.85, rise -1.84 / allowed +0.21 / SE 1.51 / z -1.36 (filed: within the allowance; 1111 aimed); Z -0.48 against 3.0, e* 3.31, mean excess -0.48 (reported); paired SE 1.31 (set 1, 272 games, z +0.83), 1.16 (set 2, 272 games, z -1.77); paired Z -0.66 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1939 / 358; set 2 base 1815 aimed / 348 INT -> arm 1961 / 359; set 1 17.97 -> 18.46, rise +0.49 / allowed -0.03 / SE 1.26 / z +0.41 (filed: above the allowance; 1939 aimed); set 2 19.17 -> 18.31, rise -0.87 / allowed -0.01 / SE 1.27 / z -0.67 (filed: within the allowance; 1961 aimed); Z -0.18 against 3.0, e* 2.68, mean excess -0.17 (reported); paired SE 0.90 (set 1, 272 games, z +0.58), 0.86 (set 2, 272 games, z -0.99); paired Z -0.30 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 31.94% / clean 68.06%; the class's rise +0.90, re-weighted to the base's composition +0.77 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 36.17% / clean 63.83%; the class's rise -1.12, re-weighted to the base's composition -1.26 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8340 looks (threat part 3059, status part 3063, count part 6030; rule part 3059 under PER_RUSHER: rule only 2310, count only 5281, both 749, neither 0); set 2 7501 looks (threat part 3376, status part 3378, count part 4802; rule part 3376 under PER_RUSHER: rule only 2699, count only 4125, both 677, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 41.37% / count 58.63% / status 0.00% / none 0.00%; the class's rise -0.38, re-weighted to the base's composition -0.31 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 52.11% / count 47.89% / status 0.00% / none 0.00%; the class's rise +0.21, re-weighted to the base's composition +0.23 (reported)

### C7 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.84, rise +0.01 / allowed -0.00 / SE 0.12 / z +0.07 (filed: above the allowance; 39645 aimed); set 2 2.75 -> 2.67, rise -0.08 / allowed +0.00 / SE 0.11 / z -0.74 (filed: within the allowance; 39944 aimed); Z -0.47 against 2.0, e* 0.16, mean excess -0.04: PASS; paired SE 0.05 (set 1, 496 games, z +0.17), 0.05 (set 2, 496 games, z -1.70); paired Z -1.09 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.34, rise -0.01 / allowed -0.00 / SE 0.06 / z -0.04 (filed: within the allowance; 20509 aimed); set 2 0.39 -> 0.35, rise -0.04 / allowed -0.00 / SE 0.06 / z -0.64 (filed: within the allowance; 20587 aimed); Z -0.48 against 3.0, e* 0.13, mean excess -0.02: PASS; paired SE 0.02 (set 1, 496 games, z -0.10), 0.03 (set 2, 496 games, z -1.50); paired Z -1.13 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.42, rise -0.27 / allowed -0.01 / SE 0.57 / z -0.46 (filed: within the allowance; 6689 aimed); set 2 11.57 -> 11.20, rise -0.37 / allowed +0.00 / SE 0.55 / z -0.68 (filed: within the allowance; 6784 aimed); Z -0.81 against 3.0, e* 1.19, mean excess -0.32: PASS; paired SE 0.25 (set 1, 496 games, z -1.06), 0.25 (set 2, 496 games, z -1.48); paired Z -1.80 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.23, rise +0.01 / allowed -0.00 / SE 0.07 / z +0.21 (filed: above the allowance; 8879 aimed); set 2 0.16 -> 0.15, rise -0.01 / allowed +0.00 / SE 0.06 / z -0.23 (filed: within the allowance; 9038 aimed); Z -0.02 against 3.0, e* 0.14, mean excess +0.00: PASS; paired SE 0.03 (set 1, 496 games, z +0.49), 0.03 (set 2, 496 games, z -0.47); paired Z +0.02 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.75, rise +0.40 / allowed +0.01 / SE 0.55 / z +0.70 (filed: above the allowance; 3407 aimed); set 2 6.32 -> 6.08, rise -0.25 / allowed +0.00 / SE 0.58 / z -0.43 (filed: within the allowance; 3390 aimed); Z +0.19 against 3.0, e* 1.21, mean excess +0.07: PASS; paired SE 0.22 (set 1, 496 games, z +1.74), 0.23 (set 2, 496 games, z -1.11); paired Z +0.44 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 4.35, rise -1.09 / allowed -0.01 / SE 2.47 / z -0.44 (filed: within the allowance; 161 aimed); set 2 9.16 -> 8.28, rise -0.88 / allowed -0.09 / SE 3.40 / z -0.23 (filed: within the allowance; 145 aimed); Z -0.48 against 3.0, e* 6.07, mean excess -0.94: PASS; paired SE 1.11 (set 1, 496 games, z -0.98), 1.08 (set 2, 496 games, z -0.74); paired Z -1.21 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 972 / 44; set 2 base 981 aimed / 41 INT -> arm 975 / 38; set 1 4.22 -> 4.53, rise +0.31 / allowed +0.02 / SE 0.92 / z +0.31 (filed: above the allowance; 972 aimed); set 2 4.18 -> 3.90, rise -0.28 / allowed -0.01 / SE 0.89 / z -0.31 (filed: within the allowance; 975 aimed); Z +0.00 against 3.0, e* 1.92, mean excess +0.01 (reported); paired SE 0.32 (set 1, 496 games, z +0.90), 0.33 (set 2, 496 games, z -0.82); paired Z +0.06 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2435 / 152; set 2 base 2450 aimed / 176 INT -> arm 2415 / 168; set 1 5.82 -> 6.24, rise +0.42 / allowed +0.01 / SE 0.68 / z +0.61 (filed: above the allowance; 2435 aimed); set 2 7.18 -> 6.96, rise -0.23 / allowed +0.01 / SE 0.73 / z -0.32 (filed: within the allowance; 2415 aimed); Z +0.20 against 3.0, e* 1.50, mean excess +0.09 (reported); paired SE 0.29 (set 1, 496 games, z +1.43), 0.30 (set 2, 496 games, z -0.80); paired Z +0.45 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 28.53% / clean 71.47%; the class's rise +0.40, re-weighted to the base's composition +0.39 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 28.76% / clean 71.24%; the class's rise -0.25, re-weighted to the base's composition -0.24 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 26042 looks (threat part 5901, status part 5904, count part 23237; rule part 5901 under PER_RUSHER: rule only 2805, count only 20141, both 3096, neither 0); set 2 26347 looks (threat part 5885, status part 5887, count part 23441; rule part 5885 under PER_RUSHER: rule only 2906, count only 20462, both 2979, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 24.70% / count 75.30% / status 0.00% / none 0.00%; the class's rise +0.01, re-weighted to the base's composition +0.02 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 24.21% / count 75.79% / status 0.00% / none 0.00%; the class's rise -0.01, re-weighted to the base's composition -0.01 (reported)

### C7 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.30, rise +0.00 / allowed +0.00 / SE 0.24 / z +0.01 (filed: above the allowance; 24424 aimed); set 2 7.69 -> 7.73, rise +0.04 / allowed +0.00 / SE 0.24 / z +0.16 (filed: above the allowance; 25041 aimed); Z +0.12 against 2.0, e* 0.34, mean excess +0.02: PASS; paired SE 0.10 (set 1, 272 games, z +0.02), 0.10 (set 2, 272 games, z +0.37); paired Z +0.27 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.63, rise -0.08 / allowed -0.00 / SE 0.19 / z -0.39 (filed: within the allowance; 13937 aimed); set 2 2.79 -> 2.76, rise -0.02 / allowed -0.01 / SE 0.19 / z -0.09 (filed: within the allowance; 14590 aimed); Z -0.34 against 3.0, e* 0.41, mean excess -0.05: PASS; paired SE 0.08 (set 1, 272 games, z -0.89), 0.08 (set 2, 272 games, z -0.24); paired Z -0.80 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.27, rise +0.52 / allowed -0.01 / SE 0.89 / z +0.60 (filed: above the allowance; 4041 aimed); set 2 20.68 -> 20.82, rise +0.14 / allowed +0.02 / SE 0.90 / z +0.13 (filed: above the allowance; 4063 aimed); Z +0.52 against 3.0, e* 1.90, mean excess +0.33: PASS; paired SE 0.39 (set 1, 272 games, z +1.35), 0.41 (set 2, 272 games, z +0.29); paired Z +1.16 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 3.44, rise +0.23 / allowed +0.02 / SE 0.43 / z +0.49 (filed: above the allowance; 3515 aimed); set 2 3.75 -> 3.55, rise -0.20 / allowed +0.00 / SE 0.46 / z -0.43 (filed: within the allowance; 3242 aimed); Z +0.04 against 3.0, e* 0.94, mean excess +0.00: PASS; paired SE 0.20 (set 1, 272 games, z +1.04), 0.22 (set 2, 272 games, z -0.90); paired Z +0.10 (reported, never graded)
- DESPERATION: set 1 16.61 -> 16.25, rise -0.37 / allowed +0.01 / SE 0.98 / z -0.39 (filed: within the allowance; 2862 aimed); set 2 18.18 -> 18.44, rise +0.26 / allowed +0.00 / SE 0.99 / z +0.27 (filed: above the allowance; 3069 aimed); Z -0.08 against 3.0, e* 2.09, mean excess -0.06: PASS; paired SE 0.44 (set 1, 272 games, z -0.87), 0.39 (set 2, 272 games, z +0.67); paired Z -0.14 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 17.39, rise -2.61 / allowed +0.04 / SE 6.61 / z -0.40 (filed: within the allowance; 69 aimed); set 2 8.45 -> 7.79, rise -0.66 / allowed +0.12 / SE 4.50 / z -0.17 (filed: within the allowance; 77 aimed); Z -0.41 against 3.0, e* 11.35, mean excess -1.71: PASS; paired SE 2.66 (set 1, 272 games, z -0.99), 2.57 (set 2, 272 games, z -0.30); paired Z -0.92 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 1021 / 146; set 2 base 1216 aimed / 203 INT -> arm 1227 / 218; set 1 14.26 -> 14.30, rise +0.04 / allowed +0.03 / SE 1.54 / z +0.01 (filed: above the allowance; 1021 aimed); set 2 16.69 -> 17.77, rise +1.07 / allowed +0.02 / SE 1.53 / z +0.69 (filed: above the allowance; 1227 aimed); Z +0.49 against 3.0, e* 3.25, mean excess +0.53 (reported); paired SE 0.70 (set 1, 272 games, z +0.02), 0.66 (set 2, 272 games, z +1.59); paired Z +1.14 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1841 / 319; set 2 base 1815 aimed / 348 INT -> arm 1842 / 348; set 1 17.97 -> 17.33, rise -0.64 / allowed -0.00 / SE 1.26 / z -0.51 (filed: within the allowance; 1841 aimed); set 2 19.17 -> 18.89, rise -0.28 / allowed -0.02 / SE 1.30 / z -0.20 (filed: within the allowance; 1842 aimed); Z -0.50 against 3.0, e* 2.71, mean excess -0.45 (reported); paired SE 0.57 (set 1, 272 games, z -1.11), 0.52 (set 2, 272 games, z -0.51); paired Z -1.15 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 35.67% / clean 64.33%; the class's rise -0.37, re-weighted to the base's composition -0.39 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 39.98% / clean 60.02%; the class's rise +0.26, re-weighted to the base's composition +0.26 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8785 looks (threat part 3712, status part 3714, count part 5900; rule part 3712 under PER_RUSHER: rule only 2885, count only 5073, both 827, neither 0); set 2 7973 looks (threat part 4026, status part 4030, count part 4665; rule part 4026 under PER_RUSHER: rule only 3308, count only 3947, both 718, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 47.74% / count 52.26% / status 0.00% / none 0.00%; the class's rise +0.23, re-weighted to the base's composition +0.24 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 57.77% / count 42.23% / status 0.00% / none 0.00%; the class's rise -0.20, re-weighted to the base's composition -0.19 (reported)

### C8 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.70, rise -0.13 / allowed +0.00 / SE 0.12 / z -1.10 (filed: within the allowance; 39990 aimed); set 2 2.75 -> 2.87, rise +0.12 / allowed +0.00 / SE 0.12 / z +1.03 (filed: above the allowance; 40295 aimed); Z -0.05 against 2.0, e* 0.16, mean excess -0.00: PASS; paired SE 0.07 (set 1, 496 games, z -1.82), 0.07 (set 2, 496 games, z +1.73); paired Z -0.07 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.32, rise -0.02 / allowed -0.00 / SE 0.06 / z -0.37 (filed: within the allowance; 20490 aimed); set 2 0.39 -> 0.36, rise -0.04 / allowed -0.00 / SE 0.06 / z -0.51 (filed: within the allowance; 20635 aimed); Z -0.62 against 3.0, e* 0.12, mean excess -0.03: PASS; paired SE 0.03 (set 1, 496 games, z -0.70), 0.03 (set 2, 496 games, z -0.97); paired Z -1.18 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.04, rise -0.65 / allowed -0.00 / SE 0.57 / z -1.14 (filed: within the allowance; 6676 aimed); set 2 11.57 -> 12.23, rise +0.65 / allowed +0.00 / SE 0.56 / z +1.17 (filed: above the allowance; 6781 aimed); Z +0.02 against 3.0, e* 1.20, mean excess -0.00: PASS; paired SE 0.36 (set 1, 496 games, z -1.83), 0.34 (set 2, 496 games, z +1.92); paired Z +0.06 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.24, rise +0.03 / allowed +0.00 / SE 0.07 / z +0.39 (filed: above the allowance; 9200 aimed); set 2 0.16 -> 0.22, rise +0.05 / allowed +0.01 / SE 0.06 / z +0.73 (filed: above the allowance; 9204 aimed); Z +0.79 against 3.0, e* 0.14, mean excess +0.04: PASS; paired SE 0.05 (set 1, 496 games, z +0.60), 0.04 (set 2, 496 games, z +1.12); paired Z +1.21 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.12, rise -0.24 / allowed +0.01 / SE 0.54 / z -0.46 (filed: within the allowance; 3419 aimed); set 2 6.32 -> 6.31, rise -0.01 / allowed +0.02 / SE 0.59 / z -0.05 (filed: within the allowance; 3484 aimed); Z -0.36 against 3.0, e* 1.19, mean excess -0.14: PASS; paired SE 0.32 (set 1, 496 games, z -0.77), 0.37 (set 2, 496 games, z -0.08); paired Z -0.60 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 6.34, rise +0.90 / allowed -0.02 / SE 2.53 / z +0.36 (filed: above the allowance; 205 aimed); set 2 9.16 -> 7.85, rise -1.31 / allowed -0.00 / SE 3.18 / z -0.41 (filed: within the allowance; 191 aimed); Z -0.03 against 3.0, e* 5.98, mean excess -0.19: PASS; paired SE 1.62 (set 1, 496 games, z +0.56), 2.33 (set 2, 496 games, z -0.56); paired Z +0.00 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 981 / 35; set 2 base 981 aimed / 41 INT -> arm 1001 / 52; set 1 4.22 -> 3.57, rise -0.65 / allowed +0.03 / SE 0.87 / z -0.78 (filed: within the allowance; 981 aimed); set 2 4.18 -> 5.19, rise +1.02 / allowed +0.00 / SE 0.95 / z +1.07 (filed: above the allowance; 1001 aimed); Z +0.20 against 3.0, e* 1.93, mean excess +0.17 (reported); paired SE 0.50 (set 1, 496 games, z -1.37), 0.53 (set 2, 496 games, z +1.90); paired Z +0.37 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2438 / 140; set 2 base 2450 aimed / 176 INT -> arm 2483 / 168; set 1 5.82 -> 5.74, rise -0.08 / allowed +0.00 / SE 0.67 / z -0.12 (filed: within the allowance; 2438 aimed); set 2 7.18 -> 6.77, rise -0.42 / allowed +0.02 / SE 0.73 / z -0.61 (filed: within the allowance; 2483 aimed); Z -0.52 against 3.0, e* 1.48, mean excess -0.26 (reported); paired SE 0.40 (set 1, 496 games, z -0.21), 0.45 (set 2, 496 games, z -0.97); paired Z -0.83 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 28.69% / clean 71.31%; the class's rise -0.24, re-weighted to the base's composition -0.24 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 28.73% / clean 71.27%; the class's rise -0.01, re-weighted to the base's composition -0.01 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 26442 looks (threat part 6177, status part 6180, count part 23225; rule part 6177 under PER_RUSHER: rule only 3217, count only 20265, both 2960, neither 0); set 2 26797 looks (threat part 6187, status part 6189, count part 23508; rule part 6187 under PER_RUSHER: rule only 3289, count only 20610, both 2898, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 26.21% / count 73.79% / status 0.00% / none 0.00%; the class's rise +0.03, re-weighted to the base's composition +0.03 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 25.78% / count 74.22% / status 0.00% / none 0.00%; the class's rise +0.05, re-weighted to the base's composition +0.05 (reported)

### C8 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.42, rise +0.11 / allowed -0.00 / SE 0.24 / z +0.49 (filed: above the allowance; 24719 aimed); set 2 7.69 -> 7.70, rise +0.00 / allowed +0.00 / SE 0.24 / z -0.00 (filed: within the allowance; 25180 aimed); Z +0.35 against 2.0, e* 0.33, mean excess +0.06: PASS; paired SE 0.14 (set 1, 272 games, z +0.86), 0.14 (set 2, 272 games, z -0.00); paired Z +0.61 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.52, rise -0.19 / allowed -0.00 / SE 0.19 / z -0.96 (filed: within the allowance; 14033 aimed); set 2 2.79 -> 2.65, rise -0.14 / allowed -0.01 / SE 0.19 / z -0.67 (filed: within the allowance; 14524 aimed); Z -1.16 against 3.0, e* 0.41, mean excess -0.16: PASS; paired SE 0.11 (set 1, 272 games, z -1.72), 0.12 (set 2, 272 games, z -1.03); paired Z -1.95 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.61, rise +0.86 / allowed -0.01 / SE 0.89 / z +0.99 (filed: above the allowance; 4091 aimed); set 2 20.68 -> 20.71, rise +0.03 / allowed -0.00 / SE 0.90 / z +0.03 (filed: above the allowance; 4128 aimed); Z +0.72 against 3.0, e* 1.89, mean excess +0.45: PASS; paired SE 0.48 (set 1, 272 games, z +1.83), 0.54 (set 2, 272 games, z +0.05); paired Z +1.33 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 3.28, rise +0.06 / allowed +0.00 / SE 0.42 / z +0.15 (filed: above the allowance; 3572 aimed); set 2 3.75 -> 3.88, rise +0.13 / allowed +0.02 / SE 0.47 / z +0.25 (filed: above the allowance; 3349 aimed); Z +0.28 against 3.0, e* 0.94, mean excess +0.09: PASS; paired SE 0.25 (set 1, 272 games, z +0.25), 0.31 (set 2, 272 games, z +0.37); paired Z +0.44 (reported, never graded)
- DESPERATION: set 1 16.61 -> 17.14, rise +0.53 / allowed +0.00 / SE 0.98 / z +0.54 (filed: above the allowance; 2928 aimed); set 2 18.18 -> 18.02, rise -0.16 / allowed +0.02 / SE 0.98 / z -0.19 (filed: within the allowance; 3086 aimed); Z +0.25 against 3.0, e* 2.09, mean excess +0.17: PASS; paired SE 0.58 (set 1, 272 games, z +0.91), 0.57 (set 2, 272 games, z -0.33); paired Z +0.42 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 17.89, rise -2.11 / allowed +0.10 / SE 6.19 / z -0.36 (filed: within the allowance; 95 aimed); set 2 8.45 -> 12.90, rise +4.45 / allowed +0.30 / SE 4.79 / z +0.87 (filed: above the allowance; 93 aimed); Z +0.36 against 3.0, e* 11.46, mean excess +0.97: PASS; paired SE 4.81 (set 1, 272 games, z -0.46), 3.44 (set 2, 272 games, z +1.21); paired Z +0.53 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 1082 / 171; set 2 base 1216 aimed / 203 INT -> arm 1251 / 205; set 1 14.26 -> 15.80, rise +1.55 / allowed +0.00 / SE 1.55 / z +1.00 (filed: above the allowance; 1082 aimed); set 2 16.69 -> 16.39, rise -0.31 / allowed +0.03 / SE 1.50 / z -0.23 (filed: within the allowance; 1251 aimed); Z +0.55 against 3.0, e* 3.23, mean excess +0.60 (reported); paired SE 1.08 (set 1, 272 games, z +1.43), 1.01 (set 2, 272 games, z -0.34); paired Z +0.77 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1846 / 331; set 2 base 1815 aimed / 348 INT -> arm 1835 / 351; set 1 17.97 -> 17.93, rise -0.04 / allowed +0.00 / SE 1.27 / z -0.03 (filed: within the allowance; 1846 aimed); set 2 19.17 -> 19.13, rise -0.05 / allowed +0.02 / SE 1.30 / z -0.05 (filed: within the allowance; 1835 aimed); Z -0.06 against 3.0, e* 2.72, mean excess -0.05 (reported); paired SE 0.71 (set 1, 272 games, z -0.06), 0.65 (set 2, 272 games, z -0.09); paired Z -0.11 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 36.95% / clean 63.05%; the class's rise +0.53, re-weighted to the base's composition +0.54 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 40.54% / clean 59.46%; the class's rise -0.16, re-weighted to the base's composition -0.15 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8841 looks (threat part 3734, status part 3737, count part 5924; rule part 3734 under PER_RUSHER: rule only 2917, count only 5107, both 817, neither 0); set 2 8025 looks (threat part 4049, status part 4050, count part 4689; rule part 4049 under PER_RUSHER: rule only 3336, count only 3976, both 713, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 48.04% / count 51.96% / status 0.00% / none 0.00%; the class's rise +0.06, re-weighted to the base's composition +0.07 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 57.78% / count 42.22% / status 0.00% / none 0.00%; the class's rise +0.13, re-weighted to the base's composition +0.14 (reported)

### C9 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.83, rise -0.00 / allowed -0.00 / SE 0.12 / z -0.02 (filed: within the allowance; 39676 aimed); set 2 2.75 -> 2.79, rise +0.04 / allowed +0.00 / SE 0.12 / z +0.36 (filed: above the allowance; 39904 aimed); Z +0.24 against 2.0, e* 0.17, mean excess +0.02: PASS; paired SE 0.02 (set 1, 496 games, z -0.12), 0.03 (set 2, 496 games, z +1.59); paired Z +1.04 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.36, rise +0.01 / allowed -0.00 / SE 0.06 / z +0.20 (filed: above the allowance; 20436 aimed); set 2 0.39 -> 0.39, rise +0.00 / allowed +0.00 / SE 0.06 / z -0.02 (filed: within the allowance; 20539 aimed); Z +0.13 against 3.0, e* 0.13, mean excess +0.01: PASS; paired SE 0.01 (set 1, 496 games, z +1.17), 0.01 (set 2, 496 games, z -0.07); paired Z +0.78 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.64, rise -0.05 / allowed +0.00 / SE 0.58 / z -0.10 (filed: within the allowance; 6613 aimed); set 2 11.57 -> 11.76, rise +0.19 / allowed -0.00 / SE 0.56 / z +0.33 (filed: above the allowance; 6676 aimed); Z +0.17 against 3.0, e* 1.20, mean excess +0.07: PASS; paired SE 0.13 (set 1, 496 games, z -0.44), 0.13 (set 2, 496 games, z +1.48); paired Z +0.74 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.21, rise -0.00 / allowed +0.00 / SE 0.07 / z -0.03 (filed: within the allowance; 9044 aimed); set 2 0.16 -> 0.18, rise +0.01 / allowed -0.00 / SE 0.06 / z +0.23 (filed: above the allowance; 9141 aimed); Z +0.14 against 3.0, e* 0.14, mean excess +0.01: PASS; paired SE 0.00 (set 1, 496 games, z -1.28), 0.01 (set 2, 496 games, z +1.24); paired Z -0.03 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.38, rise +0.03 / allowed +0.00 / SE 0.54 / z +0.05 (filed: above the allowance; 3436 aimed); set 2 6.32 -> 6.44, rise +0.12 / allowed +0.01 / SE 0.59 / z +0.18 (filed: above the allowance; 3416 aimed); Z +0.16 against 3.0, e* 1.20, mean excess +0.06: PASS; paired SE 0.09 (set 1, 496 games, z +0.27), 0.14 (set 2, 496 games, z +0.77); paired Z +0.73 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 5.44, rise +0.00 / allowed +0.00 / SE 2.65 / z -0.00 (filed: within the allowance; 147 aimed); set 2 9.16 -> 9.09, rise -0.07 / allowed +0.00 / SE 3.55 / z -0.02 (filed: within the allowance; 132 aimed); Z -0.01 against 3.0, e* 6.43, mean excess -0.04: PASS; paired SE 0.09 (set 1, 496 games, z -0.02), 0.26 (set 2, 496 games, z -0.28); paired Z -0.21 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 1003 / 43; set 2 base 981 aimed / 41 INT -> arm 983 / 40; set 1 4.22 -> 4.29, rise +0.07 / allowed +0.01 / SE 0.90 / z +0.07 (filed: above the allowance; 1003 aimed); set 2 4.18 -> 4.07, rise -0.11 / allowed +0.01 / SE 0.90 / z -0.14 (filed: within the allowance; 983 aimed); Z -0.05 against 3.0, e* 1.91, mean excess -0.03 (reported); paired SE 0.17 (set 1, 496 games, z +0.35), 0.11 (set 2, 496 games, z -1.12); paired Z -0.55 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2433 / 142; set 2 base 2450 aimed / 176 INT -> arm 2433 / 180; set 1 5.82 -> 5.84, rise +0.02 / allowed +0.00 / SE 0.67 / z +0.02 (filed: above the allowance; 2433 aimed); set 2 7.18 -> 7.40, rise +0.21 / allowed +0.01 / SE 0.74 / z +0.27 (filed: above the allowance; 2433 aimed); Z +0.21 against 3.0, e* 1.50, mean excess +0.11 (reported); paired SE 0.11 (set 1, 496 games, z +0.14), 0.18 (set 2, 496 games, z +1.14); paired Z +0.91 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 29.19% / clean 70.81%; the class's rise +0.03, re-weighted to the base's composition +0.03 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 28.78% / clean 71.22%; the class's rise +0.12, re-weighted to the base's composition +0.12 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 26282 looks (threat part 6241, status part 6245, count part 22930; rule part 6241 under PER_RUSHER: rule only 3352, count only 20041, both 2889, neither 0); set 2 26409 looks (threat part 6285, status part 6289, count part 22995; rule part 6285 under PER_RUSHER: rule only 3414, count only 20124, both 2871, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 27.11% / count 72.89% / status 0.00% / none 0.00%; the class's rise -0.00, re-weighted to the base's composition +0.00 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 26.99% / count 73.01% / status 0.00% / none 0.00%; the class's rise +0.01, re-weighted to the base's composition +0.01 (reported)

### C9 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.36, rise +0.06 / allowed +0.00 / SE 0.24 / z +0.25 (filed: above the allowance; 24438 aimed); set 2 7.69 -> 7.69, rise -0.00 / allowed +0.00 / SE 0.24 / z -0.01 (filed: within the allowance; 24883 aimed); Z +0.17 against 2.0, e* 0.34, mean excess +0.03: PASS; paired SE 0.08 (set 1, 272 games, z +0.74), 0.07 (set 2, 272 games, z -0.04); paired Z +0.50 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.65, rise -0.06 / allowed -0.00 / SE 0.19 / z -0.30 (filed: within the allowance; 13810 aimed); set 2 2.79 -> 2.79, rise +0.00 / allowed -0.00 / SE 0.19 / z +0.03 (filed: above the allowance; 14549 aimed); Z -0.19 against 3.0, e* 0.41, mean excess -0.03: PASS; paired SE 0.06 (set 1, 272 games, z -0.93), 0.07 (set 2, 272 games, z +0.07); paired Z -0.61 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.19, rise +0.44 / allowed +0.00 / SE 0.89 / z +0.50 (filed: above the allowance; 4072 aimed); set 2 20.68 -> 20.98, rise +0.30 / allowed +0.01 / SE 0.90 / z +0.32 (filed: above the allowance; 4013 aimed); Z +0.58 against 3.0, e* 1.90, mean excess +0.36: PASS; paired SE 0.28 (set 1, 272 games, z +1.59), 0.29 (set 2, 272 games, z +0.98); paired Z +1.82 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 3.23, rise +0.02 / allowed +0.01 / SE 0.42 / z +0.02 (filed: above the allowance; 3592 aimed); set 2 3.75 -> 3.51, rise -0.24 / allowed +0.02 / SE 0.46 / z -0.55 (filed: within the allowance; 3277 aimed); Z -0.38 against 3.0, e* 0.93, mean excess -0.12: PASS; paired SE 0.15 (set 1, 272 games, z +0.06), 0.18 (set 2, 272 games, z -1.45); paired Z -0.99 (reported, never graded)
- DESPERATION: set 1 16.61 -> 16.59, rise -0.02 / allowed +0.01 / SE 0.98 / z -0.03 (filed: within the allowance; 2893 aimed); set 2 18.18 -> 18.29, rise +0.12 / allowed +0.00 / SE 1.00 / z +0.11 (filed: above the allowance; 2979 aimed); Z +0.06 against 3.0, e* 2.10, mean excess +0.04: PASS; paired SE 0.33 (set 1, 272 games, z -0.10), 0.31 (set 2, 272 games, z +0.37); paired Z +0.19 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 21.13, rise +1.13 / allowed +0.02 / SE 6.81 / z +0.16 (filed: above the allowance; 71 aimed); set 2 8.45 -> 9.23, rise +0.78 / allowed -0.02 / SE 4.88 / z +0.16 (filed: above the allowance; 65 aimed); Z +0.23 against 3.0, e* 12.05, mean excess +0.96: PASS; paired SE 2.98 (set 1, 272 games, z +0.37), 0.69 (set 2, 272 games, z +1.16); paired Z +1.09 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 1055 / 151; set 2 base 1216 aimed / 203 INT -> arm 1210 / 206; set 1 14.26 -> 14.31, rise +0.05 / allowed +0.03 / SE 1.52 / z +0.01 (filed: above the allowance; 1055 aimed); set 2 16.69 -> 17.02, rise +0.33 / allowed +0.02 / SE 1.52 / z +0.20 (filed: above the allowance; 1210 aimed); Z +0.15 against 3.0, e* 3.23, mean excess +0.17 (reported); paired SE 0.66 (set 1, 272 games, z +0.03), 0.46 (set 2, 272 games, z +0.67); paired Z +0.50 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1838 / 329; set 2 base 1815 aimed / 348 INT -> arm 1769 / 339; set 1 17.97 -> 17.90, rise -0.07 / allowed -0.00 / SE 1.27 / z -0.05 (filed: within the allowance; 1838 aimed); set 2 19.17 -> 19.16, rise -0.01 / allowed -0.01 / SE 1.32 / z -0.00 (filed: within the allowance; 1769 aimed); Z -0.04 against 3.0, e* 2.74, mean excess -0.03 (reported); paired SE 0.38 (set 1, 272 games, z -0.17), 0.42 (set 2, 272 games, z -0.00); paired Z -0.12 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 36.47% / clean 63.53%; the class's rise -0.02, re-weighted to the base's composition -0.02 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 40.62% / clean 59.38%; the class's rise +0.12, re-weighted to the base's composition +0.13 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8882 looks (threat part 3794, status part 3795, count part 5883; rule part 3794 under PER_RUSHER: rule only 2999, count only 5088, both 795, neither 0); set 2 7931 looks (threat part 4061, status part 4064, count part 4509; rule part 4061 under PER_RUSHER: rule only 3422, count only 3870, both 639, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 48.69% / count 51.31% / status 0.00% / none 0.00%; the class's rise +0.02, re-weighted to the base's composition +0.02 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 58.65% / count 41.35% / status 0.00% / none 0.00%; the class's rise -0.24, re-weighted to the base's composition -0.23 (reported)

### C10 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.87, rise +0.04 / allowed +0.01 / SE 0.12 / z +0.30 (filed: above the allowance; 39696 aimed); set 2 2.75 -> 2.72, rise -0.03 / allowed +0.02 / SE 0.12 / z -0.40 (filed: within the allowance; 39832 aimed); Z -0.07 against 2.0, e* 0.17, mean excess -0.01: PASS; paired SE 0.07 (set 1, 496 games, z +0.52), 0.07 (set 2, 496 games, z -0.66); paired Z -0.10 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.35, rise -0.00 / allowed +0.00 / SE 0.06 / z -0.08 (filed: within the allowance; 20540 aimed); set 2 0.39 -> 0.33, rise -0.07 / allowed +0.01 / SE 0.06 / z -1.28 (filed: within the allowance; 20536 aimed); Z -0.96 against 3.0, e* 0.12, mean excess -0.04: PASS; paired SE 0.04 (set 1, 496 games, z -0.13), 0.04 (set 2, 496 games, z -2.07); paired Z -1.56 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.62, rise -0.08 / allowed -0.00 / SE 0.58 / z -0.13 (filed: within the allowance; 6704 aimed); set 2 11.57 -> 11.66, rise +0.09 / allowed +0.02 / SE 0.55 / z +0.11 (filed: above the allowance; 6733 aimed); Z -0.01 against 3.0, e* 1.20, mean excess -0.01: PASS; paired SE 0.34 (set 1, 496 games, z -0.21), 0.32 (set 2, 496 games, z +0.20); paired Z -0.01 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.25, rise +0.04 / allowed +0.01 / SE 0.07 / z +0.37 (filed: above the allowance; 8858 aimed); set 2 0.16 -> 0.19, rise +0.02 / allowed +0.01 / SE 0.06 / z +0.21 (filed: above the allowance; 9005 aimed); Z +0.41 against 3.0, e* 0.14, mean excess +0.02: PASS; paired SE 0.04 (set 1, 496 games, z +0.65), 0.04 (set 2, 496 games, z +0.31); paired Z +0.68 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.51, rise +0.15 / allowed +0.03 / SE 0.55 / z +0.23 (filed: above the allowance; 3469 aimed); set 2 6.32 -> 6.06, rise -0.27 / allowed +0.05 / SE 0.58 / z -0.55 (filed: within the allowance; 3433 aimed); Z -0.23 against 3.0, e* 1.19, mean excess -0.10: PASS; paired SE 0.30 (set 1, 496 games, z +0.42), 0.33 (set 2, 496 games, z -0.98); paired Z -0.40 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 7.20, rise +1.76 / allowed +0.06 / SE 2.97 / z +0.57 (filed: above the allowance; 125 aimed); set 2 9.16 -> 4.80, rise -4.36 / allowed +0.00 / SE 3.16 / z -1.38 (filed: within the allowance; 125 aimed); Z -0.57 against 3.0, e* 6.50, mean excess -1.33: PASS; paired SE 2.15 (set 1, 496 games, z +0.79), 2.33 (set 2, 496 games, z -1.87); paired Z -0.76 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 827 / 41; set 2 base 981 aimed / 41 INT -> arm 830 / 35; set 1 4.22 -> 4.96, rise +0.74 / allowed +0.17 / SE 0.99 / z +0.57 (filed: above the allowance; 827 aimed); set 2 4.18 -> 4.22, rise +0.04 / allowed +0.17 / SE 0.95 / z -0.14 (filed: within the allowance; 830 aimed); Z +0.30 against 3.0, e* 2.05, mean excess +0.22 (reported); paired SE 0.57 (set 1, 496 games, z +0.99), 0.55 (set 2, 496 games, z -0.24); paired Z +0.53 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2642 / 150; set 2 base 2450 aimed / 176 INT -> arm 2603 / 173; set 1 5.82 -> 5.68, rise -0.14 / allowed -0.02 / SE 0.65 / z -0.19 (filed: within the allowance; 2642 aimed); set 2 7.18 -> 6.65, rise -0.54 / allowed +0.02 / SE 0.71 / z -0.78 (filed: within the allowance; 2603 aimed); Z -0.68 against 3.0, e* 1.45, mean excess -0.34 (reported); paired SE 0.36 (set 1, 496 games, z -0.35), 0.41 (set 2, 496 games, z -1.34); paired Z -1.19 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 23.84% / clean 76.16%; the class's rise +0.15, re-weighted to the base's composition +0.11 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 24.18% / clean 75.82%; the class's rise -0.27, re-weighted to the base's composition -0.37 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 25707 looks (threat part 5483, status part 5489, count part 22812; rule part 5483 under PER_RUSHER: rule only 2895, count only 20224, both 2588, neither 0); set 2 25956 looks (threat part 5590, status part 5594, count part 22982; rule part 5590 under PER_RUSHER: rule only 2974, count only 20366, both 2616, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 24.76% / count 75.24% / status 0.00% / none 0.00%; the class's rise +0.04, re-weighted to the base's composition +0.05 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 25.44% / count 74.56% / status 0.00% / none 0.00%; the class's rise +0.02, re-weighted to the base's composition +0.03 (reported)

### C10 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.66, rise +0.36 / allowed +0.01 / SE 0.24 / z +1.44 (filed: above the allowance; 24637 aimed); set 2 7.69 -> 7.51, rise -0.19 / allowed +0.02 / SE 0.24 / z -0.87 (filed: within the allowance; 24903 aimed); Z +0.41 against 2.0, e* 0.34, mean excess +0.07: PASS; paired SE 0.14 (set 1, 272 games, z +2.49), 0.13 (set 2, 272 games, z -1.61); paired Z +0.63 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.69, rise -0.02 / allowed +0.01 / SE 0.19 / z -0.12 (filed: within the allowance; 14003 aimed); set 2 2.79 -> 2.75, rise -0.03 / allowed +0.00 / SE 0.19 / z -0.20 (filed: within the allowance; 14601 aimed); Z -0.23 against 3.0, e* 0.41, mean excess -0.03: PASS; paired SE 0.12 (set 1, 272 games, z -0.20), 0.10 (set 2, 272 games, z -0.36); paired Z -0.40 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.34, rise +0.60 / allowed +0.01 / SE 0.88 / z +0.66 (filed: above the allowance; 4174 aimed); set 2 20.68 -> 20.10, rise -0.58 / allowed +0.03 / SE 0.89 / z -0.69 (filed: within the allowance; 4080 aimed); Z -0.02 against 3.0, e* 1.89, mean excess -0.02: PASS; paired SE 0.47 (set 1, 272 games, z +1.24), 0.54 (set 2, 272 games, z -1.15); paired Z +0.06 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 3.15, rise -0.06 / allowed +0.03 / SE 0.42 / z -0.21 (filed: within the allowance; 3427 aimed); set 2 3.75 -> 3.53, rise -0.21 / allowed +0.02 / SE 0.46 / z -0.50 (filed: within the allowance; 3198 aimed); Z -0.50 against 3.0, e* 0.94, mean excess -0.16: PASS; paired SE 0.23 (set 1, 272 games, z -0.38), 0.26 (set 2, 272 games, z -0.88); paired Z -0.89 (reported, never graded)
- DESPERATION: set 1 16.61 -> 18.14, rise +1.52 / allowed +0.04 / SE 0.99 / z +1.50 (filed: above the allowance; 2966 aimed); set 2 18.18 -> 17.70, rise -0.48 / allowed +0.08 / SE 0.99 / z -0.56 (filed: within the allowance; 2949 aimed); Z +0.66 against 3.0, e* 2.10, mean excess +0.46: PASS; paired SE 0.56 (set 1, 272 games, z +2.67), 0.52 (set 2, 272 games, z -1.08); paired Z +1.13 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 22.39, rise +2.39 / allowed -0.10 / SE 6.99 / z +0.36 (filed: above the allowance; 67 aimed); set 2 8.45 -> 16.00, rise +7.55 / allowed -0.01 / SE 5.37 / z +1.41 (filed: above the allowance; 75 aimed); Z +1.25 against 3.0, e* 12.88, mean excess +5.02: PASS; paired SE 4.53 (set 1, 272 games, z +0.55), 2.93 (set 2, 272 games, z +2.58); paired Z +2.21 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 984 / 157; set 2 base 1216 aimed / 203 INT -> arm 1087 / 179; set 1 14.26 -> 15.96, rise +1.70 / allowed +0.13 / SE 1.59 / z +0.99 (filed: above the allowance; 984 aimed); set 2 16.69 -> 16.47, rise -0.23 / allowed +0.20 / SE 1.55 / z -0.28 (filed: within the allowance; 1087 aimed); Z +0.50 against 3.0, e* 3.33, mean excess +0.57 (reported); paired SE 1.02 (set 1, 272 games, z +1.54), 0.87 (set 2, 272 games, z -0.49); paired Z +0.74 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1982 / 381; set 2 base 1815 aimed / 348 INT -> arm 1862 / 343; set 1 17.97 -> 19.22, rise +1.25 / allowed -0.01 / SE 1.26 / z +1.00 (filed: above the allowance; 1982 aimed); set 2 19.17 -> 18.42, rise -0.75 / allowed +0.00 / SE 1.29 / z -0.58 (filed: within the allowance; 1862 aimed); Z +0.30 against 3.0, e* 2.70, mean excess +0.26 (reported); paired SE 0.69 (set 1, 272 games, z +1.82), 0.71 (set 2, 272 games, z -1.06); paired Z +0.54 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 33.18% / clean 66.82%; the class's rise +1.52, re-weighted to the base's composition +1.42 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 36.86% / clean 63.14%; the class's rise -0.48, re-weighted to the base's composition -0.54 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8702 looks (threat part 3436, status part 3440, count part 5961; rule part 3436 under PER_RUSHER: rule only 2741, count only 5266, both 695, neither 0); set 2 7719 looks (threat part 3626, status part 3628, count part 4629; rule part 3626 under PER_RUSHER: rule only 3090, count only 4093, both 536, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 46.19% / count 53.81% / status 0.00% / none 0.00%; the class's rise -0.06, re-weighted to the base's composition -0.04 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 54.57% / count 45.43% / status 0.00% / none 0.00%; the class's rise -0.21, re-weighted to the base's composition -0.20 (reported)

### C12 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.90, rise +0.07 / allowed +0.03 / SE 0.12 / z +0.38 (filed: above the allowance; 41031 aimed); set 2 2.75 -> 2.73, rise -0.02 / allowed +0.03 / SE 0.11 / z -0.40 (filed: within the allowance; 41452 aimed); Z -0.01 against 2.0, e* 0.16, mean excess -0.00: PASS; paired SE 0.09 (set 1, 496 games, z +0.51), 0.09 (set 2, 496 games, z -0.53); paired Z -0.01 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.40, rise +0.06 / allowed +0.01 / SE 0.06 / z +0.75 (filed: above the allowance; 21250 aimed); set 2 0.39 -> 0.31, rise -0.08 / allowed +0.01 / SE 0.06 / z -1.62 (filed: within the allowance; 21733 aimed); Z -0.61 against 3.0, e* 0.12, mean excess -0.02: PASS; paired SE 0.04 (set 1, 496 games, z +1.06), 0.04 (set 2, 496 games, z -2.21); paired Z -0.81 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.09, rise -0.61 / allowed +0.02 / SE 0.56 / z -1.12 (filed: within the allowance; 7246 aimed); set 2 11.57 -> 11.85, rise +0.28 / allowed +0.03 / SE 0.55 / z +0.45 (filed: above the allowance; 7165 aimed); Z -0.47 against 3.0, e* 1.17, mean excess -0.19: PASS; paired SE 0.41 (set 1, 496 games, z -1.51), 0.41 (set 2, 496 games, z +0.60); paired Z -0.64 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.23, rise +0.01 / allowed +0.05 / SE 0.07 / z -0.53 (filed: within the allowance; 8879 aimed); set 2 0.16 -> 0.18, rise +0.02 / allowed +0.05 / SE 0.06 / z -0.48 (filed: within the allowance; 8876 aimed); Z -0.71 against 3.0, e* 0.14, mean excess -0.03: PASS; paired SE 0.06 (set 1, 496 games, z -0.66), 0.05 (set 2, 496 games, z -0.58); paired Z -0.88 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.70, rise +0.34 / allowed +0.07 / SE 0.55 / z +0.49 (filed: above the allowance; 3528 aimed); set 2 6.32 -> 5.43, rise -0.90 / allowed +0.07 / SE 0.56 / z -1.72 (filed: within the allowance; 3557 aimed); Z -0.87 against 3.0, e* 1.18, mean excess -0.35: PASS; paired SE 0.41 (set 1, 496 games, z +0.66), 0.44 (set 2, 496 games, z -2.21); paired Z -1.10 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 6.25, rise +0.81 / allowed +0.21 / SE 2.84 / z +0.21 (filed: above the allowance; 128 aimed); set 2 9.16 -> 5.79, rise -3.38 / allowed +0.16 / SE 3.29 / z -1.07 (filed: within the allowance; 121 aimed); Z -0.61 against 3.0, e* 6.47, mean excess -1.46: PASS; paired SE 2.49 (set 1, 496 games, z +0.24), 2.94 (set 2, 496 games, z -1.20); paired Z -0.68 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 582 / 33; set 2 base 981 aimed / 41 INT -> arm 604 / 24; set 1 4.22 -> 5.67, rise +1.45 / allowed +0.67 / SE 1.15 / z +0.67 (filed: above the allowance; 582 aimed); set 2 4.18 -> 3.97, rise -0.21 / allowed +0.71 / SE 1.02 / z -0.90 (filed: within the allowance; 604 aimed); Z -0.16 against 3.0, e* 2.29, mean excess -0.07 (reported); paired SE 1.05 (set 1, 496 games, z +0.74), 0.88 (set 2, 496 games, z -1.04); paired Z -0.21 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2946 / 168; set 2 base 2450 aimed / 176 INT -> arm 2953 / 169; set 1 5.82 -> 5.70, rise -0.12 / allowed -0.04 / SE 0.64 / z -0.12 (filed: within the allowance; 2946 aimed); set 2 7.18 -> 5.72, rise -1.46 / allowed -0.06 / SE 0.67 / z -2.08 (filed: within the allowance; 2953 aimed); Z -1.56 against 3.0, e* 1.39, mean excess -0.74 (reported); paired SE 0.47 (set 1, 496 games, z -0.17), 0.52 (set 2, 496 games, z -2.69); paired Z -2.02 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 16.50% / clean 83.50%; the class's rise +0.34, re-weighted to the base's composition +0.34 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 16.98% / clean 83.02%; the class's rise -0.90, re-weighted to the base's composition -1.10 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 25926 looks (threat part 3114, status part 3135, count part 24476; rule part 3114 under PER_RUSHER: rule only 1450, count only 22812, both 1664, neither 0); set 2 25972 looks (threat part 3130, status part 3151, count part 24445; rule part 3130 under PER_RUSHER: rule only 1527, count only 22842, both 1603, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 12.51% / count 87.49% / status 0.00% / none 0.00%; the class's rise +0.01, re-weighted to the base's composition +0.12 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 12.78% / count 87.22% / status 0.00% / none 0.00%; the class's rise +0.02, re-weighted to the base's composition +0.02 (reported)

### C12 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.44, rise +0.14 / allowed +0.05 / SE 0.23 / z +0.40 (filed: above the allowance; 25135 aimed); set 2 7.69 -> 7.72, rise +0.03 / allowed +0.06 / SE 0.24 / z -0.13 (filed: within the allowance; 25268 aimed); Z +0.19 against 2.0, e* 0.33, mean excess +0.03: PASS; paired SE 0.18 (set 1, 272 games, z +0.53), 0.18 (set 2, 272 games, z -0.17); paired Z +0.26 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.50, rise -0.21 / allowed +0.02 / SE 0.19 / z -1.20 (filed: within the allowance; 14787 aimed); set 2 2.79 -> 2.79, rise +0.00 / allowed +0.01 / SE 0.19 / z -0.06 (filed: within the allowance; 15422 aimed); Z -0.89 against 3.0, e* 0.40, mean excess -0.12: PASS; paired SE 0.14 (set 1, 272 games, z -1.63), 0.13 (set 2, 272 games, z -0.08); paired Z -1.21 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.25, rise +0.51 / allowed +0.02 / SE 0.88 / z +0.56 (filed: above the allowance; 4311 aimed); set 2 20.68 -> 20.87, rise +0.19 / allowed +0.07 / SE 0.89 / z +0.13 (filed: above the allowance; 4312 aimed); Z +0.49 against 3.0, e* 1.87, mean excess +0.30: PASS; paired SE 0.65 (set 1, 272 games, z +0.75), 0.70 (set 2, 272 games, z +0.17); paired Z +0.65 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 3.06, rise -0.15 / allowed +0.20 / SE 0.43 / z -0.81 (filed: within the allowance; 3037 aimed); set 2 3.75 -> 3.72, rise -0.03 / allowed +0.24 / SE 0.50 / z -0.54 (filed: within the allowance; 2580 aimed); Z -0.95 against 3.0, e* 0.98, mean excess -0.31: PASS; paired SE 0.31 (set 1, 272 games, z -1.13), 0.40 (set 2, 272 games, z -0.67); paired Z -1.28 (reported, never graded)
- DESPERATION: set 1 16.61 -> 17.98, rise +1.37 / allowed +0.11 / SE 0.99 / z +1.27 (filed: above the allowance; 2947 aimed); set 2 18.18 -> 17.75, rise -0.43 / allowed +0.17 / SE 0.99 / z -0.61 (filed: within the allowance; 2930 aimed); Z +0.47 against 3.0, e* 2.11, mean excess +0.33: PASS; paired SE 0.74 (set 1, 272 games, z +1.71), 0.73 (set 2, 272 games, z -0.82); paired Z +0.63 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 9.43, rise -10.57 / allowed +0.14 / SE 6.24 / z -1.71 (filed: within the allowance; 53 aimed); set 2 8.45 -> 20.83, rise +12.38 / allowed +0.15 / SE 8.92 / z +1.37 (filed: above the allowance; 24 aimed); Z -0.24 against 3.0, e* 15.58, mean excess +0.76: PASS; paired SE 5.90 (set 1, 272 games, z -1.81), 6.78 (set 2, 272 games, z +1.80); paired Z -0.01 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 780 / 115; set 2 base 1216 aimed / 203 INT -> arm 927 / 146; set 1 14.26 -> 14.74, rise +0.49 / allowed +0.64 / SE 1.67 / z -0.09 (filed: within the allowance; 780 aimed); set 2 16.69 -> 15.75, rise -0.94 / allowed +0.70 / SE 1.60 / z -1.02 (filed: within the allowance; 927 aimed); Z -0.79 against 3.0, e* 3.47, mean excess -0.90 (reported); paired SE 1.33 (set 1, 272 games, z -0.12), 1.42 (set 2, 272 games, z -1.16); paired Z -0.90 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 2167 / 415; set 2 base 1815 aimed / 348 INT -> arm 2003 / 374; set 1 17.97 -> 19.15, rise +1.18 / allowed -0.10 / SE 1.23 / z +1.04 (filed: above the allowance; 2167 aimed); set 2 19.17 -> 18.67, rise -0.50 / allowed -0.09 / SE 1.27 / z -0.32 (filed: within the allowance; 2003 aimed); Z +0.51 against 3.0, e* 2.65, mean excess +0.44 (reported); paired SE 0.95 (set 1, 272 games, z +1.35), 0.88 (set 2, 272 games, z -0.47); paired Z +0.62 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 26.47% / clean 73.53%; the class's rise +1.37, re-weighted to the base's composition +0.93 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 31.64% / clean 68.36%; the class's rise -0.43, re-weighted to the base's composition -0.68 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 7918 looks (threat part 2088, status part 2100, count part 6386; rule part 2088 under PER_RUSHER: rule only 1532, count only 5830, both 556, neither 0); set 2 6669 looks (threat part 2249, status part 2252, count part 4903; rule part 2249 under PER_RUSHER: rule only 1766, count only 4420, both 483, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 30.59% / count 69.41% / status 0.00% / none 0.00%; the class's rise -0.15, re-weighted to the base's composition -0.02 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 39.53% / count 60.47% / status 0.00% / none 0.00%; the class's rise -0.03, re-weighted to the base's composition +0.01 (reported)

### C13 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.92, rise +0.09 / allowed +0.04 / SE 0.12 / z +0.43 (filed: above the allowance; 41239 aimed); set 2 2.75 -> 2.76, rise +0.01 / allowed +0.04 / SE 0.11 / z -0.26 (filed: within the allowance; 41747 aimed); Z +0.12 against 2.0, e* 0.16, mean excess +0.01: PASS; paired SE 0.08 (set 1, 496 games, z +0.61), 0.09 (set 2, 496 games, z -0.35); paired Z +0.18 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.36, rise +0.01 / allowed +0.03 / SE 0.06 / z -0.31 (filed: within the allowance; 21557 aimed); set 2 0.39 -> 0.35, rise -0.05 / allowed +0.03 / SE 0.06 / z -1.30 (filed: within the allowance; 21967 aimed); Z -1.14 against 3.0, e* 0.12, mean excess -0.05: PASS; paired SE 0.04 (set 1, 496 games, z -0.45), 0.04 (set 2, 496 games, z -1.87); paired Z -1.63 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.70, rise +0.01 / allowed +0.05 / SE 0.57 / z -0.07 (filed: within the allowance; 7195 aimed); set 2 11.57 -> 11.74, rise +0.17 / allowed +0.07 / SE 0.55 / z +0.19 (filed: above the allowance; 7205 aimed); Z +0.08 against 3.0, e* 1.18, mean excess +0.03: PASS; paired SE 0.40 (set 1, 496 games, z -0.10), 0.40 (set 2, 496 games, z +0.26); paired Z +0.11 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.20, rise -0.01 / allowed +0.04 / SE 0.07 / z -0.71 (filed: within the allowance; 8891 aimed); set 2 0.16 -> 0.21, rise +0.05 / allowed +0.04 / SE 0.06 / z +0.20 (filed: above the allowance; 8878 aimed); Z -0.37 against 3.0, e* 0.14, mean excess -0.02: PASS; paired SE 0.05 (set 1, 496 games, z -0.94), 0.06 (set 2, 496 games, z +0.23); paired Z -0.51 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.40, rise +0.04 / allowed +0.09 / SE 0.54 / z -0.08 (filed: within the allowance; 3519 aimed); set 2 6.32 -> 5.75, rise -0.57 / allowed +0.12 / SE 0.57 / z -1.23 (filed: within the allowance; 3632 aimed); Z -0.93 against 3.0, e* 1.18, mean excess -0.37: PASS; paired SE 0.41 (set 1, 496 games, z -0.11), 0.41 (set 2, 496 games, z -1.68); paired Z -1.27 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 5.19, rise -0.25 / allowed +0.13 / SE 3.15 / z -0.12 (filed: within the allowance; 77 aimed); set 2 9.16 -> 6.15, rise -3.01 / allowed +0.15 / SE 3.90 / z -0.81 (filed: within the allowance; 65 aimed); Z -0.66 against 3.0, e* 7.39, mean excess -1.76: PASS; paired SE 2.60 (set 1, 496 games, z -0.14), 3.18 (set 2, 496 games, z -0.99); paired Z -0.80 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 515 / 26; set 2 base 981 aimed / 41 INT -> arm 563 / 29; set 1 4.22 -> 5.05, rise +0.83 / allowed +0.91 / SE 1.16 / z -0.07 (filed: within the allowance; 515 aimed); set 2 4.18 -> 5.15, rise +0.97 / allowed +0.92 / SE 1.13 / z +0.04 (filed: above the allowance; 563 aimed); Z -0.02 against 3.0, e* 2.42, mean excess -0.02 (reported); paired SE 1.03 (set 1, 496 games, z -0.08), 0.98 (set 2, 496 games, z +0.05); paired Z -0.02 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 3004 / 164; set 2 base 2450 aimed / 176 INT -> arm 3069 / 180; set 1 5.82 -> 5.46, rise -0.36 / allowed -0.04 / SE 0.63 / z -0.50 (filed: within the allowance; 3004 aimed); set 2 7.18 -> 5.87, rise -1.32 / allowed -0.02 / SE 0.67 / z -1.93 (filed: within the allowance; 3069 aimed); Z -1.72 against 3.0, e* 1.38, mean excess -0.81 (reported); paired SE 0.48 (set 1, 496 games, z -0.66), 0.49 (set 2, 496 games, z -2.66); paired Z -2.34 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 14.63% / clean 85.37%; the class's rise +0.04, re-weighted to the base's composition -0.02 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 15.50% / clean 84.50%; the class's rise -0.57, re-weighted to the base's composition -0.66 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 25788 looks (threat part 2813, status part 2815, count part 24334; rule part 2813 under PER_RUSHER: rule only 1454, count only 22975, both 1359, neither 0); set 2 25821 looks (threat part 2747, status part 2750, count part 24322; rule part 2747 under PER_RUSHER: rule only 1499, count only 23074, both 1248, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 13.73% / count 86.27% / status 0.00% / none 0.00%; the class's rise -0.01, re-weighted to the base's composition +0.03 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 13.36% / count 86.64% / status 0.00% / none 0.00%; the class's rise +0.05, re-weighted to the base's composition +0.04 (reported)

### C13 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.44, rise +0.13 / allowed +0.07 / SE 0.24 / z +0.26 (filed: above the allowance; 25056 aimed); set 2 7.69 -> 7.79, rise +0.09 / allowed +0.08 / SE 0.24 / z +0.04 (filed: above the allowance; 25493 aimed); Z +0.21 against 2.0, e* 0.33, mean excess +0.04: PASS; paired SE 0.18 (set 1, 272 games, z +0.35), 0.17 (set 2, 272 games, z +0.06); paired Z +0.29 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.44, rise -0.27 / allowed +0.03 / SE 0.19 / z -1.61 (filed: within the allowance; 14739 aimed); set 2 2.79 -> 2.73, rise -0.06 / allowed +0.03 / SE 0.19 / z -0.46 (filed: within the allowance; 15530 aimed); Z -1.46 against 3.0, e* 0.40, mean excess -0.19: PASS; paired SE 0.13 (set 1, 272 games, z -2.27), 0.14 (set 2, 272 games, z -0.63); paired Z -2.05 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.30, rise +0.55 / allowed +0.05 / SE 0.87 / z +0.58 (filed: above the allowance; 4380 aimed); set 2 20.68 -> 21.69, rise +1.01 / allowed +0.11 / SE 0.89 / z +1.01 (filed: above the allowance; 4416 aimed); Z +1.13 against 3.0, e* 1.87, mean excess +0.70: PASS; paired SE 0.67 (set 1, 272 games, z +0.76), 0.65 (set 2, 272 games, z +1.39); paired Z +1.52 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 2.87, rise -0.34 / allowed +0.18 / SE 0.43 / z -1.23 (filed: within the allowance; 2993 aimed); set 2 3.75 -> 3.00, rise -0.75 / allowed +0.22 / SE 0.47 / z -2.06 (filed: within the allowance; 2600 aimed); Z -2.32 against 3.0, e* 0.95, mean excess -0.75: PASS; paired SE 0.33 (set 1, 272 games, z -1.60), 0.33 (set 2, 272 games, z -2.90); paired Z -3.18 (reported, never graded)
- DESPERATION: set 1 16.61 -> 18.01, rise +1.40 / allowed +0.21 / SE 0.99 / z +1.19 (filed: above the allowance; 2904 aimed); set 2 18.18 -> 17.76, rise -0.42 / allowed +0.25 / SE 1.00 / z -0.68 (filed: within the allowance; 2917 aimed); Z +0.36 against 3.0, e* 2.11, mean excess +0.26: PASS; paired SE 0.66 (set 1, 272 games, z +1.78), 0.71 (set 2, 272 games, z -0.96); paired Z +0.58 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 12.50, rise -7.50 / allowed +0.14 / SE 7.09 / z -1.08 (filed: within the allowance; 40 aimed); set 2 8.45 -> 23.33, rise +14.88 / allowed +0.27 / SE 8.40 / z +1.74 (filed: above the allowance; 30 aimed); Z +0.47 against 3.0, e* 16.30, mean excess +3.49: PASS; paired SE 5.80 (set 1, 272 games, z -1.32), 6.33 (set 2, 272 games, z +2.31); paired Z +0.70 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 699 / 101; set 2 base 1216 aimed / 203 INT -> arm 778 / 114; set 1 14.26 -> 14.45, rise +0.19 / allowed +0.96 / SE 1.71 / z -0.45 (filed: within the allowance; 699 aimed); set 2 16.69 -> 14.65, rise -2.04 / allowed +1.00 / SE 1.66 / z -1.83 (filed: within the allowance; 778 aimed); Z -1.61 against 3.0, e* 3.57, mean excess -1.90 (reported); paired SE 1.35 (set 1, 272 games, z -0.57), 1.40 (set 2, 272 games, z -2.17); paired Z -1.94 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 2205 / 422; set 2 base 1815 aimed / 348 INT -> arm 2139 / 404; set 1 17.97 -> 19.14, rise +1.17 / allowed -0.05 / SE 1.23 / z +0.99 (filed: above the allowance; 2205 aimed); set 2 19.17 -> 18.89, rise -0.29 / allowed -0.05 / SE 1.25 / z -0.19 (filed: within the allowance; 2139 aimed); Z +0.57 against 3.0, e* 2.63, mean excess +0.49 (reported); paired SE 0.86 (set 1, 272 games, z +1.41), 0.84 (set 2, 272 games, z -0.28); paired Z +0.80 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 24.07% / clean 75.93%; the class's rise +1.40, re-weighted to the base's composition +0.81 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 26.67% / clean 73.33%; the class's rise -0.42, re-weighted to the base's composition -0.99 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 7726 looks (threat part 1878, status part 1881, count part 6327; rule part 1878 under PER_RUSHER: rule only 1399, count only 5848, both 479, neither 0); set 2 6596 looks (threat part 1988, status part 1991, count part 4987; rule part 1988 under PER_RUSHER: rule only 1609, count only 4608, both 379, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 28.90% / count 71.10% / status 0.00% / none 0.00%; the class's rise -0.34, re-weighted to the base's composition -0.43 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 36.42% / count 63.58% / status 0.00% / none 0.00%; the class's rise -0.75, re-weighted to the base's composition -0.69 (reported)

### C14 against B5, flat (information, unguarded)

- league-wide: set 1 2.61 -> 2.79, rise +0.18 / allowed +0.01 / SE 0.11 / z +1.50 (filed: above the allowance; 40133 aimed); set 2 2.76 -> 2.74, rise -0.02 / allowed +0.01 / SE 0.12 / z -0.19 (filed: within the allowance; 40375 aimed); Z +0.93 against 2.0, e* 0.16, mean excess +0.08: PASS; paired SE 0.08 (set 1, 496 games, z +2.04), 0.08 (set 2, 496 games, z -0.27); paired Z +1.25 (reported, never graded)
- PROGRESSION: set 1 0.37 -> 0.35, rise -0.02 / allowed +0.01 / SE 0.06 / z -0.37 (filed: within the allowance; 20736 aimed); set 2 0.38 -> 0.33, rise -0.05 / allowed -0.00 / SE 0.06 / z -0.81 (filed: within the allowance; 20782 aimed); Z -0.83 against 3.0, e* 0.12, mean excess -0.03: PASS; paired SE 0.04 (set 1, 496 games, z -0.52), 0.04 (set 2, 496 games, z -1.19); paired Z -1.21 (reported, never graded)
- RANK_PUSHED: set 1 11.69 -> 12.25, rise +0.56 / allowed +0.01 / SE 0.56 / z +0.98 (filed: above the allowance; 6826 aimed); set 2 11.89 -> 11.93, rise +0.04 / allowed +0.02 / SE 0.56 / z +0.04 (filed: above the allowance; 6840 aimed); Z +0.72 against 3.0, e* 1.19, mean excess +0.29: PASS; paired SE 0.40 (set 1, 496 games, z +1.36), 0.40 (set 2, 496 games, z +0.06); paired Z +1.01 (reported, never graded)
- CHECKDOWN: set 1 0.13 -> 0.13, rise +0.00 / allowed +0.01 / SE 0.05 / z -0.17 (filed: within the allowance; 8982 aimed); set 2 0.22 -> 0.21, rise -0.01 / allowed +0.00 / SE 0.07 / z -0.21 (filed: within the allowance; 9084 aimed); Z -0.27 against 3.0, e* 0.13, mean excess -0.01: PASS; paired SE 0.04 (set 1, 496 games, z -0.21), 0.06 (set 2, 496 games, z -0.24); paired Z -0.32 (reported, never graded)
- DESPERATION: set 1 4.95 -> 5.54, rise +0.59 / allowed +0.02 / SE 0.54 / z +1.06 (filed: above the allowance; 3357 aimed); set 2 5.80 -> 5.52, rise -0.28 / allowed +0.03 / SE 0.56 / z -0.57 (filed: within the allowance; 3443 aimed); Z +0.35 against 3.0, e* 1.17, mean excess +0.13: PASS; paired SE 0.37 (set 1, 496 games, z +1.54), 0.40 (set 2, 496 games, z -0.80); paired Z +0.53 (reported, never graded)
- ON_THE_RUN: set 1 7.22 -> 5.60, rise -1.62 / allowed +0.04 / SE 2.45 / z -0.68 (filed: within the allowance; 232 aimed); set 2 5.13 -> 6.19, rise +1.07 / allowed -0.04 / SE 2.25 / z +0.49 (filed: above the allowance; 226 aimed); Z -0.13 against 3.0, e* 4.98, mean excess -0.28: PASS; paired SE 2.24 (set 1, 496 games, z -0.74), 1.93 (set 2, 496 games, z +0.57); paired Z -0.12 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1235 aimed / 57 INT -> arm 1055 / 43; set 2 base 1313 aimed / 62 INT -> arm 1169 / 57; set 1 4.62 -> 4.08, rise -0.54 / allowed +0.16 / SE 0.85 / z -0.82 (filed: within the allowance; 1055 aimed); set 2 4.72 -> 4.88, rise +0.15 / allowed +0.19 / SE 0.86 / z -0.04 (filed: within the allowance; 1169 aimed); Z -0.61 against 3.0, e* 1.82, mean excess -0.37 (reported); paired SE 0.67 (set 1, 496 games, z -1.04), 0.65 (set 2, 496 games, z -0.06); paired Z -0.78 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2141 aimed / 110 INT -> arm 2302 / 143; set 2 base 2100 aimed / 136 INT -> arm 2274 / 133; set 1 5.14 -> 6.21, rise +1.07 / allowed +0.00 / SE 0.69 / z +1.54 (filed: above the allowance; 2302 aimed); set 2 6.48 -> 5.85, rise -0.63 / allowed -0.01 / SE 0.73 / z -0.85 (filed: within the allowance; 2274 aimed); Z +0.49 against 3.0, e* 1.51, mean excess +0.22 (reported); paired SE 0.48 (set 1, 496 games, z +2.25), 0.52 (set 2, 496 games, z -1.19); paired Z +0.75 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.58% / clean 63.42% -> arm dirty 31.43% / clean 68.57%; the class's rise +0.59, re-weighted to the base's composition +0.48 (reported)
- DESPERATION composition, set 2: base dirty 38.47% / clean 61.53% -> arm dirty 33.95% / clean 66.05%; the class's rise -0.28, re-weighted to the base's composition -0.33 (reported)
- checkdown looks by trigger: base set 1 26493 looks (threat part 6457, status part 6755, count part 22884; rule part 6755 under STEP_1: rule only 3609, count only 19738, both 3146, neither 0); set 2 26728 looks (threat part 6455, status part 6719, count part 23076; rule part 6719 under STEP_1: rule only 3652, count only 20009, both 3067, neither 0); arm set 1 26141 looks (threat part 4778, status part 5093, count part 23670; rule part 5093 under STEP_1: rule only 2471, count only 21048, both 2622, neither 0); set 2 26394 looks (threat part 4816, status part 5100, count part 23874; rule part 5100 under STEP_1: rule only 2520, count only 21294, both 2580, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.71% / count 71.71% / status 0.58% / none 0.00% -> arm threat 19.26% / count 80.20% / status 0.53% / none 0.00%; the class's rise +0.00, re-weighted to the base's composition +0.03 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 26.67% / count 72.82% / status 0.51% / none 0.00% -> arm threat 19.53% / count 79.94% / status 0.53% / none 0.00%; the class's rise -0.01, re-weighted to the base's composition -0.00 (reported)

### C14 against B5, gen (information, unguarded)

- league-wide: set 1 7.63 -> 7.48, rise -0.15 / allowed +0.02 / SE 0.24 / z -0.73 (filed: within the allowance; 25034 aimed); set 2 7.53 -> 7.62, rise +0.09 / allowed +0.02 / SE 0.24 / z +0.28 (filed: above the allowance; 25355 aimed); Z -0.32 against 2.0, e* 0.33, mean excess -0.05: PASS; paired SE 0.15 (set 1, 272 games, z -1.14), 0.17 (set 2, 272 games, z +0.38); paired Z -0.54 (reported, never graded)
- PROGRESSION: set 1 2.39 -> 2.44, rise +0.05 / allowed +0.01 / SE 0.18 / z +0.23 (filed: above the allowance; 14203 aimed); set 2 2.61 -> 2.69, rise +0.07 / allowed +0.00 / SE 0.19 / z +0.38 (filed: above the allowance; 14971 aimed); Z +0.43 against 3.0, e* 0.39, mean excess +0.06: PASS; paired SE 0.13 (set 1, 272 games, z +0.33), 0.13 (set 2, 272 games, z +0.55); paired Z +0.62 (reported, never graded)
- RANK_PUSHED: set 1 21.39 -> 20.71, rise -0.69 / allowed +0.01 / SE 0.90 / z -0.77 (filed: within the allowance; 4168 aimed); set 2 20.78 -> 21.02, rise +0.24 / allowed +0.03 / SE 0.90 / z +0.23 (filed: above the allowance; 4100 aimed); Z -0.38 against 3.0, e* 1.91, mean excess -0.24: PASS; paired SE 0.57 (set 1, 272 games, z -1.22), 0.61 (set 2, 272 games, z +0.35); paired Z -0.62 (reported, never graded)
- CHECKDOWN: set 1 3.26 -> 3.14, rise -0.12 / allowed +0.06 / SE 0.42 / z -0.43 (filed: within the allowance; 3499 aimed); set 2 3.90 -> 3.83, rise -0.08 / allowed +0.09 / SE 0.48 / z -0.35 (filed: within the allowance; 3111 aimed); Z -0.55 against 3.0, e* 0.94, mean excess -0.17: PASS; paired SE 0.28 (set 1, 272 games, z -0.64), 0.39 (set 2, 272 games, z -0.42); paired Z -0.75 (reported, never graded)
- DESPERATION: set 1 18.20 -> 17.52, rise -0.67 / allowed +0.04 / SE 0.99 / z -0.72 (filed: within the allowance; 3053 aimed); set 2 17.27 -> 17.57, rise +0.30 / allowed +0.09 / SE 0.96 / z +0.21 (filed: above the allowance; 3090 aimed); Z -0.36 against 3.0, e* 2.07, mean excess -0.25: PASS; paired SE 0.63 (set 1, 272 games, z -1.12), 0.76 (set 2, 272 games, z +0.27); paired Z -0.60 (reported, never graded)
- ON_THE_RUN: set 1 16.92 -> 16.22, rise -0.71 / allowed +0.09 / SE 5.82 / z -0.14 (filed: within the allowance; 111 aimed); set 2 9.30 -> 7.23, rise -2.07 / allowed +0.32 / SE 4.23 / z -0.57 (filed: within the allowance; 83 aimed); Z -0.50 against 3.0, e* 10.39, mean excess -1.60: PASS; paired SE 4.98 (set 1, 272 games, z -0.16), 4.02 (set 2, 272 games, z -0.60); paired Z -0.54 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1509 aimed / 227 INT -> arm 1416 / 216; set 2 base 1653 aimed / 263 INT -> arm 1593 / 240; set 1 15.04 -> 15.25, rise +0.21 / allowed +0.13 / SE 1.33 / z +0.06 (filed: above the allowance; 1416 aimed); set 2 15.91 -> 15.07, rise -0.84 / allowed +0.21 / SE 1.27 / z -0.83 (filed: within the allowance; 1593 aimed); Z -0.55 against 3.0, e* 2.75, mean excess -0.49 (reported); paired SE 0.94 (set 1, 272 games, z +0.08), 0.98 (set 2, 272 games, z -1.08); paired Z -0.70 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1486 aimed / 318 INT -> arm 1637 / 319; set 2 base 1444 aimed / 272 INT -> arm 1497 / 303; set 1 21.40 -> 19.49, rise -1.91 / allowed -0.00 / SE 1.45 / z -1.32 (filed: within the allowance; 1637 aimed); set 2 18.84 -> 20.24, rise +1.40 / allowed -0.02 / SE 1.46 / z +0.97 (filed: above the allowance; 1497 aimed); Z -0.25 against 3.0, e* 3.08, mean excess -0.24 (reported); paired SE 1.01 (set 1, 272 games, z -1.89), 1.09 (set 2, 272 games, z +1.31); paired Z -0.41 (reported, never graded)
- DESPERATION composition, set 1: base dirty 50.38% / clean 49.62% -> arm dirty 46.38% / clean 53.62%; the class's rise -0.67, re-weighted to the base's composition -0.84 (reported)
- DESPERATION composition, set 2: base dirty 53.37% / clean 46.63% -> arm dirty 51.55% / clean 48.45%; the class's rise +0.30, re-weighted to the base's composition +0.20 (reported)
- checkdown looks by trigger: base set 1 9185 looks (threat part 4093, status part 4368, count part 5767; rule part 4368 under STEP_1: rule only 3418, count only 4817, both 950, neither 0); set 2 8239 looks (threat part 4248, status part 4561, count part 4445; rule part 4561 under STEP_1: rule only 3794, count only 3678, both 767, neither 0); arm set 1 8736 looks (threat part 3292, status part 3577, count part 6077; rule part 3577 under STEP_1: rule only 2659, count only 5159, both 918, neither 0); set 2 7833 looks (threat part 3490, status part 3828, count part 4833; rule part 3828 under STEP_1: rule only 3000, count only 4005, both 828, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 51.28% / count 47.01% / status 1.71% / none 0.00% -> arm threat 43.38% / count 55.04% / status 1.57% / none 0.00%; the class's rise -0.12, re-weighted to the base's composition +0.04 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 58.99% / count 38.39% / status 2.62% / none 0.00% -> arm threat 50.50% / count 46.93% / status 2.57% / none 0.00%; the class's rise -0.08, re-weighted to the base's composition +0.03 (reported)

### C15 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.94, rise +0.11 / allowed +0.03 / SE 0.12 / z +0.72 (filed: above the allowance; 40907 aimed); set 2 2.75 -> 2.91, rise +0.16 / allowed +0.03 / SE 0.12 / z +1.15 (filed: above the allowance; 41087 aimed); Z +1.32 against 2.0, e* 0.17, mean excess +0.11: PASS; paired SE 0.08 (set 1, 496 games, z +1.00), 0.09 (set 2, 496 games, z +1.48); paired Z +1.76 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.39, rise +0.05 / allowed +0.02 / SE 0.06 / z +0.51 (filed: above the allowance; 21372 aimed); set 2 0.39 -> 0.31, rise -0.08 / allowed +0.02 / SE 0.06 / z -1.71 (filed: within the allowance; 21498 aimed); Z -0.85 against 3.0, e* 0.12, mean excess -0.03: PASS; paired SE 0.04 (set 1, 496 games, z +0.70), 0.04 (set 2, 496 games, z -2.42); paired Z -1.22 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.54, rise -0.16 / allowed +0.02 / SE 0.57 / z -0.31 (filed: within the allowance; 7146 aimed); set 2 11.57 -> 12.49, rise +0.92 / allowed +0.04 / SE 0.55 / z +1.58 (filed: above the allowance; 7083 aimed); Z +0.90 against 3.0, e* 1.19, mean excess +0.35: PASS; paired SE 0.41 (set 1, 496 games, z -0.43), 0.42 (set 2, 496 games, z +2.11); paired Z +1.19 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.22, rise +0.01 / allowed +0.04 / SE 0.07 / z -0.47 (filed: within the allowance; 8737 aimed); set 2 0.16 -> 0.20, rise +0.04 / allowed +0.03 / SE 0.06 / z +0.08 (filed: above the allowance; 8868 aimed); Z -0.28 against 3.0, e* 0.14, mean excess -0.01: PASS; paired SE 0.05 (set 1, 496 games, z -0.62), 0.05 (set 2, 496 games, z +0.09); paired Z -0.37 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.70, rise +0.34 / allowed +0.07 / SE 0.55 / z +0.49 (filed: above the allowance; 3528 aimed); set 2 6.32 -> 6.16, rise -0.17 / allowed +0.07 / SE 0.58 / z -0.41 (filed: within the allowance; 3524 aimed); Z +0.06 against 3.0, e* 1.20, mean excess +0.02: PASS; paired SE 0.41 (set 1, 496 games, z +0.65), 0.44 (set 2, 496 games, z -0.54); paired Z +0.08 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 2.42, rise -3.02 / allowed +0.14 / SE 2.32 / z -1.36 (filed: within the allowance; 124 aimed); set 2 9.16 -> 8.77, rise -0.39 / allowed -0.04 / SE 3.66 / z -0.09 (filed: within the allowance; 114 aimed); Z -1.03 against 3.0, e* 6.03, mean excess -1.76: PASS; paired SE 2.07 (set 1, 496 games, z -1.53), 3.31 (set 2, 496 games, z -0.10); paired Z -1.15 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 520 / 30; set 2 base 981 aimed / 41 INT -> arm 537 / 26; set 1 4.22 -> 5.77, rise +1.55 / allowed +0.45 / SE 1.20 / z +0.91 (filed: above the allowance; 520 aimed); set 2 4.18 -> 4.84, rise +0.66 / allowed +0.41 / SE 1.13 / z +0.22 (filed: above the allowance; 537 aimed); Z +0.80 against 3.0, e* 2.47, mean excess +0.67 (reported); paired SE 0.96 (set 1, 496 games, z +1.14), 0.94 (set 2, 496 games, z +0.27); paired Z +0.99 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 3008 / 171; set 2 base 2450 aimed / 176 INT -> arm 2987 / 191; set 1 5.82 -> 5.68, rise -0.13 / allowed +0.02 / SE 0.63 / z -0.24 (filed: within the allowance; 3008 aimed); set 2 7.18 -> 6.39, rise -0.79 / allowed +0.01 / SE 0.69 / z -1.16 (filed: within the allowance; 2987 aimed); Z -0.99 against 3.0, e* 1.40, mean excess -0.47 (reported); paired SE 0.48 (set 1, 496 games, z -0.32), 0.52 (set 2, 496 games, z -1.52); paired Z -1.30 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 14.74% / clean 85.26%; the class's rise +0.34, re-weighted to the base's composition +0.35 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 15.24% / clean 84.76%; the class's rise -0.17, re-weighted to the base's composition -0.37 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 25675 looks (threat part 3124, status part 3131, count part 24230; rule part 3124 under PER_RUSHER: rule only 1445, count only 22551, both 1679, neither 0); set 2 25638 looks (threat part 3135, status part 3145, count part 24151; rule part 3135 under PER_RUSHER: rule only 1487, count only 22503, both 1648, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 13.56% / count 86.44% / status 0.00% / none 0.00%; the class's rise +0.01, re-weighted to the base's composition +0.10 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 13.22% / count 86.78% / status 0.00% / none 0.00%; the class's rise +0.04, re-weighted to the base's composition +0.05 (reported)

### C15 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.58, rise +0.28 / allowed +0.05 / SE 0.24 / z +0.95 (filed: above the allowance; 25071 aimed); set 2 7.69 -> 7.68, rise -0.02 / allowed +0.06 / SE 0.24 / z -0.33 (filed: within the allowance; 25325 aimed); Z +0.43 against 2.0, e* 0.33, mean excess +0.07: PASS; paired SE 0.17 (set 1, 272 games, z +1.28), 0.18 (set 2, 272 games, z -0.45); paired Z +0.59 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.51, rise -0.20 / allowed +0.03 / SE 0.19 / z -1.23 (filed: within the allowance; 14713 aimed); set 2 2.79 -> 2.76, rise -0.03 / allowed +0.02 / SE 0.19 / z -0.26 (filed: within the allowance; 15332 aimed); Z -1.06 against 3.0, e* 0.40, mean excess -0.14: PASS; paired SE 0.14 (set 1, 272 games, z -1.64), 0.13 (set 2, 272 games, z -0.37); paired Z -1.42 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.54, rise +0.80 / allowed +0.02 / SE 0.87 / z +0.89 (filed: above the allowance; 4376 aimed); set 2 20.68 -> 20.57, rise -0.11 / allowed +0.08 / SE 0.89 / z -0.22 (filed: within the allowance; 4327 aimed); Z +0.47 against 3.0, e* 1.87, mean excess +0.29: PASS; paired SE 0.66 (set 1, 272 games, z +1.18), 0.70 (set 2, 272 games, z -0.28); paired Z +0.64 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 3.09, rise -0.12 / allowed +0.16 / SE 0.43 / z -0.65 (filed: within the allowance; 3044 aimed); set 2 3.75 -> 3.58, rise -0.17 / allowed +0.18 / SE 0.49 / z -0.72 (filed: within the allowance; 2655 aimed); Z -0.97 against 3.0, e* 0.97, mean excess -0.32: PASS; paired SE 0.35 (set 1, 272 games, z -0.80), 0.40 (set 2, 272 games, z -0.89); paired Z -1.19 (reported, never graded)
- DESPERATION: set 1 16.61 -> 18.27, rise +1.66 / allowed +0.13 / SE 1.00 / z +1.53 (filed: above the allowance; 2873 aimed); set 2 18.18 -> 17.72, rise -0.46 / allowed +0.17 / SE 0.99 / z -0.63 (filed: within the allowance; 2968 aimed); Z +0.64 against 3.0, e* 2.11, mean excess +0.45: PASS; paired SE 0.72 (set 1, 272 games, z +2.14), 0.68 (set 2, 272 games, z -0.92); paired Z +0.86 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 20.00, rise +0.00 / allowed +0.12 / SE 6.89 / z -0.02 (filed: within the allowance; 65 aimed); set 2 8.45 -> 23.26, rise +14.81 / allowed +0.32 / SE 7.24 / z +2.00 (filed: above the allowance; 43 aimed); Z +1.40 against 3.0, e* 14.98, mean excess +7.18: PASS; paired SE 6.19 (set 1, 272 games, z -0.02), 5.51 (set 2, 272 games, z +2.63); paired Z +1.84 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 653 / 103; set 2 base 1216 aimed / 203 INT -> arm 818 / 135; set 1 14.26 -> 15.77, rise +1.51 / allowed +0.42 / SE 1.79 / z +0.61 (filed: above the allowance; 653 aimed); set 2 16.69 -> 16.50, rise -0.19 / allowed +0.48 / SE 1.68 / z -0.40 (filed: within the allowance; 818 aimed); Z +0.15 against 3.0, e* 3.68, mean excess +0.21 (reported); paired SE 1.54 (set 1, 272 games, z +0.71), 1.33 (set 2, 272 games, z -0.50); paired Z +0.15 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 2220 / 422; set 2 base 1815 aimed / 348 INT -> arm 2150 / 391; set 1 17.97 -> 19.01, rise +1.04 / allowed +0.01 / SE 1.22 / z +0.84 (filed: above the allowance; 2220 aimed); set 2 19.17 -> 18.19, rise -0.99 / allowed +0.02 / SE 1.24 / z -0.81 (filed: within the allowance; 2150 aimed); Z +0.02 against 3.0, e* 2.62, mean excess +0.01 (reported); paired SE 0.91 (set 1, 272 games, z +1.12), 0.85 (set 2, 272 games, z -1.18); paired Z -0.04 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 22.73% / clean 77.27%; the class's rise +1.66, re-weighted to the base's composition +1.21 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 27.56% / clean 72.44%; the class's rise -0.46, re-weighted to the base's composition -0.67 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 7872 looks (threat part 2091, status part 2096, count part 6317; rule part 2091 under PER_RUSHER: rule only 1555, count only 5781, both 536, neither 0); set 2 6753 looks (threat part 2352, status part 2355, count part 4887; rule part 2352 under PER_RUSHER: rule only 1866, count only 4401, both 486, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 31.11% / count 68.89% / status 0.00% / none 0.00%; the class's rise -0.12, re-weighted to the base's composition -0.19 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 41.24% / count 58.76% / status 0.00% / none 0.00%; the class's rise -0.17, re-weighted to the base's composition -0.01 (reported)

### C16 against B3, flat (information, unguarded)

- league-wide: set 1 2.83 -> 2.81, rise -0.02 / allowed -0.00 / SE 0.12 / z -0.11 (filed: within the allowance; 39153 aimed); set 2 2.75 -> 2.75, rise +0.00 / allowed -0.00 / SE 0.12 / z +0.04 (filed: above the allowance; 39322 aimed); Z -0.04 against 2.0, e* 0.17, mean excess -0.00: PASS; paired SE 0.05 (set 1, 496 games, z -0.24), 0.06 (set 2, 496 games, z +0.09); paired Z -0.10 (reported, never graded)
- PROGRESSION: set 1 0.35 -> 0.36, rise +0.01 / allowed -0.00 / SE 0.06 / z +0.32 (filed: above the allowance; 20230 aimed); set 2 0.39 -> 0.34, rise -0.05 / allowed -0.00 / SE 0.06 / z -0.83 (filed: within the allowance; 20232 aimed); Z -0.36 against 3.0, e* 0.13, mean excess -0.02: PASS; paired SE 0.02 (set 1, 496 games, z +0.80), 0.03 (set 2, 496 games, z -1.81); paired Z -0.71 (reported, never graded)
- RANK_PUSHED: set 1 12.70 -> 12.65, rise -0.05 / allowed -0.00 / SE 0.58 / z -0.07 (filed: within the allowance; 6466 aimed); set 2 11.57 -> 11.49, rise -0.08 / allowed +0.00 / SE 0.55 / z -0.14 (filed: within the allowance; 6603 aimed); Z -0.15 against 3.0, e* 1.20, mean excess -0.06: PASS; paired SE 0.25 (set 1, 496 games, z -0.17), 0.27 (set 2, 496 games, z -0.29); paired Z -0.32 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.20, rise -0.01 / allowed -0.00 / SE 0.07 / z -0.07 (filed: within the allowance; 8931 aimed); set 2 0.16 -> 0.17, rise +0.00 / allowed -0.01 / SE 0.06 / z +0.23 (filed: above the allowance; 8930 aimed); Z +0.11 against 3.0, e* 0.14, mean excess +0.00: PASS; paired SE 0.02 (set 1, 496 games, z -0.25), 0.03 (set 2, 496 games, z +0.51); paired Z +0.18 (reported, never graded)
- DESPERATION: set 1 5.36 -> 5.42, rise +0.07 / allowed -0.00 / SE 0.55 / z +0.13 (filed: above the allowance; 3338 aimed); set 2 6.32 -> 6.57, rise +0.25 / allowed -0.01 / SE 0.59 / z +0.43 (filed: above the allowance; 3393 aimed); Z +0.39 against 3.0, e* 1.21, mean excess +0.16: PASS; paired SE 0.27 (set 1, 496 games, z +0.26), 0.25 (set 2, 496 games, z +1.03); paired Z +0.91 (reported, never graded)
- ON_THE_RUN: set 1 5.44 -> 5.85, rise +0.41 / allowed -0.04 / SE 2.54 / z +0.18 (filed: above the allowance; 188 aimed); set 2 9.16 -> 9.76, rise +0.60 / allowed -0.03 / SE 3.42 / z +0.18 (filed: above the allowance; 164 aimed); Z +0.26 against 3.0, e* 6.18, mean excess +0.54: PASS; paired SE 1.30 (set 1, 496 games, z +0.35), 1.83 (set 2, 496 games, z +0.34); paired Z +0.49 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 995 aimed / 42 INT -> arm 922 / 38; set 2 base 981 aimed / 41 INT -> arm 961 / 44; set 1 4.22 -> 4.12, rise -0.10 / allowed -0.03 / SE 0.91 / z -0.07 (filed: within the allowance; 922 aimed); set 2 4.18 -> 4.58, rise +0.40 / allowed -0.01 / SE 0.93 / z +0.44 (filed: above the allowance; 961 aimed); Z +0.26 against 3.0, e* 1.95, mean excess +0.17 (reported); paired SE 0.53 (set 1, 496 games, z -0.12), 0.44 (set 2, 496 games, z +0.91); paired Z +0.56 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2440 aimed / 142 INT -> arm 2416 / 143; set 2 base 2450 aimed / 176 INT -> arm 2432 / 179; set 1 5.82 -> 5.92, rise +0.10 / allowed +0.01 / SE 0.67 / z +0.13 (filed: above the allowance; 2416 aimed); set 2 7.18 -> 7.36, rise +0.18 / allowed -0.01 / SE 0.74 / z +0.25 (filed: above the allowance; 2432 aimed); Z +0.27 against 3.0, e* 1.50, mean excess +0.14 (reported); paired SE 0.31 (set 1, 496 games, z +0.29), 0.31 (set 2, 496 games, z +0.59); paired Z +0.62 (reported, never graded)
- DESPERATION composition, set 1: base dirty 28.97% / clean 71.03% -> arm dirty 27.62% / clean 72.38%; the class's rise +0.07, re-weighted to the base's composition +0.04 (reported)
- DESPERATION composition, set 2: base dirty 28.59% / clean 71.41% -> arm dirty 28.32% / clean 71.68%; the class's rise +0.25, re-weighted to the base's composition +0.24 (reported)
- checkdown looks by trigger: base set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0); arm set 1 25870 looks (threat part 6229, status part 6234, count part 22660; rule part 6229 under PER_RUSHER: rule only 3210, count only 19641, both 3019, neither 0); set 2 25948 looks (threat part 6245, status part 6248, count part 22676; rule part 6245 under PER_RUSHER: rule only 3272, count only 19703, both 2973, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 27.80% / count 72.20% / status 0.00% / none 0.00% -> arm threat 28.08% / count 71.92% / status 0.00% / none 0.00%; the class's rise -0.01, re-weighted to the base's composition -0.01 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 27.74% / count 72.26% / status 0.00% / none 0.00% -> arm threat 27.41% / count 72.59% / status 0.00% / none 0.00%; the class's rise +0.00, re-weighted to the base's composition +0.00 (reported)

### C16 against B3, gen (information, unguarded)

- league-wide: set 1 7.30 -> 7.50, rise +0.20 / allowed -0.01 / SE 0.24 / z +0.85 (filed: above the allowance; 24262 aimed); set 2 7.69 -> 7.68, rise -0.02 / allowed +0.00 / SE 0.24 / z -0.08 (filed: within the allowance; 24767 aimed); Z +0.54 against 2.0, e* 0.34, mean excess +0.09: PASS; paired SE 0.07 (set 1, 272 games, z +2.80), 0.09 (set 2, 272 games, z -0.21); paired Z +1.84 (reported, never graded)
- PROGRESSION: set 1 2.71 -> 2.91, rise +0.19 / allowed -0.01 / SE 0.20 / z +1.01 (filed: above the allowance; 13768 aimed); set 2 2.79 -> 2.74, rise -0.04 / allowed -0.00 / SE 0.19 / z -0.21 (filed: within the allowance; 14394 aimed); Z +0.56 against 3.0, e* 0.42, mean excess +0.08: PASS; paired SE 0.07 (set 1, 272 games, z +2.98), 0.07 (set 2, 272 games, z -0.60); paired Z +1.69 (reported, never graded)
- RANK_PUSHED: set 1 19.74 -> 20.32, rise +0.57 / allowed -0.01 / SE 0.89 / z +0.66 (filed: above the allowance; 3987 aimed); set 2 20.68 -> 20.94, rise +0.26 / allowed +0.01 / SE 0.91 / z +0.28 (filed: above the allowance; 4001 aimed); Z +0.66 against 3.0, e* 1.91, mean excess +0.42: PASS; paired SE 0.31 (set 1, 272 games, z +1.90), 0.35 (set 2, 272 games, z +0.71); paired Z +1.85 (reported, never graded)
- CHECKDOWN: set 1 3.21 -> 3.08, rise -0.13 / allowed -0.00 / SE 0.42 / z -0.31 (filed: within the allowance; 3506 aimed); set 2 3.75 -> 3.60, rise -0.15 / allowed -0.01 / SE 0.46 / z -0.31 (filed: within the allowance; 3307 aimed); Z -0.44 against 3.0, e* 0.93, mean excess -0.14: PASS; paired SE 0.12 (set 1, 272 games, z -1.03), 0.17 (set 2, 272 games, z -0.85); paired Z -1.33 (reported, never graded)
- DESPERATION: set 1 16.61 -> 16.60, rise -0.02 / allowed -0.01 / SE 0.98 / z -0.01 (filed: within the allowance; 2898 aimed); set 2 18.18 -> 18.20, rise +0.02 / allowed +0.00 / SE 1.00 / z +0.02 (filed: above the allowance; 2972 aimed); Z +0.01 against 3.0, e* 2.09, mean excess +0.01: PASS; paired SE 0.31 (set 1, 272 games, z -0.02), 0.39 (set 2, 272 games, z +0.05); paired Z +0.02 (reported, never graded)
- ON_THE_RUN: set 1 20.00 -> 19.42, rise -0.58 / allowed +0.06 / SE 6.17 / z -0.10 (filed: within the allowance; 103 aimed); set 2 8.45 -> 8.60, rise +0.15 / allowed +0.08 / SE 4.40 / z +0.02 (filed: above the allowance; 93 aimed); Z -0.06 against 3.0, e* 10.89, mean excess -0.29: PASS; paired SE 3.26 (set 1, 272 games, z -0.20), 1.80 (set 2, 272 games, z +0.04); paired Z -0.11 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1052 aimed / 150 INT -> arm 1035 / 147; set 2 base 1216 aimed / 203 INT -> arm 1225 / 207; set 1 14.26 -> 14.20, rise -0.06 / allowed -0.03 / SE 1.53 / z -0.02 (filed: within the allowance; 1035 aimed); set 2 16.69 -> 16.90, rise +0.20 / allowed -0.03 / SE 1.51 / z +0.15 (filed: above the allowance; 1225 aimed); Z +0.10 against 3.0, e* 3.23, mean excess +0.10 (reported); paired SE 0.53 (set 1, 272 games, z -0.06), 0.58 (set 2, 272 games, z +0.41); paired Z +0.25 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1831 aimed / 329 INT -> arm 1863 / 334; set 2 base 1815 aimed / 348 INT -> arm 1747 / 334; set 1 17.97 -> 17.93, rise -0.04 / allowed -0.00 / SE 1.26 / z -0.03 (filed: within the allowance; 1863 aimed); set 2 19.17 -> 19.12, rise -0.06 / allowed +0.03 / SE 1.32 / z -0.07 (filed: within the allowance; 1747 aimed); Z -0.07 against 3.0, e* 2.74, mean excess -0.06 (reported); paired SE 0.42 (set 1, 272 games, z -0.09), 0.49 (set 2, 272 games, z -0.17); paired Z -0.19 (reported, never graded)
- DESPERATION composition, set 1: base dirty 36.49% / clean 63.51% -> arm dirty 35.71% / clean 64.29%; the class's rise -0.02, re-weighted to the base's composition -0.05 (reported)
- DESPERATION composition, set 2: base dirty 40.12% / clean 59.88% -> arm dirty 41.22% / clean 58.78%; the class's rise +0.02, re-weighted to the base's composition +0.05 (reported)
- checkdown looks by trigger: base set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0); arm set 1 8688 looks (threat part 3700, status part 3702, count part 5773; rule part 3700 under PER_RUSHER: rule only 2915, count only 4988, both 785, neither 0); set 2 7941 looks (threat part 4099, status part 4100, count part 4479; rule part 4099 under PER_RUSHER: rule only 3462, count only 3842, both 637, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 49.20% / count 50.80% / status 0.00% / none 0.00% -> arm threat 48.80% / count 51.20% / status 0.00% / none 0.00%; the class's rise -0.13, re-weighted to the base's composition -0.13 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 59.29% / count 40.71% / status 0.00% / none 0.00% -> arm threat 59.54% / count 40.46% / status 0.00% / none 0.00%; the class's rise -0.15, re-weighted to the base's composition -0.15 (reported)

## The declared composition print (plan §5.4; critique 4 S4-5; reported, never graded)

Every guard class's aimed throws and interceptions by the dropback's first must-act tick and the forcing source on the release tick (THREAT, COUNT, STATUS or NONE), PROGRESSION and RANK_PUSHED first, on C1 against B3 and C2 against B6. Declared before the arms run.

- C1 against B3, flat, PROGRESSION (aimed/INT, first must-act tick|source): 0.5|THREAT 1/0 -> 0/0; 1.0|THREAT 1583/10 -> 143/0; 1.0|COUNT 45/0 -> 0/0; 1.5|THREAT 950/5 -> 1210/5; 1.5|COUNT 169/0 -> 54/0; 1.5|NONE 106/1 -> 26/0; 2.0|THREAT 1145/6 -> 705/4; 2.0|COUNT 74/0 -> 31/0; 2.5|THREAT 5/0 -> 8/0; 2.5|COUNT 18/0 -> 14/0; 3.0|THREAT 184/0 -> 270/2; none|COUNT 16040/54 -> 16839/53; none|NONE 20684/76 -> 21940/78
- C1 against B3, flat, RANK_PUSHED (aimed/INT, first must-act tick|source): 1.0|THREAT 660/76 -> 70/4; 1.0|COUNT 55/9 -> 1/0; 1.5|THREAT 558/54 -> 825/76; 1.5|COUNT 136/20 -> 45/3; 1.5|NONE 58/5 -> 30/4; 2.0|THREAT 480/49 -> 341/45; 2.0|COUNT 50/5 -> 14/2; 2.5|THREAT 72/4 -> 88/9; 2.5|COUNT 20/2 -> 16/1; 3.0|THREAT 146/17 -> 214/20; 3.0|COUNT 1/0 -> 0/0; none|COUNT 10576/1306 -> 11461/1403; none|NONE 475/65 -> 548/84
- C1 against B3, flat, CHECKDOWN (aimed/INT, first must-act tick|source): 0.5|THREAT 1/0 -> 0/0; 1.0|THREAT 2391/3 -> 265/0; 1.0|COUNT 15/0 -> 1/0; 1.5|THREAT 1762/4 -> 2458/7; 1.5|COUNT 83/0 -> 35/0; 2.0|THREAT 553/2 -> 363/2; 2.0|COUNT 19/0 -> 3/0; 2.5|THREAT 241/3 -> 318/1; 2.5|COUNT 1/0 -> 0/0; 3.0|THREAT 87/1 -> 125/0; none|COUNT 12979/21 -> 14349/27
- C1 against B3, flat, CLEAN_EXPIRY (aimed/INT, first must-act tick|source): none
- C1 against B3, flat, DESPERATION (aimed/INT, first must-act tick|source): 1.0|THREAT 521/18 -> 46/0; 1.0|COUNT 22/1 -> 0/0; 1.5|THREAT 434/17 -> 591/17; 1.5|COUNT 60/4 -> 15/1; 2.0|THREAT 321/13 -> 224/11; 2.0|COUNT 32/2 -> 14/1; 2.5|THREAT 104/4 -> 136/6; 2.5|COUNT 9/0 -> 13/0; 3.0|THREAT 96/8 -> 163/8; none|COUNT 5267/334 -> 5537/313
- C1 against B3, flat, ON_THE_RUN (aimed/INT, first must-act tick|source): 1.0|NONE 38/5 -> 7/0; 1.5|NONE 175/11 -> 303/16; 2.0|NONE 26/3 -> 46/4; 2.5|NONE 25/0 -> 41/2; 3.0|NONE 14/1 -> 15/0
- C1 against B3, gen, PROGRESSION (aimed/INT, first must-act tick|source): 1.0|THREAT 904/20 -> 105/1; 1.0|COUNT 2/0 -> 0/0; 1.0|NONE 3/0 -> 0/0; 1.5|THREAT 719/19 -> 869/18; 1.5|COUNT 44/4 -> 17/2; 1.5|NONE 70/1 -> 28/0; 2.0|THREAT 892/19 -> 631/16; 2.0|COUNT 21/0 -> 7/0; 2.0|NONE 5/1 -> 3/0; 2.5|THREAT 74/0 -> 85/3; 2.5|COUNT 6/0 -> 1/0; 2.5|NONE 8/0 -> 5/0; 3.0|THREAT 122/6 -> 189/8; 3.5|THREAT 1/0 -> 1/0; 3.5|COUNT 3/1 -> 0/0; 4.0|THREAT 44/4 -> 34/1; 4.5|THREAT 0/0 -> 1/0; 5.0|THREAT 4/1 -> 4/1; none|COUNT 6260/200 -> 6762/193; none|STATUS 2/0 -> 3/0; none|NONE 19182/504 -> 20285/515
- C1 against B3, gen, RANK_PUSHED (aimed/INT, first must-act tick|source): 1.0|THREAT 399/75 -> 48/11; 1.0|COUNT 17/4 -> 0/0; 1.0|NONE 6/1 -> 0/0; 1.5|THREAT 491/85 -> 694/136; 1.5|COUNT 24/6 -> 14/4; 1.5|NONE 49/13 -> 22/8; 2.0|THREAT 369/62 -> 270/47; 2.0|COUNT 18/2 -> 4/1; 2.5|THREAT 75/13 -> 112/16; 2.5|COUNT 2/0 -> 5/1; 2.5|NONE 4/2 -> 3/1; 3.0|THREAT 89/13 -> 127/18; 3.5|THREAT 37/4 -> 36/4; 3.5|COUNT 3/3 -> 4/2; 4.0|THREAT 28/3 -> 39/8; 4.5|THREAT 4/0 -> 4/0; 5.0|THREAT 1/0 -> 0/0; none|COUNT 4693/965 -> 4967/1074; none|STATUS 0/0 -> 2/1; none|NONE 1775/383 -> 1945/422
- C1 against B3, gen, CHECKDOWN (aimed/INT, first must-act tick|source): 1.0|THREAT 1529/43 -> 237/7; 1.0|COUNT 7/0 -> 0/0; 1.5|THREAT 1301/66 -> 1932/77; 1.5|COUNT 10/0 -> 10/1; 2.0|THREAT 551/21 -> 381/13; 2.0|COUNT 8/1 -> 4/1; 2.5|THREAT 195/7 -> 269/12; 3.0|THREAT 75/2 -> 94/2; 3.5|THREAT 40/1 -> 67/2; 4.0|THREAT 10/0 -> 6/0; 4.5|THREAT 4/0 -> 3/0; 5.0|THREAT 3/0 -> 1/0; none|COUNT 3125/97 -> 3409/101
- C1 against B3, gen, CLEAN_EXPIRY (aimed/INT, first must-act tick|source): none
- C1 against B3, gen, DESPERATION (aimed/INT, first must-act tick|source): 1.0|THREAT 551/100 -> 68/11; 1.0|COUNT 6/0 -> 0/0; 1.5|THREAT 637/86 -> 805/117; 1.5|COUNT 21/4 -> 5/0; 2.0|THREAT 386/56 -> 329/45; 2.0|COUNT 18/5 -> 8/2; 2.5|THREAT 150/21 -> 208/33; 2.5|COUNT 4/1 -> 2/1; 3.0|THREAT 114/13 -> 183/24; 3.5|THREAT 107/26 -> 140/30; 3.5|COUNT 2/0 -> 3/0; 4.0|THREAT 70/14 -> 66/13; 4.5|THREAT 26/2 -> 20/2; 5.0|THREAT 2/1 -> 3/1; none|COUNT 3820/701 -> 4077/749
- C1 against B3, gen, ON_THE_RUN (aimed/INT, first must-act tick|source): 1.0|NONE 52/9 -> 15/7; 1.5|NONE 74/9 -> 142/15; 2.0|NONE 6/0 -> 23/3; 2.5|NONE 6/1 -> 8/2; 3.0|NONE 2/0 -> 3/0; 3.5|NONE 1/1 -> 3/1
- C2 against B6, flat, PROGRESSION (aimed/INT, first must-act tick|source): 0.5|THREAT 1/0 -> 0/0; 1.0|THREAT 788/2 -> 70/0; 1.0|COUNT 4/0 -> 0/0; 1.0|NONE 174/0 -> 0/0; 1.5|THREAT 1986/5 -> 2845/3; 1.5|COUNT 18/0 -> 6/0; 1.5|STATUS 0/0 -> 1/0; 1.5|NONE 454/1 -> 230/2; 2.0|THREAT 1307/4 -> 813/0; 2.0|COUNT 35/0 -> 13/0; 2.0|NONE 77/1 -> 17/0; 2.5|THREAT 454/1 -> 591/3; 2.5|COUNT 12/0 -> 9/0; 2.5|NONE 64/0 -> 82/0; 3.0|THREAT 947/4 -> 1339/1; 3.0|COUNT 16/0 -> 29/0; 3.5|THREAT 214/1 -> 321/2; 3.5|COUNT 5/0 -> 17/0; 3.5|STATUS 0/0 -> 2/0; 3.5|NONE 6/0 -> 15/0; 4.0|THREAT 225/1 -> 225/1; 4.5|THREAT 3/0 -> 3/0; 4.5|COUNT 8/0 -> 9/0; 5.0|THREAT 100/0 -> 90/0; none|COUNT 7287/16 -> 7810/14; none|STATUS 22/1 -> 35/2; none|NONE 26004/92 -> 27617/87
- C2 against B6, flat, RANK_PUSHED (aimed/INT, first must-act tick|source): 1.0|THREAT 84/8 -> 2/0; 1.0|COUNT 5/0 -> 0/0; 1.0|NONE 13/1 -> 0/0; 1.5|THREAT 349/37 -> 366/39; 1.5|COUNT 40/6 -> 5/0; 1.5|STATUS 1/0 -> 0/0; 1.5|NONE 104/14 -> 22/2; 2.0|THREAT 646/81 -> 299/34; 2.0|COUNT 35/6 -> 15/1; 2.0|NONE 85/15 -> 19/4; 2.5|THREAT 348/31 -> 442/44; 2.5|COUNT 14/5 -> 17/6; 2.5|NONE 38/4 -> 53/4; 3.0|THREAT 457/54 -> 672/69; 3.0|COUNT 20/3 -> 27/7; 3.5|THREAT 284/25 -> 327/35; 3.5|COUNT 9/1 -> 14/2; 3.5|STATUS 0/0 -> 1/0; 3.5|NONE 17/3 -> 27/5; 4.0|THREAT 156/24 -> 189/24; 4.5|THREAT 62/12 -> 67/10; 4.5|COUNT 6/3 -> 12/1; 5.0|THREAT 110/12 -> 106/14; none|COUNT 6950/793 -> 7324/850; none|STATUS 6/0 -> 21/3; none|NONE 2579/297 -> 2798/293
- C2 against B6, flat, CHECKDOWN (aimed/INT, first must-act tick|source): 1.0|THREAT 260/0 -> 7/0; 1.5|THREAT 1254/4 -> 1394/1; 1.5|COUNT 7/0 -> 2/0; 2.0|THREAT 2004/2 -> 1291/0; 2.0|COUNT 7/0 -> 3/0; 2.5|THREAT 951/5 -> 1289/4; 2.5|COUNT 4/0 -> 2/0; 3.0|THREAT 512/0 -> 748/1; 3.0|COUNT 4/0 -> 8/0; 3.5|THREAT 457/2 -> 516/3; 3.5|COUNT 0/0 -> 1/0; 4.0|THREAT 84/0 -> 119/0; 4.5|THREAT 95/1 -> 111/2; 5.0|THREAT 21/0 -> 28/1; 5.0|COUNT 1/0 -> 1/0; none|COUNT 2646/1 -> 2689/1
- C2 against B6, flat, CLEAN_EXPIRY (aimed/INT, first must-act tick|source): none
- C2 against B6, flat, DESPERATION (aimed/INT, first must-act tick|source): 1.0|THREAT 158/5 -> 15/0; 1.5|THREAT 475/15 -> 590/28; 1.5|COUNT 14/1 -> 4/0; 2.0|THREAT 442/17 -> 314/5; 2.0|COUNT 32/1 -> 13/0; 2.5|THREAT 200/12 -> 275/14; 2.5|COUNT 2/0 -> 3/0; 3.0|THREAT 209/10 -> 310/20; 3.0|COUNT 7/0 -> 14/1; 3.5|THREAT 190/11 -> 260/17; 3.5|COUNT 10/3 -> 18/6; 4.0|THREAT 169/13 -> 183/12; 4.5|THREAT 134/9 -> 125/10; 4.5|COUNT 10/0 -> 9/0; 5.0|THREAT 145/6 -> 165/15; none|COUNT 3379/243 -> 3502/259
- C2 against B6, flat, ON_THE_RUN (aimed/INT, first must-act tick|source): 1.0|NONE 9/0 -> 0/0; 1.5|NONE 115/13 -> 185/18; 2.0|NONE 25/2 -> 23/1; 2.5|NONE 27/3 -> 46/5; 3.0|NONE 26/3 -> 37/3; 3.5|NONE 48/1 -> 34/0; 4.0|NONE 12/0 -> 21/0; 4.5|NONE 19/1 -> 18/2; 5.0|NONE 7/2 -> 4/0
- C2 against B6, gen, PROGRESSION (aimed/INT, first must-act tick|source): 1.0|THREAT 784/4 -> 93/1; 1.0|NONE 110/2 -> 1/0; 1.5|THREAT 1324/14 -> 1916/32; 1.5|COUNT 19/0 -> 10/0; 1.5|NONE 254/2 -> 128/1; 2.0|THREAT 673/17 -> 399/15; 2.0|COUNT 9/1 -> 1/0; 2.0|NONE 54/2 -> 12/0; 2.5|THREAT 300/5 -> 385/7; 2.5|COUNT 3/0 -> 2/0; 2.5|NONE 33/1 -> 31/2; 3.0|THREAT 545/7 -> 812/15; 3.0|COUNT 1/0 -> 8/0; 3.0|NONE 5/0 -> 9/0; 3.5|THREAT 155/5 -> 194/6; 3.5|COUNT 1/0 -> 5/0; 3.5|STATUS 0/0 -> 1/0; 3.5|NONE 3/0 -> 5/2; 4.0|THREAT 168/4 -> 183/7; 4.0|COUNT 0/0 -> 1/0; 4.5|THREAT 12/0 -> 15/0; 4.5|NONE 3/0 -> 2/0; 5.0|THREAT 32/0 -> 42/0; 5.0|COUNT 1/0 -> 0/0; 5.5|THREAT 1/0 -> 0/0; 5.5|COUNT 0/0 -> 2/0; none|COUNT 3781/92 -> 4000/101; none|STATUS 19/0 -> 42/3; none|NONE 16447/412 -> 17760/448
- C2 against B6, gen, RANK_PUSHED (aimed/INT, first must-act tick|source): 1.0|THREAT 58/15 -> 0/0; 1.0|NONE 3/2 -> 0/0; 1.5|THREAT 214/40 -> 262/42; 1.5|COUNT 12/4 -> 6/1; 1.5|NONE 35/5 -> 16/3; 2.0|THREAT 340/66 -> 177/37; 2.0|COUNT 13/4 -> 2/0; 2.0|NONE 37/6 -> 13/1; 2.5|THREAT 174/37 -> 240/47; 2.5|COUNT 2/1 -> 7/1; 2.5|NONE 26/9 -> 29/7; 3.0|THREAT 202/48 -> 333/62; 3.0|COUNT 2/0 -> 3/1; 3.0|NONE 6/0 -> 9/1; 3.5|THREAT 152/13 -> 186/22; 3.5|COUNT 2/1 -> 3/0; 3.5|NONE 3/2 -> 19/3; 4.0|THREAT 150/27 -> 181/28; 4.0|COUNT 1/0 -> 2/1; 4.5|THREAT 37/4 -> 43/6; 4.5|COUNT 3/1 -> 3/1; 4.5|NONE 3/1 -> 2/0; 5.0|THREAT 60/5 -> 66/5; 5.0|COUNT 1/0 -> 1/0; 5.5|THREAT 12/0 -> 13/0; 5.5|COUNT 1/0 -> 1/0; none|COUNT 3113/702 -> 3364/753; none|STATUS 16/1 -> 30/4; none|NONE 2161/449 -> 2236/455
- C2 against B6, gen, CHECKDOWN (aimed/INT, first must-act tick|source): 1.0|THREAT 135/3 -> 4/0; 1.5|THREAT 960/38 -> 1217/30; 1.5|COUNT 1/0 -> 0/0; 2.0|THREAT 1332/61 -> 901/42; 2.0|COUNT 1/0 -> 0/0; 2.5|THREAT 647/29 -> 808/31; 3.0|THREAT 371/14 -> 512/20; 3.0|COUNT 2/1 -> 1/1; 3.5|THREAT 254/13 -> 343/12; 3.5|COUNT 1/0 -> 1/0; 4.0|THREAT 99/2 -> 102/4; 4.0|COUNT 1/0 -> 1/0; 4.5|THREAT 54/1 -> 72/0; 4.5|COUNT 3/0 -> 0/0; 5.0|THREAT 18/2 -> 22/3; 5.5|THREAT 6/1 -> 9/1; none|COUNT 808/24 -> 871/19
- C2 against B6, gen, CLEAN_EXPIRY (aimed/INT, first must-act tick|source): none
- C2 against B6, gen, DESPERATION (aimed/INT, first must-act tick|source): 1.0|THREAT 303/52 -> 43/8; 1.0|COUNT 1/1 -> 0/0; 1.5|THREAT 667/106 -> 776/117; 1.5|COUNT 4/0 -> 3/1; 2.0|THREAT 490/91 -> 344/58; 2.0|COUNT 13/0 -> 2/0; 2.5|THREAT 202/29 -> 294/47; 2.5|COUNT 1/0 -> 0/0; 3.0|THREAT 225/32 -> 347/37; 3.0|COUNT 2/0 -> 3/0; 3.5|THREAT 215/32 -> 258/32; 3.5|COUNT 0/0 -> 5/0; 4.0|THREAT 142/20 -> 180/30; 4.0|COUNT 2/0 -> 2/0; 4.5|THREAT 145/19 -> 165/21; 4.5|COUNT 2/1 -> 2/0; 5.0|THREAT 103/16 -> 101/12; 5.5|THREAT 83/7 -> 75/12; 5.5|COUNT 0/0 -> 4/0; none|COUNT 2604/497 -> 2775/551
- C2 against B6, gen, ON_THE_RUN (aimed/INT, first must-act tick|source): 1.0|NONE 3/0 -> 0/0; 1.5|NONE 125/23 -> 212/25; 2.0|NONE 9/0 -> 22/2; 2.5|NONE 9/1 -> 11/1; 3.0|NONE 4/0 -> 6/0; 3.5|NONE 7/0 -> 5/0; 4.0|NONE 2/0 -> 1/0; 4.5|NONE 5/0 -> 3/0; 5.0|NONE 2/1 -> 2/1

## The structural proofs and fold checks inside the arms

- s3.part1 (structural; part 1 (AM-2 `part1`, superseding s3.part1.m8): every man nobody touched has his published etaTick equal, to the tenth, to M8's free-run function on his own entry in the published picture; with it the touched men's check, the off-clock men and every picture placed, on every pocket-1.s3 arm, both leagues): PASSES. 289969 men checked over 30 arm-sets; failures none
- s3.monotone (structural; the monotone clauses (AM-2 `monotone`, superseding s3.part1.monotone): Acceleration +1, Speed and Acceleration +1 together never later, the deeper drop never sooner, at the tenth, on every untouched man of C1 and C2): PASSES. 58942 men read; failures none; Speed alone (reported): C1 set 1 flat 0 later at the tenth of 9666 (largest 0.000317 s); C1 set 1 gen 9 later at the tenth of 5245 (largest 0.000822 s); C1 set 2 flat 0 later at the tenth of 9832 (largest 0.000317 s); C1 set 2 gen 0 later at the tenth of 5425 (largest 0.000582 s); C2 set 1 flat 0 later at the tenth of 9237 (largest 0.000317 s); C2 set 1 gen 10 later at the tenth of 4937 (largest 0.000627 s); C2 set 2 flat 0 later at the tenth of 9439 (largest 0.000317 s); C2 set 2 gen 0 later at the tenth of 5161 (largest 0.000611 s)
- s3.mirror (structural; the mirror guard (s3.part1.mirror): M5 on C1 within the noise on every row and set, the exact free-run mirror on each league and set, and part 1's mirrored time the same on every arm (a calibration self-check of M8's function, read on every run)): PASSES. failures none
- s3.lateBlock (structural; the late block's place in the stream (AM-2 `lateBlock`): every expected late block present with its toucher, beat tick and beaten threat, on every pocket-1.s3 arm): PASSES. 132012 late blocks read (134143 expected over the 14 arm-sets whose reading makes them); failures none
- s3.neverOffered (structural; a late block, a uniform delay or a refit of the free-run constants is never offered for a man nobody touched (s3.neverOffered, proof:miss-rule; AM-2)): PASSES. the options offered are A, B, C, priced by A C15 and C C11 (B plays nothing); never offered: C12, reading (a): never offered (AM-2; ADR-089 §6.10); C13, the uniform delay (revision 1's LATE patch): never offered for a man nobody touched (AM-2)
- s2.selfCheck (fold check; the count part's restatement, both ways (step-2 plan §1.7 (ii)): not too strict on every arm under step 1's rule, not too generous on every arm): PASSES. 46 arm-sets; closing HOLDs at or past throwawayEarliestSeconds 1437149; exceptions none
- s2.falsifier.counterAlone (structural; must act never fires on the counter alone (proof:must-act-counter), on every PER_RUSHER arm): PASSES. 2008413 forced acts on 34 arm-sets; failures none
- s2.falsifier.everyArrival (structural; every arrival makes him act (proof:must-act-arrival), on every arm): PASSES. 181298 cases over 46 arm-sets; failures none
- s2.warning.clean (structural; no threat inside the warning coexists with CLEAN, on every arm): PASSES. 12473049 cases over 46 arm-sets; failures none
- s2.liveSet (structural; the live threat set rebuilt from the published RUSH_THREATs, on every arm): PASSES. 12473049 cases over 46 arm-sets; failures none
- s2.m2.identity (fold check; M2 STREAM's rebuild on every arm that does not play pocket-1.s3 (the bases and C13); on a pocket-1.s3 arm it is not folded, since it reads neither the late block nor the free-run clock): PASSES. 16 arm-sets; failures none
- s1.streamChecks (structural; step 1's stream checks (window ticks, beat accounting, margins, approach) on every arm of the run): PASSES. 46 arm-sets, both leagues; failures none
- q3.replay (structural; the re-played bases equal step 2's records (reports/adr-089-step2.json, both seed sets) on the stamp-free projection (every field but format, stamp, s3, m5); never a re-grade): PASSES. A0 set 1 equal; A0 set 2 equal; A14 set 1 equal; A14 set 2 equal; A1 set 1 equal; A1 set 2 equal; A11 set 1 equal; A11 set 2 equal; B3 set 1 equal; B3 set 2 equal; B6 set 1 equal; B6 set 2 equal; B5 set 1 equal; B5 set 2 equal

## Each arm: exclusive affected plays, the step-3 census and the folds' checks

### A0 (today's game, re-played; the cumulative line's design base), flat (re-played base)

- set 1: dropbacks 43837; time to throw 1.242 s
- set 1: exclusive affected plays: none (no base)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 43741; time to throw 1.241 s
- set 2: exclusive affected plays: none (no base)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### A0 (today's game, re-played; the cumulative line's design base), gen (re-played base)

- set 1: dropbacks 25758; time to throw 1.235 s
- set 1: exclusive affected plays: none (no base)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 25805; time to throw 1.243 s
- set 2: exclusive affected plays: none (no base)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### A14 (today's clock with the hold, re-played; the cumulative line's pricing base), flat (re-played base)

- set 1: dropbacks 36904; time to throw 2.396 s
- set 1: exclusive affected plays against A0: 36904 of 36904 (HOLD (every dropback) 36904)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 36757; time to throw 2.397 s
- set 2: exclusive affected plays against A0: 36757 of 36757 (HOLD (every dropback) 36757)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### A14 (today's clock with the hold, re-played; the cumulative line's pricing base), gen (re-played base)

- set 1: dropbacks 20874; time to throw 2.250 s
- set 1: exclusive affected plays against A0: 20874 of 20874 (HOLD (every dropback) 20874)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 21123; time to throw 2.278 s
- set 2: exclusive affected plays against A0: 21123 of 21123 (HOLD (every dropback) 21123)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### A1 (step 1's design, re-played; the accepted state's design base), flat (re-played base)

- set 1: dropbacks 51165; time to throw 1.589 s
- set 1: exclusive affected plays against A0: 6735 of 51165 (S (a beat played) 6278, WINDOW (a window tick played) 880)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51541; time to throw 1.591 s
- set 2: exclusive affected plays against A0: 6890 of 51541 (S (a beat played) 6433, WINDOW (a window tick played) 881)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### A1 (step 1's design, re-played; the accepted state's design base), gen (re-played base)

- set 1: dropbacks 28361; time to throw 1.666 s
- set 1: exclusive affected plays against A0: 4266 of 28361 (S (a beat played) 4008, WINDOW (a window tick played) 507)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28127; time to throw 1.693 s
- set 2: exclusive affected plays against A0: 4351 of 28127 (S (a beat played) 4098, WINDOW (a window tick played) 548)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### A11 (A1 with the stand-in hold, re-played; the accepted state's pricing base), flat (re-played base)

- set 1: dropbacks 48297; time to throw 2.739 s
- set 1: exclusive affected plays against A14: 14081 of 48297 (S (a beat played) 13549, WINDOW (a window tick played) 1568)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 48555; time to throw 2.740 s
- set 2: exclusive affected plays against A14: 14219 of 48555 (S (a beat played) 13633, WINDOW (a window tick played) 1618)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### A11 (A1 with the stand-in hold, re-played; the accepted state's pricing base), gen (re-played base)

- set 1: dropbacks 26578; time to throw 2.695 s
- set 1: exclusive affected plays against A14: 7777 of 26578 (S (a beat played) 7486, WINDOW (a window tick played) 846)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 26678; time to throw 2.709 s
- set 2: exclusive affected plays against A14: 7972 of 26678 (S (a beat played) 7703, WINDOW (a window tick played) 813)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### B3 (pocket-1.s2, step 2's design, re-played), flat (re-played base)

- set 1: dropbacks 51303; time to throw 1.592 s
- set 1: exclusive affected plays against A1: 14285 of 51303 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 10, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12106, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8793)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51505; time to throw 1.589 s
- set 2: exclusive affected plays against A1: 14327 of 51505 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 9, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12141, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8748)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### B3 (pocket-1.s2, step 2's design, re-played), gen (re-played base)

- set 1: dropbacks 28198; time to throw 1.682 s
- set 1: exclusive affected plays against A1: 7706 of 28198 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 7, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6552, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4693)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28190; time to throw 1.711 s
- set 2: exclusive affected plays against A1: 8062 of 28190 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 8, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6961, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4873)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### B6 (B3 with the stand-in hold, re-played; pricing arm), flat (re-played base)

- set 1: dropbacks 48201; time to throw 2.747 s
- set 1: exclusive affected plays against A11: 15645 of 48201 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 164, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 14936, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 9285)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 48326; time to throw 2.746 s
- set 2: exclusive affected plays against A11: 15799 of 48326 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 178, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 14996, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 9416)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### B6 (B3 with the stand-in hold, re-played; pricing arm), gen (re-played base)

- set 1: dropbacks 26574; time to throw 2.704 s
- set 1: exclusive affected plays against A11: 8399 of 26574 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 134, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 7988, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4897)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 26474; time to throw 2.719 s
- set 2: exclusive affected plays against A11: 8775 of 26474 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 164, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 8330, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 5177)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### B5 (A5 with the horizons, re-played; C14's base), flat (re-played base)

- set 1: dropbacks 51349; time to throw 1.589 s
- set 1: exclusive affected plays against A5: 14034 of 51349 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 11908, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8650)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51638; time to throw 1.590 s
- set 2: exclusive affected plays against A5: 14215 of 51638 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12050, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8778)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### B5 (A5 with the horizons, re-played; C14's base), gen (re-played base)

- set 1: dropbacks 28522; time to throw 1.663 s
- set 1: exclusive affected plays against A5: 7831 of 28522 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6629, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4832)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28459; time to throw 1.694 s
- set 2: exclusive affected plays against A5: 8136 of 28459 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6871, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 5036)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C1 (design), flat (design)

- set 1: dropbacks 51346; time to throw 1.606 s
- set 1: exclusive affected plays against B3: 12986 of 51346 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8721, LATE_BLOCK (a late beat or a late tick) 5190, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 675)
- set 1: the step-3 census (reported): {"plays":51346,"s3Plays":51346,"lateByBand":{"LATE_EXCHANGE":3040,"RAN_THROUGH":2375},"lateByKind":{"stunt_communication":3040,"blitz_pickup":2375},"reachedBeat":2035,"heldThePlay":3380,"carried":23,"untouchedExchanges":23,"touched":5438,"clockMenByOrigin":{"PICKUP_LOST":4319,"UNBLOCKED":1872,"STUNT_LOOPER":3475},"reading":"B","lateByM":{"1":291,"2":291,"3":270,"4":285,"5":288,"6":332,"7":283,"8":302,"9":274,"10":286,"11":285,"12":263,"13":262,"14":313,"15":268,"16":298,"17":258,"18":323,"19":243}}
- set 1: the late blocks' m: min 1, median 10, max 19 over 5415 (inside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51427; time to throw 1.606 s
- set 2: exclusive affected plays against B3: 13019 of 51427 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8850, LATE_BLOCK (a late beat or a late tick) 5062, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 686)
- set 2: the step-3 census (reported): {"plays":51427,"s3Plays":51427,"lateByBand":{"LATE_EXCHANGE":2908,"RAN_THROUGH":2405},"lateByKind":{"stunt_communication":2908,"blitz_pickup":2405},"reachedBeat":2025,"heldThePlay":3288,"carried":28,"untouchedExchanges":23,"touched":5333,"clockMenByOrigin":{"STUNT_LOOPER":3505,"UNBLOCKED":1781,"PICKUP_LOST":4546},"reading":"B","lateByM":{"1":300,"2":288,"3":281,"4":278,"5":294,"6":277,"7":275,"8":275,"9":318,"10":311,"11":296,"12":263,"13":260,"14":274,"15":273,"16":270,"17":272,"18":228,"19":280}}
- set 2: the late blocks' m: min 1, median 10, max 19 over 5313 (inside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C1 (design), gen (design)

- set 1: dropbacks 28419; time to throw 1.704 s
- set 1: exclusive affected plays against B3: 7015 of 28419 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4706, LATE_BLOCK (a late beat or a late tick) 2777, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 266)
- set 1: the step-3 census (reported): {"plays":28419,"s3Plays":28419,"lateByBand":{"RAN_THROUGH":1240,"LATE_EXCHANGE":1677},"lateByKind":{"blitz_pickup":1240,"stunt_communication":1677},"reachedBeat":1241,"heldThePlay":1676,"carried":11,"untouchedExchanges":8,"touched":2923,"clockMenByOrigin":{"PICKUP_LOST":2390,"UNBLOCKED":996,"STUNT_LOOPER":1859},"reading":"B","lateByM":{"1":141,"2":153,"3":152,"4":169,"5":163,"6":149,"7":156,"8":168,"9":162,"10":165,"11":143,"12":156,"13":142,"14":164,"15":146,"16":154,"17":160,"18":131,"19":143}}
- set 1: the late blocks' m: min 1, median 10, max 19 over 2917 (inside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28335; time to throw 1.748 s
- set 2: exclusive affected plays against B3: 7243 of 28335 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4886, LATE_BLOCK (a late beat or a late tick) 2865, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 262)
- set 2: the step-3 census (reported): {"plays":28335,"s3Plays":28335,"lateByBand":{"LATE_EXCHANGE":1677,"RAN_THROUGH":1338},"lateByKind":{"stunt_communication":1677,"blitz_pickup":1338},"reachedBeat":1370,"heldThePlay":1645,"carried":10,"untouchedExchanges":7,"touched":3024,"clockMenByOrigin":{"STUNT_LOOPER":1923,"PICKUP_LOST":2476,"UNBLOCKED":1026},"reading":"B","lateByM":{"1":157,"2":176,"3":161,"4":160,"5":183,"6":157,"7":164,"8":168,"9":158,"10":141,"11":131,"12":146,"13":180,"14":163,"15":178,"16":136,"17":150,"18":167,"19":139}}
- set 2: the late blocks' m: min 1, median 10, max 19 over 3015 (inside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C2 (pricing arm, never a design value), flat (pricing arm, never a design value)

- set 1: dropbacks 48629; time to throw 2.741 s
- set 1: exclusive affected plays against B6: 12295 of 48629 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8299, LATE_BLOCK (a late beat or a late tick) 4827, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 1494)
- set 1: the step-3 census (reported): {"plays":48629,"s3Plays":48629,"lateByBand":{"LATE_EXCHANGE":2837,"RAN_THROUGH":2210},"lateByKind":{"stunt_communication":2837,"blitz_pickup":2210},"reachedBeat":3762,"heldThePlay":1285,"carried":19,"untouchedExchanges":22,"touched":5068,"clockMenByOrigin":{"PICKUP_LOST":4169,"UNBLOCKED":1701,"STUNT_LOOPER":3367},"reading":"B","lateByM":{"1":288,"2":248,"3":266,"4":269,"5":264,"6":293,"7":255,"8":264,"9":287,"10":292,"11":273,"12":258,"13":248,"14":269,"15":262,"16":251,"17":240,"18":282,"19":238}}
- set 1: the late blocks' m: min 1, median 10, max 19 over 5047 (inside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 48761; time to throw 2.739 s
- set 2: exclusive affected plays against B6: 12479 of 48761 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8461, LATE_BLOCK (a late beat or a late tick) 4853, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 1517)
- set 2: the step-3 census (reported): {"plays":48761,"s3Plays":48761,"lateByBand":{"RAN_THROUGH":2309,"LATE_EXCHANGE":2784},"lateByKind":{"blitz_pickup":2309,"stunt_communication":2784},"reachedBeat":3772,"heldThePlay":1321,"carried":23,"untouchedExchanges":23,"touched":5119,"clockMenByOrigin":{"STUNT_LOOPER":3336,"PICKUP_LOST":4371,"UNBLOCKED":1732},"reading":"B","lateByM":{"1":284,"2":284,"3":241,"4":281,"5":270,"6":269,"7":258,"8":269,"9":252,"10":302,"11":301,"12":236,"13":253,"14":288,"15":292,"16":248,"17":284,"18":244,"19":237}}
- set 2: the late blocks' m: min 1, median 10, max 19 over 5093 (inside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C2 (pricing arm, never a design value), gen (pricing arm, never a design value)

- set 1: dropbacks 26999; time to throw 2.701 s
- set 1: exclusive affected plays against B6: 6714 of 26999 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4444, LATE_BLOCK (a late beat or a late tick) 2718, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 727)
- set 1: the step-3 census (reported): {"plays":26999,"s3Plays":26999,"lateByBand":{"RAN_THROUGH":1214,"LATE_EXCHANGE":1644},"lateByKind":{"blitz_pickup":1214,"stunt_communication":1644},"reachedBeat":2146,"heldThePlay":712,"carried":10,"untouchedExchanges":10,"touched":2863,"clockMenByOrigin":{"PICKUP_LOST":2286,"STUNT_LOOPER":1708,"UNBLOCKED":943},"reading":"B","lateByM":{"1":136,"2":164,"3":152,"4":151,"5":154,"6":152,"7":146,"8":160,"9":171,"10":157,"11":132,"12":156,"13":144,"14":147,"15":149,"16":137,"17":158,"18":141,"19":151}}
- set 1: the late blocks' m: min 1, median 10, max 19 over 2858 (inside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 27016; time to throw 2.717 s
- set 2: exclusive affected plays against B6: 6894 of 27016 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4642, LATE_BLOCK (a late beat or a late tick) 2730, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 733)
- set 2: the step-3 census (reported): {"plays":27016,"s3Plays":27016,"lateByBand":{"LATE_EXCHANGE":1550,"RAN_THROUGH":1307},"lateByKind":{"stunt_communication":1550,"blitz_pickup":1307},"reachedBeat":2153,"heldThePlay":704,"carried":13,"untouchedExchanges":5,"touched":2868,"clockMenByOrigin":{"STUNT_LOOPER":1822,"UNBLOCKED":999,"PICKUP_LOST":2340},"reading":"B","lateByM":{"1":150,"2":163,"3":144,"4":151,"5":151,"6":166,"7":150,"8":134,"9":137,"10":145,"11":144,"12":153,"13":185,"14":168,"15":150,"16":124,"17":153,"18":141,"19":148}}
- set 2: the late blocks' m: min 1, median 10, max 19 over 2857 (inside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C3 (information, the snap spot alone (AM-2's references hold the others)), flat (information, the snap spot alone (AM-2's references hold the others))

- set 1: dropbacks 51289; time to throw 1.601 s
- set 1: exclusive affected plays against B3: 8778 of 51289 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8778)
- set 1: the step-3 census (reported): {"plays":51289,"s3Plays":51289,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":20,"touched":5353,"clockMenByOrigin":{"PICKUP_LOST":4389,"STUNT_LOOPER":3468,"UNBLOCKED":1900},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51557; time to throw 1.603 s
- set 2: exclusive affected plays against B3: 8898 of 51557 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8898)
- set 2: the step-3 census (reported): {"plays":51557,"s3Plays":51557,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":24,"touched":5440,"clockMenByOrigin":{"STUNT_LOOPER":3490,"PICKUP_LOST":4641,"UNBLOCKED":1787},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C3 (information, the snap spot alone (AM-2's references hold the others)), gen (information, the snap spot alone (AM-2's references hold the others))

- set 1: dropbacks 28421; time to throw 1.692 s
- set 1: exclusive affected plays against B3: 4664 of 28421 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4664)
- set 1: the step-3 census (reported): {"plays":28421,"s3Plays":28421,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":9,"touched":3029,"clockMenByOrigin":{"PICKUP_LOST":2365,"UNBLOCKED":985,"STUNT_LOOPER":1842},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28473; time to throw 1.728 s
- set 2: exclusive affected plays against B3: 4981 of 28473 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4981)
- set 2: the step-3 census (reported): {"plays":28473,"s3Plays":28473,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":6,"touched":3010,"clockMenByOrigin":{"STUNT_LOOPER":1960,"PICKUP_LOST":2530,"UNBLOCKED":1047},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C4 (information, Speed and Acceleration alone (AM-2's references hold the others)), flat (information, Speed and Acceleration alone (AM-2's references hold the others))

- set 1: dropbacks 51311; time to throw 1.602 s
- set 1: exclusive affected plays against B3: 8701 of 51311 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8701)
- set 1: the step-3 census (reported): {"plays":51311,"s3Plays":51311,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":20,"touched":5353,"clockMenByOrigin":{"PICKUP_LOST":4356,"STUNT_LOOPER":3440,"UNBLOCKED":1873},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51656; time to throw 1.603 s
- set 2: exclusive affected plays against B3: 8980 of 51656 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8980)
- set 2: the step-3 census (reported): {"plays":51656,"s3Plays":51656,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":27,"touched":5411,"clockMenByOrigin":{"STUNT_LOOPER":3515,"PICKUP_LOST":4668,"UNBLOCKED":1818},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C4 (information, Speed and Acceleration alone (AM-2's references hold the others)), gen (information, Speed and Acceleration alone (AM-2's references hold the others))

- set 1: dropbacks 28065; time to throw 1.687 s
- set 1: exclusive affected plays against B3: 4668 of 28065 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4668)
- set 1: the step-3 census (reported): {"plays":28065,"s3Plays":28065,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":12,"touched":2918,"clockMenByOrigin":{"PICKUP_LOST":2402,"UNBLOCKED":964,"STUNT_LOOPER":1834},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28350; time to throw 1.729 s
- set 2: exclusive affected plays against B3: 4936 of 28350 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4936)
- set 2: the step-3 census (reported): {"plays":28350,"s3Plays":28350,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":8,"touched":3053,"clockMenByOrigin":{"STUNT_LOOPER":1944,"PICKUP_LOST":2506,"UNBLOCKED":1048},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C5 (information, the drop alone (AM-2's references hold the others)), flat (information, the drop alone (AM-2's references hold the others))

- set 1: dropbacks 51314; time to throw 1.602 s
- set 1: exclusive affected plays against B3: 8710 of 51314 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8710)
- set 1: the step-3 census (reported): {"plays":51314,"s3Plays":51314,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":21,"touched":5370,"clockMenByOrigin":{"PICKUP_LOST":4363,"STUNT_LOOPER":3441,"UNBLOCKED":1879},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51604; time to throw 1.603 s
- set 2: exclusive affected plays against B3: 8975 of 51604 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8975)
- set 2: the step-3 census (reported): {"plays":51604,"s3Plays":51604,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":27,"touched":5409,"clockMenByOrigin":{"STUNT_LOOPER":3520,"PICKUP_LOST":4646,"UNBLOCKED":1817},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C5 (information, the drop alone (AM-2's references hold the others)), gen (information, the drop alone (AM-2's references hold the others))

- set 1: dropbacks 28263; time to throw 1.693 s
- set 1: exclusive affected plays against B3: 4666 of 28263 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4666)
- set 1: the step-3 census (reported): {"plays":28263,"s3Plays":28263,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":10,"touched":3001,"clockMenByOrigin":{"PICKUP_LOST":2408,"STUNT_LOOPER":1823,"UNBLOCKED":970},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28418; time to throw 1.733 s
- set 2: exclusive affected plays against B3: 4993 of 28418 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4993)
- set 2: the step-3 census (reported): {"plays":28418,"s3Plays":28418,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":6,"touched":3054,"clockMenByOrigin":{"STUNT_LOOPER":1965,"PICKUP_LOST":2510,"UNBLOCKED":1054},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C6 (information, the other of the two snap pictures (AM-2's Mug rule)), flat (information, the other of the two snap pictures (AM-2's Mug rule))

- set 1: dropbacks 51380; time to throw 1.607 s
- set 1: exclusive affected plays against B3: 51380 of 51380 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8735, LATE_BLOCK (a late beat or a late tick) 5198, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 673, MUG_HEAD_ONLY (every dropback) 51380)
- set 1: the step-3 census (reported): {"plays":51380,"s3Plays":51380,"lateByBand":{"LATE_EXCHANGE":3044,"RAN_THROUGH":2376},"lateByKind":{"stunt_communication":3044,"blitz_pickup":2376},"reachedBeat":2041,"heldThePlay":3379,"carried":24,"untouchedExchanges":22,"touched":5444,"clockMenByOrigin":{"PICKUP_LOST":4350,"UNBLOCKED":1858,"STUNT_LOOPER":3470},"reading":"B","lateByM":{"1":297,"2":295,"3":267,"4":287,"5":290,"6":331,"7":280,"8":297,"9":272,"10":286,"11":282,"12":266,"13":267,"14":306,"15":275,"16":295,"17":258,"18":319,"19":250}}
- set 1: the late blocks' m: min 1, median 10, max 19 over 5420 (inside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51426; time to throw 1.607 s
- set 2: exclusive affected plays against B3: 51426 of 51426 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8879, LATE_BLOCK (a late beat or a late tick) 5043, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 698, MUG_HEAD_ONLY (every dropback) 51426)
- set 2: the step-3 census (reported): {"plays":51426,"s3Plays":51426,"lateByBand":{"LATE_EXCHANGE":2886,"RAN_THROUGH":2401},"lateByKind":{"stunt_communication":2886,"blitz_pickup":2401},"reachedBeat":2010,"heldThePlay":3277,"carried":29,"untouchedExchanges":24,"touched":5308,"clockMenByOrigin":{"STUNT_LOOPER":3536,"UNBLOCKED":1777,"PICKUP_LOST":4553},"reading":"B","lateByM":{"1":296,"2":289,"3":284,"4":278,"5":292,"6":277,"7":273,"8":272,"9":317,"10":312,"11":287,"12":263,"13":257,"14":271,"15":269,"16":269,"17":273,"18":230,"19":278}}
- set 2: the late blocks' m: min 1, median 10, max 19 over 5287 (inside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C6 (information, the other of the two snap pictures (AM-2's Mug rule)), gen (information, the other of the two snap pictures (AM-2's Mug rule))

- set 1: dropbacks 28430; time to throw 1.703 s
- set 1: exclusive affected plays against B3: 28430 of 28430 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4711, LATE_BLOCK (a late beat or a late tick) 2796, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 269, MUG_HEAD_ONLY (every dropback) 28430)
- set 1: the step-3 census (reported): {"plays":28430,"s3Plays":28430,"lateByBand":{"RAN_THROUGH":1248,"LATE_EXCHANGE":1690},"lateByKind":{"blitz_pickup":1248,"stunt_communication":1690},"reachedBeat":1252,"heldThePlay":1686,"carried":11,"untouchedExchanges":8,"touched":2944,"clockMenByOrigin":{"PICKUP_LOST":2402,"UNBLOCKED":998,"STUNT_LOOPER":1852},"reading":"B","lateByM":{"1":141,"2":156,"3":153,"4":169,"5":166,"6":156,"7":156,"8":174,"9":164,"10":166,"11":138,"12":156,"13":143,"14":163,"15":148,"16":156,"17":160,"18":130,"19":143}}
- set 1: the late blocks' m: min 1, median 10, max 19 over 2938 (inside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28395; time to throw 1.748 s
- set 2: exclusive affected plays against B3: 28395 of 28395 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4885, LATE_BLOCK (a late beat or a late tick) 2871, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 257, MUG_HEAD_ONLY (every dropback) 28395)
- set 2: the step-3 census (reported): {"plays":28395,"s3Plays":28395,"lateByBand":{"LATE_EXCHANGE":1673,"RAN_THROUGH":1347},"lateByKind":{"stunt_communication":1673,"blitz_pickup":1347},"reachedBeat":1382,"heldThePlay":1638,"carried":10,"untouchedExchanges":7,"touched":3029,"clockMenByOrigin":{"STUNT_LOOPER":1933,"PICKUP_LOST":2470,"UNBLOCKED":1026},"reading":"B","lateByM":{"1":158,"2":172,"3":161,"4":155,"5":186,"6":158,"7":164,"8":170,"9":156,"10":140,"11":136,"12":151,"13":182,"14":162,"15":176,"16":136,"17":154,"18":165,"19":138}}
- set 2: the late blocks' m: min 1, median 10, max 19 over 3020 (inside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C7 (information, UNBLOCKED alone), flat (information, UNBLOCKED alone)

- set 1: dropbacks 51163; time to throw 1.595 s
- set 1: exclusive affected plays against B3: 1806 of 51163 (FREE_RUN (a threat on the free-run clock under the arm's reading) 1806)
- set 1: the step-3 census (reported): {"plays":51163,"s3Plays":51163,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":21,"touched":5371,"clockMenByOrigin":{"UNBLOCKED":1856},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51582; time to throw 1.596 s
- set 2: exclusive affected plays against B3: 1763 of 51582 (FREE_RUN (a threat on the free-run clock under the arm's reading) 1763)
- set 2: the step-3 census (reported): {"plays":51582,"s3Plays":51582,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":24,"touched":5365,"clockMenByOrigin":{"UNBLOCKED":1794},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C7 (information, UNBLOCKED alone), gen (information, UNBLOCKED alone)

- set 1: dropbacks 28206; time to throw 1.688 s
- set 1: exclusive affected plays against B3: 953 of 28206 (FREE_RUN (a threat on the free-run clock under the arm's reading) 953)
- set 1: the step-3 census (reported): {"plays":28206,"s3Plays":28206,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":11,"touched":2882,"clockMenByOrigin":{"UNBLOCKED":975},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28286; time to throw 1.719 s
- set 2: exclusive affected plays against B3: 993 of 28286 (FREE_RUN (a threat on the free-run clock under the arm's reading) 993)
- set 2: the step-3 census (reported): {"plays":28286,"s3Plays":28286,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":5,"touched":2977,"clockMenByOrigin":{"UNBLOCKED":1024},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C8 (information, BLOWN_UP alone), flat (information, BLOWN_UP alone)

- set 1: dropbacks 51301; time to throw 1.596 s
- set 1: exclusive affected plays against B3: 4055 of 51301 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4055)
- set 1: the step-3 census (reported): {"plays":51301,"s3Plays":51301,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":19,"touched":5415,"clockMenByOrigin":{"PICKUP_LOST":4410},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51738; time to throw 1.598 s
- set 2: exclusive affected plays against B3: 4243 of 51738 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4243)
- set 2: the step-3 census (reported): {"plays":51738,"s3Plays":51738,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":22,"touched":5483,"clockMenByOrigin":{"PICKUP_LOST":4637},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C8 (information, BLOWN_UP alone), gen (information, BLOWN_UP alone)

- set 1: dropbacks 28334; time to throw 1.685 s
- set 1: exclusive affected plays against B3: 2185 of 28334 (FREE_RUN (a threat on the free-run clock under the arm's reading) 2185)
- set 1: the step-3 census (reported): {"plays":28334,"s3Plays":28334,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":10,"touched":3013,"clockMenByOrigin":{"PICKUP_LOST":2391},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28284; time to throw 1.725 s
- set 2: exclusive affected plays against B3: 2278 of 28284 (FREE_RUN (a threat on the free-run clock under the arm's reading) 2278)
- set 2: the step-3 census (reported): {"plays":28284,"s3Plays":28284,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":10,"touched":2984,"clockMenByOrigin":{"PICKUP_LOST":2489},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C9 (information, LOOPER_FREE alone (the untouched exchange with it, AM-2)), flat (information, LOOPER_FREE alone (the untouched exchange with it, AM-2))

- set 1: dropbacks 51290; time to throw 1.592 s
- set 1: exclusive affected plays against B3: 3329 of 51290 (FREE_RUN (a threat on the free-run clock under the arm's reading) 3329)
- set 1: the step-3 census (reported): {"plays":51290,"s3Plays":51290,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":26,"touched":5346,"clockMenByOrigin":{"STUNT_LOOPER":3536},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51557; time to throw 1.591 s
- set 2: exclusive affected plays against B3: 3294 of 51557 (FREE_RUN (a threat on the free-run clock under the arm's reading) 3294)
- set 2: the step-3 census (reported): {"plays":51557,"s3Plays":51557,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":24,"touched":5386,"clockMenByOrigin":{"STUNT_LOOPER":3499},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C9 (information, LOOPER_FREE alone (the untouched exchange with it, AM-2)), gen (information, LOOPER_FREE alone (the untouched exchange with it, AM-2))

- set 1: dropbacks 28221; time to throw 1.682 s
- set 1: exclusive affected plays against B3: 1737 of 28221 (FREE_RUN (a threat on the free-run clock under the arm's reading) 1737)
- set 1: the step-3 census (reported): {"plays":28221,"s3Plays":28221,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":10,"touched":2900,"clockMenByOrigin":{"STUNT_LOOPER":1847},"reading":"B","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28119; time to throw 1.711 s
- set 2: exclusive affected plays against B3: 1849 of 28119 (FREE_RUN (a threat on the free-run clock under the arm's reading) 1849)
- set 2: the step-3 census (reported): {"plays":28119,"s3Plays":28119,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":4,"touched":2946,"clockMenByOrigin":{"STUNT_LOOPER":1963},"reading":"B","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C10 (information, the late block alone), flat (information, the late block alone)

- set 1: dropbacks 51296; time to throw 1.597 s
- set 1: exclusive affected plays against B3: 5056 of 51296 (LATE_BLOCK (a late beat or a late tick) 5056)
- set 1: the step-3 census (reported): {"plays":51296,"s3Plays":51296,"lateByBand":{"RAN_THROUGH":2373,"LATE_EXCHANGE":2908},"lateByKind":{"blitz_pickup":2373,"stunt_communication":2908},"reachedBeat":1927,"heldThePlay":3354,"carried":26,"untouchedExchanges":29,"touched":5302,"clockMenByOrigin":{"PICKUP_LOST":4482,"UNBLOCKED":1855,"STUNT_LOOPER":3553},"reading":"D19","lateByM":{"1":281,"2":259,"3":274,"4":259,"5":276,"6":310,"7":301,"8":287,"9":276,"10":269,"11":308,"12":247,"13":278,"14":305,"15":272,"16":261,"17":240,"18":319,"19":259}}
- set 1: the late blocks' m: min 1, median 10, max 19 over 5281 (inside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51485; time to throw 1.604 s
- set 2: exclusive affected plays against B3: 5188 of 51485 (LATE_BLOCK (a late beat or a late tick) 5188)
- set 2: the step-3 census (reported): {"plays":51485,"s3Plays":51485,"lateByBand":{"LATE_EXCHANGE":2968,"RAN_THROUGH":2472},"lateByKind":{"stunt_communication":2968,"blitz_pickup":2472},"reachedBeat":2017,"heldThePlay":3423,"carried":22,"untouchedExchanges":26,"touched":5464,"clockMenByOrigin":{"STUNT_LOOPER":3489,"UNBLOCKED":1772,"PICKUP_LOST":4612},"reading":"D19","lateByM":{"1":321,"2":302,"3":260,"4":279,"5":292,"6":290,"7":269,"8":310,"9":299,"10":324,"11":280,"12":280,"13":283,"14":285,"15":301,"16":276,"17":276,"18":247,"19":266}}
- set 2: the late blocks' m: min 1, median 10, max 19 over 5440 (inside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C10 (information, the late block alone), gen (information, the late block alone)

- set 1: dropbacks 28360; time to throw 1.688 s
- set 1: exclusive affected plays against B3: 2827 of 28360 (LATE_BLOCK (a late beat or a late tick) 2827)
- set 1: the step-3 census (reported): {"plays":28360,"s3Plays":28360,"lateByBand":{"RAN_THROUGH":1281,"LATE_EXCHANGE":1687},"lateByKind":{"blitz_pickup":1281,"stunt_communication":1687},"reachedBeat":1185,"heldThePlay":1783,"carried":9,"untouchedExchanges":9,"touched":2977,"clockMenByOrigin":{"PICKUP_LOST":2441,"UNBLOCKED":965,"STUNT_LOOPER":1851},"reading":"D19","lateByM":{"1":149,"2":177,"3":146,"4":152,"5":157,"6":163,"7":165,"8":159,"9":176,"10":145,"11":158,"12":166,"13":139,"14":163,"15":144,"16":156,"17":171,"18":137,"19":145}}
- set 1: the late blocks' m: min 1, median 10, max 19 over 2968 (inside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28155; time to throw 1.726 s
- set 2: exclusive affected plays against B3: 2847 of 28155 (LATE_BLOCK (a late beat or a late tick) 2847)
- set 2: the step-3 census (reported): {"plays":28155,"s3Plays":28155,"lateByBand":{"LATE_EXCHANGE":1665,"RAN_THROUGH":1331},"lateByKind":{"stunt_communication":1665,"blitz_pickup":1331},"reachedBeat":1278,"heldThePlay":1718,"carried":9,"untouchedExchanges":6,"touched":3004,"clockMenByOrigin":{"STUNT_LOOPER":1914,"PICKUP_LOST":2458,"UNBLOCKED":1014},"reading":"D19","lateByM":{"1":146,"2":170,"3":157,"4":144,"5":194,"6":163,"7":159,"8":167,"9":139,"10":153,"11":141,"12":145,"13":188,"14":170,"15":167,"16":144,"17":153,"18":158,"19":138}}
- set 2: the late blocks' m: min 1, median 10, max 19 over 2996 (inside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C11 (information, priced for the miss rule's option C; guarded under AM-3), flat (information, priced for the miss rule's option C; guarded under AM-3)

- set 1: dropbacks 51466; time to throw 1.600 s
- set 1: exclusive affected plays against B3: 13082 of 51466 (FREE_RUN (a threat on the free-run clock under the arm's reading) 13082, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 637)
- set 1: the step-3 census (reported): {"plays":51466,"s3Plays":51466,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":19,"touched":5429,"clockMenByOrigin":{"PICKUP_LOST":6775,"STUNT_LOOPER":6550,"UNBLOCKED":1851},"reading":"C","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51542; time to throw 1.596 s
- set 2: exclusive affected plays against B3: 13180 of 51542 (FREE_RUN (a threat on the free-run clock under the arm's reading) 13180, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 651)
- set 2: the step-3 census (reported): {"plays":51542,"s3Plays":51542,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":24,"touched":5394,"clockMenByOrigin":{"STUNT_LOOPER":6432,"PICKUP_LOST":7104,"UNBLOCKED":1817},"reading":"C","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C11 (information, priced for the miss rule's option C; guarded under AM-3), gen (information, priced for the miss rule's option C; guarded under AM-3)

- set 1: dropbacks 28518; time to throw 1.697 s
- set 1: exclusive affected plays against B3: 7085 of 28518 (FREE_RUN (a threat on the free-run clock under the arm's reading) 7085, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 256)
- set 1: the step-3 census (reported): {"plays":28518,"s3Plays":28518,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":11,"touched":3006,"clockMenByOrigin":{"PICKUP_LOST":3725,"STUNT_LOOPER":3525,"UNBLOCKED":998},"reading":"C","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28338; time to throw 1.733 s
- set 2: exclusive affected plays against B3: 7343 of 28338 (FREE_RUN (a threat on the free-run clock under the arm's reading) 7343, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 266)
- set 2: the step-3 census (reported): {"plays":28338,"s3Plays":28338,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":6,"touched":3043,"clockMenByOrigin":{"STUNT_LOOPER":3596,"PICKUP_LOST":3897,"UNBLOCKED":1054},"reading":"C","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C12 (information, reading (a), never offered), flat (information, reading (a), never offered)

- set 1: dropbacks 52083; time to throw 1.631 s
- set 1: exclusive affected plays against B3: 13289 of 52083 (FREE_RUN (a threat on the free-run clock under the arm's reading) 1913, LATE_BLOCK (a late beat or a late tick) 11671, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 67)
- set 1: the step-3 census (reported): {"plays":52083,"s3Plays":52083,"lateByBand":{"BLOWN_UP":4489,"LATE_EXCHANGE":3047,"RAN_THROUGH":2425,"LOOPER_FREE":3521},"lateByKind":{"blitz_pickup":6914,"stunt_communication":6568},"reachedBeat":6273,"heldThePlay":7209,"carried":75,"untouchedExchanges":26,"touched":5497,"clockMenByOrigin":{"UNBLOCKED":1895,"STUNT_LOOPER":71},"reading":"A","lateByM":{"1":301,"2":299,"3":287,"4":279,"5":288,"6":324,"7":308,"8":316,"9":279,"10":278,"11":302,"12":265,"13":273,"14":286,"15":295,"16":275,"17":258,"18":299,"19":260,"20":260,"21":284,"22":261,"23":274,"24":251,"25":246,"26":259,"27":272,"28":252,"29":251,"30":240,"31":247,"32":263,"33":301,"34":288,"35":270,"36":157,"37":134,"38":154,"39":130,"40":157,"41":142,"42":134,"43":135,"44":108,"45":127,"46":113,"47":115,"48":118,"49":97,"50":95,"51":86,"52":78,"53":90,"54":79,"55":80,"56":82,"57":90,"58":103,"59":76,"60":83,"61":37,"62":52,"63":53,"64":52,"65":55,"66":46,"67":42,"68":36,"69":39,"70":34,"71":35,"72":31,"73":39,"74":32,"75":40,"76":32,"77":32,"78":28,"79":29,"80":30,"81":21,"82":26,"83":19,"84":22,"85":20,"86":15,"87":13,"88":14,"89":7,"90":7,"91":8,"92":8,"93":6,"94":10,"95":8,"96":11,"97":8,"98":5,"99":6,"100":1,"101":4,"102":3,"103":1,"104":4,"105":1,"106":1,"107":2,"108":2,"109":1}}
- set 1: the late blocks' m: min 1, median 24, max 109 over 13482 (outside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 52702; time to throw 1.630 s
- set 2: exclusive affected plays against B3: 13350 of 52702 (FREE_RUN (a threat on the free-run clock under the arm's reading) 1910, LATE_BLOCK (a late beat or a late tick) 11751, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 63)
- set 2: the step-3 census (reported): {"plays":52702,"s3Plays":52702,"lateByBand":{"LATE_EXCHANGE":3019,"LOOPER_FREE":3507,"BLOWN_UP":4672,"RAN_THROUGH":2469},"lateByKind":{"stunt_communication":6526,"blitz_pickup":7141},"reachedBeat":6453,"heldThePlay":7214,"carried":79,"untouchedExchanges":23,"touched":5511,"clockMenByOrigin":{"UNBLOCKED":1894,"STUNT_LOOPER":56},"reading":"A","lateByM":{"1":304,"2":309,"3":285,"4":299,"5":281,"6":302,"7":286,"8":305,"9":289,"10":308,"11":284,"12":274,"13":271,"14":280,"15":284,"16":280,"17":275,"18":279,"19":293,"20":294,"21":324,"22":274,"23":277,"24":280,"25":260,"26":262,"27":239,"28":239,"29":248,"30":245,"31":246,"32":236,"33":256,"34":272,"35":261,"36":142,"37":152,"38":152,"39":156,"40":136,"41":143,"42":145,"43":121,"44":148,"45":152,"46":123,"47":106,"48":110,"49":105,"50":112,"51":94,"52":91,"53":74,"54":80,"55":72,"56":77,"57":72,"58":94,"59":79,"60":81,"61":57,"62":69,"63":56,"64":58,"65":47,"66":58,"67":42,"68":37,"69":44,"70":41,"71":39,"72":38,"73":48,"74":33,"75":35,"76":42,"77":40,"78":36,"79":31,"80":22,"81":26,"82":28,"83":13,"84":15,"85":24,"86":15,"87":15,"88":10,"89":11,"90":14,"91":12,"92":5,"93":13,"94":6,"95":8,"96":13,"97":7,"98":7,"99":5,"100":7,"101":4,"102":2,"103":3,"104":6,"105":2,"106":2,"107":1,"108":1,"109":1}}
- set 2: the late blocks' m: min 1, median 24, max 109 over 13667 (outside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C12 (information, reading (a), never offered), gen (information, reading (a), never offered)

- set 1: dropbacks 28622; time to throw 1.730 s
- set 1: exclusive affected plays against B3: 7148 of 28622 (FREE_RUN (a threat on the free-run clock under the arm's reading) 1007, LATE_BLOCK (a late beat or a late tick) 6293, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 32)
- set 1: the step-3 census (reported): {"plays":28622,"s3Plays":28622,"lateByBand":{"BLOWN_UP":2398,"RAN_THROUGH":1329,"LATE_EXCHANGE":1703,"LOOPER_FREE":1853},"lateByKind":{"blitz_pickup":3727,"stunt_communication":3556},"reachedBeat":3722,"heldThePlay":3561,"carried":28,"untouchedExchanges":11,"touched":3042,"clockMenByOrigin":{"UNBLOCKED":1000,"STUNT_LOOPER":29},"reading":"A","lateByM":{"1":158,"2":162,"3":161,"4":173,"5":169,"6":171,"7":169,"8":159,"9":158,"10":175,"11":150,"12":169,"13":140,"14":144,"15":159,"16":167,"17":165,"18":137,"19":146,"20":160,"21":147,"22":157,"23":164,"24":153,"25":154,"26":157,"27":169,"28":118,"29":142,"30":128,"31":130,"32":128,"33":112,"34":108,"35":96,"36":97,"37":79,"38":72,"39":86,"40":77,"41":73,"42":69,"43":68,"44":70,"45":61,"46":48,"47":55,"48":50,"49":53,"50":54,"51":49,"52":50,"53":42,"54":48,"55":50,"56":48,"57":47,"58":46,"59":49,"60":27,"61":25,"62":20,"63":31,"64":27,"65":21,"66":26,"67":23,"68":34,"69":20,"70":28,"71":20,"72":19,"73":16,"74":18,"75":21,"76":18,"77":11,"78":15,"79":20,"80":18,"81":6,"82":8,"83":10,"84":12,"85":8,"86":2,"87":13,"88":9,"89":7,"90":7,"91":4,"92":6,"93":7,"94":1,"95":4,"96":4,"97":2,"98":7,"99":1,"100":2,"102":1,"104":1,"105":1,"106":1,"108":1,"110":1,"111":1,"112":1,"115":1}}
- set 1: the late blocks' m: min 1, median 23, max 115 over 7283 (outside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28248; time to throw 1.769 s
- set 2: exclusive affected plays against B3: 7297 of 28248 (FREE_RUN (a threat on the free-run clock under the arm's reading) 1050, LATE_BLOCK (a late beat or a late tick) 6396, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 28)
- set 2: the step-3 census (reported): {"plays":28248,"s3Plays":28248,"lateByBand":{"LOOPER_FREE":1860,"BLOWN_UP":2535,"LATE_EXCHANGE":1711,"RAN_THROUGH":1329},"lateByKind":{"stunt_communication":3571,"blitz_pickup":3864},"reachedBeat":3884,"heldThePlay":3551,"carried":37,"untouchedExchanges":9,"touched":3049,"clockMenByOrigin":{"UNBLOCKED":1039,"STUNT_LOOPER":34},"reading":"A","lateByM":{"1":171,"2":173,"3":165,"4":151,"5":177,"6":153,"7":157,"8":162,"9":145,"10":151,"11":149,"12":160,"13":173,"14":184,"15":170,"16":137,"17":154,"18":157,"19":151,"20":151,"21":149,"22":151,"23":160,"24":151,"25":145,"26":143,"27":126,"28":159,"29":140,"30":122,"31":153,"32":129,"33":117,"34":134,"35":102,"36":109,"37":117,"38":86,"39":70,"40":79,"41":74,"42":61,"43":78,"44":71,"45":70,"46":63,"47":63,"48":55,"49":64,"50":58,"51":49,"52":55,"53":40,"54":56,"55":41,"56":40,"57":52,"58":41,"59":39,"60":41,"61":30,"62":32,"63":26,"64":24,"65":25,"66":17,"67":31,"68":17,"69":22,"70":18,"71":26,"72":26,"73":21,"74":17,"75":27,"76":22,"77":15,"78":13,"79":27,"80":10,"81":12,"82":12,"83":8,"84":6,"85":5,"86":13,"87":9,"88":5,"89":9,"90":9,"91":6,"92":11,"93":5,"94":2,"95":2,"96":3,"97":7,"98":4,"99":3,"100":3,"101":1,"102":3,"103":1,"104":1,"105":1,"106":1,"107":2,"108":1}}
- set 2: the late blocks' m: min 1, median 24, max 108 over 7435 (outside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C13 (contrast only: revision 1's uniform delay, never offered for a man nobody touched), flat (contrast only: revision 1's uniform delay, never offered for a man nobody touched)

- set 1: dropbacks 52176; time to throw 1.637 s
- set 1: exclusive affected plays against B3: 52176 of 52176 (LATE (every dropback) 52176)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 52844; time to throw 1.639 s
- set 2: exclusive affected plays against B3: 52844 of 52844 (LATE (every dropback) 52844)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C13 (contrast only: revision 1's uniform delay, never offered for a man nobody touched), gen (contrast only: revision 1's uniform delay, never offered for a man nobody touched)

- set 1: dropbacks 28492; time to throw 1.747 s
- set 1: exclusive affected plays against B3: 28492 of 28492 (LATE (every dropback) 28492)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28398; time to throw 1.783 s
- set 2: exclusive affected plays against B3: 28398 of 28398 (LATE (every dropback) 28398)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C14 (information, the L basis (its late block on shape L is petition P17's, in contracts)), flat (information, the L basis (its late block on shape L is petition P17's, in contracts))

- set 1: dropbacks 51540; time to throw 1.608 s
- set 1: exclusive affected plays against B5: 12682 of 51540 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8982, LATE_BLOCK (a late beat or a late tick) 4507, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 640)
- set 1: the step-3 census (reported): {"plays":51540,"s3Plays":51540,"lateByBand":{"LATE_EXCHANGE":2657,"RAN_THROUGH":2052},"lateByKind":{"stunt_communication":2657,"blitz_pickup":2052},"reachedBeat":1327,"heldThePlay":3382,"carried":18,"untouchedExchanges":28,"touched":5397,"clockMenByOrigin":{"PICKUP_LOST":4513,"STUNT_LOOPER":3579,"UNBLOCKED":1908},"reading":"B","lateByM":{"1":267,"2":245,"3":261,"4":254,"5":253,"6":295,"7":254,"8":248,"9":227,"10":238,"11":250,"12":233,"13":255,"14":261,"15":251,"16":240,"17":209,"18":261,"19":207}}
- set 1: the late blocks' m: min 1, median 10, max 19 over 4709 (inside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 51840; time to throw 1.605 s
- set 2: exclusive affected plays against B5: 12691 of 51840 (FREE_RUN (a threat on the free-run clock under the arm's reading) 8972, LATE_BLOCK (a late beat or a late tick) 4490, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 686)
- set 2: the step-3 census (reported): {"plays":51840,"s3Plays":51840,"lateByBand":{"LATE_EXCHANGE":2625,"RAN_THROUGH":2064},"lateByKind":{"stunt_communication":2625,"blitz_pickup":2064},"reachedBeat":1408,"heldThePlay":3281,"carried":24,"untouchedExchanges":26,"touched":5359,"clockMenByOrigin":{"STUNT_LOOPER":3492,"PICKUP_LOST":4710,"UNBLOCKED":1785},"reading":"B","lateByM":{"1":264,"2":264,"3":249,"4":226,"5":260,"6":247,"7":243,"8":249,"9":267,"10":271,"11":263,"12":240,"13":223,"14":225,"15":242,"16":238,"17":241,"18":232,"19":245}}
- set 2: the late blocks' m: min 1, median 10, max 19 over 4689 (inside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C14 (information, the L basis (its late block on shape L is petition P17's, in contracts)), gen (information, the L basis (its late block on shape L is petition P17's, in contracts))

- set 1: dropbacks 28631; time to throw 1.694 s
- set 1: exclusive affected plays against B5: 6768 of 28631 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4743, LATE_BLOCK (a late beat or a late tick) 2439, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 270)
- set 1: the step-3 census (reported): {"plays":28631,"s3Plays":28631,"lateByBand":{"RAN_THROUGH":1113,"LATE_EXCHANGE":1450},"lateByKind":{"blitz_pickup":1113,"stunt_communication":1450},"reachedBeat":844,"heldThePlay":1719,"carried":11,"untouchedExchanges":12,"touched":2985,"clockMenByOrigin":{"PICKUP_LOST":2407,"UNBLOCKED":1009,"STUNT_LOOPER":1862},"reading":"B","lateByM":{"1":135,"2":142,"3":152,"4":149,"5":139,"6":126,"7":127,"8":129,"9":148,"10":131,"11":125,"12":154,"13":129,"14":133,"15":135,"16":111,"17":144,"18":113,"19":141}}
- set 1: the late blocks' m: min 1, median 10, max 19 over 2563 (inside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28585; time to throw 1.727 s
- set 2: exclusive affected plays against B5: 7049 of 28585 (FREE_RUN (a threat on the free-run clock under the arm's reading) 4949, LATE_BLOCK (a late beat or a late tick) 2529, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 268)
- set 2: the step-3 census (reported): {"plays":28585,"s3Plays":28585,"lateByBand":{"LATE_EXCHANGE":1436,"RAN_THROUGH":1221},"lateByKind":{"stunt_communication":1436,"blitz_pickup":1221},"reachedBeat":926,"heldThePlay":1731,"carried":10,"untouchedExchanges":10,"touched":3074,"clockMenByOrigin":{"STUNT_LOOPER":1945,"UNBLOCKED":1027,"PICKUP_LOST":2513},"reading":"B","lateByM":{"1":135,"2":154,"3":147,"4":133,"5":171,"6":139,"7":130,"8":133,"9":147,"10":132,"11":123,"12":132,"13":152,"14":148,"15":142,"16":125,"17":133,"18":150,"19":131}}
- set 2: the late blocks' m: min 1, median 10, max 19 over 2657 (inside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C15 (information, priced for the miss rule's option A), flat (information, priced for the miss rule's option A)

- set 1: dropbacks 51906; time to throw 1.630 s
- set 1: exclusive affected plays against B3: 16918 of 51906 (FREE_RUN (a threat on the free-run clock under the arm's reading) 3628, LATE_BLOCK (a late beat or a late tick) 3018, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 39, BAND_EDGES (a pickup or stunt band the shifted edges moved) 14351)
- set 1: the step-3 census (reported): {"plays":51906,"s3Plays":51906,"lateByBand":{"RAN_THROUGH":1648,"LATE_EXCHANGE":1489},"lateByKind":{"blitz_pickup":1648,"stunt_communication":1489},"reachedBeat":1584,"heldThePlay":1553,"carried":35,"untouchedExchanges":9,"touched":3143,"clockMenByOrigin":{"UNBLOCKED":1870,"PICKUP_LOST":1660,"STUNT_LOOPER":297},"reading":"B","lateByM":{"31":231,"32":243,"33":290,"34":268,"35":271,"36":143,"37":149,"38":157,"39":124,"40":155,"41":136,"42":131,"43":150,"44":123,"45":132,"46":114,"47":105,"48":114,"49":101}}
- set 1: the late blocks' m: min 31, median 37, max 49 over 3137 (outside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 52224; time to throw 1.627 s
- set 2: exclusive affected plays against B3: 17209 of 52224 (FREE_RUN (a threat on the free-run clock under the arm's reading) 3759, LATE_BLOCK (a late beat or a late tick) 3044, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 41, BAND_EDGES (a pickup or stunt band the shifted edges moved) 14554)
- set 2: the step-3 census (reported): {"plays":52224,"s3Plays":52224,"lateByBand":{"LATE_EXCHANGE":1523,"RAN_THROUGH":1646},"lateByKind":{"stunt_communication":1523,"blitz_pickup":1646},"reachedBeat":1572,"heldThePlay":1597,"carried":22,"untouchedExchanges":11,"touched":3175,"clockMenByOrigin":{"STUNT_LOOPER":263,"PICKUP_LOST":1770,"UNBLOCKED":1919},"reading":"B","lateByM":{"31":266,"32":241,"33":261,"34":275,"35":267,"36":140,"37":160,"38":142,"39":150,"40":134,"41":143,"42":129,"43":134,"44":147,"45":139,"46":121,"47":101,"48":111,"49":108}}
- set 2: the late blocks' m: min 31, median 37, max 49 over 3169 (outside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C15 (information, priced for the miss rule's option A), gen (information, priced for the miss rule's option A)

- set 1: dropbacks 28521; time to throw 1.738 s
- set 1: exclusive affected plays against B3: 9166 of 28521 (FREE_RUN (a threat on the free-run clock under the arm's reading) 1944, LATE_BLOCK (a late beat or a late tick) 1509, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 13, BAND_EDGES (a pickup or stunt band the shifted edges moved) 7800)
- set 1: the step-3 census (reported): {"plays":28521,"s3Plays":28521,"lateByBand":{"RAN_THROUGH":846,"LATE_EXCHANGE":731},"lateByKind":{"blitz_pickup":846,"stunt_communication":731},"reachedBeat":871,"heldThePlay":706,"carried":5,"untouchedExchanges":4,"touched":1577,"clockMenByOrigin":{"UNBLOCKED":977,"PICKUP_LOST":935,"STUNT_LOOPER":136},"reading":"B","lateByM":{"31":141,"32":125,"33":128,"34":116,"35":105,"36":92,"37":82,"38":79,"39":82,"40":84,"41":72,"42":61,"43":67,"44":77,"45":72,"46":49,"47":48,"48":48,"49":49}}
- set 1: the late blocks' m: min 31, median 37, max 49 over 1577 (outside AM-2's design range of 1 to 19)
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28294; time to throw 1.778 s
- set 2: exclusive affected plays against B3: 9302 of 28294 (FREE_RUN (a threat on the free-run clock under the arm's reading) 2019, LATE_BLOCK (a late beat or a late tick) 1710, CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 16, BAND_EDGES (a pickup or stunt band the shifted edges moved) 7928)
- set 2: the step-3 census (reported): {"plays":28294,"s3Plays":28294,"lateByBand":{"LATE_EXCHANGE":825,"RAN_THROUGH":954},"lateByKind":{"stunt_communication":825,"blitz_pickup":954},"reachedBeat":1013,"heldThePlay":766,"carried":17,"untouchedExchanges":7,"touched":1785,"clockMenByOrigin":{"UNBLOCKED":1033,"PICKUP_LOST":922,"STUNT_LOOPER":151},"reading":"B","lateByM":{"31":167,"32":140,"33":130,"34":143,"35":113,"36":101,"37":128,"38":94,"39":74,"40":74,"41":86,"42":64,"43":80,"44":80,"45":63,"46":68,"47":59,"48":59,"49":56}}
- set 2: the late blocks' m: min 31, median 37, max 49 over 1779 (outside AM-2's design range of 1 to 19)
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C16 (information, the climb lane alone), flat (information, the climb lane alone)

- set 1: dropbacks 50892; time to throw 1.586 s
- set 1: exclusive affected plays against B3: 740 of 50892 (CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 740)
- set 1: the step-3 census (reported): {"plays":50892,"s3Plays":50892,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":21,"touched":5251,"clockMenByOrigin":{"PICKUP_LOST":4457,"UNBLOCKED":1824,"STUNT_LOOPER":3495},"reading":"D19","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 50907; time to throw 1.582 s
- set 2: exclusive affected plays against B3: 710 of 50907 (CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 710)
- set 2: the step-3 census (reported): {"plays":50907,"s3Plays":50907,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":21,"touched":5294,"clockMenByOrigin":{"STUNT_LOOPER":3483,"PICKUP_LOST":4568,"UNBLOCKED":1806},"reading":"D19","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

### C16 (information, the climb lane alone), gen (information, the climb lane alone)

- set 1: dropbacks 28055; time to throw 1.673 s
- set 1: exclusive affected plays against B3: 287 of 28055 (CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 287)
- set 1: the step-3 census (reported): {"plays":28055,"s3Plays":28055,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":13,"touched":2911,"clockMenByOrigin":{"PICKUP_LOST":2355,"UNBLOCKED":939,"STUNT_LOOPER":1832},"reading":"D19","lateByM":{}}
- set 1: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean
- set 2: dropbacks 28045; time to throw 1.713 s
- set 2: exclusive affected plays against B3: 303 of 28045 (CLIMB_FRONT (a step-up whose climb lane the two rules read differently) 303)
- set 2: the step-3 census (reported): {"plays":28045,"s3Plays":28045,"lateByBand":{},"lateByKind":{},"reachedBeat":0,"heldThePlay":0,"carried":0,"untouchedExchanges":5,"touched":2961,"clockMenByOrigin":{"STUNT_LOOPER":1954,"PICKUP_LOST":2443,"UNBLOCKED":1027},"reading":"D19","lateByM":{}}
- set 2: step-1 stream checks 0 failing; step-2 folds clean; step-3 folds clean

## The step reports, one per base group and seed set

### A0 (today's game, re-played; the cumulative line's design base) alone, seed set 1

```text
ADR-089 step 3: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A0 (today's game, re-played; the cumulative line's design base) (the base arm): release clock the decision tick ==
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
```

### A14 (today's clock with the hold, re-played; the cumulative line's pricing base) alone, seed set 1

```text
ADR-089 step 3: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A14 (today's clock with the hold, re-played; the cumulative line's pricing base) (the base arm): release clock the decision tick ==
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
```

### A1 (step 1's design, re-played; the accepted state's design base) alone, seed set 1

```text
ADR-089 step 3: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A1 (step 1's design, re-played; the accepted state's design base) (the base arm): release clock the decision tick ==
  time to throw: flat 1.589 s | gen 1.666 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1383 of 51165 dropbacks (2.70 per 100); pressuredSacks 1383; pressured dropbacks 16276 (31.81 per 100) [time to throw 1.589 s]
    gen: sacks 793 of 28361 dropbacks (2.80 per 100); pressuredSacks 793; pressured dropbacks 9372 (33.05 per 100) [time to throw 1.666 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.50% | -13.52 against 22.02% (PR #33, FTN only (held)) | -6.96 against 15.46% (main) [time to throw 1.589 s]
    gen: 8.46% | -13.56 against 22.02% (PR #33, FTN only (held)) | -7.00 against 15.46% (main) [time to throw 1.666 s]
  rows (66, both leagues):
  threat_creation_rate: flat 31.81 % | gen 33.05 %
  hit_or_sack_rate: flat 3.29 % [time to throw 1.589 s] | gen 3.89 % [time to throw 1.666 s]
  sack_rate: flat 2.70 % [time to throw 1.589 s] | gen 2.80 % [time to throw 1.666 s]
  time_to_throw: flat 1.589 seconds | gen 1.666 seconds
  sack_share_of_hit_or_sack: flat 82.08 % [time to throw 1.589 s] | gen 71.89 % [time to throw 1.666 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.666 s]
  release_distribution: flat 1.589 seconds | gen 1.666 seconds
  pressured_share_by_release_bin: flat 19.82 % | gen 20.65 %
  hit_rate_by_release_bin: flat 2.21 % [time to throw 1.589 s] | gen 2.78 % [time to throw 1.666 s]
  hits_on_aimed_throws_per_dropback: flat 0.59 % [time to throw 1.589 s] | gen 1.09 % [time to throw 1.666 s]
  first_pressure_seconds: flat 0.803 seconds | gen 0.911 seconds
  first_forcing_seconds: flat 1.122 seconds | gen 1.232 seconds
  first_arrival_seconds: flat 1.601 seconds | gen 1.694 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 1.91%, FREE_RUNNER 79.34%, WON_REP 18.75%; gen COUNTER 2.01%, FREE_RUNNER 75.27%, WON_REP 22.73%)
  quick_pressure_share_by_origin: flat 94.40 % | gen 91.05 %
  clean_with_live_won_rep_ticks: flat 0.03 % | gen 0.01 %
  clean_with_live_won_rep_dropbacks: flat 0.06 % | gen 0.04 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 12.28 % | gen 7.22 %
  throwaway_rate_clean: flat 19.40 % | gen 10.43 %
  scramble_rate: flat 3.93 % | gen 1.97 %
  scramble_yards: flat 6.90 yards | gen 5.51 yards
  by_down_fixed_calls: flat 9.99 % | gen 9.41 %
  int_per_aimed_throw: flat 2.64 % | gen 7.67 %
  completion_per_aimed_throw: flat 45.64 % | gen 42.13 %
  forced_throw_share: flat 20.30 % | gen 23.81 %
  completion_by_pocket_status: flat 30.85 % | gen 30.63 %
  qb_season_spread: flat 0.33 pp | gen 2.96 pp
  defence_season_spread: flat 0.65 pp | gen 0.05 pp
  unblocked_pressures_per_100: flat 19.10 per 100 dropbacks | gen 18.33 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 62.31 % [time to throw 1.589 s] | gen 62.28 % [time to throw 1.666 s]
  unblocked_men_per_100: flat 19.10 per 100 dropbacks | gen 18.33 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.76 % | gen 10.90 %
  quick_share_no_free_runner: flat 72.89 % | gen 63.81 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.80 % | gen 7.29 %
  situation_q1q3_last_two: flat 11.03 % | gen 7.54 %
  sack_share_of_contacts_in_out: flat 82.08 % [time to throw 1.589 s] | gen 71.89 % [time to throw 1.666 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.666 s]
  sacker_mix.split.interior: flat 30.26 % [time to throw 1.589 s] | gen 30.18 % [time to throw 1.666 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 36.73 % [time to throw 1.589 s] | gen 38.51 % [time to throw 1.666 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 32.43 % [time to throw 1.589 s] | gen 30.81 % [time to throw 1.666 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.58 % [time to throw 1.589 s] | gen 0.51 % [time to throw 1.666 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.51 % [time to throw 1.589 s] | gen 30.56 % [time to throw 1.666 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.01 % | gen 0.00 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 2.50 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.04 % | gen 21.51 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.65 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.13 % | gen 17.16 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.45 % | gen 17.04 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.29 % | gen 46.33 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.61 % | gen 19.19 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 44.84 % | gen 39.88 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.97 % | gen 21.36 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.81 % | gen 18.52 %
  nobody_open_share: flat 44.16 % of dropbacks | gen 36.26 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.97 % of dropbacks | gen 13.43 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.36 % of dropbacks | gen 10.67 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.13 % of dropbacks | gen 9.37 % of dropbacks
  nobody_open_share.split.SACK: flat 2.70 % of dropbacks [time to throw 1.589 s] | gen 2.80 % of dropbacks [time to throw 1.666 s]
  clean_checkdown_share: flat 20.37 % of clean aimed throws | gen 9.37 % of clean aimed throws
  clean_later_read_share: flat 15.91 % of clean aimed throws | gen 22.97 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.15, per aimed throw 2.64; forced-throw share 20.30; completion per attempt 37.27, per aimed throw 45.64; INT-source mix CONTESTED_CATCH 90.76, TIPPED_RECOVERY 9.24
      flat PROGRESSION: 19956 aimed, INT 0.30, completion 44.29
      flat RANK_PUSHED: 6445 aimed, INT 12.04, completion 17.61
      flat CHECKDOWN: 9194 aimed, INT 0.17, completion 44.84
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3253 aimed, INT 5.13, completion 27.97
      flat ON_THE_RUN: 155 aimed, INT 6.45, completion 25.81
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.45 against a real 3.25
    gen: INT per attempt 6.91, per aimed throw 7.67; forced-throw share 23.81; completion per attempt 37.98, per aimed throw 42.13; INT-source mix CONTESTED_CATCH 44.67, TIPPED_RECOVERY 55.33
      gen PROGRESSION: 13430 aimed, INT 2.50, completion 46.33
      gen RANK_PUSHED: 3951 aimed, INT 21.51, completion 19.19
      gen CHECKDOWN: 3809 aimed, INT 3.65, completion 39.88
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3025 aimed, INT 17.16, completion 21.36
      gen ON_THE_RUN: 135 aimed, INT 17.04, completion 18.52
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.04 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)
```

### A11 (A1 with the stand-in hold, re-played; the accepted state's pricing base) alone, seed set 1

```text
ADR-089 step 3: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A11 (A1 with the stand-in hold, re-played; the accepted state's pricing base) (the base arm): release clock the decision tick ==
  time to throw: flat 2.739 s | gen 2.695 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2984 of 48297 dropbacks (6.18 per 100); pressuredSacks 2984; pressured dropbacks 21571 (44.66 per 100) [time to throw 2.739 s]
    gen: sacks 2007 of 26578 dropbacks (7.55 per 100); pressuredSacks 1996; pressured dropbacks 11769 (44.28 per 100) [time to throw 2.695 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 13.83% | -8.19 against 22.02% (PR #33, FTN only (held)) | -1.63 against 15.46% (main) [time to throw 2.739 s]
    gen: 16.96% | -5.06 against 22.02% (PR #33, FTN only (held)) | 1.50 against 15.46% (main) [time to throw 2.695 s]
  rows (66, both leagues):
  threat_creation_rate: flat 44.66 % | gen 44.28 %
  hit_or_sack_rate: flat 7.57 % [time to throw 2.739 s] | gen 10.57 % [time to throw 2.695 s]
  sack_rate: flat 6.18 % [time to throw 2.739 s] | gen 7.55 % [time to throw 2.695 s]
  time_to_throw: flat 2.739 seconds | gen 2.695 seconds
  sack_share_of_hit_or_sack: flat 81.66 % [time to throw 2.739 s] | gen 71.47 % [time to throw 2.695 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.739 s] | gen 0.00 % [time to throw 2.695 s]
  release_distribution: flat 2.739 seconds | gen 2.695 seconds
  pressured_share_by_release_bin: flat 45.51 % | gen 48.66 %
  hit_rate_by_release_bin: flat 5.32 % [time to throw 2.739 s] | gen 9.39 % [time to throw 2.695 s]
  hits_on_aimed_throws_per_dropback: flat 1.39 % [time to throw 2.739 s] | gen 3.01 % [time to throw 2.695 s]
  first_pressure_seconds: flat 1.416 seconds | gen 1.451 seconds
  first_forcing_seconds: flat 1.684 seconds | gen 1.714 seconds
  first_arrival_seconds: flat 1.720 seconds | gen 1.780 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.58%, FREE_RUNNER 57.02%, WON_REP 39.39%; gen COUNTER 4.05%, FREE_RUNNER 56.08%, WON_REP 39.87%)
  quick_pressure_share_by_origin: flat 73.40 % | gen 73.17 %
  clean_with_live_won_rep_ticks: flat 0.04 % | gen 0.03 %
  clean_with_live_won_rep_dropbacks: flat 0.16 % | gen 0.10 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 19.16 % | gen 13.24 %
  throwaway_rate_clean: flat 15.17 % | gen 7.21 %
  scramble_rate: flat 8.51 % | gen 4.77 %
  scramble_yards: flat 6.88 yards | gen 5.14 yards
  by_down_fixed_calls: flat 15.31 % | gen 16.12 %
  int_per_aimed_throw: flat 2.86 % | gen 7.25 %
  completion_per_aimed_throw: flat 42.97 % | gen 41.36 %
  forced_throw_share: flat 26.50 % | gen 29.57 %
  completion_by_pocket_status: flat 24.15 % | gen 26.55 %
  qb_season_spread: flat 0.00 pp | gen 3.41 pp
  defence_season_spread: flat 0.00 pp | gen 1.33 pp
  unblocked_pressures_per_100: flat 19.00 per 100 dropbacks | gen 18.26 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 60.02 % [time to throw 2.739 s] | gen 61.79 % [time to throw 2.695 s]
  unblocked_men_per_100: flat 19.00 per 100 dropbacks | gen 18.26 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.88 % | gen 26.82 %
  quick_share_no_free_runner: flat 38.05 % | gen 38.91 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 19.15 % | gen 11.46 %
  situation_q1q3_last_two: flat 18.41 % | gen 12.38 %
  sack_share_of_contacts_in_out: flat 81.59 % [time to throw 2.739 s] | gen 71.45 % [time to throw 2.695 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.739 s] | gen 0.55 % [time to throw 2.695 s]
  sacker_mix.split.interior: flat 30.85 % [time to throw 2.739 s] | gen 32.35 % [time to throw 2.695 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 33.15 % [time to throw 2.739 s] | gen 31.80 % [time to throw 2.695 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 35.44 % [time to throw 2.739 s] | gen 35.59 % [time to throw 2.695 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.56 % [time to throw 2.739 s] | gen 0.26 % [time to throw 2.695 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.13 % [time to throw 2.739 s] | gen 32.57 % [time to throw 2.695 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.06 % | gen 0.10 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 2.06 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.40 % | gen 21.11 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 3.66 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.41 % | gen 16.90 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.56 % | gen 16.00 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.43 % | gen 45.19 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.73 % | gen 18.71 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.53 % | gen 35.51 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 25.39 % | gen 21.21 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.31 % | gen 35.00 %
  nobody_open_share: flat 38.15 % of dropbacks | gen 36.29 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 9.01 % of dropbacks | gen 9.26 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.01 % of dropbacks | gen 9.60 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.95 % of dropbacks | gen 9.88 % of dropbacks
  nobody_open_share.split.SACK: flat 6.18 % of dropbacks [time to throw 2.739 s] | gen 7.55 % of dropbacks [time to throw 2.695 s]
  clean_checkdown_share: flat 5.74 % of clean aimed throws | gen 2.94 % of clean aimed throws
  clean_later_read_share: flat 22.53 % of clean aimed throws | gen 26.86 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.29, per aimed throw 2.86; forced-throw share 26.50; completion per attempt 34.43, per aimed throw 42.97; INT-source mix CONTESTED_CATCH 90.48, TIPPED_RECOVERY 9.52
      flat PROGRESSION: 19594 aimed, INT 0.29, completion 42.43
      flat RANK_PUSHED: 6024 aimed, INT 11.40, completion 17.73
      flat CHECKDOWN: 4350 aimed, INT 0.18, completion 38.53
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2903 aimed, INT 6.41, completion 25.39
      flat ON_THE_RUN: 144 aimed, INT 5.56, completion 24.31
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.56 against a real 3.25
    gen: INT per attempt 6.43, per aimed throw 7.25; forced-throw share 29.57; completion per attempt 36.70, per aimed throw 41.36; INT-source mix CONTESTED_CATCH 46.50, TIPPED_RECOVERY 53.50
      gen PROGRESSION: 12197 aimed, INT 2.06, completion 45.19
      gen RANK_PUSHED: 3368 aimed, INT 21.11, completion 18.71
      gen CHECKDOWN: 2461 aimed, INT 3.66, completion 35.51
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2551 aimed, INT 16.90, completion 21.21
      gen ON_THE_RUN: 100 aimed, INT 16.00, completion 35.00
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.00 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)
```

### B3 (pocket-1.s2, step 2's design, re-played) with C1, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C15, C16, seed set 1

```text
ADR-089 step 3: the pocket report (15 arms; both leagues; every hit and sack figure with its time to throw beside it)

== B3 (pocket-1.s2, step 2's design, re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 1.592 s | gen 1.682 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1595 of 51303 dropbacks (3.11 per 100); pressuredSacks 1595; pressured dropbacks 14260 (27.80 per 100) [time to throw 1.592 s]
    gen: sacks 850 of 28198 dropbacks (3.01 per 100); pressuredSacks 850; pressured dropbacks 8101 (28.73 per 100) [time to throw 1.682 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.19% | -10.83 against 22.02% (PR #33, FTN only (held)) | -4.27 against 15.46% (main) [time to throw 1.592 s]
    gen: 10.49% | -11.53 against 22.02% (PR #33, FTN only (held)) | -4.97 against 15.46% (main) [time to throw 1.682 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.80 % | gen 28.73 %
  hit_or_sack_rate: flat 3.94 % [time to throw 1.592 s] | gen 4.38 % [time to throw 1.682 s]
  sack_rate: flat 3.11 % [time to throw 1.592 s] | gen 3.01 % [time to throw 1.682 s]
  time_to_throw: flat 1.592 seconds | gen 1.682 seconds
  sack_share_of_hit_or_sack: flat 79.00 % [time to throw 1.592 s] | gen 68.77 % [time to throw 1.682 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.592 s] | gen 0.00 % [time to throw 1.682 s]
  release_distribution: flat 1.592 seconds | gen 1.682 seconds
  pressured_share_by_release_bin: flat 20.69 % | gen 22.67 %
  hit_rate_by_release_bin: flat 3.02 % [time to throw 1.592 s] | gen 3.42 % [time to throw 1.682 s]
  hits_on_aimed_throws_per_dropback: flat 0.83 % [time to throw 1.592 s] | gen 1.37 % [time to throw 1.682 s]
  first_pressure_seconds: flat 1.117 seconds | gen 1.225 seconds
  first_forcing_seconds: flat 1.499 seconds | gen 1.606 seconds
  first_arrival_seconds: flat 1.707 seconds | gen 1.756 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.28%, FREE_RUNNER 78.00%, WON_REP 19.72%; gen COUNTER 2.35%, FREE_RUNNER 73.53%, WON_REP 24.12%)
  quick_pressure_share_by_origin: flat 94.24 % | gen 90.16 %
  clean_with_live_won_rep_ticks: flat 0.45 % | gen 0.48 %
  clean_with_live_won_rep_dropbacks: flat 1.19 % | gen 1.35 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.06 % | gen 8.37 %
  throwaway_rate_clean: flat 18.42 % | gen 10.01 %
  scramble_rate: flat 2.64 % | gen 0.99 %
  scramble_yards: flat 6.91 yards | gen 6.00 yards
  by_down_fixed_calls: flat 11.24 % | gen 12.32 %
  int_per_aimed_throw: flat 2.83 % | gen 7.30 %
  completion_per_aimed_throw: flat 46.23 % | gen 43.00 %
  forced_throw_share: flat 15.31 % | gen 19.26 %
  completion_by_pocket_status: flat 30.67 % | gen 29.97 %
  qb_season_spread: flat 0.60 pp | gen 2.77 pp
  defence_season_spread: flat 0.00 pp | gen 1.60 pp
  unblocked_pressures_per_100: flat 17.53 per 100 dropbacks | gen 16.99 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 66.42 % [time to throw 1.592 s] | gen 65.05 % [time to throw 1.682 s]
  unblocked_men_per_100: flat 19.12 per 100 dropbacks | gen 18.33 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.18 % | gen 9.36 %
  quick_share_no_free_runner: flat 72.64 % | gen 61.70 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.06 % | gen 7.33 %
  situation_q1q3_last_two: flat 12.18 % | gen 8.75 %
  sack_share_of_contacts_in_out: flat 79.00 % [time to throw 1.592 s] | gen 68.77 % [time to throw 1.682 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.592 s] | gen 0.00 % [time to throw 1.682 s]
  sacker_mix.split.interior: flat 24.58 % [time to throw 1.592 s] | gen 26.41 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.58 % [time to throw 1.592 s] | gen 44.41 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 28.15 % [time to throw 1.592 s] | gen 28.76 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.69 % [time to throw 1.592 s] | gen 0.41 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 24.89 % [time to throw 1.592 s] | gen 26.59 % [time to throw 1.682 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.02 % | gen 1.58 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.71 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.70 % | gen 19.74 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 3.21 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.36 % | gen 16.61 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.44 % | gen 20.00 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.08 % | gen 46.52 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.43 % | gen 19.62 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.28 % | gen 41.36 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.41 % | gen 22.55 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.85 % | gen 21.43 %
  nobody_open_share: flat 44.30 % of dropbacks | gen 35.36 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.57 % of dropbacks | gen 12.59 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.70 % of dropbacks | gen 10.22 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.93 % of dropbacks | gen 9.54 % of dropbacks
  nobody_open_share.split.SACK: flat 3.11 % of dropbacks [time to throw 1.592 s] | gen 3.01 % of dropbacks [time to throw 1.682 s]
  clean_checkdown_share: flat 19.48 % of clean aimed throws | gen 9.12 % of clean aimed throws
  clean_later_read_share: flat 15.62 % of clean aimed throws | gen 22.10 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.32, per aimed throw 2.83; forced-throw share 15.31; completion per attempt 37.93, per aimed throw 46.23; INT-source mix CONTESTED_CATCH 90.46, TIPPED_RECOVERY 9.54
      flat PROGRESSION: 20461 aimed, INT 0.35, completion 45.08
      flat RANK_PUSHED: 6616 aimed, INT 12.70, completion 18.43
      flat CHECKDOWN: 9012 aimed, INT 0.21, completion 45.28
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3435 aimed, INT 5.36, completion 28.41
      flat ON_THE_RUN: 147 aimed, INT 5.44, completion 25.85
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.44 against a real 3.25
    gen: INT per attempt 6.58, per aimed throw 7.30; forced-throw share 19.26; completion per attempt 38.73, per aimed throw 43.00; INT-source mix CONTESTED_CATCH 43.48, TIPPED_RECOVERY 56.52
      gen PROGRESSION: 13835 aimed, INT 2.71, completion 46.52
      gen RANK_PUSHED: 4042 aimed, INT 19.74, completion 19.62
      gen CHECKDOWN: 3549 aimed, INT 3.21, completion 41.36
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2883 aimed, INT 16.61, completion 22.55
      gen ON_THE_RUN: 70 aimed, INT 20.00, completion 21.43
      gen on the run: clean INT n/a against a real 2.11; pressured INT 20.00 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== C1 (design): release clock the decision tick ==
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
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.81, rise -0.02 against an allowed 0.01: PASSES
    flat PROGRESSION: base 0.35 -> arm 0.33, rise -0.01 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 12.70 -> arm 12.37, rise -0.33 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.19, rise -0.02 against an allowed 0.01: PASSES
    flat DESPERATION: base 5.36 -> arm 5.16, rise -0.20 against an allowed 0.03: PASSES
    flat ON_THE_RUN: base 5.44 -> arm 6.28, rise 0.84 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.50, rise 0.19 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.47, rise -0.24 against an allowed 0.01: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 21.12, rise 1.38 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 2.84, rise -0.37 against an allowed 0.05: PASSES
    gen DESPERATION: base 16.61 -> arm 17.89, rise 1.28 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 15.93, rise -4.07 against an allowed 0.12: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 12986 | gen 7015

== C3 (information, the snap spot alone (AM-2's references hold the others)): release clock the decision tick ==
  time to throw: flat 1.601 s | gen 1.692 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1471 of 51289 dropbacks (2.87 per 100); pressuredSacks 1471; pressured dropbacks 13529 (26.38 per 100) [time to throw 1.601 s]
    gen: sacks 711 of 28421 dropbacks (2.50 per 100); pressuredSacks 711; pressured dropbacks 7746 (27.25 per 100) [time to throw 1.692 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.87% | -11.15 against 22.02% (PR #33, FTN only (held)) | -4.59 against 15.46% (main) [time to throw 1.601 s]
    gen: 9.18% | -12.84 against 22.02% (PR #33, FTN only (held)) | -6.28 against 15.46% (main) [time to throw 1.692 s]
  rows (66, both leagues):
  threat_creation_rate: flat 26.38 % | gen 27.25 %
  hit_or_sack_rate: flat 3.78 % [time to throw 1.601 s] | gen 3.80 % [time to throw 1.692 s]
  sack_rate: flat 2.87 % [time to throw 1.601 s] | gen 2.50 % [time to throw 1.692 s]
  time_to_throw: flat 1.601 seconds | gen 1.692 seconds
  sack_share_of_hit_or_sack: flat 75.82 % [time to throw 1.601 s] | gen 65.89 % [time to throw 1.692 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.601 s] | gen 0.00 % [time to throw 1.692 s]
  release_distribution: flat 1.601 seconds | gen 1.692 seconds
  pressured_share_by_release_bin: flat 21.48 % | gen 23.79 %
  hit_rate_by_release_bin: flat 4.92 % [time to throw 1.601 s] | gen 4.93 % [time to throw 1.692 s]
  hits_on_aimed_throws_per_dropback: flat 0.91 % [time to throw 1.601 s] | gen 1.29 % [time to throw 1.692 s]
  first_pressure_seconds: flat 1.289 seconds | gen 1.387 seconds
  first_forcing_seconds: flat 1.687 seconds | gen 1.763 seconds
  first_arrival_seconds: flat 1.898 seconds | gen 1.952 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.43%, FREE_RUNNER 76.36%, WON_REP 21.21%; gen COUNTER 2.72%, FREE_RUNNER 72.28%, WON_REP 25.01%)
  quick_pressure_share_by_origin: flat 93.78 % | gen 89.94 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.48 %
  clean_with_live_won_rep_dropbacks: flat 1.16 % | gen 1.37 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.85 % | gen 8.46 %
  throwaway_rate_clean: flat 17.74 % | gen 9.77 %
  scramble_rate: flat 2.28 % | gen 0.84 %
  scramble_yards: flat 6.73 yards | gen 4.78 yards
  by_down_fixed_calls: flat 10.97 % | gen 9.73 %
  int_per_aimed_throw: flat 2.80 % | gen 7.50 %
  completion_per_aimed_throw: flat 46.72 % | gen 42.80 %
  forced_throw_share: flat 12.67 % | gen 17.79 %
  completion_by_pocket_status: flat 30.34 % | gen 29.34 %
  qb_season_spread: flat 0.00 pp | gen 2.50 pp
  defence_season_spread: flat 0.00 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 15.96 per 100 dropbacks | gen 15.22 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 60.88 % [time to throw 1.601 s] | gen 57.92 % [time to throw 1.692 s]
  unblocked_men_per_100: flat 18.98 per 100 dropbacks | gen 18.24 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.83 % | gen 9.56 %
  quick_share_no_free_runner: flat 72.11 % | gen 62.42 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.23 % | gen 6.61 %
  situation_q1q3_last_two: flat 13.49 % | gen 8.03 %
  sack_share_of_contacts_in_out: flat 75.82 % [time to throw 1.601 s] | gen 65.89 % [time to throw 1.692 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.601 s] | gen 0.00 % [time to throw 1.692 s]
  sacker_mix.split.interior: flat 31.80 % [time to throw 1.601 s] | gen 33.86 % [time to throw 1.692 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.34 % [time to throw 1.601 s] | gen 42.52 % [time to throw 1.692 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.59 % [time to throw 1.601 s] | gen 23.05 % [time to throw 1.692 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.27 % [time to throw 1.601 s] | gen 0.56 % [time to throw 1.692 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.61 % [time to throw 1.601 s] | gen 33.90 % [time to throw 1.692 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.21 % | gen 1.48 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.56 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.16 % | gen 21.00 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.22 % | gen 3.22 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.43 % | gen 17.45 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.66 % | gen 12.24 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.75 % | gen 46.82 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.50 % | gen 19.51 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.12 % | gen 40.58 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.24 % | gen 21.12 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.42 % | gen 22.45 %
  nobody_open_share: flat 43.87 % of dropbacks | gen 34.62 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.63 % of dropbacks | gen 12.46 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.65 % of dropbacks | gen 10.25 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.72 % of dropbacks | gen 9.41 % of dropbacks
  nobody_open_share.split.SACK: flat 2.87 % of dropbacks [time to throw 1.601 s] | gen 2.50 % of dropbacks [time to throw 1.692 s]
  clean_checkdown_share: flat 19.30 % of clean aimed throws | gen 9.25 % of clean aimed throws
  clean_later_read_share: flat 15.13 % of clean aimed throws | gen 21.44 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.31, per aimed throw 2.80; forced-throw share 12.67; completion per attempt 38.49, per aimed throw 46.72; INT-source mix CONTESTED_CATCH 89.66, TIPPED_RECOVERY 10.34
      flat PROGRESSION: 20607 aimed, INT 0.36, completion 45.75
      flat RANK_PUSHED: 6793 aimed, INT 12.16, completion 18.50
      flat CHECKDOWN: 9044 aimed, INT 0.22, completion 46.12
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3410 aimed, INT 5.43, completion 28.24
      flat ON_THE_RUN: 222 aimed, INT 7.66, completion 23.42
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.66 against a real 3.25
    gen: INT per attempt 6.77, per aimed throw 7.50; forced-throw share 17.79; completion per attempt 38.63, per aimed throw 42.80; INT-source mix CONTESTED_CATCH 42.80, TIPPED_RECOVERY 57.20
      gen PROGRESSION: 14130 aimed, INT 2.56, completion 46.82
      gen RANK_PUSHED: 4115 aimed, INT 21.00, completion 19.51
      gen CHECKDOWN: 3541 aimed, INT 3.22, completion 40.58
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2912 aimed, INT 17.45, completion 21.12
      gen ON_THE_RUN: 98 aimed, INT 12.24, completion 22.45
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.24 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.80, rise -0.03 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.35 -> arm 0.36, rise 0.01 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat RANK_PUSHED: base 12.70 -> arm 12.16, rise -0.54 against an allowed -0.01: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.22, rise 0.01 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 5.36 -> arm 5.43, rise 0.07 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 5.44 -> arm 7.66, rise 2.22 against an allowed -0.04: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.50, rise 0.20 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.56, rise -0.15 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 21.00, rise 1.25 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 3.22, rise 0.01 against an allowed 0.01: PASSES
    gen DESPERATION: base 16.61 -> arm 17.45, rise 0.83 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 12.24, rise -7.76 against an allowed 0.12: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 8778 | gen 4664

== C4 (information, Speed and Acceleration alone (AM-2's references hold the others)): release clock the decision tick ==
  time to throw: flat 1.602 s | gen 1.687 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1459 of 51311 dropbacks (2.84 per 100); pressuredSacks 1459; pressured dropbacks 13430 (26.17 per 100) [time to throw 1.602 s]
    gen: sacks 694 of 28065 dropbacks (2.47 per 100); pressuredSacks 694; pressured dropbacks 7672 (27.34 per 100) [time to throw 1.687 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.86% | -11.16 against 22.02% (PR #33, FTN only (held)) | -4.60 against 15.46% (main) [time to throw 1.602 s]
    gen: 9.05% | -12.97 against 22.02% (PR #33, FTN only (held)) | -6.41 against 15.46% (main) [time to throw 1.687 s]
  rows (66, both leagues):
  threat_creation_rate: flat 26.17 % | gen 27.34 %
  hit_or_sack_rate: flat 3.78 % [time to throw 1.602 s] | gen 3.64 % [time to throw 1.687 s]
  sack_rate: flat 2.84 % [time to throw 1.602 s] | gen 2.47 % [time to throw 1.687 s]
  time_to_throw: flat 1.602 seconds | gen 1.687 seconds
  sack_share_of_hit_or_sack: flat 75.32 % [time to throw 1.602 s] | gen 67.91 % [time to throw 1.687 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.602 s] | gen 0.00 % [time to throw 1.687 s]
  release_distribution: flat 1.602 seconds | gen 1.687 seconds
  pressured_share_by_release_bin: flat 21.67 % | gen 23.33 %
  hit_rate_by_release_bin: flat 5.17 % [time to throw 1.602 s] | gen 4.35 % [time to throw 1.687 s]
  hits_on_aimed_throws_per_dropback: flat 0.93 % [time to throw 1.602 s] | gen 1.17 % [time to throw 1.687 s]
  first_pressure_seconds: flat 1.305 seconds | gen 1.370 seconds
  first_forcing_seconds: flat 1.707 seconds | gen 1.748 seconds
  first_arrival_seconds: flat 1.913 seconds | gen 1.940 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.42%, FREE_RUNNER 76.07%, WON_REP 21.51%; gen COUNTER 2.50%, FREE_RUNNER 72.46%, WON_REP 25.04%)
  quick_pressure_share_by_origin: flat 93.72 % | gen 89.78 %
  clean_with_live_won_rep_ticks: flat 0.44 % | gen 0.46 %
  clean_with_live_won_rep_dropbacks: flat 1.18 % | gen 1.33 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 14.20 % | gen 8.46 %
  throwaway_rate_clean: flat 17.87 % | gen 9.65 %
  scramble_rate: flat 2.15 % | gen 0.94 %
  scramble_yards: flat 6.65 yards | gen 4.42 yards
  by_down_fixed_calls: flat 11.50 % | gen 9.73 %
  int_per_aimed_throw: flat 2.80 % | gen 7.44 %
  completion_per_aimed_throw: flat 46.87 % | gen 42.96 %
  forced_throw_share: flat 12.68 % | gen 17.95 %
  completion_by_pocket_status: flat 30.06 % | gen 29.06 %
  qb_season_spread: flat 0.00 pp | gen 3.06 pp
  defence_season_spread: flat 0.00 pp | gen 1.38 pp
  unblocked_pressures_per_100: flat 15.72 per 100 dropbacks | gen 15.54 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 62.31 % [time to throw 1.602 s] | gen 58.41 % [time to throw 1.687 s]
  unblocked_men_per_100: flat 18.80 per 100 dropbacks | gen 18.49 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.90 % | gen 9.29 %
  quick_share_no_free_runner: flat 72.24 % | gen 61.53 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.49 % | gen 7.31 %
  situation_q1q3_last_two: flat 13.44 % | gen 7.55 %
  sack_share_of_contacts_in_out: flat 75.32 % [time to throw 1.602 s] | gen 67.91 % [time to throw 1.687 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.602 s] | gen 0.00 % [time to throw 1.687 s]
  sacker_mix.split.interior: flat 30.64 % [time to throw 1.602 s] | gen 33.51 % [time to throw 1.687 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.36 % [time to throw 1.602 s] | gen 42.84 % [time to throw 1.687 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 25.58 % [time to throw 1.602 s] | gen 23.21 % [time to throw 1.687 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.41 % [time to throw 1.602 s] | gen 0.43 % [time to throw 1.687 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.50 % [time to throw 1.602 s] | gen 33.14 % [time to throw 1.687 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.26 % | gen 1.44 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.56 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.02 % | gen 20.26 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.25 % | gen 3.42 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.55 % | gen 17.69 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.57 % | gen 13.76 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.73 % | gen 47.04 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.47 % | gen 19.86 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.54 % | gen 40.47 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.36 % | gen 20.92 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.44 % | gen 24.77 %
  nobody_open_share: flat 43.98 % of dropbacks | gen 34.56 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.62 % of dropbacks | gen 12.50 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.60 % of dropbacks | gen 10.25 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.91 % of dropbacks | gen 9.32 % of dropbacks
  nobody_open_share.split.SACK: flat 2.84 % of dropbacks [time to throw 1.602 s] | gen 2.47 % of dropbacks [time to throw 1.687 s]
  clean_checkdown_share: flat 19.23 % of clean aimed throws | gen 9.14 % of clean aimed throws
  clean_later_read_share: flat 15.15 % of clean aimed throws | gen 22.03 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.30, per aimed throw 2.80; forced-throw share 12.68; completion per attempt 38.53, per aimed throw 46.87; INT-source mix CONTESTED_CATCH 89.56, TIPPED_RECOVERY 10.44
      flat PROGRESSION: 20626 aimed, INT 0.35, completion 45.73
      flat RANK_PUSHED: 6807 aimed, INT 12.02, completion 18.47
      flat CHECKDOWN: 9041 aimed, INT 0.25, completion 46.54
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3388 aimed, INT 5.55, completion 28.36
      flat ON_THE_RUN: 209 aimed, INT 9.57, completion 23.44
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.57 against a real 3.25
    gen: INT per attempt 6.73, per aimed throw 7.44; forced-throw share 17.95; completion per attempt 38.82, per aimed throw 42.96; INT-source mix CONTESTED_CATCH 42.73, TIPPED_RECOVERY 57.27
      gen PROGRESSION: 13936 aimed, INT 2.56, completion 47.04
      gen RANK_PUSHED: 4058 aimed, INT 20.26, completion 19.86
      gen CHECKDOWN: 3509 aimed, INT 3.42, completion 40.47
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2878 aimed, INT 17.69, completion 20.92
      gen ON_THE_RUN: 109 aimed, INT 13.76, completion 24.77
      gen on the run: clean INT n/a against a real 2.11; pressured INT 13.76 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.80, rise -0.03 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.35 -> arm 0.35, rise 0.00 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat RANK_PUSHED: base 12.70 -> arm 12.02, rise -0.68 against an allowed -0.01: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.25, rise 0.04 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 5.36 -> arm 5.55, rise 0.19 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 5.44 -> arm 9.57, rise 4.13 against an allowed -0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.44, rise 0.14 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.56, rise -0.15 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.26, rise 0.51 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 3.42, rise 0.21 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 16.61 -> arm 17.69, rise 1.07 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 13.76, rise -6.24 against an allowed 0.11: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 8701 | gen 4668

== C5 (information, the drop alone (AM-2's references hold the others)): release clock the decision tick ==
  time to throw: flat 1.602 s | gen 1.693 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1453 of 51314 dropbacks (2.83 per 100); pressuredSacks 1453; pressured dropbacks 13445 (26.20 per 100) [time to throw 1.602 s]
    gen: sacks 693 of 28263 dropbacks (2.45 per 100); pressuredSacks 693; pressured dropbacks 7681 (27.18 per 100) [time to throw 1.693 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.81% | -11.21 against 22.02% (PR #33, FTN only (held)) | -4.65 against 15.46% (main) [time to throw 1.602 s]
    gen: 9.02% | -13.00 against 22.02% (PR #33, FTN only (held)) | -6.44 against 15.46% (main) [time to throw 1.693 s]
  rows (66, both leagues):
  threat_creation_rate: flat 26.20 % | gen 27.18 %
  hit_or_sack_rate: flat 3.75 % [time to throw 1.602 s] | gen 3.71 % [time to throw 1.693 s]
  sack_rate: flat 2.83 % [time to throw 1.602 s] | gen 2.45 % [time to throw 1.693 s]
  time_to_throw: flat 1.602 seconds | gen 1.693 seconds
  sack_share_of_hit_or_sack: flat 75.52 % [time to throw 1.602 s] | gen 66.06 % [time to throw 1.693 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.602 s] | gen 0.00 % [time to throw 1.693 s]
  release_distribution: flat 1.602 seconds | gen 1.693 seconds
  pressured_share_by_release_bin: flat 21.63 % | gen 23.76 %
  hit_rate_by_release_bin: flat 5.12 % [time to throw 1.602 s] | gen 4.89 % [time to throw 1.693 s]
  hits_on_aimed_throws_per_dropback: flat 0.92 % [time to throw 1.602 s] | gen 1.26 % [time to throw 1.693 s]
  first_pressure_seconds: flat 1.306 seconds | gen 1.406 seconds
  first_forcing_seconds: flat 1.707 seconds | gen 1.785 seconds
  first_arrival_seconds: flat 1.914 seconds | gen 1.980 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.42%, FREE_RUNNER 76.05%, WON_REP 21.53%; gen COUNTER 2.58%, FREE_RUNNER 72.15%, WON_REP 25.26%)
  quick_pressure_share_by_origin: flat 93.72 % | gen 89.74 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.49 %
  clean_with_live_won_rep_dropbacks: flat 1.18 % | gen 1.40 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 14.18 % | gen 8.54 %
  throwaway_rate_clean: flat 17.83 % | gen 9.49 %
  scramble_rate: flat 2.20 % | gen 0.84 %
  scramble_yards: flat 6.53 yards | gen 4.67 yards
  by_down_fixed_calls: flat 11.21 % | gen 10.57 %
  int_per_aimed_throw: flat 2.79 % | gen 7.40 %
  completion_per_aimed_throw: flat 46.89 % | gen 42.85 %
  forced_throw_share: flat 12.70 % | gen 17.67 %
  completion_by_pocket_status: flat 30.17 % | gen 29.32 %
  qb_season_spread: flat 0.00 pp | gen 2.38 pp
  defence_season_spread: flat 0.00 pp | gen 0.85 pp
  unblocked_pressures_per_100: flat 15.73 per 100 dropbacks | gen 15.22 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 61.28 % [time to throw 1.602 s] | gen 57.67 % [time to throw 1.693 s]
  unblocked_men_per_100: flat 18.83 per 100 dropbacks | gen 18.37 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.94 % | gen 9.47 %
  quick_share_no_free_runner: flat 72.27 % | gen 61.73 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.50 % | gen 6.09 %
  situation_q1q3_last_two: flat 13.28 % | gen 8.37 %
  sack_share_of_contacts_in_out: flat 75.52 % [time to throw 1.602 s] | gen 66.06 % [time to throw 1.693 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.602 s] | gen 0.00 % [time to throw 1.693 s]
  sacker_mix.split.interior: flat 30.77 % [time to throw 1.602 s] | gen 34.52 % [time to throw 1.693 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.01 % [time to throw 1.602 s] | gen 41.82 % [time to throw 1.693 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 25.80 % [time to throw 1.602 s] | gen 23.08 % [time to throw 1.693 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.41 % [time to throw 1.602 s] | gen 0.58 % [time to throw 1.693 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.63 % [time to throw 1.602 s] | gen 34.34 % [time to throw 1.693 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.25 % | gen 1.49 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.34 % | gen 2.56 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.08 % | gen 20.50 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.25 % | gen 3.30 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.47 % | gen 17.13 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.72 % | gen 14.66 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.79 % | gen 46.86 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.55 % | gen 19.94 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.42 % | gen 40.68 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.40 % | gen 21.29 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.61 % | gen 23.28 %
  nobody_open_share: flat 43.94 % of dropbacks | gen 34.59 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.68 % of dropbacks | gen 12.45 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.55 % of dropbacks | gen 10.45 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.87 % of dropbacks | gen 9.23 % of dropbacks
  nobody_open_share.split.SACK: flat 2.83 % of dropbacks [time to throw 1.602 s] | gen 2.45 % of dropbacks [time to throw 1.693 s]
  clean_checkdown_share: flat 19.27 % of clean aimed throws | gen 9.09 % of clean aimed throws
  clean_later_read_share: flat 15.10 % of clean aimed throws | gen 21.79 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.30, per aimed throw 2.79; forced-throw share 12.70; completion per attempt 38.56, per aimed throw 46.89; INT-source mix CONTESTED_CATCH 89.73, TIPPED_RECOVERY 10.27
      flat PROGRESSION: 20629 aimed, INT 0.34, completion 45.79
      flat RANK_PUSHED: 6794 aimed, INT 12.08, completion 18.55
      flat CHECKDOWN: 9071 aimed, INT 0.25, completion 46.42
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3363 aimed, INT 5.47, completion 28.40
      flat ON_THE_RUN: 216 aimed, INT 9.72, completion 23.61
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.72 against a real 3.25
    gen: INT per attempt 6.70, per aimed throw 7.40; forced-throw share 17.67; completion per attempt 38.76, per aimed throw 42.85; INT-source mix CONTESTED_CATCH 41.97, TIPPED_RECOVERY 58.03
      gen PROGRESSION: 14081 aimed, INT 2.56, completion 46.86
      gen RANK_PUSHED: 4053 aimed, INT 20.50, completion 19.94
      gen CHECKDOWN: 3518 aimed, INT 3.30, completion 40.68
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2954 aimed, INT 17.13, completion 21.29
      gen ON_THE_RUN: 116 aimed, INT 14.66, completion 23.28
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.66 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.79, rise -0.03 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.35 -> arm 0.34, rise -0.00 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat RANK_PUSHED: base 12.70 -> arm 12.08, rise -0.61 against an allowed -0.01: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.25, rise 0.04 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 5.36 -> arm 5.47, rise 0.11 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 5.44 -> arm 9.72, rise 4.28 against an allowed -0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.40, rise 0.10 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.56, rise -0.15 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.50, rise 0.76 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 3.30, rise 0.09 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 16.61 -> arm 17.13, rise 0.51 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 14.66, rise -5.34 against an allowed 0.11: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 8710 | gen 4666

== C6 (information, the other of the two snap pictures (AM-2's Mug rule)): release clock the decision tick ==
  time to throw: flat 1.607 s | gen 1.703 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1299 of 51380 dropbacks (2.53 per 100); pressuredSacks 1299; pressured dropbacks 11262 (21.92 per 100) [time to throw 1.607 s]
    gen: sacks 636 of 28430 dropbacks (2.24 per 100); pressuredSacks 636; pressured dropbacks 6622 (23.29 per 100) [time to throw 1.703 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.53% | -10.49 against 22.02% (PR #33, FTN only (held)) | -3.93 against 15.46% (main) [time to throw 1.607 s]
    gen: 9.60% | -12.42 against 22.02% (PR #33, FTN only (held)) | -5.86 against 15.46% (main) [time to throw 1.703 s]
  rows (66, both leagues):
  threat_creation_rate: flat 21.92 % | gen 23.29 %
  hit_or_sack_rate: flat 3.31 % [time to throw 1.607 s] | gen 3.47 % [time to throw 1.703 s]
  sack_rate: flat 2.53 % [time to throw 1.607 s] | gen 2.24 % [time to throw 1.703 s]
  time_to_throw: flat 1.607 seconds | gen 1.703 seconds
  sack_share_of_hit_or_sack: flat 76.37 % [time to throw 1.607 s] | gen 64.44 % [time to throw 1.703 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.607 s] | gen 0.00 % [time to throw 1.703 s]
  release_distribution: flat 1.607 seconds | gen 1.703 seconds
  pressured_share_by_release_bin: flat 15.60 % | gen 19.07 %
  hit_rate_by_release_bin: flat 4.30 % [time to throw 1.607 s] | gen 4.54 % [time to throw 1.703 s]
  hits_on_aimed_throws_per_dropback: flat 0.78 % [time to throw 1.607 s] | gen 1.23 % [time to throw 1.703 s]
  first_pressure_seconds: flat 1.396 seconds | gen 1.526 seconds
  first_forcing_seconds: flat 1.748 seconds | gen 1.852 seconds
  first_arrival_seconds: flat 1.901 seconds | gen 1.957 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.29%, FREE_RUNNER 69.83%, WON_REP 26.89%; gen COUNTER 3.61%, FREE_RUNNER 65.00%, WON_REP 31.39%)
  quick_pressure_share_by_origin: flat 88.87 % | gen 83.25 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.49 %
  clean_with_live_won_rep_dropbacks: flat 1.21 % | gen 1.47 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.92 % | gen 9.50 %
  throwaway_rate_clean: flat 18.42 % | gen 10.00 %
  scramble_rate: flat 2.20 % | gen 0.90 %
  scramble_yards: flat 5.48 yards | gen 4.38 yards
  by_down_fixed_calls: flat 12.01 % | gen 10.08 %
  int_per_aimed_throw: flat 2.83 % | gen 7.45 %
  completion_per_aimed_throw: flat 46.86 % | gen 43.25 %
  forced_throw_share: flat 10.44 % | gen 15.15 %
  completion_by_pocket_status: flat 29.34 % | gen 28.09 %
  qb_season_spread: flat 0.92 pp | gen 2.94 pp
  defence_season_spread: flat 0.52 pp | gen 1.93 pp
  unblocked_pressures_per_100: flat 15.63 per 100 dropbacks | gen 15.27 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 75.37 % [time to throw 1.607 s] | gen 69.30 % [time to throw 1.703 s]
  unblocked_men_per_100: flat 18.79 per 100 dropbacks | gen 18.45 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.04 % | gen 9.85 %
  quick_share_no_free_runner: flat 74.04 % | gen 63.69 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.43 % | gen 9.40 %
  situation_q1q3_last_two: flat 13.93 % | gen 10.33 %
  sack_share_of_contacts_in_out: flat 76.37 % [time to throw 1.607 s] | gen 64.44 % [time to throw 1.703 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.607 s] | gen 0.00 % [time to throw 1.703 s]
  sacker_mix.split.interior: flat 32.20 % [time to throw 1.607 s] | gen 38.08 % [time to throw 1.703 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.23 % [time to throw 1.607 s] | gen 43.11 % [time to throw 1.703 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 20.99 % [time to throw 1.607 s] | gen 18.82 % [time to throw 1.703 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.58 % [time to throw 1.607 s] | gen n/a % [time to throw 1.703 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.26 % [time to throw 1.607 s] | gen 38.21 % [time to throw 1.703 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.86 % | gen 2.49 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.34 % | gen 2.46 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.40 % | gen 20.98 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 2.83 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.21 % | gen 17.51 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.67 % | gen 16.81 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.85 % | gen 46.92 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.50 % | gen 19.90 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.87 % | gen 42.13 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.29 % | gen 22.36 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.76 % | gen 20.17 %
  nobody_open_share: flat 43.71 % of dropbacks | gen 33.82 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.21 % of dropbacks | gen 11.68 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.54 % of dropbacks | gen 10.02 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.43 % of dropbacks | gen 9.88 % of dropbacks
  nobody_open_share.split.SACK: flat 2.53 % of dropbacks [time to throw 1.607 s] | gen 2.24 % of dropbacks [time to throw 1.703 s]
  clean_checkdown_share: flat 19.38 % of clean aimed throws | gen 9.02 % of clean aimed throws
  clean_later_read_share: flat 15.23 % of clean aimed throws | gen 22.05 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.31, per aimed throw 2.83; forced-throw share 10.44; completion per attempt 38.28, per aimed throw 46.86; INT-source mix CONTESTED_CATCH 89.30, TIPPED_RECOVERY 10.70
      flat PROGRESSION: 20709 aimed, INT 0.34, completion 45.85
      flat RANK_PUSHED: 6871 aimed, INT 12.40, completion 18.50
      flat CHECKDOWN: 8845 aimed, INT 0.21, completion 45.87
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3360 aimed, INT 5.21, completion 29.29
      flat ON_THE_RUN: 210 aimed, INT 6.67, completion 24.76
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.67 against a real 3.25
    gen: INT per attempt 6.69, per aimed throw 7.45; forced-throw share 15.15; completion per attempt 38.84, per aimed throw 43.25; INT-source mix CONTESTED_CATCH 43.02, TIPPED_RECOVERY 56.98
      gen PROGRESSION: 14257 aimed, INT 2.46, completion 46.92
      gen RANK_PUSHED: 4181 aimed, INT 20.98, completion 19.90
      gen CHECKDOWN: 3321 aimed, INT 2.83, completion 42.13
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2849 aimed, INT 17.51, completion 22.36
      gen ON_THE_RUN: 119 aimed, INT 16.81, completion 20.17
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.81 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.83, rise -0.00 against an allowed 0.01: PASSES
    flat PROGRESSION: base 0.35 -> arm 0.34, rise -0.00 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 12.70 -> arm 12.40, rise -0.30 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.21, rise 0.00 against an allowed 0.01: PASSES
    flat DESPERATION: base 5.36 -> arm 5.21, rise -0.15 against an allowed 0.04: PASSES
    flat ON_THE_RUN: base 5.44 -> arm 6.67, rise 1.22 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.45, rise 0.14 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.46, rise -0.25 against an allowed 0.00: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.98, rise 1.23 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 2.83, rise -0.38 against an allowed 0.05: PASSES
    gen DESPERATION: base 16.61 -> arm 17.51, rise 0.90 against an allowed 0.04: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 16.81, rise -3.19 against an allowed 0.11: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 51380 | gen 28430

== C7 (information, UNBLOCKED alone): release clock the decision tick ==
  time to throw: flat 1.595 s | gen 1.688 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1601 of 51163 dropbacks (3.13 per 100); pressuredSacks 1601; pressured dropbacks 13823 (27.02 per 100) [time to throw 1.595 s]
    gen: sacks 813 of 28206 dropbacks (2.88 per 100); pressuredSacks 813; pressured dropbacks 7921 (28.08 per 100) [time to throw 1.688 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.58% | -10.44 against 22.02% (PR #33, FTN only (held)) | -3.88 against 15.46% (main) [time to throw 1.595 s]
    gen: 10.26% | -11.76 against 22.02% (PR #33, FTN only (held)) | -5.20 against 15.46% (main) [time to throw 1.688 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.02 % | gen 28.08 %
  hit_or_sack_rate: flat 3.98 % [time to throw 1.595 s] | gen 4.24 % [time to throw 1.688 s]
  sack_rate: flat 3.13 % [time to throw 1.595 s] | gen 2.88 % [time to throw 1.688 s]
  time_to_throw: flat 1.595 seconds | gen 1.688 seconds
  sack_share_of_hit_or_sack: flat 78.63 % [time to throw 1.595 s] | gen 67.98 % [time to throw 1.688 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.595 s] | gen 0.00 % [time to throw 1.688 s]
  release_distribution: flat 1.595 seconds | gen 1.688 seconds
  pressured_share_by_release_bin: flat 20.64 % | gen 23.17 %
  hit_rate_by_release_bin: flat 3.43 % [time to throw 1.595 s] | gen 3.55 % [time to throw 1.688 s]
  hits_on_aimed_throws_per_dropback: flat 0.85 % [time to throw 1.595 s] | gen 1.36 % [time to throw 1.688 s]
  first_pressure_seconds: flat 1.173 seconds | gen 1.284 seconds
  first_forcing_seconds: flat 1.553 seconds | gen 1.656 seconds
  first_arrival_seconds: flat 1.736 seconds | gen 1.792 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.47%, FREE_RUNNER 77.08%, WON_REP 20.45%; gen COUNTER 2.59%, FREE_RUNNER 72.36%, WON_REP 25.05%)
  quick_pressure_share_by_origin: flat 94.08 % | gen 89.75 %
  clean_with_live_won_rep_ticks: flat 0.44 % | gen 0.51 %
  clean_with_live_won_rep_dropbacks: flat 1.17 % | gen 1.45 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.25 % | gen 8.57 %
  throwaway_rate_clean: flat 18.09 % | gen 9.91 %
  scramble_rate: flat 2.61 % | gen 0.99 %
  scramble_yards: flat 6.39 yards | gen 5.80 yards
  by_down_fixed_calls: flat 11.72 % | gen 12.01 %
  int_per_aimed_throw: flat 2.84 % | gen 7.30 %
  completion_per_aimed_throw: flat 46.43 % | gen 42.96 %
  forced_throw_share: flat 14.05 % | gen 18.70 %
  completion_by_pocket_status: flat 30.23 % | gen 29.29 %
  qb_season_spread: flat 1.14 pp | gen 3.13 pp
  defence_season_spread: flat 0.00 pp | gen 0.97 pp
  unblocked_pressures_per_100: flat 16.76 per 100 dropbacks | gen 16.06 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 65.72 % [time to throw 1.595 s] | gen 64.21 % [time to throw 1.688 s]
  unblocked_men_per_100: flat 19.08 per 100 dropbacks | gen 18.29 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.12 % | gen 9.60 %
  quick_share_no_free_runner: flat 72.84 % | gen 61.66 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.33 % | gen 7.38 %
  situation_q1q3_last_two: flat 12.06 % | gen 8.50 %
  sack_share_of_contacts_in_out: flat 78.63 % [time to throw 1.595 s] | gen 67.98 % [time to throw 1.688 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.595 s] | gen 0.00 % [time to throw 1.688 s]
  sacker_mix.split.interior: flat 25.86 % [time to throw 1.595 s] | gen 28.78 % [time to throw 1.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.88 % [time to throw 1.595 s] | gen 45.76 % [time to throw 1.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 26.51 % [time to throw 1.595 s] | gen 24.97 % [time to throw 1.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.75 % [time to throw 1.595 s] | gen 0.49 % [time to throw 1.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 26.05 % [time to throw 1.595 s] | gen 29.03 % [time to throw 1.688 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.03 % | gen 1.68 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.34 % | gen 2.63 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.42 % | gen 20.27 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.23 % | gen 3.44 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.75 % | gen 16.25 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 4.35 % | gen 17.39 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.26 % | gen 47.08 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.99 % | gen 19.57 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.28 % | gen 40.37 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.65 % | gen 21.52 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.22 % | gen 21.74 %
  nobody_open_share: flat 43.92 % of dropbacks | gen 35.02 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.35 % of dropbacks | gen 12.46 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.66 % of dropbacks | gen 10.15 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.78 % of dropbacks | gen 9.53 % of dropbacks
  nobody_open_share.split.SACK: flat 3.13 % of dropbacks [time to throw 1.595 s] | gen 2.88 % of dropbacks [time to throw 1.688 s]
  clean_checkdown_share: flat 19.31 % of clean aimed throws | gen 9.05 % of clean aimed throws
  clean_later_read_share: flat 15.46 % of clean aimed throws | gen 22.05 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.33, per aimed throw 2.84; forced-throw share 14.05; completion per attempt 38.16, per aimed throw 46.43; INT-source mix CONTESTED_CATCH 90.04, TIPPED_RECOVERY 9.96
      flat PROGRESSION: 20509 aimed, INT 0.34, completion 45.26
      flat RANK_PUSHED: 6689 aimed, INT 12.42, completion 18.99
      flat CHECKDOWN: 8879 aimed, INT 0.23, completion 45.28
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3407 aimed, INT 5.75, completion 28.65
      flat ON_THE_RUN: 161 aimed, INT 4.35, completion 24.22
      flat on the run: clean INT n/a against a real 2.11; pressured INT 4.35 against a real 3.25
    gen: INT per attempt 6.58, per aimed throw 7.30; forced-throw share 18.70; completion per attempt 38.70, per aimed throw 42.96; INT-source mix CONTESTED_CATCH 43.67, TIPPED_RECOVERY 56.33
      gen PROGRESSION: 13937 aimed, INT 2.63, completion 47.08
      gen RANK_PUSHED: 4041 aimed, INT 20.27, completion 19.57
      gen CHECKDOWN: 3515 aimed, INT 3.44, completion 40.37
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2862 aimed, INT 16.25, completion 21.52
      gen ON_THE_RUN: 69 aimed, INT 17.39, completion 21.74
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.39 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.84, rise 0.01 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.35 -> arm 0.34, rise -0.01 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 12.70 -> arm 12.42, rise -0.27 against an allowed -0.01: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.23, rise 0.01 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 5.36 -> arm 5.75, rise 0.40 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 5.44 -> arm 4.35, rise -1.09 against an allowed -0.01: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.30, rise 0.00 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.63, rise -0.08 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.27, rise 0.52 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 3.44, rise 0.23 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 16.61 -> arm 16.25, rise -0.37 against an allowed 0.01: PASSES
    gen ON_THE_RUN: base 20.00 -> arm 17.39, rise -2.61 against an allowed 0.04: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 1806 | gen 953

== C8 (information, BLOWN_UP alone): release clock the decision tick ==
  time to throw: flat 1.596 s | gen 1.685 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1457 of 51301 dropbacks (2.84 per 100); pressuredSacks 1457; pressured dropbacks 13890 (27.08 per 100) [time to throw 1.596 s]
    gen: sacks 708 of 28334 dropbacks (2.50 per 100); pressuredSacks 708; pressured dropbacks 7947 (28.05 per 100) [time to throw 1.685 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.49% | -11.53 against 22.02% (PR #33, FTN only (held)) | -4.97 against 15.46% (main) [time to throw 1.596 s]
    gen: 8.91% | -13.11 against 22.02% (PR #33, FTN only (held)) | -6.55 against 15.46% (main) [time to throw 1.685 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.08 % | gen 28.05 %
  hit_or_sack_rate: flat 3.67 % [time to throw 1.596 s] | gen 3.80 % [time to throw 1.685 s]
  sack_rate: flat 2.84 % [time to throw 1.596 s] | gen 2.50 % [time to throw 1.685 s]
  time_to_throw: flat 1.596 seconds | gen 1.685 seconds
  sack_share_of_hit_or_sack: flat 77.34 % [time to throw 1.596 s] | gen 65.80 % [time to throw 1.685 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.596 s] | gen 0.00 % [time to throw 1.685 s]
  release_distribution: flat 1.596 seconds | gen 1.685 seconds
  pressured_share_by_release_bin: flat 21.78 % | gen 24.35 %
  hit_rate_by_release_bin: flat 4.35 % [time to throw 1.596 s] | gen 4.73 % [time to throw 1.685 s]
  hits_on_aimed_throws_per_dropback: flat 0.83 % [time to throw 1.596 s] | gen 1.30 % [time to throw 1.685 s]
  first_pressure_seconds: flat 1.230 seconds | gen 1.337 seconds
  first_forcing_seconds: flat 1.622 seconds | gen 1.718 seconds
  first_arrival_seconds: flat 1.880 seconds | gen 1.927 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.30%, FREE_RUNNER 77.13%, WON_REP 20.57%; gen COUNTER 2.47%, FREE_RUNNER 72.96%, WON_REP 24.58%)
  quick_pressure_share_by_origin: flat 94.00 % | gen 89.90 %
  clean_with_live_won_rep_ticks: flat 0.44 % | gen 0.48 %
  clean_with_live_won_rep_dropbacks: flat 1.19 % | gen 1.35 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.95 % | gen 8.72 %
  throwaway_rate_clean: flat 18.01 % | gen 9.77 %
  scramble_rate: flat 2.30 % | gen 0.78 %
  scramble_yards: flat 6.88 yards | gen 4.99 yards
  by_down_fixed_calls: flat 11.06 % | gen 10.19 %
  int_per_aimed_throw: flat 2.70 % | gen 7.42 %
  completion_per_aimed_throw: flat 46.45 % | gen 42.92 %
  forced_throw_share: flat 14.03 % | gen 18.61 %
  completion_by_pocket_status: flat 30.29 % | gen 29.40 %
  qb_season_spread: flat 0.00 pp | gen 2.71 pp
  defence_season_spread: flat 0.00 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 16.65 per 100 dropbacks | gen 16.01 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 60.30 % [time to throw 1.596 s] | gen 56.88 % [time to throw 1.685 s]
  unblocked_men_per_100: flat 19.03 per 100 dropbacks | gen 18.28 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.01 % | gen 9.41 %
  quick_share_no_free_runner: flat 72.50 % | gen 61.30 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.87 % | gen 7.97 %
  situation_q1q3_last_two: flat 13.03 % | gen 8.44 %
  sack_share_of_contacts_in_out: flat 77.34 % [time to throw 1.596 s] | gen 65.80 % [time to throw 1.685 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.596 s] | gen 0.00 % [time to throw 1.685 s]
  sacker_mix.split.interior: flat 30.20 % [time to throw 1.596 s] | gen 32.60 % [time to throw 1.685 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.61 % [time to throw 1.596 s] | gen 41.83 % [time to throw 1.685 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.88 % [time to throw 1.596 s] | gen 25.14 % [time to throw 1.685 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.31 % [time to throw 1.596 s] | gen 0.42 % [time to throw 1.685 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.20 % [time to throw 1.596 s] | gen 33.05 % [time to throw 1.685 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.03 % | gen 1.38 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.32 % | gen 2.52 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.04 % | gen 20.61 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.24 % | gen 3.28 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.12 % | gen 17.14 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.34 % | gen 17.89 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.43 % | gen 46.81 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.27 % | gen 19.78 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.70 % | gen 41.27 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.22 % | gen 21.35 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.88 % | gen 18.95 %
  nobody_open_share: flat 44.35 % of dropbacks | gen 34.92 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.93 % of dropbacks | gen 12.61 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.66 % of dropbacks | gen 10.33 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.91 % of dropbacks | gen 9.48 % of dropbacks
  nobody_open_share.split.SACK: flat 2.84 % of dropbacks [time to throw 1.596 s] | gen 2.50 % of dropbacks [time to throw 1.685 s]
  clean_checkdown_share: flat 19.54 % of clean aimed throws | gen 9.08 % of clean aimed throws
  clean_later_read_share: flat 15.37 % of clean aimed throws | gen 22.00 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.22, per aimed throw 2.70; forced-throw share 14.03; completion per attempt 38.17, per aimed throw 46.45; INT-source mix CONTESTED_CATCH 90.19, TIPPED_RECOVERY 9.81
      flat PROGRESSION: 20490 aimed, INT 0.32, completion 45.43
      flat RANK_PUSHED: 6676 aimed, INT 12.04, completion 18.27
      flat CHECKDOWN: 9200 aimed, INT 0.24, completion 45.70
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3419 aimed, INT 5.12, completion 28.22
      flat ON_THE_RUN: 205 aimed, INT 6.34, completion 24.88
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.34 against a real 3.25
    gen: INT per attempt 6.69, per aimed throw 7.42; forced-throw share 18.61; completion per attempt 38.71, per aimed throw 42.92; INT-source mix CONTESTED_CATCH 42.61, TIPPED_RECOVERY 57.39
      gen PROGRESSION: 14033 aimed, INT 2.52, completion 46.81
      gen RANK_PUSHED: 4091 aimed, INT 20.61, completion 19.78
      gen CHECKDOWN: 3572 aimed, INT 3.28, completion 41.27
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2928 aimed, INT 17.14, completion 21.35
      gen ON_THE_RUN: 95 aimed, INT 17.89, completion 18.95
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.89 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.70, rise -0.13 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.35 -> arm 0.32, rise -0.02 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 12.70 -> arm 12.04, rise -0.65 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.24, rise 0.03 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 5.36 -> arm 5.12, rise -0.24 against an allowed 0.01: PASSES
    flat ON_THE_RUN: base 5.44 -> arm 6.34, rise 0.90 against an allowed -0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.42, rise 0.11 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.52, rise -0.19 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.61, rise 0.86 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 3.28, rise 0.06 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 16.61 -> arm 17.14, rise 0.53 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 17.89, rise -2.11 against an allowed 0.10: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 4055 | gen 2185

== C9 (information, LOOPER_FREE alone (the untouched exchange with it, AM-2)): release clock the decision tick ==
  time to throw: flat 1.592 s | gen 1.682 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1581 of 51290 dropbacks (3.08 per 100); pressuredSacks 1581; pressured dropbacks 14249 (27.78 per 100) [time to throw 1.592 s]
    gen: sacks 819 of 28221 dropbacks (2.90 per 100); pressuredSacks 819; pressured dropbacks 8087 (28.66 per 100) [time to throw 1.682 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.10% | -10.92 against 22.02% (PR #33, FTN only (held)) | -4.36 against 15.46% (main) [time to throw 1.592 s]
    gen: 10.13% | -11.89 against 22.02% (PR #33, FTN only (held)) | -5.33 against 15.46% (main) [time to throw 1.682 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.78 % | gen 28.66 %
  hit_or_sack_rate: flat 3.89 % [time to throw 1.592 s] | gen 4.20 % [time to throw 1.682 s]
  sack_rate: flat 3.08 % [time to throw 1.592 s] | gen 2.90 % [time to throw 1.682 s]
  time_to_throw: flat 1.592 seconds | gen 1.682 seconds
  sack_share_of_hit_or_sack: flat 79.33 % [time to throw 1.592 s] | gen 69.17 % [time to throw 1.682 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.592 s] | gen 0.00 % [time to throw 1.682 s]
  release_distribution: flat 1.592 seconds | gen 1.682 seconds
  pressured_share_by_release_bin: flat 20.59 % | gen 23.83 %
  hit_rate_by_release_bin: flat 2.83 % [time to throw 1.592 s] | gen 2.92 % [time to throw 1.682 s]
  hits_on_aimed_throws_per_dropback: flat 0.80 % [time to throw 1.592 s] | gen 1.29 % [time to throw 1.682 s]
  first_pressure_seconds: flat 1.131 seconds | gen 1.242 seconds
  first_forcing_seconds: flat 1.511 seconds | gen 1.623 seconds
  first_arrival_seconds: flat 1.708 seconds | gen 1.756 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.30%, FREE_RUNNER 77.86%, WON_REP 19.84%; gen COUNTER 2.41%, FREE_RUNNER 73.52%, WON_REP 24.08%)
  quick_pressure_share_by_origin: flat 94.22 % | gen 90.05 %
  clean_with_live_won_rep_ticks: flat 0.46 % | gen 0.48 %
  clean_with_live_won_rep_dropbacks: flat 1.20 % | gen 1.34 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.15 % | gen 8.51 %
  throwaway_rate_clean: flat 18.37 % | gen 9.94 %
  scramble_rate: flat 2.64 % | gen 0.97 %
  scramble_yards: flat 6.84 yards | gen 6.65 yards
  by_down_fixed_calls: flat 11.08 % | gen 11.22 %
  int_per_aimed_throw: flat 2.83 % | gen 7.36 %
  completion_per_aimed_throw: flat 46.24 % | gen 42.99 %
  forced_throw_share: flat 15.11 % | gen 19.15 %
  completion_by_pocket_status: flat 30.56 % | gen 29.97 %
  qb_season_spread: flat 0.73 pp | gen 2.42 pp
  defence_season_spread: flat 0.00 pp | gen 1.15 pp
  unblocked_pressures_per_100: flat 17.47 per 100 dropbacks | gen 16.97 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 65.73 % [time to throw 1.592 s] | gen 65.20 % [time to throw 1.682 s]
  unblocked_men_per_100: flat 19.14 per 100 dropbacks | gen 18.44 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.16 % | gen 9.43 %
  quick_share_no_free_runner: flat 72.67 % | gen 61.22 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 12.84 % | gen 7.07 %
  situation_q1q3_last_two: flat 12.75 % | gen 8.61 %
  sack_share_of_contacts_in_out: flat 79.33 % [time to throw 1.592 s] | gen 69.17 % [time to throw 1.682 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.592 s] | gen 0.00 % [time to throw 1.682 s]
  sacker_mix.split.interior: flat 25.93 % [time to throw 1.592 s] | gen 25.76 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.97 % [time to throw 1.592 s] | gen 44.14 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 28.40 % [time to throw 1.592 s] | gen 29.55 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.70 % [time to throw 1.592 s] | gen 0.55 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 26.12 % [time to throw 1.592 s] | gen 25.89 % [time to throw 1.682 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.08 % | gen 1.58 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.65 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.64 % | gen 20.19 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 3.23 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.38 % | gen 16.59 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.44 % | gen 21.13 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.13 % | gen 46.45 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.46 % | gen 19.57 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.34 % | gen 41.56 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.08 % | gen 22.85 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.21 % | gen 18.31 %
  nobody_open_share: flat 44.34 % of dropbacks | gen 35.41 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.63 % of dropbacks | gen 12.73 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.70 % of dropbacks | gen 10.25 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.92 % of dropbacks | gen 9.53 % of dropbacks
  nobody_open_share.split.SACK: flat 3.08 % of dropbacks [time to throw 1.592 s] | gen 2.90 % of dropbacks [time to throw 1.682 s]
  clean_checkdown_share: flat 19.55 % of clean aimed throws | gen 9.24 % of clean aimed throws
  clean_later_read_share: flat 15.50 % of clean aimed throws | gen 22.18 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.32, per aimed throw 2.83; forced-throw share 15.11; completion per attempt 37.94, per aimed throw 46.24; INT-source mix CONTESTED_CATCH 90.10, TIPPED_RECOVERY 9.90
      flat PROGRESSION: 20436 aimed, INT 0.36, completion 45.13
      flat RANK_PUSHED: 6613 aimed, INT 12.64, completion 18.46
      flat CHECKDOWN: 9044 aimed, INT 0.21, completion 45.34
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3436 aimed, INT 5.38, completion 28.08
      flat ON_THE_RUN: 147 aimed, INT 5.44, completion 27.21
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.44 against a real 3.25
    gen: INT per attempt 6.63, per aimed throw 7.36; forced-throw share 19.15; completion per attempt 38.73, per aimed throw 42.99; INT-source mix CONTESTED_CATCH 43.64, TIPPED_RECOVERY 56.36
      gen PROGRESSION: 13810 aimed, INT 2.65, completion 46.45
      gen RANK_PUSHED: 4072 aimed, INT 20.19, completion 19.57
      gen CHECKDOWN: 3592 aimed, INT 3.23, completion 41.56
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2893 aimed, INT 16.59, completion 22.85
      gen ON_THE_RUN: 71 aimed, INT 21.13, completion 18.31
      gen on the run: clean INT n/a against a real 2.11; pressured INT 21.13 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.83, rise -0.00 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.35 -> arm 0.36, rise 0.01 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat RANK_PUSHED: base 12.70 -> arm 12.64, rise -0.05 against an allowed 0.00: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.21, rise -0.00 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.36 -> arm 5.38, rise 0.03 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 5.44 -> arm 5.44, rise 0.00 against an allowed 0.00: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.36, rise 0.06 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.65, rise -0.06 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.19, rise 0.44 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 3.23, rise 0.02 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 16.61 -> arm 16.59, rise -0.02 against an allowed 0.01: PASSES
    gen ON_THE_RUN: base 20.00 -> arm 21.13, rise 1.13 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 3329 | gen 1737

== C10 (information, the late block alone): release clock the decision tick ==
  time to throw: flat 1.597 s | gen 1.688 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1385 of 51296 dropbacks (2.70 per 100); pressuredSacks 1385; pressured dropbacks 12068 (23.53 per 100) [time to throw 1.597 s]
    gen: sacks 746 of 28360 dropbacks (2.63 per 100); pressuredSacks 746; pressured dropbacks 7115 (25.09 per 100) [time to throw 1.688 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.48% | -10.54 against 22.02% (PR #33, FTN only (held)) | -3.98 against 15.46% (main) [time to throw 1.597 s]
    gen: 10.48% | -11.54 against 22.02% (PR #33, FTN only (held)) | -4.98 against 15.46% (main) [time to throw 1.688 s]
  rows (66, both leagues):
  threat_creation_rate: flat 23.53 % | gen 25.09 %
  hit_or_sack_rate: flat 3.41 % [time to throw 1.597 s] | gen 3.77 % [time to throw 1.688 s]
  sack_rate: flat 2.70 % [time to throw 1.597 s] | gen 2.63 % [time to throw 1.688 s]
  time_to_throw: flat 1.597 seconds | gen 1.688 seconds
  sack_share_of_hit_or_sack: flat 79.23 % [time to throw 1.597 s] | gen 69.78 % [time to throw 1.688 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.597 s] | gen 0.00 % [time to throw 1.688 s]
  release_distribution: flat 1.597 seconds | gen 1.688 seconds
  pressured_share_by_release_bin: flat 15.14 % | gen 17.01 %
  hit_rate_by_release_bin: flat 2.36 % [time to throw 1.597 s] | gen 2.42 % [time to throw 1.688 s]
  hits_on_aimed_throws_per_dropback: flat 0.71 % [time to throw 1.597 s] | gen 1.14 % [time to throw 1.688 s]
  first_pressure_seconds: flat 1.149 seconds | gen 1.291 seconds
  first_forcing_seconds: flat 1.495 seconds | gen 1.632 seconds
  first_arrival_seconds: flat 1.676 seconds | gen 1.749 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.03%, FREE_RUNNER 72.84%, WON_REP 24.13%; gen COUNTER 3.32%, FREE_RUNNER 67.40%, WON_REP 29.28%)
  quick_pressure_share_by_origin: flat 89.48 % | gen 84.19 %
  clean_with_live_won_rep_ticks: flat 0.44 % | gen 0.50 %
  clean_with_live_won_rep_dropbacks: flat 1.19 % | gen 1.44 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.26 % | gen 8.66 %
  throwaway_rate_clean: flat 18.84 % | gen 9.92 %
  scramble_rate: flat 2.39 % | gen 0.89 %
  scramble_yards: flat 6.46 yards | gen 5.93 yards
  by_down_fixed_calls: flat 11.11 % | gen 12.38 %
  int_per_aimed_throw: flat 2.87 % | gen 7.66 %
  completion_per_aimed_throw: flat 46.61 % | gen 42.87 %
  forced_throw_share: flat 13.47 % | gen 17.06 %
  completion_by_pocket_status: flat 29.86 % | gen 29.33 %
  qb_season_spread: flat 0.00 pp | gen 3.20 pp
  defence_season_spread: flat 0.00 pp | gen 1.37 pp
  unblocked_pressures_per_100: flat 17.65 per 100 dropbacks | gen 17.09 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 77.57 % [time to throw 1.597 s] | gen 74.09 % [time to throw 1.688 s]
  unblocked_men_per_100: flat 19.22 per 100 dropbacks | gen 18.50 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.91 % | gen 9.75 %
  quick_share_no_free_runner: flat 73.06 % | gen 62.57 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.61 % | gen 8.89 %
  situation_q1q3_last_two: flat 13.11 % | gen 8.38 %
  sack_share_of_contacts_in_out: flat 79.23 % [time to throw 1.597 s] | gen 69.78 % [time to throw 1.688 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.597 s] | gen 0.00 % [time to throw 1.688 s]
  sacker_mix.split.interior: flat 27.40 % [time to throw 1.597 s] | gen 31.10 % [time to throw 1.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.37 % [time to throw 1.597 s] | gen 41.42 % [time to throw 1.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 27.69 % [time to throw 1.597 s] | gen 26.81 % [time to throw 1.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.54 % [time to throw 1.597 s] | gen 0.67 % [time to throw 1.688 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 28.09 % [time to throw 1.597 s] | gen 31.50 % [time to throw 1.688 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.55 % | gen 2.86 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.69 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.62 % | gen 20.34 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.25 % | gen 3.15 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.51 % | gen 18.14 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.20 % | gen 22.39 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.56 % | gen 46.43 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.78 % | gen 19.91 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.34 % | gen 42.25 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.93 % | gen 21.51 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 20.80 % | gen 17.91 %
  nobody_open_share: flat 44.26 % of dropbacks | gen 34.78 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.27 % of dropbacks | gen 12.08 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.76 % of dropbacks | gen 10.46 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.53 % of dropbacks | gen 9.61 % of dropbacks
  nobody_open_share.split.SACK: flat 2.70 % of dropbacks [time to throw 1.597 s] | gen 2.63 % of dropbacks [time to throw 1.688 s]
  clean_checkdown_share: flat 19.83 % of clean aimed throws | gen 9.10 % of clean aimed throws
  clean_later_read_share: flat 15.77 % of clean aimed throws | gen 22.47 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.34, per aimed throw 2.87; forced-throw share 13.47; completion per attempt 38.00, per aimed throw 46.61; INT-source mix CONTESTED_CATCH 89.20, TIPPED_RECOVERY 10.80
      flat PROGRESSION: 20540 aimed, INT 0.35, completion 45.56
      flat RANK_PUSHED: 6704 aimed, INT 12.62, completion 18.78
      flat CHECKDOWN: 8858 aimed, INT 0.25, completion 46.34
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3469 aimed, INT 5.51, completion 27.93
      flat ON_THE_RUN: 125 aimed, INT 7.20, completion 20.80
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.20 against a real 3.25
    gen: INT per attempt 6.90, per aimed throw 7.66; forced-throw share 17.06; completion per attempt 38.60, per aimed throw 42.87; INT-source mix CONTESTED_CATCH 42.93, TIPPED_RECOVERY 57.07
      gen PROGRESSION: 14003 aimed, INT 2.69, completion 46.43
      gen RANK_PUSHED: 4174 aimed, INT 20.34, completion 19.91
      gen CHECKDOWN: 3427 aimed, INT 3.15, completion 42.25
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2966 aimed, INT 18.14, completion 21.51
      gen ON_THE_RUN: 67 aimed, INT 22.39, completion 17.91
      gen on the run: clean INT n/a against a real 2.11; pressured INT 22.39 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.87, rise 0.04 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.35 -> arm 0.35, rise -0.00 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 12.70 -> arm 12.62, rise -0.08 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.25, rise 0.04 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 5.36 -> arm 5.51, rise 0.15 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 5.44 -> arm 7.20, rise 1.76 against an allowed 0.06: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.66, rise 0.36 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.69, rise -0.02 against an allowed 0.01: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.34, rise 0.60 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 3.15, rise -0.06 against an allowed 0.03: PASSES
    gen DESPERATION: base 16.61 -> arm 18.14, rise 1.52 against an allowed 0.04: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 22.39, rise 2.39 against an allowed -0.10: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 5056 | gen 2827

== C11 (information, priced for the miss rule's option C; guarded under AM-3): release clock the decision tick ==
  time to throw: flat 1.600 s | gen 1.697 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1422 of 51466 dropbacks (2.76 per 100); pressuredSacks 1422; pressured dropbacks 12992 (25.24 per 100) [time to throw 1.600 s]
    gen: sacks 679 of 28518 dropbacks (2.38 per 100); pressuredSacks 679; pressured dropbacks 7577 (26.57 per 100) [time to throw 1.697 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.95% | -11.07 against 22.02% (PR #33, FTN only (held)) | -4.51 against 15.46% (main) [time to throw 1.600 s]
    gen: 8.96% | -13.06 against 22.02% (PR #33, FTN only (held)) | -6.50 against 15.46% (main) [time to throw 1.697 s]
  rows (66, both leagues):
  threat_creation_rate: flat 25.24 % | gen 26.57 %
  hit_or_sack_rate: flat 3.57 % [time to throw 1.600 s] | gen 3.60 % [time to throw 1.697 s]
  sack_rate: flat 2.76 % [time to throw 1.600 s] | gen 2.38 % [time to throw 1.697 s]
  time_to_throw: flat 1.600 seconds | gen 1.697 seconds
  sack_share_of_hit_or_sack: flat 77.32 % [time to throw 1.600 s] | gen 66.11 % [time to throw 1.697 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.600 s] | gen 0.00 % [time to throw 1.697 s]
  release_distribution: flat 1.600 seconds | gen 1.697 seconds
  pressured_share_by_release_bin: flat 22.89 % | gen 26.76 %
  hit_rate_by_release_bin: flat 4.24 % [time to throw 1.600 s] | gen 4.43 % [time to throw 1.697 s]
  hits_on_aimed_throws_per_dropback: flat 0.81 % [time to throw 1.600 s] | gen 1.22 % [time to throw 1.697 s]
  first_pressure_seconds: flat 1.357 seconds | gen 1.463 seconds
  first_forcing_seconds: flat 1.739 seconds | gen 1.825 seconds
  first_arrival_seconds: flat 1.896 seconds | gen 1.955 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.56%, FREE_RUNNER 75.23%, WON_REP 22.21%; gen COUNTER 2.73%, FREE_RUNNER 70.95%, WON_REP 26.33%)
  quick_pressure_share_by_origin: flat 93.60 % | gen 89.57 %
  clean_with_live_won_rep_ticks: flat 0.42 % | gen 0.50 %
  clean_with_live_won_rep_dropbacks: flat 1.16 % | gen 1.47 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.19 % | gen 9.85 %
  throwaway_rate_clean: flat 17.91 % | gen 9.76 %
  scramble_rate: flat 2.30 % | gen 0.87 %
  scramble_yards: flat 5.96 yards | gen 3.83 yards
  by_down_fixed_calls: flat 11.63 % | gen 8.87 %
  int_per_aimed_throw: flat 2.76 % | gen 7.43 %
  completion_per_aimed_throw: flat 46.94 % | gen 42.71 %
  forced_throw_share: flat 11.96 % | gen 17.17 %
  completion_by_pocket_status: flat 29.22 % | gen 28.18 %
  qb_season_spread: flat 0.85 pp | gen 3.30 pp
  defence_season_spread: flat 0.62 pp | gen 1.23 pp
  unblocked_pressures_per_100: flat 15.80 per 100 dropbacks | gen 15.28 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 72.32 % [time to throw 1.600 s] | gen 67.77 % [time to throw 1.697 s]
  unblocked_men_per_100: flat 18.94 per 100 dropbacks | gen 18.37 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.74 % | gen 9.53 %
  quick_share_no_free_runner: flat 72.53 % | gen 62.66 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 14.49 % | gen 8.98 %
  situation_q1q3_last_two: flat 14.40 % | gen 11.32 %
  sack_share_of_contacts_in_out: flat 77.32 % [time to throw 1.600 s] | gen 66.11 % [time to throw 1.697 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.600 s] | gen 0.00 % [time to throw 1.697 s]
  sacker_mix.split.interior: flat 30.88 % [time to throw 1.600 s] | gen 34.73 % [time to throw 1.697 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 47.93 % [time to throw 1.600 s] | gen 46.15 % [time to throw 1.697 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 20.80 % [time to throw 1.600 s] | gen 19.05 % [time to throw 1.697 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.39 % [time to throw 1.600 s] | gen 0.07 % [time to throw 1.697 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.94 % [time to throw 1.600 s] | gen 35.35 % [time to throw 1.697 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.11 % | gen 1.64 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.33 % | gen 2.55 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.28 % | gen 20.79 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 2.78 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.12 % | gen 17.48 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.63 % | gen 15.52 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.73 % | gen 46.65 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.92 % | gen 19.63 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.17 % | gen 40.73 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.74 % | gen 22.21 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 28.64 % | gen 18.10 %
  nobody_open_share: flat 44.06 % of dropbacks | gen 34.26 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.47 % of dropbacks | gen 11.86 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.61 % of dropbacks | gen 10.23 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.22 % of dropbacks | gen 9.78 % of dropbacks
  nobody_open_share.split.SACK: flat 2.76 % of dropbacks [time to throw 1.600 s] | gen 2.38 % of dropbacks [time to throw 1.697 s]
  clean_checkdown_share: flat 19.35 % of clean aimed throws | gen 8.91 % of clean aimed throws
  clean_later_read_share: flat 15.01 % of clean aimed throws | gen 21.80 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.26, per aimed throw 2.76; forced-throw share 11.96; completion per attempt 38.42, per aimed throw 46.94; INT-source mix CONTESTED_CATCH 89.57, TIPPED_RECOVERY 10.43
      flat PROGRESSION: 20640 aimed, INT 0.33, completion 45.73
      flat RANK_PUSHED: 6753 aimed, INT 12.28, completion 18.92
      flat CHECKDOWN: 8990 aimed, INT 0.21, completion 46.17
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3400 aimed, INT 5.12, completion 27.74
      flat ON_THE_RUN: 213 aimed, INT 5.63, completion 28.64
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.63 against a real 3.25
    gen: INT per attempt 6.68, per aimed throw 7.43; forced-throw share 17.17; completion per attempt 38.39, per aimed throw 42.71; INT-source mix CONTESTED_CATCH 42.24, TIPPED_RECOVERY 57.76
      gen PROGRESSION: 14263 aimed, INT 2.55, completion 46.65
      gen RANK_PUSHED: 4122 aimed, INT 20.79, completion 19.63
      gen CHECKDOWN: 3383 aimed, INT 2.78, completion 40.73
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2918 aimed, INT 17.48, completion 22.21
      gen ON_THE_RUN: 116 aimed, INT 15.52, completion 18.10
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.52 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.76, rise -0.07 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.35 -> arm 0.33, rise -0.01 against an allowed -0.01: PASSES
    flat RANK_PUSHED: base 12.70 -> arm 12.28, rise -0.42 against an allowed -0.02: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.21, rise 0.00 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.36 -> arm 5.12, rise -0.24 against an allowed 0.01: PASSES
    flat ON_THE_RUN: base 5.44 -> arm 5.63, rise 0.19 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.43, rise 0.13 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.55, rise -0.17 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.79, rise 1.05 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 2.78, rise -0.43 against an allowed 0.04: PASSES
    gen DESPERATION: base 16.61 -> arm 17.48, rise 0.86 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 15.52, rise -4.48 against an allowed 0.12: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 13082 | gen 7085

== C12 (information, reading (a), never offered): release clock the decision tick ==
  time to throw: flat 1.631 s | gen 1.730 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 503 of 52083 dropbacks (0.97 per 100); pressuredSacks 503; pressured dropbacks 7696 (14.78 per 100) [time to throw 1.631 s]
    gen: sacks 270 of 28622 dropbacks (0.94 per 100); pressuredSacks 270; pressured dropbacks 4815 (16.82 per 100) [time to throw 1.730 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 6.54% | -15.48 against 22.02% (PR #33, FTN only (held)) | -8.92 against 15.46% (main) [time to throw 1.631 s]
    gen: 5.61% | -16.41 against 22.02% (PR #33, FTN only (held)) | -9.85 against 15.46% (main) [time to throw 1.730 s]
  rows (66, both leagues):
  threat_creation_rate: flat 14.78 % | gen 16.82 %
  hit_or_sack_rate: flat 1.23 % [time to throw 1.631 s] | gen 1.45 % [time to throw 1.730 s]
  sack_rate: flat 0.97 % [time to throw 1.631 s] | gen 0.94 % [time to throw 1.730 s]
  time_to_throw: flat 1.631 seconds | gen 1.730 seconds
  sack_share_of_hit_or_sack: flat 78.72 % [time to throw 1.631 s] | gen 65.06 % [time to throw 1.730 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.631 s] | gen 0.00 % [time to throw 1.730 s]
  release_distribution: flat 1.631 seconds | gen 1.730 seconds
  pressured_share_by_release_bin: flat 14.79 % | gen 17.49 %
  hit_rate_by_release_bin: flat 1.12 % [time to throw 1.631 s] | gen 1.23 % [time to throw 1.730 s]
  hits_on_aimed_throws_per_dropback: flat 0.26 % [time to throw 1.631 s] | gen 0.51 % [time to throw 1.730 s]
  first_pressure_seconds: flat 1.868 seconds | gen 2.009 seconds
  first_forcing_seconds: flat 2.054 seconds | gen 2.169 seconds
  first_arrival_seconds: flat 2.090 seconds | gen 2.188 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 6.31%, FREE_RUNNER 50.57%, WON_REP 43.12%; gen COUNTER 6.24%, FREE_RUNNER 46.96%, WON_REP 46.79%)
  quick_pressure_share_by_origin: flat 73.22 % | gen 67.27 %
  clean_with_live_won_rep_ticks: flat 0.44 % | gen 0.50 %
  clean_with_live_won_rep_dropbacks: flat 1.34 % | gen 1.60 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 26.00 % | gen 15.72 %
  throwaway_rate_clean: flat 18.14 % | gen 9.94 %
  scramble_rate: flat 0.95 % | gen 0.33 %
  scramble_yards: flat 6.76 yards | gen 6.80 yards
  by_down_fixed_calls: flat 6.40 % | gen 6.84 %
  int_per_aimed_throw: flat 2.90 % | gen 7.44 %
  completion_per_aimed_throw: flat 47.98 % | gen 44.03 %
  forced_throw_share: flat 7.42 % | gen 11.30 %
  completion_by_pocket_status: flat 23.59 % | gen 25.41 %
  qb_season_spread: flat 0.00 pp | gen 1.37 pp
  defence_season_spread: flat 0.00 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 6.49 per 100 dropbacks | gen 6.65 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 30.67 % [time to throw 1.631 s] | gen 25.78 % [time to throw 1.730 s]
  unblocked_men_per_100: flat 11.57 per 100 dropbacks | gen 11.93 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.83 % | gen 9.82 %
  quick_share_no_free_runner: flat 74.37 % | gen 64.81 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 27.11 % | gen 15.23 %
  situation_q1q3_last_two: flat 25.40 % | gen 14.71 %
  sack_share_of_contacts_in_out: flat 78.72 % [time to throw 1.631 s] | gen 65.06 % [time to throw 1.730 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.631 s] | gen 0.00 % [time to throw 1.730 s]
  sacker_mix.split.interior: flat 59.44 % [time to throw 1.631 s] | gen 67.78 % [time to throw 1.730 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 17.89 % [time to throw 1.631 s] | gen 11.30 % [time to throw 1.730 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.66 % [time to throw 1.631 s] | gen 20.93 % [time to throw 1.730 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat n/a % [time to throw 1.631 s] | gen n/a % [time to throw 1.730 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 58.65 % [time to throw 1.631 s] | gen 67.41 % [time to throw 1.730 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 4.00 % | gen 5.21 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.40 % | gen 2.50 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.09 % | gen 20.25 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.23 % | gen 3.06 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.70 % | gen 17.98 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.25 % | gen 9.43 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 46.68 % | gen 47.39 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.87 % | gen 20.53 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 49.05 % | gen 44.39 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.91 % | gen 22.33 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 22.66 % | gen 15.09 %
  nobody_open_share: flat 44.09 % of dropbacks | gen 32.76 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.05 % of dropbacks | gen 10.61 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.77 % of dropbacks | gen 10.30 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 19.31 % of dropbacks | gen 10.91 % of dropbacks
  nobody_open_share.split.SACK: flat 0.97 % of dropbacks [time to throw 1.631 s] | gen 0.94 % of dropbacks [time to throw 1.730 s]
  clean_checkdown_share: flat 20.35 % of clean aimed throws | gen 9.34 % of clean aimed throws
  clean_later_read_share: flat 15.48 % of clean aimed throws | gen 22.20 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.33, per aimed throw 2.90; forced-throw share 7.42; completion per attempt 38.53, per aimed throw 47.98; INT-source mix CONTESTED_CATCH 88.83, TIPPED_RECOVERY 11.17
      flat PROGRESSION: 21250 aimed, INT 0.40, completion 46.68
      flat RANK_PUSHED: 7246 aimed, INT 12.09, completion 18.87
      flat CHECKDOWN: 8879 aimed, INT 0.23, completion 49.05
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3528 aimed, INT 5.70, completion 28.91
      flat ON_THE_RUN: 128 aimed, INT 6.25, completion 22.66
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.25 against a real 3.25
    gen: INT per attempt 6.62, per aimed throw 7.44; forced-throw share 11.30; completion per attempt 39.16, per aimed throw 44.03; INT-source mix CONTESTED_CATCH 43.93, TIPPED_RECOVERY 56.07
      gen PROGRESSION: 14787 aimed, INT 2.50, completion 47.39
      gen RANK_PUSHED: 4311 aimed, INT 20.25, completion 20.53
      gen CHECKDOWN: 3037 aimed, INT 3.06, completion 44.39
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2947 aimed, INT 17.98, completion 22.33
      gen ON_THE_RUN: 53 aimed, INT 9.43, completion 15.09
      gen on the run: clean INT n/a against a real 2.11; pressured INT 9.43 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.90, rise 0.07 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.35 -> arm 0.40, rise 0.06 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat RANK_PUSHED: base 12.70 -> arm 12.09, rise -0.61 against an allowed 0.02: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.23, rise 0.01 against an allowed 0.05: PASSES
    flat DESPERATION: base 5.36 -> arm 5.70, rise 0.34 against an allowed 0.07: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 5.44 -> arm 6.25, rise 0.81 against an allowed 0.21: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.44, rise 0.14 against an allowed 0.05: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.50, rise -0.21 against an allowed 0.02: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.25, rise 0.51 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 3.06, rise -0.15 against an allowed 0.20: PASSES
    gen DESPERATION: base 16.61 -> arm 17.98, rise 1.37 against an allowed 0.11: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 9.43, rise -10.57 against an allowed 0.14: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 13289 | gen 7148

== C13 (contrast only: revision 1's uniform delay, never offered for a man nobody touched): release clock the decision tick ==
  time to throw: flat 1.637 s | gen 1.747 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 457 of 52176 dropbacks (0.88 per 100); pressuredSacks 457; pressured dropbacks 6980 (13.38 per 100) [time to throw 1.637 s]
    gen: sacks 265 of 28492 dropbacks (0.93 per 100); pressuredSacks 265; pressured dropbacks 4234 (14.86 per 100) [time to throw 1.747 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 6.55% | -15.47 against 22.02% (PR #33, FTN only (held)) | -8.91 against 15.46% (main) [time to throw 1.637 s]
    gen: 6.26% | -15.76 against 22.02% (PR #33, FTN only (held)) | -9.20 against 15.46% (main) [time to throw 1.747 s]
  rows (66, both leagues):
  threat_creation_rate: flat 13.38 % | gen 14.86 %
  hit_or_sack_rate: flat 1.09 % [time to throw 1.637 s] | gen 1.42 % [time to throw 1.747 s]
  sack_rate: flat 0.88 % [time to throw 1.637 s] | gen 0.93 % [time to throw 1.747 s]
  time_to_throw: flat 1.637 seconds | gen 1.747 seconds
  sack_share_of_hit_or_sack: flat 80.04 % [time to throw 1.637 s] | gen 65.59 % [time to throw 1.747 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.637 s] | gen 0.00 % [time to throw 1.747 s]
  release_distribution: flat 1.637 seconds | gen 1.747 seconds
  pressured_share_by_release_bin: flat 7.75 % | gen 9.55 %
  hit_rate_by_release_bin: flat 0.85 % [time to throw 1.637 s] | gen 1.16 % [time to throw 1.747 s]
  hits_on_aimed_throws_per_dropback: flat 0.22 % [time to throw 1.637 s] | gen 0.49 % [time to throw 1.747 s]
  first_pressure_seconds: flat 1.785 seconds | gen 1.943 seconds
  first_forcing_seconds: flat 1.713 seconds | gen 2.132 seconds
  first_arrival_seconds: flat 1.899 seconds | gen 2.031 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.43%, FREE_RUNNER 45.18%, WON_REP 49.38%; gen COUNTER 5.68%, FREE_RUNNER 39.13%, WON_REP 55.19%)
  quick_pressure_share_by_origin: flat 65.33 % | gen 60.16 %
  clean_with_live_won_rep_ticks: flat 0.44 % | gen 0.53 %
  clean_with_live_won_rep_dropbacks: flat 1.35 % | gen 1.74 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 21.78 % | gen 13.34 %
  throwaway_rate_clean: flat 18.89 % | gen 10.37 %
  scramble_rate: flat 0.81 % | gen 0.32 %
  scramble_yards: flat 6.22 yards | gen 4.16 yards
  by_down_fixed_calls: flat 7.13 % | gen 6.59 %
  int_per_aimed_throw: flat 2.92 % | gen 7.44 %
  completion_per_aimed_throw: flat 48.00 % | gen 44.32 %
  forced_throw_share: flat 6.63 % | gen 9.47 %
  completion_by_pocket_status: flat 25.57 % | gen 26.71 %
  qb_season_spread: flat 0.50 pp | gen 2.01 pp
  defence_season_spread: flat 0.00 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 6.01 per 100 dropbacks | gen 5.64 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 20.49 % [time to throw 1.637 s] | gen 20.79 % [time to throw 1.747 s]
  unblocked_men_per_100: flat 19.11 per 100 dropbacks | gen 18.35 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.86 % | gen 9.69 %
  quick_share_no_free_runner: flat 72.54 % | gen 62.34 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 23.32 % | gen 14.33 %
  situation_q1q3_last_two: flat 21.02 % | gen 10.23 %
  sack_share_of_contacts_in_out: flat 80.04 % [time to throw 1.637 s] | gen 65.59 % [time to throw 1.747 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.637 s] | gen 0.00 % [time to throw 1.747 s]
  sacker_mix.split.interior: flat 63.89 % [time to throw 1.637 s] | gen 66.29 % [time to throw 1.747 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 12.51 % [time to throw 1.637 s] | gen 10.06 % [time to throw 1.747 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.60 % [time to throw 1.637 s] | gen 23.65 % [time to throw 1.747 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat n/a % [time to throw 1.637 s] | gen n/a % [time to throw 1.747 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 63.89 % [time to throw 1.637 s] | gen 65.66 % [time to throw 1.747 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 3.07 % | gen 3.79 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.44 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.70 % | gen 20.30 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.20 % | gen 2.87 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.40 % | gen 18.01 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.19 % | gen 12.50 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 46.54 % | gen 47.62 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.93 % | gen 20.46 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 48.46 % | gen 45.31 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.99 % | gen 21.94 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.97 % | gen 12.50 %
  nobody_open_share: flat 43.94 % of dropbacks | gen 32.44 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.04 % of dropbacks | gen 10.50 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.74 % of dropbacks | gen 10.19 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 19.28 % of dropbacks | gen 10.81 % of dropbacks
  nobody_open_share.split.SACK: flat 0.88 % of dropbacks [time to throw 1.637 s] | gen 0.93 % of dropbacks [time to throw 1.747 s]
  clean_checkdown_share: flat 20.33 % of clean aimed throws | gen 9.51 % of clean aimed throws
  clean_later_read_share: flat 15.93 % of clean aimed throws | gen 22.76 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.35, per aimed throw 2.92; forced-throw share 6.63; completion per attempt 38.59, per aimed throw 48.00; INT-source mix CONTESTED_CATCH 89.53, TIPPED_RECOVERY 10.47
      flat PROGRESSION: 21557 aimed, INT 0.36, completion 46.54
      flat RANK_PUSHED: 7195 aimed, INT 12.70, completion 18.93
      flat CHECKDOWN: 8891 aimed, INT 0.20, completion 48.46
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3519 aimed, INT 5.40, completion 28.99
      flat ON_THE_RUN: 77 aimed, INT 5.19, completion 25.97
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.19 against a real 3.25
    gen: INT per attempt 6.62, per aimed throw 7.44; forced-throw share 9.47; completion per attempt 39.47, per aimed throw 44.32; INT-source mix CONTESTED_CATCH 44.44, TIPPED_RECOVERY 55.56
      gen PROGRESSION: 14739 aimed, INT 2.44, completion 47.62
      gen RANK_PUSHED: 4380 aimed, INT 20.30, completion 20.46
      gen CHECKDOWN: 2993 aimed, INT 2.87, completion 45.31
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2904 aimed, INT 18.01, completion 21.94
      gen ON_THE_RUN: 40 aimed, INT 12.50, completion 12.50
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.50 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.92, rise 0.09 against an allowed 0.04: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.35 -> arm 0.36, rise 0.01 against an allowed 0.03: PASSES
    flat RANK_PUSHED: base 12.70 -> arm 12.70, rise 0.01 against an allowed 0.05: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.20, rise -0.01 against an allowed 0.04: PASSES
    flat DESPERATION: base 5.36 -> arm 5.40, rise 0.04 against an allowed 0.09: PASSES
    flat ON_THE_RUN: base 5.44 -> arm 5.19, rise -0.25 against an allowed 0.13: PASSES
    flat by class: PASSES
    gen league-wide: base 7.30 -> arm 7.44, rise 0.13 against an allowed 0.07: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.44, rise -0.27 against an allowed 0.03: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.30, rise 0.55 against an allowed 0.05: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 2.87, rise -0.34 against an allowed 0.18: PASSES
    gen DESPERATION: base 16.61 -> arm 18.01, rise 1.40 against an allowed 0.21: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 12.50, rise -7.50 against an allowed 0.14: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 52176 | gen 28492

== C15 (information, priced for the miss rule's option A): release clock the decision tick ==
  time to throw: flat 1.630 s | gen 1.738 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 658 of 51906 dropbacks (1.27 per 100); pressuredSacks 658; pressured dropbacks 7384 (14.23 per 100) [time to throw 1.630 s]
    gen: sacks 360 of 28521 dropbacks (1.26 per 100); pressuredSacks 360; pressured dropbacks 4508 (15.81 per 100) [time to throw 1.738 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.91% | -13.11 against 22.02% (PR #33, FTN only (held)) | -6.55 against 15.46% (main) [time to throw 1.630 s]
    gen: 7.99% | -14.03 against 22.02% (PR #33, FTN only (held)) | -7.47 against 15.46% (main) [time to throw 1.738 s]
  rows (66, both leagues):
  threat_creation_rate: flat 14.23 % | gen 15.81 %
  hit_or_sack_rate: flat 1.64 % [time to throw 1.630 s] | gen 1.89 % [time to throw 1.738 s]
  sack_rate: flat 1.27 % [time to throw 1.630 s] | gen 1.26 % [time to throw 1.738 s]
  time_to_throw: flat 1.630 seconds | gen 1.738 seconds
  sack_share_of_hit_or_sack: flat 77.50 % [time to throw 1.630 s] | gen 66.79 % [time to throw 1.738 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.630 s] | gen 0.00 % [time to throw 1.738 s]
  release_distribution: flat 1.630 seconds | gen 1.738 seconds
  pressured_share_by_release_bin: flat 11.77 % | gen 13.94 %
  hit_rate_by_release_bin: flat 1.66 % [time to throw 1.630 s] | gen 2.00 % [time to throw 1.738 s]
  hits_on_aimed_throws_per_dropback: flat 0.37 % [time to throw 1.630 s] | gen 0.63 % [time to throw 1.738 s]
  first_pressure_seconds: flat 1.611 seconds | gen 1.776 seconds
  first_forcing_seconds: flat 1.879 seconds | gen 2.012 seconds
  first_arrival_seconds: flat 1.947 seconds | gen 2.035 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.63%, FREE_RUNNER 47.87%, WON_REP 46.49%; gen COUNTER 6.03%, FREE_RUNNER 42.07%, WON_REP 51.89%)
  quick_pressure_share_by_origin: flat 81.83 % | gen 74.98 %
  clean_with_live_won_rep_ticks: flat 0.48 % | gen 0.51 %
  clean_with_live_won_rep_dropbacks: flat 1.44 % | gen 1.66 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 19.00 % | gen 12.40 %
  throwaway_rate_clean: flat 18.74 % | gen 10.02 %
  scramble_rate: flat 1.15 % | gen 0.43 %
  scramble_yards: flat 5.83 yards | gen 5.69 yards
  by_down_fixed_calls: flat 8.52 % | gen 7.00 %
  int_per_aimed_throw: flat 2.94 % | gen 7.58 %
  completion_per_aimed_throw: flat 47.66 % | gen 43.95 %
  forced_throw_share: flat 7.08 % | gen 10.43 %
  completion_by_pocket_status: flat 26.78 % | gen 26.59 %
  qb_season_spread: flat 0.78 pp | gen 2.09 pp
  defence_season_spread: flat 0.00 pp | gen 1.00 pp
  unblocked_pressures_per_100: flat 5.92 per 100 dropbacks | gen 5.70 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 46.76 % [time to throw 1.630 s] | gen 41.93 % [time to throw 1.738 s]
  unblocked_men_per_100: flat 7.36 per 100 dropbacks | gen 7.17 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.03 % | gen 9.85 %
  quick_share_no_free_runner: flat 71.79 % | gen 62.56 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 20.46 % | gen 12.27 %
  situation_q1q3_last_two: flat 18.86 % | gen 11.67 %
  sack_share_of_contacts_in_out: flat 77.50 % [time to throw 1.630 s] | gen 66.79 % [time to throw 1.738 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.630 s] | gen 0.00 % [time to throw 1.738 s]
  sacker_mix.split.interior: flat 47.67 % [time to throw 1.630 s] | gen 51.81 % [time to throw 1.738 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 26.57 % [time to throw 1.630 s] | gen 26.39 % [time to throw 1.738 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 25.46 % [time to throw 1.630 s] | gen 21.53 % [time to throw 1.738 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.30 % [time to throw 1.630 s] | gen 0.28 % [time to throw 1.738 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 47.26 % [time to throw 1.630 s] | gen 51.67 % [time to throw 1.738 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 3.03 % | gen 3.53 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.39 % | gen 2.51 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.54 % | gen 20.54 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.22 % | gen 3.09 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.70 % | gen 18.27 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 2.42 % | gen 20.00 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 46.05 % | gen 47.20 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.39 % | gen 20.82 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 48.44 % | gen 44.02 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.48 % | gen 22.59 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 28.23 % | gen 16.92 %
  nobody_open_share: flat 43.67 % of dropbacks | gen 32.41 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 16.83 % of dropbacks | gen 10.67 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.80 % of dropbacks | gen 10.07 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 18.78 % of dropbacks | gen 10.40 % of dropbacks
  nobody_open_share.split.SACK: flat 1.27 % of dropbacks [time to throw 1.630 s] | gen 1.26 % of dropbacks [time to throw 1.738 s]
  clean_checkdown_share: flat 19.59 % of clean aimed throws | gen 9.29 % of clean aimed throws
  clean_later_read_share: flat 15.64 % of clean aimed throws | gen 22.89 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.37, per aimed throw 2.94; forced-throw share 7.08; completion per attempt 38.49, per aimed throw 47.66; INT-source mix CONTESTED_CATCH 89.36, TIPPED_RECOVERY 10.64
      flat PROGRESSION: 21372 aimed, INT 0.39, completion 46.05
      flat RANK_PUSHED: 7146 aimed, INT 12.54, completion 18.39
      flat CHECKDOWN: 8737 aimed, INT 0.22, completion 48.44
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3528 aimed, INT 5.70, completion 29.48
      flat ON_THE_RUN: 124 aimed, INT 2.42, completion 28.23
      flat on the run: clean INT n/a against a real 2.11; pressured INT 2.42 against a real 3.25
    gen: INT per attempt 6.78, per aimed throw 7.58; forced-throw share 10.43; completion per attempt 39.30, per aimed throw 43.95; INT-source mix CONTESTED_CATCH 44.37, TIPPED_RECOVERY 55.63
      gen PROGRESSION: 14713 aimed, INT 2.51, completion 47.20
      gen RANK_PUSHED: 4376 aimed, INT 20.54, completion 20.82
      gen CHECKDOWN: 3044 aimed, INT 3.09, completion 44.02
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2873 aimed, INT 18.27, completion 22.59
      gen ON_THE_RUN: 65 aimed, INT 20.00, completion 16.92
      gen on the run: clean INT n/a against a real 2.11; pressured INT 20.00 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.94, rise 0.11 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.35 -> arm 0.39, rise 0.05 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat RANK_PUSHED: base 12.70 -> arm 12.54, rise -0.16 against an allowed 0.02: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.22, rise 0.01 against an allowed 0.04: PASSES
    flat DESPERATION: base 5.36 -> arm 5.70, rise 0.34 against an allowed 0.07: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 5.44 -> arm 2.42, rise -3.02 against an allowed 0.14: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.58, rise 0.28 against an allowed 0.05: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.51, rise -0.20 against an allowed 0.03: PASSES
    gen RANK_PUSHED: base 19.74 -> arm 20.54, rise 0.80 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 3.09, rise -0.12 against an allowed 0.16: PASSES
    gen DESPERATION: base 16.61 -> arm 18.27, rise 1.66 against an allowed 0.13: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 20.00 -> arm 20.00, rise 0.00 against an allowed 0.12: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 16918 | gen 9166

== C16 (information, the climb lane alone): release clock the decision tick ==
  time to throw: flat 1.586 s | gen 1.673 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1780 of 50892 dropbacks (3.50 per 100); pressuredSacks 1780; pressured dropbacks 14070 (27.65 per 100) [time to throw 1.586 s]
    gen: sacks 912 of 28055 dropbacks (3.25 per 100); pressuredSacks 912; pressured dropbacks 7992 (28.49 per 100) [time to throw 1.673 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 12.65% | -9.37 against 22.02% (PR #33, FTN only (held)) | -2.81 against 15.46% (main) [time to throw 1.586 s]
    gen: 11.41% | -10.61 against 22.02% (PR #33, FTN only (held)) | -4.05 against 15.46% (main) [time to throw 1.673 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.65 % | gen 28.49 %
  hit_or_sack_rate: flat 4.40 % [time to throw 1.586 s] | gen 4.79 % [time to throw 1.673 s]
  sack_rate: flat 3.50 % [time to throw 1.586 s] | gen 3.25 % [time to throw 1.673 s]
  time_to_throw: flat 1.586 seconds | gen 1.673 seconds
  sack_share_of_hit_or_sack: flat 79.46 % [time to throw 1.586 s] | gen 67.81 % [time to throw 1.673 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.586 s] | gen 0.00 % [time to throw 1.673 s]
  release_distribution: flat 1.586 seconds | gen 1.673 seconds
  pressured_share_by_release_bin: flat 18.10 % | gen 21.55 %
  hit_rate_by_release_bin: flat 3.62 % [time to throw 1.586 s] | gen 4.34 % [time to throw 1.673 s]
  hits_on_aimed_throws_per_dropback: flat 0.90 % [time to throw 1.586 s] | gen 1.54 % [time to throw 1.673 s]
  first_pressure_seconds: flat 1.115 seconds | gen 1.221 seconds
  first_forcing_seconds: flat 1.500 seconds | gen 1.600 seconds
  first_arrival_seconds: flat 1.711 seconds | gen 1.772 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.36%, FREE_RUNNER 77.89%, WON_REP 19.76%; gen COUNTER 2.38%, FREE_RUNNER 73.73%, WON_REP 23.89%)
  quick_pressure_share_by_origin: flat 94.12 % | gen 90.38 %
  clean_with_live_won_rep_ticks: flat 0.45 % | gen 0.48 %
  clean_with_live_won_rep_dropbacks: flat 1.19 % | gen 1.34 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 10.73 % | gen 7.13 %
  throwaway_rate_clean: flat 18.59 % | gen 9.92 %
  scramble_rate: flat 3.15 % | gen 1.14 %
  scramble_yards: flat 6.38 yards | gen 6.00 yards
  by_down_fixed_calls: flat 13.34 % | gen 13.58 %
  int_per_aimed_throw: flat 2.81 % | gen 7.50 %
  completion_per_aimed_throw: flat 46.45 % | gen 42.93 %
  forced_throw_share: flat 15.40 % | gen 19.11 %
  completion_by_pocket_status: flat 31.26 % | gen 30.17 %
  qb_season_spread: flat 0.00 pp | gen 2.79 pp
  defence_season_spread: flat 0.00 pp | gen 1.53 pp
  unblocked_pressures_per_100: flat 17.58 per 100 dropbacks | gen 16.87 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 70.98 % [time to throw 1.586 s] | gen 68.70 % [time to throw 1.673 s]
  unblocked_men_per_100: flat 19.17 per 100 dropbacks | gen 18.22 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.02 % | gen 9.28 %
  quick_share_no_free_runner: flat 72.35 % | gen 62.27 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 10.12 % | gen 6.06 %
  situation_q1q3_last_two: flat 10.09 % | gen 6.92 %
  sack_share_of_contacts_in_out: flat 79.46 % [time to throw 1.586 s] | gen 67.81 % [time to throw 1.673 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.586 s] | gen 0.00 % [time to throw 1.673 s]
  sacker_mix.split.interior: flat 21.56 % [time to throw 1.586 s] | gen 24.29 % [time to throw 1.673 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 52.76 % [time to throw 1.586 s] | gen 50.11 % [time to throw 1.673 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.94 % [time to throw 1.586 s] | gen 25.38 % [time to throw 1.673 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.73 % [time to throw 1.586 s] | gen 0.22 % [time to throw 1.673 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 21.74 % [time to throw 1.586 s] | gen 24.45 % [time to throw 1.673 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.97 % | gen 1.58 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.91 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.65 % | gen 20.32 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.20 % | gen 3.08 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.42 % | gen 16.60 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.85 % | gen 19.42 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.29 % | gen 46.56 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.51 % | gen 19.54 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.19 % | gen 41.56 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.22 % | gen 22.60 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.60 % | gen 20.39 %
  nobody_open_share: flat 44.03 % of dropbacks | gen 35.20 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.55 % of dropbacks | gen 12.50 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.56 % of dropbacks | gen 10.33 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.42 % of dropbacks | gen 9.12 % of dropbacks
  nobody_open_share.split.SACK: flat 3.50 % of dropbacks [time to throw 1.586 s] | gen 3.25 % of dropbacks [time to throw 1.673 s]
  clean_checkdown_share: flat 19.55 % of clean aimed throws | gen 9.12 % of clean aimed throws
  clean_later_read_share: flat 15.54 % of clean aimed throws | gen 21.99 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.32, per aimed throw 2.81; forced-throw share 15.40; completion per attempt 38.28, per aimed throw 46.45; INT-source mix CONTESTED_CATCH 89.92, TIPPED_RECOVERY 10.08
      flat PROGRESSION: 20230 aimed, INT 0.36, completion 45.29
      flat RANK_PUSHED: 6466 aimed, INT 12.65, completion 18.51
      flat CHECKDOWN: 8931 aimed, INT 0.20, completion 45.19
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3338 aimed, INT 5.42, completion 28.22
      flat ON_THE_RUN: 188 aimed, INT 5.85, completion 26.60
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.85 against a real 3.25
    gen: INT per attempt 6.78, per aimed throw 7.50; forced-throw share 19.11; completion per attempt 38.83, per aimed throw 42.93; INT-source mix CONTESTED_CATCH 43.05, TIPPED_RECOVERY 56.95
      gen PROGRESSION: 13768 aimed, INT 2.91, completion 46.56
      gen RANK_PUSHED: 3987 aimed, INT 20.32, completion 19.54
      gen CHECKDOWN: 3506 aimed, INT 3.08, completion 41.56
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2898 aimed, INT 16.60, completion 22.60
      gen ON_THE_RUN: 103 aimed, INT 19.42, completion 20.39
      gen on the run: clean INT n/a against a real 2.11; pressured INT 19.42 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.83 -> arm 2.81, rise -0.02 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.35 -> arm 0.36, rise 0.01 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat RANK_PUSHED: base 12.70 -> arm 12.65, rise -0.05 against an allowed -0.00: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.20, rise -0.01 against an allowed -0.00: PASSES
    flat DESPERATION: base 5.36 -> arm 5.42, rise 0.07 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 5.44 -> arm 5.85, rise 0.41 against an allowed -0.04: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.30 -> arm 7.50, rise 0.20 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.71 -> arm 2.91, rise 0.19 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen RANK_PUSHED: base 19.74 -> arm 20.32, rise 0.57 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.21 -> arm 3.08, rise -0.13 against an allowed -0.00: PASSES
    gen DESPERATION: base 16.61 -> arm 16.60, rise -0.02 against an allowed -0.01: PASSES
    gen ON_THE_RUN: base 20.00 -> arm 19.42, rise -0.58 against an allowed 0.06: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 740 | gen 287
```

### B6 (B3 with the stand-in hold, re-played; pricing arm) with C2, seed set 1

```text
ADR-089 step 3: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== B6 (B3 with the stand-in hold, re-played; pricing arm) (the base arm): release clock the decision tick ==
  time to throw: flat 2.747 s | gen 2.704 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 3636 of 48201 dropbacks (7.54 per 100); pressuredSacks 3636; pressured dropbacks 20958 (43.48 per 100) [time to throw 2.747 s]
    gen: sacks 2270 of 26574 dropbacks (8.54 per 100); pressuredSacks 2256; pressured dropbacks 11647 (43.83 per 100) [time to throw 2.704 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 17.35% | -4.67 against 22.02% (PR #33, FTN only (held)) | 1.89 against 15.46% (main) [time to throw 2.747 s]
    gen: 19.37% | -2.65 against 22.02% (PR #33, FTN only (held)) | 3.91 against 15.46% (main) [time to throw 2.704 s]
  rows (66, both leagues):
  threat_creation_rate: flat 43.48 % | gen 43.83 %
  hit_or_sack_rate: flat 9.54 % [time to throw 2.747 s] | gen 12.43 % [time to throw 2.704 s]
  sack_rate: flat 7.54 % [time to throw 2.747 s] | gen 8.54 % [time to throw 2.704 s]
  time_to_throw: flat 2.747 seconds | gen 2.704 seconds
  sack_share_of_hit_or_sack: flat 79.10 % [time to throw 2.747 s] | gen 68.70 % [time to throw 2.704 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.747 s] | gen 0.00 % [time to throw 2.704 s]
  release_distribution: flat 2.747 seconds | gen 2.704 seconds
  pressured_share_by_release_bin: flat 45.03 % | gen 49.82 %
  hit_rate_by_release_bin: flat 7.63 % [time to throw 2.747 s] | gen 12.18 % [time to throw 2.704 s]
  hits_on_aimed_throws_per_dropback: flat 1.99 % [time to throw 2.747 s] | gen 3.89 % [time to throw 2.704 s]
  first_pressure_seconds: flat 1.684 seconds | gen 1.738 seconds
  first_forcing_seconds: flat 1.980 seconds | gen 2.028 seconds
  first_arrival_seconds: flat 1.820 seconds | gen 1.806 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 4.19%, FREE_RUNNER 57.12%, WON_REP 38.69%; gen COUNTER 4.41%, FREE_RUNNER 55.04%, WON_REP 40.55%)
  quick_pressure_share_by_origin: flat 72.81 % | gen 71.44 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.79 %
  clean_with_live_won_rep_dropbacks: flat 3.28 % | gen 3.28 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 18.01 % | gen 13.87 %
  throwaway_rate_clean: flat 14.87 % | gen 7.23 %
  scramble_rate: flat 6.98 % | gen 3.11 %
  scramble_yards: flat 7.05 yards | gen 5.10 yards
  by_down_fixed_calls: flat 18.74 % | gen 21.94 %
  int_per_aimed_throw: flat 3.02 % | gen 7.38 %
  completion_per_aimed_throw: flat 43.04 % | gen 41.15 %
  forced_throw_share: flat 24.66 % | gen 28.11 %
  completion_by_pocket_status: flat 24.79 % | gen 26.14 %
  qb_season_spread: flat 0.00 pp | gen 2.79 pp
  defence_season_spread: flat 0.54 pp | gen 2.09 pp
  unblocked_pressures_per_100: flat 18.95 per 100 dropbacks | gen 18.07 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 66.20 % [time to throw 2.747 s] | gen 67.25 % [time to throw 2.704 s]
  unblocked_men_per_100: flat 18.99 per 100 dropbacks | gen 18.09 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 20.98 % | gen 25.30 %
  quick_share_no_free_runner: flat 35.38 % | gen 35.63 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 18.05 % | gen 13.15 %
  situation_q1q3_last_two: flat 16.90 % | gen 14.51 %
  sack_share_of_contacts_in_out: flat 79.04 % [time to throw 2.747 s] | gen 68.69 % [time to throw 2.704 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.747 s] | gen 0.62 % [time to throw 2.704 s]
  sacker_mix.split.interior: flat 25.04 % [time to throw 2.747 s] | gen 26.08 % [time to throw 2.704 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 41.72 % [time to throw 2.747 s] | gen 38.01 % [time to throw 2.704 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 32.40 % [time to throw 2.747 s] | gen 35.67 % [time to throw 2.704 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.84 % [time to throw 2.747 s] | gen 0.24 % [time to throw 2.704 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 25.23 % [time to throw 2.747 s] | gen 26.26 % [time to throw 2.704 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 3.96 % | gen 4.17 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.19 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.81 % | gen 21.87 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.93 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.35 % | gen 16.17 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 10.42 % | gen 15.85 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.80 % | gen 44.78 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.47 % | gen 18.25 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 39.17 % | gen 36.50 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.54 % | gen 22.97 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 21.53 % | gen 19.51 %
  nobody_open_share: flat 38.35 % of dropbacks | gen 37.04 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.69 % of dropbacks | gen 8.72 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.88 % of dropbacks | gen 9.63 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.23 % of dropbacks | gen 10.14 % of dropbacks
  nobody_open_share.split.SACK: flat 7.54 % of dropbacks [time to throw 2.747 s] | gen 8.54 % of dropbacks [time to throw 2.704 s]
  clean_checkdown_share: flat 5.54 % of clean aimed throws | gen 3.00 % of clean aimed throws
  clean_later_read_share: flat 21.98 % of clean aimed throws | gen 26.75 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.44, per aimed throw 3.02; forced-throw share 24.66; completion per attempt 34.87, per aimed throw 43.04; INT-source mix CONTESTED_CATCH 90.17, TIPPED_RECOVERY 9.83
      flat PROGRESSION: 20007 aimed, INT 0.36, completion 42.80
      flat RANK_PUSHED: 6200 aimed, INT 11.81, completion 17.47
      flat CHECKDOWN: 4187 aimed, INT 0.17, completion 39.17
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2836 aimed, INT 6.35, completion 24.54
      flat ON_THE_RUN: 144 aimed, INT 10.42, completion 21.53
      flat on the run: clean INT n/a against a real 2.11; pressured INT 10.42 against a real 3.25
    gen: INT per attempt 6.53, per aimed throw 7.38; forced-throw share 28.11; completion per attempt 36.43, per aimed throw 41.15; INT-source mix CONTESTED_CATCH 45.21, TIPPED_RECOVERY 54.79
      gen PROGRESSION: 12425 aimed, INT 2.19, completion 44.78
      gen RANK_PUSHED: 3398 aimed, INT 21.87, completion 18.25
      gen CHECKDOWN: 2318 aimed, INT 3.93, completion 36.50
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2560 aimed, INT 16.17, completion 22.97
      gen ON_THE_RUN: 82 aimed, INT 15.85, completion 19.51
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.85 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== C2 (pricing arm, never a design value): release clock the decision tick ==
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
    the filed guard against B6 (B3 with the stand-in hold, re-played; pricing arm) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 3.02 -> arm 2.92, rise -0.10 against an allowed -0.01: PASSES
    flat PROGRESSION: base 0.36 -> arm 0.29, rise -0.07 against an allowed -0.01: PASSES
    flat RANK_PUSHED: base 11.81 -> arm 11.28, rise -0.53 against an allowed -0.01: PASSES
    flat CHECKDOWN: base 0.17 -> arm 0.12, rise -0.05 against an allowed 0.02: PASSES
    flat DESPERATION: base 6.35 -> arm 7.05, rise 0.70 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 10.42 -> arm 5.26, rise -5.15 against an allowed -0.15: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.38 -> arm 7.13, rise -0.25 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.19 -> arm 2.29, rise 0.10 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen RANK_PUSHED: base 21.87 -> arm 20.24, rise -1.62 against an allowed -0.02: PASSES
    gen CHECKDOWN: base 3.93 -> arm 3.13, rise -0.79 against an allowed 0.01: PASSES
    gen DESPERATION: base 16.17 -> arm 16.30, rise 0.13 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 15.85 -> arm 15.38, rise -0.47 against an allowed -0.05: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B6 (B3 with the stand-in hold, re-played; pricing arm): flat 12295 | gen 6714
```

### B5 (A5 with the horizons, re-played; C14's base) with C14, seed set 1

```text
ADR-089 step 3: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== B5 (A5 with the horizons, re-played; C14's base) (the base arm): release clock the decision tick ==
  time to throw: flat 1.589 s | gen 1.663 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1511 of 51349 dropbacks (2.94 per 100); pressuredSacks 1511; pressured dropbacks 17015 (33.14 per 100) [time to throw 1.589 s]
    gen: sacks 806 of 28522 dropbacks (2.83 per 100); pressuredSacks 806; pressured dropbacks 10517 (36.87 per 100) [time to throw 1.663 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.88% | -13.14 against 22.02% (PR #33, FTN only (held)) | -6.58 against 15.46% (main) [time to throw 1.589 s]
    gen: 7.66% | -14.36 against 22.02% (PR #33, FTN only (held)) | -7.80 against 15.46% (main) [time to throw 1.663 s]
  rows (66, both leagues):
  threat_creation_rate: flat 33.14 % | gen 36.87 %
  hit_or_sack_rate: flat 3.67 % [time to throw 1.589 s] | gen 4.01 % [time to throw 1.663 s]
  sack_rate: flat 2.94 % [time to throw 1.589 s] | gen 2.83 % [time to throw 1.663 s]
  time_to_throw: flat 1.589 seconds | gen 1.663 seconds
  sack_share_of_hit_or_sack: flat 80.20 % [time to throw 1.589 s] | gen 70.45 % [time to throw 1.663 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.663 s]
  release_distribution: flat 1.589 seconds | gen 1.663 seconds
  pressured_share_by_release_bin: flat 27.96 % | gen 32.26 %
  hit_rate_by_release_bin: flat 2.36 % [time to throw 1.589 s] | gen 2.50 % [time to throw 1.663 s]
  hits_on_aimed_throws_per_dropback: flat 0.73 % [time to throw 1.589 s] | gen 1.19 % [time to throw 1.663 s]
  first_pressure_seconds: flat 1.376 seconds | gen 1.503 seconds
  first_forcing_seconds: flat 1.666 seconds | gen 1.804 seconds
  first_arrival_seconds: flat 1.747 seconds | gen 1.829 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 21.63%, FREE_RUNNER 65.97%, WON_REP 12.40%; gen COUNTER 25.46%, FREE_RUNNER 58.75%, WON_REP 15.78%)
  quick_pressure_share_by_origin: flat 82.75 % | gen 77.07 %
  clean_with_live_won_rep_ticks: flat 0.07 % | gen 0.07 %
  clean_with_live_won_rep_dropbacks: flat 0.17 % | gen 0.16 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 19.33 % | gen 11.47 %
  throwaway_rate_clean: flat 16.47 % | gen 8.73 %
  scramble_rate: flat 2.29 % | gen 0.84 %
  scramble_yards: flat 7.92 yards | gen 5.28 yards
  by_down_fixed_calls: flat 10.83 % | gen 9.75 %
  int_per_aimed_throw: flat 2.61 % | gen 7.63 %
  completion_per_aimed_throw: flat 46.30 % | gen 42.10 %
  forced_throw_share: flat 16.61 % | gen 22.82 %
  completion_by_pocket_status: flat 26.46 % | gen 27.59 %
  qb_season_spread: flat 0.24 pp | gen 2.46 pp
  defence_season_spread: flat 0.00 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 17.63 per 100 dropbacks | gen 17.30 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 73.46 % [time to throw 1.589 s] | gen 72.38 % [time to throw 1.663 s]
  unblocked_men_per_100: flat 19.14 per 100 dropbacks | gen 18.65 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 16.95 % | gen 20.32 %
  quick_share_no_free_runner: flat 49.17 % | gen 44.31 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 18.87 % | gen 11.06 %
  situation_q1q3_last_two: flat 18.33 % | gen 11.74 %
  sack_share_of_contacts_in_out: flat 80.20 % [time to throw 1.589 s] | gen 70.45 % [time to throw 1.663 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.663 s]
  sacker_mix.split.interior: flat 18.02 % [time to throw 1.589 s] | gen 22.15 % [time to throw 1.663 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 49.42 % [time to throw 1.589 s] | gen 46.84 % [time to throw 1.663 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 31.77 % [time to throw 1.589 s] | gen 30.89 % [time to throw 1.663 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.79 % [time to throw 1.589 s] | gen 0.12 % [time to throw 1.663 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 18.27 % [time to throw 1.589 s] | gen 22.33 % [time to throw 1.663 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 7.89 % | gen 9.67 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.37 % | gen 2.39 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.69 % | gen 21.39 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.13 % | gen 3.26 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.95 % | gen 18.20 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.22 % | gen 16.92 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.21 % | gen 45.95 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.51 % | gen 19.37 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.18 % | gen 40.33 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.94 % | gen 20.10 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.33 % | gen 13.85 %
  nobody_open_share: flat 44.78 % of dropbacks | gen 35.97 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.84 % of dropbacks | gen 12.90 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.57 % of dropbacks | gen 10.50 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.42 % of dropbacks | gen 9.74 % of dropbacks
  nobody_open_share.split.SACK: flat 2.94 % of dropbacks [time to throw 1.589 s] | gen 2.83 % of dropbacks [time to throw 1.663 s]
  clean_checkdown_share: flat 20.22 % of clean aimed throws | gen 8.90 % of clean aimed throws
  clean_later_read_share: flat 14.92 % of clean aimed throws | gen 21.31 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.13, per aimed throw 2.61; forced-throw share 16.61; completion per attempt 37.79, per aimed throw 46.30; INT-source mix CONTESTED_CATCH 91.11, TIPPED_RECOVERY 8.89
      flat PROGRESSION: 20427 aimed, INT 0.37, completion 45.21
      flat RANK_PUSHED: 6570 aimed, INT 11.69, completion 18.51
      flat CHECKDOWN: 9163 aimed, INT 0.13, completion 45.18
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3376 aimed, INT 4.95, completion 28.94
      flat ON_THE_RUN: 180 aimed, INT 7.22, completion 23.33
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.22 against a real 3.25
    gen: INT per attempt 6.86, per aimed throw 7.63; forced-throw share 22.82; completion per attempt 37.85, per aimed throw 42.10; INT-source mix CONTESTED_CATCH 46.05, TIPPED_RECOVERY 53.95
      gen PROGRESSION: 13855 aimed, INT 2.39, completion 45.95
      gen RANK_PUSHED: 4104 aimed, INT 21.39, completion 19.37
      gen CHECKDOWN: 3680 aimed, INT 3.26, completion 40.33
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2995 aimed, INT 18.20, completion 20.10
      gen ON_THE_RUN: 65 aimed, INT 16.92, completion 13.85
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.92 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== C14 (information, the L basis (its late block on shape L is petition P17's, in contracts)): release clock the decision tick ==
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
    the filed guard against B5 (A5 with the horizons, re-played; C14's base) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.61 -> arm 2.79, rise 0.18 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.37 -> arm 0.35, rise -0.02 against an allowed 0.01: PASSES
    flat RANK_PUSHED: base 11.69 -> arm 12.25, rise 0.56 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.13 -> arm 0.13, rise 0.00 against an allowed 0.01: PASSES
    flat DESPERATION: base 4.95 -> arm 5.54, rise 0.59 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 7.22 -> arm 5.60, rise -1.62 against an allowed 0.04: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.63 -> arm 7.48, rise -0.15 against an allowed 0.02: PASSES
    gen PROGRESSION: base 2.39 -> arm 2.44, rise 0.05 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen RANK_PUSHED: base 21.39 -> arm 20.71, rise -0.69 against an allowed 0.01: PASSES
    gen CHECKDOWN: base 3.26 -> arm 3.14, rise -0.12 against an allowed 0.06: PASSES
    gen DESPERATION: base 18.20 -> arm 17.52, rise -0.67 against an allowed 0.04: PASSES
    gen ON_THE_RUN: base 16.92 -> arm 16.22, rise -0.71 against an allowed 0.09: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B5 (A5 with the horizons, re-played; C14's base): flat 12682 | gen 6768
```

### A0 (today's game, re-played; the cumulative line's design base) alone, seed set 2

```text
ADR-089 step 3: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A0 (today's game, re-played; the cumulative line's design base) (the base arm): release clock the decision tick ==
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
```

### A14 (today's clock with the hold, re-played; the cumulative line's pricing base) alone, seed set 2

```text
ADR-089 step 3: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A14 (today's clock with the hold, re-played; the cumulative line's pricing base) (the base arm): release clock the decision tick ==
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
```

### A1 (step 1's design, re-played; the accepted state's design base) alone, seed set 2

```text
ADR-089 step 3: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A1 (step 1's design, re-played; the accepted state's design base) (the base arm): release clock the decision tick ==
  time to throw: flat 1.591 s | gen 1.693 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1380 of 51541 dropbacks (2.68 per 100); pressuredSacks 1380; pressured dropbacks 16495 (32.00 per 100) [time to throw 1.591 s]
    gen: sacks 790 of 28127 dropbacks (2.81 per 100); pressuredSacks 790; pressured dropbacks 9600 (34.13 per 100) [time to throw 1.693 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.37% | -13.65 against 22.02% (PR #33, FTN only (held)) | -7.09 against 15.46% (main) [time to throw 1.591 s]
    gen: 8.23% | -13.79 against 22.02% (PR #33, FTN only (held)) | -7.23 against 15.46% (main) [time to throw 1.693 s]
  rows (66, both leagues):
  threat_creation_rate: flat 32.00 % | gen 34.13 %
  hit_or_sack_rate: flat 3.27 % [time to throw 1.591 s] | gen 3.92 % [time to throw 1.693 s]
  sack_rate: flat 2.68 % [time to throw 1.591 s] | gen 2.81 % [time to throw 1.693 s]
  time_to_throw: flat 1.591 seconds | gen 1.693 seconds
  sack_share_of_hit_or_sack: flat 81.90 % [time to throw 1.591 s] | gen 71.62 % [time to throw 1.693 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.591 s] | gen 0.00 % [time to throw 1.693 s]
  release_distribution: flat 1.591 seconds | gen 1.693 seconds
  pressured_share_by_release_bin: flat 20.68 % | gen 21.64 %
  hit_rate_by_release_bin: flat 2.37 % [time to throw 1.591 s] | gen 2.29 % [time to throw 1.693 s]
  hits_on_aimed_throws_per_dropback: flat 0.59 % [time to throw 1.591 s] | gen 1.11 % [time to throw 1.693 s]
  first_pressure_seconds: flat 0.802 seconds | gen 0.938 seconds
  first_forcing_seconds: flat 1.118 seconds | gen 1.251 seconds
  first_arrival_seconds: flat 1.605 seconds | gen 1.674 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 1.80%, FREE_RUNNER 79.53%, WON_REP 18.67%; gen COUNTER 2.05%, FREE_RUNNER 74.57%, WON_REP 23.38%)
  quick_pressure_share_by_origin: flat 94.40 % | gen 90.00 %
  clean_with_live_won_rep_ticks: flat 0.02 % | gen 0.02 %
  clean_with_live_won_rep_dropbacks: flat 0.06 % | gen 0.05 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 12.59 % | gen 6.60 %
  throwaway_rate_clean: flat 19.14 % | gen 8.70 %
  scramble_rate: flat 3.89 % | gen 1.51 %
  scramble_yards: flat 6.71 yards | gen 5.95 yards
  by_down_fixed_calls: flat 8.11 % | gen 10.58 %
  int_per_aimed_throw: flat 2.71 % | gen 7.74 %
  completion_per_aimed_throw: flat 45.45 % | gen 42.58 %
  forced_throw_share: flat 20.42 % | gen 25.39 %
  completion_by_pocket_status: flat 30.41 % | gen 31.39 %
  qb_season_spread: flat 0.00 pp | gen 2.90 pp
  defence_season_spread: flat 0.68 pp | gen 0.06 pp
  unblocked_pressures_per_100: flat 19.20 per 100 dropbacks | gen 19.41 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 62.31 % [time to throw 1.591 s] | gen 67.45 % [time to throw 1.693 s]
  unblocked_men_per_100: flat 19.20 per 100 dropbacks | gen 19.41 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.72 % | gen 11.33 %
  quick_share_no_free_runner: flat 72.63 % | gen 60.66 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.95 % | gen 6.90 %
  situation_q1q3_last_two: flat 12.46 % | gen 5.88 %
  sack_share_of_contacts_in_out: flat 81.90 % [time to throw 1.591 s] | gen 71.62 % [time to throw 1.693 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.591 s] | gen 0.00 % [time to throw 1.693 s]
  sacker_mix.split.interior: flat 28.32 % [time to throw 1.591 s] | gen 26.72 % [time to throw 1.693 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 37.16 % [time to throw 1.591 s] | gen 42.25 % [time to throw 1.693 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 34.08 % [time to throw 1.591 s] | gen 30.48 % [time to throw 1.693 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.43 % [time to throw 1.591 s] | gen 0.55 % [time to throw 1.693 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 28.33 % [time to throw 1.591 s] | gen 27.38 % [time to throw 1.693 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.00 % | gen 0.01 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.32 % | gen 2.66 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.76 % | gen 20.89 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.23 % | gen 4.17 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.42 % | gen 17.54 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 13.48 % | gen 16.00 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.04 % | gen 46.06 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.78 % | gen 19.06 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 44.56 % | gen 39.64 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.44 % | gen 21.49 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 18.44 % | gen 30.00 %
  nobody_open_share: flat 44.39 % of dropbacks | gen 34.56 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.93 % of dropbacks | gen 12.70 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.73 % of dropbacks | gen 11.07 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.05 % of dropbacks | gen 7.98 % of dropbacks
  nobody_open_share.split.SACK: flat 2.68 % of dropbacks [time to throw 1.591 s] | gen 2.81 % of dropbacks [time to throw 1.693 s]
  clean_checkdown_share: flat 20.47 % of clean aimed throws | gen 7.22 % of clean aimed throws
  clean_later_read_share: flat 15.58 % of clean aimed throws | gen 22.40 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.21, per aimed throw 2.71; forced-throw share 20.42; completion per attempt 37.16, per aimed throw 45.45; INT-source mix CONTESTED_CATCH 89.86, TIPPED_RECOVERY 10.14
      flat PROGRESSION: 19936 aimed, INT 0.32, completion 44.04
      flat RANK_PUSHED: 6581 aimed, INT 11.76, completion 16.78
      flat CHECKDOWN: 9241 aimed, INT 0.23, completion 44.56
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3470 aimed, INT 5.42, completion 28.44
      flat ON_THE_RUN: 141 aimed, INT 13.48, completion 18.44
      flat on the run: clean INT n/a against a real 2.11; pressured INT 13.48 against a real 3.25
    gen: INT per attempt 7.10, per aimed throw 7.74; forced-throw share 25.39; completion per attempt 39.03, per aimed throw 42.58; INT-source mix CONTESTED_CATCH 46.13, TIPPED_RECOVERY 53.87
      gen PROGRESSION: 13902 aimed, INT 2.66, completion 46.06
      gen RANK_PUSHED: 3930 aimed, INT 20.89, completion 19.06
      gen CHECKDOWN: 3572 aimed, INT 4.17, completion 39.64
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3113 aimed, INT 17.54, completion 21.49
      gen ON_THE_RUN: 150 aimed, INT 16.00, completion 30.00
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.00 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)
```

### A11 (A1 with the stand-in hold, re-played; the accepted state's pricing base) alone, seed set 2

```text
ADR-089 step 3: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A11 (A1 with the stand-in hold, re-played; the accepted state's pricing base) (the base arm): release clock the decision tick ==
  time to throw: flat 2.740 s | gen 2.709 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 3131 of 48555 dropbacks (6.45 per 100); pressuredSacks 3131; pressured dropbacks 21918 (45.14 per 100) [time to throw 2.740 s]
    gen: sacks 2175 of 26678 dropbacks (8.15 per 100); pressuredSacks 2123; pressured dropbacks 12102 (45.36 per 100) [time to throw 2.709 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 14.29% | -7.73 against 22.02% (PR #33, FTN only (held)) | -1.17 against 15.46% (main) [time to throw 2.740 s]
    gen: 17.54% | -4.48 against 22.02% (PR #33, FTN only (held)) | 2.08 against 15.46% (main) [time to throw 2.709 s]
  rows (66, both leagues):
  threat_creation_rate: flat 45.14 % | gen 45.36 %
  hit_or_sack_rate: flat 7.90 % [time to throw 2.740 s] | gen 11.42 % [time to throw 2.709 s]
  sack_rate: flat 6.45 % [time to throw 2.740 s] | gen 8.15 % [time to throw 2.709 s]
  time_to_throw: flat 2.740 seconds | gen 2.709 seconds
  sack_share_of_hit_or_sack: flat 81.58 % [time to throw 2.740 s] | gen 71.38 % [time to throw 2.709 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.740 s] | gen 0.00 % [time to throw 2.709 s]
  release_distribution: flat 2.740 seconds | gen 2.709 seconds
  pressured_share_by_release_bin: flat 46.45 % | gen 48.91 %
  hit_rate_by_release_bin: flat 6.20 % [time to throw 2.740 s] | gen 10.04 % [time to throw 2.709 s]
  hits_on_aimed_throws_per_dropback: flat 1.46 % [time to throw 2.740 s] | gen 3.27 % [time to throw 2.709 s]
  first_pressure_seconds: flat 1.405 seconds | gen 1.486 seconds
  first_forcing_seconds: flat 1.667 seconds | gen 1.744 seconds
  first_arrival_seconds: flat 1.727 seconds | gen 1.786 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.67%, FREE_RUNNER 57.25%, WON_REP 39.08%; gen COUNTER 3.89%, FREE_RUNNER 55.98%, WON_REP 40.13%)
  quick_pressure_share_by_origin: flat 73.67 % | gen 72.15 %
  clean_with_live_won_rep_ticks: flat 0.05 % | gen 0.05 %
  clean_with_live_won_rep_dropbacks: flat 0.20 % | gen 0.18 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 19.46 % | gen 12.53 %
  throwaway_rate_clean: flat 14.67 % | gen 6.57 %
  scramble_rate: flat 8.46 % | gen 3.93 %
  scramble_yards: flat 6.85 yards | gen 5.51 yards
  by_down_fixed_calls: flat 14.47 % | gen 19.62 %
  int_per_aimed_throw: flat 2.85 % | gen 7.91 %
  completion_per_aimed_throw: flat 42.59 % | gen 41.18 %
  forced_throw_share: flat 26.46 % | gen 31.23 %
  completion_by_pocket_status: flat 23.59 % | gen 26.24 %
  qb_season_spread: flat 0.00 pp | gen 2.20 pp
  defence_season_spread: flat 1.17 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 19.60 per 100 dropbacks | gen 19.03 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 61.07 % [time to throw 2.740 s] | gen 62.19 % [time to throw 2.709 s]
  unblocked_men_per_100: flat 19.60 per 100 dropbacks | gen 19.03 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 24.31 % | gen 25.75 %
  quick_share_no_free_runner: flat 38.39 % | gen 36.71 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 19.16 % | gen 13.67 %
  situation_q1q3_last_two: flat 19.40 % | gen 12.53 %
  sack_share_of_contacts_in_out: flat 81.50 % [time to throw 2.740 s] | gen 71.34 % [time to throw 2.709 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.740 s] | gen 2.39 % [time to throw 2.709 s]
  sacker_mix.split.interior: flat 32.17 % [time to throw 2.740 s] | gen 28.85 % [time to throw 2.709 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 32.37 % [time to throw 2.740 s] | gen 33.65 % [time to throw 2.709 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 34.93 % [time to throw 2.740 s] | gen 37.23 % [time to throw 2.709 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.52 % [time to throw 2.740 s] | gen 0.26 % [time to throw 2.709 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.35 % [time to throw 2.740 s] | gen 28.94 % [time to throw 2.709 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.14 % | gen 0.16 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.31 % | gen 2.39 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.94 % | gen 21.42 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.12 % | gen 4.11 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.24 % | gen 19.05 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 3.52 % | gen 17.05 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.70 % | gen 45.01 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.43 % | gen 17.85 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.02 % | gen 35.48 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.99 % | gen 20.13 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 22.54 % | gen 28.41 %
  nobody_open_share: flat 37.75 % of dropbacks | gen 37.11 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.77 % of dropbacks | gen 9.67 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.70 % of dropbacks | gen 10.02 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.83 % of dropbacks | gen 9.27 % of dropbacks
  nobody_open_share.split.SACK: flat 6.45 % of dropbacks [time to throw 2.740 s] | gen 8.15 % of dropbacks [time to throw 2.709 s]
  clean_checkdown_share: flat 5.38 % of clean aimed throws | gen 2.78 % of clean aimed throws
  clean_later_read_share: flat 22.11 % of clean aimed throws | gen 24.79 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.28, per aimed throw 2.85; forced-throw share 26.46; completion per attempt 34.16, per aimed throw 42.59; INT-source mix CONTESTED_CATCH 89.41, TIPPED_RECOVERY 10.59
      flat PROGRESSION: 19885 aimed, INT 0.31, completion 42.70
      flat RANK_PUSHED: 6088 aimed, INT 11.94, completion 16.43
      flat CHECKDOWN: 4258 aimed, INT 0.12, completion 38.02
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2768 aimed, INT 5.24, completion 23.99
      flat ON_THE_RUN: 142 aimed, INT 3.52, completion 22.54
      flat on the run: clean INT n/a against a real 2.11; pressured INT 3.52 against a real 3.25
    gen: INT per attempt 7.07, per aimed throw 7.91; forced-throw share 31.23; completion per attempt 36.83, per aimed throw 41.18; INT-source mix CONTESTED_CATCH 46.17, TIPPED_RECOVERY 53.83
      gen PROGRESSION: 12196 aimed, INT 2.39, completion 45.01
      gen RANK_PUSHED: 3446 aimed, INT 21.42, completion 17.85
      gen CHECKDOWN: 2579 aimed, INT 4.11, completion 35.48
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2672 aimed, INT 19.05, completion 20.13
      gen ON_THE_RUN: 88 aimed, INT 17.05, completion 28.41
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.05 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)
```

### B3 (pocket-1.s2, step 2's design, re-played) with C1, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C15, C16, seed set 2

```text
ADR-089 step 3: the pocket report (15 arms; both leagues; every hit and sack figure with its time to throw beside it)

== B3 (pocket-1.s2, step 2's design, re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 1.589 s | gen 1.711 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1598 of 51505 dropbacks (3.10 per 100); pressuredSacks 1598; pressured dropbacks 14367 (27.89 per 100) [time to throw 1.589 s]
    gen: sacks 847 of 28190 dropbacks (3.00 per 100); pressuredSacks 847; pressured dropbacks 8584 (30.45 per 100) [time to throw 1.711 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.12% | -10.90 against 22.02% (PR #33, FTN only (held)) | -4.34 against 15.46% (main) [time to throw 1.589 s]
    gen: 9.87% | -12.15 against 22.02% (PR #33, FTN only (held)) | -5.59 against 15.46% (main) [time to throw 1.711 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.89 % | gen 30.45 %
  hit_or_sack_rate: flat 3.95 % [time to throw 1.589 s] | gen 4.46 % [time to throw 1.711 s]
  sack_rate: flat 3.10 % [time to throw 1.589 s] | gen 3.00 % [time to throw 1.711 s]
  time_to_throw: flat 1.589 seconds | gen 1.711 seconds
  sack_share_of_hit_or_sack: flat 78.49 % [time to throw 1.589 s] | gen 67.44 % [time to throw 1.711 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.711 s]
  release_distribution: flat 1.589 seconds | gen 1.711 seconds
  pressured_share_by_release_bin: flat 20.38 % | gen 24.83 %
  hit_rate_by_release_bin: flat 2.96 % [time to throw 1.589 s] | gen 3.20 % [time to throw 1.711 s]
  hits_on_aimed_throws_per_dropback: flat 0.85 % [time to throw 1.589 s] | gen 1.45 % [time to throw 1.711 s]
  first_pressure_seconds: flat 1.114 seconds | gen 1.258 seconds
  first_forcing_seconds: flat 1.499 seconds | gen 1.634 seconds
  first_arrival_seconds: flat 1.716 seconds | gen 1.768 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.24%, FREE_RUNNER 78.03%, WON_REP 19.73%; gen COUNTER 2.60%, FREE_RUNNER 72.46%, WON_REP 24.94%)
  quick_pressure_share_by_origin: flat 94.26 % | gen 88.73 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.55 %
  clean_with_live_won_rep_dropbacks: flat 1.12 % | gen 1.55 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 12.53 % | gen 7.32 %
  throwaway_rate_clean: flat 18.36 % | gen 8.03 %
  scramble_rate: flat 2.70 % | gen 0.55 %
  scramble_yards: flat 6.49 yards | gen 5.58 yards
  by_down_fixed_calls: flat 11.26 % | gen 11.04 %
  int_per_aimed_throw: flat 2.75 % | gen 7.69 %
  completion_per_aimed_throw: flat 46.05 % | gen 42.93 %
  forced_throw_share: flat 15.62 % | gen 21.27 %
  completion_by_pocket_status: flat 30.33 % | gen 30.54 %
  qb_season_spread: flat 0.00 pp | gen 3.34 pp
  defence_season_spread: flat 0.00 pp | gen 1.05 pp
  unblocked_pressures_per_100: flat 17.70 per 100 dropbacks | gen 17.72 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 67.14 % [time to throw 1.589 s] | gen 67.99 % [time to throw 1.711 s]
  unblocked_men_per_100: flat 19.35 per 100 dropbacks | gen 19.30 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.91 % | gen 10.20 %
  quick_share_no_free_runner: flat 72.81 % | gen 57.88 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.02 % | gen 7.25 %
  situation_q1q3_last_two: flat 12.73 % | gen 8.07 %
  sack_share_of_contacts_in_out: flat 78.49 % [time to throw 1.589 s] | gen 67.44 % [time to throw 1.711 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.711 s]
  sacker_mix.split.interior: flat 23.36 % [time to throw 1.589 s] | gen 26.41 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 45.67 % [time to throw 1.589 s] | gen 44.88 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 30.18 % [time to throw 1.589 s] | gen 28.47 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.78 % [time to throw 1.589 s] | gen 0.24 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 23.65 % [time to throw 1.589 s] | gen 26.68 % [time to throw 1.711 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.14 % | gen 2.07 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.39 % | gen 2.79 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.57 % | gen 20.68 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.16 % | gen 3.75 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.32 % | gen 18.18 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.16 % | gen 8.45 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.69 % | gen 46.05 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.34 % | gen 19.20 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.34 % | gen 41.86 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.35 % | gen 20.52 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 19.08 % | gen 23.94 %
  nobody_open_share: flat 44.20 % of dropbacks | gen 33.31 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.71 % of dropbacks | gen 11.74 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.66 % of dropbacks | gen 10.75 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.73 % of dropbacks | gen 7.81 % of dropbacks
  nobody_open_share.split.SACK: flat 3.10 % of dropbacks [time to throw 1.589 s] | gen 3.00 % of dropbacks [time to throw 1.711 s]
  clean_checkdown_share: flat 19.60 % of clean aimed throws | gen 6.92 % of clean aimed throws
  clean_later_read_share: flat 15.22 % of clean aimed throws | gen 21.66 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.26, per aimed throw 2.75; forced-throw share 15.62; completion per attempt 37.87, per aimed throw 46.05; INT-source mix CONTESTED_CATCH 91.43, TIPPED_RECOVERY 8.57
      flat PROGRESSION: 20543 aimed, INT 0.39, completion 44.69
      flat RANK_PUSHED: 6671 aimed, INT 11.57, completion 17.34
      flat CHECKDOWN: 9120 aimed, INT 0.16, completion 45.34
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3431 aimed, INT 6.32, completion 29.35
      flat ON_THE_RUN: 131 aimed, INT 9.16, completion 19.08
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.16 against a real 3.25
    gen: INT per attempt 7.07, per aimed throw 7.69; forced-throw share 21.27; completion per attempt 39.45, per aimed throw 42.93; INT-source mix CONTESTED_CATCH 45.53, TIPPED_RECOVERY 54.47
      gen PROGRESSION: 14531 aimed, INT 2.79, completion 46.05
      gen RANK_PUSHED: 4042 aimed, INT 20.68, completion 19.20
      gen CHECKDOWN: 3309 aimed, INT 3.75, completion 41.86
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3031 aimed, INT 18.18, completion 20.52
      gen ON_THE_RUN: 71 aimed, INT 8.45, completion 23.94
      gen on the run: clean INT n/a against a real 2.11; pressured INT 8.45 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== C1 (design): release clock the decision tick ==
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
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.72, rise -0.03 against an allowed 0.01: PASSES
    flat PROGRESSION: base 0.39 -> arm 0.35, rise -0.04 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.81, rise 0.24 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.22, rise 0.06 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 5.44, rise -0.89 against an allowed 0.03: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 4.39, rise -4.77 against an allowed -0.02: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.68, rise -0.01 against an allowed 0.02: PASSES
    gen PROGRESSION: base 2.79 -> arm 2.75, rise -0.04 against an allowed 0.00: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 21.16, rise 0.48 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 3.94, rise 0.19 against an allowed 0.07: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 18.18 -> arm 16.89, rise -1.28 against an allowed 0.07: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 12.35, rise 3.89 against an allowed 0.32: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 13019 | gen 7243

== C3 (information, the snap spot alone (AM-2's references hold the others)): release clock the decision tick ==
  time to throw: flat 1.603 s | gen 1.728 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1536 of 51557 dropbacks (2.98 per 100); pressuredSacks 1536; pressured dropbacks 13640 (26.46 per 100) [time to throw 1.603 s]
    gen: sacks 687 of 28473 dropbacks (2.41 per 100); pressuredSacks 687; pressured dropbacks 8239 (28.94 per 100) [time to throw 1.728 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.26% | -10.76 against 22.02% (PR #33, FTN only (held)) | -4.20 against 15.46% (main) [time to throw 1.603 s]
    gen: 8.34% | -13.68 against 22.02% (PR #33, FTN only (held)) | -7.12 against 15.46% (main) [time to throw 1.728 s]
  rows (66, both leagues):
  threat_creation_rate: flat 26.46 % | gen 28.94 %
  hit_or_sack_rate: flat 3.84 % [time to throw 1.603 s] | gen 3.82 % [time to throw 1.728 s]
  sack_rate: flat 2.98 % [time to throw 1.603 s] | gen 2.41 % [time to throw 1.728 s]
  time_to_throw: flat 1.603 seconds | gen 1.728 seconds
  sack_share_of_hit_or_sack: flat 77.61 % [time to throw 1.603 s] | gen 63.20 % [time to throw 1.728 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.603 s] | gen 0.00 % [time to throw 1.728 s]
  release_distribution: flat 1.603 seconds | gen 1.728 seconds
  pressured_share_by_release_bin: flat 21.46 % | gen 24.86 %
  hit_rate_by_release_bin: flat 4.93 % [time to throw 1.603 s] | gen 4.94 % [time to throw 1.728 s]
  hits_on_aimed_throws_per_dropback: flat 0.86 % [time to throw 1.603 s] | gen 1.40 % [time to throw 1.728 s]
  first_pressure_seconds: flat 1.291 seconds | gen 1.416 seconds
  first_forcing_seconds: flat 1.689 seconds | gen 1.796 seconds
  first_arrival_seconds: flat 1.902 seconds | gen 1.967 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.51%, FREE_RUNNER 76.48%, WON_REP 21.00%; gen COUNTER 2.87%, FREE_RUNNER 71.37%, WON_REP 25.76%)
  quick_pressure_share_by_origin: flat 93.70 % | gen 88.24 %
  clean_with_live_won_rep_ticks: flat 0.42 % | gen 0.54 %
  clean_with_live_won_rep_dropbacks: flat 1.13 % | gen 1.56 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.84 % | gen 7.91 %
  throwaway_rate_clean: flat 18.09 % | gen 8.12 %
  scramble_rate: flat 2.25 % | gen 0.54 %
  scramble_yards: flat 5.76 yards | gen 4.95 yards
  by_down_fixed_calls: flat 10.75 % | gen 10.33 %
  int_per_aimed_throw: flat 2.77 % | gen 7.84 %
  completion_per_aimed_throw: flat 46.52 % | gen 42.85 %
  forced_throw_share: flat 12.76 % | gen 19.99 %
  completion_by_pocket_status: flat 30.09 % | gen 29.29 %
  qb_season_spread: flat 0.92 pp | gen 3.66 pp
  defence_season_spread: flat 0.00 pp | gen 1.59 pp
  unblocked_pressures_per_100: flat 16.02 per 100 dropbacks | gen 16.30 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 62.76 % [time to throw 1.603 s] | gen 60.07 % [time to throw 1.728 s]
  unblocked_men_per_100: flat 19.19 per 100 dropbacks | gen 19.43 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.95 % | gen 9.95 %
  quick_share_no_free_runner: flat 71.78 % | gen 57.33 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.96 % | gen 7.10 %
  situation_q1q3_last_two: flat 13.52 % | gen 8.54 %
  sack_share_of_contacts_in_out: flat 77.61 % [time to throw 1.603 s] | gen 63.20 % [time to throw 1.728 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.603 s] | gen 0.00 % [time to throw 1.728 s]
  sacker_mix.split.interior: flat 29.75 % [time to throw 1.603 s] | gen 32.96 % [time to throw 1.728 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.74 % [time to throw 1.603 s] | gen 43.69 % [time to throw 1.728 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.70 % [time to throw 1.603 s] | gen 23.20 % [time to throw 1.728 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.81 % [time to throw 1.603 s] | gen 0.15 % [time to throw 1.728 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 29.56 % [time to throw 1.603 s] | gen 33.04 % [time to throw 1.728 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.17 % | gen 2.14 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.71 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.71 % | gen 21.20 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.24 % | gen 3.87 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.86 % | gen 18.18 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.58 % | gen 13.00 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.31 % | gen 46.13 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.26 % | gen 19.44 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.23 % | gen 41.65 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.45 % | gen 20.00 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.23 % | gen 14.00 %
  nobody_open_share: flat 44.25 % of dropbacks | gen 32.92 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.58 % of dropbacks | gen 11.44 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.71 % of dropbacks | gen 11.01 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.97 % of dropbacks | gen 8.06 % of dropbacks
  nobody_open_share.split.SACK: flat 2.98 % of dropbacks [time to throw 1.603 s] | gen 2.41 % of dropbacks [time to throw 1.728 s]
  clean_checkdown_share: flat 19.25 % of clean aimed throws | gen 6.71 % of clean aimed throws
  clean_later_read_share: flat 15.00 % of clean aimed throws | gen 21.39 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.27, per aimed throw 2.77; forced-throw share 12.76; completion per attempt 38.19, per aimed throw 46.52; INT-source mix CONTESTED_CATCH 90.46, TIPPED_RECOVERY 9.54
      flat PROGRESSION: 20578 aimed, INT 0.36, completion 45.31
      flat RANK_PUSHED: 6808 aimed, INT 11.71, completion 17.26
      flat CHECKDOWN: 9065 aimed, INT 0.24, completion 46.23
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3462 aimed, INT 5.86, completion 28.45
      flat ON_THE_RUN: 198 aimed, INT 7.58, completion 23.23
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.58 against a real 3.25
    gen: INT per attempt 7.19, per aimed throw 7.84; forced-throw share 19.99; completion per attempt 39.30, per aimed throw 42.85; INT-source mix CONTESTED_CATCH 45.40, TIPPED_RECOVERY 54.60
      gen PROGRESSION: 14697 aimed, INT 2.71, completion 46.13
      gen RANK_PUSHED: 4151 aimed, INT 21.20, completion 19.44
      gen CHECKDOWN: 3256 aimed, INT 3.87, completion 41.65
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3135 aimed, INT 18.18, completion 20.00
      gen ON_THE_RUN: 100 aimed, INT 13.00, completion 14.00
      gen on the run: clean INT n/a against a real 2.11; pressured INT 13.00 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.77, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.39 -> arm 0.36, rise -0.03 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.71, rise 0.13 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.24, rise 0.08 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 5.86, rise -0.46 against an allowed 0.01: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 7.58, rise -1.58 against an allowed -0.09: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.84, rise 0.15 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.79 -> arm 2.71, rise -0.08 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 21.20, rise 0.52 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 3.87, rise 0.12 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 18.18 -> arm 18.18, rise 0.00 against an allowed 0.01: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 13.00, rise 4.55 against an allowed 0.38: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 8898 | gen 4981

== C4 (information, Speed and Acceleration alone (AM-2's references hold the others)): release clock the decision tick ==
  time to throw: flat 1.603 s | gen 1.729 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1520 of 51656 dropbacks (2.94 per 100); pressuredSacks 1520; pressured dropbacks 13629 (26.38 per 100) [time to throw 1.603 s]
    gen: sacks 667 of 28350 dropbacks (2.35 per 100); pressuredSacks 667; pressured dropbacks 8277 (29.20 per 100) [time to throw 1.729 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.15% | -10.87 against 22.02% (PR #33, FTN only (held)) | -4.31 against 15.46% (main) [time to throw 1.603 s]
    gen: 8.06% | -13.96 against 22.02% (PR #33, FTN only (held)) | -7.40 against 15.46% (main) [time to throw 1.729 s]
  rows (66, both leagues):
  threat_creation_rate: flat 26.38 % | gen 29.20 %
  hit_or_sack_rate: flat 3.84 % [time to throw 1.603 s] | gen 3.78 % [time to throw 1.729 s]
  sack_rate: flat 2.94 % [time to throw 1.603 s] | gen 2.35 % [time to throw 1.729 s]
  time_to_throw: flat 1.603 seconds | gen 1.729 seconds
  sack_share_of_hit_or_sack: flat 76.65 % [time to throw 1.603 s] | gen 62.16 % [time to throw 1.729 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.603 s] | gen 0.00 % [time to throw 1.729 s]
  release_distribution: flat 1.603 seconds | gen 1.729 seconds
  pressured_share_by_release_bin: flat 21.65 % | gen 26.05 %
  hit_rate_by_release_bin: flat 5.28 % [time to throw 1.603 s] | gen 4.96 % [time to throw 1.729 s]
  hits_on_aimed_throws_per_dropback: flat 0.90 % [time to throw 1.603 s] | gen 1.43 % [time to throw 1.729 s]
  first_pressure_seconds: flat 1.304 seconds | gen 1.392 seconds
  first_forcing_seconds: flat 1.704 seconds | gen 1.771 seconds
  first_arrival_seconds: flat 1.917 seconds | gen 1.968 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.57%, FREE_RUNNER 76.33%, WON_REP 21.10%; gen COUNTER 2.83%, FREE_RUNNER 71.22%, WON_REP 25.95%)
  quick_pressure_share_by_origin: flat 93.62 % | gen 88.51 %
  clean_with_live_won_rep_ticks: flat 0.41 % | gen 0.54 %
  clean_with_live_won_rep_dropbacks: flat 1.11 % | gen 1.57 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 14.03 % | gen 7.74 %
  throwaway_rate_clean: flat 18.02 % | gen 8.04 %
  scramble_rate: flat 2.15 % | gen 0.62 %
  scramble_yards: flat 6.05 yards | gen 5.93 yards
  by_down_fixed_calls: flat 10.18 % | gen 9.94 %
  int_per_aimed_throw: flat 2.79 % | gen 7.81 %
  completion_per_aimed_throw: flat 46.64 % | gen 43.02 %
  forced_throw_share: flat 12.74 % | gen 20.26 %
  completion_by_pocket_status: flat 29.98 % | gen 29.85 %
  qb_season_spread: flat 0.67 pp | gen 3.83 pp
  defence_season_spread: flat 0.00 pp | gen 1.09 pp
  unblocked_pressures_per_100: flat 16.00 per 100 dropbacks | gen 16.42 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 63.29 % [time to throw 1.603 s] | gen 57.69 % [time to throw 1.729 s]
  unblocked_men_per_100: flat 19.31 per 100 dropbacks | gen 19.37 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.95 % | gen 10.47 %
  quick_share_no_free_runner: flat 71.65 % | gen 58.51 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.62 % | gen 8.08 %
  situation_q1q3_last_two: flat 14.59 % | gen 7.06 %
  sack_share_of_contacts_in_out: flat 76.65 % [time to throw 1.603 s] | gen 62.16 % [time to throw 1.729 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.603 s] | gen 0.00 % [time to throw 1.729 s]
  sacker_mix.split.interior: flat 28.52 % [time to throw 1.603 s] | gen 31.42 % [time to throw 1.729 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 45.36 % [time to throw 1.603 s] | gen 46.23 % [time to throw 1.729 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 25.43 % [time to throw 1.603 s] | gen 22.20 % [time to throw 1.729 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.69 % [time to throw 1.603 s] | gen 0.15 % [time to throw 1.729 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 28.42 % [time to throw 1.603 s] | gen 31.48 % [time to throw 1.729 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.16 % | gen 1.97 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.38 % | gen 2.64 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.98 % | gen 21.19 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 4.04 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.57 % | gen 18.17 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.69 % | gen 13.33 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.24 % | gen 46.23 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.37 % | gen 19.49 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.35 % | gen 42.33 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.27 % | gen 20.51 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.48 % | gen 17.50 %
  nobody_open_share: flat 44.28 % of dropbacks | gen 32.90 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.63 % of dropbacks | gen 11.61 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.74 % of dropbacks | gen 10.99 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.97 % of dropbacks | gen 7.95 % of dropbacks
  nobody_open_share.split.SACK: flat 2.94 % of dropbacks [time to throw 1.603 s] | gen 2.35 % of dropbacks [time to throw 1.729 s]
  clean_checkdown_share: flat 19.24 % of clean aimed throws | gen 6.96 % of clean aimed throws
  clean_later_read_share: flat 15.05 % of clean aimed throws | gen 21.45 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.29, per aimed throw 2.79; forced-throw share 12.74; completion per attempt 38.30, per aimed throw 46.64; INT-source mix CONTESTED_CATCH 90.65, TIPPED_RECOVERY 9.35
      flat PROGRESSION: 20639 aimed, INT 0.38, completion 45.24
      flat RANK_PUSHED: 6827 aimed, INT 11.98, completion 17.37
      flat CHECKDOWN: 9105 aimed, INT 0.18, completion 46.35
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3481 aimed, INT 5.57, completion 29.27
      flat ON_THE_RUN: 208 aimed, INT 7.69, completion 25.48
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.69 against a real 3.25
    gen: INT per attempt 7.17, per aimed throw 7.81; forced-throw share 20.26; completion per attempt 39.49, per aimed throw 43.02; INT-source mix CONTESTED_CATCH 45.74, TIPPED_RECOVERY 54.26
      gen PROGRESSION: 14611 aimed, INT 2.64, completion 46.23
      gen RANK_PUSHED: 4115 aimed, INT 21.19, completion 19.49
      gen CHECKDOWN: 3291 aimed, INT 4.04, completion 42.33
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3115 aimed, INT 18.17, completion 20.51
      gen ON_THE_RUN: 120 aimed, INT 13.33, completion 17.50
      gen on the run: clean INT n/a against a real 2.11; pressured INT 13.33 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.79, rise 0.04 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.39 -> arm 0.38, rise -0.01 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.98, rise 0.41 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.18, rise 0.01 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 5.57, rise -0.75 against an allowed 0.02: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 7.69, rise -1.47 against an allowed -0.08: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.81, rise 0.12 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.79 -> arm 2.64, rise -0.15 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 21.19, rise 0.51 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 4.04, rise 0.29 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 18.18 -> arm 18.17, rise -0.01 against an allowed 0.02: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 13.33, rise 4.88 against an allowed 0.36: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 8980 | gen 4936

== C5 (information, the drop alone (AM-2's references hold the others)): release clock the decision tick ==
  time to throw: flat 1.603 s | gen 1.733 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1493 of 51604 dropbacks (2.89 per 100); pressuredSacks 1493; pressured dropbacks 13639 (26.43 per 100) [time to throw 1.603 s]
    gen: sacks 667 of 28418 dropbacks (2.35 per 100); pressuredSacks 667; pressured dropbacks 8262 (29.07 per 100) [time to throw 1.733 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.95% | -11.07 against 22.02% (PR #33, FTN only (held)) | -4.51 against 15.46% (main) [time to throw 1.603 s]
    gen: 8.07% | -13.95 against 22.02% (PR #33, FTN only (held)) | -7.39 against 15.46% (main) [time to throw 1.733 s]
  rows (66, both leagues):
  threat_creation_rate: flat 26.43 % | gen 29.07 %
  hit_or_sack_rate: flat 3.78 % [time to throw 1.603 s] | gen 3.75 % [time to throw 1.733 s]
  sack_rate: flat 2.89 % [time to throw 1.603 s] | gen 2.35 % [time to throw 1.733 s]
  time_to_throw: flat 1.603 seconds | gen 1.733 seconds
  sack_share_of_hit_or_sack: flat 76.52 % [time to throw 1.603 s] | gen 62.51 % [time to throw 1.733 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.603 s] | gen 0.00 % [time to throw 1.733 s]
  release_distribution: flat 1.603 seconds | gen 1.733 seconds
  pressured_share_by_release_bin: flat 21.76 % | gen 25.75 %
  hit_rate_by_release_bin: flat 5.25 % [time to throw 1.603 s] | gen 5.37 % [time to throw 1.733 s]
  hits_on_aimed_throws_per_dropback: flat 0.89 % [time to throw 1.603 s] | gen 1.41 % [time to throw 1.733 s]
  first_pressure_seconds: flat 1.304 seconds | gen 1.429 seconds
  first_forcing_seconds: flat 1.704 seconds | gen 1.807 seconds
  first_arrival_seconds: flat 1.923 seconds | gen 2.001 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.56%, FREE_RUNNER 76.37%, WON_REP 21.07%; gen COUNTER 2.83%, FREE_RUNNER 71.20%, WON_REP 25.97%)
  quick_pressure_share_by_origin: flat 93.65 % | gen 88.38 %
  clean_with_live_won_rep_ticks: flat 0.41 % | gen 0.52 %
  clean_with_live_won_rep_dropbacks: flat 1.10 % | gen 1.53 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.96 % | gen 8.17 %
  throwaway_rate_clean: flat 18.00 % | gen 7.86 %
  scramble_rate: flat 2.18 % | gen 0.57 %
  scramble_yards: flat 5.97 yards | gen 5.92 yards
  by_down_fixed_calls: flat 9.99 % | gen 9.14 %
  int_per_aimed_throw: flat 2.78 % | gen 7.86 %
  completion_per_aimed_throw: flat 46.66 % | gen 42.88 %
  forced_throw_share: flat 12.77 % | gen 19.85 %
  completion_by_pocket_status: flat 30.04 % | gen 29.57 %
  qb_season_spread: flat 0.56 pp | gen 3.64 pp
  defence_season_spread: flat 0.00 pp | gen 0.59 pp
  unblocked_pressures_per_100: flat 16.00 per 100 dropbacks | gen 16.30 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 62.63 % [time to throw 1.603 s] | gen 58.11 % [time to throw 1.733 s]
  unblocked_men_per_100: flat 19.29 per 100 dropbacks | gen 19.43 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.99 % | gen 10.46 %
  quick_share_no_free_runner: flat 71.72 % | gen 57.97 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.41 % | gen 7.53 %
  situation_q1q3_last_two: flat 14.56 % | gen 8.50 %
  sack_share_of_contacts_in_out: flat 76.52 % [time to throw 1.603 s] | gen 62.51 % [time to throw 1.733 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.603 s] | gen 0.00 % [time to throw 1.733 s]
  sacker_mix.split.interior: flat 28.87 % [time to throw 1.603 s] | gen 31.65 % [time to throw 1.733 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 45.04 % [time to throw 1.603 s] | gen 43.88 % [time to throw 1.733 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 25.39 % [time to throw 1.603 s] | gen 24.33 % [time to throw 1.733 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.70 % [time to throw 1.603 s] | gen 0.15 % [time to throw 1.733 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 28.80 % [time to throw 1.603 s] | gen 31.48 % [time to throw 1.733 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.13 % | gen 2.05 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.37 % | gen 2.67 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.95 % | gen 21.24 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 3.87 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.60 % | gen 18.17 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 8.13 % | gen 11.11 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.25 % | gen 46.39 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.19 % | gen 19.43 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.47 % | gen 42.00 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.07 % | gen 19.99 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.36 % | gen 17.09 %
  nobody_open_share: flat 44.22 % of dropbacks | gen 32.76 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.65 % of dropbacks | gen 11.44 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.75 % of dropbacks | gen 11.02 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.93 % of dropbacks | gen 7.95 % of dropbacks
  nobody_open_share.split.SACK: flat 2.89 % of dropbacks [time to throw 1.603 s] | gen 2.35 % of dropbacks [time to throw 1.733 s]
  clean_checkdown_share: flat 19.26 % of clean aimed throws | gen 6.82 % of clean aimed throws
  clean_later_read_share: flat 15.06 % of clean aimed throws | gen 21.38 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.28, per aimed throw 2.78; forced-throw share 12.77; completion per attempt 38.34, per aimed throw 46.66; INT-source mix CONTESTED_CATCH 90.24, TIPPED_RECOVERY 9.76
      flat PROGRESSION: 20646 aimed, INT 0.37, completion 45.25
      flat RANK_PUSHED: 6801 aimed, INT 11.95, completion 17.19
      flat CHECKDOWN: 9107 aimed, INT 0.18, completion 46.47
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3485 aimed, INT 5.60, completion 29.07
      flat ON_THE_RUN: 209 aimed, INT 8.13, completion 25.36
      flat on the run: clean INT n/a against a real 2.11; pressured INT 8.13 against a real 3.25
    gen: INT per attempt 7.22, per aimed throw 7.86; forced-throw share 19.85; completion per attempt 39.37, per aimed throw 42.88; INT-source mix CONTESTED_CATCH 45.73, TIPPED_RECOVERY 54.27
      gen PROGRESSION: 14623 aimed, INT 2.67, completion 46.39
      gen RANK_PUSHED: 4205 aimed, INT 21.24, completion 19.43
      gen CHECKDOWN: 3252 aimed, INT 3.87, completion 42.00
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3132 aimed, INT 18.17, completion 19.99
      gen ON_THE_RUN: 117 aimed, INT 11.11, completion 17.09
      gen on the run: clean INT n/a against a real 2.11; pressured INT 11.11 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.78, rise 0.03 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.39 -> arm 0.37, rise -0.03 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.95, rise 0.38 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.18, rise 0.01 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 5.60, rise -0.73 against an allowed 0.01: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 8.13, rise -1.03 against an allowed -0.08: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.86, rise 0.17 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.79 -> arm 2.67, rise -0.11 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 21.24, rise 0.55 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 3.87, rise 0.13 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 18.18 -> arm 18.17, rise -0.01 against an allowed 0.02: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 11.11, rise 2.66 against an allowed 0.38: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 8975 | gen 4993

== C6 (information, the other of the two snap pictures (AM-2's Mug rule)): release clock the decision tick ==
  time to throw: flat 1.607 s | gen 1.748 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1336 of 51426 dropbacks (2.60 per 100); pressuredSacks 1336; pressured dropbacks 11417 (22.20 per 100) [time to throw 1.607 s]
    gen: sacks 612 of 28395 dropbacks (2.16 per 100); pressuredSacks 612; pressured dropbacks 7074 (24.91 per 100) [time to throw 1.748 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.70% | -10.32 against 22.02% (PR #33, FTN only (held)) | -3.76 against 15.46% (main) [time to throw 1.607 s]
    gen: 8.65% | -13.37 against 22.02% (PR #33, FTN only (held)) | -6.81 against 15.46% (main) [time to throw 1.748 s]
  rows (66, both leagues):
  threat_creation_rate: flat 22.20 % | gen 24.91 %
  hit_or_sack_rate: flat 3.44 % [time to throw 1.607 s] | gen 3.45 % [time to throw 1.748 s]
  sack_rate: flat 2.60 % [time to throw 1.607 s] | gen 2.16 % [time to throw 1.748 s]
  time_to_throw: flat 1.607 seconds | gen 1.748 seconds
  sack_share_of_hit_or_sack: flat 75.57 % [time to throw 1.607 s] | gen 62.45 % [time to throw 1.748 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.607 s] | gen 0.00 % [time to throw 1.748 s]
  release_distribution: flat 1.607 seconds | gen 1.748 seconds
  pressured_share_by_release_bin: flat 15.81 % | gen 20.47 %
  hit_rate_by_release_bin: flat 4.74 % [time to throw 1.607 s] | gen 4.66 % [time to throw 1.748 s]
  hits_on_aimed_throws_per_dropback: flat 0.84 % [time to throw 1.607 s] | gen 1.30 % [time to throw 1.748 s]
  first_pressure_seconds: flat 1.401 seconds | gen 1.573 seconds
  first_forcing_seconds: flat 1.752 seconds | gen 1.909 seconds
  first_arrival_seconds: flat 1.904 seconds | gen 1.999 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.81%, FREE_RUNNER 69.90%, WON_REP 26.29%; gen COUNTER 3.88%, FREE_RUNNER 64.25%, WON_REP 31.87%)
  quick_pressure_share_by_origin: flat 88.37 % | gen 80.56 %
  clean_with_live_won_rep_ticks: flat 0.42 % | gen 0.51 %
  clean_with_live_won_rep_dropbacks: flat 1.19 % | gen 1.56 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.20 % | gen 9.03 %
  throwaway_rate_clean: flat 18.61 % | gen 8.42 %
  scramble_rate: flat 2.16 % | gen 0.50 %
  scramble_yards: flat 5.38 yards | gen 3.97 yards
  by_down_fixed_calls: flat 10.99 % | gen 11.87 %
  int_per_aimed_throw: flat 2.76 % | gen 7.68 %
  completion_per_aimed_throw: flat 46.93 % | gen 43.29 %
  forced_throw_share: flat 10.94 % | gen 17.22 %
  completion_by_pocket_status: flat 29.28 % | gen 29.32 %
  qb_season_spread: flat 0.00 pp | gen 3.89 pp
  defence_season_spread: flat 0.00 pp | gen 1.02 pp
  unblocked_pressures_per_100: flat 15.93 per 100 dropbacks | gen 15.89 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 75.90 % [time to throw 1.607 s] | gen 71.33 % [time to throw 1.748 s]
  unblocked_men_per_100: flat 19.14 per 100 dropbacks | gen 19.09 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.87 % | gen 10.08 %
  quick_share_no_free_runner: flat 72.50 % | gen 58.74 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 14.29 % | gen 8.97 %
  situation_q1q3_last_two: flat 11.39 % | gen 9.42 %
  sack_share_of_contacts_in_out: flat 75.57 % [time to throw 1.607 s] | gen 62.45 % [time to throw 1.748 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.607 s] | gen 0.00 % [time to throw 1.748 s]
  sacker_mix.split.interior: flat 32.36 % [time to throw 1.607 s] | gen 36.89 % [time to throw 1.748 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.74 % [time to throw 1.607 s] | gen 45.42 % [time to throw 1.748 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 20.11 % [time to throw 1.607 s] | gen 17.52 % [time to throw 1.748 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.79 % [time to throw 1.607 s] | gen 0.16 % [time to throw 1.748 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 32.04 % [time to throw 1.607 s] | gen 36.76 % [time to throw 1.748 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 2.20 % | gen 3.19 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.34 % | gen 2.76 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.92 % | gen 21.12 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.23 % | gen 3.95 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.54 % | gen 17.06 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.26 % | gen 12.99 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.64 % | gen 46.59 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.42 % | gen 19.13 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.72 % | gen 42.29 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.93 % | gen 21.16 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.27 % | gen 16.88 %
  nobody_open_share: flat 44.13 % of dropbacks | gen 32.42 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.56 % of dropbacks | gen 10.87 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.57 % of dropbacks | gen 10.82 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.41 % of dropbacks | gen 8.58 % of dropbacks
  nobody_open_share.split.SACK: flat 2.60 % of dropbacks [time to throw 1.607 s] | gen 2.16 % of dropbacks [time to throw 1.748 s]
  clean_checkdown_share: flat 19.67 % of clean aimed throws | gen 7.03 % of clean aimed throws
  clean_later_read_share: flat 15.15 % of clean aimed throws | gen 21.74 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.25, per aimed throw 2.76; forced-throw share 10.94; completion per attempt 38.35, per aimed throw 46.93; INT-source mix CONTESTED_CATCH 90.21, TIPPED_RECOVERY 9.79
      flat PROGRESSION: 20572 aimed, INT 0.34, completion 45.64
      flat RANK_PUSHED: 6838 aimed, INT 11.92, completion 17.42
      flat CHECKDOWN: 9030 aimed, INT 0.23, completion 46.72
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3377 aimed, INT 5.54, completion 28.93
      flat ON_THE_RUN: 209 aimed, INT 5.26, completion 27.27
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.26 against a real 3.25
    gen: INT per attempt 7.01, per aimed throw 7.68; forced-throw share 17.22; completion per attempt 39.48, per aimed throw 43.29; INT-source mix CONTESTED_CATCH 44.09, TIPPED_RECOVERY 55.91
      gen PROGRESSION: 14845 aimed, INT 2.76, completion 46.59
      gen RANK_PUSHED: 4125 aimed, INT 21.12, completion 19.13
      gen CHECKDOWN: 3086 aimed, INT 3.95, completion 42.29
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3072 aimed, INT 17.06, completion 21.16
      gen ON_THE_RUN: 77 aimed, INT 12.99, completion 16.88
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.99 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.76, rise 0.01 against an allowed 0.01: PASSES
    flat PROGRESSION: base 0.39 -> arm 0.34, rise -0.06 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.92, rise 0.35 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.23, rise 0.07 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 5.54, rise -0.79 against an allowed 0.03: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 5.26, rise -3.90 against an allowed -0.04: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.68, rise -0.01 against an allowed 0.02: PASSES
    gen PROGRESSION: base 2.79 -> arm 2.76, rise -0.03 against an allowed 0.00: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 21.12, rise 0.43 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 3.95, rise 0.21 against an allowed 0.07: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 18.18 -> arm 17.06, rise -1.12 against an allowed 0.07: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 12.99, rise 4.54 against an allowed 0.35: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 51426 | gen 28395

== C7 (information, UNBLOCKED alone): release clock the decision tick ==
  time to throw: flat 1.596 s | gen 1.719 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1582 of 51582 dropbacks (3.07 per 100); pressuredSacks 1582; pressured dropbacks 14036 (27.21 per 100) [time to throw 1.596 s]
    gen: sacks 839 of 28286 dropbacks (2.97 per 100); pressuredSacks 839; pressured dropbacks 8428 (29.80 per 100) [time to throw 1.719 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.27% | -10.75 against 22.02% (PR #33, FTN only (held)) | -4.19 against 15.46% (main) [time to throw 1.596 s]
    gen: 9.95% | -12.07 against 22.02% (PR #33, FTN only (held)) | -5.51 against 15.46% (main) [time to throw 1.719 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.21 % | gen 29.80 %
  hit_or_sack_rate: flat 3.92 % [time to throw 1.596 s] | gen 4.49 % [time to throw 1.719 s]
  sack_rate: flat 3.07 % [time to throw 1.596 s] | gen 2.97 % [time to throw 1.719 s]
  time_to_throw: flat 1.596 seconds | gen 1.719 seconds
  sack_share_of_hit_or_sack: flat 78.20 % [time to throw 1.596 s] | gen 66.06 % [time to throw 1.719 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.596 s] | gen 0.00 % [time to throw 1.719 s]
  release_distribution: flat 1.596 seconds | gen 1.719 seconds
  pressured_share_by_release_bin: flat 20.41 % | gen 25.11 %
  hit_rate_by_release_bin: flat 3.20 % [time to throw 1.596 s] | gen 3.55 % [time to throw 1.719 s]
  hits_on_aimed_throws_per_dropback: flat 0.85 % [time to throw 1.596 s] | gen 1.52 % [time to throw 1.719 s]
  first_pressure_seconds: flat 1.168 seconds | gen 1.313 seconds
  first_forcing_seconds: flat 1.548 seconds | gen 1.685 seconds
  first_arrival_seconds: flat 1.732 seconds | gen 1.796 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.36%, FREE_RUNNER 77.62%, WON_REP 20.02%; gen COUNTER 2.76%, FREE_RUNNER 71.65%, WON_REP 25.59%)
  quick_pressure_share_by_origin: flat 94.06 % | gen 88.48 %
  clean_with_live_won_rep_ticks: flat 0.44 % | gen 0.52 %
  clean_with_live_won_rep_dropbacks: flat 1.17 % | gen 1.48 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 12.93 % | gen 7.59 %
  throwaway_rate_clean: flat 18.26 % | gen 8.11 %
  scramble_rate: flat 2.68 % | gen 0.55 %
  scramble_yards: flat 6.16 yards | gen 7.60 yards
  by_down_fixed_calls: flat 11.55 % | gen 11.17 %
  int_per_aimed_throw: flat 2.67 % | gen 7.73 %
  completion_per_aimed_throw: flat 46.26 % | gen 42.93 %
  forced_throw_share: flat 14.10 % | gen 20.64 %
  completion_by_pocket_status: flat 30.19 % | gen 30.06 %
  qb_season_spread: flat 0.91 pp | gen 3.19 pp
  defence_season_spread: flat 0.00 pp | gen 0.92 pp
  unblocked_pressures_per_100: flat 17.04 per 100 dropbacks | gen 16.97 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 67.87 % [time to throw 1.596 s] | gen 66.54 % [time to throw 1.719 s]
  unblocked_men_per_100: flat 19.32 per 100 dropbacks | gen 19.33 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.77 % | gen 10.40 %
  quick_share_no_free_runner: flat 72.31 % | gen 58.09 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.66 % | gen 7.79 %
  situation_q1q3_last_two: flat 12.59 % | gen 7.28 %
  sack_share_of_contacts_in_out: flat 78.20 % [time to throw 1.596 s] | gen 66.06 % [time to throw 1.719 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.596 s] | gen 0.00 % [time to throw 1.719 s]
  sacker_mix.split.interior: flat 24.76 % [time to throw 1.596 s] | gen 27.55 % [time to throw 1.719 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.60 % [time to throw 1.596 s] | gen 46.68 % [time to throw 1.719 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 27.73 % [time to throw 1.596 s] | gen 25.53 % [time to throw 1.719 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.92 % [time to throw 1.596 s] | gen 0.24 % [time to throw 1.719 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 24.91 % [time to throw 1.596 s] | gen 27.89 % [time to throw 1.719 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.20 % | gen 1.90 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.76 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.20 % | gen 20.82 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.15 % | gen 3.55 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.08 % | gen 18.44 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 8.28 % | gen 7.79 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.97 % | gen 46.02 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.36 % | gen 19.17 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.53 % | gen 41.95 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.03 % | gen 20.72 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.14 % | gen 16.88 %
  nobody_open_share: flat 43.97 % of dropbacks | gen 33.24 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.52 % of dropbacks | gen 11.46 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.57 % of dropbacks | gen 10.85 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.81 % of dropbacks | gen 7.96 % of dropbacks
  nobody_open_share.split.SACK: flat 3.07 % of dropbacks [time to throw 1.596 s] | gen 2.97 % of dropbacks [time to throw 1.719 s]
  clean_checkdown_share: flat 19.55 % of clean aimed throws | gen 6.94 % of clean aimed throws
  clean_later_read_share: flat 15.13 % of clean aimed throws | gen 21.38 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.19, per aimed throw 2.67; forced-throw share 14.10; completion per attempt 38.01, per aimed throw 46.26; INT-source mix CONTESTED_CATCH 89.86, TIPPED_RECOVERY 10.14
      flat PROGRESSION: 20587 aimed, INT 0.35, completion 44.97
      flat RANK_PUSHED: 6784 aimed, INT 11.20, completion 17.36
      flat CHECKDOWN: 9038 aimed, INT 0.15, completion 45.53
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3390 aimed, INT 6.08, completion 29.03
      flat ON_THE_RUN: 145 aimed, INT 8.28, completion 24.14
      flat on the run: clean INT n/a against a real 2.11; pressured INT 8.28 against a real 3.25
    gen: INT per attempt 7.09, per aimed throw 7.73; forced-throw share 20.64; completion per attempt 39.39, per aimed throw 42.93; INT-source mix CONTESTED_CATCH 45.45, TIPPED_RECOVERY 54.55
      gen PROGRESSION: 14590 aimed, INT 2.76, completion 46.02
      gen RANK_PUSHED: 4063 aimed, INT 20.82, completion 19.17
      gen CHECKDOWN: 3242 aimed, INT 3.55, completion 41.95
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3069 aimed, INT 18.44, completion 20.72
      gen ON_THE_RUN: 77 aimed, INT 7.79, completion 16.88
      gen on the run: clean INT n/a against a real 2.11; pressured INT 7.79 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.67, rise -0.08 against an allowed 0.00: PASSES
    flat PROGRESSION: base 0.39 -> arm 0.35, rise -0.04 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.20, rise -0.37 against an allowed 0.00: PASSES
    flat CHECKDOWN: base 0.16 -> arm 0.15, rise -0.01 against an allowed 0.00: PASSES
    flat DESPERATION: base 6.32 -> arm 6.08, rise -0.25 against an allowed 0.00: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 8.28, rise -0.88 against an allowed -0.09: PASSES
    flat by class: PASSES
    gen league-wide: base 7.69 -> arm 7.73, rise 0.04 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.79 -> arm 2.76, rise -0.02 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 20.82, rise 0.14 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 3.55, rise -0.20 against an allowed 0.00: PASSES
    gen DESPERATION: base 18.18 -> arm 18.44, rise 0.26 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 8.45 -> arm 7.79, rise -0.66 against an allowed 0.12: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 1763 | gen 993

== C8 (information, BLOWN_UP alone): release clock the decision tick ==
  time to throw: flat 1.598 s | gen 1.725 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1484 of 51738 dropbacks (2.87 per 100); pressuredSacks 1484; pressured dropbacks 14071 (27.20 per 100) [time to throw 1.598 s]
    gen: sacks 686 of 28284 dropbacks (2.43 per 100); pressuredSacks 686; pressured dropbacks 8462 (29.92 per 100) [time to throw 1.725 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 10.55% | -11.47 against 22.02% (PR #33, FTN only (held)) | -4.91 against 15.46% (main) [time to throw 1.598 s]
    gen: 8.11% | -13.91 against 22.02% (PR #33, FTN only (held)) | -7.35 against 15.46% (main) [time to throw 1.725 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.20 % | gen 29.92 %
  hit_or_sack_rate: flat 3.74 % [time to throw 1.598 s] | gen 3.85 % [time to throw 1.725 s]
  sack_rate: flat 2.87 % [time to throw 1.598 s] | gen 2.43 % [time to throw 1.725 s]
  time_to_throw: flat 1.598 seconds | gen 1.725 seconds
  sack_share_of_hit_or_sack: flat 76.65 % [time to throw 1.598 s] | gen 63.05 % [time to throw 1.725 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.598 s] | gen 0.00 % [time to throw 1.725 s]
  release_distribution: flat 1.598 seconds | gen 1.725 seconds
  pressured_share_by_release_bin: flat 21.75 % | gen 25.97 %
  hit_rate_by_release_bin: flat 4.70 % [time to throw 1.598 s] | gen 4.65 % [time to throw 1.725 s]
  hits_on_aimed_throws_per_dropback: flat 0.87 % [time to throw 1.598 s] | gen 1.42 % [time to throw 1.725 s]
  first_pressure_seconds: flat 1.238 seconds | gen 1.363 seconds
  first_forcing_seconds: flat 1.631 seconds | gen 1.748 seconds
  first_arrival_seconds: flat 1.889 seconds | gen 1.962 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.38%, FREE_RUNNER 77.09%, WON_REP 20.53%; gen COUNTER 2.94%, FREE_RUNNER 71.91%, WON_REP 25.14%)
  quick_pressure_share_by_origin: flat 93.72 % | gen 88.47 %
  clean_with_live_won_rep_ticks: flat 0.41 % | gen 0.53 %
  clean_with_live_won_rep_dropbacks: flat 1.10 % | gen 1.52 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 14.10 % | gen 7.92 %
  throwaway_rate_clean: flat 18.20 % | gen 8.08 %
  scramble_rate: flat 2.17 % | gen 0.52 %
  scramble_yards: flat 6.29 yards | gen 5.40 yards
  by_down_fixed_calls: flat 10.28 % | gen 10.29 %
  int_per_aimed_throw: flat 2.87 % | gen 7.70 %
  completion_per_aimed_throw: flat 46.28 % | gen 43.07 %
  forced_throw_share: flat 14.21 % | gen 20.83 %
  completion_by_pocket_status: flat 30.03 % | gen 30.35 %
  qb_season_spread: flat 0.90 pp | gen 3.38 pp
  defence_season_spread: flat 0.00 pp | gen 1.06 pp
  unblocked_pressures_per_100: flat 16.62 per 100 dropbacks | gen 17.12 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 62.19 % [time to throw 1.598 s] | gen 59.47 % [time to throw 1.725 s]
  unblocked_men_per_100: flat 19.16 per 100 dropbacks | gen 19.42 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.96 % | gen 10.11 %
  quick_share_no_free_runner: flat 71.20 % | gen 57.38 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 14.14 % | gen 6.74 %
  situation_q1q3_last_two: flat 13.77 % | gen 8.40 %
  sack_share_of_contacts_in_out: flat 76.65 % [time to throw 1.598 s] | gen 63.05 % [time to throw 1.725 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.598 s] | gen 0.00 % [time to throw 1.725 s]
  sacker_mix.split.interior: flat 28.64 % [time to throw 1.598 s] | gen 34.32 % [time to throw 1.725 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.60 % [time to throw 1.598 s] | gen 43.42 % [time to throw 1.725 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 25.92 % [time to throw 1.598 s] | gen 22.12 % [time to throw 1.725 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.84 % [time to throw 1.598 s] | gen 0.15 % [time to throw 1.725 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 28.50 % [time to throw 1.598 s] | gen 34.11 % [time to throw 1.725 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.07 % | gen 2.02 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.65 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.23 % | gen 20.71 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.22 % | gen 3.88 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.31 % | gen 18.02 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.85 % | gen 12.90 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.88 % | gen 46.21 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.27 % | gen 19.91 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.72 % | gen 42.31 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.42 % | gen 21.10 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 18.85 % | gen 15.05 %
  nobody_open_share: flat 44.47 % of dropbacks | gen 33.21 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.79 % of dropbacks | gen 11.84 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.73 % of dropbacks | gen 10.91 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.08 % of dropbacks | gen 8.03 % of dropbacks
  nobody_open_share.split.SACK: flat 2.87 % of dropbacks [time to throw 1.598 s] | gen 2.43 % of dropbacks [time to throw 1.725 s]
  clean_checkdown_share: flat 19.43 % of clean aimed throws | gen 7.11 % of clean aimed throws
  clean_later_read_share: flat 15.20 % of clean aimed throws | gen 21.38 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.36, per aimed throw 2.87; forced-throw share 14.21; completion per attempt 37.95, per aimed throw 46.28; INT-source mix CONTESTED_CATCH 90.85, TIPPED_RECOVERY 9.15
      flat PROGRESSION: 20635 aimed, INT 0.36, completion 44.88
      flat RANK_PUSHED: 6781 aimed, INT 12.23, completion 17.27
      flat CHECKDOWN: 9204 aimed, INT 0.22, completion 45.72
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3484 aimed, INT 6.31, completion 28.42
      flat ON_THE_RUN: 191 aimed, INT 7.85, completion 18.85
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.85 against a real 3.25
    gen: INT per attempt 7.06, per aimed throw 7.70; forced-throw share 20.83; completion per attempt 39.50, per aimed throw 43.07; INT-source mix CONTESTED_CATCH 47.21, TIPPED_RECOVERY 52.79
      gen PROGRESSION: 14524 aimed, INT 2.65, completion 46.21
      gen RANK_PUSHED: 4128 aimed, INT 20.71, completion 19.91
      gen CHECKDOWN: 3349 aimed, INT 3.88, completion 42.31
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3086 aimed, INT 18.02, completion 21.10
      gen ON_THE_RUN: 93 aimed, INT 12.90, completion 15.05
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.90 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.87, rise 0.12 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.39 -> arm 0.36, rise -0.04 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 12.23, rise 0.65 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.22, rise 0.05 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 6.31, rise -0.01 against an allowed 0.02: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 7.85, rise -1.31 against an allowed -0.00: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.70, rise 0.00 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.79 -> arm 2.65, rise -0.14 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 20.71, rise 0.03 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 3.88, rise 0.13 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 18.18 -> arm 18.02, rise -0.16 against an allowed 0.02: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 12.90, rise 4.45 against an allowed 0.30: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 4243 | gen 2278

== C9 (information, LOOPER_FREE alone (the untouched exchange with it, AM-2)): release clock the decision tick ==
  time to throw: flat 1.591 s | gen 1.711 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1596 of 51557 dropbacks (3.10 per 100); pressuredSacks 1596; pressured dropbacks 14368 (27.87 per 100) [time to throw 1.591 s]
    gen: sacks 833 of 28119 dropbacks (2.96 per 100); pressuredSacks 833; pressured dropbacks 8605 (30.60 per 100) [time to throw 1.711 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.11% | -10.91 against 22.02% (PR #33, FTN only (held)) | -4.35 against 15.46% (main) [time to throw 1.591 s]
    gen: 9.68% | -12.34 against 22.02% (PR #33, FTN only (held)) | -5.78 against 15.46% (main) [time to throw 1.711 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.87 % | gen 30.60 %
  hit_or_sack_rate: flat 3.94 % [time to throw 1.591 s] | gen 4.30 % [time to throw 1.711 s]
  sack_rate: flat 3.10 % [time to throw 1.591 s] | gen 2.96 % [time to throw 1.711 s]
  time_to_throw: flat 1.591 seconds | gen 1.711 seconds
  sack_share_of_hit_or_sack: flat 78.62 % [time to throw 1.591 s] | gen 68.90 % [time to throw 1.711 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.591 s] | gen 0.00 % [time to throw 1.711 s]
  release_distribution: flat 1.591 seconds | gen 1.711 seconds
  pressured_share_by_release_bin: flat 20.47 % | gen 25.94 %
  hit_rate_by_release_bin: flat 2.81 % [time to throw 1.591 s] | gen 2.71 % [time to throw 1.711 s]
  hits_on_aimed_throws_per_dropback: flat 0.84 % [time to throw 1.591 s] | gen 1.34 % [time to throw 1.711 s]
  first_pressure_seconds: flat 1.128 seconds | gen 1.268 seconds
  first_forcing_seconds: flat 1.507 seconds | gen 1.647 seconds
  first_arrival_seconds: flat 1.712 seconds | gen 1.751 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.25%, FREE_RUNNER 77.87%, WON_REP 19.88%; gen COUNTER 2.60%, FREE_RUNNER 72.53%, WON_REP 24.87%)
  quick_pressure_share_by_origin: flat 94.19 % | gen 88.86 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.56 %
  clean_with_live_won_rep_dropbacks: flat 1.13 % | gen 1.58 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 12.66 % | gen 7.75 %
  throwaway_rate_clean: flat 18.39 % | gen 8.09 %
  scramble_rate: flat 2.71 % | gen 0.56 %
  scramble_yards: flat 6.46 yards | gen 5.82 yards
  by_down_fixed_calls: flat 11.13 % | gen 10.79 %
  int_per_aimed_throw: flat 2.79 % | gen 7.69 %
  completion_per_aimed_throw: flat 46.05 % | gen 43.10 %
  forced_throw_share: flat 15.39 % | gen 21.16 %
  completion_by_pocket_status: flat 30.28 % | gen 30.82 %
  qb_season_spread: flat 0.34 pp | gen 3.67 pp
  defence_season_spread: flat 0.00 pp | gen 0.84 pp
  unblocked_pressures_per_100: flat 17.65 per 100 dropbacks | gen 17.82 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 66.55 % [time to throw 1.591 s] | gen 67.00 % [time to throw 1.711 s]
  unblocked_men_per_100: flat 19.33 per 100 dropbacks | gen 19.46 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.83 % | gen 10.16 %
  quick_share_no_free_runner: flat 72.57 % | gen 58.07 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.31 % | gen 8.01 %
  situation_q1q3_last_two: flat 12.90 % | gen 8.26 %
  sack_share_of_contacts_in_out: flat 78.62 % [time to throw 1.591 s] | gen 68.90 % [time to throw 1.711 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.591 s] | gen 0.00 % [time to throw 1.711 s]
  sacker_mix.split.interior: flat 25.02 % [time to throw 1.591 s] | gen 25.01 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 44.04 % [time to throw 1.591 s] | gen 44.04 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 30.13 % [time to throw 1.591 s] | gen 30.71 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.81 % [time to throw 1.591 s] | gen 0.24 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 25.19 % [time to throw 1.591 s] | gen 25.33 % [time to throw 1.711 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.19 % | gen 2.04 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.39 % | gen 2.79 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.76 % | gen 20.98 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 3.51 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.44 % | gen 18.29 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.09 % | gen 9.23 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.70 % | gen 46.00 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.30 % | gen 19.29 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.43 % | gen 42.48 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.33 % | gen 21.35 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 21.21 % | gen 26.15 %
  nobody_open_share: flat 44.25 % of dropbacks | gen 33.19 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.73 % of dropbacks | gen 11.65 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.63 % of dropbacks | gen 10.59 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.80 % of dropbacks | gen 7.98 % of dropbacks
  nobody_open_share.split.SACK: flat 3.10 % of dropbacks [time to throw 1.591 s] | gen 2.96 % of dropbacks [time to throw 1.711 s]
  clean_checkdown_share: flat 19.67 % of clean aimed throws | gen 6.99 % of clean aimed throws
  clean_later_read_share: flat 15.22 % of clean aimed throws | gen 21.57 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.29, per aimed throw 2.79; forced-throw share 15.39; completion per attempt 37.84, per aimed throw 46.05; INT-source mix CONTESTED_CATCH 90.84, TIPPED_RECOVERY 9.16
      flat PROGRESSION: 20539 aimed, INT 0.39, completion 44.70
      flat RANK_PUSHED: 6676 aimed, INT 11.76, completion 17.30
      flat CHECKDOWN: 9141 aimed, INT 0.18, completion 45.43
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3416 aimed, INT 6.44, completion 29.33
      flat ON_THE_RUN: 132 aimed, INT 9.09, completion 21.21
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.09 against a real 3.25
    gen: INT per attempt 7.06, per aimed throw 7.69; forced-throw share 21.16; completion per attempt 39.53, per aimed throw 43.10; INT-source mix CONTESTED_CATCH 44.93, TIPPED_RECOVERY 55.07
      gen PROGRESSION: 14549 aimed, INT 2.79, completion 46.00
      gen RANK_PUSHED: 4013 aimed, INT 20.98, completion 19.29
      gen CHECKDOWN: 3277 aimed, INT 3.51, completion 42.48
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2979 aimed, INT 18.29, completion 21.35
      gen ON_THE_RUN: 65 aimed, INT 9.23, completion 26.15
      gen on the run: clean INT n/a against a real 2.11; pressured INT 9.23 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.79, rise 0.04 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.39 -> arm 0.39, rise 0.00 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.76, rise 0.19 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.18, rise 0.01 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 6.44, rise 0.12 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 9.16 -> arm 9.09, rise -0.07 against an allowed 0.00: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.69, rise -0.00 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.79 -> arm 2.79, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen RANK_PUSHED: base 20.68 -> arm 20.98, rise 0.30 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 3.51, rise -0.24 against an allowed 0.02: PASSES
    gen DESPERATION: base 18.18 -> arm 18.29, rise 0.12 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 8.45 -> arm 9.23, rise 0.78 against an allowed -0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 3294 | gen 1849

== C10 (information, the late block alone): release clock the decision tick ==
  time to throw: flat 1.604 s | gen 1.726 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1394 of 51485 dropbacks (2.71 per 100); pressuredSacks 1394; pressured dropbacks 12149 (23.60 per 100) [time to throw 1.604 s]
    gen: sacks 772 of 28155 dropbacks (2.74 per 100); pressuredSacks 772; pressured dropbacks 7487 (26.59 per 100) [time to throw 1.726 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.47% | -10.55 against 22.02% (PR #33, FTN only (held)) | -3.99 against 15.46% (main) [time to throw 1.604 s]
    gen: 10.31% | -11.71 against 22.02% (PR #33, FTN only (held)) | -5.15 against 15.46% (main) [time to throw 1.726 s]
  rows (66, both leagues):
  threat_creation_rate: flat 23.60 % | gen 26.59 %
  hit_or_sack_rate: flat 3.45 % [time to throw 1.604 s] | gen 3.94 % [time to throw 1.726 s]
  sack_rate: flat 2.71 % [time to throw 1.604 s] | gen 2.74 % [time to throw 1.726 s]
  time_to_throw: flat 1.604 seconds | gen 1.726 seconds
  sack_share_of_hit_or_sack: flat 78.49 % [time to throw 1.604 s] | gen 69.55 % [time to throw 1.726 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.604 s] | gen 0.00 % [time to throw 1.726 s]
  release_distribution: flat 1.604 seconds | gen 1.726 seconds
  pressured_share_by_release_bin: flat 14.87 % | gen 17.77 %
  hit_rate_by_release_bin: flat 2.38 % [time to throw 1.604 s] | gen 2.29 % [time to throw 1.726 s]
  hits_on_aimed_throws_per_dropback: flat 0.74 % [time to throw 1.604 s] | gen 1.20 % [time to throw 1.726 s]
  first_pressure_seconds: flat 1.152 seconds | gen 1.344 seconds
  first_forcing_seconds: flat 1.497 seconds | gen 1.677 seconds
  first_arrival_seconds: flat 1.687 seconds | gen 1.759 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.30%, FREE_RUNNER 72.37%, WON_REP 24.33%; gen COUNTER 3.61%, FREE_RUNNER 65.95%, WON_REP 30.44%)
  quick_pressure_share_by_origin: flat 89.15 % | gen 81.78 %
  clean_with_live_won_rep_ticks: flat 0.44 % | gen 0.52 %
  clean_with_live_won_rep_dropbacks: flat 1.20 % | gen 1.54 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 12.91 % | gen 8.17 %
  throwaway_rate_clean: flat 18.90 % | gen 8.39 %
  scramble_rate: flat 2.44 % | gen 0.47 %
  scramble_yards: flat 6.64 yards | gen 6.51 yards
  by_down_fixed_calls: flat 10.92 % | gen 11.23 %
  int_per_aimed_throw: flat 2.72 % | gen 7.51 %
  completion_per_aimed_throw: flat 46.33 % | gen 43.58 %
  forced_throw_share: flat 13.59 % | gen 18.70 %
  completion_by_pocket_status: flat 29.37 % | gen 30.23 %
  qb_season_spread: flat 0.85 pp | gen 3.69 pp
  defence_season_spread: flat 0.00 pp | gen 1.53 pp
  unblocked_pressures_per_100: flat 17.52 per 100 dropbacks | gen 17.52 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 76.80 % [time to throw 1.604 s] | gen 74.68 % [time to throw 1.726 s]
  unblocked_men_per_100: flat 19.13 per 100 dropbacks | gen 19.11 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.59 % | gen 10.51 %
  quick_share_no_free_runner: flat 73.06 % | gen 59.96 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.75 % | gen 8.12 %
  situation_q1q3_last_two: flat 11.28 % | gen 8.00 %
  sack_share_of_contacts_in_out: flat 78.49 % [time to throw 1.604 s] | gen 69.55 % [time to throw 1.726 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.604 s] | gen 0.00 % [time to throw 1.726 s]
  sacker_mix.split.interior: flat 27.80 % [time to throw 1.604 s] | gen 32.06 % [time to throw 1.726 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 43.04 % [time to throw 1.604 s] | gen 41.26 % [time to throw 1.726 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 28.19 % [time to throw 1.604 s] | gen 26.36 % [time to throw 1.726 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.97 % [time to throw 1.604 s] | gen 0.32 % [time to throw 1.726 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 27.91 % [time to throw 1.604 s] | gen 32.38 % [time to throw 1.726 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.77 % | gen 3.01 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.33 % | gen 2.75 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.66 % | gen 20.10 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 3.53 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.06 % | gen 17.70 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 4.80 % | gen 16.00 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.12 % | gen 46.58 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.21 % | gen 19.71 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.03 % | gen 42.50 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.95 % | gen 21.26 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 20.00 % | gen 22.67 %
  nobody_open_share: flat 44.36 % of dropbacks | gen 32.91 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.49 % of dropbacks | gen 11.36 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.67 % of dropbacks | gen 10.47 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.49 % of dropbacks | gen 8.34 % of dropbacks
  nobody_open_share.split.SACK: flat 2.71 % of dropbacks [time to throw 1.604 s] | gen 2.74 % of dropbacks [time to throw 1.726 s]
  clean_checkdown_share: flat 19.86 % of clean aimed throws | gen 7.32 % of clean aimed throws
  clean_later_read_share: flat 15.66 % of clean aimed throws | gen 21.75 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.22, per aimed throw 2.72; forced-throw share 13.59; completion per attempt 37.79, per aimed throw 46.33; INT-source mix CONTESTED_CATCH 91.23, TIPPED_RECOVERY 8.77
      flat PROGRESSION: 20536 aimed, INT 0.33, completion 45.12
      flat RANK_PUSHED: 6733 aimed, INT 11.66, completion 17.21
      flat CHECKDOWN: 9005 aimed, INT 0.19, completion 46.03
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3433 aimed, INT 6.06, completion 28.95
      flat ON_THE_RUN: 125 aimed, INT 4.80, completion 20.00
      flat on the run: clean INT n/a against a real 2.11; pressured INT 4.80 against a real 3.25
    gen: INT per attempt 6.86, per aimed throw 7.51; forced-throw share 18.70; completion per attempt 39.82, per aimed throw 43.58; INT-source mix CONTESTED_CATCH 44.46, TIPPED_RECOVERY 55.54
      gen PROGRESSION: 14601 aimed, INT 2.75, completion 46.58
      gen RANK_PUSHED: 4080 aimed, INT 20.10, completion 19.71
      gen CHECKDOWN: 3198 aimed, INT 3.53, completion 42.50
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2949 aimed, INT 17.70, completion 21.26
      gen ON_THE_RUN: 75 aimed, INT 16.00, completion 22.67
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.00 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.72, rise -0.03 against an allowed 0.02: PASSES
    flat PROGRESSION: base 0.39 -> arm 0.33, rise -0.07 against an allowed 0.01: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.66, rise 0.09 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.19, rise 0.02 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 6.06, rise -0.27 against an allowed 0.05: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 4.80, rise -4.36 against an allowed 0.00: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.51, rise -0.19 against an allowed 0.02: PASSES
    gen PROGRESSION: base 2.79 -> arm 2.75, rise -0.03 against an allowed 0.00: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 20.10, rise -0.58 against an allowed 0.03: PASSES
    gen CHECKDOWN: base 3.75 -> arm 3.53, rise -0.21 against an allowed 0.02: PASSES
    gen DESPERATION: base 18.18 -> arm 17.70, rise -0.48 against an allowed 0.08: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 16.00, rise 7.55 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 5188 | gen 2847

== C11 (information, priced for the miss rule's option C; guarded under AM-3): release clock the decision tick ==
  time to throw: flat 1.596 s | gen 1.733 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1461 of 51542 dropbacks (2.83 per 100); pressuredSacks 1461; pressured dropbacks 13074 (25.37 per 100) [time to throw 1.596 s]
    gen: sacks 667 of 28338 dropbacks (2.35 per 100); pressuredSacks 667; pressured dropbacks 8090 (28.55 per 100) [time to throw 1.733 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.17% | -10.85 against 22.02% (PR #33, FTN only (held)) | -4.29 against 15.46% (main) [time to throw 1.596 s]
    gen: 8.24% | -13.78 against 22.02% (PR #33, FTN only (held)) | -7.22 against 15.46% (main) [time to throw 1.733 s]
  rows (66, both leagues):
  threat_creation_rate: flat 25.37 % | gen 28.55 %
  hit_or_sack_rate: flat 3.67 % [time to throw 1.596 s] | gen 3.84 % [time to throw 1.733 s]
  sack_rate: flat 2.83 % [time to throw 1.596 s] | gen 2.35 % [time to throw 1.733 s]
  time_to_throw: flat 1.596 seconds | gen 1.733 seconds
  sack_share_of_hit_or_sack: flat 77.22 % [time to throw 1.596 s] | gen 61.36 % [time to throw 1.733 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.596 s] | gen 0.00 % [time to throw 1.733 s]
  release_distribution: flat 1.596 seconds | gen 1.733 seconds
  pressured_share_by_release_bin: flat 23.01 % | gen 29.28 %
  hit_rate_by_release_bin: flat 4.57 % [time to throw 1.596 s] | gen 4.85 % [time to throw 1.733 s]
  hits_on_aimed_throws_per_dropback: flat 0.84 % [time to throw 1.596 s] | gen 1.48 % [time to throw 1.733 s]
  first_pressure_seconds: flat 1.355 seconds | gen 1.493 seconds
  first_forcing_seconds: flat 1.735 seconds | gen 1.863 seconds
  first_arrival_seconds: flat 1.898 seconds | gen 1.993 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.59%, FREE_RUNNER 75.53%, WON_REP 21.88%; gen COUNTER 2.92%, FREE_RUNNER 69.99%, WON_REP 27.09%)
  quick_pressure_share_by_origin: flat 93.48 % | gen 87.95 %
  clean_with_live_won_rep_ticks: flat 0.42 % | gen 0.51 %
  clean_with_live_won_rep_dropbacks: flat 1.16 % | gen 1.52 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 15.23 % | gen 9.39 %
  throwaway_rate_clean: flat 17.87 % | gen 8.04 %
  scramble_rate: flat 2.30 % | gen 0.47 %
  scramble_yards: flat 5.41 yards | gen 5.17 yards
  by_down_fixed_calls: flat 10.91 % | gen 10.22 %
  int_per_aimed_throw: flat 2.77 % | gen 7.50 %
  completion_per_aimed_throw: flat 46.48 % | gen 43.40 %
  forced_throw_share: flat 12.14 % | gen 19.28 %
  completion_by_pocket_status: flat 28.45 % | gen 29.37 %
  qb_season_spread: flat 0.00 pp | gen 3.83 pp
  defence_season_spread: flat 0.31 pp | gen 0.82 pp
  unblocked_pressures_per_100: flat 16.07 per 100 dropbacks | gen 16.09 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 72.94 % [time to throw 1.596 s] | gen 70.19 % [time to throw 1.733 s]
  unblocked_men_per_100: flat 19.32 per 100 dropbacks | gen 19.43 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.74 % | gen 10.07 %
  quick_share_no_free_runner: flat 71.87 % | gen 57.66 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 14.24 % | gen 9.29 %
  situation_q1q3_last_two: flat 15.09 % | gen 8.58 %
  sack_share_of_contacts_in_out: flat 77.22 % [time to throw 1.596 s] | gen 61.36 % [time to throw 1.733 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.596 s] | gen 0.00 % [time to throw 1.733 s]
  sacker_mix.split.interior: flat 30.41 % [time to throw 1.596 s] | gen 34.57 % [time to throw 1.733 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 47.99 % [time to throw 1.596 s] | gen 46.88 % [time to throw 1.733 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 20.70 % [time to throw 1.596 s] | gen 18.40 % [time to throw 1.733 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.89 % [time to throw 1.596 s] | gen 0.15 % [time to throw 1.733 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.25 % [time to throw 1.596 s] | gen 34.33 % [time to throw 1.733 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.37 % | gen 2.00 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.54 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.86 % | gen 20.47 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 3.88 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.88 % | gen 17.26 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.53 % | gen 13.54 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.30 % | gen 46.56 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.11 % | gen 19.39 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 46.02 % | gen 41.83 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.44 % | gen 20.83 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.63 % | gen 21.88 %
  nobody_open_share: flat 44.19 % of dropbacks | gen 32.54 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.55 % of dropbacks | gen 11.08 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.60 % of dropbacks | gen 10.67 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.20 % of dropbacks | gen 8.42 % of dropbacks
  nobody_open_share.split.SACK: flat 2.83 % of dropbacks [time to throw 1.596 s] | gen 2.35 % of dropbacks [time to throw 1.733 s]
  clean_checkdown_share: flat 19.56 % of clean aimed throws | gen 6.81 % of clean aimed throws
  clean_later_read_share: flat 14.86 % of clean aimed throws | gen 21.52 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.26, per aimed throw 2.77; forced-throw share 12.14; completion per attempt 38.06, per aimed throw 46.48; INT-source mix CONTESTED_CATCH 91.15, TIPPED_RECOVERY 8.85
      flat PROGRESSION: 20635 aimed, INT 0.36, completion 45.30
      flat RANK_PUSHED: 6745 aimed, INT 11.86, completion 17.11
      flat CHECKDOWN: 9048 aimed, INT 0.21, completion 46.02
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3404 aimed, INT 5.88, completion 28.44
      flat ON_THE_RUN: 199 aimed, INT 6.53, completion 25.63
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.53 against a real 3.25
    gen: INT per attempt 6.85, per aimed throw 7.50; forced-throw share 19.28; completion per attempt 39.64, per aimed throw 43.40; INT-source mix CONTESTED_CATCH 44.96, TIPPED_RECOVERY 55.04
      gen PROGRESSION: 14711 aimed, INT 2.54, completion 46.56
      gen RANK_PUSHED: 4177 aimed, INT 20.47, completion 19.39
      gen CHECKDOWN: 3141 aimed, INT 3.88, completion 41.83
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3025 aimed, INT 17.26, completion 20.83
      gen ON_THE_RUN: 96 aimed, INT 13.54, completion 21.88
      gen on the run: clean INT n/a against a real 2.11; pressured INT 13.54 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.77, rise 0.02 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.39 -> arm 0.36, rise -0.03 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.86, rise 0.29 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.21, rise 0.05 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 5.88, rise -0.45 against an allowed -0.01: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 6.53, rise -2.63 against an allowed -0.05: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.50, rise -0.19 against an allowed 0.01: PASSES
    gen PROGRESSION: base 2.79 -> arm 2.54, rise -0.24 against an allowed -0.01: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 20.47, rise -0.21 against an allowed 0.02: PASSES
    gen CHECKDOWN: base 3.75 -> arm 3.88, rise 0.14 against an allowed 0.05: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen DESPERATION: base 18.18 -> arm 17.26, rise -0.92 against an allowed 0.03: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 13.54, rise 5.09 against an allowed 0.33: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 13180 | gen 7343

== C12 (information, reading (a), never offered): release clock the decision tick ==
  time to throw: flat 1.630 s | gen 1.769 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 531 of 52702 dropbacks (1.01 per 100); pressuredSacks 531; pressured dropbacks 7811 (14.82 per 100) [time to throw 1.630 s]
    gen: sacks 279 of 28248 dropbacks (0.99 per 100); pressuredSacks 279; pressured dropbacks 5243 (18.56 per 100) [time to throw 1.769 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 6.80% | -15.22 against 22.02% (PR #33, FTN only (held)) | -8.66 against 15.46% (main) [time to throw 1.630 s]
    gen: 5.32% | -16.70 against 22.02% (PR #33, FTN only (held)) | -10.14 against 15.46% (main) [time to throw 1.769 s]
  rows (66, both leagues):
  threat_creation_rate: flat 14.82 % | gen 18.56 %
  hit_or_sack_rate: flat 1.29 % [time to throw 1.630 s] | gen 1.53 % [time to throw 1.769 s]
  sack_rate: flat 1.01 % [time to throw 1.630 s] | gen 0.99 % [time to throw 1.769 s]
  time_to_throw: flat 1.630 seconds | gen 1.769 seconds
  sack_share_of_hit_or_sack: flat 78.20 % [time to throw 1.630 s] | gen 64.58 % [time to throw 1.769 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.630 s] | gen 0.00 % [time to throw 1.769 s]
  release_distribution: flat 1.630 seconds | gen 1.769 seconds
  pressured_share_by_release_bin: flat 15.05 % | gen 19.63 %
  hit_rate_by_release_bin: flat 1.09 % [time to throw 1.630 s] | gen 1.17 % [time to throw 1.769 s]
  hits_on_aimed_throws_per_dropback: flat 0.28 % [time to throw 1.630 s] | gen 0.54 % [time to throw 1.769 s]
  first_pressure_seconds: flat 1.866 seconds | gen 2.034 seconds
  first_forcing_seconds: flat 2.055 seconds | gen 2.198 seconds
  first_arrival_seconds: flat 2.109 seconds | gen 2.228 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 7.24%, FREE_RUNNER 49.98%, WON_REP 42.78%; gen COUNTER 6.31%, FREE_RUNNER 47.36%, WON_REP 46.33%)
  quick_pressure_share_by_origin: flat 73.56 % | gen 65.53 %
  clean_with_live_won_rep_ticks: flat 0.42 % | gen 0.52 %
  clean_with_live_won_rep_dropbacks: flat 1.28 % | gen 1.70 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 25.39 % | gen 14.99 %
  throwaway_rate_clean: flat 18.44 % | gen 8.12 %
  scramble_rate: flat 0.87 % | gen 0.17 %
  scramble_yards: flat 5.91 yards | gen 6.04 yards
  by_down_fixed_calls: flat 6.48 % | gen 6.59 %
  int_per_aimed_throw: flat 2.73 % | gen 7.72 %
  completion_per_aimed_throw: flat 47.45 % | gen 44.41 %
  forced_throw_share: flat 7.64 % | gen 12.95 %
  completion_by_pocket_status: flat 23.55 % | gen 27.01 %
  qb_season_spread: flat 0.83 pp | gen 3.00 pp
  defence_season_spread: flat 0.00 pp | gen 0.23 pp
  unblocked_pressures_per_100: flat 6.49 per 100 dropbacks | gen 7.53 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 30.49 % [time to throw 1.630 s] | gen 26.16 % [time to throw 1.769 s]
  unblocked_men_per_100: flat 11.68 per 100 dropbacks | gen 12.53 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.96 % | gen 10.51 %
  quick_share_no_free_runner: flat 73.50 % | gen 61.10 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 25.41 % | gen 15.52 %
  situation_q1q3_last_two: flat 23.45 % | gen 16.55 %
  sack_share_of_contacts_in_out: flat 78.20 % [time to throw 1.630 s] | gen 64.58 % [time to throw 1.769 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.630 s] | gen 0.00 % [time to throw 1.769 s]
  sacker_mix.split.interior: flat 57.63 % [time to throw 1.630 s] | gen 64.70 % [time to throw 1.769 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 19.68 % [time to throw 1.630 s] | gen 19.35 % [time to throw 1.769 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.69 % [time to throw 1.630 s] | gen 15.95 % [time to throw 1.769 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat n/a % [time to throw 1.630 s] | gen n/a % [time to throw 1.769 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 57.44 % [time to throw 1.630 s] | gen 64.52 % [time to throw 1.769 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 3.96 % | gen 6.22 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.31 % | gen 2.79 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.85 % | gen 20.87 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 3.72 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.43 % | gen 17.75 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.79 % | gen 20.83 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.55 % | gen 47.19 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.21 % | gen 19.60 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 48.15 % | gen 46.43 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 30.14 % | gen 21.74 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 18.18 % | gen 20.83 %
  nobody_open_share: flat 44.07 % of dropbacks | gen 29.89 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 16.84 % of dropbacks | gen 9.13 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.75 % of dropbacks | gen 10.37 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 19.47 % of dropbacks | gen 9.40 % of dropbacks
  nobody_open_share.split.SACK: flat 1.01 % of dropbacks [time to throw 1.630 s] | gen 0.99 % of dropbacks [time to throw 1.769 s]
  clean_checkdown_share: flat 20.04 % of clean aimed throws | gen 7.04 % of clean aimed throws
  clean_later_read_share: flat 15.52 % of clean aimed throws | gen 21.46 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.19, per aimed throw 2.73; forced-throw share 7.64; completion per attempt 38.03, per aimed throw 47.45; INT-source mix CONTESTED_CATCH 91.09, TIPPED_RECOVERY 8.91
      flat PROGRESSION: 21733 aimed, INT 0.31, completion 45.55
      flat RANK_PUSHED: 7165 aimed, INT 11.85, completion 17.21
      flat CHECKDOWN: 8876 aimed, INT 0.18, completion 48.15
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3557 aimed, INT 5.43, completion 30.14
      flat ON_THE_RUN: 121 aimed, INT 5.79, completion 18.18
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.79 against a real 3.25
    gen: INT per attempt 6.99, per aimed throw 7.72; forced-throw share 12.95; completion per attempt 40.19, per aimed throw 44.41; INT-source mix CONTESTED_CATCH 43.77, TIPPED_RECOVERY 56.23
      gen PROGRESSION: 15422 aimed, INT 2.79, completion 47.19
      gen RANK_PUSHED: 4312 aimed, INT 20.87, completion 19.60
      gen CHECKDOWN: 2580 aimed, INT 3.72, completion 46.43
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2930 aimed, INT 17.75, completion 21.74
      gen ON_THE_RUN: 24 aimed, INT 20.83, completion 20.83
      gen on the run: clean INT n/a against a real 2.11; pressured INT 20.83 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.73, rise -0.02 against an allowed 0.03: PASSES
    flat PROGRESSION: base 0.39 -> arm 0.31, rise -0.08 against an allowed 0.01: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.85, rise 0.28 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.18, rise 0.02 against an allowed 0.05: PASSES
    flat DESPERATION: base 6.32 -> arm 5.43, rise -0.90 against an allowed 0.07: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 5.79, rise -3.38 against an allowed 0.16: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.72, rise 0.03 against an allowed 0.06: PASSES
    gen PROGRESSION: base 2.79 -> arm 2.79, rise 0.00 against an allowed 0.01: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 20.87, rise 0.19 against an allowed 0.07: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 3.72, rise -0.03 against an allowed 0.24: PASSES
    gen DESPERATION: base 18.18 -> arm 17.75, rise -0.43 against an allowed 0.17: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 20.83, rise 12.38 against an allowed 0.15: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 13350 | gen 7297

== C13 (contrast only: revision 1's uniform delay, never offered for a man nobody touched): release clock the decision tick ==
  time to throw: flat 1.639 s | gen 1.783 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 468 of 52844 dropbacks (0.89 per 100); pressuredSacks 468; pressured dropbacks 7083 (13.40 per 100) [time to throw 1.639 s]
    gen: sacks 267 of 28398 dropbacks (0.94 per 100); pressuredSacks 267; pressured dropbacks 4605 (16.22 per 100) [time to throw 1.783 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 6.61% | -15.41 against 22.02% (PR #33, FTN only (held)) | -8.85 against 15.46% (main) [time to throw 1.639 s]
    gen: 5.80% | -16.22 against 22.02% (PR #33, FTN only (held)) | -9.66 against 15.46% (main) [time to throw 1.783 s]
  rows (66, both leagues):
  threat_creation_rate: flat 13.40 % | gen 16.22 %
  hit_or_sack_rate: flat 1.10 % [time to throw 1.639 s] | gen 1.39 % [time to throw 1.783 s]
  sack_rate: flat 0.89 % [time to throw 1.639 s] | gen 0.94 % [time to throw 1.783 s]
  time_to_throw: flat 1.639 seconds | gen 1.783 seconds
  sack_share_of_hit_or_sack: flat 80.83 % [time to throw 1.639 s] | gen 67.59 % [time to throw 1.783 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.639 s] | gen 0.00 % [time to throw 1.783 s]
  release_distribution: flat 1.639 seconds | gen 1.783 seconds
  pressured_share_by_release_bin: flat 8.04 % | gen 10.49 %
  hit_rate_by_release_bin: flat 0.90 % [time to throw 1.639 s] | gen 0.96 % [time to throw 1.783 s]
  hits_on_aimed_throws_per_dropback: flat 0.21 % [time to throw 1.639 s] | gen 0.45 % [time to throw 1.783 s]
  first_pressure_seconds: flat 1.803 seconds | gen 1.985 seconds
  first_forcing_seconds: flat 1.729 seconds | gen 2.158 seconds
  first_arrival_seconds: flat 1.898 seconds | gen 2.130 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 5.60%, FREE_RUNNER 44.33%, WON_REP 50.07%; gen COUNTER 5.45%, FREE_RUNNER 39.52%, WON_REP 55.03%)
  quick_pressure_share_by_origin: flat 64.86 % | gen 58.31 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.52 %
  clean_with_live_won_rep_dropbacks: flat 1.32 % | gen 1.73 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 21.54 % | gen 12.10 %
  throwaway_rate_clean: flat 18.99 % | gen 8.57 %
  scramble_rate: flat 0.78 % | gen 0.14 %
  scramble_yards: flat 7.03 yards | gen 1.95 yards
  by_down_fixed_calls: flat 6.21 % | gen 7.82 %
  int_per_aimed_throw: flat 2.76 % | gen 7.79 %
  completion_per_aimed_throw: flat 47.42 % | gen 44.51 %
  forced_throw_share: flat 6.74 % | gen 10.74 %
  completion_by_pocket_status: flat 25.64 % | gen 28.58 %
  qb_season_spread: flat 0.95 pp | gen 2.71 pp
  defence_season_spread: flat 0.87 pp | gen 0.90 pp
  unblocked_pressures_per_100: flat 6.08 per 100 dropbacks | gen 6.10 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 20.21 % [time to throw 1.639 s] | gen 23.04 % [time to throw 1.783 s]
  unblocked_men_per_100: flat 19.36 per 100 dropbacks | gen 19.17 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.09 % | gen 10.54 %
  quick_share_no_free_runner: flat 72.47 % | gen 60.03 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 21.73 % | gen 13.36 %
  situation_q1q3_last_two: flat 21.47 % | gen 10.88 %
  sack_share_of_contacts_in_out: flat 80.83 % [time to throw 1.639 s] | gen 67.59 % [time to throw 1.783 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.639 s] | gen 0.00 % [time to throw 1.783 s]
  sacker_mix.split.interior: flat 65.17 % [time to throw 1.639 s] | gen 61.67 % [time to throw 1.783 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 12.82 % [time to throw 1.639 s] | gen 13.30 % [time to throw 1.783 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.01 % [time to throw 1.639 s] | gen 24.84 % [time to throw 1.783 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat n/a % [time to throw 1.639 s] | gen 0.19 % [time to throw 1.783 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 65.17 % [time to throw 1.639 s] | gen 61.05 % [time to throw 1.783 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 3.24 % | gen 4.51 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.73 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.74 % | gen 21.69 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 3.00 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.75 % | gen 17.76 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.15 % | gen 23.33 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.48 % | gen 47.10 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.46 % | gen 20.02 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 48.37 % | gen 45.92 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.90 % | gen 23.04 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.62 % | gen 26.67 %
  nobody_open_share: flat 43.89 % of dropbacks | gen 29.51 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 16.80 % of dropbacks | gen 9.16 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.87 % of dropbacks | gen 10.27 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 19.33 % of dropbacks | gen 9.15 % of dropbacks
  nobody_open_share.split.SACK: flat 0.89 % of dropbacks [time to throw 1.639 s] | gen 0.94 % of dropbacks [time to throw 1.783 s]
  clean_checkdown_share: flat 20.17 % of clean aimed throws | gen 7.28 % of clean aimed throws
  clean_later_read_share: flat 15.65 % of clean aimed throws | gen 22.16 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.22, per aimed throw 2.76; forced-throw share 6.74; completion per attempt 38.10, per aimed throw 47.42; INT-source mix CONTESTED_CATCH 91.59, TIPPED_RECOVERY 8.41
      flat PROGRESSION: 21967 aimed, INT 0.35, completion 45.48
      flat RANK_PUSHED: 7205 aimed, INT 11.74, completion 17.46
      flat CHECKDOWN: 8878 aimed, INT 0.21, completion 48.37
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3632 aimed, INT 5.75, completion 29.90
      flat ON_THE_RUN: 65 aimed, INT 6.15, completion 24.62
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.15 against a real 3.25
    gen: INT per attempt 7.07, per aimed throw 7.79; forced-throw share 10.74; completion per attempt 40.40, per aimed throw 44.51; INT-source mix CONTESTED_CATCH 44.38, TIPPED_RECOVERY 55.62
      gen PROGRESSION: 15530 aimed, INT 2.73, completion 47.10
      gen RANK_PUSHED: 4416 aimed, INT 21.69, completion 20.02
      gen CHECKDOWN: 2600 aimed, INT 3.00, completion 45.92
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2917 aimed, INT 17.76, completion 23.04
      gen ON_THE_RUN: 30 aimed, INT 23.33, completion 26.67
      gen on the run: clean INT n/a against a real 2.11; pressured INT 23.33 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.76, rise 0.01 against an allowed 0.04: PASSES
    flat PROGRESSION: base 0.39 -> arm 0.35, rise -0.05 against an allowed 0.03: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.74, rise 0.17 against an allowed 0.07: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.21, rise 0.05 against an allowed 0.04: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 5.75, rise -0.57 against an allowed 0.12: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 6.15, rise -3.01 against an allowed 0.15: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.79, rise 0.09 against an allowed 0.08: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.79 -> arm 2.73, rise -0.06 against an allowed 0.03: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 21.69, rise 1.01 against an allowed 0.11: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 3.00, rise -0.75 against an allowed 0.22: PASSES
    gen DESPERATION: base 18.18 -> arm 17.76, rise -0.42 against an allowed 0.25: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 23.33, rise 14.88 against an allowed 0.27: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 52844 | gen 28398

== C15 (information, priced for the miss rule's option A): release clock the decision tick ==
  time to throw: flat 1.627 s | gen 1.778 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 706 of 52224 dropbacks (1.35 per 100); pressuredSacks 706; pressured dropbacks 7574 (14.50 per 100) [time to throw 1.627 s]
    gen: sacks 364 of 28294 dropbacks (1.29 per 100); pressuredSacks 364; pressured dropbacks 4924 (17.40 per 100) [time to throw 1.778 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 9.32% | -12.70 against 22.02% (PR #33, FTN only (held)) | -6.14 against 15.46% (main) [time to throw 1.627 s]
    gen: 7.39% | -14.63 against 22.02% (PR #33, FTN only (held)) | -8.07 against 15.46% (main) [time to throw 1.778 s]
  rows (66, both leagues):
  threat_creation_rate: flat 14.50 % | gen 17.40 %
  hit_or_sack_rate: flat 1.71 % [time to throw 1.627 s] | gen 1.99 % [time to throw 1.778 s]
  sack_rate: flat 1.35 % [time to throw 1.627 s] | gen 1.29 % [time to throw 1.778 s]
  time_to_throw: flat 1.627 seconds | gen 1.778 seconds
  sack_share_of_hit_or_sack: flat 79.15 % [time to throw 1.627 s] | gen 64.65 % [time to throw 1.778 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.627 s] | gen 0.00 % [time to throw 1.778 s]
  release_distribution: flat 1.627 seconds | gen 1.778 seconds
  pressured_share_by_release_bin: flat 12.01 % | gen 15.44 %
  hit_rate_by_release_bin: flat 1.74 % [time to throw 1.627 s] | gen 2.00 % [time to throw 1.778 s]
  hits_on_aimed_throws_per_dropback: flat 0.36 % [time to throw 1.627 s] | gen 0.70 % [time to throw 1.778 s]
  first_pressure_seconds: flat 1.607 seconds | gen 1.822 seconds
  first_forcing_seconds: flat 1.873 seconds | gen 2.049 seconds
  first_arrival_seconds: flat 1.928 seconds | gen 2.052 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 6.23%, FREE_RUNNER 47.42%, WON_REP 46.36%; gen COUNTER 5.67%, FREE_RUNNER 42.12%, WON_REP 52.21%)
  quick_pressure_share_by_origin: flat 82.19 % | gen 72.58 %
  clean_with_live_won_rep_ticks: flat 0.45 % | gen 0.54 %
  clean_with_live_won_rep_dropbacks: flat 1.37 % | gen 1.79 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 18.71 % | gen 11.68 %
  throwaway_rate_clean: flat 18.86 % | gen 8.38 %
  scramble_rate: flat 1.14 % | gen 0.25 %
  scramble_yards: flat 5.48 yards | gen 5.79 yards
  by_down_fixed_calls: flat 9.88 % | gen 8.48 %
  int_per_aimed_throw: flat 2.91 % | gen 7.68 %
  completion_per_aimed_throw: flat 47.52 % | gen 44.45 %
  forced_throw_share: flat 7.31 % | gen 12.10 %
  completion_by_pocket_status: flat 27.38 % | gen 28.00 %
  qb_season_spread: flat 1.28 pp | gen 3.85 pp
  defence_season_spread: flat 0.00 pp | gen 0.45 pp
  unblocked_pressures_per_100: flat 6.07 per 100 dropbacks | gen 5.99 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 47.98 % [time to throw 1.627 s] | gen 41.39 % [time to throw 1.778 s]
  unblocked_men_per_100: flat 7.55 per 100 dropbacks | gen 7.42 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.30 % | gen 10.65 %
  quick_share_no_free_runner: flat 72.44 % | gen 59.04 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 17.62 % | gen 13.09 %
  situation_q1q3_last_two: flat 16.16 % | gen 14.09 %
  sack_share_of_contacts_in_out: flat 79.15 % [time to throw 1.627 s] | gen 64.65 % [time to throw 1.778 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.627 s] | gen 0.00 % [time to throw 1.778 s]
  sacker_mix.split.interior: flat 44.76 % [time to throw 1.627 s] | gen 49.18 % [time to throw 1.778 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 30.38 % [time to throw 1.627 s] | gen 29.53 % [time to throw 1.778 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 23.87 % [time to throw 1.627 s] | gen 21.02 % [time to throw 1.778 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.99 % [time to throw 1.627 s] | gen 0.27 % [time to throw 1.778 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 44.33 % [time to throw 1.627 s] | gen 48.63 % [time to throw 1.778 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 3.21 % | gen 4.63 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.31 % | gen 2.76 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.49 % | gen 20.57 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.20 % | gen 3.58 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.16 % | gen 17.72 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 8.77 % | gen 23.26 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.67 % | gen 47.18 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.89 % | gen 18.90 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 48.64 % | gen 46.74 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.82 % | gen 22.61 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 26.32 % | gen 18.60 %
  nobody_open_share: flat 43.92 % of dropbacks | gen 30.12 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 16.98 % of dropbacks | gen 9.38 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.75 % of dropbacks | gen 10.49 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 18.84 % of dropbacks | gen 8.96 % of dropbacks
  nobody_open_share.split.SACK: flat 1.35 % of dropbacks [time to throw 1.627 s] | gen 1.29 % of dropbacks [time to throw 1.778 s]
  clean_checkdown_share: flat 19.88 % of clean aimed throws | gen 7.01 % of clean aimed throws
  clean_later_read_share: flat 15.44 % of clean aimed throws | gen 22.06 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.35, per aimed throw 2.91; forced-throw share 7.31; completion per attempt 38.34, per aimed throw 47.52; INT-source mix CONTESTED_CATCH 90.31, TIPPED_RECOVERY 9.69
      flat PROGRESSION: 21498 aimed, INT 0.31, completion 45.67
      flat RANK_PUSHED: 7083 aimed, INT 12.49, completion 16.89
      flat CHECKDOWN: 8868 aimed, INT 0.20, completion 48.64
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3524 aimed, INT 6.16, completion 29.82
      flat ON_THE_RUN: 114 aimed, INT 8.77, completion 26.32
      flat on the run: clean INT n/a against a real 2.11; pressured INT 8.77 against a real 3.25
    gen: INT per attempt 6.98, per aimed throw 7.68; forced-throw share 12.10; completion per attempt 40.41, per aimed throw 44.45; INT-source mix CONTESTED_CATCH 45.37, TIPPED_RECOVERY 54.63
      gen PROGRESSION: 15332 aimed, INT 2.76, completion 47.18
      gen RANK_PUSHED: 4327 aimed, INT 20.57, completion 18.90
      gen CHECKDOWN: 2655 aimed, INT 3.58, completion 46.74
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2968 aimed, INT 17.72, completion 22.61
      gen ON_THE_RUN: 43 aimed, INT 23.26, completion 18.60
      gen on the run: clean INT n/a against a real 2.11; pressured INT 23.26 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.91, rise 0.16 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.39 -> arm 0.31, rise -0.08 against an allowed 0.02: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 12.49, rise 0.92 against an allowed 0.04: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.16 -> arm 0.20, rise 0.04 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 6.16, rise -0.17 against an allowed 0.07: PASSES
    flat ON_THE_RUN: base 9.16 -> arm 8.77, rise -0.39 against an allowed -0.04: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.68, rise -0.02 against an allowed 0.06: PASSES
    gen PROGRESSION: base 2.79 -> arm 2.76, rise -0.03 against an allowed 0.02: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 20.57, rise -0.11 against an allowed 0.08: PASSES
    gen CHECKDOWN: base 3.75 -> arm 3.58, rise -0.17 against an allowed 0.18: PASSES
    gen DESPERATION: base 18.18 -> arm 17.72, rise -0.46 against an allowed 0.17: PASSES
    gen ON_THE_RUN: base 8.45 -> arm 23.26, rise 14.81 against an allowed 0.32: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 17209 | gen 9302

== C16 (information, the climb lane alone): release clock the decision tick ==
  time to throw: flat 1.582 s | gen 1.713 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1830 of 50907 dropbacks (3.59 per 100); pressuredSacks 1830; pressured dropbacks 14168 (27.83 per 100) [time to throw 1.582 s]
    gen: sacks 951 of 28045 dropbacks (3.39 per 100); pressuredSacks 951; pressured dropbacks 8584 (30.61 per 100) [time to throw 1.713 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 12.92% | -9.10 against 22.02% (PR #33, FTN only (held)) | -2.54 against 15.46% (main) [time to throw 1.582 s]
    gen: 11.08% | -10.94 against 22.02% (PR #33, FTN only (held)) | -4.38 against 15.46% (main) [time to throw 1.713 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.83 % | gen 30.61 %
  hit_or_sack_rate: flat 4.51 % [time to throw 1.582 s] | gen 5.09 % [time to throw 1.713 s]
  sack_rate: flat 3.59 % [time to throw 1.582 s] | gen 3.39 % [time to throw 1.713 s]
  time_to_throw: flat 1.582 seconds | gen 1.713 seconds
  sack_share_of_hit_or_sack: flat 79.67 % [time to throw 1.582 s] | gen 66.64 % [time to throw 1.713 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.582 s] | gen 0.00 % [time to throw 1.713 s]
  release_distribution: flat 1.582 seconds | gen 1.713 seconds
  pressured_share_by_release_bin: flat 18.02 % | gen 24.19 %
  hit_rate_by_release_bin: flat 3.64 % [time to throw 1.582 s] | gen 4.42 % [time to throw 1.713 s]
  hits_on_aimed_throws_per_dropback: flat 0.92 % [time to throw 1.582 s] | gen 1.70 % [time to throw 1.713 s]
  first_pressure_seconds: flat 1.115 seconds | gen 1.261 seconds
  first_forcing_seconds: flat 1.498 seconds | gen 1.636 seconds
  first_arrival_seconds: flat 1.713 seconds | gen 1.787 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.28%, FREE_RUNNER 77.82%, WON_REP 19.90%; gen COUNTER 2.59%, FREE_RUNNER 72.43%, WON_REP 24.98%)
  quick_pressure_share_by_origin: flat 94.21 % | gen 88.43 %
  clean_with_live_won_rep_ticks: flat 0.44 % | gen 0.56 %
  clean_with_live_won_rep_dropbacks: flat 1.15 % | gen 1.59 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 10.77 % | gen 6.50 %
  throwaway_rate_clean: flat 18.08 % | gen 8.20 %
  scramble_rate: flat 3.12 % | gen 0.62 %
  scramble_yards: flat 6.19 yards | gen 4.75 yards
  by_down_fixed_calls: flat 13.39 % | gen 11.02 %
  int_per_aimed_throw: flat 2.75 % | gen 7.68 %
  completion_per_aimed_throw: flat 46.19 % | gen 42.93 %
  forced_throw_share: flat 15.59 % | gen 21.51 %
  completion_by_pocket_status: flat 30.77 % | gen 30.86 %
  qb_season_spread: flat 0.40 pp | gen 4.06 pp
  defence_season_spread: flat 0.00 pp | gen 0.99 pp
  unblocked_pressures_per_100: flat 17.68 per 100 dropbacks | gen 17.75 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 70.70 % [time to throw 1.582 s] | gen 72.25 % [time to throw 1.713 s]
  unblocked_men_per_100: flat 19.32 per 100 dropbacks | gen 19.32 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.84 % | gen 10.06 %
  quick_share_no_free_runner: flat 72.76 % | gen 56.90 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 9.86 % | gen 6.96 %
  situation_q1q3_last_two: flat 10.88 % | gen 7.72 %
  sack_share_of_contacts_in_out: flat 79.67 % [time to throw 1.582 s] | gen 66.64 % [time to throw 1.713 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.582 s] | gen 0.00 % [time to throw 1.713 s]
  sacker_mix.split.interior: flat 21.66 % [time to throw 1.582 s] | gen 22.59 % [time to throw 1.713 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 51.17 % [time to throw 1.582 s] | gen 52.24 % [time to throw 1.713 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 26.54 % [time to throw 1.582 s] | gen 24.96 % [time to throw 1.713 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.63 % [time to throw 1.582 s] | gen 0.21 % [time to throw 1.713 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 21.91 % [time to throw 1.582 s] | gen 22.82 % [time to throw 1.713 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.13 % | gen 2.06 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.34 % | gen 2.74 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.49 % | gen 20.94 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.60 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.57 % | gen 18.20 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.76 % | gen 8.60 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.75 % | gen 46.12 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.45 % | gen 19.10 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.49 % | gen 41.58 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.44 % | gen 20.42 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 18.90 % | gen 22.58 %
  nobody_open_share: flat 43.85 % of dropbacks | gen 33.46 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.54 % of dropbacks | gen 11.79 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.67 % of dropbacks | gen 10.60 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.05 % of dropbacks | gen 7.68 % of dropbacks
  nobody_open_share.split.SACK: flat 3.59 % of dropbacks [time to throw 1.582 s] | gen 3.39 % of dropbacks [time to throw 1.713 s]
  clean_checkdown_share: flat 19.46 % of clean aimed throws | gen 6.92 % of clean aimed throws
  clean_later_read_share: flat 15.16 % of clean aimed throws | gen 21.54 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.28, per aimed throw 2.75; forced-throw share 15.59; completion per attempt 38.24, per aimed throw 46.19; INT-source mix CONTESTED_CATCH 90.39, TIPPED_RECOVERY 9.61
      flat PROGRESSION: 20232 aimed, INT 0.34, completion 44.75
      flat RANK_PUSHED: 6603 aimed, INT 11.49, completion 17.45
      flat CHECKDOWN: 8930 aimed, INT 0.17, completion 45.49
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3393 aimed, INT 6.57, completion 29.44
      flat ON_THE_RUN: 164 aimed, INT 9.76, completion 18.90
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.76 against a real 3.25
    gen: INT per attempt 7.06, per aimed throw 7.68; forced-throw share 21.51; completion per attempt 39.50, per aimed throw 42.93; INT-source mix CONTESTED_CATCH 46.24, TIPPED_RECOVERY 53.76
      gen PROGRESSION: 14394 aimed, INT 2.74, completion 46.12
      gen RANK_PUSHED: 4001 aimed, INT 20.94, completion 19.10
      gen CHECKDOWN: 3307 aimed, INT 3.60, completion 41.58
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2972 aimed, INT 18.20, completion 20.42
      gen ON_THE_RUN: 93 aimed, INT 8.60, completion 22.58
      gen on the run: clean INT n/a against a real 2.11; pressured INT 8.60 against a real 3.25
    the filed guard against B3 (pocket-1.s2, step 2's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.75 -> arm 2.75, rise 0.00 against an allowed -0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.39 -> arm 0.34, rise -0.05 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.57 -> arm 11.49, rise -0.08 against an allowed 0.00: PASSES
    flat CHECKDOWN: base 0.16 -> arm 0.17, rise 0.00 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat DESPERATION: base 6.32 -> arm 6.57, rise 0.25 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 9.16 -> arm 9.76, rise 0.60 against an allowed -0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.69 -> arm 7.68, rise -0.02 against an allowed 0.00: PASSES
    gen PROGRESSION: base 2.79 -> arm 2.74, rise -0.04 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 20.68 -> arm 20.94, rise 0.26 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.75 -> arm 3.60, rise -0.15 against an allowed -0.01: PASSES
    gen DESPERATION: base 18.18 -> arm 18.20, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 8.45 -> arm 8.60, rise 0.15 against an allowed 0.08: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B3 (pocket-1.s2, step 2's design, re-played): flat 710 | gen 303
```

### B6 (B3 with the stand-in hold, re-played; pricing arm) with C2, seed set 2

```text
ADR-089 step 3: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== B6 (B3 with the stand-in hold, re-played; pricing arm) (the base arm): release clock the decision tick ==
  time to throw: flat 2.746 s | gen 2.719 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 3690 of 48326 dropbacks (7.64 per 100); pressuredSacks 3690; pressured dropbacks 21032 (43.52 per 100) [time to throw 2.746 s]
    gen: sacks 2622 of 26474 dropbacks (9.90 per 100); pressuredSacks 2572; pressured dropbacks 11863 (44.81 per 100) [time to throw 2.719 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 17.54% | -4.48 against 22.02% (PR #33, FTN only (held)) | 2.08 against 15.46% (main) [time to throw 2.746 s]
    gen: 21.68% | -0.34 against 22.02% (PR #33, FTN only (held)) | 6.22 against 15.46% (main) [time to throw 2.719 s]
  rows (66, both leagues):
  threat_creation_rate: flat 43.52 % | gen 44.81 %
  hit_or_sack_rate: flat 9.58 % [time to throw 2.746 s] | gen 13.97 % [time to throw 2.719 s]
  sack_rate: flat 7.64 % [time to throw 2.746 s] | gen 9.90 % [time to throw 2.719 s]
  time_to_throw: flat 2.746 seconds | gen 2.719 seconds
  sack_share_of_hit_or_sack: flat 79.66 % [time to throw 2.746 s] | gen 70.88 % [time to throw 2.719 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.746 s] | gen 0.00 % [time to throw 2.719 s]
  release_distribution: flat 2.746 seconds | gen 2.719 seconds
  pressured_share_by_release_bin: flat 46.16 % | gen 50.57 %
  hit_rate_by_release_bin: flat 8.35 % [time to throw 2.746 s] | gen 12.88 % [time to throw 2.719 s]
  hits_on_aimed_throws_per_dropback: flat 1.95 % [time to throw 2.746 s] | gen 4.07 % [time to throw 2.719 s]
  first_pressure_seconds: flat 1.667 seconds | gen 1.742 seconds
  first_forcing_seconds: flat 1.958 seconds | gen 2.038 seconds
  first_arrival_seconds: flat 1.813 seconds | gen 1.829 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 4.42%, FREE_RUNNER 57.49%, WON_REP 38.08%; gen COUNTER 4.09%, FREE_RUNNER 56.23%, WON_REP 39.68%)
  quick_pressure_share_by_origin: flat 73.57 % | gen 71.88 %
  clean_with_live_won_rep_ticks: flat 0.85 % | gen 0.85 %
  clean_with_live_won_rep_dropbacks: flat 3.51 % | gen 3.55 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 17.97 % | gen 12.73 %
  throwaway_rate_clean: flat 14.90 % | gen 6.42 %
  scramble_rate: flat 6.96 % | gen 2.07 %
  scramble_yards: flat 6.76 yards | gen 5.45 yards
  by_down_fixed_calls: flat 17.61 % | gen 22.63 %
  int_per_aimed_throw: flat 2.82 % | gen 7.65 %
  completion_per_aimed_throw: flat 43.09 % | gen 41.37 %
  forced_throw_share: flat 24.48 % | gen 29.48 %
  completion_by_pocket_status: flat 24.76 % | gen 26.14 %
  qb_season_spread: flat 0.64 pp | gen 3.14 pp
  defence_season_spread: flat 0.81 pp | gen 0.68 pp
  unblocked_pressures_per_100: flat 19.13 per 100 dropbacks | gen 19.19 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 65.57 % [time to throw 2.746 s] | gen 65.72 % [time to throw 2.719 s]
  unblocked_men_per_100: flat 19.17 per 100 dropbacks | gen 19.21 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 22.01 % | gen 24.69 %
  quick_share_no_free_runner: flat 36.57 % | gen 34.83 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 16.70 % | gen 13.77 %
  situation_q1q3_last_two: flat 18.62 % | gen 13.16 %
  sack_share_of_contacts_in_out: flat 79.65 % [time to throw 2.746 s] | gen 70.87 % [time to throw 2.719 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.746 s] | gen 1.91 % [time to throw 2.719 s]
  sacker_mix.split.interior: flat 26.72 % [time to throw 2.746 s] | gen 25.26 % [time to throw 2.719 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 40.32 % [time to throw 2.746 s] | gen 38.43 % [time to throw 2.719 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 32.39 % [time to throw 2.746 s] | gen 36.01 % [time to throw 2.719 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.57 % [time to throw 2.746 s] | gen 0.29 % [time to throw 2.719 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 26.91 % [time to throw 2.746 s] | gen 25.50 % [time to throw 2.719 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 4.00 % | gen 4.40 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.28 % | gen 2.40 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.31 % | gen 20.34 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 4.13 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.06 % | gen 18.49 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.94 % | gen 14.29 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.80 % | gen 45.35 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.10 % | gen 17.67 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.45 % | gen 35.83 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.82 % | gen 19.48 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 18.06 % | gen 25.00 %
  nobody_open_share: flat 38.07 % of dropbacks | gen 38.11 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 8.53 % of dropbacks | gen 8.97 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.67 % of dropbacks | gen 9.99 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.24 % of dropbacks | gen 9.25 % of dropbacks
  nobody_open_share.split.SACK: flat 7.64 % of dropbacks [time to throw 2.746 s] | gen 9.90 % of dropbacks [time to throw 2.719 s]
  clean_checkdown_share: flat 5.33 % of clean aimed throws | gen 2.57 % of clean aimed throws
  clean_later_read_share: flat 22.26 % of clean aimed throws | gen 25.83 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.28, per aimed throw 2.82; forced-throw share 24.48; completion per attempt 34.89, per aimed throw 43.09; INT-source mix CONTESTED_CATCH 89.18, TIPPED_RECOVERY 10.82
      flat PROGRESSION: 20204 aimed, INT 0.28, completion 42.80
      flat RANK_PUSHED: 6218 aimed, INT 11.31, completion 17.10
      flat CHECKDOWN: 4120 aimed, INT 0.19, completion 38.45
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2740 aimed, INT 6.06, completion 24.82
      flat ON_THE_RUN: 144 aimed, INT 6.94, completion 18.06
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.94 against a real 3.25
    gen: INT per attempt 6.84, per aimed throw 7.65; forced-throw share 29.48; completion per attempt 37.03, per aimed throw 41.37; INT-source mix CONTESTED_CATCH 46.33, TIPPED_RECOVERY 53.67
      gen PROGRESSION: 12312 aimed, INT 2.40, completion 45.35
      gen RANK_PUSHED: 3441 aimed, INT 20.34, completion 17.67
      gen CHECKDOWN: 2375 aimed, INT 4.13, completion 35.83
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2644 aimed, INT 18.49, completion 19.48
      gen ON_THE_RUN: 84 aimed, INT 14.29, completion 25.00
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.29 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== C2 (pricing arm, never a design value): release clock the decision tick ==
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
    the filed guard against B6 (B3 with the stand-in hold, re-played; pricing arm) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.82 -> arm 2.82, rise -0.00 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat PROGRESSION: base 0.28 -> arm 0.25, rise -0.02 against an allowed -0.02: PASSES
    flat RANK_PUSHED: base 11.31 -> arm 11.29, rise -0.02 against an allowed 0.00: PASSES
    flat CHECKDOWN: base 0.19 -> arm 0.20, rise 0.00 against an allowed 0.03: PASSES
    flat DESPERATION: base 6.06 -> arm 6.28, rise 0.22 against an allowed 0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat ON_THE_RUN: base 6.94 -> arm 10.67, rise 3.73 against an allowed -0.11: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.65 -> arm 7.66, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.40 -> arm 2.62, rise 0.22 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen RANK_PUSHED: base 20.34 -> arm 20.63, rise 0.29 against an allowed -0.01: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 4.13 -> arm 3.56, rise -0.57 against an allowed 0.01: PASSES
    gen DESPERATION: base 18.49 -> arm 18.08, rise -0.41 against an allowed 0.04: PASSES
    gen ON_THE_RUN: base 14.29 -> arm 7.59, rise -6.70 against an allowed -0.09: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B6 (B3 with the stand-in hold, re-played; pricing arm): flat 12479 | gen 6894
```

### B5 (A5 with the horizons, re-played; C14's base) with C14, seed set 2

```text
ADR-089 step 3: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== B5 (A5 with the horizons, re-played; C14's base) (the base arm): release clock the decision tick ==
  time to throw: flat 1.590 s | gen 1.694 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1504 of 51638 dropbacks (2.91 per 100); pressuredSacks 1504; pressured dropbacks 17131 (33.18 per 100) [time to throw 1.590 s]
    gen: sacks 799 of 28459 dropbacks (2.81 per 100); pressuredSacks 799; pressured dropbacks 11038 (38.79 per 100) [time to throw 1.694 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.78% | -13.24 against 22.02% (PR #33, FTN only (held)) | -6.68 against 15.46% (main) [time to throw 1.590 s]
    gen: 7.24% | -14.78 against 22.02% (PR #33, FTN only (held)) | -8.22 against 15.46% (main) [time to throw 1.694 s]
  rows (66, both leagues):
  threat_creation_rate: flat 33.18 % | gen 38.79 %
  hit_or_sack_rate: flat 3.68 % [time to throw 1.590 s] | gen 4.11 % [time to throw 1.694 s]
  sack_rate: flat 2.91 % [time to throw 1.590 s] | gen 2.81 % [time to throw 1.694 s]
  time_to_throw: flat 1.590 seconds | gen 1.694 seconds
  sack_share_of_hit_or_sack: flat 79.24 % [time to throw 1.590 s] | gen 68.29 % [time to throw 1.694 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.590 s] | gen 0.00 % [time to throw 1.694 s]
  release_distribution: flat 1.590 seconds | gen 1.694 seconds
  pressured_share_by_release_bin: flat 27.63 % | gen 33.36 %
  hit_rate_by_release_bin: flat 2.40 % [time to throw 1.590 s] | gen 2.37 % [time to throw 1.694 s]
  hits_on_aimed_throws_per_dropback: flat 0.76 % [time to throw 1.590 s] | gen 1.30 % [time to throw 1.694 s]
  first_pressure_seconds: flat 1.373 seconds | gen 1.533 seconds
  first_forcing_seconds: flat 1.659 seconds | gen 1.824 seconds
  first_arrival_seconds: flat 1.777 seconds | gen 1.852 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 21.56%, FREE_RUNNER 66.49%, WON_REP 11.95%; gen COUNTER 27.12%, FREE_RUNNER 57.73%, WON_REP 15.15%)
  quick_pressure_share_by_origin: flat 82.62 % | gen 75.39 %
  clean_with_live_won_rep_ticks: flat 0.06 % | gen 0.07 %
  clean_with_live_won_rep_dropbacks: flat 0.15 % | gen 0.17 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 18.54 % | gen 10.41 %
  throwaway_rate_clean: flat 16.63 % | gen 6.96 %
  scramble_rate: flat 2.37 % | gen 0.50 %
  scramble_yards: flat 7.35 yards | gen 5.51 yards
  by_down_fixed_calls: flat 8.89 % | gen 8.57 %
  int_per_aimed_throw: flat 2.76 % | gen 7.53 %
  completion_per_aimed_throw: flat 45.93 % | gen 42.51 %
  forced_throw_share: flat 16.60 % | gen 24.06 %
  completion_by_pocket_status: flat 27.01 % | gen 28.89 %
  qb_season_spread: flat 0.00 pp | gen 2.95 pp
  defence_season_spread: flat 0.00 pp | gen 1.07 pp
  unblocked_pressures_per_100: flat 17.71 per 100 dropbacks | gen 17.85 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 73.29 % [time to throw 1.590 s] | gen 72.56 % [time to throw 1.694 s]
  unblocked_men_per_100: flat 19.33 per 100 dropbacks | gen 19.32 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 16.41 % | gen 20.77 %
  quick_share_no_free_runner: flat 48.07 % | gen 41.71 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 18.51 % | gen 9.81 %
  situation_q1q3_last_two: flat 18.52 % | gen 10.44 %
  sack_share_of_contacts_in_out: flat 79.24 % [time to throw 1.590 s] | gen 68.26 % [time to throw 1.694 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.590 s] | gen 0.00 % [time to throw 1.694 s]
  sacker_mix.split.interior: flat 20.47 % [time to throw 1.590 s] | gen 22.27 % [time to throw 1.694 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 47.02 % [time to throw 1.590 s] | gen 49.44 % [time to throw 1.694 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 31.45 % [time to throw 1.590 s] | gen 28.04 % [time to throw 1.694 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 1.06 % [time to throw 1.590 s] | gen 0.25 % [time to throw 1.694 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 20.55 % [time to throw 1.590 s] | gen 23.09 % [time to throw 1.694 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 7.67 % | gen 10.06 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.38 % | gen 2.61 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.89 % | gen 20.78 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.22 % | gen 3.90 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.80 % | gen 17.27 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.13 % | gen 9.30 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.68 % | gen 45.81 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.90 % | gen 18.77 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.90 % | gen 40.17 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.16 % | gen 21.41 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.18 % | gen 18.60 %
  nobody_open_share: flat 44.30 % of dropbacks | gen 34.05 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.51 % of dropbacks | gen 12.06 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.61 % of dropbacks | gen 10.88 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.26 % of dropbacks | gen 8.30 % of dropbacks
  nobody_open_share.split.SACK: flat 2.91 % of dropbacks [time to throw 1.590 s] | gen 2.81 % of dropbacks [time to throw 1.694 s]
  clean_checkdown_share: flat 20.07 % of clean aimed throws | gen 6.41 % of clean aimed throws
  clean_later_read_share: flat 14.78 % of clean aimed throws | gen 20.42 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.26, per aimed throw 2.76; forced-throw share 16.60; completion per attempt 37.56, per aimed throw 45.93; INT-source mix CONTESTED_CATCH 91.39, TIPPED_RECOVERY 8.61
      flat PROGRESSION: 20642 aimed, INT 0.38, completion 44.68
      flat RANK_PUSHED: 6703 aimed, INT 11.89, completion 16.90
      flat CHECKDOWN: 9044 aimed, INT 0.22, completion 45.90
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3413 aimed, INT 5.80, completion 28.16
      flat ON_THE_RUN: 195 aimed, INT 5.13, completion 27.18
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.13 against a real 3.25
    gen: INT per attempt 6.88, per aimed throw 7.53; forced-throw share 24.06; completion per attempt 38.86, per aimed throw 42.51; INT-source mix CONTESTED_CATCH 46.99, TIPPED_RECOVERY 53.01
      gen PROGRESSION: 14507 aimed, INT 2.61, completion 45.81
      gen RANK_PUSHED: 4032 aimed, INT 20.78, completion 18.77
      gen CHECKDOWN: 3433 aimed, INT 3.90, completion 40.17
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3097 aimed, INT 17.27, completion 21.41
      gen ON_THE_RUN: 86 aimed, INT 9.30, completion 18.60
      gen on the run: clean INT n/a against a real 2.11; pressured INT 9.30 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== C14 (information, the L basis (its late block on shape L is petition P17's, in contracts)): release clock the decision tick ==
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
    the filed guard against B5 (A5 with the horizons, re-played; C14's base) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-3 (ADR-089 Appendix G, G.9) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.76 -> arm 2.74, rise -0.02 against an allowed 0.01: PASSES
    flat PROGRESSION: base 0.38 -> arm 0.33, rise -0.05 against an allowed -0.00: PASSES
    flat RANK_PUSHED: base 11.89 -> arm 11.93, rise 0.04 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat CHECKDOWN: base 0.22 -> arm 0.21, rise -0.01 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.80 -> arm 5.52, rise -0.28 against an allowed 0.03: PASSES
    flat ON_THE_RUN: base 5.13 -> arm 6.19, rise 1.07 against an allowed -0.04: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    flat by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen league-wide: base 7.53 -> arm 7.62, rise 0.09 against an allowed 0.02: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen PROGRESSION: base 2.61 -> arm 2.69, rise 0.07 against an allowed 0.00: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen RANK_PUSHED: base 20.78 -> arm 21.02, rise 0.24 against an allowed 0.03: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen CHECKDOWN: base 3.90 -> arm 3.83, rise -0.08 against an allowed 0.09: PASSES
    gen DESPERATION: base 17.27 -> arm 17.57, rise 0.30 against an allowed 0.09: above the allowance (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
    gen ON_THE_RUN: base 9.30 -> arm 7.23, rise -2.07 against an allowed 0.32: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-3 (ADR-089 Appendix G, G.9) grades)
  exclusive affected plays against B5 (A5 with the horizons, re-played; C14's base): flat 12691 | gen 7049
```
