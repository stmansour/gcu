REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := core/audio

.PHONY: all clean package

all:
	npx eslint *.js
	@echo "*** $(THISDIR): build done ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/core/audio
	cp *.js $(DIST)/core/audio/
	@echo "*** $(THISDIR): completed package ***"
