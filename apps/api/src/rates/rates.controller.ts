import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RatesService } from './rates.service';
import { UpsertRatePlanDto } from './dto/upsert-rate-plan.dto';
import { UpsertRateDto } from './dto/upsert-rate.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('rate-plans')
export class RatesController {
  constructor(private rates: RatesService) {}

  @RequirePermissions('reservations.view', 'reservations.create')
  @Get()
  listRatePlans(@CurrentUser() user: RequestUser, @Query('activeOnly') activeOnly?: string) {
    return this.rates.listRatePlans(user.hotelId, activeOnly === 'true');
  }

  @RequirePermissions('rates.manage')
  @Post()
  createRatePlan(@CurrentUser() user: RequestUser, @Body() dto: UpsertRatePlanDto) {
    return this.rates.createRatePlan(user.hotelId, dto);
  }

  @RequirePermissions('rates.manage')
  @Patch(':id')
  updateRatePlan(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertRatePlanDto) {
    return this.rates.updateRatePlan(user.hotelId, id, dto);
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

@Controller('rates')
export class RatesRatesController {
  constructor(private rates: RatesService) {}

  @RequirePermissions('rates.manage')
  @Get()
  list(@CurrentUser() user: RequestUser, @Query('roomTypeId') roomTypeId?: string, @Query('ratePlanId') ratePlanId?: string) {
    return this.rates.listRates(user.hotelId, roomTypeId, ratePlanId);
  }

  @RequirePermissions('rates.manage')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: UpsertRateDto) {
    return this.rates.createRate(user.hotelId, dto);
  }

  @RequirePermissions('rates.manage')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertRateDto) {
    return this.rates.updateRate(user.hotelId, id, dto);
  }

  @RequirePermissions('rates.manage')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rates.deleteRate(user.hotelId, id);
  }
}
