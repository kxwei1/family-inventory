import { IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  // The current scaffold doesn't store credentials, so the login step looks
  // members up by their memberId. Once a credential store lands, this can
  // become email + password (or a one-time invite code).
  @IsString() @MinLength(1) memberId!: string;

  // Optional convenience: if provided, the server cross-checks that the
  // member belongs to the named family. Useful for invite-code flows.
  @IsOptional() @IsString() familyId?: string;
}
