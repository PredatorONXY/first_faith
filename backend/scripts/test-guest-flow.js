const crypto = require('crypto');
const { CartService } = require('../dist/src/cart/cart.service.js');
const { OrdersService } = require('../dist/src/orders/orders.service.js');
const { RazorpayService } = require('../dist/src/payments/razorpay/razorpay.service.js');
const { AuthService } = require('../dist/src/auth/auth.service.js');
const { Role } = require('@prisma/client');

async function runGuestFlowTests() {
  const webhookSecret = 'test_webhook_secret_guest_123';
  const keySecret = 'test_key_secret_guest_123';
  const keyId = 'rzp_test_mock_guest_123';

  const mockConfig = {
    get: (key) => {
      if (key === 'RAZORPAY_KEY_ID') return keyId;
      if (key === 'RAZORPAY_KEY_SECRET') return keySecret;
      if (key === 'RAZORPAY_WEBHOOK_SECRET') return webhookSecret;
      return null;
    },
  };

  const mockEmail = {
    sendAdminNewOrderEmail: async () => {},
    sendCustomerOrderConfirmationEmail: async () => {},
  };

  function signPayment(orderId, paymentId) {
    return crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  function signWebhook(payloadObj) {
    const rawBody = Buffer.from(JSON.stringify(payloadObj));
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    return { rawBody, signature };
  }

  console.log('====================================================');
  console.log('RUNNING FIRST FAITH GUEST CHECKOUT & SECURITY TESTS');
  console.log('====================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  }

  // ----------------------------------------------------
  // TEST 0A: Concurrent Guest Cart getOrCreateCart Race Condition (Simulation)
  // ----------------------------------------------------
  console.log('\n--- TEST 0A: Concurrent Guest Cart Race Condition (P2002 Simulation) ---');
  {
    const targetSessionToken = 'guest_race_sim_abc123';
    let dbCarts = [];
    let p2002CollisionCount = 0;

    const mockPrisma = {
      cart: {
        findUnique: async ({ where }) => {
          await new Promise((r) => setTimeout(r, 5));
          if (where.sessionToken) {
            return dbCarts.find((c) => c.sessionToken === where.sessionToken) || null;
          }
          return null;
        },
        create: async ({ data }) => {
          await new Promise((r) => setTimeout(r, 5));
          if (dbCarts.some((c) => c.sessionToken === data.sessionToken)) {
            p2002CollisionCount++;
            const err = new Error('Unique constraint failed on the fields: (`sessionToken`)');
            err.code = 'P2002';
            err.meta = { target: ['sessionToken'], modelName: 'Cart' };
            throw err;
          }
          const newCart = {
            id: 'cart_single_created_row',
            sessionToken: data.sessionToken,
            userId: data.userId || null,
            items: [],
          };
          dbCarts.push(newCart);
          return newCart;
        },
      },
    };

    const cartService = new CartService(mockPrisma);

    // Fire 10 concurrent getOrCreateCart requests simultaneously with the SAME sessionToken
    const concurrentRequests = Array.from({ length: 10 }, () =>
      cartService.getOrCreateCart(targetSessionToken),
    );

    const results = await Promise.all(concurrentRequests);

    assert(dbCarts.length === 1, 'Exactly one Cart row exists in database');
    assert(p2002CollisionCount === 9, '9 concurrent requests collided with P2002 and were caught');
    assert(results.length === 10, 'All 10 concurrent requests resolved successfully');
    assert(
      results.every((r) => r.id === 'cart_single_created_row'),
      'All 10 concurrent requests return the exact same cart ID',
    );
    assert(
      results.every((r) => r.sessionToken === targetSessionToken),
      'All 10 concurrent requests return matching sessionToken',
    );
  }

  // ----------------------------------------------------
  // TEST 0B: Re-throw other Prisma/database errors
  // ----------------------------------------------------
  console.log('\n--- TEST 0B: Re-throw non-P2002 database errors ---');
  {
    const mockPrisma = {
      cart: {
        findUnique: async () => null,
        create: async () => {
          const dbErr = new Error('Can not reach database server at 127.0.0.1');
          dbErr.code = 'P1001';
          throw dbErr;
        },
      },
    };

    const cartService = new CartService(mockPrisma);
    let threw = false;
    try {
      await cartService.getOrCreateCart('session_error_test');
    } catch (e) {
      threw = true;
      assert(e.code === 'P1001', 'Non-P2002 Prisma error re-thrown correctly');
    }
    assert(threw, 'getOrCreateCart re-throws non-P2002 errors');
  }

  // ----------------------------------------------------
  // TEST 0C: Live Neon Database Concurrent Race Condition Test
  // ----------------------------------------------------
  if (process.env.DATABASE_URL) {
    console.log('\n--- TEST 0C: Live Neon DB Concurrent getOrCreateCart Test ---');
    const { PrismaService } = require('../dist/src/common/prisma.service.js');
    const realPrisma = new PrismaService();
    const realCartService = new CartService(realPrisma);
    const liveSessionToken = 'live_race_' + crypto.randomBytes(8).toString('hex');

    try {
      const liveResults = await Promise.all([
        realCartService.getOrCreateCart(liveSessionToken),
        realCartService.getOrCreateCart(liveSessionToken),
        realCartService.getOrCreateCart(liveSessionToken),
        realCartService.getOrCreateCart(liveSessionToken),
        realCartService.getOrCreateCart(liveSessionToken),
      ]);

      const liveUniqueIds = new Set(liveResults.map((r) => r.id));
      assert(liveResults.length === 5, 'All 5 live concurrent requests resolved without error');
      assert(liveUniqueIds.size === 1, 'All 5 live concurrent requests returned the identical cart ID');

      const dbRows = await realPrisma.cart.findMany({ where: { sessionToken: liveSessionToken } });
      assert(dbRows.length === 1, 'Exactly one cart row exists in Neon database');

      // Cleanup
      await realPrisma.cart.deleteMany({ where: { sessionToken: liveSessionToken } });
      assert(true, 'Live test cart cleaned up');
    } finally {
      await realPrisma.onModuleDestroy();
    }
  }

  // ----------------------------------------------------
  // TEST 1: Guest order creation validation (incomplete details)
  // ----------------------------------------------------
  console.log('\n--- TEST 1: Validate Incomplete Guest Checkout Data ---');
  {
    const mockPrisma = {
      cart: {
        findUnique: async () => ({
          id: 'cart_guest_1',
          items: [
            {
              id: 'item_1',
              variantId: 'var_1',
              quantity: 1,
              variant: { price: '850', product: { name: 'Sunscreen' }, inventory: { stockQuantity: 10 } },
            },
          ],
        }),
      },
    };

    const ordersService = new OrdersService(mockPrisma, mockEmail);

    // Missing phone
    let threw = false;
    try {
      await ordersService.createOrder({
        sessionToken: 'guest_sess_1',
        customer: { name: 'Ananya Roy', email: 'ananya@example.com', phone: '' },
        shippingAddress: { line1: '123 Marine Drive', city: 'Mumbai', state: 'Maharashtra', postalCode: '400020' },
        paymentMethod: 'RAZORPAY',
      });
    } catch (e) {
      threw = true;
      assert(e.message.includes('complete customer details'), 'Rejects customer with missing phone');
    }
    assert(threw, 'Incomplete customer details threw BadRequestException');

    // Missing shipping address line1
    threw = false;
    try {
      await ordersService.createOrder({
        sessionToken: 'guest_sess_1',
        customer: { name: 'Ananya Roy', email: 'ananya@example.com', phone: '9876543210' },
        shippingAddress: { line1: '', city: 'Mumbai', state: 'Maharashtra', postalCode: '400020' },
        paymentMethod: 'RAZORPAY',
      });
    } catch (e) {
      threw = true;
      assert(e.message.includes('complete shipping address'), 'Rejects incomplete shipping address');
    }
    assert(threw, 'Incomplete address threw BadRequestException');
  }

  // ----------------------------------------------------
  // TEST 2: Successful Guest Order Creation (userId is null, guestToken generated)
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Successful Guest Order Creation ---');
  let createdGuestOrder = null;
  {
    let inventoryStock = 10;
    const mockPrisma = {
      cart: {
        findUnique: async () => ({
          id: 'cart_guest_1',
          items: [
            {
              id: 'item_1',
              variantId: 'var_1',
              quantity: 2,
              variant: {
                isActive: true,
                price: '850',
                sizeLabel: '50ml',
                product: { name: 'Sunscreen', status: 'PUBLISHED' },
                inventory: { stockQuantity: inventoryStock },
              },
            },
          ],
        }),
      },
      order: {
        count: async () => 42,
      },
      $transaction: async (fn) => {
        const tx = {
          order: {
            create: async ({ data }) => {
              createdGuestOrder = {
                id: 'ord_guest_uuid_100',
                ...data,
              };
              return createdGuestOrder;
            },
          },
          inventory: {
            updateMany: async ({ data }) => {
              inventoryStock -= 2;
              return { count: 1 };
            },
          },
          payment: {
            create: async () => ({ id: 'pay_1' }),
          },
          cartItem: {
            deleteMany: async () => ({ count: 1 }),
          },
        };
        return fn(tx);
      },
    };

    const ordersService = new OrdersService(mockPrisma, mockEmail);
    const order = await ordersService.createOrder({
      sessionToken: 'guest_session_xyz',
      customer: { name: 'Ananya Roy', email: 'ananya@example.com', phone: '9876543210' },
      shippingAddress: {
        line1: 'Flat 402, Sea Breeze',
        line2: 'Worli Sea Face',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400018',
        country: 'IN',
      },
      paymentMethod: 'RAZORPAY',
    });

    assert(order.userId === null, 'Guest order has userId = NULL');
    assert(typeof order.guestToken === 'string' && order.guestToken.length > 20, 'Unguessable guestToken generated');
    assert(order.customerEmail === 'ananya@example.com', 'Customer email preserved on order');
    assert(order.customerName === 'Ananya Roy', 'Customer name preserved on order');
    assert(order.grandTotal === 1700, 'Subtotal and grandTotal calculated correctly server-side (850 x 2)');
    assert(order.shippingAddress.line1 === 'Flat 402, Sea Breeze', 'Shipping address correctly stored');
  }

  // ----------------------------------------------------
  // TEST 3: Razorpay Create Payment Order with guestToken
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Razorpay createPaymentOrder with guestToken ---');
  let razorpayOrderIdGenerated = 'order_rzp_guest_999';
  {
    let paymentRecord = null;
    const mockPrisma = {
      order: {
        findFirst: async ({ where }) => {
          if (where.id === createdGuestOrder.id) {
            if (where.guestToken === createdGuestOrder.guestToken || where.userId === createdGuestOrder.userId) {
              return { ...createdGuestOrder, payment: paymentRecord };
            }
          }
          return null;
        },
      },
      payment: {
        upsert: async ({ create }) => {
          paymentRecord = { ...create, id: 'pay_record_1' };
          return paymentRecord;
        },
      },
    };

    const razorpayService = new RazorpayService(mockConfig, mockPrisma, mockEmail);
    razorpayService.client = {
      orders: {
        create: async (params) => {
          assert(params.amount === 170000, 'Amount in paise correctly sent to Razorpay (1700 x 100)');
          assert(params.currency === 'INR', 'Currency INR sent');
          return { id: razorpayOrderIdGenerated, amount: params.amount, currency: 'INR' };
        },
      },
    };

    // Case A: Create payment order with valid guestToken
    const paymentOrder = await razorpayService.createPaymentOrder({
      orderId: createdGuestOrder.id,
      guestToken: createdGuestOrder.guestToken,
    });
    assert(paymentOrder.razorpayOrderId === razorpayOrderIdGenerated, 'Razorpay order created with guestToken');
    assert(paymentOrder.amount === 170000, 'Payment amount returned accurately');

    // Case B: Access without guestToken or userId fails
    let threw = false;
    try {
      await razorpayService.createPaymentOrder({
        orderId: createdGuestOrder.id,
        guestToken: 'invalid_wrong_token',
      });
    } catch (e) {
      threw = true;
      assert(e.message.includes('not found') || e.message.includes('unauthorized'), 'Unauthorized access rejected');
    }
    assert(threw, 'Payment creation rejected for invalid guestToken');
  }

  // ----------------------------------------------------
  // TEST 4: Razorpay verifyPayment with guestToken
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Razorpay verifyPayment with guestToken ---');
  {
    const mockPaymentId = 'pay_rzp_mock_111';
    const validSignature = signPayment(razorpayOrderIdGenerated, mockPaymentId);
    const invalidSignature = 'invalid_sha256_sig_bad';

    let orderStatusUpdated = null;
    let paymentStatusUpdated = null;

    const mockPrisma = {
      order: {
        findFirst: async ({ where }) => {
          if (where.id === createdGuestOrder.id && where.guestToken === createdGuestOrder.guestToken) {
            return {
              ...createdGuestOrder,
              payment: {
                id: 'pay_rec_1',
                providerOrderId: razorpayOrderIdGenerated,
                amount: 1700,
                status: 'CREATED',
              },
            };
          }
          return null;
        },
      },
      payment: {
        findUnique: async () => ({
          id: 'pay_rec_1',
          orderId: createdGuestOrder.id,
          providerOrderId: razorpayOrderIdGenerated,
          amount: 1700,
          status: 'CREATED',
        }),
        update: async () => ({ id: 'pay_rec_1', status: 'FAILED' }),
      },
      $transaction: async (fn) => {
        const tx = {
          order: {
            update: async ({ data }) => {
              orderStatusUpdated = data.status;
              return { ...createdGuestOrder, status: data.status };
            },
          },
          payment: {
            update: async ({ data }) => {
              paymentStatusUpdated = data.status;
              return { id: 'pay_rec_1', ...data };
            },
          },
          adminNotification: {
            create: async () => ({ id: 'notif_1' }),
          },
        };
        return fn(tx);
      },
    };

    const razorpayService = new RazorpayService(mockConfig, mockPrisma, mockEmail);
    razorpayService.client = {
      payments: {
        fetch: async (id) => {
          assert(id === mockPaymentId, 'Fetched correct payment ID from gateway');
          return {
            id: mockPaymentId,
            order_id: razorpayOrderIdGenerated,
            amount: 170000,
            currency: 'INR',
            status: 'captured',
          };
        },
      },
    };

    // Case A: Reject invalid signature
    let threw = false;
    try {
      await razorpayService.verifyPayment({
        orderId: createdGuestOrder.id,
        guestToken: createdGuestOrder.guestToken,
        razorpayPaymentId: mockPaymentId,
        razorpayOrderId: razorpayOrderIdGenerated,
        razorpaySignature: invalidSignature,
      });
    } catch (e) {
      threw = true;
      assert(e.message.includes('signature') || e.message.includes('Invalid'), 'Rejects invalid payment signature');
    }
    assert(threw, 'Invalid signature rejected');
    assert(orderStatusUpdated === null, 'Order was NOT marked paid with invalid signature');

    // Case B: Accept valid signature
    const verifyRes = await razorpayService.verifyPayment({
      orderId: createdGuestOrder.id,
      guestToken: createdGuestOrder.guestToken,
      razorpayPaymentId: mockPaymentId,
      razorpayOrderId: razorpayOrderIdGenerated,
      razorpaySignature: validSignature,
    });
    assert(verifyRes.success === true, 'verifyPayment returned success: true');
    assert(orderStatusUpdated === 'PAID', 'Order status transitioned to PAID');
    assert(paymentStatusUpdated === 'CAPTURED', 'Payment status transitioned to CAPTURED');
  }

  // ----------------------------------------------------
  // TEST 5: Order viewing security for guests (OrdersService.findOne)
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Order viewing security for guestToken ---');
  {
    const mockPrisma = {
      order: {
        findUnique: async ({ where }) => {
          if (where.id === createdGuestOrder.id) {
            return {
              ...createdGuestOrder,
              status: 'PAID',
              items: [],
              payment: { status: 'CAPTURED' },
            };
          }
          return null;
        },
      },
    };

    const ordersService = new OrdersService(mockPrisma, mockEmail);

    // Case A: Valid guestToken
    const guestView = await ordersService.findOne(createdGuestOrder.id, createdGuestOrder.guestToken, undefined, false);
    assert(guestView.id === createdGuestOrder.id, 'Guest can view own order using guestToken');
    assert(guestView.customerEmail === 'ananya@example.com', 'Guest details visible to token holder');

    // Case B: Unauthenticated user without token
    let threw = false;
    try {
      await ordersService.findOne(createdGuestOrder.id, undefined, undefined, false);
    } catch (e) {
      threw = true;
      assert(e.status === 403 || e.status === 404, 'Forbidden/Not found for unauthenticated viewer without token');
    }
    assert(threw, 'Cannot view guest order without token');

    // Case C: Unauthenticated user with incorrect token
    threw = false;
    try {
      await ordersService.findOne(createdGuestOrder.id, 'wrong_token_guess', undefined, false);
    } catch (e) {
      threw = true;
      assert(e.status === 403 || e.status === 404, 'Forbidden/Not found for viewer with wrong token');
    }
    assert(threw, 'Cannot view guest order with wrong token');

    // Case D: Admin can view any order without token
    const adminView = await ordersService.findOne(createdGuestOrder.id, undefined, 'admin_user_id', true);
    assert(adminView.id === createdGuestOrder.id, 'Admin can view guest order without guest token');
  }

  // ----------------------------------------------------
  // TEST 6: Admin Dashboard Order Listing with Null User
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Admin dashboard displays guest order without crashing ---');
  {
    const { AdminService } = require('../dist/src/admin/admin.service.js');
    const mockOrders = [
      // Legacy order with user
      {
        id: 'ord_legacy_1',
        orderNumber: 'FF-10001',
        userId: 'user_1',
        customerName: null,
        customerEmail: null,
        user: { id: 'user_1', fullName: 'Legacy Customer', email: 'legacy@example.com' },
        address: { line1: 'Old Street' },
        shippingAddress: null,
        items: [],
        payment: { status: 'CAPTURED', provider: 'RAZORPAY' },
      },
      // New guest order without user
      {
        id: 'ord_guest_1',
        orderNumber: 'FF-10002',
        userId: null,
        customerName: 'Guest Shopper',
        customerEmail: 'guest@example.com',
        user: null,
        address: null,
        shippingAddress: { line1: 'Guest Road', city: 'Delhi' },
        items: [],
        payment: { status: 'CAPTURED', provider: 'RAZORPAY' },
      },
    ];

    const mockPrisma = {
      order: {
        findMany: async () => mockOrders,
        findUnique: async ({ where }) => mockOrders.find((o) => o.id === where.id) || null,
        count: async () => 2,
      },
      user: {
        count: async () => 1,
      },
      product: {
        count: async () => 10,
      },
      inventory: {
        findMany: async () => [],
      },
    };

    const adminService = new AdminService(mockPrisma);
    const ordersList = await adminService.orders();
    assert(ordersList.length === 2, 'Admin retrieved both legacy and guest orders');
    assert(ordersList[0].user !== null, 'Legacy order has user');
    assert(ordersList[1].user === null, 'Guest order has user = null');
    assert(ordersList[1].customerName === 'Guest Shopper', 'Guest order retains customer name');

    const guestOrderDetail = await adminService.order('ord_guest_1');
    assert(guestOrderDetail.id === 'ord_guest_1', 'Admin can view guest order details');
  }

  // ----------------------------------------------------
  // TEST 7: Admin Authentication Lockout
  // ----------------------------------------------------
  console.log('\n--- TEST 7: Admin Authentication 5-attempt lockout ---');
  {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('CorrectAdminPassword123!', 10);
    const adminUser = {
      id: 'admin_1',
      email: 'admin@firstfaith.in',
      passwordHash: hashedPassword,
      role: Role.ADMIN,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      emailVerified: true,
    };

    let userInDb = { ...adminUser };
    const mockPrisma = {
      user: {
        findUnique: async ({ where }) => {
          if (where.email === userInDb.email) return userInDb;
          return null;
        },
        update: async ({ where, data }) => {
          userInDb = { ...userInDb, ...data };
          return userInDb;
        },
      },
    };

    const mockJwt = {
      sign: () => 'mock_admin_jwt_token',
    };

    const authService = new AuthService(mockPrisma, mockJwt, mockEmail);

    // Fail 4 times
    for (let i = 1; i <= 4; i++) {
      let threw = false;
      try {
        await authService.adminLogin('admin@firstfaith.in', 'WrongPassword!');
      } catch (e) {
        threw = true;
      }
      assert(threw, `Attempt ${i} rejected`);
      assert(userInDb.failedLoginAttempts === i, `Failed attempts recorded as ${i}`);
      assert(userInDb.loginLockedUntil === null, `Not locked out yet at ${i} attempts`);
    }

    // 5th failed attempt locks out for 15 minutes
    let threw = false;
    try {
      await authService.adminLogin('admin@firstfaith.in', 'WrongPassword!');
    } catch (e) {
      threw = true;
      assert(e.message.includes('locked') || e.message.includes('Too many'), 'Lockout message returned');
    }
    assert(threw, 'Attempt 5 triggered lockout');
    assert(userInDb.failedLoginAttempts === 5, 'Failed attempts is 5');
    assert(userInDb.loginLockedUntil !== null, 'loginLockedUntil timestamp is set');
    assert(new Date(userInDb.loginLockedUntil).getTime() > Date.now(), 'Lockout is in the future');

    // Attempting with CORRECT password while locked out MUST STILL BE REJECTED
    threw = false;
    try {
      await authService.adminLogin('admin@firstfaith.in', 'CorrectAdminPassword123!');
    } catch (e) {
      threw = true;
      assert(e.message.includes('locked') || e.message.includes('Too many'), 'Correct password rejected while active lock is in effect');
    }
    assert(threw, 'Active lock cannot be bypassed even with correct password');
  }

  console.log('\n====================================================');
  console.log(`ALL GUEST CHECKOUT & SECURITY SUITE TESTS PASSED! (${passedTests}/${totalTests})`);
  console.log('====================================================');
}

runGuestFlowTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
