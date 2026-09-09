import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { OrderStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';

class UpdateAdminOrderDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() { return this.adminService.dashboard(); }

  @Get('users')
  users() { return this.adminService.users(); }

  @Get('users/:id')
  user(@Param('id') id: string) { return this.adminService.user(id); }

  @Get('orders')
  orders() { return this.adminService.orders(); }

  @Get('orders/:id')
  order(@Param('id') id: string) { return this.adminService.order(id); }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateAdminOrderDto) {
    return this.adminService.updateOrderStatus(id, dto.status);
  }
}
