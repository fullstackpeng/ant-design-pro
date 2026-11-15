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
