import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { SpendingBudgetController } from './spending-budget.controller';
import { SpendingBudgetService } from './spending-budget.service';

@Module({
  imports: [AuthModule],
  controllers: [SpendingBudgetController],
  providers: [SpendingBudgetService, PrismaService],
  exports: [SpendingBudgetService],
})
export class SpendingBudgetModule {}
