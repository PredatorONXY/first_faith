import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { OrderStatus, PaymentProvider, Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrdersService } from './orders.service';

class CreateOrderDto {
  @IsUUID()
  addressId!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsEnum(PaymentProvider)
  paymentMethod!: PaymentProvider;
}

class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

type AuthedRequest = Request & { user: { id: string } };

// Every route here requires a logged-in customer or admin — checkout is
// intentionally not available to guests, since an Order must be tied to
// a real account for order history and support.
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromCart(req.user.id, dto.addressId, dto.paymentMethod, dto.couponCode);
  }

  @Get()
  findMine(@Req() req: AuthedRequest) {
    return this.ordersService.findAllForUser(req.user.id);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAllForAdmin() {
    return this.ordersService.findAllForAdmin();
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.ordersService.findOne(id, req.user.id);
  }
}
