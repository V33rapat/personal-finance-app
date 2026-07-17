import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtTokenService } from './jwt.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { fromBuffer } from 'file-type';
import { randomUUID } from 'node:crypto';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PASSWORD_CHANGE_ATTEMPTS = 5;
const PASSWORD_CHANGE_LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
  private failedPasswordChangeAttempts = new Map<string, { count: number; lockedUntil: number }>();

  constructor(
    private prisma: PrismaService,
    private jwtTokenService: JwtTokenService,
    private storage: SupabaseStorageService,
  ) {}

  private checkRateLimit(email: string): boolean {
    const attempt = this.failedAttempts.get(email);
    if (!attempt) return true;

    if (attempt.lockedUntil > Date.now()) {
      return false;
    }

    if (attempt.lockedUntil > 0) {
      this.failedAttempts.delete(email);
    }

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

  private checkPasswordChangeRateLimit(userId: string): boolean {
    const attempt = this.failedPasswordChangeAttempts.get(userId);
    if (!attempt) return true;

    if (attempt.lockedUntil > Date.now()) {
      return false;
    }

    if (attempt.lockedUntil > 0) {
      this.failedPasswordChangeAttempts.delete(userId);
    }

    return true;
  }

  private recordFailedPasswordChangeAttempt(userId: string): void {
    const attempt = this.failedPasswordChangeAttempts.get(userId) || { count: 0, lockedUntil: 0 };
    attempt.count++;

    if (attempt.count >= MAX_PASSWORD_CHANGE_ATTEMPTS) {
      attempt.lockedUntil = Date.now() + PASSWORD_CHANGE_LOCK_DURATION_MS;
    }

    this.failedPasswordChangeAttempts.set(userId, attempt);
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

    const tokens = await this.jwtTokenService.generateTokens(
      user.id,
      user.email,
      user.session_version,
    );

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

    if (payload.type !== 'refresh' || typeof payload.sessionVersion !== 'number') {
      throw new UnauthorizedException('Refresh token is incorrect');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
      select: { session_version: true },
    });

    if (!user || user.session_version !== payload.sessionVersion) {
      throw new UnauthorizedException('Refresh token is incorrect or expired');
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

    const tokens = await this.jwtTokenService.generateTokens(
      payload.sub,
      payload.email,
      user.session_version,
    );

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

    const avatarUrl = user.avatar_path
      ? await this.storage.createSignedUrl(user.avatar_path)
      : null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl,
      createdAt: user.created_at,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Please login again.');
    }

    await this.prisma.users.update({
      where: { id: userId },
      data: {
        full_name: dto.full_name.trim(),
        updated_at: new Date(),
      },
    });

    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (!this.checkPasswordChangeRateLimit(userId)) {
      throw new HttpException(
        'Too many attempts. Please try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, password_hash: true, session_version: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Please login again.');
    }

    const isCurrentPasswordCorrect = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!isCurrentPasswordCorrect) {
      this.recordFailedPasswordChangeAttempt(userId);
      throw new BadRequestException('Current password is incorrect.');
    }

    const isSamePassword = await bcrypt.compare(dto.new_password, user.password_hash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from the current password.');
    }

    const passwordHash = await bcrypt.hash(dto.new_password, 10);

    await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.users.updateMany({
        where: { id: user.id, session_version: user.session_version },
        data: {
          password_hash: passwordHash,
          session_version: { increment: 1 },
          updated_at: new Date(),
        },
      });

      if (updateResult.count !== 1) {
        throw new UnauthorizedException('Your session has expired. Please login again.');
      }

      await tx.refresh_tokens.updateMany({
        where: { user_id: user.id, is_revoked: false },
        data: { is_revoked: true },
      });
    });

    this.failedPasswordChangeAttempts.delete(userId);
    return { message: 'Password changed successfully.' };
  }

  async uploadAvatar(userId: string, file?: Express.Multer.File) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, avatar_path: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Please login again.');
    }

    if (!file?.buffer || file.size > MAX_AVATAR_SIZE) {
      throw new BadRequestException('Avatar must be an image up to 5 MB.');
    }

    const detected = await fromBuffer(file.buffer);

    if (!detected || !ALLOWED_AVATAR_MIMES.has(detected.mime) || file.mimetype !== detected.mime) {
      throw new BadRequestException('Avatar must be a valid JPG, PNG, or WebP image.');
    }

    const newPath = `users/${userId}/${randomUUID()}.${detected.ext}`;

    try {
      await this.storage.upload(newPath, file.buffer, detected.mime);
    } catch {
      throw new InternalServerErrorException('Could not upload avatar.');
    }

    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { avatar_path: newPath, updated_at: new Date() },
      });
    } catch {
      await this.storage.remove(newPath);
      throw new InternalServerErrorException('Could not save avatar.');
    }

    await this.storage.remove(user.avatar_path);
    return this.getProfile(userId);
  }

  async deleteAvatar(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, avatar_path: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Please login again.');
    }

    await this.prisma.users.update({
      where: { id: userId },
      data: { avatar_path: null, updated_at: new Date() },
    });

    await this.storage.remove(user.avatar_path);
    return this.getProfile(userId);
  }
}
