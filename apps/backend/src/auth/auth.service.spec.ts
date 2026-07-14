import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtTokenService } from './jwt.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('file-type', () => ({ fromBuffer: jest.fn() }));
import { fromBuffer } from 'file-type';
const mockedFromBuffer = fromBuffer as jest.Mock;

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
    avatar_path: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    password_hash: 'should-not-be-returned',
  };
  let storage: {
    createSignedUrl: jest.Mock;
    upload: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      users: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    storage = {
      createSignedUrl: jest.fn(),
      upload: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtTokenService, useValue: {} },
        { provide: SupabaseStorageService, useValue: storage },
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

  it('returns a temporary signed URL when an avatar path exists', async () => {
    const userWithAvatar = { ...user, avatar_path: 'users/user-1/avatar.webp' };
    prisma.users.findUnique.mockResolvedValue(userWithAvatar);
    storage.createSignedUrl.mockResolvedValue('https://signed.example/avatar');

    await expect(service.getProfile(user.id)).resolves.toMatchObject({
      avatarUrl: 'https://signed.example/avatar',
    });
    expect(storage.createSignedUrl).toHaveBeenCalledWith(userWithAvatar.avatar_path);
  });

  it('uploads a validated avatar, replaces the path, and removes the old file', async () => {
    mockedFromBuffer.mockResolvedValue({ mime: 'image/webp', ext: 'webp' });
    const oldPath = 'users/user-1/old.webp';
    const uploadUser = { ...user, avatar_path: oldPath };
    prisma.users.findUnique
      .mockResolvedValueOnce(uploadUser)
      .mockResolvedValueOnce({ ...uploadUser, avatar_path: expect.any(String) });
    storage.createSignedUrl.mockResolvedValue('https://signed.example/new-avatar');

    const result = await service.uploadAvatar(user.id, {
      buffer: Buffer.from('image-data'),
      size: 10,
      mimetype: 'image/webp',
    } as Express.Multer.File);

    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^users\/user-1\/.+\.webp$/),
      expect.any(Buffer),
      'image/webp',
    );
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        avatar_path: expect.stringMatching(/^users\/user-1\/.+\.webp$/),
        updated_at: expect.any(Date),
      },
    });
    expect(storage.remove).toHaveBeenCalledWith(oldPath);
    expect(result.avatarUrl).toBe('https://signed.example/new-avatar');
  });

  it('rejects an avatar when magic bytes do not identify an allowed image', async () => {
    prisma.users.findUnique.mockResolvedValue(user);
    mockedFromBuffer.mockResolvedValue(undefined);

    await expect(service.uploadAvatar(user.id, {
      buffer: Buffer.from('not-an-image'),
      size: 12,
      mimetype: 'image/webp',
    } as Express.Multer.File)).rejects.toBeInstanceOf(BadRequestException);

    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('clears the avatar path and removes the stored file', async () => {
    const avatarPath = 'users/user-1/avatar.webp';
    prisma.users.findUnique
      .mockResolvedValueOnce({ ...user, avatar_path: avatarPath })
      .mockResolvedValueOnce({ ...user, avatar_path: null });

    const result = await service.deleteAvatar(user.id);

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { avatar_path: null, updated_at: expect.any(Date) },
    });
    expect(storage.remove).toHaveBeenCalledWith(avatarPath);
    expect(result.avatarUrl).toBeNull();
  });

  it('rejects updates when the user from the JWT no longer exists', async () => {
    prisma.users.findUnique.mockResolvedValue(null);

    await expect(
      service.updateProfile('missing-user', { full_name: 'New Name' } as UpdateProfileDto),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.users.update).not.toHaveBeenCalled();
  });
});
