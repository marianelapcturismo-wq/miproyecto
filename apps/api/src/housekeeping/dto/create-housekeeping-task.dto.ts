import { IsOptional, IsString } from 'class-validator';

export class CreateHousekeepingTaskDto {
  @IsString()
  roomId!: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
