import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acknowledgeNotificationAction, readNotificationsAction, readUnreadCountAction } from "../actions";
import type { NotificationPage } from "../types";

const unreadKey = ["notifications", "unread"] as const;
const listKey = ["notifications", "list"] as const;

export const useUnreadCount = (initial: number) =>
  useQuery({
    queryKey: unreadKey,
    queryFn: readUnreadCountAction,
    initialData: initial,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useNotificationList = (enabled: boolean) =>
  useQuery({
    queryKey: listKey,
    queryFn: readNotificationsAction,
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

export const useAcknowledgeNotification = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (variables: { id: string }) => acknowledgeNotificationAction(variables.id),
    onSuccess: (result, { id }) => {
      const before = client.getQueryData<NotificationPage>(listKey);
      if (before) {
        const content = before.content.filter((notification) => notification.id !== id);
        const totalElements = Math.max(0, before.totalElements - (before.content.length - content.length));
        client.setQueryData<NotificationPage>(listKey, { ...before, content, totalElements });
        client.setQueryData(unreadKey, totalElements);
      } else {
        client.setQueryData<number>(unreadKey, (count = 0) => Math.max(0, count - 1));
      }
      const hasMoreBehind = before !== undefined && before.totalElements > before.content.length;
      if (result === "gone" || hasMoreBehind) void client.invalidateQueries({ queryKey: listKey });
    },
  });
};
