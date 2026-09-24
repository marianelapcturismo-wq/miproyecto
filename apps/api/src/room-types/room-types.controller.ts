import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RoomTypesService } from './room-types.service';
import { UpsertRoomTypeDto } from './dto/upsert-room-type.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('room-types')
export class RoomTypesController {
  constructor(private roomTypes: RoomTypesService) {}

  @RequirePermissions('roomtypes.view')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.roomTypes.list(user.hotelId);
  }

  @RequirePermissions('roomtypes.manage')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: UpsertRoomTypeDto) {
    return this.roomTypes.create(user.hotelId, dto);
  }

  @RequirePermissions('roomtypes.manage')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertRoomTypeDto) {
    return this.roomTypes.update(user.hotelId, id, dto);
  }
}
