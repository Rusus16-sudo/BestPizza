/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Avant les vitrines, le site n'était que Best Pizza : ses anciennes adresses
  // (liens déjà partagés, apps installées) mènent à sa vitrine
  async redirects() {
    const pages = ['menu', 'categories', 'cart', 'checkout', 'favorites', 'offers', 'help']
    return [
      ...pages.map((page) => ({ source: `/${page}`, destination: `/best-pizza/${page}`, permanent: false })),
      { source: '/product/:id', destination: '/best-pizza/product/:id', permanent: false },
    ];
  },
  // Le service worker des notifications : toujours la dernière version
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
