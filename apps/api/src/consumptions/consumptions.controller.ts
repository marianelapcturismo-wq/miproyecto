import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ConsumptionsService } from './consumptions.service';
import { CreateConsumptionDto } from './dto/create-consumption.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('consumptions')
export class ConsumptionsController {
  constructor(private consumptions: ConsumptionsService) {}

  @RequirePermissions('reservations.view')
  @Get()
  list(@CurrentUser() user: RequestUser, @Query('reservationId') reservationId: string) {
    return this.consumptions.list(user.hotelId, reservationId);
  }

  @RequirePermissions('consumptions.create')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateConsumptionDto) {
    return this.consumptions.create(user.hotelId, dto, user.id);
  }
}
