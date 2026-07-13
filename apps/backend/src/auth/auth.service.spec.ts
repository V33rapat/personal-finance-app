import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtTokenService } from './jwt.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    users: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const user = {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'Original Name',
    role: 'user',
    avatar_url: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    password_hash: 'should-not-be-returned',
  };

  beforeEach(async () => {
    prisma = {
      users: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtTokenService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('updates only the current user full name and returns a safe profile', async () => {
    prisma.users.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ ...user, full_name: 'Updated Name' });
    prisma.users.update.mockResolvedValue({ ...user, full_name: 'Updated Name' });

    const dto = { full_name: '  Updated Name  ' } as UpdateProfileDto;
    const result = await service.updateProfile(user.id, dto);

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        full_name: 'Updated Name',
        updated_at: expect.any(Date),
      },
    });
    expect(result).toEqual({
      id: user.id,
      email: user.email,
      fullName: 'Updated Name',
      role: user.role,
      avatarUrl: null,
      createdAt: user.created_at,
    });
    expect(result).not.toHaveProperty('password_hash');
  });

  it('rejects updates when the user from the JWT no longer exists', async () => {
    prisma.users.findUnique.mockResolvedValue(null);

    await expect(
      service.updateProfile('missing-user', { full_name: 'New Name' } as UpdateProfileDto),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.users.update).not.toHaveBeenCalled();
  });
});
