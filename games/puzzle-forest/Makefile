# ─────────────────────────────────────────────────────────────────────────────
# games/puzzle-forest/ — Puzzle Forest game
#
# assets/images/ contains AI-generated PNGs (one per .prompt.txt file).
# Requires ComfyUI running at http://127.0.0.1:8188 to generate images.
# Activate the ComfyUI venv before running make:
#   source ~/Documents/src/ai/ComfyUI/venv/bin/activate
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: all clean package

## all: Generate any missing images in assets/images/
all:
	$(MAKE) -C assets/images generate

## clean: Remove all generated PNG files in assets/images/
clean:
	@echo "puzzle-forest: removing generated images..."
	@cd assets/images && for f in *.prompt.txt; do \
		base=$$(basename "$$f" .prompt.txt); \
		rm -f "$$base.png" "$$base-transparent.png"; \
	done
	@echo "puzzle-forest: done"

package:
	@echo "puzzle-forest: package handled by root"
