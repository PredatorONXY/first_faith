import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(toEmail: string, fullName: string | undefined, verificationUrl: string): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const fromAddress = this.config.get<string>('EMAIL_FROM') || 'First Faith <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not configured');
      throw new InternalServerErrorException('Email service configuration error');
    }

    const greeting = fullName ? `Hello ${fullName},` : 'Hello,';

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
        this.logger.error(`Resend API response error status: ${response.status}`);
        let message = 'Failed to dispatch verification email';
        try {
          const parsed = JSON.parse(errorText);
          if (parsed?.message) {
            message = `Email error: ${parsed.message}`;
          }
        } catch {
          // ignore parsing error
        }
        throw new InternalServerErrorException(message);
      }
    } catch (err: any) {
      if (err instanceof InternalServerErrorException) {
        throw err;
      }
      this.logger.error('Failed to send verification email due to network failure');
      throw new InternalServerErrorException('Unable to send verification email at this time');
    }
  }

  async sendAdminNewOrderEmail(data: {
    orderId: string;
    orderNumber: string;
    customerName?: string | null;
    customerEmail: string;
    customerPhone?: string | null;
    shippingAddress?: {
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
    totalAmount: number | string;
    paymentStatus: string;
    orderStatus: string;
  }): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const configuredFrom = this.config.get<string>('EMAIL_FROM');
    // If domain firstfaith.in is not verified, use onboarding@resend.dev
    const fromAddress = (configuredFrom && !configuredFrom.includes('firstfaith.in'))
      ? configuredFrom
      : 'First Faith <onboarding@resend.dev>';
    const adminEmail = this.config.get<string>('ADMIN_ALERT_EMAIL') || 'Officialfirstfaith@gmail.com';
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'https://firstfaith.in';
    const orderUrl = `${frontendUrl.replace(/\/$/, '')}/admin/orders/${data.orderId}`;

    if (!apiKey) {
      this.logger.error('[EMAIL] RESEND_API_KEY is not configured; skipping admin order email');
      return;
    }

    const isCod = data.paymentMethod === 'COD';
    const emailSubject = isCod
      ? `New First Faith COD Order — ${data.orderNumber}`
      : `First Faith — New Order Alert #${data.orderNumber}`;

    const formattedTotal = typeof data.totalAmount === 'number'
      ? `₹${data.totalAmount.toLocaleString('en-IN')}`
      : `₹${Number(data.totalAmount).toLocaleString('en-IN')}`;

    const formattedSubtotal = data.subtotal !== undefined
      ? (typeof data.subtotal === 'number'
        ? `₹${data.subtotal.toLocaleString('en-IN')}`
        : `₹${Number(data.subtotal).toLocaleString('en-IN')}`)
      : null;

    const promoDiscountNum = Number(data.promotionDiscount || 0);
    const formattedDiscount = promoDiscountNum > 0 ? `-₹${promoDiscountNum.toLocaleString('en-IN')}` : null;

    const formattedDate = data.orderDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const itemsHtml = (data.items && data.items.length > 0)
      ? data.items.map((it) => {
          const isFree = Boolean(it.isFreeItem);
          const priceDisplay = isFree
            ? '<span style="color: #047857; font-weight: 700;">FREE (₹0)</span>'
            : `₹${Number(it.lineTotal || (Number(it.unitPrice) * it.quantity)).toLocaleString('en-IN')}`;
          return `
            <tr>
              <td style="padding: 7px 0; font-size: 13px; color: #201C1B; border-bottom: 1px solid rgba(32, 28, 27, 0.06);">
                <strong>${it.productName}</strong> ${it.variantLabel ? `<span style="color: #6E6864; font-size: 12px;">(${it.variantLabel})</span>` : ''} × ${it.quantity}
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
  <title>${emailSubject}</title>
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
                ${isCod ? 'New COD Order Notification' : 'New Order Notification'}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #201C1B; line-height: 1.3;">
                ${isCod ? 'NEW COD ORDER' : 'New Order Alert'}
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #4E4844;">
                ${isCod ? 'A new Cash on Delivery order has been placed on First Faith.' : 'An order has been placed on First Faith.'} Order details:
              </p>

              <!-- Order Summary Table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF8F5; border-radius: 12px; border: 1px solid rgba(32, 28, 27, 0.06); padding: 18px 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Order:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 700; text-align: right;">${data.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Customer:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 600; text-align: right;">${data.customerName || 'Guest Customer'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Email:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 500; text-align: right;">${data.customerEmail}</td>
                </tr>
                ${data.customerPhone ? `
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Phone:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 500; text-align: right;">${data.customerPhone}</td>
                </tr>` : ''}
                ${data.shippingAddress?.line1 ? `
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500; vertical-align: top;">Shipping Address:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 500; text-align: right; line-height: 1.5;">
                    ${data.shippingAddress.line1}${data.shippingAddress.line2 ? `<br/>${data.shippingAddress.line2}` : ''}<br/>
                    ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}<br/>
                    ${data.shippingAddress.country || 'IN'}
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Payment Method:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #4A1521; font-weight: 700; text-align: right;">
                    ${isCod ? 'Cash on Delivery (COD)' : (data.paymentMethod || 'Online Payment')}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Date / Time:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 500; text-align: right;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Order Status:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #201C1B; font-weight: 600; text-align: right;">${data.orderStatus}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6E6864; font-weight: 500;">Payment Status:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #4A1521; font-weight: 700; text-align: right;">${data.paymentStatus}</td>
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
                  🎁 Promotion: ${data.promotionName || 'FIRST FAITH 1+1'}
                </p>
                ${(data.appliedOffers && data.appliedOffers.length > 0) ? `
                  <ul style="margin: 4px 0 8px; padding-left: 20px; font-size: 12px; color: #4E4844; line-height: 1.6;">
                    ${data.appliedOffers.map((o) => `<li>${o.buyProductName} → <strong>${o.freeProductName} × ${o.freeQuantity} FREE</strong> (-₹${o.discount.toLocaleString('en-IN')})</li>`).join('')}
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
                  <td style="padding: 4px 0; font-size: 13px; color: #6E6864;">Subtotal:</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #201C1B; text-align: right;">${formattedSubtotal}</td>
                </tr>` : ''}
                ${formattedDiscount ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #047857; font-weight: 600;">1+1 Offer Discount:</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #047857; font-weight: 600; text-align: right;">${formattedDiscount}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #6E6864;">Shipping:</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #047857; font-weight: 600; text-align: right;">FREE</td>
                </tr>
                <tr style="border-top: 1px solid rgba(32, 28, 27, 0.08);">
                  <td style="padding: 10px 0 4px; font-size: 16px; color: #4A1521; font-weight: 700;">Total:</td>
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
        this.logger.error(`[EMAIL] Admin COD notification failed: Resend status ${response.status} (${errorText})`);
      } else {
        this.logger.log(`Admin order alert email dispatched for #${data.orderNumber} to ${adminEmail}`);
      }
    } catch (err: any) {
      this.logger.error(`[EMAIL] Admin COD notification failed: ${err.message}`);
    }
  }
}
