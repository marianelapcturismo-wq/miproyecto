import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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

  @IsOptional()
  @IsString()
  channel?: string;

  @IsNumber()
  @Min(0)
  agreedPricePerNight!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
