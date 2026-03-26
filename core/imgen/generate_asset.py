import random
import re
import sys
import time
from pathlib import Path

import requests
from style_library import get_style
from validate_prompt import validate_prompt_file

# ----------------------------------------------------
# USAGE:
#   python generate_asset.py my-prompt.txt
# ----------------------------------------------------

COMFY_URL = "http://127.0.0.1:8188"
BACKGROUND_MODES = {"solid", "scene", "transparent"}


def resolve_background_mode(background: str, background_mode: str) -> str:
    if background_mode:
        if background_mode not in BACKGROUND_MODES:
            raise ValueError(
                f"Invalid BACKGROUND_MODE: {background_mode!r}. "
                f"Expected one of {sorted(BACKGROUND_MODES)}"
            )
        return background_mode

    normalized_background = background.strip().lower()
    if normalized_background == "transparent":
        return "transparent"
    if "full image" in normalized_background or "no transparency" in normalized_background:
        return "scene"
    return "solid"


def transparent_output_path(target: str) -> str:
    target_path = Path(target)
    return str(target_path.with_name(f"{target_path.stem}-transparent{target_path.suffix}"))


def parse_prompt_file(path: str) -> dict:
    content = Path(path).read_text(encoding="utf-8")

    def extract_line(label: str) -> str:
        m = re.search(rf"^{re.escape(label)}:\s*(.*?)\s*$", content, re.MULTILINE)
        return m.group(1).strip() if m else ""

    def extract_block(label: str) -> str:
        m = re.search(
            rf"^{re.escape(label)}:\s*$\n(.*?)(?=^\s*[A-Z][A-Z ]*:\s*$|\Z)",
            content,
            re.MULTILINE | re.DOTALL,
        )
        return m.group(1).strip() if m else ""

    target = extract_line("TARGET FILE")
    size = extract_line("SIZE")
    background = extract_line("BACKGROUND")
    background_mode = extract_line("BACKGROUND_MODE")
    style_name = extract_line("STYLE_NAME")

    prompt = extract_block("PROMPT")
    style = extract_block("STYLE")
    notes = extract_block("NOTES")

    if not target:
        raise ValueError("Missing required field: TARGET FILE")
    if not size:
        raise ValueError("Missing required field: SIZE")
    if not prompt:
        raise ValueError("Missing required block: PROMPT")

    try:
        width_str, height_str = size.lower().split("x")
        width = int(width_str.strip())
        height = int(height_str.strip())
    except Exception as exc:
        raise ValueError(f"Invalid SIZE format: {size!r}. Expected like 1024x1024") from exc

    width, height = normalize_size(width, height)
    resolved_background_mode = resolve_background_mode(background, background_mode)
    resolved_style = get_style(style_name) if style_name else (style or get_style(None))

    full_prompt = build_flux_prompt(
        prompt=prompt,
        style=resolved_style,
        notes=notes,
        background=background,
        background_mode=resolved_background_mode,
    )

    return {
        "target": target,
        "render_target": target,
        "final_target": transparent_output_path(target)
        if resolved_background_mode == "transparent"
        else target,
        "width": width,
        "height": height,
        "background": background,
        "background_mode": resolved_background_mode,
        "prompt": full_prompt,
        "source_prompt": prompt,
        "style_name": style_name,
        "style": resolved_style,
        "notes": notes,
    }


def build_flux_prompt(
    prompt: str,
    style: str,
    notes: str,
    background: str,
    background_mode: str,
) -> str:
    parts: list[str] = []

    # Constraints depend on whether this is an isolated prop/character or a full scene.
    if background_mode == "scene":
        # Full-frame environment — no isolation constraints, they fight against scene composition.
        constraint_parts = [
            "no text",
            "no UI elements",
            "no watermarks",
        ]
    else:
        # Isolated prop or character — enforce clean single-object composition.
        constraint_parts = [
            "single object",
            "centered composition",
            "no duplicates",
            "no extra objects",
            "no clutter",
        ]

    if prompt:
        parts.append(f"MAIN SUBJECT: {prompt}")

    if style:
        parts.append(f"STYLE: {style}")

    if notes:
        parts.append(f"DETAILS: {notes}")

    if background_mode == "transparent":
        parts.append(
            "BACKGROUND: pure white background, isolated object, no shadows, "
            "no gradients, no reflections, clean edges, sharp edges"
        )
        constraint_parts.append("no cast shadow")
        constraint_parts.append("no ambient shadow")
    elif background:
        parts.append(f"BACKGROUND: {background}")

    parts.append(f"CONSTRAINTS: {', '.join(constraint_parts)}")

    return " | ".join(parts)


def normalize_size(width: int, height: int) -> tuple[int, int]:
    # FLUX behaves better on multiples of 64.
    w = max(512, (width // 64) * 64)
    h = max(512, (height // 64) * 64)
    return w, h


def build_workflow(prompt: str, width: int, height: int) -> dict:
    seed = random.randint(0, 2**32 - 1)

    return {
        "1": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": "flux1-schnell.safetensors",
                "weight_dtype": "default",
            },
        },
        "2": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": "t5xxl_fp16.safetensors",
                "clip_name2": "clip_l.safetensors",
                "type": "flux",
                "device": "default",
            },
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": prompt,
                "clip": ["2", 0],
            },
        },
        "4": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": "blurry, distorted, low quality, multiple objects, duplicate items, clutter, complex background, shadows, reflections",
                "clip": ["2", 0],
            },
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": 1,
            },
        },
        "6": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["1", 0],
                "positive": ["3", 0],
                "negative": ["4", 0],
                "latent_image": ["5", 0],
                "seed": seed,
                "steps": 4,
                "cfg": 1.0,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1.0,
            },
        },
        "7": {
            "class_type": "VAELoader",
            "inputs": {
                "vae_name": "ae.safetensors",
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["6", 0],
                "vae": ["7", 0],
            },
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["8", 0],
                "filename_prefix": "tmp",
            },
        },
    }


def queue_prompt(workflow: dict) -> str:
    payload = {
        "prompt": workflow,
        "client_id": f"asset-{int(time.time() * 1000)}",
    }
    r = requests.post(f"{COMFY_URL}/prompt", json=payload, timeout=60)
    r.raise_for_status()
    return r.json()["prompt_id"]


def wait_for_completion(prompt_id: str, poll_seconds: float = 1.0) -> dict:
    while True:
        r = requests.get(f"{COMFY_URL}/history/{prompt_id}", timeout=60)
        r.raise_for_status()
        data = r.json()

        if prompt_id in data:
            return data[prompt_id]

        time.sleep(poll_seconds)


def save_output(history: dict, output_path: str) -> None:
    outputs = history.get("outputs", {})

    for node_output in outputs.values():
        images = node_output.get("images")
        if not images:
            continue

        image_data = images[0]
        filename = image_data["filename"]
        subfolder = image_data["subfolder"]

        image_url = (
            f"{COMFY_URL}/view?filename={filename}&subfolder={subfolder}&type=output"
        )
        img_bytes = requests.get(image_url, timeout=60).content

        Path(output_path).write_bytes(img_bytes)
        return

    raise RuntimeError("No image output found — generation failed")


def remove_background_if_needed(render_path: str, final_path: str, background_mode: str) -> None:
    if background_mode != "transparent":
        return

    from remove_bg import remove_background

    remove_background(render_path, final_path)


def generate(prompt_file: str) -> None:
    errors = validate_prompt_file(prompt_file)
    if errors:
        raise RuntimeError(f"Prompt validation failed: {errors}")

    data = parse_prompt_file(prompt_file)

    print("---- PROMPT ----")
    print(data["prompt"])
    print("----------------")

    workflow = build_workflow(
        prompt=data["prompt"],
        width=data["width"],
        height=data["height"],
    )

    prompt_id = queue_prompt(workflow)
    history = wait_for_completion(prompt_id)
    save_output(history, data["render_target"])
    remove_background_if_needed(
        data["render_target"],
        data["final_target"],
        data["background_mode"],
    )

    if data["background_mode"] == "transparent":
        print(f"Generated render: {data['render_target']}")
        print(f"Generated alpha: {data['final_target']}")
    else:
        print(f"Generated: {data['final_target']}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python generate_asset.py my-prompt.txt")
    generate(sys.argv[1])
