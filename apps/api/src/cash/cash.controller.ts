import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CashService } from './cash.service';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('cash-sessions')
export class CashController {
  constructor(private cash: CashService) {}

  @RequirePermissions('cash.view')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.cash.list(user.hotelId);
  }

  @RequirePermissions('cash.view')
  @Get('current')
  current(@CurrentUser() user: RequestUser) {
    return this.cash.current(user.hotelId);
  }

  @RequirePermissions('cash.view')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.cash.findOne(user.hotelId, id);
  }

  @RequirePermissions('cash.manage')
  @Post('open')
  open(@CurrentUser() user: RequestUser, @Body() dto: OpenCashSessionDto) {
    return this.cash.open(user.hotelId, dto, user.id);
  }

  @RequirePermissions('cash.manage')
  @Post(':id/close')
  close(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CloseCashSessionDto) {
    return this.cash.close(user.hotelId, id, dto, user.id);
  }

  @RequirePermissions('cash.manage')
  @Post(':id/movements')
  addMovement(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateCashMovementDto) {
    return this.cash.addMovement(user.hotelId, id, dto, user.id);
  }
}
