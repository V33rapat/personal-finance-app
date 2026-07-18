import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionTemplateController } from './transaction-template.controller';
import { TransactionTemplateService } from './transaction-template.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TransactionTemplateController],
  providers: [TransactionTemplateService, PrismaService],
  exports: [TransactionTemplateService],
})
export class TransactionTemplateModule {}
