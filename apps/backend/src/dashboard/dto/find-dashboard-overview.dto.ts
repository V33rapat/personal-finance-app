import { Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class FindDashboardOverviewDto {
  @Matches(DATE_PATTERN)
  start: string;

  @Matches(DATE_PATTERN)
  end: string;
}
