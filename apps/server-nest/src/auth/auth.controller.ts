import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./auth.dto";
import { CurrentUser, AuthUser } from "./current-user.decorator";
import { Public } from "./public.decorator";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload.memberId, payload.familyId);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser | null) {
    return { user };
  }
}
