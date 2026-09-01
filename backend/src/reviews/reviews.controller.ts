import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ReviewStatus, Role } from '@prisma/client';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReviewsService } from './reviews.service';

class CreateReviewDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;
}

class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Public — powers the reviews section on a product page
  @Get()
  findForProduct(@Query('productId') productId: string) {
    return this.reviewsService.findApprovedForProduct(productId);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Req() req: Request & { user: { id: string } }, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, dto.productId, dto.rating, dto.title, dto.body);
  }

  @Get('admin/all')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAllForAdmin() {
    return this.reviewsService.findAllForAdmin();
  }

  @Patch(':id/status')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.reviewsService.setStatus(id, dto.status);
  }
}
