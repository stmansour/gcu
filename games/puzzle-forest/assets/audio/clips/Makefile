# ─────────────────────────────────────────────────────────────────────────────
# games/puzzle-forest/assets/audio/clips — WAV audio leaf
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist/gcu
THISDIR   := games/puzzle-forest/assets/audio/clips

.PHONY: all clean package generate force

all:
	$(MAKE) generate
	@echo "*** $(THISDIR): generated any missing WAV clips ***"

generate:
	$(REPO_ROOT)/scripts/generate-audio.sh puzzle-forest

force:
	$(REPO_ROOT)/scripts/generate-audio.sh puzzle-forest --force

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/puzzle-forest/assets/audio/clips
	cp *.wav $(DIST)/games/puzzle-forest/assets/audio/clips/
	@echo "*** $(THISDIR): completed package ***"
