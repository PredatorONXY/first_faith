/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // CLIENT/DEV TO CONFIRM: replace with the actual Supabase project ref
        // once Supabase Storage is provisioned, e.g. "abcxyz.supabase.co"
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
