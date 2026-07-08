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
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { TransferService } from './transfer.service';

@Controller('transfer')
@UseGuards(JwtAuthGuard)
export class TransferController {
  constructor(private transferService: TransferService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateTransferDto) {
    return this.transferService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.transferService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.transferService.findOne(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTransferDto,
  ) {
    return this.transferService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.transferService.delete(req.user.sub, id);
  }
}
