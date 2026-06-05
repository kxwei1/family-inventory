import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class CompleteRestockDto {
  @IsArray() @ArrayMinSize(1) itemIds!: string[];
}

export class RemoveRestockItemDto {
  @IsString() itemId!: string;
}

export class AddRestockRecommendationDto {
  @IsString() recommendationId!: string;
}

export class AddRestockProductDto {
  @IsString() productId!: string;
}
