import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsInt, IsUUID, Min } from 'class-validator';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

class AddCartItemDto {
  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  quantity!: number;
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: Request & { user: { id: string } }) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('items')
  addItem(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(req.user.id, dto.variantId, dto.quantity);
  }

  @Patch('items/:id')
  updateItem(@Req() req: Request & { user: { id: string } }, @Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItemQuantity(req.user.id, id, dto.quantity);
  }

  @Delete('items/:id')
  removeItem(@Req() req: Request & { user: { id: string } }, @Param('id') id: string) {
    return this.cartService.removeItem(req.user.id, id);
  }
}
