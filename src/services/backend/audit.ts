// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 分页查询平台及租户登录日志 GET /api/platform/audit/login-logs */
export async function listPlatformLoginLogs(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listPlatformLoginLogsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.AuditLogListResponseDto>(
    "/api/platform/audit/login-logs",
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

/** 查看平台及租户登录日志 GET /api/platform/audit/login-logs/${param0} */
export async function getPlatformLoginLog(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getPlatformLoginLogParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.AuditLogResponseDto>(
    `/api/platform/audit/login-logs/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 分页查询平台及租户操作日志 GET /api/platform/audit/operation-logs */
export async function listPlatformOperationLogs(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listPlatformOperationLogsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.AuditLogListResponseDto>(
    "/api/platform/audit/operation-logs",
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

/** 查看平台及租户操作日志 GET /api/platform/audit/operation-logs/${param0} */
export async function getPlatformOperationLog(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getPlatformOperationLogParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.AuditLogResponseDto>(
    `/api/platform/audit/operation-logs/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 查看日志保留策略 GET /api/platform/audit/policy */
export async function getPlatformAuditPolicy(options?: RequestOptions) {
  return request<BackendAPI.AuditPolicyResponseDto>(
    "/api/platform/audit/policy",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 修改日志保留策略（缩短会清理历史记录） PATCH /api/platform/audit/policy */
export async function updateAuditPolicy(
  body: BackendAPI.UpdateAuditPolicyDto,
  options?: RequestOptions
) {
  return request<BackendAPI.AuditPolicyResponseDto>(
    "/api/platform/audit/policy",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 分页查询当前租户登录日志 GET /api/tenant/audit/login-logs */
export async function listTenantLoginLogs(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listTenantLoginLogsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.AuditLogListResponseDto>(
    "/api/tenant/audit/login-logs",
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

/** 查看当前租户登录日志 GET /api/tenant/audit/login-logs/${param0} */
export async function getTenantLoginLog(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getTenantLoginLogParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.AuditLogResponseDto>(
    `/api/tenant/audit/login-logs/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 分页查询当前租户操作日志 GET /api/tenant/audit/operation-logs */
export async function listTenantOperationLogs(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listTenantOperationLogsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.AuditLogListResponseDto>(
    "/api/tenant/audit/operation-logs",
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

/** 查看当前租户操作日志 GET /api/tenant/audit/operation-logs/${param0} */
export async function getTenantOperationLog(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getTenantOperationLogParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.AuditLogResponseDto>(
    `/api/tenant/audit/operation-logs/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 查看日志保留策略 GET /api/tenant/audit/policy */
export async function getTenantAuditPolicy(options?: RequestOptions) {
  return request<BackendAPI.AuditPolicyResponseDto>(
    "/api/tenant/audit/policy",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}
