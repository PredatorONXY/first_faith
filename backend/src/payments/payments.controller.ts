import { Controller, Post, Body, Req, Headers, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RazorpayService } from './razorpay/razorpay.service';

class CreatePaymentDto {
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsString()
  guestToken?: string;
}

export class VerifyPaymentDto {
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsString()
  guestToken?: string;

  @IsString()
  @IsNotEmpty()
  razorpayPaymentId!: string;

  @IsString()
  @IsNotEmpty()
  razorpayOrderId!: string;

  @IsString()
  @IsNotEmpty()
  razorpaySignature!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly razorpayService: RazorpayService) {}

  @Post('create')
  @UseGuards(OptionalJwtAuthGuard)
  createPayment(@Body() dto: CreatePaymentDto, @Req() req: Request) {
    const user = (req as any)?.user;
    return this.razorpayService.createPaymentOrder(dto.orderId, dto.guestToken, user?.id);
  }

  @Post('verify')
  @UseGuards(OptionalJwtAuthGuard)
  verifyPayment(@Body() dto: VerifyPaymentDto, @Req() req: Request) {
    const user = (req as any)?.user;
    return this.razorpayService.verifyPayment(dto, user?.id);
  }

  // NOTE: this route must be configured in main.ts / a middleware to receive
  // the RAW request body (not JSON-parsed) so the HMAC signature check is
  // computed over the exact bytes Razorpay signed. See razorpay.service.ts.
  @Post('webhook')
  handleWebhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('x-razorpay-signature') signature: string) {
    return this.razorpayService.handleWebhook(req.rawBody ?? Buffer.from(JSON.stringify(req.body)), signature);
  }
}
