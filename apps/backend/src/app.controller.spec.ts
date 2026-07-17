import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the API welcome message', () => {
      expect(appController.getHello()).toBe(
        'Hello World! Is this the backend of the Personal Finance App? Yes, it is! Welcome to the API server. 🚀',
      );
    });
  });
});
