# ─────────────────────────────────────────────────────────────────────────────
# games/puzzle-forest/assets/audio/clips — WAV audio leaf
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := games/puzzle-forest/assets/audio/clips

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/puzzle-forest/assets/audio/clips
	cp *.wav $(DIST)/games/puzzle-forest/assets/audio/clips/
	@echo "*** $(THISDIR): completed package ***"
