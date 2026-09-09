import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, fullName?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, fullName, role: Role.CUSTOMER },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  getGoogleAuthUrl(): string {
    const client = this.getGoogleClient();

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: ['openid', 'email', 'profile'],
    });
  }

  async handleGoogleCallback(code?: string, error?: string) {
    if (error) {
      const message = error === 'access_denied' ? 'Google sign-in was cancelled.' : `Google sign-in failed: ${error}`;
      throw new UnauthorizedException(message);
    }

    if (!code) {
      throw new BadRequestException('Missing Google authorization code');
    }

    const client = this.getGoogleClient();

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
          data: { googleId: googleUserId },
        });
      } else {
        try {
          user = await this.prisma.user.create({
            data: {
              email,
              fullName,
              googleId: googleUserId,
              role: Role.CUSTOMER,
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
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  private getGoogleClient(): OAuth2Client {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl = this.config.get<string>('GOOGLE_CALLBACK_URL');

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

  getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        addresses: true,
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
  }) {
    const existing = await this.prisma.address.count({ where: { userId } });
    return this.prisma.address.create({
      data: { ...data, userId, isDefault: existing === 0 },
    });
  }

  async removeAddress(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new BadRequestException('Address not found');
    return this.prisma.address.delete({ where: { id } });
  }
}
