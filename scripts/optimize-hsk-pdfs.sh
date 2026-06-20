#!/usr/bin/env bash
#
# Optimize the scanned HSK study PDFs for fast web viewing.
#
# The books in TaiLieu/ are high-DPI (up to 500 DPI) image scans, 35-280 MB each,
# and are NOT linearized. Served as-is, the pdf.js viewer (and any PDF viewer) has
# to fetch large amounts before showing a page. This script:
#
#   1. Downsamples the page images to a screen-friendly DPI (default 150).
#   2. Re-encodes + de-duplicates images and compresses fonts.
#   3. Linearizes the result (Fast Web View) so a viewer can render page 1 from
#      the first bytes and range-fetch the rest.
#
# It writes optimized COPIES to a parallel output tree; originals are never
# touched. Page counts are verified to match. If an "optimized" file ends up
# larger than its source (e.g. already low-DPI), the original is copied through
# unchanged so output is never worse than input.
#
# Usage:
#   scripts/optimize-hsk-pdfs.sh [SRC_DIR] [OUT_DIR]
#   DPI=120 scripts/optimize-hsk-pdfs.sh         # override target DPI
#
# Defaults: SRC=TaiLieu  OUT=TaiLieu_optimized
#
# Requires: Ghostscript (gs). pdfinfo (poppler-utils) is used for the page-count
# check when available; the check is skipped with a warning if it is missing.

set -euo pipefail

SRC="${1:-TaiLieu}"
OUT="${2:-TaiLieu_optimized}"
DPI="${DPI:-150}"
MONO_DPI="${MONO_DPI:-300}"   # keep bilevel text crisp

command -v gs >/dev/null || { echo "ERROR: Ghostscript (gs) not found." >&2; exit 1; }
[ -d "$SRC" ] || { echo "ERROR: source dir '$SRC' not found." >&2; exit 1; }
HAVE_PDFINFO=0; command -v pdfinfo >/dev/null && HAVE_PDFINFO=1

pages() { [ "$HAVE_PDFINFO" = 1 ] && pdfinfo "$1" 2>/dev/null | awk '/^Pages:/{print $2}'; }
mib()   { awk "BEGIN{printf \"%.1f\", $(stat -c%s "$1")/1048576}"; }

total_in=0; total_out=0; n=0; kept=0
printf '%-52s %10s %10s %8s\n' "FILE" "BEFORE" "AFTER" "SAVED"
printf '%s\n' "------------------------------------------------------------------------------------"

while IFS= read -r -d '' f; do
  rel="${f#"$SRC"/}"
  dst="$OUT/$rel"
  mkdir -p "$(dirname "$dst")"

  # Resume: skip if an up-to-date optimized file already exists.
  if [ -f "$dst" ] && [ "$dst" -nt "$f" ]; then
    echo "skip (exists): $rel"
    continue
  fi

  tmp="$(mktemp --suffix=.pdf)"
  if ! gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.6 \
        -dAutoRotatePages=/None \
        -dDownsampleColorImages=true -dColorImageDownsampleType=/Bicubic \
        -dColorImageResolution="$DPI" -dColorImageDownsampleThreshold=1.0 \
        -dDownsampleGrayImages=true  -dGrayImageDownsampleType=/Bicubic \
        -dGrayImageResolution="$DPI"  -dGrayImageDownsampleThreshold=1.0 \
        -dDownsampleMonoImages=true   -dMonoImageDownsampleType=/Subsample \
        -dMonoImageResolution="$MONO_DPI" -dMonoImageDownsampleThreshold=1.0 \
        -dColorImageFilter=/DCTEncode -dGrayImageFilter=/DCTEncode \
        -dDetectDuplicateImages=true -dCompressFonts=true \
        -dFastWebView=true \
        -dNOPAUSE -dBATCH -dQUIET \
        -sOutputFile="$tmp" "$f" >/dev/null; then
    # ^ gs prints linearization (Fast Web View) object tables to stdout even with
    #   -dQUIET; drop stdout so the log stays readable. Errors go to stderr.
    echo "ERROR: gs failed on '$rel' — copying original through." >&2
    cp -p "$f" "$dst"; rm -f "$tmp"; continue
  fi

  # Verify page count survived.
  if [ "$HAVE_PDFINFO" = 1 ]; then
    pin="$(pages "$f")"; pout="$(pages "$tmp")"
    if [ -n "$pin" ] && [ "$pin" != "$pout" ]; then
      echo "WARN: page count changed for '$rel' ($pin -> $pout) — copying original through." >&2
      cp -p "$f" "$dst"; rm -f "$tmp"; continue
    fi
  fi

  in_b=$(stat -c%s "$f"); out_b=$(stat -c%s "$tmp")
  if [ "$out_b" -ge "$in_b" ]; then
    # No win (already lean) — keep the original so we never inflate.
    cp -p "$f" "$dst"; rm -f "$tmp"; kept=$((kept+1))
    printf '%-52s %10s %10s %8s\n' "${rel:0:52}" "$(mib "$f")" "$(mib "$dst")" "kept"
  else
    mv "$tmp" "$dst"
    saved=$(awk "BEGIN{printf \"%d%%\", (1-$out_b/$in_b)*100}")
    printf '%-52s %10s %10s %8s\n' "${rel:0:52}" "$(mib "$f")" "$(mib "$dst")" "$saved"
  fi

  total_in=$((total_in + in_b)); total_out=$((total_out + $(stat -c%s "$dst"))); n=$((n+1))
done < <(find "$SRC" -type f -iname '*.pdf' -print0 | sort -z)

printf '%s\n' "------------------------------------------------------------------------------------"
awk "BEGIN{printf \"Processed %d file(s), %d kept as-is.\nTotal: %.1f MB -> %.1f MB (%.0f%% smaller)\n\", \
  $n, $kept, $total_in/1048576, $total_out/1048576, (1-$total_out/$total_in)*100}"
echo
echo "Optimized tree: $OUT/"
echo "Review it, then to roll out: replace TaiLieu/ with $OUT/ (local) and rsync to the VM."
