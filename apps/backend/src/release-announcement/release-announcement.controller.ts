import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ReleaseAnnouncementIdsDto } from './dto/release-announcement-ids.dto';
import { ReleaseAnnouncementStateService } from './release-announcement-state.service';

@Controller('release-announcement')
@UseGuards(JwtAuthGuard)
export class ReleaseAnnouncementController {
  constructor(private readonly stateService: ReleaseAnnouncementStateService) {}

  @Get('popup')
  getPopup(@Req() request: AuthenticatedRequest) {
    return this.stateService.getPopup(request.user.sub);
  }

  @Get('history')
  getHistory(@Req() request: AuthenticatedRequest) {
    return this.stateService.getHistory(request.user.sub);
  }

  @Post('seen')
  async markSeen(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ReleaseAnnouncementIdsDto,
  ) {
    await this.stateService.markSeen(request.user.sub, dto.release_ids);
    return { success: true };
  }

  @Post('dismiss')
  async dismiss(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ReleaseAnnouncementIdsDto,
  ) {
    await this.stateService.dismiss(request.user.sub, dto.release_ids);
    return { success: true };
  }
}
