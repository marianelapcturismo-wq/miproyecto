import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { MaintenancePriority } from '@prisma/client';

export class CreateMaintenanceTaskDto {
  @IsString()
  roomId!: string;

  @IsString()
  @MinLength(1)
  issue!: string;

  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
