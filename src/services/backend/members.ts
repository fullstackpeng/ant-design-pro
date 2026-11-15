// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 获取当前租户身份 GET /api/tenant/current */
export async function currentTenant(options?: RequestOptions) {
  return request<BackendAPI.CurrentTenantResponseDto>("/api/tenant/current", {
    method: "GET",
    ...(options || {}),
  });
}

/** 分页查询当前租户成员 GET /api/tenant/members */
export async function listMembers(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listMembersParams,
  options?: RequestOptions
) {
  return request<BackendAPI.MemberListResponseDto>("/api/tenant/members", {
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

/** 添加已有账号或创建新成员 POST /api/tenant/members */
export async function addMember(
  body: BackendAPI.CreateMemberDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/tenant/members", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 移除成员，保留全局账号 DELETE /api/tenant/members/${param0} */
export async function removeMember(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.removeMemberParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(`/api/tenant/members/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 调整成员角色与状态 PATCH /api/tenant/members/${param0} */
export async function updateMember(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateMemberParams,
  body: BackendAPI.UpdateMemberDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(`/api/tenant/members/${param0}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  });
}

/** 查询当前租户订阅与成员用量 GET /api/tenant/subscription */
export async function subscriptionInfo(options?: RequestOptions) {
  return request<BackendAPI.SubscriptionUsageResponseDto>(
    "/api/tenant/subscription",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}
