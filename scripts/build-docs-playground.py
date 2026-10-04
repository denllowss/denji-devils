#!/usr/bin/env python3
"""Embed tracked Playground controllers and the shared header reference in both docs."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'public/docs.html';html=p.read_text()
def inject(start,end,source,begin_marker,end_marker):
    global html
    if begin_marker in html:
        a=html.index(begin_marker);b=html.index(end_marker,a)+len(end_marker)
        while b<len(html) and html[b]=='\n':b+=1
    else:
        a=html.index(start);b=html.index(end,a)
    html=html[:a]+begin_marker+'\n'+source.rstrip()+'\n'+end_marker+'\n\n'+html[b:]
source=(ROOT/'src/ui/iqc-playground.js').read_text().replace('__IQC_HEADER_REFERENCE__',(ROOT/'src/shared/iqc-header-reference.json').read_text()).replace('__SSGC_HEADER_REFERENCE__',(ROOT/'src/shared/ssgc-header-reference.json').read_text())
if '/* IQC_CONTROLLER_END */' not in html:
    a=html.index('const pgIqc = (function');b=html.index('\n})();',a)+len('\n})();')
    html=html[:a]+'/* IQC_CONTROLLER_START */\n'+source.rstrip()+'\n/* IQC_CONTROLLER_END */'+html[b:]
else:inject('', '', source, '/* IQC_CONTROLLER_START */', '/* IQC_CONTROLLER_END */')
inject('function responseDetails(', 'function copyAsCurl(', (ROOT/'src/ui/playground-response.js').read_text(), '/* IQC_RESPONSE_START */', '/* IQC_RESPONSE_END */')
# Desktop controls/style stay tracked and inline (no CDN or second JS request).
def embed_before(source,begin,end,target):
    global html
    if begin in html:
        a=html.index(begin);b=html.index(end,a)+len(end)
        html=html[:a]+begin+'\n'+source.rstrip()+'\n'+end+html[b:]
    else:
        a=html.rindex(target)
        html=html[:a]+begin+'\n'+source.rstrip()+'\n'+end+'\n'+html[a:]
embed_before((ROOT/'src/ui/docs-desktop.css').read_text()+'\n'+(ROOT/'src/ui/docs-engage.css').read_text()+'\n'+(ROOT/'src/ui/docs-synthesis.css').read_text(),'/* DOCS_DESKTOP_STYLE_START */','/* DOCS_DESKTOP_STYLE_END */','</style>')
# Analytics + Flags observability embedded inline for docs (no extra request, works offline)
analytics_src = ''
try:
    analytics_src = (ROOT/'src/ui/analytics.js').read_text()
except:
    analytics_src = ''
entrance_src = ''
try:
    entrance_src = (ROOT/'src/ui/docs-entrance.js').read_text()
except:
    entrance_src = ''
embed_before(entrance_src+'\n'+(ROOT/'src/ui/docs-desktop.js').read_text()+'\n'+(ROOT/'src/ui/docs-engage.js').read_text()+'\n'+analytics_src,'/* DOCS_DESKTOP_UI_START */','/* DOCS_DESKTOP_UI_END */','</script>')
# Static, shareable reference for every IQC model (also readable without JavaScript).
import json
from html import escape
spec=json.loads((ROOT/'src/shared/iqc-header-reference.json').read_text())
rows=[(name,'IQC1–5',note) for name,note in spec['common']]
rows.extend([('X-IQC-Cache','IQC1 / IQC2','HIT / MISS. Seed eksplisit memakai cache per menit WIB; jam di gambar tetap WIB.'),('X-IQC-Source','IQC3 / IQC4','reference-photo (default) / dynamic-render (hasil edit).'),('X-IQC-Source','IQC5','reference-photo (PNG asli), reference-converted (default JPG), dynamic-render (hasil edit).'),('Access-Control-Allow-Headers','IQC5','Content-Type; mendukung POST profil multipart / JSON / image body.')])
rows.extend((name,'SSGC',note) for name,note in json.loads((ROOT/'src/shared/ssgc-header-reference.json').read_text()))
tr=''.join('<tr><td><span class="param-name">'+escape(a)+'</span></td><td>'+escape(b)+'</td><td>'+escape(c)+'</td></tr>' for a,b,c in rows)
section='<section class="section-card iqc-header-ref" id="iqc-headers-reference"><div class="section-head"><div class="section-title-wrap"><span class="method-tag method-ref">REF</span><h2 class="section-title">Headers &amp; cara pakai IQC1–5 / SSGC</h2></div></div><p class="section-desc">GET IQC tanpa body JSON; baca respons sebagai gambar/blob/binary. IQC1–4 memakai JPG; IQC5 default PNG dan mendukung format=jpg. SSGC default JPG asli; format=png tersedia. Deskripsi SSGC mengikuti limit / full. Untuk profil upload IQC5 / SSGC gunakan POST multipart dengan field profile, jangan menetapkan boundary sendiri di browser. URL/kode Playground mengikuti semua input, dan preview/unduh memakai satu respons.</p><div class="table-wrap scroller"><table class="doc-table"><thead><tr><th>Header</th><th>Model</th><th>Arti / kapan tersedia</th></tr></thead><tbody>'+tr+'</tbody></table></div><p class="block-note">Metadata dimensi / filename / Content-Length merujuk respons gambar. Header error / Allow bersifat kondisional. Nilai asli, HTTP status dan semua header fetch yang terbaca tersedia pada panel hasil Playground; header transport tambahan seperti Date/Server dari platform dapat berbeda. Template HTML tetap tersedia melalui API lanjutan, tetapi Playground IQC / SSGC selalu menghasilkan gambar.</p></section>'
begin='<!-- IQC_HEADERS_REFERENCE_START -->';end='<!-- IQC_HEADERS_REFERENCE_END -->'
if begin in html:
    a=html.index(begin);b=html.index(end,a)+len(end)
    while b<len(html) and html[b]=='\n':b+=1
else:
    a=b=html.index('      <!-- ============ /api/dl ============ -->')
html=html[:a]+begin+'\n'+section+'\n'+end+'\n\n'+html[b:]
p.write_text(html);(ROOT/'docs.html').write_text(html)
print('Docs controller/header reference embedded:',len(html.encode()),'bytes; mirrors match.')
