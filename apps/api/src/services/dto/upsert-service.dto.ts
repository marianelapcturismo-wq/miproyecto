import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ServiceCategory } from '@prisma/client';

export class UpsertServiceDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
