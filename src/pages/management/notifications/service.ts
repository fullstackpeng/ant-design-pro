import * as members from '@/services/backend/members';
import * as notifications from '@/services/backend/notifications';
import * as platform from '@/services/backend/platform';

export type Notification = BackendAPI.NotificationDto;
export type NotificationFormValues = BackendAPI.CreateNotificationDto;
export type NotificationScope = 'platform' | 'tenant';

export const listNotifications = (
  scope: NotificationScope,
  params: BackendAPI.NotificationQueryDto = {},
) =>
  scope === 'platform'
    ? notifications.listPlatformNotifications(params, {
        skipErrorHandler: true,
      })
    : notifications.listTenantNotifications(params, {
        skipErrorHandler: true,
      });

export const getNotification = (scope: NotificationScope, id: string) =>
  scope === 'platform'
    ? notifications.getPlatformNotification({ id }, { skipErrorHandler: true })
    : notifications.getTenantNotification({ id }, { skipErrorHandler: true });

export const createNotification = (
  scope: NotificationScope,
  body: NotificationFormValues,
) =>
  scope === 'platform'
    ? notifications.createPlatformNotification(body, {
        skipErrorHandler: true,
      })
    : notifications.createTenantNotification(body, {
        skipErrorHandler: true,
      });

export const updateNotification = (
  scope: NotificationScope,
  id: string,
  body: NotificationFormValues,
) =>
  scope === 'platform'
    ? notifications.updatePlatformNotification({ id }, body, {
        skipErrorHandler: true,
      })
    : notifications.updateTenantNotification({ id }, body, {
        skipErrorHandler: true,
      });

export const deleteNotification = (scope: NotificationScope, id: string) =>
  scope === 'platform'
    ? notifications.deletePlatformNotification(
        { id },
        {
          skipErrorHandler: true,
        },
      )
    : notifications.deleteTenantNotification(
        { id },
        {
          skipErrorHandler: true,
        },
      );

export const uploadImage = (scope: NotificationScope, file: File) =>
  scope === 'platform'
    ? notifications.uploadPlatformNotificationImage({}, file, {
        skipErrorHandler: true,
      })
    : notifications.uploadTenantNotificationImage({}, file, {
        skipErrorHandler: true,
      });

/** 分页拉完所有记录，保证“全选”覆盖全部租户/成员，而不只是第一页。 */
async function listAll<T>(
  fetchPage: (
    current: number,
    pageSize: number,
  ) => Promise<{ data: T[]; total: number }>,
) {
  const pageSize = 100;
  const first = await fetchPage(1, pageSize);
  const pages = Math.ceil(first.total / pageSize);
  if (pages <= 1) return first.data;

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      fetchPage(index + 2, pageSize),
    ),
  );
  return [...first.data, ...rest.flatMap((page) => page.data)];
}

export const listTenants = async () => {
  const data = await listAll((current, pageSize) =>
    platform.listTenants({ current, pageSize }, { skipErrorHandler: true }),
  );
  return { success: true as const, data, total: data.length };
};

export const listMembers = async () => {
  const data = await listAll((current, pageSize) =>
    members.listMembers({ current, pageSize }, { skipErrorHandler: true }),
  );
  return { success: true as const, data, total: data.length };
};
