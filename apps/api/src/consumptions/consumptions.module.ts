import { Module } from '@nestjs/common';
import { ConsumptionsService } from './consumptions.service';
import { ConsumptionsController } from './consumptions.controller';

@Module({
  providers: [ConsumptionsService],
  controllers: [ConsumptionsController],
})
export class ConsumptionsModule {}
