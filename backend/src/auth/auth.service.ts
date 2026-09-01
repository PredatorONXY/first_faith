import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

// Registration/login itself is handled by Supabase Auth on the frontend
// (email/password, magic link, password reset flows). This service's job
// is narrow and deliberate: once Supabase confirms an identity, mirror it
// into our own `User` table — always defaulting role to CUSTOMER. Nothing
// here ever reads a role from the incoming request.
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async syncUser(supabaseAuthId: string, email: string, fullName?: string) {
    return this.prisma.user.upsert({
      where: { supabaseAuthId },
      create: {
        supabaseAuthId,
        email,
        fullName,
        role: Role.CUSTOMER,
      },
      update: {
        email,
        fullName,
      },
    });
  }

  getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: true },
    });
  }
}
