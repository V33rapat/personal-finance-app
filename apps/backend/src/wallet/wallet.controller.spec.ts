import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';
import { JwtTokenService } from '../auth/jwt.service';

describe('WalletController', () => {
  let controller: WalletController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        { provide: WalletService, useValue: {} },
        { provide: JwtTokenService, useValue: {} },
        {
          provide: PrismaService,
          useValue: { users: { findUnique: jest.fn() } },
        },
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
