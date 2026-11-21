// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 获取当前账号及租户上下文 GET /api/currentUser */
export async function currentUser(options?: RequestOptions) {
  return request<BackendAPI.CurrentUserResponseDto>("/api/currentUser", {
    method: "GET",
    ...(options || {}),
  });
}

/** 租户或平台账号登录 POST /api/login/account */
export async function login(
  body: BackendAPI.LoginDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/login/account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 撤销当前会话 POST /api/login/outLogin */
export async function logout(options?: RequestOptions) {
  return request<BackendAPI.EmptyResponseDto>("/api/login/outLogin", {
    method: "POST",
    ...(options || {}),
  });
}

/** 查询可用于登录的启用租户 GET /api/login/tenants */
export async function listLoginTenants(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listLoginTenantsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.LoginTenantListResponseDto>("/api/login/tenants", {
    method: "GET",
    params: {
      // limit has a default value: 20
      limit: "20",
      ...params,
    },
    ...(options || {}),
  });
}
