import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;

  // Dev-only fallback: lets internal tooling and tests sign in by member id
  // when email/password aren't configured. Rejected when AUTH_REQUIRED=true.
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() familyId?: string;
}

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) password!: string;
  @IsString() @MinLength(1) name!: string;

  // Either inviteCode (join an existing family) or familyName (create one).
  @IsOptional() @IsString() inviteCode?: string;
  @IsOptional() @IsString() familyName?: string;
}

export class RedeemInviteDto {
  @IsString() code!: string;
}

export class CreateInviteDto {
  @IsOptional() @IsIn(["admin", "member", "guest"]) role?: "admin" | "member" | "guest";
  @IsOptional() expiresInHours?: number;
}
