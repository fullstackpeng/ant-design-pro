// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 查询站点配置及版本 GET /api/platform/settings */
export async function getSiteSettings(options?: RequestOptions) {
  return request<BackendAPI.SiteSettingsResponseDto>("/api/platform/settings", {
    method: "GET",
    ...(options || {}),
  });
}

/** 更新站点配置并记录变更 PATCH /api/platform/settings */
export async function updateSiteSettings(
  body: BackendAPI.UpdateSiteSettingsDto,
  options?: RequestOptions
) {
  return request<BackendAPI.SiteSettingsResponseDto>("/api/platform/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页查询配置变更记录 GET /api/platform/settings/history */
export async function listSiteSettingsHistory(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listSiteSettingsHistoryParams,
  options?: RequestOptions
) {
  return request<BackendAPI.SiteSettingsAuditListResponseDto>(
    "/api/platform/settings/history",
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

/** 查询公开的站点展示配置 GET /api/site-settings */
export async function publicSiteSettings(options?: RequestOptions) {
  return request<BackendAPI.PublicSiteSettingsResponseDto>(
    "/api/site-settings",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}
