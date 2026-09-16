import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

// Simple key/value store for everything the client should be able to edit
// without a code change: contact info, social links, shipping/return policy
// text, etc. Seed keys are created empty — the client fills them in via
// /admin/settings once they have the real values.
const SEED_KEYS = [
  'store_name',
  'contact_email',
  'contact_phone',
  'contact_address',
  'instagram_url',
  'facebook_url',
  'shipping_policy',
  'return_policy',
  'gst_number',
];

const DEFAULT_SETTINGS: Record<string, string> = {
  store_name: 'First Faith',
  contact_email: '',
  contact_phone: '',
  contact_address: '',
  instagram_url: 'https://www.instagram.com/_firstfaithofficial?stkn=MTQ5ZTFlYXczdzE0ZA==',
  facebook_url: '',
  shipping_policy: '',
  return_policy: '',
  gst_number: '',
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    try {
      const rows = await this.prisma.siteSetting.findMany();
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
      for (const key of SEED_KEYS) {
        if (!map[key]) map[key] = DEFAULT_SETTINGS[key] ?? '';
      }
      return map;
    } catch {
      // Retry once if there was a transient connection blip
      try {
        const rows = await this.prisma.siteSetting.findMany();
        const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        for (const key of SEED_KEYS) {
          if (!map[key]) map[key] = DEFAULT_SETTINGS[key] ?? '';
        }
        return map;
      } catch {
        // Return stable default keys so the frontend never crashes
        return { ...DEFAULT_SETTINGS };
      }
    }
  }

  async update(values: Record<string, string>) {
    const entries = Object.entries(values);
    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.siteSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
    return this.getAll();
  }
}
