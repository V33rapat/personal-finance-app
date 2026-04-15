// ---------------------------------------------------------------------------
// jwt.service.ts
// JWT token generation and verification
// ---------------------------------------------------------------------------

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface TokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtTokenService {
  constructor(private jwtService: JwtService) {}

  async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { expiresIn: '15m' }
      ),
      this.jwtService.signAsync(
        { sub: userId, email, type: 'refresh' },
        { expiresIn: '7d' }
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync(token);
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync(token);
  }
}