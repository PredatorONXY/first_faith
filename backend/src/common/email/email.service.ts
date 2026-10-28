import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface AdminOrderAlertData {
  orderId: string;
  orderNumber: string;
  customerName?: string | null;
  customerEmail: string;
  customerPhone?: string | null;
  shippingAddress?: {
    name?: string | null;
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string | null;
  } | null;
  paymentMethod?: string | null;
  orderDate: Date;
  itemCount: number;
  items?: Array<{
    productName: string;
    variantLabel?: string;
    quantity: number;
    unitPrice: number | string;
    lineTotal?: number | string;
    isFreeItem?: boolean;
  }>;
  promotionName?: string | null;
  promotionDiscount?: number | string;
  appliedOffers?: Array<{
    offerName?: string;
    buyProductName: string;
    freeProductName: string;
    freeQuantity: number;
    discount: number;
  }>;
  subtotal?: number | string;
  taxableAmount?: number | string;
  taxTotal?: number | string;
  cgst?: number | string;
  sgst?: number | string;
  igst?: number | string;
  shippingFee?: number | string;
  totalAmount: number | string;
  paymentStatus: string;
  orderStatus: string;
  isTest?: boolean;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  statusCode?: number;
  error?: string;
  duplicate?: boolean;
  provider?: 'smtp' | 'resend';
  response?: string;
  accepted?: string[];
  rejected?: string[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sentOrderAlerts = new Set<string>();
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  clearDispatchedCache(): void {
    this.sentOrderAlerts.clear();
  }

  getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim() || this.config.get<string>('EMAIL_FROM')?.trim();
    const rawPass = this.config.get<string>('SMTP_PASS')?.trim();

    if (!host || !user || !rawPass) {
      return null;
    }

    const port = Number(this.config.get<string | number>('SMTP_PORT')) || 465;
    const secure = this.config.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const cleanPass = rawPass.replace(/["'\s]/g, '');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: cleanPass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    return this.transporter;
  }

  setTransporter(transporter: nodemailer.Transporter | null): void {
    this.transporter = transporter;
  }

  private getFromAddress(): string {
    const configuredFrom =
      this.config.get<string>('EMAIL_FROM')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim() ||
      this.config.get<string>('RESEND_FROM_EMAIL')?.trim() ||
      'First Faith <firstfaithservices@gmail.com>';

    return configuredFrom.includes('<') ? configuredFrom : `First Faith <${configuredFrom}>`;
  }

  private getAdminRecipientEmail(): string {
    return (
      this.config.get<string>('ADMIN_EMAIL')?.trim() ||
      this.config.get<string>('ADMIN_NOTIFICATION_EMAIL')?.trim() ||
      this.config.get<string>('ADMIN_ALERT_EMAIL')?.trim() ||
      'officialfirstfaith@gmail.com'
    );
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async sendVerificationEmail(toEmail: string, fullName: string | undefined, verificationUrl: string): Promise<void> {
    const fromAddress = this.getFromAddress();
    const greeting = fullName ? `Hello ${this.escapeHtml(fullName)},` : 'Hello,';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address — First Faith</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F4EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #201C1B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F7F4EE; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid rgba(32, 28, 27, 0.08); box-shadow: 0 12px 36px rgba(32, 28, 27, 0.04); overflow: hidden;">
          <!-- Header Branding -->
          <tr>
            <td style="padding: 40px 36px 24px; text-align: center; border-bottom: 1px solid rgba(32, 28, 27, 0.06);">
              <p style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #4A1521;">
                First Faith
              </p>
              <p style="margin: 6px 0 0; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #6E6864;">
                Perfect Blend of Nature &amp; Science
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #201C1B; line-height: 1.3;">
                Verify your email address
              </h1>
              <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.65; color: #4E4844;">
                ${greeting}
              </p>
              <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.65; color: #4E4844;">
                Welcome to First Faith. To complete your account registration and begin your skincare ritual, please verify your email address by clicking the button below.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center" style="border-radius: 9999px; background-color: #4A1521;">
                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; font-size: 14px; font-weight: 600; letter-spacing: 0.04em; color: #FFFFFF; text-decoration: none; border-radius: 9999px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice Details -->
              <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.6; color: #6E6864;">
                This verification link expires in <strong>30 minutes</strong>.
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #8C857F;">
                If you did not create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #FAF8F5; border-top: 1px solid rgba(32, 28, 27, 0.06); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8C857F; line-height: 1.5;">
                © ${new Date().getFullYear()} First Faith. Beyond just skincare. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: 'Verify your email address — First Faith',
          html: htmlContent,
        });
        this.logger.log(`[EMAIL] Verification email sent via Gmail SMTP to ${toEmail}`);
        return;
      } catch (err: any) {
        this.logger.error(`[EMAIL] Failed to send verification email via Gmail SMTP: ${err.message}`);
        if (!this.config.get<string>('RESEND_API_KEY')?.trim()) {
          throw new InternalServerErrorException('Unable to send verification email at this time');
        }
        this.logger.log(`[EMAIL] Attempting fallback to Resend for verification email to ${toEmail}...`);
      }
    }

    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    if (!apiKey) {
      this.logger.error('[EMAIL] Neither SMTP nor RESEND_API_KEY is configured');
      throw new InternalServerErrorException('Email service configuration error');
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [toEmail],
          subject: 'Verify your email address — First Faith',
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let parsedMessage = '';
        try {
          const parsed = JSON.parse(errorText);
          parsedMessage = parsed?.message || '';
        } catch {
          // ignore parsing error
        }

        if (response.status === 403) {
          this.logger.error(
            `[EMAIL] Resend verification email 403 Forbidden: Sender domain is unverified in Resend. onboarding@resend.dev cannot send to external recipients. Details: ${parsedMessage || errorText}`,
          );
        } else {
          this.logger.error(`[EMAIL] Resend verification email failed (status ${response.status}): ${parsedMessage || errorText}`);
        }

        const userMessage = parsedMessage ? `Email error: ${parsedMessage}` : 'Failed to dispatch verification email';
        throw new InternalServerErrorException(userMessage);
      }
    } catch (err: any) {
      if (err instanceof InternalServerErrorException) {
        throw err;
      }
      this.logger.error(`[EMAIL] Failed to send verification email due to network failure: ${err.message}`);
      throw new InternalServerErrorException('Unable to send verification email at this time');
    }
  }

  async sendAdminNewOrderEmail(data: AdminOrderAlertData): Promise<EmailSendResult> {
    const transporter = this.getTransporter();
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const fromAddress = this.getFromAddress();
    const adminEmail = this.getAdminRecipientEmail();
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'https://firstfaith.in';
    const orderUrl = `${frontendUrl.replace(/\/$/, '')}/admin/orders/${data.orderId}`;

    if (!transporter && !apiKey) {
      this.logger.warn(`[EMAIL] Neither SMTP nor RESEND_API_KEY is configured; skipping admin order alert email for #${data.orderNumber}`);
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    if (this.sentOrderAlerts.has(data.orderId)) {
      this.logger.log(`[EMAIL] Admin order alert email already dispatched for order ${data.orderId} (#${data.orderNumber}); skipping duplicate.`);
      return { success: true, duplicate: true };
    }

    const emailSubject = data.isTest
      ? `[TEST ORDER — NO REAL PURCHASE] First Faith — New Paid Order Alert #${data.orderNumber}`
      : `First Faith — New Paid Order Alert #${data.orderNumber}`;

    const numTotal = Number(data.totalAmount || 0);
    const formattedTotal = `₹${numTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const numSubtotal = data.subtotal !== undefined ? Number(data.subtotal) : null;
    const formattedSubtotal = numSubtotal !== null
      ? `₹${numSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : null;

    const promoDiscountNum = Number(data.promotionDiscount || 0);
    const formattedDiscount = promoDiscountNum > 0
      ? `-₹${promoDiscountNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : null;

    const numTaxable = data.taxableAmount !== undefined ? Number(data.taxableAmount) : null;
    const formattedTaxable = numTaxable !== null
      ? `₹${numTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : null;

    const numTaxTotal = data.taxTotal !== undefined ? Number(data.taxTotal) : null;
    const formattedTaxTotal = numTaxTotal !== null
      ? `₹${numTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : null;

    let taxBreakdownLabel = '';
    const cgstNum = Number(data.cgst || 0);
    const sgstNum = Number(data.sgst || 0);
    const igstNum = Number(data.igst || 0);
    if (cgstNum > 0 || sgstNum > 0) {
      taxBreakdownLabel = `CGST 9%: ₹${cgstNum.toFixed(2)}, SGST 9%: ₹${sgstNum.toFixed(2)}`;
    } else if (igstNum > 0) {
      taxBreakdownLabel = `IGST 18%: ₹${igstNum.toFixed(2)}`;
    }

    const shippingFeeNum = Number(data.shippingFee || 0);
    const formattedShipping = shippingFeeNum > 0 ? `₹${shippingFeeNum.toFixed(2)}` : 'FREE (₹0.00)';

    const formattedDate = data.orderDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    let formattedShippingAddress = 'Not provided';
    if (data.shippingAddress) {
      const addr = data.shippingAddress;
      const lines: string[] = [];
      if (addr.name) lines.push(`<strong>${this.escapeHtml(addr.name)}</strong>`);
      if (addr.line1) lines.push(this.escapeHtml(addr.line1));
      if (addr.line2) lines.push(this.escapeHtml(addr.line2));
      const loc = [addr.city, addr.state, addr.postalCode].filter(Boolean).map((s) => this.escapeHtml(s!)).join(', ');
      if (loc) lines.push(loc);
      if (addr.country) lines.push(this.escapeHtml(addr.country));
      if (addr.phone) lines.push(`Phone: ${this.escapeHtml(addr.phone)}`);
      if (lines.length > 0) {
        formattedShippingAddress = lines.join('<br/>');
      }
    }

    const itemsHtml = (data.items && data.items.length > 0)
      ? data.items.map((it) => {
          const isFree = Boolean(it.isFreeItem);
          const priceDisplay = isFree
            ? '<span style="color: #047857; font-weight: 700;">FREE (₹0)</span>'
            : `₹${Number(it.lineTotal || (Number(it.unitPrice) * it.quantity)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          return `
            <tr>
              <td style="padding: 7px 0; font-size: 13px; color: #201C1B; border-bottom: 1px solid rgba(32, 28, 27, 0.06);">
                <strong>${this.escapeHtml(it.productName)}</strong> ${it.variantLabel ? `<span style="color: #6E6864; font-size: 12px;">(${this.escapeHtml(it.variantLabel)})</span>` : ''} × ${it.quantity}
                ${isFree ? ' <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">1+1 FREE</span>' : ''}
              </td>
              <td style="padding: 7px 0; font-size: 13px; text-align: right; border-bottom: 1px solid rgba(32, 28, 27, 0.06);">
                ${priceDisplay}
              </td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="2" style="padding: 6px 0; font-size: 13px; color: #201C1B;">${data.itemCount} item(s)</td></tr>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(emailSubject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F4EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #201C1B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F7F4EE; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid rgba(32, 28, 27, 0.08); box-shadow: 0 12px 36px rgba(32, 28, 27, 0.04); overflow: hidden;">
          <!-- Header Branding -->
          <tr>
            <td style="padding: 36px 36px 20px; text-align: center; border-bottom: 1px solid rgba(32, 28, 27, 0.06);">
              <p style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #4A1521;">
                First Faith
              </p>
              <p style="margin: 6px 0 0; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #6E6864;">
                New Order Notification
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 36px;">
              ${data.isTest ? `
              <div style="background-color: #FEF3C7; border: 2px dashed #D97706; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; text-align: center; color: #92400E;">
                <p style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                  ⚠️ TEST ORDER — NO REAL PURCHASE
                </p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #78350F; line-height: 1.4;">
                  This is an automated test order notification simulating a customer purchase. No payment was charged, no order was created in the database, and inventory was not altered.
                </p>
              </div>` : ''}
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #201C1B; line-height: 1.3;">
                ${data.isTest ? '[TEST] New Paid Order Alert' : 'New Paid Order Alert'}
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #4E4844;">
                ${data.isTest ? 'Simulated customer purchase order details for email delivery verification:' : 'A new order has been paid and confirmed on First Faith. Order details:'}
              </p>

              <!-- Order Summary Table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF8F5; border-radius: 12px; border: 1px solid rgba(32, 28, 27, 0.06); padding: 18px 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Order Number:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 700; text-align: right;">${this.escapeHtml(data.orderNumber)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Order ID:</td>
                  <td style="padding: 6px 0; font-size: 11px; color: #6E6864; font-family: monospace; text-align: right;">${this.escapeHtml(data.orderId)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Customer:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 600; text-align: right;">${this.escapeHtml(data.customerName || 'Guest Customer')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Email:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 500; text-align: right;">${this.escapeHtml(data.customerEmail)}</td>
                </tr>
                ${data.customerPhone ? `
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Phone:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 500; text-align: right;">${this.escapeHtml(data.customerPhone)}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500; vertical-align: top;">Delivery Address:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 500; text-align: right; line-height: 1.5;">
                    ${formattedShippingAddress}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Payment Method:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #4A1521; font-weight: 700; text-align: right;">
                    ${this.escapeHtml(data.paymentMethod || 'Razorpay Online')}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Date / Time:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 500; text-align: right;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Order Status:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 600; text-align: right;">${this.escapeHtml(data.orderStatus)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Payment Status:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #047857; font-weight: 700; text-align: right;">${this.escapeHtml(data.paymentStatus)}</td>
                </tr>
              </table>

              <!-- Itemized Products -->
              <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #201C1B;">Items Ordered</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                ${itemsHtml}
              </table>

              <!-- Promotion Details (if applicable) -->
              ${(data.promotionName || promoDiscountNum > 0) ? `
              <div style="background-color: #FAF4F0; border-radius: 12px; border: 1px solid rgba(124, 40, 54, 0.15); padding: 14px 18px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #7C2836;">
                  🎁 Promotion: ${this.escapeHtml(data.promotionName || 'FIRST FAITH 1+1')}
                </p>
                ${(data.appliedOffers && data.appliedOffers.length > 0) ? `
                  <ul style="margin: 4px 0 8px; padding-left: 20px; font-size: 12px; color: #4E4844; line-height: 1.6;">
                    ${data.appliedOffers.map((o) => `<li>${this.escapeHtml(o.buyProductName)} → <strong>${this.escapeHtml(o.freeProductName)} × ${o.freeQuantity} FREE</strong> (-₹${o.discount.toLocaleString('en-IN')})</li>`).join('')}
                  </ul>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #047857;">
                  <span>Promotion Discount:</span>
                  <span>${formattedDiscount || `-₹${promoDiscountNum.toLocaleString('en-IN')}`}</span>
                </div>
              </div>` : ''}

              <!-- Totals Breakdown -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(32, 28, 27, 0.1); padding-top: 12px; margin-bottom: 28px;">
                ${formattedSubtotal ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #6E6864;">Product Subtotal (Incl. GST):</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #201C1B; text-align: right; font-weight: 500;">${formattedSubtotal}</td>
                </tr>` : ''}
                ${formattedDiscount ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #047857; font-weight: 600;">1+1 Offer Discount:</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #047857; font-weight: 600; text-align: right;">${formattedDiscount}</td>
                </tr>` : ''}
                ${formattedTaxable ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #6E6864;">Taxable Value (Excl. GST):</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #201C1B; text-align: right;">${formattedTaxable}</td>
                </tr>` : ''}
                ${formattedTaxTotal ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #6E6864;">Included GST (18%):</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #201C1B; text-align: right;">
                    ${formattedTaxTotal}
                    ${taxBreakdownLabel ? `<br/><span style="font-size: 11px; color: #6E6864;">(${this.escapeHtml(taxBreakdownLabel)})</span>` : ''}
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #6E6864;">Shipping:</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #047857; font-weight: 600; text-align: right;">${formattedShipping}</td>
                </tr>
                <tr style="border-top: 1px solid rgba(32, 28, 27, 0.08);">
                  <td style="padding: 10px 0 4px; font-size: 16px; color: #4A1521; font-weight: 700;">Final Amount Paid / Payable:</td>
                  <td style="padding: 10px 0 4px; font-size: 18px; color: #4A1521; font-weight: 700; text-align: right;">${formattedTotal}</td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 10px;">
                <tr>
                  <td align="center" style="border-radius: 9999px; background-color: #4A1521;">
                    <a href="${orderUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; font-size: 14px; font-weight: 600; letter-spacing: 0.04em; color: #FFFFFF; text-decoration: none; border-radius: 9999px;">
                      View Order in Admin
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background-color: #FAF8F5; border-top: 1px solid rgba(32, 28, 27, 0.06); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8C857F; line-height: 1.5;">
                First Faith Store Administration · Automated Alert
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: adminEmail,
          subject: emailSubject,
          html: htmlContent,
        });

        this.sentOrderAlerts.add(data.orderId);
        this.logger.log(
          `[EMAIL] Admin order alert email successfully accepted by Gmail SMTP (messageId: ${info.messageId || 'ok'}, response: ${info.response || ''}) for #${data.orderNumber} to ${adminEmail}`,
        );
        return {
          success: true,
          messageId: info.messageId,
          provider: 'smtp',
          response: info.response,
          accepted: info.accepted as string[],
          rejected: info.rejected as string[],
        };
      } catch (smtpErr: any) {
        this.logger.error(
          `[EMAIL] Gmail SMTP order alert failed for #${data.orderNumber} to ${adminEmail}: ${smtpErr.message}`,
        );

        if (!apiKey) {
          return {
            success: false,
            provider: 'smtp',
            error: smtpErr.message,
          };
        }
        this.logger.log(`[EMAIL] Attempting fallback to Resend for #${data.orderNumber}...`);
      }
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [adminEmail],
          subject: emailSubject,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let parsedMessage = '';
        try {
          const parsed = JSON.parse(errorText);
          parsedMessage = parsed?.message || '';
        } catch {
          // ignore parsing error
        }

        const statusCode = response.status;
        const safeErrorMessage = parsedMessage || errorText || `HTTP ${statusCode}`;

        if (statusCode === 403) {
          this.logger.error(
            `[EMAIL] Resend returned HTTP 403 Forbidden for order #${data.orderNumber} to ${adminEmail}: ` +
            `The current sender (${fromAddress}) is restricted or domain is unverified. ` +
            `Resend sandbox (onboarding@resend.dev) only allows sending to the account owner's email. ` +
            `To send to ${adminEmail}, please verify your custom domain in Resend (resend.com/domains) and set RESEND_FROM_EMAIL. Details: ${safeErrorMessage}`,
          );
        } else if (statusCode === 401) {
          this.logger.error(
            `[EMAIL] Resend returned HTTP 401 Unauthorized for order #${data.orderNumber}: Invalid RESEND_API_KEY. Please verify your API key in the Resend dashboard.`,
          );
        } else {
          this.logger.error(
            `[EMAIL] Resend order alert failed (HTTP ${statusCode}) for #${data.orderNumber} to ${adminEmail}: ${safeErrorMessage}`,
          );
        }

        return {
          success: false,
          statusCode,
          error: safeErrorMessage,
        };
      }

      const responseData = (await response.json().catch(() => ({}))) as { id?: string };
      this.sentOrderAlerts.add(data.orderId);
      this.logger.log(
        `[EMAIL] Admin order alert email successfully accepted by Resend (id: ${responseData?.id || 'ok'}) for #${data.orderNumber} to ${adminEmail}`,
      );
      return {
        success: true,
        messageId: responseData?.id,
        provider: 'resend',
      };
    } catch (err: any) {
      this.logger.error(`[EMAIL] Admin order alert email network failure for #${data.orderNumber}: ${err.message}`);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
