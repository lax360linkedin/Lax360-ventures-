"""The image carousel (`python -m app.cli seed-carousel`): its heading and eight TEMPORARY sample pictures, so the section can be previewed on the home page.

The pictures are abstract placeholder artwork generated for this purpose (frontend/public/assets/carousel/sample-*.webp). They are NOT photographs of LAX360, its clients or
its projects, they are marked "sample" (the website shows a small "Sample image" label on them), and they are meant to be replaced: Admin > Image carousel > upload your own
photographs, then "Remove all samples".
"""

from __future__ import annotations

SETTINGS = {"slug": "carousel", "title": "Image carousel settings", "data": {"enabled": True, "eyebrow": "Gallery", "title": "Life at", "title_accent": "LAX360", "lead": "A look at our teams, training and work.", "speed": "normal", "pause_on_hover": True}}

# (slug, title, shape, file)
SAMPLES = [
    ("sample-1", "Sample image 1", "landscape", "sample-1.webp"), ("sample-2", "Sample image 2", "portrait", "sample-2.webp"), ("sample-3", "Sample image 3", "landscape", "sample-3.webp"),
    ("sample-4", "Sample image 4", "portrait", "sample-4.webp"), ("sample-5", "Sample image 5", "landscape", "sample-5.webp"), ("sample-6", "Sample image 6", "portrait", "sample-6.webp"),
    ("sample-7", "Sample image 7", "landscape", "sample-7.webp"), ("sample-8", "Sample image 8", "landscape", "sample-8.webp"),
]


def image_rows() -> list[dict]:
    return [{"slug": slug, "title": title, "sort_order": i * 10, "data": {"image_path": f"/assets/carousel/{file}", "shape": shape, "alt": "Temporary sample artwork, not a LAX360 photograph", "enabled": True, "sample": True}}
            for i, (slug, title, shape, file) in enumerate(SAMPLES, start=1)]
