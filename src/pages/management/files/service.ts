import * as files from '@/services/backend/files';

export type FileItem = BackendAPI.FileDto;

export const listFiles = (params: BackendAPI.listFilesParams = {}) =>
  files.listFiles(params, { skipErrorHandler: true });
export const uploadFile = (file: File) =>
  files.uploadFile({}, file, { skipErrorHandler: true });
export const deleteFile = (id: string) =>
  files.deleteFile({ id }, { skipErrorHandler: true });
export const downloadFile = (id: string) =>
  files.downloadFile({ id }, { skipErrorHandler: true });
export const getFileUsage = () =>
  files.getFileUsage({ skipErrorHandler: true });
