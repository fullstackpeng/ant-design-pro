import * as storage from '@/services/backend/storage';

export type StorageProvider = BackendAPI.StorageProviderDto;
export type StorageProtocol = BackendAPI.StorageProtocolDto;

export const listStorageProviders = async () => {
  const result = await storage.listStorageProviders({ skipErrorHandler: true });
  return { success: true, data: result.data, total: result.data.length };
};
export const listStorageProtocols = () =>
  storage.listStorageProtocols({ skipErrorHandler: true });
export const createStorageProvider = (
  body: BackendAPI.CreateStorageProviderDto,
) => storage.createStorageProvider(body, { skipErrorHandler: true });
export const updateStorageProvider = (
  id: string,
  body: BackendAPI.UpdateStorageProviderDto,
) => storage.updateStorageProvider({ id }, body, { skipErrorHandler: true });
export const setDefaultStorageProvider = (id: string) =>
  storage.setDefaultStorageProvider({ id }, { skipErrorHandler: true });
export const testStorageProvider = (id: string) =>
  storage.testStorageProvider({ id }, { skipErrorHandler: true });
