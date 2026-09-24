import { IsEnum, IsNumber, IsString, Min, MinLength } from 'class-validator';
import { CashMovementType, PaymentMethod } from '@prisma/client';

export class CreateCashMovementDto {
  @IsEnum(CashMovementType)
  type!: CashMovementType;

  @IsString()
  @MinLength(1)
  concept!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
