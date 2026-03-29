# ─────────────────────────────────────────────────────────────────────────────
# games/puzzle-forest/puzzles — JSON data leaf
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := games/puzzle-forest/puzzles

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/puzzle-forest/puzzles
	cp *.json $(DIST)/games/puzzle-forest/puzzles/
	@echo "*** $(THISDIR): completed package ***"
