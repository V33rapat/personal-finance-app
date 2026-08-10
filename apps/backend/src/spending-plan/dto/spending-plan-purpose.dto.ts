import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SpendingPlanAllocationDto {
  @IsString()
  date: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpendingPlanAllocationDto)
  allocations: SpendingPlanAllocationDto[];
}
