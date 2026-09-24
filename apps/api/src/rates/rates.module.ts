import { Module } from '@nestjs/common';
import { RatesService } from './rates.service';
import { RatesController, RatesRatesController } from './rates.controller';

@Module({
  providers: [RatesService],
  controllers: [RatesController, RatesRatesController],
  exports: [RatesService],
})
export class RatesModule {}
