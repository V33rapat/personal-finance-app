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
import {
  spending_budget_period,
  spending_budget_wallet_scope,
} from '@prisma/client';

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

  @IsEnum(spending_budget_wallet_scope)
  wallet_scope: spending_budget_wallet_scope;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  wallet_ids: string[];

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  category_ids: string[];

  @IsBoolean()
  includes_uncategorized: boolean;
}
