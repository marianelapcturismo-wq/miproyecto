import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class CreateReservationDto {
  @IsString()
  titularGuestId!: string;

  @IsString()
  roomId!: string;

  @IsOptional()
  @IsString()
  ratePlanId?: string;

  @IsDateString()
  checkInDate!: string;

  @IsDateString()
  checkOutDate!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestsCount?: number;

  @IsString()
  channelId!: string;

  @IsNumber()
  @Min(0)
  agreedPricePerNight!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Estado inicial (Consulta/Pre-reserva/Confirmada). Por defecto: Confirmada. */
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
