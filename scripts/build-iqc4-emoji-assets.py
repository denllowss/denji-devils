#!/usr/bin/env python3
"""Offline IQC4 reaction assets: true RGBA, never threshold a JPEG screenshot.

Requires Pillow for asset maintenance only. Vercel serves the committed template
and PNG files; it does not run Python or fetch emoji from a CDN.
"""
from pathlib import Path
from io import BytesIO
import base64
import json
import re
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'api' / 'iqc4-assets'
MAPPING = [
    ('👍', '1f44d', 'reaction-58.png'),
    ('❤️', '2764-fe0f', 'reaction-115.png'),
    ('😂', '1f602', 'reaction-171.png'),
    ('😮', '1f62e', 'reaction-227.png'),
    ('😢', '1f622', 'reaction-284.png'),
    ('🙏', '1f64f', 'reaction-340.png'),
]

def data_uri(data):
    return 'data:image/png;base64,' + base64.b64encode(data).decode('ascii')

def replace_json(html, name, following, value):
    pattern = re.compile(r'(?<=' + re.escape(name + '=') + r')(\{.*?\})(?=,' + re.escape(following) + r'=)', re.S)
    html, count = pattern.subn(lambda _: json.dumps(value, ensure_ascii=False, separators=(',', ':')), html)
    if count != 1:
        raise ValueError('Expected exactly one template map: ' + name)
    return html

emojis = json.loads((ASSETS / 'emojis.json').read_text())
toolbar = {}
for symbol, key, filename in MAPPING:
    source = Image.open(BytesIO(base64.b64decode(emojis[key].split(',', 1)[1]))).convert('RGBA')
    if not source.getchannel('A').getbbox() or source.getchannel('A').getextrema()[0] != 0:
        raise ValueError('Emoji requires a genuine transparent alpha channel: ' + key)
    glyph = source.crop(source.getchannel('A').getbbox())
    # Transparent padding keeps all six icons centred and the visible glyphs
    # within 40×40 CSS px. Pillow resizes RGBA in premultiplied-alpha space,
    # preserving antialiasing without baking a white/grey matte into the edge.
    factor = min(80 / glyph.width, 80 / glyph.height)
    glyph = glyph.resize((round(glyph.width * factor), round(glyph.height * factor)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (96, 98), (0, 0, 0, 0))
    canvas.alpha_composite(glyph, ((96 - glyph.width) // 2, (98 - glyph.height) // 2))
    dest = ASSETS / filename
    canvas.save(dest, optimize=True)
    toolbar[symbol] = data_uri(dest.read_bytes())
    print(filename, '— true RGBA, 96×98, centred')

path = ROOT / 'api' / '_template4.html'
html = path.read_text()
html = replace_json(html, 'toolbar', 'keys', toolbar)
html = replace_json(html, 'emojis', 'toolbar', emojis)
path.write_text(html)
print('Inline toolbar and message emoji maps updated; reference photo unchanged.')
