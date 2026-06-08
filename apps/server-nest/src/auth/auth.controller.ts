import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  CreateInviteDto,
  LoginDto,
  RedeemInviteDto,
  RegisterDto,
} from "./auth.dto";
import { CurrentUser, AuthUser } from "./current-user.decorator";
import { Public } from "./public.decorator";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  async login(@Body() payload: LoginDto) {
    if (payload.email && payload.password) {
      return this.authService.loginWithPassword(payload.email, payload.password);
    }
    if (payload.memberId) {
      return this.authService.loginAsMember(payload.memberId, payload.familyId);
    }
    throw new BadRequestException("email + password or memberId is required");
  }

  @Public()
  @Post("register")
  @HttpCode(201)
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @Public()
  @Post("invite/redeem")
  @HttpCode(200)
  redeemInvite(@Body() payload: RedeemInviteDto) {
    // Peek-only: validate the invite without consuming it. The client follows
    // up with /register passing the same code to actually join the family.
    return this.authService.peekInvite(payload.code);
  }

  @Post("invite")
  @HttpCode(201)
  createInvite(@CurrentUser() user: AuthUser | null, @Body() payload: CreateInviteDto) {
    if (!user) throw new BadRequestException("Authentication required to create invites");
    return this.authService.createInviteCode(
      user,
      payload.role,
      payload.expiresInHours,
    );
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser | null) {
    return { user };
  }
}
