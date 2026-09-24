import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      request.user = undefined;
      return true;
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(authHeader.slice(7));
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, emailVerified: true },
      });

      if (user) {
        request.user = user;
      }
    } catch {
      // Ignored for optional authentication
      request.user = undefined;
    }

    return true;
  }
}
