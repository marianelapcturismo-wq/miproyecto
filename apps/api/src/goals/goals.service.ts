import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalMetric, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { addDays } from '../common/utils/date';
import { UpsertGoalDto } from './dto/upsert-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
  ) {}

  list(hotelId: string) {
    return this.prisma.goal.findMany({ where: { hotelId }, orderBy: { periodStart: 'desc' } });
  }

  async findOne(hotelId: string, id: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id, hotelId } });
    if (!goal) throw new NotFoundException('Objetivo no encontrado');
    return goal;
  }

  create(hotelId: string, dto: UpsertGoalDto, userId: string) {
    return this.prisma.goal.create({
      data: { hotelId, metric: dto.metric, periodStart: new Date(dto.periodStart), periodEnd: new Date(dto.periodEnd), targetValue: dto.targetValue, notes: dto.notes, createdById: userId },
    });
  }

  async update(hotelId: string, id: string, dto: UpsertGoalDto) {
    await this.findOne(hotelId, id);
    return this.prisma.goal.update({
      where: { id },
      data: { metric: dto.metric, periodStart: new Date(dto.periodStart), periodEnd: new Date(dto.periodEnd), targetValue: dto.targetValue, notes: dto.notes },
    });
  }

  async remove(hotelId: string, id: string) {
    await this.findOne(hotelId, id);
    await this.prisma.goal.delete({ where: { id } });
  }

  async progress(hotelId: string) {
    const goals = await this.list(hotelId);
    const results = [];
    for (const goal of goals) {
      const rangeTo = addDays(goal.periodEnd, 1);
      const actual = await this.computeActual(hotelId, goal.metric, goal.periodStart, rangeTo);
      const target = Number(goal.targetValue);
      const isMaxTarget = goal.metric === GoalMetric.CANCELACIONES;
      const achievedPct = target > 0 ? (actual / target) * 100 : 0;
      const onTrack = isMaxTarget ? actual <= target : actual >= target;
      results.push({ ...goal, actualValue: actual, achievedPct, onTrack, isMaxTarget });
    }
    return results;
  }

  private async computeActual(hotelId: string, metric: GoalMetric, from: Date, to: Date): Promise<number> {
    if (metric === GoalMetric.OCUPACION || metric === GoalMetric.ADR || metric === GoalMetric.REVPAR || metric === GoalMetric.INGRESOS) {
      const aggregate = await this.metrics.getAggregate(hotelId, from, to);
      if (metric === GoalMetric.OCUPACION) return aggregate.occupancyRate;
      if (metric === GoalMetric.ADR) return aggregate.adr;
      if (metric === GoalMetric.REVPAR) return aggregate.revpar;
      return aggregate.totalRevenue;
    }

    if (metric === GoalMetric.CANCELACIONES) {
      return this.prisma.reservation.count({ where: { hotelId, status: ReservationStatus.CANCELADA, checkInDate: { gte: from, lt: to } } });
    }

    // VENTA_DIRECTA_PCT
    const reservations = await this.prisma.reservation.findMany({
      where: { hotelId, status: { not: ReservationStatus.CONSULTA }, checkInDate: { gte: from, lt: to } },
      select: { channel: { select: { code: true } } },
    });
    if (reservations.length === 0) return 0;
    const direct = reservations.filter((r) => r.channel.code === 'DIRECTO').length;
    return (direct / reservations.length) * 100;
  }
}
