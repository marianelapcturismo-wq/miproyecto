import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateConsumptionDto {
  @IsString()
  reservationId!: string;

  @IsString()
  serviceId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  notes?: string;
}
