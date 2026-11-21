// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 查询所有租户及平台文件 GET /api/platform/files */
export async function listPlatformFiles(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listPlatformFilesParams,
  options?: RequestOptions
) {
  return request<BackendAPI.FileListResponseDto>("/api/platform/files", {
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

/** 上传平台文件 POST /api/platform/files */
export async function uploadPlatformFile(
  body: {},
  file?: File,
  options?: RequestOptions
) {
  const formData = new FormData();

  if (file) {
    formData.append("file", file);
  }

  Object.keys(body).forEach((ele) => {
    const item = (body as any)[ele];

    if (item !== undefined && item !== null) {
      if (typeof item === "object" && !(item instanceof File)) {
        if (item instanceof Array) {
          item.forEach((f) => formData.append(ele, f || ""));
        } else {
          formData.append(
            ele,
            new Blob([JSON.stringify(item)], { type: "application/json" })
          );
        }
      } else {
        formData.append(ele, item);
      }
    }
  });

  return request<BackendAPI.EmptyResponseDto>("/api/platform/files", {
    method: "POST",
    data: formData,
    requestType: "form",
    ...(options || {}),
  });
}

/** 删除任意文件 DELETE /api/platform/files/${param0} */
export async function deletePlatformFile(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deletePlatformFileParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(`/api/platform/files/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取任意文件的短时下载地址 GET /api/platform/files/${param0}/download */
export async function downloadPlatformFile(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.downloadPlatformFileParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.FileDownloadResponseDto>(
    `/api/platform/files/${param0}/download`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 上传登录页和站点 Logo 使用的公开图片 POST /api/platform/files/site-assets */
export async function uploadSiteAsset(
  body: {},
  file?: File,
  options?: RequestOptions
) {
  const formData = new FormData();

  if (file) {
    formData.append("file", file);
  }

  Object.keys(body).forEach((ele) => {
    const item = (body as any)[ele];

    if (item !== undefined && item !== null) {
      if (typeof item === "object" && !(item instanceof File)) {
        if (item instanceof Array) {
          item.forEach((f) => formData.append(ele, f || ""));
        } else {
          formData.append(
            ele,
            new Blob([JSON.stringify(item)], { type: "application/json" })
          );
        }
      } else {
        formData.append(ele, item);
      }
    }
  });

  return request<BackendAPI.SiteAssetResponseDto>(
    "/api/platform/files/site-assets",
    {
      method: "POST",
      data: formData,
      requestType: "form",
      ...(options || {}),
    }
  );
}

/** 公开站点图片：重定向到短时签名地址 GET /api/site-assets/${param0} */
export async function getSiteAsset(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getSiteAssetParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<any>(`/api/site-assets/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 分页查询本租户文件 GET /api/tenant/files */
export async function listFiles(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listFilesParams,
  options?: RequestOptions
) {
  return request<BackendAPI.FileListResponseDto>("/api/tenant/files", {
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

/** 上传文件 POST /api/tenant/files */
export async function uploadFile(
  body: {},
  file?: File,
  options?: RequestOptions
) {
  const formData = new FormData();

  if (file) {
    formData.append("file", file);
  }

  Object.keys(body).forEach((ele) => {
    const item = (body as any)[ele];

    if (item !== undefined && item !== null) {
      if (typeof item === "object" && !(item instanceof File)) {
        if (item instanceof Array) {
          item.forEach((f) => formData.append(ele, f || ""));
        } else {
          formData.append(
            ele,
            new Blob([JSON.stringify(item)], { type: "application/json" })
          );
        }
      } else {
        formData.append(ele, item);
      }
    }
  });

  return request<BackendAPI.EmptyResponseDto>("/api/tenant/files", {
    method: "POST",
    data: formData,
    requestType: "form",
    ...(options || {}),
  });
}

/** 删除文件 DELETE /api/tenant/files/${param0} */
export async function deleteFile(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteFileParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(`/api/tenant/files/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取文件短时下载地址 GET /api/tenant/files/${param0}/download */
export async function downloadFile(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.downloadFileParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.FileDownloadResponseDto>(
    `/api/tenant/files/${param0}/download`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 查询租户存储用量 GET /api/tenant/files/usage */
export async function getFileUsage(options?: RequestOptions) {
  return request<BackendAPI.FileUsageResponseDto>("/api/tenant/files/usage", {
    method: "GET",
    ...(options || {}),
  });
}
