import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
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
  });

  it("issues a JWT that round-trips through verify()", async () => {
    const { token, user } = await service.loginAsMember("m_admin");

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
    await expect(service.loginAsMember("missing")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects login when the requested family does not match the member", async () => {
    await expect(service.loginAsMember("m_admin", "other_family")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects verify() on a tampered token", async () => {
    const { token } = await service.loginAsMember("m_admin");
    const tampered = `${token.slice(0, -2)}xx`;
    await expect(service.verify(tampered)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects loginAsMember when AUTH_REQUIRED=true", async () => {
    const enforced = new AuthService(
      prisma as unknown as ConstructorParameters<typeof AuthService>[0],
      jwt,
      buildConfig({ AUTH_REQUIRED: "true" }),
    );
    await expect(enforced.loginAsMember("m_admin")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
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

  it("registers a new family + admin owner with hashed password", async () => {
    const result = await service.register({
      email: "alice@example.com",
      password: "secret123",
      name: "Alice",
      familyName: "Alice's Pets",
    });

    expect(result.user).toMatchObject({
      role: "admin",
      name: "Alice",
    });
    const credential = prisma.credential.rows[0];
    expect(credential.email).toBe("alice@example.com");
    expect(credential.passwordHash).not.toBe("secret123");

    // password-based login round-trips
    const login = await service.loginWithPassword("alice@example.com", "secret123");
    expect(login.user.memberId).toBe(result.user.memberId);
  });

  it("rejects registration when email is already taken", async () => {
    await service.register({
      email: "alice@example.com",
      password: "secret123",
      name: "Alice",
    });

    await expect(
      service.register({
        email: "alice@example.com",
        password: "different",
        name: "Alice2",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects loginWithPassword on a wrong password", async () => {
    await service.register({
      email: "alice@example.com",
      password: "secret123",
      name: "Alice",
    });

    await expect(
      service.loginWithPassword("alice@example.com", "wrong"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("redeems an invite code into the inviting family with the requested role", async () => {
    const owner = await service.register({
      email: "owner@example.com",
      password: "secret123",
      name: "Owner",
    });

    const invite = await service.createInviteCode(owner.user, "member", 24);

    const joined = await service.register({
      email: "member@example.com",
      password: "secret123",
      name: "Member",
      inviteCode: invite.code,
    });

    expect(joined.user.familyId).toBe(owner.user.familyId);
    expect(joined.user.role).toBe("member");

    const code = prisma.inviteCode.rows.find((row) => row.code === invite.code);
    expect(code?.redeemedAt).toBeInstanceOf(Date);
  });

  it("refuses to redeem an already-used invite code", async () => {
    const owner = await service.register({
      email: "owner@example.com",
      password: "secret123",
      name: "Owner",
    });
    const invite = await service.createInviteCode(owner.user, "member");

    await service.register({
      email: "first@example.com",
      password: "secret123",
      name: "First",
      inviteCode: invite.code,
    });

    await expect(
      service.register({
        email: "second@example.com",
        password: "secret123",
        name: "Second",
        inviteCode: invite.code,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("only admins can mint invite codes", async () => {
    const owner = await service.register({
      email: "owner@example.com",
      password: "secret123",
      name: "Owner",
    });
    const invite = await service.createInviteCode(owner.user, "member");

    const member = await service.register({
      email: "member@example.com",
      password: "secret123",
      name: "Member",
      inviteCode: invite.code,
    });

    await expect(
      service.createInviteCode(member.user, "member"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
