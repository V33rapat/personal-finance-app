// ---------------------------------------------------------------------------
// jwt.service.ts
// JWT token generation and verification
// ---------------------------------------------------------------------------

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface BaseTokenPayload {
  sub: string;
  email: string;
  sessionVersion: number;
  type?: unknown;
}

export type AccessTokenPayload = Omit<BaseTokenPayload, 'type'> & {
  type?: undefined;
};

export type RefreshTokenPayload = Omit<BaseTokenPayload, 'type'> & {
  type: 'refresh';
};

function isBaseTokenPayload(value: unknown): value is BaseTokenPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.sessionVersion === 'number'
  );
}

export function isAccessTokenPayload(
  value: unknown,
): value is AccessTokenPayload {
  return isBaseTokenPayload(value) && value.type === undefined;
}

export function isRefreshTokenPayload(
  value: unknown,
): value is RefreshTokenPayload {
  return isBaseTokenPayload(value) && value.type === 'refresh';
}

@Injectable()
export class JwtTokenService {
  constructor(private jwtService: JwtService) {}

  async generateTokens(userId: string, email: string, sessionVersion: number) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, sessionVersion },
        { expiresIn: '8h' },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, sessionVersion, type: 'refresh' },
        { expiresIn: '7d' },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<unknown> {
    return this.jwtService.verifyAsync<Record<string, unknown>>(token);
  }

  async verifyRefreshToken(token: string): Promise<unknown> {
    return this.jwtService.verifyAsync<Record<string, unknown>>(token);
  }
}
