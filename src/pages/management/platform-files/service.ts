import * as files from '@/services/backend/files';

export type PlatformFile = BackendAPI.FileDto;

export const listPlatformFiles = (
  params: BackendAPI.listPlatformFilesParams = {},
) => files.listPlatformFiles(params, { skipErrorHandler: true });
export const uploadPlatformFile = (file: File) =>
  files.uploadPlatformFile({}, file, { skipErrorHandler: true });
export const deletePlatformFile = (id: string) =>
  files.deletePlatformFile({ id }, { skipErrorHandler: true });
export const downloadPlatformFile = (id: string) =>
  files.downloadPlatformFile({ id }, { skipErrorHandler: true });
