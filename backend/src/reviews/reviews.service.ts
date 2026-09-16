import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // Public — only approved reviews are ever shown on a product page.
  findApprovedForProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId, status: ReviewStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true } } },
    });
  }

  // New reviews always start PENDING — never auto-published — so an
  // admin has to approve them via /admin/reviews first.
  async create(userId: string, productId: string, rating: number, title?: string, body?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.review.findFirst({ where: { userId, productId } });
    if (existing) {
      throw new ConflictException('You have already submitted a review for this product');
    }

    return this.prisma.review.create({
      data: { userId, productId, rating, title, body, status: ReviewStatus.PENDING },
    });
  }

  findAllForAdmin() {
    return this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true } }, product: { select: { name: true } } },
    });
  }

  async setStatus(id: string, status: ReviewStatus) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.review.update({ where: { id }, data: { status } });
  }

  async delete(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.review.delete({ where: { id } });
  }
}
