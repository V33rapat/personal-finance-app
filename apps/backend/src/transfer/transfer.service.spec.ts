import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TransferService, type PrismaTransaction } from './transfer.service';

describe('TransferService', () => {
  it('rejects deleting a transfer managed by a money allocation', async () => {
    const service = new TransferService({} as PrismaService);
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'transfer-1',
      allocation_id: 'allocation-1',
    } as Awaited<ReturnType<TransferService['findOne']>>);

    await expect(service.delete('user-1', 'transfer-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requires active transaction wallets without active sub-wallets', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'source', name: 'Cash', balance: new Prisma.Decimal(500) },
    ]);
    const tx = {
      wallets: { findMany },
    } as unknown as PrismaTransaction;
    const service = new TransferService({} as PrismaService);

    await expect(
      service.createInTransaction(tx, 'user-1', {
        from_wallet_id: 'source',
        to_wallet_id: 'parent',
        amount: new Prisma.Decimal(100),
        transfer_date: '2026-10-01',
        note: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['source', 'parent'] },
        user_id: 'user-1',
        deleted_at: null,
        is_active: true,
        other_wallets: {
          none: { is_active: true, deleted_at: null },
        },
      },
    });
  });
});
