import { z } from "zod";

/** Response body produced by the API's TransformInterceptor. */
export interface ApiSuccess<T> {
  statusCode: number;
  data: T;
}

/** Response body produced by the API's AllExceptionsFilter. */
export const apiError = z.object({
  statusCode: z.number(),
  error: z
    .object({
      message: z.union([z.string(), z.array(z.string())]),
      error: z.string(),
      statusCode: z.number(),
    })
    .nullable(),
});

export type ApiError = z.infer<typeof apiError>;
