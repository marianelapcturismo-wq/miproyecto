import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpsertRoomTypeDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsNumber()
  @Min(0)
  basePrice!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
