import { z } from "zod";

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(72),
});

export const registerInput = z.object({
  name: z.string().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(255)),
  password: z.string().min(8).max(72), // bcrypt only uses the first 72 bytes
});

export const authenticatedUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
  emailVerified: z.boolean(),
});

/** Wire shape of login/register/refresh: the refresh token stays in the httpOnly cookie. */
export const authSession = z.object({
  user: authenticatedUser,
  accessToken: z.string(),
});

export type LoginInput = z.infer<typeof loginInput>;
export type RegisterInput = z.infer<typeof registerInput>;
export type AuthenticatedUser = z.infer<typeof authenticatedUser>;
export type AuthSession = z.infer<typeof authSession>;
