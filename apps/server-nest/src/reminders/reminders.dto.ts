import { IsString } from "class-validator";

export class DismissReminderDto {
  @IsString() itemId!: string;
}
