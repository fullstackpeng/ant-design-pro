// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 已登录用户只读平台字典，不依赖租户字典功能；包含停用项用于历史展示 GET /api/dictionaries/platform/${param0} */
export async function getPlatformDictionary(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getPlatformDictionaryParams,
  options?: RequestOptions
) {
  const { code: param0, ...queryParams } = params;
  return request<BackendAPI.PlatformDictionaryDetailResponseDto>(
    `/api/dictionaries/platform/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 分页查询平台字典类型 GET /api/platform/dictionaries */
export async function listPlatformDictionaries(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listPlatformDictionariesParams,
  options?: RequestOptions
) {
  return request<BackendAPI.PlatformDictionaryListResponseDto>(
    "/api/platform/dictionaries",
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

/** 创建平台共享字典类型 POST /api/platform/dictionaries */
export async function createPlatformDictionary(
  body: BackendAPI.CreateDictionaryDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/platform/dictionaries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改平台字典并记录审计，版本过期返回409 PATCH /api/platform/dictionaries/${param0} */
export async function updatePlatformDictionary(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updatePlatformDictionaryParams,
  body: BackendAPI.UpdatePlatformDictionaryDto,
  options?: RequestOptions
) {
  const { code: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/dictionaries/${param0}`,
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

/** 查询平台字典变更记录 GET /api/platform/dictionaries/${param0}/history */
export async function listPlatformDictionaryHistory(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listPlatformDictionaryHistoryParams,
  options?: RequestOptions
) {
  const { code: param0, ...queryParams } = params;
  return request<BackendAPI.DictionaryAuditListResponseDto>(
    `/api/platform/dictionaries/${param0}/history`,
    {
      method: "GET",
      params: {
        // current has a default value: 1
        current: "1",
        // pageSize has a default value: 20
        pageSize: "20",
        ...queryParams,
      },
      ...(options || {}),
    }
  );
}

/** 创建平台字典项 POST /api/platform/dictionaries/${param0}/items */
export async function createPlatformDictionaryItem(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.createPlatformDictionaryItemParams,
  body: BackendAPI.CreateDictionaryItemDto,
  options?: RequestOptions
) {
  const { code: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/dictionaries/${param0}/items`,
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

/** 修改平台字典项并记录审计，版本过期返回409 PATCH /api/platform/dictionaries/${param1}/items/${param0} */
export async function updatePlatformDictionaryItem(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updatePlatformDictionaryItemParams,
  body: BackendAPI.UpdatePlatformDictionaryItemDto,
  options?: RequestOptions
) {
  const { id: param0, code: param1, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/dictionaries/${param1}/items/${param0}`,
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
