import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertRatePlanDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsBoolean()
  refundable?: boolean;

  @IsOptional()
  @IsBoolean()
  includesBreakfast?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
