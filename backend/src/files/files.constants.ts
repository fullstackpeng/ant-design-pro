export const FILES_FEATURE = 'files';

/** Hard cap enforced by the multipart parser before business rules run. */
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

export const DOWNLOAD_URL_TTL_SECONDS = 300;

/** Site branding images should stay small; they are served on every login page. */
export const MAX_SITE_ASSET_BYTES = 10 * 1024 * 1024;

const MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export const ALLOWED_MIME_TYPES = new Set(MIME_TYPES);
