import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs';

/**
 * First Faith — Gmail SMTP Verification Script
 *
 * Safely tests Gmail SMTP connectivity (smtp.gmail.com:465, implicit TLS)
 * and dispatches a single test message to ADMIN_EMAIL without touching real orders or payments.
 *
 * Security: Under NO circumstance are credentials or secrets printed to logs or output.
 */

// Manually parse .env if process.env values are missing (e.g. running directly via ts-node)
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

async function runSmtpTest() {
  loadEnvFallback();

  console.log('--- First Faith Gmail SMTP Integration Test ---');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER?.trim() || process.env.EMAIL_FROM?.trim();
  const rawPass = process.env.SMTP_PASS?.trim();
  const fromEmail = process.env.EMAIL_FROM?.trim() || user || 'firstfaithservices@gmail.com';
  const adminEmail =
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
    process.env.ADMIN_ALERT_EMAIL?.trim() ||
    'officialfirstfaith@gmail.com';

  // Sanitize password by stripping whitespace/quotes if user pasted Google App Password formatted with spaces
  const cleanPass = rawPass ? rawPass.replace(/["'\s]/g, '') : '';

  // Configuration presence validation (without revealing secret values)
  console.log('\n[1/4] Validating SMTP Configuration:');
  console.log(`  SMTP_HOST: ${host}`);
  console.log(`  SMTP_PORT: ${port}`);
  console.log(`  SMTP_SECURE: ${secure}`);
  console.log(`  SMTP_USER: ${user ? `${user.slice(0, 4)}***@${user.split('@')[1] || 'domain'}` : '[MISSING]'}`);
  console.log(`  SMTP_PASS: ${cleanPass ? `[CONFIGURED, ${cleanPass.length} characters]` : '[MISSING]'}`);
  console.log(`  EMAIL_FROM: ${fromEmail}`);
  console.log(`  ADMIN_EMAIL (Recipient): ${adminEmail}`);

  if (!host) {
    throw new Error('SMTP_HOST is required in backend/.env');
  }
  if (!user) {
    throw new Error('SMTP_USER is required in backend/.env');
  }
  if (!cleanPass) {
    throw new Error('SMTP_PASS is required in backend/.env');
  }
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL is required in backend/.env');
  }

  // Build Nodemailer transport
  console.log('\n[2/4] Initializing Nodemailer Transporter with implicit TLS (Port 465)...');
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465
    auth: {
      user,
      pass: cleanPass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  // Verify connection and authentication
  console.log('[3/4] Verifying connection to SMTP server and authenticating...');
  try {
    await transporter.verify();
    console.log('  ✓ SMTP handshake and authentication SUCCESSFUL!');
  } catch (verifyErr: any) {
    console.error('  ✗ SMTP Handshake / Authentication FAILED.');
    if (verifyErr.code === 'EAUTH' || verifyErr.responseCode === 535) {
      console.error('  Error details: 535 Authentication credentials invalid. Check Google App Password permissions.');
    } else if (verifyErr.code === 'ETIMEDOUT' || verifyErr.code === 'ECONNREFUSED' || verifyErr.code === 'ENOTFOUND') {
      console.error(`  Error details: Connection failure (${verifyErr.code}). Outbound SMTP port ${port} might be blocked.`);
    } else {
      console.error(`  Error details: ${verifyErr.message}`);
    }
    throw verifyErr;
  }

  // Send test message
  console.log('\n[4/4] Sending test message to ADMIN_EMAIL...');
  const testSubject = `[TEST] First Faith — Gmail SMTP Integration Test (${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })})`;
  const formattedFrom = fromEmail.includes('<') ? fromEmail : `First Faith <${fromEmail}>`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>First Faith SMTP Test</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F7F4EE; color: #201C1B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid rgba(32, 28, 27, 0.08); overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 28px 32px; background: #4A1521; text-align: center; color: #FFFFFF;">
        <h1 style="margin: 0; font-size: 20px; letter-spacing: 0.15em; text-transform: uppercase;">First Faith</h1>
        <p style="margin: 6px 0 0; font-size: 11px; opacity: 0.85; letter-spacing: 0.1em; text-transform: uppercase;">Gmail SMTP Configuration Verification</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #201C1B;">✓ Gmail SMTP Test Successful</h2>
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4E4844;">
          This email confirms that Gmail SMTP order-alert email dispatch is properly configured and authenticated for the First Faith store.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #FAF8F5; border-radius: 8px; font-size: 13px;">
          <tr>
            <td style="padding: 10px 14px; color: #6E6864; border-bottom: 1px solid rgba(0,0,0,0.05);">Sending Account:</td>
            <td style="padding: 10px 14px; font-weight: 600; text-align: right; border-bottom: 1px solid rgba(0,0,0,0.05);">${fromEmail}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #6E6864; border-bottom: 1px solid rgba(0,0,0,0.05);">Recipient:</td>
            <td style="padding: 10px 14px; font-weight: 600; text-align: right; border-bottom: 1px solid rgba(0,0,0,0.05);">${adminEmail}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #6E6864; border-bottom: 1px solid rgba(0,0,0,0.05);">SMTP Server:</td>
            <td style="padding: 10px 14px; text-align: right; border-bottom: 1px solid rgba(0,0,0,0.05);">${host}:${port} (Implicit TLS)</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #6E6864;">Sent At:</td>
            <td style="padding: 10px 14px; text-align: right;">${new Date().toISOString()}</td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; font-size: 12px; line-height: 1.5; color: #8C857F;">
          Note: This is an automated test. No real order or customer payment was created or modified.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const info = await transporter.sendMail({
    from: formattedFrom,
    to: adminEmail,
    subject: testSubject,
    text: `First Faith Gmail SMTP Test: Connection and credentials successfully verified. Sent to ${adminEmail} at ${new Date().toISOString()}`,
    html: htmlContent,
  });

  console.log('\n======================================================');
  console.log('✓ TEST RESULT: Message Accepted by SMTP Server!');
  console.log(`  Message ID: ${info.messageId}`);
  console.log(`  Server Response: ${info.response}`);
  console.log(`  Accepted Recipients: ${JSON.stringify(info.accepted)}`);
  console.log(`  Rejected Recipients: ${JSON.stringify(info.rejected || [])}`);
  console.log('======================================================');
  console.log('\nDelivery Status Note:');
  console.log('  The message has been accepted by smtp.gmail.com for delivery.');
  console.log('  SMTP acceptance (status 250 OK) means Gmail queued and dispatched the email.');
  console.log('  Final inbox arrival is determined by Gmail delivery queues and inbox spam filters.');
}

runSmtpTest()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nTest aborted due to error:', err.message);
    process.exit(1);
  });
