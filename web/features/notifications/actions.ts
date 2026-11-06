"use server";

import { acknowledgeNotification, readNotifications, readUnreadCount } from "./api";
import type { AcknowledgeResult, NotificationPage } from "./types";

// ADR-0040: the client reads through Server Actions, so the token lookup never reaches its bundle.
export const readUnreadCountAction = async (): Promise<number> => readUnreadCount();

export const readNotificationsAction = async (): Promise<NotificationPage> => readNotifications();

export const acknowledgeNotificationAction = async (id: string): Promise<AcknowledgeResult> =>
  acknowledgeNotification(id);
