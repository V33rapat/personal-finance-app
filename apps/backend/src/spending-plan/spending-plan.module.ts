import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { SpendingPlanController } from './spending-plan.controller';
import { SpendingPlanService } from './spending-plan.service';

@Module({
  imports: [AuthModule],
  controllers: [SpendingPlanController],
  providers: [SpendingPlanService, PrismaService],
  exports: [SpendingPlanService],
})
export class SpendingPlanModule {}
