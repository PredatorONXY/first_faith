const { EmailService } = require('../dist/src/common/email/email.service.js');
const { RazorpayService } = require('../dist/src/payments/razorpay/razorpay.service.js');
const { PaymentStatus, OrderStatus, PaymentProvider } = require('@prisma/client');
const crypto = require('crypto');

describe('Resend Email Notification Integration Tests', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const createMockConfig = (env = {}) => ({
    get: (key) => env[key] !== undefined ? env[key] : null,
  });

  describe('EmailService Unit Tests', () => {
    test('1. Fails safely when RESEND_API_KEY is not configured', async () => {
      const config = createMockConfig({});
      const emailService = new EmailService(config);

      const result = await emailService.sendAdminNewOrderEmail({
        orderId: 'ord_1',
        orderNumber: 'FF-10001',
        customerEmail: 'test@example.com',
        orderDate: new Date(),
        itemCount: 1,
        totalAmount: 695,
        paymentStatus: PaymentStatus.CAPTURED,
        orderStatus: OrderStatus.PAID,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('RESEND_API_KEY not configured');
    });

    test('2. Successfully dispatches admin order alert with complete persisted data', async () => {
      let capturedRequest = null;
      global.fetch = jest.fn(async (url, options) => {
        capturedRequest = { url, options, body: JSON.parse(options.body) };
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'resend_msg_12345' }),
        };
      });

      const config = createMockConfig({
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: 'First Faith <orders@firstfaith.in>',
        ADMIN_NOTIFICATION_EMAIL: 'officialfirstfaith@gmail.com',
        FRONTEND_URL: 'https://firstfaith.in',
      });

      const emailService = new EmailService(config);
      const orderDate = new Date('2026-10-12T10:00:00Z');

      const result = await emailService.sendAdminNewOrderEmail({
        orderId: 'order_uuid_100',
        orderNumber: 'FF-2026-001',
        customerName: 'Ananya Sharma',
        customerEmail: 'ananya@example.com',
        customerPhone: '+91 9876543210',
        shippingAddress: {
          name: 'Ananya Sharma',
          line1: 'Flat 402, Lotus Greens',
          line2: 'Sector 150',
          city: 'Noida',
          state: 'Uttar Pradesh',
          postalCode: '201310',
          country: 'IN',
          phone: '+91 9876543210',
        },
        paymentMethod: 'RAZORPAY',
        orderDate,
        itemCount: 2,
        items: [
          {
            productName: 'Clarifying Clay Mask',
            variantLabel: '100g',
            quantity: 1,
            unitPrice: 695,
            lineTotal: 695,
            isFreeItem: false,
          },
          {
            productName: 'Gentle Hydrating Cleanser',
            variantLabel: '150ml',
            quantity: 1,
            unitPrice: 525,
            lineTotal: 0,
            isFreeItem: true,
          },
        ],
        promotionName: 'FIRST FAITH 1+1 SKINCARE OFFER',
        promotionDiscount: 525,
        appliedOffers: [
          {
            offerName: '1+1 Clay Mask + Cleanser',
            buyProductName: 'Clarifying Clay Mask',
            freeProductName: 'Gentle Hydrating Cleanser',
            freeQuantity: 1,
            discount: 525,
          },
        ],
        subtotal: 1220,
        taxableAmount: 588.98,
        taxTotal: 106.02,
        cgst: 0,
        sgst: 0,
        igst: 106.02,
        shippingFee: 0,
        totalAmount: 695,
        paymentStatus: PaymentStatus.CAPTURED,
        orderStatus: OrderStatus.PAID,
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('resend_msg_12345');
      expect(capturedRequest.url).toBe('https://api.resend.com/emails');
      expect(capturedRequest.options.headers.Authorization).toBe('Bearer re_test_key');
      expect(capturedRequest.body.from).toBe('First Faith <orders@firstfaith.in>');
      expect(capturedRequest.body.to).toEqual(['officialfirstfaith@gmail.com']);
      expect(capturedRequest.body.subject).toContain('FF-2026-001');

      const html = capturedRequest.body.html;
      // Persisted details
      expect(html).toContain('FF-2026-001');
      expect(html).toContain('order_uuid_100');
      expect(html).toContain('Ananya Sharma');
      expect(html).toContain('ananya@example.com');
      expect(html).toContain('+91 9876543210');
      expect(html).toContain('Flat 402, Lotus Greens');
      expect(html).toContain('Noida, Uttar Pradesh, 201310');
      // Products & 1+1 Promotion
      expect(html).toContain('Clarifying Clay Mask');
      expect(html).toContain('Gentle Hydrating Cleanser');
      expect(html).toContain('1+1 FREE');
      expect(html).toContain('FIRST FAITH 1+1 SKINCARE OFFER');
      expect(html).toContain('-₹525.00');
      // Taxes & Total
      expect(html).toContain('₹588.98'); // Taxable
      expect(html).toContain('₹106.02'); // GST
      expect(html).toContain('IGST 18%: ₹106.02');
      expect(html).toContain('FREE (₹0.00)'); // Shipping
      expect(html).toContain('₹695.00'); // Final paid amount
      expect(html).toContain('CAPTURED');
      expect(html).toContain('PAID');
      expect(html).toContain('https://firstfaith.in/admin/orders/order_uuid_100');
    });

    test('3. Prevents duplicate alert dispatches for the same orderId', async () => {
      let callCount = 0;
      global.fetch = jest.fn(async () => {
        callCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: `resend_${callCount}` }),
        };
      });

      const config = createMockConfig({
        RESEND_API_KEY: 're_test_key',
        EMAIL_FROM: 'First Faith <onboarding@resend.dev>',
        ADMIN_ALERT_EMAIL: 'officialfirstfaith@gmail.com',
      });

      const emailService = new EmailService(config);
      const data = {
        orderId: 'duplicate_check_order_id',
        orderNumber: 'FF-DUP-01',
        customerEmail: 'dup@example.com',
        orderDate: new Date(),
        itemCount: 1,
        totalAmount: 695,
        paymentStatus: PaymentStatus.CAPTURED,
        orderStatus: OrderStatus.PAID,
      };

      const res1 = await emailService.sendAdminNewOrderEmail(data);
      expect(res1.success).toBe(true);
      expect(res1.messageId).toBe('resend_1');
      expect(callCount).toBe(1);

      // Second invocation for the same order ID
      const res2 = await emailService.sendAdminNewOrderEmail(data);
      expect(res2.success).toBe(true);
      expect(res2.duplicate).toBe(true);
      expect(callCount).toBe(1); // fetch was NOT called again
    });

    test('4. Handles Resend HTTP 403 Forbidden sandbox restriction safely without throwing', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({
          name: 'validation_error',
          statusCode: 403,
          message: 'You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain at resend.com/domains.',
        }),
      }));

      const config = createMockConfig({
        RESEND_API_KEY: 're_sandbox_key',
        EMAIL_FROM: 'First Faith <onboarding@resend.dev>',
        ADMIN_ALERT_EMAIL: 'officialfirstfaith@gmail.com',
      });

      const emailService = new EmailService(config);

      const result = await emailService.sendAdminNewOrderEmail({
        orderId: 'sandbox_order_403',
        orderNumber: 'FF-403',
        customerEmail: 'customer@example.com',
        orderDate: new Date(),
        itemCount: 1,
        totalAmount: 695,
        paymentStatus: PaymentStatus.CAPTURED,
        orderStatus: OrderStatus.PAID,
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toContain('verify a domain');
    });

    test('5. Handles Resend network exception safely without throwing', async () => {
      global.fetch = jest.fn(async () => {
        throw new Error('fetch failed: ECONNREFUSED');
      });

      const config = createMockConfig({
        RESEND_API_KEY: 're_net_key',
      });

      const emailService = new EmailService(config);

      const result = await emailService.sendAdminNewOrderEmail({
        orderId: 'net_fail_order',
        orderNumber: 'FF-NET',
        customerEmail: 'customer@example.com',
        orderDate: new Date(),
        itemCount: 1,
        totalAmount: 695,
        paymentStatus: PaymentStatus.CAPTURED,
        orderStatus: OrderStatus.PAID,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('fetch failed: ECONNREFUSED');
    });
  });

  describe('RazorpayService & Webhook Email Triggering', () => {
    let mockPrisma;
    let mockEmailService;
    let sentEmails;
    const webhookSecret = 'test_webhook_secret_123';

    beforeEach(() => {
      sentEmails = [];
      mockEmailService = {
        sendAdminNewOrderEmail: jest.fn(async (data) => {
          sentEmails.push(data);
          return { success: true };
        }),
      };

      const orderStore = {
        id: 'ord_rzp_1',
        orderNumber: 'FF-RZP-999',
        customerName: 'Rohit Verma',
        customerEmail: 'rohit@example.com',
        customerPhone: '+91 9999988888',
        status: OrderStatus.PENDING,
        subtotal: 695,
        taxableAmount: 588.98,
        taxTotal: 106.02,
        cgst: 53.01,
        sgst: 53.01,
        igst: 0,
        shippingFee: 0,
        grandTotal: 695,
        paymentMethod: PaymentProvider.RAZORPAY,
        shippingAddress: {
          line1: 'MG Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
        },
        items: [
          {
            productName: 'Clay Mask',
            variantLabel: '100g',
            quantity: 1,
            unitPrice: 695,
            lineTotal: 695,
            isFreeItem: false,
          },
        ],
        createdAt: new Date(),
      };

      const paymentStore = {
        id: 'pay_rzp_1',
        orderId: 'ord_rzp_1',
        providerOrderId: 'order_rzp_ext_1',
        providerPaymentId: null,
        status: PaymentStatus.CREATED,
        amount: 695,
      };

      const notificationsStore = [];

      mockPrisma = {
        order: {
          findFirst: jest.fn(async () => ({ ...orderStore })),
          findUnique: jest.fn(async () => ({ ...orderStore })),
          update: jest.fn(async ({ data }) => {
            Object.assign(orderStore, data);
            return { ...orderStore };
          }),
        },
        payment: {
          findUnique: jest.fn(async () => ({ ...paymentStore })),
          findFirst: jest.fn(async () => ({ ...paymentStore })),
          update: jest.fn(async ({ data }) => {
            Object.assign(paymentStore, data);
            return { ...paymentStore };
          }),
          updateMany: jest.fn(async ({ where, data }) => {
            if (where.status && where.status.not === PaymentStatus.CAPTURED && paymentStore.status === PaymentStatus.CAPTURED) {
              return { count: 0 };
            }
            Object.assign(paymentStore, data);
            return { count: 1 };
          }),
        },
        adminNotification: {
          create: jest.fn(async ({ data }) => {
            notificationsStore.push(data);
            return data;
          }),
        },
        $transaction: jest.fn(async (callback) => callback(mockPrisma)),
      };
    });

    test('6. Payment verification triggers email with complete GST and delivery details', async () => {
      const config = createMockConfig({
        RAZORPAY_KEY_ID: 'rzp_test_key',
        RAZORPAY_KEY_SECRET: 'rzp_test_secret',
      });

      const razorpayService = new RazorpayService(config, mockPrisma, mockEmailService);
      razorpayService.client = {
        payments: {
          fetch: jest.fn(async () => ({
            id: 'pay_ext_1',
            order_id: 'order_rzp_ext_1',
            amount: 69500,
            currency: 'INR',
            status: 'captured',
          })),
        },
      };

      const signature = crypto
        .createHmac('sha256', 'rzp_test_secret')
        .update('order_rzp_ext_1|pay_ext_1')
        .digest('hex');

      const res = await razorpayService.verifyPayment(
        {
          orderId: 'ord_rzp_1',
          razorpayOrderId: 'order_rzp_ext_1',
          razorpayPaymentId: 'pay_ext_1',
          razorpaySignature: signature,
        },
        'user_1',
      );

      expect(res.success).toBe(true);
      expect(mockEmailService.sendAdminNewOrderEmail).toHaveBeenCalledTimes(1);
      const emailPayload = sentEmails[0];
      expect(emailPayload.orderId).toBe('ord_rzp_1');
      expect(emailPayload.orderNumber).toBe('FF-RZP-999');
      expect(emailPayload.totalAmount).toBe(695);
      expect(emailPayload.taxableAmount).toBe(588.98);
      expect(emailPayload.taxTotal).toBe(106.02);
      expect(emailPayload.cgst).toBe(53.01);
      expect(emailPayload.sgst).toBe(53.01);
      expect(emailPayload.shippingAddress.line1).toBe('MG Road');
      expect(emailPayload.paymentStatus).toBe(PaymentStatus.CAPTURED);
      expect(emailPayload.orderStatus).toBe(OrderStatus.PAID);
    });

    test('7. Duplicate payment verification does NOT trigger duplicate email', async () => {
      const config = createMockConfig({
        RAZORPAY_KEY_ID: 'rzp_test_key',
        RAZORPAY_KEY_SECRET: 'rzp_test_secret',
      });

      const razorpayService = new RazorpayService(config, mockPrisma, mockEmailService);
      razorpayService.client = {
        payments: {
          fetch: jest.fn(async () => ({
            id: 'pay_ext_1',
            order_id: 'order_rzp_ext_1',
            amount: 69500,
            currency: 'INR',
            status: 'captured',
          })),
        },
      };

      const signature = crypto
        .createHmac('sha256', 'rzp_test_secret')
        .update('order_rzp_ext_1|pay_ext_1')
        .digest('hex');

      // First verification
      await razorpayService.verifyPayment(
        {
          orderId: 'ord_rzp_1',
          razorpayOrderId: 'order_rzp_ext_1',
          razorpayPaymentId: 'pay_ext_1',
          razorpaySignature: signature,
        },
        'user_1',
      );
      expect(mockEmailService.sendAdminNewOrderEmail).toHaveBeenCalledTimes(1);

      // Second verification (idempotency check)
      const res2 = await razorpayService.verifyPayment(
        {
          orderId: 'ord_rzp_1',
          razorpayOrderId: 'order_rzp_ext_1',
          razorpayPaymentId: 'pay_ext_1',
          razorpaySignature: signature,
        },
        'user_1',
      );

      expect(res2.alreadyProcessed).toBe(true);
      expect(mockEmailService.sendAdminNewOrderEmail).toHaveBeenCalledTimes(1); // STILL 1
    });

    test('8. Webhook handles payment.captured and duplicate webhook does NOT resend email', async () => {
      const config = createMockConfig({
        RAZORPAY_WEBHOOK_SECRET: webhookSecret,
      });

      const razorpayService = new RazorpayService(config, mockPrisma, mockEmailService);

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_ext_1',
              order_id: 'order_rzp_ext_1',
              amount: 69500,
              currency: 'INR',
            },
          },
        },
      };

      const rawBody = Buffer.from(JSON.stringify(payload));
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      // First webhook delivery
      const res1 = await razorpayService.handleWebhook(rawBody, signature);
      expect(res1).toBeDefined();
      expect(mockEmailService.sendAdminNewOrderEmail).toHaveBeenCalledTimes(1);

      // Duplicate webhook delivery
      const res2 = await razorpayService.handleWebhook(rawBody, signature);
      expect(res2.received).toBe(true);
      expect(mockEmailService.sendAdminNewOrderEmail).toHaveBeenCalledTimes(1); // STILL 1
    });
  });
});
