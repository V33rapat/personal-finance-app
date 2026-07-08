import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTransactionDto, userId: string) {
    // Verify Wallet belongs to user
    const wallet = await this.prisma.wallets.findFirst({
      where: {
        id: dto.wallet_id,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!wallet) {
      throw new NotFoundException('ไม่พบกระเป๋าเงิน');
    }

    if(dto.category_id){
      const category = await this.prisma.categories.findFirst({
        where: {
          id: dto.category_id,
          type: dto.type,
          OR: [
            {user_id: userId},
            {user_id: null, is_system: true}
          ],
        },
      });

      if (!category) {
        throw new NotFoundException('ไม่พบหมวดหมู่');
      }
    }

    const transaction = await this.prisma.transactions.create({
      data: {
        name: dto.name,
        amount: dto.amount,
        type: dto.type,
        wallet_id: dto.wallet_id,
        category_id: dto.category_id || null,
        transaction_date: dto.transaction_date,
        note: dto.note || null,
      },
    });

    const balanceChange = dto.type === 'income' ? dto.amount : -dto.amount;
    await this.prisma.wallets.update({
      where: { id: dto.wallet_id },
      data: { balance: { increment: balanceChange } },
    });

    return transaction;
  }

  async findAll(userId: string, walletId?: string) {
    const where = walletId 
      ? { wallets: { user_id: userId, id: walletId }, deleted_at: null }
      : { wallets: { user_id: userId }, deleted_at: null };

    return this.prisma.transactions.findMany({
      where,
      include: { categories: true, wallets: true },
      orderBy: { transaction_date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transactions.findFirst({
      where: {
        id,
        wallets: { user_id: userId },
        deleted_at: null,
      },
      include: { categories: true, wallets: true },
    });

    if (!transaction) {
      throw new NotFoundException('ไม่พบรายการ');
    }

    return transaction;
  }

  async update(userId: string, dto: UpdateTransactionDto, id: string) {
    const existing = await this.findOne(userId, id);
    await this.assertNotTransferManagedTransaction(id);

    // Verify wallet belongs to user
    const wallet = await this.prisma.wallets.findFirst({
      where: {
        id: existing.wallet_id,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!wallet) {
      throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขรายการนี้');
    }

    if(dto.category_id){
      const category = await this.prisma.categories.findFirst({
        where: {
          id: dto.category_id,
          OR: [
            {user_id: userId},
            {user_id: null, is_system: true}
          ],
        },
      });

      if (!category) {
        throw new NotFoundException('ไม่พบหมวดหมู่');
      }
    }

    const transaction = await this.prisma.transactions.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.amount && { amount: dto.amount }),
        ...(dto.type && { type: dto.type }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.transaction_date && { transaction_date: dto.transaction_date }),
        ...(dto.category_id !== undefined && { category_id: dto.category_id || null }),
      },
    });
    
    // Recalculate wallet balance if amount or type changed
    if (dto.amount !== undefined || dto.type !== undefined) {
      const newAmount = dto.amount !== undefined ? dto.amount : Number(existing.amount);
      const newType = dto.type ?? existing.type;

      // Reverse old
      const oldChange = existing.type === 'income'
        ? -Number(existing.amount)
        : Number(existing.amount);

      // Apply new
      const newChange = newType === 'income'
        ? Number(newAmount)
        : -Number(newAmount);
      
      await this.prisma.wallets.update({
        where: { id: existing.wallet_id },
        data: { balance: { increment: newChange - oldChange } },
      });
    }
    
    return transaction;
  }

  async delete(userId: string, id: string) {
    const transaction = await this.findOne(userId, id);
    await this.assertNotTransferManagedTransaction(id);

    const wallet = await this.prisma.wallets.findFirst({
      where: { id: transaction.wallet_id, user_id: userId },
    });

    if (!wallet) {
      throw new ForbiddenException('ไม่มีสิทธิ์ลบรายการนี้');
    }

    const balanceChange = transaction.type === 'income'
     ? -Number(transaction.amount)
      : Number(transaction.amount);

    await this.prisma.wallets.update({
      where: { id: transaction.wallet_id },
      data: { balance: { increment: balanceChange } },
    });

    // Soft delete
    return this.prisma.transactions.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  private async assertNotTransferManagedTransaction(id: string) {
    const transfer = await this.prisma.transfers.findFirst({
      where: {
        deleted_at: null,
        OR: [
          { from_transaction_id: id },
          { to_transaction_id: id },
        ],
      },
      select: { id: true },
    });

    if (transfer) {
      throw new BadRequestException(
        'This transaction belongs to a transfer. Please edit or delete it through Transfer.',
      );
    }
  }
}
