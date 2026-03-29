# Puzzle Forest — audio generation.
# Generates WAV clips from manifest .txt files using piper TTS.
#
# Usage:
#   make audio           — generate all missing clips
#   make audio-force     — regenerate ALL clips (even existing ones)
#   make audio-dry       — preview what would be generated, no files written
#   make help            — show this help
#
# Requirements:
#   - piper installed (pip install piper-tts)
#   - Voice model at ~/piper/voices/semaine/en_GB-semaine-medium.onnx
#     (or set PIPER env var to point to your piper binary)

REPO_ROOT := $(shell git rev-parse --show-toplevel)
SCRIPT    := $(REPO_ROOT)/scripts/generate-audio.sh
GAME      := puzzle-forest

.PHONY: audio audio-force audio-dry help

## audio: Generate all missing audio clips
audio:
	$(SCRIPT) $(GAME)

## audio-force: Regenerate ALL audio clips (overwrites existing)
audio-force:
	$(SCRIPT) $(GAME) --force

## audio-dry: Preview what would be generated without writing files
audio-dry:
	$(SCRIPT) $(GAME) --dry-run

## help: Show available targets
help:
	@echo ""
	@echo "  make audio           — generate missing clips"
	@echo "  make audio-force     — regenerate all clips"
	@echo "  make audio-dry       — dry run (preview only)"
	@echo ""
	@echo "  Clips are written to: clips/"
	@echo "  Manifest files:       gameplay-prompts.txt, ui-prompts.txt, ..."
	@echo "  Voice model:          en_GB-semaine-medium"
	@echo ""
	@echo "  To use a custom piper path:"
	@echo "    PIPER=/path/to/piper make audio"
	@echo ""
