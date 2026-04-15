import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtTokenService } from './jwt.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

  constructor(
    private prisma: PrismaService,
    private jwtTokenService: JwtTokenService,
  ) {}

  private checkRateLimit(email: string): boolean {
    const attempt = this.failedAttempts.get(email);
    if (!attempt) return true;

    if (attempt.lockedUntil > Date.now()) {
      return false;
    }

    this.failedAttempts.delete(email);
    return true;
  }

  private recordFailedAttempt(email: string): void {
    const attempt = this.failedAttempts.get(email) || { count: 0, lockedUntil: 0 };
    attempt.count++;

    if (attempt.count >= 5) {
      attempt.lockedUntil = Date.now() + 15 * 60 * 1000;
    }

    this.failedAttempts.set(email, attempt);
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Email this is in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.users.create({
      data: {
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: dto.username,
      },
    });

    return { message: 'Register successful', userId: user.id };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    if (!this.checkRateLimit(normalizedEmail)) {
      throw new UnauthorizedException('Login temporarily locked. Please try again in 15 minutes.');
    }

    const user = await this.prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    const isMatch = user && await bcrypt.compare(dto.password, user.password_hash);
    if (!user || !isMatch) {
      this.recordFailedAttempt(normalizedEmail);
      throw new UnauthorizedException('Email or password is incorrect');
    }

    this.failedAttempts.delete(normalizedEmail);

    const tokens = await this.jwtTokenService.generateTokens(user.id, user.email);

    const tokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refresh_tokens.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip_address: null,
        user_agent: null,
      },
    });

    return {
      message: 'Login successful',
      ...tokens,
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    };
  }

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = await this.jwtTokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token is incorrect');
    }

    const storedTokens = await this.prisma.refresh_tokens.findMany({
      where: {
        user_id: payload.sub,
        is_revoked: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    let validToken = false;
    for (const stored of storedTokens) {
      if (await bcrypt.compare(refreshToken, stored.token_hash)) {
        validToken = true;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Refresh token is incorrect or expired');
    }

    await this.prisma.refresh_tokens.updateMany({
      where: { user_id: payload.sub, is_revoked: false },
      data: { is_revoked: true },
    });

    const tokens = await this.jwtTokenService.generateTokens(payload.sub, payload.email);

    const tokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refresh_tokens.create({
      data: {
        user_id: payload.sub,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    return { message: 'Token refreshed successfully', ...tokens };
  }

  async logout(userId: string) {
    await this.prisma.refresh_tokens.updateMany({
      where: { user_id: userId, is_revoked: false },
      data: { is_revoked: true },
    });

    return { message: 'Logout successful' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Please login again.');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
    };
  }
}