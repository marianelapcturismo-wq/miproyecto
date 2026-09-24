import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RoomStatus } from '@prisma/client';

export class UpdateRoomStatusDto {
  @IsEnum(RoomStatus)
  status!: RoomStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
