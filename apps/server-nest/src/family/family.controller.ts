import { Controller, Get } from "@nestjs/common";
import { FamilyService } from "./family.service";

@Controller("api/family")
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get()
  getFamily() {
    return this.familyService.getOverview();
  }
}
