const http = require('http');
const fs = require('fs');
const path = require('path');

const EASYBT_HOST = '127.0.0.1';
const EASYBT_PORT = 18080;
const PROXY_PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let filePath = path.join(PUBLIC_DIR, req.path === '/' ? 'index.html' : req.path);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function proxyApi(req, res) {
  const options = {
    hostname: EASYBT_HOST,
    port: EASYBT_PORT,
    path: '/api/v1/status',
    method: 'GET',
    headers: {},
  };

  if (req.headers['x-api-token']) {
    options.headers['X-Api-Token'] = req.headers['x-api-token'];
  }

  const proxyReq = http.request(options, (proxyRes) => {
    let body = '';
    proxyRes.on('data', (chunk) => { body += chunk; });
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(body);
    });
  });

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      code: 502,
      message: '无法连接到 EasyBluetooth，请确保 EasyBluetooth 正在运行且 API 接口已开启',
      data: null,
    }));
  });

  proxyReq.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  req.path = url.pathname;

  if (req.path.startsWith('/api/')) {
    proxyApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

function getLocalIP() {
  const os = require('os');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════');
  console.log('  蓝牙设备电量监控面板');
  console.log('═══════════════════════════════════════');
  console.log(`  本机访问  : http://127.0.0.1:${PROXY_PORT}`);
  console.log(`  手机访问  : http://192.168.1.21:${PROXY_PORT}`);
  console.log('═══════════════════════════════════════');
  console.log('  请确保:');
  console.log('  1. EasyBluetooth 已开启统一标准数据接口');
  console.log('  2. 手机与电脑处于同一局域网');
  console.log('  3. 手机打开下方链接并点⚙️保存即可自动连接');
  console.log('═══════════════════════════════════════');
  console.log('  GitHub Pages 一键直达:');
  console.log('  https://zqz2024-cloud.github.io/easybluetooth-battery-monitor/?api=http://192.168.1.21:3000');
  console.log('═══════════════════════════════════════');
});
