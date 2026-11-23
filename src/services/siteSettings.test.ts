import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query, changeLocale } = vi.hoisted(() => ({
  query: vi.fn(),
  changeLocale: vi.fn(),
}));
vi.mock('./backend/settings', () => ({ publicSiteSettings: query }));
vi.mock('@umijs/max', () => ({ setLocale: changeLocale }));

let preferences: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  preferences = new Map();
  const localStorage = {
    getItem: (key: string) => preferences.get(key) ?? null,
    setItem: (key: string, value: string) => preferences.set(key, value),
    removeItem: (key: string) => preferences.delete(key),
  };
  if (typeof window === 'undefined') {
    vi.stubGlobal('window', { localStorage });
  } else {
    // Browser mode cannot redefine `window`; stub only the storage it exposes.
    vi.stubGlobal('localStorage', localStorage);
  }
  changeLocale.mockImplementation((locale: string) =>
    preferences.set('umi_locale', locale),
  );
});

describe('runtime site settings', () => {
  it('loads configured branding through the public client', async () => {
    const { loadSiteSettings, defaultSiteSettings } = await import(
      './siteSettings'
    );
    const configured = {
      ...defaultSiteSettings,
      title: 'Customer portal',
      colorPrimary: '#123456',
    };
    query.mockResolvedValue({ data: configured });
    expect(await loadSiteSettings()).toEqual(configured);
    expect(query).toHaveBeenCalledWith({
      skipErrorHandler: true,
      timeout: 5000,
    });
  });

  it('keeps login usable with code defaults when public configuration is unavailable', async () => {
    const { loadSiteSettings, defaultSiteSettings } = await import(
      './siteSettings'
    );
    query.mockRejectedValue(new Error('Offline'));
    expect(await loadSiteSettings()).toEqual(defaultSiteSettings);
  });

  it('applies changing site languages without turning defaults into personal preferences', async () => {
    const { applySiteLocale, getSiteLocale } = await import('./siteSettings');
    applySiteLocale('en-US');
    expect(changeLocale).toHaveBeenCalledWith('en-US', false);
    expect(getSiteLocale()).toBe('en-US');
    expect(preferences.has('umi_locale')).toBe(false);
    applySiteLocale('ja-JP');
    expect(getSiteLocale()).toBe('ja-JP');
    expect(preferences.has('umi_locale')).toBe(false);
  });

  it('preserves a language explicitly chosen by the user', async () => {
    const { applySiteLocale, getSiteLocale } = await import('./siteSettings');
    preferences.set('umi_locale', 'en-US');
    applySiteLocale('zh-CN');
    expect(changeLocale).not.toHaveBeenCalled();
    expect(getSiteLocale()).toBe('en-US');
  });

  it('limits layout defaults to branding and hides a blank logo', async () => {
    const { siteLayoutSettings, defaultSiteSettings } = await import(
      './siteSettings'
    );
    expect(
      siteLayoutSettings({ ...defaultSiteSettings, title: 'Portal', logo: '' }),
    ).toEqual({
      title: 'Portal',
      logo: false,
      colorPrimary: defaultSiteSettings.colorPrimary,
    });
  });
});
