#!/usr/bin/env python3
"""Rebuild the offline SSGC template; original JPEG bytes are never recompressed."""
from pathlib import Path
from PIL import Image,ImageDraw
import base64
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'api/ssgc-assets'
im=Image.open(ASSETS/'reference.jpg').convert('RGB')
top=im.crop((0,0,739,176));ImageDraw.Draw(top).rectangle((276,108,462,176),fill=im.getpixel((260,110)));top.save(ASSETS/'top-ui.png')
for name,box in [('avatar',(285,119,456,290)),('name',(0,309,739,369)),('members',(0,374,739,411)),('description',(0,431,739,508)),('footer',(0,526,739,1600))]:im.crop(box).save(ASSETS/(name+'.png'))
def uri(p,mime):return 'data:'+mime+';base64,'+base64.b64encode(Path(p).read_bytes()).decode()
s=(ROOT/'src/ui/ssgc-template.html').read_text()
for key,file,mime in [('REFERENCE','reference.jpg','image/jpeg'),('TOP','top-ui.png','image/png'),('AVATAR','avatar.png','image/png'),('NAME','name.png','image/png'),('MEMBERS','members.png','image/png'),('DESCRIPTION','description.png','image/png'),('FOOTER','footer.png','image/png'),('SERIF','noto-serif-700.woff2','font/woff2')]:s=s.replace('__'+key+'__',uri(ASSETS/file,mime))
s=s.replace('__ROBOTO__',uri(ROOT/'api/iqc5-assets/roboto-400.woff2','font/woff2')).replace('__EMOJIS__',(ROOT/'api/iqc5-assets/emojis.json').read_text())
(ROOT/'api/_template-ssgc.html').write_text(s)
print('SSGC template built:',len(s.encode()),'bytes; all assets inline/offline.')
