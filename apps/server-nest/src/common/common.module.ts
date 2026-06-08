import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache.service";
import { FamilyContextService } from "./family-context.service";

@Global()
@Module({
  providers: [FamilyContextService, CacheService],
  exports: [FamilyContextService, CacheService],
})
export class CommonModule {}
