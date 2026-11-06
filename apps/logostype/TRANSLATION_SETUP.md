# Adding ASV, ESV, and NASB to the MACULA Bible Evaluation

This add-on extends **Bible Translation Study MACULA v3**. It does not replace the parsing and scoring tools, the Brown Corpus reference, or the MACULA database that you already downloaded on your Mac.

**What is included**
- `translation_manager.py`: public-domain ASV downloader, Bible text converter, verse alignment audit, metadata hashes
- `convert_bible_texts.py`: canonical Bible book ID mapping and TSV output helper
- `run_extended_study.sh`: runs MACULA comparisons on all selected translations
- `run_full_study.sh`: replacement that fixes the `OPT[@]: unbound variable` Bash issue on macOS
- `tests/test_translation_manager.py`: additional tests

## 1. Install add-on in your existing working folder

Extract the ZIP over your existing toolkit folder. The new files need to sit **beside** `bible_eval.py` and `macula_pipeline.py`, not inside a nested folder.

In Terminal:

```bash
cd ~/Downloads/bible_translation_replication
source .venv/bin/activate
```

Use the `unzip -o ... -d ...` command to install an add-on ZIP downloaded into `~/Downloads`:

```bash
unzip -o ~/Downloads/Bible_Translation_ASV_ESV_NASB_Addon.zip -d ~/Downloads/bible_translation_replication
```

## 2. Fetch and convert ASV (1901)

```bash
python translation_manager.py download-asv
```

This downloads the ASV plain text from `https://offlinebible.org/downloads/asv.txt`, a public-domain text sourced from eBible.org, and converts it to the canonical tab-delimited format expected by the evaluation toolkit. Full source is documented by eBible.org: https://ebible.org/find/show.php?id=eng-asv.

Files created on your Mac:

- `data/asv/asv.txt`: downloaded source text
- `translations/full/ASV.tsv`: normalized, verse-by-verse data
- `translations/full/ASV.metadata.json`: edition, provenance, SHA-256 checksum, verse count

For an ASV text file already downloaded from this same source:

```bash
python translation_manager.py download-asv --local ~/Downloads/asv.txt
```

This downloader checks for approximately a complete Bible (at least 30,000 nonempty verses across 66 books). If the upstream site changes its text layout, the program will fail clearly rather than output an unverified dataset.

## 3. Compare ASV, RCV, KJV, and NIV

Your existing MACULA database (`data/macula_source.sqlite`) and Brown reference (`cache/brown.json.gz`) are reused. If they are missing, first use `bash run_full_study.sh --sample 100`.

Quick test:

```bash
bash run_extended_study.sh --sample 100
```

Full-Bible run:

```bash
bash run_extended_study.sh
```

Results:

```bash
open results/extended/scores.csv
open results/extended/literal_vs_readable.png
```

The script automatically creates `translations/comparison/RCV_KJV_NIV_ASV/` containing **identical verse IDs** in four TSV files and `COVERAGE.md` documenting missing references.

## 4. Import ESV and NASB **when you have authorized text**

This toolkit cannot lawfully provide whole-Bible ESV or NASB downloads under their standard online access terms. Please obtain the text in a usable export format with appropriate permission and keep a record of its edition and license.

Permission information:

- ESV / Crossway: https://www.crossway.org/permissions/ and https://api.esv.org/
- NASB / Lockman Foundation: https://www.lockman.org/permission-to-quote-copyright-trademark-information/

Full ESV and NASB imports accept either:

- `.txt` one verse per line: `Genesis 1:1 In the beginning ...`
- `.tsv` with header `verse<TAB>text`, using `GEN.1.1` or `Genesis 1:1`
- `.csv` with `verse,text` columns
- `.json` list of `{ "verse": "GEN.1.1", "text": "..." }` objects or mapping of verse refs to strings

Run, replacing file paths with your own **authorized** downloads:

```bash
python translation_manager.py import \
  --name ESV --edition 2016 --input ~/Downloads/ESV.txt

python translation_manager.py import \
  --name NASB --edition 1995 --input ~/Downloads/NASB.txt
```

`--edition` is a provenance label only; it does not change the source text. Check the edition written on the texts you actually obtained. If you only have selected passages, use `--min-verses 1` to allow them, but do not represent a sample as a whole-Bible comparison.

When both files are imported:

```bash
bash run_extended_study.sh --sample 100 --versions RCV KJV NIV ASV ESV NASB
bash run_extended_study.sh --versions RCV KJV NIV ASV ESV NASB
```

**Do not use these commands until your ESV/NASB TSVs actually exist.** The script will report missing files explicitly.

## Research-quality cautions

1. ASV's source text (1901) and its verse numbering may differ slightly from supplied KJV/RCV/NIV editions. The matching process reports omitted IDs; it does not invent missing verses or resolve Hebrew-English verse-numbering differences.
2. NASB exists in 1977, 1995, and 2020 editions; ESV has undergone revisions. You must specify and record the actual edition. For exact comparison with a historical report, the published report's edition must be identified independently.
3. MACULA's source-text traditions and English versions can differ in readings. The tool computes *exploratory proxies*. Its automatic gloss-based alignment is **not** equivalent to a verified reverse interlinear, so transfer and lexical scores should not be treated as independent measures of translation quality until validated.
4. The original GBI report did not publish its exact algorithms or final-score equation. These results are not direct replications of Dr. Wu's numerical scores.
5. Copyright rules differ by translation and permitted use. Keep ESV/NASB text files local and do not redistribute without permission.

## Troubleshooting

- `ModuleNotFoundError`: activate your `.venv` in the toolkit folder, install `pip install -r requirements.txt`.
- `file missing`: verify ZIP contents were copied beside `bible_eval.py` and the paths used by `import` are correct.
- ASV download times out: download ASV TXT from `https://offlinebible.org/download/`, then run `python translation_manager.py download-asv --local ~/Downloads/asv.txt`.
- `Data has only X verses`: verify you have a **complete** 66-book text file; do not bypass with `--min-verses 1` unless you intentionally need a smaller sample.

## Data provenance

- ASV: https://ebible.org/find/show.php?id=eng-asv (public domain)
- ASV plain text mirror: https://offlinebible.org/download/ (identifies eBible.org as underlying source)
- ESV terms: https://api.esv.org/ (storage cap and API terms)
- NASB permissions: https://www.lockman.org/permission-to-quote-copyright-trademark-information/
