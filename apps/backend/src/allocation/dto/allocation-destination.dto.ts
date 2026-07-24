import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class AllocationDestinationDto {
  @IsString()
  @IsNotEmpty()
  wallet_id: string;

  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;
}
