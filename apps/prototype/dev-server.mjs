// Local dev server: static files + /api/* handlers (Vercel Node signature). `node dev-server.mjs [port]`
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const root = path.dirname(url.fileURLToPath(import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png' };
export function start(port = 0) {
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/api/')) {
      const name = u.pathname.slice(5).replace(/[^a-z]/g, '');
      try { const mod = await import(path.join(root, 'api', name + '.js')); return mod.default(req, res); }
      catch (e) { res.statusCode = 404; return res.end('no api'); }
    }
    let p = path.join(root, decodeURIComponent(u.pathname));
    if (!p.startsWith(root)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!fs.existsSync(p)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', types[path.extname(p)] || 'application/octet-stream'); fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(port, () => r(srv)));
}
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) start(+process.argv[2] || 4321).then(s => console.log('http://localhost:' + s.address().port));
