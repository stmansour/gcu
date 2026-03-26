# Robot Lab — image generation.
# Uses shared tools from core/imgen.
#
# See core/imgen/Makefile.template for full documentation.

REPO_ROOT  := $(shell git rev-parse --show-toplevel)
IMGEN_DIR  := $(REPO_ROOT)/core/imgen
PYTHON     := python3
PYTHONPATH := .:$(IMGEN_DIR)

export PYTHONPATH

.PHONY: generate validate prompts help

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
