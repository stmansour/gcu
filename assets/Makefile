REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
DIRS      := art-studio audio characters components fonts images
THISDIR   := assets

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
	@set -e; \
	for dir in $(DIRS); do \
		$(MAKE) -C $$dir package; \
	done
	@echo "*** $(THISDIR): completed package ***"
