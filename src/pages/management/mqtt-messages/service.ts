import * as mqtt from '@/services/backend/mqtt';

export type MqttMessage = BackendAPI.MqttMessageDto;

export const listMessages = (params: BackendAPI.listMqttMessagesParams) =>
  mqtt.listMqttMessages(params, { skipErrorHandler: true });
export const cleanupMessages = (params: BackendAPI.cleanupMqttMessagesParams) =>
  mqtt.cleanupMqttMessages(params, { skipErrorHandler: true });
