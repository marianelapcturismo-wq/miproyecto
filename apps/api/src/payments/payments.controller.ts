import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @RequirePermissions('payments.create')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePaymentDto) {
    return this.payments.create(user.hotelId, dto, user.id);
  }
}
