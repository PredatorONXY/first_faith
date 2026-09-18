import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(email: string, password: string, fullName?: string, requestedRole?: unknown) {
    if (requestedRole !== undefined) {
      throw new BadRequestException('Role cannot be specified during registration');
    }

    email = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (!existing.emailVerified) {
        throw new ConflictException(
          'An account with this email is already registered but not yet verified. Please check your verification email or use the resend-verification flow.',
        );
      }
      throw new ConflictException('An account with this email already exists');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: fullName?.trim() || null,
        role: Role.CUSTOMER,
        emailVerified: false,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(rawToken)}`;

    try {
      await this.emailService.sendVerificationEmail(email, fullName?.trim(), verificationUrl);
    } catch {
      // User record is saved; if email service has a transient issue, resend can be used
    }

    return {
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
    };
  }

  private async validateCredentials(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();
    let user = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
        break;
      } catch (err: any) {
        if (attempt === 2) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const now = new Date();

    if (user.loginLockedUntil && user.loginLockedUntil > now) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to too many failed login attempts. Please try again later.',
      );
    }

    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      const currentAttempts =
        user.loginLockedUntil && user.loginLockedUntil <= now ? 0 : user.failedLoginAttempts;
      const nextAttempts = currentAttempts + 1;
      const willLock = nextAttempts >= 5;
      const lockUntil = willLock ? new Date(now.getTime() + 15 * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextAttempts,
          loginLockedUntil: lockUntil,
        },
      });

      if (willLock) {
        throw new UnauthorizedException(
          'Account is temporarily locked due to too many failed login attempts. Please try again later.',
        );
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.failedLoginAttempts > 0 || user.loginLockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          loginLockedUntil: null,
        },
      });
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateCredentials(email, password);

    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      throw new UnauthorizedException('Please use the administrator sign-in.');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before signing in.');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async adminLogin(email: string, password: string) {
    const user = await this.validateCredentials(email, password);

    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new UnauthorizedException('Access denied: This account does not possess administrative privileges.');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  getGoogleAuthUrl(req?: any): string {
    const client = this.getGoogleClient(req);

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: ['openid', 'email', 'profile'],
    });
  }

  async handleGoogleCallback(req?: any, code?: string, error?: string) {
    if (error) {
      const message = error === 'access_denied' ? 'Google sign-in was cancelled.' : `Google sign-in failed: ${error}`;
      throw new UnauthorizedException(message);
    }

    if (!code) {
      throw new BadRequestException('Missing Google authorization code');
    }

    const client = this.getGoogleClient(req);

    let tokenResponse: { tokens?: { id_token?: string | null } };

    try {
      tokenResponse = await client.getToken(code);
    } catch {
      throw new UnauthorizedException('Google authorization code is invalid or expired');
    }

    if (!tokenResponse.tokens?.id_token) {
      throw new UnauthorizedException('Google login failed: no ID token returned');
    }

    let payload: ReturnType<import('google-auth-library').LoginTicket['getPayload']>;

    try {
      const ticket = await client.verifyIdToken({
        idToken: tokenResponse.tokens!.id_token,
        audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Google identity verification failed');
    }

    if (!payload?.email || !payload.email_verified || !payload.sub) {
      throw new UnauthorizedException('Google email is missing or not verified');
    }

    const googleUserId = payload.sub;
    const email = payload.email.toLowerCase();
    const fullName = payload.name?.trim() || [payload.given_name, payload.family_name].filter(Boolean).join(' ').trim() || email.split('@')[0];

    let user = await this.prisma.user.findUnique({ where: { googleId: googleUserId } });

    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({ where: { email } });

      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: googleUserId,
            emailVerified: true,
            emailVerificationTokenHash: null,
            emailVerificationExpiresAt: null,
          },
        });
      } else {
        try {
          user = await this.prisma.user.create({
            data: {
              email,
              fullName,
              googleId: googleUserId,
              role: Role.CUSTOMER,
              emailVerified: true,
              emailVerificationTokenHash: null,
              emailVerificationExpiresAt: null,
              passwordHash: null,
            },
          });
        } catch (dbError) {
          if (dbError instanceof Error && 'code' in dbError) {
            throw new InternalServerErrorException('Failed to create Google user account');
          }
          throw dbError;
        }
      }
    } else if (!user.emailVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationTokenHash: null,
          emailVerificationExpiresAt: null,
        },
      });
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  private resolveGoogleCallbackUrl(req?: any): string {
    const configured = this.config.get<string>('GOOGLE_CALLBACK_URL');
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

    // Google requires an exact registered redirect URI. Prefer the configured
    // value so proxy headers cannot select a different callback origin.
    if (configured && (!isProduction || (!configured.includes('localhost') && !configured.includes('127.0.0.1')))) {
      return configured;
    }

    const forwardedProto = req?.headers ? (req.headers['x-forwarded-proto'] as string) : undefined;
    const forwardedHost = req?.headers ? (req.headers['x-forwarded-host'] as string) : undefined;
    const host = forwardedHost || (req?.headers ? req.headers['host'] : undefined);
    const proto = forwardedProto || (req?.secure ? 'https' : 'http');

    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return `${proto}://${host}/api/auth/google/callback`;
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    if (frontendUrl && !frontendUrl.includes('localhost') && !frontendUrl.includes('127.0.0.1')) {
      return `${frontendUrl.replace(/\/$/, '')}/api/auth/google/callback`;
    }

    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/auth/google/callback`;
    }

    if (isProduction) {
      throw new InternalServerErrorException('Google OAuth callback is not configured');
    }

    return 'http://localhost:4000/api/auth/google/callback';
  }

  private getGoogleClient(req?: any): OAuth2Client {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl = this.resolveGoogleCallbackUrl(req);

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new InternalServerErrorException('Google OAuth is not configured');
    }

    return new OAuth2Client(clientId, clientSecret, callbackUrl);
  }

  private issueTokens(id: string, email: string, role: Role) {
    return {
      accessToken: this.jwt.sign({ sub: id, email, role }),
      user: { id, email, role },
    };
  }

  async verifyEmail(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new BadRequestException('Invalid verification token');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationTokenHash: tokenHash },
    });

    if (!user) {
      throw new BadRequestException('This verification link is invalid or has already been used.');
    }

    if (!user.emailVerificationExpiresAt || new Date(user.emailVerificationExpiresAt).getTime() < Date.now()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerificationTokenHash: null, emailVerificationExpiresAt: null },
      });
      throw new BadRequestException('This verification link has expired. Please request a new one.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  async resendVerification(email: string) {
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('Email is required');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });

    // Prevent account enumeration
    if (!user) {
      return {
        success: true,
        message: 'If an unverified account exists with that email, a verification link has been sent.',
      };
    }

    if (user.emailVerified) {
      return {
        success: true,
        message: 'This email is already verified. You can sign in directly.',
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(rawToken)}`;

    try {
      await this.emailService.sendVerificationEmail(user.email, user.fullName || undefined, verificationUrl);
    } catch {
      // Resend network error
    }

    return {
      success: true,
      message: 'A new verification link has been sent to your email.',
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === Role.CUSTOMER && !user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before signing in.');
    }
    return user;
  }

  async updateProfile(userId: string, data: { fullName?: string; phone?: string }) {
    const updateData: { fullName?: string | null; phone?: string | null } = {};

    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName.trim() || null;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone.trim() || null;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  getAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
  }

  async createAddress(userId: string, data: {
    label?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    isDefault?: boolean;
  }) {
    const existing = await this.prisma.address.count({ where: { userId } });
    const shouldBeDefault = data.isDefault || existing === 0;

    if (shouldBeDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    return this.prisma.address.create({
      data: {
        label: data.label?.trim() || null,
        line1: data.line1.trim(),
        line2: data.line2?.trim() || null,
        city: data.city.trim(),
        state: data.state.trim(),
        postalCode: data.postalCode.trim(),
        country: data.country?.trim() || 'IN',
        phone: data.phone?.trim() || null,
        userId,
        isDefault: shouldBeDefault,
      },
    });
  }

  async updateAddress(userId: string, id: string, data: {
    label?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    isDefault?: boolean;
  }) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('Address not found');

    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    return this.prisma.address.update({
      where: { id },
      data: {
        ...(data.label !== undefined ? { label: data.label?.trim() || null } : {}),
        ...(data.line1 ? { line1: data.line1.trim() } : {}),
        ...(data.line2 !== undefined ? { line2: data.line2?.trim() || null } : {}),
        ...(data.city ? { city: data.city.trim() } : {}),
        ...(data.state ? { state: data.state.trim() } : {}),
        ...(data.postalCode ? { postalCode: data.postalCode.trim() } : {}),
        ...(data.country ? { country: data.country.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      },
    });
  }

  async setDefaultAddress(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('Address not found');

    await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async removeAddress(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new BadRequestException('Address not found');
    return this.prisma.address.delete({ where: { id } });
  }
}
