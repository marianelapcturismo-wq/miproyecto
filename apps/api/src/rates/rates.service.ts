import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRatePlanDto } from './dto/upsert-rate-plan.dto';
import { UpsertRateDto } from './dto/upsert-rate.dto';

@Injectable()
export class RatesService {
  constructor(private prisma: PrismaService) {}

  listRatePlans(hotelId: string, activeOnly = false) {
    return this.prisma.ratePlan.findMany({ where: { hotelId, ...(activeOnly ? { active: true } : {}) }, orderBy: { name: 'asc' } });
  }

  async findRatePlan(hotelId: string, id: string) {
    const ratePlan = await this.prisma.ratePlan.findFirst({ where: { id, hotelId } });
    if (!ratePlan) throw new NotFoundException('Plan de tarifa no encontrado');
    return ratePlan;
  }

  createRatePlan(hotelId: string, dto: UpsertRatePlanDto) {
    return this.prisma.ratePlan.create({ data: { hotelId, ...dto } });
  }

  async updateRatePlan(hotelId: string, id: string, dto: UpsertRatePlanDto) {
    await this.findRatePlan(hotelId, id);
    return this.prisma.ratePlan.update({ where: { id }, data: dto });
  }

  listRates(hotelId: string, roomTypeId?: string, ratePlanId?: string) {
    return this.prisma.rate.findMany({
      where: { hotelId, ...(roomTypeId ? { roomTypeId } : {}), ...(ratePlanId ? { ratePlanId } : {}) },
      include: { roomType: true, ratePlan: true },
      orderBy: [{ roomType: { name: 'asc' } }, { validFrom: 'desc' }],
    });
  }

  async findRate(hotelId: string, id: string) {
    const rate = await this.prisma.rate.findFirst({ where: { id, hotelId } });
    if (!rate) throw new NotFoundException('Tarifa no encontrada');
    return rate;
  }

  createRate(hotelId: string, dto: UpsertRateDto) {
    return this.prisma.rate.create({
      data: { hotelId, ratePlanId: dto.ratePlanId, roomTypeId: dto.roomTypeId, price: dto.price, validFrom: new Date(dto.validFrom), validTo: new Date(dto.validTo) },
      include: { roomType: true, ratePlan: true },
    });
  }

  async updateRate(hotelId: string, id: string, dto: UpsertRateDto) {
    await this.findRate(hotelId, id);
    return this.prisma.rate.update({
      where: { id },
      data: { ratePlanId: dto.ratePlanId, roomTypeId: dto.roomTypeId, price: dto.price, validFrom: new Date(dto.validFrom), validTo: new Date(dto.validTo) },
      include: { roomType: true, ratePlan: true },
    });
  }

  async deleteRate(hotelId: string, id: string) {
    await this.findRate(hotelId, id);
    await this.prisma.rate.delete({ where: { id } });
  }

  /** Tarifa vigente para un tipo de habitación en una fecha (usada para sugerir precio al crear una reserva). */
  async findApplicableRate(hotelId: string, roomTypeId: string, ratePlanId: string, date: Date) {
    return this.prisma.rate.findFirst({
      where: {
        hotelId,
        roomTypeId,
        ratePlanId,
        validFrom: { lte: date },
        validTo: { gte: date },
      },
      orderBy: { validFrom: 'desc' },
    });
  }
}
