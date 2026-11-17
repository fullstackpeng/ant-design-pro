import { setLocale } from '@umijs/max';
import defaultSettings from '../../config/defaultSettings';
import { publicSiteSettings } from './backend/settings';

export const defaultSiteSettings: BackendAPI.PublicSiteSettingsDto = {
  title: defaultSettings.title || 'Ant Design Pro',
  logo: defaultSettings.logo ?? '',
  colorPrimary: defaultSettings.colorPrimary ?? '#1677ff',
  loginBackground:
    'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr',
  footerText: 'Ant Design Pro',
  defaultLocale: 'zh-CN',
};

let siteDefaultLocale: string = defaultSiteSettings.defaultLocale;

// Umi calls this runtime hook; a saved user choice takes priority over the site default.
export function getSiteLocale() {
  try {
    return window.localStorage.getItem('umi_locale') || siteDefaultLocale;
  } catch {
    return siteDefaultLocale;
  }
}

export function applySiteLocale(locale: string) {
  try {
    if (window.localStorage.getItem('umi_locale')) return;
    // setLocale updates Umi's providers but also persists its argument as a user choice.
    // Remove only this automatic write so future site-default changes remain effective.
    setLocale(locale, false);
    siteDefaultLocale = locale;
    if (window.localStorage.getItem('umi_locale') === locale)
      window.localStorage.removeItem('umi_locale');
  } catch {
    siteDefaultLocale = locale;
  }
}

export async function loadSiteSettings(): Promise<BackendAPI.PublicSiteSettingsDto> {
  try {
    return (await publicSiteSettings({ skipErrorHandler: true, timeout: 5000 }))
      .data;
  } catch {
    return { ...defaultSiteSettings };
  }
}

export function siteLayoutSettings(settings: BackendAPI.PublicSiteSettingsDto) {
  return {
    title: settings.title,
    logo: settings.logo || false,
    colorPrimary: settings.colorPrimary,
  };
}
