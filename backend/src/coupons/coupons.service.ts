import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DiscountType } from '@prisma/client';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForAdmin() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(data: {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderValue?: number;
    usageLimit?: number;
    perUserLimit?: number;
    startsAt?: Date;
    expiresAt?: Date;
  }) {
    return this.prisma.coupon.create({ data });
  }

  async update(id: string, data: Partial<{ isActive: boolean; expiresAt: Date; usageLimit: number }>) {
    await this.ensureExists(id);
    return this.prisma.coupon.update({ where: { id }, data });
  }

  // Called at checkout time to confirm a coupon can actually be applied —
  // never trust a discount amount the client computed itself.
  async validate(code: string, userId: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      include: { usages: { where: { userId } } },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('This coupon is not valid');
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('This coupon is not active yet');
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(`Minimum order value of ₹${coupon.minOrderValue} required`);
    }
    if (coupon.perUserLimit && coupon.usages.length >= coupon.perUserLimit) {
      throw new BadRequestException('You have already used this coupon');
    }

    const totalUsages = await this.prisma.couponUsage.count({ where: { couponId: coupon.id } });
    if (coupon.usageLimit && totalUsages >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    const discount =
      coupon.discountType === 'PERCENTAGE'
        ? (subtotal * Number(coupon.discountValue)) / 100
        : Number(coupon.discountValue);

    return { coupon, discount: Math.min(discount, subtotal) };
  }

  private async ensureExists(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }
}
