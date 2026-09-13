import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const SPENDING_PLAN_DISTRIBUTION_TYPES = [
  'equal_daily',
  'weekdays',
  'weekly',
  'biweekly',
  'specific_dates',
] as const;

export type SpendingPlanDistributionType =
  (typeof SPENDING_PLAN_DISTRIBUTION_TYPES)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class SpendingPlanDistributionDto {
  @IsIn(SPENDING_PLAN_DISTRIBUTION_TYPES)
  type: SpendingPlanDistributionType;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @IsOptional()
  weekdays?: number[];

  @IsArray()
  @ArrayUnique()
  @Matches(DATE_PATTERN, { each: true })
  @IsOptional()
  dates?: string[];
}

export class SpendingPlanPurposeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  category_ids: string[];

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  target_amount: number;

  @ValidateNested({ each: true })
  @Type(() => SpendingPlanDistributionDto)
  distribution: SpendingPlanDistributionDto;
}
