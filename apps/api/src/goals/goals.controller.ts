import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { UpsertGoalDto } from './dto/upsert-goal.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('goals')
export class GoalsController {
  constructor(private goals: GoalsService) {}

  @RequirePermissions('goals.view')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.goals.list(user.hotelId);
  }

  @RequirePermissions('goals.view')
  @Get('progress')
  progress(@CurrentUser() user: RequestUser) {
    return this.goals.progress(user.hotelId);
  }

  @RequirePermissions('goals.manage')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: UpsertGoalDto) {
    return this.goals.create(user.hotelId, dto, user.id);
  }

  @RequirePermissions('goals.manage')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertGoalDto) {
    return this.goals.update(user.hotelId, id, dto);
  }

  @RequirePermissions('goals.manage')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.goals.remove(user.hotelId, id);
  }
}
