REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := games/robot-lab/renderer

.PHONY: all clean package

all:
	npx eslint *.js
	@echo "*** $(THISDIR): build done ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/robot-lab/renderer
	cp *.js $(DIST)/games/robot-lab/renderer/
	@echo "*** $(THISDIR): completed package ***"
