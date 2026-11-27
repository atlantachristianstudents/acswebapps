// Local development server. Install web-push outside the static site and set NODE_PATH.
const http = require('node:http');
const { createReadStream } = require('node:fs');
const { join } = require('node:path');
const webPush = require('web-push');

const origin = 'http://localhost:8765';
const scope = '/apps/rise/';
const app = join(__dirname, '../apps/rise');
const types = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  webmanifest: 'application/manifest+json',
  svg: 'image/svg+xml',
  png: 'image/png'
};
const keys = webPush.generateVAPIDKeys();
webPush.setVapidDetails('https://acswebapps.com/', keys.publicKey, keys.privateKey);

function reply(response, status, body = '') {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(body);
}

async function acceptTest(request, response) {
  if (request.headers.origin !== origin ||
      request.headers['content-type'] !== 'application/json') return reply(response, 403);
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 8192) return reply(response, 413);
  }

  const subscription = JSON.parse(body);
  const endpoint = new URL(subscription.endpoint);
  const allowedHosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];
  if (endpoint.origin !== 'https://' + endpoint.hostname || endpoint.username ||
      endpoint.password || !allowedHosts.includes(endpoint.hostname) ||
      !subscription.keys?.p256dh || !subscription.keys?.auth) return reply(response, 400);

  setTimeout(async () => {
    try {
      await webPush.sendNotification(subscription, null, { TTL: 60, timeout: 15000 });
      console.log('Rise test accepted by the browser push service.');
    } catch (error) {
      console.error('Rise test send failed:', error.statusCode || error.code || 'unknown error');
    }
  }, 10000);
  return reply(response, 202);
}

async function handle(request, response) {
  if (request.headers.host !== 'localhost:8765') return reply(response, 403);
  const { pathname } = new URL(request.url, origin);
  if (pathname === scope + '__push/key' && request.method === 'GET') {
    return reply(response, 200, JSON.stringify({ publicKey: keys.publicKey }));
  }
  if (pathname === scope + '__push/test' && request.method === 'POST') {
    return acceptTest(request, response);
  }
  if (request.method !== 'GET' || !pathname.startsWith(scope)) return reply(response, 404);
  const file = pathname.slice(scope.length) || 'index.html';
  if (!/^(?:index\.html|sw\.js|manifest\.webmanifest|icons\/[a-z0-9-]+\.(?:svg|png))$/.test(file)) {
    return reply(response, 404);
  }
  const stream = createReadStream(join(app, file));
  stream.once('open', () => {
    response.writeHead(200, {
      'Content-Type': types[file.split('.').pop()],
      'Cache-Control': 'no-cache'
    });
    stream.pipe(response);
  });
  stream.once('error', () => {
    if (response.headersSent) response.destroy();
    else reply(response, 404);
  });
}

http.createServer((request, response) => {
  handle(request, response).catch(() => reply(response, 400));
}).listen(8765, '127.0.0.1', () => console.log(origin + scope));
