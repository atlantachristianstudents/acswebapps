#!/usr/bin/env bash
# MACULA Hebrew / Nestle1904 Greek -> RCV/KJV/NIV -> CSV + chart
# Run in your own terminal: bash run_full_study.sh [--sample N] [--no-fetch]
set -euo pipefail
cd "$(dirname "$0")"
N=0
FETCH=1
while (( $# )); do
  case "$1" in
    --sample) N="$2"; shift 2;;
    --no-fetch) FETCH=0; shift;;
    *) echo "Unknown argument: $1" >&2; exit 2;;
  esac
done
if [[ -f .venv/bin/activate ]]; then
  # Existing Python >= 3.10 venv from the starter toolkit.
  source .venv/bin/activate
fi
python - <<'PY'
import sys
assert sys.version_info >= (3,10), 'Python >= 3.10 required; activate your .venv'
try:
 import spacy
 spacy.load('en_core_web_sm')
except Exception as e:
 raise SystemExit('English spaCy model missing: python -m spacy download en_core_web_sm')
PY
for tr in RCV KJV NIV; do
  [[ -f "translations/common/$tr.tsv" ]] || { echo "Missing translations/common/$tr.tsv" >&2; exit 2; }
done
mkdir -p data cache prepared results
if (( FETCH )); then
  echo '=== 1 / 5: Get open MACULA Hebrew and Greek syntax-tree data ==='
  python macula_pipeline.py fetch --dest data/sources
fi
NEED_EXTRACT=1
if [[ -s data/macula_source.sqlite ]]; then
  if python - <<'PYCHECK'
import sqlite3
c=sqlite3.connect('data/macula_source.sqlite')
assert c.execute('SELECT COUNT(*) FROM verses').fetchone()[0] > 30000
assert {'OT','NT'} == {x[0] for x in c.execute('SELECT DISTINCT testament FROM verses')}
PYCHECK
  then NEED_EXTRACT=0; fi
fi
if (( NEED_EXTRACT )); then
  echo '=== 2 / 5: Convert MACULA constituency XML to indexed source tokens ==='
  python macula_pipeline.py extract \
    --hebrew data/sources/macula-hebrew \
    --greek data/sources/macula-greek \
    --out data/macula_source.sqlite
else
  echo '=== 2 / 5: Using cached MACULA source database ==='
fi
python macula_pipeline.py audit --source-db data/macula_source.sqlite \
  --english translations/common/RCV.tsv \
  --english translations/common/KJV.tsv \
  --english translations/common/NIV.tsv

if [[ -s cache/brown.json.gz ]]; then
  REF=cache/brown.json.gz
elif [[ -s cache/brown_en_core_web_sm.json.gz ]]; then
  REF=cache/brown_en_core_web_sm.json.gz
else
  echo '=== 3 / 5: Build the Brown Corpus readability reference ==='
  python bible_eval.py build-reference --brown --model en_core_web_sm \
    --max-n 8 --out cache/brown.json.gz
  REF=cache/brown.json.gz
fi
echo "=== 3 / 5: Brown reference: $REF ==="

PREPS=()
for tr in RCV KJV NIV; do
  echo "=== 4 / 5: Parse and gloss-align $tr ==="
  SUFFIX=''
  if (( N > 0 )); then SUFFIX="_sample${N}"; fi
  P="prepared/${tr}_macula${SUFFIX}.jsonl"
  # macOS ships Bash 3.2, where expanding an empty array with `set -u`
  # can throw "unbound variable". Use explicit branches instead.
  if (( N > 0 )); then
    python macula_pipeline.py prepare \
      --source-db data/macula_source.sqlite \
      --english "translations/common/$tr.tsv" \
      --out "$P" --learn --max-verses "$N"
  else
    python macula_pipeline.py prepare \
      --source-db data/macula_source.sqlite \
      --english "translations/common/$tr.tsv" \
      --out "$P" --learn
  fi
  PREPS+=(--version "${tr}=${P}")
done
SUFFIX=''
if (( N > 0 )); then SUFFIX="_sample${N}"; fi
echo '=== 5 / 5: Score literalness, readability, and proxy balance ==='
python bible_eval.py score --reference "$REF" "${PREPS[@]}" \
  --outdir "results/macula${SUFFIX}"
echo
printf 'Open results: '
echo "open results/macula${SUFFIX}/scores.csv"
cat > "results/macula${SUFFIX}/run_notes.txt" <<'NOTES'
Generated with MACULA Hebrew (WLC), MACULA Greek (Nestle1904), spaCy English and Brown Corpus.
The source syntax was projected from constituency trees with heuristic head rules.
Alignments are automatically proposed using MACULA glosses and learned lexical mappings.
This does NOT reproduce GBI's original parsing, proprietary alignment or final-score formula.
Numbers are exploratory; inspect coverage columns before interpreting any rankings.
See README.md for attribution, verse numbering, textual traditions, and methodological cautions.
NOTES
echo 'WARNING: Scores are independent proxies; the original GBI final-score algorithm is unpublished.'
