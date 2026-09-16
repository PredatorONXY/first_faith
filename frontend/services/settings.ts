import { apiFetch } from '../lib/api';
import { unstable_cache } from 'next/cache';

export interface SiteSettings {
  store_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  instagram_url?: string;
  facebook_url?: string;
  shipping_policy?: string;
  return_policy?: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  store_name: 'First Faith',
  instagram_url: 'https://www.instagram.com/_firstfaithofficial?stkn=MTQ5ZTFlYXczdzE0ZA==',
};

async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    const data = await apiFetch<SiteSettings>('/settings');
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...data,
      instagram_url: data?.instagram_url || DEFAULT_SITE_SETTINGS.instagram_url,
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

const getCachedSiteSettings = unstable_cache(loadSiteSettings, ['site-settings'], {
  revalidate: 60,
});

export function getSiteSettings() {
  return typeof window === 'undefined' ? getCachedSiteSettings() : loadSiteSettings();
}
