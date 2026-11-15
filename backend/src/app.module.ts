import { Controller, Get, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Controller('api')
class AppController {
  @Get('hello')
  getHello() {
    return { success: true, data: { message: 'Hello World!' } };
  }
}

@Module({
  controllers: [AppController, AuthController],
  providers: [AuthService],
})
export class AppModule {}
