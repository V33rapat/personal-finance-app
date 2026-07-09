import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionTemplateController } from './transaction-template.controller';
import { TransactionTemplateService } from './transaction-template.service';

@Module({
  controllers: [TransactionTemplateController],
  providers: [TransactionTemplateService, PrismaService],
  exports: [TransactionTemplateService],
})
export class TransactionTemplateModule {}
