import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('audit-logs')
export class AuditController {
  constructor(private audit: AuditService) {}

  @RequirePermissions('audit.view')
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.audit.list(user.hotelId, { entityType, userId, from, to });
  }
}
