import { PrismaClient, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

const categories = {
  faceCare: { name: 'Face Care', slug: 'face-care' },
  bodyCare: { name: 'Body Care', slug: 'body-care' },
};

const products = [
  {
    name: 'Clay Mask',
    slug: 'clay-mask',
    fullDescription: 'A purifying and soothing clay mask formulated with Red Moroccan Clay and Alpha Arbutin.',
    shortDescription: 'Red Moroccan Clay + Alpha Arbutin',
    sizeLabel: '100 gm',
    price: 599,
    sku: 'FF-CLAY-100',
    categorySlug: categories.faceCare.slug,
  },
  {
    name: 'Cleanser',
    slug: 'cleanser',
    fullDescription: 'A gentle daily cleanser formulated with Rice Water and Vitamin B5 to cleanse while helping maintain comfortable, hydrated skin.',
    shortDescription: 'Rice Water + Vitamin B5',
    sizeLabel: '100 ml',
    price: 499,
    sku: 'FF-CLN-100',
    categorySlug: categories.faceCare.slug,
  },
  {
    name: 'Sunscreen',
    slug: 'sunscreen',
    fullDescription: 'Lightweight daily sun protection formulated with Niacinamide and Hyaluronic Acid with SPF 50 PA++++.',
    shortDescription: 'Niacinamide + Hyaluronic Acid + SPF 50 PA++++',
    sizeLabel: '50 gm',
    price: 699,
    sku: 'FF-SUN-50',
    categorySlug: categories.faceCare.slug,
  },
  {
    name: 'Serum',
    slug: 'serum',
    fullDescription: 'A lightweight facial serum combining Snail Mucin and Vitamin B5 to support hydrated, smooth-looking skin.',
    shortDescription: 'Snail Mucin + Vitamin B5',
    sizeLabel: '30 ml',
    price: 799,
    sku: 'FF-SER-30',
    categorySlug: categories.faceCare.slug,
  },
  {
    name: 'Body Butter',
    slug: 'body-butter',
    fullDescription: 'A rich body butter formulated with Oat Kernel and Shea Butter to leave skin feeling soft, nourished and comfortable.',
    shortDescription: 'Oat Kernel + Shea Butter',
    sizeLabel: '200 gm',
    price: 649,
    sku: 'FF-BB-200',
    categorySlug: categories.bodyCare.slug,
  },
];

async function main() {
  const faceCare = await prisma.category.upsert({
    where: { slug: categories.faceCare.slug },
    create: categories.faceCare,
    update: { name: categories.faceCare.name, isArchived: false },
  });
  const bodyCare = await prisma.category.upsert({
    where: { slug: categories.bodyCare.slug },
    create: categories.bodyCare,
    update: { name: categories.bodyCare.name, isArchived: false },
  });
  const categoryBySlug = { [faceCare.slug]: faceCare, [bodyCare.slug]: bodyCare };

  for (const product of products) {
    const category = categoryBySlug[product.categorySlug as keyof typeof categoryBySlug];
    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription,
        fullDescription: product.fullDescription,
        status: ProductStatus.PUBLISHED,
        categories: { create: [{ categoryId: category.id }] },
      },
      update: {
        name: product.name,
        shortDescription: product.shortDescription,
        fullDescription: product.fullDescription,
        status: ProductStatus.PUBLISHED,
      },
    });

    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: savedProduct.id, categoryId: category.id } },
      create: { productId: savedProduct.id, categoryId: category.id },
      update: {},
    });

    const variant = await prisma.productVariant.upsert({
      where: { sku: product.sku },
      create: {
        productId: savedProduct.id,
        sku: product.sku,
        sizeLabel: product.sizeLabel,
        price: product.price,
        isDefault: true,
        isActive: true,
      },
      update: {
        productId: savedProduct.id,
        sizeLabel: product.sizeLabel,
        price: product.price,
        isDefault: true,
        isActive: true,
      },
    });

    await prisma.inventory.upsert({
      where: { variantId: variant.id },
      create: { variantId: variant.id, stockQuantity: 50 },
      update: { stockQuantity: 50 },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });