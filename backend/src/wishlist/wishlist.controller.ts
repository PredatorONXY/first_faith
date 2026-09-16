import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsNotEmpty, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WishlistService } from './wishlist.service';

class AddWishlistDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;
}

type AuthedRequest = Request & { user: { id: string } };

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@Req() req: AuthedRequest) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Post()
  addToWishlist(@Req() req: AuthedRequest, @Body() dto: AddWishlistDto) {
    return this.wishlistService.addToWishlist(req.user.id, dto.productId);
  }

  @Delete(':id')
  removeFromWishlist(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.wishlistService.removeFromWishlist(req.user.id, id);
  }
}
