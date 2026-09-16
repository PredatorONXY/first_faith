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
    const req = transport.request(url, {
      method,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 15000,
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = raw ? JSON.parse(raw) : undefined; } catch { parsed = raw; }
        resolve({ status: res.statusCode || 0, body: parsed });
      });
    });
    req.on('timeout', () => req.destroy(new Error('Timed out')));
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString, max: 1 });
  const results = [];

  function record(testNum, title, passed, note = '') {
    results.push({ test: testNum, title, status: passed ? 'PASS' : 'FAIL', note });
    console.log(`[Test ${testNum}] ${title}: ${passed ? 'PASS' : 'FAIL'} ${note ? `(${note})` : ''}`);
  }

  const createdUserIds = [];

  try {
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const testEmail = `cust_${randomSuffix}@firstfaith.com`;
    const testPassword = `Passw0rd_${randomSuffix}!`;
    const testName = `Faith Customer ${randomSuffix}`;

    // 1. Normal customer registration
    const regRes = await request('POST', '/api/auth/register', {
      body: { email: testEmail, password: testPassword, fullName: testName }
    });
    record(1, 'Normal customer registration', regRes.status === 201, `Status: ${regRes.status}`);

    // 2. Confirm CUSTOMER role
    const dbUserRes = await pool.query(
      'SELECT id, email, role, "emailVerified", "emailVerificationTokenHash", "emailVerificationExpiresAt" FROM "User" WHERE email = $1',
      [testEmail]
    );
    const userInDb = dbUserRes.rows[0];
    if (userInDb) createdUserIds.push(userInDb.id);
    const isCustomer = userInDb && userInDb.role === 'CUSTOMER';
    record(2, 'Confirm CUSTOMER role', isCustomer, `Role: ${userInDb?.role}`);

    // 3. Confirm no automatic login
    const noToken = !regRes.body?.accessToken && userInDb?.emailVerified === false;
    record(3, 'Confirm no automatic login', noToken, 'No accessToken returned, emailVerified is false');

    // 4. Confirm verification email token hash and expiry stored
    const hasTokenHash = Boolean(userInDb?.emailVerificationTokenHash && userInDb.emailVerificationTokenHash.length === 64);
    const hasExpiry = Boolean(userInDb?.emailVerificationExpiresAt);
    record(4, 'Confirm verification token hash and expiry stored', hasTokenHash && hasExpiry, 'Hash length 64, expires in ~30m');

    // 5. Test login BEFORE verification (Must reject with "Please verify your email before signing in.")
    const unverifiedLoginRes = await request('POST', '/api/auth/login', {
      body: { email: testEmail, password: testPassword }
    });
    const unverifiedRejected = unverifiedLoginRes.status === 401 &&
      (unverifiedLoginRes.body?.message || '').includes('Please verify your email before signing in');
    record(5, 'Reject login before email verification', unverifiedRejected, `Status: ${unverifiedLoginRes.status}`);

    // 6. Click Verify Email (simulating customer clicking the email link with the raw token)
    const knownRawToken = crypto.randomBytes(32).toString('hex');
    const knownHash = crypto.createHash('sha256').update(knownRawToken).digest('hex');
    const futureExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await pool.query(
      'UPDATE "User" SET "emailVerificationTokenHash" = $1, "emailVerificationExpiresAt" = $2 WHERE id = $3',
      [knownHash, futureExpiry, userInDb.id]
    );

    const verifyRes = await request('POST', '/api/auth/verify-email', {
      body: { token: knownRawToken }
    });
    record(6, 'Click Verify Email', verifyRes.status === 200 || verifyRes.status === 201, `Status: ${verifyRes.status}`);

    // 7. Confirm account becomes verified
    const dbVerifiedCheck = await pool.query(
      'SELECT "emailVerified", "emailVerificationTokenHash", "emailVerificationExpiresAt" FROM "User" WHERE id = $1',
      [userInDb.id]
    );
    const isNowVerified = dbVerifiedCheck.rows[0]?.emailVerified === true &&
      dbVerifiedCheck.rows[0]?.emailVerificationTokenHash === null &&
      dbVerifiedCheck.rows[0]?.emailVerificationExpiresAt === null;
    record(7, 'Confirm account becomes verified', isNowVerified, 'emailVerified=true, tokenHash=null, expiresAt=null');

    // 8. Login after verification
    const verifiedLoginRes = await request('POST', '/api/auth/login', {
      body: { email: testEmail, password: testPassword }
    });
    const customerToken = verifiedLoginRes.body?.accessToken;
    const canLogin = (verifiedLoginRes.status === 200 || verifiedLoginRes.status === 201) && Boolean(customerToken);
    record(8, 'Login after verification', canLogin, `Status: ${verifiedLoginRes.status}`);

    // 9. Test invalid token
    const invalidTokenRes = await request('POST', '/api/auth/verify-email', {
      body: { token: 'completely_bogus_token_12345' }
    });
    record(9, 'Test invalid token', invalidTokenRes.status === 400, `Status: ${invalidTokenRes.status}`);

    // 10. Test expired token
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
    const pastExpiry = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
    await pool.query(
      'UPDATE "User" SET "emailVerificationTokenHash" = $1, "emailVerificationExpiresAt" = $2 WHERE id = $3',
      [expiredHash, pastExpiry, userInDb.id]
    );
    const expiredRes = await request('POST', '/api/auth/verify-email', {
      body: { token: expiredToken }
    });
    record(10, 'Test expired token', expiredRes.status === 400, `Status: ${expiredRes.status}`);

    // 11. Test reused token
    const reusedRes = await request('POST', '/api/auth/verify-email', {
      body: { token: knownRawToken }
    });
    record(11, 'Test reused token', reusedRes.status === 400, `Status: ${reusedRes.status}`);

    // 12. Test resend verification
    const testEmail2 = `unver_${randomSuffix}@firstfaith.com`;
    const reg2Res = await request('POST', '/api/auth/register', {
      body: { email: testEmail2, password: testPassword, fullName: 'Unverified Customer' }
    });
    const dbUser2 = await pool.query('SELECT id FROM "User" WHERE email = $1', [testEmail2]);
    if (dbUser2.rows[0]) createdUserIds.push(dbUser2.rows[0].id);

    const resendRes = await request('POST', '/api/auth/resend-verification', {
      body: { email: testEmail2 }
    });
    record(12, 'Test resend verification', resendRes.status === 200 || resendRes.status === 201, `Status: ${resendRes.status}`);

    // 13. Test duplicate email
    const duplicateRes = await request('POST', '/api/auth/register', {
      body: { email: testEmail, password: testPassword, fullName: 'Duplicate' }
    });
    record(13, 'Test duplicate email', duplicateRes.status === 409, `Status: ${duplicateRes.status}`);

    // 14. Test invalid email
    const invalidEmailRes = await request('POST', '/api/auth/register', {
      body: { email: 'not-an-email', password: testPassword }
    });
    record(14, 'Test invalid email', invalidEmailRes.status === 400, `Status: ${invalidEmailRes.status}`);

    // 15. Test weak password
    const weakPassRes = await request('POST', '/api/auth/register', {
      body: { email: `weak_${randomSuffix}@firstfaith.com`, password: 'short' }
    });
    record(15, 'Test weak password', weakPassRes.status === 400, `Status: ${weakPassRes.status}`);

    // 16. Test role injection
    const roleInjectRes = await request('POST', '/api/auth/register', {
      body: { email: `hacker_${randomSuffix}@firstfaith.com`, password: testPassword, role: 'ADMIN' }
    });
    record(16, 'Test role injection', roleInjectRes.status === 400, `Status: ${roleInjectRes.status}`);

    // 17. Test Account Details / Edit Profile
    const updateProfileRes = await request('PATCH', '/api/auth/profile', {
      token: customerToken,
      body: { fullName: 'Faith Updated Name', phone: '9876543210' }
    });
    const profileUpdated = updateProfileRes.status === 200 && updateProfileRes.body?.fullName === 'Faith Updated Name';
    record(17, 'Test Account Details/Edit Profile', profileUpdated, `Name: ${updateProfileRes.body?.fullName}`);

    // 18. Test Address CRUD and Ownership
    const addAddrRes = await request('POST', '/api/auth/addresses', {
      token: customerToken,
      body: {
        label: 'Home',
        line1: '123 Natural Skincare St',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN',
        phone: '9876543210',
        isDefault: true,
      }
    });
    const addrId = addAddrRes.body?.id;
    const addrAdded = addAddrRes.status === 201 && Boolean(addrId);

    const updateAddrRes = await request('PATCH', `/api/auth/addresses/${addrId}`, {
      token: customerToken,
      body: { label: 'Primary Residence' }
    });
    const addrUpdated = updateAddrRes.status === 200 && updateAddrRes.body?.label === 'Primary Residence';

    // Customer B tries to read/update/delete Customer A's address
    const customerBEmail = `cust_b_${randomSuffix}@firstfaith.com`;
    const customerBId = crypto.randomUUID();
    createdUserIds.push(customerBId);
    await pool.query(
      'INSERT INTO "User" (id, email, "passwordHash", role, "emailVerified", "updatedAt") VALUES ($1, $2, $3, $4, true, NOW())',
      [customerBId, customerBEmail, await bcrypt.hash(testPassword, 10), 'CUSTOMER']
    );
    const loginBRes = await request('POST', '/api/auth/login', {
      body: { email: customerBEmail, password: testPassword }
    });
    const tokenB = loginBRes.body?.accessToken;

    const crossUpdateRes = await request('PATCH', `/api/auth/addresses/${addrId}`, {
      token: tokenB,
      body: { label: 'Hacked Residence' }
    });
    const crossDeleteRes = await request('DELETE', `/api/auth/addresses/${addrId}`, {
      token: tokenB
    });
    const ownershipProtected = crossUpdateRes.status === 404 && crossDeleteRes.status === 400;

    const deleteAddrRes = await request('DELETE', `/api/auth/addresses/${addrId}`, {
      token: customerToken
    });
    record(18, 'Test address CRUD and ownership', addrAdded && addrUpdated && ownershipProtected && deleteAddrRes.status === 200,
      `Add: ${addAddrRes.status}, Update: ${updateAddrRes.status}, Cross: ${crossUpdateRes.status}/${crossDeleteRes.status}, Del: ${deleteAddrRes.status}`
    );

    // 19. Test Wishlist
    const productRow = await pool.query('SELECT id, name FROM "Product" WHERE status = \'PUBLISHED\' LIMIT 1');
    const productId = productRow.rows[0]?.id;

    let wishlistPassed = false;
    if (productId) {
      const addWishRes = await request('POST', '/api/wishlist', {
        token: customerToken,
        body: { productId }
      });
      const getWishRes = await request('GET', '/api/wishlist', { token: customerToken });
      const inWishlist = Array.isArray(getWishRes.body) && getWishRes.body.some(w => w.productId === productId);

      // Customer B should NOT see Customer A's wishlist
      const getWishBRes = await request('GET', '/api/wishlist', { token: tokenB });
      const isolated = Array.isArray(getWishBRes.body) && !getWishBRes.body.some(w => w.productId === productId);

      const delWishRes = await request('DELETE', `/api/wishlist/${productId}`, { token: customerToken });
      wishlistPassed = addWishRes.status === 201 && inWishlist && isolated && delWishRes.status === 200;
    }
    record(19, 'Test wishlist', wishlistPassed, `ProductId: ${productId}`);

    // 20. Test Order History endpoint
    const ordersRes = await request('GET', '/api/orders', { token: customerToken });
    const ordersAccessible = ordersRes.status === 200 && Array.isArray(ordersRes.body);
    record(20, 'Test order history endpoint', ordersAccessible, `Orders fetched: ${ordersRes.body?.length}`);

    // 21. Test empty order state
    const emptyStatePassed = ordersAccessible && ordersRes.body.length === 0;
    record(21, 'Test empty order state', emptyStatePassed, `Count: ${ordersRes.body?.length}`);

    // 22. Test logout / unauthenticated access protection
    const noAuthMeRes = await request('GET', '/api/auth/me');
    record(22, 'Test logout / unauthenticated protection', noAuthMeRes.status === 401, `Status: ${noAuthMeRes.status}`);

    // 23. Confirm admin login still works
    const adminTestEmail = `admin_test_${randomSuffix}@firstfaith.com`;
    const adminTestPass = `Adm1n_Pass_${randomSuffix}!`;
    const adminTestId = crypto.randomUUID();
    createdUserIds.push(adminTestId);
    await pool.query(
      'INSERT INTO "User" (id, email, "passwordHash", role, "emailVerified", "updatedAt") VALUES ($1, $2, $3, $4, true, NOW())',
      [adminTestId, adminTestEmail, await bcrypt.hash(adminTestPass, 10), 'SUPER_ADMIN']
    );

    const adminLoginRes = await request('POST', '/api/auth/admin/login', {
      body: { email: adminTestEmail, password: adminTestPass }
    });
    const adminToken = adminLoginRes.body?.accessToken;
    const adminLoginPassed = (adminLoginRes.status === 200 || adminLoginRes.status === 201) && Boolean(adminToken);
    record(23, 'Confirm admin login still works', adminLoginPassed, `Status: ${adminLoginRes.status}`);

    // 24. Confirm customer cannot access /admin, but admin can
    const customerAdminRes = await request('GET', '/api/admin/dashboard', {
      token: customerToken
    });
    const adminDashboardRes = await request('GET', '/api/admin/dashboard', {
      token: adminToken
    });
    const rbacEnforced = customerAdminRes.status === 403 && adminDashboardRes.status === 200;
    record(24, 'Confirm customer cannot access /admin', rbacEnforced, `Customer: ${customerAdminRes.status}, Admin: ${adminDashboardRes.status}`);

    console.log('\n=== ALL VERIFICATION TESTS FINISHED ===');
    const passedCount = results.filter(r => r.status === 'PASS').length;
    console.log(`Passed: ${passedCount}/${results.length}`);
  } finally {
    // Cleanup test users created during automated test run
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM "User" WHERE id = ANY($1)', [createdUserIds]);
    }
    await pool.end();
  }
}

runTests().catch(console.error);
