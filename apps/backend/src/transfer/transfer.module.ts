import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TransferController],
  providers: [TransferService, PrismaService],
})
export class TransferModule {}
