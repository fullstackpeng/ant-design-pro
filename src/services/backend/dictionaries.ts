// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 查询当前租户字典类型 GET /api/tenant/dictionaries */
export async function listDictionaries(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listDictionariesParams,
  options?: RequestOptions
) {
  return request<BackendAPI.DictionaryListResponseDto>(
    "/api/tenant/dictionaries",
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

/** 创建字典类型 POST /api/tenant/dictionaries */
export async function createDictionary(
  body: BackendAPI.CreateDictionaryDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/tenant/dictionaries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 读取字典及历史选项，停用项只用于展示 GET /api/tenant/dictionaries/${param0} */
export async function getDictionary(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getDictionaryParams,
  options?: RequestOptions
) {
  const { code: param0, ...queryParams } = params;
  return request<BackendAPI.DictionaryDetailResponseDto>(
    `/api/tenant/dictionaries/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 修改字典类型，编码不可修改 PATCH /api/tenant/dictionaries/${param0} */
export async function updateDictionary(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateDictionaryParams,
  body: BackendAPI.UpdateDictionaryDto,
  options?: RequestOptions
) {
  const { code: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/dictionaries/${param0}`,
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

/** 创建字典项 POST /api/tenant/dictionaries/${param0}/items */
export async function createDictionaryItem(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.createDictionaryItemParams,
  body: BackendAPI.CreateDictionaryItemDto,
  options?: RequestOptions
) {
  const { code: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/dictionaries/${param0}/items`,
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

/** 修改字典项，值不可修改 PATCH /api/tenant/dictionaries/${param1}/items/${param0} */
export async function updateDictionaryItem(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateDictionaryItemParams,
  body: BackendAPI.UpdateDictionaryItemDto,
  options?: RequestOptions
) {
  const { id: param0, code: param1, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/dictionaries/${param1}/items/${param0}`,
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
