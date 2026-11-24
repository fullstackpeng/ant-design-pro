// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 查询 AI 助手 GET /api/platform/ai/assistants */
export async function listAiAssistants(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listAiAssistantsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.AiAssistantListResponse>(
    "/api/platform/ai/assistants",
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

/** 创建 AI 助手 POST /api/platform/ai/assistants */
export async function createAiAssistant(
  body: BackendAPI.CreateAiAssistantDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/platform/ai/assistants", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除 AI 助手 DELETE /api/platform/ai/assistants/${param0} */
export async function deleteAiAssistant(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteAiAssistantParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/ai/assistants/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 修改 AI 助手 PATCH /api/platform/ai/assistants/${param0} */
export async function updateAiAssistant(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateAiAssistantParams,
  body: BackendAPI.UpdateAiAssistantDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/ai/assistants/${param0}`,
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

/** 查询 AI 操作指南 GET /api/platform/ai/documents */
export async function listAiDocuments(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listAiDocumentsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.AiDocumentListResponse>(
    "/api/platform/ai/documents",
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

/** 创建 AI 操作指南 POST /api/platform/ai/documents */
export async function createAiDocument(
  body: BackendAPI.CreateAiDocumentDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/platform/ai/documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除 AI 操作指南 DELETE /api/platform/ai/documents/${param0} */
export async function deleteAiDocument(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteAiDocumentParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/ai/documents/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 修改 AI 操作指南 PATCH /api/platform/ai/documents/${param0} */
export async function updateAiDocument(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateAiDocumentParams,
  body: BackendAPI.UpdateAiDocumentDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/ai/documents/${param0}`,
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

/** 查询 AI 知识库 GET /api/platform/ai/knowledge-bases */
export async function listAiKnowledgeBases(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listAiKnowledgeBasesParams,
  options?: RequestOptions
) {
  return request<BackendAPI.AiKnowledgeBaseListResponse>(
    "/api/platform/ai/knowledge-bases",
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

/** 创建 AI 知识库 POST /api/platform/ai/knowledge-bases */
export async function createAiKnowledgeBase(
  body: BackendAPI.CreateAiKnowledgeBaseDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>(
    "/api/platform/ai/knowledge-bases",
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

/** 删除 AI 知识库 DELETE /api/platform/ai/knowledge-bases/${param0} */
export async function deleteAiKnowledgeBase(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteAiKnowledgeBaseParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/ai/knowledge-bases/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 修改 AI 知识库 PATCH /api/platform/ai/knowledge-bases/${param0} */
export async function updateAiKnowledgeBase(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateAiKnowledgeBaseParams,
  body: BackendAPI.UpdateAiKnowledgeBaseDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/ai/knowledge-bases/${param0}`,
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

/** 查询 AI 知识权限和导航选项 GET /api/platform/ai/options */
export async function getAiOptions(options?: RequestOptions) {
  return request<BackendAPI.AiOptionsResponse>("/api/platform/ai/options", {
    method: "GET",
    ...(options || {}),
  });
}

/** 查询会话保留策略 GET /api/platform/ai/policy */
export async function getAiPolicy(options?: RequestOptions) {
  return request<BackendAPI.AiPolicyDtoResponse>("/api/platform/ai/policy", {
    method: "GET",
    ...(options || {}),
  });
}

/** 修改会话保留策略 PATCH /api/platform/ai/policy */
export async function updateAiPolicy(
  body: BackendAPI.UpdateAiPolicyDto,
  options?: RequestOptions
) {
  return request<BackendAPI.AiPolicyDtoResponse>("/api/platform/ai/policy", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
