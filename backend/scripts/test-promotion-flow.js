const crypto = require('crypto');
const { CartService } = require('../dist/src/cart/cart.service.js');
const { OrdersService } = require('../dist/src/orders/orders.service.js');
const { RazorpayService } = require('../dist/src/payments/razorpay/razorpay.service.js');
const { PromotionEngine } = require('../dist/src/common/promotions/promotion.engine.js');
const { OrderStatus, PaymentStatus, PaymentProvider } = require('@prisma/client');

async function runPromotionFlowTests() {
  console.log('================================================================');
  console.log('FIRST FAITH 1+1 SKINCARE PROMOTION & RESEND EMAIL SUITE TESTS');
  console.log('================================================================\n');

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

  // Define catalog items matching database
  const catalog = {
    clayMask: {
      id: 'var_clay_mask',
      price: 695,
      sizeLabel: '100g',
      product: { id: 'prod_clay', slug: 'clay-mask', name: 'Clay Mask', status: 'PUBLISHED' },
      inventory: { stockQuantity: 50 },
      isActive: true,
    },
    cleanser: {
      id: 'var_cleanser',
      price: 525,
      sizeLabel: '100ml',
      product: { id: 'prod_clean', slug: 'cleanser', name: 'Cleanser', status: 'PUBLISHED' },
      inventory: { stockQuantity: 50 },
      isActive: true,
    },
    bodyButter: {
      id: 'var_body_butter',
      price: 625,
      sizeLabel: '200g',
      product: { id: 'prod_butter', slug: 'body-butter', name: 'Body Butter', status: 'PUBLISHED' },
      inventory: { stockQuantity: 50 },
      isActive: true,
    },
    serum: {
      id: 'var_serum',
      price: 675,
      sizeLabel: '30ml',
      product: { id: 'prod_serum', slug: 'serum', name: 'Serum', status: 'PUBLISHED' },
      inventory: { stockQuantity: 50 },
      isActive: true,
    },
    sunscreen: {
      id: 'var_sunscreen',
      price: 795,
      sizeLabel: '50g',
      product: { id: 'prod_sun', slug: 'sunscreen', name: 'Sunscreen', status: 'PUBLISHED' },
      inventory: { stockQuantity: 50 },
      isActive: true,
    },
  };

  // Build in-memory Mock Prisma Service
  function createMockPrisma() {
    let carts = [];
    let cartItems = [];
    let orders = [];
    let orderItems = [];
    let payments = [];
    let inventories = {
      var_clay_mask: 50,
      var_cleanser: 50,
      var_body_butter: 50,
      var_serum: 50,
      var_sunscreen: 50,
    };

    const mockPrisma = {
      _data: { carts, cartItems, orders, orderItems, payments, inventories },
      cart: {
        findUnique: async ({ where }) => {
          let found = null;
          if (where.sessionToken) found = carts.find((c) => c.sessionToken === where.sessionToken);
          if (where.id) found = carts.find((c) => c.id === where.id);
          if (where.userId) found = carts.find((c) => c.userId === where.userId);
          if (!found) return null;
          const items = cartItems
            .filter((i) => i.cartId === found.id)
            .map((i) => {
              const variant = Object.values(catalog).find((v) => v.id === i.variantId);
              return {
                ...i,
                variant: {
                  ...variant,
                  inventory: { stockQuantity: inventories[variant.id] },
                },
              };
            });
          return { ...found, items };
        },
        create: async ({ data }) => {
          const newCart = { id: `cart_${Date.now()}_${Math.random()}`, ...data };
          carts.push(newCart);
          return { ...newCart, items: [] };
        },
        update: async ({ where, data }) => {
          const cart = carts.find((c) => c.id === where.id);
          if (cart) Object.assign(cart, data);
          return cart;
        },
      },
      cartItem: {
        findFirst: async ({ where }) => {
          const it = cartItems.find((i) => i.id === where.id && (!where.cartId || i.cartId === where.cartId));
          if (!it) return null;
          const variant = Object.values(catalog).find((v) => v.id === it.variantId);
          return {
            ...it,
            variant: { ...variant, inventory: { stockQuantity: inventories[variant.id] } },
          };
        },
        upsert: async ({ where, create, update }) => {
          let item = cartItems.find((i) => i.cartId === (where.cartId_variantId?.cartId || create.cartId) && i.variantId === (where.cartId_variantId?.variantId || create.variantId));
          if (item) {
            if (update.quantity?.increment) {
              item.quantity += update.quantity.increment;
            } else if (typeof update.quantity === 'number') {
              item.quantity = update.quantity;
            }
          } else {
            item = { id: `item_${Date.now()}_${Math.random()}`, ...create };
            cartItems.push(item);
          }
          return item;
        },
        update: async ({ where, data }) => {
          const item = cartItems.find((i) => i.id === where.id);
          if (item) Object.assign(item, data);
          return item;
        },
        delete: async ({ where }) => {
          const idx = cartItems.findIndex((i) => i.id === where.id);
          if (idx >= 0) cartItems.splice(idx, 1);
          return {};
        },
        deleteMany: async ({ where }) => {
          cartItems = cartItems.filter((i) => i.cartId !== where.cartId);
          return {};
        },
      },
      product: {
        findUnique: async ({ where }) => {
          const v = Object.values(catalog).find((item) => item.product.slug === where.slug);
          if (!v) return null;
          return {
            ...v.product,
            variants: [{ ...v, isDefault: true, inventory: { stockQuantity: inventories[v.id] } }],
          };
        },
      },
      productVariant: {
        findUnique: async ({ where }) => {
          const v = Object.values(catalog).find((item) => item.id === where.id);
          if (!v) return null;
          return {
            ...v,
            inventory: { stockQuantity: inventories[v.id] },
          };
        },
      },
      inventory: {
        updateMany: async ({ where, data }) => {
          const vId = where.variantId;
          if (inventories[vId] !== undefined && inventories[vId] >= (where.stockQuantity?.gte || 0)) {
            inventories[vId] -= data.stockQuantity.decrement;
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
      coupon: {
        findUnique: async () => null,
      },
      couponUsage: {
        create: async () => ({}),
        count: async () => 0,
      },
      order: {
        create: async ({ data, include }) => {
          const ordId = `ord_${Date.now()}_${Math.random()}`;
          const created = { id: ordId, createdAt: new Date(), ...data };
          orders.push(created);
          if (data.items?.create) {
            data.items.create.forEach((it) => {
              orderItems.push({ id: `ord_item_${Date.now()}_${Math.random()}`, orderId: ordId, ...it });
            });
          }
          if (include?.items) {
            created.items = orderItems.filter((i) => i.orderId === ordId);
          }
          return created;
        },
        findFirst: async ({ where, include }) => {
          const ord = orders.find((o) => o.id === where.id && (where.guestToken ? o.guestToken === where.guestToken : true));
          if (!ord) return null;
          const res = { ...ord };
          if (include?.items) {
            res.items = orderItems.filter((i) => i.orderId === ord.id);
          }
          if (include?.payment) {
            res.payment = payments.find((p) => p.orderId === ord.id);
          }
          return res;
        },
        findUnique: async ({ where, include }) => {
          const ord = orders.find((o) => o.id === where.id);
          if (!ord) return null;
          const res = { ...ord };
          if (include?.items) {
            res.items = orderItems.filter((i) => i.orderId === ord.id);
          }
          if (include?.payment) {
            res.payment = payments.find((p) => p.orderId === ord.id);
          }
          return res;
        },
        update: async ({ where, data, include }) => {
          const ord = orders.find((o) => o.id === where.id);
          if (ord) Object.assign(ord, data);
          const res = { ...ord };
          if (include?.items) {
            res.items = orderItems.filter((i) => i.orderId === ord.id);
          }
          return res;
        },
      },
      payment: {
        create: async ({ data }) => {
          const p = { id: `pay_${Date.now()}`, ...data };
          payments.push(p);
          return p;
        },
        upsert: async ({ where, create, update }) => {
          let p = payments.find((x) => x.orderId === where.orderId);
          if (p) {
            Object.assign(p, update);
          } else {
            p = { id: `pay_${Date.now()}`, ...create };
            payments.push(p);
          }
          return p;
        },
        findFirst: async ({ where }) => payments.find((p) => (where.providerOrderId ? p.providerOrderId === where.providerOrderId : p.orderId === where.orderId)),
        findUnique: async ({ where }) => payments.find((p) => (where.id ? p.id === where.id : p.orderId === where.orderId)),
        update: async ({ where, data }) => {
          const p = payments.find((x) => x.id === where.id);
          if (p) Object.assign(p, data);
          return p;
        },
      },
      adminNotification: {
        create: async () => ({}),
      },
    };
    mockPrisma.$transaction = async (fn) => fn(mockPrisma);
    return mockPrisma;
  }

  // Email service mock with spy
  const sentEmails = [];
  let simulateResendFailure = false;
  const mockEmailService = {
    sendAdminNewOrderEmail: async (data) => {
      if (simulateResendFailure) {
        throw new Error('Resend network/API error: Connection refused (simulated)');
      }
      sentEmails.push(data);
    },
  };

  // Mock config
  const mockConfig = {
    get: (key) => {
      if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_promo_key';
      if (key === 'RAZORPAY_KEY_SECRET') return 'rzp_test_promo_secret';
      if (key === 'RAZORPAY_WEBHOOK_SECRET') return 'rzp_test_promo_wh_secret';
      if (key === 'ADMIN_ALERT_EMAIL') return 'Officialfirstfaith@gmail.com';
      if (key === 'EMAIL_FROM') return 'First Faith <onboarding@resend.dev>';
      return null;
    },
  };

  // Razorpay mock SDK
  const mockRazorpayClient = {
    orders: {
      create: async ({ amount, currency, receipt }) => ({
        id: `order_rzp_${Date.now()}`,
        amount,
        currency,
        receipt,
        status: 'created',
      }),
      fetch: async (id) => ({ id, status: 'created' }),
    },
    payments: {
      fetch: async (id) => ({
        id,
        order_id: 'order_rzp_mock',
        amount: 69500, // will be dynamically mocked
        currency: 'INR',
        status: 'captured',
      }),
    },
  };

  // -------------------------------------------------------------
  // TEST SCENARIOS (1 - 23)
  // -------------------------------------------------------------

  console.log('--- TEST 1: Clay Mask only ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_1';
    const cart = await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    assert(cart.subtotal === 695 + 525, 'Cart automatically paired Clay Mask (695) + Cleanser (525)');
    assert(cart.discountTotal === 525, 'Cleanser discount is ₹525');
    assert(cart.grandTotal === 695, 'Grand total is ₹695 (Clay Mask price)');
    assert(cart.promotion.isActive === true, 'Promotion is active');
    assert(cart.promotion.appliedOffers[0].offerId === 'OFFER_A', 'Offer A applied');
  }

  console.log('\n--- TEST 2: Body Butter only ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_2';
    const cart = await cartService.addItem(sessionToken, catalog.bodyButter.id, 1);
    assert(cart.subtotal === 625 + 675, 'Body Butter (625) + Serum (675) subtotal');
    assert(cart.discountTotal === 675, 'Serum discount is ₹675');
    assert(cart.grandTotal === 625, 'Grand total is ₹625');
    assert(cart.promotion.appliedOffers[0].offerId === 'OFFER_B', 'Offer B applied');
  }

  console.log('\n--- TEST 3: Sunscreen only ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_3';
    const cart = await cartService.addItem(sessionToken, catalog.sunscreen.id, 1);
    assert(cart.subtotal === 795 + 525, 'Sunscreen (795) + Cleanser (525) subtotal');
    assert(cart.discountTotal === 525, 'Cleanser discount is ₹525');
    assert(cart.grandTotal === 795, 'Grand total is ₹795');
    assert(cart.promotion.appliedOffers[0].offerId === 'OFFER_C', 'Offer C applied');
  }

  console.log('\n--- TEST 4: Clay Mask + Body Butter ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_4';
    await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    const cart = await cartService.addItem(sessionToken, catalog.bodyButter.id, 1);
    assert(cart.discountTotal === 525 + 675, 'Combined discount is ₹1200 (Cleanser 525 + Serum 675)');
    assert(cart.grandTotal === 695 + 625, 'Grand total is ₹1320 (695 + 625)');
    assert(cart.promotion.appliedOffers.length === 2, '2 distinct offers applied');
  }

  console.log('\n--- TEST 5: Clay Mask + Sunscreen ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_5';
    await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    const cart = await cartService.addItem(sessionToken, catalog.sunscreen.id, 1);
    assert(cart.discountTotal === 525 * 2, 'Combined discount is ₹1050 (2 free Cleansers)');
    assert(cart.grandTotal === 695 + 795, 'Grand total is ₹1490');
    assert(cart.promotion.appliedOffers.length === 2, 'Offer A and Offer C applied');
  }

  console.log('\n--- TEST 6: Body Butter + Sunscreen ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_6';
    await cartService.addItem(sessionToken, catalog.bodyButter.id, 1);
    const cart = await cartService.addItem(sessionToken, catalog.sunscreen.id, 1);
    assert(cart.discountTotal === 675 + 525, 'Discount is Serum (675) + Cleanser (525)');
    assert(cart.grandTotal === 625 + 795, 'Grand total is ₹1420');
  }

  console.log('\n--- TEST 7: All three qualifying products ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_7';
    await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    await cartService.addItem(sessionToken, catalog.bodyButter.id, 1);
    const cart = await cartService.addItem(sessionToken, catalog.sunscreen.id, 1);
    assert(cart.discountTotal === (525 * 2) + 675, 'All 3 free items discounted: 2 Cleansers + 1 Serum');
    assert(cart.grandTotal === 695 + 625 + 795, 'Grand total matches sum of 3 buy products: ₹2115');
    assert(cart.promotion.appliedOffers.length === 3, 'All 3 offers active simultaneously');
  }

  console.log('\n--- TEST 8: BUY quantity 2 ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_8';
    await cartService.addItem(sessionToken, catalog.clayMask.id, 2);
    const cart = await cartService.getCart(sessionToken);
    const cleanserItem = cart.items.find((i) => i.variant.product.slug === 'cleanser');
    assert(cleanserItem && cleanserItem.quantity === 2, '2 Cleansers automatically paired for 2 Clay Masks');
    assert(cart.discountTotal === 525 * 2, 'Discount is 2 x 525 = ₹1050');
    assert(cart.grandTotal === 695 * 2, 'Grand total is 2 x 695 = ₹1390');
  }

  console.log('\n--- TEST 9: Removing BUY product removes associated FREE product ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_9';
    await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    let cart = await cartService.getCart(sessionToken);
    const maskItem = cart.items.find((i) => i.variant.product.slug === 'clay-mask');
    assert(maskItem, 'Mask item is in cart');

    // Remove BUY item
    cart = await cartService.removeItem(sessionToken, maskItem.id);
    assert(cart.items.length === 0, 'Cart is completely empty after removing BUY item (free item was removed)');
    assert(cart.discountTotal === 0, 'Discount is ₹0');
    assert(cart.grandTotal === 0, 'Grand total is ₹0');
  }

  console.log('\n--- TEST 10: Removing FREE product directly ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_10';
    await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    let cart = await cartService.getCart(sessionToken);
    const freeItem = cart.items.find((i) => i.variant.product.slug === 'cleanser');
    assert(freeItem, 'Free cleanser item exists in cart');

    // Customer decides to remove the free cleanser
    cart = await cartService.removeItem(sessionToken, freeItem.id);
    assert(cart.items.length === 1, 'Only Clay Mask remains in cart');
    assert(cart.discountTotal === 0, 'Discount is now 0 without free item');
    assert(cart.grandTotal === 695, 'Grand total is full price of Clay Mask (695)');
    assert(cart.promotion.missingFreeItems.length === 1, 'Cleanser noted as eligible missing free item');
  }

  console.log('\n--- TEST 11: Increasing/decreasing BUY quantity ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_11';
    await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    let cart = await cartService.getCart(sessionToken);
    const maskItem = cart.items.find((i) => i.variant.product.slug === 'clay-mask');

    // Increase BUY quantity to 3
    cart = await cartService.updateItemQuantity(sessionToken, maskItem.id, 3);
    let cleanserItem = cart.items.find((i) => i.variant.product.slug === 'cleanser');
    assert(cleanserItem.quantity === 3, 'Free cleanser automatically scaled to 3');
    assert(cart.discountTotal === 525 * 3, 'Discount scaled to 3 x ₹525');

    // Decrease BUY quantity to 1
    cart = await cartService.updateItemQuantity(sessionToken, maskItem.id, 1);
    cleanserItem = cart.items.find((i) => i.variant.product.slug === 'cleanser');
    assert(cleanserItem.quantity === 1, 'Free cleanser automatically scaled down to 1');
    assert(cart.discountTotal === 525, 'Discount scaled down to 1 x ₹525');
  }

  console.log('\n--- TEST 12: Free product already exists in cart before BUY added ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_12';

    // Add cleanser first (full price)
    await cartService.addItem(sessionToken, catalog.cleanser.id, 1);
    let cart = await cartService.getCart(sessionToken);
    assert(cart.discountTotal === 0 && cart.grandTotal === 525, 'Cleanser added at full price ₹525');

    // Now add Clay Mask
    cart = await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    assert(cart.discountTotal === 525, 'Cleanser is now marked free: discount ₹525');
    assert(cart.grandTotal === 695, 'Grand total is ₹695 (Clay Mask price)');
  }

  console.log('\n--- TEST 13 & 14: Free product quantity greater than qualifying quantity ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_13';

    // Add 1 Clay Mask (qualifying for 1 free cleanser)
    await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    // Customer adds 2 MORE cleansers manually (total 3 cleansers)
    await cartService.addItem(sessionToken, catalog.cleanser.id, 2);

    const cart = await cartService.getCart(sessionToken);
    const cleanser = cart.items.find((i) => i.variant.product.slug === 'cleanser');
    assert(cleanser.quantity === 3, 'Customer has 3 cleansers in cart');
    assert(cart.discountTotal === 525, 'Discount is strictly capped at 1 cleanser (-₹525)');
    assert(cart.grandTotal === 695 + (525 * 2), 'Grand total charges for 1 mask + 2 paid cleansers (₹1745)');
    assert(cart.promotion.itemDiscounts[cleanser.variantId].freeQuantity === 1, 'Promotion engine marks only 1 unit as free');
  }

  console.log('\n--- TEST 15: Free product out of stock ---');
  {
    const prisma = createMockPrisma();
    // Simulate Cleanser out of stock
    prisma._data.inventories.var_cleanser = 0;
    const cartService = new CartService(prisma);
    const sessionToken = 'session_test_15';

    // Add Clay Mask
    const cart = await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    assert(cart.items.length === 1, 'Clay Mask added alone without out-of-stock Cleanser');
    assert(cart.discountTotal === 0, 'No discount granted for unavailable item');
    assert(cart.grandTotal === 695, 'Order remains valid for buy product at ₹695');
  }

  console.log('\n--- TEST 16 & 17: Refreshing cart & Guest cart persistence ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const sessionToken = 'guest_session_persistent_999';

    await cartService.addItem(sessionToken, catalog.clayMask.id, 1);
    const cart1 = await cartService.getCart(sessionToken);

    // Refresh simulation (separate request with same sessionToken)
    const cart2 = await cartService.getCart(sessionToken);
    assert(cart1.id === cart2.id, 'Same cart retrieved on page refresh');
    assert(cart1.grandTotal === cart2.grandTotal, 'Grand total preserved identically across refreshes');
    assert(cart2.promotion.appliedOffers.length === 1, 'Promotion remains active across refreshes');
  }

  console.log('\n--- TEST 18, 19, 20, 21: Checkout, Razorpay order, Payment Failure & Retry ---');
  {
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const ordersService = new OrdersService(prisma, mockEmailService);
    const sessionToken = 'checkout_session_777';

    // Add Clay Mask + Cleanser
    await cartService.addItem(sessionToken, catalog.clayMask.id, 1);

    // Create Order with RAZORPAY
    const order = await ordersService.createOrder({
      sessionToken,
      customer: { name: 'Aarav Sharma', email: 'aarav@example.com', phone: '9876543210' },
      shippingAddress: { line1: '123 Park Street', city: 'Mumbai', state: 'MH', postalCode: '400001' },
      paymentMethod: PaymentProvider.RAZORPAY,
    });

    assert(order.subtotal.toString() === '1220', 'Server subtotal is ₹1220 (695 + 525)');
    assert(order.discountTotal.toString() === '525', 'Server discount is ₹525');
    assert(order.grandTotal.toString() === '695', 'Server grand total is ₹695');
    assert(order.promotionName === 'FIRST FAITH 1+1 SKINCARE OFFER', 'Order persists promotionName');
    assert(order.items.some((i) => i.isFreeItem === true), 'OrderItem marked as isFreeItem = true');

    // Razorpay Service Order Creation
    const razorpayService = new RazorpayService(mockConfig, prisma, mockEmailService);
    razorpayService.client = mockRazorpayClient;

    const rzpOrder = await razorpayService.createPaymentOrder(order.id, order.guestToken);
    assert(rzpOrder.amount === 69500, 'Razorpay receives EXACT server grandTotal in paise: 69500 (₹695), NOT ₹1220');

    // Retry Payment before completion reuses or refreshes safely
    const retryOrder = await razorpayService.createPaymentOrder(order.id, order.guestToken);
    assert(retryOrder.amount === 69500, 'Retry payment order also charges exact ₹695');

    // Verify Payment
    mockRazorpayClient.payments.fetch = async () => ({
      id: 'pay_rzp_mock_123',
      order_id: rzpOrder.razorpayOrderId,
      amount: 69500,
      currency: 'INR',
      status: 'captured',
    });

    const verifyRes = await razorpayService.verifyPayment({
      orderId: order.id,
      guestToken: order.guestToken,
      razorpayPaymentId: 'pay_rzp_mock_123',
      razorpayOrderId: rzpOrder.razorpayOrderId,
      razorpaySignature: crypto.createHmac('sha256', 'rzp_test_promo_secret').update(`${rzpOrder.razorpayOrderId}|pay_rzp_mock_123`).digest('hex'),
    });

    assert(verifyRes.success === true, 'Payment verification succeeds');
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id }, include: { payment: true } });
    assert(updatedOrder.status === OrderStatus.PAID, 'Order transitions to PAID');
    assert(updatedOrder.payment.status === PaymentStatus.CAPTURED, 'Payment transitions to CAPTURED');
  }

  console.log('\n--- TEST 22 & 23: Order Confirmation & Admin View ---');
  {
    const prisma = createMockPrisma();
    const ordersService = new OrdersService(prisma, mockEmailService);
    const sessionToken = 'admin_view_session';
    const cartService = new CartService(prisma);

    await cartService.addItem(sessionToken, catalog.bodyButter.id, 1);
    const order = await ordersService.createOrder({
      sessionToken,
      customer: { name: 'Priya Patel', email: 'priya@example.com', phone: '9876543211' },
      shippingAddress: { line1: '45 Lotus Lane', city: 'Bengaluru', state: 'KA', postalCode: '560001' },
      paymentMethod: PaymentProvider.COD,
    });

    // Customer order view
    const customerView = await ordersService.findOne(order.id, order.guestToken);
    assert(customerView.promotionName === 'FIRST FAITH 1+1 SKINCARE OFFER', 'Customer view includes promotionName');
    assert(customerView.items.find((i) => i.productName === 'Serum').isFreeItem === true, 'Customer view shows Serum as free item');

    // Admin order view
    const adminView = await ordersService.findOne(order.id, undefined, undefined, true);
    assert(adminView.promotionName === 'FIRST FAITH 1+1 SKINCARE OFFER', 'Admin view includes promotionName');
    assert(adminView.promotionDiscount.toString() === '675', 'Admin view includes exact discount ₹675');
    assert(adminView.promotionDetails.appliedOffers[0].freeProductName === 'Serum', 'Admin view details show free product name');
  }

  console.log('\n--- RESEND EMAIL ALERT TESTS ---');
  {
    assert(sentEmails.length >= 1, 'Email alert was dispatched on order creation/payment');
    const lastAlert = sentEmails[sentEmails.length - 1];
    assert(lastAlert.promotionName === 'FIRST FAITH 1+1 SKINCARE OFFER', 'Email contains promotion details');
    assert(lastAlert.totalAmount === 625, 'Email contains final payable total ₹625');
    assert(lastAlert.items.some((i) => i.isFreeItem === true), 'Email items flag 1+1 free companion');

    // Test Resend failure resilience
    console.log('Testing Resend API failure does NOT break order creation:');
    simulateResendFailure = true;
    const prisma = createMockPrisma();
    const cartService = new CartService(prisma);
    const ordersService = new OrdersService(prisma, mockEmailService);
    const sessionToken = 'resend_failure_test_session';
    await cartService.addItem(sessionToken, catalog.clayMask.id, 1);

    const safeOrder = await ordersService.createOrder({
      sessionToken,
      customer: { name: 'Simulated Fail', email: 'fail@example.com', phone: '9999999999' },
      shippingAddress: { line1: 'Resend Fail Lane', city: 'Delhi', state: 'DL', postalCode: '110001' },
      paymentMethod: PaymentProvider.COD,
    });

    assert(safeOrder.id !== undefined, 'Order successfully created even when Resend email failed');
    assert(safeOrder.grandTotal.toString() === '695', 'Order amount remains valid upon email failure');
  }

  console.log('\n================================================================');
  console.log(`ALL PROMOTION & RESEND TESTS PASSED SUCCESSFULLY! (${passedTests}/${totalTests})`);
  console.log('================================================================');
}

runPromotionFlowTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
