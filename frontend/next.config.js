const nextConfig = {
  // Compresión para mejor performance
  compress: true,
  
  // Remover header X-Powered-By por seguridad
  poweredByHeader: false,
  
  // React Strict Mode para detectar problemas
  reactStrictMode: true,
  
  // Configuración de imágenes (si se usan imágenes externas)
  images: {
    remotePatterns: [],
  },
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
};

module.exports = nextConfig;
