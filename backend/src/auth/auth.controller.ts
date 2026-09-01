import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { AuthService } from './auth.service';

class SyncUserDto {
  @IsUUID()
  supabaseAuthId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Called by the frontend immediately after Supabase sign-up/sign-in
  // succeeds, so our own User table stays in sync.
  @Post('sync')
  sync(@Body() dto: SyncUserDto) {
    return this.authService.syncUser(dto.supabaseAuthId, dto.email, dto.fullName);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  me(@Req() req: Request & { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }
}
