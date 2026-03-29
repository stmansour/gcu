# Puzzle Forest — image generation.
# Uses shared tools from core/imgen but PYTHONPATH includes "." first
# so the local style_library.py (with pf_* styles) takes precedence.
#
# See core/imgen/Makefile.template for full documentation.

REPO_ROOT  := $(shell git rev-parse --show-toplevel)
IMGEN_DIR  := $(REPO_ROOT)/core/imgen
DIST       := $(REPO_ROOT)/dist
PYTHON     := python3
PYTHONPATH := .:$(IMGEN_DIR)
THISDIR    := games/puzzle-forest/assets/images

export PYTHONPATH

.PHONY: all clean package generate validate prompts help

## all: Nothing to build (images are generated on demand with make generate)
all:
	@echo "*** $(THISDIR): build done ***"

## clean: Images are never auto-cleaned — they take hours to regenerate
clean:
	@echo "*** $(THISDIR): nothing to clean (images are preserved) ***"

## package: Copy all PNGs and SVGs to dist
package:
	mkdir -p $(DIST)/$(THISDIR)
	cp *.png $(DIST)/$(THISDIR)/
	cp *.svg $(DIST)/$(THISDIR)/
	@echo "*** $(THISDIR): completed package ***"

## generate: Generate all missing images from .prompt.txt files
generate:
ifdef FILE
	$(PYTHON) $(IMGEN_DIR)/generate_asset.py "$(FILE)"
else
	$(PYTHON) $(IMGEN_DIR)/batch_generate.py
endif

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

## prompts: Print the exact text that will be sent to ComfyUI (no generation)
prompts:
ifdef FILE
	$(PYTHON) $(IMGEN_DIR)/preview_prompts.py "$(FILE)"
else
	$(PYTHON) $(IMGEN_DIR)/preview_prompts.py
endif

## help: Show available targets
help:
	@echo ""
	@echo "  make generate            — generate all missing images"
	@echo "  make generate FILE=x     — generate one prompt file"
	@echo "  make validate            — validate all prompt files"
	@echo "  make prompts             — preview prompts without generating"
	@echo "  make prompts FILE=x      — preview one prompt file"
	@echo ""
	@echo "  ComfyUI must be running at http://127.0.0.1:8188"
	@echo "  Activate venv first:"
	@echo "    source ~/Documents/src/ai/ComfyUI/venv/bin/activate"
	@echo ""
