import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { UpsertChannelDto } from './dto/upsert-channel.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('channels')
export class ChannelsController {
  constructor(private channels: ChannelsService) {}

  @RequirePermissions('channels.view', 'reservations.view', 'reservations.create')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.channels.list(user.hotelId);
  }

  @RequirePermissions('channels.manage')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: UpsertChannelDto) {
    return this.channels.create(user.hotelId, dto);
  }

  @RequirePermissions('channels.manage')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertChannelDto) {
    return this.channels.update(user.hotelId, id, dto);
  }
}
