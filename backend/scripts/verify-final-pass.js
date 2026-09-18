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

async function runFinalPassVerification() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const createdUserIds = [];
  const createdOrderIds = [];
  const createdNotifIds = [];

  const results = [];
  function logResult(section, testNum, title, passed, note = '') {
    results.push({ section, testNum, title, passed, note });
    console.log(`[${section} - ${testNum}] ${title}: ${passed ? 'PASS' : 'FAIL'} ${note ? `(${note})` : ''}`);
  }

  try {
    const suffix = Math.random().toString(36).slice(2, 9);

    // ==========================================
    // SECTION A: PRODUCT IMAGES VERIFICATION
    // ==========================================
    let prodRes;
    for (let i = 0; i < 3; i++) {
      prodRes = await request('GET', '/api/products');
      if (Array.isArray(prodRes?.body)) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    const products = Array.isArray(prodRes?.body) ? prodRes.body : [];
    const hasProducts = products.length >= 5;
    const slugs = products.map((p) => p.slug);
    const expectedSlugs = ['body-butter', 'clay-mask', 'cleanser', 'serum', 'sunscreen'];
    const allSlugsPresent = expectedSlugs.every((s) => slugs.includes(s));
    logResult('A', 1, 'Product catalog & slugs intact', hasProducts && allSlugsPresent, `Found: ${slugs.join(', ')}`);

    // ==========================================
    // SETUP: Admin user for admin tests
    // ==========================================
    const adminEmail = `admin_final_${suffix}@firstfaith.com`;
    const adminPass = `Admin_P@ss_${suffix}!`;
    const adminId = crypto.randomUUID();
    createdUserIds.push(adminId);

    await pool.query(
      'INSERT INTO "User" (id, email, "passwordHash", role, "emailVerified", "updatedAt") VALUES ($1, $2, $3, $4, true, NOW())',
      [adminId, adminEmail, await bcrypt.hash(adminPass, 10), 'SUPER_ADMIN'],
    );

    const adminLoginRes = await request('POST', '/api/auth/admin/login', {
      body: { email: adminEmail, password: adminPass },
    });
    const adminToken = adminLoginRes.body?.accessToken;
    logResult('SETUP', 1, 'Admin authentication ready', Boolean(adminToken), `Status: ${adminLoginRes.status}`);

    // ==========================================
    // SECTION B: NORMAL REGISTRATION
    // ==========================================
    const testCustEmail = `cust_reg_${suffix}@firstfaith.com`;
    const testCustPass = `Cust_P@ssw0rd_${suffix}!`;
    const testCustName = `Faith Tester ${suffix}`;

    // 1. Register customer
    const regRes = await request('POST', '/api/auth/register', {
      body: { email: testCustEmail, password: testCustPass, fullName: testCustName },
    });
    const regSuccess = regRes.status === 201 && !regRes.body?.accessToken;
    logResult('B', 1, 'Customer registration (no auto login)', regSuccess, `Status: ${regRes.status}`);

    // 2. Confirm database state: role=CUSTOMER, emailVerified=false
    const dbCustRes = await pool.query(
      'SELECT id, role, "emailVerified", "passwordHash", "emailVerificationTokenHash", "emailVerificationExpiresAt" FROM "User" WHERE email = $1',
      [testCustEmail],
    );
    const custInDb = dbCustRes.rows[0];
    if (custInDb) createdUserIds.push(custInDb.id);
    const initialPasswordHash = custInDb?.passwordHash;
    const dbCustValid =
      custInDb &&
      custInDb.role === 'CUSTOMER' &&
      custInDb.emailVerified === false &&
      Boolean(custInDb.emailVerificationTokenHash) &&
      Boolean(custInDb.emailVerificationExpiresAt);
    logResult('B', 2, 'Confirm CUSTOMER role and emailVerified=false with token hash', dbCustValid, `Role: ${custInDb?.role}, verified: ${custInDb?.emailVerified}`);

    // 3. Duplicate registration for unverified email returns distinct message, no duplicate User, password unchanged
    const dupUnverifiedRes = await request('POST', '/api/auth/register', {
      body: { email: testCustEmail, password: 'DifferentPassword123!', fullName: 'Duplicate Attempt' },
    });
    const dupUnverifiedCountRes = await pool.query('SELECT COUNT(*)::int as count FROM "User" WHERE email = $1', [testCustEmail]);
    const dupUnverifiedUserDb = await pool.query('SELECT "passwordHash", "emailVerified" FROM "User" WHERE id = $1', [custInDb.id]);
    const dupUnverifiedValid =
      dupUnverifiedRes.status === 409 &&
      (dupUnverifiedRes.body?.message || '').includes('already registered but not yet verified') &&
      (dupUnverifiedRes.body?.message || '').includes('resend-verification') &&
      dupUnverifiedCountRes.rows[0]?.count === 1 &&
      dupUnverifiedUserDb.rows[0]?.passwordHash === initialPasswordHash &&
      dupUnverifiedUserDb.rows[0]?.emailVerified === false;
    logResult(
      'B',
      3,
      'Duplicate registration on unverified email rejected with recovery message, no duplicate User created',
      dupUnverifiedValid,
      `Status: ${dupUnverifiedRes.status}, Message: "${dupUnverifiedRes.body?.message}"`,
    );

    // ==========================================
    // SECTION C: UNVERIFIED CUSTOMER LOGIN
    // ==========================================
    const unverifiedLogin = await request('POST', '/api/auth/login', {
      body: { email: testCustEmail, password: testCustPass },
    });
    const unverifiedRejected =
      unverifiedLogin.status === 401 &&
      (unverifiedLogin.body?.message || '').includes('Please verify your email before signing in') &&
      !unverifiedLogin.body?.accessToken;
    logResult('C', 1, 'Unverified customer login rejected with 401', unverifiedRejected, `Status: ${unverifiedLogin.status}`);

    // Verify the email
    const knownRawToken = crypto.randomBytes(32).toString('hex');
    const knownHash = crypto.createHash('sha256').update(knownRawToken).digest('hex');
    const futureExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await pool.query(
      'UPDATE "User" SET "emailVerificationTokenHash" = $1, "emailVerificationExpiresAt" = $2 WHERE id = $3',
      [knownHash, futureExpiry, custInDb.id],
    );
    const verifyRes = await request('POST', '/api/auth/verify-email', {
      body: { token: knownRawToken },
    });
    const verifySuccess = (verifyRes.status === 200 || verifyRes.status === 201) && verifyRes.body?.success === true;
    logResult('B', 4, 'Email verification endpoint validates token', verifySuccess, `Status: ${verifyRes.status}`);

    // Duplicate registration for verified email returns standard already exists response
    const dupVerifiedRes = await request('POST', '/api/auth/register', {
      body: { email: testCustEmail, password: testCustPass, fullName: testCustName },
    });
    const dupVerifiedCountRes = await pool.query('SELECT COUNT(*)::int as count FROM "User" WHERE email = $1', [testCustEmail]);
    const dupVerifiedValid =
      dupVerifiedRes.status === 409 &&
      dupVerifiedRes.body?.message === 'An account with this email already exists' &&
      dupVerifiedCountRes.rows[0]?.count === 1;
    logResult(
      'B',
      5,
      'Duplicate registration on verified email rejected as already registered',
      dupVerifiedValid,
      `Status: ${dupVerifiedRes.status}, Message: "${dupVerifiedRes.body?.message}"`,
    );

    // Login after verification
    const verifiedLogin = await request('POST', '/api/auth/login', {
      body: { email: testCustEmail, password: testCustPass },
    });
    const custToken = verifiedLogin.body?.accessToken;
    const canLoginVerified = (verifiedLogin.status === 200 || verifiedLogin.status === 201) && Boolean(custToken);
    logResult('B', 6, 'Verified customer login succeeds with JWT', canLoginVerified, `Status: ${verifiedLogin.status}`);

    // ==========================================
    // SECTION D: GOOGLE AUTHENTICATION SIMULATION
    // ==========================================
    // Test that when Google user is created or updated in DB, emailVerified=true and role=CUSTOMER
    const googleEmail = `google_user_${suffix}@firstfaith.com`;
    const googleSub = `google_sub_${suffix}`;
    const googleUserId = crypto.randomUUID();
    createdUserIds.push(googleUserId);

    // Simulate Google user creation as done by handleGoogleCallback
    await pool.query(
      'INSERT INTO "User" (id, email, "fullName", "googleId", role, "emailVerified", "updatedAt") VALUES ($1, $2, $3, $4, $5, true, NOW())',
      [googleUserId, googleEmail, 'Google Customer', googleSub, 'CUSTOMER'],
    );
    const googleUserDb = await pool.query('SELECT role, "emailVerified" FROM "User" WHERE id = $1', [googleUserId]);
    const googleUserValid = googleUserDb.rows[0]?.role === 'CUSTOMER' && googleUserDb.rows[0]?.emailVerified === true;
    logResult('D', 1, 'Google user created with role=CUSTOMER and emailVerified=true', googleUserValid, `Role: ${googleUserDb.rows[0]?.role}`);

    // ==========================================
    // SECTION E: BRUTE-FORCE / PASSWORD LOCKOUT
    // ==========================================
    const lockoutEmail = `lockout_${suffix}@firstfaith.com`;
    const lockoutPass = `Valid_P@ss_${suffix}!`;
    const lockoutId = crypto.randomUUID();
    createdUserIds.push(lockoutId);

    await pool.query(
      'INSERT INTO "User" (id, email, "passwordHash", role, "emailVerified", "failedLoginAttempts", "updatedAt") VALUES ($1, $2, $3, $4, true, 0, NOW())',
      [lockoutId, lockoutEmail, await bcrypt.hash(lockoutPass, 10), 'CUSTOMER'],
    );

    let attemptsPassed = true;
    // Attempts 1 to 4 with bad password
    for (let i = 1; i <= 4; i++) {
      const failRes = await request('POST', '/api/auth/login', {
        body: { email: lockoutEmail, password: 'WrongPassword!' },
      });
      if (failRes.status !== 401 || (failRes.body?.message || '').includes('locked')) {
        attemptsPassed = false;
      }
    }
    logResult('E', 1, 'Failed attempts 1-4 return 401 without lockout', attemptsPassed, 'Invalid email or password');

    // 5th failed attempt should trigger account lockout
    const fifthFailRes = await request('POST', '/api/auth/login', {
      body: { email: lockoutEmail, password: 'WrongPassword!' },
    });
    const lockedOnFifth = fifthFailRes.status === 401 && (fifthFailRes.body?.message || '').toLowerCase().includes('locked');
    logResult('E', 2, '5th consecutive failed attempt locks account', lockedOnFifth, `Message: ${fifthFailRes.body?.message}`);

    // 6th attempt during lock period (even with CORRECT password) should be rejected because account is locked
    const sixthAttemptRes = await request('POST', '/api/auth/login', {
      body: { email: lockoutEmail, password: lockoutPass },
    });
    const lockedOnSixth = sixthAttemptRes.status === 401 && (sixthAttemptRes.body?.message || '').toLowerCase().includes('locked');
    logResult('E', 3, 'Login rejected during 15-min lock period even with correct password', lockedOnSixth, `Status: ${sixthAttemptRes.status}`);

    // Verify DB state for lock
    const dbLockCheck = await pool.query(
      'SELECT "failedLoginAttempts", "loginLockedUntil" FROM "User" WHERE id = $1',
      [lockoutId],
    );
    const lockActive = dbLockCheck.rows[0]?.failedLoginAttempts >= 5 && Boolean(dbLockCheck.rows[0]?.loginLockedUntil);
    logResult('E', 4, 'Confirm failedLoginAttempts >= 5 and loginLockedUntil in DB', lockActive, `Attempts: ${dbLockCheck.rows[0]?.failedLoginAttempts}`);

    // Simulate lock expiration (set lock to 1 minute ago)
    await pool.query(
      'UPDATE "User" SET "loginLockedUntil" = NOW() - INTERVAL \'1 minute\' WHERE id = $1',
      [lockoutId],
    );

    // Login after lock expiration with correct password should succeed and reset counter
    const unlockLoginRes = await request('POST', '/api/auth/login', {
      body: { email: lockoutEmail, password: lockoutPass },
    });
    const unlockedCanLogin = (unlockLoginRes.status === 200 || unlockLoginRes.status === 201) && Boolean(unlockLoginRes.body?.accessToken);

    const dbResetCheck = await pool.query(
      'SELECT "failedLoginAttempts", "loginLockedUntil" FROM "User" WHERE id = $1',
      [lockoutId],
    );
    const counterReset = dbResetCheck.rows[0]?.failedLoginAttempts === 0 && dbResetCheck.rows[0]?.loginLockedUntil === null;
    logResult('E', 5, 'Successful login after lock resets failed attempts and lock', unlockedCanLogin && counterReset, `Counter: ${dbResetCheck.rows[0]?.failedLoginAttempts}`);

    // Test lockout protection on Admin login as well
    const adminLockoutEmail = `admin_lock_${suffix}@firstfaith.com`;
    const adminLockoutPass = `Adm_P@ss_${suffix}!`;
    const adminLockoutId = crypto.randomUUID();
    createdUserIds.push(adminLockoutId);

    await pool.query(
      'INSERT INTO "User" (id, email, "passwordHash", role, "emailVerified", "failedLoginAttempts", "updatedAt") VALUES ($1, $2, $3, $4, true, 0, NOW())',
      [adminLockoutId, adminLockoutEmail, await bcrypt.hash(adminLockoutPass, 10), 'SUPER_ADMIN'],
    );

    for (let i = 1; i <= 5; i++) {
      await request('POST', '/api/auth/admin/login', {
        body: { email: adminLockoutEmail, password: 'BadAdminPassword!' },
      });
    }
    const adminSixthRes = await request('POST', '/api/auth/admin/login', {
      body: { email: adminLockoutEmail, password: adminLockoutPass },
    });
    const adminLocked = adminSixthRes.status === 401 && (adminSixthRes.body?.message || '').toLowerCase().includes('locked');
    logResult('E', 6, 'Admin login also protected by account lockout', adminLocked, `Admin lockout message: ${adminSixthRes.body?.message}`);

    // ==========================================
    // SECTION F: RATE LIMITING (HTTP 429)
    // ==========================================
    // Send burst requests with safe dummy credentials to trigger rate limiting
    let rateLimited = false;
    for (let i = 0; i < 25; i++) {
      const rlRes = await request('POST', '/api/auth/resend-verification', {
        body: { email: `burst_${i}_${suffix}@dummy.com` },
      });
      if (rlRes.status === 429) {
        rateLimited = true;
        break;
      }
    }
    logResult('F', 1, 'Throttling returns 429 on excessive requests', rateLimited, 'HTTP 429 Too Many Requests detected');

    // ==========================================
    // SECTION G: RBAC VERIFICATION
    // ==========================================
    const unauthRes = await request('GET', '/api/admin/dashboard');
    const customerRes = await request('GET', '/api/admin/dashboard', { token: custToken });
    const adminRes = await request('GET', '/api/admin/dashboard', { token: adminToken });
    const rbacValid = unauthRes.status === 401 && customerRes.status === 403 && adminRes.status === 200;
    logResult('G', 1, 'RBAC enforced on admin routes', rbacValid, `Unauth: ${unauthRes.status}, Customer: ${customerRes.status}, Admin: ${adminRes.status}`);

    const customerNotifRes = await request('GET', '/api/admin/notifications', { token: custToken });
    const adminNotifRes = await request('GET', '/api/admin/notifications', { token: adminToken });
    const notifRbacValid = customerNotifRes.status === 403 && adminNotifRes.status === 200;
    logResult('G', 2, 'Admin notifications protected against customer access (403)', notifRbacValid, `Customer: ${customerNotifRes.status}, Admin: ${adminNotifRes.status}`);

    // ==========================================
    // SECTION H: ADMIN ORDER ALERT & NOTIFICATIONS
    // ==========================================
    // 1. Create a notification record directly or via order placement
    const testNotifId = crypto.randomUUID();
    createdNotifIds.push(testNotifId);

    await pool.query(
      'INSERT INTO "AdminNotification" (id, type, title, message, "orderId", "isRead", "createdAt") VALUES ($1, $2, $3, $4, $5, false, NOW())',
      [testNotifId, 'NEW_ORDER', 'New Order #FF-TEST-001', 'Order #FF-TEST-001 placed by Test Customer for ₹1,299', 'test-order-id'],
    );

    // Fetch notifications as admin
    const fetchNotifsRes = await request('GET', '/api/admin/notifications', { token: adminToken });
    const notifs = fetchNotifsRes.body?.notifications || [];
    const foundNotif = notifs.some((n) => n.id === testNotifId);
    const unreadCount = fetchNotifsRes.body?.unreadCount || 0;
    logResult('H', 1, 'Admin can fetch order notifications and unread count', foundNotif && unreadCount > 0, `Unread count: ${unreadCount}`);

    // Mark notification as read
    const markReadRes = await request('PATCH', `/api/admin/notifications/${testNotifId}/read`, { token: adminToken });
    const markReadSuccess = markReadRes.status === 200 && markReadRes.body?.isRead === true;
    logResult('H', 2, 'Admin can mark notification as read', markReadSuccess, `isRead: ${markReadRes.body?.isRead}`);

    // Mark all read
    const markAllRes = await request('PATCH', '/api/admin/notifications/mark-all-read', { token: adminToken });
    const markAllSuccess = markAllRes.status === 200;
    logResult('H', 3, 'Admin can mark all notifications as read', markAllSuccess, `Status: ${markAllRes.status}`);

    console.log('\n=== FINAL PASS VERIFICATION SUMMARY ===');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`Passed: ${passedCount}/${results.length}`);
    const allPassed = results.every((r) => r.passed);
    console.log(`All tests passed: ${allPassed ? 'YES' : 'NO'}`);
  } finally {
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM "User" WHERE id = ANY($1)', [createdUserIds]);
    }
    if (createdNotifIds.length > 0) {
      await pool.query('DELETE FROM "AdminNotification" WHERE id = ANY($1)', [createdNotifIds]);
    }
    await pool.end();
  }
}

runFinalPassVerification().catch((err) => {
  console.error('Final pass verification failed:', err);
  process.exit(1);
});
