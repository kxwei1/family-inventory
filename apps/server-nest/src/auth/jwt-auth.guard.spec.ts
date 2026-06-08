import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthService } from "./auth.service";
import { IS_PUBLIC_KEY } from "./public.decorator";

function buildContext(headers: Record<string, string> = {}): {
  ctx: ExecutionContext;
  request: { headers: Record<string, string>; user?: unknown };
} {
  const request: { headers: Record<string, string>; user?: unknown } = { headers };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
    getClass: () => class Dummy {},
  } as unknown as ExecutionContext;
  return { ctx, request };
}

describe("JwtAuthGuard", () => {
  let reflector: Reflector;
  let authService: AuthService;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = new Reflector();
    authService = {
      verify: jest.fn(),
      isAuthRequired: jest.fn().mockReturnValue(false),
    } as unknown as AuthService;
    guard = new JwtAuthGuard(reflector, authService);
  });

  it("lets @Public() routes through without checking the header", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);

    const { ctx } = buildContext();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(authService.verify).not.toHaveBeenCalled();
  });

  it("falls back to anonymous when AUTH_REQUIRED=false and no header is set", async () => {
    const { ctx, request } = buildContext();
    const ok = await guard.canActivate(ctx);
    expect(ok).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it("throws 401 when AUTH_REQUIRED=true and no header is set", async () => {
    (authService.isAuthRequired as jest.Mock).mockReturnValue(true);
    const { ctx } = buildContext();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches the verified user to the request on success", async () => {
    const user = {
      memberId: "m_admin",
      familyId: "fam_demo",
      role: "admin" as const,
      name: "张三",
    };
    (authService.verify as jest.Mock).mockResolvedValue(user);

    const { ctx, request } = buildContext({ authorization: "Bearer abc.def.ghi" });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(authService.verify).toHaveBeenCalledWith("abc.def.ghi");
    expect(request.user).toEqual(user);
  });

  it("ignores malformed Authorization headers in dev mode", async () => {
    const { ctx, request } = buildContext({ authorization: "Basic something" });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(authService.verify).not.toHaveBeenCalled();
  });

  it("propagates Unauthorized when verify() rejects", async () => {
    (authService.verify as jest.Mock).mockRejectedValue(new UnauthorizedException("bad"));
    const { ctx } = buildContext({ authorization: "Bearer bad" });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

// Reflector key isn't asserted directly above; keep this so a refactor of the
// key string forces an update in both files.
test("public key constant", () => {
  expect(IS_PUBLIC_KEY).toBe("auth:isPublic");
});
