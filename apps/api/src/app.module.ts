import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { envSchema } from "./configs/env.validation.js";
import { AppController } from "./app.controller.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { PrismaModule } from "./modules/prisma/prisma.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
