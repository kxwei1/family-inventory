import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthUser {
  memberId: string;
  familyId: string;
  role: "admin" | "member" | "guest";
  name: string;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | null => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return request.user ?? null;
  },
);
