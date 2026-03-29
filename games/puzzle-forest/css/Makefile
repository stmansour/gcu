# ─────────────────────────────────────────────────────────────────────────────
# games/puzzle-forest/css — CSS only
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := games/puzzle-forest/css

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/puzzle-forest/css
	cp *.css $(DIST)/games/puzzle-forest/css/
	@echo "*** $(THISDIR): completed package ***"
