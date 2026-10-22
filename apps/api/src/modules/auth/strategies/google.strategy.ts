import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import {
  Profile,
  Strategy,
  VerifyCallback,
} from "passport-google-oauth20";
import { AuthService } from "../auth.service.js";
import type { AuthenticatedUser } from "../types/authenticated-user.js";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>("GOOGLE_CLIENT_ID"),
      clientSecret: configService.getOrThrow<string>("GOOGLE_CLIENT_SECRET"),
      callbackURL: configService.getOrThrow<string>("GOOGLE_CALLBACK_URL"),
      scope: ["email", "profile"],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    _done: VerifyCallback,
  ): Promise<AuthenticatedUser> {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException("Google account has no email address");
    }

    return this.authService.validateGoogleUser({
      providerId: profile.id,
      email,
      name: profile.displayName || email.split("@")[0] || email,
      image: profile.photos?.[0]?.value,
    });
  }
}
