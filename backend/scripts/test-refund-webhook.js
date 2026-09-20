const crypto = require('crypto');
const { RazorpayService } = require('../dist/src/payments/razorpay/razorpay.service.js');

async function runRefundWebhookTests() {
  const secret = 'test_webhook_secret_xyz123';
  const mockConfig = {
    get: (key) => {
      if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_mock123';
      if (key === 'RAZORPAY_KEY_SECRET') return 'test_key_secret_123';
      if (key === 'RAZORPAY_WEBHOOK_SECRET') return secret;
      return null;
    },
  };

  const mockEmail = {
    sendAdminNewOrderEmail: async () => {},
  };

  function signPayload(payloadObj, keySecret = secret) {
    const rawBody = Buffer.from(JSON.stringify(payloadObj));
    const signature = crypto.createHmac('sha256', keySecret).update(rawBody).digest('hex');
    return { rawBody, signature };
  }

  // --- Test Case 1: Invalid webhook signature ---
  {
    const mockPrisma = {};
    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);
    const { rawBody } = signPayload({ event: 'refund.processed' });
    try {
      await service.handleWebhook(rawBody, 'invalid_signature_hex');
      throw new Error('FAIL: handleWebhook accepted invalid signature!');
    } catch (err) {
      if (!err.message.includes('Invalid webhook signature')) throw err;
      console.log('TEST 1 PASSED: Invalid webhook signature rejected');
    }
  }

  // --- Test Case 2: Unknown payment ID ---
  {
    const mockPrisma = {
      payment: {
        findFirst: async () => null,
      },
    };
    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);
    const payload = {
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_unknown_123',
            amount: 10000,
            currency: 'INR',
            payment_id: 'pay_unknown_123',
          },
        },
        payment: {
          entity: {
            id: 'pay_unknown_123',
            order_id: 'order_unknown_123',
            amount: 10000,
            currency: 'INR',
          },
        },
      },
    };
    const { rawBody, signature } = signPayload(payload);
    const res = await service.handleWebhook(rawBody, signature);
    if (!res.received) throw new Error('FAIL: Unknown payment did not return received: true!');
    console.log('TEST 2 PASSED: Unknown payment safely ignored with received: true');
  }

  // --- Test Case 3: Full refund webhook synchronization ---
  {
    let paymentUpdated = null;
    let orderUpdated = null;
    let notifCreated = null;

    let dbPayment = {
      id: 'pay_rec_1',
      orderId: 'ord_1',
      providerPaymentId: 'pay_live_123',
      providerOrderId: 'order_live_123',
      amount: 100.0, // ₹100
      refundedAmount: 0,
      providerRefundId: null,
      status: 'CAPTURED',
      rawWebhookPayload: null,
      order: {
        id: 'ord_1',
        orderNumber: 'FF-10001',
        status: 'PAID',
      },
    };

    const mockPrisma = {
      payment: {
        findFirst: async () => dbPayment,
        update: async ({ data }) => {
          paymentUpdated = data;
          dbPayment = { ...dbPayment, ...data };
          return dbPayment;
        },
      },
      order: {
        update: async ({ data }) => {
          orderUpdated = data;
          return { ...dbPayment.order, ...data };
        },
      },
      adminNotification: {
        create: async ({ data }) => {
          notifCreated = data;
          return { id: 'notif_1', ...data };
        },
      },
      $transaction: async (fn) => fn(mockPrisma),
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);
    const payload = {
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_full_001',
            amount: 10000, // 10000 paise = ₹100
            currency: 'INR',
            payment_id: 'pay_live_123',
            created_at: 1726850000,
          },
        },
        payment: {
          entity: {
            id: 'pay_live_123',
            order_id: 'order_live_123',
            amount: 10000,
            currency: 'INR',
            amount_refunded: 10000,
            status: 'refunded',
          },
        },
      },
    };

    const { rawBody, signature } = signPayload(payload);
    const res = await service.handleWebhook(rawBody, signature);

    if (!res.received) throw new Error('FAIL: handleWebhook did not return received: true');
    if (paymentUpdated.status !== 'REFUNDED') throw new Error(`FAIL: Payment status is ${paymentUpdated.status}, expected REFUNDED`);
    if (Number(paymentUpdated.refundedAmount) !== 100.0) throw new Error(`FAIL: Refunded amount is ${paymentUpdated.refundedAmount}, expected 100.0`);
    if (paymentUpdated.providerRefundId !== 'rfnd_full_001') throw new Error('FAIL: providerRefundId not saved');
    if (orderUpdated.status !== 'REFUNDED') throw new Error(`FAIL: Order status is ${orderUpdated.status}, expected REFUNDED`);
    if (!notifCreated || notifCreated.type !== 'ORDER_REFUND') throw new Error('FAIL: AdminNotification not created');

    console.log('TEST 3 PASSED: Full refund correctly updates Payment to REFUNDED and Order to REFUNDED');

    // --- Test Case 4: Duplicate refund webhook (idempotency) ---
    paymentUpdated = null;
    orderUpdated = null;
    const dupRes = await service.handleWebhook(rawBody, signature);
    if (!dupRes.received) throw new Error('FAIL: duplicate webhook failed');
    if (paymentUpdated !== null || orderUpdated !== null) throw new Error('FAIL: duplicate webhook re-updated database!');
    console.log('TEST 4 PASSED: Duplicate refund webhook handled idempotently without re-processing');
  }

  // --- Test Case 5: Refund amount mismatch / exceeds payment ---
  {
    const dbPayment = {
      id: 'pay_rec_2',
      orderId: 'ord_2',
      providerPaymentId: 'pay_live_222',
      providerOrderId: 'order_live_222',
      amount: 50.0, // ₹50
      refundedAmount: 0,
      status: 'CAPTURED',
      order: { id: 'ord_2', orderNumber: 'FF-10002', status: 'PAID' },
    };

    const mockPrisma = {
      payment: {
        findFirst: async () => dbPayment,
      },
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);
    const payload = {
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_excess_001',
            amount: 99900, // ₹999 exceeds ₹50 payment!
            currency: 'INR',
            payment_id: 'pay_live_222',
          },
        },
        payment: {
          entity: {
            id: 'pay_live_222',
            order_id: 'order_live_222',
            amount: 5000,
            currency: 'INR',
          },
        },
      },
    };

    const { rawBody, signature } = signPayload(payload);
    try {
      await service.handleWebhook(rawBody, signature);
      throw new Error('FAIL: handleWebhook accepted excessive refund amount!');
    } catch (err) {
      if (!err.message.includes('Invalid refund amount') && !err.message.includes('exceeds')) throw err;
      console.log('TEST 5 PASSED: Refund exceeding payment amount rejected with 400');
    }
  }

  // --- Test Case 6: Partial refund lifecycle (2 partial refunds) ---
  {
    let paymentUpdates = [];
    let orderUpdates = [];

    let dbPayment = {
      id: 'pay_rec_3',
      orderId: 'ord_3',
      providerPaymentId: 'pay_live_333',
      providerOrderId: 'order_live_333',
      amount: 100.0, // ₹100
      refundedAmount: 0,
      providerRefundId: null,
      status: 'CAPTURED',
      rawWebhookPayload: null,
      order: { id: 'ord_3', orderNumber: 'FF-10003', status: 'PAID' },
    };

    const mockPrisma = {
      payment: {
        findFirst: async () => dbPayment,
        update: async ({ data }) => {
          paymentUpdates.push(data);
          dbPayment = { ...dbPayment, ...data };
          return dbPayment;
        },
      },
      order: {
        update: async ({ data }) => {
          orderUpdates.push(data);
          return { ...dbPayment.order, ...data };
        },
      },
      adminNotification: {
        create: async () => ({ id: 'notif_p' }),
      },
      $transaction: async (fn) => fn(mockPrisma),
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);

    // Partial Refund 1: ₹40 out of ₹100
    const partial1 = {
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_part_001',
            amount: 4000, // ₹40
            currency: 'INR',
            payment_id: 'pay_live_333',
          },
        },
        payment: {
          entity: {
            id: 'pay_live_333',
            order_id: 'order_live_333',
            amount: 10000,
            amount_refunded: 4000,
            currency: 'INR',
          },
        },
      },
    };

    const { rawBody: rb1, signature: sig1 } = signPayload(partial1);
    await service.handleWebhook(rb1, sig1);

    if (dbPayment.status !== 'CAPTURED') throw new Error(`FAIL: Status changed to ${dbPayment.status} on partial refund, expected CAPTURED`);
    if (Number(dbPayment.refundedAmount) !== 40.0) throw new Error(`FAIL: refundedAmount is ${dbPayment.refundedAmount}, expected 40.0`);
    if (orderUpdates.length !== 0) throw new Error('FAIL: Order status was updated on partial refund!');
    console.log('TEST 6A PASSED: First partial refund (₹40/₹100) preserves CAPTURED & PAID status and records refundedAmount');

    // Partial Refund 2: remaining ₹60 out of ₹100
    const partial2 = {
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_part_002',
            amount: 6000, // ₹60
            currency: 'INR',
            payment_id: 'pay_live_333',
          },
        },
        payment: {
          entity: {
            id: 'pay_live_333',
            order_id: 'order_live_333',
            amount: 10000,
            amount_refunded: 10000,
            currency: 'INR',
          },
        },
      },
    };

    const { rawBody: rb2, signature: sig2 } = signPayload(partial2);
    await service.handleWebhook(rb2, sig2);

    if (dbPayment.status !== 'REFUNDED') throw new Error(`FAIL: Status is ${dbPayment.status}, expected REFUNDED`);
    if (Number(dbPayment.refundedAmount) !== 100.0) throw new Error(`FAIL: refundedAmount is ${dbPayment.refundedAmount}, expected 100.0`);
    if (orderUpdates.length !== 1 || orderUpdates[0].status !== 'REFUNDED') throw new Error('FAIL: Order status was not updated to REFUNDED on final partial refund');
    console.log('TEST 6B PASSED: Second partial refund completes full refund, transitions Payment & Order to REFUNDED');
  }

  // --- Test Case 7: refund.created followed by refund.processed for same refund ID ---
  {
    let updateCount = 0;
    let dbPayment = {
      id: 'pay_rec_4',
      orderId: 'ord_4',
      providerPaymentId: 'pay_live_444',
      providerOrderId: 'order_live_444',
      amount: 1.0, // ₹1
      refundedAmount: 0,
      providerRefundId: null,
      status: 'CAPTURED',
      rawWebhookPayload: null,
      order: { id: 'ord_4', orderNumber: 'FF-10004', status: 'PAID' },
    };

    const mockPrisma = {
      payment: {
        findFirst: async () => dbPayment,
        update: async ({ data }) => {
          updateCount++;
          dbPayment = { ...dbPayment, ...data };
          return dbPayment;
        },
      },
      order: { update: async () => ({}) },
      adminNotification: { create: async () => ({}) },
      $transaction: async (fn) => fn(mockPrisma),
    };

    const service = new RazorpayService(mockConfig, mockPrisma, mockEmail);

    const eventCreated = {
      event: 'refund.created',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_same_001',
            amount: 100, // ₹1
            currency: 'INR',
            payment_id: 'pay_live_444',
          },
        },
        payment: {
          entity: {
            id: 'pay_live_444',
            order_id: 'order_live_444',
            amount: 100,
            amount_refunded: 100,
            currency: 'INR',
          },
        },
      },
    };

    const eventProcessed = {
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_same_001',
            amount: 100,
            currency: 'INR',
            payment_id: 'pay_live_444',
          },
        },
        payment: {
          entity: {
            id: 'pay_live_444',
            order_id: 'order_live_444',
            amount: 100,
            amount_refunded: 100,
            currency: 'INR',
          },
        },
      },
    };

    const { rawBody: rbc, signature: sigc } = signPayload(eventCreated);
    await service.handleWebhook(rbc, sigc);
    if (updateCount !== 1) throw new Error('FAIL: refund.created did not update payment');

    const { rawBody: rbp, signature: sigp } = signPayload(eventProcessed);
    await service.handleWebhook(rbp, sigp);
    if (updateCount !== 1) throw new Error('FAIL: refund.processed re-updated payment for same refund ID!');

    console.log('TEST 7 PASSED: refund.created followed by refund.processed with same refund ID is idempotent');
  }

  console.log('\n>>> ALL 7 REFUND WEBHOOK TESTS PASSED SUCCESSFULLY! <<<');
}

runRefundWebhookTests().catch((err) => {
  console.error('REFUND WEBHOOK TEST ERROR:', err);
  process.exit(1);
});
