/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['sonner'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      bodySizeLimit: '26mb', // 25MB evidence file + overhead (D-14, Pitfall 2)
    },
  },
}

export default nextConfig
