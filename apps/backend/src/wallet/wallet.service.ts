import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, type wallets } from '@prisma/client';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { PrismaService } from '../prisma/prisma.service';
import { syncWalletBalances } from './wallet-balance.util';

type WalletTreeNode = wallets & {
  children: WalletTreeNode[];
};

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

      if (parentWallet.parent_wallet_id) {
        throw new BadRequestException(
          'ไม่สามารถสร้างกระเป๋าย่อยภายใต้กระเป๋าย่อยได้ (รองรับแค่ 1 ระดับ)',
        );
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
    await syncWalletBalances(this.prisma, userId);

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

      if (parentWallet.parent_wallet_id) {
        throw new BadRequestException(
          'ไม่สามารถย้ายไปอยู่ภายใต้กระเป๋าย่อยได้ (รองรับแค่ 1 ระดับ)',
        );
      }

      const hasChildren = await this.prisma.wallets.findFirst({
        where: {
          parent_wallet_id: walletId,
          deleted_at: null,
        },
      });

      if (hasChildren) {
        throw new BadRequestException(
          'ไม่สามารถเปลี่ยนกระเป๋าหลักที่มีกระเป๋าย่อยอยู่แล้วไปเป็นกระเป๋าย่อยได้',
        );
      }
    }

    const nextParentWalletId = dto.parentWalletId || null;
    const updatedAt = new Date();
    const parentWalletChanged = wallet.parent_wallet_id !== nextParentWalletId;

    const updatedWallet = await this.prisma.$transaction(async (tx) => {
      const nextWallet = await tx.wallets.update({
        where: {
          id: walletId,
        },
        data: {
          name: dto.name,
          parent_wallet_id: nextParentWalletId,
          wallet_type: dto.walletType || 'normal',
          description: dto.description,
          color: dto.color,
          icon: dto.icon,
          updated_at: updatedAt,
        },
      });

      if (parentWalletChanged && wallet.parent_wallet_id) {
        await tx.wallets.update({
          where: { id: wallet.parent_wallet_id },
          data: {
            balance: { decrement: wallet.balance },
            updated_at: updatedAt,
          },
        });
      }

      if (parentWalletChanged && nextParentWalletId) {
        await tx.wallets.update({
          where: { id: nextParentWalletId },
          data: {
            balance: { increment: wallet.balance },
            updated_at: updatedAt,
          },
        });
      }

      return nextWallet;
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

    const deletedAt = new Date();
    const childBalanceTotal = childWallets.reduce(
      (sum, childWallet) => sum.plus(childWallet.balance),
      new Prisma.Decimal(0),
    );
    const parentBalanceDelta = childBalanceTotal.minus(wallet.balance);

    await this.prisma.$transaction(async (tx) => {
      if (childWallets.length > 0) {
        await tx.wallets.updateMany({
          where: {
            parent_wallet_id: walletId,
            deleted_at: null,
          },
          data: {
            parent_wallet_id: wallet.parent_wallet_id,
            updated_at: deletedAt,
          },
        });
      }

      if (wallet.parent_wallet_id && !parentBalanceDelta.isZero()) {
        await tx.wallets.update({
          where: { id: wallet.parent_wallet_id },
          data: {
            balance: { increment: parentBalanceDelta },
            updated_at: deletedAt,
          },
        });
      }

      await tx.transfers.updateMany({
        where: {
          deleted_at: null,
          OR: [{ from_wallet_id: walletId }, { to_wallet_id: walletId }],
        },
        data: {
          deleted_at: deletedAt,
          updated_at: deletedAt,
        },
      });

      await tx.transactions.updateMany({
        where: {
          wallet_id: walletId,
          deleted_at: null,
        },
        data: {
          deleted_at: deletedAt,
          updated_at: deletedAt,
        },
      });

      await tx.wallets.update({
        where: {
          id: walletId,
        },
        data: {
          deleted_at: deletedAt,
          updated_at: deletedAt,
        },
      });
    });

    return { message: 'ลบกระเป๋าเงินสำเร็จ' };
  }

  buildTree(wallets: wallets[]): WalletTreeNode[] {
    const walletMap = new Map<string, WalletTreeNode>();
    const roots: WalletTreeNode[] = [];

    wallets.forEach((wallet) => {
      walletMap.set(wallet.id, { ...wallet, children: [] });
    });

    wallets.forEach((wallet) => {
      if (wallet.parent_wallet_id) {
        const parent = walletMap.get(wallet.parent_wallet_id);
        if (parent) {
          const child = walletMap.get(wallet.id);
          if (child) {
            parent.children.push(child);
          }
        }
      } else {
        const root = walletMap.get(wallet.id);
        if (root) {
          roots.push(root);
        }
      }
    });

    return roots;
  }
}
