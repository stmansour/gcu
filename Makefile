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
	@echo "*** $(THISDIR): optimizing deployment images ***"
	node scripts/optimize-deployment-images.mjs
	cd $(REPO_ROOT)/dist && tar czf gcu.tar.gz gcu/
	@echo "*** $(THISDIR): completed package — dist/gcu.tar.gz ready ***"

release:
	rm -rf /Library/WebServer/Documents/gcu
	cp -R $(DIST) /Library/WebServer/Documents/gcu

relsman:
	rsync -az --delete -e "ssh -i ~/.ssh/id_sman -p 1291" $(DIST)/ sman@stevemansour.com:~/public_html/gcu.new/
	ssh -i ~/.ssh/id_sman -p 1291 sman@stevemansour.com 'rm -rf ~/public_html/gcu.bak && mv ~/public_html/gcu ~/public_html/gcu.bak && mv ~/public_html/gcu.new ~/public_html/gcu && rm -rf ~/public_html/gcu.bak'

help:
	@echo ""
	@echo "  make           — lint and validate all source"
	@echo "  make clean     — remove dist/ entirely (images are never deleted)"
	@echo "  make package   — build dist/gcu/ and create dist/gcu.tar.gz"
	@echo "                   package also optimizes deployment images in dist/gcu/"
	@echo "  make generate  — (in image dirs) regenerate AI images via ComfyUI"
	@echo "  make release   — copy dist/gcu into /Library/WebServer/Documents/gcu"
	@echo "  make relsman   — rsync dist/gcu to stevemansour.com:~/public_html/gcu.new and swap it live"
	@echo ""
