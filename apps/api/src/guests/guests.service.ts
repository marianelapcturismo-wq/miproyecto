import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertGuestDto } from './dto/upsert-guest.dto';

@Injectable()
export class GuestsService {
  constructor(private prisma: PrismaService) {}

  async list(hotelId: string, search?: string) {
    return this.prisma.guest.findMany({
      where: {
        hotelId,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { documentNumber: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { lastName: 'asc' },
    });
  }

  async findOne(hotelId: string, id: string) {
    const guest = await this.prisma.guest.findFirst({
      where: { id, hotelId },
      include: {
        reservationsAsTitular: {
          orderBy: { checkInDate: 'desc' },
          include: { room: { include: { roomType: true } }, payments: true },
        },
      },
    });
    if (!guest) throw new NotFoundException('Huésped no encontrado');
    return guest;
  }

  async create(hotelId: string, dto: UpsertGuestDto) {
    return this.prisma.guest.create({ data: { hotelId, ...dto, birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined } });
  }

  async update(hotelId: string, id: string, dto: UpsertGuestDto) {
    await this.findOne(hotelId, id);
    return this.prisma.guest.update({
      where: { id },
      data: { ...dto, birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined },
    });
  }
}
