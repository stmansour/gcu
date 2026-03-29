# ─────────────────────────────────────────────────────────────────────────────
# assets/images/portals — AI-generated portal images + hand-crafted SVGs
#
# PNGs are AI-generated (one per .prompt.txt file).
# SVG files are hand-crafted and are never cleaned.
#
# Requires ComfyUI running at http://127.0.0.1:8188.
# Activate the ComfyUI venv before running make generate:
#   source ~/Documents/src/ai/ComfyUI/venv/bin/activate
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := assets/images/portals

.PHONY: all clean package generate

## all: Generate any missing portal images
all:
	@echo "*** $(THISDIR): build done ***"

## generate: Generate any missing images that have a .prompt.txt file
generate:
	@for f in *.prompt.txt; do \
		base=$$(basename "$$f" .prompt.txt); \
		if [ ! -f "$$base.png" ]; then \
			echo "$(THISDIR): generating $$base.png ..."; \
			python3 $(REPO_ROOT)/core/imgen/batch_generate.py "$$f"; \
		fi; \
	done

## clean: Images are never auto-cleaned — they take hours to regenerate
clean:
	@echo "*** $(THISDIR): nothing to clean (images are preserved) ***"

## package: Copy all PNGs and SVGs to dist
package:
	mkdir -p $(DIST)/assets/images/portals
	@if ls *.png >/dev/null 2>&1; then cp *.png $(DIST)/assets/images/portals/; fi
	@if ls *.svg >/dev/null 2>&1; then cp *.svg $(DIST)/assets/images/portals/; fi
	@echo "*** $(THISDIR): completed package ***"
