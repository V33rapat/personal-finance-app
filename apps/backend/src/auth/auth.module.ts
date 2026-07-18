import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    StorageModule,
    JwtModule.register({
      global: true,
      secret:
        process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtTokenService, PrismaService, JwtAuthGuard],
  exports: [AuthService, JwtTokenService, JwtAuthGuard],
})
export class AuthModule {}
