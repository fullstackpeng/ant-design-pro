import * as mqtt from '@/services/backend/mqtt';

export type TenantMqttBroker = BackendAPI.TenantMqttBrokerDto;
export type TenantCredentialMetadata = BackendAPI.MqttCredentialMetadataDto;

export const getCredentialMetadata = () =>
  mqtt.getTenantMqttCredential({ skipErrorHandler: true });
export const revealCredential = (body: BackendAPI.VerifyMqttCredentialDto) =>
  mqtt.revealTenantMqttCredential(body, { skipErrorHandler: true });
export const rotateCredential = (body: BackendAPI.VerifyMqttCredentialDto) =>
  mqtt.rotateTenantMqttCredential(body, { skipErrorHandler: true });

export const listBrokers = () =>
  mqtt.listTenantMqttBrokers({ skipErrorHandler: true });
export const createBroker = (body: BackendAPI.CreateTenantMqttBrokerDto) =>
  mqtt.createTenantMqttBroker(body, { skipErrorHandler: true });
export const updateBroker = (
  id: string,
  body: BackendAPI.UpdateTenantMqttBrokerDto,
) => mqtt.updateTenantMqttBroker({ id }, body, { skipErrorHandler: true });
export const deleteBroker = (id: string) =>
  mqtt.deleteTenantMqttBroker({ id }, { skipErrorHandler: true });
export const setDefaultBroker = (id: string) =>
  mqtt.setDefaultTenantMqttBroker({ id }, { skipErrorHandler: true });
export const testBroker = (id: string) =>
  mqtt.testTenantMqttBroker({ id }, { skipErrorHandler: true });
