import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertChannelDto } from './dto/upsert-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  list(hotelId: string) {
    return this.prisma.channel.findMany({ where: { hotelId }, orderBy: { name: 'asc' } });
  }

  async findOne(hotelId: string, id: string) {
    const channel = await this.prisma.channel.findFirst({ where: { id, hotelId } });
    if (!channel) throw new NotFoundException('Canal no encontrado');
    return channel;
  }

  create(hotelId: string, dto: UpsertChannelDto) {
    return this.prisma.channel.create({ data: { hotelId, code: dto.code.toUpperCase(), name: dto.name, commissionPct: dto.commissionPct, active: dto.active } });
  }

  async update(hotelId: string, id: string, dto: UpsertChannelDto) {
    await this.findOne(hotelId, id);
    return this.prisma.channel.update({ where: { id }, data: { code: dto.code.toUpperCase(), name: dto.name, commissionPct: dto.commissionPct, active: dto.active } });
  }
}
