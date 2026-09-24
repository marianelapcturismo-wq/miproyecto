import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MaintenancePriority, MaintenanceStatus } from '@prisma/client';

export class UpdateMaintenanceTaskDto {
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

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
