// src/wallet/dto/create-wallet.dto.ts
import { IsNotEmpty, IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกชื่อกระเป๋าเงิน' })
  @MaxLength(150)
  name: string;

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