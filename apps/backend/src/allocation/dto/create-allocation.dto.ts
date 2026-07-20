import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AllocationDestinationDto } from './allocation-destination.dto';

export class CreateAllocationDto {
  @IsString()
  @IsNotEmpty()
  source_wallet_id: string;

  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsDateString()
  allocation_date: string;

  @IsString()
  @IsOptional()
  note?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AllocationDestinationDto)
  destinations: AllocationDestinationDto[];
}
