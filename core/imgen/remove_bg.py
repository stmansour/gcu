from pathlib import Path

from rembg import remove


def remove_background(input_path: str, output_path: str) -> None:
    input_bytes = Path(input_path).read_bytes()
    output_bytes = remove(input_bytes)
    Path(output_path).write_bytes(output_bytes)
