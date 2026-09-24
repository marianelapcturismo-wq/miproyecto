import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ServicesService } from './services.service';
import { UpsertServiceDto } from './dto/upsert-service.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('services')
export class ServicesController {
  constructor(private services: ServicesService) {}

  @RequirePermissions('services.view', 'consumptions.create')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.services.list(user.hotelId);
  }

  @RequirePermissions('services.manage')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: UpsertServiceDto) {
    return this.services.create(user.hotelId, dto);
  }

  @RequirePermissions('services.manage')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertServiceDto) {
    return this.services.update(user.hotelId, id, dto);
  }
}
