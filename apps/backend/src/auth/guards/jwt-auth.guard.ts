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
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenPayload } from '../jwt.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('กรุณาเข้าสู่ระบบ');
    }

    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }

    if (
      payload.type === 'refresh' ||
      typeof payload.sessionVersion !== 'number'
    ) {
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

    request['user'] = payload;

    return true;
  }
}
