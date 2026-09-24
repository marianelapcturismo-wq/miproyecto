import { IsDateString, IsNumber, IsString, Min } from 'class-validator';

export class UpsertRateDto {
  @IsString()
  ratePlanId!: string;

  @IsString()
  roomTypeId!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validTo!: string;
}
