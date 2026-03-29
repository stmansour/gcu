# ─────────────────────────────────────────────────────────────────────────────
# games/art-studio/css — CSS only
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := games/art-studio/css

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/art-studio/css
	cp *.css $(DIST)/games/art-studio/css/
	@echo "*** $(THISDIR): completed package ***"
