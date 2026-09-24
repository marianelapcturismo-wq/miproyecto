import { Controller, Get, Query } from '@nestjs/common';
import { KpisService } from './kpis.service';
import { KpiQueryDto } from './dto/kpi-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('kpis')
@RequirePermissions('kpis.view')
export class KpisController {
  constructor(private kpis: KpisService) {}

  @Get('summary')
  summary(@CurrentUser() user: RequestUser, @Query() query: KpiQueryDto) {
    return this.kpis.summary(user.hotelId, query);
  }

  @Get('series')
  series(@CurrentUser() user: RequestUser, @Query() query: KpiQueryDto) {
    return this.kpis.series(user.hotelId, query);
  }

  @Get('channels')
  channels(@CurrentUser() user: RequestUser, @Query('from') from: string, @Query('to') to: string, @Query('roomTypeId') roomTypeId?: string) {
    return this.kpis.channels(user.hotelId, from, to, roomTypeId);
  }

  @Get('guests')
  guests(@CurrentUser() user: RequestUser, @Query('from') from: string, @Query('to') to: string) {
    return this.kpis.guests(user.hotelId, from, to);
  }

  @Get('consumptions')
  consumptions(@CurrentUser() user: RequestUser, @Query('from') from: string, @Query('to') to: string) {
    return this.kpis.consumptions(user.hotelId, from, to);
  }
}
