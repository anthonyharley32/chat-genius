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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/7.x/**',
      },
      {
        protocol: 'https',
        hostname: 'media-cldnry.s-nbcnews.com',
        pathname: '/image/upload/**',
      },
      {
        protocol: 'https',
        hostname: 'fortune.com',
        pathname: '/img-assets/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 's.yimg.com',
        pathname: '/ny/api/res/**',
      }
    ],
    domains: [
      'dcilkegklqmrjynrbjul.supabase.co',
      'api.dicebear.com', 
      'media-cldnry.s-nbcnews.com',
      'fortune.com',
      's.yimg.com'
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

module.exports = nextConfig 