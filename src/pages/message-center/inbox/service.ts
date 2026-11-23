import * as notifications from '@/services/backend/notifications';

export type InboxNotification = BackendAPI.NotificationDto;
export type InboxStatus = 'all' | 'unread' | 'read';

export const listInbox = (params: BackendAPI.listInboxNotificationsParams) =>
  notifications.listInboxNotifications(params, { skipErrorHandler: true });

export const markRead = (id: string) =>
  notifications.readNotification({ id }, { skipErrorHandler: true });

export const markAllRead = () =>
  notifications.readAllNotifications({ skipErrorHandler: true });
