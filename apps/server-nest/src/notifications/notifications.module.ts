import { Global, Module } from "@nestjs/common";
import { NotificationDispatcher } from "./notification.dispatcher";
import { ReminderWebhookWorker } from "./reminder-webhook.worker";

@Global()
@Module({
  providers: [NotificationDispatcher, ReminderWebhookWorker],
  exports: [NotificationDispatcher],
})
export class NotificationsModule {}
