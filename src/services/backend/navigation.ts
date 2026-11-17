// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 获取当前身份的菜单和页面权限 GET /api/current/navigation */
export async function currentNavigation(options?: RequestOptions) {
  return request<BackendAPI.NavigationResponseDto>("/api/current/navigation", {
    method: "GET",
    ...(options || {}),
  });
}

/** 查询可分配功能目录 GET /api/platform/features */
export async function listFeatures(options?: RequestOptions) {
  return request<BackendAPI.FeatureListResponseDto>("/api/platform/features", {
    method: "GET",
    ...(options || {}),
  });
}

/** 查询持久化菜单目录 GET /api/platform/menus */
export async function listMenus(options?: RequestOptions) {
  return request<BackendAPI.MenuListResponseDto>("/api/platform/menus", {
    method: "GET",
    ...(options || {}),
  });
}

/** 新增目录或已注册页面菜单 POST /api/platform/menus */
export async function createMenu(
  body: BackendAPI.CreateMenuDto,
  options?: RequestOptions
) {
  return request<BackendAPI.MenuListResponseDto>("/api/platform/menus", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除菜单入口，不撤销模块权限 DELETE /api/platform/menus/${param0} */
export async function deleteMenu(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteMenuParams,
  options?: RequestOptions
) {
  const { code: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(`/api/platform/menus/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 修改菜单名称、图标、排序和状态 PATCH /api/platform/menus/${param0} */
export async function updateMenu(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateMenuParams,
  body: BackendAPI.UpdateMenuDto,
  options?: RequestOptions
) {
  const { code: param0, ...queryParams } = params;
  return request<BackendAPI.MenuListResponseDto>(
    `/api/platform/menus/${param0}`,
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

/** 查询代码注册的页面与模块权限 GET /api/platform/pages */
export async function listRegisteredPages(options?: RequestOptions) {
  return request<BackendAPI.RegisteredPageListResponseDto>(
    "/api/platform/pages",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 查询租户已开通功能 GET /api/platform/tenants/${param0}/features */
export async function tenantFeatures(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.tenantFeaturesParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.TenantFeaturesResponseDto>(
    `/api/platform/tenants/${param0}/features`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 替换租户开通功能，空数组撤销全部业务功能 PATCH /api/platform/tenants/${param0}/features */
export async function assignTenantFeatures(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.assignTenantFeaturesParams,
  body: BackendAPI.AssignFeaturesDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.TenantFeaturesResponseDto>(
    `/api/platform/tenants/${param0}/features`,
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
