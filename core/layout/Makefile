# ─────────────────────────────────────────────────────────────────────────────
# core/layout — JS + CSS leaf
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := core/layout

.PHONY: all clean package

all:
	npx eslint *.js
	@echo "*** $(THISDIR): build done ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/core/layout
	cp *.js *.css $(DIST)/core/layout/
	@echo "*** $(THISDIR): completed package ***"
