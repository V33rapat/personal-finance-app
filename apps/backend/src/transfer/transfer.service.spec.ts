import { BadRequestException } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { PrismaService } from '../prisma/prisma.service';

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
});
