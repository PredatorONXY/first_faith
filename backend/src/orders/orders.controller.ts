import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentProvider, Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrdersService } from './orders.service';

export class GuestCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  phone!: string;
}

export class GuestShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(160)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  line2?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  state!: string;

  @Matches(/^\d{6}$/, { message: 'PIN code must be a 6-digit Indian PIN' })
  postalCode!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  phone?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestCustomerDto)
  customer?: GuestCustomerDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GuestShippingAddressDto)
  shippingAddress?: GuestShippingAddressDto;

  @IsOptional()
  @IsString()
  addressId?: string;

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

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(
    @Headers('x-cart-session') sessionToken: string | undefined,
    @Body() dto: CreateOrderDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.ordersService.createOrder({
      sessionToken,
      userId: user?.id,
      customer: dto.customer,
      shippingAddress: dto.shippingAddress,
      addressId: dto.addressId,
      paymentMethod: dto.paymentMethod,
      couponCode: dto.couponCode,
    });
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findMine(@Req() req: Request) {
    const user = (req as any).user;
    if (!user?.id) return [];
    return this.ordersService.findAllForUser(user.id);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAllForAdmin() {
    return this.ordersService.findAllForAdmin();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('token') guestToken: string | undefined,
    @Req() req: Request,
  ) {
    const user = (req as any)?.user;
    const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN;
    return this.ordersService.findOne(id, guestToken, user?.id, isAdmin);
  }
}
