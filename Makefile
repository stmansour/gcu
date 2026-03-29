# ─────────────────────────────────────────────────────────────────────────────
# Grandpa's Creative Universe — Root Makefile
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
DIRS      := core hub games assets
THISDIR   := gcu

.PHONY: all clean package help

all:
	@set -e; \
	for dir in $(DIRS); do \
		$(MAKE) -C $$dir; \
	done
	@echo "*** $(THISDIR): completed build ***"

clean:
	rm -rf $(DIST)
	@set -e; \
	for dir in $(DIRS); do \
		$(MAKE) -C $$dir clean; \
	done
	@echo "*** $(THISDIR): completed clean ***"

package:
	mkdir -p $(DIST)
	cp index.html $(DIST)/
	@set -e; \
	for dir in $(DIRS); do \
		$(MAKE) -C $$dir package; \
	done
	@echo "*** $(THISDIR): completed package ***"

help:
	@echo ""
	@echo "  make           — lint and validate all source"
	@echo "  make clean     — remove dist/ and all generated image files"
	@echo "  make package   — build the web distribution in dist/"
	@echo ""
