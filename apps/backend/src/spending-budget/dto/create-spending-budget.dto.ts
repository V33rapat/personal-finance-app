import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { spending_budget_period } from '@prisma/client';

export class CreateSpendingBudgetDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Budget amount must be greater than 0' })
  amount: number;

  @IsEnum(spending_budget_period)
  period: spending_budget_period;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  category_ids: string[];

  @IsBoolean()
  includes_uncategorized: boolean;
}
