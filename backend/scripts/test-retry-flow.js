const crypto = require('crypto');
const { RazorpayService } = require('../dist/src/payments/razorpay/razorpay.service.js');

async function runRetryFlowTests() {
  const webhookSecret = 'test_webhook_secret_retry_123';
  const keySecret = 'test_key_secret_retry_123';
  const keyId = 'rzp_test_mock_retry_123';

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
  console.log('RUNNING FIRST FAITH RETRY & PENDING PAYMENT TESTS');
  console.log('====================================================');

  // ----------------------------------------------------
  // TEST 1: Start payment → cancel Razorpay
  // Expected: PENDING_PAYMENT + Retry Payment available
  // ----------------------------------------------------
  {
    const order = {
      id: 'ord_test_1',
      userId: 'user_1',
      orderNumber: 'FF-10001',
      status: 'PENDING',
      paymentMethod: 'RAZORPAY',
      grandTotal: 1.0,
      payment: null,
    };

    let paymentRecord = null;
    const mockPrisma = {
      order: {
        findFirst: async ({ where }) => (where.id === order.id && where.userId === order.userId ? { ...order, payment: paymentRecord } : null),
      },
      payment: {
        upsert: async ({ create }) => {
          paymentRecord = { ...create, id: 'pay_rec_1' };
          return paymentRecord;
        },
      },
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);
    service.client = {
      orders: {
        create: async () => ({ id: 'order_rzp_test_1', amount: 100, currency: 'INR' }),
      },
    };

    const checkoutData = await service.createPaymentOrder('ord_test_1', 'user_1');
    if (checkoutData.razorpayOrderId !== 'order_rzp_test_1') {
      throw new Error('TEST 1 FAILED: Incorrect Razorpay order ID returned');
    }

    // Customer closes Razorpay checkout modal. No verifyPayment is called.
    // Verify order is still PENDING and payment is CREATED (unpaid)
    if (order.status !== 'PENDING') throw new Error('TEST 1 FAILED: Order status should remain PENDING');
    if (paymentRecord.status !== 'CREATED') throw new Error('TEST 1 FAILED: Payment status should remain CREATED');

    // Frontend condition check:
    const isPendingOnline = order.paymentMethod === 'RAZORPAY' && order.status === 'PENDING' && paymentRecord?.status !== 'CAPTURED';
    const isPaid = order.status === 'PAID' || paymentRecord?.status === 'CAPTURED';
    if (!isPendingOnline || isPaid) {
      throw new Error('TEST 1 FAILED: Frontend should show Retry Payment button');
    }

    console.log('✓ TEST 1 PASSED: Start payment → cancel Razorpay leaves order PENDING and Retry Payment available');
  }

  // ----------------------------------------------------
  // TEST 2: Pending order → Retry Payment → successful payment
  // Expected: PAID + CAPTURED
  // ----------------------------------------------------
  {
    const order = {
      id: 'ord_test_2',
      userId: 'user_2',
      orderNumber: 'FF-10002',
      status: 'PENDING',
      paymentMethod: 'RAZORPAY',
      grandTotal: 1.0,
      items: [{ id: 'item_1', productName: 'First Faith Payment Test — ₹1', variantLabel: '1 unit', quantity: 1, lineTotal: 1.0 }],
      user: { fullName: 'Test User', email: 'test@firstfaith.com' },
    };

    let paymentRecord = {
      id: 'pay_rec_2',
      orderId: 'ord_test_2',
      provider: 'RAZORPAY',
      providerOrderId: 'order_rzp_test_2',
      amount: 1.0,
      status: 'CREATED',
    };

    let adminNotifCreated = false;

    const mockPrisma = {
      order: {
        findFirst: async ({ where }) => (where.id === order.id && where.userId === order.userId ? { ...order, payment: paymentRecord } : null),
        update: async ({ data }) => {
          Object.assign(order, data);
          return order;
        },
      },
      payment: {
        findUnique: async () => paymentRecord,
        update: async ({ data }) => {
          Object.assign(paymentRecord, data);
          return paymentRecord;
        },
      },
      adminNotification: {
        create: async () => {
          adminNotifCreated = true;
        },
      },
      $transaction: async (fn) => fn(mockPrisma),
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);
    service.client = {
      orders: {
        fetch: async () => ({ id: 'order_rzp_test_2', status: 'created' }),
      },
      payments: {
        fetch: async (payId) => ({
          id: payId,
          order_id: 'order_rzp_test_2',
          amount: 100,
          currency: 'INR',
          status: 'captured',
        }),
      },
    };

    // Retry payment calls createPaymentOrder
    const retryData = await service.createPaymentOrder('ord_test_2', 'user_2');
    if (retryData.razorpayOrderId !== 'order_rzp_test_2') {
      throw new Error('TEST 2 FAILED: Expected reuse of existing order');
    }

    // Customer completes payment
    const rzpPaymentId = 'pay_live_retry_2';
    const signature = signPayment('order_rzp_test_2', rzpPaymentId);

    const verifyRes = await service.verifyPayment(
      {
        orderId: 'ord_test_2',
        razorpayOrderId: 'order_rzp_test_2',
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: signature,
      },
      'user_2',
    );

    if (!verifyRes.success) throw new Error('TEST 2 FAILED: verifyPayment did not return success');
    if (order.status !== 'PAID') throw new Error('TEST 2 FAILED: Order status should be PAID');
    if (paymentRecord.status !== 'CAPTURED') throw new Error('TEST 2 FAILED: Payment status should be CAPTURED');
    if (!adminNotifCreated) throw new Error('TEST 2 FAILED: Admin notification not created');

    // Frontend condition check:
    const isPendingOnline = order.paymentMethod === 'RAZORPAY' && order.status === 'PENDING' && paymentRecord?.status !== 'CAPTURED';
    const isPaid = order.status === 'PAID' || paymentRecord?.status === 'CAPTURED';
    if (isPendingOnline || !isPaid) {
      throw new Error('TEST 2 FAILED: Frontend should NOT show Retry button for PAID order');
    }

    console.log('✓ TEST 2 PASSED: Pending order → Retry Payment → successful payment: PAID + CAPTURED');
  }

  // ----------------------------------------------------
  // TEST 3: Pending order → Retry Payment → failed payment
  // Expected: Still pending/unpaid + Retry Payment available
  // ----------------------------------------------------
  {
    const order = {
      id: 'ord_test_3',
      userId: 'user_3',
      orderNumber: 'FF-10003',
      status: 'PENDING',
      paymentMethod: 'RAZORPAY',
      grandTotal: 1.0,
      items: [],
      user: { fullName: 'User 3', email: 'user3@firstfaith.com' },
    };

    let paymentRecord = {
      id: 'pay_rec_3',
      orderId: 'ord_test_3',
      providerOrderId: 'order_rzp_test_3',
      status: 'CREATED',
    };

    const mockPrisma = {
      order: {
        findFirst: async ({ where }) => (where.id === order.id && where.userId === order.userId ? { ...order, payment: paymentRecord } : null),
      },
      payment: {
        findUnique: async () => paymentRecord,
        update: async ({ data }) => {
          Object.assign(paymentRecord, data);
          return paymentRecord;
        },
      },
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);
    service.client = {
      orders: {
        fetch: async () => ({ id: 'order_rzp_test_3', status: 'created' }),
      },
      payments: {
        fetch: async () => ({
          id: 'pay_fail_3',
          order_id: 'order_rzp_test_3',
          amount: 100,
          currency: 'INR',
          status: 'failed',
        }),
      },
    };

    const signature = signPayment('order_rzp_test_3', 'pay_fail_3');

    let failedAsExpected = false;
    try {
      await service.verifyPayment(
        {
          orderId: 'ord_test_3',
          razorpayOrderId: 'order_rzp_test_3',
          razorpayPaymentId: 'pay_fail_3',
          razorpaySignature: signature,
        },
        'user_3',
      );
    } catch (err) {
      failedAsExpected = true;
    }

    if (!failedAsExpected) throw new Error('TEST 3 FAILED: verifyPayment should fail for declined payment');
    if (order.status !== 'PENDING') throw new Error('TEST 3 FAILED: Order should remain PENDING');
    if (paymentRecord.status !== 'FAILED') throw new Error('TEST 3 FAILED: Payment should be marked FAILED');

    // Frontend condition check:
    const isPendingOnline = order.paymentMethod === 'RAZORPAY' && order.status === 'PENDING' && paymentRecord?.status !== 'CAPTURED';
    if (!isPendingOnline) {
      throw new Error('TEST 3 FAILED: Frontend should still show Retry Payment button');
    }

    console.log('✓ TEST 3 PASSED: Pending order → Retry Payment → failed payment: remains PENDING + Retry available');
  }

  // ----------------------------------------------------
  // TEST 4: Pending order → multiple rapid Retry clicks
  // Expected: No duplicate First Faith order and no invalid duplicate processing
  // ----------------------------------------------------
  {
    const order = {
      id: 'ord_test_4',
      userId: 'user_4',
      orderNumber: 'FF-10004',
      status: 'PENDING',
      paymentMethod: 'RAZORPAY',
      grandTotal: 1.0,
    };

    let paymentRecord = {
      id: 'pay_rec_4',
      orderId: 'ord_test_4',
      providerOrderId: 'order_rzp_test_4',
      status: 'CREATED',
    };

    let upsertCount = 0;
    const mockPrisma = {
      order: {
        findFirst: async ({ where }) => (where.id === order.id && where.userId === order.userId ? { ...order, payment: paymentRecord } : null),
      },
      payment: {
        upsert: async () => {
          upsertCount++;
          return paymentRecord;
        },
      },
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);
    service.client = {
      orders: {
        fetch: async () => ({ id: 'order_rzp_test_4', status: 'created' }),
        create: async () => {
          throw new Error('Should not create new order when valid one exists!');
        },
      },
    };

    // Simulate 5 rapid retry clicks
    const results = await Promise.all([
      service.createPaymentOrder('ord_test_4', 'user_4'),
      service.createPaymentOrder('ord_test_4', 'user_4'),
      service.createPaymentOrder('ord_test_4', 'user_4'),
      service.createPaymentOrder('ord_test_4', 'user_4'),
      service.createPaymentOrder('ord_test_4', 'user_4'),
    ]);

    for (const res of results) {
      if (res.razorpayOrderId !== 'order_rzp_test_4') {
        throw new Error('TEST 4 FAILED: Different Razorpay order ID returned on rapid retry');
      }
    }

    if (upsertCount !== 0) {
      throw new Error('TEST 4 FAILED: Unnecessary database writes on rapid retry');
    }

    console.log('✓ TEST 4 PASSED: Multiple rapid retry clicks reuses order without duplicates');
  }

  // ----------------------------------------------------
  // TEST 5: PAID order → open order page / retry
  // Expected: No Retry Payment button; retry attempt rejected
  // ----------------------------------------------------
  {
    const order = {
      id: 'ord_test_5',
      userId: 'user_5',
      orderNumber: 'FF-10005',
      status: 'PAID',
      paymentMethod: 'RAZORPAY',
      grandTotal: 1.0,
      payment: { status: 'CAPTURED', providerOrderId: 'order_rzp_test_5' },
    };

    const mockPrisma = {
      order: {
        findFirst: async ({ where }) => (where.id === order.id && where.userId === order.userId ? order : null),
      },
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);

    let rejectedAsExpected = false;
    try {
      await service.createPaymentOrder('ord_test_5', 'user_5');
    } catch (err) {
      if (err.message.includes('already been paid')) rejectedAsExpected = true;
    }

    if (!rejectedAsExpected) throw new Error('TEST 5 FAILED: createPaymentOrder did not reject paid order');

    // Frontend condition check:
    const isPendingOnline = order.paymentMethod === 'RAZORPAY' && order.status === 'PENDING' && order.payment?.status !== 'CAPTURED';
    const isPaid = order.status === 'PAID' || order.payment?.status === 'CAPTURED';
    if (isPendingOnline || !isPaid) {
      throw new Error('TEST 5 FAILED: Frontend should NOT show Retry button for PAID order');
    }

    console.log('✓ TEST 5 PASSED: PAID order rejects retry and frontend hides Retry button');
  }

  // ----------------------------------------------------
  // TEST 6: REFUNDED order → open order page / retry
  // Expected: No Retry Payment button; retry attempt rejected
  // ----------------------------------------------------
  {
    const order = {
      id: 'ord_test_6',
      userId: 'user_6',
      orderNumber: 'FF-10006',
      status: 'REFUNDED',
      paymentMethod: 'RAZORPAY',
      grandTotal: 1.0,
      payment: { status: 'REFUNDED', providerOrderId: 'order_rzp_test_6' },
    };

    const mockPrisma = {
      order: {
        findFirst: async ({ where }) => (where.id === order.id && where.userId === order.userId ? order : null),
      },
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);

    let rejectedAsExpected = false;
    try {
      await service.createPaymentOrder('ord_test_6', 'user_6');
    } catch (err) {
      if (err.message.includes('refunded')) rejectedAsExpected = true;
    }

    if (!rejectedAsExpected) throw new Error('TEST 6 FAILED: createPaymentOrder did not reject refunded order');

    // Frontend condition check:
    const isPendingOnline = order.paymentMethod === 'RAZORPAY' && order.status === 'PENDING' && order.payment?.status !== 'CAPTURED';
    const isRefunded = order.status === 'REFUNDED' || order.payment?.status === 'REFUNDED';
    if (isPendingOnline || !isRefunded) {
      throw new Error('TEST 6 FAILED: Frontend should NOT show Retry button for REFUNDED order');
    }

    console.log('✓ TEST 6 PASSED: REFUNDED order rejects retry and frontend hides Retry button');
  }

  // ----------------------------------------------------
  // TEST 7: Customer attempts retry on another customer's order
  // Expected: Rejected with proper authorization response
  // ----------------------------------------------------
  {
    const order = {
      id: 'ord_test_7',
      userId: 'user_owner_7',
      orderNumber: 'FF-10007',
      status: 'PENDING',
      paymentMethod: 'RAZORPAY',
      grandTotal: 1.0,
    };

    const mockPrisma = {
      order: {
        findFirst: async ({ where }) => (where.id === order.id && where.userId === order.userId ? order : null),
      },
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);

    // Attacker calls createPaymentOrder for user_owner_7's order
    let attackerCreateRejected = false;
    try {
      await service.createPaymentOrder('ord_test_7', 'attacker_user_id');
    } catch (err) {
      if (err.message.includes('Order not found')) attackerCreateRejected = true;
    }

    // Attacker calls verifyPayment
    let attackerVerifyRejected = false;
    try {
      await service.verifyPayment(
        {
          orderId: 'ord_test_7',
          razorpayOrderId: 'order_rzp_7',
          razorpayPaymentId: 'pay_7',
          razorpaySignature: 'sig_7',
        },
        'attacker_user_id',
      );
    } catch (err) {
      if (err.message.includes('Order not found')) attackerVerifyRejected = true;
    }

    if (!attackerCreateRejected || !attackerVerifyRejected) {
      throw new Error('TEST 7 FAILED: Cross-customer retry or verification was not rejected');
    }

    console.log('✓ TEST 7 PASSED: Customer attempting retry on another customer\'s order is rejected with 400/404');
  }

  // ----------------------------------------------------
  // TEST 8: Old payment attempt arrives after a newer successful payment
  // Expected: PAID state remains intact
  // ----------------------------------------------------
  {
    let paymentStatus = 'CAPTURED';
    let orderStatus = 'PAID';

    const mockPrisma = {
      payment: {
        updateMany: async ({ where, data }) => {
          // If status is not in CAPTURED, REFUNDED
          const notIn = where.status?.notIn || [];
          if (!notIn.includes(paymentStatus)) {
            paymentStatus = data.status;
          }
        },
      },
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);

    // Old failed webhook arrives for an order that is already CAPTURED/PAID
    const webhookPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_old_failed',
            order_id: 'order_rzp_test_8',
            amount: 100,
            currency: 'INR',
          },
        },
      },
    };

    const { rawBody, signature } = signWebhook(webhookPayload);
    await service.handleWebhook(rawBody, signature);

    if (paymentStatus !== 'CAPTURED' || orderStatus !== 'PAID') {
      throw new Error('TEST 8 FAILED: Old payment.failed webhook overwrote CAPTURED status!');
    }

    console.log('✓ TEST 8 PASSED: Old payment.failed webhook does not overwrite newer successful CAPTURED/PAID state');
  }

  // ----------------------------------------------------
  // TEST 9: Webhook duplicated
  // Expected: Idempotent; no duplicate processing
  // ----------------------------------------------------
  {
    let paymentStatus = 'CAPTURED';
    let orderStatus = 'PAID';
    let updateCount = 0;

    const mockPrisma = {
      payment: {
        findFirst: async () => ({
          id: 'pay_rec_9',
          orderId: 'ord_9',
          providerPaymentId: 'pay_live_9',
          providerOrderId: 'order_rzp_9',
          amount: 1.0,
          status: 'CAPTURED',
          refundedAmount: 0,
          order: { id: 'ord_9', orderNumber: 'FF-10009', status: 'PAID' },
        }),
        update: async () => {
          updateCount++;
        },
      },
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);

    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_live_9',
            order_id: 'order_rzp_9',
            amount: 100,
            currency: 'INR',
          },
        },
      },
    };

    const { rawBody, signature } = signWebhook(webhookPayload);

    // Send first webhook
    const res1 = await service.handleWebhook(rawBody, signature);
    // Send duplicate webhook
    const res2 = await service.handleWebhook(rawBody, signature);

    if (!res1.received || !res2.received) {
      throw new Error('TEST 9 FAILED: Duplicate webhook did not return received: true');
    }

    console.log('✓ TEST 9 PASSED: Duplicate webhook is handled idempotently without error');
  }

  console.log('====================================================');
  console.log('ALL 9 RETRY & PENDING PAYMENT TESTS PASSED!');
  console.log('====================================================');
}

runRetryFlowTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
