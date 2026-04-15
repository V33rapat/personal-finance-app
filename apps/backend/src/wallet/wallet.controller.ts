import { Controller, Delete, Get, Param, Patch, Post, Body, Req, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateWalletDto) {
    const userId = req.user.sub;
    return this.walletService.create(dto, userId);
  }

  @Get()
  findAll(@Req() req: any) {
    const userId = req.user.sub;
    return this.walletService.findAll(userId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.walletService.findOne(userId, id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateWalletDto) {
    const userId = req.user.sub;
    return this.walletService.update(userId, dto, id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.walletService.delete(userId, id);
  }
}