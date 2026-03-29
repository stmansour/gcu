REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist
THISDIR   := core/journal

.PHONY: all clean package

all:
	npx eslint *.js
	@echo "*** $(THISDIR): build done ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/core/journal
	cp *.js $(DIST)/core/journal/
	@echo "*** $(THISDIR): completed package ***"
