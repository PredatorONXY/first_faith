const http = require('http');
const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const baseUrl = process.env.AUTH_VERIFY_BASE_URL || 'http://127.0.0.1:4000';
const requiredVariables = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'CUSTOMER_EMAIL', 'CUSTOMER_PASSWORD'];

function safeMessage(body) {
  if (!body || typeof body !== 'object') return undefined;
  const value = Array.isArray(body.message) ? body.message.join('; ') : body.message;
  return typeof value === 'string' ? value.slice(0, 300) : undefined;
}

function classify(status) {
  if (status >= 200 && status < 300) return 'success';
  if (status === 401) return 'authentication failure';
  if (status === 403) return 'authorization failure';
  if (status >= 500) return 'server error';
  return 'request failure';
}

function request(method, pathname, { body, token } = {}) {
  return new Promise((resolve) => {
    const url = new URL(pathname, baseUrl);
    const transport = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : undefined;
    const req = transport.request(url, {
      method,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 20000,
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = raw ? JSON.parse(raw) : undefined; } catch { parsed = undefined; }
        resolve({ endpoint: pathname, status: res.statusCode || 0, result: classify(res.statusCode || 0), message: safeMessage(parsed), body: parsed });
      });
    });
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', (error) => resolve({ endpoint: pathname, status: 0, result: 'connection error', message: error.code === 'ETIMEDOUT' ? 'Connection timed out' : 'Connection failed' }));
    if (payload) req.write(payload);
    req.end();
  });
}

function report(response, extra = {}) {
  const output = { endpoint: response.endpoint, status: response.status, result: response.result, ...extra };
  if (response.message) output.message = response.message;
  console.log(JSON.stringify(output));
}

async function login(endpoint, email, password) {
  const response = await request('POST', endpoint, { body: { email, password } });
  const token = response.body && typeof response.body.accessToken === 'string' ? response.body.accessToken : undefined;
  report(response, { tokenReceived: Boolean(token) });
  return token;
}

async function verifyIdentity(token, expectedRoles, label) {
  const response = await request('GET', '/api/auth/me', { token });
  report(response, { check: `${label} identity`, role: response.body?.role || null, roleMatches: expectedRoles.includes(response.body?.role) });
}

async function main() {
  const missing = requiredVariables.filter((name) => !process.env[name]);
  if (missing.length) {
    console.log(JSON.stringify({ result: 'configuration required', missingEnvironmentVariables: missing }));
    process.exitCode = 2;
    return;
  }

  const adminToken = await login('/api/auth/admin/login', process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const customerToken = await login('/api/auth/login', process.env.CUSTOMER_EMAIL, process.env.CUSTOMER_PASSWORD);

  if (adminToken) {
    await verifyIdentity(adminToken, ['ADMIN', 'SUPER_ADMIN'], 'admin');
    report(await request('GET', '/api/admin/dashboard', { token: adminToken }), { check: 'admin dashboard' });
  }
  if (customerToken) {
    await verifyIdentity(customerToken, ['CUSTOMER'], 'customer');
    const dashboard = await request('GET', '/api/admin/dashboard', { token: customerToken });
    report(dashboard, { check: 'customer RBAC', forbidden: dashboard.status === 403 });
  }

  report(await request('GET', '/api/admin/dashboard'), { check: 'missing authorization header', rejected: true });
  report(await request('GET', '/api/auth/me', { token: 'invalid.jwt.token' }), { check: 'invalid JWT', rejected: true });
  await login('/api/auth/admin/login', process.env.CUSTOMER_EMAIL, 'invalid-password');
  await login('/api/auth/login', process.env.CUSTOMER_EMAIL, 'invalid-password');
  await login('/api/auth/admin/login', process.env.CUSTOMER_EMAIL, process.env.CUSTOMER_PASSWORD);

  const token = adminToken || customerToken;
  if (token) {
    let passed = 0;
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await request('GET', '/api/auth/me', { token });
      if (response.status === 200) passed += 1;
      report(response, { check: 'consecutive auth/me', attempt });
    }
    console.log(JSON.stringify({ check: 'consecutive auth/me summary', passed, expected: 10 }));
  }
}

main().catch(() => {
  console.log(JSON.stringify({ result: 'server error', message: 'Verification could not complete' }));
  process.exitCode = 1;
});
