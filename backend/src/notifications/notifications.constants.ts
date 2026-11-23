export const NOTIFICATION_FEATURE = 'notifications';

export const notificationTypes = ['notice', 'announcement'] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const notificationSources = ['platform', 'tenant'] as const;
export type NotificationSource = (typeof notificationSources)[number];

export const MAX_NOTIFICATION_TARGETS = 100;
