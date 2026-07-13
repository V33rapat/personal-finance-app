import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: JwtService, useValue: {} },
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

    await controller.updateProfile({ user: { sub: 'user-1' } }, dto);

    expect(authService.updateProfile).toHaveBeenCalledWith('user-1', dto);
  });
});
