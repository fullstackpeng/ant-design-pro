// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 分页查询全局账号及租户成员关系 GET /api/platform/users */
export async function listUsers(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listUsersParams,
  options?: RequestOptions
) {
  return request<BackendAPI.UserListResponseDto>("/api/platform/users", {
    method: "GET",
    params: {
      // current has a default value: 1
      current: "1",
      // pageSize has a default value: 20
      pageSize: "20",
      ...params,
    },
    ...(options || {}),
  });
}

/** 创建普通全局账号 POST /api/platform/users */
export async function createUser(
  body: BackendAPI.CreateUserDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/platform/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改账号姓名及全局状态 PATCH /api/platform/users/${param0} */
export async function updateUser(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateUserParams,
  body: BackendAPI.UpdateUserDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(`/api/platform/users/${param0}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  });
}

/** 重置密码并撤销全部会话 POST /api/platform/users/${param0}/password */
export async function resetUserPassword(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.resetUserPasswordParams,
  body: BackendAPI.ResetPasswordDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/users/${param0}/password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}
