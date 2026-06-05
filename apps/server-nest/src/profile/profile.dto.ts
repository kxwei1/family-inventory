import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() avatar?: string;
}

export class UpdateNotificationSettingsDto {
  @IsOptional() @IsBoolean() stockWarningEnabled?: boolean;
  @IsOptional() @IsBoolean() expiryReminderEnabled?: boolean;
}
