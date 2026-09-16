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
}
