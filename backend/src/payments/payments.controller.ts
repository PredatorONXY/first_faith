import { Controller, Post, Body, Req, Headers, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RazorpayService } from './razorpay/razorpay.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly razorpayService: RazorpayService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  createPayment(@Body('orderId') orderId: string, @Req() req: Request & { user: { id: string } }) {
    return this.razorpayService.createPaymentOrder(orderId, req.user.id);
  }

  // NOTE: this route must be configured in main.ts / a middleware to receive
  // the RAW request body (not JSON-parsed) so the HMAC signature check is
  // computed over the exact bytes Razorpay signed. See razorpay.service.ts.
  @Post('webhook')
  handleWebhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('x-razorpay-signature') signature: string) {
    return this.razorpayService.handleWebhook(req.rawBody ?? Buffer.from(JSON.stringify(req.body)), signature);
  }
}
