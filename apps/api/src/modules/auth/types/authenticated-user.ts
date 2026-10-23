import type { Request } from "express";

export interface JwtPayload {
  sub: string;
  email: string;
  type: "access" | "refresh";
  jti?: string;
  exp?: number;
}

export interface RequestWithCookies extends Request {
  cookies: Record<string, string | undefined>;
}

export interface GoogleProfileData {
  providerId: string;
  email: string;
  name: string;
  image?: string;
}
