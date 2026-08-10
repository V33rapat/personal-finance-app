import { IsOptional, Matches } from 'class-validator';

const MONTH_PATTERN = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/;

export class FindSpendingPlanDetailDto {
  @Matches(MONTH_PATTERN)
  @IsOptional()
  month?: string;
}
