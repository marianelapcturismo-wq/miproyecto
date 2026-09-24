import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ListReservationsQuery } from './dto/list-reservations.query';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('reservations')
export class ReservationsController {
  constructor(private reservations: ReservationsService) {}

  @RequirePermissions('reservations.view')
  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListReservationsQuery) {
    return this.reservations.list(user.hotelId, query);
  }

  @RequirePermissions('reservations.view', 'reservations.create')
  @Get('available-rooms')
  availableRooms(
    @CurrentUser() user: RequestUser,
    @Query('roomTypeId') roomTypeId: string,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
    @Query('excludeReservationId') excludeReservationId?: string,
  ) {
    return this.reservations.availableRooms(user.hotelId, roomTypeId, new Date(checkInDate), new Date(checkOutDate), excludeReservationId);
  }

  @RequirePermissions('reservations.view')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reservations.findOne(user.hotelId, id);
  }

  @RequirePermissions('reservations.create')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReservationDto) {
    return this.reservations.create(user.hotelId, dto, user.id);
  }

  @RequirePermissions('reservations.update')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservations.update(user.hotelId, id, dto, user.id);
  }

  @RequirePermissions('reservations.update')
  @Post(':id/confirm')
  confirm(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reservations.confirm(user.hotelId, id, user.id);
  }

  @RequirePermissions('reservations.cancel')
  @Post(':id/cancel')
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.reservations.cancel(user.hotelId, id, user.id, reason);
  }

  @RequirePermissions('reservations.checkin')
  @Post(':id/checkin')
  checkin(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reservations.checkin(user.hotelId, id, user.id);
  }

  @RequirePermissions('reservations.checkout')
  @Post(':id/checkout')
  checkout(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reservations.checkout(user.hotelId, id, user.id);
  }
}
