# ─────────────────────────────────────────────────────────────────────────────
# assets/images/hub — AI-generated hub background images
#
# One PNG per .prompt.txt file.
# Requires ComfyUI running at http://127.0.0.1:8188.
# Activate the ComfyUI venv before running make generate:
#   source ~/Documents/src/ai/ComfyUI/venv/bin/activate
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := assets/images/hub

.PHONY: all clean package generate

## all: Generate any missing hub images
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

## package: Copy all PNGs to dist
package:
	@if ls *.png >/dev/null 2>&1; then \
		mkdir -p $(DIST)/assets/images/hub; \
		cp *.png $(DIST)/assets/images/hub/; \
		echo "*** $(THISDIR): completed package ***"; \
	else \
		echo "*** $(THISDIR): no images to package (run make generate first) ***"; \
	fi
