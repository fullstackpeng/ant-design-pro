// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 查询已支持的存储协议及字段定义 GET /api/platform/storage/protocols */
export async function listStorageProtocols(options?: RequestOptions) {
  return request<BackendAPI.StorageProtocolListResponseDto>(
    "/api/platform/storage/protocols",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 查询存储服务商，不返回密钥值 GET /api/platform/storage/providers */
export async function listStorageProviders(options?: RequestOptions) {
  return request<BackendAPI.StorageProviderListResponseDto>(
    "/api/platform/storage/providers",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 新增服务商 POST /api/platform/storage/providers */
export async function createStorageProvider(
  body: BackendAPI.CreateStorageProviderDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>(
    "/api/platform/storage/providers",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 修改服务商 PATCH /api/platform/storage/providers/${param0} */
export async function updateStorageProvider(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateStorageProviderParams,
  body: BackendAPI.UpdateStorageProviderDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/storage/providers/${param0}`,
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

/** 设为全局默认服务商 POST /api/platform/storage/providers/${param0}/default */
export async function setDefaultStorageProvider(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.setDefaultStorageProviderParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/storage/providers/${param0}/default`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 测试服务商连接 POST /api/platform/storage/providers/${param0}/test */
export async function testStorageProvider(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.testStorageProviderParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/storage/providers/${param0}/test`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}
