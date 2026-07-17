import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwtService = { verifyAsync: jest.fn() };
  const prisma = { users: { findUnique: jest.fn() } };
  const guard = new JwtAuthGuard(jwtService as unknown as JwtService, prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts an access token with the current session version', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      sessionVersion: 2,
    });
    prisma.users.findUnique.mockResolvedValue({ session_version: 2 });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request).toMatchObject({ user: { sub: 'user-1', sessionVersion: 2 } });
  });

  it('rejects a token whose session version has been invalidated', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      sessionVersion: 2,
    });
    prisma.users.findUnique.mockResolvedValue({ session_version: 3 });

    await expect(
      guard.canActivate(createContext({ headers: { authorization: 'Bearer old-token' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a refresh token at an access-token endpoint', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      sessionVersion: 2,
      type: 'refresh',
    });

    await expect(
      guard.canActivate(createContext({ headers: { authorization: 'Bearer refresh-token' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
