import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [AuthModule, WalletModule, TransactionModule],
})
export class AppModule {}
