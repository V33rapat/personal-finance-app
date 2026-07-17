import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtTokenService } from './jwt.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { AuthenticatedRequest } from './types/authenticated-request';

function createAuthenticatedRequest(userId = 'user-1'): AuthenticatedRequest {
  return {
    user: {
      sub: userId,
      email: 'user@example.com',
      sessionVersion: 1,
    },
  } as AuthenticatedRequest;
}

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: JwtTokenService, useValue: {} },
        {
          provide: PrismaService,
          useValue: { users: { findUnique: jest.fn() } },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('updates the profile using the user id from the JWT request', async () => {
    const dto = { full_name: 'Updated Name' } as UpdateProfileDto;
    authService.updateProfile.mockResolvedValue({ fullName: 'Updated Name' });

    await controller.updateProfile(createAuthenticatedRequest(), dto);

    expect(authService.updateProfile).toHaveBeenCalledWith('user-1', dto);
  });

  it('changes the password using the user id from the JWT request', async () => {
    const dto = {
      current_password: 'CurrentPassword1',
      new_password: 'NewPassword2',
    } as ChangePasswordDto;
    authService.changePassword.mockResolvedValue({
      message: 'Password changed successfully.',
    });

    await controller.changePassword(createAuthenticatedRequest(), dto);

    expect(authService.changePassword).toHaveBeenCalledWith('user-1', dto);
  });
});
