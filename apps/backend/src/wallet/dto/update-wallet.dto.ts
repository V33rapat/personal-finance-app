// src/wallet/dto/update-wallet.dto.ts
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class UpdateWalletDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @IsString()
  @IsOptional()
  parentWalletId?: string;

  @IsEnum(['normal', 'investment'])
  @IsOptional()
  walletType?: 'normal' | 'investment';

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(7)
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;
}