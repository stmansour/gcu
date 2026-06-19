REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist/gcu
THISDIR   := games/arcade/assets

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/arcade/assets
	cp *.png $(DIST)/games/arcade/assets/
	@echo "*** $(THISDIR): completed package ***"
