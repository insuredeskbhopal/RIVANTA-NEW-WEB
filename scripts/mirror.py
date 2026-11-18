"""Build a portable local copy of the public Citadel frontend and assets."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import Request, urlopen
import html, json, re, hashlib, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
ORIGIN = 'https://citadelgroup.org'
EXTENSIONS = {'.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.json', '.ico'}
TEXT = {'.js', '.css', '.svg', '.json'}
seen, records, errors = set(), [], []

def references(text, base):
    text = html.unescape(text).replace('\\/', '/')
    found = set(re.findall(r'https://citadelgroup\.org/[^\s\x22\x27<>`\\)]+', text))
    found.update(urljoin(base, x) for x in re.findall(r'url\(\s*[\x22\x27]?([^\s\x22\x27)]+)', text))
    found.update(urljoin(base, x) for x in re.findall(r'[\x22\x27]((?:\.{1,2}/|/wp-content/)[^\x22\x27\s]+)[\x22\x27]', text))
    found.update(urljoin(base, x) for x in re.findall(r'[\x22\x27]([^\x22\x27\s<>]+\.(?:png|webp|jpg|svg|woff2?|ttf|otf|js|css|mp4|json))(?:\?[^\x22\x27]*)?[\x22\x27]', text))
    return {u.split('?')[0].split('#')[0] for u in found if urlsplit(u).netloc == 'citadelgroup.org' and Path(urlsplit(u).path).suffix.lower() in EXTENSIONS}

def localize(text, attributes=False):
    text = text.replace(ORIGIN + '/', '/')
    encoded = 'https&#x3A;&#x2F;&#x2F;citadelgroup.org&#x2F;'
    text = text.replace(encoded, '&#x2F;')
    text = text.replace('https:\\/\\/citadelgroup.org\\/', '/')
    text = text.replace("String(scriptUrl || '').replace(/[^/]*$/, '')", "new URL(scriptUrl || '.', document.baseURI).href.replace(/[^/]*$/, '')")
    # Inline JSON attributes encode both the backslashes and slashes as entities.
    if attributes:
        text = re.sub(r'([\w-]+)=\x22([^\x22]*)\x22', lambda m: m[1] + '=\x22' + html.escape(html.unescape(m[2]).replace('https:\\/\\/citadelgroup.org\\/', '/').replace(ORIGIN + '/', '/'), quote=True) + '\x22', text)
    return text

def download(url):
    path = DIST / unquote(urlsplit(url).path.lstrip('/'))
    try:
        if path.exists() and not ('--refresh-text' in sys.argv and path.suffix.lower() in TEXT):
            data = path.read_bytes()
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            result = subprocess.run(['curl.exe', '--fail', '--location', '--silent', '--show-error', '--max-time', '60', '--retry', '1', '--output', str(path), url], capture_output=True, text=True)
            if result.returncode:
                if path.exists():
                    path.unlink()
                raise RuntimeError(result.stderr.strip())
            data = path.read_bytes()
        new = set()
        if path.suffix.lower() in TEXT:
            source = data.decode('utf-8-sig')
            new = references(source, url)
            path.write_text(localize(source), encoding='utf-8')
        return {'url': url, 'path': str(path.relative_to(DIST)), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}, new
    except Exception as exc:
        return {'url': url, 'error': str(exc)}, set()

def main():
    source = (ROOT.parent / 'reference-original.html').read_text(encoding='utf-8-sig')
    # Keep the theme and page content, without WordPress discovery, analytics, or challenge code.
    source = re.sub(r'<script\b[^>]*>.*?</script>', lambda m: m[0] if ('type="importmap"' in m[0] or ('type="module"' in m[0] and 'src="https://citadelgroup.org/wp-content/themes/' in m[0])) else '', source, flags=re.S)
    source = re.sub(r'<link\b[^>]*(?:rel=[\x22\x27](?:canonical|alternate|dns-prefetch)|api\.w\.org)[^>]*>', '', source)
    source = re.sub(r'<meta\b[^>]*(?:property=[\x22\x27]og:|name=[\x22\x27](?:dc\.|twitter:))[^>]*>', '', source)
    source = source.replace('<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">', '<meta name="robots" content="noindex,nofollow">')
    source = source.replace('href="https://citadelgroup.org/"', 'href="/"')
    # Remove the unrelated original agency credit from this recreation.
    source = re.sub(r'<div class="citadel-footer-made-by-hart.*?</div>\s*</a>\s*</div>', '', source, flags=re.S)
    queue = references(source, ORIGIN + '/')
    DIST.mkdir(parents=True, exist_ok=True)
    (DIST / 'index.html').write_text(localize(source, attributes=True), encoding='utf-8')
    while queue:
        batch = sorted(queue - seen)
        if not batch:
            break
        seen.update(batch)
        queue = set()
        print(f'Downloading {len(batch)} assets ({len(records)} complete)', flush=True)
        with ThreadPoolExecutor(max_workers=12) as pool:
            for record, new in pool.map(download, batch):
                if 'error' in record:
                    errors.append(record)
                else:
                    records.append(record)
                queue.update(new - seen)
    # The source contains an oversized 97-megapixel background; retain a web-sized copy.
    from PIL import Image
    for image_path in DIST.rglob('*.jpg'):
        if image_path.stat().st_size > 4_000_000:
            with Image.open(image_path) as image:
                image.thumbnail((1920, 1920))
                image.save(image_path, quality=85, optimize=True)
    for record in records:
        output = (DIST / record['path']).read_bytes()
        record['local_bytes'] = len(output)
        record['local_sha256'] = hashlib.sha256(output).hexdigest()
    (ROOT / 'evidence' / 'asset-manifest.json').write_text(json.dumps({'source': ORIGIN, 'assets': records, 'errors': errors}, indent=2), encoding='utf-8')
    print(json.dumps({'assets': len(records), 'bytes': sum(r['bytes'] for r in records), 'errors': errors}), flush=True)

if __name__ == '__main__':
    main()
