import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { RazorpayService } from './razorpay/razorpay.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [PaymentsController],
  providers: [RazorpayService, PrismaService],
})
export class PaymentsModule {}
