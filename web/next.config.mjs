const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/ipfs/**'
      }
    ]
  },
  // Rewrite API requests to backend to avoid mixed content issues when using HTTPS
  // This allows the frontend to make same-origin HTTPS requests that get proxied to the HTTP backend
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    // Parse backend URL and create rewrite rule
    if (backendUrl.startsWith('http://') || backendUrl.startsWith('https://')) {
      try {
        const url = new URL(backendUrl);
        // Rewrite /api/* requests to backend
        // This allows HTTPS frontend to make requests that get proxied to HTTP backend
        return [
          {
            source: '/api/:path*',
            destination: `${url.origin}/api/:path*`
          }
        ];
      } catch (e) {
        // If URL parsing fails, don't add rewrite
        console.warn('Failed to parse NEXT_PUBLIC_API_URL for rewrite:', e);
        return [];
      }
    }
    
    return [];
  }
};

export default nextConfig;

