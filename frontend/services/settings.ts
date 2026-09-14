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

async function loadSiteSettings() {
  return apiFetch<SiteSettings>('/settings');
}

const getCachedSiteSettings = unstable_cache(loadSiteSettings, ['site-settings'], {
  revalidate: 60,
});

export function getSiteSettings() {
  return typeof window === 'undefined' ? getCachedSiteSettings() : loadSiteSettings();
}
