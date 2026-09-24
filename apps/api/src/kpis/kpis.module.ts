import { Module } from '@nestjs/common';
import { KpisService } from './kpis.service';
import { KpisController } from './kpis.controller';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [MetricsModule],
  providers: [KpisService],
  controllers: [KpisController],
})
export class KpisModule {}
