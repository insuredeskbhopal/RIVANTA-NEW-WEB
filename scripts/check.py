"""Check local asset completeness and JavaScript syntax before deployment."""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import subprocess
from mirror import references, ORIGIN, DIST, TEXT

missing = set()
files = [p for p in DIST.rglob('*') if p.is_file()]
for file in files:
    relative = file.relative_to(DIST).as_posix()
    if file.suffix.lower() in TEXT | {'.html'}:
        for url in references(file.read_text(encoding='utf-8-sig'), ORIGIN + '/' + relative):
            target = DIST / unquote(urlsplit(url).path.lstrip('/'))
            if not target.is_file():
                missing.add((relative, str(target.relative_to(DIST))))
    if file.suffix == '.js':
        subprocess.run(['node', '--check', str(file)], check=True, capture_output=True)
    assert file.stat().st_size < 25 * 1024 * 1024, f'Hosting asset too large: {relative}'
assert not missing, f'Missing local assets: {sorted(missing)}'
assert 'citadelgroup.org' not in (DIST / 'index.html').read_text(encoding='utf-8')
print(f'PASS: {len(files)} files; local asset references complete; JavaScript syntax valid; assets within hosting limit.')
