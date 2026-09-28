#!/usr/bin/env bash
# Encodes the reels in "ak portfolio/" into web versions in ak/public/videos/
# and writes ak/public/videos/manifest.json.
#
#   ak/scripts/encode.sh            # encode new/changed clips only
#   FORCE=1 ak/scripts/encode.sh    # re-encode everything
#
# Needs: ffmpeg (libx264, libvpx-vp9), ffprobe, cwebp, jq
# Originals are only ever read, never moved or modified.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AK_DIR="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$(dirname "$AK_DIR")/ak portfolio"
OUT_DIR="$AK_DIR/public/videos"
CONF="$SCRIPT_DIR/clips.conf"
FORCE="${FORCE:-0}"

for bin in ffmpeg ffprobe cwebp jq; do
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
trim() { sed -E 's/^[[:space:]]+|[[:space:]]+$//g' <<< "$1"; }

# Re-encode when forced, missing, or older than the source.
needs() { [ "$FORCE" = "1" ] || [ ! -s "$1" ] || [ "$SRC" -nt "$1" ]; }

# Scale + centre-crop to exact 9:16 (handles non-vertical sources too).
vf916() { echo "scale=$1:$2:force_original_aspect_ratio=increase,crop=$1:$2,setsar=1,format=yuv420p"; }

X264_COMMON=(-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -an -movflags +faststart)
X264_PLAY=(-g 50 -crf 24)

entries=()
listed=()

while IFS= read -r line <&3 || [ -n "$line" ]; do
  line="${line%%#*}"; [ -z "$(trim "$line")" ] && continue
  IFS='|' read -r f_src f_cat f_order f_en f_de <<< "$line"
  f_src="$(trim "$f_src")"; f_cat="$(trim "$f_cat")"; f_order="$(trim "$f_order")"
  f_en="$(trim "$f_en")"; f_de="$(trim "$f_de")"
  case "$f_cat" in atmospheric|product|passion) ;; *) echo "Bad category '$f_cat' for $f_src" >&2; exit 1;; esac

  SRC="$SRC_DIR/$f_src"
  [ -f "$SRC" ] || { echo "Listed but missing: $SRC" >&2; exit 1; }
  listed+=("$f_src")
  slug="$(slugify "${f_src%.*}")"
  base="$OUT_DIR/$slug"
  echo "=== $f_src -> $slug ($f_cat)"

  if needs "$base.play.mp4"; then
    echo "  play 1080x1920 mp4"
    ffmpeg -nostdin -v error -stats -y -i "$SRC" -vf "$(vf916 1080 1920)" "${X264_COMMON[@]}" "${X264_PLAY[@]}" "$base.play.mp4"
  fi
  if needs "$base.play.webm"; then
    echo "  play 1080x1920 webm (VP9; crf 34 on VP9's 0-63 scale ~ x264 crf 24)"
    ffmpeg -nostdin -v error -stats -y -i "$SRC" -vf "$(vf916 1080 1920)" -an \
      -c:v libvpx-vp9 -crf 34 -b:v 0 -g 50 -row-mt 1 -deadline good -cpu-used 2 "$base.play.webm"
  fi
  if needs "$base.mobile.play.mp4"; then
    echo "  play 720x1280 mp4"
    ffmpeg -nostdin -v error -stats -y -i "$SRC" -vf "$(vf916 720 1280)" "${X264_COMMON[@]}" "${X264_PLAY[@]}" "$base.mobile.play.mp4"
  fi
  for p in "poster:1080:1920" "mobile.poster:720:1280"; do
    IFS=: read -r name w h <<< "$p"
    if needs "$base.$name.webp"; then
      echo "  $name (first frame)"
      ffmpeg -nostdin -v error -y -i "$SRC" -frames:v 1 -vf "scale=$w:$h:force_original_aspect_ratio=increase,crop=$w:$h" "$TMP/p.png"
      cwebp -quiet -q 80 "$TMP/p.png" -o "$base.$name.webp"
    fi
  done

  dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$base.play.mp4")"
  entries+=("$(jq -n --arg slug "$slug" --arg src "$f_src" --arg cat "$f_cat" \
      --argjson order "$f_order" --argjson dur "$dur" --arg en "$f_en" --arg de "$f_de" '{
    slug: $slug, source: $src, category: $cat, order: $order,
    duration: ($dur * 1000 | round / 1000),
    title: { en: $en, de: $de },
    files: {
      play: "\($slug).play.mp4", playWebm: "\($slug).play.webm", mobilePlay: "\($slug).mobile.play.mp4",
      poster: "\($slug).poster.webp", mobilePoster: "\($slug).mobile.poster.webp"
    }
  }')")
done 3< "$CONF"

# Report source clips that are not in clips.conf.
for f in "$SRC_DIR"/*; do
  n="$(basename "$f")"
  case "$n" in *.mp4|*.mov|*.m4v|*.webm|*.MP4|*.MOV) ;; *) continue;; esac
  printf '%s\n' "${listed[@]}" | grep -qxF "$n" || echo "--- skipped (not in clips.conf): $n"
done

printf '%s\n' "${entries[@]}" | jq -s 'sort_by(.order)' > "$OUT_DIR/manifest.json"
echo "=== manifest.json written ($(jq length "$OUT_DIR/manifest.json") clips)"
ls -la "$OUT_DIR"
