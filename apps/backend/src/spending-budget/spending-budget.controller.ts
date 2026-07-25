import {
  Body,
  Controller,
  Delete,
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
import { CreateSpendingBudgetDto } from './dto/create-spending-budget.dto';
import { FindSpendingBudgetOverviewDto } from './dto/find-spending-budget-overview.dto';
import { UpdateSpendingBudgetDto } from './dto/update-spending-budget.dto';
import { SpendingBudgetService } from './spending-budget.service';

@Controller('spending-budget')
@UseGuards(JwtAuthGuard)
export class SpendingBudgetController {
  constructor(private readonly spendingBudgetService: SpendingBudgetService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.spendingBudgetService.findAll(req.user.sub);
  }

  @Get('overview')
  getOverview(
    @Req() req: AuthenticatedRequest,
    @Query() query: FindSpendingBudgetOverviewDto,
  ) {
    return this.spendingBudgetService.getOverview(req.user.sub, query.period);
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSpendingBudgetDto,
  ) {
    return this.spendingBudgetService.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSpendingBudgetDto,
  ) {
    return this.spendingBudgetService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.spendingBudgetService.delete(req.user.sub, id);
  }
}
