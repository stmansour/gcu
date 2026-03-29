# ─────────────────────────────────────────────────────────────────────────────
# core/progress — JS + CSS leaf
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := core/progress

.PHONY: all clean package

all:
	npx eslint *.js
	@echo "*** $(THISDIR): build done ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/core/progress
	cp *.js *.css $(DIST)/core/progress/
	@echo "*** $(THISDIR): completed package ***"
