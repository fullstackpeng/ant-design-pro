// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 连通性检查 GET /api/hello */
export async function hello(options?: RequestOptions) {
  return request<BackendAPI.HelloResponseDto>("/api/hello", {
    method: "GET",
    ...(options || {}),
  });
}
