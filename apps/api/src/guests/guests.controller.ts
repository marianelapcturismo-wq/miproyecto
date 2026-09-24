import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { UpsertGuestDto } from './dto/upsert-guest.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('guests')
export class GuestsController {
  constructor(private guests: GuestsService) {}

  @RequirePermissions('guests.view')
  @Get()
  list(@CurrentUser() user: RequestUser, @Query('search') search?: string) {
    return this.guests.list(user.hotelId, search);
  }

  @RequirePermissions('guests.view')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.guests.findOne(user.hotelId, id);
  }

  @RequirePermissions('guests.manage')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: UpsertGuestDto) {
    return this.guests.create(user.hotelId, dto);
  }

  @RequirePermissions('guests.manage')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertGuestDto) {
    return this.guests.update(user.hotelId, id, dto);
  }
}
