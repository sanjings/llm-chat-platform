import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureHttpApp, createHttpApp } from './http-app';

async function bootstrap() {
  const app = await createHttpApp(AppModule);

  configureHttpApp(app);

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
