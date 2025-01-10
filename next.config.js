/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dcilkegklqmrjynrbjul.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    domains: ['dcilkegklqmrjynrbjul.supabase.co']
  },
}

module.exports = nextConfig 