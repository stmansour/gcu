REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist/gcu
THISDIR   := games/arcade/data

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/arcade/data
	cp *.js $(DIST)/games/arcade/data/
	@echo "*** $(THISDIR): completed package ***"
