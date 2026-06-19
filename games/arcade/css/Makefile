REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist/gcu
THISDIR   := games/arcade/css

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/games/arcade/css
	cp *.css $(DIST)/games/arcade/css/
	@echo "*** $(THISDIR): completed package ***"
