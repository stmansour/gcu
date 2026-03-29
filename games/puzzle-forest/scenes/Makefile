REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := games/puzzle-forest/scenes

.PHONY: all clean package

all:
	npx eslint *.js
	@echo "*** $(THISDIR): build done ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/puzzle-forest/scenes
	cp *.js $(DIST)/games/puzzle-forest/scenes/
	@echo "*** $(THISDIR): completed package ***"
