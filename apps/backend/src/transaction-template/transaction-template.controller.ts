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
import { CreateTransactionTemplateDto } from './dto/create-transaction-template.dto';
import { FindTransactionTemplateDto } from './dto/find-transaction-template.dto';
import { UpdateTransactionTemplateDto } from './dto/update-transaction-template.dto';
import { TransactionTemplateService } from './transaction-template.service';

@Controller('transaction-template')
@UseGuards(JwtAuthGuard)
export class TransactionTemplateController {
  constructor(private transactionTemplateService: TransactionTemplateService) {}

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: FindTransactionTemplateDto,
  ) {
    return this.transactionTemplateService.findAll(req.user.sub, query);
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTransactionTemplateDto,
  ) {
    return this.transactionTemplateService.create(req.user.sub, dto);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transactionTemplateService.findOne(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionTemplateDto,
  ) {
    return this.transactionTemplateService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transactionTemplateService.delete(req.user.sub, id);
  }
}
