import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

describe('AppModule bootstrap', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('initializes controllers and guards without a database connection', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    expect(app.getHttpServer()).toBeDefined();
  });
});
