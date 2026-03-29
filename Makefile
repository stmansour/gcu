# ─────────────────────────────────────────────────────────────────────────────
# Grandpa's Creative Universe — Root Makefile
#
# Targets:
#   make              — build (generate any missing assets in subdirectories)
#   make clean        — remove dist/ and all generated image files
#   make package      — create dist/ ready for web deployment
#   make help         — show this message
#
# Deploying to a website:
#   make package
#   tar czf gcu.tar.gz dist/
#   scp gcu.tar.gz user@yourserver:~/
#   ssh user@yourserver "cd /var/www/html && tar xzf ~/gcu.tar.gz --strip-components=1"
# ─────────────────────────────────────────────────────────────────────────────

DIST    := dist
SUBDIRS := core hub games assets

.PHONY: all clean package help

## all: Generate any missing assets in all subdirectories
all:
	@for d in $(SUBDIRS); do $(MAKE) -C $$d; done

## clean: Remove dist/ and all generated image files
clean:
	rm -rf $(DIST)
	@for d in $(SUBDIRS); do $(MAKE) -C $$d clean; done

## package: Build the web distribution in dist/
package:
	@echo "→ Building distribution in $(DIST)/"
	@rm -rf $(DIST)
	@mkdir -p $(DIST)
	@rsync -a \
		--exclude='node_modules/' \
		--exclude='ios/' \
		--exclude='docs/' \
		--exclude='CharacterSheets/' \
		--exclude='conceptArt/' \
		--exclude='scripts/' \
		--exclude='core/imgen/' \
		--exclude='.claude/' \
		--exclude='dist/' \
		--exclude='*.md' \
		--exclude='CLAUDE.md' \
		--exclude='AGENTS.md' \
		--exclude='package.json' \
		--exclude='package-lock.json' \
		--exclude='capacitor.config.ts' \
		--exclude='.git' \
		--exclude='.gitignore' \
		--exclude='.gitattributes' \
		--exclude='*.prompt.txt' \
		--exclude='*.py' \
		--exclude='Makefile' \
		--exclude='Makefile.template' \
		. $(DIST)/
	@echo "✓ Distribution ready in $(DIST)/"
	@echo "  Files: $$(find $(DIST) -type f | wc -l | tr -d ' ')"

## help: Show available targets
help:
	@echo ""
	@grep -E '^## ' Makefile | sed 's/^## /  make /'
	@echo ""
