import re
from pathlib import Path

REQUIRED_FIELDS = ["TARGET FILE", "SIZE"]
REQUIRED_BLOCKS = ["PROMPT"]
BACKGROUND_MODES = {"solid", "scene", "transparent"}

from style_library import STYLES


def validate_prompt_file(path, enforce_discipline=False):
    content = Path(path).read_text(encoding="utf-8")

    errors = []

    def has_line(label):
        return re.search(rf"^{re.escape(label)}:\s*.+", content, re.MULTILINE)

    def get_line(label):
        m = re.search(rf"^{re.escape(label)}:\s*(.*?)\s*$", content, re.MULTILINE)
        return m.group(1).strip() if m else ""

    def get_block(label):
        m = re.search(
            rf"^{re.escape(label)}:\s*$\n(.*?)(?=^\s*[A-Z][A-Z_ ]*:\s*$|\Z)",
            content,
            re.MULTILINE | re.DOTALL,
        )
        return m.group(1).strip() if m else ""

    # ---- Required fields ----
    for field in REQUIRED_FIELDS:
        if not has_line(field):
            errors.append(f"Missing required field: {field}")

    # ---- Required blocks ----
    for block in REQUIRED_BLOCKS:
        if not get_block(block):
            errors.append(f"Missing required block: {block}")

    # ---- SIZE format ----
    size_match = re.search(r"^SIZE:\s*(\d+)x(\d+)", content, re.MULTILINE)
    if not size_match:
        errors.append("Invalid SIZE format (expected WIDTHxHEIGHT)")

    # ---- Discipline rules ----
    style_name = get_line("STYLE_NAME")
    background = get_line("BACKGROUND")
    background_mode = get_line("BACKGROUND_MODE")
    prompt = get_block("PROMPT")
    style = get_block("STYLE")
    notes = get_block("NOTES")

    if style_name and style_name not in STYLES:
        errors.append(
            f"Unknown STYLE_NAME '{style_name}' (available: {', '.join(sorted(STYLES))})"
        )

    if background_mode and background_mode not in BACKGROUND_MODES:
        errors.append(
            f"Invalid BACKGROUND_MODE '{background_mode}' "
            f"(expected one of {', '.join(sorted(BACKGROUND_MODES))})"
        )

    if not background_mode and background.strip().lower() == "transparent":
        errors.append(
            "Use BACKGROUND_MODE: transparent instead of BACKGROUND: transparent"
        )

    if background_mode == "scene" and not background:
        errors.append("BACKGROUND_MODE: scene requires a BACKGROUND description")

    if background_mode == "transparent":
        transparent_prompt_phrases = ["transparent background", "no background"]
        for phrase in transparent_prompt_phrases:
            if phrase in prompt.lower():
                errors.append(
                    f"PROMPT should not include '{phrase}' when BACKGROUND_MODE is transparent"
                )

    if enforce_discipline:
        if (
            not style_name
            and style
            and any(word in style.lower() for word in ["basket", "tree", "animal"])
        ):
            errors.append("STYLE contains subject content — should only describe rendering style")

        if prompt and any(word in prompt.lower() for word in ["render", "lighting", "cinematic"]):
            errors.append("PROMPT contains style language — should only describe subject")

        if notes and len(notes.split()) > 40:
            errors.append("NOTES too long — should be short constraints")

    return errors


if __name__ == "__main__":
    import sys

    path = sys.argv[1]
    strict = len(sys.argv) > 2 and sys.argv[2] == "--strict"
    errs = validate_prompt_file(path, enforce_discipline=strict)

    if errs:
        print(f"\n❌ {path} FAILED VALIDATION:\n")
        for e in errs:
            print(" -", e)
        exit(1)
    else:
        print(f"✅ {path} OK")
