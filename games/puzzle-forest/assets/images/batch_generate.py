import glob
import re
import subprocess
from pathlib import Path


def extract_line(content, label):
    m = re.search(rf"^{re.escape(label)}:\s*(.*?)\s*$", content, re.MULTILINE)
    return m.group(1).strip() if m else ""


def extract_target(path):
    content = Path(path).read_text(encoding="utf-8")
    return extract_line(content, "TARGET FILE") or None


def extract_background_mode(path):
    content = Path(path).read_text(encoding="utf-8")
    background_mode = extract_line(content, "BACKGROUND_MODE").lower()
    background = extract_line(content, "BACKGROUND").lower()
    if background_mode:
        return background_mode
    if background == "transparent":
        return "transparent"
    return "solid"


def transparent_output_path(target):
    target_path = Path(target)
    return target_path.with_name(f"{target_path.stem}-transparent{target_path.suffix}")


files = sorted(glob.glob("*.prompt.txt"))

for f in files:
    target = extract_target(f)

    if not target:
        print(f"⚠️ Skipping {f} (no TARGET FILE)")
        continue

    background_mode = extract_background_mode(f)
    expected_output = (
        transparent_output_path(target) if background_mode == "transparent" else Path(target)
    )

    if expected_output.exists():
        print(f"⏭️ Skipping {f} → {expected_output.name} already exists")
        continue

    print(f"🚀 Generating {f}")
    subprocess.run(["python3", "generate_asset.py", f], check=True)
