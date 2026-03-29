# ─────────────────────────────────────────────────────────────────────────────
# games/ — All game modules
# Fans out to each game subdirectory.
# ─────────────────────────────────────────────────────────────────────────────

SUBDIRS := art-studio robot-lab puzzle-forest

.PHONY: all clean package

all:
	@for d in $(SUBDIRS); do $(MAKE) -C $$d; done

clean:
	@for d in $(SUBDIRS); do $(MAKE) -C $$d clean; done

package:
	@echo "games: package handled by root"
