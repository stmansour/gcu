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
IMGEN_DIR := $(REPO_ROOT)/core/imgen
DIST      := $(REPO_ROOT)/dist/gcu
THISDIR   := games/robot-lab/assets/images
PYTHON    := python3

export PYTHONPATH := $(IMGEN_DIR)

PROMPT_FILES := $(sort $(wildcard *.prompt.txt))

.PHONY: all clean package generate validate _generate_stale

## all: Do not auto-generate images during normal source builds
all:
	@echo "*** $(THISDIR): build done (run 'make generate' to create AI images) ***"

## generate: Generate missing or stale images that have a .prompt.txt file
generate:
ifdef FILE
	$(PYTHON) $(IMGEN_DIR)/generate_asset.py "$(FILE)"
else
	@$(MAKE) --no-print-directory _generate_stale
endif

_generate_stale:
	@set -e; \
	for prompt in $(PROMPT_FILES); do \
		target=$$(awk -F': ' '/^TARGET FILE:/ {print $$2; exit}' "$$prompt"); \
		bg_mode=$$(awk -F': ' '/^BACKGROUND_MODE:/ {print $$2; exit}' "$$prompt"); \
		if [ -z "$$target" ]; then \
			echo "skip $$prompt (missing TARGET FILE)"; \
			continue; \
		fi; \
		rebuild=0; \
		final_target="$$target"; \
		case "$$bg_mode" in \
			transparent) final_target="$${target%.png}-transparent.png" ;; \
		esac; \
		if [ ! -f "$$target" ]; then \
			rebuild=1; \
		elif [ "$$prompt" -nt "$$target" ]; then \
			rebuild=1; \
		elif [ "$$bg_mode" = "transparent" ] && { [ ! -f "$$final_target" ] || [ "$$target" -nt "$$final_target" ]; }; then \
			rebuild=1; \
		fi; \
		if [ "$$rebuild" -eq 1 ]; then \
			echo "build $$prompt"; \
			$(PYTHON) $(IMGEN_DIR)/generate_asset.py "$$prompt"; \
		else \
			echo "ok    $$prompt"; \
		fi; \
	done

## validate: Validate prompt files
validate:
ifdef FILE
	$(PYTHON) $(IMGEN_DIR)/validate_prompt.py "$(FILE)"
else
	@for f in *.prompt.txt; do \
		echo "validate $$f"; \
		$(PYTHON) $(IMGEN_DIR)/validate_prompt.py "$$f" || true; \
	done
endif

## clean: Images are never auto-cleaned — they take hours to regenerate
clean:
	@echo "*** $(THISDIR): nothing to clean (images are preserved) ***"

## package: Copy all PNGs (hand-crafted and generated) to dist
package:
	mkdir -p $(DIST)/games/robot-lab/assets/images
	cp *.png $(DIST)/games/robot-lab/assets/images/
	@echo "*** $(THISDIR): completed package ***"
