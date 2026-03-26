Puzzle Forest image generation sources live here.

Use [portal-puzzle-forest.png](/Users/stevemansour/Documents/src/html/gcu/assets/images/portals/portal-puzzle-forest.png) as the style bar:

- warm cinematic storybook lighting
- premium animated-feature look
- gentle, inviting forest mood
- large readable shapes for iPad
- no text, no UI, no scary expressions
- whimsical, magical-forest realism rather than flat clip-art
- soft golden glows, mossy texture, painterly depth, expressive faces

Prompt file conventions:

- Each `.prompt.txt` file describes one image.
- Keep generated files as `.png`.
- Use `BACKGROUND_MODE: transparent` for cutout assets that need alpha.
- Use `BACKGROUND_MODE: scene` for full card/scene artwork.
- Omit `BACKGROUND_MODE` or use `solid` for normal non-scene renders.
- Prefer transparent background for characters, props, baskets, and shape pieces.
- Prefer portrait or square framing unless the prompt says otherwise.
- For build-animal art, keep the full character centered and cleanly silhouetted so it can be sliced into thirds later.
- Avoid emoji energy, sticker energy, or generic preschool clip-art.
- Every asset should feel like it belongs to the same enchanted forest world as the portal image.

Transparent asset notes:

- FLUX does not create true alpha directly.
- Transparent assets are generated on pure white, then post-processed with `rembg`.
- The pipeline saves both the original render (`name.png`) and the alpha result (`name-transparent.png`).

Suggested next pass after generation:

1. Save the generated `.png` files next to these prompts.
2. Update `games/puzzle-forest/puzzles/puzzles.json` to swap emoji/SVG placeholders to the new PNG assets.
3. Keep SVG fallbacks around until each replacement is verified on device.
