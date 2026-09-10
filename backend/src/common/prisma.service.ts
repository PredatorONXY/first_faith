import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Single shared Prisma client for the whole app, connected/disconnected
// alongside the Nest application lifecycle.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error: unknown) {
      const details = error && typeof error === 'object' ? error as {
        code?: unknown;
        name?: unknown;
        message?: unknown;
      } : {};
      const code = details.code ? String(details.code) : 'unknown';
      const name = details.name ? String(details.name) : 'Error';
      const message = details.message ? String(details.message).split('\n')[0] : 'No diagnostic message';
      const safeMessage = message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '<redacted-database-url>');
      this.logger.error(`Database connection failed (${name}, ${code}): ${safeMessage}`);
      throw new Error('Database connection failed');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
