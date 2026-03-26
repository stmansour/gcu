"""
preview_prompts.py — Print the exact prompt that would be sent to ComfyUI
for each .prompt.txt file in the current directory.

Usage:
  python3 preview_prompts.py              — preview all *.prompt.txt
  python3 preview_prompts.py foo.prompt.txt  — preview one file
"""

import glob
import sys
from pathlib import Path

# Allow running from an asset directory (core/imgen is in PYTHONPATH via Makefile)
from generate_asset import parse_prompt_file


def preview(path: str) -> None:
    data = parse_prompt_file(path)
    width = 80
    print()
    print("=" * width)
    print(f"  FILE:   {path}")
    print(f"  OUTPUT: {data['final_target']}  ({data['width']}×{data['height']})")
    print(f"  STYLE:  {data['style_name'] or '(default)'}")
    print(f"  BG:     {data['background_mode']}")
    print("=" * width)
    print()
    # Break the pipe-separated sections onto separate lines for readability
    for part in data["prompt"].split(" | "):
        print(f"  {part}")
        print()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    else:
        files = sorted(glob.glob("*.prompt.txt"))

    if not files:
        print("No .prompt.txt files found in current directory.")
        sys.exit(0)

    for f in files:
        if not Path(f).exists():
            print(f"❌ File not found: {f}")
            continue
        try:
            preview(f)
        except Exception as e:
            print(f"❌ {f}: {e}")
