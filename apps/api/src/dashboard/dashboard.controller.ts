import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @RequirePermissions('dashboard.view')
  @Get('today')
  today(@CurrentUser() user: RequestUser) {
    return this.dashboard.today(user.hotelId);
  }
}
