#!/usr/bin/env python3
"""Draw the TheoShift store icons. No third-party image libraries."""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "assets" / "images"
BLUE = (30, 64, 175, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)


def blank(w, h, color):
    row = bytes(color) * w
    return [bytearray(row) for _ in range(h)]


def blend(dst, x, y, color):
    w = len(dst[0]) // 4
    h = len(dst)
    if not (0 <= x < w and 0 <= y < h):
        return
    i = x * 4
    sr, sg, sb, sa = color
    if sa == 255:
        dst[y][i : i + 4] = bytes(color)
        return
    if sa == 0:
        return
    dr, dg, db, da = dst[y][i : i + 4]
    a = sa / 255
    dst[y][i : i + 4] = bytes(
        (
            int(sr * a + dr * (1 - a)),
            int(sg * a + dg * (1 - a)),
            int(sb * a + db * (1 - a)),
            min(255, sa + da),
        )
    )


def fill_round_rect(img, x0, y0, x1, y1, radius, color):
    r2 = radius * radius
    for y in range(y0, y1):
        for x in range(x0, x1):
            dx = 0
            dy = 0
            if x < x0 + radius and y < y0 + radius:
                dx, dy = x0 + radius - x, y0 + radius - y
            elif x >= x1 - radius and y < y0 + radius:
                dx, dy = x - (x1 - radius - 1), y0 + radius - y
            elif x < x0 + radius and y >= y1 - radius:
                dx, dy = x0 + radius - x, y - (y1 - radius - 1)
            elif x >= x1 - radius and y >= y1 - radius:
                dx, dy = x - (x1 - radius - 1), y - (y1 - radius - 1)
            if dx * dx + dy * dy <= r2:
                blend(img, x, y, color)


def schedule(img, size, card, ink):
    # Keep the mark inside the adaptive-icon safe zone.
    margin = int(size * 0.28)
    radius = int(size * 0.08)
    fill_round_rect(img, margin, margin, size - margin, size - margin, radius, card)
    bar_h = int(size * 0.045)
    gap = int(size * 0.04)
    inset = int(size * 0.08)
    left = margin + inset
    right = size - margin - inset
    top = margin + int(size * 0.12)
    for index in range(3):
        y = top + index * (bar_h + gap)
        fill_round_rect(img, left, y, right, y + bar_h, bar_h // 2, ink)


def png(img, color_type, width):
    h = len(img)
    w = width

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + bytes(row) for row in img)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, color_type, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def to_rgb(img, background):
    w = len(img[0]) // 4
    rows = []
    for row in img:
        out = bytearray()
        for x in range(w):
            r, g, b, a = row[x * 4 : x * 4 + 4]
            if a == 255:
                out.extend((r, g, b))
            else:
                t = a / 255
                out.extend(
                    (
                        int(r * t + background[0] * (1 - t)),
                        int(g * t + background[1] * (1 - t)),
                        int(b * t + background[2] * (1 - t)),
                    )
                )
        rows.append(out)
    return rows


def save(path, img, opaque=False):
    width = len(img[0]) // 4
    if opaque:
        data = png(to_rgb(img, BLUE), 2, width)
    else:
        data = png(img, 6, width)
    path.write_bytes(data)


def main():
    size = 1024
    icon = blank(size, size, BLUE)
    schedule(icon, size, WHITE, BLUE)
    save(OUT / "icon.png", icon, opaque=True)

    splash = blank(size, size, CLEAR)
    schedule(splash, size, WHITE, BLUE)
    save(OUT / "splash-icon.png", splash)

    foreground = blank(size, size, CLEAR)
    schedule(foreground, size, WHITE, BLUE)
    save(OUT / "android-icon-foreground.png", foreground)

    background = blank(size, size, BLUE)
    save(OUT / "android-icon-background.png", background)

    mono = blank(size, size, CLEAR)
    schedule(mono, size, WHITE, WHITE)
    save(OUT / "android-icon-monochrome.png", mono)

    fav = blank(48, 48, BLUE)
    schedule(fav, 48, WHITE, BLUE)
    save(OUT / "favicon.png", fav, opaque=True)


if __name__ == "__main__":
    main()
