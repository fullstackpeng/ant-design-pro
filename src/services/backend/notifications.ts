// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 分页查询我的消息 GET /api/message-center/inbox */
export async function listInboxNotifications(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listInboxNotificationsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.NotificationListResponseDto>(
    "/api/message-center/inbox",
    {
      method: "GET",
      params: {
        // current has a default value: 1
        current: "1",
        // pageSize has a default value: 20
        pageSize: "20",

        // status has a default value: all
        status: "all",
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 将单条消息标记为已读 POST /api/message-center/inbox/${param0}/read */
export async function readNotification(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.readNotificationParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/message-center/inbox/${param0}/read`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 全部标记为已读 POST /api/message-center/inbox/read-all */
export async function readAllNotifications(options?: RequestOptions) {
  return request<BackendAPI.EmptyResponseDto>(
    "/api/message-center/inbox/read-all",
    {
      method: "POST",
      ...(options || {}),
    }
  );
}

/** 通知正文图片：登录后重定向到短时签名地址 GET /api/notification-assets/${param0} */
export async function getNotificationAsset(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getNotificationAssetParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<any>(`/api/notification-assets/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 分页查询平台通知公告 GET /api/platform/notifications */
export async function listPlatformNotifications(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listPlatformNotificationsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.NotificationListResponseDto>(
    "/api/platform/notifications",
    {
      method: "GET",
      params: {
        // current has a default value: 1
        current: "1",
        // pageSize has a default value: 20
        pageSize: "20",

        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 新建平台通知公告 POST /api/platform/notifications */
export async function createPlatformNotification(
  body: BackendAPI.CreateNotificationDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/platform/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 查询平台通知公告详情 GET /api/platform/notifications/${param0} */
export async function getPlatformNotification(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getPlatformNotificationParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.NotificationDetailResponseDto>(
    `/api/platform/notifications/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 删除平台通知公告 DELETE /api/platform/notifications/${param0} */
export async function deletePlatformNotification(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deletePlatformNotificationParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/notifications/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 编辑平台通知公告 PATCH /api/platform/notifications/${param0} */
export async function updatePlatformNotification(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updatePlatformNotificationParams,
  body: BackendAPI.CreateNotificationDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/notifications/${param0}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 上传平台通知公告正文图片 POST /api/platform/notifications/images */
export async function uploadPlatformNotificationImage(
  body: {},
  file?: File,
  options?: RequestOptions
) {
  const formData = new FormData();

  if (file) {
    formData.append("file", file);
  }

  Object.keys(body).forEach((ele) => {
    const item = (body as any)[ele];

    if (item !== undefined && item !== null) {
      if (typeof item === "object" && !(item instanceof File)) {
        if (item instanceof Array) {
          item.forEach((f) => formData.append(ele, f || ""));
        } else {
          formData.append(
            ele,
            new Blob([JSON.stringify(item)], { type: "application/json" })
          );
        }
      } else {
        formData.append(ele, item);
      }
    }
  });

  return request<BackendAPI.NotificationAssetResponseDto>(
    "/api/platform/notifications/images",
    {
      method: "POST",
      data: formData,
      requestType: "form",
      ...(options || {}),
    }
  );
}

/** 分页查询本租户通知公告 GET /api/tenant/notifications */
export async function listTenantNotifications(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listTenantNotificationsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.NotificationListResponseDto>(
    "/api/tenant/notifications",
    {
      method: "GET",
      params: {
        // current has a default value: 1
        current: "1",
        // pageSize has a default value: 20
        pageSize: "20",

        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 新建本租户通知公告 POST /api/tenant/notifications */
export async function createTenantNotification(
  body: BackendAPI.CreateNotificationDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/tenant/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 查询本租户通知公告详情 GET /api/tenant/notifications/${param0} */
export async function getTenantNotification(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getTenantNotificationParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.NotificationDetailResponseDto>(
    `/api/tenant/notifications/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 删除本租户通知公告 DELETE /api/tenant/notifications/${param0} */
export async function deleteTenantNotification(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteTenantNotificationParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/notifications/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 编辑本租户通知公告 PATCH /api/tenant/notifications/${param0} */
export async function updateTenantNotification(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateTenantNotificationParams,
  body: BackendAPI.CreateNotificationDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/notifications/${param0}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 上传租户通知公告正文图片 POST /api/tenant/notifications/images */
export async function uploadTenantNotificationImage(
  body: {},
  file?: File,
  options?: RequestOptions
) {
  const formData = new FormData();

  if (file) {
    formData.append("file", file);
  }

  Object.keys(body).forEach((ele) => {
    const item = (body as any)[ele];

    if (item !== undefined && item !== null) {
      if (typeof item === "object" && !(item instanceof File)) {
        if (item instanceof Array) {
          item.forEach((f) => formData.append(ele, f || ""));
        } else {
          formData.append(
            ele,
            new Blob([JSON.stringify(item)], { type: "application/json" })
          );
        }
      } else {
        formData.append(ele, item);
      }
    }
  });

  return request<BackendAPI.NotificationAssetResponseDto>(
    "/api/tenant/notifications/images",
    {
      method: "POST",
      data: formData,
      requestType: "form",
      ...(options || {}),
    }
  );
}
