import http from 'node:http';
import { createReadStream, statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff','.mp4':'video/mp4'};
http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/__scroll-qa.js') {
    res.writeHead(200, {'Content-Type':'text/javascript'}).end(readFileSync(new URL('./scroll-qa.js', import.meta.url)));
    return;
  }
  if (pathname === '/' && new URL(req.url, 'http://localhost').searchParams.get('qa') === 'scroll') {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}).end(readFileSync(path.join(root,'index.html'),'utf8').replace('<head>','<head><script src="/__scroll-qa.js"></script>'));
    return;
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const size = statSync(file).size;
    const headers = {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Accept-Ranges':'bytes'};
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]),size-1) : size-1;
      if (start >= size || start > end) { res.writeHead(416,{'Content-Range':`bytes */${size}`}).end(); return; }
      res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
      if (req.method === 'HEAD') res.end(); else createReadStream(file,{start,end}).pipe(res);
    } else {
      res.writeHead(200,{...headers,'Content-Length':size});
      if (req.method === 'HEAD') res.end(); else createReadStream(file).pipe(res);
    }
  } catch { res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found'); }
}).listen(4173, '0.0.0.0', () => console.log('Local: http://localhost:4173'));
