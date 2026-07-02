/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*',
      },
      {
        source: '/auth/:path*',
        destination: 'http://127.0.0.1:5000/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
