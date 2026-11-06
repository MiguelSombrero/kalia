import { apiError } from "@kalia/api";
import {
  acknowledge as generatedAcknowledge,
  listNotifications as generatedListNotifications,
  unreadCount as generatedUnreadCount,
} from "@kalia/api/generated/notifications/notifications";
import type { AcknowledgeResult, NotificationPage } from "./types";

export const NOTIFICATION_PAGE_SIZE = 20;

const failure = (what: string, status: number) => apiError("http", `${what} failed with status ${status}`, { status });

export const readUnreadCount = async (): Promise<number> => {
  const response = await generatedUnreadCount();
  if (response.status !== 200) throw failure("Reading the unread notification count", response.status);
  return response.data.count;
};

export const readNotifications = async (): Promise<NotificationPage> => {
  const response = await generatedListNotifications({ page: 0, size: NOTIFICATION_PAGE_SIZE });
  if (response.status !== 200) throw failure("Listing notifications", response.status);
  return response.data;
};

export const acknowledgeNotification = async (id: string): Promise<AcknowledgeResult> => {
  const response = await generatedAcknowledge(id);
  switch (response.status) {
    case 204:
      return "acknowledged";
    case 404:
      return "gone";
    default:
      throw failure("Acknowledging a notification", response.status);
  }
};
