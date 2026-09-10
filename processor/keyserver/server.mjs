import http from 'node:http';

const port = Number(process.env.PORT || 3000);
const apiKey = process.env.COBALT_API_KEY;
const token = process.env.KEYSERVER_TOKEN;

if (!apiKey || !token) {
  console.error('Missing COBALT_API_KEY or KEYSERVER_TOKEN');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname !== '/keys' || url.searchParams.get('token') !== token) {
    res.writeHead(404, { 'cache-control': 'no-store' });
    res.end();
    return;
  }

  const body = {
    [apiKey]: {
      name: 'BigSignal Tools',
      allowedServices: 'all'
    }
  };

  res.writeHead(200, {
    'content-type': 'application/json',
    'cache-control': 'no-store, private',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`keyserver listening on ${port}`);
});
