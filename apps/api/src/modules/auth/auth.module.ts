import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { GoogleStrategy } from "./strategies/google.strategy.js";
import { JwtStrategy } from "./strategies/jwt.strategy.js";

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
