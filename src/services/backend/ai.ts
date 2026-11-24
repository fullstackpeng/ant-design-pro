// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 查询可访问 AI 助手 GET /api/ai/assistants */
export async function listAccessibleAiAssistants(options?: RequestOptions) {
  return request<BackendAPI.AiAccessibleAssistantListResponse>(
    "/api/ai/assistants",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 授权操作指南问答 POST /api/ai/chat */
export async function askAi(
  body: BackendAPI.AiChatRequestDto,
  options?: RequestOptions
) {
  return request<BackendAPI.AiChatResponse>("/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 查询本人会话 GET /api/ai/conversations */
export async function listAiConversations(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listAiConversationsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.AiConversationListResponse>(
    "/api/ai/conversations",
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

/** 删除本人会话 DELETE /api/ai/conversations/${param0} */
export async function deleteAiConversation(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteAiConversationParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/ai/conversations/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 查询本人消息 GET /api/ai/conversations/${param0}/messages */
export async function listAiMessages(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listAiMessagesParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.AiMessageListResponse>(
    `/api/ai/conversations/${param0}/messages`,
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
