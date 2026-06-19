REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist/gcu
DIRS      := assets css data scenes
THISDIR   := games/arcade

.PHONY: all clean package

all:
	@set -e; \
	for dir in $(DIRS); do \
		$(MAKE) -C $$dir; \
	done
	@echo "*** $(THISDIR): completed build ***"

clean:
	@set -e; \
	for dir in $(DIRS); do \
		$(MAKE) -C $$dir clean; \
	done
	@echo "*** $(THISDIR): completed clean ***"

package:
	mkdir -p $(DIST)/games/arcade
	cp index.js $(DIST)/games/arcade/
	@set -e; \
	for dir in $(DIRS); do \
		$(MAKE) -C $$dir package; \
	done
	@echo "*** $(THISDIR): completed package ***"
