import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Single shared Prisma client for the whole app, connected/disconnected
// alongside the Nest application lifecycle.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        return;
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

        if (attempt === maxRetries) {
          this.logger.error(`Database connection failed (${name}, ${code}): ${safeMessage}`);
          throw new Error('Database connection failed');
        }

        this.logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed (${name}, ${code}). Retrying in 2s...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
