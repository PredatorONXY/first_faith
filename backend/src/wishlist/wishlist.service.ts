import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string) {
    return this.prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
          },
        },
      },
    });
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true },
    });

    if (!product || product.status === 'ARCHIVED') {
      throw new BadRequestException('Product is not available');
    }

    return this.prisma.wishlist.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      create: { userId, productId },
      update: {},
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
          },
        },
      },
    });
  }

  async removeFromWishlist(userId: string, productIdOrId: string) {
    const result = await this.prisma.wishlist.deleteMany({
      where: {
        userId,
        OR: [{ id: productIdOrId }, { productId: productIdOrId }],
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Wishlist item not found');
    }

    return { success: true, message: 'Removed from wishlist' };
  }
}
