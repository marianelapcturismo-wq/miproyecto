import { Controller, Get, Query } from '@nestjs/common';
import { RatesService } from './rates.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('rate-plans')
export class RatesController {
  constructor(private rates: RatesService) {}

  @RequirePermissions('reservations.view', 'reservations.create')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.rates.listRatePlans(user.hotelId);
  }

  @RequirePermissions('reservations.view', 'reservations.create')
  @Get('applicable-rate')
  applicableRate(
    @CurrentUser() user: RequestUser,
    @Query('roomTypeId') roomTypeId: string,
    @Query('ratePlanId') ratePlanId: string,
    @Query('date') date: string,
  ) {
    return this.rates.findApplicableRate(user.hotelId, roomTypeId, ratePlanId, new Date(date));
  }
}
