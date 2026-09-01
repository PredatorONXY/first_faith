import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  // Powers /ingredients — the glossary page across all products.
  findAll() {
    return this.prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
      include: { products: { include: { product: true } } },
    });
  }

  create(data: { name: string; description?: string }) {
    return this.prisma.ingredient.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    await this.ensureExists(id);
    return this.prisma.ingredient.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Hard delete is fine here — the join table (ProductIngredient) cascades,
    // and ingredients (unlike products) don't appear in order history.
    return this.prisma.ingredient.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const ingredient = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    return ingredient;
  }
}
