import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const users = await this.prisma.user.count({
      where: { role: Role.CUSTOMER, emailVerified: true },
    });
    const orders = await this.prisma.order.count();
    const pendingOrders = await this.prisma.order.count({
      where: { status: { in: [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING] } },
    });
    const completedOrders = await this.prisma.order.count({
      where: { status: OrderStatus.DELIVERED },
    });
    const products = await this.prisma.product.count();
    const lowStock = await this.prisma.inventory.findMany({
      where: { stockQuantity: { lte: 5 } },
      include: { variant: { include: { product: true } } },
    });
    const recentOrders = await this.prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });

    return { users, orders, pendingOrders, completedOrders, products, lowStock, recentOrders };
  }

  users() {
    return this.prisma.user.findMany({
      where: {
        role: Role.CUSTOMER,
        emailVerified: true,
      },
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

  async notifications() {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.adminNotification.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminNotification.count({
        where: { isRead: false },
      }),
    ]);
    return { notifications, unreadCount };
  }

  async markNotificationRead(id: string) {
    const notif = await this.prisma.adminNotification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');
    return this.prisma.adminNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead() {
    await this.prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }
}
