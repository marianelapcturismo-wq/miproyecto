import { Module } from '@nestjs/common';
import { HousekeepingService } from './housekeeping.service';
import { HousekeepingController } from './housekeeping.controller';

@Module({
  providers: [HousekeepingService],
  controllers: [HousekeepingController],
})
export class HousekeepingModule {}
