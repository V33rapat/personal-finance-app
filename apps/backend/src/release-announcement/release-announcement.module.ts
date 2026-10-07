import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { ReleaseAnnouncementCatalog } from './release-announcement-catalog';
import { ReleaseAnnouncementController } from './release-announcement.controller';
import { ReleaseAnnouncementStateService } from './release-announcement-state.service';

@Module({
  imports: [AuthModule],
  controllers: [ReleaseAnnouncementController],
  providers: [
    PrismaService,
    ReleaseAnnouncementCatalog,
    ReleaseAnnouncementStateService,
  ],
})
export class ReleaseAnnouncementModule {}
