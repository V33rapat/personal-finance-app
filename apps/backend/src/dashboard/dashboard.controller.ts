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
import { FindDashboardOverviewDto } from './dto/find-dashboard-overview.dto';
import { UpdateDashboardPreferencesDto } from './dto/update-dashboard-preferences.dto';
import { UpdateDashboardWalletSummaryDto } from './dto/update-dashboard-wallet-summary.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Req() req: AuthenticatedRequest, @Query('month') month?: string) {
    return this.dashboardService.getSummary(req.user.sub, month);
  }

  @Get('overview')
  getOverview(
    @Req() req: AuthenticatedRequest,
    @Query() query: FindDashboardOverviewDto,
  ) {
    return this.dashboardService.getOverview(
      req.user.sub,
      query.start,
      query.end,
    );
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

  @Get('wallet-summary')
  getWalletSummary(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getWalletSummary(req.user.sub);
  }

  @Patch('wallet-summary')
  updateWalletSummary(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateDashboardWalletSummaryDto,
  ) {
    return this.dashboardService.updateWalletSummary(req.user.sub, dto);
  }
}
