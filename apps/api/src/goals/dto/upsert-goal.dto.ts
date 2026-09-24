import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { GoalMetric } from '@prisma/client';

export class UpsertGoalDto {
  @IsEnum(GoalMetric)
  metric!: GoalMetric;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsNumber()
  targetValue!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
