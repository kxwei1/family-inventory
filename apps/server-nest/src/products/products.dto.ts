import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateProductDto {
  @IsString() name!: string;
  @IsString() category!: string;
  @IsString() unit!: string;
  @IsNumber() @Min(0) quantity!: number;

  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() spec?: string;
  @IsOptional() @IsNumber() @Min(0) purchasePrice?: number;
  @IsOptional() @IsString() purchaseChannel?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsBoolean() isOpened?: boolean;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsString() stockInDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() spec?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() purchasePrice?: number | null;
  @IsOptional() @IsString() purchaseChannel?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsBoolean() isOpened?: boolean;
  @IsOptional() @IsString() stockInDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ConsumeProductDto {
  @IsNumber() @Min(0.001) quantity!: number;
  @IsString() actionType!: "daily" | "adjust" | "expired" | "gift";
  @IsOptional() @IsString() notes?: string;
}

export class ProductListQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() status?: "all" | "enough" | "low" | "empty";
  @IsOptional() @IsInt() @Min(1) page?: number;
}
