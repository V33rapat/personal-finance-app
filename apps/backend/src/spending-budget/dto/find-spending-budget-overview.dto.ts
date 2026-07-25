import { IsEnum, IsOptional, Matches } from 'class-validator';
import { spending_budget_period } from '@prisma/client';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/;
const YEAR_PATTERN = /^[1-9]\d{3}$/;

export class FindSpendingBudgetOverviewDto {
  @IsEnum(spending_budget_period)
  period: spending_budget_period;

  @IsOptional()
  @Matches(DATE_PATTERN)
  date?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  start?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  end?: string;

  @IsOptional()
  @Matches(MONTH_PATTERN)
  month?: string;

  @IsOptional()
  @Matches(YEAR_PATTERN)
  year?: string;
}
