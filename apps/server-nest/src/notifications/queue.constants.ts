export const REMINDER_QUEUE_NAME = "family-inventory:reminders";

export interface ReminderWebhookJobPayload {
  familyId: string;
  /**
   * The reminder identifiers refreshed in this scan run. Workers fetch the
   * full reminder rows from the DB at delivery time so the payload stays small
   * and the webhook always sees the latest content.
   */
  reminderIds: string[];
}
