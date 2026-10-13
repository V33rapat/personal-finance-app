import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SpendingPlanPurposeDto } from './spending-plan-purpose.dto';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateSpendingPlanDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @Matches(DATE_PATTERN)
  start_date: string;

  @Matches(DATE_PATTERN)
  end_date: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  wallet_ids: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SpendingPlanPurposeDto)
  purposes: SpendingPlanPurposeDto[];
}
