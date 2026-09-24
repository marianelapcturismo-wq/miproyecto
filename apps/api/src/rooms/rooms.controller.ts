import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { RoomsService } from './rooms.service';
import { UpsertRoomDto } from './dto/upsert-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('rooms')
export class RoomsController {
  constructor(private rooms: RoomsService) {}

  @RequirePermissions('rooms.view')
  @Get()
  list(@CurrentUser() user: RequestUser, @Query('status') status?: RoomStatus, @Query('roomTypeId') roomTypeId?: string) {
    return this.rooms.list(user.hotelId, status, roomTypeId);
  }

  @RequirePermissions('rooms.manage')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: UpsertRoomDto) {
    return this.rooms.create(user.hotelId, dto);
  }

  @RequirePermissions('rooms.manage')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertRoomDto) {
    return this.rooms.update(user.hotelId, id, dto);
  }

  @RequirePermissions('rooms.status.update')
  @Patch(':id/status')
  updateStatus(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateRoomStatusDto) {
    return this.rooms.updateStatus(user.hotelId, id, dto, user.id);
  }
}
