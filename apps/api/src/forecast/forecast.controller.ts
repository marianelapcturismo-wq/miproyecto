import { Controller, Get, Query } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('forecast')
export class ForecastController {
  constructor(private forecast: ForecastService) {}

  @RequirePermissions('kpis.view')
  @Get()
  get(@CurrentUser() user: RequestUser, @Query('days') days?: string) {
    const parsed = Number(days);
    const validDays = [7, 30, 90].includes(parsed) ? parsed : 7;
    return this.forecast.getForecast(user.hotelId, validDays);
  }
}
