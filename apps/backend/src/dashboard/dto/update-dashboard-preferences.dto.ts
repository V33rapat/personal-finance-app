import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsUUID,
  Matches,
} from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateDashboardPreferencesDto {
  @Matches(DATE_PATTERN)
  period_start: string;

  @Matches(DATE_PATTERN)
  period_end: string;

  @IsBoolean()
  is_category_breakdown_enabled: boolean;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  hidden_category_ids: string[];
}
