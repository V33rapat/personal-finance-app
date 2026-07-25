import { IsEnum } from 'class-validator';
import { spending_budget_period } from '@prisma/client';

export class FindSpendingBudgetOverviewDto {
  @IsEnum(spending_budget_period)
  period: spending_budget_period;
}
