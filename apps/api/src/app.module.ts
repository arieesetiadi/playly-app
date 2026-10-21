import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { validate } from "./configs/env.validation.js";
import { auth } from "./lib/auth.js";
import { AppController } from './app.controller.js';
import { PrismaModule } from "./modules/prisma/prisma.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    AuthModule.forRoot({
      auth,
      isGlobal: true,
      disableTrustedOriginsCors: true,
    }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
