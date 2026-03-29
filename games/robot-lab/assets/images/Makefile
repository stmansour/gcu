# ─────────────────────────────────────────────────────────────────────────────
# games/robot-lab/assets/images
#
# Some PNGs are AI-generated (one per .prompt.txt file) and are rebuilt via
# ComfyUI.  The swirle-*.png and journal-blank-page.png files are hand-crafted
# and are never cleaned or regenerated.
#
# Requires ComfyUI running at http://127.0.0.1:8188 to generate images.
# Activate the ComfyUI venv before running make generate:
#   source ~/Documents/src/ai/ComfyUI/venv/bin/activate
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := games/robot-lab/assets/images

.PHONY: all clean package generate

## all: Generate any missing AI images
all:
	@echo "*** $(THISDIR): build done ***"

## generate: Generate any missing images that have a .prompt.txt file
generate:
	@for f in *.prompt.txt; do \
		base=$$(basename "$$f" .prompt.txt); \
		if [ ! -f "$$base.png" ]; then \
			echo "$(THISDIR): generating $$base.png ..."; \
			python3 batch_generate.py "$$f"; \
		fi; \
	done

## clean: Images are never auto-cleaned — they take hours to regenerate
clean:
	@echo "*** $(THISDIR): nothing to clean (images are preserved) ***"

## package: Copy all PNGs (hand-crafted and generated) to dist
package:
	mkdir -p $(DIST)/games/robot-lab/assets/images
	cp *.png $(DIST)/games/robot-lab/assets/images/
	@echo "*** $(THISDIR): completed package ***"
