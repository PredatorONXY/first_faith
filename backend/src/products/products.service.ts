import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PUBLIC_PRODUCT_INCLUDE = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { where: { isActive: true }, include: { inventory: true } },
  ingredients: { include: { ingredient: true } },
  categories: { include: { category: true } },
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Public catalog listing — only published products, no draft/archived leakage.
  findAllPublished() {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED },
      orderBy: { sortOrder: 'asc' },
      include: PUBLIC_PRODUCT_INCLUDE,
    });
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: PUBLIC_PRODUCT_INCLUDE,
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  // Admin-only: all products regardless of status.
  findAllForAdmin() {
    return this.prisma.product.findMany({
      orderBy: { updatedAt: 'desc' },
      include: PUBLIC_PRODUCT_INCLUDE,
    });
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException('A product with this slug already exists');
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        tagline: dto.tagline,
        shortDescription: dto.shortDescription,
        fullDescription: dto.fullDescription,
        howToUse: dto.howToUse,
        suitableSkinTypes: dto.suitableSkinTypes,
        status: dto.status ?? ProductStatus.DRAFT,
        categories: {
          create: dto.categoryIds.map((categoryId) => ({ categoryId })),
        },
        variants: {
          create: dto.variants.map((v, index) => ({
            sku: v.sku,
            sizeLabel: v.sizeLabel,
            price: v.price,
            isDefault: index === 0,
            inventory: {
              create: { stockQuantity: v.stockQuantity ?? 0 },
            },
          })),
        },
        ingredients: dto.ingredients
          ? {
              create: dto.ingredients.map((i) => ({
                ingredientId: i.ingredientId,
                role: i.role,
              })),
            }
          : undefined,
      },
      include: PUBLIC_PRODUCT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        tagline: dto.tagline,
        shortDescription: dto.shortDescription,
        fullDescription: dto.fullDescription,
        howToUse: dto.howToUse,
        suitableSkinTypes: dto.suitableSkinTypes,
        status: dto.status,
      },
      include: PUBLIC_PRODUCT_INCLUDE,
    });
  }

  // Soft delete — preserves order history that references this product's variants.
  async archive(id: string) {
    await this.ensureExists(id);
    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED },
    });
  }

  private async ensureExists(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }
}
