import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const targetPrices: Record<string, number> = {
  'FF-CLAY-100': 695,
  'FF-CLN-100': 525,
  'FF-SUN-50': 795,
  'FF-SER-30': 675,
  'FF-BB-200': 625,
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const pool = new Pool({ connectionString, max: 1 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    for (const [sku, price] of Object.entries(targetPrices)) {
      const variant = await prisma.productVariant.findUnique({ where: { sku }, include: { product: true } });
      if (!variant) {
        console.warn(`Variant with SKU ${sku} not found.`);
        continue;
      }

      await prisma.productVariant.update({
        where: { sku },
        data: { price },
      });

      console.log(`Updated ${variant.product.name} (${sku}) price to ₹${price}.`);
    }

    const allVariants = await prisma.productVariant.findMany({
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });

    console.log('\nVerified database prices:');
    for (const v of allVariants) {
      console.log(`- ${v.product.name}: ₹${Number(v.price)} (SKU: ${v.sku})`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : 'Price update failed.');
  process.exitCode = 1;
});
