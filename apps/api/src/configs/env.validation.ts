import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["local", "development", "test", "production"]),
  PORT: z.preprocess(
    // Env values are strings; an empty value means "unset", not 0.
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().positive().default(4000),
  ),
  TIMEZONE: z.string().default("Asia/Jakarta"),

  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.url({ protocol: /^https?$/ }),

  FRONTEND_BASE_URL: z.url({ protocol: /^https?$/ }),
  API_BASE_URL: z.url({ protocol: /^https?$/ }).default("http://localhost:4000"),
});

export type Env = z.infer<typeof envSchema>;
