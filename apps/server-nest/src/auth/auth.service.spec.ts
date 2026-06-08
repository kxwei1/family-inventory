import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { createPrismaMock, PrismaMock } from "../../test/prisma.mock";

const FAMILY_ID = "fam_demo";

function buildJwt(): JwtService {
  return new JwtService({ secret: "test-secret" });
}

function buildConfig(values: Record<string, string> = {}): ConfigService {
  const defaults: Record<string, string> = {
    JWT_SECRET: "test-secret",
    JWT_EXPIRES_IN: "1h",
    AUTH_REQUIRED: "false",
    ...values,
  };
  return {
    get: jest.fn((key: string) => defaults[key]),
  } as unknown as ConfigService;
}

function seedMember(prisma: PrismaMock, overrides: Record<string, unknown> = {}) {
  prisma.family.rows.push({
    id: FAMILY_ID,
    name: "幸福的小窝",
    archived: false,
  });
  prisma.familyMember.rows.push({
    id: "m_admin",
    familyId: FAMILY_ID,
    name: "张三",
    role: "ADMIN",
    ...overrides,
  });
}

describe("AuthService", () => {
  let prisma: PrismaMock;
  let service: AuthService;
  let jwt: JwtService;
  let config: ConfigService;

  beforeEach(() => {
    prisma = createPrismaMock();
    seedMember(prisma);
    jwt = buildJwt();
    config = buildConfig();
    service = new AuthService(
      prisma as unknown as ConstructorParameters<typeof AuthService>[0],
      jwt,
      config,
    );

    // The PrismaMock.findUnique doesn't honor `include` for familyMember,
    // so add a focused override that includes the family for this test.
    (prisma.familyMember.findUnique as jest.Mock).mockImplementation(
      async (args: unknown) => {
        const typed = args as { where: { id: string }; include?: { family?: unknown } };
        const member = prisma.familyMember.rows.find((row) => row.id === typed.where.id);
        if (!member) return null;
        if (!typed.include?.family) return member;
        const family = prisma.family.rows.find(
          (row) => row.id === (member.familyId as string),
        );
        return { ...member, family };
      },
    );
  });

  it("issues a JWT that round-trips through verify()", async () => {
    const { token, user } = await service.login("m_admin");

    expect(user).toMatchObject({
      memberId: "m_admin",
      familyId: FAMILY_ID,
      role: "admin",
      name: "张三",
    });

    const verified = await service.verify(token);
    expect(verified).toEqual(user);
  });

  it("rejects login for unknown members", async () => {
    await expect(service.login("missing")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects login when the requested family does not match the member", async () => {
    await expect(service.login("m_admin", "other_family")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects verify() on a tampered token", async () => {
    const { token } = await service.login("m_admin");
    const tampered = `${token.slice(0, -2)}xx`;
    await expect(service.verify(tampered)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("reports auth-required toggle from config", () => {
    expect(service.isAuthRequired()).toBe(false);
    const enforced = new AuthService(
      prisma as unknown as ConstructorParameters<typeof AuthService>[0],
      jwt,
      buildConfig({ AUTH_REQUIRED: "true" }),
    );
    expect(enforced.isAuthRequired()).toBe(true);
  });
});
