import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class ListReservationsQuery {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  status?: ReservationStatus;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  roomTypeId?: string;
}
