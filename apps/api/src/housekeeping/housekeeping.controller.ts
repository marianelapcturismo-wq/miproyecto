import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { HousekeepingStatus } from '@prisma/client';
import { HousekeepingService } from './housekeeping.service';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { UpdateHousekeepingTaskDto } from './dto/update-housekeeping-task.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('housekeeping-tasks')
export class HousekeepingController {
  constructor(private housekeeping: HousekeepingService) {}

  @RequirePermissions('housekeeping.view')
  @Get()
  list(@CurrentUser() user: RequestUser, @Query('status') status?: HousekeepingStatus) {
    return this.housekeeping.list(user.hotelId, status);
  }

  @RequirePermissions('housekeeping.manage')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateHousekeepingTaskDto) {
    return this.housekeeping.create(user.hotelId, dto);
  }

  @RequirePermissions('housekeeping.manage')
  @Patch(':id')
  updateStatus(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateHousekeepingTaskDto) {
    return this.housekeeping.updateStatus(user.hotelId, id, dto, user.id);
  }
}
