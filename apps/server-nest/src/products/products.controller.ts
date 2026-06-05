import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ConsumeProductDto,
  CreateProductDto,
  ProductListQueryDto,
  UpdateProductDto,
} from "./products.dto";
import { ProductsService } from "./products.service";

@Controller("api/products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@Query() query: ProductListQueryDto) {
    return this.productsService.list(query);
  }

  @Post()
  @HttpCode(201)
  create(@Body() payload: CreateProductDto) {
    return this.productsService.create(payload);
  }

  @Post("stock-in")
  @HttpCode(200)
  stockIn(@Body() payload: CreateProductDto) {
    return this.productsService.stockIn(payload);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.productsService.detail(id);
  }

  @Post(":id/update")
  @HttpCode(200)
  update(@Param("id") id: string, @Body() payload: UpdateProductDto) {
    return this.productsService.update(id, payload);
  }

  @Post(":id/consume")
  @HttpCode(200)
  consume(@Param("id") id: string, @Body() payload: ConsumeProductDto) {
    return this.productsService.consume(id, payload);
  }

  @Post(":id/archive")
  @HttpCode(200)
  archive(@Param("id") id: string) {
    return this.productsService.archive(id);
  }
}
