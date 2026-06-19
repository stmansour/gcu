REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist/gcu
THISDIR   := games/arcade/scenes

.PHONY: all clean package

all:
	npx eslint *.js
	@echo "*** $(THISDIR): build done ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/arcade/scenes
	cp *.js $(DIST)/games/arcade/scenes/
	@echo "*** $(THISDIR): completed package ***"
