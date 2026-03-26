# GCU Image Generation Tools

Shared Python tools for generating game assets using a local ComfyUI instance (FLUX model).

## Prerequisites

1. ComfyUI installed and running at `http://127.0.0.1:8188`
2. FLUX models in ComfyUI's model folder:
   - `flux1-schnell.safetensors`
   - `t5xxl_fp16.safetensors`
   - `clip_l.safetensors`
   - `ae.safetensors`
3. Python venv with `requests` and `rembg` installed (the ComfyUI venv works):
   ```bash
   source ~/Documents/src/ai/ComfyUI/venv/bin/activate
   ```

## Using from any asset directory

Every asset directory that needs generated images has a `Makefile`. From that directory:

```bash
# Generate all images whose output files don't yet exist
make generate

# Generate one specific asset
make generate FILE=my-asset.prompt.txt

# Validate all prompt files (checks required fields, style names, etc.)
make validate
```

## Prompt file format

Create a `<name>.prompt.txt` file in your asset directory:

```
TARGET FILE: my-image.png
SIZE: 1024x1024
BACKGROUND_MODE: transparent   # or: solid, scene
BACKGROUND: warm cream kitchen  # only needed for BACKGROUND_MODE: scene

STYLE_NAME: pf_default          # pick from style_library.py

PROMPT:
Describe the main subject here. Focus only on WHAT the object is.
Do not include style or rendering language in the PROMPT block.

NOTES:
Short constraints, max ~40 words. Things like color accuracy,
single object only, no extra items, etc.
```

## Available styles

Defined in `core/imgen/style_library.py`:

| Style name    | Best for |
|---------------|----------|
| `pf_default`  | Most Puzzle Forest assets |
| `pf_prop`     | Objects like baskets, food, tools |
| `pf_character`| Animals and characters |
| `pf_minimal`  | Ultra-clean toddler-friendly assets |
| `rl_scene`    | Robot Lab full-frame scene images |
| `rl_prop`     | Robot Lab components and props |

Each game can also provide a local `style_library.py` to add game-specific styles.
The `PYTHONPATH=".:<IMGEN_DIR>"` in the Makefile ensures local styles take precedence.

## Adding a new asset directory

1. Copy `core/imgen/Makefile.template` to your asset directory as `Makefile`
2. Optionally add a local `style_library.py` with game-specific styles
3. Create `.prompt.txt` files for each asset you want
4. Run `make generate`

## Files in this directory

| File | Purpose |
|------|---------|
| `generate_asset.py` | Generate one image from a `.prompt.txt` file |
| `batch_generate.py` | Generate all missing images in the current directory |
| `validate_prompt.py` | Validate a `.prompt.txt` file (required fields, style name, etc.) |
| `remove_bg.py` | Remove background from a PNG (used by generate_asset.py for transparent mode) |
| `style_library.py` | Shared style definitions for all GCU games |
| `Makefile.template` | Template Makefile — copy to each asset directory |
