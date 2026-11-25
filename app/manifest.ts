import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'AirWise — Urban Air Quality Assistant',
    short_name: 'AirWise',
    description:
      'GenAI-powered urban air quality assistant delivering personalized family protection plans, live AQI forecasts, and community clean-air action.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F8FAFB',
    theme_color: '#0F766E',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
