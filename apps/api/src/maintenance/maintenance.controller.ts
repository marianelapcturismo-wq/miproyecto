import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MaintenanceStatus } from '@prisma/client';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { UpdateMaintenanceTaskDto } from './dto/update-maintenance-task.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('maintenance-tasks')
export class MaintenanceController {
  constructor(private maintenance: MaintenanceService) {}

  @RequirePermissions('maintenance.view')
  @Get()
  list(@CurrentUser() user: RequestUser, @Query('status') status?: MaintenanceStatus) {
    return this.maintenance.list(user.hotelId, status);
  }

  @RequirePermissions('maintenance.manage')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateMaintenanceTaskDto) {
    return this.maintenance.create(user.hotelId, dto, user.id);
  }

  @RequirePermissions('maintenance.manage')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateMaintenanceTaskDto) {
    return this.maintenance.update(user.hotelId, id, dto, user.id);
  }
}
