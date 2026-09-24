import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RatesService {
  constructor(private prisma: PrismaService) {}

  listRatePlans(hotelId: string) {
    return this.prisma.ratePlan.findMany({ where: { hotelId, active: true }, orderBy: { name: 'asc' } });
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
