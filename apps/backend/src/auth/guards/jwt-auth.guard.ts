// ---------------------------------------------------------------------------
// guards/jwt-auth.guard.ts
// JWT authentication guard
// ---------------------------------------------------------------------------

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isAccessTokenPayload, JwtTokenService } from '../jwt.service';
import type { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('กรุณาเข้าสู่ระบบ');
    }

    let payload: unknown;
    try {
      payload = await this.jwtTokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }

    if (!isAccessTokenPayload(payload)) {
      throw new UnauthorizedException('Please login again.');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
      select: { session_version: true },
    });

    if (!user || user.session_version !== payload.sessionVersion) {
      throw new UnauthorizedException(
        'Your session has expired. Please login again.',
      );
    }

    request.user = payload;

    return true;
  }
}
