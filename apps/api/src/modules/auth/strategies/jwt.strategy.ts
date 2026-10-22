import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "@/modules/prisma/prisma.service.js";
import { USER_SELECT } from "../auth.constants.js";
import type { JwtPayload } from "../types/authenticated-user.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid access token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: USER_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException("User no longer exists");
    }

    return user;
  }
}
