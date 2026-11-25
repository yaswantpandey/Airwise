import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Public_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-public-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFB' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1117' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'AirWise — Urban Air Quality Assistant',
  description:
    'GenAI-powered urban air quality assistant turning live AQI and winter smog forecasts into personalized, explainable family guidance, indoor air hacks, impact tracking, and community clean-air action.',
  openGraph: {
    title: 'AirWise — Urban Air Quality Assistant',
    description:
      'Turn live AQI and winter smog forecasts into personalized, explainable family guidance and community clean-air action.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AirWise — Urban Air Quality Assistant',
    description:
      'Turn live AQI and winter smog forecasts into personalized, explainable family guidance and community clean-air action.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AirWise',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${publicSans.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-[#F8FAFB] text-slate-900 dark:bg-[#0B1117] dark:text-slate-100 dark:tracking-[0.005em] antialiased selection:bg-teal-200 selection:text-teal-950 dark:selection:bg-teal-800 dark:selection:text-teal-50"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
