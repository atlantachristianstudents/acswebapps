#!/usr/bin/env bash
# Run RCV/KJV/NIV/ASV, optionally including authorized ESV/NASB imports.
set -euo pipefail
cd "$(dirname "$0")"
N=0
VERSIONS=(RCV KJV NIV ASV)
while (( $# )); do
  case "$1" in
    --sample) N="$2"; shift 2;;
    --versions) shift; VERSIONS=(); while (( $# )) && [[ "$1" != --* ]]; do VERSIONS+=("$1"); shift; done;;
    *) echo "Unknown option: $1" >&2; exit 2;;
  esac
done
if [[ -f .venv/bin/activate ]]; then source .venv/bin/activate; fi
[[ -s data/macula_source.sqlite ]] || { echo 'MACULA source database not found. First run: bash run_full_study.sh --sample 100' >&2; exit 2; }
[[ -s cache/brown.json.gz ]] || { echo 'Brown reference missing. First run: bash run_full_study.sh --sample 100' >&2; exit 2; }
OUT="translations/comparison/$(IFS=_; echo "${VERSIONS[*]}")"
python translation_manager.py common --versions "${VERSIONS[@]}" --outdir "$OUT"
SUFFIX=""
if (( N > 0 )); then SUFFIX="_sample${N}"; fi
PREPS=()
for VERSION in "${VERSIONS[@]}"; do
  echo "Preparing $VERSION (sample=${N})"
  PREP="prepared/${VERSION}_extended${SUFFIX}.jsonl"
  if (( N > 0 )); then
    python macula_pipeline.py prepare --source-db data/macula_source.sqlite --english "$OUT/${VERSION}.tsv" --out "$PREP" --learn --max-verses "$N"
  else
    python macula_pipeline.py prepare --source-db data/macula_source.sqlite --english "$OUT/${VERSION}.tsv" --out "$PREP" --learn
  fi
  PREPS+=(--version "${VERSION}=${PREP}")
done
RESULT="results/extended${SUFFIX}"
python bible_eval.py score --reference cache/brown.json.gz "${PREPS[@]}" --outdir "$RESULT"
echo "Results: $RESULT/scores.csv"
echo 'WARNING: experimental reconstructed metrics, NOT Dr. Wu exact algorithm.'
