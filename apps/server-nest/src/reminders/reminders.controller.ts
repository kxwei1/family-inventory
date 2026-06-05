import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { DismissReminderDto } from "./reminders.dto";
import { RemindersService } from "./reminders.service";

@Controller("api/reminders")
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  list() {
    return this.remindersService.list();
  }

  @Post("dismiss")
  @HttpCode(200)
  dismiss(@Body() payload: DismissReminderDto) {
    return this.remindersService.dismiss(payload.itemId);
  }

  @Post("read-all")
  @HttpCode(200)
  readAll() {
    return this.remindersService.readAll();
  }
}
