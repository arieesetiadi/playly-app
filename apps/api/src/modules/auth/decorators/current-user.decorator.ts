import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser } from "../types/authenticated-user.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest().user as AuthenticatedUser,
);
