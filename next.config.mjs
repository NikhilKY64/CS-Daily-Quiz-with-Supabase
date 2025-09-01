const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  // Configure webpack hot module replacement
  webpack: (config, { isServer, dev }) => {
    if (!isServer && dev) {
      // Fix hot module replacement by ensuring consistent URL
      config.output.publicPath = `http://localhost:3001/_next/`
    }
    return config
  },
  // Configure dev server
  async rewrites() {
    return [
      {
        source: '/_next/:path*',
        destination: `http://localhost:3001/_next/:path*`,
      },
    ];
  },
}

export default nextConfig
