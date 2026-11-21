// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 查询平台 MQTT Broker 单例配置 GET /api/platform/mqtt/broker */
export async function getMqttPlatformBroker(options?: RequestOptions) {
  return request<BackendAPI.MqttPlatformBrokerResponseDto>(
    "/api/platform/mqtt/broker",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 修改平台 MQTT Broker 配置 PATCH /api/platform/mqtt/broker */
export async function updateMqttPlatformBroker(
  body: BackendAPI.UpdateMqttPlatformBrokerDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/platform/mqtt/broker", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 创建平台 Bridge 角色和账号 POST /api/platform/mqtt/broker/provision-bridge */
export async function provisionMqttBridge(options?: RequestOptions) {
  return request<BackendAPI.EmptyResponseDto>(
    "/api/platform/mqtt/broker/provision-bridge",
    {
      method: "POST",
      ...(options || {}),
    }
  );
}

/** 重新连接平台 Broker Bridge POST /api/platform/mqtt/broker/reconnect */
export async function reconnectMqttBridge(options?: RequestOptions) {
  return request<BackendAPI.EmptyResponseDto>(
    "/api/platform/mqtt/broker/reconnect",
    {
      method: "POST",
      ...(options || {}),
    }
  );
}

/** 查询 Bridge 持久连接状态 GET /api/platform/mqtt/broker/status */
export async function getMqttBridgeStatus(options?: RequestOptions) {
  return request<{
    success?: boolean;
    data?: {
      key?: string;
      connected?: boolean;
      brokerType?: string;
      brokerId?: string;
      tenantCode?: string;
    }[];
  }>("/api/platform/mqtt/broker/status", {
    method: "GET",
    ...(options || {}),
  });
}

/** 测试平台 Broker 管理连接 POST /api/platform/mqtt/broker/test */
export async function testMqttPlatformBroker(options?: RequestOptions) {
  return request<BackendAPI.EmptyResponseDto>(
    "/api/platform/mqtt/broker/test",
    {
      method: "POST",
      ...(options || {}),
    }
  );
}

/** 查看所有租户自建 MQTT Broker GET /api/platform/mqtt/brokers */
export async function listPlatformMqttBrokers(options?: RequestOptions) {
  return request<BackendAPI.TenantMqttBrokerListResponseDto>(
    "/api/platform/mqtt/brokers",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 平台删除租户自建 Broker DELETE /api/platform/mqtt/brokers/${param0} */
export async function deletePlatformMqttBroker(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deletePlatformMqttBrokerParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/mqtt/brokers/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 平台修改租户自建 Broker PATCH /api/platform/mqtt/brokers/${param0} */
export async function updatePlatformMqttBroker(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updatePlatformMqttBrokerParams,
  body: BackendAPI.UpdateTenantMqttBrokerDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/mqtt/brokers/${param0}`,
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

/** 平台设置租户默认 Broker POST /api/platform/mqtt/brokers/${param0}/default */
export async function setDefaultPlatformMqttBroker(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.setDefaultPlatformMqttBrokerParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/mqtt/brokers/${param0}/default`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 测试租户自建 Broker POST /api/platform/mqtt/brokers/${param0}/test */
export async function testPlatformMqttBroker(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.testPlatformMqttBrokerParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/mqtt/brokers/${param0}/test`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 分页查询 MQTT 消息 GET /api/platform/mqtt/messages */
export async function listMqttMessages(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listMqttMessagesParams,
  options?: RequestOptions
) {
  return request<BackendAPI.MqttMessageListResponseDto>(
    "/api/platform/mqtt/messages",
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

/** 按租户或全部清理 MQTT 消息 DELETE /api/platform/mqtt/messages */
export async function cleanupMqttMessages(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.cleanupMqttMessagesParams,
  options?: RequestOptions
) {
  return request<BackendAPI.MqttCleanupResponseDto>(
    "/api/platform/mqtt/messages",
    {
      method: "DELETE",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 立即重试待发送的 MQTT 消息 POST /api/platform/mqtt/outbox/process */
export async function processMqttOutbox(options?: RequestOptions) {
  return request<BackendAPI.EmptyResponseDto>(
    "/api/platform/mqtt/outbox/process",
    {
      method: "POST",
      ...(options || {}),
    }
  );
}

/** 查询租户平台 Broker 凭据开通状态 GET /api/platform/mqtt/tenants */
export async function listMqttTenantCredentials(options?: RequestOptions) {
  return request<BackendAPI.PlatformTenantMqttListResponseDto>(
    "/api/platform/mqtt/tenants",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 校验平台管理员登录密码后查看租户凭据 POST /api/platform/mqtt/tenants/${param0}/credentials/reveal */
export async function revealMqttTenantCredential(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.revealMqttTenantCredentialParams,
  body: BackendAPI.VerifyMqttCredentialDto,
  options?: RequestOptions
) {
  const { tenantId: param0, ...queryParams } = params;
  return request<BackendAPI.RevealedMqttCredentialResponseDto>(
    `/api/platform/mqtt/tenants/${param0}/credentials/reveal`,
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

/** 校验平台管理员登录密码后轮换租户凭据 POST /api/platform/mqtt/tenants/${param0}/credentials/rotate */
export async function rotateMqttTenantCredential(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.rotateMqttTenantCredentialParams,
  body: BackendAPI.VerifyMqttCredentialDto,
  options?: RequestOptions
) {
  const { tenantId: param0, ...queryParams } = params;
  return request<BackendAPI.RevealedMqttCredentialResponseDto>(
    `/api/platform/mqtt/tenants/${param0}/credentials/rotate`,
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

/** 生成或重试租户凭据 POST /api/platform/mqtt/tenants/${param0}/provision */
export async function provisionMqttTenantCredential(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.provisionMqttTenantCredentialParams,
  options?: RequestOptions
) {
  const { tenantId: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/mqtt/tenants/${param0}/provision`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 查询本租户自建 MQTT Broker GET /api/tenant/mqtt/brokers */
export async function listTenantMqttBrokers(options?: RequestOptions) {
  return request<BackendAPI.TenantMqttBrokerListResponseDto>(
    "/api/tenant/mqtt/brokers",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 新增本租户 MQTT Broker POST /api/tenant/mqtt/brokers */
export async function createTenantMqttBroker(
  body: BackendAPI.CreateTenantMqttBrokerDto,
  options?: RequestOptions
) {
  return request<BackendAPI.EmptyResponseDto>("/api/tenant/mqtt/brokers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除本租户 MQTT Broker DELETE /api/tenant/mqtt/brokers/${param0} */
export async function deleteTenantMqttBroker(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteTenantMqttBrokerParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/mqtt/brokers/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 修改本租户 MQTT Broker PATCH /api/tenant/mqtt/brokers/${param0} */
export async function updateTenantMqttBroker(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateTenantMqttBrokerParams,
  body: BackendAPI.UpdateTenantMqttBrokerDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/mqtt/brokers/${param0}`,
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

/** 设置本租户默认 MQTT Broker POST /api/tenant/mqtt/brokers/${param0}/default */
export async function setDefaultTenantMqttBroker(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.setDefaultTenantMqttBrokerParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/mqtt/brokers/${param0}/default`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 测试本租户 MQTT Broker POST /api/tenant/mqtt/brokers/${param0}/test */
export async function testTenantMqttBroker(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.testTenantMqttBrokerParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/tenant/mqtt/brokers/${param0}/test`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 查询本租户平台 Broker 凭据信息 GET /api/tenant/mqtt/credentials */
export async function getTenantMqttCredential(options?: RequestOptions) {
  return request<BackendAPI.MqttCredentialMetadataResponseDto>(
    "/api/tenant/mqtt/credentials",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 校验登录密码后查看本租户凭据 POST /api/tenant/mqtt/credentials/reveal */
export async function revealTenantMqttCredential(
  body: BackendAPI.VerifyMqttCredentialDto,
  options?: RequestOptions
) {
  return request<BackendAPI.RevealedMqttCredentialResponseDto>(
    "/api/tenant/mqtt/credentials/reveal",
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

/** 校验登录密码后轮换本租户凭据 POST /api/tenant/mqtt/credentials/rotate */
export async function rotateTenantMqttCredential(
  body: BackendAPI.VerifyMqttCredentialDto,
  options?: RequestOptions
) {
  return request<BackendAPI.RevealedMqttCredentialResponseDto>(
    "/api/tenant/mqtt/credentials/rotate",
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
