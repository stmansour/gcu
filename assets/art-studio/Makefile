# ─────────────────────────────────────────────────────────────────────────────
# assets/art-studio — shared SVG assets
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := assets/art-studio

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/assets/art-studio
	cp *.svg $(DIST)/assets/art-studio/
	@echo "*** $(THISDIR): completed package ***"
