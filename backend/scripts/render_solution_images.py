"""Render scripts/_svg/*.svg to frontend/public/assets/solutions/<slug>.webp (1600 wide) and <slug>-800.webp using headless Chrome and Pillow.
Run after build_solutions.py:  python scripts/render_solution_images.py"""
from __future__ import annotations
import subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SVG = HERE / "_svg"
OUT = HERE.parents[1] / "frontend" / "public" / "assets" / "solutions"
CHROME = next((p for p in ("C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe") if Path(p).exists()), None)


def main() -> None:
    if not CHROME:
        sys.exit("Chrome not found")
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.svg"):
        old.unlink()  # the earlier generic drawings
    tmp = Path(tempfile.mkdtemp())
    files = sorted(SVG.glob("*.svg"))
    for f in files:
        png = tmp / (f.stem + ".png")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1.3333", "--window-size=1200,800", f"--screenshot={png}", f.as_uri()], check=True, capture_output=True, timeout=120)
        im = Image.open(png).convert("RGB")
        im = im.crop((0, 0, int(1200 * 1.3333), int(800 * 1.3333))).resize((1600, 1067), Image.LANCZOS)
        im.save(OUT / f"{f.stem}.webp", "WEBP", quality=82, method=6)
        im.resize((800, 533), Image.LANCZOS).save(OUT / f"{f.stem}-800.webp", "WEBP", quality=80, method=6)
    print(len(files), "previews written to", OUT)


if __name__ == "__main__":
    main()
