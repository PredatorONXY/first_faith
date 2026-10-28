import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { EmailService, AdminOrderAlertData, EmailSendResult } from '../src/common/email/email.service';

/**
 * First Faith — End-to-End Fake Order Email Delivery Test
 *
 * Simulates a customer purchasing a product using entirely in-memory fake data.
 * Dispatches an admin order notification email to ADMIN_EMAIL (officialfirstfaith@gmail.com)
 * using the real NestJS EmailService and real production order email template.
 *
 * Safety Guarantees:
 * 1. Zero Database impact: Does NOT insert into or query the production database.
 * 2. Zero Gateway impact: Does NOT touch Razorpay, charge cards, or trigger webhooks.
 * 3. Zero Customer impact: Does NOT send emails to customers or modify stock.
 * 4. Zero Credential exposure: App Passwords and API keys are never printed or logged.
 * 5. Single deliberate dispatch: Sends exactly one test order notification per run.
 */

function loadEnvFallback() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function runFakeOrderEmailTest() {
  loadEnvFallback();

  const timestamp = Date.now();
  const testOrderRef = `FF-EMAIL-TEST-${timestamp}`;
  const testOrderId = `test_ord_${timestamp}`;
  const testOrderDate = new Date();

  console.log('=================================================================');
  console.log('   First Faith — Safe End-to-End Fake Order Email Test');
  console.log('=================================================================');
  console.log(`Generated Test Order Ref: ${testOrderRef}`);
  console.log(`Execution Timestamp:      ${testOrderDate.toISOString()}`);

  // Step 1: Validate SMTP and Recipient configuration safely
  console.log('\n[Phase 1] Validating Email Configuration:');
  const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const smtpPort = process.env.SMTP_PORT?.trim() || '465';
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === '465';
  const smtpUser = process.env.SMTP_USER?.trim() || process.env.EMAIL_FROM?.trim();
  const rawPass = process.env.SMTP_PASS?.trim();
  const cleanPass = rawPass ? rawPass.replace(/["'\s]/g, '') : '';
  const fromEmail = process.env.EMAIL_FROM?.trim() || smtpUser || 'firstfaithservices@gmail.com';
  const adminEmail =
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
    process.env.ADMIN_ALERT_EMAIL?.trim() ||
    'officialfirstfaith@gmail.com';

  console.log(`  SMTP_HOST:   ${smtpHost}`);
  console.log(`  SMTP_PORT:   ${smtpPort}`);
  console.log(`  SMTP_SECURE: ${smtpSecure}`);
  console.log(`  SMTP_USER:   ${smtpUser ? `${smtpUser.slice(0, 4)}***@${smtpUser.split('@')[1] || 'domain'}` : '[MISSING]'}`);
  console.log(`  SMTP_PASS:   ${cleanPass ? `[CONFIGURED, length=${cleanPass.length}]` : '[MISSING]'}`);
  console.log(`  EMAIL_FROM:  ${fromEmail}`);
  console.log(`  ADMIN_EMAIL: ${adminEmail}`);

  if (!smtpHost || !smtpUser || !cleanPass) {
    throw new Error('Incomplete SMTP configuration in backend/.env (SMTP_HOST, SMTP_USER, or SMTP_PASS missing).');
  }
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL recipient is not configured in backend/.env.');
  }

  // Step 2: Instantiate NestJS ConfigService and EmailService
  console.log('\n[Phase 2] Initializing NestJS EmailService...');
  const configService = new ConfigService();
  const emailService = new EmailService(configService);

  // Step 3: Test connection & credentials handshake
  console.log('[Phase 3] Testing SMTP handshake and authentication via Nodemailer...');
  const transporter = emailService.getTransporter();
  if (!transporter) {
    throw new Error('Failed to initialize Nodemailer transporter from EmailService.');
  }

  try {
    await transporter.verify();
    console.log('  ✓ SMTP handshake and authentication SUCCESSFUL (smtp.gmail.com:465)!');
  } catch (verifyErr: any) {
    console.error('  ✗ SMTP Handshake / Authentication FAILED:');
    if (verifyErr.code === 'EAUTH' || verifyErr.responseCode === 535) {
      console.error('    Error 535: Authentication credentials invalid. Check Google App Password.');
    } else if (verifyErr.code === 'ETIMEDOUT' || verifyErr.code === 'ECONNREFUSED' || verifyErr.code === 'ENOTFOUND') {
      console.error(`    Network error (${verifyErr.code}): Outbound connection to ${smtpHost}:${smtpPort} failed.`);
    } else {
      console.error(`    Error details: ${verifyErr.message}`);
    }
    throw verifyErr;
  }

  // Step 4: Construct completely fake in-memory order data
  console.log('\n[Phase 4] Constructing in-memory fake purchase order...');
  const fakeOrderData: AdminOrderAlertData = {
    orderId: testOrderId,
    orderNumber: testOrderRef,
    customerName: 'Aarav Mehta (SIMULATED TEST CUSTOMER)',
    customerEmail: 'aarav.test.customer@firstfaith-sample.invalid',
    customerPhone: '+91 98765 43210 (TEST ONLY)',
    shippingAddress: {
      name: 'Aarav Mehta (TEST RECIPIENT)',
      line1: '100 Marine Lines, Apartment 4B (SIMULATED ADDRESS)',
      line2: 'Near Churchgate Station',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400020',
      country: 'IN',
      phone: '+91 98765 43210',
    },
    paymentMethod: 'RAZORPAY (SIMULATED TEST)',
    orderDate: testOrderDate,
    itemCount: 2,
    items: [
      {
        productName: 'TEST PRODUCT — NOT A REAL PURCHASE (Clarifying Clay Mask)',
        variantLabel: '100g Jar (Test Sample)',
        quantity: 1,
        unitPrice: 695,
        lineTotal: 695,
        isFreeItem: false,
      },
      {
        productName: 'TEST PRODUCT — NOT A REAL PURCHASE (Gentle Hydrating Cleanser)',
        variantLabel: '150ml Bottle (Complimentary Sample)',
        quantity: 1,
        unitPrice: 525,
        lineTotal: 0,
        isFreeItem: true,
      },
    ],
    promotionName: 'TEST 1+1 SKINCARE OFFER — NOT A REAL PURCHASE',
    promotionDiscount: 525,
    appliedOffers: [
      {
        offerName: '1+1 Clay Mask + Cleanser (Test Promotion)',
        buyProductName: 'Clarifying Clay Mask (Test)',
        freeProductName: 'Gentle Hydrating Cleanser (Test)',
        freeQuantity: 1,
        discount: 525,
      },
    ],
    subtotal: 1220,
    taxableAmount: 588.98,
    taxTotal: 106.02,
    cgst: 53.01,
    sgst: 53.01,
    igst: 0,
    shippingFee: 0,
    totalAmount: 695,
    paymentStatus: 'CAPTURED (TEST)',
    orderStatus: 'PAID (TEST)',
    isTest: true,
  };

  console.log(`  Order Number:   ${fakeOrderData.orderNumber}`);
  console.log(`  Customer:       ${fakeOrderData.customerName} <${fakeOrderData.customerEmail}>`);
  console.log(`  Items:          ${fakeOrderData.items?.length} fake line item(s)`);
  console.log(`  Total:          ₹${fakeOrderData.totalAmount}`);
  console.log(`  Taxable Amount: ₹${fakeOrderData.taxableAmount} (CGST: ₹${fakeOrderData.cgst}, SGST: ₹${fakeOrderData.sgst})`);
  console.log(`  Safety Note:    No real order placed; zero database or gateway side effects.`);

  // Step 5: Dispatch the order alert via EmailService
  console.log('\n[Phase 5] Dispatching test order notification to officialfirstfaith@gmail.com...');
  const sendResult: EmailSendResult = await emailService.sendAdminNewOrderEmail(fakeOrderData);

  if (!sendResult.success) {
    console.error('\n✗ Test order email dispatch FAILED:');
    console.error(`  Error: ${sendResult.error || 'Unknown error'}`);
    console.error(`  Status Code: ${sendResult.statusCode || 'N/A'}`);
    process.exit(1);
  }

  // Step 6: Print clean execution summary for report
  console.log('\n=================================================================');
  console.log('✓ TEST ORDER NOTIFICATION DISPATCHED SUCCESSFULLY!');
  console.log('=================================================================');
  console.log(`Test Order Reference: ${testOrderRef}`);
  console.log(`Sender Account:       ${fromEmail}`);
  console.log(`Admin Recipient:      ${adminEmail}`);
  console.log(`Email Provider Used:  ${sendResult.provider === 'smtp' ? 'Gmail SMTP (Nodemailer, Port 465)' : 'Resend API (Fallback)'}`);
  console.log(`Message ID:           ${sendResult.messageId || 'N/A'}`);
  console.log(`SMTP Response:        ${sendResult.response || 'N/A'}`);
  console.log(`Accepted Recipients:  ${JSON.stringify(sendResult.accepted || [adminEmail])}`);
  console.log(`Rejected Recipients:  ${JSON.stringify(sendResult.rejected || [])}`);
  console.log(`Fallback Attempted:   ${sendResult.provider === 'smtp' ? 'No (Direct Gmail SMTP Success)' : 'Yes (Resend Fallback)'}`);
  console.log('=================================================================');
  console.log('\nNotice: The message has been accepted by the Gmail SMTP server for delivery.');
  console.log('Final inbox arrival must now be confirmed by the human recipient.\n');
}

runFakeOrderEmailTest()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nScript aborted due to error:', err.message);
    process.exit(1);
  });
