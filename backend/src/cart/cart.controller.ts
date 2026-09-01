import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsInt, IsUUID, Min } from 'class-validator';
import { CartService } from './cart.service';

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

// Cart identity: an authenticated request would normally carry req.user.id
// (via SupabaseAuthGuard, applied where login is required at checkout);
// guest carts are identified by an opaque `sessionToken` query param that
// the frontend generates and persists in a cookie. Both paths are kept
// deliberately unauthenticated at the cart-read/write level so guests can
// shop before creating an account — checkout itself requires login.
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Query('userId') userId?: string, @Query('sessionToken') sessionToken?: string) {
    return this.cartService.getCart(userId, sessionToken);
  }

  @Post('items')
  addItem(
    @Body() dto: AddCartItemDto,
    @Query('userId') userId?: string,
    @Query('sessionToken') sessionToken?: string,
  ) {
    return this.cartService.addItem(userId, sessionToken, dto.variantId, dto.quantity);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItemQuantity(id, dto.quantity);
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string) {
    return this.cartService.removeItem(id);
  }
}
