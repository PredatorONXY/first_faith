import { PrismaClient, ProductStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as net from 'net';

if (typeof (net as any).setDefaultAutoSelectFamilyAttemptTimeout === 'function') {
  (net as any).setDefaultAutoSelectFamilyAttemptTimeout(10000);
}
if (typeof (net as any).setDefaultAutoSelectFamily === 'function') {
  (net as any).setDefaultAutoSelectFamily(false);
}

/**
 * Temporary ₹1 product creation script for live payment testing.
 * Does NOT alter existing products or prices.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 15000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    // 1. Find an existing category to attach to
    const category = await prisma.category.findFirst({
      where: { isArchived: false },
      orderBy: { sortOrder: 'asc' },
    });

    if (!category) {
      throw new Error('No category found in database.');
    }

    const testSlug = 'first-faith-payment-test-1';
    const testSku = 'FF-TEST-1INR';

    // 2. Upsert Product
    const product = await prisma.product.upsert({
      where: { slug: testSlug },
      create: {
        name: 'First Faith Payment Test — ₹1',
        slug: testSlug,
        tagline: 'Payment Verification',
        shortDescription: 'Temporary internal payment testing product. Not for normal customer purchase.',
        fullDescription: 'Temporary internal payment testing product. Not for normal customer purchase.',
        status: ProductStatus.PUBLISHED,
        sortOrder: 999, // place at end of catalogue
        categories: {
          create: [{ categoryId: category.id }],
        },
      },
      update: {
        name: 'First Faith Payment Test — ₹1',
        shortDescription: 'Temporary internal payment testing product. Not for normal customer purchase.',
        fullDescription: 'Temporary internal payment testing product. Not for normal customer purchase.',
        status: ProductStatus.PUBLISHED,
      },
    });

    // 3. Upsert ProductCategory link
    await prisma.productCategory.upsert({
      where: {
        productId_categoryId: {
          productId: product.id,
          categoryId: category.id,
        },
      },
      create: {
        productId: product.id,
        categoryId: category.id,
      },
      update: {},
    });

    // 4. Upsert ProductVariant (Price = ₹1)
    const variant = await prisma.productVariant.upsert({
      where: { sku: testSku },
      create: {
        productId: product.id,
        sku: testSku,
        sizeLabel: '1 Unit',
        price: 1.0,
        isDefault: true,
        isActive: true,
      },
      update: {
        productId: product.id,
        price: 1.0,
        sizeLabel: '1 Unit',
        isDefault: true,
        isActive: true,
      },
    });

    // 5. Upsert Inventory (Stock = 100)
    const inventory = await prisma.inventory.upsert({
      where: { variantId: variant.id },
      create: {
        variantId: variant.id,
        stockQuantity: 100,
        lowStockThreshold: 5,
      },
      update: {
        stockQuantity: 100,
      },
    });

    console.log('SUCCESS: Temporary ₹1 test product ready.');
    console.log(
      JSON.stringify(
        {
          productId: product.id,
          productName: product.name,
          slug: product.slug,
          variantId: variant.id,
          sku: variant.sku,
          price: Number(variant.price),
          stockQuantity: inventory.stockQuantity,
          status: product.status,
          categoryName: category.name,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Failed to create test product:', err.message);
  process.exit(1);
});
