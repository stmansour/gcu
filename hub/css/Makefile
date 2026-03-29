# ─────────────────────────────────────────────────────────────────────────────
# hub/css — CSS only
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := hub/css

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/hub/css
	cp *.css $(DIST)/hub/css/
	@echo "*** $(THISDIR): completed package ***"
