// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 查询当前租户部门 GET /api/tenant/departments */
export async function listDepartments(options?: RequestOptions) {
  return request<BackendAPI.DepartmentListResponseDto>(
    "/api/tenant/departments",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 新增部门 POST /api/tenant/departments */
export async function createDepartment(
  body: BackendAPI.CreateDepartmentDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/tenant/departments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除未使用的部门 DELETE /api/tenant/departments/${param0} */
export async function deleteDepartment(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteDepartmentParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/departments/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 编辑部门 PATCH /api/tenant/departments/${param0} */
export async function updateDepartment(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateDepartmentParams,
  body: BackendAPI.UpdateDepartmentDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/departments/${param0}`,
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
