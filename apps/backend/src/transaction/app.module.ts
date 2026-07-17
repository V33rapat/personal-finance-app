import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { TransactionService } from './transaction.service';

@Module({
  imports: [AuthModule, WalletModule, TransactionService],
})
export class TransactionModule {}
