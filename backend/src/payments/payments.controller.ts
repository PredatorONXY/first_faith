import { Controller, Post, Body, Req, Headers, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RazorpayService } from './razorpay/razorpay.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly razorpayService: RazorpayService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  createPayment(@Body('orderId') orderId: string) {
    return this.razorpayService.createPaymentOrder(orderId);
  }

  // NOTE: this route must be configured in main.ts / a middleware to receive
  // the RAW request body (not JSON-parsed) so the HMAC signature check is
  // computed over the exact bytes Razorpay signed. See razorpay.service.ts.
  @Post('webhook')
  handleWebhook(@Req() req: Request, @Headers('x-razorpay-signature') signature: string) {
    return this.razorpayService.handleWebhook(req.body, signature);
  }
}
