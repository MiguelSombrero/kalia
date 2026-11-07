import type { NotificationDtoReason } from "@kalia/api/generated/models";

// Re-exports of orval-generated types (ADR-0012) under this feature's names.
export type RejectionReason = NotificationDtoReason;
export type { NotificationDto as Notification, NotificationPageDto as NotificationPage } from "@kalia/api/generated/models";

/** `gone` is a notification that was already acknowledged, or never the caller's: the API cannot tell them apart. */
export type AcknowledgeResult = "acknowledged" | "gone";
