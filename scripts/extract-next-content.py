"""One-time migration: preserve the original source fragments without rewriting them."""
from html.parser import HTMLParser
from pathlib import Path
import json,re,hashlib

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'evidence'/'pre-next-site'/'index.html'
source=SOURCE.read_bytes().decode('utf-8')
lines=source.splitlines(keepends=True)
offsets=[0]
for line in lines: offsets.append(offsets[-1]+len(line))
fragments={}
class Extract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.active=None
        self.document={}
    def source_offset(self):
        line,column=self.getpos();return offsets[line-1]+column
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag in ['html','body','main']:
            self.document[tag]=attrs
        if self.active:
            if tag==self.active['tag']:self.active['depth']+=1
            return
        name=None
        if tag=='section':name=attrs.get('id')
        elif tag=='header' and 'citadel-site-header' in attrs.get('class',''):name='header'
        elif tag=='footer':name='footer-meta'
        elif tag=='a' and attrs.get('href')=='#main-content':name='skip-link'
        if name:self.active={'tag':tag,'name':name,'start':self.source_offset(),'depth':1}
    def handle_endtag(self,tag):
        if not self.active or tag!=self.active['tag']:return
        self.active['depth']-=1
        if self.active['depth']==0:
            end=source.index('>',self.source_offset())+1
            fragments[self.active['name']]=source[self.active['start']:end]
            self.active=None
parser=Extract();parser.feed(source)
expected=['skip-link','header','hero','about','partners','case-studies','map','principals','find-partner','footer-brand','footer-meta']
assert list(fragments)==expected,(list(fragments),expected)
content=ROOT/'content';content.mkdir(exist_ok=True)
for name,markup in fragments.items():(content/(name+'.html')).write_bytes(markup.encode('utf-8'))
head=re.search(r'<head>(.*?)</head>',source,re.S)[1]
(content/'head.html').write_bytes(head.encode('utf-8'))
(content/'document.json').write_text(json.dumps(parser.document,indent=2),encoding='utf-8')
manifest={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'fragments':{name:hashlib.sha256(markup.encode()).hexdigest() for name,markup in fragments.items()}}
(content/'migration-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Preserved',len(fragments),'source fragments and the original document head.')
