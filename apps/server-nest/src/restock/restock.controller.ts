import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import {
  AddRestockProductDto,
  AddRestockRecommendationDto,
  CompleteRestockDto,
  RemoveRestockItemDto,
} from "./restock.dto";
import { RestockService } from "./restock.service";

@Controller("api/restock-plan")
export class RestockController {
  constructor(private readonly restockService: RestockService) {}

  @Get()
  getPlan() {
    return this.restockService.getPlan();
  }

  @Post("complete")
  @HttpCode(200)
  complete(@Body() payload: CompleteRestockDto) {
    return this.restockService.complete(payload.itemIds);
  }

  @Post("remove")
  @HttpCode(200)
  remove(@Body() payload: RemoveRestockItemDto) {
    return this.restockService.remove(payload.itemId);
  }

  @Post("recommendations/add")
  @HttpCode(200)
  addRecommendation(@Body() payload: AddRestockRecommendationDto) {
    return this.restockService.addRecommendation(payload.recommendationId);
  }

  @Post("products/add")
  @HttpCode(200)
  addProduct(@Body() payload: AddRestockProductDto) {
    return this.restockService.addProduct(payload.productId);
  }
}
