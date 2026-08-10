import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CopySpendingPlanDto } from './dto/copy-spending-plan.dto';
import { CreateSpendingPlanDto } from './dto/create-spending-plan.dto';
import { FindSpendingPlanDetailDto } from './dto/find-spending-plan-detail.dto';
import { UpdateSpendingPlanDto } from './dto/update-spending-plan.dto';
import { UpdateSpendingPlanPreferencesDto } from './dto/update-spending-plan-preferences.dto';
import { SpendingPlanService } from './spending-plan.service';

@Controller('spending-plan')
@UseGuards(JwtAuthGuard)
export class SpendingPlanController {
  constructor(private readonly spendingPlanService: SpendingPlanService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.spendingPlanService.findAll(req.user.sub);
  }

  @Get('dashboard-summary')
  getDashboardSummary(@Req() req: AuthenticatedRequest) {
    return this.spendingPlanService.getDashboardSummary(req.user.sub);
  }

  @Get(':id/revisions/:revisionId')
  findRevision(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
  ) {
    return this.spendingPlanService.findRevision(req.user.sub, id, revisionId);
  }

  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: FindSpendingPlanDetailDto,
  ) {
    return this.spendingPlanService.findOne(req.user.sub, id, query);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateSpendingPlanDto) {
    return this.spendingPlanService.create(req.user.sub, dto);
  }

  @Post(':id/copy')
  copy(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CopySpendingPlanDto,
  ) {
    return this.spendingPlanService.copy(req.user.sub, id, dto);
  }

  @Post(':id/cancel')
  cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.spendingPlanService.cancel(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSpendingPlanDto,
  ) {
    return this.spendingPlanService.update(req.user.sub, id, dto);
  }

  @Patch(':id/preferences')
  updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSpendingPlanPreferencesDto,
  ) {
    return this.spendingPlanService.updatePreferences(req.user.sub, id, dto);
  }
}
