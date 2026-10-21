import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

const isProd = process.env.NODE_ENV == "production";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  user: {
    additionalFields: {
      instagramUsername: {
        type: "string",
        required: false,
      },
      dateOfBirth: {
        type: "string",
        required: false,
      },
      gender: {
        type: "string",
        required: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  advanced: {
    disableOriginCheck: !isProd, // Disable in development
    disableCSRFCheck: !isProd, // Disable in development
    defaultCookieAttributes: {
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      partitioned: isProd,
    },
  },

  trustedOrigins: [process.env.FRONTEND_BASE_URL!],
});
