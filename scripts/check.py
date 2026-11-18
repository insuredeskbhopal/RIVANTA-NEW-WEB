"""Validate the preserved frontend and the Next.js production export."""
from pathlib import Path
from urllib.parse import unquote,urlsplit
from html.parser import HTMLParser
import hashlib,json,subprocess
from mirror import references,ORIGIN,TEXT

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'public'
OUT=ROOT/'out'
manifest=json.loads((ROOT/'content/assets-manifest.json').read_text())
for relative,expected in manifest.items():
    file=PUBLIC/relative
    assert hashlib.sha256(file.read_bytes()).hexdigest()==expected,f'Preserved asset changed: {relative}'
    assert file.stat().st_size<25*1024*1024,f'Hosting asset too large: {relative}'
    assert (OUT/relative).is_file(),f'Export asset missing: {relative}'
    assert (OUT/relative).read_bytes()==file.read_bytes(),f'Export transformed asset: {relative}'
    if file.suffix.lower() in TEXT:
        for url in references(file.read_text(encoding='utf-8-sig'),ORIGIN+'/'+relative):
            target=PUBLIC/unquote(urlsplit(url).path.lstrip('/'))
            assert target.is_file(),f'Missing asset: {url}'
    if file.suffix=='.js':subprocess.run(['node','--check',str(file)],check=True,capture_output=True)

migration=json.loads((ROOT/'content/migration-manifest.json').read_text())
for name,digest in migration['fragments'].items():
    assert hashlib.sha256((ROOT/'content'/f'{name}.html').read_bytes()).hexdigest()==digest,f'Original markup changed: {name}'

class ExportResources(HTMLParser):
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag not in ['script','link','img','source','video']:return
        if tag=='link' and attrs.get('rel') not in ['stylesheet','preload','icon','apple-touch-icon']:return
        for attribute in ['src','href']:
            value=attrs.get(attribute,'')
            if value.startswith('/') and not value.startswith('//') and value!='/':
                target=OUT/unquote(urlsplit(value).path.lstrip('/'))
                assert target.is_file(),f'Next export references missing resource: {value}'
ExportResources().feed((OUT/'index.html').read_text(encoding='utf-8'))
print(f'PASS: {len(manifest)} original assets byte-identical; 11 original markup fragments unchanged; JavaScript syntax and Next export resources valid.')
