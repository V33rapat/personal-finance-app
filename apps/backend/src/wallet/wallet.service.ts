import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWalletDto, userId: string) {
    if (dto.parentWalletId) {
      const parentWallet = await this.prisma.wallets.findFirst({
        where: {
          id: dto.parentWalletId,
          user_id: userId,
        },
      });

      if (!parentWallet) {
        throw new NotFoundException('ไม่พบกระเป๋าเงินหลัก');
      }
    }

    const wallet = await this.prisma.wallets.create({
      data: {
        user_id: userId,
        name: dto.name,
        parent_wallet_id: dto.parentWalletId || null,
        wallet_type: dto.walletType || 'normal',
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        currency: 'THB',
        balance: 0,
      },
    });

    return wallet;
  }

  async findAll(userId: string) {
    const wallets = await this.prisma.wallets.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return wallets;
  }

  async findOne(userId: string, id: string) {
    const wallet = await this.prisma.wallets.findFirst({
      where: {
        id: id,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!wallet) {
      throw new NotFoundException('ไม่พบกระเป๋าเงิน');
    }

    return wallet;
  }

  async update(userId: string, dto: UpdateWalletDto, walletId: string) {
    const wallet = await this.prisma.wallets.findFirst({
      where: {
        id: walletId,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!wallet) {
      throw new NotFoundException('ไม่พบกระเป๋าเงิน');
    }

    if (dto.parentWalletId) {
      if (dto.parentWalletId === walletId) {
        throw new BadRequestException('ไม่สามารถย้ายไปหาตัวเองได้');
      }

      const parentWallet = await this.prisma.wallets.findFirst({
        where: {
          id: dto.parentWalletId,
          user_id: userId,
          deleted_at: null,
        },
      });

      if (!parentWallet) {
        throw new NotFoundException('ไม่พบกระเป๋าเงินหลัก');
      }
    }

    const updatedWallet = await this.prisma.wallets.update({
      where: {
        id: walletId,
      },
      data: {
        name: dto.name,
        parent_wallet_id: dto.parentWalletId || null,
        wallet_type: dto.walletType || 'normal',
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        updated_at: new Date(),
      },
    });

    return updatedWallet;
  }

  async delete(userId: string, walletId: string) {
    const wallet = await this.prisma.wallets.findFirst({
      where: {
        id: walletId,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!wallet) {
      throw new NotFoundException('ไม่พบกระเป๋าเงิน');
    }

    const childWallets = await this.prisma.wallets.findMany({
      where: {
        parent_wallet_id: walletId,
        deleted_at: null,
      },
    });

    if (childWallets.length > 0) {
      await this.prisma.wallets.updateMany({
        where: {
          parent_wallet_id: walletId,
          deleted_at: null,
        },
        data: {
          parent_wallet_id: wallet.parent_wallet_id,
          updated_at: new Date(),
        },
      });
    }

    await this.prisma.wallets.update({
      where: {
        id: walletId,
      },
      data: {
        deleted_at: new Date(),
      },
    });

    return { message: 'ลบกระเป๋าเงินสำเร็จ' };
  }

  buildTree(wallets: any[]) {
    const walletMap = new Map();
    const roots: any[] = [];

    wallets.forEach((wallet) => {
      walletMap.set(wallet.id, { ...wallet, children: [] });
    });

    wallets.forEach((wallet) => {
      if (wallet.parent_wallet_id) {
        const parent = walletMap.get(wallet.parent_wallet_id);
        if (parent) {
          parent.children.push(walletMap.get(wallet.id));
        }
      } else {
        roots.push(walletMap.get(wallet.id));
      }
    });

    return roots;
  }
}