import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      where: { isArchived: false },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          include: { product: { include: { images: true, variants: true } } },
        },
      },
    });
    if (!category || category.isArchived) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  create(data: { name: string; slug: string; description?: string }) {
    return this.prisma.category.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string; sortOrder?: number }) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data });
  }

  async reorder(items: { id: string; sortOrder: number }[]) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.category.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  async archive(id: string) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data: { isArchived: true } });
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
