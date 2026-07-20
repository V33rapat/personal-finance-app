import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { TransferModule } from '../transfer/transfer.module';
import { AllocationController } from './allocation.controller';
import { AllocationService } from './allocation.service';

@Module({
  imports: [AuthModule, TransferModule],
  controllers: [AllocationController],
  providers: [AllocationService, PrismaService],
})
export class AllocationModule {}
