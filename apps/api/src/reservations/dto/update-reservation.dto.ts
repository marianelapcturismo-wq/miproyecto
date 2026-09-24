import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  ratePlanId?: string;

  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestsCount?: number;

  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  agreedPricePerNight?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
