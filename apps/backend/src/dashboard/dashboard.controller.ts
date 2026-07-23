import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { DashboardService } from './dashboard.service';
import { UpdateDashboardPreferencesDto } from './dto/update-dashboard-preferences.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Req() req: AuthenticatedRequest, @Query('month') month?: string) {
    return this.dashboardService.getSummary(req.user.sub, month);
  }

  @Get('preferences')
  getPreferences(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getPreferences(req.user.sub);
  }

  @Patch('preferences')
  updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateDashboardPreferencesDto,
  ) {
    return this.dashboardService.updatePreferences(req.user.sub, dto);
  }
}
