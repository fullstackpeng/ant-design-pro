// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 上传本人账号头像 POST /api/account/avatar */
export async function uploadAccountAvatar(
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

  return request<BackendAPI.AccountAvatarResponseDto>("/api/account/avatar", {
    method: "POST",
    data: formData,
    requestType: "form",
    ...(options || {}),
  });
}

/** 移除本人头像 DELETE /api/account/avatar */
export async function removeAccountAvatar(options?: RequestOptions) {
  return request<BackendAPI.EmptyResponseDto>("/api/account/avatar", {
    method: "DELETE",
    ...(options || {}),
  });
}

/** 读取本人头像的短时签名地址 GET /api/account/avatar/${param0} */
export async function getAccountAvatar(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getAccountAvatarParams,
  options?: RequestOptions
) {
  const { version: param0, ...queryParams } = params;
  return request<any>(`/api/account/avatar/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 修改本人密码并撤销全部会话 POST /api/account/password */
export async function changeAccountPassword(
  body: BackendAPI.ChangeAccountPasswordDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/account/password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 查询本人资料及当前租户任职 GET /api/account/profile */
export async function accountProfile(options?: RequestOptions) {
  return request<BackendAPI.AccountProfileResponseDto>("/api/account/profile", {
    method: "GET",
    ...(options || {}),
  });
}

/** 修改本人显示名称 PATCH /api/account/profile */
export async function updateAccountProfile(
  body: BackendAPI.UpdateAccountProfileDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/account/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 撤销本人除当前登录外的全部会话 POST /api/account/sessions/revoke-others */
export async function revokeOtherAccountSessions(options?: RequestOptions) {
  return request<BackendAPI.EmptyResponseDto>(
    "/api/account/sessions/revoke-others",
    {
      method: "POST",
      ...(options || {}),
    }
  );
}
