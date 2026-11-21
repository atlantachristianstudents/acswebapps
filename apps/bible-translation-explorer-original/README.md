# Original Study Bible Translation Explorer — RcV estimate

This is **a duplicate of the user-supplied `bible-translation-explorer.zip` interface**, adapted to compare the **nine** translations whose quantitative component results appeared in Andi Wu's 2017 Global Bible Initiative report, plus an independent Recovery Version (RcV) estimate. The app uses the uploaded HTML as its base rather than an older generated dashboard.

## Source

Andi Wu, *A Quantitative Evaluation of the Christian Standard Bible* (Global Bible Initiative, January 2017), pp. 3–5.
https://csbible.com/wp-content/uploads/2017/01/Quantitative-Translation-Evaluation-by-GBI.pdf

The supplied `original_study_with_user_specified_rcv.csv` preserves all nine reported rows and their published final scores. Neither the source PDF nor copyrighted Bible translation text is bundled.

## Independent estimate for RcV

The RcV* placement was calculated independently by comparing RcV’s scores with those of translations also included in Wu’s original study. The comparison used the Bible Translation Evaluator, a rough replication of the methodology described in Wu’s paper. [Bible Translation Evaluator on GitHub](https://github.com/zioninzion/bible-translation-evaluator-github)

| Component | RcV* estimate |
|---|---:|
| Syntactic transfer | 71.44% |
| Lexical consistency | 64.43% |
| Syntactic fluency | 54.94% |
| Vocabulary familiarity | 77.78% |

Using the study’s **2:1** component weights, RcV’s estimated scores are **69.10% literalness**, **62.55% readability**, and **65.83% overall**.

The dash in the final-score column indicates that Wu’s study has no published final score for RcV.

## How scores are calculated

- Literalness gives syntactic transfer twice the weight of lexical consistency.
- Readability gives syntactic fluency twice the weight of vocabulary familiarity.
- Overall averages literalness and readability. The chart legend shows the score range and names the highest and lowest visible translations.
- The **Published final** column shows Wu’s original final score for the nine reported translations.

## Features

- Resizable square chart with an overall-score gradient and a movable, collapsible legend.
- Sortable table, toggles to show or hide translations, CSV export, and 2200×2200 PNG export.
- Offline operation, PWA support, and a phone layout.
- ACS navigation and About/help/update integration.

## Run/install

In the ACS Web Apps directory, open **Bible Translation Explorer (Wu 2017)**. Its usage events appear under `apps/bible-translation-explorer-original/` in GoatCounter.

Open `index.html` directly or serve the folder as a static site. For example, run `python3 -m http.server 8000` from the parent folder and navigate to the app's `index.html`. Installing as a PWA requires localhost or HTTPS. The source PDF is linked externally only; scoring and chart rendering require no network connection.

The evaluator uses different algorithms, samples, and alignment procedures from Wu’s study. The RcV placement is an approximate comparison.
