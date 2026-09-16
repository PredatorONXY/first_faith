import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as net from 'net';

// Node 20+ defaults autoSelectFamilyAttemptTimeout to 250ms, which causes WAN / cloud
// database connections (such as AWS us-east-2 from distant clients) to abort TCP
// handshakes with ETIMEDOUT after 250ms. Configure resilient socket connection timeouts.
if (typeof (net as any).setDefaultAutoSelectFamilyAttemptTimeout === 'function') {
  (net as any).setDefaultAutoSelectFamilyAttemptTimeout(10000);
}
if (typeof (net as any).setDefaultAutoSelectFamily === 'function') {
  (net as any).setDefaultAutoSelectFamily(false);
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }

    const pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      maxUses: 7500,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    pool.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Unexpected error on idle pg client:', err.name);
    });

    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
