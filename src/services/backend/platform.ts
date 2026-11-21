// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 分页查询套餐 GET /api/platform/plans */
export async function listPlans(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listPlansParams,
  options?: RequestOptions
) {
  return request<BackendAPI.PlanListResponseDto>("/api/platform/plans", {
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

/** 创建套餐 POST /api/platform/plans */
export async function createPlan(
  body: BackendAPI.CreatePlanDto,
  options?: RequestOptions
) {
  return request<BackendAPI.PlanResponseDto>("/api/platform/plans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改套餐与成员上限 PATCH /api/platform/plans/${param0} */
export async function updatePlan(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updatePlanParams,
  body: BackendAPI.UpdatePlanDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.PlanResponseDto>(`/api/platform/plans/${param0}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  });
}

/** 分页查询租户 GET /api/platform/tenants */
export async function listTenants(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listTenantsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.TenantListResponseDto>("/api/platform/tenants", {
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

/** 创建租户及首位管理员 POST /api/platform/tenants */
export async function createTenant(
  body: BackendAPI.CreateTenantDto,
  options?: RequestOptions
) {
  return request<BackendAPI.TenantResponseDto>("/api/platform/tenants", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改租户名称、行业与状态 PATCH /api/platform/tenants/${param0} */
export async function updateTenant(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateTenantParams,
  body: BackendAPI.UpdateTenantDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.TenantResponseDto>(
    `/api/platform/tenants/${param0}`,
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

/** 人工分配或更新租户订阅 POST /api/platform/tenants/${param0}/subscription */
export async function assignPlan(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.assignPlanParams,
  body: BackendAPI.AssignPlanDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.SubscriptionResponseDto>(
    `/api/platform/tenants/${param0}/subscription`,
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
