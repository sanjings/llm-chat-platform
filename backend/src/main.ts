import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const reflector = app.get(Reflector);

  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // 全局接口前缀 /api
  app.setGlobalPrefix('api');

  // 跨域
  app.enableCors();

  // 参数校验
  app.useGlobalPipes(new ValidationPipe());

  // 全局拦截器
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerOptions = new DocumentBuilder()
    .setTitle('API')
    .setDescription('接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
