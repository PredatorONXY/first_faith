const { OrdersService } = require('../dist/src/orders/orders.service.js');
const { OrderStatus, PaymentStatus, PaymentProvider } = require('@prisma/client');

describe('Guest Order Tracking Suite', () => {
  let ordersService;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    ordersService = new OrdersService(mockPrisma, {}, {});
  });

  describe('1. Contact Input Normalization & Validation', () => {
    test('normalizes 10-digit Indian mobile number correctly', () => {
      const res = ordersService.normalizeContact('PHONE', '9876543210');
      expect(res.normalized).toBe('9876543210');
      expect(res.variants).toContain('9876543210');
      expect(res.variants).toContain('+919876543210');
    });

    test('normalizes phone number with +91 prefix and spaces/dashes', () => {
      const res = ordersService.normalizeContact('phone', '+91 98765-43210');
      expect(res.normalized).toBe('9876543210');
      expect(res.variants).toContain('9876543210');
    });

    test('normalizes phone number with leading 0', () => {
      const res = ordersService.normalizeContact('phone', '09876543210');
      expect(res.normalized).toBe('9876543210');
    });

    test('rejects phone numbers that do not match Indian mobile pattern', () => {
      expect(() => ordersService.normalizeContact('PHONE', '1234567890')).toThrow(
        /Please enter a valid 10-digit Indian mobile number/,
      );
      expect(() => ordersService.normalizeContact('PHONE', '98765')).toThrow(
        /Please enter a valid 10-digit Indian mobile number/,
      );
      expect(() => ordersService.normalizeContact('PHONE', 'abcd9876543210')).toThrow(
        /Please enter a valid 10-digit Indian mobile number/,
      );
    });

    test('normalizes email by trimming and converting to lowercase', () => {
      const res = ordersService.normalizeContact('EMAIL', '  Customer.FirstFaith@Example.COM  ');
      expect(res.normalized).toBe('customer.firstfaith@example.com');
      expect(res.variants).toEqual(['customer.firstfaith@example.com']);
    });

    test('rejects invalid email formats', () => {
      expect(() => ordersService.normalizeContact('EMAIL', 'not-an-email')).toThrow(
        /Please enter a valid email address/,
      );
      expect(() => ordersService.normalizeContact('EMAIL', 'customer@')).toThrow(
        /Please enter a valid email address/,
      );
      expect(() => ordersService.normalizeContact('EMAIL', '@domain.com')).toThrow(
        /Please enter a valid email address/,
      );
    });

    test('rejects unsupported lookup type', () => {
      expect(() => ordersService.normalizeContact('AADHAAR', '1234')).toThrow(
        /Lookup type must be phone or email/,
      );
    });
  });

  describe('2. Ephemeral Tracking Token Security', () => {
    test('generates a valid signed tracking token for an order ID', () => {
      const orderId = 'a0000000-0000-0000-0000-000000000001';
      const token = ordersService.generateTrackingToken(orderId);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      const isValid = ordersService.verifyTrackingToken(orderId, token);
      expect(isValid).toBe(true);
    });

    test('rejects tracking token if used against a different order ID', () => {
      const orderId1 = 'a0000000-0000-0000-0000-000000000001';
      const orderId2 = 'b0000000-0000-0000-0000-000000000002';
      const token1 = ordersService.generateTrackingToken(orderId1);

      const isValid = ordersService.verifyTrackingToken(orderId2, token1);
      expect(isValid).toBe(false);
    });

    test('rejects tampered tracking token', () => {
      const orderId = 'a0000000-0000-0000-0000-000000000001';
      const validToken = ordersService.generateTrackingToken(orderId);
      const tamperedToken = validToken.slice(0, -4) + 'abcd';

      const isValid = ordersService.verifyTrackingToken(orderId, tamperedToken);
      expect(isValid).toBe(false);
    });
  });

  describe('3. PII Redaction & Address Masking', () => {
    test('masks customer name, address line 1, postal code, and phone', () => {
      const rawAddress = {
        name: 'Priya Sharma',
        line1: 'Flat 402, Lotus Towers, 5th Main Road',
        line2: 'Near Central Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        phone: '9876543210',
      };

      const masked = ordersService.maskShippingAddress(rawAddress, 'Priya Sharma');
      expect(masked.name).not.toBe('Priya Sharma');
      expect(masked.name).toContain('*');
      expect(masked.line1).not.toBe('Flat 402, Lotus Towers, 5th Main Road');
      expect(masked.city).toBe('Mumbai'); // city remains unmasked for delivery destination confirmation
      expect(masked.state).toBe('Maharashtra');
      expect(masked.postalCode).toBe('400***');
      expect(masked.phone).toBe('******3210');
      expect(masked.isMasked).toBe(true);
    });

    test('handles null or missing address safely', () => {
      const masked = ordersService.maskShippingAddress(null);
      expect(masked).toBeNull();
    });
  });

  describe('4. Order Status Timeline Logic', () => {
    test('maps PENDING status with Placed completed, Payment pending', () => {
      const order = {
        status: OrderStatus.PENDING,
        createdAt: new Date('2026-10-15T10:00:00Z'),
        updatedAt: new Date('2026-10-15T10:00:00Z'),
        payment: { status: PaymentStatus.CREATED, updatedAt: new Date() },
      };

      const timeline = ordersService.buildStatusTimeline(order);
      expect(timeline.isTerminal).toBe(false);
      expect(timeline.stages[0].state).toBe('COMPLETED'); // Placed
      expect(timeline.stages[1].state).toBe('PENDING'); // Payment Confirmed
      expect(timeline.stages[2].state).toBe('PENDING'); // Processing
      expect(timeline.stages[3].state).toBe('PENDING'); // Shipped
      expect(timeline.stages[4].state).toBe('PENDING'); // Delivered
    });

    test('maps PAID status with Payment Confirmed completed', () => {
      const order = {
        status: OrderStatus.PAID,
        createdAt: new Date('2026-10-15T10:00:00Z'),
        updatedAt: new Date('2026-10-15T10:05:00Z'),
        payment: { status: PaymentStatus.CAPTURED, updatedAt: new Date('2026-10-15T10:05:00Z') },
      };

      const timeline = ordersService.buildStatusTimeline(order);
      expect(timeline.stages[0].state).toBe('COMPLETED');
      expect(timeline.stages[1].state).toBe('COMPLETED');
      expect(timeline.stages[2].state).toBe('PENDING');
    });

    test('maps SHIPPED status with Shipped as CURRENT', () => {
      const order = {
        status: OrderStatus.SHIPPED,
        createdAt: new Date('2026-10-15T10:00:00Z'),
        updatedAt: new Date('2026-10-15T14:00:00Z'),
        payment: { status: PaymentStatus.CAPTURED, updatedAt: new Date('2026-10-15T10:05:00Z') },
      };

      const timeline = ordersService.buildStatusTimeline(order);
      expect(timeline.stages[0].state).toBe('COMPLETED');
      expect(timeline.stages[1].state).toBe('COMPLETED');
      expect(timeline.stages[2].state).toBe('COMPLETED');
      expect(timeline.stages[3].state).toBe('CURRENT');
      expect(timeline.stages[4].state).toBe('PENDING');
    });

    test('maps DELIVERED status with all 5 stages completed', () => {
      const order = {
        status: OrderStatus.DELIVERED,
        createdAt: new Date('2026-10-15T10:00:00Z'),
        updatedAt: new Date('2026-10-16T12:00:00Z'),
        payment: { status: PaymentStatus.CAPTURED, updatedAt: new Date('2026-10-15T10:05:00Z') },
      };

      const timeline = ordersService.buildStatusTimeline(order);
      expect(timeline.stages.every((s) => s.state === 'COMPLETED')).toBe(true);
    });

    test('marks CANCELLED and REFUNDED orders as terminal', () => {
      const cancelledOrder = {
        status: OrderStatus.CANCELLED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const cTimeline = ordersService.buildStatusTimeline(cancelledOrder);
      expect(cTimeline.isTerminal).toBe(true);
      expect(cTimeline.terminalStatus).toBe('CANCELLED');

      const refundedOrder = {
        status: OrderStatus.REFUNDED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const rTimeline = ordersService.buildStatusTimeline(refundedOrder);
      expect(rTimeline.isTerminal).toBe(true);
      expect(rTimeline.terminalStatus).toBe('REFUNDED');
    });
  });

  describe('5. Order Lookup & Details Retrieval API', () => {
    test('returns empty list for unrecognized contact without leaking account presence', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await ordersService.trackOrdersLookup({
        type: 'PHONE',
        value: '9876543210',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      expect(result.orders).toEqual([]);
    });

    test('returns matching orders sorted newest first with tracking tokens and no sensitive PII', async () => {
      const mockOrders = [
        {
          id: 'ord-1',
          orderNumber: 'FF-2026-002',
          createdAt: new Date('2026-10-15T12:00:00Z'),
          status: OrderStatus.PAID,
          paymentMethod: PaymentProvider.RAZORPAY,
          grandTotal: '1390.00',
          items: [
            {
              id: 'it-1',
              productName: 'Moroccan Lava Clay Mask',
              variantLabel: '100g',
              quantity: 2,
              unitPrice: '695.00',
              lineTotal: '1390.00',
              isFreeItem: false,
              variant: { product: { slug: 'clay-mask', name: 'Clay Mask', images: [] } },
            },
          ],
          payment: { status: PaymentStatus.CAPTURED, provider: 'RAZORPAY' },
        },
        {
          id: 'ord-2',
          orderNumber: 'FF-2026-001',
          createdAt: new Date('2026-10-14T09:00:00Z'),
          status: OrderStatus.DELIVERED,
          paymentMethod: PaymentProvider.RAZORPAY,
          grandTotal: '695.00',
          items: [
            {
              id: 'it-2',
              productName: 'Clay Mask',
              variantLabel: '100g',
              quantity: 1,
              unitPrice: '695.00',
              lineTotal: '695.00',
              isFreeItem: false,
              variant: { product: { slug: 'clay-mask', name: 'Clay Mask', images: [] } },
            },
          ],
          payment: { status: PaymentStatus.CAPTURED, provider: 'RAZORPAY' },
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await ordersService.trackOrdersLookup({
        type: 'EMAIL',
        value: 'customer@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.orders[0].orderNumber).toBe('FF-2026-002');
      expect(result.orders[0].grandTotal).toBe(1390);
      expect(result.orders[0].trackingToken).toBeDefined();

      // Ensure no raw customer secrets or guest tokens are in the lookup response
      result.orders.forEach((ord) => {
        expect(ord).not.toHaveProperty('guestToken');
        expect(ord).not.toHaveProperty('userId');
        expect(ord).not.toHaveProperty('shippingAddress');
        expect(ord).not.toHaveProperty('customerPhone');
        expect(ord).not.toHaveProperty('customerEmail');
      });
    });

    test('retrieves detailed order with valid tracking token and masked address', async () => {
      const orderId = 'a0000000-0000-0000-0000-000000000001';
      const validToken = ordersService.generateTrackingToken(orderId);

      mockPrisma.order.findUnique.mockResolvedValue({
        id: orderId,
        orderNumber: 'FF-2026-001',
        createdAt: new Date('2026-10-15T10:00:00Z'),
        status: OrderStatus.SHIPPED,
        subtotal: '1220.00',
        discountTotal: '525.00',
        taxableAmount: '588.98',
        taxRate: '18.00',
        taxTotal: '106.02',
        cgst: '53.01',
        sgst: '53.01',
        igst: '0.00',
        shippingFee: '0.00',
        grandTotal: '695.00',
        promotionName: '1+1 Skincare Companion Offer',
        promotionDiscount: '525.00',
        customerName: 'Ananya Verma',
        shippingAddress: {
          name: 'Ananya Verma',
          line1: '123 MG Road, Koramangala',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560034',
          phone: '9876543210',
        },
        items: [
          {
            id: 'item-1',
            productName: 'Moroccan Lava Clay Mask',
            variantLabel: '100g',
            quantity: 1,
            unitPrice: '695.00',
            lineTotal: '695.00',
            isFreeItem: false,
            variant: { product: { slug: 'clay-mask', name: 'Clay Mask', images: [] } },
          },
          {
            id: 'item-2',
            productName: 'Daily Gentle Cleanser',
            variantLabel: '150ml',
            quantity: 1,
            unitPrice: '525.00',
            lineTotal: '0.00',
            isFreeItem: true,
            variant: { product: { slug: 'cleanser', name: 'Cleanser', images: [] } },
          },
        ],
        payment: { status: PaymentStatus.CAPTURED, provider: 'RAZORPAY', updatedAt: new Date() },
      });

      const detail = await ordersService.trackOrderDetail(orderId, validToken);

      expect(detail.orderNumber).toBe('FF-2026-001');
      expect(detail.grandTotal).toBe(695);
      expect(detail.discountTotal).toBe(525);
      expect(detail.taxableAmount).toBe(588.98);
      expect(detail.taxTotal).toBe(106.02);
      expect(detail.promotionName).toBe('1+1 Skincare Companion Offer');
      expect(detail.items.length).toBe(2);
      expect(detail.items[1].isFreeItem).toBe(true);

      // Verify address is masked
      expect(detail.shippingAddress.isMasked).toBe(true);
      expect(detail.shippingAddress.name).not.toBe('Ananya Verma');
      expect(detail.shippingAddress.postalCode).toBe('560***');

      // Verify timeline exists
      expect(detail.timeline.stages.length).toBe(5);
      expect(detail.timeline.stages[3].state).toBe('CURRENT'); // Shipped
    });

    test('rejects detail retrieval if tracking token is invalid or missing', async () => {
      await expect(
        ordersService.trackOrderDetail('a0000000-0000-0000-0000-000000000001', 'bad-token'),
      ).rejects.toThrow(/Order not found or tracking session has expired/);
    });
  });
});
