import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import {
  UpdateNotificationSettingsDto,
  UpdateProfileDto,
} from "./profile.dto";

@Controller("api")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get("profile")
  getProfile() {
    return this.profileService.getProfile();
  }

  @Post("profile/update")
  @HttpCode(200)
  updateProfile(@Body() payload: UpdateProfileDto) {
    return this.profileService.updateProfile(payload);
  }

  @Get("notification-settings")
  getNotificationSettings() {
    return this.profileService.getNotificationSettings();
  }

  @Post("notification-settings")
  @HttpCode(200)
  updateNotificationSettings(@Body() payload: UpdateNotificationSettingsDto) {
    return this.profileService.updateNotificationSettings(payload);
  }
}
