import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
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

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Headers('x-cart-session') sessionToken?: string) {
    return this.cartService.getCart(sessionToken);
  }

  @Post('items')
  addItem(
    @Headers('x-cart-session') sessionToken: string | undefined,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(sessionToken, dto.variantId, dto.quantity);
  }

  @Patch('items/:id')
  updateItem(
    @Headers('x-cart-session') sessionToken: string | undefined,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(sessionToken, id, dto.quantity);
  }

  @Delete('items/:id')
  removeItem(
    @Headers('x-cart-session') sessionToken: string | undefined,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.cartService.removeItem(sessionToken, id);
  }

  @Delete()
  clearCart(@Headers('x-cart-session') sessionToken?: string) {
    return this.cartService.clearCart(sessionToken);
  }
}
