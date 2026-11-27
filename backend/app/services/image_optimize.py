"""Image optimisation for the media library.

Why: administrators upload camera and design exports (PNG files of 2 to 4 MB, often 4000 px wide) and the website shows them at a few hundred pixels. One home page carried 45 MB of
pictures. Every large PNG / JPEG is now stored as a WebP no wider than MAX_EDGE (quality 85: visually the same at the sizes the website shows it, a fraction of the bytes). Transparency is kept.
Small files, animated images and anything that would not get smaller are left exactly as they are. The originals of already-uploaded pictures are NOT deleted: `optimize_library`
keeps each as a private "previous-..." library item (the same safety the Replace button has), so nothing is lost.
"""

from __future__ import annotations

import logging
from pathlib import Path

log = logging.getLogger("app.media")

MAX_EDGE = 2000  # px: wider than any layout the website draws (full-bleed heroes at 1920 px)
QUALITY = 85
MIN_BYTES = 200 * 1024  # smaller files are not worth converting
MIN_SAVING = 0.15  # keep the original unless the result is at least 15% smaller


def optimize_file(src: Path, ctype: str, dest: Path) -> bool:
    """Write an optimised WebP of `src` to `dest`. Returns False (and writes nothing) when the file should stay as it is."""
    if ctype not in ("image/png", "image/jpeg") or src.stat().st_size < MIN_BYTES:
        return False
    try:
        from PIL import Image, ImageOps
    except ImportError:  # Pillow is not installed: uploads simply stay as they are
        log.warning("Pillow is not installed: images are stored without optimisation.")
        return False
    try:
        with Image.open(src) as im:
            if getattr(im, "is_animated", False):
                return False
            im = ImageOps.exif_transpose(im)  # a phone photo keeps its orientation
            if max(im.size) > MAX_EDGE:
                scale = MAX_EDGE / max(im.size)
                im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGBA" if "transparency" in im.info or im.mode in ("LA", "PA", "P") else "RGB")
            im.save(dest, "WEBP", quality=QUALITY, method=6)
    except Exception as exc:  # noqa: BLE001 - a file that cannot be read is stored untouched
        log.warning("Could not optimise an image (%s): stored as uploaded.", exc)
        dest.unlink(missing_ok=True)
        return False
    if dest.stat().st_size > src.stat().st_size * (1 - MIN_SAVING):
        dest.unlink(missing_ok=True)
        return False
    return True
