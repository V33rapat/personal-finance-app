import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World! Is this the backend of the Personal Finance App? Yes, it is! Welcome to the API server. 🚀';
  }
}
