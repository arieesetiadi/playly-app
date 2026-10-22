import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(255)),
  password: z.string().min(8).max(72), // bcrypt only uses the first 72 bytes
});

export type RegisterDto = z.infer<typeof registerSchema>;
