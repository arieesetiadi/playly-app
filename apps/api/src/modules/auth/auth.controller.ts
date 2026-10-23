import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import {
  loginInput,
  registerInput,
  type AuthenticatedUser,
  type LoginInput,
  type RegisterInput,
} from "@repo/contracts";
import { AuthService, type AuthResult } from "./auth.service.js";
import {
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_PATH,
} from "./auth.constants.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import { Public } from "./decorators/public.decorator.js";
import { GoogleAuthGuard } from "./guards/google-auth.guard.js";
import type { RequestWithCookies } from "./types/authenticated-user.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("register")
  async register(
    @Body({ schema: registerInput }) dto: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.completeAuth(await this.authService.register(dto), res);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body({ schema: loginInput }) dto: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.completeAuth(await this.authService.login(dto), res);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.refresh(
        req.cookies?.[REFRESH_TOKEN_COOKIE],
      );
      return this.completeAuth(result, res);
    } catch (error) {
      this.clearRefreshCookie(res);
      throw error;
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(req.cookies?.[REFRESH_TOKEN_COOKIE]);
    this.clearRefreshCookie(res);
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Public()
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {
    // Passport redirects to Google.
  }

  @Public()
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: RequestWithCookies,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.authService.issueTokensForUser(
      req.user as AuthenticatedUser,
    );

    this.setRefreshCookie(res, result);
    const frontendUrl = this.config
      .getOrThrow<string>("FRONTEND_BASE_URL")
      .replace(/\/$/, "");

    res.redirect(`${frontendUrl}/auth/callback`);
  }

  private completeAuth(result: AuthResult, res: Response) {
    this.setRefreshCookie(res, result);

    return { user: result.user, accessToken: result.accessToken };
  }

  private setRefreshCookie(res: Response, result: AuthResult): void {
    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      path: REFRESH_TOKEN_COOKIE_PATH,
      expires: result.refreshTokenExpiresAt,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  }
}
