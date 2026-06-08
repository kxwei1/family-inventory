import { Module } from "@nestjs/common";
import { RemindersController } from "./reminders.controller";
import { RemindersService } from "./reminders.service";
import { ReminderScheduler } from "./reminder.scheduler";

@Module({
  controllers: [RemindersController],
  providers: [RemindersService, ReminderScheduler],
  exports: [RemindersService, ReminderScheduler],
})
export class RemindersModule {}
