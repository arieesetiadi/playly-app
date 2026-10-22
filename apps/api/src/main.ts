import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { StandardSchemaValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor.js";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_BASE_URL!,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Custom-Header",
      "Upgrade-Insecure-Requests",
      "Access-Control-Allow-Origin",
    ],
    methods: ["POST", "GET", "OPTIONS", "PUT", "PATCH", "DELETE"],
    exposedHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
