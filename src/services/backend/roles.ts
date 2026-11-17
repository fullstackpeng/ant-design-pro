// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 查询当前租户可分配权限 GET /api/tenant/permissions */
export async function listPermissions(options?: RequestOptions) {
  return request<BackendAPI.PermissionListResponseDto>(
    "/api/tenant/permissions",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 查询当前租户角色 GET /api/tenant/roles */
export async function listRoles(options?: RequestOptions) {
  return request<BackendAPI.RoleListResponseDto>("/api/tenant/roles", {
    method: "GET",
    ...(options || {}),
  });
}

/** 创建租户角色 POST /api/tenant/roles */
export async function createRole(
  body: BackendAPI.CreateRoleDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/tenant/roles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除未分配的租户角色 DELETE /api/tenant/roles/${param0} */
export async function deleteRole(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteRoleParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(`/api/tenant/roles/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 修改租户角色与权限 PATCH /api/tenant/roles/${param0} */
export async function updateRole(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateRoleParams,
  body: BackendAPI.UpdateRoleDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(`/api/tenant/roles/${param0}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  });
}
