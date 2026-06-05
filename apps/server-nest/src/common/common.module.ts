import { Global, Module } from "@nestjs/common";
import { FamilyContextService } from "./family-context.service";

@Global()
@Module({
  providers: [FamilyContextService],
  exports: [FamilyContextService],
})
export class CommonModule {}
