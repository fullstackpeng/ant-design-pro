import * as settings from '@/services/backend/settings';

export type SiteSettings = BackendAPI.SiteSettingsDto;
export type SettingsAudit = BackendAPI.SiteSettingsAuditDto;
export const getSiteSettings = () =>
  settings.getSiteSettings({ skipErrorHandler: true });
export const updateSiteSettings = (body: BackendAPI.UpdateSiteSettingsDto) =>
  settings.updateSiteSettings(body, { skipErrorHandler: true });
export const listSiteSettingsHistory = (
  params: BackendAPI.listSiteSettingsHistoryParams,
) => settings.listSiteSettingsHistory(params, { skipErrorHandler: true });
