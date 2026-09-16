import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(authHeader.slice(7));
      // The JWT only identifies the account. Read the current role from the
      // database on every protected request so a client-controlled JWT payload
      // (or a role changed after token issuance) can never grant privileges.
      // Do not attach passwordHash or other account fields to the request.
      let user = null;
      try {
        user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, role: true, emailVerified: true },
        });
      } catch {
        user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, role: true, emailVerified: true },
        });
      }

      if (!user) {
        throw new UnauthorizedException('No matching account found');
      }

      if (user.role === Role.CUSTOMER && !user.emailVerified) {
        throw new UnauthorizedException('Please verify your email before signing in.');
      }

      request.user = user;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
