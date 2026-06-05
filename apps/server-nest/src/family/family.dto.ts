import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class RenameFamilyDto {
  @IsString() @MinLength(1) name!: string;
}

export class UpdateFamilyAddressDto {
  @IsString() contactName!: string;
  @IsString() phone!: string;
  @IsString() region!: string;
  @IsString() detail!: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateFamilyMemberRoleDto {
  @IsString() memberId!: string;
  @IsIn(["admin", "member", "guest"]) role!: "admin" | "member" | "guest";
}

export class RemoveFamilyMemberDto {
  @IsString() memberId!: string;
}
