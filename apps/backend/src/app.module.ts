import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { CategoryModule } from './category/category.module';
import { TransferModule } from './transfer/transfer.module';
import { TransactionTemplateModule } from './transaction-template/transaction-template.module';
import { StorageModule } from './storage/storage.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    AuthModule,
    WalletModule,
    TransactionModule,
    CategoryModule,
    TransferModule,
    TransactionTemplateModule,
    StorageModule,
  ],
})
export class AppModule {}
