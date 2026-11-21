import * as mqtt from '@/services/backend/mqtt';

export type PlatformMqttBroker = BackendAPI.MqttPlatformBrokerDto;
export type TenantMqttCredentialRow = BackendAPI.PlatformTenantMqttRowDto;
export type TenantBroker = BackendAPI.TenantMqttBrokerDto;

export const getPlatformBroker = () =>
  mqtt.getMqttPlatformBroker({ skipErrorHandler: true });
export const updatePlatformBroker = (
  body: BackendAPI.UpdateMqttPlatformBrokerDto,
) => mqtt.updateMqttPlatformBroker(body, { skipErrorHandler: true });
export const testPlatformBroker = () =>
  mqtt.testMqttPlatformBroker({ skipErrorHandler: true });
export const provisionBridge = () =>
  mqtt.provisionMqttBridge({ skipErrorHandler: true });
export const reconnectBridge = () =>
  mqtt.reconnectMqttBridge({ skipErrorHandler: true });

export const listTenantCredentials = () =>
  mqtt.listMqttTenantCredentials({ skipErrorHandler: true });
export const provisionTenant = (tenantId: string) =>
  mqtt.provisionMqttTenantCredential({ tenantId }, { skipErrorHandler: true });
export const revealTenant = (
  tenantId: string,
  body: BackendAPI.VerifyMqttCredentialDto,
) =>
  mqtt.revealMqttTenantCredential({ tenantId }, body, {
    skipErrorHandler: true,
  });
export const rotateTenant = (
  tenantId: string,
  body: BackendAPI.VerifyMqttCredentialDto,
) =>
  mqtt.rotateMqttTenantCredential({ tenantId }, body, {
    skipErrorHandler: true,
  });

export const listTenantBrokers = async () => {
  const result = await mqtt.listPlatformMqttBrokers({
    skipErrorHandler: true,
  });
  return { success: true, data: result.data, total: result.data.length };
};
export const updateTenantBroker = (
  id: string,
  body: BackendAPI.UpdateTenantMqttBrokerDto,
) => mqtt.updatePlatformMqttBroker({ id }, body, { skipErrorHandler: true });
export const deleteTenantBroker = (id: string) =>
  mqtt.deletePlatformMqttBroker({ id }, { skipErrorHandler: true });
export const setDefaultTenantBroker = (id: string) =>
  mqtt.setDefaultPlatformMqttBroker({ id }, { skipErrorHandler: true });
export const testTenantBroker = (id: string) =>
  mqtt.testPlatformMqttBroker({ id }, { skipErrorHandler: true });
