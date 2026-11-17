import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { acknowledgeNotificationAction, readNotificationsAction, readUnreadCountAction } from "../actions";

export const unreadCountQuery = () =>
  queryOptions({
    queryKey: ["notifications", "unread"],
    queryFn: readUnreadCountAction,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const notificationListQuery = () =>
  queryOptions({
    queryKey: ["notifications", "list"],
    queryFn: readNotificationsAction,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

export const useUnreadCount = (initial: number) => useQuery({ ...unreadCountQuery(), initialData: initial });

export const useNotificationList = (enabled: boolean) => useQuery({ ...notificationListQuery(), enabled });

export const useAcknowledgeNotification = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (variables: { id: string }) => acknowledgeNotificationAction(variables.id),
    onSuccess: (result, { id }) => {
      const listKey = notificationListQuery().queryKey;
      const unreadKey = unreadCountQuery().queryKey;
      const before = client.getQueryData(listKey);
      if (before) {
        const content = before.content.filter((notification) => notification.id !== id);
        const totalElements = Math.max(0, before.totalElements - (before.content.length - content.length));
        client.setQueryData(listKey, { ...before, content, totalElements });
        client.setQueryData(unreadKey, totalElements);
      } else {
        client.setQueryData(unreadKey, (count = 0) => Math.max(0, count - 1));
      }
      const hasMoreBehind = before !== undefined && before.totalElements > before.content.length;
      if (result === "gone" || hasMoreBehind) void client.invalidateQueries({ queryKey: listKey });
    },
  });
};
