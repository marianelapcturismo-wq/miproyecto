import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { GuestsModule } from './guests/guests.module';
import { RoomTypesModule } from './room-types/room-types.module';
import { RoomsModule } from './rooms/rooms.module';
import { RatesModule } from './rates/rates.module';
import { ChannelsModule } from './channels/channels.module';
import { ServicesModule } from './services/services.module';
import { ConsumptionsModule } from './consumptions/consumptions.module';
import { CashModule } from './cash/cash.module';
import { HousekeepingModule } from './housekeeping/housekeeping.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ReservationsModule } from './reservations/reservations.module';
import { PaymentsModule } from './payments/payments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MetricsModule } from './metrics/metrics.module';
import { KpisModule } from './kpis/kpis.module';
import { ForecastModule } from './forecast/forecast.module';
import { GoalsModule } from './goals/goals.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    GuestsModule,
    RoomTypesModule,
    RoomsModule,
    RatesModule,
    ChannelsModule,
    ServicesModule,
    ConsumptionsModule,
    CashModule,
    HousekeepingModule,
    MaintenanceModule,
    ReservationsModule,
    PaymentsModule,
    DashboardModule,
    MetricsModule,
    KpisModule,
    ForecastModule,
    GoalsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
