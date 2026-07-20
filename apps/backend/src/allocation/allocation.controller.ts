import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';
import { AllocationService } from './allocation.service';

@Controller('allocation')
@UseGuards(JwtAuthGuard)
export class AllocationController {
  constructor(private readonly allocationService: AllocationService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateAllocationDto) {
    return this.allocationService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.allocationService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.allocationService.findOne(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAllocationDto,
  ) {
    return this.allocationService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.allocationService.delete(req.user.sub, id);
  }
}
