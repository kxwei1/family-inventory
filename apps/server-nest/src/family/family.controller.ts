import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import {
  RemoveFamilyMemberDto,
  RenameFamilyDto,
  UpdateFamilyAddressDto,
  UpdateFamilyMemberRoleDto,
} from "./family.dto";
import { FamilyService } from "./family.service";

@Controller("api/family")
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get()
  getFamily() {
    return this.familyService.getOverview();
  }

  @Post("rename")
  @HttpCode(200)
  rename(@Body() payload: RenameFamilyDto) {
    return this.familyService.rename(payload);
  }

  @Post("address")
  @HttpCode(200)
  updateAddress(@Body() payload: UpdateFamilyAddressDto) {
    return this.familyService.updateAddress(payload);
  }

  @Post("members/role")
  @HttpCode(200)
  updateMemberRole(@Body() payload: UpdateFamilyMemberRoleDto) {
    return this.familyService.updateMemberRole(payload);
  }

  @Post("members/remove")
  @HttpCode(200)
  removeMember(@Body() payload: RemoveFamilyMemberDto) {
    return this.familyService.removeMember(payload);
  }

  @Post("dissolve")
  @HttpCode(200)
  dissolve() {
    return this.familyService.dissolve();
  }
}
