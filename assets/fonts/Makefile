# ─────────────────────────────────────────────────────────────────────────────
# assets/fonts — self-hosted .woff2 font files
#
# Fonts are not yet committed; add .woff2 files here and update package target.
# See assets/fonts/FONTS.md for the expected font list.
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := assets/fonts

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	@if ls *.woff2 >/dev/null 2>&1; then \
		mkdir -p $(DIST)/assets/fonts; \
		cp *.woff2 $(DIST)/assets/fonts/; \
		echo "*** $(THISDIR): completed package ***"; \
	else \
		echo "*** $(THISDIR): no fonts to package (add .woff2 files) ***"; \
	fi
