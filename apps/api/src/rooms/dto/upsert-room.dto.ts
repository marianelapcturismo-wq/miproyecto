import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { RoomStatus } from '@prisma/client';

export class UpsertRoomDto {
  @IsString()
  @MinLength(1)
  number!: string;

  @IsString()
  roomTypeId!: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  beds?: string;

  @IsOptional()
  @IsString()
  features?: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
