import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class KpiQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  roomTypeId?: string;

  @IsOptional()
  @IsIn(['previous_period', 'previous_year', 'none'])
  compare?: 'previous_period' | 'previous_year' | 'none';
}
