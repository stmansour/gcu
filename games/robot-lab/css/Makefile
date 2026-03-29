# ─────────────────────────────────────────────────────────────────────────────
# games/robot-lab/css — CSS only
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := games/robot-lab/css

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/robot-lab/css
	cp *.css $(DIST)/games/robot-lab/css/
	@echo "*** $(THISDIR): completed package ***"
