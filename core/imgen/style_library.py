# --------------------------------------------------
# GCU (Grandpa's Creative Universe) — Shared Style Library
#
# MASTER STYLE GUIDE
# ------------------
# All GCU images target the visual quality and warmth of
# Pixar and Walt Disney Animation feature films:
#   Toy Story, The Incredibles, Wall-E (Pixar)
#   Frozen, Moana, Encanto (Walt Disney Animation)
#
# Key qualities to achieve in every image:
#   - Rich 3D rendering with subsurface scattering (skin/organic materials glow warmly)
#   - Soft cinematic lighting (no harsh shadows, warm key light, gentle fill)
#   - Appealing rounded forms — nothing is sharp or threatening
#   - Vibrant, saturated colors that feel alive, not flat
#   - Full of personality — even inanimate objects feel friendly
#   - NOT photorealistic — stylized, expressive, animated-film quality
#
# Usage in a .prompt.txt file:
#   STYLE_NAME: gcu_default        ← use this for most new assets
#   STYLE_NAME: gcu_character      ← for characters / creatures
#   STYLE_NAME: gcu_scene          ← for full-frame background scenes
#   STYLE_NAME: gcu_prop           ← for isolated objects
#   STYLE_NAME: gcu_toddler        ← for Andre/Alanna age group (2-4)
#   STYLE_NAME: rl_scene           ← Robot Lab color sensor scenes
#   STYLE_NAME: rl_prop            ← Robot Lab electronic components
#
# Game-specific prefixes (pf_, rl_) kept for backward compatibility.
# Prefer the gcu_* styles for all new work.
# --------------------------------------------------

from typing import Optional

STYLES = {

    # ================================================================
    # GCU MASTER STYLES  (prefix: gcu_)
    # Use these for all new assets across any game.
    # ================================================================

    # 1. DEFAULT — general purpose; characters, objects, scenes
    "gcu_default": (
        "3D animated feature film style, quality of Pixar and Walt Disney Animation "
        "(Toy Story, The Incredibles, Frozen, Moana, Encanto), "
        "rich subsurface scattering, soft warm cinematic lighting, "
        "appealing rounded forms, vibrant harmonious colors, "
        "full of warmth and personality, no photorealism, no harsh shadows"
    ),

    # 2. CHARACTER — people, animals, creatures with personality
    "gcu_character": (
        "3D animated character, Pixar and Disney Animation quality "
        "(Incredibles, Moana, Frozen, Toy Story), "
        "large expressive eyes, appealing rounded proportions, "
        "rich subsurface scattering on skin and fur, warm cinematic key light, "
        "soft fill light, single character centered in frame, "
        "friendly and full of personality, no harsh shadows, no photorealism"
    ),

    # 3. SCENE — full-frame environment / background image
    "gcu_scene": (
        "3D animated feature film environment, Pixar and Disney Animation quality "
        "(Moana, Frozen, Incredibles), lush richly-lit setting, "
        "warm golden-hour or soft interior cinematic lighting, "
        "vibrant saturated colors, inviting and safe atmosphere, "
        "full-frame landscape composition, storytelling depth, no photorealism"
    ),

    # 4. PROP — isolated objects (no background or minimal background)
    "gcu_prop": (
        "3D animated feature film prop, Pixar and Disney quality, "
        "tactile stylized materials with subsurface glow and subtle sheen, "
        "warm soft studio lighting, rich clean colors, "
        "the kind of charming object a hero might pick up in an animated movie, "
        "clean readable silhouette, centered, no background clutter"
    ),

    # 5. TODDLER — ultra-simplified for ages 2–4 (Andre, Alanna)
    "gcu_toddler": (
        "simplified 3D animated style, Disney Junior and Pixar Shorts quality, "
        "bold clean shapes, bright saturated primary colors, "
        "chunky friendly proportions, minimal surface detail, "
        "very soft even lighting, no shadows, extremely readable silhouette, "
        "centered composition, safe and inviting"
    ),

    # ================================================================
    # PUZZLE FOREST styles  (prefix: pf_) — backward compatibility
    # ================================================================

    "pf_default": (
        "3D animated feature film style, styled similar to Pixar and Disney animated films "
        "like Toy Story, Incredibles, Frozen, Moana, richly rendered with subsurface "
        "scattering and soft cinematic lighting, rounded appealing forms, "
        "vibrant but harmonious color palette, warm inviting mood, "
        "clean readable silhouette, centered composition, no photorealism"
    ),

    "pf_prop": (
        "3D animated feature film prop, styled similar to Pixar and Disney animated  "
        "films like Toy Story, and Frozen, and  Moana, tactile stylized materials with "
        "subtle sheen, warm soft studio lighting, rich but clean colors, "
        "no background clutter, centered, simple silhouette, "
        "the kind of object a hero might pick up in an animated movie"
    ),

    "pf_character": (
        "3D animated character, styled similar to Pixar / Disney animation  "
        "films like Toy Story, Incredibles, Frozen, and Moana, large expressive eyes, "
        "appealing rounded proportions, smooth subsurface-scattered skin or fur, "
        "warm cinematic lighting, single character centered in frame, "
        "friendly and full of personality, no harsh shadows"
    ),

    "pf_minimal": (
        "simplified 3D animated style, Disney Junior quality, "
        "bold clean shapes, bright saturated colors, minimal surface detail, "
        "very soft lighting, extremely readable silhouette, "
        "no shadows, toddler-friendly, centered composition"
    ),

    # ================================================================
    # ROBOT LAB styles  (prefix: rl_)
    # ================================================================

    # rl_scene — full-frame color sensor source image (400×300 landscape)
    # Must have strongly saturated, clearly separated hue regions (R/G/B)
    # so that mis-routing channels produces obviously wrong results.
    "rl_scene": (
        "3D animated feature film scene, in the style of Pixar / Disney animated movies "
        "like Toy Story, Incredibles, and Moana, richly lit with warm cinematic lighting, "
        "vibrant saturated colors with clearly separated hue regions "
        "(distinct reds, greens, and blues visible in the same frame), "
        "full-frame landscape composition, lush inviting detail, "
        "no photorealism, no desaturated areas"
    ),

    # rl_prop — isolated robot part or electronic component
    "rl_prop": (
        "3D animated robot / gadget prop, in the style of Pixar / Disney animated movies ",
        "like Incredibles, Toy Story, and Moana, "
        "stylized metallic and plastic materials with appealing sheen, "
        "warm studio lighting, teal and gold accent colors, "
        "clean readable silhouette, centered, no background"
    ),
}

DEFAULT_STYLE = "gcu_default"


def get_style(name: Optional[str]) -> str:
    if not name:
        return STYLES[DEFAULT_STYLE]

    if name not in STYLES:
        raise ValueError(f"Unknown style '{name}'. Available: {list(STYLES.keys())}")

    return STYLES[name]
