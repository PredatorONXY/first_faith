import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [users, orders, pendingOrders, completedOrders, products, lowStock] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: { in: [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING] } } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.product.count(),
      this.prisma.inventory.findMany({ where: { stockQuantity: { lte: 5 } }, include: { variant: { include: { product: true } } } }),
    ]);
    return { users, orders, pendingOrders, completedOrders, products, lowStock };
  }

  users() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true },
    });
  }

  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, email: true, phone: true, role: true, createdAt: true,
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, include: { items: true, payment: true } },
      },
    });
    if (!user) throw new NotFoundException('Customer not found');
    return user;
  }

  orders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true, email: true } }, address: true, items: true, payment: true },
    });
  }

  async order(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } }, address: true, items: true, payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.order.update({ where: { id }, data: { status } });
  }
}
