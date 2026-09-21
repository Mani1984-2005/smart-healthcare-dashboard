#!/usr/bin/env python3
"""Renders the synthetic demo documents (PNG) from the recorded transcripts and writes manifest.json.

Run only when a transcript changes:   python3 backend/part3/seed/fixtures/generate_fixtures.py
Requires Pillow and DejaVu Sans Mono. The committed PNGs + manifest.json are what the app uses (no Python at runtime).
Every image carries the "SYNTHETIC DEMO" marking; these are not real patient documents.
"""
import hashlib, json, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
W, H, MARGIN, TOP, LINE_H, FONT_SIZE = 1100, 1200, 60, 80, 30, 18

def render(text, blank):
    img = Image.new("RGB", (W, H), (252, 252, 249))
    draw = ImageDraw.Draw(img)
    draw.rectangle([18, 18, W - 19, H - 19], outline=(205, 205, 200), width=2)
    if not blank:
        mark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        mdraw = ImageDraw.Draw(mark)
        big = ImageFont.truetype(FONT_PATH, 96)
        mdraw.text((W // 2 - 420, H // 2 - 60), "SYNTHETIC DEMO", font=big, fill=(190, 190, 190, 70))
        mark = mark.rotate(32, resample=Image.BICUBIC, center=(W // 2, H // 2))
        img = Image.alpha_composite(img.convert("RGBA"), mark).convert("RGB")
        draw = ImageDraw.Draw(img)
        font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
        for i, line in enumerate(text.split("\n")):
            draw.text((MARGIN, TOP + i * LINE_H), line, font=font, fill=(24, 24, 28))
    return img

def main():
    sources = json.load(open(os.path.join(HERE, "fixtures.source.json")))
    manifest = []
    for s in sources:
        text = open(os.path.join(HERE, s["id"] + ".txt"), encoding="utf-8").read()
        img = render(text, s.get("blank", False))
        path = os.path.join(HERE, s["id"] + ".png")
        img.save(path, format="PNG", optimize=False)
        data = open(path, "rb").read()
        manifest.append({
            "id": s["id"], "title": s["title"], "description": s["description"], "docType": s["docType"], "patientId": s["patientId"],
            "imageFile": s["id"] + ".png", "transcriptFile": s["id"] + ".txt", "mimeType": "image/png",
            "sha256": hashlib.sha256(data).hexdigest(), "sizeBytes": len(data), "width": W, "height": H, "synthetic": True,
        })
    json.dump(manifest, open(os.path.join(HERE, "manifest.json"), "w"), indent=2)
    print("wrote", len(manifest), "fixtures")

if __name__ == "__main__":
    main()
