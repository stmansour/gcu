# ─────────────────────────────────────────────────────────────────────────────
# assets/components — shared component assets (circuit parts, etc.)
# Contains hand-crafted .json, .png, and .js files.
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := assets/components

.PHONY: all clean package

all:
	npx eslint *.js
	@echo "*** $(THISDIR): build done ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/assets/components
	cp *.js *.json *.png $(DIST)/assets/components/
	@echo "*** $(THISDIR): completed package ***"
