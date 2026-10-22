import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { createHash, randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { Prisma } from "@/generated/prisma/client.js";
import { PrismaService } from "@/modules/prisma/prisma.service.js";
import { USER_SELECT } from "./auth.constants.js";
import type { LoginDto } from "./dto/login.dto.js";
import type { RegisterDto } from "./dto/register.dto.js";
import type {
  AuthenticatedUser,
  GoogleProfileData,
  JwtPayload,
} from "./types/authenticated-user.js";

const BCRYPT_ROUNDS = 12;

export interface AuthResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException("Email is already registered");
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email,
          passwordHash: await hash(dto.password, BCRYPT_ROUNDS),
        },
        select: USER_SELECT,
      });

      return this.issueTokens(user);
    } catch (error) {
      // Handles the race between the check above and the insert.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Email is already registered");
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.issueTokens(this.toAuthenticatedUser(user));
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    await this.verifyRefreshToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
      include: { user: { select: USER_SELECT } },
    });

    if (!stored || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException("Refresh token expired or revoked");
    }

    // Single use: only one concurrent request can rotate this token.
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (revoked.count === 0) {
      throw new UnauthorizedException("Refresh token expired or revoked");
    }

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async validateGoogleUser(
    profile: GoogleProfileData,
  ): Promise<AuthenticatedUser> {
    const provider = "google";
    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerId: { provider, providerId: profile.providerId },
      },
      include: { user: { select: USER_SELECT } },
    });

    if (account) {
      return account.user;
    }

    const email = profile.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: USER_SELECT,
    });

    const user =
      existing ??
      (await this.prisma.user.create({
        data: {
          name: profile.name.trim(),
          email,
          image: profile.image,
          emailVerified: true,
        },
        select: USER_SELECT,
      }));

    await this.prisma.account.create({
      data: { provider, providerId: profile.providerId, userId: user.id },
    });

    return user;
  }

  async issueTokensForUser(user: AuthenticatedUser): Promise<AuthResult> {
    return this.issueTokens(user);
  }

  private async issueTokens(user: AuthenticatedUser): Promise<AuthResult> {
    const payload = { sub: user.id, email: user.email, jti: randomUUID() };

    const accessToken = await this.jwt.signAsync(
      { ...payload, type: "access" },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.accessTtl,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID(), type: "refresh" },
      {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.refreshTtl,
      },
    );

    const { exp } = this.jwt.decode(refreshToken) as { exp: number };
    const refreshTokenExpiresAt = new Date(exp * 1000);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return { user, accessToken, refreshToken, refreshTokenExpiresAt };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return payload;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private toAuthenticatedUser(user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    emailVerified: boolean;
  }): AuthenticatedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
    };
  }

  private get accessTtl(): NonNullable<JwtSignOptions["expiresIn"]> {
    return this.config.getOrThrow<string>(
      "JWT_ACCESS_TTL",
    ) as NonNullable<JwtSignOptions["expiresIn"]>;
  }

  private get refreshTtl(): NonNullable<JwtSignOptions["expiresIn"]> {
    return this.config.getOrThrow<string>(
      "JWT_REFRESH_TTL",
    ) as NonNullable<JwtSignOptions["expiresIn"]>;
  }
}
