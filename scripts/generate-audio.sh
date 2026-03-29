#!/usr/bin/env bash
# =============================================================================
# generate-audio.sh — Generate piper WAV clips for GCU games
#
# Usage:
#   ./scripts/generate-audio.sh puzzle-forest           # one game
#   ./scripts/generate-audio.sh --all                   # all games
#   ./scripts/generate-audio.sh puzzle-forest --dry-run # show plan, no files
#   ./scripts/generate-audio.sh puzzle-forest --force   # regen existing files
#
# Requirements:
#   - piper installed (set PIPER env var, or it's found automatically)
#   - Game has games/{gameId}/assets/audio/audio-config.json
#   - Manifest files listed in config exist
#
# See docs/AudioClips.md for full documentation.
# =============================================================================

set -euo pipefail

# ---- Locate repo root -------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ---- Locate piper binary -----------------------------------------------------
find_piper() {
  # 1. Honour explicit env var
  if [[ -n "${PIPER:-}" ]]; then
    echo "$PIPER"; return 0
  fi
  # 2. Common install locations
  local candidates=(
    "$HOME/Library/Python/3.9/bin/piper"
    "$HOME/Library/Python/3.10/bin/piper"
    "$HOME/Library/Python/3.11/bin/piper"
    "$HOME/.local/bin/piper"
    "/usr/local/bin/piper"
    "/opt/homebrew/bin/piper"
  )
  for p in "${candidates[@]}"; do
    [[ -x "$p" ]] && { echo "$p"; return 0; }
  done
  # 3. PATH
  if command -v piper &>/dev/null; then
    command -v piper; return 0
  fi
  return 1
}

# ---- Parse arguments --------------------------------------------------------
GAME_IDS=()
DRY_RUN=false
FORCE=false
ALL_GAMES=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --force)   FORCE=true ;;
    --all)     ALL_GAMES=true ;;
    --*)       echo "Unknown flag: $arg" >&2; exit 1 ;;
    *)         GAME_IDS+=("$arg") ;;
  esac
done

# If --all, discover games that have an audio-config.json
if $ALL_GAMES; then
  while IFS= read -r cfg; do
    game_dir=$(dirname "$cfg")
    game_id=$(basename "$(dirname "$(dirname "$game_dir")")")
    GAME_IDS+=("$game_id")
  done < <(find games -name "audio-config.json" 2>/dev/null | sort)
fi

if [[ ${#GAME_IDS[@]} -eq 0 ]]; then
  echo "Usage: $0 <game-id> [--dry-run] [--force]"
  echo "       $0 --all [--dry-run] [--force]"
  exit 1
fi

# ---- Find piper (skip for dry-run) ------------------------------------------
PIPER_BIN=""
if ! $DRY_RUN; then
  if ! PIPER_BIN=$(find_piper); then
    echo "ERROR: piper not found. Install it or set the PIPER env var." >&2
    echo "  pip install piper-tts" >&2
    exit 1
  fi
  echo "piper: $PIPER_BIN"
fi

# ---- Process each game ------------------------------------------------------
process_game() {
  local game_id="$1"
  local audio_dir="games/${game_id}/assets/audio"
  local config_file="${audio_dir}/audio-config.json"

  if [[ ! -f "$config_file" ]]; then
    echo "ERROR: Config not found: $config_file" >&2
    return 1
  fi

  # Parse config with python (available on all macOS)
  local voice_model voices_dir clips_dir
  voice_model=$(python3 -c "import json,sys; d=json.load(open('$config_file')); print(d['voiceModel'])")
  voices_dir=$(python3  -c "import json,sys; d=json.load(open('$config_file')); print(d['voicesDir'])")
  clips_dir=$(python3   -c "import json,sys; d=json.load(open('$config_file')); print(d.get('clipsDir','clips'))")

  # Expand ~ in voicesDir
  voices_dir="${voices_dir/#\~/$HOME}"
  local model_path="${voices_dir}/${voice_model}"

  if ! $DRY_RUN && [[ ! -f "$model_path" ]]; then
    echo "ERROR: piper model not found: $model_path" >&2
    return 1
  fi

  local out_dir="${audio_dir}/${clips_dir}"
  mkdir -p "$out_dir"

  # Read manifest list
  local manifests
  mapfile -t manifests < <(python3 -c "
import json, sys
d = json.load(open('$config_file'))
for m in d.get('manifests', []):
    print(m)
")

  local generated=0
  local skipped=0
  local errors=0

  echo ""
  echo "=== $game_id ==="
  echo "    voice model : $model_path"
  echo "    output dir  : $out_dir"
  echo "    manifests   : ${#manifests[@]} files"

  for manifest in "${manifests[@]}"; do
    local manifest_path="${audio_dir}/${manifest}"
    if [[ ! -f "$manifest_path" ]]; then
      echo "  WARN: manifest not found: $manifest_path"
      continue
    fi

    while IFS= read -r line; do
      # Skip blank lines and comments
      [[ -z "$line" || "$line" == \#* ]] && continue

      # Split on first pipe
      local key="${line%%|*}"
      local text="${line#*|}"
      key="${key// /}"  # trim spaces from key

      [[ -z "$key" || -z "$text" ]] && continue

      local out_file="${out_dir}/${key}.wav"

      if [[ -f "$out_file" ]] && ! $FORCE; then
        $DRY_RUN && echo "  SKIP  $key"
        ((skipped++)) || true
        continue
      fi

      if $DRY_RUN; then
        echo "  WOULD GENERATE  $key"
        echo "    text: $text"
        ((generated++)) || true
        continue
      fi

      echo -n "  GEN   $key … "
      if echo "$text" | "$PIPER_BIN" \
          --model "$model_path" \
          --output_file "$out_file" \
          2>/dev/null; then
        echo "OK"
        ((generated++)) || true
      else
        echo "FAILED"
        ((errors++)) || true
      fi

    done < "$manifest_path"
  done

  echo ""
  if $DRY_RUN; then
    echo "  DRY RUN: would generate $generated, would skip $skipped"
  else
    echo "  Done: $generated generated, $skipped skipped, $errors errors"
  fi
}

# ---- Run --------------------------------------------------------------------
for game_id in "${GAME_IDS[@]}"; do
  process_game "$game_id"
done

echo ""
echo "All done."
