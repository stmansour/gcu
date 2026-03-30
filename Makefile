# ─────────────────────────────────────────────────────────────────────────────
# Grandpa's Creative Universe — Root Makefile
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist/gcu
DIRS      := core hub games assets CharacterSheets
THISDIR   := gcu

.PHONY: all clean package help

all:
	@set -e; \
	for dir in $(DIRS); do \
		$(MAKE) -C $$dir; \
	done
	@echo "*** $(THISDIR): completed build ***"

clean:
	rm -rf $(REPO_ROOT)/dist
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
	cd $(REPO_ROOT)/dist && tar czf gcu.tar.gz gcu/
	@echo "*** $(THISDIR): completed package — dist/gcu.tar.gz ready ***"

release:
	scp -i ~/.ssh/id_platosrv dist/gcu.tar.gz sman:~/www/

help:
	@echo ""
	@echo "  make           — lint and validate all source"
	@echo "  make clean     — remove dist/ entirely (images are never deleted)"
	@echo "  make package   — build dist/gcu/ and create dist/gcu.tar.gz"
	@echo "  make generate  — (in image dirs) regenerate AI images via ComfyUI"
	@echo ""
