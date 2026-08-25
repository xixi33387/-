import sys
from pathlib import Path

from PIL import Image


src = Path(sys.argv[1])
out = Path(sys.argv[2])
out.parent.mkdir(parents=True, exist_ok=True)

source = Image.open(src)
frames = []
durations = []

for index in range(getattr(source, "n_frames", 1)):
    source.seek(index)
    frame = source.convert("RGBA")
    pixels = frame.load()
    width, height = frame.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]

            if g > 150 and r < 90 and b < 100:
                pixels[x, y] = (r, g, b, 0)
            elif g > 120 and g > r * 1.45 and g > b * 1.35:
                fade = max(0, min(255, int((max(r, b) - 45) * 5)))
                pixels[x, y] = (r, g, b, min(a, fade))

    frames.append(frame)
    durations.append(source.info.get("duration", 90))

frames[0].save(
    out,
    save_all=True,
    append_images=frames[1:],
    duration=durations,
    loop=0,
    disposal=2,
    transparency=0,
)
print(out.resolve())
