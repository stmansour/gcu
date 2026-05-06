# ─────────────────────────────────────────────────────────────────────────────
# Grandpa's Creative Universe — Root Makefile
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST_ROOT := $(REPO_ROOT)/dist
DIST      := $(DIST_ROOT)/gcu
DIRS      := core hub games assets CharacterSheets
THISDIR   := gcu

.PHONY: all clean package release relsman serve cutely help

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
	@echo "Distribution directory = $(DIST)"
	rm -rf $(DIST)
	mkdir -p $(DIST)
	cp index.html $(DIST)/
	@set -e; \
	for dir in $(DIRS); do \
		$(MAKE) -C $$dir package; \
	done
	@echo "*** $(THISDIR): optimizing deployment images ***"
	node scripts/optimize-deployment-images.mjs
	rm -f $(DIST_ROOT)/gcu.tar.gz
	cd $(DIST_ROOT) && tar czf gcu.tar.gz gcu/
	@echo "*** $(THISDIR): completed package — dist/gcu.tar.gz ready ***"

release: package
	rm -rf /Library/WebServer/Documents/gcu
	cp -R $(DIST) /Library/WebServer/Documents/gcu
	chown -R "stevemansour:staff" $(DIST_ROOT)

relsman: package
	rsync -az --delete -e "ssh -i ~/.ssh/id_sman -p 1291" $(DIST)/ sman@stevemansour.com:~/public_html/gcu.new/
	ssh -i ~/.ssh/id_sman -p 1291 sman@stevemansour.com 'rm -rf ~/public_html/gcu.bak && mv ~/public_html/gcu ~/public_html/gcu.bak && mv ~/public_html/gcu.new ~/public_html/gcu && rm -rf ~/public_html/gcu.bak'

# Local static server for browser dev — http://localhost:3000 (see package.json "start").
# No Python; run `npm install` once in the repo root if node_modules is missing.
serve:
	cd $(REPO_ROOT) && npm start

comfy:
	@echo ""
	@echo "ComfyUI image server startup:"
	@echo ""
	@echo "  cd ~/Documents/src/ai/ComfyUI"
	@echo "  source venv/bin/activate"
	@echo "  python main.py"
	@echo ""
	@echo "Then open:"
	@echo "  http://127.0.0.1:8188"
	@echo ""
	@echo "Generate GCU images from an asset directory, for example:"
	@echo "  cd games/robot-lab/assets/images"
	@echo "  make generate"
	@echo ""

help:
	@echo ""
	@echo "  make           — lint and validate all source"
	@echo "  make clean     — remove dist/ entirely (images are never deleted)"
	@echo "  make package   — build dist/gcu/ and create dist/gcu.tar.gz"
	@echo "                   package also optimizes deployment images in dist/gcu/"
	@echo "  make generate  — (in image dirs) regenerate AI images via ComfyUI"
	@echo "  make release   — copy dist/gcu into /Library/WebServer/Documents/gcu"
	@echo "  make relsman   — rsync dist/gcu to stevemansour.com:~/public_html/gcu.new and swap it live"
	@echo "  make serve     — local dev: npm start (http-server on port 3000, repo root)"
	@echo "  make comfy     — print the commands to start the local Cutely/ComfyUI image server"
	@echo ""
