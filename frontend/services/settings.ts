import { apiFetch } from '../lib/api';

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

export function getSiteSettings() {
  return apiFetch<SiteSettings>('/settings');
}
