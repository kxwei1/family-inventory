import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class PetDietDto {
  @IsOptional() @IsString() staple?: string;
  @IsOptional() @IsString() snack?: string;
}

export class CreatePetDto {
  @IsString() name!: string;
  @IsOptional() @IsString() species?: string;
  @IsOptional() @IsString() breed?: string;
  @IsOptional() @IsString() ageText?: string;
  @IsOptional() @IsNumber() @Min(0) weightKg?: number;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @ValidateNested() @Type(() => PetDietDto) diet?: PetDietDto;
}

export class UpdatePetDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() species?: string;
  @IsOptional() @IsString() breed?: string;
  @IsOptional() @IsString() ageText?: string;
  @IsOptional() @IsNumber() @Min(0) weightKg?: number;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @ValidateNested() @Type(() => PetDietDto) diet?: PetDietDto;
}

export class AddPetAlbumPhotoDto {
  @IsString() image!: string;
}

export class AddPetAlbumPhotosDto {
  @IsArray() images!: string[];
}
