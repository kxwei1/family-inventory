import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from "@nestjs/common";
import {
  AddPetAlbumPhotoDto,
  AddPetAlbumPhotosDto,
  CreatePetDto,
  UpdatePetDto,
} from "./pets.dto";
import { PetsService } from "./pets.service";

@Controller("api/pets")
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  list() {
    return this.petsService.list();
  }

  @Post()
  @HttpCode(201)
  create(@Body() payload: CreatePetDto) {
    return this.petsService.create(payload);
  }

  @Post(":id/update")
  @HttpCode(200)
  update(@Param("id") id: string, @Body() payload: UpdatePetDto) {
    return this.petsService.update(id, payload);
  }

  @Post(":id/album")
  @HttpCode(200)
  addAlbum(@Param("id") id: string, @Body() payload: AddPetAlbumPhotoDto) {
    return this.petsService.addAlbumPhoto(id, payload);
  }

  @Post(":id/album/batch")
  @HttpCode(200)
  addAlbumBatch(@Param("id") id: string, @Body() payload: AddPetAlbumPhotosDto) {
    return this.petsService.addAlbumPhotos(id, payload);
  }

  @Post(":id/album/remove")
  @HttpCode(200)
  removeAlbum(@Param("id") id: string, @Body() payload: AddPetAlbumPhotoDto) {
    return this.petsService.removeAlbumPhoto(id, payload.image);
  }
}
