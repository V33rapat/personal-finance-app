import { spending_plan_view } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSpendingPlanPreferencesDto {
  @IsEnum(spending_plan_view)
  @IsOptional()
  last_view?: spending_plan_view;

  @IsBoolean()
  @IsOptional()
  show_daily_balance?: boolean;

  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @IsOptional()
  visible_purpose_names?: string[];
}
