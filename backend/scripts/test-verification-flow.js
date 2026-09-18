const net = require('net');
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  net.setDefaultAutoSelectFamily(false);
}
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const baseUrl = 'http://127.0.0.1:4000';

function request(method, pathname, { body, token } = {}) {
  return new Promise((resolve) => {
    const url = new URL(pathname, baseUrl);
    const transport = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : undefined;
    const req = transport.request(
      url,
      {
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 60000,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = raw ? JSON.parse(raw) : undefined;
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Timed out')));
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runExactFlow() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const createdUserIds = [];

  const results = [];
  function logStep(stepLetter, title, passed, note = '') {
    results.push({ stepLetter, title, passed, note });
    console.log(`[Step ${stepLetter}] ${title}: ${passed ? 'PASS' : 'FAIL'} ${note ? `(${note})` : ''}`);
  }

  try {
    const suffix = Math.random().toString(36).slice(2, 9);
    const customerEmail = `verify_flow_${suffix}@firstfaith.com`;
    const customerPass = `Cust_P@ss_${suffix}!`;
    const customerName = `Flow Customer ${suffix}`;

    // Create a temporary Admin to inspect Admin -> Customers
    const adminEmail = `admin_flow_${suffix}@firstfaith.com`;
    const adminPass = `Admin_P@ss_${suffix}!`;
    const adminId = crypto.randomUUID();
    createdUserIds.push(adminId);

    await pool.query(
      'INSERT INTO "User" (id, email, "passwordHash", role, "emailVerified", "updatedAt") VALUES ($1, $2, $3, $4, true, NOW())',
      [adminId, adminEmail, await bcrypt.hash(adminPass, 10), 'SUPER_ADMIN'],
    );

    // Authenticate admin to get admin token
    const adminLoginRes = await request('POST', '/api/auth/admin/login', {
      body: { email: adminEmail, password: adminPass },
    });
    const adminToken = adminLoginRes.body?.accessToken;
    if (!adminToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes)}`);
    }

    // A. Register a brand-new customer
    const regRes = await request('POST', '/api/auth/register', {
      body: { email: customerEmail, password: customerPass, fullName: customerName },
    });
    const regPassed = regRes.status === 201 && !regRes.body?.accessToken;
    logStep('A', 'Register a brand-new customer', regPassed, `Status: ${regRes.status}, no token returned`);

    // B. Confirm database state: role=CUSTOMER, emailVerified=false
    const dbRes = await pool.query(
      'SELECT id, email, role, "emailVerified", "emailVerificationTokenHash" FROM "User" WHERE email = $1',
      [customerEmail],
    );
    const userInDb = dbRes.rows[0];
    if (userInDb) createdUserIds.push(userInDb.id);

    const dbStatePassed =
      userInDb &&
      userInDb.role === 'CUSTOMER' &&
      userInDb.emailVerified === false &&
      Boolean(userInDb.emailVerificationTokenHash);
    logStep(
      'B',
      'Confirm database state (role=CUSTOMER, emailVerified=false)',
      dbStatePassed,
      `Role: ${userInDb?.role}, emailVerified: ${userInDb?.emailVerified}`,
    );

    // B2. Attempt duplicate registration on unverified account -> 409 with recovery message, no duplicate User
    const dupUnverifiedRes = await request('POST', '/api/auth/register', {
      body: { email: customerEmail, password: 'AnotherPassword123!', fullName: 'Duplicate User' },
    });
    const dupCountDb = await pool.query('SELECT COUNT(*)::int as count FROM "User" WHERE email = $1', [customerEmail]);
    const dupUnverifiedPassed =
      dupUnverifiedRes.status === 409 &&
      (dupUnverifiedRes.body?.message || '').includes('already registered but not yet verified') &&
      (dupUnverifiedRes.body?.message || '').includes('resend-verification') &&
      dupCountDb.rows[0]?.count === 1;
    logStep(
      'B2',
      'Duplicate registration on unverified email returns recovery message (no duplicate User)',
      dupUnverifiedPassed,
      `Status: ${dupUnverifiedRes.status}, Message: "${dupUnverifiedRes.body?.message}", Users in DB: ${dupCountDb.rows[0]?.count}`,
    );

    // C. Confirm Admin -> Customers does NOT show that account (and does NOT show admins)
    const adminCustRes1 = await request('GET', '/api/admin/users', { token: adminToken });
    const custFoundBefore = Array.isArray(adminCustRes1.body) && adminCustRes1.body.some((u) => u.email === customerEmail);
    const adminFoundInList = Array.isArray(adminCustRes1.body) && adminCustRes1.body.some((u) => u.role !== 'CUSTOMER');
    const adminCheckBeforePassed = adminCustRes1.status === 200 && !custFoundBefore && !adminFoundInList;
    logStep(
      'C',
      'Confirm Admin -> Customers does NOT show unverified account',
      adminCheckBeforePassed,
      `Present: ${custFoundBefore}, Non-customers in list: ${adminFoundInList}`,
    );

    // D. Attempt customer login without verification -> HTTP 401
    const unverifiedLoginRes = await request('POST', '/api/auth/login', {
      body: { email: customerEmail, password: customerPass },
    });
    const unverifiedRejected =
      unverifiedLoginRes.status === 401 &&
      (unverifiedLoginRes.body?.message || '').includes('Please verify your email before signing in') &&
      !unverifiedLoginRes.body?.accessToken;
    logStep(
      'D',
      'Attempt customer login without verification -> HTTP 401',
      unverifiedRejected,
      `Status: ${unverifiedLoginRes.status}, Message: ${unverifiedLoginRes.body?.message}`,
    );

    // E. Verify the email
    const knownRawToken = crypto.randomBytes(32).toString('hex');
    const knownHash = crypto.createHash('sha256').update(knownRawToken).digest('hex');
    const futureExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await pool.query(
      'UPDATE "User" SET "emailVerificationTokenHash" = $1, "emailVerificationExpiresAt" = $2 WHERE id = $3',
      [knownHash, futureExpiry, userInDb.id],
    );

    const verifyRes = await request('POST', '/api/auth/verify-email', {
      body: { token: knownRawToken },
    });
    const verifySuccess =
      (verifyRes.status === 200 || verifyRes.status === 201) &&
      verifyRes.body?.success === true;
    logStep('E', 'Verify the email', verifySuccess, `Status: ${verifyRes.status}`);

    // Confirm DB reflects emailVerified=true
    const dbCheckAfter = await pool.query(
      'SELECT "emailVerified" FROM "User" WHERE id = $1',
      [userInDb.id],
    );
    const isNowVerified = dbCheckAfter.rows[0]?.emailVerified === true;

    // F. Attempt login again -> HTTP 201/success and JWT issued
    const verifiedLoginRes = await request('POST', '/api/auth/login', {
      body: { email: customerEmail, password: customerPass },
    });
    const customerToken = verifiedLoginRes.body?.accessToken;
    const loginSuccess =
      (verifiedLoginRes.status === 200 || verifiedLoginRes.status === 201) &&
      Boolean(customerToken) &&
      isNowVerified;
    logStep(
      'F',
      'Attempt login again -> HTTP 200/201 and JWT issued',
      loginSuccess,
      `Status: ${verifiedLoginRes.status}, JWT issued: ${Boolean(customerToken)}`,
    );

    // F2. Attempt duplicate registration on verified account -> 409 already exists, no duplicate User
    const dupVerifiedRes = await request('POST', '/api/auth/register', {
      body: { email: customerEmail, password: customerPass, fullName: customerName },
    });
    const dupVerifiedCountDb = await pool.query('SELECT COUNT(*)::int as count FROM "User" WHERE email = $1', [customerEmail]);
    const dupVerifiedPassed =
      dupVerifiedRes.status === 409 &&
      dupVerifiedRes.body?.message === 'An account with this email already exists' &&
      dupVerifiedCountDb.rows[0]?.count === 1;
    logStep(
      'F2',
      'Duplicate registration on verified email rejected as already registered',
      dupVerifiedPassed,
      `Status: ${dupVerifiedRes.status}, Message: "${dupVerifiedRes.body?.message}", Users in DB: ${dupVerifiedCountDb.rows[0]?.count}`,
    );

    // G. Confirm Admin -> Customers now shows that customer
    const adminCustRes2 = await request('GET', '/api/admin/users', { token: adminToken });
    const custFoundAfter = Array.isArray(adminCustRes2.body) && adminCustRes2.body.some((u) => u.email === customerEmail);
    const onlyCustomers = Array.isArray(adminCustRes2.body) && adminCustRes2.body.every((u) => u.role === 'CUSTOMER');
    const adminCheckAfterPassed = adminCustRes2.status === 200 && custFoundAfter && onlyCustomers;
    logStep(
      'G',
      'Confirm Admin -> Customers now shows verified customer',
      adminCheckAfterPassed,
      `Present in list: ${custFoundAfter}, All are role CUSTOMER: ${onlyCustomers}`,
    );

    // H. Confirm admin login still works
    const adminReLoginRes = await request('POST', '/api/auth/admin/login', {
      body: { email: adminEmail, password: adminPass },
    });
    const adminStillWorks =
      (adminReLoginRes.status === 200 || adminReLoginRes.status === 201) &&
      Boolean(adminReLoginRes.body?.accessToken);
    logStep('H', 'Confirm admin login still works', adminStillWorks, `Status: ${adminReLoginRes.status}`);

    // I. Confirm customer cannot access /api/admin/* (403)
    const customerAdminAccessRes = await request('GET', '/api/admin/dashboard', {
      token: customerToken,
    });
    const customerUsersAccessRes = await request('GET', '/api/admin/users', {
      token: customerToken,
    });
    const rbacEnforced =
      customerAdminAccessRes.status === 403 &&
      customerUsersAccessRes.status === 403;
    logStep(
      'I',
      'Confirm customer cannot access /api/admin/* (403)',
      rbacEnforced,
      `/admin/dashboard: ${customerAdminAccessRes.status}, /admin/users: ${customerUsersAccessRes.status}`,
    );

    console.log('\n=== EXACT FLOW VERIFICATION SUMMARY ===');
    const allPassed = results.every((r) => r.passed);
    console.log(`Passed: ${results.filter((r) => r.passed).length}/${results.length}`);
    console.log(`All steps passed: ${allPassed ? 'YES' : 'NO'}`);
  } finally {
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM "User" WHERE id = ANY($1)', [createdUserIds]);
    }
    await pool.end();
  }
}

runExactFlow().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
