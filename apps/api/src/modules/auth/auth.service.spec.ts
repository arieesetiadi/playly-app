import { ConflictException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import { hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "@/modules/prisma/prisma.service.js";
import { AuthService } from "./auth.service.js";

const user = {
  id: "user-1",
  name: "Arie",
  email: "arie@example.com",
  image: null,
  emailVerified: false,
};

function createService() {
  const prisma = {
    user: { findUnique: vi.fn(), create: vi.fn() },
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    account: { findUnique: vi.fn(), create: vi.fn() },
  };
  const jwt = {
    signAsync: vi
      .fn()
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token"),
    verifyAsync: vi.fn(),
    decode: vi
      .fn()
      .mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 }),
  };
  const config = { getOrThrow: vi.fn((key: string) => key) };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
  );

  return { service, prisma, jwt };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a user and issues tokens", async () => {
    const { service, prisma, jwt } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(user);

    const result = await service.register({
      name: "Arie",
      email: "Arie@Example.com",
      password: "password123",
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "arie@example.com",
          passwordHash: expect.any(String),
        }),
      }),
    );
    // jti keeps tokens unique when issued within the same second.
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: "access", jti: expect.any(String) }),
      expect.anything(),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      user,
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("rejects a duplicate email", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      service.register({
        name: "Arie",
        email: "arie@example.com",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects invalid credentials", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      passwordHash: await hash("correct-password", 4),
    });

    await expect(
      service.login({ email: "arie@example.com", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("logs in with valid credentials", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      passwordHash: await hash("correct-password", 4),
    });

    const result = await service.login({
      email: "arie@example.com",
      password: "correct-password",
    });

    expect(result.accessToken).toBe("access-token");
    expect(result.user).toEqual(user);
  });

  it("rotates a valid refresh token", async () => {
    const { service, prisma, jwt } = createService();
    jwt.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      type: "refresh",
    });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: "token-1",
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.refresh("old-refresh-token");

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: "token-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(result.refreshToken).toBe("refresh-token");
  });

  it("rejects an already revoked refresh token", async () => {
    const { service, prisma, jwt } = createService();
    jwt.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      type: "refresh",
    });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: "token-1",
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh("old-refresh-token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects an access token used as a refresh token", async () => {
    const { service, jwt } = createService();
    jwt.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      type: "access",
    });

    await expect(service.refresh("access-token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
