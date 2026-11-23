// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 查询当前租户岗位 GET /api/tenant/positions */
export async function listPositions(options?: RequestOptions) {
  return request<BackendAPI.PositionListResponseDto>("/api/tenant/positions", {
    method: "GET",
    ...(options || {}),
  });
}

/** 新增岗位 POST /api/tenant/positions */
export async function createPosition(
  body: BackendAPI.CreatePositionDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/tenant/positions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除未使用的岗位 DELETE /api/tenant/positions/${param0} */
export async function deletePosition(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deletePositionParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/positions/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 编辑岗位 PATCH /api/tenant/positions/${param0} */
export async function updatePosition(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updatePositionParams,
  body: BackendAPI.UpdatePositionDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/positions/${param0}`,
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
