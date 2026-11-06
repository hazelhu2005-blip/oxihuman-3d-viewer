// 极简静态服务器：只为 OxiHuman 演示页提供正确的 MIME（.wasm 必须是 application/wasm）。
// 用法： node server.mjs [port]
// 同时监听 8080 与 8081：用户很可能还开着旧书签，哪个端口能连上就用哪个。
import http from 'node:http';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORTS = [...new Set([Number(process.argv[2] || process.env.PORT || 8080), 8081])];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.ohpk': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'cross-origin-resource-policy': 'cross-origin',
};

function handler(req, res) {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, CORS).end('Bad Request');
    return;
  }
  if (rel === '/') rel = '/oxihuman_index.html';
  const file = path.join(ROOT, rel);

  if (!file.startsWith(ROOT)) { res.writeHead(403, CORS).end('Forbidden'); return; }
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS).end(); return; }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { ...CORS, 'content-type': 'text/plain; charset=utf-8' }).end(`404 ${rel}`);
      return;
    }
    res.writeHead(200, {
      ...CORS,
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

function portFree(port) {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '127.0.0.1');
  });
}

function tryListen(port) {
  return new Promise(resolve => {
    const srv = http.createServer(handler);
    // 探测用的是 127.0.0.1，实际 listen 默认绑 ::（双栈）—— 两者可能不一致，
    // 所以必须兜住 error，否则端口冲突会抛未捕获异常把进程打死。
    srv.once('error', err => {
      console.log(`端口 ${port} 绑定失败（${err.code}），跳过。`);
      resolve(false);
    });
    srv.listen(port, () => {
      console.log(`OxiHuman demo → http://127.0.0.1:${port}/oxihuman_index.html`);
      resolve(true);
    });
  });
}

function hint() {
  console.log('');
  console.log('8080 / 8081 都没能启用 —— 大概率已经有一个 OxiHuman 服务在跑了，');
  console.log('直接用浏览器打开 http://127.0.0.1:8080/oxihuman_index.html 即可。');
  console.log('如果页面仍然读不到资产包，先把占用端口的进程关掉，再重新运行本脚本。');
  console.log('也可以直接换端口： PORT=8090 node server.mjs');
}

let up = 0;
for (const port of PORTS) {
  if (!(await portFree(port))) {
    // 端口上已经有一个（旧版）服务在跑：新版自己让开，别跟它抢
    console.log(`端口 ${port} 已被其它进程占用，跳过。`);
    continue;
  }
  if (await tryListen(port)) up++;
}

if (!up) hint();
console.log(`根目录: ${ROOT}`);
