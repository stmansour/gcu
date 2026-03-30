# ─────────────────────────────────────────────────────────────────────────────
# CharacterSheets — kid avatar images and 360° rotation videos
#
# Only the specific files referenced in core/avatar/avatarManifest.js are
# packaged.  The full CharacterSheets tree (90MB) stays in the repo for
# editing but only the referenced assets go into dist.
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT := $(shell git rev-parse --show-toplevel)
DIST      := $(REPO_ROOT)/dist/gcu
THISDIR   := CharacterSheets

# Files referenced by AVATAR_IMAGES / AVATAR_BADGE_IMAGES in avatarManifest.js
AVATAR_IMAGES := \
	Leon/avatars/carousel/Leon-avatar-000.png \
	Andre/avatars/carousel/Andre\ -\ 000\ deg.png \
	JR/avatars/jr-neutral.png \
	Kaila/avatars/kaila-neutral.png \
	Alanna/avatars/alanna-neutral.png

# Files referenced by AVATAR_VIDEOS in avatarManifest.js
AVATAR_VIDEOS := \
	Leon/videos/leon-360.mp4 \
	Andre/videos/andre-rotation.mp4 \
	JR/videos/JR_Video_Ready_Angles_Questioned.mp4

.PHONY: all clean package

all:
	@echo "*** $(THISDIR): nothing to build ***"

clean:
	@echo "*** $(THISDIR): nothing to clean ***"

package:
	mkdir -p $(DIST)/CharacterSheets/Leon/avatars/carousel
	mkdir -p $(DIST)/CharacterSheets/Andre/avatars/carousel
	mkdir -p $(DIST)/CharacterSheets/JR/avatars
	mkdir -p $(DIST)/CharacterSheets/Kaila/avatars
	mkdir -p $(DIST)/CharacterSheets/Alanna/avatars
	mkdir -p $(DIST)/CharacterSheets/Leon/videos
	mkdir -p $(DIST)/CharacterSheets/Andre/videos
	mkdir -p $(DIST)/CharacterSheets/JR/videos
	cp "Leon/avatars/carousel/Leon-avatar-000.png"              $(DIST)/CharacterSheets/Leon/avatars/carousel/
	cp "Andre/avatars/carousel/Andre - 000 deg.png"             $(DIST)/CharacterSheets/Andre/avatars/carousel/
	cp "JR/avatars/jr-neutral.png"                              $(DIST)/CharacterSheets/JR/avatars/
	cp "Kaila/avatars/kaila-neutral.png"                        $(DIST)/CharacterSheets/Kaila/avatars/
	cp "Alanna/avatars/alanna-neutral.png"                      $(DIST)/CharacterSheets/Alanna/avatars/
	cp "Leon/videos/leon-360.mp4"                               $(DIST)/CharacterSheets/Leon/videos/
	cp "Andre/videos/andre-rotation.mp4"                        $(DIST)/CharacterSheets/Andre/videos/
	cp "JR/videos/JR_Video_Ready_Angles_Questioned.mp4"         $(DIST)/CharacterSheets/JR/videos/
	@echo "*** $(THISDIR): completed package ***"
