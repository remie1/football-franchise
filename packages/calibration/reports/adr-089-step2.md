# ADR-089 step 2: the arms

Must act per rusher and the one-second warning are built behind the switch that is OFF; these arms turn it on for measurement only. The step-2 clauses are the filing's predictions about B3 against A1, read on set 1 with set 2 beside; the guard is read under AM-1 on both seed sets.

- filing: fnv1a:9a1c90e9; amendments: fnv1a:d5f9de6d (AM-1, ADR-089 Appendix F, F.11)
- fingerprint (every package's source, the lockfile, the manifests and the filing): 4ab320f1bdb71cdb
- commit: 6b667ebd270551201482b80c7d5a4ec27ff666f0 (read from the repository's files; a change staged and not committed is not seen)
- node: v22.22.0; caller v7; corpora played: flat 496 games, gen 272 games an arm-set (the full corpora are flat 496 and gen 272 on each seed set; on gen, set 2 is a second league)
- arms: A0 (sets 1, 2; legacy), A14 (sets 1, 2; legacy), A1 (sets 1, 2; fnv1a:69a7cc48), A5 (sets 1, 2; fnv1a:fb652498), A11 (sets 1, 2; fnv1a:3cfc4af8), B1 (sets 1, 2; fnv1a:82b7c72f), B2 (sets 1, 2; fnv1a:9978e7c3), B3 (sets 1, 2; fnv1a:03754f60), B4 (sets 1, 2; fnv1a:299ef915), B5 (sets 1, 2; fnv1a:20c724a7), B6 (sets 1, 2; fnv1a:88bca450), B7 (sets 1, 2; fnv1a:ebe7b4c1)
- PR #33: OPEN, so P2S prints against both 22.02 and 15.46
- the guard's SE: AM-1's statistic is the binomial SE with the two arms read as independent, pooled over the seed sets; e* and the paired, game-clustered SE are printed beside every reading (F.9 item 3)

## What failed, first

- GRADED, reported as filed (no band moves, nothing re-files, nothing is tuned to pass or re-run to try again): s2.pressure.gen (-4.3 to -1.3): B3 - A1 gen set 1 -4.32 points (binomial SE 0.39); set 2 -3.68; two-set mean -4.00

Merge card: may be posted (no structural failure, fold fault or AM-1 breach stands).
- next: the graded failures go to the owner as filed: no band moves, nothing re-files, nothing is tuned to pass or re-run to try again

## The headline: B3 (pocket-1.s2) against A1 (step 1's design), re-played on the same seeds

Set 1 is graded; set 2 is printed beside it. Every hit and sack figure has both arms' times to throw beside it.

- B3 against A1, flat, set 1: pressure 27.80 - 31.81 = -4.02 | hit-or-sack 3.94 - 3.29 = +0.64 [time to throw 1.592 s against 1.589 s] | sacks 3.11 - 2.70 = +0.41 [time to throw 1.592 s against 1.589 s] | release 1.592 - 1.589 = +0.003 s
- B3 against A1, flat, set 2: pressure 27.89 - 32.00 = -4.11 | hit-or-sack 3.95 - 3.27 = +0.68 [time to throw 1.589 s against 1.591 s] | sacks 3.10 - 2.68 = +0.43 [time to throw 1.589 s against 1.591 s] | release 1.589 - 1.591 = -0.002 s
- B3 against A1, gen, set 1: pressure 28.73 - 33.05 = -4.32 | hit-or-sack 4.38 - 3.89 = +0.49 [time to throw 1.682 s against 1.666 s] | sacks 3.01 - 2.80 = +0.22 [time to throw 1.682 s against 1.666 s] | release 1.682 - 1.666 = +0.015 s
- B3 against A1, gen, set 2: pressure 30.45 - 34.13 = -3.68 | hit-or-sack 4.46 - 3.92 = +0.53 [time to throw 1.711 s against 1.693 s] | sacks 3.00 - 2.81 = +0.20 [time to throw 1.711 s against 1.693 s] | release 1.711 - 1.693 = +0.018 s

## The clause table

| clause | kind | arms | filed | measured | verdict |
|---|---|---|---|---|---|
| s2.pressure.flat | graded | B3, A1 | -4.9 to -1.9 | B3 - A1 flat set 1 -4.02 points (binomial SE 0.29); set 2 -4.11; two-set mean -4.06 | PASS (the step-2 build minus step 1's, set 1 graded; set 2 and the two-set mean beside (on gen, set 2 is a second league, so the sets may disagree more than the binomial SE says; S4-6)) |
| s2.pressure.gen | graded | B3, A1 | -4.3 to -1.3 | B3 - A1 gen set 1 -4.32 points (binomial SE 0.39); set 2 -3.68; two-set mean -4.00 | FAIL (the step-2 build minus step 1's, set 1 graded; set 2 and the two-set mean beside (on gen, set 2 is a second league, so the sets may disagree more than the binomial SE says; S4-6)) |
| s2.hitOrSack | graded | B3, A1 | 0.3 to 1.3 | B3 - A1 flat set 1 +0.64 points (binomial SE 0.12); set 2 +0.68; two-set mean +0.66 [time to throw B3 1.592 s, A1 1.589 s]; B3 - A1 gen set 1 +0.49 points (binomial SE 0.17); set 2 +0.53; two-set mean +0.51 [time to throw B3 1.682 s, A1 1.666 s] | PASS (the step-2 build minus step 1's, set 1 graded; set 2 and the two-set mean beside (on gen, set 2 is a second league, so the sets may disagree more than the binomial SE says; S4-6)) |
| s2.sack | graded | B3, A1 | 0.1 to 0.9 | B3 - A1 flat set 1 +0.41 points (binomial SE 0.10); set 2 +0.43; two-set mean +0.42 [time to throw B3 1.592 s, A1 1.589 s]; B3 - A1 gen set 1 +0.22 points (binomial SE 0.14); set 2 +0.20; two-set mean +0.21 [time to throw B3 1.682 s, A1 1.666 s] | PASS (the step-2 build minus step 1's, set 1 graded; set 2 and the two-set mean beside (on gen, set 2 is a second league, so the sets may disagree more than the binomial SE says; S4-6)) |
| s2.falsifier.sacksDown | graded | B1, A1 | at least 0 | B1 - A1 flat set 1 +0.40 per 100 dropbacks (binomial SE 0.10); set 2 +0.37; two-set mean +0.38 [time to throw B1 1.594 s, A1 1.589 s]; B1 - A1 gen set 1 +0.15 per 100 dropbacks (binomial SE 0.14); set 2 +0.19; two-set mean +0.17 [time to throw B1 1.684 s, A1 1.666 s]; beside, set 1: flat: B7 - A1 +0.41, B3 - B2 +0.39; gen: B7 - A1 +0.21, B3 - B2 +0.36 | PASS (the forcing point lowers sacks: B1 minus A1 at or above 0 on each league, set 1 (O38)) |
| s2.m2 | reported | A1 | 0 to 0.02 percent | A1 flat sets 1 and 2: 14 of 28472 forced (0.05%, interval 0.0269% to 0.0825%): outside the reported range, information; A1 gen sets 1 and 2: 6 of 16828 forced (0.04%, interval 0.0131% to 0.0776%): outside the reported range, information | REPORTED (M2 STREAM on A1's streams; the filed first-order figure, the per-set counts and b.tm-399 are in the M2 section) |
| s2.falsifier.counterAlone | structural | B1, B3, B6 | its proof | B1 set 1, B1 set 2, B3 set 1, B3 set 2, B6 set 1, B6 set 2: 361653 forced acts; failures none; chances (a status-forced tick with no threat part, where the rules part ways) 919 on the PER_RUSHER arms, 413 of them outside the count part too; the positive control, B7 read as PER_RUSHER: 27 failures over 39 chances (16 outside the count part); outside this run, the engine's cases are mustAct.test.ts (a) to (d), and pocketStep2Parting.test.ts plays B3 against B7 where they must part | PASS |
| s2.falsifier.everyArrival | structural | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | 129513 arrivals over 24 arm-sets and both leagues (THROW 33445, SACK 96068); failures none | PASS |
| guard.reported.intPerAttempt | structural | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.intPerAimed | structural | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.forced | structural | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.intSource | structural | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.completion | structural | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.completionAimed | structural | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.intByClass | structural | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.reported.completionByClass | structural | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | printed for every arm on both leagues and both seed sets in the group reports | PASS |
| guard.mix | graded | B1, B2, B3, B4, B5, B6, B7 | as amended by AM-1 (ADR-089 Appendix F, F.11): pooled Z over both seed sets above 2 breaches (filed: rise over the mix-predicted rise at most 0) | 14 arm-league readings, none breaching (largest Z +1.45) | PASS (the filed reading, e* and the paired SE are printed beside every reading in the guard section) |
| guard.byClass | graded | B1, B2, B3, B4, B5, B6, B7 | as amended by AM-1 (ADR-089 Appendix F, F.11): pooled Z over both seed sets above 3 breaches (filed: rise over the mix-predicted rise at most 0) | 14 arm-league readings, none breaching (largest Z +2.01) | PASS (the filed reading, e* and the paired SE are printed beside every reading in the guard section) |
| guard.removedClass | structural | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | its proof | printed with its count and interceptions in each group report (REMOVED lines) and in the AM-1 readings | PASS |
| guard.onTheRun.clean | reported | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | 2.11 to 2.11 | A0 set 1 flat n/a (0 aimed); A0 set 1 gen n/a (0 aimed); A0 set 2 flat n/a (0 aimed); A0 set 2 gen n/a (0 aimed); A14 set 1 flat n/a (0 aimed); A14 set 1 gen n/a (0 aimed); A14 set 2 flat n/a (0 aimed); A14 set 2 gen n/a (0 aimed); A1 set 1 flat n/a (0 aimed); A1 set 1 gen n/a (0 aimed); A1 set 2 flat n/a (0 aimed); A1 set 2 gen n/a (0 aimed); A5 set 1 flat n/a (0 aimed); A5 set 1 gen n/a (0 aimed); A5 set 2 flat n/a (0 aimed); A5 set 2 gen n/a (0 aimed); A11 set 1 flat n/a (0 aimed); A11 set 1 gen n/a (0 aimed); A11 set 2 flat n/a (0 aimed); A11 set 2 gen n/a (0 aimed); B1 set 1 flat n/a (0 aimed); B1 set 1 gen n/a (0 aimed); B1 set 2 flat n/a (0 aimed); B1 set 2 gen n/a (0 aimed); B2 set 1 flat n/a (0 aimed); B2 set 1 gen n/a (0 aimed); B2 set 2 flat n/a (0 aimed); B2 set 2 gen n/a (0 aimed); B3 set 1 flat n/a (0 aimed); B3 set 1 gen n/a (0 aimed); B3 set 2 flat n/a (0 aimed); B3 set 2 gen n/a (0 aimed); B4 set 1 flat n/a (0 aimed); B4 set 1 gen n/a (0 aimed); B4 set 2 flat n/a (0 aimed); B4 set 2 gen n/a (0 aimed); B5 set 1 flat n/a (0 aimed); B5 set 1 gen n/a (0 aimed); B5 set 2 flat n/a (0 aimed); B5 set 2 gen n/a (0 aimed); B6 set 1 flat n/a (0 aimed); B6 set 1 gen n/a (0 aimed); B6 set 2 flat n/a (0 aimed); B6 set 2 gen n/a (0 aimed); B7 set 1 flat n/a (0 aimed); B7 set 1 gen n/a (0 aimed); B7 set 2 flat n/a (0 aimed); B7 set 2 gen n/a (0 aimed) | REPORTED (0 by construction at step 2 (F.8 item 5): under PER_RUSHER, ESCAPE runs only on the threat part, a threat within C, so the arrival floor is COLLAPSING or worse at that tick and the pocket he leaves is never CLEAN; under step 1's rule (B2, B4, B5, B7 and the bases) the same holds through forcesDecision; it opens at step 5a) |
| guard.onTheRun.pressured | reported | A0, A14, A1, A5, A11, B1, B2, B3, B4, B5, B6, B7 | 3.25 to 3.25 | A0 set 1 flat 7.61 (355 aimed); A0 set 1 gen 17.10 (421 aimed); A0 set 2 flat 5.85 (376 aimed); A0 set 2 gen 14.57 (398 aimed); A14 set 1 flat 5.41 (74 aimed); A14 set 1 gen 26.88 (93 aimed); A14 set 2 flat 5.56 (54 aimed); A14 set 2 gen 17.65 (68 aimed); A1 set 1 flat 6.45 (155 aimed); A1 set 1 gen 17.04 (135 aimed); A1 set 2 flat 13.48 (141 aimed); A1 set 2 gen 16.00 (150 aimed); A5 set 1 flat 5.29 (189 aimed); A5 set 1 gen 12.88 (132 aimed); A5 set 2 flat 9.90 (192 aimed); A5 set 2 gen 17.02 (141 aimed); A11 set 1 flat 5.56 (144 aimed); A11 set 1 gen 16.00 (100 aimed); A11 set 2 flat 3.52 (142 aimed); A11 set 2 gen 17.05 (88 aimed); B1 set 1 flat 7.89 (152 aimed); B1 set 1 gen 20.59 (68 aimed); B1 set 2 flat 10.14 (138 aimed); B1 set 2 gen 8.82 (68 aimed); B2 set 1 flat 4.86 (144 aimed); B2 set 1 gen 18.18 (132 aimed); B2 set 2 flat 14.39 (139 aimed); B2 set 2 gen 16.67 (156 aimed); B3 set 1 flat 5.44 (147 aimed); B3 set 1 gen 20.00 (70 aimed); B3 set 2 flat 9.16 (131 aimed); B3 set 2 gen 8.45 (71 aimed); B4 set 1 flat 5.44 (147 aimed); B4 set 1 gen 20.00 (70 aimed); B4 set 2 flat 9.16 (131 aimed); B4 set 2 gen 8.57 (70 aimed); B5 set 1 flat 7.22 (180 aimed); B5 set 1 gen 16.92 (65 aimed); B5 set 2 flat 5.13 (195 aimed); B5 set 2 gen 9.30 (86 aimed); B6 set 1 flat 10.42 (144 aimed); B6 set 1 gen 15.85 (82 aimed); B6 set 2 flat 6.94 (144 aimed); B6 set 2 gen 14.29 (84 aimed); B7 set 1 flat 5.44 (147 aimed); B7 set 1 gen 20.00 (70 aimed); B7 set 2 flat 9.16 (131 aimed); B7 set 2 gen 8.45 (71 aimed) | REPORTED |

## The three-arm decomposition: B1 (the forcing point alone), B2 (the warning alone) and B3 (both) against A1

B1 and B2 break the July derivation (P = C + (C - I)) and are information, never design values (O37).

- B1 against A1, flat, set 1 (information): pressure 31.84 - 31.81 = +0.03 | hit-or-sack 3.93 - 3.29 = +0.63 [time to throw 1.594 s against 1.589 s] | sacks 3.10 - 2.70 = +0.40 [time to throw 1.594 s against 1.589 s] | release 1.594 - 1.589 = +0.005 s
- B2 against A1, flat, set 1 (reported, direction only): pressure 27.88 - 31.81 = -3.93 | hit-or-sack 3.30 - 3.29 = +0.01 [time to throw 1.590 s against 1.589 s] | sacks 2.71 - 2.70 = +0.01 [time to throw 1.590 s against 1.589 s] | release 1.590 - 1.589 = +0.001 s
- B3 against A1, flat, set 1 (the design): pressure 27.80 - 31.81 = -4.02 | hit-or-sack 3.94 - 3.29 = +0.64 [time to throw 1.592 s against 1.589 s] | sacks 3.11 - 2.70 = +0.41 [time to throw 1.592 s against 1.589 s] | release 1.592 - 1.589 = +0.003 s
- B1 against A1, flat, set 2 (information): pressure 31.94 - 32.00 = -0.06 | hit-or-sack 3.97 - 3.27 = +0.70 [time to throw 1.592 s against 1.591 s] | sacks 3.05 - 2.68 = +0.37 [time to throw 1.592 s against 1.591 s] | release 1.592 - 1.591 = +0.001 s
- B2 against A1, flat, set 2 (reported, direction only): pressure 27.90 - 32.00 = -4.10 | hit-or-sack 3.25 - 3.27 = -0.02 [time to throw 1.590 s against 1.591 s] | sacks 2.67 - 2.68 = -0.00 [time to throw 1.590 s against 1.591 s] | release 1.590 - 1.591 = -0.001 s
- B3 against A1, flat, set 2 (the design): pressure 27.89 - 32.00 = -4.11 | hit-or-sack 3.95 - 3.27 = +0.68 [time to throw 1.589 s against 1.591 s] | sacks 3.10 - 2.68 = +0.43 [time to throw 1.589 s against 1.591 s] | release 1.589 - 1.591 = -0.002 s
- B1 against A1, gen, set 1 (information): pressure 32.57 - 33.05 = -0.47 | hit-or-sack 4.30 - 3.89 = +0.41 [time to throw 1.684 s against 1.666 s] | sacks 2.95 - 2.80 = +0.15 [time to throw 1.684 s against 1.666 s] | release 1.684 - 1.666 = +0.018 s
- B2 against A1, gen, set 1 (reported, direction only): pressure 29.15 - 33.05 = -3.89 | hit-or-sack 3.76 - 3.89 = -0.13 [time to throw 1.665 s against 1.666 s] | sacks 2.65 - 2.80 = -0.14 [time to throw 1.665 s against 1.666 s] | release 1.665 - 1.666 = -0.001 s
- B3 against A1, gen, set 1 (the design): pressure 28.73 - 33.05 = -4.32 | hit-or-sack 4.38 - 3.89 = +0.49 [time to throw 1.682 s against 1.666 s] | sacks 3.01 - 2.80 = +0.22 [time to throw 1.682 s against 1.666 s] | release 1.682 - 1.666 = +0.015 s
- B1 against A1, gen, set 2 (information): pressure 34.11 - 34.13 = -0.02 | hit-or-sack 4.49 - 3.92 = +0.57 [time to throw 1.712 s against 1.693 s] | sacks 3.00 - 2.81 = +0.19 [time to throw 1.712 s against 1.693 s] | release 1.712 - 1.693 = +0.020 s
- B2 against A1, gen, set 2 (reported, direction only): pressure 30.47 - 34.13 = -3.66 | hit-or-sack 3.92 - 3.92 = +0.00 [time to throw 1.691 s against 1.693 s] | sacks 2.79 - 2.81 = -0.02 [time to throw 1.691 s against 1.693 s] | release 1.691 - 1.693 = -0.001 s
- B3 against A1, gen, set 2 (the design): pressure 30.45 - 34.13 = -3.68 | hit-or-sack 4.46 - 3.92 = +0.53 [time to throw 1.711 s against 1.693 s] | sacks 3.00 - 2.81 = +0.20 [time to throw 1.711 s against 1.693 s] | release 1.711 - 1.693 = +0.018 s
- B3 - (B1 + B2 - A1), flat, set 1: pressure -0.11 points | hit-or-sack +0.00 [time to throw 1.592 s] | sacks -0.00 [time to throw 1.592 s] | release -0.003 s (the interaction of the forcing point and the warning)
- B3 - (B1 + B2 - A1), flat, set 2: pressure +0.05 points | hit-or-sack +0.01 [time to throw 1.589 s] | sacks +0.06 [time to throw 1.589 s] | release -0.002 s (the interaction of the forcing point and the warning)
- B3 - (B1 + B2 - A1), gen, set 1: pressure +0.05 points | hit-or-sack +0.21 [time to throw 1.682 s] | sacks +0.21 [time to throw 1.682 s] | release -0.001 s (the interaction of the forcing point and the warning)
- B3 - (B1 + B2 - A1), gen, set 2: pressure +0.01 points | hit-or-sack -0.04 [time to throw 1.711 s] | sacks +0.03 [time to throw 1.711 s] | release -0.000 s (the interaction of the forcing point and the warning)

## The world and the rule (F.9 item 6; C1-F9)

B7 minus A1 is the basis mechanism (the half second with the warning, under step 1's forcing rule) on S; B5 minus A5 is the same on L8 with Heels, pkA's A123. Their difference is the world. B3 minus B7 is the rule, per rusher at the same horizons, which M2 STREAM on B7's own stream sizes (printed beside each row, set by set; A1's merged figure is the filed reading, at C 1.0 s).

- B7 - A1, flat, set 1: pressure -4.00 points | hit-or-sack +0.65 [time to throw 1.593 s] | sacks +0.41 [time to throw 1.593 s] | release +0.003 s (the basis mechanism on S)
- B5 - A5, flat, set 1: pressure -3.36 points | hit-or-sack +0.81 [time to throw 1.589 s] | sacks +0.53 [time to throw 1.589 s] | release -0.000 s (the same on L8 with Heels, pkA's A123)
- (B7 - A1) - (B5 - A5), flat, set 1: pressure -0.64 points | hit-or-sack -0.16 [time to throw 1.593 s] | sacks -0.12 [time to throw 1.593 s] | release +0.004 s (the world (F.9 item 6))
- B3 - B7, flat, set 1: pressure -0.01 points | hit-or-sack -0.01 [time to throw 1.592 s] | sacks -0.01 [time to throw 1.592 s] | release -0.000 s (the rule, per rusher at the same horizons; beside it M2 STREAM on B7's own stream, set 1: 0.08% (9 of 11282) (the decisions step 1's rule forces at C 0.5 s that the rule removes), and on A1, both sets, the filed reading at C 1.0 s: 0.05% (14 of 28472))
- B7 - A1, flat, set 2: pressure -4.09 points | hit-or-sack +0.69 [time to throw 1.589 s] | sacks +0.43 [time to throw 1.589 s] | release -0.002 s (the basis mechanism on S)
- B5 - A5, flat, set 2: pressure -3.63 points | hit-or-sack +0.75 [time to throw 1.590 s] | sacks +0.43 [time to throw 1.590 s] | release +0.001 s (the same on L8 with Heels, pkA's A123)
- (B7 - A1) - (B5 - A5), flat, set 2: pressure -0.46 points | hit-or-sack -0.06 [time to throw 1.589 s] | sacks +0.00 [time to throw 1.589 s] | release -0.003 s (the world (F.9 item 6))
- B3 - B7, flat, set 2: pressure -0.02 points | hit-or-sack -0.00 [time to throw 1.589 s] | sacks -0.01 [time to throw 1.589 s] | release +0.000 s (the rule, per rusher at the same horizons; beside it M2 STREAM on B7's own stream, set 2: 0.08% (9 of 11469) (the decisions step 1's rule forces at C 0.5 s that the rule removes), and on A1, both sets, the filed reading at C 1.0 s: 0.05% (14 of 28472))
- B7 - A1, gen, set 1: pressure -4.32 points | hit-or-sack +0.49 [time to throw 1.681 s] | sacks +0.21 [time to throw 1.681 s] | release +0.015 s (the basis mechanism on S)
- B5 - A5, gen, set 1: pressure -2.84 points | hit-or-sack +0.61 [time to throw 1.663 s] | sacks +0.39 [time to throw 1.663 s] | release +0.012 s (the same on L8 with Heels, pkA's A123)
- (B7 - A1) - (B5 - A5), gen, set 1: pressure -1.49 points | hit-or-sack -0.12 [time to throw 1.681 s] | sacks -0.18 [time to throw 1.681 s] | release +0.003 s (the world (F.9 item 6))
- B3 - B7, gen, set 1: pressure +0.01 points | hit-or-sack +0.00 [time to throw 1.682 s] | sacks +0.01 [time to throw 1.682 s] | release +0.000 s (the rule, per rusher at the same horizons; beside it M2 STREAM on B7's own stream, set 1: 0.04% (3 of 6688) (the decisions step 1's rule forces at C 0.5 s that the rule removes), and on A1, both sets, the filed reading at C 1.0 s: 0.04% (6 of 16828))
- B7 - A1, gen, set 2: pressure -3.66 points | hit-or-sack +0.52 [time to throw 1.711 s] | sacks +0.20 [time to throw 1.711 s] | release +0.018 s (the basis mechanism on S)
- B5 - A5, gen, set 2: pressure -2.67 points | hit-or-sack +0.53 [time to throw 1.694 s] | sacks +0.29 [time to throw 1.694 s] | release +0.018 s (the same on L8 with Heels, pkA's A123)
- (B7 - A1) - (B5 - A5), gen, set 2: pressure -0.99 points | hit-or-sack -0.01 [time to throw 1.711 s] | sacks -0.10 [time to throw 1.711 s] | release +0.000 s (the world (F.9 item 6))
- B3 - B7, gen, set 2: pressure -0.02 points | hit-or-sack +0.02 [time to throw 1.711 s] | sacks +0.00 [time to throw 1.711 s] | release -0.000 s (the rule, per rusher at the same horizons; beside it M2 STREAM on B7's own stream, set 2: 0.10% (7 of 7146) (the decisions step 1's rule forces at C 0.5 s that the rule removes), and on A1, both sets, the filed reading at C 1.0 s: 0.04% (6 of 16828))

## The information arms (reported, direction only; O47)

- B4 against A1, flat, set 1 (reported, direction only; M2's counter-far share beside: A1 0.05% (14 of 28472), B4's own stream 0.00% (0 of 22708)): pressure 27.77 - 31.81 = -4.04 | hit-or-sack 3.94 - 3.29 = +0.64 [time to throw 1.592 s against 1.589 s] | sacks 3.11 - 2.70 = +0.41 [time to throw 1.592 s against 1.589 s] | release 1.592 - 1.589 = +0.003 s
- B5 against A5, flat, set 1 (reported, direction only; beside the filed s2 bands, not graded on B5: s2.pressure.flat -4.9 to -1.9, s2.pressure.gen -4.3 to -1.3, s2.hitOrSack 0.3 to 1.3, s2.sack 0.1 to 0.9): pressure 33.14 - 36.50 = -3.36 | hit-or-sack 3.67 - 2.86 = +0.81 [time to throw 1.589 s against 1.590 s] | sacks 2.94 - 2.41 = +0.53 [time to throw 1.589 s against 1.590 s] | release 1.589 - 1.590 = -0.000 s
- B7 against A1, flat, set 1 (reported, direction only): pressure 27.81 - 31.81 = -4.00 | hit-or-sack 3.95 - 3.29 = +0.65 [time to throw 1.593 s against 1.589 s] | sacks 3.12 - 2.70 = +0.41 [time to throw 1.593 s against 1.589 s] | release 1.593 - 1.589 = +0.003 s
- B5 against pkA's A123 (designA.json, REPORTED), flat, set 1 (reported, direction only; F.9 item 6's basis): pressure 33.14 - 33.14 = -0.00 | hit-or-sack 3.67 - 3.67 = -0.00 [time to throw 1.589 s against n/a s] | sacks 2.94 - 2.94 = +0.00 [time to throw 1.589 s against n/a s] | release 1.589 - 1.589 = +0.000 s
- B4 against A1, flat, set 2 (reported, direction only; M2's counter-far share beside: A1 0.05% (14 of 28472), B4's own stream 0.00% (0 of 22708)): pressure 27.87 - 32.00 = -4.14 | hit-or-sack 3.95 - 3.27 = +0.68 [time to throw 1.589 s against 1.591 s] | sacks 3.10 - 2.68 = +0.43 [time to throw 1.589 s against 1.591 s] | release 1.589 - 1.591 = -0.002 s
- B5 against A5, flat, set 2 (reported, direction only; beside the filed s2 bands, not graded on B5: s2.pressure.flat -4.9 to -1.9, s2.pressure.gen -4.3 to -1.3, s2.hitOrSack 0.3 to 1.3, s2.sack 0.1 to 0.9): pressure 33.18 - 36.80 = -3.63 | hit-or-sack 3.68 - 2.92 = +0.75 [time to throw 1.590 s against 1.589 s] | sacks 2.91 - 2.48 = +0.43 [time to throw 1.590 s against 1.589 s] | release 1.590 - 1.589 = +0.001 s
- B7 against A1, flat, set 2 (reported, direction only): pressure 27.92 - 32.00 = -4.09 | hit-or-sack 3.96 - 3.27 = +0.69 [time to throw 1.589 s against 1.591 s] | sacks 3.11 - 2.68 = +0.43 [time to throw 1.589 s against 1.591 s] | release 1.589 - 1.591 = -0.002 s
- B5 against pkA's A123 (designA.json, REPORTED), flat, set 2 (reported, direction only; F.9 item 6's basis): pressure 33.18 - 33.14 = +0.04 | hit-or-sack 3.68 - 3.67 = +0.01 [time to throw 1.590 s against n/a s] | sacks 2.91 - 2.94 = -0.03 [time to throw 1.590 s against n/a s] | release 1.590 - 1.589 = +0.001 s
- B4 against A1, gen, set 1 (reported, direction only; M2's counter-far share beside: A1 0.04% (6 of 16828), B4's own stream 0.00% (0 of 13817)): pressure 28.71 - 33.05 = -4.34 | hit-or-sack 4.38 - 3.89 = +0.49 [time to throw 1.682 s against 1.666 s] | sacks 3.01 - 2.80 = +0.22 [time to throw 1.682 s against 1.666 s] | release 1.682 - 1.666 = +0.015 s
- B5 against A5, gen, set 1 (reported, direction only; beside the filed s2 bands, not graded on B5: s2.pressure.flat -4.9 to -1.9, s2.pressure.gen -4.3 to -1.3, s2.hitOrSack 0.3 to 1.3, s2.sack 0.1 to 0.9): pressure 36.87 - 39.71 = -2.84 | hit-or-sack 4.01 - 3.40 = +0.61 [time to throw 1.663 s against 1.651 s] | sacks 2.83 - 2.44 = +0.39 [time to throw 1.663 s against 1.651 s] | release 1.663 - 1.651 = +0.012 s
- B7 against A1, gen, set 1 (reported, direction only): pressure 28.72 - 33.05 = -4.32 | hit-or-sack 4.38 - 3.89 = +0.49 [time to throw 1.681 s against 1.666 s] | sacks 3.00 - 2.80 = +0.21 [time to throw 1.681 s against 1.666 s] | release 1.681 - 1.666 = +0.015 s
- B5 against pkA's A123 (designA.json, REPORTED), gen, set 1 (reported, direction only; F.9 item 6's basis): pressure 36.87 - 36.87 = +0.00 | hit-or-sack 4.01 - 4.01 = +0.00 [time to throw 1.663 s against n/a s] | sacks 2.83 - 2.83 = -0.00 [time to throw 1.663 s against n/a s] | release 1.663 - 1.663 = -0.000 s
- B4 against A1, gen, set 2 (reported, direction only; M2's counter-far share beside: A1 0.04% (6 of 16828), B4's own stream 0.00% (0 of 13817)): pressure 30.40 - 34.13 = -3.73 | hit-or-sack 4.45 - 3.92 = +0.53 [time to throw 1.710 s against 1.693 s] | sacks 3.00 - 2.81 = +0.19 [time to throw 1.710 s against 1.693 s] | release 1.710 - 1.693 = +0.018 s
- B5 against A5, gen, set 2 (reported, direction only; beside the filed s2 bands, not graded on B5: s2.pressure.flat -4.9 to -1.9, s2.pressure.gen -4.3 to -1.3, s2.hitOrSack 0.3 to 1.3, s2.sack 0.1 to 0.9): pressure 38.79 - 41.46 = -2.67 | hit-or-sack 4.11 - 3.58 = +0.53 [time to throw 1.694 s against 1.676 s] | sacks 2.81 - 2.51 = +0.29 [time to throw 1.694 s against 1.676 s] | release 1.694 - 1.676 = +0.018 s
- B7 against A1, gen, set 2 (reported, direction only): pressure 30.47 - 34.13 = -3.66 | hit-or-sack 4.44 - 3.92 = +0.52 [time to throw 1.711 s against 1.693 s] | sacks 3.00 - 2.81 = +0.20 [time to throw 1.711 s against 1.693 s] | release 1.711 - 1.693 = +0.018 s
- B5 against pkA's A123 (designA.json, REPORTED), gen, set 2 (reported, direction only; F.9 item 6's basis): pressure 38.79 - 36.87 = +1.92 | hit-or-sack 4.11 - 4.01 = +0.10 [time to throw 1.694 s against n/a s] | sacks 2.81 - 2.83 = -0.02 [time to throw 1.694 s against n/a s] | release 1.694 - 1.663 = +0.031 s

## The pricing arm: B6 against A11, the bands' measured basis at the stand-in hold (no band graded; never a design value)

- B6 against A11, flat, set 1 (pricing arm, never a design value; reported, direction only): pressure 43.48 - 44.66 = -1.18 | hit-or-sack 9.54 - 7.57 = +1.97 [time to throw 2.747 s against 2.739 s] | sacks 7.54 - 6.18 = +1.36 [time to throw 2.747 s against 2.739 s] | release 2.747 - 2.739 = +0.008 s
- B6 against A11, flat, set 2 (pricing arm, never a design value; reported, direction only): pressure 43.52 - 45.14 = -1.62 | hit-or-sack 9.58 - 7.90 = +1.68 [time to throw 2.746 s against 2.740 s] | sacks 7.64 - 6.45 = +1.19 [time to throw 2.746 s against 2.740 s] | release 2.746 - 2.740 = +0.007 s
- B6 against A11, gen, set 1 (pricing arm, never a design value; reported, direction only): pressure 43.83 - 44.28 = -0.45 | hit-or-sack 12.43 - 10.57 = +1.87 [time to throw 2.704 s against 2.695 s] | sacks 8.54 - 7.55 = +0.99 [time to throw 2.704 s against 2.695 s] | release 2.704 - 2.695 = +0.009 s
- B6 against A11, gen, set 2 (pricing arm, never a design value; reported, direction only): pressure 44.81 - 45.36 = -0.55 | hit-or-sack 13.97 - 11.42 = +2.55 [time to throw 2.719 s against 2.709 s] | sacks 9.90 - 8.15 = +1.75 [time to throw 2.719 s against 2.709 s] | release 2.719 - 2.709 = +0.009 s

## M2: the counter-forced share of forced decisions (s2.m2, reported, 0 to 0.02 percent; nothing graded)

- filed first-order M2 (step 0's engine-free replay, the filing's M.M2, unchanged), flat S-theta11-window: 2 of 9599 forced (0.02%), Poisson 95% interval 0.0025% to 0.0753%
- filed first-order M2 (step 0's engine-free replay, the filing's M.M2, unchanged), flat L-R8: 265 of 9063 forced (2.92%), Poisson 95% interval 2.5825% to 3.2981%
- filed first-order M2 (step 0's engine-free replay, the filing's M.M2, unchanged), flat L-R5: 204 of 9970 forced (2.05%), Poisson 95% interval 1.7750% to 2.3470%
- filed first-order M2 (step 0's engine-free replay, the filing's M.M2, unchanged), gen S-theta11-window: 0 of 5596 forced (0.00%), Poisson 95% interval 0.0000% to 0.0659%
- filed first-order M2 (step 0's engine-free replay, the filing's M.M2, unchanged), gen L-R8: 156 of 5212 forced (2.99%), Poisson 95% interval 2.5418% to 3.5014%
- filed first-order M2 (step 0's engine-free replay, the filing's M.M2, unchanged), gen L-R5: 142 of 6015 forced (2.36%), Poisson 95% interval 1.9885% to 2.7825%
- M2 STREAM on A1's streams, flat, set 1 (rule STEP_1): 8 of 14147 forced decisions (0.06%), Poisson 95% interval 0.0244% to 0.1114%: outside the reported range, information; by alignment EDGE 8; by position CB 8; unforced (never forced before the release, not censored) 72.35% of 51165 dropbacks; identity 0 of 159848 rebuilt statuses and 0 of 7731 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 642761 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 75 of 2721 edge won-rep threats travel 2.5 s or more (2.76%), 73 cornerbacks
- M2 STREAM on A1's streams, flat, set 2 (rule STEP_1): 6 of 14325 forced decisions (0.04%), Poisson 95% interval 0.0154% to 0.0912%: outside the reported range, information; by alignment EDGE 6; by position CB 6; unforced (never forced before the release, not censored) 72.21% of 51541 dropbacks; identity 0 of 161257 rebuilt statuses and 0 of 7847 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 648431 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 76 of 2706 edge won-rep threats travel 2.5 s or more (2.81%), 72 cornerbacks
- M2 STREAM on A1's streams, flat, sets 1 and 2 (rule STEP_1): 14 of 28472 forced decisions (0.05%), Poisson 95% interval 0.0269% to 0.0825%: outside the reported range, information; by alignment EDGE 14; by position CB 14; unforced (never forced before the release, not censored) 72.28% of 102706 dropbacks; identity 0 of 321105 rebuilt statuses and 0 of 15578 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 1291192 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 151 of 5427 edge won-rep threats travel 2.5 s or more (2.78%), 145 cornerbacks
- M2 STREAM on A1's streams, gen, set 1 (rule STEP_1): 4 of 8265 forced decisions (0.05%), Poisson 95% interval 0.0132% to 0.1239%: outside the reported range, information; by alignment EDGE 4; by position CB 4; unforced (never forced before the release, not censored) 70.86% of 28361 dropbacks; identity 0 of 93231 rebuilt statuses and 0 of 4939 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 376389 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 27 of 1616 edge won-rep threats travel 2.5 s or more (1.67%), 26 cornerbacks
- M2 STREAM on A1's streams, gen, set 2 (rule STEP_1): 2 of 8563 forced decisions (0.02%), Poisson 95% interval 0.0028% to 0.0844%: inside the reported range; by alignment EDGE 2; by position CB 2; unforced (never forced before the release, not censored) 69.56% of 28127 dropbacks; identity 0 of 93942 rebuilt statuses and 0 of 5035 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 379277 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 30 of 1733 edge won-rep threats travel 2.5 s or more (1.73%), 29 cornerbacks
- M2 STREAM on A1's streams, gen, sets 1 and 2 (rule STEP_1): 6 of 16828 forced decisions (0.04%), Poisson 95% interval 0.0131% to 0.0776%: outside the reported range, information; by alignment EDGE 6; by position CB 6; unforced (never forced before the release, not censored) 70.21% of 56488 dropbacks; identity 0 of 187173 rebuilt statuses and 0 of 9974 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 755666 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 57 of 3349 edge won-rep threats travel 2.5 s or more (1.70%), 55 cornerbacks
- M2 STREAM on A5's streams, flat, set 1 (rule STEP_1): 525 of 14593 forced decisions (3.60%), Poisson 95% interval 3.2964% to 3.9189%: outside the reported range, information; by alignment EDGE 521, INTERIOR 4; by position DE 508, CB 13, DT 3, MLB 1; unforced (never forced before the release, not censored) 71.61% of 51400 dropbacks; identity 0 of 160906 rebuilt statuses and 0 of 10501 won-rep threats differ; jitter 0 of 646921 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 74 of 3309 edge won-rep threats travel 2.5 s or more (2.24%), 73 cornerbacks
- M2 STREAM on A5's streams, flat, set 2 (rule STEP_1): 568 of 14864 forced decisions (3.82%), Poisson 95% interval 3.5135% to 4.1489%: outside the reported range, information; by alignment EDGE 561, INTERIOR 7; by position DE 539, CB 22, DT 7; unforced (never forced before the release, not censored) 71.30% of 51790 dropbacks; identity 0 of 162066 rebuilt statuses and 0 of 10650 won-rep threats differ; jitter 0 of 651761 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 95 of 3333 edge won-rep threats travel 2.5 s or more (2.85%), 92 cornerbacks
- M2 STREAM on A5's streams, flat, sets 1 and 2 (rule STEP_1): 1093 of 29457 forced decisions (3.71%), Poisson 95% interval 3.4938% to 3.9372%: outside the reported range, information; by alignment EDGE 1082, INTERIOR 11; by position DE 1047, CB 35, DT 10, MLB 1; unforced (never forced before the release, not censored) 71.45% of 103190 dropbacks; identity 0 of 322972 rebuilt statuses and 0 of 21151 won-rep threats differ; jitter 0 of 1298682 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 169 of 6642 edge won-rep threats travel 2.5 s or more (2.54%), 165 cornerbacks
- M2 STREAM on A5's streams, gen, set 1 (rule STEP_1): 490 of 9057 forced decisions (5.41%), Poisson 95% interval 4.9417% to 5.9111%: outside the reported range, information; by alignment EDGE 419, INTERIOR 71; by position DE 411, MLB 1, DT 68, CB 8, OLB 2; unforced (never forced before the release, not censored) 68.27% of 28548 dropbacks; identity 0 of 93145 rebuilt statuses and 0 of 7143 won-rep threats differ; jitter 0 of 375695 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 39 of 1963 edge won-rep threats travel 2.5 s or more (1.99%), 38 cornerbacks
- M2 STREAM on A5's streams, gen, set 2 (rule STEP_1): 609 of 9325 forced decisions (6.53%), Poisson 95% interval 6.0224% to 7.0708%: outside the reported range, information; by alignment EDGE 537, INTERIOR 72; by position DE 520, DT 68, CB 17, OLB 4; unforced (never forced before the release, not censored) 67.17% of 28408 dropbacks; identity 0 of 94205 rebuilt statuses and 0 of 7193 won-rep threats differ; jitter 0 of 380271 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 41 of 2201 edge won-rep threats travel 2.5 s or more (1.86%), 41 cornerbacks
- M2 STREAM on A5's streams, gen, sets 1 and 2 (rule STEP_1): 1099 of 18382 forced decisions (5.98%), Poisson 95% interval 5.6304% to 6.3429%: outside the reported range, information; by alignment EDGE 956, INTERIOR 143; by position DE 931, MLB 1, DT 136, CB 25, OLB 6; unforced (never forced before the release, not censored) 67.73% of 56956 dropbacks; identity 0 of 187350 rebuilt statuses and 0 of 14336 won-rep threats differ; jitter 0 of 755966 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 80 of 4164 edge won-rep threats travel 2.5 s or more (1.92%), 79 cornerbacks
- M2 STREAM on B4's streams, flat, set 1 (rule COUNTER_LESS_SEEN): 0 of 11266 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0327%: inside the reported range; by alignment none; by position none; unforced (never forced before the release, not censored) 78.04% of 51307 dropbacks; identity 0 of 162331 rebuilt statuses and 0 of 7369 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 651661 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 79 of 2742 edge won-rep threats travel 2.5 s or more (2.88%), 78 cornerbacks
- M2 STREAM on B4's streams, flat, set 2 (rule COUNTER_LESS_SEEN): 0 of 11442 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0322%: inside the reported range; by alignment none; by position none; unforced (never forced before the release, not censored) 77.78% of 51505 dropbacks; identity 0 of 162669 rebuilt statuses and 0 of 7494 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 653639 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 76 of 2720 edge won-rep threats travel 2.5 s or more (2.79%), 72 cornerbacks
- M2 STREAM on B4's streams, flat, sets 1 and 2 (rule COUNTER_LESS_SEEN): 0 of 22708 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0162%: inside the reported range; by alignment none; by position none; unforced (never forced before the release, not censored) 77.91% of 102812 dropbacks; identity 0 of 325000 rebuilt statuses and 0 of 14863 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 1305300 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 155 of 5462 edge won-rep threats travel 2.5 s or more (2.84%), 150 cornerbacks
- M2 STREAM on B4's streams, gen, set 1 (rule COUNTER_LESS_SEEN): 0 of 6688 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0552%: inside the reported range; by alignment none; by position none; unforced (never forced before the release, not censored) 76.28% of 28199 dropbacks; identity 0 of 94470 rebuilt statuses and 0 of 4709 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 380498 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 37 of 1567 edge won-rep threats travel 2.5 s or more (2.36%), 35 cornerbacks
- M2 STREAM on B4's streams, gen, set 2 (rule COUNTER_LESS_SEEN): 0 of 7129 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0517%: inside the reported range; by alignment none; by position none; unforced (never forced before the release, not censored) 74.70% of 28180 dropbacks; identity 0 of 96107 rebuilt statuses and 0 of 4940 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 387458 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 43 of 1765 edge won-rep threats travel 2.5 s or more (2.44%), 41 cornerbacks
- M2 STREAM on B4's streams, gen, sets 1 and 2 (rule COUNTER_LESS_SEEN): 0 of 13817 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0267%: inside the reported range; by alignment none; by position none; unforced (never forced before the release, not censored) 75.49% of 56379 dropbacks; identity 0 of 190577 rebuilt statuses and 0 of 9649 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 767956 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 80 of 3332 edge won-rep threats travel 2.5 s or more (2.40%), 76 cornerbacks
- M2 STREAM on B1's streams, flat, sets 1 and 2 (rule PER_RUSHER): 0 of 22791 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0162%: inside the reported range; 0 by the rule (PER_RUSHER, C within 0.5 s): holds; by alignment none; by position none; unforced (never forced before the release, not censored) 77.87% of 102987 dropbacks; identity 0 of 325928 rebuilt statuses and 0 of 14916 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 1308959 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 165 of 5476 edge won-rep threats travel 2.5 s or more (3.01%), 160 cornerbacks
- M2 STREAM on B1's streams, gen, sets 1 and 2 (rule PER_RUSHER): 0 of 13836 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0267%: inside the reported range; 0 by the rule (PER_RUSHER, C within 0.5 s): holds; by alignment none; by position none; unforced (never forced before the release, not censored) 75.47% of 56414 dropbacks; identity 0 of 190894 rebuilt statuses and 0 of 9599 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 768961 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 74 of 3334 edge won-rep threats travel 2.5 s or more (2.22%), 71 cornerbacks
- M2 STREAM on B3's streams, flat, sets 1 and 2 (rule PER_RUSHER): 0 of 22708 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0162%: inside the reported range; 0 by the rule (PER_RUSHER, C within 0.5 s): holds; by alignment none; by position none; unforced (never forced before the release, not censored) 77.91% of 102808 dropbacks; identity 0 of 324992 rebuilt statuses and 0 of 14862 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 1305269 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 155 of 5462 edge won-rep threats travel 2.5 s or more (2.84%), 150 cornerbacks
- M2 STREAM on B3's streams, gen, sets 1 and 2 (rule PER_RUSHER): 0 of 13820 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0267%: inside the reported range; 0 by the rule (PER_RUSHER, C within 0.5 s): holds; by alignment none; by position none; unforced (never forced before the release, not censored) 75.49% of 56388 dropbacks; identity 0 of 190615 rebuilt statuses and 0 of 9651 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 768122 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 80 of 3331 edge won-rep threats travel 2.5 s or more (2.40%), 76 cornerbacks
- M2 STREAM on B6's streams, flat, sets 1 and 2 (rule PER_RUSHER): 0 of 39150 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0094%: inside the reported range; 0 by the rule (PER_RUSHER, C within 0.5 s): holds; by alignment none; by position none; unforced (never forced before the release, not censored) 59.44% of 96527 dropbacks; identity 0 of 496068 rebuilt statuses and 0 of 35827 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 2005437 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 391 of 12197 edge won-rep threats travel 2.5 s or more (3.21%), 388 cornerbacks
- M2 STREAM on B6's streams, gen, sets 1 and 2 (rule PER_RUSHER): 0 of 21878 forced decisions (0.00%), Poisson 95% interval 0.0000% to 0.0169%: inside the reported range; 0 by the rule (PER_RUSHER, C within 0.5 s): holds; by alignment none; by position none; unforced (never forced before the release, not censored) 58.76% of 53048 dropbacks; identity 0 of 274873 rebuilt statuses and 0 of 21312 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 1112100 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 165 of 6672 edge won-rep threats travel 2.5 s or more (2.47%), 165 cornerbacks
- M2 STREAM on B7's streams, flat, set 1 (rule STEP_1): 9 of 11282 forced decisions (0.08%), Poisson 95% interval 0.0365% to 0.1514%: outside the reported range, information; by alignment EDGE 9; by position CB 9; unforced (never forced before the release, not censored) 78.02% of 51318 dropbacks; identity 0 of 162379 rebuilt statuses and 0 of 7379 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 651866 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 79 of 2746 edge won-rep threats travel 2.5 s or more (2.88%), 78 cornerbacks
- M2 STREAM on B7's streams, flat, set 2 (rule STEP_1): 9 of 11469 forced decisions (0.08%), Poisson 95% interval 0.0359% to 0.1490%: outside the reported range, information; by alignment EDGE 9; by position CB 9; unforced (never forced before the release, not censored) 77.74% of 51525 dropbacks; identity 0 of 162727 rebuilt statuses and 0 of 7514 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 653824 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 76 of 2730 edge won-rep threats travel 2.5 s or more (2.78%), 72 cornerbacks
- M2 STREAM on B7's streams, flat, sets 1 and 2 (rule STEP_1): 18 of 22751 forced decisions (0.08%), Poisson 95% interval 0.0469% to 0.1250%: outside the reported range, information; by alignment EDGE 18; by position CB 18; unforced (never forced before the release, not censored) 77.88% of 102843 dropbacks; identity 0 of 325106 rebuilt statuses and 0 of 14893 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 1305690 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 155 of 5476 edge won-rep threats travel 2.5 s or more (2.83%), 150 cornerbacks
- M2 STREAM on B7's streams, gen, set 1 (rule STEP_1): 3 of 6688 forced decisions (0.04%), Poisson 95% interval 0.0093% to 0.1311%: outside the reported range, information; by alignment EDGE 3; by position CB 3; unforced (never forced before the release, not censored) 76.28% of 28200 dropbacks; identity 0 of 94455 rebuilt statuses and 0 of 4700 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 380436 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 37 of 1566 edge won-rep threats travel 2.5 s or more (2.36%), 35 cornerbacks
- M2 STREAM on B7's streams, gen, set 2 (rule STEP_1): 7 of 7146 forced decisions (0.10%), Poisson 95% interval 0.0394% to 0.2018%: outside the reported range, information; by alignment EDGE 7; by position CB 6, OLB 1; unforced (never forced before the release, not censored) 74.66% of 28197 dropbacks; identity 0 of 96197 rebuilt statuses and 0 of 4962 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 387848 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 43 of 1764 edge won-rep threats travel 2.5 s or more (2.44%), 41 cornerbacks
- M2 STREAM on B7's streams, gen, sets 1 and 2 (rule STEP_1): 10 of 13834 forced decisions (0.07%), Poisson 95% interval 0.0347% to 0.1329%: outside the reported range, information; by alignment EDGE 10; by position CB 9, OLB 1; unforced (never forced before the release, not censored) 75.47% of 56397 dropbacks; identity 0 of 190652 rebuilt statuses and 0 of 9662 won-rep threats differ; jitter 0 of 0 rolled ticks differ, 768284 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 80 of 3330 edge won-rep threats travel 2.5 s or more (2.40%), 76 cornerbacks
- M2 STREAM on B5's streams, flat, set 1 (rule STEP_1): 535 of 12118 forced decisions (4.41%), Poisson 95% interval 4.0487% to 4.8054%: outside the reported range, information; by alignment EDGE 531, INTERIOR 4; by position DE 519, DT 4, CB 12; unforced (never forced before the release, not censored) 76.40% of 51349 dropbacks; identity 0 of 162445 rebuilt statuses and 0 of 10445 won-rep threats differ; jitter 0 of 652532 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 68 of 3280 edge won-rep threats travel 2.5 s or more (2.07%), 68 cornerbacks
- M2 STREAM on B5's streams, flat, set 2 (rule STEP_1): 527 of 12197 forced decisions (4.32%), Poisson 95% interval 3.9597% to 4.7059%: outside the reported range, information; by alignment EDGE 523, INTERIOR 4; by position DE 501, CB 22, DT 4; unforced (never forced before the release, not censored) 76.38% of 51638 dropbacks; identity 0 of 163412 rebuilt statuses and 0 of 10449 won-rep threats differ; jitter 0 of 656447 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 80 of 3289 edge won-rep threats travel 2.5 s or more (2.43%), 79 cornerbacks
- M2 STREAM on B5's streams, flat, sets 1 and 2 (rule STEP_1): 1062 of 24315 forced decisions (4.37%), Poisson 95% interval 4.1089% to 4.6385%: outside the reported range, information; by alignment EDGE 1054, INTERIOR 8; by position DE 1020, DT 8, CB 34; unforced (never forced before the release, not censored) 76.39% of 102987 dropbacks; identity 0 of 325857 rebuilt statuses and 0 of 20894 won-rep threats differ; jitter 0 of 1308979 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 148 of 6569 edge won-rep threats travel 2.5 s or more (2.25%), 147 cornerbacks
- M2 STREAM on B5's streams, gen, set 1 (rule STEP_1): 504 of 7825 forced decisions (6.44%), Poisson 95% interval 5.8908% to 7.0286%: outside the reported range, information; by alignment EDGE 436, INTERIOR 68; by position DE 428, CB 8, DT 62, OLB 6; unforced (never forced before the release, not censored) 72.57% of 28522 dropbacks; identity 0 of 94682 rebuilt statuses and 0 of 7274 won-rep threats differ; jitter 0 of 381046 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 35 of 2011 edge won-rep threats travel 2.5 s or more (1.74%), 35 cornerbacks
- M2 STREAM on B5's streams, gen, set 2 (rule STEP_1): 591 of 8110 forced decisions (7.29%), Poisson 95% interval 6.7115% to 7.8992%: outside the reported range, information; by alignment EDGE 501, INTERIOR 90; by position DE 490, DT 87, CB 11, OLB 3; unforced (never forced before the release, not censored) 71.50% of 28459 dropbacks; identity 0 of 96281 rebuilt statuses and 0 of 7377 won-rep threats differ; jitter 0 of 387601 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 50 of 2257 edge won-rep threats travel 2.5 s or more (2.22%), 50 cornerbacks
- M2 STREAM on B5's streams, gen, sets 1 and 2 (rule STEP_1): 1095 of 15935 forced decisions (6.87%), Poisson 95% interval 6.4706% to 7.2910%: outside the reported range, information; by alignment EDGE 937, INTERIOR 158; by position DE 918, CB 19, DT 149, OLB 9; unforced (never forced before the release, not censored) 72.03% of 56981 dropbacks; identity 0 of 190963 rebuilt statuses and 0 of 14651 won-rep threats differ; jitter 0 of 768647 rolled ticks differ, 0 dieless ticks skipped (TODAY's jitter check is vacuous on shape S); b.tm-399 85 of 4268 edge won-rep threats travel 2.5 s or more (1.99%), 85 cornerbacks
- the unit is percent of forced decisions; a value above the reported range prints "outside the reported range, information" (C2-F18); nothing is graded
- b.tm-399 references: TM's 399 of 14,627 edge won-rep threats under S, and step 0's own 398 of 14,447 on the gen base (392 of them cornerbacks; REPORTED-UNREPRODUCED)
- A5's rows are the L return package's (O46); B4's rebuild uses B4's own counter rule, so its identity check stays meaningful (C2-F21); on B1, B3 and B6 the construct is 0 by the rule (PER_RUSHER with C at 0.5 s): printed on each row, it holds by construction, so it is no part of the identity proof (review CT-F5)
- B7's rows size the rule (B3 - B7, the world and the rule): the decisions step 1's rule forces at B3's horizons (C 0.5 s) with no threat within 0.5 s; B5's are the same on L8 with Heels (review MEAS-M-3, FID-F-3)

## The interception guard under AM-1 (ADR-089 Appendix F, F.11; entry AM-1, amendments fnv1a:d5f9de6d)

AM-1 supersedes guard.mix and guard.byClass from step 2: each arm is read against its base in the filed step-2 map, on the same seeds, on both seed sets. On each set z = (rise - allowed) / SE, SE binomial with the two arms read as independent (a set whose SE is 0 scores 0); Z = (z1 + z2) / sqrt 2; a reading breaches when Z is above 2.0 league-wide or 3.0 in a class (strict). e* is the mean excess over the allowance at which the reading would breach. Beside every reading: the filed reading (the rise at most the allowance, per set) and the paired, game-clustered SE and Z, both reported, never graded. DESPERATION is also split dirty and clean by the last status at or before the release (reported), with the rise re-weighted to the base's composition; the checkdown looks are counted by trigger. The cumulative line (B3 against A0, B6 against A14) is reported, never graded before step 10.

### B1 against A1, flat

- league-wide: set 1 2.64 -> 2.79, rise +0.15 / allowed +0.00 / SE 0.12 / z +1.26 (filed: above the allowance; 39701 aimed); set 2 2.71 -> 2.68, rise -0.03 / allowed -0.00 / SE 0.11 / z -0.21 (filed: within the allowance; 40046 aimed); Z +0.74 against 2.0, e* 0.16, mean excess +0.06: PASS; paired SE 0.08 (set 1, 496 games, z +1.85), 0.08 (set 2, 496 games, z -0.31); paired Z +1.09 (reported, never graded)
- PROGRESSION: set 1 0.30 -> 0.32, rise +0.02 / allowed +0.00 / SE 0.05 / z +0.35 (filed: above the allowance; 20491 aimed); set 2 0.32 -> 0.36, rise +0.04 / allowed +0.00 / SE 0.06 / z +0.72 (filed: above the allowance; 20505 aimed); Z +0.76 against 3.0, e* 0.12, mean excess +0.03: PASS; paired SE 0.04 (set 1, 496 games, z +0.54), 0.04 (set 2, 496 games, z +1.09); paired Z +1.15 (reported, never graded)
- RANK_PUSHED: set 1 12.04 -> 12.62, rise +0.58 / allowed -0.01 / SE 0.58 / z +1.02 (filed: above the allowance; 6577 aimed); set 2 11.76 -> 11.41, rise -0.35 / allowed -0.02 / SE 0.56 / z -0.60 (filed: within the allowance; 6698 aimed); Z +0.29 against 3.0, e* 1.20, mean excess +0.13: PASS; paired SE 0.40 (set 1, 496 games, z +1.48), 0.38 (set 2, 496 games, z -0.88); paired Z +0.42 (reported, never graded)
- CHECKDOWN: set 1 0.17 -> 0.22, rise +0.05 / allowed +0.00 / SE 0.07 / z +0.66 (filed: above the allowance; 9072 aimed); set 2 0.23 -> 0.15, rise -0.08 / allowed +0.00 / SE 0.06 / z -1.23 (filed: within the allowance; 9260 aimed); Z -0.40 against 3.0, e* 0.14, mean excess -0.02: PASS; paired SE 0.04 (set 1, 496 games, z +1.06), 0.04 (set 2, 496 games, z -1.78); paired Z -0.51 (reported, never graded)
- DESPERATION: set 1 5.13 -> 5.25, rise +0.12 / allowed +0.02 / SE 0.54 / z +0.17 (filed: above the allowance; 3409 aimed); set 2 5.42 -> 6.01, rise +0.59 / allowed -0.01 / SE 0.56 / z +1.07 (filed: above the allowance; 3445 aimed); Z +0.88 against 3.0, e* 1.17, mean excess +0.35: PASS; paired SE 0.40 (set 1, 496 games, z +0.23), 0.39 (set 2, 496 games, z +1.52); paired Z +1.24 (reported, never graded)
- ON_THE_RUN: set 1 6.45 -> 7.89, rise +1.44 / allowed +0.14 / SE 2.95 / z +0.44 (filed: above the allowance; 152 aimed); set 2 13.48 -> 10.14, rise -3.33 / allowed +0.11 / SE 3.86 / z -0.89 (filed: within the allowance; 138 aimed); Z -0.32 against 3.0, e* 7.09, mean excess -1.07: PASS; paired SE 2.49 (set 1, 496 games, z +0.52), 2.64 (set 2, 496 games, z -1.30); paired Z -0.55 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1054 aimed / 43 INT -> arm 1091 / 47; set 2 base 1132 aimed / 44 INT -> arm 1082 / 46; set 1 4.08 -> 4.31, rise +0.23 / allowed +0.02 / SE 0.87 / z +0.25 (filed: above the allowance; 1091 aimed); set 2 3.89 -> 4.25, rise +0.36 / allowed -0.01 / SE 0.84 / z +0.44 (filed: above the allowance; 1082 aimed); Z +0.49 against 3.0, e* 1.81, mean excess +0.29 (reported); paired SE 0.65 (set 1, 496 games, z +0.33), 0.66 (set 2, 496 games, z +0.57); paired Z +0.63 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2199 aimed / 124 INT -> arm 2318 / 132; set 2 base 2338 aimed / 144 INT -> arm 2363 / 161; set 1 5.64 -> 5.69, rise +0.06 / allowed +0.03 / SE 0.69 / z +0.04 (filed: above the allowance; 2318 aimed); set 2 6.16 -> 6.81, rise +0.65 / allowed -0.01 / SE 0.72 / z +0.92 (filed: above the allowance; 2363 aimed); Z +0.68 against 3.0, e* 1.49, mean excess +0.35 (reported); paired SE 0.49 (set 1, 496 games, z +0.06), 0.47 (set 2, 496 games, z +1.40); paired Z +1.04 (reported, never graded)
- DESPERATION composition, set 1: base dirty 32.40% / clean 67.60% -> arm dirty 32.00% / clean 68.00%; the class's rise +0.12, re-weighted to the base's composition +0.11 (reported)
- DESPERATION composition, set 2: base dirty 32.62% / clean 67.38% -> arm dirty 31.41% / clean 68.59%; the class's rise +0.59, re-weighted to the base's composition +0.56 (reported)
- checkdown looks by trigger: base set 1 26751 looks (threat part 7924, status part 7925, count part 22307; rule part 7925 under STEP_1: rule only 4444, count only 18826, both 3481, neither 0); set 2 27286 looks (threat part 8205, status part 8208, count part 22751; rule part 8208 under STEP_1: rule only 4535, count only 19078, both 3673, neither 0); arm set 1 26366 looks (threat part 6307, status part 6310, count part 23042; rule part 6307 under PER_RUSHER: rule only 3324, count only 20059, both 2983, neither 0); set 2 26673 looks (threat part 6430, status part 6433, count part 23222; rule part 6430 under PER_RUSHER: rule only 3451, count only 20243, both 2979, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 33.57% / count 66.43% / status 0.00% / none 0.00% -> arm threat 27.93% / count 72.07% / status 0.00% / none 0.00%; the class's rise +0.05, re-weighted to the base's composition +0.05 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 32.96% / count 67.03% / status 0.01% / none 0.00% -> arm threat 27.42% / count 72.58% / status 0.00% / none 0.00%; the class's rise -0.08, re-weighted to the base's composition n/a (reported)

### B1 against A1, gen

- league-wide: set 1 7.67 -> 7.26, rise -0.41 / allowed +0.01 / SE 0.24 / z -1.74 (filed: within the allowance; 24440 aimed); set 2 7.74 -> 7.66, rise -0.08 / allowed +0.01 / SE 0.24 / z -0.39 (filed: within the allowance; 24952 aimed); Z -1.51 against 2.0, e* 0.34, mean excess -0.25: PASS; paired SE 0.17 (set 1, 272 games, z -2.47), 0.16 (set 2, 272 games, z -0.58); paired Z -2.16 (reported, never graded)
- PROGRESSION: set 1 2.50 -> 2.66, rise +0.15 / allowed +0.00 / SE 0.19 / z +0.80 (filed: above the allowance; 13891 aimed); set 2 2.66 -> 2.83, rise +0.17 / allowed +0.01 / SE 0.19 / z +0.80 (filed: above the allowance; 14496 aimed); Z +1.13 against 3.0, e* 0.41, mean excess +0.15: PASS; paired SE 0.13 (set 1, 272 games, z +1.14), 0.14 (set 2, 272 games, z +1.14); paired Z +1.61 (reported, never graded)
- RANK_PUSHED: set 1 21.51 -> 19.94, rise -1.58 / allowed +0.00 / SE 0.91 / z -1.74 (filed: within the allowance; 4033 aimed); set 2 20.89 -> 20.86, rise -0.03 / allowed -0.02 / SE 0.91 / z -0.01 (filed: within the allowance; 4012 aimed); Z -1.24 against 3.0, e* 1.93, mean excess -0.79: PASS; paired SE 0.63 (set 1, 272 games, z -2.49), 0.71 (set 2, 272 games, z -0.01); paired Z -1.77 (reported, never graded)
- CHECKDOWN: set 1 3.65 -> 3.16, rise -0.49 / allowed +0.04 / SE 0.42 / z -1.26 (filed: within the allowance; 3545 aimed); set 2 4.17 -> 3.87, rise -0.30 / allowed +0.06 / SE 0.47 / z -0.75 (filed: within the allowance; 3357 aimed); Z -1.42 against 3.0, e* 0.95, mean excess -0.44: PASS; paired SE 0.36 (set 1, 272 games, z -1.50), 0.40 (set 2, 272 games, z -0.90); paired Z -1.69 (reported, never graded)
- DESPERATION: set 1 17.16 -> 16.36, rise -0.79 / allowed +0.02 / SE 0.97 / z -0.84 (filed: within the allowance; 2903 aimed); set 2 17.54 -> 17.49, rise -0.05 / allowed +0.03 / SE 0.97 / z -0.08 (filed: within the allowance; 3019 aimed); Z -0.65 against 3.0, e* 2.06, mean excess -0.45: PASS; paired SE 0.71 (set 1, 272 games, z -1.15), 0.69 (set 2, 272 games, z -0.11); paired Z -0.90 (reported, never graded)
- ON_THE_RUN: set 1 17.04 -> 20.59, rise +3.55 / allowed +0.34 / SE 5.87 / z +0.55 (filed: above the allowance; 68 aimed); set 2 16.00 -> 8.82, rise -7.18 / allowed +0.19 / SE 4.56 / z -1.62 (filed: within the allowance; 68 aimed); Z -0.76 against 3.0, e* 10.89, mean excess -2.08: PASS; paired SE 5.28 (set 1, 272 games, z +0.61), 3.26 (set 2, 272 games, z -2.26); paired Z -1.17 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1227 aimed / 185 INT -> arm 1101 / 161; set 2 base 1357 aimed / 206 INT -> arm 1275 / 193; set 1 15.08 -> 14.62, rise -0.45 / allowed +0.04 / SE 1.48 / z -0.34 (filed: within the allowance; 1101 aimed); set 2 15.18 -> 15.14, rise -0.04 / allowed +0.09 / SE 1.40 / z -0.10 (filed: within the allowance; 1275 aimed); Z -0.31 against 3.0, e* 3.05, mean excess -0.32 (reported); paired SE 1.15 (set 1, 272 games, z -0.43), 1.04 (set 2, 272 games, z -0.13); paired Z -0.40 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1798 aimed / 334 INT -> arm 1802 / 314; set 2 base 1756 aimed / 340 INT -> arm 1744 / 335; set 1 18.58 -> 17.43, rise -1.15 / allowed +0.00 / SE 1.28 / z -0.90 (filed: within the allowance; 1802 aimed); set 2 19.36 -> 19.21, rise -0.15 / allowed -0.03 / SE 1.33 / z -0.09 (filed: within the allowance; 1744 aimed); Z -0.70 against 3.0, e* 2.77, mean excess -0.64 (reported); paired SE 0.84 (set 1, 272 games, z -1.37), 0.89 (set 2, 272 games, z -0.14); paired Z -1.07 (reported, never graded)
- DESPERATION composition, set 1: base dirty 40.56% / clean 59.44% -> arm dirty 37.93% / clean 62.07%; the class's rise -0.79, re-weighted to the base's composition -0.87 (reported)
- DESPERATION composition, set 2: base dirty 43.59% / clean 56.41% -> arm dirty 42.23% / clean 57.77%; the class's rise -0.05, re-weighted to the base's composition -0.11 (reported)
- checkdown looks by trigger: base set 1 9397 looks (threat part 4660, status part 4661, count part 5596; rule part 4661 under STEP_1: rule only 3801, count only 4736, both 860, neither 0); set 2 8677 looks (threat part 4874, status part 4876, count part 4448; rule part 4876 under STEP_1: rule only 4229, count only 3801, both 647, neither 0); arm set 1 8936 looks (threat part 3831, status part 3834, count part 5920; rule part 3831 under PER_RUSHER: rule only 3016, count only 5105, both 815, neither 0); set 2 8067 looks (threat part 4135, status part 4136, count part 4582; rule part 4135 under PER_RUSHER: rule only 3485, count only 3932, both 650, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 55.82% / count 44.18% / status 0.00% / none 0.00% -> arm threat 49.11% / count 50.89% / status 0.00% / none 0.00%; the class's rise -0.49, re-weighted to the base's composition -0.44 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 64.14% / count 35.83% / status 0.03% / none 0.00% -> arm threat 59.01% / count 40.99% / status 0.00% / none 0.00%; the class's rise -0.30, re-weighted to the base's composition n/a (reported)

### B2 against A1, flat

- league-wide: set 1 2.64 -> 2.72, rise +0.08 / allowed +0.00 / SE 0.12 / z +0.71 (filed: above the allowance; 38793 aimed); set 2 2.71 -> 2.74, rise +0.04 / allowed -0.00 / SE 0.12 / z +0.33 (filed: above the allowance; 39196 aimed); Z +0.74 against 2.0, e* 0.16, mean excess +0.06: PASS; paired SE 0.05 (set 1, 496 games, z +1.57), 0.05 (set 2, 496 games, z +0.75); paired Z +1.64 (reported, never graded)
- PROGRESSION: set 1 0.30 -> 0.31, rise +0.02 / allowed +0.01 / SE 0.06 / z +0.22 (filed: above the allowance; 19826 aimed); set 2 0.32 -> 0.31, rise -0.00 / allowed +0.00 / SE 0.06 / z -0.13 (filed: within the allowance; 19917 aimed); Z +0.06 against 3.0, e* 0.12, mean excess +0.00: PASS; paired SE 0.02 (set 1, 496 games, z +0.52), 0.02 (set 2, 496 games, z -0.35); paired Z +0.12 (reported, never graded)
- RANK_PUSHED: set 1 12.04 -> 12.11, rise +0.07 / allowed -0.00 / SE 0.57 / z +0.13 (filed: above the allowance; 6407 aimed); set 2 11.76 -> 11.98, rise +0.21 / allowed -0.00 / SE 0.56 / z +0.38 (filed: above the allowance; 6597 aimed); Z +0.36 against 3.0, e* 1.21, mean excess +0.14: PASS; paired SE 0.26 (set 1, 496 games, z +0.28), 0.25 (set 2, 496 games, z +0.87); paired Z +0.81 (reported, never graded)
- CHECKDOWN: set 1 0.17 -> 0.22, rise +0.05 / allowed -0.01 / SE 0.07 / z +0.78 (filed: above the allowance; 9117 aimed); set 2 0.23 -> 0.19, rise -0.04 / allowed -0.01 / SE 0.07 / z -0.50 (filed: within the allowance; 9108 aimed); Z +0.19 against 3.0, e* 0.14, mean excess +0.01: PASS; paired SE 0.02 (set 1, 496 games, z +2.33), 0.03 (set 2, 496 games, z -1.10); paired Z +0.86 (reported, never graded)
- DESPERATION: set 1 5.13 -> 5.76, rise +0.63 / allowed +0.01 / SE 0.56 / z +1.10 (filed: above the allowance; 3299 aimed); set 2 5.42 -> 5.41, rise -0.00 / allowed -0.01 / SE 0.54 / z +0.01 (filed: above the allowance; 3435 aimed); Z +0.79 against 3.0, e* 1.17, mean excess +0.31: PASS; paired SE 0.28 (set 1, 496 games, z +2.22), 0.24 (set 2, 496 games, z +0.02); paired Z +1.58 (reported, never graded)
- ON_THE_RUN: set 1 6.45 -> 4.86, rise -1.59 / allowed +0.01 / SE 2.67 / z -0.60 (filed: within the allowance; 144 aimed); set 2 13.48 -> 14.39, rise +0.91 / allowed +0.03 / SE 4.14 / z +0.21 (filed: above the allowance; 139 aimed); Z -0.27 against 3.0, e* 6.88, mean excess -0.36: PASS; paired SE 1.10 (set 1, 496 games, z -1.46), 1.57 (set 2, 496 games, z +0.56); paired Z -0.63 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1054 aimed / 43 INT -> arm 859 / 37; set 2 base 1132 aimed / 44 INT -> arm 929 / 33; set 1 4.08 -> 4.31, rise +0.23 / allowed -0.04 / SE 0.92 / z +0.29 (filed: above the allowance; 859 aimed); set 2 3.89 -> 3.55, rise -0.33 / allowed -0.06 / SE 0.84 / z -0.33 (filed: within the allowance; 929 aimed); Z -0.03 against 3.0, e* 1.86, mean excess -0.01 (reported); paired SE 0.56 (set 1, 496 games, z +0.48), 0.45 (set 2, 496 games, z -0.62); paired Z -0.10 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2199 aimed / 124 INT -> arm 2440 / 153; set 2 base 2338 aimed / 144 INT -> arm 2506 / 153; set 1 5.64 -> 6.27, rise +0.63 / allowed +0.02 / SE 0.69 / z +0.88 (filed: above the allowance; 2440 aimed); set 2 6.16 -> 6.11, rise -0.05 / allowed +0.01 / SE 0.69 / z -0.09 (filed: within the allowance; 2506 aimed); Z +0.55 against 3.0, e* 1.47, mean excess +0.27 (reported); paired SE 0.34 (set 1, 496 games, z +1.78), 0.33 (set 2, 496 games, z -0.19); paired Z +1.12 (reported, never graded)
- DESPERATION composition, set 1: base dirty 32.40% / clean 67.60% -> arm dirty 26.04% / clean 73.96%; the class's rise +0.63, re-weighted to the base's composition +0.50 (reported)
- DESPERATION composition, set 2: base dirty 32.62% / clean 67.38% -> arm dirty 27.05% / clean 72.95%; the class's rise -0.00, re-weighted to the base's composition -0.15 (reported)
- checkdown looks by trigger: base set 1 26751 looks (threat part 7924, status part 7925, count part 22307; rule part 7925 under STEP_1: rule only 4444, count only 18826, both 3481, neither 0); set 2 27286 looks (threat part 8205, status part 8208, count part 22751; rule part 8208 under STEP_1: rule only 4535, count only 19078, both 3673, neither 0); arm set 1 26585 looks (threat part 7953, status part 7955, count part 22140; rule part 7955 under STEP_1: rule only 4445, count only 18630, both 3510, neither 0); set 2 26853 looks (threat part 8061, status part 8064, count part 22389; rule part 8064 under STEP_1: rule only 4464, count only 18789, both 3600, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 33.57% / count 66.43% / status 0.00% / none 0.00% -> arm threat 33.64% / count 66.36% / status 0.00% / none 0.00%; the class's rise +0.05, re-weighted to the base's composition +0.05 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 32.96% / count 67.03% / status 0.01% / none 0.00% -> arm threat 33.14% / count 66.85% / status 0.01% / none 0.00%; the class's rise -0.04, re-weighted to the base's composition -0.04 (reported)

### B2 against A1, gen

- league-wide: set 1 7.67 -> 7.68, rise +0.01 / allowed +0.00 / SE 0.24 / z +0.04 (filed: above the allowance; 24263 aimed); set 2 7.74 -> 7.81, rise +0.07 / allowed +0.00 / SE 0.24 / z +0.29 (filed: above the allowance; 24666 aimed); Z +0.23 against 2.0, e* 0.34, mean excess +0.04: PASS; paired SE 0.12 (set 1, 272 games, z +0.08), 0.09 (set 2, 272 games, z +0.78); paired Z +0.61 (reported, never graded)
- PROGRESSION: set 1 2.50 -> 2.63, rise +0.13 / allowed +0.00 / SE 0.19 / z +0.65 (filed: above the allowance; 13275 aimed); set 2 2.66 -> 2.74, rise +0.08 / allowed +0.00 / SE 0.19 / z +0.41 (filed: above the allowance; 13917 aimed); Z +0.75 against 3.0, e* 0.41, mean excess +0.10: PASS; paired SE 0.09 (set 1, 272 games, z +1.36), 0.08 (set 2, 272 games, z +1.07); paired Z +1.72 (reported, never graded)
- RANK_PUSHED: set 1 21.51 -> 21.10, rise -0.41 / allowed +0.01 / SE 0.92 / z -0.46 (filed: within the allowance; 4004 aimed); set 2 20.89 -> 21.02, rise +0.13 / allowed -0.00 / SE 0.92 / z +0.14 (filed: above the allowance; 3910 aimed); Z -0.22 against 3.0, e* 1.95, mean excess -0.14: PASS; paired SE 0.43 (set 1, 272 games, z -0.98), 0.38 (set 2, 272 games, z +0.35); paired Z -0.44 (reported, never graded)
- CHECKDOWN: set 1 3.65 -> 3.42, rise -0.23 / allowed -0.00 / SE 0.42 / z -0.54 (filed: within the allowance; 3833 aimed); set 2 4.17 -> 4.09, rise -0.09 / allowed -0.01 / SE 0.47 / z -0.16 (filed: within the allowance; 3574 aimed); Z -0.50 against 3.0, e* 0.94, mean excess -0.15: PASS; paired SE 0.18 (set 1, 272 games, z -1.25), 0.19 (set 2, 272 games, z -0.41); paired Z -1.17 (reported, never graded)
- DESPERATION: set 1 17.16 -> 17.03, rise -0.13 / allowed -0.01 / SE 0.97 / z -0.12 (filed: within the allowance; 3019 aimed); set 2 17.54 -> 17.72, rise +0.18 / allowed -0.00 / SE 0.97 / z +0.19 (filed: above the allowance; 3109 aimed); Z +0.05 against 3.0, e* 2.05, mean excess +0.03: PASS; paired SE 0.46 (set 1, 272 games, z -0.26), 0.37 (set 2, 272 games, z +0.49); paired Z +0.16 (reported, never graded)
- ON_THE_RUN: set 1 17.04 -> 18.18, rise +1.14 / allowed -0.04 / SE 4.66 / z +0.25 (filed: above the allowance; 132 aimed); set 2 16.00 -> 16.67, rise +0.67 / allowed -0.03 / SE 4.23 / z +0.17 (filed: above the allowance; 156 aimed); Z +0.30 against 3.0, e* 9.41, mean excess +0.94: PASS; paired SE 2.58 (set 1, 272 games, z +0.46), 1.60 (set 2, 272 games, z +0.44); paired Z +0.63 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1227 aimed / 185 INT -> arm 1126 / 167; set 2 base 1357 aimed / 206 INT -> arm 1278 / 199; set 1 15.08 -> 14.83, rise -0.25 / allowed -0.05 / SE 1.47 / z -0.13 (filed: within the allowance; 1126 aimed); set 2 15.18 -> 15.57, rise +0.39 / allowed -0.01 / SE 1.41 / z +0.28 (filed: above the allowance; 1278 aimed); Z +0.11 against 3.0, e* 3.05, mean excess +0.10 (reported); paired SE 0.69 (set 1, 272 games, z -0.29), 0.57 (set 2, 272 games, z +0.70); paired Z +0.29 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1798 aimed / 334 INT -> arm 1893 / 347; set 2 base 1756 aimed / 340 INT -> arm 1831 / 352; set 1 18.58 -> 18.33, rise -0.25 / allowed -0.00 / SE 1.28 / z -0.19 (filed: within the allowance; 1893 aimed); set 2 19.36 -> 19.22, rise -0.14 / allowed -0.01 / SE 1.32 / z -0.10 (filed: within the allowance; 1831 aimed); Z -0.21 against 3.0, e* 2.75, mean excess -0.19 (reported); paired SE 0.57 (set 1, 272 games, z -0.43), 0.56 (set 2, 272 games, z -0.23); paired Z -0.47 (reported, never graded)
- DESPERATION composition, set 1: base dirty 40.56% / clean 59.44% -> arm dirty 37.30% / clean 62.70%; the class's rise -0.13, re-weighted to the base's composition -0.25 (reported)
- DESPERATION composition, set 2: base dirty 43.59% / clean 56.41% -> arm dirty 41.11% / clean 58.89%; the class's rise +0.18, re-weighted to the base's composition +0.09 (reported)
- checkdown looks by trigger: base set 1 9397 looks (threat part 4660, status part 4661, count part 5596; rule part 4661 under STEP_1: rule only 3801, count only 4736, both 860, neither 0); set 2 8677 looks (threat part 4874, status part 4876, count part 4448; rule part 4876 under STEP_1: rule only 4229, count only 3801, both 647, neither 0); arm set 1 9443 looks (threat part 4657, status part 4658, count part 5629; rule part 4658 under STEP_1: rule only 3814, count only 4785, both 844, neither 0); set 2 8607 looks (threat part 4859, status part 4862, count part 4391; rule part 4862 under STEP_1: rule only 4216, count only 3745, both 646, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 55.82% / count 44.18% / status 0.00% / none 0.00% -> arm threat 56.30% / count 43.70% / status 0.00% / none 0.00%; the class's rise -0.23, re-weighted to the base's composition -0.23 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 64.14% / count 35.83% / status 0.03% / none 0.00% -> arm threat 64.44% / count 35.53% / status 0.03% / none 0.00%; the class's rise -0.09, re-weighted to the base's composition -0.09 (reported)

### B3 against A1, flat

- league-wide: set 1 2.64 -> 2.83, rise +0.19 / allowed +0.00 / SE 0.12 / z +1.63 (filed: above the allowance; 39671 aimed); set 2 2.71 -> 2.75, rise +0.04 / allowed -0.00 / SE 0.12 / z +0.41 (filed: above the allowance; 39896 aimed); Z +1.45 against 2.0, e* 0.16, mean excess +0.12: PASS; paired SE 0.08 (set 1, 496 games, z +2.30), 0.08 (set 2, 496 games, z +0.60); paired Z +2.05 (reported, never graded)
- PROGRESSION: set 1 0.30 -> 0.35, rise +0.05 / allowed +0.00 / SE 0.06 / z +0.87 (filed: above the allowance; 20461 aimed); set 2 0.32 -> 0.39, rise +0.08 / allowed +0.00 / SE 0.06 / z +1.29 (filed: above the allowance; 20543 aimed); Z +1.53 against 3.0, e* 0.12, mean excess +0.06: PASS; paired SE 0.04 (set 1, 496 games, z +1.26), 0.04 (set 2, 496 games, z +1.88); paired Z +2.22 (reported, never graded)
- RANK_PUSHED: set 1 12.04 -> 12.70, rise +0.66 / allowed -0.01 / SE 0.58 / z +1.16 (filed: above the allowance; 6616 aimed); set 2 11.76 -> 11.57, rise -0.19 / allowed -0.02 / SE 0.56 / z -0.30 (filed: within the allowance; 6671 aimed); Z +0.61 against 3.0, e* 1.20, mean excess +0.25: PASS; paired SE 0.41 (set 1, 496 games, z +1.63), 0.40 (set 2, 496 games, z -0.42); paired Z +0.86 (reported, never graded)
- CHECKDOWN: set 1 0.17 -> 0.21, rise +0.04 / allowed +0.00 / SE 0.06 / z +0.51 (filed: above the allowance; 9012 aimed); set 2 0.23 -> 0.16, rise -0.06 / allowed +0.00 / SE 0.07 / z -0.98 (filed: within the allowance; 9120 aimed); Z -0.33 against 3.0, e* 0.14, mean excess -0.02: PASS; paired SE 0.04 (set 1, 496 games, z +0.79), 0.05 (set 2, 496 games, z -1.40); paired Z -0.43 (reported, never graded)
- DESPERATION: set 1 5.13 -> 5.36, rise +0.22 / allowed +0.01 / SE 0.55 / z +0.39 (filed: above the allowance; 3435 aimed); set 2 5.42 -> 6.32, rise +0.91 / allowed -0.01 / SE 0.57 / z +1.62 (filed: above the allowance; 3431 aimed); Z +1.42 against 3.0, e* 1.18, mean excess +0.56: PASS; paired SE 0.40 (set 1, 496 games, z +0.53), 0.41 (set 2, 496 games, z +2.23); paired Z +1.95 (reported, never graded)
- ON_THE_RUN: set 1 6.45 -> 5.44, rise -1.01 / allowed +0.11 / SE 2.72 / z -0.41 (filed: within the allowance; 147 aimed); set 2 13.48 -> 9.16, rise -4.31 / allowed +0.13 / SE 3.82 / z -1.16 (filed: within the allowance; 131 aimed); Z -1.11 against 3.0, e* 6.74, mean excess -2.78: PASS; paired SE 2.18 (set 1, 496 games, z -0.51), 2.98 (set 2, 496 games, z -1.49); paired Z -1.42 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1054 aimed / 43 INT -> arm 995 / 42; set 2 base 1132 aimed / 44 INT -> arm 981 / 41; set 1 4.08 -> 4.22, rise +0.14 / allowed +0.05 / SE 0.88 / z +0.10 (filed: above the allowance; 995 aimed); set 2 3.89 -> 4.18, rise +0.29 / allowed +0.00 / SE 0.86 / z +0.34 (filed: above the allowance; 981 aimed); Z +0.31 against 3.0, e* 1.85, mean excess +0.19 (reported); paired SE 0.71 (set 1, 496 games, z +0.12), 0.68 (set 2, 496 games, z +0.42); paired Z +0.39 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2199 aimed / 124 INT -> arm 2440 / 142; set 2 base 2338 aimed / 144 INT -> arm 2450 / 176; set 1 5.64 -> 5.82, rise +0.18 / allowed -0.01 / SE 0.68 / z +0.27 (filed: above the allowance; 2440 aimed); set 2 6.16 -> 7.18, rise +1.02 / allowed -0.02 / SE 0.72 / z +1.45 (filed: above the allowance; 2450 aimed); Z +1.22 against 3.0, e* 1.49, mean excess +0.61 (reported); paired SE 0.49 (set 1, 496 games, z +0.38), 0.51 (set 2, 496 games, z +2.05); paired Z +1.72 (reported, never graded)
- DESPERATION composition, set 1: base dirty 32.40% / clean 67.60% -> arm dirty 28.97% / clean 71.03%; the class's rise +0.22, re-weighted to the base's composition +0.17 (reported)
- DESPERATION composition, set 2: base dirty 32.62% / clean 67.38% -> arm dirty 28.59% / clean 71.41%; the class's rise +0.91, re-weighted to the base's composition +0.79 (reported)
- checkdown looks by trigger: base set 1 26751 looks (threat part 7924, status part 7925, count part 22307; rule part 7925 under STEP_1: rule only 4444, count only 18826, both 3481, neither 0); set 2 27286 looks (threat part 8205, status part 8208, count part 22751; rule part 8208 under STEP_1: rule only 4535, count only 19078, both 3673, neither 0); arm set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 33.57% / count 66.43% / status 0.00% / none 0.00% -> arm threat 27.80% / count 72.20% / status 0.00% / none 0.00%; the class's rise +0.04, re-weighted to the base's composition +0.05 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 32.96% / count 67.03% / status 0.01% / none 0.00% -> arm threat 27.74% / count 72.26% / status 0.00% / none 0.00%; the class's rise -0.06, re-weighted to the base's composition n/a (reported)

### B3 against A1, gen

- league-wide: set 1 7.67 -> 7.30, rise -0.37 / allowed +0.01 / SE 0.24 / z -1.56 (filed: within the allowance; 24379 aimed); set 2 7.74 -> 7.69, rise -0.05 / allowed +0.01 / SE 0.24 / z -0.25 (filed: within the allowance; 24984 aimed); Z -1.28 against 2.0, e* 0.34, mean excess -0.22: PASS; paired SE 0.17 (set 1, 272 games, z -2.18), 0.16 (set 2, 272 games, z -0.37); paired Z -1.80 (reported, never graded)
- PROGRESSION: set 1 2.50 -> 2.71, rise +0.21 / allowed +0.00 / SE 0.19 / z +1.06 (filed: above the allowance; 13835 aimed); set 2 2.66 -> 2.79, rise +0.13 / allowed +0.01 / SE 0.19 / z +0.58 (filed: above the allowance; 14531 aimed); Z +1.16 against 3.0, e* 0.41, mean excess +0.16: PASS; paired SE 0.14 (set 1, 272 games, z +1.47), 0.14 (set 2, 272 games, z +0.82); paired Z +1.62 (reported, never graded)
- RANK_PUSHED: set 1 21.51 -> 19.74, rise -1.77 / allowed +0.01 / SE 0.91 / z -1.96 (filed: within the allowance; 4042 aimed); set 2 20.89 -> 20.68, rise -0.21 / allowed -0.04 / SE 0.91 / z -0.19 (filed: within the allowance; 4042 aimed); Z -1.52 against 3.0, e* 1.92, mean excess -0.97: PASS; paired SE 0.66 (set 1, 272 games, z -2.69), 0.70 (set 2, 272 games, z -0.25); paired Z -2.08 (reported, never graded)
- CHECKDOWN: set 1 3.65 -> 3.21, rise -0.44 / allowed +0.03 / SE 0.42 / z -1.11 (filed: within the allowance; 3549 aimed); set 2 4.17 -> 3.75, rise -0.42 / allowed +0.06 / SE 0.47 / z -1.02 (filed: within the allowance; 3309 aimed); Z -1.51 against 3.0, e* 0.95, mean excess -0.48: PASS; paired SE 0.34 (set 1, 272 games, z -1.37), 0.37 (set 2, 272 games, z -1.29); paired Z -1.88 (reported, never graded)
- DESPERATION: set 1 17.16 -> 16.61, rise -0.54 / allowed +0.02 / SE 0.97 / z -0.58 (filed: within the allowance; 2883 aimed); set 2 17.54 -> 18.18, rise +0.64 / allowed +0.04 / SE 0.98 / z +0.62 (filed: above the allowance; 3031 aimed); Z +0.03 against 3.0, e* 2.07, mean excess +0.02: PASS; paired SE 0.70 (set 1, 272 games, z -0.81), 0.72 (set 2, 272 games, z +0.84); paired Z +0.02 (reported, never graded)
- ON_THE_RUN: set 1 17.04 -> 20.00, rise +2.96 / allowed +0.38 / SE 5.77 / z +0.45 (filed: above the allowance; 70 aimed); set 2 16.00 -> 8.45, rise -7.55 / allowed +0.15 / SE 4.46 / z -1.73 (filed: within the allowance; 71 aimed); Z -0.91 against 3.0, e* 10.67, mean excess -2.56: PASS; paired SE 5.25 (set 1, 272 games, z +0.49), 3.14 (set 2, 272 games, z -2.45); paired Z -1.38 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1227 aimed / 185 INT -> arm 1052 / 150; set 2 base 1357 aimed / 206 INT -> arm 1216 / 203; set 1 15.08 -> 14.26, rise -0.82 / allowed +0.06 / SE 1.49 / z -0.59 (filed: within the allowance; 1052 aimed); set 2 15.18 -> 16.69, rise +1.51 / allowed +0.10 / SE 1.45 / z +0.97 (filed: above the allowance; 1216 aimed); Z +0.27 against 3.0, e* 3.11, mean excess +0.27 (reported); paired SE 1.15 (set 1, 272 games, z -0.77), 1.12 (set 2, 272 games, z +1.26); paired Z +0.35 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1798 aimed / 334 INT -> arm 1831 / 329; set 2 base 1756 aimed / 340 INT -> arm 1815 / 348; set 1 18.58 -> 17.97, rise -0.61 / allowed -0.01 / SE 1.28 / z -0.46 (filed: within the allowance; 1831 aimed); set 2 19.36 -> 19.17, rise -0.19 / allowed -0.03 / SE 1.32 / z -0.12 (filed: within the allowance; 1815 aimed); Z -0.41 against 3.0, e* 2.76, mean excess -0.38 (reported); paired SE 0.88 (set 1, 272 games, z -0.68), 0.87 (set 2, 272 games, z -0.19); paired Z -0.61 (reported, never graded)
- DESPERATION composition, set 1: base dirty 40.56% / clean 59.44% -> arm dirty 36.49% / clean 63.51%; the class's rise -0.54, re-weighted to the base's composition -0.69 (reported)
- DESPERATION composition, set 2: base dirty 43.59% / clean 56.41% -> arm dirty 40.12% / clean 59.88%; the class's rise +0.64, re-weighted to the base's composition +0.55 (reported)
- checkdown looks by trigger: base set 1 9397 looks (threat part 4660, status part 4661, count part 5596; rule part 4661 under STEP_1: rule only 3801, count only 4736, both 860, neither 0); set 2 8677 looks (threat part 4874, status part 4876, count part 4448; rule part 4876 under STEP_1: rule only 4229, count only 3801, both 647, neither 0); arm set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 55.82% / count 44.18% / status 0.00% / none 0.00% -> arm threat 49.20% / count 50.80% / status 0.00% / none 0.00%; the class's rise -0.44, re-weighted to the base's composition -0.40 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 64.14% / count 35.83% / status 0.03% / none 0.00% -> arm threat 59.29% / count 40.71% / status 0.00% / none 0.00%; the class's rise -0.42, re-weighted to the base's composition n/a (reported)

### B4 against A1, flat

- league-wide: set 1 2.64 -> 2.83, rise +0.19 / allowed +0.00 / SE 0.12 / z +1.63 (filed: above the allowance; 39673 aimed); set 2 2.71 -> 2.75, rise +0.04 / allowed -0.00 / SE 0.12 / z +0.41 (filed: above the allowance; 39896 aimed); Z +1.45 against 2.0, e* 0.16, mean excess +0.12: PASS; paired SE 0.08 (set 1, 496 games, z +2.30), 0.08 (set 2, 496 games, z +0.60); paired Z +2.05 (reported, never graded)
- PROGRESSION: set 1 0.30 -> 0.35, rise +0.05 / allowed +0.00 / SE 0.06 / z +0.87 (filed: above the allowance; 20463 aimed); set 2 0.32 -> 0.39, rise +0.08 / allowed +0.00 / SE 0.06 / z +1.29 (filed: above the allowance; 20543 aimed); Z +1.53 against 3.0, e* 0.12, mean excess +0.06: PASS; paired SE 0.04 (set 1, 496 games, z +1.26), 0.04 (set 2, 496 games, z +1.88); paired Z +2.22 (reported, never graded)
- RANK_PUSHED: set 1 12.04 -> 12.70, rise +0.66 / allowed -0.01 / SE 0.58 / z +1.16 (filed: above the allowance; 6616 aimed); set 2 11.76 -> 11.57, rise -0.19 / allowed -0.02 / SE 0.56 / z -0.30 (filed: within the allowance; 6671 aimed); Z +0.61 against 3.0, e* 1.20, mean excess +0.25: PASS; paired SE 0.41 (set 1, 496 games, z +1.63), 0.40 (set 2, 496 games, z -0.42); paired Z +0.86 (reported, never graded)
- CHECKDOWN: set 1 0.17 -> 0.21, rise +0.04 / allowed +0.00 / SE 0.06 / z +0.51 (filed: above the allowance; 9012 aimed); set 2 0.23 -> 0.16, rise -0.06 / allowed +0.00 / SE 0.07 / z -0.98 (filed: within the allowance; 9120 aimed); Z -0.33 against 3.0, e* 0.14, mean excess -0.02: PASS; paired SE 0.04 (set 1, 496 games, z +0.79), 0.05 (set 2, 496 games, z -1.40); paired Z -0.43 (reported, never graded)
- DESPERATION: set 1 5.13 -> 5.36, rise +0.22 / allowed +0.01 / SE 0.55 / z +0.39 (filed: above the allowance; 3435 aimed); set 2 5.42 -> 6.32, rise +0.91 / allowed -0.01 / SE 0.57 / z +1.62 (filed: above the allowance; 3431 aimed); Z +1.42 against 3.0, e* 1.18, mean excess +0.56: PASS; paired SE 0.40 (set 1, 496 games, z +0.53), 0.41 (set 2, 496 games, z +2.23); paired Z +1.95 (reported, never graded)
- ON_THE_RUN: set 1 6.45 -> 5.44, rise -1.01 / allowed +0.11 / SE 2.72 / z -0.41 (filed: within the allowance; 147 aimed); set 2 13.48 -> 9.16, rise -4.31 / allowed +0.13 / SE 3.82 / z -1.16 (filed: within the allowance; 131 aimed); Z -1.11 against 3.0, e* 6.74, mean excess -2.78: PASS; paired SE 2.18 (set 1, 496 games, z -0.51), 2.98 (set 2, 496 games, z -1.49); paired Z -1.42 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1054 aimed / 43 INT -> arm 996 / 42; set 2 base 1132 aimed / 44 INT -> arm 979 / 40; set 1 4.08 -> 4.22, rise +0.14 / allowed +0.05 / SE 0.88 / z +0.10 (filed: above the allowance; 996 aimed); set 2 3.89 -> 4.09, rise +0.20 / allowed +0.00 / SE 0.85 / z +0.23 (filed: above the allowance; 979 aimed); Z +0.23 against 3.0, e* 1.84, mean excess +0.14 (reported); paired SE 0.71 (set 1, 496 games, z +0.12), 0.68 (set 2, 496 games, z +0.29); paired Z +0.29 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2199 aimed / 124 INT -> arm 2439 / 142; set 2 base 2338 aimed / 144 INT -> arm 2452 / 177; set 1 5.64 -> 5.82, rise +0.18 / allowed -0.01 / SE 0.68 / z +0.28 (filed: above the allowance; 2439 aimed); set 2 6.16 -> 7.22, rise +1.06 / allowed -0.02 / SE 0.72 / z +1.49 (filed: above the allowance; 2452 aimed); Z +1.25 against 3.0, e* 1.49, mean excess +0.63 (reported); paired SE 0.49 (set 1, 496 games, z +0.39), 0.51 (set 2, 496 games, z +2.11); paired Z +1.76 (reported, never graded)
- DESPERATION composition, set 1: base dirty 32.40% / clean 67.60% -> arm dirty 29.00% / clean 71.00%; the class's rise +0.22, re-weighted to the base's composition +0.17 (reported)
- DESPERATION composition, set 2: base dirty 32.62% / clean 67.38% -> arm dirty 28.53% / clean 71.47%; the class's rise +0.91, re-weighted to the base's composition +0.78 (reported)
- checkdown looks by trigger: base set 1 26751 looks (threat part 7924, status part 7925, count part 22307; rule part 7925 under STEP_1: rule only 4444, count only 18826, both 3481, neither 0); set 2 27286 looks (threat part 8205, status part 8208, count part 22751; rule part 8208 under STEP_1: rule only 4535, count only 19078, both 3673, neither 0); arm set 1 26200 looks (threat part 6301, status part 6301, count part 22873; rule part 6301 under COUNTER_LESS_SEEN: rule only 3327, count only 19899, both 2974, neither 0); set 2 26345 looks (threat part 6378, status part 6378, count part 22922; rule part 6378 under COUNTER_LESS_SEEN: rule only 3423, count only 19967, both 2955, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 33.57% / count 66.43% / status 0.00% / none 0.00% -> arm threat 27.79% / count 72.21% / status 0.00% / none 0.00%; the class's rise +0.04, re-weighted to the base's composition +0.05 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 32.96% / count 67.03% / status 0.01% / none 0.00% -> arm threat 27.74% / count 72.26% / status 0.00% / none 0.00%; the class's rise -0.06, re-weighted to the base's composition n/a (reported)

### B4 against A1, gen

- league-wide: set 1 7.67 -> 7.30, rise -0.37 / allowed +0.01 / SE 0.24 / z -1.57 (filed: within the allowance; 24382 aimed); set 2 7.74 -> 7.70, rise -0.04 / allowed +0.01 / SE 0.24 / z -0.21 (filed: within the allowance; 24978 aimed); Z -1.25 against 2.0, e* 0.34, mean excess -0.21: PASS; paired SE 0.17 (set 1, 272 games, z -2.19), 0.16 (set 2, 272 games, z -0.30); paired Z -1.76 (reported, never graded)
- PROGRESSION: set 1 2.50 -> 2.71, rise +0.21 / allowed +0.00 / SE 0.19 / z +1.06 (filed: above the allowance; 13835 aimed); set 2 2.66 -> 2.80, rise +0.14 / allowed +0.01 / SE 0.19 / z +0.63 (filed: above the allowance; 14518 aimed); Z +1.19 against 3.0, e* 0.41, mean excess +0.16: PASS; paired SE 0.14 (set 1, 272 games, z +1.47), 0.14 (set 2, 272 games, z +0.90); paired Z +1.67 (reported, never graded)
- RANK_PUSHED: set 1 21.51 -> 19.74, rise -1.77 / allowed +0.01 / SE 0.91 / z -1.96 (filed: within the allowance; 4042 aimed); set 2 20.89 -> 20.69, rise -0.20 / allowed -0.04 / SE 0.91 / z -0.18 (filed: within the allowance; 4041 aimed); Z -1.52 against 3.0, e* 1.92, mean excess -0.97: PASS; paired SE 0.66 (set 1, 272 games, z -2.69), 0.70 (set 2, 272 games, z -0.24); paired Z -2.07 (reported, never graded)
- CHECKDOWN: set 1 3.65 -> 3.21, rise -0.44 / allowed +0.03 / SE 0.42 / z -1.11 (filed: within the allowance; 3550 aimed); set 2 4.17 -> 3.74, rise -0.43 / allowed +0.06 / SE 0.47 / z -1.04 (filed: within the allowance; 3317 aimed); Z -1.53 against 3.0, e* 0.95, mean excess -0.48: PASS; paired SE 0.34 (set 1, 272 games, z -1.38), 0.37 (set 2, 272 games, z -1.32); paired Z -1.91 (reported, never graded)
- DESPERATION: set 1 17.16 -> 16.60, rise -0.55 / allowed +0.02 / SE 0.97 / z -0.59 (filed: within the allowance; 2885 aimed); set 2 17.54 -> 18.21, rise +0.67 / allowed +0.04 / SE 0.98 / z +0.64 (filed: above the allowance; 3032 aimed); Z +0.04 against 3.0, e* 2.07, mean excess +0.03: PASS; paired SE 0.70 (set 1, 272 games, z -0.83), 0.72 (set 2, 272 games, z +0.88); paired Z +0.03 (reported, never graded)
- ON_THE_RUN: set 1 17.04 -> 20.00, rise +2.96 / allowed +0.38 / SE 5.77 / z +0.45 (filed: above the allowance; 70 aimed); set 2 16.00 -> 8.57, rise -7.43 / allowed +0.16 / SE 4.49 / z -1.69 (filed: within the allowance; 70 aimed); Z -0.88 against 3.0, e* 10.71, mean excess -2.50: PASS; paired SE 5.25 (set 1, 272 games, z +0.49), 3.17 (set 2, 272 games, z -2.39); paired Z -1.35 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1227 aimed / 185 INT -> arm 1053 / 150; set 2 base 1357 aimed / 206 INT -> arm 1214 / 203; set 1 15.08 -> 14.25, rise -0.83 / allowed +0.06 / SE 1.48 / z -0.60 (filed: within the allowance; 1053 aimed); set 2 15.18 -> 16.72, rise +1.54 / allowed +0.10 / SE 1.45 / z +1.00 (filed: above the allowance; 1214 aimed); Z +0.28 against 3.0, e* 3.11, mean excess +0.27 (reported); paired SE 1.15 (set 1, 272 games, z -0.78), 1.12 (set 2, 272 games, z +1.29); paired Z +0.36 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1798 aimed / 334 INT -> arm 1832 / 329; set 2 base 1756 aimed / 340 INT -> arm 1818 / 349; set 1 18.58 -> 17.96, rise -0.62 / allowed -0.01 / SE 1.28 / z -0.47 (filed: within the allowance; 1832 aimed); set 2 19.36 -> 19.20, rise -0.17 / allowed -0.03 / SE 1.32 / z -0.11 (filed: within the allowance; 1818 aimed); Z -0.41 against 3.0, e* 2.76, mean excess -0.37 (reported); paired SE 0.88 (set 1, 272 games, z -0.69), 0.87 (set 2, 272 games, z -0.16); paired Z -0.60 (reported, never graded)
- DESPERATION composition, set 1: base dirty 40.56% / clean 59.44% -> arm dirty 36.50% / clean 63.50%; the class's rise -0.55, re-weighted to the base's composition -0.70 (reported)
- DESPERATION composition, set 2: base dirty 43.59% / clean 56.41% -> arm dirty 40.04% / clean 59.96%; the class's rise +0.67, re-weighted to the base's composition +0.58 (reported)
- checkdown looks by trigger: base set 1 9397 looks (threat part 4660, status part 4661, count part 5596; rule part 4661 under STEP_1: rule only 3801, count only 4736, both 860, neither 0); set 2 8677 looks (threat part 4874, status part 4876, count part 4448; rule part 4876 under STEP_1: rule only 4229, count only 3801, both 647, neither 0); arm set 1 8892 looks (threat part 3821, status part 3822, count part 5871; rule part 3822 under COUNTER_LESS_SEEN: rule only 3021, count only 5070, both 801, neither 0); set 2 8008 looks (threat part 4126, status part 4126, count part 4524; rule part 4126 under COUNTER_LESS_SEEN: rule only 3484, count only 3882, both 642, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 55.82% / count 44.18% / status 0.00% / none 0.00% -> arm threat 49.18% / count 50.79% / status 0.03% / none 0.00%; the class's rise -0.44, re-weighted to the base's composition -0.40 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 64.14% / count 35.83% / status 0.03% / none 0.00% -> arm threat 59.18% / count 40.82% / status 0.00% / none 0.00%; the class's rise -0.43, re-weighted to the base's composition n/a (reported)

### B5 against A5, flat

- league-wide: set 1 2.76 -> 2.61, rise -0.15 / allowed -0.00 / SE 0.11 / z -1.29 (filed: within the allowance; 39716 aimed); set 2 2.70 -> 2.76, rise +0.06 / allowed +0.00 / SE 0.12 / z +0.51 (filed: above the allowance; 39997 aimed); Z -0.55 against 2.0, e* 0.16, mean excess -0.04: PASS; paired SE 0.09 (set 1, 496 games, z -1.69), 0.08 (set 2, 496 games, z +0.70); paired Z -0.70 (reported, never graded)
- PROGRESSION: set 1 0.36 -> 0.37, rise +0.01 / allowed -0.01 / SE 0.06 / z +0.22 (filed: above the allowance; 20427 aimed); set 2 0.37 -> 0.38, rise +0.01 / allowed +0.00 / SE 0.06 / z +0.09 (filed: above the allowance; 20642 aimed); Z +0.22 against 3.0, e* 0.13, mean excess +0.01: PASS; paired SE 0.04 (set 1, 496 games, z +0.33), 0.04 (set 2, 496 games, z +0.14); paired Z +0.33 (reported, never graded)
- RANK_PUSHED: set 1 12.27 -> 11.69, rise -0.58 / allowed -0.02 / SE 0.57 / z -0.99 (filed: within the allowance; 6570 aimed); set 2 11.54 -> 11.89, rise +0.35 / allowed -0.02 / SE 0.56 / z +0.67 (filed: above the allowance; 6703 aimed); Z -0.23 against 3.0, e* 1.19, mean excess -0.09: PASS; paired SE 0.42 (set 1, 496 games, z -1.33), 0.41 (set 2, 496 games, z +0.91); paired Z -0.30 (reported, never graded)
- CHECKDOWN: set 1 0.21 -> 0.13, rise -0.08 / allowed +0.00 / SE 0.06 / z -1.38 (filed: within the allowance; 9163 aimed); set 2 0.24 -> 0.22, rise -0.02 / allowed +0.01 / SE 0.07 / z -0.33 (filed: within the allowance; 9044 aimed); Z -1.21 against 3.0, e* 0.14, mean excess -0.05: PASS; paired SE 0.05 (set 1, 496 games, z -1.68), 0.05 (set 2, 496 games, z -0.43); paired Z -1.49 (reported, never graded)
- DESPERATION: set 1 5.42 -> 4.95, rise -0.47 / allowed +0.02 / SE 0.54 / z -0.90 (filed: within the allowance; 3376 aimed); set 2 5.51 -> 5.80, rise +0.29 / allowed +0.03 / SE 0.56 / z +0.47 (filed: above the allowance; 3413 aimed); Z -0.30 against 3.0, e* 1.16, mean excess -0.11: PASS; paired SE 0.41 (set 1, 496 games, z -1.18), 0.38 (set 2, 496 games, z +0.70); paired Z -0.35 (reported, never graded)
- ON_THE_RUN: set 1 5.29 -> 7.22, rise +1.93 / allowed +0.12 / SE 2.52 / z +0.72 (filed: above the allowance; 180 aimed); set 2 9.90 -> 5.13, rise -4.77 / allowed +0.07 / SE 2.67 / z -1.81 (filed: within the allowance; 195 aimed); Z -0.77 against 3.0, e* 5.51, mean excess -1.52: PASS; paired SE 1.94 (set 1, 496 games, z +0.93), 2.32 (set 2, 496 games, z -2.08); paired Z -0.82 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1285 aimed / 63 INT -> arm 1235 / 57; set 2 base 1396 aimed / 62 INT -> arm 1313 / 62; set 1 4.90 -> 4.62, rise -0.29 / allowed +0.09 / SE 0.85 / z -0.44 (filed: within the allowance; 1235 aimed); set 2 4.44 -> 4.72, rise +0.28 / allowed +0.07 / SE 0.80 / z +0.27 (filed: above the allowance; 1313 aimed); Z -0.13 against 3.0, e* 1.75, mean excess -0.08 (reported); paired SE 0.66 (set 1, 496 games, z -0.57), 0.54 (set 2, 496 games, z +0.39); paired Z -0.13 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2039 aimed / 117 INT -> arm 2141 / 110; set 2 base 2087 aimed / 130 INT -> arm 2100 / 136; set 1 5.74 -> 5.14, rise -0.60 / allowed -0.01 / SE 0.70 / z -0.84 (filed: within the allowance; 2141 aimed); set 2 6.23 -> 6.48, rise +0.25 / allowed +0.01 / SE 0.75 / z +0.31 (filed: above the allowance; 2100 aimed); Z -0.38 against 3.0, e* 1.54, mean excess -0.18 (reported); paired SE 0.50 (set 1, 496 games, z -1.19), 0.52 (set 2, 496 games, z +0.45); paired Z -0.52 (reported, never graded)
- DESPERATION composition, set 1: base dirty 38.66% / clean 61.34% -> arm dirty 36.58% / clean 63.42%; the class's rise -0.47, re-weighted to the base's composition -0.48 (reported)
- DESPERATION composition, set 2: base dirty 40.08% / clean 59.92% -> arm dirty 38.47% / clean 61.53%; the class's rise +0.29, re-weighted to the base's composition +0.26 (reported)
- checkdown looks by trigger: base set 1 27038 looks (threat part 8073, status part 8169, count part 22343; rule part 8169 under STEP_1: rule only 4695, count only 18869, both 3474, neither 0); set 2 27291 looks (threat part 8216, status part 8314, count part 22547; rule part 8314 under STEP_1: rule only 4744, count only 18977, both 3570, neither 0); arm set 1 26493 looks (threat part 6457, status part 6755, count part 22884; rule part 6755 under STEP_1: rule only 3609, count only 19738, both 3146, neither 0); set 2 26728 looks (threat part 6455, status part 6719, count part 23076; rule part 6719 under STEP_1: rule only 3652, count only 20009, both 3067, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 33.43% / count 66.39% / status 0.18% / none 0.00% -> arm threat 27.71% / count 71.71% / status 0.58% / none 0.00%; the class's rise -0.08, re-weighted to the base's composition -0.07 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 33.19% / count 66.64% / status 0.16% / none 0.00% -> arm threat 26.67% / count 72.82% / status 0.51% / none 0.00%; the class's rise -0.02, re-weighted to the base's composition -0.01 (reported)

### B5 against A5, gen

- league-wide: set 1 7.44 -> 7.63, rise +0.19 / allowed +0.01 / SE 0.24 / z +0.77 (filed: above the allowance; 24699 aimed); set 2 7.64 -> 7.53, rise -0.11 / allowed +0.01 / SE 0.24 / z -0.48 (filed: within the allowance; 25155 aimed); Z +0.20 against 2.0, e* 0.34, mean excess +0.03: PASS; paired SE 0.17 (set 1, 272 games, z +1.11), 0.15 (set 2, 272 games, z -0.74); paired Z +0.26 (reported, never graded)
- PROGRESSION: set 1 2.33 -> 2.39, rise +0.05 / allowed +0.00 / SE 0.18 / z +0.29 (filed: above the allowance; 13855 aimed); set 2 2.77 -> 2.61, rise -0.15 / allowed -0.00 / SE 0.19 / z -0.80 (filed: within the allowance; 14507 aimed); Z -0.36 against 3.0, e* 0.40, mean excess -0.05: PASS; paired SE 0.14 (set 1, 272 games, z +0.37), 0.14 (set 2, 272 games, z -1.14); paired Z -0.54 (reported, never graded)
- RANK_PUSHED: set 1 20.86 -> 21.39, rise +0.53 / allowed -0.01 / SE 0.91 / z +0.59 (filed: above the allowance; 4104 aimed); set 2 20.28 -> 20.78, rise +0.51 / allowed -0.02 / SE 0.91 / z +0.57 (filed: above the allowance; 4032 aimed); Z +0.83 against 3.0, e* 1.93, mean excess +0.53: PASS; paired SE 0.63 (set 1, 272 games, z +0.86), 0.66 (set 2, 272 games, z +0.79); paired Z +1.17 (reported, never graded)
- CHECKDOWN: set 1 3.58 -> 3.26, rise -0.32 / allowed +0.04 / SE 0.42 / z -0.84 (filed: within the allowance; 3680 aimed); set 2 3.94 -> 3.90, rise -0.03 / allowed +0.06 / SE 0.46 / z -0.21 (filed: within the allowance; 3433 aimed); Z -0.74 against 3.0, e* 0.93, mean excess -0.22: PASS; paired SE 0.32 (set 1, 272 games, z -1.10), 0.36 (set 2, 272 games, z -0.27); paired Z -0.97 (reported, never graded)
- DESPERATION: set 1 17.42 -> 18.20, rise +0.78 / allowed +0.04 / SE 0.98 / z +0.75 (filed: above the allowance; 2995 aimed); set 2 17.71 -> 17.27, rise -0.44 / allowed +0.04 / SE 0.96 / z -0.49 (filed: within the allowance; 3097 aimed); Z +0.18 against 3.0, e* 2.06, mean excess +0.13: PASS; paired SE 0.67 (set 1, 272 games, z +1.10), 0.67 (set 2, 272 games, z -0.71); paired Z +0.28 (reported, never graded)
- ON_THE_RUN: set 1 12.88 -> 16.92, rise +4.04 / allowed +0.44 / SE 5.49 / z +0.66 (filed: above the allowance; 65 aimed); set 2 17.02 -> 9.30, rise -7.72 / allowed +0.29 / SE 4.45 / z -1.80 (filed: within the allowance; 86 aimed); Z -0.81 against 3.0, e* 10.43, mean excess -2.20: PASS; paired SE 4.78 (set 1, 272 games, z +0.75), 3.78 (set 2, 272 games, z -2.12); paired Z -0.97 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1628 aimed / 260 INT -> arm 1509 / 227; set 2 base 1765 aimed / 285 INT -> arm 1653 / 263; set 1 15.97 -> 15.04, rise -0.93 / allowed +0.12 / SE 1.29 / z -0.81 (filed: within the allowance; 1509 aimed); set 2 16.15 -> 15.91, rise -0.24 / allowed +0.08 / SE 1.26 / z -0.25 (filed: within the allowance; 1653 aimed); Z -0.75 against 3.0, e* 2.70, mean excess -0.68 (reported); paired SE 0.95 (set 1, 272 games, z -1.10), 0.90 (set 2, 272 games, z -0.36); paired Z -1.03 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1478 aimed / 281 INT -> arm 1486 / 318; set 2 base 1363 aimed / 269 INT -> arm 1444 / 272; set 1 19.01 -> 21.40, rise +2.39 / allowed -0.01 / SE 1.47 / z +1.63 (filed: above the allowance; 1486 aimed); set 2 19.74 -> 18.84, rise -0.90 / allowed +0.01 / SE 1.49 / z -0.61 (filed: within the allowance; 1444 aimed); Z +0.72 against 3.0, e* 3.14, mean excess +0.74 (reported); paired SE 1.05 (set 1, 272 games, z +2.30), 1.03 (set 2, 272 games, z -0.89); paired Z +1.00 (reported, never graded)
- DESPERATION composition, set 1: base dirty 52.41% / clean 47.59% -> arm dirty 50.38% / clean 49.62%; the class's rise +0.78, re-weighted to the base's composition +0.65 (reported)
- DESPERATION composition, set 2: base dirty 56.43% / clean 43.57% -> arm dirty 53.37% / clean 46.63%; the class's rise -0.44, re-weighted to the base's composition -0.53 (reported)
- checkdown looks by trigger: base set 1 9594 looks (threat part 4876, status part 5030, count part 5496; rule part 5030 under STEP_1: rule only 4098, count only 4564, both 932, neither 0); set 2 8814 looks (threat part 5009, status part 5175, count part 4414; rule part 5175 under STEP_1: rule only 4400, count only 3639, both 775, neither 0); arm set 1 9185 looks (threat part 4093, status part 4368, count part 5767; rule part 4368 under STEP_1: rule only 3418, count only 4817, both 950, neither 0); set 2 8239 looks (threat part 4248, status part 4561, count part 4445; rule part 4561 under STEP_1: rule only 3794, count only 3678, both 767, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 55.90% / count 43.20% / status 0.90% / none 0.00% -> arm threat 51.28% / count 47.01% / status 1.71% / none 0.00%; the class's rise -0.32, re-weighted to the base's composition -0.29 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 63.13% / count 35.77% / status 1.11% / none 0.00% -> arm threat 58.99% / count 38.39% / status 2.62% / none 0.00%; the class's rise -0.03, re-weighted to the base's composition +0.08 (reported)

### B6 against A11, flat

- league-wide: set 1 2.86 -> 3.02, rise +0.15 / allowed -0.00 / SE 0.13 / z +1.21 (filed: above the allowance; 33374 aimed); set 2 2.85 -> 2.82, rise -0.03 / allowed -0.00 / SE 0.13 / z -0.18 (filed: within the allowance; 33426 aimed); Z +0.73 against 2.0, e* 0.18, mean excess +0.07: PASS; paired SE 0.09 (set 1, 496 games, z +1.70), 0.09 (set 2, 496 games, z -0.25); paired Z +1.02 (reported, never graded)
- PROGRESSION: set 1 0.29 -> 0.36, rise +0.08 / allowed +0.00 / SE 0.06 / z +1.34 (filed: above the allowance; 20007 aimed); set 2 0.31 -> 0.28, rise -0.03 / allowed +0.00 / SE 0.05 / z -0.67 (filed: within the allowance; 20204 aimed); Z +0.48 against 3.0, e* 0.12, mean excess +0.02: PASS; paired SE 0.04 (set 1, 496 games, z +2.16), 0.04 (set 2, 496 games, z -0.91); paired Z +0.88 (reported, never graded)
- RANK_PUSHED: set 1 11.40 -> 11.81, rise +0.40 / allowed -0.01 / SE 0.58 / z +0.71 (filed: above the allowance; 6200 aimed); set 2 11.94 -> 11.31, rise -0.64 / allowed -0.01 / SE 0.58 / z -1.08 (filed: within the allowance; 6218 aimed); Z -0.26 against 3.0, e* 1.23, mean excess -0.11: PASS; paired SE 0.43 (set 1, 496 games, z +0.95), 0.40 (set 2, 496 games, z -1.57); paired Z -0.44 (reported, never graded)
- CHECKDOWN: set 1 0.18 -> 0.17, rise -0.02 / allowed -0.02 / SE 0.09 / z +0.04 (filed: above the allowance; 4187 aimed); set 2 0.12 -> 0.19, rise +0.08 / allowed -0.00 / SE 0.09 / z +0.90 (filed: above the allowance; 4120 aimed); Z +0.66 against 3.0, e* 0.19, mean excess +0.04: PASS; paired SE 0.07 (set 1, 496 games, z +0.06), 0.07 (set 2, 496 games, z +1.19); paired Z +0.88 (reported, never graded)
- DESPERATION: set 1 6.41 -> 6.35, rise -0.06 / allowed +0.02 / SE 0.65 / z -0.12 (filed: within the allowance; 2836 aimed); set 2 5.24 -> 6.06, rise +0.82 / allowed -0.01 / SE 0.62 / z +1.34 (filed: above the allowance; 2740 aimed); Z +0.86 against 3.0, e* 1.34, mean excess +0.38: PASS; paired SE 0.45 (set 1, 496 games, z -0.17), 0.45 (set 2, 496 games, z +1.83); paired Z +1.17 (reported, never graded)
- ON_THE_RUN: set 1 5.56 -> 10.42, rise +4.86 / allowed -0.04 / SE 3.18 / z +1.54 (filed: above the allowance; 144 aimed); set 2 3.52 -> 6.94, rise +3.42 / allowed +0.00 / SE 2.62 / z +1.30 (filed: above the allowance; 144 aimed); Z +2.01 against 3.0, e* 6.10, mean excess +4.16: PASS; paired SE 2.43 (set 1, 496 games, z +2.02), 2.43 (set 2, 496 games, z +1.41); paired Z +2.42 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1290 aimed / 74 INT -> arm 1212 / 59; set 2 base 1180 aimed / 50 INT -> arm 1159 / 58; set 1 5.74 -> 4.87, rise -0.87 / allowed +0.00 / SE 0.90 / z -0.97 (filed: within the allowance; 1212 aimed); set 2 4.24 -> 5.00, rise +0.77 / allowed +0.00 / SE 0.87 / z +0.88 (filed: above the allowance; 1159 aimed); Z -0.06 against 3.0, e* 1.87, mean excess -0.05 (reported); paired SE 0.72 (set 1, 496 games, z -1.21), 0.71 (set 2, 496 games, z +1.08); paired Z -0.09 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1613 aimed / 112 INT -> arm 1624 / 121; set 2 base 1588 aimed / 95 INT -> arm 1581 / 108; set 1 6.94 -> 7.45, rise +0.51 / allowed +0.02 / SE 0.91 / z +0.54 (filed: above the allowance; 1624 aimed); set 2 5.98 -> 6.83, rise +0.85 / allowed -0.02 / SE 0.87 / z +1.00 (filed: above the allowance; 1581 aimed); Z +1.09 against 3.0, e* 1.89, mean excess +0.68 (reported); paired SE 0.65 (set 1, 496 games, z +0.75), 0.64 (set 2, 496 games, z +1.37); paired Z +1.50 (reported, never graded)
- DESPERATION composition, set 1: base dirty 44.44% / clean 55.56% -> arm dirty 42.74% / clean 57.26%; the class's rise -0.06, re-weighted to the base's composition -0.10 (reported)
- DESPERATION composition, set 2: base dirty 42.63% / clean 57.37% -> arm dirty 42.30% / clean 57.70%; the class's rise +0.82, re-weighted to the base's composition +0.81 (reported)
- checkdown looks by trigger: base set 1 12686 looks (threat part 8125, status part 8224, count part 5388; rule part 8224 under STEP_1: rule only 7298, count only 4462, both 926, neither 0); set 2 12502 looks (threat part 8075, status part 8187, count part 5208; rule part 8187 under STEP_1: rule only 7294, count only 4315, both 893, neither 0); arm set 1 12123 looks (threat part 7455, status part 7481, count part 5398; rule part 7455 under PER_RUSHER: rule only 6725, count only 4668, both 730, neither 0); set 2 11927 looks (threat part 7323, status part 7358, count part 5277; rule part 7323 under PER_RUSHER: rule only 6650, count only 4604, both 673, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 69.10% / count 30.69% / status 0.21% / none 0.00% -> arm threat 67.78% / count 32.22% / status 0.00% / none 0.00%; the class's rise -0.02, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 70.01% / count 29.87% / status 0.12% / none 0.00% -> arm threat 67.96% / count 32.04% / status 0.00% / none 0.00%; the class's rise +0.08, re-weighted to the base's composition n/a (reported)

### B6 against A11, gen

- league-wide: set 1 7.25 -> 7.38, rise +0.13 / allowed -0.00 / SE 0.26 / z +0.51 (filed: above the allowance; 20783 aimed); set 2 7.91 -> 7.65, rise -0.26 / allowed -0.00 / SE 0.26 / z -0.99 (filed: within the allowance; 20856 aimed); Z -0.34 against 2.0, e* 0.37, mean excess -0.06: PASS; paired SE 0.20 (set 1, 272 games, z +0.66), 0.17 (set 2, 272 games, z -1.48); paired Z -0.58 (reported, never graded)
- PROGRESSION: set 1 2.06 -> 2.19, rise +0.13 / allowed -0.00 / SE 0.18 / z +0.73 (filed: above the allowance; 12425 aimed); set 2 2.39 -> 2.40, rise +0.02 / allowed +0.01 / SE 0.20 / z +0.05 (filed: above the allowance; 12312 aimed); Z +0.55 against 3.0, e* 0.40, mean excess +0.07: PASS; paired SE 0.13 (set 1, 272 games, z +1.00), 0.14 (set 2, 272 games, z +0.07); paired Z +0.76 (reported, never graded)
- RANK_PUSHED: set 1 21.11 -> 21.87, rise +0.76 / allowed +0.00 / SE 1.00 / z +0.76 (filed: above the allowance; 3398 aimed); set 2 21.42 -> 20.34, rise -1.07 / allowed +0.00 / SE 0.98 / z -1.10 (filed: within the allowance; 3441 aimed); Z -0.24 against 3.0, e* 2.10, mean excess -0.16: PASS; paired SE 0.70 (set 1, 272 games, z +1.07), 0.70 (set 2, 272 games, z -1.54); paired Z -0.33 (reported, never graded)
- CHECKDOWN: set 1 3.66 -> 3.93, rise +0.27 / allowed -0.03 / SE 0.55 / z +0.54 (filed: above the allowance; 2318 aimed); set 2 4.11 -> 4.13, rise +0.02 / allowed -0.05 / SE 0.57 / z +0.11 (filed: above the allowance; 2375 aimed); Z +0.46 against 3.0, e* 1.19, mean excess +0.18: PASS; paired SE 0.52 (set 1, 272 games, z +0.58), 0.46 (set 2, 272 games, z +0.14); paired Z +0.51 (reported, never graded)
- DESPERATION: set 1 16.90 -> 16.17, rise -0.72 / allowed +0.03 / SE 1.04 / z -0.73 (filed: within the allowance; 2560 aimed); set 2 19.05 -> 18.49, rise -0.55 / allowed +0.02 / SE 1.07 / z -0.54 (filed: within the allowance; 2644 aimed); Z -0.89 against 3.0, e* 2.24, mean excess -0.67: PASS; paired SE 0.77 (set 1, 272 games, z -0.99), 0.75 (set 2, 272 games, z -0.76); paired Z -1.24 (reported, never graded)
- ON_THE_RUN: set 1 16.00 -> 15.85, rise -0.15 / allowed +0.04 / SE 5.45 / z -0.03 (filed: within the allowance; 82 aimed); set 2 17.05 -> 14.29, rise -2.76 / allowed -0.01 / SE 5.54 / z -0.50 (filed: within the allowance; 84 aimed); Z -0.38 against 3.0, e* 11.65, mean excess -1.47: PASS; paired SE 4.60 (set 1, 272 games, z -0.04), 4.85 (set 2, 272 games, z -0.57); paired Z -0.43 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1296 aimed / 201 INT -> arm 1314 / 201; set 2 base 1456 aimed / 251 INT -> arm 1405 / 223; set 1 15.51 -> 15.30, rise -0.21 / allowed +0.02 / SE 1.41 / z -0.17 (filed: within the allowance; 1314 aimed); set 2 17.24 -> 15.87, rise -1.37 / allowed -0.00 / SE 1.39 / z -0.98 (filed: within the allowance; 1405 aimed); Z -0.81 against 3.0, e* 2.97, mean excess -0.80 (reported); paired SE 1.10 (set 1, 272 games, z -0.22), 1.10 (set 2, 272 games, z -1.24); paired Z -1.03 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1255 aimed / 230 INT -> arm 1246 / 213; set 2 base 1216 aimed / 258 INT -> arm 1239 / 266; set 1 18.33 -> 17.09, rise -1.23 / allowed +0.04 / SE 1.53 / z -0.84 (filed: within the allowance; 1246 aimed); set 2 21.22 -> 21.47, rise +0.25 / allowed +0.03 / SE 1.65 / z +0.13 (filed: above the allowance; 1239 aimed); Z -0.50 against 3.0, e* 3.37, mean excess -0.53 (reported); paired SE 1.06 (set 1, 272 games, z -1.20), 1.14 (set 2, 272 games, z +0.19); paired Z -0.71 (reported, never graded)
- DESPERATION composition, set 1: base dirty 50.80% / clean 49.20% -> arm dirty 51.33% / clean 48.67%; the class's rise -0.72, re-weighted to the base's composition -0.71 (reported)
- DESPERATION composition, set 2: base dirty 54.49% / clean 45.51% -> arm dirty 53.14% / clean 46.86%; the class's rise -0.55, re-weighted to the base's composition -0.63 (reported)
- checkdown looks by trigger: base set 1 5857 looks (threat part 4428, status part 4484, count part 1619; rule part 4484 under STEP_1: rule only 4238, count only 1373, both 246, neither 0); set 2 5947 looks (threat part 4672, status part 4727, count part 1457; rule part 4727 under STEP_1: rule only 4490, count only 1220, both 237, neither 0); arm set 1 5529 looks (threat part 4078, status part 4097, count part 1657; rule part 4078 under PER_RUSHER: rule only 3872, count only 1451, both 206, neither 0); set 2 5556 looks (threat part 4335, status part 4360, count part 1408; rule part 4335 under PER_RUSHER: rule only 4148, count only 1221, both 187, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 83.02% / count 16.86% / status 0.12% / none 0.00% -> arm threat 80.93% / count 19.07% / status 0.00% / none 0.00%; the class's rise +0.27, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 84.53% / count 15.16% / status 0.31% / none 0.00% -> arm threat 84.21% / count 15.79% / status 0.00% / none 0.00%; the class's rise +0.02, re-weighted to the base's composition n/a (reported)

### B7 against A1, flat

- league-wide: set 1 2.64 -> 2.82, rise +0.18 / allowed +0.00 / SE 0.12 / z +1.56 (filed: above the allowance; 39678 aimed); set 2 2.71 -> 2.75, rise +0.04 / allowed -0.00 / SE 0.12 / z +0.41 (filed: above the allowance; 39905 aimed); Z +1.40 against 2.0, e* 0.16, mean excess +0.11: PASS; paired SE 0.08 (set 1, 496 games, z +2.20), 0.08 (set 2, 496 games, z +0.59); paired Z +1.97 (reported, never graded)
- PROGRESSION: set 1 0.30 -> 0.35, rise +0.05 / allowed +0.00 / SE 0.06 / z +0.87 (filed: above the allowance; 20466 aimed); set 2 0.32 -> 0.39, rise +0.08 / allowed +0.00 / SE 0.06 / z +1.30 (filed: above the allowance; 20545 aimed); Z +1.54 against 3.0, e* 0.12, mean excess +0.06: PASS; paired SE 0.04 (set 1, 496 games, z +1.26), 0.04 (set 2, 496 games, z +1.89); paired Z +2.23 (reported, never graded)
- RANK_PUSHED: set 1 12.04 -> 12.63, rise +0.59 / allowed -0.01 / SE 0.58 / z +1.04 (filed: above the allowance; 6618 aimed); set 2 11.76 -> 11.59, rise -0.17 / allowed -0.02 / SE 0.56 / z -0.27 (filed: within the allowance; 6669 aimed); Z +0.55 against 3.0, e* 1.20, mean excess +0.23: PASS; paired SE 0.41 (set 1, 496 games, z +1.46), 0.40 (set 2, 496 games, z -0.38); paired Z +0.77 (reported, never graded)
- CHECKDOWN: set 1 0.17 -> 0.21, rise +0.04 / allowed +0.00 / SE 0.06 / z +0.52 (filed: above the allowance; 9011 aimed); set 2 0.23 -> 0.16, rise -0.06 / allowed +0.00 / SE 0.07 / z -0.99 (filed: within the allowance; 9131 aimed); Z -0.33 against 3.0, e* 0.14, mean excess -0.02: PASS; paired SE 0.04 (set 1, 496 games, z +0.79), 0.05 (set 2, 496 games, z -1.41); paired Z -0.44 (reported, never graded)
- DESPERATION: set 1 5.13 -> 5.38, rise +0.25 / allowed +0.01 / SE 0.55 / z +0.44 (filed: above the allowance; 3436 aimed); set 2 5.42 -> 6.30, rise +0.88 / allowed -0.01 / SE 0.57 / z +1.58 (filed: above the allowance; 3429 aimed); Z +1.43 against 3.0, e* 1.18, mean excess +0.57: PASS; paired SE 0.40 (set 1, 496 games, z +0.59), 0.41 (set 2, 496 games, z +2.18); paired Z +1.96 (reported, never graded)
- ON_THE_RUN: set 1 6.45 -> 5.44, rise -1.01 / allowed +0.11 / SE 2.72 / z -0.41 (filed: within the allowance; 147 aimed); set 2 13.48 -> 9.16, rise -4.31 / allowed +0.13 / SE 3.82 / z -1.16 (filed: within the allowance; 131 aimed); Z -1.11 against 3.0, e* 6.74, mean excess -2.78: PASS; paired SE 2.18 (set 1, 496 games, z -0.51), 2.98 (set 2, 496 games, z -1.49); paired Z -1.42 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1054 aimed / 43 INT -> arm 996 / 42; set 2 base 1132 aimed / 44 INT -> arm 983 / 40; set 1 4.08 -> 4.22, rise +0.14 / allowed +0.05 / SE 0.88 / z +0.10 (filed: above the allowance; 996 aimed); set 2 3.89 -> 4.07, rise +0.18 / allowed +0.00 / SE 0.85 / z +0.21 (filed: above the allowance; 983 aimed); Z +0.22 against 3.0, e* 1.84, mean excess +0.13 (reported); paired SE 0.71 (set 1, 496 games, z +0.12), 0.68 (set 2, 496 games, z +0.26); paired Z +0.27 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 2199 aimed / 124 INT -> arm 2440 / 143; set 2 base 2338 aimed / 144 INT -> arm 2446 / 176; set 1 5.64 -> 5.86, rise +0.22 / allowed -0.01 / SE 0.68 / z +0.33 (filed: above the allowance; 2440 aimed); set 2 6.16 -> 7.20, rise +1.04 / allowed -0.02 / SE 0.72 / z +1.46 (filed: above the allowance; 2446 aimed); Z +1.27 against 3.0, e* 1.49, mean excess +0.64 (reported); paired SE 0.49 (set 1, 496 games, z +0.47), 0.51 (set 2, 496 games, z +2.07); paired Z +1.79 (reported, never graded)
- DESPERATION composition, set 1: base dirty 32.40% / clean 67.60% -> arm dirty 28.99% / clean 71.01%; the class's rise +0.25, re-weighted to the base's composition +0.19 (reported)
- DESPERATION composition, set 2: base dirty 32.62% / clean 67.38% -> arm dirty 28.67% / clean 71.33%; the class's rise +0.88, re-weighted to the base's composition +0.76 (reported)
- checkdown looks by trigger: base set 1 26751 looks (threat part 7924, status part 7925, count part 22307; rule part 7925 under STEP_1: rule only 4444, count only 18826, both 3481, neither 0); set 2 27286 looks (threat part 8205, status part 8208, count part 22751; rule part 8208 under STEP_1: rule only 4535, count only 19078, both 3673, neither 0); arm set 1 26209 looks (threat part 6304, status part 6309, count part 22880; rule part 6309 under STEP_1: rule only 3329, count only 19900, both 2980, neither 0); set 2 26352 looks (threat part 6381, status part 6387, count part 22919; rule part 6387 under STEP_1: rule only 3433, count only 19965, both 2954, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 33.57% / count 66.43% / status 0.00% / none 0.00% -> arm threat 27.80% / count 72.18% / status 0.02% / none 0.00%; the class's rise +0.04, re-weighted to the base's composition +0.05 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 32.96% / count 67.03% / status 0.01% / none 0.00% -> arm threat 27.75% / count 72.23% / status 0.02% / none 0.00%; the class's rise -0.06, re-weighted to the base's composition -0.06 (reported)

### B7 against A1, gen

- league-wide: set 1 7.67 -> 7.30, rise -0.37 / allowed +0.01 / SE 0.24 / z -1.57 (filed: within the allowance; 24387 aimed); set 2 7.74 -> 7.69, rise -0.06 / allowed +0.01 / SE 0.24 / z -0.27 (filed: within the allowance; 24991 aimed); Z -1.31 against 2.0, e* 0.34, mean excess -0.22: PASS; paired SE 0.17 (set 1, 272 games, z -2.19), 0.16 (set 2, 272 games, z -0.40); paired Z -1.84 (reported, never graded)
- PROGRESSION: set 1 2.50 -> 2.72, rise +0.22 / allowed +0.00 / SE 0.19 / z +1.10 (filed: above the allowance; 13834 aimed); set 2 2.66 -> 2.78, rise +0.12 / allowed +0.01 / SE 0.19 / z +0.54 (filed: above the allowance; 14532 aimed); Z +1.16 against 3.0, e* 0.41, mean excess +0.16: PASS; paired SE 0.14 (set 1, 272 games, z +1.52), 0.14 (set 2, 272 games, z +0.77); paired Z +1.62 (reported, never graded)
- RANK_PUSHED: set 1 21.51 -> 19.74, rise -1.78 / allowed +0.01 / SE 0.91 / z -1.97 (filed: within the allowance; 4038 aimed); set 2 20.89 -> 20.67, rise -0.22 / allowed -0.04 / SE 0.91 / z -0.20 (filed: within the allowance; 4039 aimed); Z -1.53 against 3.0, e* 1.92, mean excess -0.98: PASS; paired SE 0.66 (set 1, 272 games, z -2.69), 0.70 (set 2, 272 games, z -0.26); paired Z -2.09 (reported, never graded)
- CHECKDOWN: set 1 3.65 -> 3.21, rise -0.44 / allowed +0.03 / SE 0.42 / z -1.13 (filed: within the allowance; 3555 aimed); set 2 4.17 -> 3.74, rise -0.43 / allowed +0.06 / SE 0.47 / z -1.04 (filed: within the allowance; 3314 aimed); Z -1.53 against 3.0, e* 0.95, mean excess -0.48: PASS; paired SE 0.34 (set 1, 272 games, z -1.39), 0.37 (set 2, 272 games, z -1.31); paired Z -1.91 (reported, never graded)
- DESPERATION: set 1 17.16 -> 16.57, rise -0.58 / allowed +0.02 / SE 0.97 / z -0.62 (filed: within the allowance; 2890 aimed); set 2 17.54 -> 18.19, rise +0.65 / allowed +0.04 / SE 0.98 / z +0.62 (filed: above the allowance; 3035 aimed); Z +0.00 against 3.0, e* 2.07, mean excess +0.00: PASS; paired SE 0.70 (set 1, 272 games, z -0.87), 0.72 (set 2, 272 games, z +0.85); paired Z -0.01 (reported, never graded)
- ON_THE_RUN: set 1 17.04 -> 20.00, rise +2.96 / allowed +0.38 / SE 5.77 / z +0.45 (filed: above the allowance; 70 aimed); set 2 16.00 -> 8.45, rise -7.55 / allowed +0.15 / SE 4.46 / z -1.73 (filed: within the allowance; 71 aimed); Z -0.91 against 3.0, e* 10.67, mean excess -2.56: PASS; paired SE 5.25 (set 1, 272 games, z +0.49), 3.14 (set 2, 272 games, z -2.45); paired Z -1.38 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1227 aimed / 185 INT -> arm 1054 / 150; set 2 base 1357 aimed / 206 INT -> arm 1219 / 203; set 1 15.08 -> 14.23, rise -0.85 / allowed +0.06 / SE 1.48 / z -0.61 (filed: within the allowance; 1054 aimed); set 2 15.18 -> 16.65, rise +1.47 / allowed +0.10 / SE 1.44 / z +0.95 (filed: above the allowance; 1219 aimed); Z +0.24 against 3.0, e* 3.11, mean excess +0.23 (reported); paired SE 1.14 (set 1, 272 games, z -0.79), 1.12 (set 2, 272 games, z +1.23); paired Z +0.31 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 1798 aimed / 334 INT -> arm 1836 / 329; set 2 base 1756 aimed / 340 INT -> arm 1816 / 349; set 1 18.58 -> 17.92, rise -0.66 / allowed -0.01 / SE 1.28 / z -0.50 (filed: within the allowance; 1836 aimed); set 2 19.36 -> 19.22, rise -0.14 / allowed -0.02 / SE 1.32 / z -0.09 (filed: within the allowance; 1816 aimed); Z -0.42 against 3.0, e* 2.76, mean excess -0.38 (reported); paired SE 0.88 (set 1, 272 games, z -0.73), 0.87 (set 2, 272 games, z -0.14); paired Z -0.62 (reported, never graded)
- DESPERATION composition, set 1: base dirty 40.56% / clean 59.44% -> arm dirty 36.47% / clean 63.53%; the class's rise -0.58, re-weighted to the base's composition -0.73 (reported)
- DESPERATION composition, set 2: base dirty 43.59% / clean 56.41% -> arm dirty 40.16% / clean 59.84%; the class's rise +0.65, re-weighted to the base's composition +0.56 (reported)
- checkdown looks by trigger: base set 1 9397 looks (threat part 4660, status part 4661, count part 5596; rule part 4661 under STEP_1: rule only 3801, count only 4736, both 860, neither 0); set 2 8677 looks (threat part 4874, status part 4876, count part 4448; rule part 4876 under STEP_1: rule only 4229, count only 3801, both 647, neither 0); arm set 1 8894 looks (threat part 3825, status part 3827, count part 5869; rule part 3827 under STEP_1: rule only 3025, count only 5067, both 802, neither 0); set 2 8003 looks (threat part 4123, status part 4130, count part 4515; rule part 4130 under STEP_1: rule only 3488, count only 3873, both 642, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 55.82% / count 44.18% / status 0.00% / none 0.00% -> arm threat 49.23% / count 50.75% / status 0.03% / none 0.00%; the class's rise -0.44, re-weighted to the base's composition -0.41 (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 64.14% / count 35.83% / status 0.03% / none 0.00% -> arm threat 59.29% / count 40.71% / status 0.00% / none 0.00%; the class's rise -0.43, re-weighted to the base's composition n/a (reported)

### B3 against A0, flat (the cumulative line: reported, never graded)

- league-wide: set 1 2.11 -> 2.83, rise +0.72 / allowed +0.20 / SE 0.12 / z +4.28 (filed: above the allowance; 39671 aimed); set 2 1.88 -> 2.75, rise +0.87 / allowed +0.20 / SE 0.12 / z +5.71 (filed: above the allowance; 39896 aimed); Z +7.07 against 2.0, e* 0.17, mean excess +0.59: BREACH; paired SE 0.11 (set 1, 496 games, z +4.69), 0.11 (set 2, 496 games, z +6.09); paired Z +7.62 (reported, never graded)
- PROGRESSION: set 1 0.29 -> 0.35, rise +0.05 / allowed +0.19 / SE 0.06 / z -2.05 (filed: within the allowance; 20461 aimed); set 2 0.25 -> 0.39, rise +0.14 / allowed +0.18 / SE 0.06 / z -0.54 (filed: within the allowance; 20543 aimed); Z -1.83 against 3.0, e* 0.14, mean excess -0.08: PASS; paired SE 0.05 (set 1, 496 games, z -2.51), 0.06 (set 2, 496 games, z -0.60); paired Z -2.20 (reported, never graded)
- RANK_PUSHED: set 1 11.62 -> 12.70, rise +1.08 / allowed +0.23 / SE 0.69 / z +1.24 (filed: above the allowance; 6616 aimed); set 2 10.66 -> 11.57, rise +0.91 / allowed +0.24 / SE 0.66 / z +1.03 (filed: above the allowance; 6671 aimed); Z +1.60 against 3.0, e* 1.43, mean excess +0.76: PASS; paired SE 0.63 (set 1, 496 games, z +1.35), 0.62 (set 2, 496 games, z +1.10); paired Z +1.73 (reported, never graded)
- CHECKDOWN: set 1 0.24 -> 0.21, rise -0.03 / allowed +0.17 / SE 0.07 / z -2.87 (filed: within the allowance; 9012 aimed); set 2 0.19 -> 0.16, rise -0.03 / allowed +0.17 / SE 0.06 / z -3.22 (filed: within the allowance; 9120 aimed); Z -4.30 against 3.0, e* 0.14, mean excess -0.20: PASS; paired SE 0.07 (set 1, 496 games, z -2.99), 0.06 (set 2, 496 games, z -3.43); paired Z -4.54 (reported, never graded)
- DESPERATION: set 1 4.07 -> 5.36, rise +1.28 / allowed +0.34 / SE 0.57 / z +1.65 (filed: above the allowance; 3435 aimed); set 2 3.52 -> 6.32, rise +2.80 / allowed +0.35 / SE 0.58 / z +4.26 (filed: above the allowance; 3431 aimed); Z +4.18 against 3.0, e* 1.22, mean excess +1.70: BREACH; paired SE 0.54 (set 1, 496 games, z +1.77), 0.52 (set 2, 496 games, z +4.76); paired Z +4.62 (reported, never graded)
- ON_THE_RUN: set 1 7.61 -> 5.44, rise -2.16 / allowed +0.36 / SE 2.34 / z -1.08 (filed: within the allowance; 147 aimed); set 2 5.85 -> 9.16, rise +3.31 / allowed +0.39 / SE 2.80 / z +1.04 (filed: above the allowance; 131 aimed); Z -0.02 against 3.0, e* 5.41, mean excess +0.20: PASS; paired SE 2.26 (set 1, 496 games, z -1.12), 2.99 (set 2, 496 games, z +0.98); paired Z -0.10 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1926 aimed / 70 INT -> arm 995 / 42; set 2 base 1896 aimed / 61 INT -> arm 981 / 41; set 1 3.63 -> 4.22, rise +0.59 / allowed +0.40 / SE 0.77 / z +0.24 (filed: above the allowance; 995 aimed); set 2 3.22 -> 4.18, rise +0.96 / allowed +0.37 / SE 0.76 / z +0.78 (filed: above the allowance; 981 aimed); Z +0.72 against 3.0, e* 1.62, mean excess +0.39 (reported); paired SE 0.75 (set 1, 496 games, z +0.25), 0.68 (set 2, 496 games, z +0.87); paired Z +0.79 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 235 aimed / 18 INT -> arm 2440 / 142; set 2 base 233 aimed / 14 INT -> arm 2450 / 176; set 1 7.66 -> 5.82, rise -1.84 / allowed +0.09 / SE 1.80 / z -1.07 (filed: within the allowance; 2440 aimed); set 2 6.01 -> 7.18, rise +1.18 / allowed +0.11 / SE 1.64 / z +0.65 (filed: above the allowance; 2450 aimed); Z -0.30 against 3.0, e* 3.64, mean excess -0.43 (reported); paired SE 1.75 (set 1, 496 games, z -1.10), 1.61 (set 2, 496 games, z +0.66); paired Z -0.31 (reported, never graded)
- DESPERATION composition, set 1: base dirty 89.13% / clean 10.87% -> arm dirty 28.97% / clean 71.03%; the class's rise +1.28, re-weighted to the base's composition +0.32 (reported)
- DESPERATION composition, set 2: base dirty 89.06% / clean 10.94% -> arm dirty 28.59% / clean 71.41%; the class's rise +2.80, re-weighted to the base's composition +0.99 (reported)
- checkdown looks by trigger: base set 1 25332 looks (threat part 21394, status part 21419, count part 12342; rule part 21419 under STEP_1: rule only 12990, count only 3913, both 8429, neither 0); set 2 25136 looks (threat part 21280, status part 21297, count part 12054; rule part 21297 under STEP_1: rule only 13082, count only 3839, both 8215, neither 0); arm set 1 26201 looks (threat part 6302, status part 6306, count part 22875; rule part 6302 under PER_RUSHER: rule only 3326, count only 19899, both 2976, neither 0); set 2 26345 looks (threat part 6378, status part 6382, count part 22922; rule part 6378 under PER_RUSHER: rule only 3423, count only 19967, both 2955, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 88.31% / count 11.68% / status 0.01% / none 0.00% -> arm threat 27.80% / count 72.20% / status 0.00% / none 0.00%; the class's rise -0.03, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 88.54% / count 11.42% / status 0.04% / none 0.00% -> arm threat 27.74% / count 72.26% / status 0.00% / none 0.00%; the class's rise -0.03, re-weighted to the base's composition n/a (reported)

### B3 against A0, gen (the cumulative line: reported, never graded)

- league-wide: set 1 6.80 -> 7.30, rise +0.50 / allowed +0.34 / SE 0.25 / z +0.65 (filed: above the allowance; 24379 aimed); set 2 7.06 -> 7.69, rise +0.64 / allowed +0.38 / SE 0.25 / z +1.05 (filed: above the allowance; 24984 aimed); Z +1.20 against 2.0, e* 0.35, mean excess +0.21: PASS; paired SE 0.24 (set 1, 272 games, z +0.67), 0.22 (set 2, 272 games, z +1.17); paired Z +1.30 (reported, never graded)
- PROGRESSION: set 1 1.96 -> 2.71, rise +0.75 / allowed +0.25 / SE 0.21 / z +2.36 (filed: above the allowance; 13835 aimed); set 2 2.34 -> 2.79, rise +0.45 / allowed +0.28 / SE 0.22 / z +0.77 (filed: above the allowance; 14531 aimed); Z +2.21 against 3.0, e* 0.45, mean excess +0.33: PASS; paired SE 0.19 (set 1, 272 games, z +2.55), 0.20 (set 2, 272 games, z +0.83); paired Z +2.39 (reported, never graded)
- RANK_PUSHED: set 1 18.87 -> 19.74, rise +0.87 / allowed +0.42 / SE 1.07 / z +0.42 (filed: above the allowance; 4042 aimed); set 2 19.64 -> 20.68, rise +1.04 / allowed +0.40 / SE 1.08 / z +0.60 (filed: above the allowance; 4042 aimed); Z +0.72 against 3.0, e* 2.29, mean excess +0.55: PASS; paired SE 1.00 (set 1, 272 games, z +0.45), 1.01 (set 2, 272 games, z +0.64); paired Z +0.77 (reported, never graded)
- CHECKDOWN: set 1 4.71 -> 3.21, rise -1.50 / allowed +0.40 / SE 0.39 / z -4.82 (filed: within the allowance; 3549 aimed); set 2 4.80 -> 3.75, rise -1.05 / allowed +0.47 / SE 0.42 / z -3.64 (filed: within the allowance; 3309 aimed); Z -5.98 against 3.0, e* 0.86, mean excess -1.71: PASS; paired SE 0.40 (set 1, 272 games, z -4.79), 0.41 (set 2, 272 games, z -3.72); paired Z -6.01 (reported, never graded)
- DESPERATION: set 1 16.29 -> 16.61, rise +0.32 / allowed +0.62 / SE 1.03 / z -0.29 (filed: within the allowance; 2883 aimed); set 2 16.77 -> 18.18, rise +1.41 / allowed +0.66 / SE 1.03 / z +0.73 (filed: above the allowance; 3031 aimed); Z +0.31 against 3.0, e* 2.19, mean excess +0.22: PASS; paired SE 0.93 (set 1, 272 games, z -0.32), 0.94 (set 2, 272 games, z +0.79); paired Z +0.33 (reported, never graded)
- ON_THE_RUN: set 1 17.10 -> 20.00, rise +2.90 / allowed +0.50 / SE 5.12 / z +0.47 (filed: above the allowance; 70 aimed); set 2 14.57 -> 8.45, rise -6.12 / allowed +0.35 / SE 3.74 / z -1.73 (filed: within the allowance; 71 aimed); Z -0.89 against 3.0, e* 9.18, mean excess -2.04: PASS; paired SE 5.34 (set 1, 272 games, z +0.45), 3.60 (set 2, 272 games, z -1.80); paired Z -0.96 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 2090 aimed / 331 INT -> arm 1052 / 150; set 2 base 2219 aimed / 362 INT -> arm 1216 / 203; set 1 15.84 -> 14.26, rise -1.58 / allowed +0.58 / SE 1.34 / z -1.61 (filed: within the allowance; 1052 aimed); set 2 16.31 -> 16.69, rise +0.38 / allowed +0.61 / SE 1.33 / z -0.18 (filed: within the allowance; 1216 aimed); Z -1.26 against 3.0, e* 2.83, mean excess -1.20 (reported); paired SE 1.28 (set 1, 272 games, z -1.69), 1.32 (set 2, 272 games, z -0.18); paired Z -1.32 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 236 aimed / 48 INT -> arm 1831 / 329; set 2 base 238 aimed / 50 INT -> arm 1815 / 348; set 1 20.34 -> 17.97, rise -2.37 / allowed +0.27 / SE 2.77 / z -0.95 (filed: within the allowance; 1831 aimed); set 2 21.01 -> 19.17, rise -1.83 / allowed +0.23 / SE 2.80 / z -0.74 (filed: within the allowance; 1815 aimed); Z -1.19 against 3.0, e* 5.90, mean excess -2.35 (reported); paired SE 2.54 (set 1, 272 games, z -1.04), 2.79 (set 2, 272 games, z -0.74); paired Z -1.26 (reported, never graded)
- DESPERATION composition, set 1: base dirty 89.85% / clean 10.15% -> arm dirty 36.49% / clean 63.51%; the class's rise +0.32, re-weighted to the base's composition -1.66 (reported)
- DESPERATION composition, set 2: base dirty 90.31% / clean 9.69% -> arm dirty 40.12% / clean 59.88%; the class's rise +1.41, re-weighted to the base's composition +0.17 (reported)
- checkdown looks by trigger: base set 1 14037 looks (threat part 13156, status part 13178, count part 2270; rule part 13178 under STEP_1: rule only 11767, count only 859, both 1411, neither 0); set 2 14195 looks (threat part 13469, status part 13488, count part 1638; rule part 13488 under STEP_1: rule only 12557, count only 707, both 931, neither 0); arm set 1 8892 looks (threat part 3821, status part 3823, count part 5872; rule part 3821 under PER_RUSHER: rule only 3020, count only 5071, both 801, neither 0); set 2 7997 looks (threat part 4123, status part 4125, count part 4515; rule part 4123 under PER_RUSHER: rule only 3482, count only 3874, both 641, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 95.56% / count 4.38% / status 0.06% / none 0.00% -> arm threat 49.20% / count 50.80% / status 0.00% / none 0.00%; the class's rise -1.50, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 96.56% / count 3.37% / status 0.07% / none 0.00% -> arm threat 59.29% / count 40.71% / status 0.00% / none 0.00%; the class's rise -1.05, re-weighted to the base's composition n/a (reported)

### B6 against A14, flat (the cumulative line: reported, never graded)

- league-wide: set 1 2.17 -> 3.02, rise +0.85 / allowed +0.42 / SE 0.18 / z +2.42 (filed: above the allowance; 33374 aimed); set 2 2.12 -> 2.82, rise +0.70 / allowed +0.43 / SE 0.18 / z +1.52 (filed: above the allowance; 33426 aimed); Z +2.79 against 2.0, e* 0.25, mean excess +0.35: BREACH; paired SE 0.17 (set 1, 496 games, z +2.57), 0.17 (set 2, 496 games, z +1.61); paired Z +2.95 (reported, never graded)
- PROGRESSION: set 1 0.31 -> 0.36, rise +0.06 / allowed +0.44 / SE 0.09 / z -4.34 (filed: within the allowance; 20007 aimed); set 2 0.27 -> 0.28, rise +0.01 / allowed +0.45 / SE 0.08 / z -5.51 (filed: within the allowance; 20204 aimed); Z -6.97 against 3.0, e* 0.18, mean excess -0.41: PASS; paired SE 0.08 (set 1, 496 games, z -4.59), 0.08 (set 2, 496 games, z -5.87); paired Z -7.40 (reported, never graded)
- RANK_PUSHED: set 1 11.61 -> 11.81, rise +0.20 / allowed +0.14 / SE 1.02 / z +0.06 (filed: above the allowance; 6200 aimed); set 2 10.91 -> 11.31, rise +0.40 / allowed +0.14 / SE 0.99 / z +0.27 (filed: above the allowance; 6218 aimed); Z +0.23 against 3.0, e* 2.12, mean excess +0.16: PASS; paired SE 0.95 (set 1, 496 games, z +0.06), 0.93 (set 2, 496 games, z +0.28); paired Z +0.25 (reported, never graded)
- CHECKDOWN: set 1 0.05 -> 0.17, rise +0.11 / allowed +0.44 / SE 0.08 / z -3.91 (filed: within the allowance; 4187 aimed); set 2 0.11 -> 0.19, rise +0.09 / allowed +0.44 / SE 0.10 / z -3.47 (filed: within the allowance; 4120 aimed); Z -5.21 against 3.0, e* 0.19, mean excess -0.34: PASS; paired SE 0.08 (set 1, 496 games, z -3.81), 0.10 (set 2, 496 games, z -3.43); paired Z -5.12 (reported, never graded)
- DESPERATION: set 1 4.62 -> 6.35, rise +1.73 / allowed +0.76 / SE 0.83 / z +1.17 (filed: above the allowance; 2836 aimed); set 2 4.95 -> 6.06, rise +1.11 / allowed +0.82 / SE 0.86 / z +0.34 (filed: above the allowance; 2740 aimed); Z +1.07 against 3.0, e* 1.79, mean excess +0.63: PASS; paired SE 0.79 (set 1, 496 games, z +1.24), 0.79 (set 2, 496 games, z +0.37); paired Z +1.14 (reported, never graded)
- ON_THE_RUN: set 1 5.41 -> 10.42, rise +5.01 / allowed +0.38 / SE 3.66 / z +1.27 (filed: above the allowance; 144 aimed); set 2 5.56 -> 6.94, rise +1.39 / allowed +0.20 / SE 3.77 / z +0.32 (filed: above the allowance; 144 aimed); Z +1.12 against 3.0, e* 7.88, mean excess +2.91: PASS; paired SE 3.67 (set 1, 496 games, z +1.26), 3.89 (set 2, 496 games, z +0.31); paired Z +1.11 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 772 aimed / 33 INT -> arm 1212 / 59; set 2 base 766 aimed / 33 INT -> arm 1159 / 58; set 1 4.27 -> 4.87, rise +0.59 / allowed +0.73 / SE 0.96 / z -0.14 (filed: within the allowance; 1212 aimed); set 2 4.31 -> 5.00, rise +0.70 / allowed +0.79 / SE 0.97 / z -0.09 (filed: within the allowance; 1159 aimed); Z -0.17 against 3.0, e* 2.05, mean excess -0.11 (reported); paired SE 0.88 (set 1, 496 games, z -0.15), 0.92 (set 2, 496 games, z -0.10); paired Z -0.18 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 138 aimed / 9 INT -> arm 1624 / 121; set 2 base 123 aimed / 11 INT -> arm 1581 / 108; set 1 6.52 -> 7.45, rise +0.93 / allowed -0.18 / SE 2.20 / z +0.51 (filed: above the allowance; 1624 aimed); set 2 8.94 -> 6.83, rise -2.11 / allowed -0.28 / SE 2.65 / z -0.69 (filed: within the allowance; 1581 aimed); Z -0.13 against 3.0, e* 5.10, mean excess -0.36 (reported); paired SE 2.16 (set 1, 496 games, z +0.51), 2.58 (set 2, 496 games, z -0.71); paired Z -0.14 (reported, never graded)
- DESPERATION composition, set 1: base dirty 84.84% / clean 15.16% -> arm dirty 42.74% / clean 57.26%; the class's rise +1.73, re-weighted to the base's composition +0.64 (reported)
- DESPERATION composition, set 2: base dirty 86.16% / clean 13.84% -> arm dirty 42.30% / clean 57.70%; the class's rise +1.11, re-weighted to the base's composition +0.31 (reported)
- checkdown looks by trigger: base set 1 5086 looks (threat part 4442, status part 4574, count part 786; rule part 4574 under STEP_1: rule only 4300, count only 512, both 274, neither 0); set 2 5168 looks (threat part 4479, status part 4612, count part 798; rule part 4612 under STEP_1: rule only 4370, count only 556, both 242, neither 0); arm set 1 12123 looks (threat part 7455, status part 7481, count part 5398; rule part 7455 under PER_RUSHER: rule only 6725, count only 4668, both 730, neither 0); set 2 11927 looks (threat part 7323, status part 7358, count part 5277; rule part 7323 under PER_RUSHER: rule only 6650, count only 4604, both 673, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 90.95% / count 6.88% / status 2.17% / none 0.00% -> arm threat 67.78% / count 32.22% / status 0.00% / none 0.00%; the class's rise +0.11, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 91.07% / count 6.94% / status 1.99% / none 0.00% -> arm threat 67.96% / count 32.04% / status 0.00% / none 0.00%; the class's rise +0.09, re-weighted to the base's composition n/a (reported)

### B6 against A14, gen (the cumulative line: reported, never graded)

- league-wide: set 1 6.83 -> 7.38, rise +0.54 / allowed +0.54 / SE 0.35 / z +0.00 (filed: above the allowance; 20783 aimed); set 2 7.02 -> 7.65, rise +0.63 / allowed +0.52 / SE 0.35 / z +0.30 (filed: above the allowance; 20856 aimed); Z +0.21 against 2.0, e* 0.50, mean excess +0.05: PASS; paired SE 0.31 (set 1, 272 games, z +0.00), 0.33 (set 2, 272 games, z +0.31); paired Z +0.22 (reported, never graded)
- PROGRESSION: set 1 1.42 -> 2.19, rise +0.77 / allowed +0.55 / SE 0.24 / z +0.92 (filed: above the allowance; 12425 aimed); set 2 2.00 -> 2.40, rise +0.40 / allowed +0.56 / SE 0.26 / z -0.59 (filed: within the allowance; 12312 aimed); Z +0.24 against 3.0, e* 0.53, mean excess +0.03: PASS; paired SE 0.22 (set 1, 272 games, z +0.97), 0.25 (set 2, 272 games, z -0.61); paired Z +0.25 (reported, never graded)
- RANK_PUSHED: set 1 19.55 -> 21.87, rise +2.31 / allowed +0.15 / SE 1.74 / z +1.24 (filed: above the allowance; 3398 aimed); set 2 21.19 -> 20.34, rise -0.84 / allowed +0.10 / SE 1.65 / z -0.57 (filed: within the allowance; 3441 aimed); Z +0.47 against 3.0, e* 3.59, mean excess +0.61: PASS; paired SE 1.66 (set 1, 272 games, z +1.30), 1.64 (set 2, 272 games, z -0.58); paired Z +0.51 (reported, never graded)
- CHECKDOWN: set 1 4.09 -> 3.93, rise -0.16 / allowed +0.34 / SE 0.69 / z -0.73 (filed: within the allowance; 2318 aimed); set 2 4.73 -> 4.13, rise -0.60 / allowed +0.29 / SE 0.69 / z -1.29 (filed: within the allowance; 2375 aimed); Z -1.43 against 3.0, e* 1.46, mean excess -0.70: PASS; paired SE 0.66 (set 1, 272 games, z -0.75), 0.64 (set 2, 272 games, z -1.39); paired Z -1.52 (reported, never graded)
- DESPERATION: set 1 18.18 -> 16.17, rise -2.01 / allowed +1.04 / SE 1.33 / z -2.28 (filed: within the allowance; 2560 aimed); set 2 16.06 -> 18.49, rise +2.44 / allowed +0.95 / SE 1.27 / z +1.17 (filed: above the allowance; 2644 aimed); Z -0.79 against 3.0, e* 2.76, mean excess -0.78: PASS; paired SE 1.13 (set 1, 272 games, z -2.69), 1.22 (set 2, 272 games, z +1.22); paired Z -1.04 (reported, never graded)
- ON_THE_RUN: set 1 26.88 -> 15.85, rise -11.03 / allowed +0.20 / SE 6.12 / z -1.84 (filed: within the allowance; 82 aimed); set 2 17.65 -> 14.29, rise -3.36 / allowed +0.12 / SE 6.00 / z -0.58 (filed: within the allowance; 84 aimed); Z -1.71 against 3.0, e* 12.85, mean excess -7.35: PASS; paired SE 5.97 (set 1, 272 games, z -1.88), 5.46 (set 2, 272 games, z -0.64); paired Z -1.78 (reported, never graded)
- DESPERATION DIRTY (reported, never graded): set 1 base 1089 aimed / 197 INT -> arm 1314 / 201; set 2 base 1158 aimed / 178 INT -> arm 1405 / 223; set 1 18.09 -> 15.30, rise -2.79 / allowed +0.94 / SE 1.53 / z -2.44 (filed: within the allowance; 1314 aimed); set 2 15.37 -> 15.87, rise +0.50 / allowed +0.91 / SE 1.44 / z -0.29 (filed: within the allowance; 1405 aimed); Z -1.93 against 3.0, e* 3.15, mean excess -2.07 (reported); paired SE 1.41 (set 1, 272 games, z -2.65), 1.44 (set 2, 272 games, z -0.29); paired Z -2.08 (reported, never graded)
- DESPERATION CLEAN (reported, never graded): set 1 base 99 aimed / 19 INT -> arm 1246 / 213; set 2 base 131 aimed / 29 INT -> arm 1239 / 266; set 1 19.19 -> 17.09, rise -2.10 / allowed -0.17 / SE 4.10 / z -0.47 (filed: within the allowance; 1246 aimed); set 2 22.14 -> 21.47, rise -0.67 / allowed -0.27 / SE 3.81 / z -0.10 (filed: within the allowance; 1239 aimed); Z -0.41 against 3.0, e* 8.38, mean excess -1.16 (reported); paired SE 3.77 (set 1, 272 games, z -0.51), 3.44 (set 2, 272 games, z -0.11); paired Z -0.44 (reported, never graded)
- DESPERATION composition, set 1: base dirty 91.67% / clean 8.33% -> arm dirty 51.33% / clean 48.67%; the class's rise -2.01, re-weighted to the base's composition -2.74 (reported)
- DESPERATION composition, set 2: base dirty 89.84% / clean 10.16% -> arm dirty 53.14% / clean 46.86%; the class's rise +2.44, re-weighted to the base's composition +0.38 (reported)
- checkdown looks by trigger: base set 1 2766 looks (threat part 2544, status part 2605, count part 220; rule part 2605 under STEP_1: rule only 2546, count only 161, both 59, neither 0); set 2 3040 looks (threat part 2809, status part 2879, count part 231; rule part 2879 under STEP_1: rule only 2809, count only 161, both 70, neither 0); arm set 1 5529 looks (threat part 4078, status part 4097, count part 1657; rule part 4078 under PER_RUSHER: rule only 3872, count only 1451, both 206, neither 0); set 2 5556 looks (threat part 4335, status part 4360, count part 1408; rule part 4335 under PER_RUSHER: rule only 4148, count only 1221, both 187, neither 0)
- CHECKDOWN composition by trigger on the release tick, set 1: base threat 94.58% / count 3.69% / status 1.73% / none 0.00% -> arm threat 80.93% / count 19.07% / status 0.00% / none 0.00%; the class's rise -0.16, re-weighted to the base's composition n/a (reported)
- CHECKDOWN composition by trigger on the release tick, set 2: base threat 95.34% / count 2.85% / status 1.81% / none 0.00% -> arm threat 84.21% / count 15.79% / status 0.00% / none 0.00%; the class's rise -0.60, re-weighted to the base's composition n/a (reported)

## The structural proofs and fold checks inside the arms

- s2.selfCheck (fold check; the count part's restatement, both ways (plan §1.7 (ii); review F-1, F-6): not too strict, on every arm under step 1's forcing rule or the narrower counter (every forced act on a tick whose status does not force satisfies the restated count part); not too generous, on every arm (on a closing HOLD the rule part does not hold, and at or past qb.throwawayEarliestSeconds the count part does not either; on a CLOCK_EXPIRED the rule part does not hold)): PASSES. 499759 off-rule forced acts counted on A0 set 1, A0 set 2, A14 set 1, A14 set 2, A1 set 1, A1 set 2, A5 set 1, A5 set 2, A11 set 1, A11 set 2, B2 set 1, B2 set 2, B4 set 1, B4 set 2, B5 set 1, B5 set 2, B7 set 1, B7 set 2; A1's own: A1 set 1 flat 28928 of 28928, A1 set 1 gen 8845 of 8845, A1 set 2 flat 29316 of 29316, A1 set 2 gen 7461 of 7461; witnesses on 24 arm-sets: 4169998 closing HOLDs (764867 at or past throwawayEarliestSeconds), 183701 CLOCK_EXPIRED; exceptions none
- s2.falsifier.counterAlone (structural; must act never fires on the counter alone (proof:must-act-counter; O40), on every PER_RUSHER arm's full corpora): PASSES. B1 set 1, B1 set 2, B3 set 1, B3 set 2, B6 set 1, B6 set 2: 361653 forced acts; failures none; chances (a status-forced tick with no threat part, where the rules part ways) 919 on the PER_RUSHER arms, 413 of them outside the count part too; the positive control, B7 read as PER_RUSHER: 27 failures over 39 chances (16 outside the count part); outside this run, the engine's cases are mustAct.test.ts (a) to (d), and pocketStep2Parting.test.ts plays B3 against B7 where they must part
- s2.falsifier.everyArrival (structural; every arrival makes him act: the play ends on the arrival tick in a THROW or a SACK (proof:must-act-arrival; O41), on every arm, the bases included): PASSES. 129513 arrivals over 24 arm-sets and both leagues (THROW 33445, SACK 96068); failures none
- s2.warning.clean (structural; no threat inside the warning coexists with CLEAN, and the arrival floor rebuilt with the arm's own horizons is never above the status (the §6 row's proof, not filed; O42), on every arm): PASSES. 6359312 status ticks, 1532436 with a threat inside the warning; failures none
- s2.liveSet (structural; the live threat set rebuilt from the published RUSH_THREATs: no ARRIVED dated after its tick, every live threat past its ETA published ARRIVED): PASSES. 6359312 status ticks read; failures none
- s1.streamChecks (structural; step 1's stream checks (window ticks, beat accounting, margins, approach) on every arm of the run (Q-6)): PASSES. 24 arm-sets, both leagues; failures none
- s2.m2.identity (fold check; M2 STREAM's rebuild: its statuses and won-rep threats equal the stream's, its rolled ticks their margins (plan §1.6); PER_RUSHER's 0 by the rule holds by construction, so it is printed in the M2 section and not proved here (review CT-F5)): PASSES. 6359312 statuses and 878687 won-rep threats rebuilt; failures none
- q2.replay (structural; the re-played bases equal step 1's records on Q-2's projection (set 1: reports/adr-089-step1.json; set 2: the committed fixture)): PASSES. A0 set 1 equal; A0 set 2 equal; A14 set 1 equal; A14 set 2 equal; A1 set 1 equal; A1 set 2 equal; A5 set 1 equal; A5 set 2 equal; A11 set 1 equal; A11 set 2 equal

## Each arm: exclusive affected plays, must act, the step-2 folds' counts and the rows printed apart

### A0 (today's game, re-played), flat (today's game, re-played: AM-1's cumulative line only (reported))

- set 1: dropbacks 43837; time to throw 1.242 s
- set 1: exclusive affected plays: none (no base)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 64.24%, beside forced_throw_share's status-forced 64.34% (R5); first must-act tick 1.006 s on 34504 dropbacks, beside first_forcing_seconds' 1.008 s on 34549
- set 1: forced acts by kind (the part that held): MOVEMENT 25723 (threat 25683, status 25723, count 5908), POCKET_DURESS 718 (threat 718, status 718, count 468), CHECKDOWN_LOOK 25332 (threat 21394, status 21419, count 12342), DESPERATION 2161 (threat 1670, status 1673, count 1317), CLOCK_EXPIRED 1675 (threat 0, status 0, count 1675); the count part's self-check: 6076 of 6076 off-rule acts counted, 0 exceptions; witnesses 47786 closing HOLDs (1687 at or past throwawayEarliestSeconds) and 1675 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 6145 (THROW 1587, SACK 4558), failures 0; status ticks 106145, ticks with a threat inside the warning 61106, of them CLEAN 0, failures 0
- set 1: quick-pressure share 99.81 %; band floor plus counter 9.41 % of first dirt; clean_with_live_won_rep ticks 0.148 %, dropbacks 0.130 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 79.81 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 43741; time to throw 1.241 s
- set 2: exclusive affected plays: none (no base)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 64.18%, beside forced_throw_share's status-forced 64.30% (R5); first must-act tick 1.005 s on 34344 dropbacks, beside first_forcing_seconds' 1.007 s on 34388
- set 2: forced acts by kind (the part that held): MOVEMENT 25531 (threat 25504, status 25531, count 5671), POCKET_DURESS 724 (threat 722, status 724, count 438), CHECKDOWN_LOOK 25136 (threat 21280, status 21297, count 12054), DESPERATION 2129 (threat 1643, status 1652, count 1369), CLOCK_EXPIRED 1595 (threat 0, status 0, count 1595); the count part's self-check: 5911 of 5911 off-rule acts counted, 0 exceptions; witnesses 47730 closing HOLDs (1780 at or past throwawayEarliestSeconds) and 1595 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 6208 (THROW 1634, SACK 4574), failures 0; status ticks 105959, ticks with a threat inside the warning 60777, of them CLEAN 0, failures 0
- set 2: quick-pressure share 99.80 %; band floor plus counter 9.53 % of first dirt; clean_with_live_won_rep ticks 0.148 %, dropbacks 0.130 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 79.15 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### A0 (today's game, re-played), gen (today's game, re-played: AM-1's cumulative line only (reported))

- set 1: dropbacks 25758; time to throw 1.235 s
- set 1: exclusive affected plays: none (no base)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 67.85%, beside forced_throw_share's status-forced 67.98% (R5); first must-act tick 1.013 s on 20101 dropbacks, beside first_forcing_seconds' 1.015 s on 20130
- set 1: forced acts by kind (the part that held): MOVEMENT 12537 (threat 12513, status 12537, count 904), POCKET_DURESS 282 (threat 282, status 282, count 128), CHECKDOWN_LOOK 14037 (threat 13156, status 13178, count 2270), DESPERATION 2326 (threat 1968, status 1975, count 744), CLOCK_EXPIRED 464 (threat 0, status 0, count 464); the count part's self-check: 1674 of 1674 off-rule acts counted, 0 exceptions; witnesses 28349 closing HOLDs (1528 at or past throwawayEarliestSeconds) and 464 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 5500 (THROW 1884, SACK 3616), failures 0; status ticks 63590, ticks with a threat inside the warning 36104, of them CLEAN 0, failures 0
- set 1: quick-pressure share 99.72 %; band floor plus counter 9.77 % of first dirt; clean_with_live_won_rep ticks 0.122 %, dropbacks 0.113 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 77.73 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 25805; time to throw 1.243 s
- set 2: exclusive affected plays: none (no base)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 68.90%, beside forced_throw_share's status-forced 69.08% (R5); first must-act tick 1.013 s on 20170 dropbacks, beside first_forcing_seconds' 1.016 s on 20213
- set 2: forced acts by kind (the part that held): MOVEMENT 12304 (threat 12283, status 12304, count 641), POCKET_DURESS 265 (threat 264, status 265, count 96), CHECKDOWN_LOOK 14195 (threat 13469, status 13488, count 1638), DESPERATION 2457 (threat 2078, status 2093, count 652), CLOCK_EXPIRED 378 (threat 0, status 0, count 378); the count part's self-check: 1449 of 1449 off-rule acts counted, 0 exceptions; witnesses 28746 closing HOLDs (1799 at or past throwawayEarliestSeconds) and 378 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 5710 (THROW 1944, SACK 3766), failures 0; status ticks 64480, ticks with a threat inside the warning 37130, of them CLEAN 0, failures 0
- set 2: quick-pressure share 99.63 %; band floor plus counter 9.57 % of first dirt; clean_with_live_won_rep ticks 0.118 %, dropbacks 0.112 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 80.54 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### A14 (today's clock with the hold, re-played; pricing arm, never a design value), flat (today's clock with the hold, re-played: AM-1's cumulative line only (pricing))

- set 1: dropbacks 36904; time to throw 2.396 s
- set 1: exclusive affected plays against A0: 36904 of 36904 (HOLD (every dropback) 36904)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 61.61%, beside forced_throw_share's status-forced 63.25% (R5); first must-act tick 1.060 s on 33769 dropbacks, beside first_forcing_seconds' 1.069 s on 33943
- set 1: forced acts by kind (the part that held): MOVEMENT 41443 (threat 41291, status 41443, count 402), POCKET_DURESS 1840 (threat 1825, status 1840, count 214), CHECKDOWN_LOOK 5086 (threat 4442, status 4574, count 786), DESPERATION 910 (threat 690, status 710, count 284), CLOCK_EXPIRED 669 (threat 0, status 0, count 669); the count part's self-check: 1381 of 1381 off-rule acts counted, 0 exceptions; witnesses 57375 closing HOLDs (9548 at or past throwawayEarliestSeconds) and 669 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 10188 (THROW 1600, SACK 8588), failures 0; status ticks 117281, ticks with a threat inside the warning 70769, of them CLEAN 0, failures 0
- set 1: quick-pressure share 99.02 %; band floor plus counter 10.92 % of first dirt; clean_with_live_won_rep ticks 0.167 %, dropbacks 0.176 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 91.41 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 36757; time to throw 2.397 s
- set 2: exclusive affected plays against A0: 36757 of 36757 (HOLD (every dropback) 36757)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 61.32%, beside forced_throw_share's status-forced 62.83% (R5); first must-act tick 1.060 s on 33594 dropbacks, beside first_forcing_seconds' 1.068 s on 33761
- set 2: forced acts by kind (the part that held): MOVEMENT 41347 (threat 41185, status 41347, count 411), POCKET_DURESS 1905 (threat 1896, status 1905, count 225), CHECKDOWN_LOOK 5168 (threat 4479, status 4612, count 798), DESPERATION 889 (threat 671, status 692, count 278), CLOCK_EXPIRED 685 (threat 0, status 0, count 685); the count part's self-check: 1438 of 1438 off-rule acts counted, 0 exceptions; witnesses 57319 closing HOLDs (9660 at or past throwawayEarliestSeconds) and 685 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 10294 (THROW 1673, SACK 8621), failures 0; status ticks 117066, ticks with a threat inside the warning 70572, of them CLEAN 0, failures 0
- set 2: quick-pressure share 99.07 %; band floor plus counter 10.99 % of first dirt; clean_with_live_won_rep ticks 0.192 %, dropbacks 0.201 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 91.28 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### A14 (today's clock with the hold, re-played; pricing arm, never a design value), gen (today's clock with the hold, re-played: AM-1's cumulative line only (pricing))

- set 1: dropbacks 20874; time to throw 2.250 s
- set 1: exclusive affected plays against A0: 20874 of 20874 (HOLD (every dropback) 20874)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 69.08%, beside forced_throw_share's status-forced 70.01% (R5); first must-act tick 1.059 s on 19092 dropbacks, beside first_forcing_seconds' 1.066 s on 19161
- set 1: forced acts by kind (the part that held): MOVEMENT 22691 (threat 22641, status 22691, count 79), POCKET_DURESS 760 (threat 758, status 760, count 39), CHECKDOWN_LOOK 2766 (threat 2544, status 2605, count 220), DESPERATION 1188 (threat 1033, status 1048, count 189), CLOCK_EXPIRED 194 (threat 0, status 0, count 194); the count part's self-check: 495 of 495 off-rule acts counted, 0 exceptions; witnesses 32154 closing HOLDs (5322 at or past throwawayEarliestSeconds) and 194 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 10494 (THROW 2145, SACK 8349), failures 0; status ticks 70131, ticks with a threat inside the warning 43566, of them CLEAN 0, failures 0
- set 1: quick-pressure share 99.01 %; band floor plus counter 10.79 % of first dirt; clean_with_live_won_rep ticks 0.121 %, dropbacks 0.125 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 92.56 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 21123; time to throw 2.278 s
- set 2: exclusive affected plays against A0: 21123 of 21123 (HOLD (every dropback) 21123)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 69.21%, beside forced_throw_share's status-forced 70.53% (R5); first must-act tick 1.056 s on 19213 dropbacks, beside first_forcing_seconds' 1.068 s on 19322
- set 2: forced acts by kind (the part that held): MOVEMENT 23250 (threat 23171, status 23250, count 106), POCKET_DURESS 698 (threat 692, status 698, count 39), CHECKDOWN_LOOK 3040 (threat 2809, status 2879, count 231), DESPERATION 1289 (threat 1094, status 1114, count 223), CLOCK_EXPIRED 188 (threat 0, status 0, count 188); the count part's self-check: 524 of 524 off-rule acts counted, 0 exceptions; witnesses 33464 closing HOLDs (6150 at or past throwawayEarliestSeconds) and 188 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 11323 (THROW 2274, SACK 9049), failures 0; status ticks 73320, ticks with a threat inside the warning 45899, of them CLEAN 0, failures 0
- set 2: quick-pressure share 98.99 %; band floor plus counter 10.84 % of first dirt; clean_with_live_won_rep ticks 0.144 %, dropbacks 0.156 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 91.84 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### A1 (step 1's design, re-played), flat (step 1's design arm, re-played: base of B1 to B4 and B7; M2 is read on its streams)

- set 1: dropbacks 51165; time to throw 1.589 s
- set 1: exclusive affected plays against A0: 6735 of 51165 (S (a beat played) 6278, WINDOW (a window tick played) 880)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 20.30%, beside forced_throw_share's status-forced 20.30% (R5); first must-act tick 1.122 s on 14143 dropbacks, beside first_forcing_seconds' 1.122 s on 14147
- set 1: forced acts by kind (the part that held): MOVEMENT 13304 (threat 13298, status 13304, count 3759), POCKET_DURESS 1034 (threat 1034, status 1034, count 598), CHECKDOWN_LOOK 26751 (threat 7924, status 7925, count 22307), DESPERATION 3253 (threat 883, status 883, count 2773), CLOCK_EXPIRED 7732 (threat 0, status 0, count 7732); the count part's self-check: 28928 of 28928 off-rule acts counted, 0 exceptions; witnesses 99086 closing HOLDs (10508 at or past throwawayEarliestSeconds) and 7732 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1180 (THROW 302, SACK 878), failures 0; status ticks 159848, ticks with a threat inside the warning 37140, of them CLEAN 0, failures 0
- set 1: quick-pressure share 94.40 %; band floor plus counter 1.91 % of first dirt; clean_with_live_won_rep ticks 0.025 %, dropbacks 0.061 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 8.76 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 51541; time to throw 1.591 s
- set 2: exclusive affected plays against A0: 6890 of 51541 (S (a beat played) 6433, WINDOW (a window tick played) 881)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 20.41%, beside forced_throw_share's status-forced 20.42% (R5); first must-act tick 1.118 s on 14320 dropbacks, beside first_forcing_seconds' 1.118 s on 14325
- set 2: forced acts by kind (the part that held): MOVEMENT 13651 (threat 13647, status 13651, count 3826), POCKET_DURESS 1067 (threat 1066, status 1067, count 594), CHECKDOWN_LOOK 27286 (threat 8205, status 8208, count 22751), DESPERATION 3470 (threat 951, status 951, count 2957), CLOCK_EXPIRED 7719 (threat 0, status 0, count 7719); the count part's self-check: 29316 of 29316 off-rule acts counted, 0 exceptions; witnesses 99768 closing HOLDs (10824 at or past throwawayEarliestSeconds) and 7719 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1196 (THROW 305, SACK 891), failures 0; status ticks 161257, ticks with a threat inside the warning 38095, of them CLEAN 0, failures 0
- set 2: quick-pressure share 94.40 %; band floor plus counter 1.80 % of first dirt; clean_with_live_won_rep ticks 0.024 %, dropbacks 0.058 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 8.72 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### A1 (step 1's design, re-played), gen (step 1's design arm, re-played: base of B1 to B4 and B7; M2 is read on its streams)

- set 1: dropbacks 28361; time to throw 1.666 s
- set 1: exclusive affected plays against A0: 4266 of 28361 (S (a beat played) 4008, WINDOW (a window tick played) 507)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 23.78%, beside forced_throw_share's status-forced 23.81% (R5); first must-act tick 1.231 s on 8261 dropbacks, beside first_forcing_seconds' 1.232 s on 8265
- set 1: forced acts by kind (the part that held): MOVEMENT 6170 (threat 6164, status 6170, count 722), POCKET_DURESS 426 (threat 425, status 426, count 180), CHECKDOWN_LOOK 9397 (threat 4660, status 4661, count 5596), DESPERATION 3025 (threat 1144, status 1148, count 2134), CLOCK_EXPIRED 2232 (threat 0, status 0, count 2232); the count part's self-check: 8845 of 8845 off-rule acts counted, 0 exceptions; witnesses 59992 closing HOLDs (9246 at or past throwawayEarliestSeconds) and 2232 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 932 (THROW 310, SACK 622), failures 0; status ticks 93231, ticks with a threat inside the warning 20563, of them CLEAN 0, failures 0
- set 1: quick-pressure share 91.05 %; band floor plus counter 2.01 % of first dirt; clean_with_live_won_rep ticks 0.014 %, dropbacks 0.035 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 10.90 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 28127; time to throw 1.693 s
- set 2: exclusive affected plays against A0: 4351 of 28127 (S (a beat played) 4098, WINDOW (a window tick played) 548)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 25.37%, beside forced_throw_share's status-forced 25.39% (R5); first must-act tick 1.250 s on 8560 dropbacks, beside first_forcing_seconds' 1.251 s on 8563
- set 2: forced acts by kind (the part that held): MOVEMENT 6214 (threat 6210, status 6214, count 602), POCKET_DURESS 422 (threat 422, status 422, count 167), CHECKDOWN_LOOK 8677 (threat 4874, status 4876, count 4448), DESPERATION 3113 (threat 1274, status 1276, count 2101), CLOCK_EXPIRED 1823 (threat 0, status 0, count 1823); the count part's self-check: 7461 of 7461 off-rule acts counted, 0 exceptions; witnesses 60756 closing HOLDs (10468 at or past throwawayEarliestSeconds) and 1823 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 945 (THROW 313, SACK 632), failures 0; status ticks 93942, ticks with a threat inside the warning 21145, of them CLEAN 0, failures 0
- set 2: quick-pressure share 90.00 %; band floor plus counter 2.05 % of first dirt; clean_with_live_won_rep ticks 0.019 %, dropbacks 0.050 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 11.33 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### A5 (L8 with Heels, re-played), flat (L8 with Heels, re-played: base of B5; M2 on its streams for the L return package)

- set 1: dropbacks 51400; time to throw 1.590 s
- set 1: exclusive affected plays against A0: 51399 of 51400 (L (a band changed before R) 51399, HEELS (a beaten or gaining tick) 47288)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 20.68%, beside forced_throw_share's status-forced 20.98% (R5); first must-act tick 1.241 s on 14431 dropbacks, beside first_forcing_seconds' 1.258 s on 14593
- set 1: forced acts by kind (the part that held): MOVEMENT 13308 (threat 13220, status 13308, count 3646), POCKET_DURESS 1539 (threat 1537, status 1539, count 821), CHECKDOWN_LOOK 27038 (threat 8073, status 8169, count 22343), DESPERATION 3324 (threat 931, status 949, count 2824), CLOCK_EXPIRED 7405 (threat 0, status 0, count 7405); the count part's self-check: 28649 of 28649 off-rule acts counted, 0 exceptions; witnesses 100221 closing HOLDs (10259 at or past throwawayEarliestSeconds) and 7405 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1011 (THROW 228, SACK 783), failures 0; status ticks 160906, ticks with a threat inside the warning 37009, of them CLEAN 0, failures 0
- set 1: quick-pressure share 83.89 %; band floor plus counter 18.08 % of first dirt; clean_with_live_won_rep ticks 0.002 %, dropbacks 0.004 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 16.44 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 51790; time to throw 1.589 s
- set 2: exclusive affected plays against A0: 51790 of 51790 (L (a band changed before R) 51790, HEELS (a beaten or gaining tick) 47533)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 20.76%, beside forced_throw_share's status-forced 21.11% (R5); first must-act tick 1.230 s on 14674 dropbacks, beside first_forcing_seconds' 1.251 s on 14864
- set 2: forced acts by kind (the part that held): MOVEMENT 13814 (threat 13717, status 13814, count 3778), POCKET_DURESS 1580 (threat 1578, status 1580, count 805), CHECKDOWN_LOOK 27291 (threat 8216, status 8314, count 22547), DESPERATION 3483 (threat 1015, status 1047, count 2926), CLOCK_EXPIRED 7471 (threat 0, status 0, count 7471); the count part's self-check: 28884 of 28884 off-rule acts counted, 0 exceptions; witnesses 100567 closing HOLDs (10312 at or past throwawayEarliestSeconds) and 7471 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1019 (THROW 228, SACK 791), failures 0; status ticks 162066, ticks with a threat inside the warning 38106, of them CLEAN 0, failures 0
- set 2: quick-pressure share 84.08 %; band floor plus counter 17.90 % of first dirt; clean_with_live_won_rep ticks 0.003 %, dropbacks 0.008 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 16.76 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### A5 (L8 with Heels, re-played), gen (L8 with Heels, re-played: base of B5; M2 on its streams for the L return package)

- set 1: dropbacks 28548; time to throw 1.651 s
- set 1: exclusive affected plays against A0: 28547 of 28548 (L (a band changed before R) 28547, HEELS (a beaten or gaining tick) 26273)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 25.44%, beside forced_throw_share's status-forced 26.32% (R5); first must-act tick 1.377 s on 8823 dropbacks, beside first_forcing_seconds' 1.423 s on 9057
- set 1: forced acts by kind (the part that held): MOVEMENT 6358 (threat 6267, status 6358, count 820), POCKET_DURESS 725 (threat 720, status 725, count 273), CHECKDOWN_LOOK 9594 (threat 4876, status 5030, count 5496), DESPERATION 3106 (threat 1280, status 1379, count 2040), CLOCK_EXPIRED 2014 (threat 0, status 0, count 2014); the count part's self-check: 8305 of 8305 off-rule acts counted, 0 exceptions; witnesses 59806 closing HOLDs (8195 at or past throwawayEarliestSeconds) and 2014 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 800 (THROW 276, SACK 524), failures 0; status ticks 93145, ticks with a threat inside the warning 20940, of them CLEAN 0, failures 0
- set 1: quick-pressure share 79.33 %; band floor plus counter 20.67 % of first dirt; clean_with_live_won_rep ticks 0.001 %, dropbacks 0.004 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 20.65 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 28408; time to throw 1.676 s
- set 2: exclusive affected plays against A0: 28408 of 28408 (L (a band changed before R) 28408, HEELS (a beaten or gaining tick) 26083)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 26.94%, beside forced_throw_share's status-forced 27.93% (R5); first must-act tick 1.385 s on 9054 dropbacks, beside first_forcing_seconds' 1.439 s on 9325
- set 2: forced acts by kind (the part that held): MOVEMENT 6323 (threat 6208, status 6323, count 679), POCKET_DURESS 684 (threat 680, status 684, count 221), CHECKDOWN_LOOK 8814 (threat 5009, status 5175, count 4414), DESPERATION 3128 (threat 1407, status 1510, count 1947), CLOCK_EXPIRED 1734 (threat 0, status 0, count 1734); the count part's self-check: 6991 of 6991 off-rule acts counted, 0 exceptions; witnesses 60831 closing HOLDs (9335 at or past throwawayEarliestSeconds) and 1734 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 867 (THROW 303, SACK 564), failures 0; status ticks 94205, ticks with a threat inside the warning 21541, of them CLEAN 0, failures 0
- set 2: quick-pressure share 77.82 %; band floor plus counter 22.48 % of first dirt; clean_with_live_won_rep ticks 0.000 %, dropbacks 0.000 %, PUSH ticks apart n/a % (these rise under the warning, expected, not a failure: R8)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 20.46 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value), flat (A1 with the stand-in hold, re-played: base of B6)

- set 1: dropbacks 48297; time to throw 2.739 s
- set 1: exclusive affected plays against A14: 14081 of 48297 (S (a beat played) 13549, WINDOW (a window tick played) 1568)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 26.12%, beside forced_throw_share's status-forced 26.50% (R5); first must-act tick 1.673 s on 20917 dropbacks, beside first_forcing_seconds' 1.684 s on 21005
- set 1: forced acts by kind (the part that held): MOVEMENT 26753 (threat 26524, status 26753, count 1118), POCKET_DURESS 3707 (threat 3678, status 3707, count 505), CHECKDOWN_LOOK 12686 (threat 8125, status 8224, count 5388), DESPERATION 2903 (threat 1197, status 1235, count 1981), CLOCK_EXPIRED 4479 (threat 0, status 0, count 4479); the count part's self-check: 10609 of 10609 off-rule acts counted, 0 exceptions; witnesses 179427 closing HOLDs (63485 at or past throwawayEarliestSeconds) and 4479 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 2572 (THROW 670, SACK 1902), failures 0; status ticks 245432, ticks with a threat inside the warning 56917, of them CLEAN 0, failures 0
- set 1: quick-pressure share 73.40 %; band floor plus counter 3.58 % of first dirt; clean_with_live_won_rep ticks 0.041 %, dropbacks 0.159 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 23.88 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 48555; time to throw 2.740 s
- set 2: exclusive affected plays against A14: 14219 of 48555 (S (a beat played) 13633, WINDOW (a window tick played) 1618)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 26.14%, beside forced_throw_share's status-forced 26.46% (R5); first must-act tick 1.658 s on 21174 dropbacks, beside first_forcing_seconds' 1.667 s on 21254
- set 2: forced acts by kind (the part that held): MOVEMENT 27428 (threat 27148, status 27428, count 1180), POCKET_DURESS 3828 (threat 3800, status 3828, count 547), CHECKDOWN_LOOK 12502 (threat 8075, status 8187, count 5208), DESPERATION 2768 (threat 1103, status 1132, count 1917), CLOCK_EXPIRED 4345 (threat 0, status 0, count 4345); the count part's self-check: 10296 of 10296 off-rule acts counted, 0 exceptions; witnesses 179954 closing HOLDs (63850 at or past throwawayEarliestSeconds) and 4345 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 2707 (THROW 707, SACK 2000), failures 0; status ticks 246726, ticks with a threat inside the warning 58172, of them CLEAN 0, failures 0
- set 2: quick-pressure share 73.67 %; band floor plus counter 3.67 % of first dirt; clean_with_live_won_rep ticks 0.051 %, dropbacks 0.198 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 24.31 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value), gen (A1 with the stand-in hold, re-played: base of B6)

- set 1: dropbacks 26578; time to throw 2.695 s
- set 1: exclusive affected plays against A14: 7777 of 26578 (S (a beat played) 7486, WINDOW (a window tick played) 846)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 29.09%, beside forced_throw_share's status-forced 29.57% (R5); first must-act tick 1.684 s on 11385 dropbacks, beside first_forcing_seconds' 1.714 s on 11481
- set 1: forced acts by kind (the part that held): MOVEMENT 13466 (threat 13325, status 13466, count 335), POCKET_DURESS 1444 (threat 1427, status 1444, count 131), CHECKDOWN_LOOK 5857 (threat 4428, status 4484, count 1619), DESPERATION 2551 (threat 1202, status 1250, count 1478), CLOCK_EXPIRED 1182 (threat 0, status 0, count 1182); the count part's self-check: 3856 of 3856 off-rule acts counted, 0 exceptions; witnesses 98526 closing HOLDs (35024 at or past throwawayEarliestSeconds) and 1182 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 2418 (THROW 801, SACK 1617), failures 0; status ticks 135368, ticks with a threat inside the warning 31243, of them CLEAN 0, failures 0
- set 1: quick-pressure share 73.17 %; band floor plus counter 4.05 % of first dirt; clean_with_live_won_rep ticks 0.025 %, dropbacks 0.098 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 26.82 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 26678; time to throw 2.709 s
- set 2: exclusive affected plays against A14: 7972 of 26678 (S (a beat played) 7703, WINDOW (a window tick played) 813)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 30.70%, beside forced_throw_share's status-forced 31.23% (R5); first must-act tick 1.710 s on 11685 dropbacks, beside first_forcing_seconds' 1.744 s on 11798
- set 2: forced acts by kind (the part that held): MOVEMENT 13868 (threat 13730, status 13868, count 307), POCKET_DURESS 1408 (threat 1391, status 1408, count 114), CHECKDOWN_LOOK 5947 (threat 4672, status 4727, count 1457), DESPERATION 2672 (threat 1357, status 1419, count 1444), CLOCK_EXPIRED 1065 (threat 0, status 0, count 1065); the count part's self-check: 3538 of 3538 off-rule acts counted, 0 exceptions; witnesses 99602 closing HOLDs (36074 at or past throwawayEarliestSeconds) and 1065 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 2671 (THROW 872, SACK 1799), failures 0; status ticks 137227, ticks with a threat inside the warning 32613, of them CLEAN 0, failures 0
- set 2: quick-pressure share 72.15 %; band floor plus counter 3.89 % of first dirt; clean_with_live_won_rep ticks 0.046 %, dropbacks 0.180 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 25.75 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B1 (the forcing point alone; information, not a design value), flat (information, the forcing point alone (ADR:925): breaks the July derivation, not a design value)

- set 1: dropbacks 51349; time to throw 1.594 s
- set 1: exclusive affected plays against A1: 12158 of 51349 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 10, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12153)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 15.43%, beside forced_throw_share's status-forced 15.44% (R5); first must-act tick 1.497 s on 11289 dropbacks, beside first_forcing_seconds' 1.498 s on 11296
- set 1: forced acts by kind (the part that held): MOVEMENT 6359 (threat 6359, status 6359, count 2800), POCKET_DURESS 841 (threat 841, status 841, count 495), CHECKDOWN_LOOK 26366 (threat 6307, status 6310, count 23042), DESPERATION 3409 (threat 748, status 748, count 3020), CLOCK_EXPIRED 7873 (threat 0, status 4, count 7873); the count part's self-check: witnesses 107640 closing HOLDs (10837 at or past throwawayEarliestSeconds) and 7873 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1613 (THROW 425, SACK 1188), failures 0; status ticks 162609, ticks with a threat inside the warning 39577, of them CLEAN 0, failures 0
- set 1: quick-pressure share 94.75 %; band floor plus counter 1.82 % of first dirt; clean_with_live_won_rep ticks 0.029 %, dropbacks 0.068 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 9.13 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 51638; time to throw 1.592 s
- set 2: exclusive affected plays against A1: 12249 of 51638 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 8, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12245)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 15.65%, beside forced_throw_share's status-forced 15.67% (R5); first must-act tick 1.501 s on 11502 dropbacks, beside first_forcing_seconds' 1.501 s on 11508
- set 2: forced acts by kind (the part that held): MOVEMENT 6568 (threat 6568, status 6568, count 2842), POCKET_DURESS 871 (threat 871, status 871, count 497), CHECKDOWN_LOOK 26673 (threat 6430, status 6433, count 23222), DESPERATION 3445 (threat 730, status 731, count 3092), CLOCK_EXPIRED 7738 (threat 0, status 1, count 7738); the count part's self-check: witnesses 107938 closing HOLDs (10805 at or past throwawayEarliestSeconds) and 7738 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1640 (THROW 473, SACK 1167), failures 0; status ticks 163319, ticks with a threat inside the warning 40189, of them CLEAN 0, failures 0
- set 2: quick-pressure share 94.66 %; band floor plus counter 1.79 % of first dirt; clean_with_live_won_rep ticks 0.028 %, dropbacks 0.066 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 8.70 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B1 (the forcing point alone; information, not a design value), gen (information, the forcing point alone (ADR:925): breaks the July derivation, not a design value)

- set 1: dropbacks 28246; time to throw 1.684 s
- set 1: exclusive affected plays against A1: 6666 of 28246 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 9, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6661)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 19.36%, beside forced_throw_share's status-forced 19.37% (R5); first must-act tick 1.608 s on 6695 dropbacks, beside first_forcing_seconds' 1.610 s on 6701
- set 1: forced acts by kind (the part that held): MOVEMENT 2803 (threat 2803, status 2803, count 547), POCKET_DURESS 394 (threat 394, status 394, count 159), CHECKDOWN_LOOK 8936 (threat 3831, status 3834, count 5920), DESPERATION 2903 (threat 968, status 969, count 2169), CLOCK_EXPIRED 2292 (threat 0, status 4, count 2292); the count part's self-check: witnesses 64554 closing HOLDs (9420 at or past throwawayEarliestSeconds) and 2292 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1107 (THROW 383, SACK 724), failures 0; status ticks 94745, ticks with a threat inside the warning 22035, of them CLEAN 0, failures 0
- set 1: quick-pressure share 91.30 %; band floor plus counter 2.01 % of first dirt; clean_with_live_won_rep ticks 0.011 %, dropbacks 0.028 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 10.42 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 28168; time to throw 1.712 s
- set 2: exclusive affected plays against A1: 7020 of 28168 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 6, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 7017)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 21.35%, beside forced_throw_share's status-forced 21.36% (R5); first must-act tick 1.631 s on 7141 dropbacks, beside first_forcing_seconds' 1.632 s on 7145
- set 2: forced acts by kind (the part that held): MOVEMENT 2702 (threat 2702, status 2702, count 405), POCKET_DURESS 384 (threat 384, status 384, count 131), CHECKDOWN_LOOK 8067 (threat 4135, status 4136, count 4582), DESPERATION 3019 (threat 1105, status 1107, count 2177), CLOCK_EXPIRED 1832 (threat 0, status 1, count 1832); the count part's self-check: witnesses 65959 closing HOLDs (10745 at or past throwawayEarliestSeconds) and 1832 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1193 (THROW 421, SACK 772), failures 0; status ticks 96149, ticks with a threat inside the warning 23137, of them CLEAN 0, failures 0
- set 2: quick-pressure share 89.82 %; band floor plus counter 2.17 % of first dirt; clean_with_live_won_rep ticks 0.025 %, dropbacks 0.064 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 10.98 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B2 (the warning alone; information, reported, direction only), flat (information, the warning alone (ADR:925): breaks the July derivation, not a design value): reported, direction only

- set 1: dropbacks 50985; time to throw 1.590 s
- set 1: exclusive affected plays against A1: 9497 of 50985 (FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 9497)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 20.11%, beside forced_throw_share's status-forced 20.12% (R5); first must-act tick 1.118 s on 14076 dropbacks, beside first_forcing_seconds' 1.118 s on 14080
- set 1: forced acts by kind (the part that held): MOVEMENT 13271 (threat 13267, status 13271, count 3729), POCKET_DURESS 1026 (threat 1026, status 1026, count 591), CHECKDOWN_LOOK 26585 (threat 7953, status 7955, count 22140), DESPERATION 3299 (threat 853, status 853, count 2819), CLOCK_EXPIRED 7737 (threat 0, status 0, count 7737); the count part's self-check: 28813 of 28813 off-rule acts counted, 0 exceptions; witnesses 98831 closing HOLDs (10685 at or past throwawayEarliestSeconds) and 7737 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1174 (THROW 299, SACK 875), failures 0; status ticks 159363, ticks with a threat inside the warning 21945, of them CLEAN 0, failures 0
- set 1: quick-pressure share 94.06 %; band floor plus counter 2.29 % of first dirt; clean_with_live_won_rep ticks 0.775 %, dropbacks 1.806 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 7.78 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 51299; time to throw 1.590 s
- set 2: exclusive affected plays against A1: 9616 of 51299 (FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 9616)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 20.27%, beside forced_throw_share's status-forced 20.28% (R5); first must-act tick 1.112 s on 14166 dropbacks, beside first_forcing_seconds' 1.113 s on 14171
- set 2: forced acts by kind (the part that held): MOVEMENT 13518 (threat 13514, status 13518, count 3771), POCKET_DURESS 1048 (threat 1047, status 1048, count 588), CHECKDOWN_LOOK 26853 (threat 8061, status 8064, count 22389), DESPERATION 3435 (threat 916, status 916, count 2935), CLOCK_EXPIRED 7703 (threat 0, status 0, count 7703); the count part's self-check: 29011 of 29011 off-rule acts counted, 0 exceptions; witnesses 99235 closing HOLDs (10824 at or past throwawayEarliestSeconds) and 7703 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1202 (THROW 294, SACK 908), failures 0; status ticks 160421, ticks with a threat inside the warning 22367, of them CLEAN 0, failures 0
- set 2: quick-pressure share 94.08 %; band floor plus counter 2.21 % of first dirt; clean_with_live_won_rep ticks 0.762 %, dropbacks 1.758 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 7.79 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B2 (the warning alone; information, reported, direction only), gen (information, the warning alone (ADR:925): breaks the July derivation, not a design value): reported, direction only

- set 1: dropbacks 28272; time to throw 1.665 s
- set 1: exclusive affected plays against A1: 5151 of 28272 (FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 5151)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 23.58%, beside forced_throw_share's status-forced 23.60% (R5); first must-act tick 1.224 s on 8170 dropbacks, beside first_forcing_seconds' 1.225 s on 8174
- set 1: forced acts by kind (the part that held): MOVEMENT 6147 (threat 6140, status 6147, count 729), POCKET_DURESS 429 (threat 428, status 429, count 189), CHECKDOWN_LOOK 9443 (threat 4657, status 4658, count 5629), DESPERATION 3019 (threat 1113, status 1116, count 2139), CLOCK_EXPIRED 2253 (threat 0, status 0, count 2253); the count part's self-check: 8941 of 8941 off-rule acts counted, 0 exceptions; witnesses 59763 closing HOLDs (9277 at or past throwawayEarliestSeconds) and 2253 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 901 (THROW 314, SACK 587), failures 0; status ticks 92881, ticks with a threat inside the warning 12448, of them CLEAN 0, failures 0
- set 1: quick-pressure share 90.12 %; band floor plus counter 2.33 % of first dirt; clean_with_live_won_rep ticks 0.694 %, dropbacks 1.758 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 9.48 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 28094; time to throw 1.691 s
- set 2: exclusive affected plays against A1: 5257 of 28094 (FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 5257)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 24.97%, beside forced_throw_share's status-forced 24.99% (R5); first must-act tick 1.250 s on 8469 dropbacks, beside first_forcing_seconds' 1.250 s on 8473
- set 2: forced acts by kind (the part that held): MOVEMENT 6189 (threat 6183, status 6189, count 608), POCKET_DURESS 426 (threat 426, status 426, count 172), CHECKDOWN_LOOK 8607 (threat 4859, status 4862, count 4391), DESPERATION 3109 (threat 1261, status 1261, count 2097), CLOCK_EXPIRED 1801 (threat 0, status 0, count 1801); the count part's self-check: 7394 of 7394 off-rule acts counted, 0 exceptions; witnesses 60674 closing HOLDs (10452 at or past throwawayEarliestSeconds) and 1801 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 942 (THROW 319, SACK 623), failures 0; status ticks 93797, ticks with a threat inside the warning 12966, of them CLEAN 0, failures 0
- set 2: quick-pressure share 88.98 %; band floor plus counter 2.54 % of first dirt; clean_with_live_won_rep ticks 0.787 %, dropbacks 1.968 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 9.91 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B3 (pocket-1.s2, the design), flat (design)

- set 1: dropbacks 51303; time to throw 1.592 s
- set 1: exclusive affected plays against A1: 14285 of 51303 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 10, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12106, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8793)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 15.30%, beside forced_throw_share's status-forced 15.31% (R5); first must-act tick 1.499 s on 11266 dropbacks, beside first_forcing_seconds' 1.499 s on 11273
- set 1: forced acts by kind (the part that held): MOVEMENT 6410 (threat 6410, status 6410, count 2810), POCKET_DURESS 853 (threat 853, status 853, count 500), CHECKDOWN_LOOK 26201 (threat 6302, status 6306, count 22875), DESPERATION 3435 (threat 749, status 749, count 3051), CLOCK_EXPIRED 7831 (threat 0, status 4, count 7831); the count part's self-check: witnesses 107363 closing HOLDs (10755 at or past throwawayEarliestSeconds) and 7831 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1619 (THROW 424, SACK 1195), failures 0; status ticks 162323, ticks with a threat inside the warning 27713, of them CLEAN 0, failures 0
- set 1: quick-pressure share 94.24 %; band floor plus counter 2.28 % of first dirt; clean_with_live_won_rep ticks 0.454 %, dropbacks 1.189 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 8.18 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 51505; time to throw 1.589 s
- set 2: exclusive affected plays against A1: 14327 of 51505 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 9, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12141, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8748)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 15.61%, beside forced_throw_share's status-forced 15.62% (R5); first must-act tick 1.498 s on 11442 dropbacks, beside first_forcing_seconds' 1.499 s on 11449
- set 2: forced acts by kind (the part that held): MOVEMENT 6507 (threat 6507, status 6507, count 2799), POCKET_DURESS 896 (threat 896, status 896, count 507), CHECKDOWN_LOOK 26345 (threat 6378, status 6382, count 22922), DESPERATION 3431 (threat 727, status 728, count 3069), CLOCK_EXPIRED 7722 (threat 0, status 2, count 7722); the count part's self-check: witnesses 107490 closing HOLDs (10733 at or past throwawayEarliestSeconds) and 7722 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1623 (THROW 438, SACK 1185), failures 0; status ticks 162669, ticks with a threat inside the warning 28004, of them CLEAN 0, failures 0
- set 2: quick-pressure share 94.26 %; band floor plus counter 2.24 % of first dirt; clean_with_live_won_rep ticks 0.429 %, dropbacks 1.120 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 7.91 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B3 (pocket-1.s2, the design), gen (design)

- set 1: dropbacks 28198; time to throw 1.682 s
- set 1: exclusive affected plays against A1: 7706 of 28198 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 7, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6552, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4693)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 19.25%, beside forced_throw_share's status-forced 19.26% (R5); first must-act tick 1.605 s on 6685 dropbacks, beside first_forcing_seconds' 1.606 s on 6690
- set 1: forced acts by kind (the part that held): MOVEMENT 2845 (threat 2845, status 2845, count 540), POCKET_DURESS 411 (threat 411, status 411, count 153), CHECKDOWN_LOOK 8892 (threat 3821, status 3823, count 5872), DESPERATION 2883 (threat 946, status 947, count 2165), CLOCK_EXPIRED 2278 (threat 0, status 3, count 2278); the count part's self-check: witnesses 64292 closing HOLDs (9436 at or past throwawayEarliestSeconds) and 2278 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1129 (THROW 386, SACK 743), failures 0; status ticks 94467, ticks with a threat inside the warning 15630, of them CLEAN 0, failures 0
- set 1: quick-pressure share 90.16 %; band floor plus counter 2.35 % of first dirt; clean_with_live_won_rep ticks 0.483 %, dropbacks 1.348 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 9.36 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 28190; time to throw 1.711 s
- set 2: exclusive affected plays against A1: 8062 of 28190 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 8, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6961, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4873)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 21.26%, beside forced_throw_share's status-forced 21.27% (R5); first must-act tick 1.633 s on 7135 dropbacks, beside first_forcing_seconds' 1.634 s on 7141
- set 2: forced acts by kind (the part that held): MOVEMENT 2698 (threat 2698, status 2698, count 422), POCKET_DURESS 389 (threat 389, status 389, count 133), CHECKDOWN_LOOK 7997 (threat 4123, status 4125, count 4515), DESPERATION 3031 (threat 1097, status 1100, count 2196), CLOCK_EXPIRED 1814 (threat 0, status 2, count 1814); the count part's self-check: witnesses 65953 closing HOLDs (10817 at or past throwawayEarliestSeconds) and 1814 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1179 (THROW 409, SACK 770), failures 0; status ticks 96148, ticks with a threat inside the warning 16519, of them CLEAN 0, failures 0
- set 2: quick-pressure share 88.73 %; band floor plus counter 2.60 % of first dirt; clean_with_live_won_rep ticks 0.552 %, dropbacks 1.554 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 10.20 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B4 (the narrower counter rule; information, reported, direction only), flat (information (ADR:494), not ruled on): reported, direction only

- set 1: dropbacks 51307; time to throw 1.592 s
- set 1: exclusive affected plays against A1: 16195 of 51307 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12106, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8792, COUNTER_LESS_SEEN (a live WON_REP threat at a status tick) 3674)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 15.30%, beside forced_throw_share's status-forced 15.30% (R5); first must-act tick 1.498 s on 11266 dropbacks, beside first_forcing_seconds' 1.498 s on 11266
- set 1: forced acts by kind (the part that held): MOVEMENT 6410 (threat 6410, status 6410, count 2809), POCKET_DURESS 852 (threat 852, status 852, count 499), CHECKDOWN_LOOK 26200 (threat 6301, status 6301, count 22873), DESPERATION 3435 (threat 750, status 750, count 3050), CLOCK_EXPIRED 7833 (threat 0, status 0, count 7833); the count part's self-check: 30417 of 30417 off-rule acts counted, 0 exceptions; witnesses 107368 closing HOLDs (10754 at or past throwawayEarliestSeconds) and 7833 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1618 (THROW 424, SACK 1194), failures 0; status ticks 162331, ticks with a threat inside the warning 27712, of them CLEAN 0, failures 0
- set 1: quick-pressure share 94.27 %; band floor plus counter 2.17 % of first dirt; clean_with_live_won_rep ticks 0.471 %, dropbacks 1.189 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 8.16 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 51505; time to throw 1.589 s
- set 2: exclusive affected plays against A1: 16312 of 51505 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12141, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8748, COUNTER_LESS_SEEN (a live WON_REP threat at a status tick) 3721)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 15.61%, beside forced_throw_share's status-forced 15.61% (R5); first must-act tick 1.498 s on 11442 dropbacks, beside first_forcing_seconds' 1.498 s on 11442
- set 2: forced acts by kind (the part that held): MOVEMENT 6507 (threat 6507, status 6507, count 2799), POCKET_DURESS 896 (threat 896, status 896, count 507), CHECKDOWN_LOOK 26345 (threat 6378, status 6378, count 22922), DESPERATION 3431 (threat 727, status 727, count 3069), CLOCK_EXPIRED 7722 (threat 0, status 0, count 7722); the count part's self-check: 30393 of 30393 off-rule acts counted, 0 exceptions; witnesses 107490 closing HOLDs (10733 at or past throwawayEarliestSeconds) and 7722 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1623 (THROW 438, SACK 1185), failures 0; status ticks 162669, ticks with a threat inside the warning 28004, of them CLEAN 0, failures 0
- set 2: quick-pressure share 94.27 %; band floor plus counter 2.11 % of first dirt; clean_with_live_won_rep ticks 0.449 %, dropbacks 1.120 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 7.84 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B4 (the narrower counter rule; information, reported, direction only), gen (information (ADR:494), not ruled on): reported, direction only

- set 1: dropbacks 28199; time to throw 1.682 s
- set 1: exclusive affected plays against A1: 9113 of 28199 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6552, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4693, COUNTER_LESS_SEEN (a live WON_REP threat at a status tick) 2481)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 19.25%, beside forced_throw_share's status-forced 19.26% (R5); first must-act tick 1.605 s on 6685 dropbacks, beside first_forcing_seconds' 1.606 s on 6688
- set 1: forced acts by kind (the part that held): MOVEMENT 2847 (threat 2845, status 2847, count 542), POCKET_DURESS 411 (threat 411, status 411, count 153), CHECKDOWN_LOOK 8892 (threat 3821, status 3822, count 5871), DESPERATION 2885 (threat 946, status 948, count 2167), CLOCK_EXPIRED 2276 (threat 0, status 0, count 2276); the count part's self-check: 9283 of 9283 off-rule acts counted, 0 exceptions; witnesses 64292 closing HOLDs (9435 at or past throwawayEarliestSeconds) and 2276 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1129 (THROW 386, SACK 743), failures 0; status ticks 94470, ticks with a threat inside the warning 15630, of them CLEAN 0, failures 0
- set 1: quick-pressure share 90.17 %; band floor plus counter 2.26 % of first dirt; clean_with_live_won_rep ticks 0.496 %, dropbacks 1.348 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 9.28 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 28180; time to throw 1.710 s
- set 2: exclusive affected plays against A1: 9532 of 28180 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6959, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4876, COUNTER_LESS_SEEN (a live WON_REP threat at a status tick) 2665)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 21.26%, beside forced_throw_share's status-forced 21.26% (R5); first must-act tick 1.633 s on 7128 dropbacks, beside first_forcing_seconds' 1.633 s on 7129
- set 2: forced acts by kind (the part that held): MOVEMENT 2692 (threat 2692, status 2692, count 417), POCKET_DURESS 386 (threat 386, status 386, count 131), CHECKDOWN_LOOK 8008 (threat 4126, status 4126, count 4524), DESPERATION 3032 (threat 1098, status 1099, count 2196), CLOCK_EXPIRED 1815 (threat 0, status 0, count 1815); the count part's self-check: 7630 of 7630 off-rule acts counted, 0 exceptions; witnesses 65924 closing HOLDs (10809 at or past throwawayEarliestSeconds) and 1815 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1178 (THROW 410, SACK 768), failures 0; status ticks 96107, ticks with a threat inside the warning 16508, of them CLEAN 0, failures 0
- set 2: quick-pressure share 88.83 %; band floor plus counter 2.44 % of first dirt; clean_with_live_won_rep ticks 0.577 %, dropbacks 1.558 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 10.18 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B5 (A5 with the horizons, pkA's A123; information, reported, direction only), flat (information, the basis arm on L (F.9 item 6)): reported, direction only

- set 1: dropbacks 51349; time to throw 1.589 s
- set 1: exclusive affected plays against A5: 14034 of 51349 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 11908, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8650)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 15.75%, beside forced_throw_share's status-forced 16.61% (R5); first must-act tick 1.615 s on 11610 dropbacks, beside first_forcing_seconds' 1.666 s on 12118
- set 1: forced acts by kind (the part that held): MOVEMENT 6764 (threat 6528, status 6764, count 2982), POCKET_DURESS 1488 (threat 1460, status 1488, count 806), CHECKDOWN_LOOK 26493 (threat 6457, status 6755, count 22884), DESPERATION 3376 (threat 775, status 840, count 2973), CLOCK_EXPIRED 7457 (threat 0, status 0, count 7457); the count part's self-check: 29731 of 29731 off-rule acts counted, 0 exceptions; witnesses 107554 closing HOLDs (10273 at or past throwawayEarliestSeconds) and 7457 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1507 (THROW 373, SACK 1134), failures 0; status ticks 162445, ticks with a threat inside the warning 27515, of them CLEAN 0, failures 0
- set 1: quick-pressure share 82.75 %; band floor plus counter 21.63 % of first dirt; clean_with_live_won_rep ticks 0.068 %, dropbacks 0.173 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 16.95 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 51638; time to throw 1.590 s
- set 2: exclusive affected plays against A5: 14215 of 51638 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12050, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8778)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 15.72%, beside forced_throw_share's status-forced 16.60% (R5); first must-act tick 1.610 s on 11707 dropbacks, beside first_forcing_seconds' 1.659 s on 12197
- set 2: forced acts by kind (the part that held): MOVEMENT 6869 (threat 6664, status 6869, count 2961), POCKET_DURESS 1449 (threat 1424, status 1449, count 749), CHECKDOWN_LOOK 26728 (threat 6455, status 6719, count 23076), DESPERATION 3413 (threat 792, status 862, count 2975), CLOCK_EXPIRED 7464 (threat 0, status 0, count 7464); the count part's self-check: 30024 of 30024 off-rule acts counted, 0 exceptions; witnesses 108165 closing HOLDs (10288 at or past throwawayEarliestSeconds) and 7464 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1506 (THROW 394, SACK 1112), failures 0; status ticks 163412, ticks with a threat inside the warning 27869, of them CLEAN 0, failures 0
- set 2: quick-pressure share 82.62 %; band floor plus counter 21.56 % of first dirt; clean_with_live_won_rep ticks 0.061 %, dropbacks 0.155 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 16.41 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B5 (A5 with the horizons, pkA's A123; information, reported, direction only), gen (information, the basis arm on L (F.9 item 6)): reported, direction only

- set 1: dropbacks 28522; time to throw 1.663 s
- set 1: exclusive affected plays against A5: 7831 of 28522 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6629, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4832)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 21.23%, beside forced_throw_share's status-forced 22.82% (R5); first must-act tick 1.721 s on 7357 dropbacks, beside first_forcing_seconds' 1.804 s on 7825
- set 1: forced acts by kind (the part that held): MOVEMENT 3039 (threat 2878, status 3039, count 646), POCKET_DURESS 679 (threat 660, status 679, count 223), CHECKDOWN_LOOK 9185 (threat 4093, status 4368, count 5767), DESPERATION 2995 (threat 1077, status 1230, count 2109), CLOCK_EXPIRED 2099 (threat 0, status 0, count 2099); the count part's self-check: 8681 of 8681 off-rule acts counted, 0 exceptions; witnesses 64199 closing HOLDs (8352 at or past throwawayEarliestSeconds) and 2099 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1049 (THROW 338, SACK 711), failures 0; status ticks 94682, ticks with a threat inside the warning 16175, of them CLEAN 0, failures 0
- set 1: quick-pressure share 77.07 %; band floor plus counter 25.46 % of first dirt; clean_with_live_won_rep ticks 0.065 %, dropbacks 0.158 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 20.32 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 28459; time to throw 1.694 s
- set 2: exclusive affected plays against A5: 8136 of 28459 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6871, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 5036)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 22.21%, beside forced_throw_share's status-forced 24.06% (R5); first must-act tick 1.733 s on 7570 dropbacks, beside first_forcing_seconds' 1.824 s on 8110
- set 2: forced acts by kind (the part that held): MOVEMENT 2988 (threat 2800, status 2988, count 534), POCKET_DURESS 678 (threat 667, status 678, count 203), CHECKDOWN_LOOK 8239 (threat 4248, status 4561, count 4445), DESPERATION 3097 (threat 1184, status 1352, count 2044), CLOCK_EXPIRED 1684 (threat 0, status 0, count 1684); the count part's self-check: 7107 of 7107 off-rule acts counted, 0 exceptions; witnesses 65807 closing HOLDs (9644 at or past throwawayEarliestSeconds) and 1684 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1104 (THROW 371, SACK 733), failures 0; status ticks 96281, ticks with a threat inside the warning 16686, of them CLEAN 0, failures 0
- set 2: quick-pressure share 75.39 %; band floor plus counter 27.12 % of first dirt; clean_with_live_won_rep ticks 0.066 %, dropbacks 0.172 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 20.77 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B6 (B3 with the stand-in hold; pricing arm, never a design value, reported, direction only), flat (pricing arm, never a design value): reported, direction only

- set 1: dropbacks 48201; time to throw 2.747 s
- set 1: exclusive affected plays against A11: 15645 of 48201 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 164, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 14936, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 9285)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 24.47%, beside forced_throw_share's status-forced 24.66% (R5); first must-act tick 1.972 s on 19562 dropbacks, beside first_forcing_seconds' 1.980 s on 19638
- set 1: forced acts by kind (the part that held): MOVEMENT 16215 (threat 16215, status 16215, count 743), POCKET_DURESS 3104 (threat 3104, status 3104, count 383), CHECKDOWN_LOOK 12123 (threat 7455, status 7481, count 5398), DESPERATION 2836 (threat 1079, status 1094, count 2011), CLOCK_EXPIRED 4721 (threat 0, status 79, count 4721); the count part's self-check: witnesses 191003 closing HOLDs (65010 at or past throwawayEarliestSeconds) and 4721 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 3677 (THROW 961, SACK 2716), failures 0; status ticks 247885, ticks with a threat inside the warning 46667, of them CLEAN 0, failures 0
- set 1: quick-pressure share 72.81 %; band floor plus counter 4.19 % of first dirt; clean_with_live_won_rep ticks 0.790 %, dropbacks 3.282 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 20.98 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 48326; time to throw 2.746 s
- set 2: exclusive affected plays against A11: 15799 of 48326 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 178, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 14996, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 9416)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 24.27%, beside forced_throw_share's status-forced 24.48% (R5); first must-act tick 1.947 s on 19588 dropbacks, beside first_forcing_seconds' 1.958 s on 19686
- set 2: forced acts by kind (the part that held): MOVEMENT 16371 (threat 16371, status 16371, count 741), POCKET_DURESS 3134 (threat 3134, status 3134, count 393), CHECKDOWN_LOOK 11927 (threat 7323, status 7358, count 5277), DESPERATION 2740 (threat 1043, status 1059, count 1902), CLOCK_EXPIRED 4713 (threat 0, status 77, count 4713); the count part's self-check: witnesses 191146 closing HOLDs (64983 at or past throwawayEarliestSeconds) and 4713 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 3613 (THROW 942, SACK 2671), failures 0; status ticks 248183, ticks with a threat inside the warning 46889, of them CLEAN 0, failures 0
- set 2: quick-pressure share 73.57 %; band floor plus counter 4.42 % of first dirt; clean_with_live_won_rep ticks 0.847 %, dropbacks 3.512 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 22.01 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B6 (B3 with the stand-in hold; pricing arm, never a design value, reported, direction only), gen (pricing arm, never a design value): reported, direction only

- set 1: dropbacks 26574; time to throw 2.704 s
- set 1: exclusive affected plays against A11: 8399 of 26574 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 134, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 7988, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4897)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 27.78%, beside forced_throw_share's status-forced 28.11% (R5); first must-act tick 2.002 s on 10831 dropbacks, beside first_forcing_seconds' 2.028 s on 10923
- set 1: forced acts by kind (the part that held): MOVEMENT 7912 (threat 7912, status 7912, count 191), POCKET_DURESS 1437 (threat 1437, status 1437, count 96), CHECKDOWN_LOOK 5529 (threat 4078, status 4097, count 1657), DESPERATION 2560 (threat 1241, status 1261, count 1487), CLOCK_EXPIRED 1257 (threat 0, status 42, count 1257); the count part's self-check: witnesses 105123 closing HOLDs (36104 at or past throwawayEarliestSeconds) and 1257 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 3042 (THROW 1034, SACK 2008), failures 0; status ticks 137001, ticks with a threat inside the warning 25808, of them CLEAN 0, failures 0
- set 1: quick-pressure share 71.44 %; band floor plus counter 4.41 % of first dirt; clean_with_live_won_rep ticks 0.787 %, dropbacks 3.278 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 25.30 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 26474; time to throw 2.719 s
- set 2: exclusive affected plays against A11: 8775 of 26474 (MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived) 164, HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 8330, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 5177)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 29.10%, beside forced_throw_share's status-forced 29.48% (R5); first must-act tick 2.007 s on 11047 dropbacks, beside first_forcing_seconds' 2.038 s on 11156
- set 2: forced acts by kind (the part that held): MOVEMENT 8082 (threat 8082, status 8082, count 158), POCKET_DURESS 1357 (threat 1357, status 1357, count 87), CHECKDOWN_LOOK 5556 (threat 4335, status 4360, count 1408), DESPERATION 2644 (threat 1334, status 1373, count 1474), CLOCK_EXPIRED 1091 (threat 0, status 43, count 1091); the count part's self-check: witnesses 105589 closing HOLDs (36915 at or past throwawayEarliestSeconds) and 1091 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 3415 (THROW 1077, SACK 2338), failures 0; status ticks 137872, ticks with a threat inside the warning 27115, of them CLEAN 0, failures 0
- set 2: quick-pressure share 71.88 %; band floor plus counter 4.09 % of first dirt; clean_with_live_won_rep ticks 0.854 %, dropbacks 3.554 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 24.69 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B7 (A1 with the horizons under step 1's rule; information, reported, direction only), flat (information, the basis mechanism on S (C1-F9)): reported, direction only

- set 1: dropbacks 51318; time to throw 1.593 s
- set 1: exclusive affected plays against A1: 14299 of 51318 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12114, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8802)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 15.30%, beside forced_throw_share's status-forced 15.31% (R5); first must-act tick 1.498 s on 11275 dropbacks, beside first_forcing_seconds' 1.499 s on 11282
- set 1: forced acts by kind (the part that held): MOVEMENT 6428 (threat 6423, status 6428, count 2818), POCKET_DURESS 854 (threat 854, status 854, count 501), CHECKDOWN_LOOK 26209 (threat 6304, status 6309, count 22880), DESPERATION 3436 (threat 751, status 751, count 3051), CLOCK_EXPIRED 7829 (threat 0, status 0, count 7829); the count part's self-check: 30414 of 30414 off-rule acts counted, 0 exceptions; witnesses 107395 closing HOLDs (10761 at or past throwawayEarliestSeconds) and 7829 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1623 (THROW 427, SACK 1196), failures 0; status ticks 162379, ticks with a threat inside the warning 27736, of them CLEAN 0, failures 0
- set 1: quick-pressure share 94.24 %; band floor plus counter 2.27 % of first dirt; clean_with_live_won_rep ticks 0.458 %, dropbacks 1.191 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 8.17 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 51525; time to throw 1.589 s
- set 2: exclusive affected plays against A1: 14341 of 51525 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 12149, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 8757)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 15.63%, beside forced_throw_share's status-forced 15.64% (R5); first must-act tick 1.499 s on 11460 dropbacks, beside first_forcing_seconds' 1.499 s on 11469
- set 2: forced acts by kind (the part that held): MOVEMENT 6517 (threat 6514, status 6517, count 2802), POCKET_DURESS 898 (threat 898, status 898, count 509), CHECKDOWN_LOOK 26352 (threat 6381, status 6387, count 22919), DESPERATION 3429 (threat 729, status 730, count 3066), CLOCK_EXPIRED 7728 (threat 0, status 0, count 7728); the count part's self-check: 30392 of 30392 off-rule acts counted, 0 exceptions; witnesses 107520 closing HOLDs (10723 at or past throwawayEarliestSeconds) and 7728 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1624 (THROW 436, SACK 1188), failures 0; status ticks 162727, ticks with a threat inside the warning 28036, of them CLEAN 0, failures 0
- set 2: quick-pressure share 94.24 %; band floor plus counter 2.23 % of first dirt; clean_with_live_won_rep ticks 0.432 %, dropbacks 1.122 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 7.92 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

### B7 (A1 with the horizons under step 1's rule; information, reported, direction only), gen (information, the basis mechanism on S (C1-F9)): reported, direction only

- set 1: dropbacks 28200; time to throw 1.681 s
- set 1: exclusive affected plays against A1: 7708 of 28200 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6556, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4695)
- set 1: must-act share of aimed throws (released on a tick with a threat within C) 19.24%, beside forced_throw_share's status-forced 19.27% (R5); first must-act tick 1.604 s on 6682 dropbacks, beside first_forcing_seconds' 1.606 s on 6688
- set 1: forced acts by kind (the part that held): MOVEMENT 2848 (threat 2845, status 2848, count 543), POCKET_DURESS 411 (threat 411, status 411, count 153), CHECKDOWN_LOOK 8894 (threat 3825, status 3827, count 5869), DESPERATION 2890 (threat 946, status 949, count 2169), CLOCK_EXPIRED 2275 (threat 0, status 0, count 2275); the count part's self-check: 9283 of 9283 off-rule acts counted, 0 exceptions; witnesses 64275 closing HOLDs (9416 at or past throwawayEarliestSeconds) and 2275 CLOCK_EXPIRED, 0 exceptions; passed
- set 1: arrivals 1128 (THROW 388, SACK 740), failures 0; status ticks 94455, ticks with a threat inside the warning 15632, of them CLEAN 0, failures 0
- set 1: quick-pressure share 90.19 %; band floor plus counter 2.35 % of first dirt; clean_with_live_won_rep ticks 0.485 %, dropbacks 1.348 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 1: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 1: the miss rule's n (pressured_share_2s_no_free_runner) 9.34 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean
- set 2: dropbacks 28197; time to throw 1.711 s
- set 2: exclusive affected plays against A1: 8062 of 28197 (HALF (a status tick with the nearest live threat in (0.5, 1.0] s) 6962, FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s) 4876)
- set 2: must-act share of aimed throws (released on a tick with a threat within C) 21.28%, beside forced_throw_share's status-forced 21.30% (R5); first must-act tick 1.632 s on 7138 dropbacks, beside first_forcing_seconds' 1.634 s on 7146
- set 2: forced acts by kind (the part that held): MOVEMENT 2696 (threat 2691, status 2696, count 423), POCKET_DURESS 390 (threat 389, status 390, count 134), CHECKDOWN_LOOK 8003 (threat 4123, status 4130, count 4515), DESPERATION 3035 (threat 1100, status 1103, count 2197), CLOCK_EXPIRED 1814 (threat 0, status 0, count 1814); the count part's self-check: 7619 of 7619 off-rule acts counted, 0 exceptions; witnesses 65997 closing HOLDs (10827 at or past throwawayEarliestSeconds) and 1814 CLOCK_EXPIRED, 0 exceptions; passed
- set 2: arrivals 1175 (THROW 405, SACK 770), failures 0; status ticks 96197, ticks with a threat inside the warning 16517, of them CLEAN 0, failures 0
- set 2: quick-pressure share 88.71 %; band floor plus counter 2.59 % of first dirt; clean_with_live_won_rep ticks 0.554 %, dropbacks 1.557 %, PUSH ticks apart 0.000 % (these rise under the warning, expected, not a failure: R8)
- set 2: pass-rush win rate (pbwr_sim_only) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- set 2: the miss rule's n (pressured_share_2s_no_free_runner) 10.20 %: no step-2 row is under the miss rule (O48); step-1 stream checks 0 failing; step-2 folds clean

## The step reports, one per base group and seed set

### A1 (step 1's design, re-played) with B1 (the forcing point alone; information, not a design value), B2 (the warning alone; information, reported, direction only), B3 (pocket-1.s2, the design), B4 (the narrower counter rule; information, reported, direction only), B7 (A1 with the horizons under step 1's rule; information, reported, direction only), seed set 1

```text
ADR-089 step 2: the pocket report (6 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A1 (step 1's design, re-played) (the base arm): release clock the decision tick ==
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

== B1 (the forcing point alone; information, not a design value): release clock the decision tick ==
  time to throw: flat 1.594 s | gen 1.684 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1591 of 51349 dropbacks (3.10 per 100); pressuredSacks 1591; pressured dropbacks 16348 (31.84 per 100) [time to throw 1.594 s]
    gen: sacks 832 of 28246 dropbacks (2.95 per 100); pressuredSacks 832; pressured dropbacks 9200 (32.57 per 100) [time to throw 1.684 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 9.73% | -12.29 against 22.02% (PR #33, FTN only (held)) | -5.73 against 15.46% (main) [time to throw 1.594 s]
    gen: 9.04% | -12.98 against 22.02% (PR #33, FTN only (held)) | -6.42 against 15.46% (main) [time to throw 1.684 s]
  rows (66, both leagues):
  threat_creation_rate: flat 31.84 % | gen 32.57 %
  hit_or_sack_rate: flat 3.93 % [time to throw 1.594 s] | gen 4.30 % [time to throw 1.684 s]
  sack_rate: flat 3.10 % [time to throw 1.594 s] | gen 2.95 % [time to throw 1.684 s]
  time_to_throw: flat 1.594 seconds | gen 1.684 seconds
  sack_share_of_hit_or_sack: flat 78.92 % [time to throw 1.594 s] | gen 68.48 % [time to throw 1.684 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.594 s] | gen 0.00 % [time to throw 1.684 s]
  release_distribution: flat 1.594 seconds | gen 1.684 seconds
  pressured_share_by_release_bin: flat 21.51 % | gen 23.62 %
  hit_rate_by_release_bin: flat 3.08 % [time to throw 1.594 s] | gen 3.37 % [time to throw 1.684 s]
  hits_on_aimed_throws_per_dropback: flat 0.83 % [time to throw 1.594 s] | gen 1.36 % [time to throw 1.684 s]
  first_pressure_seconds: flat 0.794 seconds | gen 0.904 seconds
  first_forcing_seconds: flat 1.498 seconds | gen 1.610 seconds
  first_arrival_seconds: flat 1.705 seconds | gen 1.764 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 1.82%, FREE_RUNNER 79.84%, WON_REP 18.33%; gen COUNTER 2.01%, FREE_RUNNER 75.68%, WON_REP 22.30%)
  quick_pressure_share_by_origin: flat 94.75 % | gen 91.30 %
  clean_with_live_won_rep_ticks: flat 0.03 % | gen 0.01 %
  clean_with_live_won_rep_dropbacks: flat 0.07 % | gen 0.03 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 11.81 % | gen 7.47 %
  throwaway_rate_clean: flat 19.38 % | gen 10.50 %
  scramble_rate: flat 2.62 % | gen 1.02 %
  scramble_yards: flat 7.03 yards | gen 5.94 yards
  by_down_fixed_calls: flat 10.25 % | gen 10.99 %
  int_per_aimed_throw: flat 2.79 % | gen 7.26 %
  completion_per_aimed_throw: flat 45.97 % | gen 42.75 %
  forced_throw_share: flat 15.44 % | gen 19.37 %
  completion_by_pocket_status: flat 33.25 % | gen 32.00 %
  qb_season_spread: flat 0.73 pp | gen 2.35 pp
  defence_season_spread: flat 0.00 pp | gen 1.14 pp
  unblocked_pressures_per_100: flat 19.24 per 100 dropbacks | gen 18.32 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 66.52 % [time to throw 1.594 s] | gen 64.20 % [time to throw 1.684 s]
  unblocked_men_per_100: flat 19.24 per 100 dropbacks | gen 18.32 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 9.13 % | gen 10.42 %
  quick_share_no_free_runner: flat 73.91 % | gen 64.22 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.45 % | gen 6.15 %
  situation_q1q3_last_two: flat 11.41 % | gen 7.10 %
  sack_share_of_contacts_in_out: flat 78.92 % [time to throw 1.594 s] | gen 68.48 % [time to throw 1.684 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.594 s] | gen 0.00 % [time to throw 1.684 s]
  sacker_mix.split.interior: flat 24.73 % [time to throw 1.594 s] | gen 26.14 % [time to throw 1.684 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 45.88 % [time to throw 1.594 s] | gen 45.19 % [time to throw 1.684 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 28.72 % [time to throw 1.594 s] | gen 28.43 % [time to throw 1.684 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.66 % [time to throw 1.594 s] | gen 0.24 % [time to throw 1.684 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 25.08 % [time to throw 1.594 s] | gen 26.32 % [time to throw 1.684 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.02 % | gen 1.60 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.32 % | gen 2.66 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.62 % | gen 19.94 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.22 % | gen 3.16 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.25 % | gen 16.36 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.89 % | gen 20.59 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.36 % | gen 46.16 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.58 % | gen 19.56 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.22 % | gen 41.61 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.57 % | gen 22.15 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.00 % | gen 20.59 %
  nobody_open_share: flat 44.37 % of dropbacks | gen 35.28 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.67 % of dropbacks | gen 12.55 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.64 % of dropbacks | gen 10.28 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.97 % of dropbacks | gen 9.51 % of dropbacks
  nobody_open_share.split.SACK: flat 3.10 % of dropbacks [time to throw 1.594 s] | gen 2.95 % of dropbacks [time to throw 1.684 s]
  clean_checkdown_share: flat 20.08 % of clean aimed throws | gen 9.42 % of clean aimed throws
  clean_later_read_share: flat 16.13 % of clean aimed throws | gen 22.85 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.28, per aimed throw 2.79; forced-throw share 15.44; completion per attempt 37.69, per aimed throw 45.97; INT-source mix CONTESTED_CATCH 91.05, TIPPED_RECOVERY 8.95
      flat PROGRESSION: 20491 aimed, INT 0.32, completion 44.36
      flat RANK_PUSHED: 6577 aimed, INT 12.62, completion 18.58
      flat CHECKDOWN: 9072 aimed, INT 0.22, completion 45.22
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3409 aimed, INT 5.25, completion 28.57
      flat ON_THE_RUN: 152 aimed, INT 7.89, completion 25.00
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.89 against a real 3.25
    gen: INT per attempt 6.54, per aimed throw 7.26; forced-throw share 19.37; completion per attempt 38.52, per aimed throw 42.75; INT-source mix CONTESTED_CATCH 43.18, TIPPED_RECOVERY 56.82
      gen PROGRESSION: 13891 aimed, INT 2.66, completion 46.16
      gen RANK_PUSHED: 4033 aimed, INT 19.94, completion 19.56
      gen CHECKDOWN: 3545 aimed, INT 3.16, completion 41.61
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2903 aimed, INT 16.36, completion 22.15
      gen ON_THE_RUN: 68 aimed, INT 20.59, completion 20.59
      gen on the run: clean INT n/a against a real 2.11; pressured INT 20.59 against a real 3.25
    the filed guard against A1 (step 1's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.64 -> arm 2.79, rise 0.15 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.30 -> arm 0.32, rise 0.02 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 12.04 -> arm 12.62, rise 0.58 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat CHECKDOWN: base 0.17 -> arm 0.22, rise 0.05 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat DESPERATION: base 5.13 -> arm 5.25, rise 0.12 against an allowed 0.02: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 6.45 -> arm 7.89, rise 1.44 against an allowed 0.14: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.67 -> arm 7.26, rise -0.41 against an allowed 0.01: PASSES
    gen PROGRESSION: base 2.50 -> arm 2.66, rise 0.15 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 21.51 -> arm 19.94, rise -1.58 against an allowed 0.00: PASSES
    gen CHECKDOWN: base 3.65 -> arm 3.16, rise -0.49 against an allowed 0.04: PASSES
    gen DESPERATION: base 17.16 -> arm 16.36, rise -0.79 against an allowed 0.02: PASSES
    gen ON_THE_RUN: base 17.04 -> arm 20.59, rise 3.55 against an allowed 0.34: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A1 (step 1's design, re-played): flat 12158 | gen 6666

== B2 (the warning alone; information, reported, direction only): release clock the decision tick ==
  time to throw: flat 1.590 s | gen 1.665 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1384 of 50985 dropbacks (2.71 per 100); pressuredSacks 1384; pressured dropbacks 14215 (27.88 per 100) [time to throw 1.590 s]
    gen: sacks 750 of 28272 dropbacks (2.65 per 100); pressuredSacks 750; pressured dropbacks 8242 (29.15 per 100) [time to throw 1.665 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 9.74% | -12.28 against 22.02% (PR #33, FTN only (held)) | -5.72 against 15.46% (main) [time to throw 1.590 s]
    gen: 9.10% | -12.92 against 22.02% (PR #33, FTN only (held)) | -6.36 against 15.46% (main) [time to throw 1.665 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.88 % | gen 29.15 %
  hit_or_sack_rate: flat 3.30 % [time to throw 1.590 s] | gen 3.76 % [time to throw 1.665 s]
  sack_rate: flat 2.71 % [time to throw 1.590 s] | gen 2.65 % [time to throw 1.665 s]
  time_to_throw: flat 1.590 seconds | gen 1.665 seconds
  sack_share_of_hit_or_sack: flat 82.23 % [time to throw 1.590 s] | gen 70.49 % [time to throw 1.665 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.590 s] | gen 0.00 % [time to throw 1.665 s]
  release_distribution: flat 1.590 seconds | gen 1.665 seconds
  pressured_share_by_release_bin: flat 18.99 % | gen 19.55 %
  hit_rate_by_release_bin: flat 2.25 % [time to throw 1.590 s] | gen 2.83 % [time to throw 1.665 s]
  hits_on_aimed_throws_per_dropback: flat 0.59 % [time to throw 1.590 s] | gen 1.11 % [time to throw 1.665 s]
  first_pressure_seconds: flat 1.120 seconds | gen 1.227 seconds
  first_forcing_seconds: flat 1.118 seconds | gen 1.225 seconds
  first_arrival_seconds: flat 1.599 seconds | gen 1.695 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.29%, FREE_RUNNER 78.02%, WON_REP 19.69%; gen COUNTER 2.33%, FREE_RUNNER 73.78%, WON_REP 23.89%)
  quick_pressure_share_by_origin: flat 94.06 % | gen 90.12 %
  clean_with_live_won_rep_ticks: flat 0.77 % | gen 0.69 %
  clean_with_live_won_rep_dropbacks: flat 1.81 % | gen 1.76 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.56 % | gen 7.85 %
  throwaway_rate_clean: flat 18.59 % | gen 10.16 %
  scramble_rate: flat 4.01 % | gen 2.04 %
  scramble_yards: flat 7.18 yards | gen 5.49 yards
  by_down_fixed_calls: flat 10.73 % | gen 9.65 %
  int_per_aimed_throw: flat 2.72 % | gen 7.68 %
  completion_per_aimed_throw: flat 46.12 % | gen 42.49 %
  forced_throw_share: flat 20.12 % | gen 23.60 %
  completion_by_pocket_status: flat 28.64 % | gen 28.63 %
  qb_season_spread: flat 0.41 pp | gen 2.92 pp
  defence_season_spread: flat 0.76 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 17.41 per 100 dropbacks | gen 16.81 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 61.85 % [time to throw 1.590 s] | gen 61.09 % [time to throw 1.665 s]
  unblocked_men_per_100: flat 19.14 per 100 dropbacks | gen 18.35 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.78 % | gen 9.48 %
  quick_share_no_free_runner: flat 72.19 % | gen 61.62 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 13.57 % | gen 6.94 %
  situation_q1q3_last_two: flat 11.35 % | gen 8.41 %
  sack_share_of_contacts_in_out: flat 82.23 % [time to throw 1.590 s] | gen 70.49 % [time to throw 1.665 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.590 s] | gen 0.00 % [time to throw 1.665 s]
  sacker_mix.split.interior: flat 28.79 % [time to throw 1.590 s] | gen 31.28 % [time to throw 1.665 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 36.42 % [time to throw 1.590 s] | gen 37.37 % [time to throw 1.665 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 34.14 % [time to throw 1.590 s] | gen 30.95 % [time to throw 1.665 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.65 % [time to throw 1.590 s] | gen 0.40 % [time to throw 1.665 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 28.97 % [time to throw 1.590 s] | gen 31.55 % [time to throw 1.665 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.01 % | gen 0.00 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.31 % | gen 2.63 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.11 % | gen 21.10 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.22 % | gen 3.42 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.76 % | gen 17.03 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 4.86 % | gen 18.18 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.85 % | gen 46.95 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.34 % | gen 19.08 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.08 % | gen 39.84 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.86 % | gen 22.33 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.08 % | gen 21.21 %
  nobody_open_share: flat 44.25 % of dropbacks | gen 36.38 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.88 % of dropbacks | gen 13.56 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.47 % of dropbacks | gen 10.68 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.19 % of dropbacks | gen 9.49 % of dropbacks
  nobody_open_share.split.SACK: flat 2.71 % of dropbacks [time to throw 1.590 s] | gen 2.65 % of dropbacks [time to throw 1.665 s]
  clean_checkdown_share: flat 19.80 % of clean aimed throws | gen 9.15 % of clean aimed throws
  clean_later_read_share: flat 15.65 % of clean aimed throws | gen 22.08 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.22, per aimed throw 2.72; forced-throw share 20.12; completion per attempt 37.63, per aimed throw 46.12; INT-source mix CONTESTED_CATCH 90.14, TIPPED_RECOVERY 9.86
      flat PROGRESSION: 19826 aimed, INT 0.31, completion 44.85
      flat RANK_PUSHED: 6407 aimed, INT 12.11, completion 18.34
      flat CHECKDOWN: 9117 aimed, INT 0.22, completion 45.08
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3299 aimed, INT 5.76, completion 27.86
      flat ON_THE_RUN: 144 aimed, INT 4.86, completion 27.08
      flat on the run: clean INT n/a against a real 2.11; pressured INT 4.86 against a real 3.25
    gen: INT per attempt 6.91, per aimed throw 7.68; forced-throw share 23.60; completion per attempt 38.26, per aimed throw 42.49; INT-source mix CONTESTED_CATCH 43.59, TIPPED_RECOVERY 56.41
      gen PROGRESSION: 13275 aimed, INT 2.63, completion 46.95
      gen RANK_PUSHED: 4004 aimed, INT 21.10, completion 19.08
      gen CHECKDOWN: 3833 aimed, INT 3.42, completion 39.84
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3019 aimed, INT 17.03, completion 22.33
      gen ON_THE_RUN: 132 aimed, INT 18.18, completion 21.21
      gen on the run: clean INT n/a against a real 2.11; pressured INT 18.18 against a real 3.25
    the filed guard against A1 (step 1's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.64 -> arm 2.72, rise 0.08 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.30 -> arm 0.31, rise 0.02 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 12.04 -> arm 12.11, rise 0.07 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat CHECKDOWN: base 0.17 -> arm 0.22, rise 0.05 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat DESPERATION: base 5.13 -> arm 5.76, rise 0.63 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 6.45 -> arm 4.86, rise -1.59 against an allowed 0.01: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.67 -> arm 7.68, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen PROGRESSION: base 2.50 -> arm 2.63, rise 0.13 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 21.51 -> arm 21.10, rise -0.41 against an allowed 0.01: PASSES
    gen CHECKDOWN: base 3.65 -> arm 3.42, rise -0.23 against an allowed -0.00: PASSES
    gen DESPERATION: base 17.16 -> arm 17.03, rise -0.13 against an allowed -0.01: PASSES
    gen ON_THE_RUN: base 17.04 -> arm 18.18, rise 1.14 against an allowed -0.04: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A1 (step 1's design, re-played): flat 9497 | gen 5151

== B3 (pocket-1.s2, the design): release clock the decision tick ==
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
    the filed guard against A1 (step 1's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.64 -> arm 2.83, rise 0.19 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.30 -> arm 0.35, rise 0.05 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 12.04 -> arm 12.70, rise 0.66 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat CHECKDOWN: base 0.17 -> arm 0.21, rise 0.04 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat DESPERATION: base 5.13 -> arm 5.36, rise 0.22 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 6.45 -> arm 5.44, rise -1.01 against an allowed 0.11: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.67 -> arm 7.30, rise -0.37 against an allowed 0.01: PASSES
    gen PROGRESSION: base 2.50 -> arm 2.71, rise 0.21 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 21.51 -> arm 19.74, rise -1.77 against an allowed 0.01: PASSES
    gen CHECKDOWN: base 3.65 -> arm 3.21, rise -0.44 against an allowed 0.03: PASSES
    gen DESPERATION: base 17.16 -> arm 16.61, rise -0.54 against an allowed 0.02: PASSES
    gen ON_THE_RUN: base 17.04 -> arm 20.00, rise 2.96 against an allowed 0.38: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A1 (step 1's design, re-played): flat 14285 | gen 7706

== B4 (the narrower counter rule; information, reported, direction only): release clock the decision tick ==
  time to throw: flat 1.592 s | gen 1.682 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1595 of 51307 dropbacks (3.11 per 100); pressuredSacks 1595; pressured dropbacks 14250 (27.77 per 100) [time to throw 1.592 s]
    gen: sacks 850 of 28199 dropbacks (3.01 per 100); pressuredSacks 850; pressured dropbacks 8095 (28.71 per 100) [time to throw 1.682 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.19% | -10.83 against 22.02% (PR #33, FTN only (held)) | -4.27 against 15.46% (main) [time to throw 1.592 s]
    gen: 10.50% | -11.52 against 22.02% (PR #33, FTN only (held)) | -4.96 against 15.46% (main) [time to throw 1.682 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.77 % | gen 28.71 %
  hit_or_sack_rate: flat 3.94 % [time to throw 1.592 s] | gen 4.38 % [time to throw 1.682 s]
  sack_rate: flat 3.11 % [time to throw 1.592 s] | gen 3.01 % [time to throw 1.682 s]
  time_to_throw: flat 1.592 seconds | gen 1.682 seconds
  sack_share_of_hit_or_sack: flat 79.00 % [time to throw 1.592 s] | gen 68.77 % [time to throw 1.682 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.592 s] | gen 0.00 % [time to throw 1.682 s]
  release_distribution: flat 1.592 seconds | gen 1.682 seconds
  pressured_share_by_release_bin: flat 20.67 % | gen 22.60 %
  hit_rate_by_release_bin: flat 3.02 % [time to throw 1.592 s] | gen 3.42 % [time to throw 1.682 s]
  hits_on_aimed_throws_per_dropback: flat 0.83 % [time to throw 1.592 s] | gen 1.37 % [time to throw 1.682 s]
  first_pressure_seconds: flat 1.116 seconds | gen 1.225 seconds
  first_forcing_seconds: flat 1.498 seconds | gen 1.606 seconds
  first_arrival_seconds: flat 1.706 seconds | gen 1.756 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.17%, FREE_RUNNER 78.06%, WON_REP 19.78%; gen COUNTER 2.26%, FREE_RUNNER 73.59%, WON_REP 24.15%)
  quick_pressure_share_by_origin: flat 94.27 % | gen 90.17 %
  clean_with_live_won_rep_ticks: flat 0.47 % | gen 0.50 %
  clean_with_live_won_rep_dropbacks: flat 1.19 % | gen 1.35 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.04 % | gen 8.33 %
  throwaway_rate_clean: flat 18.42 % | gen 10.01 %
  scramble_rate: flat 2.64 % | gen 0.99 %
  scramble_yards: flat 6.91 yards | gen 6.00 yards
  by_down_fixed_calls: flat 11.27 % | gen 12.32 %
  int_per_aimed_throw: flat 2.83 % | gen 7.30 %
  completion_per_aimed_throw: flat 46.24 % | gen 43.00 %
  forced_throw_share: flat 15.30 % | gen 19.26 %
  completion_by_pocket_status: flat 30.67 % | gen 29.98 %
  qb_season_spread: flat 0.65 pp | gen 2.78 pp
  defence_season_spread: flat 0.00 pp | gen 1.59 pp
  unblocked_pressures_per_100: flat 17.53 per 100 dropbacks | gen 16.99 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 66.47 % [time to throw 1.592 s] | gen 65.05 % [time to throw 1.682 s]
  unblocked_men_per_100: flat 19.13 per 100 dropbacks | gen 18.33 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.16 % | gen 9.28 %
  quick_share_no_free_runner: flat 72.68 % | gen 61.64 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 12.99 % | gen 7.24 %
  situation_q1q3_last_two: flat 12.18 % | gen 8.75 %
  sack_share_of_contacts_in_out: flat 79.00 % [time to throw 1.592 s] | gen 68.77 % [time to throw 1.682 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.592 s] | gen 0.00 % [time to throw 1.682 s]
  sacker_mix.split.interior: flat 24.64 % [time to throw 1.592 s] | gen 26.41 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.55 % [time to throw 1.592 s] | gen 44.41 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 28.12 % [time to throw 1.592 s] | gen 28.76 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.69 % [time to throw 1.592 s] | gen 0.41 % [time to throw 1.682 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 24.95 % [time to throw 1.592 s] | gen 26.59 % [time to throw 1.682 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.04 % | gen 1.60 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.71 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.70 % | gen 19.74 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 3.21 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.36 % | gen 16.60 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.44 % | gen 20.00 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.08 % | gen 46.52 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.44 % | gen 19.62 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.28 % | gen 41.35 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.38 % | gen 22.56 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.85 % | gen 21.43 %
  nobody_open_share: flat 44.30 % of dropbacks | gen 35.36 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.56 % of dropbacks | gen 12.59 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.69 % of dropbacks | gen 10.23 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.93 % of dropbacks | gen 9.53 % of dropbacks
  nobody_open_share.split.SACK: flat 3.11 % of dropbacks [time to throw 1.592 s] | gen 3.01 % of dropbacks [time to throw 1.682 s]
  clean_checkdown_share: flat 19.48 % of clean aimed throws | gen 9.13 % of clean aimed throws
  clean_later_read_share: flat 15.62 % of clean aimed throws | gen 22.10 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.32, per aimed throw 2.83; forced-throw share 15.30; completion per attempt 37.93, per aimed throw 46.24; INT-source mix CONTESTED_CATCH 90.46, TIPPED_RECOVERY 9.54
      flat PROGRESSION: 20463 aimed, INT 0.35, completion 45.08
      flat RANK_PUSHED: 6616 aimed, INT 12.70, completion 18.44
      flat CHECKDOWN: 9012 aimed, INT 0.21, completion 45.28
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3435 aimed, INT 5.36, completion 28.38
      flat ON_THE_RUN: 147 aimed, INT 5.44, completion 25.85
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.44 against a real 3.25
    gen: INT per attempt 6.58, per aimed throw 7.30; forced-throw share 19.26; completion per attempt 38.73, per aimed throw 43.00; INT-source mix CONTESTED_CATCH 43.48, TIPPED_RECOVERY 56.52
      gen PROGRESSION: 13835 aimed, INT 2.71, completion 46.52
      gen RANK_PUSHED: 4042 aimed, INT 19.74, completion 19.62
      gen CHECKDOWN: 3550 aimed, INT 3.21, completion 41.35
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2885 aimed, INT 16.60, completion 22.56
      gen ON_THE_RUN: 70 aimed, INT 20.00, completion 21.43
      gen on the run: clean INT n/a against a real 2.11; pressured INT 20.00 against a real 3.25
    the filed guard against A1 (step 1's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.64 -> arm 2.83, rise 0.19 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.30 -> arm 0.35, rise 0.05 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 12.04 -> arm 12.70, rise 0.66 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat CHECKDOWN: base 0.17 -> arm 0.21, rise 0.04 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat DESPERATION: base 5.13 -> arm 5.36, rise 0.22 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 6.45 -> arm 5.44, rise -1.01 against an allowed 0.11: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.67 -> arm 7.30, rise -0.37 against an allowed 0.01: PASSES
    gen PROGRESSION: base 2.50 -> arm 2.71, rise 0.21 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 21.51 -> arm 19.74, rise -1.77 against an allowed 0.01: PASSES
    gen CHECKDOWN: base 3.65 -> arm 3.21, rise -0.44 against an allowed 0.03: PASSES
    gen DESPERATION: base 17.16 -> arm 16.60, rise -0.55 against an allowed 0.02: PASSES
    gen ON_THE_RUN: base 17.04 -> arm 20.00, rise 2.96 against an allowed 0.38: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A1 (step 1's design, re-played): flat 16195 | gen 9113

== B7 (A1 with the horizons under step 1's rule; information, reported, direction only): release clock the decision tick ==
  time to throw: flat 1.593 s | gen 1.681 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1599 of 51318 dropbacks (3.12 per 100); pressuredSacks 1599; pressured dropbacks 14270 (27.81 per 100) [time to throw 1.593 s]
    gen: sacks 847 of 28200 dropbacks (3.00 per 100); pressuredSacks 847; pressured dropbacks 8100 (28.72 per 100) [time to throw 1.681 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.21% | -10.81 against 22.02% (PR #33, FTN only (held)) | -4.25 against 15.46% (main) [time to throw 1.593 s]
    gen: 10.46% | -11.56 against 22.02% (PR #33, FTN only (held)) | -5.00 against 15.46% (main) [time to throw 1.681 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.81 % | gen 28.72 %
  hit_or_sack_rate: flat 3.95 % [time to throw 1.593 s] | gen 4.38 % [time to throw 1.681 s]
  sack_rate: flat 3.12 % [time to throw 1.593 s] | gen 3.00 % [time to throw 1.681 s]
  time_to_throw: flat 1.593 seconds | gen 1.681 seconds
  sack_share_of_hit_or_sack: flat 78.92 % [time to throw 1.593 s] | gen 68.58 % [time to throw 1.681 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.593 s] | gen 0.00 % [time to throw 1.681 s]
  release_distribution: flat 1.593 seconds | gen 1.681 seconds
  pressured_share_by_release_bin: flat 20.70 % | gen 22.68 %
  hit_rate_by_release_bin: flat 3.04 % [time to throw 1.593 s] | gen 3.41 % [time to throw 1.681 s]
  hits_on_aimed_throws_per_dropback: flat 0.83 % [time to throw 1.593 s] | gen 1.38 % [time to throw 1.681 s]
  first_pressure_seconds: flat 1.117 seconds | gen 1.225 seconds
  first_forcing_seconds: flat 1.499 seconds | gen 1.606 seconds
  first_arrival_seconds: flat 1.706 seconds | gen 1.757 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.27%, FREE_RUNNER 78.01%, WON_REP 19.72%; gen COUNTER 2.35%, FREE_RUNNER 73.62%, WON_REP 24.04%)
  quick_pressure_share_by_origin: flat 94.24 % | gen 90.19 %
  clean_with_live_won_rep_ticks: flat 0.46 % | gen 0.48 %
  clean_with_live_won_rep_dropbacks: flat 1.19 % | gen 1.35 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.05 % | gen 8.36 %
  throwaway_rate_clean: flat 18.41 % | gen 10.00 %
  scramble_rate: flat 2.65 % | gen 0.99 %
  scramble_yards: flat 6.98 yards | gen 6.00 yards
  by_down_fixed_calls: flat 11.31 % | gen 12.24 %
  int_per_aimed_throw: flat 2.82 % | gen 7.30 %
  completion_per_aimed_throw: flat 46.18 % | gen 42.98 %
  forced_throw_share: flat 15.31 % | gen 19.27 %
  completion_by_pocket_status: flat 30.65 % | gen 29.90 %
  qb_season_spread: flat 0.64 pp | gen 2.73 pp
  defence_season_spread: flat 0.00 pp | gen 1.48 pp
  unblocked_pressures_per_100: flat 17.53 per 100 dropbacks | gen 17.01 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 66.39 % [time to throw 1.593 s] | gen 65.10 % [time to throw 1.681 s]
  unblocked_men_per_100: flat 19.12 per 100 dropbacks | gen 18.35 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.17 % | gen 9.34 %
  quick_share_no_free_runner: flat 72.62 % | gen 61.67 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 12.91 % | gen 7.24 %
  situation_q1q3_last_two: flat 12.23 % | gen 8.73 %
  sack_share_of_contacts_in_out: flat 78.92 % [time to throw 1.593 s] | gen 68.58 % [time to throw 1.681 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.593 s] | gen 0.00 % [time to throw 1.681 s]
  sacker_mix.split.interior: flat 24.61 % [time to throw 1.593 s] | gen 26.27 % [time to throw 1.681 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 46.56 % [time to throw 1.593 s] | gen 44.57 % [time to throw 1.681 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 28.14 % [time to throw 1.593 s] | gen 28.75 % [time to throw 1.681 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.69 % [time to throw 1.593 s] | gen 0.41 % [time to throw 1.681 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 24.89 % [time to throw 1.593 s] | gen 26.45 % [time to throw 1.681 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.02 % | gen 1.58 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.72 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.63 % | gen 19.74 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 3.21 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.38 % | gen 16.57 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.44 % | gen 20.00 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 45.05 % | gen 46.54 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 18.39 % | gen 19.59 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.17 % | gen 41.27 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.41 % | gen 22.56 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.85 % | gen 21.43 %
  nobody_open_share: flat 44.29 % of dropbacks | gen 35.38 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.56 % of dropbacks | gen 12.61 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.70 % of dropbacks | gen 10.25 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.92 % of dropbacks | gen 9.52 % of dropbacks
  nobody_open_share.split.SACK: flat 3.12 % of dropbacks [time to throw 1.593 s] | gen 3.00 % of dropbacks [time to throw 1.681 s]
  clean_checkdown_share: flat 19.47 % of clean aimed throws | gen 9.13 % of clean aimed throws
  clean_later_read_share: flat 15.61 % of clean aimed throws | gen 22.09 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.31, per aimed throw 2.82; forced-throw share 15.31; completion per attempt 37.89, per aimed throw 46.18; INT-source mix CONTESTED_CATCH 90.44, TIPPED_RECOVERY 9.56
      flat PROGRESSION: 20466 aimed, INT 0.35, completion 45.05
      flat RANK_PUSHED: 6618 aimed, INT 12.63, completion 18.39
      flat CHECKDOWN: 9011 aimed, INT 0.21, completion 45.17
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3436 aimed, INT 5.38, completion 28.41
      flat ON_THE_RUN: 147 aimed, INT 5.44, completion 25.85
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.44 against a real 3.25
    gen: INT per attempt 6.57, per aimed throw 7.30; forced-throw share 19.27; completion per attempt 38.72, per aimed throw 42.98; INT-source mix CONTESTED_CATCH 43.48, TIPPED_RECOVERY 56.52
      gen PROGRESSION: 13834 aimed, INT 2.72, completion 46.54
      gen RANK_PUSHED: 4038 aimed, INT 19.74, completion 19.59
      gen CHECKDOWN: 3555 aimed, INT 3.21, completion 41.27
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2890 aimed, INT 16.57, completion 22.56
      gen ON_THE_RUN: 70 aimed, INT 20.00, completion 21.43
      gen on the run: clean INT n/a against a real 2.11; pressured INT 20.00 against a real 3.25
    the filed guard against A1 (step 1's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.64 -> arm 2.82, rise 0.18 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.30 -> arm 0.35, rise 0.05 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 12.04 -> arm 12.63, rise 0.59 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat CHECKDOWN: base 0.17 -> arm 0.21, rise 0.04 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat DESPERATION: base 5.13 -> arm 5.38, rise 0.25 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 6.45 -> arm 5.44, rise -1.01 against an allowed 0.11: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.67 -> arm 7.30, rise -0.37 against an allowed 0.01: PASSES
    gen PROGRESSION: base 2.50 -> arm 2.72, rise 0.22 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 21.51 -> arm 19.74, rise -1.78 against an allowed 0.01: PASSES
    gen CHECKDOWN: base 3.65 -> arm 3.21, rise -0.44 against an allowed 0.03: PASSES
    gen DESPERATION: base 17.16 -> arm 16.57, rise -0.58 against an allowed 0.02: PASSES
    gen ON_THE_RUN: base 17.04 -> arm 20.00, rise 2.96 against an allowed 0.38: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A1 (step 1's design, re-played): flat 14299 | gen 7708
```

### A5 (L8 with Heels, re-played) with B5 (A5 with the horizons, pkA's A123; information, reported, direction only), seed set 1

```text
ADR-089 step 2: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A5 (L8 with Heels, re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 1.590 s | gen 1.651 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1240 of 51400 dropbacks (2.41 per 100); pressuredSacks 1240; pressured dropbacks 18760 (36.50 per 100) [time to throw 1.590 s]
    gen: sacks 696 of 28548 dropbacks (2.44 per 100); pressuredSacks 696; pressured dropbacks 11336 (39.71 per 100) [time to throw 1.651 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 6.61% | -15.41 against 22.02% (PR #33, FTN only (held)) | -8.85 against 15.46% (main) [time to throw 1.590 s]
    gen: 6.14% | -15.88 against 22.02% (PR #33, FTN only (held)) | -9.32 against 15.46% (main) [time to throw 1.651 s]
  rows (66, both leagues):
  threat_creation_rate: flat 36.50 % | gen 39.71 %
  hit_or_sack_rate: flat 2.86 % [time to throw 1.590 s] | gen 3.40 % [time to throw 1.651 s]
  sack_rate: flat 2.41 % [time to throw 1.590 s] | gen 2.44 % [time to throw 1.651 s]
  time_to_throw: flat 1.590 seconds | gen 1.651 seconds
  sack_share_of_hit_or_sack: flat 84.47 % [time to throw 1.590 s] | gen 71.60 % [time to throw 1.651 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.590 s] | gen 0.00 % [time to throw 1.651 s]
  release_distribution: flat 1.590 seconds | gen 1.651 seconds
  pressured_share_by_release_bin: flat 26.63 % | gen 29.48 %
  hit_rate_by_release_bin: flat 1.31 % [time to throw 1.590 s] | gen 1.79 % [time to throw 1.651 s]
  hits_on_aimed_throws_per_dropback: flat 0.44 % [time to throw 1.590 s] | gen 0.97 % [time to throw 1.651 s]
  first_pressure_seconds: flat 1.075 seconds | gen 1.214 seconds
  first_forcing_seconds: flat 1.258 seconds | gen 1.423 seconds
  first_arrival_seconds: flat 1.658 seconds | gen 1.757 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 18.08%, FREE_RUNNER 69.09%, WON_REP 12.83%; gen COUNTER 20.67%, FREE_RUNNER 61.98%, WON_REP 17.35%)
  quick_pressure_share_by_origin: flat 83.89 % | gen 79.33 %
  clean_with_live_won_rep_ticks: flat 0.00 % | gen 0.00 %
  clean_with_live_won_rep_dropbacks: flat 0.00 % | gen 0.00 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 17.82 % | gen 10.70 %
  throwaway_rate_clean: flat 17.16 % | gen 8.87 %
  scramble_rate: flat 3.58 % | gen 1.88 %
  scramble_yards: flat 6.93 yards | gen 5.27 yards
  by_down_fixed_calls: flat 7.45 % | gen 5.78 %
  int_per_aimed_throw: flat 2.76 % | gen 7.44 %
  completion_per_aimed_throw: flat 45.48 % | gen 41.77 %
  forced_throw_share: flat 20.98 % | gen 26.32 %
  completion_by_pocket_status: flat 27.78 % | gen 28.53 %
  qb_season_spread: flat 0.75 pp | gen 1.99 pp
  defence_season_spread: flat 0.28 pp | gen 0.47 pp
  unblocked_pressures_per_100: flat 19.00 per 100 dropbacks | gen 18.28 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 70.64 % [time to throw 1.590 s] | gen 70.58 % [time to throw 1.651 s]
  unblocked_men_per_100: flat 19.00 per 100 dropbacks | gen 18.28 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 16.44 % | gen 20.65 %
  quick_share_no_free_runner: flat 47.89 % | gen 45.64 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 17.45 % | gen 10.15 %
  situation_q1q3_last_two: flat 17.00 % | gen 10.45 %
  sack_share_of_contacts_in_out: flat 84.47 % [time to throw 1.590 s] | gen 71.60 % [time to throw 1.651 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.590 s] | gen 0.00 % [time to throw 1.651 s]
  sacker_mix.split.interior: flat 22.42 % [time to throw 1.590 s] | gen 25.14 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 40.89 % [time to throw 1.590 s] | gen 40.52 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 36.37 % [time to throw 1.590 s] | gen 33.84 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.32 % [time to throw 1.590 s] | gen 0.50 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 22.82 % [time to throw 1.590 s] | gen 25.43 % [time to throw 1.651 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 7.56 % | gen 9.59 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.33 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.27 % | gen 20.86 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 3.58 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.42 % | gen 17.42 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.29 % | gen 12.88 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.17 % | gen 45.71 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.92 % | gen 19.71 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 44.37 % | gen 38.20 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.71 % | gen 21.09 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.51 % | gen 23.48 %
  nobody_open_share: flat 44.45 % of dropbacks | gen 36.53 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 18.17 % of dropbacks | gen 13.62 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.47 % of dropbacks | gen 10.88 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.40 % of dropbacks | gen 9.59 % of dropbacks
  nobody_open_share.split.SACK: flat 2.41 % of dropbacks [time to throw 1.590 s] | gen 2.44 % of dropbacks [time to throw 1.651 s]
  clean_checkdown_share: flat 20.93 % of clean aimed throws | gen 9.40 % of clean aimed throws
  clean_later_read_share: flat 15.34 % of clean aimed throws | gen 21.54 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.25, per aimed throw 2.76; forced-throw share 20.98; completion per attempt 37.06, per aimed throw 45.48; INT-source mix CONTESTED_CATCH 89.78, TIPPED_RECOVERY 10.22
      flat PROGRESSION: 19972 aimed, INT 0.36, completion 44.17
      flat RANK_PUSHED: 6554 aimed, INT 12.27, completion 16.92
      flat CHECKDOWN: 9339 aimed, INT 0.21, completion 44.37
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3324 aimed, INT 5.42, completion 27.71
      flat ON_THE_RUN: 189 aimed, INT 5.29, completion 27.51
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.29 against a real 3.25
    gen: INT per attempt 6.70, per aimed throw 7.44; forced-throw share 26.32; completion per attempt 37.58, per aimed throw 41.77; INT-source mix CONTESTED_CATCH 45.54, TIPPED_RECOVERY 54.46
      gen PROGRESSION: 13538 aimed, INT 2.33, completion 45.71
      gen RANK_PUSHED: 3912 aimed, INT 20.86, completion 19.71
      gen CHECKDOWN: 3887 aimed, INT 3.58, completion 38.20
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3106 aimed, INT 17.42, completion 21.09
      gen ON_THE_RUN: 132 aimed, INT 12.88, completion 23.48
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.88 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== B5 (A5 with the horizons, pkA's A123; information, reported, direction only): release clock the decision tick ==
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
    the filed guard against A5 (L8 with Heels, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.76 -> arm 2.61, rise -0.15 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.36 -> arm 0.37, rise 0.01 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 12.27 -> arm 11.69, rise -0.58 against an allowed -0.02: PASSES
    flat CHECKDOWN: base 0.21 -> arm 0.13, rise -0.08 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.42 -> arm 4.95, rise -0.47 against an allowed 0.02: PASSES
    flat ON_THE_RUN: base 5.29 -> arm 7.22, rise 1.93 against an allowed 0.12: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.44 -> arm 7.63, rise 0.19 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen PROGRESSION: base 2.33 -> arm 2.39, rise 0.05 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 20.86 -> arm 21.39, rise 0.53 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen CHECKDOWN: base 3.58 -> arm 3.26, rise -0.32 against an allowed 0.04: PASSES
    gen DESPERATION: base 17.42 -> arm 18.20, rise 0.78 against an allowed 0.04: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen ON_THE_RUN: base 12.88 -> arm 16.92, rise 4.04 against an allowed 0.44: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A5 (L8 with Heels, re-played): flat 14034 | gen 7831
```

### A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value) with B6 (B3 with the stand-in hold; pricing arm, never a design value, reported, direction only), seed set 1

```text
ADR-089 step 2: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value) (the base arm): release clock the decision tick ==
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

== B6 (B3 with the stand-in hold; pricing arm, never a design value, reported, direction only): release clock the decision tick ==
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
    the filed guard against A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.86 -> arm 3.02, rise 0.15 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.29 -> arm 0.36, rise 0.08 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 11.40 -> arm 11.81, rise 0.40 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat CHECKDOWN: base 0.18 -> arm 0.17, rise -0.02 against an allowed -0.02: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat DESPERATION: base 6.41 -> arm 6.35, rise -0.06 against an allowed 0.02: PASSES
    flat ON_THE_RUN: base 5.56 -> arm 10.42, rise 4.86 against an allowed -0.04: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.25 -> arm 7.38, rise 0.13 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen PROGRESSION: base 2.06 -> arm 2.19, rise 0.13 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 21.11 -> arm 21.87, rise 0.76 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen CHECKDOWN: base 3.66 -> arm 3.93, rise 0.27 against an allowed -0.03: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen DESPERATION: base 16.90 -> arm 16.17, rise -0.72 against an allowed 0.03: PASSES
    gen ON_THE_RUN: base 16.00 -> arm 15.85, rise -0.15 against an allowed 0.04: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value): flat 15645 | gen 8399
```

### A0 (today's game, re-played) alone, seed set 1

```text
ADR-089 step 2: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A0 (today's game, re-played) (the base arm): release clock the decision tick ==
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

### A14 (today's clock with the hold, re-played; pricing arm, never a design value) alone, seed set 1

```text
ADR-089 step 2: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A14 (today's clock with the hold, re-played; pricing arm, never a design value) (the base arm): release clock the decision tick ==
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

### A1 (step 1's design, re-played) with B1 (the forcing point alone; information, not a design value), B2 (the warning alone; information, reported, direction only), B3 (pocket-1.s2, the design), B4 (the narrower counter rule; information, reported, direction only), B7 (A1 with the horizons under step 1's rule; information, reported, direction only), seed set 2

```text
ADR-089 step 2: the pocket report (6 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A1 (step 1's design, re-played) (the base arm): release clock the decision tick ==
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

== B1 (the forcing point alone; information, not a design value): release clock the decision tick ==
  time to throw: flat 1.592 s | gen 1.712 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1575 of 51638 dropbacks (3.05 per 100); pressuredSacks 1575; pressured dropbacks 16494 (31.94 per 100) [time to throw 1.592 s]
    gen: sacks 845 of 28168 dropbacks (3.00 per 100); pressuredSacks 845; pressured dropbacks 9607 (34.11 per 100) [time to throw 1.712 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 9.55% | -12.47 against 22.02% (PR #33, FTN only (held)) | -5.91 against 15.46% (main) [time to throw 1.592 s]
    gen: 8.80% | -13.22 against 22.02% (PR #33, FTN only (held)) | -6.66 against 15.46% (main) [time to throw 1.712 s]
  rows (66, both leagues):
  threat_creation_rate: flat 31.94 % | gen 34.11 %
  hit_or_sack_rate: flat 3.97 % [time to throw 1.592 s] | gen 4.49 % [time to throw 1.712 s]
  sack_rate: flat 3.05 % [time to throw 1.592 s] | gen 3.00 % [time to throw 1.712 s]
  time_to_throw: flat 1.592 seconds | gen 1.712 seconds
  sack_share_of_hit_or_sack: flat 76.90 % [time to throw 1.592 s] | gen 66.75 % [time to throw 1.712 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.592 s] | gen 0.00 % [time to throw 1.712 s]
  release_distribution: flat 1.592 seconds | gen 1.712 seconds
  pressured_share_by_release_bin: flat 21.18 % | gen 25.54 %
  hit_rate_by_release_bin: flat 3.22 % [time to throw 1.592 s] | gen 3.23 % [time to throw 1.712 s]
  hits_on_aimed_throws_per_dropback: flat 0.92 % [time to throw 1.592 s] | gen 1.49 % [time to throw 1.712 s]
  first_pressure_seconds: flat 0.794 seconds | gen 0.937 seconds
  first_forcing_seconds: flat 1.501 seconds | gen 1.632 seconds
  first_arrival_seconds: flat 1.718 seconds | gen 1.766 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 1.79%, FREE_RUNNER 79.96%, WON_REP 18.25%; gen COUNTER 2.17%, FREE_RUNNER 74.74%, WON_REP 23.10%)
  quick_pressure_share_by_origin: flat 94.66 % | gen 89.82 %
  clean_with_live_won_rep_ticks: flat 0.03 % | gen 0.02 %
  clean_with_live_won_rep_dropbacks: flat 0.07 % | gen 0.06 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 11.51 % | gen 6.70 %
  throwaway_rate_clean: flat 19.09 % | gen 8.47 %
  scramble_rate: flat 2.73 % | gen 0.55 %
  scramble_yards: flat 6.56 yards | gen 6.05 yards
  by_down_fixed_calls: flat 9.75 % | gen 10.08 %
  int_per_aimed_throw: flat 2.68 % | gen 7.66 %
  completion_per_aimed_throw: flat 45.52 % | gen 42.84 %
  forced_throw_share: flat 15.67 % | gen 21.36 %
  completion_by_pocket_status: flat 32.17 % | gen 32.43 %
  qb_season_spread: flat 0.00 pp | gen 3.02 pp
  defence_season_spread: flat 0.00 pp | gen 1.28 pp
  unblocked_pressures_per_100: flat 19.31 per 100 dropbacks | gen 19.33 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 67.04 % [time to throw 1.592 s] | gen 68.09 % [time to throw 1.712 s]
  unblocked_men_per_100: flat 19.31 per 100 dropbacks | gen 19.33 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.70 % | gen 10.98 %
  quick_share_no_free_runner: flat 73.37 % | gen 59.70 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 10.66 % | gen 6.53 %
  situation_q1q3_last_two: flat 11.81 % | gen 6.99 %
  sack_share_of_contacts_in_out: flat 76.90 % [time to throw 1.592 s] | gen 66.75 % [time to throw 1.712 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.592 s] | gen 0.00 % [time to throw 1.712 s]
  sacker_mix.split.interior: flat 23.93 % [time to throw 1.592 s] | gen 25.80 % [time to throw 1.712 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 45.20 % [time to throw 1.592 s] | gen 45.56 % [time to throw 1.712 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 30.02 % [time to throw 1.592 s] | gen 28.46 % [time to throw 1.712 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.86 % [time to throw 1.592 s] | gen 0.18 % [time to throw 1.712 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 24.25 % [time to throw 1.592 s] | gen 25.80 % [time to throw 1.712 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.15 % | gen 2.09 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.83 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.41 % | gen 20.86 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.15 % | gen 3.87 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.01 % | gen 17.49 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 10.14 % | gen 8.82 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.71 % | gen 45.65 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.23 % | gen 19.59 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 44.96 % | gen 41.79 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.00 % | gen 20.74 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 19.57 % | gen 23.53 %
  nobody_open_share: flat 44.33 % of dropbacks | gen 33.50 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.93 % of dropbacks | gen 11.92 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.67 % of dropbacks | gen 10.72 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.67 % of dropbacks | gen 7.87 % of dropbacks
  nobody_open_share.split.SACK: flat 3.05 % of dropbacks [time to throw 1.592 s] | gen 3.00 % of dropbacks [time to throw 1.712 s]
  clean_checkdown_share: flat 20.39 % of clean aimed throws | gen 7.32 % of clean aimed throws
  clean_later_read_share: flat 15.59 % of clean aimed throws | gen 22.14 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.21, per aimed throw 2.68; forced-throw share 15.67; completion per attempt 37.47, per aimed throw 45.52; INT-source mix CONTESTED_CATCH 91.80, TIPPED_RECOVERY 8.20
      flat PROGRESSION: 20505 aimed, INT 0.36, completion 43.71
      flat RANK_PUSHED: 6698 aimed, INT 11.41, completion 17.23
      flat CHECKDOWN: 9260 aimed, INT 0.15, completion 44.96
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3445 aimed, INT 6.01, completion 29.00
      flat ON_THE_RUN: 138 aimed, INT 10.14, completion 19.57
      flat on the run: clean INT n/a against a real 2.11; pressured INT 10.14 against a real 3.25
    gen: INT per attempt 7.03, per aimed throw 7.66; forced-throw share 21.36; completion per attempt 39.35, per aimed throw 42.84; INT-source mix CONTESTED_CATCH 45.58, TIPPED_RECOVERY 54.42
      gen PROGRESSION: 14496 aimed, INT 2.83, completion 45.65
      gen RANK_PUSHED: 4012 aimed, INT 20.86, completion 19.59
      gen CHECKDOWN: 3357 aimed, INT 3.87, completion 41.79
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3019 aimed, INT 17.49, completion 20.74
      gen ON_THE_RUN: 68 aimed, INT 8.82, completion 23.53
      gen on the run: clean INT n/a against a real 2.11; pressured INT 8.82 against a real 3.25
    the filed guard against A1 (step 1's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.71 -> arm 2.68, rise -0.03 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.32 -> arm 0.36, rise 0.04 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 11.76 -> arm 11.41, rise -0.35 against an allowed -0.02: PASSES
    flat CHECKDOWN: base 0.23 -> arm 0.15, rise -0.08 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.42 -> arm 6.01, rise 0.59 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 13.48 -> arm 10.14, rise -3.33 against an allowed 0.11: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.74 -> arm 7.66, rise -0.08 against an allowed 0.01: PASSES
    gen PROGRESSION: base 2.66 -> arm 2.83, rise 0.17 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 20.89 -> arm 20.86, rise -0.03 against an allowed -0.02: PASSES
    gen CHECKDOWN: base 4.17 -> arm 3.87, rise -0.30 against an allowed 0.06: PASSES
    gen DESPERATION: base 17.54 -> arm 17.49, rise -0.05 against an allowed 0.03: PASSES
    gen ON_THE_RUN: base 16.00 -> arm 8.82, rise -7.18 against an allowed 0.19: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A1 (step 1's design, re-played): flat 12249 | gen 7020

== B2 (the warning alone; information, reported, direction only): release clock the decision tick ==
  time to throw: flat 1.590 s | gen 1.691 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1372 of 51299 dropbacks (2.67 per 100); pressuredSacks 1372; pressured dropbacks 14314 (27.90 per 100) [time to throw 1.590 s]
    gen: sacks 783 of 28094 dropbacks (2.79 per 100); pressuredSacks 783; pressured dropbacks 8560 (30.47 per 100) [time to throw 1.691 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 9.59% | -12.43 against 22.02% (PR #33, FTN only (held)) | -5.87 against 15.46% (main) [time to throw 1.590 s]
    gen: 9.15% | -12.87 against 22.02% (PR #33, FTN only (held)) | -6.31 against 15.46% (main) [time to throw 1.691 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.90 % | gen 30.47 %
  hit_or_sack_rate: flat 3.25 % [time to throw 1.590 s] | gen 3.92 % [time to throw 1.691 s]
  sack_rate: flat 2.67 % [time to throw 1.590 s] | gen 2.79 % [time to throw 1.691 s]
  time_to_throw: flat 1.590 seconds | gen 1.691 seconds
  sack_share_of_hit_or_sack: flat 82.35 % [time to throw 1.590 s] | gen 71.05 % [time to throw 1.691 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.590 s] | gen 0.00 % [time to throw 1.691 s]
  release_distribution: flat 1.590 seconds | gen 1.691 seconds
  pressured_share_by_release_bin: flat 19.77 % | gen 20.33 %
  hit_rate_by_release_bin: flat 2.29 % [time to throw 1.590 s] | gen 2.27 % [time to throw 1.691 s]
  hits_on_aimed_throws_per_dropback: flat 0.57 % [time to throw 1.590 s] | gen 1.14 % [time to throw 1.691 s]
  first_pressure_seconds: flat 1.116 seconds | gen 1.255 seconds
  first_forcing_seconds: flat 1.113 seconds | gen 1.250 seconds
  first_arrival_seconds: flat 1.612 seconds | gen 1.681 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.21%, FREE_RUNNER 78.12%, WON_REP 19.67%; gen COUNTER 2.54%, FREE_RUNNER 72.98%, WON_REP 24.48%)
  quick_pressure_share_by_origin: flat 94.08 % | gen 88.98 %
  clean_with_live_won_rep_ticks: flat 0.76 % | gen 0.79 %
  clean_with_live_won_rep_dropbacks: flat 1.76 % | gen 1.97 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 13.64 % | gen 7.11 %
  throwaway_rate_clean: flat 18.38 % | gen 8.28 %
  scramble_rate: flat 3.86 % | gen 1.49 %
  scramble_yards: flat 6.37 yards | gen 6.09 yards
  by_down_fixed_calls: flat 9.56 % | gen 11.54 %
  int_per_aimed_throw: flat 2.74 % | gen 7.81 %
  completion_per_aimed_throw: flat 45.95 % | gen 42.79 %
  forced_throw_share: flat 20.28 % | gen 24.99 %
  completion_by_pocket_status: flat 28.45 % | gen 29.87 %
  qb_season_spread: flat 0.00 pp | gen 3.20 pp
  defence_season_spread: flat 0.00 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 17.51 per 100 dropbacks | gen 17.75 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 63.15 % [time to throw 1.590 s] | gen 66.52 % [time to throw 1.691 s]
  unblocked_men_per_100: flat 19.23 per 100 dropbacks | gen 19.45 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.79 % | gen 9.91 %
  quick_share_no_free_runner: flat 72.21 % | gen 58.46 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 12.53 % | gen 7.50 %
  situation_q1q3_last_two: flat 13.73 % | gen 6.48 %
  sack_share_of_contacts_in_out: flat 82.35 % [time to throw 1.590 s] | gen 71.05 % [time to throw 1.691 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.590 s] | gen 0.00 % [time to throw 1.691 s]
  sacker_mix.split.interior: flat 28.33 % [time to throw 1.590 s] | gen 27.34 % [time to throw 1.691 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 37.00 % [time to throw 1.590 s] | gen 41.81 % [time to throw 1.691 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 34.16 % [time to throw 1.590 s] | gen 30.35 % [time to throw 1.691 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.51 % [time to throw 1.590 s] | gen 0.51 % [time to throw 1.691 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 28.28 % [time to throw 1.590 s] | gen 27.78 % [time to throw 1.691 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.00 % | gen 0.02 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.31 % | gen 2.74 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.98 % | gen 21.02 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.19 % | gen 4.09 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.41 % | gen 17.72 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 14.39 % | gen 16.67 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.73 % | gen 46.42 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.96 % | gen 18.87 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.11 % | gen 39.20 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.76 % | gen 21.90 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 18.71 % | gen 31.41 %
  nobody_open_share: flat 44.18 % of dropbacks | gen 34.50 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.75 % of dropbacks | gen 12.72 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.70 % of dropbacks | gen 11.07 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.06 % of dropbacks | gen 7.93 % of dropbacks
  nobody_open_share.split.SACK: flat 2.67 % of dropbacks [time to throw 1.590 s] | gen 2.79 % of dropbacks [time to throw 1.691 s]
  clean_checkdown_share: flat 19.72 % of clean aimed throws | gen 6.97 % of clean aimed throws
  clean_later_read_share: flat 15.39 % of clean aimed throws | gen 22.06 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.24, per aimed throw 2.74; forced-throw share 20.28; completion per attempt 37.57, per aimed throw 45.95; INT-source mix CONTESTED_CATCH 89.77, TIPPED_RECOVERY 10.23
      flat PROGRESSION: 19917 aimed, INT 0.31, completion 44.73
      flat RANK_PUSHED: 6597 aimed, INT 11.98, completion 16.96
      flat CHECKDOWN: 9108 aimed, INT 0.19, completion 45.11
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3435 aimed, INT 5.41, completion 28.76
      flat ON_THE_RUN: 139 aimed, INT 14.39, completion 18.71
      flat on the run: clean INT n/a against a real 2.11; pressured INT 14.39 against a real 3.25
    gen: INT per attempt 7.17, per aimed throw 7.81; forced-throw share 24.99; completion per attempt 39.25, per aimed throw 42.79; INT-source mix CONTESTED_CATCH 45.20, TIPPED_RECOVERY 54.80
      gen PROGRESSION: 13917 aimed, INT 2.74, completion 46.42
      gen RANK_PUSHED: 3910 aimed, INT 21.02, completion 18.87
      gen CHECKDOWN: 3574 aimed, INT 4.09, completion 39.20
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3109 aimed, INT 17.72, completion 21.90
      gen ON_THE_RUN: 156 aimed, INT 16.67, completion 31.41
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.67 against a real 3.25
    the filed guard against A1 (step 1's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.71 -> arm 2.74, rise 0.04 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.32 -> arm 0.31, rise -0.00 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 11.76 -> arm 11.98, rise 0.21 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat CHECKDOWN: base 0.23 -> arm 0.19, rise -0.04 against an allowed -0.01: PASSES
    flat DESPERATION: base 5.42 -> arm 5.41, rise -0.00 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 13.48 -> arm 14.39, rise 0.91 against an allowed 0.03: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.74 -> arm 7.81, rise 0.07 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen PROGRESSION: base 2.66 -> arm 2.74, rise 0.08 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 20.89 -> arm 21.02, rise 0.13 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen CHECKDOWN: base 4.17 -> arm 4.09, rise -0.09 against an allowed -0.01: PASSES
    gen DESPERATION: base 17.54 -> arm 17.72, rise 0.18 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen ON_THE_RUN: base 16.00 -> arm 16.67, rise 0.67 against an allowed -0.03: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A1 (step 1's design, re-played): flat 9616 | gen 5257

== B3 (pocket-1.s2, the design): release clock the decision tick ==
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
    the filed guard against A1 (step 1's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.71 -> arm 2.75, rise 0.04 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.32 -> arm 0.39, rise 0.08 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 11.76 -> arm 11.57, rise -0.19 against an allowed -0.02: PASSES
    flat CHECKDOWN: base 0.23 -> arm 0.16, rise -0.06 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.42 -> arm 6.32, rise 0.91 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 13.48 -> arm 9.16, rise -4.31 against an allowed 0.13: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.74 -> arm 7.69, rise -0.05 against an allowed 0.01: PASSES
    gen PROGRESSION: base 2.66 -> arm 2.79, rise 0.13 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 20.89 -> arm 20.68, rise -0.21 against an allowed -0.04: PASSES
    gen CHECKDOWN: base 4.17 -> arm 3.75, rise -0.42 against an allowed 0.06: PASSES
    gen DESPERATION: base 17.54 -> arm 18.18, rise 0.64 against an allowed 0.04: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen ON_THE_RUN: base 16.00 -> arm 8.45, rise -7.55 against an allowed 0.15: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A1 (step 1's design, re-played): flat 14327 | gen 8062

== B4 (the narrower counter rule; information, reported, direction only): release clock the decision tick ==
  time to throw: flat 1.589 s | gen 1.710 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1598 of 51505 dropbacks (3.10 per 100); pressuredSacks 1598; pressured dropbacks 14352 (27.87 per 100) [time to throw 1.589 s]
    gen: sacks 845 of 28180 dropbacks (3.00 per 100); pressuredSacks 845; pressured dropbacks 8567 (30.40 per 100) [time to throw 1.710 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.13% | -10.89 against 22.02% (PR #33, FTN only (held)) | -4.33 against 15.46% (main) [time to throw 1.589 s]
    gen: 9.86% | -12.16 against 22.02% (PR #33, FTN only (held)) | -5.60 against 15.46% (main) [time to throw 1.710 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.87 % | gen 30.40 %
  hit_or_sack_rate: flat 3.95 % [time to throw 1.589 s] | gen 4.45 % [time to throw 1.710 s]
  sack_rate: flat 3.10 % [time to throw 1.589 s] | gen 3.00 % [time to throw 1.710 s]
  time_to_throw: flat 1.589 seconds | gen 1.710 seconds
  sack_share_of_hit_or_sack: flat 78.49 % [time to throw 1.589 s] | gen 67.33 % [time to throw 1.710 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.710 s]
  release_distribution: flat 1.589 seconds | gen 1.710 seconds
  pressured_share_by_release_bin: flat 20.32 % | gen 24.79 %
  hit_rate_by_release_bin: flat 2.96 % [time to throw 1.589 s] | gen 3.22 % [time to throw 1.710 s]
  hits_on_aimed_throws_per_dropback: flat 0.85 % [time to throw 1.589 s] | gen 1.45 % [time to throw 1.710 s]
  first_pressure_seconds: flat 1.113 seconds | gen 1.256 seconds
  first_forcing_seconds: flat 1.498 seconds | gen 1.633 seconds
  first_arrival_seconds: flat 1.716 seconds | gen 1.767 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.11%, FREE_RUNNER 78.11%, WON_REP 19.77%; gen COUNTER 2.44%, FREE_RUNNER 72.60%, WON_REP 24.97%)
  quick_pressure_share_by_origin: flat 94.27 % | gen 88.83 %
  clean_with_live_won_rep_ticks: flat 0.45 % | gen 0.58 %
  clean_with_live_won_rep_dropbacks: flat 1.12 % | gen 1.56 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 12.51 % | gen 7.30 %
  throwaway_rate_clean: flat 18.36 % | gen 8.04 %
  scramble_rate: flat 2.70 % | gen 0.55 %
  scramble_yards: flat 6.49 yards | gen 5.58 yards
  by_down_fixed_calls: flat 11.26 % | gen 11.07 %
  int_per_aimed_throw: flat 2.75 % | gen 7.70 %
  completion_per_aimed_throw: flat 46.05 % | gen 42.95 %
  forced_throw_share: flat 15.61 % | gen 21.26 %
  completion_by_pocket_status: flat 30.35 % | gen 30.62 %
  qb_season_spread: flat 0.00 pp | gen 3.32 pp
  defence_season_spread: flat 0.00 pp | gen 0.97 pp
  unblocked_pressures_per_100: flat 17.70 per 100 dropbacks | gen 17.73 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 67.14 % [time to throw 1.589 s] | gen 68.05 % [time to throw 1.710 s]
  unblocked_men_per_100: flat 19.35 per 100 dropbacks | gen 19.30 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.84 % | gen 10.18 %
  quick_share_no_free_runner: flat 72.75 % | gen 58.04 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.03 % | gen 7.02 %
  situation_q1q3_last_two: flat 12.66 % | gen 8.07 %
  sack_share_of_contacts_in_out: flat 78.49 % [time to throw 1.589 s] | gen 67.33 % [time to throw 1.710 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.710 s]
  sacker_mix.split.interior: flat 23.36 % [time to throw 1.589 s] | gen 26.35 % [time to throw 1.710 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 45.67 % [time to throw 1.589 s] | gen 44.99 % [time to throw 1.710 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 30.18 % [time to throw 1.589 s] | gen 28.42 % [time to throw 1.710 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.78 % [time to throw 1.589 s] | gen 0.24 % [time to throw 1.710 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 23.65 % [time to throw 1.589 s] | gen 26.63 % [time to throw 1.710 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.16 % | gen 2.12 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.39 % | gen 2.80 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.57 % | gen 20.69 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.16 % | gen 3.74 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.32 % | gen 18.21 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.16 % | gen 8.57 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.69 % | gen 46.08 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.34 % | gen 19.20 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.34 % | gen 41.91 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.35 % | gen 20.55 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 19.08 % | gen 24.29 %
  nobody_open_share: flat 44.20 % of dropbacks | gen 33.34 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.71 % of dropbacks | gen 11.77 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.66 % of dropbacks | gen 10.76 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.73 % of dropbacks | gen 7.81 % of dropbacks
  nobody_open_share.split.SACK: flat 3.10 % of dropbacks [time to throw 1.589 s] | gen 3.00 % of dropbacks [time to throw 1.710 s]
  clean_checkdown_share: flat 19.59 % of clean aimed throws | gen 6.96 % of clean aimed throws
  clean_later_read_share: flat 15.24 % of clean aimed throws | gen 21.67 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.26, per aimed throw 2.75; forced-throw share 15.61; completion per attempt 37.87, per aimed throw 46.05; INT-source mix CONTESTED_CATCH 91.43, TIPPED_RECOVERY 8.57
      flat PROGRESSION: 20543 aimed, INT 0.39, completion 44.69
      flat RANK_PUSHED: 6671 aimed, INT 11.57, completion 17.34
      flat CHECKDOWN: 9120 aimed, INT 0.16, completion 45.34
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3431 aimed, INT 6.32, completion 29.35
      flat ON_THE_RUN: 131 aimed, INT 9.16, completion 19.08
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.16 against a real 3.25
    gen: INT per attempt 7.08, per aimed throw 7.70; forced-throw share 21.26; completion per attempt 39.48, per aimed throw 42.95; INT-source mix CONTESTED_CATCH 45.43, TIPPED_RECOVERY 54.57
      gen PROGRESSION: 14518 aimed, INT 2.80, completion 46.08
      gen RANK_PUSHED: 4041 aimed, INT 20.69, completion 19.20
      gen CHECKDOWN: 3317 aimed, INT 3.74, completion 41.91
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3032 aimed, INT 18.21, completion 20.55
      gen ON_THE_RUN: 70 aimed, INT 8.57, completion 24.29
      gen on the run: clean INT n/a against a real 2.11; pressured INT 8.57 against a real 3.25
    the filed guard against A1 (step 1's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.71 -> arm 2.75, rise 0.04 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.32 -> arm 0.39, rise 0.08 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 11.76 -> arm 11.57, rise -0.19 against an allowed -0.02: PASSES
    flat CHECKDOWN: base 0.23 -> arm 0.16, rise -0.06 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.42 -> arm 6.32, rise 0.91 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 13.48 -> arm 9.16, rise -4.31 against an allowed 0.13: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.74 -> arm 7.70, rise -0.04 against an allowed 0.01: PASSES
    gen PROGRESSION: base 2.66 -> arm 2.80, rise 0.14 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 20.89 -> arm 20.69, rise -0.20 against an allowed -0.04: PASSES
    gen CHECKDOWN: base 4.17 -> arm 3.74, rise -0.43 against an allowed 0.06: PASSES
    gen DESPERATION: base 17.54 -> arm 18.21, rise 0.67 against an allowed 0.04: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen ON_THE_RUN: base 16.00 -> arm 8.57, rise -7.43 against an allowed 0.16: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A1 (step 1's design, re-played): flat 16312 | gen 9532

== B7 (A1 with the horizons under step 1's rule; information, reported, direction only): release clock the decision tick ==
  time to throw: flat 1.589 s | gen 1.711 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1603 of 51525 dropbacks (3.11 per 100); pressuredSacks 1603; pressured dropbacks 14384 (27.92 per 100) [time to throw 1.589 s]
    gen: sacks 847 of 28197 dropbacks (3.00 per 100); pressuredSacks 847; pressured dropbacks 8592 (30.47 per 100) [time to throw 1.711 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 11.14% | -10.88 against 22.02% (PR #33, FTN only (held)) | -4.32 against 15.46% (main) [time to throw 1.589 s]
    gen: 9.86% | -12.16 against 22.02% (PR #33, FTN only (held)) | -5.60 against 15.46% (main) [time to throw 1.711 s]
  rows (66, both leagues):
  threat_creation_rate: flat 27.92 % | gen 30.47 %
  hit_or_sack_rate: flat 3.96 % [time to throw 1.589 s] | gen 4.44 % [time to throw 1.711 s]
  sack_rate: flat 3.11 % [time to throw 1.589 s] | gen 3.00 % [time to throw 1.711 s]
  time_to_throw: flat 1.589 seconds | gen 1.711 seconds
  sack_share_of_hit_or_sack: flat 78.62 % [time to throw 1.589 s] | gen 67.65 % [time to throw 1.711 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.711 s]
  release_distribution: flat 1.589 seconds | gen 1.711 seconds
  pressured_share_by_release_bin: flat 20.41 % | gen 24.80 %
  hit_rate_by_release_bin: flat 2.94 % [time to throw 1.589 s] | gen 3.17 % [time to throw 1.711 s]
  hits_on_aimed_throws_per_dropback: flat 0.85 % [time to throw 1.589 s] | gen 1.44 % [time to throw 1.711 s]
  first_pressure_seconds: flat 1.115 seconds | gen 1.258 seconds
  first_forcing_seconds: flat 1.499 seconds | gen 1.634 seconds
  first_arrival_seconds: flat 1.716 seconds | gen 1.768 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.23%, FREE_RUNNER 77.99%, WON_REP 19.79%; gen COUNTER 2.59%, FREE_RUNNER 72.44%, WON_REP 24.96%)
  quick_pressure_share_by_origin: flat 94.24 % | gen 88.71 %
  clean_with_live_won_rep_ticks: flat 0.43 % | gen 0.55 %
  clean_with_live_won_rep_dropbacks: flat 1.12 % | gen 1.56 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 12.53 % | gen 7.29 %
  throwaway_rate_clean: flat 18.37 % | gen 8.05 %
  scramble_rate: flat 2.70 % | gen 0.55 %
  scramble_yards: flat 6.49 yards | gen 5.61 yards
  by_down_fixed_calls: flat 11.19 % | gen 11.02 %
  int_per_aimed_throw: flat 2.75 % | gen 7.69 %
  completion_per_aimed_throw: flat 46.05 % | gen 42.92 %
  forced_throw_share: flat 15.64 % | gen 21.30 %
  completion_by_pocket_status: flat 30.28 % | gen 30.55 %
  qb_season_spread: flat 0.00 pp | gen 3.35 pp
  defence_season_spread: flat 0.00 pp | gen 1.04 pp
  unblocked_pressures_per_100: flat 17.71 per 100 dropbacks | gen 17.73 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 66.99 % [time to throw 1.589 s] | gen 67.89 % [time to throw 1.711 s]
  unblocked_men_per_100: flat 19.36 per 100 dropbacks | gen 19.30 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 7.92 % | gen 10.20 %
  quick_share_no_free_runner: flat 72.76 % | gen 57.83 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.11 % | gen 7.17 %
  situation_q1q3_last_two: flat 12.72 % | gen 8.07 %
  sack_share_of_contacts_in_out: flat 78.62 % [time to throw 1.589 s] | gen 67.65 % [time to throw 1.711 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.711 s]
  sacker_mix.split.interior: flat 23.54 % [time to throw 1.589 s] | gen 26.41 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 45.53 % [time to throw 1.589 s] | gen 44.88 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 30.15 % [time to throw 1.589 s] | gen 28.47 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.78 % [time to throw 1.589 s] | gen 0.24 % [time to throw 1.711 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 23.83 % [time to throw 1.589 s] | gen 26.68 % [time to throw 1.711 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.15 % | gen 2.07 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.39 % | gen 2.78 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.59 % | gen 20.67 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.16 % | gen 3.74 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.30 % | gen 18.19 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.16 % | gen 8.45 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.69 % | gen 46.03 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.32 % | gen 19.14 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 45.33 % | gen 41.88 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 29.37 % | gen 20.56 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 18.32 % | gen 23.94 %
  nobody_open_share: flat 44.23 % of dropbacks | gen 33.34 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.72 % of dropbacks | gen 11.75 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.66 % of dropbacks | gen 10.76 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.74 % of dropbacks | gen 7.82 % of dropbacks
  nobody_open_share.split.SACK: flat 3.11 % of dropbacks [time to throw 1.589 s] | gen 3.00 % of dropbacks [time to throw 1.711 s]
  clean_checkdown_share: flat 19.63 % of clean aimed throws | gen 6.93 % of clean aimed throws
  clean_later_read_share: flat 15.21 % of clean aimed throws | gen 21.65 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.26, per aimed throw 2.75; forced-throw share 15.64; completion per attempt 37.86, per aimed throw 46.05; INT-source mix CONTESTED_CATCH 91.43, TIPPED_RECOVERY 8.57
      flat PROGRESSION: 20545 aimed, INT 0.39, completion 44.69
      flat RANK_PUSHED: 6669 aimed, INT 11.59, completion 17.32
      flat CHECKDOWN: 9131 aimed, INT 0.16, completion 45.33
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3429 aimed, INT 6.30, completion 29.37
      flat ON_THE_RUN: 131 aimed, INT 9.16, completion 18.32
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.16 against a real 3.25
    gen: INT per attempt 7.06, per aimed throw 7.69; forced-throw share 21.30; completion per attempt 39.44, per aimed throw 42.92; INT-source mix CONTESTED_CATCH 45.50, TIPPED_RECOVERY 54.50
      gen PROGRESSION: 14532 aimed, INT 2.78, completion 46.03
      gen RANK_PUSHED: 4039 aimed, INT 20.67, completion 19.14
      gen CHECKDOWN: 3314 aimed, INT 3.74, completion 41.88
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3035 aimed, INT 18.19, completion 20.56
      gen ON_THE_RUN: 71 aimed, INT 8.45, completion 23.94
      gen on the run: clean INT n/a against a real 2.11; pressured INT 8.45 against a real 3.25
    the filed guard against A1 (step 1's design, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.71 -> arm 2.75, rise 0.04 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.32 -> arm 0.39, rise 0.08 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 11.76 -> arm 11.59, rise -0.17 against an allowed -0.02: PASSES
    flat CHECKDOWN: base 0.23 -> arm 0.16, rise -0.06 against an allowed 0.00: PASSES
    flat DESPERATION: base 5.42 -> arm 6.30, rise 0.88 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 13.48 -> arm 9.16, rise -4.31 against an allowed 0.13: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.74 -> arm 7.69, rise -0.06 against an allowed 0.01: PASSES
    gen PROGRESSION: base 2.66 -> arm 2.78, rise 0.12 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 20.89 -> arm 20.67, rise -0.22 against an allowed -0.04: PASSES
    gen CHECKDOWN: base 4.17 -> arm 3.74, rise -0.43 against an allowed 0.06: PASSES
    gen DESPERATION: base 17.54 -> arm 18.19, rise 0.65 against an allowed 0.04: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen ON_THE_RUN: base 16.00 -> arm 8.45, rise -7.55 against an allowed 0.15: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A1 (step 1's design, re-played): flat 14341 | gen 8062
```

### A5 (L8 with Heels, re-played) with B5 (A5 with the horizons, pkA's A123; information, reported, direction only), seed set 2

```text
ADR-089 step 2: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A5 (L8 with Heels, re-played) (the base arm): release clock the decision tick ==
  time to throw: flat 1.589 s | gen 1.676 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1286 of 51790 dropbacks (2.48 per 100); pressuredSacks 1286; pressured dropbacks 19061 (36.80 per 100) [time to throw 1.589 s]
    gen: sacks 714 of 28408 dropbacks (2.51 per 100); pressuredSacks 714; pressured dropbacks 11778 (41.46 per 100) [time to throw 1.676 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 6.75% | -15.27 against 22.02% (PR #33, FTN only (held)) | -8.71 against 15.46% (main) [time to throw 1.589 s]
    gen: 6.06% | -15.96 against 22.02% (PR #33, FTN only (held)) | -9.40 against 15.46% (main) [time to throw 1.676 s]
  rows (66, both leagues):
  threat_creation_rate: flat 36.80 % | gen 41.46 %
  hit_or_sack_rate: flat 2.92 % [time to throw 1.589 s] | gen 3.58 % [time to throw 1.676 s]
  sack_rate: flat 2.48 % [time to throw 1.589 s] | gen 2.51 % [time to throw 1.676 s]
  time_to_throw: flat 1.589 seconds | gen 1.676 seconds
  sack_share_of_hit_or_sack: flat 84.94 % [time to throw 1.589 s] | gen 70.21 % [time to throw 1.676 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.676 s]
  release_distribution: flat 1.589 seconds | gen 1.676 seconds
  pressured_share_by_release_bin: flat 27.56 % | gen 29.51 %
  hit_rate_by_release_bin: flat 1.21 % [time to throw 1.589 s] | gen 1.66 % [time to throw 1.676 s]
  hits_on_aimed_throws_per_dropback: flat 0.44 % [time to throw 1.589 s] | gen 1.07 % [time to throw 1.676 s]
  first_pressure_seconds: flat 1.068 seconds | gen 1.236 seconds
  first_forcing_seconds: flat 1.251 seconds | gen 1.439 seconds
  first_arrival_seconds: flat 1.646 seconds | gen 1.753 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 17.90%, FREE_RUNNER 69.46%, WON_REP 12.65%; gen COUNTER 22.48%, FREE_RUNNER 61.46%, WON_REP 16.06%)
  quick_pressure_share_by_origin: flat 84.08 % | gen 77.82 %
  clean_with_live_won_rep_ticks: flat 0.00 % | gen 0.00 %
  clean_with_live_won_rep_dropbacks: flat 0.01 % | gen 0.00 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen n/a %
  throwaway_rate_pressured: flat 17.81 % | gen 9.62 %
  throwaway_rate_clean: flat 17.28 % | gen 7.73 %
  scramble_rate: flat 3.55 % | gen 1.34 %
  scramble_yards: flat 8.06 yards | gen 5.58 yards
  by_down_fixed_calls: flat 7.32 % | gen 7.89 %
  int_per_aimed_throw: flat 2.70 % | gen 7.64 %
  completion_per_aimed_throw: flat 45.39 % | gen 42.36 %
  forced_throw_share: flat 21.11 % | gen 27.93 %
  completion_by_pocket_status: flat 27.33 % | gen 29.85 %
  qb_season_spread: flat 0.68 pp | gen 2.47 pp
  defence_season_spread: flat 0.46 pp | gen 1.06 pp
  unblocked_pressures_per_100: flat 19.29 per 100 dropbacks | gen 19.33 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 71.40 % [time to throw 1.589 s] | gen 73.25 % [time to throw 1.676 s]
  unblocked_men_per_100: flat 19.29 per 100 dropbacks | gen 19.33 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 16.76 % | gen 20.46 %
  quick_share_no_free_runner: flat 47.87 % | gen 42.45 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 18.04 % | gen 9.15 %
  situation_q1q3_last_two: flat 17.72 % | gen 8.83 %
  sack_share_of_contacts_in_out: flat 84.94 % [time to throw 1.589 s] | gen 70.18 % [time to throw 1.676 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.676 s]
  sacker_mix.split.interior: flat 22.91 % [time to throw 1.589 s] | gen 24.23 % [time to throw 1.676 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 40.42 % [time to throw 1.589 s] | gen 42.06 % [time to throw 1.676 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 36.18 % [time to throw 1.589 s] | gen 33.29 % [time to throw 1.676 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.49 % [time to throw 1.589 s] | gen 0.42 % [time to throw 1.676 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 23.05 % [time to throw 1.589 s] | gen 25.14 % [time to throw 1.676 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 7.23 % | gen 10.52 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.37 % | gen 2.77 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.54 % | gen 20.28 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.24 % | gen 3.94 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.51 % | gen 17.71 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 9.90 % | gen 17.02 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.18 % | gen 45.58 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.63 % | gen 19.28 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 44.74 % | gen 40.35 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.28 % | gen 21.36 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 21.88 % | gen 26.95 %
  nobody_open_share: flat 44.49 % of dropbacks | gen 35.10 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.80 % of dropbacks | gen 13.06 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.73 % of dropbacks | gen 11.01 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.48 % of dropbacks | gen 8.51 % of dropbacks
  nobody_open_share.split.SACK: flat 2.48 % of dropbacks [time to throw 1.589 s] | gen 2.51 % of dropbacks [time to throw 1.676 s]
  clean_checkdown_share: flat 20.54 % of clean aimed throws | gen 7.24 % of clean aimed throws
  clean_later_read_share: flat 15.38 % of clean aimed throws | gen 20.63 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.20, per aimed throw 2.70; forced-throw share 21.11; completion per attempt 36.95, per aimed throw 45.39; INT-source mix CONTESTED_CATCH 90.55, TIPPED_RECOVERY 9.45
      flat PROGRESSION: 20126 aimed, INT 0.37, completion 44.18
      flat RANK_PUSHED: 6595 aimed, INT 11.54, completion 16.63
      flat CHECKDOWN: 9219 aimed, INT 0.24, completion 44.74
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3483 aimed, INT 5.51, completion 28.28
      flat ON_THE_RUN: 192 aimed, INT 9.90, completion 21.88
      flat on the run: clean INT n/a against a real 2.11; pressured INT 9.90 against a real 3.25
    gen: INT per attempt 6.96, per aimed throw 7.64; forced-throw share 27.93; completion per attempt 38.61, per aimed throw 42.36; INT-source mix CONTESTED_CATCH 45.87, TIPPED_RECOVERY 54.13
      gen PROGRESSION: 14024 aimed, INT 2.77, completion 45.58
      gen RANK_PUSHED: 3891 aimed, INT 20.28, completion 19.28
      gen CHECKDOWN: 3710 aimed, INT 3.94, completion 40.35
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3128 aimed, INT 17.71, completion 21.36
      gen ON_THE_RUN: 141 aimed, INT 17.02, completion 26.95
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.02 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== B5 (A5 with the horizons, pkA's A123; information, reported, direction only): release clock the decision tick ==
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
    the filed guard against A5 (L8 with Heels, re-played) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.70 -> arm 2.76, rise 0.06 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat PROGRESSION: base 0.37 -> arm 0.38, rise 0.01 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat RANK_PUSHED: base 11.54 -> arm 11.89, rise 0.35 against an allowed -0.02: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat CHECKDOWN: base 0.24 -> arm 0.22, rise -0.02 against an allowed 0.01: PASSES
    flat DESPERATION: base 5.51 -> arm 5.80, rise 0.29 against an allowed 0.03: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 9.90 -> arm 5.13, rise -4.77 against an allowed 0.07: PASSES
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.64 -> arm 7.53, rise -0.11 against an allowed 0.01: PASSES
    gen PROGRESSION: base 2.77 -> arm 2.61, rise -0.15 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 20.28 -> arm 20.78, rise 0.51 against an allowed -0.02: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen CHECKDOWN: base 3.94 -> arm 3.90, rise -0.03 against an allowed 0.06: PASSES
    gen DESPERATION: base 17.71 -> arm 17.27, rise -0.44 against an allowed 0.04: PASSES
    gen ON_THE_RUN: base 17.02 -> arm 9.30, rise -7.72 against an allowed 0.29: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A5 (L8 with Heels, re-played): flat 14215 | gen 8136
```

### A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value) with B6 (B3 with the stand-in hold; pricing arm, never a design value, reported, direction only), seed set 2

```text
ADR-089 step 2: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value) (the base arm): release clock the decision tick ==
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

== B6 (B3 with the stand-in hold; pricing arm, never a design value, reported, direction only): release clock the decision tick ==
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
    the filed guard against A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value) (D9's additive mix rule, then by class, D28), printed as context: at this step AM-1 (ADR-089 Appendix F, F.11) grades the guard, so a line above its allowance is the filed reading, not the verdict:
    flat league-wide: base 2.85 -> arm 2.82, rise -0.03 against an allowed -0.00: PASSES
    flat PROGRESSION: base 0.31 -> arm 0.28, rise -0.03 against an allowed 0.00: PASSES
    flat RANK_PUSHED: base 11.94 -> arm 11.31, rise -0.64 against an allowed -0.01: PASSES
    flat CHECKDOWN: base 0.12 -> arm 0.19, rise 0.08 against an allowed -0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat DESPERATION: base 5.24 -> arm 6.06, rise 0.82 against an allowed -0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat ON_THE_RUN: base 3.52 -> arm 6.94, rise 3.42 against an allowed 0.00: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    flat by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen league-wide: base 7.91 -> arm 7.65, rise -0.26 against an allowed -0.00: PASSES
    gen PROGRESSION: base 2.39 -> arm 2.40, rise 0.02 against an allowed 0.01: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen RANK_PUSHED: base 21.42 -> arm 20.34, rise -1.07 against an allowed 0.00: PASSES
    gen CHECKDOWN: base 4.11 -> arm 4.13, rise 0.02 against an allowed -0.05: above the allowance (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
    gen DESPERATION: base 19.05 -> arm 18.49, rise -0.55 against an allowed 0.02: PASSES
    gen ON_THE_RUN: base 17.05 -> arm 14.29, rise -2.76 against an allowed -0.01: PASSES
    gen by class: above the allowance in a class (the filed reading; AM-1 (ADR-089 Appendix F, F.11) grades)
  exclusive affected plays against A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value): flat 15799 | gen 8775
```

### A0 (today's game, re-played) alone, seed set 2

```text
ADR-089 step 2: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A0 (today's game, re-played) (the base arm): release clock the decision tick ==
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

### A14 (today's clock with the hold, re-played; pricing arm, never a design value) alone, seed set 2

```text
ADR-089 step 2: the pocket report (1 arm; both leagues; every hit and sack figure with its time to throw beside it)

== A14 (today's clock with the hold, re-played; pricing arm, never a design value) (the base arm): release clock the decision tick ==
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
