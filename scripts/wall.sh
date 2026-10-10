#!/usr/bin/env bash
# Extracts stills from every reel in "../ak portfolio/" (next to the repo folder) for the hero
# gallery wall and writes public/images/wall/wall.json.
#
#   npm run wall
#
# Needs: ffmpeg, cwebp, jq
# Originals are only ever read, never moved or modified.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AK_DIR="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$(dirname "$AK_DIR")/ak portfolio"
OUT_DIR="$AK_DIR/public/images/wall"

# Seconds into each clip to grab a still from.
TIMES=(0.6 3.2 5.8 8.4)
W=400
H=712

for bin in ffmpeg cwebp jq; do
  command -v "$bin" >/dev/null || { echo "Missing dependency: $bin" >&2; exit 1; }
done
[ -d "$SRC_DIR" ] || { echo "Source folder not found: $SRC_DIR" >&2; exit 1; }
mkdir -p "$OUT_DIR"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

slugify() {
  printf '%s' "$1" | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null \
    | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g'
}

# Stills of reels that aren't in the source folder (e.g. on another machine) are kept.
for SRC in "$SRC_DIR"/*.mp4 "$SRC_DIR"/*.mov; do
  [ -f "$SRC" ] || continue
  f="$(basename "$SRC")"
  slug="$(slugify "${f%.*}")"
  echo "=== $f"
  rm -f "$OUT_DIR/$slug"-[0-9]*.webp
  n=0
  for t in "${TIMES[@]}"; do
    n=$((n + 1))
    ffmpeg -v error -y -ss "$t" -i "$SRC" -frames:v 1 \
      -vf "scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,setsar=1" "$TMP/f.png"
    cwebp -quiet -q 64 "$TMP/f.png" -o "$OUT_DIR/$slug-$n.webp"
  done
done

(cd "$OUT_DIR" && ls -1 *.webp) | jq -R . | jq -s . | tr -d '\r' > "$OUT_DIR/wall.json"
echo "Wrote $(jq length "$OUT_DIR/wall.json") stills to $OUT_DIR"
